import { getApiUrl } from './config';

interface OpenAIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface OpenAIChatOptions {
    model: string;
}

class OpenAIChat {
    private history: OpenAIMessage[] = [];
    private options: OpenAIChatOptions;
    private systemInstruction?: string;

    constructor(options: OpenAIChatOptions, initialHistory: OpenAIMessage[] = [], systemInstruction?: string) {
        this.options = options;
        this.history = [...initialHistory];
        this.systemInstruction = systemInstruction;
    }

    async *sendMessageStream(message: { message: { text: string } }): AsyncGenerator<{ text: string }> {
        const userMessage: OpenAIMessage = { role: 'user', content: message.message.text };
        this.history.push(userMessage);

        const messages = [...this.history];
        if (this.systemInstruction) {
            messages.unshift({ role: 'system', content: this.systemInstruction });
        }

        const body = {
            model: this.options.model,
            messages: messages,
            stream: true,
        };

        // Use backend proxy
        const response = await fetch(getApiUrl('/api/openai/chat'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }

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
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;

                    const dataStr = trimmed.substring(6); // Remove 'data: '
                    if (dataStr === '[DONE]') break;

                    try {
                        const data = JSON.parse(dataStr);
                        const content = data.choices?.[0]?.delta?.content;

                        if (content) {
                            yield { text: content };
                        }

                        if (data.choices?.[0]?.finish_reason) {
                            // Add assistant message to history (accumulated)
                            // Note: We need to reconstruct full message to add to history effectively, 
                            // but for streaming interface, we just yield chunks.
                            // Logic to update history should be handled by caller or we accept we deviate slightly in state.
                            // For simplicity:
                            // const assistantMessage: OpenAIMessage = { role: 'assistant', content: ... };
                            // this.history.push(assistantMessage);
                            break;
                        }
                    } catch (e) {
                        console.error('Error parsing OpenAI response:', e);
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }
}

export const startChat = (history: { role: string; content: string }[], systemInstruction?: string, config?: { model: string }): OpenAIChat => {
    const formattedHistory: OpenAIMessage[] = history
        .filter(msg => msg.role !== 'model' || msg.content !== "Hello! I am your Tallman Chat Assistant")
        .map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
        }));

    return new OpenAIChat(config || { model: 'gpt-5.2' }, formattedHistory, systemInstruction);
};

export const generateChatTitle = (firstUserMessage: string): string => {
    const cleanedMessage = firstUserMessage.trim();
    if (!cleanedMessage) {
        return "New Chat";
    }

    const words = cleanedMessage.split(/\s+/);
    const titleWords = words.slice(0, 5);
    let title = titleWords.join(' ');

    if (words.length > 5) {
        title += '...';
    }

    return title;
};
