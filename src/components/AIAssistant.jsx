import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { generateVAResponse } from '../utils/aiService';
import { Sparkles, X, Send, Trash2 } from 'lucide-react';

// Simple markdown renderer for AI responses
function renderMarkdown(text) {
    if (!text) return '';
    return text
        // Code blocks (```code```)
        .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-black/20 rounded-lg p-2.5 my-1.5 overflow-x-auto text-xs font-mono leading-relaxed"><code>$2</code></pre>')
        // Inline code (`code`)
        .replace(/`([^`]+)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
        // Bold (**text**)
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        // Italic (*text*)
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Bullet points (- item or * item or • item)
        .replace(/^[\-\*•]\s+(.+)$/gm, '<div class="flex gap-1.5 ml-1"><span class="text-gray-400 select-none">•</span><span>$1</span></div>')
        // Numbered lists (1. item)
        .replace(/^(\d+)\.\s+(.+)$/gm, '<div class="flex gap-1.5 ml-1"><span class="text-gray-400 font-medium select-none min-w-[1.2em]">$1.</span><span>$2</span></div>')
        // Line breaks
        .replace(/\n/g, '<br/>');
}

export default function AIAssistant() {
    const { state, dispatch } = useApp();
    const { chatHistory, todos, schedule, courses, studySets, profile, bookmarks, countdowns } = state;
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, open, typing]);

    const sendMessage = async () => {
        if (!input.trim() || typing) return;
        const userMsg = { role: 'user', content: input, timestamp: new Date().toISOString() };
        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });
        setInput('');
        setTyping(true);

        const context = { todos, schedule, courses, studySets, profile, bookmarks, countdowns, chatHistory };
        const response = await generateVAResponse(input, context);

        const aiMsg = { role: 'assistant', content: response.message, timestamp: new Date().toISOString() };
        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: aiMsg });
        setTyping(false);
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    return (
        <>
            {/* Floating button */}
            <button
                onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 100); }}
                className={`fixed bottom-20 lg:bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${open ? 'bg-gray-200 dark:bg-surface2-dark rotate-45' : 'gradient-primary animate-float'
                    }`}
            >
                {open ? <X size={24} className="text-gray-600 dark:text-gray-300 -rotate-45" /> : <Sparkles size={24} className="text-white" />}
            </button>

            {/* Chat panel — iMessage-style */}
            {open && (
                <div className="fixed bottom-36 lg:bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-10rem)] bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-2xl flex flex-col overflow-hidden animate-scale-in"
                    style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' }}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shadow-md shadow-primary-light/20">
                                <Sparkles size={16} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold dark:text-white">TaskTrack AI</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <p className="text-[10px] text-gray-400 font-medium">LLaMA 3.3 70B · Groq</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => dispatch({ type: 'CLEAR_CHAT' })} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" title="Clear chat">
                            <Trash2 size={14} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
                        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(108,99,255,0.02) 100%)' }}>

                        {chatHistory.length === 0 && (
                            <div className="text-center py-6 px-2">
                                <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-light/20">
                                    <Sparkles size={22} className="text-white" />
                                </div>
                                <p className="text-sm font-semibold dark:text-white mb-1">Hey{profile?.name ? `, ${profile.name}` : ''}! 👋</p>
                                <p className="text-xs text-gray-400 leading-relaxed mb-5">I'm a real AI — ask me anything. I can help with studying, explain concepts, chat, or answer questions about your tasks and schedule.</p>
                                <div className="space-y-2">
                                    {[
                                        { text: "What's my name?", emoji: '👤' },
                                        { text: 'Explain recursion simply', emoji: '🧠' },
                                        { text: 'What tasks should I focus on?', emoji: '🎯' },
                                        { text: 'Tell me a fun fact', emoji: '✨' },
                                    ].map(q => (
                                        <button key={q.text} onClick={() => { setInput(q.text); setTimeout(() => inputRef.current?.focus(), 50); }}
                                            className="block w-full text-left text-xs px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all border border-gray-100 dark:border-gray-700/30">
                                            <span className="mr-1.5">{q.emoji}</span>{q.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {chatHistory.map((msg, i) => {
                            const isUser = msg.role === 'user';
                            const showTime = i === chatHistory.length - 1 || chatHistory[i + 1]?.role !== msg.role;
                            return (
                                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                    <div className="max-w-[85%] flex flex-col">
                                        <div className={`px-3.5 py-2.5 text-[13px] leading-relaxed ${isUser
                                            ? 'bg-primary-light dark:bg-primary-dark text-white rounded-2xl rounded-br-md'
                                            : 'bg-gray-100 dark:bg-[#2c2c2e] text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-md'
                                            }`}
                                            style={isUser ? { background: 'linear-gradient(135deg, #6C63FF 0%, #7B73FF 100%)' } : {}}>
                                            {isUser ? (
                                                <div className="whitespace-pre-wrap">{msg.content}</div>
                                            ) : (
                                                <div className="whitespace-pre-wrap [&_strong]:font-semibold [&_pre]:my-1 [&_code]:text-[12px]"
                                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                            )}
                                        </div>
                                        {showTime && (
                                            <span className={`text-[10px] text-gray-400 mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
                                                {formatTime(msg.timestamp)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Typing indicator */}
                        {typing && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="px-4 py-3.5 rounded-2xl rounded-bl-md bg-gray-100 dark:bg-[#2c2c2e]">
                                    <div className="flex gap-1.5 items-center h-4">
                                        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    <div className="border-t border-gray-100 dark:border-gray-800 p-2.5 bg-white dark:bg-[#1c1c1e]">
                        <div className="flex gap-2 items-end">
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder="Ask me anything..."
                                className="flex-1 px-4 py-2.5 rounded-full bg-gray-100 dark:bg-[#2c2c2e] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-primary-dark/30 dark:text-white transition-all placeholder:text-gray-400"
                            />
                            <button onClick={sendMessage} disabled={!input.trim() || typing}
                                className={`p-2.5 rounded-full transition-all duration-200 ${input.trim() && !typing
                                    ? 'bg-primary-light dark:bg-primary-dark text-white shadow-md shadow-primary-light/20 hover:shadow-lg scale-100'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 scale-95'
                                    }`}>
                                <Send size={16} className={input.trim() ? '' : 'opacity-50'} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
