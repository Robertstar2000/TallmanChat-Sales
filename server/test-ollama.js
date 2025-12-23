#!/usr/bin/env node
/**
 * Test script to verify Ollama connection and get a response from llama3.1:8b
 * Usage: node test-ollama.js
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://10.10.20.24:11434';

async function manageOllamaModels() {
    console.log('🔧 Ollama Model Management');
    console.log(`🏠 Server: ${OLLAMA_HOST}`);
    console.log('');

    try {
        // Step 1: Check current models
        console.log('📋 Checking current models...');
        const modelsResponse = await fetch(`${OLLAMA_HOST}/api/tags`);
        if (!modelsResponse.ok) {
            throw new Error(`Failed to get models: ${modelsResponse.status} ${modelsResponse.statusText}`);
        }

        const modelsData = await modelsResponse.json();
        const availableModels = modelsData.models.map(m => m.name);
        console.log(`✅ Current models: ${availableModels.join(', ')}`);
        console.log('');

        // Step 2: Delete unwanted models
        const modelsToDelete = ['gpt-oss:120b', 'gemma3:27b'];

        for (const modelToDelete of modelsToDelete) {
            if (availableModels.includes(modelToDelete)) {
                console.log(`🗑️  Deleting ${modelToDelete}...`);
                try {
                    const deleteResponse = await fetch(`${OLLAMA_HOST}/api/delete`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: modelToDelete }),
                    });

                    if (deleteResponse.ok) {
                        console.log(`✅ Successfully deleted ${modelToDelete}`);
                    } else {
                        console.log(`⚠️  Could not delete ${modelToDelete} (might be in use)`);
                    }
                } catch (error) {
                    console.log(`❌ Error deleting ${modelToDelete}:`, error.message);
                }
            } else {
                console.log(`ℹ️  ${modelToDelete} not found, skipping deletion`);
            }
        }
        console.log('');

        // Step 3: Pull new model (most advanced Llama available)
        const modelToPull = 'llama3.3';
        console.log(`⬇️ Pulling advanced Llama model: ${modelToPull}`);
        console.log('This may take several minutes...');

        try {
            const pullResponse = await fetch(`${OLLAMA_HOST}/api/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: modelToPull }),
            });

            if (!pullResponse.ok) {
                const pullError = await pullResponse.text();
                throw new Error(`Failed to pull model: ${pullError}`);
            }

            // Process streaming pull response
            const reader = pullResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const data = JSON.parse(line);
                                if (data.status) {
                                    console.log(`Status: ${data.status}`);
                                }
                            } catch (e) {
                                // Skip malformed JSON lines
                            }
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

            console.log(`✅ Successfully pulled ${modelToPull}`);
        } catch (pullError) {
            console.log(`❌ Failed to pull ${modelToPull}:`, pullError.message);

            // Try a smaller model if the larger one fails
            console.log(`Trying smaller model: llama3.2:1b-instruct-fp16`);
            try {
                const smallPullResponse = await fetch(`${OLLAMA_HOST}/api/pull`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'llama3.2:1b-instruct-fp16' }),
                });

                if (smallPullResponse.ok) {
                    console.log(`✅ Successfully pulled llama3.2:1b-instruct-fp16`);
                }
            } catch (smallError) {
                console.log(`❌ Failed to pull small model too:`, smallError.message);
            }
        }

        // Step 4: Verify final models
        console.log('');
        console.log('📋 Verifying final model list...');
        const finalResponse = await fetch(`${OLLAMA_HOST}/api/tags`);
        if (finalResponse.ok) {
            const finalData = await finalResponse.json();
            const finalModels = finalData.models.map(m => m.name);
            console.log(`✅ Final models: ${finalModels.join(', ')}`);
        }

        console.log('');
        console.log('🎉 Ollama model management completed!');

    } catch (error) {
        console.error('❌ Ollama model management failed:');
        console.error(error.message);
        process.exit(1);
    }
}

// Run the management script
manageOllamaModels().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});
