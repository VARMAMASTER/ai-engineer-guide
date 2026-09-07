import type { HwTopic, HwQuestion } from '@/lib/content/schema'

/**
 * How LLMs actually use the hardware. This bank sits underneath the LLM
 * serving system design questions: memory hierarchy, interconnect, precision
 * formats and roofline analysis, i.e. the reasons a serving design looks the
 * way it does.
 *
 * Every figure in `numbers` comes from the researched hardware pass and is
 * quoted in the hedged form that research used. Where a source rounds or
 * disagrees, the hedge is kept in the string — an approximate number stated
 * confidently is worse in an interview than admitting the range.
 */
export const hwTopics: HwTopic[] = [
  {
    id: 'hwt-gpu-vs-cpu',
    name: 'GPU vs CPU Architecture',
    order: 1,
    summary:
      'Explain SIMT against CPU SIMD, what a warp and an SM actually are, and why matmul belongs on Tensor Cores rather than CUDA cores.',
  },
  {
    id: 'hwt-memory-hierarchy',
    name: 'Memory Hierarchy',
    order: 2,
    summary:
      'Walk registers to SRAM to L2 to HBM to host RAM with real bandwidths, and use the SRAM/HBM gap to explain why FlashAttention wins.',
  },
  {
    id: 'hwt-interconnect',
    name: 'Multi-GPU Interconnect',
    order: 3,
    summary:
      'Compare PCIe, NVLink and NVSwitch with real link budgets, and defend a parallelism strategy from the interconnect you actually have.',
  },
  {
    id: 'hwt-roofline',
    name: 'Compute-Bound vs Memory-Bound',
    order: 4,
    summary:
      'Map a transformer forward pass onto the roofline model and explain why prefill is FLOP-limited while decode is bandwidth-limited.',
  },
  {
    id: 'hwt-cpu-role',
    name: "The CPU's Role in Serving",
    order: 5,
    summary:
      'Account for the host-side work — tokenization, scheduling, kernel dispatch, pinned transfers — that decides whether the GPU stays busy.',
  },
  {
    id: 'hwt-precision',
    name: 'Precision Formats',
    order: 6,
    summary:
      'Explain what changes in hardware between FP32, TF32, FP16, BF16, FP8 and integer formats, and which kernels each choice actually helps.',
  },
  {
    id: 'hwt-cache-coherence',
    name: 'Cache Coherence',
    order: 7,
    summary:
      'Explain MESI and false sharing on the CPU side, then contrast it with the GPU, where coherence is not free and not implicit.',
  },
]

export const hwQuestions: HwQuestion[] = [
  // ---------------------------------------------------------------- topic 1
  {
    id: 'hwq-simt-vs-simd',
    topicId: 'hwt-gpu-vs-cpu',
    text: 'What is the difference between a GPU\'s SIMT execution model and a CPU\'s SIMD, and why does that distinction matter when you write a kernel?',
    answer:
      'SIMD is one thread issuing a fixed-width vector instruction — an AVX register holding 8 or 16 lanes of one thread\'s data, with the vectorisation visible in the instruction itself. SIMT gives you the illusion of many independent scalar threads, and the hardware groups them into a warp of 32 that an SM issues one instruction to in lockstep. So you write scalar code per thread and the scheduler does the vectorising, which is far easier to program but means the abstraction leaks: anything that breaks lockstep across a warp costs you throughput even though the source looks perfectly parallel.',
    numbers: ['A warp is 32 threads; an SM issues one instruction per warp per cycle'],
    keyPoint:
      'SIMT is not "more flexible SIMD" — it is SIMD hardware with a per-thread programming model bolted on, so the cost model of SIMD still applies underneath the abstraction.',
    minutes: 10,
  },
  {
    id: 'hwq-warp-divergence',
    topicId: 'hwt-gpu-vs-cpu',
    text: 'What happens when threads in the same warp take different branches, and what is the performance cost?',
    answer:
      'The warp executes both paths serially. The hardware runs the if-side with the else-threads masked off, then runs the else-side with the if-threads masked off, so a two-way divergence inside a warp roughly halves your effective throughput on that region. The threads reconverge afterwards. Divergence between warps is free — it is only divergence within the 32 threads of a single warp that serialises, because that warp shares one instruction pointer.',
    numbers: ['Divergence serialises only within a 32-thread warp; across warps it is free'],
    keyPoint:
      'The fix is usually data layout, not branch removal: sort or bucket work so that threads with the same control flow land in the same warp instead of being interleaved across warps.',
    minutes: 9,
  },
  {
    id: 'hwq-latency-hiding',
    topicId: 'hwt-gpu-vs-cpu',
    text: 'A CPU stalls badly on a cache miss. Why does a GPU tolerate memory latency that would cripple a CPU?',
    answer:
      'The two chips spend their transistor budget on opposite strategies. A CPU avoids stalls — big caches, branch prediction, out-of-order execution, deep speculation, all to keep one thread\'s latency low with only a handful of cores. A GPU accepts the stall and hides it: when a warp blocks on an HBM read, the SM scheduler swaps in another resident warp that is ready to issue, and with enough warps in flight the memory latency is completely covered by other warps\' work. That is what "occupancy" is measuring — do you have enough independent warps resident to keep the issue slots full while some are waiting.',
    keyPoint:
      'Low occupancy is not automatically a bug: a kernel with high arithmetic intensity and heavy register or shared-memory use can run near peak at low occupancy, because it has little latency left to hide.',
    minutes: 10,
  },
  {
    id: 'hwq-cuda-vs-tensor-cores',
    topicId: 'hwt-gpu-vs-cpu',
    text: 'What is the difference between a CUDA core and a Tensor Core, and which parts of a transformer block run on each?',
    answer:
      'A CUDA core is a general-purpose scalar ALU — one FP32/FP64/INT32 operation per thread per cycle. A Tensor Core is a fixed-function matrix-multiply-accumulate unit that retires an entire small matrix multiply-and-add per cycle, e.g. a 4x4x4 MMA. So the big GEMMs — QKV projection, the attention score and value matmuls, both FFN layers — go to Tensor Cores, and that is where the order-of-magnitude speedup lives. Everything else — GELU, residual adds, layernorm, softmax exponentials, RoPE, reductions, address arithmetic — runs on CUDA cores.',
    numbers: ['Tensor Core performs a full small MMA (e.g. 4x4x4) per cycle; a CUDA core does one scalar op per thread per cycle'],
    keyPoint:
      'This is why quoting a GPU\'s "peak FLOPS" is ambiguous: the headline number is the Tensor Core matmul rate at a specific low precision, and no elementwise kernel in your model can ever reach it.',
    minutes: 10,
  },
  {
    id: 'hwq-sm-and-occupancy',
    topicId: 'hwt-gpu-vs-cpu',
    text: 'What is a streaming multiprocessor, and how do thread blocks map onto it?',
    answer:
      'An SM is the actual scheduling and execution unit: it owns a register file, a configurable L1/shared-memory SRAM block, warp schedulers, CUDA cores and Tensor Cores. You launch a grid of thread blocks; the driver assigns whole blocks to SMs, and a block stays resident on its SM until it finishes. Inside the SM the block is chopped into warps of 32 that the schedulers interleave. Registers and shared memory are the hard limits on how many blocks can be co-resident, which is what caps occupancy.',
    numbers: [
      'H100: 256 KB register file per SM, up to 228 KB configurable L1/shared memory per SM',
      'H100 has 2.7x the CUDA cores of A100 — 18,432 vs 6,912',
    ],
    keyPoint:
      'A block cannot migrate or be split across SMs, so an oversized block that only just fits wastes the rest of the SM — grid and block shape are a resource-packing decision, not a formatting detail.',
    minutes: 10,
  },
  {
    id: 'hwq-when-gpu-is-wrong',
    topicId: 'hwt-gpu-vs-cpu',
    text: 'When is a GPU the wrong tool for part of an ML workload?',
    answer:
      'Whenever the work is latency-critical and serial, or branch-heavy, or too small to amortise a kernel launch and a PCIe crossing. Beam-search bookkeeping, tokenizer state machines, request admission, sampling logic with per-sequence stopping rules, sparse irregular graph traversal — these have almost no parallelism per step and divergent control flow, so a GPU would run them at a fraction of a CPU core\'s speed. The GPU wins when you have thousands of independent identical operations and enough arithmetic per byte loaded to keep it fed.',
    keyPoint:
      'The real decision rule is parallel work per byte transferred: if you would spend more time moving the tensor across PCIe than computing on it, keeping the op on the host is strictly faster.',
    minutes: 9,
  },

  // ---------------------------------------------------------------- topic 2
  {
    id: 'hwq-memory-hierarchy-walk',
    topicId: 'hwt-memory-hierarchy',
    text: 'Walk me down the GPU memory hierarchy from registers to host RAM, with the bandwidths and capacities you would actually quote.',
    answer:
      'Registers are per-thread and fastest, with a 256 KB register file per SM on H100. Below that is shared memory and L1, which are the same physical SRAM — up to 228 KB configurable per SM, and roughly 20 TB/s aggregate SRAM bandwidth across the chip. Then a GPU-wide L2 of about 50 MB, shared by all SMs, slower than L1 but far faster than HBM. Then HBM, the off-chip but on-package device memory: 80 GB at 3.35 TB/s on an H100 SXM5. Finally host system RAM, which is an order of magnitude slower again and only reachable across PCIe or NVLink.',
    numbers: [
      'H100: 256 KB register file per SM',
      'H100: up to 228 KB configurable L1/shared SRAM per SM, ~20 TB/s aggregate SRAM bandwidth',
      'H100: ~50 MB L2, GPU-wide',
      'H100 SXM5: 80 GB HBM3 at 3.35 TB/s',
    ],
    keyPoint:
      'Shared memory and L1 are the same silicon partitioned by configuration, so asking for more shared memory per block directly shrinks the hardware cache — the levels are not independent knobs.',
    minutes: 12,
  },
  {
    id: 'hwq-sram-hbm-gap',
    topicId: 'hwt-memory-hierarchy',
    text: 'How large is the SRAM-to-HBM bandwidth gap, and what does FlashAttention do with it?',
    answer:
      'On-chip SRAM is roughly 6-10x faster than HBM, and that ratio is the entire premise of FlashAttention. Standard attention materialises the full N-by-N score matrix in HBM, writes it, reads it back for softmax, writes again, reads again for the value matmul — several round trips of a quadratic-sized tensor. FlashAttention tiles Q, K and V into blocks small enough to live in SRAM, computes the scores, running softmax statistics and the value product inside the tile, and only ever writes the output back. It does slightly more arithmetic and dramatically less HBM traffic.',
    numbers: ['SRAM (shared memory / L1) is roughly 6-10x faster than HBM'],
    keyPoint:
      'It is an IO-aware algorithm, not an approximation: the result is numerically the same attention, which is why it was adopted everywhere instead of being a quality trade-off.',
    minutes: 11,
  },
  {
    id: 'hwq-hbm-vs-gddr',
    topicId: 'hwt-memory-hierarchy',
    text: 'Why do datacenter GPUs use HBM while consumer cards use GDDR, and what does that cost you in practice?',
    answer:
      'HBM stacks DRAM dies vertically on the same package as the GPU and talks to it over a very wide, short interface, so you get enormous bandwidth and much better bandwidth-per-watt — at the cost of an expensive interposer and a fixed, non-upgradable capacity. GDDR sits as discrete chips on the board with a narrower, faster-clocked bus: cheaper, but far less bandwidth. The gap is about 3.3x between H100 HBM3 and a 4090\'s GDDR6X. For LLMs that is the difference that matters most, because decode throughput tracks memory bandwidth rather than FLOPS.',
    numbers: [
      'H100 SXM5: 80 GB HBM3 at 3.35 TB/s',
      'RTX 4090: 24 GB GDDR6X at ~1.0 TB/s',
      'Roughly a 3.3x bandwidth gap, H100 vs 4090',
    ],
    keyPoint:
      'The consumer penalty is capacity as much as bandwidth: a 24 GB ceiling forces quantisation or multi-GPU sharding for anything near 13-30B parameters at higher precision, before bandwidth even becomes the complaint.',
    minutes: 10,
  },
  {
    id: 'hwq-gpu-generations-memory',
    topicId: 'hwt-memory-hierarchy',
    text: 'Compare A100, H100 and B200 on memory, and be honest about which figures are firm.',
    answer:
      'A100 80GB is HBM2e at 2.0 TB/s. H100 SXM5 is 80 GB of HBM3 at 3.35 TB/s, with the PCIe variant noticeably lower at around 2 TB/s because of its power and link budget. B200 moves to 192 GB of HBM3e with bandwidth reported around 8 TB/s, and I would say it that way — sources round that figure differently, so I would not commit to a single decimal. H100 also adds native FP8 that A100 does not have, on top of 2.7x the CUDA cores.',
    numbers: [
      'A100 80GB: 80 GB HBM2e at 2.0 TB/s',
      'H100 SXM5: 80 GB HBM3 at 3.35 TB/s',
      'H100 PCIe: 80 GB HBM3 at ~2 TB/s, lower than SXM',
      'B200: 192 GB HBM3e, reported around 8 TB/s — sources round differently',
      'H100 vs A100 CUDA cores: 18,432 vs 6,912 (2.7x)',
    ],
    keyPoint:
      'Naming the SXM-versus-PCIe split is what shows real familiarity — quoting "H100 = 3.35 TB/s" for a PCIe card is a common and immediately correctable mistake.',
    minutes: 11,
  },
  {
    id: 'hwq-does-model-fit',
    topicId: 'hwt-memory-hierarchy',
    text: 'How do you work out whether a model fits in a given amount of HBM?',
    answer:
      'Start with weights: parameters times bytes per parameter, so 2 bytes each in BF16, 1 in FP8 or INT8. Then add KV cache, which scales with batch times sequence length times layers times KV heads times head dim times 2 for K and V times bytes per element. Then leave real headroom for activations, workspace for the CUDA context and allocator fragmentation. Compare against the card: 80 GB on an H100, 192 GB on a B200, 24 GB on a 4090.',
    numbers: [
      'BF16/FP16 weights: 2 bytes per parameter; FP8/INT8: 1 byte',
      'Capacity to size against: H100 80 GB, B200 192 GB, RTX 4090 24 GB',
    ],
    keyPoint:
      'Weights are a fixed cost you can compute exactly; KV cache is the term that grows with traffic, so the number that decides your deployment is how much HBM is left after weights, not total HBM.',
    minutes: 11,
  },
  {
    id: 'hwq-coalescing',
    topicId: 'hwt-memory-hierarchy',
    text: 'Two kernels read the same amount of data from HBM and one is several times slower. What is the likely cause?',
    answer:
      'Access pattern. HBM is read in wide transactions, and the memory system services a warp by combining its lanes into as few transactions as possible. If consecutive threads read consecutive addresses, one transaction feeds the whole warp. If the layout is strided or transposed so each thread lands in a different segment, you issue up to 32 separate transactions and fetch far more bytes than you use — so achieved bandwidth collapses while the logical byte count is unchanged.',
    keyPoint:
      'The lever is usually the tensor layout or a staging pass through shared memory, not the loop body: you fix it by making the warp\'s addresses contiguous, not by making the arithmetic cheaper.',
    minutes: 10,
  },
  {
    id: 'hwq-l2-role',
    topicId: 'hwt-memory-hierarchy',
    text: 'What is the GPU\'s L2 cache doing during inference, and why is it too small to save you?',
    answer:
      'L2 is the single GPU-wide cache in front of HBM — roughly 50 MB on H100 — and it is the coherence point that all SMs go through. It genuinely helps for data that many SMs reuse in the same kernel: a small weight tile, an embedding row, broadcast values. But a 70B model in BF16 is 140 GB of weights and the KV cache is tens of GB, so the working set is thousands of times larger than L2. Every decode step streams essentially cold data from HBM.',
    numbers: ['H100: ~50 MB L2, shared by all SMs', 'A 70B model in BF16 is ~140 GB of weights — orders of magnitude beyond L2'],
    keyPoint:
      'This is why decode cannot be cached out of its bandwidth problem: it is a streaming workload with almost no temporal reuse, which is the one access pattern caches cannot help.',
    minutes: 10,
  },

  // ---------------------------------------------------------------- topic 3
  {
    id: 'hwq-nvlink-vs-pcie',
    topicId: 'hwt-interconnect',
    text: 'How much faster is NVLink than PCIe, and what decision does that gap actually drive?',
    answer:
      'NVLink 4.0 on H100 is 18 bidirectional links at 50 GB/s each, so 900 GB/s bidirectional per GPU. A PCIe Gen4 x16 slot gives you about 31.5 GB/s per direction, and Gen5 x16 about 63 GB/s per direction. That makes NVLink roughly 14x a Gen4 x16 link and about 7x a Gen5 one. The decision it drives is whether tensor parallelism is viable at all: TP puts a collective on the critical path of every layer, so on PCIe-only boxes the communication usually costs more than the compute you saved.',
    numbers: [
      'NVLink 4.0 (H100): 18 bidirectional links x 50 GB/s = 900 GB/s bidirectional per GPU',
      'PCIe Gen4 x16: ~1.969 GB/s per lane -> ~31.5 GB/s per direction (~63 GB/s full-duplex)',
      'PCIe Gen5 x16: ~3.938 GB/s per lane -> ~63 GB/s per direction (~127-128 GB/s full-duplex)',
      'NVLink 4.0 is roughly 14x a PCIe Gen4 x16 link and ~7x a Gen5 x16 link',
    ],
    keyPoint:
      'Quote NVLink bidirectionally and PCIe per-direction consistently, or the comparison silently drifts by 2x — that unit confusion is the most common way this answer goes wrong.',
    minutes: 11,
  },
  {
    id: 'hwq-tp-allreduce-cost',
    topicId: 'hwt-interconnect',
    text: 'Why is the all-reduce in tensor parallelism more damaging than the all-reduce in data parallelism?',
    answer:
      'Because of where it sits, not how big it is. Data-parallel gradient all-reduce happens during the backward pass and can be overlapped with compute — you bucket gradients and start reducing early layers while later ones are still computing, so the network time hides behind arithmetic. Tensor-parallel all-reduce sits inside the forward and backward pass at every layer boundary: the next layer literally cannot start until the partial outputs are summed. There is nothing to hide it behind, so it adds directly to wall-clock latency per token.',
    keyPoint:
      'It also fires once or twice per layer per token, so the cost multiplies by depth — a 2 ms collective on an 80-layer model is not 2 ms of overhead, it is the dominant term in your inter-token latency.',
    minutes: 11,
  },
  {
    id: 'hwq-nvswitch-vs-mesh',
    topicId: 'hwt-interconnect',
    text: 'What does NVSwitch give you that a full-mesh NVLink topology does not?',
    answer:
      'In a pure point-to-point full mesh of 8 GPUs, each GPU has to divide its total NVLink bandwidth across 7 peer links, so the direct link between any specific pair is only about an eighth of the aggregate bandwidth leaving that GPU. NVSwitch replaces the wiring with a central crossbar, so every pair can talk at the full per-GPU NVLink bandwidth simultaneously. That is why NVSwitch-based DGX/HGX 8-GPU systems scale all-reduce so much better than mesh wiring. The trade-off is cost, power and cooling, which is why it is a datacenter-only part.',
    numbers: [
      'Full mesh of 8 GPUs: any single peer link carries only ~1/8 of a GPU\'s aggregate NVLink bandwidth',
      'NVSwitch: full per-GPU NVLink bandwidth (900 GB/s bidirectional on H100) available to every pair simultaneously',
    ],
    keyPoint:
      'Collectives are dominated by the slowest pairwise hop, so a mesh degrades exactly on the all-to-all patterns that tensor parallelism and MoE expert routing depend on.',
    minutes: 11,
  },
  {
    id: 'hwq-pcie-only-strategy',
    topicId: 'hwt-interconnect',
    text: 'You have 8 GPUs in a box with no NVLink, only PCIe Gen4. How would you shard a model that does not fit on one card?',
    answer:
      'I would avoid tensor parallelism and reach for pipeline parallelism first. TP needs an all-reduce on the critical path of every layer, and at ~31.5 GB/s per direction that collective will dominate the per-token time. Pipeline parallelism only sends activations at stage boundaries — a handful of transfers per forward pass of a tensor the size of one hidden state, not one per layer — so the traffic is orders of magnitude smaller. If the model does fit on one card, plain data parallelism with independent replicas is better still, because there is no cross-GPU traffic during inference at all.',
    numbers: ['PCIe Gen4 x16: ~31.5 GB/s per direction, versus 900 GB/s bidirectional for NVLink 4.0'],
    keyPoint:
      'Pipeline parallelism trades that bandwidth problem for a bubble problem — you need enough concurrent microbatches or requests in flight to keep every stage fed, or GPUs idle waiting on their predecessor.',
    minutes: 12,
  },
  {
    id: 'hwq-tp-across-nodes',
    topicId: 'hwt-interconnect',
    text: 'Why does tensor parallelism usually stop at the node boundary?',
    answer:
      'Inside a node you have NVLink and NVSwitch — 900 GB/s bidirectional per GPU with a crossbar behind it. Crossing to another node drops you onto the network fabric, which is a large step down in bandwidth and, more importantly, a large step up in latency and jitter. Since TP\'s collective is synchronous and on the critical path at every layer, that latency multiplies by layer count. So the standard layout is tensor parallel within the node, and pipeline or data parallel across nodes where the communication is sparser and more overlappable.',
    numbers: ['Intra-node NVLink 4.0: 900 GB/s bidirectional per GPU — the budget TP depends on'],
    keyPoint:
      'The binding constraint across nodes is latency, not bandwidth: TP issues many small synchronous collectives, and small-message latency is exactly where a network fabric is worst relative to NVLink.',
    minutes: 11,
  },
  {
    id: 'hwq-pcie-generations',
    topicId: 'hwt-interconnect',
    text: 'How do you compute PCIe bandwidth from the generation and lane count?',
    answer:
      'Per-lane throughput times lanes, per direction, and PCIe is full-duplex so a combined figure doubles it. Gen4 is about 1.969 GB/s per lane after encoding, so a x16 slot is about 31.5 GB/s per direction, roughly 63 GB/s combined. Gen5 doubles the signalling to about 3.938 GB/s per lane, so x16 is about 63 GB/s per direction and 127-128 GB/s combined. Being able to derive it matters because a card in a x8 slot, or on a shared switch, silently gets half the bandwidth you assumed.',
    numbers: [
      'PCIe Gen4: ~1.969 GB/s per lane; x16 = ~31.5 GB/s per direction, ~63 GB/s combined',
      'PCIe Gen5: ~3.938 GB/s per lane; x16 = ~63 GB/s per direction, ~127-128 GB/s combined',
    ],
    keyPoint:
      'Check topology as well as generation — GPUs hanging off the same PCIe switch or crossing the CPU sockets share a link, so the effective peer-to-peer bandwidth can be well under the slot rating.',
    minutes: 9,
  },

  // ---------------------------------------------------------------- topic 4
  {
    id: 'hwq-decode-memory-bound',
    topicId: 'hwt-roofline',
    text: 'Is LLM decode compute-bound or memory-bound, and what follows from the answer?',
    answer:
      'Decode is memory-bandwidth bound, not compute bound — each step re-reads the whole KV cache and weight matrices to produce one token, so arithmetic intensity stays near 1 FLOP per byte regardless of batch size. That is why H100\'s 3.35 TB/s HBM3 bandwidth caps decode throughput long before its FLOPS do, and why continuous batching exists — it pushes the FFN kernel into the compute-bound regime where the GPU is actually busy.',
    numbers: [
      'Decode arithmetic intensity: roughly ~1 FLOP/byte regardless of batch size',
      'H100 SXM5: 3.35 TB/s HBM3 bandwidth — the ceiling decode actually hits',
    ],
    keyPoint:
      'The tell is that decode throughput tracks HBM bandwidth across GPU generations rather than peak FLOPS, so a card with more FLOPS and the same bandwidth generates tokens at essentially the same rate.',
    minutes: 12,
  },
  {
    id: 'hwq-prefill-vs-decode',
    topicId: 'hwt-roofline',
    text: 'Why do prefill and decode sit on opposite sides of the roofline?',
    answer:
      'Prefill processes the whole prompt at once, so every token in the sequence goes through the same weight matrices in one big GEMM. You load the weights once and do a huge amount of arithmetic with them, so arithmetic intensity is high and the GPU is FLOP-limited — this is where Tensor Cores and raw FLOPS matter. Decode produces one token per step, so you load exactly the same weights plus the full KV cache and do a vector-matrix product with them. Same bytes moved, a tiny fraction of the arithmetic, so you fall off the compute roof onto the bandwidth slope.',
    numbers: ['Prefill: compute-bound, FLOP-limited. Decode: memory-bandwidth-bound at ~1 FLOP/byte'],
    keyPoint:
      'This asymmetry is the reason the two phases get different SLOs, different batching policies and increasingly different hardware pools — optimising them together optimises neither.',
    minutes: 11,
  },
  {
    id: 'hwq-roofline-model',
    topicId: 'hwt-roofline',
    text: 'Explain the roofline model and how you would use it on a real kernel.',
    answer:
      'You plot achievable FLOPS against arithmetic intensity in FLOPs per byte. Below the knee you are bandwidth-limited and performance equals bandwidth times intensity — a diagonal line. Above it you are compute-limited and performance flattens at peak FLOPS. The knee sits at peak FLOPS divided by peak bandwidth. To use it, I measure a kernel\'s FLOPs and its HBM bytes moved, place it on the x-axis, and that tells me immediately whether to chase arithmetic or data movement.',
    numbers: ['Roofline knee = peak FLOPS / peak bandwidth; on H100 the bandwidth term is 3.35 TB/s'],
    keyPoint:
      'The point of the model is that it tells you which optimisations are pointless: below the knee, a faster matmul instruction buys you nothing, and above it, better data layout buys you nothing.',
    minutes: 12,
  },
  {
    id: 'hwq-batch-crossover',
    topicId: 'hwt-roofline',
    text: 'As you grow the decode batch size, which kernels become compute-bound and which do not?',
    answer:
      'At small batches, roughly 4-16, both attention and the FFN are memory-bound during decode. Above about batch 32 the FFN kernel crosses over to compute-bound, because the weights are loaded once and shared by every sequence in the batch, so intensity grows with batch size. Attention does not cross over: growing the batch grows the KV cache proportionally, so the bytes read grow at the same rate as the arithmetic and intensity stays flat.',
    numbers: [
      'Batch 4-16: both attention and FFN kernels are memory-bound during decode',
      'Above roughly batch 32: the FFN kernel crosses to compute-bound; attention stays memory-bound',
    ],
    keyPoint:
      'That split is the actual justification for continuous batching — you batch aggressively to move the FFN onto the compute roof, and you accept that attention will remain bandwidth-limited whatever you do.',
    minutes: 12,
  },
  {
    id: 'hwq-layernorm-softmax-bound',
    topicId: 'hwt-roofline',
    text: 'Why are layernorm and softmax memory-bound, and what do you do about it?',
    answer:
      'They do almost no arithmetic per element — a few adds, a multiply, an exponential — but they read an entire activation tensor out of HBM and write one back. So the runtime is essentially bytes moved divided by bandwidth, and the arithmetic is free by comparison. The fix is kernel fusion: fold them into the neighbouring op so the intermediate never round-trips to HBM. FlashAttention is the canonical case, fusing attention and softmax into one kernel that never materialises the full score matrix and keeps intermediates in SRAM.',
    numbers: ['SRAM is roughly 6-10x faster than HBM — the gap fusion is monetising'],
    keyPoint:
      'The win from fusion is measured in eliminated HBM round trips, not in saved arithmetic, which is why a fused kernel can do strictly more FLOPs and still be several times faster.',
    minutes: 10,
  },
  {
    id: 'hwq-diagnose-bound',
    topicId: 'hwt-roofline',
    text: 'How would you determine empirically whether a kernel is compute-bound or memory-bound?',
    answer:
      'Measure both sides and compare each to its ceiling. Take the kernel\'s HBM bytes read and written, divide by its runtime, and compare to peak bandwidth — 3.35 TB/s on an H100 SXM5. Do the same for FLOPs against peak FLOPS at the precision in use. Whichever fraction is close to 1 is your limiter. If neither is, you are latency-bound or occupancy-bound rather than either. A quick confirmation: down-clock memory and see whether runtime moves.',
    numbers: ['Compare achieved HBM bandwidth against 3.35 TB/s peak on H100 SXM5'],
    keyPoint:
      'A kernel at, say, 40% of both ceilings is the interesting case — it is usually launch overhead, warp divergence or bad access patterns, and neither a faster matmul nor fewer bytes will fix it.',
    minutes: 11,
  },
  {
    id: 'hwq-flops-dont-help-decode',
    topicId: 'hwt-roofline',
    text: 'A vendor doubles peak FLOPS and keeps memory bandwidth the same. What happens to your serving numbers?',
    answer:
      'Prefill gets meaningfully faster, so time-to-first-token improves. Decode barely moves, because it is bandwidth-limited at roughly 1 FLOP per byte and you did not touch the bytes-per-second term. In roofline terms you raised the flat compute roof and left the diagonal bandwidth slope where it was, so anything left of the knee is unaffected — and you actually pushed the knee further right, meaning more kernels are now memory-bound than before.',
    numbers: ['Decode stays pinned to the bandwidth slope at ~1 FLOP/byte; only the compute roof moved'],
    keyPoint:
      'Doubling FLOPS without bandwidth makes the memory-bound region larger, so a generation that looks twice as fast on paper can deliver almost no inter-token latency improvement.',
    minutes: 11,
  },

  // ---------------------------------------------------------------- topic 5
  {
    id: 'hwq-cpu-serving-role',
    topicId: 'hwt-cpu-role',
    text: 'What is the CPU actually doing while a GPU serves LLM requests?',
    answer:
      'All the work between kernel launches. Tokenization and detokenization, request admission and queueing, continuous-batching bookkeeping — deciding which sequences join or leave the batch this step — KV-cache block-table management for paged attention, sampling and stop-condition logic, and the CUDA kernel dispatch itself. None of it is arithmetic-heavy, but all of it is on the critical path: the GPU cannot start step N+1 until the host has decided what step N+1 contains.',
    keyPoint:
      'It is a producer-consumer pipeline, so the host does not need to be fast in absolute terms — it needs to stay ahead of a GPU step, and it is the variance in host time, not the mean, that shows up as decode jitter.',
    minutes: 10,
  },
  {
    id: 'hwq-tokenization-latency',
    topicId: 'hwt-cpu-role',
    text: 'Can CPU-side tokenization really matter next to GPU compute?',
    answer:
      'Yes, and more than people expect. One source reports CPU-side tokenization accounting for up to 50% of total inference latency under realistic concurrency — I would flag that as one study\'s finding rather than a consensus constant, but the mechanism behind it is well documented. Tokenization is a serial string-processing pass, it runs per request rather than per batch, and under concurrency it competes with the scheduler loop for the same cores. The mitigations are the usual ones: a fast native tokenizer, tokenizing off the request-handling thread, batching or caching where prompts repeat.',
    numbers: [
      'One source reports CPU-side tokenization at up to 50% of total inference latency under realistic concurrency — one study\'s finding, not a universal constant',
    ],
    keyPoint:
      'The general failure mode is what matters: a CPU-bound host loop starves the GPU, and you see it as low GPU utilisation with healthy queue depth, which no amount of GPU tuning will fix.',
    minutes: 10,
  },
  {
    id: 'hwq-pinned-memory',
    topicId: 'hwt-cpu-role',
    text: 'What does pinned memory do, and why does it speed up host-to-device transfers?',
    answer:
      'Ordinary pageable host memory cannot be DMA\'d to the GPU, because the OS can relocate or swap those pages at any moment and the DMA engine holds a physical address. So the CUDA runtime does a hidden extra copy: pageable memory into an internal pinned staging buffer, then DMA from there to the GPU. Allocating pinned memory yourself with cudaMallocHost removes that staging hop. In practice pinned transfers reach over 90% of theoretical PCIe bandwidth while pageable ones typically manage 40-60%.',
    numbers: [
      'Pinned transfers hit >90% of theoretical PCIe bandwidth; pageable transfers typically reach only 40-60%',
    ],
    keyPoint:
      'Pinning is not free — it locks physical pages away from the OS, so over-pinning degrades the whole machine, which is why it belongs on a small set of reused staging buffers rather than every allocation.',
    minutes: 10,
  },
  {
    id: 'hwq-pin-memory-flag',
    topicId: 'hwt-cpu-role',
    text: 'Why does PyTorch\'s DataLoader have a pin_memory flag, and when does it help in an inference server?',
    answer:
      'It allocates the batch in pinned host memory so the copy to device skips the staging buffer and can be issued asynchronously, overlapping with compute on another stream. It helps whenever you are moving a meaningful volume of host tensors across PCIe on the critical path — training input pipelines, and on the serving side tokenized batches and image or audio inputs. It does nothing for tensors already resident on the GPU, and it is pure overhead if the transfer was never your bottleneck.',
    numbers: ['The gap it closes: >90% of PCIe peak pinned versus 40-60% pageable'],
    keyPoint:
      'Asynchronous copy is really the point — pinned memory is what makes cudaMemcpyAsync actually asynchronous, so you get overlap with compute rather than just a marginally faster blocking copy.',
    minutes: 9,
  },
  {
    id: 'hwq-kernel-launch-overhead',
    topicId: 'hwt-cpu-role',
    text: 'How does kernel launch overhead hurt decode, and what do CUDA graphs fix?',
    answer:
      'A decode step is hundreds of small kernels — one or more per layer — each of which the host must dispatch. Each launch costs microseconds of CPU time, and when the kernels themselves are short, launch overhead becomes a real fraction of the step. CUDA graphs let you record the whole sequence once and replay it with a single submission, amortising per-launch cost. What they do not remove is the round trip: the scheduler still returns to the host after every decode step to update batch membership and dispatch the next graph.',
    keyPoint:
      'Because a graph freezes shapes, continuous batching has to bucket to a fixed set of batch sizes and replay the matching graph — the interaction between graphs and dynamic batching is where this actually gets hard.',
    minutes: 11,
  },
  {
    id: 'hwq-diagnose-low-gpu-util',
    topicId: 'hwt-cpu-role',
    text: 'GPU utilisation sits at 30% while requests queue up. How do you diagnose it?',
    answer:
      'That pattern says the GPU is starved, so I look host-side first. Check whether a CPU core is pinned — tokenization, the scheduler loop or Python overhead saturating one thread. Profile the timeline and look for gaps between kernels: wide gaps mean dispatch or scheduling stalls, not slow kernels. Check whether host-to-device copies are synchronous and blocking on pageable memory. Only after that would I look at the kernels themselves.',
    keyPoint:
      'Also distrust the utilisation number: nvidia-smi reports the fraction of time at least one kernel was resident, so a GPU running one tiny kernel can read 100% busy while doing almost no useful work.',
    minutes: 11,
  },

  // ---------------------------------------------------------------- topic 6
  {
    id: 'hwq-fp16-vs-bf16',
    topicId: 'hwt-precision',
    text: 'FP16 and BF16 are both 16 bits. What is the difference and why did BF16 win for LLMs?',
    answer:
      'They split the bits differently. FP16 is 1 sign, 5 exponent, 10 mantissa, so it has more precision but a narrow range topping out around 65,504. BF16 is 1 sign, 8 exponent, 7 mantissa — the same exponent field as FP32, so it covers the full FP32 dynamic range at half the memory, with less precision. LLM training cares about range far more than mantissa bits: gradients and activations span many orders of magnitude, and FP16 overflows or underflows on them. BF16 just works, which is why it became the dominant training format.',
    numbers: [
      'FP16: 1/5/10 sign/exponent/mantissa, max ~65,504',
      'BF16: 1/8/7 — same exponent field as FP32, so the same dynamic range at half the memory',
      'FP32: 1/8/23',
    ],
    keyPoint:
      'BF16 is what let mixed precision stop needing loss scaling — FP16 training required dynamically rescaling gradients to keep them inside its range, and that whole apparatus disappears with BF16.',
    minutes: 11,
  },
  {
    id: 'hwq-tf32',
    topicId: 'hwt-precision',
    text: 'What is TF32, and why can it speed up code you did not change?',
    answer:
      'TF32 is an NVIDIA Tensor Core internal format: 1 sign, 8 exponent, 10 mantissa. It keeps FP32\'s exponent field, so the same dynamic range, but truncates the mantissa to FP16\'s width so the Tensor Core can chew through it much faster. The point is that it operates inside a nominally FP32 matmul — inputs and accumulation stay FP32-shaped, the multiply happens at reduced mantissa — so a framework can enable it for you and existing FP32 code gets near-FP16 matmul throughput without a code change.',
    numbers: ['TF32: 1/8/10 — FP32 range with an FP16-width mantissa, Tensor Core internal'],
    keyPoint:
      'It is silent by default in some framework versions, so a numerically sensitive workload can change results between releases with no code change — worth knowing about before you debug a reproducibility failure.',
    minutes: 10,
  },
  {
    id: 'hwq-fp8-formats',
    topicId: 'hwt-precision',
    text: 'What are the two FP8 formats, and how are they used differently?',
    answer:
      'E5M2 spends more bits on the exponent, so it has wider range and less precision; E4M3 does the opposite, narrower range and more precision. FP8 arrived on H100 through the Transformer Engine, which A100 has no native support for. The typical pattern is E4M3 for the tensors where precision matters more — forward-pass weights and activations — and E5M2 where dynamic range matters more, notably gradients in the backward pass, with per-tensor scaling factors keeping values inside the representable window.',
    numbers: [
      'FP8 comes in E5M2 (wider range) and E4M3 (more precision), 8 bits total',
      'Introduced on H100 via the Transformer Engine; A100 has no native FP8',
    ],
    keyPoint:
      'At 8 bits the scaling factors are the real engineering — the format alone has too little range to hold raw tensors, so FP8 is a format plus a dynamic per-tensor scaling scheme, not just narrower floats.',
    minutes: 11,
  },
  {
    id: 'hwq-int8-vs-float8',
    topicId: 'hwt-precision',
    text: 'How does INT8 or INT4 quantization differ from an 8-bit float format?',
    answer:
      'Integer quantization is a uniform grid: fixed, equal steps across the range, with a scale and often a zero point mapping the tensor onto it. A float format spends bits on an exponent, so its steps get coarser as magnitude grows — fine resolution near zero, wide near the extremes. That non-uniformity happens to suit the roughly bell-shaped distribution of weights, which is why FP8 tends to need less care than INT8. Integer formats are inference-only in practice, fastest and smallest, and need calibration data to pick the scales.',
    numbers: ['INT8/INT4: uniform quantization with fixed equal steps — lowest precision, smallest footprint, inference-only'],
    keyPoint:
      'Outliers are the real difficulty: a handful of large-magnitude activation channels blow up the scale for everything else, which is why practical INT8 schemes go per-channel or keep the outlier channels at higher precision.',
    minutes: 11,
  },
  {
    id: 'hwq-precision-roofline-link',
    topicId: 'hwt-precision',
    text: 'Where does dropping precision actually buy you speed, and by what mechanism?',
    answer:
      'It depends which side of the roofline the layer is on, and the mechanism is different in each case. For compute-bound layers — the large matmuls — the win is Tensor Core throughput: lower precision means more MMA operations per cycle, so the arithmetic itself goes faster. For memory-bound layers — layernorm, activations, elementwise ops — the arithmetic was never the limit, so the win comes purely from moving fewer bytes per element. Same halving of bit width, two completely different reasons it helps.',
    numbers: ['Compute-bound layers gain Tensor Core throughput; memory-bound layers gain only from fewer bytes moved per element'],
    keyPoint:
      'Which means quantizing a memory-bound kernel and then measuring FLOPS shows nothing, and quantizing a compute-bound one and measuring bandwidth shows nothing — you have to know the regime before you can even read the result.',
    minutes: 12,
  },
  {
    id: 'hwq-weight-only-quantization',
    topicId: 'hwt-precision',
    text: 'Why is weight-only quantization enough to speed up decode, even when the arithmetic stays in BF16?',
    answer:
      'Because decode is bandwidth-bound at roughly 1 FLOP per byte, and the bytes are dominated by streaming the weight matrices out of HBM every step. Storing weights at 8 or 4 bits halves or quarters that traffic; you then dequantize into BF16 inside the kernel and do the matmul as before. You gained nothing arithmetically and a large amount on the term that was actually limiting you. The catch is that it only holds while you stay memory-bound.',
    numbers: [
      'Decode intensity: ~1 FLOP/byte — weight streaming from HBM dominates',
      'BF16 weights are 2 bytes per parameter; INT8/FP8 are 1',
    ],
    keyPoint:
      'At large batch sizes the FFN has crossed to compute-bound, and there the in-kernel dequantize is added arithmetic on the critical path — weight-only quantization can then be slower than doing nothing.',
    minutes: 12,
  },
]
