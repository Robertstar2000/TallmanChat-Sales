// FIX: Add type definitions for the File System Access API to fix compilation errors.
// These interfaces are not yet part of the standard TypeScript DOM library.
// See: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API

// Augment the global Window interface. This is safe to do in a module file.
declare global {
  // Declaration merging will add these properties to the built-in FileSystemFileHandle interface.
  interface FileSystemFileHandle {
    createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    getFile(): Promise<File>;
  }

  interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite';
  }

  interface FileSystemCreateWritableOptions {
    keepExistingData?: boolean;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: BlobPart): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
  }

  interface FilePickerAcceptType {
      description?: string;
      accept: Record<string, string | string[]>;
  }

  interface FilePickerOptions {
    types?: FilePickerAcceptType[];
    excludeAcceptAllOption?: boolean;
    multiple?: boolean;
  }

  interface SaveFilePickerOptions extends FilePickerOptions {
    suggestedName?: string;
  }
  
  interface Window {
    showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
    showOpenFilePicker(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>;
  }
}

export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  role: Role;
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  username: string; // User who owns this chat session
}

export interface ChatHistoryItem {
  id: string;
  title: string;
}

export interface Attachment {
    name: string;
    type: 'image' | 'text';
    content: string; // base64 for image, text content for text
    mimeType: string;
}

// FIX: Added missing KnowledgeItem interface.
export interface KnowledgeItem {
  content: string;
  timestamp: number;
}

// FIX: Added 'hold' and 'request' to UserRole to match its usage in the AdminPage and auth service.
export type UserRole = 'admin' | 'user' | 'hold' | 'request';

export interface User {
  username: string;
  role: UserRole;
  password?: string; // For admin users who need password authentication
  email?: string;   // For UI display
}
