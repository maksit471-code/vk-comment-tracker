"""
Управление ключевыми словами и настройками уведомлений. v4
action=keywords_list — список ключевых слов
action=keywords_add — добавить слово (body: {word})
action=keywords_toggle — переключить (body: {id, active})
action=keywords_delete — удалить (body: {id})
action=notify_get — настройки уведомлений
action=notify_save — сохранить (body: {tg_chat_id, tg_enabled, min_mentions})
action=vk_token_save — сохранить токен VK (body: {token})
action=vk_token_get — получить статус токена VK (есть/нет)
"""

import os
import json
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p94871206_vk_comment_tracker")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    """Ключевые слова и настройки уведомлений."""
    method = event.get("httpMethod", "GET")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    body = json.loads(event.get("body") or "{}")
    action = params.get("action") or body.get("action", "")

    conn = get_conn()
    cur = conn.cursor()

    try:
        # --- keywords_list ---
        if action == "keywords_list":
            cur.execute(f"SELECT id, word, active, hits FROM {SCHEMA}.keywords ORDER BY id")
            rows = cur.fetchall()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(
                [{"id": r[0], "word": r[1], "active": r[2], "hits": r[3]} for r in rows],
                ensure_ascii=False
            )}

        # --- keywords_add ---
        if action == "keywords_add":
            word = body.get("word", "").strip()
            if not word:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "word required"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.keywords (word) VALUES (%s) ON CONFLICT (word) DO UPDATE SET active=TRUE RETURNING id, word, active, hits",
                (word,)
            )
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps(
                {"id": row[0], "word": row[1], "active": row[2], "hits": row[3]}
            )}

        # --- keywords_toggle ---
        if action == "keywords_toggle":
            kw_id = body.get("id")
            active = body.get("active")
            if kw_id is None or active is None:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id and active required"})}
            cur.execute(f"UPDATE {SCHEMA}.keywords SET active=%s WHERE id=%s", (active, kw_id))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # --- keywords_delete ---
        if action == "keywords_delete":
            kw_id = body.get("id")
            if not kw_id:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}
            cur.execute(f"DELETE FROM {SCHEMA}.keywords WHERE id=%s", (kw_id,))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # --- notify_get ---
        if action == "notify_get":
            cur.execute(f"SELECT key, value FROM {SCHEMA}.settings WHERE key IN ('tg_chat_id', 'tg_enabled', 'min_mentions')")
            rows = cur.fetchall()
            s = {r[0]: r[1] for r in rows}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "tg_chat_id": s.get("tg_chat_id"),
                "tg_enabled": s.get("tg_enabled") == "true",
                "min_mentions": int(s.get("min_mentions") or 1),
            })}

        # --- notify_save ---
        if action == "notify_save":
            if "tg_chat_id" in body:
                cur.execute(f"INSERT INTO {SCHEMA}.settings (key, value) VALUES ('tg_chat_id', %s) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (str(body["tg_chat_id"]) if body["tg_chat_id"] else None,))
            if "tg_enabled" in body:
                cur.execute(f"INSERT INTO {SCHEMA}.settings (key, value) VALUES ('tg_enabled', %s) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ("true" if body["tg_enabled"] else "false",))
            if "min_mentions" in body:
                cur.execute(f"INSERT INTO {SCHEMA}.settings (key, value) VALUES ('min_mentions', %s) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", (str(int(body["min_mentions"])),))
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # --- vk_token_save ---
        if action == "vk_token_save":
            token = body.get("token", "").strip()
            if not token:
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "token required"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.settings (key, value) VALUES ('vk_token', %s) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
                (token,)
            )
            conn.commit()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

        # --- vk_token_get ---
        if action == "vk_token_get":
            cur.execute(f"SELECT value FROM {SCHEMA}.settings WHERE key='vk_token'")
            row = cur.fetchone()
            has_token = bool(row and row[0])
            masked = None
            if has_token:
                v = row[0]
                masked = v[:8] + "..." + v[-4:] if len(v) > 12 else "***"
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"has_token": has_token, "masked": masked})}

        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Unknown action"})}

    finally:
        conn.close()