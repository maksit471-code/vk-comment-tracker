"""
Telegram: уведомления, управление TG-группами, сбор и мониторинг сообщений. v2
POST / {action: "test", username} — тестовое сообщение
POST / {action: "send", chat_id, message} — отправить уведомление
POST / {action: "status"} — проверить бота
GET /updates — получить последние сообщения боту (для поиска chat_id)

TG-группы (мониторинг):
GET /?action=groups_list — список TG-групп
POST / {action: "groups_add", username/tg_id} — добавить группу
POST / {action: "groups_toggle", id, is_active} — вкл/выкл группу
POST / {action: "groups_delete", id} — удалить группу
POST / {action: "fetch"} — собрать новые сообщения из всех активных TG-групп
GET /?action=messages — последние сообщения (query: limit, group_id)
GET /?action=messages_stats — статистика
"""

import os
import json
import datetime
import urllib.request
import urllib.parse
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p94871206_vk_comment_tracker")
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_API = "https://api.telegram.org"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def tg(method: str, params: dict = {}) -> dict:
    url = f"{TG_API}/bot{BOT_TOKEN}/{method}"
    data = json.dumps(params).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())


def send_message(chat_id, text: str) -> dict:
    return tg("sendMessage", {"chat_id": chat_id, "text": text, "parse_mode": "HTML"})


def check_keywords(text: str, keywords: list) -> list:
    text_lower = text.lower()
    return [kw for kw in keywords if kw["word"].lower() in text_lower]


def handler(event: dict, context) -> dict:
    """Telegram-интеграция: уведомления, мониторинг TG-групп."""
    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    # GET /updates — последние сообщения боту
    if method == "GET" and not params.get("action"):
        result = tg("getUpdates", {"limit": 20, "offset": -20})
        updates = result.get("result", [])
        chats = []
        for u in updates:
            msg = u.get("message") or u.get("my_chat_member", {})
            chat = msg.get("chat", {}) if isinstance(msg, dict) else {}
            if chat.get("id"):
                chats.append({
                    "chat_id": chat["id"],
                    "username": chat.get("username", ""),
                    "first_name": chat.get("first_name", ""),
                    "last_name": chat.get("last_name", ""),
                })
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"updates": chats}, ensure_ascii=False)}

    # GET /?action=groups_list
    if method == "GET" and params.get("action") == "groups_list":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            SELECT id, tg_id, username, title, photo_url, members_count, is_active, created_at
            FROM {SCHEMA}.tg_groups ORDER BY created_at DESC
        """)
        rows = cur.fetchall()
        conn.close()
        groups = [
            {
                "id": r[0], "tg_id": r[1], "username": r[2], "title": r[3],
                "photo_url": r[4], "members_count": r[5], "is_active": r[6],
                "created_at": r[7].isoformat() if r[7] else None,
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(groups, ensure_ascii=False)}

    # GET /?action=messages
    if method == "GET" and params.get("action") == "messages":
        conn = get_conn()
        cur = conn.cursor()
        limit = int(params.get("limit", 50))
        group_id = params.get("group_id")
        if group_id:
            cur.execute(f"""
                SELECT m.id, m.group_id, g.title, m.tg_message_id, m.author_id,
                       m.author_name, m.author_username, m.text, m.published_at, m.fetched_at
                FROM {SCHEMA}.tg_messages m
                JOIN {SCHEMA}.tg_groups g ON g.id = m.group_id
                WHERE m.group_id=%s ORDER BY m.published_at DESC LIMIT %s
            """, (group_id, limit))
        else:
            cur.execute(f"""
                SELECT m.id, m.group_id, g.title, m.tg_message_id, m.author_id,
                       m.author_name, m.author_username, m.text, m.published_at, m.fetched_at
                FROM {SCHEMA}.tg_messages m
                JOIN {SCHEMA}.tg_groups g ON g.id = m.group_id
                ORDER BY m.published_at DESC LIMIT %s
            """, (limit,))
        rows = cur.fetchall()
        conn.close()
        messages = [
            {
                "id": r[0], "group_id": r[1], "group_title": r[2],
                "tg_message_id": r[3], "author_id": r[4],
                "author_name": r[5], "author_username": r[6],
                "text": r[7],
                "published_at": r[8].isoformat() if r[8] else None,
                "fetched_at": r[9].isoformat() if r[9] else None,
                "source": "telegram",
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(messages, ensure_ascii=False)}

    # GET /?action=messages_stats
    if method == "GET" and params.get("action") == "messages_stats":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.tg_messages")
        total = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.tg_groups WHERE is_active=TRUE")
        active_groups = cur.fetchone()[0]
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "total_messages": total,
            "active_groups": active_groups,
        })}

    if method != "POST":
        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}

    if not BOT_TOKEN:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"ok": False, "error": "Токен бота не настроен"})}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "")

    # status
    if action == "status":
        me = tg("getMe", {})
        if me.get("ok"):
            bot = me["result"]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "ok": True,
                "bot_name": bot.get("first_name"),
                "bot_username": bot.get("username"),
            })}
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": False, "error": "Неверный токен"})}

    # test
    if action == "test":
        username = body.get("username", "").replace("@", "").strip()
        chat_id = body.get("chat_id")
        if not chat_id and not username:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"ok": False, "error": "Укажите username или chat_id"})}
        target = chat_id if chat_id else f"@{username}"
        result = send_message(target, "✅ <b>BSF Monitor</b>\n\nTelegram-уведомления успешно подключены!")
        if result.get("ok"):
            msg = result["result"]
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                "ok": True,
                "chat_id": msg["chat"]["id"],
                "username": msg["chat"].get("username", ""),
            })}
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"ok": False, "error": result.get("description", "Ошибка")})}

    # send
    if action == "send":
        chat_id = body.get("chat_id")
        message = body.get("message", "")
        if not chat_id or not message:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "chat_id and message required"})}
        result = send_message(chat_id, message)
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": result.get("ok", False)})}

    # groups_add — добавить TG-группу
    if action == "groups_add":
        identifier = str(body.get("username") or body.get("tg_id") or "").strip().lstrip("@")
        if not identifier:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "username или tg_id обязателен"})}

        chat_id_param = int(identifier) if identifier.lstrip("-").isdigit() else f"@{identifier}"
        result = tg("getChat", {"chat_id": chat_id_param})
        if not result.get("ok"):
            desc = result.get("description", "Группа не найдена")
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": f"Не удалось найти группу: {desc}. Убедитесь, что бот добавлен в группу."})}

        chat = result["result"]
        tg_id = chat["id"]
        title = chat.get("title") or chat.get("first_name") or str(tg_id)
        username = chat.get("username", "")

        count_result = tg("getChatMemberCount", {"chat_id": tg_id})
        members_count = count_result.get("result", 0) if count_result.get("ok") else 0

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            INSERT INTO {SCHEMA}.tg_groups (tg_id, username, title, members_count)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (tg_id) DO UPDATE
                SET title=EXCLUDED.title, username=EXCLUDED.username,
                    members_count=EXCLUDED.members_count, is_active=TRUE
            RETURNING id, tg_id, username, title, photo_url, members_count, is_active, created_at
        """, (tg_id, username, title, members_count))
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "id": row[0], "tg_id": row[1], "username": row[2], "title": row[3],
            "photo_url": row[4], "members_count": row[5], "is_active": row[6],
            "created_at": row[7].isoformat() if row[7] else None,
        }, ensure_ascii=False)}

    # groups_toggle
    if action == "groups_toggle":
        group_id = body.get("id")
        is_active = body.get("is_active")
        if group_id is None or is_active is None:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id and is_active required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.tg_groups SET is_active=%s WHERE id=%s", (is_active, group_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # groups_delete
    if action == "groups_delete":
        group_id = body.get("id")
        if not group_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.tg_groups WHERE id=%s", (group_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # fetch — собрать новые сообщения из всех активных TG-групп
    if action == "fetch":
        conn = get_conn()
        cur = conn.cursor()

        cur.execute(f"SELECT id, tg_id, title FROM {SCHEMA}.tg_groups WHERE is_active=TRUE")
        groups = cur.fetchall()

        if not groups:
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "saved": 0, "alerts": 0})}

        cur.execute(f"SELECT id, word FROM {SCHEMA}.keywords WHERE active=TRUE")
        keywords = [{"id": r[0], "word": r[1]} for r in cur.fetchall()]

        cur.execute(f"SELECT value FROM {SCHEMA}.settings WHERE key='tg_chat_id'")
        row = cur.fetchone()
        notify_chat_id = row[0] if row and row[0] else None

        cur.execute(f"SELECT value FROM {SCHEMA}.settings WHERE key='tg_enabled'")
        row = cur.fetchone()
        notify_enabled = row and row[0] == "true"

        # Получаем все обновления одним запросом
        result = tg("getUpdates", {"limit": 100, "offset": -100})
        updates = result.get("result", []) if result.get("ok") else []

        group_tg_ids = {g[1]: (g[0], g[2]) for g in groups}

        total_saved = 0
        total_alerts = 0

        for update in updates:
            msg = update.get("message") or update.get("channel_post")
            if not msg:
                continue
            chat = msg.get("chat", {})
            chat_tg_id = chat.get("id")
            if chat_tg_id not in group_tg_ids:
                continue

            group_db_id, group_title = group_tg_ids[chat_tg_id]
            tg_message_id = msg["message_id"]
            text = msg.get("text") or msg.get("caption") or ""
            if not text:
                continue

            date = msg.get("date", 0)
            from_user = msg.get("from") or {}
            sender_chat = msg.get("sender_chat") or {}
            author_id = from_user.get("id") or sender_chat.get("id") or 0
            author_name = (
                f"{from_user.get('first_name', '')} {from_user.get('last_name', '')}".strip()
                or sender_chat.get("title", "") or "Аноним"
            )
            author_username = from_user.get("username") or sender_chat.get("username") or ""
            published_at = datetime.datetime.utcfromtimestamp(date).isoformat()

            cur.execute(f"""
                INSERT INTO {SCHEMA}.tg_messages
                    (group_id, tg_message_id, author_id, author_name, author_username, text, published_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (group_id, tg_message_id) DO NOTHING
            """, (group_db_id, tg_message_id, author_id, author_name, author_username, text, published_at))
            if cur.rowcount > 0:
                total_saved += 1
                matched = check_keywords(text, keywords)
                if matched and notify_enabled and notify_chat_id:
                    kw_list = ", ".join(f"<b>{k['word']}</b>" for k in matched)
                    link = f"https://t.me/{author_username}" if author_username else ""
                    author_link = f'<a href="{link}">{author_name}</a>' if link else author_name
                    alert_text = (
                        f"🔔 <b>Telegram: {group_title}</b>\n\n"
                        f"👤 {author_link}\n"
                        f"🔑 Ключевые слова: {kw_list}\n\n"
                        f"{text[:500]}"
                    )
                    send_message(notify_chat_id, alert_text)
                    total_alerts += 1

        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "ok": True, "saved": total_saved, "alerts": total_alerts,
        })}

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Unknown action"})}