import React, { useState, useEffect } from 'react';
import { XIcon } from './icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Help & Resources</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close help"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Getting Started</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome to Tallman Chat! Start a conversation by typing a message below.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Features</h3>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
              <li>AI-powered responses using company knowledge base</li>
              <li>Persistent chat history</li>
              <li>Admin panel for user management</li>
              <li>Real-time streaming responses</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Need Technical Help?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              For technical details about this application, including setup and migration information:
            </p>
            <a
              href="/MIGRATION_PLAN.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View Migration Plan & Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
