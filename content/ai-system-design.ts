/**
 * AI system design bank.
 *
 * For an AI engineer role the AI system design round IS the core round: the interviewer
 * wants to hear GPU memory arithmetic, the prefill/decode latency split, cost per request
 * as a design constraint, and how you detect a silent quality regression. The conventional
 * distributed-systems bank in `content/system-design.ts` deliberately does not cover any of
 * that, so this bank is separate and mirrors that file's shape exactly: six step arrays of
 * prompts, a `solution` keyed to the same six names plus `numbers`, a `delivery` block, and
 * a Mermaid `flowchart` for the reference architecture.
 *
 * Coverage reference: the topic map is informed by
 * https://github.com/amitshekhariitbhu/ai-engineering-interview-questions (Apache License
 * 2.0), used only to check that the patterns below span what the field actually asks about.
 * No text is copied from it — that repository lists prompts without answers, and the whole
 * value of this bank is the reference solutions.
 *
 * On numbers: every figure below is either arithmetic you can redo on the whiteboard from
 * stated inputs (parameter count, dtype width, layer count, memory bandwidth) or an
 * explicitly labelled assumption. Where a current benchmark or price would be needed, the
 * solution states the formula and works an example at a named assumed rate rather than
 * asserting a vendor number that ages badly.
 *
 * Registration in `lib/content/index.ts` and the schema barrel is a later task, so the zod
 * schemas and inferred types live here.
 */
import { z } from 'zod'

/** A recurring AI-infrastructure shape, and the trade-offs it forces. */
export const aiSdPatternSchema = z.object({
  id: z.string().regex(/^aisdp-[a-z0-9-]+$/),
  name: z.string().min(1),
  order: z.number().int().min(1).max(8),
  solves: z.string().min(1),
  tradeoffs: z.array(z.string().min(1)).min(3),
})

/**
 * The reference answer, keyed to the same six steps as `steps`. Each field is the decision
 * a strong candidate commits to and the trade-off they name, not a prompt. The 80-character
 * floor exists to keep a hedge like "it depends on the workload" out of the bank.
 */
export const aiSdSolutionSchema = z.object({
  define: z.string().min(80),
  data: z.string().min(80),
  architecture: z.string().min(80),
  evaluate: z.string().min(80),
  deploy: z.string().min(80),
  wrapup: z.string().min(80),
  /** Estimates to say out loud, each carrying the arithmetic that produced it. */
  numbers: z.array(z.string().min(1)).min(2),
})

/** One challenge the interviewer raises on this question, and the honest answer. */
export const aiSdPushbackSchema = z.object({
  challenge: z.string().min(1),
  answer: z.string().min(1),
})

/** Minutes per phase of the round. Must sum to the question's `minutes`. */
export const aiSdBudgetSchema = z.object({
  requirements: z.number().int().positive(),
  estimates: z.number().int().positive(),
  apiAndData: z.number().int().positive(),
  architecture: z.number().int().positive(),
  deepDive: z.number().int().positive(),
  wrapUp: z.number().int().positive(),
})

/** How to perform the answer inside the time box. */
export const aiSdDeliverySchema = z.object({
  budget: aiSdBudgetSchema,
  opening: z.string().min(1),
  traps: z.array(z.string().min(1)).min(2).max(4),
  whenPushed: z.array(aiSdPushbackSchema).min(2).max(3),
})

export const aiSdQuestionSchema = z.object({
  id: z.string().regex(/^aisdq-[a-z0-9-]+$/),
  patternId: z.string().regex(/^aisdp-[a-z0-9-]+$/),
  title: z.string().min(1),
  companies: z.array(z.string().min(1)).min(1),
  steps: z.object({
    define: z.array(z.string().min(1)).min(2),
    data: z.array(z.string().min(1)).min(2),
    architecture: z.array(z.string().min(1)).min(2),
    evaluate: z.array(z.string().min(1)).min(2),
    deploy: z.array(z.string().min(1)).min(2),
    wrapup: z.array(z.string().min(1)).min(2),
  }),
  solution: aiSdSolutionSchema,
  delivery: aiSdDeliverySchema,
  /** Mermaid `flowchart` source for the reference architecture `solution.architecture` describes. */
  diagram: z.string().regex(/^flowchart (TD|LR|TB|RL|BT)\n/).refine((d) => d.includes('-->'), {
    message: 'diagram must contain at least one --> edge',
  }),
  minutes: z.union([z.literal(45), z.literal(60)]),
}).superRefine((q, ctx) => {
  const b = q.delivery.budget
  const total = b.requirements + b.estimates + b.apiAndData + b.architecture + b.deepDive + b.wrapUp
  if (total !== q.minutes) {
    ctx.addIssue({
      code: 'custom',
      path: ['delivery', 'budget'],
      message: `budget sums to ${total} minutes, expected ${q.minutes}`,
    })
  }
})

export type AiSdPattern = z.infer<typeof aiSdPatternSchema>
export type AiSdQuestion = z.infer<typeof aiSdQuestionSchema>

export const aiSdPatterns: AiSdPattern[] = [
  {
    id: 'aisdp-llm-serving',
    name: 'LLM Inference Serving',
    order: 1,
    solves: 'Turns GPUs into a shared, high-throughput token factory: fitting weights and KV cache into HBM, batching continuously, and streaming output within a time-to-first-token budget.',
    tradeoffs: [
      'A larger continuous batch amortises the weight read across more sequences and multiplies throughput, but every extra sequence steals KV-cache HBM and lengthens inter-token latency for everyone already in the batch.',
      'Tensor parallelism across more GPUs shrinks per-GPU weight and KV pressure and cuts decode latency, but adds an all-reduce on every layer, so scaling from 2 to 8 GPUs buys progressively less and wastes capacity on small models.',
      'Chunked prefill interleaves long prompts with ongoing decodes so no user is blocked behind a 32K-token prompt, but it slows that prompt\'s own time-to-first-token compared with letting prefill run to completion.',
      'Quantising weights to FP8 or INT4 roughly halves or quarters weight memory and speeds the memory-bound decode phase, but costs measurable quality that only a task-specific eval will reveal, not perplexity alone.',
    ],
  },
  {
    id: 'aisdp-ai-gateway',
    name: 'AI Gateway & Model Routing',
    order: 2,
    solves: 'Gives an organisation one policy-enforcing door to every model: routing by cost and difficulty, enforcing budgets, failing over between providers, and caching semantically identical work.',
    tradeoffs: [
      'Routing easy requests to a small model can cut blended cost per request by an order of magnitude, but the router itself is a classifier that can be wrong, and its errors show up as quality regressions with no error rate change.',
      'A semantic cache on embedding similarity raises hit rate far above exact-match, but a threshold loose enough to be useful will eventually serve an answer to a question that only looked the same.',
      'Hard budget enforcement protects spend but turns a finance control into a production outage; soft enforcement keeps the product up and lets a runaway loop bill five figures overnight.',
      'Cross-provider failover buys availability, but the fallback model has different tokenisation, different refusal behaviour and different formatting, so an untested failover path is a quality incident waiting for an outage to trigger it.',
    ],
  },
  {
    id: 'aisdp-rag-platform',
    name: 'Retrieval-Augmented Generation Platforms',
    order: 3,
    solves: 'Grounds generation in a corpus the model never saw in training: chunking, embedding, hybrid retrieval, reranking, and enforcing that a user only ever sees what they are allowed to see.',
    tradeoffs: [
      'Larger chunks preserve context so the model reasons better, but dilute the embedding, so a specific query matches a vague vector; small chunks retrieve precisely and then hand the model fragments with no surrounding context.',
      'Filtering by access control before the vector search is correct but degrades ANN recall as the filter gets selective; filtering after the search is fast and returns short or empty result sets for narrowly permissioned users.',
      'Adding a cross-encoder reranker over the top 100 candidates reliably improves precision at 5, but adds 50 to 300ms and a second model to operate.',
      'Rebuilding an index gives clean, uniformly-versioned embeddings; incremental upsert keeps the corpus fresh within minutes but leaves you serving a mix of embedding-model versions unless you version the index explicitly.',
    ],
  },
  {
    id: 'aisdp-agent-platform',
    name: 'Agent Platforms & Tool Use',
    order: 4,
    solves: 'Runs multi-step, tool-calling LLM loops that survive minutes to hours: durable state, sandboxed execution, budget ceilings, and a defined escalation path to a human.',
    tradeoffs: [
      'More autonomy solves harder tasks end to end but multiplies the blast radius of a single bad tool call, and every additional step compounds the per-step error rate: 95 percent per step is 60 percent over ten steps.',
      'Keeping the whole trajectory in context preserves reasoning continuity but grows cost quadratically-ish as every turn re-reads the transcript; summarising or externalising to scratchpad memory is cheap but silently drops the detail that mattered.',
      'A specialist multi-agent team parallelises research and isolates failures, but each handoff is a lossy serialisation and the orchestrator becomes the hardest component to evaluate.',
      'Running tools in a hard sandbox (microVM, no network, ephemeral filesystem) makes arbitrary code safe to execute, but adds cold-start latency and blocks the legitimate case where the agent needs to fetch a package.',
    ],
  },
  {
    id: 'aisdp-eval-platform',
    name: 'Evaluation & LLM Observability',
    order: 5,
    solves: 'Makes a non-deterministic system shippable: offline eval sets with a gate, LLM judges calibrated against humans, online experiments on generative output, and traces that explain a single bad answer.',
    tradeoffs: [
      'An LLM judge scales to every request and costs cents, but it is a model with its own biases (position, verbosity, self-preference) and is only trustworthy to the extent you have measured its agreement with human labels.',
      'A large golden eval set catches more regressions but is expensive to keep correct, and every fix that is written into it narrows what it can still catch: the set slowly becomes the training target.',
      'Online A/B on generative output is the only ground truth, but the signal is thin — implicit signals like copy, retry and thumbs are sparse and biased — so experiments run for weeks where a classifier would take days.',
      'Full-fidelity tracing of prompts and outputs explains any incident, but stores customer content, so retention and redaction become a privacy design problem rather than a storage-cost one.',
    ],
  },
  {
    id: 'aisdp-multimodal',
    name: 'Multimodal Systems',
    order: 6,
    solves: 'Handles pixels and audio alongside text: shared embedding spaces for cross-modal search, diffusion serving with its own very different cost curve, and streaming speech under a real-time constraint.',
    tradeoffs: [
      'A single shared embedding space makes text-to-image and image-to-image search one index and one query path, but is beaten on any single modality by a specialist model with a modality-specific index.',
      'Video is the extreme of the chunking problem: one embedding per shot is cheap and searchable but loses the moment, and one per frame is precise and explodes index size by two orders of magnitude.',
      'Diffusion cost scales with denoising steps and resolution, not with output length, so the levers are step count, scheduler and resolution rather than the batching and KV tricks that govern LLM serving.',
      'Streaming ASR must emit words before the utterance ends, so it trades word error rate against latency: a longer right-context window is measurably more accurate and measurably later.',
    ],
  },
  {
    id: 'aisdp-training-infra',
    name: 'Training & Fine-Tuning Infrastructure',
    order: 7,
    solves: 'Runs the offline half: dataset and model lineage, distributed training that survives node failure, parameter-efficient fine-tuning as a product, and retraining on a schedule without silent drift.',
    tradeoffs: [
      'LoRA fine-tuning trains under one percent of parameters, fits on a single GPU and lets one base model serve hundreds of adapters, but cannot teach genuinely new capability or a new domain the way full fine-tuning can.',
      'Data parallelism is simple and scales near-linearly until the model no longer fits one device; FSDP or tensor parallelism fixes that by sharding state, at the cost of communication on every step and a much harder debugging story.',
      'Frequent checkpointing bounds the work lost to a failed node but stalls every rank while it writes; on a large job the checkpoint interval is a straight trade of wasted compute against recovery time.',
      'Continual retraining keeps a model current with shifting data but risks catastrophic forgetting and creates a feedback loop where the model trains on the consequences of its own past predictions.',
    ],
  },
  {
    id: 'aisdp-ai-product',
    name: 'AI Features Inside a Product',
    order: 8,
    solves: 'Ships a model as a feature real users depend on: per-unit economics that survive volume, graceful degradation when the model is wrong, human review where the stakes demand it, and fairness where the law does.',
    tradeoffs: [
      'A model-first design is fast to build and generalises, but a cheap deterministic pre-filter usually removes 80 to 95 percent of the volume before any GPU is touched, and every request it removes is pure margin.',
      'Automating a decision entirely is the whole point of the feature, but for a consequential decision a human-in-the-loop tier is the difference between a product and a liability, and it caps throughput at reviewer capacity.',
      'Batch inference is an order of magnitude cheaper per item than real-time and is invisible to the user when results are consumed asynchronously, but it forecloses any interactive experience over the same model.',
      'Tuning a moderation or screening threshold is a policy decision disguised as a hyperparameter: every point of recall you buy costs precision, and the two errors land on different people.',
    ],
  },
]

/**
 * Pattern 1 — LLM inference serving. The whole round turns on memory arithmetic: weights in
 * BF16, KV cache per token, what fits in HBM, and what batching does to prefill and decode
 * in opposite directions.
 */
const servingQuestions: AiSdQuestion[] = [
  {
    id: 'aisdq-inference-platform',
    patternId: 'aisdp-llm-serving',
    title: 'Design an LLM inference platform',
    companies: ['google', 'amazon', 'microsoft'],
    minutes: 60,
    steps: {
      define: [
        'Which model sizes must this platform host, and is it one model at high traffic or many models at low traffic each?',
        'What are the two latency SLOs — time to first token and inter-token latency — and which one does the product actually feel?',
        'Is the workload chat (short prompts, long outputs), summarisation (long prompts, short outputs), or both, and why does that change the hardware plan?',
      ],
      data: [
        'Work out the weight memory and the KV cache memory per token for the target model, and say how many concurrent sequences fit on one node.',
        'What is the prompt and output length distribution, and what does its tail do to your capacity plan?',
        'What state must survive a pod restart, and what is genuinely disposable?',
      ],
      architecture: [
        'Draw the path from request to first token: where does admission control sit, and what schedules a request onto a GPU?',
        'How does continuous batching work, and what happens to a request that arrives mid-decode?',
        'How do you keep a 32K-token prefill from stalling everyone already decoding on that GPU?',
        'How is the model sharded across GPUs, and at what model size does that stop being optional?',
      ],
      evaluate: [
        'What do you measure to know whether you are compute-bound or memory-bound right now?',
        'What is your throughput-versus-latency curve, and where on it do you choose to operate?',
        'How do you prove a quantised model is safe to ship when perplexity barely moved?',
      ],
      deploy: [
        'How do you roll out a new model version when you cannot diff outputs against the old one?',
        'What happens when a GPU falls over mid-generation with 40 sequences in flight?',
        'How do you autoscale a fleet whose instances take four minutes to load weights?',
      ],
      wrapup: [
        'What single metric tells you the fleet is saturated before users notice?',
        'What is your cost per million output tokens, and which lever moves it most?',
      ],
    },
    solution: {
      define:
        'One platform, two hardware pools. Target a 70B-class dense model in BF16 for the quality tier and an 8B model for the cheap tier. SLOs are stated separately because they fail separately: time to first token p95 under 800ms, and inter-token latency p95 under 50ms, which is about 20 tokens per second and comfortably above reading speed. TTFT is dominated by prefill and by queueing; inter-token latency is dominated by memory bandwidth and by how many sequences share the batch. I will not offer a single end-to-end latency SLO, because for a 600-token answer it is meaningless.',
      data:
        'Weights: 70e9 parameters x 2 bytes for BF16 = 140GB, so the model does not fit on one 80GB H100 and tensor parallelism is not an optimisation, it is a requirement. KV cache per token = 2 (K and V) x 80 layers x 8 KV heads (grouped-query) x 128 head dim x 2 bytes = 327,680 bytes, about 320KiB per token per sequence. An 8K-token conversation therefore costs 2.5GiB of HBM just to remember. That single number drives the whole design: concurrency is bounded by KV cache, not by compute. Prompt length is bimodal — chat turns of 200 to 2,000 tokens and document tasks of 20K to 100K — so I size for the p95 and preempt the tail rather than provisioning for it.',
      architecture:
        'A stateless router fronts a fleet of vLLM-style engine replicas, each replica being one 4x H100 node running the 70B model with tensor parallelism 4 and NVLink between the four GPUs. The router does admission control and least-loaded-by-KV-blocks placement, not round robin, because a GPU with free HBM is the only GPU that can accept work. Inside a replica: PagedAttention allocates KV in fixed 16-token blocks so no sequence needs contiguous memory and fragmentation stops capping concurrency; a continuous-batching scheduler admits and retires sequences at every decode step rather than waiting for a batch to drain; chunked prefill splits a long prompt into 512-token chunks that are interleaved with ongoing decode steps, so a 32K prompt costs its own TTFT but never freezes the other 60 sequences on that node. Prefix caching keeps the KV blocks of shared system prompts resident, so a 900-token system prompt is prefilled once per node, not once per request. The 8B tier runs one GPU per replica with no tensor parallelism, because at that size the all-reduce per layer costs more than it saves. Requests stream back over SSE through the router, which owns nothing but the socket.',
      evaluate:
        'Prefill is compute-bound and decode is memory-bandwidth-bound, and you can tell which regime you are in from GPU utilisation versus achieved memory bandwidth: high SM occupancy with low bandwidth means prefill, the reverse means decode. I benchmark the throughput-latency curve directly by ramping concurrency and plotting output tokens per second against inter-token latency p95, then pick the operating point just before the knee — typically 60 to 70 percent of peak throughput — because the last 30 percent of throughput costs a doubling of tail latency. For quantisation, perplexity is not an acceptance test: I run a task-specific eval suite (instruction following, JSON validity, tool-call correctness, long-context retrieval) plus a side-by-side LLM-judge preference run on 2,000 production-shaped prompts, and require the FP8 model to be within 1 point on every task metric and not lose the preference test, because FP8 damage shows up as format drift and degraded long-context recall long before it shows up in perplexity.',
      deploy:
        'You cannot diff outputs, so the rollout is statistical rather than exact. New model version goes to a shadow pool first, replaying 10,000 recorded production requests; I compare distributions — output length, refusal rate, JSON parse-failure rate, tool-call rate, judge score against the current version — and gate on those, not on token equality. Then 1 percent live for 24 hours with the same metrics computed online, then 10, 50, 100. Rollback is a router-side weight change, which is instant, but the old model must still be resident on warm nodes for that to be true, so I keep the previous version loaded on 10 percent of the fleet for a week. GPU failure: sequences on a dead node are lost, and because the client is streaming, I re-issue the request to another replica and let it regenerate from the prompt rather than pretending to resume — with prefix caching the regeneration is cheap, and clients see a stream restart, which the SDK hides. Autoscaling on queue depth alone is too late when weights take four minutes to load from object storage, so I scale on a predicted-load signal, keep a warm pool of 15 percent, and pull weights from a node-local NVMe cache seeded at image build so a cold start is 40 seconds rather than four minutes.',
      wrapup:
        'The saturation metric is KV cache block occupancy per replica: when it crosses about 85 percent the scheduler starts preempting sequences, and preemption shows up as inter-token latency spikes before any error is logged. That is the page. Cost per million output tokens is the number I take to the business, and the biggest lever is batch size, because the weight read is amortised across the batch — going from batch 1 to batch 32 improves tokens per dollar by more than an order of magnitude at a modest latency cost. Second lever is routing easy traffic to the 8B tier. Out of scope for v1: speculative decoding and disaggregated prefill/decode clusters, both of which I would revisit once the batching curve is measured.',
      numbers: [
        'Weights: 70e9 params x 2 bytes (BF16) = 140GB, so 2x 80GB H100 is the floor and 4x is the practical node once KV cache needs room.',
        'KV cache per token = 2 x 80 layers x 8 KV heads x 128 head dim x 2 bytes = 320KiB; an 8K-token session holds 2.5GiB, so 160GB of leftover HBM on a 4x H100 node = about 64 concurrent 8K sessions.',
        'Decode step is bandwidth-bound: 35GB of weights per GPU / 3.35TB/s HBM3 = 10.4ms; at batch 64 the KV read adds 40GB per GPU, about 12ms more, so roughly 22ms per step = 45 tokens/s per user and about 2,900 tokens/s per node.',
        'Prefill is compute-bound: 2 x 70e9 x 2,000 prompt tokens = 2.8e14 FLOPs; at an assumed 40 percent MFU on 4 GPUs (about 1.6 PFLOP/s) that is 175ms, which is most of the TTFT budget.',
        'Cost: at an assumed 2.50 USD per GPU-hour, a 4x H100 node is 10 USD/hour; 2,900 tokens/s x 3,600 = 10.4M tokens/hour, so about 0.96 USD per million output tokens at full utilisation and 2.40 USD at a realistic 40 percent.',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 10, apiAndData: 6, architecture: 16, deepDive: 15, wrapUp: 5 },
      opening:
        'Before I draw anything I want to do the memory arithmetic, because on this system the architecture falls out of how much KV cache fits in HBM. Let me size a 70B model in BF16 and work out concurrency from there.',
      traps: [
        'Designing this like a stateless web service. It is not: every in-flight request holds hundreds of megabytes to gigabytes of GPU memory for its whole lifetime, so admission control and eviction are the core of the design, not an afterthought.',
        'Quoting one latency SLO. Prefill and decode bottleneck on different resources and batching moves them in opposite directions; if you do not split TTFT from inter-token latency the interviewer knows you have not run this in production.',
        'Never mentioning memory. An answer about GPUs that never computes weight bytes or KV bytes per token reads as an ML-flavoured web-services answer.',
        'Treating a new model version as a normal deploy. There is no output diff for a non-deterministic system, so if you do not describe shadow replay and distributional gates you have no rollout story at all.',
      ],
      whenPushed: [
        {
          challenge: 'Why not just use a bigger batch and take the throughput?',
          answer:
            'Because inter-token latency rises with batch size once the KV cache read dominates the step. At batch 64 the KV read is already larger than the weight read in my arithmetic, so batch 128 roughly doubles the step time and every user in the batch feels it. I operate just below the knee of the curve and let the router shed to another replica rather than deepening the batch.',
        },
        {
          challenge: 'Your fleet is idle at night. That is a lot of wasted money.',
          answer:
            'It is, and I would rather sell that capacity than chase the demand curve with autoscaling that cannot beat a four-minute weight load. Off-peak I run batch inference — evals, embedding backfills, offline summarisation — on the same replicas at lower scheduling priority, and preempt those jobs the moment interactive queue depth rises.',
        },
        {
          challenge: 'Could you serve this on cheaper GPUs?',
          answer:
            'For the 8B tier yes: decode is bandwidth-bound, so an L40S at roughly a third of the cost and half the bandwidth is a reasonable tokens-per-dollar trade when the SLO is 50ms per token. For the 70B model, no, because 140GB of weights would need eight of them and the interconnect is PCIe rather than NVLink, so the per-layer all-reduce eats the saving.',
        },
      ],
    },
    diagram: `flowchart TD
  C["Client (SSE stream)"] --> R["Router: admission control"]
  R -->|least free-KV-blocks| E1["Engine replica A (4x H100, TP=4)"]
  R --> E2["Engine replica B"]
  R -->|easy prompts| S8["8B tier (1 GPU per replica)"]
  E1 --> SCH["Continuous-batching scheduler"]
  SCH -->|chunked 512-token chunks| PF["Prefill (compute-bound)"]
  SCH -->|one step per token| DEC["Decode (bandwidth-bound)"]
  PF --> KV[("Paged KV cache, 16-token blocks")]
  DEC --> KV
  KV -->|shared system prompts| PC["Prefix cache"]
  E1 -->|KV occupancy, ITL, TTFT| OBS["Metrics and traces"]
  OBS -->|occupancy > 85%| R
  MR[("Model registry + node-local NVMe")] -->|weight load| E1`,
  },
  {
    id: 'aisdq-multi-tenant-gpu-serving',
    patternId: 'aisdp-llm-serving',
    title: 'Design multi-tenant GPU serving for many fine-tuned models',
    companies: ['amazon', 'microsoft'],
    minutes: 60,
    steps: {
      define: [
        'How many distinct models are we hosting, and what does the traffic distribution across them look like?',
        'Is a tenant paying for dedicated capacity or sharing a pool, and what isolation do we owe them?',
        'What is the acceptable cold-start latency for a model that has had no traffic for an hour?',
      ],
      data: [
        'How large is a LoRA adapter compared with the base model, and what does that let you do that full fine-tunes do not?',
        'What does the request-rate distribution across tenants look like, and what fraction of models are effectively cold?',
        'What tenant metadata must the router hold to place a request correctly?',
      ],
      architecture: [
        'How do you serve hundreds of fine-tuned variants without hundreds of GPU pools?',
        'Where do adapters live, how are they loaded, and what is the memory cost of keeping one resident?',
        'How do you stop a noisy tenant from consuming the whole KV cache on a shared node?',
        'What do you do with a tenant whose full fine-tune cannot share a base model?',
      ],
      evaluate: [
        'How do you measure per-tenant quality when each tenant has a different adapter?',
        'What tells you a shared node is over-subscribed, per tenant rather than in aggregate?',
      ],
      deploy: [
        'How does a tenant ship a new adapter version without a fleet deploy?',
        'How do you handle a tenant whose adapter is broken and is burning GPU time producing garbage?',
      ],
      wrapup: [
        'What is the unit economics difference between a shared and a dedicated tenant?',
        'At what traffic level would you move a tenant off the shared pool?',
      ],
    },
    solution: {
      define:
        'The realistic shape is a long tail: a few hundred tenants, where the top 5 percent carry 80 percent of traffic and the rest are near-idle. Dedicating a GPU pool per tenant would mean hundreds of mostly-idle H100s, so the default is a shared multi-LoRA pool with per-tenant rate and concurrency quotas, and a dedicated-node tier that tenants pay for explicitly. Cold start for a tail model must be under 2 seconds, which is achievable for an adapter and is not achievable for a full model, and that single constraint is what forces the LoRA-first design.',
      data:
        'A rank-16 LoRA on a 7B model touches roughly 20 to 40M parameters — under 1 percent — so the adapter is 40 to 80MB in BF16 against 14GB of base weights. That means 200 adapters cost about 12GB of HBM if all are resident, versus 2.8TB if each were a full fine-tune. Adapters live in object storage keyed by tenant and version, with an LRU of the hot set on node-local NVMe so a miss is a 60MB read from local disk rather than a cross-region fetch. Per-tenant metadata the router needs is small: base model id, adapter id and version, quota, and tier.',
      architecture:
        'One base-model pool per base model (say 7B and 70B), each replica running a multi-LoRA engine that batches requests for different adapters into the same batch — the base matmul is shared and each sequence applies its own low-rank delta, so a batch of 32 requests spanning 12 adapters costs one weight read, not twelve. The router resolves tenant to (base model, adapter version) and prefers replicas that already have that adapter resident, falling back to any replica with quota, which triggers an NVMe load. Adapter residency is an LRU capped at, say, 64 adapters per node so it never competes seriously with KV cache. Fairness is enforced at the scheduler, not the router: each tenant gets a KV-block budget and a share of decode slots via weighted fair queueing, so one tenant streaming 100K-token contexts cannot starve the pool — their requests queue against their own budget. Full fine-tunes cannot share a base, so they go to the dedicated tier and are priced accordingly; I would rather charge for that honestly than pretend a shared pool can absorb them.',
      evaluate:
        'Quality is per-tenant by construction, so a fleet-wide judge score is useless. Each tenant gets a small eval set — 50 to 200 of their own examples, captured at onboarding and refreshed — and every adapter version is scored against it before it can be promoted. Online, I track per-tenant format-failure rate and per-tenant p95 inter-token latency, because over-subscription hurts specific tenants long before the node aggregate moves: the aggregate hides a single tenant being preempted every step. The alert is on per-tenant queue wait as a fraction of that tenant quota, not on node utilisation.',
      deploy:
        'Adapter promotion is a metadata write, not a deploy: the tenant uploads a version, it is scored against their eval set, and promotion flips a pointer in the registry that the router reads. Rollback is the same pointer. Because adapters load in under 2 seconds, there is no fleet restart anywhere in that path. A broken adapter that is burning GPU time is detected by the per-tenant format-failure and mean-output-length monitors — a degenerate adapter usually shows up as maximum-length outputs — and the circuit breaker demotes that tenant to the previous adapter version automatically and pages the tenant, rather than letting a runaway loop consume the shared pool.',
      wrapup:
        'Shared economics: a 7B replica at 3,000 tokens/s and an assumed 2.50 USD per GPU-hour is about 0.23 USD per million tokens at full load, and shared tenants approach that because the pool is kept busy. A dedicated tenant at 5 percent utilisation pays for the idle 95 percent — the same GPU costs 4.60 USD per million tokens delivered. I move a tenant to dedicated when their sustained load exceeds roughly 60 percent of a replica, because at that point they no longer benefit from sharing and their burstiness is hurting everyone else. Out of scope for v1: adapter merging into the base for the very hottest tenant, which removes the low-rank compute entirely at the cost of a dedicated weight copy.',
      numbers: [
        'Rank-16 LoRA on 7B: roughly 20-40M trainable params = 40-80MB in BF16, versus 14GB base weights, so 200 adapters resident cost about 12GB of HBM.',
        'Adapter cold start: 60MB from node-local NVMe at an assumed 2GB/s = 30ms, versus 14GB of base weights from object storage at 1GB/s = 14 seconds — three orders of magnitude, and the reason the design is adapter-first.',
        'Batching across adapters: a batch of 32 spanning 12 adapters does one 14GB weight read per step instead of twelve, so throughput per GPU is within a few percent of single-adapter serving.',
        'Unit cost: 3,000 tokens/s x 3,600 = 10.8M tokens/hour; at an assumed 2.50 USD/GPU-hour that is 0.23 USD per million tokens at 100 percent utilisation and 4.60 USD at 5 percent.',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 8, apiAndData: 8, architecture: 16, deepDive: 15, wrapUp: 5 },
      opening:
        'The decision that shapes everything here is whether tenants share a base model. Let me size a LoRA adapter against the base weights first, because the ratio is what makes a shared pool possible at all.',
      traps: [
        'Assuming one GPU pool per tenant. With a long tail of near-idle tenants that is hundreds of idle GPUs, and the interviewer is asking this question precisely to see whether you reach for adapters.',
        'Enforcing fairness only at the router. The contended resource is KV cache inside a replica, so a per-tenant request quota at the edge does nothing about one tenant holding 100K-token contexts.',
        'Ignoring that some tenants will have full fine-tunes. Say plainly that those cannot share a base and go to a priced dedicated tier, rather than hand-waving that everything is a LoRA.',
        'Reporting node-level metrics only. Over-subscription in a shared pool is felt per tenant; the aggregate looks healthy while one tenant is preempted every step.',
      ],
      whenPushed: [
        {
          challenge: 'Does multi-LoRA batching not slow everyone down?',
          answer:
            'It adds a low-rank matmul per sequence, which is small next to the shared base matmul — the base read is the expensive part and it is amortised. Measured, it is a few percent of throughput. What actually slows people down is adapter thrash if the resident set is too small, so I cap adapters per node and route by residency.',
        },
        {
          challenge: 'How do you stop a tenant seeing another tenant data?',
          answer:
            'Nothing tenant-specific crosses a batch boundary except through the KV cache, which is per-sequence and freed on completion. The real risks are prefix-cache reuse and logging, so I key the prefix cache by tenant as well as by token hash, and I keep traces in per-tenant storage. If a tenant needs a stronger guarantee than process isolation, that is the dedicated tier.',
        },
      ],
    },
    diagram: `flowchart TD
  T1["Tenant A request"] --> R["Router: tenant to base+adapter"]
  T2["Tenant B request"] --> R
  REG[("Adapter registry: tenant, version, quota")] --> R
  R -->|prefers adapter-resident replica| N1["Replica: 7B base, multi-LoRA"]
  R --> N2["Replica: 70B base, multi-LoRA"]
  R -->|full fine-tune tenants| DED["Dedicated node tier"]
  N1 --> WFQ["Weighted fair queue: per-tenant KV budget"]
  WFQ --> BATCH["Shared base matmul + per-sequence LoRA delta"]
  BATCH --> KV[("Paged KV cache")]
  NVME[("Node NVMe adapter LRU (64 adapters)")] -->|60MB load| N1
  OBJ[("Object store: adapter versions")] --> NVME
  N1 -->|per-tenant ITL, format failures| OBS["Per-tenant monitors"]
  OBS -->|degenerate adapter| REG`,
  },
  {
    id: 'aisdq-token-streaming-at-scale',
    patternId: 'aisdp-llm-serving',
    title: 'Design token streaming for a chat product at scale',
    companies: ['google', 'microsoft'],
    minutes: 45,
    steps: {
      define: [
        'How many concurrent streaming connections at peak, and how long does the average one live?',
        'What must happen if the user closes the tab mid-generation, and what if their network drops for three seconds?',
        'Is SSE, WebSocket or HTTP/2 the right transport here, and why?',
      ],
      data: [
        'What is the per-connection memory and file-descriptor cost, and what does that mean for instance sizing?',
        'What state is needed to resume a stream, and where does it live?',
      ],
      architecture: [
        'Draw the path a single token takes from the GPU to the browser and name every buffer on the way.',
        'How does a reconnecting client resume without re-paying for the tokens already generated?',
        'How do you keep an idle proxy or load balancer from killing a long-lived stream?',
      ],
      evaluate: [
        'What do you measure to know streaming is healthy, given end-to-end latency is meaningless here?',
        'How would you detect that a CDN or proxy is buffering your stream instead of passing it through?',
      ],
      deploy: [
        'How do you deploy a new version of the streaming tier without cutting live generations?',
        'What is the backpressure story when a client reads slower than the GPU produces?',
      ],
      wrapup: [
        'What is the dominant cost of this tier, and is it the GPUs?',
        'What would you simplify if the product could tolerate non-streaming responses?',
      ],
    },
    solution: {
      define:
        'Assume 100,000 concurrent streams at peak, each living 20 to 60 seconds — a 600-token answer at 25 tokens per second is 24 seconds. Closing the tab must cancel generation, because an abandoned stream that keeps decoding is pure wasted GPU spend, and at this scale abandonment is a real percentage. A three-second network drop must be resumable, because forcing a full regeneration doubles the cost of every flaky mobile session. Transport is SSE over HTTP/2: it is one-directional, which is all we need, it survives proxies that mangle WebSocket upgrades, and it has a defined reconnection semantics with Last-Event-ID that I will actually use.',
      data:
        'A streaming connection is cheap in memory and expensive in file descriptors and event-loop slots: budget roughly 30 to 50KB per idle connection in a Go or Rust gateway, so 100,000 connections is about 4GB spread over the tier, and 20,000 connections per instance means 5 instances plus headroom. The resumable state is small — request id, the tokens already emitted, and a monotonic sequence number — perhaps 4KB per active generation, so 100,000 of them is 400MB in Redis with a 5-minute TTL. Crucially the KV cache, which is the expensive state, stays on the GPU node and is not what we replicate.',
      architecture:
        'Browser holds an SSE connection to an edge gateway. The gateway is a pure relay: it owns the socket and a small ring buffer of recent tokens, and forwards a bidirectional cancel signal upstream. Behind it, the inference router pins a generation to one engine replica; tokens flow replica to router to gateway to browser, each hop unbuffered and flushed per event, and every event carries an incrementing sequence id. The gateway also appends each token to a per-generation Redis list with a short TTL. On reconnect the client sends Last-Event-ID and the gateway replays from Redis, then reattaches to the live stream — so a three-second drop costs a replay of about 75 tokens from Redis, not a regeneration. Client disconnect propagates as a cancel to the engine, which frees the KV blocks immediately; that is the single highest-leverage piece of this design. Idle-timeout killers are defeated by a heartbeat comment event every 15 seconds and by explicitly disabling proxy buffering on the response.',
      evaluate:
        'End-to-end latency is meaningless for a stream, so I measure the shape: time to first token p95, inter-token latency p95 and p99 measured at the client rather than at the server, and the standard deviation of inter-token gaps, because a stream that averages 40ms but stalls for 900ms mid-sentence feels broken while the average looks fine. Buffering by an intermediary is detected by exactly that signature — tokens arriving in bursts of 30 with long gaps — so I alert on burstiness, defined as the ratio of p99 to median inter-token gap, and I run a synthetic canary through the real CDN path that emits a token per 100ms and asserts arrival spacing.',
      deploy:
        'The gateway drains rather than restarts: on SIGTERM it stops accepting new streams, keeps existing ones for up to 120 seconds, and the load balancer stops routing to it. Anything still running at the deadline is cut, and because clients resume by Last-Event-ID against Redis and can reattach through a different gateway instance, a cut is a hiccup rather than a lost answer. Backpressure: if a client reads slower than the model produces, the gateway ring buffer fills; I do not slow the GPU down for one slow reader, because the sequence is holding KV cache and finishing it fast is what frees memory. Instead the generation completes into Redis and the client drains at its own pace. That is a deliberate choice to convert a slow-consumer problem into a small storage cost.',
      wrapup:
        'The dominant cost is not the streaming tier — 5 to 8 CPU instances is rounding error next to GPUs — it is the GPU time spent on abandoned generations, which is why cancel propagation matters more than any other feature here. If the product could tolerate non-streaming responses the design collapses to a request-response API with a queue, we would batch far more aggressively for maybe 2x the throughput per GPU, and we would lose the perceived-latency win that makes chat feel fast. That trade is exactly the reason streaming exists.',
      numbers: [
        '100,000 concurrent streams x 40KB per connection = about 4GB across the tier; at 20,000 connections per instance that is 5 instances, so run 8 for headroom and zone redundancy.',
        'A 600-token answer at 25 tokens/s = 24 seconds of connection life; 100,000 concurrent / 24s means about 4,200 new generations started per second at steady state.',
        'Resume state: 4KB per generation x 100,000 = 400MB in Redis at a 5-minute TTL, versus the 2.5GiB of KV cache per 8K session that stays pinned on the GPU.',
        'Abandonment: at an assumed 8 percent tab-close rate mid-generation, cancel propagation reclaims about 8 percent of decode capacity, worth roughly the same 8 percent of the GPU bill.',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 6, apiAndData: 6, architecture: 12, deepDive: 11, wrapUp: 4 },
      opening:
        'I want to treat this as a long-lived-connection problem with a cancel path, because the expensive thing being streamed is GPU time, and the highest-value feature is noticing when nobody is listening any more.',
      traps: [
        'Forgetting cancellation. An abandoned stream that keeps decoding holds KV cache and burns GPU for nothing; at scale this is a double-digit percentage of the bill and it is the first thing a serving interviewer looks for.',
        'Buffering somewhere in the path. A CDN or nginx with default buffering silently converts your stream into a slow request-response, and you will not see it in average latency.',
        'Quoting end-to-end latency as the SLO. For a stream the shape matters: a 900ms stall mid-sentence is the failure users report, and it hides inside a healthy average.',
        'Making the streaming gateway stateful with in-memory session data, so a deploy or an instance loss ends every live generation.',
      ],
      whenPushed: [
        {
          challenge: 'Why SSE and not WebSocket?',
          answer:
            'The data flow is one-directional, so WebSocket buys me nothing except a second protocol to operate. SSE rides plain HTTP/2, survives corporate proxies that break upgrades, and gives me Last-Event-ID reconnection for free. I would move to WebSocket only if the product added live voice or client-side interruption that needed a real duplex channel.',
        },
        {
          challenge: 'Redis for the resume buffer is a lot of moving parts for a three-second drop.',
          answer:
            'It is, and the alternative is sticky sessions to the gateway that started the stream, which works until you deploy. I chose the buffer because it also makes gateway drains free and lets a client reattach through a different instance. If mobile reconnection rates turned out to be under a percent I would drop it and regenerate.',
        },
      ],
    },
    diagram: `flowchart TD
  B["Browser (EventSource)"] -->|SSE + Last-Event-ID| GW["Edge gateway (relay, ring buffer)"]
  GW -->|heartbeat every 15s| B
  GW --> RT["Inference router"]
  RT -->|pinned generation| ENG["Engine replica"]
  ENG -->|token + seq id| GW
  GW -->|append, 5 min TTL| RD[("Redis resume buffer")]
  RD -->|replay from seq id| GW
  B -.->|tab closed| GW
  GW -.->|cancel| ENG
  ENG -.->|free KV blocks| KV[("Paged KV cache")]
  GW -->|ITL p99, gap burstiness| OBS["Client-side stream metrics"]`,
  },
  {
    id: 'aisdq-kv-cache-and-long-context',
    patternId: 'aisdp-llm-serving',
    title: 'Design KV cache management for long-context serving',
    companies: ['google', 'amazon'],
    minutes: 45,
    steps: {
      define: [
        'What context length must we support, and what fraction of requests actually use it?',
        'Is the long context a fresh document each time, or a conversation that grows turn by turn?',
        'What is the latency budget for turn 20 of a conversation versus turn 1?',
      ],
      data: [
        'Compute the KV cache cost of a 128K-token context and compare it with the weight memory.',
        'What fraction of tokens across the fleet are re-prefilled repeatedly rather than being new?',
      ],
      architecture: [
        'How do you avoid re-prefilling the shared prefix of every conversation turn?',
        'What do you do when there is no HBM left and a request must still be admitted?',
        'How does offloading KV to host memory or NVMe change the latency picture, and when is it worth it?',
      ],
      evaluate: [
        'What is your cache hit rate metric, and what does a low one tell you about routing?',
        'How do you show that eviction policy changes helped, rather than just moved the pain?',
      ],
      deploy: [
        'How do you roll out a change to eviction policy safely?',
        'What is the failure mode when the prefix cache is corrupted or stale?',
      ],
      wrapup: [
        'What is the marginal cost of doubling supported context length?',
        'Which is cheaper for a long conversation: keeping the KV cache alive or recomputing it?',
      ],
    },
    solution: {
      define:
        'Support 128K context, but design for the reality that under 3 percent of requests exceed 16K while those few dominate memory. The dominant long-context shape is conversational growth, not a fresh document: turn 20 of a chat re-sends everything from turns 1 to 19, so the same tokens are prefilled again and again. Latency budget is flat by design — turn 20 must not have a visibly worse time to first token than turn 1 — and that goal alone forces prefix caching, because naive re-prefill grows TTFT linearly with conversation length.',
      data:
        'At 320KiB per token (2 x 80 layers x 8 KV heads x 128 dim x 2 bytes), a 128K context holds 40GiB of KV cache for one sequence. That is more than a quarter of the 140GB of weights, for a single user. Put differently: one 128K session costs the same HBM as 16 eight-thousand-token sessions, so the pricing and the scheduler both have to treat it as such. On the reuse side, in a chat workload with an average of 8 turns and a system prompt of 900 tokens, roughly 60 to 80 percent of prefill tokens across the fleet are tokens the node has already seen, which is the entire case for prefix caching.',
      architecture:
        'KV is allocated in fixed 16-token pages so nothing needs contiguity, and pages are keyed by the hash of the token prefix that produced them, which makes them shareable: every request carrying the same system prompt maps onto the same physical pages, and a conversation turn reuses every page up to the new user message. The router becomes prefix-aware — it hashes the first N tokens and prefers the replica that already holds those pages, which turns a routing decision into a cache-hit decision. When HBM runs out the scheduler has three moves in order: stop admitting new sequences, preempt the newest long sequence by evicting its pages and recomputing later, and only then offload. Offloading KV to host memory over PCIe at roughly 25GB/s means a 40GiB context takes about 1.6 seconds to bring back, which is worse than recomputing many short contexts but far better than recomputing a 128K prefill, so the rule is: offload only sequences above roughly 32K tokens, recompute below that. NVMe offload I would not do at all for interactive traffic.',
      evaluate:
        'The metric is cached-prefill-token ratio: prefill tokens served from existing pages over total prefill tokens. Below about 40 percent in a chat workload, the problem is almost always routing, not cache size — requests from one conversation are landing on different replicas — and the fix is sticky prefix-aware routing, not more memory. I separate two more numbers: preemption rate per thousand requests, and recompute tokens caused by eviction, because a policy change that lowers preemptions while tripling recompute has moved the cost, not removed it. Any eviction policy change is judged on total GPU-seconds per completed request, which is the only metric that cannot be gamed by moving work around.',
      deploy:
        'Eviction policy is a scheduler parameter, not a binary, so it rolls out per replica: 5 percent of replicas get the new policy, and I compare GPU-seconds per completed request and inter-token p99 against the control replicas for 24 hours. That works because replicas are interchangeable and traffic is randomised, which is a rare luxury on this kind of change. Cache correctness is the scary failure: a hash collision or a stale page would silently produce a wrong answer with no error, so pages are keyed by the full token-sequence hash plus the model version and the adapter id, and I verify the stored token ids on hit rather than trusting the hash alone. Cache is dropped entirely on model version change; serving a new model from an old model KV is a silent corruption, and I would rather pay the cold prefill.',
      wrapup:
        'Doubling context from 64K to 128K does not double cost, it roughly halves concurrency for those sequences and, because attention over the cache is read every decode step, it also slows each step for that sequence — so the marginal cost is superlinear in practice and should be priced that way. For a long conversation, keeping the KV alive between turns is cheaper than recomputing only if the user comes back quickly: 40GiB held for a 30-second think-time is 40GiB nobody else can use, so the crossover is a short idle timeout, on the order of 60 seconds, after which eviction and later recompute wins. Out of scope for v1: attention-sink or sliding-window compression schemes, which cut cache size at a quality cost I would want measured before shipping.',
      numbers: [
        '128K tokens x 320KiB per token = 40GiB of KV for one sequence, against 140GB of weights — one long-context user costs the HBM of 16 eight-thousand-token users.',
        'Prefix reuse: a 900-token system prompt across an 8-turn conversation means the first turn prefills 900 new tokens and turns 2-8 reuse them, so 60-80 percent of fleet prefill tokens are cacheable.',
        'Offload cost: 40GiB over PCIe Gen5 at an assumed 25GB/s = 1.6s to restore, versus re-prefilling 128K tokens at 2 x 70e9 x 131,072 = 1.8e16 FLOPs, about 11 seconds at 1.6 PFLOP/s — so offload wins above roughly 32K tokens.',
        'Decode slowdown: KV read per step for a 128K sequence is 40GiB / 3.35TB/s = 12ms on top of the 10.4ms weight read, so a long-context user decodes at roughly half the speed of a short-context one.',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 8, apiAndData: 5, architecture: 12, deepDive: 10, wrapUp: 4 },
      opening:
        'Let me start by pricing a 128K context in HBM, because I think the answer — about 40 gigabytes for one user — reframes long context as a memory-scheduling problem rather than a model capability question.',
      traps: [
        'Treating context length as a model property rather than a capacity decision. Supporting 128K is a scheduler and pricing choice; the model config is the easy part.',
        'Forgetting that KV is read every decode step, so a long context is not just memory, it is a permanent per-step bandwidth tax on that sequence.',
        'Proposing NVMe KV offload for interactive traffic without doing the bandwidth arithmetic that shows it is slower than recomputing.',
        'Sharing prefix cache pages without keying on model version and adapter id, which turns a cache into a silent-wrong-answer generator.',
      ],
      whenPushed: [
        {
          challenge: 'Why not just use a model with a smaller KV footprint?',
          answer:
            'That is the right first move and I assumed it: grouped-query attention with 8 KV heads instead of 64 is already an 8x reduction over multi-head, which is why my per-token figure is 320KiB and not 2.5MB. Beyond that, multi-head latent attention or sliding-window attention cut further, but they change model architecture, so it is a training-time decision I cannot make at serving time.',
        },
        {
          challenge: 'Prefix-aware routing breaks your load balancing.',
          answer:
            'It does, and I bound it: the router prefers a cache-hit replica only while that replica is under about 80 percent KV occupancy, then falls back to least-loaded and eats the cold prefill. That gives up some hit rate to avoid hot-spotting one replica with a popular system prompt, and I would tune that threshold on the GPU-seconds-per-request metric.',
        },
      ],
    },
    diagram: `flowchart TD
  REQ["Request (system prompt + 19 prior turns)"] --> H["Hash token prefix"]
  H --> RTR["Prefix-aware router"]
  RTR -->|hit and occupancy < 80%| RA["Replica holding those pages"]
  RTR -->|miss or hot replica| RB["Least-loaded replica"]
  RA --> LOOK["Page table lookup: 16-token pages"]
  LOOK -->|hit| REUSE["Reuse pages, prefill only new tokens"]
  LOOK -->|miss| FULL["Prefill new pages"]
  REUSE --> DEC["Decode: read full KV each step"]
  FULL --> DEC
  DEC --> HBM[("HBM paged KV pool")]
  HBM -->|pressure: newest, > 32K tokens| OFF[("Host memory offload, 25GB/s")]
  HBM -->|pressure: short sequences| EVICT["Preempt and recompute later"]
  HBM -->|model version change| DROP["Drop all pages"]`,
  },
]

/**
 * Pattern 2 — AI gateway. One policy door in front of every model: routing by cost and
 * difficulty, budget enforcement, provider failover, and caching that is semantic rather
 * than exact.
 */
const gatewayQuestions: AiSdQuestion[] = [
  {
    id: 'aisdq-org-llm-gateway',
    patternId: 'aisdp-ai-gateway',
    title: 'Design an org-wide LLM gateway',
    companies: ['amazon', 'microsoft', 'google'],
    minutes: 60,
    steps: {
      define: [
        'Who are the users of this gateway — product teams, internal tools, or both — and what does it own that a team must not do itself?',
        'Is it a thin proxy or does it enforce policy, and what specifically is the policy?',
        'What latency overhead is acceptable given every LLM call already takes seconds?',
      ],
      data: [
        'What must be logged per request, and how do you square that with prompts containing customer data?',
        'How do you count tokens and cost per team when every provider tokenises differently?',
        'Where do quotas and budgets live so that fifty gateway pods agree on the balance?',
      ],
      architecture: [
        'Draw the request path through the gateway and name every decision point.',
        'How do you present one API over providers with different schemas, streaming formats and tool-call conventions?',
        'How do keys work: does the gateway hold provider credentials, and what does that buy and cost?',
        'How do you enforce a budget without turning a finance control into an outage?',
      ],
      evaluate: [
        'How do you know the gateway is not degrading quality, given it now sits between every request and every model?',
        'What would tell you that a team is being throttled unfairly rather than legitimately?',
      ],
      deploy: [
        'How do you add a new provider or model without a code deploy for every consuming team?',
        'What happens to in-flight streams when the gateway deploys?',
      ],
      wrapup: [
        'What is the one number that justifies the gateway existing?',
        'What did you deliberately keep out of the gateway, and why?',
      ],
    },
    solution: {
      define:
        'Users are every internal product team plus a handful of batch pipelines. The gateway owns four things teams must not do themselves: provider credentials, spend attribution and limits, safety and PII policy, and the audit log. It deliberately does not own prompts, retrieval, or agent logic — the moment it does, it becomes a shared bottleneck that every team queues behind for changes. Latency overhead budget is 20ms p99, which is generous only because the downstream call is 2 to 30 seconds; I still hold it, because a gateway that adds 200ms is a gateway teams route around.',
      data:
        'Per request I log a metadata record always — team, model, token counts, latency, cost, cache disposition, policy verdicts, trace id — and the prompt and completion bodies only under a per-team retention policy, stored in a separate encrypted bucket with a default 30-day TTL and a PII scrubbing pass on write. That split matters: the metadata is cheap, permanent, and safe to query fleet-wide, while bodies are expensive, sensitive, and rarely needed outside incident response. Cost accounting cannot rely on provider tokenisers agreeing, so I record the provider-reported usage from the response as the billing source of truth, and use a local tokeniser estimate only for the pre-flight budget check. Quotas live in Redis as per-team counters with a local pre-check in each pod, so the common case never leaves the process and only near-limit teams pay a round trip.',
      architecture:
        'Stateless gateway pods behind an L4 balancer. Path per request: authenticate the calling service and resolve its team; check the budget pre-check; apply input policy (PII detection, prompt-injection heuristics for tool-enabled calls); consult the semantic cache; route to a model; translate the request into the provider schema; call it with a per-provider timeout and retry budget; translate the streaming response back into our one canonical event format; meter usage; write metadata plus a trace. Provider abstraction is a normalised schema with an explicit capability matrix — which models support tool calls, JSON mode, vision, a 200K context — and a request naming an unsupported capability fails loudly at the gateway rather than being silently downgraded, because a silent downgrade is a quality incident with no error. Credentials sit only in the gateway, backed by a KMS-encrypted store with rotation, which is the single biggest security win: no product repo ever holds a provider key. Budget enforcement is tiered rather than binary: at 80 percent of a team monthly budget, warn; at 100 percent, downgrade that team to the cheap model tier and keep serving; at 120 percent, reject non-interactive traffic only. A hard cutoff for interactive traffic is available but must be opted into by the team, because I will not let a finance control take down a customer-facing product without someone choosing that.',
      evaluate:
        'The gateway is in the path of everything, so its own quality risk is invisible failure: a silent capability downgrade, a bad cache hit, a failover to a weaker model. I make each of those visible as a first-class metric — downgrade rate, cache-hit rate with a sampled human audit of hits, and failover minutes per provider — and I attach the disposition to every response as a header so a team debugging bad output can see they were served from cache or from a fallback model. Quality regression detection is a scheduled canary: a fixed set of 300 prompts per model route, replayed hourly, judged, and alerted on a drop, which catches a provider silently changing a model behind a stable name. Throttling fairness is measured as rejected requests per team over that team quota share, so a team hitting limits with 10 percent of the quota and 40 percent of the traffic is a quota-allocation conversation, not a bug.',
      deploy:
        'Model and provider registration is configuration, not code: a model entry declares provider, endpoint, capability flags, price per million input and output tokens, and rate limits, and is pushed to pods through a config service with atomic swap. That means adding a provider takes minutes and consuming teams change nothing, which is the whole point of the abstraction. Gateway deploys drain over 120 seconds so in-flight streams finish; anything longer is cut, and clients retry idempotently using a client-supplied request id that the gateway dedupes for 10 minutes, so a retry after a partial stream does not double-bill. Policy changes ship in shadow mode first — evaluated and logged but not enforced — for 48 hours, because a policy rule that fires on 4 percent of production traffic will look reasonable in review and be a catastrophe live.',
      wrapup:
        'The justifying number is blended cost per thousand requests, tracked monthly against the counterfactual of every request hitting the frontier model, and the gateway usually pays for itself several times over through routing and caching alone. Second-order and harder to price: one place to rotate a leaked key, and one audit log when compliance asks what customer data went to which vendor. Kept deliberately out: prompt templates, RAG, and agent orchestration. Those belong to teams, they change weekly, and putting them in a shared proxy makes the proxy the critical path for every product change.',
      numbers: [
        'Blended cost: at an assumed 3 and 15 USD per million input and output tokens for the frontier model and 0.15 and 0.60 for the small one, routing 70 percent of traffic to the small model gives a blended output cost of 0.7 x 0.60 + 0.3 x 15 = 4.92 USD per million, about a 3x saving.',
        'Overhead budget: 20ms of gateway p99 against a 4-second median completion is 0.5 percent of end-to-end latency, which is the argument for doing policy in-process and only touching Redis when a team is near its limit.',
        'Logging: 10M requests/day x 2KB of metadata = 20GB/day retained 13 months for audit, versus bodies at an assumed 8KB average = 80GB/day, which is why bodies get a 30-day TTL and metadata does not.',
        'Quota check: a local pre-check absorbs the roughly 99 percent of requests that are nowhere near their limit, so Redis sees about 100K checks/day rather than 10M.',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 7, apiAndData: 10, architecture: 15, deepDive: 15, wrapUp: 5 },
      opening:
        'I will scope this as a policy-enforcing proxy rather than a thin pass-through, and I want to be explicit early about the line between what the gateway owns and what stays with product teams, because that line is what stops it becoming an organisational bottleneck.',
      traps: [
        'Making budget enforcement a hard cutoff. A finance control that takes a customer-facing feature offline at 3am is a worse incident than the overspend; say tiered degradation and let hard cutoff be opt-in.',
        'Silently downgrading a request whose model does not support the requested capability. That is a quality regression with a 200 response, which is the exact failure mode this whole bank is about.',
        'Putting prompts and RAG logic into the gateway. It sounds like reuse; it makes every product change queue behind a shared-service deploy.',
        'Logging full prompt bodies fleet-wide with the same retention as metadata, and only discovering at the compliance review that you built a customer-data lake by accident.',
      ],
      whenPushed: [
        {
          challenge: 'Is this not just an API gateway with a different name?',
          answer:
            'The transport concerns are the same and I would reuse an Envoy-style data plane for them. What is genuinely different is that the unit of cost is tokens rather than requests, so metering must read a response body; capabilities differ per model, so routing is semantic rather than by path; and the failure mode is a degraded answer rather than a 5xx, so quality monitoring is part of the proxy rather than a downstream concern.',
        },
        {
          challenge: 'You have created a single point of failure for every AI feature in the company.',
          answer:
            'Yes, and I treat it like the front door it is: stateless pods across three zones, config pushed rather than pulled at request time, fail-open on quota and on the semantic cache, and a documented break-glass path where a team can use a direct provider key held in their own secret store for the duration of an incident. What I will not do is let the audit log be optional, so break-glass calls are logged by policy and reviewed after.',
        },
        {
          challenge: 'How do you handle a provider deprecating a model with 30 days notice?',
          answer:
            'The capability matrix and the alias layer are what make that survivable: teams call an alias like chat-default, not a versioned provider model name. I pin the alias to the new model in a canary ring, run the 300-prompt hourly canary plus a judge comparison against the old one, and promote if it holds. Teams that pinned an exact model get a deprecation notice with the diff report from that same canary.',
        },
      ],
    },
    diagram: `flowchart TD
  APP["Product service"] -->|canonical schema| GW["Gateway pod (stateless)"]
  GW --> AUTH["AuthN + team resolution"]
  AUTH --> BUD["Budget pre-check (local, Redis on near-limit)"]
  BUD --> POL["Input policy: PII, injection heuristics"]
  POL --> SC[("Semantic cache")]
  SC -->|miss| RT["Router: capability + cost + difficulty"]
  RT --> AD1["Provider A adapter"]
  RT --> AD2["Provider B adapter"]
  RT --> SELF["Self-hosted engine pool"]
  AD1 -->|normalised stream| GW
  AD2 -->|failover| GW
  GW --> MET["Metering: provider-reported usage"]
  MET --> LEDG[("Cost ledger per team")]
  GW -->|metadata 13 months| AUD[("Audit log")]
  GW -.->|bodies, 30-day TTL, scrubbed| BODY[("Encrypted body store")]
  CFG[("Model registry: capability, price, limits")] --> RT
  CANARY["Hourly 300-prompt canary"] --> RT`,
  },
  {
    id: 'aisdq-cost-aware-model-router',
    patternId: 'aisdp-ai-gateway',
    title: 'Design a cost-aware model router',
    companies: ['google', 'amazon'],
    minutes: 45,
    steps: {
      define: [
        'What are we optimising: cost at fixed quality, quality at fixed cost, or latency?',
        'What quality loss is the business willing to accept for what saving, stated as a number?',
        'Which requests are never eligible for the cheap model, and who decides that?',
      ],
      data: [
        'What signal tells you a request is easy before you have answered it?',
        'Where does the training data for a difficulty classifier come from, and what is the label?',
        'What does the cost distribution across requests look like, and where is the money actually going?',
      ],
      architecture: [
        'How does the router decide, and how much latency can that decision itself afford?',
        'What is the cascade option — try small, escalate on low confidence — and when does it beat a upfront classifier?',
        'How do you handle a router that is confidently wrong?',
      ],
      evaluate: [
        'How do you measure the quality cost of routing, given the counterfactual answer does not exist?',
        'What online metric would catch the router degrading without any error rate change?',
      ],
      deploy: [
        'How do you roll out a routing policy change safely?',
        'How does the router adapt when a new, cheaper model appears?',
      ],
      wrapup: [
        'What saving would you claim, and what would you be honest about giving up?',
        'When is routing the wrong answer entirely?',
      ],
    },
    solution:
      {
        define:
          'Optimise cost at bounded quality loss, and make the bound explicit: no more than a 1 percent drop in the task success rate for a target 60 percent cut in blended token cost. Stating it as a number is the point, because without it the router is tuned by whoever last complained. Never eligible for the cheap tier: anything with a tool-call or structured-output contract that the small model fails more often, anything from an enterprise tier that pays for the frontier model, and anything flagged sensitive. Those exclusions are policy set by the product owner, encoded as request attributes, not inferred by the router.',
        data:
          'The pre-answer difficulty signals that actually work are cheap and boring: prompt length, presence of code or tables, number of constraints or questions in the prompt, whether tools are enabled, conversation turn depth, and retrieval-context length. The label comes from a shadow-run harvest — run both models on 50,000 sampled production requests, have a judge decide whether the small answer is as good as the large one, and train a small classifier on that binary label. That is expensive once and cheap forever. The cost distribution is always skewed: in a typical chat workload the top decile of requests by output length is 40 to 60 percent of spend, so the highest-value routing decisions are on long outputs, not on the many short ones.',
        architecture:
          'Two mechanisms, used for different traffic. For latency-sensitive interactive traffic, an upfront classifier — a distilled encoder of a few tens of millions of parameters, running in about 5ms on CPU — emits a probability that the small model suffices, and routes above a threshold. For latency-tolerant traffic, a cascade is strictly better: run the small model, have it emit a self-assessed confidence or check the answer against a cheap verifier, and escalate to the large model on failure. The cascade costs one wasted small-model call on escalation, which at a 20x price ratio is 5 percent overhead, and it is far more accurate than predicting difficulty blind. So: cascade where a second round trip fits the budget, classifier where it does not. A confidently wrong router is bounded by making escalation available after the fact — the client can request a retry at the higher tier, and a thumbs-down automatically re-runs at the frontier model and shows the better answer, which converts a routing error into a recoverable experience rather than a silent one.',
        evaluate:
          'The counterfactual does not exist online, so I buy it on a sample: 2 percent of routed-to-small requests are shadow-run on the large model and judged pairwise, which gives a continuous, unbiased estimate of the quality gap for about 2 percent extra cost on that slice. That number — small-model win-or-tie rate — is the routing SLO, and the threshold is tuned to hold it above the agreed bound. Online, the metrics that catch silent degradation are behavioural rather than error-based: regeneration rate, thumbs-down rate, conversation abandonment, and follow-up-message rate, all segmented by which model served the turn. If regeneration rate on small-model turns rises 20 percent while error rate is flat, the router has drifted, and that is exactly the failure that has no exception to alert on.',
        deploy:
          'Routing policy changes go out as an A/B on traffic, not a global flip, because the metric that matters is behavioural and needs a control arm. New threshold to 10 percent of traffic, watch the shadow-judge gap and the regeneration rate for a week, then ramp. Rollback is a config value. When a new cheaper model appears it enters as a third tier in shadow: it is scored on the harvested pairwise dataset offline first, and only if it beats the current small model at equal or lower price does it take that slot — and the difficulty classifier is retrained on labels regenerated against it, because a classifier trained against the old small model is measuring the wrong boundary.',
        wrapup:
          'I would claim a 60 to 70 percent cut in blended token cost with a measured win-or-tie rate above 97 percent on routed traffic, and I would be honest that the loss is concentrated rather than uniform: the small model is not slightly worse everywhere, it is much worse on a narrow band of hard requests, and some users will meet that band repeatedly. Routing is the wrong answer when the price ratio between tiers is small — under about 4x, the complexity and the escalation overhead eat the saving — or when the workload is uniformly hard, where you are just adding a classifier that always says no.',
        numbers: [
          'Cascade overhead: at a 20x price ratio, escalating 30 percent of traffic after a small-model attempt wastes 0.3 x (1/20) = 1.5 percent of frontier cost, which is why cascade beats upfront classification whenever the extra round trip fits the latency budget.',
          'Blended saving: 70 percent of traffic at 0.60 USD/M output and 30 percent at 15 USD/M gives 4.92 USD/M against 15 USD/M — a 67 percent cut before caching.',
          'Classifier budget: a distilled encoder at about 5ms on CPU against a 4-second median completion is 0.1 percent of latency, so the routing decision is free in latency terms and its only real cost is being wrong.',
          'Shadow-judge cost: shadow-running 2 percent of small-routed traffic on the frontier model plus a judge call adds roughly 2 percent x 20x = 40 percent of the small-tier cost on that slice, or under 1 percent of total spend, to buy a continuous quality estimate.',
        ],
      },
    delivery: {
      budget: { requirements: 6, estimates: 7, apiAndData: 7, architecture: 11, deepDive: 10, wrapUp: 4 },
      opening:
        'I want to fix the acceptable quality loss as a number before I design anything, because a router without a stated quality bound is just a cost-cutting knob that someone will turn too far.',
      traps: [
        'Treating routing as an optimisation rather than an architectural decision. It changes which model answers a user, so it needs a quality SLO and a rollout plan, not a config tweak.',
        'Predicting difficulty from the prompt alone when a cascade is available. Running the cheap model and checking its answer is far more accurate than guessing beforehand, and at a 20x price ratio the wasted call is noise.',
        'Having no way to measure the counterfactual. If you cannot say what the large model would have answered, you cannot claim the routing is safe; a small shadow sample buys exactly that.',
        'Alerting on error rate. Routing failures produce fluent, wrong-tier answers with 200 responses; the signal is behavioural — regeneration, thumbs-down, abandonment — segmented by tier.',
      ],
      whenPushed: [
        {
          challenge: 'Why not let users pick the model themselves?',
          answer:
            'For a developer API, I would, and I do expose the tiers. For an end-user product, model choice is an implementation detail most users cannot reason about, and exposing it moves the cost decision to the person with no cost information. I would rather route automatically and give users a one-click try again with the better model, which is the same escape hatch with none of the upfront confusion.',
        },
        {
          challenge: 'Your classifier will be stale within a month.',
          answer:
            'It will, because both models change under it. That is why the harvest pipeline is permanent rather than a one-off: 2 percent shadow sampling continuously produces fresh pairwise labels, the classifier retrains weekly on the trailing window, and any model swap on either tier invalidates and regenerates the label set before the new model takes traffic.',
        },
      ],
    },
    diagram: `flowchart TD
  REQ["Request + policy attributes"] --> ELIG{"Eligible for cheap tier?"}
  ELIG -->|no: tools, enterprise, sensitive| BIG["Frontier model"]
  ELIG -->|yes, latency-tolerant| CASC["Cascade: small model first"]
  ELIG -->|yes, latency-sensitive| CLF["Difficulty classifier (5ms CPU)"]
  CASC --> VER{"Verifier / self-confidence"}
  VER -->|pass| OUT["Response"]
  VER -->|fail| BIG
  CLF -->|p(small suffices) > threshold| SMALL["Small model"]
  CLF -->|below threshold| BIG
  SMALL --> OUT
  BIG --> OUT
  SMALL -->|2% sample| SHADOW["Shadow-run frontier + pairwise judge"]
  SHADOW --> GAP[("Win-or-tie rate = routing SLO")]
  OUT -->|regen, thumbs-down, abandonment by tier| BEH["Behavioural monitors"]
  GAP --> TUNE["Threshold tuning / weekly retrain"]
  BEH --> TUNE
  TUNE --> CLF`,
  },
  {
    id: 'aisdq-semantic-cache',
    patternId: 'aisdp-ai-gateway',
    title: 'Design a semantic cache for LLM responses',
    companies: ['amazon', 'microsoft'],
    minutes: 45,
    steps: {
      define: [
        'What kind of traffic is actually repetitive here, and what fraction do you expect to be cacheable at all?',
        'What is the cost of a wrong hit — serving an answer to a question that only looked the same?',
        'Is the cache shared across users, and what does that imply immediately?',
      ],
      data: [
        'What is the cache key: the raw prompt, the embedded prompt, or something normalised first?',
        'How much does it cost to embed every request, and does that eat the saving?',
        'What must be part of the key besides the text?',
      ],
      architecture: [
        'Draw the lookup path and say where the latency goes.',
        'How do you pick the similarity threshold, and what does moving it do in each direction?',
        'How do you cache a streaming response, and what does the user experience on a hit?',
      ],
      evaluate: [
        'How do you measure hit quality rather than hit rate?',
        'What tells you the threshold has drifted into serving wrong answers?',
      ],
      deploy: [
        'How do you invalidate when the underlying knowledge changes?',
        'How do you roll out a threshold change without a week of bad answers?',
      ],
      wrapup: [
        'What saving is realistic, and what would make you turn this off?',
        'When is exact-match caching the better engineering decision?',
      ],
    },
    solution: {
      define:
        'Repetitive traffic is real but narrower than people assume: support and FAQ-style questions, documentation Q and A, and internal tools where a hundred people ask the same thing after a launch. In open-ended chat, expect 10 to 25 percent cacheable at a safe threshold; in a support bot over a fixed knowledge base, 40 percent or more. The cost of a wrong hit is the thing that sets the design: it is not a stale page, it is a confidently wrong answer attributed to your product with no error anywhere. So I bias the threshold tight and treat hit rate as the thing to maximise subject to a hard constraint on wrong-hit rate. Cross-user sharing is allowed only for prompts that carry no user-specific context — the moment retrieval or profile data is in the prompt, the cache key is per-user or the cache is a data leak.',
      data:
        'Key on a normalised prompt: strip whitespace, lowercase, drop trailing punctuation, then embed. Normalisation alone converts a surprising share of near-duplicates into exact matches, so I run an exact-hash lookup first and only fall through to the vector search — the exact tier is microseconds and catches maybe half of all hits for free. Embedding cost is negligible against generation: at an assumed 0.02 USD per million embedding tokens, embedding a 200-token prompt costs 0.000004 USD against a generation costing perhaps 0.005 USD, three orders of magnitude apart. The key must include, besides the text: model id and version, temperature and other decoding parameters, system prompt hash, tool set hash, tenant id, and the language or locale. Omitting model version is the classic bug that serves last quarter model answers after an upgrade.',
      architecture:
        'Two-tier lookup in front of the router. Tier one is a Redis exact-hash get on the normalised prompt plus key attributes, about 1ms. Tier two is an ANN search over prompt embeddings in a vector store, top-5 at about 5 to 10ms, followed by a cheap verification step: for candidates above the similarity floor, a cross-encoder or a small-model yes/no check on whether the two questions ask the same thing. That verification is what makes an aggressive threshold safe, and it costs a few milliseconds and a fraction of a cent against a generation that costs a hundred times more. Stored value is the full completion plus its token counts and the trace id of the original generation. On a hit, a streaming client is fed the cached text with artificial pacing rather than dumped in one chunk, because an instant full response reads as a different product and users notice; I pace it fast, around 100 tokens per second, so it feels like a quick answer rather than a cache.',
      evaluate:
        'Hit rate is the vanity metric; hit quality is the real one. I sample 1 percent of hits, regenerate the answer fresh, and have a judge decide whether the cached answer was an acceptable response to the new question — that gives a continuous wrong-hit rate, and my constraint is that it stays under 0.5 percent. Threshold drift shows up there first, and also in a behavioural signal: regeneration rate on cache-hit responses compared with cache-miss responses. If users retry cached answers twice as often as fresh ones, the cache is serving near-misses regardless of what the similarity number says. Every response carries a cache-hit header and the original trace id, so a bad answer report can be traced back to the generation that produced it, which is otherwise impossible.',
      deploy:
        'Invalidation is by tag, not by time alone. Entries are tagged with the knowledge-source ids that fed them, so re-indexing a document purges every cached answer derived from it; a default TTL of 24 hours to 7 days backstops anything untagged. Model version change invalidates wholesale, since it is part of the key. Threshold changes ship in shadow first: for a week the candidate threshold is evaluated on live traffic and logged as would-have-hit, and those would-be hits are scored by the same sampled judge — so I know the wrong-hit rate of the new threshold before a single user sees it. That is cheap and it is the difference between a tuning change and a week of subtly wrong answers.',
      wrapup:
        'Realistic saving in a support workload is 30 to 45 percent of generation spend plus a large latency win — a hit is 15ms against a 4-second generation, which is the part users actually feel. I would turn it off if the sampled wrong-hit rate could not be held under 0.5 percent, or if the workload turned out to be genuinely open-ended, where you pay embedding and lookup on every request for a 3 percent hit rate. Exact-match caching is the better engineering decision whenever prompts are machine-generated — templated classification, extraction pipelines, evaluation harnesses — because those repeat byte-for-byte, and the exact tier gives you the whole benefit with none of the wrong-hit risk.',
      numbers: [
        'Embedding overhead: 200 prompt tokens at an assumed 0.02 USD per million = 4e-6 USD, against a generation at roughly 5e-3 USD — about 0.1 percent, so the cache is worth attempting even at a 5 percent hit rate.',
        'Latency: 1ms exact lookup plus 8ms ANN plus 5ms verification = about 14ms on a hit, against a 4-second generation, so a hit is roughly 300x faster.',
        'Saving: at a 35 percent hit rate on 10M requests/day and 5e-3 USD per generation, the cache avoids 3.5M x 5e-3 = 17,500 USD/day of generation spend.',
        'Wrong-hit budget: sampling 1 percent of 3.5M daily hits gives 35,000 judged samples/day, enough to detect a move from 0.3 to 0.5 percent wrong-hit rate within hours rather than weeks.',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 6, apiAndData: 8, architecture: 11, deepDive: 10, wrapUp: 4 },
      opening:
        'The interesting constraint here is not hit rate, it is the cost of a wrong hit, so let me design for a hard bound on wrong hits and treat hit rate as what I maximise underneath it.',
      traps: [
        'Leaving model version, decoding parameters and tenant out of the cache key. Each omission is a silent-wrong-answer generator, and the model-version one bites on every upgrade.',
        'Trusting cosine similarity alone at an aggressive threshold. A cheap verification step on the top candidates is what lets you loosen the threshold safely.',
        'Sharing a cache across users when prompts carry retrieved or profile context. That is not a cache bug, it is a data leak.',
        'Reporting hit rate as success. Without a sampled wrong-hit measurement you have no idea whether you are saving money or quietly degrading the product.',
      ],
      whenPushed: [
        {
          challenge: 'Users hate getting an identical answer to a slightly different question.',
          answer:
            'That is the wrong-hit rate and it is why I bound it explicitly rather than tuning for hit rate. The verification step exists for exactly this, and the escape hatch is the same as for routing: cached responses carry a header, a regenerate action bypasses the cache, and a thumbs-down invalidates that entry immediately rather than waiting for the TTL.',
        },
        {
          challenge: 'Why not cache at the retrieval layer instead?',
          answer:
            'Often that is better, and I would do both. Caching retrieval results is safe — you are caching a document set, not an assertion — and it removes the vector search cost while leaving generation free to adapt to the exact question. The generation cache is where the real money is, but it carries all the wrong-hit risk, so it gets the tight threshold and the verifier.',
        },
      ],
    },
    diagram: `flowchart TD
  REQ["Request"] --> NORM["Normalise: whitespace, case, punctuation"]
  NORM --> KEY["Key = text + model version + params + system hash + tenant"]
  KEY --> EX[("Tier 1: Redis exact hash, ~1ms")]
  EX -->|hit| PACE["Replay cached tokens at ~100 tok/s"]
  EX -->|miss| EMB["Embed prompt (~4e-6 USD)"]
  EMB --> ANN[("Tier 2: vector store, top-5, ~8ms")]
  ANN -->|above floor| VERIF["Verifier: same question? (~5ms)"]
  VERIF -->|yes| PACE
  VERIF -->|no| GEN["Router to model"]
  ANN -->|below floor| GEN
  GEN --> STORE["Store completion + source tags + trace id"]
  STORE --> EX
  PACE -->|1% sample| AUDIT["Regenerate + judge = wrong-hit rate"]
  DOC["Document re-indexed"] -.->|tag purge| STORE
  AUDIT -->|> 0.5%| THRESH["Tighten threshold"]`,
  },
  {
    id: 'aisdq-provider-failover',
    patternId: 'aisdp-ai-gateway',
    title: 'Design multi-provider failover for LLM calls',
    companies: ['microsoft', 'amazon'],
    minutes: 45,
    steps: {
      define: [
        'What are we failing over from: a hard outage, elevated latency, or rate-limit rejections?',
        'What availability target justifies the complexity of a second provider?',
        'Is a degraded answer from a fallback model acceptable, and who decides?',
      ],
      data: [
        'What per-provider health signals do you collect, and over what window?',
        'What differs between providers that the request and response translation must absorb?',
      ],
      architecture: [
        'How do you detect an unhealthy provider fast without flapping on a single slow request?',
        'What is the retry policy, and how do you avoid making an overloaded provider worse?',
        'How do you fail over mid-stream when 200 tokens have already reached the user?',
      ],
      evaluate: [
        'How do you know the fallback path works when it has not been exercised in six months?',
        'How do you measure the quality difference between primary and fallback?',
      ],
      deploy: [
        'How do you test failover in production without causing an incident?',
        'What is the runbook when both providers are degraded?',
      ],
      wrapup: [
        'What availability do you actually achieve, and what does it cost?',
        'When would you not bother with multi-provider failover?',
      ],
    },
    solution: {
      define:
        'Three distinct failure modes, and they need different responses: a hard outage where the endpoint returns 5xx or refuses connections, elevated latency where requests still succeed at 30 seconds, and rate-limit rejection where the provider is healthy but we have exceeded quota. Only the first two are failover; the third is a capacity problem and failing over on it just moves an overload to the fallback. The target is 99.9 percent availability for the AI feature, given a single provider realistically offering 99.5 percent — that gap is the entire justification. A degraded answer from the fallback is acceptable for interactive chat and not acceptable for structured extraction with a strict schema, so eligibility is per-route and set by the product owner, not global.',
      data:
        'Per provider and per model I keep a rolling 60-second window of success rate, p50 and p95 latency, time-to-first-token, and rate-limit rejection rate, plus a slower 24-hour window used for the quality comparison rather than health. Translation must absorb more than schema: different tokenisers, so token counts and cost differ for the same text; different tool-call formats and different reliability at emitting them; different refusal behaviour, so a prompt that is answered by one provider is refused by another; different max output lengths; and different streaming chunk semantics. The refusal difference is the one that surprises people — a failover can turn a working feature into a wall of policy refusals with a perfectly healthy 200 rate.',
      architecture:
        'A per-provider circuit breaker on the rolling window: open when the error rate over the last 60 seconds exceeds 20 percent with a minimum of 20 requests, which stops a single slow request from flapping the breaker. Half-open after 30 seconds by sending 1 percent of traffic as probes. Alongside it, a latency-based shed: if p95 time-to-first-token exceeds twice its trailing baseline, start routing a fraction to the fallback rather than waiting for outright failures, because a provider at 40 seconds is functionally down for an interactive product. Retries are strictly budgeted — at most one retry, with jitter, and only on connection errors or 5xx, never on 429, and a global retry budget capped at 10 percent of traffic so we cannot retry a struggling provider into a deeper hole. Mid-stream failover is the honest hard part: once tokens have reached the user you cannot silently swap models, because the second half of the answer will not follow from the first. My rule is a cutover point — before the first token, failover is transparent; after it, we finish or fail, and the client shows a regenerate affordance. Pretending otherwise produces incoherent answers, which is worse than an error.',
      evaluate:
        'An untested failover path is a quality incident waiting for an outage, so it gets exercised continuously rather than in a drill: 1 percent of eligible traffic goes to the fallback provider permanently, which keeps the code path warm, keeps the credentials valid, and — more valuable — produces a live, continuous quality comparison. Those two arms are judged pairwise weekly, giving a current answer to how much worse the fallback is, per route. Without that 1 percent I would be discovering the answer during an incident. I also run a synthetic every 5 minutes against each provider, including a tool-call and a JSON-mode request, because capability regressions do not show up in a plain completion probe.',
      deploy:
        'Failover is tested in production by forcing the breaker open on one provider for a 15-minute window in a low-traffic period, on a schedule, and watching that the quality and latency metrics stay inside bounds. That is a game day with a config flag rather than a spreadsheet exercise. When both providers are degraded, the runbook is explicit and ordered: shed non-interactive traffic first (batch, background enrichment), then downgrade interactive traffic to the self-hosted small model even though quality drops sharply, then finally serve a graceful degradation — the product falls back to non-AI behaviour such as plain search results with a banner. Having that last tier designed in advance is what turns a vendor outage into a degraded feature rather than a broken page.',
      wrapup:
        'Two providers at an assumed 99.5 percent each, with genuinely independent failures, gives 99.9975 percent in theory; in practice correlated failures and our own routing bugs put the achieved number nearer 99.9 percent, which I would claim and no more. The cost is real: two integrations to maintain, a permanent 1 percent quality tax on the shadow arm, and a doubled surface for prompt-behaviour drift. I would not bother when the feature is internal and can tolerate an hour of downtime, or when the provider is the same company as the cloud you already depend on, since the failure domains are not independent and you are buying an illusion.',
      numbers: [
        'Availability: 99.5 percent per provider means about 3.6 hours of downtime per month each; two independent providers with working failover cut the exposed window to the detection-and-cutover time, roughly 60 seconds per event.',
        'Breaker sensitivity: 20 percent error rate over a 60-second window with a 20-request minimum means a provider taking 500 RPS trips in about 12 seconds, while a route taking 1 RPS needs 20 seconds of failures before acting.',
        'Retry budget: capping retries at 10 percent of traffic means an outage adds at most 1.1x load to the surviving provider from retries, not the 2x a naive per-request retry would send.',
        'Shadow cost: 1 percent of traffic on the fallback plus a weekly pairwise judge run on a few thousand pairs is well under 1 percent of spend, and it is the only thing that makes the failover quality number current.',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 6, apiAndData: 7, architecture: 12, deepDive: 10, wrapUp: 4 },
      opening:
        'I want to separate three failure modes first — hard outage, latency degradation, and rate limiting — because only two of them should trigger failover and conflating them makes an overload worse.',
      traps: [
        'Failing over on 429s. The provider is healthy; you are over quota, and moving that load onto a fallback just spreads an overload you caused.',
        'Claiming transparent mid-stream failover. Once tokens have been shown, switching models produces an incoherent answer; define a cutover point and be honest about it.',
        'Never exercising the fallback. An untested path has expired credentials, a stale schema and unmeasured quality, and you find all three during the outage.',
        'Ignoring that the fallback model refuses, formats and tool-calls differently, so a successful failover can still break the feature with a 200 response.',
      ],
      whenPushed: [
        {
          challenge: 'Why not just self-host so you do not depend on a provider at all?',
          answer:
            'For the small tier I do, and it is my last-resort degradation tier. For frontier quality, self-hosting means buying and operating a large GPU fleet sized for peak, which is a much bigger reliability project than a second API integration — you have simply moved the failure domain to yourself. I would self-host when volume makes the unit economics obviously favourable or when data residency forbids the vendor.',
        },
        {
          challenge: 'The 1 percent shadow traffic gets worse answers for no reason.',
          answer:
            'It is not for no reason, but you are right that it is a real cost paid by real users, so I restrict it to routes where the product owner has agreed the fallback is acceptable, and I exclude enterprise tiers. What I get is a current quality number and a warm path. The alternative — synthetic-only testing — tells me the endpoint answers, not that it answers well.',
        },
      ],
    },
    diagram: `flowchart TD
  REQ["Request (route eligibility flag)"] --> HC{"Primary breaker state"}
  HC -->|closed| P1["Provider A"]
  HC -->|open| P2["Provider B (fallback)"]
  HC -->|half-open, 1% probes| P1
  REQ -->|permanent 1% shadow arm| P2
  P1 -->|success, latency, 429 rate| WIN[("Rolling 60s window")]
  P2 --> WIN
  WIN -->|error rate > 20%, n >= 20| HC
  WIN -->|TTFT p95 > 2x baseline| SHED["Partial shed to fallback"]
  P1 -->|first token sent| CUT{"Cutover point passed?"}
  CUT -->|no| P2
  CUT -->|yes| FAIL["Finish or fail + regenerate affordance"]
  P2 -.->|both degraded| DEG["Shed batch, then small self-hosted model, then non-AI fallback"]
  P1 --> JUDGE["Weekly pairwise judge: primary vs fallback"]
  P2 --> JUDGE
  SYN["5-minute synthetic: completion, tool call, JSON mode"] --> WIN`,
  },
]

export const aiSdQuestions: AiSdQuestion[] = [...servingQuestions, ...gatewayQuestions]
