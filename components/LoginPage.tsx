import React, { useState } from 'react';
import { SparklesIcon } from './icons';
import { User } from '../types';
import * as auth from '../services/authService';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (isSignUp) {
      // Signup validation
      if (!email || !password || !confirmPassword) {
        setError('Please fill in all fields.');
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setIsLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setIsLoading(false);
        return;
      }

      try {
        const signupResult = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, confirmPassword })
        });

        const data = await signupResult.json();

        if (data.success) {
          setSuccess('Account created successfully! Please sign in.');
          setIsSignUp(false);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        } else {
          setError(data.error || 'Failed to create account');
        }
      } catch (err) {
        setError('Failed to create account. Please try again.');
      }
    } else {
      // Signin validation
      if (!email || !password) {
        setError('Please enter both email and password.');
        setIsLoading(false);
        return;
      }

      try {
        const loginResult = await auth.login(email, password);
        console.log('🔑 Login result:', loginResult);
        if (loginResult.success) {
          onLoginSuccess(loginResult.user);
        } else {
          throw new Error('Login failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-800">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-900/50 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700/50">
        <div className="text-center">
            <SparklesIcon className="w-12 h-12 mx-auto text-indigo-500 dark:text-indigo-400" />
            <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Tallman Chat</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </p>
        </div>

        {/* Mode Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow duration-200"
                placeholder="your.email@tallmanequipment.com"
              />
            </div>
            {isSignUp && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Only @tallmanequipment.com email addresses are allowed
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow duration-200"
              />
            </div>
            {isSignUp && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Password must be at least 6 characters long
              </p>
            )}
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow duration-200"
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
          {success && <p className="text-sm text-green-600 dark:text-green-400 text-center">{success}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
