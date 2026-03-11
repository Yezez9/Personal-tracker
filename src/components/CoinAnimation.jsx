import React, { useState, useEffect } from 'react';
import { playNotificationSound } from '../utils/soundService';

export default function CoinAnimation() {
    const [animation, setAnimation] = useState(null);
    const [claimedToast, setClaimedToast] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            const detail = e.detail || {};
            setAnimation({ ...detail, id: Date.now() });
            playNotificationSound();
            setTimeout(() => setAnimation(null), 3500);
        };
        const claimedHandler = (e) => {
            setClaimedToast({ taskTitle: e.detail.taskTitle, id: Date.now() });
            setTimeout(() => setClaimedToast(null), 2500);
        };
        window.addEventListener('coinEarned', handler);
        window.addEventListener('coinAlreadyClaimed', claimedHandler);
        return () => {
            window.removeEventListener('coinEarned', handler);
            window.removeEventListener('coinAlreadyClaimed', claimedHandler);
        };
    }, []);

    return (
        <>
            {/* Detailed coin breakdown popup */}
            {animation && (
                <div
                    key={animation.id}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    onClick={() => setAnimation(null)}
                    style={{ pointerEvents: 'auto' }}
                >
                    {/* Coin particles */}
                    {[...Array(8)].map((_, i) => (
                        <span
                            key={i}
                            className="coin-particle absolute text-2xl pointer-events-none"
                            style={{
                                '--angle': `${(i * 45) + (Math.random() * 20 - 10)}deg`,
                                '--distance': `${80 + Math.random() * 60}px`,
                                animationDelay: `${i * 50}ms`,
                            }}
                        >
                            🪙
                        </span>
                    ))}

                    {/* Breakdown card */}
                    <div className="coin-amount-popup bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-yellow-500/20 p-5 w-full max-w-[280px]">
                        <p className="text-center text-base font-bold text-white mb-3">Task Completed! 🎉</p>

                        <div className="border-t border-gray-700 pt-3 space-y-1.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Base Reward</span>
                                <span className="text-white font-semibold">+{animation.baseCoins || animation.coins || 0} 🪙</span>
                            </div>

                            {(animation.earlyBonus || 0) > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-400">Early Bonus</span>
                                    <span className="text-green-400 font-semibold">+{animation.earlyBonus} 🪙</span>
                                </div>
                            )}

                            {(animation.streakMultiplier || 1) > 1 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-orange-400">🔥 Streak</span>
                                    <span className="text-orange-400 font-semibold">×{animation.streakMultiplier}</span>
                                </div>
                            )}

                            {(animation.latePenalty || 0) > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-red-400">Late Penalty</span>
                                    <span className="text-red-400 font-semibold">-{animation.latePenalty} 🪙</span>
                                </div>
                            )}

                            {(animation.recurringDeduct || 0) > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-amber-400">Recurring</span>
                                    <span className="text-amber-400 font-semibold">-{animation.recurringDeduct} 🪙</span>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-gray-700 mt-3 pt-3">
                            <div className="flex justify-between text-lg">
                                <span className="text-gray-300 font-bold">Total Earned</span>
                                <span className="text-yellow-400 font-black">+{animation.coins || 0} 🪙</span>
                            </div>
                        </div>

                        {animation.reasoning && (
                            <p className="text-[11px] text-gray-500 italic mt-2 text-center leading-snug">
                                {animation.reasoning}
                            </p>
                        )}

                        <p className="text-[10px] text-gray-600 text-center mt-2">Tap to dismiss</p>
                    </div>
                </div>
            )}

            {/* Already claimed toast */}
            {claimedToast && (
                <div key={claimedToast.id} className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
                    <div className="coin-amount-popup bg-gray-900/90 backdrop-blur-sm px-5 py-3 rounded-xl shadow-2xl">
                        <span className="text-sm font-semibold text-gray-300">Coins already claimed ✅</span>
                        <p className="text-xs text-gray-500 mt-0.5 text-center">No coins awarded for re-completing this task</p>
                    </div>
                </div>
            )}
        </>
    );
}
