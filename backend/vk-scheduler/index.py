"""
Планировщик: запускает сбор комментариев по всем группам одним вызовом. v4
Вызывается внешним cron-триггером (GET /).

ВАЖНО: раньше сбор запускался параллельно (или быстро друг за другом)
по каждой группе отдельным HTTP-вызовом — это приводило к тому, что
несколько запросов к VK API уходили почти одновременно с одного токена,
и VK отвечал ошибкой "Flood control" (лимит ~3 запроса/сек на токен),
из-за чего сбор комментариев вообще переставал работать.

Теперь планировщик запускает ОДИН fire-and-forget вызов vk-comments
без group_id — внутри vk-comments все активные группы обрабатываются
строго последовательно с паузой между запросами к VK, что не превышает
лимит VK. Из-за этого сама функция vk-comments может выполняться дольше
5 секунд (default timeout) — таймаут для неё нужно увеличить вручную
в настройках функции (Ядро → Функции → vk-comments → Настройки).
"""

import os
import json
import urllib.request
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p94871206_vk_comment_tracker")
FETCH_URL = "https://functions.poehali.dev/17eaf892-d045-4ff2-b295-04bf9d4322e7"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def fire_fetch_all() -> None:
    """Запускает fetch по всем активным группам одним вызовом — fire and forget."""
    url = f"{FETCH_URL}?action=fetch"
    req = urllib.request.Request(url, data=b"{}", method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        # Короткий таймаут — не ждём завершения долгого сбора, просто запускаем его
        with urllib.request.urlopen(req, timeout=2) as r:
            r.read()
    except Exception:
        pass


def handler(event: dict, context) -> dict:
    """Запускает единый сбор комментариев по всем активным группам (fire-and-forget)."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.groups WHERE is_active = TRUE")
    active_count = cur.fetchone()[0]
    conn.close()

    if not active_count:
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "groups": 0})}

    fire_fetch_all()

    return {
        "statusCode": 200,
        "headers": CORS,
        "body": json.dumps({"ok": True, "groups": active_count, "fired": True}),
    }