console.log('🧪 Starting Basic LDAP Authentication Test\n');

const ldap = require('ldapjs');

const AD_CONFIG = {
    server: '10.10.20.253',
    port: 389
};

const credentials = {
    username: 'Tallman\\BobM',
    password: 'Rm2214ri#'
};

console.log(`Testing server: ${AD_CONFIG.server}:${AD_CONFIG.port}`);
console.log(`Testing credentials: ${credentials.username}`);
console.log(`Password length: ${credentials.password.length}`);
console.log('');

try {
    console.log('🔌 Creating LDAP client...');
    const client = ldap.createClient({
        url: `ldap://${AD_CONFIG.server}:${AD_CONFIG.port}`,
        timeout: 10000,
        connectTimeout: 5000,
    });

    console.log('✅ Client created. Attempting bind...');

    client.bind(credentials.username, credentials.password, (bindErr) => {
        if (bindErr) {
            console.log('❌ AUTHENTICATION FAILED');
            console.log(`LDAP Error Code: ${bindErr.code}`);
            console.log(`LDAP Error Name: ${bindErr.name}`);
            console.log(`Error Message: "${bindErr.message}"`);

            if (bindErr.code === 49) {
                console.log('\n👤 Error 49: Invalid Credentials');
                console.log('Possible causes:');
                console.log('- Wrong username or password');
                console.log('- Username format incorrect');
                console.log('- Domain case sensitivity issues');
            }

            client.destroy();
            process.exit(1);
            return;
        }

        console.log('✅ AUTHENTICATION SUCCESS!');
        console.log(`✅ Credentials "${credentials.username}" are VALID`);
        console.log('✅ User can authenticate to Active Directory');

        client.destroy();
        process.exit(0);
    });

    // Timeout handling
    setTimeout(() => {
        console.log('⏰ BIND OPERATION TIMED OUT');
        console.log('Possible causes:');
        console.log('- Active Directory server unreachable');
        console.log('- Network/firewall blocking LDAP');
        console.log('- Wrong server address or port');
        client.destroy();
        process.exit(2);
    }, 10000);

} catch (error) {
    console.log('🔴 FATAL ERROR creating LDAP client:');
    console.log(error.message);
    console.log('\nPossible causes:');
    console.log('- ldapjs library not installed');
    console.log('- Script syntax error');
    console.log('- Node.js runtime issue');
    process.exit(3);
}
