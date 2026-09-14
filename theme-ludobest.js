/* User-app skin: Ludo Best layout. Keeps existing APIs and admin. */
(function(){
  document.body.classList.add('lb-skin');
  const $ = (id)=>document.getElementById(id);

  function injectHome(){
    const app=document.querySelector('.app');
    if(!app||document.getElementById('lbHero'))return;

    const header=app.querySelector('header .head');
    if(header){
      let actions=document.getElementById('lbTopActions');
      if(!actions){
        actions=document.createElement('div');
        actions.id='lbTopActions';
        actions.className='lb-top-actions';
        actions.innerHTML='<button type="button" class="lb-ico-btn" id="lbBell" onclick="if(typeof showNotifications===\'function\')showNotifications()">🔔<span class="lb-badge" id="lbBellCount" style="display:none">0</span></button><button type="button" class="lb-wallet-chip" id="lbChip" onclick="openWalletSkin()">🪙 <span id="lbChipBal">0</span></button>';
        header.appendChild(actions);
      }
    }

    const wallet=app.querySelector('.wallet');
    const hero=document.createElement('div');
    hero.id='lbHero';
    hero.innerHTML='<div class="heroBox"><div class="heroArt">🎲</div><h1 class="heroTitle" id="lbHeroTitle">Ludo Baji</h1><div class="heroSub">Ludo in under 10 minutes</div></div><button type="button" class="playNow" onclick="if(typeof showMatches===\'function\')showMatches();else if(typeof quickOpen===\'function\')quickOpen(\'match\',\'Ludo Matches\',\'🎲\')">Play Now</button><div class="seg"><button type="button" class="on" id="segGames" onclick="setHomeSeg(\'games\')">🎮 Games</button><button type="button" id="segOthers" onclick="setHomeSeg(\'others\')">▦ Others</button></div><div class="gameCard" onclick="if(typeof showMatches===\'function\')showMatches()"><div class="gcArt">🎯</div><div><b>Ludo Matches</b><small>REGULAR 1 VS 1</small></div><span class="gcCount" id="lbMatchCount">0</span></div><div id="lbOthersBox" style="display:none"></div><div class="tgCard" id="lbTgCard"><div>✈️</div><div><b>Telegram</b><small>Get updates & latest news</small></div><button type="button" class="join" onclick="openTelegramLink()">Join Now →</button></div><div class="safeBox"><div class="tick">✓</div><b>Instant withdrawals</b><div>100% safe payments</div></div>';
    if(wallet&&wallet.parentNode) wallet.parentNode.insertBefore(hero, wallet);

    if(!document.getElementById('lbBottom')){
      const nav=document.createElement('div');
      nav.className='bottomNav';
      nav.id='lbBottom';
      nav.innerHTML='<button type="button" class="on" id="navHome" onclick="goHomeTab()"><div class="ico">🏠</div>Home</button><button type="button" id="navRefer" onclick="if(typeof showReferral===\'function\')showReferral()"><div class="ico">👥</div>Refer</button><button type="button" id="navProfile" onclick="openProfileSkin()"><div class="ico">👤</div>Profile</button>';
      document.body.appendChild(nav);
    }
  }

  window.setHomeSeg=function(which){
    const g=$('segGames'),o=$('segOthers'),ob=$('lbOthersBox'),gc=document.querySelector('.gameCard');
    if(g)g.classList.toggle('on',which==='games');
    if(o)o.classList.toggle('on',which==='others');
    if(gc)gc.style.display=which==='games'?'flex':'none';
    if(ob)ob.style.display=which==='others'?'block':'none';
  };

  window.goHomeTab=function(){
    try{if(typeof closeLudoScreen==='function')closeLudoScreen();else{document.body.classList.remove('screen-open');const v=$('view');if(v){v.classList.remove('show');v.innerHTML=''}}}catch{}
    try{if(typeof setPageState==='function')setPageState('home',true)}catch{}
    document.querySelectorAll('#lbBottom button').forEach(b=>b.classList.remove('on'));
    const h=$('navHome');if(h)h.classList.add('on');
    window.scrollTo(0,0);
  };

  window.openTelegramLink=function(){
    const w=window._supportWidget||{};
    const link=w.telegram||w.whatsapp||'';
    if(String(link).startsWith('http')) window.open(link,'_blank');
    else if(w.whatsapp){const phone=String(w.whatsapp).replace(/[^0-9]/g,'');window.open('https://wa.me/'+phone,'_blank')}
    else alert('Telegram লিংক এখনো সেট করা হয়নি');
  };

  window.openWalletSkin=async function(){
    if(typeof authToken==='function'&&!authToken()){if(typeof openAuth==='function')openAuth();return}
    if(typeof enterScreen==='function')enterScreen('wallet');
    else {document.body.classList.add('screen-open');$('view').classList.add('show')}
    const v=$('view');
    const g=Number(window._gamingBal||0),w=Number(window._winningBal||0),tot=g+w;
    v.innerHTML='<div class="screenTop"><button class="screenBack" onclick="goHomeTab()">‹</button><div class="screenTitle">Wallet</div></div><div class="walletHead"><div style="color:#68736d;font-size:12px;letter-spacing:1px">AVAILABLE BALANCE</div><div style="font-size:40px;font-weight:800;color:#111">'+tot.toFixed(0)+'</div><div style="display:inline-block;background:#111;color:#fff;border-radius:999px;padding:4px 10px;font-size:12px;margin-top:6px">Winning Balance '+w.toFixed(0)+'</div><div class="wActs"><button class="wDep" onclick="openDeposit()">＋ DEPOSIT</button><button class="wWd" onclick="openWithdraw()">📷 WITHDRAW</button><button class="wGift" onclick="alert(\'Gift পরে চালু হবে\')">🎁 GIFT</button></div></div><div class="screenBody"><div class="helpRow"><span>কিভাবে টাকা ডিপোজিট করবেন?</span><button type="button" onclick="if(typeof showPublicPage===\'function\')showPublicPage(\'deposit_rules\')">ভিডিও দেখুন</button></div><div class="helpRow"><span>কিভাবে বন্ধুকে গিফট পাঠাবেন?</span><button type="button" onclick="if(typeof showPublicPage===\'function\')showPublicPage(\'faq\')">ভিডিও দেখুন</button></div><h3 style="margin:16px 0 8px">Mini Statements</h3><div id="miniSt">Loading...</div></div>';
    try{
      const j=await api('/api/user/transactions');
      const rows=(j.transactions||[]).slice(0,8);
      const box=$('miniSt');
      if(!rows.length){box.innerHTML='<div class="smallText">কোনো স্টেটমেন্ট নেই</div>';return}
      box.innerHTML=rows.map(t=>{
        const ch=Number(t.balance_change??0);
        const sign=ch>=0?'+':'';
        const col=ch>=0?'#16a34a':'#dc2626';
        return '<div class="txRow" style="background:#102338;color:#fff;border-color:#1c3d5a"><div class="txTop"><b>'+esc(String(t.type||'').replace(/_/g,' '))+'</b><span style="color:'+col+'">'+sign+Number(ch).toFixed(0)+'</span></div><div class="txMeta">'+(t.note?esc(t.note)+' • ':'')+esc(new Date(t.created_at).toLocaleString())+'</div></div>';
      }).join('')+'<button class="btn" style="width:100%;margin-top:10px" onclick="openStatement()">See all...</button>';
    }catch(e){const box=$('miniSt');if(box)box.textContent=e.message}
  };

  window.openProfileSkin=async function(){
    if(typeof authToken==='function'&&!authToken()){if(typeof openAuth==='function')openAuth();return}
    document.querySelectorAll('#lbBottom button').forEach(b=>b.classList.remove('on'));
    const np=$('navProfile');if(np)np.classList.add('on');
    if(typeof enterScreen==='function')enterScreen('profile');
    else {document.body.classList.add('screen-open');$('view').classList.add('show')}
    const v=$('view');
    v.innerHTML='<div class="profilePage"><div class="pUser"><div class="pAv">👤</div><div style="flex:1"><b id="pfName">User</b><div class="smallText" id="pfPhone"></div><div class="smallText" id="pfEmail"></div><div class="smallText" id="pfUid"></div></div><button class="btn" style="background:#1d4ed8;padding:8px 10px" onclick="document.getElementById(\'profileModal\').classList.add(\'show\')">✎ Edit</button></div><div class="pBal"><button class="addBtn" onclick="openDeposit()">＋ ADD</button><div style="color:#9bb3c9;font-size:12px">AVAILABLE BALANCE</div><strong id="pfBal">BDT 0</strong><div style="color:#f5c400;margin-top:4px">🏆 Winning: <span id="pfWin">0</span></div><div class="stats3"><div><b id="pfMatches">0</b><div class="smallText">MATCHES</div></div><div><b id="pfRefers">0</b><div class="smallText">REFERS</div></div><div><b id="pfWins">0</b><div class="smallText">WINNINGS</div></div></div></div><div class="menuRow" onclick="openWalletSkin()">👛 My Wallet <span>›</span></div><div class="menuRow" onclick="openStatement()">📑 All Statements <span>›</span></div><div class="menuRow" onclick="if(typeof showLeaderboard===\'function\')showLeaderboard()">🏆 Top Players <span>›</span></div><div class="menuRow" onclick="shareApp()">📤 Share App <span>›</span></div><div class="menuRow" onclick="if(typeof showPublicPage===\'function\')showPublicPage(\'terms\')">ℹ️ Terms & Conditions <span>›</span></div><div class="menuRow danger" onclick="document.getElementById(\'logoutUser\').click()">Logout <span>›</span></div><div style="text-align:center;color:#7f97ad;margin-top:16px;font-size:12px">Version 1.0.6</div></div>';
    try{
      const j=await api('/api/auth/me');
      currentUser=j.user;
      if($('pfName'))$('pfName').textContent=j.user.name||'User';
      if($('pfEmail'))$('pfEmail').textContent=j.user.email||'';
      if($('pfPhone'))$('pfPhone').textContent=j.user.phone||'';
      if($('pfUid'))$('pfUid').textContent='UID: '+(j.user.user_code||j.user.id||'');
      if($('profileName'))$('profileName').value=j.user.name||'';
    }catch{}
    try{
      const d=await api('/api/user/dashboard');
      const g=Number(d.dashboard.gaming_balance||0),w=Number(d.dashboard.winning_balance||0);
      if($('pfBal'))$('pfBal').textContent='BDT '+(g+w).toFixed(0);
      if($('pfWin'))$('pfWin').textContent=w.toFixed(0);
    }catch{}
    try{
      const mine=await api('/api/user/matches/mine');
      const ms=(mine.matches||[]);
      if($('pfMatches'))$('pfMatches').textContent=String(ms.length);
      if($('pfWins'))$('pfWins').textContent=String(ms.filter(m=>String(m.winner_user_id||'')===String((currentUser&&currentUser.id)||'')).length);
    }catch{}
    try{
      const r=await api('/api/user/referral');
      if($('pfRefers'))$('pfRefers').textContent=String(r.uses||r.count||0);
    }catch{}
  };

  window.shareApp=function(){
    const url=location.origin+'/';
    if(navigator.share) navigator.share({title:'Ludo Baji',url:url}).catch(()=>{});
    else {try{navigator.clipboard.writeText(url);alert('অ্যাপ লিংক কপি হয়েছে')}catch{alert(url)}}
  };

  const oldRenderQuick=window.renderQuick;
  window.renderQuick=function(){
    if(typeof oldRenderQuick==='function') oldRenderQuick();
    const q=$('quickGrid');
    const others=$('lbOthersBox');
    if(q&&others){
      others.innerHTML='';
      [...q.querySelectorAll('.quickBtn')].forEach(btn=>{
        const label=(btn.querySelector('.quickName')||{}).textContent||'';
        if(/match/i.test(label)) return;
        others.appendChild(btn.cloneNode(true));
      });
      others.querySelectorAll('.quickBtn').forEach((b,i)=>{
        const src=q.querySelectorAll('.quickBtn')[i];
        b.onclick=src?src.onclick:null;
      });
    }
    const title=$('lbHeroTitle'),sn=$('siteName');
    if(title&&sn) title.textContent=sn.textContent||'Ludo Baji';
  };

  const oldRefresh=window.refreshDashboard;
  window.refreshDashboard=async function(){
    if(typeof oldRefresh==='function') await oldRefresh();
    const chip=$('lbChipBal');
    const tot=Number(window._gamingBal||0)+Number(window._winningBal||0);
    if(chip) chip.textContent=String(Math.round(tot));
    try{
      const pub=await fetch('/api/matches?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).catch(()=>({}));
      const n=(pub.matches||[]).filter(m=>String(m.status||'').toLowerCase()!=='cancelled').length;
      const c=$('lbMatchCount'); if(c)c.textContent=String(n||0);
    }catch{}
    try{
      if(typeof authToken==='function'&&authToken()){
        const j=await api('/api/user/notifications');
        const unread=(j.notifications||[]).filter(n=>!n.read_at).length;
        const b=$('lbBellCount');
        if(b){b.textContent=String(unread);b.style.display=unread?'grid':'none'}
      }
    }catch{}
  };

  const oldLoadProfile=window.loadProfile;
  window.loadProfile=function(){return openProfileSkin()};

  injectHome();
  document.addEventListener('DOMContentLoaded',injectHome);
})();
