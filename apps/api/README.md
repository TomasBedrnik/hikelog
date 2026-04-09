# HikeLog Backend

## Lint, format
Linting is forced in GitHub.
To run the linter, use the following command:

```bash
ruff check .
ruff check . --fix

ruff format --check .
ruff format .
```

## Local Development
```bash
cp apps/api/.env.example apps/api/.env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

For Firebase Storage, flatten the service account JSON into `apps/api/.env`.
Keep `FIREBASE_PRIVATE_KEY` quoted and preserve newlines as `\n`.
Set `ADMIN_SESSION_SECRET` in production so admin logins use a stable long-lived app token instead of falling back to the Firebase private key.

## Ngrok
Setup ngrok, create permanent url,
add key to local ngrok,
add permanent url to Google OAuth client settings: https://console.cloud.google.com/auth/clients/

run:
```bash
ngrok http 3000 --url https://your-url.ngrok-free.dev
```
