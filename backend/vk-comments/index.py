"""
Сбор комментариев из активных VK-групп и обновление данных групп.
POST /fetch — запустить сбор комментариев по всем активным группам
GET / — получить последние комментарии (query: limit, group_id)
"""

import os
import json
import psycopg2
import urllib.request
import urllib.parse

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p94871206_vk_comment_tracker")
VK_TOKEN = os.environ.get("VK_ACCESS_TOKEN", "")
VK_API = "https://api.vk.com/method"
VK_VERSION = "5.199"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def vk_request(method: str, params: dict) -> dict:
    params["access_token"] = VK_TOKEN
    params["v"] = VK_VERSION
    url = f"{VK_API}/{method}?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=15) as r:
        return json.loads(r.read().decode())


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def fetch_comments_for_group(conn, group_id: int, vk_id: int, screen_name: str) -> int:
    """Собирает последние комментарии из постов группы, возвращает кол-во новых."""
    saved = 0

    # Обновляем данные группы (members_count, name, photo)
    gdata = vk_request("groups.getById", {"group_id": str(vk_id), "fields": "members_count,photo_200"})
    groups_list = gdata.get("response", {}).get("groups", [])
    if groups_list:
        g = groups_list[0]
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {SCHEMA}.groups SET name=%s, photo_url=%s, members_count=%s WHERE id=%s",
            (g.get("name"), g.get("photo_200"), g.get("members_count", 0), group_id)
        )
        conn.commit()

    # Получаем последние 10 постов группы
    wall = vk_request("wall.get", {"owner_id": f"-{vk_id}", "count": 10, "fields": "id"})
    posts = wall.get("response", {}).get("items", [])

    for post in posts:
        post_id = post["id"]

        # Получаем комментарии к посту
        cdata = vk_request("wall.getComments", {
            "owner_id": f"-{vk_id}",
            "post_id": post_id,
            "count": 100,
            "fields": "photo_50",
            "extended": 1,
        })
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

            cur = conn.cursor()
            cur.execute(
                f"""
                INSERT INTO {SCHEMA}.comments
                    (group_id, vk_post_id, vk_comment_id, author_id, author_name, author_photo, text, published_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, to_timestamp(%s))
                ON CONFLICT (vk_comment_id) DO NOTHING
                """,
                (group_id, post_id, c["id"], author_id, author_name, author_photo, text, published_at)
            )
            if cur.rowcount:
                saved += 1
        conn.commit()

    return saved


def handler(event: dict, context) -> dict:
    """Сбор комментариев из VK-групп и получение ленты комментариев."""
    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    if not VK_TOKEN:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "VK_ACCESS_TOKEN не настроен"})}

    # POST /fetch — запустить сбор
    if method == "POST" and path.endswith("/fetch"):
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(f"SELECT id, vk_id, screen_name FROM {SCHEMA}.groups WHERE is_active=TRUE")
        active_groups = cur.fetchall()

        if not active_groups:
            conn.close()
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "fetched": 0, "groups": 0})}

        total = 0
        for (group_id, vk_id, screen_name) in active_groups:
            try:
                total += fetch_comments_for_group(conn, group_id, vk_id, screen_name)
            except Exception as e:
                pass

        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "ok": True,
            "fetched": total,
            "groups": len(active_groups),
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
                "id": r[0],
                "group_id": r[1],
                "group_name": r[2],
                "vk_post_id": r[3],
                "vk_comment_id": r[4],
                "author_id": r[5],
                "author_name": r[6],
                "author_photo": r[7],
                "text": r[8],
                "published_at": r[9].isoformat() if r[9] else None,
                "fetched_at": r[10].isoformat() if r[10] else None,
                "sentiment": r[11],
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(comments, ensure_ascii=False)}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
