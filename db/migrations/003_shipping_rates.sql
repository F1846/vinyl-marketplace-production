CREATE TABLE IF NOT EXISTS "shipping_rates" (
  "id" uuid PRIMARY KEY,
  "country_code" varchar(8) NOT NULL,
  "format_scope" varchar(16) NOT NULL DEFAULT 'all',
  "min_quantity" integer NOT NULL DEFAULT 1,
  "max_quantity" integer,
  "rate_cents" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "shipping_rates_country_format_idx"
  ON "shipping_rates" ("country_code", "format_scope", "min_quantity");

INSERT INTO "shipping_rates" ("id", "country_code", "format_scope", "min_quantity", "max_quantity", "rate_cents")
VALUES
  ('31ff0c84-4d6b-4f83-a0a2-b376c6d2b1a1', 'DE', 'vinyl', 1, 2, 799),
  ('1de59b61-f66e-4177-9639-a219ddb2f3c6', 'DE', 'vinyl', 3, 5, 1199),
  ('f9fa44f1-2a27-43bf-8f4f-48e872db143b', 'DE', 'cassette', 1, 3, 499),
  ('ad9379a4-614e-4b5e-9b02-5b9715fe0bc5', 'DE', 'cd', 1, 3, 499),
  ('696b75a7-0f95-48ea-aad8-7ffbcccb7a8a', 'FR', 'vinyl', 1, 2, 1299),
  ('3934ce6e-638f-4bd0-91b7-d6a4a8c2c8b2', 'FR', 'vinyl', 3, 5, 1799),
  ('b3a58b3a-29ae-43f1-8a67-ebdf8c12f50f', 'FR', 'cassette', 1, 3, 699),
  ('764892bc-2751-4d77-afb1-0f7dadc0fd5f', 'FR', 'cd', 1, 3, 699),
  ('74d801dd-8786-455f-b5af-1c695ef906b8', 'US', 'vinyl', 1, 2, 1899),
  ('a0f0b711-874d-4f66-b48f-882ef23b1a03', 'US', 'vinyl', 3, 5, 2799),
  ('4e98abf0-1bf1-4560-ab14-f28a8b8feafb', 'US', 'cassette', 1, 3, 999),
  ('6e84276d-6400-419c-b399-f995702d002b', 'US', 'cd', 1, 3, 999),
  ('7187d6e8-7624-4331-aa4f-07615e4a8b3a', 'ALL', 'vinyl', 1, 2, 1499),
  ('fb64dcd4-8b85-48cb-a76f-b8a9d7202cac', 'ALL', 'vinyl', 3, 5, 2199),
  ('5d31fb7b-37f8-4fa8-8043-a43616bf7ddb', 'ALL', 'cassette', 1, 3, 899),
  ('69ce85f2-9b7f-4e44-b16f-50a6e7f60934', 'ALL', 'cd', 1, 3, 899)
ON CONFLICT ("id") DO NOTHING;
