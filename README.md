# 📁 FolderlyAI — Academic Organizer

> Your AI-powered academic life, organized.

A modern, feature-rich academic organizer PWA built with **React + Vite + Tailwind CSS**, powered by **Google Gemini 2.0 Flash** AI.

## ✨ Features

- 📊 **Dashboard** — Student ID card, AI daily briefing, stats, upcoming deadlines
- ✅ **To-Do List** — Smart task management with AI priority scoring (0–100)
- 📚 **Course Folders** — Color-coded course organization with files, links, notes
- 📅 **Class Schedule** — Weekly timetable grid + list view
- 🗓️ **Calendar** — Month view with task dots and day details
- 🃏 **Study Sets** — 3D flip flashcards with mastery tracking + AI generation
- 🔖 **Bookmarks** — Link manager with course tagging and search
- ⏳ **Countdowns** — Live-ticking countdown timers
- 🤖 **AI Assistant** — Chat-based VA powered by Gemini 2.0 Flash
- ⚙️ **Settings** — Profile, theme, API key config, data export/import
- 🌙 **Dark Mode** — Full dark theme with smooth transitions
- 📱 **PWA** — Installable on mobile, works offline

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔑 AI Setup (Optional)

1. Get a free API key from [aistudio.google.com](https://aistudio.google.com)
2. Open the app → **Settings** → **AI Integration**
3. Paste your key and click **Save**

Without a key, all AI features work with local template-based responses.

## 📦 Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Vercel auto-detects Vite — click **Deploy**
4. Done! Your PWA is live and installable 🎉

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite 6 |
| Styling | Tailwind CSS 3 |
| AI | Google Gemini 2.0 Flash |
| State | useReducer + Context API |
| Storage | localStorage |
| Icons | lucide-react |
| PWA | Service Worker + Web Manifest |

## 📁 Project Structure

```
├── public/
│   ├── icons/              # PWA icons (192×192, 512×512)
│   ├── manifest.json       # PWA manifest
│   └── service-worker.js   # Offline caching
├── src/
│   ├── components/         # Layout, AI Assistant, Install Prompt
│   ├── contexts/           # AppContext, ThemeContext
│   ├── pages/              # All feature pages
│   └── utils/              # AI service, storage, helpers
├── index.html              # Entry point
├── vite.config.js          # Vite config
├── tailwind.config.js      # Tailwind config
├── vercel.json             # Vercel SPA routing
└── package.json            # Dependencies & scripts
```

---

Built with ❤️ for students.
