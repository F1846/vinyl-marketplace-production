CREATE TABLE IF NOT EXISTS "rate_limits" (
  "bucket_key" varchar(255) PRIMARY KEY,
  "count" integer NOT NULL DEFAULT 1,
  "reset_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "rate_limits_reset_at_idx"
  ON "rate_limits" ("reset_at");
