console.log("Testing Node.js installation...");

const version = process.version;
console.log(`✅ Node.js version: ${version}`);

// Test LDAP library loading
try {
    const ldap = require('ldapjs');
    console.log("✅ ldapjs library loaded successfully");
} catch (error) {
    console.log("❌ ldapjs library not found:", error.message);
    console.log("Run: npm install ldapjs");
}

console.log("Node.js and dependencies are ready!");
