# SALVO Development Notes
**Last good save: 2026-03-07 (RAG update)**
**File: C:\Users\N01\Documents\AI\salvo.html**
**Backup: C:\Users\N01\Documents\AI\salvo_backup_before_rag_2026-03-07.html**

---

## What SALVO Is
SALVO = Simultaneous AI Launch & Victory Orchestrator
A single HTML file that fires prompts to multiple AI models at once and shows all responses side by side.
Open it in Brave: file:///C:/Users/N01/Documents/AI/salvo.html

---

## Current Working State (as of 2026-03-07 RAG update)
- Model chips fully visible and clickable at top of page
- SELECT MODELS TO FIRE bar with HIDE / SHOW collapse toggle
- Shows "X selected" count
- FIRE ALL sends to all selected cloud models via OpenRouter
- FIRE LOCAL sends to local Ollama models (separate amber section)
- Per-card COPY button, SELECT button (turns gold)
- SEND TO CLAUDE DESKTOP copies selected responses to clipboard
- Context Packer integration (CONTEXT button)
- Prompt history (last 20), daily request counter
- Settings (CONFIG): color, font, API keys
- **FULL RAG MEMORY: nomic auto-embeds every Q+A, injects relevant context into all prompts**

---

## RAG Memory System (NEW)
- Vector store: localStorage key 'salvo_vectors' (array of {text, vec, ts, model})
- Max 200 memories stored (oldest auto-pruned)
- On each prompt: embed with nomic -> cosine similarity vs all stored -> inject top 3 if sim >= 72%
- On each response: embed Q+A pair -> store in vector DB
- Memory badge shows count: "NOMIC ONLINE (X memories)"
- **Click the NOMIC badge to clear all memories**
- Works for BOTH cloud (FIRE ALL) and local (FIRE LOCAL) models
- Console logs: [SALVO RAG] messages show injection/storage activity

---

## API Keys Already Saved in localStorage
- OpenRouter: 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
- Anthropic (synthesis): NOT YET ADDED - add in CONFIG

---

## Default Selected Models (working as of today)
- Trinity Large (arcee-ai/trinity-large-preview:free)
- Step 3.5 Flash (stepfun/step-3.5-flash:free)
- GLM 4.5 Air (z-ai/glm-4.5-air:free)
- Nemotron 30B (nvidia/nemotron-3-nano-30b-a3b:free)

---

## Local Ollama Models (Victor's PC)
- qwen2.5:72b (47GB) - best quality but slow
- llama3.1:70b (42GB)
- qwen2.5:14b-instruct, qwen2.5:14b, qwen2.5-coder:14b
- mistral-nemo:12b, deepseek-r1:8b, qwen2.5-coder:latest
- Ollama must have OLLAMA_ORIGINS=* set (already done - permanent system env var)

---

## JS Syntax Check Command
  node --check "C:\Users\N01\Documents\AI\salvo_check.js"

To regenerate salvo_check.js:
  node -e "const fs=require('fs');const h=fs.readFileSync('C:/Users/N01/Documents/AI/salvo.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/i);fs.writeFileSync('C:/Users/N01/Documents/AI/salvo_check.js',m[1]);"

---

## Known Bug History (fixed)
1. max-height:80px crushed model chips - fixed
2. Missing copyResponse() function caused JS crash - fixed 2026-03-07
3. Ollama CORS blocked - fixed by OLLAMA_ORIGINS=* permanent env var
4. GLM/Step models use delta.reasoning not delta.content - fixed in stream parser
5. RAG getMemoryContext() was stubbed (always returned null) - FIXED 2026-03-07 with real cosine sim vector store

---

## What Still Needs Doing
- Add Anthropic API key to enable ANALYZE SELECTIONS synthesis feature
- Phase 2: Wrap in Electron as a real .exe with system tray
- Continuous/automated worker mode (background polling loop)
- Web search tool calling for local models
