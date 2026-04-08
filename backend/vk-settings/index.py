"""
Управление ключевыми словами и настройками уведомлений. v2
GET /keywords — список ключевых слов
POST /keywords — добавить слово (body: {word})
PATCH /keywords — обновить слово (body: {id, active})
DELETE /keywords — удалить слово (body: {id})
GET /notify — настройки уведомлений
POST /notify — сохранить настройки (body: {tg_chat_id, tg_enabled, min_mentions})
"""

import os
import json
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p94871206_vk_comment_tracker")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    """Ключевые слова и настройки уведомлений."""
    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    # --- KEYWORDS ---
    if path.endswith("/keywords"):

        if method == "GET":
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"SELECT id, word, active, hits FROM {SCHEMA}.keywords ORDER BY id")
            rows = cur.fetchall()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(
                [{"id": r[0], "word": r[1], "active": r[2], "hits": r[3]} for r in rows],
                ensure_ascii=False
            )}

        body = json.loads(event.get("body") or "{}")

        if method == "POST":
            word = body.get("word", "").strip()
            if not word:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "word required"})}
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(
                f"INSERT INTO {SCHEMA}.keywords (word) VALUES (%s) ON CONFLICT (word) DO UPDATE SET active=TRUE RETURNING id, word, active, hits",
                (word,)
            )
            row = cur.fetchone()
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(
                {"id": row[0], "word": row[1], "active": row[2], "hits": row[3]}
            )}

        if method == "PATCH":
            kw_id = body.get("id")
            active = body.get("active")
            if kw_id is None or active is None:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id and active required"})}
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.keywords SET active=%s WHERE id=%s", (active, kw_id))
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        if method == "DELETE":
            kw_id = body.get("id")
            if not kw_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {SCHEMA}.keywords WHERE id=%s", (kw_id,))
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # --- NOTIFY SETTINGS ---
    if path.endswith("/notify"):

        if method == "GET":
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"SELECT key, value FROM {SCHEMA}.settings WHERE key IN ('tg_chat_id', 'tg_enabled', 'min_mentions')")
            rows = cur.fetchall()
            conn.close()
            s = {r[0]: r[1] for r in rows}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "tg_chat_id": s.get("tg_chat_id"),
                "tg_enabled": s.get("tg_enabled") == "true",
                "min_mentions": int(s.get("min_mentions") or 1),
            })}

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            conn = get_conn()
            cur = conn.cursor()
            if "tg_chat_id" in body:
                cur.execute(f"INSERT INTO {SCHEMA}.settings (key, value) VALUES ('tg_chat_id', %s) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (str(body["tg_chat_id"]) if body["tg_chat_id"] else None,))
            if "tg_enabled" in body:
                cur.execute(f"INSERT INTO {SCHEMA}.settings (key, value) VALUES ('tg_enabled', %s) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ("true" if body["tg_enabled"] else "false",))
            if "min_mentions" in body:
                cur.execute(f"INSERT INTO {SCHEMA}.settings (key, value) VALUES ('min_mentions', %s) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (str(int(body["min_mentions"])),))
            conn.commit()
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}