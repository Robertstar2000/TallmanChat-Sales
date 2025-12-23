#!/usr/bin/env node
/**
 * HTTPS Server for Tallman Chat
 * Runs directly on HTTPS without IIS reverse proxy
 */

const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
const HTTPS_PORT = 443;
const HTTP_PORT = 80;

// Force redirect all HTTP to HTTPS
app.use((req, res, next) => {
    if (req.protocol === 'http') {
        res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
        return;
    }
    next();
});

// Middleware
app.use(express.json());
app.use(express.static('dist'));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Tallman Chat',
        port: HTTPS_PORT,
        protocol: 'HTTPS',
        hostname: req.hostname,
        version: '1.0.0'
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'active',
        port: HTTPS_PORT,
        protocol: 'HTTPS',
        timestamp: new Date().toISOString(),
        hostname: require('os').hostname(),
        serverType: 'Tallman Chat HTTPS Server'
    });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Generate self-signed certificate
const certDir = path.join(__dirname, '..', 'certs');
const keyPath = path.join(certDir, 'server.key');
const certPath = path.join(certDir, 'server.crt');

if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir);
}

// Create self-signed certificate if not exists
let credentials;
try {
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        console.log('🔐 Using existing SSL certificate...');
        credentials = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
    } else {
        throw new Error('Certificate files do not exist');
    }
} catch (error) {
    console.log('🔧 Generating self-signed SSL certificate...');
    const { execSync } = require('child_process');

    try {
        // Generate certificate using OpenSSL
        execSync(`openssl req -x509 -newkey rsa:4096 -nodes -keyout "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=chat.tallman.com"`, { stdio: 'pipe' });

        credentials = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        console.log('✅ Self-signed certificate created successfully');
    } catch (opensslError) {
        console.log('❌ Failed to generate certificate:', opensslError.message);
        console.log('🔄 Falling back to HTTP only...');

        // Start HTTP server
        const httpServer = http.createServer(app);
        httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
            console.log('🌟 ========================================');
            console.log(`🟢 TALLMAN CHAT HTTP SERVER RUNNING!`);
            console.log('🌟 ========================================');
            console.log();
            console.log(`🌐 Local access: http://localhost:${HTTP_PORT}`);
            console.log(`🌍 Network access: http://10.10.20.9:${HTTP_PORT}`);
            console.log();
            console.log(`💊 Health check: http://localhost:${HTTP_PORT}/api/health`);
            console.log(`📊 Server status: http://localhost:${HTTP_PORT}/api/status`);
            console.log();
            console.log(`💡 For HTTPS, install OpenSSL and restart server`);
            console.log(`🛑 Press Ctrl+C to stop the server`);
            console.log('🌟 =======================================');
        });

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        return;
    }
}

// Start HTTPS server
const httpsServer = https.createServer(credentials, app);

// Redirect HTTP to HTTPS
const httpApp = express();
httpApp.get('*', (req, res) => {
    res.redirect(301, `https://${req.hostname}${req.url}`);
});

const httpServer = http.createServer(httpApp);
httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`🔄 HTTP redirect server running on port ${HTTP_PORT}`);
});

httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`🌟 ========================================`);
    console.log(`🟢 TALLMAN CHAT HTTPS SERVER RUNNING!`);
    console.log('🌟 ========================================');
    console.log();
    console.log(`🔒 Local access: https://localhost:${HTTPS_PORT}`);
    console.log(`🌍 Network access: https://10.10.20.9:${HTTPS_PORT}`);
    console.log(`🔄 HTTP redirects to: https://chat.tallman.com`);
    console.log();
    console.log(`💊 Health check: https://localhost:${HTTPS_PORT}/api/health`);
    console.log(`📊 Server status: https://localhost:${HTTPS_PORT}/api/status`);
    console.log();
    console.log(`⚠️  Self-signed certificate - browser will show security warning`);
    console.log(`💡 For domain access: DNS A record 'chat.tallman.com' → 10.10.20.9`);
    console.log(`🛑 Press Ctrl+C to stop the server`);
    console.log('🌟 =======================================');
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`📴 Received ${signal}. Starting graceful shutdown...`);
    httpsServer.close(() => {
        httpServer.close(() => {
            process.exit(0);
        });
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;
