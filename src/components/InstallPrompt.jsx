import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, ExternalLink } from 'lucide-react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed as PWA or running inside Capacitor
        if (window.matchMedia('(display-mode: standalone)').matches || window.Capacitor) {
            setIsInstalled(true);
            return;
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setTimeout(() => setShowBanner(true), 2000);
        };

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowBanner(false);
            setDeferredPrompt(null);
        });

        // If no PWA prompt fires after 3s, still show banner for APK download
        const fallbackTimer = setTimeout(() => {
            if (!window.matchMedia('(display-mode: standalone)').matches && !window.Capacitor) {
                setShowBanner(true);
            }
        }, 3000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            clearTimeout(fallbackTimer);
        };
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
        <div className="fixed bottom-20 left-4 right-4 lg:bottom-6 lg:left-auto lg:right-24 lg:w-[380px] z-[60] animate-slide-up">
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-gray-200 dark:border-border-dark shadow-2xl p-4">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-light/20">
                        <Smartphone size={20} className="text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold dark:text-txt-dark">Get TaskTrack on your phone</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                            Install as an app for the best experience
                        </p>
                    </div>

                    {/* Close */}
                    <button
                        onClick={() => setShowBanner(false)}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                    >
                        <X size={14} className="text-gray-300" />
                    </button>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 mt-3">
                    {/* PWA Install (if available) */}
                    {deferredPrompt && (
                        <button
                            onClick={handleInstall}
                            className="btn-primary text-xs px-4 py-2.5 flex items-center gap-1.5 flex-1 justify-center"
                        >
                            <Download size={13} /> Install PWA
                        </button>
                    )}

                    {/* APK Download — always available */}
                    <a
                        href="/TaskTrack.apk"
                        download="TaskTrack.apk"
                        className="btn-primary text-xs px-4 py-2.5 flex items-center gap-1.5 flex-1 justify-center no-underline"
                        style={{
                            background: deferredPrompt
                                ? 'linear-gradient(135deg, #34D399 0%, #10B981 100%)'
                                : undefined
                        }}
                    >
                        <Download size={13} /> Download APK
                    </a>

                    <button
                        onClick={() => setShowBanner(false)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-2"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}
