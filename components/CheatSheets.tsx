import type { ReactNode } from 'react'
import { content } from '@/lib/content/index'

/**
 * Cheat sheets (spec 6.7b): the facts people blank on under pressure, dense and
 * scannable, on one page you can print.
 *
 * A server component with no client JavaScript at all — the whole page is text,
 * and text should not need a hydration pass to be readable.
 *
 * Where a fact already lives in `content/` it is read from there rather than
 * retyped: the complexity table walks the eighteen DSA patterns, and the worked
 * capacity numbers are the `solution.numbers` lines from the system design
 * bank. Only the arithmetic that has no home in the content — latency
 * constants, memory formulas, metric definitions, parameter counting — is
 * authored here, and every number in it was checked, because these get repeated
 * out loud in interviews.
 *
 * Print is a media query, not a second layout: the token palette is re-bound to
 * ink-on-paper, the app chrome is dropped, and each sheet starts a new page.
 */

const PRINT_CSS = `
.sheet-table { border-collapse: collapse; width: 100%; font-size: 0.8125rem; }
.sheet-table th, .sheet-table td {
  border-bottom: 1px solid var(--panel-border);
  padding: 0.35rem 0.6rem 0.35rem 0;
  text-align: left;
  vertical-align: top;
}
.sheet-table th {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
}
.sheet-num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.formula {
  background: var(--code-bg);
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
  overflow-x: auto;
  padding: 0.6rem 0.75rem;
  white-space: pre;
}

@media print {
  :root, :root[data-theme="dark"], :root[data-theme="light"] {
    --ground: #ffffff;
    --panel: #ffffff;
    --panel-solid: #ffffff;
    --panel-border: #b4b4b4;
    --panel-highlight: transparent;
    --raised: #ffffff;
    --raised-solid: #ffffff;
    --raised-border: #b4b4b4;
    --raised-shadow: none;
    --track: #dddddd;
    --code-bg: #f4f4f4;
    --text: #000000;
    --text-muted: #333333;
    --text-faint: #444444;
    --accent: #000000;
    --accent-soft: transparent;
    --accent-line: #000000;
    --accent-contrast: #ffffff;
    color-scheme: light;
  }
  @page { margin: 12mm; }
  body { background-image: none !important; font-size: 9.5pt; }
  header, nav, [data-print-hide] { display: none !important; }
  main { max-width: none !important; padding: 0 !important; }
  .panel, .raised, .card {
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    box-shadow: none !important;
  }
  .sheet {
    border-radius: 0;
    break-after: page;
    page-break-after: always;
  }
  .sheet:last-of-type { break-after: auto; page-break-after: auto; }
  .sheet h2, .sheet h3 { break-after: avoid; page-break-after: avoid; }
  .sheet-table tr, .sheet-row { break-inside: avoid; page-break-inside: avoid; }
  .sheet-table { font-size: 8.5pt; }
}
`

interface SheetMeta {
  id: string
  title: string
  blurb: string
}

const SHEETS: SheetMeta[] = [
  {
    id: 'latency',
    title: 'Latency numbers',
    blurb: 'Orders of magnitude, not exact values. The point is knowing that memory is 100 ns and a cross-continent round trip is 150 ms, so you can rule out a design out loud.',
  },
  {
    id: 'complexity',
    title: 'Complexity by DSA pattern',
    blurb: 'The bound you should be able to state before you write a line, and the sentence that justifies it.',
  },
  {
    id: 'memory',
    title: 'Model memory maths',
    blurb: 'Weights, training state, and the KV cache. Two formulas and the multiplications that follow from them.',
  },
  {
    id: 'metrics',
    title: 'Classification and ranking metrics',
    blurb: 'The formulas, and the one line about when each is the wrong choice.',
  },
  {
    id: 'params',
    title: 'Transformer parameter counting',
    blurb: 'Counting a transformer from d_model and n_layers, checked against two real models.',
  },
  {
    id: 'capacity',
    title: 'Capacity estimation',
    blurb: 'The constants, the five steps, and every number the system design bank asks you to say out loud.',
  },
]

/* --- 1. latency ----------------------------------------------------------- */

const LATENCY_CLASSIC: [string, string, string][] = [
  ['L1 cache reference', '0.5 ns', 'The unit everything else is measured against'],
  ['Branch mispredict', '5 ns', 'Ten L1 hits thrown away'],
  ['L2 cache reference', '7 ns', '14x L1'],
  ['Mutex lock / unlock', '25 ns', 'Uncontended. Contended is a scheduler story'],
  ['Main memory reference', '100 ns', '200x L1 — this is the cache-miss cliff'],
  ['Compress 1 KB with Snappy', '3 us', 'Compression is cheaper than the network almost always'],
  ['Send 1 KB over 1 Gbps', '10 us', '1 Gbps = 125 MB/s'],
  ['Read 4 KB randomly from SSD', '150 us', 'About 1 GB/s of random 4 KB reads'],
  ['Read 1 MB sequentially from memory', '250 us', 'The 2012 figure; see the amendments below'],
  ['Round trip in the same datacenter', '500 us', 'Half a millisecond. Budget your fan-out in these'],
  ['Read 1 MB sequentially from SSD', '1 ms', '4x the cost of the same read from memory'],
  ['Disk seek', '10 ms', 'Why B-trees exist'],
  ['Read 1 MB sequentially from spinning disk', '20 ms', '80x SSD'],
  ['Packet round trip CA to Netherlands and back', '150 ms', 'Physics. No cache fixes this'],
]

const LATENCY_MODERN: [string, string, string][] = [
  ['NVMe 4 KB random read', '20-100 us', 'Two to seven times better than the 2012 SSD figure'],
  ['NVMe sequential read', '3-7 GB/s', 'A single drive now outruns a 10 GbE link'],
  ['Read 1 MB sequentially from DDR4/DDR5', '3-10 us', 'Memory bandwidth is 20-100 GB/s, so 250 us is long stale'],
  ['Same-AZ round trip', '0.25-0.5 ms', 'What "same datacenter" means on a cloud today'],
  ['Cross-AZ round trip', '~1 ms', 'Synchronous cross-AZ replication costs you this per write'],
  ['us-east-1 to eu-west-1 round trip', '~75 ms', 'New York to Dublin'],
  ['us-east-1 to ap-south-1 round trip', '~185 ms', 'Virginia to Mumbai'],
  ['New TLS 1.3 connection', '2 RTT', 'TCP handshake plus TLS. 1 RTT on resumption, 0 with early data'],
  ['Redis GET, same AZ', '0.2-1 ms', 'Dominated by the network, not by Redis'],
  ['Postgres primary-key read, warm', '0.1-1 ms', 'Cold, add a disk read'],
  ['LLM time to first token', '100-500 ms', 'Prefill. Scales with prompt length'],
  ['LLM per output token', '10-40 ms', 'Decode. 25-100 tokens/s felt as "fast"'],
]

/* --- 2. complexity by pattern -------------------------------------------- */

interface PatternComplexity {
  time: string
  space: string
  why: string
}

/**
 * Keyed by pattern id so the names, order and membership come from
 * `content/dsa.ts` and only the bounds are authored here.
 */
const COMPLEXITY: Record<string, PatternComplexity> = {
  'dsap-arrays-hashing': {
    time: 'O(n)',
    space: 'O(n)',
    why: 'One pass with O(1) amortised hash lookups. The space is the map or set you built to buy that pass.',
  },
  'dsap-two-pointers': {
    time: 'O(n log n)',
    space: 'O(1)',
    why: 'O(n) for the scan, dominated by the sort when the input is not already sorted. O(1) extra only if the sort is in place.',
  },
  'dsap-sliding-window': {
    time: 'O(n)',
    space: 'O(k)',
    why: 'Each index enters the window once and leaves once, so the inner while loop is amortised O(1). Space is the window’s counts.',
  },
  'dsap-stack': {
    time: 'O(n)',
    space: 'O(n)',
    why: 'Each element is pushed at most once and popped at most once. Worst case the whole input is on the stack.',
  },
  'dsap-binary-search': {
    time: 'O(log n)',
    space: 'O(1)',
    why: 'Halving the range. Binary search on the ANSWER is O(n log(max-min)): log steps, each one an O(n) feasibility check.',
  },
  'dsap-linked-list': {
    time: 'O(n)',
    space: 'O(1)',
    why: 'One or two pointer walks. O(1) is the whole point: rewire nodes instead of copying values into an array.',
  },
  'dsap-trees': {
    time: 'O(n)',
    space: 'O(h)',
    why: 'Every node visited once. Space is the recursion depth: O(log n) balanced, O(n) on a skewed tree. BFS pays O(w) for the widest level instead.',
  },
  'dsap-tries': {
    time: 'O(L)',
    space: 'O(total characters)',
    why: 'Lookup and insert cost the key length L, independent of how many keys are stored. Space is one node per distinct prefix.',
  },
  'dsap-heap': {
    time: 'O(n log k)',
    space: 'O(k)',
    why: 'Push and pop are O(log k) on a heap of size k, so top-k over n is n log k, beating n log n. Heapify a whole array is O(n), not O(n log n).',
  },
  'dsap-backtracking': {
    time: 'O(b^d)',
    space: 'O(d)',
    why: 'Branching factor to the depth: 2^n for subsets, n! for permutations, and the output alone is that big. Space is the call stack plus the current path.',
  },
  'dsap-graphs': {
    time: 'O(V + E)',
    space: 'O(V)',
    why: 'BFS and DFS touch each vertex once and each edge once. Union-Find with path compression and union by rank is near O(1) per operation, formally O(alpha(n)).',
  },
  'dsap-advanced-graphs': {
    time: 'O(E log V)',
    space: 'O(V + E)',
    why: 'Dijkstra with a binary heap. Bellman-Ford is O(VE) and is what you use when edges can be negative. Kruskal is O(E log E) for the sort, topological sort is O(V + E).',
  },
  'dsap-dp-1d': {
    time: 'O(n)',
    space: 'O(1)',
    why: 'n states, O(1) transition. Space collapses from O(n) to O(1) whenever the recurrence only reaches back a fixed number of steps.',
  },
  'dsap-dp-2d': {
    time: 'O(n * m)',
    space: 'O(min(n, m))',
    why: 'One cell per (i, j) pair with an O(1) transition. Keep two rows instead of the full grid unless you have to reconstruct the answer.',
  },
  'dsap-greedy': {
    time: 'O(n log n)',
    space: 'O(1)',
    why: 'The scan is O(n); the sort that makes the greedy choice safe is what costs you. If there is no sort it is O(n).',
  },
  'dsap-intervals': {
    time: 'O(n log n)',
    space: 'O(n)',
    why: 'Sort by start (merging) or by end (scheduling), then one linear sweep. Space is the output list.',
  },
  'dsap-math-geometry': {
    time: 'O(n)',
    space: 'O(1)',
    why: 'Usually a single pass or a closed form. Trial-division factorisation is O(sqrt(n)), gcd and fast exponentiation are O(log n).',
  },
  'dsap-bit-manipulation': {
    time: 'O(n)',
    space: 'O(1)',
    why: 'Word-size operations are O(1), so a pass over n integers is O(32n) = O(n). Space is a handful of registers.',
  },
}

/* --- 3. memory ------------------------------------------------------------ */

const PRECISION: [string, string, string][] = [
  ['FP32', '4 bytes', 'Training master weights; almost never used for serving'],
  ['BF16 / FP16', '2 bytes', 'The serving default. BF16 has FP32’s exponent range, so no loss scaling'],
  ['FP8', '1 byte', 'H100 and newer. Roughly free quality on most models'],
  ['INT8', '1 byte', 'Under 1% quality loss with good calibration'],
  ['INT4', '0.5 bytes', 'Visible degradation on reasoning; fine for drafts and edge'],
]

const WEIGHT_EXAMPLES: [string, string, string, string][] = [
  ['7B', '28 GB', '14 GB', '3.5 GB'],
  ['8B', '32 GB', '16 GB', '4 GB'],
  ['13B', '52 GB', '26 GB', '6.5 GB'],
  ['70B', '280 GB', '140 GB', '35 GB'],
  ['405B', '1.62 TB', '810 GB', '203 GB'],
]

const KV_EXAMPLES: [string, string, string, string][] = [
  ['Llama 3 8B (32 layers, 8 KV heads, head_dim 128)', '128 KiB', '1 GiB', '32 GiB'],
  ['The same model with plain MHA (32 KV heads)', '512 KiB', '4 GiB', '128 GiB'],
  ['Llama 3 70B (80 layers, 8 KV heads, head_dim 128)', '320 KiB', '2.5 GiB', '80 GiB'],
  ['Mistral 7B (32 layers, 8 KV heads, head_dim 128)', '128 KiB', '1 GiB', '32 GiB'],
]

const GPU_MEMORY: [string, string][] = [
  ['A100', '40 or 80 GB'],
  ['H100 SXM', '80 GB'],
  ['H200', '141 GB'],
  ['L40S', '48 GB'],
  ['A10G', '24 GB'],
]

/* --- 4. metrics ----------------------------------------------------------- */

const CLASSIFICATION: [string, string, string][] = [
  ['Accuracy', '(TP + TN) / (TP + TN + FP + FN)', 'Meaningless until you quote the always-majority baseline, which is 1 - prevalence'],
  ['Precision', 'TP / (TP + FP)', 'Of what you flagged, how much was right. Optimise it when a false positive costs a human review'],
  ['Recall (TPR, sensitivity)', 'TP / (TP + FN)', 'Of what was there, how much you caught. Optimise it when a miss is the expensive error'],
  ['F1', '2PR / (P + R)', 'Harmonic mean, so it punishes the weaker of the two. Assumes the two errors cost the same'],
  ['F-beta', '(1 + b^2) PR / (b^2 P + R)', 'b > 1 weights recall, b < 1 weights precision. b = 2 is the usual "recall matters more"'],
  ['Specificity (TNR)', 'TN / (TN + FP)', 'The negative-class mirror of recall'],
  ['FPR', 'FP / (FP + TN)', 'The x-axis of the ROC curve'],
  ['ROC-AUC', 'P(score of a random positive > score of a random negative)', 'Insensitive to prevalence, which is exactly why it flatters a model at 1% positives'],
  ['PR-AUC', 'Area under precision against recall', 'Baseline is the prevalence, not 0.5. The right curve under heavy imbalance'],
  ['Log loss', '-(1/n) SUM [ y log p + (1 - y) log (1 - p) ]', 'Scores the probability, not the decision. Proper scoring rule'],
  ['Brier score', '(1/n) SUM (p - y)^2', 'Mean squared error on probabilities. Lower is better; 0.25 is the coin flip'],
  ['ECE', 'SUM_b (n_b / n) | acc(b) - conf(b) |', 'Bin the predictions, compare accuracy to confidence in each bin. The calibration number'],
]

const RANKING: [string, string, string][] = [
  ['Precision@k', 'relevant in top k / k', 'What fraction of the page is useful'],
  ['Recall@k', 'relevant in top k / all relevant', 'The retrieval metric for RAG: can the generator even see the answer'],
  ['MRR', '(1 / |Q|) SUM_q 1 / rank of first relevant', 'Only the first hit counts. Right for "one correct answer" search'],
  ['AP / MAP', 'AP = (1/R) SUM_k P@k * rel(k); MAP averages AP over queries', 'Rewards putting all relevant results early, not just one'],
  ['DCG@k', 'SUM_{i=1..k} (2^rel_i - 1) / log2(i + 1)', 'Graded relevance with a positional discount'],
  ['NDCG@k', 'DCG@k / IDCG@k', 'DCG normalised by the perfect ordering, so it is comparable across queries'],
  ['Hit rate@k', 'queries with at least one relevant in top k / queries', 'The blunt instrument. Useful as a smoke test'],
]

/* --- 5. transformer parameters ------------------------------------------- */

/* --- 6. capacity ---------------------------------------------------------- */

const CONSTANTS: [string, string][] = [
  ['Seconds in a day', '86,400, round to 100,000'],
  ['1 QPS sustained', '86.4K/day, ~2.6M/month'],
  ['1M requests/day', '~12 QPS average'],
  ['1M DAU x 10 actions', '10M/day = ~116 QPS average'],
  ['Peak to average', '2x to 10x. Use 3x unless you know better'],
  ['Powers of two', '2^10 = 1 KB, 2^20 = 1 MB, 2^30 = 1 GB, 2^40 = 1 TB, 2^50 = 1 PB'],
  ['Bytes per character', '1 ASCII, up to 4 UTF-8'],
  ['A typical row', '100 B to 1 KB. A tweet 300 B, a photo 200 KB-2 MB, a minute of 1080p ~5 MB'],
  ['Index overhead', 'Add 20-30% on top of raw rows'],
  ['Replication', 'x3 for the usual quorum'],
  ['1 Gbps', '125 MB/s. 10 GbE = 1.25 GB/s'],
  ['One commodity node', '~100 GB RAM, 8-64 cores, a few TB of NVMe'],
  ['Postgres/MySQL node', 'Thousands of simple reads/s, hundreds to low thousands of writes/s'],
  ['Redis node', '~100K ops/s, single-threaded per core'],
  ['Kafka partition', 'Tens of MB/s. Scale by partitions, not by broker'],
  ['Cache hit rate', '80/20: caching the hot 20% usually buys 80% of the reads'],
]

/* --- rendering ------------------------------------------------------------ */

function Sheet({ meta, children }: { meta: SheetMeta; children: ReactNode }) {
  return (
    <section id={meta.id} className="sheet panel flex min-w-0 scroll-mt-20 flex-col gap-4 p-4 md:p-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h2>{meta.title}</h2>
        <p className="text-sm text-[var(--text-muted)]">{meta.blurb}</p>
      </div>
      {children}
    </section>
  )
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="sheet-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Formula({ children }: { children: string }) {
  return <div className="formula">{children}</div>
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="sheet-row flex min-w-0 flex-col gap-2">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

export default function CheatSheets() {
  const dsaPatterns = [...content.dsaPatterns].sort((a, b) => a.order - b.order)
  const sdPatterns = [...content.sdPatterns].sort((a, b) => a.order - b.order)

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <nav aria-label="Sheets" className="flex flex-wrap gap-2" data-print-hide>
        {SHEETS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="readout inline-flex min-h-11 items-center rounded-full border border-[var(--panel-border)] px-3 py-1.5 text-[var(--text-muted)]"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <Sheet meta={SHEETS[0]}>
        <Block title="The canonical set (Dean and Norvig, 2012)">
          <Table
            head={['Operation', 'Time', 'What it means']}
            rows={LATENCY_CLASSIC.map(([op, t, note]) => [
              op,
              <span key="t" className="sheet-num">{t}</span>,
              <span key="n" className="text-[var(--text-muted)]">{note}</span>,
            ])}
          />
        </Block>

        <Block title="Amendments for modern hardware">
          <Table
            head={['Operation', 'Time', 'Note']}
            rows={LATENCY_MODERN.map(([op, t, note]) => [
              op,
              <span key="t" className="sheet-num">{t}</span>,
              <span key="n" className="text-[var(--text-muted)]">{note}</span>,
            ])}
          />
        </Block>

        <Block title="The two rules you derive the rest from">
          <Formula>{`light in fibre  ~200,000 km/s  ->  RTT (ms) ~= distance_km / 100
  New York to London is 5,600 km  ->  56 ms floor, ~75 ms real

1 Gbps = 125 MB/s      10 GbE = 1.25 GB/s
transfer time = bytes / bandwidth + RTT`}</Formula>
          <p className="text-sm text-[var(--text-muted)]">
            Latency is a floor set by physics; bandwidth is a slope you can buy. If a design needs
            three sequential cross-continent round trips it costs 450 ms before it does any work,
            and no amount of hardware changes that. That sentence is what the numbers are for.
          </p>
        </Block>
      </Sheet>

      <Sheet meta={SHEETS[1]}>
        <Table
          head={['Pattern', 'Time', 'Space', 'Why']}
          rows={dsaPatterns.map((p) => {
            const c = COMPLEXITY[p.id]
            return [
              p.name,
              <span key="t" className="sheet-num">{c?.time ?? '—'}</span>,
              <span key="s" className="sheet-num">{c?.space ?? '—'}</span>,
              <span key="w" className="text-[var(--text-muted)]">{c?.why ?? ''}</span>,
            ]
          })}
        />
        <p className="text-sm text-[var(--text-muted)]">
          Sorting is O(n log n) and is the hidden cost in half of these. Recursion is O(depth) of
          stack even when it looks like it allocates nothing. Quoting a bound without the sentence
          after it scores nothing.
        </p>
      </Sheet>

      <Sheet meta={SHEETS[2]}>
        <Block title="Weights">
          <Formula>{`bytes = parameters x bytes per parameter`}</Formula>
          <Table
            head={['Precision', 'Bytes/param', 'Where it is used']}
            rows={PRECISION.map(([p, b, use]) => [
              p,
              <span key="b" className="sheet-num">{b}</span>,
              <span key="u" className="text-[var(--text-muted)]">{use}</span>,
            ])}
          />
          <Table
            head={['Model', 'FP32', 'BF16', 'INT4']}
            rows={WEIGHT_EXAMPLES.map((r) =>
              r.map((cell, i) => (
                <span key={i} className={i === 0 ? '' : 'sheet-num'}>
                  {cell}
                </span>
              )),
            )}
          />
          <p className="text-sm text-[var(--text-muted)]">
            The one-line version: in BF16 a model needs about twice its parameter count in
            gigabytes. 70B does not fit on an 80 GB H100, which is the whole reason tensor
            parallelism and quantisation exist.
          </p>
        </Block>

        <Block title="Training state">
          <Formula>{`mixed-precision AdamW, per parameter:
  BF16 weights      2 bytes
  BF16 gradients    2 bytes
  FP32 master copy  4 bytes
  Adam m            4 bytes
  Adam v            4 bytes
                   --------
                   16 bytes per parameter

7B  ->  112 GB before a single activation
70B ->  1.12 TB, so FSDP or ZeRO-3 shards all three of weights, grads and states`}</Formula>
          <p className="text-sm text-[var(--text-muted)]">
            Activations are on top and scale with batch x sequence x d_model x layers. Gradient
            checkpointing trades roughly 30% more compute for storing only layer boundaries.
          </p>
        </Block>

        <Block title="KV cache">
          <Formula>{`bytes per token = 2 x n_layers x n_kv_heads x head_dim x bytes_per_element
                  (the 2 is K and V)

with plain MHA, n_kv_heads x head_dim = d_model, so it reduces to
bytes per token = 2 x n_layers x d_model x bytes_per_element

total = bytes per token x sequence length x concurrent sequences`}</Formula>
          <Table
            head={['Model (FP16)', 'Per token', 'Per 8K sequence', '32 concurrent']}
            rows={KV_EXAMPLES.map((r) =>
              r.map((cell, i) => (
                <span key={i} className={i === 0 ? '' : 'sheet-num'}>
                  {cell}
                </span>
              )),
            )}
          />
          <p className="text-sm text-[var(--text-muted)]">
            Row two is the argument for GQA in one line: dropping from 32 KV heads to 8 cuts the
            cache 4x and changes nothing else about the model. On a 70B in FP16 the weights take
            140 GB of a 2xH100 node, leaving about 20 GB of KV, which is eight sequences at 8K
            context — that is the number that decides your fleet size, not the FLOPs.
          </p>
          <Table
            head={['GPU', 'HBM']}
            rows={GPU_MEMORY.map(([g, m]) => [g, <span key="m" className="sheet-num">{m}</span>])}
          />
        </Block>
      </Sheet>

      <Sheet meta={SHEETS[3]}>
        <Block title="Confusion matrix">
          <Formula>{`                 predicted +      predicted -
  actual +          TP               FN   (a miss)
  actual -          FP  (a false     TN
                         alarm)`}</Formula>
        </Block>

        <Block title="Classification">
          <Table
            head={['Metric', 'Formula', 'When it misleads you']}
            rows={CLASSIFICATION.map(([m, f, note]) => [
              m,
              <span key="f" className="sheet-num">{f}</span>,
              <span key="n" className="text-[var(--text-muted)]">{note}</span>,
            ])}
          />
        </Block>

        <Block title="Ranking and retrieval">
          <Table
            head={['Metric', 'Formula', 'What it is for']}
            rows={RANKING.map(([m, f, note]) => [
              m,
              <span key="f" className="sheet-num">{f}</span>,
              <span key="n" className="text-[var(--text-muted)]">{note}</span>,
            ])}
          />
        </Block>

        <Block title="Two things to say before they ask">
          <p className="text-sm text-[var(--text-muted)]">
            A threshold is a business decision, not a model output: pick it on a validation set
            from the cost of a false positive against a false negative, then report precision and
            recall at that threshold as well as the threshold-free curve. And a metric without an
            interval is an anecdote — bootstrap the test set 1,000 times and quote the 2.5th and
            97.5th percentiles.
          </p>
        </Block>
      </Sheet>

      <Sheet meta={SHEETS[4]}>
        <Block title="Per transformer block">
          <Formula>{`attention (MHA, no biases)   4 d^2      = W_q + W_k + W_v + W_o
attention (GQA)              2 d^2 + 2 d n_kv head_dim
MLP with GELU, hidden 4d     8 d^2      = W_in + W_out
MLP with SwiGLU, hidden h    3 d h      = gate + up + down
norms                        2 d        (negligible)

classic GPT block  ~= 12 d^2 per layer

total ~= 12 L d^2  +  V d   (input embedding; x2 if the LM head is untied)`}</Formula>
        </Block>

        <Block title="Checked against two real models">
          <Formula>{`GPT-3 175B     L = 96,  d = 12,288,  V = 50,257
  12 x 96 x 12,288^2 = 173.9B
  + 50,257 x 12,288  =   0.6B
                       -------
                        174.6B   -> "175B"

Llama 3 8B     L = 32,  d = 4,096,  32 heads / 8 KV heads, SwiGLU h = 14,336
  attention  16.8M + 4.2M + 4.2M + 16.8M =  41.9M per layer
  MLP        3 x 4,096 x 14,336          = 176.2M per layer
  per layer                                218.1M  x 32 = 6.98B
  embeddings 128,256 x 4,096 x 2 (untied) =  1.05B
                                            -------
                                              8.03B   -> "8B"`}</Formula>
        </Block>

        <Block title="What follows from the count">
          <Formula>{`memory in BF16      2N bytes            8B  -> 16 GB
forward FLOPs       ~2N per token
training FLOPs      ~6N per token       C = 6 N D  (2 fwd + 4 bwd)
Chinchilla optimal  D ~= 20 N tokens    8B  -> ~160B tokens

attention scaling   O(n^2 d) in sequence length, which is why the KV cache,
                    not the parameter count, is what limits context`}</Formula>
          <p className="text-sm text-[var(--text-muted)]">
            Why divide by sqrt(d_k): q.k is a sum of d_k products of unit-variance terms, so its
            variance grows as d_k. Without the scale the softmax saturates and the gradient
            vanishes. That is the answer they are listening for, not &ldquo;for stability&rdquo;.
          </p>
        </Block>
      </Sheet>

      <Sheet meta={SHEETS[5]}>
        <Block title="Constants worth knowing cold">
          <Table
            head={['Quantity', 'Value']}
            rows={CONSTANTS.map(([q, v]) => [q, <span key="v" className="sheet-num">{v}</span>])}
          />
        </Block>

        <Block title="The five steps, in order, out loud">
          <Formula>{`1  traffic   DAU x actions per user per day / 86,400 = average QPS
             peak = 3x average, and read:write is usually 10:1 or worse

2  storage   writes/day x bytes per write x retention days
             x1.3 for indexes, x3 for replication

3  bandwidth QPS x payload bytes, both directions
             compare against 125 MB/s per gigabit

4  memory    cache the hot 20% of a day's reads
             items x bytes per item, then round up a node

5  machines  QPS / per-node capacity, then N+1 per availability zone`}</Formula>
          <p className="text-sm text-[var(--text-muted)]">
            Round aggressively and say the rounding: 86,400 becomes 100,000, 1.3 million becomes a
            million. The interviewer is scoring whether you can carry an order of magnitude through
            five steps without a calculator, not the third significant figure.
          </p>
        </Block>

        <Block title="Worked numbers from the system design bank">
          <p className="text-sm text-[var(--text-muted)]">
            Every estimate the {content.sdQuestions.length} reference solutions expect you to state,
            grouped by pattern. These are the sentences, not the answers — read them for the shape
            of the arithmetic.
          </p>
          <div className="flex flex-col gap-4">
            {sdPatterns.map((pattern) => {
              const questions = content.sdQuestions.filter((q) => q.patternId === pattern.id)
              if (questions.length === 0) return null
              return (
                <div key={pattern.id} className="sheet-row flex min-w-0 flex-col gap-2">
                  <p className="eyebrow">{pattern.name}</p>
                  {questions.map((q) => (
                    <div key={q.id} className="flex min-w-0 flex-col gap-1">
                      <p className="text-sm font-medium">{q.title}</p>
                      <ul className="flex list-none flex-col gap-1 pl-0">
                        {q.solution.numbers.map((n) => (
                          <li key={n} className="flex min-w-0 gap-2 text-sm text-[var(--text-muted)]">
                            <span
                              aria-hidden="true"
                              className="mt-[0.45em] size-1 shrink-0 rounded-full bg-[var(--accent)]"
                            />
                            <span className="min-w-0 break-words">{n}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </Block>
      </Sheet>
    </div>
  )
}
