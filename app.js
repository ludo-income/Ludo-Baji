// ========== Data ==========
const matchesData = [
  {
    id: 1,
    title: "Special Match~~~~~1",
    time: "No Fixed Time",
    game: "Ludo King",
    type: "CLASSIC",
    warn: "সিট ফুল হলে ক্রম অ্যাডজাস্ট দেওয়া হবে",
    prize: 6000,
    fee: 3300,
    players: "0/2",
    need: "2 Players Need"
  },
  {
    id: 2,
    title: "Special Match~~~~~2",
    time: "No Fixed Time",
    game: "Ludo King",
    type: "CLASSIC",
    warn: "সিট ফুল হলে ক্রম অ্যাডজাস্ট দেওয়া হবে",
    prize: 4000,
    fee: 2200,
    players: "0/2",
    need: "2 Players Need"
  },
  {
    id: 3,
    title: "Special Match~~~~~3",
    time: "No Fixed Time",
    game: "Ludo King",
    type: "CLASSIC",
    warn: "সিট ফুল হলে ক্রম অ্যাডজাস্ট দেওয়া হবে",
    prize: 4000,
    fee: 2200,
    players: "0/2",
    need: "2 Players Need"
  },
  {
    id: 4,
    title: "Special Match~~~~~4",
    time: "No Fixed Time",
    game: "Ludo King",
    type: "CLASSIC",
    warn: "সিট ফুল হলে ক্রম অ্যাডজাস্ট দেওয়া হবে",
    prize: 3000,
    fee: 1650,
    players: "0/2",
    need: "2 Players Need"
  },
  {
    id: 5,
    title: "Special Match~~~~~5",
    time: "No Fixed Time",
    game: "Ludo King",
    type: "CLASSIC",
    warn: "সিট ফুল হলে ক্রম অ্যাডজাস্ট দেওয়া হবে",
    prize: 2000,
    fee: 1100,
    players: "0/2",
    need: "2 Players Need"
  }
];

// ========== State ==========
let currentScreen = 'home';
let userData = {
  name: 'Rakib Ahmed',
  phone: '+8801301470686',
  email: '7t5rakibrana@gmail.com',
  uid: '39394',
  balance: 0,
  winning: 0,
  matches: 35,
  refers: 1,
  winnings: 1315,
  refCode: '12965014',
  totalEarn: 5
};

// ========== Navigation ==========
function showScreen(screenId) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  
  // Show target
  const target = document.getElementById('screen-' + screenId);
  if (target) {
    target.classList.add('active');
    currentScreen = screenId;
  }

  // Update bottom nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.screen === screenId) {
      item.classList.add('active');
    }
  });

  // Special handling
  if (screenId === 'matches') {
    renderMatches();
  }
  if (screenId === 'home') {
    // reset tabs if needed
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// ========== Tabs (Home) ==========
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById('tab-' + tabName).classList.add('active');
}

// ========== Matches ==========
function renderMatches() {
  const container = document.getElementById('matchesList');
  container.innerHTML = matchesData.map(m => `
    <div class="match-item">
      <div class="mi-header">
        <span class="mi-dice">🎲</span>
        <span class="mi-title">${m.title}</span>
        <span class="mi-time">⏱ ${m.time}</span>
      </div>
      <div class="mi-tags">
        <span class="tag tag-game">Game: ${m.game}</span>
        <span class="tag tag-type">Type: ${m.type}</span>
        <span class="tag tag-warn">${m.warn}</span>
      </div>
      <div class="mi-body">
        <div class="mi-prize">
          <div class="mi-label">WINNING PRIZE</div>
          <div class="mi-val prize">${m.prize}</div>
        </div>
        <div class="mi-fee">
          <div class="mi-label">ENTRY FEE</div>
          <div class="mi-val fee">${m.fee}</div>
        </div>
        <button class="btn-join-match" onclick="joinMatch(${m.id}, ${m.fee})">JOIN</button>
      </div>
      <div class="mi-players">${m.need} • ${m.players}</div>
    </div>
  `).join('');
}

function joinMatch(id, fee) {
  if (userData.balance < fee) {
    alert(`❌ পর্যাপ্ত ব্যালেন্স নেই!\n\nEntry Fee: ${fee} BDT\nআপনার ব্যালেন্স: ${userData.balance} BDT\n\nদয়া করে Add Money করুন।`);
    return;
  }
  if (confirm(`Match #${id} জয়েন করতে চান?\nEntry Fee: ${fee} BDT`)) {
    userData.balance -= fee;
    userData.matches += 1;
    updateUI();
    alert(`✅ সফলভাবে Join হয়েছে!\nMatch #${id}\nবাকি ব্যালেন্স: ${userData.balance} BDT`);
  }
}

// ========== Referral ==========
function copyRef() {
  const code = userData.refCode;
  navigator.clipboard.writeText(code).then(() => {
    alert('✅ রেফারেল কোড কপি হয়েছে: ' + code);
  }).catch(() => {
    // fallback
    const el = document.createElement('textarea');
    el.value = code;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert('✅ রেফারেল কোড কপি হয়েছে: ' + code);
  });
}

function shareWhatsApp() {
  const text = encodeURIComponent(
    `🎮 Ludo Best এ জয়েন করুন!\n\nআমার রেফারেল কোড ব্যবহার করুন: ${userData.refCode}\n\n৫ টাকা ইনস্ট্যান্ট বোনাস পাবেন!\n\nডাউনলোড লিংক: https://ludobest.app`
  );
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

function openTelegram() {
  window.open('https://t.me/ludobest', '_blank');
}

// ========== Profile ==========
function editProfile() {
  const newName = prompt('নতুন নাম লিখুন:', userData.name);
  if (newName && newName.trim()) {
    userData.name = newName.trim();
    document.getElementById('userName').textContent = userData.name;
  }
}

function showAddMoney() {
  const amount = prompt('কত টাকা অ্যাড করতে চান? (BDT)', '100');
  if (amount && !isNaN(amount) && Number(amount) > 0) {
    userData.balance += Number(amount);
    updateUI();
    alert(`✅ ${amount} BDT সফলভাবে অ্যাড হয়েছে!\nনতুন ব্যালেন্স: ${userData.balance} BDT`);
  }
}

function shareApp() {
  const text = encodeURIComponent('Ludo Best - Best Ludo App! Download now: https://ludobest.app');
  if (navigator.share) {
    navigator.share({ title: 'Ludo Best', text: 'Best Ludo App', url: 'https://ludobest.app' });
  } else {
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }
}

function logout() {
  if (confirm('আপনি কি লগআউট করতে চান?')) {
    alert('লগআউট সফল। আবার লগইন করুন।');
    // In real app would clear session
  }
}

function joinFree() {
  alert('✅ Free Tournament এ Join হয়েছে!\nঅপেক্ষা করুন অন্য প্লেয়ারের জন্য...');
}

// ========== Update UI ==========
function updateUI() {
  document.getElementById('balance').textContent = userData.balance;
  document.getElementById('winning').textContent = userData.winning;
  document.getElementById('matchesCount').textContent = userData.matches;
  document.getElementById('refersCount').textContent = userData.refers;
  document.getElementById('winningsCount').textContent = userData.winnings;
  document.getElementById('totalRefers').textContent = userData.refers;
  document.getElementById('totalEarn').textContent = userData.totalEarn;
  document.getElementById('homeCoin').textContent = userData.balance;
  
  // Update all coin displays
  document.querySelectorAll('.coin span').forEach(el => {
    if (el.id !== 'homeCoin') el.textContent = userData.balance;
  });
}

// ========== Time ==========
function updateTime() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  document.getElementById('statusTime').textContent = `${h}:${m}`;
}

// ========== Init ==========
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  updateTime();
  setInterval(updateTime, 30000);
  
  // Filter tabs click
  document.querySelectorAll('.ftab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  document.querySelectorAll('.ttab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ttab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
});
