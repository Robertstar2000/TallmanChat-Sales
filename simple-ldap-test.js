// Simple direct LDAP test that writes results to file
const ldap = require('ldapjs');
const fs = require('fs');

// Test the specified credentials directly
const credentials = {
    username: 'Tallman\\BobM',
    password: 'Rm2214ri#'
};

const config = {
    server: '10.10.20.253',
    port: 389
};

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);

    try {
        fs.appendFileSync('ad-test-result.log', logMessage);
    } catch (e) {
        // Ignore file write errors
    }
}

function testCredentials() {
    console.log('Starting simple AD test...');
    log('===== DIRECT ACTIVE DIRECTORY TEST =====');
    log(`Testing server: ${config.server}:${config.port}`);
    log(`Testing credentials: ${credentials.username}`);
    log('========================================');

    try {
        const client = ldap.createClient({
            url: `ldap://${config.server}:${config.port}`,
            timeout: 10000,
            connectTimeout: 5000,
        });

        log('Client created, attempting bind...');

        let completed = false;
        const timeout = setTimeout(() => {
            if (!completed) {
                log('ERROR: Bind timed out after 10 seconds');
                client.destroy();
            }
        }, 10000);

        client.bind(credentials.username, credentials.password, (bindErr) => {
            completed = true;
            clearTimeout(timeout);

            if (bindErr) {
                log('RESULT: AUTHENTICATION FAILED');
                log(`LDAP Error Code: ${bindErr.code}`);
                log(`LDAP Error Name: ${bindErr.name}`);
                log(`Error Message: ${bindErr.message}`);
                log('========================================');
                return;
            }

            log('RESULT: AUTHENTICATION SUCCESS!');
            log(`Credentials ${credentials.username} are VALID`);
            log('========================================');
            client.destroy();
        });

    } catch (error) {
        log(`FATAL ERROR: ${error.message}`);
        log('========================================');
    }
}

testCredentials();
