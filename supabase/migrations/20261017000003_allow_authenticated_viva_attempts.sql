grant select, insert, update, delete on public.learner_viva_attempts to authenticated;

create policy "Authenticated learners manage their viva attempts"
  on public.learner_viva_attempts
  for all
  to authenticated
  using (learner_id = auth.uid())
  with check (learner_id = auth.uid());
