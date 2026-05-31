/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: { light: '#6C63FF', DEFAULT: '#6C63FF', dark: '#7C73FF' },
                secondary: { light: '#FF6584', DEFAULT: '#FF6584', dark: '#FF7A9A' },
                accent: { light: '#43D8A0', DEFAULT: '#43D8A0', dark: '#4EEDB5' },
                surface: { light: '#FFFFFF', dark: '#141428' },
                surface2: { dark: '#1C1C36' },
                surface3: { dark: '#232340' },
                bg: { light: '#F7F8FC', dark: '#0D0D1A' },
                sidebar: { dark: '#0F0F1C' },
                txt: { light: '#1A1A2E', dark: '#F1F1FF' },
                'txt-secondary': { light: '#6B7280', dark: '#8B8BA3' },
                border: { light: '#E5E7EB', dark: '#2A2A4A' },
            },
            fontFamily: {
                inter: ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-in': 'slideIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
                'float': 'float 3s ease-in-out infinite',
                'flip': 'flip 0.6s ease-in-out',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideIn: {
                    '0%': { transform: 'translateX(-20px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.9)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' },
                },
                flip: {
                    '0%': { transform: 'rotateY(0deg)' },
                    '100%': { transform: 'rotateY(180deg)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(108,99,255,0.3)' },
                    '100%': { boxShadow: '0 0 20px rgba(108,99,255,0.15)' },
                },
                pulseSubtle: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
                    '50%': { boxShadow: '0 0 8px 2px rgba(239,68,68,0.15)' },
                },
            },
        },
    },
    plugins: [],
}
