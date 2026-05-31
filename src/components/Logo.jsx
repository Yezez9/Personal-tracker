import React from 'react';

export default function Logo({ size = 32, className = '' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6C63FF" />
                    <stop offset="50%" stopColor="#9B59B6" />
                    <stop offset="100%" stopColor="#43D8A0" />
                </linearGradient>
            </defs>
            <rect x="4" y="4" width="56" height="56" rx="14" ry="14" fill="url(#logoGrad)" />
            {/* Grid/hash pattern matching screenshot */}
            <line x1="22" y1="16" x2="22" y2="48" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
            <line x1="38" y1="16" x2="38" y2="48" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
            <line x1="14" y1="26" x2="50" y2="26" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
            <line x1="14" y1="38" x2="50" y2="38" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        </svg>
    );
}
