
// ── CONFIG ─────────────────────────────────────────────────────────────────
let CFG = {
  orKey:    localStorage.getItem('pg_or_key')   || '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',
  anthKey:  localStorage.getItem('pg_anth_key') || '',
  nomicUrl: localStorage.getItem('pg_nomic')    || 'http://192.168.50.234:11434',
};

// ── MODELS ─────────────────────────────────────────────────────────────────
// ✅ = confirmed working | ⚡ = may rate-limit under heavy load | 🔒 = needs OpenRouter privacy setting
const ALL_MODELS = [
  { id: 'openrouter/free',                                                  label: '🎲 AUTO (best available)',  tag: 'wildcard' },
  // ── CONFIRMED WORKING ──────────────────────────────────────────────────
  { id: 'arcee-ai/trinity-large-preview:free',                              label: 'Trinity Large ✅',          tag: 'general'   },
  { id: 'stepfun/step-3.5-flash:free',                                      label: 'Step 3.5 Flash ✅',         tag: 'general'   },
  { id: 'z-ai/glm-4.5-air:free',                                            label: 'GLM 4.5 Air ✅',            tag: 'general'   },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free',                              label: 'Nemotron 30B ✅',           tag: 'general'   },
  // ── POPULAR BUT MAY RATE-LIMIT ─────────────────────────────────────────
  { id: 'meta-llama/llama-3.3-70b-instruct:free',                           label: 'Llama 3.3 70B ⚡',         tag: 'general'   },
  { id: 'deepseek/deepseek-r1:free',                                        label: 'DeepSeek R1 ⚡',            tag: 'reasoning' },
  { id: 'deepseek/deepseek-chat-v3-0324:free',                              label: 'DeepSeek V3 ⚡',            tag: 'general'   },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free',                    label: 'Mistral Small 24B ⚡',      tag: 'general'   },
  { id: 'nousresearch/hermes-3-llama-3.1-405b:free',                        label: 'Hermes 3 405B ⚡',          tag: 'general'   },
  { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',    label: 'Venice Uncensored ⚡',      tag: 'creative'  },
  { id: 'qwen/qwen3-coder:free',                                            label: 'Qwen3 Coder 480B ⚡',       tag: 'coding'    },
  // ── NEEDS PRIVACY SETTING (openrouter.ai/settings/privacy) ────────────
  { id: 'openai/gpt-oss-120b:free',                                         label: 'GPT-OSS 120B 🔒',          tag: 'general'   },
  { id: 'openai/gpt-oss-20b:free',                                          label: 'GPT-OSS 20B 🔒',           tag: 'general'   },
];

let activeModels = new Set(['arcee-ai/trinity-large-preview:free','stepfun/step-3.5-flash:free','z-ai/glm-4.5-air:free','nvidia/nemotron-3-nano-30b-a3b:free']);
let selectedCards = new Set(); // card indices that are selected
let responses = {}; // modelId -> {text, time, tokens}
let currentPrompt = '';

// ── PROMPT HISTORY ─────────────────────────────────────────────────────────
let promptHistory = JSON.parse(localStorage.getItem('salvo_history') || '[]');
let reqCount = parseInt(localStorage.getItem('salvo_reqcount') || '0');
let reqDate  = localStorage.getItem('salvo_reqdate') || '';

function saveToHistory(prompt) {
  // reset daily counter if new day
  const today = new Date().toDateString();
  if (reqDate !== today) { reqCount = 0; reqDate = today; }
  reqCount += activeModels.size;
  localStorage.setItem('salvo_reqcount', reqCount);
  localStorage.setItem('salvo_reqdate', reqDate);
  document.getElementById('reqCounter').textContent = `${reqCount}/200 today`;

  // save prompt
  promptHistory = [prompt, ...promptHistory.filter(p => p !== prompt)].slice(0, 20);
  localStorage.setItem('salvo_history', JSON.stringify(promptHistory));
  renderHistory();
}

function renderHistory() {
  const sel = document.getElementById('historySelect');
  sel.innerHTML = '<option value="">⏱ PROMPT HISTORY...</option>' +
    promptHistory.map((p, i) => `<option value="${i}">${p.substring(0,60)}${p.length>60?'...':''}</option>`).join('');
  document.getElementById('reqCounter').textContent = `${reqCount}/200 today`;
}

function loadHistory() {
  const sel = document.getElementById('historySelect');
  if (sel.value === '') return;
  document.getElementById('prompt').value = promptHistory[parseInt(sel.value)];
  sel.value = '';
}

// ── INIT ───────────────────────────────────────────────────────────────────
function init() {
  renderModelChips();
  updateSelectedCount();
  checkNomic();
  renderHistory();
  discoverOllama(); // quietly probe in background
  updateMemoryCount();  // show stored memory count on load
  // restore saved theme
  const accent  = localStorage.getItem('pg_accent') || '#00ff16';
  const textCol = localStorage.getItem('pg_text')   || '#e8f4e8';
  const font    = localStorage.getItem('pg_font')   || "'Share Tech Mono', monospace";
  applyTheme(accent, textCol, font);
  document.getElementById('prompt').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) fireAll();
  });
}

function renderModelChips() {
  const el = document.getElementById('modelSelector');
  const tagColors = { general:'#6a90a0', reasoning:'#a78bfa', coding:'#60a5fa', creative:'#f9a8d4', wildcard:'#ffd60a' };
  el.innerHTML = ALL_MODELS.map(m => {
    const col = tagColors[m.tag] || '#6a90a0';
    return `<div class="model-chip ${activeModels.has(m.id) ? 'active' : ''}"
       onclick="toggleModel('${m.id}')" data-id="${m.id}"
       style="${activeModels.has(m.id) ? '' : `border-color:${col}33;`}">
      <span style="color:${col};font-size:9px;margin-right:4px;">[${m.tag||'general'}]</span>${m.label}
    </div>`;
  }).join('');
}

function toggleModelSelector() {
  const el = document.getElementById('modelSelector');
  const btn = document.getElementById('modelToggleBtn');
  if (el.classList.contains('collapsed')) {
    el.classList.remove('collapsed');
    btn.textContent = '▲ HIDE';
  } else {
    el.classList.add('collapsed');
    btn.textContent = '▼ SHOW';
  }
}

function updateSelectedCount() {
  const el = document.getElementById('selectedCount');
  if (el) el.textContent = activeModels.size + ' selected';
}

function toggleModel(id) {
  if (activeModels.has(id)) { activeModels.delete(id); }
  else { activeModels.add(id); }
  renderModelChips();
  updateSelectedCount();
}



async function checkNomic() {
  try {
    const r = await fetch(CFG.nomicUrl + '/api/tags', { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      document.getElementById('memoryBadge').className = 'memory-badge online';
      document.getElementById('memoryBadge').textContent = '◉ NOMIC ONLINE';
    }
  } catch(e) {
    document.getElementById('memoryBadge').textContent = '○ NOMIC OFFLINE';
  }
}

// ── FIRE ───────────────────────────────────────────────────────────────────
async function fireAll() {
  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt) { toast('Enter a prompt first'); return; }
  if (activeModels.size === 0) { toast('Select at least one model'); return; }
  if (!CFG.orKey) { openSettings(); toast('Add your OpenRouter key first'); return; }

  currentPrompt = prompt;
  saveToHistory(prompt);
  selectedCards.clear();
  responses = {};
  updateSynthPanel();

  document.getElementById('fireBtn').disabled = true;
  document.getElementById('statusPill').textContent = 'FIRING...';

  // rate limit warning
  if (activeModels.size > 5) {
    toast(`⚠ Firing ${activeModels.size} models — free tier allows 20 req/min`);
  }

  // render cards
  const arena = document.getElementById('arena');
  arena.innerHTML = '';
  const modelList = [...activeModels];

  modelList.forEach((modelId, i) => {
    const m = ALL_MODELS.find(x => x.id === modelId) || { label: modelId };
    arena.innerHTML += `
      <div class="card loading" id="card-${i}" style="animation-delay:${i*0.06}s">
        <div class="card-header">
          <div class="card-model">
            <div class="dot" id="dot-${i}"></div>
            <span>${m.label}</span>
          </div>
          <div class="card-meta" id="meta-${i}">QUERYING...</div>
        </div>
        <div class="loading-bar" id="bar-${i}"></div>
        <div class="card-body" id="body-${i}"><span style="color:var(--dim);font-family:'Share Tech Mono',monospace;font-size:11px;">▌ waiting for response...</span></div>
        <div class="card-footer">
          <button class="btn-select" id="selBtn-${i}" onclick="toggleSelect(${i},'${modelId}')" disabled>SELECT</button>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn-select" id="cpyBtn-${i}" onclick="copyResponse('${modelId}')" disabled style="border-color:#2a5040;">📋 COPY</button>
            <div class="card-tokens" id="tok-${i}"></div>
          </div>
        </div>
      </div>`;
  });

  // fire all simultaneously
  const promises = modelList.map((modelId, i) => queryModel(modelId, i, prompt));
  await Promise.allSettled(promises);

  document.getElementById('fireBtn').disabled = false;
  document.getElementById('statusPill').textContent = 'COMPLETE';
}

async function queryModel(modelId, idx, prompt, isRetry = false) {
  const start = Date.now();
  try {
    // optionally get memory context
    let systemMsg = 'You are a helpful AI assistant. Be concise and clear.';
    const memCtx = await getMemoryContext(prompt);
    if (memCtx) systemMsg += `\n\nRelevant context from memory:\n${memCtx}`;

    // Prepend packed codebase context if active
    const fullPrompt = (contextActive && contextText)
      ? `I am sharing a codebase/project for you to reference:\n\n${contextText}\n\n---\nQUESTION:\n${prompt}`
      : prompt;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CFG.orKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'Polyglot Arena'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user',   content: fullPrompt }
        ],
        max_tokens: 1500,
        stream: true
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${res.status}`;
      // auto-retry once on rate limit
      if (res.status === 429 && !isRetry) {
        document.getElementById(`meta-${idx}`).textContent = 'RATE LIMITED — retrying in 4s...';
        await new Promise(r => setTimeout(r, 4000));
        return queryModel(modelId, idx, prompt, true);
      }
      throw new Error(msg);
    }

    // streaming
    const body = document.getElementById(`body-${idx}`);
    body.textContent = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let tokenCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const j = JSON.parse(data);
          const d = j.choices?.[0]?.delta;
          // content = final answer, reasoning = thinking tokens (GLM, Step etc send reasoning first)
          const text = (d?.content ?? '') || (d?.reasoning ?? '');
          if (text) {
            fullText += text;
            body.textContent = fullText;
            body.scrollTop = body.scrollHeight;
            tokenCount = j.usage?.completion_tokens || Math.floor(fullText.length / 4);
          }
        } catch(e) {}
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    responses[modelId] = { text: fullText, time: elapsed, tokens: tokenCount, idx };

    // update card state
    document.getElementById(`dot-${idx}`).className = 'dot done';
    document.getElementById(`meta-${idx}`).textContent = `${elapsed}s`;
    document.getElementById(`bar-${idx}`).style.display = 'none';
    document.getElementById(`card-${idx}`).classList.remove('loading');
    document.getElementById(`selBtn-${idx}`).disabled = false;
    document.getElementById(`cpyBtn-${idx}`).disabled = false;
    document.getElementById(`tok-${idx}`).textContent = `~${tokenCount} tokens`;

    // store in nomic memory
    await storeMemory(prompt, fullText, modelId);

  } catch(err) {
    document.getElementById(`dot-${idx}`).className = 'dot error';
    document.getElementById(`body-${idx}`).innerHTML = `<span style="color:var(--accent2);font-family:'Share Tech Mono',monospace;font-size:11px;">ERROR: ${err.message}</span>`;
    document.getElementById(`meta-${idx}`).textContent = 'FAILED';
    document.getElementById(`bar-${idx}`).style.display = 'none';
    document.getElementById(`card-${idx}`).classList.remove('loading');
  }
}

// ── SELECT ─────────────────────────────────────────────────────────────────
function exportToClaudeDesktop() {
  if (!selectedCards.size) { toast('Select at least one response first'); return; }

  const lines = [];
  lines.push('# SALVO ARENA RESULTS');
  lines.push(`**Original Prompt:** ${currentPrompt}`);
  lines.push(`**Models fired:** ${activeModels.size} cloud + ${activeLocalModels.size} local`);
  lines.push(`**Selected responses:** ${selectedCards.size}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  let i = 1;
  [...selectedCards].forEach(key => {
    let modelName, responseText, elapsed;
    if (key.startsWith('local::')) {
      const [, , name] = key.split('::');
      modelName = `[LOCAL] ${name}`;
      const r = localResponses[name];
      responseText = r?.text || ''; elapsed = r?.time || '?';
    } else {
      const [, modelId] = key.split('::');
      const m = ALL_MODELS.find(x => x.id === modelId) || { label: modelId };
      modelName = m.label;
      const r = responses[modelId];
      responseText = r?.text || ''; elapsed = r?.time || '?';
    }
    lines.push(`## Response ${i}: ${modelName} (${elapsed}s)`);
    lines.push('');
    lines.push(responseText);
    lines.push('');
    lines.push('---');
    lines.push('');
    i++;
  });

  // Add synthesis output if it exists
  const synthText = document.getElementById('synthOutput').textContent;
  if (synthText && synthText.length > 10) {
    lines.push('## Claude Synthesis (from SALVO)');
    lines.push('');
    lines.push(synthText);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push('**Please review these responses and give me your analysis.**');

  const exportText = lines.join('\n');

  // Save to file for Claude Desktop to pick up
  saveExportToFile(exportText);

  // Also copy to clipboard as backup
  navigator.clipboard.writeText(exportText).then(() => {
    toast('✅ Copied to clipboard — paste into Claude Desktop!');
  });
}

async function saveExportToFile(text) {
  // Save via localStorage so Claude Desktop MCP can see it
  localStorage.setItem('salvo_export', text);
  localStorage.setItem('salvo_export_time', new Date().toISOString());
  localStorage.setItem('salvo_export_prompt', currentPrompt);
}

function copyResponse(modelId) {
  const r = responses[modelId];
  if (!r) return;
  navigator.clipboard.writeText(r.text).then(() => toast('Response copied!'));
}

function toggleSelect(idx, modelId) {
  const card = document.getElementById(`card-${idx}`);
  const key = `${idx}::${modelId}`;
  if (selectedCards.has(key)) {
    selectedCards.delete(key);
    card.classList.remove('selected');
  } else {
    selectedCards.add(key);
    card.classList.add('selected');
  }
  updateSynthPanel();
}

function updateSynthPanel() {
  const panel = document.getElementById('synthPanel');
  const count = selectedCards.size;
  document.getElementById('synthCount').textContent = `${count} response${count !== 1 ? 's' : ''} selected`;
  document.getElementById('exportBtn').disabled = count === 0;

  const tagList = document.getElementById('synthTagList');
  tagList.innerHTML = [...selectedCards].map(key => {
    const [idx, modelId] = key.split('::');
    const m = ALL_MODELS.find(x => x.id === modelId) || { label: modelId };
    return `<div class="synth-tag">${m.label}</div>`;
  }).join('');

  if (count > 0) {
    panel.classList.add('open');
  } else {
    panel.classList.remove('open');
    document.getElementById('synthOutput').style.display = 'none';
  }
}

// ── SYNTHESIS ──────────────────────────────────────────────────────────────
async function runSynthesis() {
  if (!CFG.anthKey) {
    toast('Add your Anthropic API key in settings');
    openSettings();
    return;
  }
  if (selectedCards.size === 0) { toast('Select at least one response first'); return; }

  const btn = document.getElementById('synthBtn');
  btn.disabled = true;
  btn.textContent = '◈ ANALYZING...';

  const output = document.getElementById('synthOutput');
  output.style.display = 'block';
  output.textContent = '▌ Claude is reviewing your selected responses...';

  // build synthesis prompt — include both cloud AND local selections
  let selectedResponses = [];
  [...selectedCards].forEach(key => {
    if (key.startsWith('local::')) {
      const [, idx, modelName] = key.split('::');
      const r = localResponses[modelName];
      if (r) selectedResponses.push({ model: `[LOCAL] ${modelName}`, text: r.text });
    } else {
      const [idx, modelId] = key.split('::');
      const m = ALL_MODELS.find(x => x.id === modelId) || { label: modelId };
      const r = responses[modelId];
      if (r) selectedResponses.push({ model: m.label, text: r.text });
    }
  });

  const synthPrompt = `You are an AI synthesis engine. The user asked this prompt to multiple AI models:

ORIGINAL PROMPT:
"${currentPrompt}"

The user selected these ${selectedResponses.length} response(s) as most interesting:

${selectedResponses.map((r, i) => `--- RESPONSE ${i+1} [${r.model}] ---\n${r.text}`).join('\n\n')}

Your job:
1. Briefly note what's STRONG about the selected response(s) (1-2 sentences)
2. Note any gaps or weaknesses
3. Give 2-3 concrete OPTIONS for how to proceed — each option should be a clear next step the user could take (ask a follow-up, combine insights, go deeper on X, try a different angle, etc.)

Be direct and practical. Format cleanly.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CFG.anthKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        stream: true,
        messages: [{ role: 'user', content: synthPrompt }]
      })
    });

    if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);

    output.textContent = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const j = JSON.parse(line.slice(6));
          if (j.type === 'content_block_delta') {
            fullText += j.delta?.text || '';
            output.textContent = fullText;
            output.scrollTop = output.scrollHeight;
          }
        } catch(e) {}
      }
    }
  } catch(err) {
    output.textContent = `ERROR: ${err.message}`;
  }

  btn.disabled = false;
  btn.textContent = '◈ ANALYZE SELECTIONS';
}

// ── NOMIC MEMORY ───────────────────────────────────────────────────────────
// == NOMIC RAG MEMORY (FULL AUTO-INJECT) ==
// Vector store in localStorage: salvo_vectors [{text, vec, ts, model}]
// On each prompt: embed -> cosine sim -> inject top matches as context
// On each response: embed Q+A -> store in vector DB

const VECTOR_STORE_KEY = 'salvo_vectors';
const MAX_VECTORS = 200;
const TOP_K = 3;
const SIM_THRESHOLD = 0.72;

function loadVectors() {
  try { return JSON.parse(localStorage.getItem(VECTOR_STORE_KEY) || '[]'); }
  catch(e) { return []; }
}

function saveVectors(vecs) {
  localStorage.setItem(VECTOR_STORE_KEY, JSON.stringify(vecs.slice(-MAX_VECTORS)));
}

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

async function embedText(text) {
  const url = OLLAMA_URL || 'http://localhost:11434';
  try {
    const res = await fetch(`${url}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding || null;
  } catch(e) { return null; }
}

async function getMemoryContext(prompt) {
  try {
    const vecs = loadVectors();
    if (vecs.length === 0) return null;
    const queryVec = await embedText(prompt);
    if (!queryVec) return null;

    const scored = vecs
      .map(e => ({ text: e.text, sim: cosineSim(queryVec, e.vec) }))
      .filter(e => e.sim >= SIM_THRESHOLD)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, TOP_K);

    if (scored.length === 0) return null;

    updateMemoryBadge(scored.length, vecs.length);
    return scored.map((e, i) =>
      `[Memory ${i+1} | ${(e.sim*100).toFixed(0)}% match]\n${e.text}`
    ).join('\n\n');
  } catch(e) { return null; }
}

async function storeMemory(prompt, response, modelId) {
  try {
    const shortModel = modelId.split('/').pop().replace(':free','').substring(0, 20);
    const text = `Q: ${prompt.substring(0,200)}\nA[${shortModel}]: ${response.substring(0, 600)}`;
    const vec = await embedText(text);
    if (!vec) return;
    const vecs = loadVectors();
    vecs.push({ text, vec, ts: Date.now(), model: shortModel });
    saveVectors(vecs);
    updateMemoryCount(vecs.length);
  } catch(e) {}
}

function updateMemoryBadge(injected, total) {
  const badge = document.getElementById('memoryBadge');
  if (!badge) return;
  badge.textContent = `NOMIC: ${injected} injected (${total} stored)`;
  badge.className = 'memory-badge online';
  setTimeout(() => updateMemoryCount(total), 4000);
}

function updateMemoryCount(count) {
  const badge = document.getElementById('memoryBadge');
  if (!badge) return;
  const n = count !== undefined ? count : loadVectors().length;
  badge.textContent = n > 0 ? `NOMIC ONLINE (${n} memories)` : 'NOMIC ONLINE';
  badge.className = 'memory-badge online';
}

function clearMemory() {
  const n = loadVectors().length;
  if (!confirm(`Clear all ${n} stored memories?`)) return;
  localStorage.removeItem(VECTOR_STORE_KEY);
  toast('Memory cleared');
  updateMemoryCount(0);
}

// ── SETTINGS ───────────────────────────────────────────────────────────────
function openSettings() {
  document.getElementById('cfgOrKey').value = CFG.orKey;
  document.getElementById('cfgAnthKey').value = CFG.anthKey;
  document.getElementById('cfgNomic').value = CFG.nomicUrl;
  // load saved colors/font into pickers
  const accent = localStorage.getItem('pg_accent') || '#00ff16';
  const textCol = localStorage.getItem('pg_text')   || '#e8f4e8';
  const font    = localStorage.getItem('pg_font')   || "'Share Tech Mono', monospace";
  document.getElementById('cfgAccentColor').value = accent;
  document.getElementById('cfgAccentHex').value   = accent;
  document.getElementById('cfgTextColor').value   = textCol;
  document.getElementById('cfgTextHex').value     = textCol;
  document.getElementById('cfgFont').value        = font;
  updatePreview();
  // live preview on color wheel change
  document.getElementById('cfgAccentColor').oninput = () => {
    document.getElementById('cfgAccentHex').value = document.getElementById('cfgAccentColor').value;
    updatePreview();
  };
  document.getElementById('cfgTextColor').oninput = () => {
    document.getElementById('cfgTextHex').value = document.getElementById('cfgTextColor').value;
    updatePreview();
  };
  document.getElementById('cfgFont').onchange = updatePreview;
  document.getElementById('settingsModal').classList.add('open');
}

function syncColorFromHex(pickerID, hexID) {
  const val = document.getElementById(hexID).value;
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    document.getElementById(pickerID).value = val;
    updatePreview();
  }
}

function updatePreview() {
  const accent = document.getElementById('cfgAccentColor').value;
  const textCol = document.getElementById('cfgTextColor').value;
  const font    = document.getElementById('cfgFont').value;
  const preview = document.getElementById('colorPreview');
  preview.style.background  = accent + '18';
  preview.style.color       = textCol;
  preview.style.fontFamily  = font;
  preview.style.borderColor = accent;
}
function closeSettings() { document.getElementById('settingsModal').classList.remove('open'); }
function saveSettings() {
  CFG.orKey    = document.getElementById('cfgOrKey').value.trim();
  CFG.anthKey  = document.getElementById('cfgAnthKey').value.trim();
  CFG.nomicUrl = document.getElementById('cfgNomic').value.trim();
  const accent  = document.getElementById('cfgAccentColor').value;
  const textCol = document.getElementById('cfgTextColor').value;
  const font    = document.getElementById('cfgFont').value;
  localStorage.setItem('pg_or_key',   CFG.orKey);
  localStorage.setItem('pg_anth_key', CFG.anthKey);
  localStorage.setItem('pg_nomic',    CFG.nomicUrl);
  localStorage.setItem('pg_accent',   accent);
  localStorage.setItem('pg_text',     textCol);
  localStorage.setItem('pg_font',     font);
  OLLAMA_URL = CFG.nomicUrl;
  applyTheme(accent, textCol, font);
  closeSettings();
  checkNomic();
  toast('Settings saved!');
}

function applyTheme(accent, textCol, font) {
  const root = document.documentElement;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--text',   textCol);
  document.body.style.fontFamily = font;
  // update card body and prompt font too
  document.querySelectorAll('.card-body, textarea#prompt, .synth-output').forEach(el => {
    el.style.fontFamily = font;
    el.style.color = textCol;
  });
}

// ── CONTEXT PACKER BRIDGE ──────────────────────────────────────────────────
let contextActive = false;
let contextText = '';

function toggleContext() {
  const stored = localStorage.getItem('salvo_context_inject');
  const ts = localStorage.getItem('salvo_context_timestamp');
  const btn = document.getElementById('ctxBtn');

  if (!stored) {
    toast('No context loaded — open context-packer.html first');
    window.open('context-packer.html', '_blank');
    return;
  }

  contextActive = !contextActive;
  if (contextActive) {
    contextText = stored;
    const age = ts ? Math.round((Date.now() - parseInt(ts)) / 60000) : '?';
    const tokens = Math.round(stored.length / 4);
    btn.style.borderColor = 'var(--accent3)';
    btn.style.color = 'var(--accent3)';
    btn.textContent = `📁 CTX ON (~${tokens.toLocaleString()} tok, ${age}m ago)`;
    toast(`Context loaded! ~${tokens.toLocaleString()} tokens will be prepended to each prompt`);
  } else {
    contextText = '';
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--dim)';
    btn.textContent = '📁 CONTEXT';
    toast('Context removed');
  }
}

// ── CONTEXT PACKER BRIDGE ──────────────────────────────────────────────────
let localModels = [];
let activeLocalModels = new Set();
let localResponses = {};
let localSectionOpen = false;
const SKIP_MODELS = ['nomic-embed-text'];
let OLLAMA_URL = CFG.nomicUrl || 'http://127.0.0.1:11434';

async function discoverOllama() {
  const configs = [
    { name: 'CONFIG', url: OLLAMA_URL },
    { name: '127.0.0.1', url: 'http://127.0.0.1:11434' },
    { name: 'LOCALHOST', url: 'http://localhost:11434' }
  ];
  
  // Remove duplicates
  const urlsToTry = Array.from(new Set(configs.map(c => c.url))).map(url => configs.find(c => c.url === url));

  for (const item of urlsToTry) {
    try {
      const r = await fetch(`${item.url}/api/tags`, {
        signal: AbortSignal.timeout(3000),
        headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost' }
      });
      if (r.ok) {
        const data = await r.json();
        localModels = (data.models || []).filter(m => !SKIP_MODELS.some(s => m.name.includes(s)));
        document.getElementById('localStatus').textContent = `◉ ONLINE — ${localModels.length} models`;
        document.getElementById('localStatus').className = 'local-status online';
        document.getElementById('localFireBtn').disabled = false;
        OLLAMA_URL = item.url; 
        renderLocalChips();
        return;
      }
    } catch(e) {
      if (item === urlsToTry[urlsToTry.length - 1]) {
        try { 
          await fetch(`${item.url}/api/tags`, { mode: 'no-cors', signal: AbortSignal.timeout(3000) });
          document.getElementById('localStatus').textContent = '⚠ OLLAMA CORS BLOCKED';
          document.getElementById('localStatus').style.color = '#ff8c00';
          document.getElementById('localModelSelector').innerHTML = 
            `<div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#ff6600;">Ollama is running but CORS is blocking.</div>` +
            `<div style="font-size:10px;color:#664400;margin-top:4px;">Try opening <a href="${item.url}/api/tags" target="_blank" style="color:var(--accent);">this link</a> to verify.</div>`;
        } catch(probe) {
          document.getElementById('localStatus').textContent = '○ OLLAMA OFFLINE';
          const tried = urlsToTry.map(u => u.url).join(', ');
          document.getElementById('localModelSelector').innerHTML = 
            `<div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#664400;">Ollama not found at ${tried}</div>` +
            `<div style="font-size:10px;color:#664400;margin-top:4px;">Is it running? Try clicking <a href="http://localhost:11434" target="_blank" style="color:var(--accent);">Verify Localhost</a></div>`;
        }
      }
    }
  }
}

function renderLocalChips() {
  const el = document.getElementById('localModelSelector');
  if (!localModels.length) { el.innerHTML = '<span style="font-family:\'Share Tech Mono\',monospace;font-size:11px;color:#664400;">No chat models found</span>'; return; }
  const tagMap = { qwen:'qwen', llama:'llama', mistral:'mistral', deepseek:'deepseek', coder:'coding' };
  el.innerHTML = localModels.map(m => {
    const tag = Object.entries(tagMap).find(([k]) => m.name.toLowerCase().includes(k))?.[1] || 'local';
    const size = (m.size / 1e9).toFixed(1) + 'GB';
    return `<div class="local-chip ${activeLocalModels.has(m.name) ? 'active' : ''}" onclick="toggleLocalModel('${m.name}')">
      <span style="color:#664400;font-size:9px;">[${tag}]</span> ${m.name} <span style="color:#443300;font-size:9px;">${size}</span></div>`;
  }).join('');
}

function toggleLocalModel(name) {
  if (activeLocalModels.has(name)) activeLocalModels.delete(name);
  else activeLocalModels.add(name);
  renderLocalChips();
}

function toggleLocalSection() {
  localSectionOpen = !localSectionOpen;
  document.getElementById('localBody').className = localSectionOpen ? 'local-body open' : 'local-body';
  document.getElementById('localToggle').textContent = localSectionOpen ? '▲ COLLAPSE' : '▼ EXPAND';
  if (localSectionOpen && !localModels.length) discoverOllama();
}

async function fireLocal() {
  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt) { toast('Enter a prompt first'); return; }
  if (!activeLocalModels.size) { toast('Select at least one local model'); return; }
  localResponses = {};
  document.getElementById('localFireBtn').disabled = true;
  const arena = document.getElementById('localArena');
  arena.innerHTML = '';
  const modelList = [...activeLocalModels];
  modelList.forEach((name, i) => {
    arena.innerHTML += `
      <div class="card card-local loading" id="lcard-${i}" style="animation-delay:${i*0.06}s">
        <div class="card-header">
          <div class="card-model"><div class="dot" id="ldot-${i}"></div><span>${name}</span></div>
          <div class="card-meta" id="lmeta-${i}">LOADING MODEL...</div>
        </div>
        <div class="loading-bar-local" id="lbar-${i}"></div>
        <div class="card-body" id="lbody-${i}"><span style="color:#664400;font-family:'Share Tech Mono',monospace;font-size:11px;">▌ waiting...</span></div>
        <div class="card-footer">
          <button class="btn-select" id="lselBtn-${i}" onclick="toggleLocalSelect(${i},'${name}')" disabled>SELECT</button>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn-select" id="lcpyBtn-${i}" onclick="copyLocalResponse('${name}')" disabled style="border-color:#2a1500;">📋 COPY</button>
            <div class="card-tokens" id="ltok-${i}"></div>
          </div>
        </div>
      </div>`;
  });
  await Promise.allSettled(modelList.map((name, i) => queryLocalModel(name, i, prompt)));
  document.getElementById('localFireBtn').disabled = false;
}

async function queryLocalModel(name, idx, prompt) {
  const start = Date.now();
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name, messages: [{ role: 'user', content: (contextActive && contextText) ? `Codebase context:\n\n${contextText}\n\n---\nQUESTION:\n${prompt}` : prompt }], stream: true })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = document.getElementById(`lbody-${idx}`);
    body.textContent = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
        try {
          const j = JSON.parse(line);
          const delta = j.message?.content || '';
          if (delta) { fullText += delta; body.textContent = fullText; body.scrollTop = body.scrollHeight; }
        } catch(e) {}
      }
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const tokens = Math.floor(fullText.length / 4);
    localResponses[name] = { text: fullText, time: elapsed, tokens, idx };
    document.getElementById(`ldot-${idx}`).className = 'dot done';
    document.getElementById(`lmeta-${idx}`).textContent = `${elapsed}s`;
    document.getElementById(`lbar-${idx}`).style.display = 'none';
    document.getElementById(`lcard-${idx}`).classList.remove('loading');
    document.getElementById(`lselBtn-${idx}`).disabled = false;
    document.getElementById(`lcpyBtn-${idx}`).disabled = false;
    document.getElementById(`ltok-${idx}`).textContent = `~${tokens} tok`;
  } catch(err) {
    document.getElementById(`ldot-${idx}`).className = 'dot error';
    document.getElementById(`lbody-${idx}`).innerHTML = `<span style="color:var(--accent2);font-family:'Share Tech Mono',monospace;font-size:11px;">ERROR: ${err.message}</span>`;
    document.getElementById(`lmeta-${idx}`).textContent = 'FAILED';
    document.getElementById(`lbar-${idx}`).style.display = 'none';
    document.getElementById(`lcard-${idx}`).classList.remove('loading');
  }
}

function copyLocalResponse(name) {
  const r = localResponses[name];
  if (r) navigator.clipboard.writeText(r.text).then(() => toast('Copied!'));
}

function toggleLocalSelect(idx, name) {
  const card = document.getElementById(`lcard-${idx}`);
  const key = `local::${idx}::${name}`;
  if (selectedCards.has(key)) { selectedCards.delete(key); card.classList.remove('selected'); }
  else { selectedCards.add(key); card.classList.add('selected'); }
  updateSynthPanel();
}

// ── UTILS ──────────────────────────────────────────────────────────────────
function clearAll() {
  document.getElementById('arena').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⬡</div>
      <div class="empty-label">ARENA EMPTY</div>
      <div class="empty-sub">Select models above, enter a prompt, and hit FIRE ALL.</div>
    </div>`;
  document.getElementById('prompt').value = '';
  selectedCards.clear();
  responses = {};
  updateSynthPanel();
  document.getElementById('synthPanel').classList.remove('open');
  document.getElementById('statusPill').textContent = 'READY';
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── BOOT ───────────────────────────────────────────────────────────────────
init();
