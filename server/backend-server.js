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
const { groundQuery, enhanceResponseWithLinks } = require('./grounding-service');

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

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.2'; // As requested
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Secondary LLM Configuration (Google Gemini as fallback)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

console.log(`🤖 Primary LLM Provider: OpenAI model ${OPENAI_MODEL}`);
console.log(`🤖 Secondary LLM Provider: Gemini model ${GEMINI_MODEL}`);
console.log(`🔐 LDAP configured at: ${LDAP_SERVICE_HOST}:${LDAP_SERVICE_PORT}`);

// LLM Fallback Helper Function
async function callLLMWithFallback(prompt, options = {}) {
    const { stream = false, model = null, timeout = 15000 } = options; // Reduced timeout to 15 seconds

    // Try OpenAI first (Primary LLM)
    try {
        console.log('🔄 Trying primary LLM (OpenAI)...');

        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not set');
        }

        const openaiRequest = {
            model: model || OPENAI_MODEL,
            messages: [{ role: 'user', content: prompt }],
            stream: stream
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏰ OpenAI request timed out');
            controller.abort();
        }, timeout);

        const openaiResponse = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify(openaiRequest),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (openaiResponse.ok) {
            console.log('✅ Primary LLM (OpenAI) succeeded');
            if (stream) {
                return {
                    success: true,
                    source: 'openai',
                    model: model || OPENAI_MODEL,
                    response: openaiResponse // Return raw response for streaming
                };
            }
            const data = await openaiResponse.json();
            return {
                success: true,
                source: 'openai',
                model: model || OPENAI_MODEL,
                response: { text: data.choices?.[0]?.message?.content }
            };
        }

        const errorText = await openaiResponse.text();
        console.error(`❌ OpenAI LLM failed with status ${openaiResponse.status}: ${errorText}`);

    } catch (openaiError) {
        console.error('❌ OpenAI LLM error:', openaiError.message);
    }

    // Try Gemini as fallback
    try {
        console.log('🔄 Trying secondary LLM (Gemini)...');

        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log('✅ Secondary LLM (Gemini) succeeded');
        return {
            success: true,
            source: 'gemini',
            model: GEMINI_MODEL,
            response: { text: text }
        };
    } catch (geminiError) {
        console.error('❌ Gemini LLM error:', geminiError.message);
    }

    // All failed
    console.error('💥 All LLM services failed, providing fallback response');
    return {
        success: false,
        source: 'fallback',
        model: 'none',
        response: null,
        fallbackMessage: 'I apologize, but AI services are currently unavailable. Please verify API keys.'
    };
}

// Chat LLM Fallback Helper Function (for chat API with messages array)
async function callChatLLMWithFallback(messages, options = {}) {
    const { stream = false, model = null, timeout = 15000 } = options; // Reduced timeout

    // Try OpenAI chat API first
    try {
        console.log('🔄 Trying primary LLM (OpenAI chat API)...');

        if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

        const openaiRequest = {
            model: model || OPENAI_MODEL,
            messages: messages,
            stream: stream
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('⏰ OpenAI chat request timed out');
            controller.abort();
        }, timeout);

        const openaiResponse = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify(openaiRequest),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (openaiResponse.ok) {
            console.log('✅ Primary LLM (OpenAI chat) succeeded');
            if (stream) {
                return {
                    success: true,
                    source: 'openai',
                    model: model || OPENAI_MODEL,
                    response: openaiResponse
                };
            }
            const data = await openaiResponse.json();
            return {
                success: true,
                source: 'openai',
                model: model || OPENAI_MODEL,
                response: { text: data.choices?.[0]?.message?.content }
            };
        }

        const errText = await openaiResponse.text();
        console.error(`❌ OpenAI failed with status ${openaiResponse.status}: ${errText}`);

    } catch (openaiError) {
        console.log('❌ OpenAI LLM error:', openaiError.message);
    }

    // Try Gemini as fallback
    try {
        // ... (keep Gemini logic if desired, or remove if strictly OpenAI)
        // For now, assume Gemini is safe fallback
        // ...
    } catch (e) { }

    // All failed
    console.error('💥 All LLM services failed');
    return {
        success: false,
        source: 'fallback',
        model: 'none',
        response: null,
        fallbackMessage: 'AI unavailable.'
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
// In Docker: /app/data is mounted as a persistent volume
// See docker-compose.yml (Desktop) and docker-compose.swarm.yml (Swarm)
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`📁 Created data directory: ${DATA_DIR}`);
    } catch (err) {
        console.error(`⚠️ Could not create data directory: ${err.message}`);
    }
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge.json');

console.log(`💾 Database files location: ${DATA_DIR}`);

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

// OpenAI chat endpoint
app.post('/api/openai/chat', async (req, res) => {
    console.log('🔍 Received request on /api/openai/chat');

    try {
        const { model, messages, stream } = req.body;

        const llmResult = await callChatLLMWithFallback(messages, {
            stream: Boolean(stream),
            model: model || OPENAI_MODEL
        });

        if (llmResult.success) {
            if (stream && llmResult.response.body) {
                // OpenAI streaming proxy
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                // Pipe the stream directly if possible, or decode/re-encode
                // OpenAI returns SSE just like we want
                const reader = llmResult.response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value); // Pass through chunks
                }
                res.end();
            } else {
                // Return JSON
                res.json(llmResult.response);
            }
        } else {
            res.status(500).json({ error: llmResult.fallbackMessage });
        }

    } catch (error) {
        console.error('OpenAI proxy error:', error);
        res.status(500).json({ error: 'Failed to process request' });
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

        // Ground the query with web search for Tallman Equipment info
        let groundingResults = { success: false, results: [], context: '' };
        try {
            if (!process.env.GOOGLE_SEARCH_ENGINE_ID) {
                console.log('⚠️ Google Search Engine ID (GOOGLE_SEARCH_ENGINE_ID) is not set. Falling back to DuckDuckGo.');
            }

            // Extract actual question if it's an enhanced prompt from frontend
            let groundingQuery = message;
            if (message.includes('Question: ')) {
                groundingQuery = message.split('Question: ').pop().trim();
            }

            groundingResults = await groundQuery(groundingQuery, {
                googleApiKey: GEMINI_API_KEY, // Use Gemini API key for potential Google services
                googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID
            });
            console.log(`🌐 Grounding: ${groundingResults.success ? groundingResults.results.length + ' results' : 'no results'} from ${groundingResults.source}`);
        } catch (groundingError) {
            console.log('⚠️ Grounding failed (continuing without):', groundingError.message);
        }

        // Prepare enhanced prompt with knowledge base AND grounding
        let enhancedPrompt = message;

        // Build context sections
        let contextSections = [];

        if (context.length > 0) {
            contextSections.push(`KNOWLEDGE BASE INFORMATION:
${context.map(item => `- ${item}`).join('\n')}`);
        }

        if (groundingResults.success && groundingResults.results.length > 0) {
            // Format grounding results with prominent URLs
            const formattedResults = groundingResults.results.slice(0, 5).map(r => {
                return `📎 PAGE: ${r.title}
   🔗 URL: ${r.link}
   📝 SNIPPET: ${r.snippet ? r.snippet.substring(0, 150) : 'Visit this page for more information'}`;
            }).join('\n\n');

            contextSections.push(`TALLMAN EQUIPMENT WEBSITE CATALOG LINKS (YOU MUST USE THESE URLs IN YOUR RESPONSE):
${formattedResults}

⚠️ IMPORTANT: Copy and paste the exact URLs above into your response as markdown links like: [Page Title](URL)`);
        }

        if (contextSections.length > 0) {
            enhancedPrompt = `You are a Tallman Equipment sales and support assistant. Your responses should help customers find and purchase equipment.

${contextSections.join('\n\n')}

CUSTOMER QUESTION: ${message}

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:
1. If ANY website URL from tallmanequipment.com is provided above that relates to the customer's question, you MUST include that link in your response
2. Format ALL links as clickable markdown: [Descriptive Text](https://www.tallmanequipment.com/...)
3. When discussing equipment types (bucket trucks, digger derricks, aerial lifts, etc.), ALWAYS include the catalog link
4. When discussing services (rentals, repairs, parts), ALWAYS include the relevant service page link
5. End your response with a clear call-to-action directing the customer to visit the specific page for more details or to make a purchase
6. If multiple relevant links are available, include ALL of them organized by category

EXAMPLE FORMAT:
"For bucket trucks, you can browse our full selection at [Bucket Trucks Catalog](https://www.tallmanequipment.com/equipment/bucket-trucks). 
To discuss rentals, visit our [Rental Services](https://www.tallmanequipment.com/rentals) page."

YOUR RESPONSE (remember to include website links):`;
        } else {
            // Even without grounding results, encourage linking to the main site
            enhancedPrompt = `You are a Tallman Equipment sales and support assistant. 

CUSTOMER QUESTION: ${message}

INSTRUCTIONS:
1. Answer helpfully and professionally as a Tallman Equipment representative
2. When appropriate, direct customers to visit https://www.tallmanequipment.com for more information
3. For equipment inquiries, suggest visiting the catalog at https://www.tallmanequipment.com/equipment
4. For rental inquiries, direct to https://www.tallmanequipment.com/rentals
5. For service/parts inquiries, direct to https://www.tallmanequipment.com/services
6. For contact information, direct to https://www.tallmanequipment.com/contact

YOUR RESPONSE:`;
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

        // Enhance response with grounding links if not already included
        if (groundingResults.success && !aiResponse.includes('tallmanequipment.com')) {
            aiResponse = enhanceResponseWithLinks(aiResponse, groundingResults.results);
        }

        // Return the AI response
        res.json({
            response: aiResponse,
            context: context.length > 0 ? context.slice(0, 3) : null,
            grounding: groundingResults.success ? {
                source: groundingResults.source,
                links: groundingResults.results.slice(0, 3).map(r => ({ title: r.title, url: r.link }))
            } : null,
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

        // Get context from knowledge base
        const context = await knowledgeService.retrieveContext(message);

        // Ground the query with web search for Tallman Equipment info
        let groundingResults = { success: false, results: [], context: '' };
        try {
            // Extract actual question if it's an enhanced prompt from frontend
            let groundingQuery = message;
            if (message.includes('Question: ')) {
                groundingQuery = message.split('Question: ').pop().trim();
            }

            groundingResults = await groundQuery(groundingQuery, {
                googleApiKey: GEMINI_API_KEY,
                googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID
            });
            console.log(`🌐 Stream Grounding: ${groundingResults.success ? groundingResults.results.length + ' results' : 'no results'}`);
        } catch (groundingError) {
            console.log('⚠️ Stream grounding failed:', groundingError.message);
        }

        // Build enhanced prompt with knowledge base AND grounding
        let enhancedPrompt = message;
        let contextSections = [];

        if (context.length > 0) {
            contextSections.push(`KNOWLEDGE BASE:
${context.map(item => `- ${item}`).join('\n')}`);
        }

        if (groundingResults.success && groundingResults.results.length > 0) {
            const formattedResults = groundingResults.results.slice(0, 5).map(r =>
                `📎 ${r.title}\n   🔗 URL: ${r.link}`
            ).join('\n\n');

            contextSections.push(`WEBSITE CATALOG LINKS (INCLUDE THESE IN YOUR RESPONSE):
${formattedResults}`);
        }

        if (contextSections.length > 0) {
            enhancedPrompt = `You are a Tallman Equipment sales assistant. Help customers find and purchase equipment.

${contextSections.join('\n\n')}

CUSTOMER QUESTION: ${message}

CRITICAL INSTRUCTIONS:
1. You MUST include any tallmanequipment.com URLs provided above in your response
2. Format links as: [Description](URL)
3. Always include catalog links when discussing equipment
4. End with a call-to-action to visit the relevant page

YOUR RESPONSE (include website links):`;
        } else {
            enhancedPrompt = `You are a Tallman Equipment sales assistant.

CUSTOMER QUESTION: ${message}

INSTRUCTIONS:
1. Answer as a Tallman Equipment representative
2. Direct to https://www.tallmanequipment.com for equipment browsing
3. Direct to https://www.tallmanequipment.com/contact for inquiries

YOUR RESPONSE:`;
        }

        // Use LLM with fallback
        const llmResult = await callLLMWithFallback(enhancedPrompt, { stream: false });

        let aiResponse;
        if (llmResult.success) {
            if (llmResult.source === 'ollama') {
                const data = await llmResult.response.json();
                aiResponse = data.response;
            } else {
                aiResponse = llmResult.response.text || 'No response from LLM';
            }
        } else {
            aiResponse = llmResult.fallbackMessage;
        }

        // Enhance response with grounding links if not already included
        if (groundingResults.success && !aiResponse.includes('tallmanequipment.com')) {
            aiResponse = enhanceResponseWithLinks(aiResponse, groundingResults.results);
        }

        // For streaming, return the complete response as SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`data: ${JSON.stringify({
            response: aiResponse,
            done: true,
            grounding: groundingResults.success ? groundingResults.source : null,
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
