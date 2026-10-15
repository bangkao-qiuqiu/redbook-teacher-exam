-- 在 Supabase 项目的 SQL Editor 中完整运行本文件。
-- 作用：允许考试页面匿名提交成绩，仅允许“唯一管理员”读取成绩。

create table if not exists public.exam_results (
  id uuid primary key,
  teacher_name text not null check (char_length(teacher_name) between 2 and 30),
  exam_date date not null,
  paper_id text not null,
  score integer not null check (score between 0 and 100 and score % 5 = 0),
  correct_count integer not null check (correct_count between 0 and 20),
  passed boolean not null,
  duration_seconds integer not null check (duration_seconds between 1 and 86400),
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.exam_results enable row level security;

-- 这个表只保留一行，因此网站始终只有一个管理员账号。
create table if not exists public.site_admin (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade
);

alter table public.site_admin enable row level security;
revoke all on public.site_admin from anon, authenticated;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.site_admin
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

drop policy if exists "Anyone can submit an exam result" on public.exam_results;
create policy "Anyone can submit an exam result"
on public.exam_results
for insert
to anon, authenticated
with check (
  score = correct_count * 5
  and passed = (score >= 80)
  and jsonb_typeof(answers) = 'array'
  and jsonb_array_length(answers) = 20
);

drop policy if exists "Authenticated admins can read results" on public.exam_results;
create policy "Authenticated admins can read results"
on public.exam_results
for select
to authenticated
using (public.is_site_admin());

revoke update, delete on public.exam_results from anon, authenticated;

create index if not exists exam_results_exam_date_idx on public.exam_results (exam_date desc);
create index if not exists exam_results_teacher_name_idx on public.exam_results (teacher_name);
