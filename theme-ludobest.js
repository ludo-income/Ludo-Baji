/* User-app skin: exact Ludo Best home. Old grid only in Others tab. */
(function(){
  document.body.classList.add('lb-skin');
  const $ = (id)=>document.getElementById(id);

  function injectHome(){
    const app=document.querySelector('.app');
    if(!app) return;
    if(document.getElementById('lbHero')) return;

    const header=app.querySelector('header .head');
    if(header && !document.getElementById('lbTopActions')){
      const actions=document.createElement('div');
      actions.id='lbTopActions';
      actions.className='lb-top-actions';
      actions.innerHTML='<button type="button" class="lb-ico-btn" id="lbBell" onclick="if(typeof showNotifications===\'function\')showNotifications()">🔔<span class="lb-badge" id="lbBellCount" style="display:none">0</span></button><button type="button" class="lb-wallet-chip" id="lbChip" onclick="openWalletSkin()">🪙 <span id="lbChipBal">0</span></button>';
      header.appendChild(actions);
    }

    const wallet=app.querySelector('.wallet');
    const hero=document.createElement('div');
    hero.id='lbHero';
    hero.innerHTML=
      '<div class="heroBox">'+
        '<div class="heroArt">🎲</div>'+
        '<h1 class="heroTitle" id="lbHeroTitle">Ludo Baji</h1>'+
        '<div class="heroSub">Ludo in under 10 minutes</div>'+
      '</div>'+
      '<button type="button" class="playNow" id="lbPlayNow">Play Now</button>'+
      '<div class="seg">'+
        '<button type="button" class="on" id="segGames">🎮 Games</button>'+
        '<button type="button" id="segOthers">▦ Others</button>'+
      '</div>'+
      '<div class="gameCard" id="lbGameCard">'+
        '<div class="gcArt">🎯</div>'+
        '<div><b>Ludo Matches</b><small>REGULAR 1 VS 1</small></div>'+
        '<span class="gcCount" id="lbMatchCount">0</span>'+
      '</div>'+
      '<div id="lbOthersBox" style="display:none"></div>'+
      '<div class="tgCard" id="lbTgCard">'+
        '<div>✈️</div>'+
        '<div><b>Telegram</b><small>Get updates & latest news</small></div>'+
        '<button type="button" class="join" id="lbTgJoin">Join Now →</button>'+
      '</div>'+
      '<div class="safeBox"><div class="tick">✓</div><b>Instant withdrawals</b><div>100% safe payments</div></div>';

    if(wallet && wallet.parentNode) wallet.parentNode.insertBefore(hero, wallet);
    else app.insertBefore(hero, app.querySelector('.quick')||null);

    if(!document.getElementById('lbBottom')){
      const nav=document.createElement('div');
      nav.className='bottomNav';
      nav.id='lbBottom';
      nav.innerHTML=
        '<button type="button" class="on" id="navHome"><div class="ico">🏠</div>Home</button>'+
        '<button type="button" id="navRefer"><div class="ico">👥</div>Refer</button>'+
        '<button type="button" id="navProfile"><div class="ico">👤</div>Profile</button>';
      document.body.appendChild(nav);
    }

    bindHomeClicks();
  }

  function bindHomeClicks(){
    const play=$('lbPlayNow'); if(play) play.onclick=function(){ if(typeof showMatches==='function') showMatches(); };
    const card=$('lbGameCard'); if(card) card.onclick=function(){ if(typeof showMatches==='function') showMatches(); };
    const sg=$('segGames'); if(sg) sg.onclick=function(){ setHomeSeg('games'); };
    const so=$('segOthers'); if(so) so.onclick=function(){ setHomeSeg('others'); };
    const tg=$('lbTgJoin'); if(tg) tg.onclick=function(){ openTelegramLink(); };
    const nh=$('navHome'); if(nh) nh.onclick=function(){ goHomeTab(); };
    const nr=$('navRefer'); if(nr) nr.onclick=function(){ if(typeof showReferral==='function') showReferral(); };
    const np=$('navProfile'); if(np) np.onclick=function(){ openProfileSkin(); };
  }

  window.setHomeSeg=function(which){
    const g=$('segGames'), o=$('segOthers'), ob=$('lbOthersBox'), gc=$('lbGameCard'), tg=$('lbTgCard'), safe=document.querySelector('.safeBox');
    if(g) g.classList.toggle('on', which==='games');
    if(o) o.classList.toggle('on', which==='others');
    if(gc) gc.style.display = which==='games' ? 'flex' : 'none';
    if(ob) ob.style.display = which==='others' ? 'block' : 'none';
    if(tg) tg.style.display = which==='games' ? 'flex' : 'none';
    if(safe) safe.style.display = which==='games' ? 'block' : 'none';
    if(which==='others') fillOthersBox();
  };

  function fillOthersBox(){
    const box=$('lbOthersBox'); if(!box) return;
    box.innerHTML='';
    const list=(window.all||[]).slice().sort(function(a,b){return Number(a.order||999)-Number(b.order||999)});
    list.forEach(function(cfg){
      const id=String(cfg.id||'');
      if(id==='match'||id==='matches') return; // Games tab only
      const b=document.createElement('button');
      b.className='quickBtn';
      const fallback=cfg.icon||'📌';
      const label=cfg.button_text||cfg.name||'Option';
      b.innerHTML='<span class="quickIcon">'+(cfg.logo?'<img src="'+esc(cfg.logo)+'" alt="">':fallback)+'</span><span class="quickName">'+esc(label)+'</span><span class="quickArrow">›</span>';
      b.onclick=function(){
        if(typeof quickOpen==='function') quickOpen(cfg.id, cfg.name||'Option', fallback);
        else if(typeof window.quickOpen==='function') window.quickOpen(cfg.id, cfg.name||'Option', fallback);
      };
      box.appendChild(b);
    });
    if(!box.children.length){
      box.innerHTML='<div style="text-align:center;color:#7f97ad;padding:20px">No other options</div>';
    }
  }

  window.goHomeTab=function(){
    try{
      if(typeof closeLudoScreen==='function') closeLudoScreen();
      else {
        document.body.classList.remove('screen-open');
        const v=$('view'); if(v){ v.classList.remove('show'); v.innerHTML=''; }
      }
    }catch(e){}
    try{ if(typeof setPageState==='function') setPageState('home', true); }catch(e){}
    document.querySelectorAll('#lbBottom button').forEach(function(b){ b.classList.remove('on'); });
    const h=$('navHome'); if(h) h.classList.add('on');
    setHomeSeg('games');
    window.scrollTo(0,0);
  };

  window.openTelegramLink=function(){
    const w=window._supportWidget||{};
    const link=w.telegram||'';
    if(String(link).startsWith('http')) window.open(link,'_blank');
    else if(w.whatsapp){
      const phone=String(w.whatsapp).replace(/[^0-9]/g,'');
      window.open('https://wa.me/'+phone,'_blank');
    } else alert('Telegram লিংক এখনো সেট করা হয়নি');
  };

  window.openWalletSkin=async function(){
    if(typeof authToken==='function' && !authToken()){ if(typeof openAuth==='function') openAuth(); return; }
    if(typeof enterScreen==='function') enterScreen('wallet');
    else { document.body.classList.add('screen-open'); $('view').classList.add('show'); }
    const v=$('view');
    const g=Number(window._gamingBal||0), w=Number(window._winningBal||0), tot=g+w;
    v.innerHTML=
      '<div class="screenTop"><button class="screenBack" onclick="goHomeTab()">‹</button><div class="screenTitle">Wallet</div></div>'+
      '<div class="walletHead">'+
        '<div style="color:#68736d;font-size:12px;letter-spacing:1px">AVAILABLE BALANCE</div>'+
        '<div style="font-size:40px;font-weight:800;color:#111">'+tot.toFixed(0)+'</div>'+
        '<div style="display:inline-block;background:#111;color:#fff;border-radius:999px;padding:4px 10px;font-size:12px;margin-top:6px">Winning Balance '+w.toFixed(0)+'</div>'+
        '<div class="wActs">'+
          '<button class="wDep" onclick="openDeposit()">＋ DEPOSIT</button>'+
          '<button class="wWd" onclick="openWithdraw()">📷 WITHDRAW</button>'+
          '<button class="wGift" onclick="alert(\'Gift পরে চালু হবে\')">🎁 GIFT</button>'+
        '</div>'+
      '</div>'+
      '<div class="screenBody">'+
        '<div class="helpRow"><span>কিভাবে টাকা ডিপোজিট করবেন?</span><button type="button" onclick="if(typeof showPublicPage===\'function\')showPublicPage(\'deposit_rules\')">ভিডিও দেখুন</button></div>'+
        '<div class="helpRow"><span>কিভাবে বন্ধুকে গিফট পাঠাবেন?</span><button type="button" onclick="if(typeof showPublicPage===\'function\')showPublicPage(\'faq\')">ভিডিও দেখুন</button></div>'+
        '<h3 style="margin:16px 0 8px;color:#fff">Mini Statements</h3><div id="miniSt">Loading...</div>'+
      '</div>';
    try{
      const j=await api('/api/user/transactions');
      const rows=(j.transactions||[]).slice(0,8);
      const box=$('miniSt');
      if(!rows.length){ box.innerHTML='<div class="smallText">কোনো স্টেটমেন্ট নেই</div>'; return; }
      box.innerHTML=rows.map(function(t){
        const ch=Number(t.balance_change||0);
        const sign=ch>=0?'+':'';
        const col=ch>=0?'#16a34a':'#dc2626';
        return '<div class="txRow" style="background:#102338;color:#fff;border-color:#1c3d5a"><div class="txTop"><b>'+esc(String(t.type||'').replace(/_/g,' '))+'</b><span style="color:'+col+'">'+sign+Number(ch).toFixed(0)+'</span></div><div class="txMeta">'+(t.note?esc(t.note)+' • ':'')+esc(new Date(t.created_at).toLocaleString())+'</div></div>';
      }).join('')+'<button class="btn" style="width:100%;margin-top:10px" onclick="openStatement()">See all...</button>';
    }catch(e){ const box=$('miniSt'); if(box) box.textContent=e.message; }
  };

  window.openProfileSkin=async function(){
    if(typeof authToken==='function' && !authToken()){ if(typeof openAuth==='function') openAuth(); return; }
    document.querySelectorAll('#lbBottom button').forEach(function(b){ b.classList.remove('on'); });
    const np=$('navProfile'); if(np) np.classList.add('on');
    if(typeof enterScreen==='function') enterScreen('profile');
    else { document.body.classList.add('screen-open'); $('view').classList.add('show'); }
    const v=$('view');
    v.innerHTML=
      '<div class="profilePage">'+
        '<div class="pUser"><div class="pAv">👤</div><div style="flex:1"><b id="pfName">User</b><div class="smallText" id="pfPhone"></div><div class="smallText" id="pfEmail"></div><div class="smallText" id="pfUid"></div></div>'+
        '<button class="btn" style="background:#1d4ed8;padding:8px 10px" onclick="document.getElementById(\'profileModal\').classList.add(\'show\')">✎ Edit</button></div>'+
        '<div class="pBal"><button class="addBtn" onclick="openDeposit()">＋ ADD</button>'+
        '<div style="color:#9bb3c9;font-size:12px">AVAILABLE BALANCE</div><strong id="pfBal">BDT 0</strong>'+
        '<div style="color:#f5c400;margin-top:4px">🏆 Winning: <span id="pfWin">0</span></div>'+
        '<div class="stats3"><div><b id="pfMatches">0</b><div class="smallText">MATCHES</div></div><div><b id="pfRefers">0</b><div class="smallText">REFERS</div></div><div><b id="pfWins">0</b><div class="smallText">WINNINGS</div></div></div>'+
        '</div>'+
        '<div class="menuRow" onclick="openWalletSkin()">👛 My Wallet <span>›</span></div>'+
        '<div class="menuRow" onclick="openStatement()">📑 All Statements <span>›</span></div>'+
        '<div class="menuRow" onclick="if(typeof showLeaderboard===\'function\')showLeaderboard()">🏆 Top Players <span>›</span></div>'+
        '<div class="menuRow" onclick="shareApp()">📤 Share App <span>›</span></div>'+
        '<div class="menuRow" onclick="if(typeof showPublicPage===\'function\')showPublicPage(\'terms\')">ℹ️ Terms & Conditions <span>›</span></div>'+
        '<div class="menuRow danger" onclick="document.getElementById(\'logoutUser\').click()">Logout <span>›</span></div>'+
        '<div style="text-align:center;color:#7f97ad;margin-top:16px;font-size:12px">Version 1.0.6</div>'+
      '</div>';
    try{
      const j=await api('/api/auth/me');
      currentUser=j.user;
      if($('pfName')) $('pfName').textContent=j.user.name||'User';
      if($('pfEmail')) $('pfEmail').textContent=j.user.email||'';
      if($('pfPhone')) $('pfPhone').textContent=j.user.phone||'';
      if($('pfUid')) $('pfUid').textContent='UID: '+(j.user.user_code||j.user.id||'');
      if($('profileName')) $('profileName').value=j.user.name||'';
    }catch(e){}
    try{
      const d=await api('/api/user/dashboard');
      const g=Number(d.dashboard.gaming_balance||0), w=Number(d.dashboard.winning_balance||0);
      if($('pfBal')) $('pfBal').textContent='BDT '+(g+w).toFixed(0);
      if($('pfWin')) $('pfWin').textContent=w.toFixed(0);
    }catch(e){}
    try{
      const mine=await api('/api/user/matches/mine');
      const ms=mine.matches||[];
      if($('pfMatches')) $('pfMatches').textContent=String(ms.length);
    }catch(e){}
  };

  window.shareApp=function(){
    const url=location.origin+'/';
    if(navigator.share) navigator.share({title:'Ludo Baji',url:url}).catch(function(){});
    else { try{navigator.clipboard.writeText(url); alert('অ্যাপ লিংক কপি হয়েছে');}catch(e){ alert(url); } }
  };

  // Keep original renderQuick for data, but never show #quickGrid on home
  const oldRenderQuick=window.renderQuick;
  window.renderQuick=function(){
    if(typeof oldRenderQuick==='function') oldRenderQuick();
    const title=$('lbHeroTitle'), sn=$('siteName');
    if(title && sn) title.textContent=sn.textContent||'Ludo Baji';
    // If Others tab is open, refresh its list
    const ob=$('lbOthersBox');
    if(ob && ob.style.display!=='none') fillOthersBox();
  };

  const oldRefresh=window.refreshDashboard;
  window.refreshDashboard=async function(){
    if(typeof oldRefresh==='function') await oldRefresh();
    const chip=$('lbChipBal');
    const tot=Number(window._gamingBal||0)+Number(window._winningBal||0);
    if(chip) chip.textContent=String(Math.round(tot));
    try{
      const pub=await fetch('/api/matches?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).catch(function(){return {};});
      const n=(pub.matches||[]).filter(function(m){return String(m.status||'').toLowerCase()!=='cancelled';}).length;
      const c=$('lbMatchCount'); if(c) c.textContent=String(n||0);
    }catch(e){}
    try{
      if(typeof authToken==='function' && authToken()){
        const j=await api('/api/user/notifications');
        const unread=(j.notifications||[]).filter(function(n){return !n.read_at;}).length;
        const b=$('lbBellCount');
        if(b){ b.textContent=String(unread); b.style.display=unread?'grid':'none'; }
      }
    }catch(e){}
  };

  window.loadProfile=function(){ return openProfileSkin(); };

  injectHome();
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', injectHome);
  // Re-bind after late scripts
  setTimeout(function(){ injectHome(); bindHomeClicks(); }, 300);
})();
