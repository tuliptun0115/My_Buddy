const OUTPUT_SPEC = `請用下列固定格式輸出（JSON）：
{
  "date": "YYYY-MM-DD",
  "context": "",
  "original_input": "",
  "intent": "",
  "ai_response": "",
  "like_dislike": "",
  "my_preference": "",
  "rule_candidate": "",
  "my_edit": "",
  "my_observation": "",
  "tags": ["tag1", "tag2"],
  "note": "沒有對應欄位或補充資訊都放這裡"
}
`;

const PROMPTS = [
  { category: "AI 回得很好", title: "1. AI 回得很像你想要的", desc: "Trigger：「對！」「這很像我」「這句很好」。語氣偏好與表達風格正在浮現。", prompt: `幫我分析，為什麼我會喜歡這種說法？請整理成我的偏好特徵。\n${OUTPUT_SPEC}` },
  { category: "我修正 AI", title: "2. 你修改了 AI", desc: "這是最重要的訓練資料。你怎麼修 AI，比 AI 原本寫什麼更像你。", prompt: `記錄我這次修改的原因，並分析這透露了我哪些偏好。\n${OUTPUT_SPEC}` },
  { category: "我修正 AI", title: "3. 你覺得 AI 不懂你", desc: "當你說「不是這個意思」「重點不是這個」時，代表隱性期待正在浮現。", prompt: `AI 剛剛沒有理解我真正的意圖。請分析我原本期待的是什麼，以及我在意的點可能是什麼。\n${OUTPUT_SPEC}` },
  { category: "我發現自己的偏好", title: "4. 你覺得某種結構很舒服", desc: "先講結論、用 bullet、有摘要，這些都是資訊處理偏好的線索。", prompt: `請分析我為什麼會偏好這種結構，並整理成我的資訊理解偏好。\n${OUTPUT_SPEC}` },
  { category: "定期 Review", title: "5. 你開始重複修正同一種問題", desc: "如果一直改太空泛、太 formal、太像顧問，代表這不是偶然而是穩定偏好。", prompt: `我最近反覆修正 AI 的這些地方。請分析有哪些穩定出現的偏好與工作模式。\n${OUTPUT_SPEC}` },
  { category: "更新個人規範書", title: "6. 你突然覺得「這很像我」", desc: "這是最珍貴的 moment。先存下來，不要急著過度分析。", prompt: `請從這些紀錄中，整理我穩定出現的思考模式、工作偏好與溝通習慣。\n${OUTPUT_SPEC}` },
  { category: "更新個人規範書", title: "7. 紀錄工作原則", desc: "例如寫 PRD 時要加入數據與 SEO 需求，這類工作守則要固定沉澱。", prompt: `請把這次工作守則整理成可重複使用的規範，並標註適用情境與必備檢查點。\n例如：寫 PRD 時要包含數據依據與 SEO 需求。\n${OUTPUT_SPEC}` }
];

const SCHEMA_KEYS = ["date","context","original_input","intent","ai_response","like_dislike","my_preference","rule_candidate","my_edit","my_observation","tags","note"];
const KEY_ALIASES = {
  date:["date","日期"], context:["context","情境"], original_input:["original_input","原始內容","input"], intent:["intent","真正意圖","意圖"],
  ai_response:["ai_response","ai萃取結果","ai回覆","回覆"], like_dislike:["like_dislike","喜歡不喜歡","喜好"], my_preference:["my_preference","偏好"],
  rule_candidate:["rule_candidate","規則候選"], my_edit:["my_edit","我的修正"], my_observation:["my_observation","我的觀察"], tags:["tags","tag","標籤"], note:["note","備註"]
};

function wireCopyButtons(){document.querySelectorAll("[data-copy]").forEach((btn)=>{btn.addEventListener("click",async()=>{const text=btn.getAttribute("data-copy")||"";try{await navigator.clipboard.writeText(text);const old=btn.textContent;btn.textContent="已複製";setTimeout(()=>btn.textContent=old,1200);}catch{alert("複製失敗，請手動複製。");}});});}
function escapeAttr(text){return text.replaceAll("&","&amp;").replaceAll("\"","&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");}
function renderPromptCards(){const root=document.getElementById("prompt-grid");if(!root)return;root.innerHTML=PROMPTS.map((item)=>`<article class="card"><span class="badge">${item.category}</span><h3>${item.title}</h3><p>${item.desc}</p><pre>${item.prompt}</pre><button class="btn" data-copy="${escapeAttr(item.prompt)}">複製 Prompt</button></article>`).join("");wireCopyButtons();}

function seedLogs(){
  const base=[];
  for(let i=1;i<=32;i++){
    base.push({
      id:`log_${String(i).padStart(3,"0")}`,
      date:`2026-05-${String((i%28)+1).padStart(2,"0")}`,
      context:i%3===0?"紀錄工作原則":(i%2===0?"我修改了 AI":"AI 回得很像我要的"),
      original_input:"示例輸入",
      intent:"讓 AI 更懂我的工作脈絡",
      ai_response:`假資料第 ${i} 筆：先結論後步驟，語氣白話。`,
      like_dislike:"喜歡條列，不喜歡空話",
      my_preference:"偏好可執行與可掃描",
      rule_candidate:"回覆先給行動步驟",
      my_edit:"刪掉官話",
      my_observation:"重視節奏",
      tags:i%3===0?["principle","prd"]:i%2===0?["tone"]:["structure"],
      note:i%5===0?"這筆帶備註":"",
      created_at:new Date(Date.now()-i*3600*1000).toISOString()
    });
  }
  return base;
}

function normalizeKey(rawKey){const k=String(rawKey||"").trim().toLowerCase();for(const [target,aliases] of Object.entries(KEY_ALIASES)){if(aliases.some((a)=>a.toLowerCase()===k))return target;}return null;}
function tryParseJson(text){try{const obj=JSON.parse(text);return obj&&typeof obj==="object"?obj:null;}catch{return null;}}
function parseKeyValueBlock(text){const obj={};const leftovers=[];String(text||"").split(/\r?\n/).forEach((line)=>{const match=line.match(/^\s*([^:：]+)\s*[:：]\s*(.*)$/);if(!match){if(line.trim())leftovers.push(line.trim());return;}const norm=normalizeKey(match[1]);if(norm){obj[norm]=match[2].trim();}else{leftovers.push(line.trim());}});if(leftovers.length)obj.note=[obj.note||"",...leftovers].filter(Boolean).join("\n");return obj;}
function toLogRecord(parsed,raw){const now=new Date();const record={id:`log_${Date.now()}`,date:"",context:"",original_input:"",intent:"",ai_response:"",like_dislike:"",my_preference:"",rule_candidate:"",my_edit:"",my_observation:"",tags:[],note:"",created_at:now.toISOString()};const unknownEntries=[];Object.entries(parsed||{}).forEach(([k,v])=>{const normalized=normalizeKey(k)||k;if(!SCHEMA_KEYS.includes(normalized)){unknownEntries.push(`${k}: ${typeof v==="string"?v:JSON.stringify(v)}`);return;}if(normalized==="tags"){record.tags=Array.isArray(v)?v.map((x)=>String(x).trim().toLowerCase()).filter(Boolean):String(v||"").split(",").map((x)=>x.trim().toLowerCase()).filter(Boolean);return;}record[normalized]=typeof v==="string"?v.trim():JSON.stringify(v);});if(!record.date)record.date=now.toISOString().slice(0,10);if(!record.context)record.context="未命名情境";if(!record.ai_response&&raw)record.ai_response=raw.slice(0,3000);if(unknownEntries.length)record.note=[record.note,...unknownEntries].filter(Boolean).join("\n");return record;}
function getStoredApiBase(){
  try{return localStorage.getItem("BUDDY_API_BASE")||"";}catch{return "";}
}
function setStoredApiBase(value){
  try{localStorage.setItem("BUDDY_API_BASE",value);}catch{}
}
function getApiBase(){return String(window.BUDDY_API_BASE||getStoredApiBase()||"").trim().replace(/\/$/,"");}
function sleep(ms){return new Promise((resolve)=>setTimeout(resolve,ms));}
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status >= 500) {
        if (i === maxRetries - 1) throw new Error(`API 錯誤（${res.status}）`);
        const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
        console.warn(`API ${res.status} error, retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
      console.warn(`Network error: ${err.message}, retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }
}
function withClientToken(record,token){return {...record,note:[record.note||"",`[client_token:${token}]`].filter(Boolean).join("\n")};}
function buildFormPayload(record){const payload={};SCHEMA_KEYS.forEach((key)=>{if(!(key in record))return;if(key==="tags"){payload.tags=Array.isArray(record.tags)?record.tags.join(","):String(record.tags||"");return;}payload[key]=record[key]??"";});return payload;}
function isLikelyNetworkBlock(err){const msg=String(err&&err.message||err||"");return /failed to fetch|networkerror|load failed/i.test(msg);}
function buildRequestId(prefix){return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;}
function popupFeatures(){return "popup=yes,width=720,height=760,resizable=yes,scrollbars=yes";}
async function postLog(record){
  const apiBase=getApiBase();
  if(!apiBase){throw new Error("尚未設定 BUDDY API URL。請先設定 window.BUDDY_API_BASE。");}
  setStoredApiBase(apiBase);
  // text/plain 不觸發 CORS preflight，從 localhost 發出後 Apps Script 正常回應
  const res=await fetchWithRetry(`${apiBase}?action=logs`,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({...record,origin:window.location.origin})});
  const payload=await res.json().catch(()=>({ok:false,error:"API 回應不是 JSON"}));
  if(!res.ok||!payload.ok){throw new Error(payload.error||`API 錯誤（${res.status}）`);}
  return payload;
}
async function getLatestLog(){
  const apiBase=getApiBase();
  if(!apiBase){return Promise.reject(new Error("尚未設定 BUDDY API URL。請先設定 window.BUDDY_API_BASE。"));}
  setStoredApiBase(apiBase);
  return new Promise((resolve,reject)=>{
    const target=`post-target-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const iframe=document.createElement("iframe");
    const form=document.createElement("form");
    iframe.name=target;
    iframe.hidden=true;
    form.hidden=true;
    form.method="POST";
    form.action=`${apiBase}/logs`;
    form.target=target;
    Object.entries(buildFormPayload(record)).forEach(([key,value])=>{
      const input=document.createElement("input");
      input.type="hidden";
      input.name=key;
      input.value=String(value??"");
      form.appendChild(input);
    });
    let loadCount=0;
    let submitted=false;
    function doSubmit(){
      if(submitted)return;
      submitted=true;
      try{form.submit();}catch(err){clearTimeout(timer);cleanup();reject(err);}
    }
    function onLoad(){
      loadCount++;
      if(loadCount===1){
        // 第一次 load = blank iframe 載入完成，現在才提交表單
        doSubmit();
      } else {
        // 第二次 load = Apps Script 回應載入完成，資料已寫入
        clearTimeout(timer);
        cleanup();
        resolve({ok:true,fallback:true});
      }
    }
    function cleanup(){
      iframe.removeEventListener("load",onLoad);
      setTimeout(()=>{iframe.remove();form.remove();},0);
    }
    // 逾時時仍 resolve（非 reject），讓後續 JSONP 驗證決定是否成功
    const timer=setTimeout(()=>{cleanup();resolve({ok:true,fallback:true,timedOut:true});},12000);
    iframe.addEventListener("load",onLoad);
    document.body.appendChild(iframe);
    document.body.appendChild(form);
    // 備援：若 200ms 後 blank 沒觸發 load，強制提交
    setTimeout(()=>{if(!submitted)doSubmit();},200);
  });
}
function getLatestLogViaJsonp(){
  const apiBase=getApiBase();
  if(!apiBase){return Promise.reject(new Error("尚未設定 BUDDY API URL。請先設定 window.BUDDY_API_BASE。"));}
  setStoredApiBase(apiBase);
  return new Promise((resolve,reject)=>{
    const callbackName=`buddyJsonp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const script=document.createElement("script");
    const cleanup=()=>{delete window[callbackName];script.remove();clearTimeout(timer);};
    const timer=setTimeout(()=>{cleanup();reject(new Error("JSONP 讀取逾時"));},12000);
    window[callbackName]=(payload)=>{cleanup();resolve(payload);};
    script.onerror=()=>{cleanup();reject(new Error("JSONP 載入失敗"));};
    script.src=`${apiBase}/logs/latest?callback=${encodeURIComponent(callbackName)}`;
    document.body.appendChild(script);
  });
}
function waitForPopupMessage(requestId,popup){
  return new Promise((resolve,reject)=>{
    const timeout=window.setTimeout(()=>{
      cleanup();
      try{if(popup&&!popup.closed)popup.close();}catch{}
      reject(new Error("等待 Google 視窗回傳逾時"));
    },20000);
    function cleanup(){
      window.clearTimeout(timeout);
      window.removeEventListener("message",onMessage);
    }
    function onMessage(event){
      const data=event.data||{};
      if(event.origin!=="https://script.google.com"&&event.origin!=="https://script.googleusercontent.com")return;
      if(data.source!=="mybuddy-gas")return;
      if(data.requestId!==requestId)return;
      cleanup();
      try{if(popup&&!popup.closed)popup.close();}catch{}
      const payload=data.payload||{};
      if(!payload.ok){reject(new Error(payload.error||"Google 視窗回傳失敗"));return;}
      resolve(payload);
    }
    window.addEventListener("message",onMessage);
  });
}
function openPopup(url,name){
  const popup=window.open("about:blank",name,popupFeatures());
  if(!popup)throw new Error("瀏覽器擋住了彈出視窗，請允許這個頁面開啟視窗");
  popup.location.href=url;
  return popup;
}
function getLatestLogViaPopup(){
  const apiBase=getApiBase();
  if(!apiBase){return Promise.reject(new Error("尚未設定 BUDDY API URL。請先設定 window.BUDDY_API_BASE。"));}
  setStoredApiBase(apiBase);
  const requestId=buildRequestId("latest");
  const url=`${apiBase}/logs/latest?transport=postmessage&targetOrigin=${encodeURIComponent(window.location.origin)}&requestId=${encodeURIComponent(requestId)}`;
  const popup=openPopup(url,"buddy-latest-popup");
  return waitForPopupMessage(requestId,popup);
}
function postLogViaPopup(record){
  const apiBase=getApiBase();
  if(!apiBase){return Promise.reject(new Error("尚未設定 BUDDY API URL。請先設定 window.BUDDY_API_BASE。"));}
  setStoredApiBase(apiBase);
  const requestId=buildRequestId("post");
  const popup=window.open("about:blank","buddy-post-popup",popupFeatures());
  if(!popup)return Promise.reject(new Error("瀏覽器擋住了彈出視窗，請允許這個頁面開啟視窗"));
  const form=document.createElement("form");
  form.hidden=true;
  form.method="POST";
  form.action=`${apiBase}/logs`;
  form.target="buddy-post-popup";
  const payload={...buildFormPayload(record),transport:"postmessage",targetOrigin:window.location.origin,requestId};
  Object.entries(payload).forEach(([key,value])=>{
    const input=document.createElement("input");
    input.type="hidden";
    input.name=key;
    input.value=String(value??"");
    form.appendChild(input);
  });
  document.body.appendChild(form);
  const wait=waitForPopupMessage(requestId,popup).finally(()=>form.remove());
  form.submit();
  return wait;
}
async function verifyLogWrite(record,token){
  for(let attempt=0;attempt<4;attempt+=1){
    if(attempt>0)await sleep(1200);
    const latest=await getLatestLogViaPopup();
    const note=String(latest&&latest.item&&latest.item.note||"");
    if(latest&&latest.ok&&latest.item&&note.includes(`[client_token:${token}]`)){return latest;}
  }
  throw new Error("POST 已送出，但最新一筆還沒有對到驗證 token");
}
async function saveLog(record){
  // 從 localhost 驗證：直接 fetch POST，回應包含 id 和 created_at
  const saved=await postLog(record);
  return {saved,mode:"fetch"};
}

function setupInputPage(){const form=document.getElementById("log-form");if(!form)return;const statusEl=document.getElementById("save-status");form.addEventListener("submit",async(e)=>{e.preventDefault();const blob=String(document.getElementById("log-blob")?.value||"").trim();if(!blob)return;const parsed=tryParseJson(blob)||parseKeyValueBlock(blob);const record=toLogRecord(parsed,blob);const submitBtn=form.querySelector("button[type='submit']");if(submitBtn)submitBtn.disabled=true;if(statusEl)statusEl.textContent="儲存中...";try{const result=await saveLog(record);if(statusEl)statusEl.textContent=`已寫入 Google Sheets：${result.saved.id} (${result.saved.created_at})`;form.reset();alert("🎉 儲存成功！");}catch(err){if(statusEl)statusEl.textContent=`儲存失敗：${err.message}`;}finally{if(submitBtn)submitBtn.disabled=false;}});const verifyBtn=document.getElementById("btn-t03-verify");if(verifyBtn){verifyBtn.addEventListener("click",async()=>{verifyBtn.disabled=true;if(statusEl)statusEl.textContent="T03 驗證中...";try{const probe={date:new Date().toISOString().slice(0,10),context:"T03 真寫入驗證",ai_response:"one-click verify",tags:["t03","verified"],note:`verify_${Date.now()}`};const result=await saveLog(probe);if(statusEl)statusEl.textContent=`T03 驗證成功：${result.saved.id} 已寫入 Google Sheets（已驗證）`; alert("🎉 T03 驗證寫入成功！");}catch(err){if(statusEl)statusEl.textContent=`T03 驗證失敗：${err.message}`;}finally{verifyBtn.disabled=false;}});}}

async function fetchLogsList(page, pageSize, q, tag) {
  const apiBase = getApiBase();
  if (!apiBase) return { ok: false, error: '尚未設定 API URL' };
  const params = new URLSearchParams({ action: 'logs', page, pageSize });
  if (q) params.append('q', q);
  if (tag && tag !== 'all') params.append('tag', tag);
  
  const res = await fetchWithRetry(`${apiBase}?${params.toString()}`);
  return await res.json().catch(() => ({ ok: false, error: '回傳非 JSON 格式' }));
}

function setupListPage(){
  const listEl=document.getElementById("log-list");if(!listEl)return;
  const state={q:"",tag:"all",page:1,pageSize:5};
  
  // 為了簡化，目前的標籤過濾先提供固定幾個或留空，因為後端尚未提供 tags 的彙整 API
  // 實務上也可以由前端預先帶入常用的 tag
  function renderTagFilter(){
    const tagSel=document.getElementById("filter-tag");if(!tagSel)return;
    const current=state.tag;
    const commonTags = ["all", "t03", "verified", "test"];
    tagSel.innerHTML=commonTags.map((t)=>`<option value="${t}">${t}</option>`).join("");
    tagSel.value=current;
  }
  
  async function render(){
    listEl.innerHTML = '<p class="empty">載入中...</p>';
    const info = document.getElementById("page-info");
    const prev = document.getElementById("prev-page");
    const next = document.getElementById("next-page");
    if(prev) prev.disabled = true;
    if(next) next.disabled = true;
    
    try {
      const payload = await fetchLogsList(state.page, state.pageSize, state.q, state.tag);
      if (!payload.ok) throw new Error(payload.error || '讀取失敗');
      
      const items = payload.items || [];
      const total = payload.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
      
      if(!items.length){
        listEl.innerHTML=`<p class="empty">目前沒有符合條件的紀錄。</p>`;
      } else {
        listEl.innerHTML = items.map((log)=>`<details class="log-item"><summary><h4>${log.context}</h4><div class="meta">${log.date} · ${log.id}</div><div class="tags">#${(log.tags||[]).join(" #")}</div></summary><p><strong>Intent：</strong>${log.intent||"-"}</p><p><strong>AI 萃取：</strong>${log.ai_response||"-"}</p><p><strong>備註：</strong>${log.note||"-"}</p></details>`).join("");
      }
      
      if(info) info.textContent=`第 ${state.page} / ${totalPages} 頁，共 ${total} 筆`;
      const badge = document.getElementById("total-count-badge");
      if(badge) badge.textContent = `共 ${total} 筆`;
      if(prev) prev.disabled = state.page <= 1;
      if(next) next.disabled = state.page >= totalPages;
    } catch (err) {
      listEl.innerHTML = `<p class="empty" style="color:red">發生錯誤：${err.message}</p>`;
    }
  }
  
  let debounceTimer;
  document.getElementById("filter-q")?.addEventListener("input",(e)=>{
    state.q=e.target.value;
    state.page=1;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 500); // 避免打字時瘋繁發 API
  });
  
  document.getElementById("filter-tag")?.addEventListener("change",(e)=>{state.tag=e.target.value;state.page=1;render();});
  document.getElementById("prev-page")?.addEventListener("click",()=>{if(state.page>1){state.page-=1;render();}});
  document.getElementById("next-page")?.addEventListener("click",()=>{state.page+=1;render();});
  
  renderTagFilter(); 
  render();
}

renderPromptCards();
setupInputPage();
setupListPage();




