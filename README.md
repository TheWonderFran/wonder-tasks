# TaskFlow - Agency Task Management

A clean, simple task management app for agencies with client portals.

## Features

- ✅ Kanban & List views
- ✅ Client organization by plan folders
- ✅ Internal vs Client task separation
- ✅ Public & Internal comments
- ✅ File attachments
- ✅ Customizable workflow statuses
- ✅ Plan management with Stripe integration
- ✅ Client portal (coming soon)
- ✅ Google OAuth + Email/Password auth

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Hosting**: Vercel

---

## Deployment Guide

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (~2 minutes)
3. Go to **Project Settings > API** and copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY`

### 2. Set Up Database

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql` and paste it
4. Click **Run** to create all tables

### 3. Enable Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth Client ID**
5. Choose **Web Application**
6. Add authorized redirect URI: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
7. Copy the Client ID and Client Secret
8. In Supabase, go to **Authentication > Providers > Google**
9. Enable Google and paste your credentials

### 4. Set Up Storage

1. In Supabase, go to **Storage**
2. Click **New Bucket**
3. Name it `attachments`
4. Keep it private (not public)
5. Set file size limit to 50MB

### 5. Push to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add your GitHub repo as remote
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git

# Push
git push -u origin main
```

### 6. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New Project**
3. Import your GitHub repository
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
   - `NEXT_PUBLIC_APP_URL` = your Vercel deployment URL (add after first deploy)
5. Click **Deploy**

### 7. Update OAuth Redirect (if using Google)

After deployment, update your Google OAuth redirect URI to include your Vercel domain:
- `https://your-app.vercel.app/auth/callback`

Also update in Supabase **Authentication > URL Configuration**:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/auth/callback`

---

## Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in your Supabase credentials in .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
taskflow/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── dashboard-client.tsx
│   ├── settings/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── store.ts
│   └── types.ts
├── supabase/
│   └── schema.sql
├── middleware.ts
├── .env.example
└── README.md
```

---

## Next Steps

After deployment, you'll want to:

1. **Create your first organization** - Sign up and the app will create one for you
2. **Add team members** - Invite via email through the Team settings
3. **Create plans** - Set up your pricing tiers in Settings > Plans
4. **Add clients** - Create client accounts and assign them to plans
5. **Customize workflow** - Adjust statuses in Settings > Workflow

---

## Support

Built with ❤️ for agencies who want simple, powerful task management.
