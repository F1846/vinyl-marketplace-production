CREATE TABLE IF NOT EXISTS "admin_login_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ip" varchar(64),
  "user_agent" varchar(512),
  "result" varchar(32) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "admin_login_logs_created_at_idx"
  ON "admin_login_logs" ("created_at" DESC);
