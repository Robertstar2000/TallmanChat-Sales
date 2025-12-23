import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { Message, Role } from '../types';
import { UserIcon, SparklesIcon, CopyIcon, CheckIcon, PrinterIcon, PencilIcon, CheckCircleIcon, XIcon } from './icons';
import { addKnowledge } from '../services/knowledgeBase';

interface MessageProps {
  message: Message;
  index: number;
  onUpdateMessage?: (index: number, newContent: string) => void;
}

const MessageComponent: React.FC<MessageProps> = ({ message, index, onUpdateMessage }) => {
  const isModel = message.role === Role.MODEL;
  const contentRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const rawContent = message.content.endsWith('▋')
    ? message.content.slice(0, -1)
    : message.content;

  const sanitizedHtml = isModel
    ? DOMPurify.sanitize(marked.parse(rawContent, { async: false, gfm: true, breaks: true }) as string)
    : '';

  const handleEdit = () => {
    setEditedContent(rawContent);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (editedContent.trim()) {
      // Check if user is admin - only admins can save to knowledge base
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser?.role === 'admin') {
        await addKnowledge(editedContent.trim());
      }
      if (onUpdateMessage) {
        onUpdateMessage(index, editedContent.trim());
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  useEffect(() => {
    if (!isModel || !contentRef.current) return;
    
    try {
        contentRef.current.querySelectorAll('pre').forEach((pre) => {
            const code = pre.querySelector('code');
            if (!code || !code.textContent) return;

            // Add buttons only if they don't already exist
            if (!pre.querySelector('.code-block-actions')) {
                const actionsContainer = document.createElement('div');
                actionsContainer.className = 'code-block-actions';

                // --- Create Copy Button ---
                const copyButton = document.createElement('button');
                copyButton.className = 'code-block-button';
                copyButton.setAttribute('aria-label', 'Copy code');
                const copyIconContainer = document.createElement('span');
                copyButton.appendChild(copyIconContainer);
                const copyRoot = ReactDOM.createRoot(copyIconContainer);
                copyRoot.render(<CopyIcon className="w-4 h-4" />);

                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(code.innerText).then(() => {
                        copyRoot.render(<CheckIcon className="w-4 h-4 text-green-500" />);
                        setTimeout(() => {
                            copyRoot.render(<CopyIcon className="w-4 h-4" />);
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy code: ', err);
                    });
                });

                // --- Create Print Button ---
                const printButton = document.createElement('button');
                printButton.className = 'code-block-button';
                printButton.setAttribute('aria-label', 'Print code');
                const printIconContainer = document.createElement('span');
                printButton.appendChild(printIconContainer);
                ReactDOM.createRoot(printIconContainer).render(<PrinterIcon className="w-4 h-4" />);

                printButton.addEventListener('click', () => {
                    const contentToPrint = pre.outerHTML;
                    const activeThemeLink = document.querySelector<HTMLLinkElement>('link[id^="hljs-"][rel="stylesheet"]:not([disabled])');
    
                    const iframe = document.createElement('iframe');
                    iframe.style.position = 'absolute';
                    iframe.style.width = '0';
                    iframe.style.height = '0';
                    iframe.style.border = 'none';
                    document.body.appendChild(iframe);
    
                    const doc = iframe.contentWindow?.document;
                    if (doc) {
                        doc.open();
                        doc.write(`
                            <html>
                                <head>
                                    <title>Print Code</title>
                                    ${activeThemeLink ? activeThemeLink.outerHTML : ''}
                                    <style>
                                        @media print {
                                            body { margin: 1.5rem; font-family: monospace; }
                                            pre { white-space: pre-wrap; word-wrap: break-word; }
                                            .code-block-actions { display: none; }
                                        }
                                    </style>
                                </head>
                                <body>${contentToPrint}</body>
                            </html>
                        `);
                        doc.close();
                    }
    
                    iframe.onload = () => {
                        const printWindow = iframe.contentWindow;
                        if (printWindow) {
                            let printed = false;
                            const afterPrint = () => {
                                if (!printed) {
                                    printed = true;
                                    if (iframe.parentNode === document.body) {
                                      document.body.removeChild(iframe);
                                    }
                                    printWindow.removeEventListener('afterprint', afterPrint);
                                }
                            };
                            printWindow.addEventListener('afterprint', afterPrint);
                            printWindow.focus();
                            printWindow.print();
                            setTimeout(afterPrint, 1000);
                        }
                    };
                });

                actionsContainer.appendChild(copyButton);
                actionsContainer.appendChild(printButton);
                pre.appendChild(actionsContainer);
            }
            
            // Always re-highlight to handle streaming content
            try {
                // Ensure code element has required properties before highlighting
                if (code.parentElement && code.textContent && code.textContent.trim()) {
                    // Remove any existing highlighting classes
                    code.removeAttribute('data-highlighted');
                    code.className = code.className.replace(/hljs[\w-]*/g, '').trim();
                    
                    // Validate hljs is properly loaded with theme
                    if (hljs && typeof hljs.highlightElement === 'function') {
                        // Apply highlighting with additional safety
                        try {
                            hljs.highlightElement(code);
                        } catch (hljsError) {
                            // If highlighting fails, just add basic code class
                            code.className = 'hljs';
                            console.warn('hljs.highlightElement failed:', hljsError);
                        }
                    }
                }
            } catch (error) {
                // Silently fail if highlighting fails - content still displays
                console.warn('Code highlighting failed for block:', error);
            }
        });
    } catch (error) {
        // Catch any errors in the entire highlighting process
        console.error('Error processing code blocks:', error);
    }
}, [sanitizedHtml, isModel]);

  return (
    <div
      className={`flex items-start gap-4 p-4 my-2 rounded-lg ${
        isModel ? 'bg-gray-100 dark:bg-gray-700/50' : 'bg-indigo-500'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
          isModel ? 'bg-indigo-500' : 'bg-gray-500 dark:bg-gray-600'
        }`}
      >
        {isModel ? (
          <SparklesIcon className="w-5 h-5 text-white" />
        ) : (
          <UserIcon className="w-5 h-5 text-white" />
        )}
      </div>
      <div className="flex flex-col pt-1 w-full overflow-hidden">
        <div className="flex items-center justify-between">
          <p className={`font-bold ${isModel ? 'text-gray-800 dark:text-gray-200' : 'text-indigo-100'}`}>
              {isModel ? 'Tallman' : 'You'}
          </p>
          {isModel && !message.content.endsWith('▋') && (
            <button
              onClick={handleEdit}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              aria-label="Edit response"
            >
              <PencilIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
        {isModel ? (
          <>
            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  rows={6}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                  >
                    <XIcon className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={contentRef}
                className="text-gray-700 dark:text-gray-300 prose prose-p:my-2 prose-li:my-0 max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml + (message.content.endsWith('▋') ? '<span class="blinking-cursor">▋</span>' : '') }}
              />
            )}
          </>
        ) : (
          <div className="text-white whitespace-pre-wrap">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageComponent;
