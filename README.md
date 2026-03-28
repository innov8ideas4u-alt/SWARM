# SWARM 🤖

A local AI agent swarm that chains Ollama models through specialist roles to tackle complex tasks with compounding intelligence. Single HTML file, zero dependencies, runs entirely on your machine.

## What It Does

Instead of asking one AI model one question, SWARM passes your task through a **chain of specialist agents** — each one building on the previous output. The result is dramatically better than a single prompt.

**Default agent chain:**
```
ANALYST → RESEARCHER → CODER → CRITIC → REFINER → SUMMARIZER
```

| Agent | Role |
|-------|------|
| 🔍 ANALYST | Breaks down the problem into components |
| 📡 RESEARCHER | Expands context and finds relevant knowledge |
| 🔨 BUILDER | Constructs the solution or code |
| ⚔️ CRITIC | Finds flaws, edge cases, and weaknesses |
| ✨ REFINER | Polishes and improves the output |
| 😈 DEVIL | Argues the opposite — stress tests assumptions |
| 📋 SUMMARY | Synthesizes everything into a final clean output |
| 💻 CODER | Writes and reviews code specifically |
| 🗺️ PLANNER | Breaks work into actionable steps |
| ⚖️ JUDGE | Final quality assessment |

You pick which agents run and in what order. Mix and match for your use case.

## Requirements

- [Ollama](https://ollama.com) running locally
- Any Ollama model (default: `qwen2.5-coder:14b`)
- A modern browser (Chrome, Brave, Firefox)
- No internet required after setup

## Quick Start

1. Make sure Ollama is running: `ollama serve`
2. Pull a model: `ollama pull qwen2.5-coder:14b`
3. Open `swarm.html` in your browser (just double-click it)
4. Select your agents
5. Type your task and hit **LAUNCH SWARM**

## Configuration

- **Ollama Host** — defaults to `http://localhost:11434`. Change if Ollama runs on another machine (e.g. a home server)
- **Model** — auto-detected from your running Ollama instance
- **Iterations** — how many full chain passes to run (more = deeper refinement)
- **Agent count** — slider to quickly select the first N agents, or click individual agent cards to toggle

## Use Cases

SWARM works especially well for:

- **Code generation** — ANALYST breaks it down, CODER writes it, CRITIC tears it apart, REFINER fixes it
- **Research tasks** — RESEARCHER + SUMMARIZER chain for deep topic exploration
- **Writing** — BUILDER drafts, CRITIC challenges, REFINER polishes
- **Planning** — PLANNER + ANALYST for breaking complex projects into steps
- **Problem solving** — throw any hard problem at the full 6-agent chain

## Example Prompts

```
Improve a Python RAG pipeline using pgvector. Write query rewriting, 
chunk reranking, and auto-summarization modules using only local LLMs 
via Ollama at localhost:11434.
```

```
Design a minimal REST API for a not-for-profit membership management 
system. Include data model, endpoints, and auth approach.
```

## Architecture

SWARM is a single HTML file with no build step, no npm, no framework. It talks directly to the Ollama `/api/chat` endpoint. Each agent gets the original task plus all previous agent outputs as context, building a compounding chain of reasoning.

```
Task
 └─► Agent 1 (system prompt: "You are an analyst...")
      └─► Output 1
           └─► Agent 2 (system prompt: "You are a researcher..." + Output 1)
                └─► Output 2
                     └─► Agent 3 ...
                          └─► Final synthesized output
```

## Tips

- **Less is more** — 3-4 well-chosen agents often beats 8 agents for simple tasks
- **CRITIC + REFINER** is the killer combo for code quality
- **CODER last** works well when you want research before implementation
- Longer `num_predict` = better output but slower — tune in the source if needed

## Part of the Victor Lab Stack

Built as part of a home AI lab running Ollama, pgvector, MiniAgents, and Wazuh SIEM on salvaged hardware. If it's useful to you, great.

## License

MIT — do whatever you want with it.
