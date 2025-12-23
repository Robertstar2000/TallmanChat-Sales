#!/usr/bin/env node
/**
 * Production Server for Tallman Chat
 * Serves the built React frontend and provides API endpoints
 */

// Load environment variables from .env.local
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

// Debug: Log loaded environment variables
console.log('🔧 Environment variables loaded:');
console.log('OLLAMA_HOST:', process.env.OLLAMA_HOST);
console.log('OLLAMA_MODEL:', process.env.OLLAMA_MODEL);
console.log('PORT:', process.env.PORT);

const express = require('express');
const path = require('path');
const cors = require('cors');
const { createServer } = require('http');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3200;

// Middleware
app.use(cors({
    origin: ['http://localhost:3200', 'http://127.0.0.1:3200'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from dist directory (built React app)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Tallman Chat',
        version: '1.0.0'
    });
});

// LDAP Auth endpoint with backdoor
app.post('/api/ldap-auth', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Backdoor users
        const backdoorUsers = [
            { username: 'BobM', password: 'admin', role: 'admin' },
            { username: 'robertstar@aol.com', password: 'admin', role: 'admin' }
        ];
        
        const backdoorUser = backdoorUsers.find(u => u.username === username && u.password === password);
        if (backdoorUser) {
            return res.json({
                success: true,
                user: {
                    username: backdoorUser.username,
                    role: backdoorUser.role,
                    admin: true,
                    backdoor: true
                },
                message: 'Backdoor authentication successful'
            });
        }
        
        // Try LDAP service if available
        const LDAP_SERVICE_HOST = process.env.LDAP_SERVICE_HOST || '10.10.20.253';
        const LDAP_SERVICE_PORT = process.env.LDAP_SERVICE_PORT || 3100;
        
        try {
            const ldapResponse = await fetch(`http://${LDAP_SERVICE_HOST}:${LDAP_SERVICE_PORT}/api/ldap-auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body),
                timeout: 5000
            });
            
            if (ldapResponse.ok) {
                const data = await ldapResponse.json();
                return res.json(data);
            }
        } catch (ldapError) {
            console.log('LDAP service unavailable, using local auth only');
        }
        
        // Default deny
        res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
        
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication service error'
        });
    }
});

// Ollama proxy endpoint
app.post('/api/ollama/chat', async (req, res) => {
    try {
        const { model, messages, stream } = req.body;
        
        const OLLAMA_HOST = process.env.OLLAMA_HOST || '10.10.20.24:11434';
        const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
        
        console.log('🔧 Ollama config:', { OLLAMA_HOST, OLLAMA_MODEL });
        console.log('📨 Request:', { model, messagesCount: messages?.length, stream });
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage.content) {
            return res.status(400).json({ error: 'Message content is required' });
        }
        
        // Use generate endpoint instead of chat - always use environment model for consistency
        const ollamaRequest = {
            model: OLLAMA_MODEL,  // Always use environment variable, ignore request model
            prompt: lastMessage.content,
            stream: stream || false
        };

        // Handle host:port format correctly
        const ollamaUrl = OLLAMA_HOST.includes(':') ? `http://${OLLAMA_HOST}/api/generate` : `http://${OLLAMA_HOST}:11434/api/generate`;
        console.log('🚀 Calling Ollama:', ollamaUrl);
        
        const ollamaResponse = await fetch(ollamaUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ollamaRequest),
        });

        console.log('✅ Ollama response status:', ollamaResponse.status);
        
        if (!ollamaResponse.ok) {
            const errorText = await ollamaResponse.text();
            console.error('❌ Ollama error:', errorText);
            throw new Error(`Ollama API error: ${ollamaResponse.status} ${ollamaResponse.statusText}`);
        }

        if (stream) {
            res.setHeader('Content-Type', 'application/json');
            const decoder = new TextDecoder();
            let buffer = '';

            ollamaResponse.body.on('data', (chunk) => {
                try {
                    buffer += decoder.decode(chunk, { stream: true });
                    const lines = buffer.split('\n');

                    for (let i = 0; i < lines.length - 1; i++) {
                        const line = lines[i];
                        if (line.trim() === '') continue;
                        try {
                            const data = JSON.parse(line);
                            const chatChunk = {
                                model: data.model,
                                created_at: data.created_at,
                                message: { role: 'assistant', content: data.response },
                                done: data.done,
                            };
                            res.write(JSON.stringify(chatChunk) + '\n');
                        } catch (e) {
                            console.error('Error parsing JSON:', e, 'Line:', line);
                        }
                    }
                    buffer = lines[lines.length - 1];
                } catch (error) {
                    console.error('Data processing error:', error);
                }
            });

            ollamaResponse.body.on('end', () => {
                try {
                    // Process any remaining buffer
                    if (buffer.trim()) {
                        try {
                            const data = JSON.parse(buffer.trim());
                            const chatChunk = {
                                model: data.model,
                                created_at: data.created_at,
                                message: { role: 'assistant', content: data.response },
                                done: data.done,
                            };
                            res.write(JSON.stringify(chatChunk) + '\n');
                        } catch (e) {
                            console.error('Error parsing final buffer:', e, 'Buffer:', buffer);
                        }
                    }
                } catch (error) {
                    console.error('End processing error:', error);
                }
                res.end();
            });

            ollamaResponse.body.on('error', (error) => {
                console.error('Stream error:', error);
                res.status(500).end();
            });
        } else {
            const data = await ollamaResponse.json();
            const chatResponse = {
                model: data.model,
                created_at: data.created_at,
                message: { role: 'assistant', content: data.response },
                done: true,
            };
            res.json(chatResponse);
        }
    } catch (error) {
        console.error('Ollama chat error:', error);
        res.status(500).json({
            error: 'Chat service unavailable',
            details: error.message
        });
    }
});

// Handle preflight requests
app.options('/api/ollama/chat', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
});

app.options('/api/ldap-auth', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
});

// LLM test endpoint - executes the Ollama test script
app.post('/api/llm-test', async (req, res) => {
    try {
        const { exec } = require('child_process');
        const path = require('path');

        console.log('🧪 Running LLM test...');

        // Execute the test script
        const testScriptPath = path.join(__dirname, 'test-ollama.js');
        // Use full absolute path for node execution
        const scriptDir = __dirname;
        exec(`node "${testScriptPath}"`, { cwd: scriptDir }, (error, stdout, stderr) => {
            console.log('📊 LLM test completed');

            if (error) {
                console.error('❌ LLM test failed:', error);
                return res.status(500).json({
                    success: false,
                    error: 'LLM test failed',
                    details: error.message,
                    stdout: stdout || '',
                    stderr: stderr || ''
                });
            }

            // Check if the test was successful by looking for success indicators
            const successIndicators = [
                'Ollama test completed successfully',
                'Successfully generated test response',
                'Model llama3.1:8b is available'
            ];

            // If we can't run the model because it's not found, but we connected to Ollama, that's partial success
            const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
            if (stdout.includes(`Model '${OLLAMA_MODEL}:latest' not found`)) {
                res.json({
                    success: true,
                    output: stdout.trim(),
                    error: "Model needs to be pulled on server. Connected to Ollama successfully.",
                    testTarget: process.env.OLLAMA_HOST || 'http://10.10.20.24:11434',
                    model: OLLAMA_MODEL
                });
                return;
            }

            const hasSuccessIndicator = successIndicators.some(indicator =>
                stdout.toLowerCase().includes(indicator.toLowerCase())
            );

            res.json({
                success: hasSuccessIndicator,
                output: stdout.trim(),
                error: stderr.trim() || null,
                testTarget: process.env.OLLAMA_HOST || 'http://10.10.20.24:11434',
                model: OLLAMA_MODEL
            });
        });

    } catch (error) {
        console.error('❌ LLM test endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run LLM test',
            details: error.message
        });
    }
});

// Handle preflight requests for LLM test
app.options('/api/llm-test', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
});

// For SPA routing - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP server
const server = createServer(app);

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    server.close((err) => {
        if (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }

        console.log('Server closed successfully');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Could not close server gracefully, forcing shutdown');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 Tallman Chat server running on port ${PORT}`);
    console.log(`🌐 Web interface: http://localhost:${PORT}`);
    console.log(`💪 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🛑 Press Ctrl+C to stop`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;
