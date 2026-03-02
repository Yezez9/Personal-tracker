# TaskTrack — Academic Organizer

> AI-powered student organizer with task management, course organization, class schedule, study sets, and a conversational AI assistant powered by **Groq LLaMA 3.3 70B**.

---

## 🚀 Quick Start (Local Development)

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🌐 One-Time Deployment Setup (Vercel + GitHub Auto-Deploy)

Follow these steps **once** to set up automatic deployment. After this, every `git push` will update the live site automatically.

### Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/Personal-tracker.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"** → **Import** your `Personal-tracker` repo
3. Vercel auto-detects Vite — just click **Deploy**
4. Wait ~60 seconds — your app is now live! 🎉

### Step 3: Get Your Vercel Tokens

You need 3 tokens for the GitHub Action auto-deploy:

| Token | Where to find it |
|-------|-----------------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create new token |
| `VERCEL_ORG_ID` | [vercel.com/account](https://vercel.com/account) → Your **Account/Team ID** (in Settings → General) |
| `VERCEL_PROJECT_ID` | Go to your project on Vercel → **Settings → General** → **Project ID** |

### Step 4: Add Secrets to GitHub

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"** and add all 3:
   - `VERCEL_TOKEN` → paste your token
   - `VERCEL_ORG_ID` → paste your org/account ID
   - `VERCEL_PROJECT_ID` → paste your project ID

### ✅ Done! Auto-Deploy is Now Active

From this point forward, **every push to `main` triggers an automatic redeploy**.

---

## 📤 Pushing Updates (Every Time You Make Changes)

After editing your code, run these 3 commands:

```bash
git add .
git commit -m "describe what you changed"
git push origin main
```

That's it! Within **30–60 seconds**, Vercel automatically:
1. Detects the push
2. Rebuilds the app
3. Updates the live URL

**Everyone using the link sees the latest version instantly.**

---

## 📱 Native Android App

The built APK is included in the project. Users can download it directly from the web app, or you can build a fresh one:

```bash
npm run build
npx cap sync
cd android && ./gradlew assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Tailwind CSS |
| AI Chat | Groq LLaMA 3.3 70B |
| AI Utilities | Google Gemini 2.0 Flash |
| Build | Vite 6 |
| Deploy | Vercel + GitHub Actions |
| Native | Capacitor 6 (Android/iOS) |
| Offline | Service Worker (PWA) |
