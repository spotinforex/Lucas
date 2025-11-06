import React from 'react';
import { WifiOffIcon } from './icons';

const NetworkWarning: React.FC = () => {
    return (
        <div role="alert" className="bg-yellow-900/50 border-t border-b border-yellow-400/30 text-yellow-300 px-4 py-2 text-sm flex items-center justify-center gap-3 animate-pulse-slow">
            <style>
                {`
                    @keyframes pulse-slow {
                        50% { opacity: .7; }
                    }
                    .animate-pulse-slow {
                        animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    }
                `}
            </style>
            <WifiOffIcon className="w-5 h-5 flex-shrink-0" />
            <p>
                <strong>Connection Issue:</strong> You appear to be offline. Messages may not send, and new data cannot be loaded.
            </p>
        </div>
    );
};

export default NetworkWarning;

