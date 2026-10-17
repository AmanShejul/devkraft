grant select, insert, update on public.learner_mastery to authenticated;

create policy "Authenticated learners manage their mastery"
  on public.learner_mastery
  for all
  to authenticated
  using (learner_id = auth.uid())
  with check (learner_id = auth.uid());
