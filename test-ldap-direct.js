const express = require('express');
const ldap = require('ldapjs');

// Simple direct LDAP test
const testLDAP = async () => {
    const client = ldap.createClient({
        url: `ldap://10.10.20.253:389`,
        timeout: 10000,
        connectTimeout: 10000,
    });

    console.log('Testing direct LDAP connection...');

    // Handle client errors
    client.on('error', (err) => {
        console.error('LDAP client error:', err);
    });

    try {
        // First bind with service account
        await new Promise((resolve, reject) => {
            client.bind('LDAP@tallman.com', 'ebGGAm77kk', (bindErr) => {
                if (bindErr) {
                    console.error('Service account bind failed:', bindErr);
                    reject(bindErr);
                    return;
                }
                console.log('Service account bind successful');
                resolve();
            });
        });

        // Search for all users first to see what's available
        const searchOptions = {
            filter: '(objectClass=user)',
            scope: 'sub',
            attributes: ['cn', 'memberOf', 'dn', 'userPrincipalName', 'sAMAccountName'],
        };

        console.log('Searching for ALL users in directory...');

        await new Promise((resolve, reject) => {
            client.search('DC=tallman,DC=com', searchOptions, (searchErr, searchRes) => {
                if (searchErr) {
                    console.error('All users search error:', searchErr);
                    reject(searchErr);
                    return;
                }

                let userCount = 0;
                searchRes.on('searchEntry', (entry) => {
                    userCount++;
                    console.log(`USER ${userCount}:`, {
                        sAMAccountName: entry.object.sAMAccountName,
                        cn: entry.object.cn,
                        userPrincipalName: entry.object.userPrincipalName,
                        dn: entry.dn.toString()
                    });
                });

                searchRes.on('error', (err) => {
                    console.error('Search result error:', err);
                    reject(err);
                });

                searchRes.on('end', () => {
                    console.log(`Total users found: ${userCount}`);
                    resolve();
                });
            });
        });

        // Now search specifically for "BobM" users
        const bobSearchOptions = {
            filter: '(sAMAccountName=BobM)',
            scope: 'sub',
            attributes: ['cn', 'memberOf', 'dn', 'userPrincipalName', 'sAMAccountName'],
        };

        console.log('Searching for BobM with filter:', bobSearchOptions.filter);

        const searchResult = await new Promise((resolve, reject) => {
            client.search('DC=tallman,DC=com', bobSearchOptions, (searchErr, searchRes) => {
                if (searchErr) {
                    console.error('Search error:', searchErr);
                    reject(searchErr);
                    return;
                }

                let found = false;
                searchRes.on('searchEntry', (entry) => {
                    found = true;
                    console.log('FOUND USER:', {
                        dn: entry.dn.toString(),
                        cn: entry.object.cn,
                        sAMAccountName: entry.object.sAMAccountName,
                        userPrincipalName: entry.object.userPrincipalName,
                        memberOf: entry.object.memberOf
                    });
                });

                searchRes.on('error', (err) => {
                    console.error('Search result error:', err);
                    reject(err);
                });

                searchRes.on('end', () => {
                    console.log('Search ended, user found:', found);
                    resolve(found);
                });
            });
        });

        if (searchResult) {
            console.log('User BobM exists in LDAP!');
        } else {
            console.log('User BobM NOT found in LDAP');
        }

    } catch (error) {
        console.error('LDAP test error:', error);
    } finally {
        client.destroy();
    }
};

// Run the test
testLDAP().then(() => {
    console.log('LDAP test completed');
    process.exit(0);
}).catch((err) => {
    console.error('LDAP test failed:', err);
    process.exit(1);
});
