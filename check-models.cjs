const fetch = require('node-fetch');

async function checkModels() {
    try {
        const response = await fetch('http://10.10.20.24:11434/api/tags');
        if (response.ok) {
            const data = await response.json();
            console.log('Available models:', JSON.stringify(data, null, 2));
        } else {
            console.log('Error:', response.status, await response.text());
        }
    } catch (error) {
        console.log('Connection error:', error.message);
    }
}

checkModels();