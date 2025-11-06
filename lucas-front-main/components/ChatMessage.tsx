import React from 'react';
import { Message } from '../types';
import { BotIcon, UserIcon } from './icons';
import ThinkingStepper, { Step } from './ThinkingStepper';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatMessageProps {
    message: Message;
    isStreaming?: boolean;
    thinkingSteps?: Step[];
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming = false, thinkingSteps }) => {
    const isUser = message.role === 'user';
    
    return (
        <div className={`flex items-start gap-4 py-6 ${isUser ? '' : 'bg-gray-800/50'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-700`}>
                {isUser ? <UserIcon className="w-5 h-5 text-gray-400" /> : <BotIcon className="w-5 h-5 text-blue-400" />}
            </div>
            <div className="flex-1 pt-1 overflow-hidden">
                <div className="font-bold text-gray-300">{isUser ? 'You' : 'Lucas AI'}</div>
                <div className="mt-2 text-gray-300 space-y-4 text-sm leading-relaxed">
                    {isStreaming ? (
                        <>
                            <ThinkingStepper steps={thinkingSteps || []} />
                            {message.parts[0]?.text && (
                                <div className="mt-4 border-t border-gray-700 pt-4">
                                     <MarkdownRenderer content={message.parts[0].text} />
                                </div>
                            )}
                        </>
                    ) : (
                        (message.parts || []).map((part, index) => (
                            <div key={index}>
                                {part.text && <MarkdownRenderer content={part.text} />}
                                {part.inlineData && (
                                    <img
                                        src={`data:${part.inlineData.mime_type};base64,${part.inlineData.data}`}
                                        alt={part.inlineData.display_name}
                                        className="max-w-xs rounded-lg mt-2 border border-gray-600"
                                    />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatMessage;
