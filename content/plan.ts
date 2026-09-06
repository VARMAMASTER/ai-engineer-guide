import type { Week, Day } from '@/lib/content/schema'

export const weeks: Week[] = [
  {
    id: 'week-01', number: 1, month: 1,
    theme: 'Arrays and two pointers. Gateways and caching. Metrics and classical ML. RAG skeleton.',
    targets: [
      'DSA: 10 problems across arrays and hashing, and two pointers.',
      'System design: load balancing and gateways, caching.',
      'AI/ML: statistics and metrics, classical ML.',
      'Reading: the 2020 RAG paper, contextual retrieval, and the three September 2026 model launches.',
      'Build: milestone 1, corpus ingested, both indexes built, 50 gold questions written.',
    ],
  },
  {
    id: 'week-02', number: 2, month: 1,
    theme: 'Sliding window and stack. Databases and sharding. Embeddings and transformer overview. Hybrid retrieval and reranking.',
    targets: [
      'DSA: 10 problems across sliding window, and stack.',
      'System design: database choice and indexing, sharding and replication.',
      'AI/ML: embeddings, and the transformer block at a high level.',
      'Reading: Lost in the Middle, and the original BERT reranking paper.',
      'Build: milestone 2, hybrid retrieval with RRF, reranking, and a baseline eval report (Recall@5, MRR, faithfulness).',
    ],
  },
  {
    id: 'week-03', number: 3, month: 1,
    theme: 'Binary search and linked lists. Queues and rate limiting. Attention math and inference basics. Eval harness, query rewriting, cache.',
    targets: [
      'DSA: 10 problems across binary search, and linked list.',
      'System design: message queues, rate limiting.',
      'AI/ML: attention math, and inference basics (prefill vs decode, KV cache).',
      'Reading: RAGAS, and Seven Failure Points When Engineering a RAG System.',
      'Build: milestone 3, a reusable eval harness, query rewriting, and a semantic cache.',
    ],
  },
  {
    id: 'week-04', number: 4, month: 1,
    theme: 'Trees. ML patterns: retrieval/ranking and RAG systems. RAG vs fine-tuning, evaluation. Guardrails, observability, deploy, docs.',
    targets: [
      'DSA: 10 problems across trees.',
      'System design: ML retrieval and ranking patterns, and RAG systems patterns.',
      'AI/ML: RAG vs fine-tuning decision framework, and evaluation (retrieval metrics, LLM-as-judge).',
      'Reading: the indirect prompt injection paper, and Self-RAG.',
      'Build: milestone 4, guardrails, tracing, deployment, and the seven defense documents.',
    ],
  },
  {
    id: 'week-05', number: 5, month: 2,
    theme: 'Trees (remaining) and heap. Consistency trade-offs, CDN and object storage. Deep learning fundamentals, embeddings theory. Adaptive retrieval planner.',
    targets: [
      'DSA: finish the remaining trees problems (hard/medium), then start heap and priority queue.',
      'System design: consistency trade-offs; CDN and object storage.',
      'AI/ML: deep learning fundamentals (backprop, optimizers); embeddings theory for the parent-document chunk store.',
      'Reading: MTEB (embedding benchmark); the Claude Opus 5 API launch.',
      'Build: milestone 1, the adaptive retrieval planner (retrieve-or-not, hop count), decisions logged and inspectable.',
    ],
  },
  {
    id: 'week-06', number: 6, month: 2,
    theme: 'Graphs. Observability, idempotency and retries. Embeddings theory continued. Parent-document and hierarchical chunking.',
    targets: [
      'DSA: graphs (traversal, BFS/DFS, union-find).',
      'System design: observability; idempotency and retries.',
      'AI/ML: embedding indexes (ANN, HNSW, quantization) and retrieval ranking metrics (NDCG, MRR).',
      'Reading: the BM25 and evaluation chapters of Introduction to Information Retrieval; the GLM-5.3 API launch.',
      'Build: milestone 2, parent-document retrieval and hierarchical chunking on top of the month 1 chunk store.',
    ],
  },
  {
    id: 'week-07', number: 7, month: 2,
    theme: 'Graphs, continued. Feature stores, model serving and batching. Deep learning continued. Metadata filtering and routing.',
    targets: [
      'DSA: graphs, continued.',
      'System design: feature stores; model serving and batching.',
      'AI/ML: deep learning continued (regularization, normalization); prompting technique taxonomy for routing prompts.',
      'Reading: The Prompt Report; the DeepSeek V4 Flash Vision API launch.',
      'Build: milestone 3, metadata filtering and a structured/unstructured router.',
    ],
  },
  {
    id: 'week-08', number: 8, month: 2,
    theme: 'Advanced graphs. Training pipelines/registries, monitoring and drift. RAG evaluation deep dive. Hardened guardrails and red-team eval.',
    targets: [
      'DSA: advanced graphs (Dijkstra, topological sort, minimum spanning tree).',
      'System design: training pipelines and registries; monitoring and drift.',
      'AI/ML: RAG evaluation deep dive (LLM-as-judge calibration, faithfulness at scale).',
      'Reading: Patterns for Building LLM-based Systems and Products; the Qwen 3.8 API launch.',
      'Build: milestone 4, hardened guardrails and a red-team eval set, closing out month 2.',
    ],
  },
  {
    id: 'week-09', number: 9, month: 3,
    theme: 'Backtracking. Experimentation, feedback loops. Transformer internals. Entity and relation extraction pipeline begins.',
    targets: [
      'DSA: backtracking.',
      'System design: experimentation; feedback loops.',
      'AI/ML: transformer internals (attention head specialization, positional encoding variants).',
      'Reading: From Local to Global, the Graph RAG paper.',
      'Build: milestone 1, the entity and relation extraction pipeline with a quality check step (week 1 of 2).',
    ],
  },
  {
    id: 'week-10', number: 10, month: 3,
    theme: 'Tries. LLM serving, agent platforms -- all 20 system design patterns now covered. Transformer internals continued. Extraction pipeline continued.',
    targets: [
      'DSA: tries.',
      'System design: LLM serving; agent platforms -- all 20 patterns now covered, question drills begin next.',
      'AI/ML: transformer internals continued; start LLM pretraining objectives.',
      'Reading: none scheduled this week -- catch up on any pending papers.',
      'Build: milestone 1, the extraction pipeline, week 2 of 2: quality report against 50 hand-labeled documents.',
    ],
  },
  {
    id: 'week-11', number: 11, month: 3,
    theme: '1-D dynamic programming. System design question drills. LLM pretraining. Graph construction and community detection.',
    targets: [
      'DSA: 1-D dynamic programming.',
      'System design: question drills across all 20 patterns covered so far.',
      'AI/ML: LLM pretraining (objectives, tokenizer training, data mixtures).',
      'Reading: none scheduled this week -- catch up on any pending papers.',
      'Build: milestone 2, graph construction and community detection, reproducible from source documents.',
    ],
  },
  {
    id: 'week-12', number: 12, month: 3,
    theme: '1-D dynamic programming, continued. System design drills. LLM pretraining continued. Graph plus vector hybrid retrieval.',
    targets: [
      'DSA: 1-D dynamic programming, continued.',
      'System design: question drills, continued.',
      'AI/ML: LLM pretraining continued (parallelism strategies: data, tensor, pipeline).',
      'Reading: none scheduled this week -- catch up on any pending papers.',
      'Build: milestone 3, a hybrid retriever combining graph traversal with vector search.',
    ],
  },
  {
    id: 'week-13', number: 13, month: 3,
    theme: '1-D dynamic programming, continued. System design drills. LLM pretraining continued. Comparative eval against month 2.',
    targets: [
      'DSA: 1-D dynamic programming, continued.',
      'System design: question drills, continued.',
      'AI/ML: LLM pretraining continued; start applying to tier-two companies.',
      'Reading: none scheduled this week -- catch up on any pending papers.',
      'Build: milestone 4, a comparative eval report against the month 2 advanced RAG system on global and local questions.',
    ],
  },
  {
    id: 'week-14', number: 14, month: 4,
    theme: '2-D dynamic programming. System design drills. Agents and safety. Tool layer with typed schemas and permissions.',
    targets: [
      'DSA: 2-D dynamic programming.',
      'System design: question drills, continued.',
      'AI/ML: agents and safety (planning, tool use, evaluation of agents).',
      'Reading: ReAct; MemGPT.',
      'Build: milestone 1, a tool layer where every tool has a typed schema and an explicit permission scope.',
    ],
  },
  {
    id: 'week-15', number: 15, month: 4,
    theme: '2-D dynamic programming, continued. System design drills. Agents and safety continued. Planner plus workers with memory.',
    targets: [
      'DSA: 2-D dynamic programming, continued.',
      'System design: question drills, continued.',
      'AI/ML: agents and safety continued (memory architectures, human-in-the-loop).',
      'Reading: Building Effective Agents; LLM Powered Autonomous Agents.',
      'Build: milestone 2, a planner that dispatches to worker agents, with short-term and long-term memory.',
    ],
  },
  {
    id: 'week-16', number: 16, month: 4,
    theme: '2-D dynamic programming, continued. System design drills. Agents and safety continued. Human approval flow and audit log.',
    targets: [
      'DSA: 2-D dynamic programming, continued.',
      'System design: question drills, continued.',
      'AI/ML: agents and safety continued (safety evaluation, red-teaming agents).',
      'Reading: Chain-of-Thought Prompting; SWE-bench.',
      'Build: milestone 3, a human approval step for irreversible actions and an audit log of all agent actions.',
    ],
  },
  {
    id: 'week-17', number: 17, month: 4,
    theme: 'Greedy. System design drills. Inference for agent workloads. Eval suite, cost controls, model routing.',
    targets: [
      'DSA: greedy.',
      'System design: question drills, continued.',
      'AI/ML: inference (serving architectures for agent workloads, cost controls).',
      'Reading: IFEval.',
      'Build: milestone 4, an eval suite for task success, cost, steps, and safety, plus cost controls and model routing, closing out month 4.',
    ],
  },
  {
    id: 'week-18', number: 18, month: 5,
    theme: 'Intervals and math/geometry. System design drills. LLM pretraining and training dynamics. Tokenizer through training loop.',
    targets: [
      'DSA: intervals and math/geometry.',
      'System design: question drills, continued.',
      'AI/ML: training dynamics (loss curves, scaling laws).',
      'Reading: Attention Is All You Need; Training Compute-Optimal Large Language Models (Chinchilla).',
      'Build: milestone 1, the tokenizer, embeddings, attention, transformer blocks, and LM head, trained on a small corpus.',
    ],
  },
  {
    id: 'week-19', number: 19, month: 5,
    theme: 'Intervals and math/geometry, continued. System design drills. Inference math (RoPE). RoPE swap-in.',
    targets: [
      'DSA: intervals and math/geometry, continued.',
      'System design: question drills, continued.',
      'AI/ML: inference math (RoPE, positional extrapolation).',
      'Reading: Scaling Laws for Neural Language Models; RoFormer (RoPE).',
      'Build: milestone 2, part 1 of 2: swap in RoPE and measure the effect on training speed and loss.',
    ],
  },
  {
    id: 'week-20', number: 20, month: 5,
    theme: 'Bit manipulation. System design drills. Inference math continued (GQA, FlashAttention). RMSNorm and GQA swap-in.',
    targets: [
      'DSA: bit manipulation.',
      'System design: question drills, continued.',
      'AI/ML: inference math continued (GQA, FlashAttention, memory-bound decode).',
      'Reading: GQA; FlashAttention.',
      'Build: milestone 2, part 2 of 2: swap in RMSNorm and GQA, commit the before/after comparison.',
    ],
  },
  {
    id: 'week-21', number: 21, month: 5,
    theme: 'Mixed review begins. System design drills. Inference serving (paged attention, speculative decoding). KV cache and batched generation.',
    targets: [
      'DSA: mixed review by company tag, timed.',
      'System design: question drills, continued.',
      'AI/ML: inference serving (paged attention, speculative decoding).',
      'Reading: PagedAttention (vLLM); Fast Inference via Speculative Decoding.',
      'Build: milestone 3, a KV cache and batched generation, at least 2x the tokens/sec of the uncached baseline.',
    ],
  },
  {
    id: 'week-22', number: 22, month: 5,
    theme: 'Mixed review, continued. System design drills. Inference serving continued. Streaming server with throughput/latency measurements.',
    targets: [
      'DSA: mixed review by company tag, continued.',
      'System design: question drills, continued.',
      'AI/ML: inference serving continued (throughput and latency measurement under load).',
      'Reading: none scheduled this week -- catch up on any pending papers.',
      'Build: milestone 4, a streaming inference server with a throughput and latency report, closing out month 5.',
    ],
  },
  {
    id: 'week-23', number: 23, month: 6,
    theme: 'Mixed review, continued. System design drills. Fine-tuning deep dive (LoRA, QLoRA). Dataset curation and LoRA SFT.',
    targets: [
      'DSA: mixed review by company tag, continued.',
      'System design: question drills, continued.',
      'AI/ML: fine-tuning deep dive (LoRA rank and target modules, QLoRA quantization).',
      'Reading: LoRA; QLoRA.',
      'Build: milestones 1 and 2, dataset curation with quality filters, then LoRA SFT with a before/after eval.',
    ],
  },
  {
    id: 'week-24', number: 24, month: 6,
    theme: 'Mixed review, continued. System design drills. Fine-tuning continued (DPO). Preference data and DPO.',
    targets: [
      'DSA: mixed review by company tag, continued.',
      'System design: question drills, continued.',
      'AI/ML: fine-tuning continued (DPO, preference data).',
      'Reading: Direct Preference Optimization; DeepSeek-R1.',
      'Build: milestone 3, a preference dataset and a DPO run on top of the SFT model.',
    ],
  },
  {
    id: 'week-25', number: 25, month: 6,
    theme: 'Mixed review, continued. System design drills. RAG and evaluation, LLM-as-judge bias. Comparative eval report.',
    targets: [
      'DSA: mixed review by company tag, continued.',
      'System design: question drills, continued.',
      'AI/ML: RAG and evaluation continued (LLM-as-judge bias, comparative eval design).',
      'Reading: Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena.',
      'Build: milestone 4, the comparative eval report: prompting vs RAG vs SFT vs DPO on the same task.',
    ],
  },
  {
    id: 'week-26', number: 26, month: 6,
    theme: 'Mixed review and mock loops. System design mock loop. Alignment and evaluation review. Interview sprint.',
    targets: [
      'DSA: mixed review by company tag, mock-interview timed sets.',
      'System design: mock loop questions drawn across all 20 patterns.',
      'AI/ML: alignment basics and evaluation review across all 10 topics, mock Q&A.',
      'Reading: none scheduled this week -- interview sprint.',
      'Build: no new milestone this week; polish and rehearse the defense docs for every project, for the big tech interview loop.',
    ],
  },
]

export const days: Day[] = [
  // Week 1
  {
    id: 'day-01', number: 1, weekId: 'week-01', kind: 'weekday',
    tasks: [
      { refId: 'dsa-217-contains-duplicate', track: 'dsa', minutes: 30 },
      { refId: 'dsa-242-valid-anagram', track: 'dsa', minutes: 30 },
      { refId: 'sdp-load-balancing-gateways', track: 'study-sd', minutes: 90,
        note: 'Work through: design an API gateway, then a URL shortener.' },
    ],
  },
  {
    id: 'day-02', number: 2, weekId: 'week-01', kind: 'weekday',
    tasks: [
      { refId: 'dsa-1-two-sum', track: 'dsa', minutes: 30 },
      { refId: 'dsa-49-group-anagrams', track: 'dsa', minutes: 30 },
      { refId: 'topic-statistics-metrics', track: 'study-ml', minutes: 90,
        note: 'Precision, recall, F1, ROC-AUC, PR-AUC, calibration, confidence intervals, cost of errors.' },
    ],
  },
  {
    id: 'day-03', number: 3, weekId: 'week-01', kind: 'weekday',
    tasks: [
      { refId: 'dsa-347-top-k-frequent-elements', track: 'dsa', minutes: 30 },
      { refId: 'dsa-271-encode-and-decode-strings', track: 'dsa', minutes: 30 },
      { refId: 'sdp-caching', track: 'study-sd', minutes: 90,
        note: 'Work through: design a simple key-value cache, then a distributed cache.' },
    ],
  },
  {
    id: 'day-04', number: 4, weekId: 'week-01', kind: 'weekday',
    tasks: [
      { refId: 'dsa-238-product-of-array-except-self', track: 'dsa', minutes: 30 },
      { refId: 'dsa-128-longest-consecutive-sequence', track: 'dsa', minutes: 30 },
      { refId: 'topic-classical-ml', track: 'study-ml', minutes: 90,
        note: 'Logistic regression, trees, boosting, imbalance, leakage, regularization, cross-validation.' },
    ],
  },
  {
    id: 'day-05', number: 5, weekId: 'week-01', kind: 'weekday',
    tasks: [
      { refId: 'dsa-125-valid-palindrome', track: 'dsa', minutes: 30 },
      { refId: 'dsa-15-3sum', track: 'dsa', minutes: 30 },
      { refId: 'read-rag-2020', track: 'reading', minutes: 25 },
      { refId: 'read-anthropic-contextual-retrieval', track: 'reading', minutes: 25 },
      { refId: 'read-api-claude-fable-5-1', track: 'reading', minutes: 10 },
      { refId: 'read-api-gpt-6-astra', track: 'reading', minutes: 10 },
      { refId: 'read-api-gemini-3-8-flash', track: 'reading', minutes: 10 },
      { refId: 'review-week', taskId: 'day-05-review-week', track: 'review', minutes: 10 },
    ],
  },
  {
    id: 'day-06', number: 6, weekId: 'week-01', kind: 'weekend',
    tasks: [
      { refId: 'ms-rag-1', taskId: 'day-06-build', track: 'build', minutes: 300,
        note: 'Session 1 of 2: select and ingest the corpus, implement both chunking strategies and compare them.' },
    ],
  },
  {
    id: 'day-07', number: 7, weekId: 'week-01', kind: 'weekend',
    tasks: [
      { refId: 'ms-rag-1', taskId: 'day-07-build', track: 'build', minutes: 290,
        note: 'Session 2 of 2: build the BM25 and vector indexes, write the 50-question gold eval set.' },
      { refId: 'ms-rag-1', track: 'build', minutes: 10,
        note: 'Acceptance check: does the CLI answer from both indexes, and is the gold set committed?' },
    ],
  },

  // Week 2
  {
    id: 'day-08', number: 8, weekId: 'week-02', kind: 'weekday',
    tasks: [
      { refId: 'dsa-121-best-time-to-buy-and-sell-stock', track: 'dsa', minutes: 30 },
      { refId: 'dsa-3-longest-substring-without-repeating-characters', track: 'dsa', minutes: 30 },
      { refId: 'sdp-database-choice-indexing', track: 'study-sd', minutes: 90,
        note: 'Work through: design a key-value store.' },
    ],
  },
  {
    id: 'day-09', number: 9, weekId: 'week-02', kind: 'weekday',
    tasks: [
      { refId: 'dsa-424-longest-repeating-character-replacement', track: 'dsa', minutes: 30 },
      { refId: 'dsa-567-permutation-in-string', track: 'dsa', minutes: 30 },
      { refId: 'topic-embeddings', track: 'study-ml', minutes: 90,
        note: 'Dense vectors, cosine similarity, MTEB, chunk-to-vector, bi-encoder vs cross-encoder.' },
    ],
  },
  {
    id: 'day-10', number: 10, weekId: 'week-02', kind: 'weekday',
    tasks: [
      { refId: 'dsa-76-minimum-window-substring', track: 'dsa', minutes: 30 },
      { refId: 'dsa-20-valid-parentheses', track: 'dsa', minutes: 30 },
      { refId: 'sdp-sharding-replication', track: 'study-sd', minutes: 90,
        note: 'Work through: design Pastebin, then a file storage and sync service.' },
    ],
  },
  {
    id: 'day-11', number: 11, weekId: 'week-02', kind: 'weekday',
    tasks: [
      { refId: 'dsa-155-min-stack', track: 'dsa', minutes: 30 },
      { refId: 'dsa-150-evaluate-reverse-polish-notation', track: 'dsa', minutes: 30 },
      { refId: 'topic-transformers', taskId: 'day-11-study-ml', track: 'study-ml', minutes: 90,
        note: 'Transformer block at a high level: tokens, embeddings, positional encoding, attention, MLP, residual, norm, LM head.' },
    ],
  },
  {
    id: 'day-12', number: 12, weekId: 'week-02', kind: 'weekday',
    tasks: [
      { refId: 'dsa-22-generate-parentheses', track: 'dsa', minutes: 30 },
      { refId: 'dsa-739-daily-temperatures', track: 'dsa', minutes: 30 },
      { refId: 'read-lost-in-the-middle', track: 'reading', minutes: 40 },
      { refId: 'read-bert-reranking', track: 'reading', minutes: 40 },
      { refId: 'review-week', taskId: 'day-12-review-week', track: 'review', minutes: 10 },
    ],
  },
  {
    id: 'day-13', number: 13, weekId: 'week-02', kind: 'weekend',
    tasks: [
      { refId: 'ms-rag-2', taskId: 'day-13-build', track: 'build', minutes: 300,
        note: 'Session 1 of 2: implement hybrid retrieval with reciprocal rank fusion by hand and add the cross-encoder reranker.' },
    ],
  },
  {
    id: 'day-14', number: 14, weekId: 'week-02', kind: 'weekend',
    tasks: [
      { refId: 'ms-rag-2', taskId: 'day-14-build', track: 'build', minutes: 290,
        note: 'Session 2 of 2: generate cited answers and score the baseline with Recall@5, MRR, and judge-scored faithfulness.' },
      { refId: 'ms-rag-2', track: 'build', minutes: 10,
        note: 'Acceptance check: is the baseline eval report (v1) committed with Recall@5, MRR, and faithfulness numbers?' },
    ],
  },

  // Week 3
  {
    id: 'day-15', number: 15, weekId: 'week-03', kind: 'weekday',
    tasks: [
      { refId: 'dsa-704-binary-search', track: 'dsa', minutes: 30 },
      { refId: 'dsa-74-search-a-2d-matrix', track: 'dsa', minutes: 30 },
      { refId: 'sdp-message-queues', track: 'study-sd', minutes: 90,
        note: 'Work through: design a notification service, then a distributed message queue.' },
    ],
  },
  {
    id: 'day-16', number: 16, weekId: 'week-03', kind: 'weekday',
    tasks: [
      { refId: 'dsa-875-koko-eating-bananas', track: 'dsa', minutes: 30 },
      { refId: 'dsa-153-find-minimum-in-rotated-sorted-array', track: 'dsa', minutes: 30 },
      { refId: 'topic-transformers', taskId: 'day-16-study-ml', track: 'study-ml', minutes: 90,
        note: 'Attention math: Q, K, V, scaling by sqrt(d), causal mask, multi-head, parameter count.' },
    ],
  },
  {
    id: 'day-17', number: 17, weekId: 'week-03', kind: 'weekday',
    tasks: [
      { refId: 'dsa-33-search-in-rotated-sorted-array', track: 'dsa', minutes: 30 },
      { refId: 'dsa-206-reverse-linked-list', track: 'dsa', minutes: 30 },
      { refId: 'sdp-rate-limiting', track: 'study-sd', minutes: 90,
        note: 'Work through: design a rate limiter.' },
    ],
  },
  {
    id: 'day-18', number: 18, weekId: 'week-03', kind: 'weekday',
    tasks: [
      { refId: 'dsa-21-merge-two-sorted-lists', track: 'dsa', minutes: 30 },
      { refId: 'dsa-143-reorder-list', track: 'dsa', minutes: 30 },
      { refId: 'topic-inference', track: 'study-ml', minutes: 90,
        note: 'Prefill vs decode, KV cache size, why decode is memory-bound, batching.' },
    ],
  },
  {
    id: 'day-19', number: 19, weekId: 'week-03', kind: 'weekday',
    tasks: [
      { refId: 'dsa-19-remove-nth-node-from-end-of-list', track: 'dsa', minutes: 30 },
      { refId: 'dsa-141-linked-list-cycle', track: 'dsa', minutes: 30 },
      { refId: 'read-ragas', track: 'reading', minutes: 40 },
      { refId: 'read-seven-failure-points', track: 'reading', minutes: 40 },
      { refId: 'review-week', taskId: 'day-19-review-week', track: 'review', minutes: 10 },
    ],
  },
  {
    id: 'day-20', number: 20, weekId: 'week-03', kind: 'weekend',
    tasks: [
      { refId: 'ms-rag-3', taskId: 'day-20-build', track: 'build', minutes: 300,
        note: 'Session 1 of 2: extract the eval harness into a standalone module with retrieval metrics and an LLM-as-judge, then add query rewriting via multi-query or HyDE.' },
    ],
  },
  {
    id: 'day-21', number: 21, weekId: 'week-03', kind: 'weekend',
    tasks: [
      { refId: 'ms-rag-3', taskId: 'day-21-build', track: 'build', minutes: 290,
        note: 'Session 2 of 2: add a semantic cache in front of retrieval and generation, then build the ablation table.' },
      { refId: 'ms-rag-3', track: 'build', minutes: 10,
        note: 'Acceptance check: is the ablation report committed showing the effect of each component on the eval metrics?' },
    ],
  },

  // Week 4
  {
    id: 'day-22', number: 22, weekId: 'week-04', kind: 'weekday',
    tasks: [
      { refId: 'dsa-226-invert-binary-tree', track: 'dsa', minutes: 30 },
      { refId: 'dsa-104-maximum-depth-of-binary-tree', track: 'dsa', minutes: 30 },
      { refId: 'mlp-retrieval-ranking', track: 'study-sd', minutes: 90,
        note: 'Work through: design a recommendation system, then the Instagram Explore feed.' },
    ],
  },
  {
    id: 'day-23', number: 23, weekId: 'week-04', kind: 'weekday',
    tasks: [
      { refId: 'dsa-543-diameter-of-binary-tree', track: 'dsa', minutes: 30 },
      { refId: 'dsa-110-balanced-binary-tree', track: 'dsa', minutes: 30 },
      { refId: 'topic-fine-tuning', track: 'study-ml', minutes: 90,
        note: 'RAG vs SFT vs prompting decision framework, LoRA basics.' },
    ],
  },
  {
    id: 'day-24', number: 24, weekId: 'week-04', kind: 'weekday',
    tasks: [
      { refId: 'dsa-100-same-tree', track: 'dsa', minutes: 30 },
      { refId: 'dsa-572-subtree-of-another-tree', track: 'dsa', minutes: 30 },
      { refId: 'mlp-rag-systems', track: 'study-sd', minutes: 90,
        note: 'Work through: design an enterprise search system grounded with RAG, then a customer support chatbot grounded in product documentation.' },
    ],
  },
  {
    id: 'day-25', number: 25, weekId: 'week-04', kind: 'weekday',
    tasks: [
      { refId: 'dsa-235-lowest-common-ancestor-of-a-binary-search-tree', track: 'dsa', minutes: 30 },
      { refId: 'dsa-102-binary-tree-level-order-traversal', track: 'dsa', minutes: 30 },
      { refId: 'topic-rag-evaluation', track: 'study-ml', minutes: 90,
        note: 'Retrieval metrics Recall@k, MRR, NDCG; LLM-as-judge; faithfulness; human eval; leakage in eval sets.' },
    ],
  },
  {
    id: 'day-26', number: 26, weekId: 'week-04', kind: 'weekday',
    tasks: [
      { refId: 'dsa-98-validate-binary-search-tree', track: 'dsa', minutes: 30 },
      { refId: 'dsa-230-kth-smallest-element-in-a-bst', track: 'dsa', minutes: 30 },
      { refId: 'read-prompt-injection', track: 'reading', minutes: 40 },
      { refId: 'read-self-rag', track: 'reading', minutes: 40 },
      { refId: 'review-week', taskId: 'day-26-review-week', track: 'review', minutes: 10 },
    ],
  },
  {
    id: 'day-27', number: 27, weekId: 'week-04', kind: 'weekend',
    tasks: [
      { refId: 'ms-rag-4', taskId: 'day-27-build', track: 'build', minutes: 300,
        note: 'Session 1 of 2: add prompt-injection detection on retrieved content and output filters on generated answers, then add per-request tracing.' },
    ],
  },
  {
    id: 'day-28', number: 28, weekId: 'week-04', kind: 'weekend',
    tasks: [
      { refId: 'ms-rag-4', taskId: 'day-28-build', track: 'build', minutes: 290,
        note: 'Session 2 of 2: deploy the API and UI to a public URL, then write the seven defense documents.' },
      { refId: 'ms-rag-4', track: 'build', minutes: 10,
        note: 'Acceptance check: are the API and UI live at a public URL, and are the seven defense documents committed?' },
    ],
  },

  // Days 29-30 (special)
  {
    id: 'day-29', number: 29, weekId: 'week-04', kind: 'special',
    tasks: [
      { refId: 'review-mock', taskId: 'day-29-review-mock', track: 'review', minutes: 150,
        note: 'Self-run mock loop: one timed medium from a covered pattern, one system design question drawn at random from the month, ten AI/ML questions answered aloud and self-graded.' },
    ],
  },
  {
    id: 'day-30', number: 30, weekId: 'week-04', kind: 'special',
    tasks: [
      { refId: 'review-retro', taskId: 'day-30-review-retro', track: 'review', minutes: 60,
        note: 'Retrospective against the four month-1 checks. Set the month 2 start date.' },
      { refId: 'doc-rag-problem', track: 'review', minutes: 30 },
      { refId: 'doc-rag-architecture', track: 'review', minutes: 30 },
      { refId: 'doc-rag-ml', track: 'review', minutes: 30 },
      { refId: 'doc-rag-tradeoffs', track: 'review', minutes: 30 },
      { refId: 'doc-rag-scaling', track: 'review', minutes: 30 },
      { refId: 'doc-rag-failures', track: 'review', minutes: 30 },
      { refId: 'doc-rag-interview-questions', track: 'review', minutes: 30 },
      { refId: 'review-publish', taskId: 'day-30-review-publish', track: 'review', minutes: 30,
        note: 'Publish the RAG project write-up and the seven defense documents.' },
    ],
  },
]
