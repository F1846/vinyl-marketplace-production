create type "public"."import_job_status" as enum('queued', 'running', 'completed', 'failed');
create type "public"."import_csv_type" as enum('inventory', 'collection');

create table "import_jobs" (
  "id" uuid primary key default gen_random_uuid() not null,
  "file_name" varchar(255) not null,
  "csv_type" "import_csv_type" not null,
  "destination" "product_status" not null,
  "status" "import_job_status" default 'queued' not null,
  "processed_rows" integer default 0 not null,
  "total_rows" integer default 0 not null,
  "current_item" varchar(512),
  "summary" jsonb,
  "error" text,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp default now() not null,
  "updated_at" timestamp default now() not null
);
