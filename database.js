const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data.json');
const USERS_DATA = path.join(__dirname, 'users.json');
const DEPOSITS_DATA = path.join(__dirname, 'deposits.json');
let pool = null;
let ready = null;

function fallbackRead() {
  return JSON.parse(fs.readFileSync(DATA, 'utf8'));
}
function fallbackWrite(data) {
  const tmp = DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DATA);
}
function fallbackUsersRead() {
  if (!fs.existsSync(USERS_DATA)) return [];
  try { return JSON.parse(fs.readFileSync(USERS_DATA, 'utf8')); } catch { return []; }
}
function fallbackUsersWrite(users) {
  const tmp = USERS_DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2), 'utf8');
  fs.renameSync(tmp, USERS_DATA);
}
function fallbackDepositsRead() {
  if (!fs.existsSync(DEPOSITS_DATA)) return [];
  try { return JSON.parse(fs.readFileSync(DEPOSITS_DATA, 'utf8')); } catch { return []; }
}
function fallbackDepositsWrite(items) {
  const tmp = DEPOSITS_DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(tmp, DEPOSITS_DATA);
}
function hasDatabase() { return Boolean(process.env.DATABASE_URL); }

async function init() {
  if (!hasDatabase()) return;
  if (ready) return ready;
  ready = (async () => {
    let pg;
    try { pg = require('pg'); } catch (err) { throw new Error('DATABASE_URL is set but the pg package is unavailable. Run npm install before deployment.'); }
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 5
    });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS admins (id BIGSERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT, role TEXT NOT NULL DEFAULT 'super_admin', active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY, user_code TEXT UNIQUE, phone TEXT UNIQUE NOT NULL, name TEXT, status TEXT NOT NULL DEFAULT 'active',
        otp_hash TEXT, otp_expires_at TIMESTAMPTZ, otp_sent_at TIMESTAMPTZ, otp_attempts INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_sent_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_attempts INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE IF NOT EXISTS wallets (user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, gaming_balance NUMERIC(14,2) NOT NULL DEFAULT 0, winning_balance NUMERIC(14,2) NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS transactions (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, amount NUMERIC(14,2) NOT NULL, balance_type TEXT, reference TEXT, status TEXT NOT NULL DEFAULT 'pending', note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS deposits (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, method TEXT NOT NULL, amount NUMERIC(14,2) NOT NULL, transaction_id TEXT, screenshot TEXT, status TEXT NOT NULL DEFAULT 'pending', reviewed_by BIGINT REFERENCES admins(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_deposits_transaction_id ON deposits(transaction_id) WHERE transaction_id IS NOT NULL AND transaction_id <> '';
      CREATE TABLE IF NOT EXISTS withdrawals (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, method TEXT NOT NULL, account_number TEXT NOT NULL, amount NUMERIC(14,2) NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reviewed_by BIGINT REFERENCES admins(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ);
      CREATE TABLE IF NOT EXISTS matches (id BIGSERIAL PRIMARY KEY, match_code TEXT UNIQUE, title TEXT NOT NULL, entry_fee NUMERIC(14,2) NOT NULL DEFAULT 0, winning_amount NUMERIC(14,2) NOT NULL DEFAULT 0, room_id TEXT, status TEXT NOT NULL DEFAULT 'open', scheduled_at TIMESTAMPTZ, winner_user_id BIGINT REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS match_players (match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, slot SMALLINT NOT NULL, status TEXT NOT NULL DEFAULT 'joined', joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (match_id, user_id), UNIQUE (match_id, slot));
      CREATE TABLE IF NOT EXISTS notifications (id BIGSERIAL PRIMARY KEY, user_id BIGINT REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, message TEXT NOT NULL, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS support_messages (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, sender TEXT NOT NULL, message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
      CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_support_user_created ON support_messages(user_id, created_at DESC);
    `);
    const existing = await pool.query('SELECT COUNT(*)::int AS count FROM app_config');
    if (existing.rows[0].count === 0) {
      const seed = fallbackRead();
      for (const [key, value] of Object.entries(seed)) await pool.query('INSERT INTO app_config(key, value) VALUES($1, $2::jsonb) ON CONFLICT (key) DO NOTHING', [key, JSON.stringify(value)]);
    }
    await pool.query('INSERT INTO admins(username) VALUES($1) ON CONFLICT (username) DO NOTHING', [process.env.ADMIN_USERNAME || 'admin']);
  })();
  return ready;
}

async function getData() {
  if (!hasDatabase()) return fallbackRead();
  await init();
  const result = await pool.query('SELECT key, value FROM app_config');
  const data = {};
  for (const row of result.rows) data[row.key] = row.value;
  return data;
}
async function saveData(data) {
  if (!hasDatabase()) return fallbackWrite(data);
  await init();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(data)) await client.query(`INSERT INTO app_config(key, value, updated_at) VALUES($1, $2::jsonb, NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`, [key, JSON.stringify(value)]);
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}

async function findUser(phone) {
  if (!hasDatabase()) return fallbackUsersRead().find(u => u.phone === phone) || null;
  await init();
  const r = await pool.query('SELECT id, user_code, phone, name, status, otp_hash, otp_expires_at, otp_sent_at, otp_attempts, created_at FROM users WHERE phone=$1', [phone]);
  return r.rows[0] || null;
}
async function createUser(phone) {
  if (!hasDatabase()) {
    const users = fallbackUsersRead();
    const existing = users.find(u => u.phone === phone);
    if (existing) return existing;
    const id = Date.now();
    const user = { id, user_code: 'U' + String(id).slice(-8), phone, name: '', status: 'active', otp_hash: null, otp_expires_at: null, otp_sent_at: null, otp_attempts: 0, created_at: new Date().toISOString() };
    users.push(user); fallbackUsersWrite(users); return user;
  }
  await init();
  const r = await pool.query('INSERT INTO users(user_code, phone) VALUES($1,$2) ON CONFLICT(phone) DO UPDATE SET phone=EXCLUDED.phone, updated_at=NOW() RETURNING id,user_code,phone,name,status,otp_hash,otp_expires_at,otp_sent_at,otp_attempts,created_at', ['U' + cryptoRandom(8), phone]);
  return r.rows[0];
}
function cryptoRandom(n) { return require('crypto').randomBytes(Math.ceil(n/2)).toString('hex').slice(0,n).toUpperCase(); }
async function setUserOtp(phone, otpHash, expiresAt, sentAt) {
  if (!hasDatabase()) {
    const users = fallbackUsersRead(); const u = users.find(x => x.phone === phone); if (!u) throw new Error('User not found');
    u.otp_hash = otpHash; u.otp_expires_at = expiresAt; u.otp_sent_at = sentAt; u.otp_attempts = 0; fallbackUsersWrite(users); return u;
  }
  await init();
  const r = await pool.query('UPDATE users SET otp_hash=$1, otp_expires_at=$2, otp_sent_at=$3, otp_attempts=0, updated_at=NOW() WHERE phone=$4 RETURNING id,user_code,phone,name,status,otp_hash,otp_expires_at,otp_sent_at,otp_attempts,created_at', [otpHash, expiresAt, sentAt, phone]);
  return r.rows[0];
}
async function updateOtpAttempts(phone, attempts) {
  if (!hasDatabase()) { const users=fallbackUsersRead(); const u=users.find(x=>x.phone===phone); if(u){u.otp_attempts=attempts;fallbackUsersWrite(users);} return; }
  await init(); await pool.query('UPDATE users SET otp_attempts=$1, updated_at=NOW() WHERE phone=$2', [attempts, phone]);
}
async function clearUserOtp(phone) {
  if (!hasDatabase()) { const users=fallbackUsersRead(); const u=users.find(x=>x.phone===phone); if(u){u.otp_hash=null;u.otp_expires_at=null;u.otp_sent_at=null;u.otp_attempts=0;fallbackUsersWrite(users);} return; }
  await init(); await pool.query('UPDATE users SET otp_hash=NULL, otp_expires_at=NULL, otp_sent_at=NULL, otp_attempts=0, updated_at=NOW() WHERE phone=$1', [phone]);
}
async function updateUserName(id, name) {
  if (!hasDatabase()) { const users=fallbackUsersRead(); const u=users.find(x=>String(x.id)===String(id)); if(!u) return null; u.name=name; fallbackUsersWrite(users); return u; }
  await init(); const r=await pool.query('UPDATE users SET name=$1, updated_at=NOW() WHERE id=$2 RETURNING id,user_code,phone,name,status,created_at', [name,id]); return r.rows[0]||null;
}
async function getUserById(id) {
  if (!hasDatabase()) return fallbackUsersRead().find(u=>String(u.id)===String(id))||null;
  await init(); const r=await pool.query('SELECT id,user_code,phone,name,status,created_at FROM users WHERE id=$1',[id]); return r.rows[0]||null;
}

async function getUserDashboard(id) {
  if (!hasDatabase()) {
    const users = fallbackUsersRead();
    const u = users.find(x => String(x.id) === String(id));
    if (!u) return null;
    return {
      gaming_balance: Number(u.gaming_balance || 0),
      winning_balance: Number(u.winning_balance || 0),
      joined_matches: Number(u.joined_matches || 0),
      notifications: Number(u.notifications || 0)
    };
  }
  await init();
  await pool.query('INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [id]);
  const r = await pool.query(`
    SELECT w.gaming_balance, w.winning_balance,
      (SELECT COUNT(*) FROM match_players mp WHERE mp.user_id=$1)::int AS joined_matches,
      (SELECT COUNT(*) FROM notifications n WHERE n.user_id=$1 AND n.read_at IS NULL)::int AS notifications
    FROM wallets w WHERE w.user_id=$1`, [id]);
  return r.rows[0] || {gaming_balance:0, winning_balance:0, joined_matches:0, notifications:0};
}

async function ensureUserWallet(id) {
  if (!hasDatabase()) {
    const users = fallbackUsersRead();
    const u = users.find(x => String(x.id) === String(id));
    if (!u) return null;
    if (u.gaming_balance == null) u.gaming_balance = 0;
    if (u.winning_balance == null) u.winning_balance = 0;
    fallbackUsersWrite(users);
    return u;
  }
  await init();
  await pool.query('INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING', [id]);
  return true;
}


async function createDeposit(userId, method, amount, transactionId, screenshot) {
  if (!hasDatabase()) {
    const users = fallbackUsersRead();
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) throw new Error('User not found');
    const deposits = fallbackDepositsRead();
    if (transactionId && deposits.some(d => String(d.transaction_id||'').toLowerCase() === String(transactionId).toLowerCase())) throw new Error('এই Transaction ID আগে ব্যবহার করা হয়েছে');
    const id = Date.now();
    const item = {id, user_id:user.id, user_code:user.user_code, phone:user.phone, method, amount:Number(amount), transaction_id:transactionId, screenshot, status:'pending', reviewed_by:null, created_at:new Date().toISOString(), reviewed_at:null};
    deposits.unshift(item); fallbackDepositsWrite(deposits);
    return item;
  }
  await init();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const u = await client.query('SELECT id,user_code,phone,status FROM users WHERE id=$1 FOR UPDATE',[userId]);
    if (!u.rows[0]) throw new Error('User not found');
    if (u.rows[0].status !== 'active') throw new Error('এই অ্যাকাউন্টটি বন্ধ আছে');
    const d = await client.query('INSERT INTO deposits(user_id,method,amount,transaction_id,screenshot,status) VALUES($1,$2,$3,$4,$5,\'pending\') RETURNING *',[userId,method,amount,transactionId||null,screenshot||null]);
    await client.query('INSERT INTO transactions(user_id,type,amount,balance_type,reference,status,note) VALUES($1,\'deposit\',$2,\'gaming\',$3,\'pending\',$4)',[userId,amount,transactionId||('DEP-'+d.rows[0].id),'Deposit request via '+method]);
    await client.query('COMMIT');
    return {...d.rows[0],user_code:u.rows[0].user_code,phone:u.rows[0].phone};
  } catch(e) { await client.query('ROLLBACK'); if(e && e.code==='23505') throw new Error('এই Transaction ID আগে ব্যবহার করা হয়েছে'); throw e; } finally { client.release(); }
}

async function listUserDeposits(userId, limit=50) {
  if (!hasDatabase()) return fallbackDepositsRead().filter(d=>String(d.user_id)===String(userId)).slice(0,limit);
  await init();
  const r=await pool.query(`SELECT id,method,amount,transaction_id,screenshot,status,created_at,reviewed_at FROM deposits WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,[userId,limit]);
  return r.rows;
}

async function listAdminDeposits(status='all', limit=100) {
  if (!hasDatabase()) {
    const users=fallbackUsersRead(); const map=new Map(users.map(u=>[String(u.id),u]));
    let rows=fallbackDepositsRead().map(d=>({...d,user_code:d.user_code||map.get(String(d.user_id))?.user_code||'',phone:d.phone||map.get(String(d.user_id))?.phone||''}));
    if(status!=='all') rows=rows.filter(d=>d.status===status);
    return rows.slice(0,limit);
  }
  await init();
  const where=status==='all'?'':' WHERE d.status=$1';
  const params=status==='all'?[limit]:[status,limit];
  const r=await pool.query(`SELECT d.id,d.user_id,u.user_code,u.phone,u.name,d.method,d.amount,d.transaction_id,d.screenshot,d.status,d.created_at,d.reviewed_at FROM deposits d JOIN users u ON u.id=d.user_id${where} ORDER BY d.created_at DESC LIMIT $${params.length}` ,params);
  return r.rows;
}

async function reviewDeposit(depositId, status, adminId=null, note='') {
  if (!['approved','rejected'].includes(status)) throw new Error('Invalid deposit status');
  if (!hasDatabase()) {
    const deposits=fallbackDepositsRead(); const d=deposits.find(x=>String(x.id)===String(depositId));
    if(!d) throw new Error('Deposit পাওয়া যায়নি');
    if(d.status!=='pending') throw new Error('এই Deposit ইতিমধ্যে review করা হয়েছে');
    d.status=status; d.reviewed_by=adminId; d.reviewed_at=new Date().toISOString(); fallbackDepositsWrite(deposits);
    const users=fallbackUsersRead(); const u=users.find(x=>String(x.id)===String(d.user_id));
    if(u){
      u.gaming_balance=Number(u.gaming_balance||0); if(status==='approved') u.gaming_balance+=Number(d.amount); fallbackUsersWrite(users);
    }
    return d;
  }
  await init();
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const q=await client.query('SELECT d.*,u.user_code FROM deposits d JOIN users u ON u.id=d.user_id WHERE d.id=$1 FOR UPDATE',[depositId]);
    if(!q.rows[0]) throw new Error('Deposit পাওয়া যায়নি');
    const d=q.rows[0]; if(d.status!=='pending') throw new Error('এই Deposit ইতিমধ্যে review করা হয়েছে');
    await client.query('UPDATE deposits SET status=$1, reviewed_by=$2, reviewed_at=NOW() WHERE id=$3',[status,adminId,depositId]);
    if(status==='approved'){
      await client.query('INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING',[d.user_id]);
      await client.query('UPDATE wallets SET gaming_balance=gaming_balance+$1,updated_at=NOW() WHERE user_id=$2',[d.amount,d.user_id]);
      await client.query('UPDATE transactions SET status=\'completed\',note=$1 WHERE user_id=$2 AND reference=$3 AND type=\'deposit\' AND status=\'pending\'',[note||'Deposit approved',d.user_id,d.transaction_id||('DEP-'+d.id)]);
      await client.query('INSERT INTO notifications(user_id,title,message) VALUES($1,$2,$3)',[d.user_id,'Deposit Approved','আপনার ৳'+Number(d.amount).toFixed(2)+' Deposit Gaming Balance-এ যোগ হয়েছে।']);
    } else {
      await client.query('UPDATE transactions SET status=\'rejected\',note=$1 WHERE user_id=$2 AND reference=$3 AND type=\'deposit\' AND status=\'pending\'',[note||'Deposit rejected',d.user_id,d.transaction_id||('DEP-'+d.id)]);
      await client.query('INSERT INTO notifications(user_id,title,message) VALUES($1,$2,$3)',[d.user_id,'Deposit Rejected','আপনার Deposit requestটি বাতিল করা হয়েছে।']);
    }
    await client.query('COMMIT'); return {...d,status,reviewed_at:new Date().toISOString()};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}

async function getAdminId(username) {
  if (!hasDatabase()) return null;
  await init(); const r=await pool.query('SELECT id FROM admins WHERE username=$1',[username]); return r.rows[0]?.id||null;
}

module.exports = { init, getData, saveData, hasDatabase, findUser, createUser, setUserOtp, updateOtpAttempts, clearUserOtp, updateUserName, getUserById, getUserDashboard, ensureUserWallet, createDeposit, listUserDeposits, listAdminDeposits, reviewDeposit, getAdminId };
