create table if not exists public.learner_mastery (
  learner_id uuid primary key,
  mastery jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.learner_mastery enable row level security;

grant select, insert, update on public.learner_mastery to anon;

create policy "Learners can read mastery for their cookie id"
  on public.learner_mastery
  for select
  to anon
  using (
    learner_id::text = (
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-learner-id'
    )
  );

create policy "Learners can create mastery for their cookie id"
  on public.learner_mastery
  for insert
  to anon
  with check (
    learner_id::text = (
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-learner-id'
    )
  );

create policy "Learners can update mastery for their cookie id"
  on public.learner_mastery
  for update
  to anon
  using (
    learner_id::text = (
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-learner-id'
    )
  )
  with check (
    learner_id::text = (
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-learner-id'
    )
  );
