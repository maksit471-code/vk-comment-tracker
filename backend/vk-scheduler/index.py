"""
Планировщик: запускает сбор комментариев по каждой группе параллельно.
Вызывается внешним cron-триггером (GET /).
"""

import os
import json
import urllib.request
import psycopg2
from concurrent.futures import ThreadPoolExecutor

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p94871206_vk_comment_tracker")
FETCH_URL = "https://functions.poehali.dev/1ba8f77d-759f-4bd4-bfc3-bd43b661451d"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def fire_group(group_id: int) -> None:
    """Запускает fetch для одной группы — fire and forget (не ждёт ответа)."""
    url = f"{FETCH_URL}?action=fetch&group_id={group_id}"
    req = urllib.request.Request(url, data=b"{}", method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        # Минимальный таймаут — просто отправляем запрос, не ждём полного ответа
        with urllib.request.urlopen(req, timeout=3) as r:
            r.read()
    except Exception:
        pass


def handler(event: dict, context) -> dict:
    """Запускает сбор комментариев параллельно по каждой активной группе (fire-and-forget)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {SCHEMA}.groups WHERE is_active = TRUE")
    group_ids = [row[0] for row in cur.fetchall()]
    conn.close()

    if not group_ids:
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "groups": 0})}

    with ThreadPoolExecutor(max_workers=min(len(group_ids), 9)) as executor:
        for gid in group_ids:
            executor.submit(fire_group, gid)

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"ok": True, "groups": len(group_ids), "fired": len(group_ids)}),
    }