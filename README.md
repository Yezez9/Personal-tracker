# TaskTrack — Academic Organizer

A premium student productivity app with AI-powered task management, gamification, and cloud sync.

## 🚀 Quick Start (Local Development)

```bash
git clone https://github.com/Yezez9/Personal-tracker.git
cd Personal-tracker
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## ☁️ Cloud Database Setup (Supabase — Free)

TaskTrack supports **Supabase** as a free cloud database so your data persists across devices and browsers. Without Supabase, data is stored locally in your browser's localStorage.

### Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com) and create a **free account** (no credit card needed)
2. Click **"New Project"** — name it `tasktrack`
3. Choose a region close to you and set a database password
4. Wait for the project to finish provisioning (~30 seconds)

### Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings → API**
2. Copy:
   - **Project URL** (e.g. `https://abcdefg.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### Step 3: Add Keys to Your App

Create a `.env` file in the project root (or add to your Vercel environment variables):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Create Database Tables

Go to **Supabase Dashboard → SQL Editor** and run this SQL:

```sql
-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  name text,
  program text,
  school text,
  avatar text,
  coins integer default 0,
  streak integer default 0,
  last_opened date,
  created_at timestamp default now()
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  title text,
  description text,
  course_id uuid,
  due_date date,
  due_time time,
  priority text,
  status text default 'pending',
  ai_priority_score integer,
  coins_awarded boolean default false,
  completed_at timestamp,
  started_at timestamp,
  base_coins integer,
  total_coins integer,
  created_at timestamp default now()
);

-- Recurring Tasks
create table recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  title text,
  description text,
  difficulty text,
  base_coins integer,
  penalty_coins integer,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_completed_date date,
  consecutive_failed_days integer default 0,
  total_completions integer default 0,
  is_active boolean default true,
  created_at timestamp default now()
);

-- Courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  name text,
  code text,
  color text,
  icon text,
  professor text,
  created_at timestamp default now()
);

-- Class Schedule
create table schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  course_id uuid,
  day text,
  start_time time,
  end_time time,
  room text,
  color text,
  created_at timestamp default now()
);

-- Countdowns
create table countdowns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  title text,
  target_date date,
  icon text,
  color text,
  created_at timestamp default now()
);

-- Bookmarks
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  url text,
  title text,
  description text,
  course_id uuid,
  created_at timestamp default now()
);

-- Shop Purchases
create table shop_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  item_id text,
  purchased_at timestamp default now()
);

-- Enable Row Level Security (recommended)
alter table users enable row level security;
alter table tasks enable row level security;
alter table recurring_tasks enable row level security;
alter table courses enable row level security;
alter table schedule enable row level security;
alter table countdowns enable row level security;
alter table bookmarks enable row level security;
alter table shop_purchases enable row level security;

-- Allow anon key to read/write all rows (for personal use)
create policy "Allow all" on users for all using (true) with check (true);
create policy "Allow all" on tasks for all using (true) with check (true);
create policy "Allow all" on recurring_tasks for all using (true) with check (true);
create policy "Allow all" on courses for all using (true) with check (true);
create policy "Allow all" on schedule for all using (true) with check (true);
create policy "Allow all" on countdowns for all using (true) with check (true);
create policy "Allow all" on bookmarks for all using (true) with check (true);
create policy "Allow all" on shop_purchases for all using (true) with check (true);
```

### Step 5: Restart Your App

```bash
npm run dev
```

The app will now sync all data to Supabase automatically. Your `tasktrack_user_id` is stored in localStorage — this is the only local data. Everything else lives in the cloud.

---

## 🔧 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | For cloud sync |
| `VITE_SUPABASE_KEY` | Supabase anon/public key | For cloud sync |
| `VITE_GROQ_API_KEY` | Groq API key for AI features | For AI features |
| `VITE_GEMINI_API_KEY` | Gemini API key | For AI briefing |
| `GROQ_API_KEY` | Server-side Groq key (Vercel) | For API routes |

---

## 📱 Features

- **Dashboard** — Hero card, AI daily briefing, stat cards
- **To-Do List** — AI priority scoring, coin rewards, swipe-to-reveal
- **Course Folders** — Organize tasks by course with progress tracking
- **Class Schedule** — Weekly grid view
- **Calendar** — Monthly view with task overlays
- **Recurring Tasks** — Daily habits with AI difficulty judging, streak bonuses, escalating penalties
- **AI Assistant** — Chat powered by Groq LLaMA 3.3 70B
- **Gamification** — Coin system, levels, streaks
- **PWA** — Installable as a native app
- **Dark Mode** — Premium glassmorphism theme

## 🛠 Tech Stack

React + Vite + Tailwind CSS + Supabase (free) + Groq API + Vercel
