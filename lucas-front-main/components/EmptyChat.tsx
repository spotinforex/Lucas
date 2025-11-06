import React from 'react';
import { LogoIcon } from './icons';

interface EmptyChatProps {
    onExamplePrompt: (prompt: string) => void;
}

const examplePrompts = [
    "Backtest a simple moving average crossover on TSLA",
    "What's the Sharpe ratio for a MACD strategy on AAPL?",
    "Run a RSI strategy on BTC/USD for the last 5 years",
];

const EmptyChat: React.FC<EmptyChatProps> = ({ onExamplePrompt }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 pt-20">
            <LogoIcon className="w-24 h-24 text-gray-700" />
            <h1 className="mt-4 text-3xl font-bold text-gray-500">Welcome to Lucas AI</h1>
            <p className="mt-2 max-w-md">
                Describe your trading strategy in natural language to get started.
                Here are a few examples:
            </p>
            <div className="mt-6 space-y-3 w-full max-w-md">
                {examplePrompts.map((prompt, i) => (
                    <button
                        key={i}
                        onClick={() => onExamplePrompt(prompt)}
                        className="w-full p-3 bg-gray-800 rounded-lg text-left hover:bg-gray-700 transition-colors text-gray-300 text-sm"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default EmptyChat;

