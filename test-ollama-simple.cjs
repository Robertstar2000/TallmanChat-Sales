const fetch = require('node-fetch');

const OLLAMA_HOST = '10.10.20.24';
const OLLAMA_API_URL = `http://${OLLAMA_HOST}:11434/api/generate`;

async function testOllama() {
    console.log('Testing Ollama connection...');
    console.log('URL:', OLLAMA_API_URL);
    
    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.1:8b',
                prompt: 'Hello, how are you?',
                stream: false
            })
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Ollama working! Response:', data.response);
        } else {
            const errorText = await response.text();
            console.log('❌ Ollama error:', response.status, errorText);
        }
    } catch (error) {
        console.log('❌ Connection error:', error.message);
    }
}

testOllama();