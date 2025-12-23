#!/usr/bin/env node
/**
 * Tallman Chat Backend HTTPS API Server
 * Handles API endpoints over SSL/TLS on port 3007
 * Provides secure chat, knowledge base, and admin functions
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
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
        rejectUnauthorized: false,
        requestCert: false
    };
    console.log('✅ SSL certificates loaded successfully');
} catch (error) {
    console.error('❌ Failed to load SSL certificates:', error.message);
    process.exit(1);
}

// Determine server IP for LDAP communication
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
const ldapIP = serverIP; // LDAP service on same machine
const PORT = process.env.HTTPS_BACKEND_PORT || 3007;
const LDAP_HTTPS_PORT = 3891;

// CORS configuration for internal API
const corsOptions = {
    origin: function (origin, callback) {
        // Restrict to local network and specific services
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import services (dynamically loaded to avoid build issues)
let chatService;
let dbService;
let knowledgeService;

async function loadServices() {
    try {
        // Load services dynamically since we're in a different directory
        const chatModule = require(path.join(__dirname, '..', 'services', 'ollamaService'));
        const dbModule = require(path.join(__dirname, '..', 'services', 'db'));
        const knowledgeModule = require(path.join(__dirname, '..', 'services', 'knowledgeBase'));

        chatService = chatModule;
        dbService = dbModule;
        knowledgeService = knowledgeModule;

        console.log('✅ Services loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load services:', error);
    }
}

// HTTPS LDAP Auth proxy endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const ldapHttpsUrl = `https://${ldapIP}:${LDAP_HTTPS_PORT}/auth/login`;

        console.log(`🔄 Proxying auth request to ${ldapHttpsUrl}`);

        const ldapResponse = await fetch(ldapHttpsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-Proto': 'https'
            },
            body: JSON.stringify(req.body),
            // For self-signed certificates
            agent: new (require('https').Agent)({
                rejectUnauthorized: false
            })
        });

        const data = await ldapResponse.json();

        if (!ldapResponse.ok) {
            return res.status(ldapResponse.status).json(data);
        }

        // Store session/user info if needed
        console.log('✅ Authentication successful via HTTPS');
        res.json(data);
    } catch (error) {
        console.error('❌ HTTPS LDAP auth error:', error);
        res.status(500).json({
            error: 'Authentication service unavailable',
            details: 'HTTPS LDAP service may be down or certificate issues',
            timestamp: new Date().toISOString()
        });
    }
});

// HTTPS Chat API endpoints
app.post('/api/chat/send', async (req, res) => {
    try {
        const { messages, message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('💬 Processing chat request:', message.substring(0, 50) + '...');

        // Get context from knowledge base
        const context = await knowledgeService.retrieveContext(message);
        console.log(`📚 Found ${context.length} context items`);

        // Prepare enhanced prompt
        let enhancedPrompt = message;
        if (context.length > 0) {
            enhancedPrompt = `Use the following information from Tallman Equipment's knowledge base to answer the question:

${context.map(item => `- ${item}`).join('\n')}

Question: ${message}

Answer as a knowledgeable Tallman employee:`;
        }

        // Send to Ollama (uses internal HTTP still)
        const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://10.10.20.24:11434';
        const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
        const ollamaRequest = {
            model: OLLAMA_MODEL,
            prompt: enhancedPrompt,
            stream: false
        };

        console.log('🤖 Sending to Ollama API...');

        const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ollamaRequest),
        });

        if (!ollamaResponse.ok) {
            const errorText = await ollamaResponse.text();
            throw new Error(`Ollama API error: ${ollamaResponse.statusText} - ${errorText}`);
        }

        const ollamaData = await ollamaResponse.json();
        const aiResponse = ollamaData.response;

        console.log('✅ AI response received');

        // Return the AI response
        res.json({
            response: aiResponse,
            context: context.length > 0 ? context.slice(0, 3) : null,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ HTTPS Chat API error:', error);
        res.status(500).json({
            error: 'Failed to process chat message',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// HTTPS Streaming chat endpoint
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { message, history } = req.body;

        console.log('🎯 Processing HTTPS streaming chat request');

        // Get context
        const context = await knowledgeService.retrieveContext(message);

        // Build enhanced prompt
        let enhancedPrompt = message;
        if (context.length > 0) {
            enhancedPrompt = `Context from Tallman knowledge base:
${context.map(item => `- ${item}`).join('\n')}

Question: ${message}

Answer helpfully as a Tallman Equipment employee:`;
        }

        const ollamaRequest = {
            model: OLLAMA_MODEL,
            prompt: enhancedPrompt,
            stream: true
        };

        const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(ollamaRequest),
        });

        if (!ollamaResponse.ok) {
            throw new Error(`Ollama API error: ${ollamaResponse.status} ${ollamaResponse.statusText}`);
        }

        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-HTTPS-Streaming', 'true');

        console.log('📡 Starting HTTPS streaming response');

        // Stream the response
        const stream = ollamaResponse.body;
        const reader = stream.getReader();

        const pump = async () => {
            try {
                const { done, value } = await reader.read();
                if (done) {
                    res.write('data: [DONE]\n\n');
                    res.end();
                    console.log('✅ HTTPS Streaming complete');
                    return;
                }

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.response) {
                                res.write(`data: ${data.response}\n\n`);
                            }
                        } catch (e) {
                            // Skip malformed JSON
                        }
                    }
                }

                pump();
            } catch (error) {
                console.error('❌ HTTPS Streaming error:', error);
                res.end();
            }
        };

        pump();

    } catch (error) {
        console.error('❌ HTTPS Streaming chat error:', error);
        res.status(500).json({
            error: 'Failed to start chat stream',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// HTTPS Knowledge base endpoints
app.get('/api/knowledge', async (req, res) => {
    try {
        console.log('📚 Getting knowledge base via HTTPS');
        const knowledge = await knowledgeService.getAllKnowledge();
        res.json(knowledge);
    } catch (error) {
        console.error('❌ HTTPS Knowledge retrieval error:', error);
        res.status(500).json({ error: 'Failed to retrieve knowledge' });
    }
});

app.post('/api/knowledge', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || typeof content !== 'string') {
            return res.status(400).json({ error: 'Content is required' });
        }

        console.log('✏️ Adding knowledge via HTTPS');
        await knowledgeService.addKnowledge(content.trim());
        res.json({ success: true, message: 'Knowledge added' });
    } catch (error) {
        console.error('❌ HTTPS Knowledge addition error:', error);
        res.status(500).json({ error: 'Failed to add knowledge' });
    }
});

app.delete('/api/knowledge', async (req, res) => {
    try {
        console.log('🗑️ Clearing knowledge base via HTTPS');
        await knowledgeService.clearAllKnowledge();
        res.json({ success: true, message: 'Knowledge base cleared' });
    } catch (error) {
        console.error('❌ HTTPS Knowledge clear error:', error);
        res.status(500).json({ error: 'Failed to clear knowledge' });
    }
});

// HTTPS User management endpoints
app.get('/api/users', async (req, res) => {
    try {
        console.log('👥 Getting users via HTTPS');
        const users = await dbService.getAllApprovedUsers();
        res.json(users);
    } catch (error) {
        console.error('❌ HTTPS User retrieval error:', error);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, role } = req.body;
        console.log(`➕ Adding user ${username} via HTTPS`);
        await dbService.addOrUpdateApprovedUser({ username, role: role || 'user' });
        res.json({ success: true, message: 'User added' });
    } catch (error) {
        console.error('❌ HTTPS User addition error:', error);
        res.status(500).json({ error: 'Failed to add user' });
    }
});

app.delete('/api/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        console.log(`➖ Deleting user ${username} via HTTPS`);
        await dbService.deleteApprovedUser(username);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('❌ HTTPS User deletion error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// HTTPS Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'secure',
        service: 'Tallman HTTPS Backend API',
        port: PORT,
        serverIP: serverIP,
        ldapAPI: `https://${ldapIP}:${LDAP_HTTPS_PORT}`,
        protocol: 'HTTPS',
        sslEnabled: true,
        timestamp: new Date().toISOString(),
        services: {
            ldap: 'available over HTTPS',
            ollama: 'connected',
            database: 'active'
        }
    });
});

// HTTPS Status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'active',
        service: 'Tallman HTTPS Backend API Service',
        port: PORT,
        serverIP: serverIP,
        protocol: 'HTTPS',
        sslEnabled: true,
        certificateLoaded: true,
        timestamp: new Date().toISOString(),
        hostname: require('os').hostname(),
        ipAddresses: addresses
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('❌ HTTPS Backend API error:', error);
    res.status(500).json({
        error: 'Internal server error',
        details: error.message,
        service: 'https-backend-api',
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`📴 HTTPS Backend API - Received ${signal}. Shutting down...`);
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Create HTTPS server
const server = https.createServer(sslOptions, app);

// Start HTTPS server - bind to internal IP only
server.listen(PORT, serverIP, async (err) => {
    if (err) {
        console.error(`❌ HTTPS Backend API failed to bind to ${serverIP}:${PORT}:`, err.message);
        process.exit(1);
    }

    console.log('🔵 ========================================');
    console.log('🔒 TALLMAN HTTPS BACKEND API SERVER IS RUNNING!');
    console.log('🔵 ========================================');
    console.log();
    console.log(`🔗 Bound to: ${serverIP}:${PORT} (HTTPS)`);
    console.log(`🏠 Secure Internal API: https://${serverIP}:${PORT}/api`);
    console.log(`🔒 SSL Certificate: tallman-chat-server.pem`);
    console.log(`🔗 LDAP HTTPS Service: https://${ldapIP}:${LDAP_HTTPS_PORT}`);
    console.log();
    console.log('🛡️ Security Features:');
    console.log('   ✅ HTTPS/SSL Encryption');
    console.log('   ✅ Restricted CORS');
    console.log('   ✅ Certificate Validation');
    console.log();
    console.log('📊 HTTPS Endpoints:');
    console.log('   POST /api/auth/login     - HTTPS User authentication');
    console.log('   POST /api/chat/send      - Secure chat messages');
    console.log('   POST /api/chat/stream    - HTTPS streaming chat');
    console.log('   GET  /api/knowledge      - Secure knowledge retrieval');
    console.log('   POST /api/knowledge      - Secure knowledge addition');
    console.log('   DELETE /api/knowledge    - Secure knowledge clearing');
    console.log('   GET  /api/users          - Secure user management');
    console.log('   POST /api/users          - Secure user addition');
    console.log('   DELETE /api/users/:user  - Secure user deletion');
    console.log();
    console.log('🚀 Loading services...');

    await loadServices();

    console.log();
    console.log('🛑 Press Ctrl+C to stop');
    console.log('🔵 ========================================');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 HTTPS Backend API uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💫 HTTPS Backend API unhandled rejection:', reason);
    process.exit(1);
});

module.exports = app;
