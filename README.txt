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

Step 1 - Withdrawal System:
- User can request withdrawal through bKash or Nagad.
- User selects Gaming Balance or Winning Balance.
- Amount is validated (default minimum ৳100, maximum ৳1,000,000; configurable with MIN_WITHDRAWAL and MAX_WITHDRAWAL).
- Balance is reserved/deducted when the request is submitted.
- Withdrawal remains Pending until Admin review.
- Admin can Approve or Reject with an optional note/reason.
- Rejected withdrawals automatically return the amount to the selected balance.
- Withdrawal history is available to the user and admin.
- Withdrawal transactions and notifications are recorded.
