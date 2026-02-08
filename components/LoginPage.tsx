import React, { useState } from 'react';
import { User } from '../types';
import * as auth from '../services/authService';
import { getApiUrl } from '../services/config';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

// Custom Logo Icon for Tallman Chat
const TallmanChatLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#logoGradient)" opacity="0.15" />
    <circle cx="32" cy="32" r="24" fill="url(#logoGradient)" opacity="0.3" />
    <path
      fill="url(#logoGradient)"
      d="M32 12c-11 0-20 7.5-20 16.8 0 5.2 2.8 9.9 7.2 13v8.2l8-4.5c1.5.3 3.1.5 4.8.5 11 0 20-7.5 20-16.8S43 12 32 12z"
    />
    <text
      x="32"
      y="34"
      textAnchor="middle"
      fontSize="12"
      fontWeight="bold"
      fill="white"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      TC
    </text>
  </svg>
);

// Checkmark icon for feature list
const CheckmarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
      clipRule="evenodd"
    />
  </svg>
);

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
        const signupResult = await fetch(getApiUrl('/api/auth/signup'), {
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

  const features = [
    { title: 'Intelligent Company Database', description: 'Access your entire Tallman Equipment knowledge base through natural conversation.' },
    { title: 'AI-Powered Insights', description: 'Get instant answers about products, pricing, and company information.' },
    { title: 'Secure Enterprise Access', description: 'Protected with enterprise-grade authentication for your team.' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left Hero Section */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden items-center justify-center"
        style={{
          background: 'radial-gradient(circle at top left, #3730a3 0%, #312e81 40%, #1e1b4b 100%)'
        }}
      >
        {/* Embossed Background Text */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
          <div
            className="flex flex-col items-center justify-center font-black opacity-20"
            style={{
              transform: 'rotate(-12deg) scale(1.5)',
              mixBlendMode: 'overlay'
            }}
          >
            <span
              className="text-[15vw] leading-none text-transparent bg-clip-text bg-gradient-to-b from-white/30 to-transparent"
              style={{
                WebkitTextStroke: '2px rgba(255,255,255,0.2)',
                filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.5))'
              }}
            >
              TALLMAN
            </span>
            <span
              className="text-[15vw] leading-none text-transparent bg-clip-text bg-gradient-to-b from-white/30 to-transparent"
              style={{
                WebkitTextStroke: '2px rgba(255,255,255,0.2)',
                filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.5))'
              }}
            >
              CHAT
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center w-[80%]">
          <div>
            {/* Logo/Title */}
            <h1 className="text-5xl xl:text-7xl font-bold text-white mb-8 tracking-tight drop-shadow-lg">
              Tallman Chat
            </h1>

            {/* Tagline */}
            <p className="text-xl xl:text-2xl text-indigo-100 mb-12 leading-relaxed font-light opacity-90">
              Your AI-powered assistant for Tallman Equipment's complete company database.
              Get instant answers about products and company knowledge.
            </p>

            {/* Feature List */}
            <div className="space-y-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-5 group">
                  <div className="p-2 rounded-lg bg-indigo-500/20 ring-1 ring-indigo-400/30 group-hover:bg-indigo-500/30 transition-colors">
                    <CheckmarkIcon className="w-6 h-6 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-xl mb-1">{feature.title}</h3>
                    <p className="text-indigo-200 text-base leading-relaxed opacity-80">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative gradient orbs for Left Side */}
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[800px] h-[800px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)' }}
        />
      </div>

      {/* Right Login Section */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden"
        style={{ background: '#0f0f23' }}
      >
        {/* Decorative blobs for Glassmorphism Context */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

        <div className="w-full max-w-md relative z-10">
          {/* Glassmorphic Login Card */}
          <div
            className="rounded-2xl p-8 backdrop-blur-md"
            style={{
              background: 'rgba(30, 30, 50, 0.4)', // Much more transparent
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <TallmanChatLogo className="w-16 h-16" />
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-gray-400 text-sm">
                {isSignUp ? 'Join Tallman Chat today' : 'Please enter your details to sign in.'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="mb-6 px-4 py-3 rounded-lg text-center text-sm"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5'
                }}
              >
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div
                className="mb-6 px-4 py-3 rounded-lg text-center text-sm"
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#86efac'
                }}
              >
                {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@tallmanequipment.com"
                  className="w-full px-4 py-3 rounded-lg text-gray-200 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg text-gray-200 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />
                {isSignUp && (
                  <p className="mt-2 text-xs text-gray-500">
                    Password must be at least 6 characters long
                  </p>
                )}
              </div>

              {/* Confirm Password Field (Sign Up only) */}
              {isSignUp && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-lg text-gray-200 placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            {/* Toggle Sign In / Sign Up */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
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
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </div>

            {/* Domain Notice */}
            <div className="mt-6 pt-6 border-t border-gray-700/50">
              <p className="text-center text-xs text-gray-500">
                Note: Access is restricted to accounts with the{' '}
                <span className="text-gray-400">@tallmanequipment.com</span> domain.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
