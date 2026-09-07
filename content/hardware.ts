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
]
