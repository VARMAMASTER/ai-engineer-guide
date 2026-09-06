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
    solution: {
      define:
        'One shared L7 gateway fleet owns TLS termination, JWT verification, rate limiting, routing and header shaping; business validation stays in the service. Added latency is a hard budget of 5ms p50 and 15ms p99, because every request pays it.',
      data:
        'The routing table is a versioned config blob served by a control plane (Envoy xDS style), pushed to every proxy and swapped atomically in memory, so no request ever reads a database to find its upstream. JWT signatures are verified locally against a cached JWKS refreshed every 5 minutes; rate-limit counters live in a sharded Redis with a per-process pre-check so the common case never leaves the pod.',
      architecture:
        'Envoy-style proxy: terminate TLS, match route by host and path prefix, verify JWT, check the limit, pick an upstream by least-request over endpoints from EDS, stream the body through, inject trace headers, emit metrics. Health is active checks plus outlier detection so a bad host is ejected in about 10 seconds without waiting for a registry update.',
      evaluate:
        'Measure gateway-added latency as total_time minus upstream_response_time per request and alarm on the p99 of that delta, not on end-to-end latency which is dominated by backends. Load-test against a null upstream that returns 200 immediately, so the number you get is the proxy cost alone.',
      deploy:
        'Config changes ship as xDS pushes with a 30-second drain: old listeners keep serving in-flight requests while new connections take the new config. The fleet is stateless behind anycast and an L4 balancer in at least two zones, and because a gateway outage is a total outage, binary deploys canary at 1 percent of pods for 20 minutes before proceeding.',
      wrapup:
        'The number that indicts the gateway rather than the backends is self-added p99 over 15ms, or a 5xx rate generated inside the proxy above 0.01 percent. Deliberately out of scope for v1: response caching, GraphQL federation and per-route body transformation, which belong in a per-team BFF, not in the shared front door.',
      numbers: [
        '50K RPS peak x 3KB average request = 150 MB/s ingress, which one 10GbE link per zone absorbs with room to spare',
        '50K RPS / 5K RPS per proxy pod = 10 pods at capacity, so run 20 for N+1 across two zones',
        'JWT verify at ~50us with a cached JWKS x 50K RPS = 2.5 CPU-seconds per second, about 3 cores of the fleet spent purely on auth',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'Let me scope this as one shared north-south gateway in front of roughly 200 internal services, and I want to treat added latency as a hard budget up front rather than something we measure afterwards.',
      traps: [
        'Designing a gateway that calls an auth service or a config database on every request. That is a second network hop on the critical path of 100 percent of traffic; token verification must be local against a cached key set.',
        'Never naming the gateway as a shared failure domain. If you do not describe canarying and connection draining for a config push, the interviewer will assume one bad route takes the whole company down.',
        'Adding response caching and protocol translation in the first ten minutes. Both make the gateway stateful and invite invalidation questions you did not need to answer.',
        'Quoting a fleet-wide RPS number without ever saying what a single proxy pod handles, which leaves you unable to size the fleet when asked.',
      ],
      whenPushed: [
        {
          challenge: 'Why a central fleet instead of a service-mesh sidecar per service?',
          answer:
            'For east-west traffic I would use sidecars, and they do remove the extra hop. For north-south I still want a central fleet, because TLS termination, WAF rules and external auth belong in one place rather than in 200 teams\' deploy pipelines.',
        },
        {
          challenge: 'Your rate-limit Redis is a single point of failure.',
          answer:
            'It is, and I fail open on it: if the counter store is unreachable the gateway serves the request and emits a metric. Losing rate limiting for 30 seconds is cheaper than a full outage, but I accept that an attacker who can knock over Redis also gets unmetered requests.',
        },
        {
          challenge: '15ms of added p99 latency is a lot for a proxy.',
          answer:
            'Agreed, and most of it is TLS handshake and cold connection setup, not proxying. With upstream connection pooling and TLS session resumption the steady-state number is 2 to 3ms; 15ms is the budget I am willing to spend including cold starts.',
        },
      ],
    },
    diagram: `flowchart TD
  C["Client"] -->|TLS| LB["L4 balancer / anycast"]
  LB --> GW["Envoy L7 proxy"]
  GW -->|verify JWT| JW[("Cached JWKS")]
  GW -->|overflow only| RL[("Redis rate counters")]
  GW -->|least request| S1["Service A"]
  GW --> S2["Service B"]
  CP["xDS control plane"] -->|route config push| GW
  GW -->|active checks| S1
  GW -->|metrics and traces| OBS["Telemetry"]`,
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
    solution: {
      define:
        'Codes must be unguessable, so I use a random 7-character base62 code rather than a sequential counter, and accept a collision check on write. Reads dominate writes by roughly 100 to 1, which makes this a caching and redirect problem, not a storage problem. Links carry an optional TTL and an unknown code returns 404, never a guess.',
      data:
        'One table: code (primary key), long_url, owner_id, created_at, expires_at. Codes come from 7 random base62 characters written with an INSERT IF NOT EXISTS, so a collision costs one retry instead of a coordination service. Storage is DynamoDB or Cassandra partitioned on code, because the only access pattern is an exact-key lookup.',
      architecture:
        'Write path: validate URL, generate code, conditional insert, return. Read path: 301 or 302 from an edge cache, falling back to Redis, falling back to the store, then write back into Redis with a 24-hour TTL. Use 302 rather than 301 so analytics still see every hit, and accept the extra round trip. Sharding is by code hash, which is uniform by construction because codes are random.',
      evaluate:
        'Prove collision safety by hammering the create path with a forced 3-character code space until conditional inserts start failing, then confirm no row was ever overwritten. Load-test the redirect path with a Zipf distribution over codes, not a uniform one, because a uniform test hides the fact that 1 percent of links carry most of the traffic.',
      deploy:
        'Redirect and create are separate services and separate deployments, since redirect needs 10x the capacity and near-zero write dependency. Click analytics are fire-and-forget onto Kafka after the redirect is already returned, so a lost counter is acceptable and a slow analytics pipeline can never slow a redirect.',
      wrapup:
        'The assumption to test first is the 100:1 read:write ratio, because if it is really 5:1 the cache buys almost nothing and the money goes into write throughput instead. Under a one-day deadline I would cut custom aliases and analytics and ship code generation plus a Redis-fronted lookup.',
      numbers: [
        '100M new links/year / 31.5M seconds = ~3 writes/sec average, trivial; the design is driven entirely by reads',
        '100:1 read ratio = 300 redirects/sec average, 1K/sec at 3x peak, well inside one Redis node',
        '62^7 = 3.5 trillion codes; at 1B links stored the collision probability per insert is about 0.03 percent, so one retry handles it',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I want to pin the read-to-write ratio and whether codes must be unguessable first, because those two answers decide the whole design and everything else is bookkeeping.',
      traps: [
        'Reaching for a distributed counter with Zookeeper or a Snowflake-style ID service. It is real engineering for a problem that a random code plus a conditional insert solves with one retry, and it makes codes enumerable.',
        'Saying 301 without thinking. A permanent redirect is cached by the browser forever, which kills your click analytics and makes a link impossible to retire.',
        'Sizing the write path carefully and the read path not at all, when reads are 100x larger and are the only thing that will ever fall over.',
        'Ignoring expiry cleanup and ending up promising a full-table scan; TTL on the row in DynamoDB or Cassandra does this for free.',
      ],
      whenPushed: [
        {
          challenge: 'What if two users create the same code at the same instant?',
          answer:
            'The conditional insert makes that a lost race, not a corruption: the second writer gets a condition-failed error and regenerates. At 1B rows the retry rate is under a thousandth of a percent, so I never need a coordinator.',
        },
        {
          challenge: 'Custom aliases break your uniform sharding.',
          answer:
            'They do, and they also break unguessability. I would put custom aliases in the same keyspace but hash the alias for the partition key, so distribution stays uniform; the real cost is that popular vanity aliases are now a hot key and need the same edge caching as any other.',
        },
        {
          challenge: 'How do you count clicks accurately if analytics is fire-and-forget?',
          answer:
            'I do not count them accurately, and I would say so up front. Redirect latency is the product; analytics is best-effort with an accepted loss of well under a percent during a Kafka blip. If exact counts were required I would batch counts in the redirect service and flush them with an idempotency key.',
        },
      ],
    },
    diagram: `flowchart TD
  U["Client"] -->|POST create| W["Create service"]
  W -->|conditional insert| DB[("Key-value store by code")]
  U -->|GET code| CDN["Edge cache"]
  CDN -->|miss| RS["Redirect service"]
  RS -->|hot lookup| RC[("Redis 24h TTL")]
  RC -->|cache miss| DB
  RS -->|302 to long URL| U
  RS -.->|fire and forget| K["Kafka clicks"]`,
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
    solution: {
      define:
        'Support password plus OAuth plus WebAuthn passkeys behind one credential abstraction, so adding a factor is not a redesign. Sessions must survive a server restart and work across devices. Revocation target is 60 seconds globally after a password change or a reported theft, which is the number that decides the token design.',
      data:
        'Passwords are stored with Argon2id at a cost tuned to about 100ms per verify on production hardware, which is a deliberate ceiling on login throughput. Access tokens are short-lived signed JWTs (10 to 15 minutes) carrying user id, scopes and a key id; refresh tokens are opaque random strings stored server-side so they can actually be revoked. That split is the whole design: stateless for the hot path, stateful where revocation matters.',
      architecture:
        'Login verifies the credential, issues an access-refresh pair, and sets the refresh token in an HttpOnly SameSite=Strict cookie. Every other service verifies the JWT at the gateway with a cached public key, so no auth round trip per request. Refresh rotates: each use invalidates the old refresh token and issues a new one, and reuse of a consumed token means theft, so the whole token family is revoked and the user is forced to re-login.',
      evaluate:
        'Credential stuffing shows up as a spike in failed logins with high distinct-username-per-IP and a low per-username retry count, which is the opposite shape of a forgetful user, so alert on that ratio rather than on raw failure count. Because Argon2id sets the floor, the login latency metric to watch is queue wait in front of the hashing workers, not the hash itself.',
      deploy:
        'Signing keys rotate by publishing the new public key to JWKS first, waiting one full access-token lifetime, then switching the signer, so no live token is ever orphaned. If the auth service goes down, existing access tokens keep working for up to 15 minutes because verification is local, which means the outage manifests as no new logins rather than a total outage.',
      wrapup:
        'The trade is short-lived stateless access tokens for a 15-minute worst-case revocation window, in exchange for zero auth calls on the request path; the alternative, server-side sessions, revokes instantly but puts a session lookup on every request. After a red-team review the first thing I would harden is refresh-token binding, tying the token to a device fingerprint so a stolen cookie is not portable.',
      numbers: [
        '10M MAU with 1 login/week = ~1.4M logins/day = 16 logins/sec average, 50/sec at 3x peak',
        'Argon2id at 100ms per verify x 50 logins/sec = 5 CPU-seconds/second, so 5 to 8 dedicated hashing cores; this is the reason login has its own fleet',
        '15-minute access-token lifetime is the revocation SLA; cutting it to 5 minutes triples refresh traffic to about 150 refreshes/sec',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'Before choosing tokens I want the revocation requirement, because how fast you must be able to kill a session is the single input that decides stateless versus stateful.',
      traps: [
        'Choosing long-lived JWTs with no refresh story, then having no answer for how to log a user out. Revocation is the question the interviewer is actually asking.',
        'Forgetting that Argon2id or bcrypt is intentionally expensive, so login is CPU-bound in a way no other endpoint is and needs its own autoscaling group.',
        'Storing the access token in localStorage. It is XSS-readable; the refresh token belongs in an HttpOnly cookie and you should say so unprompted.',
        'Treating key rotation as a footnote. Rotating a signing key without a JWKS overlap period invalidates every live session at once, which is a self-inflicted outage.',
      ],
      whenPushed: [
        {
          challenge: 'A 15-minute revocation window is unacceptable for a banking product.',
          answer:
            'Then I move to server-side sessions with a Redis lookup on every request, and pay roughly 1ms plus a hard dependency on Redis for every API call. That is the honest cost, and for a bank it is the right trade; for a consumer product it is not.',
        },
        {
          challenge: 'How do you handle a stolen refresh token?',
          answer:
            'Rotation with reuse detection. Each refresh consumes the old token; if a consumed token is ever presented again, one of the two holders is an attacker and I cannot tell which, so I revoke the entire token family and force re-authentication. It is a deliberate false-positive cost on users with flaky networks.',
        },
        {
          challenge: 'Your gateway verifies JWTs locally, so a compromised signing key is catastrophic.',
          answer:
            'Correct. The key lives in an HSM or KMS and the service signs through it rather than holding the material, rotation is on a 90-day schedule with the overlap I described, and a suspected compromise means an emergency rotation that does log everyone out. I accept that blast radius in exchange for no per-request auth hop.',
        },
      ],
    },
    diagram: `flowchart TD
  U["Client"] -->|credentials| A["Auth service"]
  A -->|Argon2id verify| PW[("User store")]
  A -->|opaque token| RT[("Refresh token store")]
  A -->|short lived JWT| U
  U -->|JWT on every call| GW["Gateway"]
  GW -->|local verify| JWKS[("Cached JWKS")]
  GW --> SVC["Backend services"]
  U -->|rotate on use| A
  A -.->|reuse detected: revoke family| RT`,
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
    solution: {
      define:
        'In-process LRU cache, fixed entry count rather than fixed bytes, sized so the working set fits in one node\'s heap; if it does not, this is the wrong problem and you want the distributed version. Stale reads are acceptable within the TTL, which is what makes a cache legal here at all.',
      data:
        'HashMap from key to node, plus an intrusive doubly linked list for recency: get is O(1) with a splice to head, put is O(1) with a tail eviction. Per-entry overhead is the map entry plus two pointers plus the key, roughly 80 to 100 bytes of bookkeeping in a JVM before the value, which is what caps entry count for a given heap.',
      architecture:
        'get: hash lookup, on hit unlink and push to head and return, on miss return null and let the caller populate. put: insert at head, and if size exceeds capacity, unlink the tail and remove its key from the map. For concurrency, shard the cache into 16 or 32 independent segments by key hash, each with its own lock and its own LRU list, so contention is per-segment and not global.',
      evaluate:
        'Measure hit rate against a shadow LFU counter over the same trace; if LFU would have hit substantially more, the workload has a stable hot set and LRU is being flushed by scans. Test eviction correctness by driving concurrent puts and gets from many threads against a single-threaded reference implementation and comparing final key sets, since a race here shows up as a leaked entry, not a crash.',
      deploy:
        'A restart loses everything, so the real question is whether the backing store survives 100 percent miss traffic for the warm-up window; if not, warm from a snapshot or ramp traffic in. Capacity is resized by adjusting the per-segment limit and evicting lazily on the next put rather than flushing, so a resize never causes a miss storm.',
      wrapup:
        'The metric that exposes a wrong eviction policy fastest is hit rate broken down by key age: if recently inserted keys are being evicted before they are ever read a second time, the cache is thrashing and capacity or policy is wrong. Deliberately skipped: byte-accurate sizing, entry cost weighting, and any cross-node coherence.',
      numbers: [
        '1M entries x (100 bytes overhead + 200 byte value) = ~300MB, which fits a 1GB heap with headroom',
        'At 90 percent hit rate and 10K gets/sec the backing store sees 1K QPS; at 80 percent it sees 2K, so 10 points of hit rate double backend load',
        '16 segments at 10K ops/sec = 625 ops/sec per lock, far below the point where lock contention shows up',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I will treat this as a single-node in-process cache with a fixed entry budget, and I want to state the eviction policy and the concurrency strategy explicitly because those are the only two interesting decisions here.',
      traps: [
        'Writing the LRU with a HashMap plus an array or a priority queue, which makes eviction O(n) or O(log n) and quietly defeats the point of a cache.',
        'Answering the thread-safety question with one global lock. It works, and the interviewer will immediately ask what happens at 100K ops/sec; lock striping is the expected answer.',
        'Ignoring per-entry memory overhead, then claiming a 1M-entry cache fits in 200MB when the bookkeeping alone is close to that.',
        'Forgetting that a scan-heavy workload destroys LRU. If any caller iterates the keyspace, one pass evicts your entire hot set, and either segmented LRU or an admission filter is the fix.',
      ],
      whenPushed: [
        {
          challenge: 'Why LRU and not LFU?',
          answer:
            'LRU is one pointer splice and no counters, and it adapts instantly when the hot set shifts. LFU wins on a stable skewed distribution but needs aging or it never forgets a formerly popular key. If measurement showed a stable hot set I would move to TinyLFU, which gets most of LFU\'s hit rate with a sketch instead of per-key counters.',
        },
        {
          challenge: 'Your linked list makes this hard to make lock-free.',
          answer:
            'True, and I would not try. Lock striping gets me to the throughput I need with code I can reason about. If I needed more, I would move to the Caffeine approach: buffer the recency updates in a ring per thread and replay them in batches, so reads never touch the list synchronously.',
        },
        {
          challenge: 'What happens if one value is 100MB?',
          answer:
            'The entry-count limit fails badly and I blow the heap. The fix is a weigher that sizes entries in bytes and evicts on total weight, which costs an extra field and makes eviction slightly less exact. I would take that trade the moment value sizes are not uniform.',
        },
      ],
    },
    diagram: `flowchart TD
  CL["Caller"] -->|get key| SEG["Hash to 1 of 16 segments"]
  SEG --> MAP[("Segment hash map")]
  MAP -->|hit: splice to head| LRU["Segment LRU list"]
  MAP -->|miss| CL
  CL -->|put| SEG
  SEG -->|insert at head| LRU
  LRU -->|over capacity| EV["Evict tail and drop key"]
  EV --> MAP
  CL -.->|on miss| SRC[("Backing store")]`,
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
    solution: {
      define:
        'Target 95 percent hit rate at sub-millisecond p99 on a read-heavy workload in front of several datastores. Cache-aside, not write-through: the application already knows how to load, and write-through couples cache availability to write availability. Staleness bound is the TTL, and I will state it as 60 seconds rather than pretend it is zero.',
      data:
        'Keys map to nodes by consistent hashing with about 200 virtual nodes per physical node, so adding a node moves roughly 1/N of keys instead of rehashing everything. Each entry carries value, TTL, and a version stamp from the source row so a stale write cannot overwrite a newer one on a race.',
      architecture:
        'A local miss goes to the owning node, then to the datastore, then writes back. Invalidation is delete-on-write from the writer plus TTL as a backstop, because broadcast invalidation to every node is a fan-out you do not need with consistent hashing: exactly one node owns the key. Thundering herd on a hot key expiry is handled by a per-key single-flight lock plus early recomputation, where one holder refreshes at 90 percent of TTL while others keep serving the old value.',
      evaluate:
        'Track hit rate bucketed by key popularity decile, because an aggregate 95 percent can hide the fact that the cold tail misses 60 percent of the time and drives all your backend load. To expose a hot-key bottleneck, load-test with a Zipf alpha of 1.0 rather than uniform keys and watch per-node CPU, not fleet-average CPU.',
      deploy:
        'Adding a node moves only its share of the ring, and those keys arrive cold; ramp the new node\'s ring weight from 0 to full over a few minutes so the miss burst is spread rather than instantaneous. If the whole cache tier is down, fail open to the datastore behind a concurrency limiter, because a 20x load spike on the database turns a cache outage into a database outage.',
      wrapup:
        'Invalidation is delete-on-write plus a 60-second TTL backstop, which accepts up to 60 seconds of staleness in the window where a delete is lost. At 10x key cardinality the working set stops fitting in memory and hit rate collapses long before CPU does, so the first change is more memory per node, then client-side consistent hashing to remove the proxy hop.',
      numbers: [
        '500M keys x 1KB = 500GB of working set; at 64GB usable per node that is 8 nodes, run 12 for headroom and replication',
        '200K reads/sec at 95 percent hit rate = 10K/sec reaching the datastore; at 90 percent it is 20K/sec, so the hit rate target is really a database sizing decision',
        'One hot key at 50K reads/sec on a node that handles 100K total = half a node consumed by one key, which is why hot keys get replicated to 3 nodes',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to fix the hit-rate target and the acceptable staleness window first, because those two numbers determine both the memory bill and whether cache-aside is even legal for this workload.',
      traps: [
        'Saying consistent hashing and stopping there. Without virtual nodes the ring is lumpy and one node ends up with three times its share of keys.',
        'Ignoring the hot key. Consistent hashing spreads keys evenly and does absolutely nothing for a single key that receives 30 percent of traffic; that needs replication or client-side caching of the top keys.',
        'Promising strong consistency by broadcasting invalidations to every node, which is both a fan-out storm and unnecessary when exactly one node owns each key.',
        'Failing open to the database with no concurrency limit, so a cache outage instantly becomes a database outage at 20 times normal load.',
      ],
      whenPushed: [
        {
          challenge: 'Cache-aside means the first reader of every key is slow. Why not write-through?',
          answer:
            'Write-through keeps the cache warm but makes every write depend on cache availability and fills memory with keys nobody reads. On a read-heavy workload with a long tail I would rather pay a cold miss than cache the entire write stream, but if writes were narrow and always read back quickly, write-through is the better call.',
        },
        {
          challenge: 'What stops a stale value from being written back over a fresh one?',
          answer:
            'The version stamp. On write-back I compare the version I loaded against what is in the cache and drop mine if it is older. This is a compare-and-swap, not a blind set, and it closes the classic read-load-write race that TTL alone does not.',
        },
        {
          challenge: 'How do you replicate hot keys without doubling your memory?',
          answer:
            'Only the hot ones. Nodes track per-key request rates with a count-min sketch, and any key above a threshold is copied to the next two nodes on the ring with the client picking randomly among them. That covers less than 0.1 percent of keys, so the memory cost is negligible and the write path has to invalidate all three copies.',
        },
      ],
    },
    diagram: `flowchart TD
  A["App server"] -->|consistent hash 200 vnodes| N1["Cache node owning key"]
  N1 -->|hit| A
  N1 -->|miss: single flight lock| DB[("Datastore")]
  DB -->|write back with version| N1
  N1 -->|refresh at 90 pct TTL| N1
  W["Writer"] -->|delete on write| N1
  W --> DB
  N1 -->|hot key only| N2["Replica node"]
  A -.->|tier down: limited concurrency| DB`,
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
    solution: {
      define:
        'Budget is 100ms p99 from keystroke to rendered list including network, which means roughly 30ms of server time and rules out anything that scores candidates with a model on the fly. Suggestions are global and precomputed with a light personalization re-rank on the client. Trending queries must appear within about 10 minutes, not seconds.',
      data:
        'A trie whose every node stores its own precomputed top-10 completions with scores, so a lookup is a prefix walk of at most the query length and then a memcpy, with no traversal of the subtree. Frequencies come from an hourly aggregation of the query log into (query, count) pairs with time decay, so last week\'s spike fades.',
      architecture:
        'Client debounces 50ms and cancels in-flight requests, then hits an edge cache keyed on the prefix. On a miss, the request goes to a trie shard chosen by the first two characters of the prefix. The trie is rebuilt offline every hour and shipped as an immutable blob; serving nodes load the new blob into memory and flip a pointer, so there is never a partially updated trie. Real-time trending is a small second trie built every 5 minutes from a streaming counter and merged at query time.',
      evaluate:
        'Speed is not the metric that matters: measure the fraction of searches that end in a suggestion click, and the mean rank of the clicked suggestion. A fast list nobody clicks is a failed feature. For load, replay a real prefix distribution, since single letters like the prefix a are thousands of times hotter than three-letter prefixes and a uniform test never finds that.',
      deploy:
        'Blob swaps are atomic pointer flips per node, and nodes are drained in waves so no user sees two different ranked lists inside one session. If the suggestion service times out, the client shows nothing rather than a stale list, because a wrong suggestion at 100ms is worse than no suggestion at all.',
      wrapup:
        'The trade is hourly rebuilds for cheap serving, patched by a 5-minute trending trie, which means a genuinely novel query takes about 5 minutes to surface. At 50x query volume the hourly rebuild job, not the serving path, is what breaks first, and the fix is incremental trie updates or partitioning the rebuild by prefix shard.',
      numbers: [
        '5 keystrokes per search x 100M searches/day = 500M lookups/day = ~6K QPS average, 20K at peak',
        'Edge cache on short prefixes serves about 70 percent, so origin sees ~6K QPS at peak across 26+ shards',
        '10M distinct queries x ~30 bytes plus top-10 lists per node = roughly 4 to 6GB per full trie, so it fits in memory on one node and sharding is for QPS, not size',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'The binding constraint here is that the round trip has to finish inside about 100ms per keystroke, so I am going to design backwards from that and precompute everything I possibly can.',
      traps: [
        'Storing only frequencies at trie leaves and computing top-k by walking the subtree at query time. For the prefix a that subtree is most of your corpus, and you have blown the latency budget on the most common prefix in the language.',
        'Mutating the trie in place to add trending queries. Concurrent reads during a mutation give inconsistent lists; immutable blob plus pointer swap is both simpler and faster.',
        'Forgetting the client. Debouncing and request cancellation cut server load by more than half, and not mentioning them signals you have never built one.',
        'Sharding by hash of the full query, which is useless: lookups are by prefix, so the shard key has to be a prefix of the prefix.',
      ],
      whenPushed: [
        {
          challenge: 'Your trending path is five minutes behind. During a breaking news event that is forever.',
          answer:
            'Agreed, and for a news-driven product I would shorten the trending trie to 30-second windows fed from a streaming aggregation, accepting noisier rankings and a much higher rebuild cost. The hourly main trie stays as the stable base; only the merge layer gets faster.',
        },
        {
          challenge: 'How do you personalize if everything is precomputed?',
          answer:
            'I do not personalize on the server. I over-fetch the top 20 and let the client re-rank against the user\'s own recent queries stored locally. It is free, private, and it covers the case that matters most, which is your own history; genuine per-user server-side ranking would not fit the latency budget.',
        },
        {
          challenge: 'How do you keep offensive or dangerous suggestions out?',
          answer:
            'A blocklist applied at build time to the trie, not at query time, plus a minimum frequency threshold so no rare query becomes a suggestion at all. Filtering at query time costs latency on every request to solve a problem that is static between rebuilds.',
        },
      ],
    },
    diagram: `flowchart TD
  K["Keystroke: 50ms debounce"] --> EC["Edge cache by prefix"]
  EC -->|miss| SH["Trie shard by first 2 chars"]
  SH --> TR[("Immutable trie blob: top10 per node")]
  TR -->|merge| RES["Ranked suggestions"]
  TS[("Trending trie: 5 min")] -->|merge at query time| RES
  RES --> K
  LOG["Query log"] -->|hourly aggregate| BUILD["Trie build job"]
  BUILD -->|atomic pointer swap| TR
  LOG -->|streaming counts| TS`,
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
    solution: {
      define:
        'Get, put, delete and TTL, plus compare-and-set; no range scans, which is what lets me hash-partition freely. Clients get read-your-writes for their own session and eventual consistency otherwise. Values are capped at 1MB, which keeps the storage engine simple and pushes blobs into object storage.',
      data:
        'An LSM tree: writes go to a commit log plus an in-memory memtable, flushed to sorted SSTables, with leveled compaction. That choice buys sequential writes at the price of read amplification and a compaction budget of roughly 10 to 30 percent of disk bandwidth. Bloom filters per SSTable keep a miss from touching every level. Partitioning is consistent hashing on the key with virtual nodes.',
      architecture:
        'A write goes to any node acting as coordinator, which forwards to the N=3 replicas that own the key; the coordinator acks when W=2 have written to their commit log. A read hits R=2 replicas, returns the newest version and issues a read repair for any stale replica. W + R > N gives strong consistency; conflicting concurrent writes are resolved by last-write-wins on a hybrid logical clock, which is honest about losing one update rather than pretending vector clocks are free.',
      evaluate:
        'Benchmark write amplification directly by measuring bytes written to disk divided by bytes written by the client under a sustained load; leveled compaction runs 10 to 30x, and if you never measured it you will be surprised by your disk bill. To prove replication survives failure, kill a node mid-write under load and verify with a full key checksum that no acknowledged write was lost.',
      deploy:
        'Adding a node claims token ranges and streams data from current owners while both serve reads; the new node only starts accepting writes for a range once its stream completes, so there is no write pause. A replica that falls behind is handled by hinted handoff for short outages and a full anti-entropy repair with Merkle trees for long ones.',
      wrapup:
        'N=3, W=2, R=2 is the default: it survives one node loss on both paths and gives quorum consistency, and I would only move to W=1 if write latency mattered more than durability. The assumption to test first is that key access is uniform, because hash partitioning gives you nothing against a single hot key, and one hot partition is what actually takes this design down.',
      numbers: [
        '10K writes/sec x 1KB x 3 replicas = 30 MB/s of replicated write traffic, plus 10 to 30x compaction amplification = 300 MB/s to 900 MB/s of disk writes',
        '10TB of logical data x 3 replicas / 4TB usable per node = 8 nodes minimum, so run 12',
        'Bloom filter at 1 percent false positive = ~10 bits per key; 1B keys per node = 1.25GB of RAM just for filters',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I will start by cutting range scans out of the API, because if I only have to support exact-key access I can hash-partition and never think about hot ranges again.',
      traps: [
        'Choosing an LSM tree and never mentioning compaction. Compaction is the whole cost of the choice, and it is what makes p99 write latency spike in production.',
        'Saying eventual consistency and then also promising every read returns the latest write, without ever writing down N, W and R.',
        'Claiming vector clocks solve conflicts. They detect conflicts; something still has to resolve them, and if you do not say what does, the answer is incomplete.',
        'Ignoring hot keys because consistent hashing spread the key space evenly. Even distribution of keys is not even distribution of traffic.',
      ],
      whenPushed: [
        {
          challenge: 'Last-write-wins loses data.',
          answer:
            'It does, and I would say so to a user, not hide it. Concurrent writes to one key mean one update disappears. The alternative is to return siblings and make the client merge, like Dynamo, which is correct and which almost every client gets wrong. For a general-purpose store I take LWW plus a hybrid logical clock and document it.',
        },
        {
          challenge: 'Why an LSM tree and not a B-tree?',
          answer:
            'Because writes are the constraint here. A B-tree does random page writes and read-modify-write on every update; an LSM turns that into sequential appends. If this were a read-heavy store with a small working set I would take the B-tree instead, because its read amplification is 1 and the LSM\'s is the number of levels.',
        },
        {
          challenge: 'What happens during a network partition?',
          answer:
            'With W=2 and R=2 out of 3, the minority side cannot reach a quorum and fails writes, so I am choosing consistency over availability. Dynamo would take sloppy quorums and hinted handoff to stay writable, and I would enable that only for workloads that can tolerate a conflict, not for a default configuration.',
        },
      ],
    },
    diagram: `flowchart TD
  CL["Client"] --> CO["Coordinator node"]
  CO -->|write to N=3| R1["Replica 1"]
  CO --> R2["Replica 2"]
  CO --> R3["Replica 3"]
  CO -->|ack at W=2| CL
  R1 --> WAL[("Commit log")]
  WAL --> MT["Memtable"]
  MT -->|flush| SST[("SSTables: leveled compaction")]
  CO -->|read R=2| R2
  CO -.->|read repair stale replica| R3`,
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
    solution: {
      define:
        '10M players, a score update per match end rather than per action, so roughly one write per player per few minutes. Three views: global top 100, a player\'s own rank with 5 above and 5 below, and per-region boards. Two seconds of lag on rank is fine; the top-100 board should look live.',
      data:
        'A Redis sorted set per board: ZADD is O(log n), ZREVRANK gives an exact rank in O(log n), and ZREVRANGE serves the top 100 straight from memory. One sorted set per region and per mode, holding only member ids and scores, with player profiles fetched separately, so a player in five boards costs five 16-byte entries and not five copies of their profile.',
      architecture:
        'A score update writes to the durable store (Postgres or Cassandra) first, then ZADDs into every board it belongs to; the sorted set is a derived index that can be rebuilt from the source of truth, which is what makes it safe to keep in memory. Nearby competitors is ZREVRANK to find the player\'s position, then ZREVRANGE over rank-5 to rank+5, both O(log n). Once one board exceeds a node, shard by score range into buckets and keep a small per-bucket count, so a global rank is the sum of counts of higher buckets plus the local rank.',
      evaluate:
        'Load-test rank queries at 10M members and confirm ZREVRANK stays flat, because the risk is not the sorted set, it is fan-out: one score update touching six boards is six writes. To catch a hot board, watch per-shard ops/sec during a live event, since a tournament collapses all traffic onto one region key.',
      deploy:
        'Season end is a rename, not a delete: RENAME the live key to an archive key atomically and let the new season start empty, so there is no window where the board is half-cleared. If Redis is unavailable, serve the last snapshot of the top 100 from a CDN with a visible staleness note, and reject rank queries rather than return a wrong rank.',
      wrapup:
        'The sorted set makes rank and top-N cheap in exchange for holding the whole board in memory and needing a rebuild path after a node loss. At 100x concurrent players the bottleneck is write fan-out onto the single global board key, and the first change is to make the global board approximate: sample or bucket by score and only maintain exact ranks in the top few thousand.',
      numbers: [
        '10M players x (8-byte score + ~24-byte member id + skiplist overhead) = roughly 600MB to 1GB per board in Redis',
        '10M players x 5 matches/day = 50M updates/day = ~600 writes/sec average, 2K at peak, times 3 boards per player = 6K Redis ops/sec',
        'ZREVRANK at log2(10M) = ~23 skiplist hops, tens of microseconds, so rank queries are never the bottleneck; fan-out is',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I want to nail down which views are actually required, because a global top-100 and an exact personal rank for 10 million players are very different problems and only one of them is hard.',
      traps: [
        'Computing rank with a SQL COUNT of players with a higher score. It is correct, it is O(n) per query, and it falls over the moment two thousand players open the board at once.',
        'Treating Redis as the source of truth. The sorted set is an index; without a durable write first, a node loss loses scores and you have no rebuild path.',
        'Missing the fan-out. The interesting write cost is not one ZADD, it is one ZADD per board the player belongs to, and that multiplies with every new board type the product adds.',
        'Answering the sharding question with hash partitioning. Hashing destroys ordering, which is the only thing a leaderboard needs; you have to shard by score range.',
      ],
      whenPushed: [
        {
          challenge: 'What happens when the board does not fit in one Redis node?',
          answer:
            'Shard by score range, not by player. Each shard holds a contiguous score band and its member count; a global rank is the sum of counts above your band plus your local rank inside it. The cost is rebalancing when scores inflate over a season and the bands become uneven.',
        },
        {
          challenge: 'Do you really need exact ranks for a player at position 4 million?',
          answer:
            'No, and I would push back on that requirement. Below the top few thousand I would serve a percentile or a bucketed rank, which needs only counts per band and removes the need for exact global ordering. That single scoping decision removes most of the sharding complexity.',
        },
        {
          challenge: 'How do you handle ties?',
          answer:
            'Redis breaks ties lexicographically by member id, which is arbitrary and will visibly annoy players. I encode the timestamp into the low bits of the score so the earlier achiever ranks higher, at the cost of a few bits of score precision, and I would state that rule in the product.',
        },
      ],
    },
    diagram: `flowchart TD
  G["Match end"] -->|durable write first| DB[("Postgres source of truth")]
  DB -->|ZADD fan-out| ZG[("Redis global sorted set")]
  DB --> ZR[("Redis region set")]
  DB --> ZM[("Redis mode set")]
  API["Leaderboard API"] -->|ZREVRANGE 0 99| ZG
  API -->|ZREVRANK then range| ZG
  ZG -->|top 100 snapshot| CDN["CDN fallback"]
  DB -.->|rebuild after node loss| ZG`,
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
    solution: {
      define:
        'The invariant is no two confirmed reservations overlapping on the same room-night. Search is by city plus date range plus filters and must return in about 300ms; booking is allowed to take a second. Checkout holds inventory for 10 minutes, and that hold has to expire without a human touching it.',
      data:
        'Model availability as room-nights, one row per (room_id, date), rather than as date ranges. That turns overlap detection, which is the genuinely awkward part of this problem, into a set of exact-key rows you can lock, and a 3-night booking is 3 rows. Postgres holds inventory and bookings because you need a real transaction; search runs off an Elasticsearch index of properties denormalized with price, amenities and a per-day availability bitmap, refreshed from the change stream.',
      architecture:
        'Booking opens a transaction, SELECT FOR UPDATE on the specific room-night rows in a fixed order (by date) to avoid deadlock, checks all are free, marks them held with a hold_id and an expires_at, commits. Payment happens outside that transaction; on success the hold becomes a confirmed booking, on failure or timeout a sweeper job releases holds whose expires_at has passed. Search never reads the transactional store: it reads the index and accepts being a few seconds stale, and the booking transaction is what makes staleness safe.',
      evaluate:
        'Run the double-booking test explicitly: 500 concurrent requests for the same room and the same dates, and assert exactly one succeeds and the rest get a clean conflict error, not a 500. For search, load the index with 10x the property count and confirm p99 holds, because Elasticsearch latency degrades with shard size long before it degrades with query rate.',
      deploy:
        'If the payment provider times out, the hold simply expires and the room returns to inventory, so the failure mode is a lost sale rather than a stuck room; a late success from the provider is reconciled by a webhook that either confirms against a still-valid hold or refunds. If confirmation email fails, the booking is still real: notifications are a separate queue with retries, and reconciliation is a daily job comparing confirmed bookings against sent confirmations.',
      wrapup:
        'Concurrency control is pessimistic row locking on room-nights, which costs write throughput on a single popular hotel but makes the invariant impossible to violate; optimistic checking would be faster and would need a retry loop I do not want on a booking path. If search latency became the complaint, the first move is to pre-filter by city and date in a cheaper index and only run the expensive amenity and price scoring on the top few hundred candidates.',
      numbers: [
        '500K properties x 100 rooms x 365 days = 18B room-night rows if fully materialized, so only materialize a 400-day rolling window, about 20B down to what fits a partitioned table',
        '1M searches/day = ~12 QPS average, 50 at peak; 50K bookings/day = under 1 write/sec, so this is a search-scale problem with a correctness-critical write path',
        '10-minute hold x 50K bookings/day = about 350 holds live at any moment, trivially sweepable every 30 seconds',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to state the one invariant that must never break, which is that a room-night cannot be sold twice, and then design the search path separately because it has completely different requirements.',
      traps: [
        'Storing availability as date ranges and then trying to detect overlaps with range predicates under concurrency. Materializing room-nights makes the whole problem an exact-key lock and is the single decision that makes this design work.',
        'Locking rows in whatever order the query returns them, which deadlocks the moment two overlapping bookings interleave. Order the locks by date.',
        'Running the payment call inside the database transaction, holding a row lock open across a 3-second external call.',
        'Serving search from the transactional store to keep it consistent, which puts your search load on the database that has to stay available for bookings.',
      ],
      whenPushed: [
        {
          challenge: 'Search is stale, so a user can try to book a room that is already gone.',
          answer:
            'Yes, and that is deliberate. The booking transaction is the authority and it will reject them with a clear message. Making search strongly consistent would mean reading the transactional store on every search, and I would rather show a rare conflict at checkout than couple search load to the booking database.',
        },
        {
          challenge: 'Row locks on a popular hotel during a conference will serialize everything.',
          answer:
            'They will, and the lock is held only for the length of the check-and-mark, which is single-digit milliseconds, so serialized throughput is still in the thousands per second per room. If one property genuinely exceeded that I would move it to an optimistic version-check with a bounded retry, and pay in occasional retries rather than in lock waits.',
        },
        {
          challenge: 'What if the hold sweeper is down?',
          answer:
            'Rooms stay held past their expiry and I silently lose inventory, which is the quiet failure worth alarming on. The mitigation is that the read path treats expires_at as authoritative: a hold whose time has passed is already free as far as any new booking is concerned, and the sweeper is only cleaning up rows.',
        },
      ],
    },
    diagram: `flowchart TD
  U["Guest"] -->|search| ES[("Elasticsearch: denormalized properties")]
  U -->|book| B["Booking service"]
  B -->|SELECT FOR UPDATE ordered by date| RN[("room_night rows")]
  RN -->|mark held with expires_at| B
  B -->|outside transaction| PAY["Payment provider"]
  PAY -->|success| CONF[("Confirmed booking")]
  PAY -->|failure or timeout| SW["Hold sweeper"]
  SW -->|release expired| RN
  RN -->|change stream| ES
  CONF -.->|async| NOTIF["Notification queue"]`,
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
    solution: {
      define:
        '512KB cap per paste, which comfortably covers a stack trace or a config file and keeps content out of the awkward multi-megabyte range. Content is immutable after creation, which removes editing, versioning and cache invalidation from the design in one move. Pastes are unlisted-by-link with an optional expiry; reads outnumber writes by about 20 to 1.',
      data:
        'Metadata in Postgres or DynamoDB: paste_id, owner, created_at, expires_at, size, content_type, storage_key. Content in S3 under a key derived from the paste id, not in the database, because a 512KB blob in a row destroys your buffer cache for everyone else. Paste ids are 8 random base62 characters, because a sequential id would let anyone walk the corpus.',
      architecture:
        'Create: validate size, PUT the body to S3, then INSERT metadata; if the insert fails the orphaned object is swept later, which is much better than the reverse ordering where a row points at nothing. Read: metadata lookup, expiry check, then either a redirect to a CDN-signed S3 URL or a proxied fetch with the response cached at the CDN by paste id. Expiry is a TTL attribute so the store deletes rows itself, plus an S3 lifecycle rule on the object, so nothing ever scans a table looking for expired work.',
      evaluate:
        'Test expiry by fetching a paste immediately after its TTL passes and confirming it 404s through the CDN, not just at the origin, because a CDN with a long TTL will happily serve an expired paste for hours. Load-test reads with a heavy long tail: a handful of pastes get millions of views and the rest get three, so cache hit rate under a Zipf distribution is the number that matters.',
      deploy:
        'Read and write are separate services: reads scale with the CDN and a stateless fetch tier, writes are a small fleet bounded by S3 PUT throughput. If S3 is briefly unavailable for a read, serve from the CDN if cached and otherwise return a 503 with a retry hint rather than a 404, because telling a user their paste is gone when it is not is the worse error.',
      wrapup:
        'Deliberately skipped: access control beyond unguessable links, abuse and malware scanning, and syntax highlighting on the server, all of which are real product needs but none of which change the storage design. Under a one-day deadline I would cut the CDN and expiry sweeper and ship create plus read against S3 with a metadata row.',
      numbers: [
        '1M pastes/day x average 10KB = 10GB/day = 3.6TB/year of S3, which is a few hundred dollars a year and not a design constraint',
        '20:1 read ratio = 20M reads/day = ~230 reads/sec average, 700 at peak, of which the CDN absorbs 90 percent',
        '1M writes/day = 12 writes/sec average; a single database node handles this, so sharding is a year-3 problem',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'The first thing I want to establish is that pastes are immutable, because if there is no edit path then caching, versioning and invalidation all disappear from this design.',
      traps: [
        'Storing paste bodies as a text column in the primary database. It works at small scale and then poisons the buffer pool, and it makes the database the thing you have to scale for read traffic.',
        'Writing the metadata row before uploading the content, which leaves rows pointing at objects that do not exist. Write the blob first and sweep orphans.',
        'Promising expiry and then implementing it as a nightly scan over the table. TTL on the row and a lifecycle rule on the bucket cost nothing.',
        'Forgetting the CDN caches an expired paste. Expiry has to bound the CDN TTL, or your delete does not actually delete anything users can see.',
      ],
      whenPushed: [
        {
          challenge: 'Why not just serve content directly from your own servers?',
          answer:
            'For the median paste it would be fine. The problem is the one paste that gets linked from the front page of a news site and takes 50,000 requests a minute; that is exactly what a CDN exists for, and it costs me nothing on the 99 percent of pastes nobody reads.',
        },
        {
          challenge: 'Random 8-character ids are not real access control.',
          answer:
            'Correct, they are obscurity, and I would say that plainly to a user. 62^8 is 218 trillion, so enumeration is not practical, but anyone who has the link has the content forever. Real privacy needs an owner check on read and encrypted-at-rest content with a client-held key, which is a different product.',
        },
        {
          challenge: 'How would you shard the metadata store when it outgrows one node?',
          answer:
            'Hash on paste_id, which is already random, so the distribution is uniform by construction and there is no hot shard. The only query that suffers is list-my-pastes, which becomes a scatter-gather; I would solve that with a separate per-owner index table rather than changing the partition key.',
        },
      ],
    },
    diagram: `flowchart TD
  U["Author"] -->|1. PUT body| S3[("Object storage")]
  U -->|2. INSERT metadata| MD[("Metadata store: random 8-char id")]
  R["Reader"] -->|GET id| CDN["CDN cached by paste id"]
  CDN -->|miss| API["Read service"]
  API -->|expiry check| MD
  API -->|fetch body| S3
  MD -.->|row TTL expiry| GONE["404 after expiry"]
  S3 -.->|lifecycle rule| GONE
  MD -->|orphan sweep| S3`,
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
    solution: {
      define:
        'Sync is eventually consistent per file with a server-assigned version order, so every device converges on the same sequence, but no device ever blocks waiting for another. Files up to 50GB, which forces chunking whether you like it or not. Offline edits are supported and reconcile as a conflicted copy, not an automatic merge, because merging arbitrary binary files is not solvable.',
      data:
        'A file is an ordered list of content-defined chunks, averaging 4MB, split by a rolling hash (Rabin fingerprint) rather than at fixed offsets, so inserting a byte at the front re-chunks one block instead of the whole file. Each chunk is keyed by its SHA-256, which gives global dedup for free. Metadata is a per-user journal of (file_path, version, chunk_list, device_id, timestamp), and a client syncs by asking for everything after its last known journal cursor.',
      architecture:
        'Upload: chunk locally, hash, ask the server which hashes it already has, upload only the missing ones directly to object storage with presigned URLs, then commit a new file version referencing the full chunk list. Commit is the only synchronization point and it is a single atomic metadata write. Other devices learn via a long-poll or a websocket notification carrying the new journal cursor, then pull only changed chunks. Conflicts are detected at commit: if the parent version is not current, the server accepts the write as a sibling and renames it as a conflicted copy.',
      evaluate:
        'Measure dedup as unique chunk bytes stored divided by logical bytes across the whole user base, not per user, because the wins come from the same Linux ISO living in ten thousand accounts. To catch a sync storm, simulate 100K clients reconnecting inside 60 seconds after an outage and watch metadata QPS, because every one of them asks for its journal delta at the same instant.',
      deploy:
        'Chunks are replicated across three availability zones with erasure coding rather than full copies, so durability costs about 1.4x storage instead of 3x, at the price of a slower single-chunk read on a degraded stripe. An upload interrupted mid-chunk just resumes: chunks are content-addressed, so re-uploading is idempotent and no partial state exists at the file level until the commit.',
      wrapup:
        'Content-defined chunking plus hashing buys deduplication and delta sync, so editing one page of a 200MB document uploads about 4MB instead of 200MB; the cost is a chunk index that grows with unique content and a rolling-hash pass on every write. At 10x users the metadata journal is the first thing to break, since sync is a read-heavy per-user cursor query, and the fix is sharding the journal by user id.',
      numbers: [
        '100M users x 50GB average = 5EB logical, but at 30 percent dedup and 1.4x erasure overhead the physical bill is about 2.1EB',
        'Editing 1 page of a 200MB file: 1 chunk of 4MB re-uploaded = 2 percent of the file, which is the entire justification for chunking',
        '100K clients reconnecting in 60s = 1.6K metadata QPS on top of steady state, so the delta endpoint needs to be a single indexed cursor read, not a diff computation',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I want to establish the conflict semantics first, because whether two devices editing offline produces a merge or a conflicted copy determines the entire metadata model.',
      traps: [
        'Chunking at fixed 4MB offsets. Insert one byte at the start of a file and every chunk boundary shifts, so you re-upload the entire file; content-defined boundaries are the whole trick.',
        'Promising automatic conflict merges. You cannot merge two versions of a JPEG, and saying so plainly scores better than inventing a resolution policy that cannot exist.',
        'Sending file content through your application servers. Presigned URLs let clients talk to object storage directly, which removes your bandwidth bill and your biggest scaling bottleneck at once.',
        'Ignoring the reconnect storm. The interesting load on this system is not steady state, it is 100,000 clients all asking what did I miss at the same moment.',
      ],
      whenPushed: [
        {
          challenge: 'Global dedup across users leaks information: I can tell whether a file already exists by whether you ask me to upload it.',
          answer:
            'That is a real attack and it is worth conceding immediately. The mitigation is to only dedup within a trust boundary, per user or per team, and to always require the upload of at least one chunk regardless. Cross-user dedup saves a lot of storage and it costs you this side channel.',
        },
        {
          challenge: 'What ordering guarantee do two devices actually get?',
          answer:
            'Per-file, a total order assigned by the server at commit. Across files, none, so a device can see file B updated before file A even if the user saved A first. That is usually invisible, and if a product needs atomic multi-file consistency I would have to introduce a transaction over the journal, which I am deliberately not doing.',
        },
        {
          challenge: 'Erasure coding makes small reads slow.',
          answer:
            'It does, especially in a degraded state where you must read k fragments and reconstruct. I would use replication for the hot recent tier and erasure code only chunks older than 30 days, which is where almost all the bytes are and almost none of the reads.',
        },
      ],
    },
    diagram: `flowchart TD
  D1["Device A"] -->|rolling hash chunking| CH["Local chunker: 4MB avg"]
  CH -->|which hashes do you have| API["Metadata service"]
  CH -->|missing chunks via presigned URL| OS[("Chunk store: content addressed")]
  API -->|atomic commit of chunk list| J[("Per-user journal")]
  J -->|cursor delta notify| D2["Device B"]
  D2 -->|pull changed chunks only| OS
  API -.->|stale parent version| CONF["Conflicted copy"]
  OS -->|older than 30 days| EC[("Erasure coded tier")]`,
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
    solution: {
      define:
        'Three states, draft, in-review and published, with role-gated transitions; only an editor can publish. Reads beat writes by roughly 1000 to 1 because a published article is read for years and written once. Every edit creates an immutable revision, so restore is a publish of an old revision rather than a destructive rewrite.',
      data:
        'Two tables that are deliberately not the same shape. Revisions is append-only: (content_id, revision_id, author, body, created_at). Published is a small pointer table: (content_id, live_revision_id, published_at, slug). Publishing is a single-row update of that pointer, which is what makes it atomic. Bodies live in the revision rows or in object storage for large ones; nothing ever overwrites a body in place.',
      architecture:
        'Publish flips live_revision_id in one transaction and emits an invalidation event; readers resolve slug to content_id to live_revision_id and fetch an immutable revision, so a reader can never observe a half-applied edit because there is no mutable body to catch mid-write. Caching is keyed by revision_id, which means published content is immutable at the cache layer and needs no invalidation at all, only the small slug-to-revision mapping does. Sharding is by content_id hash, with the slug lookup as its own small index.',
      evaluate:
        'Prove the no-partial-read property by asserting that a reader holding a revision_id always gets identical bytes, and that the only mutable thing in the read path is a single integer pointer. Measure read scaling by cache hit rate on revision-keyed objects, which should approach 100 percent for anything older than an hour since those objects never change.',
      deploy:
        'Rollback is a publish: point live_revision_id at the previous revision and invalidate one key. There is no data restore and no downtime, which is the payoff for making revisions immutable. If the search index falls behind the primary store, browse and search degrade to stale results while direct article URLs stay correct, because they resolve through the pointer table and not the index.',
      wrapup:
        'Draft and published are separated by an immutable revision table plus a mutable pointer, which is why a reader never sees a partial edit and why rollback is instant. At 100x content volume the revision table dominates storage and the first change is to move bodies older than a year into object storage, keeping only the metadata rows hot.',
      numbers: [
        '1M articles x 20 revisions x 50KB = 1TB of revision bodies, which is one database node until it is not, then object storage',
        '1000:1 read ratio: 100M reads/day = 1.2K reads/sec average, 4K at peak, versus about 1 write/sec, so 99.9 percent of capacity planning is the read path',
        'Revision-keyed cache entries never invalidate, so a 7-day CDN TTL is safe and origin traffic is essentially just the pointer lookup',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I want to separate the mutable and immutable halves of this system explicitly, because if revisions are immutable then publishing becomes a one-row pointer swap and most of the hard problems go away.',
      traps: [
        'Storing one mutable content row that editors update in place. Now every read can catch a partial write, rollback needs a backup, and your cache invalidation is a distributed problem.',
        'Caching by article URL instead of by revision id. URL-keyed caches must be purged on every publish; revision-keyed caches never need purging at all.',
        'Treating this as a write-scaling problem. It is a read-scaling problem with a correctness requirement on a tiny write path, and spending your architecture minutes on write sharding is spending them wrong.',
        'Forgetting that a publish has to invalidate the CDN, not just the application cache, or the old article stays live at the edge for hours.',
      ],
      whenPushed: [
        {
          challenge: 'Your revision table grows without bound.',
          answer:
            'It does, and I accept it: 20 revisions of an article is a rounding error next to the images. If it mattered I would keep the last N revisions plus one per week beyond that, which is a retention policy rather than a design change, and I would make it explicit to editors rather than silently dropping history.',
        },
        {
          challenge: 'How do you publish an article and its three referenced images atomically?',
          answer:
            'I make the pointer swap the last step and require assets to be uploaded and immutable before it. If a publish genuinely spans several content ids, I would batch the pointer updates in one transaction, which is possible precisely because that table is small and unsharded by design.',
        },
        {
          challenge: 'Editors want to preview a draft on the live site.',
          answer:
            'That is served by resolving to a specific revision_id with a signed preview token instead of the published pointer, using exactly the same read path. It works because the read path was never coupled to publication state, only to a revision id.',
        },
      ],
    },
    diagram: `flowchart TD
  E["Editor"] -->|save draft| REV[("Revisions: append only")]
  E -->|publish| PTR[("Published pointer: live_revision_id")]
  PTR -->|one row update| INV["Cache invalidation event"]
  R["Reader"] -->|slug| RES["Resolve slug to revision id"]
  RES --> PTR
  RES -->|immutable object| CDN["CDN keyed by revision id"]
  CDN -->|miss| REV
  INV -.->|only the pointer key| CDN
  REV -->|index feed| SRCH[("Search index")]
  PTR -.->|rollback: point at old revision| REV`,
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
    solution: {
      define:
        'Two invariants: a balance must never go negative, and a transfer must never apply twice. Balance reads are strongly consistent for the account owner, because showing someone a stale balance right after their own transfer is unacceptable. Every balance change must be reconstructable from an immutable log, which is an audit requirement, not a nicety.',
      data:
        'Double-entry, append-only ledger: every transfer writes two rows, a debit and a credit, sharing a transfer_id, and the sum of all entries for an account is its balance. Balance is a materialized column updated in the same transaction as the entries, not a separate cache, so the two can never diverge; the ledger remains the source of truth for reconciliation. An idempotency table keyed by client-supplied key stores the resulting transfer_id, so a retry returns the original result instead of creating a second transfer.',
      architecture:
        'A transfer is one database transaction: insert the idempotency row (unique constraint does the deduplication), lock both account rows in a canonical order by account id to avoid deadlock, check the debit account has sufficient balance, insert both ledger entries, update both balances, commit. Same-shard accounts get a local transaction; cross-shard uses a two-phase reserve-then-commit saga, because a distributed transaction across shards is exactly where this design pays its complexity. A hot merchant account is handled by splitting it into N sub-balances that are summed on read, so concurrent credits do not contend on one row.',
      evaluate:
        'Test double-spend directly: 1000 concurrent transfers of the full balance from one account, assert exactly one succeeds and the ledger sums to zero. Run a continuous reconciliation job that recomputes balance from ledger entries for a rolling sample of accounts and alarms on any mismatch, because the drift you never check for is the one you find in an audit.',
      deploy:
        'A debit that succeeds while the credit fails cannot happen inside one transaction; across shards it can, and that is what the saga\'s compensating reversal entry is for, posted as a new ledger row rather than by deleting the original. A ledger imbalance discovered after the fact is a page, not a ticket: freeze the affected accounts, replay entries from the log to find the divergence point, and post an explicit adjustment entry so the correction is itself auditable.',
      wrapup:
        'The test that convinces me the ledger and the balance cannot silently disagree is the recompute-and-compare job running continuously with an alarm at any nonzero delta, because the invariant is checkable rather than merely designed for. The assumption to test first is per-account write concurrency: a single merchant taking 5000 payments a second breaks row-level locking long before total system throughput becomes an issue.',
      numbers: [
        '10M transfers/day = 115/sec average, 350/sec at 3x peak; each is 2 ledger rows + 2 balance updates = ~1.4K row writes/sec',
        '10M transfers/day x 2 rows x 200 bytes = 4GB/day = 1.5TB/year of ledger, which is why entries older than 90 days move to cold partitions',
        'One merchant at 500 credits/sec against a single row at ~2ms lock hold = 1 transfer at a time, capped near 500/sec; splitting into 16 sub-balances raises the ceiling to about 8K/sec',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to commit to an append-only double-entry ledger as the source of truth before anything else, because every correctness property in this system falls out of that one choice.',
      traps: [
        'Storing balance as a mutable column and nothing else. It is fast, it is auditable by nobody, and after any incident you have no way to determine what the balance should have been.',
        'Using an idempotency key as a lookup-then-insert check. That is a race; the unique constraint on the key has to be what enforces it, inside the same transaction as the transfer.',
        'Locking the two accounts in the order they appear in the request, which deadlocks the instant A pays B while B pays A. Lock in account-id order.',
        'Ignoring the hot account. A popular merchant receives thousands of credits per second against one row, and row-level locking serializes every one of them.',
      ],
      whenPushed: [
        {
          challenge: 'Recomputing balance from the ledger on every read will not scale.',
          answer:
            'It will not, which is why balance is materialized in the same transaction as the entries. The ledger is for audit and reconciliation, not for the read path. The honest cost is that I now have two representations and must run a job that proves they agree.',
        },
        {
          challenge: 'What happens if the payment processor confirms a charge after your transaction timed out?',
          answer:
            'I treat processor state as authoritative and reconcile toward it. The transfer sits in a pending state, a webhook or a polling reconciler resolves it, and the ledger gets either a completing entry or a reversal. The one thing I will not do is guess, because guessing here means either double-charging or eating the loss.',
        },
        {
          challenge: 'Cross-shard transfers with a saga mean a window where money exists in neither account.',
          answer:
            'Correct, and I would surface that as an explicit in-flight state rather than hiding it. The reserve step debits into a holding account owned by the transfer, so the money is always somewhere in the ledger and the system-wide sum still balances at every instant, even mid-saga.',
        },
      ],
    },
    diagram: `flowchart TD
  C["Client"] -->|idempotency key| API["Transfer service"]
  API -->|unique constraint insert| IDEM[("Idempotency table")]
  API -->|lock both rows in account-id order| ACC[("Accounts: materialized balance")]
  API -->|debit and credit rows| LED[("Double-entry ledger: append only")]
  LED -->|same transaction| ACC
  API -->|cross shard| SAGA["Reserve then commit saga"]
  SAGA -->|compensating entry| LED
  LED -->|recompute and compare| REC["Reconciliation job"]
  REC -.->|any delta pages on-call| ALERT["Alert"]
  ACC -->|hot merchant| SUB[("N sub-balances summed on read")]`,
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
    solution: {
      define:
        'The invariant is never selling seat 14C twice, and never selling more seats than the aircraft has once overbooking rules are applied. A 15-minute hold during checkout is required because payment involves a third party and sometimes a human. Search may lag real availability by seconds; the booking transaction is what enforces truth.',
      data:
        'Seat inventory is one row per (flight_id, departure_date, seat_number) with a status of free, held or sold, plus a hold expiry. That materialization makes a booking an exact-key update instead of a count-and-compare, which is the difference between a design that works under contention and one that does not. Search is served from a separate denormalized index of (origin, destination, date) with cached fare and a seats-remaining counter that is allowed to be approximate.',
      architecture:
        'Booking: UPDATE seat SET status=\'held\', hold_id=?, expires_at=? WHERE flight=? AND seat=? AND (status=\'free\' OR expires_at < now()). The conditional update is the concurrency control, so the last-seat race resolves to exactly one winner with no explicit lock and no read-then-write. Payment then runs outside the transaction; on success the row goes to sold, and on failure or timeout the expiry makes it free again with no cleanup required for correctness. Search reads its own index, refreshed from the inventory change stream every few seconds.',
      evaluate:
        'Load-test the last seat specifically: one free seat, 200 simultaneous requests, assert exactly one 200 and 199 clean conflicts. Confirm search staleness stays inside its budget by tracking the lag between an inventory change and its appearance in the index, and by measuring how often a booking attempt fails because search showed a seat that was gone, which is the user-visible cost of that lag.',
      deploy:
        'A payment timeout after the seat was held resolves itself: the hold expires and the seat returns. A late payment success is reconciled by webhook, and if the seat has since been sold, the airline\'s standard answer applies, which is a refund or a rebooking, not a silent double-sell. If the inventory service is unavailable, block bookings rather than queue them, because a queued booking is a promise you cannot keep about a finite resource.',
      wrapup:
        'Inventory is strongly consistent via a conditional update on a materialized seat row, and search is eventually consistent, which costs occasional conflicts at checkout and buys a search path that never touches the booking database. For a 10x fare-sale spike the first change is a queue in front of the checkout page for the affected flights, because the write path is intentionally serialized per seat and admission control is the only real lever.',
      numbers: [
        '100K flights/day x 200 seats = 20M seat rows/day; with a 360-day booking window that is 7.2B rows, so partition by departure_date and drop past partitions',
        '1M searches/day per 10K bookings = 100:1 read:write; searches at ~12 QPS average and 60 at peak, bookings under 1/sec',
        'Last-seat contention: 200 concurrent attempts on one row, each conditional update ~1ms, so the whole stampede resolves inside a second with 1 winner',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to separate the two halves immediately: search is a stale-tolerant read problem, and seat inventory is a strict-correctness write problem, and conflating them is what makes this design go wrong.',
      traps: [
        'Modelling inventory as a seats_remaining counter. Decrementing a counter cannot express which seat you got, and it invites a read-check-write race that overbooks under load.',
        'Introducing a distributed lock service for the last seat. A single conditional UPDATE on one row is stronger, simpler and faster, and reaching for Redlock here signals you did not see that.',
        'Building hold expiry as a background job you depend on for correctness. Make the expiry timestamp part of the WHERE clause so an expired hold is free whether or not the sweeper ran.',
        'Making search strongly consistent to avoid the awkward moment at checkout, which puts a hundred times the traffic onto the database that must stay available for bookings.',
      ],
      whenPushed: [
        {
          challenge: 'Airlines overbook on purpose. Your invariant is wrong.',
          answer:
            'Fair, and the fix is small: the free seat pool is aircraft capacity times an overbooking factor set per route by revenue management. The per-seat invariant stays exactly as designed, and overbooking becomes a policy input rather than a race condition, which is the important distinction.',
        },
        {
          challenge: 'Fifteen minutes of hold on a nearly full flight loses you sales.',
          answer:
            'It does, and I would shorten the hold as remaining seats drop, say to 5 minutes under 10 seats left. The trade is a worse experience for slow payers exactly when inventory is most valuable, which is the right direction for the business.',
        },
        {
          challenge: 'How do you handle a multi-leg itinerary where you must get all four seats or none?',
          answer:
            'Hold all four first, then confirm all four, which is a two-phase commit with the hold as the prepare step. If any leg cannot be held, release the rest. Cross-airline legs make this genuinely hard because you do not control the other party\'s hold semantics, and that is where real systems fall back to compensation and refunds.',
        },
      ],
    },
    diagram: `flowchart TD
  U["Traveller"] -->|search| IDX[("Search index: approximate seats left")]
  U -->|select seat| BK["Booking service"]
  BK -->|conditional UPDATE where free or expired| SEAT[("seat rows: flight date seat")]
  SEAT -->|held with expires_at| BK
  BK -->|outside txn| PAY["Payment provider"]
  PAY -->|authorized| SOLD["status = sold"]
  PAY -->|timeout| EXP["Hold lapses: seat free again"]
  EXP --> SEAT
  SEAT -->|change stream every few seconds| IDX
  SOLD -.->|late webhook| RECON["Reconcile or refund"]`,
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
    solution: {
      define:
        'Support up to about 50 simultaneous editors on one document with under 100ms perceived latency for your own keystrokes, which means local-first: apply locally, then reconcile. Convergence is non-negotiable, every client must reach byte-identical state regardless of arrival order. Offline editing merges back rather than blocking.',
      data:
        'I would take a server-authoritative Operational Transform over a CRDT for text. OT keeps the document as plain text plus a version vector and requires a central server to sequence, while a CRDT is peer-to-peer but carries per-character metadata that makes a large document several times its text size. Since I already need a server for auth and persistence, OT\'s central sequencer is free and I keep the smaller representation. History is the operation log itself, which gives undo and version restore without a separate mechanism.',
      architecture:
        'Each client applies its edit locally and sends (op, base_revision) over a websocket. The server transforms the incoming op against every op committed since base_revision, appends it to the log at a new revision, and broadcasts the transformed op to all clients, which transform it against their own pending local ops. That one server-side sequence is what guarantees identical convergence. A lagging client just receives a longer catch-up batch; it never blocks anyone else. A document is owned by exactly one server process at a time, so scale is per-document, and a 500-viewer document is served by demoting read-only viewers to a broadcast fan-out tier.',
      evaluate:
        'Convergence is tested with randomized concurrent op generation across simulated clients, replayed in every arrival order, asserting identical final documents; this is the one place where property-based testing genuinely earns its keep. Measure broadcast latency as the time from op receipt at the server to acknowledgement at the last client, segmented by editor count, because it degrades with fan-out rather than with edit rate.',
      deploy:
        'A reconnecting client sends its last known revision and its unacknowledged local ops; the server sends the missed ops, the client transforms its pending ops against them and resubmits. That is the same code path as normal operation, which is why offline works at all. If the real-time service is down, the document opens read-only from the last persisted snapshot rather than allowing edits that cannot be sequenced.',
      wrapup:
        'OT with a single-server sequencer per document guarantees convergence because there is exactly one authoritative order, and the cost is that a document cannot span servers and the transform functions are genuinely hard to get right. The first limit is broadcast fan-out: at a few hundred concurrent editors, each op sends N messages, so the fix is batching ops into 50ms frames and separating viewers from editors.',
      numbers: [
        '50 editors x 5 ops/sec each = 250 ops/sec into the server, and 250 x 50 = 12.5K outbound messages/sec for one document, so fan-out is 50x the input',
        'Batching ops into 50ms frames cuts outbound messages to 20/sec per client = 1K/sec for the document, a 12x reduction for 50ms of added latency',
        'A 100KB document under a character-level CRDT with ~30 bytes of metadata per character = ~3MB in memory and over the wire, which is why OT wins here',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'The requirement I want to state first is convergence, that every client must end at the identical document regardless of the order edits arrive, because that single property eliminates most naive designs immediately.',
      traps: [
        'Sending the whole document or a diff of it on every keystroke. It appears to work with two editors and collapses with ten, and it cannot express intent, so concurrent edits clobber each other.',
        'Saying CRDT because it sounds modern without pricing the metadata. Per-character identifiers on a long document are megabytes of overhead and a real memory and bandwidth cost.',
        'Skipping the offline reconnect path. Offline edits are where the interviewer is heading, and the good answer is that reconnection is the same transform code, not a special case.',
        'Forgetting that fan-out, not edit rate, is the scaling problem: 50 editors means every op is sent 50 times.',
      ],
      whenPushed: [
        {
          challenge: 'Google Docs moved away from pure OT. Why are you choosing it?',
          answer:
            'Because I already require a server for permissions and persistence, so OT\'s biggest downside, needing a central sequencer, costs me nothing, and I get a compact representation. If this had to work peer-to-peer or fully offline between clients with no server, I would switch to a CRDT and pay the metadata.',
        },
        {
          challenge: 'One server per document is a single point of failure.',
          answer:
            'It is, and the mitigation is that state is recoverable rather than replicated: the op log is persisted on commit, so a failed process is replaced and clients resync from their last revision. The visible cost is a few seconds of read-only during failover, which I would take over the complexity of consensus on every keystroke.',
        },
        {
          challenge: 'How does undo work with concurrent editors?',
          answer:
            'Undo has to be selective, inverting your own last operation transformed against everything that happened since, not popping a global stack. Getting this wrong is the classic bug where undo removes a colleague\'s text, and it is worth calling out that selective undo is harder than the core transform.',
        },
      ],
    },
    diagram: `flowchart TD
  A["Client A: apply locally"] -->|op plus base revision| SRV["Doc server: single sequencer"]
  B["Client B: apply locally"] -->|op plus base revision| SRV
  SRV -->|transform against ops since base| SEQ["Assign new revision"]
  SEQ --> LOG[("Op log: undo and restore")]
  SEQ -->|broadcast transformed op| A
  SEQ -->|broadcast transformed op| B
  LOG -->|periodic| SNAP[("Snapshot")]
  RC["Reconnecting client"] -->|last known revision| SRV
  SRV -->|missed ops batch| RC
  SEQ -->|read only viewers| FAN["Broadcast fan-out tier"]`,
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
    solution: {
      define:
        'The lock protects a critical section across processes and doubles as leader election. A crashed holder\'s lock must expire within a bounded lease, say 10 seconds. And I will state the uncomfortable truth up front: during a partition two clients can believe they hold the lock, so the lock alone cannot provide safety, only the fencing token can.',
      data:
        'A lock record is (resource_name, owner_id, fencing_token, lease_expiry). The fencing token is a monotonically increasing integer issued on every successful acquisition, and it is the only part of this design that provides real safety. Lock state lives in a Raft-replicated store, etcd or ZooKeeper, so a change is committed only once a majority has it.',
      architecture:
        'Acquire is a compare-and-set on the resource key: succeed if absent or if the lease has expired, and receive a fencing token. The holder renews the lease at roughly one third of its duration. Release is a conditional delete guarded by owner_id, so a slow client cannot delete the lock a successor now holds. The protected resource must reject any write carrying a token lower than the highest it has seen, which is what makes a paused holder harmless when it wakes up after its lease expired.',
      evaluate:
        'Test reclamation by SIGSTOPping a holder and asserting another client acquires within lease plus one renewal interval, and that the resurrected holder\'s writes are rejected by token. To catch split brain, run a Jepsen-style partition test with a linearizability checker; the point is not that two clients hold the lock, which will happen, but that no two writes with out-of-order tokens ever land.',
      deploy:
        'Clock skew is handled by never comparing wall clocks across machines: leases are evaluated by the Raft leader against its own monotonic clock, and clients treat their local expiry estimate as conservative, so they give up the lock earlier than the server would. If the lock service is unavailable, clients must fail closed and stop touching the protected resource, because failing open here means the exact corruption the lock exists to prevent.',
      wrapup:
        'The assumption I would test first is not clock synchronization but process pause tolerance: a 30-second GC pause in a holder is more likely than a clock jump and produces the same symptom, and the fencing token is what makes both survivable. Under a one-day deadline I would ship a single-node Redis lock with a token, be explicit that it is unsafe under failover, and only use it where a duplicate execution is merely wasteful.',
      numbers: [
        '10-second lease with renewal every 3 seconds tolerates 2 lost renewals before expiry; worst-case reclaim time is 10s plus the acquire round trip',
        'Raft commit across 3 nodes in one region = 2 to 5ms per acquire, so a lock held for a 50ms critical section caps a single resource at roughly 15 to 20 ops/sec',
        'A 30-second GC pause exceeds a 10-second lease by 3x, which is exactly why safety must come from the fencing token and not from the lease',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to be honest about the limits of this thing before designing it: no lease-based distributed lock can guarantee mutual exclusion under arbitrary process pauses, so safety has to come from fencing tokens at the resource.',
      traps: [
        'Presenting the lock as mutual exclusion and stopping. Without a fencing token enforced by the protected resource, a paused-then-resumed holder writes over its successor and the lock provided nothing.',
        'Reaching for Redlock across five Redis nodes. It has well-known correctness objections under clock skew and pauses, and citing it as a safe answer invites a conversation you will lose.',
        'Comparing wall-clock times across machines to evaluate a lease, when the whole failure class here is clocks disagreeing.',
        'Deleting the lock key on release without checking the owner, so a client that lost its lease deletes the lock its successor is holding.',
      ],
      whenPushed: [
        {
          challenge: 'So your lock does not actually guarantee mutual exclusion.',
          answer:
            'Correct, and no lease-based lock does. What I guarantee is that out-of-order writes are rejected at the resource by fencing token, which is the property that actually matters. If the resource cannot check a token, then a distributed lock cannot make it safe and I would design around idempotency instead.',
        },
        {
          challenge: 'Why etcd or ZooKeeper instead of a database row with a timestamp?',
          answer:
            'A single database row with a conditional update is genuinely fine and I would use it for low-traffic locks. What Raft buys me is surviving the loss of the lock store itself without losing lock state, and a watch primitive so waiters do not poll. If the database is already highly available, the row is the simpler answer.',
        },
        {
          challenge: 'What is your throughput ceiling?',
          answer:
            'Per lock, one holder at a time, so throughput is one over the critical-section duration plus about 5ms of consensus. That is 15 to 20 per second for a 50ms section. If someone needs thousands per second on one resource, the answer is not a faster lock, it is to shard the resource so there are a thousand locks.',
        },
      ],
    },
    diagram: `flowchart TD
  C1["Client 1"] -->|acquire CAS| RAFT["Raft quorum: etcd"]
  RAFT -->|lease plus fencing token N| C1
  C1 -->|write with token N| RES[("Protected resource")]
  C1 -->|renew at 1/3 lease| RAFT
  C1 -.->|GC pause: lease expires| RAFT
  C2["Client 2"] -->|acquire after expiry| RAFT
  RAFT -->|token N+1| C2
  C2 -->|write with token N+1| RES
  RES -->|reject token lower than highest seen| C1
  RAFT --> ST[("Lock state: owner token expiry")]`,
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
    solution: {
      define:
        'Push, email and SMS, with a per-user per-category preference table deciding channel and whether to send at all. Delivery is at-least-once with deduplication at the provider boundary, because guaranteeing exactly-once through a third-party SMS gateway is not something I can honestly promise. Ordering is not preserved and should not be: a digest and an OTP have nothing to do with each other.',
      data:
        'A notification job carries (event_id, user_id, category, template_id, payload, channel, priority, dedup_key). The dedup key is a hash of event_id plus user_id plus channel, stored in Redis with a 24-hour TTL, so a redelivered event does not send a second message. Templates live in a versioned store and are rendered at send time, not at enqueue time, so a template fix does not require re-enqueuing a backlog.',
      architecture:
        'Producer publishes an event to Kafka; a fan-out worker expands it against preferences into per-channel jobs and writes them to separate queues per priority: transactional, standard and bulk. Separate queues, not a priority field in one queue, because a single queue with 10 million digest messages will bury an OTP no matter how you sort it. Channel workers own provider integration, respect per-provider rate limits with a token bucket, and retry with exponential backoff plus jitter into a delay queue, with a dead-letter queue after the final attempt.',
      evaluate:
        'Track p50 and p99 latency per channel from event publish to provider acceptance, separately per priority class, since the whole point of the split is that transactional latency is unaffected by bulk volume. To catch backup, alert on queue depth divided by drain rate, which yields time-to-drain in seconds and is a far better signal than raw depth.',
      deploy:
        'Retries are safe because the dedup key is checked at send, so a duplicate attempt after a provider timeout is dropped rather than delivered twice. Channel fallback is per-category policy, not automatic: an OTP falls back from push to SMS after 30 seconds, while a marketing digest simply does not get sent if push is down, because a fallback that pushes marketing into SMS is worse than silence.',
      wrapup:
        'Deliberately skipped: read receipts, per-channel delivery guarantees beyond provider acceptance, and cross-channel deduplication when a user has three devices. I would set retries at 5 with exponential backoff over roughly 15 minutes, because provider outages are either brief or long, and retrying a genuinely down provider for hours only builds a backlog that arrives at the worst possible time.',
      numbers: [
        '50M users x 4 notifications/day = 200M/day = 2.3K/sec average, 10K/sec at peak given evening clustering',
        'At 100 sends/sec per worker per provider connection, 10K/sec peak needs 100 workers, sized per channel since SMS providers cap far lower than push',
        'Dedup keys: 200M/day x 40 bytes with 24h TTL = about 8GB of Redis, which is why the TTL is 24 hours and not a week',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I want to separate transactional from bulk traffic in the first minute, because those two have different latency requirements and putting them in one queue is the mistake this design exists to avoid.',
      traps: [
        'One queue with a priority field. Under a 10-million-message marketing send, a password reset sits behind the backlog regardless of how the priority is sorted; physically separate queues are the answer.',
        'Deduplicating at enqueue rather than at send. The duplicate you care about comes from a retry after the provider timed out, which happens well after enqueue.',
        'Rendering templates at enqueue time, which freezes a bug into millions of queued messages and makes a fix require draining the queue.',
        'Automatic cross-channel fallback for every category, which cheerfully converts a marketing email into a 2am SMS when push is degraded.',
      ],
      whenPushed: [
        {
          challenge: 'At-least-once means users get duplicate notifications.',
          answer:
            'Sometimes, yes. The dedup key catches the overwhelming majority, but if the provider accepted a message and the acknowledgement was lost, I cannot distinguish that from a failure and I will retry. I would rather deliver an OTP twice than not at all, and for marketing I would take the opposite trade and not retry.',
        },
        {
          challenge: 'How do you avoid overwhelming a user with twenty notifications at once?',
          answer:
            'Rate limiting per user per category in the fan-out worker, with a collapse rule that turns N notifications of the same category inside a window into one digest. This is a product requirement more than an infrastructure one, and it belongs in fan-out where preferences are already loaded.',
        },
        {
          challenge: 'Your fan-out worker expands one event into millions of jobs. That is a single point of contention.',
          answer:
            'It is, and the fix is chunking: the fan-out worker emits batches of 10,000 recipients as separate tasks rather than iterating the whole audience itself, so expansion is parallel and resumable. Without that, one large campaign occupies one worker for an hour and a crash restarts it from zero.',
        },
      ],
    },
    diagram: `flowchart TD
  EV["Event"] --> K["Kafka events topic"]
  K --> FO["Fan-out worker: chunks of 10k"]
  FO -->|read preferences| PREF[("User preferences")]
  FO -->|OTP and resets| Q1["Transactional queue"]
  FO -->|standard| Q2["Standard queue"]
  FO -->|digests| Q3["Bulk queue"]
  Q1 --> WK["Channel workers: token bucket per provider"]
  Q2 --> WK
  Q3 --> WK
  WK -->|check before send| DD[("Redis dedup key 24h")]
  WK -->|push email sms| PROV["Providers"]
  WK -.->|backoff retry then| DLQ["Dead letter queue"]`,
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
    solution: {
      define:
        'At-least-once delivery with per-partition ordering and idempotent consumers, which is the Kafka model and the right default. Exactly-once is offered only as a transactional read-process-write within the system, and I would say clearly that it does not extend to an external side effect. Messages up to 1MB, throughput target in the low millions per second per cluster.',
      data:
        'Each partition is an append-only segment log on disk with a sparse offset index, written sequentially and served to consumers with zero-copy sendfile, which is why a disk-backed queue outperforms an in-memory one here. Retention is time-based, seven days, so a consumer outage is survivable and replay is possible. Consumer offsets are themselves messages in an internal compacted topic, so offset storage inherits the same replication and durability as data.',
      architecture:
        'A producer hashes the message key to choose a partition, which is what gives per-key ordering, and sends to that partition\'s leader. The leader appends and replicates to followers; with acks=all and min.insync.replicas=2 of 3, the write is acknowledged once two replicas have it, so a single broker loss cannot lose an acknowledged message. Consumers in a group each own disjoint partitions, and a new member triggers a rebalance that reassigns ownership. Redelivery is safe because the consumer commits its offset only after processing, so a crash replays from the last commit.',
      evaluate:
        'Prove no loss across failover by producing a numbered sequence with acks=all, killing the leader mid-stream, and asserting the consumer sees every number exactly once or more, never a gap. Test ordering under rebalance by keying messages per entity and asserting per-key monotonicity across a rebalance, since that is precisely when a naive implementation delivers out of order.',
      deploy:
        'Partition reassignment throttles replication bandwidth so moving a partition does not starve live traffic, and cooperative incremental rebalancing moves only the partitions that need to move instead of revoking everything from everyone. Growing lag is handled by scaling consumers up to the partition count, and past that only by adding partitions, which is why partition count is a capacity decision made up front rather than a tunable.',
      wrapup:
        'At-least-once with per-partition ordering costs every consumer an idempotency requirement and costs the design a hard ceiling of one consumer per partition; exactly-once would buy that back at a real throughput and complexity price for a guarantee that stops at the system boundary anyway. At 10x volume the first thing to break is replication network bandwidth between brokers, not disk, because every message is written three times across the network.',
      numbers: [
        '1M messages/sec x 1KB x 3 replicas = 3 GB/s of inter-broker traffic, which at 25 Gbps per broker means at least 10 brokers just for replication headroom',
        '7-day retention x 1M msg/sec x 1KB = 600TB before replication, 1.8TB per broker per day across 10 brokers with replication',
        'One consumer at 50K msg/sec means 1M/sec needs 20 consumers, so partition count must be at least 20 and realistically 60 to allow future scaling',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I will commit to at-least-once with per-partition ordering up front, because delivery and ordering guarantees are the two decisions that constrain everything else in a queue.',
      traps: [
        'Promising exactly-once without qualifying it. Exactly-once inside the log is achievable with idempotent producers and transactions; exactly-once through an external API call is not, and claiming it invites a pointed follow-up.',
        'Promising global ordering. Global order means one partition means one consumer means a hard throughput ceiling, and if you promise it you have to say that.',
        'Committing the consumer offset before processing the message, which converts at-least-once into at-most-once and silently drops work on a crash.',
        'Forgetting that adding partitions later breaks key-to-partition affinity, so existing keys move and per-key ordering is briefly violated across the change.',
      ],
      whenPushed: [
        {
          challenge: 'Why not just use an in-memory queue for speed?',
          answer:
            'Because sequential disk writes with page-cache reads and sendfile are already close to network speed, and the disk gives me seven days of replay for free. An in-memory queue is faster only until a consumer is down for an hour, at which point I have lost the data that the disk would have kept.',
        },
        {
          challenge: 'Your rebalance pauses every consumer in the group.',
          answer:
            'With eager rebalancing, yes, and that is a real stop-the-world pause proportional to group size. Cooperative incremental rebalancing fixes most of it by revoking only the moving partitions. The residual cost is that a flapping consumer still causes repeated partial rebalances, which is why session timeouts get tuned carefully.',
        },
        {
          challenge: 'How do you handle a poison message that fails forever?',
          answer:
            'Bounded retries at the consumer, then send to a dead-letter topic and commit the offset, because the alternative is that one bad message blocks its entire partition indefinitely. The trade is that a systematic bug quietly fills the DLQ instead of paging you, so DLQ rate must be alarmed.',
        },
      ],
    },
    diagram: `flowchart TD
  P["Producer"] -->|hash key to partition| LD["Partition leader broker"]
  LD -->|append| SEG[("Segment log plus offset index")]
  LD -->|replicate| F1["Follower 1"]
  LD --> F2["Follower 2"]
  LD -->|ack when min ISR = 2| P
  C1["Consumer in group"] -->|zero copy fetch| SEG
  C1 -->|commit after processing| OFF[("Compacted offsets topic")]
  GC["Group coordinator"] -->|cooperative rebalance| C1
  C1 -.->|poison message| DLQ["Dead letter topic"]
  SEG -.->|7 day retention| DEL["Aged out"]`,
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
    solution: {
      define:
        'Both one-off delayed jobs and recurring cron expressions, in one model where a recurring job materializes its next occurrence after each run. Semantics are at-least-once with an idempotency key supplied by the job author, because exactly-once execution of an arbitrary side effect is not achievable and pretending otherwise is where these designs go wrong. Target scheduling accuracy is within 1 second of the due time.',
      data:
        'A jobs table with (job_id, schedule, payload, next_run_at, status, attempt, lease_owner, lease_expiry), indexed on (status, next_run_at). That composite index is what makes what is due now a bounded index range scan instead of a full table scan at millions of rows. Execution history goes to a separate append-only table so the hot jobs table stays small.',
      architecture:
        'Poller nodes claim work with a conditional UPDATE ... WHERE status=\'pending\' AND next_run_at <= now() ... RETURNING, which atomically leases a batch to exactly one node, so two workers cannot take the same job without any external lock. The lease has an expiry; a worker that crashes mid-execution has its job reclaimed once the lease lapses. Completion sets the next occurrence for recurring jobs. Shard by hash of job_id so pollers scan disjoint ranges and do not contend on the same index rows.',
      evaluate:
        'Kill a worker mid-execution and assert the job is picked up again within the lease timeout and that the side effect happened once, verified by the idempotency key rather than by the scheduler. Measure scheduling drift as actual_start minus next_run_at at p99, because average drift hides the case where a burst of 10,000 simultaneously due jobs makes the last one 40 seconds late.',
      deploy:
        'Scheduler deploys are safe because due-ness is stored, not held in memory: a job due during a 30-second deploy is simply picked up late by the next poller, which is why the accuracy target is a p99 and not a guarantee. A job past its retry limit goes to a dead-letter state with an alert, and is never silently dropped, because a scheduled job failing forever with nobody knowing is the worst outcome this system can produce.',
      wrapup:
        'At-least-once plus a required idempotency key puts real work on job authors, and it is the honest trade: the alternative, exactly-once, would require the scheduler to control the side effect, which it does not. At 100x jobs the (status, next_run_at) index becomes the contention point as every poller scans the same hot range, and the fix is time-bucketed partitions so pollers scan different physical rows.',
      numbers: [
        '10M scheduled jobs with 100K due per minute = 1.7K claims/sec, well within one Postgres node using batched conditional updates of 100 jobs',
        'Batch claim of 100 jobs per query at 1.7K/sec = 17 queries/sec, versus 1.7K individual claims, which is the difference between fine and falling over',
        'Lease of 60 seconds with a p99 job duration of 10 seconds gives 6x headroom before a live job is wrongly reclaimed and run twice',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I want to settle the execution guarantee first, because at-least-once with idempotent jobs and exactly-once are different systems and only one of them is actually buildable.',
      traps: [
        'Making what is due now a scan over all jobs. With millions of rows the index has to be on (status, next_run_at) and the claim has to be a bounded range, or the poller is your bottleneck.',
        'Claiming jobs with a SELECT followed by an UPDATE. Two pollers will select the same row; the claim must be a single conditional UPDATE that returns what it took.',
        'Holding the schedule in memory in a leader process. It is fast until the leader restarts, and then everything due in that window never runs at all.',
        'Retrying forever with no dead-letter state, so a permanently broken job burns capacity and nobody ever finds out.',
      ],
      whenPushed: [
        {
          challenge: 'Why a database and not a delay queue like SQS or a Redis sorted set?',
          answer:
            'A sorted set with ZRANGEBYSCORE is genuinely a good fit and I would use it for pure delayed delivery. I chose the database because recurring schedules need queryable, updatable state, and operators want to ask which jobs failed last night, which is a query, not a queue operation. The cost is that I am polling rather than being pushed.',
        },
        {
          challenge: 'Polling wastes queries when nothing is due.',
          answer:
            'It does, and I would use adaptive polling: query, and if nothing is due sleep until the earliest next_run_at rather than a fixed interval. That turns an idle system into roughly zero queries and keeps the same code path, at the cost of an extra query when a nearer job is inserted.',
        },
        {
          challenge: 'What happens when 10,000 jobs are all scheduled for midnight?',
          answer:
            'They all become due at once and the tail is late, which shows up exactly as the p99 drift metric. The mitigations are jittering the stored next_run_at within a window for jobs that do not need exact timing, and autoscaling workers off the due-count metric. Cron users scheduling everything at the top of the hour is the normal case, not the exception.',
        },
      ],
    },
    diagram: `flowchart TD
  API["Submit job"] --> JT[("Jobs table: index on status,next_run_at")]
  P1["Poller shard 1"] -->|conditional UPDATE batch of 100| JT
  P2["Poller shard 2"] -->|disjoint hash range| JT
  P1 -->|leased with expiry| WK["Worker"]
  WK -->|idempotency key| SIDE["Side effect"]
  WK -->|complete: set next occurrence| JT
  WK -.->|crash: lease lapses| JT
  JT -->|past retry limit| DL["Dead letter plus alert"]
  WK -->|append| HIST[("Execution history")]`,
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
    solution: {
      define:
        'Limit per API key first and per IP as a secondary defence against unauthenticated abuse, configured per endpoint because a search call and a password reset deserve very different ceilings. Token bucket with a burst of 2x the steady rate, since real clients are bursty and a strict rate produces false rejections on legitimate traffic. Rejection is a 429 with Retry-After and a rate-limit header trio, never a silent drop, because a client that cannot tell it was limited will retry immediately and make things worse.',
      data:
        'Per key, token bucket state is two values, tokens_remaining and last_refill_timestamp, about 16 bytes plus the key, and refill is computed lazily at read time rather than by a background ticker. That state lives in Redis Cluster, sharded by hash of the limiter key so one hot key lands on one shard, with the check-and-decrement done in a Lua script so it is atomic in one round trip.',
      architecture:
        'The limiter runs at the gateway, before auth-expensive work but after cheap key extraction. Each gateway node keeps a local approximate bucket that permits traffic up to its fair share (limit divided by node count) without any network call, and only consults Redis when the local share is exhausted. That two-tier design is what keeps Redis off the hot path: at normal traffic almost no request touches it. Fixed window is rejected explicitly because it allows 2x the limit across a boundary, and sliding-window log is rejected because it stores one timestamp per request per key.',
      evaluate:
        'Measure accuracy as the ratio of allowed requests to the configured limit under sustained overload, per key, and false rejections as 429s issued to clients that were under their limit. The load test that exposes the fixed-window flaw is a burst at limit N in the last 100ms of one window and N again in the first 100ms of the next, showing 2N served in 200ms; a token bucket serves the burst allowance and then throttles.',
      deploy:
        'If Redis is unreachable, fail open and serve the request while emitting a metric and a log, because rate limiting protects against abuse but failing closed converts a Redis blip into a full outage. Limit changes roll out gradually with the new limit shadowed first, counting how many requests would have been rejected, so an accidental 10x tightening is caught in a metric rather than in a customer incident.',
      wrapup:
        'Token bucket at the gateway with a local pre-check trades exact accuracy, since the distributed count can overshoot slightly during a burst, for the ability to limit without a network round trip per request. At 10x traffic the shared counter store is the bottleneck, and the first change is widening the local tier so a larger fraction of the limit is enforced node-locally and Redis only arbitrates the tail.',
      numbers: [
        '1M API keys x 24 bytes of bucket state = 24MB in Redis, so state size is never the constraint here; QPS on the counter is',
        '50K RPS with a naive one-Redis-call-per-request = 50K Redis ops/sec, near a single node\'s practical ceiling, which is exactly why the local pre-check exists',
        'Local tier over 20 gateway nodes: each enforces limit/20 locally, so roughly 95 percent of requests never call Redis and the shard sees ~2.5K ops/sec',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'Let me pin down what we are limiting and what happens on rejection before picking an algorithm, because a limit per API key and a limit per IP are different systems and the rejection contract is what clients actually integrate against.',
      traps: [
        'Choosing fixed windows because they are easy to implement, then having no answer when the interviewer describes a client sending the full limit at 11:59:59.9 and again at 12:00:00.1 and receiving double the allowance.',
        'Putting a Redis round trip on every single request. At 50K RPS that is 50K ops/sec against one shard and you have moved the bottleneck rather than removing it; the local pre-check is the expected answer.',
        'Implementing the check as GET then DECR then SET. That is a race across gateway nodes and it leaks allowance under exactly the concurrent burst the limiter exists to stop; it has to be one atomic Lua script.',
        'Failing closed when the counter store is down, which turns a degraded dependency into a total outage of an API that was working fine.',
      ],
      whenPushed: [
        {
          challenge: 'Your local pre-check means the limit is not actually enforced accurately.',
          answer:
            'Correct. Under a burst, a client can briefly exceed its limit by roughly the local allowance times the number of nodes it happens to hit. I accept that because rate limiting is a protection mechanism, not an accounting one; if the number were being billed I would enforce it centrally and pay the round trip.',
        },
        {
          challenge: 'A single client sending 100K requests per second still concentrates on one Redis shard.',
          answer:
            'Yes, one key hashes to one shard, so a determined single-key attacker becomes a hot shard. The mitigations are enforcing most of that limit node-locally so the shard sees only overflow, and shedding at the edge, because by the time an abusive key reaches Redis you have already spent the resources you were trying to protect.',
        },
        {
          challenge: 'Why token bucket over sliding window counter?',
          answer:
            'Sliding window counter is more accurate at the boundary and costs two counters per key. Token bucket is one atomic operation and it expresses burst allowance directly, which is what API clients actually need. If the requirement were a strict never exceed N per minute for billing, I would switch to sliding window and accept the extra state.',
        },
      ],
    },
    diagram: `flowchart TD
  C["Client"] -->|request| GW["Gateway node"]
  GW -->|extract API key| LB["Local token bucket: limit / N nodes"]
  LB -->|local allowance left| SVC["Upstream service"]
  LB -->|local allowance spent| RD[("Redis shard: atomic Lua check and decrement")]
  RD -->|tokens remain| SVC
  RD -->|bucket empty| E["429 plus Retry-After"]
  RD -.->|store unreachable: fail open| SVC
  CFG[("Limit config")] -->|pushed limits per key| LB
  GW -->|shadow count of would-be rejects| M["Metrics"]`,
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
    solution: {
      define:
        'Broad web crawl with a refresh policy, targeting 1B pages a month. Politeness is one request per host every 2 seconds by default, overridden by robots.txt crawl-delay, and it is enforced by the frontier rather than by the fetchers, because a fetcher fleet cannot coordinate politeness among itself. Duplicates are caught twice: exact URL after canonicalization, and near-duplicate content by SimHash.',
      data:
        'The frontier is a two-level structure: a front queue set that applies priority, and a back queue set where each queue holds URLs for exactly one host, with a min-heap keyed by next-allowed-fetch-time selecting which host is due. That is the Mercator design and it is the reason politeness is structurally guaranteed instead of merely intended. URL dedup uses a Bloom filter in front of a sharded key-value store, so the 99.9 percent of already-seen URLs never touch disk. Fetched content goes to object storage with a metadata row carrying content hash, SimHash and fetch time.',
      architecture:
        'The cycle is: pop the host whose next-fetch time has passed, fetch with a bounded timeout, check content hash for an unchanged page, parse, canonicalize the extracted links, filter through the Bloom filter, and enqueue new ones with a priority from PageRank-style importance and observed change rate. A host is owned by exactly one frontier shard, chosen by hash of the registered domain, which is what lets politeness be a local decision. Fetchers are stateless and pull work from their shard.',
      evaluate:
        'Coverage is measured as unique pages fetched against a known seed sample, and freshness as the age distribution of the corpus weighted by page importance, because average age is meaningless when most of the corpus is junk that never changes. Politeness under autoscaling is tested by tripling fetcher count and asserting per-host request intervals in the fetch log never drop below the configured delay.',
      deploy:
        'A host returning 429s or 5xx gets exponential backoff on its back queue, and a host returning 403 to our user agent is disabled with an alert, because continuing to hammer it is both rude and useless. If the frontier grows faster than fetchers drain it, which is the normal state of a web crawl, the priority function is doing its job: drop the low-priority tail rather than growing the queue forever, since an unbounded frontier is a memory leak with extra steps.',
      wrapup:
        'Politeness is enforced structurally by one host per back queue and a time-ordered heap, which costs crawl throughput on large sites, because a site with 10M pages is fetched at one page per 2 seconds no matter how much fleet you have. To double throughput without violating politeness you add hosts, not workers: broaden the seed set and raise concurrency across domains rather than within one.',
      numbers: [
        '1B pages/month = 385 pages/sec sustained; at 2 seconds per host that requires roughly 770 distinct hosts in flight at all times',
        '1B pages x 100KB average = 100TB/month of raw content, which drives the storage bill far more than the crawl itself',
        'URL dedup: 50B seen URLs x 10 bits in a Bloom filter = 62GB of RAM, sharded across 8 nodes, versus a disk lookup per URL which would be the actual bottleneck',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I will treat politeness as a structural property of the frontier rather than a rule fetchers follow, because that single decision is what keeps a crawler from getting a company banned.',
      traps: [
        'Enforcing the per-host delay in the fetcher. Add a second fetcher that happens to pick the same host and you have doubled the request rate; the queue structure has to guarantee it.',
        'Deduplicating on raw URL strings. Without canonicalization, tracking parameters and trailing slashes make the same page look like thousands of distinct URLs and the frontier fills with garbage.',
        'Treating the frontier as BFS. Breadth-first on the web is a crawl of low-value pages; priority has to be a real function of importance and change rate, or freshness on pages that matter is terrible.',
        'Forgetting robots.txt fetching and caching, which is itself a request per host and needs its own TTL, or you fetch it constantly and are impolite about politeness.',
      ],
      whenPushed: [
        {
          challenge: 'Your Bloom filter has false positives, so you will skip pages you have never seen.',
          answer:
            'Yes, at 10 bits per element that is about a 1 percent miss rate. I take it because the alternative is a disk lookup per extracted URL. If a page matters, it is almost certainly linked from elsewhere and gets another chance; for high-priority seeds I would verify against the backing store rather than trusting the filter.',
        },
        {
          challenge: 'How do you decide when to recrawl a page?',
          answer:
            'Adaptively, from observed change history: a page whose content hash has not changed in ten fetches gets its interval doubled up to a cap, and one that changes every fetch gets it halved. That is a Poisson change-rate estimate in practice, and it is far better than a fixed schedule because change rates on the web span five orders of magnitude.',
        },
        {
          challenge: 'A single site with ten million pages will take you a year at one page per two seconds.',
          answer:
            'It will, and that is the correct outcome for an uncooperative site. For large sites that want to be crawled, the answer is negotiation rather than architecture: honor a higher crawl-delay allowance they publish, use their sitemap for prioritization, and use conditional requests so unchanged pages cost almost nothing.',
        },
      ],
    },
    diagram: `flowchart TD
  FQ["Front queues: priority"] --> BQ["Back queues: one per host"]
  BQ --> HEAP["Min-heap by next allowed fetch time"]
  HEAP -->|host is due| FT["Fetcher pool"]
  FT -->|robots cached| RB[("robots.txt cache")]
  FT -->|content| ST[("Object storage plus metadata")]
  FT --> PR["Parser: canonicalize links"]
  PR -->|already seen| BF[("Bloom filter plus URL store")]
  PR -->|new URLs| FQ
  ST -->|SimHash| DUP["Near-duplicate check"]
  FT -.->|429 or 5xx| BQ`,
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
    solution: {
      define:
        'Video-on-demand only, with adaptive bitrate across five renditions from 240p to 4K. Upload-to-watchable target is under 5 minutes for a 10-minute video, achieved by publishing the lowest rendition first rather than waiting for the full ladder. Live is explicitly out of scope because it is a different pipeline with different failure modes.',
      data:
        'The source file lands in object storage, is split into segments of a few seconds, and each segment is transcoded independently into every rendition, stored as HLS or DASH segments plus a manifest. Segment-level parallelism is the key decision: it turns a serial 30-minute transcode into hundreds of parallel jobs. Metadata lives in a relational store holding video id, owner, title, status per rendition and manifest location, with no video bytes anywhere near it.',
      architecture:
        'Upload goes directly to object storage via a presigned multipart URL, which keeps hundreds of gigabytes off your application servers. Completion emits an event; a splitter chunks the source, a fleet of transcode workers processes segments in parallel from a queue, and a manifest is assembled per rendition as segments complete. Playback: the client fetches the manifest from the CDN, then requests segments, measuring throughput per segment and stepping the bitrate up or down. The CDN serves segments; origin only ever sees the first request per segment per region.',
      evaluate:
        'Measure startup latency as time to first frame and rebuffer ratio as rebuffer seconds over watch seconds, both segmented by region and by device, because a global average hides one bad edge region entirely. The load test that matters is a viral video: a single video id going from 10 to 100,000 concurrent viewers in one region, which tests cold-cache origin fan-out rather than aggregate throughput.',
      deploy:
        'A new transcoding profile is applied to new uploads immediately and to the back catalog lazily: transcode on first request for old videos and cache the result, so you never reprocess a petabyte of content that nobody watches. For a cold edge on a newly viral video, the CDN\'s origin shield collapses thousands of simultaneous misses into one origin fetch per segment, which is the difference between a warm-up blip and an origin outage.',
      wrapup:
        'To launch in a week I would cut the transcoding ladder to two renditions and skip adaptive switching, since one 720p rendition plus a mobile rendition covers most viewing and the ladder can be backfilled. The assumption to test first is upload concurrency, because the transcode fleet is sized on peak simultaneous uploads and a 10x underestimate turns a 5-minute publish delay into hours of queue.',
      numbers: [
        '500 hours uploaded/minute x 5 renditions = a transcode fleet sized on segment throughput; at 2x realtime per core, that is 500 x 60 x 5 / 2 = 75K core-minutes per minute, about 75K cores',
        '1 hour of 1080p at 5 Mbps = 2.25GB per rendition; the full 5-rendition ladder is roughly 4GB per source hour',
        '1M concurrent viewers x 5 Mbps = 5 Tbps of egress, which is why this is a CDN problem and origin bandwidth is a rounding error',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I want to scope this to video-on-demand and settle the acceptable publish delay up front, because that number decides whether transcoding is a serial pipeline or a fan-out over segments.',
      traps: [
        'Transcoding the whole file as one job. It is simple, it takes as long as the video is long, and it gives you no way to publish anything early; segment-level parallelism is the design decision here.',
        'Routing uploads through your application servers. A 4GB upload through your API tier is bandwidth and memory you never needed to spend; presigned multipart upload goes straight to object storage.',
        'Describing a CDN without mentioning origin shielding. Without it, a viral video\'s cold cache means every edge in a region independently fetches the same segment from your origin at the same moment.',
        'Storing the video blob in the database, or its metadata in the same store as the segments, which couples a tiny high-QPS read path to a huge low-QPS one.',
      ],
      whenPushed: [
        {
          challenge: 'Why HLS segments rather than progressive download?',
          answer:
            'Because adaptive bitrate needs a decision point, and segment boundaries are it. Progressive download commits the viewer to one quality for the whole video and wastes bandwidth when the network improves or degrades. The cost of segments is many more HTTP requests and a manifest to keep consistent.',
        },
        {
          challenge: 'Your per-segment parallel transcode will produce inconsistent quality at boundaries.',
          answer:
            'It can, because each segment\'s encoder makes independent rate decisions and you get visible pumping. The fix is a two-pass approach where a fast analysis pass over the whole file sets a target bitrate curve that each segment job honors, which costs one extra cheap pass over the source.',
        },
        {
          challenge: 'How do you handle the long tail of videos nobody watches?',
          answer:
            'Do not pre-transcode the full ladder for them. Generate one baseline rendition on upload and produce higher renditions on first request, caching the result. Most uploaded video is watched fewer than ten times, so eager transcoding of the full ladder is the single largest avoidable cost in this system.',
        },
      ],
    },
    diagram: `flowchart TD
  U["Uploader"] -->|presigned multipart| SRC[("Source object storage")]
  SRC -->|completion event| SP["Splitter: segment the source"]
  SP --> Q["Transcode queue"]
  Q --> TW["Transcode workers: parallel per segment"]
  TW --> REN[("HLS segments per rendition")]
  TW -->|lowest rendition first| MAN["Manifest assembly"]
  V["Viewer"] -->|manifest| CDN["CDN edge"]
  CDN -->|miss| SHIELD["Origin shield"]
  SHIELD --> REN
  V -->|measure throughput per segment| ABR["Adaptive bitrate switch"]
  MD[("Metadata store")] --> V`,
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
    solution: {
      define:
        'Two latency tiers, because they are genuinely different systems: standard live at 6 to 10 seconds glass-to-glass using HLS with 2-second segments, and low-latency at under 2 seconds using LL-HLS partial segments or WebRTC for interactive use. One stream must support 1M concurrent viewers. Recording to VOD is required and falls out of segment retention.',
      data:
        'The broadcaster sends RTMP or SRT to an ingest point; the server segments into 2-second chunks and transcodes into a rendition ladder. Segments are immutable and named by sequence number, which is what makes CDN caching trivial. The manifest is the only mutable object and it changes every 2 seconds, so it gets a 1-second cache TTL while segments get a long one. Viewer counts are approximate, aggregated from edge logs in 10-second windows rather than counted exactly.',
      architecture:
        'Broadcaster to nearest ingest POP, transcode to the ladder there, push segments to origin and to the CDN. Fan-out to a million viewers is entirely the CDN\'s hierarchical cache: edges pull from a regional shield, the shield pulls once from origin, so origin sees one request per segment per region regardless of viewer count. If the broadcaster drops, the ingest holds the stream open for a reconnect window of about 30 seconds and viewers see a buffering state; past that the stream ends and the recording is finalized.',
      evaluate:
        'Measure glass-to-glass by embedding a timestamp or QR code in the source frame and reading it at a synthetic player, because summing per-stage latencies always underestimates the real number. For a viral spike, the load test is manifest request rate, not segment bandwidth: a million players polling a 1-second-TTL manifest every 2 seconds is the request pattern that actually breaks things.',
      deploy:
        'Transcode capacity for a scheduled event is pre-warmed, because GPU or CPU transcode instances take minutes to come up and a live event does not wait; autoscaling alone is too slow for live. If a CDN edge fails mid-stream, the player retries the next segment and DNS or anycast moves it to another edge, which is invisible because segments are immutable and independently addressable.',
      wrapup:
        'Two-second segments trade latency for reliability: they give roughly 6 to 10 seconds glass-to-glass and let ordinary HTTP caching absorb a million viewers. Halving end-to-end latency means going to LL-HLS partial segments or WebRTC, which gives up the CDN\'s simple caching model and costs substantially more per viewer, so it is worth it only where interactivity is the product.',
      numbers: [
        '1M viewers x 5 Mbps = 5 Tbps peak egress, all of it CDN; origin sees 1 request per segment per shield region, so about 20 requests every 2 seconds',
        '2-second segments with a 3-segment player buffer = 6 seconds of buffer alone, plus 1 to 2s of encode and 1s of distribution, giving 8 to 9 seconds glass-to-glass',
        'Manifest polling: 1M players / 2s = 500K manifest requests/sec at the edge, which is 25x the segment request rate and the real fan-out problem',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'The first thing I want to fix is the latency tier, because sub-two-second interactive streaming and eight-second broadcast streaming share almost no infrastructure and I do not want to design a compromise that serves neither.',
      traps: [
        'Treating live as VOD with a shorter pipeline. The manifest is mutable and rewritten every segment, so its cache behaviour is the central problem and it does not exist in VOD at all.',
        'Sizing for segment bandwidth and forgetting manifest QPS. Players poll the manifest far more often than they fetch segments, and that is what melts the edge.',
        'Assuming autoscaling covers a scheduled event. Transcode instances take minutes to provision and a live event\'s peak arrives in seconds, so capacity must be pre-warmed.',
        'Promising sub-second latency while still describing HLS segments, which is internally inconsistent because the buffer alone exceeds your target.',
      ],
      whenPushed: [
        {
          challenge: 'Why not WebRTC for everything if it is lower latency?',
          answer:
            'Because WebRTC does not ride a CDN. Fan-out to a million viewers means a mesh of SFUs holding a million peer connections, which costs an order of magnitude more than HTTP segment delivery. I would use WebRTC only where two-way interaction is the product, and take the eight-second broadcast path otherwise.',
        },
        {
          challenge: 'Shorter segments would cut your latency.',
          answer:
            'They would, roughly linearly, and they multiply request rate by the same factor while making each segment less compressible because of more keyframes. One second is about the practical floor for plain HLS; below that you need partial segments with chunked transfer, which is exactly what LL-HLS is.',
        },
        {
          challenge: 'What happens to viewers if the broadcaster\'s upload bitrate collapses?',
          answer:
            'The ingest transcoder keeps producing segments from whatever it receives, so viewers see degraded quality rather than a stall, and the ABR ladder is capped at the source quality since you cannot transcode up. If the input stops entirely, I hold the stream open for the reconnect window and show a buffering state rather than ending it, because broadcaster networks drop constantly.',
        },
      ],
    },
    diagram: `flowchart TD
  B["Broadcaster"] -->|RTMP or SRT| ING["Nearest ingest POP"]
  ING --> TR["Transcode ladder"]
  TR -->|2 second immutable segments| ORG[("Origin")]
  TR -->|rewritten every 2s| MANF[("Manifest: 1s TTL")]
  ORG --> SHD["Regional shield"]
  SHD --> EDGE["CDN edges"]
  EDGE -->|segments long TTL| V["1M viewers"]
  MANF -->|polled every 2s| V
  ORG -->|retain segments| VOD[("Recording to VOD")]
  B -.->|drop: 30s reconnect window| ING`,
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
    solution: {
      define:
        'A frequently changing corpus of about 100M documents with relevance ranking, not just boolean matching. Indexing delay target is under 60 seconds from write to searchable, which is achievable with near-real-time segments and rules out a nightly batch rebuild. Query latency budget is 200ms p99 including ranking.',
      data:
        'An inverted index mapping each term to a posting list of (doc_id, term frequency, positions), with posting lists delta-encoded and compressed, since posting list size dominates index storage. Segments are immutable Lucene-style: new documents go into a small in-memory segment flushed every few seconds, and background merges combine small segments into large ones. Deletes are tombstones applied at query time and only physically removed on merge.',
      architecture:
        'Index by document: shard by doc_id hash so each shard holds a complete inverted index over its own document subset. A query fans out to every shard, each returns its local top-k with BM25 scores, and a coordinator merges into a global top-k. Document sharding is chosen over term sharding because it keeps each shard\'s work self-contained and its failure independent, at the cost of querying every shard for every query. Freshness comes from the small live segment being searched alongside the large ones.',
      evaluate:
        'Relevance is measured with a judged query set and NDCG at 10, plus click-through and abandonment on live traffic, because latency improvements that hurt relevance look like wins on every metric except the one that matters. To find a hot shard, replay a real query log where head terms are thousands of times more frequent than tail terms, and watch per-shard p99, since a common term has a posting list orders of magnitude longer than a rare one.',
      deploy:
        'Reindexing builds a new index version alongside the live one and switches an alias atomically when it is complete and warmed, so search is never offline and rollback is another alias flip. If the index is briefly stale relative to the source, that is the accepted 60-second window; for the case where correctness matters, such as a deleted document, the delete tombstone is applied at query time so removal is effectively immediate even though the merge is not.',
      wrapup:
        'Immutable segments plus background merges buy near-real-time indexing without ever mutating a posting list, at the price of query-time work across many segments and a continuous merge cost in IO. At 100x documents, fan-out is what breaks: every query touching every shard means a 500-shard cluster where p99 is the slowest of 500 responses, and the fix is tiering, searching a small high-quality index first and only falling through to the full corpus when results are thin.',
      numbers: [
        '100M docs x 1KB of text x roughly 0.3 index-to-text ratio after compression = about 30GB of index, so 10 shards of 3GB each fits comfortably in page cache',
        '1K QPS x 10 shards = 10K shard queries/sec, which is the real load number, not the 1K a candidate usually quotes',
        'p99 with fan-out: if a shard\'s p99 is 50ms, the query p99 across 10 shards is closer to the p99.9 of one shard, which is why tail latency matters more as shard count grows',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I want to establish the freshness requirement first, because under a minute means near-real-time segments and a design built around immutability, while an hour would let me get away with periodic batch rebuilds.',
      traps: [
        'Describing an inverted index and never mentioning that posting lists are compressed. Index size is the whole cost, and delta encoding plus variable-byte or PFOR is what makes it fit in memory.',
        'Choosing term-based sharding because it sounds like it distributes the work. It concentrates every query for a hot term on one shard and requires cross-shard intersection for multi-term queries.',
        'Updating documents in place. Posting lists are sorted and compressed, so an in-place edit is a rewrite; the segment-plus-tombstone model exists precisely to avoid it.',
        'Answering only on latency when asked about quality. Relevance needs a judged set and NDCG, and a candidate who never mentions it is describing a database, not a search engine.',
      ],
      whenPushed: [
        {
          challenge: 'Fanning out every query to every shard is wasteful.',
          answer:
            'It is, and it gets worse linearly with shard count because your p99 becomes the slowest shard. The mitigation is a tiered index: a small shard set of high-quality documents answers most queries completely, and only queries with insufficient results fall through to the full corpus. That is how large engines actually control fan-out.',
        },
        {
          challenge: 'Why BM25 and not a learned ranker?',
          answer:
            'BM25 is the retrieval stage and it is cheap enough to run over millions of postings. A learned ranker is the second stage over the top few hundred candidates, where 10ms of model time is affordable. Trying to run a model over the full posting list is what blows the latency budget.',
        },
        {
          challenge: 'Your merges will cause latency spikes.',
          answer:
            'They will, because a large merge saturates disk IO and evicts page cache. Merges get throttled and scheduled off-peak where possible, and merge policy caps segment size so no single merge is unbounded. This is the recurring operational cost of choosing immutable segments and it is worth naming rather than hiding.',
        },
      ],
    },
    diagram: `flowchart TD
  DOC["New or updated doc"] --> LIVE["In-memory live segment"]
  LIVE -->|flush every few seconds| SEG[("Immutable segments per shard")]
  SEG -->|background merge| SEG
  DEL["Delete"] -->|tombstone applied at query time| SEG
  Q["Query"] --> CO["Coordinator"]
  CO -->|fan-out to every shard| S1["Shard 1: BM25 top-k"]
  CO --> S2["Shard 2: BM25 top-k"]
  S1 --> MRG["Merge to global top-k"]
  S2 --> MRG
  MRG -->|top few hundred| RANK["Learned reranker"]
  RANK --> Q
  BUILD["Reindex to new version"] -.->|alias flip| CO`,
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
    solution: {
      define:
        '10M active time series ingesting a point every 10 seconds, which is 1M samples per second. Three query shapes with different needs: dashboards over the last hour, ad hoc range queries over weeks, and alert rules evaluated every 30 seconds. Retention is 15 days at full resolution, 13 months downsampled to 5 minutes.',
      data:
        'A columnar time-series store with Gorilla-style compression: delta-of-delta on timestamps and XOR on float values, which gets samples down to roughly 1.5 bytes from 16. Series identity is the metric name plus its label set, hashed to a series id; the inverted index from label pairs to series ids is what makes a query like all series where service equals checkout fast. Cardinality, not sample volume, is the thing that kills this system, so ingestion rejects any series whose label set pushes a metric past a configured cardinality limit.',
      architecture:
        'Hosts push to a local agent that batches and forwards, or the system scrapes them; either way ingestion writes to a per-series in-memory head block flushed to immutable 2-hour blocks on disk. Alert rules are evaluated by a separate ruler fleet querying the same store, sharded by rule group so no single evaluator falls behind. Storage shards by series id hash across nodes and by time into blocks, so a range query touches only the blocks in range, and old blocks are shipped to object storage with a downsampled copy.',
      evaluate:
        'Test alert timeliness end to end by injecting a synthetic metric that crosses a threshold and measuring the wall-clock time to a delivered notification, since the delays hide in scrape interval plus evaluation interval plus a for-duration plus notification batching. Prove no ingestion loss by comparing samples accepted against samples emitted per agent, and alarm on the gap; a dropped-sample counter that nobody graphs is how you find out from a customer.',
      deploy:
        'Threshold changes go out in shadow first: evaluate the new rule and record how often it would have fired, without notifying, then promote it. Alert storms are contained by grouping and inhibition, so one datacenter outage produces one notification and not four thousand. The monitoring system must not depend on itself: alert delivery and a minimal health dashboard run on separate infrastructure, because the incidents where you most need metrics are the ones most likely to affect the metrics pipeline.',
      wrapup:
        'The number that says this design is about to fall over is active series count, not samples per second: at 10M series memory per node is dominated by the head block index, and doubling cardinality doubles memory whether or not sample rate changes. Left for v2: exemplars linking metrics to traces, and per-tenant isolation for a multi-team deployment.',
      numbers: [
        '10M series / 10s scrape = 1M samples/sec; at 1.5 bytes compressed that is 1.5 MB/s, about 130GB/day and 2TB for 15 days of retention',
        'Uncompressed at 16 bytes per sample the same load is 16 MB/s and 1.4TB/day, so compression is a 10x difference in the storage bill',
        '10M series x roughly 200 bytes of in-memory index and head chunk = 2GB per replica of pure index, which is why cardinality is the hard limit',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to size this by active series rather than by samples per second, because cardinality is what actually kills time-series systems and sample rate almost never does.',
      traps: [
        'Storing metrics in a general-purpose row store. Sixteen bytes per sample uncompressed against a time-series encoding\'s one and a half is the entire reason purpose-built stores exist.',
        'Allowing unbounded label values such as user id or request id in a metric. One such label turns 100 series into 10 million and takes the cluster down; ingestion has to enforce a cardinality limit.',
        'Never accounting for the end-to-end alert delay. Scrape interval plus rule interval plus for-duration plus notification grouping is routinely two to three minutes, and candidates promise thirty seconds.',
        'Building a monitoring system that depends on itself for its own alerting, so the outage that matters is the one that silences you.',
      ],
      whenPushed: [
        {
          challenge: 'Why not just use logs and derive metrics from them?',
          answer:
            'Because the cost model is inverted. A metric sample is one and a half bytes and a log line is a few hundred, and metric queries are numeric aggregations over compressed columns rather than text scans. Logs are for the per-request detail metrics deliberately discard; you want both, for different questions.',
        },
        {
          challenge: 'Your alerting evaluator is a single point of failure.',
          answer:
            'It is sharded by rule group and each group is evaluated by two replicas with deduplication at the notification layer, so a lost evaluator costs no coverage. The residual risk is that both replicas query the same storage shard, so a storage outage silences those rules, which is why a dead-man\'s-switch alert that fires when alerts stop arriving is mandatory.',
        },
        {
          challenge: 'How do you handle a service emitting a brand new metric with a million label combinations?',
          answer:
            'Reject it at ingestion with a per-metric series limit and a loud error back to the owning team. It feels hostile and it is the right call: accepting it degrades every other tenant\'s queries. The trade is that a legitimate high-cardinality use case needs an explicit limit raise, which is a conversation rather than an outage.',
        },
      ],
    },
    diagram: `flowchart TD
  H["Hosts and services"] -->|scrape or push| AG["Agent: batch"]
  AG -->|cardinality limit enforced| ING["Ingester"]
  ING --> HEAD["In-memory head block"]
  HEAD -->|2 hour blocks| TSDB[("Compressed blocks: 1.5 bytes per sample")]
  TSDB -->|downsample to 5 min| LT[("Object storage 13 months")]
  LBL[("Label to series inverted index")] --> QY["Query engine"]
  TSDB --> QY
  QY --> DASH["Dashboards"]
  QY --> RUL["Ruler fleet: sharded by rule group"]
  RUL -->|group and inhibit| NOTIF["Notifier on separate infra"]
  NOTIF -.->|dead man switch| PAGE["On-call"]`,
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
    solution: {
      define:
        'A change must pass unit and integration tests, a build reproducibility check, and a canary before full rollout; manual approval only for changes touching payment or auth paths. Target is 50 deploys a day across services, which rules out any gate slower than about 15 minutes. Rollback is automatic on a health signal, because a human noticing is 10 minutes you do not have.',
      data:
        'A deployment record holds (deploy_id, service, artifact_digest, target_env, stage, started_at, health_verdict, previous_digest). Keying on the immutable content digest rather than a tag is what makes rollback exact: you redeploy a digest that definitely existed rather than a tag that may have moved. Which host runs which version is derived state, read from the orchestrator rather than tracked separately, so the two can never disagree.',
      architecture:
        'Build produces a content-addressed artifact once and it is promoted unchanged through environments, never rebuilt per environment. Deploy is a rolling update to 1 percent, hold and evaluate for 10 minutes against error rate, latency p99 and a small set of business metrics compared against the unchanged fleet as a control, then 10 percent, then 100. The comparison is canary against concurrent baseline, not against yesterday, because time-of-day effects will otherwise dominate the signal. Services deploy independently with per-service pipelines and a lock so one service cannot have two concurrent deploys.',
      evaluate:
        'Test the automatic rollback by deliberately deploying a build with an injected 5 percent error rate to a canary in staging and asserting it rolls back without human action, on a schedule, because a rollback path that is never exercised does not work. Watch change failure rate and mean time to recovery alongside deploy frequency, since the point is that frequency did not buy you incidents.',
      deploy:
        'The deployment system deploys itself with a two-phase trick: a previously known-good version of the deployer performs the upgrade, and the new version\'s first task is to redeploy a canary service to prove itself. If a canary looks healthy and the full fleet regresses, the cause is almost always something the canary could not see, such as a shared database under full load or a cache that only misses at scale, so the runbook is to roll back first and only then investigate.',
      wrapup:
        'Canary at 1 percent for 10 minutes with automatic rollback accepts a detection window in which roughly 1 percent of traffic sees the bad build, which is the deliberate price of not gating every deploy on a human. The next thing to automate to cut time-to-rollback is progressive traffic shifting at the load balancer rather than instance replacement, since shifting weights is seconds and replacing instances is minutes.',
      numbers: [
        '50 deploys/day x 15 minutes of pipeline = 12.5 pipeline-hours/day, so about 3 concurrent build agents even before parallel test sharding',
        'Canary at 1 percent for 10 minutes on a service at 10K RPS = 6M requests observed, enough to detect a 0.5 percent error-rate regression with confidence',
        'Rollback time: 30s to detect + 60s to shift traffic = 90 seconds of impact at 1 percent of traffic, versus 15+ minutes if a human has to notice',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to define what good looks like as a measurable health verdict before designing the pipeline, because automatic rollback is only possible if the definition of a bad deploy is a query rather than an opinion.',
      traps: [
        'Rebuilding the artifact per environment. Now staging and production are running different bytes and your test results certify something that never ships.',
        'Comparing canary metrics against the previous hour instead of against a concurrent control group, so every deploy during the morning traffic ramp looks like a regression.',
        'Canarying by instance percentage without checking traffic percentage. One instance out of a hundred may serve almost nothing if the load balancer is not routing evenly.',
        'Having no answer for how the deployment system deploys itself, which is the follow-up question this design always attracts.',
      ],
      whenPushed: [
        {
          challenge: 'Ten minutes of canary is far too slow for fifty deploys a day.',
          answer:
            'Per service it is fine, because services deploy in parallel; ten minutes of wall clock does not serialize across teams. Where it does bite is a service with low traffic, where ten minutes gives you no statistical power at all, and there I would either extend the window or fall back to a manual gate rather than pretend the canary means something.',
        },
        {
          challenge: 'What about database migrations?',
          answer:
            'They break the rollback story, and it is worth conceding immediately. The discipline is expand-then-contract: deploy a schema change that is backward compatible, deploy code using it, and only drop the old column in a later deploy. A migration that is not backward compatible means that deploy is genuinely not rollbackable and should be treated as a separate, gated change.',
        },
        {
          challenge: 'Your canary cannot detect a slow memory leak.',
          answer:
            'Correct, ten minutes will not see a leak that manifests in six hours. That class needs a bake period at partial traffic plus long-window alerting on memory growth per version, and I would accept that some regressions are only caught post-rollout. Pretending the canary catches everything is how teams stop watching after deploys finish.',
        },
      ],
    },
    diagram: `flowchart TD
  PR["Merge to main"] --> BLD["Build once: content digest"]
  BLD --> ART[("Artifact registry by digest")]
  ART --> TST["Unit and integration tests"]
  TST -->|promote same bytes| CAN["Canary: 1 pct of traffic"]
  CAN -->|10 min hold| CMP["Compare vs concurrent baseline"]
  BASE["Unchanged fleet: control"] --> CMP
  CMP -->|healthy| RAMP["10 pct then 100 pct"]
  CMP -->|error rate or p99 breach| RB["Automatic rollback to previous digest"]
  RAMP --> PRD["Production fleet"]
  DEP[("Deployment record: digest stage verdict")] --> RB`,
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
    solution: {
      define:
        'A trace must reconstruct the full causal call graph of one request across every service including async hops. Sampling is head-based at 1 percent for baseline traffic plus tail-based retention of everything that errors or exceeds a latency threshold, because uniform sampling systematically discards exactly the traces you need. Query availability target is 30 seconds after the request completes.',
      data:
        'A span carries trace_id, span_id, parent_span_id, service, operation, start and end timestamps, status, and a bounded set of key-value attributes. Trace id is 128 bits generated at the edge. Storage is keyed by trace_id so a fetch is a single-key lookup, with secondary indexes on service, operation and duration for the searching-by-symptom path, which is how people actually start an investigation.',
      architecture:
        'Context propagates as W3C traceparent headers on HTTP and as message attributes across queues, which is what makes async boundaries work at all. Each service emits spans to a local agent, which batches to a collector fleet. Head sampling decides at the edge and stamps the decision into the propagated flags, so the whole trace is consistently sampled or not. Tail sampling needs the full trace, so collectors buffer spans by trace_id for a 30-second window, decide, then persist or discard: that buffer is the real cost of tail sampling and it has to be sized deliberately.',
      evaluate:
        'Test async propagation specifically by asserting that a span produced by a background worker three hops downstream of an HTTP request shares the original trace_id, because that is the boundary where context is silently dropped in almost every codebase. Confirm sampling adequacy by comparing the error-rate distribution in sampled traces against the true error rate from metrics; a large gap means the sampler is biased.',
      deploy:
        'Sampling rate changes are pushed as remote config to agents and take effect on new traces only, never retroactively, so the transition is clean and no trace is half-sampled. If the tracing backend is unavailable, agents buffer locally with a bounded queue and drop the oldest spans on overflow, because tracing must never apply back pressure to the application it is observing.',
      wrapup:
        'One percent head sampling plus tail retention of errors and slow requests costs you the ability to answer questions about the healthy 99 percent, so aggregate questions must be answered by metrics rather than by traces. The first gap I would close after a broken trace in an incident is instrumentation coverage at async boundaries, since a missing propagation in one library orphans every span downstream of it.',
      numbers: [
        '100K requests/sec x 20 spans per request = 2M spans/sec generated; at 1 percent head sampling that is 20K spans/sec persisted',
        '20K spans/sec x 500 bytes x 7 days retention = 6TB, versus 600TB unsampled, which is the entire argument for sampling',
        'Tail sampling buffer: 2M spans/sec x 30-second window x 500 bytes = 30GB of collector memory, spread across the fleet, which is why the window is 30 seconds and not 5 minutes',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to settle the sampling strategy in the first few minutes, because it determines the storage bill, the collector architecture and which questions this system can actually answer.',
      traps: [
        'Sampling each span independently. That produces fragments of traces rather than traces; the decision has to be made once per trace and propagated in the context.',
        'Ignoring async boundaries. Context propagates for free over HTTP with a middleware and never propagates over a queue unless someone explicitly puts it in the message, and that is where traces break in practice.',
        'Proposing tail-based sampling without accounting for the buffer. You must hold every span of every in-flight trace in memory until you can decide, and that memory is the dominant cost of the collector fleet.',
        'Letting the tracing client block or retry against a degraded backend, so your observability tool becomes the cause of the outage.',
      ],
      whenPushed: [
        {
          challenge: 'One percent sampling means you will miss the trace the customer is complaining about.',
          answer:
            'Often, yes. The mitigations are tail retention of errors and slow requests, which covers most complaints, and a debug flag that forces sampling for a specific user or endpoint when someone is actively investigating. What I cannot do is retroactively recover a trace that was never sampled, and I would say that plainly.',
        },
        {
          challenge: 'How do you keep clocks consistent when spans come from different machines?',
          answer:
            'I do not rely on cross-machine clock comparison for causality; parent-child relationships come from span ids, not timestamps. Clock skew shows up as a child span appearing to start before its parent, which the UI clamps for display. Getting real cross-host duration accuracy would need something like NTP discipline within a few milliseconds, and I treat displayed absolute times as approximate.',
        },
        {
          challenge: 'What is the performance overhead on the instrumented service?',
          answer:
            'A few microseconds per span for creation and a batched async export, so under 1 percent CPU at typical span rates. The overhead that actually bites is attribute cardinality: attaching a large payload or a per-request unique string to every span multiplies both CPU and storage, so attributes are bounded in size and count at the client.',
        },
      ],
    },
    diagram: `flowchart TD
  S1["Service A: root span"] -->|traceparent header| S2["Service B"]
  S2 -->|context in message attributes| Q["Queue"]
  Q --> S3["Async worker span"]
  S1 --> AG["Local agent: batched export"]
  S2 --> AG
  S3 --> AG
  AG -->|bounded buffer, drop on overflow| COL["Collector fleet"]
  COL -->|buffer 30s by trace id| TAIL["Tail sampler: keep errors and slow"]
  HEAD["Head sample 1 pct at edge"] -.->|decision in propagated flags| S1
  TAIL --> TS[("Trace store keyed by trace id")]
  TS --> IDX[("Index: service, operation, duration")]
  IDX --> UI["Query by symptom"]`,
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
    solution: {
      define:
        'Two invariants: never charge a customer twice for one checkout, and never confirm an order for inventory that does not exist. Checkout is synchronous through payment authorization and asynchronous after: the customer gets a confirmation once payment is authorized and inventory is reserved, and fulfillment happens off a queue. Every mutating checkout call requires a client-generated idempotency key.',
      data:
        'Inventory is a row per SKU with an available count and a reserved count, decremented by a conditional UPDATE ... WHERE available >= qty, which makes overselling impossible without an explicit lock. An idempotency table stores (key, request_hash, response, status) with a unique constraint on the key; the request hash catches a client reusing a key for a different payload, which is a bug worth surfacing rather than silently serving a stale response. Orders are a state machine: created, payment_authorized, confirmed, fulfilled, cancelled.',
      architecture:
        'Checkout begins by inserting the idempotency row, which either succeeds or returns the previous response for a completed request, or a 409 if one is in flight. Then reserve inventory conditionally, then authorize payment with the same idempotency key passed through to the processor so the processor deduplicates too, then confirm the order and publish to a fulfillment topic. The order of operations matters: reserve before charging, because refunding money is worse than releasing a reservation. Capture happens at shipment, not at checkout, which is also what the card networks expect.',
      evaluate:
        'Fire the identical checkout request 50 times concurrently with one idempotency key and assert exactly one order, one authorization and one inventory decrement. For a flash sale, load-test a single SKU with 10,000 concurrent buyers and confirm the conditional update serializes cleanly and rejects the excess, since the whole system is bounded by one row\'s write throughput at that moment.',
      deploy:
        'Payment flow changes roll out behind a flag with the old and new paths sharing the same idempotency table, so a request that starts on one path and retries onto the other still deduplicates. When payment and order state disagree after an incident, the processor is the source of truth: a reconciliation job pulls the processor\'s transaction list, matches on idempotency key, and either completes the order or issues a refund, and it must never guess.',
      wrapup:
        'The assumption to test first is payment provider latency at the tail, because the entire idempotency design exists to handle the case where you time out at 5 seconds and the charge actually succeeded at 7. Under a tight deadline I would cut the reservation step and check inventory at fulfillment instead, accepting oversells that get cancelled and refunded, which is a real business cost traded for a much simpler checkout.',
      numbers: [
        '1M orders/day = 12/sec average, 100/sec during a sale; the system is not throughput-bound, it is correctness-bound',
        'Flash sale on one SKU: 10K concurrent buyers against one row at ~1ms per conditional update = the whole contention resolves in about 10 seconds with no oversell',
        'Idempotency keys retained 24 hours at 1M orders/day x 3 retries x 200 bytes = under 1GB, so retention is cheap and the TTL can be generous',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to name the two things that must never happen, a double charge and an oversell, and then design backwards from those, because everything else in checkout is a product decision rather than a systems one.',
      traps: [
        'Treating an idempotency key as a cache lookup before doing the work. Two concurrent retries both miss the lookup and both proceed; the unique constraint has to be the enforcement mechanism.',
        'Charging the card before reserving inventory. Now an oversell means refunding a customer who was told the order succeeded, which is a support cost and a trust cost you chose to create.',
        'Having no answer for the payment call that times out. That is the single most likely real failure in this system, and the answer is a pass-through idempotency key plus a reconciler that queries the processor.',
        'Decrementing inventory with a read-then-write in application code, which oversells under exactly the flash-sale load this system exists to survive.',
      ],
      whenPushed: [
        {
          challenge: 'One row per SKU will not survive a flash sale.',
          answer:
            'It survives more than people expect, roughly a thousand conditional updates a second on one row, which clears ten thousand buyers in ten seconds. Beyond that I would shard the SKU into N inventory buckets and route buyers randomly, which raises throughput linearly and makes the last few units awkward because one bucket runs out while others have stock.',
        },
        {
          challenge: 'What if the customer\'s card is authorized but your service crashes before the order is confirmed?',
          answer:
            'The idempotency row is in an in-flight state with the authorization id recorded, so the reconciler finds it, queries the processor, and either completes the order or voids the authorization. The customer\'s retry hits the same key and gets the resolved answer. Losing that record is the one failure I cannot recover from, which is why it is written before the charge, not after.',
        },
        {
          challenge: 'Why not use a saga across separate inventory, payment and order services?',
          answer:
            'I would, and the flow I described is a saga with compensations, releasing the reservation and voiding the authorization. What I would resist is a distributed transaction with two-phase commit across those services, because holding locks across a payment provider call is how you turn a slow dependency into a total outage.',
        },
      ],
    },
    diagram: `flowchart TD
  C["Customer"] -->|idempotency key| CO["Checkout service"]
  CO -->|unique constraint insert| IDEM[("Idempotency table")]
  IDEM -->|replay stored response| C
  CO -->|1. reserve: UPDATE where available >= qty| INV[("Inventory per SKU")]
  CO -->|2. authorize with same key| PSP["Payment provider"]
  PSP -->|authorized| ORD[("Order state machine")]
  ORD -->|3. publish| FUL["Fulfillment topic"]
  FUL --> WH["Warehouse worker"]
  WH -->|capture at shipment| PSP
  PSP -.->|timeout: unknown outcome| REC["Reconciler queries provider"]
  REC --> ORD`,
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
    solution: {
      define:
        'The invariant is one driver holding at most one active offer or ride at a time. Match latency target is under 5 seconds from request to a driver accepting, which shapes everything: you cannot run a global optimization at that budget. Surge pricing responds to supply and demand per hex cell on a 1 to 2 minute cadence, not per request.',
      data:
        'Driver locations arrive every 4 seconds and are stored in Redis as an H3 or geohash cell id to driver mapping, keyed by cell, so nearest-driver is a lookup of the containing cell plus its ring of neighbours rather than a distance computation over a city. Only the current position is kept hot; the history goes to a separate analytics stream. A ride is a state machine (requested, offered, accepted, arriving, in_progress, completed, cancelled) persisted in a database, with the driver\'s availability flag guarded by a conditional update.',
      architecture:
        'A request resolves the rider\'s cell, gathers candidate drivers from that cell and its neighbours, ranks them by estimated time of arrival from the road graph rather than straight-line distance, and offers to the best one with a 15-second timeout. The offer takes a conditional lock on the driver: UPDATE driver SET state=\'offered\' WHERE state=\'available\', so a driver can never be offered two rides at once, and a lost race just moves to the next candidate. On timeout or decline, the offer moves down the ranked list. Batched matching over a 2-to-5-second window improves global assignment quality noticeably over greedy first-come matching, and that window is the main quality lever.',
      evaluate:
        'Test the supply crunch specifically: 500 riders and 20 drivers in one cell, and confirm the system degrades into a clear queue with honest wait estimates rather than offering the same driver to fifty riders. Measure match latency at p99 during a demand spike, segmented by cell, because a citywide average stays healthy while one stadium cell is failing completely.',
      deploy:
        'A driver\'s app losing connectivity is detected by a missed location heartbeat; after 30 seconds they are marked unavailable for new offers, and if they were mid-ride, the ride continues on the rider\'s side with a last-known position and reconciles when the driver reconnects. Match confirmation is idempotent on the ride id, so a duplicate confirmation from a flaky mobile network returns the same result rather than assigning a second driver.',
      wrapup:
        'Batched matching over a short window trades a couple of seconds of latency for meaningfully better assignments, and the conditional update on driver state is what makes double-booking impossible without a distributed lock. During a citywide surge the bottleneck is location write throughput and cell hotspotting, so the first change is adaptive location reporting, slowing updates from idle drivers and speeding them up only for those on an active trip.',
      numbers: [
        '1M active drivers x 1 location update / 4s = 250K writes/sec into Redis, which dominates every other write in this system by two orders of magnitude',
        'A demand spike of 10K requests/minute in one city = 170/sec, each scanning ~7 hex cells with about 50 drivers each = 60K candidate evaluations/sec',
        '15-second offer timeout with a 60 percent accept rate means the median match is 1 offer and the p95 is 3, so a p95 match takes about 45 seconds unless offers are made in parallel to the top 3',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to fix the match latency budget first, because a five-second budget rules out global optimization and pushes me toward a geospatially indexed local search with short batching windows.',
      traps: [
        'Computing nearest driver with a distance query over all drivers in the city. Geospatial indexing by cell turns that into a hash lookup plus neighbours, and without it the query cost grows with fleet size.',
        'Ranking by straight-line distance. A driver 200 metres away across a river is twenty minutes away, and riders notice immediately; ranking has to use road-network ETA.',
        'Writing every location update to a durable database. Two hundred and fifty thousand writes a second of data that is worthless four seconds later belongs in memory with a separate async path to analytics.',
        'Offering a ride to multiple drivers at once without a conditional claim, so two drivers both accept and one has to be told to stand down.',
      ],
      whenPushed: [
        {
          challenge: 'Greedy nearest-driver matching is not optimal.',
          answer:
            'It is not, and batching over a few seconds and solving a small assignment problem measurably beats it, especially in dense areas. What I will not do is chase a global optimum, because the marginal quality is small and the latency cost is what riders actually feel.',
        },
        {
          challenge: 'What happens at a stadium when 5,000 people request at once?',
          answer:
            'One cell becomes hot on both reads and writes, and the honest answer is admission control plus surge: queue riders with a visible wait estimate, raise the price to pull supply in, and shard the cell\'s driver index so the reads spread. Pretending the matcher can serve everyone in five seconds when there are two hundred drivers is a design that lies to users.',
        },
        {
          challenge: 'Your driver-state conditional update is a hot row per driver, but the ride table is a hot table overall.',
          answer:
            'Per driver it is one row and contention is naturally low, since only a handful of offers race for one driver. The ride table is high volume but partitioned by city and by time, and it is append-heavy with short-lived hot rows, so it is a good fit for a partitioned store rather than the bottleneck.',
        },
      ],
    },
    diagram: `flowchart TD
  D["Drivers"] -->|location every 4s| GEO[("Redis: H3 cell to drivers")]
  R["Rider request"] --> M["Matcher"]
  M -->|cell plus neighbour ring| GEO
  M -->|rank by road-network ETA| ETA["Routing service"]
  M -->|2-5s batching window| ASSIGN["Assignment"]
  ASSIGN -->|UPDATE driver where state = available| DS[("Driver state")]
  DS -->|claimed| OFFER["Offer with 15s timeout"]
  OFFER -->|decline or timeout| ASSIGN
  OFFER -->|accept, idempotent on ride id| RIDE[("Ride state machine")]
  GEO -.->|missed heartbeat 30s| UNAV["Mark unavailable"]
  GEO --> AN["Analytics stream"]`,
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
    solution: {
      define:
        'At-least-once delivery with client-side deduplication on a message id, plus per-conversation ordering by a server-assigned sequence number; global ordering across conversations is neither needed nor promised. Group chats up to 100,000 members, which is what forces a different fan-out path from one-to-one. Undelivered messages are queued server-side until the recipient reconnects.',
      data:
        'Messages are stored per conversation, partitioned by conversation_id and clustered by sequence number descending, so loading the latest 50 messages is a single partition read and pagination is a range scan. Cassandra fits this exactly. Each message carries a client-generated id used for deduplication so a resend after a network blip does not create a second message. Per-user, per-conversation read cursors track delivery, which is far cheaper than a per-message per-recipient status row.',
      architecture:
        'Clients hold a websocket to a gateway node; a presence registry maps user id to the gateway node holding their connection. Sending a message: persist it with a sequence number, then look up each recipient\'s gateway and forward. For small groups this fan-out is direct. For a 100,000-member group it is not: the message is written once and members pull it on read, with only a lightweight new-activity notification pushed, which is the read-fanout side of the same trade-off feeds make. A reconnecting client sends its last known sequence per conversation and receives the delta.',
      evaluate:
        'Test the offline case by sending to a disconnected recipient, reconnecting, and asserting exactly one delivery with the right sequence; then resend the same client message id and assert no duplicate is created. For large groups, measure the time from send to the last member\'s device, since the p50 stays flat while the tail grows linearly with member count under push fan-out, which is the signal that you need to switch that group to pull.',
      deploy:
        'A gateway node holding 100,000 connections dying produces a reconnect storm, which is handled with randomized backoff on the client of up to 30 seconds and a connection admission limit at the gateway; without jitter, every client returns in the same second and knocks over the replacement. A client unsure whether its send arrived resends with the same client message id, and the storage-layer uniqueness on that id makes the retry a no-op that returns the original sequence number.',
      wrapup:
        'At-least-once with client-side deduplication means every client must keep a set of recently seen message ids and tolerate reordering during catch-up, which is real work pushed onto the client in exchange for a server that never blocks on delivery confirmation. At 100,000 members, push fan-out is the limit, and the change is to flip large groups to pull-on-read with a notification-only push.',
      numbers: [
        '1M messages/sec globally x 200 bytes = 200 MB/s of writes, and with 3x replication 600 MB/s, which sets the storage cluster size',
        '50M concurrent connections / 100K per gateway node = 500 gateway nodes, memory-bound at roughly 10KB per connection = 1GB per node just for sockets',
        'A 100K-member group at 10 messages/sec under push fan-out = 1M outbound messages/sec from one conversation, which is why that group must be pull-based',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to separate one-to-one chat from large group chat immediately, because push fan-out is correct for the first and catastrophic for the second, and a single design that pretends they are the same will fail one of them.',
      traps: [
        'Storing a delivery status row per message per recipient. In a 100,000-member group that is 100,000 rows per message; read cursors per user per conversation give you the same product feature for a millionth of the cost.',
        'Promising exactly-once delivery. The client can always time out after the server persisted the message, so the honest design is at-least-once with a client message id for deduplication.',
        'Ignoring the reconnect storm. Losing one gateway node means a hundred thousand clients reconnecting at once, and without client-side jitter they will do it in the same second.',
        'Fanning out to every member of a huge group on write, which turns one send into a million pushes and makes the sender wait for it.',
      ],
      whenPushed: [
        {
          challenge: 'How do you guarantee ordering when two people send at the same instant?',
          answer:
            'The server assigns the sequence number at persist time, so there is a single authority per conversation and both clients converge on the same order. It may not match wall-clock order, and I would rather have a consistent arbitrary order than an inconsistent true one. Clients display in sequence order, not by client timestamp.',
        },
        {
          challenge: 'Websockets mean stateful servers, which complicates deploys.',
          answer:
            'They do. Deploys drain connections gradually with a server-sent reconnect hint that spreads clients over a few minutes, and the presence registry is external so a new node picks up ownership immediately. The alternative, long polling, removes the state at the cost of far more requests and worse latency, and I would not take it.',
        },
        {
          challenge: 'What about end-to-end encryption?',
          answer:
            'It changes the design substantially and it is worth saying so rather than waving it through. Server-side search, server-side fan-out transformations and read receipts computed on the server all become impossible, group key distribution becomes a real subsystem, and the message store becomes opaque blobs. I would scope it as a v2 with the understanding that it is a rewrite of the delivery layer, not a feature.',
        },
      ],
    },
    diagram: `flowchart TD
  A["Sender"] -->|client message id| GW1["Gateway node A"]
  GW1 -->|persist with sequence number| MS[("Messages by conversation id")]
  GW1 -->|lookup recipient node| PR[("Presence registry")]
  PR --> GW2["Gateway node B"]
  GW2 -->|websocket push| B["Recipient"]
  MS -->|small groups: direct fan-out| GW2
  MS -->|100k member group: notify only| BIG["Pull on read"]
  BIG --> B
  B -->|last seen sequence| GW2
  GW2 -->|catch-up delta| MS
  CUR[("Per-user read cursors")] --> GW2
  GW1 -.->|node loss: jittered reconnect| GW2`,
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
    solution: {
      define:
        'Hybrid fan-out: push on write for the 99.9 percent of users with normal follower counts, pull on read for accounts above roughly 100,000 followers, merged at read time. Ranked rather than chronological, because chronological is a product decision the interviewer will immediately question, but ranking sits on top of the same retrieval. Feed freshness target is under 10 seconds for a normal author.',
      data:
        'A per-user feed list in Redis holding roughly the last 500 post ids with their ranking features, not the post bodies, because hydrating from a post store on read is cheap and duplicating content across millions of feeds is not. Posts live in a partitioned store keyed by post_id. A separate celebrity_authors set marks the accounts excluded from push fan-out.',
      architecture:
        'On post creation, publish to a fan-out topic. Workers expand the author\'s follower list in batches of 10,000 and LPUSH the post id into each follower\'s feed list with an LTRIM to cap length. For celebrity authors, skip fan-out entirely. On read, take the precomputed list, union it with a live query of the celebrities this user follows, rank the merged candidate set, inject ads and diversity rules, and hydrate. That read-time merge is small, since a user typically follows only a handful of celebrities.',
      evaluate:
        'Measure fan-out completion time as the p99 delay from post creation to the post appearing in the last follower\'s feed, not the average, because the average is dominated by users with two hundred followers. To catch the celebrity problem specifically, track fan-out queue depth attributed by author and alert when a single author\'s expansion exceeds a threshold, which is what a mistaken classification looks like.',
      deploy:
        'A ranking change rolls out per user rather than per request, so a user does not see their feed reorder between two scrolls of the same session; the model version is pinned into the session. If the ranking service is unavailable, fall back to reverse-chronological over the same precomputed list, which is a visibly worse feed but a working one, and it requires no separate code path because the candidates are already there.',
      wrapup:
        'Hybrid fan-out is chosen because pure push cannot survive a celebrity post and pure pull cannot serve a normal user\'s read at latency; the cost is two code paths and a merge at read time. At 10x DAU the write amplification of fan-out is the first thing to break, and the next move is to lower the celebrity threshold so more authors are pull-based, trading read cost for write cost.',
      numbers: [
        '500M DAU x 20 feed reads/day = 10B reads/day = 115K reads/sec average, 350K at peak',
        'Average author with 500 followers x 10M posts/day = 5B feed writes/day = 58K writes/sec, versus one celebrity with 50M followers producing 50M writes from a single post',
        '500M users x 500 post ids x 40 bytes = 10TB of feed lists in Redis, so the cap on list length is a direct memory-cost decision',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to decide the fan-out strategy in the first few minutes and I already know it has to be hybrid, because the celebrity case and the ordinary case have write costs that differ by five orders of magnitude.',
      traps: [
        'Committing to pure fan-out-on-write and only later noticing that a single celebrity post is fifty million writes, which is the exact failure this question is built around.',
        'Storing post content in each follower\'s feed. Fifty million copies of the same text is both a storage bill and an impossible edit-and-delete problem; store ids and hydrate.',
        'Letting the feed list grow unbounded. Without an LTRIM, an inactive user accumulates years of entries and your Redis memory grows with total posts rather than with active users.',
        'Forgetting deleted and blocked content. The precomputed list can contain posts that have since been deleted or authors the user has since muted, so the read path must filter, and that filter is not free.',
      ],
      whenPushed: [
        {
          challenge: 'Where exactly do you draw the celebrity threshold?',
          answer:
            'I would set it where fan-out cost exceeds read-merge cost, which lands around 100,000 followers for these numbers, and I would make it a tunable rather than a constant. The awkward case is an account crossing the line, which needs a migration of its existing pushed posts or simply an acceptance that its next post behaves differently.',
        },
        {
          challenge: 'A user who follows two hundred celebrities makes your read path do two hundred queries.',
          answer:
            'That is the real cost of the hybrid, and the mitigation is caching each celebrity\'s recent posts once globally, since they are shared by millions of readers. So the merge is two hundred cache hits, not two hundred database queries, and the cache hit rate on celebrity content is essentially 100 percent.',
        },
        {
          challenge: 'How do you rank without blowing the latency budget?',
          answer:
            'Two stages. Candidate retrieval is the precomputed list plus celebrity pull, a few hundred items, and ranking is a model scoring those few hundred, not the whole corpus. That keeps model inference at a few milliseconds and puts the cost in a feature fetch, which is the piece I would cache aggressively per user.',
        },
      ],
    },
    diagram: `flowchart TD
  P["New post"] --> PS[("Post store")]
  P --> CHK["Author follower count check"]
  CHK -->|no: fan-out on write| FW["Fan-out workers: 10k batches"]
  FW -->|LPUSH id plus LTRIM 500| FL[("Per-user feed lists in Redis")]
  CHK -->|yes: skip fan-out| CEL[("Celebrity recent posts cache")]
  R["Feed read"] --> MRG["Merge precomputed plus celebrity pull"]
  FL --> MRG
  CEL --> MRG
  MRG -->|few hundred candidates| RANK["Ranker plus ad injection"]
  RANK -->|hydrate bodies| PS
  RANK --> R
  RANK -.->|service down: reverse chronological| MRG`,
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
    solution: {
      define:
        'Offer both shortest-distance and fastest-time-with-traffic, defaulting to the latter. Traffic must affect an in-progress route within about 2 minutes, which is achievable with aggregated probe data and rules out per-vehicle real-time reaction. Global road graph of roughly 100M intersections must answer a route query in under 200ms.',
      data:
        'The road network is a directed graph with intersections as nodes and road segments as edges, edge weight being predicted travel time rather than distance. Raw Dijkstra over 100M nodes is far too slow, so the graph is preprocessed with contraction hierarchies: nodes are ordered by importance and shortcut edges added, which turns a continental query into a bidirectional search touching thousands of nodes rather than millions. Traffic is a stream of GPS probes map-matched to segments and aggregated into per-segment speed estimates in 1-to-2-minute windows.',
      architecture:
        'A route request runs a bidirectional contraction-hierarchy search on the preprocessed graph with live speeds applied as edge weight adjustments. Because contraction hierarchy preprocessing assumes static weights, live traffic is applied as a customization layer, the customizable-contraction-hierarchies approach, so a traffic update triggers a cheap re-customization rather than a full re-preprocess. The graph is partitioned geographically into tiles with boundary nodes; long routes are computed as a sequence of tile-local searches stitched at boundaries. Rerouting during navigation happens on the client for local deviations and on the server when the remaining route changes materially.',
      evaluate:
        'Compare computed ETAs against actual observed traversal times from probe data and track the error distribution, since a router that returns a fast-looking route with a wrong ETA is worse than a slightly longer route with an honest one. For recompute latency under a traffic event, load-test with a simulated highway closure and measure how long until re-customization propagates and routes change.',
      deploy:
        'Map updates ship as a new versioned graph build, warmed on a subset of servers and switched by version pin, and a navigation session stays pinned to the version it started on so a route does not change under a driver mid-turn. If live traffic is unavailable for a region, fall back to historical speed profiles by time of day and day of week, which are surprisingly good, and label the ETA as an estimate.',
      wrapup:
        'Contraction hierarchies with a live customization layer make continental routing interactive, and the trade is a heavy preprocessing step plus the constraint that live traffic can only adjust weights rather than change the graph. At a much larger concurrent-navigator count in one city, the bottleneck is rerouting requests rather than initial routes, and the fix is pushing more deviation handling onto the client and only calling the server when the route genuinely changes.',
      numbers: [
        '100M nodes with plain Dijkstra at roughly 1M node expansions per second = tens of seconds per query; contraction hierarchies cut expansions to a few thousand, giving sub-10ms',
        '1M concurrent navigators re-checking their route every 30 seconds = 33K route-check requests/sec, which is why most deviation handling belongs on the device',
        '100M probe points/minute map-matched to 200M segments = per-segment speed updated every 1 to 2 minutes for busy roads, and far less often for quiet ones',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to state up front that plain shortest-path over a continental graph is not viable at interactive latency, so the design is really about what we precompute and how live traffic gets layered onto it.',
      traps: [
        'Answering with Dijkstra or A-star and stopping there. A-star with a geographic heuristic still expands millions of nodes on a long route; preprocessing is the actual answer and not mentioning it is the failure mode of this question.',
        'Treating live traffic as a simple edge-weight update when the preprocessing assumed static weights. Reconciling those two is the interesting part, and hand-waving it is the follow-up question you will get.',
        'Forgetting map-matching. Raw GPS is tens of metres off and needs to be snapped to segments before it means anything, and a candidate who skips it has not thought about where traffic data comes from.',
        'Recomputing the full route on the server every few seconds during navigation, which multiplies your query load by the number of active drivers for almost no benefit.',
      ],
      whenPushed: [
        {
          challenge: 'How do you handle a road closure that appears in the next five minutes?',
          answer:
            'Closures are handled as edge removals in the customization layer, which is exactly the case that separates customizable contraction hierarchies from plain ones. Re-customization for a region takes seconds rather than the hours a full preprocess needs, so a closure propagates within a couple of minutes.',
        },
        {
          challenge: 'Your ETAs will be wrong on routes that take an hour, because traffic will change.',
          answer:
            'Yes, and the fix is time-dependent edge weights: when the router evaluates a segment it uses the predicted speed at the estimated arrival time at that segment, not the current speed. That makes the search more expensive and the predictions come from historical profiles, so the honest statement is that hour-long ETAs are a forecast.',
        },
        {
          challenge: 'How do you keep probe data from identifying individual drivers?',
          answer:
            'Aggregate before persisting: probes are map-matched, contributed to a segment speed estimate, and the individual trace is dropped, with a minimum contributor count per segment before publishing a speed. On a quiet rural road that means either no live speed or a real re-identification risk, and I would take no live speed.',
        },
      ],
    },
    diagram: `flowchart TD
  GPS["GPS probes"] --> MM["Map matching to segments"]
  MM -->|1-2 min windows| SPD[("Per-segment live speeds")]
  OSM[("Road graph")] --> PRE["Contraction hierarchy preprocessing"]
  PRE --> CH[("Shortcut graph, geo-tiled")]
  SPD -->|customization layer| CH
  RQ["Route request"] --> ROUTER["Bidirectional CH search"]
  ROUTER --> CH
  ROUTER -->|turn by turn| CLI["Client"]
  CLI -->|local deviation| CLI
  CLI -->|material change only| ROUTER
  SPD -.->|region unavailable| HIST[("Historical speed profiles")]
  HIST --> ROUTER`,
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
    solution: {
      define:
        'The invariant is that a spot is assigned to at most one active ticket. Spot types are compact, regular, large and accessible, and a vehicle may occupy any spot of its size or larger, which makes assignment a preference-ordered search rather than an exact match. Pricing is per started hour by spot type with a daily cap.',
      data:
        'A spots table keyed by (lot_id, level, spot_number) with columns for type, status and current_ticket_id. To make assignment fast at high occupancy, maintain a per-(lot, level, type) free-spot counter and a small free list in Redis, so the common case is a pop rather than a scan of thousands of rows. Tickets hold entry_time, spot_id, vehicle_type, plate and payment state.',
      architecture:
        'Entry: pick a candidate spot from the free list for the smallest fitting type, then claim it with UPDATE spots SET status=\'occupied\', ticket_id=? WHERE spot_id=? AND status=\'free\'. If the conditional update affects zero rows, another vehicle won the race and we take the next candidate, so no lock is needed anywhere. Exit: compute the fee from entry_time, mark the ticket paid, and free the spot in the same transaction so the spot cannot be double-freed or leaked. Multi-level and multi-location scale by partitioning on lot_id, since lots are entirely independent of one another.',
      evaluate:
        'Run 200 concurrent entries against a lot with 100 free spots and assert exactly 100 succeed, no spot has two tickets, and the rest get a lot-full response rather than an error. Measure assignment latency as occupancy climbs from 50 to 99 percent, because that is where a naive scan-for-a-free-spot implementation degrades from constant time into a full table scan.',
      deploy:
        'A crash mid-assignment leaves either a claimed spot with no ticket or neither, so a reconciliation job frees spots whose ticket_id points at nothing older than a few minutes. Payment failure at exit must not block the barrier: mark the ticket as unpaid-exit with the plate recorded, free the spot immediately, and pursue the charge afterwards, because holding a spot hostage to a card decline costs more than the parking fee.',
      wrapup:
        'Assignment concurrency is a conditional update plus a retry against the next candidate, which costs an occasional extra round trip under contention and avoids any lock or coordination service. To support a busy multi-location deployment the first change is per-lot free-spot indices in memory with the database as the durable record, so an entry decision never touches a shared store across lots.',
      numbers: [
        '1000 spots x 5 turnovers/day = 5000 entries and 5000 exits/day = under 1 transaction/sec, so this is a correctness problem, not a throughput problem',
        'Rush hour: 100 entries in 10 minutes = 1 every 6 seconds, and the conditional update resolves contention in about 1ms, so contention is effectively nil',
        'At 99 percent occupancy a scan-based assignment reads ~1000 rows to find 10 free spots; a free-list pop reads 1, which is the entire reason for the index',
      ],
    },
    delivery: {
      budget: { requirements: 6, estimates: 4, apiAndData: 9, architecture: 11, deepDive: 12, wrapUp: 3 },
      opening:
        'I will state the assignment invariant first and design the concurrency control around it, because everything else here is bookkeeping and this is the only place a real race exists.',
      traps: [
        'Finding a free spot with a SELECT and then updating it, which lets two simultaneous entries take the same spot. The claim must be a single conditional update.',
        'Scanning the spots table for the first free row on every entry. It is fine at 50 percent occupancy and quadratically worse at 99 percent, which is exactly when the lot is busiest.',
        'Blocking the exit barrier on payment success, so a declined card holds up a queue of cars and keeps a spot occupied for a fee smaller than the disruption.',
        'Modelling vehicle-to-spot fit as an exact match, when a motorcycle can use a car spot and the interesting logic is the preference order that avoids wasting large spots.',
      ],
      whenPushed: [
        {
          challenge: 'This is small enough for a single database. Why talk about concurrency at all?',
          answer:
            'Because the entry barrier at a busy lot has multiple lanes and an API, and the failure is not throughput, it is two cars being directed to the same spot within the same second. The conditional update costs nothing and removes the class entirely, which is a better answer than arguing the race is unlikely.',
        },
        {
          challenge: 'How would you handle reservations for spots in advance?',
          answer:
            'It changes the model from a free list into a time-interval availability problem, essentially the hotel booking design: materialize spot-time slots and claim them conditionally. I would not bolt it onto the free list, because a reserved-but-empty spot is neither free nor occupied and that third state is what breaks naive implementations.',
        },
        {
          challenge: 'What if the barrier hardware and the database disagree about whether a car entered?',
          answer:
            'Hardware wins, because the car is physically there. The system reconciles from sensor events rather than assuming its own state is correct, and an occupancy audit from per-spot sensors, where they exist, corrects drift. Without sensors, the drift is real and I would expose it as a manual reconciliation task rather than pretending the ledger is exact.',
        },
      ],
    },
    diagram: `flowchart TD
  V["Vehicle at entry"] --> ASG["Assignment service"]
  ASG -->|pop candidate for smallest fitting type| FL[("Redis free list per lot level type")]
  ASG -->|UPDATE spots where status = free| SP[("Spots table")]
  SP -->|zero rows affected: race lost| ASG
  SP -->|claimed| TK[("Ticket: entry time spot type")]
  X["Vehicle at exit"] --> FEE["Fee from entry time"]
  FEE --> PAY["Payment"]
  PAY -->|success or unpaid-exit| FREE["Free spot in same transaction"]
  FREE --> SP
  FREE --> FL
  SP -.->|crash mid-assignment| RECON["Reconciler frees orphan spots"]`,
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
    solution: {
      define:
        'Optimize for long-term retention, using a weighted combination of engagement signals as the trainable proxy, because click-through rate alone reliably produces clickbait. Cold start matters on both sides, so content features are mandatory and cannot be an afterthought. Latency budget is 100ms for scoring, which allows ranking a few hundred candidates, not a few million.',
      data:
        'Implicit feedback: impressions, clicks, dwell time and completions, with explicit negatives constructed from impressed-but-not-engaged rather than from random sampling, since random negatives make the task too easy and the model learns popularity. Position bias is corrected by training with inverse propensity weighting or by including position as a feature that is set to a constant at serving time. Splits are strictly temporal: train on before time T, evaluate after, because a random split leaks the future and inflates every metric.',
      architecture:
        'Two stages. Retrieval is a two-tower model producing user and item embeddings, with item vectors in an ANN index (HNSW) so retrieving 500 candidates from 10M items is a few milliseconds. Ranking is a gradient-boosted tree or a small DNN over roughly 200 features including cross features between user and item, scoring those 500 candidates. Cold-start items enter through a content-feature-only path in retrieval so they can be shown at all, with an exploration budget of about 5 percent of slots to gather feedback.',
      evaluate:
        'Report Recall@100 for retrieval and NDCG@10 for ranking on a temporal holdout, and be explicit that neither predicts business impact because both are measured against logged data produced by the current policy. The online test is the arbiter: a user-level A/B with retention over 28 days as the decision metric and engagement as a faster-moving proxy.',
      deploy:
        'Retrain the ranker daily and the retrieval towers weekly, with an automated evaluation gate comparing the candidate against the incumbent on the temporal holdout plus a shadow scoring run for feature-distribution sanity. If the model service is unavailable, fall back to a per-segment popularity list precomputed hourly, which is measurably worse and still coherent, rather than to an empty page.',
      wrapup:
        'I would want NDCG@10 up by at least 2 percent with no regression in candidate coverage before running an online test, because smaller offline moves have historically not survived contact with real traffic. Skipped for a first launch: multi-objective calibration across engagement types, real-time model updates within a session, and any causal correction beyond position bias.',
      numbers: [
        '10M items to 500 candidates via ANN = a 20,000x reduction, which is the entire justification for the two-stage split',
        'Ranking 500 candidates x 200 features at ~50ns per feature = about 5ms of model time, leaving 95ms of the budget for feature fetch and network',
        '10M users x 100 interactions = 1B training rows; at 1KB each that is a 1TB training set, so the pipeline is a distributed job and not a notebook',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to separate the metric we optimize from the metric we care about, because click-through rate is trainable and retention is what the business wants, and the gap between them is where recommender systems go wrong.',
      traps: [
        'Sampling negatives uniformly at random. Random items are trivially distinguishable and the model learns popularity instead of preference; the informative negatives are the items you showed and the user ignored.',
        'Splitting train and test randomly. Every interaction after the test point leaks into training, offline metrics look excellent, and the online test flatly contradicts them.',
        'Ignoring position bias, so the model learns that item slot one is good rather than that item one is good, and then it recommends whatever was previously in slot one.',
        'Designing a single-stage system that scores the full catalogue. At 10 million items and a 100ms budget that is arithmetic that does not work, and the interviewer is waiting for retrieval plus ranking.',
      ],
      whenPushed: [
        {
          challenge: 'Why not train one model end to end instead of two stages?',
          answer:
            'Because the two stages have different jobs and different cost budgets. Retrieval must be sublinear in catalogue size, which forces a dot-product structure with no user-item cross features; ranking can afford rich crosses over hundreds of candidates. A single model either cannot cross features or cannot run over the catalogue.',
        },
        {
          challenge: 'Your system will reinforce a feedback loop where popular items get more popular.',
          answer:
            'It will, because the model is trained on data its predecessor generated. Mitigations are an explicit exploration budget, inverse propensity weighting on the training data, and monitoring the Gini coefficient of impressions across the catalogue. None of them fully solve it, and I would report catalogue coverage as a first-class metric rather than hoping.',
        },
        {
          challenge: 'How do you recommend to a user on their first session?',
          answer:
            'Contextual, not personalized: device, locale, time of day, referral source, and popularity within that segment, plus fast in-session adaptation where the first two or three interactions update a short-term embedding. Pretending a collaborative model can serve a user with zero history is the most common thing candidates get wrong here.',
        },
      ],
    },
    diagram: `flowchart TD
  U["Request"] --> UT["User tower embedding"]
  UT -->|ANN top 500 of 10M| HNSW[("Item vector index")]
  CS[("Cold-start content features")] -->|content-only path| HNSW
  HNSW --> CAND["Candidate set: 500"]
  FS[("Feature store: user and item")] --> RANK["Ranker: ~200 features"]
  CAND --> RANK
  RANK -->|top 20 plus 5 pct exploration| RES["Response"]
  RES -->|impressions and engagement| LOG[("Interaction log")]
  LOG -->|impressed-not-engaged negatives| TRN["Daily ranker retrain"]
  TRN -->|temporal holdout gate| RANK
  LOG -->|weekly| TWR["Two-tower retrain"]
  TWR --> HNSW
  RANK -.->|service down| POP[("Popularity fallback")]`,
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
    solution: {
      define:
        'Optimize for session-level value, not per-item click: the objective blends predicted engagement with a diversity penalty and a downstream retention proxy. Echo chambers are addressed structurally by capping the fraction of a page that can come from any one topic cluster or creator. End-to-end budget for a page of 30 items is about 300ms.',
      data:
        'Candidate signals are content embeddings from a multimodal encoder, creator affinity from the user\'s follow and interaction graph, and recent session context. Implicit signals are weighted by cost to the user: a share is worth far more than a like, a like more than a long dwell, and a fast scroll past is an explicit negative. Video completion rate must be normalized by video length or the model simply learns to prefer short videos.',
      architecture:
        'Candidate generation is a union of several cheap sources, each contributing a few hundred items: an ANN lookup on the user embedding, a co-engagement source over accounts similar users engaged with, a fresh-content source, and an exploration source. Using several sources rather than one is what keeps the pool diverse before ranking ever runs. Ranking is a multi-task model predicting probability of like, share, save and long dwell in one pass with shared layers, combined by tuned weights. A final pass applies diversity constraints greedily, enforcing per-topic and per-creator caps on the 30 chosen slots.',
      evaluate:
        'The best offline predictor of session impact is not per-item AUC but a session-level simulation: replay a user\'s real session and score whether the model ranks the items they actually engaged with higher, plus a diversity metric like topic entropy per page. To isolate a ranking change from a content-mix change, hold the candidate sources fixed and vary only the ranker, since otherwise the two effects are confounded and the experiment answers nothing.',
      deploy:
        'New rankers roll out at 1 percent with automatic rollback on a guardrail of session length or report rate, then 5, 20, 100 over about a week, since novelty effects distort the first two days. If a candidate source degrades, the union structure degrades gracefully: the other sources fill the pool, and a per-source health metric catches the silent case where one source returns nothing.',
      wrapup:
        'The diversity mechanism is a hard per-topic and per-creator cap at final ranking, which will cost measurable short-term engagement because the highest-scoring page is usually the least diverse one. In the first week after a ranking change I would watch report and hide rate most closely, because engagement typically goes up before the quality problems show up.',
      numbers: [
        '1B users x 20 Explore sessions/month = 20B sessions; at 30 items each that is 600B ranked items/month, roughly 230K items ranked per second',
        'Candidate pool of 1000 from 5 sources, ranked to 30 = a 33x reduction at ranking and a 10-million-to-1000 reduction at retrieval',
        'Multi-task model at 1000 candidates x 4 heads within a 300ms budget means about 10ms of GPU per request, which is why ranking runs on batched accelerators and not CPU',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to define the objective as session-level value with an explicit diversity constraint, because a pure engagement objective on Explore converges to a narrow content type and that is the known failure mode of this product.',
      traps: [
        'Optimizing a single engagement head. Explore is the surface where single-objective optimization visibly collapses into one content type, and the multi-task plus constraint structure is what the interviewer wants to hear.',
        'Using raw video completion rate as a label without normalizing for duration, which teaches the model that a five-second clip is better content than a two-minute one.',
        'Running one candidate generator. Diversity is much cheaper to obtain by unioning several sources than by trying to force it out of a ranker trained to maximize engagement.',
        'Testing a ranking change while also changing the candidate sources, so the experiment cannot attribute the effect to either.',
      ],
      whenPushed: [
        {
          challenge: 'Your diversity constraint costs engagement. How do you justify it?',
          answer:
            'I justify it on the long-horizon metric, not the daily one. In a holdback with a longer window, the constrained variant should show equal or better retention and lower hide and report rates. If it does not after a proper long-run holdout, then the constraint is not paying for itself and I should weaken it rather than defend it on principle.',
        },
        {
          challenge: 'How do you handle a brand-new post with no engagement history?',
          answer:
            'It enters through the fresh-content candidate source and is scored primarily on content embedding similarity and creator priors. It also gets an exploration slot budget, roughly 5 percent of impressions, because without deliberately spending impressions on unproven content the system can only ever recommend what it already knows.',
        },
        {
          challenge: 'Multi-task models let one head dominate the others.',
          answer:
            'They do, especially when label frequencies differ by orders of magnitude, and shares are far rarer than likes. I would use per-task loss normalization and tune combination weights on the session-level objective rather than on the individual heads, and I would monitor per-head calibration because a miscalibrated rare head is what silently breaks the blend.',
        },
      ],
    },
    diagram: `flowchart TD
  U["User opens Explore"] --> SRC1["Source: user embedding ANN"]
  U --> SRC2["Source: co-engagement"]
  U --> SRC3["Source: fresh content"]
  U --> SRC4["Source: exploration"]
  SRC1 --> POOL["Union: ~1000 candidates"]
  SRC2 --> POOL
  SRC3 --> POOL
  SRC4 --> POOL
  POOL --> MT["Multi-task ranker: like share save dwell"]
  MT -->|tuned blend weights| DIV["Greedy diversity pass: caps per topic and creator"]
  DIV -->|30 slots| U
  U -->|weighted implicit signals| LOG[("Engagement log")]
  LOG --> MT
  EMB[("Multimodal content embeddings")] --> SRC1
  SRC3 -.->|source health check| POOL`,
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
    solution: {
      define:
        'Optimize for the probability the member starts and finishes a title, not raw plays, because a start followed by an abandon at four minutes is a worse outcome than no start. New accounts get a survey-plus-popularity cold start; tenured accounts get full personalization. Homepage budget is about 400ms for all rows together, so this row gets tens of milliseconds and must be largely precomputed.',
      data:
        'Signals are play history with completion fraction, time of day and device, and title metadata including genre, cast and a learned content embedding. The hard data problem here is that a household profile mixes several people\'s tastes, so I would model latent intent within a profile by clustering a session\'s context (device, time, prior title) rather than assuming one taste vector per profile. Negatives are titles shown on the homepage and not played, which are far more informative than unshown titles.',
      architecture:
        'Precompute a per-member candidate set of a few hundred titles nightly using a matrix-factorization or two-tower retrieval over the catalogue, then rank at request time with a lightweight model that adds context features such as device and time of day. The split is deliberate: the expensive personalization is precomputed and only the cheap contextual re-rank is live, which is what fits the homepage budget. Row assembly then applies a constraint that a title appears in at most one row on the page.',
      evaluate:
        'Offline, report take-rate at k, the fraction of recommended titles the member subsequently plays, on a temporal holdout, and be clear that it correlates with but underestimates watch-time lift because it ignores the substitution effect between rows. The A/B must randomize at the member level and hold the other rows constant, or a lift in this row is indistinguishable from cannibalizing the row below it.',
      deploy:
        'Within a session, refresh the contextual re-rank after each meaningful signal, such as an abandoned play, without recomputing the candidate set, so adaptation is cheap. If personalization is degraded, fall back to a per-country trending row with the same visual treatment; the member sees a plausible row rather than an empty page or a spinner.',
      wrapup:
        'Nightly precompute plus live contextual re-rank is the right trade at this latency budget: it gives most of the personalization benefit while spending only milliseconds per request, and the cost is that a title added today is not in the candidate set until tonight. If watch-time lift underperformed the offline metric, the first thing I would check is substitution across rows, because the row got better and the page did not.',
      numbers: [
        '250M members x a 500-title candidate set x 50 bytes = 6TB of precomputed candidates, refreshed nightly, which is a batch job sized in the thousands of core-hours',
        'Homepage at 400ms across 10 rows = 40ms per row, of which the contextual re-rank over 500 candidates must fit in about 10ms',
        'A 1 percent lift in take-rate on a row shown to 250M members a day is roughly 2.5M additional plays a day, which is why sub-percent effects are worth testing for',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to define success as starts that turn into completions rather than plays, because optimizing for the click on a thumbnail is how you end up with a row of misleading artwork.',
      traps: [
        'Ignoring that a profile is often several people. A single taste vector per profile fits a household badly, and session context is what disambiguates it.',
        'Scoring the full catalogue at request time. The homepage budget is tens of milliseconds per row, which only works if the expensive part already happened overnight.',
        'Measuring the row in isolation. A row that wins by taking plays from the row beneath it has produced no additional watch time, and only a page-level metric reveals that.',
        'Training on plays without completion. A play that is abandoned in four minutes is a negative outcome dressed as a positive label.',
      ],
      whenPushed: [
        {
          challenge: 'Nightly precompute means you cannot react to what someone watched an hour ago.',
          answer:
            'The candidate set cannot, but the re-rank can, and in practice the candidate set of 500 titles almost always still contains the right answer after a single session. The case it genuinely misses is a sharp taste change, and I would handle that with an incremental candidate refresh triggered by a strong signal rather than by moving the whole retrieval online.',
        },
        {
          challenge: 'How do you evaluate artwork selection, which is part of why people click?',
          answer:
            'As a separate contextual bandit per title, choosing among artwork variants, because it is a different decision from which title to show and it converges much faster. Folding it into the ranker confuses two problems, and the interaction, where a title only wins with the right image, is real but second-order.',
        },
        {
          challenge: 'Your cold-start survey adds friction at signup.',
          answer:
            'It does, and there is a real conversion cost to it. The alternative is a few sessions of poor recommendations, which has its own retention cost. I would A/B the survey itself, and if it does not pay for its friction I would drop it in favour of contextual popularity plus fast in-session adaptation.',
        },
      ],
    },
    diagram: `flowchart TD
  HIST[("Play history with completion")] --> BATCH["Nightly retrieval: two-tower over catalogue"]
  BATCH --> CAND[("Per-member candidate set: ~500 titles")]
  REQ["Homepage request"] --> RR["Contextual re-rank"]
  CAND --> RR
  CTX["Device, time of day, session intent"] --> RR
  RR -->|~10ms budget| ROW["Top Picks row"]
  ROW --> PAGE["Page assembly: title appears in one row"]
  PAGE --> M["Member"]
  M -->|abandoned play signal| RR
  ART["Artwork bandit per title"] --> ROW
  RR -.->|degraded| TREND[("Country trending fallback")]`,
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
    solution: {
      define:
        'Rank on expected revenue per impression, which is purchase probability times margin, constrained by a relevance floor so nothing irrelevant can outbid a good match. The blend is not a free parameter: the relevance floor is set by human judgement data and the revenue term optimizes within it. Narrow queries need recall expansion; broad queries need precision at the top. Ranking gets 50ms inside a 300ms search budget.',
      data:
        'Labels are a graded ladder: purchase over add-to-cart over click over impression, with purchases weighted an order of magnitude above clicks because they are the outcome and clicks are the proxy. Position bias is corrected by estimating propensity from a small randomized-position traffic slice and training with inverse propensity weights, which is more honest than modelling position as a feature you fake at serving time. Seasonal and price-change effects mean training data older than about 90 days actively hurts.',
      architecture:
        'Retrieval is hybrid: a BM25 pass over the inverted index for lexical match plus an embedding ANN pass for semantic match, unioned to a few thousand candidates, because pure dense retrieval fails on exact model numbers and pure lexical fails on paraphrase. Ranking is a gradient-boosted tree over text-match features, price and price-percentile within the result set, review count and rating, delivery speed, and personalization features. Sponsored placement runs a separate auction and is inserted into fixed labelled slots rather than blended into the organic scores, which is the only way to keep relevance trustworthy.',
      evaluate:
        'Track NDCG@10 against human relevance judgements and offline purchase-weighted NDCG separately, because they disagree and the disagreement is the actual design tension. Neither measures revenue, since revenue depends on substitution and inventory. The online test must report relevance guardrails, such as query abandonment and reformulation rate, alongside revenue, or you will ship a change that makes money this week and trains users to distrust search.',
      deploy:
        'Ranking updates ramp over a week with per-seller impression-share dashboards published, because a step change in placement is a livelihood change for sellers and the support cost of a surprise is real. If the ranker times out, fall back to the BM25 ordering with a popularity tiebreak, which is a noticeably worse but defensible result set.',
      wrapup:
        'The blend is expected revenue maximized subject to a relevance floor, and the risk is that the floor is set by judgement data that ages: if the floor is too low the search results slowly become an ad surface. If seller complaints spiked after a launch, the first thing I would examine is impression-share change by seller size, since ranking changes that look neutral in aggregate frequently move share systematically from small sellers to large ones.',
      numbers: [
        '100M queries/day = 1.2K QPS average, 5K at peak; retrieval to 2000 candidates and ranking to 50 is the funnel per query',
        '5K QPS x 2000 candidates = 10M candidate scorings/sec, which is why the ranker is a tree model on CPU rather than a deep network',
        'A 1 percent conversion lift on 100M queries/day at a $50 average order value is enormous, which is exactly why the relevance guardrail has to be defined before the experiment, not after',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to establish that revenue is optimized subject to a relevance floor rather than blended freely with it, because a blend weight is the mechanism by which search results slowly turn into advertising.',
      traps: [
        'Training on clicks without correcting position bias. The top result gets clicks because it is on top, and a model trained naively learns to reproduce whatever ranking produced the logs.',
        'Blending sponsored results into the organic score. It maximizes short-term revenue and it destroys the relevance signal, and separate labelled slots is the answer that survives scrutiny.',
        'Using dense retrieval alone. Someone searching for a specific part number needs exact lexical match, and embeddings will confidently return a similar-looking wrong part.',
        'Reporting only revenue in the experiment. Relevance guardrails such as reformulation and abandonment are the metrics that catch a change that monetizes user trust.',
      ],
      whenPushed: [
        {
          challenge: 'Why not learn the relevance-revenue trade-off end to end?',
          answer:
            'Because there is no label for the long-term cost of an irrelevant result. An end-to-end objective will happily trade relevance for revenue at a rate no one chose, and the damage shows up months later as reduced search usage. A hard floor makes the trade explicit and auditable, and I would rather argue about where the floor sits than not know it exists.',
        },
        {
          challenge: 'Your 90-day training window discards useful data.',
          answer:
            'It discards data whose price and inventory context no longer holds. I would test the window rather than assert it, training on 90, 180 and 365 days and comparing on a recent holdout; my expectation is that recency wins for anything price-sensitive and that stable categories tolerate more history.',
        },
        {
          challenge: 'How do you rank a brand-new product with no engagement data?',
          answer:
            'On content and seller features only: title and attribute match, category priors, seller history, and price percentile within the result set. It also needs an exploration allocation, because a product that is never shown can never accumulate the signal that would let it be ranked properly, and that cold-start trap is a real marketplace fairness problem.',
        },
      ],
    },
    diagram: `flowchart TD
  Q["Query"] --> BM["BM25 over inverted index"]
  Q --> DEN["Embedding ANN"]
  BM --> UN["Union: ~2000 candidates"]
  DEN --> UN
  UN --> GBT["GBDT ranker: text match, price pct, reviews, delivery"]
  FS[("Feature store plus personalization")] --> GBT
  GBT -->|expected revenue subject to relevance floor| ORG["Organic top 50"]
  AUC["Sponsored auction"] -->|fixed labelled slots| SERP["Result page"]
  ORG --> SERP
  SERP -->|clicks, cart, purchase| LOG[("Interaction log")]
  RAND["Randomized position slice"] -->|propensities| IPW["IPW training"]
  LOG --> IPW
  IPW -->|90 day window| GBT
  GBT -.->|timeout| BM`,
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
    solution: {
      define:
        'Total request budget is 100ms, of which feature retrieval gets 20ms, which decides everything: at that budget I can afford one or two batched key-value round trips and no computation over raw events. Real-time features are those whose value changes within the session; everything else, including all user-level aggregates over days or weeks, is batch. The guarantee that matters is that training and serving compute a feature from the same definition and the same code.',
      data:
        'One feature registry defines each feature once, with a transformation expressed in a single language that both the batch job and the streaming job execute, which is the only reliable way to prevent skew. The online store is Redis or DynamoDB holding the current value per entity keyed by (entity_type, entity_id, feature_group), fetched as one multi-get per entity rather than per feature. The offline store is a partitioned table in the warehouse holding the same values with event-time timestamps for point-in-time correct joins.',
      architecture:
        'Batch features are computed by a scheduled job and bulk-loaded into the online store. Streaming features are maintained by a Flink job consuming the event log and writing incremental aggregates, so a rolling count is updated per event rather than recomputed per request. At serving time the request fetches one feature vector per entity in parallel, joins them by position into the model\'s input vector, and only request-context features such as time of day are computed inline. New features are added by registering them and letting the serving path read the registry\'s schema version, so no redeploy is needed for a feature that is already materialized.',
      evaluate:
        'Detect train-serve skew by logging the exact feature vector used at serving time and comparing it against the vector the training pipeline reconstructs for that same request and timestamp; a nonzero mismatch rate on any feature is a bug, not a tolerance. Watch p99 feature-fetch latency as a function of the number of feature groups per request, because latency grows with round trips rather than with feature count, which is why grouping matters more than pruning.',
      deploy:
        'A new feature is backfilled into the offline store first using point-in-time-correct historical event replay, validated against the streaming implementation on a sample, and only then written to the online store; live serving does not read it until a model that requires it is deployed. If a feature source is unavailable, serve the registered default and set an is-missing indicator feature, because a model trained with an explicit missingness flag degrades predictably while one fed a silent zero does not.',
      wrapup:
        'The number that forces a feature from real-time to batch is its marginal p99 contribution: any feature adding more than about 5ms to the fetch has to justify itself against the model lift it provides. The assumption I would test first is that batch freshness of a few hours is genuinely acceptable for the user-level aggregates, since that is the assumption most likely to be quietly wrong for a new or fast-changing user.',
      numbers: [
        '20ms feature budget / 5ms per round trip = 4 sequential round trips max, so features must be grouped into at most 4 fetches regardless of how many there are',
        '10K QPS x 3 entities x 1 multi-get = 30K online store ops/sec, which one Redis cluster handles but a per-feature fetch of 200 features would turn into 6M ops/sec',
        'A streaming 1-minute rolling count updated incrementally is O(1) per event; recomputing it from a 1-minute event scan at 10K QPS would be 600K event reads per second',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to turn the latency budget into a round-trip budget in the first minute, because twenty milliseconds means about four network hops and that constraint decides the entire architecture.',
      traps: [
        'Fetching features one at a time. Two hundred features at a millisecond each is two hundred milliseconds; grouping them into a handful of multi-gets is the difference between working and not.',
        'Implementing a feature twice, once in Spark for training and once in Java for serving. They will diverge, silently, and the model degrades without any alert firing.',
        'Joining training labels to features without point-in-time correctness, so the training set contains feature values computed after the label event and the model looks brilliant offline.',
        'Filling a missing feature with zero. Zero is a real value with a real meaning to the model, and the honest signal is an explicit missingness indicator.',
      ],
      whenPushed: [
        {
          challenge: 'Why not compute features on the fly from the event log?',
          answer:
            'Because a rolling aggregate over the last hour would mean scanning that hour\'s events per request, and at ten thousand requests a second that is millions of event reads per second for values that are identical across requests. Precomputing incrementally in a stream turns per-request work into per-event work, which is orders of magnitude less.',
        },
        {
          challenge: 'Your streaming job and your batch job will still drift.',
          answer:
            'They can, which is why the mismatch rate is a monitored metric rather than an assumption, and why the batch job periodically overwrites the streaming values as a correction. The residual issue is late-arriving events, where the batch answer is right and the streaming answer was right given what it knew, and I would treat the batch value as authoritative on the offline side.',
        },
        {
          challenge: 'What happens when the model needs a feature at ten times the current QPS?',
          answer:
            'The online store is the first thing to saturate, and the answer is a per-request local cache for entity-level features that barely change plus read replicas of the online store. Beyond that I would push the highest-volume aggregates into the model as an embedding refreshed offline, trading freshness for eliminating the fetch entirely.',
        },
      ],
    },
    diagram: `flowchart TD
  REG[("Feature registry: one definition")] -->|same transform| BJ["Batch job"]
  REG -->|same transform| SJ["Flink streaming job"]
  EV["Event log"] --> SJ
  DW[("Warehouse: point-in-time correct")] --> BJ
  BJ -->|bulk load| ON[("Online store: value per entity")]
  SJ -->|incremental aggregates| ON
  RQ["Inference request"] -->|max 4 parallel multi-gets| ON
  ON --> VEC["Assemble feature vector"]
  CTX["Request context features"] --> VEC
  VEC --> MDL["Model"]
  VEC -->|log served vector| SKEW["Skew check vs offline reconstruction"]
  BJ --> DW
  ON -.->|missing| DEF["Default plus is-missing flag"]`,
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
    solution: {
      define:
        'Optimize for a blend of dwell time and return visits rather than clicks, since headline-driven clicks and news quality are inversely correlated. Breaking news must be rankable within 2 minutes of publication, which forces a streaming path for article features. Diversity is enforced as a source and topic cap per page rather than hoped for from the ranker.',
      data:
        'User features are topic affinity vectors and reading history decayed over 30 days, computed in batch. Article features split by freshness need: static ones such as topic, source quality score and text embedding are computed once at ingest, while dynamic ones such as click-through rate in the last 15 minutes and early dwell velocity are streaming aggregates. The subtle problem is that a two-minute-old article has almost no engagement signal, so the model must be able to rank on content and source features alone or new articles never surface.',
      architecture:
        'A lambda-shaped pipeline with a shared definition: Flink maintains 5, 15 and 60-minute windowed engagement counters per article; a nightly batch job computes user affinities and source quality. Ranking is a two-stage funnel where candidates come from topic-affinity retrieval plus a fresh-articles pool plus an editorially curated pool, and the ranker scores with an explicit recency prior so a fresh article with no signal is not automatically outranked by a six-hour-old article with plenty. Final assembly applies caps: at most 2 articles per source and at most 3 per topic in the top 10.',
      evaluate:
        'The diversity mechanism is evaluated by topic entropy of what users actually read, not of what was shown, because showing diverse content that nobody clicks is not broadening anything. For a freshness-versus-relevance change, the A/B needs a long enough window to capture return visits, since freshness wins on same-session dwell and can lose on retention.',
      deploy:
        'A breaking-news surge multiplies both traffic and feature-computation load on the same few articles, which is a hot-key problem: cache the dynamic features of the top few hundred articles in-process with a 10-second TTL so a spike does not translate into a proportional load on the streaming store. If the streaming pipeline falls behind, fall back to the last-known dynamic features with an explicit staleness flag as a model input, so the ranker weights them down rather than trusting stale counters.',
      wrapup:
        'Freshness comes from a streaming engagement layer plus an explicit recency prior in the ranker, and it costs a second computation path that must be kept consistent with the batch one. To catch a filter bubble regression I would monitor the per-user topic entropy of consumed articles over a rolling week, alarming on a distribution-wide narrowing rather than on any individual user.',
      numbers: [
        '100K new articles/day with a 48-hour relevance window = about 200K live candidates at any time, small enough that retrieval is cheap and ranking quality is where the effort goes',
        '50M DAU x 5 feed loads x 20 articles = 5B rankings/day = 58K/sec average, 200K/sec at the morning peak',
        'A 2-minute publish-to-rankable target against a 15-minute engagement window means new articles are ranked on content features for their first quarter hour, which is most of a breaking story\'s value',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'The constraint that shapes this design is that a breaking article must be rankable two minutes after publication, when it has essentially no engagement signal, so the ranker has to work well on content features alone.',
      traps: [
        'Ranking on engagement features only, which structurally buries every new article and makes the feed a slow-moving popularity list precisely when news is breaking.',
        'Using raw click-through rate on fresh articles. With a hundred impressions the estimate is mostly noise, and the fix is smoothing toward a source-and-topic prior rather than trusting the raw ratio.',
        'Treating diversity as something the model learns. An engagement-trained ranker will not produce it, and a post-ranking cap is the honest mechanism.',
        'Forgetting that a breaking story is a hot key: the same few articles are scored for every user at once, and their dynamic features become a contention point.',
      ],
      whenPushed: [
        {
          challenge: 'Your recency prior is a hand-tuned constant. That is not machine learning.',
          answer:
            'It is a hand-tuned prior and I would defend it as such, because the alternative is learning a decay from data generated by a policy that already had a decay. I would tune it by A/B rather than by offline fit, and I would let it differ by topic, since a sports result decays in hours and an analysis piece does not.',
        },
        {
          challenge: 'How do you keep from amplifying misinformation that is engaging?',
          answer:
            'Source quality has to be an input with real weight, and it cannot be derived from engagement or it becomes circular. That means an external signal, editorial or third-party ratings, applied as a multiplier or a hard filter. It is a policy decision embedded in a ranking system, and I would want it explicit and reviewable rather than buried in a feature.',
        },
        {
          challenge: 'Your source and topic caps will hurt engagement metrics.',
          answer:
            'Short-term, probably yes, and I would expect that in the A/B. The justification has to be a longer-horizon holdback showing retention or return-visit parity or better. If a several-week holdback shows the caps cost retention too, then I have to either weaken them or argue for them on grounds other than metrics, and I would say which.',
        },
      ],
    },
    diagram: `flowchart TD
  PUB["Article published"] --> ING["Ingest: topic, source score, text embedding"]
  ING --> AIDX[("Live article pool: 48h window")]
  ENG["Impressions and dwell"] --> FL["Flink: 5, 15, 60 min counters"]
  FL --> DYN[("Dynamic article features")]
  UB["Nightly batch"] --> UAF[("User topic affinity")]
  REQ["Feed request"] --> CAND["Candidates: affinity plus fresh plus curated"]
  AIDX --> CAND
  CAND --> RANK["Ranker with explicit recency prior"]
  UAF --> RANK
  DYN -->|10s in-process cache for hot articles| RANK
  RANK --> CAP["Caps: 2 per source, 3 per topic in top 10"]
  CAP --> FEED["Feed"]
  DYN -.->|pipeline lag| STALE["Staleness flag as model input"]
  STALE --> RANK`,
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
    solution: {
      define:
        'The decision sits inline on the payment authorization path with a 50ms total budget, of which features get 15ms. Velocity features over the last 1, 10 and 60 minutes must reflect events from seconds ago; account history and device reputation can be hours stale. The cost asymmetry is roughly 100 to 1 against false positives in dollar terms but reversed in trust terms, so the threshold is chosen on a cost curve rather than on F1.',
      data:
        'Velocity features are incremental windowed aggregates keyed by card, account, device fingerprint and merchant, maintained in a stream processor and written to an online key-value store as a compact struct per key. Sliding windows are implemented as a ring of small time buckets, for instance twelve 5-second buckets for a minute, so the window slides by dropping a bucket rather than by rescanning events. The same window definitions are registered once and executed by both the streaming job and the backfill job.',
      architecture:
        'Kafka carries authorization events; Flink maintains keyed windowed state with event-time semantics and a bounded lateness allowance, emitting updated aggregates to the online store on every event. At scoring time the service issues parallel multi-gets for the four entity keys, assembles the vector, and scores. Because a fraud ring\'s whole point is bursting, the design must handle the same card key being updated hundreds of times a second, which is why aggregation happens in the stream\'s keyed state and not by read-modify-write against the store.',
      evaluate:
        'Test out-of-order handling by replaying a stream with deliberately shuffled timestamps and asserting the windowed counts match the same events replayed in order, within the declared lateness bound. Under a volume spike, watch feature staleness as the distribution of event-time-to-store-visible lag, since the failure mode is not errors but silently stale velocity counters that make an attack invisible.',
      deploy:
        'If the online feature store is unavailable, fail closed for high-risk segments and fail open for low-risk ones, decided by a static risk tier from the request itself, since failing open globally is an open invitation and failing closed globally means declining every legitimate transaction during an infrastructure blip. New features backfill from the retained event log through the same window code, so a backfilled value is bit-identical to what streaming would have produced.',
      wrapup:
        'The fail-open-versus-fail-closed split by risk tier is the honest answer because a single global choice is wrong in one direction or the other, and tiering bounds the loss on both sides. The next feature I would add is cross-entity graph velocity, such as how many distinct cards have touched this device in the last hour, because single-entity velocity misses a ring that spreads across many cards and one device.',
      numbers: [
        '10K transactions/sec x 4 entity keys = 40K keyed state updates/sec in the stream, and 40K multi-gets/sec at scoring time',
        '1-minute window as 12 buckets of 5 seconds x 4 entity types x 50M active keys x 32 bytes = about 76GB of keyed state, which sets the Flink cluster memory',
        '15ms feature budget with 4 parallel multi-gets at 2ms each = 2ms of wall clock plus assembly, leaving headroom for a retry on one slow key',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to fix the latency budget and the cost asymmetry first, because fifteen milliseconds for features rules out any computation over raw events, and the asymmetry is what sets the decision threshold later.',
      traps: [
        'Computing velocity by querying the last minute of transactions per request. At ten thousand transactions a second that is a scan per decision, and it is the single most common wrong answer to this question.',
        'Using processing time instead of event time for windows. Under a backlog, processing-time windows silently compress and your one-minute velocity counts several minutes of traffic.',
        'Implementing the window as a read-modify-write against Redis. Concurrent updates to the same hot card key lose increments, which is exactly the key an attacker is hammering.',
        'Choosing a single global fail-open or fail-closed policy, when the right answer is tiered and the interviewer is asking precisely because neither extreme is defensible.',
      ],
      whenPushed: [
        {
          challenge: 'What if an event arrives thirty seconds late?',
          answer:
            'Within the declared lateness bound, the window is updated and a corrected aggregate is emitted; past it, the event is routed to a side stream and counted, but not folded into the live feature. That means the live feature can be slightly wrong for late events, which I would rather have than an unbounded window that never finalizes.',
        },
        {
          challenge: 'Your model is trained on backfilled features but serves on streaming ones. How do you know they match?',
          answer:
            'Because the backfill runs the same window operator over the retained event log, and because I sample live scoring vectors and reconstruct them offline for the same timestamp, alarming on any mismatch. This is the single check I would insist on before trusting a fraud model in production, since skew here shows up as quiet degradation rather than as errors.',
        },
        {
          challenge: 'Fraud patterns change weekly. How does a feature pipeline keep up?',
          answer:
            'The pipeline has to make adding a feature cheap: register a definition, backfill from the log, and let the next model retrain pick it up, without a serving redeploy. The bottleneck in practice is not compute, it is that new features need historical values to train on, which is why event log retention of at least ninety days is part of the design rather than an operational detail.',
        },
      ],
    },
    diagram: `flowchart TD
  TX["Authorization event"] --> K["Kafka"]
  K --> FLK["Flink: event-time keyed windows"]
  FLK -->|card key| W1["Ring of 5s buckets: 1, 10, 60 min"]
  FLK -->|account, device, merchant keys| W1
  W1 --> ON[("Online store: struct per entity key")]
  TX --> SC["Scoring service: 50ms budget"]
  SC -->|4 parallel multi-gets, 15ms| ON
  SC --> MDL["Fraud model"]
  MDL -->|threshold on dollar cost curve| DEC["Approve or decline"]
  ON -.->|unavailable: tiered| FO["High risk fails closed, low risk fails open"]
  K --> RET[("Retained event log 90 days")]
  RET -->|same window operator| BF["Backfill for new features"]
  BF --> OFF[("Offline store")]`,
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
    solution: {
      define:
        'Target 500ms time to first token and streaming thereafter at roughly 30 tokens per second per user, since perceived latency is dominated by TTFT and not by total completion time. Peak concurrency of 10,000 in-flight generations, which mandates continuous batching rather than static batches. A cheaper model can serve a large fraction of traffic, so routing is part of the design rather than an optimization.',
      data:
        'Each request carries model tier, max output tokens, priority and a tenant id. Expected output length matters because it determines how long a sequence occupies a batch slot, and a request that will emit 2,000 tokens is a fundamentally different scheduling object from one emitting 50. Usage is metered by prompt and completion tokens recorded per request at completion, and streamed to a billing topic rather than written synchronously.',
      architecture:
        'vLLM-style serving with continuous batching and PagedAttention: sequences join and leave the batch every decode step, and KV cache is allocated in fixed pages so memory is not fragmented by variable-length generations. Prefill and decode are scheduled with awareness that prefill is compute-bound and decode is memory-bandwidth-bound, so mixing them carelessly makes both worse; chunked prefill limits how much a long prompt delays in-flight decodes. Routing is a small classifier plus heuristics on prompt length and task type, sending easy traffic to an 8B model and the rest to the 70B, with a confidence check that escalates on low-confidence outputs.',
      evaluate:
        'Find the throughput-latency knee by ramping concurrency and plotting tokens per second per GPU against p95 TTFT; the knee is where TTFT rises sharply while throughput flattens, and that is the operating point. To check routing is not degrading quality, mirror a 1 percent sample of routed-to-small requests through the large model and score both with a judge, since routing damage is invisible in aggregate latency and cost dashboards.',
      deploy:
        'New model versions go out with shadow traffic first, comparing tokens per second, TTFT and judge-scored quality against the incumbent, then a percentage ramp. When GPU capacity is exhausted, queue by priority with an admission deadline and reject with a clear retryable error rather than accepting requests that will time out anyway, because a queue that grows past its service rate produces uniformly bad latency for everyone.',
      wrapup:
        'Continuous batching plus routing trades a small amount of per-request latency, since your sequence shares GPU steps with others, for several times the throughput per GPU, and that trade is what makes the economics work at all. At 10x concurrency the binding constraint is KV cache memory rather than compute, so the first changes are quantized KV cache and grouped-query attention to shrink cache per token.',
      numbers: [
        '70B model in BF16 = 140GB of weights, so it does not fit one 80GB GPU: 2-way tensor parallel minimum, leaving roughly 20GB for KV cache',
        'KV cache per token for a 70B model with GQA is about 0.3MB; a 4K-token context is 1.2GB per sequence, so 20GB of cache holds only about 16 concurrent sequences',
        '10K concurrent users / 16 sequences per GPU pair = 625 GPU pairs, which is why KV cache size, not FLOPs, is the number that sets the fleet cost',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to state up front that this system is memory-bound rather than compute-bound during decoding, because that single fact determines the batching strategy, the fleet size and the cost model.',
      traps: [
        'Sizing the fleet on model FLOPs. Decode is memory-bandwidth-bound and the real constraint is KV cache capacity, and a candidate who sizes on compute will be off by an order of magnitude.',
        'Proposing static batching. Requests finish at wildly different times, so a static batch is idle waiting for its longest sequence, and continuous batching is the expected answer.',
        'Ignoring the prefill-decode interaction. A single 32K-token prompt prefilling can stall every in-flight decode and spike TTFT for everyone, which is what chunked prefill exists to prevent.',
        'Routing to a cheaper model with no quality measurement, so cost savings show up on a dashboard and quality damage shows up in churn.',
      ],
      whenPushed: [
        {
          challenge: 'Continuous batching makes latency unpredictable per request.',
          answer:
            'It does, since your decode speed depends on how many others share the batch. I would set a floor by capping batch size below the memory limit and reserving capacity for a low-latency tier. The honest trade is that maximum throughput and predictable per-request latency are opposed, and you have to pick a point on that curve deliberately.',
        },
        {
          challenge: 'Why not just cache responses?',
          answer:
            'Exact-match caching helps a little on a long-tail query mix, maybe a few percent. Semantic caching with an embedding lookup catches more but risks serving an answer to a similar-but-different question, which is a correctness bug that a cache hit rate metric will never show. I would use exact caching freely and semantic caching only with a high similarity threshold and a quality audit.',
        },
        {
          challenge: 'How would speculative decoding change your numbers?',
          answer:
            'It can roughly double decode throughput when the draft model\'s acceptance rate is high, at the cost of extra memory for the draft model and worse behaviour when acceptance is low. It helps latency for single requests more than throughput under heavy batching, because a full batch already saturates memory bandwidth, so I would deploy it on the low-latency tier rather than everywhere.',
        },
      ],
    },
    diagram: `flowchart TD
  R["Request"] --> RT["Router: prompt length plus task classifier"]
  RT -->|easy traffic| S8["8B model replicas"]
  RT -->|hard traffic| S70["70B: 2-way tensor parallel"]
  S8 -.->|low confidence escalate| S70
  S70 --> SCH["Continuous batching scheduler"]
  S8 --> SCH
  SCH -->|chunked prefill| PRE["Prefill: compute bound"]
  SCH -->|per decode step| DEC["Decode: memory bandwidth bound"]
  DEC --> KV[("Paged KV cache")]
  DEC -->|SSE token stream| R
  SCH -.->|capacity exhausted| QU["Priority queue then reject"]
  DEC -->|token counts| BILL["Usage topic"]`,
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
    solution: {
      define:
        'Tenants are internal product teams plus external API customers, and they need hard quotas rather than best-effort fairness, because one team\'s load test should not be another team\'s incident. Serve several model families concurrently with version hot-swap. Two SLA tiers: interactive at 500ms TTFT and batch at best-effort within an hour, and the batch tier is what makes utilization economics work.',
      data:
        'Per-tenant token and request counters are maintained in a sharded counter store with a local pre-check at the router, so quota enforcement does not add a round trip per request. GPU memory is partitioned explicitly: model weights are shared per replica, while KV cache pages are allocated from a common pool with a per-tenant reservation floor and a burst ceiling, so a tenant is guaranteed a minimum and cannot consume everything.',
      architecture:
        'A router holds a live map of model version to replica set, and places a request on a replica that already has the right weights loaded, since loading a 140GB model takes minutes and cannot be on the request path. Within a replica, a fair-share scheduler admits sequences to the continuous batch in proportion to tenant weight, and a tenant over its burst ceiling is queued rather than admitted, which is where noisy-neighbour isolation is actually enforced. Multiple small models can share a GPU by co-residency with separate memory arenas; large models get dedicated replicas.',
      evaluate:
        'Load-test the noisy-neighbour case explicitly: tenant A at ten times its normal rate while tenant B runs a steady interactive load, and assert B\'s p95 TTFT moves by less than a defined tolerance. Verify quota accuracy under concurrency by comparing counted tokens against the sum of per-request usage records, since a local pre-check design will drift and the acceptable drift must be quantified rather than assumed to be zero.',
      deploy:
        'A new model version is rolled out replica by replica: bring up new replicas with the new weights, shift the router\'s version map for a subset of tenants, and drain the old replicas after in-flight generations finish, since a generation cannot be migrated mid-stream. When capacity is exhausted, the interactive tier preempts the batch tier, and beyond that requests are rejected with a retry-after, because degrading a premium tenant to a smaller model without telling them is a quality change disguised as a capacity decision.',
      wrapup:
        'The number that says isolation is costing too much is aggregate GPU utilization: reservation floors mean idle capacity a tenant is entitled to but not using, and below roughly 60 percent utilization the reservations are too generous and should become soft guarantees with preemption. Left out of a first version: cross-region routing, per-tenant fine-tuned adapter serving, and fine-grained cost attribution below the request level.',
      numbers: [
        'Loading a 70B BF16 model from object storage at 2 GB/s = 70 seconds minimum, which is why the router places by loaded-weights affinity and never loads on demand',
        '50 tenants with a 2 percent reserved floor each = 100 percent reserved, so floors must be set on peak-concurrent tenants only, realistically 10 tenants at 5 percent',
        'Interactive tier at 500ms TTFT needs headroom of about 30 percent idle capacity; the batch tier backfills that headroom and raises utilization from 65 to over 90 percent',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'The core tension I want to name first is that isolation and utilization are directly opposed on shared GPUs, so I will design the quota model and then say explicitly what utilization it costs.',
      traps: [
        'Treating this as ordinary multi-tenancy with rate limits. The scarce resource is KV cache memory, and a tenant with long contexts consumes far more of it per request than one with short prompts at the same request rate.',
        'Assuming a model can be loaded on demand. Minutes of load time means routing must be affinity-based and model placement is a scheduling problem solved ahead of the request.',
        'Enforcing fairness only at request admission. A tenant with very long generations occupies batch slots for minutes, so fairness has to be measured in token-seconds rather than in requests.',
        'Silently downgrading a tenant to a smaller model under load, which changes output quality without changing anything the customer can see until they complain.',
      ],
      whenPushed: [
        {
          challenge: 'Why not give each tenant dedicated GPUs and avoid all of this?',
          answer:
            'Because utilization collapses. Tenants peak at different times and a dedicated fleet sized for each one\'s peak sits idle most of the day, which for GPUs is the dominant cost line. Dedicated capacity is the right answer for a tenant large enough to keep a fleet busy, and I would offer it as a tier rather than as the default.',
        },
        {
          challenge: 'Your fair-share scheduler still lets a tenant with long prompts hog memory.',
          answer:
            'Correct, which is why the quota is expressed in KV-cache-page-seconds rather than requests, and why there is a per-request max context. A tenant that wants 128K contexts consumes proportionally more of its allowance, which is both fair and what the cost structure actually looks like.',
        },
        {
          challenge: 'How do you serve fifty fine-tuned variants without fifty replicas?',
          answer:
            'LoRA adapters. Keep one base model resident and swap small adapter weights per request, which makes a variant cost megabytes instead of a replica. The limit is that it only works for adapters over the same base at the same precision, and a fully fine-tuned variant still needs its own replica.',
        },
      ],
    },
    diagram: `flowchart TD
  T["Tenant request"] --> RTR["Router: model version affinity"]
  RTR -->|local pre-check| QT[("Per-tenant token counters")]
  RTR --> RA["Replica set: model A loaded"]
  RTR --> RB["Replica set: model B loaded"]
  RA --> FS["Fair-share scheduler: weight per tenant"]
  FS -->|admit to continuous batch| BATCH["Batched decode"]
  BATCH --> POOL[("KV page pool: floor plus burst ceiling per tenant")]
  FS -->|over burst ceiling| WAIT["Queued"]
  LORA[("LoRA adapters")] -->|per request swap| RA
  BATCH -->|interactive preempts batch tier| BT["Batch tier backfill"]
  RTR -.->|new version: drain then shift map| RB
  BATCH --> USG[("Usage records")]`,
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
    solution: {
      define:
        'Retrain daily on a schedule, with an out-of-cycle trigger on a drift or performance alarm, because fraud patterns shift in days and a weekly cadence leaves you blind through a whole attack. Labels are delayed: a chargeback arrives 30 to 90 days after the transaction, so the usable label set always lags. That delay is the central constraint of this pipeline and it must be stated early.',
      data:
        'Two label sources with different latencies: manual review decisions available within hours, and chargebacks available in months. Train on both with the chargeback label as ground truth and the review label as a weaker, faster signal. Class imbalance is roughly 1 in 1,000, handled with class weighting in the loss rather than by downsampling negatives, since downsampling distorts calibration and calibrated scores are what the threshold logic needs. Leakage is the main danger: any feature derived from the review outcome, the chargeback record, or a downstream manual action must be excluded, and the way to enforce that is a point-in-time feature store rather than a code review.',
      architecture:
        'The pipeline runs as a DAG: extract labelled events with point-in-time-correct features, train a gradient-boosted model with class weights, evaluate against a temporal holdout and against the current production model on the same slice, and push to the registry with the dataset version and code commit recorded. Promotion requires beating production on precision at a fixed recall plus passing a fairness and stability check, and the candidate first runs in shadow, scoring live traffic without acting, for a full day.',
      evaluate:
        'Accuracy is meaningless at 0.1 percent positives; the metric is precision at the recall level the business operates at, plus the dollar-weighted version of it, since blocking a $10,000 transaction and a $5 one are not the same error. Shadow evaluation compares score distributions and disagreement cases against production, and a human reviews a sample of the cases where the models disagree, which is where a regression is visible before it costs anything.',
      deploy:
        'Promotion is a traffic shift, not a swap: the new model takes 5 percent, then 25, then 100, with the old model still loaded so rollback is a routing change taking seconds. There is no coverage gap because both models are scoring during the transition. If the new model regresses on a pattern the old one caught, the rollback trigger is a rise in a specific fraud tag\'s approval rate rather than an aggregate metric, since aggregate fraud rate moves too slowly to catch it.',
      wrapup:
        'Daily retraining with drift-triggered out-of-cycle runs is chosen because it matches the timescale on which attackers adapt, and it costs a pipeline that must be reliable enough to run unattended every day. The pattern I would expect to miss is a coordinated ring using clean-looking new accounts, because per-transaction features cannot see the coordination, and the way to catch it is graph features over shared devices and payment instruments.',
      numbers: [
        '10M transactions/day at 0.1 percent fraud = 10K positives/day, so a 90-day training window has 900K positives, which is enough for a tree model but thin for a deep one',
        'Chargeback label delay of 30 to 90 days means today\'s model is trained on labels from a quarter ago, so recent-pattern coverage comes from the faster review labels',
        'At 95 percent recall and 10 percent precision, blocking 10K frauds costs 90K false declines a day, which is why the operating point is chosen on a dollar-cost curve, not on F1',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to establish the label delay first, because chargebacks arrive months after the transaction and that single fact shapes the training data, the retraining cadence and the evaluation design.',
      traps: [
        'Reporting accuracy or even AUC on a 0.1 percent positive rate. Both look wonderful and neither tells you what happens at the operating threshold; precision at fixed recall is the metric.',
        'Leaking the outcome into the features. Anything computed after the fraud determination, including a manual review flag or an account status that a reviewer set, will make the model look superb and useless.',
        'Downsampling the negative class and then using the raw scores as probabilities. The model is now miscalibrated by the sampling ratio, and every threshold decision downstream is wrong.',
        'Ignoring the value asymmetry between transactions, so the model optimizes case counts while the business loses on the dollar-weighted outcome.',
      ],
      whenPushed: [
        {
          challenge: 'You are training on data your own model influenced, since it blocked transactions you never saw the outcome of.',
          answer:
            'That is a genuine selection bias and it compounds every retrain. The standard mitigation is a small randomized holdout where a fraction of would-be-blocked transactions are allowed through so you observe their true labels, which costs real fraud losses and is the only way to keep an unbiased sample. I would make that budget explicit rather than pretending the bias is not there.',
        },
        {
          challenge: 'Why gradient-boosted trees rather than a deep model?',
          answer:
            'Tabular features, extreme class imbalance, and a need for calibrated scores and feature attributions for reviewers. Trees win on all four and train in minutes, which matters when retraining daily. I would revisit it if graph or sequence features became central, where a deep model has a genuine structural advantage.',
        },
        {
          challenge: 'How do you know the shadow model is actually better before it acts?',
          answer:
            'I do not, fully, and I would say so. Shadow tells me score distribution and disagreement, but the counterfactual outcome of transactions the new model would have blocked is unobservable. That is why promotion is a traffic ramp with a dollar-loss guardrail rather than a decision made entirely offline.',
        },
      ],
    },
    diagram: `flowchart TD
  TX[("Transaction events")] --> PIT["Point-in-time correct feature join"]
  REV[("Manual review labels: hours")] --> PIT
  CB[("Chargeback labels: 30-90 days")] --> PIT
  PIT --> TRN["Train GBDT with class weights"]
  TRN --> EVAL["Temporal holdout vs production model"]
  EVAL -->|precision at fixed recall| REG[("Registry: dataset id, commit, metrics")]
  REG --> SHD["Shadow: score live traffic, no action"]
  SHD -->|human reviews disagreements| GATE["Promotion gate"]
  GATE -->|5 then 25 then 100 pct| PROD["Production scoring"]
  PROD -.->|old model still loaded| ROLL["Rollback is a routing change"]
  PROD --> RAND["Randomized allow-through holdout"]
  RAND -->|unbiased labels| TX
  DRIFT["Drift or metric alarm"] -.->|out-of-cycle retrain| TRN`,
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
    solution: {
      define:
        'Spam here is commercial link farming, scam offers and engagement manipulation, with the definition changing as spammers adapt, so the pipeline must support both slow model retraining and fast rule deployment. Target false-positive rate under 0.1 percent on legitimate content, because a wrongly removed pin is a creator you lose. Detection runs pre-publish at the 50ms budget for a cheap model, with an expensive pass asynchronously after.',
      data:
        'Labels come from moderator decisions, which are high quality and slow, and user reports, which are fast, noisy and adversarially gameable. Resolve disagreement by treating moderator decisions as ground truth and user reports as a feature plus a sampling signal for the review queue, never as a label directly. Keeping the training set current means continuously sampling recent content for review rather than relying on reports, because a novel spam type generates no reports until users learn to recognize it.',
      architecture:
        'Two layers with different clocks. A rule and blocklist layer deployed in minutes handles a specific campaign: a URL domain, an image hash, a template phrase. A model layer retrained weekly handles the general distribution, using text, image embedding, account age, posting velocity and link reputation features. The rule layer exists because retraining cannot respond within hours to a campaign, and the model layer exists because rules do not generalize. Rules that persist for several weeks are candidates to be absorbed into the model and retired.',
      evaluate:
        'Measure false positives on a stratified sample of high-value legitimate content, reviewed by humans, rather than on the overall test set where legitimate content is overwhelmingly easy. Shadow deployment must compare the new model\'s removals against production\'s on the same traffic, with humans reviewing the disagreement set, since aggregate precision hides a regression concentrated in one content category.',
      deploy:
        'Retrain weekly; trigger out-of-cycle when the rule layer\'s catch volume spikes, which is the signal that a new pattern is live and the model is missing it. Rollback is a model-version pin plus an immediate re-review of content auto-removed by the new version in its first hours, because the harm from a bad spam model is content that was wrongly deleted and needs restoring, not just a metric regression.',
      wrapup:
        'The reactive trigger is rule-layer catch volume, which manages the risk that the model degrades silently between scheduled retrains while a campaign runs. To catch a novel pattern faster I would add an unsupervised burst detector over content clusters, flagging any sudden cluster of near-duplicate new content from unrelated new accounts, which is what a campaign looks like before anyone has labelled it.',
      numbers: [
        '10M new pins/day with a 2 percent spam rate = 200K spam items/day; at 0.1 percent false positives on the other 9.8M that is 9,800 wrongly removed legitimate pins per day',
        'Moderator throughput of about 300 reviews/hour x 100 moderators x 8 hours = 240K reviews/day, so the review queue can cover roughly the full spam volume but not much more',
        'Rule deployment in under 10 minutes versus weekly retraining is a 1000x difference in response time, which is the entire reason both layers exist',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to design this as two layers with different response times, because a weekly retrain cannot answer a campaign that starts on Tuesday and a rule layer cannot generalize, and pretending one mechanism does both is the mistake here.',
      traps: [
        'Training directly on user reports. Reports are noisy and organized groups use them as a weapon, so a model trained on them learns to suppress whatever is unpopular.',
        'Measuring false positives on the overall test set, where legitimate content is trivially easy and the rate looks like 0.01 percent while the rate on borderline creative content is ten times that.',
        'Having no fast path. The interviewer will describe a campaign that starts at noon, and an answer whose only lever is retraining has already lost that day.',
        'Forgetting that a false positive here is a deleted post, so rollback has to include restoring content, not just switching model versions.',
      ],
      whenPushed: [
        {
          challenge: 'Spammers will probe your model to find what gets through.',
          answer:
            'They will, and that is why the fast rule layer and randomized review sampling matter more than model accuracy. I would also avoid giving precise feedback on removal reasons, since a detailed explanation is a free gradient signal to an adversary. The honest position is that this is an adversarial game and the goal is raising cost, not achieving a stable solution.',
        },
        {
          challenge: 'How do you avoid the model learning from its own false positives?',
          answer:
            'Auto-removed content never becomes a positive training label on its own; only human-reviewed decisions do. Without that rule the model reinforces its own mistakes within a few retrain cycles, and a category of legitimate content quietly becomes permanently classified as spam.',
        },
        {
          challenge: 'Your review queue is the bottleneck, not the model.',
          answer:
            'Correct, and it means the model\'s real job is prioritizing the queue, not making final decisions. I would allocate reviewer capacity by expected value: uncertain cases near the threshold plus a random sample for unbiased measurement plus high-reach content. Sorting the queue purely by model score wastes reviewers on cases the model was already confident about.',
        },
      ],
    },
    diagram: `flowchart TD
  P["New pin"] --> FAST["Fast model: 50ms pre-publish"]
  FAST -->|high confidence spam| BLK["Blocked"]
  FAST -->|otherwise| PUB["Published"]
  PUB --> ASYNC["Expensive async pass"]
  RULE[("Rules and hashes: deployed in minutes")] --> FAST
  ASYNC -->|borderline| QUE["Review queue: uncertainty x reach plus random sample"]
  QUE --> MOD["Moderators"]
  MOD -->|ground truth labels only| TRS[("Training set")]
  REP["User reports"] -->|feature and prioritization, never a label| QUE
  TRS -->|weekly| TRN["Retrain"]
  TRN -->|shadow then promote| FAST
  RULE -.->|catch volume spike| TRN
  BURST["Near-duplicate burst detector"] --> QUE`,
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
    solution: {
      define:
        'The registry guarantees that any model version served in production can be reproduced from recorded lineage: dataset snapshot id, feature definition versions, code commit, hyperparameters and environment image. Rollback is automated on a defined regression signal with a human override, because waiting for a human costs the exact minutes that matter. At least three versions must be servable simultaneously to support canaries and instant rollback.',
      data:
        'A registry entry is (model_id, version, artifact_digest, dataset_snapshot_id, feature_set_version, code_commit, training_config_hash, eval_metrics, stage, created_by). Every one of those is a content-addressed reference, not a mutable pointer such as a branch name or a latest tag, because reproducibility fails at exactly the pointer that moved. The artifact itself lives in object storage keyed by digest.',
      architecture:
        'Promotion is a state transition on the entry, trained to registered to canary to production to archived, with each transition gated by an automated check and recorded with an actor. Rollback flips the serving alias to the previous version\'s digest, which is fast because the previous artifact is still loaded on a warm replica set kept alive for a retention window; that warm standby is the design decision that turns rollback from minutes into seconds. Canary routes a traffic percentage by consistent hashing on user id so a user does not oscillate between versions.',
      evaluate:
        'Prove a rollback is exact rather than approximate by replaying a fixed request set through the rolled-back version and asserting bit-identical predictions against a stored golden output set, which catches the case where the artifact is the same but a dependency or feature default has changed. During a canary, the decision metrics are prediction distribution divergence against the control, the business guardrail, and error and latency rates, evaluated as a comparison against concurrently served control traffic.',
      deploy:
        'The hard case is rolling back when the feature schema has moved on: the old model expects a feature that has since been renamed or redefined. The registry pins feature_set_version, and the serving layer can materialize an older feature view for a bounded retention window, after which rollback to that version is honestly no longer possible and the entry is marked as such rather than silently failing. Automated rollback fires on a sustained guardrail breach over a short window, with a rate limiter so a flapping metric cannot cause repeated flips.',
      wrapup:
        'Reproducibility is guaranteed by content-addressing every input, which costs storage for dataset snapshots and discipline in the training pipeline, and it is what makes an incident investigable months later. After a slow rollback the first gap I would close is warm standby retention: if the previous version had to be loaded from cold storage, rollback took minutes it did not need to take.',
      numbers: [
        '3 versions x a 10GB model artifact x 20 models = 600GB of warm-resident artifacts, which is a real memory cost and the price of seconds-not-minutes rollback',
        'Dataset snapshots at 1TB per model per week x 20 models x 13 weeks retention = 260TB, which is why snapshots are deduplicated references rather than copies',
        'Automated rollback: 60-second detection window plus 10 seconds to shift the alias = 70 seconds of exposure, versus 15 to 30 minutes for a human-paged rollback',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to define reproducibility concretely as a set of content-addressed references before designing the workflow, because a registry that records a git branch name instead of a commit is a registry that cannot reproduce anything.',
      traps: [
        'Recording mutable pointers: a branch name, a latest tag, a table name without a snapshot id. Every one of them will have moved by the time you need to reproduce.',
        'Assuming rollback is just swapping an artifact. The feature schema, the preprocessing code and the runtime image all moved too, and the old model may not run against today\'s inputs.',
        'Canarying by request rather than by user, so a user\'s experience flips between two model versions mid-session and any session-level metric becomes meaningless.',
        'Automating rollback with no rate limit, so a noisy guardrail metric produces a rollback loop that is worse than either version.',
      ],
      whenPushed: [
        {
          challenge: 'Storing a dataset snapshot per training run is prohibitively expensive.',
          answer:
            'Storing copies would be. I store an immutable reference: a table version in a format like Delta or Iceberg plus the exact query, so the snapshot is a pointer into data that already exists with a retention policy. That gives reproducibility as long as the underlying retention holds, and beyond that window I say plainly that the run is no longer reproducible.',
        },
        {
          challenge: 'What if the model is fine but the feature pipeline broke?',
          answer:
            'Then rollback of the model fixes nothing, which is why the canary decision metric includes input feature distributions and not only output metrics. Distinguishing a bad model from bad inputs is the first branch of the incident runbook, and rolling back the model when the features broke wastes the minutes you have.',
        },
        {
          challenge: 'Three simultaneous versions is a lot of memory for large models.',
          answer:
            'It is, and for very large models I would keep only two warm and accept a slower rollback to anything older. The cost curve is explicit: each warm version is a fixed memory bill against a shorter incident. For small models three is free and I would keep more.',
        },
      ],
    },
    diagram: `flowchart TD
  TR["Training run"] -->|content-addressed inputs| ENT[("Registry entry: digest, dataset id, commit, feature set version")]
  ART[("Artifact store by digest")] --> ENT
  ENT --> STG["Stage: registered"]
  STG -->|automated eval gate| CAN["Canary: consistent hash on user id"]
  CAN --> CMP["Compare vs concurrent control"]
  CMP -->|prediction divergence, guardrail, latency| PROD["Production alias"]
  WARM[("Warm standby: previous 2 versions loaded")] --> PROD
  CMP -->|sustained breach, rate limited| RB["Rollback: flip alias to previous digest"]
  RB --> WARM
  FV[("Feature set versions, bounded retention")] -->|materialize old view| RB
  PROD --> GOLD["Golden request replay: bit-identical check"]`,
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
    solution: {
      define:
        'Monitor three layers in priority order: input data quality first because it breaks most often and is unambiguous, prediction distribution second because it is available immediately, and ground-truth performance last because labels are delayed. Detect a meaningful shift within one hour for high-traffic models. Target no more than a handful of actionable alerts per week per team, because a drift system that pages daily is one that gets muted.',
      data:
        'The baseline is a fixed reference window, typically the model\'s training distribution plus the first stable week in production, refreshed only on an explicit model promotion rather than continuously, because a rolling baseline slowly follows drift and stops detecting it. Per feature, compute population stability index for continuous variables and a chi-square or total variation distance for categorical ones, on a sample rather than the full stream.',
      architecture:
        'Serving logs a sample of feature vectors and predictions to a stream. A scheduled job aggregates them into per-feature histograms per hour, compares against the baseline, and writes drift scores as ordinary time-series metrics so the existing alerting and dashboard stack does the rest. That reuse is deliberate: building a separate alerting stack for ML is how these systems end up unmaintained. Distinguishing data quality from genuine drift is done by checking null rate, cardinality and type violations first, since a broken upstream job produces a distinctive signature of nulls or a collapsed distribution rather than a smooth shift.',
      evaluate:
        'Validate the detector by replaying historical incidents: take three known past degradations, run the detector over that period\'s logged data, and measure detection lag and whether it would have fired. A drift detector that has never been backtested is a guess. Tune sensitivity by measuring the false-alarm rate over a known-quiet period and setting thresholds to a target of roughly one alert per model per month.',
      deploy:
        'Drift alerts do not auto-retrain. They open a triage item with the top drifted features and a link to recent upstream changes, because most drift alerts are upstream data changes and auto-retraining on corrupted data is strictly worse than doing nothing. Scaling to hundreds of models is done by making onboarding declarative: a model registers its feature schema and gets monitoring by default, with per-model configuration as an override rather than a requirement.',
      wrapup:
        'PSI against a fixed baseline is chosen because it is interpretable, cheap and has conventional thresholds teams can reason about, and its false-alarm cost is managed by requiring sustained breach over several windows rather than a single spike. What this design still misses is a shift in the relationship between features and label while the marginal feature distributions stay identical, which no input-monitoring approach can see and only delayed labels reveal.',
      numbers: [
        '1 percent sampling of 10K predictions/sec = 100 logged vectors/sec = 8.6M/day, which is a manageable few GB/day rather than the 860M full-fidelity records',
        '200 features x 24 hourly windows x 500 models = 2.4M drift computations/day, each over a histogram rather than raw rows, so it is minutes of compute, not hours',
        'A PSI threshold of 0.2 is the common action level and 0.1 the watch level; requiring 3 consecutive breached windows cuts false alarms by roughly an order of magnitude',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to order the three monitoring layers by how often they actually catch problems, and in practice input data quality catches far more incidents than statistical drift does, so that is where I would start.',
      traps: [
        'Using a rolling baseline that updates continuously. It tracks the drift you are trying to detect, so a slow degradation over months never triggers anything.',
        'Alerting on every feature independently. Two hundred features and correlated drift means one upstream change produces fifty pages, and nobody reads the fifty-first.',
        'Treating drift as automatically bad. A marketing campaign genuinely changes the traffic mix, and a system that cannot distinguish that from a broken pipeline is a system that gets ignored.',
        'Building drift monitoring as a separate stack with its own dashboards and alert routing, which guarantees it is not on-call\'s dashboard when it matters.',
      ],
      whenPushed: [
        {
          challenge: 'Feature drift does not mean the model got worse.',
          answer:
            'Agreed, and that is the fundamental limitation. Input drift is a leading indicator with a real false-positive rate, and performance on delayed labels is the ground truth arriving too late to act on. I present drift as a prompt to investigate, never as a verdict, and the only closed-loop signal I would trust is a proxy metric correlated with the outcome.',
        },
        {
          challenge: 'How do you detect drift in an embedding or an image input?',
          answer:
            'Not feature by feature. I would monitor the distribution of embeddings via a reduced representation, tracking mean cosine distance to reference cluster centroids or a maximum mean discrepancy statistic on a sample. It is less interpretable, so when it fires you get a signal and not a diagnosis, which is worth stating up front.',
        },
        {
          challenge: 'Your one-hour detection window is useless for a low-traffic model.',
          answer:
            'Correct. With a hundred predictions an hour there is no statistical power at that window, so the window has to scale with traffic and the honest answer for a low-traffic model is daily detection. Applying the same window everywhere produces either noise on small models or lag on big ones.',
        },
      ],
    },
    diagram: `flowchart TD
  SRV["Model serving"] -->|1 pct sample of vectors and predictions| LOG[("Prediction log")]
  LOG --> DQ["Data quality checks: nulls, cardinality, types"]
  DQ -->|clean| HIST["Hourly per-feature histograms"]
  DQ -->|violation| INC["Pipeline incident, not drift"]
  BASE[("Frozen baseline: training distribution")] --> PSI["PSI and chi-square per feature"]
  HIST --> PSI
  PSI -->|written as ordinary time series| TSDB[("Metrics store")]
  TSDB --> ALR["Existing alerting: 3 consecutive windows"]
  ALR --> TRIAGE["Triage item with top drifted features"]
  LAB[("Delayed ground truth")] --> PERF["Performance monitor"]
  PERF --> TSDB
  PROMO["Model promotion"] -.->|only refresh point| BASE
  REG[("Model schema registry")] -->|declarative onboarding| PSI`,
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
    solution: {
      define:
        'The first signal to degrade is not aggregate watch time, which is buffered by habit, but per-cohort completion rate on newly surfaced content, especially for new users whose feed depends most on the model. Content taste shifts within days here, so the monitoring window is hours, not the weeks a typical recommender tolerates. Page immediately on a sharp post-deploy drop; review next-day for a slow trend.',
      data:
        'The features that shift fastest are trend and hashtag popularity distributions, which are non-stationary by design and cannot be baselined against a fixed reference. Baseline them relatively instead: compare the current period against the same period one week earlier for the same cohort, which absorbs both weekly seasonality and slow trend evolution. Genuine trend shift and model failure are distinguished by whether the change is concentrated in content or in serving: a real trend moves the content mix while engagement per impression holds, while a model failure drops engagement per impression across all content categories at once.',
      architecture:
        'Real-time engagement metrics are computed in a streaming job segmented by content category, user cohort, device and model version, since a regression usually lives in one segment while the aggregate stays flat. A feedback-loop detector watches the entropy of the impression distribution across categories and creators, and alarms when it narrows sharply, which is the signature of a model that has collapsed onto a narrow content type and is showing artificially strong engagement. Deploy-time monitoring compares the treatment version against the concurrently served control on every one of these metrics, so an alarm is a difference rather than an absolute level.',
      evaluate:
        'Validate against a real past incident by replaying that window\'s logged metrics through the detector and measuring how long it would have taken to fire; anything over an hour is not fast enough on this platform. To confirm it distinguishes trend shift from regression, replay a known viral trend and assert the entropy and per-impression engagement signals move in the pattern the trend case predicts and not the failure pattern.',
      deploy:
        'A sharp engagement drop right after a deploy triggers automatic rollback of that model version, because on a platform with fast taste shift the cost of an unnecessary rollback is small and the cost of an hour of a bad model is large. Thresholds are set relative to the control arm rather than absolute, which is the only way to have stable alerting when normal itself moves every week.',
      wrapup:
        'The mechanism separating trend shift from regression is that a real trend changes content mix while holding per-impression engagement, and a regression drops per-impression engagement across categories simultaneously; the risk is a trend that is both, such as a format change that genuinely engages fewer people. The first false alarm I expect is a holiday or a major event compressing session counts, which I would tune out by comparing against the same segment in the control arm rather than against last week.',
      numbers: [
        '1B DAU x 200 videos/day = 200B impressions/day = 2.3M impressions/sec, so even a 0.1 percent sample gives 2,300 events/sec per metric, enough for minute-level detection',
        'A 1 percent completion-rate drop across the whole platform is roughly 2B fewer completed views a day, which is why the alert threshold is fractions of a percent',
        'Detection budget: 5-minute aggregation window plus 2 windows of confirmation = 15 minutes from deploy to rollback, versus hours if you wait for daily metrics',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'The thing that makes this different from ordinary model monitoring is that the baseline itself is non-stationary, so every alarm has to be a comparison against a concurrent control rather than against a historical level.',
      traps: [
        'Baselining against a fixed historical distribution on a platform where the content distribution genuinely changes every week, which produces a permanent drift alarm that everyone learns to ignore.',
        'Monitoring aggregate engagement only. A regression concentrated in new users or one content category is invisible in the aggregate until it has already cost you those users.',
        'Reading rising engagement as success. A collapse onto a narrow addictive content type raises short-term engagement and is exactly the failure the entropy detector exists to catch.',
        'Waiting for daily metrics to decide on a rollback, when the taste cycle on this platform means a bad model has done its damage well before tomorrow\'s numbers land.',
      ],
      whenPushed: [
        {
          challenge: 'How do you tell a bad model from a bad week of content supply?',
          answer:
            'The control arm. If the control is served by the old model on the same content supply and shows the same drop, it is supply; if only the treatment drops, it is the model. This is why I would keep a permanent holdback arm on the previous model rather than ramping to 100 percent, and I would pay the small opportunity cost for that diagnostic.',
        },
        {
          challenge: 'Automatic rollback on a 15-minute signal will fire on noise.',
          answer:
            'It will occasionally, and I accept that trade because the asymmetry favours it: a spurious rollback costs one deploy cycle while an hour of a degraded model costs real retention. I would require two consecutive breached windows and a minimum effect size to keep the false-rollback rate at roughly one a month.',
        },
        {
          challenge: 'Your entropy metric will penalize a genuinely dominant trend.',
          answer:
            'Yes, when a single trend legitimately takes over the platform, entropy narrows for real reasons. That is why entropy alone is a watch signal and only a page when it coincides with a per-impression engagement drop or a deploy boundary. A metric that cannot distinguish those cases alone needs a second condition, not a higher threshold.',
        },
      ],
    },
    diagram: `flowchart TD
  IMP["Impressions and completions"] --> STR["Streaming aggregation"]
  STR -->|segmented by category, cohort, device, model version| SEG[("Segment metrics, 5 min windows")]
  SEG --> CMP["Treatment vs concurrent control arm"]
  CTRL["Permanent holdback on previous model"] --> CMP
  SEG --> ENT["Impression entropy across categories and creators"]
  ENT -->|narrowing sharply| FB["Feedback-loop alarm"]
  CMP -->|per-impression engagement drop| REG["Regression alarm"]
  SEG -->|content mix shifts, engagement holds| TRD["Trend shift: no page"]
  REG -->|2 breached windows post-deploy| RBK["Automatic rollback of model version"]
  FB --> RBK
  WK[("Same period last week, same cohort")] --> CMP`,
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
    solution: {
      define:
        'Detect per-feature marginal drift as the default, with joint drift on a small set of known-correlated groups, because full joint monitoring over hundreds of features is neither computable nor interpretable. Detection delay target is under 4 hours for a feature powering a production model. The alert consumer is the owning team, and the expected action is to check the upstream source first and the model second, so the alert must carry both.',
      data:
        'The reference window is the model\'s training feature distribution, frozen at promotion, plus a stability check against the first week of serving. It is refreshed only on retrain, deliberately, because a rolling reference is how you fail to notice gradual drift. Population stability index for continuous features, chi-square or total variation for categorical, and a separate null-rate and cardinality check that runs first because those are data quality failures rather than distribution shifts.',
      architecture:
        'Sampled serving logs land in a warehouse table partitioned by hour. A scheduled job computes per-feature histograms and drift scores per partition and writes them as time series. To avoid hundreds of manual reviews, alerts are grouped: features are clustered by historical drift correlation, one alert is raised per cluster naming the top-contributing feature, and a feature\'s drift is annotated with any upstream table whose freshness or row count changed in the same window, which is what turns a drift alert into a diagnosis instead of a mystery.',
      evaluate:
        'Tune the threshold on a labelled set of past windows: mark historical windows as drifted or normal from incident records, sweep the threshold, and pick the point on the resulting curve that matches the team\'s alert budget. Confirm the detector catches a known incident by replaying that period\'s data and measuring the detection lag against when the incident was actually noticed, which is usually much later.',
      deploy:
        'A drift alert notifies and never auto-pauses the model, because the most common cause is an upstream schema or pipeline change and pausing the model turns a data problem into an outage. The exception is a hard data quality failure, such as a feature going 100 percent null, which does auto-fall-back to the feature\'s default with an explicit missingness flag. Alert fatigue from correlated features is handled by the clustering plus a suppression rule so one root cause produces one notification.',
      wrapup:
        'Freezing the reference window at retrain accepts that the baseline goes stale between retrains, which is the point: staleness relative to what the model was trained on is exactly the quantity worth measuring. The issue this surfaces fastest is an upstream schema change, such as a category being renamed or a unit changing, because it produces an immediate and unmistakable categorical distribution shift rather than a gradual one.',
      numbers: [
        '300 features x 24 hourly windows = 7,200 drift computations/day per model, each over a histogram of a 10K-row sample, so the whole job is minutes',
        'Without clustering, one upstream change touching 40 correlated features produces 40 alerts; clustering reduces that to 1, which is the difference between a usable and an ignored system',
        'A 10K-row sample gives a PSI standard error small enough to distinguish 0.1 from 0.2 reliably; a 500-row sample does not, which is why sample size is a design parameter',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to be clear that most of what this system will catch is upstream data pipeline problems rather than genuine distribution shift, and designing for that reality changes what the alert needs to contain.',
      traps: [
        'Alerting per feature with no grouping. One upstream change moves forty correlated features and produces forty pages, which trains the team to mute the channel.',
        'Refreshing the reference window continuously, so the baseline drifts along with the data and a slow six-month shift is never detected.',
        'Using the same statistical test for continuous and categorical features. A PSI on a high-cardinality categorical with a long tail is dominated by bucketing artifacts.',
        'Auto-pausing the model on a drift alert, which converts a routine upstream schema change into a production outage.',
      ],
      whenPushed: [
        {
          challenge: 'PSI thresholds are arbitrary.',
          answer:
            'They are conventions, and I would not defend 0.2 on statistical grounds. What I would defend is calibrating the threshold against your own history: sweep it over labelled past windows and pick the point that matches your alert budget. That makes the number empirical for your data rather than borrowed from a credit-scoring paper.',
        },
        {
          challenge: 'What about drift in a feature that the model barely uses?',
          answer:
            'It should be a lower-severity alert, and I would weight drift scores by feature importance from the model so a large shift in an unimportant feature does not page anyone. Treating all features as equally worth waking someone for is a large part of why these systems get muted.',
        },
        {
          challenge: 'Marginal drift detection misses the case where features shift together but each stays in range.',
          answer:
            'Correct, and that is a real blind spot. The practical partial fix is a small number of joint checks, such as a density-ratio or a domain classifier trained to distinguish reference from current data, which detects joint shift with one number at the cost of telling you nothing about which feature caused it. I would run it alongside, not instead of, per-feature checks.',
        },
      ],
    },
    diagram: `flowchart TD
  SRV["Serving"] -->|sampled feature vectors| WH[("Hourly partitioned table")]
  WH --> QC["Null rate, cardinality, type checks first"]
  QC -->|hard failure| DEF["Fall back to default plus missingness flag"]
  QC -->|pass| HIS["Per-feature histograms, 10k row sample"]
  REF[("Reference window frozen at retrain")] --> SC["PSI continuous, chi-square categorical"]
  HIS --> SC
  SC -->|weighted by feature importance| CLU["Cluster correlated features"]
  CLU -->|one alert per cluster| AL["Alert naming top contributor"]
  UPS[("Upstream table freshness and row counts")] -->|annotate same window| AL
  AL --> TEAM["Owning team: check source first"]
  RETRAIN["Retrain"] -.->|only refresh point| REF`,
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
    solution: {
      define:
        'The framework exists to predict online revenue and advertiser outcomes from logged data well enough to decide which candidates deserve an expensive online test. It must model the auction, because changing the ranking changes which ads win and therefore what everyone pays, and an evaluation that scores relevance while ignoring the auction is measuring the wrong system. Its consumers are the ranking team and ads leadership, and the decision it informs is which of ten candidate models gets a slot in the online test queue.',
      data:
        'Logged impressions with bids, positions, clicks and conversions, all of which were generated by the incumbent policy, so the data is biased toward what the incumbent chose to show. Correct with inverse propensity scoring, using logged propensities where available and a learned propensity model where not, and clip weights to bound variance since a small number of low-propensity impressions otherwise dominate the estimate. A small always-on randomized traffic slice, a few tenths of a percent with randomized ranking, is the only way to obtain genuinely unbiased propensities, and it is worth its revenue cost.',
      architecture:
        'Replay each logged auction under the new model\'s scores, re-run the second-price or generalized second-price mechanism to determine winners and prices, and estimate outcomes with a doubly robust estimator that combines an outcome model with importance weighting, since doubly robust is materially lower variance than IPS alone. Layer on a simple market simulation for advertiser budget effects, because a ranking change that shifts spend to a budget-capped advertiser produces less incremental revenue than the naive sum suggests. The online validation is an interleaved or small holdout experiment that checks the direction and rough magnitude, not the precise number.',
      evaluate:
        'The framework itself must be validated: take past launches with known online results, run the framework retrospectively, and report the correlation between predicted and realized revenue lift. If that correlation is weak, the framework is not a gate. Watch specifically for the case where offline metrics improve and revenue does not, which typically means the model improved click prediction for ads that were already winning while changing nothing about the auction outcome.',
      deploy:
        'Use the framework as a filter rather than a decision: it ranks candidates and rejects clear losers, and a launch still requires an online test. Its predicted interval, not just its point estimate, is reported, and a candidate whose interval spans zero is not a launch candidate. If online results contradict the prediction, that discrepancy becomes a labelled case added to the framework\'s own validation set, which is how it improves.',
      wrapup:
        'Doubly robust off-policy estimation with clipped weights is the correction chosen, and its main remaining bias is the support problem: if the new model ranks an ad the incumbent essentially never showed, there is no logged data to reweight and the estimator is extrapolating. The historical case I would validate against first is a launch that won offline and lost online, since a framework that only reproduces its successes has learned nothing.',
      numbers: [
        'A randomized slice of 0.3 percent of 10B daily impressions = 30M unbiased impressions/day, plenty for propensity estimation, at a revenue cost of roughly 0.1 percent',
        'IPS weight clipping at 10 typically cuts estimator variance by an order of magnitude while introducing a few percent of bias, which is the trade worth making explicit',
        'If the framework\'s predicted lift correlates with realized lift at r = 0.6 across 20 past launches, it can screen candidates but cannot replace a test, and that number should be published',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to be explicit that this is an off-policy estimation problem under an auction mechanism, because both halves matter and a framework that handles only the first will systematically mispredict revenue.',
      traps: [
        'Evaluating ranking quality without re-running the auction. Change the ranking and the winners and prices change, so predicted revenue computed from logged prices is measuring a system that would not exist.',
        'Applying IPS without clipping. A handful of impressions with tiny logged propensities get enormous weights and the estimate becomes noise with a confident-looking mean.',
        'Ignoring the support problem. If the new policy wants to show ads the old policy never showed, no reweighting recovers those outcomes and the estimator is quietly extrapolating.',
        'Treating budget-capped advertisers as unlimited, so predicted revenue from shifting spend toward them is money that was going to be spent anyway.',
      ],
      whenPushed: [
        {
          challenge: 'Why not skip all this and just run more online tests?',
          answer:
            'Because online tests are the scarce resource: each needs weeks of traffic to detect a fraction of a percent of revenue, and you can run only a handful at a time. The framework exists to decide what gets those slots. If online capacity were unlimited I would agree and drop the offline machinery.',
        },
        {
          challenge: 'Your randomized slice costs real revenue.',
          answer:
            'It does, roughly a tenth of a percent, and I would defend it as the cheapest insurance available. Without unbiased propensities every offline estimate is uncertain in an unquantifiable way, and the cost of one bad launch decision exceeds a year of that slice. I would put the number in front of leadership rather than hide it in an infrastructure budget.',
        },
        {
          challenge: 'Doubly robust still requires an outcome model that could be wrong.',
          answer:
            'Yes, and the doubly robust property only guarantees consistency if either the propensity model or the outcome model is correct, not neither. In practice both are misspecified to some degree. That is why I report intervals and validate against realized launches rather than presenting the point estimate as truth.',
        },
      ],
    },
    diagram: `flowchart TD
  LOG[("Logged auctions: bids, positions, clicks, conversions")] --> RPL["Replay under candidate model scores"]
  RAND["0.3 pct randomized ranking slice"] -->|unbiased propensities| PS["Propensity model"]
  PS --> DR["Doubly robust estimator, clipped weights"]
  RPL -->|re-run GSP auction: winners and prices| DR
  OM["Outcome model"] --> DR
  DR --> SIM["Budget-cap market simulation"]
  SIM -->|point estimate plus interval| SCR["Candidate screening"]
  SCR -->|clear losers rejected| QUEUE["Online test queue"]
  QUEUE --> AB["Holdout or interleaved experiment"]
  AB -->|realized lift| VAL[("Framework validation set")]
  VAL -->|correlation with predicted lift| SCR`,
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
    solution: {
      define:
        'The primary metric is one pre-registered decision metric, for instance sessions per user per week, with guardrails on latency p99, revenue and complaint rate that can independently fail a launch. Randomize at the user level, because session or query randomization leaks the treatment across a user\'s own experience and violates the independence the statistics assume. Run for at least two full weeks to cover weekly seasonality and to let novelty effects decay.',
      data:
        'Assignment is deterministic: hash(user_id + experiment_salt) modulo buckets, computed identically everywhere so a user\'s arm is the same on web, mobile and in the offline log join. Every request logs experiment id, arm, assignment timestamp and model version, so analysis joins on logged assignment rather than recomputing it. Before analysing anything, run a sample ratio mismatch test on the observed split, because an SRM invalidates the experiment and is more common than people expect.',
      architecture:
        'An assignment service exposes a pure function of user id and experiment config, cached client-side with a short TTL. Concurrent experiments run in orthogonal layers, each with its own salt, so assignments across layers are independent and a user can be in several experiments without their treatments correlating; experiments that genuinely interact go in the same layer and become mutually exclusive. Results are computed in a nightly batch with variance reduction via CUPED, using pre-period data on the same metric, which typically cuts the required sample substantially.',
      evaluate:
        'SRM is checked with a chi-square test on assignment counts, and any p-value below about 0.001 stops the analysis rather than being explained away. Novelty is checked by plotting the treatment effect by days since first exposure: a real effect is roughly flat while a novelty effect decays toward zero over one to two weeks. Peeking is controlled by either fixing the horizon in advance or using a sequential test with always-valid confidence intervals.',
      deploy:
        'A winning variant ramps 50, 75, 100 over several days while a small permanent holdback stays on control, which is what lets you measure the cumulative effect of many launches months later. Early stopping is only for guardrail regressions and is automated on a pre-defined threshold, since the decision to stop for harm should not require a meeting.',
      wrapup:
        'User-level randomization is chosen because it eliminates within-user interference, and it accepts network interference, which for a ranking change is usually small but is real in any product with a social graph or a shared marketplace supply. Before trusting a surprising result I would check SRM first, then whether the effect is concentrated in one platform or one country, which is the signature of an instrumentation bug rather than a genuine effect.',
      numbers: [
        'Detecting a 1 percent lift on a metric with a 100 percent coefficient of variation at 80 percent power needs roughly 160K users per arm; a 0.5 percent lift needs 640K, since sample scales with the inverse square of the effect',
        'CUPED using a pre-period covariate correlated at r = 0.7 cuts variance by about 50 percent, equivalent to halving the required runtime',
        'Two weeks at 1M DAU with a 5 percent exposure = 700K users per arm, which is enough for a 1 percent effect but not for a 0.3 percent one',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to pre-register the decision metric, the guardrails and the runtime before touching the design, because every serious failure of an A/B system is a decision made after seeing the data.',
      traps: [
        'Randomizing at the query or session level for a ranking change. The same user gets both arms, their behaviour in one contaminates the other, and the estimated effect is biased toward zero.',
        'Peeking daily and stopping when the p-value crosses 0.05. That inflates the false positive rate to well over 30 percent, and either a fixed horizon or a sequential test is required.',
        'Skipping the sample ratio mismatch check. A 50.4 to 49.6 split looks fine and, at scale, is overwhelming evidence that assignment or logging is broken.',
        'Ignoring novelty. A new ranking gets attention because it is different, and a one-week test on an interface change frequently measures curiosity rather than value.',
      ],
      whenPushed: [
        {
          challenge: 'Two weeks is too slow. The team wants to ship on day three.',
          answer:
            'Day three tells you about novelty and weekday behaviour only. If speed is essential I would use CUPED and a sequential test, which can legitimately stop early when the effect is large, and I would be explicit that a small effect simply cannot be measured in three days at this traffic. The alternative is shipping on noise.',
        },
        {
          challenge: 'How do you handle interference in a two-sided marketplace?',
          answer:
            'User-level randomization is genuinely biased there, because treatment users consuming more supply reduces what control users see. The fix is cluster or geo randomization, randomizing whole markets, which costs a large amount of statistical power because the effective sample size becomes the number of markets rather than users. It is the right call when interference is first-order.',
        },
        {
          challenge: 'Your guardrails will block launches that are net positive.',
          answer:
            'Sometimes, and that is the intent: a guardrail encodes a cost the primary metric cannot see, such as latency or complaints. What I would not do is loosen a guardrail after seeing it fail. The right response to a repeatedly blocking guardrail is to argue the threshold before the next experiment, in public, not during the analysis of this one.',
        },
      ],
    },
    diagram: `flowchart TD
  U["Request"] --> AS["Assignment: hash user id plus salt"]
  AS -->|layer 1 salt| L1["Experiment layer 1"]
  AS -->|orthogonal layer 2 salt| L2["Experiment layer 2"]
  L1 -->|control| C["Incumbent ranker"]
  L1 -->|treatment| T["Candidate ranker"]
  C --> LOG[("Logs: experiment id, arm, assignment time, model version")]
  T --> LOG
  LOG --> SRM["Sample ratio mismatch chi-square"]
  SRM -->|p below 0.001 stops analysis| STOP["Invalid experiment"]
  SRM -->|pass| AN["Nightly analysis with CUPED"]
  PRE[("Pre-period covariate")] --> AN
  AN --> NOV["Effect by days since exposure: novelty check"]
  NOV --> DEC["Decision at fixed horizon or sequential test"]
  DEC -->|guardrail breach| KILL["Automatic stop"]
  DEC -->|win| RAMP["50, 75, 100 pct plus permanent holdback"]`,
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
    solution: {
      define:
        'Several models, not one: a cheap multi-label classifier for the broad categories (harassment, sexual content, violence, self-harm) plus separate specialist models for spam and for policy areas with distinct legal exposure, because one model with one threshold cannot express different costs per category. Comments are checked pre-publish within 50ms with the cheap model and post-publish with the expensive one. Over-removal costs more in the categories where speech is contested, so thresholds are per category, not global.',
      data:
        'Moderator decisions are ground truth; user reports are a feature and a queue-prioritization signal, never a label, since report volume tracks unpopularity rather than violation. Labeler disagreement is resolved by adjudication for the training set and, importantly, by keeping the disagreement rate as a per-category signal: a category where three moderators disagree half the time does not have a well-defined boundary, and no model will fix that. Staying current against evasion requires continuous random sampling for review, because evasion by definition produces content the current model scores as safe.',
      architecture:
        'Fast pass at publish time blocks only the highest-confidence violations, since a false positive here is visible and instant. Everything else publishes and goes through an async expensive pass, which routes borderline scores into a human queue prioritized by score uncertainty times content reach. Moderator decisions flow back as training labels with the crucial constraint that content auto-removed by the model never becomes a positive label on its own, which is what stops the model reinforcing its own false positives. A separate rule and hash-matching layer handles known-bad content within minutes.',
      evaluate:
        'The false-positive rate has to be measured on a stratified sample of legitimate content weighted toward the hard cases, reviewed by humans, because the overall test set is dominated by obviously benign comments and shows a rate ten times better than reality. Before a retrained model is allowed to auto-remove, shadow it against production for a week and have humans review every disagreement, since aggregate precision can hold while precision on one dialect or topic collapses.',
      deploy:
        'Rollback for a model that over-removes must include restoring the removed content and notifying affected users, so the rollback runbook is a data operation and not just a version pin. A coordinated adversarial spike is handled by the rule layer plus a temporary threshold tightening on the affected category, accepting a higher false-positive rate for a few hours, and that decision should be an explicit, logged, reversible action rather than an emergency model retrain.',
      wrapup:
        'The human-in-the-loop boundary sits at auto-remove for high-confidence high-harm categories and human review for everything else, because the harm from missing a high-confidence violent threat is immediate while the harm from removing contested speech is a trust cost that compounds. The first evasion tactic I would expect is character substitution and spacing tricks, and the feedback loop catches it through the random review sample rather than through reports, since evading content generates fewer reports by construction.',
      numbers: [
        '100M comments/day at a 1 percent violation rate = 1M violations; at 95 percent recall and 90 percent precision that is 105K removals of which about 10K are legitimate comments',
        'Human review capacity of 300 items/hour x 500 moderators x 8 hours = 1.2M items/day, so only about 1 percent of all comments can ever be reviewed and the model\'s job is choosing which 1 percent',
        '50ms pre-publish budget allows a distilled transformer of roughly 100M parameters on CPU; the expensive async pass can afford a model 10x larger',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to set different thresholds for different policy categories from the start, because the cost of a false positive on harassment and on political speech are not the same number and one global threshold hides that decision.',
      traps: [
        'Training on user reports. Reports measure how much a comment annoyed people, and organized groups weaponize them, so a model trained on reports learns to suppress minority viewpoints.',
        'Reporting a single overall precision and recall. Performance varies enormously by language, dialect and topic, and an aggregate number conceals a category where the model is unusable.',
        'Letting auto-removed content become training labels, which closes a loop where the model teaches itself that its own mistakes were correct.',
        'Ignoring that rollback means restoring deleted comments. A model version pin does not undo the removals the bad model already performed.',
      ],
      whenPushed: [
        {
          challenge: 'Your model will have higher false positives on African American Vernacular English and on reclaimed slurs.',
          answer:
            'That is a documented failure of toxicity classifiers and I would treat it as a launch blocker, not a caveat. It means per-dialect evaluation slices with their own thresholds, labelers who share the relevant linguistic context, and reporting disaggregated metrics. If I cannot measure the slice I should not claim the model is safe on it.',
        },
        {
          challenge: 'Why not just review everything with humans?',
          answer:
            'The arithmetic does not allow it: a hundred million comments a day against a review capacity around a million. The model\'s real job is to allocate that 1 percent of capacity where it does the most good, which means uncertainty-weighted, reach-weighted prioritization rather than acting as the final decision-maker.',
        },
        {
          challenge: 'How do you evaluate a model on a policy that changed last week?',
          answer:
            'The old labels are now wrong, and I would not silently retrain on them. The process is to relabel a fresh sample under the new policy, measure the model against that, and accept a period of degraded performance in that category. Pretending a policy change is a distribution shift the model will absorb is how moderation systems drift from their own written rules.',
        },
      ],
    },
    diagram: `flowchart TD
  C["New comment"] --> FAST["Fast multi-label classifier: 50ms"]
  FAST -->|high confidence, high harm| RM["Auto remove"]
  FAST -->|otherwise| PUB["Published"]
  PUB --> SLOW["Expensive async pass"]
  HASH[("Known-bad hashes and rules")] --> FAST
  SLOW -->|score near per-category threshold| Q["Review queue: uncertainty x reach"]
  RS["Random sample for unbiased measurement"] --> Q
  Q --> MOD["Moderators"]
  MOD -->|only human decisions become labels| TS[("Training set")]
  RM -.->|never a positive label on its own| TS
  TS --> TRN["Retrain"]
  TRN -->|shadow week, humans review disagreements| FAST
  RM -.->|rollback restores content| PUB`,
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
    solution: {
      define:
        'Do not classify truth. Classify a triage priority from signals that are actually observable: source credibility history, virality pattern anomalies, coordinated-sharing signatures, and similarity to already-debunked claims. A determination requires a human fact-checker, and the model\'s job is to get the right article in front of them within an hour of it starting to spread, which is when intervention still changes anything. Suppressing a true story is worse than slowly labelling a false one, so nothing is removed on model score alone.',
      data:
        'Fact-checker verdicts are extremely sparse, a few thousand against millions of articles, and they are also biased toward what someone already suspected. Extend coverage with weak supervision: claim-matching against a database of already-checked claims, which handles the large fraction of misinformation that is recycled, plus source-level priors learned from that source\'s past verdicts. Fresh breaking stories have neither, which is the honest gap.',
      architecture:
        'A streaming pipeline scores every article and post on spread dynamics: an unusually fast early-share curve from a tightly connected account cluster is a stronger signal of coordination than any text feature. Text goes through a claim-extraction step and an embedding match against the debunked-claim index, which is the highest-precision path and should be the first thing built. Everything above a threshold enters a fact-checker queue prioritized by projected reach. Breaking stories with no verdict get a friction treatment, such as a prompt before sharing, rather than a label asserting falsehood.',
      evaluate:
        'Precision must be evaluated on the reviewed set, which is itself the biased sample the model selected, so I would reserve a randomly sampled review budget to get an unbiased estimate of both precision and, crucially, what the model is missing. Fairness is evaluated by measuring flag rates by topic and by political valence of the source, and any systematic asymmetry has to be explainable by verified verdict rates rather than assumed to be signal.',
      deploy:
        'Pre-verdict actions are limited to reduced distribution and a friction prompt, never removal, because the model\'s error mode on a breaking true story is exactly the case where suppression is most damaging. If systematic bias is found post-deployment, the rollback is to disable the automated distribution reduction while keeping the triage queue, since the queue is useful even when the automated action is not.',
      wrapup:
        'The human-review boundary sits at every determination, which accepts a coverage gap: the vast majority of misinformation is never reviewed and is handled only by claim matching and source priors. The first fairness check I would run before scaling is flag rate by source political valence, holding verified verdict rate constant, because a system that flags one side disproportionately without a matching difference in verdicts is a system that will and should lose public trust.',
      numbers: [
        '10M articles/day against a fact-checking capacity of roughly 500 checks/day means the model can surface 0.005 percent, so triage precision at the very top of the ranking is the only metric that matters',
        'Claim matching against a database of 100K debunked claims covers a large share of recycled misinformation at high precision, and it is the cheapest component to build',
        'A verdict typically arrives 24 to 72 hours after publication, by which time most of an article\'s spread has already happened, which is why pre-verdict friction exists at all',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to reframe the problem immediately: this system does not determine truth, it prioritizes a scarce fact-checking capacity, and designing it as a truth classifier is the mistake that makes everything downstream indefensible.',
      traps: [
        'Framing it as a binary true-or-false classifier. There is no label for truth at scale, the training data would be a few thousand verdicts, and the failure mode is a confident model suppressing accurate reporting.',
        'Training only on fact-checked articles. Those were selected for checking because someone already suspected them, so the model learns what fact-checkers investigate rather than what is false.',
        'Ignoring spread dynamics in favour of text features. Coordinated inauthentic amplification is far more detectable and far harder to evade than the wording of a headline.',
        'Taking removal action pre-verdict, which turns a model error on a breaking true story into censorship of accurate news.',
      ],
      whenPushed: [
        {
          challenge: 'Source credibility scores encode the political judgements of whoever assigned them.',
          answer:
            'They do, and I would not pretend otherwise. The mitigation is deriving source priors from verified verdict history rather than from an editorial rating, publishing the methodology, and monitoring for asymmetric outcomes. It is still a value-laden input, and I would want it reviewable by people outside the ML team rather than tuned quietly.',
        },
        {
          challenge: 'What about a claim that is genuinely disputed among experts?',
          answer:
            'The system should not act on it at all. Claim matching returns a verdict only for claims with a clear check, and a disputed claim should produce a contextual link rather than a label. Treating scientific uncertainty as misinformation is how these systems lose legitimacy, and the design has to have an explicit no-action state rather than forcing every input into a verdict.',
        },
        {
          challenge: 'Bad actors will study your virality signals and spread more slowly.',
          answer:
            'That is a real adaptation and, unusually, a partial win: slowing coordinated spread reduces reach even if detection drops. But it does mean the detector degrades, so I would rely on an ensemble across account-network features, claim matching and content signals, and I would expect to keep updating it rather than reaching a stable solution.',
        },
      ],
    },
    diagram: `flowchart TD
  A["Article or post"] --> SPR["Spread dynamics: early share curve, account clustering"]
  A --> CLM["Claim extraction"]
  CLM -->|embedding match| DB[("Debunked claim index")]
  SRC[("Source verdict history prior")] --> TRI["Triage score"]
  SPR --> TRI
  DB --> TRI
  TRI -->|ranked by projected reach| FQ["Fact-checker queue"]
  RAND["Random review budget"] -->|unbiased precision and recall| FQ
  FQ --> FC["Human fact-checker"]
  FC -->|verdict| DB
  FC --> SRC
  TRI -.->|pre-verdict: friction prompt and reduced distribution only| DIST["Distribution"]
  FC -->|confirmed false| LBL["Label plus context link"]
  TRI --> FAIR["Flag rate by source valence: fairness monitor"]`,
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
    solution: {
      define:
        'Target 500ms time to first token with token streaming thereafter, because perceived responsiveness is TTFT and users tolerate a slow completion far better than a slow start. Conversations can run to hundreds of turns, well past the context window, so a history strategy is mandatory rather than optional. Safety behaviours are enforced by a separate moderation model on both input and output, not by prompt instructions alone, since the system prompt is exactly what an adversarial user is trying to defeat.',
      data:
        'Conversations are stored per conversation id with messages as an ordered list, plus a rolling summary and a set of extracted durable facts. Each turn sends the system prompt, the summary, the last N verbatim turns and any retrieved facts, rather than the full history, so the token bill grows with conversation length far more slowly than linearly. Logging for safety review is separated from logging for product analytics, with different retention and access controls, because conflating them is how a privacy incident happens.',
      architecture:
        'The request path is: moderation check on input, prompt assembly, route to a model tier, continuous-batched generation with tokens streamed to the client over SSE, and a streaming output moderation pass that can truncate mid-generation. Output moderation must run on partial output, because waiting for the full completion to check it destroys the streaming experience. Long conversations are handled by summarizing older turns into the rolling summary once total tokens exceed a threshold, keeping the last few turns verbatim since recency dominates coherence. Routing sends short and simple turns to a smaller model with an escalation path on low confidence.',
      evaluate:
        'Open-ended quality has no ground truth, so use a fixed eval set of a few thousand prompts scored by an LLM judge with human calibration on a sample, plus pairwise preference on live traffic where possible. For regressions after a prompt or model change, the fastest signals are refusal rate, average response length and thumbs-down rate, all of which move within hours, while judge scores take a full eval run.',
      deploy:
        'System prompt changes are versioned and pinned per conversation, so an in-flight conversation does not change personality mid-thread, and new conversations pick up the new version at a ramp. If the primary model is degraded, fall back to a smaller model with an explicit notice rather than silently, because users notice a quality drop immediately and an unexplained one damages trust more than an acknowledged one.',
      wrapup:
        'To ship in two weeks I would cut model routing and the summarization strategy, using a single model with simple truncation of old turns, since both are optimizations over a product that works without them. The assumption to test first is conversation length distribution: if the median conversation is six turns, the entire summarization system is engineering for a tail that barely exists.',
      numbers: [
        '500 tokens of context per turn growing to 50 turns = 25K tokens by turn 50 without summarization; a rolling summary caps it near 4K, an 80 percent cost reduction on long chats',
        '30 tokens/sec streaming means a 600-token answer takes 20 seconds to finish, so TTFT of 500ms is what makes the wait acceptable',
        '100M messages/day x 1.5K average tokens = 150B tokens/day; a 20 percent shift to a model that is 10x cheaper saves roughly 18 percent of total inference cost',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to design backwards from time to first token and from what happens when a conversation outgrows the context window, because those two constraints shape the serving path and the storage model respectively.',
      traps: [
        'Sending the whole conversation on every turn. Cost and latency grow quadratically over a long chat, and it is the single most expensive mistake in this design.',
        'Running output moderation only after generation completes, which either delays the stream entirely or means unsafe tokens already reached the user.',
        'Relying on the system prompt for safety. Prompt injection is a solved attack, and a separate classifier on input and output is the answer the interviewer wants.',
        'Changing the system prompt globally and instantly, so users in the middle of a conversation see the assistant\'s behaviour change between two messages.',
      ],
      whenPushed: [
        {
          challenge: 'Summarizing history loses information the user will expect you to remember.',
          answer:
            'It does, and users notice precisely when it drops a detail they mentioned twenty turns ago. That is why I keep a separate extracted-facts store alongside the prose summary: names, preferences and constraints are stored structurally and always injected, while the narrative is compressed. It is still lossy, and I would rather be lossy on narrative than on facts.',
        },
        {
          challenge: 'How do you evaluate whether a new model is actually better?',
          answer:
            'Pairwise preference, not absolute scores. Serve both to a traffic slice and compare, or run the fixed eval set through a judge in a pairwise setup, since judges are far more reliable at ranking two answers than at scoring one. I would also calibrate the judge against human raters on a sample, because judges have known biases toward longer and more confident answers.',
        },
        {
          challenge: 'Your moderation pass adds latency to every request.',
          answer:
            'The input check is a small classifier at a few milliseconds, which is affordable. The output check runs concurrently with generation on token windows rather than blocking, so it adds nothing to TTFT and only risks a truncation mid-stream. The residual cost is that a truncated response is a visible, jarring failure, and I would rather have that than an unmoderated one.',
        },
      ],
    },
    diagram: `flowchart TD
  U["User turn"] --> MIN["Input moderation classifier"]
  MIN --> ASM["Prompt assembly"]
  SP[("Versioned system prompt, pinned per conversation")] --> ASM
  SUM[("Rolling summary plus extracted facts")] --> ASM
  HIST[("Last N turns verbatim")] --> ASM
  ASM --> RT["Router: small or large model"]
  RT --> GEN["Continuous batched generation"]
  GEN -->|SSE token stream| U
  GEN -->|windows of partial output| MOUT["Streaming output moderation"]
  MOUT -.->|violation: truncate mid-stream| U
  GEN --> STORE[("Conversation store")]
  STORE -->|over token threshold| SUMJ["Summarize older turns"]
  SUMJ --> SUM
  GEN --> SLOG[("Safety log: separate retention and access")]`,
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
    solution: {
      define:
        'Inline completion has a hard budget of about 200ms end to end, because beyond that the developer has already typed past it, while chat can take several seconds since the user is waiting deliberately. Completion context is the current file around the cursor plus a handful of retrieved related files; whole-repository context is neither affordable nor usually helpful at that latency. The absolute constraint is that no user\'s private repository content can influence another user\'s completion, which rules out cross-tenant caching of anything derived from code.',
      data:
        'The repository is indexed per tenant: chunked by syntactic unit using a parser rather than by line count, embedded, and stored in a per-tenant index namespace. Symbol and import graphs are indexed separately, because for completions the most useful context is usually the definition of the symbol under the cursor, which a graph lookup finds more reliably and far faster than embedding similarity. Telemetry records completion shown, accepted and whether the accepted text survived in the file after several minutes, with code content logged only under explicit opt-in.',
      architecture:
        'Completion path: on keystroke, debounce, assemble a prompt from the prefix and suffix around the cursor (fill-in-the-middle), plus definitions of referenced symbols pulled from the local index, and call a small fast model with a low token limit. The important optimizations are speculative prefetch on pause, aggressive client-side caching keyed by prefix, and cancelling in-flight requests on the next keystroke. Chat path: a full retrieval pass over the tenant index with reranking, a larger model, and streaming. Tenant isolation is enforced at the index namespace and at the request level with a tenant-scoped token, and prompt caches are keyed including the tenant id so a shared prefix cache can never cross a boundary.',
      evaluate:
        'Acceptance rate is the easy metric and it is misleading, because a developer accepts a plausible completion and deletes it thirty seconds later. The better metric is retention: the fraction of accepted characters still present in the file after five minutes and after a commit. For isolation, run an automated adversarial test that indexes a canary string in tenant A and queries tenant B for it under concurrent load, on every deploy.',
      deploy:
        'A new completion model ships behind a latency gate: it must meet the p95 budget on a replay of real requests before any traffic, since a completion model that is 100ms slower will feel broken regardless of quality. If the low-latency path degrades, disable completions entirely with a status indicator rather than serving slow ones, because a completion that arrives after the developer has typed the line is worse than none.',
      wrapup:
        'Context for completions comes from symbol-graph lookups plus a small local embedding search, costing roughly 20ms of the budget, which is the right trade against whole-repository retrieval that would cost more than the generation itself. If acceptance rate dropped after a model update, the first thing I would check is whether latency regressed, because acceptance is strongly latency-sensitive and a quality-looking drop is very often a speed problem.',
      numbers: [
        '200ms budget: 20ms context assembly, 30ms network, 150ms model, which caps generation at roughly 50 tokens on a small model and rules out anything large',
        'A developer typing at 300 characters/minute with 300ms debounce triggers about 15 completion requests/minute, so 100K active developers = 25K requests/sec at peak',
        'Prefix caching cuts prefill cost by 60 to 80 percent on repeated requests within a file, but only when the cache key includes the tenant, which forbids sharing across customers',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to treat inline completion and chat as two different systems sharing an index, because a 200ms budget and a several-second budget lead to completely different retrieval and model choices.',
      traps: [
        'Retrieving whole-repository context for inline completion. The retrieval alone can exceed the entire latency budget, and the symbol under the cursor is usually the context that actually matters.',
        'Optimizing acceptance rate. It rewards plausible-looking completions, and the metric that correlates with value is whether the accepted code is still there later.',
        'Sharing a prompt or KV cache across tenants for efficiency. It is a genuine cross-customer leak and it is the specific thing this question is testing.',
        'Chunking code by fixed token count. Splitting a function in half produces embeddings for fragments that mean nothing; chunking on syntactic boundaries is a real quality difference.',
      ],
      whenPushed: [
        {
          challenge: 'Why not run the completion model locally on the developer\'s machine?',
          answer:
            'It removes network latency and the isolation problem entirely, and I would offer it. The trade is model size: a laptop can run a few billion parameters, and completion quality is noticeably better at larger sizes. I would use local as the degraded fallback and for offline work, not as the default.',
        },
        {
          challenge: 'How do you handle a monorepo with ten million files?',
          answer:
            'Index incrementally from the version control change stream rather than by periodic full scans, and scope retrieval by proximity in the import graph rather than searching globally. A global embedding search over ten million chunks is both slow and low precision; the developer is almost always working within a small neighbourhood of the dependency graph.',
        },
        {
          challenge: 'Your telemetry collects code, which customers will object to.',
          answer:
            'Correct, and the default must be that code is never logged. What I collect by default is metadata: acceptance, latency, language, and retention, none of which contains source. Content collection is opt-in per organization with a clear retention policy, and I would rather lose the training signal than ship a default that a security review would reject.',
        },
      ],
    },
    diagram: `flowchart TD
  ED["Editor cursor"] -->|debounce, cancel in-flight| CMP["Completion path: 200ms budget"]
  CMP -->|symbol under cursor| SG[("Per-tenant symbol and import graph")]
  CMP -->|prefix and suffix| FIM["Fill-in-the-middle prompt"]
  SG --> FIM
  FIM --> SM["Small fast model"]
  SM -->|prefix cache keyed WITH tenant id| KV[("Prompt cache")]
  SM --> ED
  CH["Chat request"] --> RET["Retrieval plus rerank over tenant index"]
  RET --> IDX[("Per-tenant chunk index: syntactic chunks")]
  RET --> LM["Large model, streaming"]
  LM --> CH
  VCS["Version control change stream"] -->|incremental reindex| IDX
  ED -->|shown, accepted, still present at 5 min| TEL[("Telemetry: metadata only by default")]
  CMP -.->|latency budget missed| OFF["Disable completions with indicator"]`,
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
    solution: {
      define:
        'Sources are the document management system, wiki, ticketing and email archives, each with its own permission model, and the binding constraint is that retrieval must never surface a chunk the asking user cannot already read. Answer latency budget is 3 seconds, which allows hybrid retrieval plus a reranking pass but not multiple generation rounds. Every answer must carry citations to specific documents, because an uncited answer in an enterprise setting is unusable for anything consequential.',
      data:
        'Chunks are 300 to 500 tokens with overlap, split on document structure rather than fixed length, and each chunk carries a denormalized copy of its source document\'s access control list plus the document id and version. Storing the ACL on the chunk is what makes filtering a pre-retrieval index constraint rather than a post-retrieval scan, which matters enormously: filtering after retrieval means fetching top-k and discarding most of it, so you get fewer usable results than you asked for. Indexes are BM25 plus dense vectors, both refreshed from each source\'s change feed.',
      architecture:
        'Query rewriting expands the question using conversation context, then hybrid retrieval runs BM25 and vector search in parallel with the user\'s permission set applied as a filter inside the index query, fused by reciprocal rank fusion, then a cross-encoder reranks the top 50 to the top 8. Those 8 chunks plus the question go to the model with an instruction to answer only from the provided context and to cite chunk ids. Retrieved content is untrusted input, so it is delimited and the system prompt states that instructions inside retrieved documents must be ignored, with an output check that the cited ids actually appear in the retrieved set.',
      evaluate:
        'The gold set needs two layers: retrieval questions with known relevant document ids, scored by Recall@8 and MRR, and answer questions with reference answers, scored for faithfulness by an LLM judge that receives the retrieved context and checks every claim against it. To catch a citation that was never retrieved, validate the cited ids programmatically against the retrieval result rather than trusting the model, which turns a hallucinated citation from an undetectable problem into a hard error.',
      deploy:
        'A permission change must invalidate retrieval immediately, so the permission filter reads live from the identity system or from a cache with a very short TTL rather than from the indexed ACL copy, and the indexed copy is a fast-path filter that is always intersected with the live check. If retrieval finds nothing above a relevance threshold, the system says it does not know and offers the closest documents, because falling back to the model\'s parametric knowledge in an enterprise context produces confident answers about a company\'s policies that were invented.',
      wrapup:
        'The test that would convince me access control cannot be bypassed is an automated red-team suite where a low-privilege user asks, in many phrasings including direct prompt injection, for content only a high-privilege user can see, asserting zero leakage across thousands of attempts on every deploy. Skipped for a first version: multi-hop reasoning across documents, table and image understanding, and per-source freshness SLAs.',
      numbers: [
        '10M documents x 20 chunks = 200M chunks; at 768 dimensions in float16 that is 300GB of vectors, so a sharded HNSW index across several nodes',
        '3-second budget: 200ms retrieval, 300ms reranking of 50 candidates with a cross-encoder, and about 2 seconds of generation for a 300-token answer',
        'Retrieving 50 and reranking to 8 costs 300ms and typically lifts Recall@8 by 10 to 20 points over pure vector top-8, which is the best return on latency in this pipeline',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to make permission filtering part of the retrieval query rather than a post-processing step, because filtering after retrieval both leaks and silently reduces your result count, and in an enterprise deployment that decision matters more than the model choice.',
      traps: [
        'Filtering by permissions after retrieval. Ask for the top 10, discard 7 the user cannot see, and you have both a design that scales badly and a system one bug away from leaking.',
        'Caching answers across users. Two users with different permissions asking the same question must get different answers, and a naive semantic cache is a direct leak.',
        'Treating retrieved documents as trusted input. A document containing instructions is a prompt injection vector, and in an enterprise anyone who can create a wiki page can attempt it.',
        'Falling back to model knowledge when retrieval fails, which produces a fluent, confident and entirely invented company policy.',
      ],
      whenPushed: [
        {
          challenge: 'Your indexed ACLs go stale the moment someone is removed from a group.',
          answer:
            'They do, which is why the indexed ACL is a fast pre-filter and the authoritative check is a live intersection against the identity system at query time. The index narrows candidates; the live check decides. The cost is a lookup per query, and the alternative, trusting the index, means a revoked user keeps access until reindexing catches up.',
        },
        {
          challenge: 'How do you know the answer is actually grounded in the citations?',
          answer:
            'I verify mechanically what I can and judge the rest. Cited ids must exist in the retrieved set, which is a hard check. Whether the claim is supported by the cited chunk is scored by a judge on an eval set and sampled in production. Fluent text with a real citation that does not support it is the hardest failure to detect and the one worth sampling for continuously.',
        },
        {
          challenge: 'Users will ask questions that span twenty documents.',
          answer:
            'Single-pass RAG handles those badly and I would say so rather than claim otherwise. It needs multi-hop retrieval or a map-reduce over documents, which multiplies latency and cost. For a first version I would detect breadth from the query and tell the user this needs a broader search, offering a slower deliberate mode, rather than silently answering from eight chunks.',
        },
      ],
    },
    diagram: `flowchart TD
  U["User question"] --> QR["Query rewrite with conversation context"]
  QR --> BM["BM25 arm"]
  QR --> VEC["Vector arm"]
  ACL[("Live permission set from identity system")] -->|filter INSIDE the index query| BM
  ACL --> VEC
  BM --> RRF["Reciprocal rank fusion: top 50"]
  VEC --> RRF
  RRF --> RR["Cross-encoder rerank to top 8"]
  RR -->|delimited as untrusted data| GEN["LLM: answer only from context, cite chunk ids"]
  GEN --> CHK["Verify cited ids exist in retrieved set"]
  CHK -->|pass| ANS["Cited answer"]
  RR -.->|nothing above threshold| IDK["Say I do not know plus nearest documents"]
  SRC[("DMS, wiki, tickets, email")] -->|change feed| CHUNK["Chunk with denormalized ACL"]
  CHUNK --> BM
  CHUNK --> VEC`,
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
    solution: {
      define:
        'Answer from documentation only in v1; actions like refunds require an explicit tool with its own authorization and a confirmation step, and mixing the two in one uncontrolled loop is where these products cause real damage. Target escalation rate is 30 to 40 percent, and a suspiciously low rate means the bot is answering things it should not. The bot must never state a policy that is not in a retrieved document, which is a verifiable property rather than an aspiration.',
      data:
        'Documentation is chunked on section boundaries with the heading path preserved in the chunk text, because a policy paragraph is meaningless without knowing which product and region section it sits under, and that is the most common source of confidently wrong support answers. Each chunk carries product, locale, version and effective date. Conversation history is compressed into a short structured state (identified issue, product, order id, steps tried) rather than passed verbatim, so the prompt stays small and the retrieval query stays focused.',
      architecture:
        'Each turn: update the structured state from the new message, build a retrieval query from the state rather than from the raw last message, run hybrid retrieval filtered by the customer\'s product and locale, rerank, and generate an answer constrained to the retrieved text with citations. A confidence check gates the response: low maximum reranker score, conflicting retrieved chunks, or a detected high-risk intent such as a billing dispute all trigger escalation with the full structured state handed to the agent. Actions are separate tools with schema-validated inputs, and any irreversible one requires an explicit user confirmation and is logged.',
      evaluate:
        'The gold set is real support tickets with the resolution the human agent gave, converted into question and reference-answer pairs, which is far more representative than questions written by the team. Faithfulness is judged per claim against retrieved context. To catch a hallucinated policy before a customer sees it, run an automated check that every policy-like statement in the answer has textual support in a retrieved chunk, and route failures to human review.',
      deploy:
        'Documentation changes trigger reindexing of the affected chunks within minutes off the CMS change feed, and answers cache with a key that includes the doc version so a policy change invalidates cached answers rather than serving the old policy. Escalation adequacy is measured by sampling non-escalated conversations for human review and counting how many should have escalated, since the metric everyone tracks, escalation rate, tells you nothing about whether the retained conversations went well.',
      wrapup:
        'The escalation trigger is a combination of retrieval confidence, contradiction detection and a hard intent-based list, which manages the risk that a fluent answer with no supporting document reaches a customer. The failure I would expect first in production is a stale or superseded policy chunk retrieved with high confidence, which is caught by the effective-date filter and by sampling answers about recently changed policies specifically.',
      numbers: [
        '1M support conversations/month with 35 percent escalation = 350K human-handled, versus 1M before, which at 10 minutes per contact is roughly 108K agent-hours saved per month',
        'Documentation of 5K articles x 8 chunks = 40K chunks, small enough that retrieval quality comes from chunking and reranking rather than from index scale',
        'A 3 percent hallucinated-policy rate on 650K automated conversations is 19,500 wrong policy statements a month, which is why the mechanical grounding check matters more than the model choice',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to fix the boundary between answering and acting first, because a bot that can issue refunds is a fundamentally different risk profile from one that quotes documentation, and the design differs from that point onward.',
      traps: [
        'Retrieving on the raw last message. In a multi-turn conversation the last message is often just yes or the order number, and retrieval on it returns nothing useful; the query has to be built from accumulated state.',
        'Chunking documentation without preserving the heading hierarchy, so a paragraph about refunds for one region is served as the answer for another.',
        'Treating a low escalation rate as success. It usually means the bot is confidently answering questions it should be handing over.',
        'Caching answers without keying on documentation version, so a policy change is invisible to every customer who asks a previously-cached question.',
      ],
      whenPushed: [
        {
          challenge: 'Customers will get frustrated by escalation. Why not let the bot try harder?',
          answer:
            'Because the cost is asymmetric: a wrong policy statement creates a commitment the company either honours at a loss or reneges on at a trust cost, and either is worse than a transfer. I would rather reduce escalation by improving retrieval and documentation coverage than by loosening the confidence gate, and I would measure which documentation gaps drive escalations.',
        },
        {
          challenge: 'How do you stop a user from talking the bot into a refund it should not give?',
          answer:
            'By not making the refund a function of the conversation. The refund tool has its own eligibility check against order state and policy, executed in code, and the model can only request it. If the check fails, no amount of persuasion changes the outcome. Any design where the model\'s judgement is the authorization is one prompt away from being exploited.',
        },
        {
          challenge: 'Your structured state extraction will lose nuance from the conversation.',
          answer:
            'It will, and the mitigation is to keep the last two turns verbatim alongside the state so the immediate nuance survives while older context is compressed. When it fails, it fails on unusual multi-issue conversations, which is also exactly the population that should be escalating anyway, so the failure modes align reasonably well.',
        },
      ],
    },
    diagram: `flowchart TD
  M["Customer message"] --> ST["Update structured state: issue, product, order id, steps tried"]
  ST -->|query built from state, not last message| RET["Hybrid retrieval"]
  RET -->|filter by product, locale, effective date| IDX[("Doc chunks with heading path")]
  RET --> RR["Rerank"]
  RR --> CONF["Confidence gate"]
  CONF -->|low score, conflicting chunks, or high-risk intent| ESC["Escalate with full state to agent"]
  CONF -->|confident| GEN["Answer constrained to retrieved text, with citations"]
  GEN --> GRD["Grounding check: every policy claim has support"]
  GRD -->|fail| ESC
  GRD -->|pass| C["Customer"]
  TOOL["Action tools: eligibility checked in code"] -->|explicit confirmation, logged| C
  GEN -.->|cached with doc version in key| CACHE[("Answer cache")]
  CMS["Docs change feed"] -->|reindex in minutes| IDX`,
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
    solution: {
      define:
        'Support both exact-quote lookup and topical search, which is precisely why this cannot be a pure vector search product: quotes need lexical matching and topics need semantic. New episodes must be searchable within 30 minutes of publication. Results must deep-link to a timestamp accurate to about 5 seconds, which is achievable if chunk boundaries carry word-level timing.',
      data:
        'Transcription with word-level timestamps from a Whisper-class model plus speaker diarization. Chunking is on semantic topic boundaries detected from the transcript rather than fixed length, with 30 seconds of overlap, because a fixed-length split in the middle of an anecdote produces embeddings that match nothing. Each chunk stores start and end timestamps, speaker labels, episode and show ids, and the raw text for lexical indexing. Word-level timing is retained so a matched quote can be located precisely inside its chunk rather than only to the chunk start.',
      architecture:
        'Ingestion is a pipeline per episode: fetch audio, transcribe, diarize, segment, embed, and write to both a BM25 index and a vector index. Query time runs both retrievers in parallel and fuses with reciprocal rank fusion, which handles the mixed intent without needing to classify the query first, though a quoted phrase in the query boosts the lexical arm. Ranking then combines the fused score with recency and show popularity, and for an exact-quote match the timestamp is refined by locating the matched phrase in the word-level timing rather than returning the chunk start.',
      evaluate:
        'The gold set needs both query types held separately, since a single averaged metric hides that the system is good at one and poor at the other: exact-quote queries scored by whether the correct moment is in the top result, topical queries by NDCG over human-judged relevance. Timestamp precision is measured as the absolute error between the returned timestamp and the human-marked true start of the relevant passage, reported as a distribution because the tail is what users complain about.',
      deploy:
        'A chunking strategy change requires reprocessing the archive, which is expensive, so run the new strategy for new episodes immediately and backfill the archive in popularity order, keeping both index versions live behind a fused query during the migration. If transcription for a new episode lags, publish it as searchable on metadata alone with a clear indicator, rather than making it entirely invisible, since a listener searching for a show they know just released expects to find it.',
      wrapup:
        'Topic-boundary chunking with overlap trades some quote-level precision, since a quote can straddle a boundary, for much better topical retrieval, and the word-level timing index buys back the quote precision at query time. If users complained about wrong timestamps, the first thing I would examine is diarization and alignment on episodes with crosstalk, because overlapping speakers are where word-level timing degrades most.',
      numbers: [
        '5M episodes x 45 minutes = 3.75M hours; transcription at roughly 0.1x realtime on a GPU = 375K GPU-hours for a full archive pass, which is why a chunking change is a serious cost decision',
        '45-minute episode at 150 words/minute = 6,750 words, chunked into roughly 25 segments, so 5M episodes = 125M chunks to index',
        '30-minute publish-to-searchable target for a 45-minute episode means the pipeline must run at better than 1.5x realtime end to end including embedding and indexing',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to establish that this has two distinct query intents, exact quotes and topics, because that single fact forces hybrid retrieval and shapes both the chunking and the evaluation.',
      traps: [
        'Using vector search alone. Someone searching for a phrase they remember hearing needs lexical matching, and embeddings will return topically similar passages that do not contain it.',
        'Chunking at fixed token counts, which splits an argument or a story in half and produces embeddings that represent neither part well.',
        'Returning the chunk start as the timestamp. If chunks are two minutes long, the user lands ninety seconds before the thing they searched for and concludes the product is broken.',
        'Ignoring transcription errors. Proper nouns and technical terms are where ASR fails, and those are disproportionately what people search for, so the index needs a phonetic or fuzzy fallback.',
      ],
      whenPushed: [
        {
          challenge: 'Transcription is your biggest cost. How do you reduce it?',
          answer:
            'Transcribe on demand for the long tail rather than eagerly for the whole archive. Index metadata and any publisher-provided transcript first, and run full transcription for a show once it receives its first searches. Most podcast archives have extremely skewed listenership, so this can cut the bill by an order of magnitude at the cost of a delay on the first search for an obscure show.',
        },
        {
          challenge: 'How do you handle a query where the user misremembers the quote?',
          answer:
            'That is where the hybrid fusion earns its place: the lexical arm fails and the dense arm still finds the passage by meaning. I would also apply query expansion with a paraphrase, and set expectations in the interface by showing surrounding context so a near-miss is still recognizable rather than looking like a wrong result.',
        },
        {
          challenge: 'Overlapping chunks mean the same passage appears multiple times in results.',
          answer:
            'It does, and de-duplication has to happen at ranking: collapse results from the same episode within a time window into one, keeping the highest-scoring, and expand on click. Without that the top ten is three passages shown three times each, which looks worse than a lower-recall system.',
        },
      ],
    },
    diagram: `flowchart TD
  EP["New episode audio"] --> ASR["Transcribe with word-level timestamps"]
  ASR --> DIA["Speaker diarization"]
  DIA --> SEGM["Topic-boundary chunking, 30s overlap"]
  SEGM --> BM[("BM25 index: raw text")]
  SEGM --> VEC[("Vector index: chunk embeddings")]
  SEGM --> WT[("Word-level timing store")]
  Q["Query"] --> LEX["Lexical arm: exact quotes"]
  Q --> DNS["Dense arm: topical"]
  LEX --> BM
  DNS --> VEC
  LEX --> RRF["Reciprocal rank fusion"]
  DNS --> RRF
  RRF --> RANK["Rank with recency and show popularity"]
  RANK -->|collapse same-episode duplicates| RES["Results"]
  RANK -->|refine to matched phrase| WT
  WT -->|deep link timestamp| RES`,
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
    solution: {
      define:
        'Classify every tool by reversibility and blast radius, not by risk feeling: reading a document is reversible and low radius, sending an email is irreversible and external, issuing a payment is irreversible and financial. Irreversible external actions require human approval by default; reversible actions run autonomously. The threshold sits deliberately toward blocking, because the cost of an unnecessary approval prompt is seconds and the cost of a wrongly sent payment is unbounded.',
      data:
        'The audit log records, per step, the model version, the full prompt, the plan, the tool called, the validated arguments, the raw tool result and the outcome, linked by a run id, and it is append-only and retained independently of the agent\'s own storage. Tool permissions are declared as a scope per tool per agent deployment, expressed as concrete constraints such as maximum transaction amount, allowed recipient domains and allowed record types, enforced in the tool implementation rather than in the prompt.',
      architecture:
        'Three layers. Input validation classifies user intent and blocks disallowed requests before the agent runs. Plan review inspects the proposed sequence before execution, checking for irreversible steps and for scope violations, and is where a human approval is inserted if needed. Action-level checks validate the concrete arguments at call time against the tool\'s scope, which is the layer that actually stops damage, since a plan can look benign and the arguments not be. Prompt injection from tool output is contained by treating all tool results as untrusted data: they are delimited, never concatenated into the instruction region, and any action proposed immediately after a tool result that changes the target of the task triggers a re-plan with human review.',
      evaluate:
        'The red-team set has to be built adversarially and kept private: injection payloads embedded in documents, emails and web pages the agent will read, plus scope-escalation attempts and multi-step attacks that only look malicious in combination. Score the approval gate by injecting synthetic irreversible actions into runs and asserting 100 percent are gated, because anything less than 100 percent on that check is a failure rather than a metric.',
      deploy:
        'A new tool goes through a staged rollout: shadow mode where the agent proposes calls that are logged but not executed, then human-approved-only, then autonomous if it qualifies, with the scope constraints validated by a test suite that attempts to exceed them. The kill switch revokes the agent\'s credentials at the tool gateway rather than asking the agent to stop, so it works even when the agent is in a loop, and rollback is per-action compensation where possible, which is exactly why irreversible actions were gated in the first place.',
      wrapup:
        'The action that worries me most is an outbound message to a customer or a regulator, because it is instant, external and unrecallable, and my design does stop it: it is in the irreversible-external class and cannot execute without approval. Under a tight deadline I would cut the plan-review layer and keep input validation plus action-level scope checks, accepting that multi-step attacks that only look wrong in aggregate would get through.',
      numbers: [
        'If 5 percent of actions are irreversible and the agent takes 10 actions per task, roughly 40 percent of tasks hit at least one approval, which is the automation benefit you are trading away',
        'A human approval adds minutes to hours of latency, so the design target is to keep gated actions under 10 percent of steps or the agent is just a slower human process',
        'A red-team suite of 500 injection payloads run on every deploy at a few seconds each is under an hour of CI, which is cheap relative to one unauthorized action',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to classify the tools by reversibility before designing any guardrail, because the entire safety architecture follows from which actions cannot be undone.',
      traps: [
        'Putting the safety rules in the system prompt. Prompt instructions are advisory to a model and invisible to an attacker\'s payload; enforcement has to be in code at the tool boundary.',
        'Validating the plan but not the arguments. A plan that says send a confirmation email is benign until the recipient is an attacker-controlled address, and only an argument-level check catches that.',
        'Treating tool output as trusted. A retrieved document or a fetched web page containing instructions is the primary injection vector for agents, and it must never enter the instruction region of the prompt.',
        'Building a kill switch that asks the agent to stop. It has to revoke credentials at the gateway, because the scenario where you need it is one where the agent is not behaving as instructed.',
      ],
      whenPushed: [
        {
          challenge: 'Human approval destroys the value of automation.',
          answer:
            'It does for a workflow where most steps are irreversible, and in that case I would question whether an agent is the right tool at all. Where it works is when 90 percent of steps are reversible reads and analysis and only the final action needs a human, which is a batching decision: gather everything, then ask once.',
        },
        {
          challenge: 'You cannot enumerate every dangerous action in advance.',
          answer:
            'Correct, so the design defaults to deny: a tool without a declared scope cannot be called, and an argument outside the declared constraint is rejected rather than judged. That converts the problem from anticipating attacks to enumerating permitted behaviour, which is tractable, and it does mean legitimate new use cases require an explicit scope change.',
        },
        {
          challenge: 'How do you detect an injection that succeeds anyway?',
          answer:
            'By watching for divergence: the executed action sequence versus the original task\'s declared goal, and any action whose target was introduced by tool output rather than by the user. That is a detection heuristic with false positives, not a guarantee, and I would pair it with post-hoc review of a sample of runs rather than claiming the injection problem is solved.',
        },
      ],
    },
    diagram: `flowchart TD
  U["User task"] --> IV["Input validation: intent classification"]
  IV --> AG["Agent loop"]
  AG --> PLAN["Plan review: irreversible steps and scope"]
  PLAN -->|contains irreversible external action| HUM["Human approval"]
  PLAN -->|reversible only| GATE
  HUM --> GATE["Tool gateway: action-level argument checks"]
  SCOPE[("Declared tool scopes: amount caps, allowed domains")] --> GATE
  GATE -->|deny by default if no scope| REJ["Rejected"]
  GATE --> TOOL["Tool execution"]
  TOOL -->|result is UNTRUSTED data, never instructions| AG
  AG -.->|target changed by tool output| PLAN
  GATE --> AUD[("Append-only audit log: plan, args, result")]
  KILL["Kill switch"] -->|revokes credentials at the gateway| GATE`,
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
    solution: {
      define:
        'Both the tool calls and the reasoning must be observable, because a wrong final answer is usually explained by a tool that returned something unexpected three steps earlier. Failure is defined concretely as one of: wrong final answer, a loop, exceeding a cost or step budget, or an unauthorized action, and each has a different detection mechanism. Traces must be queryable within 60 seconds of a run ending, and loop detection must be real time rather than post hoc.',
      data:
        'A run is a trace; each step is a span carrying the prompt, model version, output, tool name, tool arguments, tool result, token counts and latency. Storage is keyed by run id with secondary indexes on user, outcome, cost and tool name. Cost is accumulated per run in a live counter, not computed at the end, because the whole point is catching a runaway before it finishes. Prompts and tool results are large, so span payloads over a size threshold are stored by reference to object storage with only a hash inline.',
      architecture:
        'The agent emits spans through an OpenTelemetry-compatible SDK so traces join the existing tracing backend rather than living in a bespoke tool. Loop detection runs inline in the agent loop: hash the (tool name, normalized arguments) pair per step and maintain a small window, and if the same hash repeats three times, or if a semantic embedding of the last three reasoning steps shows near-identical content, halt and escalate. That is a cheap in-process check, which matters because a loop detected by a batch job has already burned the budget. The reviewer view renders the run as a linear timeline with the diff between consecutive states, plus a highlighted first-divergence point where the agent\'s plan stopped matching the task.',
      evaluate:
        'The evaluation suite scores task success against a labelled set of real support tasks, plus steps taken and cost per run, since an agent that succeeds in twenty steps at ten times the cost is not a success. Loop detector quality is measured on a labelled corpus of past runs containing genuine loops and legitimate retries, reporting both catch rate and how often it interrupts a run that would have succeeded, because a detector that kills valid retries is worse than none.',
      deploy:
        'When a session exceeds its cost budget, halt and escalate to a human rather than downgrading the model, because a cheaper model on a task that is already going badly reliably makes it worse. Tool set changes are versioned per run, so an in-flight session keeps the tool schema it started with and traces stay interpretable across the change.',
      wrapup:
        'Loop detection is an in-process repeated-action hash plus a semantic similarity check on recent reasoning, and its false-positive risk is legitimate polling, such as an agent correctly checking an order status three times while waiting, which is handled by exempting explicitly idempotent read tools from the counter. The single metric I would put in front of on-call is escalation-worthy failure rate per hour, meaning loops plus budget breaches plus unauthorized action attempts, because it is the one number that combines every way this agent hurts a customer.',
      numbers: [
        '10K agent runs/day x 12 steps x 2 spans = 240K spans/day, small enough for full retention with no sampling, which is a real advantage over request tracing',
        'Average run at 12 steps x 3K tokens = 36K tokens; a runaway at 100 steps is 300K tokens, roughly 8x cost, which is why the budget cap is per run and enforced live',
        'Loop detection with a window of 3 repeated identical calls catches most loops within about 15 seconds, versus minutes of wasted spend if detected by a batch job',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to define what agent failure actually means in concrete, detectable terms first, because loops, budget overruns and wrong answers need three different mechanisms and a vague definition gets you none of them.',
      traps: [
        'Logging only the final answer. When a support agent gives a wrong answer, the cause is almost always a tool result several steps earlier, and without step-level spans there is nothing to look at.',
        'Detecting loops in a batch job. By the time a nightly job finds it, the agent has already spent the budget and annoyed the customer; the check has to be inline.',
        'Sampling traces the way you sample request tracing. Agent runs are thousands of times less frequent and far more valuable individually, so full retention is both affordable and correct.',
        'Downgrading the model when a run exceeds its budget, which takes a task that is already failing and hands it to a weaker model.',
      ],
      whenPushed: [
        {
          challenge: 'Storing every prompt and tool result is a privacy problem.',
          answer:
            'It is, and traces here contain customer data by definition. That means field-level redaction of identifiers before the span leaves the process, a shorter retention window than ordinary traces, and access control on the trace viewer that matches the support system\'s own. I would rather redact and lose some debuggability than store an unrestricted copy of every customer conversation.',
        },
        {
          challenge: 'How do you know a run succeeded without a human labelling it?',
          answer:
            'I use proxies and I would be clear that they are proxies: no escalation, no repeat contact within 48 hours, and a positive satisfaction response. Those correlate with success and can be gamed by an agent that closes conversations. That is why the labelled eval set exists alongside them and why I would sample runs for human grading continuously.',
        },
        {
          challenge: 'Semantic loop detection with embeddings on every step adds latency and cost.',
          answer:
            'It does, roughly a few milliseconds and a small embedding cost per step, which is negligible next to a generation call. The cheap exact-hash check runs first and catches most loops; the semantic check only runs when the hash check has not fired and the step count is already above a threshold, so it costs nothing on normal runs.',
        },
      ],
    },
    diagram: `flowchart TD
  AG["Agent step"] -->|OTel span: prompt, tool, args, result, tokens| COL["Collector"]
  AG --> LOOP["Inline loop check: hash of tool plus normalized args"]
  LOOP -->|same hash 3 times| HALT["Halt and escalate"]
  LOOP -->|above step threshold| SEM["Semantic similarity of last 3 reasoning steps"]
  SEM --> HALT
  AG --> COST["Live per-run cost counter"]
  COST -->|budget exceeded| HALT
  COL --> TS[("Trace store by run id")]
  COL -->|payload over threshold| OBJ[("Object storage, hash inline")]
  TS --> IDX[("Index: user, outcome, cost, tool")]
  IDX --> UI["Reviewer timeline with first-divergence marker"]
  TS --> EVAL["Eval suite: task success, steps, cost per run"]
  AG -->|redact identifiers before export| COL
  IDX --> DASH["On-call metric: escalation-worthy failures per hour"]`,
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
    solution: {
      define:
        'Orchestrator-workers, not a free-form conversation between peers: a planner decomposes the task, assigns subtasks to specialized workers, and aggregates results, because peer-to-peer agent chat has no termination guarantee and no clear place to enforce limits. Hard caps on total steps, wall-clock time and cost, enforced by the orchestrator rather than requested of the agents. A failed worker retries once, then escalates to a human with partial results rather than failing the whole task.',
      data:
        'Shared state is a structured task document in a real store, not a growing conversation transcript: task id, the plan as a DAG of subtasks with status, each subtask\'s typed output, and an append-only event log. Passing structured state instead of transcripts is what keeps context size bounded and makes worker outputs machine-checkable. Each worker\'s output is validated against a JSON schema plus task-specific assertions before the orchestrator accepts it, and a failed validation is a retry with the validation error as feedback, which is far more effective than a plain retry.',
      architecture:
        'The orchestrator produces a plan as an explicit DAG, so independent subtasks run in parallel and dependencies are visible rather than implicit in a conversation order. Workers are stateless and receive only their subtask plus the specific upstream outputs they need, which bounds their context and makes them individually testable. Conflicting writes to shared state are prevented by giving each subtask exclusive ownership of its output slot; nothing writes to another\'s slot, and genuine shared resources are mediated by tools with their own concurrency control. Runaway delegation is capped by a depth limit on the plan and a global step counter checked before every worker dispatch.',
      evaluate:
        'Report end-to-end task success separately from per-worker success, because the interesting number is the gap: workers at 90 percent each across a five-step chain gives 59 percent end to end, and that compounding is the central fact about multi-agent systems. Detect unproductive delegation by tracking whether each step changes the task state; a run where the last three steps produced no state change is looping regardless of how varied the reasoning text looks.',
      deploy:
        'Workers are versioned and addressed through a registry, so a worker can be updated independently of the orchestration graph as long as its input and output schemas hold; the schema is the contract that makes independent deployment possible. If a worker is unavailable, retry with backoff, then route to a fallback worker if one is registered for that capability, and otherwise fail that subtask and let the orchestrator decide whether the task can complete partially.',
      wrapup:
        'Orchestrator-workers fits because this task decomposes into independent specialized subtasks whose results combine, which is exactly where parallelism and specialization pay; a single agent with all the tools would have a bloated context and no parallelism. Before trusting it with anything high-stakes I would drill the partial-failure case: a worker that returns a confidently wrong but schema-valid result, because that is the failure the validation layer cannot catch and the orchestrator will happily build on.',
      numbers: [
        '5 sequential subtasks at 90 percent worker success = 0.9^5 = 59 percent end-to-end success, which is the number that decides whether multi-agent is viable for a task',
        'A single agent at 20K tokens of context versus 5 workers at 4K each = the same total tokens but 5x parallel, cutting wall-clock time roughly 3x after orchestration overhead',
        'Step cap of 50 and cost cap of 200K tokens per task bounds the worst case at roughly 15x the median run, which is the blast radius of a stuck orchestrator',
      ],
    },
    delivery: {
      budget: { requirements: 8, estimates: 5, apiAndData: 12, architecture: 15, deepDive: 16, wrapUp: 4 },
      opening:
        'I want to commit to an orchestrator-workers topology rather than free-form agent conversation, because a peer-to-peer design has no natural termination condition and no single place to enforce a budget.',
      traps: [
        'Passing the full conversation transcript between agents. Context grows with every hop, cost grows with it, and the signal each worker needs is buried in irrelevant history.',
        'Ignoring compounding error. Five 90 percent workers in sequence is a 59 percent system, and any multi-agent design that does not confront that arithmetic is proposing something worse than one good agent.',
        'Letting workers delegate freely to each other, which produces unbounded depth and cycles, and makes the cost of a task impossible to predict.',
        'Accepting worker output because it parses. Schema-valid and correct are different things, and the confidently wrong but well-formatted result is the failure mode this architecture is most prone to.',
      ],
      whenPushed: [
        {
          challenge: 'Would a single agent with all the tools not be simpler and just as good?',
          answer:
            'Very often yes, and I would default to it. Multi-agent earns its complexity in two cases: genuinely parallel subtasks where wall-clock time matters, and subtasks needing different tools or context large enough that one agent\'s context becomes unwieldy. If neither holds, the orchestration overhead buys nothing and adds failure modes.',
        },
        {
          challenge: 'How do you stop the orchestrator hallucinating a plan with steps no worker can do?',
          answer:
            'By constraining planning to a registered capability list: the planner selects from declared worker capabilities with typed inputs and outputs, and a plan referencing an unknown capability is rejected and re-planned. Free-form plan text is where this fails, so the plan is a structured artifact validated before any dispatch.',
        },
        {
          challenge: 'Two workers modifying the same external system will conflict.',
          answer:
            'They will, and the orchestration layer cannot prevent it by convention. The mechanism has to be at the tool: optimistic concurrency with a version check, or a lease on the resource, so a conflicting write fails and becomes a retry rather than silent corruption. Assigning exclusive output slots handles internal state, but shared external systems need real concurrency control.',
        },
      ],
    },
    diagram: `flowchart TD
  T["Task"] --> ORC["Orchestrator: plan as a DAG"]
  CAP[("Registered worker capabilities: typed in and out")] -->|plan may only use these| ORC
  ORC -->|reject unknown capability, re-plan| ORC
  ORC --> DOC[("Task document: DAG, subtask status, typed outputs")]
  ORC -->|dispatch in parallel| W1["Worker A: own output slot"]
  ORC --> W2["Worker B: own output slot"]
  W1 -->|only the upstream outputs it needs| DOC
  W2 --> DOC
  DOC --> VAL["Schema plus assertion validation"]
  VAL -->|failure fed back as retry context| W1
  VAL -->|accepted| ORC
  CAPS["Caps: step count, wall clock, cost, plan depth"] -->|checked before every dispatch| ORC
  ORC -->|retry once then partial results| HUM["Human escalation"]
  W1 -.->|shared external system| LOCK["Tool-level version check or lease"]`,
  },
]
