interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaChatOptions {
  model: string;
  host: string;
}

class OllamaChat {
  private history: OllamaMessage[] = [];
  private options: OllamaChatOptions;
  private systemInstruction?: string;

  constructor(options: OllamaChatOptions, initialHistory: OllamaMessage[] = [], systemInstruction?: string) {
    this.options = options;
    this.history = [...initialHistory];
    this.systemInstruction = systemInstruction;
  }

  async *sendMessageStream(message: { message: { text: string } }): AsyncGenerator<{ text: string }> {
    const userMessage: OllamaMessage = { role: 'user', content: message.message.text };
    this.history.push(userMessage);

    const body: any = {
      model: this.options.model,
      messages: this.history,
      stream: true,
    };
    if (this.systemInstruction) {
      body.system = this.systemInstruction;
    }
    // Use relative API path to work from any domain
    const response = await fetch('/api/ollama/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
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
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                yield { text: data.message.content };
              }
              if (data.done) {
                // Add assistant message to history
                const assistantMessage: OllamaMessage = { role: 'assistant', content: data.message?.content || '' };
                this.history.push(assistantMessage);
                break;
              }
            } catch (e) {
              console.error('Error parsing Ollama response:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const startChat = (history: { role: string; content: string }[], systemInstruction?: string, ollamaConfig?: { host: string; model: string }): OllamaChat => {
  if (!ollamaConfig) {
    throw new Error('Ollama config required');
  }

  const formattedHistory: OllamaMessage[] = history
    .filter(msg => msg.role !== 'model' || msg.content !== "Hello! I am your Tallman Chat Assistant") // Skip initial greeting if it's model
    .map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

  if (systemInstruction) {
    formattedHistory.unshift({ role: 'system', content: systemInstruction });
  }

  return new OllamaChat(ollamaConfig, formattedHistory);
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
