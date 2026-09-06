import type { Project, Milestone } from '@/lib/content/schema'

export const projects: Project[] = [
  {
    id: 'proj-rag',
    month: 1,
    name: 'Production RAG with an eval harness',
    goal: 'A question-answering system over a real corpus of at least 500 documents, with hybrid retrieval, reranking, cited answers, a reusable evaluation harness, guardrails, observability, and a public deployment.',
    architecture: `ingestion -> chunking -> BM25 index + vector index
  -> hybrid retrieval (reciprocal rank fusion)
  -> cross-encoder reranker -> context builder -> LLM -> cited answer
side modules: eval harness | semantic cache | guardrails | tracing`,
    constraints: [
      'Python. Any LLM API. Any vector store.',
      'Must expose an HTTP API and a minimal UI.',
      'Must be deployable on Vercel or a comparable free tier.',
      'No framework may hide retrieval, fusion, or reranking. Implement those three by hand.',
    ],
    defense: [
      'Why hybrid retrieval over dense alone?',
      'How did you choose chunk size, and what did the eval say?',
      'Why is your RAG hallucinating, and how did you find out?',
      'What does the reranker cost you in latency, and what did it buy?',
      'How do you evaluate retrieval separately from generation?',
      'How would this scale to 1M documents?',
      'How do you defend against injected instructions in a retrieved document?',
      'RAG vs fine-tuning for this corpus: defend your choice.',
    ],
  },
  {
    id: 'proj-advanced-rag',
    month: 2,
    name: 'Advanced RAG: agentic and adaptive retrieval',
    goal: 'Extend month 1\'s RAG system with adaptive retrieval decisions, hierarchical chunking, structured plus unstructured routing, and hardened guardrails, validated against a red-team eval set.',
    architecture: `proj-rag pipeline
  -> adaptive retrieval planner (retrieve-or-not, hop count)
  -> parent-document / hierarchical chunk store
  -> metadata filter + structured/unstructured router
  -> hardened guardrail layer -> answer`,
    constraints: [
      'Builds on the month 1 proj-rag codebase; no rewrite from scratch.',
      'Adaptive retrieval decisions must be logged and inspectable.',
      'Must expose an HTTP API and a minimal UI.',
      'Must be deployable on Vercel or a comparable free tier.',
    ],
    defense: [
      'When does retrieval hurt more than it helps?',
      'How do you decide hop count for a multi-hop query?',
      'How do you evaluate agentic retrieval end to end?',
      'How do you cap the cost of adaptive retrieval?',
    ],
  },
  {
    id: 'proj-graph-rag',
    month: 3,
    name: 'Graph RAG over a knowledge graph',
    goal: 'A knowledge-graph RAG system that extracts entities and relations from the month 1 corpus, builds a graph with community summaries, and answers global and local questions with a graph plus vector hybrid retriever.',
    architecture: `corpus -> entity/relation extraction -> graph construction
  -> community detection + summaries
  -> graph retriever + vector retriever (hybrid)
  -> LLM -> cited answer`,
    constraints: [
      'Entity and relation extraction must include a quality check step.',
      'Graph construction and community detection must be reproducible from source documents.',
      'Must expose an HTTP API and a minimal UI.',
      'Must be deployable on Vercel or a comparable free tier.',
    ],
    defense: [
      'Where does graph RAG beat vector RAG, and where does it lose?',
      'How does extraction error propagate through the graph?',
      'What does the graph build cost, in time and dollars?',
      'How do you keep the graph fresh as the corpus changes?',
    ],
  },
  {
    id: 'proj-agents',
    month: 4,
    name: 'Multi-agent operations system',
    goal: 'A multi-agent system on a complex use case (default: an operations agent that triages incoming requests, gathers context from tools, drafts actions, and requires human approval for irreversible ones).',
    architecture: `tool layer (typed schemas + permissions)
  -> planner -> worker agents (with memory)
  -> human approval flow + audit log
  -> eval suite (task success, cost, steps, safety) + cost controls + model routing`,
    constraints: [
      'Every tool call must go through a typed schema with an explicit permission scope.',
      'Irreversible actions require a human approval step that is logged.',
      'Must expose an HTTP API and a minimal UI.',
      'Must be deployable on Vercel or a comparable free tier.',
    ],
    defense: [
      'How do you stop an agent loop?',
      'How do you evaluate an agent, not just a model?',
      'What is the blast radius of a bad tool call?',
      'How do you route between models for cost and quality?',
    ],
  },
  {
    id: 'proj-gpt-from-scratch',
    month: 5,
    name: 'GPT from scratch, then inference',
    goal: 'A GPT implemented in PyTorch from tokenizer to LM head, trained on a small corpus, then upgraded with modern architecture components and served with a streaming inference server.',
    architecture: `tokenizer -> embeddings -> transformer blocks (attention + MLP)
  -> LM head -> training loop (loss curves)
  -> swap RoPE / RMSNorm / GQA -> KV cache + batched generation
  -> streaming inference server`,
    constraints: [
      'PyTorch, no pre-built transformer library for the model itself.',
      'Training and inference must both run on a single consumer or free-tier GPU.',
      'Must expose an HTTP API and a minimal UI.',
      'Must be deployable on Vercel or a comparable free tier for the serving layer.',
    ],
    defense: [
      'What is the parameter count of your model, and how did you compute it?',
      'How much memory does the model need in BF16?',
      'Why scale attention scores by sqrt(d)?',
      'What determines KV cache size?',
      'Why is decode memory-bound rather than compute-bound?',
      'What does continuous batching change about throughput?',
    ],
  },
  {
    id: 'proj-fine-tune-eval',
    month: 6,
    name: 'Fine-tune and evaluate: SFT then DPO',
    goal: 'Supervised fine-tuning then DPO on month 4\'s agent traces, with a final eval report comparing prompting, RAG, SFT, and DPO on the same task.',
    architecture: `agent traces -> dataset curation + quality filters
  -> LoRA SFT -> eval (before/after)
  -> preference data -> DPO
  -> comparative eval report (prompting vs RAG vs SFT vs DPO)`,
    constraints: [
      'Fine-tuning data must be derived from month 4\'s agent traces.',
      'LoRA or another parameter-efficient method only; no full fine-tune required.',
      'Must expose an HTTP API and a minimal UI for the eval report.',
      'Must be deployable on Vercel or a comparable free tier for the report and demo.',
    ],
    defense: [
      'When did fine-tuning make things worse?',
      'How did you detect catastrophic forgetting?',
      'DPO vs RLHF: what did you trade away?',
      'How do you know the eval set is not leaked into training?',
    ],
  },
]

export const milestones: Milestone[] = [
  {
    id: 'ms-rag-1',
    projectId: 'proj-rag',
    order: 1,
    title: 'Corpus, chunking, indexes, and a gold eval set',
    hours: 10,
    scope: [
      'Select and ingest a corpus of at least 500 real documents.',
      'Implement fixed-size and semantic chunking and compare them.',
      'Build a BM25 index and a vector index over the same chunks.',
      'Write 50 gold questions with reference answers and source spans.',
    ],
    acceptance: [
      'A CLI answers a query with top-k results from both the BM25 and vector indexes.',
      'The gold eval set of 50 questions is committed and versioned in the repo.',
    ],
  },
  {
    id: 'ms-rag-2',
    projectId: 'proj-rag',
    order: 2,
    title: 'Hybrid retrieval, reranking, and a baseline eval report',
    hours: 10,
    scope: [
      'Implement hybrid retrieval with reciprocal rank fusion by hand.',
      'Add a cross-encoder reranker over the fused candidates.',
      'Generate answers with inline citations to source spans.',
      'Score the baseline with Recall@5, MRR, and judge-scored faithfulness.',
    ],
    acceptance: [
      'A baseline eval report (v1) is committed with Recall@5, MRR, and faithfulness numbers.',
    ],
  },
  {
    id: 'ms-rag-3',
    projectId: 'proj-rag',
    order: 3,
    title: 'Reusable eval harness, query rewriting, and semantic cache',
    hours: 10,
    scope: [
      'Extract the eval harness into a standalone module with retrieval metrics and an LLM-as-judge for faithfulness and relevance.',
      'Add query rewriting via multi-query or HyDE.',
      'Add a semantic cache in front of retrieval and generation.',
      'Build an ablation table that toggles each component on and off.',
    ],
    acceptance: [
      'An ablation report is committed showing the effect of each component on the eval metrics.',
    ],
  },
  {
    id: 'ms-rag-4',
    projectId: 'proj-rag',
    order: 4,
    title: 'Guardrails, tracing, deployment, and defense docs',
    hours: 10,
    scope: [
      'Add prompt-injection detection on retrieved content and output filters on generated answers.',
      'Add per-request tracing with latency, tokens, and cost.',
      'Deploy the API and UI to a public URL.',
      'Write the seven defense documents for the project.',
    ],
    acceptance: [
      'The API and UI are live at a public URL.',
      'The seven defense documents are committed in the repo.',
    ],
  },

  {
    id: 'ms-advanced-rag-1',
    projectId: 'proj-advanced-rag',
    order: 1,
    title: 'Adaptive retrieval decisions',
    hours: 10,
    scope: [
      'Implement a planner that decides whether to retrieve at all, and how many hops to take, per query.',
    ],
    acceptance: [
      'The planner\'s retrieve-or-not and hop-count decisions are logged and inspectable per query.',
    ],
  },
  {
    id: 'ms-advanced-rag-2',
    projectId: 'proj-advanced-rag',
    order: 2,
    title: 'Parent-document and hierarchical chunking',
    hours: 10,
    scope: [
      'Implement parent-document retrieval and hierarchical chunking on top of the month 1 chunk store.',
    ],
    acceptance: [
      'Retrieval can return a small child chunk while generation is given its parent context.',
    ],
  },
  {
    id: 'ms-advanced-rag-3',
    projectId: 'proj-advanced-rag',
    order: 3,
    title: 'Metadata filtering and structured plus unstructured routing',
    hours: 10,
    scope: [
      'Add metadata filters and a router that sends a query to structured or unstructured retrieval.',
    ],
    acceptance: [
      'A query that names a metadata field (date, author, doc type) is routed and filtered correctly.',
    ],
  },
  {
    id: 'ms-advanced-rag-4',
    projectId: 'proj-advanced-rag',
    order: 4,
    title: 'Hardened guardrails and a red-team eval set',
    hours: 10,
    scope: [
      'Harden guardrails against the failure modes found in month 1, and build a red-team eval set to test them.',
    ],
    acceptance: [
      'The red-team eval set is committed with a report of pass/fail per guardrail.',
    ],
  },

  {
    id: 'ms-graph-rag-1',
    projectId: 'proj-graph-rag',
    order: 1,
    title: 'Entity and relation extraction pipeline',
    hours: 10,
    scope: [
      'Build an entity and relation extraction pipeline over the corpus with a quality check step.',
    ],
    acceptance: [
      'Extraction output is committed with a quality report against at least 50 hand-labeled documents, showing precision and recall of at least 80% against that gold sample.',
    ],
  },
  {
    id: 'ms-graph-rag-2',
    projectId: 'proj-graph-rag',
    order: 2,
    title: 'Graph construction and community detection',
    hours: 10,
    scope: [
      'Construct the knowledge graph from extracted entities and relations, run community detection, and generate community summaries.',
    ],
    acceptance: [
      'The graph and its community summaries are committed and reproducible from source documents.',
    ],
  },
  {
    id: 'ms-graph-rag-3',
    projectId: 'proj-graph-rag',
    order: 3,
    title: 'Graph plus vector hybrid retrieval',
    hours: 10,
    scope: [
      'Implement a hybrid retriever that combines graph traversal with vector search.',
    ],
    acceptance: [
      'A query returns answers sourced from both the graph and the vector index.',
    ],
  },
  {
    id: 'ms-graph-rag-4',
    projectId: 'proj-graph-rag',
    order: 4,
    title: 'Comparative eval against month 2',
    hours: 10,
    scope: [
      'Evaluate graph RAG against the month 2 advanced RAG system on global and local questions.',
    ],
    acceptance: [
      'A comparative eval report is committed covering both global and local question sets.',
    ],
  },

  {
    id: 'ms-agents-1',
    projectId: 'proj-agents',
    order: 1,
    title: 'Tool layer with typed schemas and permissions',
    hours: 10,
    scope: [
      'Build a tool layer where every tool has a typed schema and an explicit permission scope.',
    ],
    acceptance: [
      'Calling a tool outside its permission scope is rejected and logged.',
    ],
  },
  {
    id: 'ms-agents-2',
    projectId: 'proj-agents',
    order: 2,
    title: 'Planner plus workers with memory',
    hours: 10,
    scope: [
      'Build a planner that dispatches to worker agents, with short-term and long-term memory.',
    ],
    acceptance: [
      'The planner completes a multi-step task using at least two worker agents.',
    ],
  },
  {
    id: 'ms-agents-3',
    projectId: 'proj-agents',
    order: 3,
    title: 'Human approval flow and audit log',
    hours: 10,
    scope: [
      'Add a human approval step for irreversible actions and an audit log of all agent actions.',
    ],
    acceptance: [
      'An irreversible action is blocked until approved, and the audit log records the full trace.',
    ],
  },
  {
    id: 'ms-agents-4',
    projectId: 'proj-agents',
    order: 4,
    title: 'Eval suite, cost controls, and model routing',
    hours: 10,
    scope: [
      'Build an eval suite for task success, cost, steps, and safety, plus cost controls and model routing.',
    ],
    acceptance: [
      'The eval suite report is committed and shows cost per resolved task with model routing on versus off, with routing on reducing cost per resolved task by at least 20% at equal or better task-success rate.',
    ],
  },

  {
    id: 'ms-gpt-from-scratch-1',
    projectId: 'proj-gpt-from-scratch',
    order: 1,
    title: 'Tokenizer, embeddings, attention, blocks, LM head, training loop',
    hours: 10,
    scope: [
      'Implement the tokenizer, embeddings, attention, transformer blocks, and LM head, then train on a small corpus and plot loss curves.',
    ],
    acceptance: [
      'A training run completes and a loss curve is committed showing the loss decreasing.',
    ],
  },
  {
    id: 'ms-gpt-from-scratch-2',
    projectId: 'proj-gpt-from-scratch',
    order: 2,
    title: 'RoPE, RMSNorm, GQA swap-in and measurement',
    hours: 10,
    scope: [
      'Swap in RoPE, RMSNorm, and GQA and measure the effect on training speed and loss.',
    ],
    acceptance: [
      'A before/after comparison is committed with training speed and loss numbers.',
    ],
  },
  {
    id: 'ms-gpt-from-scratch-3',
    projectId: 'proj-gpt-from-scratch',
    order: 3,
    title: 'KV cache and batched generation',
    hours: 10,
    scope: [
      'Implement a KV cache and batched generation for inference.',
    ],
    acceptance: [
      'On a fixed prompt and seed, batched generation with the KV cache produces token-for-token identical output to the uncached path, at least 2x the tokens/sec of the uncached baseline.',
    ],
  },
  {
    id: 'ms-gpt-from-scratch-4',
    projectId: 'proj-gpt-from-scratch',
    order: 4,
    title: 'Streaming server with throughput and latency measurements',
    hours: 10,
    scope: [
      'Build a streaming inference server and measure throughput and latency under load.',
    ],
    acceptance: [
      'A throughput and latency report is committed for the streaming server.',
    ],
  },

  {
    id: 'ms-fine-tune-eval-1',
    projectId: 'proj-fine-tune-eval',
    order: 1,
    title: 'Dataset curation and quality filters',
    hours: 10,
    scope: [
      'Curate a fine-tuning dataset from month 4\'s agent traces and apply quality filters.',
    ],
    acceptance: [
      'The curated dataset and its filtering criteria are committed.',
    ],
  },
  {
    id: 'ms-fine-tune-eval-2',
    projectId: 'proj-fine-tune-eval',
    order: 2,
    title: 'LoRA SFT with eval before and after',
    hours: 10,
    scope: [
      'Run LoRA supervised fine-tuning and evaluate the model before and after.',
    ],
    acceptance: [
      'A before/after eval report is committed showing the effect of SFT.',
    ],
  },
  {
    id: 'ms-fine-tune-eval-3',
    projectId: 'proj-fine-tune-eval',
    order: 3,
    title: 'Preference data and DPO',
    hours: 10,
    scope: [
      'Build a preference dataset and run DPO on top of the SFT model.',
    ],
    acceptance: [
      'The DPO model and its preference dataset are committed.',
    ],
  },
  {
    id: 'ms-fine-tune-eval-4',
    projectId: 'proj-fine-tune-eval',
    order: 4,
    title: 'Comparative eval: prompting, RAG, SFT, DPO',
    hours: 10,
    scope: [
      'Build a final eval report comparing prompting, RAG, SFT, and DPO on the same task.',
    ],
    acceptance: [
      'The comparative eval report is committed with numbers for all four approaches.',
    ],
  },
]
