const ldap = require('ldapjs');

// --- Configuration ---
const LDAP_SERVER_URL = 'ldap://10.10.20.253:389';
const BIND_DN = 'CN=BobM,OU=Users,DC=Tallman,DC=local'; // This might need adjustment based on your AD structure
const PASSWORD = 'Rm2214ri#'; // User's password
const AD_ACCESS_PASSWORD = 'ebGGAm77kk'; // Active Directory access password (used for binding as a service account if needed)

console.log(`Attempting LDAP authentication for user: ${BIND_DN}`);
console.log(`Using LDAP server: ${LDAP_SERVER_URL}`);

const client = ldap.createClient({
  url: LDAP_SERVER_URL
});

client.on('error', (err) => {
  console.error('LDAP Client Error:', err.message);
  client.destroy();
  process.exit(1);
});

async function testLdapAuthentication() {
  try {
    console.log(`Step 1: Attempting to bind as user: ${BIND_DN}`);
    await client.bind(BIND_DN, PASSWORD);
    console.log('✅ SUCCESS: LDAP authentication successful!');
  } catch (err) {
    console.error(`❌ FAILED: LDAP authentication failed for user ${BIND_DN}.`);
    console.error('Error details:', err.message);
    if (err.name === 'InvalidCredentialsError') {
      console.error('This usually means the username or password was incorrect.');
    } else if (err.name === 'NoSuchObjectError') {
      console.error('This might mean the BIND_DN is incorrect (user not found).');
    }
  } finally {
    console.log('Step 2: Unbinding from LDAP server...');
    client.unbind(() => {
      console.log('Client unbound.');
    });
    client.destroy();
    console.log('LDAP client destroyed.');
  }
}

testLdapAuthentication();