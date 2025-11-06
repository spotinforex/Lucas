import { createClient } from '@supabase/supabase-js';
import { User } from '../types';

// Hardcoded Supabase credentials as requested.
const SUPABASE_URL = 'https://dvcxciqsgujxowndcgdu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2Y3hjaXFzZ3VqeG93bmRjZ2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwOTg3MzUsImV4cCI6MjA3NDY3NDczNX0.nTxaKhakKkVdwJwNxTihuPYsjDH2yhWAa0RqjGAVoCw';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const rootEl = document.getElementById('root');
    if (rootEl) {
        rootEl.innerHTML = `
            <div style="font-family: sans-serif; padding: 2rem; color: white; background-color: #1a202c; height: 100vh;">
                <h1 style="font-size: 1.5rem; font-weight: bold; color: #e53e3e;">Configuration Error</h1>
                <p style="margin-top: 1rem;">Supabase client is not configured.</p>
            </div>
        `;
    }
    throw new Error("Supabase URL and Anon Key are missing.");
}


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getUser = async (): Promise<User | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Error getting user:', error);
        return null;
    }
    return data.user;
};

export const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error getting session:', error);
        return null;
    }
    return data.session;
};
