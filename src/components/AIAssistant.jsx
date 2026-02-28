import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { generateVAResponse } from '../utils/aiService';
import { Sparkles, X, Send, Trash2 } from 'lucide-react';

export default function AIAssistant() {
    const { state, dispatch } = useApp();
    const { chatHistory, todos, schedule, courses, studySets, profile } = state;
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, open]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMsg = { role: 'user', content: input, timestamp: new Date().toISOString() };
        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });
        setInput('');
        setTyping(true);

        const context = { todos, schedule, courses, studySets, profile };
        const response = await generateVAResponse(input, context);

        // Handle structured responses
        if (response.responseType === 'createTask' && response.data) {
            dispatch({ type: 'ADD_TODO', payload: response.data });
        }
        if (response.responseType === 'createFlashcards' && response.data) {
            dispatch({
                type: 'ADD_STUDY_SET',
                payload: { title: `${response.data.topic} Flashcards`, courseId: '', cards: response.data.cards }
            });
        }

        const aiMsg = { role: 'assistant', content: response.message, timestamp: new Date().toISOString() };
        dispatch({ type: 'ADD_CHAT_MESSAGE', payload: aiMsg });
        setTyping(false);
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

            {/* Chat panel */}
            {open && (
                <div className="fixed bottom-36 lg:bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-10rem)] bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-border-dark bg-gradient-to-r from-primary-light/5 to-secondary-light/5 dark:from-primary-dark/5 dark:to-secondary-dark/5">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                                <Sparkles size={14} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold dark:text-txt-dark">AI Assistant</h3>
                                <p className="text-[10px] text-gray-400">Your academic coach</p>
                            </div>
                        </div>
                        <button onClick={() => dispatch({ type: 'CLEAR_CHAT' })} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" title="Clear chat">
                            <Trash2 size={14} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chatHistory.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-2xl mb-2">✨</p>
                                <p className="text-sm font-medium dark:text-txt-dark mb-1">Hey{profile?.name ? `, ${profile.name}` : ''}!</p>
                                <p className="text-xs text-gray-400 leading-relaxed">I'm your academic assistant. Ask me to prioritize tasks, check your schedule, generate flashcards, or just chat about studying.</p>
                                <div className="mt-4 space-y-1.5">
                                    {['What should I work on first?', 'How am I doing this week?', 'Do I have class tomorrow?'].map(q => (
                                        <button key={q} onClick={() => { setInput(q); }} className="block w-full text-left text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-surface2-dark text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-primary-light dark:bg-primary-dark text-white rounded-br-md'
                                    : 'bg-gray-100 dark:bg-surface2-dark text-gray-700 dark:text-gray-300 rounded-bl-md'
                                    }`}>
                                    <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                                </div>
                            </div>
                        ))}
                        {typing && (
                            <div className="flex justify-start animate-fade-in">
                                <div className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-surface2-dark rounded-bl-md">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-gray-100 dark:border-border-dark p-3">
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                placeholder="Ask me anything..."
                                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-surface2-dark text-sm focus:outline-none focus:ring-2 focus:ring-primary-light/30 dark:focus:ring-primary-dark/30 dark:text-txt-dark transition-all"
                            />
                            <button onClick={sendMessage} disabled={!input.trim() || typing}
                                className="p-2.5 rounded-xl bg-primary-light dark:bg-primary-dark text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
