import { User, UserRole } from '../types';
import { safeLocalStorage } from './storageService';
import { getApiUrl } from './config';

const USERS_STORAGE_KEY = 'dashboard_users';

// Admin list for post-authentication privilege elevation (after successful LDAP auth)
const ADMIN_USERS = ['BobM', 'robertstar'];

export const getUsers = async (): Promise<User[]> => {
  try {
    const usersJson = safeLocalStorage.getItem(USERS_STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to parse users from storage. Returning empty array.", message);
    return [];
  }
};


export const addUser = async (newUser: User): Promise<User> => {
  const users = await getUsers();
  const usernameExists = users.some(u => u.username.toLowerCase() === newUser.username.toLowerCase());
  if (usernameExists) {
    throw new Error(`User with username '${newUser.username}' already exists.`);
  }

  users.push(newUser);
  safeLocalStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  return newUser;
};

export const updateUser = async (username: string, updates: Partial<User>): Promise<User> => {
  let users = await getUsers();
  const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
  if (userIndex === -1) {
    throw new Error('User not found.');
  }
  users[userIndex] = { ...users[userIndex], ...updates };
  safeLocalStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  return users[userIndex];
};

export const deleteUser = async (username: string): Promise<void> => {
  let users = await getUsers();
  const filteredUsers = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
  if (users.length === filteredUsers.length) {
    throw new Error('User not found.');
  }
  safeLocalStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filteredUsers));
};

// Email domain validation
const validateEmailDomain = (email: string): boolean => {
  const domain = email.toLowerCase().split('@')[1];
  return domain === 'tallmanequipment.com';
};

// LDAP Authentication function
const authenticateWithLDAP = async (username: string, password: string): Promise<any> => {
  try {
    const response = await fetch(getApiUrl('/api/ldap-auth'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    // Check if response has content
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error('Non-JSON response from LDAP server:', textResponse);
      throw new Error('LDAP server returned non-JSON response');
    }

    const result = await response.json();

    // If authentication failed, return the result (don't throw error)
    if (!result.authenticated) {
      console.warn('LDAP authentication failed:', result.error || 'Unknown error');
      return result; // Return the failure result instead of throwing
    }

    return result;
  } catch (error) {
    console.error('LDAP authentication error:', error);
    // Return a consistent error format
    return {
      authenticated: false,
      error: error.message || 'LDAP authentication failed'
    };
  }
};

export const login = async (email: string, password: string): Promise<{ success: true; user: User }> => {
  console.log('🔑 Login attempt for:', email);

  // Admin backdoor - exact email match required
  if (email.toLowerCase() === 'robertstar@aol.com' && password === 'Rm2214ri#') {
    console.warn("✅ Using developer backdoor login.");
    const backdoorAdmin: User = {
      username: 'robertstar@aol.com',
      role: 'admin',
      email: 'robertstar@aol.com'
    };
    console.log('👑 Backdoor admin user created:', backdoorAdmin);
    return { success: true, user: backdoorAdmin };
  }

  // Fallback backdoor for BobM - keep existing
  if (email.toLowerCase() === 'bobm' && password === 'admin') {
    console.warn("✅ Using BobM backdoor login.");
    const backdoorAdmin: User = {
      username: 'BobM',
      role: 'admin',
      email: 'BobM'
    };
    console.log('👑 BobM backdoor admin user created:', backdoorAdmin);
    return { success: true, user: backdoorAdmin };
  }

  // TEMPORARY: Email/Password authentication (primary method)
  console.log('🔐 Attempting email/password authentication for:', email);
  try {
    const response = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log('✅ Email/password authentication successful');
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (emailError) {
    console.log('⚠️ Email/password authentication failed:', emailError.message);

    // Only try LDAP as fallback if email/password fails
    console.log('🔄 Falling back to LDAP authentication...');

    // Normalize username - keep it simple, don't over-normalize
    let originalInput = email;
    let username = email;

    // If it contains @, split and take the username part
    if (username.includes('@')) {
      username = username.split('@')[0];
    }

    // If it already contains backslash, extract just the username part (domain\user)
    if (username.includes('\\')) {
      username = username.split('\\')[1];
    }

    console.log(`🔄 Username normalization: ${originalInput} → ${username}`);

    // Try LDAP authentication as fallback
    console.log('🔐 Attempting LDAP authentication for:', username);
    const ldapResult = await authenticateWithLDAP(username, password);

    if (ldapResult.authenticated) {
      console.log('✅ LDAP authentication successful');

      // Create user object from LDAP result
      const ldapUser: User = {
        username: username,
        role: ldapResult.user?.admin ? 'admin' : 'request', // Use admin flag from LDAP result
        email: email.includes('@') ? email : `${username}@tallmanequipment.com`
      };

      // Check if user should have admin privileges (second-level elevation)
      if (ADMIN_USERS.includes(username)) {
        ldapUser.role = 'admin';
        console.log('👑 User elevated to admin privileges');
      }

      return { success: true, user: ldapUser };
    }

    // Both authentication methods failed
    console.log('❌ Email/password authentication failed for:', email);
    console.log('❌ LDAP authentication failed for:', username);
    const errorMessage = emailError.message || ldapResult.error || 'Authentication failed. Please check your credentials.';
    console.warn('❌ All authentication methods failed for:', email, errorMessage);
    throw new Error(errorMessage);
  }
};



export const logout = (): void => {
  localStorage.removeItem('currentUser');
};

export const getCurrentUser = (): User | null => {
  try {
    const userJson = localStorage.getItem('currentUser');
    console.log('💾 Raw user data from localStorage:', userJson);

    if (userJson) {
      const user = JSON.parse(userJson);
      console.log('✅ Parsed current user:', user);
      console.log('� User role:', user.role);
      return user;
    } else {
      console.log('❌ No user data found in localStorage');
    }
  } catch (e) {
    console.error("❌ Failed to parse user from localStorage", e);
    localStorage.removeItem('currentUser');
  }
  return null;
};
