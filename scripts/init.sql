
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT         UNIQUE NOT NULL,
  email         TEXT         UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS channels (
  id            SERIAL       PRIMARY KEY,
  name          TEXT         UNIQUE NOT NULL,
  type          TEXT         NOT NULL CHECK (type IN ('public','private','direct')),
  metadata      JSONB,
  created_by    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_memberships (
  id            SERIAL       PRIMARY KEY,
  channel_id    INTEGER      NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  last_read     TIMESTAMPTZ,
  UNIQUE(channel_id, user_id)
);


CREATE TABLE IF NOT EXISTS messages (
  id                SERIAL     PRIMARY KEY,
  channel_id        INTEGER    NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  sender_id         UUID       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_payload BYTEA      NOT NULL,
  iv                BYTEA      NOT NULL,         -- initialization vector
  auth_tag          BYTEA      NOT NULL,
  algo              TEXT       NOT NULL DEFAULT 'aes-256-gcm',
  key_version       TEXT       NOT NULL DEFAULT 'v1',
  reply_to          INTEGER    REFERENCES messages(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
