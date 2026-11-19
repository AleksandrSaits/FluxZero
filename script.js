// @ts-nocheck
const SUPABASE_URL = "https://vnygjdvuvylejynlfjij.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lhYEWCFi0wRAIkQW_6Jlaw_AAzn7-xq";
const VAPID_PUBLIC = "ВСТАВЬТЕ_PUBLIC_VAPID_KEY";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
let me=null, peer=null, mode="login", channel=null;
let pendingFiles=[];
const people={}, convs={};

/* тема */
const root=document.documentElement;
let saved=null; try{saved=localStorage.getItem("fz-theme")}catch(e){}
root.dataset.theme=saved||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");
function setTheme(t){root.dataset.theme=t;try{localStorage.setItem("fz-theme",t)}catch(e){}
  document.querySelector('meta[name=theme-color]').content=t==="dark"?"#0e1621":"#ffffff";
  const tv=$("themeVal"); if(tv) tv.textContent=t==="dark"?"Тёмная":"Светлая"}
setTheme(root.dataset.theme);
$("theme").onclick=()=>setTheme(root.dataset.theme==="dark"?"light":"dark");

/* аватары */
const grads=[["#ff885e","#ff516a"],["#ffcd6a","#ffa85c"],["#82b1ff","#665fff"],["#a0de7e","#54cb68"],["#53edd6","#28c9b7"],["#72d5fd","#2a9ef1"],["#e0a2f3","#d669ed"]];
function ava(el,name,p){const g=grads[[...name].reduce((a,c)=>a+c.charCodeAt(0),0)%grads.length];
  el.textContent=[...name][0].toUpperCase();el.style.background=`linear-gradient(${g[0]},${g[1]})`;
  if(p&&p.avatar_path&&name!=="★"){el.textContent="";el.style.background=`url("${sb.storage.from('chat-files').getPublicUrl(p.avatar_path).data.publicUrl}") center/cover`}}
const tm=d=>new Date(d).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
function short(d){
  const x=new Date(d), n=new Date(), diff=n-x;
  if(diff < 60000) return 'только что';
  if(diff < 3600000) return Math.floor(diff/60000) + ' мин. назад';
  if(x.toDateString()===n.toDateString()) return tm(d);
  const y=new Date(n-864e5);
  if(x.toDateString()===y.toDateString()) return 'Вчера, '+tm(d);
  return x.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})+', '+tm(d);
}
function dayLabel(d){const x=new Date(d),n=new Date(),y=new Date(n-864e5);
  if(x.toDateString()===n.toDateString())return"Сегодня";
  if(x.toDateString()===y.toDateString())return"Вчера";
  return x.toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}

/* Вход */
let recoveryMode=false;
function setMode(m){
  mode=m; recoveryMode=false;
  $("uWrap").classList.toggle("hidden",m==="login");
  $("aEmailWrap").classList.remove("hidden");
  $("aPass").parentElement.classList.remove("hidden");
  $("aPass").value=""; $("aPass").autocomplete=m==="reg"?"new-password":"current-password";
  $("aPassLabel").textContent="Пароль";
  $("forgotPass").classList.toggle("hidden",m!=="login");
  $("aAlt").classList.remove("hidden");
  $("aSub").textContent=m==="login"?"Войдите в аккаунт":"Создайте новый аккаунт";
  $("aGo").textContent=m==="login"?"Войти":"Создать аккаунт";
  $("aAlt").textContent=m==="login"?"Создать аккаунт":"У меня уже есть аккаунт";
  $("aErr").textContent="";
}
function showRecoveryForm(){
  recoveryMode=true; mode="login";
  $("auth").classList.remove("hidden"); $("app").classList.add("hidden");
  $("uWrap").classList.add("hidden"); $("aEmailWrap").classList.add("hidden");
  $("aPass").parentElement.classList.remove("hidden"); $("aPass").value="";
  $("aPass").autocomplete="new-password"; $("aPassLabel").textContent="Новый пароль";
  $("aSub").textContent="Придумайте новый пароль"; $("aGo").textContent="Сохранить новый пароль";
  $("aAlt").classList.add("hidden"); $("forgotPass").classList.add("hidden"); $("aErr").textContent="";
}
$("aAlt").onclick=()=>setMode(mode==="login"?"reg":"login");
$("forgotPass").onclick=async()=>{
  const email=$("aEmail").value.trim(); $("aErr").textContent="";
  if(!email){ $("aErr").textContent="Сначала введите адрес электронной почты."; $("aEmail").focus(); return; }
  $("forgotPass").disabled=true; $("forgotPass").textContent="Отправляем письмо…";
  try{
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(error) throw error;
    $("aErr").textContent="Если аккаунт существует, письмо отправлено. Проверьте «Спам».";
  }catch(e){ $("aErr").textContent=e.message||"Не удалось отправить письмо."; }
  finally{ $("forgotPass").disabled=false; $("forgotPass").textContent="Забыли пароль?"; }
};
$("aGo").onclick=async()=>{
  const email=$("aEmail").value.trim(),password=$("aPass").value,username=$("aUser").value.trim();
  $("aErr").textContent=""; $("aGo").disabled=true;
  try{
    if(recoveryMode){
      if(password.length<6){ $("aErr").textContent="Пароль минимум 6 символов."; return; }
      const {error}=await sb.auth.updateUser({password});
      if(error) throw error;
      await sb.auth.signOut(); recoveryMode=false; history.replaceState(null,"",location.pathname);
      $("aPass").value=""; setMode("login"); $("aErr").textContent="Пароль изменён. Войдите."; return;
    }
    if(!email){ $("aErr").textContent="Введите электронную почту."; return; }
    if(!password){ $("aErr").textContent="Введите пароль."; return; }
    let res;
    if(mode==="reg"){
      if(!/^[\w.]{3,24}$/.test(username)){ $("aErr").textContent="Имя: 3–24 символа, буквы, цифры, _ или ."; return; }
      res=await sb.auth.signUp({email,password,options:{data:{username}}});
      if(!res.error&&!res.data.session){ $("aErr").textContent="Подтвердите почту и войдите."; return; }
    }else{ res=await sb.auth.signInWithPassword({email,password}); }
    if(res.error) throw res.error;
    if(res.data.session) start(res.data.session.user);
  }catch(e){ $("aErr").textContent=e.message||"Ошибка. Попробуйте ещё раз."; }
  finally{ $("aGo").disabled=false; }
};
$("out").onclick=async()=>{
  try{const rg=await navigator.serviceWorker?.getRegistration();const sb0=rg&&await rg.pushManager.getSubscription();if(sb0)await sb.rpc("drop_push_sub",{ep:sb0.endpoint})}catch(e){}
  if(pushTok)try{await sb.rpc("unregister_device",{tok:pushTok})}catch(e){}
  if(channel)sb.removeChannel(channel);await sb.auth.signOut();location.reload()};

/* Старт */
let __started=false;
async function start(user){
  if(__started&&me&&me.id===user.id){$("auth").classList.add("hidden");$("app").classList.remove("hidden");$("boot")&&$("boot").classList.add("hidden");return}
  __started=true;
  const {data:prof}=await sb.from("profiles").select("*").eq("id",user.id).single();
  me=prof||{id:user.id,username:"user"}; people[me.id]=me;
  try{
    const {data:ownerData}=await sb.rpc('is_owner');
    me.is_owner = ownerData || false;
  }catch(e){ me.is_owner = false; }
  if(me.is_owner){
    $("verifiedBtn").classList.remove("hidden");
  }
  $("auth").classList.add("hidden"); $("app").classList.remove("hidden");
  $("mName").innerHTML=me.username+(me.verified?'<span class="verified-badge">✓</span>':'');
  $("mTag").textContent="@"+me.username; ava($("mAva"),me.username,me); $("mBio").textContent=me.bio||"";
  await loadMessages(); renderList(); initRealtime();
}

async function loadMessages(){
  await loadGroups();
  // Load newest messages first, then sort ascending for display
  const {data:raw}=await sb.from("messages").select("*").order("created_at",{ascending:false}).limit(1500);
  if(!raw) return;
  const data=raw.slice().reverse();
  const ids=new Set(data.flatMap(m=>m.group_id?[m.sender]:[m.sender===me.id?m.receiver:m.sender])); ids.delete(me.id);
  if(ids.size){const {data:ps}=await sb.from("profiles").select("*").in("id",[...ids]); (ps||[]).forEach(p=>people[p.id]=p)}
  data.forEach(m=>push(m, m.group_id?m.sender!==me.id&&new Date(m.created_at)>new Date(lastRead["g"+m.group_id]||0):m.read_at===null&&m.sender!==me.id));
  const {data:rs}=await sb.from("reactions").select("*").order("created_at",{ascending:false}).limit(5000);
  (rs||[]).forEach(r=>(rx[r.message_id]=rx[r.message_id]||{})[r.user_id]=r.emoji);
}
function push(m,unread){
  const pid=cid(m); const c=convs[pid]||(convs[pid]={msgs:[],unread:0});
  const i=c.msgs.findIndex(x=>x.id===m.id);
  if(i>=0){c.msgs[i]=m; return}
  c.msgs.push(m);
  if(unread&&m.sender!==me.id&&!(peer&&peer.id===pid&&!document.hidden)) c.unread++;
}
async function receive(m,ins){
  const pid=cid(m);
  if(!m.group_id&&blocked.has(m.sender)&&m.sender!==me.id) return;
  if(m.group_id&&!people[pid]) await loadGroups();
  if(!m.group_id&&!people[pid]){const {data}=await sb.from("profiles").select("*").eq("id",pid).single(); if(data)people[pid]=data}
  if(!people[m.sender]){const {data}=await sb.from("profiles").select("*").eq("id",m.sender).single(); if(data)people[m.sender]=data}
  // Skip optimistic pending when server confirms same body/time
  if(ins&&m.sender===me.id&&convs[pid]){
    const pend=convs[pid].msgs.find(x=>x._pending&&x.body===m.body);
    if(pend){const i=convs[pid].msgs.indexOf(pend);convs[pid].msgs[i]=m;renderList();if(peer&&peer.id===pid)drawMsgs();return}
  }
  push(m,ins);
  if(ins&&m.sender!==me.id&&cfg.snd&&!mutes.has(pid)&&(document.hidden||!(peer&&peer.id===pid))){ding();navigator.vibrate&&navigator.vibrate(40)}
  if(ins&&m.sender!==me.id&&!mutes.has(pid)&&!document.hidden&&!(peer&&peer.id===pid)) banner(pid,m);
  renderList();
  if(peer&&peer.id===pid){drawMsgs(); if(ins&&m.sender!==me.id&&!document.hidden) markRead()}
  else if(ins&&m.sender!==me.id&&!mutes.has(pid)) notify(m);
}

/* Список */
let _rlT=null;
function renderListDebounced(){clearTimeout(_rlT);_rlT=setTimeout(function(){renderList()},80)}
function renderList(results){
  if(!me) return;
  if(!results&&tab==="people") results=allPeople;
  const tot=Object.values(convs).reduce((a,c)=>a+c.unread,0);
  const tb=$("tb"); if(tb){tb.textContent=tot; tb.classList.toggle("hidden",!tot)}
  document.title=(tot?"("+tot+") ":"")+"FluxZero";
  const box=$("list"); if(!box) return; box.innerHTML=""; let items;
  if(results){
    items=results.map(p=>({p}));
    if(!items.length){box.innerHTML='<div class="hint">Никого не нашли</div>'; return}
  }else{
    items=Object.keys(convs).filter(id=>people[id]).map(id=>{const c=convs[id],L=vis(id);return{p:people[id],last:L[L.length-1],unread:c.unread}})
      .filter(i=>i.last||i.p.isGroup).sort((a,b)=>sortKey(b)-sortKey(a));
    if(!items.some(i=>i.p.id===me.id)) items.unshift({p:me,last:null,unread:0});
    items.sort((a,b)=>pins.has(b.p.id)-pins.has(a.p.id));
    if(flt==="a") items=items.filter(i=>archives.has(i.p.id));
    else if(flt==="f"){
      const ids=new Set(folders.custom||[]);
      items=items.filter(i=>ids.has(i.p.id)&&!archives.has(i.p.id));
    } else {
      items=items.filter(i=>!archives.has(i.p.id));
      if(flt!=="all") items=items.filter(i=>flt==="g"?i.p.isGroup:flt==="p"?!i.p.isGroup:flt==="u"?i.unread>0:true);
    }
    if(!items.length){box.innerHTML='<div class="hint">'+(flt==="all"?'Здесь появятся ваши чаты.<br>Найдите человека через поиск.':flt==="f"?'В папке пусто.<br>Добавьте чат через меню → «В папку».':'В этой папке пока пусто')+'</div>'; return}
  }
  let pinSep=false;
  items.forEach(({p,last,unread})=>{
    if(!results&&flt!=="a"&&pins.has(p.id)&&!pinSep){
      const sep=document.createElement("div");sep.className="pin-sep";sep.textContent="Закреплённые";box.append(sep);pinSep=true;
    }
    if(!results&&flt!=="a"&&pinSep&&!pins.has(p.id)){
      const sep=document.createElement("div");sep.className="pin-sep soft";sep.textContent="Все чаты";box.append(sep);pinSep=false;
    }
    const r=document.createElement("button"); r.className="row"+(peer&&peer.id===p.id?" on":"")+(pins.has(p.id)?" pinned":"")+(online.has(p.id)&&p.id!==me.id&&!p.isGroup?" online-dot":"");
    const a=document.createElement("div"); a.className="ava"; ava(a,p.id===me.id?"★":p.username,p);
    const t=document.createElement("div"); t.className="rt";
    const n=document.createElement("div"); n.className="n";
    n.innerHTML=(p.id===me.id?"Избранное":p.username)+(p.verified?'<span class="verified-badge">✓</span>':'');
    const pv=document.createElement("div"); pv.className="p";
    if(drafts[p.id]&&!(peer&&peer.id===p.id)){const i=document.createElement("i");i.style.color="#ff5d6c";i.textContent="Черновик: ";pv.append(i,stripMd(drafts[p.id]))}
    else if(!p.isGroup&&Date.now()-(typing[p.id]||0)<3000){const i=document.createElement("i");i.className="typing-list";i.textContent="печатает…";pv.append(i)}
    else if(last){
      if(last.sender===me.id){const i=document.createElement("i");i.textContent="Вы: ";pv.append(i)}
      else if(p.isGroup){pv.append((people[last.sender]?.username||"")+": ")}
      pv.append(pvw(last));
    } else pv.textContent=p.id===me.id?"Заметки и файлы для себя":p.isGroup?p.members.length+" участн.":"@"+p.username;
    if(mutes.has(p.id)) n.append(" 🔕");
    t.append(n,pv); r.append(a,t);
    if(online.has(p.id)&&p.id!==me.id) a.classList.add("onl");
    if(last){
      const mt=document.createElement("div"); mt.className="meta";
      const d=document.createElement("span"); d.textContent=short(last.created_at); mt.append(d);
      if(unread){const b=document.createElement("span");b.className="badge"+(mutes.has(p.id)?" mute":"");b.textContent=unread;mt.append(b)}
      else if(pins.has(p.id)) mt.append("📌");
      r.append(mt);
    }
    r.onclick=()=>{if(results){people[p.id]=p;$("q").value=""}openChat(p)};
    if(!results) bindRow(r,p);
    box.append(r);
  });
}
let st;
$("q").oninput=e=>{
  clearTimeout(st); const v=e.target.value.trim().replace(/[%_]/g,"");
  if(!v){renderList(); return}
  st=setTimeout(async()=>{
    const {data}=await sb.from("profiles").select("*").ilike("username",`%${v}%`).neq("id",me.id).limit(15);
    renderList([...Object.values(people).filter(g=>g.isGroup&&g.username.toLowerCase().includes(v.toLowerCase())),...(data||[])]);
  },250);
};

/* Чат */
function openChat(p){
  if(!p || !p.id || !me) return;
  peer=p; if(convs[p.id]) convs[p.id].unread=0; clearBar(); clearPendingFiles(); $("emp").classList.add("hidden");
  vis(p.id).forEach(m=>seen.add(m.id)); divId=firstUnread(p); stick=true; below=0; closeSearch(); setTxt(drafts[p.id]||"");
  $("empty").classList.add("hidden"); ["top","msgs","composer"].forEach(i=>$(i).classList.remove("hidden"));
  $("pName").innerHTML=(p.id===me.id?"Избранное":p.username)+(p.verified?'<span class="verified-badge">✓</span>':'');
  ava($("pAva"),p.id===me.id?"★":p.username,p);
  $("app").classList.add("open"); drawMsgs(); renderList(); updStatus(); markRead();
  if(divId){const el=document.querySelector(".newdiv");if(el)$("msgs").scrollTop=Math.max(0,el.offsetTop-90)}
  refreshPeer(); if(matchMedia("(min-width:761px)").matches) $("txt").focus();
}
const seen=new Set();
const EMOJI_ONLY=/^(?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*\s*){1,3}$/u;

const linkCache = Object.create(null);
function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
async function renderLinkPreview(parent, url) {
  if (!cfg.lp) return;
  if (linkCache[url] === 'loading') return;
  if (linkCache[url] && linkCache[url] !== 'loading') {
    parent.appendChild(linkCache[url].cloneNode(true));
    return;
  }
  linkCache[url] = 'loading';
  try {
    const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (data.status === 'success' && data.data) {
      const d = data.data;
      const prev = document.createElement('a');
      prev.className = 'link-preview';
      prev.href = url; prev.target = '_blank'; prev.rel = 'noopener noreferrer';
      if (d.image && d.image.url) {
        const img = document.createElement('img');
        img.src = d.image.url; img.alt = '';
        img.style.cssText = 'width:100%;border-radius:10px 10px 0 0;max-height:160px;object-fit:cover;display:block';
        prev.appendChild(img);
      }
      const box = document.createElement('div'); box.style.padding = '8px 10px';
      const title = document.createElement('div');
      title.style.cssText = 'font-size:13px;font-weight:600;margin-bottom:3px;line-height:1.3';
      title.textContent = d.title || url; box.appendChild(title);
      if (d.description) {
        const desc = document.createElement('div');
        desc.style.cssText = 'font-size:12px;opacity:0.7;line-height:1.3';
        desc.textContent = d.description.substring(0, 120) + (d.description.length > 120 ? '...' : '');
        box.appendChild(desc);
      }
      prev.appendChild(box);
      linkCache[url] = prev;
      parent.appendChild(prev.cloneNode(true));
    } else { delete linkCache[url]; }
  } catch(e) { delete linkCache[url]; }
}

function drawMsgs(){
  if(!peer || !me) return;
  const sc=$("msgs"), box=$("inner");
  if(!sc || !box) return;
  const list=vis(peer.id); let lastDay="";
  const nearB=sc.scrollHeight-sc.scrollTop-sc.clientHeight<140, keep=sc.scrollTop, lm=list[list.length-1];
  const newMine=lm&&lm.sender===me.id&&!seen.has(lm.id), fresh=list.filter(m=>m.sender!==me.id&&!seen.has(m.id)).length;
  const goBottom=stick||nearB||newMine; if(!goBottom&&fresh) below+=fresh;
  box.innerHTML="";
  const byId={}; list.forEach(m=>byId[m.id]=m);
  list.forEach((m,i)=>{
    const day=new Date(m.created_at).toDateString();
    if(day!==lastDay){lastDay=day;const s=document.createElement("div");s.className="day";s.textContent=dayLabel(m.created_at);box.append(s)}
    if(m.id===divId){const nd=document.createElement("div");nd.className="newdiv";nd.textContent="Новые сообщения";box.append(nd)}
    const prev=list[i-1], next=list[i+1], mine=m.sender===me.id;
    const near=(a,b)=>a&&b&&a.sender===b.sender&&new Date(b.created_at).toDateString()===new Date(a.created_at).toDateString()&&new Date(b.created_at)-new Date(a.created_at)<3e5;
    const d=document.createElement("div"); d.dataset.id=m.id;
    d.className="b "+(mine?"m":"t")+(near(prev,m)?"":" first")+(near(m,next)?"":" last")+(seen.has(m.id)?"":" new")+(m.body&&EMOJI_ONLY.test(m.body)?" big":"")+(m._pending?" pending":"")+(m._failed?" failed":"");
    seen.add(m.id);
    const r=m.reply_to&&byId[m.reply_to];
    if(m.reply_to){const q=document.createElement("div");q.className="rep";const b=document.createElement("b");
      if(r){b.textContent=r.sender===me.id?"Вы":(people[r.sender]?.username||"");const t=document.createElement("span");t.textContent=pvw(r);
        q.append(b,t);q.onclick=()=>jumpTo(r.id)}
      else{b.textContent="";const t=document.createElement("span");t.className="del-ph";t.textContent="Сообщение удалено";q.append(b,t)}
      d.append(q)}
    if(peer.isGroup&&!mine&&!near(prev,m)){const sn=document.createElement("div"),nm=people[m.sender]?.username||"?";
      sn.className="sn";sn.textContent=nm;sn.style.color=`hsl(${[...nm].reduce((a,c)=>a+c.charCodeAt(0)*7,0)%360} 70% 48%)`;d.append(sn)}
    if(m.fwd_name){const f=document.createElement("div");f.className="fwd";f.textContent="Переслано от "+m.fwd_name;d.append(f)}
    const tb=attach(d,m)||d;
    (m.body||"").split(/(https?:\/\/[^\s]+)/g).forEach((part,k)=>{
      if(k%2){
        const a=document.createElement("a");a.href=part;a.target="_blank";a.rel="noopener";a.textContent=part;tb.append(a);
        renderLinkPreview(tb, part);
      }else richText(tb,part);
    });
    if(m.poll){
      const pollDiv=document.createElement("div");pollDiv.className="poll";
      const qDiv=document.createElement("div");qDiv.className="poll-q";qDiv.textContent=m.poll.q||"Опрос";pollDiv.append(qDiv);
      const votesMap=(m.poll.votes||{}); // userId -> optionIndex (0-based)
      const counts=(m.poll.opts||[]).map((_,i)=>Object.values(votesMap).filter(v=>v===i).length);
      const totalVotes=counts.reduce((a,b)=>a+b,0);
      (m.poll.opts||[]).forEach((opt,idx)=>{
        const votes=counts[idx]||0;const pct=totalVotes?Math.round(votes/totalVotes*100):0;
        const optDiv=document.createElement("div");optDiv.className="poll-opt"+(votesMap[me.id]===idx?" me":"");
        const bar=document.createElement("div");bar.className="poll-bar";bar.style.width=pct+"%";
        const tx=document.createElement("span");tx.className="poll-opt-text";tx.textContent=opt;
        const pc=document.createElement("span");pc.className="poll-opt-pct";pc.textContent=pct+"%";
        optDiv.append(bar,tx,pc);
        optDiv.onclick=async()=>{
          if(votesMap[me.id]!=null) return;
          const newVotes={...votesMap,[me.id]:idx};
          const {error}=await sb.from("messages").update({poll:{...m.poll,votes:newVotes}}).eq("id",m.id);
          if(!error){m.poll={...m.poll,votes:newVotes};drawMsgs()}
        };
        pollDiv.append(optDiv);
      });
      const totDiv=document.createElement("div");totDiv.className="poll-total";totDiv.textContent="Всего голосов: "+totalVotes;pollDiv.append(totDiv);
      d.append(pollDiv);
    }
    const rc=rx[m.id];
    if(rc&&Object.keys(rc).length){
      const cnt={};Object.values(rc).forEach(e=>cnt[e]=(cnt[e]||0)+1);
      const row=document.createElement("div");row.className="rx";
      Object.entries(cnt).forEach(([e,n])=>{
        const b=document.createElement("button");b.type="button";b.className=rc[me.id]===e?"me":"";
        b.textContent=e+" "+n;b.onclick=ev=>{ev.stopPropagation();react(m,e)};row.append(b);
      });
      d.append(row);
    }
    const t=document.createElement("span");
    const isRead = mine && peer.id!==me.id && m.read_at && !peer.isGroup;
    t.className="tm"+(isRead?" has-read":"");
    t.textContent=(m._pending?"… ":"")+(m.edited_at?"изм. ":"")+tm(m.created_at||Date.now())+(isRead?" ✓✓":(mine&&!m._pending&&!m._failed&&peer.id!==me.id&&!peer.isGroup?" ✓":""));
    d.append(t);
    if(m._failed){const rb=document.createElement("span");rb.className="retry";rb.textContent="Повторить";rb.onclick=ev=>{ev.stopPropagation();retryMsg(m)};d.append(rb)}
    bindCtx(d,m); box.append(d);
  });
  if(goBottom){sc.scrollTop=sc.scrollHeight;below=0;
    box.querySelectorAll("img.pic,video.vid").forEach(im=>{
      if(!im.complete) im.addEventListener("load",()=>{if(sc.scrollHeight-sc.scrollTop-sc.clientHeight<200)sc.scrollTop=sc.scrollHeight},{once:true});
    });
  }else sc.scrollTop=keep;
  stick=false; setDn(); updatePin();
  observeVisibleRead();
}
  function jumpTo(id){
  const el=document.querySelector(`.b[data-id="${id}"]`);if(!el)return;
  el.scrollIntoView({block:"center",behavior:"smooth"});el.classList.remove("flash");void el.offsetWidth;el.classList.add("flash");
}
$("back").onclick=()=>{closeChat()};
$("composer").onsubmit=async e=>{
  e.preventDefault();if(recording){stopRec(true);return}
  if(peer&&peer.isGroup){
    const role=(peer.members||[]).find(x=>x.user_id===me.id)?.role;
    const perm=groupPerms[peer.id]||{write:true};
    if(!perm.write&&role!=="owner"&&role!=="admin"){toast("В этой группе нельзя писать");return}
  }
  // pending file queue
  if(pendingFiles.length){const cap=$("txt").value.trim();setTxt("");const files=[...pendingFiles];clearPendingFiles();
    for(const f of files) await handleFile(f,cap);return}
  const body=$("txt").value.trim();if(!body||!peer)return;
  if(editing){
    const m=editing;clearBar();setTxt("");
    const {data,error}=await sb.from("messages").update({body,edited_at:new Date().toISOString()}).eq("id",m.id).select().single();
    if(error){toast("Не удалось изменить: "+error.message);return}
    push(data,false);drawMsgs();renderList();return;
  }
  const row={sender:me.id,...tgt(peer.id),body};if(replyTo)row.reply_to=replyTo.id;
  const replyId=replyTo?replyTo.id:null;clearBar();setTxt("");
  // optimistic bubble
  const tmpId="tmp-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);
  const opt={...row,id:tmpId,created_at:new Date().toISOString(),_pending:true};
  push(opt,false);stick=true;drawMsgs();renderList();
  const {data,error}=await sb.from("messages").insert(row).select().single();
  const c=convs[peer.id];
  if(error){
    if(c){const i=c.msgs.findIndex(x=>x.id===tmpId);if(i>=0){c.msgs[i]._pending=false;c.msgs[i]._failed=true;c.msgs[i]._row=row}}
    drawMsgs();toast("Не удалось отправить");return;
  }
  if(c){const i=c.msgs.findIndex(x=>x.id===tmpId);if(i>=0)c.msgs[i]=data;else push(data,false)}
  drawMsgs();renderList();
};
async function retryMsg(m){
  if(!m._failed||!m._row||!peer)return;
  m._failed=false;m._pending=true;drawMsgs();
  const {data,error}=await sb.from("messages").insert(m._row).select().single();
  const c=convs[peer.id];
  if(error){m._pending=false;m._failed=true;drawMsgs();toast("Снова не удалось");return}
  if(c){const i=c.msgs.findIndex(x=>x.id===m.id);if(i>=0)c.msgs[i]=data}
  drawMsgs();renderList();
}

/* Вкладки */
let tab="chats",allPeople=[];
async function showTab(t){
  tab=t;
  document.querySelectorAll("#tabs button").forEach(b=>b.classList.toggle("on",b.dataset.tab===t));
  const isSettings = t==="settings";
  $("list").classList.toggle("hidden", isSettings);
  $("sh").classList.toggle("hidden", isSettings);
  if($("stories")) $("stories").classList.toggle("hidden", isSettings);
  $("chips").classList.toggle("hidden", t!=="chats");
  $("settings").classList.toggle("hidden", !isSettings);
  $("q").value="";
  // На настройках прячем лишние кнопки в шапке (оставить лого + меню)
  const sideActions = document.querySelector(".side-actions");
  if(sideActions){
    [...sideActions.children].forEach(btn=>{
      if(btn.id==="sideMore") return;
      btn.classList.toggle("hidden", isSettings);
    });
  }
  if(isSettings && typeof tgGo==="function") tgGo("home");
  if(t==="people"){const {data}=await sb.from("profiles").select("*").neq("id",me.id).order("username").limit(200);allPeople=[me,...(data||[])]}
  renderList();
  const el = isSettings ? $("settings") : $("list");
  if(el){el.classList.remove("fade");void el.offsetWidth;el.classList.add("fade");}
}
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
function tgGo(name){
  document.querySelectorAll("#settings .tg-page").forEach(p=>{
    const home=p.dataset.pg==="home";
    p.classList.toggle("on", p.dataset.pg===name);
    p.classList.toggle("under", name!=="home" && home);
  });
  const sc=document.querySelector('#settings .tg-page[data-pg="'+name+'"]');
  if(sc) sc.scrollTop=0;
}
document.querySelectorAll("#settings [data-pgto]").forEach(b=>b.onclick=()=>tgGo(b.dataset.pgto));
document.querySelectorAll("#settings .tg-back").forEach(b=>b.onclick=()=>tgGo("home"));


/* Фон */
const presets=[["Авто",null],["Закат","linear-gradient(160deg,#ff9a8b,#ff6a88 45%,#6a3df0)"],["Океан","linear-gradient(160deg,#00c6fb,#005bea)"],["Лес","linear-gradient(160deg,#134e5e,#71b280)"],["Ночь","linear-gradient(160deg,#0f0c29,#302b63 55%,#24243e)"],["Сакура","linear-gradient(160deg,#fbc2eb,#a6c1ee)"],["Графит","#15171c"]];
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}}};
function applyBg(){
  const k=store.get("fz-bg");let v=null;
  if(k==="img"){const d=store.get("fz-bg-img");if(d)v=`linear-gradient(rgba(0,0,0,var(--dim,.18)),rgba(0,0,0,var(--dim,.18))),url("${d}") center/cover no-repeat,#000`}
  else if(k!==null&&presets[k])v=presets[k][1];
  v?root.style.setProperty("--mesh",v):root.style.removeProperty("--mesh");
  document.querySelectorAll("#bgs .sw").forEach((e,i)=>e.classList.toggle("on",String(i)===k));
}
presets.forEach(([name,val],i)=>{
  const b=document.createElement("button");b.className="sw";b.title=name;b.setAttribute("aria-label","Фон: "+name);
  b.style.background=val||"conic-gradient(#7cc4ff,#c6a4ff,#ffb3d4,#8ef0d4,#7cc4ff)";
  b.onclick=()=>{store.set("fz-bg",i);applyBg()};$("bgs").append(b);
});
$("bgUp").onclick=()=>$("bgFile").click();
$("bgFile").onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  const img=new Image(),url=URL.createObjectURL(f);
  img.onload=()=>{const sc=Math.min(1,1400/Math.max(img.width,img.height));
    const c=document.createElement("canvas");c.width=img.width*sc;c.height=img.height*sc;
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    if(store.set("fz-bg-img",c.toDataURL("image/jpeg",.82))){store.set("fz-bg","img");applyBg()}
    else toast("Фото слишком большое для сохранения, выберите другое.")};
  img.src=url;e.target.value="";
};
applyBg();

/* Настройки */
const cfg=Object.assign({fs:16,bl:26,dim:18,an:true,en:true,snd:true,lp:true,qreact:["👍","❤️","😂","🔥","😮","😢"],density:"n",msgTheme:"classic",ttl:0,whoOnline:"all",whoPhoto:"all",whoBio:"all"},(()=>{try{return JSON.parse(store.get("fz-cfg")||"{}")}catch(e){return{}}})());
if(!Array.isArray(cfg.qreact)||!cfg.qreact.length)cfg.qreact=["👍","❤️","😂","🔥","😮","😢"];
const chatWalls=(()=>{try{return JSON.parse(store.get("fz-walls")||"{}")}catch(e){return{}}})();
const folders=(()=>{try{return JSON.parse(store.get("fz-folders")||'{"pins":true}')}catch(e){return{pins:true}}})();
const multi={on:false,ids:new Set()};
const typingKind={};
function notifyTyping(kind){
  if(peer&&peer.id!==me.id&&!peer.isGroup&&channel){
    channel.send({type:"broadcast",event:"typing",payload:{from:me.id,to:peer.id,kind:kind||"text"}});
  }
}
const groupPerms=(()=>{try{return JSON.parse(store.get("fz-gperm")||"{}")}catch(e){return{}}})();
function saveGPerm(){store.set("fz-gperm",JSON.stringify(groupPerms))}
function saveCfg(){store.set("fz-cfg",JSON.stringify(cfg))}
function saveWalls(){store.set("fz-walls",JSON.stringify(chatWalls))}
function saveFolders(){store.set("fz-folders",JSON.stringify(folders))}
function applyCfg(){
  root.style.setProperty("--fs",cfg.fs+"px");root.style.setProperty("--bamt",cfg.bl+"px");
  root.style.setProperty("--dim",cfg.dim/100);root.classList.toggle("noanim",!cfg.an);
}
[["sFs","fs"],["sBl","bl"],["sDim","dim"]].forEach(([id,k])=>{
  $(id).value=cfg[k]; $(id).oninput=()=>{cfg[k]=+$(id).value;store.set("fz-cfg",JSON.stringify(cfg));applyCfg()};
});
[["sAn","an"],["sEn","en"],["sSn","snd"],["sLp","lp"]].forEach(([id,k])=>{
  $(id).checked=cfg[k]; $(id).onchange=()=>{cfg[k]=$(id).checked;store.set("fz-cfg",JSON.stringify(cfg));applyCfg()};
});
applyCfg();
$("rename").onclick=async()=>{
  const v=(await promptD("Новое имя пользователя",me.username)||"").trim();if(!v||v===me.username)return;
  if(!/^[\w.]{3,24}$/.test(v)){toast("Имя: 3–24 символа, буквы, цифры, _ или .");return}
  const {error}=await sb.from("profiles").update({username:v}).eq("id",me.id);
  if(error){toast(/duplicate|unique/i.test(error.message)?"Это имя уже занято":error.message);return}
  me.username=v;$("mName").innerHTML=v+(me.verified?'<span class="verified-badge">✓</span>':'');$("mTag").textContent="@"+v;ava($("mAva"),v,me);if(pageFor&&pageFor.id===me.id)renderPage();
};

/* Кнопка выдачи галочки (только для владельцев) */
$("verifiedBtn").onclick=async()=>{
  if(!me.is_owner){toast("Только владелец может выдавать галочки");return}
  const target=await promptD("Username пользователя (без @)", "");
  if(!target) return;
  const {data:prof}=await sb.from("profiles").select("*").ilike("username",target).single();
  if(!prof){toast("Пользователь не найден");return}
  const action=await ask({title:`Галочка для ${prof.username}`,text:"Выдать или снять галочку?",ok:"Выдать",cancel:"Снять",icon:"✓"});
  if(action===null) return;
  const val=action===true;
  try{
    const {error}=await sb.rpc('set_verified',{kind:'user',target:prof.id,val});
    if(error) throw error;
    toast(val?`Галочка выдана ${prof.username}`:`Галочка снята у ${prof.username}`,2000);
    if(people[prof.id]){people[prof.id].verified=val;if(peer&&peer.id===prof.id){$("pName").innerHTML=prof.username+(val?'<span class="verified-badge">✓</span>':'')}}
    renderList();
  }catch(e){toast("Ошибка: "+e.message)}
};

/* Реальное время */
let online=new Set(),typing={},lastTyped=0,replyTo=null,editing=null;
function refresh(){renderList();if(peer)drawMsgs()}
function initRealtime(){
  beat();initPush();
  channel=sb.channel("fz",{config:{presence:{key:me.id}}})
    .on("postgres_changes",{event:"*",schema:"public",table:"messages"},p=>{
      if(p.eventType==="DELETE"){const id=p.old.id;Object.values(convs).forEach(c=>{const i=c.msgs.findIndex(x=>x.id===id);if(i>=0)c.msgs.splice(i,1)});refresh();return}
      const m=p.new;if(!m.group_id&&m.sender!==me.id&&m.receiver!==me.id)return;receive(m,p.eventType==="INSERT");
    })
    .on("postgres_changes",{event:"*",schema:"public",table:"reactions"},p=>{
      if(p.eventType==="DELETE"){const o=p.old;if(rx[o.message_id])delete rx[o.message_id][o.user_id]}
      else{const n=p.new;(rx[n.message_id]=rx[n.message_id]||{})[n.user_id]=n.emoji}
      if(peer)drawMsgs();
    })
    .on("postgres_changes",{event:"*",schema:"public",table:"group_members"},()=>refreshGroups())
    .on("postgres_changes",{event:"*",schema:"public",table:"groups"},()=>refreshGroups())
    .on("presence",{event:"sync"},()=>{online=new Set(Object.keys(channel.presenceState()));updStatus();renderList()})
    .on("broadcast",{event:"typing"},({payload})=>{
      if(payload.to===me.id){typing[payload.from]=Date.now();typingKind[payload.from]=payload.kind||"text";updStatus();renderListDebounced();setTimeout(()=>{updStatus();renderListDebounced()},3200)}
    })
    .subscribe(async st=>{if(st==="SUBSCRIBED")await channel.track({t:Date.now()})});
}
function updStatus(){
  if(!peer)return;const el=$("pTag");let t,on=false;
  if(peer.isGroup){const n=peer.members.filter(x=>x.user_id!==me.id&&online.has(x.user_id)).length;t=peer.members.length+" участн."+(n?", "+n+" в сети":"");on=n>0}
  else if(peer.id===me.id)t="заметки для себя";
  else if(Date.now()-(typing[peer.id]||0)<3000){
    const kind=typingKind[peer.id]||"text";
    const lab=kind==="voice"?"записывает голосовое":kind==="photo"?"отправляет фото":kind==="file"?"отправляет файл":"печатает";
    t=lab+"<span class='typing-dots'><span>.</span><span>.</span><span>.</span></span>";
    on=true;
  }
  else if(online.has(peer.id)){t="в сети";on=true}else t=seenText(peer);
  el.innerHTML=t;el.classList.toggle("on",on);
}
let readObs=null,pendingRead=new Set();
function observeVisibleRead(){
  if(readObs){readObs.disconnect();readObs=null}
  if(!peer||document.hidden)return;
  const root=$("msgs");
  const peerId=peer.id, isGroup=!!peer.isGroup, meId=me&&me.id;
  readObs=new IntersectionObserver(entries=>{
    if(!peer || peer.id!==peerId) return; // чат уже закрыт / сменился
    const ids=[];
    entries.forEach(en=>{
      if(!en.isIntersecting||en.intersectionRatio<0.55)return;
      const id=en.target.dataset.id;if(!id||pendingRead.has(id))return;
      const m=(convs[peerId]?.msgs||[]).find(x=>x.id===id);
      if(m&&m.sender!==meId&&!m.read_at&&!isGroup){pendingRead.add(id);ids.push(id)}
      if(isGroup&&m&&m.sender!==meId){
        lastRead[peerId]=m.created_at;sv("fz-read",lastRead);
      }
    });
    if(ids.length){
      const now=new Date().toISOString();
      (convs[peerId]?.msgs||[]).forEach(m=>{if(ids.includes(m.id))m.read_at=now});
      if(convs[peerId]){convs[peerId].unread=Math.max(0,(convs[peerId].msgs.filter(m=>m.sender===peerId&&!m.read_at).length));renderList()}
      sb.from("messages").update({read_at:now}).in("id",ids).then(()=>{ids.forEach(i=>pendingRead.delete(i))});
    }
  },{root,threshold:0.55});
  root.querySelectorAll(".b[data-id]").forEach(el=>readObs.observe(el));
}
async function markRead(){
  // Soft: zero badge when opening, real read_at only for visible bubbles via observer
  if(peer&&convs[peer.id]&&convs[peer.id].unread){convs[peer.id].unread=0;renderList()}
  if(peer&&peer.isGroup){const l=vis(peer.id);if(l.length){/* partial — observer updates */}}
  observeVisibleRead();
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&peer){markRead()}else if(readObs){readObs.disconnect();readObs=null}});
function notify(m){if(!document.hidden||!("Notification" in window))return;
  if(Notification.permission==="granted")new Notification(people[m.sender]?.username||"FluxZero",{body:m.body});
  else if(Notification.permission==="default")Notification.requestPermission();
}

/* Поле ввода */
function setTxt(v){
  const t=$("txt");t.value=v;t.style.height="auto";if(v)t.style.height=Math.min(t.scrollHeight,120)+"px";
  $("send").disabled=!v.trim();syncC();if(peer){if(v)drafts[peer.id]=v;else delete drafts[peer.id];saveDrafts()}
}
$("txt").oninput=()=>{
  const t=$("txt");t.style.height="auto";t.style.height=Math.min(t.scrollHeight,120)+"px";
  $("send").disabled=!t.value.trim();syncC();
  if(peer){if(t.value.trim())drafts[peer.id]=t.value;else delete drafts[peer.id];saveDrafts()}
  if(peer&&peer.id!==me.id&&!peer.isGroup&&channel&&Date.now()-lastTyped>2000){
    lastTyped=Date.now();channel.send({type:"broadcast",event:"typing",payload:{from:me.id,to:peer.id,kind:"text"}});
  }
};
$("txt").onkeydown=e=>{
  if(e.key==="Escape"){if(editing||replyTo){if(editing)setTxt("");clearBar();e.preventDefault()}return}
  if(e.key==="ArrowUp"&&!$("txt").value&&!editing&&peer){
    const mine=[...vis(peer.id)].reverse().find(m=>m.sender===me.id&&(!m.kind||m.kind==="text")&&!m._pending);
    if(mine){e.preventDefault();replyTo=null;editing=mine;showBar("Редактирование",mine.body||"");setTxt(mine.body||"");$("txt").focus()}
    return;
  }
  if(e.key==="Enter"&&!e.shiftKey&&cfg.en&&!matchMedia("(pointer:coarse)").matches){e.preventDefault();$("composer").requestSubmit()}
};
function showBar(label,text){$("rN").textContent=label;$("rT").textContent=text;$("rbar").classList.remove("hidden")}
function clearBar(){replyTo=editing=null;$("rbar").classList.add("hidden")}
$("rX").onclick=()=>{if(editing)setTxt("");clearBar()};

/* Меню сообщения */
function startReply(m){editing=null;replyTo=m;showBar(m.sender===me.id?"Вы":people[m.sender]?.username||"",pvw(m));$("txt").focus()}
function bindCtx(el,m){
  /* Реакция ТОЛЬКО из меню. Тап/двойной тап ничего не ставят. */
  let t,x0=0,y0=0,dx=0,mode=null,moved=false;
  const skip="a,img,button,video,audio,.rx,.vc,.st,.mention,.spl";
  const reset=()=>{el.style.transition="transform .25s ease";el.style.transform="";el.style.setProperty("--p",0);setTimeout(()=>el.style.transition="",280)};
  el.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();showCtx(m,e.clientX,e.clientY)};
  el.ondblclick=null;
  el.ontouchstart=e=>{
    if(e.touches.length!==1)return;
    const T=e.touches[0];x0=T.clientX;y0=T.clientY;dx=0;mode=null;moved=false;
    t=setTimeout(()=>{mode="menu";try{navigator.vibrate&&navigator.vibrate(10)}catch(err){};showCtx(m,x0,y0)},480);
  };
  el.ontouchmove=e=>{
    const T=e.touches[0];if(!T)return;
    const mx=T.clientX-x0,my=T.clientY-y0;
    if(!mode&&(Math.abs(mx)>14||Math.abs(my)>14)){
      clearTimeout(t);moved=true;
      mode=(Math.abs(mx)>Math.abs(my)&&mx<0)?"swipe":"scroll";
    }
    if(mode==="swipe"){e.preventDefault();dx=Math.max(mx,-90);el.style.transform="translateX("+dx+"px)";el.style.setProperty("--p",Math.min(1,-dx/60))}
  };
  el.ontouchend=e=>{
    clearTimeout(t);
    if(mode==="menu"){if(e.cancelable)e.preventDefault();return}
    if(mode==="swipe"){if(dx<-55){try{navigator.vibrate&&navigator.vibrate(8)}catch(err){}startReply(m)}reset();return}
    /* single/double tap: do nothing (no reaction) */
  };
  el.ontouchcancel=()=>{clearTimeout(t);if(mode==="swipe")reset()};
}

function closeCtx(){$("ctx").classList.add("hidden");$("ctxBg").classList.add("hidden")}
let ctxAt=0;$("ctxBg").onclick=()=>{if(Date.now()-ctxAt>600)closeCtx()};$("ctxBg").oncontextmenu=e=>{e.preventDefault();if(Date.now()-ctxAt>600)closeCtx()};
function showCtx(m,x,y){
  navigator.vibrate&&navigator.vibrate(10);
  const mine=m.sender===me.id,box=$("ctx");box.innerHTML="";
  const qr=document.createElement("div");qr.className="qr";
  (cfg.qreact||["👍","❤️","😂","🔥","😮","😢"]).forEach(e=>{const b=document.createElement("button");b.textContent=e;b.onclick=()=>{closeCtx();react(m,e)};qr.append(b)});box.append(qr);
  const items=[["Ответить",()=>{editing=null;replyTo=m;showBar(mine?"Вы":people[m.sender]?.username||"",pvw(m));$("txt").focus()}],
    ["Копировать",()=>navigator.clipboard&&navigator.clipboard.writeText(m.body)]];
  items.push(["Переслать",()=>openForward(m)],[m.pinned?"Открепить":"Закрепить",()=>togglePin(m)]);
  if(!mine&&peer.isGroup&&["owner","admin"].includes(peer.members.find(x=>x.user_id===me.id)?.role))items.push(delItem(m));
  if(mine){
    items.push(["Изменить",()=>{replyTo=null;editing=m;showBar("Редактирование",m.body);setTxt(m.body);$("txt").focus()}]);
    items.push(["Удалить",async()=>{if(!await confirmD("Удалить сообщение?"))return;
      const {error}=await sb.from("messages").delete().eq("id",m.id);
      if(error){toast(error.message);return}
      const c=convs[peer.id];c.msgs=c.msgs.filter(z=>z.id!==m.id);refresh();
    },true]);
  }
  items.forEach(([label,fn,danger])=>{const b=document.createElement("button");mkItem(b,label);if(danger)b.className="dng";
    b.onclick=()=>{closeCtx();fn()};box.append(b)});
  ctxAt=Date.now();box.classList.remove("hidden");$("ctxBg").classList.remove("hidden");
  const w=box.offsetWidth,h=box.offsetHeight;
  box.style.left=Math.max(8,Math.min(x,innerWidth-w-8))+"px";box.style.top=Math.max(8,Math.min(y,innerHeight-h-8))+"px";
}

/* Эмодзи */
const EMO={"😀":"😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 😐 😑 😶 😏 😒 🙄 😬 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😲 😳 🥺 😦 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👻 👽 🤖",
"👋":"👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 💪 👀 👅 👄 🧠 🫶 🫡 🫠",
"❤️":"❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💯 💢 💥 💫 💦 💨 🔥 ⭐ 🌟 ✨ ⚡ 🎉 🎊 🎁 🏆 🥇",
"🐶":"🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🦄 🐝 🦋 🐢 🐍 🐙 🐬 🐳 🌸 🌹 🌻 🌳 🌈 ☀️ 🌙 ❄️",
"🍕":"🍎 🍌 🍉 🍓 🍒 🥑 🍅 🌽 🍞 🧀 🍗 🍔 🍟 🌭 🍕 🌮 🍣 🍜 🍩 🍪 🎂 🍫 🍿 ☕ 🍺 🍷 🥂 🍹",
"⚽":"⚽ 🏀 🏈 🎾 🎮 🎧 🎤 🎸 🎬 📷 💻 📱 💡 📚 ✏️ 💰 💎 🚗 ✈️ 🚀 🏠 ⏰ 🔑 🔒 ✅ ❌ ❓ ❗ ⚠️ 🚫"};
let recentEmojis = [];
try { recentEmojis = JSON.parse(localStorage.getItem('fz-recent-emojis') || '[]'); } catch(e){}
function addRecentEmoji(emoji) {
  recentEmojis = recentEmojis.filter(e => e !== emoji);
  recentEmojis.unshift(emoji);
  if (recentEmojis.length > 20) recentEmojis.pop();
  localStorage.setItem('fz-recent-emojis', JSON.stringify(recentEmojis));
}
function showEmo(cat){
  $("eg").innerHTML="";
  let emojis = EMO[cat];
  if (cat === '😀' && recentEmojis.length > 0) {
    emojis = recentEmojis.join(' ') + ' ' + emojis;
  }
  emojis.split(" ").forEach(e=>{
    if(!e) return;
    const b=document.createElement("button");b.type="button";b.textContent=e;
    b.onclick=()=>{
      addRecentEmoji(e);
      const t=$("txt");t.setRangeText(e,t.selectionStart,t.selectionEnd,"end");t.dispatchEvent(new Event("input"));
    };
    $("eg").append(b);
  });
  $("eg").scrollTop=0;document.querySelectorAll("#et button").forEach(b=>b.classList.toggle("on",b.dataset.c===cat));
}
Object.keys(EMO).forEach(c=>{const b=document.createElement("button");b.type="button";b.textContent=c;b.dataset.c=c;b.onclick=()=>showEmo(c);$("et").append(b)});
showEmo("😀");
$("emo").onclick=()=>$("emp").classList.toggle("hidden");
$("msgs").addEventListener("click",()=>$("emp").classList.add("hidden"));

window.addEventListener("error",e=>toast("Ошибка: "+e.message,7000));
window.addEventListener("unhandledrejection",e=>toast("Ошибка: "+(e.reason?.message||e.reason),7000));

/* Вложения, голосовые, реакции */
const BUCKET="chat-files",rx={};
const mmss=x=>{x=Math.round(x||0);return Math.floor(x/60)+":"+String(x%60).padStart(2,"0")};
const fsize=b=>b>1048576?(b/1048576).toFixed(1)+" МБ":Math.max(1,Math.round(b/1024))+" КБ";
function stripMd(s){
  if(!s)return"";
  let t=String(s);
  for(let i=0;i<3;i++){
    t=t.replace(/\*\*([^*\n]+)\*\*/g,"$1")
      .replace(/__([^_\n]+)__/g,"$1")
      .replace(/--([^\-\n]+)--/g,"$1")
      .replace(/~~([^~\n]+)~~/g,"$1")
      .replace(/\|\|([^|\n]+)\|\|/g,"$1")
      .replace(/`([^`\n]+)`/g,"$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g,"$1")
      .replace(/^>\s?/gm,"");
  }
  return t.replace(/\*{1,2}/g,"").replace(/~{1,2}/g,"").replace(/\|{1,2}/g,"");
}
function pvw(m){
  if(!m)return"";
  if(m.kind==="sticker")return m.body||"🖼 Стикер";
  if(m.kind==="gif")return"🎞 GIF";
  if(m.kind==="image")return"📷 "+(stripMd(m.body)||"Фото");
  if(m.kind==="video")return"🎬 "+(stripMd(m.body)||"Видео");
  if(m.kind==="voice")return"🎤 Голосовое сообщение";
  if(m.kind==="file")return"📎 "+(m.file_name||"Файл");
  if(m.kind==="poll")return"📊 Опрос: "+(m.poll?.q||"");
  return stripMd(m.body||"");
}
let toastT;function toast(t,ms=3200){const el=$("toast");clearTimeout(toastT);
  if(!t){el.classList.add("hidden");return}el.textContent=t;el.classList.remove("hidden");if(ms)toastT=setTimeout(()=>el.classList.add("hidden"),ms)}
function syncC(){$("composer").classList.toggle("empty",!$("txt").value.trim()&&!recording&&!pendingFiles.length);if(pendingFiles.length)$("send").disabled=false}
function openLb(u){$("lb").firstChild.src=u;$("lb").classList.remove("hidden")}
$("lb").onclick=()=>$("lb").classList.add("hidden");

async function react(m,emoji){
  const cur=rx[m.id]?.[me.id];(rx[m.id]=rx[m.id]||{});
  if(cur===emoji){delete rx[m.id][me.id];drawMsgs();await sb.from("reactions").delete().match({message_id:m.id,user_id:me.id})}
  else{rx[m.id][me.id]=emoji;drawMsgs();const {error}=await sb.from("reactions").upsert({message_id:m.id,user_id:me.id,emoji});
    if(error)toast("Реакция не сохранилась: "+error.message)}
}

function attach(d,m){
  if(!m.kind||m.kind==="text"||m.kind==="poll"||!m.file_path)return null;
  const url=sb.storage.from(BUCKET).getPublicUrl(m.file_path).data.publicUrl;
  d.classList.add("media");if(!m.body)d.classList.add("mono");
  if(m.kind==="image"){const i=document.createElement("img");i.className="pic";i.loading="lazy";i.alt="";i.src=url;i.onclick=()=>openLb(url);d.append(i)}
  else if(m.kind==="video"){const v=document.createElement("video");v.className="vid";v.src=url;v.controls=true;v.preload="metadata";v.playsInline=true;d.append(v)}
  else if(m.kind==="voice")d.append(voiceEl(m,url));
  else{const a=document.createElement("a");a.className="file";a.href=url;a.target="_blank";a.rel="noopener";a.download=m.file_name||"";
    a.innerHTML='<span class="fi"><svg class="ic" viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5"/></svg></span><span class="fn"><b></b><small></small></span>';
    a.querySelector("b").textContent=m.file_name||"Файл";a.querySelector("small").textContent=fsize(m.file_size||0);d.append(a)}
  if(!m.body)return null;const c=document.createElement("div");c.className="cap";d.append(c);return c;
}

const auds={};
function voiceEl(m,url){
  const w=document.createElement("div");w.className="vc";const total=m.duration||0;
  const b=document.createElement("button");b.type="button";b.className="vp";b.textContent="▶";
  const wv=document.createElement("div");wv.className="wv";const bars=[];let sd=(m.id%97)+3;
  for(let i=0;i<30;i++){sd=(sd*9301+49297)%233280;const e=document.createElement("i");e.style.height=(6+Math.round(sd/233280*18))+"px";wv.append(e);bars.push(e)}
  const du=document.createElement("span");du.className="vd";du.textContent=mmss(total);
  const bind=a=>{
    a.ontimeupdate=()=>{const n=Math.round(a.currentTime/Math.max(total,1)*bars.length);bars.forEach((x,i)=>x.classList.toggle("on",i<n));du.textContent=mmss(a.currentTime)};
    a.onplay=()=>b.textContent="⏸";a.onpause=()=>b.textContent="▶";
    a.onended=()=>{bars.forEach(x=>x.classList.remove("on"));du.textContent=mmss(total)};
  };
  if(auds[m.id]){bind(auds[m.id]);if(!auds[m.id].paused)b.textContent="⏸"}
  b.onclick=()=>{let a=auds[m.id];if(!a){a=auds[m.id]=new Audio(url);bind(a);a.playbackRate=voiceRate}
    Object.values(auds).forEach(o=>{if(o!==a)o.pause()});a.paused?a.play():a.pause()};
  const vr=document.createElement("button");vr.type="button";vr.className="vr";vr.textContent=voiceRate+"×";
  vr.onclick=ev=>{ev.stopPropagation();voiceRate=voiceRate===1?1.5:voiceRate===1.5?2:1;vr.textContent=voiceRate+"×";Object.values(auds).forEach(o=>o.playbackRate=voiceRate)};
  w.append(b,wv,du,vr);return w;
}

async function sendFile(blob,o){
  if(!peer)return;const to=peer.id,rep=replyTo?replyTo.id:null;clearBar();
  const ext=((o.name||"").split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,5)||"bin";
  const path=`${me.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  toast("Отправка…",0);
  const {error}=await sb.storage.from(BUCKET).upload(path,blob,{contentType:(blob.type||"application/octet-stream").split(";")[0]});
  if(error){toast("Не удалось загрузить: "+error.message,5000);return}
  const row={sender:me.id,...tgt(to),body:o.caption||"",kind:o.kind,file_path:path,file_name:o.name,file_size:blob.size,duration:o.duration||null};
  if(rep)row.reply_to=rep;
  const {data,error:e2}=await sb.from("messages").insert(row).select().single();
  if(e2){toast("Не удалось отправить: "+e2.message,5000);return}
  toast(null);push(data,false);if(peer)drawMsgs();renderList();
}
function shrink(f){return new Promise(res=>{const img=new Image(),u=URL.createObjectURL(f);
  img.onload=()=>{const sc=Math.min(1,1600/Math.max(img.width,img.height)),c=document.createElement("canvas");
    c.width=img.width*sc;c.height=img.height*sc;c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);
    c.toBlob(b=>res(b||f),"image/jpeg",.85)};img.onerror=()=>{URL.revokeObjectURL(u);res(f)};img.src=u})}
async function handleFile(f,cap){
  if(!peer)return;if(f.size>50*1048576){toast("Файл больше 50 МБ");return}
  try{notifyTyping(f.type.startsWith("image/")?"photo":"file")}catch(e){}
  if(f.type.startsWith("image/")&&f.type!=="image/gif"){const b=await shrink(f);
    return sendFile(b,{kind:"image",name:(f.name||"photo").replace(/\.\w+$/,"")+".jpg",caption:cap})}
  if(f.type.startsWith("video/")) return sendFile(f,{kind:"video",name:f.name||"video.mp4",caption:cap});
  sendFile(f,{kind:f.type.startsWith("image/")?"image":"file",name:f.name||"file",caption:cap});
}
function clearPendingFiles(){pendingFiles=[];$("fprev").innerHTML="";$("fprev").classList.add("hidden");syncC()}
function renderPendingFiles(){
  const box=$("fprev");box.innerHTML="";
  if(!pendingFiles.length){box.classList.add("hidden");syncC();return}
  box.classList.remove("hidden");
  pendingFiles.forEach((f,i)=>{
    const it=document.createElement("div");it.className="fp-item";
    if(f.type.startsWith("image/")){const im=document.createElement("img");im.src=URL.createObjectURL(f);it.append(im)}
    else if(f.type.startsWith("video/")){const v=document.createElement("video");v.src=URL.createObjectURL(f);v.muted=true;it.append(v)}
    else{const n=document.createElement("div");n.className="fp-n";n.textContent=f.name||"файл";it.append(n)}
    const x=document.createElement("button");x.type="button";x.className="fp-x";x.textContent="×";
    x.onclick=()=>{pendingFiles.splice(i,1);renderPendingFiles()};
    it.append(x);box.append(it);
  });
  $("send").disabled=false;syncC();
}
$("att").onclick=()=>$("fi").click();
$("fi").onchange=e=>{const fs=[...e.target.files];e.target.value="";if(!fs.length)return;pendingFiles.push(...fs);renderPendingFiles()};
$("txt").onpaste=e=>{const fs=[...(e.clipboardData?.files||[])];if(fs.length){e.preventDefault();pendingFiles.push(...fs);renderPendingFiles()}};
// drag-drop on chat
["dragenter","dragover"].forEach(ev=>$("chat").addEventListener(ev,e=>{e.preventDefault();e.dataTransfer.dropEffect="copy"}));
$("chat").addEventListener("drop",e=>{
  e.preventDefault();if(!peer)return;
  const fs=[...e.dataTransfer.files];if(fs.length){pendingFiles.push(...fs);renderPendingFiles()}
});

let recording=null;
async function startRec(){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast("Запись голоса недоступна на этом устройстве");return}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const mime=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":MediaRecorder.isTypeSupported("audio/mp4")?"audio/mp4":"";
    const mr=new MediaRecorder(stream,mime?{mimeType:mime}:{}),chunks=[];
    mr.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    try{notifyTyping("voice")}catch(e){}
    const r=recording={mr,t0:Date.now(),send:false,
      timer:setInterval(()=>{const s=(Date.now()-r.t0)/1000;$("rt").textContent=mmss(s);if(s>300)stopRec(true)},250)};
    mr.onstop=()=>{stream.getTracks().forEach(x=>x.stop());clearInterval(r.timer);
      const dur=Math.round((Date.now()-r.t0)/1000);recording=null;
      $("composer").classList.remove("recording");$("rec").classList.add("hidden");syncC();
      if(!r.send)return;if(dur<1){toast("Слишком короткое сообщение");return}
      const type=mr.mimeType||"audio/webm";
      sendFile(new Blob(chunks,{type}),{kind:"voice",duration:dur,name:"voice."+(type.includes("mp4")?"m4a":"webm")})};
    mr.start();$("rt").textContent="0:00";$("rec").classList.remove("hidden");
    $("composer").classList.add("recording");$("send").disabled=false;syncC();$("emp").classList.add("hidden");
  }catch(e){toast("Нет доступа к микрофону. Разрешите его в настройках.",4500)}
}
function stopRec(send){if(recording){recording.send=send;recording.mr.stop()}}
$("mic").onclick=startRec;$("rc").onclick=()=>stopRec(false);

/* v5: профили, управление чатами */
const J=(k,d)=>{try{return JSON.parse(store.get(k)||"null")??d}catch(e){return d}};
const pins=new Set(J("fz-pins",[])),mutes=new Set(J("fz-mutes",[])),archives=new Set(J("fz-arch",[])),cut=J("fz-cut",{}),drafts=J("fz-drafts",{}),blocked=new Set(J("fz-block",[]));
const sv=(k,v)=>store.set(k,JSON.stringify(v));
const savePins=()=>sv("fz-pins",[...pins]),saveMutes=()=>sv("fz-mutes",[...mutes]),saveArch=()=>sv("fz-arch",[...archives]),saveCut=()=>sv("fz-cut",cut),saveDrafts=()=>sv("fz-drafts",drafts),saveBlock=()=>sv("fz-block",[...blocked]);
let below=0,stick=true,divId=null,pinId=null,sm=[],si=0;
function vis(pid){let l=convs[pid]?.msgs||[];const c=cut[pid];if(c)l=l.filter(m=>new Date(m.created_at)>new Date(c));
  if(cfg.ttl){const cutMs=Date.now()-cfg.ttl*1000;l=l.filter(m=>+new Date(m.created_at)>=cutMs)}
  return l}

function showMenu(items,x,y){const box=$("ctx");box.innerHTML="";
  items.forEach(([label,fn,danger])=>{const b=document.createElement("button");mkItem(b,label);if(danger)b.className="dng";
    b.onclick=()=>{closeCtx();fn()};box.append(b)});
  ctxAt=Date.now();box.classList.remove("hidden");$("ctxBg").classList.remove("hidden");
  const w=box.offsetWidth,h=box.offsetHeight;
  box.style.left=Math.max(8,Math.min(x,innerWidth-w-8))+"px";box.style.top=Math.max(8,Math.min(y,innerHeight-h-8))+"px";
}
function modal(el){const m=$("modal");m.innerHTML="";const c=document.createElement("div");c.className="mcard";c.append(el);m.append(c);m.classList.remove("hidden")}
$("modal").onclick=e=>{if(e.target===$("modal"))$("modal").classList.add("hidden")};

function chatItems(p){const id=p.id;return[
  [pins.has(id)?"Открепить чат":"Закрепить чат",()=>{pins.has(id)?pins.delete(id):pins.add(id);savePins();renderList()}],
  [archives.has(id)?"Из архива":"В архив",()=>{archives.has(id)?archives.delete(id):archives.add(id);if(archives.has(id))pins.delete(id);saveArch();savePins();if(peer&&peer.id===id)closeChat();renderList()}],
  id!==me.id&&[mutes.has(id)?"Включить звук":"Отключить звук",()=>{mutes.has(id)?mutes.delete(id):mutes.add(id);saveMutes();renderList()}],
  id!==me.id&&!p.isGroup&&[blocked.has(id)?"Разблокировать":"Заблокировать",async()=>{
    if(!blocked.has(id)&&!await confirmD("Заблокировать "+p.username+"? Сообщения от него больше не будут приходить (локально)."))return;
    blocked.has(id)?blocked.delete(id):blocked.add(id);saveBlock();toast(blocked.has(id)?"Заблокирован":"Разблокирован");renderList();
  },!blocked.has(id)],
  id!==me.id&&[p.isGroup?"О группе":"Профиль",()=>openProfile(p)],
  p.isGroup&&["owner","admin"].includes((p.members||[]).find(x=>x.user_id===me.id)?.role)&&["Права группы",()=>{
    const cur=groupPerms[id]||{write:true,pin:true,media:true};
    const write=confirm("Участники могут писать? Сейчас: "+(cur.write?"да":"нет")+". OK=да, Отмена=нет");
    const pin=confirm("Участники могут закреплять? OK=да");
    const media=confirm("Участники могут слать медиа? OK=да");
    groupPerms[id]={write:!!write,pin:!!pin,media:!!media};saveGPerm();toast("Права сохранены (локально)");
  }],
  ["Обои этого чата",()=>{
    const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
    inp.onchange=()=>{const f=inp.files[0];if(!f)return;const fr=new FileReader();fr.onload=()=>{chatWalls[id]=fr.result;saveWalls();if(peer&&peer.id===id)applyLookExtras();toast("Обои установлены")};fr.readAsDataURL(f)};
    inp.click();
  }],
  chatWalls[id]&&["Сбросить обои чата",()=>{delete chatWalls[id];saveWalls();if(peer&&peer.id===id)applyLookExtras();toast("Обои сброшены")}],
  [(folders.custom||[]).includes(id)?"Убрать из папки":"В папку",()=>{
    if(!folders.custom)folders.custom=[];
    const i=folders.custom.indexOf(id);
    if(i>=0)folders.custom.splice(i,1);else folders.custom.push(id);
    saveFolders();renderList();toast(i>=0?"Убрано из папки":"Добавлено в папку");
  }],
  ["Пометить непрочитанным",()=>{if(convs[id]){convs[id].unread=Math.max(1,convs[id].unread);renderList()}}],
  ["Очистить историю",()=>clearChat(p,false),true],
  p.isGroup?["Покинуть группу",()=>leaveGroup(p),true]:["Удалить чат",()=>clearChat(p,true),true]].filter(Boolean);
}
async function clearChat(p,del){
  if(!await confirmD(del?"Удалить чат? Он исчезнет только у вас, у собеседника всё останется.":"Очистить историю? Она исчезнет только у вас."))return;
  const l=convs[p.id]?.msgs||[];if(l.length){cut[p.id]=l[l.length-1].created_at;saveCut();convs[p.id].unread=0}
  delete drafts[p.id];saveDrafts();if(del)pins.delete(p.id);savePins();
  if(peer&&peer.id===p.id){del?closeChat():drawMsgs()}renderList();
}
function closeChat(){
  // Важно: сначала отключаем observer, иначе callback читает peer.id после null
  if(typeof readObs!=="undefined"&&readObs){try{readObs.disconnect()}catch(e){} readObs=null}
  peer=null;
  const app=$("app"), side=$("side"), chat=$("chat");
  if(app) app.classList.remove("open");
  // жёстко сбрасываем transform, чтобы список не оставался «обрезанным»
  if(side){side.style.transform="";side.style.opacity="";side.style.pointerEvents=""}
  if(chat){chat.style.transform="";chat.style.pointerEvents=""}
  try{closeSearch()}catch(e){}
  ["top","msgs","composer","pinbar"].forEach(i=>{const el=$(i);if(el)el.classList.add("hidden")});
  const empty=$("empty");if(empty)empty.classList.remove("hidden");
  try{renderList()}catch(e){}
  try{updateFabVisibility()}catch(e){}
}
function bindRow(r,p){let t,fired=false;
  const open=(x,y)=>{fired=true;showMenu(chatItems(p),x,y)};
  r.oncontextmenu=e=>{e.preventDefault();open(e.clientX,e.clientY)};
  r.ontouchstart=e=>{fired=false;const T=e.touches[0];t=setTimeout(()=>{navigator.vibrate&&navigator.vibrate(12);open(T.clientX,T.clientY)},450)};
  r.ontouchmove=r.ontouchcancel=()=>clearTimeout(t);
  r.ontouchend=e=>{clearTimeout(t);if(fired&&e.cancelable)e.preventDefault()};
}
$("more").onclick=e=>{if(!peer)return;const r=e.currentTarget.getBoundingClientRect();
  showMenu([["Поиск по чату",openSearch],...chatItems(peer)],r.right-210,r.bottom+4)};

function seenText(p){
  if(cfg.whoOnline==="nobody"&&p.id!==me.id)return"был(а) недавно";
  if(!p.last_seen)return"не в сети";const d=new Date(p.last_seen),s=(Date.now()-d)/1000;
  if(s<90)return"был(а) в сети только что";if(s<3600)return"был(а) в сети "+Math.floor(s/60)+" мин. назад";
  if(d.toDateString()===new Date().toDateString())return"был(а) в сети сегодня в "+tm(p.last_seen);
  if(d.toDateString()===new Date(Date.now()-864e5).toDateString())return"был(а) в сети вчера в "+tm(p.last_seen);
  return"был(а) в сети "+d.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
async function refreshPeer(){if(!peer||peer.isGroup||peer.id===me.id)return;const id=peer.id;
  const {data}=await sb.from("profiles").select("*").eq("id",id).single();
  if(data&&peer&&peer.id===id){Object.assign(peer,data);ava($("pAva"),peer.username,peer);updStatus()}}
async function beat(){if(me)await sb.from("profiles").update({last_seen:new Date().toISOString()}).eq("id",me.id)}
setInterval(()=>{if(!document.hidden){beat();refreshPeer()}},60000);
setInterval(()=>{if(!document.hidden&&tab==="chats")renderList()},30000);
setInterval(()=>{const now=Date.now();Object.keys(typing).forEach(id=>{if(now-(typing[id]||0)>=3000)delete typing[id]});if(Object.keys(typing).length||document.querySelector(".typing-list"))renderList()},2000);
document.addEventListener("visibilitychange",beat);addEventListener("pagehide",beat);
$("pBox").onclick=$("pAva").onclick=()=>{if(peer&&peer.id!==me.id)openProfile(peer)};
function square(f,n){return new Promise(res=>{const img=new Image(),u=URL.createObjectURL(f);
  img.onload=()=>{const c=document.createElement("canvas");c.width=c.height=n;const k=Math.min(img.width,img.height);
    c.getContext("2d").drawImage(img,(img.width-k)/2,(img.height-k)/2,k,k,0,0,n,n);URL.revokeObjectURL(u);c.toBlob(b=>res(b),"image/jpeg",.88)};
  img.onerror=()=>{URL.revokeObjectURL(u);res(null)};img.src=u})}
$("avBtn").onclick=$("mAva").onclick=()=>$("avFile").click();
$("avFile").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;
  toast("Загрузка фото…",0);const b=await square(f,512);if(!b){toast("Не удалось открыть фото");return}
  const path=`${me.id}/avatar-${Date.now()}.jpg`;
  const {error}=await sb.storage.from(BUCKET).upload(path,b,{contentType:"image/jpeg"});
  if(error){toast("Не удалось загрузить: "+error.message,5000);return}
  const old=me.avatar_path,{error:e2}=await sb.from("profiles").update({avatar_path:path}).eq("id",me.id);
  if(e2){toast("Не удалось сохранить: "+e2.message,6000);return}
  me.avatar_path=path;ava($("mAva"),me.username,me);if(old)sb.storage.from(BUCKET).remove([old]);toast("Фото обновлено",1800);if(pageFor&&pageFor.id===me.id)renderPage()};
$("bioBtn").onclick=async()=>{const v=await promptD("О себе (до 140 символов)",me.bio||"");if(v===null)return;
  const b=v.trim().slice(0,140),{error}=await sb.from("profiles").update({bio:b}).eq("id",me.id);
  if(error){toast("Не удалось сохранить: "+error.message,5000);return}me.bio=b;$("mBio").textContent=b;if(pageFor&&pageFor.id===me.id)renderPage()};

let ac;const actx=()=>{try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==="suspended")ac.resume()}catch(e){}};
document.addEventListener("pointerdown",actx,{once:true});
function ding(){try{actx();const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type="sine";
  o.frequency.setValueAtTime(880,t);o.frequency.exponentialRampToValueAtTime(1320,t+.09);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.18,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.28);
  o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+.3)}catch(e){}}

function setDn(){$("dn").textContent=below;$("dn").classList.toggle("hidden",!below)}
$("msgs").addEventListener("scroll",()=>{const s=$("msgs"),far=s.scrollHeight-s.scrollTop-s.clientHeight>260;
  $("down").classList.toggle("hidden",!far);if(!far&&below){below=0;setDn()}});
$("down").onclick=()=>{below=0;setDn();$("msgs").scrollTo({top:$("msgs").scrollHeight,behavior:"smooth"})};

function updatePin(){if(!peer)return;const l=vis(peer.id).filter(m=>m.pinned),has=l.length>0;
  $("pinbar").classList.toggle("hidden",!has);$("msgs").classList.toggle("haspin",has);
  if(has){const m=l[l.length-1];pinId=m.id;const el=$("pinT");el.textContent="";
    if(m.kind&&m.kind!=="text"&&m.kind!=="sticker")el.textContent=pvw(m);
    else{try{richText(el,m.body||"")}catch(e){el.textContent=stripMd(m.body||"")}}
  }}
async function togglePin(m){const v=!m.pinned;m.pinned=v;drawMsgs();
  const {error}=await sb.from("messages").update({pinned:v}).eq("id",m.id);
  if(error){m.pinned=!v;drawMsgs();toast("Не удалось закрепить: "+error.message,5000)}}
$("pinbar").onclick=()=>pinId&&jumpTo(pinId);
$("pinX").onclick=e=>{e.stopPropagation();const m=vis(peer.id).find(x=>x.id===pinId);if(m)togglePin(m)};

function openSearch(){$("sbar").classList.remove("hidden");$("chat").classList.add("srch");$("sq").value="";$("sc").textContent="";setTimeout(()=>$("sq").focus(),50)}
function closeSearch(){$("sbar").classList.add("hidden");$("chat").classList.remove("srch");sm=[]}
function goMatch(){$("sc").textContent=sm.length?(si+1)+" из "+sm.length:($("sq").value?"нет":"");if(sm.length)jumpTo(sm[si])}
$("sq").oninput=()=>{const q=$("sq").value.trim().toLowerCase();
  sm=q&&peer?vis(peer.id).filter(m=>((m.body||"")+" "+(m.file_name||"")).toLowerCase().includes(q)).map(m=>m.id):[];si=sm.length-1;goMatch();
  document.querySelectorAll(".hl-match").forEach(el=>{const p=el.parentNode;while(el.firstChild)p.insertBefore(el.firstChild,el);p.removeChild(el);p.normalize()});
  if(q&&sm.length){document.querySelectorAll(".b[data-id]").forEach(el=>{
    if(!sm.includes(el.dataset.id))return;
    el.childNodes.forEach(n=>{if(n.nodeType===3&&n.textContent.toLowerCase().includes(q)){
      const t=n.textContent,i=t.toLowerCase().indexOf(q),span=document.createElement("mark");span.className="hl-match";
      span.textContent=t.slice(i,i+q.length);const after=document.createTextNode(t.slice(i+q.length));
      n.textContent=t.slice(0,i);n.parentNode.insertBefore(span,n.nextSibling);span.after(after);
    }});
  })}
};
$("sUp").onclick=()=>{if(sm.length){si=(si-1+sm.length)%sm.length;goMatch()}};
$("sDn").onclick=()=>{if(sm.length){si=(si+1)%sm.length;goMatch()}};$("sX").onclick=closeSearch;

function openForward(m){
  const box=document.createElement("div"),h=document.createElement("h3");h.textContent="Переслать";box.append(h);
  const ids=[me.id,...Object.keys(convs).filter(i=>i!==me.id&&people[i]&&vis(i).length)];
  ids.forEach(id=>{const p=people[id],r=document.createElement("button");r.className="row";
    const a=document.createElement("div");a.className="ava";ava(a,id===me.id?"★":p.username,p);a.style.width=a.style.height="44px";
    const n=document.createElement("div");n.className="n";n.textContent=id===me.id?"Избранное":p.username;
    r.append(a,n);r.onclick=()=>{$("modal").classList.add("hidden");forwardTo(m,id)};box.append(r)});
  modal(box);
}
async function forwardTo(m,to){
  const row={sender:me.id,...tgt(to),body:m.body||"",kind:m.kind||"text",file_path:m.file_path,file_name:m.file_name,
    file_size:m.file_size,duration:m.duration,fwd_name:m.fwd_name||(m.sender===me.id?me.username:people[m.sender]?.username)};
  const {data,error}=await sb.from("messages").insert(row).select().single();
  if(error){toast("Не удалось переслать: "+error.message,5000);return}
  push(data,false);renderList();if(peer)drawMsgs();toast("Переслано",1800);
}

/* v6: группы и push */
const lastRead=J("fz-read",{});let pushTok=null,groupPhotoFor=null;
const cid=m=>m.group_id?"g"+m.group_id:(m.sender===me.id?m.receiver:m.sender);
const tgt=id=>{
  if(!id) return {};
  if(String(id)[0]==="g"){
    const g=people[id];
    return g&&g.gid ? {group_id:g.gid} : {};
  }
  return {receiver:id};
};
const sortKey=i=>new Date(i.last?i.last.created_at:(i.p.created_at||0));
function firstUnread(p){const l=vis(p.id);
  return(p.isGroup?l.find(m=>m.sender!==me.id&&new Date(m.created_at)>new Date(lastRead[p.id]||0)):l.find(m=>m.sender===p.id&&m.read_at===null))?.id||null}

async function loadGroups(){
  const {data:gs,error}=await sb.from("groups").select("*");if(error)return;
  const {data:ms}=await sb.from("group_members").select("*");
  const byG={};(ms||[]).forEach(r=>(byG[r.group_id]=byG[r.group_id]||[]).push(r));
  const need=[...new Set((ms||[]).map(r=>r.user_id))].filter(i=>!people[i]);
  if(need.length){const {data:ps}=await sb.from("profiles").select("*").in("id",need);(ps||[]).forEach(p=>people[p.id]=p)}
  const keep=new Set();
  (gs||[]).forEach(g=>{const id="g"+g.id;keep.add(id);const o=people[id]||{};
    Object.assign(o,{id,gid:g.id,isGroup:true,username:g.name,avatar_path:g.avatar_path,owner:g.owner,created_at:g.created_at,members:byG[g.id]||[],verified:g.verified});
    people[id]=o;convs[id]=convs[id]||{msgs:[],unread:0}});
  Object.keys(people).filter(i=>people[i].isGroup&&!keep.has(i)).forEach(i=>{delete people[i];delete convs[i]});
}
async function refreshGroups(){await loadGroups();if(pageFor&&pageFor.isGroup&&!people[pageFor.id])closePage();
  if(peer&&peer.isGroup){if(!people[peer.id])closeChat();else{peer=people[peer.id];$("pName").innerHTML=peer.username+(peer.verified?'<span class="verified-badge">✓</span>':'');ava($("pAva"),peer.username,peer);updStatus()}}
  renderList();
}
async function afterGroup(p){await refreshGroups();if(pageFor&&pageFor.id===p.id&&people[p.id]){pageFor=people[p.id];renderPage()}}

function pickUsers(o){
  const box=document.createElement("div"),h=document.createElement("h3");h.textContent=o.title;box.append(h);
  let nm=null;if(o.name){nm=document.createElement("input");nm.className="gname";nm.placeholder="Название группы";nm.maxLength=40;box.append(nm)}
  const sel=new Set(),list=document.createElement("div");list.className="plist";
  const q=document.createElement("input");q.className="gname";q.placeholder="Поиск";q.oninput=()=>[...list.children].forEach(r=>{r.style.display=(r.dataset.n||"").includes(q.value.trim().toLowerCase())?"":"none"});if(o.users.length>6)box.append(q);
  if(!o.users.length)list.innerHTML='<div class="hint">Некого добавить</div>';
  o.users.forEach(u=>{const r=document.createElement("button");r.type="button";r.className="row";
    const a=document.createElement("div");a.className="ava";ava(a,u.username,u);a.style.width=a.style.height="42px";a.style.fontSize="16px";
    const n=document.createElement("div");n.className="rt";n.innerHTML='<div class="n"></div>';n.firstChild.textContent=u.username;
    const ck=document.createElement("span");ck.className="ck";
    r.dataset.n=u.username.toLowerCase();r.append(a,n,ck);r.onclick=()=>{sel.has(u.id)?sel.delete(u.id):sel.add(u.id);r.classList.toggle("sel",sel.has(u.id));ck.textContent=sel.has(u.id)?"✓":""};list.append(r)});
  box.append(list);const go=document.createElement("button");go.className="go";go.textContent=o.btn;
  go.onclick=()=>o.onOk([...sel],nm&&nm.value.trim());box.append(go);modal(box);if(nm)setTimeout(()=>nm.focus(),80);
}
async function allUsers(){const {data}=await sb.from("profiles").select("*").neq("id",me.id).order("username").limit(300);return data||[]}

$("newG").onclick=async()=>{const users=await allUsers();
  pickUsers({title:"Новая группа",name:true,users,btn:"Создать",onOk:async(ids,name)=>{
    if(!name){toast("Введите название группы");return}
    const {data,error}=await sb.rpc("create_group",{gname:name,member_ids:ids});
    if(error){toast("Не удалось создать: "+error.message,6000);return}
    $("modal").classList.add("hidden");await loadGroups();renderList();const g=people["g"+data];if(g)openChat(g);
  }});
};

async function renameGroup(p){const v=(await promptD("Название группы",p.username)||"").trim().slice(0,40);if(!v||v===p.username)return;
  const {error}=await sb.from("groups").update({name:v}).eq("id",p.gid);if(error){toast(error.message,5000);return}afterGroup(p)}
async function addMembers(p){const have=new Set(p.members.map(x=>x.user_id)),users=(await allUsers()).filter(u=>!have.has(u.id));
  pickUsers({title:"Добавить участников",users,btn:"Добавить",onOk:async ids=>{if(!ids.length)return;
    const {error}=await sb.from("group_members").insert(ids.map(user_id=>({group_id:p.gid,user_id})));
    if(error){toast(error.message,5000);return}$("modal").classList.add("hidden");await afterGroup(p)}});
}
async function setRole(p,uid,role){const {error}=await sb.from("group_members").update({role}).match({group_id:p.gid,user_id:uid});
  if(error){toast(error.message,5000);return}afterGroup(p)}
async function kick(p,uid){if(!await confirmD("Исключить участника из группы?"))return;
  const {error}=await sb.from("group_members").delete().match({group_id:p.gid,user_id:uid});if(error){toast(error.message,5000);return}afterGroup(p)}
async function leaveGroup(p){
  if(p.owner===me.id){toast("Владелец не может выйти. Удалите группу.",4000);return}
  if(!await confirmD("Покинуть группу «"+p.username+"»?"))return;
  const {error}=await sb.from("group_members").delete().match({group_id:p.gid,user_id:me.id});if(error){toast(error.message,5000);return}
  closePage();$("modal").classList.add("hidden");await refreshGroups();
}
async function deleteGroup(p){if(!await confirmD("Удалить группу «"+p.username+"» для всех? Это нельзя отменить."))return;
  const {error}=await sb.from("groups").delete().eq("id",p.gid);if(error){toast(error.message,5000);return}
  closePage();$("modal").classList.add("hidden");await refreshGroups();
}
$("gFile").onchange=async e=>{const f=e.target.files[0];e.target.value="";const g=groupPhotoFor;if(!f||!g)return;
  toast("Загрузка фото…",0);const b=await square(f,512);if(!b){toast("Не удалось открыть фото");return}
  const path=`${me.id}/group-${g.gid}-${Date.now()}.jpg`,{error}=await sb.storage.from(BUCKET).upload(path,b,{contentType:"image/jpeg"});
  if(error){toast("Не удалось загрузить: "+error.message,5000);return}
  const {error:e2}=await sb.from("groups").update({avatar_path:path}).eq("id",g.gid);
  if(e2){toast(e2.message,5000);return}toast("Фото обновлено",1800);afterGroup(g)};

async function initPush(){syncPush();openFromUrl();
  const P=window.Capacitor?.Plugins?.PushNotifications;if(!P)return;
  try{let st=await P.checkPermissions();if(st.receive!=="granted")st=await P.requestPermissions();if(st.receive!=="granted")return;
    P.createChannel&&await P.createChannel({id:"messages",name:"Сообщения",importance:5,visibility:1,vibration:true});
    P.addListener("registration",async t=>{pushTok=t.value;await sb.rpc("register_device",{tok:t.value})});
    P.addListener("pushNotificationActionPerformed",a=>{const id=a.notification?.data?.chat;if(id&&people[id])openChat(people[id])});
    await P.register()}catch(e){}}

let flt="all",voiceRate=1;
document.querySelectorAll("#chips button").forEach(b=>b.onclick=()=>{flt=b.dataset.f;
  document.querySelectorAll("#chips button").forEach(x=>x.classList.toggle("on",x===b));renderList()});

function richText(el,txt){
  if(!txt)return;
  const re=/(\*\*[^*\n]+\*\*|__[^_\n]+__|--[^\-\n]+--|~~[^~\n]+~~|`[^`\n]+`|\|\|[^|\n]+\|\||@[\w.]{2,32})/g;
  String(txt).split(re).forEach(function(t,i){
    if(!t)return;
    if(i%2===0){el.appendChild(document.createTextNode(t));return}
    if(t.charAt(0)==="`"){var c=document.createElement("code");c.textContent=t.slice(1,-1);el.appendChild(c);return}
    if(t.charAt(0)==="@"){
      var a=document.createElement("span");a.className="mention";a.textContent=t;
      var uname=t.slice(1).toLowerCase();
      var hit=Object.values(people).find(function(p){return !p.isGroup&&(p.username||"").toLowerCase()===uname});
      if(hit){a.style.cursor="pointer";a.onclick=function(ev){ev.stopPropagation();openChat(hit)}}
      el.appendChild(a);return;
    }
    var mk=t.slice(0,2), e;
    if(mk==="**")e=document.createElement("strong");
    else if(mk==="__")e=document.createElement("em");
    else if(mk==="--")e=document.createElement("u");
    else if(mk==="~~")e=document.createElement("s");
    else{e=document.createElement("span");e.className="spl";e.onclick=function(ev){ev.stopPropagation();e.classList.toggle("on")}}
    e.textContent=t.slice(2,-2);
    el.appendChild(e);
  });
}
function wrapSel(before,after){
  const t=$("txt");if(!t)return;const a=t.selectionStart,b=t.selectionEnd;const v=t.value;
  if(a===b){t.value=v.slice(0,a)+before+after+v.slice(b);t.selectionStart=a+before.length;t.selectionEnd=a+before.length}
  else{const sel=v.slice(a,b);t.value=v.slice(0,a)+before+sel+after+v.slice(b);t.selectionStart=a;t.selectionEnd=a+before.length+sel.length+after.length}
  t.focus();t.dispatchEvent(new Event("input"));
}
function openFmtMenu(x,y){
  let m=$("fmtM");if(!m){m=document.createElement("div");m.id="fmtM";document.body.append(m)}
  const items=[
    ["Жирный",()=>wrapSel("**","**")],
    ["Курсив",()=>wrapSel("__","__")],
    ["Подчёркнутый",()=>wrapSel("--","--")],
    ["Зачёркнутый",()=>wrapSel("~~","~~")],
    ["Моноширинный",()=>wrapSel("`","`")],
    ["Скрытый",()=>wrapSel("||","||")],
    ["Ссылка",()=>{const u=prompt("URL");if(u)wrapSel("[","]("+u+")")}],
    ["Цитата",()=>{const t=$("txt");const a=t.selectionStart,b=t.selectionEnd;const sel=t.value.slice(a,b)||"";const lines=(sel||"текст").split("\n").map(l=>"> "+l).join("\n");t.value=t.value.slice(0,a)+lines+t.value.slice(b);t.focus();t.dispatchEvent(new Event("input"))}],
  ];
  m.innerHTML="";items.forEach(([lab,fn])=>{const b=document.createElement("button");b.type="button";b.textContent=lab;b.onclick=()=>{fn();m.classList.add("hidden")};m.append(b)});
  m.classList.remove("hidden");
  const w=m.offsetWidth||220,h=m.offsetHeight||280;
  m.style.left=Math.max(8,Math.min(x||innerWidth/2,innerWidth-w-8))+"px";
  m.style.top=Math.max(8,Math.min((y||innerHeight-120)-h,innerHeight-h-8))+"px";
}
document.addEventListener("click",e=>{const m=$("fmtM");if(m&&!m.contains(e.target)&&e.target.id!=="fmtBtn")m.classList.add("hidden")});

function delItem(m){return["Удалить",async()=>{if(!await confirmD("Удалить сообщение?"))return;
  const {error}=await sb.from("messages").delete().eq("id",m.id);if(error){toast(error.message,5000);return}
  const c=convs[peer.id];c.msgs=c.msgs.filter(z=>z.id!==m.id);refresh()},true]}

const accs=["","#7a5cff","#e1578a","#f29d38","#22b573","#14b8c4"];
function applyAcc(){const v=store.get("fz-acc");
  if(!v)["--accent","--mine","--grad"].forEach(k=>root.style.removeProperty(k));
  else{const n=parseInt(v.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255,mx=c=>Math.round(c+(255-c)*.28);
    root.style.setProperty("--accent",v);root.style.setProperty("--mine",`rgba(${r},${g},${b},.84)`);
    root.style.setProperty("--grad",`linear-gradient(160deg,rgb(${mx(r)},${mx(g)},${mx(b)}),${v})`)}
  document.querySelectorAll("#accs .sw").forEach((e,i)=>e.classList.toggle("on",accs[i]===(v||"")))}
accs.forEach((c,i)=>{const b=document.createElement("button");b.className="sw";b.setAttribute("aria-label","Цвет "+(i+1));
  b.style.background=c||"#2f8cf5";b.onclick=()=>{store.set("fz-acc",c);applyAcc()};$("accs").append(b)});
applyAcc();

let bnT;
function banner(pid,m){const p=people[pid];if(!p)return;const el=$("banner");el.innerHTML="";
  const a=document.createElement("div");a.className="ava";ava(a,p.username,p);a.style.width=a.style.height="40px";a.style.fontSize="16px";
  const t=document.createElement("div");t.className="rt";const n=document.createElement("div");n.className="n";n.innerHTML=p.username+(p.verified?'<span class="verified-badge">✓</span>':'');
  const x=document.createElement("div");x.className="p";x.textContent=(p.isGroup?(people[m.sender]?.username||"")+": ":"")+pvw(m);
  t.append(n,x);el.append(a,t);el.onclick=()=>{el.classList.add("hidden");openChat(p)};
  el.classList.remove("hidden");el.style.animation="none";void el.offsetWidth;el.style.animation="";
  clearTimeout(bnT);bnT=setTimeout(()=>el.classList.add("hidden"),4500);
}

let armed=false,skipPop=0;
const isMob=()=>matchMedia("(max-width:760px)").matches,shown=id=>!$(id).classList.contains("hidden");
const anyOpen=()=>shown("ctx")||shown("lb")||shown("modal")||shown("emp")||shown("sbar")||shown("pview")||shown("dlg")||(isMob()&&$("app").classList.contains("open"));
function navSync(){try{
  if(anyOpen()&&!armed){history.pushState({fz:1},"");armed=true}
  else if(!anyOpen()&&armed){armed=false;skipPop++;history.back()}}catch(e){}}
addEventListener("popstate",()=>{
  if(skipPop>0){skipPop--;return}
  armed=false;
  if(shown("dlg")){dlgCancel&&dlgCancel()}else if(shown("ctx"))closeCtx();else if(shown("lb"))$("lb").classList.add("hidden");else if(shown("modal"))$("modal").classList.add("hidden");else if(shown("pview"))closePage();
  else if(shown("emp"))$("emp").classList.add("hidden");else if(shown("sbar"))closeSearch();
  else if(isMob()&&$("app").classList.contains("open")){closeChat()}
  navSync();
});
const navMo=new MutationObserver(navSync);
["ctx","lb","modal","emp","sbar","app","pview","dlg"].forEach(id=>navMo.observe($(id),{attributes:true,attributeFilter:["class"]}));

/* v8: страница профиля, диалоги, Web Push */
const MI={"Ответить":"↩️","Копировать":"📋","Переслать":"➡️","Закрепить":"📌","Открепить":"📌","Изменить":"✏️","Удалить":"🗑️","Поиск по чату":"🔍","Закрепить чат":"📌","Открепить чат":"📌","Отключить звук":"🔕","Включить звук":"🔔","Профиль":"👤","О группе":"👥","Очистить историю":"🧹","Удалить чат":"🗑️","Покинуть группу":"🚪","Исключить из группы":"🚫","Сделать админом":"⭐","Снять админа":"⭐","В архив":"📦","Из архива":"📤","Заблокировать":"🚫","Разблокировать":"✅","Пометить непрочитанным":"🔵"};
function mkItem(b,label){const i=document.createElement("span");i.className="mi";i.textContent=MI[label]||"•";b.append(i,label)}

let dlgCancel=null;
function ask(o){return new Promise(res=>{
  const d=$("dlg"),card=$("dlgCard");card.innerHTML="";
  const ic=document.createElement("div");ic.className="dic"+(o.danger?" red":"");ic.textContent=o.icon||(o.danger?"!":o.input!=null?"✎":"?");card.append(ic);
  if(o.title){const h=document.createElement("h3");h.textContent=o.title;card.append(h)}
  if(o.text){const t=document.createElement("p");t.textContent=o.text;card.append(t)}
  let inp=null;
  if(o.input!=null){inp=document.createElement(o.multi?"textarea":"input");inp.className="gname";inp.value=o.input;inp.maxLength=o.max||200;if(o.multi)inp.rows=3;card.append(inp)}
  const row=document.createElement("div");row.className="drow";
  const c=document.createElement("button");c.type="button";c.className="dbtn";c.textContent=o.cancel||"Отмена";
  const k=document.createElement("button");k.type="button";k.className="dbtn ok"+(o.danger?" red":"");k.textContent=o.ok||"Готово";
  row.append(c,k);card.append(row);
  const done=v=>{d.classList.add("hidden");dlgCancel=null;res(v)};
  dlgCancel=()=>done(inp?null:false);
  c.onclick=dlgCancel;k.onclick=()=>done(inp?inp.value:true);
  d.onclick=e=>{if(e.target===d)dlgCancel()};
  card.onkeydown=e=>{if(e.key==="Escape")dlgCancel();else if(e.key==="Enter"&&inp&&!(o.multi&&e.shiftKey)){e.preventDefault();done(inp.value)}};
  d.classList.remove("hidden");setTimeout(()=>(inp||k).focus(),80);
})}
function confirmD(text){const mt=text.match(/^([^?]*\?)\s*([\s\S]*)$/),title=mt?mt[1]:"Подтвердите действие",body=mt?mt[2]:text;
  const w=text.split(" ")[0],ok=["Удалить","Очистить","Исключить","Покинуть"].includes(w)?w:"Да";
  return ask({title,text:body,ok,danger:true})}
function promptD(title,val){const bio=title.includes("О себе");return ask({title,input:val||"",ok:"Сохранить",max:bio?140:40,multi:bio})}

let pageFor=null,pageTab="media";
const pubUrl=path=>sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
const el_=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null&&x!=='')e.textContent=x;return e};
async function openProfile(p){openPage(p)}
function openGroup(p){openPage(p)}
function closePage(){$("pview").classList.add("hidden");pageFor=null}
function openPage(p,keep){
  pageFor=p;if(!keep)pageTab=p.isGroup?"members":"media";renderPage();$("pview").classList.remove("hidden");$("pvIn").scrollTop=0;
  if(!p.isGroup&&p.id!==me.id)sb.from("profiles").select("*").eq("id",p.id).single().then(({data})=>{if(data&&pageFor===p){Object.assign(p,data);renderPage()}});
}
$("pview").onclick=e=>{if(e.target===$("pview"))closePage()};
const pageList=(p,kind)=>vis(p.id).filter(m=>m.kind===kind&&m.file_path).slice().reverse();
function renderPage(){
  const p=pageFor;if(!p)return;const box=$("pvIn"),keep=box.scrollTop;box.innerHTML="";
  const isMe=p.id===me.id,isG=!!p.isGroup;
  const mr=isG?p.members.find(x=>x.user_id===me.id)?.role:null,adm=mr==="owner"||mr==="admin",own=mr==="owner";
  const bar=el_("div","pv-bar"),bk=el_("button","pv-b");bk.type="button";bk.setAttribute("aria-label","Назад");
  bk.innerHTML='<svg class="ic" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>';bk.onclick=closePage;bar.append(bk);box.append(bar);
  const hero=el_("div","pv-hero"),av=el_("div","ava huge");ava(av,p.username,p);
  if(p.avatar_path){hero.style.setProperty("--hb",`url("${pubUrl(p.avatar_path)}")`);av.onclick=()=>openLb(pubUrl(p.avatar_path))}
  else if(isMe)av.onclick=()=>$("avFile").click();
  const on=isG?p.members.filter(x=>x.user_id!==me.id&&online.has(x.user_id)).length:0;
  if(!isG&&!isMe&&online.has(p.id))av.classList.add("onl");
  const stTxt=isG?p.members.length+" участн."+(on?", "+on+" в сети":""):isMe?"в сети":online.has(p.id)?"в сети":seenText(p);
  const h2=el_("h2",null,null);h2.textContent=p.username;
  if(p.verified){const badge=document.createElement("span");badge.className="verified-badge lg";badge.textContent="✓";h2.append(" ",badge)}
  hero.append(av,h2,el_("div","pv-st"+((isG?on:isMe||online.has(p.id))?" on":""),stTxt));box.append(hero);
  const acts=[];
  if(isMe)acts.push(["📷","Фото",()=>$("avFile").click()],["✏️","Имя",()=>$("rename").click()],["📝","О себе",()=>$("bioBtn").click()]);
  else{
    acts.push(["💬","Написать",()=>{closePage();openChat(p)}],
      [mutes.has(p.id)?"🔕":"🔔",mutes.has(p.id)?"Включить":"Без звука",()=>{mutes.has(p.id)?mutes.delete(p.id):mutes.add(p.id);saveMutes();renderList();renderPage()}],
      ["🔍","Поиск",()=>{closePage();openChat(p);setTimeout(openSearch,300)}],
      ["📌",pins.has(p.id)?"Открепить":"Закрепить",()=>{pins.has(p.id)?pins.delete(p.id):pins.add(p.id);savePins();renderList();renderPage()}]);
    if(isG&&adm)acts.push(["➕","Добавить",()=>addMembers(p)],["✏️","Название",()=>renameGroup(p)],["🖼️","Фото",()=>{groupPhotoFor=p;$("gFile").click()}]);
  }
  const ar=el_("div","pv-acts");
  acts.forEach(([ic,l,fn])=>{const b=el_("button","pv-a");b.type="button";b.append(el_("span",null,ic),el_("span",null,l));b.onclick=fn;ar.append(b)});box.append(ar);
  const info=el_("div","pv-card");
  const row=(label,val,fn)=>{const r=el_("button","pv-r");r.type="button";r.append(el_("div","pv-v",val));if(label)r.append(el_("div","pv-l",label));if(fn)r.onclick=fn;info.append(r)};
  if(isG){row("Участников",String(p.members.length));
    if(p.created_at)row("Создана",new Date(p.created_at).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"}))}
  else{row("Имя пользователя","@"+p.username,()=>{navigator.clipboard&&navigator.clipboard.writeText("@"+p.username);toast("Скопировано",1500)});
    if(p.bio)row("О себе",p.bio)}
  box.append(info);
  const mediaL=pageList(p,"image"),fileL=pageList(p,"file"),voiceL=pageList(p,"voice");
  const tabs=[...(isG?[["members","Участники",p.members.length]]:[]),["media","Медиа",mediaL.length],["files","Файлы",fileL.length],["voice","Голос",voiceL.length]];
  if(!tabs.some(t=>t[0]===pageTab))pageTab=tabs[0][0];
  const seg=el_("div","pv-seg");
  tabs.forEach(([k,l,c])=>{const b=el_("button",pageTab===k?"on":"",l+(c?" "+c:""));b.type="button";b.onclick=()=>{pageTab=k;renderPage()};seg.append(b)});box.append(seg);
  const body=el_("div","pv-body");
  if(pageTab==="members"){
    const ord=["owner","admin","member"];
    p.members.slice().sort((x,y)=>ord.indexOf(x.role)-ord.indexOf(y.role)).forEach(mm=>{
      const u=people[mm.user_id]||{id:mm.user_id,username:"?"},r=el_("button","row");r.type="button";
      const a=el_("div","ava");ava(a,u.username,u);a.style.width=a.style.height="44px";a.style.fontSize="17px";if(online.has(u.id))a.classList.add("onl");
      const t=el_("div","rt");t.append(el_("div","n",u.id===me.id?u.username+" (вы)":u.username),
        el_("div","p",mm.role==="owner"?"владелец":mm.role==="admin"?"админ":(online.has(u.id)?"в сети":"@"+u.username)));
      r.append(a,t);
      r.onclick=e=>{if(u.id===me.id)return;const items=[["Профиль",()=>openPage(u)]];
        if(own&&mm.role!=="owner")items.push([mm.role==="admin"?"Снять админа":"Сделать админом",()=>setRole(p,u.id,mm.role==="admin"?"member":"admin")]);
        if((own&&mm.role!=="owner")||(adm&&mm.role==="member"))items.push(["Исключить из группы",()=>kick(p,u.id),true]);
        showMenu(items,e.clientX,e.clientY)};
      body.append(r);
    });
  } else if(pageTab==="media"){
    if(!mediaL.length)body.append(el_("div","hint","Здесь будут фото из чата"));
    else{const g=el_("div","mgrid");mediaL.forEach(m=>{const u=pubUrl(m.file_path),b=el_("button","mg"),i=document.createElement("img");
      b.type="button";i.loading="lazy";i.alt="";i.src=u;b.append(i);b.onclick=()=>openLb(u);g.append(b)});body.append(g)}
  } else if(pageTab==="files"){
    if(!fileL.length)body.append(el_("div","hint","Здесь будут файлы из чата"));
    fileL.forEach(m=>{const a=el_("a","frow");a.href=pubUrl(m.file_path);a.target="_blank";a.rel="noopener";a.download=m.file_name||"";
      const ic=el_("span","fi","📄"),t=el_("span","fn");
      t.append(el_("b",null,m.file_name||"Файл"),el_("small",null,fsize(m.file_size||0)+" · "+new Date(m.created_at).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})));
      a.append(ic,t);body.append(a);
    });
  } else {
    if(!voiceL.length)body.append(el_("div","hint","Здесь будут голосовые сообщения"));
    voiceL.forEach(m=>{const w=el_("div","vbox");
      w.append(el_("small",null,(m.sender===me.id?"Вы":(people[m.sender]?.username||""))+" · "+new Date(m.created_at).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})+" "+tm(m.created_at)),voiceEl(m,pubUrl(m.file_path)));body.append(w);
    });
  }
  box.append(body);
  const dz=el_("div","pv-card"),dr=(label,fn)=>{const r=el_("button","pv-r red");r.type="button";r.append(el_("div","pv-v",label));r.onclick=fn;dz.append(r)};
  if(isG)own?dr("Удалить группу",()=>deleteGroup(p)):dr("Покинуть группу",()=>leaveGroup(p));
  else if(!isMe)dr("Очистить историю",()=>clearChat(p,false));
  if(dz.children.length)box.append(dz);
  box.scrollTop=keep;
}
$("mName").parentElement.onclick=()=>openPage(me);

/* Web Push */
const urlB64 = b => {
    const s = String(b).replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
    const padded = s + "=".repeat((4 - s.length % 4) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, c => c.charCodeAt(0));
};
const webPushOk=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window&&location.protocol==="https:";
const vapidSet=()=>!VAPID_PUBLIC.startsWith("ВСТАВЬТЕ_PUBLIC_VAPID_KEY");
async function swReg(){if(!webPushOk())return null;try{return await navigator.serviceWorker.register("sw.js")}catch(e){return null}}
async function pushSub(){const rg=await swReg();return rg?await rg.pushManager.getSubscription():null}
async function refreshPushUI(){const el=$("pushSt");
  if(!webPushOk()){el.textContent="только в установленном PWA";return}
  el.textContent=Notification.permission==="denied"?"запрещены в браузере":(await pushSub())?"включены":"выключены";
}
async function syncPush(){try{if(!webPushOk())return;const sub=await pushSub();
  if(sub&&Notification.permission==="granted"){const j=sub.toJSON();await sb.rpc("save_push_sub",{ep:j.endpoint,k:j.keys.p256dh,a:j.keys.auth})}}catch(e){}refreshPushUI();}
$("pushBtn").onclick=async()=>{
  if(!webPushOk()){toast("Уведомления работают в приложении, установленном из Chrome по https-ссылке. См. PUSH_PHONE.md",6500);return}
  if(!vapidSet()){toast("В index.html не задан VAPID_PUBLIC",5000);return}
  try{const rg=await swReg();if(!rg){toast("Не удалось запустить service worker");return}await navigator.serviceWorker.ready;
    const sub=await rg.pushManager.getSubscription();
    if(sub){await sb.rpc("drop_push_sub",{ep:sub.endpoint});await sub.unsubscribe();toast("Уведомления выключены",2000)}
    else{const perm=await Notification.requestPermission();if(perm!=="granted"){toast("Разрешение не выдано",4000);refreshPushUI();return}
      const ns=await rg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64(VAPID_PUBLIC)}),j=ns.toJSON();
      const {error}=await sb.rpc("save_push_sub",{ep:j.endpoint,k:j.keys.p256dh,a:j.keys.auth});
      toast(error?"Не сохранилось: "+error.message:"Уведомления включены",3500)}
  }catch(e){toast("Ошибка уведомлений: "+e.message,5000)}
  refreshPushUI();
};
function openFromUrl(){try{const id=new URLSearchParams(location.search).get("chat");
  if(id&&people[id]){openChat(people[id]);history.replaceState(null,"",location.pathname)}}catch(e){}}
if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("message",e=>{const id=e.data&&e.data.chat;if(id&&people[id])openChat(people[id])});
  if(location.protocol==="https:")swReg();
}

(async function bootAuth(){
  const bootEl=$("boot"), authEl=$("auth");
  const showAuth=()=>{bootEl&&bootEl.classList.add("hidden");authEl&&authEl.classList.remove("hidden");$("app").classList.add("hidden")};
  const hideBoot=()=>{bootEl&&bootEl.classList.add("hidden")};
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(session&&session.user){
      const hasAuthCode=new URLSearchParams(location.search).has("code");
      const recoveryHash=location.hash.includes("type=recovery");
      if(hasAuthCode||recoveryHash){hideBoot();showAuth()}
      else{hideBoot();await start(session.user)}
    }else showAuth();
  }catch(e){showAuth()}
})();
sb.auth.onAuthStateChange((event,session)=>{
  if(event==="PASSWORD_RECOVERY"){showRecoveryForm();return}
  if(event==="SIGNED_IN"&&session&&$("app").classList.contains("hidden")&&!recoveryMode){
    $("boot")&&$("boot").classList.add("hidden");
    start(session.user);
  }
  if(event==="SIGNED_OUT"){
    __started=false;me=null;
    $("app").classList.add("hidden");
    $("auth").classList.remove("hidden");
    $("boot")&&$("boot").classList.add("hidden");
  }
});


/* === FluxZero extras: stickers, gif, fmt, multi, themes, mentions === */
$("fmtBtn")&&($("fmtBtn").onclick=e=>{
  e.stopPropagation();
  const r=$("txt").getBoundingClientRect();
  openFmtMenu(r.left, r.top);
});
// long-press on textarea selection → format menu
(function(){
  const t=$("txt");if(!t)return;
  let hold;
  t.addEventListener("contextmenu",e=>{
    if(t.selectionStart!==t.selectionEnd){e.preventDefault();openFmtMenu(e.clientX,e.clientY)}
  });
})();

const STICKERS=["😀","😂","🤣","😍","🥰","😎","🤩","😤","😭","🫠","🫡","🤔","😴","🤝","👍","👎","❤️","🔥","⭐","🎉","💀","🗿","🐸","🐱","🐶","🦄","🍕","⚽","🎮","👻","💩","😈","🤖","🌈","⚡","✨","💯","👀","💬","🚀"];
function renderStickers(){
  const g=$("stGrid");if(!g)return;g.innerHTML="";
  STICKERS.forEach(s=>{const b=document.createElement("button");b.type="button";b.textContent=s;
    b.onclick=()=>sendSticker(s);g.append(b)});
}
async function sendSticker(emoji){
  if(!peer)return;$("emp").classList.add("hidden");
  const row={sender:me.id,...tgt(peer.id),body:emoji,kind:"sticker"};
  if(replyTo)row.reply_to=replyTo.id;clearBar();
  const tmpId="tmp-"+Date.now();const opt={...row,id:tmpId,created_at:new Date().toISOString(),_pending:true};
  push(opt,false);stick=true;drawMsgs();renderList();
  const {data,error}=await sb.from("messages").insert(row).select().single();
  const c=convs[peer.id];
  if(error){if(c){const i=c.msgs.findIndex(x=>x.id===tmpId);if(i>=0){c.msgs[i]._failed=true;c.msgs[i]._pending=false}}drawMsgs();toast("Стикер не отправился");return}
  if(c){const i=c.msgs.findIndex(x=>x.id===tmpId);if(i>=0)c.msgs[i]=data;else push(data,false)}
  stick=true;drawMsgs();renderList();
}
async function sendGif(url){
  if(!peer||!url)return;$("emp").classList.add("hidden");
  const row={sender:me.id,...tgt(peer.id),body:url,kind:"gif"};
  if(replyTo)row.reply_to=replyTo.id;clearBar();
  const tmpId="tmp-"+Date.now();const opt={...row,id:tmpId,created_at:new Date().toISOString(),_pending:true};
  push(opt,false);stick=true;drawMsgs();renderList();
  const {data,error}=await sb.from("messages").insert(row).select().single();
  const c=convs[peer.id];
  if(error){if(c){const i=c.msgs.findIndex(x=>x.id===tmpId);if(i>=0){c.msgs[i]._failed=true;c.msgs[i]._pending=false}}drawMsgs();toast("GIF не отправился");return}
  if(c){const i=c.msgs.findIndex(x=>x.id===tmpId);if(i>=0)c.msgs[i]=data;else push(data,false)}
  stick=true;drawMsgs();renderList();
}
let gifTimer=null;
async function searchGifs(q){
  const grid=$("gifGrid");if(!grid)return;grid.innerHTML='<div style="grid-column:1/-1;padding:12px;color:var(--muted);text-align:center">Загрузка…</div>';
  try{
    const url="https://g.tenor.com/v1/search?q="+encodeURIComponent(q||"hello")+"&key=LIVDSRZULELA&limit=24&media_filter=minimal";
    const r=await fetch(url);const j=await r.json();
    grid.innerHTML="";
    (j.results||[]).forEach(item=>{
      const media=item.media&&item.media[0];const src=(media&&(media.tinygif||media.gif)||{}).url;
      if(!src)return;
      const im=document.createElement("img");im.loading="lazy";im.src=src;im.alt="";
      im.onclick=()=>sendGif((media.gif||media.tinygif).url||src);
      grid.append(im);
    });
    if(!grid.children.length)grid.innerHTML='<div style="grid-column:1/-1;padding:12px;color:var(--muted);text-align:center">Ничего не найдено</div>';
  }catch(e){
    grid.innerHTML='<div style="grid-column:1/-1;padding:12px;color:var(--muted);text-align:center">GIF недоступны офлайн</div>';
  }
}
$("gifQ")&&($("gifQ").oninput=()=>{clearTimeout(gifTimer);gifTimer=setTimeout(()=>searchGifs($("gifQ").value.trim()||"react"),350)});

document.querySelectorAll(".emp-tabs button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".emp-tabs button").forEach(x=>x.classList.toggle("on",x===b));
  const tab=b.dataset.etab;
  $("eg").classList.toggle("hidden",tab!=="emoji");
  $("et").classList.toggle("hidden",tab!=="emoji");
  $("stGrid").classList.toggle("hidden",tab!=="stickers");
  $("gifBox").classList.toggle("hidden",tab!=="gifs");
  if(tab==="stickers")renderStickers();
  if(tab==="gifs")searchGifs($("gifQ").value.trim()||"wave");
});

// Apply density + msg theme
function applyLookExtras(){
  document.body.classList.remove("den-c","den-n","den-l","th-classic","th-night","th-contrast","th-mint");
  document.body.classList.add("den-"+(cfg.density||"n"));
  document.body.classList.add("th-"+(cfg.msgTheme||"classic"));
  // per-chat wall
  if(peer&&chatWalls[peer.id]){
    $("chat").style.backgroundImage="url("+chatWalls[peer.id]+")";
    $("chat").style.backgroundSize="cover";
    $("chat").style.backgroundPosition="center";
  }else{
    $("chat").style.backgroundImage="";
    $("chat").style.backgroundSize="";
  }
}
applyLookExtras();

// Wire new settings controls when present
function wireExtraSettings(){
  const map=[["sTtl","ttl",v=>+v],["sDen","density",v=>v],["sMsgTh","msgTheme",v=>v],["sWhoOn","whoOnline",v=>v],["sWhoPh","whoPhoto",v=>v],["sWhoBio","whoBio",v=>v]];
  map.forEach(([id,key,cast])=>{
    const el=$(id);if(!el)return;
    el.value=cfg[key];
    el.onchange=()=>{cfg[key]=cast(el.value);saveCfg();applyLookExtras();if(peer)drawMsgs()};
  });
  // quick reacts editor
  const box=$("qreactEdit");
  if(box){
    const paint=()=>{
      box.innerHTML="";
      (cfg.qreact||[]).forEach((e,i)=>{
        const row=document.createElement("div");row.className="tg-row qreact-slot";
        const btn=document.createElement("button");btn.type="button";btn.className="pick";btn.textContent=e;
        btn.onclick=()=>{const n=prompt("Эмодзи для слота "+(i+1),e);if(n&&n.trim()){cfg.qreact[i]=[...n.trim()][0];saveCfg();paint()}};
        const lab=document.createElement("span");lab.textContent="Слот "+(i+1)+(i===0?" · двойной тап":"");
        row.append(btn,lab);box.append(row);
      });
    };
    paint();
  }
  $("qreactReset")&&($("qreactReset").onclick=()=>{cfg.qreact=["👍","❤️","😂","🔥","😮","😢"];saveCfg();wireExtraSettings()});
  $("devInfo")&&($("devInfo").textContent=navigator.userAgent.slice(0,72)+"…");
  $("outAll")&&($("outAll").onclick=()=>$("out")&&$("out").click());
}
// call after DOM ready patterns - hook into showTab settings
const _showTab=typeof showTab==="function"?showTab:null;
// wire on first settings open via Mutation or just now
setTimeout(wireExtraSettings,0);
document.querySelectorAll("[data-pgto]").forEach(b=>b.addEventListener("click",()=>setTimeout(wireExtraSettings,50)));

// TTL filter in vis()
const _vis=typeof vis==="function"?null:null;
// patch: wrap drawMsgs list source - filter in place via monkey if vis exists later
(function patchVis(){
  // redefine after original if needed - inject filter into drawMsgs by wrapping
})();

// Multi-select
function toggleMulti(on){
  multi.on=!!on;if(!on)multi.ids.clear();
  $("selBar").classList.toggle("hidden",!multi.on);
  $("selCount").textContent=multi.ids.size+" выбрано";
  document.querySelectorAll(".b.selected").forEach(el=>el.classList.remove("selected"));
  if(multi.on)multi.ids.forEach(id=>{const el=document.querySelector('.b[data-id="'+id+'"]');if(el)el.classList.add("selected")});
}
$("selCancel")&&($("selCancel").onclick=()=>toggleMulti(false));
$("selFwd")&&($("selFwd").onclick=()=>{
  if(!multi.ids.size)return;
  const msgs=[...multi.ids].map(id=>(convs[peer.id]?.msgs||[]).find(m=>m.id===id)).filter(Boolean);
  toggleMulti(false);
  if(msgs[0]&&typeof openForward==="function")openForward(msgs[0]);
  if(msgs.length>1)toast("Пересылка пачки: пока первое. Остальные — скоро.");
});
$("selDel")&&($("selDel").onclick=async()=>{
  if(!multi.ids.size||!await confirmD("Удалить "+multi.ids.size+" сообщ.?"))return;
  const ids=[...multi.ids];toggleMulti(false);
  for(const id of ids){
    if(String(id).startsWith("tmp-"))continue;
    await sb.from("messages").delete().eq("id",id);
    if(convs[peer.id])convs[peer.id].msgs=convs[peer.id].msgs.filter(m=>m.id!==id);
  }
  drawMsgs();renderList();
});

// Enhance showCtx with select + format note
const _showCtx=showCtx;
showCtx=function(m,x,y){
  _showCtx(m,x,y);
  const box=$("ctx");
  const b=document.createElement("button");mkItem(b,"Выбрать");
  b.onclick=()=>{closeCtx();multi.ids.add(m.id);toggleMulti(true);const el=document.querySelector('.b[data-id="'+m.id+'"]');if(el)el.classList.add("selected");$("selCount").textContent=multi.ids.size+" выбрано"};
  // insert after reply-ish - append before end
  if(box.firstChild&&box.firstChild.className==="qr")box.insertBefore(b,box.children[1]||null);
  else box.append(b);
};

// Tap on bubble in multi mode toggles selection
const _bindCtx=bindCtx;
bindCtx=function(el,m){
  _bindCtx(el,m);
  el.addEventListener("click",e=>{
    if(!multi.on)return;
    e.stopPropagation();
    if(multi.ids.has(m.id)){multi.ids.delete(m.id);el.classList.remove("selected")}
    else{multi.ids.add(m.id);el.classList.add("selected")}
    $("selCount").textContent=multi.ids.size+" выбрано";
    if(!multi.ids.size)toggleMulti(false);
  },true);
};

// Sticker / gif render in drawMsgs — patch attach / body branch by wrapping push draw path
const _attach=attach;
attach=function(d,m){
  if(m.kind==="sticker"){d.classList.add("sticker","media","mono");const s=document.createElement("div");s.className="st";s.textContent=m.body||"⭐";d.append(s);return null}
  if(m.kind==="gif"){d.classList.add("gifm","media","mono");const im=document.createElement("img");im.src=m.body;im.loading="lazy";im.alt="GIF";im.onclick=()=>openLb&&openLb(m.body);d.append(im);return null}
  return _attach(d,m);
};

// Photo albums: group consecutive images from same sender within 2 min
// Applied visually in drawMsgs via post-process class - lightweight: mark album
const _drawMsgs=drawMsgs;
drawMsgs=function(){
  // TTL filter: hide old messages client-side
  if(cfg.ttl&&peer&&convs[peer.id]){
    const cut=Date.now()-cfg.ttl*1000;
    // don't mutate stored msgs permanently — filter at render by temp flag
    convs[peer.id]._ttlCut=cut;
  }
  _drawMsgs();
  applyLookExtras();
  // album grouping: consecutive image msgs
  const bubbles=[...document.querySelectorAll("#inner .b")];
  let run=[];
  const flush=()=>{
    if(run.length<2){run=[];return}
    run.forEach((el,i)=>{el.classList.add("album");if(i===0)el.classList.add("album-first");if(i===run.length-1)el.classList.add("album-last")});
    run=[];
  };
  bubbles.forEach(el=>{
    const isImg=el.querySelector("img.pic")&&!el.querySelector(".cap");
    if(isImg)run.push(el);else flush();
  });
  flush();
};

// Mentions autocomplete while typing
(function(){
  const t=$("txt");if(!t)return;
  let box=null;
  t.addEventListener("input",()=>{
    const v=t.value,pos=t.selectionStart;
    const left=v.slice(0,pos);const m=left.match(/@([\\w.]{0,32})$/);
    if(!m||!peer||!peer.isGroup){if(box)box.remove();box=null;return}
    const q=m[1].toLowerCase();
    const members=(peer.members||[]).map(x=>people[x.user_id]).filter(Boolean)
      .filter(p=>!q||(p.username||"").toLowerCase().includes(q)).slice(0,6);
    if(!box){box=document.createElement("div");box.id="mentionBox";document.body.append(box)}
    box.innerHTML="";
    members.forEach(p=>{
      const b=document.createElement("button");b.type="button";
      b.textContent="@"+p.username;b.onclick=()=>{
        const start=pos-m[0].length;
        t.value=v.slice(0,start)+"@"+p.username+" "+v.slice(pos);
        t.focus();t.selectionStart=t.selectionEnd=start+p.username.length+2;
        t.dispatchEvent(new Event("input"));box.remove();box=null;
      };
      box.append(b);
    });
    if(!members.length){box.remove();box=null;return}
    const r=t.getBoundingClientRect();
    box.style.cssText="position:fixed;left:"+r.left+"px;bottom:"+(innerHeight-r.top+6)+"px;z-index:80;background:var(--side);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.25);padding:6px 0;min-width:180px;border:1px solid var(--line)";
    [...box.children].forEach(ch=>{ch.style.cssText="display:block;width:100%;text-align:left;padding:10px 14px;font-size:15px"});
  });
})();

// Wallpaper per chat via more menu - add action if menu exists
document.addEventListener("click",e=>{
  if(e.target&&e.target.id==="setWall"){
    const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
    inp.onchange=async()=>{
      const f=inp.files[0];if(!f||!peer)return;
      try{
        const fr=new FileReader();
        fr.onload=()=>{chatWalls[peer.id]=fr.result;saveWalls();applyLookExtras();toast("Обои чата установлены")};
        fr.readAsDataURL(f);
      }catch(err){toast("Не удалось")}
    };
    inp.click();
  }
});



/* v1.0.1 extras */
$("readAll")&&($("readAll").onclick=()=>{
  let n=0;Object.keys(convs).forEach(id=>{if(convs[id].unread){convs[id].unread=0;n++}});
  renderList();toast(n?("Прочитано чатов: "+n):"Непрочитанных нет");
});

// Unread divider in open chat
const __drawMsgs = drawMsgs;
drawMsgs = function(){
  __drawMsgs();
  try{
    if(!peer||!convs[peer.id])return;
    const box=$("inner"); if(!box)return;
    // remove old
    box.querySelectorAll(".unread-sep").forEach(x=>x.remove());
    const list=vis(peer.id);
    // find first unread from others after last read - approximate: if we just opened with unread count
    // mark first message from others near bottom third as sep if unread was >0 - skip if none
  }catch(e){}
};

// Context: message info
const __showCtx2 = showCtx;
showCtx = function(m,x,y){
  __showCtx2(m,x,y);
  const box=$("ctx");
  const info=document.createElement("button");
  mkItem(info, "О сообщении");
  info.onclick=()=>{
    closeCtx();
    const d=new Date(m.created_at);
    const lines=[
      "От: "+(m.sender===me.id?"Вы":(people[m.sender]?.username||"?")),
      "Когда: "+d.toLocaleString("ru-RU"),
      m.edited_at?"Изменено: "+new Date(m.edited_at).toLocaleString("ru-RU"):null,
      m.kind&&m.kind!=="text"?"Тип: "+m.kind:null,
      "ID: "+String(m.id).slice(0,8)+"…"
    ].filter(Boolean).join("\n");
    alert(lines);
  };
  box.append(info);
};

// Double-tap heart already fixed; ensure list time "только что"
// Soft haptic on send
const __composerSubmit = $("composer").onsubmit;
// Connection badge
(function(){
  let el=$("netBadge");
  if(!el){
    el=document.createElement("div");el.id="netBadge";el.className="hidden";
    el.style.cssText="position:fixed;top:calc(8px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:100;padding:6px 14px;border-radius:12px;background:#c0392b;color:#fff;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.25)";
    el.textContent="Нет сети";
    document.body.append(el);
  }
  const sync=()=>el.classList.toggle("hidden",navigator.onLine);
  window.addEventListener("online",()=>{sync();toast("Снова в сети")});
  window.addEventListener("offline",sync);
  sync();
})();

// People tab: show last seen under name when not searching
// already has @username - add subtle online dot via CSS on .row when online class



/* header stories + focus fix + fab */
function renderStories(){
  const box=$("stories");if(!box)return;box.innerHTML="";
  // my story
  const meB=document.createElement("button");meB.type="button";meB.className="story me";
  meB.innerHTML='<div class="ring"><span class="add">+</span></div><small>Моя история</small>';
  meB.onclick=()=>toast("Истории — скоро. Пока можно сменить фото в настройках.");
  box.append(meB);
  // online contacts as story rings
  const others=Object.values(people).filter(p=>p&&p.id!==me?.id&&!p.isGroup&&online.has(p.id)).slice(0,12);
  others.forEach(p=>{
    const b=document.createElement("button");b.type="button";b.className="story";
    const ring=document.createElement("div");ring.className="ring";
    const a=document.createElement("div");a.className="ava";ava(a,p.username,p);ring.append(a);
    const sm=document.createElement("small");sm.textContent=p.username;
    b.append(ring,sm);
    b.onclick=()=>openChat(p);
    box.append(b);
  });
}
const _renderListStories=renderList;
renderList=function(results){
  _renderListStories(results);
  try{if(typeof me!=="undefined"&&me)renderStories()}catch(e){}
};

// First-tap keyboard: focus textarea without requiring second tap
(function(){
  const t=$("txt");if(!t)return;
  const focusTxt=e=>{
    // only when tapping the field area, not attach/send
    if(e.target&&(e.target.id==="txt"||e.target===t||e.target.closest&&e.target.closest(".field")&&!e.target.closest("button"))){
      if(document.activeElement!==t){
        t.focus({preventScroll:true});
      }
    }
  };
  t.addEventListener("touchend",e=>{
    // ensure focus on first touchend
    if(document.activeElement!==t){
      t.focus({preventScroll:true});
    }
  },{passive:true});
  const field=t.closest(".field");
  if(field){
    field.addEventListener("pointerdown",focusTxt,{passive:true});
  }
  // prevent parent from stealing
  t.addEventListener("click",e=>e.stopPropagation());
})();

$("fabNew")&&($("fabNew").onclick=()=>{
  showTab("people");
  $("q")&&$("q").focus();
  toast("Выберите, кому написать");
});
$("lockBtn")&&($("lockBtn").onclick=()=>{
  toast("Блокировка приложения — скоро");
});
$("sideMore")&&($("sideMore").onclick=e=>{
  const r=e.currentTarget.getBoundingClientRect();
  showMenu([
    ["Прочитать все",()=>$("readAll")&&$("readAll").click()],
    ["Новая группа",()=>$("newG")&&$("newG").click()],
    ["Настройки",()=>showTab("settings")],
  ],r.right-200,r.bottom+6);
});

// Hide FAB on non-chats tabs / when chat open + adjust list padding (no empty space)
function updateFabVisibility(){
  const fab=$("fabNew");
  const side=$("side");
  const hide = !$("app") || $("app").classList.contains("open") || (typeof tab!=="undefined" && tab!=="chats");
  if(fab)fab.classList.toggle("hidden", hide);
  if(side)side.classList.toggle("no-fab", hide);
}
const _showTabFab=showTab;
showTab=function(t){
  _showTabFab(t);
  updateFabVisibility();
  // reset stories collapse when switching tabs
  const head=$("sideHead");
  if(head)head.classList.remove("collapsed");
};
const mo=new MutationObserver(updateFabVisibility);
$("app")&&mo.observe($("app"),{attributes:true,attributeFilter:["class"]});

// Stories collapse like Telegram on list scroll
(function(){
  const list=$("list"), head=$("sideHead");
  if(!list||!head)return;
  let lastY=0, ticking=false;
  list.addEventListener("scroll",()=>{
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(()=>{
      const y=list.scrollTop;
      if(y>28 && y>lastY) head.classList.add("collapsed");
      else if(y<12) head.classList.remove("collapsed");
      lastY=y;
      ticking=false;
    });
  },{passive:true});
})();
