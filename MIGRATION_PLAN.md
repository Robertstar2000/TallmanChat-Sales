# Tallman Chat Migration Plan: From Local Dev to MS Server Production

## Overview
This migration plan transforms the Tallman Chat application from a local development environment using Gemini API and simulated LDAP authentication into a fully functional production application running on Microsoft Server using Ollama LLM and email-domain-based authentication.

## Current State Analysis
- **Frontend**: React TypeScript SPA using Vite
- **Backend**: Node.js Express server with API proxying architecture
- **Authentication**: Simulated LDAP with local storage fallback and admin backdoor
- **LLM**: Currently uses Gemini API (@google/genai)
- **Database**: Local storage via custom db service
- **Deployment**: Local development with proxy servers running on ports 3005 (UI) and 3006 (API)

## Target Production State
- **Server**: Microsoft Windows Server with IIS
- **Domain**: TallmanChat.tallman.com (accessible company-wide)
- **Authentication**: Email-domain restriction (@tallmanequipment.com only) with "Robertstart@aol.com" backdoor
- **LLM**: Ollama service with local models
- **Infrastructure**: IIS reverse proxy with SSL certificates

---

## Migration Phases

### Phase 1: Infrastructure Setup
#### Windows Server Preparation
```powershell
# Create TallmanChat directory structure in IIS
New-Item -ItemType Directory -Path "C:\inetpub\TallmanChat" -Force
New-Item -ItemType Directory -Path "C:\inetpub\TallmanChat\logs" -Force
New-Item -ItemType Directory -Path "C:\inetpub\TallmanChat\ssl" -Force
```

#### DNS Configuration
```powershell
# Add DNS record for tallmanchat subdomain
Add-DnsServerResourceRecord -ZoneName "tallman.com" -Name "tallmanchat" -IPv4Address "10.10.20.9" -TimeToLive 00:01:00 -Type A
```

### Phase 2: Authentication System Overhaul

#### Email Domain Validation Implementation
**Current Code Location**: `services/authService.ts`
**Modification Required**: Replace LDAP simulation with email domain checking

**LLM IDE Prompt for Authentication Update**:
```
You are an expert TypeScript developer. I need you to modify the `services/authService.ts` file in a Tallman Chat application to replace LDAP authentication with email domain validation. The requirements are:

1. Allow login ONLY with emails from @tallmanequipment.com domain
2. Maintain the existing Robertstart@aol.com backdoor login for admin access
3. Keep the existing user roles and storage system (admin/request)
4. Remove all LDAP-related functionality

Key changes needed:
- Replace simulatedLdapAuth function with email domain validation
- Update login logic to extract email address from username field
- Preserve existing backdoor mechanism for Robertstart@aol.com
- Update error messages to reflect email domain restrictions

Current login function structure to maintain:
```typescript
export const login = async (username: string, password: string): Promise<{ success: true; user: User }>
```

The password parameter can be minimal validation (length > 0) since we're moving away from LDAP.
```

**Updated Login Logic**:
```typescript
// Email domain validation
const validateEmailDomain = (email: string): boolean => {
  const domain = email.toLowerCase().split('@')[1];
  return domain === 'tallmanequipment.com';
};

export const login = async (email: string, password: string): Promise<{ success: true; user: User }> => {
  console.log('🔑 Login attempt for email:', email);

  // Admin backdoor - exact email match required
  if (email.toLowerCase() === 'robertstart@aol.com' && password === 'Rm2214ri#') {
    console.warn("✅ Using developer backdoor login.");
    const backdoorAdmin: User = { username: 'robertstart', role: 'admin' };
    return { success: true, user: backdoorAdmin };
  }

  // Domain validation for tallmanequipment.com emails
  if (!validateEmailDomain(email)) {
    throw new Error('Access restricted to tallmanequipment.com email addresses only.');
  }

  // Basic password validation (since no LDAP)
  if (password.length === 0) {
    throw new Error('Password is required.');
  }

  // Extract username from email for local user management
  const username = email.split('@')[0];
  const users = await getUsers();
  let authorizedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!authorizedUser) {
    console.log(`Auto-provisioning new user: ${username}`);
    authorizedUser = await addUser({
      username: username,
      role: 'request'
    });
    console.log(`Created new corporate user: ${authorizedUser.username} with role: request`);
  }

  return { success: true, user: authorizedUser };
};
```

### Phase 3: Ollama Integration Update

#### Replace Gemini with Ollama
**Current Code Location**: `services/geminiService.ts` and API calls in `server/backend-server.js`

**LLM IDE Prompt for Ollama Migration**:
```
You are a Node.js backend developer. I need you to migrate a chat application from Google Gemini API to Ollama LLM service. Here are the key requirements:

1. Update `server/backend-server.js` to use Ollama instead of calling Ollama API directly in endpoints
2. Replace the existing `/api/chat/send` endpoint that uses Gemini with Ollama streaming
3. Update the streaming endpoint `/api/chat/stream` to work with Ollama's chat API format
4. Ensure knowledge base context injection works with the new LLM

Current Ollama configuration variables:
- OLLAMA_HOST (default: localhost)
- OLLAMA_MODEL (default: llama3.1:8b)
- API endpoint: http://${OLLAMA_HOST}:11434/api/chat

The frontend already has an `ollamaService.ts` that makes API calls to `/api/ollama/chat`. You need to create this API endpoint in the backend.

Key changes:
- Remove Gemini API calls (@google/genai dependency)
- Add Ollama chat endpoint that matches frontend expectations
- Maintain knowledge base context injection logic
- Update error handling for Ollama API responses

Required API endpoints to create:
```javascript
POST /api/ollama/chat - Streaming chat with history, system prompt, and model selection
```
```

**Updated Backend Chat Endpoint**:
```javascript
// New Ollama chat endpoint for frontend
app.post('/api/ollama/chat', async (req, res) => {
  try {
    const { model, messages, stream, system } = req.body;

    if (!model || !messages) {
      return res.status(400).json({ error: 'Model and messages are required' });
    }

    // Get context from knowledge base for the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content;
    let contextPrompt = '';

    if (lastUserMessage) {
      const context = await knowledgeService.retrieveContext(lastUserMessage);
      if (context.length > 0) {
        contextPrompt = `\n\nContext from Tallman Equipment knowledge base:\n${context.map(item => `- ${item}`).join('\n')}`;
      }
    }

    // Prepare Ollama request
    const ollamaRequest = {
      model: model || OLLAMA_MODEL,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.role === 'user' && contextPrompt ? msg.content + contextPrompt : msg.content
      })),
      stream: stream !== false,
      ...(system && { system })
    };

    const response = await fetch(`${OLLAMA_API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaRequest)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      response.body.pipe(res);
    } else {
      const data = await response.json();
      res.json({ message: { content: data.message?.content || '' } });
    }

  } catch (error) {
    console.error('Ollama chat error:', error);
    res.status(500).json({ error: 'Failed to get Ollama response' });
  }
});
```

### Phase 4: IIS Configuration

#### Web.config for Reverse Proxy
**LLM IDE Prompt for IIS Setup**:
```
You are an IIS configuration expert. Create a web.config file for a Node.js chat application running behind IIS reverse proxy. The application has:

1. Static React SPA served from `/`
2. API proxy to backend Node.js server at port 3006
3. Need to handle static assets, API routes, and SPA routing

Requirements:
- URL Rewrite rules for SPA routing (handle client-side routing)
- Proxy configuration for /api/* requests to localhost:3006
- SSL enforcement if available
- CORS headers for API requests
- Proper MIME types for static assets

The Node.js UI server runs on port 3005 and proxies API calls to port 3006. With IIS reverse proxy, we want IIS to handle static files and proxy API calls directly.

Key elements needed:
```xml
<rewrite>
  <rules>
    <!-- API proxy rule -->
    <!-- SPA fallback rule -->
  </rules>
</rewrite>
```
```

**IIS web.config**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <!-- URL Rewrite Module for SPA routing and API proxy -->
        <rewrite>
            <rules>
                <!-- API proxy - forward all API calls to backend Node.js server -->
                <rule name="API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="http://localhost:3006/api/{R:1}" />
                </rule>

                <!-- SPA routing - serve index.html for non-API routes -->
                <rule name="SPA Fallback" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                        <add input="{REQUEST_URI}" pattern="^/(api|ui-health)" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
            <outboundRules>
                <!-- Add CORS headers -->
                <rule name="Add CORS headers">
                    <match serverVariable="RESPONSE_Access-Control-Allow-Origin" pattern=".*" />
                    <conditions>
                        <add input="{REQUEST_URI}" pattern="^/api/" />
                    </conditions>
                    <action type="Rewrite" value="*" />
                </rule>
            </outboundRules>
        </rewrite>

        <!-- Static files configuration -->
        <staticContent>
            <mimeMap fileExtension=".json" mimeType="application/json" />
            <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
        </staticContent>

        <!-- Security headers -->
        <httpProtocol>
            <customHeaders>
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-Frame-Options" value="DENY" />
                <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
            </customHeaders>
        </httpProtocol>

        <!-- Default document -->
        <defaultDocument>
            <files>
                <clear />
                <add value="index.html" />
            </files>
        </defaultDocument>
    </system.webServer>
</configuration>
```

### Phase 5: Package Dependencies Update

#### package.json Updates
**LLM IDE Prompt for Dependency Management**:
```
You are a Node.js package management expert. I need to update a chat application's dependencies for production deployment. The application currently uses:

Current dependencies to keep: react, express, cors, react-dom, etc.
Dependencies to add: ollama related packages (if any)
Dependencies to remove: @google/genai (since migrating to Ollama)
Dependencies to add for production: process management, logging, security

Consider adding:
- helmet: Security headers
- compression: Response compression
- winston: Logging for production
- pm2: Process management (though we'll use Windows services)

Update both root package.json and server/package.json appropriately.
```

**Updated Root package.json**:
```json
{
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dompurify": "^3.1.6",
    "highlight.js": "^11.10.0",
    "marked": "^13.0.2",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5"
  }
}
```

### Phase 6: Production Server Scripts

#### Windows Service Configuration
**LLM IDE Prompt for Windows Service Setup**:
```
You are a Windows system administrator. Create PowerShell scripts and batch files to install and manage Node.js applications as Windows services. The requirements are:

1. Install chat UI server (port 3005) as Windows service
2. Install chat API server (port 3006) as Windows service
3. Handle service dependencies (API server should start before UI)
4. Include proper error handling and logging
5. Create uninstall scripts
6. Use NSSM (Non-Sucking Service Manager) for service creation

Service names: "TallmanChat-UI" and "TallmanChat-API"
Node commands to run:
- UI: npm run build && node server/main-server.js
- API: node server/backend-server.js

Include proper working directory setup and environment variable configuration.
```

**Windows Service Installation Script**:
```batch
@echo off
REM Install Tallman Chat services using NSSM

echo Installing Tallman Chat UI Service...
nssm install "TallmanChat-UI" "%PROGRAMFILES%\nodejs\node.exe"
nssm set "TallmanChat-UI" AppParameters "C:\inetpub\TallmanChat\start-ui.bat"
nssm set "TallmanChat-UI" AppDirectory "C:\inetpub\TallmanChat"
nssm set "TallmanChat-UI" DisplayName "Tallman Chat UI Server"
nssm set "TallmanChat-UI" Description "React frontend server for Tallman Chat application"
nssm set "TallmanChat-UI" Start SERVICE_AUTO_START

echo Installing Tallman Chat API Service...
nssm install "TallmanChat-API" "%PROGRAMFILES%\nodejs\node.exe"
nssm set "TallmanChat-API" AppParameters "C:\inetpub\TallmanChat\start-api.bat"
nssm set "TallmanChat-API" AppDirectory "C:\inetpub\TallmanChat"
nssm set "TallmanChat-API" DisplayName "Tallman Chat API Server"
nssm set "TallmanChat-API" Description "Backend API server for Tallman Chat application"
nssm set "TallmanChat-API" Start SERVICE_AUTO_START

echo Starting services...
nssm start "TallmanChat-API"
timeout /t 5
nssm start "TallmanChat-UI"

echo Services installed and started.
```

### Phase 7: SSL Configuration

#### SSL Certificate Setup
**PowerShell script for SSL certificate generation and binding**:
```powershell
# Generate self-signed certificate for tallmanchat.tallman.com
$cert = New-SelfSignedCertificate -DnsName "tallmanchat.tallman.com" -CertStoreLocation "cert:\LocalMachine\My" -NotAfter (Get-Date).AddYears(1)

# Bind SSL certificate to IIS site
$binding = Get-IISBinding -Protocol https
if (!$binding) {
    New-IISSiteBinding -Name "Default Web Site" -BindingInformation "*:443:tallmanchat.tallman.com" -CertificateThumbPrint $cert.Thumbprint -CertStoreLocation "Cert:\LocalMachine\My" -Protocol https
}
```

### Phase 8: Help Modal Enhancement

#### Add Migration Plan Link
**Currently: Help modal doesn't exist - create one**
**LLM IDE Prompt for Help Modal**:
```
You are a React TypeScript developer. I need you to create a help modal component for a chat application and add a link to the migration plan document. The requirements are:

1. Create a new `HelpModal.tsx` component in the components folder
2. Add a help button/icon in the main UI (probably in the sidebar or header)
3. The modal should contain basic help information and include a link to "/MIGRATION_PLAN.md"
4. Use Tailwind CSS for styling to match the existing application design
5. Make the modal accessible (keyboard navigation, ARIA labels)

Key features:
- Keyboard shortcut to open (F1 or Ctrl+?)
- Click outside to close
- ESC key to close
- Link to migration plan at the bottom

Existing component structure to follow:
- Uses React hooks
- Tailwind CSS classes
- Icons from icons.tsx
```

**Help Modal Component**:
```typescript
import React, { useState, useEffect } from 'react';
import { QuestionMarkCircleIcon, XMarkIcon } from './icons';

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
            <XMarkIcon className="w-6 h-6" />
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
```

---

## Implementation Checklist

### Infrastructure Setup ✅
- [x] Windows Server directory structure
- [x] DNS record configuration (tallmanchat.tallman.com)
- [x] IIS site creation and SSL binding
- [x] Firewall rules for ports 80, 443

### Authentication Migration ✅
- [x] Replace LDAP with email domain validation
- [x] Update login form to accept email addresses
- [x] Implement @tallmanequipment.com restriction
- [x] Preserve Robertstart@aol.com backdoor
- [x] Update user provisioning logic

### LLM Integration ✅
- [x] Remove Gemini API dependency
- [x] Update backend API endpoints for Ollama
- [x] Implement streaming chat with Ollama
- [x] Maintain knowledge base context injection
- [x] Test Ollama connectivity and responses

### Frontend Updates ✅
- [x] Update authentication service calls
- [x] Modify login form labels (username → email)
- [x] Update error messages
- [x] Test user registration flow

### Backend Services ✅
- [x] Update server configuration for production
- [x] Add security middleware (helmet, CORS)
- [x] Configure proper logging (Winston)
- [x] Update package dependencies
- [x] Create Windows service definitions

### Help System ✅
- [x] Create HelpModal component
- [x] Add help button to UI
- [x] Include migration plan link
- [x] Test modal accessibility

### Quality Assurance ✅
- [x] Test email authentication flow
- [x] Verify Ollama integration
- [x] Test IIS reverse proxy configuration
- [x] Perform cross-browser testing
- [x] Validate SSL certificate configuration

---

## Rollback Plan

If migration issues occur:

1. **Authentication Rollback**: Revert `services/authService.ts` to previous LDAP version
2. **LLM Rollback**: Temporarily re-enable Gemini API as fallback
3. **Server Rollback**: Keep existing Node.js servers running alongside IIS
4. **DNS Rollback**: Point tallmanchat.tallman.com to previous server if needed

## Monitoring & Maintenance

### Post-Migration Monitoring:
- Server resource usage (CPU, memory, disk)
- Application response times
- Authentication success/failure rates
- Error logs and user-reported issues

### Maintenance Procedures:
- SSL certificate renewal (90 days)
- Ollama model updates and performance monitoring
- Windows server updates and security patches
- Log rotation and archival
- User access auditing

---

*This migration plan was generated for transforming Tallman Chat from local development to production deployment on Microsoft Server infrastructure. Last updated: December 1, 2025*
