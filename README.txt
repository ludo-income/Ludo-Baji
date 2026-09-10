LUDO BAJI ADMIN PANEL v10

Login: admin / admin123

Render:
Build Command: npm install
Start Command: npm start

IMPORTANT FOR REAL PERSISTENT SAVES ON RENDER:
Set DATABASE_URL to a PostgreSQL database connection string. This version automatically creates the app_state table and stores Admin settings/content there. Without DATABASE_URL it uses data.json, which is only suitable for local testing or a server with persistent disk.

Set ADMIN_SECRET to a long random value in Render Environment Variables.

The Admin sidebar is fixed to the requested compact design. Each sidebar option has its own editable content/logo/icon/title/button/visibility fields. Homepage Settings controls the categories shown on the main page. Changes are saved through the backend and, with DATABASE_URL configured, persist across restarts/redeploys.

No fake user/deposit/withdrawal/transaction totals are displayed.
