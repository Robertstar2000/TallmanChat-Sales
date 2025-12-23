// Test the authentication endpoint directly using built-in http
const http = require('http');

const testAuthentication = () => {
    console.log('Testing LDAP authentication endpoint...');

    const postData = JSON.stringify({
        username: 'tallman\\BobM',
        password: 'Rm2214ri#'
    });

    const options = {
        hostname: 'localhost',
        port: 3100,
        path: '/api/ldap-auth',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);

        res.setEncoding('utf8');
        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });
        res.on('end', () => {
            console.log('Response body:', body);
            try {
                const jsonResponse = JSON.parse(body);
                console.log('Parsed response:', jsonResponse);
            } catch (e) {
                console.error('Failed to parse JSON:', e);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Request error:', e);
    });

    req.write(postData);
    req.end();
};

testAuthentication();
