# Skillery Pro 🚀

A modern skill learning platform built with **React + Vite** and **Supabase**.

## Features

- 🎯 Skill discovery & browsing with search and category filters
- 📊 Personal learning dashboard with progress tracking  
- ➕ Admin panel to add, manage, and delete skills
- 🔐 Full authentication (sign up, sign in, sign out) via Supabase Auth
- 📱 Responsive — works on desktop, tablet, and mobile
- ⚡ Fast performance with Vite

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/skillery-pro.git
cd skillery-pro
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In your project dashboard → **SQL Editor** → paste and run the contents of `supabase_schema.sql`
3. Go to **Settings → API** and copy your Project URL and `anon` key

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Locally

```bash
npm run dev
```

Visit `http://localhost:5173` 🎉

---

## Project Structure

```
skillery-pro/
├── src/
│   ├── App.jsx              # All pages, components & inline styles
│   ├── main.jsx             # React entry point
│   ├── hooks/
│   │   └── useAuth.js       # Supabase auth hook
│   └── lib/
│       └── supabase.js      # Supabase client
├── index.html
├── vite.config.js
├── supabase_schema.sql      # Database schema + seed data
├── .env.example             # Environment variable template
└── package.json
```

## Pages

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Landing page | No |
| `/login` | Sign in | No |
| `/signup` | Create account | No |
| `/dashboard` | Learning overview | ✅ Yes |
| `/skills` | Browse & enroll in skills | ✅ Yes |
| `/admin` | Manage skills & view users | ✅ Yes |

## Database Tables

| Table | Description |
|-------|-------------|
| `skills` | Skill catalog (title, category, level, description, duration) |
| `user_progress` | Tracks each user's enrollment and progress per skill |

## Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add your environment variables in the Vercel dashboard under **Project Settings → Environment Variables**.

---

## Tech Stack

- **Frontend**: React 18, React Router v6, Vite
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Fonts**: Syne + DM Sans (Google Fonts)
- **Styling**: 100% inline styles via design token object in `App.jsx`

---

Built with ❤️ — Skillery Pro © 2025
