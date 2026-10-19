drop extension if exists "pg_net";

drop trigger if exists "trg_divemaster_reviews_set_author" on "public"."divemaster_reviews";

drop trigger if exists "update_divemaster_reviews_updated_at" on "public"."divemaster_reviews";

drop policy "Anyone can read visible shop reviews" on "public"."shop_reviews";

revoke delete on table "public"."divemaster_reviews" from "anon";

revoke insert on table "public"."divemaster_reviews" from "anon";

revoke references on table "public"."divemaster_reviews" from "anon";

revoke select on table "public"."divemaster_reviews" from "anon";

revoke trigger on table "public"."divemaster_reviews" from "anon";

revoke truncate on table "public"."divemaster_reviews" from "anon";

revoke update on table "public"."divemaster_reviews" from "anon";

revoke delete on table "public"."divemaster_reviews" from "authenticated";

revoke insert on table "public"."divemaster_reviews" from "authenticated";

revoke references on table "public"."divemaster_reviews" from "authenticated";

revoke select on table "public"."divemaster_reviews" from "authenticated";

revoke trigger on table "public"."divemaster_reviews" from "authenticated";

revoke truncate on table "public"."divemaster_reviews" from "authenticated";

revoke update on table "public"."divemaster_reviews" from "authenticated";

revoke delete on table "public"."divemaster_reviews" from "service_role";

revoke insert on table "public"."divemaster_reviews" from "service_role";

revoke references on table "public"."divemaster_reviews" from "service_role";

revoke select on table "public"."divemaster_reviews" from "service_role";

revoke trigger on table "public"."divemaster_reviews" from "service_role";

revoke truncate on table "public"."divemaster_reviews" from "service_role";

revoke update on table "public"."divemaster_reviews" from "service_role";

alter table "public"."divemaster_reviews" drop constraint "divemaster_reviews_body_check";

alter table "public"."divemaster_reviews" drop constraint "divemaster_reviews_check";

alter table "public"."divemaster_reviews" drop constraint "divemaster_reviews_divemaster_user_id_fkey";

alter table "public"."divemaster_reviews" drop constraint "divemaster_reviews_rating_check";

alter table "public"."divemaster_reviews" drop constraint "divemaster_reviews_user_id_divemaster_user_id_key";

alter table "public"."divemaster_reviews" drop constraint "divemaster_reviews_user_id_fkey";

alter table "public"."shop_reviews" drop constraint "shop_reviews_booking_submission_id_fkey";

drop function if exists "public"."get_shop_review_summaries"(p_shop_ids uuid[]);

drop function if exists "public"."set_divemaster_review_author_display_name"();

alter table "public"."divemaster_reviews" drop constraint "divemaster_reviews_pkey";

alter table "public"."diveshops" drop constraint "diveshops_pkey";

drop index if exists "public"."divemaster_reviews_pkey";

drop index if exists "public"."divemaster_reviews_user_id_divemaster_user_id_key";

drop index if exists "public"."idx_divemaster_reviews_hidden_created_at";

drop index if exists "public"."idx_divemaster_reviews_profile_created_at";

drop index if exists "public"."idx_diveshops_lat_lon";

drop index if exists "public"."idx_shop_reviews_booking_submission_id";

drop index if exists "public"."idx_shop_reviews_hidden_created_at";

drop index if exists "public"."diveshops_pkey";

drop index if exists "public"."idx_diveshops_google_rating";

drop table "public"."divemaster_reviews";


  create table "public"."diveshops_old" (
    "id" uuid not null default gen_random_uuid(),
    "business_name" text not null,
    "street_address" text,
    "locale" text not null,
    "country" text not null,
    "website_url" text,
    "phone" text,
    "email" text,
    "google_rating" numeric(3,1),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "region" text,
    "operating_hours" jsonb,
    "timezone" text,
    "languages" text[]
      );


alter table "public"."diveshops_old" enable row level security;

alter table "public"."diveshops" drop column "latitude";

alter table "public"."diveshops" drop column "longitude";

alter table "public"."diveshops" drop column "notes";

alter table "public"."diveshops" drop column "social_links";

alter table "public"."shop_reviews" drop column "booking_submission_id";

alter table "public"."shop_reviews" drop column "hidden";

CREATE UNIQUE INDEX diveshops_pkey1 ON public.diveshops USING btree (id);

CREATE INDEX idx_diveshops_country ON public.diveshops_old USING btree (country);

CREATE INDEX idx_diveshops_languages ON public.diveshops_old USING gin (languages);

CREATE INDEX idx_diveshops_locale ON public.diveshops_old USING btree (locale);

CREATE INDEX idx_diveshops_region ON public.diveshops_old USING btree (region);

CREATE UNIQUE INDEX diveshops_pkey ON public.diveshops_old USING btree (id);

CREATE INDEX idx_diveshops_google_rating ON public.diveshops_old USING btree (google_rating);

alter table "public"."diveshops" add constraint "diveshops_pkey1" PRIMARY KEY using index "diveshops_pkey1";

alter table "public"."diveshops_old" add constraint "diveshops_pkey" PRIMARY KEY using index "diveshops_pkey";

grant delete on table "public"."diveshops_old" to "anon";

grant insert on table "public"."diveshops_old" to "anon";

grant references on table "public"."diveshops_old" to "anon";

grant select on table "public"."diveshops_old" to "anon";

grant trigger on table "public"."diveshops_old" to "anon";

grant truncate on table "public"."diveshops_old" to "anon";

grant update on table "public"."diveshops_old" to "anon";

grant delete on table "public"."diveshops_old" to "authenticated";

grant insert on table "public"."diveshops_old" to "authenticated";

grant references on table "public"."diveshops_old" to "authenticated";

grant select on table "public"."diveshops_old" to "authenticated";

grant trigger on table "public"."diveshops_old" to "authenticated";

grant truncate on table "public"."diveshops_old" to "authenticated";

grant update on table "public"."diveshops_old" to "authenticated";

grant delete on table "public"."diveshops_old" to "service_role";

grant insert on table "public"."diveshops_old" to "service_role";

grant references on table "public"."diveshops_old" to "service_role";

grant select on table "public"."diveshops_old" to "service_role";

grant trigger on table "public"."diveshops_old" to "service_role";

grant truncate on table "public"."diveshops_old" to "service_role";

grant update on table "public"."diveshops_old" to "service_role";


  create policy "Allow authenticated users to insert"
  on "public"."diveshops_old"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Allow authenticated users to update"
  on "public"."diveshops_old"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Allow public read access"
  on "public"."diveshops_old"
  as permissive
  for select
  to public
using (true);



  create policy "Admins delete any shop reviews"
  on "public"."shop_reviews"
  as permissive
  for delete
  to authenticated
using (public.is_app_admin());



  create policy "Anyone can read shop reviews"
  on "public"."shop_reviews"
  as permissive
  for select
  to public
using (true);



  create policy "Users insert own shop reviews"
  on "public"."shop_reviews"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users update own shop reviews"
  on "public"."shop_reviews"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


CREATE TRIGGER update_diveshops_updated_at BEFORE UPDATE ON public.diveshops_old FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


