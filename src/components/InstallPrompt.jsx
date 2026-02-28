import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Listen for the beforeinstallprompt event
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show banner after a short delay so it doesn't feel intrusive
            setTimeout(() => setShowBanner(true), 2000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Track successful install
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowBanner(false);
            setDeferredPrompt(null);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setShowBanner(false);
        setDeferredPrompt(null);
    };

    if (isInstalled || !showBanner) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 lg:bottom-6 lg:left-auto lg:right-24 lg:w-[360px] z-[60] animate-slide-up">
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark shadow-2xl p-4 flex items-start gap-3">
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-light/20">
                    <Smartphone size={20} className="text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold dark:text-txt-dark">Install FolderlyAI</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                        Add to your home screen for a native app experience — works offline!
                    </p>
                    <div className="flex gap-2 mt-2.5">
                        <button
                            onClick={handleInstall}
                            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                        >
                            <Download size={12} /> Install App
                        </button>
                        <button
                            onClick={() => setShowBanner(false)}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-2"
                        >
                            Not now
                        </button>
                    </div>
                </div>

                {/* Close */}
                <button
                    onClick={() => setShowBanner(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                >
                    <X size={14} className="text-gray-300" />
                </button>
            </div>
        </div>
    );
}
