create table if not exists public.teacher_documents (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mime_type text not null,
  status text not null check (status in ('processing', 'ready', 'failed')),
  failure_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_document_chunks (
  id text primary key,
  document_id uuid not null references public.teacher_documents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  page_number integer,
  topic text,
  concepts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_sets (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null,
  topic text not null,
  instructions text not null default '',
  status text not null check (status in ('draft', 'reviewed', 'published', 'archived')),
  available_from timestamptz,
  due_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id text primary key,
  quiz_set_id uuid not null references public.quiz_sets(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_type text not null check (question_type in ('mcq', 'short-answer')),
  prompt text not null,
  options jsonb,
  explanation text not null,
  subject text not null,
  topic text not null,
  concept_id text,
  difficulty text not null check (difficulty in ('foundation', 'intermediate', 'advanced')),
  source_document_id uuid references public.teacher_documents(id) on delete set null,
  source_document_name text not null,
  source_page integer,
  source_excerpt text not null,
  generation_status text not null check (generation_status in ('grounded', 'needs-review')),
  review_status text not null check (review_status in ('draft', 'reviewed', 'published')),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_question_answers (
  question_id text primary key references public.quiz_questions(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete cascade,
  correct_answer text not null
);

create table if not exists public.quiz_attempts (
  id uuid primary key,
  quiz_set_id uuid not null references public.quiz_sets(id) on delete restrict,
  learner_id uuid not null references auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  unique (id, learner_id)
);

create table if not exists public.quiz_responses (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id text not null references public.quiz_questions(id) on delete restrict,
  response text not null,
  is_correct boolean not null,
  topic text not null,
  difficulty text not null,
  concept_id text,
  primary key (attempt_id, question_id)
);

alter table public.teacher_documents enable row level security;
alter table public.teacher_document_chunks enable row level security;
alter table public.quiz_sets enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_question_answers enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_responses enable row level security;

grant select, insert, update on public.teacher_documents to authenticated;
grant select, insert, update on public.teacher_document_chunks to authenticated;
grant select, insert, update on public.quiz_sets to authenticated;
grant select, insert, update on public.quiz_questions to authenticated;
grant select, insert, update on public.quiz_question_answers to authenticated;
grant select, insert on public.quiz_attempts to authenticated;
grant select, insert on public.quiz_responses to authenticated;

create policy "Teachers own documents" on public.teacher_documents for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Teachers own document chunks" on public.teacher_document_chunks for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Teachers own quiz sets" on public.quiz_sets for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Teachers manage quiz questions" on public.quiz_questions for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Teachers manage answer keys" on public.quiz_question_answers for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Students read available quiz sets" on public.quiz_sets for select to authenticated using (status = 'published' and (available_from is null or available_from <= now()) and (due_at is null or due_at >= now()));
create policy "Students read published questions" on public.quiz_questions for select to authenticated using (review_status = 'published' and exists (select 1 from public.quiz_sets set where set.id = quiz_set_id and set.status = 'published' and (set.available_from is null or set.available_from <= now()) and (set.due_at is null or set.due_at >= now())));
create policy "Learners create their attempts" on public.quiz_attempts for insert to authenticated with check (learner_id = auth.uid() and exists (select 1 from public.quiz_sets set where set.id = quiz_set_id and set.status = 'published'));
create policy "Learners read their attempts" on public.quiz_attempts for select to authenticated using (learner_id = auth.uid());
create policy "Learners create their responses" on public.quiz_responses for insert to authenticated with check (exists (select 1 from public.quiz_attempts attempt where attempt.id = attempt_id and attempt.learner_id = auth.uid()));

comment on table public.teacher_document_chunks is 'Private extracted chunks; original uploaded binaries are not retained by the initial workflow.';
