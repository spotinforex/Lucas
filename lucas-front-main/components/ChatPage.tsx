import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession, ImagePayload, Message, MessagePart } from '../types';
import * as api from '../services/api';
import ChatMessage from './ChatMessage';
import { fileToBase64 } from '../utils/file';
import { AttachmentIcon, PlusIcon, SendIcon, TrashIcon, MenuIcon, DownloadIcon, LoaderIcon } from './icons';
import EmptyChat from './EmptyChat';
import ChatMessageSkeleton from './ChatMessageSkeleton';
import { Step } from './ThinkingStepper';
import NetworkWarning from './NetworkWarning';


interface ChatPageProps {
    token: string;
    onSignOut: () => void;
}

const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInDays = Math.floor(diffInSeconds / 86400);

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
};

const initialSteps: Step[] = [
    { name: 'Analyzing Request', status: 'pending' },
    { name: 'Retrieving Market Data', status: 'pending' },
    { name: 'Generating Backtest Script', status: 'pending' },
    { name: 'Running Simulation', status: 'pending' },
    { name: 'Finalizing Report', status: 'pending' }
];

const toolToStepMap: { [key: string]: number } = {
    // This mapping helps us track progress based on backend tool calls
    'data_retriever': 1,
    'code_saver': 2,
    'sandbox_runner': 3,
    'exit_loop': 4,
};

// A custom hook to get the previous value of a prop or state.
const usePrevious = <T,>(value: T) => {
    const ref = useRef<T | undefined>(undefined);
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
};

const ensureMessagesHaveIds = (messages: Omit<Message, 'id'>[]): Message[] => {
    return messages.map(m => ({ ...m, id: (m as Message).id || uuidv4() }));
};


const ChatPage: React.FC<ChatPageProps> = ({ token, onSignOut }) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isResponding, setIsResponding] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [thinkingSteps, setThinkingSteps] = useState<Step[]>([]);
    const [isCreatingSession, setIsCreatingSession] = useState(false);
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prevActiveSessionId = usePrevious(activeSessionId);


    // Persist messages to local storage.
    useEffect(() => {
        if (activeSessionId && prevActiveSessionId === activeSessionId && !historyLoading) {
            localStorage.setItem(`messages_${activeSessionId}`, JSON.stringify(messages));
        }
    }, [messages, activeSessionId, prevActiveSessionId, historyLoading]);


    const createNewSession = useCallback(async () => {
        setIsCreatingSession(true);
        const newId = uuidv4();
        try {
            await api.createOrUpdateSession(token, newId);
            const newSession: ChatSession = {
                id: newId,
                title: `New Chat`,
                createdAt: new Date().toISOString()
            };
            setSessions(prevSessions => {
                const updatedSessions = [newSession, ...prevSessions];
                localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
                return updatedSessions;
            });
            setActiveSessionId(newId);
            setMessages([]);
        } catch (error) {
            console.error("Failed to create new session:", error);
        } finally {
            setIsCreatingSession(false);
        }
    }, [token]);
    
    useEffect(() => {
        const loadedSessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
        setSessions(loadedSessions);
        if (loadedSessions.length > 0) {
            setActiveSessionId(loadedSessions[0].id);
        } else {
            createNewSession();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadActiveSession = useCallback(async (sessionId: string) => {
        setHistoryLoading(true);
        setMessages([]); // Clear previous messages immediately

        const storedMessagesJSON = localStorage.getItem(`messages_${sessionId}`);
        if (storedMessagesJSON) {
            setMessages(ensureMessagesHaveIds(JSON.parse(storedMessagesJSON)));
            setHistoryLoading(false);
            return;
        }

        try {
            const { events } = await api.getSessionHistory(token, sessionId);
            setMessages(ensureMessagesHaveIds(events || []));
        } catch (error) {
            console.error('Failed to fetch session history:', error);
            setMessages([{ id: uuidv4(), role: 'model', parts: [{ text: "Error: Could not load session history." }] }]);
        } finally {
            setHistoryLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (activeSessionId) {
            loadActiveSession(activeSessionId);
        }
    }, [activeSessionId, loadActiveSession]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isResponding, thinkingSteps]);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isOffline || (!input.trim() && !image) || isResponding || !activeSessionId) return;
    
        setIsResponding(true);
        const currentInput = input;
        const currentImageFile = image?.file;
        setInput('');
        setImage(null);
    
        const userParts: MessagePart[] = [];
        if (currentInput.trim()) userParts.push({ text: currentInput });
    
        let imagePayload: ImagePayload | undefined;
        if (currentImageFile) {
            const base64Data = await fileToBase64(currentImageFile);
            imagePayload = { display_name: currentImageFile.name, data: base64Data, mime_type: currentImageFile.type };
            userParts.push({ inlineData: imagePayload });
        }
    
        const userMessage: Message = { id: uuidv4(), role: 'user', parts: userParts };
        
        const streamingId = uuidv4();
        const modelPlaceholder: Message = { id: streamingId, role: 'model', parts: [{ text: '' }] };
        setMessages(prev => [...prev, userMessage, modelPlaceholder]);
        
        if (messages.length === 0 && currentInput.trim()) {
            const newTitle = currentInput.length > 30 ? `${currentInput.substring(0, 27)}...` : currentInput;
            setSessions(prev => {
                const updated = prev.map(s => s.id === activeSessionId ? {...s, title: newTitle} : s);
                localStorage.setItem('chatSessions', JSON.stringify(updated));
                return updated;
            });
        }
    
        setThinkingSteps(initialSteps.map((s, i) => ({ ...s, status: i === 0 ? 'active' : 'pending' })));
        
        let streamEndedGracefully = false;
        let errorReported = false;
    
        await api.sendMessageStream(token, activeSessionId, currentInput, imagePayload, (chunk) => {
            if (chunk.isError) {
                errorReported = true;
                const errorText = `\n\n**Error:**\n\`\`\`\n${chunk.errorText}\n\`\`\``;
                setMessages(currentMessages => currentMessages.map(msg => 
                    msg.id === streamingId 
                        ? { ...msg, parts: [{ text: (msg.parts[0]?.text || '') + errorText }] } 
                        : msg
                ));
                setThinkingSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s));
                return;
            }

            if (chunk.finishReason) streamEndedGracefully = true;
    
            if (chunk.text) {
                setMessages(currentMessages => currentMessages.map(msg => 
                    msg.id === streamingId 
                        ? { ...msg, parts: [{ text: (msg.parts[0]?.text || '') + chunk.text }] }
                        : msg
                ));
            }
            
            if (chunk.functionCall) {
                const toolName = chunk.functionCall.name;
                const stepIndex = toolToStepMap[toolName];
                if (stepIndex !== undefined) {
                    setThinkingSteps(prev => prev.map((step, i) => {
                        if (i < stepIndex) return { ...step, status: 'completed' };
                        if (i === stepIndex) return { ...step, status: 'active' };
                        return step;
                    }));
                }
            }
        });
    
        if (!streamEndedGracefully && !errorReported) {
            const interruptionWarning = `\n\n---\n\n*The connection was interrupted, and the response may be incomplete. Please check your network and try sending your message again.*`;
            setMessages(currentMessages => currentMessages.map(msg => 
                msg.id === streamingId 
                    ? { ...msg, parts: [{ text: (msg.parts[0]?.text || '') + interruptionWarning }] }
                    : msg
            ));
        }

        setIsResponding(false);
        setThinkingSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
        setTimeout(() => setThinkingSteps([]), 1500);
    };
    
    
    const handleDeleteSession = async (e: React.MouseEvent, sessionIdToDelete: string) => {
        e.stopPropagation();
        if (deletingSessionId || !window.confirm("Are you sure you want to delete this chat?")) return;

        setDeletingSessionId(sessionIdToDelete);
        try {
            await api.deleteSession(token, sessionIdToDelete);
            const updatedSessions = sessions.filter(s => s.id !== sessionIdToDelete);
            setSessions(updatedSessions);
            localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
            localStorage.removeItem(`messages_${sessionIdToDelete}`);

            if (activeSessionId === sessionIdToDelete) {
                if (updatedSessions.length > 0) {
                    setActiveSessionId(updatedSessions[0].id);
                } else {
                    createNewSession();
                }
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
        } finally {
            setDeletingSessionId(null);
        }
    };
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage({ file, preview: URL.createObjectURL(file) });
        }
    };

    const handleExamplePrompt = (prompt: string) => {
        setInput(prompt);
    };

    const handleExportChat = () => {
        if (!activeSessionId) return;

        const session = sessions.find(s => s.id === activeSessionId);
        if (!session) return;

        const header = `# Chat: ${session.title}\n\n---\n\n`;

        const formattedMessages = messages.map(msg => {
            const author = msg.role === 'user' ? 'You' : 'Lucas AI';
            const content = msg.parts.map(part => {
                if (part.text) return part.text;
                if (part.inlineData) return `[Image: ${part.inlineData.display_name}]`;
                return '';
            }).join('\n\n');
            return `**${author}:**\n\n${content}`;
        }).join('\n\n---\n\n');

        const markdownContent = header + formattedMessages;

        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });

        const sanitizedTitle = session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `lucas-ai-chat-${sanitizedTitle || 'export'}.md`;

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className="relative flex h-screen bg-gray-900 text-gray-200 overflow-hidden">
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-80 bg-gray-800 flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex-shrink-0`}>
                <div className="p-4 border-b border-gray-700">
                    <button 
                        onClick={() => { createNewSession(); setIsSidebarOpen(false); }} 
                        disabled={isCreatingSession}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:bg-blue-800 disabled:cursor-not-allowed"
                    >
                        {isCreatingSession ? (
                            <>
                                <LoaderIcon className="w-5 h-5 animate-spin" />
                                <span>Creating...</span>
                            </>
                        ) : (
                            <>
                                <PlusIcon className="w-5 h-5" />
                                New Chat
                            </>
                        )}
                    </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => {
                                setActiveSessionId(session.id);
                                setIsSidebarOpen(false);
                            }}
                            className={`p-3 rounded-lg cursor-pointer group flex justify-between items-center transition-colors ${activeSessionId === session.id ? 'bg-blue-500/30' : 'hover:bg-gray-700'}`}
                        >
                            <div className="flex-1 truncate pr-2">
                                <p className="font-semibold text-sm text-gray-200 truncate">{session.title}</p>
                                <p className="text-xs text-gray-400">{formatRelativeTime(session.createdAt)}</p>
                            </div>
                             <button 
                                onClick={(e) => handleDeleteSession(e, session.id)} 
                                disabled={deletingSessionId === session.id}
                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 disabled:opacity-100"
                             >
                                {deletingSessionId === session.id ? (
                                    <LoaderIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <TrashIcon className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-700">
                    <button onClick={onSignOut} className="w-full text-left text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors">
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col">
                <header className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 hover:text-white p-2 -ml-2 lg:hidden">
                            <span className="sr-only">Open menu</span>
                            <MenuIcon className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg font-semibold truncate">
                            {sessions.find(s => s.id === activeSessionId)?.title || 'New Chat'}
                        </h1>
                    </div>
                    <button onClick={handleExportChat} className="text-gray-400 hover:text-white p-2" aria-label="Export chat" title="Export Chat">
                        <DownloadIcon className="w-6 h-6" />
                    </button>
                </header>

                {isOffline && <NetworkWarning />}

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto">
                        {historyLoading ? (
                           <div className="space-y-6">
                               <ChatMessageSkeleton />
                               <ChatMessageSkeleton role="model" />
                               <ChatMessageSkeleton />
                           </div>
                        ) : messages.length === 0 && !isResponding ? (
                           <EmptyChat onExamplePrompt={handleExamplePrompt} />
                        ) : (
                            messages.map((msg, index) => {
                                const isLastMessage = index === messages.length - 1;
                                const isCurrentlyStreaming = isLastMessage && isResponding;
                                return (
                                    <ChatMessage 
                                        key={msg.id} 
                                        message={msg}
                                        isStreaming={isCurrentlyStreaming}
                                        thinkingSteps={isCurrentlyStreaming ? thinkingSteps : undefined}
                                    />
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
                <div className="p-6 bg-gray-900 border-t border-gray-700">
                    <div className="max-w-4xl mx-auto">
                        <form onSubmit={handleSendMessage} className="relative">
                            {image && (
                                <div className="absolute bottom-full mb-2 bg-gray-700 p-2 rounded-lg shadow-lg">
                                    <img src={image.preview} alt="upload preview" className="h-20 w-20 object-cover rounded"/>
                                    <button type="button" onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 transition-colors" aria-label="Remove image">X</button>
                                </div>
                            )}
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e as any);
                                    }
                                }}
                                placeholder="Describe your trading strategy..."
                                disabled={isResponding || isOffline}
                                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg py-3 pl-12 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
                                rows={1}
                                aria-label="Chat input"
                            />
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/*"
                                className="hidden"
                                aria-hidden="true"
                            />
                             <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isResponding || isOffline} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50" aria-label="Attach image">
                                <AttachmentIcon className="w-6 h-6" />
                            </button>
                            <button type="submit" disabled={isResponding || (!input.trim() && !image) || isOffline} className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 p-2 rounded-full disabled:bg-blue-800 disabled:cursor-not-allowed" aria-label="Send message">
                                <SendIcon className="w-5 h-5 text-white" />
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ChatPage;
