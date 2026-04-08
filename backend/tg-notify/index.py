"""
Telegram-уведомления: привязка аккаунта и отправка сообщений.
POST /resolve — получить chat_id по username (@vrrser)
POST /send — отправить уведомление (body: {chat_id, message})
POST /test — тестовое сообщение по username
GET /status — проверить, настроен ли бот
"""

import os
import json
import urllib.request
import urllib.parse

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TG_API = "https://api.telegram.org"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def tg(method: str, params: dict) -> dict:
    url = f"{TG_API}/bot{BOT_TOKEN}/{method}"
    data = json.dumps(params).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())


def send_message(chat_id, text: str) -> dict:
    return tg("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    })


def handler(event: dict, context) -> dict:
    """Telegram-интеграция: привязка аккаунта и отправка уведомлений."""
    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    # GET /status — проверка токена
    if method == "GET" and path.endswith("/status"):
        if not BOT_TOKEN:
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": False, "error": "Токен бота не настроен"})}
        try:
            me = tg("getMe", {})
            if me.get("ok"):
                bot = me["result"]
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "ok": True,
                    "bot_name": bot.get("first_name"),
                    "bot_username": bot.get("username"),
                })}
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": False, "error": "Неверный токен"})}
        except Exception as e:
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": False, "error": str(e)})}

    body = json.loads(event.get("body") or "{}")

    # POST /test — отправить тестовое сообщение напрямую пользователю по username
    if method == "POST" and path.endswith("/test"):
        username = body.get("username", "").lstrip("@").strip()
        chat_id = body.get("chat_id")

        if not BOT_TOKEN:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"ok": False, "error": "Токен бота не настроен"})}

        if not chat_id and not username:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"ok": False, "error": "Укажите username или chat_id"})}

        target = chat_id if chat_id else f"@{username}"

        try:
            result = send_message(target, "✅ <b>BSF Monitor</b>\n\nTelegram-уведомления успешно подключены! Вы будете получать оповещения о новых срабатываниях по ключевым словам.")
            if result.get("ok"):
                msg = result["result"]
                return {"statusCode": 200, "headers": CORS, "body": json.dumps({
                    "ok": True,
                    "chat_id": msg["chat"]["id"],
                    "username": msg["chat"].get("username", ""),
                })}
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"ok": False, "error": result.get("description", "Ошибка отправки")})}
        except Exception as e:
            err = str(e)
            if "chat not found" in err.lower():
                return {"statusCode": 400, "headers": CORS, "body": json.dumps({"ok": False, "error": f"Пользователь @{username} не найден. Убедитесь, что вы написали боту хотя бы одно сообщение."})}
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"ok": False, "error": err})}

    # POST /send — отправить уведомление
    if method == "POST" and path.endswith("/send"):
        chat_id = body.get("chat_id")
        message = body.get("message", "")
        if not chat_id or not message:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "chat_id and message required"})}
        try:
            result = send_message(chat_id, message)
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": result.get("ok", False)})}
        except Exception as e:
            return {"statusCode": 500, "headers": CORS, "body": json.dumps({"error": str(e)})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "Method not allowed"})}
