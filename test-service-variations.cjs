console.log('🧪 Testing Service Account Variations\n');

const ldap = require('ldapjs');

const config = {
    server: '10.10.20.253',
    port: 389,
    baseDN: 'DC=Tallman,DC=com'
};

const variations = [
    {
        description: 'Original: CN=LDAP,DC=Tallman,DC=com',
        bindDN: 'CN=LDAP,DC=Tallman,DC=com',
        password: 'ebGGAm77kk'
    },
    {
        description: 'Lowercase domain: CN=LDAP,DC=tallman,DC=com',
        bindDN: 'CN=LDAP,DC=tallman,DC=com',
        password: 'ebGGAm77kk'
    },
    {
        description: 'UPN format: LDAP@Tallman.com',
        bindDN: 'LDAP@Tallman.com',
        password: 'ebGGAm77kk'
    },
    {
        description: 'Domain\\Username: Tallman\\LDAP',
        bindDN: 'Tallman\\LDAP',
        password: 'ebGGAm77kk'
    },
    {
        description: 'Different case: CN=ldap,DC=Tallman,DC=com',
        bindDN: 'CN=ldap,DC=Tallman,DC=com',
        password: 'ebGGAm77kk'
    },
    {
        description: 'Full domain case: CN=LDAP,DC=TALLMAN,DC=COM',
        bindDN: 'CN=LDAP,DC=TALLMAN,DC=COM',
        password: 'ebGGAm77kk'
    }
];

async function testVariation(index) {
    if (index >= variations.length) {
        console.log('\n🏁 All variations tested. None worked.');
        console.log('Need correct service account credentials from AD administrator.');
        process.exit(1);
    }

    const variation = variations[index];
    console.log(`\n🧪 Testing variation ${index + 1}/${variations.length}:`);
    console.log(`Description: ${variation.description}`);
    console.log(`Bind DN: ${variation.bindDN}`);
    console.log('Password: [8 chars]');

    try {
        const client = ldap.createClient({
            url: `ldap://${config.server}:${config.port}`,
            timeout: 10000,
            connectTimeout: 5000,
        });

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.log('❌ TIMEOUT - No response from server');
                client.destroy();
                resolve();
            }, 10000);

            client.bind(variation.bindDN, variation.password, (bindErr) => {
                clearTimeout(timeout);

                if (bindErr) {
                    console.log(`❌ FAILED: ${bindErr.message}`);
                    client.destroy();
                    resolve();
                    return;
                }

                console.log('✅ SUCCESS! Service account authenticated.');

                // Test search capability
                client.search(config.baseDN, {
                    filter: '(sAMAccountName=BobM)',
                    scope: 'sub',
                    attributes: ['cn']
                }, (searchErr, searchRes) => {
                    if (searchErr) {
                        console.log(`❌ Search test failed: ${searchErr.message}`);
                        client.destroy();
                        resolve();
                        return;
                    }

                    let foundUser = false;

                    searchRes.on('searchEntry', (entry) => {
                        foundUser = true;
                        console.log('✅ Search also works! Found BobM user.');
                    });

                    searchRes.on('end', () => {
                        if (foundUser) {
                            console.log('✅ Search also works! Found BobM user.');
                        } else {
                            console.log('✅ Search works (user not found, but that\'s expected)');
                        }
                        client.destroy();
                        console.log('\n🎉 FOUND WORKING SERVICE ACCOUNT!');
                        console.log(`Bind DN: ${variation.bindDN}`);
                        console.log('Update your LDAP server configuration with these credentials.');
                        process.exit(0);
                    });
                });
            });
        }).then(() => testVariation(index + 1));

    } catch (error) {
        console.log(`🔴 Fatal error: ${error.message}`);
        return testVariation(index + 1);
    }
}

console.log(`Testing against server: ${config.server}:${config.port}`);
testVariation(0);
