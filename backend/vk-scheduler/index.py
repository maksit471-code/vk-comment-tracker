"""
Планировщик: запускает сбор комментариев по каждой группе параллельно.
Вызывается внешним cron-триггером (GET /).
"""

import os
import json
import urllib.request
import psycopg2
from concurrent.futures import ThreadPoolExecutor, as_completed

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p94871206_vk_comment_tracker")
FETCH_URL = "https://functions.poehali.dev/1ba8f77d-759f-4bd4-bfc3-bd43b661451d"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def fetch_group(group_id: int) -> dict:
    """Вызывает сбор комментариев для одной группы."""
    url = f"{FETCH_URL}?action=fetch&group_id={group_id}"
    req = urllib.request.Request(url, data=b"{}", method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return {"group_id": group_id, "ok": True, "result": json.loads(r.read().decode())}
    except Exception as e:
        return {"group_id": group_id, "ok": False, "error": str(e)}


def handler(event: dict, context) -> dict:
    """Запускает сбор комментариев параллельно по каждой активной группе."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {SCHEMA}.groups WHERE is_active = TRUE")
    group_ids = [row[0] for row in cur.fetchall()]
    conn.close()

    if not group_ids:
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "groups": 0})}

    results = []
    with ThreadPoolExecutor(max_workers=min(len(group_ids), 5)) as executor:
        futures = {executor.submit(fetch_group, gid): gid for gid in group_ids}
        for future in as_completed(futures):
            results.append(future.result())

    ok_count = sum(1 for r in results if r.get("ok"))
    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"ok": True, "groups": len(group_ids), "success": ok_count, "results": results}),
    }
