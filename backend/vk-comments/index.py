"""
Сбор комментариев из активных VK-групп и обновление данных групп. v3
POST /fetch — запустить сбор комментариев по всем активным группам
GET / — получить последние комментарии (query: limit, group_id)
"""

import os
import json
import psycopg2
import urllib.request
import urllib.parse

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p94871206_vk_comment_tracker")
TG_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")


def get_vk_token(conn) -> str:
    """Читает токен из БД, если нет — берёт из переменной окружения."""
    cur = conn.cursor()
    cur.execute(f"SELECT value FROM {SCHEMA}.settings WHERE key='vk_token'")
    row = cur.fetchone()
    if row and row[0]:
        return row[0]
    return os.environ.get("VK_ACCESS_TOKEN", "")
VK_API = "https://api.vk.com/method"
VK_VERSION = "5.199"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def vk_request(method: str, params: dict, token: str) -> dict:
    params["access_token"] = token
    params["v"] = VK_VERSION
    url = f"{VK_API}/{method}?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=7) as r:
        return json.loads(r.read().decode())


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def tg_send(chat_id, text: str):
    if not TG_TOKEN or not chat_id:
        return
    url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
    data = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except Exception:
        pass


def tg_send_with_screenshot(chat_id, text: str, comment_url: str):
    if not TG_TOKEN or not chat_id:
        return
    screenshot_url = f"https://mini.s-shot.ru/1200x800/PNG/1200/Z100/?{urllib.parse.quote(comment_url, safe='')}"
    url = f"https://api.telegram.org/bot{TG_TOKEN}/sendPhoto"
    caption = text[:1024]
    data = json.dumps({
        "chat_id": chat_id,
        "photo": screenshot_url,
        "caption": caption,
        "parse_mode": "HTML",
    }).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            result = json.loads(r.read().decode())
            if result.get("ok"):
                return result
    except Exception:
        pass
    tg_send(chat_id, text)


def check_keywords(text: str, keywords: list) -> list:
    """Возвращает список ключевых слов, найденных в тексте."""
    text_lower = text.lower()
    return [kw for kw in keywords if kw["word"].lower() in text_lower]


def send_alert(tg_chat_ids: list, kind: str, word: str, group_name: str,
               group_vk_id: int, vk_post_id: int, author_id: int,
               author_name: str, text: str, vk_comment_id: int = None):
    """Формирует и отправляет уведомление в Telegram немедленно."""
    if not tg_chat_ids:
        return
    if vk_comment_id:
        url = f"https://vk.com/wall-{group_vk_id}_{vk_post_id}?reply={vk_comment_id}"
        type_label = "💬 Комментарий"
    else:
        url = f"https://vk.com/wall-{group_vk_id}_{vk_post_id}"
        type_label = "📰 Пост"
    short_text = text[:500] + ("..." if len(text) > 500 else "")
    lines = [
        f"🔔 <b>Ключевое слово: «{word}»</b>  |  {type_label}",
        f"📢 <b>Группа:</b> {group_name}",
        f"",
        f"👤 <b>Автор:</b> <a href=\"https://vk.com/id{author_id}\">{author_name}</a>",
        f"",
        f"📄 <b>Текст:</b>",
        f"<i>{short_text}</i>",
        f"",
        f"🔗 {url}",
    ]
    msg = "\n".join(lines)
    for cid in tg_chat_ids:
        tg_send(cid, msg)


def fetch_and_notify(conn, group_id: int, vk_id: int, group_name: str, token: str,
                     keywords: list, tg_enabled: bool, tg_chat_ids: list) -> dict:
    """Собирает новые посты и комментарии, сразу отправляет уведомления при совпадении ключевых слов."""
    new_posts = 0
    new_comments = 0
    alerts = 0
    cur = conn.cursor()

    # --- Получаем последние 5 постов ---
    wall = vk_request("wall.get", {"owner_id": f"-{vk_id}", "count": 5}, token)
    posts = wall.get("response", {}).get("items", [])

    for post in posts:
        post_id = post["id"]
        post_text = post.get("text", "").strip()
        post_author = post.get("from_id") or post.get("signer_id") or 0
        post_date = post.get("date")

        # --- Сохраняем пост (только новые) ---
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.posts (group_id, vk_post_id, text, author_id, published_at)
            VALUES (%s, %s, %s, %s, to_timestamp(%s))
            ON CONFLICT (group_id, vk_post_id) DO NOTHING
            RETURNING id
            """,
            (group_id, post_id, post_text, post_author, post_date)
        )
        is_new_post = bool(cur.rowcount)
        conn.commit()

        if is_new_post:
            new_posts += 1
            # --- Сразу проверяем ключевые слова в тексте поста ---
            if post_text and keywords and tg_enabled:
                matched = check_keywords(post_text, keywords)
                for kw in matched:
                    send_alert(
                        tg_chat_ids, "post", kw["word"], group_name,
                        vk_id, post_id, abs(post_author), f"vk.com/club{vk_id}",
                        post_text
                    )
                    alerts += 1
                    cur.execute(
                        f"UPDATE {SCHEMA}.keywords SET hits = hits + 1 WHERE id = %s",
                        (kw["id"],)
                    )
                conn.commit()

        # --- Получаем комментарии к посту ---
        cdata = vk_request("wall.getComments", {
            "owner_id": f"-{vk_id}",
            "post_id": post_id,
            "count": 100,
            "fields": "photo_50",
            "extended": 1,
            "sort": "desc",
        }, token)
        comments = cdata.get("response", {}).get("items", [])
        profiles = {p["id"]: p for p in cdata.get("response", {}).get("profiles", [])}

        for c in comments:
            text = c.get("text", "").strip()
            if not text:
                continue

            author_id = c.get("from_id", 0)
            profile = profiles.get(author_id, {})
            author_name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip() or f"id{author_id}"
            author_photo = profile.get("photo_50")
            published_at = c.get("date")

            cur.execute(
                f"""
                INSERT INTO {SCHEMA}.comments
                    (group_id, vk_post_id, vk_comment_id, author_id, author_name, author_photo, text, published_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, to_timestamp(%s))
                ON CONFLICT (vk_comment_id) DO NOTHING
                RETURNING id
                """,
                (group_id, post_id, c["id"], author_id, author_name, author_photo, text, published_at)
            )
            is_new = bool(cur.rowcount)
            conn.commit()

            if is_new:
                new_comments += 1
                # --- Сразу проверяем ключевые слова в комментарии ---
                if keywords and tg_enabled:
                    matched = check_keywords(text, keywords)
                    for kw in matched:
                        send_alert(
                            tg_chat_ids, "comment", kw["word"], group_name,
                            vk_id, post_id, author_id, author_name,
                            text, c["id"]
                        )
                        alerts += 1
                        cur.execute(
                            f"UPDATE {SCHEMA}.keywords SET hits = hits + 1 WHERE id = %s",
                            (kw["id"],)
                        )
                    conn.commit()

    return {"new_posts": new_posts, "new_comments": new_comments, "alerts": alerts}


def handler(event: dict, context) -> dict:
    """Сбор комментариев из VK-групп, проверка ключевых слов и отправка Telegram-уведомлений."""
    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    print(f"DEBUG method={method} path={repr(path)}")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    # GET /stats — сводная статистика для дашборда (не требует VK токена)
    params_early = event.get("queryStringParameters") or {}
    if method == "GET" and params_early.get("action") == "stats":
        conn = get_conn()
        cur = conn.cursor()

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.comments WHERE fetched_at >= CURRENT_DATE")
        today_count = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.comments WHERE sentiment = 'negative'")
        negative_count = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.keywords WHERE active = TRUE")
        active_keywords = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.groups WHERE is_active = TRUE")
        active_groups = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.comments")
        total_count = cur.fetchone()[0]

        cur.execute(f"""
            SELECT COUNT(*) FROM {SCHEMA}.comments c
            WHERE fetched_at >= CURRENT_DATE
            AND EXISTS (
                SELECT 1 FROM {SCHEMA}.keywords k
                WHERE k.active = TRUE AND lower(c.text) LIKE '%' || lower(k.word) || '%'
            )
        """)
        keyword_hits_today = cur.fetchone()[0]

        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "today_count": today_count,
            "negative_count": negative_count,
            "active_keywords": active_keywords,
            "active_groups": active_groups,
            "total_count": total_count,
            "keyword_hits_today": keyword_hits_today,
        })}

    # POST ?action=test_notify — отправить тестовое уведомление по уже собранным совпадениям
    if method in ("POST", "GET") and params_early.get("action") == "test_notify":
        conn = get_conn()
        cur = conn.cursor()

        cur.execute(f"SELECT key, value FROM {SCHEMA}.settings WHERE key LIKE 'tg_%'")
        settings = {r[0]: r[1] for r in cur.fetchall()}
        tg_enabled = settings.get("tg_enabled") == "true"
        tg_chat_ids = [v for k, v in settings.items() if k.startswith("tg_chat_id") and v]

        if not tg_enabled or not tg_chat_ids:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Telegram не настроен"})}

        cur.execute(f"SELECT id, word FROM {SCHEMA}.keywords WHERE active = TRUE")
        keywords = [{"id": r[0], "word": r[1]} for r in cur.fetchall()]

        if not keywords:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет активных ключевых слов"})}

        cur.execute(f"""
            SELECT c.id, c.author_id, c.author_name, c.text, c.vk_post_id, c.vk_comment_id,
                   g.name, g.vk_id, c.group_id
            FROM {SCHEMA}.comments c
            JOIN {SCHEMA}.groups g ON g.id = c.group_id
            ORDER BY c.fetched_at DESC LIMIT 500
        """)
        rows = cur.fetchall()
        conn.close()

        sent = 0
        for r in rows:
            c = {"id": r[0], "author_id": r[1], "author_name": r[2], "text": r[3],
                 "vk_post_id": r[4], "vk_comment_id": r[5], "group_name": r[6],
                 "group_vk_id": r[7], "group_id": r[8]}
            matched = check_keywords(c["text"], keywords)
            if not matched:
                continue
            word = matched[0]["word"]
            author_id = c.get("author_id", 0)
            author_name = c.get("author_name") or f"id{author_id}"
            comment_url = f"https://vk.com/wall-{c['group_vk_id']}_{c['vk_post_id']}?reply={c['vk_comment_id']}"
            short_text = c["text"][:500] + ("..." if len(c["text"]) > 500 else "")
            lines = [
                f"🔔 <b>Ключевое слово: «{word}»</b>",
                f"",
                f"👤 <b>ID:</b> {author_id}",
                f"🔗 <b>Профиль:</b> https://vk.com/id{author_id}",
                f"📛 <b>ФИО:</b> {author_name}",
                f"",
                f"💬 <b>Ссылка на комментарий:</b>",
                comment_url,
                f"",
                f"📄 <b>Текст:</b>",
                f"<i>{short_text}</i>",
            ]
            for cid in tg_chat_ids:
                tg_send_with_screenshot(cid, "\n".join(lines), comment_url)
            sent += 1
            if sent >= 3:
                break

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "sent": sent})}

    # GET ?action=keyword_hits — комментарии-совпадения за сегодня
    if method == "GET" and params_early.get("action") == "keyword_hits":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            SELECT c.id, c.author_id, c.author_name, c.author_photo, c.text,
                   c.published_at, g.name as group_name, c.vk_post_id, c.vk_comment_id,
                   g.vk_id as group_vk_id
            FROM {SCHEMA}.comments c
            JOIN {SCHEMA}.groups g ON g.id = c.group_id
            WHERE c.fetched_at >= CURRENT_DATE
              AND EXISTS (
                SELECT 1 FROM {SCHEMA}.keywords k
                WHERE k.active = TRUE AND lower(c.text) LIKE '%' || lower(k.word) || '%'
              )
            ORDER BY c.fetched_at DESC
            LIMIT 100
        """)
        rows = cur.fetchall()
        conn.close()
        result = [
            {
                "id": r[0],
                "author_id": r[1],
                "author_name": r[2],
                "author_photo": r[3],
                "text": r[4],
                "published_at": r[5].isoformat() if r[5] else None,
                "group_name": r[6],
                "vk_post_id": r[7],
                "vk_comment_id": r[8],
                "group_vk_id": r[9],
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(result, ensure_ascii=False)}

    # GET ?action=negative — негативные комментарии
    if method == "GET" and params_early.get("action") == "negative":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"""
            SELECT c.id, c.author_id, c.author_name, c.author_photo, c.text,
                   c.published_at, g.name as group_name, c.vk_post_id, c.vk_comment_id,
                   g.vk_id as group_vk_id
            FROM {SCHEMA}.comments c
            JOIN {SCHEMA}.groups g ON g.id = c.group_id
            WHERE c.sentiment = 'negative'
            ORDER BY c.fetched_at DESC
            LIMIT 100
        """)
        rows = cur.fetchall()
        conn.close()
        result = [
            {
                "id": r[0], "author_id": r[1], "author_name": r[2], "author_photo": r[3],
                "text": r[4], "published_at": r[5].isoformat() if r[5] else None,
                "group_name": r[6], "vk_post_id": r[7], "vk_comment_id": r[8], "group_vk_id": r[9],
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(result, ensure_ascii=False)}

    # GET ?action=analytics — рейтинг групп и активность по дням
    if method == "GET" and params_early.get("action") == "analytics":
        conn = get_conn()
        cur = conn.cursor()

        # Рейтинг групп
        cur.execute(f"""
            SELECT g.id, g.name, g.members_count, COUNT(c.id) as comments_count,
                   COUNT(CASE WHEN c.sentiment='negative' THEN 1 END) as negative_count
            FROM {SCHEMA}.groups g
            LEFT JOIN {SCHEMA}.comments c ON c.group_id = g.id
            WHERE g.is_active = TRUE
            GROUP BY g.id, g.name, g.members_count
            ORDER BY comments_count DESC
        """)
        groups_rating = [
            {"id": r[0], "name": r[1], "members_count": r[2], "comments_count": r[3], "negative_count": r[4]}
            for r in cur.fetchall()
        ]

        # Активность по дням (последние 7 дней)
        cur.execute(f"""
            SELECT DATE(fetched_at) as day,
                   COUNT(*) as total,
                   COUNT(CASE WHEN sentiment='positive' THEN 1 END) as positive,
                   COUNT(CASE WHEN sentiment='negative' THEN 1 END) as negative
            FROM {SCHEMA}.comments
            WHERE fetched_at >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY day ORDER BY day
        """)
        days_data = [
            {"day": str(r[0]), "total": r[1], "positive": r[2], "negative": r[3]}
            for r in cur.fetchall()
        ]

        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "groups_rating": groups_rating,
            "days_data": days_data,
        }, ensure_ascii=False)}

    # POST ?action=fetch — запустить сбор
    post_params = event.get("queryStringParameters") or {}
    if method == "POST" and (post_params.get("action") == "fetch" or path.endswith("/fetch")):
        conn = get_conn()
        vk_token = get_vk_token(conn)

        if not vk_token:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "VK токен не настроен. Добавьте токен в разделе Настройки"})}

        cur = conn.cursor()

        # Если передан конкретный group_id — обрабатываем только его
        filter_group_id = post_params.get("group_id")
        if filter_group_id:
            cur.execute(f"SELECT id, vk_id, screen_name, name FROM {SCHEMA}.groups WHERE is_active=TRUE AND id=%s", (int(filter_group_id),))
        else:
            cur.execute(f"SELECT id, vk_id, screen_name, name FROM {SCHEMA}.groups WHERE is_active=TRUE")
        active_groups = cur.fetchall()

        if not active_groups:
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "fetched": 0, "groups": 0, "alerts": 0})}

        # Загружаем активные ключевые слова
        cur.execute(f"SELECT id, word FROM {SCHEMA}.keywords WHERE active=TRUE")
        keywords = [{"id": r[0], "word": r[1]} for r in cur.fetchall()]

        # Загружаем настройки Telegram
        cur.execute(f"SELECT key, value FROM {SCHEMA}.settings WHERE key LIKE 'tg_%'")
        settings = {r[0]: r[1] for r in cur.fetchall()}
        tg_enabled = settings.get("tg_enabled") == "true"
        tg_chat_ids = [v for k, v in settings.items() if k.startswith("tg_chat_id") and v]

        # Собираем посты и комментарии, уведомления отправляются сразу при нахождении
        total_posts = 0
        total_comments = 0
        total_alerts = 0
        for (group_id, vk_id, screen_name, group_name) in active_groups:
            try:
                result = fetch_and_notify(
                    conn, group_id, vk_id, group_name, vk_token,
                    keywords, tg_enabled, tg_chat_ids
                )
                total_posts += result["new_posts"]
                total_comments += result["new_comments"]
                total_alerts += result["alerts"]
            except Exception as e:
                print(f"ERROR group {group_id}: {e}")

        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "ok": True,
            "new_posts": total_posts,
            "new_comments": total_comments,
            "groups": len(active_groups),
            "alerts": total_alerts,
        })}

    # GET / — лента комментариев
    if method == "GET":
        params = event.get("queryStringParameters") or {}
        limit = min(int(params.get("limit", 50)), 200)
        group_id = params.get("group_id")

        conn = get_conn()
        cur = conn.cursor()

        if group_id:
            cur.execute(
                f"""
                SELECT c.id, c.group_id, g.name, c.vk_post_id, c.vk_comment_id,
                       c.author_id, c.author_name, c.author_photo, c.text,
                       c.published_at, c.fetched_at, c.sentiment
                FROM {SCHEMA}.comments c
                JOIN {SCHEMA}.groups g ON g.id = c.group_id
                WHERE c.group_id = %s
                ORDER BY c.fetched_at DESC LIMIT %s
                """,
                (int(group_id), limit)
            )
        else:
            cur.execute(
                f"""
                SELECT c.id, c.group_id, g.name, c.vk_post_id, c.vk_comment_id,
                       c.author_id, c.author_name, c.author_photo, c.text,
                       c.published_at, c.fetched_at, c.sentiment
                FROM {SCHEMA}.comments c
                JOIN {SCHEMA}.groups g ON g.id = c.group_id
                ORDER BY c.fetched_at DESC LIMIT %s
                """,
                (limit,)
            )

        rows = cur.fetchall()
        conn.close()

        comments = [
            {
                "id": r[0], "group_id": r[1], "group_name": r[2],
                "vk_post_id": r[3], "vk_comment_id": r[4],
                "author_id": r[5], "author_name": r[6], "author_photo": r[7],
                "text": r[8],
                "published_at": r[9].isoformat() if r[9] else None,
                "fetched_at": r[10].isoformat() if r[10] else None,
                "sentiment": r[11],
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(comments, ensure_ascii=False)}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}