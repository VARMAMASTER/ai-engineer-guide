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

/**
 * Pattern 3 — RAG platforms. Grounding generation in a corpus, where the hard parts are
 * chunking, hybrid retrieval, access control that survives approximate search, and keeping
 * the index fresh without serving a mix of embedding-model versions.
 */
const ragQuestions: AiSdQuestion[] = [
  {
    id: 'aisdq-chat-with-your-documents',
    patternId: 'aisdp-rag-platform',
    title: 'Design chat-with-your-documents',
    companies: ['google', 'microsoft', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What does a good answer look like here — a synthesis, an extraction, or a pointer to the right page?',
        'Is the user asking about one document they just uploaded, or a corpus they have accumulated?',
        'What is the honest failure mode we are designing against: no answer, or a confident wrong one?',
      ],
      data: [
        'How do you chunk a PDF with tables, headers and multi-column layout, and what breaks if you split naively?',
        'Size the index: how many chunks, how many bytes per vector, and how much memory does that need?',
        'What metadata travels with each chunk, and what is it for?',
      ],
      architecture: [
        'Draw the ingestion pipeline and the query pipeline separately, and say where they meet.',
        'Why hybrid retrieval rather than pure vector search, and how do you merge the two ranked lists?',
        'Where does a reranker go, what does it buy, and what does it cost?',
        'How do you construct the final prompt, and what do you do when the retrieved context does not fit?',
      ],
      evaluate: [
        'How do you separate a retrieval failure from a generation failure when the answer is wrong?',
        'What eval set would you build first, and how do you get labels for it?',
        'How do you measure and reduce ungrounded claims in the answer?',
      ],
      deploy: [
        'How do you ship a new embedding model when every existing vector is in the old space?',
        'What does the user see while a 400-page document is still being indexed?',
      ],
      wrapup: [
        'What is the cost per question, broken into retrieval and generation?',
        'What is the first thing you would improve after launch, and how would you know?',
      ],
    },
    solution: {
      define:
        'A good answer is a synthesis with citations that a user can click to verify — the citation is not a nicety, it is the mechanism that makes a wrong answer recoverable instead of authoritative. The workload is a personal or team corpus that grows: tens to thousands of documents per workspace, queried repeatedly. The failure mode I design against explicitly is the confident wrong answer built from a plausible-but-irrelevant chunk, because no-answer is visible and self-correcting while a hallucinated synthesis is not. That drives two decisions early: retrieval must be able to return nothing, and the generator must be instructed and evaluated on refusing when the context does not support an answer.',
      data:
        'Chunking is the highest-leverage decision in the whole system and naive fixed-size splitting is where most implementations lose their quality. I parse to a structured document first — a layout model that recovers reading order, headings and table boundaries — then chunk on structure: a chunk is a section or a table, split further at roughly 512 tokens with 64 tokens of overlap only when a section is longer. Tables are serialised as markdown and never split mid-table, because half a table is worse than no table. Each chunk carries a synthesised header — document title, section path, page number — prepended before embedding, which recovers the context a small chunk otherwise loses. Metadata per chunk: document id, version, page, section path, ACL ids, source timestamp, and the parser version. Index sizing for a large workspace tier: 50M documents at an average 2,000 tokens is roughly 4.5 chunks each, about 225M chunks; at 1,024 dimensions in float32 that is 4KB per vector or 900GB, which is why I store int8-quantised vectors at 1KB each, 225GB, plus about 57GB of HNSW graph links — a number that fits across a handful of memory-optimised nodes rather than a fleet.',
      architecture:
        'Two pipelines. Ingestion: upload to object storage, virus and type check, layout parse, structural chunk, embed in batches, write to the vector index and to a BM25 index in the same transaction-ish flow, then mark the document ready. It is a queue-driven worker pool because a 400-page PDF takes minutes and must not block anything. Query: embed the question, run dense ANN top-50 and BM25 top-50 in parallel, merge with reciprocal rank fusion, rerank the fused top-100 with a cross-encoder down to the top 5 to 8, build the prompt, generate with citations, stream. Hybrid rather than pure vector because the two fail on opposite queries: dense retrieval misses exact identifiers, product codes, error strings and rare proper nouns, which is precisely what users paste in; BM25 misses paraphrase. Reciprocal rank fusion is chosen over score normalisation because the two scores are not commensurable and RRF needs no tuning per corpus. The reranker earns its 50 to 300ms by lifting precision at 5 substantially — the generator only sees 5 chunks and one irrelevant chunk in that window measurably increases ungrounded claims. When context does not fit, I do not truncate silently: I drop the lowest-ranked chunks, keep whole chunks rather than fragments, and record how many were dropped as a metric, because chronic dropping means the chunk size or the top-k is wrong.',
      evaluate:
        'Separating retrieval from generation failure requires two metrics, not one. Retrieval: recall at k against a labelled set of question-to-gold-chunk pairs — if the gold chunk is not in the retrieved set, the generator never had a chance and no prompt engineering will fix it. Generation: groundedness, measured by decomposing the answer into atomic claims and checking each against the retrieved context with a judge, plus citation precision, the fraction of citations that actually support the sentence they are attached to. The first eval set comes from the corpus itself: sample 300 chunks, have a model generate a question each chunk uniquely answers, human-review to drop the bad ones, and you have gold pairs for retrieval in a day. Real user questions replace them over the first month, harvested from logs with thumbs and click-through on citations as weak labels. Ungrounded claims come down through the reranker, through instructing the generator to answer only from context and to say when it cannot, and through a post-generation groundedness check on a sampled slice that alerts when the rate rises.',
      deploy:
        'A new embedding model means every vector is in the wrong space, and you cannot mix spaces in one index — cosine similarity across two embedding models is meaningless, not merely noisy. So: build a second index offline, backfill it fully, evaluate it on the gold pairs, then cut over per workspace behind a flag with both indexes live for a fortnight. Backfilling 225M chunks at an assumed 0.02 USD per million embedding tokens costs about 2,300 USD in embedding spend and a day or two of throughput, which is a manageable one-off and should be budgeted at design time rather than discovered later. During indexing the user sees per-document progress and can query what is ready — partial availability with an explicit banner is much better than a spinner, but the banner is essential, because otherwise the user reads a gap in the corpus as a wrong answer.',
      wrapup:
        'Cost per question: embedding the query is negligible, ANN plus BM25 plus fusion is a few milliseconds of CPU, the cross-encoder rerank of 100 candidates is the real retrieval cost at perhaps 0.0002 USD, and generation over about 4,000 tokens of context dominates at roughly 0.012 USD input plus output. So generation is 95 percent-plus of the bill and the lever is context size, not retrieval. First improvement after launch would be query rewriting — resolving pronouns and follow-ups against conversation history before retrieval — because the single most common production failure is a follow-up question that retrieves nothing, and I would know from the recall-at-k metric segmented by conversation turn depth.',
      numbers: [
        'Index size: 50M docs x 4.5 chunks = 225M chunks; at 1,024 dims int8 that is 225GB of vectors plus about 57GB of HNSW links (32 neighbours x 8 bytes), against 900GB if stored as float32.',
        'Backfill cost: 225M chunks x 512 tokens = 115B tokens; at an assumed 0.02 USD per million that is about 2,300 USD to re-embed the corpus for a model migration.',
        'Query latency budget: 10ms query embed + 15ms ANN + 10ms BM25 + 5ms fusion + 120ms cross-encoder rerank = about 160ms before the first generation token, inside a 800ms TTFT budget.',
        'Cost per question: about 4,000 context tokens at an assumed 3 USD per million input = 0.012 USD, versus roughly 0.0002 USD for reranking, so generation is over 95 percent of unit cost and context length is the lever.',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 8, apiAndData: 10, architecture: 15, deepDive: 14, wrapUp: 5 },
      opening:
        'I want to spend real time on chunking and on the retrieval-versus-generation split in evaluation, because in my experience those two decide whether a RAG system is good, and everything else is plumbing.',
      traps: [
        'Fixed-size chunking with no document structure. Splitting a table in half or cutting a section header off its content quietly caps your ceiling, and no amount of prompt work recovers it.',
        'Pure vector search. Users paste error codes, SKUs and proper nouns, and dense retrieval is systematically bad at exactly those; hybrid with rank fusion is the default, not an enhancement.',
        'One quality metric. If you cannot say whether a wrong answer was a retrieval miss or a generation failure, you cannot fix either, and the interviewer will ask which one it was.',
        'Hand-waving the embedding-model migration. Vectors from two models are not comparable, so the migration is a full backfill with a dual-index cutover, and it costs real money you should have sized.',
      ],
      whenPushed: [
        {
          challenge: 'Long-context models make RAG unnecessary — just put the documents in the prompt.',
          answer:
            'For a single 50-page document, I agree and I would skip retrieval entirely. It stops working on cost and latency well before it stops working on capability: a 200K-token context at an assumed 3 USD per million is 0.60 USD per question, fifty times my RAG cost, and it adds seconds of prefill. It also degrades on retrieval-in-the-middle for a large corpus. So I use long context as the fallback for small corpora and retrieval for large ones, which is a size threshold rather than a philosophy.',
        },
        {
          challenge: 'Your reranker adds 120ms to every query.',
          answer:
            'It does, and I pay it because precision at 5 is what the generator actually consumes — one irrelevant chunk in five measurably raises ungrounded claims. If the latency budget tightened I would shrink the rerank candidate set from 100 to 30 before I would remove the reranker, and I would measure the recall loss from that on the gold pairs rather than guessing.',
        },
        {
          challenge: 'How do you stop it answering from its own knowledge rather than the documents?',
          answer:
            'Instruction alone is not enough, so I measure it: the groundedness check decomposes the answer into claims and verifies each against the retrieved chunks, and a claim with no supporting chunk is a violation regardless of whether it happens to be true. Sampled continuously, that gives a rate I can alert on, and citations give the user the means to catch the ones that slip through.',
        },
      ],
    },
    diagram: `flowchart TD
  UP["Upload"] --> OBJ[("Object store")]
  OBJ --> Q["Ingest queue"]
  Q --> PARSE["Layout parse: reading order, headings, tables"]
  PARSE --> CH["Structural chunking, 512 tok, 64 overlap, header prepended"]
  CH --> EMB["Embed (batched)"]
  EMB --> VEC[("Vector index: 225M x int8 + HNSW")]
  CH --> BM[("BM25 index")]
  CH --> META[("Chunk metadata: doc, page, ACL, parser version")]
  QRY["User question"] --> QE["Embed query"]
  QE --> VEC
  QRY --> BM
  VEC -->|top 50| RRF["Reciprocal rank fusion"]
  BM -->|top 50| RRF
  RRF -->|top 100| RR["Cross-encoder rerank (~120ms)"]
  RR -->|top 5-8| PROMPT["Prompt build + citation slots"]
  PROMPT --> GEN["Generator (streamed)"]
  GEN --> ANS["Answer with clickable citations"]
  ANS -->|sampled| GRD["Claim decomposition + groundedness judge"]
  GOLD[("Gold question-chunk pairs")] --> RECALL["recall@k"]`,
  },
  {
    id: 'aisdq-enterprise-search-acl',
    patternId: 'aisdp-rag-platform',
    title: 'Design enterprise search with per-user access control',
    companies: ['microsoft', 'google', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What is the security requirement, stated precisely: must a user never see a snippet, or never see a document, or never learn a document exists?',
        'What systems are we searching over, and who owns permissions in each of them?',
        'How stale is an acceptable permission, in seconds?',
      ],
      data: [
        'How do you model permissions when the sources have groups, nested groups, sharing links and inheritance?',
        'How many ACL entries per document should you expect, and what does that do to your filter?',
        'What is the permission-change event volume, and can you keep up with it?',
      ],
      architecture: [
        'Where in the retrieval path do you enforce access control, and what does each choice cost?',
        'What happens to ANN recall when you pre-filter to a user who can see 0.1 percent of the corpus?',
        'How do you stop the answer itself from leaking content the user cannot see?',
      ],
      evaluate: [
        'How do you test that access control is correct, given the failure is silent and catastrophic?',
        'How do you measure quality separately for a user with broad access and one with narrow access?',
      ],
      deploy: [
        'How do you handle a permission revocation that must take effect immediately?',
        'How do you re-index after a bulk permission change across a hundred thousand documents?',
      ],
      wrapup: [
        'What is the residual risk you are accepting, and how would you explain it to a security reviewer?',
        'What would you build differently if the requirement were existence-hiding rather than content-hiding?',
      ],
    },
    solution: {
      define:
        'The precise requirement matters enormously and I would pin it before designing: content-hiding, where a user never sees text or a snippet from a document they cannot access, is achievable at reasonable cost; existence-hiding, where a user cannot infer the document exists, is much stricter and rules out several optimisations including shared caches and result counts. I design for content-hiding with best-effort existence-hiding, and I say that out loud to the security reviewer rather than implying more. Sources are the usual enterprise set — a document store, a wiki, a ticket system, chat — each owning its own permission model, and none of them agreeing on what a group is. Permission staleness target: under 60 seconds for a grant, and effectively zero for a revoke, which is an asymmetry I will build for explicitly.',
      data:
        'I normalise every source into a principal graph: users, groups, and group-of-group edges, resolved to a flattened principal set per user at query time and cached for a short TTL. Each document carries an allow-list of principal ids after inheritance is resolved at index time, which is what makes query-time filtering a set-membership test rather than a graph traversal. Expect a heavy tail: most documents have 1 to 5 ACL entries, but the inherited-from-a-large-folder case produces documents with thousands, so the ACL field is stored as a sorted id list with a bloom-style prefilter rather than inline in the vector payload. Permission change volume in a 50,000-person org is on the order of 100K events per day with bursts of millions during a reorg or a bulk share, so the ingestion path must be able to absorb a bulk re-permission without falling behind on new content — separate queues with separate priorities.',
      architecture:
        'Access control is enforced in three places, deliberately redundant. First, pre-filter: the ANN query carries the user flattened principal set and the index does filtered search. Second, post-filter: every candidate is re-checked against the authoritative ACL store before it reaches the reranker, which catches index staleness. Third, at answer time: the generator only ever sees chunks that passed both, and citations are re-validated on click. The pre-filter is where the interesting engineering is, because filtered ANN degrades badly when the filter is selective: HNSW traversal visits neighbours that fail the filter and either returns too few results or explodes the search-effort parameter. For users with broad access, inline filtering during graph traversal works fine. For narrow access — a contractor who can see 0.1 percent of the corpus — I switch strategy to partition-based search: documents are sharded into index partitions by their dominant ACL group, so a narrow user searches only the two or three partitions they can see, exhaustively if needed, which is both faster and exact. Choosing between the two based on the user selectivity estimate is the design decision I would defend hardest here. Post-filtering alone I reject: it silently returns three results where the user deserved fifty.',
      evaluate:
        'Access-control correctness is not something you sample, because a 0.1 percent leak rate is a breach. So it gets a deterministic test: a synthetic corpus with a known permission matrix, and a test suite that asserts for every (user, document) pair with no access that the document never appears in results, never appears in a citation, and never contributes a token to an answer, including through the semantic cache. That runs on every deploy. In production I run a continuous canary with probe users at known permission levels against known probe documents. Quality is measured separately by access breadth, because a narrow-access user has a genuinely harder retrieval problem — fewer relevant documents exist — and a fleet-wide recall number is dominated by broad-access users and hides that entirely. So: recall at k reported by access-breadth decile.',
      deploy:
        'Revocation must be immediate, and the index cannot be, so revocation is handled at the post-filter against the authoritative ACL store, which is read on every query for the candidate set only — a few hundred key lookups, cheap and always current. Index updates for revocation follow asynchronously. Grants can be slower and go through the normal indexing path. A bulk permission change across a hundred thousand documents is a re-permission job, not a re-embedding job, and separating those two is what makes it survivable: the vectors do not change, only the ACL field, so it is a metadata update at index-write throughput rather than an embedding backfill. It runs on a lower-priority queue with its own rate limit so it cannot starve fresh-content indexing. Caches — semantic cache, retrieval cache — are keyed by the user principal set hash, so a permission change naturally invalidates them.',
      wrapup:
        'Residual risk I would state plainly to a reviewer: between a revocation and the index update, the document is excluded by post-filter but a timing observer could in principle infer existence from latency; snippets are generated only from post-filtered chunks so content does not leak; and the biggest real risk is not the retrieval path at all but an over-permissive ACL inherited from a source system, which we faithfully reproduce. If the requirement were true existence-hiding, I would drop shared caching entirely, return no result counts, pad latency to a constant, and partition indexes hard by security boundary rather than by dominant group, accepting a significant cost and quality loss for it.',
      numbers: [
        'ACL fan-out: at a median of 4 principals per document and a tail of thousands, a 50M-document corpus holds roughly 250M ACL edges — a sorted-id list per document, not a join at query time.',
        'Narrow-access selectivity: a user seeing 0.1 percent of 225M chunks has 225K candidates; inline-filtered HNSW would visit roughly 1,000 rejected neighbours per accepted one, which is why partitioned exhaustive search over 2-3 partitions wins below about 1 percent selectivity.',
        'Post-filter cost: re-checking 100 reranker candidates against the ACL store is 100 key lookups at about 0.5ms batched, roughly 0.3 percent of the query budget, and it is what makes immediate revocation possible.',
        'Bulk re-permission: 100K documents as metadata-only updates at an assumed 5K writes/s is 20 seconds, against re-embedding the same documents at 450K chunks x 512 tokens which would be hours and about 5 USD of embedding spend.',
      ],
    },
    delivery: {
      budget: { requirements: 9, estimates: 7, apiAndData: 10, architecture: 15, deepDive: 14, wrapUp: 5 },
      opening:
        'I want to pin down whether the requirement is content-hiding or existence-hiding first, because those are different systems and it is the only question in this design where getting it wrong is a breach rather than a bug.',
      traps: [
        'Post-filtering only. It is fast and it is correct, and it silently returns three results to a narrow-access user who deserved fifty, so your quality looks fine in aggregate and is terrible for exactly the users who complain.',
        'Assuming filtered ANN just works. HNSW recall collapses as the filter gets selective, and if you cannot describe what happens at 0.1 percent selectivity you have not built one.',
        'Treating permission changes as re-indexing. Vectors do not change when an ACL does, and conflating the two turns a 20-second metadata job into an hours-long embedding backfill.',
        'Sampling for access-control correctness. A leak is not a quality metric with a tolerable rate; it needs a deterministic permission-matrix test in CI.',
      ],
      whenPushed: [
        {
          challenge: 'Why not just build one index per user?',
          answer:
            'It is exactly correct and completely unaffordable: in a 50,000-person org with heavily overlapping access you would store the same chunk thousands of times. Partitioning by dominant ACL group is the compromise — it gets most of the exactness benefit for narrow users at a small multiple of storage, and I fall back to filtered search for the broad-access majority.',
        },
        {
          challenge: 'Your semantic cache leaks across users.',
          answer:
            'It would if I keyed it on the question alone, which is why the key includes a hash of the user resolved principal set. That crushes hit rate for a personalised corpus, and I accept that: a cross-user cache over permissioned content is a data-leak mechanism wearing a performance costume. I keep caching at the embedding layer, where the vector depends on the question only.',
        },
      ],
    },
    diagram: `flowchart TD
  SRC1["Doc store"] --> NORM["Normalise to principal graph + inherited ACLs"]
  SRC2["Wiki"] --> NORM
  SRC3["Tickets"] --> NORM
  NORM --> IDX["Index writer"]
  IDX --> P1[("Partition: group A dominant")]
  IDX --> P2[("Partition: group B dominant")]
  IDX --> ACL[("Authoritative ACL store")]
  U["User query"] --> RES["Resolve flattened principal set (short TTL cache)"]
  RES --> SEL{"Access selectivity"}
  SEL -->|broad, > 1%| FANN["Filtered HNSW across partitions"]
  SEL -->|narrow, < 1%| PART["Exhaustive search, visible partitions only"]
  FANN --> CAND["Candidates"]
  PART --> CAND
  CAND --> POST["Post-filter against ACL store (immediate revocation)"]
  POST --> RR["Rerank"]
  RR --> GEN["Generate with citations"]
  GEN --> CLICK["Citation re-validated on click"]
  PERM["Permission change event"] -->|revoke: instant| ACL
  PERM -->|bulk: low-priority metadata queue| IDX
  MATRIX["Permission-matrix test suite"] --> POST`,
  },
  {
    id: 'aisdq-multi-tenant-knowledge-base',
    patternId: 'aisdp-rag-platform',
    title: 'Design a multi-tenant knowledge base for a SaaS product',
    companies: ['amazon', 'microsoft'],
    minutes: 45,
    steps: {
      define: [
        'How many tenants, and what does the distribution of corpus size across them look like?',
        'What isolation guarantee do you owe: logical separation, or physically separate storage?',
        'What is the onboarding experience — how long from first upload to first useful answer?',
      ],
      data: [
        'Do you use one index for everyone with a tenant filter, an index per tenant, or something between?',
        'What does the smallest tenant cost you when idle, and what does the largest cost at peak?',
      ],
      architecture: [
        'How do you keep one large tenant from degrading query latency for everyone else?',
        'How do you handle a tenant with 5 documents and a tenant with 5 million in the same system?',
        'What is shared across tenants and what must never be?',
      ],
      evaluate: [
        'How do you evaluate quality per tenant when each corpus is different?',
        'What signals tell you a specific tenant is getting bad answers before they file a ticket?',
      ],
      deploy: [
        'How do you migrate one tenant to a new embedding model without touching the others?',
        'How does a tenant delete their data, and how do you prove it is gone?',
      ],
      wrapup: [
        'What is the marginal cost of a new tenant, and does the pricing model match it?',
        'Where does this architecture break, and at what tenant count?',
      ],
    },
    solution: {
      define:
        'Assume 5,000 tenants with a brutal power law: the top 20 hold more documents than the remaining 4,980 combined, and the median tenant has under 500 documents. That distribution, not the total, is what dictates the architecture. Isolation: logical separation with a tenant id on every row and enforced at a data-access layer, plus physically separate namespaces for the enterprise tier that pays for it — I would not promise physical separation to everyone, because it makes the small-tenant economics impossible and most customers are buying the assurance, not the topology. Onboarding target is a useful answer within 5 minutes of the first upload, which means indexing must be incremental and queryable before completion.',
      data:
        'Three storage tiers rather than one decision. Small tenants — under about 100K chunks — share a pooled index with a tenant-id filter, because a dedicated index has a fixed memory and process overhead that dwarfs their data. Medium tenants get a dedicated namespace inside a shared cluster. Large tenants get their own index, and above a threshold their own nodes. A tenant is promoted between tiers automatically on chunk count and query rate, and promotion is an offline re-index into the new tier followed by a pointer flip. Idle cost of the smallest tenant is then genuinely near zero — a few thousand vectors inside a pooled index, some object storage, and a row in a control-plane database — while the largest is priced on dedicated capacity.',
      architecture:
        'A control plane holds the tenant registry: tier, index location, embedding model version, quota, and feature flags. The query path resolves tenant to index location, so the routing logic is identical across tiers and only the target changes. Noisy-neighbour protection is per-tier: in the pooled index, per-tenant query concurrency limits and a per-tenant token bucket on retrieval, because one tenant running a bulk backfill of questions can saturate the shared node otherwise; ingestion is a separate worker pool with per-tenant fair queueing so a tenant uploading 5 million documents does not delay another tenant first upload — that is the single most damaging noisy-neighbour failure, because it hits onboarding. What is shared: the embedding service, the reranker, the generator pool, the parsing workers, and the control plane. What must never be shared: any cache keyed on content, any index without a tenant filter enforced below the application layer, and any log stream containing document text.',
      evaluate:
        'Per-tenant quality needs per-tenant ground truth, which nobody will hand-label, so I generate it: at onboarding, sample chunks from the tenant corpus and synthesise question-to-gold-chunk pairs, giving a recall-at-k number for that specific corpus within an hour of ingestion and a regression baseline forever after. It is imperfect — synthetic questions are easier than real ones — but it is comparable over time, which is what matters for detecting a regression. Real signals that a tenant is unhappy before the ticket: rising rate of answers where retrieval returned nothing above the score floor, rising rate of the generator declining to answer, falling citation click-through, and rising query reformulation within a session. Those four, per tenant, with a threshold relative to that tenant own trailing baseline rather than a global one, because a tenant with a thin corpus starts from a worse absolute number and always will.',
      deploy:
        'Per-tenant embedding migration is exactly why the model version lives in the tenant registry rather than in global config. Migration is: build the new index for that tenant, run their synthetic gold set against both, compare recall, flip the pointer, keep the old index for seven days. Tenants migrate in waves starting with the smallest, and a tenant can be pinned if their evaluation regresses, which is a situation a global rollout would have made invisible. Deletion is a legal requirement, not a feature, so it is designed for: object-store originals, chunk rows, vectors, BM25 postings, caches, and traces are all tagged with tenant id, deletion is a control-plane job that fans out to every store with per-store confirmation, and it emits a certificate listing rows removed per store. Proving it is gone means a post-deletion scan that asserts zero rows for that tenant id across every store, run as part of the job rather than on request.',
      wrapup:
        'Marginal cost of a new small tenant is dominated by embedding their corpus once — 500 documents at 4.5 chunks and 512 tokens is about 1.15M tokens, roughly 0.02 USD at an assumed 0.02 USD per million — plus a few megabytes of storage. That is essentially free, which is why a per-seat or per-question pricing model works and a per-tenant infrastructure fee does not. The architecture breaks on control-plane fan-out: at around 50,000 tenants, per-tenant index metadata, per-tenant eval runs and per-tenant migration waves become an operations load of their own, and the fix at that point is to stop treating tenants as individually managed objects and move to a fully pooled index with hard per-tenant partitioning inside it.',
      numbers: [
        'Tenant distribution: 5,000 tenants where the median holds 500 docs (about 2,250 chunks) and the top 20 hold millions — pooled indexing for the median, dedicated nodes for the top, because a dedicated index per median tenant wastes more memory in overhead than it stores.',
        'Onboarding cost: 500 docs x 4.5 chunks x 512 tokens = 1.15M tokens, about 0.02 USD at an assumed 0.02 USD per million, so a free trial tenant costs cents to index.',
        'Noisy neighbour: one tenant issuing 200 QPS of bulk queries against a pooled node sized for 500 QPS consumes 40 percent of it, which is why the per-tenant token bucket is set at roughly 10 percent of node capacity by default.',
        'Deletion proof: a fan-out delete across 6 stores with a post-scan asserting zero rows per store, run inline, converts a compliance promise into a job with an artefact.',
      ],
    },
    delivery: {
      budget: { requirements: 7, estimates: 6, apiAndData: 8, architecture: 11, deepDive: 9, wrapUp: 4 },
      opening:
        'The shape of the tenant size distribution decides this design, so let me assume a power law up front — a median tenant with a few hundred documents and a handful with millions — and build three tiers rather than one.',
      traps: [
        'One index per tenant for everyone. The fixed overhead per index dwarfs a median tenant data, and at a few thousand tenants you are paying for empty containers.',
        'Enforcing tenant isolation in application code only. It needs to be below the application layer, or the one query someone writes without the filter is your breach.',
        'Letting ingestion share a queue across tenants. A tenant bulk-loading five million documents delays another tenant first upload, which is the worst possible time to be slow.',
        'A single global embedding-model version. It makes migration all-or-nothing, when the safe path is per-tenant waves with a per-tenant evaluation gate.',
      ],
      whenPushed: [
        {
          challenge: 'Enterprise customers will demand their own database.',
          answer:
            'Some will, and I sell that as a tier rather than arguing. The registry already abstracts index location, so a dedicated cluster or even a customer-managed region is a registry entry rather than a fork of the product. What I refuse is promising it by default, because the pooled tier is what makes the median tenant profitable.',
        },
        {
          challenge: 'Your synthetic eval sets are not real questions.',
          answer:
            'Correct, and they overstate absolute quality — synthetic questions are drawn from the chunk that answers them, so recall looks better than it is. Their value is as a fixed baseline per tenant for detecting regressions, which is a different job from measuring quality. Real questions from logs replace them progressively once a tenant has traffic.',
        },
      ],
    },
    diagram: `flowchart TD
  CP[("Control plane: tier, index location, model version, quota")] --> RTR["Query router"]
  UP["Tenant upload"] --> FQ["Ingestion pool, per-tenant fair queue"]
  FQ --> EMB["Shared embedding service"]
  EMB --> TIER{"Tenant tier"}
  TIER -->|small| POOL[("Pooled index + tenant filter")]
  TIER -->|medium| NS[("Dedicated namespace, shared cluster")]
  TIER -->|large| DED[("Dedicated index and nodes")]
  Q["Tenant query"] --> RTR
  RTR --> TB["Per-tenant token bucket"]
  TB --> POOL
  TB --> NS
  TB --> DED
  POOL --> RR["Shared reranker"]
  NS --> RR
  DED --> RR
  RR --> GEN["Shared generator pool"]
  GEN --> OUT["Answer"]
  SYN["Synthetic gold pairs per tenant"] --> BASE[("Per-tenant recall baseline")]
  OUT -->|no-hit rate, decline rate, citation CTR| BASE
  DEL["Delete tenant"] -->|fan-out + post-scan certificate| POOL`,
  },
  {
    id: 'aisdq-index-freshness',
    patternId: 'aisdp-rag-platform',
    title: 'Design index freshness and re-indexing for a live corpus',
    companies: ['google', 'amazon'],
    minutes: 45,
    steps: {
      define: [
        'What is the freshness requirement, and is it the same for every kind of document?',
        'What is the cost of answering from a stale version of a document?',
        'How do you tell a user that the answer is based on a version from an hour ago?',
      ],
      data: [
        'What is the change rate of the corpus, and how much of it is meaningful change?',
        'How do you detect that a document changed in a way that matters, rather than a timestamp bump?',
      ],
      architecture: [
        'Draw the incremental update path from a source change to a queryable vector.',
        'How do you handle deletes and edits in an ANN index that does not love either?',
        'When do you rebuild the whole index instead, and how do you cut over?',
      ],
      evaluate: [
        'How do you measure freshness as an SLO rather than a feeling?',
        'How do you detect that the index and the source have silently diverged?',
      ],
      deploy: [
        'How do you run a re-index of the whole corpus without degrading live queries?',
        'What happens if the embedding job fails halfway through?',
      ],
      wrapup: [
        'What does freshness cost, and what would you trade for it?',
        'What is the simplest version of this that would be good enough?',
      ],
    },
    solution: {
      define:
        'Freshness is not uniform and pretending it is wastes most of the budget. I tier it: policy documents, pricing and incident notes need under 60 seconds because a stale answer there is materially wrong; general documentation can be minutes; archived material can be daily. The cost of staleness varies the same way — a stale price quoted confidently to a customer is a business incident, a stale tutorial is a nuisance. Every answer carries the source timestamp per citation, so the user can see the version the answer is built from; that single UI element converts an invisible staleness problem into a visible one, and it is far cheaper than driving staleness to zero everywhere.',
      data:
        'Change rate in a live corporate corpus is dominated by noise: most update events are metadata touches, permission changes, or an auto-save that changed nothing semantic. So the pipeline computes a content hash after parsing and normalisation, and a document whose normalised content hash is unchanged is dropped immediately — that alone typically removes 70 to 90 percent of events before any embedding work. Below that, chunk-level hashing: re-embed only the chunks whose text changed, which for a typical edit is 1 to 3 chunks out of a hundred. That is the difference between re-embedding a 400-page document on every save and re-embedding two paragraphs.',
      architecture:
        'Source systems push change events to a queue, or are polled with a cursor where they cannot push. A worker fetches the document, parses, normalises, hashes at document and chunk level, and diffs against the stored chunk hashes. New and changed chunks are embedded and upserted; removed chunks are deleted. ANN indexes handle upserts poorly over time — HNSW deletes are tombstones, and the graph degrades as tombstones accumulate — so I accept that and manage it: tombstone ratio is a monitored metric, and a segment is compacted and rebuilt when it exceeds about 20 percent deleted. That is a background operation on one segment at a time, invisible to queries, which is much better than the alternative of a global rebuild. A global rebuild is reserved for exactly two situations: an embedding model change, and a chunking-strategy change, both of which invalidate everything. The cutover for those is a parallel index built offline, evaluated on the gold set, and swapped behind an alias.',
      evaluate:
        'Freshness as an SLO needs a measured number, not a queue-depth proxy. I inject a canary document into each source every minute with the current timestamp in its body, and query for it; the delay until it is retrievable is the end-to-end freshness measurement, and the SLO is stated on its p95 per tier. Queue depth alone lies, because a stuck worker on one shard shows a healthy aggregate. Silent divergence between source and index is the failure that no queue metric catches — a dropped event, a permanently failing document, a source cursor that skipped — so a reconciliation job walks the source inventory nightly and compares document ids and content hashes against the index, emitting a divergence count. That number should be zero, and when it is not, it is usually a class of documents the parser has been failing on for weeks in silence.',
      deploy:
        'A full re-index runs on separate worker capacity writing into a separate index, so live queries never contend with it — the only shared resource is the embedding service, which gets a lower-priority lane for backfill traffic so interactive query embedding is never queued behind it. Progress is checkpointed by document id range, so a failure resumes rather than restarting, and the new index is not aliased until a completeness check passes: document count and content-hash coverage matching the source inventory within a tolerance of zero. A half-finished index that gets aliased is the worst outcome available here, because it looks healthy and quietly answers from a partial corpus, so the completeness gate is not optional.',
      wrapup:
        'Freshness costs mostly in embedding spend and in the operational complexity of a streaming pipeline, and the hash-based deduplication is what makes it affordable — without it, the same corpus costs an order of magnitude more to keep current. What I would trade: sub-minute freshness on the archived tier, which nobody needs, in exchange for spending it on the policy tier. The simplest version that is genuinely good enough for many products is a nightly full rebuild plus an express lane for documents flagged as time-sensitive; it is a hundred lines rather than a pipeline, and if the corpus is under a few million chunks I would start there and only build the incremental path when the freshness SLO or the rebuild cost forces it.',
      numbers: [
        'Event filtering: at an assumed 500K change events/day of which 80 percent are non-semantic, content hashing drops the workload to 100K documents; chunk-level diffing then re-embeds about 2 chunks each, so 200K chunks/day rather than 450K per full-corpus pass.',
        'Incremental embedding cost: 200K chunks x 512 tokens = 102M tokens/day, about 2 USD/day at an assumed 0.02 USD per million, versus roughly 2,300 USD for a full 225M-chunk rebuild.',
        'Tombstone management: rebuilding a segment at 20 percent deleted keeps ANN recall within a point or two of a fresh index, and a segment rebuild touches roughly 1/64th of the corpus at a time.',
        'Freshness SLO measurement: a canary document per source per minute gives 1,440 samples/day/source, enough to state a p95 index-lag number rather than inferring freshness from queue depth.',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 6, apiAndData: 8, architecture: 11, deepDive: 10, wrapUp: 4 },
      opening:
        'I want to tier the freshness requirement rather than set one number, because most of a corpus does not need to be fresh and paying for uniform freshness is where this design usually goes wrong.',
      traps: [
        'Re-embedding a whole document on every change event. Most events change nothing semantic, and chunk-level hashing turns an expensive pipeline into a cheap one.',
        'Assuming an ANN index absorbs deletes indefinitely. Tombstones degrade recall, so segment compaction has to be a designed background job with a monitored ratio.',
        'Using queue depth as the freshness metric. It goes green while one stuck shard serves month-old content; a canary document measures the thing you actually promised.',
        'Aliasing a rebuilt index before a completeness check. A partial index answers confidently from a partial corpus and looks perfectly healthy.',
      ],
      whenPushed: [
        {
          challenge: 'Why not just query the source system live instead of indexing?',
          answer:
            'For a small number of high-value, high-churn sources that is genuinely better, and I would federate: query the ticket system API live and merge those results with the index. It does not generalise, because live sources have their own rate limits and latencies and no semantic search, so you get keyword results with a two-second tax. Federating the few and indexing the many is the pragmatic split.',
        },
        {
          challenge: 'Your reconciliation job is a nightly full scan of everything.',
          answer:
            'It is, and at 50M documents that is a real job, so it walks a partition per night on a rolling seven-day cycle rather than the whole corpus, and it compares hashes rather than content. The point is not instant detection, it is that a class of silently failing documents cannot hide for months, which is the actual failure I have seen.',
        },
      ],
    },
    diagram: `flowchart TD
  SRC["Source system"] -->|change event or cursor poll| Q["Change queue (tiered by freshness class)"]
  Q --> W["Worker: fetch, parse, normalise"]
  W --> DH{"Document content hash changed?"}
  DH -->|no| DROP["Drop (70-90% of events)"]
  DH -->|yes| CDIFF["Chunk-level hash diff"]
  CDIFF -->|changed chunks only| EMB["Embed (low-priority lane for backfill)"]
  EMB --> UPS["Upsert vectors + BM25 postings"]
  CDIFF -->|removed chunks| TOMB["Delete (tombstone)"]
  TOMB --> RATIO{"Segment tombstones > 20%?"}
  RATIO -->|yes| COMPACT["Background segment rebuild"]
  UPS --> IDX[("Live index (aliased)")]
  CANARY["Canary doc per source per minute"] --> IDX
  IDX -->|retrieval delay p95| SLO[("Freshness SLO per tier")]
  RECON["Nightly partition reconciliation: source vs index hashes"] --> IDX
  MODEL["Embedding or chunking change"] --> REBUILD["Offline full rebuild"]
  REBUILD -->|completeness gate passes| IDX`,
  },
]

/**
 * Pattern 4 — agent platforms. Multi-step tool-calling loops that run for minutes or hours:
 * durable state, compounding per-step error, context growth, sandboxed execution and a
 * defined escalation path.
 */
const agentQuestions: AiSdQuestion[] = [
  {
    id: 'aisdq-deep-research-agent',
    patternId: 'aisdp-agent-platform',
    title: 'Design a deep research agent',
    companies: ['google', 'microsoft', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What is the deliverable — a cited report, an answer, a decision — and how long is the user willing to wait for it?',
        'What is the per-task cost ceiling, and what happens when a task approaches it?',
        'What does success mean here, and can a user tell a good report from a plausible one?',
      ],
      data: [
        'What is the agent state, and what must survive a process crash 20 minutes into a task?',
        'How does context grow over a 30-step research task, and what does that do to cost?',
        'Where do intermediate findings live, and in what form?',
      ],
      architecture: [
        'Draw the loop: what decides the next action, and what stops it?',
        'Do you use a single agent with many tools or a planner with subagents, and why?',
        'How do you parallelise research without the subagents duplicating each other work?',
        'How do you bound cost and time without cutting a task off mid-thought?',
      ],
      evaluate: [
        'How do you evaluate a 30-step trajectory when only the final report is visible?',
        'What is the per-step versus end-to-end quality picture, and why does the arithmetic matter?',
        'How do you catch an agent that produces a beautiful report from sources that do not say what it claims?',
      ],
      deploy: [
        'How do you roll out a change to the planner prompt when every task is different?',
        'What happens when a tool the agent depends on starts failing or returning garbage?',
      ],
      wrapup: [
        'What is the cost per completed report, and where does it go?',
        'What would you cap first if you had to halve that cost?',
      ],
    },
    solution: {
      define:
        'The deliverable is a written report with inline citations to sources the agent actually retrieved, and the acceptable wait is minutes, not seconds — 3 to 10 minutes for a substantial question — which is a completely different product shape from chat and should be built as an asynchronous job with progress, not a request. The per-task cost ceiling is a hard budget in tokens and in wall clock, say 500K tokens and 10 minutes, and on approaching it the agent does not get cut off: it is told it has one step remaining and instructed to synthesise what it has. That distinction matters, because an agent killed at the limit produces nothing while an agent warned at the limit produces a shorter report. Success is genuinely hard for a user to judge — a plausible report and a correct report look identical — which is why citations are load-bearing rather than decorative, and why the evaluation section carries more weight in this design than in most.',
      data:
        'Agent state is a durable record, not a process: the task spec, the plan, the ordered trajectory of steps with tool calls and results, a findings store, and a budget ledger. It is written to durable storage after every step so a crash 20 minutes in resumes from the last completed step rather than restarting, and the tool results are stored by reference — the retrieved page contents live in object storage, and the trajectory holds ids and summaries. Context growth is the cost driver and it is close to quadratic if handled naively: with 30 steps each adding roughly 2,000 tokens of tool output, replaying the full transcript every step means the total input across the task is the sum of a growing prefix, about 930K tokens rather than the 60K of content actually gathered. So the working context holds the plan, the current sub-question, a compacted findings summary, and only the last few raw tool results; everything else is externalised to the findings store and retrieved deliberately. That is the single decision that keeps a research task affordable.',
      architecture:
        'A planner-and-subagent design, not one agent with many tools, and the reason is parallelism rather than specialisation: research decomposes into independent sub-questions that can be pursued simultaneously, and a single-threaded agent doing them serially takes ten times as long for the same tokens. The planner decomposes the question into 3 to 8 sub-questions with explicit scope statements, spawns a subagent per sub-question with its own budget, and each subagent runs a bounded search-read-extract loop writing structured findings — claim, source url, supporting quote — into the shared findings store. Duplication is prevented by the scope statements plus a shared claim index: before recording a finding, a subagent checks whether an equivalent claim exists, and cheap deduplication at the claim level is far more effective than trying to coordinate the agents. The planner then reads the findings store, not the subagent transcripts, and either dispatches a second round for gaps or writes the report. Every citation in the report must resolve to a stored finding with a quote, and a synthesis step that cannot find support for a sentence is required to drop the sentence. Orchestration runs on a durable workflow engine so each step is a checkpointed, retryable unit.',
      evaluate:
        'Per-step and end-to-end are different measurements and the arithmetic is the whole story: at 95 percent per-step reliability, a 10-step task succeeds 60 percent of the time and a 30-step task 21 percent. So the design target is not a better model, it is fewer sequential steps and per-step verification, which is why the parallel-subagent shape and the bounded loops exist. I evaluate three layers. Trajectory: did each step do something sensible given the state — scored by a judge on a sampled set with the rubric written against the plan, which catches loops, redundant searches and tool misuse. Findings: is each recorded claim actually supported by its quoted source, checked by a verifier model against the stored page text, which is the layer that catches the beautiful-report-from-nothing failure. Report: rubric-scored for coverage of the sub-questions, calibration, and citation precision, plus a periodic human read of 20 reports a week, because the judge and the writer share failure modes and the human read is what keeps the judge honest.',
      deploy:
        'Planner prompt changes are evaluated on a fixed set of 100 research tasks with stored reference reports and pre-recorded tool responses where possible, so the comparison is not swamped by the web changing under it. The gate is the report rubric and the citation-support rate, and any change that improves rubric score while lowering citation support is rejected, because that combination means the model learned to write better and cite worse. Online rollout is a percentage of live tasks with the same metrics computed on a sample. Tool degradation is the most common production failure and it must not be silent: each tool has a health signal derived from its own outputs — empty result rate, error rate, and a content-shape check such as whether a search tool is returning results at all — and a degraded tool is removed from the toolset for new tasks with the agent told it is unavailable, which produces a report with an acknowledged gap rather than a report confidently built on garbage.',
      wrapup:
        'Cost per completed report is dominated by input tokens: with compaction, a task using 6 subagents at roughly 60K input tokens each plus a planner at 80K and a 4K-token report is around 440K input and 15K output tokens, which at an assumed 3 and 15 USD per million is about 1.55 USD. Without compaction the same task is three to four times that. To halve it I would cut the number of sequential rounds first — most of the value comes from the first round of subagents and the second round is where the diminishing returns live — then route subagent work to the small model, keeping the frontier model for planning and final synthesis, which is where reasoning quality actually shows.',
      numbers: [
        'Compounding error: 0.95 per step over 10 steps is 0.60, over 30 steps 0.21, so the lever is fewer sequential steps and per-step verification rather than a marginally better model.',
        'Context growth: 30 steps x 2,000 tokens of tool output replayed each step sums to about 930K input tokens for 60K tokens of actual content — a 15x tax that compaction removes.',
        'Cost per report: 6 subagents x 60K + 80K planner = 440K input at an assumed 3 USD/M = 1.32 USD, plus 15K output at 15 USD/M = 0.23 USD, so about 1.55 USD per report.',
        'Parallelism: 6 sub-questions run concurrently at roughly 90 seconds each finish in about 2 minutes wall clock against 9 minutes serially, for identical token spend.',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 8, apiAndData: 9, architecture: 16, deepDive: 14, wrapUp: 5 },
      opening:
        'I want to do the compounding-error arithmetic early, because 95 percent per step is 21 percent over thirty steps, and that number is what forces a parallel bounded-subagent design rather than one long autonomous loop.',
      traps: [
        'Replaying the whole transcript every step. Context grows quadratically and the token bill is several times the content actually gathered; compaction with an externalised findings store is the fix.',
        'Killing a task at the budget limit. You pay for everything and deliver nothing; warn the agent it has one step left and let it synthesise.',
        'Evaluating only the final report. A well-written report from unsupported claims scores well on any rubric that does not check citations against the stored source text.',
        'Treating the agent as a process rather than a durable workflow. A 20-minute task on an ephemeral worker loses everything to a routine deploy.',
      ],
      whenPushed: [
        {
          challenge: 'Why not one agent with a big context window and all the tools?',
          answer:
            'Simplicity, and I would start there for a five-step task. It breaks on parallelism and on context: research sub-questions are independent and a single agent does them serially, and a single context accumulating thirty tool results both costs more and degrades attention over the relevant parts. The cost of the multi-agent shape is that each handoff is a lossy serialisation, which is why subagents write structured findings rather than prose.',
        },
        {
          challenge: 'How do you stop the subagents from all searching the same thing?',
          answer:
            'Scope statements in the dispatch plus a shared claim index they check before recording a finding. I deliberately do not try to coordinate them at the action level — that is a distributed-consensus problem for a system that tolerates duplicate work cheaply. Deduplicating at the claim level costs one embedding lookup per finding and removes most of the waste.',
        },
        {
          challenge: 'Ten minutes is a long time. Users will leave.',
          answer:
            'They will if it looks like a spinner, so the product is a job with visible progress: the plan appears in seconds, sub-questions tick off as findings land, and partial findings are readable before the report exists. That also means an abandoned task can be cancelled and its budget reclaimed, which matters because abandoned agent tasks are far more expensive than abandoned chat turns.',
        },
      ],
    },
    diagram: `flowchart TD
  Q["Research question"] --> PL["Planner: decompose into 3-8 scoped sub-questions"]
  PL --> WF["Durable workflow engine (checkpoint per step)"]
  WF --> SA1["Subagent 1 (own token budget)"]
  WF --> SA2["Subagent 2"]
  WF --> SA3["Subagent N"]
  SA1 --> TOOLS["Search / fetch / extract"]
  SA2 --> TOOLS
  SA3 --> TOOLS
  TOOLS -->|page text by reference| OBJ[("Object store")]
  SA1 --> FIND[("Findings store: claim + url + quote")]
  SA2 --> FIND
  SA3 --> FIND
  FIND --> DEDUP["Claim-level dedup index"]
  FIND --> PL2["Planner round 2: gaps only"]
  PL2 --> SYN["Synthesis: every sentence must map to a finding"]
  SYN --> REP["Report with citations"]
  REP --> VER["Verifier: claim supported by quoted source?"]
  WF --> LEDG[("Budget ledger: tokens, wall clock")]
  LEDG -->|one step remaining| SYN
  TOOLS -->|empty-result and error rate| HEALTH["Tool health; degraded tools removed"]`,
  },
  {
    id: 'aisdq-support-agent-escalation',
    patternId: 'aisdp-agent-platform',
    title: 'Design a customer support agent with human escalation',
    companies: ['amazon', 'microsoft'],
    minutes: 60,
    steps: {
      define: [
        'What is the agent allowed to do on its own, and what always needs a human?',
        'What is the success metric — deflection rate, resolution rate, or customer satisfaction — and how do those conflict?',
        'What is the cost of a wrong action, and does it differ from the cost of a wrong answer?',
      ],
      data: [
        'What does the agent need to see about a customer, and what should it never see?',
        'Where does the knowledge come from, and how do you keep the agent from inventing policy?',
        'What is the conversation and action history you must retain, and for how long?',
      ],
      architecture: [
        'Draw the path from an incoming message to either a resolution or a handoff.',
        'How do you scope tool permissions so a bad tool call cannot refund ten thousand orders?',
        'What triggers escalation, and what does the human receive when it happens?',
        'How do you handle a customer who is trying to manipulate the agent into an unauthorised action?',
      ],
      evaluate: [
        'How do you measure whether the agent resolved the issue rather than just ending the conversation?',
        'How do you evaluate the escalation decision itself, in both directions?',
      ],
      deploy: [
        'How do you launch this without a bad first week that costs you customer trust?',
        'How do you roll back a policy or prompt change when the damage is conversations, not errors?',
      ],
      wrapup: [
        'What does this save, honestly, and what does it cost that does not appear on the infrastructure bill?',
        'What category of issue would you never route to the agent?',
      ],
    },
    solution: {
      define:
        'I split actions into three tiers and make that split the centre of the design. Read-only actions — order status, policy lookup, shipment tracking — the agent does freely. Bounded write actions — refund under 50 dollars, reschedule a delivery, resend a receipt — the agent does within a policy envelope with a per-conversation and per-customer cap. Everything else — account closure, refunds above the cap, anything touching payment methods, anything a customer is angry about — goes to a human. The success metric is resolution rate confirmed by the customer not returning within 7 days, not deflection rate, because deflection rewards the agent for ending conversations and that is exactly the wrong incentive: a bot that says sorry, I cannot help and closes the chat maximises deflection. A wrong action is categorically worse than a wrong answer, because it moves money or state and the customer may not notice until later, which is why the action tiers exist rather than a single autonomy setting.',
      data:
        'The agent sees the customer order history, entitlements, prior tickets and the current conversation. It does not see payment instrument details, other customers, or internal notes marked private — those are excluded at the tool layer, not by prompt instruction, because a prompt is not an access-control mechanism. Knowledge comes from a retrieval index over the published policy corpus, and the agent is required to cite the policy section for any statement about what the company will or will not do; a policy claim with no retrieved support is a violation caught by the same groundedness check used in RAG. That is what stops invented policy, which is the most damaging hallucination in this domain because it creates a commitment the company then has to honour or refuse. Retention: full conversation and action logs for the dispute window, typically 12 to 24 months, with the action log immutable and separately queryable, because when a customer disputes what the agent promised, that log is the record.',
      architecture:
        'Incoming message goes through intent classification and a risk screen first — an inexpensive model deciding category, sentiment, and whether the case is in the never-automate set — and high-risk cases skip the agent entirely and queue to a human with a generated summary. Otherwise the agent loop runs with a scoped toolset: tools are issued per conversation as capability tokens carrying the customer id and the remaining refund allowance, so a tool call is structurally incapable of touching another customer or exceeding the envelope. That is the answer to the refund-ten-thousand-orders question: the bound is in the credential, not in the prompt. Escalation triggers are explicit and multiple: the agent requests it, the risk classifier fires, sentiment crosses a threshold, the customer asks for a human (always honoured, immediately), the conversation exceeds a turn budget, or a required action falls outside the envelope. On handoff the human receives a structured summary — the issue, what was verified, what actions were taken, the policy sections consulted, and the specific blocker — rather than a transcript, because a transcript makes the human redo the work. Manipulation attempts are handled by the same architecture: since authority lives in the capability token, a persuaded agent still cannot exceed the envelope; separately, injection patterns are logged and repeated attempts flag the account.',
      evaluate:
        'Resolution is measured by absence of recontact: did this customer come back about the same issue within 7 days, and did the ticket reopen. That is a lagging metric, so it is paired with a leading one — a judge scoring, on a sampled set, whether the final agent message actually addressed the stated problem. The escalation decision is evaluated in both directions and both are expensive: an under-escalation is measured by human review of a sample of agent-resolved conversations flagged by low sentiment or recontact, and an over-escalation by review of a sample of escalated conversations that the human resolved with a single message the agent could have sent. I track both rates and tune the trigger thresholds against them, because a system optimised only against under-escalation escalates everything and saves nothing. Action correctness gets its own audit: every bounded write action is sampled and reviewed against policy, and the acceptable error rate there is much lower than for text.',
      deploy:
        'Launch is staged by risk rather than by traffic percentage. Week one: the agent drafts responses that a human approves and sends, which produces a labelled dataset and an accurate estimate of quality with zero customer exposure. Week two: the agent handles read-only categories autonomously with human review after the fact. Week three: bounded write actions with a low cap, raised weekly while the action-audit error rate holds. This is slower than a percentage ramp and it is right, because the failure mode is trust, and customer trust does not recover on the timescale that an error budget assumes. Rollback for a prompt or policy change is a config flip back to the previous version, but the real control is the same staged gate: changes ship first to the draft-and-approve lane for a day, where a regression is visible to reviewers before it is visible to customers.',
      wrapup:
        'Honestly: the saving is real but smaller than the deflection number implies, because the conversations the agent resolves are disproportionately the cheap ones a human would have closed in two minutes, while the expensive long-tail cases still escalate. At an assumed 20 dollars fully-loaded cost per human-handled contact and 0.30 dollars per agent conversation, resolving 45 percent of a million annual contacts saves about 8.9 million dollars gross — but the costs that do not appear on the infrastructure bill are the review capacity for audits, the escalation-quality problem where humans now receive only hard cases and burn out faster, and the reputational cost of the wrong actions that do get through. I would never route to the agent: anything involving a vulnerable customer, a legal threat, a safety issue, a data-deletion request, or a payment dispute.',
      numbers: [
        'Unit economics: an assumed 20 USD fully-loaded per human contact against roughly 0.30 USD per agent conversation (about 40K tokens across the loop at blended rates), so break-even needs only a few percent deflection and the risk controls are what actually bound the design.',
        'Escalation budget: at 1M contacts/year and 45 percent agent resolution, 550K still reach humans, so staffing falls by roughly 45 percent rather than disappearing, and the remaining queue is harder per contact.',
        'Action envelope: a per-conversation cap of 50 USD and a per-customer daily cap of 150 USD bounds worst-case loss from a fully compromised agent to the cap times concurrent conversations, which is a number you can state to a risk committee.',
        'Audit sampling: reviewing 2 percent of bounded write actions at 5,000 actions/day gives 100 reviews/day, enough to detect a policy-error rate moving from 1 to 3 percent within about a week.',
      ],
    },
    delivery: {
      budget: { requirements: 9, estimates: 7, apiAndData: 10, architecture: 15, deepDive: 14, wrapUp: 5 },
      opening:
        'I want to structure this around three action tiers — read-only, bounded write, and human-only — because the interesting risk here is not a wrong sentence, it is a wrong action, and those need different controls.',
      traps: [
        'Optimising deflection rate. It rewards the agent for ending conversations, and the cheapest way to deflect is to be unhelpful; measure resolution confirmed by non-recontact.',
        'Bounding tool authority in the prompt. A prompt is not an access-control mechanism; issue capability tokens scoped to the customer and the remaining allowance.',
        'Handing a human the raw transcript on escalation. It makes them redo the diagnosis, which destroys the saving and infuriates the customer who now repeats themselves.',
        'Launching on a traffic percentage. The failure mode is trust, so stage by risk: draft-and-approve, then read-only autonomy, then bounded writes with a rising cap.',
      ],
      whenPushed: [
        {
          challenge: 'What if a customer talks the agent into a refund it should not give?',
          answer:
            'Then they get at most the envelope, because the refund tool is issued with a remaining-allowance credential rather than trusting the model judgement. Beyond that it needs a human regardless of how persuasive the argument was. I also log the attempt: repeated envelope-maxing across conversations is a fraud signal, and it is more valuable as a detection input than as a thing to argue with in the prompt.',
        },
        {
          challenge: 'Your escalation summary could itself be wrong and mislead the human.',
          answer:
            'It could, so the summary is structured and links to the evidence: each claim in it points at the tool result or policy section it came from, and the transcript is one click away. The human is asked to verify rather than trust. I would also rather the summary be terse and verifiable than fluent, which is a deliberate quality trade-off in how it is prompted and evaluated.',
        },
      ],
    },
    diagram: `flowchart TD
  MSG["Customer message"] --> RISK["Intent + risk screen (small model)"]
  RISK -->|never-automate category| HQ["Human queue + generated summary"]
  RISK -->|ok| AG["Agent loop"]
  AG --> KB[("Policy retrieval index")]
  KB --> GRD["Policy claims must cite a section"]
  AG --> CAP["Capability token: customer id + remaining allowance"]
  CAP --> T1["Read-only tools: order, shipment, entitlements"]
  CAP --> T2["Bounded write: refund <= 50 USD, reschedule"]
  CAP -.->|structurally blocked| T3["Account closure, payment methods"]
  T3 --> HQ
  AG -->|agent asks, sentiment drop, turn budget, customer asks| HQ
  HQ --> HUM["Human agent"]
  T2 --> ALOG[("Immutable action log")]
  ALOG -->|2% sample| AUDIT["Policy audit"]
  AG --> RES["Resolution"]
  RES -->|recontact within 7 days?| MET[("Resolution rate")]
  HQ -->|resolved in one message?| OVER["Over-escalation review"]`,
  },
  {
    id: 'aisdq-coding-agent-sandbox',
    patternId: 'aisdp-agent-platform',
    title: 'Design a coding agent with sandboxed execution',
    companies: ['google', 'microsoft', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What does the agent do — answer questions, edit files, or open pull requests — and what is the trust boundary for each?',
        'What is the acceptable latency for a single edit-and-test cycle?',
        'What is the threat model: a malicious user, a malicious repository, or a confused model?',
      ],
      data: [
        'How does the agent see a repository that is larger than any context window?',
        'What does the sandbox need pre-installed, and what does that do to cold start?',
        'What state persists between the agent turns within one task?',
      ],
      architecture: [
        'Draw the execution environment and say exactly what it can reach.',
        'How do you give the agent a package manager without giving it the internet?',
        'How does the agent verify its own work, and what is the loop when tests fail?',
        'How do you handle a task that needs 40 minutes and 200 tool calls?',
      ],
      evaluate: [
        'How do you evaluate a coding agent beyond whether tests pass?',
        'How do you detect an agent that makes tests pass by weakening the tests?',
      ],
      deploy: [
        'How do you ship a model upgrade when the agent behaviour on real repositories is what changed?',
        'What is the blast radius of a bad agent action, and how do you bound it?',
      ],
      wrapup: [
        'What is the cost per completed task, and what dominates it?',
        'What kinds of task would you not let this agent attempt?',
      ],
    },
    solution: {
      define:
        'Three capabilities with three trust boundaries: answering questions about the repository needs read access only; editing files and running tests needs an isolated environment but no write access to anything real; opening a pull request is the only action that touches the outside world, and it is a proposal reviewed by a human, never a merge. Latency target for one edit-and-test cycle is under 30 seconds for a typical test subset, because the agent will do dozens of them and a 3-minute cycle makes a 20-cycle task an hour. The threat model has all three actors and they need different answers: a malicious user trying to use our compute to mine or to exfiltrate, a malicious repository whose build script or dependency runs code the moment we execute anything, and a confused model that rm -rf the wrong directory. The malicious repository is the one people forget, and it is why the sandbox must be hostile-by-default rather than merely careless-by-default.',
      data:
        'A large repository never fits in context and dumping the file tree is close to useless, so the agent sees it through tools: ripgrep-style search, symbol and definition lookup from a language server or a pre-built index, file read with line ranges, and a repository map — a compressed outline of files and their top-level symbols, weighted toward files touched recently or related to the task. The agent pulls what it needs rather than being handed everything, which is both cheaper and empirically better than stuffing context. The sandbox image is pre-baked with the language toolchains, the common package caches and the repository dependencies warmed, because installing dependencies per task is the single largest latency cost — an empty environment installing a JavaScript dependency tree is minutes, a pre-warmed one is seconds. Within a task, the sandbox filesystem is the state: it persists across turns for the life of the task and is destroyed after, with the diff extracted as the artefact.',
      architecture:
        'Each task gets a microVM — a Firecracker-style VM rather than a container, because the isolation boundary is a hypervisor and the threat model includes hostile code, and a container escape is a plausible event where a VM escape is not. Inside: the repository checked out at a specific commit, no credentials of any kind, no ambient cloud metadata endpoint, and no network by default. Network egress goes through a filtering proxy that allows exactly the package registries on an allowlist and nothing else, which is how the agent gets a package manager without getting the internet — and the proxy logs every fetch, so an attempt to reach an unexpected host is a signal rather than an invisible success. Resource limits are hard: CPU, memory, disk, wall clock, and process count, so a fork bomb or a mining attempt dies rather than degrading the host. The verify loop is the core of the agent quality: after every edit, run the narrowest relevant test selection, feed failures back with the stack trace, and require a green run before proposing. For a 40-minute, 200-call task the orchestration is durable — each tool call is a checkpointed step, the VM can be snapshotted and restored, and the agent is compacted periodically: the trajectory is summarised into a task-state document holding what has been tried, what failed and why, and the current diff, because otherwise the context cost of turn 200 is prohibitive.',
      evaluate:
        'Tests passing is necessary and badly insufficient, so I score four things. Correctness on a held-out benchmark of real issues with hidden tests the agent never sees, which is the only measure that resists gaming. Diff quality, judged on minimality and adherence to the repository conventions, because a patch that passes tests and rewrites 40 unrelated files is not a usable contribution. Test integrity, which is the specific gaming failure: I diff the test files separately from the source files and any change that deletes assertions, adds skip markers, or loosens a comparison is flagged and, in the default policy, rejected outright — an agent allowed to edit tests to make tests pass will eventually do so, and this is a mechanical check rather than a judgement call. And regression: run the full suite, not just the selected subset, before proposing.',
      deploy:
        'A model upgrade changes agent behaviour in ways that unit tests of the harness cannot see, so it goes through a fixed benchmark of a few hundred real tasks with hidden tests, reporting resolve rate, mean tool calls, mean tokens, and diff size — and I gate on all four, because a model that resolves one point more while using twice the tokens is not obviously an upgrade. Then a shadow phase on real tasks where both models attempt the same task and a human reviews a sample of the pairs. Blast radius is bounded by construction: the agent has no credentials, no network beyond the registry allowlist, and cannot merge. The worst outcome is a bad pull request, which a human declines. I would keep it that way even under pressure to auto-merge, because the review step is the entire safety argument and removing it changes the risk profile completely.',
      wrapup:
        'Cost per completed task is dominated by input tokens, not by compute: a task with 60 tool calls, a compacted working context averaging 25K tokens, and 12K output tokens is roughly 1.5M input and 12K output tokens, about 4.7 USD at an assumed 3 and 15 USD per million, against sandbox compute of a few cents for 20 minutes of a small VM. That ratio surprises people and it tells you where to optimise: better tools that return less text, and more aggressive compaction, beat cheaper compute every time. I would not let the agent attempt: changes to authentication, cryptography or payment code; database migrations; infrastructure-as-code that provisions real resources; or anything where the tests do not meaningfully cover the behaviour, because in that last case the verification loop is measuring nothing.',
      numbers: [
        'Token dominance: 60 tool calls x roughly 25K tokens of compacted context = 1.5M input tokens at an assumed 3 USD/M = 4.5 USD, against roughly 0.05 USD of microVM compute for 20 minutes — tokens are about 99 percent of the task cost.',
        'Cold start: a pre-baked image with warmed dependency caches boots and is usable in a few seconds, versus minutes to install a dependency tree from scratch, which over a 60-call task is the difference between 30-second and 3-minute cycles.',
        'Context compaction: without it, 200 tool calls averaging 3K tokens replayed each turn sums to about 60M input tokens; with a summarised task-state document the same task holds around 25K tokens per turn.',
        'Isolation cost: a Firecracker microVM adds roughly 100-200ms of boot over a container, which against a 30-second edit-and-test cycle is under 1 percent, and it buys a hypervisor boundary against hostile repository code.',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 7, apiAndData: 10, architecture: 16, deepDive: 14, wrapUp: 5 },
      opening:
        'Let me name the threat model early and include the repository itself as an adversary, because running a build script is executing untrusted code, and that single framing is what pushes this from a container to a microVM.',
      traps: [
        'Letting the agent edit test files freely. It will eventually delete the failing assertion, and a mechanical diff check on test files is the only reliable guard.',
        'Giving the sandbox open network access so the package manager works. Use a filtering proxy with a registry allowlist and log every fetch; open egress is an exfiltration channel.',
        'Stuffing the repository into context. Tools that search and read on demand are cheaper and measurably better than a large dump the model must attend over.',
        'Optimising compute cost. Tokens are roughly 99 percent of the bill for an agent task, so better tools and compaction matter far more than cheaper VMs.',
      ],
      whenPushed: [
        {
          challenge: 'Containers are good enough and much cheaper to operate.',
          answer:
            'For our own trusted code, yes. Here the agent executes arbitrary repository build scripts and arbitrary dependencies, which is untrusted-code execution, and container escapes are a real category. The microVM costs about 150ms of boot and some operational complexity against a 30-second cycle, so I take the hypervisor boundary. I would revisit if every repository were first-party and reviewed.',
        },
        {
          challenge: 'Why not auto-merge when all tests pass?',
          answer:
            'Because tests passing is the metric the agent optimises, and my whole evaluation section exists because that metric is gameable. Human review is the check that catches the patch which passes tests and is wrong, and it is also what keeps the agent scoped to proposals rather than to production. If the organisation wanted auto-merge, I would want mutation-testing coverage on the touched code first, which is a much higher bar than a green suite.',
        },
        {
          challenge: 'Forty minutes per task is far too slow to be useful.',
          answer:
            'It depends what it replaces — for a task a person would spend two hours on, forty minutes running in the background is fine, and the product should be asynchronous with a notification, not a wait. Where I would spend the latency budget is the edit-and-test cycle, because that is multiplied by the number of iterations: test selection, warmed caches and incremental builds cut task time more than a faster model does.',
        },
      ],
    },
    diagram: `flowchart TD
  TASK["Task + repo at commit"] --> ORCH["Durable orchestrator (checkpoint per tool call)"]
  ORCH --> VM["Firecracker microVM (no credentials, no metadata endpoint)"]
  VM --> FS[("Ephemeral filesystem: repo checkout")]
  ORCH --> TOOLS["Tools: search, symbol lookup, read range, edit, run tests"]
  TOOLS --> MAP["Repo map: files + top-level symbols, task-weighted"]
  VM -->|egress| PROXY["Filtering proxy: package registries only, all fetches logged"]
  PROXY -.->|blocked| NET["Everything else"]
  VM --> LIM["Hard limits: CPU, memory, disk, wall clock, PIDs"]
  TOOLS --> LOOP{"Tests green?"}
  LOOP -->|no| FIX["Feed stack trace back, edit again"]
  FIX --> TOOLS
  LOOP -->|yes| FULL["Run full suite (regression check)"]
  FULL --> TDIFF{"Test files weakened?"}
  TDIFF -->|assertions removed or skipped| REJ["Reject"]
  TDIFF -->|no| PR["Propose pull request (human reviews, never auto-merge)"]
  ORCH --> COMP["Periodic compaction to task-state document"]`,
  },
  {
    id: 'aisdq-long-running-agent-state',
    patternId: 'aisdp-agent-platform',
    title: 'Design durable state for long-running agents',
    companies: ['amazon', 'google'],
    minutes: 45,
    steps: {
      define: [
        'How long does a task run, and what must be true if the process hosting it dies?',
        'Can a step be safely retried, and what does that require of every tool?',
        'What does the user see and control while a task is running for an hour?',
      ],
      data: [
        'What exactly is the state: the transcript, a summary, a structured record, or all three?',
        'How large does that state get, and where does it live?',
        'How do you version state when the agent code changes mid-task?',
      ],
      architecture: [
        'Draw the durable execution model and say what is checkpointed and when.',
        'How do you handle a tool call that has side effects and times out with an unknown outcome?',
        'How do you resume a task whose model version has been deprecated?',
      ],
      evaluate: [
        'How do you test recovery, given the failure is rare and the state is complex?',
        'What tells you a resumed task behaved differently from an uninterrupted one?',
      ],
      deploy: [
        'How do you deploy the agent service when tasks are mid-flight?',
        'How do you migrate in-flight tasks to a new version of the agent logic?',
      ],
      wrapup: [
        'What is the storage and operational cost of durability, and is it worth it?',
        'When would you skip all of this and just let a failed task restart?',
      ],
    },
    solution: {
      define:
        'Tasks run from seconds to hours, and the requirement is that a host dying loses at most the step in flight, never the task. That is a durable-execution requirement, and it is the same problem as a workflow engine rather than something agent-specific — which is good news, because the solution is well understood and I would reach for an existing engine rather than building one. Retry safety is the hard constraint it imposes: every tool must be idempotent or must be made idempotent by the platform, because at-least-once execution is what durable engines actually give you. While a task runs the user sees a live activity stream and holds three controls: cancel, which must release the budget and stop billing immediately; steer, which injects a message into the next step; and pause, which is genuinely useful for tasks awaiting a human decision.',
      data:
        'Three layers of state, and separating them is what keeps this affordable. The event log is the source of truth: an append-only ordered record of every step — the model request hash, the tool call, the tool result reference, and the timestamp — which is what replay reconstructs from. The working context is derived, not stored authoritatively: it is rebuilt from the event log plus the current compaction summary, so it can be regenerated after a change to compaction logic. And large payloads — page contents, file contents, tool outputs over a few kilobytes — are stored by reference in object storage with the event log holding a pointer and a short summary. That keeps a typical hour-long task event log in the low megabytes rather than hundreds. State is versioned with a schema version on each event and an agent-logic version on the task, so a replay knows which interpretation applies.',
      architecture:
        'A durable workflow engine owns the loop: each iteration is a workflow step, and the engine persists the step result before the next begins, so recovery replays completed steps from the log rather than re-executing them. Model calls are treated as non-deterministic activities whose results are recorded, not recomputed, which is essential — replaying a task by re-calling the model would produce a different trajectory and the replay would diverge. The nasty case is a side-effecting tool that times out with an unknown outcome: I require every mutating tool to accept an idempotency key derived from the task and step id, so a retry either returns the original result or is deduplicated server-side, and where a third-party tool has no such support, the platform wraps it with a check-then-act — query for the effect before retrying — and where even that is impossible, the step is marked requires-human-confirmation rather than silently retried. Resuming a task whose model version was deprecated is a real operational event: the task carries a pinned model, deprecation gives a window, and tasks still running at the deadline are either completed on a compatibility endpoint or failed with their partial results returned, which must be a deliberate policy rather than a surprise.',
      evaluate:
        'Recovery cannot be tested only by waiting for failures, so it is exercised deliberately: a fault-injection lane kills workers at random points on a fraction of internal traffic every day, and the assertion is that the task completes with the same outcome. Beyond crash-survival, the interesting question is behavioural equivalence — did the resumed task do the same thing? I measure that by comparing, for injected-fault tasks, the number of steps, the total tokens, and a judge score on the final output against a control run of the same task without a fault. A resumed task that quietly restarts its plan or repeats a tool call shows up as a step-count anomaly long before anyone notices a quality difference. Duplicate side effects get their own detector: mutating tool calls are counted per task and per idempotency key, and a key executing twice is an alert, not a metric.',
      deploy:
        'Workers are stateless because the state is in the engine, so deploying is a rolling restart: workers stop claiming new steps, finish or abandon the step in flight, and the engine re-dispatches abandoned steps to new workers. That means a deploy costs at most one step of duplicated work per in-flight task, which is exactly why idempotency is non-negotiable. Migrating agent logic mid-task is the harder question, and my default is not to: a task pins its agent version at creation and runs to completion on it, with old versions kept available for the maximum task lifetime plus a margin. Forcing an in-flight task onto new logic means the first half of the trajectory was produced by different rules, and the failure is subtle. The exception is a safety fix, which is applied to in-flight tasks immediately and accepts the inconsistency.',
      wrapup:
        'Storage cost is small — a few megabytes of event log per hour-long task plus the referenced payloads — and the real cost is operational: idempotency discipline on every tool, a workflow engine to run, and replay semantics that engineers must understand. It is worth it when a task is long enough or expensive enough that restarting is painful, roughly when a task costs more than a dollar or takes more than a couple of minutes. Below that I would skip all of it: for a 20-second three-step agent, restarting on failure is cheaper in every dimension than durable execution, and building a workflow engine around it is the classic over-engineering of this pattern.',
      numbers: [
        'Event log size: an hour-long task at 200 steps, with payloads by reference and roughly 1KB of metadata per event, is about 200KB of log plus a few megabytes of referenced payloads.',
        'Recovery cost: with per-step checkpointing, a worker crash loses at most one step — roughly 5 to 20 seconds and a few thousand tokens — against restarting a 200-step task at about 1.5M input tokens and 4.50 USD.',
        'Deploy exposure: a rolling restart of 100 workers with 500 in-flight tasks duplicates at most 500 steps, which is why an idempotency key per (task, step) is required rather than advisory.',
        'Break-even: durable execution pays for itself above roughly 1 USD or 2 minutes per task; below that, restart-on-failure is cheaper than the engine, the idempotency discipline and the replay semantics combined.',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 6, apiAndData: 8, architecture: 11, deepDive: 10, wrapUp: 4 },
      opening:
        'I would frame this as durable execution rather than as an agent problem, because the requirements — at-least-once steps, idempotent side effects, replay without re-deciding — are a workflow engine, and the agent-specific twist is that the model call must be recorded rather than recomputed.',
      traps: [
        'Replaying by re-calling the model. Model calls are non-deterministic, so a replay that re-decides diverges from the trajectory it is supposed to be recovering; record results as activity outputs.',
        'Assuming tools are idempotent. Durable engines give at-least-once, so a mutating tool without an idempotency key will eventually send the same email twice.',
        'Storing the full transcript as the authoritative state. Keep an append-only event log with payloads by reference and derive the working context, so compaction changes do not invalidate history.',
        'Migrating in-flight tasks onto new agent logic. Half a trajectory under old rules and half under new produces failures that are almost impossible to debug; pin the version per task.',
      ],
      whenPushed: [
        {
          challenge: 'This is a lot of machinery for an agent that usually finishes in 30 seconds.',
          answer:
            'Then I would not build it. My break-even is roughly a dollar or two minutes per task; below that, restarting on failure costs less than the engine plus the idempotency discipline. I would build the event log early anyway, because it is also the observability and evaluation substrate, and retrofit durable execution when task length justifies it.',
        },
        {
          challenge: 'How do you handle a task that is waiting on a human for three days?',
          answer:
            'As a durable timer rather than a held process, which is the main reason to use an engine at all: the task suspends with zero resources consumed, a signal from the approval system resumes it, and a timeout policy decides what happens if nobody responds. The subtlety is that the world has moved on after three days, so on resume the agent re-validates its key assumptions rather than trusting stale tool results.',
        },
      ],
    },
    diagram: `flowchart TD
  START["Task created: pins agent version + model version"] --> ENG["Durable workflow engine"]
  ENG --> STEP["Step: decide next action"]
  STEP --> MC["Model call (recorded as activity output, never recomputed)"]
  MC --> LOG[("Append-only event log: step, hash, tool, result ref")]
  STEP --> TOOL["Tool call + idempotency key (task, step)"]
  TOOL --> IDEM{"Mutating tool?"}
  IDEM -->|yes, no native key| CTA["Check-then-act wrapper"]
  IDEM -->|no support at all| HUMAN["Mark requires-human-confirmation"]
  TOOL --> BIG[("Object store: large payloads by reference")]
  LOG --> CTX["Working context derived: log + compaction summary"]
  CTX --> STEP
  ENG -->|worker dies| REPLAY["Replay completed steps from log, resume at last"]
  ENG -->|await human| TIMER["Durable timer, zero resources held"]
  TIMER -->|signal| REVAL["Re-validate stale assumptions"]
  FAULT["Daily fault injection on internal traffic"] --> REPLAY
  REPLAY -->|step count, tokens, judge score vs control| EQ[("Behavioural equivalence check")]`,
  },
]

/**
 * Pattern 5 — evaluation and observability. The answer to "how do you roll back a system
 * whose outputs you cannot diff": offline gates, calibrated judges, online experiments with
 * honest statistics, and traces that explain one bad answer.
 */
const evalQuestions: AiSdQuestion[] = [
  {
    id: 'aisdq-llm-evaluation-service',
    patternId: 'aisdp-eval-platform',
    title: 'Design an evaluation service for LLM features',
    companies: ['google', 'amazon', 'microsoft'],
    minutes: 60,
    steps: {
      define: [
        'Who uses this service and what decision does each of them make with its output?',
        'What is being evaluated — a prompt, a model, a retrieval config, or a whole product flow?',
        'What does it mean for an eval to gate a release, and who can override it?',
      ],
      data: [
        'Where do eval datasets come from, and how do you stop them going stale or becoming the training target?',
        'What is a test case here: an input, an input and a reference output, or an input and a rubric?',
        'How do you version a dataset so a score from March is comparable with a score from September?',
      ],
      architecture: [
        'Draw the service: how is a run defined, executed, scored and stored?',
        'How do you support deterministic checks, model-graded checks and human review in one system?',
        'How do you make a judge trustworthy, and how do you know when it stops being?',
        'How do you keep an eval run from taking six hours?',
      ],
      evaluate: [
        'How do you evaluate the evaluator?',
        'What do you do when the eval score improves but users get worse outcomes?',
      ],
      deploy: [
        'How does this plug into CI, and what happens on a red run?',
        'How do you handle the fact that scores move when the underlying model provider changes something?',
      ],
      wrapup: [
        'What does an eval run cost, and what governs that?',
        'What is the minimum viable version of this that a team should build first?',
      ],
    },
    solution: {
      define:
        'Three users making three decisions. An engineer changing a prompt needs a fast signal in minutes — does this regress anything. A release manager needs a gate — is this build shippable. A product owner needs a trend — is the feature getting better over months. Those need the same storage and different run shapes, so the service exposes a small fast suite and a full suite rather than one. The unit under evaluation is a versioned configuration — prompt, model, retrieval settings, tool definitions together — because evaluating a prompt in isolation is meaningless when retrieval changed underneath it. Gating means a red run blocks the deploy; override requires a named person and a written reason recorded on the run, because an override with no record is just a disabled gate.',
      data:
        'Test cases come from four sources with different properties, and mixing them without labelling which is which is a common mistake. Curated cases written by the team, which encode intent but are unrepresentative. Sampled production traffic, which is representative and needs scrubbing. Harvested failures — cases from incidents and thumbs-down reports, which is the highest-value source and also the one that gradually turns the set into a fix list. And adversarial cases, written to probe known weaknesses. A case is an input plus either a reference output, a rubric, or a set of assertions, and the service supports all three because different tasks need different ones: extraction has a reference, a summary has a rubric, and a tool-calling flow has assertions. Staleness is fought by holding back a portion of the set that is never shown in failure analysis, rotating a fresh production sample in monthly, and reporting scores per-slice so an aggregate cannot hide a slice getting worse. Every dataset is immutable and versioned; a change creates a new version, and scores are only ever compared within a version.',
      architecture:
        'A run is a job: dataset version plus config version plus scorer set. The executor fans out cases to workers that call the system under test through the same gateway production uses — evaluating against a hand-rolled client is how you ship a bug the eval could not see. Results are stored per case, not aggregated, so any score is drillable to the individual output that caused it. Scorers are pluggable and come in three kinds: deterministic (exact match, JSON schema validity, regex, latency, cost), model-graded (a judge with a rubric), and human (queued to a review tool). A run mixes them — most cases get cheap deterministic checks, a sample gets a judge, and a smaller sample gets human review — which is what makes the economics work. Judge trustworthiness is not assumed, it is measured: every judge has a calibration set of a few hundred human-labelled examples, and the judge is reported with its agreement against those humans (Cohen kappa) alongside every score it produces. A judge below the agreement floor is not used for gating. Judges are also pinned to a specific model version, because a silently updated judge model shifts every historical score. Run time is kept down by parallel fan-out, aggressive caching of unchanged (case, config) pairs, and the fast-versus-full suite split.',
      evaluate:
        'Evaluating the evaluator has two parts. Agreement: re-label a rotating sample of judge decisions with humans monthly and watch the kappa; a judge that was 0.72 in March and is 0.55 in September has drifted, usually because production inputs moved away from the calibration set. Bias probes: run the judge on paired outputs that differ only in length, in position, or in which model produced them, and measure how much the score moves — position and verbosity bias are large and correctable by randomising order and by rubric design, and the probe is what tells you they are still under control. The harder failure is when eval scores improve while users do not, and it is almost always one of three things: the eval set has been optimised against, the metric is a proxy that has decoupled from the outcome, or the offline distribution no longer matches production. I diagnose it by checking the held-out slice first, then by comparing the offline input distribution with a fresh production sample, and the standing rule is that an online metric always outranks an offline one when they disagree.',
      deploy:
        'In CI, a pull request touching prompts, retrieval config or model selection triggers the fast suite — a few hundred cases, mostly deterministic scorers, under 10 minutes — and a red run blocks merge with the failing cases linked. The full suite runs nightly on the main branch and before a release, with the judge and human components. On a red run the artefact is a diff of per-case scores against the baseline, so the reviewer sees which cases changed rather than that a number moved. Provider drift is handled by treating the score baseline as a moving reference rather than a constant: a fixed control configuration is re-run nightly, and when the control moves without any change from us, that is a provider drift alert and every subsequent comparison rebases on the new control. Without that control run, a provider silently updating a model looks exactly like a regression in your own code, and teams waste days on it.',
      wrapup:
        'Cost is dominated by judge calls: a 1,000-case run with a judge on every case at roughly 2,000 tokens each is 2M tokens, about 6 USD at an assumed 3 USD per million, plus the system-under-test calls. That is small enough that per-pull-request evaluation is affordable and large enough that judging every case in a 50,000-case set nightly is not, which is exactly why sampling and deterministic-first scoring matter. The minimum viable version a team should build first is not this service: it is 50 cases in a file, a script that runs them, and the scores checked into the repository next to the prompt. That catches most regressions, takes an afternoon, and the platform is only worth building once several teams are doing it.',
      numbers: [
        'Judge cost: 1,000 cases x 2,000 tokens = 2M tokens, about 6 USD at an assumed 3 USD per million, so a per-PR run is affordable while judging a 50,000-case set nightly at 300 USD/night is not.',
        'Calibration: a judge with Cohen kappa of 0.7 against human labels on 300 examples is usable for gating; below about 0.5 its scores are close to noise and gating on them blocks good changes at random.',
        'Run time: 1,000 cases at 4 seconds each is 67 minutes serially and about 4 minutes at 16-way fan-out, which is what makes a CI gate practical.',
        'Sampling mix: deterministic scorers on 100 percent of cases, judge on 20 percent, human on 1 percent gives a 1,000-case run roughly 200 judge calls and 10 human reviews — an hour of reviewer time per week rather than per run.',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 7, apiAndData: 11, architecture: 15, deepDive: 14, wrapUp: 5 },
      opening:
        'The thing I want to get right here is that the judge is itself a model with its own error rate, so I will design for measuring judge agreement against humans continuously rather than treating a judge score as ground truth.',
      traps: [
        'Treating an LLM judge as ground truth. It has position, verbosity and self-preference bias, and without a human-labelled calibration set you cannot say whether its score means anything.',
        'Mutable eval datasets. If the set changes when scores change, no comparison across time is valid; version it immutably and compare only within a version.',
        'No control run. When a provider silently updates a model, your score drops and you spend three days looking for a bug in your own diff.',
        'Aggregating scores without slices. A flat overall number hides one segment collapsing, and the segment that collapses is usually the one a customer cares about.',
      ],
      whenPushed: [
        {
          challenge: 'Why not just use human evaluation for everything?',
          answer:
            'Cost and latency. Human review is the ground truth and I keep it in the loop at about 1 percent, but at 20 to 60 seconds per judgement you cannot gate a pull request on it. The design intent is to spend human labels where they buy the most: calibrating judges, and reviewing the cases where the judge is uncertain.',
        },
        {
          challenge: 'Your eval set will just become the thing you overfit to.',
          answer:
            'It will, which is why a portion is held out and never shown during failure analysis, why a fresh production sample rotates in monthly, and why the harvested-failure source is labelled separately — that source is the one that turns a set into a fix list. Ultimately the offline suite is a regression net, not a quality measurement, and I say so: the quality measurement is online.',
        },
      ],
    },
    diagram: `flowchart TD
  PR["Prompt / model / retrieval change"] --> CI["CI: fast suite (~10 min)"]
  CI --> RUN["Run = dataset version + config version + scorer set"]
  NIGHT["Nightly + pre-release: full suite"] --> RUN
  DS[("Immutable versioned datasets: curated, production sample, harvested failures, adversarial")] --> RUN
  RUN --> EXEC["Executor: fan-out through the production gateway"]
  EXEC --> DET["Deterministic scorers: schema, exact match, latency, cost (100%)"]
  EXEC --> JUDGE["Model-graded judge, pinned version (20%)"]
  EXEC --> HUM["Human review queue (1%)"]
  HUM --> CAL[("Judge calibration set + Cohen kappa")]
  CAL -->|below floor| BLOCK["Judge not usable for gating"]
  DET --> STORE[("Per-case results, drillable")]
  JUDGE --> STORE
  HUM --> STORE
  STORE --> DIFF["Per-case diff vs baseline"]
  DIFF -->|red| GATE["Block merge; override needs a named reason"]
  CTRL["Fixed control config, re-run nightly"] --> DRIFT["Provider drift alert; rebase baseline"]
  STORE --> SLICE["Per-slice reporting"]`,
  },
  {
    id: 'aisdq-ab-test-generative',
    patternId: 'aisdp-eval-platform',
    title: 'Design A/B testing for a generative feature',
    companies: ['google', 'amazon'],
    minutes: 45,
    steps: {
      define: [
        'What is the metric, given there is no click-through rate on a generated paragraph?',
        'What is the unit of randomisation, and why not the request?',
        'What effect size do you care about, and what does that imply about how long you run?',
      ],
      data: [
        'What signals do you actually have, and how biased is each one?',
        'How do you log enough to analyse an experiment without storing every prompt forever?',
      ],
      architecture: [
        'How do you assign variants when the same user may hit several surfaces?',
        'How do you keep the cost difference between variants from confounding the result?',
        'How do you run an experiment where one arm is ten times slower?',
      ],
      evaluate: [
        'How do you compute significance on a metric this noisy without fooling yourself?',
        'How do you handle the fact that quality is multidimensional and one arm may win on some dimensions and lose on others?',
      ],
      deploy: [
        'How do you stop an experiment that is actively harming users?',
        'What do you do when the experiment is flat but you believe the new model is better?',
      ],
      wrapup: [
        'What decision rule do you commit to before you look at the data?',
        'When is an A/B test the wrong instrument entirely?',
      ],
    },
    solution: {
      define:
        'There is no click on a generated paragraph, so the metric hierarchy is explicit and stated before launch. Primary: task completion — did the user do the thing the feature exists to help with, such as sending the drafted email, accepting the suggested code, or resolving the support conversation. Secondary: regeneration rate, edit distance between the generated text and what the user finally used, session continuation, and explicit feedback. Guardrail: latency, cost per session, error rate, and safety-filter trigger rate. Randomisation is by user, not by request, because a user seeing two different model behaviours within a session contaminates their own baseline and because the outcome metrics are session-level. The effect size I care about is a 2 percentage point move in task completion from a base of about 40 percent, and that choice is what determines the run length — a smaller detectable effect is not free, it is weeks of traffic.',
      data:
        'Every signal available here is biased in a known direction and I would say which. Thumbs-down is heavily negative-selected: a tiny, angry minority. Regeneration is a good proxy for dissatisfaction but confounded by latency, because users regenerate when a response feels slow. Edit distance is the strongest implicit signal for drafting features and is confounded by length — a longer response invites more edits. Copy and export events are strong and only exist on some surfaces. So the analysis uses several and expects them to disagree at the margins. Logging: variant assignment, metric events, latencies and token counts are retained long-term because they are small and non-sensitive; prompts and completions are sampled at a few percent with a short TTL for qualitative review, which is enough to read fifty examples of a losing arm and understand why, without building a permanent store of user content.',
      architecture:
        'Assignment lives in a central experiment service, hashing a stable user id with the experiment id to produce a deterministic bucket, so the same user gets the same arm on every surface and across devices — cross-surface consistency is the thing that breaks when teams roll their own. The assignment is stamped on every event and on every trace, which is what makes analysis possible later. Cost and latency confounding is real and often ignored: if arm B is a larger model, it is also slower, and a slower arm loses on engagement metrics for reasons that have nothing to do with quality. I handle it by measuring latency as a covariate and reporting a latency-adjusted estimate alongside the raw one, and where the gap is severe I run a third arm — the old model with artificial latency matching the new one — to separate the two effects. That third arm feels wasteful and it is often the only way to get an interpretable answer. Cost per session is a guardrail metric with a pre-declared ceiling, so an arm that wins on completion by spending four times as much fails the experiment rather than winning it.',
      evaluate:
        'Two disciplines keep the analysis honest. First, sample size from the effect size: detecting 2 percentage points on a 40 percent base at 80 percent power and 5 percent significance needs roughly 9,400 users per arm, so at 5,000 daily eligible users per arm the experiment runs about two days for that effect and two weeks for a 0.7 point effect — I compute that before launch and commit to the duration, because peeking daily and stopping at the first significant result is how flat experiments become wins. If I do want to peek, I use a sequential test with an alpha-spending boundary rather than pretending a fixed-horizon test allows it. Second, multidimensionality: I declare one primary metric and treat everything else as secondary or guardrail, with the decision rule that the primary decides, guardrails can veto, and secondaries inform but never rescue a flat primary. When arms split across dimensions — B writes better but slower, or B is preferred by new users and disliked by power users — the segmented result is the finding, and the right outcome is often to ship B to the segment that likes it rather than to force a global winner.',
      deploy:
        'Guardrail metrics are monitored continuously with automatic stopping: safety-filter trigger rate, error rate, p95 latency and cost per session each have a threshold that halts the experiment and reverts all users to control without waiting for a human. That is separate from the significance test and deliberately trigger-happy, because a harmful arm should stop in minutes rather than at the end of the run. When the experiment comes back flat but the team believes the new model is better, the honest answers are: the effect is real but smaller than the experiment could detect, so either accept that it does not matter commercially or run longer with a stated smaller effect size; or the metric does not capture what improved, in which case find the segment or the sub-task where it should show and test there. What I would not do is ship on belief and call the flat result inconclusive, which is how a team accumulates a decade of unmeasured changes.',
      wrapup:
        'The decision rule is committed in writing before launch: primary metric, direction, minimum detectable effect, run duration, guardrail thresholds, and what we do on flat. Writing it down is most of the value, because it removes the post-hoc reasoning that generative metrics invite. An A/B test is the wrong instrument when traffic is too small to ever reach power — a B2B feature with 300 weekly users will not detect a 2 point effect this decade, and there the right tools are paired human evaluation on a curated set and qualitative interviews — and when the change is a safety fix or a legal requirement, where the decision does not depend on the metric anyway.',
      numbers: [
        'Sample size: detecting a 2 percentage point lift on a 40 percent base at 80 percent power and 5 percent significance needs about 2 x 7.85 x 0.24 / 0.0004, roughly 9,400 users per arm.',
        'Run length: at 5,000 eligible users per arm per day that is about two days for a 2 point effect, and roughly 15 days for a 0.7 point effect — the effect size, not the calendar, sets the duration.',
        'Latency confound: if arm B is 900ms slower at p50, expect a measurable engagement drop from latency alone, which is why a latency-matched control arm is worth its cost when the arms differ in model size.',
        'Logging: variant, metrics and token counts at roughly 400 bytes per session x 1M sessions/day = 400MB/day retained long-term, while prompts and completions are sampled at 2 percent with a 14-day TTL.',
      ],
    },
    delivery: {
      budget: { requirements: 7, estimates: 7, apiAndData: 6, architecture: 11, deepDive: 10, wrapUp: 4 },
      opening:
        'The hardest part of this is that there is no natural success event on a generated paragraph, so I want to build a metric hierarchy first — a primary completion metric, implicit secondaries with their known biases, and cost and latency as guardrails.',
      traps: [
        'Randomising by request. The same user seeing both arms contaminates their own baseline and makes session-level outcome metrics meaningless.',
        'Ignoring that the better model is also slower and more expensive. Latency is a confound that can swamp a real quality gain, and cost belongs as a guardrail with a declared ceiling.',
        'Peeking daily and stopping on the first significant result. Generative metrics are noisy enough that this manufactures wins; commit to a duration or use a sequential test.',
        'Reporting the aggregate only. Generative changes frequently help one segment and hurt another, and the segmented result is usually the actual finding.',
      ],
      whenPushed: [
        {
          challenge: 'Two weeks is too slow. The team wants to ship on Friday.',
          answer:
            'Then we are choosing a larger minimum detectable effect, and I would say that explicitly: with three days of data we can detect a 4 point move, so if the change is expected to be subtle the experiment cannot answer the question in that window. I would ship behind a flag with guardrails on, keep the experiment running, and be honest that the Friday decision is a judgement call rather than a measured one.',
        },
        {
          challenge: 'Why not just use an LLM judge on production traffic instead of an A/B test?',
          answer:
            'I do, as a fast leading indicator, and it is much quicker to move. But a judge measures whether the output looks better by a rubric I wrote, and the A/B test measures whether users did more of what the product exists for. When they disagree I trust the behavioural metric, because the judge shares its blind spots with the model being judged.',
        },
      ],
    },
    diagram: `flowchart TD
  U["User"] --> ASSIGN["Experiment service: hash(user id, experiment id)"]
  ASSIGN -->|control| A["Arm A: current config"]
  ASSIGN -->|treatment| B["Arm B: new model"]
  ASSIGN -.->|when arms differ in speed| C["Arm C: control + matched latency"]
  A --> FEAT["Generative feature"]
  B --> FEAT
  C --> FEAT
  FEAT --> EV["Events stamped with variant + trace id"]
  EV --> PRIM[("Primary: task completion")]
  EV --> SEC[("Secondary: regen rate, edit distance, continuation")]
  EV --> GUARD[("Guardrails: p95 latency, cost/session, safety triggers, errors")]
  GUARD -->|threshold breach| STOP["Auto-stop, revert to control"]
  PRIM --> STAT["Fixed-horizon or alpha-spending sequential test"]
  STAT --> SEGS["Segmented readout: new vs power users, surface, locale"]
  SEGS --> DEC["Pre-committed decision rule"]
  FEAT -.->|2% sample, 14-day TTL| QUAL[("Qualitative review of losing arm")]`,
  },
  {
    id: 'aisdq-llm-tracing-observability',
    patternId: 'aisdp-eval-platform',
    title: 'Design tracing and observability for LLM applications',
    companies: ['microsoft', 'amazon', 'google'],
    minutes: 45,
    steps: {
      define: [
        'What question must a trace answer that a normal APM trace cannot?',
        'Who is the user of this system — an on-call engineer, a prompt engineer, or a support agent handling a complaint?',
        'What is the retention requirement, and who sets it?',
      ],
      data: [
        'What exactly goes in a span for a model call, a retrieval, and a tool call?',
        'How large is this data, and what does full-fidelity capture cost per day?',
        'How do you store prompts and completions when they contain customer data?',
      ],
      architecture: [
        'Draw the pipeline from an instrumented call to a queryable trace.',
        'How do you sample without losing the traces you actually need?',
        'How do you link a user complaint to the exact trace that produced the bad answer?',
        'How do you attribute cost to a team, a feature and a customer from these traces?',
      ],
      evaluate: [
        'How do you detect a quality regression from traces alone, with no error rate change?',
        'What alerts would you actually page on?',
      ],
      deploy: [
        'How do you add instrumentation without every team writing it by hand?',
        'What happens when the tracing backend is down — does the application still serve?',
      ],
      wrapup: [
        'What does this cost as a fraction of the LLM bill, and is that proportionate?',
        'What is the first thing you would instrument if you could only do one?',
      ],
    },
    solution: {
      define:
        'A conventional APM trace answers where the time went. The question here is why this answer was bad, and that needs data an APM span deliberately does not carry: the resolved prompt including retrieved context, the model and its parameters, the completion, the token counts, and the eval or judge verdicts attached after the fact. Three users with three needs: on-call wants latency and error attribution across a multi-step chain; a prompt engineer wants to find the fifty worst outputs of the last day and see what they had in common; a support engineer wants to open the exact trace behind a specific complaint. Retention is set by legal and privacy rather than by engineering: metadata for 13 months for cost and audit, prompt and completion bodies for 30 days by default, and less where a customer contract says so.',
      data:
        'A model-call span carries model id and version, parameters, prompt token count, completion token count, cached-token count, latency split into time-to-first-token and total, finish reason, cost computed from the price table, and references to the prompt and completion bodies. A retrieval span carries the query, the retrieved document ids with scores, which ones survived reranking, and how many were dropped for context budget — that last field is what explains most bad RAG answers and almost nobody logs it. A tool-call span carries tool name, arguments, result size, latency, error, and whether it was a retry. Bodies go to a separate encrypted store keyed by trace id, with PII detection and redaction on write, so the trace index stays queryable and cheap while the sensitive payload is separately governed and separately deletable. At 10M LLM calls a day and roughly 6KB of body per call, that is 60GB a day of bodies against about 20GB of structured span metadata.',
      architecture:
        'Instrumentation is an SDK wrapper around the gateway client, so teams get spans by calling the client they already call — asking each team to instrument by hand guarantees inconsistent fields and missing traces. Spans go to a local collector, then to a stream, then to two sinks: a columnar store for structured span data, which is what powers aggregation and cost attribution, and the encrypted body store. Sampling is the crucial design choice and head-based random sampling is wrong here, because the traces you need are exactly the rare ones. So: tail-based sampling that keeps 100 percent of errors, 100 percent of thumbs-down and user-reported traces, 100 percent of traces above a latency or cost threshold, 100 percent of traces where a guardrail or safety filter fired, and a few percent of everything else for baseline distributions. Linking a complaint to a trace requires the trace id to travel outward: it is returned in the response headers and stored on the message record in the product, so support can paste a conversation id and land on the trace. Cost attribution falls out of the span data because every span carries tokens and a price, aggregated by the team, feature and tenant tags the gateway stamps on the request.',
      evaluate:
        'Detecting a silent quality regression from traces is the whole reason this exists, and it is done with distributional monitoring rather than thresholds on errors. I track, per feature and per model version: mean and p95 output length, refusal and decline rate, JSON parse-failure rate, tool-call rate and tool-call error rate, retrieval no-hit rate, number of chunks dropped for context budget, regeneration rate, and a sampled judge score. Each is compared against its own trailing baseline with a change-point test, because these move for legitimate reasons and a fixed threshold either pages constantly or never. The single most reliable early signal in my experience is output-length distribution shift — it moves for prompt changes, model swaps and context truncation alike. What I would page on is short: safety-filter rate spiking, JSON parse-failure rate above a hard floor for a structured-output feature, cost per hour above a ceiling, and end-to-end error rate. Judge-score drops raise a ticket rather than a page, because the judge is noisy and a 3am wake-up for a 2-point rubric move is how teams learn to ignore the alerting.',
      deploy:
        'The SDK wrapper is the deployment mechanism: a version bump gets a team new fields, and the collector tolerates missing fields so a lagging team degrades rather than breaks. Tracing must never be in the critical path — the collector is fire-and-forget over a local buffer, the buffer drops oldest on overflow, and a backend outage means we lose observability, not availability. I would state that explicitly, because the alternative failure has actually happened to people: a synchronous trace write to a struggling backend taking down the product it was monitoring. Body redaction runs before the body leaves the process where possible, so raw customer data is not written to a queue and then cleaned up later.',
      wrapup:
        'Cost: about 80GB a day of combined span and body data, which at an assumed 0.03 USD per GB-month for the columnar store and short retention on bodies is a few thousand dollars a month, against an LLM bill for 10M daily calls that is easily six figures a month. So observability is on the order of 1 to 3 percent of the model spend, which is proportionate for the only mechanism that explains a bad answer. If I could instrument one thing it would be the resolved prompt — the exact final string sent to the model, including retrieved context and applied template — because almost every quality investigation ends up there, and it is the field teams most often fail to capture.',
      numbers: [
        'Volume: 10M LLM calls/day x 6KB of body = 60GB/day of bodies plus about 20GB/day of structured spans, so 80GB/day and roughly 2.4TB/month at full fidelity.',
        'Sampling economics: keeping 100 percent of errors, flagged and expensive traces plus 3 percent of the rest cuts stored volume by about 95 percent while retaining every trace an investigation would want.',
        'Cost ratio: a few thousand USD/month of storage against a six-figure monthly model bill puts observability at roughly 1-3 percent of LLM spend.',
        'Retention split: metadata at about 20GB/day for 13 months is 7.8TB, while bodies at 60GB/day for 30 days is 1.8TB — separating the two is what makes long audit retention affordable.',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 6, apiAndData: 8, architecture: 11, deepDive: 10, wrapUp: 4 },
      opening:
        'I want to be clear that this is not APM with extra fields: the question a trace has to answer is why the answer was bad, which means the resolved prompt and the retrieval decisions are first-class span data.',
      traps: [
        'Head-based random sampling. The traces worth keeping are the rare bad ones, so sampling must be tail-based on error, feedback, cost and guardrail signals.',
        'Not logging the resolved prompt. Logging the template and the variables separately means nobody can reproduce what the model actually saw once retrieval is in the loop.',
        'Making trace writes synchronous. A struggling observability backend must never be able to take down the product it is observing.',
        'Alerting on judge score. It is noisy, it pages at 3am for a rubric wobble, and within a month everyone ignores the channel.',
      ],
      whenPushed: [
        {
          challenge: 'Storing prompts and completions is a privacy problem you have just created.',
          answer:
            'It is, and I would rather design it deliberately than have teams keep them in application logs, which is what happens otherwise. Bodies live in a separate encrypted store with redaction on write, a 30-day default TTL, per-tenant opt-out, tenant-scoped deletion, and access that is audited. The trace index itself holds no customer content, so the useful aggregate work needs no access to bodies at all.',
        },
        {
          challenge: 'Can you not just use your existing OpenTelemetry setup?',
          answer:
            'Yes for transport and context propagation, and I would: these are OTel spans with a semantic convention for model calls. What OTel does not give me is the body store with its own retention and redaction, the tail-sampling policy driven by feedback signals, or the cost attribution from token counts. So it is a layer on OTel rather than a parallel system.',
        },
      ],
    },
    diagram: `flowchart TD
  APP["App calls gateway SDK"] --> SPANS["Auto-instrumented spans"]
  SPANS --> MS["Model span: model+version, params, tokens, TTFT, finish reason, cost"]
  SPANS --> RS["Retrieval span: query, doc ids + scores, survived rerank, chunks dropped"]
  SPANS --> TS["Tool span: name, args, result size, retry, error"]
  MS --> COL["Local collector (fire-and-forget, drops on overflow)"]
  RS --> COL
  TS --> COL
  COL --> STREAM["Stream"]
  STREAM --> TAIL["Tail sampler: keep all errors, feedback, over-cost, guardrail hits, 3% baseline"]
  TAIL --> COLD[("Columnar span store, 13 months")]
  TAIL --> BODY[("Encrypted body store, redacted on write, 30-day TTL")]
  COLD --> COST["Cost attribution by team, feature, tenant"]
  COLD --> DIST["Distribution monitors: output length, refusal, JSON failures, no-hit rate"]
  DIST --> CP["Change-point test vs trailing baseline"]
  CP -->|safety, JSON floor, cost ceiling, errors| PAGE["Page"]
  CP -->|judge score drop| TICKET["Ticket, not a page"]
  RESP["Response headers carry trace id"] --> SUPPORT["Support: complaint to exact trace"]`,
  },
]

/**
 * Pattern 6 — multimodal. Pixels and audio have their own cost curves: diffusion scales with
 * steps and resolution rather than output length, video chunking is the extreme case of the
 * granularity trade, and streaming speech trades accuracy against latency directly.
 */
const multimodalQuestions: AiSdQuestion[] = [
  {
    id: 'aisdq-multimodal-search',
    patternId: 'aisdp-multimodal',
    title: 'Design multimodal search over text, image and video',
    companies: ['google', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What queries must work: text to image, image to image, text to video moment, or all of them?',
        'What does a result look like — a whole asset, or a timestamp inside one?',
        'What corpus size and what growth rate are we designing for?',
      ],
      data: [
        'How do you embed a video, and what is the unit: the file, a shot, a frame?',
        'Size the index for each choice and show what the granularity decision costs.',
        'What metadata and text signals exist alongside the pixels, and how valuable are they?',
      ],
      architecture: [
        'One shared embedding space or separate per-modality indexes, and why?',
        'Draw the ingestion pipeline for a two-hour video.',
        'How do you serve a text-to-video-moment query in under a second?',
        'How do you combine visual similarity with text signals like titles, captions and transcripts?',
      ],
      evaluate: [
        'How do you build ground truth for cross-modal retrieval?',
        'What quality metric matters, and how does it differ per query type?',
      ],
      deploy: [
        'How do you re-embed a petabyte-scale corpus when the model improves?',
        'How do you handle a modality the current model handles badly, like text inside images?',
      ],
      wrapup: [
        'What dominates cost: ingestion or serving?',
        'What would you drop from v1?',
      ],
    },
    solution: {
      define:
        'All four query types, but they are not equally hard and I would sequence them. Text-to-image and image-to-image are one shared-space problem and can ship first. Text-to-video-moment is the difficult one, because the result is a timestamp rather than an asset, and it is also the most valuable — users want the moment, not the two-hour file. So the result unit is a timestamped segment with the asset as its parent. Corpus assumption: 200M images and 1M hours of video, growing 20 percent a year, which is large enough that the granularity decision dominates the cost model and small enough to fit in a memory-resident index if the vectors are compressed.',
      data:
        'Video granularity is the central trade and I would work it explicitly. One embedding per file is useless for moment retrieval. One per frame at 1 frame per second over 1M hours is 3.6 billion vectors, which at 768 dimensions in int8 is about 2.8TB before graph overhead — expensive but not impossible, and mostly redundant, because consecutive seconds of the same shot are near-identical. So: shot-boundary detection first, then a small number of representative frames per shot — typically 1 to 3 — pooled into one shot embedding, plus keeping the individual frame embeddings only for shots longer than a few seconds. At an average shot length of 5 seconds that is about 720M shot vectors, roughly 550GB in int8, a fifth of the per-frame cost with almost all of the retrieval value. Alongside pixels there is a great deal of text that is usually undervalued: titles, descriptions, on-screen text via OCR, and above all the audio transcript, which for talking-head content is often a stronger retrieval signal than the visual embedding.',
      architecture:
        'A shared embedding space for text, image and video frames — a CLIP-style dual encoder — because it makes text-to-image, image-to-image and text-to-frame one index and one query path, and the operational simplicity is worth real money. I pair it with per-modality specialists rather than pretending the shared space is enough: a text index over transcripts and metadata, and OCR text indexed as text. Retrieval is then hybrid across those, fused by reciprocal rank fusion and reranked. Ingestion for a two-hour video: demux, decode, shot-boundary detect, sample representative frames per shot, embed frames, pool to shot vectors, run ASR on the audio to a timestamped transcript, run OCR on sampled frames, then write shot vectors, transcript segments and OCR text with their timestamps. That is a minutes-long GPU job per video and it runs on a queue with spot capacity, because it is latency-tolerant. Serving a moment query in under a second: query embedding, ANN over shot vectors and BM25 over transcript segments in parallel, fuse, then rerank the top candidates with a cross-modal reranker that scores the query against a few frames plus the transcript window — the rerank is where the moment gets localised precisely, and it only runs on 50 to 100 candidates so it fits the budget.',
      evaluate:
        'Cross-modal ground truth is expensive, so I build it in layers. Free weak labels from user behaviour: click-through on results, and dwell or play-past-the-moment for video. Cheap synthetic labels: use captions and transcripts as pseudo-queries for the asset they describe, which gives millions of pairs with a known bias toward describable content. And a small human-labelled gold set of a few thousand real queries with graded relevance, which is what the other two are calibrated against. Metrics differ by query type and reporting one number hides that: recall at 10 for text-to-image where users scan a grid, precision at 1 for image-to-image duplicate finding where a single right answer exists, and for moment retrieval a temporal IoU against the labelled span, because returning the right video at the wrong minute is a failure users feel sharply.',
      deploy:
        'Re-embedding at this scale is a serious project, not a job: 720M shots plus 200M images is close to a billion embeddings, and at an assumed 2,000 images per GPU-second that is roughly 130 GPU-hours of pure inference plus decode, which is affordable, while the decode and I/O of re-reading a petabyte of source media is what actually dominates. So representative frames are cached as small JPEGs at ingest time, which makes re-embedding a re-read of a few terabytes rather than a petabyte — that single decision is the difference between a two-day backfill and a two-month one. Cutover is a parallel index with a gold-set evaluation gate and a per-surface flag. For a modality the model handles badly, the honest answer is to route around it: dense visual embeddings are famously weak at text inside images, so OCR plus a text index carries that case rather than waiting for a better encoder.',
      wrapup:
        'Ingestion dominates by a wide margin: decode, shot detection, ASR and embedding for a two-hour video is several GPU-minutes, while a query is milliseconds of ANN plus a small rerank. That is the opposite of the LLM serving pattern and it changes the operational posture — ingestion runs on spot and preemptible capacity with a queue and no latency SLO, and serving runs on a small, stable, memory-heavy fleet. From v1 I would drop image-to-image duplicate search and OCR, ship text-to-image and transcript-based video search, and add the visual moment retrieval once the shared-space quality is measured on the gold set.',
      numbers: [
        'Granularity cost: 1M hours at 1 frame/s = 3.6B vectors, about 2.8TB at 768 dims int8; shot-level at a 5-second average shot is 720M vectors, roughly 550GB — a 5x saving for a small recall loss.',
        'Ingestion cost per video: a 2-hour video needs decode, shot detection, roughly 1,440 frame embeddings, ASR over 2 hours of audio and sampled OCR — several GPU-minutes, versus milliseconds to serve a query against it.',
        'Re-embedding: about 1B embeddings at an assumed 2,000 per GPU-second is roughly 140 GPU-hours of inference; caching representative frames as JPEGs at ingest turns the source re-read from petabytes into a few terabytes.',
        'Serving budget: 5ms query embed + 20ms ANN over 720M compressed vectors + 15ms BM25 + 200ms cross-modal rerank on 80 candidates = about 240ms, inside a one-second target.',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 9, apiAndData: 10, architecture: 15, deepDive: 13, wrapUp: 5 },
      opening:
        'The decision that sets the cost of this whole system is video granularity, so let me price per-frame against per-shot embeddings before I draw anything, because it is a five-fold difference in index size.',
      traps: [
        'Embedding whole videos. It makes moment retrieval impossible, and the moment is what users actually want.',
        'Ignoring the transcript. For a lot of video the audio transcript is a stronger retrieval signal than any visual embedding, and it is nearly free once you are running ASR anyway.',
        'Assuming a shared embedding space is enough. It is beaten per-modality by specialists, and it is specifically weak on text inside images, which OCR plus a text index handles far better.',
        'Not caching representative frames at ingest. Without them a re-embedding campaign means re-decoding the entire source corpus, which turns a two-day job into a two-month one.',
      ],
      whenPushed: [
        {
          challenge: 'Why not one index per modality with separate models?',
          answer:
            'For pure quality on a single modality, specialists win, and I keep specialists for text. The shared space earns its place on the cross-modal queries, which are the product: a text query against a frame index needs both in the same space, and maintaining a separate bridging model per pair does not scale past three modalities.',
        },
        {
          challenge: 'Your cross-modal reranker at 200ms is most of your latency budget.',
          answer:
            'It is, and it is what localises the moment, which is the thing the first-stage retrieval cannot do. If I needed the budget I would cut the candidate set from 80 to 30 and measure the temporal IoU loss on the gold set, and I would cache reranker scores for popular queries, which in search follow a heavy head.',
        },
      ],
    },
    diagram: `flowchart TD
  VID["2-hour video"] --> DEC["Demux + decode"]
  DEC --> SHOT["Shot-boundary detection (~5s average)"]
  SHOT --> FR["Sample 1-3 representative frames per shot"]
  FR --> JPG[("Cached frame JPEGs (makes re-embedding cheap)")]
  FR --> VEMB["Shared-space frame encoder"]
  VEMB --> POOL["Pool to shot vector"]
  POOL --> VIDX[("Shot vector index: 720M x int8")]
  DEC --> ASR["ASR to timestamped transcript"]
  FR --> OCR["OCR on sampled frames"]
  ASR --> TIDX[("Transcript + OCR text index (BM25)")]
  OCR --> TIDX
  IMG["200M images"] --> VEMB
  Q["Text or image query"] --> QE["Shared-space query encoder"]
  QE --> VIDX
  Q --> TIDX
  VIDX -->|top 100| RRF["Reciprocal rank fusion"]
  TIDX -->|top 100| RRF
  RRF -->|top 80| XR["Cross-modal reranker: frames + transcript window"]
  XR --> RES["Timestamped moment + parent asset"]
  GOLD[("Gold set: graded relevance, temporal IoU")] --> XR`,
  },
  {
    id: 'aisdq-image-generation-service',
    patternId: 'aisdp-multimodal',
    title: 'Design an image generation service',
    companies: ['google', 'amazon', 'microsoft'],
    minutes: 45,
    steps: {
      define: [
        'What is the latency expectation, and how does it differ from a text model?',
        'What resolutions and aspect ratios must be supported, and what does each cost?',
        'What safety obligations attach to generated images specifically?',
      ],
      data: [
        'What governs the cost of one image, and how is that different from tokens?',
        'What must be stored: the image, the prompt, the seed, or all three?',
      ],
      architecture: [
        'Draw the request path and say where the GPU time goes.',
        'How do you batch diffusion requests, and how is that different from batching an LLM?',
        'How do you give the user progress on a 4-second generation?',
        'How do you handle the safety pipeline without doubling latency?',
      ],
      evaluate: [
        'How do you measure image quality at scale when it is subjective?',
        'How do you detect that a model update made a category of prompts worse?',
      ],
      deploy: [
        'How do you roll out a new checkpoint when outputs change completely?',
        'How do you handle the fact that the same prompt and seed must reproduce the same image?',
      ],
      wrapup: [
        'What is the cost per image and what are the levers?',
        'When would you generate at lower quality deliberately?',
      ],
    },
    solution: {
      define:
        'Latency expectation is 3 to 6 seconds for a standard image, and the psychology is different from text: there is no streaming payoff because a half-denoised image is not useful in the way half a sentence is, so the wait is a real wait and the product needs a progress affordance rather than a stream. Resolutions: 1024x1024 as the default plus common aspect ratios at similar pixel counts, with a 2048 upscale as a separate, more expensive operation rather than a native generation. That matters because diffusion cost scales with the number of latent pixels, so doubling each side is roughly four times the work. Safety obligations are heavier than for text and legally specific: no generation of CSAM under any circumstance, restrictions on real-person likeness and on public figures, and provenance metadata on every output, which for images means an embedded C2PA-style credential and an invisible watermark rather than a policy statement.',
      data:
        'Cost is governed by denoising steps times latent resolution, and not at all by prompt length — which is the single most important difference from LLM serving and reframes every optimisation. Halving steps halves cost linearly; the levers are step count, the scheduler (a better scheduler reaches the same quality in fewer steps), resolution, and model size. What is stored: the image in object storage with a CDN in front, and a generation record holding prompt, negative prompt, seed, model checkpoint version, scheduler, steps, guidance scale and resolution. Storing the seed and full parameters is what makes reproduction possible and it costs almost nothing; teams that omit it cannot regenerate a user image after a bug and cannot investigate a safety report properly.',
      architecture:
        'Request path: prompt safety classification on text first, which is cheap and rejects the clearly disallowed before any GPU is used; enqueue; a worker on a GPU runs the denoising loop; the output goes through an image safety classifier and a watermarker; then to object storage and the CDN, with the URL returned. Batching is genuinely different from LLM batching: every request in a diffusion batch does the same number of steps on the same shaped latent, so a batch is a clean, uniform matrix operation with no continuous-batching machinery and no KV cache at all — you simply group requests with the same resolution and step count. That means batching is easy and effective, but it also means a batch cannot admit a latecomer mid-run, so the scheduler holds a short window, tens of milliseconds, to gather same-shape requests, and that window is a direct latency-versus-throughput knob. Progress is reported as step count over total, and optionally as a preview decoded from the latent at a few checkpoints, which is cheap and greatly improves perceived latency. The safety pipeline runs in parallel where it can: text classification happens while the request queues, and the image classifier runs on the GPU immediately after the last denoising step while the image is still resident, so it adds tens of milliseconds rather than a second.',
      evaluate:
        'Automated metrics for image quality are weak and I would say so rather than quoting one: FID measures distributional similarity to a reference set and does not track human preference at the level of one image, and CLIP score measures prompt adherence and is easily gamed. So the ranking signal is human preference on a fixed prompt suite — a few thousand pairwise comparisons per checkpoint, which is affordable and is the only measurement I would gate a release on — supported by cheaper proxies that are directional. To catch a category regression, the prompt suite is deliberately stratified: portraits, hands, text rendering, styles, compositions with multiple subjects, and known-hard cases, and results are reported per stratum. Model updates almost never regress uniformly; they trade a category away, and only a stratified suite shows it.',
      deploy:
        'A new checkpoint changes every output, so there is no diff and no gradual behavioural rollout in the usual sense. The rollout is: stratified prompt suite with pairwise human preference against the current checkpoint, then a limited public exposure behind an opt-in preview, then default with the old checkpoint still selectable by version for a deprecation window. Version-pinning is essential here because users build workflows around a checkpoint appearance, and silently replacing it is the single most-hated thing an image service can do. Reproducibility is a promise I would scope carefully: same prompt, seed, checkpoint, scheduler, step count and resolution should reproduce the image, and I would pin all of those in the generation record — but I would state that exact bitwise reproduction is not guaranteed across different GPU models or library versions, because floating-point non-determinism in attention kernels is real. Promising bitwise reproducibility across a heterogeneous fleet is a promise you will break.',
      wrapup:
        'Cost per image: at an assumed 3 seconds of H100 time at 2.50 USD per GPU-hour, a single image is about 0.0021 USD, and batching four same-shape requests brings the per-image GPU time down to well under a second, roughly 0.0006 USD. The levers in order are step count, batch efficiency, resolution and model size — and notably not prompt engineering, which is free. I would deliberately generate at lower quality for previews and iteration: a 4-step distilled model at low resolution gives a usable thumbnail in under a second, users choose from four of those, and only the chosen composition is generated at full quality. That pattern cuts total cost per satisfied user by a large factor because most generations are discarded during exploration.',
      numbers: [
        'Cost per image: 3 seconds of GPU at an assumed 2.50 USD/GPU-hour = 0.0021 USD; at batch 4 the per-image GPU time falls to roughly 0.9 seconds, about 0.0006 USD.',
        'Resolution scaling: 2048x2048 is 4x the latent pixels of 1024x1024, so roughly 4x the cost per step — which is why upscaling is a separate cheaper operation rather than native high-res generation.',
        'Step scaling: cost is linear in denoising steps, so a scheduler reaching acceptable quality in 20 steps instead of 50 is a 60 percent cost cut with no hardware change.',
        'Preview pattern: four 4-step low-resolution previews at roughly 0.15 seconds of GPU each cost about 0.0004 USD total, less than one full generation, and remove most of the discarded full-quality generations.',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 7, apiAndData: 6, architecture: 12, deepDive: 10, wrapUp: 4 },
      opening:
        'The thing I want to establish first is that diffusion cost is steps times latent resolution and has nothing to do with prompt length, because that inverts most of the intuitions carried over from LLM serving.',
      traps: [
        'Applying LLM serving reasoning. There is no KV cache, batching is uniform and simple, and prompt length is nearly free — the cost model is steps and pixels.',
        'Not storing the seed and full generation parameters. Without them you cannot reproduce a user image to investigate a complaint or a safety report.',
        'Silently replacing a checkpoint. Users build workflows around an appearance, so version-pin and give a deprecation window.',
        'Running the safety classifier as a separate round trip after the image has left the GPU, doubling latency for something that costs tens of milliseconds if done in place.',
      ],
      whenPushed: [
        {
          challenge: 'Can you not stream the image as it denoises, like tokens?',
          answer:
            'You can decode intermediate latents to previews and I do that for progress, but it is not the same product win: a half-denoised image is not usable, whereas half a sentence is readable. So it improves perceived latency without changing the fact that the user waits for the whole thing, and the bigger perceived-latency win is the cheap-preview-then-refine pattern.',
        },
        {
          challenge: 'Watermarking is easily stripped, so why bother?',
          answer:
            'Invisible watermarks are removable by a determined adversary and I would not claim otherwise. They are still worth it because most provenance questions are not adversarial — they are a platform asking whether an image was generated — and because the C2PA metadata plus a server-side hash registry of what we generated answers that even when the watermark is gone.',
        },
      ],
    },
    diagram: `flowchart TD
  REQ["Prompt + params"] --> TXTSAFE["Text safety classifier (pre-GPU reject)"]
  TXTSAFE --> QUEUE["Scheduler: gather same shape+steps, ~tens of ms window"]
  QUEUE --> BATCH["Uniform diffusion batch (no KV cache)"]
  BATCH --> LOOP["Denoising loop: cost = steps x latent pixels"]
  LOOP -->|latent at checkpoints| PREV["Decoded progress previews"]
  LOOP --> IMGSAFE["Image safety classifier, on-GPU, in place"]
  IMGSAFE -->|blocked| REJ["Reject + log"]
  IMGSAFE --> WM["Invisible watermark + C2PA credential"]
  WM --> OBJ[("Object store")]
  OBJ --> CDN["CDN"]
  REQ --> GREC[("Generation record: prompt, seed, checkpoint, scheduler, steps, resolution")]
  GREC --> REPRO["Reproduce on demand (same GPU class only)"]
  CHK["New checkpoint"] --> SUITE["Stratified prompt suite: portraits, hands, text, styles"]
  SUITE --> PAIR["Pairwise human preference vs current"]
  PAIR -->|gate| CHK
  FAST["4-step distilled preview model"] --> PREV`,
  },
  {
    id: 'aisdq-realtime-transcription',
    patternId: 'aisdp-multimodal',
    title: 'Design real-time transcription at scale',
    companies: ['microsoft', 'google', 'amazon'],
    minutes: 45,
    steps: {
      define: [
        'What does real-time mean here in milliseconds, and who feels that latency?',
        'What accuracy target, and measured how — is word error rate the right metric for this product?',
        'Is this one speaker or a meeting with many, and does that change the system or just the model?',
      ],
      data: [
        'What is the audio ingest volume, and what does that mean for bandwidth and storage?',
        'What context does the model need beyond the audio to be accurate — names, jargon, prior turns?',
      ],
      architecture: [
        'Draw the path from a microphone to a displayed word.',
        'How do you chunk a continuous audio stream for a model that expects windows?',
        'How do you handle the accuracy-versus-latency trade explicitly?',
        'How many concurrent streams fit on one GPU, and how do you schedule them?',
      ],
      evaluate: [
        'How do you measure quality without a transcript of every call?',
        'What accuracy differences would you specifically test for across speaker groups?',
      ],
      deploy: [
        'How do you deploy a new acoustic model when a live meeting is in progress?',
        'What is the degradation path when GPU capacity runs out mid-meeting?',
      ],
      wrapup: [
        'What is the cost per hour of audio, and how does that compare with the alternative?',
        'What would you simplify if the transcript could be delivered after the meeting?',
      ],
    },
    solution: {
      define:
        'Real-time means a word appears within about 300ms of being spoken for live captions, and the person who feels it is the reader, not the speaker — which matters because it lets me spend latency asymmetrically. The right accuracy metric is not raw word error rate: a product that transcribes a meeting is judged on whether names, numbers, and action items are right, so I measure entity error rate on names and numbers alongside WER, and weight the former heavily. A 5 percent WER with every participant name wrong is a bad product and a 7 percent WER with names right is a good one. Multi-speaker changes the system, not just the model: diarisation is a separate component with its own latency profile, and speaker labels can lag the words, which is a useful product concession because attributing a sentence a second later is acceptable while displaying it a second later is not.',
      data:
        'Audio at 16kHz mono in 16-bit PCM is 32KB per second, so 10,000 concurrent streams is about 320MB/s of ingest — real but modest, and Opus-compressed at the edge it is closer to 25MB/s. Storage is the bigger question: an hour of raw audio is 115MB, so retaining audio for a million meeting-hours a month is over 100TB, which is why audio retention is short and policy-driven while transcripts, at a few hundred kilobytes an hour, are kept. Context beyond the audio is what separates a good transcription product from a raw ASR endpoint: participant names from the calendar invite, the organisation glossary of product names and acronyms, prior meeting transcripts in the same series, and the shared document open in the meeting. These are supplied as a biasing context — a contextual bias list at decode time — and they are where the entity error rate improvement actually comes from.',
      architecture:
        'Client captures at 16kHz, applies voice activity detection locally so silence is not transmitted or billed, encodes with Opus, and streams over WebRTC or a WebSocket to a media gateway. The gateway decodes and hands a per-stream buffer to an ASR worker on a GPU. Chunking is the core mechanism: the model consumes overlapping windows, say 1 second of new audio with 4 seconds of left context and a small right-context lookahead, emitting partial hypotheses that are revised as more audio arrives. Right context is where the accuracy-latency trade lives, and I make it explicit: 200ms of lookahead measurably improves word accuracy at word boundaries and delays every word by 200ms, so it is a product-tunable parameter, with live captions taking a small lookahead and a note-taking transcript taking a larger one. The client shows partials in grey and finalises them when a segment is committed, which lets the system revise without the display flickering distractingly. A second-pass model runs behind the live path on the committed segments with full context, plus punctuation and casing, and it produces the transcript people actually read afterwards — the live path optimises latency and the second pass optimises accuracy, and that split is what stops one component being forced to be good at both.',
      evaluate:
        'There is no transcript of every call, so quality measurement is sampled and consented: a small set of customers on a research agreement provide audio for human transcription, and a synthetic set covering accents, noise conditions and domain vocabulary is maintained permanently. Beyond that, proxies from production: the rate at which the second pass materially disagrees with the live pass, the frequency of user edits when a transcript is editable, and the confidence distribution emitted by the model, which shifts before accuracy does. What I would test for specifically, and report separately, is accuracy across accent and dialect groups, across gender, across noise conditions, and on non-native speakers of the transcription language — ASR systems have a well-documented history of large disparities across exactly these groups, and an aggregate WER hides them completely. I would treat a gap between groups as a launch blocker rather than a backlog item.',
      deploy:
        'A live meeting cannot be interrupted by a deploy, so ASR workers drain: a worker stops accepting new streams and keeps existing ones until they end, with a maximum bound of a few hours after which a stream is migrated. Migration is possible because the per-stream state is small — the audio buffer and the decoder state — and can be transferred, but a migration costs a brief accuracy dip at the seam, so it is a last resort rather than the routine path. Capacity exhaustion mid-meeting has a designed degradation ladder rather than a failure: first reduce right-context lookahead and increase chunk size, which lowers per-stream compute at a small accuracy cost; then move new streams to a smaller, faster model; then drop live captions for new joiners while keeping the recording, so the post-meeting transcript is unaffected. Losing live captions is a much better failure than losing the transcript.',
      wrapup:
        'Cost per hour of audio: if one GPU sustains roughly 40 concurrent streams with the live model, an hour of audio costs about 1/40th of a GPU-hour, or 0.06 USD at an assumed 2.50 USD per GPU-hour, plus the second pass at a fraction of that since it runs batched and offline. Against human transcription at tens of dollars per hour, that is not a close comparison, which is why the interesting constraints here are latency and fairness rather than cost. If the transcript could be delivered after the meeting, the entire design collapses: no streaming, no chunking, no partial revision, no right-context trade — just a batch job on whole files with full bidirectional context, which is both cheaper per hour and more accurate. Live captioning is where all the complexity lives, and it is worth knowing that when scoping.',
      numbers: [
        'Ingest: 16kHz 16-bit mono is 32KB/s raw, so 10,000 concurrent streams is about 320MB/s, or roughly 25MB/s Opus-compressed at the edge.',
        'GPU density: at an assumed 40 concurrent streams per GPU, 10,000 streams need 250 GPUs, so peak-hour concurrency rather than total audio volume is what sizes the fleet.',
        'Cost per audio hour: 1/40th of a GPU-hour at an assumed 2.50 USD/GPU-hour = about 0.06 USD, against tens of USD for human transcription.',
        'Latency budget: 100ms capture and network + 1s chunk with 200ms right-context lookahead + 50ms inference, with partials emitted continuously so a word displays roughly 300ms after it is spoken.',
      ],
    },
    delivery: {
      budget: { requirements: 7, estimates: 6, apiAndData: 6, architecture: 12, deepDive: 10, wrapUp: 4 },
      opening:
        'I want to separate the live path from the post-meeting path early, because forcing one model to be both low-latency and maximally accurate is the mistake that makes these systems mediocre at both.',
      traps: [
        'Reporting aggregate word error rate only. ASR disparities across accent, dialect and non-native speakers are large and well documented, and an aggregate number hides them entirely.',
        'Treating WER as the product metric. Users judge on names, numbers and action items, so entity error rate deserves more weight than raw WER.',
        'Ignoring contextual biasing. Participant names and organisation jargon supplied at decode time are where most of the accuracy gain on the words users care about comes from.',
        'No degradation ladder. When capacity runs out mid-meeting, dropping live captions while preserving the recording is far better than failing the stream.',
      ],
      whenPushed: [
        {
          challenge: 'Why not run the model on the device and skip the GPU fleet entirely?',
          answer:
            'For a single speaker on a modern laptop, on-device is genuinely competitive and I would offer it — it removes bandwidth, privacy and cost concerns at once. It breaks on multi-party meetings where a server already has all the streams, on low-end and mobile devices, and on contextual biasing against an organisation glossary you do not want to ship to every client. So: on-device where it fits, server for the rest, with the same transcript format.',
        },
        {
          challenge: 'Your 200ms lookahead is an arbitrary number.',
          answer:
            'It is a tunable I would set from measurement rather than defend as a constant. The shape is what matters: accuracy improves with right context and saturates, so the job is to find the knee on our own data and expose it per surface — small for live captions, larger for a note-taker where nobody is reading in real time.',
        },
      ],
    },
    diagram: `flowchart TD
  MIC["Client mic 16kHz"] --> VAD["On-device VAD (silence not sent)"]
  VAD --> OPUS["Opus encode"]
  OPUS -->|WebRTC / WebSocket| MG["Media gateway: decode, per-stream buffer"]
  MG --> SCHED["Stream scheduler (~40 streams per GPU)"]
  SCHED --> ASR["Live ASR: 1s chunk, 4s left context, 200ms lookahead"]
  BIAS[("Context bias: participant names, glossary, prior transcripts")] --> ASR
  ASR -->|partial hypotheses, revisable| CAP["Live captions (grey until committed)"]
  ASR --> COMMIT["Committed segments"]
  COMMIT --> P2["Second pass: full context, punctuation, casing"]
  P2 --> TR[("Transcript store")]
  MG --> DIAR["Diarisation (labels may lag words)"]
  DIAR --> TR
  SCHED -->|capacity pressure| DEG["Ladder: less lookahead, then smaller model, then drop live captions"]
  P2 -->|disagreement with live pass| QP[("Quality proxy")]
  GOLD[("Consented + synthetic sets: accents, noise, non-native speakers")] --> QP`,
  },
]

/**
 * Pattern 7 — training and fine-tuning infrastructure. The offline half: optimiser-state
 * arithmetic, sharding, checkpointing against node failure, dataset and model lineage, and
 * retraining without silent drift or a feedback loop.
 */
const trainingQuestions: AiSdQuestion[] = [
  {
    id: 'aisdq-finetuning-platform',
    patternId: 'aisdp-training-infra',
    title: 'Design a fine-tuning platform',
    companies: ['amazon', 'microsoft', 'google'],
    minutes: 60,
    steps: {
      define: [
        'Who is the user — an internal ML team or a customer uploading a CSV — and how much do they know?',
        'What problems does fine-tuning actually solve here that prompting and retrieval do not?',
        'What does a successful job produce, and how does the user know it worked?',
      ],
      data: [
        'Work out the memory needed for a full fine-tune versus LoRA on a 7B model.',
        'What validation must run on an uploaded dataset before a single GPU is allocated?',
        'How do you handle a customer who uploads 200 examples and expects a better model?',
      ],
      architecture: [
        'Draw the platform from dataset upload to a servable adapter.',
        'How do you schedule GPU jobs fairly across customers with very different job sizes?',
        'What is the artefact registry storing, and what lineage does it need to keep?',
        'How does a trained adapter get to the serving fleet?',
      ],
      evaluate: [
        'How do you tell a customer whether their fine-tune is better than the base model?',
        'What automatic checks would you run on every finished job?',
      ],
      deploy: [
        'How do you handle a job that fails 80 percent of the way through?',
        'How do you stop a customer from fine-tuning on data they should not have?',
      ],
      wrapup: [
        'What does a fine-tuning job cost, and how do you price it?',
        'When would you tell a customer not to fine-tune at all?',
      ],
    },
    solution: {
      define:
        'Both users, and the product is different for each: an internal ML team wants a job API with full hyperparameter control, a customer wants to upload examples and get a better model without knowing what a learning rate is. So the platform is one execution engine with two front doors, and the customer front door picks hyperparameters from heuristics on dataset size and task type rather than exposing them. Fine-tuning is worth doing for three things prompting cannot fix: a consistent output format or style, a narrow task where a small model can be lifted to large-model quality at a fraction of the serving cost, and behaviour that is hard to specify but easy to demonstrate. It is not the fix for missing knowledge, which is a retrieval problem, and being clear about that in the product saves an enormous amount of customer disappointment. Success is a comparison the user can read: this adapter beats the base model on your held-out examples by this much, with examples of both.',
      data:
        'The memory arithmetic decides the architecture. Full fine-tune of a 7B model in mixed precision: 14GB of BF16 weights, 14GB of gradients, and Adam optimiser state of about 12 bytes per parameter for fp32 momentum, variance and master weights, which is 84GB — roughly 112GB before activations, so it does not fit on one 80GB GPU and needs sharding or offload. LoRA at rank 16 trains around 20 to 40M parameters, so gradients and optimiser state are on the order of half a gigabyte, and the whole job fits on one GPU with room for a healthy batch size. That is a 200-fold difference in trainable state and it is why LoRA is the default and full fine-tuning is the exception a user must justify. Dataset validation before any GPU is allocated: schema and encoding, token-length distribution against the model context, deduplication, a train and validation split with leakage detection, PII scanning, a class-balance report, and a minimum-size warning. Two hundred examples can genuinely work for a narrow format-following task and cannot teach a domain, so the platform says which of those the user appears to be doing, based on task type and label diversity, rather than silently training and delivering a disappointment.',
      architecture:
        'Upload lands in object storage and triggers validation, which is cheap and CPU-only and rejects most bad jobs before they cost anything. A validated dataset becomes an immutable versioned artefact. Job submission goes to a queue with per-customer quotas, and the scheduler is gang-scheduling aware — a multi-GPU job needs all its GPUs simultaneously or it deadlocks against other pending jobs, which is the classic failure of naive queueing here. Fairness across very different job sizes uses dominant-resource fair share with backfill: small single-GPU jobs backfill into gaps while a large job waits for its full allocation, which keeps utilisation high without starving the big jobs. Training runs in a container with the dataset mounted read-only, checkpointing to object storage. On completion the adapter, the training config, the dataset version, the base model version, the metrics and the logs are written to a registry as one lineage record — being able to answer which data produced this adapter is both a debugging necessity and, increasingly, a compliance one. Promotion to serving is the multi-LoRA path: the adapter is registered, evaluated, and then a pointer flip makes it live, with no fleet deploy.',
      evaluate:
        'Every job automatically produces a comparison against the base model on the held-out split, using task-appropriate metrics — exact match or F1 for extraction, a rubric judge for generation, format validity always — plus a side-by-side sample of 20 outputs the user can read, which is what actually convinces someone. Automatic checks on every finished job: did training loss decrease and did validation loss stop decreasing before the end, which detects both a failed run and overfitting; is the adapter output still valid on a general capability probe, which catches catastrophic forgetting where a model fine-tuned to output JSON becomes unable to hold a conversation; did output length or refusal rate shift dramatically; and is the adapter numerically sane, with no NaN weights. A job that trained successfully and destroyed general capability is a common and confusing outcome, and surfacing it automatically is a large part of the platform value.',
      deploy:
        'A job failing at 80 percent is normal at scale and the answer is checkpointing plus automatic resume: checkpoints go to object storage every N steps, and a failed job restarts from the last checkpoint on new hardware rather than from zero, with the retry budget and the reason surfaced to the user. For a single-GPU LoRA job the checkpoint is small and frequent; for a large sharded job the checkpoint interval is a real trade-off against the time lost, which I would set from the observed mean time between failures on that hardware. Data governance is enforced before training, not after: the dataset is scanned for PII and for known copyrighted-content signatures, the customer attests to rights in the API contract, the lineage record ties the adapter to the exact dataset version, and deleting a dataset marks every adapter derived from it, because an adapter trained on data a customer later revokes is a problem you cannot solve if you did not record the link.',
      wrapup:
        'Cost: a LoRA fine-tune of a 7B model on 50M tokens is roughly 6 x 7e9 x 5e7 FLOPs for the forward and backward passes, about 2.1e18, which at an assumed 40 percent MFU on one H100 is around 1.5 hours, or 3.75 USD at 2.50 USD per GPU-hour. That is small enough that pricing per token trained with a healthy multiple works, and small enough that free trials are viable. I would tell a customer not to fine-tune when their problem is missing or changing knowledge, which is retrieval; when they have fewer than a few hundred examples and the task is not narrow formatting; when the base model already passes their evaluation, which is more often than people expect; or when they need the flexibility to change behaviour weekly, since a prompt changes in seconds and an adapter is a training run.',
      numbers: [
        'Full fine-tune of 7B in mixed precision: 14GB weights + 14GB gradients + about 84GB of Adam state (12 bytes/param) = roughly 112GB before activations, so it does not fit one 80GB GPU.',
        'LoRA rank 16 on 7B: about 20-40M trainable params, so gradients plus optimiser state are under 1GB — a roughly 200x reduction in trainable state, which is why it is the default.',
        'Job cost: 6 x 7e9 params x 5e7 tokens = 2.1e18 FLOPs; at an assumed 40 percent MFU on one H100 (about 400 TFLOP/s) that is roughly 1.5 hours, or 3.75 USD at 2.50 USD/GPU-hour.',
        'Validation gate: schema, dedup, leakage and PII checks are CPU-only and cost cents, and they reject the majority of bad jobs before a GPU is allocated at all.',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 9, apiAndData: 10, architecture: 15, deepDive: 13, wrapUp: 5 },
      opening:
        'Let me do the optimiser-state arithmetic first, because the 200-fold difference between full fine-tuning and LoRA in trainable state is what makes this a single-GPU product rather than a cluster product for most jobs.',
      traps: [
        'Forgetting optimiser state. Adam holds roughly 12 bytes per parameter in fp32, so the memory bill is several times the weights, and an answer that only counts weights is wrong by a factor of eight.',
        'Allocating a GPU before validating the dataset. Most bad jobs are detectable with a CPU-only pass, and running them anyway is pure waste plus a slower failure for the user.',
        'Naive FIFO queueing for multi-GPU jobs. Without gang scheduling, a large job accumulates GPUs while never having enough to start, and utilisation collapses.',
        'Not checking for catastrophic forgetting. A model fine-tuned to emit JSON that has lost general conversation ability trained perfectly by every loss curve.',
      ],
      whenPushed: [
        {
          challenge: 'Should you not just tell everyone to use RAG instead?',
          answer:
            'For knowledge, yes, and the product says so. Fine-tuning wins where prompting is unreliable rather than uninformed: consistent output structure, a house style, or lifting a small model on a narrow task so serving costs a twentieth as much. Those are real and retrieval does not address them. The two also compose — a fine-tuned model that follows your format, grounded by retrieval for the facts, is usually the right answer.',
        },
        {
          challenge: 'Customers will fine-tune on data they do not own.',
          answer:
            'Some will, so I make it detectable and traceable rather than pretending contract language solves it: scanning at upload, an attestation in the API, and a lineage record tying every adapter to a dataset version so a revocation can be executed. What I cannot do is verify provenance of arbitrary text, and I would say that to a legal reviewer plainly rather than implying the scanner is a guarantee.',
        },
      ],
    },
    diagram: `flowchart TD
  UP["Dataset upload"] --> VAL["CPU validation: schema, token lengths, dedup, leakage, PII, balance"]
  VAL -->|reject| ERR["Actionable error, no GPU used"]
  VAL --> DSV[("Immutable dataset version")]
  DSV --> SUB["Job submission (customer front door picks hyperparameters)"]
  SUB --> QUEUE["Queue: per-customer quota"]
  QUEUE --> SCHED["Gang-aware scheduler, DRF + backfill"]
  SCHED --> LORA["LoRA job: 1 GPU, <1GB trainable state"]
  SCHED --> FULL["Full fine-tune: sharded across GPUs, ~112GB state for 7B"]
  LORA --> CKPT[("Checkpoints to object store, auto-resume on failure")]
  FULL --> CKPT
  CKPT --> DONE["Adapter"]
  DONE --> AUTO["Auto checks: loss curves, general-capability probe, format validity, NaN scan"]
  AUTO --> CMP["Compare vs base on held-out split + 20 side-by-side samples"]
  CMP --> REG[("Registry: adapter, config, dataset version, base version, metrics, logs")]
  REG -->|pointer flip, no fleet deploy| SERVE["Multi-LoRA serving fleet"]
  DSV -.->|revocation marks derived adapters| REG`,
  },
  {
    id: 'aisdq-distributed-training-orchestration',
    patternId: 'aisdp-training-infra',
    title: 'Design distributed training orchestration',
    companies: ['google', 'microsoft'],
    minutes: 60,
    steps: {
      define: [
        'What scale of job are we orchestrating: 8 GPUs, 512, or thousands?',
        'What is the expected failure rate at that scale, and what does it imply?',
        'What does the researcher want from this platform that a raw cluster does not give them?',
      ],
      data: [
        'Work out the memory for a 70B full fine-tune and say which parallelism strategy that forces.',
        'How large is a checkpoint, and how long does writing it take?',
        'How do you feed data fast enough to keep the GPUs busy?',
      ],
      architecture: [
        'Draw the job lifecycle from submission to a saved model.',
        'Choose between data parallel, FSDP and tensor plus pipeline parallel, and say what decides it.',
        'How do you survive a single node failing 30 hours into a 60-hour job?',
        'How do you detect a job that is running but making no progress?',
      ],
      evaluate: [
        'What is your utilisation metric, and why is GPU utilisation percentage not it?',
        'How do you tell a slow job from a badly configured one?',
      ],
      deploy: [
        'How do you upgrade the cluster software without killing week-long jobs?',
        'How do you handle a job that needs to grow or shrink its allocation?',
      ],
      wrapup: [
        'What is the dominant cost of a large training run, and what is the biggest waste?',
        'What would you build first for a team of five researchers?',
      ],
    },
    solution: {
      define:
        'Design for the 64 to 512 GPU range, which covers fine-tuning frontier-scale models and training mid-size ones from scratch, and is where orchestration stops being optional. At that scale hardware failure is routine rather than exceptional: if a single GPU node has a mean time between failures of a few thousand hours, a 64-node job expects a failure every few tens of hours, so a 60-hour run will almost certainly hit one and the system must treat that as the normal path. What a researcher wants beyond a raw cluster is: submit and forget, automatic recovery, reproducibility, and a way to see whether the run is healthy without reading NCCL logs. Those four are the product.',
      data:
        'A 70B full fine-tune in mixed precision needs roughly 2 bytes of weights, 2 of gradients and 12 of Adam state per parameter, about 16 bytes total, which is 1.12TB of model state — before activations. On 80GB GPUs that is 14 GPUs to hold state alone, so realistically 32 or 64 with room for activations, and it forces a sharding strategy: plain data parallelism is impossible because a single replica does not fit. The checkpoint is that same 1.12TB of state, and writing it naively from one rank at an assumed 2GB/s is nearly ten minutes with every other rank idle — which is why sharded checkpointing, where each rank writes its own shard in parallel, is not an optimisation but a requirement. Data loading must sustain the token rate: a 64-GPU job at an assumed 2,500 tokens per GPU-second is 160K tokens/s, and at roughly 4 bytes per pre-tokenised token that is under a gigabyte per second of read, comfortably served by pre-tokenised, pre-shuffled shards on object storage with prefetch — but disastrous if the pipeline is tokenising text on the fly on the training node.',
      architecture:
        'Lifecycle: submit a job spec — image, entrypoint, resource shape, dataset version, config — to a queue; the scheduler gang-allocates nodes with topology awareness so ranks land on GPUs sharing high-bandwidth interconnect; a rendezvous service assigns ranks and forms the process group; training runs with sharded checkpointing on an interval; on completion, artefacts and lineage go to the registry. Parallelism choice is mechanical rather than a matter of taste: if a replica fits in one GPU, use data parallelism, because it is simplest and scales near-linearly. If it does not fit but fits in one node, use FSDP within the node and data parallelism across nodes. If it does not fit in a node, add tensor parallelism inside the node where NVLink makes the per-layer all-reduce cheap, and pipeline parallelism across nodes where the interconnect is slower and the communication is only at stage boundaries. That ordering — data, then FSDP, then tensor within a node, then pipeline across nodes — follows directly from the bandwidth hierarchy. Node failure is handled by elastic training: the rendezvous detects the loss, the job restarts from the last sharded checkpoint on a replacement node, and total lost work is bounded by the checkpoint interval. A silently stuck job is the nastier failure — an NCCL collective hanging looks like a busy GPU — so every rank emits a step heartbeat and a watchdog kills and restarts the job when steps stop advancing, which is the difference between losing ten minutes and losing a weekend.',
      evaluate:
        'GPU utilisation percentage is close to useless because a GPU spinning on a hung collective reports 100 percent. The real metric is model FLOPs utilisation: achieved FLOPs from tokens per second and the known 6 x params x tokens formula, divided by the hardware peak. That single number tells you whether you are getting value from the fleet, and a run at 15 percent MFU has a fixable problem while one at 45 percent is doing well. Alongside it: tokens per second per GPU, step time and its variance, communication time as a fraction of step time, and data-loader wait time. Those four separate a slow job from a misconfigured one — high communication fraction means the parallelism strategy is wrong for the interconnect, high loader wait means the data pipeline is the bottleneck, high step-time variance usually means a straggler node that should be evicted.',
      deploy:
        'Cluster software upgrades cannot preempt week-long jobs, so nodes are drained rather than upgraded in place: a node is cordoned, its jobs are allowed to finish or are checkpoint-migrated, then it is upgraded and returned to the pool. Because jobs already survive node loss by design, a migration is a controlled instance of a failure the system handles routinely, which is a nice property of building elasticity first. Resizing an allocation mid-run is supported by the same elastic mechanism — the job checkpoints, the rendezvous re-forms with a new world size, and training resumes — but it is not free: changing the number of data-parallel replicas changes the effective batch size, which changes the optimisation trajectory, so the platform must either adjust the learning rate schedule accordingly or refuse the resize. Silently changing effective batch size mid-run is a reproducibility disaster that produces a job nobody can explain afterwards.',
      wrapup:
        'Dominant cost is straightforwardly GPU-hours, and the biggest waste is not slow kernels, it is idle time: queue waiting, failed runs discovered hours later, checkpoint stalls, and jobs running at 20 percent MFU because nobody measured. In my experience the cheapest large win on any training platform is making MFU and step-time variance visible per job, because researchers fix what they can see. For a team of five researchers I would not build this at all: a managed cluster, a shared job-submission script, sharded checkpointing to object storage, and a dashboard showing MFU and step time gets almost all the value, and building an orchestration platform for five people is a way to spend a year not training models.',
      numbers: [
        'Model state for a 70B full fine-tune: 70e9 x (2 weights + 2 gradients + 12 Adam) = about 1.12TB, so 14 x 80GB GPUs hold state alone and 32-64 is the practical job shape.',
        'Checkpoint time: 1.12TB written from one rank at an assumed 2GB/s is about 9 minutes of full-cluster stall; sharded across 64 ranks in parallel it is under 10 seconds.',
        'Failure expectation: at an assumed node MTBF of 5,000 hours, a 64-node job sees a failure roughly every 78 hours, so a 60-hour run is more likely than not to hit one — recovery is the normal path, not the exception.',
        'Data pipeline: 64 GPUs at an assumed 2,500 tokens/GPU-second is 160K tokens/s, under 1GB/s of pre-tokenised reads — trivial from object storage, impossible if tokenising on the training node.',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 10, apiAndData: 8, architecture: 16, deepDive: 13, wrapUp: 5 },
      opening:
        'I want to price the model state for a 70B fine-tune first, because 16 bytes per parameter is over a terabyte, and that number chooses the parallelism strategy for me rather than my choosing it.',
      traps: [
        'Counting only weights. Gradients and Adam state are six times the weights in fp32, and the whole sharding decision follows from the full 16 bytes per parameter.',
        'Checkpointing from rank zero. A terabyte written serially stalls the entire cluster for minutes every interval; sharded parallel writes are mandatory at this scale.',
        'Using GPU utilisation as the health metric. A hung NCCL collective reports 100 percent busy, which is exactly the failure you most need to catch.',
        'Resizing a job without adjusting for the changed effective batch size, producing a run whose optimisation trajectory changed mid-flight and cannot be reproduced.',
      ],
      whenPushed: [
        {
          challenge: 'Why not just checkpoint every 10 minutes and stop worrying?',
          answer:
            'Because a checkpoint stalls every rank while it writes, so the interval is a straight trade between wasted compute on recovery and wasted compute on writing. With sharded and asynchronous checkpointing the write cost drops enough that a short interval becomes affordable, and then I set it from the observed failure rate rather than by feel — roughly the square root of twice the checkpoint cost over the failure rate is the classic starting point.',
        },
        {
          challenge: 'Pipeline parallelism has bubbles. Why use it at all?',
          answer:
            'Only when the alternative is worse. Tensor parallelism needs an all-reduce every layer, which is fine over NVLink inside a node and terrible across a slower fabric. Pipeline parallelism communicates only at stage boundaries, so across nodes it wins despite the bubble, and interleaved schedules shrink the bubble. The decision is set by the interconnect bandwidth hierarchy, not by preference.',
        },
      ],
    },
    diagram: `flowchart TD
  SUB["Job spec: image, resources, dataset version, config"] --> Q["Queue"]
  Q --> SCH["Gang + topology-aware scheduler"]
  SCH --> RDV["Rendezvous: rank assignment, process group"]
  RDV --> STRAT{"Does one replica fit?"}
  STRAT -->|fits one GPU| DP["Data parallel"]
  STRAT -->|fits one node| FSDP["FSDP in node + DP across nodes"]
  STRAT -->|larger than a node| TPPP["Tensor parallel over NVLink + pipeline across nodes"]
  DP --> TRAIN["Training loop"]
  FSDP --> TRAIN
  TPPP --> TRAIN
  DATA[("Pre-tokenised, pre-shuffled shards on object store")] -->|prefetch| TRAIN
  TRAIN --> CK["Sharded checkpoint: every rank writes its own shard"]
  CK --> OBJ[("Object store")]
  TRAIN --> HB["Per-rank step heartbeat"]
  HB --> WD["Watchdog: steps stalled -> kill and restart"]
  WD --> RDV
  NODE["Node failure"] --> RDV
  TRAIN --> MFU[("MFU, tokens/GPU-s, comm fraction, loader wait, step variance")]
  TRAIN --> REG[("Registry: model, config, dataset version, metrics")]`,
  },
  {
    id: 'aisdq-continual-retraining',
    patternId: 'aisdp-training-infra',
    title: 'Design continual retraining with drift detection',
    companies: ['amazon', 'google'],
    minutes: 45,
    steps: {
      define: [
        'What is actually drifting — the inputs, the labels, or the relationship between them?',
        'How fast does this model go stale, and how do you know rather than assume?',
        'What is the cost of a stale model versus the cost of a bad retrain?',
      ],
      data: [
        'Where do fresh labels come from, and how delayed are they?',
        'How do you avoid training on the consequences of your own predictions?',
        'What do you keep from the old training data, and why not just use the newest window?',
      ],
      architecture: [
        'Draw the loop from production traffic to a promoted model.',
        'What triggers a retrain: a schedule, a drift signal, or a performance drop?',
        'What gates a retrained model before it can be promoted?',
      ],
      evaluate: [
        'How do you detect drift before performance degrades?',
        'How do you evaluate a new model on data the old one has already influenced?',
      ],
      deploy: [
        'How do you roll out a retrained model safely?',
        'What is your rollback plan, and what does rollback mean when the data has moved on?',
      ],
      wrapup: [
        'What does this pipeline cost to run per month, and is the automation worth it?',
        'When is manual retraining the better choice?',
      ],
    },
    solution: {
      define:
        'Three distinct drifts and they need different responses. Covariate drift, where the input distribution moves but the mapping holds — new user segment, new locale — often needs no retrain at all. Label drift, where the base rate changes, may only need recalibration of a threshold. Concept drift, where the relationship itself changed — fraud patterns adapting, a policy change altering what counts as a violation — is the one that genuinely needs new data. Conflating them leads to expensive retrains that fix nothing. How fast the model goes stale is measured, not assumed, by a backtest: train on data up to time T and evaluate on windows at T plus one, two and three months, which gives a decay curve and therefore a principled retraining cadence. In fraud that curve can be steep, in document classification it can be nearly flat for a year, and the cadence should follow the curve rather than a habit.',
      data:
        'Label delay is the constraint that shapes everything: if a chargeback arrives 60 days after the transaction, the freshest fully-labelled data is 60 days old regardless of how fast the pipeline runs, and any claim to retrain weekly on fresh labels is a misunderstanding. So the design uses delayed ground truth for the authoritative training set and fast proxy labels — manual review outcomes, user reports, heuristic signals — for early drift detection only. The feedback loop is the subtle danger: a model that declines a transaction never learns whether it would have been fine, so the training data is censored by the model own decisions and it progressively trains on a narrower world. The counter is a deliberate exploration holdout — a small randomised fraction where the model decision is overridden or logged as counterfactual — which is expensive and is the only way to keep unbiased data flowing. On the training window, using only the newest data is a mistake: it forgets rare patterns that recur seasonally, so I use a weighted window, recent data upweighted with a long tail retained, plus a permanent set of hard historical cases that must not be forgotten.',
      architecture:
        'Production traffic writes features and predictions to a store; delayed labels join against them as they arrive; a training dataset is assembled as an immutable version from that join. Retraining is triggered by any of three signals and I would use all three rather than choosing: a schedule derived from the decay curve as a baseline, a drift alert on input distributions as an early warning, and a performance drop on delayed labels as the definitive one. Schedule alone retrains when nothing changed; drift alone fires on harmless covariate shift; performance alone is always late because of label delay. A candidate model must pass a gate before promotion: it beats the incumbent on a held-out recent window, it does not regress on the permanent hard-case set, its calibration is checked rather than assumed, its behaviour is compared across protected segments where relevant, and it passes a stability check that its predictions do not swing wildly on the same inputs the incumbent handled. Only then does it become a candidate for online rollout.',
      evaluate:
        'Drift detection before performance degrades relies on input-side signals, since those are available immediately: population stability index or a KS test per feature, embedding-distribution distance for unstructured inputs, and prediction-distribution shift, which is often the most sensitive single indicator because it aggregates everything upstream. Those raise a warning; they do not by themselves justify a retrain, because covariate shift within the model competence is harmless. Evaluating a new model on data the old one influenced is genuinely hard and I would be honest about the limits: on the exploration holdout the data is unbiased and the comparison is valid but the sample is small; on the rest, an offline comparison is biased toward the incumbent because the data reflects its decisions. So the offline gate is a filter and the real comparison is the online test, with importance weighting on the holdout as a middle step where the sample allows.',
      deploy:
        'Rollout is shadow first — the candidate scores live traffic without acting, which validates the pipeline and compares prediction distributions with no risk — then a percentage rollout with the guardrails on. Rollback is a model-version pointer flip and is instant, but rollback here means something weaker than usual and I would say so: reverting to the previous model returns to the behaviour that prompted the retrain, so it buys time rather than fixing anything, and if the retrain was triggered by real concept drift the old model is now the worse of two bad options. That is why the gate matters more than the rollback. Every promoted model carries the dataset version, the code version and the evaluation report, so an incident can identify exactly what changed.',
      wrapup:
        'Cost per month is mostly the training compute — for a mid-size model that is hours of GPU per retrain, so tens of dollars monthly — plus the feature and label store, which is usually larger, plus the exploration holdout, which is a real business cost measured in the decisions you deliberately got wrong to stay unbiased. That last one is the honest expensive line and it should be sized explicitly rather than hidden. Automation is worth it when the decay curve is steep enough to need retraining monthly or faster; below that, manual retraining with a human reading the evaluation report is better, because the pipeline maintenance exceeds the effort saved and a human notices the strange thing that no gate was written for.',
      numbers: [
        'Label delay: with a 60-day chargeback window, the freshest fully-labelled data is 60 days old, so a weekly retrain cadence adds nothing over monthly unless proxy labels are carrying the signal.',
        'Decay curve: a backtest training at time T and evaluating at T+1, T+2 and T+3 months converts retraining cadence from a habit into a measurement — a 3-point drop per month justifies monthly, a 0.2-point drop justifies annually.',
        'Exploration cost: a 1 percent randomised holdout on a decision worth an assumed 20 USD each over 1M monthly decisions costs on the order of tens of thousands of USD a year in deliberately suboptimal decisions, and it is the price of unbiased training data.',
        'Retrain compute: a mid-size model on 50M examples is hours of GPU per run, tens of USD monthly — trivial next to the feature store and the exploration holdout, which is where the real cost sits.',
      ],
    },
    delivery: {
      budget: { requirements: 7, estimates: 6, apiAndData: 8, architecture: 11, deepDive: 9, wrapUp: 4 },
      opening:
        'I want to distinguish covariate drift, label drift and concept drift up front, because only the third actually requires new training data and conflating them produces a pipeline that retrains constantly and improves nothing.',
      traps: [
        'Ignoring label delay. If ground truth arrives 60 days late, a weekly retraining cadence is theatre, and saying so is what shows you have run one of these.',
        'Training on your own censored decisions. A model that declines never learns the counterfactual, so without an exploration holdout the data narrows around the model existing beliefs.',
        'Retraining on a recent window only. It forgets rare and seasonal patterns; keep a weighted long tail and a permanent hard-case set.',
        'Treating rollback as a fix. Reverting returns to the model that was already failing, which buys time rather than solving concept drift.',
      ],
      whenPushed: [
        {
          challenge: 'Just retrain nightly and stop thinking about triggers.',
          answer:
            'It is cheap enough that I understand the appeal, and the reason not to is that every promotion is a chance to ship a regression. Nightly retraining means nightly gate evaluations, nightly rollout decisions, and a model that changes under the product for reasons nobody examined. If the decay curve is flat, retraining nightly adds risk and noise without adding accuracy.',
        },
        {
          challenge: 'The exploration holdout is unacceptable — you are deliberately making bad decisions.',
          answer:
            'That is a fair objection and it is a business decision rather than an engineering one, so I would size it and put the number in front of the owner. The alternative is a model whose training data is increasingly a mirror of its own past beliefs, and that failure is slower, larger and much harder to detect. Where the cost is genuinely unacceptable, I would fall back to counterfactual logging on near-threshold cases only, which is cheaper and weaker.',
        },
      ],
    },
    diagram: `flowchart TD
  PROD["Production traffic"] --> FS[("Feature + prediction store")]
  PROD --> EXPL["Exploration holdout (~1%): unbiased outcomes"]
  LBL["Delayed ground truth (e.g. 60-day window)"] --> JOIN["Join labels to logged features"]
  EXPL --> JOIN
  JOIN --> DSV[("Immutable training dataset version: weighted window + hard-case set")]
  FS --> DRIFT["Drift monitors: PSI/KS per feature, embedding distance, prediction shift"]
  DRIFT -->|early warning| TRIG{"Retrain trigger"}
  DECAY["Backtest decay curve"] -->|schedule| TRIG
  JOIN -->|performance drop on delayed labels| TRIG
  TRIG --> TRAIN["Retrain"]
  DSV --> TRAIN
  TRAIN --> GATE["Gate: beats incumbent on recent window, no hard-case regression, calibration, segment parity, stability"]
  GATE -->|fail| STOP["Do not promote"]
  GATE --> SHADOW["Shadow scoring on live traffic"]
  SHADOW --> AB["Percentage rollout with guardrails"]
  AB --> PROM["Promote; record dataset + code version + eval report"]
  PROM -.->|rollback returns to the model that was failing| PROD`,
  },
]

/**
 * Pattern 8 — AI inside a product. Per-unit economics that survive volume, a cheap
 * deterministic tier before any GPU is touched, human review where the stakes demand it, and
 * a threshold that is a policy decision wearing a hyperparameter costume.
 */
const productQuestions: AiSdQuestion[] = [
  {
    id: 'aisdq-meeting-summariser',
    patternId: 'aisdp-ai-product',
    title: 'Design a meeting summariser at a million meetings a day',
    companies: ['microsoft', 'google'],
    minutes: 45,
    steps: {
      define: [
        'What is the output — a summary, action items, decisions, or all three — and who reads it?',
        'When must it be ready, and does anyone actually need it in real time?',
        'What does a bad summary cost, and is that different for a summary and for an action item?',
      ],
      data: [
        'Size the input: how many tokens is a typical meeting transcript?',
        'What context beyond the transcript makes the summary better?',
        'What retention applies to transcripts and summaries, and who decides?',
      ],
      architecture: [
        'Draw the pipeline from a finished meeting to a delivered summary.',
        'How do you handle a three-hour meeting that exceeds the context window?',
        'How do you keep the per-meeting cost low enough to include this in a seat price?',
      ],
      evaluate: [
        'How do you evaluate a summary at this volume without reading them?',
        'How do you measure whether action items are right, which is a different problem from whether the summary is good?',
      ],
      deploy: [
        'How do you roll out a prompt or model change across a million daily meetings?',
        'What happens when the summary is wrong about something consequential?',
      ],
      wrapup: [
        'What is the cost per meeting and per seat per month?',
        'What would you cut if the feature had to be free?',
      ],
    },
    solution: {
      define:
        'Three outputs with different readers and different stakes: a narrative summary for someone who missed the meeting, decisions for the record, and action items with owners for people who must do something. I would separate them in the pipeline rather than asking for one blob, because they have different accuracy requirements and different failure costs. A slightly vague summary is a minor annoyance; a wrong action item assigned to the wrong person is a real workplace problem, and a fabricated decision is worse. Timing: almost nobody needs it in real time, and treating this as a batch job that completes within two minutes of the meeting ending unlocks an order of magnitude of cost efficiency. The temptation to make it live should be resisted unless the product genuinely has a live surface.',
      data:
        'A 45-minute meeting at roughly 150 words per minute is about 6,750 words, call it 9,000 tokens of transcript with speaker labels and timestamps. A three-hour meeting is around 36,000 tokens, still inside a modern context window but at four times the cost, and the length distribution has a long tail. Context beyond the transcript is what separates a mediocre summary from a good one: the calendar invite title and agenda, the participant list with roles, the shared document or deck, and prior meetings in the same recurring series — because most meetings are episodes, and a summary that knows what was decided last week is far more useful. Retention is a policy question owned by the customer administrator, not by us: transcripts are sensitive workplace content, and the defaults I would ship are transcripts retained per the customer setting with a conservative default, and summaries retained with the meeting record.',
      architecture:
        'Meeting ends, transcript is finalised, a job is enqueued. A worker assembles context, runs a single pass for a normal-length meeting, and produces the three outputs as a structured object rather than prose to be parsed. For a long meeting the approach is chunked map-reduce with an important detail: chunk on topic boundaries derived from the transcript rather than on token counts, summarise each chunk with the running context of decisions so far, then reduce. Naive fixed-size chunking splits a discussion mid-decision and produces a reduce step that cannot tell which conclusion won. Cost control is the design constraint at this volume and it has three parts: use a small model, because summarisation with the source text present is exactly the task small models do well; run in batch, which many providers price at a substantial discount and which suits a two-minute SLA perfectly; and skip meetings nobody will read — a meeting with two participants and four minutes of speech gets a heuristic one-liner rather than a model call, and that alone removes a large fraction of volume in a real corpus.',
      evaluate:
        'Nobody reads a million summaries, so evaluation is layered. A permanent gold set of a few hundred meetings with human-written reference summaries and human-verified action items, scored by a calibrated judge, is the regression gate. Production signals give continuous coverage: the rate at which users edit an action item, the rate at which they delete one, whether assigned owners open the item, and explicit feedback. Action items get their own evaluation because they are a structured extraction problem rather than a summarisation one — precision on owner and on the existence of the commitment matters far more than recall, since a missed action item is invisible and a fabricated one wastes someone afternoon and erodes trust in the whole feature. So I would tune the extraction conservatively and report precision and recall separately rather than an F1 that hides the asymmetry.',
      deploy:
        'A prompt or model change goes to the offline gold set first, then to 1 percent of meetings with the production signals compared over a week, then ramps. Because the output is not shown in real time there is a useful option unavailable to chat products: shadow generation, where both versions summarise the same meetings and only one is shown, giving a paired comparison on identical inputs that removes almost all the variance from an A/B test. I would use that as the primary rollout mechanism. When a summary is consequentially wrong the recovery path must exist in the product: every claim in the summary links to the transcript timestamp that supports it, so a disputed statement is checkable in one click, and an edit by any participant is stored and shown, because the social fix — letting the room correct the record — is more reliable than trying to make the model never wrong.',
      wrapup:
        'Cost per meeting: about 9,000 input tokens plus context and 600 output tokens on a small model at an assumed 0.15 and 0.60 USD per million is roughly 0.0018 USD, and batch pricing typically halves that. At one million meetings a day that is under 1,000 USD a day of inference, or well under 0.10 USD per seat per month for a typical usage rate, which comfortably fits inside a seat price. If it had to be free, I would cut long-meeting handling to a truncated single pass, drop the narrative summary and keep only decisions and action items, which are the parts people actually use, and apply the heuristic filter much more aggressively — a summariser that only summarises the 20 percent of meetings that matter is a better free product than one that does a worse job on all of them.',
      numbers: [
        'Input size: a 45-minute meeting at roughly 150 words/minute is about 9,000 tokens; a 3-hour meeting is about 36,000, so the long tail is 4x the cost of the median.',
        'Cost per meeting: 9,000 input at an assumed 0.15 USD/M plus 600 output at 0.60 USD/M = about 0.0018 USD, halved again with batch pricing.',
        'Daily spend: 1M meetings x 0.0018 USD = about 1,800 USD/day of inference, under 0.10 USD per seat per month at typical meeting rates.',
        'Heuristic filter: skipping meetings under about 5 minutes or with fewer than 3 speakers typically removes a large share of volume for near-zero user impact, and every skipped meeting is pure margin.',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 7, apiAndData: 7, architecture: 11, deepDive: 10, wrapUp: 4 },
      opening:
        'I want to split the output into summary, decisions and action items early, because they have different accuracy requirements and a fabricated action item is a much worse failure than a vague paragraph.',
      traps: [
        'Making it real-time. Nobody is waiting, and treating it as a two-minute batch job unlocks batch pricing and much better scheduling.',
        'Fixed-size chunking of a long transcript. Splitting mid-discussion produces a reduce step that cannot tell which decision won; chunk on topic boundaries.',
        'Reaching for the frontier model. Summarisation with the source present is what small models are good at, and at a million a day the model choice is most of the P&L.',
        'One quality metric for summary and action items. Action-item precision matters far more than recall, and an F1 hides exactly that asymmetry.',
      ],
      whenPushed: [
        {
          challenge: 'Would a long-context model not do better than map-reduce?',
          answer:
            'For a three-hour meeting a single long-context pass is simpler and usually better, and I would prefer it when the cost allows. The reason I keep the chunked path is the tail: some meetings are all-day workshops, and the cost of a single pass grows with the square of attention while the map-reduce path is linear. So single-pass below a threshold, chunked above it, with the threshold set by cost rather than capability.',
        },
        {
          challenge: 'Users will not trust it if it is ever wrong.',
          answer:
            'They will not trust it if it is confidently wrong with no way to check, which is a design problem rather than a model problem. Timestamp-linked claims and participant-editable summaries change the failure from an unverifiable assertion into a correctable draft, and that is a much lower bar than never being wrong.',
        },
      ],
    },
    diagram: `flowchart TD
  END["Meeting ends, transcript finalised"] --> FILTER{"Worth summarising? (length, speakers)"}
  FILTER -->|no| ONE["Heuristic one-liner, no model call"]
  FILTER -->|yes| JOB["Batch queue (2-minute SLA)"]
  CTX[("Invite, agenda, participants, shared docs, prior meetings in series")] --> ASM["Assemble context"]
  JOB --> ASM
  ASM --> LEN{"Transcript length"}
  LEN -->|under threshold| ONEPASS["Single pass, small model"]
  LEN -->|long tail| TOPIC["Topic-boundary chunking"]
  TOPIC --> MAP["Map: summarise chunk with running decisions"]
  MAP --> RED["Reduce"]
  ONEPASS --> OUT["Structured output"]
  RED --> OUT
  OUT --> S1["Narrative summary"]
  OUT --> S2["Decisions (timestamp-linked)"]
  OUT --> S3["Action items: owner + commitment, precision-tuned"]
  S3 -->|edit / delete / open rate| SIG[("Production quality signals")]
  GOLD[("Gold set: human summaries + verified action items")] --> GATE["Regression gate"]
  NEW["Prompt or model change"] --> SHADOW["Shadow generation: both versions, same meetings, paired comparison"]`,
  },
  {
    id: 'aisdq-resume-screening',
    patternId: 'aisdp-ai-product',
    title: 'Design resume screening at 100K applications a week',
    companies: ['amazon', 'microsoft'],
    minutes: 60,
    steps: {
      define: [
        'What decision is the system making, and what decision is it explicitly not making?',
        'Who is accountable for an outcome, and what does the candidate have a right to?',
        'What legal and regulatory constraints apply, and how do they change the architecture?',
      ],
      data: [
        'What features are you allowed to use, and which apparently neutral ones are proxies for protected attributes?',
        'Where would training or calibration data come from, and what bias does it already contain?',
        'What must be retained to defend a decision, and for how long?',
      ],
      architecture: [
        'Draw the pipeline and mark where a human is required rather than optional.',
        'How do you structure the model task so its output is auditable rather than a score?',
        'How do you handle the fact that candidates will optimise their resumes against your system?',
      ],
      evaluate: [
        'How do you measure fairness, and which definition of fairness are you choosing?',
        'How do you validate that the screening predicts job performance rather than resume style?',
      ],
      deploy: [
        'How do you roll this out given a bad week is a discrimination claim, not an error budget?',
        'What is the audit trail, and who can read it?',
      ],
      wrapup: [
        'What does this save, and what liability does it create?',
        'What would you refuse to build?',
      ],
    },
    solution: {
      define:
        'The system ranks and surfaces applications against a structured set of job requirements, and it explicitly does not reject anyone. That distinction is the whole design: an automated reject at scale is a legally hazardous, ethically poor and technically unjustifiable use of a model whose error rate on individual judgements is real. So the output is a shortlist plus, for every candidate, a structured extraction of the evidence found against each requirement. A human recruiter is accountable for every advance or reject decision and must record a reason. Candidates have a right, in an increasing number of jurisdictions, to know that automated processing was used, to a meaningful explanation, and to human review — the EU AI Act treats employment screening as high-risk, New York City requires an annual independent bias audit and candidate notice for automated employment decision tools, and Illinois regulates AI in video interviews. Those are not a compliance appendix; they force the human-in-the-loop tier, the audit trail and the explanation output to be architecture rather than features.',
      data:
        'Permitted features are the ones relevant to job requirements: skills, demonstrated experience, credentials where genuinely required, and work samples. Prohibited are the protected attributes directly, and the harder problem is proxies, which is where these systems fail: name, photo, address and postcode, university, graduation year (a proxy for age), gaps in employment history (a proxy for parental leave and disability), membership of affinity organisations, and even writing style, which correlates with first language. My default is to redact name, contact details, address, photo, and dates that reveal age from the model input entirely, and to treat university as a feature that must be justified per role rather than used by default. Training data is the deeper trap: historical hiring decisions encode historical bias, so a model trained to predict who was hired learns who was hired, not who succeeded. Where a supervised model is used at all, the target must be a validated performance outcome, not a hiring decision, and if that data does not exist — it usually does not — then the honest design is requirement extraction and matching rather than a learned score. Retention: applications, extracted evidence, model version, ranking, the recruiter decision and reason, retained for the statutory period, which in several jurisdictions is one to three years.',
      architecture:
        'Stage one is deterministic and cheap: parse the application, extract structured fields, and apply hard requirements that are objective and job-related — work authorisation, a required licence — with those checks logged. Stage two is the model, and its task is deliberately structured as extraction rather than scoring: for each stated job requirement, find the evidence in the application and label it as met, partially met, or not found, with the supporting quote. That output is auditable in a way a similarity score never is, and it is also more useful to a recruiter. Stage three is ranking, which is a transparent function over the requirement matrix — weights set by the hiring manager and visible — rather than a learned ranker, so the reason one candidate is above another can be stated. Stage four is human review, and it is mandatory for both directions: every advance and every reject is a human decision, and the interface deliberately presents the evidence rather than the rank first, to reduce anchoring. Candidates optimising against the system is inevitable and largely benign — keyword stuffing is defeated by requiring evidence with a supporting quote rather than a keyword match — but I would monitor for it, and I would rather publish the requirements clearly than rely on obscurity, since obscurity advantages candidates who have access to insider knowledge about how to game screening.',
      evaluate:
        'Fairness definitions conflict mathematically and you must choose, so I would choose openly and document it. The operative standard in US employment law is adverse impact, conventionally assessed with the four-fifths rule: the selection rate for any protected group should be at least 80 percent of the highest group rate. I measure that at every stage — hard filters, model shortlist, human decision — because the stage where disparity enters is the thing you need to know, and it is frequently the hard filters rather than the model. Alongside it I measure equal opportunity: among candidates who went on to succeed, was the shortlist rate similar across groups. Validation that screening predicts job performance rather than resume polish requires outcome data, and the honest position is that this is very hard: the only sound evidence is a comparison of screened-in candidates who were hired against their later performance ratings, which takes a year to accumulate and is censored because rejected candidates have no outcome. Until that exists, the claim the system can support is that it finds evidence of stated requirements accurately — measurable against human-labelled applications — and not that it predicts performance. I would insist on that distinction in how the product is described.',
      deploy:
        'The rollout is not an error-budget exercise, because the failure is a discrimination claim rather than a latency spike. So: shadow mode first, where the model ranks but recruiters never see the output, and adverse-impact ratios and agreement with recruiter decisions are measured on real applications with zero candidate exposure. Then a single job family, with a pre-registered bias audit before exposure and an independent audit afterwards. Then expansion, family by family, each with its own audit — because requirements differ per role and a system fair for engineering roles is not thereby fair for sales. The audit trail records, per application: the version of every model and rule, the extracted evidence, the ranking inputs and weights, the recruiter decision and reason, and every screen the recruiter saw. It is readable by the candidate in the jurisdictions that require it, by the compliance team, and by an external auditor, and it is immutable.',
      wrapup:
        'What it saves: at 100K applications a week and an assumed 4 minutes of recruiter time per initial screen, that is 6,700 hours a week, and structured evidence extraction plausibly halves it — a large, real saving. Inference cost is nearly irrelevant here: 100K applications at roughly 1,300 tokens each on a mid-tier model is a few tens of dollars a week, which is a useful thing to say out loud, because it tells you the constraint is not cost and any design pressure toward a cheaper model is misplaced. The liability created is substantial and permanent: an automated system applies any bias it has uniformly and at scale, and it produces a discoverable record of having done so. What I would refuse to build: automated rejection, personality or culture-fit inference, video-interview scoring on facial expression or voice, and any model trained to predict past hiring decisions.',
      numbers: [
        'Volume and saving: 100K applications/week at an assumed 4 minutes per manual screen is about 6,700 recruiter-hours weekly; halving screening time saves roughly 3,300 hours a week.',
        'Inference cost: 100K x roughly 1,300 tokens = 130M tokens/week, about 20-40 USD at mid-tier rates — so cost is not a design constraint here and model choice should be driven purely by extraction accuracy.',
        'Adverse impact: the four-fifths rule means a group selection rate below 80 percent of the highest group rate triggers scrutiny; measured per stage, since hard filters often contribute more disparity than the model.',
        'Audit volume: a full decision record of roughly 20KB per application x 5.2M applications a year is about 100GB retained for the statutory period — trivially affordable and non-negotiable.',
      ],
    },
    delivery: {
      budget: { requirements: 10, estimates: 6, apiAndData: 12, architecture: 14, deepDive: 13, wrapUp: 5 },
      opening:
        'I want to state the scope narrowly at the start: this system ranks and surfaces evidence, it never rejects, and a human decides every outcome. That constraint comes from the regulatory position and it shapes the architecture rather than sitting on top of it.',
      traps: [
        'Training on historical hiring decisions. The model learns who was hired, not who succeeded, and reproduces every bias in that record with perfect consistency.',
        'Outputting a score. A similarity number cannot be explained to a candidate or an auditor; structured evidence per requirement can.',
        'Ignoring proxies. Postcode, university, graduation year and employment gaps are proxies for protected attributes, and removing the protected field alone does nothing.',
        'Measuring fairness only at the model. Disparity frequently enters at the hard filters or at the human decision, and a per-stage adverse-impact measurement is what finds it.',
      ],
      whenPushed: [
        {
          challenge: 'The business wants auto-reject for obviously unqualified applications.',
          answer:
            'I would allow it only for objective, job-related, verifiable criteria — no work authorisation, no required licence — applied as deterministic rules, logged, and with a candidate-visible reason. What I will not do is let a model output drive a reject, because the model error rate on an individual judgement is real and the aggregate effect of that error is a discrimination claim with a written record of the mechanism.',
        },
        {
          challenge: 'How do you know your evidence extraction is not itself biased?',
          answer:
            'By testing it directly rather than assuming. I run counterfactual pairs: the same application with the name, university and address varied across groups, and the extraction and ranking must be invariant. Any measurable movement is a defect, and that test is cheap, deterministic and runs in CI, unlike the outcome study which takes a year.',
        },
        {
          challenge: 'Recruiters will just rubber-stamp the ranking, so the human is not a real control.',
          answer:
            'That is the most likely way this fails and I would design against it explicitly: present evidence before rank, require a written reason for both advances and rejects, sample and audit recruiter decisions for agreement rates that are suspiciously high, and periodically inject a shuffled ordering to test whether reasons track evidence or position. If agreement is near total, the human tier is theatre and I would say so to the accountable owner.',
        },
      ],
    },
    diagram: `flowchart TD
  APP["Application"] --> PARSE["Parse + structure; redact name, contact, address, photo, dates"]
  PARSE --> HARD["Deterministic hard requirements: work authorisation, required licence (logged)"]
  HARD --> EXTRACT["Model task: evidence per stated requirement + supporting quote"]
  EXTRACT --> MATRIX[("Requirement matrix: met / partial / not found")]
  MATRIX --> RANK["Transparent weighted ranking; weights set and visible to hiring manager"]
  RANK --> UI["Recruiter view: evidence first, rank second"]
  UI --> HUMAN["Human decides every advance AND every reject, with written reason"]
  HUMAN --> TRAIL[("Immutable audit trail: model versions, evidence, weights, decision, reason")]
  TRAIL --> CAND["Candidate access where required"]
  TRAIL --> AUD["Independent bias audit"]
  HARD --> AI1["Adverse impact per stage"]
  RANK --> AI1
  HUMAN --> AI1
  CF["Counterfactual pairs: name, university, address varied"] --> EXTRACT
  SHADOW["Shadow mode: rank hidden, ratios measured"] --> UI`,
  },
  {
    id: 'aisdq-content-moderation',
    patternId: 'aisdp-ai-product',
    title: 'Design content moderation for user-generated content',
    companies: ['google', 'amazon', 'microsoft'],
    minutes: 60,
    steps: {
      define: [
        'What are you moderating for, and who wrote the policy you are enforcing?',
        'What is the volume, and what fraction is actually violating?',
        'What are the two error types here, and who bears each one?',
      ],
      data: [
        'What signals exist besides the content itself?',
        'Where do labels come from, and how noisy are human moderator labels?',
        'How do you handle policy changing under a model trained on the old policy?',
      ],
      architecture: [
        'Draw the pipeline and put the cheap tiers first.',
        'How much volume can you remove before an LLM is involved, and how?',
        'How do you handle content that must be blocked before publication versus reviewed after?',
        'How do you route to human review with finite reviewer capacity?',
      ],
      evaluate: [
        'How do you set a threshold, and whose decision is that?',
        'How do you measure performance on a class that is 0.1 percent of traffic?',
        'How do you evaluate against an adversary who adapts?',
      ],
      deploy: [
        'How do you ship a policy change across a model, a rulebook and a reviewer workforce at once?',
        'What is the appeal path, and how does it feed back?',
      ],
      wrapup: [
        'What is the cost per item, and what dominates?',
        'What would you tell a regulator about how this works?',
      ],
    },
    solution: {
      define:
        'Moderating against a written policy owned by a trust-and-safety policy team, not by engineering — that separation matters, because the model enforces a policy and does not define one, and every threshold conversation should route back to a policy owner. Assume 10 million items a day with a violation rate around 0.5 percent, and within that a much rarer tier of severe categories at a few per million. The two errors land on different people and that asymmetry is the design: a false negative harms the person who sees the content and, for severe categories, can be catastrophic and irreversible; a false positive harms the creator whose legitimate content was removed, silently and with a bad appeals experience. Because they are not symmetric, a single threshold is wrong — each policy category gets its own operating point, and severe categories run at a recall-favouring threshold with human review absorbing the false positives.',
      data:
        'Signals beyond the content are frequently stronger than the content itself and are underused: account age and history, prior violations, posting velocity, network signals such as coordinated behaviour across accounts, engagement patterns, and reports from users. A brand-new account posting at high velocity is a far better prior than any classifier reading a single message. Labels come from human moderators and they are noisy — inter-annotator agreement on borderline policy categories is often in the 0.6 to 0.8 range, which puts a hard ceiling on measurable model accuracy and must be reported alongside it, otherwise the team chases the last few points of an unattainable number. I handle policy change explicitly with policy versioning on every label and every decision, so a model trained under policy v3 is never evaluated against v4 labels without an acknowledged migration, and a policy change triggers a re-labelling campaign on a stratified sample rather than a blanket retrain.',
      architecture:
        'Cheap tiers first, and the ordering is where the economics live. Tier one is deterministic: hash matching against known-violating media, URL and domain blocklists, and account-level signals, which handles a large share of the worst content at essentially zero cost and with perfect precision on known items. Tier two is a small classifier — a distilled encoder running in single-digit milliseconds on CPU — which is highly confident on the vast majority of content in both directions; it clears the clearly-benign and flags the clearly-violating, and only the uncertain band goes further. Tier three is an LLM, used on the uncertain band and on the categories where policy nuance genuinely requires reading context, which is where it earns its cost. Tier four is human review. That cascade typically leaves 1 to 5 percent of volume reaching the LLM, which is the difference between an affordable system and an impossible one. Pre-publication blocking is reserved for the severe categories where the tier-one and tier-two checks are fast enough to sit inline, adding tens of milliseconds; everything else is post-publication review, because blocking every post behind an LLM call would add seconds to the publishing path and would still be wrong sometimes. Reviewer routing is a priority queue over expected harm — severity times reach times confidence — rather than first-in-first-out, because reviewer capacity is fixed and a queue that processes in arrival order spends it on low-harm items while a viral severe item waits.',
      evaluate:
        'The threshold is a policy decision presented as a hyperparameter, and I would refuse to set it in engineering: I produce the precision-recall curve per category with the concrete consequences at each point — at this threshold we remove this many legitimate posts a day and miss this many violations — and the policy owner chooses. Documenting who chose is part of the design. For a class at 0.1 percent of traffic, accuracy is meaningless and even a global precision-recall number is dominated by the common categories, so evaluation is stratified per category with fixed evaluation sets that oversample positives, and the reported metrics are precision and recall per category with the human-agreement ceiling alongside. Prevalence — the estimated fraction of violating content that remains live after moderation — is estimated separately by sampling published content and reviewing it, because that is the number that actually describes user experience and it cannot be derived from classifier metrics. Against adapting adversaries, static evaluation sets rot quickly: I keep a rolling adversarial set harvested from what got through, and I track the age distribution of evasion patterns, because a rising share of novel evasions is the early signal that a category is being actively probed.',
      deploy:
        'A policy change is not a model deploy, it is a coordinated change to a rulebook, a labelling guideline, a reviewer training, and only then a model. The order matters: guidelines and reviewer training first, then re-label a stratified sample under the new policy, then evaluate the existing model against the new labels to size the gap, then retrain or adjust thresholds, then ship. Shipping the model first means reviewers and model disagree systematically and both sets of labels become untrustworthy. Appeals are a first-class path, not a support ticket: an appeal goes to a different reviewer than the original decision, the outcome is recorded as a label, and a category with a high appeal-overturn rate is a signal that the threshold or the policy is wrong. Overturn rate per category is one of the most informative metrics in the whole system and it is generated for free by giving users a real appeal.',
      wrapup:
        'Cost per item: tiers one and two are fractions of a cent per thousand items; the LLM tier at an assumed 3 percent of 10 million items is 300,000 calls a day at roughly 700 tokens each, about 630 USD a day at 0.30 USD per million blended for a small model; human review at 1 in 2,000 items is 5,000 reviews a day, which at an assumed 30 seconds each is about 42 reviewer-hours daily and is by a wide margin the largest cost. That ranking — humans first, then the LLM tier, then everything else — is what tells you the highest-leverage optimisation is improving the routing to reviewers, not making the model cheaper. To a regulator I would describe: the policy and who owns it, the tiered pipeline and what each tier decides, the per-category operating points and who chose them, prevalence estimates, appeal volumes and overturn rates, and the human review capacity — and I would be explicit that the system has both error types, quantify them, and not claim it catches everything.',
      numbers: [
        'Cascade economics: at 10M items/day, tiers 1 and 2 clear roughly 97 percent, leaving about 300K LLM calls/day at roughly 700 tokens = 210M tokens, about 630 USD/day at an assumed 0.30 USD per million blended.',
        'Human cost dominates: 5,000 reviews/day at an assumed 30 seconds each is about 42 reviewer-hours/day, which at a loaded rate of 25 USD/hour is roughly 1,050 USD/day — more than the model tier.',
        'Base rate: at a 0.5 percent violation rate, a classifier with 95 percent recall and 90 percent precision still surfaces 5,555 items/day of which 555 are legitimate content removed, which is the number a policy owner should see before choosing a threshold.',
        'Label ceiling: inter-annotator agreement of 0.6-0.8 on borderline categories caps measurable model accuracy, so reporting model performance without the human-agreement baseline invites chasing points that do not exist.',
      ],
    },
    delivery: {
      budget: { requirements: 9, estimates: 8, apiAndData: 10, architecture: 15, deepDive: 13, wrapUp: 5 },
      opening:
        'I want to build this as a cascade with the cheap deterministic tiers first, and I want to be explicit that the threshold on each category is a policy decision I will present rather than a hyperparameter I will tune.',
      traps: [
        'Sending everything to an LLM. At 10 million items a day the cascade is not an optimisation, it is the difference between a viable system and an impossible one.',
        'One threshold across categories. The two error types land on different people and the balance differs sharply between a spam category and a severe-harm one.',
        'Ignoring the label noise ceiling. If moderators agree only 70 percent of the time, no model can measurably exceed that, and the team will burn quarters trying.',
        'First-in-first-out reviewer queues. Reviewer capacity is the scarcest resource in the system and it should be spent in order of expected harm.',
      ],
      whenPushed: [
        {
          challenge: 'Why not block everything pre-publication and be safe?',
          answer:
            'Because it adds seconds to every post and it is still wrong, so you get a slow product and false positives. I block pre-publication only for the severe categories where the inline tiers are fast and the harm is irreversible, and the rest is post-publication with fast takedown. That is a deliberate trade and I would put the prevalence estimate in front of the policy owner as the cost of it.',
        },
        {
          challenge: 'Your model will be worse in low-resource languages, and that is where you have the fewest reviewers.',
          answer:
            'That is correct and it is the most common real failure of these systems. I would measure and report per-language performance rather than a global number, lower the LLM-routing threshold for languages where the small classifier is weak — spending more compute exactly where the model is worse — and treat reviewer coverage per language as a launch requirement for that market rather than something to fix later.',
        },
      ],
    },
    diagram: `flowchart TD
  UGC["User-generated content"] --> T1["Tier 1: hash match, blocklists, account signals (~0 cost)"]
  ACCT[("Account age, history, velocity, network, user reports")] --> T1
  T1 -->|known violating| BLOCK["Block + enforce"]
  T1 --> T2["Tier 2: distilled classifier, single-digit ms CPU"]
  T2 -->|confident benign| PUB["Publish"]
  T2 -->|confident violating, severe| BLOCK
  T2 -->|uncertain band, ~3%| T3["Tier 3: LLM with policy context"]
  T3 -->|clear| PUB
  T3 --> PQ["Priority queue: severity x reach x confidence"]
  PQ --> HR["Human review (capacity-bound, the dominant cost)"]
  HR --> DEC["Decision + label (policy version stamped)"]
  DEC --> APP["Appeal: different reviewer"]
  APP -->|overturn rate per category| POLICY["Policy owner sets per-category operating point"]
  POLICY -->|PR curve with real consequences| T2
  SAMPLE["Sampled published content review"] --> PREV[("Prevalence estimate")]
  ADV[("Rolling adversarial set from what got through")] --> T2`,
  },
  {
    id: 'aisdq-anomaly-detection-product',
    patternId: 'aisdp-ai-product',
    title: 'Design anomaly detection inside a product',
    companies: ['amazon', 'microsoft'],
    minutes: 45,
    steps: {
      define: [
        'What is an anomaly here, and who acts on it?',
        'What is the alert budget — how many can a human look at per day?',
        'What is the cost of a missed anomaly versus a false alarm, and are they comparable?',
      ],
      data: [
        'What is the base rate, and what does that do to precision at any plausible recall?',
        'Do you have labels, and if not, what does that force?',
        'What seasonality and structure exist in this data that a naive model will call anomalous?',
      ],
      architecture: [
        'Draw the detection path from event to alert.',
        'Do you use statistical baselines, a learned model, or an LLM, and where does each fit?',
        'How do you group related anomalies so one incident is one alert?',
        'How do you explain an anomaly to the person who has to act on it?',
      ],
      evaluate: [
        'How do you evaluate a detector when you never learn about the anomalies you missed?',
        'What metric would you report to the team that owns the alerts?',
      ],
      deploy: [
        'How do you introduce a new detector without flooding the on-call?',
        'How do you retire a detector that nobody acts on?',
      ],
      wrapup: [
        'What is the real cost of this system, and is it the compute?',
        'When would you not build anomaly detection at all?',
      ],
    },
    solution: {
      define:
        'An anomaly is only meaningful relative to an action, so I would refuse to build a general anomaly detector and instead ask what the person receiving the alert will do. Take a concrete case: unusual spending patterns on a business account, where the recipient is a fraud analyst who will freeze or investigate. That framing gives an alert budget, which is the hard constraint everyone skips: if the team can investigate 50 alerts a day, then the system produces at most 50 alerts a day, and every design decision follows from that number rather than from a detection threshold. Costs are not comparable — a missed fraud is a direct financial loss with a known expected value, while a false alarm costs analyst time and, if it results in a freeze, an angry customer. Because they are quantifiable in different units, the operating point is a business decision, and I would put the expected-loss arithmetic in front of the owner rather than picking a threshold.',
      data:
        'Base rate is brutal and it must be said out loud early: if 0.1 percent of accounts have an anomalous week, then a detector with 99 percent specificity produces ten false alarms for every true one, and no amount of model quality escapes that arithmetic — it is the base-rate fallacy and it is why anomaly-detection projects usually fail on precision rather than recall. Labels are typically sparse and delayed: confirmed fraud arrives weeks later and only for cases someone investigated, which means the labelled set is censored by past detection. That pushes the design toward semi-supervised: unsupervised or statistical detection to generate candidates, supervised ranking on the labels that do exist to prioritise them. Structure a naive model will misread: weekly and monthly seasonality, month-end and quarter-end spikes, paydays, holidays, and product launches. Modelling that structure explicitly rather than letting a detector rediscover it as anomalies is most of the practical work.',
      architecture:
        'Three layers, matched to what each is good at. A statistical baseline per entity — a robust estimate of the expected value with seasonality decomposed, and a deviation measured in robust units such as median absolute deviation rather than standard deviations, which are wrecked by the very outliers you are looking for. That layer is cheap, explainable and handles the majority of real signal. A learned model on top for multivariate patterns no single metric shows, ranked by a supervised model trained on the confirmed cases. And an LLM at the end, not as a detector — it is a poor and expensive detector — but as an explainer and triager: given the anomalous entity, its history, the deviating signals and relevant context, produce the narrative an analyst would otherwise assemble by hand, with the evidence. That is a genuinely good use of an LLM here and it attacks the actual bottleneck, which is analyst time per alert rather than detection. Grouping is essential to respecting the alert budget: anomalies are clustered by entity, by time window and by correlated signal, so one incident affecting forty accounts is one alert with forty members rather than forty pages. Without grouping, the first real incident exhausts the day alert budget in a minute.',
      evaluate:
        'You never learn about what you missed, so recall is not directly measurable and anyone claiming a recall number for a detector like this should be asked how. The honest instruments are: injected synthetic anomalies with known characteristics, which give a detection rate for the classes you thought of; a periodic audit where analysts investigate a random sample of non-alerted entities, which is expensive and is the only unbiased estimate of the miss rate; and post-hoc analysis of incidents discovered by other means — a customer report, a downstream loss — asking whether the signal was present in the data and simply not alerted. The metric I would report to the owning team is precision and the action rate: of the alerts we sent, what fraction did an analyst act on. Action rate is the number that actually tracks whether the system is useful, it is free to collect, and a detector whose action rate falls below a threshold should be retired.',
      deploy:
        'A new detector goes into shadow first, producing alerts nobody sees, for long enough to see its volume across a full seasonal cycle including a month-end — most detectors that look fine for a week produce a hundred alerts on the last day of the quarter. Then it runs at a low volume cap, deliberately limited to the top-scoring few per day, and the cap is raised only if the action rate justifies it. That volume cap is the single most useful operational control in an alerting system and it is routinely missing. Retirement is the discipline nobody has: every detector is reviewed on a schedule against its action rate, and one that nobody acts on is disabled rather than left running, because a channel full of ignored alerts trains the team to ignore the channel, which silently degrades every other detector in it.',
      wrapup:
        'The real cost is not compute — statistical baselines over even a large entity set are cheap, and the LLM explainer at 50 alerts a day is pennies. The real cost is analyst time and the attention tax on the team, and the second-order cost is what a badly tuned system does to trust in alerting generally. I would not build anomaly detection at all when the base rate is so low that no achievable precision produces an actionable alert stream, when nobody is committed to investigating the alerts, or when a simple threshold on one well-chosen metric captures most of the value — which is more often than practitioners like to admit, and starting there gives you a baseline that a learned detector must beat rather than merely differ from.',
      numbers: [
        'Base rate: at 0.1 percent anomalous entities and 99 percent specificity, alerts are 0.001 x recall true positives against 0.999 x 0.01 false positives — roughly 10 false alarms per true one even at perfect recall.',
        'Alert budget: an analyst team handling 50 investigations a day at an assumed 20 minutes each is about 17 analyst-hours daily, and that capacity, not a threshold, is what sets the system operating point.',
        'Grouping: one incident touching 40 accounts must be 1 alert, not 40, or a single event consumes 80 percent of a 50-alert daily budget.',
        'LLM explainer cost: 50 alerts/day at roughly 4,000 tokens of context each is 200K tokens/day, well under 1 USD — negligible against 17 analyst-hours, which is where the money is.',
      ],
    },
    delivery: {
      budget: { requirements: 7, estimates: 7, apiAndData: 6, architecture: 11, deepDive: 10, wrapUp: 4 },
      opening:
        'I want to start from the alert budget rather than from the detector, because how many alerts a human can investigate per day is the binding constraint, and the base-rate arithmetic makes that constraint much tighter than people expect.',
      traps: [
        'Ignoring the base rate. At a 0.1 percent prevalence even a very good detector produces mostly false alarms, and that arithmetic — not model quality — is what kills these projects.',
        'Using standard deviations for outlier detection. The outliers inflate the standard deviation, so the very anomalies you want are what hide them; use robust statistics.',
        'No grouping. One incident affecting forty entities becomes forty pages, and the first real event exhausts the day capacity.',
        'Never retiring detectors. A stream of ignored alerts trains the team to ignore the whole channel, degrading every other detector alongside it.',
      ],
      whenPushed: [
        {
          challenge: 'Why not have an LLM read the data and find the anomalies?',
          answer:
            'Because it is an expensive and unreliable detector over numeric series and it does not scale to millions of entities. Where it is genuinely excellent is the step after detection: assembling the context, the history and the deviating signals into the explanation an analyst would otherwise build by hand. That attacks the real bottleneck, which is minutes per alert, not detection itself.',
        },
        {
          challenge: 'You cannot measure recall, so how do you know it works?',
          answer:
            'I would not pretend to a recall number. What I can measure is the detection rate on injected synthetic anomalies, the action rate on real alerts, and — expensively but genuinely — the miss rate from a random audit of non-alerted entities. I would also count incidents found by other means and check whether the signal was present, because that is the most credible evidence of a gap.',
        },
      ],
    },
    diagram: `flowchart TD
  EV["Event stream per entity"] --> SEAS["Seasonality decomposition: weekly, monthly, month-end, holidays"]
  SEAS --> BASE["Robust baseline per entity (median absolute deviation, not std dev)"]
  BASE --> CAND["Candidate anomalies"]
  EV --> MV["Multivariate learned detector"]
  MV --> CAND
  LBL[("Sparse, delayed confirmed cases")] --> RANK["Supervised ranker over candidates"]
  CAND --> RANK
  RANK --> GRP["Group by entity, time window, correlated signal"]
  GRP --> CAP["Volume cap: top N per day = alert budget"]
  CAP --> LLM["LLM explainer: history + deviating signals + context, with evidence"]
  LLM --> ALERT["Analyst alert"]
  ALERT --> ACT[("Action rate per detector")]
  ACT -->|below floor| RETIRE["Retire detector"]
  SYN["Injected synthetic anomalies"] --> CAND
  AUDIT["Random audit of non-alerted entities"] --> MISS[("Unbiased miss-rate estimate")]
  NEW["New detector"] --> SHADOW["Shadow through a full seasonal cycle"]
  SHADOW --> CAP`,
  },
]

export const aiSdQuestions: AiSdQuestion[] = [
  ...servingQuestions,
  ...gatewayQuestions,
  ...ragQuestions,
  ...agentQuestions,
  ...evalQuestions,
  ...multimodalQuestions,
  ...trainingQuestions,
  ...productQuestions,
]
