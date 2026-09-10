Ludo Baji Admin Panel V9
Render: Build Command = npm install; Start Command = npm start
Admin: /admin

SECURE ADMIN CONFIGURATION
Set these environment variables before starting the server:
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<your secure admin password>
ADMIN_SECRET=<long random secret>

The admin password and token secret are NOT stored in the source code.
Admin sidebar stays separate from homepage options. Main page only reads mainOptions from /api/site.

Step 5 - Deposit System:
- bKash: 01301470686 (configurable with BKASH_NUMBER)
- Nagad: 01806097369 (configurable with NAGAD_NUMBER)
- User submits amount, Transaction ID and payment screenshot.
- Admin can approve/reject deposits from Deposit Management.
- Approved deposits add to Gaming Balance; duplicate Transaction IDs are blocked.
- OTP/login, existing homepage and admin settings are preserved.
