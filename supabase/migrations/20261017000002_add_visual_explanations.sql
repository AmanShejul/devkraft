alter table public.quiz_sets
  add column if not exists visual_explanation jsonb;

comment on column public.quiz_sets.visual_explanation is 'Validated, source-grounded visual guide generated from the teacher material and safe to show with the published assignment.';
