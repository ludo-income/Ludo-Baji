/* User-app skin: exact Ludo Best home. Old grid only in Others tab. */
(function(){
  document.body.classList.add('lb-skin');
  window._lbReady=true;
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
        '<img class="gcCover" src="ludo-match-cover.jpg" alt="" decoding="async">'+
        '<div class="gcShade"></div>'+
        '<div class="gcArt" id="lbMatchArt">'+(function(){try{var L=localStorage.getItem('lb_match_logo');if(L&&L.length>4)return '<img src="'+L.replace(/"/g,'&quot;')+'" alt="">';}catch(e){}return '<img src="ludo-match-cover.jpg" alt="">';})()+'</div>'+
        '<div class="gcText"><b id="lbMatchTitle">Ludo Matches</b><small id="lbMatchSub">REGULAR 1 VS 1</small></div>'+
        '<span class="gcCount" id="lbMatchCount">'+(function(){try{var n=sessionStorage.getItem('lb_match_count');if(n!=null&&n!=='')return String(n)}catch(e){}return '0'}())+'</span>'+
      '</div>'+
      '<div id="lbOthersBox" style="display:none"></div>'+
      '<div class="tgCard" id="lbTgCard">'+
        '<div class="tgIco">'+
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>'+
        '</div>'+
        '<div><b>Telegram</b><small>Get updates & latest news</small></div>'+
        '<button type="button" class="join" id="lbTgJoin">Join Now →</button>'+
      '</div>'+
      '<div class="safeBox">'+
        '<div class="tick">'+
          '<svg viewBox="0 0 24 24" width="34" height="34" fill="none">'+
            '<path d="M12 2.5L4.5 5.2v6.3c0 4.9 3.3 9.5 7.5 10.6 4.2-1.1 7.5-5.7 7.5-10.6V5.2L12 2.5z" fill="#fff"/>'+
            '<path d="M10.6 14.8l-2.7-2.7 1.2-1.2 1.5 1.5 3.9-3.9 1.2 1.2-5.1 5.1z" fill="#16a34a"/>'+
          '</svg>'+
        '</div>'+
        '<b>Instant withdrawals</b>'+
        '<div>100% safe payments</div>'+
      '</div>';

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
    try{ if(typeof window.applyMatchCardLogo==='function') window.applyMatchCardLogo(); }catch(e){}
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


  // Apply Admin logo to left thumb; cover image always stays as card background.
  // Never show target/emoji flash. Cache logo in localStorage for instant next paint.
  window.applyMatchCardLogo = function(){
    try{
      const list = (window._siteCache && window._siteCache.mainOptions) || window.all || [];
      const o = (list||[]).find(function(x){ return String(x.id)==='match' || String(x.id)==='matches'; });
      const art = document.getElementById('lbMatchArt');
      const title = document.getElementById('lbMatchTitle');
      const sub = document.getElementById('lbMatchSub');
      const defaultCover = 'ludo-match-cover.jpg';
      function setArtImg(src){
        if(!art) return;
        art.innerHTML = '<img src="'+String(src).replace(/"/g,'&quot;')+'" alt="" onerror="this.onerror=null;this.src=\''+defaultCover+'\'">';
      }
      if(o){
        const logo = o.logo ? String(o.logo).trim() : '';
        const isImg = logo && (logo.indexOf('data:')===0 || logo.indexOf('http')===0 || logo.indexOf('/')===0 || /\.(gif|png|jpe?g|webp|svg)(\?|$)/i.test(logo));
        if(isImg){
          setArtImg(logo);
          try{ localStorage.setItem('lb_match_logo', logo); }catch(e){}
        } else {
          // no admin image logo — use cached logo if any, else cover (never emoji)
          var cached='';
          try{ cached=localStorage.getItem('lb_match_logo')||''; }catch(e){}
          setArtImg(cached && cached.length>4 ? cached : defaultCover);
        }
        if(title && o.name) title.textContent = o.name;
        if(sub){
          const s = o.short_name || 'REGULAR 1 VS 1';
          var ss=String(s);
          // avoid dumping long content into subtitle
          if(ss.length>40 || /content|system|এখানে/i.test(ss)) ss='REGULAR 1 VS 1';
          sub.textContent = ss;
        }
        const card = document.getElementById('lbGameCard');
        if(card && o.visible === false) card.style.display = 'none';
      } else if(art){
        var cached2='';
        try{ cached2=localStorage.getItem('lb_match_logo')||''; }catch(e){}
        setArtImg(cached2 && cached2.length>4 ? cached2 : defaultCover);
      }
    }catch(e){ console.warn('applyMatchCardLogo', e); }
  };

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
    try{
      const pm=document.getElementById('profileModal');
      if(pm){ pm.classList.remove('show'); pm.style.display='none'; }
    }catch(e){}
    document.body.classList.add('screen-open');
    const v=$('view'); if(v) v.classList.add('show');
    if(!window._lbNavLock){ try{ lbPush('profile'); }catch(e){} }
    try{ if(typeof setPageState==='function') setPageState('profile'); }catch(e){}
    try{ const am=$('authModal'); if(am){ am.classList.remove('show'); am.style.display='none'; } document.body.classList.remove('auth-open'); }catch(e){}

    function money(n){ return '৳ '+Number(n||0).toFixed(2); }
    function esc(s){ return String(s??'').replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}); }

    v.innerHTML=
      '<div class="npPage">'+
        '<div class="npTop">'+
          '<button type="button" class="npBack" onclick="lbBack()">‹</button>'+
          '<div class="npTitle">Profile</div>'+
          '<div class="npTopRight">'+
            '<button type="button" class="npIconBtn" onclick="typeof showNotifications===\'function\'&&showNotifications()">🔔</button>'+
          '</div>'+
        '</div>'+
        '<div class="npHero">'+
          '<div class="npAvWrap"><div class="npAv">👤</div></div>'+
          '<div class="npHeroInfo">'+
            '<div class="npNameRow"><span id="npName">User</span> <span class="npCrown">👑</span></div>'+
            '<div class="npIdRow">ID: <b id="npUid">—</b> <span class="npVerified">✓ Verified</span></div>'+
            '<div class="npPhoneRow" id="npPhoneRow">📱 <span id="npPhone">—</span></div>'+
            '<div class="npMailRow" id="npMail">—</div>'+
            '<div class="npTag">Play · Win · Be a Legend</div>'+
          '</div>'+
          '<button type="button" class="npEditBtn" id="npEditBtn">✎ Edit Profile</button>'+
        '</div>'+
        '<div id="npEditBox" class="npEditBox" style="display:none">'+
          '<label>নাম</label><input id="npEditName" maxlength="60" placeholder="আপনার নাম">'+
          '<div class="npEditActions">'+
            '<button type="button" class="npSave" id="npSaveBtn">Save</button>'+
            '<button type="button" class="npCancel" id="npCancelBtn">Cancel</button>'+
          '</div>'+
          '<div id="npEditMsg" class="npMsg"></div>'+
        '</div>'+
        '<div class="npStats">'+
          '<div class="npStat"><div class="npStatIco blue">💰</div><small>Total Balance</small><b id="npBal">৳ 0.00</b></div>'+
          '<div class="npStat"><div class="npStatIco green">⬇️</div><small>Total Deposit</small><b id="npDep">৳ 0.00</b></div>'+
          '<div class="npStat"><div class="npStatIco purple">⬆️</div><small>Total Withdraw</small><b id="npWd">৳ 0.00</b></div>'+
          '<div class="npStat"><div class="npStatIco orange">🎁</div><small>Winning</small><b id="npWin">৳ 0.00</b></div>'+
        '</div>'+
        '<div class="npMenu">'+
          '<button type="button" class="npItem" id="npPersonal">'+
            '<span class="npItemIco" style="background:#2563eb">👤</span>'+
            '<span class="npItemTxt"><b>Personal Information</b><small>Name, Email, Phone, UID</small></span><span class="npChev">›</span>'+
          '</button>'+
          '<div id="npPersonalBox" class="npSubBox" style="display:none">'+
            '<div class="npSubRow"><span>নাম</span><b id="npPIName">—</b></div>'+
            '<div class="npSubRow"><span>মোবাইল</span><b id="npPIPhone">—</b></div>'+
            '<div class="npSubRow"><span>Gmail</span><b id="npPIEmail">—</b></div>'+
            '<div class="npSubRow"><span>UID</span><b id="npPIUid">—</b></div>'+
          '</div>'+
          '<button type="button" class="npItem" onclick="typeof openDeposit===\'function\'&&openDeposit()">'+
            '<span class="npItemIco" style="background:#16a34a">⬇️</span>'+
            '<span class="npItemTxt"><b>Deposit</b><small>Add money to wallet</small></span><span class="npChev">›</span>'+
          '</button>'+
          '<button type="button" class="npItem" onclick="typeof openWithdraw===\'function\'&&openWithdraw()">'+
            '<span class="npItemIco" style="background:#7c3aed">⬆️</span>'+
            '<span class="npItemTxt"><b>Withdraw / Bank Details</b><small>bKash, Nagad, Rocket</small></span><span class="npChev">›</span>'+
          '</button>'+
          '<button type="button" class="npItem" onclick="typeof showNotifications===\'function\'&&showNotifications()">'+
            '<span class="npItemIco" style="background:#ea580c">🔔</span>'+
            '<span class="npItemTxt"><b>Notification Settings</b><small>Manage your notifications</small></span><span class="npChev">›</span>'+
          '</button>'+
          '<button type="button" class="npItem" onclick="typeof shareApp===\'function\'&&shareApp()">'+
            '<span class="npItemIco" style="background:#db2777">👥</span>'+
            '<span class="npItemTxt"><b>Referral & Earn</b><small>Invite friends & get bonus</small></span><span class="npChev">›</span>'+
          '</button>'+
          '<button type="button" class="npItem" onclick="typeof openSupport===\'function\'?openSupport():(typeof showSupport===\'function\'&&showSupport())">'+
            '<span class="npItemIco" style="background:#0891b2">🎧</span>'+
            '<span class="npItemTxt"><b>Help & Support</b><small>Get help from our support team</small></span><span class="npChev">›</span>'+
          '</button>'+
          '<button type="button" class="npItem" onclick="typeof openHelpPage===\'function\'&&openHelpPage(\'terms\')">'+
            '<span class="npItemIco" style="background:#2563eb">📄</span>'+
            '<span class="npItemTxt"><b>Terms & Conditions</b><small>Read our terms and conditions</small></span><span class="npChev">›</span>'+
          '</button>'+
          '<button type="button" class="npItem" onclick="typeof openHelpPage===\'function\'&&openHelpPage(\'privacy\')">'+
            '<span class="npItemIco" style="background:#7c3aed">🛡️</span>'+
            '<span class="npItemTxt"><b>Privacy Policy</b><small>Your data is safe with us</small></span><span class="npChev">›</span>'+
          '</button>'+
          '<button type="button" class="npItem danger" id="npLogout">'+
            '<span class="npItemIco" style="background:#e11d48">⎋</span>'+
            '<span class="npItemTxt"><b>Logout</b><small>Sign out from your account</small></span><span class="npChev">›</span>'+
          '</button>'+
        '</div>'+
        '<div class="npVersion">Ludo Baji</div>'+
      '</div>';

    // Edit toggle
    const editBox=$('npEditBox');
    const editBtn=$('npEditBtn');
    if(editBtn) editBtn.onclick=function(){ if(editBox) editBox.style.display=editBox.style.display==='none'?'block':'none'; };
    if($('npCancelBtn')) $('npCancelBtn').onclick=function(){ if(editBox) editBox.style.display='none'; };
    if($('npSaveBtn')) $('npSaveBtn').onclick=async function(){
      const name=($('npEditName')&&$('npEditName').value||'').trim();
      const msg=$('npEditMsg');
      if(!name||name.length<2){ if(msg){ msg.style.color='#f87171'; msg.textContent='নাম লিখুন'; } return; }
      try{
        const j=await api('/api/auth/profile',{method:'PUT',body:JSON.stringify({name:name})});
        if(j.user){
          if($('npName')) $('npName').textContent=j.user.name||'User';
          if($('npPIName')) $('npPIName').textContent=j.user.name||'—';
        }
        if(msg){ msg.style.color='#4ade80'; msg.textContent='Profile saved'; }
        if(editBox) setTimeout(function(){ editBox.style.display='none'; }, 600);
      }catch(e){ if(msg){ msg.style.color='#f87171'; msg.textContent=e.message||'Failed'; } }
    };
    if($('npPersonal')) $('npPersonal').onclick=function(){
      const box=$('npPersonalBox');
      if(box) box.style.display=box.style.display==='none'?'block':'none';
    };
    if($('npLogout')) $('npLogout').onclick=function(){
      try{ localStorage.removeItem('ludo_user_token'); }catch(e){}
      try{ localStorage.removeItem('ludo_user_profile'); }catch(e){}
      window.currentUser=null;
      document.body.classList.add('logged-out');
      document.documentElement.classList.remove('has-session');
      try{ if(typeof setPageState==='function') setPageState('home'); }catch(e){}
      try{ if(typeof renderQuick==='function') renderQuick(); }catch(e){}
      try{ if(typeof openAuth==='function') openAuth(); }catch(e){}
    };

    // Load user + balances
    try{
      const j=await api('/api/auth/me');
      const u=j.user||{};
      try{ localStorage.setItem('ludo_user_profile', JSON.stringify(u)); }catch(e){}
      const name=u.name||'User';
      const phone=u.phone||'';
      const email=u.email||'';
      const uid=u.user_code||u.id||'—';
      if($('npName')) $('npName').textContent=name;
      if($('npUid')) $('npUid').textContent=uid;
      if($('npPhone')) $('npPhone').textContent=phone||'মোবাইল নেই';
      if($('npMail')) $('npMail').textContent=email||'';
      if($('npEditName')) $('npEditName').value=u.name||'';
      if($('npPIName')) $('npPIName').textContent=name;
      if($('npPIPhone')) $('npPIPhone').textContent=phone||'—';
      if($('npPIEmail')) $('npPIEmail').textContent=email||'—';
      if($('npPIUid')) $('npPIUid').textContent=uid;
    }catch(e){}
    try{
      const d=await api('/api/user/dashboard');
      const g=Number(d.dashboard&&d.dashboard.gaming_balance||0);
      const w=Number(d.dashboard&&d.dashboard.winning_balance||0);
      if($('npBal')) $('npBal').textContent=money(g+w);
      if($('npWin')) $('npWin').textContent=money(w);
    }catch(e){}
    try{
      const dep=await api('/api/user/deposits');
      const rows=(dep.deposits||[]).filter(function(x){ return String(x.status).toLowerCase()==='approved'||String(x.status).toLowerCase()==='completed'; });
      const sum=rows.reduce(function(a,x){ return a+Number(x.amount||0); },0);
      if($('npDep')) $('npDep').textContent=money(sum);
    }catch(e){}
    try{
      const wd=await api('/api/user/withdrawals');
      const rows=(wd.withdrawals||[]).filter(function(x){ return String(x.status).toLowerCase()==='approved'||String(x.status).toLowerCase()==='completed'; });
      const sum=rows.reduce(function(a,x){ return a+Number(x.amount||0); },0);
      if($('npWd')) $('npWd').textContent=money(sum);
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
      const pub=await fetch('/api/matches?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.json();}).catch(function(){return null;});
      if(pub && Array.isArray(pub.matches)){
        const n=pub.matches.filter(function(m){return String(m.status||'').toLowerCase()!=='cancelled';}).length;
        const c=$('lbMatchCount'); if(c) c.textContent=String(n);
        try{sessionStorage.setItem('lb_match_count',String(n))}catch(e){}
        try{sessionStorage.setItem('lb_match_cache',JSON.stringify({at:Date.now(),matches:pub.matches}))}catch(e){}
      }
      // on fetch fail keep previous badge — no flash to 0
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

