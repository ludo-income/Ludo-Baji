/* User-app skin: exact Ludo Best home. Old grid only in Others tab. */
(function(){
  document.body.classList.add('lb-skin');
  window._lbReady=true;
  // Force SW update so JS/CSS fixes apply
  try{
    if('serviceWorker' in navigator){
      navigator.serviceWorker.getRegistrations().then(function(regs){
        regs.forEach(function(r){ try{ r.update(); }catch(e){} });
      });
    }
  }catch(e){}

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
        '<img class="heroLogo" src="logo-user.png" alt="Ludo Baji" onerror="this.onerror=null;this.src=\'logo-ludo-baji.jpg\'">'+
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

  
  window.lbSyncMainOptions=function(){
    try{ fillOthersBox(); }catch(e){}
  };

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

  
  function lbWalletIcon(logo, fallback){
    const s=String(logo||'');
    if(!s) return fallback;
    if(s.startsWith('http')||s.startsWith('data:')||/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(s)){
      return '<img src="'+String(s).replace(/"/g,'&quot;')+'" alt="" style="width:22px;height:22px;object-fit:contain;border-radius:6px">';
    }
    return s;
  }
  function lbActionIcon(logo, fallbackHtml, extraClass){
    const s=String(logo||'');
    if(s && (s.startsWith('http')||s.startsWith('data:')||/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(s))){
      return '<div class="ftAIco '+(extraClass||'')+'" style="padding:0;overflow:hidden;display:grid;place-items:center"><img src="'+String(s).replace(/"/g,'&quot;')+'" alt="" style="width:100%;height:100%;object-fit:cover"></div>';
    }
    if(s) return '<div class="ftAIco '+(extraClass||'')+'">'+s+'</div>';
    return '<div class="ftAIco '+(extraClass||'')+'">'+fallbackHtml+'</div>';
  }

  window.openWalletSkin=async function(){
    if(typeof authToken==='function' && !authToken()){ if(typeof openAuth==='function') openAuth('wallet'); return; }
    // Close auth modal if still open while logged in
    try{ const am=$('authModal'); if(am){ am.classList.remove('show'); am.style.display='none'; } document.body.classList.remove('auth-open'); }catch(e){}
    document.body.classList.add('screen-open');
    const v=$('view'); if(v) v.classList.add('show');
    try{ if(typeof setPageState==='function') setPageState('wallet'); }catch(e){}
    if(!window._lbNavLock){ try{ lbPush('wallet'); }catch(e){} }
    // Ensure mainOptions logos available (Admin Main Page Options)
    if(!(window.all&&window.all.length) && !(window._siteCache&&window._siteCache.mainOptions)){
      try{
        const r=await fetch('/api/site?t='+Date.now(),{cache:'no-store'});
        const d=await r.json();
        window._siteCache=d;
        window.all=(d.mainOptions||[]).filter(x=>x.visible!==false);
        if(d.walletUi) window._walletUi=d.walletUi;
      }catch(e){}
    }
    if(!window._walletUi){
      try{
        if(window._siteCache && window._siteCache.walletUi){ window._walletUi=window._siteCache.walletUi; }
        else {
          const r=await fetch('/api/wallet-ui');
          if(r.ok){ const j=await r.json().catch(()=>({})); if(j&&j.walletUi) window._walletUi=j.walletUi; }
        }
      }catch(e){}
    }
    const g=Number(window._gamingBal||0), w=Number(window._winningBal||0), tot=g+w;
    function optLogo(id){
      try{
        const list=(window._siteCache&&window._siteCache.mainOptions)||window.all||[];
        const o=(list||[]).find(x=>String(x.id)===String(id));
        if(o&&o.logo) return String(o.logo);
        // also check icon if looks like image
        if(o&&o.icon&&(String(o.icon).startsWith('data:')||String(o.icon).startsWith('http'))) return String(o.icon);
      }catch(e){}
      return '';
    }
    const wu=window._walletUi||{};
    const dLogo=optLogo('deposit')||wu.deposit_logo||'';
    const wLogo=optLogo('withdraw')||wu.withdraw_logo||'';
    const sLogo=optLogo('statement')||wu.statement_logo||'';
    const dIco=lbWalletIcon(dLogo,'↓');
    const wIco=lbWalletIcon(wLogo,'↑');
    const sIco=lbWalletIcon(sLogo,'≡');
    const dQ=lbActionIcon(wu.deposit_quick_logo||dLogo,'＋','dep');
    const wQ=lbActionIcon(wu.withdraw_quick_logo||wLogo,'↑','wd');
    const sQ=lbActionIcon(wu.statement_quick_logo||sLogo,'☰','st');
    v.innerHTML=
      '<div class="ftPage">'+
        '<div class="ftTop"><button type="button" class="ftBack" onclick="lbBack()">‹</button><div class="ftTitle">Wallet</div><div style="width:40px"></div></div>'+
        '<div class="ftBalanceCard">'+
          '<div class="ftBalLabel">Available balance</div>'+
          '<div class="ftBalAmount">৳ '+tot.toFixed(0)+'</div>'+
          '<div class="ftBalSub">Gaming ৳'+g.toFixed(0)+'  ·  Winning ৳'+w.toFixed(0)+'</div>'+
          '<div class="ftQuick">'+
            '<button type="button" class="ftQBtn" onclick="openDeposit()"><span class="ftQIco">'+dIco+'</span>Deposit</button>'+
            '<button type="button" class="ftQBtn" onclick="openWithdraw()"><span class="ftQIco">'+wIco+'</span>Withdraw</button>'+
            '<button type="button" class="ftQBtn" onclick="openStatement()"><span class="ftQIco">'+sIco+'</span>Statement</button>'+
          '</div>'+
        '</div>'+
        '<div class="ftSection">'+
          '<div class="ftSecTitle">Quick actions</div>'+
          '<div class="ftActionRow" onclick="openDeposit()">'+dQ+'<div class="ftATxt"><b>Deposit</b><small>bKash / Nagad</small></div><span class="ftChevron">›</span></div>'+
          '<div class="ftActionRow" onclick="openWithdraw()">'+wQ+'<div class="ftATxt"><b>Withdraw</b><small>Winning balance</small></div><span class="ftChevron">›</span></div>'+
          '<div class="ftActionRow" onclick="openStatement()">'+sQ+'<div class="ftATxt"><b>All Statements</b><small>Transaction history</small></div><span class="ftChevron">›</span></div>'+
        '</div>'+
        '<div class="ftSection">'+
          '<div class="ftSecTitle">Recent</div>'+
          '<div id="miniSt" class="ftTxList">Loading...</div>'+
        '</div>'+
      '</div>';
    try{
      const j=await api('/api/user/transactions');
      const rows=(j.transactions||[]).slice(0,8);
      const box=$('miniSt');
      if(!rows.length){ box.innerHTML='<div class="ftEmpty">কোনো স্টেটমেন্ট নেই</div>'; return; }
      box.innerHTML=rows.map(function(t){
        const ch=Number(t.balance_change||0);
        const sign=ch>=0?'+':'';
        const col=ch>=0?'#16a34a':'#ef4444';
        return '<div class="ftTx"><div><b>'+esc(String(t.type||'').replace(/_/g,' '))+'</b><small>'+esc(new Date(t.created_at).toLocaleString())+'</small></div><span style="color:'+col+'">'+sign+'৳'+Math.abs(Number(ch)).toFixed(0)+'</span></div>';
      }).join('')+'<button type="button" class="ftPrimaryBtn" onclick="openStatement()">See all statements</button>';
    }catch(e){ const box=$('miniSt'); if(box) box.textContent=e.message; }
  };

  window.openProfileSkin=async function(){
    if(typeof authToken==='function' && !authToken()){ if(typeof openAuth==='function') openAuth(); return; }
    document.querySelectorAll('#lbBottom button').forEach(function(b){ b.classList.remove('on'); });
    const np=$('navProfile'); if(np) np.classList.add('on');
    // close any old modal so it never stacks behind
    try{
      const pm=document.getElementById('profileModal');
      if(pm){ pm.classList.remove('show'); pm.style.display='none'; }
    }catch(e){}
    document.body.classList.add('screen-open');
    const v=$('view'); if(v) v.classList.add('show');
    if(!window._lbNavLock){ try{ lbPush('profile'); }catch(e){} }
    try{ if(typeof setPageState==='function') setPageState('profile'); }catch(e){}
    try{ const am=$('authModal'); if(am){ am.classList.remove('show'); am.style.display='none'; } document.body.classList.remove('auth-open'); }catch(e){}
    function pfOptLogo(id, fb){
      try{
        const list=(window._siteCache&&window._siteCache.mainOptions)||window.all||[];
        const o=(list||[]).find(x=>String(x.id)===String(id));
        const lg=o&&o.logo?String(o.logo):'';
        if(lg) return lbWalletIcon(lg, fb);
      }catch(e){}
      return fb;
    }
    const pfDep=pfOptLogo('deposit','↓');
    const pfWd=pfOptLogo('withdraw','↑');
    v.innerHTML=
      '<div class="ftPage">'+
        '<div class="ftProfileHero">'+
          '<button type="button" class="ftBack light" onclick="lbBack()">‹</button>'+
          '<div class="ftHeroAv">👤</div>'+
          '<div class="ftHeroName" id="pfName">User</div>'+
          '<div class="ftHeroMail" id="pfEmail"></div>'+
          '<div class="ftHeroUid" id="pfUid"></div>'+
          '<button type="button" class="ftEditPill" id="pfEditBtn">✎ Edit</button>'+
        '</div>'+
        '<div id="pfEditBox" class="ftEditBox" style="display:none">'+
          '<label>নাম</label>'+
          '<input id="pfEditName" maxlength="60" placeholder="আপনার নাম">'+
          '<div class="ftEditActions">'+
            '<button type="button" class="ftPrimaryBtn" id="pfSaveBtn">Save</button>'+
            '<button type="button" class="ftGhostBtn" id="pfCancelBtn">Cancel</button>'+
          '</div>'+
          '<div id="pfEditMsg" class="ftMsg"></div>'+
        '</div>'+
        '<div class="ftBalanceCard sm">'+
          '<div class="ftBalLabel">Available balance</div>'+
          '<div class="ftBalAmount" id="pfBal">৳ 0</div>'+
          '<div class="ftBalSub">Winning <span id="pfWin">0</span></div>'+
          '<div class="ftQuick">'+
            '<button type="button" class="ftQBtn" onclick="openDeposit()"><span class="ftQIco">'+pfDep+'</span>Deposit</button>'+
            '<button type="button" class="ftQBtn" onclick="openWithdraw()"><span class="ftQIco">'+pfWd+'</span>Withdraw</button>'+
            '<button type="button" class="ftQBtn" onclick="openWalletSkin()"><span class="ftQIco">👛</span>Wallet</button>'+
          '</div>'+
          '<div class="ftStats">'+
            '<div><b id="pfMatches">0</b><span>Matches</span></div>'+
            '<div><b id="pfRefers">0</b><span>Refers</span></div>'+
            '<div><b id="pfWins">0</b><span>Wins</span></div>'+
          '</div>'+
        '</div>'+
        '<div class="ftSection">'+
          '<div class="ftSecTitle">Account</div>'+
          '<div class="ftActionRow" onclick="openWalletSkin()"><div class="ftAIco wal">👛</div><div class="ftATxt"><b>My Wallet</b><small>Balance & history</small></div><span class="ftChevron">›</span></div>'+
          '<div class="ftActionRow" onclick="openStatement()"><div class="ftAIco st">☰</div><div class="ftATxt"><b>All Statements</b><small>Transactions</small></div><span class="ftChevron">›</span></div>'+
          '<div class="ftActionRow" onclick="if(typeof showLeaderboard===\'function\')showLeaderboard()"><div class="ftAIco top">🏆</div><div class="ftATxt"><b>Top Players</b><small>Leaderboard</small></div><span class="ftChevron">›</span></div>'+
        '</div>'+
        '<div class="ftSection">'+
          '<div class="ftSecTitle">More</div>'+
          '<div class="ftActionRow" onclick="shareApp()"><div class="ftAIco share">↗</div><div class="ftATxt"><b>Share App</b><small>Invite friends</small></div><span class="ftChevron">›</span></div>'+
          '<div class="ftActionRow" onclick="if(typeof showPublicPage===\'function\')showPublicPage(\'terms\')"><div class="ftAIco info">ℹ</div><div class="ftATxt"><b>Terms & Conditions</b><small>Rules</small></div><span class="ftChevron">›</span></div>'+
          '<div class="ftActionRow danger" id="pfLogoutBtn"><div class="ftAIco out">⎋</div><div class="ftATxt"><b>Logout</b><small>Sign out</small></div><span class="ftChevron">›</span></div>'+
        '</div>'+
        '<div class="ftVersion">Version 1.0.6</div>'+
        '<div class="smallText" id="pfPhone" style="display:none"></div>'+
      '</div>';

    // Edit toggle (inline — no old modal)
    const editBtn=$('pfEditBtn'), editBox=$('pfEditBox'), editName=$('pfEditName');
    if(editBtn) editBtn.onclick=function(){
      if(!editBox) return;
      const open=editBox.style.display!=='none';
      editBox.style.display=open?'none':'block';
      if(!open && editName) editName.value=($('pfName')&&$('pfName').textContent)||'';
      const msg=$('pfEditMsg'); if(msg) msg.textContent='';
    };
    const cancelBtn=$('pfCancelBtn');
    if(cancelBtn) cancelBtn.onclick=function(){ if(editBox) editBox.style.display='none'; };
    const saveBtn=$('pfSaveBtn');
    if(saveBtn) saveBtn.onclick=async function(){
      const msg=$('pfEditMsg');
      try{
        const name=(editName&&editName.value||'').trim();
        if(!name){ if(msg){ msg.style.color='#f87171'; msg.textContent='নাম লিখুন'; } return; }
        const j=await api('/api/auth/profile',{method:'PUT',body:JSON.stringify({name:name})});
        currentUser=j.user;
        if($('pfName')) $('pfName').textContent=j.user.name||name;
        if(msg){ msg.style.color='#4ade80'; msg.textContent='Profile saved'; }
        setTimeout(function(){ if(editBox) editBox.style.display='none'; }, 700);
      }catch(e){
        if(msg){ msg.style.color='#f87171'; msg.textContent=e.message||'Save failed'; }
      }
    };
    const logoutBtn=$('pfLogoutBtn');
    if(logoutBtn) logoutBtn.onclick=function(){
      try{ localStorage.removeItem('ludo_user_token'); }catch(e){}
      currentUser=null;
      try{ if(typeof setSessionUI==='function') setSessionUI(false); else document.body.classList.add('logged-out'); }catch(e){}
      try{ if(typeof setPageState==='function') setPageState('home'); }catch(e){}
      try{ if(typeof renderQuick==='function') renderQuick(); }catch(e){}
      try{
        const pm=document.getElementById('profileModal');
        if(pm){ pm.classList.remove('show'); pm.style.display='none'; }
      }catch(e){}
      goHomeTab();
      if(typeof openAuth==='function') openAuth();
    };

    try{
      const j=await api('/api/auth/me');
      currentUser=j.user;
      if($('pfName')) $('pfName').textContent=j.user.name||'User';
      if($('pfEmail')) $('pfEmail').textContent=j.user.email||'';
      if($('pfPhone')) $('pfPhone').textContent=j.user.phone||'';
      if($('pfUid')) $('pfUid').textContent='UID: '+(j.user.user_code||j.user.id||'');
      if(editName) editName.value=j.user.name||'';
    }catch(e){}
    try{
      const d=await api('/api/user/dashboard');
      const g=Number(d.dashboard.gaming_balance||0), w=Number(d.dashboard.winning_balance||0);
      if($('pfBal')) $('pfBal').textContent='৳ '+(g+w).toFixed(0);
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

  /* ---- Screen stack + step-by-step mobile back ---- */
  window._lbStack = [];
  window._lbNavLock = false;

  function lbOpenScreen(){
    document.body.classList.add('screen-open');
    const v=$('view'); if(v){ v.classList.add('show'); }
  }

  function lbPush(name){
    if(window._lbNavLock) return;
    const n = name || 'screen';
    // avoid duplicate top
    if(window._lbStack.length && window._lbStack[window._lbStack.length-1] === n) return;
    window._lbStack.push(n);
    try{
      history.pushState({lb:1, n:n, i:window._lbStack.length}, '', location.pathname + location.search + '#' + encodeURIComponent(n));
    }catch(e){}
  }

  function lbRestore(name){
    window._lbNavLock = true;
    try{
      if(name === 'profile' && typeof openProfileSkin === 'function') openProfileSkin();
      else if(name === 'wallet' && typeof openWalletSkin === 'function') openWalletSkin();
      else if(name === 'showMatches' || name === 'match' || name === 'matches'){
        if(typeof showMatches === 'function') showMatches();
      }
      else if(name === 'showMyMatches' || name === 'mymatch'){
        if(typeof showMyMatches === 'function') showMyMatches();
      }
      else if(name === 'showNotifications' || name === 'notifications'){
        if(typeof showNotifications === 'function') showNotifications();
      }
      else if(name === 'showReferral' || name === 'referral'){
        if(typeof showReferral === 'function') showReferral();
      }
      else if(name === 'showLeaderboard' || name === 'leaderboard'){
        if(typeof showLeaderboard === 'function') showLeaderboard();
      }
      else if(name === 'openDeposit' || name === 'deposit'){
        if(typeof openDeposit === 'function') openDeposit();
      }
      else if(name === 'openWithdraw' || name === 'withdraw'){
        if(typeof openWithdraw === 'function') openWithdraw();
      }
      else if(name === 'openStatement' || name === 'statement'){
        if(typeof openStatement === 'function') openStatement();
      }
      else {
        // unknown → home
        lbGoHome(true);
      }
    }finally{
      setTimeout(function(){ window._lbNavLock = false; }, 80);
    }
  }

  function lbGoHome(fromPop){
    window._lbStack = [];
    if(!fromPop){
      try{ history.replaceState({lb:0, n:'home'}, '', location.pathname + location.search); }catch(e){}
    }
    // Never show Login when going home via Back — keep session
    try{
      const am=$('authModal');
      if(am){ am.classList.remove('show'); am.style.display='none'; am.style.visibility='hidden'; }
      document.body.classList.remove('auth-open');
      if(typeof authToken==='function' && authToken()){
        document.body.classList.remove('logged-out');
        document.documentElement.classList.add('has-session');
      }
    }catch(e){}
    document.body.classList.remove('screen-open');
    const v=$('view'); if(v){ v.classList.remove('show'); v.innerHTML=''; }
    try{ if(typeof setPageState==='function') setPageState('home', true); }catch(e){}
    document.querySelectorAll('#lbBottom button').forEach(function(b){ b.classList.remove('on'); });
    const h=$('navHome'); if(h) h.classList.add('on');
    try{ setHomeSeg('games'); }catch(e){}
    window.scrollTo(0,0);
  }

  // Step back one screen (for on-screen ‹ buttons)
  window.lbBack = function(){
    // Prefer in-app stack; avoid leaving the PWA/app on hardware/UI back
    if(window._lbStack.length >= 1){
      window._lbNavLock = true;
      try{
        window._lbStack.pop();
        if(window._lbStack.length === 0){
          lbGoHome(true);
          try{ history.replaceState({lb:1,n:'home',i:0},'',location.pathname+location.search); }catch(e){}
        } else {
          const prev = window._lbStack[window._lbStack.length-1];
          lbRestore(prev);
          try{ history.replaceState({lb:1,n:prev,i:window._lbStack.length},'',location.pathname+location.search+'#'+encodeURIComponent(prev)); }catch(e){}
        }
      } finally {
        setTimeout(function(){ window._lbNavLock=false; }, 50);
      }
      return;
    }
    lbGoHome(false);
  };

  // Bottom nav Home = always full home
  window.goHomeTab = function(){
    lbGoHome(false);
  };

  window.addEventListener('popstate', function(ev){
    if(window._lbNavLock) return;
    // Auth modal first — just close it, do NOT logout
    const am=$('authModal');
    if(am && (am.classList.contains('show') || (am.style.display && am.style.display!=='none'))){
      try{ am.classList.remove('show'); am.style.display='none'; am.style.visibility='hidden'; }catch(e){}
      document.body.classList.remove('auth-open');
      try{
        if(typeof authToken==='function' && authToken()){
          document.body.classList.remove('logged-out');
          document.documentElement.classList.add('has-session');
        }
      }catch(e){}
      // stay in app on home
      try{ history.pushState({lb:1,n:'home',i:0},'',location.pathname+location.search); }catch(e){}
      lbGoHome(true);
      return;
    }

    if(window._lbStack.length === 0){
      lbGoHome(true);
      // trap: push home so continuous back stays in app
      try{ history.pushState({lb:1,n:'home',i:0},'',location.pathname+location.search); }catch(e){}
      return;
    }

    // step back one level
    window._lbStack.pop();

    if(window._lbStack.length === 0){
      lbGoHome(true);
      try{ history.pushState({lb:1,n:'home',i:0},'',location.pathname+location.search); }catch(e){}
      return;
    }

    // restore previous screen
    const prev = window._lbStack[window._lbStack.length - 1];
    lbRestore(prev);
  });

  /* Auth open → hide bottom nav */
  function syncAuthClass(){
    const am=$('authModal');
    const open = !!(am && (am.classList.contains('show') || getComputedStyle(am).display!=='none' && am.style.display!=='none' && am.classList.contains('show')));
    // more reliable check
    let isAuth=false;
    try{
      if(am){
        const s=getComputedStyle(am);
        isAuth = am.classList.contains('show') || (s.display!=='none' && s.visibility!=='hidden' && parseFloat(s.opacity||'1')>0.1 && am.querySelector('.card, .modal-card, form, input'));
      }
    }catch(e){}
    document.body.classList.toggle('auth-open', isAuth || (am && am.classList.contains('show')));
  }
  // MutationObserver on auth modal
  function watchAuth(){
    const am=$('authModal');
    if(!am) return;
    const mo=new MutationObserver(function(){ syncAuthClass(); });
    mo.observe(am, {attributes:true, attributeFilter:['class','style']});
    // also intercept openAuth/close
    const _oa=window.openAuth;
    if(typeof _oa==='function'){
      window.openAuth=function(){
        try{
          if(typeof authToken==='function' && authToken()){
            // logged in — do not mark auth-open
            return _oa.apply(this, arguments);
          }
        }catch(e){}
        document.body.classList.add('auth-open');
        const r=_oa.apply(this, arguments);
        setTimeout(syncAuthClass, 50);
        return r;
      };
    }
    const closeBtn=$('closeAuth');
    if(closeBtn){
      closeBtn.addEventListener('click', function(){
        document.body.classList.remove('auth-open');
      });
    }
  }

  // Push history when opening common screens (once, no double)
  const wrapPush = function(fnName){
    const old=window[fnName];
    if(typeof old!=='function' || old._lbWrapped) return;
    const wrapped=function(){
      if(!window._lbNavLock){
        lbOpenScreen();
        lbPush(fnName);
      } else {
        lbOpenScreen();
      }
      return old.apply(this, arguments);
    };
    wrapped._lbWrapped = true;
    window[fnName]=wrapped;
  };
  setTimeout(function(){
    ['showMatches','showMyMatches','showNotifications','showReferral','showLeaderboard','openDeposit','openWithdraw','openStatement'].forEach(wrapPush);
    // Also hook closeLudoScreen ‹ buttons in match pages to step back
    const _cls = window.closeLudoScreen;
    if(typeof _cls==='function' && !_cls._lbWrapped){
      window.closeLudoScreen = function(){
        if(window._lbStack.length >= 1){ window.lbBack(); return; }
        return _cls.apply(this, arguments);
      };
      window.closeLudoScreen._lbWrapped = true;
    }
    watchAuth();
    syncAuthClass();
  }, 400);

  // periodic sync for auth class (cheap)
  setInterval(function(){
    const am=$('authModal');
    if(am && am.classList.contains('show')) document.body.classList.add('auth-open');
    else if(am && !am.classList.contains('show')) document.body.classList.remove('auth-open');
  }, 500);

  // Apply skin immediately so base UI never flashes on refresh
  try{ injectHome(); }catch(e){}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ try{injectHome();}catch(e){} });
  setTimeout(function(){ try{injectHome(); bindHomeClicks(); watchAuth();}catch(e){} }, 100);
  setTimeout(function(){ try{injectHome();}catch(e){} }, 400);
})();

