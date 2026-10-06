-- Reviews of any length: drop the 5 character minimum, keep the 800 character cap.
-- Safe to run more than once.

do $$
declare
  c text;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.reviews'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%char_length(comment)%'
  loop
    execute format('alter table public.reviews drop constraint %I', c);
  end loop;
end $$;

alter table public.reviews
  add constraint reviews_comment_length check (char_length(comment) between 1 and 800);
