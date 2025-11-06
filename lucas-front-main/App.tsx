import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session, User } from './types';
import { supabase, getSession } from './services/supabase';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage';

type AuthContextType = {
    session: Session | null;
    user: User | null;
};

const AuthContext = createContext<AuthContextType>({ session: null, user: null });

export const useAuth = () => useContext(AuthContext);

const App: React.FC = () => {
    const [page, setPage] = useState<'landing' | 'auth' | 'chat'>('landing');
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            const currentSession = await getSession();
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            if (currentSession) {
                setPage('chat');
            }
            setLoading(false);
        };
        
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session) {
                setPage('chat');
            } else {
                setPage('landing');
            }
        });

        return () => subscription.unsubscribe();
    }, []);
    
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setPage('landing');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }
    
    const renderPage = () => {
        switch (page) {
            case 'landing':
                return <LandingPage onGetStarted={() => setPage('auth')} />;
            case 'auth':
                return <AuthPage onBackToLanding={() => setPage('landing')} />;
            case 'chat':
                if (session) {
                    return <ChatPage token={session.access_token} onSignOut={handleSignOut} />;
                }
                setPage('auth'); // Fallback if session is somehow null
                return <AuthPage onBackToLanding={() => setPage('landing')} />;
            default:
                return <LandingPage onGetStarted={() => setPage('auth')} />;
        }
    };

    return (
        <AuthContext.Provider value={{ session, user }}>
            {renderPage()}
        </AuthContext.Provider>
    );
};

export default App;
