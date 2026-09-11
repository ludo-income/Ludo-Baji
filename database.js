const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data.json');
const USERS_DATA = path.join(__dirname, 'users.json');
const DEPOSITS_DATA = path.join(__dirname, 'deposits.json');
const WITHDRAWALS_DATA = path.join(__dirname, 'withdrawals.json');
const NOTIFICATIONS_DATA = path.join(__dirname, 'notifications.json');
const TRANSACTIONS_DATA = path.join(__dirname, 'transactions.json');
const SUPPORT_DATA = path.join(__dirname, 'support_messages.json');
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
function fallbackWithdrawalsRead() {
  if (!fs.existsSync(WITHDRAWALS_DATA)) return [];
  try { return JSON.parse(fs.readFileSync(WITHDRAWALS_DATA, 'utf8')); } catch { return []; }
}
function fallbackWithdrawalsWrite(items) {
  const tmp = WITHDRAWALS_DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(tmp, WITHDRAWALS_DATA);
}
function fallbackNotificationsRead() {
  if (!fs.existsSync(NOTIFICATIONS_DATA)) return [];
  try { return JSON.parse(fs.readFileSync(NOTIFICATIONS_DATA, 'utf8')); } catch { return []; }
}
function fallbackNotificationsWrite(items) {
  const tmp = NOTIFICATIONS_DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(tmp, NOTIFICATIONS_DATA);
}
function fallbackTransactionsRead() {
  if (!fs.existsSync(TRANSACTIONS_DATA)) return [];
  try { return JSON.parse(fs.readFileSync(TRANSACTIONS_DATA, 'utf8')); } catch { return []; }
}
function fallbackTransactionsWrite(items) {
  const tmp = TRANSACTIONS_DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(tmp, TRANSACTIONS_DATA);
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
      CREATE TABLE IF NOT EXISTS transactions (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, amount NUMERIC(14,2) NOT NULL, balance_type TEXT, reference TEXT, status TEXT NOT NULL DEFAULT 'pending', note TEXT, balance_before NUMERIC(14,2), balance_after NUMERIC(14,2), balance_change NUMERIC(14,2), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_before NUMERIC(14,2);
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC(14,2);
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_change NUMERIC(14,2);
      CREATE TABLE IF NOT EXISTS deposits (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, method TEXT NOT NULL, amount NUMERIC(14,2) NOT NULL, transaction_id TEXT, screenshot TEXT, status TEXT NOT NULL DEFAULT 'pending', reviewed_by BIGINT REFERENCES admins(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_deposits_transaction_id ON deposits(transaction_id) WHERE transaction_id IS NOT NULL AND transaction_id <> '';
      CREATE TABLE IF NOT EXISTS withdrawals (id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, method TEXT NOT NULL, account_number TEXT NOT NULL, amount NUMERIC(14,2) NOT NULL, balance_type TEXT NOT NULL DEFAULT 'winning', status TEXT NOT NULL DEFAULT 'pending', note TEXT, reviewed_by BIGINT REFERENCES admins(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ);
      ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS balance_type TEXT NOT NULL DEFAULT 'winning';
      ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS note TEXT;
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
    const txs=fallbackTransactionsRead();
    txs.unshift({id:'DEP-'+id,user_id:user.id,user_code:user.user_code,type:'deposit',amount:Number(amount),balance_type:'gaming',reference:transactionId||('DEP-'+id),status:'pending',note:'Deposit request via '+method,balance_before:Number(user.gaming_balance||0),balance_after:Number(user.gaming_balance||0),balance_change:0,created_at:item.created_at});
    fallbackTransactionsWrite(txs);
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
      const before=Number(u.gaming_balance||0), after=status==='approved'?Number((before+Number(d.amount)).toFixed(2)):before;
      u.gaming_balance=after; fallbackUsersWrite(users);
      const txs=fallbackTransactionsRead(); const tx=txs.find(x=>String(x.reference)===(d.transaction_id||('DEP-'+d.id)) && x.type==='deposit' && x.status==='pending');
      if(tx){tx.status=status==='approved'?'completed':'rejected';tx.note=note||(status==='approved'?'Deposit approved':'Deposit rejected');tx.balance_before=before;tx.balance_after=after;tx.balance_change=status==='approved'?Number(d.amount):0;}
      fallbackTransactionsWrite(txs);
      const notes=fallbackNotificationsRead(); notes.unshift({id:Date.now()+1,user_id:d.user_id,title:status==='approved'?'Deposit Approved':'Deposit Rejected',message:status==='approved'?('আপনার ৳'+Number(d.amount).toFixed(2)+' Deposit Gaming Balance-এ যোগ হয়েছে।'):('আপনার Deposit requestটি বাতিল করা হয়েছে।'+(note?' কারণ: '+note:'')),read_at:null,created_at:d.reviewed_at}); fallbackNotificationsWrite(notes);
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



async function createWithdrawal(userId, method, accountNumber, amount, balanceType='winning') {
  if (!['bkash','nagad'].includes(method)) throw new Error('bKash অথবা Nagad নির্বাচন করুন');
  if (!['gaming','winning'].includes(balanceType)) throw new Error('সঠিক Balance নির্বাচন করুন');
  if (!hasDatabase()) {
    const users = fallbackUsersRead();
    const u = users.find(x => String(x.id) === String(userId));
    if (!u) throw new Error('User not found');
    if (u.status !== 'active') throw new Error('এই অ্যাকাউন্টটি বন্ধ আছে');
    const key = balanceType === 'gaming' ? 'gaming_balance' : 'winning_balance';
    const balance = Number(u[key] || 0);
    if (balance < amount) throw new Error('পর্যাপ্ত Balance নেই');
    u[key] = Number((balance - amount).toFixed(2));
    const withdrawals = fallbackWithdrawalsRead();
    const id = Date.now();
    const item = {id,user_id:u.id,user_code:u.user_code,phone:u.phone,name:u.name||'',method,account_number:accountNumber,amount:Number(amount),balance_type:balanceType,status:'pending',note:'',reviewed_by:null,created_at:new Date().toISOString(),reviewed_at:null};
    withdrawals.unshift(item); fallbackWithdrawalsWrite(withdrawals); fallbackUsersWrite(users);
    const txs=fallbackTransactionsRead(); txs.unshift({id:'WDR-'+id,user_id:u.id,type:'withdrawal',amount:Number(amount),balance_type:balanceType,reference:'WDR-'+id,status:'pending',note:'Withdrawal request via '+method,balance_before:balance,balance_after:u[key],balance_change:-Number(amount),created_at:item.created_at}); fallbackTransactionsWrite(txs);
    const notes=fallbackNotificationsRead(); notes.unshift({id:Date.now()+1,user_id:u.id,title:'Withdrawal Submitted',message:'আপনার ৳'+Number(amount).toFixed(2)+' Withdrawal request জমা হয়েছে।',read_at:null,created_at:item.created_at}); fallbackNotificationsWrite(notes);
    return item;
  }
  await init();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const u = await client.query('SELECT id,user_code,phone,name,status FROM users WHERE id=$1 FOR UPDATE',[userId]);
    if (!u.rows[0]) throw new Error('User not found');
    if (u.rows[0].status !== 'active') throw new Error('এই অ্যাকাউন্টটি বন্ধ আছে');
    await client.query('INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING',[userId]);
    const col = balanceType === 'gaming' ? 'gaming_balance' : 'winning_balance';
    const w = await client.query(`SELECT ${col} AS balance FROM wallets WHERE user_id=$1 FOR UPDATE`,[userId]);
    const balance = Number(w.rows[0]?.balance || 0);
    if (balance < amount) throw new Error('পর্যাপ্ত Balance নেই');
    const r = await client.query('INSERT INTO withdrawals(user_id,method,account_number,amount,balance_type,status,note) VALUES($1,$2,$3,$4,$5,\'pending\',\'\') RETURNING *',[userId,method,accountNumber,amount,balanceType]);
    await client.query(`UPDATE wallets SET ${col}=${col}-$1,updated_at=NOW() WHERE user_id=$2`,[amount,userId]);
    await client.query('INSERT INTO transactions(user_id,type,amount,balance_type,reference,status,note) VALUES($1,\'withdrawal\',$2,$3,$4,\'pending\',$5)',[userId,amount,balanceType,'WDR-'+r.rows[0].id,'Withdrawal request via '+method]);
    await client.query('INSERT INTO notifications(user_id,title,message) VALUES($1,$2,$3)',[userId,'Withdrawal Submitted','আপনার ৳'+Number(amount).toFixed(2)+' Withdrawal request জমা হয়েছে।']);
    await client.query('COMMIT');
    return {...r.rows[0],user_code:u.rows[0].user_code,phone:u.rows[0].phone,name:u.rows[0].name||''};
  } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

async function listUserWithdrawals(userId, limit=50) {
  if (!hasDatabase()) return fallbackWithdrawalsRead().filter(d=>String(d.user_id)===String(userId)).slice(0,limit);
  await init();
  const r=await pool.query('SELECT id,method,account_number,amount,balance_type,status,note,created_at,reviewed_at FROM withdrawals WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2',[userId,limit]);
  return r.rows;
}

async function listAdminWithdrawals(status='all', limit=100) {
  if (!hasDatabase()) {
    const users=fallbackUsersRead(); const map=new Map(users.map(u=>[String(u.id),u]));
    let rows=fallbackWithdrawalsRead().map(d=>({...d,user_code:d.user_code||map.get(String(d.user_id))?.user_code||'',phone:d.phone||map.get(String(d.user_id))?.phone||'',name:d.name||map.get(String(d.user_id))?.name||''}));
    if(status!=='all') rows=rows.filter(d=>d.status===status);
    return rows.slice(0,limit);
  }
  await init();
  const where=status==='all'?'':' WHERE w.status=$1';
  const params=status==='all'?[limit]:[status,limit];
  const r=await pool.query(`SELECT w.id,w.user_id,u.user_code,u.phone,u.name,w.method,w.account_number,w.amount,w.balance_type,w.status,w.note,w.created_at,w.reviewed_at FROM withdrawals w JOIN users u ON u.id=w.user_id${where} ORDER BY w.created_at DESC LIMIT $${params.length}`,params);
  return r.rows;
}

async function reviewWithdrawal(withdrawalId, status, adminId=null, note='') {
  if (!['approved','rejected'].includes(status)) throw new Error('Invalid withdrawal status');
  if (!hasDatabase()) {
    const withdrawals=fallbackWithdrawalsRead(); const d=withdrawals.find(x=>String(x.id)===String(withdrawalId));
    if(!d) throw new Error('Withdrawal পাওয়া যায়নি');
    if(d.status!=='pending') throw new Error('এই Withdrawal ইতিমধ্যে review করা হয়েছে');
    const users=fallbackUsersRead(); const u=users.find(x=>String(x.id)===String(d.user_id));
    if(!u) throw new Error('User not found');
    if(status==='rejected') { const key=d.balance_type==='gaming'?'gaming_balance':'winning_balance'; u[key]=Number((Number(u[key]||0)+Number(d.amount)).toFixed(2)); }
    d.status=status; d.note=note; d.reviewed_by=adminId; d.reviewed_at=new Date().toISOString();
    const txs=fallbackTransactionsRead(); const tx=txs.find(x=>String(x.reference)==='WDR-'+d.id&&x.status==='pending'); if(tx){tx.status=status==='approved'?'completed':'rejected';tx.note=note||(status==='approved'?'Withdrawal approved':'Withdrawal rejected');tx.balance_change=status==='approved'?-Number(d.amount):0;tx.balance_after=Number(u[d.balance_type==='gaming'?'gaming_balance':'winning_balance']||0);} fallbackTransactionsWrite(txs);
    const notes=fallbackNotificationsRead(); notes.unshift({id:Date.now()+1,user_id:d.user_id,title:status==='approved'?'Withdrawal Approved':'Withdrawal Rejected',message:status==='approved'?('আপনার ৳'+Number(d.amount).toFixed(2)+' Withdrawal request approved হয়েছে।'):('আপনার Withdrawal requestটি বাতিল করা হয়েছে এবং ৳'+Number(d.amount).toFixed(2)+' Balance-এ ফেরত দেওয়া হয়েছে।'+(note?' কারণ: '+note:'')),read_at:null,created_at:d.reviewed_at}); fallbackNotificationsWrite(notes);
    fallbackWithdrawalsWrite(withdrawals); fallbackUsersWrite(users);
    return d;
  }
  await init(); const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const q=await client.query('SELECT w.*,u.user_code FROM withdrawals w JOIN users u ON u.id=w.user_id WHERE w.id=$1 FOR UPDATE',[withdrawalId]);
    if(!q.rows[0]) throw new Error('Withdrawal পাওয়া যায়নি');
    const d=q.rows[0]; if(d.status!=='pending') throw new Error('এই Withdrawal ইতিমধ্যে review করা হয়েছে');
    await client.query('UPDATE withdrawals SET status=$1,reviewed_by=$2,reviewed_at=NOW(),note=$3 WHERE id=$4',[status,adminId,note,withdrawalId]);
    if(status==='rejected') {
      await client.query('INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING',[d.user_id]);
      const col=d.balance_type==='gaming'?'gaming_balance':'winning_balance';
      const wb=await client.query(`SELECT ${col} AS balance FROM wallets WHERE user_id=$1 FOR UPDATE`,[d.user_id]);
      const before=Number(wb.rows[0]?.balance||0), after=Number((before+Number(d.amount)).toFixed(2));
      await client.query(`UPDATE wallets SET ${col}=$1,updated_at=NOW() WHERE user_id=$2`,[after,d.user_id]);
      await client.query('UPDATE transactions SET status=\'rejected\',note=$1,balance_before=$2,balance_after=$3,balance_change=0 WHERE user_id=$4 AND reference=$5 AND type=\'withdrawal\' AND status=\'pending\'',[note||'Withdrawal rejected',before,after,d.user_id,'WDR-'+d.id]);
      await client.query('INSERT INTO notifications(user_id,title,message) VALUES($1,$2,$3)',[d.user_id,'Withdrawal Rejected','আপনার Withdrawal requestটি বাতিল করা হয়েছে এবং ৳'+Number(d.amount).toFixed(2)+' Balance-এ ফেরত দেওয়া হয়েছে।'+(note?' কারণ: '+note:'')]);
    } else {
      await client.query('UPDATE transactions SET status=\'completed\',note=$1 WHERE user_id=$2 AND reference=$3 AND type=\'withdrawal\' AND status=\'pending\'',[note||'Withdrawal approved',d.user_id,'WDR-'+d.id]);
      await client.query('INSERT INTO notifications(user_id,title,message) VALUES($1,$2,$3)',[d.user_id,'Withdrawal Approved','আপনার ৳'+Number(d.amount).toFixed(2)+' Withdrawal request approved হয়েছে।']);
    }
    await client.query('COMMIT'); return {...d,status,note,reviewed_at:new Date().toISOString()};
  } catch(e){await client.query('ROLLBACK');throw e;} finally{client.release();}
}

async function getAdminId(username) {
  if (!hasDatabase()) return null;
  await init(); const r=await pool.query('SELECT id FROM admins WHERE username=$1',[username]); return r.rows[0]?.id||null;
}

async function listUserTransactions(userId, limit=100) {
  if (!hasDatabase()) {
    const users=fallbackUsersRead(); const u=users.find(x=>String(x.id)===String(userId));
    return fallbackTransactionsRead().filter(t=>String(t.user_id)===String(userId)).slice(0,limit).map(t=>({...t,user_code:t.user_code||u?.user_code||''}));
  }
  await init();
  const r=await pool.query(`SELECT id,type,amount,balance_type,reference,status,note,balance_before,balance_after,balance_change,created_at FROM transactions WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2`,[userId,limit]);
  return r.rows;
}
async function listAdminTransactions(limit=200) {
  if (!hasDatabase()) {
    const users=fallbackUsersRead(); const map=new Map(users.map(u=>[String(u.id),u]));
    return fallbackTransactionsRead().slice(0,limit).map(t=>({...t,user_code:t.user_code||map.get(String(t.user_id))?.user_code||'',phone:map.get(String(t.user_id))?.phone||'',name:map.get(String(t.user_id))?.name||''}));
  }
  await init();
  const r=await pool.query(`SELECT t.id,t.user_id,u.user_code,u.phone,u.name,t.type,t.amount,t.balance_type,t.reference,t.status,t.note,t.balance_before,t.balance_after,t.balance_change,t.created_at FROM transactions t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC,t.id DESC LIMIT $1`,[limit]);
  return r.rows;
}

module.exports = { init, getData, saveData, hasDatabase, findUser, createUser, setUserOtp, updateOtpAttempts, clearUserOtp, updateUserName, getUserById, getUserDashboard, ensureUserWallet, createDeposit, listUserDeposits, listAdminDeposits, reviewDeposit, createWithdrawal, listUserWithdrawals, listAdminWithdrawals, reviewWithdrawal, listUserTransactions, listAdminTransactions, getAdminId };

// ===== Ludo Baji feature-complete extensions (Steps 3-35) =====
async function listUsers(limit=500, q='') {
  if (!hasDatabase()) { let a=fallbackUsersRead(); q=String(q||'').toLowerCase(); if(q)a=a.filter(u=>[u.user_code,u.phone,u.name].some(v=>String(v||'').toLowerCase().includes(q))); return a.slice(-limit).reverse().map(u=>({id:u.id,user_code:u.user_code,phone:u.phone,name:u.name||'',status:u.status||'active',gaming_balance:Number(u.gaming_balance||0),winning_balance:Number(u.winning_balance||0),created_at:u.created_at})); }
  await init(); const r=await pool.query(`SELECT u.id,u.user_code,u.phone,u.name,u.status,u.created_at,COALESCE(w.gaming_balance,0) gaming_balance,COALESCE(w.winning_balance,0) winning_balance FROM users u LEFT JOIN wallets w ON w.user_id=u.id WHERE ($1='' OR u.user_code ILIKE '%'||$1||'%' OR u.phone ILIKE '%'||$1||'%' OR COALESCE(u.name,'') ILIKE '%'||$1||'%') ORDER BY u.created_at DESC LIMIT $2`,[String(q||''),limit]); return r.rows;
}
async function setUserStatus(id,status){
  status=status==='blocked'?'blocked':'active'; if(!hasDatabase()){const a=fallbackUsersRead(),u=a.find(x=>String(x.id)===String(id));if(!u)throw new Error('User not found');u.status=status;fallbackUsersWrite(a);return u;} await init();const r=await pool.query('UPDATE users SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id,user_code,phone,name,status,created_at',[status,id]);if(!r.rows[0])throw new Error('User not found');return r.rows[0];
}
async function adjustBalance(id,balanceType,amount,note='Admin balance adjustment'){
  balanceType=balanceType==='gaming'?'gaming':'winning'; amount=Number(amount);if(!Number.isFinite(amount)||amount===0)throw new Error('Invalid amount');
  if(!hasDatabase()){const a=fallbackUsersRead(),u=a.find(x=>String(x.id)===String(id));if(!u)throw new Error('User not found');const key=balanceType+'_balance',before=Number(u[key]||0),after=Number((before+amount).toFixed(2));if(after<0)throw new Error('Balance cannot be negative');u[key]=after;fallbackUsersWrite(a);const tx=fallbackTransactionsRead();tx.unshift({id:'ADJ-'+Date.now(),user_id:u.id,type:'balance_adjustment',amount:Math.abs(amount),balance_type:balanceType,reference:'ADJ-'+Date.now(),status:'completed',note,balance_before:before,balance_after:after,balance_change:amount,created_at:new Date().toISOString()});fallbackTransactionsWrite(tx);return {before,after,change:amount};}
  await init();const c=await pool.connect();try{await c.query('BEGIN');await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[id]);await c.query('INSERT INTO wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);const col=balanceType+'_balance';const w=await c.query(`SELECT ${col} balance FROM wallets WHERE user_id=$1 FOR UPDATE`,[id]);const before=Number(w.rows[0]?.balance||0),after=Number((before+amount).toFixed(2));if(after<0)throw new Error('Balance cannot be negative');await c.query(`UPDATE wallets SET ${col}=$1,updated_at=NOW() WHERE user_id=$2`,[after,id]);await c.query(`INSERT INTO transactions(user_id,type,amount,balance_type,reference,status,note,balance_before,balance_after,balance_change) VALUES($1,'balance_adjustment',$2,$3,$4,'completed',$5,$6,$7,$8)`,[id,Math.abs(amount),balanceType,'ADJ-'+Date.now(),note,before,after,amount]);await c.query('COMMIT');return {before,after,change:amount};}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
async function notifyUser(userId,title,message){const item={id:Date.now()+Math.random(),user_id:userId,title,message,read_at:null,created_at:new Date().toISOString()};if(!hasDatabase()){const a=fallbackNotificationsRead();a.unshift(item);fallbackNotificationsWrite(a);return item;}await init();const r=await pool.query('INSERT INTO notifications(user_id,title,message) VALUES($1,$2,$3) RETURNING *',[userId,title,message]);return r.rows[0];}
async function createFeatureMatch(x){
  const item={id:'M-'+Date.now()+Math.random().toString(36).slice(2,5),match_code:String(x.match_code||('LB'+Date.now())).toUpperCase(),title:String(x.title||'Ludo Match').trim(),entry_fee:Number(x.entry_fee||0),winning_amount:Number(x.winning_amount||0),max_players:Math.max(2,Math.min(100,Number(x.max_players||4))),scheduled_at:x.scheduled_at||new Date().toISOString(),status:x.status||'open',room_id:'',room_password:'',rules:String(x.rules||''),players:[],winner_user_id:null,prize_status:'pending',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};if(!item.title||item.entry_fee<0||item.winning_amount<0)throw new Error('Invalid match data');const d=await getData();d.matches=Array.isArray(d.matches)?d.matches:[];d.matches.unshift(item);await saveData(d);return item;
}
async function listFeatureMatches(status='all'){const d=await getData();let a=Array.isArray(d.matches)?d.matches:[];if(status!=='all')a=a.filter(x=>x.status===status);return a.map(x=>({...x,players:Array.isArray(x.players)?x.players:[]}));}
async function getFeatureMatch(id){const a=await listFeatureMatches('all');return a.find(x=>String(x.id)===String(id)||String(x.match_code)===String(id))||null;}
async function updateFeatureMatch(id,x){const d=await getData();d.matches=Array.isArray(d.matches)?d.matches:[];const m=d.matches.find(a=>String(a.id)===String(id));if(!m)throw new Error('Match not found');Object.assign(m,{title:String(x.title??m.title),entry_fee:Number(x.entry_fee??m.entry_fee),winning_amount:Number(x.winning_amount??m.winning_amount),max_players:Math.max(2,Number(x.max_players??m.max_players)),scheduled_at:x.scheduled_at??m.scheduled_at,rules:String((x.rules??m.rules)??''),status:String(x.status??m.status),room_id:String((x.room_id??m.room_id)??''),room_password:String((x.room_password??m.room_password)??''),updated_at:new Date().toISOString()});await saveData(d);return m;}
async function joinFeatureMatch(matchId,userId){const d=await getData();d.matches=Array.isArray(d.matches)?d.matches:[];const m=d.matches.find(a=>String(a.id)===String(matchId));if(!m)throw new Error('Match not found');m.players=Array.isArray(m.players)?m.players:[];if(m.status!=='open')throw new Error('Match is not open');if(m.players.some(p=>String(p.user_id)===String(userId)))throw new Error('Already joined');if(m.players.length>=Number(m.max_players))throw new Error('Match is full');const bal=await getUserDashboard(userId);if(Number(bal.gaming_balance||0)<Number(m.entry_fee))throw new Error('Gaming Balance insufficient');if(Number(m.entry_fee)>0) await adjustBalance(userId,'gaming',-Number(m.entry_fee),'Match entry fee '+m.match_code);const slot=m.players.length+1;m.players.push({user_id:userId,slot,status:'joined',joined_at:new Date().toISOString()});if(m.players.length>=Number(m.max_players))m.status='full';await saveData(d);await notifyUser(userId,'Match Joined','আপনি '+m.title+' match-এ Slot '+slot+' এ join করেছেন।');const tx=fallbackTransactionsRead();tx.unshift({id:'ENTRY-'+Date.now(),user_id:userId,type:'match_entry',amount:Number(m.entry_fee),balance_type:'gaming',reference:'ENTRY-'+m.match_code,status:'completed',note:'Joined '+m.title,balance_before:null,balance_after:null,balance_change:-Number(m.entry_fee),created_at:new Date().toISOString()});if(!hasDatabase())fallbackTransactionsWrite(tx);return {match:m,slot};}
async function setFeatureRoom(id,roomId,password){return updateFeatureMatch(id,{room_id:roomId,room_password:password});}
async function setFeatureWinner(id,userId){const d=await getData();d.matches=Array.isArray(d.matches)?d.matches:[];const m=d.matches.find(a=>String(a.id)===String(id));if(!m)throw new Error('Match not found');if(!m.players.some(p=>String(p.user_id)===String(userId)))throw new Error('Winner must be a joined player');m.winner_user_id=String(userId);m.status='completed';m.prize_status='pending';m.updated_at=new Date().toISOString();await saveData(d);await notifyUser(userId,'Match Result','আপনার '+m.title+' match-এর result প্রকাশিত হয়েছে।');return m;}
async function approveFeaturePrize(id){const d=await getData();d.matches=Array.isArray(d.matches)?d.matches:[];const m=d.matches.find(a=>String(a.id)===String(id));if(!m||!m.winner_user_id)throw new Error('Winner not selected');if(m.prize_status==='approved')throw new Error('Prize already approved');await adjustBalance(m.winner_user_id,'winning',Number(m.winning_amount),'Prize for '+m.match_code);m.prize_status='approved';m.updated_at=new Date().toISOString();await saveData(d);await notifyUser(m.winner_user_id,'Prize Credited','আপনার ৳'+Number(m.winning_amount).toFixed(2)+' prize Winning Balance-এ যোগ হয়েছে।');return m;}
async function listUserFeatureMatches(userId){const a=await listFeatureMatches('all');return a.filter(m=>m.players.some(p=>String(p.user_id)===String(userId))).map(m=>({...m,my_slot:m.players.find(p=>String(p.user_id)===String(userId))?.slot}));}
async function listNotifications(userId,limit=100){if(!hasDatabase()){return fallbackNotificationsRead().filter(n=>String(n.user_id)===String(userId)).slice(0,limit)}await init();const r=await pool.query('SELECT id,title,message,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2',[userId,limit]);return r.rows;}
async function markNotificationsRead(userId,id){if(!hasDatabase()){const a=fallbackNotificationsRead();a.forEach(n=>{if(String(n.user_id)===String(userId)&&(id==='all'||String(n.id)===String(id)))n.read_at=new Date().toISOString()});fallbackNotificationsWrite(a);return true;}await init();if(id==='all')await pool.query('UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL',[userId]);else await pool.query('UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND id=$2',[userId,id]);return true;}
async function supportList(userId){if(!hasDatabase())return fallbackSupportRead().filter(x=>String(x.user_id)===String(userId));await init();const r=await pool.query('SELECT id,user_id,sender,message,created_at FROM support_messages WHERE user_id=$1 ORDER BY created_at ASC',[userId]);return r.rows;}
async function supportSend(userId,sender,message){message=String(message||'').trim();if(!message||message.length>2000)throw new Error('Message required');if(!hasDatabase()){const a=fallbackSupportRead();a.push({id:Date.now(),user_id:userId,sender,message,created_at:new Date().toISOString()});fallbackSupportWrite(a);return a[a.length-1];}await init();const r=await pool.query('INSERT INTO support_messages(user_id,sender,message) VALUES($1,$2,$3) RETURNING *',[userId,sender,message]);return r.rows[0];}
async function adminSupport(limit=300){if(!hasDatabase())return fallbackSupportRead().slice(-limit).reverse();await init();const r=await pool.query('SELECT s.*,u.user_code,u.phone,u.name FROM support_messages s JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC LIMIT $1',[limit]);return r.rows;}
function fallbackSupportRead(){try{return JSON.parse(fs.readFileSync(SUPPORT_DATA,'utf8'))}catch{return []}}
function fallbackSupportWrite(items){const tmp=SUPPORT_DATA+'.tmp';fs.writeFileSync(tmp,JSON.stringify(items,null,2),'utf8');fs.renameSync(tmp,SUPPORT_DATA)}
module.exports={...module.exports,notifyUser,listUsers,setUserStatus,adjustBalance,createFeatureMatch,listFeatureMatches,getFeatureMatch,updateFeatureMatch,joinFeatureMatch,setFeatureRoom,setFeatureWinner,approveFeaturePrize,listUserFeatureMatches,listNotifications,markNotificationsRead,supportList,supportSend,adminSupport};
