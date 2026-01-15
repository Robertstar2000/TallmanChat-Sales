#!/usr/bin/env node
/**
 * Tallman Chat Backend API Server
 * Handles API endpoints, database operations, and AI chat
 * Runs on port 3006 (internal API only)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { networkInterfaces } = require('os');
const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables from .env.local or .env.docker
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envDockerPath = path.join(__dirname, '..', '.env.docker');

// Try Docker env first, fall back to local
if (require('fs').existsSync(envDockerPath)) {
    require('dotenv').config({ path: envDockerPath });
} else {
    require('dotenv').config({ path: envLocalPath });
}

const app = express();

// Determine server IP (internal network)
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
const PORT = process.env.PORT || 3210;

// Allow CORS but restrict to local network
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (postman, curl, etc) and localhost/network
        if (!origin || origin.includes('localhost') || origin.includes(serverIP)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

// --- Service Host Configuration ---
// LDAP Service (where ldap-auth.js is running)
const LDAP_SERVICE_HOST = process.env.LDAP_SERVICE_HOST || '10.10.20.253'; // Working configuration
const LDAP_SERVICE_PORT = process.env.LDAP_SERVICE_PORT || 3100;

// Ollama Configuration
let OLLAMA_HOST = (process.env.OLLAMA_HOST || '10.10.20.24').split('localhost').join('127.0.0.1');
let OLLAMA_PORT = '11434';
// Check if OLLAMA_HOST includes a port
if (OLLAMA_HOST.includes(':')) {
    const parts = OLLAMA_HOST.split(':');
    OLLAMA_HOST = parts[0];
    OLLAMA_PORT = parts[1];
}
const OLLAMA_API_URL = `http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/generate`;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b'; // Stable working model

// Secondary LLM Configuration (OpenAI-compatible) - Docker Granite
let SECONDARY_LLM_BASE_URL = process.env.SECONDARY_LLM_BASE_URL || 'http://127.0.0.1:12435/v1';
SECONDARY_LLM_BASE_URL = SECONDARY_LLM_BASE_URL.split('localhost').join('127.0.0.1').split('::1').join('127.0.0.1');
const SECONDARY_LLM_MODEL = process.env.SECONDARY_LLM_MODEL || 'ai/granite-4.0-nano:latest';

// Tertiary LLM Configuration (Google Gemini)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

console.log(`🤖 Primary LLM: Gemini model ${GEMINI_MODEL}`);
console.log(`🤖 Secondary LLM: ${SECONDARY_LLM_MODEL} at ${SECONDARY_LLM_BASE_URL}`);
console.log(`🤖 Tertiary LLM: Ollama model ${OLLAMA_MODEL} at ${OLLAMA_HOST}:11434`);

console.log(`🤖 Ollama configured at: ${OLLAMA_HOST}:11434`);
console.log(`🔐 LDAP configured at: ${LDAP_SERVICE_HOST}:${LDAP_SERVICE_PORT}`);

// LLM Fallback Helper Function
async function callLLMWithFallback(prompt, options = {}) {
    const { stream = false, model = null, timeout = 15000 } = options; // Reduced timeout to 15 seconds

    // Try Gemini first (Primary LLM)
    try {
        console.log('🔄 Trying primary LLM (Gemini)...');

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log('✅ Primary LLM (Gemini) succeeded');
        return {
            success: true,
            source: 'gemini',
            model: GEMINI_MODEL,
            response: { text: text }
        };
    } catch (geminiError) {
        console.error('❌ Gemini LLM error:', geminiError.message);
    }

    // Try LocalAI as secondary fallback
    try {
        console.log('🔄 Trying secondary LLM (LocalAI)...');

        const secondaryRequest = {
            model: model || SECONDARY_LLM_MODEL,
            messages: [{ role: 'user', content: prompt }],
            stream: stream
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏰ LocalAI request timed out');
            controller.abort();
        }, timeout);

        const secondaryResponse = await fetch(SECONDARY_LLM_BASE_URL + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(secondaryRequest),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (secondaryResponse.ok) {
            console.log('✅ Secondary LLM (LocalAI) succeeded');
            const data = await secondaryResponse.json();
            return {
                success: true,
                source: 'secondary',
                model: model || SECONDARY_LLM_MODEL,
                response: { text: data.choices?.[0]?.message?.content }
            };
        }

        console.error(`❌ LocalAI LLM failed with status ${secondaryResponse.status}`);

    } catch (secondaryError) {
        console.error('❌ LocalAI LLM error:', secondaryError.message);
    }

    // Try Ollama as tertiary fallback (commented out)
    /*
    try {
        console.log('🔄 Trying tertiary LLM (Ollama)...');

        const ollamaRequest = {
            model: model || OLLAMA_MODEL,
            prompt: prompt,
            stream: stream
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏰ Ollama request timed out');
            controller.abort();
        }, timeout);

        const ollamaResponse = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ollamaRequest),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (ollamaResponse.ok) {
            console.log('✅ Tertiary LLM (Ollama) succeeded');
            return {
                success: true,
                source: 'ollama',
                model: model || OLLAMA_MODEL,
                response: ollamaResponse
            };
        }

        console.error(`❌ Ollama LLM failed with status ${ollamaResponse.status}`);

    } catch (ollamaError) {
        console.error('❌ Ollama LLM error:', ollamaError.message);
    }
    */

    // All failed - provide fallback response instead of throwing
    console.error('💥 All LLM services failed, providing fallback response');
    return {
        success: false,
        source: 'fallback',
        model: 'none',
        response: null,
        fallbackMessage: 'I apologize, but all AI services are currently unavailable. Please try again later.'
    };
}

// Chat LLM Fallback Helper Function (for chat API with messages array)
async function callChatLLMWithFallback(messages, options = {}) {
    const { stream = false, model = null, timeout = 15000 } = options; // Reduced timeout

    // Try Gemini chat API first
    try {
        console.log('🔄 Trying primary LLM (Gemini chat API)...');

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const chat = model.startChat({
            history: messages.slice(0, -1).map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }))
        });

        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastMessage.content);
        const response = result.response;
        const text = response.text();

        console.log('✅ Primary LLM (Gemini chat) succeeded');
        return {
            success: true,
            source: 'gemini',
            model: GEMINI_MODEL,
            response: { text: text }
        };
    } catch (geminiError) {
        console.log('❌ Gemini LLM error:', geminiError.message);
    }

    // Fallback to LocalAI (OpenAI-compatible)
    try {
        console.log('🔄 Trying secondary LLM (LocalAI chat)...');

        const secondaryRequest = {
            model: model || SECONDARY_LLM_MODEL,
            messages: messages,
            stream: stream
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏰ LocalAI chat request timed out');
            controller.abort();
        }, timeout);

        const secondaryResponse = await fetch(SECONDARY_LLM_BASE_URL + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(secondaryRequest),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (secondaryResponse.ok) {
            console.log('✅ Secondary LLM (LocalAI chat) succeeded');
            return {
                success: true,
                source: 'secondary',
                model: model || SECONDARY_LLM_MODEL,
                response: secondaryResponse
            };
        }

        console.error(`❌ LocalAI failed with status ${secondaryResponse.status}`);

    } catch (secondaryError) {
        console.error('❌ LocalAI error:', secondaryError.message);
    }

    // Try Ollama as tertiary fallback (commented out)
    /*
    try {
        console.log('🔄 Trying tertiary LLM (Ollama chat)...');

        const ollamaRequest = {
            model: model || OLLAMA_MODEL,
            messages: messages,
            stream: stream
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏰ Ollama chat request timed out');
            controller.abort();
        }, timeout);

        const ollamaResponse = await fetch(`http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ollamaRequest),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (ollamaResponse.ok) {
            console.log('✅ Tertiary LLM (Ollama chat) succeeded');
            return {
                success: true,
                source: 'ollama',
                model: model || OLLAMA_MODEL,
                response: ollamaResponse
            };
        }

        console.error(`❌ Ollama failed with status ${ollamaResponse.status}`);

    } catch (ollamaError) {
        console.error('❌ Ollama error:', ollamaError.message);
    }
    */

    // All failed - provide fallback response instead of throwing
    console.error('💥 All LLM services failed, providing fallback response');
    return {
        success: false,
        source: 'fallback',
        model: 'none',
        response: null,
        fallbackMessage: 'I apologize, but all AI services are currently unavailable. Please try again later.'
    };
}

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side services
let chatService;
let dbService;
let knowledgeService;

// File-based persistent storage
const USERS_FILE = path.join(__dirname, '..', 'users.json');
const ADMINS_FILE = path.join(__dirname, '..', 'admins.json');
const KNOWLEDGE_FILE = path.join(__dirname, '..', 'knowledge.json');

// Load persistent data
function loadPersistentData() {
    // Load users
    let emailPasswordUsers = new Map();
    if (fs.existsSync(USERS_FILE)) {
        try {
            const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            emailPasswordUsers = new Map(Object.entries(usersData));
        } catch (error) {
            console.error('Error loading users file:', error);
        }
    }

    // Load admins
    let mockUsers = [
        { username: 'BobM', role: 'admin' },
        { username: 'robertstar@aol.com', role: 'admin', backdoor: true }
    ];
    if (fs.existsSync(ADMINS_FILE)) {
        try {
            mockUsers = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
        } catch (error) {
            console.error('Error loading admins file:', error);
        }
    }

    // Load knowledge
    let mockKnowledge = [];
    if (fs.existsSync(KNOWLEDGE_FILE)) {
        try {
            mockKnowledge = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
        } catch (error) {
            console.error('Error loading knowledge file:', error);
        }
    }

    return { emailPasswordUsers, mockUsers, mockKnowledge };
}

// Save persistent data
function saveUsers(users) {
    try {
        const usersObject = Object.fromEntries(users);
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersObject, null, 2));
    } catch (error) {
        console.error('Error saving users file:', error);
    }
}

function saveAdmins(admins) {
    try {
        fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
    } catch (error) {
        console.error('Error saving admins file:', error);
    }
}

function saveKnowledge(knowledge) {
    try {
        fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(knowledge, null, 2));
    } catch (error) {
        console.error('Error saving knowledge file:', error);
    }
}

// Load data
const persistentData = loadPersistentData();
let mockUsers = persistentData.mockUsers;
let mockKnowledge = persistentData.mockKnowledge;
let authenticatedUsers = new Map(); // Track authenticated users and their admin status (in-memory only)

// Email/Password user storage (persistent)
let emailPasswordUsers = persistentData.emailPasswordUsers;

async function loadServices() {
    dbService = {
        getAllApprovedUsers: () => Promise.resolve([...mockUsers]),
        addOrUpdateApprovedUser: (user) => {
            const index = mockUsers.findIndex(u => u.username === user.username);
            if (index >= 0) mockUsers[index] = user;
            else mockUsers.push(user);
            return Promise.resolve();
        },
        deleteApprovedUser: (username) => {
            const index = mockUsers.findIndex(u => u.username === username);
            if (index >= 0) mockUsers.splice(index, 1);
            return Promise.resolve();
        },
        // Additional methods for authentication
        addAuthenticatedUser: (sessionId, userData) => {
            authenticatedUsers.set(sessionId, {
                ...userData,
                timestamp: Date.now()
            });
        },
        getAuthenticatedUser: (sessionId) => {
            const user = authenticatedUsers.get(sessionId);
            // Remove expired sessions (24h)
            if (user && (Date.now() - user.timestamp) > 24 * 60 * 60 * 1000) {
                authenticatedUsers.delete(sessionId);
                return null;
            }
            return user;
        },
        removeAuthenticatedUser: (sessionId) => {
            authenticatedUsers.delete(sessionId);
        },
        isUserAdmin: (username) => {
            // Check mock users first
            const mockUser = mockUsers.find(u => u.username === username);
            if (mockUser && mockUser.role === 'admin') return true;

            // Check authenticated users
            for (const user of authenticatedUsers.values()) {
                if (user.username === username ||
                    user.sAMAccountName === username ||
                    user.userPrincipalName === username ||
                    user.cn === username) {
                    return user.admin === true;
                }
            }
            return false;
        }
    };
    
    knowledgeService = {
        retrieveContext: (query) => {
            const matches = mockKnowledge.filter(item =>
                item.toLowerCase().includes(query.toLowerCase())
            );
            return Promise.resolve(matches.slice(0, 5));
        },
        getAllKnowledge: () => Promise.resolve([...mockKnowledge]),
        addKnowledge: (content) => {
            mockKnowledge.push(content);
            saveKnowledge(mockKnowledge); // Persist to file
            return Promise.resolve();
        },
        clearAllKnowledge: () => {
            mockKnowledge.length = 0;
            saveKnowledge(mockKnowledge); // Persist to file
            return Promise.resolve();
        }
    };
    
    chatService = { 
        sendMessage: () => Promise.resolve('Backend service active')
    };
    
    console.log('✅ Services loaded successfully');
}

// Email/Password Signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;

        // Validate required fields
        if (!email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and confirm password are required'
            });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Passwords do not match'
            });
        }

        // Validate email domain (except for backdoor)
        const backdoorUsername = process.env.BACKDOOR_USERNAME;
        if (email !== backdoorUsername) {
            const domain = email.toLowerCase().split('@')[1];
            if (domain !== 'tallmanequipment.com') {
                return res.status(400).json({
                    success: false,
                    error: 'Only @tallmanequipment.com email addresses are allowed'
                });
            }
        }

        // Check if user already exists
        if (emailPasswordUsers.has(email.toLowerCase())) {
            return res.status(409).json({
                success: false,
                error: 'User already exists with this email'
            });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = {
            email: email.toLowerCase(),
            passwordHash,
            role: 'user', // Default role
            createdAt: new Date().toISOString()
        };

        // Store user
        emailPasswordUsers.set(email.toLowerCase(), user);
        saveUsers(emailPasswordUsers); // Persist to file

        console.log(`✅ New user registered: ${email}`);

        res.json({
            success: true,
            message: 'Account created successfully'
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create account'
        });
    }
});

// Email/Password Login with backdoor support
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Handle both username and email fields (backward compatibility)
        const email = username;

        // Backdoor authentication using environment variables
        const backdoorUsername = process.env.BACKDOOR_USERNAME;
        const backdoorPassword = process.env.BACKDOOR_PASSWORD;

        if (backdoorUsername && backdoorPassword && email === backdoorUsername && password === backdoorPassword) {
            return res.json({
                success: true,
                user: {
                    username: backdoorUsername,
                    email: backdoorUsername,
                    role: 'admin',
                    admin: true,
                    backdoor: true
                },
                message: 'Backdoor authentication successful'
            });
        }

        // Fallback backdoor for BobM (keep existing)
        if (email === 'BobM' && password === 'admin') {
            return res.json({
                success: true,
                user: {
                    username: 'BobM',
                    email: 'BobM',
                    role: 'admin',
                    admin: true,
                    backdoor: true
                },
                message: 'Backdoor authentication successful'
            });
        }

        // TEMPORARILY COMMENTED OUT - LDAP functionality preserved
        /*
        // Try LDAP service
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
            console.log('LDAP service unavailable, using backdoor only');
        }
        */

        // Email/Password authentication
        const user = emailPasswordUsers.get(email.toLowerCase());
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check if user is in admin list
        const adminUser = mockUsers.find(u => u.username === email || u.username === email.split('@')[0]);
        const isAdmin = adminUser && adminUser.role === 'admin';

        console.log(`✅ User logged in: ${email}${isAdmin ? ' (admin)' : ''}`);

        res.json({
            success: true,
            user: {
                username: email,
                email: user.email,
                role: isAdmin ? 'admin' : user.role,
                admin: isAdmin
            },
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication service error'
        });
    }
});

// LDAP Auth endpoint alias
app.post('/api/ldap-auth', async (req, res) => {
    // Redirect to main auth endpoint
    req.url = '/api/auth/login';
    return app._router.handle(req, res);
});

// Ollama chat endpoint with failover to secondary LLM
app.post('/api/ollama/chat', async (req, res) => {
    console.log('🔍 Received request on /api/ollama/chat');
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));

    try {
        const { model, messages, stream } = req.body;

        // Validate request
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || !lastMessage.content) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Use LLM with fallback (chat API)
        const llmResult = await callChatLLMWithFallback(messages, {
            stream: Boolean(stream),
            model: model,
            timeout: 30000
        });

        if (llmResult.success) {
            if (stream) {
                // Handle streaming response
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                const reader = llmResult.response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                const processStream = async () => {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();

                            if (done) {
                                if (buffer.trim()) {
                                    try {
                                        const data = JSON.parse(buffer);
                                        if (llmResult.source === 'ollama') {
                                            // Ollama chat format
                                            const chatChunk = {
                                                model: data.model,
                                                created_at: data.created_at,
                                                message: { role: 'assistant', content: data.message?.content || '' },
                                                done: true
                                            };
                                            res.write(JSON.stringify(chatChunk) + '\n');
                                        } else {
                                            // Secondary LLM format - simulate chat completion format
                                            const chatChunk = {
                                                model: llmResult.model,
                                                created_at: new Date().toISOString(),
                                                message: { role: 'assistant', content: data.choices?.[0]?.delta?.content || '' },
                                                done: true
                                            };
                                            res.write(JSON.stringify(chatChunk) + '\n');
                                        }
                                    } catch (e) {
                                        console.error('Error parsing final chunk:', e);
                                    }
                                }
                                res.end();
                                break;
                            }

                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');

                            for (let i = 0; i < lines.length - 1; i++) {
                                const line = lines[i].trim();
                                if (!line) continue;

                                try {
                                    const data = JSON.parse(line);
                                    let chatChunk;

                                    if (llmResult.source === 'ollama') {
                                        // Ollama chat format
                                        chatChunk = {
                                            model: data.model,
                                            created_at: data.created_at,
                                            message: { role: 'assistant', content: data.message?.content || '' },
                                            done: Boolean(data.done)
                                        };
                                    } else {
                                        // Secondary LLM format (OpenAI-compatible)
                                        chatChunk = {
                                            model: llmResult.model,
                                            created_at: new Date().toISOString(),
                                            message: { role: 'assistant', content: data.choices?.[0]?.delta?.content || '' },
                                            done: Boolean(data.choices?.[0]?.finish_reason)
                                        };
                                    }

                                    res.write(JSON.stringify(chatChunk) + '\n');
                                } catch (e) {
                                    console.error('Error parsing stream chunk:', e, 'Line:', line);
                                }
                            }

                            buffer = lines[lines.length - 1];
                        }
                    } catch (streamError) {
                        console.error('❌ Stream processing error:', streamError);
                        if (!res.headersSent) {
                            res.status(500).json({ error: 'Stream processing failed' });
                        } else {
                            res.end();
                        }
                    }
                };

                await processStream();
            } else {
                // Handle non-streaming response
                const data = await llmResult.response.json();
                console.log(`✅ ${llmResult.source} response:`, data);

                let chatResponse;
                if (llmResult.source === 'ollama') {
                    // Ollama chat format
                    chatResponse = {
                        model: data.model,
                        created_at: data.created_at,
                        message: {
                            role: 'assistant',
                            content: data.message?.content || ''
                        },
                        done: true
                    };
                } else {
                    // Secondary LLM format (OpenAI-compatible)
                    chatResponse = {
                        model: llmResult.model,
                        created_at: new Date().toISOString(),
                        message: {
                            role: 'assistant',
                            content: data.choices?.[0]?.message?.content || ''
                        },
                        done: true
                    };
                }

                res.json(chatResponse);
            }
        } else {
            // Fallback response
            if (stream) {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                const fallbackChunk = {
                    model: llmResult.model,
                    created_at: new Date().toISOString(),
                    message: { role: 'assistant', content: llmResult.fallbackMessage },
                    done: true
                };
                res.write(JSON.stringify(fallbackChunk) + '\n');
                res.end();
            } else {
                const chatResponse = {
                    model: llmResult.model,
                    created_at: new Date().toISOString(),
                    message: {
                        role: 'assistant',
                        content: llmResult.fallbackMessage
                    },
                    done: true
                };
                res.json(chatResponse);
            }
        }

    } catch (error) {
        console.error('❌ Chat LLM error:', error);

        if (!res.headersSent) {
            res.status(500).json({
                error: 'Chat service unavailable',
                details: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
});

// Chat API endpoints

// Chat API endpoints
app.post('/api/chat/send', async (req, res) => {
    try {
        const { messages, message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get context from knowledge base
        const context = await knowledgeService.retrieveContext(message);
        console.log('Found context items:', context.length);

        // Prepare enhanced prompt
        let enhancedPrompt = message;
        if (context.length > 0) {
            enhancedPrompt = `Use the following information from Tallman Equipment's knowledge base to answer the question:

${context.map(item => `- ${item}`).join('\n')}

Question: ${message}

Answer as a knowledgeable Tallman employee:`;
        }

        // Use LLM with fallback
        const llmResult = await callLLMWithFallback(enhancedPrompt, { stream: false });

        let aiResponse;
        if (llmResult.success) {
            if (llmResult.source === 'ollama') {
                // Ollama response format
                const data = await llmResult.response.json();
                aiResponse = data.response;
            } else {
                // Secondary/Gemini response format
                aiResponse = llmResult.response.text || 'No response from LLM';
            }
        } else {
            // Fallback response
            aiResponse = llmResult.fallbackMessage;
        }

        // Return the AI response
        res.json({
            response: aiResponse,
            context: context.length > 0 ? context.slice(0, 3) : null,
            llmSource: llmResult.source,
            model: llmResult.model
        });

    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({
            error: 'Failed to process chat message',
            details: 'Both LLM services are unavailable'
        });
    }
});

// Streaming chat endpoint
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { message, history } = req.body;

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

        // Use LLM with fallback (streaming not supported for secondary LLM yet)
        const llmResult = await callLLMWithFallback(enhancedPrompt, { stream: false });

        let aiResponse;
        if (llmResult.success) {
            if (llmResult.source === 'ollama') {
                // Ollama response format
                const data = await llmResult.response.json();
                aiResponse = data.response;
            } else {
                // Secondary/Gemini response format
                aiResponse = llmResult.response.text || 'No response from LLM';
            }
        } else {
            // Fallback response
            aiResponse = llmResult.fallbackMessage;
        }

        // For streaming, we'll just return the complete response as a single chunk
        // (true streaming would require more complex implementation for secondary LLM)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send the response as streaming data
        res.write(`data: ${JSON.stringify({
            response: aiResponse,
            done: true,
            llmSource: llmResult.source,
            model: llmResult.model
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('Streaming chat error:', error);
        res.status(500).json({
            error: 'Failed to start chat stream',
            details: 'Both LLM services are unavailable'
        });
    }
});

// Knowledge base endpoints
app.get('/api/knowledge', async (req, res) => {
    try {
        const knowledge = await knowledgeService.getAllKnowledge();
        res.json(knowledge);
    } catch (error) {
        console.error('Knowledge retrieval error:', error);
        res.status(500).json({ error: 'Failed to retrieve knowledge' });
    }
});

app.post('/api/knowledge', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || typeof content !== 'string') {
            return res.status(400).json({ error: 'Content is required' });
        }

        await knowledgeService.addKnowledge(content.trim());
        res.json({ success: true, message: 'Knowledge added' });
    } catch (error) {
        console.error('Knowledge addition error:', error);
        res.status(500).json({ error: 'Failed to add knowledge' });
    }
});

app.delete('/api/knowledge', async (req, res) => {
    try {
        await knowledgeService.clearAllKnowledge();
        res.json({ success: true, message: 'Knowledge base cleared' });
    } catch (error) {
        console.error('Knowledge clear error:', error);
        res.status(500).json({ error: 'Failed to clear knowledge' });
    }
});

// User management endpoints
app.get('/api/users', async (req, res) => {
    try {
        const users = await dbService.getAllApprovedUsers();
        res.json(users);
    } catch (error) {
        console.error('User retrieval error:', error);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, role } = req.body;
        await dbService.addOrUpdateApprovedUser({ username, role: role || 'user' });
        saveAdmins(mockUsers); // Persist to file
        res.json({ success: true, message: 'User added' });
    } catch (error) {
        console.error('User addition error:', error);
        res.status(500).json({ error: 'Failed to add user' });
    }
});

app.delete('/api/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        await dbService.deleteApprovedUser(username);
        saveAdmins(mockUsers); // Persist to file
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('User deletion error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Tallman Backend API',
        port: PORT,
        serverIP: serverIP,
        timestamp: new Date().toISOString(),
        services: {
            ldap: 'available',
            ollama: 'connected',
            database: 'active'
        }
    });
});

// LLM test endpoint for admin panel
app.post('/api/llm-test', async (req, res) => {
    try {
        const testPrompt = 'Hello, this is a test message. Please respond with a short confirmation that you received this message.';

        console.log('🧪 Testing LLM connections...');

        // Use LLM with fallback
        const llmResult = await callLLMWithFallback(testPrompt, { stream: false, timeout: 10000 });

        let output;
        if (llmResult.success) {
            if (llmResult.source === 'gemini') {
                output = llmResult.response.text || 'Test successful - received response from Gemini';
            } else {
                output = llmResult.response.text || `Test successful - received response from ${llmResult.source}`;
            }

            console.log(`✅ LLM test successful using ${llmResult.source}`);

            res.json({
                success: true,
                output: output,
                llmSource: llmResult.source,
                model: llmResult.model,
                testTarget: llmResult.source === 'ollama' ? OLLAMA_API_URL.split('localhost').join('127.0.0.1') : SECONDARY_LLM_BASE_URL
            });
        } else {
            // Fallback response
            console.log('⚠️ LLM test failed, using fallback response');

            res.json({
                success: false,
                output: llmResult.fallbackMessage,
                llmSource: llmResult.source,
                model: llmResult.model,
                testTarget: 'All LLM endpoints failed'
            });
        }

    } catch (error) {
        console.error('❌ LLM test error:', error);
        res.json({
            success: false,
            error: error.message || 'Both LLM services are unavailable',
            testTarget: 'Both primary and secondary LLM endpoints'
        });
    }
});

// Backup endpoint
app.get('/api/backup', async (req, res) => {
    try {
        const backupData = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            data: {
                users: Object.fromEntries(emailPasswordUsers),
                admins: mockUsers,
                knowledge: mockKnowledge
            }
        };

        const backupFilename = `tallman-backup-${new Date().toISOString().split('T')[0]}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${backupFilename}"`);
        res.json(backupData);

        console.log('✅ Backup created and downloaded');
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// Restore endpoint
app.post('/api/restore', async (req, res) => {
    try {
        const { data } = req.body;

        if (!data) {
            return res.status(400).json({ error: 'Backup data is required' });
        }

        // Validate backup structure
        if (!data.users || !data.admins || !data.knowledge) {
            return res.status(400).json({ error: 'Invalid backup format' });
        }

        // Restore data
        emailPasswordUsers = new Map(Object.entries(data.users));
        mockUsers = data.admins;
        mockKnowledge = data.knowledge;

        // Save to files
        saveUsers(emailPasswordUsers);
        saveAdmins(mockUsers);
        saveKnowledge(mockKnowledge);

        console.log('✅ Data restored from backup');
        console.log(`- Users: ${emailPasswordUsers.size}`);
        console.log(`- Admins: ${mockUsers.length}`);
        console.log(`- Knowledge items: ${mockKnowledge.length}`);

        res.json({
            success: true,
            message: 'Data restored successfully',
            restored: {
                users: emailPasswordUsers.size,
                admins: mockUsers.length,
                knowledge: mockKnowledge.length
            }
        });

    } catch (error) {
        console.error('Restore error:', error);
        res.status(500).json({ error: 'Failed to restore data' });
    }
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'active',
        service: 'Tallman Backend API Service',
        port: PORT,
        serverIP: serverIP,
        timestamp: new Date().toISOString(),
        hostname: require('os').hostname(),
        ipAddresses: addresses
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Backend API error:', error);
    res.status(500).json({
        error: 'Internal server error',
        details: error.message,
        service: 'backend-api'
    });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`📴 Backend API - Received ${signal}. Shutting down...`);
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server - bind to all interfaces (0.0.0.0) to be reachable from other servers
const server = app.listen(PORT, '0.0.0.0', async (err) => {
    if (err) {
        console.error(`❌ Backend API failed to bind to ${serverIP}:${PORT}:`, err.message);
        process.exit(1);
    }

    console.log('🔵 ========================================');
    console.log('🔵 TALLMAN BACKEND API SERVER IS RUNNING!');
    console.log('🔵 ========================================');
    console.log();
    console.log(`🔗 Bound to: ${serverIP}:${PORT}`);
    console.log(`🏠 Internal API: http://${serverIP}:${PORT}/api`);
    console.log();
    console.log('📊 Endpoints:');
    console.log('   POST /api/auth/login     - User authentication');
    console.log('   POST /api/auth/signup    - User registration');
    console.log('   POST /api/chat/send      - Chat messages');
    console.log('   POST /api/chat/stream    - Streaming chat');
    console.log('   GET  /api/knowledge      - Get knowledge base');
    console.log('   POST /api/knowledge      - Add knowledge');
    console.log('   DELETE /api/knowledge    - Clear knowledge');
    console.log('   GET  /api/users          - Get admin users');
    console.log('   POST /api/users          - Add admin user');
    console.log('   DELETE /api/users/:user  - Delete admin user');
    console.log('   GET  /api/backup         - Download backup');
    console.log('   POST /api/restore        - Restore from backup');
    console.log();
    console.log('🚀 Loading services...');

    await loadServices();

    console.log();
    console.log('🛑 Press Ctrl+C to stop');
    console.log('🔵 ========================================');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 Backend API uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💫 Backend API unhandled rejection:', reason);
    process.exit(1);
});

module.exports = app;
