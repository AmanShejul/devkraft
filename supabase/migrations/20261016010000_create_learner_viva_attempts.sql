create table if not exists public.learner_viva_attempts (
  learner_id uuid not null,
  mission_id text not null,
  counted_at timestamptz not null default now(),
  primary key (learner_id, mission_id)
);

alter table public.learner_viva_attempts enable row level security;

grant select, insert, update, delete on public.learner_viva_attempts to anon;

create policy "Learners can access viva attempts for their cookie id"
  on public.learner_viva_attempts
  for all
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
