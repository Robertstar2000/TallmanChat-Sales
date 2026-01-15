#!/usr/bin/env node
/**
 * Granite AI API Bridge
 * Provides OpenAI-compatible API for Docker AI granite model
 */

const express = require('express');
const { spawn } = require('child_process');
const app = express();

app.use(express.json());

const GRANITE_MODEL = 'ai/granite-4.0-nano:latest';

// Simple in-memory cache for conversations
const conversations = new Map();

app.post('/v1/chat/completions', async (req, res) => {
    try {
        const { messages, model, stream = false, max_tokens = 1000 } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // Get the last user message
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.role !== 'user') {
            return res.status(400).json({ error: 'Last message must be from user' });
        }

        const prompt = lastMessage.content;

        // Run the granite model using host docker
        const result = await runGraniteModel(prompt);

        const response = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model || 'granite-4.0-nano',
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: result
                },
                finish_reason: 'stop'
            }],
            usage: {
                prompt_tokens: prompt.split(' ').length,
                completion_tokens: result.split(' ').length,
                total_tokens: prompt.split(' ').length + result.split(' ').length
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Granite API error:', error);
        res.status(500).json({
            error: {
                message: 'Failed to get response from granite model',
                type: 'internal_error'
            }
        });
    }
});

async function runGraniteModel(prompt) {
    return new Promise((resolve, reject) => {
        // Prepare the docker command using docker binary
        const dockerProcess = spawn('docker', ['model', 'run', GRANITE_MODEL], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        // Send the prompt
        dockerProcess.stdin.write(prompt + '\n');
        // Exit immediately after getting response
        setTimeout(() => {
            dockerProcess.stdin.write('/exit\n');
        }, 1000);

        dockerProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        dockerProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        dockerProcess.on('close', (code) => {
            if (code === 0 || output.trim()) {
                // Extract the response (remove the prompt echo)
                const lines = output.split('\n');
                const responseLines = lines.filter(line =>
                    !line.includes('>') &&
                    !line.includes('Send a message') &&
                    line.trim() &&
                    !line.includes('Use /? for help')
                );

                resolve(responseLines.join('\n').trim() || 'I apologize, but I could not generate a response.');
            } else {
                reject(new Error(`Docker model process failed: ${errorOutput}`));
            }
        });

        dockerProcess.on('error', (error) => {
            reject(error);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            dockerProcess.kill();
            reject(new Error('Granite model request timed out'));
        }, 30000);
    });
}

const PORT = process.env.GRANITE_API_PORT || 12435;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🪨 Granite AI API Bridge running on port ${PORT}`);
    console.log(`🤖 Serving model: ${GRANITE_MODEL}`);
});

module.exports = app;
