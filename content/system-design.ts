import type { SdPattern, SdQuestion } from '@/lib/content/schema'

export const sdPatterns: SdPattern[] = [
  {
    id: 'sdp-load-balancing-gateways',
    group: 'general',
    name: 'Load Balancing & Gateways',
    order: 1,
    solves: 'Spreads incoming traffic across a fleet and gives every request a single, policy-enforcing front door.',
    tradeoffs: [
      'Round robin is simple and fair by count, but ignores server load; least-connections tracks load but costs a lookup on every request.',
      'A single gateway centralizes auth, rate limiting, and routing, but becomes a shared failure domain and an extra network hop.',
      'L4 load balancing is fast and protocol-agnostic; L7 load balancing enables routing by path or header at the cost of terminating and re-establishing connections.',
    ],
  },
  {
    id: 'sdp-caching',
    group: 'general',
    name: 'Caching',
    order: 2,
    solves: 'Cuts read latency and backend load by serving repeated reads from memory closer to the caller.',
    tradeoffs: [
      'Cache-aside is simple and resilient but serves a cold miss on every first read; write-through keeps the cache warm at the cost of write latency.',
      'A longer TTL raises hit rate and lowers cost, but widens the window where users see stale data.',
      'Per-node local caches are fast but diverge; a shared cache is consistent but adds a network hop and a failure domain.',
    ],
  },
  {
    id: 'sdp-database-choice-indexing',
    group: 'general',
    name: 'Database Choice & Indexing',
    order: 3,
    solves: 'Matches storage engine and index shape to the read and write patterns so queries stay fast as data grows.',
    tradeoffs: [
      'A relational store gives joins and multi-row transactions but forces a schema and a scaling plan up front; a key-value or document store scales writes easily but pushes joins into application code.',
      'More secondary indexes speed reads but slow every write and grow storage.',
      'A composite index serves prefix queries fast, but a query that skips the leading column falls back to a full scan.',
    ],
  },
  {
    id: 'sdp-sharding-replication',
    group: 'general',
    name: 'Sharding & Replication',
    order: 4,
    solves: 'Scales storage and throughput past one machine by splitting data across shards and copying it across replicas.',
    tradeoffs: [
      'Hash-based sharding spreads load evenly but makes range queries scatter across every shard; range-based sharding keeps ranges local but risks hot shards.',
      'More replicas raise read capacity and durability but increase replication lag and write fan-out cost.',
      'Synchronous replication guarantees a durable write on every replica but adds latency; asynchronous replication is fast but risks losing the last writes on failover.',
    ],
  },
  {
    id: 'sdp-consistency-tradeoffs',
    group: 'general',
    name: 'Consistency Trade-offs',
    order: 5,
    solves: 'Chooses how strongly reads must reflect the latest write when a system is partitioned or replicated.',
    tradeoffs: [
      'Strong consistency gives every reader the latest write but stalls or fails during a partition; eventual consistency stays available but can return stale reads.',
      'Quorum reads and writes tune the strong-to-available spectrum, but a larger quorum raises latency and lowers availability under node loss.',
      'Optimistic concurrency (version checks) avoids locking and scales well but forces the client to retry on conflict; pessimistic locking avoids retries but serializes contending writers.',
    ],
  },
  {
    id: 'sdp-message-queues',
    group: 'general',
    name: 'Message Queues',
    order: 6,
    solves: 'Decouples producers from consumers and absorbs bursts so a slow or failing downstream does not block upstream work.',
    tradeoffs: [
      'At-least-once delivery is simple and never silently drops a message, but forces every consumer to be idempotent; exactly-once semantics remove that burden at real cost in throughput and complexity.',
      'A longer retention window survives longer consumer outages but costs more storage and slows compaction.',
      'A single partition preserves strict ordering but caps throughput to one consumer; more partitions scale throughput but only order within a partition.',
    ],
  },
  {
    id: 'sdp-rate-limiting',
    group: 'general',
    name: 'Rate Limiting',
    order: 7,
    solves: 'Protects shared resources from being overwhelmed by any single caller by capping request rate per key.',
    tradeoffs: [
      'Fixed window is cheap to compute but allows a burst of up to 2x the limit at window boundaries; sliding window is accurate but costs more state per key.',
      'Token bucket allows controlled bursts and smooths traffic; leaky bucket enforces a strict output rate but adds queuing latency.',
      'Limiting at the gateway is centralized and simple to change, but a shared counter store becomes a bottleneck and a single point of failure at high QPS.',
    ],
  },
  {
    id: 'sdp-cdn-object-storage',
    group: 'general',
    name: 'CDN & Object Storage',
    order: 8,
    solves: 'Serves large or popular static and media assets from storage and edge caches instead of application servers.',
    tradeoffs: [
      'Pushing content to every edge location ahead of time (push CDN) guarantees a warm cache but wastes space on unpopular content; pulling on first miss (pull CDN) uses space efficiently but serves a slow first request per region.',
      'Object storage is durable and cheap per gigabyte but has higher per-request latency than a local disk or block store.',
      'Long cache TTLs at the edge cut origin load and cost but delay propagation of updated or deleted content.',
    ],
  },
  {
    id: 'sdp-observability',
    group: 'general',
    name: 'Observability',
    order: 9,
    solves: 'Gives operators the metrics, logs, and traces needed to detect, localize, and diagnose a production problem quickly.',
    tradeoffs: [
      'Metrics are cheap to store and query at scale but lose per-request detail; traces keep that detail but cost far more to collect and retain at 100% sampling.',
      'Push-based metrics collection is simple for the emitter but risks overwhelming the collector under load; pull-based scraping paces itself but adds discovery complexity.',
      'Alerting on symptoms (latency, error rate) catches user-facing pain directly, but alerting only on causes (CPU, queue depth) can miss failures that symptoms would have caught first.',
    ],
  },
  {
    id: 'sdp-idempotency-retries',
    group: 'general',
    name: 'Idempotency & Retries',
    order: 10,
    solves: 'Makes retried operations safe to repeat so network failures and client retries never duplicate an effect like a charge or a message.',
    tradeoffs: [
      'A client-supplied idempotency key stops duplicate side effects but requires the server to store and expire a dedup table.',
      'Retrying immediately recovers fast from a transient blip but can pile onto an already-struggling downstream; exponential backoff with jitter is gentler but slower to recover.',
      'At-least-once processing with idempotent handlers is simpler to build than distributed transactions, but pushes correctness onto every handler author.',
    ],
  },
  {
    id: 'mlp-retrieval-ranking',
    group: 'ml',
    name: 'Retrieval & Ranking',
    order: 11,
    solves: 'Narrows a huge catalog to a small, personalized, ranked set of candidates within a tight latency budget.',
    tradeoffs: [
      'A two-stage candidate-generation-then-ranking pipeline scales to huge catalogs cheaply, but caps final quality on whatever the first stage failed to retrieve.',
      'A heavier ranker (more features, a deeper model) improves relevance but raises serving latency and cost per request.',
      'Collaborative filtering needs no content features and captures taste well, but suffers a cold-start problem that content-based signals solve at the cost of feature engineering.',
    ],
  },
  {
    id: 'mlp-feature-stores',
    group: 'ml',
    name: 'Feature Stores',
    order: 12,
    solves: 'Serves consistent, low-latency features to both training and online inference from one governed source of truth.',
    tradeoffs: [
      'Precomputing and caching features online cuts inference latency but risks staleness versus features computed on demand.',
      'Sharing one feature definition between training and serving prevents train-serve skew, but couples the two pipelines and slows independent iteration.',
      'A richer feature set improves model quality but each added feature widens the pipeline\'s latency budget and failure surface.',
    ],
  },
  {
    id: 'mlp-model-serving-batching',
    group: 'ml',
    name: 'Model Serving & Batching',
    order: 13,
    solves: 'Runs trained models in production at the throughput, latency, and cost the product requires.',
    tradeoffs: [
      'Dynamic batching raises GPU utilization and throughput but adds queuing latency to the request that triggers the batch.',
      'A bigger model improves accuracy but multiplies serving cost and latency; a distilled or quantized model trades some accuracy for both.',
      'Autoscaling on queue depth reacts to real backlog but lags a sudden spike; overprovisioning avoids that lag at standing cost.',
    ],
  },
  {
    id: 'mlp-training-pipelines-registries',
    group: 'ml',
    name: 'Training Pipelines & Registries',
    order: 14,
    solves: 'Turns raw data into a reproducible, versioned, deployable model through a pipeline that can be audited and rolled back.',
    tradeoffs: [
      'A fully automated retraining pipeline keeps a model fresh with less toil, but can silently ship a regression without a human in the loop.',
      'Versioning every dataset and model artifact enables exact rollback and audit, but multiplies storage cost as history accumulates.',
      'Training on the freshest data captures recent shifts fastest, but a shorter window is noisier and more prone to overfitting on transient patterns.',
    ],
  },
  {
    id: 'mlp-monitoring-drift',
    group: 'ml',
    name: 'Monitoring & Drift',
    order: 15,
    solves: 'Detects when a live model\'s inputs or performance have shifted enough from training conditions to need attention.',
    tradeoffs: [
      'Monitoring input feature distributions catches drift early, before it shows up in outcomes, but produces more false alarms than monitoring the true label directly.',
      'Waiting for ground-truth labels gives the most reliable drift signal but arrives with a delay that can be days for some labels; proxy metrics are immediate but noisier.',
      'A tighter drift threshold triggers retraining sooner and protects quality, but costs more compute and risks alert fatigue from noise.',
    ],
  },
  {
    id: 'mlp-experimentation',
    group: 'ml',
    name: 'Experimentation',
    order: 16,
    solves: 'Measures whether a model or ranking change actually improves the metric that matters before it ships to everyone.',
    tradeoffs: [
      'Randomizing by user gives clean statistics but leaks network or feed effects between treatment and control that a cluster-randomized design avoids at the cost of statistical power.',
      'A longer test window catches novelty and delayed effects but delays shipping and risks confounding from external events.',
      'An online A/B test measures real user impact directly, but an offline replay or counterfactual eval is cheaper and faster to iterate on before committing traffic.',
    ],
  },
  {
    id: 'mlp-feedback-loops',
    group: 'ml',
    name: 'Feedback Loops',
    order: 17,
    solves: 'Turns user and moderator signals back into labeled training data without the model reinforcing its own past mistakes.',
    tradeoffs: [
      'Training directly on implicit engagement signals scales labeling for free, but can amplify the model\'s own biases (a feedback loop) that curated human labels avoid at real cost.',
      'Fast automatic relabeling from new signals keeps the model current, but skips the review step that catches a poisoned or adversarial signal.',
      'Sampling hard or disputed cases for human review improves label quality where it matters most, but costs more reviewer time per labeled example than random sampling.',
    ],
  },
  {
    id: 'mlp-llm-serving',
    group: 'ml',
    name: 'LLM Serving',
    order: 18,
    solves: 'Serves autoregressive LLM inference at acceptable latency, throughput, and cost per token for many concurrent users.',
    tradeoffs: [
      'Continuous batching keeps GPUs busy across requests with different lengths and raises throughput, but adds implementation complexity over static batching.',
      'A larger context window lets the model use more history, but decode cost and KV cache memory both grow with it.',
      'Streaming tokens back improves perceived latency (time to first token), but complicates client handling versus waiting for the full response.',
    ],
  },
  {
    id: 'mlp-rag-systems',
    group: 'ml',
    name: 'RAG Systems',
    order: 19,
    solves: 'Grounds LLM answers in retrieved, current, or private documents instead of relying only on parametric memory.',
    tradeoffs: [
      'Dense retrieval finds paraphrased matches that keyword search misses, but keyword (BM25) retrieval finds exact terms, ids, and rare tokens that embeddings blur; hybrid retrieval keeps both at the cost of running two indexes.',
      'A reranker improves precision on the top results, but adds a second inference pass and latency to every query.',
      'Smaller chunks retrieve more precisely, but lose surrounding context that larger chunks preserve at the cost of retrieval precision and prompt size.',
    ],
  },
  {
    id: 'mlp-agent-platforms',
    group: 'ml',
    name: 'Agent Platforms',
    order: 20,
    solves: 'Lets an LLM plan, call tools, and take multi-step action toward a goal while keeping failures contained and reviewable.',
    tradeoffs: [
      'Autonomous execution is fast and needs no human in the loop, but a human-approval gate on irreversible actions trades speed for a hard ceiling on blast radius.',
      'Giving the agent broad tool permissions increases what it can accomplish unassisted, but narrow, scoped permissions bound the damage from a bad plan or a prompt injection.',
      'A single powerful agent is simpler to build and debug than a multi-agent system, but a multi-agent system with a planner and specialized workers isolates failures and scales to more complex tasks.',
    ],
  },
]

export const sdQuestions: SdQuestion[] = [
  // ---------------------------------------------------------------------
  // sdp-load-balancing-gateways
  // ---------------------------------------------------------------------
  {
    id: 'sdq-api-gateway',
    patternId: 'sdp-load-balancing-gateways',
    title: 'Design an API gateway',
    tier: 2,
    companies: ['amazon', 'google'],
    minutes: 60,
    steps: {
      define: [
        'Which cross-cutting concerns does the gateway own: auth, rate limiting, routing, request/response transformation?',
        'Do all backend services sit behind one gateway, or does each team run its own with a shared library?',
        'What is the target added latency budget for a hop through the gateway?',
      ],
      data: [
        'What routing table maps a path or host to a backend service, and how is it updated without downtime?',
        'Where do auth tokens and rate-limit counters live so every gateway instance agrees?',
      ],
      architecture: [
        'Walk through a request from client to backend and back: what does the gateway do at each stage?',
        'How does the gateway discover healthy backend instances, and how fast does it react to one going down?',
        'How do you handle a backend that needs a different protocol or payload shape than the client sent?',
      ],
      evaluate: [
        'What would you measure to prove the gateway is not the latency bottleneck at p99?',
        'How do you load-test the gateway itself, independent of the backends behind it?',
      ],
      deploy: [
        'How do you roll out a routing change without dropping in-flight requests?',
        'What is the failure mode if the gateway fleet itself goes down, and how do you avoid a single point of failure?',
      ],
      wrapup: [
        'What single number (added latency, error rate) would tell you the gateway itself, not the backends, is the bottleneck?',
        'What would you tell the interviewer you deliberately left out of scope for a first version?',
      ],
    },
  },
  {
    id: 'sdq-url-shortener',
    patternId: 'sdp-load-balancing-gateways',
    title: 'Design a URL shortener',
    tier: 1,
    companies: ['amazon', 'google', 'meta'],
    minutes: 45,
    steps: {
      define: [
        'Do short codes need to be unguessable, or is sequential fine? Does a custom alias feature change that?',
        'What is the read:write ratio, and does that ratio change your storage and caching choices?',
        'Do links expire, and what happens on a collision or a request for an unknown code?',
      ],
      data: [
        'How do you generate a unique short code: counter plus base62, hash plus collision check, or pre-generated pool?',
        'What does the mapping table look like, and what index makes a redirect lookup O(1)?',
      ],
      architecture: [
        'Walk through the write path for creating a short link and the read path for a redirect.',
        'Where does caching go to keep hot links fast, and what evicts from that cache?',
        'How would you shard the mapping table once it outgrows one database?',
      ],
      evaluate: [
        'How do you verify short codes never collide under concurrent creation?',
        'What would a load test on the redirect path need to simulate realistically?',
      ],
      deploy: [
        'How do you scale the redirect service independently from the creation service?',
        'What happens to analytics counting if the redirect service restarts mid-request?',
      ],
      wrapup: [
        'What assumption about the read:write ratio would you test first before committing to this cache strategy?',
        'What part of this design would you cut if you had one day to ship a working version?',
      ],
    },
  },
  {
    id: 'sdq-login-authentication',
    patternId: 'sdp-load-balancing-gateways',
    title: 'Design a login and authentication system',
    tier: 1,
    companies: ['amazon', 'google', 'apple'],
    minutes: 45,
    steps: {
      define: [
        'What credentials are supported: password, OAuth, passkeys? Does that change per client type?',
        'What does a session need to survive: one device, multiple devices, a server restart?',
        'What is the acceptable time to revoke access everywhere after a password change or a stolen token?',
      ],
      data: [
        'How are passwords stored, and what does the hashing scheme cost per login attempt?',
        'Where do sessions or tokens live: stateful server-side sessions or stateless signed tokens, and what does each cost to revoke?',
      ],
      architecture: [
        'Walk through the login flow end to end, including where the gateway enforces auth on every other request.',
        'How does token refresh work without forcing a re-login, and what happens if the refresh token is stolen?',
        'How do you support single sign-on across multiple first-party services?',
      ],
      evaluate: [
        'How would you detect a credential-stuffing attack in progress?',
        'What metric proves the login path is not the latency bottleneck under load?',
      ],
      deploy: [
        'How do you rotate the signing key for tokens without invalidating every live session at once?',
        'What is the blast radius if the auth service goes down, and how do other services degrade?',
      ],
      wrapup: [
        'Restate the token strategy and the one property it trades away versus the alternative.',
        'Name the first thing you would harden after a red-team review of this design.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // sdp-caching
  // ---------------------------------------------------------------------
  {
    id: 'sdq-simple-cache',
    patternId: 'sdp-caching',
    title: 'Design a simple key-value cache',
    tier: 1,
    companies: ['google', 'meta'],
    minutes: 45,
    steps: {
      define: [
        'What is the working set size, and does it fit on one node or must it be distributed?',
        'What eviction policy fits the access pattern: LRU, LFU, or TTL-based?',
        'Is a stale read ever acceptable, or must every read reflect the latest write?',
      ],
      data: [
        'What data structure gives O(1) get, put, and eviction: hash map plus doubly linked list for LRU?',
        'What is the memory overhead per entry, and how does that cap total capacity?',
      ],
      architecture: [
        'Walk through a get and a put, including what happens on eviction.',
        'How would you make this thread-safe under concurrent access without serializing every request?',
        'How would you shard this cache across multiple nodes if the working set outgrows one machine?',
      ],
      evaluate: [
        'What would you measure to know the eviction policy fits the real access pattern?',
        'How do you test correctness of eviction order under concurrent puts and gets?',
      ],
      deploy: [
        'What happens to correctness and hit rate when a node restarts and loses its in-memory state?',
        'How do you resize capacity in production without a full flush?',
      ],
      wrapup: [
        'What metric would most quickly tell you the eviction policy is wrong for the real workload?',
        'What would you tell the interviewer you deliberately skipped to keep this design simple?',
      ],
    },
  },
  {
    id: 'sdq-distributed-cache',
    patternId: 'sdp-caching',
    title: 'Design a distributed cache',
    tier: 2,
    companies: ['amazon', 'google'],
    minutes: 60,
    steps: {
      define: [
        'What is the target hit rate and p99 latency, and what workload (read-heavy, write-heavy) drives the design?',
        'Does the cache sit in front of one datastore or many, and does that change invalidation?',
        'Is cache-aside, write-through, or write-behind the right pattern for this workload?',
      ],
      data: [
        'How is a key mapped to a node: consistent hashing, and what happens to that mapping when a node joins or leaves?',
        'What does an entry carry beyond the value: TTL, version, or a vector clock for conflict detection?',
      ],
      architecture: [
        'Walk through a get that misses locally, and a write that must invalidate copies on other nodes.',
        'How do you avoid a thundering herd when a hot key expires and many clients recompute it at once?',
        'How do you replicate hot keys to survive one node\'s failure without replicating the entire dataset?',
      ],
      evaluate: [
        'How do you measure hit rate per key population, not just in aggregate?',
        'What load test would expose a hot-key bottleneck on one node?',
      ],
      deploy: [
        'How do you add a node to the ring without a mass cache miss during rebalancing?',
        'What is the fallback when the cache layer itself is down: serve stale, or hit the datastore directly at full load?',
      ],
      wrapup: [
        'Restate the invalidation strategy and the staleness window it accepts.',
        'Name the bottleneck at 10x key cardinality and what you would change first.',
      ],
    },
  },
  {
    id: 'sdq-typeahead-search',
    patternId: 'sdp-caching',
    title: 'Design a typeahead (autocomplete) search system',
    tier: 2,
    companies: ['google', 'meta'],
    minutes: 60,
    steps: {
      define: [
        'What is the latency budget per keystroke, and how many suggestions does the client show?',
        'Are suggestions global and precomputed, or personalized per user in real time?',
        'How fresh must trending queries be reflected in results?',
      ],
      data: [
        'What data structure serves prefix lookups fast: a trie, and how do you keep top-k suggestions cached at each node?',
        'How is query frequency data collected and aggregated to rank suggestions?',
      ],
      architecture: [
        'Walk through a keystroke: client debounce, request, prefix lookup, ranked response.',
        'How do you update the trie with new trending queries without rebuilding it from scratch?',
        'How would you shard the trie if the vocabulary is too large for one node?',
      ],
      evaluate: [
        'How do you measure whether suggestions are actually helping, versus just being fast?',
        'What would a load test need to simulate to catch a hot-prefix bottleneck?',
      ],
      deploy: [
        'How do you refresh the aggregated frequency data on a schedule without serving inconsistent ranked lists mid-swap?',
        'What is the fallback if the suggestion service times out: no suggestions, or a cached stale list?',
      ],
      wrapup: [
        'Restate the freshness-versus-cost trade-off you chose for trending queries.',
        'Name the first thing that breaks if query volume grows 50x.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // sdp-database-choice-indexing
  // ---------------------------------------------------------------------
  {
    id: 'sdq-key-value-store',
    patternId: 'sdp-database-choice-indexing',
    title: 'Design a key-value store',
    tier: 1,
    companies: ['amazon', 'google'],
    minutes: 45,
    steps: {
      define: [
        'What operations must it support beyond get and put: range scans, TTL, conditional writes?',
        'What consistency model does a client expect after a write: read-your-writes, or eventual?',
        'What is the expected key and value size distribution, and does that rule out any storage engine?',
      ],
      data: [
        'What on-disk structure fits write-heavy workloads: an LSM tree, and what does compaction cost?',
        'How is data partitioned across nodes, and what happens to a partition on node failure?',
      ],
      architecture: [
        'Walk through a write: which node accepts it, how is it replicated, when is it acknowledged?',
        'Walk through a read: how does the client find the right node, and what happens on a replica lag?',
        'How do you handle a conflicting concurrent write to the same key across replicas?',
      ],
      evaluate: [
        'How do you benchmark write amplification from compaction under sustained load?',
        'What test would prove the replication scheme actually survives a node failure without data loss?',
      ],
      deploy: [
        'How do you rebalance partitions when adding a node without pausing writes?',
        'What is the operational runbook when a replica falls significantly behind?',
      ],
      wrapup: [
        'What number of replicas would you pick as a starting default, and what would make you change it?',
        'What assumption about write patterns would you test first before trusting this partitioning scheme?',
      ],
    },
  },
  {
    id: 'sdq-leaderboard',
    patternId: 'sdp-database-choice-indexing',
    title: 'Design a real-time leaderboard',
    tier: 1,
    companies: ['amazon', 'meta'],
    minutes: 45,
    steps: {
      define: [
        'How many players and how often does a score update: every game, every action?',
        'What views are needed: global top-N, a player\'s rank and nearby competitors, per-region boards?',
        'How fresh must the leaderboard be after a score update: instant, or a few seconds of lag acceptable?',
      ],
      data: [
        'What data structure gives O(log n) rank and update: a sorted set, and how does it scale past one node\'s memory?',
        'How do you store per-region or per-mode boards without duplicating all player data?',
      ],
      architecture: [
        'Walk through a score update and what it takes to reflect in both the global board and a player\'s rank query.',
        'How would you shard a sorted-set-backed leaderboard once it outgrows one node?',
        'How do you compute "nearby competitors" efficiently without scanning the whole board?',
      ],
      evaluate: [
        'How do you test that rank queries stay fast as the player count grows to millions?',
        'What would you measure to catch a hot leaderboard (one region, one event) overwhelming one shard?',
      ],
      deploy: [
        'How do you reset or archive a leaderboard at season end without downtime?',
        'What is the fallback if the ranking store is briefly unavailable: cached last-known ranks?',
      ],
      wrapup: [
        'Restate the data structure choice and the operation it makes cheap at the cost of another.',
        'Name the bottleneck at 100x concurrent players and what you would change first.',
      ],
    },
  },
  {
    id: 'sdq-hotel-booking',
    patternId: 'sdp-database-choice-indexing',
    title: 'Design a hotel booking system',
    tier: 2,
    companies: ['amazon', 'apple'],
    minutes: 60,
    steps: {
      define: [
        'What must never happen: double-booking the same room for overlapping dates?',
        'What is the search pattern: by city, date range, price, and amenities, and which must be fast?',
        'Does the system need to hold inventory during checkout, and for how long?',
      ],
      data: [
        'What schema and index support a fast search across city, date range, and availability simultaneously?',
        'How is room availability represented so a date-range overlap check is efficient?',
      ],
      architecture: [
        'Walk through a booking: how do you guarantee no two customers reserve the same room for overlapping nights?',
        'How does search stay fast when availability changes constantly across thousands of properties?',
        'How would you handle a short-lived hold during checkout that expires if payment fails?',
      ],
      evaluate: [
        'How would you test for double-booking under concurrent requests for the same room and dates?',
        'What would you measure to prove search latency holds up as inventory grows?',
      ],
      deploy: [
        'How do you handle a payment provider outage mid-booking without leaving a room stuck as held?',
        'What is the reconciliation process if a booking succeeds but the confirmation notification fails?',
      ],
      wrapup: [
        'Restate the concurrency control chosen to prevent double-booking and its cost.',
        'Name the first thing you would optimize if search latency became the complaint.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // sdp-sharding-replication
  // ---------------------------------------------------------------------
  {
    id: 'sdq-pastebin',
    patternId: 'sdp-sharding-replication',
    title: 'Design a Pastebin-style text-sharing service',
    tier: 1,
    companies: ['amazon', 'meta'],
    minutes: 45,
    steps: {
      define: [
        'What is the size limit per paste, and does the system support expiration?',
        'What is the read:write ratio, and is content ever edited after creation?',
        'Do pastes need access control, or are they public by a shared link?',
      ],
      data: [
        'How do you generate a unique id for each paste, and where do you store the content itself?',
        'Do you store paste content in the same database as metadata, or in blob storage with metadata pointing at it?',
      ],
      architecture: [
        'Walk through create and read paths, including where caching sits for popular pastes.',
        'How would you shard the metadata store as paste count grows past one node\'s capacity?',
        'How do you handle expiration cleanup without a full table scan?',
      ],
      evaluate: [
        'How do you test that expired pastes actually stop being served?',
        'What would a load test on the read path need to simulate given a long-tail popularity distribution?',
      ],
      deploy: [
        'How do you scale reads and writes independently given the read-heavy skew?',
        'What is the fallback if blob storage is briefly unavailable for a read?',
      ],
      wrapup: [
        'What would you tell the interviewer you deliberately skipped: access control, abuse detection, or something else?',
        'What part of this design would you cut first under a one-day deadline?',
      ],
    },
  },
  {
    id: 'sdq-file-storage',
    patternId: 'sdp-sharding-replication',
    title: 'Design a file storage and sync service (Dropbox-style)',
    tier: 1,
    companies: ['meta', 'amazon'],
    minutes: 45,
    steps: {
      define: [
        'What must sync guarantee: eventual consistency across devices, or a stronger ordering?',
        'What is the largest file size supported, and does that force chunking?',
        'Does the system need to support offline edits that reconcile later?',
      ],
      data: [
        'How is a file represented: as chunks with content hashes for dedup, and what metadata tracks versions?',
        'What index lets a client quickly find which chunks changed since its last sync?',
      ],
      architecture: [
        'Walk through an upload: chunking, hashing, dedup check, and notifying other devices.',
        'How do you shard file metadata and chunk storage as the user base grows?',
        'How do you resolve a conflicting edit made offline on two devices?',
      ],
      evaluate: [
        'How would you test that dedup actually saves storage across users with the same file?',
        'What would you measure to catch a sync storm from many devices reconnecting after an outage?',
      ],
      deploy: [
        'How do you replicate chunk storage across regions for durability without duplicating every chunk everywhere?',
        'What happens to an in-progress upload if the client disconnects mid-chunk?',
      ],
      wrapup: [
        'Restate the chunk-and-hash strategy and what it buys versus whole-file sync.',
        'Name the first scaling limit you would hit with 10x more users.',
      ],
    },
  },
  {
    id: 'sdq-content-management-system',
    patternId: 'sdp-sharding-replication',
    title: 'Design a content management system for a publishing platform',
    tier: 1,
    companies: ['meta', 'amazon'],
    minutes: 45,
    steps: {
      define: [
        'Does content need draft, review, and published states, and who can move it between them?',
        'What is the read:write ratio, given that published content is read far more than it is written?',
        'Must edits be versioned so a previous revision can be restored?',
      ],
      data: [
        'What schema separates draft content from published content, and how do you avoid readers seeing half-published edits?',
        'How is revision history stored without bloating the primary content table?',
      ],
      architecture: [
        'Walk through publishing: how does a draft become visible to readers atomically?',
        'How would you shard content storage across topics, authors, or time as volume grows?',
        'Where does caching sit for published content, and how is it invalidated on a new revision?',
      ],
      evaluate: [
        'How do you test that a reader never sees a partially applied edit?',
        'What would you measure to confirm the read path scales as published content grows?',
      ],
      deploy: [
        'How do you roll back to a previous revision in production without downtime?',
        'What is the fallback if the search index used to browse content falls behind the primary store?',
      ],
      wrapup: [
        'Restate the draft-versus-published data model and why it avoids partial reads.',
        'Name the bottleneck at 100x content volume and what changes first.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // sdp-consistency-tradeoffs
  // ---------------------------------------------------------------------
  {
    id: 'sdq-digital-wallet',
    patternId: 'sdp-consistency-tradeoffs',
    title: 'Design a digital wallet / payments ledger',
    tier: 2,
    companies: ['apple', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What must never happen: a balance going negative, or a transfer being applied twice?',
        'Does the system need strong consistency on balance reads, or is a brief staleness acceptable?',
        'What is the audit requirement: must every balance change be reconstructable from a log?',
      ],
      data: [
        'Do you store a mutable balance column, or derive balance from an append-only ledger of transactions?',
        'What isolation level or locking scheme prevents a double-spend on concurrent transfers from the same account?',
      ],
      architecture: [
        'Walk through a transfer between two accounts: what makes it atomic across both balances?',
        'How do you scale the ledger once one account becomes extremely hot (a popular merchant)?',
        'How does an idempotency key prevent a retried transfer from double-applying?',
      ],
      evaluate: [
        'How would you test for double-spend under concurrent transfer requests on the same account?',
        'What would you measure to catch a reconciliation mismatch between ledger and balance cache?',
      ],
      deploy: [
        'How do you handle a partial failure where the debit succeeds but the credit fails?',
        'What is the reconciliation and alerting process for a ledger imbalance discovered after the fact?',
      ],
      wrapup: [
        'What single test would convince you the ledger and the cached balance can never silently disagree?',
        'What assumption about transaction volume would you test first before trusting this design at scale?',
      ],
    },
  },
  {
    id: 'sdq-flight-booking',
    patternId: 'sdp-consistency-tradeoffs',
    title: 'Design a flight booking system',
    tier: 2,
    companies: ['amazon', 'apple'],
    minutes: 60,
    steps: {
      define: [
        'What must never happen: selling more seats than exist on a flight?',
        'Is a short seat hold during checkout required, and how long does it last?',
        'Does search need to be strongly consistent with real seat availability, or can it lag slightly?',
      ],
      data: [
        'How is seat inventory represented so a decrement is atomic under concurrent bookings?',
        'What index supports fast search across origin, destination, date, and price simultaneously?',
      ],
      architecture: [
        'Walk through booking a seat: how do you prevent two customers from getting the last seat?',
        'How do you release a held seat if checkout is abandoned or payment fails?',
        'How would you scale search independently from the booking write path?',
      ],
      evaluate: [
        'How would you load-test the last-seat race condition specifically?',
        'What would you measure to confirm search results are never so stale they show a sold-out seat as available?',
      ],
      deploy: [
        'How do you handle a payment provider timeout after the seat was decremented?',
        'What is the fallback if the inventory service is briefly unavailable: block booking, or queue it?',
      ],
      wrapup: [
        'Restate the consistency choice for seat inventory and the latency cost it accepted.',
        'Name the first thing you would change to handle a 10x spike from a fare sale.',
      ],
    },
  },
  {
    id: 'sdq-collaborative-document-editor',
    patternId: 'sdp-consistency-tradeoffs',
    title: 'Design a collaborative document editor (Google Docs-style)',
    tier: 2,
    companies: ['google'],
    minutes: 60,
    steps: {
      define: [
        'How many concurrent editors must one document support, and what latency feels "real time"?',
        'Must edits always converge to the same final document on every client, regardless of order received?',
        'Does the system need offline editing that merges back in later?',
      ],
      data: [
        'What representation supports concurrent edits without conflicts: operational transform or CRDT, and what does each cost?',
        'How is edit history stored to support undo and version restore?',
      ],
      architecture: [
        'Walk through two users typing in the same paragraph at once: how do their edits merge into one consistent result?',
        'How are edits broadcast to other connected clients, and what happens if one client\'s connection lags?',
        'How would you shard or scale this for a document with hundreds of simultaneous viewers?',
      ],
      evaluate: [
        'How would you test that concurrent edits converge identically on every client?',
        'What would you measure to catch edit-broadcast latency under many simultaneous editors?',
      ],
      deploy: [
        'How does a client that reconnects after being offline reconcile its local edits with the server?',
        'What is the fallback if the real-time sync service is briefly unavailable: read-only mode?',
      ],
      wrapup: [
        'Restate the conflict-resolution mechanism chosen and what it guarantees about convergence.',
        'Name the first scaling limit you would hit with a much larger simultaneous-editor count.',
      ],
    },
  },
  {
    id: 'sdq-distributed-lock-service',
    patternId: 'sdp-consistency-tradeoffs',
    title: 'Design a distributed lock service',
    tier: 2,
    companies: ['amazon', 'google'],
    minutes: 60,
    steps: {
      define: [
        'What must the lock protect: a critical section across multiple processes, or leader election?',
        'What happens if the lock holder crashes without releasing: does the lock expire, and how fast?',
        'Is it acceptable for two clients to briefly believe they both hold the lock during a network partition?',
      ],
      data: [
        'What state does a lock record need: owner, fencing token, and expiry?',
        'Where does lock state live so a majority of nodes must agree it changed?',
      ],
      architecture: [
        'Walk through acquiring, holding, and releasing a lock, including what a fencing token protects against.',
        'How does lease expiry work if a holder crashes without releasing?',
        'How would you achieve consensus on lock ownership across replicas: quorum writes, or a consensus protocol?',
      ],
      evaluate: [
        'How would you test that a crashed holder\'s lock is correctly reclaimed within the expected time?',
        'What would you measure to catch a split-brain scenario where two clients both act as if they hold the lock?',
      ],
      deploy: [
        'How do you handle clock skew between nodes affecting lease expiry?',
        'What is the operational response when the lock service itself becomes unavailable?',
      ],
      wrapup: [
        'What assumption about clock synchronization would you test first before trusting this design in production?',
        'What part of this design would you cut if you had to ship a working version in a day?',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // sdp-message-queues
  // ---------------------------------------------------------------------
  {
    id: 'sdq-notification-service',
    patternId: 'sdp-message-queues',
    title: 'Design a notification service (push, email, SMS)',
    tier: 1,
    companies: ['amazon', 'meta'],
    minutes: 45,
    steps: {
      define: [
        'What channels must it support, and does a user\'s preference determine which channel is used?',
        'What is the delivery guarantee: best-effort, or must every notification eventually be attempted?',
        'Does ordering matter, or can notifications for the same user arrive out of order?',
      ],
      data: [
        'What does a notification job need to carry: template, recipient, channel, priority?',
        'How do you dedup so the same event does not trigger duplicate notifications on retry?',
      ],
      architecture: [
        'Walk through an event triggering a notification: producer, queue, worker, provider API, delivery.',
        'How do you prioritize a time-sensitive notification over a bulk digest in the same queue?',
        'How do you handle a downstream provider (push, SMS) being slow or rate-limiting you?',
      ],
      evaluate: [
        'How do you measure delivery latency per channel and catch a regression?',
        'What would a load test need to simulate to catch a queue backing up during a traffic spike?',
      ],
      deploy: [
        'How do you retry a failed send without spamming the user with duplicates?',
        'What is the fallback channel if the primary channel provider is down?',
      ],
      wrapup: [
        'What would you tell the interviewer you deliberately skipped: read receipts, per-channel guarantees, or something else?',
        'What number of retries before giving up would you pick, and why that number specifically?',
      ],
    },
  },
  {
    id: 'sdq-distributed-message-queue',
    patternId: 'sdp-message-queues',
    title: 'Design a distributed message queue',
    tier: 2,
    companies: ['amazon', 'google'],
    minutes: 60,
    steps: {
      define: [
        'What delivery guarantee is required: at-most-once, at-least-once, or exactly-once?',
        'Must ordering be preserved, and at what granularity: global, or per key/partition?',
        'What is the expected message size and throughput, and does that rule out any storage engine?',
      ],
      data: [
        'How is a message persisted so a consumer crash does not lose it: a log per partition?',
        'What does consumer offset tracking look like, and where does that state live?',
      ],
      architecture: [
        'Walk through producing and consuming a message, including what makes redelivery safe.',
        'How do you partition topics for parallelism while preserving per-key ordering?',
        'How does a new consumer join a consumer group and get assigned partitions?',
      ],
      evaluate: [
        'How would you test that no message is lost across a broker failover?',
        'What would you measure to confirm the system meets its ordering guarantee under partition rebalancing?',
      ],
      deploy: [
        'How do you rebalance partitions across brokers without a long consumer pause?',
        'What is the operational response when a consumer group falls significantly behind (lag grows)?',
      ],
      wrapup: [
        'Restate the delivery and ordering guarantees chosen and their cost in complexity.',
        'Name the first bottleneck you would hit at 10x message volume.',
      ],
    },
  },
  {
    id: 'sdq-job-scheduler',
    patternId: 'sdp-message-queues',
    title: 'Design a distributed job scheduler',
    tier: 1,
    companies: ['amazon', 'google'],
    minutes: 45,
    steps: {
      define: [
        'Does the scheduler support one-off delayed jobs, recurring cron-style jobs, or both?',
        'What happens if a job\'s worker crashes mid-execution: retry from scratch, or resume?',
        'Must a job run exactly once, or is at-least-once with idempotent jobs acceptable?',
      ],
      data: [
        'What does a job record need: schedule, payload, retry policy, and current state?',
        'How do you index jobs so "what is due now" is a cheap query even with millions of scheduled jobs?',
      ],
      architecture: [
        'Walk through a job\'s lifecycle: scheduled, picked up, executing, completed or retried.',
        'How do you avoid two workers picking up and executing the same due job at once?',
        'How would you shard the scheduler across nodes as job volume grows?',
      ],
      evaluate: [
        'How would you test that a crashed worker\'s job is retried and not silently dropped?',
        'What would you measure to catch scheduling drift under high job volume?',
      ],
      deploy: [
        'How do you deploy a scheduler change without causing jobs due during the deploy to be missed?',
        'What is the alerting story for a job that has retried past its limit?',
      ],
      wrapup: [
        'Restate the exactly-once versus at-least-once choice and what it requires of job authors.',
        'Name the first scaling limit at 100x scheduled jobs and what changes.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // sdp-rate-limiting
  // ---------------------------------------------------------------------
  {
    id: 'sdq-rate-limiter',
    patternId: 'sdp-rate-limiting',
    title: 'Design a rate limiter',
    tier: 1,
    companies: ['amazon', 'google'],
    minutes: 45,
    steps: {
      define: [
        'What is being limited: requests per user, per IP, per API key, or per endpoint?',
        'What is the limit and window, and is a burst allowed above the steady rate?',
        'What happens on rejection: 429 with Retry-After, queue, or silently drop?',
      ],
      data: [
        'What counter state does each algorithm need, and how large is it per key?',
        'Where does that state live so every gateway node agrees?',
      ],
      architecture: [
        'Compare fixed window, sliding window log, sliding window counter, token bucket, and leaky bucket.',
        'Where does the limiter run: client, gateway, service mesh sidecar, or inside the service?',
        'How do you shard counters by key to avoid one hot Redis slot?',
      ],
      evaluate: [
        'How do you measure false rejections and limit accuracy at the window boundary?',
        'What load test would show the fixed-window burst problem?',
      ],
      deploy: [
        'What happens when the counter store is unreachable: fail open or fail closed, and why?',
        'How do you roll out a limit change without a thundering herd?',
      ],
      wrapup: [
        'Restate the algorithm choice and the one property it trades away.',
        'Name the bottleneck at 10x traffic and what you would change first.',
      ],
    },
  },
  {
    id: 'sdq-web-crawler',
    patternId: 'sdp-rate-limiting',
    title: 'Design a web crawler',
    tier: 1,
    companies: ['google', 'amazon'],
    minutes: 45,
    steps: {
      define: [
        'What is the crawl scope: whole web, one domain set, or refresh of a known corpus?',
        'What politeness constraint must be respected per host, and who enforces it?',
        'How is a duplicate or near-duplicate page detected and skipped?',
      ],
      data: [
        'What does the URL frontier need to support: priority, per-host queues, dedup by URL and content hash?',
        'How is crawled content and metadata stored for the downstream indexing pipeline?',
      ],
      architecture: [
        'Walk through a crawl cycle: frontier pop, fetch, parse, extract links, enqueue, store.',
        'How do you enforce a per-host rate limit across a fleet of crawler workers?',
        'How would you shard the frontier across workers while keeping per-host politeness?',
      ],
      evaluate: [
        'How would you measure crawl coverage and freshness of the corpus over time?',
        'What would you test to confirm politeness limits hold even under worker autoscaling?',
      ],
      deploy: [
        'How do you handle a host that starts returning errors or blocking the crawler?',
        'What is the fallback if the frontier queue backs up faster than workers can drain it?',
      ],
      wrapup: [
        'Restate the politeness enforcement mechanism and its cost in crawl throughput.',
        'Name the first thing you would change to double crawl throughput without violating politeness.',
      ],
    },
  },
  // ---------------------------------------------------------------------
  // sdp-cdn-object-storage
  // ---------------------------------------------------------------------
  {
    id: 'sdq-video-streaming',
    patternId: 'sdp-cdn-object-storage',
    title: 'Design a video streaming service (YouTube-style)',
    tier: 1,
    companies: ['google', 'meta', 'netflix'],
    minutes: 45,
    steps: {
      define: [
        'Must the service support multiple resolutions and adapt to network conditions mid-playback?',
        'What is the acceptable delay between upload and the video becoming watchable?',
        'Does the system need live streaming, or is this video-on-demand only?',
      ],
      data: [
        'How is an uploaded video transcoded into multiple resolutions and formats, and where is each stored?',
        'What metadata schema supports search and recommendation without duplicating the video blob?',
      ],
      architecture: [
        'Walk through upload: ingest, transcode pipeline, storage, and CDN distribution.',
        'Walk through playback: how does the client pick the right resolution and switch it adaptively?',
        'Where does the CDN sit in this path, and what stays at origin versus at the edge?',
      ],
      evaluate: [
        'How do you measure startup latency and rebuffering rate across regions?',
        'What would a load test need to simulate for a viral video hitting one region hard?',
      ],
      deploy: [
        'How do you roll out a new transcoding profile without reprocessing the entire existing catalog immediately?',
        'What is the fallback if the CDN edge is cold for a newly viral video?',
      ],
      wrapup: [
        'What part of this design would you cut first if you had to launch in one week?',
        'What assumption about upload volume would you test first before committing to this transcoding pipeline?',
      ],
    },
  },
  {
    id: 'sdq-live-video-streaming',
    patternId: 'sdp-cdn-object-storage',
    title: 'Design a live video streaming platform',
    tier: 2,
    companies: ['amazon', 'meta'],
    minutes: 60,
    steps: {
      define: [
        'What end-to-end latency is acceptable: seconds for near-real-time chat, or lower for interactive use?',
        'How many concurrent viewers must one live stream support at peak?',
        'Does the platform need to support recording the stream for later on-demand playback?',
      ],
      data: [
        'How is the incoming stream chunked into short segments for distribution, and what format enables adaptive bitrate?',
        'What metadata tracks a stream\'s current segments and viewer count in near real time?',
      ],
      architecture: [
        'Walk through the path from broadcaster to viewer: ingest, transcode, segment, distribute, play.',
        'How does the CDN fan out a live segment to potentially millions of viewers without hammering origin?',
        'How do you handle a broadcaster\'s connection dropping mid-stream?',
      ],
      evaluate: [
        'How do you measure glass-to-glass latency across the pipeline?',
        'What would a load test need to simulate for a spike from one stream suddenly going viral?',
      ],
      deploy: [
        'How do you scale transcoding capacity up during a scheduled high-viewership event?',
        'What is the fallback viewer experience if a CDN edge node fails mid-stream?',
      ],
      wrapup: [
        'Restate the latency-versus-scale trade-off chosen for segment duration.',
        'Name the first thing you would change to cut end-to-end latency in half.',
      ],
    },
  },
  {
    id: 'sdq-text-search-system',
    patternId: 'sdp-cdn-object-storage',
    title: 'Design a full-text search system',
    tier: 1,
    companies: ['google', 'amazon'],
    minutes: 45,
    steps: {
      define: [
        'What is being searched: a fixed catalog, or content that changes frequently?',
        'Must search support ranking by relevance, or is exact match enough?',
        'What is the acceptable delay between a document being created and it becoming searchable?',
      ],
      data: [
        'What is an inverted index, and how does it make a keyword search fast?',
        'How is the index sharded once the document set outgrows one node?',
      ],
      architecture: [
        'Walk through indexing a new document and serving a search query against the resulting index.',
        'How do you merge and rank results from multiple index shards into one result list?',
        'How would you keep the index fresh as documents are updated or deleted?',
      ],
      evaluate: [
        'How do you measure search relevance, not just latency?',
        'What would a load test need to simulate for a popular query term hitting a hot shard?',
      ],
      deploy: [
        'How do you rebuild or reindex without taking search offline?',
        'What is the fallback if the index is briefly stale relative to the source data?',
      ],
      wrapup: [
        'Restate the indexing strategy and the freshness-versus-cost trade-off it makes.',
        'Name the bottleneck at 100x document volume and what changes first.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // sdp-observability
  // ---------------------------------------------------------------------
  {
    id: 'sdq-metrics-monitoring',
    patternId: 'sdp-observability',
    title: 'Design a metrics monitoring and alerting system',
    tier: 2,
    companies: ['google', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What is the ingestion rate: how many metrics per second from how many hosts?',
        'What query patterns must be fast: a live dashboard, an ad hoc range query, an alert evaluation?',
        'How long must historical data be retained, and at what resolution?',
      ],
      data: [
        'What time-series data model and storage engine fits high-cardinality metrics without exploding storage?',
        'How is old data downsampled to keep long-term storage bounded?',
      ],
      architecture: [
        'Walk through a metric from emission on a host to being queryable on a dashboard.',
        'How does the alerting engine evaluate rules against a continuously arriving stream without lagging behind?',
        'How would you shard metric storage across nodes by service or time range?',
      ],
      evaluate: [
        'How would you test that an alert actually fires within the expected delay of a real incident?',
        'What would you measure to confirm the ingestion pipeline is not dropping data under load?',
      ],
      deploy: [
        'How do you change an alert threshold without causing an alert storm during rollout?',
        'What is the fallback if the metrics pipeline itself is degraded during an incident?',
      ],
      wrapup: [
        'What single number (ingestion rate, cardinality) would tell you this design is about to fall over?',
        'What would you tell the interviewer you deliberately left for a version two of this system?',
      ],
    },
  },
  {
    id: 'sdq-code-deployment-cicd',
    patternId: 'sdp-observability',
    title: 'Design a code deployment / CI-CD pipeline',
    tier: 2,
    companies: ['google', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What must a change pass before it reaches production: tests, canary, manual approval?',
        'What is the target deploy frequency, and does that rule out any gate that is too slow?',
        'What is the rollback expectation: automatic on a bad signal, or manual?',
      ],
      data: [
        'What does a deployment record need to track: version, target environment, current stage, health signal?',
        'How do you track which hosts or instances are on which version at any moment?',
      ],
      architecture: [
        'Walk through a deploy: build, test, canary a small percentage, monitor, then full rollout.',
        'How does the pipeline automatically detect a bad canary and roll back?',
        'How would you support multiple services deploying independently without stepping on each other?',
      ],
      evaluate: [
        'How would you test that automatic rollback actually triggers on a real regression signal?',
        'What would you measure to confirm deploy frequency did not come at the cost of more incidents?',
      ],
      deploy: [
        'How do you deploy the deployment system itself without a chicken-and-egg outage?',
        'What is the runbook when a canary looks healthy but the full rollout regresses?',
      ],
      wrapup: [
        'Restate the canary-and-rollback strategy and the detection delay it accepts.',
        'Name the first thing you would automate next to cut time-to-rollback.',
      ],
    },
  },
  {
    id: 'sdq-distributed-tracing-system',
    patternId: 'sdp-observability',
    title: 'Design a distributed tracing system',
    tier: 2,
    companies: ['google', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What must a trace reconstruct: the full call graph of one request across every service it touched?',
        'What sampling rate is acceptable given storage cost, and does it vary by traffic type (errors, slow requests)?',
        'What is the acceptable delay between a request completing and its trace being queryable?',
      ],
      data: [
        'What does a span need to carry: trace id, span id, parent id, timestamps, and tags?',
        'How is trace data stored so a query by trace id is fast even at high ingestion volume?',
      ],
      architecture: [
        'Walk through a request crossing five services: how is context propagated so all spans link to one trace?',
        'How do you decide sampling at the start of a request without knowing yet if it will be slow or error?',
        'How would you shard trace storage as ingestion volume grows past one node?',
      ],
      evaluate: [
        'How would you test that context propagation actually survives an async boundary (a queue, a background job)?',
        'What would you measure to confirm sampling still captures enough error and slow-request traces?',
      ],
      deploy: [
        'How do you roll out a change to the sampling rate without losing visibility during the transition?',
        'What is the fallback if the tracing backend is briefly unavailable: drop spans, or buffer locally?',
      ],
      wrapup: [
        'Restate the sampling strategy chosen and what it costs in visibility for the traffic you don\'t sample.',
        'Name the first gap you would close if a production incident showed a broken trace.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // sdp-idempotency-retries
  // ---------------------------------------------------------------------
  {
    id: 'sdq-e-commerce-platform',
    patternId: 'sdp-idempotency-retries',
    title: 'Design an e-commerce checkout platform',
    tier: 2,
    companies: ['amazon'],
    minutes: 60,
    steps: {
      define: [
        'What must never happen: a customer charged twice, or an item sold past available inventory?',
        'What is the checkout flow: cart, inventory hold, payment, confirmation, and what can fail at each step?',
        'Is the order pipeline synchronous end to end, or does it hand off to asynchronous fulfillment?',
      ],
      data: [
        'How is inventory decremented atomically under concurrent checkouts for the same item?',
        'What does an idempotency key attached to a checkout request prevent on client retry?',
      ],
      architecture: [
        'Walk through checkout end to end: where does an idempotency key get checked, and what happens on a retried request?',
        'How do you handle a payment provider timeout where you do not know if the charge succeeded?',
        'How would you decompose this into services, and what queue connects checkout to fulfillment?',
      ],
      evaluate: [
        'How would you test that a retried checkout request never results in a duplicate charge or order?',
        'What would a load test need to simulate for a flash-sale spike on one popular item?',
      ],
      deploy: [
        'How do you roll out a change to the payment flow without risking double-charges during the transition?',
        'What is the reconciliation process when payment and order state disagree after an incident?',
      ],
      wrapup: [
        'What assumption about payment provider latency would you test first before trusting this checkout flow?',
        'What part of this design would you cut under a tight deadline, and what risk would that accept?',
      ],
    },
  },
  {
    id: 'sdq-ride-sharing',
    patternId: 'sdp-idempotency-retries',
    title: 'Design a ride-sharing dispatch system',
    tier: 2,
    companies: ['amazon', 'meta', 'uber'],
    minutes: 60,
    steps: {
      define: [
        'What must never happen: two riders matched to the same driver at once?',
        'What is the acceptable latency for a match, given both rider and driver locations are constantly moving?',
        'Does pricing need to respond to real-time supply and demand?',
      ],
      data: [
        'How is driver location tracked and indexed for a fast "nearest available driver" query?',
        'What state machine tracks a ride from request through match, pickup, and completion?',
      ],
      architecture: [
        'Walk through a ride request: how do you find, offer to, and confirm a driver without double-booking them?',
        'How do you handle a driver who does not respond to an offer within the timeout?',
        'How would you shard driver location data by geography for fast proximity queries?',
      ],
      evaluate: [
        'How would you test the match algorithm under a supply crunch (many riders, few drivers) in one area?',
        'What would you measure to confirm match latency holds up during a demand spike?',
      ],
      deploy: [
        'How do you handle a driver\'s app losing connectivity mid-ride?',
        'What is the retry and idempotency story if a match confirmation request is sent twice?',
      ],
      wrapup: [
        'Restate the matching strategy chosen and the latency-versus-quality trade-off it makes.',
        'Name the first bottleneck during a citywide surge event and what you would change.',
      ],
    },
  },
  {
    id: 'sdq-chat-application',
    patternId: 'sdp-idempotency-retries',
    title: 'Design a real-time chat application',
    tier: 2,
    companies: ['meta', 'apple'],
    minutes: 60,
    steps: {
      define: [
        'Must messages be delivered exactly once and in order to every recipient?',
        'Does the system need to support group chats, and does that change the fan-out design?',
        'What must survive a client going offline: undelivered messages queued for later delivery?',
      ],
      data: [
        'What does a message record need: sender, recipient(s), timestamp, delivery status, and a dedup key?',
        'How is conversation history stored and paginated efficiently for a long-running chat?',
      ],
      architecture: [
        'Walk through sending a message: client, server, persistent connection to the recipient, delivery ack.',
        'How do you fan out one message to many members of a large group chat without a slow send?',
        'How does a client that reconnects after being offline catch up on missed messages?',
      ],
      evaluate: [
        'How would you test that a message sent while the recipient is offline is not lost or duplicated on delivery?',
        'What would you measure to confirm delivery latency holds up for very large group chats?',
      ],
      deploy: [
        'How do you handle a server holding many persistent connections going down: reconnect storm?',
        'What is the retry and idempotency mechanism when a client resends a message it is unsure was received?',
      ],
      wrapup: [
        'Restate the delivery guarantee chosen and what a client must do because of it.',
        'Name the first scaling limit for a group chat with 100,000 members and what changes.',
      ],
    },
  },
  {
    id: 'sdq-social-media-feed',
    patternId: 'sdp-idempotency-retries',
    title: 'Design a social media news feed',
    tier: 2,
    companies: ['meta', 'google'],
    minutes: 60,
    steps: {
      define: [
        'Is the feed generated at write time (fan-out on write) or at read time (fan-out on read)?',
        'Must the feed be ranked, or is reverse-chronological enough for a first version?',
        'How does the design change for a user with millions of followers versus a typical user?',
      ],
      data: [
        'What does a feed entry need to reference: post id, author, timestamp, and ranking signal?',
        'How is a precomputed feed stored per user, and how large can it grow before pruning?',
      ],
      architecture: [
        'Walk through a new post: how does it reach the feeds of a typical user\'s followers?',
        'How do you handle a celebrity account with millions of followers without a write storm on every post?',
        'How would you insert a ranking or ad injection step into the feed-serving path?',
      ],
      evaluate: [
        'How would you test that fan-out actually delivers a new post to followers within the target delay?',
        'What would you measure to catch the hot-user (celebrity) fan-out bottleneck specifically?',
      ],
      deploy: [
        'How do you roll out a change to the ranking algorithm without a jarring experience for users mid-rollout?',
        'What is the fallback feed if the ranking service is briefly unavailable?',
      ],
      wrapup: [
        'Restate the fan-out strategy chosen (write, read, or hybrid) and why.',
        'Name the first bottleneck at 10x daily active users and what changes.',
      ],
    },
  },
  {
    id: 'sdq-google-maps',
    patternId: 'sdp-idempotency-retries',
    title: 'Design a maps and navigation service',
    tier: 2,
    companies: ['google', 'apple'],
    minutes: 60,
    steps: {
      define: [
        'What must the routing engine optimize for: shortest distance, fastest time given live traffic, or both as options?',
        'How fresh must traffic data be to affect a route already in progress?',
        'What scale of map data must be searchable and renderable at interactive speed?',
      ],
      data: [
        'How is the road network represented as a graph, and what index supports fast shortest-path queries at scale?',
        'How is live traffic and location data from many users aggregated into edge weights on that graph?',
      ],
      architecture: [
        'Walk through a route request: graph lookup, shortest-path computation, and returning turn-by-turn directions.',
        'How do you recompute a route mid-navigation when live traffic changes without noticeable lag?',
        'How would you partition the road graph geographically to keep pathfinding fast at global scale?',
      ],
      evaluate: [
        'How would you test that a computed route is actually close to optimal under real traffic conditions?',
        'What would you measure to confirm route recomputation latency stays low during heavy traffic events?',
      ],
      deploy: [
        'How do you roll out an updated map (new roads, closures) without serving stale routes across regions?',
        'What is the fallback if live traffic data is temporarily unavailable for a region?',
      ],
      wrapup: [
        'Restate the pathfinding and partitioning strategy and the freshness trade-off it makes.',
        'Name the first bottleneck at a much larger concurrent-navigator count in one city.',
      ],
    },
  },
  {
    id: 'sdq-parking-lot',
    patternId: 'sdp-idempotency-retries',
    title: 'Design a parking lot management system',
    tier: 1,
    companies: ['amazon', 'apple'],
    minutes: 45,
    steps: {
      define: [
        'What must never happen: two vehicles assigned the same spot at once?',
        'Does the system support multiple spot sizes and vehicle types, and how does that affect assignment?',
        'What is the pricing model, and does it depend on duration or spot type?',
      ],
      data: [
        'What data structure tracks available spots so an assignment query is fast even with thousands of spots?',
        'What does a ticket record need: entry time, assigned spot, vehicle type, and payment state?',
      ],
      architecture: [
        'Walk through entry: how a vehicle is assigned a spot without a race with another simultaneous entry.',
        'Walk through exit: how the fee is computed and the spot is freed atomically.',
        'How would you scale this design to a multi-level or multi-location parking system?',
      ],
      evaluate: [
        'How would you test that concurrent entries never assign the same spot twice?',
        'What would you measure to confirm assignment stays fast as occupancy approaches full?',
      ],
      deploy: [
        'What happens to an in-progress assignment if the system restarts mid-transaction?',
        'How do you handle a payment failure at exit without blocking the spot from being freed?',
      ],
      wrapup: [
        'Restate the spot-assignment concurrency control and its cost.',
        'Name the first thing you would change to support a busy multi-location deployment.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // mlp-retrieval-ranking
  // ---------------------------------------------------------------------
  {
    id: 'mlq-design-recommendation-system',
    patternId: 'mlp-retrieval-ranking',
    title: 'Design a recommendation system',
    tier: 'ml',
    companies: ['netflix', 'amazon', 'meta'],
    minutes: 60,
    steps: {
      define: [
        'What is the business metric this system should move, and how does that differ from a proxy like click-through rate?',
        'Is this a cold-start-heavy product (many new users or items), and how does that constrain the approach?',
        'What is the latency budget per request, and how many candidates must be scored within it?',
      ],
      data: [
        'What labeled or implicit-feedback data trains the model, and what biases does that data carry (popularity bias, position bias)?',
        'How do you split data for training and evaluation without leaking future interactions into the past?',
      ],
      architecture: [
        'Design the two-stage pipeline: what generates candidates, and what model ranks them?',
        'How do you incorporate collaborative signals versus content features, and how do you blend them for a cold-start item?',
        'How would you serve this at the required latency: precomputed batch recommendations, or real-time scoring?',
      ],
      evaluate: [
        'What offline metric (Recall@k, NDCG) would you report before an online test, and what does it fail to predict?',
        'How would you design an online A/B test to confirm the offline win translates to business impact?',
      ],
      deploy: [
        'How do you retrain and redeploy the model on a schedule without a quality regression slipping through?',
        'What is the fallback recommendation if the model service is unavailable: cached last-good list, or popularity fallback?',
      ],
      wrapup: [
        'What offline metric number would have to move before you would trust this model over the current baseline?',
        'What would you tell the interviewer you deliberately skipped for a first launch?',
      ],
    },
  },
  {
    id: 'mlq-design-instagram-explore',
    patternId: 'mlp-retrieval-ranking',
    title: 'Design the Instagram Explore recommendation feed',
    tier: 'ml',
    companies: ['meta'],
    minutes: 60,
    steps: {
      define: [
        'What is Explore optimizing for: session time, diversity of content discovered, or long-term retention?',
        'How do you prevent Explore from becoming an echo chamber of one content type per user?',
        'What is the acceptable end-to-end latency to render a page of Explore content?',
      ],
      data: [
        'What signals feed candidate generation: content embeddings, creator affinity, or engagement history?',
        'How do you label or weight implicit signals like a pause versus a like versus a share?',
      ],
      architecture: [
        'Design the candidate generation stage: how do you retrieve a diverse pool cheaply from a massive content catalog?',
        'Design the ranking stage: what features and model architecture predict engagement for this user on this candidate?',
        'How do you inject diversity or exploration so the feed does not collapse to one narrow content type?',
      ],
      evaluate: [
        'What offline metric would predict session-time impact before an online test?',
        'How would you design an online experiment that isolates a ranking change from a content-mix change?',
      ],
      deploy: [
        'How do you roll out a new ranking model gradually and catch a regression before full rollout?',
        'What is the fallback content mix if a candidate source degrades or goes stale?',
      ],
      wrapup: [
        'Restate the diversity mechanism chosen and the engagement it may cost in the short term.',
        'Name the first metric you would watch closely in the first week after shipping a ranking change.',
      ],
    },
  },
  {
    id: 'mlq-design-netflix-top-picks',
    patternId: 'mlp-retrieval-ranking',
    title: 'Design the Netflix "Top Picks for You" row',
    tier: 'ml',
    companies: ['netflix'],
    minutes: 60,
    steps: {
      define: [
        'What is this row optimizing for: total watch time, or completion of what is started?',
        'How does the row differ for a brand-new account versus a long-tenured viewer?',
        'What is the acceptable latency to render the homepage, given many rows compete for the same time budget?',
      ],
      data: [
        'What viewing-history signals feed personalization, and how do you handle sparse history for new accounts?',
        'How do you account for household or shared-profile viewing polluting one profile\'s taste signal?',
      ],
      architecture: [
        'Design the candidate generation: how do you narrow the full catalog to a personalized pool cheaply?',
        'Design the ranking model: what features predict this viewer will watch and finish this title?',
        'How do you precompute this row versus scoring it live, given the homepage latency budget?',
      ],
      evaluate: [
        'What offline metric would you report, and how does it relate to actual watch-time lift?',
        'How would you A/B test a new ranking model against the incumbent without contaminating other rows on the same page?',
      ],
      deploy: [
        'How do you refresh recommendations as viewing behavior changes within a session?',
        'What is the fallback row content if the personalization service is degraded?',
      ],
      wrapup: [
        'Restate the precompute-versus-real-time trade-off chosen and why.',
        'Name the first thing you would investigate if watch-time lift was smaller than the offline metric predicted.',
      ],
    },
  },
  {
    id: 'mlq-design-product-ranking-amazon',
    patternId: 'mlp-retrieval-ranking',
    title: 'Design a product search ranking system for an e-commerce marketplace',
    tier: 'ml',
    companies: ['amazon'],
    minutes: 60,
    steps: {
      define: [
        'Is ranking optimizing for relevance to the query, purchase likelihood, or a blend, and how do you decide the blend?',
        'How do you handle a query with very few matching products versus a broad query with millions of matches?',
        'What is the latency budget for ranking within the overall search response time?',
      ],
      data: [
        'What labels train the ranker: clicks, add-to-cart, purchases, and how do you weight them relative to each other?',
        'How do you avoid position bias in click data skewing what the model thinks is relevant?',
      ],
      architecture: [
        'Design the retrieval stage: how do you go from a text query to a candidate set efficiently?',
        'Design the ranking stage: what features (text match, price, reviews, personalization) does the model use?',
        'How do you incorporate business signals like sponsored placement without degrading relevance trust?',
      ],
      evaluate: [
        'What offline ranking metric (NDCG, MRR) would you track, and what does it miss about revenue impact?',
        'How would you design an online test that measures both relevance and revenue without conflating them?',
      ],
      deploy: [
        'How do you roll out a ranking model update without a sudden shift in what sellers see as "winning" placement?',
        'What is the fallback ranking if the model service times out for a query?',
      ],
      wrapup: [
        'Restate the relevance-versus-purchase-likelihood blend chosen and its risk.',
        'Name the first thing you would investigate if seller complaints spiked after a ranking change.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // mlp-feature-stores
  // ---------------------------------------------------------------------
  {
    id: 'mlq-design-feature-pipeline-latency-budget',
    patternId: 'mlp-feature-stores',
    title: 'Design a low-latency feature pipeline for a real-time ranking model',
    tier: 'ml',
    companies: ['uber', 'doordash'],
    minutes: 60,
    steps: {
      define: [
        'What is the end-to-end latency budget for feature retrieval within the overall request budget?',
        'Which features are needed instantly (real-time) versus can be precomputed on a schedule (batch)?',
        'What must be guaranteed between training and serving so the model sees consistent features?',
      ],
      data: [
        'What online store serves low-latency feature lookups, and what does it cost per key at the required QPS?',
        'How do you compute a streaming feature (a rolling count or average) without recomputing from scratch on every request?',
      ],
      architecture: [
        'Design the split between an offline store (for training) and an online store (for serving), and how they share one definition.',
        'Walk through a request: which features are fetched from cache, which are computed on the fly, and how are they joined?',
        'How would you add a new feature without a redeploy of the serving path?',
      ],
      evaluate: [
        'How would you detect train-serve skew: a feature computed differently in training versus serving?',
        'What would you measure to confirm feature retrieval stays within budget as feature count grows?',
      ],
      deploy: [
        'How do you backfill a new feature\'s historical values for retraining without breaking live serving?',
        'What is the fallback if a feature source is temporarily unavailable: a default value, or reject the request?',
      ],
      wrapup: [
        'What single latency number would force you to move a feature from real-time to batch?',
        'What assumption about feature freshness would you test first before trusting this split?',
      ],
    },
  },
  {
    id: 'mlq-design-personalized-news-ranking',
    patternId: 'mlp-feature-stores',
    title: 'Design a personalized news feed ranking system',
    tier: 'ml',
    companies: ['google', 'meta'],
    minutes: 60,
    steps: {
      define: [
        'What is the feed optimizing for: time spent, or a broader measure like informed engagement?',
        'How fresh must a breaking news article become rankable: seconds, or minutes?',
        'How do you avoid a filter bubble while still personalizing effectively?',
      ],
      data: [
        'What features describe a user (topic affinity, reading history) and an article (recency, topic, source quality)?',
        'How do you compute and serve fresh article-level features (like early engagement velocity) within minutes of publish?',
      ],
      architecture: [
        'Design the feature pipeline: what runs in a streaming layer for freshness versus a batch layer for stable signals?',
        'Design the ranking model: how does it combine user affinity, article freshness, and quality signals?',
        'How would you inject topic diversity to counter a pure engagement-optimized ranking?',
      ],
      evaluate: [
        'What offline metric would predict whether the diversity mechanism actually broadens what a user reads?',
        'How would you A/B test a freshness-versus-relevance tradeoff change?',
      ],
      deploy: [
        'How do you handle a breaking-news surge that spikes feature computation load?',
        'What is the fallback ranking if the streaming feature pipeline falls behind?',
      ],
      wrapup: [
        'Restate the freshness mechanism chosen and its cost in engineering complexity.',
        'Name the first thing you would monitor to catch a filter-bubble regression.',
      ],
    },
  },
  {
    id: 'mlq-design-real-time-fraud-features',
    patternId: 'mlp-feature-stores',
    title: 'Design a real-time feature pipeline for fraud detection',
    tier: 'ml',
    companies: ['stripe', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What is the latency budget for a fraud decision, given it sits on the critical path of a transaction?',
        'Which features must reflect activity in the last few seconds (velocity checks) versus longer-term account history?',
        'What is the cost asymmetry between a false positive (blocking a good transaction) and a false negative (missing fraud)?',
      ],
      data: [
        'How do you compute a real-time velocity feature (transactions in the last minute) without scanning history on every request?',
        'How do you keep the same velocity feature definition consistent between offline training and online serving?',
      ],
      architecture: [
        'Design the streaming aggregation layer that maintains rolling counters per account or card.',
        'Design the online store that serves those counters within the transaction\'s latency budget.',
        'How would you add a new real-time feature without redeploying the fraud model itself?',
      ],
      evaluate: [
        'How would you test that a rolling counter stays correct under out-of-order or delayed events?',
        'What would you measure to confirm feature freshness holds up during a transaction volume spike?',
      ],
      deploy: [
        'What is the fallback fraud decision if the real-time feature store is unavailable: fail open or fail closed?',
        'How do you backfill historical values for a new feature without disrupting live scoring?',
      ],
      wrapup: [
        'Restate the fail-open-versus-fail-closed choice made under feature-store outage and why.',
        'Name the first feature you would add next to catch a fraud pattern this design currently misses.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // mlp-model-serving-batching
  // ---------------------------------------------------------------------
  {
    id: 'mlq-design-llm-query-system',
    patternId: 'mlp-model-serving-batching',
    title: 'Design a system to serve LLM-powered query answering at scale',
    tier: 'ml',
    companies: ['google', 'openai'],
    minutes: 60,
    steps: {
      define: [
        'What is the target time to first token and total latency budget per query?',
        'What concurrency must the system support at peak, and does that dictate a batching strategy?',
        'Does every query need the full model, or can a cheaper model handle a fraction of traffic?',
      ],
      data: [
        'What request metadata determines routing: model size needed, expected output length, priority?',
        'How is usage and cost tracked per request for billing or budget enforcement?',
      ],
      architecture: [
        'Design the serving layer: how does dynamic or continuous batching group requests without hurting latency for any one of them?',
        'How would you route simple queries to a smaller, cheaper model and hard queries to a larger one?',
        'How does the system scale GPU capacity up and down with demand?',
      ],
      evaluate: [
        'How would you load-test to find the throughput-versus-latency knee for this serving configuration?',
        'What would you measure to confirm model routing is not silently degrading answer quality for hard queries?',
      ],
      deploy: [
        'How do you roll out a new model version without a latency or cost regression going unnoticed?',
        'What is the fallback if GPU capacity is temporarily exhausted: queue, degrade to a smaller model, or reject?',
      ],
      wrapup: [
        'Restate the batching and routing strategy chosen and the latency it trades for throughput.',
        'Name the first bottleneck at 10x concurrent users and what you would change.',
      ],
    },
  },
  {
    id: 'sdq-llm-serving-platform',
    patternId: 'mlp-model-serving-batching',
    title: 'Design a multi-tenant LLM serving platform',
    tier: 'ai',
    companies: ['openai', 'google', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'Who are the tenants, and what isolation do they need: strict per-tenant quotas, or best-effort fair sharing?',
        'What models must be served simultaneously, and does the platform need to support hot-swapping a model version?',
        'What is the latency SLA per tenant tier, and does a premium tier get priority scheduling?',
      ],
      data: [
        'What per-tenant usage data (tokens, requests, cost) must be tracked in real time for quota enforcement?',
        'How is model weight and KV cache memory allocated across tenants sharing the same GPU fleet?',
      ],
      architecture: [
        'Design the request router: how does it place a request on the right model shard while respecting tenant priority?',
        'Design continuous batching across tenants: how do you prevent one tenant\'s burst from starving others\' latency?',
        'How would you support multiple concurrently loaded models with different resource footprints on shared hardware?',
      ],
      evaluate: [
        'How would you load-test noisy-neighbor effects: one tenant\'s spike degrading another tenant\'s latency?',
        'What would you measure to confirm quota enforcement is accurate under high concurrency?',
      ],
      deploy: [
        'How do you roll out a new model version to some tenants without disrupting others mid-request?',
        'What is the fallback when GPU capacity is exhausted: queue by priority, degrade, or reject with a clear signal?',
      ],
      wrapup: [
        'What utilization number would tell you the platform is trading too much isolation for GPU efficiency?',
        'What would you tell the interviewer you deliberately left out of a first version of this platform?',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // mlp-training-pipelines-registries
  // ---------------------------------------------------------------------
  {
    id: 'mlq-design-fraud-detection-stripe',
    patternId: 'mlp-training-pipelines-registries',
    title: 'Design a training pipeline for a fraud detection model',
    tier: 'ml',
    companies: ['amazon', 'meta'],
    minutes: 60,
    steps: {
      define: [
        'How often must the model retrain given fraud patterns shift quickly, and what triggers a retrain: a schedule, or a drift signal?',
        'What is the acceptable delay between a transaction being labeled fraud and that label being usable in training?',
        'What is the cost asymmetry between missing fraud and blocking a legitimate transaction, and how does that shape the loss function?',
      ],
      data: [
        'How is severe class imbalance (fraud is rare) handled in the training data: resampling, weighting, or a specialized loss?',
        'How do you prevent label leakage from features that are only known after the fraud determination was made?',
      ],
      architecture: [
        'Design the pipeline: data extraction, feature computation, training, evaluation, and registry push.',
        'How is a candidate model evaluated against the current production model before promotion?',
        'How would you version datasets and model artifacts so any production model is reproducible?',
      ],
      evaluate: [
        'What metric beyond accuracy would you track given the severe class imbalance, and why?',
        'How would you run a shadow evaluation of the new model against live traffic before promoting it?',
      ],
      deploy: [
        'How do you promote a new model to production without a gap in fraud coverage during the swap?',
        'What is the rollback plan if the newly promoted model regresses on a fraud pattern the old one caught?',
      ],
      wrapup: [
        'Restate the retraining cadence and trigger chosen and why.',
        'Name the first fraud pattern you would expect this pipeline to miss and how you would catch it.',
      ],
    },
  },
  {
    id: 'mlq-design-spam-detection-pinterest',
    patternId: 'mlp-training-pipelines-registries',
    title: 'Design a spam detection training and deployment pipeline',
    tier: 'ml',
    companies: ['pinterest'],
    minutes: 60,
    steps: {
      define: [
        'What counts as spam here, and how does the definition evolve as spammers adapt: does the pipeline need to retrain reactively?',
        'What is the acceptable false-positive rate, given blocking legitimate content has a real user cost?',
        'What is the latency requirement: must spam be caught before content is shown, or can moderation happen after?',
      ],
      data: [
        'What labels train the model: user reports, moderator review, or both, and how do you handle disagreement between them?',
        'How do you keep the training set representative as spam tactics shift, without becoming stale?',
      ],
      architecture: [
        'Design the pipeline: data collection, labeling queue, training, evaluation, and promotion to the registry.',
        'How would you incorporate a fast-adapting rule layer alongside the slower-retraining model to catch emerging spam patterns?',
        'How do you version and roll back a model if a retrain regresses on a previously-solved spam pattern?',
      ],
      evaluate: [
        'How would you evaluate the model\'s false-positive rate specifically, not just overall accuracy?',
        'What would a shadow deployment need to measure before promoting a retrained model to production?',
      ],
      deploy: [
        'How often do you retrain, and what would trigger an out-of-cycle retrain?',
        'What is the rollback plan if a new model version starts flagging legitimate content?',
      ],
      wrapup: [
        'Restate the reactive-retraining trigger chosen and the risk it manages.',
        'Name the first thing you would add to catch a novel spam pattern faster.',
      ],
    },
  },
  {
    id: 'mlq-design-model-registry-rollback',
    patternId: 'mlp-training-pipelines-registries',
    title: 'Design a model registry with safe rollback',
    tier: 'ml',
    companies: ['netflix', 'uber'],
    minutes: 60,
    steps: {
      define: [
        'What must the registry guarantee: that any production model version can be reproduced exactly from its recorded lineage?',
        'What triggers a rollback: an automated regression signal, or only a human decision?',
        'How many model versions must be servable simultaneously during a gradual rollout?',
      ],
      data: [
        'What metadata does a registry entry need: training data version, code commit, hyperparameters, and evaluation metrics?',
        'How do you link a served model version back to the exact dataset and code that produced it?',
      ],
      architecture: [
        'Design the promotion flow: how does a model move from trained artifact to registered candidate to production?',
        'Design the rollback path: how quickly can traffic move back to the previous version, and what state must be consistent across that switch?',
        'How would you support canarying a new model version against a fraction of traffic before full promotion?',
      ],
      evaluate: [
        'How would you test that a rollback actually restores the previous model\'s behavior exactly, not approximately?',
        'What would you measure during a canary to decide whether to proceed or roll back?',
      ],
      deploy: [
        'How do you handle a rollback when the previous model\'s dependent features have since changed schema?',
        'What is the alerting story that triggers an automatic rollback without waiting for a human to notice?',
      ],
      wrapup: [
        'Restate the reproducibility guarantee chosen and what it costs in storage or process overhead.',
        'Name the first gap you would close after a rollback that took longer than expected.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // mlp-monitoring-drift
  // ---------------------------------------------------------------------
  {
    id: 'mlq-design-ml-monitoring-system',
    patternId: 'mlp-monitoring-drift',
    title: 'Design an ML model monitoring system',
    tier: 'ml',
    companies: ['google', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What must be monitored: input feature distributions, prediction distributions, or ground-truth performance, and which is most urgent?',
        'How quickly must drift be detected given the cost of a silently degrading model?',
        'What is an acceptable false-alarm rate for drift alerts, given alert fatigue has a real cost?',
      ],
      data: [
        'What baseline distribution do you compare live data against, and how often is that baseline refreshed?',
        'What statistical test or distance metric flags a meaningful shift versus normal variance?',
      ],
      architecture: [
        'Design the pipeline: how live predictions and features are sampled, compared to baseline, and scored for drift.',
        'How do you separate a data quality issue (a broken upstream feature) from genuine distribution drift?',
        'How would this scale to monitoring hundreds of models across an organization without a bespoke setup per model?',
      ],
      evaluate: [
        'How would you validate that the drift detector actually catches known historical incidents if replayed?',
        'What would you measure to tune the sensitivity-versus-false-alarm trade-off?',
      ],
      deploy: [
        'What is the escalation path when drift is detected: automatic retrain trigger, or a human-reviewed alert?',
        'How do you avoid a monitoring system itself becoming a scaling bottleneck as model count grows?',
      ],
      wrapup: [
        'Restate the drift-detection method chosen and its false-alarm trade-off.',
        'Name the first incident type this design would still miss.',
      ],
    },
  },
  {
    id: 'mlq-design-monitoring-tiktok',
    patternId: 'mlp-monitoring-drift',
    title: 'Design a monitoring system for a short-video recommendation model',
    tier: 'ml',
    companies: ['tiktok'],
    minutes: 60,
    steps: {
      define: [
        'What signal degrades first when this recommendation model drifts: engagement rate, diversity, or something else?',
        'How quickly does content taste shift on this platform, and does that set a tighter monitoring window than a typical recommender?',
        'What must trigger an urgent page versus a next-business-day review?',
      ],
      data: [
        'What features describing trending content shift fastest, and how do you baseline something inherently non-stationary?',
        'How do you separate a genuine trend shift (a new dance trend) from a model or pipeline failure?',
      ],
      architecture: [
        'Design real-time monitoring of engagement metrics segmented by content category, to catch a category-specific regression.',
        'How would you detect a feedback loop where the model over-recommends a narrow content type and engagement looks artificially high?',
        'How does this monitoring integrate with an automatic rollback if a newly shipped model regresses?',
      ],
      evaluate: [
        'How would you validate the monitoring system against a past known incident of engagement collapse?',
        'What would you measure to confirm the system distinguishes a real trend shift from a model regression?',
      ],
      deploy: [
        'What is the automatic response when engagement drops sharply right after a model deploy?',
        'How do you tune alert thresholds for a platform where "normal" shifts fast?',
      ],
      wrapup: [
        'Restate the mechanism chosen to distinguish trend shift from regression and its risk.',
        'Name the first false alarm you would expect and how you would tune it out.',
      ],
    },
  },
  {
    id: 'mlq-design-data-drift-alerting',
    patternId: 'mlp-monitoring-drift',
    title: 'Design a data drift alerting system for a feature pipeline',
    tier: 'ml',
    companies: ['meta', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What is being detected: drift in a single feature\'s distribution, or joint drift across correlated features?',
        'What is the acceptable detection delay from when drift starts to when an alert fires?',
        'Who consumes the alert, and what action are they expected to take?',
      ],
      data: [
        'What reference window defines "normal" for each feature, and how often is it refreshed to avoid stale baselines?',
        'What statistical distance (population stability index, KL divergence) is used per feature type, and why?',
      ],
      architecture: [
        'Design the pipeline: how feature values are sampled continuously and compared to the reference window.',
        'How do you scale this to hundreds of features per model without every comparison becoming a manual review?',
        'How would you correlate a drift alert on one feature with an upstream data source change to speed diagnosis?',
      ],
      evaluate: [
        'How would you tune the alert threshold to balance detection speed against false-alarm rate?',
        'What would you measure to confirm the system catches a known historical drift incident on replay?',
      ],
      deploy: [
        'What is the escalation path: does a drift alert automatically pause the affected model, or only notify a human?',
        'How do you avoid alert fatigue when many correlated features drift together from one root cause?',
      ],
      wrapup: [
        'Restate the reference-window refresh strategy chosen and its staleness trade-off.',
        'Name the first upstream data issue you would expect this system to surface fastest.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // mlp-experimentation
  // ---------------------------------------------------------------------
  {
    id: 'mlq-design-ads-ranking-evaluation-framework',
    patternId: 'mlp-experimentation',
    title: 'Design an evaluation framework for an ads ranking model',
    tier: 'ml',
    companies: ['meta'],
    minutes: 60,
    steps: {
      define: [
        'What is the framework optimizing evaluation for: predicting online revenue impact from offline signals?',
        'How do you account for the auction mechanism (other bidders, pricing) when evaluating a ranking change offline?',
        'What stakeholders need this framework\'s output, and what decision does it inform?',
      ],
      data: [
        'What offline replay data (logged impressions, clicks, conversions) is available, and what bias does it carry from the policy that logged it?',
        'How do you correct for the fact that logged data reflects the old ranking policy, not the new one being evaluated (off-policy evaluation)?',
      ],
      architecture: [
        'Design the offline evaluation pipeline: replay logged auctions against the new model and estimate counterfactual outcomes.',
        'How do you combine offline relevance metrics with a revenue-simulation layer for a fuller pre-launch picture?',
        'How would you structure the online experiment (holdout design) to validate the offline estimate cheaply?',
      ],
      evaluate: [
        'How do you validate that the offline evaluation framework\'s predictions actually correlate with realized online results, historically?',
        'What would you measure to catch a case where offline metrics improved but revenue did not?',
      ],
      deploy: [
        'How do you gate a launch decision on this framework\'s output without over-trusting an imperfect offline estimate?',
        'What is the rollback plan if online results contradict what the framework predicted?',
      ],
      wrapup: [
        'Restate the off-policy correction chosen and its main source of remaining bias.',
        'Name the first historical case you would use to validate this framework before trusting it for a real launch decision.',
      ],
    },
  },
  {
    id: 'mlq-design-ab-test-for-ranking-model',
    patternId: 'mlp-experimentation',
    title: 'Design an A/B testing system for evaluating ranking model changes',
    tier: 'ml',
    companies: ['google', 'amazon'],
    minutes: 60,
    steps: {
      define: [
        'What metric is the primary decision metric, and what guardrail metrics must not regress?',
        'What is the unit of randomization: user, session, or query, and how does that choice affect interference between arms?',
        'How long must the test run to reach significance given the expected effect size?',
      ],
      data: [
        'How is traffic split and logged so every request\'s treatment assignment is recorded consistently?',
        'What data quality checks confirm the split is actually balanced before trusting the results?',
      ],
      architecture: [
        'Design the assignment service: how does a request get consistently bucketed to the same arm across a session?',
        'How would you support multiple concurrent experiments on overlapping traffic without them interfering with each other?',
        'How do you compute significance and confidence intervals on streaming results as the test runs?',
      ],
      evaluate: [
        'How would you detect a sample-ratio mismatch indicating a broken randomization?',
        'What would you check to rule out novelty effects inflating an early result?',
      ],
      deploy: [
        'How do you ramp a winning variant to full traffic without a discontinuity users notice?',
        'What is the process for stopping a test early if a guardrail metric regresses sharply?',
      ],
      wrapup: [
        'Restate the randomization unit chosen and the interference risk it manages or accepts.',
        'Name the first thing you would double check before trusting a surprising result.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // mlp-feedback-loops
  // ---------------------------------------------------------------------
  {
    id: 'mlq-design-comment-moderation-system',
    patternId: 'mlp-feedback-loops',
    title: 'Design a comment moderation system',
    tier: 'ml',
    companies: ['meta', 'google'],
    minutes: 60,
    steps: {
      define: [
        'What must be moderated: toxicity, spam, or platform-specific policy violations, and are these one model or several?',
        'What is the latency requirement: must a comment be checked before it is shown, or can moderation happen after publish?',
        'What is the cost asymmetry between over-removing legitimate speech and under-removing violating content?',
      ],
      data: [
        'What labels train the model: user reports, moderator decisions, or both, and how do you resolve disagreement between labelers?',
        'How do you keep the training set current as bad actors adapt language to evade detection?',
      ],
      architecture: [
        'Design the pipeline: a fast automated pass followed by human review for borderline cases.',
        'How do you feed moderator decisions back into retraining without the model learning from noisy or inconsistent labels?',
        'How would you avoid the model retraining on its own past false positives, reinforcing an error?',
      ],
      evaluate: [
        'How would you measure the model\'s false-positive rate on legitimate content specifically, not just overall accuracy?',
        'What would a shadow deployment need to check before trusting a retrained model to auto-remove content?',
      ],
      deploy: [
        'What is the rollback plan if a newly deployed model starts over-removing a category of legitimate content?',
        'How do you handle an adversarial spike (a coordinated attack) that the current model was not trained for?',
      ],
      wrapup: [
        'Restate the human-in-the-loop boundary chosen and why it sits where it does.',
        'Name the first evasion tactic you would expect and how the feedback loop would catch it.',
      ],
    },
  },
  {
    id: 'mlq-design-fake-news-detection',
    patternId: 'mlp-feedback-loops',
    title: 'Design a fake news / misinformation detection system',
    tier: 'ml',
    companies: ['meta', 'google'],
    minutes: 60,
    steps: {
      define: [
        'What is being classified: factual accuracy, or a proxy like source credibility and virality pattern?',
        'What is the acceptable delay between an article publishing and a misinformation determination?',
        'What is the cost asymmetry between suppressing a true story and amplifying a false one?',
      ],
      data: [
        'What labels are available: fact-checker verdicts, and how sparse are they relative to article volume?',
        'How do you use weak or proxy signals (source history, sharing pattern) to extend coverage beyond the sparse labeled set?',
      ],
      architecture: [
        'Design the pipeline: an automated triage model surfacing likely misinformation for human fact-checker review.',
        'How do you feed fact-checker verdicts back into the model without the model overfitting to a small, biased sample of reviewed articles?',
        'How would you handle a fast-moving breaking story before fact-checkers have had time to weigh in?',
      ],
      evaluate: [
        'How would you evaluate the triage model\'s precision given labels are sparse and delayed?',
        'What would you measure to confirm the system does not disproportionately flag one topic or viewpoint?',
      ],
      deploy: [
        'What is the action taken on a flagged article before a human verdict: a warning label, reduced distribution, or nothing?',
        'What is the rollback plan if the model is found to be systematically biased after deployment?',
      ],
      wrapup: [
        'Restate the human-review boundary chosen and the coverage gap it accepts.',
        'Name the first fairness check you would run before trusting this system at scale.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // mlp-llm-serving
  // ---------------------------------------------------------------------
  {
    id: 'sdq-chatgpt-style-chat',
    patternId: 'mlp-llm-serving',
    title: 'Design a ChatGPT-style conversational AI product',
    tier: 'ai',
    companies: ['openai', 'google'],
    minutes: 60,
    steps: {
      define: [
        'What is the target time to first token, and what streaming behavior does the product need?',
        'How much conversation history must be retained, and does the context window force a summarization strategy for long chats?',
        'What safety behaviors are non-negotiable: refusing certain requests, and how is that enforced consistently?',
      ],
      data: [
        'How is conversation history stored and retrieved so a new turn has the right context without re-sending the whole history every time?',
        'What data is logged for safety review and product improvement, and what privacy constraints apply to it?',
      ],
      architecture: [
        'Design the serving path: continuous batching, streaming tokens to the client, and where a moderation check sits in that path.',
        'How does the system manage a long conversation exceeding the context window: truncation, summarization, or retrieval over history?',
        'How would you route between a smaller, cheaper model and a larger one depending on request complexity?',
      ],
      evaluate: [
        'How would you evaluate response quality at scale, given no single ground truth exists for open-ended chat?',
        'What would you measure to catch a regression in helpfulness or safety after a model or prompt update?',
      ],
      deploy: [
        'How do you roll out a new system prompt or model version without a visible behavior discontinuity for active users?',
        'What is the fallback if the primary model is degraded: a smaller model, or a maintenance message?',
      ],
      wrapup: [
        'What part of this design would you cut first if you had to ship in two weeks?',
        'What assumption about conversation length would you test first before trusting the summarization strategy?',
      ],
    },
  },
  {
    id: 'sdq-ai-coding-assistant',
    patternId: 'mlp-llm-serving',
    title: 'Design an AI coding assistant (inline completion and chat)',
    tier: 'ai',
    companies: ['github', 'google'],
    minutes: 60,
    steps: {
      define: [
        'What is the latency budget for inline completion versus a chat-style request, and why do they differ?',
        'What context does a good completion need: the current file, open files, or the whole repository?',
        'What must never happen: leaking one user\'s private repository content into another user\'s completion?',
      ],
      data: [
        'How is repository context indexed so relevant code can be retrieved quickly for a given cursor position?',
        'What telemetry (accepted or rejected completions) is collected to improve the model, and what privacy boundary applies?',
      ],
      architecture: [
        'Design the low-latency completion path: how does it stay fast enough to feel instant while still using useful context?',
        'Design the chat path: how does it retrieve broader repository context for a multi-file question?',
        'How do you keep per-tenant repository isolation strict across a shared model-serving fleet?',
      ],
      evaluate: [
        'How would you measure completion quality: acceptance rate, or a harder proxy like whether accepted code was later reverted?',
        'What would you test to confirm cross-tenant isolation actually holds under load?',
      ],
      deploy: [
        'How do you roll out a new completion model without a latency regression that users would immediately notice?',
        'What is the fallback if the low-latency completion path is degraded: a smaller local model, or disable completions temporarily?',
      ],
      wrapup: [
        'Restate the context-retrieval strategy chosen for completions and its latency cost.',
        'Name the first thing you would improve if acceptance rate dropped after a model update.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // mlp-rag-systems
  // ---------------------------------------------------------------------
  {
    id: 'sdq-enterprise-rag-search',
    patternId: 'mlp-rag-systems',
    title: 'Design an enterprise search system grounded with RAG',
    tier: 'ai',
    companies: ['amazon', 'google'],
    minutes: 60,
    steps: {
      define: [
        'What document sources must be searchable, and how does per-document access control constrain what can be retrieved for a given user?',
        'What is the acceptable answer latency, and does that cap how many retrieval and reranking passes fit in the budget?',
        'What must the answer include to be trustworthy: citations to source documents?',
      ],
      data: [
        'How are documents chunked and embedded, and how is per-document or per-folder access control attached to each chunk?',
        'What index combines keyword and dense retrieval, and how is it kept current as documents are added or updated?',
      ],
      architecture: [
        'Design the retrieval path: hybrid search, access-control filtering, and reranking before the context reaches the LLM.',
        'How do you enforce that a user only ever sees retrieved content they are authorized to access, even under a prompt trying to bypass it?',
        'How does the system build a cited answer, and how does it handle a query with no good matching document?',
      ],
      evaluate: [
        'How would you build a gold evaluation set that covers both retrieval quality and answer faithfulness?',
        'What would you measure to catch the answer citing a document the retrieval step never actually returned?',
      ],
      deploy: [
        'How do you reindex a document the moment its access permissions change, so a stale index never leaks it?',
        'What is the fallback if retrieval returns nothing relevant: say "I don\'t know," or fall back to unretrieved model knowledge?',
      ],
      wrapup: [
        'What single test would convince you access control cannot be bypassed by a cleverly worded query?',
        'What would you tell the interviewer you deliberately skipped for a first version of this system?',
      ],
    },
  },
  {
    id: 'mlq-design-customer-support-chatbot',
    patternId: 'mlp-rag-systems',
    title: 'Design a customer support chatbot grounded in product documentation',
    tier: 'ml',
    companies: ['amazon', 'google'],
    minutes: 60,
    steps: {
      define: [
        'What is the chatbot allowed to do: answer from documentation only, or also take actions like issuing a refund?',
        'What is the acceptable rate of escalation to a human agent, and what triggers it?',
        'What must the bot never do: fabricate a policy that does not exist, or promise something support cannot honor?',
      ],
      data: [
        'How is product documentation chunked and indexed so retrieval finds the right policy section for a given question?',
        'How is conversation history combined with retrieved documentation in the prompt without exceeding the context budget?',
      ],
      architecture: [
        'Design the retrieval and generation path, including where a confidence check decides to escalate to a human.',
        'How do you handle a multi-turn conversation where the user\'s real question only becomes clear several turns in?',
        'How would you integrate an action (like checking an order status) alongside the retrieval-grounded answer?',
      ],
      evaluate: [
        'How would you build a gold set of support questions with reference answers to evaluate faithfulness?',
        'What would you measure to catch a hallucinated policy before it reaches a customer?',
      ],
      deploy: [
        'How do you update the bot immediately after a policy documentation change, without a stale-answer window?',
        'What is the escalation path if the bot is uncertain, and how do you measure whether escalation happens often enough?',
      ],
      wrapup: [
        'Restate the escalation-trigger design chosen and the risk it manages.',
        'Name the first failure mode you would expect in production and how you would catch it.',
      ],
    },
  },
  {
    id: 'mlq-design-podcast-search-engine',
    patternId: 'mlp-rag-systems',
    title: 'Design a semantic search engine over podcast transcripts',
    tier: 'ml',
    companies: ['spotify', 'google'],
    minutes: 60,
    steps: {
      define: [
        'Does search need to find an exact quote, a topic discussed, or both, and does that change the retrieval design?',
        'What is the acceptable delay between a new episode publishing and it becoming searchable?',
        'Must results link to the exact timestamp in the audio, and how precise must that be?',
      ],
      data: [
        'How is a transcript chunked for embedding: by fixed length, by speaker turn, or by topic segment?',
        'What metadata (timestamp, speaker, episode) travels with each chunk so a result can jump to the right moment?',
      ],
      architecture: [
        'Design the ingestion pipeline: transcription, chunking, embedding, and indexing for a new episode.',
        'Design hybrid retrieval combining keyword search for exact quotes with dense retrieval for topical matches.',
        'How do you rank results when both exact-quote and topical matches are candidates for the same query?',
      ],
      evaluate: [
        'How would you build a gold evaluation set covering both exact-quote and topical queries?',
        'What would you measure to confirm timestamp precision is good enough for the product experience?',
      ],
      deploy: [
        'How do you handle a backlog of episodes needing reindexing after a chunking strategy change?',
        'What is the fallback if transcription for a new episode is delayed: partial search, or wait?',
      ],
      wrapup: [
        'Restate the chunking strategy chosen and its trade-off between topical and quote-level precision.',
        'Name the first thing you would improve if users complained results jumped to the wrong timestamp.',
      ],
    },
  },

  // ---------------------------------------------------------------------
  // mlp-agent-platforms
  // ---------------------------------------------------------------------
  {
    id: 'sdq-agent-safeguards',
    patternId: 'mlp-agent-platforms',
    title: 'Design safeguards for an autonomous LLM agent that takes real-world actions',
    tier: 'ai',
    companies: ['openai', 'anthropic'],
    minutes: 60,
    steps: {
      define: [
        'What actions can the agent take, and which of them are irreversible (a payment, a delete, an email sent)?',
        'What must require human approval before executing, versus what can run fully autonomously?',
        'What is the acceptable false-positive rate for blocking a safe action versus the risk of an unsafe one slipping through?',
      ],
      data: [
        'What audit log must be captured for every action: the plan, the tool call, the input, and the outcome?',
        'How is a tool\'s permission scope defined so the agent cannot call it outside its intended use?',
      ],
      architecture: [
        'Design the guardrail layers: input validation, a plan review step, and output or action-level checks before execution.',
        'How do you contain a prompt injection delivered through a tool\'s returned content from hijacking the agent\'s next action?',
        'How would a human-approval step fit into the loop without destroying the latency benefit of automation?',
      ],
      evaluate: [
        'How would you build a red-team evaluation set specifically targeting prompt injection and scope escalation?',
        'What would you measure to confirm the approval gate actually catches the irreversible actions it is meant to?',
      ],
      deploy: [
        'How do you roll out a new tool to the agent without first proving its permission scope is correctly bounded?',
        'What is the incident response when an agent takes an unintended action: an automatic kill switch, and what does it roll back?',
      ],
      wrapup: [
        'What single action, if taken without approval, would worry you most, and does your design actually stop it?',
        'What part of this design would you cut under a tight deadline, and what risk would that accept?',
      ],
    },
  },
  {
    id: 'mlq-design-customer-support-agent-observability',
    patternId: 'mlp-agent-platforms',
    title: 'Design observability for a multi-step customer support agent',
    tier: 'ml',
    companies: ['amazon', 'google'],
    minutes: 60,
    steps: {
      define: [
        'What must be observable: every tool call and its result, the agent\'s reasoning trace, or both?',
        'What counts as agent failure: a wrong final answer, an infinite tool-call loop, or an unauthorized action?',
        'What is the acceptable delay between an agent run completing and its trace being available for review?',
      ],
      data: [
        'What does a trace record need to reconstruct a run: each step\'s prompt, tool call, tool result, and token cost?',
        'How is cost (tokens, tool calls) attributed per run so a runaway agent is caught quickly?',
      ],
      architecture: [
        'Design the tracing pipeline: how spans for each agent step link into one reviewable run trace.',
        'How do you detect a loop (the agent repeating the same failed tool call) in near real time rather than after the fact?',
        'How would you surface traces to a human reviewer in a way that makes a bad run\'s root cause obvious quickly?',
      ],
      evaluate: [
        'How would you build an evaluation suite scoring task success, steps taken, and cost per run?',
        'What would you measure to confirm the loop detector catches real loops without false-flagging legitimate retries?',
      ],
      deploy: [
        'What is the automatic response when cost per run for a session exceeds a budget: stop the agent, or downgrade the model?',
        'How do you roll out a change to the agent\'s tool set without losing trace continuity for in-flight sessions?',
      ],
      wrapup: [
        'Restate the loop-detection mechanism chosen and its false-positive risk.',
        'Name the first metric you would put on a dashboard for an on-call engineer watching this agent in production.',
      ],
    },
  },
  {
    id: 'mlq-design-multi-agent-orchestrator',
    patternId: 'mlp-agent-platforms',
    title: 'Design a multi-agent orchestration platform for complex tasks',
    tier: 'ml',
    companies: ['google', 'meta'],
    minutes: 60,
    steps: {
      define: [
        'What orchestration pattern fits the task: a single planner delegating to specialized workers, or a chain of sequential agents?',
        'What must the orchestrator guarantee about task completion: a hard timeout, a max step count, or both?',
        'How is failure of one worker agent handled: retry, escalate to a human, or fail the whole task?',
      ],
      data: [
        'What shared state or memory must persist across agents working on the same task, and where does it live?',
        'How is each worker\'s output validated before the orchestrator hands it to the next step?',
      ],
      architecture: [
        'Design the orchestrator: how it decomposes a task, assigns it to workers, and aggregates their results.',
        'How do you prevent two workers from taking conflicting actions on shared state concurrently?',
        'How would you cap runaway cost or step count if the orchestrator gets stuck in a delegation loop?',
      ],
      evaluate: [
        'How would you evaluate end-to-end task success versus each individual worker\'s success rate?',
        'What would you measure to catch the orchestrator delegating in a loop without making progress?',
      ],
      deploy: [
        'How do you roll out a change to one worker agent without needing to redeploy the whole orchestration graph?',
        'What is the fallback when a worker agent is unavailable: retry with backoff, or reroute to a different worker?',
      ],
      wrapup: [
        'Restate the orchestration pattern chosen and why it fits this task better than a single powerful agent.',
        'Name the first failure mode you would drill for before trusting this platform with a high-stakes task.',
      ],
    },
  },
]
