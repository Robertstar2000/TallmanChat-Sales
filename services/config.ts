
/**
 * Application Configuration
 * 
 * Defines global configuration settings for the frontend application.
 * Supports environment variable overrides for Docker/Swarm deployments.
 */

// API Base URL
// Can be set via VITE_API_BASE_URL environment variable at build time.
// If not set, defaults to empty string (relative path) which works well with proxies.
// For production Swarm usage where frontend/backend might be on different domains/ports without a proxy,
// set VITE_API_BASE_URL to the full backend URL (e.g., "http://api.tallman.com").
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Helper to construct full API URLs
 * @param endpoint - The API endpoint path (e.g., '/api/auth/login')
 * @returns The full URL including base URL
 */
export const getApiUrl = (endpoint: string): string => {
    // Remove leading slash if present to avoid double slashes when joining
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // If API_BASE_URL has a trailing slash, remove it
    const cleanBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

    return `${cleanBaseUrl}${cleanEndpoint}`;
};

export const APP_VERSION = '1.0.0';
