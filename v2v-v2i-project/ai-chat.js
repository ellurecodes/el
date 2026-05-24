// ================================================================
//  Syntrix V2X — AI ASSISTANT WIDGET
//  Powered by Google Gemini 2.0 Flash (Free Tier)
//
//  Drop this script into any page and it auto-injects a fully
//  functional AI chat widget with Syntrix branding.
//  ── Place your Gemini API key in the CONFIG below ──
// ================================================================

(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────
  const CONFIG = {
    apiKey: 'AIzaSyAyeQpH0_wVzY_iYhOb555mDY2s2U-aZ4M',        // Gemini API Key
    model: 'gemini-2.0-flash',            // Free tier model
    maxHistory: 20,                        // Chat turns to keep
    storageKey: 'syntrix_ai_chat',
  };

  // ── SYSTEM CONTEXT ─────────────────────────────────────────
  const SYSTEM_PROMPT = `You are Syntrix AI, a friendly and knowledgeable assistant embedded in the Syntrix V2X Traffic Management & Emergency Vehicle Clearance System.

You are like a helpful friend — warm, casual, smart, and direct. You can answer questions about ANYTHING — both about this platform and general topics like technology, science, weather, coding, math, general knowledge, life advice, etc.

## About the Syntrix V2X Platform:
Syntrix is a real-time Vehicle-to-Vehicle (V2V) and Vehicle-to-Infrastructure (V2I) communication system built for smart city traffic management. It uses Firebase Realtime Database, GPS, Kalman filtering, and the Vincenty formula.

## Pages / Portals:
- **Login** (/login): Entry point. Role-based login. Roles: City Administrator, Emergency Responder, Civic Driver, Signal Authority.
- **Control Center** (/control): Admin-only dashboard. Shows live Leaflet map with all vehicle & signal markers, V2V/V2I circles, route history polyline, GPS accuracy dashboard, user management, pending role approvals, analytics, system broadcast.
- **Emergency Responder** (/emergency): For ambulance/fire/police drivers. Activate GPS broadcast, transmit live position to Firebase, see signal status, V2V nearby vehicle count. Screen stays on via Wake Lock API.
- **Signal Authority** (/signal): For traffic signal operators. Receives V2I commands from EV. Signal auto-preempts to GREEN when EV within 50m range. Normal cycle: RED 8s → GREEN 5s → YELLOW 2s.
- **Civic Driver** (/vehicle1, /vehicle2): Regular drivers. Receive V2V yield alerts when EV approaches within 25m. Shows which side to yield.
- **User Portal** (/user-portal): Role selection after login. Emergency Responder & Signal Authority require admin approval. Civic Driver & Observer are instant access.
- **Observer Mode** (/admin-preview): Read-only live view of all nodes. No broadcasting.

## Key Technical Concepts:
- **V2V**: Vehicle-to-Vehicle — EV broadcasts GPS to civic vehicles. If within 25m, they get yield alert.
- **V2I**: Vehicle-to-Infrastructure — EV's GPS triggers signal preemption if within 50m. Signal turns GREEN.
- **Kalman Filter**: Smooths GPS noise for accurate positioning.
- **Vincenty Formula**: Precise distance calculation on WGS-84 ellipsoid.
- **Firebase Realtime DB**: All live data flows through /v4/ node. Key paths: /v4/emergency, /v4/signal, /v4/vehicle1, /v4/vehicle2, /v4/users, /v4/admins, /v4/banned.
- **Auth**: Google SSO + email/password. Super Admin: vishal797577@gmail.com. Fallback: admin/V2X@2024.
- **Role Approval**: Admins approve EV and Signal roles via the Control Center → Users panel → Pending Approvals section.

## Current Page Context:
${window.location.pathname}

Always be helpful, friendly and conversational. Use emojis occasionally. Keep responses concise unless the user wants detail. If asked about the current page, explain what it does. Format code in backticks.`;

  // ── STYLES ──────────────────────────────────────────────────
  const CSS = `
#syntrix-ai-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 99999;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00e383, #00a855);
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0,227,131,.4), 0 0 0 0 rgba(0,227,131,.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  transition: transform .2s, box-shadow .2s;
  animation: aiPulse 3s ease-in-out infinite;
}
#syntrix-ai-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 28px rgba(0,227,131,.55);
}
@keyframes aiPulse {
  0%,100% { box-shadow: 0 4px 20px rgba(0,227,131,.4), 0 0 0 0 rgba(0,227,131,.25); }
  50% { box-shadow: 0 4px 20px rgba(0,227,131,.4), 0 0 0 10px rgba(0,227,131,0); }
}
#syntrix-ai-badge {
  position: absolute;
  top: -3px; right: -3px;
  width: 14px; height: 14px;
  background: #c6031a;
  border-radius: 50%;
  border: 2px solid #0d1518;
  display: none;
}
#syntrix-ai-panel {
  position: fixed;
  bottom: 88px;
  right: 24px;
  z-index: 99998;
  width: 360px;
  max-height: 560px;
  display: flex;
  flex-direction: column;
  border-radius: 1.25rem;
  overflow: hidden;
  background: rgba(10, 18, 22, 0.97);
  border: 1px solid rgba(0,227,131,.18);
  box-shadow: 0 24px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04);
  backdrop-filter: blur(20px);
  transform-origin: bottom right;
  transform: scale(0.85);
  opacity: 0;
  pointer-events: none;
  transition: transform .22s cubic-bezier(.34,1.56,.64,1), opacity .18s;
}
#syntrix-ai-panel.open {
  transform: scale(1);
  opacity: 1;
  pointer-events: all;
}
@media (max-width: 440px) {
  #syntrix-ai-panel {
    width: calc(100vw - 16px);
    right: 8px;
    bottom: 82px;
    max-height: 75vh;
  }
}
.ai-panel-header {
  padding: 13px 16px;
  background: linear-gradient(135deg, rgba(0,227,131,.1), rgba(0,224,255,.06));
  border-bottom: 1px solid rgba(0,227,131,.12);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.ai-avatar {
  width: 34px; height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #00e383, #00a855);
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  box-shadow: 0 0 14px rgba(0,227,131,.3);
}
.ai-header-info { flex: 1; }
.ai-header-name {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: .78rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: .04em;
}
.ai-header-status {
  font-size: .58rem;
  color: rgba(0,227,131,.8);
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 1px;
  font-family: 'JetBrains Mono', monospace;
}
.ai-status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #00e383;
  animation: aiDotPulse 2s ease-in-out infinite;
}
@keyframes aiDotPulse { 0%,100%{opacity:1}50%{opacity:.4} }
.ai-close-btn {
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: rgba(219,228,232,.6);
  font-size: .9rem;
  transition: .15s;
}
.ai-close-btn:hover { background: rgba(255,255,255,.14); color: #fff; }
.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}
.ai-messages::-webkit-scrollbar { width: 3px; }
.ai-messages::-webkit-scrollbar-thumb { background: rgba(0,227,131,.2); border-radius: 2px; }
.ai-msg {
  display: flex;
  gap: 8px;
  animation: msgSlideIn .2s ease;
}
@keyframes msgSlideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.ai-msg.user { flex-direction: row-reverse; }
.ai-msg-avatar {
  width: 26px; height: 26px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: .75rem;
  flex-shrink: 0;
  margin-top: 2px;
}
.ai-msg.assistant .ai-msg-avatar {
  background: linear-gradient(135deg, #00e383, #00a855);
}
.ai-msg.user .ai-msg-avatar {
  background: rgba(0,224,255,.12);
  border: 1px solid rgba(0,224,255,.2);
}
.ai-msg-bubble {
  max-width: 78%;
  padding: 9px 13px;
  border-radius: 1rem;
  font-size: .78rem;
  line-height: 1.65;
  word-break: break-word;
}
.ai-msg.assistant .ai-msg-bubble {
  background: rgba(25,33,36,.9);
  border: 1px solid rgba(255,255,255,.07);
  color: #dbe4e8;
  border-radius: 4px 1rem 1rem 1rem;
}
.ai-msg.user .ai-msg-bubble {
  background: linear-gradient(135deg, rgba(0,227,131,.15), rgba(0,227,131,.08));
  border: 1px solid rgba(0,227,131,.2);
  color: #fff;
  border-radius: 1rem 4px 1rem 1rem;
  text-align: right;
}
.ai-msg-bubble code {
  background: rgba(0,0,0,.4);
  border-radius: 4px;
  padding: 1px 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: .72rem;
  color: #00e383;
}
.ai-msg-bubble strong { color: #00e383; }
.ai-msg-bubble em { color: rgba(0,224,255,.9); font-style: italic; }
.ai-typing {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background: rgba(25,33,36,.9);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 4px 1rem 1rem 1rem;
  width: fit-content;
}
.ai-typing span {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #00e383;
  animation: typingBounce 1.2s ease-in-out infinite;
}
.ai-typing span:nth-child(2) { animation-delay: .2s; }
.ai-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes typingBounce {
  0%,60%,100% { transform: translateY(0); opacity:.4; }
  30% { transform: translateY(-5px); opacity:1; }
}
.ai-input-area {
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,.07);
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-shrink: 0;
  background: rgba(7,15,18,.8);
}
.ai-input {
  flex: 1;
  background: rgba(25,33,36,.9);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: .75rem;
  color: #dbe4e8;
  font-family: 'Inter', sans-serif;
  font-size: .78rem;
  padding: 9px 13px;
  resize: none;
  outline: none;
  max-height: 100px;
  min-height: 38px;
  transition: border-color .18s;
  line-height: 1.5;
}
.ai-input::placeholder { color: rgba(132,149,134,.5); }
.ai-input:focus { border-color: rgba(0,227,131,.35); }
.ai-send-btn {
  width: 36px; height: 36px;
  border-radius: .75rem;
  background: linear-gradient(135deg, #00e383, #00a855);
  border: none;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: .9rem;
  transition: .18s;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,227,131,.25);
}
.ai-send-btn:hover { transform: scale(1.08); }
.ai-send-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.ai-quick-chips {
  padding: 4px 12px 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.ai-chip {
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(0,227,131,.08);
  border: 1px solid rgba(0,227,131,.18);
  color: rgba(0,227,131,.85);
  font-size: .6rem;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  transition: .15s;
  white-space: nowrap;
}
.ai-chip:hover { background: rgba(0,227,131,.18); color: #00e383; }
.ai-error-msg {
  color: #ff7070;
  font-size: .72rem;
  text-align: center;
  padding: 6px 10px;
  background: rgba(198,3,26,.08);
  border-radius: .5rem;
  margin: 4px 0;
}
.ai-key-prompt {
  padding: 16px;
  text-align: center;
  font-size: .75rem;
  color: rgba(219,228,232,.6);
  font-family: 'Inter', sans-serif;
  line-height: 1.7;
}
.ai-key-prompt a {
  color: #00e383;
  text-decoration: none;
  font-weight: 600;
}
.ai-key-input-wrap { margin-top: 10px; display: flex; gap: 6px; }
.ai-key-input {
  flex: 1;
  background: rgba(25,33,36,.9);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: .5rem;
  color: #dbe4e8;
  font-size: .7rem;
  padding: 7px 10px;
  outline: none;
  font-family: 'JetBrains Mono', monospace;
}
.ai-key-input:focus { border-color: rgba(0,227,131,.4); }
.ai-key-save-btn {
  padding: 7px 14px;
  background: #00e383;
  color: #000;
  border: none;
  border-radius: .5rem;
  font-size: .7rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
`;

  // ── QUICK QUESTIONS ─────────────────────────────────────────
  const QUICK_CHIPS = [
    'What is V2X?',
    'How do I log in?',
    'What is V2I preemption?',
    'How does the EV panel work?',
    'Explain Kalman filter',
  ];

  // ── STATE ───────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;
  let chatHistory = [];
  let apiKey = CONFIG.apiKey;

  // ── INJECT CSS ──────────────────────────────────────────────
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── BUILD HTML ──────────────────────────────────────────────
  function buildWidget() {
    // Floating button
    const btn = document.createElement('button');
    btn.id = 'syntrix-ai-btn';
    btn.title = 'Open Syntrix AI';
    btn.innerHTML = '⊞<span id="syntrix-ai-badge"></span>';
    btn.addEventListener('click', togglePanel);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'syntrix-ai-panel';
    panel.innerHTML = `
      <div class="ai-panel-header">
        <div class="ai-avatar">⊞</div>
        <div class="ai-header-info">
          <div class="ai-header-name">Syntrix AI</div>
          <div class="ai-header-status">
            <span class="ai-status-dot"></span>
            Powered by Gemini 2.0 Flash · Free
          </div>
        </div>
        <button class="ai-close-btn" title="Close" onclick="document.getElementById('syntrix-ai-btn').click()">✕</button>
      </div>
      <div class="ai-messages" id="syntrix-ai-messages"></div>
      <div class="ai-quick-chips" id="syntrix-ai-chips"></div>
      <div class="ai-input-area">
        <textarea class="ai-input" id="syntrix-ai-input"
          placeholder="Ask me anything about Syntrix or anything else…"
          rows="1"></textarea>
        <button class="ai-send-btn" id="syntrix-ai-send" title="Send">➤</button>
      </div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(panel);
  }

  // ── INIT INTERACTIONS ───────────────────────────────────────
  function initInteractions() {
    const input  = document.getElementById('syntrix-ai-input');
    const sendBtn = document.getElementById('syntrix-ai-send');
    const chipsEl = document.getElementById('syntrix-ai-chips');

    // Quick chips
    QUICK_CHIPS.forEach(q => {
      const chip = document.createElement('button');
      chip.className = 'ai-chip';
      chip.textContent = q;
      chip.addEventListener('click', () => {
        input.value = q;
        sendMessage();
      });
      chipsEl.appendChild(chip);
    });

    // Send button
    sendBtn.addEventListener('click', sendMessage);

    // Enter key (Shift+Enter = newline)
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
  }

  // ── TOGGLE PANEL ────────────────────────────────────────────
  function togglePanel() {
    isOpen = !isOpen;
    const panel = document.getElementById('syntrix-ai-panel');
    const badge = document.getElementById('syntrix-ai-badge');
    panel.classList.toggle('open', isOpen);
    if (badge) badge.style.display = 'none';

    if (isOpen) {
      // Show greeting if no history
      if (chatHistory.length === 0) {
        setTimeout(() => showGreeting(), 200);
      }
      setTimeout(() => {
        const input = document.getElementById('syntrix-ai-input');
        if (input) input.focus();
        scrollToBottom();
      }, 250);

      // Check API key
      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
        const saved = localStorage.getItem('syntrix_gemini_key');
        if (saved) {
          apiKey = saved;
        } else {
          showKeyPrompt();
        }
      }
    }
  }

  // ── API KEY PROMPT ──────────────────────────────────────────
  function showKeyPrompt() {
    const msgsEl = document.getElementById('syntrix-ai-messages');
    const div = document.createElement('div');
    div.className = 'ai-key-prompt';
    div.innerHTML = `
      <div>🔑 Enter your <strong style="color:#00e383">free Gemini API key</strong> to start chatting.<br>
      Get one at <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com</a> — no credit card needed!</div>
      <div class="ai-key-input-wrap">
        <input class="ai-key-input" id="ai-key-field" placeholder="AIza..." type="password">
        <button class="ai-key-save-btn" onclick="window._syntrixAI.saveKey()">Save</button>
      </div>
    `;
    msgsEl.appendChild(div);
    scrollToBottom();
  }

  // ── GREETING ────────────────────────────────────────────────
  function showGreeting() {
    const page = window.location.pathname.replace('/', '') || 'login';
    const greetings = {
      login:   '👋 Hey! I\'m **Syntrix AI** — your V2X system guide. Log in and I\'ll help you navigate the platform. Or ask me anything!',
      control: '🎛️ Welcome to the **Control Center**! I can help you manage users, understand the live map, configure ranges, or answer anything else.',
      emergency: '🚨 **EV Command Panel** — tap the red button to broadcast your GPS. Ask me about V2V alerts, signal preemption, or how the Kalman filter works!',
      signal:  '🚦 **Signal Authority Panel** — your signal auto-preempts when an EV gets within 50m. Ask me about the signal cycle or V2I logic!',
      'vehicle1': '🚗 **Civic Driver 1** — I\'ll alert you when an EV is nearby. Ask me what V2V means or how to yield correctly!',
      'vehicle2': '🚗 **Civic Driver 2** — same as Vehicle 1 but on a separate Firebase node. Questions? Just ask!',
      'user-portal': '🌐 **Role Portal** — choose your role here. EV and Signal roles need admin approval. Ask me anything!',
      'admin-preview': '👁️ **Observer Mode** — read-only live view. Ask me about the system data you\'re seeing!',
    };
    const msg = greetings[page] || '👋 Hi! I\'m **Syntrix AI**. I know everything about this V2X platform and can also help with general questions. What\'s on your mind?';
    addMessage('assistant', msg);
  }

  // ── SEND MESSAGE ────────────────────────────────────────────
  async function sendMessage() {
    if (isLoading) return;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
      const saved = localStorage.getItem('syntrix_gemini_key');
      if (saved) { apiKey = saved; } else { showKeyPrompt(); return; }
    }

    const input = document.getElementById('syntrix-ai-input');
    const sendBtn = document.getElementById('syntrix-ai-send');
    const text = input.value.trim();
    if (!text) return;

    // Hide quick chips after first message
    const chips = document.getElementById('syntrix-ai-chips');
    if (chips) chips.style.display = 'none';

    addMessage('user', text);
    input.value = '';
    input.style.height = 'auto';

    isLoading = true;
    sendBtn.disabled = true;
    const typingEl = showTyping();

    try {
      const reply = await callGemini(text);
      removeTyping(typingEl);
      addMessage('assistant', reply);

      // Store in history (limit to maxHistory pairs)
      chatHistory.push({ role: 'user', text });
      chatHistory.push({ role: 'assistant', text: reply });
      if (chatHistory.length > CONFIG.maxHistory * 2) {
        chatHistory = chatHistory.slice(-CONFIG.maxHistory * 2);
      }
    } catch (err) {
      removeTyping(typingEl);
      const errDiv = document.createElement('div');
      errDiv.className = 'ai-error-msg';
      errDiv.textContent = '⚠️ ' + (err.message || 'Something went wrong. Check your API key.');
      document.getElementById('syntrix-ai-messages').appendChild(errDiv);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      scrollToBottom();
      input.focus();
    }
  }

  // ── CALL GEMINI API ─────────────────────────────────────────
  async function callGemini(userText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.model}:generateContent?key=${apiKey}`;

    // Build conversation contents
    const contents = [];

    // Past turns
    for (let i = 0; i < chatHistory.length; i += 2) {
      if (chatHistory[i] && chatHistory[i+1]) {
        contents.push({ role: 'user',  parts: [{ text: chatHistory[i].text }] });
        contents.push({ role: 'model', parts: [{ text: chatHistory[i+1].text }] });
      }
    }

    // Current message
    contents.push({ role: 'user', parts: [{ text: userText }] });

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1024,
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

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      const msg = err?.error?.message || `API error ${resp.status}`;
      if (resp.status === 400 && msg.includes('API_KEY')) throw new Error('Invalid API key. Check aistudio.google.com');
      if (resp.status === 429) throw new Error('Rate limit hit. Wait a moment and try again.');
      throw new Error(msg);
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini.');
    return text;
  }

  // ── ADD MESSAGE ─────────────────────────────────────────────
  function addMessage(role, text) {
    const msgsEl = document.getElementById('syntrix-ai-messages');
    const wrap = document.createElement('div');
    wrap.className = 'ai-msg ' + role;

    const avatar = document.createElement('div');
    avatar.className = 'ai-msg-avatar';
    avatar.textContent = role === 'assistant' ? '⊞' : '👤';

    const bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble';
    bubble.innerHTML = formatMarkdown(text);

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    msgsEl.appendChild(wrap);
    scrollToBottom();
  }

  // ── TYPING INDICATOR ────────────────────────────────────────
  function showTyping() {
    const msgsEl = document.getElementById('syntrix-ai-messages');
    const wrap = document.createElement('div');
    wrap.className = 'ai-msg assistant';
    wrap.id = 'syntrix-ai-typing';

    const avatar = document.createElement('div');
    avatar.className = 'ai-msg-avatar';
    avatar.textContent = '⊞';

    const typing = document.createElement('div');
    typing.className = 'ai-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';

    wrap.appendChild(avatar);
    wrap.appendChild(typing);
    msgsEl.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function removeTyping(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // ── MARKDOWN FORMATTER ───────────────────────────────────────
  function formatMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  // ── SCROLL ──────────────────────────────────────────────────
  function scrollToBottom() {
    const msgsEl = document.getElementById('syntrix-ai-messages');
    if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  // ── EXPOSE GLOBALS ───────────────────────────────────────────
  window._syntrixAI = {
    saveKey() {
      const field = document.getElementById('ai-key-field');
      if (!field || !field.value.trim()) return;
      apiKey = field.value.trim();
      localStorage.setItem('syntrix_gemini_key', apiKey);
      // Clear key prompt and show greeting
      const msgsEl = document.getElementById('syntrix-ai-messages');
      msgsEl.innerHTML = '';
      chatHistory = [];
      showGreeting();
    },
    clearChat() {
      chatHistory = [];
      const msgsEl = document.getElementById('syntrix-ai-messages');
      if (msgsEl) msgsEl.innerHTML = '';
      showGreeting();
    }
  };

  // ── INIT ────────────────────────────────────────────────────
  function init() {
    // Check saved key
    const savedKey = localStorage.getItem('syntrix_gemini_key');
    if (savedKey) apiKey = savedKey;

    injectStyles();
    buildWidget();
    initInteractions();

    console.log('✅ Syntrix AI Chat Widget loaded · Gemini 2.0 Flash');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
