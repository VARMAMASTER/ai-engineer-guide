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

export const aiSdQuestions: AiSdQuestion[] = [...servingQuestions]
