alter table public.quiz_sets
  add column if not exists topic_id uuid,
  add column if not exists learning_stage text not null default 'diagnostic';

update public.quiz_sets
set topic_id = id
where topic_id is null;

alter table public.quiz_sets
  alter column topic_id set not null,
  add constraint quiz_sets_learning_stage_check check (learning_stage in ('diagnostic', 'practice'));

create index if not exists quiz_sets_topic_stage_idx
  on public.quiz_sets(topic_id, learning_stage, status);

alter table public.quiz_attempts
  add column if not exists learning_stage text not null default 'diagnostic';

alter table public.quiz_attempts
  add constraint quiz_attempts_learning_stage_check check (learning_stage in ('diagnostic', 'practice'));

create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table if not exists public.student_learning_events (
  id uuid primary key,
  learner_id uuid not null,
  quiz_set_id uuid not null references public.quiz_sets(id) on delete cascade,
  topic_id uuid not null,
  event_type text not null check (event_type in ('topic_opened', 'diagnostic_completed', 'explanation_viewed', 'concept_revisited', 'practice_completed', 'topic_completed')),
  concept_id text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists student_learning_events_learner_time_idx
  on public.student_learning_events(learner_id, occurred_at desc);

create index if not exists student_learning_events_quiz_set_idx
  on public.student_learning_events(quiz_set_id, occurred_at desc);

alter table public.student_profiles enable row level security;
alter table public.student_learning_events enable row level security;

grant select on public.student_profiles to authenticated;
grant insert, update on public.student_profiles to authenticated;
grant select, insert on public.student_learning_events to authenticated;

create policy "Students read their profile" on public.student_profiles
  for select to authenticated using (id = auth.uid());

create policy "Students create their profile" on public.student_profiles
  for insert to authenticated with check (id = auth.uid());

create policy "Students update their profile" on public.student_profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Teachers read profiles in their quiz activity" on public.student_profiles
  for select to authenticated using (
    exists (
      select 1
      from public.quiz_attempts attempt
      join public.quiz_sets quiz on quiz.id = attempt.quiz_set_id
      where attempt.learner_id = student_profiles.id
        and quiz.owner_id = auth.uid()
    )
  );

create policy "Students read their learning events" on public.student_learning_events
  for select to authenticated using (learner_id = auth.uid());

create policy "Students create their learning events" on public.student_learning_events
  for insert to authenticated with check (
    learner_id = auth.uid()
    and exists (
      select 1 from public.quiz_sets quiz
      where quiz.id = quiz_set_id
        and quiz.topic_id = student_learning_events.topic_id
        and quiz.status = 'published'
    )
  );

create policy "Teachers read events for owned quizzes" on public.student_learning_events
  for select to authenticated using (
    exists (
      select 1 from public.quiz_sets quiz
      where quiz.id = quiz_set_id and quiz.owner_id = auth.uid()
    )
  );

create policy "Teachers read attempts for owned quiz sets" on public.quiz_attempts
  for select to authenticated using (
    exists (select 1 from public.quiz_sets quiz where quiz.id = quiz_set_id and quiz.owner_id = auth.uid())
  );

create policy "Teachers read responses for owned quiz sets" on public.quiz_responses
  for select to authenticated using (
    exists (
      select 1 from public.quiz_attempts attempt
      join public.quiz_sets quiz on quiz.id = attempt.quiz_set_id
      where attempt.id = attempt_id and quiz.owner_id = auth.uid()
    )
  );