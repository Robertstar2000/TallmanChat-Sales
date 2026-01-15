#!/usr/bin/env node
/**
 * Test script for Gemini and Granite LLMs
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load environment variables
if (fs.existsSync('.env')) {
    require('dotenv').config({ path: '.env' });
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGemini() {
    console.log('🧪 Testing Gemini API...');

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' }); // Try gemini-pro first

        const result = await model.generateContent('Hello, explain AI in one sentence.');
        const response = result.response;
        const text = response.text();

        console.log('✅ Gemini Success:', text);
        return true;
    } catch (error) {
        console.error('❌ Gemini Error:', error.message);

        // Try alternative models
        const modelsToTry = ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
        for (const modelName of modelsToTry) {
            try {
                console.log(`🔄 Trying Gemini model: ${modelName}`);
                const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: modelName });

                const result = await model.generateContent('Hello, explain AI in one sentence.');
                const response = result.response;
                const text = response.text();

                console.log(`✅ Gemini ${modelName} Success:`, text);
                return true;
            } catch (modelError) {
                console.error(`❌ Gemini ${modelName} Error:`, modelError.message);
            }
        }
        return false;
    }
}

async function testGranite() {
    console.log('🧪 Testing Granite API...');

    return new Promise((resolve) => {
        const dockerProcess = spawn('docker', ['model', 'run', 'ai/granite-4.0-nano:latest'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        // Send a test prompt
        dockerProcess.stdin.write('Hello, what is AI?\n');

        // Exit after a short time
        setTimeout(() => {
            dockerProcess.stdin.write('/exit\n');
        }, 2000);

        dockerProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        dockerProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        dockerProcess.on('close', (code) => {
            console.log('Docker exit code:', code);
            console.log('Output:', output);
            console.log('Errors:', errorOutput);

            if (output.trim()) {
                // Extract response
                const lines = output.split('\n');
                const responseLines = lines.filter(line =>
                    !line.includes('>') &&
                    !line.includes('Send a message') &&
                    line.trim() &&
                    !line.includes('Use /? for help')
                );

                const response = responseLines.join('\n').trim();
                if (response) {
                    console.log('✅ Granite Success:', response);
                    resolve(true);
                } else {
                    console.log('⚠️ Granite returned empty response');
                    resolve(false);
                }
            } else {
                console.log('❌ Granite failed - no output');
                resolve(false);
            }
        });

        dockerProcess.on('error', (error) => {
            console.error('❌ Granite Docker Error:', error.message);
            resolve(false);
        });

        // Timeout
        setTimeout(() => {
            dockerProcess.kill();
            console.log('❌ Granite timed out');
            resolve(false);
        }, 45000);
    });
}

async function main() {
    console.log('🚀 Starting LLM Tests...\n');

    const geminiResult = await testGemini();
    console.log();

    const graniteResult = await testGranite();
    console.log();

    console.log('📊 Test Results:');
    console.log('Gemini:', geminiResult ? '✅ Working' : '❌ Failed');
    console.log('Granite:', graniteResult ? '✅ Working' : '❌ Failed');

    if (geminiResult && graniteResult) {
        console.log('\n🎉 Both LLMs are working!');
    } else {
        console.log('\n⚠️ Some LLMs failed - check configurations');
    }
}

main().catch(console.error);
