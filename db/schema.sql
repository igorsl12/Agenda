-- Schema do Agenda — autenticação + dados por usuário (Neon/Postgres).
-- Rode uma vez no seu banco Neon (SQL Editor do console ou psql).
-- Idempotente: pode rodar de novo sem quebrar.

create extension if not exists pgcrypto;  -- gen_random_uuid()
create extension if not exists citext;    -- email case-insensitive

-- Usuários. password_hash é null em contas só-Google; google_id é null em
-- contas só-senha. Uma conta pode ter os dois (mesmo email).
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         citext unique not null,
  password_hash text,
  name          text not null default '',
  google_id     text unique,
  created_at    timestamptz not null default now()
);

-- Sessões. Guardamos apenas o HASH do token (sha256): um vazamento do banco
-- não expõe tokens de sessão utilizáveis. O token cru vive só no cookie/cliente.
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text unique not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);

-- Compromissos, escopados por usuário (isolamento garantido no servidor via
-- WHERE user_id = <sessão>). O on delete cascade limpa tudo se a conta some.
create table if not exists appointments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  title       text not null default '',
  specialty   text not null default '',
  date_iso    text not null default '',
  "time"      text not null default '',
  location    text not null default '',
  notes       text not null default '',
  status      text not null default 'Confirmado',
  category    text not null default 'outro',
  color       text not null default '',
  initials    text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists appointments_user_id_idx on appointments(user_id);

-- Preferências, uma linha por usuário.
create table if not exists settings (
  user_id                uuid primary key references users(id) on delete cascade,
  user_name              text not null default '',
  notifications_enabled  boolean not null default true,
  remind_one_hour_before boolean not null default true
);
