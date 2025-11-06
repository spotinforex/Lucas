import React from 'react';

interface ChatMessageSkeletonProps {
    role?: 'user' | 'model';
}

const ChatMessageSkeleton: React.FC<ChatMessageSkeletonProps> = ({ role = 'user' }) => {
    const isUser = role === 'user';
    return (
        <div className={`flex items-start gap-4 py-6 animate-pulse ${!isUser ? 'bg-gray-800/50' : ''}`}>
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700"></div>
            <div className="flex-1 pt-1 space-y-3">
                <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            </div>
        </div>
    );
};

export default ChatMessageSkeleton;

