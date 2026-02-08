import React, { useState, useEffect, useRef } from 'react';
import { getAllApprovedUsers, addOrUpdateApprovedUser, deleteApprovedUser, setState } from '../services/db';
import { getAllKnowledge, clearAllKnowledge, bulkAddKnowledge, clearAndReloadKnowledgeBase, addKnowledge } from '../services/knowledgeBase';
import { getApiUrl } from '../services/config';
import { User, UserRole, KnowledgeItem } from '../types';

interface AdminPageProps {
  onNavigate: (page: 'chat' | 'admin') => void;
}


const UserManagement: React.FC<{ setFeedback: (msg: string) => void }> = ({ setFeedback }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');

  const loadUsers = async () => {
    const userList = await getAllApprovedUsers();
    setUsers(userList);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setFeedback('Error: Username cannot be empty.');
      return;
    }
    try {
      const newUser: User = { username: newUsername, role: newUserRole };
      await addOrUpdateApprovedUser(newUser);
      setNewUsername('');
      setNewUserRole('user');
      await loadUsers();
      setFeedback(`User '${newUsername}' added successfully.`);
    } catch (error) {
      setFeedback('Error: Could not add user.');
      console.error(error);
    }
  };

  const handleRoleChange = async (username: string, role: UserRole) => {
    try {
      const userToUpdate: User = { username, role };
      await addOrUpdateApprovedUser(userToUpdate);
      await loadUsers();
      setFeedback(`Role for '${username}' updated.`);
    } catch (error) {
      setFeedback('Error: Could not update user role.');
      console.error(error);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username === 'BobM') {
      setFeedback('Error: Cannot delete the default admin user.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete the user '${username}'?`)) {
      try {
        await deleteApprovedUser(username);
        await loadUsers();
        setFeedback(`User '${username}' deleted.`);
      } catch (error) {
        setFeedback('Error: Could not delete user.');
        console.error(error);
      }
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">User Management</h3>
      <p className="text-gray-500 dark:text-gray-400 mt-2 mb-4">
        Manage users who are approved to use this application. Users must also be Tallman Employees with a .tallmanequipment email to log in.
      </p>

      {/* Add User Form */}
      <form onSubmit={handleAddUser} className="flex items-center gap-2 mb-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
        <input
          type="text"
          value={newUsername}
          onChange={e => setNewUsername(e.target.value)}
          placeholder="New username"
          className="flex-grow bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <select
          value={newUserRole}
          onChange={e => setNewUserRole(e.target.value as UserRole)}
          className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="hold">Hold</option>
        </select>
        <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg">Add</button>
      </form>

      {/* User List */}
      <div className="space-y-2">
        {users.map(user => (
          <div key={user.username} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <span className="font-medium text-gray-800 dark:text-gray-200">{user.username}</span>
            <div className="flex items-center gap-2">
              <select
                value={user.role}
                onChange={(e) => handleRoleChange(user.username, e.target.value as UserRole)}
                className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md py-1 px-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="hold">Hold</option>
              </select>
              <button
                onClick={() => handleDeleteUser(user.username)}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 disabled:opacity-50"
                disabled={user.username === 'BobM'}
                aria-label={`Delete user ${user.username}`}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};


const KnowledgeManagement: React.FC<{ setFeedback: (msg: string) => void }> = ({ setFeedback }) => {
  const isApiSupported = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickAddInputRef = useRef<HTMLTextAreaElement>(null);
  const BACKUP_FILE_HANDLE_KEY = 'backupFileHandle';
  const LAST_BACKUP_TIMESTAMP_KEY = 'lastBackupTimestamp';

  const handleDownloadBackup = async () => {
    try {
      // getAllKnowledge() returns all knowledge (static defaults + dynamic additions)
      // The static defaults are loaded into DB during initialization
      const allKnowledge = await getAllKnowledge();

      const blob = new Blob([JSON.stringify(allKnowledge, null, 2)], { type: 'application/json' });
      const suggestedName = `tallman-knowledge-base-backup-${new Date().toISOString().split('T')[0]}.json`;

      if (isApiSupported) {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          }],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        await setState(BACKUP_FILE_HANDLE_KEY, handle);
        await setState(LAST_BACKUP_TIMESTAMP_KEY, Date.now());
        setFeedback('Full knowledge base backup downloaded successfully (includes both static defaults and dynamic additions).');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        setFeedback('Full knowledge base backup downloaded successfully (includes both static defaults and dynamic additions).');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Backup download failed:', error);
      setFeedback('Error: Failed to download backup.');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result;
      if (typeof content !== 'string') {
        setFeedback('Error: Could not read file content.');
        return;
      }

      try {
        const newKnowledge = JSON.parse(content) as KnowledgeItem[];

        if (!Array.isArray(newKnowledge) || newKnowledge.some(item => typeof item.content !== 'string' || typeof item.timestamp !== 'number')) {
          setFeedback('Error: Invalid JSON file format for knowledge base.');
          return;
        }

        if (window.confirm('Are you sure you want to replace the entire knowledge base with this file? This action cannot be undone.')) {
          await clearAllKnowledge();
          await bulkAddKnowledge(newKnowledge);
          setFeedback('Knowledge base restored successfully.');
        }
      } catch (jsonError) {
        setFeedback('Error: Failed to parse JSON file.');
        console.error('JSON parsing error:', jsonError);
      }
    };
    reader.onerror = () => {
      setFeedback('Error: Failed to read file.');
      console.error('FileReader error:', reader.error);
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleQuickAdd = async () => {
    const content = quickAddInputRef.current?.value?.trim();
    if (!content) {
      setFeedback('Error: Please enter some content to add.');
      return;
    }

    try {
      await addKnowledge(content);
      quickAddInputRef.current!.value = '';
      setFeedback('Knowledge item added successfully to the knowledge base.');
    } catch (error) {
      setFeedback('Error: Failed to add knowledge item.');
      console.error('Quick add error:', error);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Knowledge Base Management</h3>
      <p className="text-gray-500 dark:text-gray-400 mt-2 mb-4">
        Add new knowledge items in real-time, download backups, or restore from files.
        {isApiSupported
          ? " The first download will set up silent, automatic backups every 7 days."
          : " Automatic backups are not supported on this browser, but manual backups are available."
        }
      </p>

      {/* Quick Add Form */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg mb-6">
        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">🏃‍♂️ Real-time Knowledge Addition</h4>
        <p className="text-xs text-yellow-600 dark:text-yellow-300 mb-3">
          Instantly add new knowledge items that become available immediately for all users - no app restart required!
        </p>
        <textarea
          ref={quickAddInputRef}
          placeholder="Enter new knowledge content here... (e.g., 'Tallman Equipment was founded in 1952 as Warren Tallman's company incorporation.')"
          rows={3}
          className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-yellow-500 focus:outline-none resize-none"
        />
        <button
          onClick={handleQuickAdd}
          className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Add to Knowledge Base
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json,application/json"
        className="hidden"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-3">
        <div className="flex gap-4">
          <button
            onClick={handleDownloadBackup}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Download Backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Upload & Replace
          </button>
        </div>
        <button
          onClick={async () => {
            if (window.confirm('Are you sure you want to clear ALL knowledge base data? This will remove everything and reload the default knowledge base immediately.')) {
              try {
                await clearAndReloadKnowledgeBase();
                setFeedback('Knowledge base cleared and reloaded with default data.');
              } catch (error) {
                setFeedback('Error: Failed to reload knowledge base.');
                console.error('Knowledge base reload error:', error);
              }
            }
          }}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Clear & Reload Knowledge Base
        </button>
      </div>
    </div>
  );
};


const AISettings: React.FC<{ setFeedback: (msg: string) => void }> = ({ setFeedback }) => {
  // Current AI Configuration
  const [openaiModel, setOpenaiModel] = useState(() => {
    return localStorage.getItem('openaiModel') || 'gpt-5.2';
  });
  const [isTestingLLM, setIsTestingLLM] = useState(false);
  const [testOutput, setTestOutput] = useState('');

  const saveSettings = () => {
    localStorage.setItem('openaiModel', openaiModel);
    setFeedback('AI settings saved successfully.');
  };

  const testLLMConnection = async () => {
    setIsTestingLLM(true);
    setFeedback('Testing AI connections...');
    setTestOutput('');

    try {
      const response = await fetch(getApiUrl('/api/llm-test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      const diagnostics = [
        `Primary LLM: OpenAI (${openaiModel})`,
        `Status: ${result.success ? 'Connected ✓' : 'Failed ✗'}`,
        ``,
        `Output:`,
        result.output || result.error || 'No output received'
      ].join('\n');

      setTestOutput(diagnostics);

      if (result.success) {
        setFeedback(`✅ Connection successful!`);
      } else {
        setFeedback(`❌ Connection failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setTestOutput(`Connection Error:\n${errorMsg}\n\nPlease verify:\n- Backend is running\n- OpenAI API Key is valid`);
      setFeedback('❌ Connection failed: Network error');
    } finally {
      setIsTestingLLM(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Settings</h3>
      <p className="text-gray-500 dark:text-gray-400 mt-2 mb-4">
        Configure the AI model used by the Agentic Workflow.
      </p>

      <div className="space-y-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            OpenAI Model Name
          </label>
          <input
            type="text"
            value={openaiModel}
            onChange={(e) => setOpenaiModel(e.target.value)}
            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="gpt-5.2"
          />
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Current: {openaiModel}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveSettings}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Save Settings
          </button>
          <button
            onClick={testLLMConnection}
            disabled={isTestingLLM}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {isTestingLLM ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {testOutput && (
          <div className="mt-4 p-3 bg-gray-200 dark:bg-gray-700 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">System Diagnostics</h4>
            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-x-auto">
              {testOutput}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminPage: React.FC<AdminPageProps> = ({ onNavigate }) => {
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => {
        setFeedback('');
      }, 4000); // Clear feedback after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  return (
    <div className="flex-1 flex flex-col items-center p-6 bg-gray-100 dark:bg-gray-800 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900/50 rounded-lg p-8 shadow-xl border border-gray-200 dark:border-gray-700/50 my-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
          <button
            onClick={() => onNavigate('chat')}
            className="text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Return to Chat
          </button>
        </div>

        <div className="space-y-10">
          <UserManagement setFeedback={setFeedback} />
          <KnowledgeManagement setFeedback={setFeedback} />
          <AISettings setFeedback={setFeedback} />
        </div>

        {/* Global Feedback Area */}
        <div className="mt-6 text-center h-5">
          <p className={`text-sm ${feedback.startsWith('Error') ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {feedback}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
