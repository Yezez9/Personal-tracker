import React, { useState, useEffect } from 'react';
import { playNotificationSound } from '../utils/soundService';

export default function CoinAnimation() {
    const [animation, setAnimation] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            const { coins, bonusNote } = e.detail;
            setAnimation({ coins, bonusNote, id: Date.now() });
            playNotificationSound();
            setTimeout(() => setAnimation(null), 2500);
        };
        window.addEventListener('coinEarned', handler);
        return () => window.removeEventListener('coinEarned', handler);
    }, []);

    if (!animation) return null;

    return (
        <div key={animation.id} className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
            {/* Floating coins burst */}
            {[...Array(8)].map((_, i) => (
                <span
                    key={i}
                    className="coin-particle absolute text-2xl"
                    style={{
                        '--angle': `${(i * 45) + (Math.random() * 20 - 10)}deg`,
                        '--distance': `${80 + Math.random() * 60}px`,
                        animationDelay: `${i * 50}ms`,
                    }}
                >
                    🪙
                </span>
            ))}
            {/* Central amount display */}
            <div className="coin-amount-popup">
                <span className="text-3xl font-black text-yellow-400 drop-shadow-lg">
                    +{animation.coins} 🪙
                </span>
                {animation.bonusNote && (
                    <p className="text-xs text-yellow-300 font-medium mt-1 text-center max-w-[200px]">{animation.bonusNote}</p>
                )}
            </div>
        </div>
    );
}
