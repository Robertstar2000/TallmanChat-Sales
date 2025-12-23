# Tallman Chat - Windows Service Deployment

This guide explains how to deploy **Tallman Chat** as a Windows service on Windows Server using NSSM (Non-Sucking Service Manager).

## Prerequisites

### 1. Node.js
- Download and install Node.js from https://nodejs.org/
- Recommended: LTS version (currently 20.x)

### 2. NSSM (Non-Sucking Service Manager)
- Download from https://nssm.cc/download
- Extract `nssm.exe` to a folder in your PATH, or to the Tallman Chat directory
- NSSM handles running Node.js applications as Windows services

### 3. Administrator Access
- Service installation requires administrator privileges
- Run Command Prompt or PowerShell as Administrator

## Quick Deployment

### Step 1: Prepare the Application
```cmd
# Navigate to the application directory
cd C:\path\to\tallman-chat

# Install dependencies
npm install
```

### Step 2: Install as Windows Service
```cmd
# Run the installer script
install-service.bat
```
This will:
- Install the service as "TallmanChat"
- Build the production application
- Configure auto-start and restart behavior
- Start the service automatically

### Step 3: Access the Application
Once installed and running, access Tallman Chat at:
- **http://localhost:3001** (when accessing from the server)
- **http://[server-ip]:3001** (when accessing from other machines)

## Service Management

### Start/Stop/Restart Service
```cmd
# Start the service
net start TallmanChat

# Stop the service
net stop TallmanChat

# Restart the service
net stop TallmanChat
net start TallmanChat
```

### Check Service Status
In Windows Services Manager (`services.msc`):
1. Find "Tallman Chat" in the service list
2. Check "Status" column for running status
3. Use right-click context menu for start/stop/restart

### View Service Logs
```cmd
# Using NSSM (shows stdout/stderr)
nssm view TallmanChat AppStdout
nssm view TallmanChat AppStderr

# Using Windows Event Viewer
# Look under "Windows Logs" -> "Application"
```

## Configuration

### Service Name
By default, the service is installed as "TallmanChat". To use a different name:
```cmd
# Install with custom name
install-service.bat MyServiceName

# When using custom name, remember to use it in all service commands:
net start MyServiceName
net stop MyServiceName
```

### Port Configuration
The service runs on port 3001 by default. To change:
1. Stop the service: `net stop TallmanChat`
2. Modify `server/production-server.js` and change `PORT` variable
3. Rebuild and restart: `npm run service`

### Automatic Updates
To deployupdates:
```cmd
# Stop service
net stop TallmanChat

# Build new version
npm run build

# Start service
net start TallmanChat
```

## Troubleshooting

### Service Won't Start
1. Check Node.js installation: `node --version`
2. Verify NSSM is in PATH: `nssm version`
3. Check application logs: `nssm view TallmanChat AppStderr`
4. Verify port 3001 is not in use by another service

### Application Not Accessible
1. Check if service is running: `net start TallmanChat`
2. Verify firewall settings allow port 3001
3. Check if another application is using the port: `netstat -ano | findstr :3001`

### Build Failures
```cmd
# Manual build and test
npm run build
npm run start
```
Check for TypeScript compilation errors or missing dependencies.

### LDAP Authentication Issues
Tallman Chat uses simulated LDAP authentication by default:
- Any username/password combination is accepted for authentication
- User authorization is controlled through the admin panel
- Default admin user: `BobM`

### Database Issues
User data and knowledge base are stored locally in IndexedDB (browser) and LocalStorage.
- No separate database setup required
- Data persists between service restarts

## Security Considerations

### Service Account
The service runs under LocalSystem by default:
- Full local privileges
- Limited network access
- Consider creating a dedicated service account for better security

### Network Security
- Ensure port 3001 is properly firewalled
- Use HTTPS in production (add reverse proxy like IIS or nginx)
- Consider IP restrictions if needed

### Application Security
- Default admin credentials should be changed after first login
- Regular updates of Node.js and npm packages
- Monitor Windows event logs for security events

## File Structure
```
tallman-chat/
├── server/                  # Production server
│   ├── production-server.js # Main service file
│   ├── ldap-auth.js         # Legacy LDAP server
│   └── package.json         # Server dependencies
├── dist/                    # Built application (generated)
├── components/             # React components
├── services/               # Frontend services
├── install-service.bat     # Service installer
├── uninstall-service.bat   # Service uninstaller
├── package.json            # Main dependencies
└── vite.config.ts          # Vite configuration
```

## Support

For issues with the application:
1. Check service status and logs
2. Verify all prerequisites are installed
3. Test manual build: `npm run build && npm run start`
4. Contact Tallman Equipment IT support

For NSSM-specific issues:
- NSSM documentation: https://nssm.cc/usage
- NSSM GitHub issues: https://github.com/kirillkovalenko/nssm/issues
