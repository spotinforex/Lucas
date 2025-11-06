import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CopyIcon, CheckCircleIcon } from './icons';

const CodeBlockWithCopy: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    const codeRef = useRef<HTMLElement>(null);

    const handleCopy = () => {
        if (codeRef.current) {
            navigator.clipboard.writeText(codeRef.current.innerText).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    };

    return (
        <div className="relative group">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-gray-700/80 backdrop-blur-sm p-1.5 rounded-md text-xs text-gray-300 hover:bg-gray-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Copy code to clipboard"
            >
                {isCopied ? (
                    <>
                        <CheckCircleIcon className="w-4 h-4 text-green-400" />
                        <span>Copied!</span>
                    </>
                ) : (
                    <>
                        <CopyIcon className="w-4 h-4" />
                        <span>Copy</span>
                    </>
                )}
            </button>
            <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto my-4">
                <code ref={codeRef} className={`text-sm text-yellow-300 ${className || ''}`} {...props}>
                    {children}
                </code>
            </pre>
        </div>
    );
};

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-invert max-w-none text-gray-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return match ? (
                <CodeBlockWithCopy className={className} {...props}>
                    {children}
                </CodeBlockWithCopy>
            ) : (
              <code className="bg-gray-700 text-yellow-400 px-1 py-0.5 rounded-sm text-sm" {...props}>
                {children}
              </code>
            );
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-100">{children}</strong>
          ),
          ul: ({children}) => <ul className="list-disc list-inside space-y-1 my-3 pl-1">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal list-inside space-y-1 my-3 pl-1">{children}</ol>,
          li: ({ children }) => <li className="my-1">{children}</li>,
          p: ({children}) => <p className="mb-4">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
