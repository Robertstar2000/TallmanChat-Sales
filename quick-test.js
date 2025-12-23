#!/usr/bin/env node

/**
 * Quick LDAP Module Test
 */

console.log('🚀 Starting quick test...');

try {
    console.log('📦 Loading ldapjs module...');
    const ldap = require('ldapjs');
    console.log('✅ ldapjs module loaded successfully');

    console.log('🔧 Creating LDAP client...');
    const client = ldap.createClient({
        url: 'ldap://dc02.tallman.com:389',
        timeout: 5000,
    });

    console.log('📡 Testing connection...');

    client.on('error', (err) => {
        console.log('❌ Connection error:', err.message);
        process.exit(1);
    });

    client.bind('CN=LDAP,DC=tallman,DC=com', 'ebGGAm77kk', (err) => {
        if (err) {
            console.log('❌ Bind error:', err.message);
            process.exit(1);
        } else {
            console.log('✅ Bind successful!');
            client.destroy();
            process.exit(0);
        }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
        console.log('⏰ Test timed out');
        client.destroy();
        process.exit(1);
    }, 10000);

} catch (error) {
    console.log('❌ Module load error:', error.message);
    process.exit(1);
}
