import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

export type User = SupabaseUser;
export type Session = SupabaseSession;

export type MessageRole = 'user' | 'model';

export interface MessagePart {
    text?: string;
    inlineData?: {
        display_name: string;
        data: string; // base64 encoded
        mime_type: string;
    };
}

export interface Message {
    id: string;
    role: MessageRole;
    parts: MessagePart[];
}

export interface ChatSession {
    id: string;
    title: string;
    createdAt: string;
}

export interface ImagePayload {
    display_name: string;
    data: string; // base64
    mime_type: string;
}
