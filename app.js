const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const cfg=window.EHOOD_CONFIG||{};
const ACCESS_CODE='notte2026';
const ready=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes('YOUR_')&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes('YOUR_');
let supa=null,me=null,profiles=[],current='general',dmUser=null,activeGroupId='ehood';
let localMode=false;
const localAccountsKey='ehood_accounts_v6',localSessionKey='ehood_session_v6',localKey='ehood_v11_ui';
let ui=JSON.parse(localStorage.getItem(localKey)||'{}');
ui.messages=ui.messages||{};ui.groups=ui.groups||[];ui.nitro=ui.nitro||{};ui.banners=ui.banners||{};let chatMessages={};let chatTimer=null;let chatBusy=false;
const svg=n=>'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#382146"/><text x="50%" y="58%" text-anchor="middle" font-family="Arial" font-size="44" fill="white">${(n||'?')[0].toUpperCase()}</text></svg>`);
const pic=u=>u?.avatar||svg(u?.username||'E');
const ownerEmail=String(cfg.OWNER_EMAIL||'').trim().toLowerCase();
const isConfiguredOwner=u=>!!u && !!ownerEmail && String(u.email||'').trim().toLowerCase()===ownerEmail;
const nitroActive=u=>!!ui.nitro[u?.id];
function memberSinceText(u){
 const raw=u?.created_at||u?.createdAt||u?.joined_at||u?.joinedAt;
 if(!raw)return 'Member since —';
 const d=new Date(raw); if(Number.isNaN(d.getTime()))return 'Member since —';
 const days=Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));
 const date=d.toLocaleDateString([], {month:'long',day:'numeric',year:'numeric'});
 return `${date} · ${days} day${days===1?'':'s'} ago`;
}
function tenureDays(u){
 const raw=u?.created_at||u?.createdAt||u?.joined_at||u?.joinedAt;
 const d=raw?new Date(raw):null;
 return d&&!Number.isNaN(d.getTime())?Math.max(0,Math.floor((Date.now()-d.getTime())/86400000)):0;
}
function badgeAssets(u){
 if(!u)return [];
 if(u.owner)return [
  ['ehood-badge-iron.jpeg','Owner / OG'],
  ['ehood-badge-red.webp','Long-time member'],
  ['ehood-badge-pink.png','Loyal member'],
  ['ehood-badge-ironman.png','Ehood member']
 ];
 const d=tenureDays(u), out=[];
 if(d>=180)out.push(['ehood-badge-iron.jpeg','180+ days']);
 if(d>=90)out.push(['ehood-badge-red.webp','90+ days']);
 if(d>=30)out.push(['ehood-badge-pink.png','30+ days']);
 if(d>=7)out.push(['ehood-badge-ironman.png','7+ days']);
 return out;
}
function badgesHTML(u,cls='profile-badges'){
 const b=badgeAssets(u);
 if(!b.length)return '';
 return `<span class="${cls}">${b.map(([src,title])=>`<img src="${src}" alt="${esc(title)}" title="${esc(title)}">`).join('')}</span>`;
}
function logout(){
 if(localMode){localStorage.removeItem(localSessionKey);me=null;dmUser=null;$('#mainView').classList.add('hidden');$('#authView').classList.remove('hidden');setMode('signin');closeModal();toast('Logged out.');return;}
 return supa.auth.signOut();
}
const avatarHTML=(u,cls='avatar')=>`<span class="avatar-shell"><img class="${cls}" src="${pic(u)}" alt="${esc(u?.username||'Ehood user')}">${nitroActive(u)?'<img class="nitro-pfp-badge" src="ehood-nitro-emoji.png" alt="Ehood Nitro">':''}</span>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function toast(x){const t=document.createElement('div');t.textContent=x;t.className='e-toast';document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
function modal(h){$('#modalRoot').innerHTML=`<div class="modalback" onclick="if(event.target===this)closeModal()"><div class="modal">${h}</div></div>`}
function closeModal(){$('#modalRoot').innerHTML=''} window.closeModal=closeModal;
function setMode(m){$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.mode===m));$('#usernameWrap').classList.toggle('hidden',m!=='signup');$('#authPfpWrap').classList.toggle('hidden',m!=='signup');$('#authSubmit').textContent=m==='signup'?'Create account':'Sign in';$('#authForm').dataset.mode=m;$('#authError').textContent=''}
$$('.tab').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
function readFile(f){return new Promise(r=>{const x=new FileReader();x.onload=()=>r(x.result);x.readAsDataURL(f)})}
function getLocalAccounts(){try{return JSON.parse(localStorage.getItem(localAccountsKey)||'[]')}catch{return[]}}
function saveLocalAccounts(a){localStorage.setItem(localAccountsKey,JSON.stringify(a))}
function localUserById(id){return getLocalAccounts().find(x=>x.id===id)||null}
function saveUI(){localStorage.setItem(localKey,JSON.stringify(ui))}
function ensureLocalOwner(){const a=getLocalAccounts();if(!a.length)return;let changed=false;for(const u of a){const should=isConfiguredOwner(u);if(u.owner!==should){u.owner=should;changed=true}const verified=should===true;if(u.verified!==verified){u.verified=verified;changed=true}}if(changed)saveLocalAccounts(a)}
function isOwner(){return !!me?.owner} function ownerGuard(){if(!isOwner()){toast('Owner only.');return false}return true}
async function boot(){
 if(ready){
  supa=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await supa.auth.getSession();if(session){await loadMe(session.user.id);if(me)openApp()}
  supa.auth.onAuthStateChange(async(_e,s)=>{if(s){await loadMe(s.user.id);if(me)openApp()}else{me=null;$('#mainView').classList.add('hidden');$('#authView').classList.remove('hidden')}});
 }else{localMode=true;ensureLocalOwner();const id=localStorage.getItem(localSessionKey);if(id){me=localUserById(id);if(me&&!me.banned)openApp()}}
}
async function loadMe(id){if(localMode){ensureLocalOwner();const a=getLocalAccounts();const i=a.findIndex(x=>x.id===id);if(i>=0&&!a[i].created_at){a[i].created_at=new Date().toISOString();saveLocalAccounts(a)}me=localUserById(id);if(me?.banned){localStorage.removeItem(localSessionKey);me=null;$('#authError').textContent='This account is banned from Ehood.'}return}const {data,error}=await supa.from('profiles').select('*').eq('id',id).single();if(!error){me=data;if(!me.created_at){const fallback=new Date().toISOString();const r=await supa.from('profiles').update({created_at:fallback}).eq('id',id).select().single();if(!r.error)me=r.data}}}
async function refreshProfiles(){if(localMode){profiles=getLocalAccounts().map(({password,...u})=>u).sort((a,b)=>a.username.localeCompare(b.username));return}const {data,error}=await supa.from('profiles').select('*').order('username');if(!error)profiles=data||[]}
function openApp(){$('#authView').classList.add('hidden');$('#mainView').classList.remove('hidden');render()}
function render(){if(!me)return;$('#selfName').textContent='@'+me.username;$('#selfAvatar').src=pic(me);$('#mobileSelfAvatar').src=pic(me);['selfAvatarWrap','mobileSelfAvatarWrap'].forEach(id=>{const w=document.getElementById(id);if(w)w.classList.toggle('has-nitro',nitroActive(me))});renderServers();renderChannels();renderMembers();select(current)}
function renderServers(){const el=$('#servers');if(!el)return;el.innerHTML=ui.groups.map(g=>`<button class="server group-server ${g.id===activeGroupId?'active':''}" title="${esc(g.name)}" onclick="selectGroup('${g.id}')">${esc(g.icon||g.name[0]||'G')}</button>`).join('')}
function selectGroup(id){activeGroupId=id;dmUser=null;current='general';renderServers();renderChannels();select('general')}
window.selectGroup=selectGroup;
function groupById(id){return ui.groups.find(g=>g.id===id)}
function currentGroup(){return activeGroupId==='ehood'?{id:'ehood',name:'Ehood',icon:'E'}:groupById(activeGroupId)||{id:'ehood',name:'Ehood',icon:'E'}}
function renderChannels(){const names=['general','chat'];const g=currentGroup();const del=g.id!=='ehood'?`<button class="channel group-delete" onclick="deleteGroup('${g.id}')">🗑️ Delete Group</button>`:'';$('#channels').innerHTML=names.map(n=>`<button class="channel ${n===current&&!dmUser?'active':''}" data-ch="${n}"># ${n}</button>`).join('')+`<button class="channel voice-channel" onclick="joinVoice('${g.id}','General')">🔊 General <span>VOICE</span></button>${del}`;$$('[data-ch]').forEach(b=>b.onclick=()=>{dmUser=null;select(b.dataset.ch)})}
function localMessages(key){ui.messages[key]=ui.messages[key]||[];return ui.messages[key]}
function channelKey(){return `${activeGroupId}:${dmUser?'dm_'+[me.id,dmUser.id].sort().join('_'):current}`}
function select(n){current=n;$('#chatTitle').textContent=n;const g=currentGroup();$('#topic').textContent=dmUser?'Direct message':`${g.name} · ${n==='general'?'Welcome to Ehood.':'Talk about whatever you want.'}`;$('#messageInput').placeholder=dmUser?'Message @'+dmUser.username:'Message #'+n;renderChannels();loadChat()}
function chatUser(m){return profiles.find(x=>String(x.id)===String(m.user_id))||{id:m.user_id,username:m.username||'User',avatar:m.avatar||null,owner:false,verified:false}}
function mergeChatUsers(arr){for(const m of arr){if(!profiles.some(x=>String(x.id)===String(m.user_id)))profiles.push({id:m.user_id,username:m.username||'User',avatar:m.avatar||null,owner:false,verified:false,created_at:m.created_at})}}
async function fetchChat(){
 const key=channelKey();
 if(!ready||!supa) return localMessages(key);
 try{
  const {data,error}=await supa.from('ehood_messages').select('id,channel_key,user_id,username,avatar,text,image,image_name,created_at,edited').eq('channel_key',key).order('created_at',{ascending:true}).limit(200);
  if(error) throw error;
  const arr=data||[]; chatMessages[key]=arr; mergeChatUsers(arr); return arr;
 }catch(e){ console.error('Chat load failed:',e); return chatMessages[key]||[]; }
}
function stopChatRealtime(){ if(window.__ehoodChatChannel&&supa){supa.removeChannel(window.__ehoodChatChannel);window.__ehoodChatChannel=null;} }
function startChatRealtime(){
 if(!ready||!supa) return;
 stopChatRealtime();
 const key=channelKey();
 window.__ehoodChatChannel=supa.channel('ehood-chat-'+key.replace(/[^a-zA-Z0-9_-]/g,'_'))
  .on('postgres_changes',{event:'*',schema:'public',table:'ehood_messages',filter:'channel_key=eq.'+key},()=>{ fetchChat().then(renderMessages); })
  .subscribe();
}
async function loadChat(){
 const arr=await fetchChat();renderMessages(arr);
 if(ready&&supa) startChatRealtime();
 if(!chatTimer){chatTimer=setInterval(async()=>{if(!document.hidden&&me&&!dmUser)renderMessages(await fetchChat())},5000)}
}
function renderMessages(arr=chatMessages[channelKey()]||localMessages(channelKey())){$('#messages').innerHTML=arr.map((m,i)=>{const u=chatUser(m);const can=String(m.user_id)===String(me.id)||isOwner();const when=m.created_at||m.time;return `<div class="msg" data-mid="${m.id||''}">${avatarHTML(u)}<div class="msgbody"><div class="meta"><b>${esc(u.username)}</b>${u.owner?'<span class="verified">✓</span>':''}<time>${new Date(when).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}${m.edited?' <span class="edited">(edited)</span>':''}</time></div>${m.text?`<div class="text">${esc(m.text)}</div>`:''}${m.image?`<img class="message-image" src="${m.image}" alt="${esc(m.imageName||'Image')}" onclick="window.open(this.src,'_blank')">`:''}${can?`<div class="msg-actions"><button class="msg-action" onclick="editMessage(${i})">Edit</button><button class="msg-action danger" onclick="deleteMessage(${i})">Delete</button></div>`:''}</div></div>`}).join('');$('#messages').scrollTop=1e9}
async function editMessage(i){
 const a=chatMessages[channelKey()]||localMessages(channelKey()),m=a[i]; if(!m)return;
 if(String(m.user_id)!==String(me.id)&&!isOwner())return toast('You can only edit your own messages.');
 const n=prompt('Edit message:',m.text||''); if(n===null)return; const t=n.trim(); if(!t)return toast('Message cannot be empty.');
 if(ready&&supa&&m.id){ const {error}=await supa.from('ehood_messages').update({text:t,edited:true}).eq('id',m.id).eq('user_id',String(me.id)); if(error)return toast('Could not edit message.'); }
 else {m.text=t;m.edited=true;saveUI();}
 await loadChat();
}
async function deleteMessage(i){
 const a=chatMessages[channelKey()]||localMessages(channelKey()),m=a[i]; if(!m)return;
 if(String(m.user_id)!==String(me.id)&&!isOwner())return toast('You can only delete your own messages.');
 if(!confirm('Delete this message?'))return;
 if(ready&&supa&&m.id){ const {error}=await supa.from('ehood_messages').delete().eq('id',m.id).eq('user_id',String(me.id)); if(error)return toast('Could not delete message.'); }
 else {a.splice(i,1);saveUI();}
 await loadChat();
}
window.editMessage=editMessage;window.deleteMessage=deleteMessage;
function dm(id){const u=profiles.find(x=>x.id===id);if(!u)return;dmUser=u;select('dm')}
window.dm=dm;
async function sendMessage(){
 if(me?.banned)return toast('You are banned from Ehood.'); if(me?.muted)return toast('You are muted.');
 const input=$('#messageInput'),t=input.value.trim(),f=$('#imageInput')?.files?.[0]; if(!t&&!f)return;
 let image=null,imageName=null; if(f){if(!f.type.startsWith('image/'))return toast('Please choose an image.'); image=await readFile(f);imageName=f.name;}
 const key=channelKey(),payload={channel_key:key,user_id:String(me.id),username:me.username||'User',avatar:me.avatar||null,text:t,image,image_name:imageName};
 try{
  if(ready&&supa){
   const {data,error}=await supa.from('ehood_messages').insert(payload).select('id,channel_key,user_id,username,avatar,text,image,image_name,created_at,edited').single();
   if(error)throw error; chatMessages[key]=[...(chatMessages[key]||[]),data].slice(-200); mergeChatUsers([data]);
  } else { localMessages(key).push({...payload,time:Date.now()}); saveUI(); }
  input.value=''; if($('#imageInput'))$('#imageInput').value=''; renderMessages();
 }catch(e){ console.error('Chat send failed:',e); toast('Chat is not connected yet.'); }
}
$('#composer').onsubmit=e=>{e.preventDefault();sendMessage()};
async function renderMembers(){await refreshProfiles();$('#memberList').innerHTML=profiles.map(u=>`<div class="member" onclick="profileModal('${u.id}')">${avatarHTML(u)}<span><b>@${esc(u.username)} ${u.owner?'<span class="verified">✓</span>':''}</b><small>${u.id===me.id?'● Online':'● Online · Click to view'}</small></span></div>`).join('')}
function nitroInfo(){const active=!!ui.nitro[me.id];modal(`<div class="nitro-page"><div class="nitro-icon">✨</div><h2>Ehood Nitro</h2><p class="muted">Premium customization for your Ehood profile.</p><div class="nitro-price">$2.99 <span>/ month</span></div><div class="nitro-status ${active?'on':''}">${active?'✓ Nitro is active':'Not subscribed'}</div><ul class="perk-list"><li>✨ Nitro badge on your profile</li><li>🎨 Premium profile styling</li><li>💜 Extra profile customization</li><li>🚀 Future Nitro perks</li></ul><button class="primary wide" onclick="toggleNitro()">${active?'Manage Nitro':'Get Ehood Nitro'}</button><div class="disabled-note">Payments are not connected yet, so this is a preview-only subscription.</div></div>`)}
function toggleNitro(){ui.nitro[me.id]=!ui.nitro[me.id];saveUI();closeModal();render();toast(ui.nitro[me.id]?'Nitro enabled ✨':'Nitro disabled')}
window.nitroInfo=nitroInfo;window.toggleNitro=toggleNitro;
async function profileModal(id=me.id){const u0=profiles.find(x=>x.id===id)||me,own=u0.id===me.id,nitro=nitroActive(u0),banner=ui.banners[u0.id];modal(`<div class="discord-profile-card"><div class="profile-banner ${banner?'has-custom':''}" style="${banner?`background-image:url('${banner}')`:''}"></div><div class="profile-head"><button class="pfpbutton ${own?'editable-pfp':''}" onclick="${own?'editProfile()':'void(0)'}"><span class="avatar-shell profile-avatar-shell"><img class="bigpfp" src="${pic(u0)}">${nitro?'<img class="nitro-pfp-badge profile-nitro-badge" src="ehood-nitro-emoji.png" alt="Ehood Nitro">':''}</span>${own?'<span class="camera">📷</span>':''}</button><div class="profile-actions">${own?'<button class="secondary" onclick="editProfile()">Edit Profile</button>':'<button class="primary" onclick="closeModal();dm(\''+u0.id+'\')">Message</button>'}</div></div><div class="profile-info"><h2>${esc(u0.nickname||u0.username)} ${u0.owner?'<span class="verified">✓</span>':''} ${nitro?'<img class="nitro-inline-emoji" src="ehood-nitro-emoji.png" alt="Ehood Nitro" title="Ehood Nitro">':''}</h2><div class="profile-tag">@${esc(u0.username)}</div>${u0.owner?'<div class="owner-badge">EHOOD OWNER</div>':''}${badgesHTML(u0,'profile-badges profile-badges-row')}<div class="profile-section"><label>ABOUT ME</label><p>${esc(u0.bio||'Welcome to Ehood.')}</p></div><div class="profile-section"><label>MEMBER SINCE</label><p>${memberSinceText(u0)}</p></div><div class="actions"><button class="secondary" onclick="closeModal()">Close</button>${own?'<button class="secondary danger-outline" onclick="logout()">Logout</button>':''}${own&&me.owner?'<button class="primary" onclick="ownerPanel()">👑 Owner Controls</button>':''}</div></div></div>`)}
async function editProfile(){const canBanner=!!me.owner||!!ui.nitro[me.id],banner=ui.banners[me.id]||'';modal(`<div class="edit-profile-discord"><div class="edit-title"><div><h2>Edit Profile</h2><p class="muted">Make your Ehood profile yours.</p></div><button class="close-x" onclick="closeModal()">×</button></div><div class="nitro-entry"><div class="nitro-entry-copy"><b>✨ Ehood Nitro</b><small>$2.99/month · unlock profile banners & premium customization</small></div><button class="primary" onclick="nitroInfo()">View Nitro</button></div><div class="edit-banner ${banner?'has-custom':''}" id="editBanner" style="${banner?`background-image:url('${banner}')`:''}"><div class="edit-pfp-wrap"><span class="avatar-shell edit-avatar-shell"><img id="editPreview" class="edit-pfp" src="${pic(me)}">${nitroActive(me)?'<img class="nitro-pfp-badge edit-nitro-badge" src="ehood-nitro-emoji.png" alt="Ehood Nitro">':''}</span><button class="change-pfp" onclick="document.getElementById('newPfp').click()">Change Avatar</button></div>${canBanner?`<button class="change-banner" onclick="document.getElementById('newBanner').click()">🖼️ Change Banner</button>`:'<div class="banner-locked">🔒 Banner is an Ehood Nitro feature</div>'}</div><input id="newPfp" class="hidden-file" type="file" accept="image/*" onchange="previewPfp(event)"><input id="newBanner" class="hidden-file" type="file" accept="image/*" onchange="previewBanner(event)"><div class="field"><label>DISPLAY NAME</label><input id="newNick" value="${esc(me.nickname||'')}" maxlength="32" placeholder="Display name"></div><div class="field"><label>USERNAME</label><input id="newUser" value="${esc(me.username)}" maxlength="24"></div><div class="field"><label>ABOUT ME</label><textarea id="newBio" maxlength="190" placeholder="Tell people about you...">${esc(me.bio||'')}</textarea></div><div class="profile-preview-note">Your avatar appears across Ehood, including chats and member lists.</div><div class="actions"><button class="secondary" onclick="closeModal()">Cancel</button><button class="primary" onclick="saveProfile()">Save Changes</button></div></div>`)}
function previewPfp(e){const f=e.target.files[0];if(f)readFile(f).then(x=>$('#editPreview').src=x)}
function previewBanner(e){const f=e.target.files[0];if(f)readFile(f).then(x=>{const el=$('#editBanner');el.style.backgroundImage=`url('${x}')`;el.classList.add('has-custom');el.dataset.banner=x})}
window.previewBanner=previewBanner;
window.editProfile=editProfile;window.previewPfp=previewPfp;
async function saveProfile(){const name=$('#newUser').value.trim().replace(/^@/,'');if(!/^[a-zA-Z0-9_.-]{2,24}$/.test(name))return toast('Username must be 2–24 letters, numbers, _, ., or -.');let avatar=me.avatar;const f=$('#newPfp').files[0];if(f)avatar=await readFile(f);const nick=$('#newNick').value.trim(),bio=$('#newBio').value.trim();const bannerEl=$('#editBanner');const banner=bannerEl?.dataset?.banner||ui.banners[me.id]||'';if(banner&&!((me.owner)||ui.nitro[me.id]))return toast('Ehood Nitro is required for profile banners.');if(localMode){const a=getLocalAccounts(),taken=a.some(x=>x.id!==me.id&&x.username.toLowerCase()===name.toLowerCase());if(taken)return toast('Username already taken.');const i=a.findIndex(x=>x.id===me.id);a[i]={...a[i],username:name,nickname:nick,bio,avatar};saveLocalAccounts(a);me=a[i];if(banner)ui.banners[me.id]=banner;else delete ui.banners[me.id];saveUI();await refreshProfiles();closeModal();render();toast('Profile updated.');return}const {data,error}=await supa.from('profiles').update({username:name,nickname:nick,bio,avatar}).eq('id',me.id).select().single();if(error)return toast(error.code==='23505'?'Username already taken.':'Could not save profile.');me=data;await refreshProfiles();closeModal();render();toast('Profile updated.')}
window.saveProfile=saveProfile;
function hireModal(){modal(`<div class="hire-panel"><h2>🤝 Hire a guy</h2><p class="muted">Send a request for someone to help with a task.</p><div class="hire-options"><button class="secondary" onclick="hireRequest('Sim Holder')">📱 Sim Holder</button><button class="secondary" onclick="hireRequest('Crypto Swapper')">🪙 Crypto Swapper</button><button class="secondary" onclick="hireRequest('Other')">💬 Other</button></div><div class="actions"><button class="secondary" onclick="closeModal()">Close</button></div></div>`)}
function hireRequest(type){closeModal();toast(type+' request feature is ready to connect to your hiring system.')}
window.hireModal=hireModal;window.hireRequest=hireRequest;
function settingsModal(){modal(`<div class="settings-page"><h2>Settings</h2><div class="settings-item" onclick="closeModal();editProfile()"><div><b>Profile</b><small>Avatar, display name, username and bio</small></div><span>›</span></div><div class="settings-item" onclick="closeModal();nitroInfo()"><div><b>Ehood Nitro</b><small>$2.99/month · premium profile features</small></div><span class="settings-nitro">✨</span></div>${me.owner?'<div class="settings-item" onclick="ownerPanel()"><div><b>Owner Controls</b><small>Verification, mute and ban controls</small></div><span>👑</span></div>':''}<div class="actions"><button class="secondary" onclick="closeModal()">Close</button><button class="secondary danger-outline" onclick="logout()">Logout</button></div></div>`)}
window.settingsModal=settingsModal;window.logout=logout;
async function ownerPanel(){if(!ownerGuard())return;await refreshProfiles();const rows=profiles.map(u=>{const ma=u.muted?'unmute':'mute',ba=u.banned?'unban':'ban';return `<div class="mod-row">${avatarHTML(u)}<div class="mod-user"><b>@${esc(u.username)} ${u.owner?'<span class="verified">✓</span>':''}</b><small>${u.id===me.id?'You · Owner':u.banned?'Banned':u.muted?'Muted':'Normal'}</small></div><div class="mod-actions">${u.id!==me.id?`<button class="tiny" onclick="moderateUser('${u.id}','${ma}')">${u.muted?'Unmute':'Mute'}</button><button class="tiny danger" onclick="moderateUser('${u.id}','${ba}')">${u.banned?'Unban':'Ban'}</button>`:'<span class="owner-badge">OWNER ✓</span>'}</div></div>`}).join('');modal(`<div class="owner-panel"><h2>👑 Ehood Owner</h2><p class="muted">Owner-only controls.</p><div class="mod-list">${rows||'<p class="muted">No users yet.</p>'}</div><div class="actions"><button class="secondary" onclick="closeModal()">Close</button></div></div>`)}
window.ownerPanel=ownerPanel;
async function moderateUser(id,action){if(!ownerGuard())return;if(localMode){const a=getLocalAccounts(),i=a.findIndex(x=>x.id===id);if(i<0)return;const map={ban:'banned',unban:'banned',mute:'muted',unmute:'muted'};if(!map[action])return; a[i][map[action]]=!['unban','unmute'].includes(action);saveLocalAccounts(a);if(id===me.id)me=a[i];await refreshProfiles();render();ownerPanel();toast('Done.');return}const rpc={ban:'owner_ban_user',unban:'owner_unban_user',mute:'owner_mute_user',unmute:'owner_unmute_user'}[action];const {error}=await supa.rpc(rpc,{target_id:id});if(error)return toast('Owner action failed.');await loadMe(me.id);await refreshProfiles();render();ownerPanel();toast('Done.')}
window.moderateUser=moderateUser;
function addCommunity(){modal(`<div class="create-group"><h2>Create a Group</h2><p class="muted">Start a private Ehood space with text and voice channels.</p><div class="group-icon-preview" id="groupIconPreview">G</div><div class="field"><label>GROUP NAME</label><input id="groupName" maxlength="28" placeholder="My group" oninput="updateGroupIcon()"></div><div class="field"><label>GROUP ICON</label><input id="groupIcon" maxlength="2" placeholder="G" oninput="updateGroupIcon()"></div><div class="actions"><button class="secondary" onclick="closeModal()">Cancel</button><button class="primary" onclick="createGroup()">Create Group</button></div></div>`)}
function updateGroupIcon(){const v=($('#groupIcon').value.trim()||$('#groupName').value.trim()[0]||'G').slice(0,2).toUpperCase();$('#groupIconPreview').textContent=v} window.updateGroupIcon=updateGroupIcon;
function createGroup(){const name=$('#groupName').value.trim();if(!name)return toast('Enter a group name.');const icon=($('#groupIcon').value.trim()||name[0]).slice(0,2).toUpperCase();const g={id:crypto.randomUUID(),name,icon,owner_id:me.id};ui.groups.push(g);saveUI();activeGroupId=g.id;current='general';closeModal();render();toast(`${name} created!`)}
window.addCommunity=addCommunity;window.createGroup=createGroup;
function joinVoice(groupId,name){const g=groupId==='ehood'?{name:'Ehood'}:groupById(groupId);modal(`<div class="voice-call"><div class="voice-orb">🔊</div><h2>${esc(g.name)} · ${esc(name)}</h2><p class="muted">Voice room</p><div class="call-status" id="callStatus">Ready to join</div><div class="call-controls"><button class="call-btn" id="micBtn" onclick="toggleMic()">🎙️</button><button class="call-btn hangup" onclick="leaveVoice()">☎</button></div><p class="disabled-note">Microphone access is available in the call UI. Multi-user voice requires a live signaling service to connect other devices.</p></div>`)}
function toggleMic(){const b=$('#micBtn');if(!b)return;b.classList.toggle('off');b.textContent=b.classList.contains('off')?'🔇':'🎙️';$('#callStatus').textContent=b.classList.contains('off')?'Microphone muted':'Microphone on'}
function leaveVoice(){closeModal();toast('Left voice room.')} window.joinVoice=joinVoice;window.toggleMic=toggleMic;window.leaveVoice=leaveVoice;
$('#hireBtn').onclick=hireModal;$('#profileBtn').onclick=()=>profileModal();$('#mobileProfileBtn').onclick=()=>profileModal();$('#settingsBtn').onclick=settingsModal;$('#logoutBtn').onclick=logout;$('#addCommunity').onclick=addCommunity;$('#communitySettings').onclick=settingsModal;$('#nitroBtn').onclick=nitroInfo;$('#searchBtn').onclick=()=>toast('Search is coming soon.');$('#plus').onclick=()=>$('#imageInput').click();$('#membersBtn').onclick=()=>document.querySelector('.members')?.classList.toggle('hidden');
$('#authForm').onsubmit=async e=>{e.preventDefault();const mode=e.currentTarget.dataset.mode||'signin',email=$('#authEmail').value.trim().toLowerCase(),pass=$('#authPassword').value;if(mode==='signup'){const username=$('#authUsername').value.trim().replace(/^@/,'');if(!/^[a-zA-Z0-9_.-]{2,24}$/.test(username))return $('#authError').textContent='Username must be 2–24 letters, numbers, _, ., or -.';if(localMode){const a=getLocalAccounts();if(a.some(x=>x.username.toLowerCase()===username.toLowerCase()))return $('#authError').textContent='That username is already taken.';if(a.some(x=>x.email.toLowerCase()===email))return $('#authError').textContent='That email is already registered.';let avatar=null;const f=$('#authPfp').files[0];if(f)avatar=await readFile(f);const id=crypto.randomUUID(),owner=isConfiguredOwner({email}),u={id,username,email,password:pass,avatar,bio:'',nickname:'',verified:owner,owner,muted:false,banned:false,created_at:new Date().toISOString()};a.push(u);saveLocalAccounts(a);localStorage.setItem(localSessionKey,id);me=u;await refreshProfiles();openApp();return}const {data:available}=await supa.rpc('username_available',{candidate:username});if(available===false)return $('#authError').textContent='That username is already taken.';let avatar=null;const f=$('#authPfp').files[0];if(f)avatar=await readFile(f);const {data,error}=await supa.auth.signUp({email,password:pass,options:{data:{username,nickname:'',bio:'',avatar}}});if(error)return $('#authError').textContent=error.message;if(!data.session)return $('#authError').textContent='Account created. Check your email to verify it, then sign in.';await loadMe(data.user.id);openApp()}else{if(localMode){const u=getLocalAccounts().find(x=>x.email.toLowerCase()===email&&x.password===pass);if(!u)return $('#authError').textContent='Incorrect email or password.';if(u.banned)return $('#authError').textContent='This account is banned from Ehood.';localStorage.setItem(localSessionKey,u.id);me=u;await refreshProfiles();openApp();return}const {data,error}=await supa.auth.signInWithPassword({email,password:pass});if(error)return $('#authError').textContent=error.message;await loadMe(data.user.id);openApp()}};
function startAfterAccess(){boot()}
function setupAccessGate(){const gate=$('#accessGate'),form=$('#accessForm'),input=$('#accessCode'),err=$('#accessError');if(sessionStorage.getItem('ehood_access_granted')==='1'){gate.classList.add('hidden');startAfterAccess();return}form.onsubmit=e=>{e.preventDefault();if(input.value===ACCESS_CODE){sessionStorage.setItem('ehood_access_granted','1');gate.classList.add('hidden');err.textContent='';startAfterAccess()}else{err.textContent='Incorrect access code.';input.value='';input.focus()}}}
setupAccessGate();
