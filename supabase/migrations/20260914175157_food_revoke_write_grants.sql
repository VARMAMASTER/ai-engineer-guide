-- Take the write grants back off `anon` and `authenticated`.
--
-- ---------------------------------------------------------------------------
-- FOUND BY ASKING THE DATABASE WHAT THE GRANTS ACTUALLY WERE
-- ---------------------------------------------------------------------------
-- `20260914165901_food_reference.sql` says, in as many words, that the public
-- reference tables have two independent locks: RLS with no write policy, AND
-- no write grant. An anonymous insert was attempted
-- (`scripts/attack-food-tables.ts`) and was refused, so the claim looked true.
-- It was not. Querying `information_schema.role_table_grants` afterwards:
--
--   food_ingredient  anon  DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE
--
-- Every food table, for both `anon` and `authenticated`. The cause is a
-- Supabase project default: `auto_expose_new_tables` grants ALL privileges on
-- a newly created table in `public` to the Data API roles, so writing
-- `grant select on ... to anon, authenticated` adds nothing and removes
-- nothing. RLS was the only thing standing between a stranger and the calorie
-- figures — which is why the attack was refused, and why it would have been
-- accepted the moment anybody wrote a permissive policy or ran
-- `alter table ... disable row level security` for five minutes of debugging.
--
-- One lock presented as two is worse than one lock, because the second one is
-- what the next person will rely on. So: revoke everything, then grant back
-- exactly what each role needs.
--
--   reference tables      SELECT only, for both roles. No exceptions.
--   food_contribution     all four verbs for `authenticated` (it is their own
--                         data, with owner policies); nothing at all for
--                         `anon`, which has no user id to own a row with.
--
-- This is the layer that RLS is defence in depth FOR, not the other way
-- around. And the lesson generalises past this feature: a `grant` statement in
-- a migration on Supabase is not evidence about the resulting privileges.
-- Check `role_table_grants`.
-- ---------------------------------------------------------------------------

revoke all on public.food_ingredient from anon, authenticated;
revoke all on public.food_recipe from anon, authenticated;
revoke all on public.food_recipe_item from anon, authenticated;
revoke all on public.food_serving from anon, authenticated;
revoke all on public.food_search_token from anon, authenticated;
revoke all on public.food_recipe_nutrition from anon, authenticated;
revoke all on public.food_contribution from anon, authenticated;

grant select on public.food_ingredient to anon, authenticated;
grant select on public.food_recipe to anon, authenticated;
grant select on public.food_recipe_item to anon, authenticated;
grant select on public.food_serving to anon, authenticated;
grant select on public.food_search_token to anon, authenticated;
grant select on public.food_recipe_nutrition to anon, authenticated;

grant select, insert, update, delete on public.food_contribution to authenticated;

-- The sequence behind `food_serving.id` goes with the table: an identity
-- column's sequence carries its own privileges, and leaving USAGE on it to
-- `anon` is a loose end even with the insert grant gone.
revoke all on sequence public.food_serving_id_seq from anon, authenticated;
