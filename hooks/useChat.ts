




import { useState, useRef, useCallback, useEffect } from 'react';
import { Message, Role, ChatSession, Attachment } from '../types';
import * as db from '../services/db';
import { retrieveContext } from '../services/knowledgeBase';
import * as authService from '../services/authService';

const initialMessage: Message = {
  role: Role.MODEL,
  content: "Hello! I am your Tallman Chat Assistant",
};

const systemInstruction = `You are a knowledgeable employee of Tallman Equipment Company, a trusted provider of professional-grade tools and equipment for the power utility industry. You are very knowledgeable about everything in your knowledge base, including products, services, rental equipment, repair capabilities, testing services, contact information, and company history.

You are deeply familiar with:
- All Tallman product categories and catalog items
- Service offerings including rentals, repairs, testing, and custom solutions
- Industry-specific terminology and equipment (stringing blocks, conductors, transformers, etc.)
- Location details for all branches (Columbus IN HQ, Addison IL, Lake City FL)
- Contact information and how to connect customers with the right resources
- Company history and heritage (employee-owned since 2014, founded post-WWII)
- Customer support protocols and being sensitive to customer needs

Always respond helpfully, professionally, and with expertise. Use the knowledge base context to provide detailed, accurate information. Be customer-focused and ready to help with any questions about Tallman's tools, equipment, or services. If a question falls outside your knowledge area, gracefully redirect to how Tallman's expertise can assist.

Key traits: Expert, Helpful, Professional, Knowledgeable, Customer-Focused, Reliable`;

const getCurrentUsername = (): string => {
  const currentUser = authService.getCurrentUser();
  return currentUser?.username || 'anonymous';
};

const MAX_MESSAGE_LENGTH = 50000; // Prevent extremely long messages
const MESSAGE_TIMEOUT = 120000; // 2 minutes timeout
const MAX_RETRIES = 2; // Retry failed operations twice

export const useChat = (
  chatId: string | null,
  onChatCreated: (session: ChatSession) => void,
  onNavigateToAdmin?: () => void
) => {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const currentChatId = useRef<string | null>(chatId);
  const messageStartTime = useRef<number>(0);
  const retryCount = useRef<number>(0);

  const loadChat = useCallback(async () => {
    setIsLoading(true);
    const cid = currentChatId.current;
    if (cid) {
        const session = await db.getChatSession(cid);
        if (session) {
            setMessages(session.messages);
        } else {
            setMessages([initialMessage]);
        }
    } else {
        setMessages([initialMessage]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    currentChatId.current = chatId;
    loadChat();
  }, [chatId, loadChat]);

  const reloadChat = useCallback(() => {
    loadChat();
  }, [loadChat]);

  const sendMessage = useCallback(async (messageContent: string, attachments: Attachment[]) => {
    if (!messageContent.trim() && attachments.length === 0) return;

    // Prevent extremely long messages
    if (messageContent.length > MAX_MESSAGE_LENGTH) {
      setError(new Error(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`));
      return;
    }

    // Reset retry count for new message
    retryCount.current = 0;

    await sendMessageWithRetry(messageContent, attachments);
  }, [messages, onChatCreated]);

  const sendMessageWithRetry = async (messageContent: string, attachments: Attachment[], isRetry: boolean = false) => {
    setIsLoading(true);
    if (!isRetry) {
      setError(null);
    }
    messageStartTime.current = Date.now();

    const userMessage: Message = { role: Role.USER, content: messageContent };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
        // RAG search
        console.log('🔍 Searching knowledge base for:', messageContent);
        const ragContextItems = await retrieveContext(messageContent);
        console.log('📚 Found context items:', ragContextItems.length);

        const textAttachments = attachments.filter(a => a.type === 'text');

        let contextString = '';

        if (ragContextItems.length > 0) {
            contextString += "Here is some relevant information from Tallman Equipment's knowledge base:\n\n" +
                ragContextItems.join('\n\n') +
                "\n\n";
            console.log('💡 Using context:', contextString.substring(0, 200) + '...');
        } else {
            console.log('❌ No relevant context found');
        }

        if (textAttachments.length > 0) {
            contextString += "--- Information from Attached Files ---\n" +
                textAttachments.map(a => `File: ${a.name}\n${a.content}`).join('\n\n') +
                "\n--- End of Attached Files Information ---\n\n";
        }

        const prompt = (contextString ? `Use the following information to answer the question:\n\n${contextString}\n\nQuestion: ` : '') + messageContent;

        // Call backend API with streaming
        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: prompt,
                history: updatedMessages.slice(0, -1) // Exclude the current user message
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let modelResponse = '';
        const modelMessagePlaceholder: Message = { role: Role.MODEL, content: '▋' };
        setMessages([...updatedMessages, modelMessagePlaceholder]);

        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (!line || !line.startsWith('data: ')) continue;

                const data = line.substring(6); // Remove 'data: ' prefix
                if (data === '[DONE]') break;

                try {
                    const parsed = JSON.parse(data);
                    if (parsed.response) {
                        modelResponse += parsed.response;

                        // Prevent response from getting too long
                        if (modelResponse.length > MAX_MESSAGE_LENGTH) {
                            modelResponse = modelResponse.substring(0, MAX_MESSAGE_LENGTH) + '\n\n[Response truncated due to length]';
                            break;
                        }

                        setMessages(prev =>
                            prev.map((msg, index) =>
                                index === prev.length - 1 ? { ...msg, content: modelResponse + '▋' } : msg
                            )
                        );
                    }
                } catch (e) {
                    console.error('Error parsing streaming response:', e);
                }
            }

            buffer = lines[lines.length - 1];

            // Check timeout
            if (Date.now() - messageStartTime.current > MESSAGE_TIMEOUT) {
                throw new Error('Message generation timed out. Please try again with a shorter message.');
            }
        }

        const finalModelMessage: Message = { role: Role.MODEL, content: modelResponse };
        const finalMessages = [...updatedMessages, finalModelMessage];
        setMessages(finalMessages);

        // Save to DB
        if (currentChatId.current) {
            const session = await db.getChatSession(currentChatId.current);
            if(session) {
                await db.addOrUpdateChatSession({ ...session, messages: finalMessages });
            }
        } else {
            // This is a new chat, create it
            const newId = Date.now().toString();
            currentChatId.current = newId;
            const title = `Chat: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`;
            const username = getCurrentUsername();
            const newSession: ChatSession = { id: newId, title, messages: finalMessages, username };
            await db.addOrUpdateChatSession(newSession);
            onChatCreated(newSession);
        }

    } catch (e) {
      const errorObj = e instanceof Error ? e : new Error('An unknown error occurred');

      // Retry logic
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        console.warn(`Attempt ${retryCount.current} failed, retrying... Error:`, errorObj.message);

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount.current));

        // Retry without resetting messages
        return sendMessageWithRetry(messageContent, attachments, true);
      }

      // All retries exhausted - create detailed error report
      const detailedError = new Error(
        `Failed after ${MAX_RETRIES} retries.\n\n` +
        `Error: ${errorObj.message}\n\n` +
        `Details:\n` +
        `- Attempt 1: Failed\n` +
        `- Attempt 2: Failed (retry 1)\n` +
        `- Attempt 3: Failed (retry 2)\n\n` +
        `Possible causes:\n` +
        `- Backend API service not running\n` +
        `- Network connectivity issues\n` +
        `- Both LLM services unavailable\n\n` +
        `Please check:\n` +
        `1. Backend API is running (check Admin Panel > Test Connection)\n` +
        `2. Network connection is stable\n` +
        `3. Try a simpler message`
      );

      setError(detailedError);

      const errorMessage: Message = {
        role: Role.MODEL,
        content: `I encountered an error after ${MAX_RETRIES + 1} attempts. Please check the error details above and try again.`,
      };

      // Preserve user message in history
      setMessages([...updatedMessages, errorMessage]);

      // Log detailed error for debugging
      console.error('Message send failed after retries:', {
        originalError: errorObj,
        retries: MAX_RETRIES,
        messageLength: messageContent.length,
        attachmentCount: attachments.length,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
      retryCount.current = 0;
    }
  };

  const updateMessage = useCallback(async (index: number, newContent: string) => {
    const updatedMessages = [...messages];
    updatedMessages[index] = { ...updatedMessages[index], content: newContent };

    // Update in database
    if (currentChatId.current) {
      const session = await db.getChatSession(currentChatId.current);
      if (session) {
        await db.addOrUpdateChatSession({ ...session, messages: updatedMessages });
      }
    }

    // Update local state
    setMessages(updatedMessages);
  }, [messages]);

  return { messages, isLoading, error, sendMessage, reloadChat, updateMessage };
};
