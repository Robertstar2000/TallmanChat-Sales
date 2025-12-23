const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3100,
  path: '/api/ldap-test',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response:');
    try {
      // Try to parse and print nicely
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      // Otherwise, print raw
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error making request:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.error('Connection refused. Is the ldap-auth service running on port 3100?');
  }
});

req.end();
