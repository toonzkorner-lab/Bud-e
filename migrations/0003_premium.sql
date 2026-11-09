create table if not exists memberships (
  user_id text primary key,
  tier text not null,
  source text not null,
  updated_at bigint not null
);

create table if not exists premium_profiles (
  user_id text primary key,
  persona text not null default 'bud',
  custom_name text,
  custom_voice text,
  accent text,
  theme_name text
);

create table if not exists saved_plans (
  id text primary key,
  user_id text not null,
  title text not null,
  body text not null,
  created_at bigint not null
);

create index if not exists saved_plans_user_idx on saved_plans (user_id, created_at desc);
