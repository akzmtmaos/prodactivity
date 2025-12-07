export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
}

export interface ChatRoom {
  id: string;
  name: string | null;
  room_type: 'direct' | 'group';
  created_at: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  participants?: User[];
  unread_count?: number;
}

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface Attachment {
  id?: string;
  url: string;
  type: 'image' | 'file';
  name: string;
  size?: number;
  mime_type?: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_edited: boolean;
  is_deleted: boolean;
  sender?: User;
  status?: MessageStatus; // Only for client-side tracking
  attachments?: Attachment[]; // Array of attachments (images/files)
}

