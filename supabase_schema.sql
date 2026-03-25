-- ============================================================
-- Skillery Pro – Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- SKILLS TABLE
create table if not exists public.skills (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    text,
  level       text default 'Beginner',
  duration    text,
  created_at  timestamptz default now()
);

-- USER PROGRESS TABLE
create table if not exists public.user_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  skill_id     uuid references public.skills(id) on delete cascade,
  progress_pct integer default 0 check (progress_pct >= 0 and progress_pct <= 100),
  completed    boolean default false,
  enrolled_at  timestamptz default now(),
  unique(user_id, skill_id)
);

-- RLS (Row Level Security)
alter table public.skills        enable row level security;
alter table public.user_progress enable row level security;

-- Skills: anyone can read; only authenticated admins can write
-- (for simplicity, all authenticated users can read; writes are admin-controlled via Supabase dashboard or service key)
create policy "Public can read skills"
  on public.skills for select using (true);

create policy "Authenticated users can insert skills"
  on public.skills for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete skills"
  on public.skills for delete using (auth.role() = 'authenticated');

-- User progress: users can only see/modify their own records
create policy "Users can read own progress"
  on public.user_progress for select using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.user_progress for insert with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.user_progress for update using (auth.uid() = user_id);

-- SEED DATA (optional sample skills)
insert into public.skills (title, description, category, level, duration) values
  ('JavaScript Fundamentals',  'Learn the core concepts of JavaScript including variables, functions, and DOM manipulation.', 'Programming',  'Beginner',     '8 hours'),
  ('React for Beginners',      'Build modern UIs with React. Covers components, props, state, and hooks.',                  'Programming',  'Intermediate', '12 hours'),
  ('UI/UX Design Principles',  'Understand design thinking, wireframing, and creating user-friendly interfaces.',            'Design',       'Beginner',     '6 hours'),
  ('Advanced CSS & Animations','Master flexbox, grid, custom properties, and keyframe animations.',                         'Design',       'Intermediate', '5 hours'),
  ('Public Speaking Mastery',  'Develop confidence and clarity when presenting to any audience.',                           'Soft Skills',  'Beginner',     '4 hours'),
  ('Python Data Analysis',     'Use Python, Pandas, and Matplotlib to explore and visualize datasets.',                     'Data Science', 'Intermediate', '10 hours'),
  ('Git & Version Control',    'Learn branching, merging, pull requests, and collaborative workflows with Git.',             'DevOps',       'Beginner',     '3 hours'),
  ('SEO & Content Strategy',   'Increase organic traffic with on-page optimization, keyword research, and content planning.','Marketing',   'Beginner',     '5 hours');
