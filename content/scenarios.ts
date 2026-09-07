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
  // CHUNK_MARKER
]
