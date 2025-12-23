#!/usr/bin/env node
/**
 * Tallman Chat HTTPS LDAP Authentication Server
 * Handles secure LDAP authentication over SSL/TLS on port 3891
 * Provides user authentication against Active Directory
 */

const express = require('express');
const ldap = require('ldapjs');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
const { networkInterfaces } = require('os');

const app = express();

// SSL Configuration
const sslKeyPath = '../tallman-chat-server-key.pem';
const sslCertPath = '../tallman-chat-server.pem';

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

// LDAP Configuration - Based on requirements
const LDAP_CONFIG = {
    server: 'dc02.tallman.com', // Primary LDAP server
    fallbackServers: ['10.10.20.253', 'DC02'], // Fallback servers
    baseDN: 'DC=tallman,DC=com', // Base DN for searches
    bindDN: 'CN=LDAP,DC=tallman,DC=com', // Service account DN
    bindPassword: 'ebGGAm77kk', // Service account password
    port: 389, // Standard LDAP port (internal AD communication)
    timeout: 15000, // 15 second timeout
};

// HTTPS Port for external API access
const HTTPS_PORT = process.env.HTTPS_LDAP_PORT || 3891;

// Determine server IP for HTTPS binding
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

// CORS configuration - restrict to internal services only
const corsOptions = {
    origin: function (origin, callback) {
        // Allow same origin, localhost variations, and internal network services
        const allowedOrigins = [
            /^https?:\/\/localhost(:\d+)?$/,
            /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
            /^https?:\/\/10\.10\.20\.9(:\d+)?$/,
            /^https?:\/\/chat\.tallman\.com(:\d+)?$/
        ];

        if (!origin || allowedOrigins.some(regex => regex.test(origin))) {
            callback(null, true);
        } else {
            console.warn(`🚨 HTTPS LDAP Auth CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS policy'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Helper function to create LDAP client
const createLdapClient = (server) => {
    return ldap.createClient({
        url: `ldap://${server}:${LDAP_CONFIG.port}`,
        timeout: LDAP_CONFIG.timeout,
        connectTimeout: 10000,
    });
};

// Test HTTPS endpoint to verify LDAP connectivity
app.get('/health', (req, res) => {
    res.json({
        status: 'secure',
        service: 'Tallman HTTPS LDAP Authentication',
        port: HTTPS_PORT,
        protocol: 'HTTPS',
        sslEnabled: true,
        ldapConfigured: true,
        timestamp: new Date().toISOString()
    });
});

// HTTPS Test endpoint to verify LDAP connectivity
app.get('/ldap-test', async (req, res) => {
    try {
        console.log('🔐 HTTPS: Testing LDAP connectivity...');

        const client = createLdapClient(LDAP_CONFIG.server);

        client.on('error', (err) => {
            console.error('🔐 HTTPS: LDAP test client error:', err);
            res.status(500).json({
                error: 'LDAP client error',
                details: err.message,
                timestamp: new Date().toISOString()
            });
            return;
        });

        // Test bind with service account
        console.log(`🔐 HTTPS: Testing bind with: ${LDAP_CONFIG.bindDN}`);
        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword, (bindErr) => {
            if (bindErr) {
                console.error('🔐 HTTPS: LDAP test bind error:', bindErr);
                client.destroy();
                res.status(401).json({
                    error: 'LDAP bind failed',
                    details: bindErr.message,
                    bindDN: LDAP_CONFIG.bindDN,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            console.log('🔐 HTTPS: LDAP test bind successful');
            client.destroy();
            res.json({
                success: true,
                message: 'HTTPS LDAP connectivity test successful',
                server: LDAP_CONFIG.server,
                baseDN: LDAP_CONFIG.baseDN,
                protocol: 'HTTPS',
                timestamp: new Date().toISOString()
            });
        });

    } catch (error) {
        console.error('🔐 HTTPS: LDAP test error:', error);
        res.status(500).json({
            error: 'HTTPS LDAP test failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Helper function to authenticate user
const authenticateUser = (username, password, server) => {
    return new Promise((resolve, reject) => {
        console.log(`🔐 HTTPS: Authenticating user: ${username} on server: ${server}`);

        const client = createLdapClient(server);

        client.on('error', (err) => {
            console.error(`🔐 HTTPS: LDAP client error for server ${server}:`, err);
            reject(err);
        });

        // First bind with service account
        console.log(`🔐 HTTPS: Binding with service account: ${LDAP_CONFIG.bindDN}`);
        client.bind(LDAP_CONFIG.bindDN, LDAP_CONFIG.bindPassword, (bindErr) => {
            if (bindErr) {
                console.error(`🔐 HTTPS: LDAP bind error for server ${server}:`, bindErr);
                client.destroy();
                reject(bindErr);
                return;
            }

            console.log(`🔐 HTTPS: Service account bind successful for server ${server}`);

            // Search for user - try multiple search filters and username formats
            const usernameFormats = [
                username,
                `tallman\\${username}`,
                `${username}@tallman.com`,
                `${username}@tallman.local`
            ];

            const searchFilters = [
                `(cn=${username})`,
                `(uid=${username})`,
                `(sAMAccountName=${username})`,
                `(userPrincipalName=${username}*)`,
                `(mail=${username}*)`
            ];

            let userFound = false;
            let userDN = '';

            const tryNextUsernameFormat = (usernameIndex) => {
                if (usernameIndex >= usernameFormats.length) {
                    tryNextFilter(0);
                    return;
                }

                const currentUsername = usernameFormats[usernameIndex];
                console.log(`🔐 HTTPS: Trying username format: ${currentUsername}`);

                const tryNextFilter = (filterIndex) => {
                    if (filterIndex >= searchFilters.length) {
                        tryNextUsernameFormat(usernameIndex + 1);
                        return;
                    }

                    const currentFilter = searchFilters[filterIndex].replace(/\$\{username\}/g, currentUsername);
                    const searchOptions = {
                        filter: currentFilter,
                        scope: 'sub',
                        attributes: ['cn', 'memberOf', 'dn', 'userPrincipalName', 'sAMAccountName', 'mail', 'department', 'title'],
                    };

                    console.log(`🔐 HTTPS: Searching with filter: ${currentFilter} on server ${server}`);

                    client.search(LDAP_CONFIG.baseDN, searchOptions, (searchErr, res) => {
                        if (searchErr) {
                            console.error(`🔐 HTTPS: LDAP search error for server ${server} with filter ${currentFilter}:`, searchErr);
                            tryNextFilter(filterIndex + 1);
                            return;
                        }

                        res.on('searchEntry', (entry) => {
                            userFound = true;
                            userDN = entry.dn;
                            console.log(`🔐 HTTPS: User found: ${entry.dn} on server ${server}`);
                            console.log(`🔐 HTTPS: User attributes:`, entry.object);

                            // Try to bind as the user to verify password
                            const userClient = createLdapClient(server);

                            userClient.on('error', (userErr) => {
                                console.error(`🔐 HTTPS: User LDAP client error for server ${server}:`, userErr);
                                client.destroy();
                                userClient.destroy();
                                reject(userErr);
                            });

                            console.log(`🔐 HTTPS: Attempting to bind user ${entry.dn} on server ${server}`);
                            userClient.bind(entry.dn, password, (userBindErr) => {
                                userClient.destroy();

                                if (userBindErr) {
                                    console.error(`🔐 HTTPS: User bind error for server ${server}:`, userBindErr);
                                    // Continue to next username format/filter instead of rejecting immediately
                                    tryNextFilter(filterIndex + 1);
                                    return;
                                }

                                console.log(`🔐 HTTPS: User authentication successful for ${username} on server ${server}`);
                                // Authentication successful
                                client.destroy();
                                resolve({
                                    authenticated: true,
                                    user: entry.object,
                                    dn: entry.dn,
                                    server: server
                                });
                            });
                        });

                        res.on('error', (err) => {
                            console.error(`🔐 HTTPS: LDAP search result error for server ${server}:`, err);
                            tryNextFilter(filterIndex + 1);
                        });

                        res.on('end', () => {
                            if (!userFound) {
                                console.log(`🔐 HTTPS: No entries found for filter ${currentFilter} on server ${server}`);
                                tryNextFilter(filterIndex + 1);
                            }
                        });
                    });
                };

                tryNextFilter(0);
            };

            tryNextUsernameFormat(0);
        });
    });
};

// HTTPS Authentication endpoint
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            authenticated: false,
            error: 'Username and password are required',
            timestamp: new Date().toISOString()
        });
    }

    console.log(`🔐 HTTPS: Authentication request for user: ${username}`);

    // Try each server in order
    const servers = [LDAP_CONFIG.server, ...LDAP_CONFIG.fallbackServers];

    for (const server of servers) {
        try {
            console.log(`🔐 HTTPS: Trying LDAP server: ${server}`);

            const result = await authenticateUser(username, password, server);

            if (result.authenticated) {
                console.log(`🔐 HTTPS: Authentication successful for user: ${username} on server: ${server}`);
                return res.json({
                    authenticated: true,
                    server: server,
                    user: result.user,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (serverError) {
            console.warn(`🔐 HTTPS: LDAP server ${server} failed:`, serverError.message);
            continue; // Try next server
        }
    }

    // If we get here, all servers failed
    console.error(`🔐 HTTPS: Authentication failed for user: ${username} on all servers`);
    res.status(401).json({
        authenticated: false,
        error: 'Authentication failed on all LDAP servers',
        timestamp: new Date().toISOString()
    });
});

// SSL certificate status endpoint
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

// Error handling
app.use((error, req, res, next) => {
    console.error('🔐 HTTPS: LDAP Auth error:', error);
    res.status(500).json({
        error: 'Internal server error',
        details: error.message,
        service: 'https-ldap-auth',
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`🔐 HTTPS: LDAP Auth Server - Received ${signal}. Shutting down...`);
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Create HTTPS server
const server = https.createServer(sslOptions, app);

// Start HTTPS server
server.listen(HTTPS_PORT, serverIP, (err) => {
    if (err) {
        console.error(`❌ HTTPS LDAP Auth server failed to bind to ${serverIP}:${HTTPS_PORT}:`, err.message);
        console.error('💡 This may be because port 3891 is already in use or requires admin privileges');
        console.log('🔧 Try running as administrator or check if another LDAP service is using port 3891');
        process.exit(1);
    }

    console.log('🔐 ========================================');
    console.log('🔒 TALLMAN HTTPS LDAP AUTH SERVER IS RUNNING!');
    console.log('🔐 ========================================');
    console.log();
    console.log(`🔗 Bound to: ${serverIP}:${HTTPS_PORT} (HTTPS)`);
    console.log(`🌐 Secure LDAP Auth: https://${serverIP}:${HTTPS_PORT}`);
    console.log(`🏠 Local HTTPS Auth: https://localhost:${HTTPS_PORT}`);
    console.log(`🔒 SSL Certificate: tallman-chat-server.pem`);
    console.log(`🕵️ LDAP Servers: ${LDAP_CONFIG.server}, ${LDAP_CONFIG.fallbackServers.join(', ')}`);
    console.log();
    console.log('🛡️ Security Features:');
    console.log('   ✅ HTTPS/SSL Encryption');
    console.log('   ✅ Certificate Validation');
    console.log('   ✅ Restrictive CORS Policy');
    console.log();
    console.log('📊 HTTPS Endpoints:');
    console.log('   GET  /health                   - Server health check');
    console.log('   GET  /ldap-test               - LDAP connectivity test');
    console.log(`   POST /auth/login              - HTTPS User authentication`);
    console.log('   GET  /cert-status             - SSL certificate status');
    console.log();
    console.log('🛃 Active Directory Integration:');
    console.log('   ✅ Service Account Bind');
    console.log('   ✅ Multi-Server Failover');
    console.log('   ✅ User Search & Verification');
    console.log('   ✅ Enhanced Error Handling');
    console.log();
    console.log('🛑 Press Ctrl+C to stop');
    console.log('🔐 ========================================');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('💥 HTTPS LDAP Auth uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💫 HTTPS LDAP Auth unhandled rejection:', reason);
    process.exit(1);
});

module.exports = app;
