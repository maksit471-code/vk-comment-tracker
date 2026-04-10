"""  # v3
Управление группами ВКонтакте для мониторинга комментариев.
GET / — список всех групп
GET /?action=refresh — обновить vk_id и members_count всех групп через VK API
POST / — добавить группу (body: {screen_name или vk_id})
DELETE / — удалить группу (body: {id})
PATCH / — переключить активность (body: {id, is_active})
GET /search — поиск групп через VK API (query: q)
"""

import os
import json
import psycopg2
import urllib.request
import urllib.parse


SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p94871206_vk_comment_tracker")
VK_API = "https://api.vk.com/method"
VK_VERSION = "5.199"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_vk_token(conn) -> str:
    cur = conn.cursor()
    cur.execute(f"SELECT value FROM {SCHEMA}.settings WHERE key='vk_token'")
    row = cur.fetchone()
    if row and row[0]:
        return row[0]
    return os.environ.get("VK_ACCESS_TOKEN", "")


def vk_request(method: str, params: dict, token: str) -> dict:
    params["access_token"] = token
    params["v"] = VK_VERSION
    url = f"{VK_API}/{method}?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=10) as r:
        return json.loads(r.read().decode())


def handler(event: dict, context) -> dict:
    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    params = event.get("queryStringParameters") or {}

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    conn = get_conn()
    vk_token = get_vk_token(conn)

    # GET /?action=refresh — обновить все группы через VK API
    if method == "GET" and params.get("action") == "refresh":
        cur = conn.cursor()
        cur.execute(f"SELECT id, screen_name FROM {SCHEMA}.groups")
        groups = cur.fetchall()

        # Запрашиваем все группы одним батч-запросом
        screen_names = [row[1] for row in groups]
        group_map = {row[1]: row[0] for row in groups}

        updated = 0
        errors = []
        token_preview = vk_token[:20] + "..." if vk_token else "EMPTY"
        for (db_id, screen_name) in groups:
            try:
                data = vk_request("groups.getById", {
                    "group_ids": screen_name,
                    "fields": "members_count,photo_200"
                }, vk_token)
                if "error" in data:
                    errors.append(f"{screen_name}: {data['error'].get('error_msg', 'VK error')}")
                    continue
                gl = data.get("response", {}).get("groups", [])
                if not gl:
                    errors.append(f"{screen_name}: not found")
                    continue
                g = gl[0]
                cur.execute(
                    f"UPDATE {SCHEMA}.groups SET vk_id=%s, name=%s, photo_url=%s, members_count=%s WHERE id=%s",
                    (g["id"], g["name"], g.get("photo_200"), g.get("members_count", 0), db_id)
                )
                conn.commit()
                updated += 1
            except Exception as e:
                errors.append(f"{screen_name}: {e}")

        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "updated": updated, "errors": errors, "token_used": token_preview})}

    # GET /search — поиск через VK API
    if method == "GET" and path.endswith("/search"):
        q = params.get("q", "")
        if not q:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "q required"})}

        data = vk_request("groups.search", {"q": q, "count": 10, "type": "page,group,event", "fields": "members_count,photo_200"}, vk_token)
        items = data.get("response", {}).get("items", [])
        conn.close()
        result = []
        for g in items:
            result.append({
                "vk_id": g["id"],
                "screen_name": g.get("screen_name", f"club{g['id']}"),
                "name": g["name"],
                "photo_url": g.get("photo_200"),
                "members_count": g.get("members_count", 0),
            })
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(result, ensure_ascii=False)}

    # GET / — список групп из БД
    if method == "GET":
        cur = conn.cursor()
        cur.execute(f"""
            SELECT id, vk_id, screen_name, name, photo_url, members_count, is_active, created_at
            FROM {SCHEMA}.groups ORDER BY created_at DESC
        """)
        rows = cur.fetchall()
        conn.close()
        groups = [
            {
                "id": r[0], "vk_id": r[1], "screen_name": r[2], "name": r[3],
                "photo_url": r[4], "members_count": r[5], "is_active": r[6],
                "created_at": r[7].isoformat() if r[7] else None,
            }
            for r in rows
        ]
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(groups, ensure_ascii=False)}

    body = json.loads(event.get("body") or "{}")

    # POST / — добавить группу
    if method == "POST":
        identifier = str(body.get("screen_name") or body.get("vk_id") or "").strip()
        if not identifier:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "screen_name or vk_id required"})}

        data = vk_request("groups.getById", {"group_id": identifier, "fields": "members_count,photo_200"}, vk_token)
        if "error" in data:
            conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Группа не найдена"})}

        groups_list = data.get("response", {}).get("groups", [])
        if not groups_list:
            conn.close()
            return {"statusCode": 404, "headers": CORS, "body": json.dumps({"error": "Группа не найдена"})}

        g = groups_list[0]
        vk_id = g["id"]
        screen_name = g.get("screen_name", f"club{vk_id}")
        name = g["name"]
        photo_url = g.get("photo_200")
        members_count = g.get("members_count", 0)

        cur = conn.cursor()
        cur.execute(f"""
            INSERT INTO {SCHEMA}.groups (vk_id, screen_name, name, photo_url, members_count)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (vk_id) DO UPDATE SET name=EXCLUDED.name, photo_url=EXCLUDED.photo_url, members_count=EXCLUDED.members_count, is_active=TRUE
            RETURNING id, vk_id, screen_name, name, photo_url, members_count, is_active, created_at
        """, (vk_id, screen_name, name, photo_url, members_count))
        row = cur.fetchone()
        conn.commit()
        conn.close()
        result = {
            "id": row[0], "vk_id": row[1], "screen_name": row[2], "name": row[3],
            "photo_url": row[4], "members_count": row[5], "is_active": row[6],
            "created_at": row[7].isoformat() if row[7] else None,
        }
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(result, ensure_ascii=False)}

    # PATCH / — переключить is_active
    if method == "PATCH":
        group_id = body.get("id")
        is_active = body.get("is_active")
        if group_id is None or is_active is None:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id and is_active required"})}
        cur = conn.cursor()
        cur.execute(f"UPDATE {SCHEMA}.groups SET is_active=%s WHERE id=%s", (is_active, group_id))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # DELETE / — удалить группу
    if method == "DELETE":
        group_id = body.get("id")
        if not group_id:
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "id required"})}
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {SCHEMA}.groups WHERE id=%s", (group_id,))
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    conn.close()
    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}