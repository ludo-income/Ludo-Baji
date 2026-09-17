# Ludo Baji V9.1

Play • Win • Earn — Ludo match platform with wallet, deposit, withdrawal and admin panel.

## Deploy on Render

- **Root Directory:** empty (repo root)
- **Build Command:** `npm install`
- **Start Command:** `npm start`

## Required Environment Variables

```
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=use_a_strong_unique_password
ADMIN_SECRET=replace_with_a_random_secret_at_least_32_characters
USER_SECRET=replace_with_a_different_random_secret_at_least_32_characters
ADMIN_ROLE=super_admin
```

Optional but recommended for production:

```
DATABASE_URL=postgresql://...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=yourgmail@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM=yourgmail@gmail.com
OTP_DEV_MODE=false
CORS_ORIGIN=
TRUST_PROXY=true
BKASH_PERSONAL_NUMBER=
BKASH_MERCHANT_NUMBER=
NAGAD_PERSONAL_NUMBER=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

## Routes

| Path | Description |
|------|-------------|
| `/` | User app (index.html) |
| `/admin` | Admin panel |
| `/health` | Health check JSON |
| `/api/site` | Public site config |
| `/ws/matches` | Real-time match WebSocket |

## Notes

- Use **PostgreSQL** (`DATABASE_URL`) in production. JSON files are local/testing fallback only.
- Never enable `OTP_DEV_MODE` in production.
- `ADMIN_SECRET` and `USER_SECRET` must be different and at least 32 characters.
- See `.env.example` for the full list of variables.
