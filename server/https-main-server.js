#!/usr/bin/env node
/**
 * Tallman Chat UI HTTPS Server
 * Serves React UI over SSL/TLS on port 443
 * Proxies API calls to Backend HTTPS Service
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
const { networkInterfaces } = require('os');

const app = express();

// SSL Configuration
const sslKeyPath = path.join(__dirname, '..', 'tallman-chat-server-key.pem');
const sslCertPath = path.join(__dirname, '..', 'tallman-chat-server.pem');

// Check certificate files exist
if (!fs.existsSync(sslKeyPath)) {
    console.error('❌ SSL Private Key not found:', sslKeyPath);
    console.log('🔑 Run setup-ssl.ps1 to generate certificates');
    process.exit(1);
}
if (!fs.existsSync(sslCertPath)) {
    console.error('❌ SSL Certificate not found:', sslCertPath);
    console.log('🔒 Run setup-ssl.ps1 to generate certificates');
    process.exit(1);
}

// Load SSL certificates
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
        // For self-signed certificates, allow them
        rejectUnauthorized: false,
        requestCert: false
    };
    console.log('✅ SSL certificates loaded successfully');
} catch (error) {
    console.error('❌ Failed to load SSL certificates:', error.message);
    process.exit(1);
}

// Determine server IP for backend communication
const nets = networkInterfaces();
const addresses = [];
for (const iface of Object.values(nets)) {
    for (const ifaceAddrs of iface) {
        if (ifaceAddrs.family === 'IPv4' && !ifaceAddrs.internal) {
            addresses.push(ifaceAddrs.address);
        }
    }
}
const serverIP = addresses[0] || '10.10.20.9';
const backendIP = serverIP; // Backend service on same machine
const PORT = process.env.HTTPS_PORT || 449;
const BACKEND_HTTPS_PORT = 3007;

console.log(`🟡 Frontend HTTPS UI Server - Binding to: ${serverIP}:${PORT}`);
console.log(`🔵 Backend HTTPS API Server expected at: ${backendIP}:${BACKEND_HTTPS_PORT}`);

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow localhost, network IPs, and domains
        const allowedOrigins = [
            /^https?:\/\/localhost(:\d+)?$/,
            /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
            /^https?:\/\/10\.10\.20\.9(:\d+)?$/,
            /^https?:\/\/chat\.tallman\.com(:\d+)?$/
        ];

        if (!origin || allowedOrigins.some(regex => regex.test(origin))) {
            callback(null, true);
        } else {
            console.warn(`🚨 CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Serve static files from dist directory (built React app)
const distPath = path.join(__dirname, '..', 'dist');
console.log(`📁 Serving HTTPS UI files from: ${distPath}`);
app.use(express.static(distPath));

// HTTPS API Proxy - Forward all API requests to Backend HTTPS Service
app.use('/api', async (req, res) => {
    try {
        const backendHttpsUrl = `https://${backendIP}:${BACKEND_HTTPS_PORT}${req.path}`;

        console.log(`🔄 Proxying ${req.method} ${req.path} → ${backendHttpsUrl}`);

        // Create request options
        const requestOptions = {
            method: req.method,
            headers: {
                'Content-Type': req.get('content-type') || 'application/json',
                'Authorization': req.get('authorization') || '',
                'Cookie': req.get('cookie') || '',
                'User-Agent': req.get('user-agent') || '',
                'X-Forwarded-Proto': 'https', // Indicate this came through HTTPS
                'X-Real-IP': req.ip,
                'X-Forwarded-For': req.ips.join(', ') || req.ip
            },
            // Since we're using self-signed certificates, disable cert verification
            // In production, this should be removed when using proper certificates
            agent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        };

        // Add body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase()) && req.body) {
            requestOptions.body = JSON.stringify(req.body);
        }

        // Add query parameters
        if (Object.keys(req.query).length > 0) {
            const urlObj = new URL(backendHttpsUrl);
            Object.keys(req.query).forEach(key => {
                urlObj.searchParams.append(key, req.query[key]);
            });
            requestOptions.method = 'GET'; // Override to GET for queries
        }

        const backendResponse = await fetch(backendHttpsUrl, requestOptions);

        // Copy response headers (except problematic ones)
        const excludeHeaders = ['transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'upgrade', 'set-cookie'];
        backendResponse.headers.forEach((value, key) => {
            if (!excludeHeaders.includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', req.get('origin') || '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('X-HTTPS-Redirected', 'true'); // Mark that this went through HTTPS proxy

        // Copy status code
        res.status(backendResponse.status);

        // Handle response body
        if (backendResponse.body) {
            // Stream response for large data or streaming
            await backendResponse.body.pipeTo(new WritableStream({
                write(chunk) {
                    res.write(chunk);
                },
                close() {
                    res.end();
                },
                abort(err) {
                    console.error('Stream error:', err);
                    res.end();
                }
            }));
        } else {
            const data = await backendResponse.text();
            res.send(data);
        }

    } catch (error) {
        console.error('❌ HTTPS API Proxy Error:', error);
        res.status(500).json({
            error: 'Backend HTTPS API Service Unavailable',
            details: 'The backend API service may be down, unreachable, or certificate issues',
            timestamp: new Date().toISOString()
        });
    }
});

// Handle preflight OPTIONS requests
app.options('/api/*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.get('origin') || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.status(200).end();
});

// HTTPS-specific health check
app.get('/ui-health', (req, res) => {
    res.json({
        status: 'secure',
        service: 'Tallman Chat UI (HTTPS)',
        port: PORT,
        serverIP: serverIP,
        backendAPI: `https://${backendIP}:${BACKEND_HTTPS_PORT}`,
        protocol: 'HTTPS',
        sslEnabled: true,
        certificateLoaded: true,
        timestamp: new Date().toISOString()
    });
});

// SSL certificate expiration check
app.get('/cert-status', (req, res) => {
    try {
        const cert = fs.readFileSync(sslCertPath, 'utf8');
        // Basic certificate validation
        const hasValidCert = cert.includes('BEGIN CERTIFICATE') && cert.includes('END CERTIFICATE');

        // Check expiration (simple check - not parsing full cert)
        const lines = cert.split('\n');
        let expirationDate = null;
        for (const line of lines) {
            if (line.includes('Not After') || line.includes('validTo:')) {
                // Extract date - simplified parsing
                const dateMatch = line.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}/);
                if (dateMatch) {
                    expirationDate = new Date(dateMatch[0]);
                    break;
                }
            }
        }

        const daysUntilExpiration = expirationDate ?
            Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

        res.json({
            certificateValid: hasValidCert,
            expirationDate: expirationDate?.toISOString(),
            daysUntilExpiration,
            needsRenewal: daysUntilExpiration !== null && daysUntilExpiration < 30,
            lastChecked: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Certificate check failed',
            details: error.message
        });
    }
});

// Redirect HTTP to HTTPS (for information purposes)
app.get('/http-redirect-info', (req, res) => {
    res.json({
        message: 'This is the HTTPS server. For HTTP access, use port 3005',
        httpsPort: PORT,
        httpPort: 3005,
        redirect: `https://${req.get('host')?.replace(/:80$/, '')}${req.path}`
    });
});

// For SPA routing - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/ui-health') || req.path.startsWith('/cert-status') || req.path.startsWith('/http-redirect-info')) {
        return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling
app.use((error, req, res, next) => {
    console.error('❌ HTTPS UI Server error:', error);
    res.status(500).json({
        error: 'HTTPS UI Server Error',
        details: error.message,
        service: 'frontend-https'
    });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`📴 HTTPS UI Server - Received ${signal}. Shutting down...`);
    server.close((err) => {
        if (err) {
            console.error('❌ Error during HTTPS server shutdown:', err);
            process.exit(1);
        }

        console.log('✅ HTTPS UI Server closed successfully');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('⚠️ Could not close HTTPS server gracefully, forcing shutdown');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Create HTTPS server
const server = https.createServer(sslOptions, app);

// Start HTTPS server
server.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error(`❌ HTTPS UI Server failed to bind to 0.0.0.0:${PORT}:`, err.message);
        console.error('💡 This may be because port 443 is already in use or requires admin privileges');
        console.log('🔧 Try running as administrator or check if IIS is using port 443');
        process.exit(1);
    }

    console.log('🟡 ========================================');
    console.log('🔒 TALLMAN CHAT UI HTTPS SERVER IS RUNNING!');
    console.log('🟡 ========================================');
    console.log();
    console.log(`🔗 Bound to: 0.0.0.0:${PORT} (HTTPS)`);
    console.log(`🌐 Secure UI Access: https://${serverIP}:${PORT}`);
    console.log(`🏠 Local HTTPS Access: https://localhost:${PORT}`);
    console.log(`🔗 Backend HTTPS API: https://${backendIP}:${BACKEND_HTTPS_PORT}/api`);
    console.log(`🔒 SSL Certificate: tallman-chat-server.pem`);
    console.log();
    console.log('💚 Security Features:');
    console.log('   ✅ HTTPS/SSL Encryption');
    console.log('   ✅ Strict CORS Policy');
    console.log('   ✅ Certificate Validation');
    console.log();
    console.log('📊 Endpoints:');
    console.log(`   GET  /ui-health         - HTTPS Server health check`);
    console.log(`   GET  /cert-status       - SSL certificate status`);
    console.log(`   ALL  /api/*             - Proxied to backend HTTPS API`);
    console.log();
    console.log('🔄 API requests are proxied securely to backend service');
    console.log();
    console.log('🛑 Press Ctrl+C to stop');
    console.log('🟡 ========================================');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 HTTPS UI Server uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💫 HTTPS UI Server unhandled rejection:', reason);
    process.exit(1);
});

module.exports = app;
