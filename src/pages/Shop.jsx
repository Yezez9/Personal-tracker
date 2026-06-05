import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { getCoinWallet, deductCoins } from '../utils/coinService';
import { ShoppingBag, Snowflake, X, Check, AlertCircle } from 'lucide-react';

// Shop item definitions
const SHOP_ITEMS = [
    {
        id: 'streak_freeze',
        name: 'Streak Freeze',
        icon: '❄️',
        price: 100,
        description: 'Protects your streak if you miss a day. Activates automatically — no action needed.',
        type: 'consumable',
        maxStack: 5,
    },
];

export default function Shop() {
    const { state, dispatch } = useApp();
    const [wallet, setWallet] = useState(getCoinWallet());
    const [confirmItem, setConfirmItem] = useState(null);
    const [toast, setToast] = useState(null);
    const [purchaseAnim, setPurchaseAnim] = useState(null);

    const shopPurchases = state.shopPurchases || [];

    // Refresh wallet when state changes
    useEffect(() => {
        setWallet(getCoinWallet());
    }, [state]);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    // Count owned items
    function getOwnedCount(itemId) {
        return shopPurchases.filter(p => p.itemId === itemId && !p.consumed).length;
    }

    function handleBuy(item) {
        if (wallet.totalCoins < item.price) {
            setToast({ type: 'error', message: 'Not enough coins! Complete more tasks to earn 🪙' });
            return;
        }
        if (item.maxStack && getOwnedCount(item.id) >= item.maxStack) {
            setToast({ type: 'error', message: `You can only hold ${item.maxStack} of this item!` });
            return;
        }
        setConfirmItem(item);
    }

    function confirmPurchase() {
        if (!confirmItem) return;
        const item = confirmItem;
        
        // Deduct coins
        const updatedWallet = deductCoins(item.price, `Shop: ${item.name}`, `Purchased ${item.name}`);
        setWallet(updatedWallet);

        // Add to purchases
        dispatch({
            type: 'ADD_SHOP_PURCHASE',
            payload: {
                itemId: item.id,
                price: item.price,
                consumed: false,
                purchasedAt: new Date().toISOString(),
            }
        });

        // Show success animation
        setPurchaseAnim(item);
        setTimeout(() => setPurchaseAnim(null), 2000);

        setConfirmItem(null);
        setToast({ type: 'success', message: `${item.name} purchased! Balance: ${updatedWallet.totalCoins} 🪙` });
    }

    const freezeCount = getOwnedCount('streak_freeze');

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                        <ShoppingBag size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold dark:text-txt-dark tracking-tight">Shop</h1>
                        <p className="text-xs text-gray-400">Spend your hard-earned coins</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                    <span className="text-lg">🪙</span>
                    <span className="text-lg font-bold text-yellow-400">{wallet.totalCoins.toLocaleString()}</span>
                    <span className="text-xs text-yellow-400/70">coins</span>
                </div>
            </div>

            {/* Active Items Section */}
            {freezeCount > 0 && (
                <div className="glass-card p-4">
                    <h2 className="text-sm font-semibold dark:text-txt-dark mb-3 flex items-center gap-2">
                        <Snowflake size={14} className="text-cyan-400" />
                        Active Items
                    </h2>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                        <span className="text-2xl">❄️</span>
                        <div className="flex-1">
                            <p className="text-sm font-medium dark:text-txt-dark">Streak Freeze</p>
                            <p className="text-[10px] text-gray-400">Protects your streak automatically</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: freezeCount }).map((_, i) => (
                                <span key={i} className="text-lg opacity-90">🧊</span>
                            ))}
                        </div>
                        <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg">
                            ×{freezeCount}
                        </span>
                    </div>
                </div>
            )}

            {/* Shop Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {SHOP_ITEMS.map(item => {
                    const owned = getOwnedCount(item.id);
                    const canAfford = wallet.totalCoins >= item.price;
                    const maxed = item.maxStack && owned >= item.maxStack;

                    return (
                        <div key={item.id} className="glass-card card-hover p-5 flex flex-col items-center text-center gap-3 relative overflow-hidden">
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-light/5 to-transparent pointer-events-none" />
                            
                            {/* Item Icon */}
                            <div className="text-5xl mt-2 drop-shadow-lg relative z-10">{item.icon}</div>
                            
                            {/* Name & Description */}
                            <div className="relative z-10">
                                <h3 className="text-base font-bold dark:text-txt-dark">{item.name}</h3>
                                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{item.description}</p>
                            </div>

                            {/* Price */}
                            <div className="flex items-center gap-1.5 mt-1 relative z-10">
                                <span className="text-lg">🪙</span>
                                <span className={`text-lg font-bold ${canAfford ? 'text-yellow-400' : 'text-gray-500'}`}>
                                    {item.price}
                                </span>
                            </div>

                            {/* Owned count */}
                            {owned > 0 && (
                                <p className="text-[10px] text-cyan-400 font-medium relative z-10">Owned: {owned}</p>
                            )}

                            {/* Buy Button */}
                            <button
                                onClick={() => handleBuy(item)}
                                disabled={!canAfford || maxed}
                                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative z-10
                                    ${maxed
                                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                        : canAfford
                                            ? 'gradient-primary text-white hover:shadow-lg hover:shadow-primary-light/25 hover:scale-[1.02] active:scale-95'
                                            : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {maxed ? 'Max Owned' : canAfford ? 'Buy Now' : 'Can\'t Afford'}
                            </button>
                        </div>
                    );
                })}

                {/* Coming Soon placeholder cards */}
                {[1, 2].map(i => (
                    <div key={`soon-${i}`} className="glass-card p-5 flex flex-col items-center text-center gap-3 opacity-40">
                        <div className="text-5xl mt-2">🔒</div>
                        <h3 className="text-base font-bold dark:text-txt-dark">Coming Soon</h3>
                        <p className="text-[11px] text-gray-500">More items on the way...</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-lg">🪙</span>
                            <span className="text-lg font-bold text-gray-600">???</span>
                        </div>
                        <button disabled className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-700/30 text-gray-600 cursor-not-allowed">
                            Locked
                        </button>
                    </div>
                ))}
            </div>

            {/* ═══ Confirmation Modal ═══ */}
            {confirmItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmItem(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setConfirmItem(null)} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5">
                            <X size={18} className="text-gray-400" />
                        </button>

                        <div className="text-center">
                            <div className="text-5xl mb-4">{confirmItem.icon}</div>
                            <h3 className="text-lg font-bold dark:text-txt-dark">Purchase {confirmItem.name}?</h3>
                            <div className="flex items-center justify-center gap-2 mt-3 mb-5">
                                <span className="text-2xl">🪙</span>
                                <span className="text-2xl font-bold text-yellow-400">{confirmItem.price}</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-6">
                                Remaining balance: {wallet.totalCoins - confirmItem.price} coins
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmItem(null)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-surface2-dark text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-surface3-dark transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmPurchase}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold gradient-primary text-white hover:shadow-lg hover:shadow-primary-light/25 active:scale-95 transition-all"
                            >
                                Confirm Purchase
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Purchase Success Animation ═══ */}
            {purchaseAnim && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="bg-green-500/90 backdrop-blur-xl text-white px-8 py-5 rounded-2xl shadow-2xl animate-scale-in flex flex-col items-center gap-2">
                        <div className="text-5xl">{purchaseAnim.icon}</div>
                        <p className="text-lg font-bold">Purchased! ✅</p>
                        <p className="text-sm opacity-80">Balance: {wallet.totalCoins} 🪙</p>
                    </div>
                </div>
            )}

            {/* ═══ Toast Notification ═══ */}
            {toast && (
                <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-xl flex items-center gap-2 animate-slide-up text-sm font-medium
                    ${toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'}`}>
                    {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}
