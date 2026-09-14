/* GENERATED FILE — do not edit.
 *
 * Written by `scripts/generate-course-outlines.ts` from the Markdown in
 * `content/courses/`. Regenerate with:
 *
 *   pnpm tsx scripts/generate-course-outlines.ts
 *
 * `pnpm validate` re-parses the source documents and fails if this file has
 * drifted from them, so it can never quietly go stale.
 */
import type { CourseOutline } from '@/lib/courses/outline'

export const courseOutlines: CourseOutline[] = [
  {
    "slug": "neural-networks-end-to-end",
    "title": "Neural Networks, End to End",
    "author": "Sai Kiran Varma",
    "parts": [
      {
        "slug": "part-i",
        "kicker": "Part I",
        "title": "THE LEARNING ALGORITHM",
        "range": "§1–11",
        "sections": [
          {
            "anchor": "s1",
            "marker": "§1",
            "label": "Two intuitions that carry the whole subject"
          },
          {
            "anchor": "s2",
            "marker": "§2",
            "label": "Gradient descent in one dimension"
          },
          {
            "anchor": "s3",
            "marker": "§3",
            "label": "The local minima problem (and why it doesn't bite)"
          },
          {
            "anchor": "s4",
            "marker": "§4",
            "label": "Partial derivatives — a million knobs"
          },
          {
            "anchor": "s5",
            "marker": "§5",
            "label": "The chain rule — the central difficulty, solved"
          },
          {
            "anchor": "s6",
            "marker": "§6",
            "label": "The key insight: a network is a nested function"
          },
          {
            "anchor": "s7",
            "marker": "§7",
            "label": "Worked example — building and running a tiny brain"
          },
          {
            "anchor": "s8",
            "marker": "§8",
            "label": "Backpropagation by hand — the blame game on real weights"
          },
          {
            "anchor": "s9",
            "marker": "§9",
            "label": "The update — and did it actually work?"
          },
          {
            "anchor": "s10",
            "marker": "§10",
            "label": "Learning from all the data — online vs batch vs mini-batch"
          },
          {
            "anchor": "s11",
            "marker": "§11",
            "label": "What actually changes at scale"
          }
        ]
      },
      {
        "slug": "part-ii",
        "kicker": "Part II",
        "title": "THE PYTORCH IMPLEMENTATION",
        "range": "§12–20",
        "sections": [
          {
            "anchor": "s12",
            "marker": "§12",
            "label": "Tensors — the only data structure"
          },
          {
            "anchor": "s13",
            "marker": "§13",
            "label": "Autograd — Part I, automated"
          },
          {
            "anchor": "s14",
            "marker": "§14",
            "label": "Operations — the verbs"
          },
          {
            "anchor": "s15",
            "marker": "§15",
            "label": "Steps 1–2 in PyTorch — forward pass and loss"
          },
          {
            "anchor": "s16",
            "marker": "§16",
            "label": "Steps 3–5 — the manual loop"
          },
          {
            "anchor": "s17",
            "marker": "§17",
            "label": "Going professional — nn.Module and torch.optim"
          },
          {
            "anchor": "s18",
            "marker": "§18",
            "label": "Activation functions — adding the kinks"
          },
          {
            "anchor": "s19",
            "marker": "§19",
            "label": "The actual LLM building blocks"
          },
          {
            "anchor": "s20",
            "marker": "§20",
            "label": "The bridge — this is not an analogy"
          }
        ]
      },
      {
        "slug": "part-iii",
        "kicker": "Part III",
        "title": "FROM THE LOOP TO AN LLM",
        "range": "§21–28",
        "sections": [
          {
            "anchor": "s21",
            "marker": "§21",
            "label": "The real bottleneck was data, not compute"
          },
          {
            "anchor": "s22",
            "marker": "§22",
            "label": "Self-supervised learning — make the data label itself"
          },
          {
            "anchor": "s23",
            "marker": "§23",
            "label": "Why guessing the next word produces intelligence"
          },
          {
            "anchor": "s24",
            "marker": "§24",
            "label": "Tokenization — text becomes numbers"
          },
          {
            "anchor": "s25",
            "marker": "§25",
            "label": "Logits → softmax → probabilities"
          },
          {
            "anchor": "s26",
            "marker": "§26",
            "label": "Cross-entropy loss — measuring surprise"
          },
          {
            "anchor": "s27",
            "marker": "§27",
            "label": "Generation — temperature and top-p"
          },
          {
            "anchor": "s28",
            "marker": "§28",
            "label": "Where pre-training ends"
          }
        ]
      },
      {
        "slug": "part-iv",
        "kicker": "Part IV",
        "title": "INSIDE THE BOX",
        "range": "§29–40",
        "sections": [
          {
            "anchor": "s29",
            "marker": "§29",
            "label": "The config — every knob in one place"
          },
          {
            "anchor": "s30",
            "marker": "§30",
            "label": "Embeddings — token identity plus position"
          },
          {
            "anchor": "s31",
            "marker": "§31",
            "label": "Self-attention I — the intuition"
          },
          {
            "anchor": "s32",
            "marker": "§32",
            "label": "Self-attention II — the linear algebra"
          },
          {
            "anchor": "s33",
            "marker": "§33",
            "label": "The causal mask — no time travel"
          },
          {
            "anchor": "s34",
            "marker": "§34",
            "label": "Multi-head attention — split, attend, merge"
          },
          {
            "anchor": "s35",
            "marker": "§35",
            "label": "The MLP — the thinking layer"
          },
          {
            "anchor": "s36",
            "marker": "§36",
            "label": "The glue — residual connections and LayerNorm"
          },
          {
            "anchor": "s37",
            "marker": "§37",
            "label": "The Block — and depth vs width"
          },
          {
            "anchor": "s38",
            "marker": "§38",
            "label": "The output head and weight tying"
          },
          {
            "anchor": "s39",
            "marker": "§39",
            "label": "Training — the six-stage loop"
          },
          {
            "anchor": "s40",
            "marker": "§40",
            "label": "Generation — the autoregressive loop"
          }
        ]
      },
      {
        "slug": "part-v",
        "kicker": "Part V",
        "title": "FROM PARROT TO ASSISTANT",
        "range": "§41–47",
        "sections": [
          {
            "anchor": "s41",
            "marker": "§41",
            "label": "The parrot problem"
          },
          {
            "anchor": "s42",
            "marker": "§42",
            "label": "Why the parrot exists — the loss made it that way"
          },
          {
            "anchor": "s43",
            "marker": "§43",
            "label": "SFT — curated flashcards instead of a library"
          },
          {
            "anchor": "s44",
            "marker": "§44",
            "label": "Chat templates and special tokens"
          },
          {
            "anchor": "s45",
            "marker": "§45",
            "label": "Loss masking — the entire trick"
          },
          {
            "anchor": "s46",
            "marker": "§46",
            "label": "The collator, in five steps"
          },
          {
            "anchor": "s47",
            "marker": "§47",
            "label": "What SFT achieves — and its built-in ceiling"
          }
        ]
      },
      {
        "slug": "part-vi",
        "kicker": "Part VI",
        "title": "LEARNING TO JUDGE",
        "range": "§48–55",
        "sections": [
          {
            "anchor": "s48",
            "marker": "§48",
            "label": "The shades-of-grey problem"
          },
          {
            "anchor": "s49",
            "marker": "§49",
            "label": "Hidden quality scores and Bradley-Terry"
          },
          {
            "anchor": "s50",
            "marker": "§50",
            "label": "From probability to loss — and why the log"
          },
          {
            "anchor": "s51",
            "marker": "§51",
            "label": "The naive reward — and where the scores come from"
          },
          {
            "anchor": "s52",
            "marker": "§52",
            "label": "Implementing the score"
          },
          {
            "anchor": "s53",
            "marker": "§53",
            "label": "Why the naive reward is catastrophic"
          },
          {
            "anchor": "s54",
            "marker": "§54",
            "label": "The reference model — measuring relative improvement"
          },
          {
            "anchor": "s55",
            "marker": "§55",
            "label": "Assembling the loss"
          }
        ]
      },
      {
        "slug": "part-vii",
        "kicker": "Part VII",
        "title": "THE OTHER ROAD",
        "range": "§56–65",
        "sections": [
          {
            "anchor": "s56",
            "marker": "§56",
            "label": "Two roads from preference data"
          },
          {
            "anchor": "s57",
            "marker": "§57",
            "label": "The reward model — brain surgery on the SFT model"
          },
          {
            "anchor": "s58",
            "marker": "§58",
            "label": "Why this can't be plain gradient descent"
          },
          {
            "anchor": "s59",
            "marker": "§59",
            "label": "The policy gradient theorem — the loophole"
          },
          {
            "anchor": "s60",
            "marker": "§60",
            "label": "Escaping the on-policy prison"
          },
          {
            "anchor": "s61",
            "marker": "§61",
            "label": "Two catastrophes"
          },
          {
            "anchor": "s62",
            "marker": "§62",
            "label": "Step 1 — the KL penalty, a rubber band to sanity"
          },
          {
            "anchor": "s63",
            "marker": "§63",
            "label": "Step 2 — the critic and the advantage"
          },
          {
            "anchor": "s64",
            "marker": "§64",
            "label": "Step 3a — clipping, the governor"
          },
          {
            "anchor": "s65",
            "marker": "§65",
            "label": "Step 3b — the full loss and the training loop"
          }
        ]
      },
      {
        "slug": "part-viii",
        "kicker": "Part VIII",
        "title": "MAKING GENERATION FAST",
        "range": "§66–70",
        "sections": [
          {
            "anchor": "s66",
            "marker": "§66",
            "label": "Where the waste comes from"
          },
          {
            "anchor": "s67",
            "marker": "§67",
            "label": "The triangle of waste"
          },
          {
            "anchor": "s68",
            "marker": "§68",
            "label": "The cached workflow"
          },
          {
            "anchor": "s69",
            "marker": "§69",
            "label": "The code"
          },
          {
            "anchor": "s70",
            "marker": "§70",
            "label": "What the cache costs"
          }
        ]
      },
      {
        "slug": "part-ix",
        "kicker": "Part IX",
        "title": "ATTENTION, TWO MORE ANGLES",
        "range": "§71–73",
        "sections": [
          {
            "anchor": "s71",
            "marker": "§71",
            "label": "The static-embedding problem, restated"
          },
          {
            "anchor": "s72",
            "marker": "§72",
            "label": "Why divide by √d — seeing it happen"
          },
          {
            "anchor": "s73",
            "marker": "§73",
            "label": "A second worked sentence, with the mask"
          }
        ]
      },
      {
        "slug": "part-x",
        "kicker": "Part X",
        "title": "POSITION AS ROTATION (ROPE)",
        "range": "§74–79",
        "sections": [
          {
            "anchor": "s74",
            "marker": "§74",
            "label": "What's wrong with addition"
          },
          {
            "anchor": "s75",
            "marker": "§75",
            "label": "Rotate, don't add — the geometric split"
          },
          {
            "anchor": "s76",
            "marker": "§76",
            "label": "Scaling to real dimensions — the symphony of clocks"
          },
          {
            "anchor": "s77",
            "marker": "§77",
            "label": "The proof — where m and n vanish"
          },
          {
            "anchor": "s78",
            "marker": "§78",
            "label": "The code — precompute, then apply"
          },
          {
            "anchor": "s79",
            "marker": "§79",
            "label": "RoPE as inductive bias"
          }
        ]
      },
      {
        "slug": "part-xi",
        "kicker": "Part XI",
        "title": "FLASHATTENTION",
        "range": "§80–86",
        "sections": [
          {
            "anchor": "s80",
            "marker": "§80",
            "label": "Where ordinary attention actually spends its time"
          },
          {
            "anchor": "s81",
            "marker": "§81",
            "label": "Two ingredients, one file"
          },
          {
            "anchor": "s82",
            "marker": "§82",
            "label": "Why softmax resists tiling"
          },
          {
            "anchor": "s83",
            "marker": "§83",
            "label": "The overflow problem"
          },
          {
            "anchor": "s84",
            "marker": "§84",
            "label": "Reconciling running sums measured against different maxima"
          },
          {
            "anchor": "s85",
            "marker": "§85",
            "label": "The algorithm, five lines"
          },
          {
            "anchor": "s86",
            "marker": "§86",
            "label": "What ships in production"
          }
        ]
      },
      {
        "slug": "part-xii",
        "kicker": "Part XII",
        "title": "QUANTIZATION",
        "range": "§87–92",
        "sections": [
          {
            "anchor": "s87",
            "marker": "§87",
            "label": "The format tax"
          },
          {
            "anchor": "s88",
            "marker": "§88",
            "label": "Affine quantization — the two master formulas"
          },
          {
            "anchor": "s89",
            "marker": "§89",
            "label": "Where to apply it — weights only"
          },
          {
            "anchor": "s90",
            "marker": "§90",
            "label": "The outlier problem — and granularity"
          },
          {
            "anchor": "s91",
            "marker": "§91",
            "label": "INT4 and the byte barrier"
          },
          {
            "anchor": "s92",
            "marker": "§92",
            "label": "When to quantize: PTQ vs QAT"
          }
        ]
      },
      {
        "slug": "part-xiii",
        "kicker": "Part XIII",
        "title": "LORA",
        "range": "§93–96",
        "sections": [
          {
            "anchor": "s93",
            "marker": "§93",
            "label": "The culprit — nn.Linear at scale"
          },
          {
            "anchor": "s94",
            "marker": "§94",
            "label": "Freeze W, learn ΔW — as two small matrices"
          },
          {
            "anchor": "s95",
            "marker": "§95",
            "label": "The class, four parts"
          },
          {
            "anchor": "s96",
            "marker": "§96",
            "label": "Where to put it — and why it works at all"
          }
        ]
      },
      {
        "slug": "part-xiv",
        "kicker": "Part XIV",
        "title": "DIFFUSION MODELS",
        "range": "§97–102",
        "sections": [
          {
            "anchor": "s97",
            "marker": "§97",
            "label": "Destroy — the forward process"
          },
          {
            "anchor": "s98",
            "marker": "§98",
            "label": "Predict the noise, not the image"
          },
          {
            "anchor": "s99",
            "marker": "§99",
            "label": "The architecture — a U-Net that knows the time"
          },
          {
            "anchor": "s100",
            "marker": "§100",
            "label": "Telling the network what time it is"
          },
          {
            "anchor": "s101",
            "marker": "§101",
            "label": "Generation — walk backwards, don't jump"
          },
          {
            "anchor": "s102",
            "marker": "§102",
            "label": "What this omits — and what's changed since"
          }
        ]
      },
      {
        "slug": "part-xv",
        "kicker": "Part XV",
        "title": "ON-POLICY DISTILLATION",
        "range": "§103–108",
        "sections": [
          {
            "anchor": "s103",
            "marker": "§103",
            "label": "Three ways to teach a model, one arithmetic problem"
          },
          {
            "anchor": "s104",
            "marker": "§104",
            "label": "The per-token grade — reverse KL"
          },
          {
            "anchor": "s105",
            "marker": "§105",
            "label": "The six lines"
          },
          {
            "anchor": "s106",
            "marker": "§106",
            "label": "Repairing catastrophic forgetting"
          },
          {
            "anchor": "s107",
            "marker": "§107",
            "label": "Where it breaks — self-distillation and the answer key"
          },
          {
            "anchor": "s108",
            "marker": "§108",
            "label": "Practical limits"
          }
        ]
      },
      {
        "slug": "part-xvi",
        "kicker": "Part XVI",
        "title": "GPU HARDWARE AND TRAINING ECONOMICS",
        "range": "§109–114",
        "sections": [
          {
            "anchor": "s109",
            "marker": "§109",
            "label": "Reading a spec sheet without being fooled"
          },
          {
            "anchor": "s110",
            "marker": "§110",
            "label": "Two formulas: memory and time"
          },
          {
            "anchor": "s111",
            "marker": "§111",
            "label": "Tier one: consumer cards, and the memory trick that makes them viable"
          },
          {
            "anchor": "s112",
            "marker": "§112",
            "label": "Tiers two and three: nodes, clusters, and why talking matters more than math"
          },
          {
            "anchor": "s113",
            "marker": "§113",
            "label": "The lever that matters more than the hardware"
          },
          {
            "anchor": "s114",
            "marker": "§114",
            "label": "Why RLHF is structurally expensive — and one exception worth over-training past optimal"
          }
        ]
      },
      {
        "slug": "part-xvii",
        "kicker": "Part XVII",
        "title": "CLASSICAL ARCHITECTURES: CNNS AND RNNS",
        "range": "§115–120",
        "sections": [
          {
            "anchor": "s115",
            "marker": "§115",
            "label": "Convolution — the sliding dot product"
          },
          {
            "anchor": "s116",
            "marker": "§116",
            "label": "Pooling, receptive field, and the encoder shape"
          },
          {
            "anchor": "s117",
            "marker": "§117",
            "label": "Where CNNs still win, honestly"
          },
          {
            "anchor": "s118",
            "marker": "§118",
            "label": "RNNs and the problem they were built for"
          },
          {
            "anchor": "s119",
            "marker": "§119",
            "label": "LSTM and GRU — gated memory"
          },
          {
            "anchor": "s120",
            "marker": "§120",
            "label": "When each architecture is the right answer"
          }
        ]
      },
      {
        "slug": "part-xviii",
        "kicker": "Part XVIII",
        "title": "RECOMMENDATION SYSTEMS, RANKING, AND SEARCH",
        "range": "§121–126",
        "sections": [
          {
            "anchor": "s121",
            "marker": "§121",
            "label": "The two-stage funnel — why nobody scores everything"
          },
          {
            "anchor": "s122",
            "marker": "§122",
            "label": "Candidate generation — collaborative filtering and two-tower retrieval"
          },
          {
            "anchor": "s123",
            "marker": "§123",
            "label": "Ranking — learning to rank, and why order (not just correctness) is the target"
          },
          {
            "anchor": "s124",
            "marker": "§124",
            "label": "Ranking metrics — why accuracy is the wrong metric here"
          },
          {
            "anchor": "s125",
            "marker": "§125",
            "label": "Cold start and exploration"
          },
          {
            "anchor": "s126",
            "marker": "§126",
            "label": "Ads ranking specifics — the auction layer on top"
          }
        ]
      },
      {
        "slug": "part-xix",
        "kicker": "Part XIX",
        "title": "A/B TESTING AND EVALUATION METHODOLOGY",
        "range": "§127–132",
        "sections": [
          {
            "anchor": "s127",
            "marker": "§127",
            "label": "Hypothesis testing, refreshed"
          },
          {
            "anchor": "s128",
            "marker": "§128",
            "label": "Sample size and minimum detectable effect"
          },
          {
            "anchor": "s129",
            "marker": "§129",
            "label": "The pitfalls that actually get asked about"
          },
          {
            "anchor": "s130",
            "marker": "§130",
            "label": "Offline metrics lie — and it's the same failure as reward hacking"
          },
          {
            "anchor": "s131",
            "marker": "§131",
            "label": "Sequential testing — solving peeking properly"
          },
          {
            "anchor": "s132",
            "marker": "§132",
            "label": "Applying this to ML specifically"
          }
        ]
      },
      {
        "slug": "part-xx",
        "kicker": "Part XX",
        "title": "DISTRIBUTED SYSTEMS FUNDAMENTALS",
        "range": "§133–138",
        "sections": [
          {
            "anchor": "s133",
            "marker": "§133",
            "label": "CAP theorem and consistency models"
          },
          {
            "anchor": "s134",
            "marker": "§134",
            "label": "Databases — SQL vs. NoSQL, indexing, replication, sharding"
          },
          {
            "anchor": "s135",
            "marker": "§135",
            "label": "Caching — the concept behind Part XI's SRAM/HBM split, one layer up"
          },
          {
            "anchor": "s136",
            "marker": "§136",
            "label": "Load balancing and horizontal scaling"
          },
          {
            "anchor": "s137",
            "marker": "§137",
            "label": "Message queues and asynchronous processing"
          },
          {
            "anchor": "s138",
            "marker": "§138",
            "label": "Assembling the non-ML half of an ML system design answer"
          }
        ]
      },
      {
        "slug": "part-xxi",
        "kicker": "Part XXI",
        "title": "CODING INTERVIEW FUNDAMENTALS",
        "range": "§139–144",
        "sections": [
          {
            "anchor": "s139",
            "marker": "§139",
            "label": "The process — before writing any code"
          },
          {
            "anchor": "s140",
            "marker": "§140",
            "label": "Big-O, without hand-waving"
          },
          {
            "anchor": "s141",
            "marker": "§141",
            "label": "Pattern 1 — two pointers and sliding window"
          },
          {
            "anchor": "s142",
            "marker": "§142",
            "label": "Pattern 2 — binary search, and where it hides"
          },
          {
            "anchor": "s143",
            "marker": "§143",
            "label": "Pattern 3 — graph and tree traversal"
          },
          {
            "anchor": "s144",
            "marker": "§144",
            "label": "Pattern 4 — dynamic programming, heaps, and tries"
          }
        ]
      },
      {
        "slug": "appendix-a",
        "kicker": "Appendix A",
        "title": "ERRATA AND CORRECTIONS",
        "range": null,
        "sections": []
      },
      {
        "slug": "appendix-b",
        "kicker": "Appendix B",
        "title": "SELF-CHECK",
        "range": null,
        "sections": [
          {
            "anchor": "epilogue-the-whole-thing-in-one-paragraph",
            "marker": null,
            "label": "Epilogue — the whole thing in one paragraph"
          }
        ]
      },
      {
        "slug": "appendix-c",
        "kicker": "Appendix C",
        "title": "NOTATION",
        "range": null,
        "sections": []
      },
      {
        "slug": "appendix-d",
        "kicker": "Appendix D",
        "title": "SHAPE REFERENCE",
        "range": null,
        "sections": []
      },
      {
        "slug": "appendix-e",
        "kicker": "Appendix E",
        "title": "THE INTERVIEW LAYER",
        "range": null,
        "sections": [
          {
            "anchor": "se1",
            "marker": "E.1",
            "label": "The loop, in outline"
          },
          {
            "anchor": "se2",
            "marker": "E.2",
            "label": "Recurring technical questions, mapped to this book"
          },
          {
            "anchor": "se3",
            "marker": "E.3",
            "label": "ML system design — the six-step shape"
          },
          {
            "anchor": "se4",
            "marker": "E.4",
            "label": "How the format itself is changing"
          },
          {
            "anchor": "se5",
            "marker": "E.5",
            "label": "What used to be missing — now covered, plus what still can't be"
          }
        ]
      },
      {
        "slug": "appendix-f",
        "kicker": "Appendix F",
        "title": "A CODING PRACTICE SET",
        "range": null,
        "sections": [
          {
            "anchor": "sf1",
            "marker": "F.1",
            "label": "Two pointers / sliding window (Part XXI §141)"
          },
          {
            "anchor": "sf2",
            "marker": "F.2",
            "label": "Binary search (Part XXI §142)"
          },
          {
            "anchor": "sf3",
            "marker": "F.3",
            "label": "Graph and tree traversal (Part XXI §143)"
          },
          {
            "anchor": "sf4",
            "marker": "F.4",
            "label": "Dynamic programming (Part XXI §144)"
          },
          {
            "anchor": "sf5",
            "marker": "F.5",
            "label": "Heaps, tries, and union-find (Part XXI §144)"
          },
          {
            "anchor": "sf6",
            "marker": "F.6",
            "label": "A practice tracker"
          }
        ]
      },
      {
        "slug": "appendix-g",
        "kicker": "Appendix G",
        "title": "BEHAVIORAL INTERVIEW PREPARATION",
        "range": null,
        "sections": [
          {
            "anchor": "sg1",
            "marker": "G.1",
            "label": "Why STAR, and what it's actually checking for"
          },
          {
            "anchor": "sg2",
            "marker": "G.2",
            "label": "The recurring question categories"
          },
          {
            "anchor": "sg3",
            "marker": "G.3",
            "label": "The story-bank method"
          },
          {
            "anchor": "sg4",
            "marker": "G.4",
            "label": "Delivery, and the tells that undermine a good story"
          }
        ]
      },
      {
        "slug": "appendix-h",
        "kicker": "Appendix H",
        "title": "PRODUCT SENSE AND COMPANY RESEARCH",
        "range": null,
        "sections": [
          {
            "anchor": "sh1",
            "marker": "H.1",
            "label": "A framework for product-sense questions"
          },
          {
            "anchor": "sh2",
            "marker": "H.2",
            "label": "Pre-interview company research — a checklist, not a fact sheet"
          },
          {
            "anchor": "sh3",
            "marker": "H.3",
            "label": "Questions worth asking back, and why they signal product thinking"
          }
        ]
      }
    ]
  }
]
