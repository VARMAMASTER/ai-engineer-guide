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
