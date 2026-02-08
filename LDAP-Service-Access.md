# LDAP Service Access Guide - Complete Implementation

## 🎯 **LDAP Implementation Summary**

This document captures the complete LDAP authentication implementation learned through extensive troubleshooting and testing. The system now provides reliable Active Directory authentication with multiple fallback mechanisms.

---

## 🏢 **Active Directory Configuration**

### **Server Details**
- **AD Server**: `10.10.20.253`
- **Port**: `389` (LDAP)
- **Base DN**: `DC=tallman,DC=com`
- **Domain**: `Tallman.com`

### **Service Account Credentials**
- **Bind DN**: `LDAP@Tallman.com`
- **Password**: `ebGGAm77kk`
- **Format**: User Principal Name (UPN)
- **Permissions**: Read access to Active Directory

### **Authentication Methods Supported**

#### Primary Method: Direct Binding (✅ **RECOMMENDED**)
- **Format**: `Tallman\Username` (e.g., `Tallman\BobM`)
- **Advantage**: Simple, fast, no service account search required
- **Used For**: User authentication in application

#### Alternative Methods: Search & DN Bind
- **Step 1**: Service account binds and searches for user DN
- **Step 2**: Binds directly with user's full DN
- **Status**: ⚠️ More complex, requires additional permissions

### **Test Credentials (Verified Working)**
- **Username**: `BobM` or `Tallman\BobM` or `BobM@Tallman.com`
- **Password**: `Rm2214ri#`
- **Admin User**: `robertstar@aol.com` (backdoor admin)
- **Admin Password**: `Rm2214ri#`

---

## 🖥️ **Application Architecture**

### **Backend LDAP Service** (`server/ldap-auth.js`)
- **Host**: `http://localhost:3100`
- **Technology**: Node.js + Express + ldapjs
- **Authentication**: Direct binding + DN binding fallbacks

### **Complete System Architecture**

#### **Service Architecture:**
- **Frontend**: `http://localhost:3200` (React + Vite dev server)
- **Backend API**: `http://localhost:3210` (Main API server with OpenAI)
- **LDAP Auth**: `http://localhost:3100` (LDAP authentication service)

#### **API Endpoints** (All available on port 3210)
```bash
# Authentication
GET  /api/health                    # Service health check
POST /api/auth/login                # LDAP User authentication
GET  /api/ldap-test                 # LDAP connectivity test

# Chat & AI
POST /api/openai/chat               # AI chat completion
POST /api/chat/send                 # Send chat message
POST /api/chat/stream               # Streaming chat

# Knowledge Base
GET  /api/knowledge                 # Get all knowledge
POST /api/knowledge                 # Add knowledge item
DELETE /api/knowledge              # Clear knowledge base

# User Management
GET  /api/users                     # Get users
POST /api/users                     # Add user
DELETE /api/users/:username         # Delete user
```

#### **Frontend Application** (`components/LoginPage.tsx`)
- **Technology**: React + Vite
- **Proxy Configuration**: `/api/*` → `http://localhost:3210`
- **Login Flow**: UI → Backend API → LDAP Service → Active Directory

#### **Authentication Service** (`services/authService.ts`)
- **Primary Method**: LDAP authentication via `/api/auth/login`
- **Fallback**: Backdoor access for `robertstar@aol.com` (admin)
- **User Processing**: Handles domain prefixes and admin elevation

---

## 🧪 **Comprehensive Testing Procedures**

### **1. Network Connectivity Test**
```bash
# Test basic TCP connection to LDAP port
node test-ldap-port.cjs
# ✅ Should show: "Connection to 10.10.20.253:389 was successful"
```

### **2. Service Account Test**
```bash
# Test service account binding
node test-service-account.cjs
# ✅ Should show: "SERVICE ACCOUNT BIND SUCCESS!"
```

### **3. Direct User Authentication Test**
```bash
# Test user authentication with direct binding
node test-basic-ldap.cjs
# ✅ Should show: "AUTHENTICATION SUCCESS!"
```

### **4. API Server Test**
```bash
# Test full API authentication
node test-auth.cjs
# ✅ Should return: 200 OK with authenticated: true
```

### **5. End-to-End Web Test**
```bash
# Start development servers
npm run dev  # Frontend on :3200
# LDAP server should already be running on :3100

# Then test the web interface:
# 1. Navigate to http://localhost:3200
# 2. Login with: BobM / Rm2214ri#
# 3. Should redirect to chat application
```

### **6. Debug Tests**
```bash
# Debug the exact API server logic
node test-debug-auth.cjs

# Test various service account formats
node test-service-variations.cjs
```

---

## 📋 **Configuration Evolution**

### **❌ Failed Configurations**
- `baseDN: 'DC=Tallman,DC=com'` (mixed case - failed)
- `bindDN: 'CN=LDAP,CN=Users,DC=Tallman,DC=com'` (wrong container)
- `bindDN: 'CN=LDAP,DC=Tallman,DC=com'` (wrong DN format)
- DNS-based fallbacks: `DC02`, `dc02.Tallman.com` (unreachable)

### **✅ Working Configuration**
- `baseDN: 'DC=tallman,DC=com'` (lowercase Active Directory standard)
- `bindDN: 'LDAP@Tallman.com'` (UPN format - proven to work)
- `server: '10.10.20.253'` (IP-based - reliable, no DNS issues)
- **Authentication**: Direct binding first, DN binding as fallback

### **⚠️ DNS Issues Discovered**
DNS-based server names (`DC02`, `dc02.Tallman.com`) fail authentication even if resolvable, suggesting AD policy restrictions or DNS resolution issues in the environment.

---

## 🔧 **Advanced Troubleshooting Guide**

### **Problem: "Authentication failed on all LDAP servers"**

**Step 1: Verify Network Connectivity**
```bash
node test-ldap-port.cjs
# If this fails → Network/firewall issue
```

**Step 2: Verify Service Account**
```bash
node test-service-account.cjs
# If this fails → Service account issue (credentials/permissions)
```

**Step 3: Verify User Credentials**
```bash
node test-basic-ldap.cjs
# If this fails → User doesn't exist or password wrong
```

**Step 4: Verify API Configuration**
```bash
node test-auth.cjs
# If this fails → Backend API or proxy issue
```

### **Problem: "User not found" (From Debug Tests)**

**Root Cause**: Service account lacks search permissions or base DN scope
**Solution**: Use direct binding instead (implemented in working version)

### **Problem: Windows Service Won't Restart**

**Symptom**: `sc stop/start` commands fail with access denied
**Solution**: Use administrator PowerShell or run Node.js directly
```bash
# As Administrator:
sc stop TallmanLDAPAuthService
timeout /t 5
sc start TallmanLDAPAuthService
```

### **Problem: Proxy Returns 401**

**Root Cause**: Frontend proxy not reaching backend
- Check Vite server is running
- Check LDAP backend is listening on 3100
- Check vite.config.ts proxy settings

---

## 📊 **Authentication Flow Diagrams**

### **Working Direct Binding Flow:**
```
1. User enters: BobM
2. Format as: Tallman\BobM
3. LDAP Bind: Tallman\BobM + password
4. AD Server: 10.10.20.253:389
5. Result: ✅ Success → Return user object
```

### **Complex DN Binding Flow (Fallback):**
```
1. Service account binds: LDAP@Tallman.com
2. Service account searches: (sAMAccountName=BobM)
3. Get user's DN from AD
4. Bind with user's DN + password
5. Return authentication result
```

### **Web Application Flow:**
```
Login Form → authService.login()
        ↓
    API Call → /api/ldap-auth
        ↓
    Proxy → localhost:3100
        ↓
    LDAP Server → Active Directory
        ↓
    Success → User Object → Login Complete
```

---

## 🛠️ **Implementation Best Practices**

### **1. Multiple Authentication Methods**
Implement both direct binding and service-account-search for maximum compatibility.

### **2. Environment Variables**
Use `.env.local` for LDAP configuration:
```
LDAP=10.10.20.253
LDAP_SERVICE_HOST=10.10.20.253
LDAP_SERVICE_PORT=3100
```

### **3. Error Handling**
Always provide fallback authentication methods and detailed error messages.

### **4. Testing Strategy**
- Test network connectivity separately
- Test service account authentication
- Test user credentials independently
- Test full API integration

### **5. DNS vs IP**
Prefer IP addresses over DNS names for reliability in restricted environments.

### **6. Service Management**
Keep Windows services as option but provide direct Node.js fallback for development.

---

## ⚡ **Quick Reference**

### **Final Service Configuration:**
- **Frontend React App**: `http://localhost:3200` (Vite dev server)
- **Backend API Server**: `http://localhost:3210` (Main API with OpenAI)
- **LDAP Auth Server**: `http://localhost:3100` (LDAP authentication)
- **Production UI Server**: `http://localhost:3220` (Built React app & proxy)

### **Start Development Environment:**
```bash
# Terminal 1 - Frontend (React/Vite)
npm run dev  # Runs on port 3200

# Terminal 2 - Backend API (Node.js)
node server/backend-server.js  # Runs on port 3210

# Terminal 3 - LDAP Authentication (Node.js)
node server/ldap-auth.js  # Runs on port 3100

# For Windows services (alternative):
# net start TallmanLDAPAuthService  # Port 3100
# net start backend-server service  # Port 3210

# Test application at: http://localhost:3200
```

### **Complete Test Sequence:**
```bash
# 1. Verify service ports
netstat -ano | findstr ":3200"  # Frontend
netstat -ano | findstr ":3210"  # Backend API
netstat -ano | findstr ":3100"  # LDAP Auth

# 2. Test network connectivity
node test-ldap-port.cjs  # Should connect to 10.10.20.253:389

# 3. Test LDAP service account
node test-service-account.cjs  # Should bind successfully

# 4. Test user authentication
node test-basic-ldap.cjs  # Should authenticate Tallman\BobM

# 5. Test API integration
node test-auth.cjs  # Should return authenticated: true

# 6. Test complete application
# Open http://localhost:3200
# Login with: BobM / Rm2214ri#
# Should access chat application as admin
```

### **Configuration Files:**
- **Frontend**: `vite.config.ts` (proxy to 3210), `components/LoginPage.tsx`
- **Backend API**: `server/backend-server.js` (port 3210), `services/authService.ts`
- **LDAP Auth**: `server/ldap-auth.js` (port 3100)
- **Environment**: `.env.local` (LDAP server configuration)
- **Windows Services**: `install-new-service.bat` (NSSM service wrappers)

---

## 🎯 **Success Metrics**

- ✅ **Direct Binding**: `Tallman\BobM` authenticates successfully
- ✅ **API Integration**: Frontend ↔ Backend communication works
- ✅ **Proxy Setup**: Vite forwards `/api` correctly
- ✅ **Service Account**: `LDAP@Tallman.com` binds successfully
- ✅ **Error Recovery**: Comprehensive fallback mechanisms
- ✅ **Documentation**: Complete troubleshooting guide

**LDAP authentication is now fully operational and thoroughly documented! 🚀**
