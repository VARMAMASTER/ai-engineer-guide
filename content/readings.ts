import type { Reading } from '@/lib/content/schema'

// Summaries are authored, not generated (spec 6.10): there is no summarisation API in this app,
// and adding one would need an API key, break the no-environment-variables property, cost money
// per view, and vary between readers. These are written once, reviewed once, and work offline.
//
// Diagrams are Mermaid `flowchart` source and are present only where a picture beats the prose.
// They must show the MECHANISM, not restate the title in a box, and must stay legible on a 390px
// phone in both themes: short labels, no styling directives, no click handlers.

export const readings: Reading[] = [
  // Week 1
  {
    id: 'read-rag-2020',
    weekId: 'week-01',
    kind: 'paper',
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    source: 'Lewis et al., Meta AI',
    year: 2020,
    url: 'https://arxiv.org/abs/2005.11401',
    why: 'The paper that named RAG. Read it to see what the original architecture did and did not claim, before you build your own version of it this week.',
    minutes: 35,
    summary: {
      problem:
        'Large pretrained seq2seq models keep all their knowledge in their weights. That knowledge is frozen at training time, cannot be revised without retraining, offers no provenance for any answer, and degrades into confident invention on knowledge-intensive questions.',
      idea: 'Treat the retrieved document as a latent variable: let a dense retriever fetch passages for the input and have the generator marginalise over them, so retriever and generator are trained together as one model.',
      how: "A DPR bi-encoder embeds the query and a Wikipedia index of roughly 21 million 100-word passages; a FAISS maximum-inner-product search returns the top k. BART-large then generates conditioned on the query plus each passage. RAG-Sequence marginalises over a single passage for the whole output; RAG-Token can attend to a different passage at each token. The query encoder and the generator are fine-tuned end to end while the document index stays frozen.",
      result:
        'Set new state of the art on open-domain QA across Natural Questions, WebQuestions and CuratedTREC, reaching 44.5 exact match on Natural Questions, ahead of both a far larger closed-book T5 and prior extractive retrieve-and-read pipelines. Human raters also judged its generations more factual and more specific than plain BART.',
      soWhat:
        "This is the baseline for month 1's proj-rag: every ms-rag milestone you build this month (chunking, reranking, the eval harness, guardrails) is a modification of this loop. It is also the standard interview opener, so be able to say what the original proposed and where your version departs from it.",
      limits:
        "Single-hop by construction: everything the answer needs has to sit inside one of the k passages, so multi-hop questions and corpus-wide sensemaking are out of reach. That is exactly the gap GraphRAG and HippoRAG attack in month 3. The document index is frozen during training, so re-indexing means re-encoding the corpus. And almost nobody does the joint end-to-end training in production; modern RAG bolts a frozen off-the-shelf retriever to an API model with prompts, which is a materially different system from the one measured here.",
    },
    diagram: `flowchart LR
  Q["Query"] --> QE["Query encoder"]
  QE -->|"top-k MIPS"| IDX["Passage index"]
  IDX --> P["k passages"]
  Q --> G["BART generator"]
  P --> G
  G -->|"marginalise over passages"| A["Answer"]
  G -->|"gradient to query encoder"| QE`,
  },
  {
    id: 'read-anthropic-contextual-retrieval',
    weekId: 'week-01',
    kind: 'post',
    title: 'Introducing Contextual Retrieval',
    source: 'Anthropic',
    year: 2024,
    url: 'https://www.anthropic.com/engineering/contextual-retrieval',
    why: 'Shows a concrete, production-tested fix for chunks that lose context, which directly informs how you design chunking in ms-rag-1 this week.',
    minutes: 25,
    summary: {
      problem:
        'Splitting documents into chunks for indexing destroys the context each chunk sat in. A chunk reading "revenue grew 3% over the previous quarter" no longer says which company or which quarter, so neither the embedding nor BM25 can match it to a question that names them.',
      idea: 'Before indexing, have a cheap model write a short situating description of each chunk given the whole document, and prepend that description to the chunk.',
      how: 'For every chunk, prompt a small model with the full document plus that chunk and ask for 50 to 100 tokens explaining where it sits. Prepend the result to the chunk, then build both the embedding index and the BM25 index over the contextualised text. At query time fuse dense and lexical results by rank, and optionally rerank a wide candidate set of about 150 down to the 20 you pass to the model. Prompt caching keeps the one-off indexing pass cheap.',
      result:
        'Anthropic reported that contextual embeddings cut top-20 retrieval failure rate by about 35% (5.7% to 3.7%), contextual embeddings plus contextual BM25 by about 49% (to 2.9%), and adding a reranker on top by about 67% (to 1.9%), at roughly one dollar per million document tokens to build the contextual index.',
      soWhat:
        "It is the highest-leverage change available to ms-rag-1's chunking design this week, and it hands you the full dense-plus-BM25-plus-rerank stack you formalise in ms-rag-2 next week.",
      limits:
        'It costs an LLM pass over every chunk at index time and must be redone whenever a document changes, which is awkward for fast-moving corpora. The gain shrinks when chunks are already self-contained or documents are short enough to pass whole. It improves retrieval only: nothing here fixes generation faithfulness, multi-hop reasoning, or whether the model actually uses the evidence it was given. And the numbers come from internal eval sets, not a public benchmark you can reproduce.',
    },
  },
  {
    id: 'read-api-claude-fable-5-1',
    weekId: 'week-01',
    kind: 'api',
    title: 'Claude Fable 5.1',
    source: 'Anthropic',
    year: 2026,
    url: 'https://www.anthropic.com/claude-fable-and-mythos-5-1',
    why: "Anthropic's current frontier model, already shipping on the API. Skim the launch page for context limits and pricing before you pick a generator this week.",
    minutes: 10,
    summary: {
      problem:
        'Picking a generator for a RAG stack means knowing context window, price, and API surface, and every model generation quietly changes all three while the code you copied from a tutorial stays the same.',
      idea: "Fable 5.1 is Anthropic's most capable widely released model, and it replaces the old fixed thinking budget with always-on reasoning plus an effort dial.",
      how: 'Model id `claude-fable-5-1`, 1M-token context window, up to 128K output tokens. Thinking is always on, so you omit the `thinking` parameter entirely and control depth with `output_config.effort` (low through max); `budget_tokens` now returns a 400. Assistant prefill and forced `tool_choice` are removed. A policy decline arrives as a 200 with `stop_reason: "refusal"`, which you handle with the server-side `fallbacks` parameter rather than a retry loop.',
      result:
        'Priced at $10 per million input tokens and $50 per million output tokens, roughly twice Claude Opus 5 at $5 and $25, which makes it a deliberate choice for hard reasoning rather than a default generator.',
      soWhat:
        'Week 1 you choose the generator for proj-rag. Read the page for the two numbers that decide it: context window against your chunk budget, and output price against your per-query cost target.',
      limits:
        'Vendor launch pages report vendor benchmarks on vendor tasks; they tell you nothing about your corpus. Pricing and limits move, so treat any figure you memorise as stale within months. And the most capable model is usually the wrong RAG generator anyway: retrieval quality, not generator capability, is what caps a RAG system, so spending the budget here instead of on reranking is the classic beginner trade.',
    },
  },
  {
    id: 'read-api-gpt-6-astra',
    weekId: 'week-01',
    kind: 'api',
    title: 'GPT-6 Astra',
    source: 'OpenAI',
    year: 2026,
    url: 'https://openai.com/index/gpt-6-astra/',
    why: 'A second frontier model available now for the generator slot in your RAG stack. Compare its context window and pricing against Claude before you commit.',
    minutes: 10,
    summary: {
      problem:
        'A single-model stack has no baseline. When an answer is wrong you cannot tell whether your retrieval failed or the generator did, because you have nothing to hold it against.',
      idea: "GPT-6 Astra is OpenAI's current frontier release and the natural second generator to benchmark your RAG pipeline against.",
      how: 'Read the launch page for the four numbers that actually change your design: context window, input and output price per million tokens, rate limits, and which tool-use and structured-output features are supported. Then note the API surface differences from Anthropic - system message handling, tool schema shape, and streaming event names all differ enough that you want an adapter layer rather than SDK calls scattered through your code.',
      result:
        'OpenAI ships its own benchmark suite with the launch. Read those as vendor-selected and unverified on your data, and treat the concrete platform numbers (context, price, rate limits) as the only part of the page you can act on directly.',
      soWhat:
        "Week 1 of proj-rag. Put the generator behind an interface now so that ms-rag-3's eval harness in week 3 can swap models and score them, instead of you hard-coding one SDK and discovering the coupling later.",
      limits:
        'Launch-page benchmarks are chosen by the vendor and almost never include retrieval-augmented settings, so they do not predict RAG answer quality at all. Prices and context limits move. And a second provider doubles your prompt-maintenance surface: the same prompt does not transfer cleanly between model families, so a fair comparison means tuning both, which is work most benchmarks skip.',
    },
  },
  {
    id: 'read-api-gemini-3-8-flash',
    weekId: 'week-01',
    kind: 'api',
    title: 'Gemini 3.8 Flash',
    source: 'Google',
    year: 2026,
    url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/',
    why: 'A fast, low-cost model already available from Google, useful once ms-rag-3 later this month needs a cheap model for query rewriting and reranking experiments.',
    minutes: 10,
    summary: {
      problem:
        'Query rewriting, relevance grading, and judge scoring each fire several small model calls per user question. Running all of them on a frontier model makes the unit economics of a RAG system collapse long before quality does.',
      idea: 'A Flash-class model exists to be the cheap fast tier in front of the expensive one, not to be the best model you have.',
      how: 'Read the page for cost per million tokens, latency, context window, and whether it supports the structured-output and function-calling shapes your pipeline needs. Then design two tiers explicitly: the cheap model handles query rewriting, metadata filter extraction, and first-pass relevance; the expensive model only writes the final answer that a user reads.',
      result:
        'The Flash line is positioned on price and latency rather than peak capability, and the launch page carries the current per-token figures. The number that matters for your design is the ratio between this tier and the frontier tier, not either price alone.',
      soWhat:
        'You need this by week 3, when ms-rag-3 adds query rewriting and a semantic cache. Both are high-volume, low-difficulty calls that should never touch your most expensive model, and getting the tiering right is what makes the cost section of your month 1 write-up credible.',
      limits:
        'Cheap models degrade fastest on exactly the judgement-heavy jobs people hand them: relevance grading and LLM-as-judge scoring. Measure the cheap tier against the expensive one on your own eval set before trusting it, and re-measure after every version bump, because a silent model update can move your scores without any change on your side. Vendor latency figures are measured under ideal conditions, not from your region under load.',
    },
  },

  // Week 2
  {
    id: 'read-lost-in-the-middle',
    weekId: 'week-02',
    kind: 'paper',
    title: 'Lost in the Middle: How Language Models Use Long Contexts',
    source: 'Liu et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2307.03172',
    why: 'Explains why stuffing more retrieved chunks into the prompt can hurt answer quality, which shapes how you order context in this week\'s hybrid retrieval work.',
    minutes: 35,
    summary: {
      problem:
        'Long-context models were sold as a way to stop worrying and put everything in the prompt, and RAG systems accordingly stuffed in as many retrieved passages as would fit. Nobody had measured whether a model can actually use information sitting in the middle of a long input.',
      idea: 'Accuracy is a U-shaped function of where the relevant information sits in the context: strong at the beginning and the end, markedly worse in the middle.',
      how: 'Two controlled experiments. In multi-document QA the authors place one gold document among k distractors and slide its position through the context. In a synthetic key-value retrieval task they do the same with an exact-match lookup, which isolates position from reasoning difficulty. Everything else is held constant, so position is the only variable.',
      result:
        'Across several open and closed models, accuracy peaks when the relevant document is first or last and drops substantially when it sits in the middle, in the worst cases falling below what the same model scores with no retrieved documents at all. Extended-context variants were no better at using their extra context than their shorter counterparts.',
      soWhat:
        'This is why ms-rag-2 reranks and then passes a small ordered set rather than dumping the top 20 into the prompt. Put your best passage first, your second best last, cut the tail, and be ready to explain the ordering in the month 1 architecture defense document.',
      limits:
        'It measures a positional effect on retrieval-shaped tasks, not a general theory of long-context reasoning, and the models tested are from 2023 - position robustness has improved since, so quote the phenomenon rather than the specific curves. It also does not tell you the right number of passages: the trade-off between recall and dilution is something you have to measure on your own eval set, because it depends on your chunk size and your generator.',
    },
  },
  {
    id: 'read-bert-reranking',
    weekId: 'week-02',
    kind: 'paper',
    title: 'Passage Re-ranking with BERT',
    source: 'Nogueira and Cho',
    year: 2019,
    url: 'https://arxiv.org/abs/1901.04085',
    why: 'The original cross-encoder reranking recipe you are implementing this week in ms-rag-2, including why reranking beats retrieval scores alone.',
    minutes: 35,
    summary: {
      problem:
        'First-stage retrieval, whether BM25 or a bi-encoder, scores the query and the document independently. It can only match on surface overlap or on whatever a single fixed vector managed to compress, so the top of its ranked list is noisy - and precision at the top is the only part a user ever sees.',
      idea: 'Use BERT as a cross-encoder: feed the query and the passage together as one sequence so full attention runs between them, and read a single relevance score off the result.',
      how: 'Take roughly the top 1000 candidates from BM25. For each one build the input `[CLS] query [SEP] passage [SEP]`, run BERT over it, and pass the [CLS] vector through a single-layer classifier to get a relevance probability. Fine-tune with cross-entropy on labelled relevant and sampled non-relevant pairs, then sort the candidate list by that score and keep the head.',
      result:
        'On the MS MARCO passage re-ranking task it lifted MRR@10 from roughly 0.19 for the BM25 baseline to roughly 0.37, close to doubling it and topping the leaderboard at the time, with a comparable step change on TREC-CAR.',
      soWhat:
        'This is precisely the component ms-rag-2 asks you to add this week, and the two-stage retrieve-then-rerank shape is the single most reliable quality win available in a RAG stack. It is also the crispest answer to the bi-encoder versus cross-encoder interview question.',
      limits:
        'Cost is the whole story. A cross-encoder runs one forward pass per candidate, so it can never search a corpus - it only reorders a shortlist that a cheap retriever produced, and its ceiling is that shortlist\'s recall. Latency grows linearly with candidate count, which is why production systems rerank 50 to 200 rather than 1000. And it produces no reusable embedding, so nothing can be precomputed or cached across queries the way vectors can.',
    },
    diagram: `flowchart LR
  Q["Query"] --> BM["BM25 first stage"]
  BM -->|"top 1000 candidates"| C["Candidate passages"]
  Q --> X["Cross-encoder over query and passage"]
  C --> X
  X -->|"one forward pass per pair"| S["Relevance scores"]
  S -->|"sort, keep top 10"| A["Context to generator"]`,
  },

  // Week 3
  {
    id: 'read-ragas',
    weekId: 'week-03',
    kind: 'paper',
    title: 'RAGAS: Automated Evaluation of Retrieval Augmented Generation',
    source: 'Es et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2309.15217',
    why: 'Gives you the reference-free metrics for faithfulness and relevance you need this week to build the eval harness module in ms-rag-3.',
    minutes: 35,
    summary: {
      problem:
        'Evaluating a RAG pipeline meant either human annotation or a ground-truth answer set. Both are expensive to build and go stale the moment the corpus changes, so most teams shipped retrieval changes on intuition and hoped.',
      idea: 'Score a RAG answer without any reference answer by decomposing quality into three separately checkable relationships between the question, the retrieved context, and the generated answer.',
      how: 'Three reference-free metrics, each computed by prompting a model. Faithfulness breaks the answer into atomic statements and asks whether each is supported by the retrieved context, then takes the supported fraction. Answer relevance asks a model to generate questions the answer would answer and measures their embedding similarity to the real question. Context relevance asks the model to extract only the sentences in the context that were actually needed and scores that against the total.',
      result:
        'The authors report that these automatic scores align with human judgements considerably better than the baselines they compare against, and they ship the metrics as a library that runs against your own pipeline with no labelled data at all.',
      soWhat:
        'ms-rag-3 this week is the eval harness. These three metrics give you a regression suite that runs on every change, which is what turns your RAG project from a demo into something you can defend. Evaluating a RAG system without ground truth is also a near-guaranteed interview question.',
      limits:
        'Every metric is an LLM call, so your evaluator inherits the judge model\'s biases, its cost and its non-determinism: the same pipeline scores differently across two runs, and scores are not comparable across judge models or judge versions. Faithfulness measures grounding in the retrieved context, not truth - a confidently wrong context yields a perfect faithfulness score. And none of the three tells you whether retrieval missed the right document entirely, which is why you still need recall measured against a small labelled set.',
    },
  },
  {
    id: 'read-seven-failure-points',
    weekId: 'week-03',
    kind: 'paper',
    title: 'Seven Failure Points When Engineering a Retrieval Augmented Generation System',
    source: 'Barnett et al.',
    year: 2024,
    url: 'https://arxiv.org/abs/2401.05856',
    why: 'A field-tested taxonomy of what actually breaks in RAG systems, which you use this week to design the ablation cases for your eval harness.',
    minutes: 35,
    summary: {
      problem:
        'RAG failures get discussed as one undifferentiated thing - "it hallucinated" - when the pipeline can break at seven distinct points with a different fix at each. Without a taxonomy, teams debug by swapping the model and hoping.',
      idea: 'Distil three real RAG deployments into a named list of failure points, each attached to the pipeline stage that causes it.',
      how: 'The authors study three case studies (a research paper corpus, a biomedical corpus, and an internal document system) and catalogue seven failures: missing content, where the answer is not in the corpus at all; missed top-ranked documents; not-in-context, where a document was retrieved but dropped during consolidation; not extracted, where the answer is in the context but the model missed it; wrong format; incorrect specificity; and incomplete answers. For each they report the mitigation the team actually used and what it cost them.',
      result:
        'The contribution is the taxonomy plus lessons drawn from running systems, notably that chunk size and top-k are workload-dependent parameters rather than settings you can copy from a tutorial, and that several failure modes only become visible once the system is exposed to real queries rather than the ones its builders imagined.',
      soWhat:
        'Turn this list into the ablation cases for the ms-rag-3 eval harness you build this week: one test per failure point, so a regression tells you which stage broke rather than only that the aggregate score fell. It is also the natural structure for the failures defense document that closes month 1.',
      limits:
        'It is a qualitative field study over three systems, not a controlled experiment. There are no measured frequencies telling you which failure point costs you most, and the mitigations are reports of what worked for those teams rather than validated interventions. It also predates most agentic and graph-based retrieval, so the failure modes unique to multi-hop and tool-using pipelines - which you meet in months 3 and 4 - are not in the list.',
    },
  },

  // Week 4
  {
    id: 'read-prompt-injection',
    weekId: 'week-04',
    kind: 'paper',
    title: "Not What You've Signed Up For: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection",
    source: 'Greshake et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2302.12173',
    why: 'Documents how instructions hidden in retrieved documents hijack an LLM, the exact threat model your guardrail layer in ms-rag-4 must defend against this week.',
    minutes: 35,
    summary: {
      problem:
        'Prompt injection was being discussed as a user typing something clever into a chat box. Once an LLM is wired to retrieval, browsing, or email, the attacker no longer needs to talk to it at all.',
      idea: 'Any content the model retrieves is untrusted input, so an attacker can plant instructions in a document and have them execute whenever the application fetches it.',
      how: 'The authors define a threat model where the adversary controls data the model will later ingest - a web page, a document in your index, an email, a code comment - and enumerate delivery vectors: passive, where you wait for retrieval to happen; active, where the payload is sent to the victim; and hidden text invisible to a human reader but plain to the model. They then show what an injected instruction can achieve once the model has tools: information gathering, exfiltration through outbound calls, manipulating what the user is told, and persisting across turns.',
      result:
        'They demonstrate working end-to-end attacks against real LLM-integrated applications of the day, including Bing Chat and code assistants, showing that the application can be compromised without the attacker ever touching the user\'s session or credentials.',
      soWhat:
        'This is the threat model your ms-rag-4 guardrail layer defends against this week. Concretely: never let retrieved text occupy the instruction channel, treat any tool call whose arguments originate in retrieved content as untrusted, and write the attack cases into your eval set. It is also the security question that separates people who have shipped RAG from people who have read about it.',
      limits:
        'The paper establishes the attack surface; it does not give you a solution. None of the mitigations discussed - delimiters, instruction hierarchies, input filtering - are complete defences, because the model has no reliable way to distinguish data from instruction. Expect defence in depth (least-privilege tools, human approval on side effects, output-side checks) rather than a fix. The specific demonstrations target 2023 products and have been patched; the class of attack has not been.',
    },
  },
  {
    id: 'read-self-rag',
    weekId: 'week-04',
    kind: 'paper',
    title: 'Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection',
    source: 'Asai et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2310.11511',
    why: 'Shows a model deciding when to retrieve and self-critiquing its answer, directly relevant to the RAG-vs-fine-tuning defense question you close month 1 with.',
    minutes: 35,
    summary: {
      problem:
        'Standard RAG retrieves a fixed number of passages for every query whether or not retrieval helps, which injects irrelevant context into questions the model already knows the answer to, and it never checks whether the passage it used actually supports what it wrote.',
      idea: 'Train the model to emit special reflection tokens that decide mid-generation when to retrieve and whether each generated segment is relevant, supported, and useful.',
      how: 'Four kinds of reflection token are added to the vocabulary. Retrieve decides whether to fetch passages at this point. IsRel grades each retrieved passage for relevance, IsSup grades whether the produced segment is actually supported by it, and IsUse grades overall usefulness. A critic model labels training data with these tokens, and the generator is then trained on that data so it emits them itself at inference. At decode time the reflection tokens drive a segment-level beam search, and their weights can be changed at inference to trade fluency against citation precision without retraining.',
      result:
        'The authors report that 7B and 13B Self-RAG models outperform both standard retrieval-augmented baselines and substantially larger instruction-tuned models on open-domain QA, reasoning and fact verification, with notable improvements in factuality and citation accuracy for long-form generation.',
      soWhat:
        'It is the strongest answer to the month 1 defense question about when you should retrieve at all and how you know an answer is grounded. The self-critique loop is also the pattern behind the adaptive retrieval you build in month 2, though with a prompted critic rather than trained tokens.',
      limits:
        'It requires training: a critic model, a labelled corpus of reflection tokens, and a fine-tuned generator, which is a different project from wiring an API model to a vector store. The critique comes from the same model family as the generator, so its errors are correlated with rather than independent of the generator\'s. And segment-level beam search over reflection tokens costs several forward passes per segment, making it slower exactly where users notice latency.',
    },
    diagram: `flowchart TD
  P["Prompt"] --> R{"Retrieve?"}
  R -->|"no"| G["Generate segment directly"]
  R -->|"yes"| D["Fetch passages"]
  D --> REL["IsRel: grade passage relevance"]
  REL --> G2["Generate one segment per passage"]
  G2 --> SUP["IsSup: is segment supported?"]
  SUP --> USE["IsUse: is segment useful?"]
  USE --> B["Beam search picks best segment"]
  G --> B
  B --> N["Next segment or stop"]`,
  },

  // Week 5 (month 2, proj-advanced-rag: embeddings / retrieval theory)
  {
    id: 'read-mteb',
    weekId: 'week-05',
    kind: 'paper',
    title: 'MTEB: Massive Text Embedding Benchmark',
    source: 'Muennighoff et al.',
    year: 2022,
    url: 'https://arxiv.org/abs/2210.07316',
    why: 'Gives you a principled way to pick an embedding model for the parent-document and hierarchical chunk store this week\'s ms-advanced-rag-2 asks you to build.',
    minutes: 35,
    summary: {
      problem:
        'Embedding models were being compared on a handful of semantic-similarity datasets, and the leader on those was routinely not the best model for retrieval, clustering or classification. Teams were choosing embeddings on a benchmark that did not measure their use case.',
      idea: 'No single embedding model is best everywhere, so evaluate embeddings across many task types at once and read the per-task columns rather than the headline average.',
      how: 'MTEB assembles eight task types - bitext mining, classification, clustering, pair classification, reranking, retrieval, semantic textual similarity, and summarisation - over 56 datasets spanning 112 languages, under one uniform evaluation harness with a public leaderboard. Every model is run over all of them, so the trade-offs are visible in a single table instead of scattered across papers.',
      result:
        'Benchmarking 33 models showed that no model dominated all task types: the best model differed by task, and larger or more expensive embeddings were not reliably better at retrieval than smaller specialised ones.',
      soWhat:
        "Week 5's ms-advanced-rag-2 builds a parent-document and hierarchical chunk store, and the embedding model is the foundation under it. Use the retrieval column rather than the average, and prefer a model whose training domain resembles your corpus. How you chose your embedding model is a standard follow-up on any RAG project.",
      limits:
        'Leaderboard position is heavily gamed - models are trained on data close to MTEB\'s, so scores overstate generalisation, and the retrieval subsets skew toward web and academic text. The benchmark is also silent on the properties that decide production fit: embedding dimension and therefore index cost, inference latency, maximum sequence length, and licence. Build a 50-query eval on your own data; it will disagree with the leaderboard more often than you expect.',
    },
  },
  {
    id: 'read-api-claude-opus-5',
    weekId: 'week-05',
    kind: 'api',
    title: 'Claude Opus 5 with the effort dial',
    source: 'Anthropic',
    year: 2026,
    url: 'https://www.anthropic.com/news/claude-opus-5',
    why: "Anthropic's effort-dial release, live now on the API. It changes the cost-quality tradeoff for the retrieval planner you are building this week in ms-advanced-rag-1.",
    minutes: 10,
    summary: {
      problem:
        'Reasoning depth used to be a model choice: you picked a big model and paid for depth on every request, including the easy ones, or picked a small model and lost the hard ones.',
      idea: 'Opus 5 exposes reasoning depth as a request parameter, so cost and quality become a per-route dial on one model rather than a per-model decision.',
      how: 'Model id `claude-opus-5`, 1M-token context, $5 per million input tokens and $25 per million output. Adaptive thinking is on by default, and `output_config.effort` takes low, medium, high (the default), xhigh, and max. Effort changes thinking depth and total token spend, so the same code path can run cheap on routine traffic and deep on hard requests. The old `budget_tokens` parameter is gone and returns a 400.',
      result:
        'Lower effort on a current-generation model often matches or beats a previous generation at high effort, which makes the dial a genuine cost lever rather than just a quality switch you leave at maximum.',
      soWhat:
        "Month 2's ms-advanced-rag-1 builds a retrieval planner, which is the same idea one layer up: a per-request decision about how much work a query deserves. The effort dial is also the cleanest concrete answer to the interview question about controlling LLM cost in production.",
      limits:
        'The dial trades tokens for thoroughness inside one model; it will not rescue a bad retrieval stack, and raising effort on a retrieval failure just buys a more elaborate wrong answer. Changing top-level effort mid-conversation invalidates the prompt cache, which can cost more than the effort saves. And effort is not portable - every provider spells this differently or not at all - so it belongs behind your own abstraction, not sprinkled through your call sites.',
    },
  },

  // Week 6 (month 2: BM25/retrieval theory, agentic retrieval reasoning)
  {
    id: 'read-ir-book-bm25-eval',
    weekId: 'week-06',
    kind: 'post',
    title: 'Introduction to Information Retrieval: BM25 and evaluation chapters',
    source: 'Manning, Raghavan, and Schütze',
    year: 2008,
    url: 'https://nlp.stanford.edu/IR-book/',
    why: 'Grounds the BM25 half of your hybrid retriever and the evaluation metrics you reuse for the structured/unstructured router this week, in first-principles detail.',
    minutes: 25,
    summary: {
      problem:
        'Most people arrive at RAG from the embedding side and treat lexical search as a legacy baseline, without knowing why BM25 works, what its parameters do, or what recall@k actually measures. That makes hybrid retrieval a black box you can only tune by guessing.',
      idea: 'Ranking is a scoring function over term statistics and evaluation is a small set of precisely defined metrics, both derivable from first principles rather than tuned by feel.',
      how: 'The retrieval chapters build the scoring function up in stages: term frequency, then inverse document frequency to discount common words, then length normalisation, arriving at BM25 with its two knobs - `k1`, controlling how fast term frequency saturates, and `b`, controlling how strongly document length is normalised. The evaluation chapters define precision, recall, F measure, precision@k, mean average precision and nDCG, then explain how test collections are built and why pooled relevance judgements are systematically incomplete.',
      result:
        'BM25 remains a genuinely strong baseline nearly two decades on: dense retrievers routinely fail to beat it on out-of-domain queries and rare terms, which is exactly why production systems fuse the two rather than replacing one with the other.',
      soWhat:
        'It grounds the BM25 half of your hybrid retriever and gives you the vocabulary for evaluating this week\'s structured-versus-unstructured router. It is also the source material for interview questions like what `b` does in BM25 and why recall@k is the wrong metric for a given setup - the ones that separate people who used a library from people who understand it.',
      limits:
        'It is a textbook from 2008: nothing about dense retrieval, transformers, approximate nearest neighbour indexes, or fusing lexical and vector scores, so it gives you half of a modern retriever. BM25 itself matches terms, not meaning, so synonyms, paraphrase and cross-lingual queries are precisely where it fails and where embeddings earn their place. And the classical evaluation setup assumes a fixed corpus with human relevance judgements, which is not the situation you are in.',
    },
  },
  {
    id: 'read-api-glm-5-3',
    weekId: 'week-06',
    kind: 'api',
    title: 'GLM-5.3',
    source: 'Z.AI',
    year: 2026,
    url: 'https://z.ai/blog/glm-5.3',
    why: "Z.ai's frontier coding and agentic model, released and available on the API now; worth benchmarking as the router's cheap path since routing decisions live or die on unit economics.",
    minutes: 10,
    summary: {
      problem:
        'A router that sends every request to a frontier API has no cheap path, and routing logic only pays for itself when the cheap path is genuinely, dramatically cheaper than the expensive one.',
      idea: "GLM-5.3 is Z.AI's frontier coding and agentic model, positioned as an open-weight-lineage alternative to closed frontier APIs at a much lower price point.",
      how: 'Read the launch page for price per million tokens, context window, tool-calling support, and whether weights are downloadable. Then decide which half of your router it serves: the cheap path for structured extraction and routing decisions, or a self-hosted option for data that cannot leave your network. Benchmark it on your own router eval before it touches production traffic.',
      result:
        'Z.AI publishes agentic and coding benchmark comparisons with the release. Treat them as vendor-reported until you have scored the model on your own routing decisions, which is a narrower and far more format-sensitive task than any published benchmark.',
      soWhat:
        "Week 6's structured-versus-unstructured router lives or dies on unit economics: if the cheap path is not five to ten times cheaper, the routing logic costs more in complexity than it saves in tokens, and you should delete it.",
      limits:
        'Benchmark parity does not mean behavioural parity. Cheaper models follow long tool schemas less reliably and drift on output format under load, which is exactly what a router depends on, so measure format adherence and not just answer quality. Availability, rate limits and regional latency for smaller providers are also far less predictable than for the big three, which matters when the cheap path is on your critical request path.',
    },
  },

  // Week 7 (month 2: prompting techniques feed the query-rewriting / adaptive-retrieval milestone)
  {
    id: 'read-prompt-report',
    weekId: 'week-07',
    kind: 'paper',
    title: 'The Prompt Report: A Systematic Survey of Prompting Techniques',
    source: 'Schulhoff et al.',
    year: 2024,
    url: 'https://arxiv.org/abs/2406.06608',
    why: 'A vocabulary and taxonomy for prompting techniques, useful this week for designing the metadata-filter and routing prompts in ms-advanced-rag-3.',
    minutes: 35,
    summary: {
      problem:
        'Prompting techniques were scattered across hundreds of papers and blog posts with inconsistent names, overlapping definitions, and no way to tell a real technique from a rebranded one.',
      idea: 'Prompting now has enough of a literature to be catalogued, so the authors build a formal taxonomy and shared vocabulary for it from a systematic review.',
      how: 'A PRISMA-style systematic review over a large body of prompting papers produces a vocabulary of terms and a taxonomy of text-based prompting techniques, organised into families such as zero-shot, few-shot, thought generation, decomposition, ensembling, and self-criticism. The report adds sections on multilingual and multimodal prompting, agents, and security concerns including prompt injection, then runs a case study applying the catalogued techniques to a real labelling task.',
      result:
        'It catalogues dozens of distinct text-based prompting techniques across those families, and its case study shows both that technique choice moves task performance substantially and that automated prompt optimisation beat the authors\' own careful hand-tuning.',
      soWhat:
        "Week 7's ms-advanced-rag-3 needs prompts that extract metadata filters and route queries reliably. This gives you the named technique to reach for and, more usefully, the vocabulary to use in an interview instead of describing a technique you cannot name.",
      limits:
        'A survey is a map, not a result: it tells you a technique exists, not that it will help on your task, and its own case study shows how sensitive the answer is to the specific task. Prompting findings also age unusually fast - techniques that mattered on 2023 models are often no-ops on current reasoning models that do decomposition internally. And nothing in a taxonomy substitutes for an eval set; you still have to measure.',
    },
  },
  {
    id: 'read-api-deepseek-v4-flash-vision',
    weekId: 'week-07',
    kind: 'api',
    title: 'DeepSeek V4 Flash Vision',
    source: 'DeepSeek',
    year: 2026,
    url: 'https://api-docs.deepseek.com/news/news260821/',
    why: "DeepSeek's multimodal model, live on the API now; adds vision to the V4-Flash line, useful once this week's red-team eval set covers documents with embedded images.",
    minutes: 10,
    summary: {
      problem:
        'Real document corpora are full of scanned pages, screenshots, tables rendered as images, and charts. A text-only pipeline silently drops all of it, and your eval set never notices because it was built from the text you could extract.',
      idea: 'V4 Flash Vision adds image understanding to a cheap fast model line, which is what makes per-page multimodal parsing affordable at corpus scale rather than a demo.',
      how: 'Check the release for pricing, context window, supported image formats and resolutions, and how images are billed against tokens. Then decide where vision enters your pipeline: as an indexing-time step that turns page images into text you embed, or as a query-time step that shows the model the original page alongside the retrieved text. The two have very different cost profiles and very different failure modes.',
      result:
        'The Flash line is positioned on cost and speed rather than peak capability, and the release notes carry the current figures for the vision variant. Image token pricing is the number that decides whether indexing-time captioning of your whole corpus is affordable.',
      soWhat:
        "Week 7's red-team eval set for ms-advanced-rag-3 should include documents whose answer exists only inside an image. That is a failure mode you cannot fix later if you never measured it, and it is the kind of gap that makes a demo collapse in front of a real user.",
      limits:
        'Vision models still hallucinate table cells and misread small text, and those errors are harder to catch than text errors because there is no source string to diff against. Image tokens are expensive relative to text, so captioning a large corpus is a real budget line rather than a rounding error. And nothing here solves layout-aware chunking: you still have to decide what a chunk of a scanned page even is.',
    },
  },

  // Week 8 (month 2 wrap-up: production RAG patterns, hardened guardrails)
  {
    id: 'read-eugene-yan-llm-patterns',
    weekId: 'week-08',
    kind: 'post',
    title: 'Patterns for Building LLM-based Systems and Products',
    source: 'Eugene Yan',
    year: 2023,
    url: 'https://eugeneyan.com/writing/llm-patterns/',
    why: "A practitioner's checklist of retrieval, caching, and guardrail patterns that maps directly onto the hardened-guardrail red-team milestone you close month 2 with.",
    minutes: 25,
    summary: {
      problem:
        'The gap between a working LLM demo and a system you can operate is filled with unglamorous engineering decisions that appear in no paper, and every team rediscovers them separately and expensively.',
      idea: 'The recurring problems in LLM products resolve into a small set of named patterns, and knowing the list is most of the design work.',
      how: 'The post walks seven patterns and says when each applies: evals to measure performance, retrieval to add recent and proprietary knowledge, fine-tuning to specialise on a task, caching to cut cost and latency, guardrails to constrain output quality, defensive UX to design around errors you cannot eliminate, and collecting user feedback to build a data flywheel. Each comes with concrete implementation notes and references rather than abstractions.',
      result:
        'The value is in the ordering as much as the list: it argues evals come first and the data flywheel comes last, and that most teams reach for fine-tuning when caching, retrieval, or a better eval would have been cheaper and faster.',
      soWhat:
        'It maps almost one to one onto months 1 and 2 of your build - eval harness, retrieval, cache, guardrails - so use it as a checklist against your own system as you close month 2 this week, and as the frame for the architecture defense document.',
      limits:
        'It is a practitioner synthesis rather than measured research: no benchmarks, no ablations, and necessarily generic guidance about thresholds and parameters. It predates the agentic patterns that dominate month 4, and several of its cost assumptions have shifted as models got cheaper. Treat the pattern list as durable and the specific advice as dated.',
    },
  },
  {
    id: 'read-api-qwen-3-8',
    weekId: 'week-08',
    kind: 'api',
    title: 'Qwen 3.8',
    source: 'Alibaba',
    year: 2026,
    url: 'https://qwen.ai/blog?id=qwen3.8',
    why: "Alibaba's newest open-weight flagship, already released with open weights; worth benchmarking for on-prem or cost-sensitive deployments as you wrap up month 2 this week.",
    minutes: 10,
    summary: {
      problem:
        'Every API model is a dependency you cannot inspect, cannot pin, and cannot run inside a customer network. For regulated or cost-sensitive deployments that is a hard blocker, not a preference.',
      idea: "Qwen 3.8 is Alibaba's newest open-weight flagship, which turns the capability question into a hosting question.",
      how: 'Read the release for the parameter sizes and variants published, the licence terms, the context window, and which quantised checkpoints are available. Then estimate the real cost: GPU memory at your chosen quantisation, tokens per second at your batch size, and the engineering cost of running an inference server against simply paying per token.',
      result:
        'Open-weight flagships have been steadily closing the gap on closed frontier models across published benchmarks; whether that holds on your workload, at the quantisation you can afford, is the only measurement that actually counts.',
      soWhat:
        'You close month 2 this week, and why you chose a hosted API over open weights is a defense question in your write-up. Having priced the alternative is what makes the answer credible rather than a shrug. It also sets up month 5, where you serve your own model and meet these costs directly.',
      limits:
        'Open weights move the cost, they do not remove it: you inherit GPU capacity planning, batching, KV-cache memory, and uptime. Benchmark scores are reported on the full-precision model, and the quantised checkpoint you can actually afford scores lower. And licences on open-weight releases carry usage restrictions that matter commercially, so read them rather than assuming they are MIT.',
    },
  },

  // Week 9 (month 3 opens, proj-graph-rag)
  {
    id: 'read-graphrag',
    weekId: 'week-09',
    kind: 'paper',
    title: 'From Local to Global: A Graph RAG Approach to Query-Focused Summarization',
    source: 'Edge et al., Microsoft',
    year: 2024,
    url: 'https://arxiv.org/abs/2404.16130',
    why: 'The design this month\'s ms-graph-rag-1 entity-and-relation extraction pipeline builds toward, so read it now before you start extraction.',
    minutes: 35,
    summary: {
      problem:
        'Vector RAG retrieves the chunks most similar to the query, which works when the answer sits in a few passages. It cannot answer a question about the corpus as a whole, because no single chunk contains the answer and no top-k selection can assemble one.',
      idea: 'Build a knowledge graph from the corpus in advance, cluster it into a hierarchy of communities, pre-summarise every community, and answer global questions by map-reducing over those summaries instead of over chunks.',
      how: 'At index time an LLM extracts entities, relationships and claims from each text unit into a graph; the Leiden algorithm partitions that graph into a hierarchy of communities; and an LLM writes a report summarising each community, bottom up. At query time, global search sends every community summary at a chosen level through the model in parallel to produce a partial answer with a helpfulness score (map), then combines the highest-scoring partials into a final response (reduce). Local search instead matches query entities to graph nodes and walks their neighbourhood.',
      result:
        'On two corpora of roughly one million tokens each, GraphRAG global answers were preferred by an LLM judge over a naive vector-RAG baseline on comprehensiveness and diversity by a wide margin, and using higher-level community summaries needed on the order of ten times fewer query-time tokens than map-reducing over the source texts directly.',
      soWhat:
        'This is the blueprint for the whole of month 3: ms-graph-rag-1 is its extraction step, ms-graph-rag-2 is the community detection and summarisation, ms-graph-rag-3 is the retrieval, and ms-graph-rag-4 is the comparison against your month 2 vector system.',
      limits:
        'Indexing cost is the headline problem - an LLM pass over every text unit to build the graph, plus a summary per community, which for a large corpus is expensive and must be partly redone when documents change. Extraction quality caps everything downstream, since bad entity resolution produces a graph that confidently connects the wrong things. And it targets global sensemaking: on ordinary fact lookup a plain vector retriever is cheaper and at least as good, which is why the honest production architecture runs both.',
    },
    diagram: `flowchart TD
  D["Documents"] --> TU["Text units"]
  TU -->|"LLM extracts entities and relations"| G["Knowledge graph"]
  G -->|"Leiden clustering"| C["Community hierarchy"]
  C -->|"LLM summarises each community"| CS["Community reports"]
  Q["Global query"] --> M["Map over community reports"]
  CS --> M
  M -->|"partial answers with helpfulness scores"| RD["Reduce"]
  RD --> A["Answer"]`,
  },

  // Week 10 (month 3, ms-graph-rag-1: entity/relation extraction pipeline)
  {
    id: 'read-kg-construction-survey',
    weekId: 'week-10',
    kind: 'paper',
    title: 'A Comprehensive Survey on Automatic Knowledge Graph Construction',
    source: 'Zhong et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2302.05019',
    why: 'Maps the acquisition, refinement, and evolution steps of building a knowledge graph from text, the exact pipeline ms-graph-rag-1 asks you to build this week.',
    minutes: 35,
    summary: {
      problem:
        'Building a knowledge graph from text is not one task but a chain of them - extraction, entity resolution, typing, completion, maintenance - and the literature is split across research communities that use different names for the same step.',
      idea: 'Organise automatic knowledge graph construction into three stages, acquisition, refinement and evolution, so every component of a pipeline has a defined job and a defined evaluation.',
      how: 'Knowledge acquisition covers named entity recognition, relation extraction and attribute extraction from text, including the shift from pipeline models to joint and generative extraction. Refinement covers entity linking and alignment, type inference, and knowledge graph completion, which infers edges that were never stated. Evolution covers keeping the graph current as new documents arrive. The survey maps method families, standard datasets and metrics onto each stage.',
      result:
        'Its contribution is coverage and structure rather than a score: it gives you the method families and benchmark datasets for each stage, and makes clear that entity resolution - deciding that two mentions refer to the same thing - is the step where most real pipelines actually lose accuracy.',
      soWhat:
        'ms-graph-rag-1 this week is exactly the acquisition stage, and the survey tells you what you are choosing to skip. Knowing the refinement stage exists is what lets you explain, in the month 3 write-up, why your graph has duplicate entities and what you would do about it with more time.',
      limits:
        'It surveys the pre-LLM and early-LLM literature, so many of the supervised methods it catalogues need labelled data you do not have and are no longer the practical choice against a prompted extraction model. It also evaluates components in isolation on academic benchmarks: nothing here tells you what extraction F1 you actually need for downstream RAG quality, which is the only number that matters for your build.',
    },
  },
  {
    id: 'read-rebel-relation-extraction',
    weekId: 'week-10',
    kind: 'paper',
    title: 'REBEL: Relation Extraction By End-to-end Language Generation',
    source: 'Huguet Cabot and Navigli',
    year: 2021,
    url: 'https://aclanthology.org/2021.findings-emnlp.204/',
    why: 'A concrete seq2seq recipe for joint entity and relation extraction over 200+ relation types, directly usable for the extraction pipeline in ms-graph-rag-1 this week.',
    minutes: 35,
    summary: {
      problem:
        'Classical relation extraction is a pipeline: find the entities, then classify the relation between each pair. Errors compound across the stages, the relation set is fixed by the classifier, and every new relation type means retraining.',
      idea: 'Treat relation extraction as sequence-to-sequence translation, reading raw text and emitting a linearised string of triplets, so entities and relations are produced jointly by one autoregressive model.',
      how: 'Triplets are linearised into a token sequence with special markers separating subject, relation and object, so a standard seq2seq model (BART) can simply generate them. The authors build the training set automatically by aligning Wikipedia abstracts with Wikidata and filtering with a natural-language-inference model to drop unsupported triplets, producing a large silver corpus covering more than 200 relation types. The model is pretrained on that corpus and then fine-tuned per benchmark.',
      result:
        'Fine-tuned REBEL matched or beat prior state of the art across several relation extraction and relation classification benchmarks, and the released pretrained checkpoint transfers to new domains with very little data, which is its main practical claim.',
      soWhat:
        'It is a concrete, runnable alternative to prompting an LLM for every chunk in ms-graph-rag-1 this week. Benchmark it against your prompted extractor: for a large corpus, a small local seq2seq model at a fraction of the cost per chunk may be what makes month 3 affordable at all.',
      limits:
        'It is bounded by the relation schema it was trained on, so anything outside Wikidata\'s roughly 200 relations needs fine-tuning data you have to build yourself. The silver training set inherits Wikipedia and Wikidata biases, and the automatic alignment leaves noise the NLI filter does not catch. It also extracts sentence- or abstract-level triplets: it does not resolve coreference across a document or decide that two extracted entities are the same node, which is the work that actually turns triplets into a graph.',
    },
  },

  // Week 11 (month 3, ms-graph-rag-2: graph construction and community detection)
  {
    id: 'read-leiden-community-detection',
    weekId: 'week-11',
    kind: 'paper',
    title: 'From Louvain to Leiden: Guaranteeing Well-Connected Communities',
    source: 'Traag, Waltman, and van Eck',
    year: 2019,
    url: 'https://arxiv.org/abs/1810.08473',
    why: 'The community detection algorithm ms-graph-rag-2 needs this week; Louvain can leave communities disconnected, and this is the fix you should use instead.',
    minutes: 35,
    summary: {
      problem:
        'Louvain is the default community detection algorithm on large graphs, and it has a defect nobody notices until it matters: it can return communities that are internally disconnected, grouping nodes with no path between them inside the group.',
      idea: 'Add a refinement phase that only ever merges nodes into well-connected subcommunities, which guarantees connectivity and, iterated, drives the partition toward a locally optimal one.',
      how: 'Leiden runs three phases per level where Louvain runs two: local moving of individual nodes, then a refinement phase that splits each community into well-connected subcommunities before aggregation, then aggregation based on the refined partition. Because refinement can split a community, disconnected groups cannot survive to the next level. The local moving phase also visits only nodes whose neighbourhood changed, which makes Leiden faster than Louvain despite doing more work per level.',
      result:
        'The authors show empirically that Louvain produces badly connected and even disconnected communities at a non-trivial rate on real networks, that Leiden eliminates them by construction, and that Leiden is nonetheless faster than Louvain on large graphs while yielding higher-quality partitions.',
      soWhat:
        'ms-graph-rag-2 asks for community summaries this week, and a disconnected community produces a summary about two unrelated things, which then poisons every global query that touches it. This is exactly why GraphRAG specifies Leiden rather than Louvain, and it is a good concrete detail for the month 3 write-up.',
      limits:
        'It fixes connectivity, not the deeper problems of modularity-based clustering. The resolution limit still hides small communities inside large ones, so you have to sweep the resolution parameter rather than trust a single run. Results are stochastic, so different random seeds give different partitions and your community summaries are not reproducible unless you fix the seed. And it produces a partition, meaning each node belongs to exactly one community, which is simply wrong for entities that genuinely sit in several topics.',
    },
  },
  {
    id: 'read-raptor',
    weekId: 'week-11',
    kind: 'paper',
    title: 'RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval',
    source: 'Sarthi et al.',
    year: 2024,
    url: 'https://arxiv.org/abs/2401.18059',
    why: 'Shows how to recursively cluster and summarize chunks into a tree, the pattern to follow for the community summaries ms-graph-rag-2 asks for this week.',
    minutes: 35,
    summary: {
      problem:
        'Retrieval over flat chunks returns short contiguous fragments. That works when the answer is a fact in one paragraph and fails when the question needs the gist of a long section or a whole document, because no chunk holds it and the reader has to reassemble meaning from pieces.',
      idea: 'Build a tree of increasingly abstract summaries over the chunks at index time, so retrieval can return whichever level of abstraction the question needs.',
      how: 'Embed the leaf chunks, then recursively: cluster the embeddings with a soft method (a Gaussian mixture over UMAP-reduced vectors, so a chunk can belong to more than one cluster), summarise each cluster with an LLM, embed the summaries, and repeat until a single node remains. At query time either collapse the whole tree into one pool and retrieve the top-k across all levels, or traverse the tree top down. The collapsed variant works better in their experiments.',
      result:
        'Retrieving over the tree improved results on question-answering tasks that need integrating information across a long text, and paired with GPT-4 it set a new state of the art on the QuALITY benchmark at the time, with a reported gain of roughly 20 percentage points of absolute accuracy over the previous best.',
      soWhat:
        'It is the pattern for the community summaries ms-graph-rag-2 asks for this week, and the cheaper alternative if the month 3 extraction step turns out to be unaffordable. Being able to contrast RAPTOR\'s clustering tree with GraphRAG\'s entity graph is a strong month 3 defense answer.',
      limits:
        'Index-time cost scales with the number of summaries, and the whole tree must be rebuilt when the corpus changes - incremental update is not part of the design. Summaries are lossy by definition, so retrieving a high-level node can lose the specific number or name the user asked for, and an error in a low-level summary propagates silently upward through every ancestor. Clustering quality also depends on the embedding model and on UMAP parameters, which is a real tuning surface with no obvious objective.',
    },
    diagram: `flowchart TD
  C["Leaf chunks"] --> E["Embed"]
  E --> CL["Soft cluster with Gaussian mixture"]
  CL --> S["LLM summary per cluster"]
  S --> E2["Embed summaries"]
  E2 -->|"repeat until one node remains"| CL
  C --> P["Collapsed pool of all nodes"]
  S --> P
  Q["Query"] --> P
  P -->|"top-k across all levels"| A["Context to generator"]`,
  },

  // Week 12 (month 3, ms-graph-rag-3: graph plus vector hybrid retrieval)
  {
    id: 'read-hipporag',
    weekId: 'week-12',
    kind: 'paper',
    title: 'HippoRAG: Neurobiologically Inspired Long-Term Memory for Large Language Models',
    source: 'Gutiérrez et al.',
    year: 2024,
    url: 'https://arxiv.org/abs/2405.14831',
    why: 'Combines a knowledge graph with personalized PageRank over embeddings, a concrete design for the graph-plus-vector hybrid retriever ms-graph-rag-3 asks you to build this week.',
    minutes: 35,
    summary: {
      problem:
        'RAG systems have no mechanism for integrating knowledge across documents at retrieval time. A question whose answer requires connecting a fact in document A to a fact in document C through B forces either many sequential LLM-driven retrieval rounds or outright failure.',
      idea: 'Model long-term memory the way hippocampal indexing theory describes it: keep a schema-less graph of concepts as the index and retrieve by spreading activation from the query concepts across it in a single pass.',
      how: 'Offline, an LLM does open information extraction over the corpus to build a knowledge graph of entities and relations - the artificial hippocampal index - while an embedding model links synonymous nodes so surface variants collapse. At query time an LLM extracts the named entities from the question, those entities are matched to graph nodes, and Personalized PageRank is run from them; the resulting node probabilities are aggregated back onto passages, which are ranked and returned. One graph traversal replaces an iterative retrieve-and-read loop.',
      result:
        'The authors report large gains over strong RAG baselines on multi-hop question answering (MuSiQue and 2WikiMultiHopQA) while being substantially cheaper and faster at query time than iterative retrieval methods such as IRCoT, and combining HippoRAG with iterative retrieval improved results further still.',
      soWhat:
        'ms-graph-rag-3 this week asks for a graph-plus-vector hybrid retriever, and this is the cleanest published design for one: the graph supplies multi-hop connectivity, embeddings supply synonym tolerance, and PageRank is the fusion mechanism. It is also the reason your month 3 comparison must include multi-hop questions, where your month 2 vector system will lose badly.',
      limits:
        'Everything rests on the offline extraction pass - an LLM call per passage plus a rebuild when documents change - and on entity resolution, since a graph that fails to merge two names for the same thing cannot hop between them. Single-pass PageRank also assumes the question names the entities you need up front, so questions that only reveal what to look for after a first retrieval still need iteration. And on simple single-hop lookups the graph machinery buys nothing a vector store did not already give you.',
    },
    diagram: `flowchart LR
  D["Corpus"] -->|"open information extraction"| KG["Concept graph"]
  KG -->|"embeddings link synonyms"| SYN["Merged nodes"]
  Q["Question"] -->|"named entity recognition"| QN["Query entities"]
  QN --> SEED["Seed nodes"]
  SYN --> SEED
  SEED -->|"Personalized PageRank"| SCORE["Node scores"]
  SCORE -->|"aggregate onto passages"| R["Ranked passages"]`,
  },
  {
    id: 'read-lightrag',
    weekId: 'week-12',
    kind: 'paper',
    title: 'LightRAG: Simple and Fast Retrieval-Augmented Generation',
    source: 'Guo et al.',
    year: 2024,
    url: 'https://arxiv.org/abs/2410.05779',
    why: 'A dual-level (graph plus vector) retrieval design lighter than full GraphRAG, worth comparing against your own ms-graph-rag-3 hybrid retriever this week.',
    minutes: 35,
    summary: {
      problem:
        'GraphRAG answers global questions well but pays for it with a heavy index: community detection plus an LLM-written report for every community, much of which has to be rebuilt whenever the corpus changes. That cost is out of proportion for most systems.',
      idea: 'Keep the graph but drop the community hierarchy, indexing entities and relations directly in a vector store and answering with a dual-level retrieval that combines specific entities and abstract themes.',
      how: 'At index time an LLM extracts entities and relations from chunks, deduplicates them, and stores a textual key for each node and edge in a vector index. At query time the question is expanded into low-level keywords (specific entities) and high-level keywords (themes); low-level keys retrieve entities, high-level keys retrieve relations, each match pulls in its local graph neighbourhood, and the union goes to the generator. Because entities and relations are stored independently, new documents merge in incrementally instead of forcing a rebuild.',
      result:
        'The authors report better answers than GraphRAG and vector-RAG baselines on comprehensiveness and diversity in LLM-judged comparisons, at markedly lower retrieval cost - on the order of a few hundred tokens and a single retrieval round per query, against GraphRAG map-reducing over many community reports - and with incremental updates rather than reindexing.',
      soWhat:
        'Run it as the control against your own ms-graph-rag-3 hybrid retriever this week. The honest month 3 conclusion is usually that the graph helped but not at GraphRAG index cost, and LightRAG is the design that lets you say concretely what the cheaper point on that curve looks like.',
      limits:
        'Dropping the community hierarchy is a real trade: corpus-wide sensemaking questions, the ones GraphRAG was built for, are exactly where a neighbourhood-expansion retriever has least to offer. Quality still rests entirely on LLM extraction and deduplication quality. And the evaluation is LLM-judged win rates over a small number of corpora rather than exact-match accuracy on a standard benchmark, so treat the margins as directional rather than precise.',
    },
    diagram: `flowchart LR
  D["Chunks"] -->|"LLM extracts entities and relations"| ER["Entities and relations"]
  ER --> DE["Deduplicate and merge"]
  DE --> VI["Vector index of node and edge keys"]
  Q["Query"] --> KW["Split into keywords"]
  KW -->|"low level: specific entities"| VI
  KW -->|"high level: themes"| VI
  VI --> NB["Expand graph neighbourhood"]
  NB --> G["Generator"]`,
  },

  // Week 13 (month 3 close, ms-graph-rag-4: comparative eval against month 2)
  {
    id: 'read-rag-vs-graphrag-eval',
    weekId: 'week-13',
    kind: 'paper',
    title: 'RAG vs. GraphRAG: A Systematic Evaluation and Key Insights',
    source: 'Han et al.',
    year: 2025,
    url: 'https://arxiv.org/abs/2502.11371',
    why: 'A published protocol for comparing vector RAG against graph RAG on global and local questions, the exact comparison ms-graph-rag-4 asks you to write up this week.',
    minutes: 35,
    summary: {
      problem:
        'GraphRAG papers and vector-RAG papers each report wins on their own corpora and their own question mix, so there was no like-for-like answer to the practitioner question: for my corpus and my queries, which one should I build?',
      idea: 'Compare the two families under one controlled protocol and the answer stops being that graph is better and becomes that it depends on question type, with the two families largely complementary.',
      how: 'The authors evaluate vector RAG against graph-based RAG variants over the same corpora with the same generator, splitting questions into local or specific-fact queries and global or corpus-level queries and holding the retrieval budget comparable. They then analyse where each family\'s errors come from, and test whether combining the two does better than either alone.',
      result:
        'The reported pattern is the one practitioners should expect: vector RAG stays strong and cheap on specific-fact questions, graph-based methods help most on global and multi-hop questions, and hybrid or combined approaches generally beat either alone - with the caveat that graph methods carry a much larger indexing cost for that gain.',
      soWhat:
        'ms-graph-rag-4 this week is exactly this comparison against your month 2 system. Borrow the protocol: split your eval set by question type before you report anything, or you will average a real win into a wash and reach the wrong architectural conclusion.',
      limits:
        'Any cross-family comparison is highly sensitive to implementation and prompt choices, so treat the direction of the finding as far more reliable than its margins. Cost accounting also tends to be reported per query, which flatters graph methods by leaving the indexing pass out of the headline number. And the local-versus-global taxonomy is a simplification: real query logs are a long tail with a great deal in between.',
    },
  },

  // Week 14 (month 4 opens, proj-agents: tool layer, planner/workers, memory)
  {
    id: 'read-react',
    weekId: 'week-14',
    kind: 'paper',
    title: 'ReAct: Synergizing Reasoning and Acting in Language Models',
    source: 'Yao et al.',
    year: 2022,
    url: 'https://arxiv.org/abs/2210.03629',
    why: 'The reason-then-act loop underlies the planner-plus-workers design ms-agents-2 asks you to build this week.',
    minutes: 35,
    summary: {
      problem:
        'Chain-of-thought reasons in a closed loop with no access to the world, so it hallucinates facts and propagates errors it has no way to check. Action-only agents act without reasoning about why, so they cannot plan, adapt, or recover from a surprise.',
      idea: 'Interleave the two: let the model alternate free-form reasoning traces with tool actions, so reasoning chooses the next action and observations correct the reasoning.',
      how: 'The prompt carries few-shot examples in a Thought, Action, Observation cycle. The model writes a thought, emits an action in a small action space (for the QA tasks: search, lookup, finish), the environment returns an observation, and the loop repeats until the model finishes. Nothing is trained - the whole method is a prompt format plus an action space plus an execution loop you write.',
      result:
        'On HotpotQA and FEVER, ReAct beat action-only baselines and reduced the hallucination and error propagation that pure chain-of-thought suffers, with ReAct combined with self-consistent chain-of-thought the strongest configuration. On the interactive benchmarks ALFWorld and WebShop it improved absolute success rates over imitation and reinforcement learning baselines by a wide margin using only one or two in-context examples.',
      soWhat:
        'The Thought/Action/Observation loop is literally the control flow of the planner-plus-workers agent in ms-agents-2 this week, and the argument that reasoning traces make an agent debuggable is the design case for the audit log you build in ms-agents-3.',
      limits:
        'It has no memory beyond a growing transcript, so long tasks fill the context window and the loop degrades. It can repeat a failing action indefinitely without a step budget or an external stopping rule. And it is only as good as its observations: a bad search tool produces a confidently wrong trace. The reasoning trace also reads like an explanation while being a generation, so treat it as a log of what the model produced, not as evidence of why it acted.',
    },
    diagram: `flowchart LR
  T["Thought"] --> A["Action"]
  A --> E["Environment or tool"]
  E --> O["Observation"]
  O --> T
  T -->|"finish action"| ANS["Answer"]`,
  },
  {
    id: 'read-memgpt',
    weekId: 'week-14',
    kind: 'paper',
    title: 'MemGPT: Towards LLMs as Operating Systems',
    source: 'Packer et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2310.08560',
    why: 'Introduces the tiered short-term/long-term memory design you need this week to give your worker agents memory in ms-agents-2.',
    minutes: 35,
    summary: {
      problem:
        'The context window is a hard wall. Long conversations and large documents overflow it, and the usual fix - truncate or summarise the oldest turns - silently destroys information the agent will need later, with no signal that it happened.',
      idea: 'Treat the context window as physical memory and everything else as disk, and let the model itself page data between them with function calls, the way an operating system manages virtual memory.',
      how: 'Memory splits into main context (the prompt: system instructions, a small editable working-memory block, and recent messages) and external context (recall storage holding the full conversation history, plus archival storage). The model gets functions to search external storage, write to it, and edit its own working-memory block. When main context approaches its limit the system issues a warning as a system message and the model evicts and summarises on its own initiative. Control flow is event-driven - user messages, timers, function returns - with the model deciding whether to yield or continue.',
      result:
        'On a deep-memory conversational task the agent answered questions about facts from far earlier sessions that a fixed-context baseline had already discarded, and on document QA over corpora larger than the context window it kept improving as more documents were added, where the fixed-context baseline plateaued.',
      soWhat:
        'This is the memory design for your worker agents in ms-agents-2 this week: a small always-visible state block plus searchable long-term storage, with explicit write points. It is also the clean answer to the interview staple about handling conversations longer than the context window.',
      limits:
        'The model manages its own memory, so it decides what is worth keeping and it gets that wrong - important details get summarised away with no way to notice until an answer is missing them. Every paging operation is an extra LLM call, adding latency and cost to turns that would otherwise be single-shot. Retrieval from archival storage is still retrieval, so if the search misses, the memory might as well not exist. And long-context models have absorbed part of the motivation, though not the persistence across sessions.',
    },
    diagram: `flowchart LR
  Q["Event or user message"] --> MC["Main context in prompt"]
  MC --> LLM["Model"]
  LLM -->|"memory function calls"| EXT["Recall and archival storage"]
  EXT -->|"search results paged in"| MC
  MC -->|"nearing token limit"| EVICT["Evict and summarise"]
  EVICT --> EXT
  LLM --> OUT["Reply or next step"]`,
  },

  // Week 15 (month 4: agent workflow patterns and human approval)
  {
    id: 'read-building-effective-agents',
    weekId: 'week-15',
    kind: 'post',
    title: 'Building Effective Agents',
    source: 'Anthropic',
    year: 2024,
    url: 'https://www.anthropic.com/engineering/building-effective-agents',
    why: 'Lays out the routing and human-in-the-loop patterns you apply directly this week when building the approval flow and audit log in ms-agents-3.',
    minutes: 25,
    summary: {
      problem:
        'Agent frameworks encourage building autonomous loops for problems a fixed sequence of LLM calls would solve more cheaply and far more reliably, and teams have no vocabulary for telling which situation they are actually in.',
      idea: 'Distinguish workflows, where the path through the LLM calls is decided in code, from agents, where the model decides - and use the simplest of the two that works.',
      how: 'The post names five composable workflow patterns - prompt chaining, routing, parallelisation by sectioning or voting, orchestrator-workers, and evaluator-optimiser - then describes the autonomous agent as the case where the model plans in a loop against tool feedback with a stopping condition. Its practical advice: start with a single well-prompted call, add complexity only when measurement demands it, design the tool interface as carefully as you design a prompt, and keep a human in the loop wherever an error is expensive.',
      result:
        'Its central empirical claim is that the most successful production implementations the authors saw used simple composable patterns rather than frameworks or elaborate agent architectures, and that the quality of the tool surface mattered more than the sophistication of the loop around it.',
      soWhat:
        'ms-agents-3 this week is the approval flow and audit log, and the human-in-the-loop and observability advice maps straight onto it. The workflow-versus-agent distinction is also the answer to why you built it this way in your month 4 defense: you should be able to name which steps are code-decided and which are model-decided.',
      limits:
        'It is design guidance without measurements - no benchmarks, no cost or reliability numbers to cite, and no evaluation methodology beyond an instruction to measure. It is deliberately quiet on the hard parts of running agents: multi-agent coordination failures, cost blow-ups from runaway loops, and how you test a non-deterministic system in CI. And it comes from a model vendor, so read the tool-use advice knowing whose API it assumes.',
    },
  },
  {
    id: 'read-lilian-weng-agents',
    weekId: 'week-15',
    kind: 'post',
    title: 'LLM Powered Autonomous Agents',
    source: 'Lilian Weng',
    year: 2023,
    url: 'https://lilianweng.github.io/posts/2023-06-23-agent/',
    why: 'A clear map of planning, memory, and tool-use components, useful this week for reviewing your approval flow and audit log design in ms-agents-3.',
    minutes: 25,
    summary: {
      problem:
        'The phrase LLM agent was being used for a dozen different systems at once, with no shared decomposition of what an agent is actually made of, which made it impossible to compare two designs.',
      idea: 'An LLM agent is an LLM as controller plus three components - planning, memory, and tool use - and nearly every agent paper is a contribution to exactly one of them.',
      how: 'The post walks each component with its literature. Planning covers task decomposition (chain-of-thought, tree of thoughts, LLM+P) and self-reflection (ReAct, Reflexion, Chain of Hindsight). Memory maps short-term memory onto in-context learning and long-term memory onto an external vector store with approximate nearest neighbour search. Tool use covers MRKL, Toolformer, and API-calling agents. It closes with case studies - a generative-agent simulation, AutoGPT-style autonomous agents, a scientific-discovery agent - and a candid list of what breaks.',
      result:
        'Its most useful section is the limitations: finite context restricting what an agent can hold, long-horizon planning and error recovery being genuinely unsolved, and natural language being an unreliable interface between the model and its tools. That list has aged remarkably well.',
      soWhat:
        'Read it this week as the map against which to review your own ms-agents-3 design: name which component each part of your system implements and you will find the gap. It is also the fastest way to acquire the vocabulary an agents-focused interview expects you to have.',
      limits:
        'It is a 2023 survey, so it predates native tool-calling APIs, structured outputs, long-context models, and the reasoning models that changed how much planning belongs in a prompt at all. Several techniques it presents as promising - elaborate self-reflection loops in particular - turned out to be fragile and expensive in practice. Use it for the decomposition, not for the recommendations.',
    },
  },

  // Week 16 (month 4: agent reasoning and eval suite)
  {
    id: 'read-chain-of-thought',
    weekId: 'week-16',
    kind: 'paper',
    title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
    source: 'Wei et al.',
    year: 2022,
    url: 'https://arxiv.org/abs/2201.11903',
    why: 'The reasoning technique your planner can use to explain a plan before acting, useful this week while you build the task-success eval suite in ms-agents-4.',
    minutes: 35,
    summary: {
      problem:
        'On multi-step arithmetic, commonsense and symbolic problems, scaling models up barely helped. They produced an answer directly, so one wrong intermediate step meant a wrong answer and there was nowhere for the computation to happen.',
      idea: 'Put worked reasoning into the few-shot examples and the model will generate its own intermediate steps before answering, with no fine-tuning and no change to the model.',
      how: 'Replace each input-output exemplar in the prompt with input, chain of thought, output, where the chain of thought is a few sentences of natural-language reasoning leading to the answer. Everything else - the model, the decoding, the number of exemplars - stays the same. The paper measures this across three model families at several sizes to isolate the effect of scale.',
      result:
        'Gains are an emergent property of scale: negligible or negative on small models and large on models around 100B parameters. With eight exemplars, PaLM 540B with chain-of-thought reached about 57% on GSM8K, far above standard prompting and above a fine-tuned GPT-3 with a verifier, which was the state of the art at the time.',
      soWhat:
        'Your planner in ms-agents-2 emits a plan before acting, and this is the paper that shows why writing the reasoning down changes the answer rather than merely narrating it - which is also why the trace is worth logging in this week\'s ms-agents-4 eval suite.',
      limits:
        'The reasoning trace is a generation, not an explanation: models reach right answers via wrong chains and wrong answers via plausible ones, so a chain of thought is not evidence and must never be shown to a user as justification. The technique is also largely obsolete on current reasoning models, which do this internally and can be made worse by being told to think step by step. And the benefit was measured on models of a specific size and era, so do not assume the effect transfers to whatever you are using.',
    },
  },
  {
    id: 'read-swe-bench',
    weekId: 'week-16',
    kind: 'paper',
    title: 'SWE-bench: Can Language Models Resolve Real-World GitHub Issues?',
    source: 'Jimenez et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2310.06770',
    why: 'A benchmark design worth studying for how it grades task success on real, messy work, a pattern to borrow for the eval suite in ms-agents-4 this week.',
    minutes: 35,
    summary: {
      problem:
        'Coding benchmarks were self-contained function-writing puzzles graded by a handful of unit tests. Nothing measured what a software engineer actually does: change a real codebase so a real issue is fixed and nothing else breaks.',
      idea: 'Harvest the benchmark from history - take merged pull requests that closed issues in real repositories, hide the diff, and grade a model patch by running the repository\'s own tests.',
      how: 'From twelve popular Python repositories the authors collect issue and pull-request pairs where the merge added or changed tests. Each task hands the model the issue text and the repository at the parent commit, and the model must produce a patch. Grading applies that patch and runs FAIL_TO_PASS tests, which the real fix made pass, and PASS_TO_PASS tests, which must not regress. There is no partial credit: the patch either resolves the issue or it does not.',
      result:
        'The benchmark contains 2,294 task instances, and at publication the best systems evaluated resolved only a few percent of them - a striking gap against the same models nearly saturating HumanEval, which is precisely the point the paper was making about task realism.',
      soWhat:
        'ms-agents-4 this week is your task-success eval suite, and this is the design to copy: define success as a check that runs, not a similarity score, and separate did the thing I asked for start working from did anything else break. The regression half is the one people forget to build.',
      limits:
        'Binary pass/fail hides how close a wrong patch came and rewards test-gaming, since a patch that special-cases the test still passes. The task set is Python-only and drawn from twelve libraries, so it does not represent application code, other languages, or work on codebases without tests. Contamination is a live problem: the issues and their real fixes are public and in training data. And reported numbers vary enormously with the agent scaffold wrapped around the model, so scores across systems are frequently not comparable at all.',
    },
  },

  // Week 17 (month 4 close: eval suite, cost controls, model routing)
  {
    id: 'read-ifeval',
    weekId: 'week-17',
    kind: 'paper',
    title: 'Instruction-Following Evaluation for Large Language Models (IFEval)',
    source: 'Zhou et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2311.07911',
    why: 'Gives you verifiable, rule-based instruction-following checks to add alongside task-success scoring in this week\'s ms-agents-4 eval suite.',
    minutes: 35,
    summary: {
      problem:
        'Judging whether a model followed an instruction meant either paying human annotators, which is slow and expensive, or asking another LLM, which is biased and not reproducible. Neither gives you a number you can put in CI.',
      idea: 'Restrict evaluation to instructions whose satisfaction a short program can check, and instruction-following becomes objectively and cheaply measurable.',
      how: 'The authors define a set of verifiable instructions - constraints such as write exactly three paragraphs, respond entirely in JSON, never use the word X, end with this exact phrase, answer in lowercase. Around 25 instruction types spread across roughly 500 prompts, each combining one or more constraints. Grading runs deterministic Python checks and reports strict and loose accuracy, where loose tolerates common formatting wrappers, at both the prompt level and the individual-instruction level.',
      result:
        'It exposed that models strong on general benchmarks still fail a substantial share of trivially checkable constraints, with counting, exact formatting and negative constraints the persistent weak spots - and the whole evaluation runs in seconds with no judge model and no human in the loop.',
      soWhat:
        'Add these checks alongside task success in this week\'s ms-agents-4 suite. Your agent emits structured tool calls and structured reports, and a deterministic format check is free, instant, and catches regressions that a task-success average quietly absorbs. It is also your answer to how you evaluate without an LLM judge.',
      limits:
        'Verifiability is bought by narrowing scope: it measures compliance with surface constraints and says nothing about whether the content is correct, useful or well-reasoned, so a model can score perfectly while answering the wrong question. The instruction set is finite and public, so it can be trained against. And strict and loose accuracy differ enough that quoting one without the other is misleading.',
    },
  },

  // Week 18 (month 5 opens, proj-gpt-from-scratch: tokenizer through training loop)
  {
    id: 'read-attention-is-all-you-need',
    weekId: 'week-18',
    kind: 'paper',
    title: 'Attention Is All You Need',
    source: 'Vaswani et al.',
    year: 2017,
    url: 'https://arxiv.org/abs/1706.03762',
    why: 'The transformer architecture you are implementing block by block this week in ms-gpt-from-scratch-1; re-read it as the blueprint for your build.',
    minutes: 35,
    summary: {
      problem:
        'Sequence transduction was owned by recurrent networks, which compute position t only after position t-1. That serial dependency blocks parallelism within a sequence, caps trainable sequence length, and makes the path between two distant tokens as long as the distance between them.',
      idea: 'Drop recurrence and convolution entirely and build the whole model out of attention, so any two positions interact in a single step and the entire sequence is computed in parallel.',
      how: 'Encoder and decoder are stacks of identical layers. Each layer is multi-head scaled dot-product attention - softmax of QK transpose divided by the square root of the key dimension, applied to V, run in several parallel heads on projected subspaces and concatenated - followed by a position-wise feed-forward network, each wrapped in a residual connection and layer normalisation. The decoder masks future positions and adds cross-attention over the encoder output. Order is injected by sinusoidal positional encodings, because attention itself is permutation-invariant.',
      result:
        'The big model reached 28.4 BLEU on WMT 2014 English-to-German and 41.8 on English-to-French, new state of the art on both, trained in 3.5 days on eight GPUs - a small fraction of the training cost of the best models it displaced.',
      soWhat:
        'This is the blueprint for ms-gpt-from-scratch-1 this week: you are implementing exactly these blocks. Read it for the shapes and the scaling factor, and note deliberately what your GPT does differently - decoder-only, pre-norm, and learned or rotary positions rather than sinusoidal.',
      limits:
        'Attention is quadratic in sequence length in both time and memory, which is the constraint every other paper you read this month attacks: FlashAttention on the memory traffic, GQA on the KV cache, PagedAttention on serving. The original recipe is also dated in its details - post-norm training needs learning-rate warmup to stay stable, sinusoidal encodings extrapolate badly beyond training length, and modern stacks use pre-norm, RMSNorm, SwiGLU and RoPE instead. And it is an encoder-decoder translation model; the decoder-only architecture everything now uses came later.',
    },
    diagram: `flowchart LR
  X["Token embeddings"] --> PE["Add positional encoding"]
  PE --> QKV["Project to Q, K, V per head"]
  QKV -->|"Q times K transpose over sqrt of dk"| SC["Scores"]
  SC -->|"softmax, masked in decoder"| W["Attention weights"]
  W -->|"weighted sum of V"| H["Head outputs"]
  H -->|"concat and project"| R1["Residual and layer norm"]
  R1 --> FF["Position-wise feed-forward"]
  FF --> R2["Residual and layer norm"]
  R2 --> NX["Next layer"]`,
  },
  {
    id: 'read-chinchilla',
    weekId: 'week-18',
    kind: 'paper',
    title: 'Training Compute-Optimal Large Language Models',
    source: 'Hoffmann et al.',
    year: 2022,
    url: 'https://arxiv.org/abs/2203.15556',
    why: 'The compute-optimal scaling law that should inform how you size your model and data for the training run in ms-gpt-from-scratch-1 this week.',
    minutes: 35,
    summary: {
      problem:
        'Following the earlier Kaplan scaling laws, labs spent most of a fixed compute budget on parameters and kept training data roughly constant, producing enormous models trained on far too few tokens.',
      idea: 'For a fixed compute budget, model size and training tokens should scale in roughly equal proportion, so the compute-optimal model is much smaller and trained on far more data than the field was building.',
      how: 'The authors train over 400 language models from 70M to 16B parameters on 5B to 400B tokens and fit the compute-optimal frontier three independent ways: fixing model size and varying tokens, fixing compute in IsoFLOP profiles and varying the split, and fitting a parametric loss surface in parameters and data. All three agree that the two should scale about equally with compute. They then test the prediction by training Chinchilla - 70B parameters on 1.4T tokens - at the same compute as Gopher\'s 280B on 300B tokens.',
      result:
        'Chinchilla, four times smaller than Gopher and trained on more than four times the data at equal compute, outperformed Gopher, GPT-3, Jurassic-1 and Megatron-Turing NLG across a wide range of tasks, reaching 67.5% average accuracy on MMLU, more than seven points above Gopher, while being far cheaper to run at inference because it is smaller.',
      soWhat:
        'It is the number that sizes your training run in ms-gpt-from-scratch-1 this week: given the compute you actually have, the rule of thumb of roughly 20 tokens per parameter says build a smaller model and feed it more data than instinct suggests. Sizing a model for a given budget is also a standard ML-systems interview question, and this is the answer.',
      limits:
        'It optimises training compute only. If a model will serve many requests, inference cost dominates and the right move is to train a smaller model far past the compute-optimal point, which is what every deployed open-weight model now does - making Chinchilla-optimal the wrong target in production. The law was fitted on one data distribution and on dense decoder models under 16B, so it says nothing about data quality, repeated epochs, mixture-of-experts, or the post-training stages that dominate modern pipelines. And the constants have been contested: later reanalyses of the paper\'s own fit produced somewhat different coefficients.',
    },
  },

  // Week 19 (month 5: pretraining scale and RoPE swap-in)
  {
    id: 'read-scaling-laws',
    weekId: 'week-19',
    kind: 'paper',
    title: 'Scaling Laws for Neural Language Models',
    source: 'Kaplan et al.',
    year: 2020,
    url: 'https://arxiv.org/abs/2001.08361',
    why: 'The original scaling-law paper, useful alongside Chinchilla for judging whether your loss curves this week look healthy before you swap in RoPE.',
    minutes: 35,
    summary: {
      problem:
        'Deciding how big a model to build, how much data to use, and how long to train was a matter of taste and precedent. There was no way to predict what a training run would achieve before spending the compute on it.',
      idea: 'Language model loss falls as a smooth power law in model size, dataset size and compute over many orders of magnitude, which makes performance predictable in advance.',
      how: 'Train transformers across a wide range of parameter counts, dataset sizes and compute budgets, and fit test loss as a power law in each factor with the others held non-limiting. The paper also characterises when each factor becomes the bottleneck, finds that architectural details such as depth versus width matter far less than raw scale, and argues that with a fixed compute budget the best result comes from training a very large model and stopping well before convergence.',
      result:
        'Loss follows clean power laws across more than six orders of magnitude of compute with essentially no plateau in the range studied - the empirical result that justified the entire scaling era. Its compute-optimal recommendation, however, weighted parameters far more heavily than data, which Chinchilla later corrected.',
      soWhat:
        'Read it alongside Chinchilla this week for one practical reason: it tells you what a healthy loss curve looks like. If your ms-gpt-from-scratch training run is not tracking a power law in tokens seen, the bug is in your data pipeline or your learning rate, not in your architecture.',
      limits:
        'Its headline allocation advice is superseded - Chinchilla showed the parameter-versus-data split was wrong, largely because of how learning-rate schedules were handled in these experiments. The laws predict cross-entropy loss, which is only loosely coupled to anything you care about downstream, and they cannot predict emergent capabilities or where they will appear. They are also fitted on one architecture family and one data distribution, and say nothing at all about data quality, which is the lever that has mattered most since.',
    },
  },
  {
    id: 'read-rope',
    weekId: 'week-19',
    kind: 'paper',
    title: 'RoFormer: Enhanced Transformer with Rotary Position Embedding',
    source: 'Su et al.',
    year: 2021,
    url: 'https://arxiv.org/abs/2104.09864',
    why: 'RoPE is the first component ms-gpt-from-scratch-2 swaps in this week, so read the derivation before you implement it.',
    minutes: 35,
    summary: {
      problem:
        'Absolute positional encodings are added to the token embedding, so the model has to infer relative distance from two absolute signals and nothing generalises past the longest position seen in training. Existing relative schemes worked but bolted extra terms onto the attention score, which is invasive and incompatible with linear attention.',
      idea: 'Encode position by rotating the query and key vectors by an angle proportional to their absolute position, so their dot product depends only on the difference of positions.',
      how: 'Split each query and key vector into two-dimensional pairs and rotate each pair by the position times a per-pair frequency, geometrically spaced like the sinusoidal schedule. Because rotating the query by m and the key by n leaves an inner product depending only on m minus n, the attention score becomes relative automatically. Nothing is added to the score, no parameters are learned, and the rotation is applied to Q and K only - never to V.',
      result:
        'RoFormer matched or beat the baseline transformer on long-text benchmarks, but the decisive result came from adoption: RoPE is the positional scheme in LLaMA, GPT-NeoX, PaLM, Qwen, Mistral and effectively every current open-weight model, and its frequency base can be rescaled after training to extend context length.',
      soWhat:
        'RoPE is the first component ms-gpt-from-scratch-2 swaps in this week. Implement it from the derivation rather than from a library, because the two places people get it wrong are applying the rotation to V as well as Q and K, and mismatching the pairing convention - interleaved versus split-half - against a pretrained checkpoint.',
      limits:
        'It decays attention with distance by construction, which helps locality but means it does not extrapolate to sequences much longer than training without intervention. The whole family of context-extension tricks - position interpolation, NTK-aware scaling, YaRN - exists to patch exactly that, and each trades away some short-context quality. It also interacts with KV-cache layout and attention kernels, so a naive implementation is slow. And it is a positional scheme, not a long-context solution: attention is still quadratic.',
    },
    diagram: `flowchart LR
  X["Token at position m"] --> QP["Query vector q"]
  Y["Token at position n"] --> KP["Key vector k"]
  QP -->|"rotate pairs by m times theta"| QR["Rotated q"]
  KP -->|"rotate pairs by n times theta"| KR["Rotated k"]
  QR --> DOT["Dot product"]
  KR --> DOT
  DOT -->|"depends only on m minus n"| S["Relative attention score"]
  V["Value vector v"] -->|"never rotated"| OUT["Weighted sum"]
  S --> OUT`,
  },

  // Week 20 (month 5: GQA and FlashAttention, still ms-gpt-from-scratch-2)
  {
    id: 'read-gqa',
    weekId: 'week-20',
    kind: 'paper',
    title: 'GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints',
    source: 'Ainslie et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2305.13245',
    why: 'Explains the KV-cache savings from grouped-query attention, the second component ms-gpt-from-scratch-2 measures this week against your multi-head baseline.',
    minutes: 35,
    summary: {
      problem:
        'At inference the decoder caches a key and a value vector per head per token, and that KV cache is the memory-bandwidth bottleneck of autoregressive decoding. Multi-query attention shrinks it by sharing one key-value head across all query heads, but it costs quality and destabilises training.',
      idea: 'Interpolate between the two: give each group of query heads its own shared key-value head, so one group is multi-query and one group per head is multi-head.',
      how: 'Split the H query heads into G groups, each with a single K and V head, which shrinks the cache by a factor of H over G. Crucially you do not retrain from scratch: uptraining converts an existing multi-head checkpoint by mean-pooling the key and value projection matrices within each group and then continuing pretraining for a small fraction of the original compute.',
      result:
        'Uptrained GQA models reached quality close to the original multi-head model while decoding at speeds close to multi-query, and the conversion cost only around 5% of original pretraining compute - which is why GQA is now standard in LLaMA 2 and 3, Mistral, and most current open-weight models.',
      soWhat:
        'GQA is the second swap in ms-gpt-from-scratch-2 this week, and it is the one whose effect you can actually measure: report KV-cache bytes per token and tokens per second against your multi-head baseline. That measurement is the point of the milestone and it sets up the PagedAttention work in week 21.',
      limits:
        'It shrinks the KV cache only; attention is still quadratic in sequence length during prefill, so it does nothing for long-prompt latency. The number of groups is a quality-versus-memory knob with no principled setting, so you tune it empirically. The quality loss is small but real and shows up most on tasks needing fine-grained retrieval from long contexts. And uptraining assumes you have a multi-head checkpoint and the compute to continue training it, which a from-scratch build does not.',
    },
    diagram: `flowchart LR
  H1["Query head 1"] --> G1["Group 1 shared K and V"]
  H2["Query head 2"] --> G1
  H3["Query head 3"] --> G2["Group 2 shared K and V"]
  H4["Query head 4"] --> G2
  G1 --> KV["KV cache holds G entries per token, not H"]
  G2 --> KV
  MH["Multi-head checkpoint"] -->|"mean-pool K and V projections per group"| G1
  MH -->|"then uptrain for about 5 percent of compute"| G2`,
  },
  {
    id: 'read-flashattention',
    weekId: 'week-20',
    kind: 'paper',
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
    source: 'Dao et al.',
    year: 2022,
    url: 'https://arxiv.org/abs/2205.14135',
    why: 'The IO-aware attention kernel that speeds up the training and measurement pass ms-gpt-from-scratch-2 asks for this week.',
    minutes: 35,
    summary: {
      problem:
        'Standard attention materialises the full N-by-N score matrix in GPU high-bandwidth memory: write it, read it back for softmax, write again, read again for the value multiply. The kernel is memory-bound - almost all the time goes to memory traffic rather than arithmetic - and memory grows quadratically with sequence length.',
      idea: 'Never write the attention matrix to memory at all: tile the computation so each block of scores is produced, softmaxed, and consumed entirely inside on-chip SRAM.',
      how: 'Split Q, K and V into blocks sized to fit in SRAM. For each block of queries, loop over blocks of keys and values, computing partial scores, applying an online softmax that carries a running maximum and sum so the normalisation can be corrected incrementally, and accumulating the output - all in registers and shared memory. For the backward pass the score matrix is recomputed from the stored softmax statistics rather than saved, trading extra arithmetic for far less memory traffic. The result is exact attention, not an approximation.',
      result:
        'It reduced high-bandwidth-memory accesses asymptotically and produced large wall-clock gains: roughly 3x faster GPT-2 training end to end and about 15% faster BERT-large than the MLPerf training record, while cutting attention memory from quadratic to linear in sequence length, which is what made training at 16K-plus context practical.',
      soWhat:
        'It speeds up the training and measurement pass ms-gpt-from-scratch-2 asks for this week, and it is why the claim that attention is quadratic needs qualifying in an interview: the arithmetic is still quadratic but the memory is linear and the wall-clock cost is dominated by IO. Knowing the difference between compute-bound and memory-bound is the actual point.',
      limits:
        'It is an optimisation, not an algorithmic change - the arithmetic is still quadratic in sequence length, so it moves the wall out rather than removing it. The gains are hardware-specific: the tiling is tuned to a particular SRAM size and the original kernel targeted A100-class GPUs, so speedups do not transfer uniformly and FlashAttention-2 and 3 were needed to use newer hardware well. It also only helps the attention kernel, so if your model bottlenecks elsewhere or your sequences are short the end-to-end win is small. And it never materialises the attention matrix, so anything that needs the scores - some interpretability work, some custom masking - has to fall back to the slow path.',
    },
    diagram: `flowchart LR
  Q["Q blocks"] --> SRAM["On-chip SRAM tile"]
  K["K blocks"] --> SRAM
  V["V blocks"] --> SRAM
  SRAM -->|"scores computed inside the tile"| OS["Online softmax with running max and sum"]
  OS -->|"accumulate output block"| ACC["Output accumulator"]
  ACC --> HBM["Write only the output to HBM"]
  OS -->|"store softmax statistics only"| ST["Stats for backward pass"]
  ST -->|"recompute scores in backward"| SRAM`,
  },

  // Week 21 (month 5: KV cache, batching, streaming server)
  {
    id: 'read-vllm-pagedattention',
    weekId: 'week-21',
    kind: 'paper',
    title: 'Efficient Memory Management for Large Language Model Serving with PagedAttention',
    source: 'Kwon et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2309.06180',
    why: 'The KV-cache memory management scheme directly relevant to the KV cache and batched generation ms-gpt-from-scratch-3 asks you to build this week.',
    minutes: 35,
    summary: {
      problem:
        'Serving systems allocated each request\'s KV cache as one contiguous block sized to the maximum possible output length. That wastes memory three ways - a reserved but unused tail, internal fragmentation, and external fragmentation - and it cannot share identical prefixes between requests. Measured waste ran to 60-80% of KV memory, and KV memory is what caps batch size, which caps throughput.',
      idea: 'Apply operating-system virtual memory to the KV cache: store it in fixed-size non-contiguous blocks behind a per-request block table, so memory is allocated on demand and blocks can be shared and copied on write.',
      how: 'Each sequence\'s KV cache is split into fixed-size blocks holding a fixed number of tokens. A block table maps a sequence\'s logical block positions to physical blocks anywhere in GPU memory, and PagedAttention is a kernel that reads keys and values through that indirection. New blocks are allocated only as generation produces tokens, so nothing is reserved for a length that may never be reached. Sequences sharing a prefix - a common system prompt, or parallel samples from one prompt - share physical blocks with a reference count, and copy-on-write splits them when they diverge.',
      result:
        'vLLM cut KV-cache waste to under 4% and delivered 2-4x higher throughput than FasterTransformer and Orca at the same latency, with the gain growing for longer sequences, larger models, and decoding schemes that fan out such as beam search and parallel sampling.',
      soWhat:
        'ms-gpt-from-scratch-3 this week is your KV cache and batched generation, and this is the memory model to implement - even a simplified block allocator lets you report a batch size your naive implementation cannot reach. It is also the most-asked LLM-serving system design question, and prefix sharing is the concrete answer to making a shared system prompt cheap.',
      limits:
        'It solves memory management, not compute: prefill is still quadratic and decoding is still memory-bandwidth-bound, so it raises throughput without improving single-request latency. Paging adds indirection, which means a custom attention kernel and a real cost to maintain it against new hardware. Block size is a tuning parameter where too small loses kernel efficiency and too large brings internal fragmentation back. And prefix sharing only pays off when your requests genuinely share prefixes, which is a property of your traffic, not of the algorithm.',
    },
    diagram: `flowchart LR
  R1["Request A logical blocks"] --> BT1["Block table A"]
  R2["Request B logical blocks"] --> BT2["Block table B"]
  BT1 --> P1["Physical block: shared prompt"]
  BT2 --> P1
  BT1 --> P2["Physical block 7"]
  BT2 --> P3["Physical block 12"]
  P1 -->|"copy on write when they diverge"| P4["New physical block"]
  P2 --> POOL["GPU block pool, allocated on demand"]
  P3 --> POOL
  P4 --> POOL`,
  },
  {
    id: 'read-speculative-decoding',
    weekId: 'week-21',
    kind: 'paper',
    title: 'Fast Inference from Transformers via Speculative Decoding',
    source: 'Leviathan et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2211.17192',
    why: 'A decode-time speedup technique to consider for the throughput numbers your streaming server milestone needs to report next week.',
    minutes: 35,
    summary: {
      problem:
        'Autoregressive decoding produces one token per forward pass. At small batch sizes that pass is memory-bandwidth-bound - the GPU spends its time loading weights rather than computing - so the hardware is badly underused and latency scales directly with output length.',
      idea: 'Let a small cheap model guess several tokens ahead, then verify all of them in one forward pass of the large model, accepting the longest prefix the large model would have produced anyway.',
      how: 'A draft model generates gamma candidate tokens autoregressively. The target model then scores all gamma plus one positions in a single parallel forward pass. A modified rejection-sampling rule accepts each draft token with probability equal to the minimum of one and the ratio of target to draft probability, and on the first rejection samples a corrected token from the adjusted residual distribution. The key property is that the accepted sequence is distributed exactly as if sampled from the target model, so the output distribution is unchanged.',
      result:
        'The authors report roughly 2-3x wall-clock speedups on T5 translation and summarisation with provably identical output distributions, with the acceptance rate - and therefore the speedup - depending on how closely the draft model matches the target.',
      soWhat:
        'It is the technique to reach for when ms-gpt-from-scratch-4\'s streaming server has to report a latency number next week, and it is the interview answer that demonstrates you know decoding is bandwidth-bound: the whole trick works because a forward pass over five tokens costs nearly the same as over one.',
      limits:
        'It buys latency, not throughput. At large batch sizes decoding is already compute-bound and the extra draft work can make things worse, which is why serving systems enable it selectively. It needs a draft model that is both much cheaper and well aligned with the target - a poor draft is rejected constantly and you pay for it with no gain - and that second model consumes memory you would otherwise spend on KV cache. Every rejected token is wasted compute, so the speedup varies with the input and makes tail latency less predictable.',
    },
    diagram: `flowchart LR
  P["Prefix"] --> DM["Small draft model"]
  DM -->|"generate gamma tokens serially"| D["Draft tokens"]
  D --> TM["Large target model"]
  P --> TM
  TM -->|"one parallel forward pass"| SC["Target probabilities at every position"]
  SC --> ACC["Accept or reject each draft token"]
  ACC -->|"accepted prefix kept"| OUT["Output tokens"]
  ACC -->|"first rejection"| RS["Resample from corrected distribution"]
  RS --> OUT
  OUT --> P`,
  },

  // Week 22 (month 5 close, ms-gpt-from-scratch-4: streaming server, throughput/latency)
  {
    id: 'read-gptq-quantization',
    weekId: 'week-22',
    kind: 'paper',
    title: 'GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers',
    source: 'Frantar et al.',
    year: 2022,
    url: 'https://arxiv.org/abs/2210.17323',
    why: 'A one-shot weight quantization method that cuts memory and cost with little accuracy loss, worth applying to the streaming server ms-gpt-from-scratch-4 asks you to measure this week.',
    minutes: 35,
    summary: {
      problem:
        'A 175B-parameter model in 16-bit needs hundreds of gigabytes for weights alone, so serving it means many GPUs. Quantisation-aware training would fix that but requires retraining at full scale, and existing one-shot post-training methods either lost too much accuracy at low bit-width or were far too slow to run on models that size.',
      idea: 'Quantise weights one column at a time and, after each step, update the remaining un-quantised weights to compensate for the error just introduced.',
      how: 'GPTQ builds on Optimal Brain Quantisation: for each layer, minimise the squared error between the original and quantised layer outputs over a small calibration set, using the inverse Hessian of the layer input covariance to redistribute quantisation error onto weights not yet fixed. The contribution is the engineering that makes this tractable - quantising all rows in the same fixed column order so one Hessian factorisation is shared, processing in lazy batched blocks to stay compute-bound, and a Cholesky reformulation for numerical stability. No retraining, and only a few hundred calibration samples.',
      result:
        'It quantised OPT-175B and BLOOM-176B to 3 or 4 bits per weight in about four GPU-hours with negligible perplexity increase against 16-bit, roughly a 3-4x memory reduction that lets a 175B model be served on far fewer GPUs, with reported end-to-end inference speedups on the order of 3x on A100 from the reduced memory traffic.',
      soWhat:
        'ms-gpt-from-scratch-4 this week asks you to measure your streaming server throughput and latency. Quantising the weights is the cheapest way to move both numbers, and quantise the weights while keeping the KV cache at higher precision is the standard production answer you should be able to justify from first principles.',
      limits:
        'It quantises weights only. The KV cache and activations stay at higher precision, so at long context or large batch the memory bottleneck moves there and GPTQ stops helping. Accuracy loss is small on perplexity but concentrates in the tail - reasoning, code and rare-token behaviour degrade more than the aggregate suggests, so evaluate on your task rather than on perplexity. It depends on a calibration set, which biases the result toward that distribution. The speedup also requires kernels supporting the packed format, which constrains your serving stack. And below 3 bits it degrades sharply, which is where later methods and QLoRA\'s NF4 took over.',
    },
    diagram: `flowchart LR
  W["Layer weight matrix"] --> COL["Take next column"]
  CAL["Calibration inputs"] --> H["Inverse Hessian of input covariance"]
  COL --> QZ["Quantise column to 3 or 4 bits"]
  QZ --> ERR["Quantisation error"]
  H --> UPD["Update remaining columns to absorb the error"]
  ERR --> UPD
  UPD --> COL
  COL -->|"all columns done"| OUT["Quantised layer"]`,
  },

  // Week 23 (month 6 opens, proj-fine-tune-eval: dataset curation, LoRA SFT)
  {
    id: 'read-lora',
    weekId: 'week-23',
    kind: 'paper',
    title: 'LoRA: Low-Rank Adaptation of Large Language Models',
    source: 'Hu et al.',
    year: 2021,
    url: 'https://arxiv.org/abs/2106.09685',
    why: 'The parameter-efficient fine-tuning method ms-fine-tune-eval-2 asks you to run this week, worth reading in full before you set rank and target modules.',
    minutes: 35,
    summary: {
      problem:
        'Full fine-tuning updates every weight, so each task produces a complete copy of the model - impossible to store or serve at scale across many tasks. The alternatives of the day, adapter layers and prefix tuning, either added inference latency or consumed usable sequence length, and both gave up some quality.',
      idea: 'The weight update during adaptation has low intrinsic rank, so learn it as the product of two small matrices and leave the pretrained weights frozen.',
      how: 'For a pretrained weight matrix W, freeze it and learn a change of weights as B times A, where A is rank r by input dimension and B is output dimension by r, with r far smaller than either. The forward pass becomes W times x plus alpha over r times B times A times x. A is initialised randomly and B to zero, so training begins exactly at the pretrained model. Only A and B receive gradients, which removes the optimiser state for the frozen weights - the dominant part of fine-tuning memory. After training, B times A can be merged into W, so inference adds no latency and a served base model can hot-swap task adapters.',
      result:
        'On GPT-3 175B, LoRA matched or beat full fine-tuning quality while training roughly 10,000 times fewer parameters and cutting GPU memory about 3x, shrinking a task checkpoint from hundreds of gigabytes to tens of megabytes.',
      soWhat:
        'ms-fine-tune-eval-2 this week is a LoRA supervised fine-tuning run. Read it before you set rank and target modules: the paper\'s own ablations show that adapting the attention projections at a small rank, often 4 to 8, is usually enough, and that rank buys less than people assume. It also sets up month 6\'s central defense question of RAG versus fine-tuning.',
      limits:
        'It adapts, it does not teach. LoRA is good at style, format and task behaviour and poor at injecting substantial new factual knowledge - that is what retrieval is for, and confusing the two is the most common fine-tuning mistake. Rank, alpha and which modules to target are hyperparameters with no principled setting, so you tune them. The low-rank constraint costs quality on tasks far from the pretraining distribution. And merging is only free for one adapter: serving many merged variants means many model copies, while serving them unmerged reintroduces the overhead merging removed.',
    },
    diagram: `flowchart LR
  X["Input x"] --> WF["Frozen pretrained W"]
  X --> A["Down-projection A, rank r"]
  A --> B["Up-projection B, zero initialised"]
  WF --> SUM["Add"]
  B -->|"scaled by alpha over r"| SUM
  SUM --> H["Output h"]
  B -->|"after training, merge B times A into W"| WF`,
  },
  {
    id: 'read-qlora',
    weekId: 'week-23',
    kind: 'paper',
    title: 'QLoRA: Efficient Finetuning of Quantized LLMs',
    source: 'Dettmers et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2305.14314',
    why: 'Shows how quantization keeps LoRA fine-tuning affordable on a single GPU, the budget constraint ms-fine-tune-eval-2 has to respect this week.',
    minutes: 35,
    summary: {
      problem:
        'LoRA removes the optimiser state, but you still have to hold the frozen base model in memory to compute gradients through it. At 65B parameters in 16-bit that is well over 700GB of GPU memory - a multi-node job, out of reach without a cluster.',
      idea: 'Quantise the frozen base model to 4 bits and backpropagate through it into 16-bit LoRA adapters, so fine-tuning a 65B model fits on one 48GB GPU.',
      how: 'Three pieces. NF4, a 4-bit NormalFloat data type that is information-theoretically optimal for the roughly normally distributed weights of a neural network, is used to store the frozen base. Double quantisation quantises the quantisation constants themselves, saving roughly another 0.4 bits per parameter. Paged optimisers use unified memory to page optimiser state to the CPU during gradient-checkpointing spikes instead of hitting an out-of-memory error. Weights are dequantised to bf16 block by block only when needed for the forward and backward pass, and gradients flow through into LoRA adapters applied to every linear layer.',
      result:
        'Fine-tuning a 65B model dropped from more than 780GB of GPU memory to under 48GB - a single card - with no measured loss against 16-bit full fine-tuning, and the resulting Guanaco 65B reached 99.3% of ChatGPT\'s score on the Vicuna benchmark after 24 hours of training on one GPU.',
      soWhat:
        'This is the budget constraint ms-fine-tune-eval-2 has to respect this week: it is what makes a month 6 fine-tuning project possible on rented single-GPU hardware rather than a cluster. Its ablations are also the source of the standard practical advice - apply LoRA to all linear layers rather than only the attention projections, and coverage matters more than rank.',
      limits:
        'It saves memory, not time: dequantising blocks on every forward and backward pass makes each step slower than 16-bit LoRA, so you trade wall-clock for hardware you can actually rent. The 4-bit base is frozen at that precision, so the model you serve is either the quantised one or a lossy re-merge, since merging bf16 adapters back into a 4-bit base is not exact. It inherits every LoRA limitation above it - still adaptation rather than knowledge injection, still hyperparameters to tune. And the Vicuna and GPT-4-judge evaluation behind the headline number has known biases, which the paper itself discusses at length.',
    },
    diagram: `flowchart LR
  BW["Base weights"] -->|"NF4 quantise"| Q4["4-bit frozen base"]
  Q4 -->|"quantise the quantisation constants"| DQ["Double quantised base"]
  DQ -->|"dequantise block to bf16 on demand"| FWD["Forward and backward pass"]
  X["Input"] --> FWD
  FWD --> LR["LoRA adapters in bf16"]
  LR --> OPT["Paged optimiser state"]
  OPT -->|"pages to host on memory spike"| CPU["CPU memory"]
  FWD --> OUT["Gradients flow to adapters only"]`,
  },

  // Week 24 (month 6: preference data and DPO)
  {
    id: 'read-dpo',
    weekId: 'week-24',
    kind: 'paper',
    title: 'Direct Preference Optimization: Your Language Model is Secretly a Reward Model',
    source: 'Rafailov et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2305.18290',
    why: 'The preference-tuning method ms-fine-tune-eval-3 asks you to run this week on top of your SFT model, so read the derivation before you train.',
    minutes: 35,
    summary: {
      problem:
        'RLHF aligns a model in three stages - supervised fine-tuning, then fitting a reward model on preference pairs, then optimising the policy against it with PPO. The reinforcement learning stage is unstable, needs a reward model and a reference model in memory simultaneously, and has a pile of hyperparameters that decide whether the run works at all.',
      idea: 'The optimal policy for the KL-constrained RLHF objective has a closed form in terms of the reward, so you can invert it and express the reward in terms of the policy, turning preference learning into a simple classification loss on the policy itself.',
      how: 'Under the KL-regularised objective the optimal policy is the reference policy reweighted by the exponentiated reward. Solving for the reward gives beta times the log ratio of policy to reference probability, plus a partition term that cancels inside the Bradley-Terry pairwise comparison. Substituting that into the preference likelihood yields a loss over prompt, chosen, rejected triples: a logistic loss on the difference of those log ratios for the chosen and the rejected response. Training is ordinary supervised learning against a frozen reference model, with no sampling from the policy, no reward model, and one hyperparameter, beta, playing the role of the KL penalty.',
      result:
        'DPO matched or exceeded PPO-based RLHF on sentiment control, summarisation and single-turn dialogue while being substantially simpler and more stable to train, and it has since become the default alignment method in open-model post-training pipelines largely because of that stability.',
      soWhat:
        'ms-fine-tune-eval-3 this week runs DPO on top of your SFT model. Read the derivation and not just the loss, because the month 6 defense question is what you traded away versus RLHF, and the honest answer requires knowing that DPO fixes the reward model to the policy\'s own log-ratios.',
      limits:
        'It optimises against a fixed offline preference set, so it never explores: it cannot discover responses better than the ones in your data, where PPO can, and it is more sensitive to distribution shift between your preference pairs and what your SFT model actually produces. It is prone to a specific failure where the loss is minimised by pushing the rejected response\'s likelihood down rather than raising the chosen one\'s, which degrades the model overall. Beta is a genuine tuning burden and the reference model is not free in memory. In practice teams have needed variants - IPO, KTO, ORPO, iterative or online DPO - to close the gap in harder settings.',
    },
    diagram: `flowchart LR
  D["Triples: prompt, chosen, rejected"] --> P["Policy model"]
  D --> REF["Frozen reference model"]
  P -->|"log prob of chosen and rejected"| LR1["Policy log ratios"]
  REF -->|"log prob of chosen and rejected"| LR2["Reference log ratios"]
  LR1 --> DIFF["Implicit reward: beta times log ratio"]
  LR2 --> DIFF
  DIFF -->|"logistic loss on chosen minus rejected"| L["Gradient"]
  L --> P`,
  },
  {
    id: 'read-deepseek-r1',
    weekId: 'week-24',
    kind: 'paper',
    title: 'DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning',
    source: 'DeepSeek AI',
    year: 2025,
    url: 'https://arxiv.org/abs/2501.12948',
    why: 'Shows reinforcement learning producing reasoning behavior directly, a useful contrast to the DPO run you are doing this week in ms-fine-tune-eval-3.',
    minutes: 35,
    summary: {
      problem:
        'Reasoning ability was being taught by supervised fine-tuning on human-written or distilled chains of thought - expensive to produce, capped by the quality of the demonstrations, and it left open whether reasoning could emerge without them at all.',
      idea: 'Reward only the correctness of the final answer and let reinforcement learning discover the reasoning process on its own, with no supervised reasoning traces.',
      how: 'DeepSeek-R1-Zero applies large-scale RL directly to a base model using GRPO, which estimates the baseline from a group of sampled outputs rather than a learned value network, with rule-based rewards for answer accuracy and output format and no supervised stage at all. Because that model produced poorly readable, language-mixed output, DeepSeek-R1 wraps a pipeline around it: a small cold-start supervised set of readable long chains of thought, reasoning-oriented RL, rejection sampling to build fresh supervised data from the RL checkpoint, then a final RL stage covering all scenarios. The reasoning was then distilled into smaller dense models.',
      result:
        'R1 reached performance comparable to OpenAI o1-1217 on reasoning benchmarks, and R1-Zero showed reasoning behaviours - longer deliberation, self-verification, backtracking - emerging from pure RL with no supervised reasoning data. The weights and the distilled smaller models were released openly, which is a large part of why the paper mattered.',
      soWhat:
        'It is the deliberate contrast to the DPO run you do this week in ms-fine-tune-eval-3: DPO learns from a fixed preference set, R1 learns from a verifiable reward. Knowing which of your tasks has a mechanically checkable answer, and therefore admits RL rather than preference tuning, is the interesting half of the month 6 write-up.',
      limits:
        'The recipe depends on rewards you can compute mechanically, which is why it works on maths and code and does not transfer to open-ended writing, judgement, or anything needing a human notion of quality. R1-Zero output was poorly readable and mixed languages, which is exactly why the full pipeline reintroduces supervised stages - pure RL is the finding, not the shipped method. The compute is far beyond a personal project, so this is a paper to understand rather than reproduce. And the distilled small models inherit the reasoning style without the base capability that made it useful.',
    },
  },

  // Week 25 (month 6: comparative eval report)
  {
    id: 'read-mt-bench-judge',
    weekId: 'week-25',
    kind: 'paper',
    title: 'Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena',
    source: 'Zheng et al.',
    year: 2023,
    url: 'https://arxiv.org/abs/2306.05685',
    why: 'Documents the biases of LLM-as-judge scoring you should account for before trusting the comparative eval report ms-fine-tune-eval-4 asks for this week.',
    minutes: 35,
    summary: {
      problem:
        'Multi-turn open-ended chat quality is what users care about and what benchmarks like MMLU cannot measure. Human evaluation can, but it is slow and expensive, so teams started using strong models as judges without knowing how far to trust them.',
      idea: 'Measure the judge: compare LLM-as-a-judge verdicts against a large corpus of human preferences and quantify both the agreement and the specific biases.',
      how: 'Two benchmarks. MT-Bench is 80 multi-turn questions across eight categories; Chatbot Arena is crowdsourced anonymous pairwise battles. The authors collect roughly 30,000 human votes as ground truth and use them to score three judging modes - pairwise comparison, single-answer grading, and reference-guided grading. They then isolate specific failure modes and test mitigations: swapping answer order for position bias, adding reference answers and chain-of-thought for grading maths, and multi-turn prompting for the second-turn problem.',
      result:
        'Strong LLM judges reached about 80% agreement with human preferences - roughly the level at which two human annotators agree with each other - while showing measurable position bias, where the answer shown first is favoured, verbosity bias, where longer answers score higher regardless of quality, self-enhancement bias toward their own model family, and poor grading of maths and reasoning without a reference answer.',
      soWhat:
        'ms-fine-tune-eval-4 this week is a comparative eval report, and if you use an LLM judge you must apply the mitigations from this paper - randomise answer order, control for length, use a reference answer for anything checkable - or your report will measure verbosity and call it quality. How you know your judge is trustworthy is a question you should welcome, not dread.',
      limits:
        '80% agreement is also 20% disagreement, and those errors are not random: they correlate with exactly the properties a fine-tune changes, so a judge can systematically favour your new model for the wrong reasons. MT-Bench is only 80 questions, so differences between close models sit inside the noise, and both benchmarks are public and therefore trainable against. The mitigations reduce the biases but none eliminates them, and self-enhancement bias means you should never let a model judge its own family in a report you intend to defend.',
    },
  },

  // Week 26 (month 6 close: comparative eval report and the interview sprint)
  {
    id: 'read-constitutional-ai',
    weekId: 'week-26',
    kind: 'paper',
    title: 'Constitutional AI: Harmlessness from AI Feedback',
    source: 'Bai et al., Anthropic',
    year: 2022,
    url: 'https://arxiv.org/abs/2212.08073',
    why: 'Lays out RLAIF as an alternative to human-labeled RLHF, direct ammunition for the "DPO vs RLHF, what did you trade away" defense question you close ms-fine-tune-eval-4 with this week.',
    minutes: 35,
    summary: {
      problem:
        'RLHF for harmlessness needs humans to label large volumes of harmful model output. That is slow, expensive, distressing to do, and opaque, because the values being trained in exist only implicitly in the labels and cannot be inspected or revised.',
      idea: 'Replace the human harmlessness labels with the model\'s own judgements against a short written list of principles, so the values become explicit text and supervision scales with compute instead of headcount.',
      how: 'Two stages. Supervised: prompt a helpful-only model with red-team inputs, have it critique its own response against a principle sampled from the constitution, revise it, and fine-tune on the revised responses. Reinforcement learning: for each prompt sample a pair of responses from that model and ask a feedback model which better satisfies a sampled principle; the resulting AI preference labels train a preference model, which then trains the policy with RL. Human labels are kept only for helpfulness.',
      result:
        'The resulting assistant was both more harmless and less evasive than the RLHF baseline - it explains why it declines rather than refusing flatly - and the harmlessness supervision came from a list of principles a person can read and edit rather than from tens of thousands of labels.',
      soWhat:
        'It is direct ammunition for the month 6 defense question you close ms-fine-tune-eval-4 with, because it is a third point on the map: RLAIF changes where the preference signal comes from rather than how the policy is optimised. It is also the cheapest way to generate preference pairs when you cannot afford human labelling, which is the situation you are actually in.',
      limits:
        'The AI feedback comes from the same model family being trained, so it inherits that model\'s blind spots: it cannot flag a harm it does not recognise, and its errors are correlated rather than averaged out the way independent human labels are. Writing the constitution becomes the hard part, and short principles under-specify hard cases and conflict with one another. Helpfulness supervision stays human in this recipe, so it does not remove human labelling altogether. And harmless here means a specific 2022 red-teaming distribution, not a general safety guarantee.',
    },
  },
]
