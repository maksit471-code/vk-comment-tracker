"""
Планировщик: запускает сбор комментариев по ключевым словам каждую минуту.
Вызывается внешним cron-триггером (GET /).
"""

import os
import json
import urllib.request
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p94871206_vk_comment_tracker")
FETCH_URL = "https://functions.poehali.dev/1ba8f77d-759f-4bd4-bfc3-bd43b661451d"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    """Запускает сбор комментариев — вызывается по расписанию каждую минуту."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    url = f"{FETCH_URL}?action=fetch"
    req = urllib.request.Request(url, data=b"", method="POST")
    req.add_header("Content-Type", "application/json")

    with urllib.request.urlopen(req, timeout=25) as r:
        result = json.loads(r.read().decode())

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"ok": True, "result": result}),
    }
