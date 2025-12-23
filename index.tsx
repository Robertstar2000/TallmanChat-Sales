import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import { useChat } from './hooks/useChat';
import Sidebar from './components/Sidebar';
import MessageComponent from './components/Message';
import ChatInput from './components/ChatInput';
import LoginPage from './components/LoginPage';
import AdminPage from './components/AdminPage';
import HelpModal from './components/HelpModal';
import ErrorBoundary from './components/ErrorBoundary';
import { ChatHistoryItem, ChatSession, User, Attachment } from './types';
import * as db from './services/db';
import * as auth from './services/authService';
import { SunIcon, MoonIcon, PrinterIcon, XIcon } from './components/icons';

type Theme = 'light' | 'dark';
type Page = 'chat' | 'admin';

const Header: React.FC<{
  theme: Theme;
  toggleTheme: () => void;
}> = ({ theme, toggleTheme }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="absolute top-4 right-6 z-10 flex items-center gap-2">
      <button
        onClick={toggleTheme}
        className="p-2 rounded-full bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors duration-200"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <MoonIcon className="w-5 h-5" />
        ) : (
          <SunIcon className="w-5 h-5" />
        )}
      </button>
      <button
        onClick={handlePrint}
        className="p-2 rounded-full bg-gray-200/80 dark:bg-gray-700/80 backdrop-blur-sm hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors duration-200"
        aria-label="Print chat"
      >
        <PrinterIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

const ChatView: React.FC<{
  chatId: string | null;
  onChatCreated: (session: ChatSession) => void;
  theme: Theme;
  toggleTheme: () => void;
  currentUser: User | null;
  onNavigateToAdmin: () => void;
}> = ({ chatId, onChatCreated, theme, toggleTheme, currentUser, onNavigateToAdmin }) => {
  const { messages, isLoading, error, sendMessage, reloadChat, updateMessage } = useChat(chatId, onChatCreated, onNavigateToAdmin);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAddFiles = async (files: FileList) => {
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
        try {
            if (file.type.startsWith('image/')) {
                const content = await readFileAsBase64(file);
                newAttachments.push({ name: file.name, type: 'image', content, mimeType: file.type });
            } else {
                const content = await readFileAsText(file);
                newAttachments.push({ name: file.name, type: 'text', content, mimeType: file.type });
            }
        } catch (err) {
            console.error("Error reading file:", file.name, err);
            // Optionally: dispatch a user-facing error message
        }
    }
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (fileName: string) => {
    setAttachments(prev => prev.filter(att => att.name !== fileName));
  };


  return (
    <>
      <div className="relative flex-1 overflow-y-auto p-6 space-y-4">
        <Header theme={theme} toggleTheme={toggleTheme} />
        <div className="max-w-4xl mx-auto w-full printable-chat">
          {messages.map((msg, index) => (
            <MessageComponent key={index} message={msg} index={index} onUpdateMessage={updateMessage} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {error && (
        <div className="px-6 pb-2 text-red-600 dark:text-red-400 text-sm max-w-4xl mx-auto w-full">
          <p>
            <strong>Error:</strong> {error.message}
          </p>
        </div>
      )}

      <div className="p-6 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map(att => (
                    <div key={att.name} className="flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-sm font-medium px-2.5 py-1 rounded-full">
                        <span className="truncate max-w-xs">{att.name}</span>
                        <button 
                          onClick={() => handleRemoveAttachment(att.name)} 
                          className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          aria-label={`Remove ${att.name}`}
                        >
                           <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
          )}
          <ChatInput 
            onSendMessage={(message) => {
              sendMessage(message, attachments);
              setAttachments([]);
            }} 
            isLoading={isLoading} 
            onAddFiles={handleAddFiles}
          />
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3 px-4">
            Tallman may display inaccurate info, including about people, so please
            double-check its responses.
          </p>

          {/* Admin button - only visible to admin users */}
          {(() => {
            console.log('👤 Current user:', currentUser);
            console.log('🔐 User role:', currentUser?.role);
            console.log('👑 Is admin:', currentUser?.role === 'admin');

            return currentUser?.role === 'admin' && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    console.log('🔘 Admin button clicked');
                    onNavigateToAdmin();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Panel
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.getCurrentUser());
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    // Check URL parameters for direct admin access
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const page = urlParams.get('page');
      if (page === 'admin') {
        console.log('🔗 Direct admin access via URL parameter');
        return 'admin';
      }
    }
    return 'chat';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage.getItem('theme') === 'light') {
      return 'light';
    }
    return 'dark';
  });
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
    
    const darkThemeLink = document.getElementById('hljs-dark-theme') as HTMLLinkElement;
    const lightThemeLink = document.getElementById('hljs-light-theme') as HTMLLinkElement;
    
    if (darkThemeLink) darkThemeLink.disabled = !isDark;
    if (lightThemeLink) lightThemeLink.disabled = isDark;

  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const loadHistory = useCallback(async () => {
    if (currentUser) {
      const history = await db.getAllChatHistories(currentUser.username);
      setChatHistory(history);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
        loadHistory();
    }
  }, [currentUser, loadHistory]);

  const handleNewChat = () => {
    setCurrentChatId(null);
    setCurrentPage('chat');
  };

  const handleSelectChat = (id: string) => {
    setCurrentChatId(id);
    setCurrentPage('chat');
  };

  const handleDeleteChat = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      await db.deleteChatSession(id);
      if (currentChatId === id) {
        setCurrentChatId(null);
      }
      await loadHistory();
    }
  };

  const handleClearAllChats = async () => {
    if (window.confirm('Are you sure you want to delete all chat history? This action cannot be undone.')) {
      await db.clearAllChatSessions();
      setChatHistory([]);
      setCurrentChatId(null);
    }
  };

  const handleChatCreated = (session: ChatSession) => {
    setCurrentChatId(session.id);
    setChatHistory(prev => [{ id: session.id, title: session.title }, ...prev.filter(c => c.id !== session.id)]);
  };
  
  const handleLoginSuccess = (user: User) => {
    console.log('🎯 handleLoginSuccess called with:', user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    auth.logout();
    setCurrentUser(null);
    setChatHistory([]);
    setCurrentChatId(null);
    setCurrentPage('chat');
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Debug logging for admin access
  console.log('🔍 App render - Current user:', currentUser);
  console.log('🔍 App render - User role:', currentUser.role);
  console.log('🔍 App render - Current page:', currentPage);

  return (
    <div className="flex h-screen font-sans">
      <Sidebar
        onNewChat={handleNewChat}
        chatHistory={chatHistory}
        activeChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onClearAllChats={handleClearAllChats}
        onLogout={handleLogout}
        user={currentUser}
        onNavigateToAdmin={() => setCurrentPage('admin')}
        onShowHelp={() => setShowHelpModal(true)}
      />
      <main className="flex-1 flex flex-col">
          {currentPage === 'chat' ? (
            <ChatView
              chatId={currentChatId}
              onChatCreated={handleChatCreated}
              theme={theme}
              toggleTheme={toggleTheme}
              currentUser={currentUser}
              onNavigateToAdmin={() => setCurrentPage('admin')}
            />
          ) : (
            <AdminPage onNavigate={setCurrentPage} />
          )}
      </main>
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
};

const container = document.getElementById('root')!;
const root = ((window as any).reactRoot = (window as any).reactRoot || ReactDOM.createRoot(container));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
