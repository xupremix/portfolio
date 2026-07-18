# Career Roadmap — ML Engineer / AI Solution Deployer

**Private working document** (deliberately NOT on the site — the portfolio shows what you
*have*; this tracks what you're *building toward*). Check items off as you go; every item
has a "prove it" so progress turns into portfolio evidence, not just knowledge.

**Your current edge (already strong, keep leading with it):** Rust systems + compile-time
ML (kindle), classical ML in production shape (KITTI tracking, BERT NLU), multi-agent
planning (BDI/PDDL/LLM). The gaps below are almost all in the *LLM engineering & deployment*
layer — which is exactly what "AI Engineer" roles hire for in 2026.

---

## 1. Skills checklist

Legend: ☐ to learn · ◐ touched, deepen · ✅ have (from existing projects)

### Tier 1 — do these first (they appear in almost every AI-engineer JD)

**Local & self-hosted inference**
- ☐ Ollama — pull/run/create Modelfiles, expose the OpenAI-compatible API, GPU offload.
  *Prove it:* serve a quantized model locally and hit it from a script; note tokens/s.
- ☐ LM Studio — same workflow GUI-side; know when teams reach for it vs Ollama.
- ☐ llama.cpp & GGUF — quantize a model yourself (Q4_K_M vs Q8), measure quality/speed delta.
- ☐ vLLM — serve on a rented GPU (RunPod/Modal), understand continuous batching &
  paged KV cache well enough to explain them in an interview.
  *Prove it:* a benchmark table: same model on Ollama vs llama.cpp vs vLLM.
- ☐ Quantization landscape: GGUF vs AWQ vs GPTQ vs FP8 — when each applies.

**Agentic systems** (◐ — you have BDI/PDDL foundations most candidates lack; add the LLM stack)
- ☐ Tool / function calling — raw API level first (no framework), incl. parallel calls & streaming.
- ☐ MCP (Model Context Protocol) — build one server + use it from a client.
  *Prove it:* a small MCP server for something real (e.g. your uni timetable, a repo browser).
- ◐ Planning patterns — map your PDDL/BDI knowledge onto ReAct, plan-and-execute,
  reflection loops; know when symbolic planning beats LLM planning (you can argue both sides — rare).
- ☐ One orchestration framework deeply (LangGraph is the current safe pick) — but be the
  candidate who can also do it framework-free.
- ☐ Guardrails & sandboxing — structured output enforcement, tool permission scoping.

**Evals & observability** (the #1 differentiator between "prompt hacker" and "engineer")
- ☐ Build one eval harness by hand: dataset → runner → judge (rubric or exact-match) → report.
- ☐ promptfoo or lm-eval-harness — run a public benchmark on a local model.
- ☐ Tracing: Langfuse (or OpenTelemetry-based) — capture cost/latency/quality per trace.
- ☐ Regression gates: evals in CI, fail the build when quality drops.
  *Prove it:* every project in §2 ships an eval table in its README. No exceptions.

### Tier 2 — strong differentiators, schedule after Tier 1 basics

**Fine-tuning & alignment**
- ☐ LoRA/QLoRA with PEFT (or unsloth/axolotl) on a small model; track with W&B.
- ☐ DPO/ORPO — one preference-tuning run; understand when SFT alone is enough.
- ☐ Distillation & synthetic data — teacher→student pipelines (feeds Project D below).

**RAG & retrieval** (commodity skill — learn it properly once, don't showcase it alone)
- ☐ Embeddings + one vector store (Qdrant or pgvector), chunking strategies.
- ☐ Hybrid search (BM25 + dense) + a reranker; measure retrieval quality (recall@k), not vibes.

**Serving & MLOps**
- ◐ Docker (have) → ☐ docker-compose for multi-service AI stacks → ☐ K8s basics (deploy one thing once).
- ☐ Streaming APIs (SSE) behind FastAPI or Axum (Axum = your Rust edge).
- ☐ ONNX Runtime / TensorRT export of one of YOUR vision models (ties to KITTI work).
- ☐ One GPU cloud workflow end-to-end (Modal or RunPod): train → store artifact → serve.
- ☐ HF Hub fluency: push models/datasets/spaces; a Space is a free live demo host.

### Tier 3 — pick per target company

- ☐ One hyperscaler AI platform deeply (AWS Bedrock+SageMaker *or* GCP Vertex).
- ☐ TensorRT-LLM / SGLang (if aiming at inference-infra teams — pairs with Project A).
- ☐ Speech/vision multimodal pipelines (Whisper, VLMs) — if aiming at product teams.
- ☐ Ray / distributed training basics — if aiming at training-infra teams.

---

## 2. Striking projects (reviewed shortlist)

Generated ~10 candidates, culled the ones any bootcamp grad ships (doc-chatbot RAG,
Kaggle runs, prompt wrappers, generic dashboards). Kept the four where *your* systems
background makes the result look senior. Each has the "instantly consider" test:
a hiring engineer can verify the claim in under two minutes from the README.

### A. `inferno-rs` — a minimal LLM inference server in Rust  ⭐ flagship
Candle-based server for a small open model (e.g. Llama-3.2-1B/3B class) with an
OpenAI-compatible streaming API, **continuous batching**, paged KV cache, and (stretch)
speculative decoding. README leads with a benchmark table vs llama.cpp and vLLM on the
same GPU (throughput @ fixed latency, tokens/s, memory).
*Why it lands:* inference infra is the hardest-to-hire AI skill; "I rebuilt vLLM's core
ideas in Rust and here are the numbers" ends the "can they engineer?" question. It's the
natural sequel to kindle — same brand: systems rigor applied to ML.
*Scope guard:* one model family, one GPU, CPU fallback; batching before speculation.

### B. kindle-in-the-browser — your framework, running live on this portfolio  ⭐ fastest wow
Train a small model (MNIST or a tiny char-LM) **with kindle**, export weights
(safetensors), run inference **in the visitor's browser** via WASM (candle-wasm or burn),
as a draw-a-digit demo card on the site. Caption: "trained with my own framework —
running in your browser right now."
*Why it lands:* zero-friction proof; a recruiter experiences it in 10 seconds, and it
compounds the kindle story instead of starting a new one. Also directly upgrades the
portfolio's kindle demo from "compiler output" to "live model".
*Scope guard:* MNIST is enough; don't gold-plate the canvas UI — reuse the demo shell.

### C. `ci-medic` — an agent that fixes broken builds, with published success rates
Agent (tool-calling + your planning instincts; MCP for repo/CI access) that takes a
failing CI run, localizes the fault, proposes a patch, and opens a PR. Evaluated on a
fixed benchmark set (e.g. a SWE-bench-Lite subset or 30 curated broken commits) with a
**published resolution rate, cost per fix, and full traces** (Langfuse).
*Why it lands:* it's the job. Agentic engineering with honest evals is what AI-engineer
teams do all day, and almost no junior portfolio shows *measured* agent performance.
*Scope guard:* cap at "one language, one repo class"; the eval table matters more than
the success rate itself.

### D. Distill the ASA coordinator: 70B → 3B local planner
Replace ASA Autobots' Llama-3.3-70B coordinator with a small model you fine-tuned
(LoRA + DPO on traces generated by the big model), served locally via **Ollama**, with
an eval table: task success, latency, and cost — 70B API vs your 3B local.
*Why it lands:* fine-tuning + distillation + local deployment + agents in ONE story, and
it upgrades an existing team project instead of being a toy. "I made the agent 20× cheaper
and offline-capable" is a business sentence, not a student sentence.
*Scope guard:* freeze the ASA environment first; success metric = delivery-task
completion rate on a fixed scenario set.

**Suggested order:** B (1–2 weekends, immediate portfolio upgrade) → C (Tier-1 skills in
anger) → D (fine-tuning tier) → A (the deep one; start once B/C are shipped so the
pipeline of visible work never stalls).

**Culled, for the record (and why):** doc-chatbot RAG (commodity), generic eval SaaS
dashboard (infra without a story), Kaggle medals (competition ≠ engineering signal),
standalone MCP server pack (too small — folded into C), prompt-engineering showcase
(ages badly), robotics VLM-on-Jetson (great story, but hardware demos don't verify in
two minutes — revisit if targeting robotics companies specifically).

---

## 3. Other useful things (cheap, compounding)

- ☐ **Deploy the portfolio publicly now** (Cloudflare Pages/Netlify — it's static). An
  unhosted portfolio converts nobody. Wire the domain in `astro.config.mjs` (already set).
- ☐ Every repo README: one-line claim → demo GIF → numbers table → quickstart. Numbers first.
- ☐ Pin the right 6 repos on GitHub; archive or hide abandoned ones — recruiters do click.
- ☐ Write one short post per shipped project (what/numbers/lesson) — host on the site
  later; writing is the multiplier on every project above.
- ☐ Keep `capture:kindle` + eval tables in CI where possible: "my README numbers
  regenerate automatically" is itself a hiring signal.
- ☐ LinkedIn headline = the hero eyebrow ("CS grad · AI master's @ UniTrento — systems
  ML in Rust"); link the portfolio everywhere.
