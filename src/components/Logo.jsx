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
                    <stop offset="100%" stopColor="#43D8A0" />
                </linearGradient>
            </defs>
            <rect x="8" y="4" width="40" height="52" rx="5" ry="5" fill="url(#logoGrad)" />
            <polyline points="18,32 26,40 42,24" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
}
