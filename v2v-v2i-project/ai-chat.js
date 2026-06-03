// ================================================================
//  Syntrix V2X — AI ASSISTANT WIDGET v2.0
//  Powered by Google Gemini 1.5 Flash (Free Tier)
//  Self-contained · Auto-injects into any page
// ================================================================

(function () {
  'use strict';

  // ── CONFIG ────────────────────────────────────────────────────
  const DEFAULT_GEMINI_KEY  = 'AIzaSyAyeQpH0_wVzY_iYhOb555mDY2s2U-aZ4M';
  const GEMINI_MODEL = 'gemini-2.5-flash'; // Updated from deprecated 1.5 to 2.5 Flash
  function getGeminiUrl() {
    const key = localStorage.getItem('v2x_gemini_key') || DEFAULT_GEMINI_KEY;
    return 'https://generativelanguage.googleapis.com/v1beta/models/'
         + GEMINI_MODEL + ':generateContent?key=' + key;
  }
  const MAX_TURNS   = 16;

  // ── PAGE CONTEXT (evaluated at runtime, not module load) ──────
  function getSystemPrompt() {
    const page = (window.location.pathname || '/login').replace(/\//g, '').replace('.html','') || 'login';
    return `You are Syntrix AI — a friendly, smart, and helpful AI assistant built into the Syntrix V2X Traffic & Emergency Vehicle Clearance System.

You are like a knowledgeable friend: warm, casual, direct, and helpful. Answer ANYTHING — platform questions, general knowledge, coding, science, math, advice, etc.

## The Syntrix V2X Platform:
A real-time V2V (Vehicle-to-Vehicle) and V2I (Vehicle-to-Infrastructure) smart city system built with Firebase Realtime DB, real GPS, Kalman filtering, and Vincenty distance math.

## Portals:
- Login (/login): Role-based entry. Roles: City Admin, Emergency Responder, Civic Driver, Signal Authority.
- Control Center (/control): Admin dashboard — live Leaflet map, all unit markers, V2V/V2I range circles, route history, GPS accuracy dashboard, user management, pending role approvals, system broadcast.
- Emergency (/emergency): EV driver — activate GPS broadcast, siren strip, V2I signal preemption tracking, V2V nearby vehicles. Wake Lock keeps screen on.
- Signal (/signal): Signal operator — receives V2I preemption from EV within 50m. Normal cycle: RED 8s → GREEN 5s → YELLOW 2s.
- Vehicle (/vehicle): Unified Civic Driver — auto-assigns slot 1 or 2 from Firebase. Gets V2V yield alerts (LEFT/RIGHT) when EV within 25m.
- User Portal (/user-portal): Choose your role. EV & Signal roles need admin approval first.
- Observer (/admin-preview): Read-only live view of all nodes.
- 404 (/404): Error page, auto-redirects to login in 10s.

## Tech Stack:
- Firebase Realtime DB at /v4/ node
- Google Auth + email/password + fallback admin (admin / V2X@2024)
- Kalman Filter for GPS smoothing
- Vincenty WGS-84 for precise distances
- Leaflet maps with CartoDB dark tiles
- Service Worker v2.2 for offline support
- V2V range: 25m | V2I range: 50m

## Current page the user is on: /${page}

Respond concisely. Use emojis occasionally. Format code in backticks. Be warm and conversational.`;
  }

  // ── QUICK CHIPS BY PAGE ────────────────────────────────────────
  function getChips() {
    const page = (window.location.pathname || '/').replace(/\//g,'').replace('.html','');
    const defaults = ['What is V2X?','How do I log in?','Explain V2I preemption','What is Kalman filter?','Show me all portals'];
    const pageChips = {
      control:   ['How to approve EV role?','What are the map circles?','How to ban a user?','What is route history?'],
      emergency: ['How to activate broadcast?','What is V2V alert?','Why use Wake Lock?','Kalman filter accuracy?'],
      signal:    ['When does signal go green?','What is V2I?','Normal cycle timing?','How to override manually?'],
      vehicle1:  ['What is V2V yield?','Which side to move to?','How close is danger zone?'],
      vehicle2:  ['What is V2V yield?','How far is danger zone?','Difference from vehicle1?'],
      'user-portal': ['Which role needs approval?','How long does approval take?','What is observer mode?'],
    };
    return pageChips[page] || defaults;
  }

  // ── CSS ───────────────────────────────────────────────────────
  const CSS = `
#sai-btn {
  position:fixed;bottom:24px;right:24px;z-index:2147483647;
  width:54px;height:54px;border-radius:50%;
  background:linear-gradient(135deg,#00e383,#009955);
  border:none;cursor:pointer;
  box-shadow:0 4px 20px rgba(0,227,131,.45);
  display:flex;align-items:center;justify-content:center;
  font-size:1.4rem;transition:transform .2s,box-shadow .2s;
  animation:saiPulse 3s ease-in-out infinite;
  font-family:sans-serif;
}
#sai-btn:hover{transform:scale(1.12);box-shadow:0 6px 30px rgba(0,227,131,.6)}
@keyframes saiPulse{
  0%,100%{box-shadow:0 4px 20px rgba(0,227,131,.45),0 0 0 0 rgba(0,227,131,.2)}
  50%{box-shadow:0 4px 20px rgba(0,227,131,.45),0 0 0 12px rgba(0,227,131,0)}
}
#sai-notif{
  position:absolute;top:-2px;right:-2px;
  width:14px;height:14px;border-radius:50%;
  background:#c6031a;border:2px solid #0d1518;display:none;
}
#sai-panel{
  position:fixed;bottom:90px;right:24px;z-index:2147483646;
  width:370px;max-height:580px;display:flex;flex-direction:column;
  border-radius:20px;overflow:hidden;
  background:rgba(8,16,20,.98);
  border:1px solid rgba(0,227,131,.2);
  box-shadow:0 32px 80px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04);
  backdrop-filter:blur(24px);
  transform-origin:bottom right;
  transform:scale(.82) translateY(8px);
  opacity:0;pointer-events:none;
  transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .2s;
  font-family:'Inter','Segoe UI',sans-serif;
}
#sai-panel.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all}
@media(max-width:430px){
  #sai-panel{width:calc(100vw - 12px);right:6px;bottom:86px;max-height:72vh}
}
.sai-hdr{
  padding:14px 16px;flex-shrink:0;
  background:linear-gradient(135deg,rgba(0,227,131,.1),rgba(0,224,255,.05));
  border-bottom:1px solid rgba(0,227,131,.12);
  display:flex;align-items:center;gap:11px;
}
.sai-logo{
  width:36px;height:36px;border-radius:10px;flex-shrink:0;
  background:linear-gradient(135deg,#00e383,#009955);
  display:flex;align-items:center;justify-content:center;
  font-size:1.1rem;box-shadow:0 0 16px rgba(0,227,131,.35);
}
.sai-hdr-info{flex:1}
.sai-name{
  font-size:.82rem;font-weight:700;color:#fff;
  font-family:'JetBrains Mono','Courier New',monospace;letter-spacing:.05em;
}
.sai-status{
  font-size:.58rem;color:rgba(0,227,131,.8);
  display:flex;align-items:center;gap:5px;margin-top:2px;
  font-family:'JetBrains Mono',monospace;
}
.sai-dot{
  width:6px;height:6px;border-radius:50%;background:#00e383;
  animation:saiDot 2s ease-in-out infinite;
}
@keyframes saiDot{0%,100%{opacity:1}50%{opacity:.3}}
.sai-hdr-btns{display:flex;gap:5px}
.sai-hdr-btn{
  width:28px;height:28px;border-radius:8px;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
  cursor:pointer;color:rgba(219,228,232,.6);font-size:.8rem;
  display:flex;align-items:center;justify-content:center;transition:.15s;
}
.sai-hdr-btn:hover{background:rgba(255,255,255,.12);color:#fff}
.sai-msgs{
  flex:1;overflow-y:auto;padding:14px 12px 6px;
  display:flex;flex-direction:column;gap:10px;
  scroll-behavior:smooth;
}
.sai-msgs::-webkit-scrollbar{width:3px}
.sai-msgs::-webkit-scrollbar-thumb{background:rgba(0,227,131,.18);border-radius:2px}
.sai-msg{display:flex;gap:8px;animation:msgIn .22s ease}
@keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.sai-msg.user{flex-direction:row-reverse}
.sai-av{
  width:28px;height:28px;border-radius:9px;flex-shrink:0;margin-top:1px;
  display:flex;align-items:center;justify-content:center;font-size:.82rem;
}
.sai-msg.assistant .sai-av{background:linear-gradient(135deg,#00e383,#009955)}
.sai-msg.user .sai-av{background:rgba(0,224,255,.1);border:1px solid rgba(0,224,255,.2)}
.sai-bubble{
  max-width:80%;padding:10px 14px;font-size:.78rem;line-height:1.68;word-break:break-word;
}
.sai-msg.assistant .sai-bubble{
  background:rgba(22,30,35,.95);border:1px solid rgba(255,255,255,.07);
  color:#dbe4e8;border-radius:3px 14px 14px 14px;
}
.sai-msg.user .sai-bubble{
  background:linear-gradient(135deg,rgba(0,227,131,.18),rgba(0,180,100,.1));
  border:1px solid rgba(0,227,131,.22);color:#fff;
  border-radius:14px 3px 14px 14px;text-align:right;
}
.sai-bubble code{
  background:rgba(0,0,0,.45);border-radius:4px;
  padding:1px 6px;font-family:'JetBrains Mono','Courier New',monospace;
  font-size:.72rem;color:#00e383;
}
.sai-bubble strong{color:#00e383}
.sai-bubble em{color:rgba(0,224,255,.9);font-style:italic}
.sai-bubble a{color:#00e0ff;text-decoration:underline}
.sai-bubble ul{margin:6px 0 0 16px}
.sai-bubble li{margin-bottom:3px}
.sai-typing{
  display:flex;align-items:center;gap:5px;
  padding:10px 14px;border-radius:3px 14px 14px 14px;
  background:rgba(22,30,35,.95);border:1px solid rgba(255,255,255,.07);width:fit-content;
}
.sai-typing span{
  width:7px;height:7px;border-radius:50%;background:#00e383;
  animation:saiTyping 1.3s ease-in-out infinite;
}
.sai-typing span:nth-child(2){animation-delay:.18s}
.sai-typing span:nth-child(3){animation-delay:.36s}
@keyframes saiTyping{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-6px);opacity:1}}
.sai-chips{
  padding:6px 12px 8px;display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;
  border-top:1px solid rgba(255,255,255,.04);
}
.sai-chip{
  padding:4px 11px;border-radius:20px;cursor:pointer;white-space:nowrap;
  background:rgba(0,227,131,.07);border:1px solid rgba(0,227,131,.16);
  color:rgba(0,227,131,.8);font-size:.58rem;
  font-family:'JetBrains Mono','Courier New',monospace;transition:.15s;
}
.sai-chip:hover{background:rgba(0,227,131,.18);color:#00e383;border-color:rgba(0,227,131,.35)}
.sai-input-row{
  padding:10px 12px;border-top:1px solid rgba(255,255,255,.07);
  display:flex;gap:8px;align-items:flex-end;flex-shrink:0;
  background:rgba(5,12,16,.85);
}
.sai-input{
  flex:1;background:rgba(22,30,35,.95);border:1px solid rgba(255,255,255,.1);
  border-radius:12px;color:#dbe4e8;font-size:.78rem;
  padding:9px 13px;resize:none;outline:none;
  max-height:100px;min-height:38px;line-height:1.5;
  font-family:'Inter','Segoe UI',sans-serif;transition:border-color .18s;
}
.sai-input::placeholder{color:rgba(132,149,134,.45)}
.sai-input:focus{border-color:rgba(0,227,131,.4)}
.sai-send{
  width:38px;height:38px;border-radius:12px;flex-shrink:0;
  background:linear-gradient(135deg,#00e383,#009955);
  border:none;cursor:pointer;font-size:.9rem;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 14px rgba(0,227,131,.3);transition:.18s;color:#000;
}
.sai-send:hover{transform:scale(1.08)}
.sai-send:disabled{opacity:.35;cursor:not-allowed;transform:none}
.sai-err{
  font-size:.7rem;color:#ff7070;background:rgba(198,3,26,.1);
  border:1px solid rgba(198,3,26,.2);border-radius:8px;
  padding:7px 12px;margin:2px 0;text-align:center;
}
.sai-clear-link{
  font-size:.58rem;color:rgba(132,149,134,.5);cursor:pointer;
  text-align:center;padding:4px;transition:.15s;display:block;
}
.sai-clear-link:hover{color:rgba(0,227,131,.7)}
`;

  // ── STATE ─────────────────────────────────────────────────────
  let open = false;
  let busy = false;
  let history = [];
  let greeted = false;

  // ── INIT ──────────────────────────────────────────────────────
  function init() {
    injectCSS();
    buildDOM();
    bindEvents();
    console.log('%c✅ Syntrix AI Widget v2.0', 'color:#00e383;font-weight:bold');
  }

  function injectCSS() {
    const s = document.createElement('style');
    s.id = 'sai-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buildDOM() {
    // Floating button
    const btn = document.createElement('button');
    btn.id = 'sai-btn';
    btn.setAttribute('aria-label', 'Open Syntrix AI Assistant');
    btn.innerHTML = '🤖<span id="sai-notif"></span>';
    document.body.appendChild(btn);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'sai-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Syntrix AI Chat');
    panel.innerHTML = `
      <div class="sai-hdr">
        <div class="sai-logo">🤖</div>
        <div class="sai-hdr-info">
          <div class="sai-name">Syntrix AI</div>
          <div class="sai-status">
            <span class="sai-dot"></span>
            Gemini 2.5 Flash · Free · Online
          </div>
        </div>
        <div class="sai-hdr-btns">
          <button class="sai-hdr-btn" id="sai-key-btn" title="Configure API Key">🔑</button>
          <button class="sai-hdr-btn" id="sai-clear-btn" title="Clear chat">🗑</button>
          <button class="sai-hdr-btn" id="sai-close-btn" title="Close">✕</button>
        </div>
      </div>
      <div class="sai-msgs" id="sai-msgs"></div>
      <div class="sai-chips" id="sai-chips"></div>
      <div class="sai-input-row">
        <textarea class="sai-input" id="sai-input"
          placeholder="Ask me anything…" rows="1"></textarea>
        <button class="sai-send" id="sai-send" title="Send (Enter)">➤</button>
      </div>
    `;
    document.body.appendChild(panel);
  }

  function buildChips() {
    const chipsEl = document.getElementById('sai-chips');
    if (!chipsEl) return;
    chipsEl.innerHTML = '';
    getChips().forEach(q => {
      const c = document.createElement('button');
      c.className = 'sai-chip';
      c.textContent = q;
      c.addEventListener('click', () => {
        chipsEl.style.display = 'none';
        sendMsg(q);
      });
      chipsEl.appendChild(c);
    });
  }

  function bindEvents() {
    document.getElementById('sai-btn').addEventListener('click', togglePanel);
    document.getElementById('sai-close-btn').addEventListener('click', () => setOpen(false));
    document.getElementById('sai-clear-btn').addEventListener('click', clearChat);
    document.getElementById('sai-key-btn').addEventListener('click', showKeyConfigUI);
    document.getElementById('sai-send').addEventListener('click', () => {
      const v = document.getElementById('sai-input').value.trim();
      if (v) sendMsg(v);
    });
    document.getElementById('sai-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('sai-send').click(); }
    });
    document.getElementById('sai-input').addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 110) + 'px';
    });
  }

  // ── PANEL CONTROL ─────────────────────────────────────────────
  function togglePanel() { setOpen(!open); }

  function setOpen(val) {
    open = val;
    document.getElementById('sai-panel').classList.toggle('open', open);
    document.getElementById('sai-notif').style.display = 'none';
    if (open) {
      if (!greeted) { greeted = true; buildChips(); setTimeout(greet, 160); }
      setTimeout(() => {
        document.getElementById('sai-input').focus();
        scrollBot();
      }, 260);
    }
  }

  function greet() {
    const page = (window.location.pathname || '/').replace(/\//g,'').replace('.html','') || 'login';
    const msgs = {
      login:          '👋 Hey! I\'m **Syntrix AI** — your smart assistant for this V2X platform. Ask me anything about the system, or just chat!',
      control:        '🎛️ Welcome to the **Admin Control Center**! I can help with user approvals, map features, analytics, or anything you\'re curious about.',
      emergency:      '🚨 **Emergency Responder Panel** here! Tap the big button to broadcast your GPS. Ask me how V2V works, or anything else!',
      signal:         '🚦 **Signal Authority** — I\'ll auto-go green when an EV is within 50m! Ask me about the signal cycle or V2I logic.',
      vehicle1:       '🚗 **Civic Driver 1** — you\'ll get a yield alert when an EV is nearby. Ask me about V2V, or anything at all!',
      vehicle2:       '🚗 **Civic Driver 2** — same as Vehicle 1, separate Firebase node. Questions? I\'m here!',
      'user-portal':  '🌐 **Role Portal** — pick your role here. EV & Signal need admin approval first. Ask me anything!',
      'admin-preview':'👁️ **Observer Mode** — read-only live view. Ask me about what you\'re seeing!',
    };
    addMsg('assistant', msgs[page] || '👋 Hi! I\'m **Syntrix AI** — I know everything about this V2X platform and can answer any question. What\'s up?');
  }

  function clearChat() {
    history = [];
    greeted = false;
    document.getElementById('sai-msgs').innerHTML = '';
    buildChips();
    document.getElementById('sai-chips').style.display = '';
    setTimeout(greet, 100);
  }

  // ── SEND ──────────────────────────────────────────────────────
  async function sendMsg(text) {
    if (busy || !text) return;

    // Hide chips
    const chipsEl = document.getElementById('sai-chips');
    if (chipsEl) chipsEl.style.display = 'none';

    const input = document.getElementById('sai-input');
    if (input.value === text) { input.value = ''; input.style.height = 'auto'; }

    addMsg('user', text);
    busy = true;
    document.getElementById('sai-send').disabled = true;

    const typingEl = showTyping();

    try {
      const reply = await callGemini(text);
      removeEl(typingEl);
      addMsg('assistant', reply);
      history.push({ u: text, a: reply });
      if (history.length > MAX_TURNS) history = history.slice(-MAX_TURNS);
    } catch (err) {
      removeEl(typingEl);
      addErr(err.message || 'Something went wrong. Please try again.');
      if (err.message.includes('API key') || err.message.includes('leaked') || err.message.includes('403') || err.message.includes('PERMISSION_DENIED')) {
        showKeySetupMessage(err.message);
      }
    } finally {
      busy = false;
      document.getElementById('sai-send').disabled = false;
      document.getElementById('sai-input').focus();
      scrollBot();
    }
  }

  // ── GEMINI API ────────────────────────────────────────────────
  async function callGemini(userText) {
    // Build contents array from history
    const contents = [];
    history.forEach(turn => {
      contents.push({ role: 'user',  parts: [{ text: turn.u }] });
      contents.push({ role: 'model', parts: [{ text: turn.a }] });
    });
    contents.push({ role: 'user', parts: [{ text: userText }] });

    const payload = {
      system_instruction: { parts: [{ text: getSystemPrompt() }] },
      contents,
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 1200,
        topK: 40,
        topP: 0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    let res;
    try {
      res = await fetch(getGeminiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      throw new Error('Network error — check your internet connection.');
    }

    if (!res.ok) {
      let errMsg = 'API error ' + res.status;
      try {
        const j = await res.json();
        errMsg = j?.error?.message || errMsg;
      } catch (_) {}
      if (res.status === 400) throw new Error('Bad request: ' + errMsg);
      if (res.status === 429) throw new Error('Rate limit reached. Wait a moment and try again ⏳');
      if (res.status === 403) throw new Error('API key invalid or quota exceeded.');
      throw new Error(errMsg);
    }

    const data = await res.json();

    // Handle blocked responses
    const candidate = data?.candidates?.[0];
    if (!candidate) {
      const reason = data?.promptFeedback?.blockReason;
      throw new Error(reason ? 'Blocked: ' + reason : 'No response from Gemini.');
    }
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Response blocked by safety filters. Try rephrasing.');
    }

    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini.');
    return text;
  }

  // ── DOM HELPERS ───────────────────────────────────────────────
  function addMsg(role, text) {
    const msgs = document.getElementById('sai-msgs');
    const row = document.createElement('div');
    row.className = 'sai-msg ' + role;

    const av = document.createElement('div');
    av.className = 'sai-av';
    av.textContent = role === 'assistant' ? '🤖' : '👤';

    const bubble = document.createElement('div');
    bubble.className = 'sai-bubble';
    bubble.innerHTML = md(text);

    row.appendChild(av);
    row.appendChild(bubble);
    msgs.appendChild(row);
    scrollBot();
  }

  function showTyping() {
    const msgs = document.getElementById('sai-msgs');
    const row = document.createElement('div');
    row.className = 'sai-msg assistant';
    row.id = 'sai-typing';

    const av = document.createElement('div');
    av.className = 'sai-av';
    av.textContent = '🤖';

    const t = document.createElement('div');
    t.className = 'sai-typing';
    t.innerHTML = '<span></span><span></span><span></span>';

    row.appendChild(av);
    row.appendChild(t);
    msgs.appendChild(row);
    scrollBot();
    return row;
  }

  function removeEl(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

  function addErr(msg) {
    const msgs = document.getElementById('sai-msgs');
    const d = document.createElement('div');
    d.className = 'sai-err';
    d.textContent = '⚠️ ' + msg;
    msgs.appendChild(d);
    scrollBot();
  }

  function scrollBot() {
    const msgs = document.getElementById('sai-msgs');
    if (msgs) setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 50);
  }

  // ── MARKDOWN RENDERER ─────────────────────────────────────────
  function md(raw) {
    return raw
      // Sanitize
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      // Code blocks (```...```)
      .replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,.45);border-radius:8px;padding:8px 12px;overflow-x:auto;margin:6px 0;font-size:.72rem;color:#00e383;font-family:JetBrains Mono,monospace"><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Headers
      .replace(/^### (.+)$/gm, '<strong style="color:#00e0ff;display:block;margin-top:6px">$1</strong>')
      .replace(/^## (.+)$/gm,  '<strong style="color:#00e383;display:block;margin-top:8px;font-size:.82rem">$1</strong>')
      // Bullet lists
      .replace(/^[-*] (.+)$/gm, '• $1')
      // Numbered lists
      .replace(/^\d+\. (.+)$/gm, '→ $1')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>');
  }

  // ── KEY CONFIGURATION UI ──────────────────────────────────────
  function showKeySetupMessage(errorText) {
    const msgs = document.getElementById('sai-msgs');
    if (!msgs) return;
    
    const row = document.createElement('div');
    row.className = 'sai-msg assistant';
    
    const av = document.createElement('div');
    av.className = 'sai-av';
    av.textContent = '🔑';
    
    const bubble = document.createElement('div');
    bubble.className = 'sai-bubble';
    bubble.style.border = '1px solid rgba(255,170,0,0.3)';
    bubble.style.background = 'rgba(255,170,0,0.06)';
    
    const hasCustom = !!localStorage.getItem('v2x_gemini_key');
    bubble.innerHTML = `
      <strong style="color:#ffaa00">⚠️ API Key Error</strong>
      <p style="margin:6px 0;font-size:0.72rem;line-height:1.4;color:rgba(219,228,232,0.85)">
        ${hasCustom 
          ? 'The **custom API key** you entered is invalid, has expired/been revoked, or its quota is exceeded.' 
          : 'The default platform API key is invalid or has been revoked (e.g. flagged as leaked).'}
      </p>
      <p style="margin:4px 0 8px;font-size:0.64rem;color:rgba(219,228,232,0.6)">
        Error: <em>${errorText}</em>
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
        <input type="password" id="sai-new-key" placeholder="Paste your AIzaSy... Gemini API key" 
          style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#fff;font-size:0.7rem;outline:none;" />
        <button id="sai-save-key-btn" style="width:100%;padding:6px;border-radius:8px;border:none;background:#ffaa00;color:#000;font-size:0.7rem;font-weight:bold;cursor:pointer;transition:background 0.2s">
          Apply & Save Key
        </button>
        <span style="font-size:0.58rem;color:rgba(132,149,134,0.6);text-align:center">
          Key will be saved locally in your browser storage.
        </span>
      </div>
    `;
    
    row.appendChild(av);
    row.appendChild(bubble);
    msgs.appendChild(row);
    scrollBot();
    
    // Bind click
    setTimeout(() => {
      const btn = document.getElementById('sai-save-key-btn');
      const input = document.getElementById('sai-new-key');
      if (btn && input) {
        btn.addEventListener('click', () => {
          const val = input.value.trim();
          if (val) {
            localStorage.setItem('v2x_gemini_key', val);
            clearChat();
            addMsg('assistant', '✅ **Gemini API Key updated successfully!** Try asking a question now.');
          }
        });
      }
    }, 100);
  }

  function showKeyConfigUI() {
    const msgs = document.getElementById('sai-msgs');
    if (!msgs) return;
    
    const customKey = localStorage.getItem('v2x_gemini_key') || '';
    const hasCustom = !!customKey;
    
    const row = document.createElement('div');
    row.className = 'sai-msg assistant';
    
    const av = document.createElement('div');
    av.className = 'sai-av';
    av.textContent = '🔑';
    
    const bubble = document.createElement('div');
    bubble.className = 'sai-bubble';
    bubble.style.border = '1px solid rgba(0,224,255,0.3)';
    bubble.style.background = 'rgba(0,224,255,0.06)';
    
    bubble.innerHTML = `
      <strong style="color:#00e0ff">🔑 Gemini API Key Configuration</strong>
      <p style="margin:6px 0;font-size:0.72rem;line-height:1.4">
        ${hasCustom 
          ? 'You are using a **custom API key** saved in this browser.' 
          : 'You are currently using the **default platform API key**.'}
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
        <input type="password" id="sai-new-key" placeholder="Paste your AIzaSy... Gemini API key" 
          value="${customKey}"
          style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#fff;font-size:0.7rem;outline:none;" />
        <div style="display:flex;gap:6px">
          <button id="sai-save-key-btn" style="flex:1;padding:6px;border-radius:8px;border:none;background:#00e383;color:#000;font-size:0.7rem;font-weight:bold;cursor:pointer">
            Save Key
          </button>
          ${hasCustom ? `
            <button id="sai-reset-key-btn" style="padding:6px 10px;border-radius:8px;border:1px solid rgba(255,112,112,0.3);background:rgba(255,112,112,0.1);color:#ff7070;font-size:0.7rem;cursor:pointer">
              Reset
            </button>
          ` : ''}
        </div>
      </div>
    `;
    
    row.appendChild(av);
    row.appendChild(bubble);
    msgs.appendChild(row);
    scrollBot();
    
    setTimeout(() => {
      const saveBtn = document.getElementById('sai-save-key-btn');
      const resetBtn = document.getElementById('sai-reset-key-btn');
      const input = document.getElementById('sai-new-key');
      
      if (saveBtn && input) {
        saveBtn.addEventListener('click', () => {
          const val = input.value.trim();
          if (val) {
            localStorage.setItem('v2x_gemini_key', val);
            addMsg('assistant', '✅ **Gemini API Key updated successfully!** Try chatting now.');
          } else {
            localStorage.removeItem('v2x_gemini_key');
            addMsg('assistant', '🔄 **Custom API Key removed.** Reverted to default platform key.');
          }
        });
      }
      
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          localStorage.removeItem('v2x_gemini_key');
          addMsg('assistant', '🔄 **API Key Reset.** Reverted to default platform key.');
        });
      }
    }, 100);
  }

  // ── BOOT ──────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
