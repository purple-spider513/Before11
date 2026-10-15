-- Before11 schema. Already applied in the project. The owner uid below is not a secret.

create table public.courses (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  color       text not null,
  created_at  bigint not null,
  updated_at  bigint not null,
  updated_by  text not null
);

create table public.work_items (
  id                uuid primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id         uuid,
  kind              text not null check (kind in ('homework', 'exam', 'task')),
  title             text not null,
  date              text not null check (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  completed_at      text check (completed_at is null or completed_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  estimate_minutes  integer,
  created_at        bigint not null,
  updated_at        bigint not null,
  updated_by        text not null,
  constraint work_items_course_kind_check check (
    (kind = 'task' and course_id is null)
    or (kind in ('homework', 'exam') and course_id is not null)
  )
);

create table public.sessions (
  id            uuid primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date          text not null check (date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  start_min     integer,
  end_min       integer,
  work_item_id  uuid,
  title         text,
  color         text,
  repeat        text not null check (repeat in ('none', 'daily', 'weekdays')),
  tz            text not null,
  created_at    bigint not null,
  updated_at    bigint not null,
  updated_by    text not null
);

create table public.profiles (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  tz          text not null,
  created_at  bigint not null
);

create table public.probe_lines (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  text        text not null,
  written_at  bigint not null,
  device      text not null
);

create index courses_user_id_idx    on public.courses (user_id);
create index work_items_user_id_idx on public.work_items (user_id);
create index sessions_user_id_idx   on public.sessions (user_id);

alter table public.courses     enable row level security;
alter table public.work_items  enable row level security;
alter table public.sessions    enable row level security;
alter table public.profiles    enable row level security;
alter table public.probe_lines enable row level security;

create policy "owner only" on public.courses for all to authenticated
  using      (user_id = (select auth.uid()) and (select auth.uid()) = '7cd0dfeb-cf5f-4deb-a5be-2477c24758d0'::uuid)
  with check (user_id = (select auth.uid()) and (select auth.uid()) = '7cd0dfeb-cf5f-4deb-a5be-2477c24758d0'::uuid);

create policy "owner only" on public.work_items for all to authenticated
  using      (user_id = (select auth.uid()) and (select auth.uid()) = '7cd0dfeb-cf5f-4deb-a5be-2477c24758d0'::uuid)
  with check (user_id = (select auth.uid()) and (select auth.uid()) = '7cd0dfeb-cf5f-4deb-a5be-2477c24758d0'::uuid);

create policy "owner only" on public.sessions for all to authenticated
  using      (user_id = (select auth.uid()) and (select auth.uid()) = '7cd0dfeb-cf5f-4deb-a5be-2477c24758d0'::uuid)
  with check (user_id = (select auth.uid()) and (select auth.uid()) = '7cd0dfeb-cf5f-4deb-a5be-2477c24758d0'::uuid);

create policy "owner only" on public.profiles for all to authenticated
  using      (user_id = (select auth.uid()) and (select auth.uid()) = '7cd0dfeb-cf5f-4deb-a5be-2477c24758d0'::uuid)
  with check (user_id = (select auth.uid()) and (select auth.uid()) = '7cd0dfeb-cf5f-4deb-a5be-2477c24758d0'::uuid);

create policy "owner only" on public.probe_lines for all to authenticated
  using      (user_id = (select auth.uid()) and (select auth.uid()) = '7cd0dfeb-cf5f-4deb-a5be-2477c24758d0'::uuid)
  with check (user_id = (select auth.uid()) and (select auth.uid()) = '7cd0dfeb-cf5f-4deb-a5be-2477c24758d0'::uuid);

revoke all on public.courses, public.work_items, public.sessions, public.profiles, public.probe_lines from anon;
grant select, insert, update, delete
  on public.courses, public.work_items, public.sessions, public.profiles, public.probe_lines
  to authenticated;

alter publication supabase_realtime
  add table public.courses, public.work_items, public.sessions, public.profiles, public.probe_lines;

-- The statements above create a new database. The live project was created when
-- kind was only homework|exam and course_id was not null. Run this once in the
-- SQL editor so a task (no course) can sync. Do not run schema.sql again.
--
-- begin;
--
-- do $$
-- declare
--   r record;
-- begin
--   for r in
--     select con.conname
--     from pg_constraint con
--     join pg_class rel on rel.oid = con.conrelid
--     join pg_namespace nsp on nsp.oid = rel.relnamespace
--     where nsp.nspname = 'public'
--       and rel.relname = 'work_items'
--       and con.contype = 'c'
--       and pg_get_constraintdef(con.oid) ilike '%kind%'
--       and pg_get_constraintdef(con.oid) not ilike '%task%'
--   loop
--     execute format('alter table public.work_items drop constraint %I', r.conname);
--   end loop;
-- end $$;
--
-- alter table public.work_items drop constraint if exists work_items_kind_check;
-- alter table public.work_items
--   add constraint work_items_kind_check
--   check (kind in ('homework', 'exam', 'task'));
--
-- alter table public.work_items alter column course_id drop not null;
--
-- alter table public.work_items drop constraint if exists work_items_course_kind_check;
-- alter table public.work_items
--   add constraint work_items_course_kind_check
--   check (
--     (kind = 'task' and course_id is null)
--     or (kind in ('homework', 'exam') and course_id is not null)
--   );
--
-- commit;
