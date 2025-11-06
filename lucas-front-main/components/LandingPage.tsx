import React from 'react';
import { LogoIcon } from './icons';

interface LandingPageProps {
    onGetStarted: () => void;
}

const FeatureCard: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({ title, description, icon }) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="mt-2 text-gray-400">{description}</p>
    </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    return (
        <div className="bg-gray-900 min-h-screen text-white">
            <header className="container mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <LogoIcon className="w-8 h-8 text-blue-500" />
                    <span className="text-2xl font-bold">Lucas</span>
                </div>
                <button
                    onClick={onGetStarted}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
                >
                    Sign In
                </button>
            </header>

            <main>
                <section className="text-center container mx-auto px-6 py-24">
                    <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-4">
                        Backtest Trading Strategies with <span className="text-blue-500">Natural Language</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
                        Stop coding, start conversing. Describe your trading ideas, and let Lucas provide instant, in-depth backtesting analysis and results.
                    </p>
                    <button
                        onClick={onGetStarted}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-transform duration-300 transform hover:scale-105"
                    >
                        Get Started for Free
                    </button>
                </section>

                <section id="features" className="bg-gray-800/50 py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-bold">Why Lucas?</h2>
                            <p className="text-gray-400 mt-2">The future of algorithmic trading is conversational.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                title="Natural Language Prompts"
                                description="No complex scripting. Just describe your strategy in plain English and get results."
                            />
                             <FeatureCard 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
                                title="Lightning-Fast Analysis"
                                description="Leverage powerful cloud infrastructure to get backtesting results in seconds, not hours."
                            />
                             <FeatureCard 
                                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>}
                                title="Comprehensive Reports"
                                description="Receive detailed reports including key metrics like Sharpe ratio, max drawdown, and more."
                            />
                        </div>
                    </div>
                </section>
            </main>

            <footer className="container mx-auto px-6 py-8 text-center text-gray-500">
                <p>&copy; {new Date().getFullYear()} Lucas AI. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
