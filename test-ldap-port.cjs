const net = require('net');

const HOST = '10.10.20.253';
const PORT = 389;
const TIMEOUT = 5000; // 5 seconds

console.log(`Attempting to connect to LDAP server at ${HOST}:${PORT}...`);

const socket = new net.Socket();

socket.setTimeout(TIMEOUT);

socket.connect(PORT, HOST, () => {
  console.log(`✅ SUCCESS: Connection to ${HOST}:${PORT} was successful.`);
  console.log('This means there is no firewall blocking the connection.');
  socket.destroy();
});

socket.on('error', (err) => {
  console.error(`❌ FAILED: Could not connect to ${HOST}:${PORT}.`);
  console.error(`   Error: ${err.message}`);
  if (err.code === 'ECONNREFUSED') {
    console.error('   Diagnosis: The server is reachable, but it actively refused the connection. The LDAP service might not be running on that server.');
  } else if (err.code === 'ETIMEDOUT' || err.code === 'EHOSTUNREACH') {
    console.error('   Diagnosis: The connection timed out. This is likely due to a firewall on the server, on this machine, or on the network between them, blocking the connection.');
  }
  socket.destroy();
});

socket.on('timeout', () => {
  console.error(`❌ FAILED: Connection to ${HOST}:${PORT} timed out after ${TIMEOUT / 1000} seconds.`);
  console.error('   Diagnosis: This is likely due to a firewall on the server, on this machine, or on the network between them, blocking the connection.');
  socket.destroy();
});
