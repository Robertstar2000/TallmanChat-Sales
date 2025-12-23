console.log('🧪 Testing LDAP Service Account Binding\n');

const ldap = require('ldapjs');

const AD_CONFIG = {
    server: '10.10.20.253',
    port: 389,
    baseDN: 'DC=Tallman,DC=com',
    bindDN: 'LDAP@Tallman.com',
    bindPassword: 'ebGGAm77kk',
};

console.log(`Testing service account binding...`);
console.log(`Server: ${AD_CONFIG.server}:${AD_CONFIG.port}`);
console.log(`Bind DN: ${AD_CONFIG.bindDN}`);
console.log(`Base DN: ${AD_CONFIG.baseDN}`);
console.log('');

try {
    console.log('🔌 Creating LDAP client...');
    const client = ldap.createClient({
        url: `ldap://${AD_CONFIG.server}:${AD_CONFIG.port}`,
        timeout: 10000,
        connectTimeout: 5000,
    });

    console.log('🔐 Attempting service account bind...');

    client.bind(AD_CONFIG.bindDN, AD_CONFIG.bindPassword, (bindErr) => {
        if (bindErr) {
            console.log('❌ SERVICE ACCOUNT BIND FAILED');
            console.log(`LDAP Error Code: ${bindErr.code}`);
            console.log(`LDAP Error Name: ${bindErr.name}`);
            console.log(`Error Message: "${bindErr.message}"`);

            if (bindErr.code === 49) {
                console.log('\n🔑 Error 49: Invalid Credentials');
                console.log('The service account credentials are incorrect.');
            }

            client.destroy();
            process.exit(1);
            return;
        }

        console.log('✅ SERVICE ACCOUNT BIND SUCCESS!');
        console.log('✅ Service account can authenticate to Active Directory');

        client.destroy();
        process.exit(0);
    });

    // Timeout handling
    setTimeout(() => {
        console.log('⏰ SERVICE ACCOUNT BIND TIMED OUT');
        console.log('Possible causes:');
        console.log('- Active Directory server unreachable');
        console.log('- Network/firewall blocking LDAP');
        console.log('- Wrong server address');
        console.log('- Service account locked or disabled');
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
