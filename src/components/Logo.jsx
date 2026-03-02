import React from 'react';

export default function Logo({ size = 32, className = '' }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6C63FF" />
                    <stop offset="100%" stopColor="#FF6584" />
                </linearGradient>
            </defs>
            <rect width="512" height="512" rx="108" fill="url(#logoBg)" />
            {/* Document body */}
            <rect x="140" y="80" width="232" height="300" rx="24" fill="white" opacity="0.95" />
            {/* Document fold corner */}
            <path d="M320 80 L372 80 L372 132 Z" fill="white" opacity="0.6" />
            <path d="M320 80 L320 120 C320 126.627 325.373 132 332 132 L372 132" stroke="white" strokeWidth="4" fill="none" opacity="0.3" />
            {/* Lines on document */}
            <rect x="180" y="160" width="152" height="8" rx="4" fill="#6C63FF" opacity="0.25" />
            <rect x="180" y="188" width="120" height="8" rx="4" fill="#6C63FF" opacity="0.18" />
            <rect x="180" y="216" width="140" height="8" rx="4" fill="#6C63FF" opacity="0.12" />
            {/* Checkmark circle */}
            <circle cx="310" cy="330" r="72" fill="#43D8A0" />
            <circle cx="310" cy="330" r="72" fill="url(#logoBg)" opacity="0.15" />
            {/* Checkmark */}
            <path d="M278 330 L300 352 L342 308" stroke="white" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
}
