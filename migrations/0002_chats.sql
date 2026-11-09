create table if not exists chats (
  id text primary key,
  user_id text not null,
  title text not null,
  renamed boolean not null default false,
  updated_at bigint not null
);

create index if not exists chats_user_idx on chats (user_id, updated_at desc);

create table if not exists chat_messages (
  id text primary key,
  chat_id text not null references chats (id) on delete cascade,
  user_id text not null,
  role text not null,
  body text not null,
  action text,
  safety text,
  position integer not null
);

create index if not exists chat_messages_chat_idx on chat_messages (chat_id, position);
