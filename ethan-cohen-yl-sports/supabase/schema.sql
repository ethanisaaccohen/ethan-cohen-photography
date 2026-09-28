create extension if not exists "uuid-ossp";
create table if not exists galleries (
 id uuid primary key default uuid_generate_v4(), title text not null, slug text unique not null, sport text not null,
 game_date date, team_home text, team_away text, home_score integer, away_score integer,
 is_public boolean not null default true, proof_token uuid unique, cover_url text, created_at timestamptz default now()
);
create table if not exists photos (
 id uuid primary key default uuid_generate_v4(), gallery_id uuid not null references galleries(id) on delete cascade,
 display_url text not null, storage_key text not null, caption text, taken_at timestamptz default now(), created_at timestamptz default now()
);
create table if not exists photo_tags (
 id uuid primary key default uuid_generate_v4(), photo_id uuid not null references photos(id) on delete cascade, tag text not null
);
create table if not exists favorite_submissions (
 id uuid primary key default uuid_generate_v4(), gallery_id uuid not null references galleries(id) on delete cascade,
 name text not null, email text not null, created_at timestamptz default now()
);
create table if not exists favorite_items (
 id uuid primary key default uuid_generate_v4(), submission_id uuid not null references favorite_submissions(id) on delete cascade,
 photo_id uuid not null references photos(id) on delete cascade
);
create index if not exists idx_photos_gallery on photos(gallery_id);
create index if not exists idx_tags_tag on photo_tags(tag);
create index if not exists idx_galleries_slug on galleries(slug);
