import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pymongo import MongoClient


ROOT = Path(__file__).resolve().parents[1]
TABLES = [
    "products",
    "product_images",
    "orders",
    "order_items",
    "shipping_rates",
    "rate_limits",
]


def load_dotenv_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def get_database_url() -> str:
    load_dotenv_file(ROOT / ".env.local")
    load_dotenv_file(ROOT / ".env")
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured.")
    return database_url


def get_mongo_config() -> tuple[str, str]:
    mongo_uri = os.environ.get("MONGODB_BACKUP_URI", "").strip()
    mongo_db = os.environ.get("MONGODB_BACKUP_DB", "").strip() or "federico_shop_backup"

    if len(os.sys.argv) > 1 and os.sys.argv[1].strip():
        mongo_uri = os.sys.argv[1].strip()

    if len(os.sys.argv) > 2 and os.sys.argv[2].strip():
        mongo_db = os.sys.argv[2].strip()

    if not mongo_uri:
        raise RuntimeError(
            "MongoDB backup URI is required. Pass it as the first argument or set MONGODB_BACKUP_URI."
        )

    return mongo_uri, mongo_db


def run_psql_json_query(database_url: str, query: str) -> Any:
    env = dict(os.environ)
    env["PGCLIENTENCODING"] = "UTF8"
    result = subprocess.run(
        [
            r"C:\Program Files\PostgreSQL\17\bin\psql.exe",
            f"--dbname={database_url}",
            "-t",
            "-A",
            "-c",
            query,
        ],
        check=True,
        capture_output=True,
        text=False,
        env=env,
    )
    output = result.stdout.decode("utf-8", errors="replace").strip() or "null"
    return json.loads(output)


def fetch_table_rows(database_url: str, table_name: str) -> list[dict[str, Any]]:
    query = f"""
        select coalesce(json_agg(row_to_json(t)), '[]'::json)
        from (
          select *
          from public.{table_name}
          order by 1
        ) t;
    """
    rows = run_psql_json_query(database_url, query)
    return rows if isinstance(rows, list) else []


def build_mongo_documents(table_name: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    documents: list[dict[str, Any]] = []

    for row in rows:
      document = dict(row)
      if "id" in row and row["id"] is not None:
          document["_id"] = row["id"]
      elif "bucket_key" in row and row["bucket_key"] is not None:
          document["_id"] = row["bucket_key"]
      else:
          document["_id"] = f"{table_name}:{len(documents)}"
      documents.append(document)

    return documents


def main() -> None:
    database_url = get_database_url()
    mongo_uri, mongo_db_name = get_mongo_config()

    client = MongoClient(mongo_uri)
    mongo_db = client[mongo_db_name]
    imported_at = datetime.now(timezone.utc)

    counts: dict[str, int] = {}

    for table_name in TABLES:
        rows = fetch_table_rows(database_url, table_name)
        documents = build_mongo_documents(table_name, rows)
        collection = mongo_db[table_name]
        collection.delete_many({})
        if documents:
            collection.insert_many(documents, ordered=False)
        counts[table_name] = len(documents)

    mongo_db["backup_runs"].insert_one(
        {
            "importedAt": imported_at,
            "source": "postgresql",
            "tables": counts,
        }
    )

    print(json.dumps({"database": mongo_db_name, "tables": counts}, indent=2))


if __name__ == "__main__":
    main()
