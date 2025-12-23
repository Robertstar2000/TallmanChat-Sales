#!/usr/bin/env node
/**
 * Tallman Chat Frontend UI Server
 * Serves React UI and proxies API calls to Backend Service
 * Runs on port 3220 for external UI access
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const { createServer } = require('http');
const { networkInterfaces } = require('os');

const app = express();

// Find the external IP address (for UI access)
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
const PORT = process.env.UI_PORT || 3220; // Default to 3220 for UI server

// --- Service Host Configuration ---
const BACKEND_SERVICE_HOST = process.env.BACKEND_SERVICE_HOST || serverIP; // Defaults to same machine if not set
const BACKEND_SERVICE_PORT = process.env.BACKEND_SERVICE_PORT || 3210;

console.log(`� Frontend UI Server - Binding to: ${serverIP}:${PORT}`);
console.log(`🔵 Backend API Server expected at: ${BACKEND_SERVICE_HOST}:${BACKEND_SERVICE_PORT}`);

if (BACKEND_SERVICE_HOST === serverIP) {
    console.warn(`⚠️ WARNING: Backend service host is not set, defaulting to local machine (${serverIP}). Set BACKEND_SERVICE_HOST if it's on a different server.`);
}

// Allow CORS for UI
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from dist directory (built React app)
const distPath = path.join(__dirname, '..', 'dist');
console.log(`📁 Serving UI files from: ${distPath}`);
app.use(express.static(distPath));

// API Proxy - Forward all API requests to Backend Service
app.use('/api', async (req, res) => {
    try {
        const backendUrl = `http://127.0.0.1:${BACKEND_SERVICE_PORT}/api${req.path}`;

        console.log(`🔄 Proxying ${req.method} ${req.path} → ${backendUrl}`);

        // Create request options
        const requestOptions = {
            method: req.method,
            headers: {
                'Content-Type': req.get('content-type') || 'application/json',
                'Authorization': req.get('authorization') || '',
                'Cookie': req.get('cookie') || '',
                'User-Agent': req.get('user-agent') || '',
            },
        };

        // Add body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase()) && req.body) {
            requestOptions.body = JSON.stringify(req.body);
        }

        // Add query parameters
        if (Object.keys(req.query).length > 0) {
            const url = new URL(backendUrl);
            Object.keys(req.query).forEach(key => {
                url.searchParams.append(key, req.query[key]);
            });
            requestOptions.method = 'GET'; // Override to GET for queries
        }

        const backendResponse = await fetch(backendUrl, requestOptions);

        // Copy response headers (except problematic ones)
        const excludeHeaders = ['transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers', 'upgrade'];
        backendResponse.headers.forEach((value, key) => {
            if (!excludeHeaders.includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

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
        console.error('❌ API Proxy Error:', error);
        res.status(500).json({
            error: 'Backend API Service Unavailable',
            details: 'The backend API service may be down or unreachable',
            timestamp: new Date().toISOString()
        });
    }
});

// Handle preflight OPTIONS requests
app.options('/api/*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.status(200).end();
});

// UI-specific health check
app.get('/ui-health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Tallman Chat UI',
        port: PORT,
        serverIP: serverIP, // The IP of this UI server
        backendAPI: `http://${BACKEND_SERVICE_HOST}:${BACKEND_SERVICE_PORT}`, // The configured backend API
        timestamp: new Date().toISOString()
    });
});

// For SPA routing - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/ui-health')) {
        return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling
app.use((error, req, res, next) => {
    console.error('❌ UI Server error:', error);
    res.status(500).json({
        error: 'UI Server Error',
        details: error.message,
        service: 'frontend-ui'
    });
});

// Create HTTP server
const server = createServer(app);

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`📴 UI Server - Received ${signal}. Shutting down...`);

    server.close((err) => {
        if (err) {
            console.error('❌ Error during UI server shutdown:', err);
            process.exit(1);
        }

        console.log('✅ UI Server closed successfully');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('⚠️ Could not close UI server gracefully, forcing shutdown');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Bind to all interfaces (0.0.0.0) for external UI access
server.listen(PORT, '0.0.0.0', (err) => {
    if (err) {
        console.error(`❌ UI Server failed to bind to 0.0.0.0:${PORT}:`, err.message);
        process.exit(1);
    }

    console.log('🟡 ========================================');
    console.log('� TALLMAN CHAT UI SERVER IS RUNNING!');
    console.log('🟡 ========================================');
    console.log();
    console.log(`🔗 Bound to: 0.0.0.0:${PORT}`);
    console.log(`� UI Access: http://${serverIP}:${PORT}`);
    console.log(`🏠 Local Access: http://localhost:${PORT}`); // Access on the machine itself
    console.log(`📡 Backend API: http://${BACKEND_SERVICE_HOST}:${BACKEND_SERVICE_PORT}/api`);
    console.log();
    console.log('📊 Endpoints:');
    console.log(`   GET  /ui-health         - UI Server health check`);
    console.log(`   ALL  /api/*             - Proxied to backend API`);
    console.log();
    console.log('🔄 API requests are proxied to backend service');
    console.log();
    console.log('🛑 Press Ctrl+C to stop');
    console.log('🟡 ========================================');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 UI Server uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💫 UI Server unhandled rejection:', reason);
    process.exit(1);
});

module.exports = app;
