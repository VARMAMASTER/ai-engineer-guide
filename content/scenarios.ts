import { z } from 'zod'

// Debugging-scenario bank.
//
// Every other bank in this guide asks "explain X". This one asks "your system is broken in
// this specific way - what do you do?", because that is the shape the on-site question is
// increasingly taking: the interviewer describes a production failure and watches whether
// you diagnose or guess.
//
// The scenario FORMAT here is inspired by the scenario-style questions in
// https://github.com/amitshekhariitbhu/ai-engineering-interview-questions, which is
// licensed under the Apache License 2.0. That repository was used as a coverage map only.
// No question text from it is reproduced; every symptom, cause and fix below is written
// from scratch and made concrete in ways a one-line prompt cannot be.
//
// The value of a scenario is NOT in `fix`. Anyone can say "add a reranker". The value is in
// `firstQuestions` - what you establish before touching anything - and in `causes`, which is
// a differential diagnosis: each hypothesis ships with the check that would confirm or kill
// it. A cause you cannot falsify is an opinion, not a diagnosis. And every `tradeoff` is
// non-empty on purpose: a fix that costs nothing is a fix you have not thought about.

export const scenarioAreaSchema = z.enum([
  'rag',
  'agent',
  'inference',
  'prompt',
  'evaluation',
  'safety',
])

export const scenarioCauseSchema = z.object({
  // The hypothesis, stated so that it could be wrong.
  hypothesis: z.string().min(1),
  // The observation that confirms or rules it out. Must be something you can actually run.
  check: z.string().min(1),
})

export const scenarioSchema = z.object({
  id: z.string().regex(/^scn-[a-z0-9-]+$/),
  area: scenarioAreaSchema,
  symptom: z.string().min(1),
  firstQuestions: z.array(z.string().min(1)).min(2).max(4),
  causes: z.array(scenarioCauseSchema).min(2).max(4),
  fix: z.string().min(1),
  tradeoff: z.string().min(1),
  seniorSignal: z.string().min(1),
  minutes: z.number().int().min(10).max(20),
})

export type ScenarioArea = z.infer<typeof scenarioAreaSchema>
export type ScenarioCause = z.infer<typeof scenarioCauseSchema>
export type Scenario = z.infer<typeof scenarioSchema>

export const scenarios: Scenario[] = [
  // ------------------------------------------------------------------ RAG failures
  {
    id: 'scn-rag-hallucinates-with-correct-context',
    area: 'rag',
    symptom:
      'Support escalates a ticket: the bot told a customer the refund window is 45 days. The answer cites the right policy page, the retrieval trace shows the right chunk was fetched, and that chunk says 30 days. The number 45 appears nowhere in the corpus.',
    firstQuestions: [
      'Was the correct text actually in the final prompt, byte for byte? Log the fully rendered prompt for the failing request and search it for the string "30 days". Everyone assumes the retriever top-k is what the model saw; prompt assembly truncates more often than anyone expects.',
      'Does the model still get it wrong when that chunk is the only thing in the prompt? Re-run with question plus gold chunk and nothing else. Right answer means the bug is in the surrounding context; wrong answer means it is generation.',
      'Is 45 a plausible parametric answer - a common industry default the model may have memorised - or does it appear in some other retrieved chunk?',
      'Is it deterministic? Five runs at temperature 0. A one-in-five failure and a five-in-five failure are different bugs.',
    ],
    causes: [
      {
        hypothesis:
          'Prompt assembly silently drops or truncates the gold chunk: it is retrieved, logged as retrieved, then cut by a token budget or a join bug before the API call.',
        check:
          'Assert in code that the gold string is present in the rendered prompt, and emit a counter for "retrieved but absent from final prompt". Replay the failing request and read the actual request body, not the retrieval log.',
      },
      {
        hypothesis:
          'A competing chunk contradicts the gold one - an old policy version, a regional variant, a marketing page - and the model picked the wrong one or blended them.',
        check:
          'Print all k chunks for the failing query and grep every number in them. Then re-run with k=1, gold chunk only. If the answer corrects, the problem is context competition, not the model.',
      },
      {
        hypothesis:
          'The parametric prior overrides the context: the model "knows" a typical refund window and treats the document as background rather than as authority.',
        check:
          'Sentinel test. Edit the chunk in flight to say an implausible value, "the refund window is 173 days", and ask again. If it answers 173, context wins and the bug is upstream in retrieval or assembly. If it still answers 30 or 45, the model is genuinely ignoring context and the prompt has to change.',
      },
      {
        hypothesis:
          'The fact sits in a table row or footnote whose structure the parser destroyed, so the model reads "45" from an adjacent row - a processing-fee column, say - as if it were the window.',
        check:
          'Read the chunk as raw text exactly as the model receives it, not as rendered in the PDF viewer. Look for collapsed table structure where numbers have lost their column headers.',
      },
    ],
    fix:
      'Assume the sentinel test points at context competition, which is the common answer. Cut k from 8 to 3 behind a cross-encoder reranker so contradictory low-scoring chunks never reach the prompt; order the surviving chunks so the highest-scoring one sits last, adjacent to the question; version-filter the index so superseded policy documents are excluded rather than merely down-ranked. Then add a grounding check: the prompt requires every numeric or date claim to be quoted verbatim with its chunk id, and a cheap post-processing pass verifies that the quoted substring actually occurs in that chunk. On failure, retry once, then fall back to "the policy documents I can see do not state this".',
    tradeoff:
      'The verbatim-quote check costs a second pass over every answer and will reject some correct answers where the model paraphrased legitimately, which shows up as a higher abstention rate. Cutting k to 3 measurably lowers recall on multi-part questions that genuinely need five sources. You have bought a measurable hallucinated-number rate at the cost of some recall, some fluency and a little latency - and you should say which of those the business would rather pay.',
    seniorSignal:
      'They run the sentinel test to separate "the model ignored the context" from "the context was never in the prompt" before changing anything - a weak answer bolts on a reranker to fix a bug that lived in string concatenation.',
    minutes: 15,
  },
  {
    id: 'scn-rag-retrieval-slow-at-scale',
    area: 'rag',
    symptom:
      'Retrieval p95 went from 120ms to 1.4s over six weeks. The corpus grew from 50k chunks to 4M in the same period. Median is still 180ms, so the dashboard average looks almost fine and nobody noticed until users started complaining about the spinner.',
    firstQuestions: [
      'Where in the retrieval call is the time actually going? Break the span into embedding the query, the ANN search, metadata filtering, and the reranker. A p95 regression that is entirely the reranker is a different problem from one in the index.',
      'Is p95 slow for all queries or a subset? Group latency by query length, by tenant, and by whether a metadata filter was applied. Bimodal latency almost always means a filtered path is falling back to a brute-force scan.',
      'What changed besides corpus size - index type, replica count, instance size, filter usage, or a new tenant with a very large document set?',
    ],
    causes: [
      {
        hypothesis:
          'Pre-filtering by tenant or document type is forcing an exact scan because the filter is highly selective and the ANN index cannot use it.',
        check:
          'Run the same query with and without the metadata filter and compare latency. Check the vector store query plan or equivalent explain output. If unfiltered is 40ms and filtered is 1.3s, this is it.',
      },
      {
        hypothesis:
          'Index parameters were never retuned for the new scale - an HNSW efSearch, or an IVF nprobe, that was reasonable for 50k vectors is now scanning far too many candidates.',
        check:
          'Sweep efSearch or nprobe against a fixed query set, plotting recall@10 versus latency. If you can hold recall and halve latency by moving one number, the index was simply mistuned.',
      },
      {
        hypothesis:
          'The index no longer fits in RAM on the current instance and is paging from disk.',
        check:
          'Compare resident set size against index size, and look at page-fault rate and disk read IOPS during a slow window. Correlate a latency spike with an IO spike.',
      },
      {
        hypothesis:
          'The reranker is the real cost: a cross-encoder scoring 50 candidates per query on a shared, now-saturated GPU.',
        check:
          'Read the reranker span alone at p95 and look at its queue depth. Drop candidates from 50 to 20 in staging and watch whether p95 falls proportionally.',
      },
    ],
    fix:
      'Given a filter-driven scan: move tenant separation from a runtime filter into physical partitioning - one namespace or collection per large tenant, shared namespaces for the long tail - so the ANN index is searched inside an already-scoped space. Retune efSearch against a recall target rather than leaving it at the default, size instances so the working set stays resident, and cap reranker candidates at 20. Put the SLO on p95 and p99 rather than mean, because the mean hid this for six weeks.',
    tradeoff:
      'Physical partitioning multiplies operational surface: more namespaces to migrate, rebuild and monitor, and cross-tenant queries become a fan-out you now have to write. Lowering efSearch and reranker candidates costs recall - you must measure how much, on a golden set, and be willing to state the number rather than hope nobody asks.',
    seniorSignal:
      'They decompose the latency before optimising anything, and they notice that a healthy median next to a bad p95 is the signature of two code paths, not of uniform slowness.',
    minutes: 15,
  },
  {
    id: 'scn-rag-duplicate-chunks',
    area: 'rag',
    symptom:
      'Reading a retrieval trace, four of the top five chunks are the same paragraph from v3, v4, v5 and a PDF export of one handbook. The model effectively sees one fact repeated four times, and the chunk that would have answered the second half of the question sits at rank 9, outside the cut.',
    firstQuestions: [
      'What fraction of top-k slots are near-duplicates across a sample of 200 real queries? Compute pairwise cosine or a shingle overlap on the retrieved sets before arguing about a fix.',
      'Are these true duplicates from repeated ingestion, or genuine versions of an evolving document? The fix differs: one is a data bug, the other is a policy decision about which version is authoritative.',
      'Does answer quality actually suffer, or is this only ugly in the trace? Compare answers on the same queries with and without deduplication before spending a sprint.',
    ],
    causes: [
      {
        hypothesis:
          'Ingestion is not idempotent: re-crawls insert new rows instead of upserting by a stable document key, so every crawl multiplies the corpus.',
        check:
          'Count chunks grouped by content hash. If one hash has five rows with five ids and five ingest timestamps, ingestion is appending, not upserting.',
      },
      {
        hypothesis:
          'The same content arrives through two pipelines - the web crawler and a document-store sync - with no shared identity.',
        check:
          'Join duplicated content hashes against their source field. Two distinct sources for identical text confirms it.',
      },
      {
        hypothesis:
          'The duplicates are legitimate versions and nothing marks which is current, so the retriever has no basis for preferring one.',
        check:
          'Inspect the metadata on a duplicated set. If there is no effective-date or supersededBy field, the retriever could not have chosen correctly even in principle.',
      },
    ],
    fix:
      'Two layers. At ingest, key chunks by content hash plus a stable source document id and upsert, so re-crawling is idempotent; backfill by deleting rows whose hash collides with a newer version. At query time, apply MMR or a similarity-threshold dedup over the candidate set before truncating to k, so top-k spends its slots on distinct facts. For genuine versions, add an effectiveDate and a currentVersion flag and filter to current by default, exposing history only when the question asks for it.',
    tradeoff:
      'MMR trades precision for diversity and will occasionally push out a chunk that was genuinely the best second-place answer. Hash dedup collapses documents differing only in a header or date stamp, which is right most of the time and wrong when the date stamp was the answer. Version filtering makes a question about last year unanswerable unless you also build the history path.',
    seniorSignal:
      'They fix ingestion idempotency rather than only papering over it with query-time MMR, and they check whether the duplication actually degrades answers before committing to either.',
    minutes: 12,
  },
  {
    id: 'scn-rag-domain-jargon-missed',
    area: 'rag',
    symptom:
      'Internal users ask about "AOP variance" and "the RTB deck" and get generic finance articles from the public help centre. The documents that use those exact terms are in the index and score below rank 20. External users asking plain-English questions get good answers.',
    firstQuestions: [
      'Does an exact keyword search for the term return the right document? If BM25 finds it instantly and the vector search does not, the diagnosis is already made.',
      'What does the embedding model do with the acronym - is there any signal for it, or is it out-of-vocabulary noise that pulls the query vector toward whatever is generic and finance-shaped?',
      'How many such terms are there? Ten acronyms is a glossary; two thousand is a hybrid-search or fine-tuning problem.',
    ],
    causes: [
      {
        hypothesis:
          'The general-purpose embedding model has no useful representation for internal acronyms, so the query vector lands in a generic neighbourhood.',
        check:
          'Embed "AOP variance" and the gold chunk and compute similarity; compare against a paraphrase using the expanded term, "annual operating plan variance". If the expansion scores far higher, the acronym is the problem.',
      },
      {
        hypothesis:
          'Dense-only retrieval with no lexical channel: rare exact tokens are exactly what dense retrieval is worst at.',
        check:
          'Stand up BM25 over the same corpus and measure recall@10 on 50 jargon queries against the dense system. A large gap in favour of BM25 on rare terms confirms it.',
      },
      {
        hypothesis:
          'The documents using the jargon are structurally disadvantaged - slide decks chunked into title fragments with no surrounding prose.',
        check:
          'Pull the actual chunks for those documents and read them. If a chunk is six words of a slide title, no retriever was going to rank it.',
      },
    ],
    fix:
      'Hybrid retrieval: run BM25 and dense in parallel and fuse with reciprocal rank fusion, which needs no score calibration and is hard to get wrong. Add a curated glossary - a few hundred entries is realistic - applied as query expansion, so "AOP" also searches "annual operating plan". For the slide decks, change chunking so every chunk carries the deck title and section heading, giving a title fragment enough context to be retrievable.',
    tradeoff:
      'Hybrid retrieval doubles retrieval infrastructure and adds a fusion step to latency, and BM25 needs its own index to keep in sync. The glossary is a permanent maintenance obligation owned by a human who will eventually leave; if it rots it degrades silently. Query expansion also adds noise on queries where the acronym meant something else.',
    seniorSignal:
      'They reach for hybrid search because rare exact tokens are a known dense-retrieval weakness, rather than proposing to fine-tune an embedding model on a corpus of 4,000 documents.',
    minutes: 13,
  },
  {
    id: 'scn-rag-multi-hop-failure',
    area: 'rag',
    symptom:
      'Single-fact questions work well. "Which vendors did the engineer who signed off the Q3 security review previously work with?" returns the security review, does not return the vendor list, and the model answers confidently from the one document it got.',
    firstQuestions: [
      'Is the second document retrievable at all when you search for it directly using the intermediate answer? If yes, this is an orchestration problem, not a retrieval quality problem.',
      'What proportion of real traffic is multi-hop? Sample 200 logged questions and label them. Building a multi-hop pipeline for 3% of traffic is usually the wrong call.',
      'When it fails, does the model hedge or answer from one hop as if it were complete? The silent single-hop answer is the dangerous failure; a hedged one is survivable.',
    ],
    causes: [
      {
        hypothesis:
          'One retrieval pass by design: the pipeline embeds the raw question once, and no single chunk contains both hops, so the join is impossible.',
        check:
          'Read the pipeline. One embed call and one search per turn is the whole diagnosis - no experiment needed.',
      },
      {
        hypothesis:
          'The question embedding is dominated by the first entity, so the second hop never surfaces even at large k.',
        check:
          'Raise k to 50 and check whether the vendor-list document appears anywhere. If it does not appear at k=50, it is not a ranking problem.',
      },
      {
        hypothesis:
          'The model is never told it may be missing information, so it does what it is trained to do and answers.',
        check:
          'Add "if the context does not contain the link between the two, say so" and re-run the failing set. If failures turn into explicit refusals, the silence was a prompting problem layered on the retrieval one.',
      },
    ],
    fix:
      'Add a bounded iterative retrieval loop for the questions that need it: classify the question as single- or multi-hop with a cheap model, and for multi-hop, retrieve, let the model name what it still needs, retrieve again on that, capped at two extra hops. Route the classified-simple majority down the existing one-shot path so you do not pay latency on every query. Separately, make abstention explicit so a failed second hop surfaces as "I found the reviewer but not their vendor history" rather than as a confident half-answer.',
    tradeoff:
      'Each hop is a full round trip - roughly two to three times the latency and cost on the multi-hop path - and the classifier will misroute queries in both directions. An iterative loop also introduces a new failure mode, drifting sub-queries, that you now have to trace and bound.',
    seniorSignal:
      'They size the multi-hop traffic before building a multi-hop system, and they treat the confident half-answer as the more urgent bug than the missing hop.',
    minutes: 15,
  },
  {
    id: 'scn-rag-contradictory-sources',
    area: 'rag',
    symptom:
      'The corpus contains a 2023 engineering handbook saying deploys freeze on Fridays and a 2025 team wiki saying they do not. The bot picks one, states it flatly, cites only that one, and gives different users different answers depending on which chunk ranked first that day.',
    firstQuestions: [
      'Are both sources current, or is one superseded? That is a content-ownership question you cannot answer from the index - go find who owns each document.',
      'Does the model see both chunks and choose, or is only one retrieved per query? Read the traces. Choosing badly and never seeing the alternative need different fixes.',
      'What should the product do when sources genuinely conflict - pick by authority, present both, or escalate to a human? Decide that before writing code, because it is a product decision wearing an engineering costume.',
    ],
    causes: [
      {
        hypothesis:
          'No authority or recency metadata exists, so the retriever has no basis for ranking one source over the other and the outcome is effectively random.',
        check:
          'Inspect the metadata schema. If there is no source-tier or effective-date field, ranking by authority is not currently possible.',
      },
      {
        hypothesis:
          'Both chunks reach the prompt and the model silently resolves the conflict, because nothing tells it that reporting a conflict is an allowed output.',
        check:
          'Take a failing query, confirm both chunks are in the rendered prompt, then add an instruction to report disagreements. If it now reports both, the model was suppressing a conflict it had detected.',
      },
      {
        hypothesis:
          'Stale content was never retired: the 2023 handbook should have been archived and nobody owns deletion.',
        check:
          'Check last-modified dates across the corpus. A long tail of documents untouched for two years, still live in the index, is an ingestion-governance failure.',
      },
    ],
    fix:
      'Add a source tier and an effective date to the ingest schema, and rank on a combination of relevance, tier and recency rather than relevance alone. Change the generation prompt so that when retrieved chunks disagree on a fact, the model must say so and cite both with their dates instead of picking. Archive documents past a review date out of the default index, and give each source an owner who is pinged when its review date passes.',
    tradeoff:
      'Presenting conflicts makes answers longer and less satisfying, and some users read "sources disagree" as the bot being useless. Recency ranking is wrong for genuinely timeless content - a 2019 architecture decision record does not become less true. Archiving needs human owners, which means a process that decays unless someone maintains it.',
    seniorSignal:
      'They recognise a contradictory corpus as a data-governance problem and that no amount of reranking turns two conflicting documents into one truth - the engineering fix is to surface the conflict honestly, not to hide it better.',
    minutes: 14,
  },
  {
    id: 'scn-rag-stale-answers',
    area: 'rag',
    symptom:
      'A pricing page was updated on Monday morning. On Wednesday the bot is still quoting the old prices, and a sales engineer has already sent a customer the wrong figure. Documents deleted last month are still being cited.',
    firstQuestions: [
      'What is the actual end-to-end lag from source edit to searchable chunk? Instrument it: write a canary document, edit it, and time when the new text becomes retrievable.',
      'Is this an update problem, a delete problem, or both? Deletes failing silently while updates work points at a specific bug in the sync path.',
      'What freshness does the business actually need - minutes, hours, or a day? Nobody has asked, and the answer changes the design entirely.',
    ],
    causes: [
      {
        hypothesis:
          'The pipeline is a nightly full re-crawl that failed, or is skipping documents, and nothing alerts on it.',
        check:
          'Look at the last three job runs: exit status, documents processed, documents skipped. A job that "succeeded" while processing zero documents is a classic.',
      },
      {
        hypothesis:
          'Updates re-embed and insert but never remove the old vector, so both versions live in the index and the old one sometimes wins.',
        check:
          'Search the index for the pricing text. Two chunks, old and new, both present, is conclusive.',
      },
      {
        hypothesis:
          'Deletion at source does not propagate: the connector only sees existing documents and has no tombstone or reconciliation pass.',
        check:
          'Delete a canary document at source, wait a full cycle, and query for it. If it is still there, deletes are not wired at all.',
      },
      {
        hypothesis:
          'A response cache in front of the pipeline is serving old answers even though the index is current.',
        check:
          'Query the retriever directly, bypassing the cache. Fresh from the retriever and stale from the API means the index is innocent.',
      },
    ],
    fix:
      'Move from full re-crawl to change data capture where the source supports it - webhooks or a change feed - so an edit propagates in minutes, and upsert by stable document id so an update replaces rather than accumulates. Add a nightly reconciliation that diffs source ids against index ids and hard-deletes orphans, which is what catches the deletions the connector missed. Publish a freshness metric - age of the oldest un-synced change - and alert on it, so staleness is visible rather than discovered by a sales engineer. Key any response cache on the index version so a re-index invalidates it.',
    tradeoff:
      'CDC is more moving parts than a cron job and fails in subtler ways: a dropped webhook is silent where a failed cron is loud, which is exactly why the reconciliation pass stays. Near-real-time indexing costs more embedding calls on churny documents, and invalidating the response cache on every index bump throws away hit rate you were relying on for latency and cost.',
    seniorSignal:
      'They ask what freshness the business needs before designing for real time, and they keep the boring reconciliation pass as the backstop for the clever event-driven path.',
    minutes: 14,
  },
  {
    id: 'scn-rag-pdf-tables-broken',
    area: 'rag',
    symptom:
      'Questions over scanned financial reports return numbers from the wrong row. The retrieved chunk, printed as plain text, reads "Revenue Q1 Q2 Q3 1,204 1,880 2,010 Costs 900 1,100 1,290" with no structure at all, and the model matched the first number it saw to the metric asked about.',
    firstQuestions: [
      'What does the extracted text look like for a failing page, before chunking? Print it. Most PDF debugging ends the moment somebody actually reads the extracted text.',
      'Are these born-digital PDFs or scans that went through OCR? Different extraction stacks, different failure modes, different fixes.',
      'What fraction of questions depend on tables? If tables carry the numbers users ask about, this is the core problem, not an edge case.',
    ],
    causes: [
      {
        hypothesis:
          'The extractor emits text in reading order and drops table geometry, so column-to-header association is lost before chunking ever runs.',
        check:
          'Extract one known table and compare against the rendered PDF. Loss of row and column alignment is visible immediately.',
      },
      {
        hypothesis:
          'Fixed-size chunking splits a table across chunks, orphaning rows from their header row.',
        check:
          'Find the chunk boundaries inside a table page. A chunk that starts mid-table with no header is the smoking gun.',
      },
      {
        hypothesis:
          'OCR is misreading figures - a 3 as an 8, or losing a decimal point - so the data was wrong before any of this.',
        check:
          'Spot-check 20 OCR-extracted numbers against the source images by hand. If OCR is wrong, no downstream fix helps.',
      },
    ],
    fix:
      'Route table pages through a layout-aware path: detect tables during ingestion, extract them as structured rows, and serialise each table to Markdown or HTML so headers stay attached to values. Make each table an atomic chunk that is never split, or repeat the header row in every piece when a table is too large. Attach a short natural-language summary of the table to the chunk so dense retrieval has prose to match against, since a grid of numbers embeds poorly. For pure numeric lookups, consider extracting tables into a real relational table and answering those questions with a query rather than with retrieval at all.',
    tradeoff:
      'Layout-aware extraction is slower and more expensive per page and adds a component that will misclassify some tables. Atomic table chunks can be very large and eat context budget. Extracting to a relational table means maintaining a schema and a second retrieval path, which is real work worth taking on only if numeric questions are the common case.',
    seniorSignal:
      'They print the extracted text first instead of theorising about chunk size, and they raise the possibility that a number in a table is a database question rather than a retrieval question.',
    minutes: 15,
  },
  {
    id: 'scn-rag-access-control-leak',
    area: 'rag',
    symptom:
      'During a demo, a contractor asks about headcount plans and gets a summary quoting a document their SSO account cannot open. The citation link 404s for them, which is how the leak was noticed - the content had already been read aloud.',
    firstQuestions: [
      'Scope the incident first: which users, which documents, over what period? Pull the retrieval logs and answer that before designing anything, because this may be a disclosure that has to be reported.',
      'Where is authorisation enforced today - at ingest, at retrieval, or only on the citation link? A permissions model that lives in the UI is the whole bug.',
      'Is the source permission model per-document, per-folder or group-based, and does the index carry any of it?',
    ],
    causes: [
      {
        hypothesis:
          'The index has no per-document ACL at all; retrieval is global and only the citation hyperlink is authorised.',
        check:
          'Inspect the chunk schema for an allowedGroups or ownerId field. Absence ends the investigation.',
      },
      {
        hypothesis:
          'ACLs were captured at ingest and never refreshed, so a document made confidential after ingestion is still marked open.',
        check:
          'Pick ten documents whose permissions changed recently at source and compare against the index copy. Any drift confirms it.',
      },
      {
        hypothesis:
          'The filter exists but runs after top-k rather than before, so the model still saw the chunk and only the displayed citation was removed.',
        check:
          'Read the query path, and check whether a filtered query ever returns fewer than k results. Post-filtering shows up as short result lists.',
      },
    ],
    fix:
      'Enforce authorisation inside the vector query as a mandatory pre-filter on an allowedPrincipals field, so an unauthorised chunk is never a candidate and never reaches the prompt - not a post-filter, not a UI concern. Sync ACLs on the same change feed as content and treat a permission change as a re-index event. Deny by default: a chunk with no ACL metadata is not retrievable. Then write a test that a low-privilege principal cannot retrieve a high-privilege chunk and run it in CI, so this cannot regress silently.',
    tradeoff:
      'Pre-filtering by principal costs recall and latency for users with narrow permissions, and highly selective filters push the ANN index toward brute-force scans, which is the scaling problem all over again. Deny by default hides documents whose ACL sync is lagging, so users report missing content - the correct direction to fail, but not free.',
    seniorSignal:
      'They treat this as a security incident with a blast-radius question before treating it as an engineering task, and they insist the filter runs inside the query rather than over the results.',
    minutes: 16,
  },
  {
    id: 'scn-rag-chunk-boundary-split',
    area: 'rag',
    symptom:
      'For "how long is the notice period for interns?", the retrieved chunk ends with "...for interns the notice period is" and the next sentence lives in a chunk that was never retrieved. The model finished the sentence itself, plausibly and wrongly.',
    firstQuestions: [
      'Read the retrieved chunks for five failing queries end to end. Are they ending mid-sentence? This takes two minutes and settles the hypothesis.',
      'What is the current chunking strategy - fixed token count, character count, or structure-aware - and what overlap, if any?',
      'Does the adjacent chunk score just outside k, or far down? Just outside means a k or overlap problem; far down means the chunk is unretrievable on its own merits.',
    ],
    causes: [
      {
        hypothesis:
          'Fixed-size chunking with zero overlap cuts through sentences and facts.',
        check:
          'Sample 50 chunk boundaries and count how many fall mid-sentence. A high rate is the answer.',
      },
      {
        hypothesis:
          'The continuation chunk is retrievable but scores poorly because, stripped of its heading, it has no topical anchor - it just says "two weeks".',
        check:
          'Embed the continuation chunk and score it against the query directly. Low similarity for a chunk containing the literal answer confirms the anchor is missing.',
      },
      {
        hypothesis:
          'Chunk size is simply too small for the document type, so single facts routinely straddle boundaries.',
        check:
          'Measure the distribution of distance between a question and its answer in the source documents and compare against the chunk size.',
      },
    ],
    fix:
      'Switch to structure-aware chunking that splits on headings and paragraph boundaries rather than token counts, with a modest overlap so a fact that straddles a boundary appears whole in at least one chunk. Prepend document title and section heading to every chunk so continuation chunks keep a topical anchor. At query time, expand each retrieved chunk with its immediate neighbours before generation - retrieve small for precision, read large for completeness.',
    tradeoff:
      'Overlap inflates the index by the overlap fraction - storage, embedding cost, and more near-duplicates in top-k, which pushes you back toward MMR. Neighbour expansion increases prompt tokens on every query, not only the ones that needed it. Structure-aware chunking depends on documents actually having structure and will fall back to fixed-size on the ones that do not.',
    seniorSignal:
      'They separate the retrieval unit from the reading unit - retrieve small, expand for generation - instead of arguing about a single optimal chunk size.',
    minutes: 12,
  },
  {
    id: 'scn-rag-embedding-model-swap-regression',
    area: 'rag',
    symptom:
      'The team upgraded to a newer embedding model and re-embedded queries the same day. Answer quality dropped sharply overnight; retrieved chunks are topically adjacent but rarely the right document. Nobody re-embedded the corpus.',
    firstQuestions: [
      'Were queries and documents embedded with the same model and the same version? This is the first question and it usually ends the conversation.',
      'Was any part of the corpus re-embedded, or is the index mixed - some vectors from the old model, some from the new?',
      'Do the two models even produce the same number of dimensions? If the index accepted the writes, either dimensions match by coincidence or something silently normalised them.',
    ],
    causes: [
      {
        hypothesis:
          'Query and document embeddings now come from different models, so the two live in incomparable vector spaces and similarity is close to meaningless.',
        check:
          'Embed one document chunk with both models and compare each against the query vector. If old-model document versus new-model query scores near random while old versus old is high, this is it.',
      },
      {
        hypothesis:
          'The corpus is partially migrated, so newly ingested documents are systematically favoured or disfavoured against older ones.',
        check:
          'Group index rows by embedding model version. Two versions coexisting confirms a partial migration.',
      },
      {
        hypothesis:
          'The new model expects an instruction prefix distinguishing queries from passages and the code does not apply it - some models are quite sensitive to this.',
        check:
          'Read the model card and re-run retrieval with and without the documented prefixes on a fixed query set.',
      },
    ],
    fix:
      'Roll back to the old embedding model for queries immediately - it is a config change and restores service in minutes - then do the migration properly: build a second index with the new model, re-embed the entire corpus into it, evaluate both on the same golden set of query-to-document pairs, and cut over only if recall@10 improves. Store embedding model id and version on every vector, and make the retrieval layer refuse to query an index whose model id does not match the query encoder.',
    tradeoff:
      'Full re-embedding costs real money and hours on a large corpus, and running two indices during migration doubles storage and ingest work for that window. Pinning model id in code makes upgrades deliberate projects, which is slower - and correct, since silent embedding changes are among the highest-blast-radius mistakes in a RAG system.',
    seniorSignal:
      'They know embeddings from different models are not comparable and reach for rollback before investigation, because the cheapest diagnosis here is restoring the known-good state.',
    minutes: 12,
  },
  {
    id: 'scn-rag-no-answer-fabricated',
    area: 'rag',
    symptom:
      'A user asks about a policy the company has never written down. Retrieval returns the five least-irrelevant chunks it can find, all scoring around 0.62 against a typical good-match score of 0.85, and the model writes a confident three-paragraph policy that does not exist.',
    firstQuestions: [
      'What is the score distribution for known-good versus known-unanswerable queries? Build two small sets and plot them. If they separate, a threshold is available; if they overlap completely, the scores cannot carry this decision.',
      'How often does real traffic ask something the corpus cannot answer? Sample and label - if it is 20% of queries, this is a primary product behaviour, not an edge case.',
      'What does the product want on no-answer: refuse, hand off to a human, or offer the closest related documents?',
    ],
    causes: [
      {
        hypothesis:
          'The pipeline always returns exactly k chunks regardless of score, so "nothing relevant" is indistinguishable from "five good hits" by the time the prompt is built.',
        check:
          'Read the retriever: is there any score floor at all? A hard top-k with no threshold is the mechanism.',
      },
      {
        hypothesis:
          'The prompt tells the model to answer using the context and never authorises refusal, so refusing is off-policy.',
        check:
          'Read the system prompt for an explicit abstention clause. Add one and re-run the unanswerable set to see how much fabrication disappears.',
      },
      {
        hypothesis:
          'Raw cosine similarity is not calibrated across query types - short queries score lower in general - so a single global threshold would misfire even if one existed.',
        check:
          'Plot score against query length on known-good queries. A strong relationship means the gate needs a reranker score, not raw cosine.',
      },
    ],
    fix:
      'Gate on a calibrated relevance score rather than raw cosine: send top-k through a cross-encoder reranker and threshold on its score, tuned on labelled answerable and unanswerable queries to a chosen operating point. Below the threshold, do not call the generator at all - return an explicit "I have no document covering this", the nearest related documents, and a route to a human. Above the threshold, authorise abstention explicitly in the prompt so the model can still refuse when the retrieved text does not address the question.',
    tradeoff:
      'Any threshold trades false refusals against fabrications and you must pick the point deliberately - for an internal helpdesk, refusing 5% of answerable questions is cheap; for a consumer product it reads as broken. The reranker adds latency to every query, including the ones that would have been fine.',
    seniorSignal:
      'They treat "no answer" as a first-class output with an operating point they can move, rather than as an error state, and they refuse to gate on uncalibrated cosine scores.',
    minutes: 14,
  },
  {
    id: 'scn-rag-exact-identifier-miss',
    area: 'rag',
    symptom:
      'Users paste error codes and part numbers - "ERR_5521", "SKU 91-A44-X" - and get thematically related documents rather than the one page containing that exact string. A control-F over the corpus finds it instantly.',
    firstQuestions: [
      'Does exact-match search find the document? If yes, the content is present and this is purely a retrieval-method problem.',
      'What share of queries contain an identifier-like token? Regex the query logs for code-shaped strings; that number decides how much this is worth.',
      'How is the identifier tokenised by the embedding model - is it shredded into meaningless subword pieces?',
    ],
    causes: [
      {
        hypothesis:
          'Dense embeddings compress away rare literal tokens by design; they encode meaning, and an identifier has almost none.',
        check:
          'Compare similarity for the exact identifier query against the gold chunk versus a paraphrase of the surrounding prose. If the prose paraphrase wins, the identifier is contributing nothing.',
      },
      {
        hypothesis:
          'The tokeniser splits the identifier into fragments that also appear in unrelated documents, actively pulling retrieval toward noise.',
        check:
          'Tokenise the identifier and look at the pieces. Fragments like "44" and "X" explain the neighbours you are getting.',
      },
      {
        hypothesis:
          'The identifier appears only in a table or appendix that chunking left as an unanchored fragment.',
        check:
          'Locate the chunk containing the identifier and read it. A bare "ERR_5521 | 91-A44-X | retry" row is retrievable by nothing except lexical search.',
      },
    ],
    fix:
      'Detect identifier-shaped tokens in the query with a regex, and when present run a lexical or keyword-filtered search first, boosting exact matches to the top of the fused result set - reciprocal rank fusion over BM25 and dense handles the general case, and a hard exact-match boost handles this one. Index identifiers as a separate metadata field so they can be filtered on rather than only searched. Keep the dense path for the surrounding explanation, which is what the user actually wants once the right page is found.',
    tradeoff:
      'Regex identifier detection has false positives - version numbers, dates, phone numbers - which over-trigger the lexical path and occasionally rank a passing mention above a real explanation. Maintaining a keyword index alongside the vector index is a second system to keep in sync, and the identifier metadata field is only as good as the extraction that populates it.',
    seniorSignal:
      'They route by query type instead of trying to make one retriever handle both semantic and literal lookups, and they can say in one sentence why dense retrieval is structurally bad at exact tokens.',
    minutes: 12,
  },
  // ---------------------------------------------------------------- Agent failures
  {
    id: 'scn-agent-infinite-loop',
    area: 'agent',
    symptom:
      'A support agent that is meant to resolve a ticket in four or five steps sometimes runs to the 40-step cap. Reading the trace, steps 12 through 40 are the same pair: search_orders with the same arguments, then a sentence saying "let me check the order again". The tool returns the same empty list every time and the agent never treats that as an answer.',
    firstQuestions: [
      'What exactly does the tool return in the looping case? Read the raw tool result, not the summary. An empty array, a 200 with an error string in the body, and a null are three different bugs and only one of them is the model\'s fault.',
      'Does the previous tool result stay in context, or is it being summarised away? If step 30 cannot see that step 12 already tried this, repeating is the rational move.',
      'Is the loop tight - identical arguments - or drifting slightly each time? Identical arguments means the agent has no memory of the attempt; drifting means it is genuinely searching and just has no stopping rule.',
      'What fraction of sessions hit the cap, and are they concentrated in one intent or one tenant?',
    ],
    causes: [
      {
        hypothesis:
          'The tool signals failure in a way the model does not read as failure - an empty list, or a 200 response whose body says "no records found for this customer".',
        check:
          'Diff the tool result bytes between a looping session and a healthy one. If the looping case is `{"results": []}` with no explanatory field, the model has nothing to conclude from.',
      },
      {
        hypothesis:
          'History compaction drops prior tool calls once the context crosses a threshold, so the agent loses the record of what it already tried and re-derives the same first step.',
        check:
          'Log the assembled message list at each step and check whether the step-12 tool call is still present at step 25. Correlate loop onset with the step at which compaction first fires.',
      },
      {
        hypothesis:
          'There is no terminal state the agent can reach: the prompt tells it to resolve the ticket and never authorises "this cannot be resolved with the tools I have", so looping is the only behaviour consistent with its instructions.',
        check:
          'Add an explicit escalate_to_human tool and re-run the failing sessions. If loops collapse into a single escalation, the missing exit was the cause.',
      },
    ],
    fix:
      'Three layers, cheapest first. Make failure legible: every tool returns a structured status with a human-readable reason, so "no orders found for customer 8812 - the account may be under a different email" is what lands in context rather than an empty bracket. Give the agent an exit: an escalate tool, and a system prompt that names it as a legitimate successful outcome rather than a defeat. Then add a loop guard outside the model - hash the tool name plus normalised arguments, and on the second identical repeat inject a message saying this call has already been made with this result, on the third force escalation. Cap by cost and wall-clock as well as by step count.',
    tradeoff:
      'The loop guard blocks legitimate retries - a genuinely flaky API that succeeds on attempt three now fails, so the guard has to exempt known-transient error classes, which is a list someone has to maintain. Forced escalation moves load onto the human queue, and if the underlying tools are actually inadequate you will see that as a support-cost spike rather than as an agent metric.',
    seniorSignal:
      'They fix the tool contract before they touch the prompt, because a loop is usually the model behaving reasonably given an unreadable failure signal - and they add the guard outside the model rather than asking the prompt politely not to repeat itself.',
    minutes: 15,
  },
  {
    id: 'scn-agent-token-burn',
    area: 'agent',
    symptom:
      'Average tokens per agent session is 180k against a design estimate of 25k. The distribution is not fat-tailed - the median session is 140k. Tracing one, step 1 sends 4k tokens and step 14 sends 190k, because every step resends the full transcript including four raw API responses of 30k tokens each.',
    firstQuestions: [
      'Plot input tokens per step for a single session. Linear growth means transcript accumulation; a step change means one specific tool result is enormous.',
      'What is the largest single item in context, and does the agent need all of it? Measure the byte size of each tool result. A 30k-token JSON blob where the agent uses three fields is the whole bug.',
      'Is prompt caching enabled and actually hitting? Check the cache-read token counts in the API response. Resending a stable prefix is cheap; resending a mutating one is not.',
      'How many steps does a successful session need versus what it takes? If the median is 14 steps for a 4-step job, the burn is a planning problem, not a context problem.',
    ],
    causes: [
      {
        hypothesis:
          'Raw tool output goes straight into context - full API payloads, entire file contents, unpaginated search results - and is then resent on every subsequent step.',
        check:
          'Instrument tool results by token count and rank them. Then check what the agent actually cited from the largest ones in the final answer.',
      },
      {
        hypothesis:
          'The system prompt is huge - dozens of tool schemas plus long few-shot examples - and it is being resent uncached because something mutable, a timestamp or the user name, sits near the top of it.',
        check:
          'Count system-prompt tokens and multiply by step count; compare against total. Inspect the cache-read versus cache-write token split for a session to see whether the prefix is stable.',
      },
      {
        hypothesis:
          'The agent is taking far more steps than the task needs because it re-reads state it already has, and each redundant step pays for the entire accumulated transcript.',
        check:
          'Count distinct tool calls versus total tool calls per session. A ratio near 0.4 means most calls are re-reads.',
      },
    ],
    fix:
      'Attack the largest term first, which is almost always tool output. Give each tool a projection - return the fields the agent needs, paginate, and put the full payload behind a reference id the agent can fetch a slice of if it truly needs more. Then make the prefix cacheable: move everything static, tool schemas and instructions, above everything dynamic, and let the provider cache do the rest. Finally compact old turns - keep the last two tool results verbatim and replace earlier ones with a one-line record of what was called and what it returned, preserving the fact of the call so the loop guard still works.',
    tradeoff:
      'Projected tool output means the agent occasionally cannot see a field it needed and has to make a second call, which costs a round trip - and choosing the projection is a product decision you will get wrong for some intents. Compaction is lossy by construction: a summarised step-3 result will sometimes drop the detail that step 12 needed, and that failure mode is subtle because the agent proceeds confidently without it.',
    seniorSignal:
      'They measure where the tokens are before touching anything and go after the biggest term, rather than reaching for a smaller model - and they know that a stable cacheable prefix is often a bigger win than any prompt edit.',
    minutes: 15,
  },
  {
    id: 'scn-agent-wrong-tool-selection',
    area: 'agent',
    symptom:
      'Asked "how much did we spend on AWS last month", the agent calls search_documents and returns a paragraph from a two-year-old architecture doc, when there is a query_billing tool that would answer it exactly. It picks search_documents for roughly a third of all questions regardless of what they are about.',
    firstQuestions: [
      'What do the tool descriptions actually say? Read them as the model sees them. A description like "search company documents for information" reads as a universal fallback for anything.',
      'Is the failure concentrated in one tool being over-selected, or is selection diffuse? Build a confusion matrix of intended tool against chosen tool over a labelled sample.',
      'How many tools are in the schema? Selection accuracy tends to fall off a cliff somewhere past a dozen or two, and the shape of the fall tells you whether it is crowding or description quality.',
      'Does the model pick correctly when given only the two candidate tools? That isolates "cannot distinguish these two" from "drowning in options".',
    ],
    causes: [
      {
        hypothesis:
          'Tool descriptions overlap semantically: two or three of them are plausible for the same question and nothing in the text says which wins.',
        check:
          'Embed the tool descriptions and the failing queries and look at the similarity matrix. Descriptions that sit close together are ones the model cannot separate either.',
      },
      {
        hypothesis:
          'One tool is described in generic terms that make it a catch-all, so it is a defensible choice for everything and the model defaults to it under uncertainty.',
        check:
          'Count selections per tool against the true intent distribution. A tool chosen far more often than its intent warrants is a catch-all.',
      },
      {
        hypothesis:
          'Too many tools are exposed at once and the correct one is buried in the middle of a long schema list, where attention is weakest.',
        check:
          'Re-run failures with a filtered tool list of five candidates. A large accuracy jump means crowding, and the fix is routing, not wording.',
      },
    ],
    fix:
      'Rewrite descriptions as contracts rather than labels: what the tool is for, what it is explicitly not for, when to prefer a sibling, and one concrete example query. "Use query_billing for any question about spend, invoices or cost by service. Do not use search_documents for cost questions - it searches prose, not ledgers." Then add a routing layer: classify the request into a small tool group with a cheap model or an embedding match, and expose only that group\'s schemas. Log every selection with the query so the confusion matrix stays live.',
    tradeoff:
      'Routing adds a hop and a new failure mode - the router now mis-routes, and that error is harder to see because the agent never had the right tool to choose. Negative instructions in descriptions inflate the system prompt, which costs tokens on every single step. And hand-written contracts drift as tools change unless the description lives next to the implementation and is reviewed with it.',
    seniorSignal:
      'They treat tool descriptions as the model\'s only documentation and rewrite them with anti-examples, instead of adding "be careful to choose the right tool" to the system prompt and hoping.',
    minutes: 14,
  },
  {
    id: 'scn-agent-right-tool-wrong-parameters',
    area: 'agent',
    symptom:
      'The agent correctly picks query_billing but passes `{"start": "last month", "end": "now"}` against a schema that wants ISO dates, or passes `region: "US"` where the enum is `us-east-1`. The API returns 400, the agent apologises, retries with a different malformed value, and eventually gives up. Selection accuracy is 94%; argument validity is 71%.',
    firstQuestions: [
      'Which parameters fail, and how? Group the 400s by field name and error type. Date parsing, enum mismatch and missing required field are three different fixes.',
      'Does the schema express the constraint at all? Check whether the failing field has a format, an enum, a pattern and a description, or is just typed `string`.',
      'What does the agent see when it fails? If the API returns a bare "400 Bad Request", the agent has no way to correct itself and the retry is a guess.',
      'Is the information even available to the agent? "Last month" cannot be resolved to dates without knowing today\'s date - check whether the current date is in the system prompt.',
    ],
    causes: [
      {
        hypothesis:
          'The JSON schema under-specifies: a date field typed as plain string with no format or example, so any string is schema-valid and only the backend rejects it.',
        check:
          'Validate the failing arguments against the declared schema. If they pass schema validation and fail at the API, the schema is the gap.',
      },
      {
        hypothesis:
          'The agent lacks the context needed to compute the value - no current date, no tenant timezone, no list of valid region codes anywhere in the prompt.',
        check:
          'Inject today\'s date and the enum values into the system prompt and re-run the failing set. A sharp drop in 400s confirms it.',
      },
      {
        hypothesis:
          'Error responses are opaque, so the retry is uninformed and the agent flails through plausible-looking variants.',
        check:
          'Read the exact error body the agent receives. "400" versus "start must be ISO-8601 date, got \'last month\'" produce completely different retry behaviour.',
      },
    ],
    fix:
      'Push the constraint into the schema where the model can see it: enums as real enums, dates with a format and a description that gives an example, required fields marked required, and sane defaults so the model does not have to invent optional values. Add a validation layer between model and API that checks arguments against the schema and, on failure, returns a structured message naming the field, the received value, the expected shape and one valid example - then allow exactly one repair attempt before escalating. For relative-time arguments, resolve them outside the model: accept a `period: "last_month"` enum and compute the dates server-side rather than asking a language model to do calendar arithmetic.',
    tradeoff:
      'Rich schemas cost tokens on every step, and a long enum of 200 region codes is worse than a lookup tool. The repair loop doubles latency on the failing tail, and capping it at one attempt means some recoverable calls now fail. Moving relative dates server-side reduces flexibility - a user asking for "the first three weeks of March" no longer has a path.',
    seniorSignal:
      'They stop asking the model to produce values the system could compute, and they make the error message a teaching signal rather than a status code - a weak answer just adds "always use ISO dates" to the prompt.',
    minutes: 13,
  },
  {
    id: 'scn-agent-irreversible-action',
    area: 'agent',
    symptom:
      'A billing agent issued the same $4,200 refund three times in ninety seconds. The trace shows three identical calls to issue_refund; the first succeeded but the response timed out at the gateway, so the agent saw a timeout, concluded it had failed, and tried again. Twice.',
    firstQuestions: [
      'Did the first call actually succeed downstream? Check the payment provider, not your own logs. This decides whether you have a retry bug or a genuine triple-execution.',
      'Is issue_refund idempotent? If the same idempotency key is not being sent, the API cannot protect you and no prompt change will.',
      'Who or what retried - the agent, an HTTP client with automatic retries, or a queue redelivery? Three identical calls in the model trace and three at the provider are different stories.',
      'What is the blast radius of the other write tools? Enumerate every tool that mutates state and note which are reversible.',
    ],
    causes: [
      {
        hypothesis:
          'No idempotency key: the refund endpoint treats each request as new, so any retry at any layer duplicates the effect.',
        check:
          'Inspect the outbound request headers and body for an idempotency key. Send the same key twice against staging and see whether you get one refund or two.',
      },
      {
        hypothesis:
          'A transport-level retry - the HTTP client, a load balancer, or a workflow redelivery - is firing beneath the agent, so the model is not the retrier at all.',
        check:
          'Count calls at the agent layer and at the provider. If the model made one and the provider saw three, stop reading the trace and read the client config.',
      },
      {
        hypothesis:
          'Timeout is being surfaced to the agent as an unambiguous failure when it is in fact an unknown outcome, and the agent is instructed to retry on failure.',
        check:
          'Read the tool result string for the timed-out call. If it says "error: request failed", the agent is behaving correctly on wrong information.',
      },
    ],
    fix:
      'Irreversible actions get a different pipeline from reads. Generate an idempotency key deterministically from the intent - customer, invoice, amount, session - and send it on every write, so a duplicate is a no-op at the provider regardless of how many layers retry. Surface timeouts as `unknown`, never as `failed`, and make the only legal response to unknown a status check rather than a retry. Put an approval gate on writes above a threshold: the agent proposes the refund, a human or a rules engine confirms, and the tool executes. Log every write with its key to an append-only ledger so a duplicate is detectable within seconds rather than at month-end reconciliation.',
    tradeoff:
      'Approval gates destroy the automation benefit for exactly the cases where it mattered most, so the threshold has to be set from the loss distribution rather than from nervousness - and every gate is a queue with a latency of its own. Deterministic idempotency keys mean a genuinely intended second identical refund is silently swallowed, which is its own support ticket. Status-check-on-unknown adds a round trip to every timeout.',
    seniorSignal:
      'They design the system so the failure is impossible rather than unlikely - idempotency at the API boundary beats any amount of prompt discipline - and they distinguish "failed" from "unknown", which is the actual bug here.',
    minutes: 16,
  },
  {
    id: 'scn-agent-conflicting-tool-outputs',
    area: 'agent',
    symptom:
      'Asked for a customer\'s current plan, the CRM tool says Enterprise and the billing tool says Pro. The agent silently picks one - not consistently the same one - and states it as fact with no hedge. Roughly 4% of account questions hit some version of this.',
    firstQuestions: [
      'Which source is authoritative for this field? Not "which is right this time" - which system is the system of record. If nobody can answer that in one sentence, the bug is organisational and the agent is just where it became visible.',
      'Is the disagreement real or a timing artefact? Compare the update timestamps on both records. A CRM that lags billing by an hour disagrees constantly and correctly.',
      'How often do they disagree overall? Run a batch reconciliation across all customers. 4% of questions might be 0.2% of accounts, or it might be 30%.',
      'Does the agent even see both values, or does one tool result get truncated away before the answer is composed?',
    ],
    causes: [
      {
        hypothesis:
          'There is no declared system of record, so both tools are presented as equally authoritative and the model has no principled basis to choose.',
        check:
          'Read the tool descriptions. If neither says "this is authoritative for plan tier", the model is guessing by design.',
      },
      {
        hypothesis:
          'Replication lag: one store is eventually consistent and the disagreement window is minutes to hours after any plan change.',
        check:
          'Correlate disagreements with recent plan-change events. If nearly all conflicts are within N hours of a change, it is lag, not corruption.',
      },
      {
        hypothesis:
          'The two fields are not the same field - "plan" in the CRM is the contracted tier and "plan" in billing is what is currently being invoiced, and they legitimately differ during a trial or a downgrade.',
        check:
          'Read both schemas and ask the owning team what the field means. Pull ten conflicting accounts and see whether the difference has a consistent business explanation.',
      },
    ],
    fix:
      'Resolve precedence outside the model. Declare the system of record per field in a small resolution table, and have a single get_account_plan tool that reads both, applies precedence, and returns one value plus a `conflict: true` flag with both raw values and their timestamps when they disagree. The agent then has one input and an explicit signal to hedge on. When conflict is set, the prompt requires the answer to state the authoritative value, note that another system disagrees, and offer to escalate - and the flag is emitted as a metric so the data-quality problem gets an owner instead of being absorbed by the agent.',
    tradeoff:
      'Precedence rules are business logic that will be wrong for some field the day someone changes a process, and they now live in a place the data teams do not look. Surfacing conflicts to users erodes confidence even when the answer given is correct, so the hedging language needs care. And the merged tool hides the raw sources, which makes debugging harder unless both values stay in the trace.',
    seniorSignal:
      'They refuse to let the model arbitrate a data-governance question, and they make the conflict a measured event with an owner rather than something the agent papers over.',
    minutes: 14,
  },
  {
    id: 'scn-agent-budget-overrun',
    area: 'agent',
    symptom:
      'Per-session cost is capped at $0.50 in the design doc. Last month the mean was $0.38 and finance is happy, but 0.4% of sessions cost between $9 and $40 each, and those account for 31% of the bill. Every expensive session is a research-style request that fanned out into dozens of sub-searches.',
    firstQuestions: [
      'What is the actual cost distribution, not the mean? Plot p50, p95, p99 and max. A mean inside budget with a heavy tail is a completely different problem from uniform overspend.',
      'Is there a hard stop anywhere in the code, or only a target in a document? Grep for the enforcement. Very often the answer is that nothing enforces it.',
      'What do the expensive sessions have in common - intent, tenant, input length, a specific tool that fans out?',
      'Do expensive sessions produce better outcomes? If the $40 sessions resolve and the $0.30 ones do not, the budget is wrong, not the agent.',
    ],
    causes: [
      {
        hypothesis:
          'The budget exists as a design target and is enforced nowhere, so there is simply no mechanism that could have stopped it.',
        check:
          'Search the codebase for any cost accumulator or check. Absence of a counter is the finding.',
      },
      {
        hypothesis:
          'One tool fans out - a search that spawns a sub-agent per result, or a document reader that recurses into links - so cost is superlinear in a way the step cap does not bound.',
        check:
          'Count LLM calls per session and group by which tool preceded the fan-out. A session with 200 calls behind a 40-step cap means something nested.',
      },
      {
        hypothesis:
          'Retries multiply cost invisibly: each failed structured-output parse or tool error triggers a full re-call including the whole transcript.',
        check:
          'Count LLM calls against agent steps. A ratio well above one means retries, and the difference is pure waste.',
      },
    ],
    fix:
      'Enforce the budget in the loop, not in the doc. Accumulate cost from each API response\'s token counts into a session ledger; at 70% inject a message telling the agent to converge on an answer with what it has, at 100% stop and return the best available answer plus an escalation. Bound nesting explicitly - sub-agents inherit the parent\'s remaining budget rather than getting a fresh one, which is the usual bug. Tier the caps by request class so a research request legitimately gets $3 and a status lookup gets $0.05, and price the tail into the product rather than pretending it away.',
    tradeoff:
      'A hard stop turns an expensive success into a cheap failure, which users experience as the assistant giving up on hard questions - the exact questions where it was most valuable. The soft warning at 70% consumes context and sometimes causes premature convergence on questions that were nearly solved. Tiered budgets need a classifier, which is another thing that can be wrong.',
    seniorSignal:
      'They look at the distribution rather than the mean and find the fan-out, and they make sub-agents inherit the remaining budget instead of adding another top-level cap that the nesting already escapes.',
    minutes: 15,
  },
  {
    id: 'scn-agent-latency-unacceptable',
    area: 'agent',
    symptom:
      'The agent answers correctly but takes 45 seconds. Users abandon at 12. The trace shows nine sequential steps; six are tool calls that do not depend on each other, and each waits for the previous one to finish before starting.',
    firstQuestions: [
      'Break the 45 seconds down: how much is model inference, how much is tool execution, how much is your own orchestration overhead? Optimising the wrong term is the default mistake.',
      'Which tool calls actually depend on each other? Draw the dependency graph for a real session. Six independent calls run sequentially is the finding, and it is usually the whole answer.',
      'Is anything streamed to the user, or do they stare at a spinner for the full duration? Perceived latency and measured latency are different problems with different fixes.',
      'Do all nine steps contribute to the final answer? Count how many tool results are actually cited.',
    ],
    causes: [
      {
        hypothesis:
          'The agent loop is strictly sequential by construction - one tool call per turn - even when the model would happily request several at once.',
        check:
          'Check whether the loop handles multiple tool calls in a single assistant message, or takes only the first. Many hand-rolled loops silently drop the rest.',
      },
      {
        hypothesis:
          'One slow tool dominates: a report query or an external API with a multi-second p95 that is called on almost every session.',
        check:
          'Rank tools by total contributed latency, which is p95 times call frequency, not p95 alone.',
      },
      {
        hypothesis:
          'The model is doing exploratory steps that a cheaper deterministic path could have skipped - resolving a customer id by three separate lookups, for instance.',
        check:
          'Read ten traces and mark each step as necessary or exploratory. A high exploratory share means the tool set is too granular.',
      },
    ],
    fix:
      'Parallelise first, because it is the largest and cheapest win: allow the model to emit multiple tool calls per turn and execute them concurrently, which typically collapses six sequential calls into one wait of the slowest. Then compress the graph - merge chatty granular tools into composite ones so "resolve customer, fetch plan, fetch invoices" is a single call. Cache tool results that are stable within a session. Finally, stream: show the plan and each tool as it completes, so the user sees motion from second one. If it is still too slow for the interactive path, split the product - answer immediately from a fast path and deliver the deep result asynchronously.',
    tradeoff:
      'Parallel tool execution breaks any implicit ordering the agent was relying on and makes write tools genuinely dangerous, so writes must stay serialised. Composite tools reduce flexibility and grow a combinatorial surface of near-duplicate endpoints. Streaming intermediate steps exposes the agent\'s reasoning, including its wrong turns, which some users find alarming and which leaks a little about your internals.',
    seniorSignal:
      'They fix the dependency structure before reaching for a faster model, and they separate perceived from actual latency - a weak answer swaps to a smaller model and loses the accuracy that made the agent worth building.',
    minutes: 14,
  },
  {
    id: 'scn-agent-silent-tool-failure',
    area: 'agent',
    symptom:
      'The agent confidently reports "you have no open invoices" for customers who plainly do. The invoice tool is returning HTTP 200 with `{"data": null, "error": "auth token expired"}`, and the wrapper turns any 200 into a success, so `null` reaches the model as an empty result and the model reports it faithfully.',
    firstQuestions: [
      'What does the tool wrapper do with a 200 that contains an error field? Read the code path, not the API docs.',
      'How often is this happening? Count 200-with-error responses over the last week - this class of failure produces no error metric, so it may have been running for months.',
      'Is the agent given any way to distinguish "no data" from "could not fetch"? Look at the exact string it receives in each case.',
      'When did the token start expiring - is this a new credential-rotation behaviour or has it always failed under some condition?',
    ],
    causes: [
      {
        hypothesis:
          'The tool adapter treats HTTP status as the only success signal and never inspects the response envelope.',
        check:
          'Read the adapter. Replay a captured error-bearing 200 through it and observe what the model receives.',
      },
      {
        hypothesis:
          'Credentials expire mid-session and there is no refresh, so early calls succeed and later ones return the auth error - which explains why it looks intermittent.',
        check:
          'Correlate failures with session elapsed time and token issue time. A cliff at a fixed age is conclusive.',
      },
      {
        hypothesis:
          'Empty and error are conflated at the schema level - the tool\'s contract has no way to express "I could not tell you", so even a correct adapter would have nothing to say.',
        check:
          'Read the tool\'s declared return type. If it is just a list, the failure was unrepresentable from the start.',
      },
    ],
    fix:
      'Make unavailability representable and then loud. The tool return type becomes a tagged union - `ok` with data, `empty` with a reason, `error` with a class and message - and the adapter maps a 200-with-error to `error`, never to `empty`. The system prompt states that on `error` the agent must say the system could not be reached and must not infer absence from it. Add a canary: a synthetic request per tool per minute whose expected non-empty result alerts if it comes back empty, which catches this class without waiting for a user to notice. Fix the credential refresh, and fail closed on auth errors rather than degrading to a plausible-looking answer.',
    tradeoff:
      'Failing closed means outages become visible to users as "I cannot check that right now" instead of being silently absorbed, which raises the apparent error rate even though the true error rate just became honest. Canaries cost quota and add alert volume that needs tuning or it gets muted. And the tagged union is a breaking change to every tool and every prompt that reads them.',
    seniorSignal:
      'They recognise that the dangerous failure is the one that produces a confident wrong answer rather than an exception, and they add detection that does not depend on a user complaining.',
    minutes: 13,
  },
  {
    id: 'scn-agent-goal-drift-long-task',
    area: 'agent',
    symptom:
      'Given "reconcile the March invoices and flag any over $10k that lack a PO", the agent spends steps 1-6 on the reconciliation, then at step 19 is writing a summary of vendor payment terms nobody asked for. The final answer never mentions purchase orders. Short tasks are fine; anything over about 15 steps drifts.',
    firstQuestions: [
      'Is the original instruction still in the context at step 19? Dump the assembled messages and look. If compaction ate it, the agent is not drifting, it is working on a different task.',
      'Where does the last on-task step sit relative to the compaction threshold or the context limit?',
      'Is there any representation of the goal outside the transcript - a task list, a plan object, a checklist - or does the goal exist only as the first user message?',
      'Does the agent drift toward something specific, like whatever the most recent tool returned? That would point at recency dominance rather than forgetting.',
    ],
    causes: [
      {
        hypothesis:
          'History compaction summarises early turns including the original instruction, so the goal is paraphrased into vagueness and then lost.',
        check:
          'Read the compacted summary that replaced turns 1-8. If "flag anything over $10k without a PO" has become "review invoices", you have found it.',
      },
      {
        hypothesis:
          'Recency dominance: the tail of the context is full of vendor-terms data from a recent tool call, and the model follows the most salient recent material rather than the distant instruction.',
        check:
          'Re-run from the step-15 state with the original goal re-appended at the end. If it returns to task, position is the cause, not loss.',
      },
      {
        hypothesis:
          'The task has no decomposition, so there is no structure that could record which sub-goals remain and no signal that the PO check was never done.',
        check:
          'Check whether anything in the system tracks subtask completion. If the only state is the message list, nothing can notice an unfinished sub-goal.',
      },
    ],
    fix:
      'Give the goal a home outside the transcript. On receipt, decompose into an explicit checklist of subtasks held as structured state; re-render that checklist with completion status into every step\'s prompt, near the end where attention is strongest, and never let compaction touch it. Compaction then only ever summarises tool results, never instructions. Before the agent is allowed to finalise, run a completion check against the checklist - unfinished items either get worked or get named in the answer as not done. For long tasks, checkpoint the state so a session can resume rather than restarting.',
    tradeoff:
      'Re-rendering the checklist every step costs tokens that grow with task size, and the decomposition step adds a model call and a new failure mode - a bad decomposition locks in the wrong plan. Rigid checklists also suppress useful adaptation: an agent that discovers the real problem is something else now has to fight its own plan, so the plan needs an explicit revision path.',
    seniorSignal:
      'They put the goal in durable state instead of trusting the context window to hold it, and they add a completion check so an unfinished sub-goal fails loudly rather than being quietly omitted from a confident summary.',
    minutes: 15,
  },
  // CHUNK_MARKER
]
