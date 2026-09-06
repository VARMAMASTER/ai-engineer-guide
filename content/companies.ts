import type { CompanyGuide } from '@/lib/content/schema'

// One page per target company: what the loop actually IS, how it is weighted, and what to
// drill beforehand. Written for a Lead AI Engineer with ~2.5 years of LLM-application work on
// APIs at a startup, based in India and open to relocating. The startup "Lead" title does not
// port to Big Tech leveling — every `level` below is the realistic landing spot, not an
// aspirational one. Ordered by realistic reach for that candidate: the three companies with a
// real India engineering presence come first (Amazon, Microsoft, Google), then Meta (small
// India presence, mostly relocation), then OpenAI and Anthropic (essentially no India
// engineering hiring — stretch, relocation-only targets, not month-six goals).
export const companyGuides: CompanyGuide[] = [
  {
    id: 'co-amazon',
    name: 'Amazon',
    order: 1,
    level:
      'SDE II — Amazon\'s ladder runs SDE I -> SDE II -> Senior SDE, and 2.5 years of shipped ' +
      'production LLM-application work maps to SDE II, not the entry-level SDE I band.',
    rounds: [
      {
        name: 'Online Assessment',
        count: 1,
        minutes: 120,
        what:
          'Two coding problems plus a work-style/workplace-simulation survey, taken solo on an ' +
          'OA platform before any human sees your profile. A hard gate for external candidates ' +
          'without an internal referral.',
      },
      {
        name: 'Hiring Manager / Phone Screen',
        count: 1,
        minutes: 60,
        what:
          'One coding problem plus two Leadership Principle questions with the hiring manager ' +
          'or a bar-adjacent engineer. Decides whether you proceed to the full loop, not a ' +
          'courtesy call.',
      },
      {
        name: 'Onsite Loop — Coding & System Design',
        count: 3,
        minutes: 60,
        what:
          'Three back-to-back 60-minute rounds (typically two coding, one system design). Each ' +
          'interviewer runs one problem in the front half, then spends the back half on two ' +
          'Leadership Principle questions tied to the two or three LPs they were assigned to ' +
          'probe — the LP thread never stops, even in the rounds that look purely technical.',
      },
      {
        name: 'Bar Raiser',
        count: 1,
        minutes: 60,
        what:
          'A specifically trained interviewer from outside your team and org, with veto power ' +
          'over the hire, embedded unlabeled somewhere in the loop. Mostly behavioral, ' +
          'occasionally with light coding. You are never told which interviewer this is, so the ' +
          'safe assumption is that every round could be it.',
      },
    ],
    failsOn: [
      'Nails both coding rounds but gives thin, generalized STAR answers ("we shipped the ' +
        'feature") with no numbers and no personal "I" actions — Amazon rejects strong coders ' +
        'with weak LP evidence far more often than it rejects weak coders with strong LP evidence.',
      'Treats the Bar Raiser round as just another interviewer and saves their sharpest ' +
        'material for the round they assume matters most — because the Bar Raiser is unlabeled, ' +
        'this shows up as inconsistent LP-answer quality across the loop, and the panel notices ' +
        'the gap in debrief.',
      'Runs out of distinct stories — a full loop asks 8 to 10 separate behavioral questions in ' +
        'one day, and reusing the same one or two stories across multiple Leadership Principles ' +
        'reads as a thin work history even when the underlying experience is solid.',
    ],
    drill: [
      'Timed reps on dsap-graphs, dsap-dp-1d and dsap-intervals under a strict 25-35 minute ' +
        'clock, narrating approach and edge cases out loud — Amazon-tagged problems skew toward ' +
        'graph/BFS and interval-scheduling shapes, and the rubric scores the verbalized ' +
        'reasoning as much as the final code.',
      'sdp-caching, sdp-database-choice-indexing, sdp-message-queues and sdp-idempotency-retries ' +
        'for the system design round — Amazon\'s SDE II design bar for external hires skews ' +
        'toward services-and-data-layer problems (queues, retries, idempotent APIs), not ' +
        'ML-system design.',
      'lldq-parking-lot, lldq-rate-limiter and lldq-lru-cache as machine-coding warm-ups — these ' +
        'are common shapes across Amazon-tagged loops when a round leans toward class design ' +
        'over a pure algorithm problem.',
      'Draft and rehearse 12-16 STAR stories out loud, timed under 3 minutes each, each mapped ' +
        'to 2-3 Leadership Principles and backed by a real number in the result — this is the ' +
        'single highest-leverage two weeks of prep for this loop specifically.',
    ],
    marketNote:
      'Amazon runs some of the largest SDE hiring volume in India (Bangalore, Hyderabad, Chennai), ' +
      'including on AI-adjacent teams, which makes SDE II a realistic near-term target rather ' +
      'than a stretch — but the volume comes with a genuinely mechanical LP-interview bar that ' +
      'has nothing to do with coding skill, and that bar is where most India-based candidates with ' +
      'strong technical backgrounds actually lose the loop.',
  },
  {
    id: 'co-microsoft',
    name: 'Microsoft',
    order: 2,
    level:
      'SDE II (roughly Level 62-63) — Microsoft\'s ladder runs 59 (SDE I) -> 61/62 (SDE II) -> ' +
      '63/64 (Senior SDE); 2.5 years of shipped work maps to SDE II, not entry level.',
    rounds: [
      {
        name: 'Recruiter Screen',
        count: 1,
        minutes: 30,
        what:
          'Background and team-fit call. For external candidates without a referral fast-track, ' +
          'the recruiter also sends an Online Assessment link at this stage.',
      },
      {
        name: 'Online Assessment',
        count: 1,
        minutes: 90,
        what:
          'One to two coding problems on an OA platform, used as a pre-loop filter. Often skipped ' +
          'for strong internal referrals, but not for a cold applicant.',
      },
      {
        name: 'Technical Phone Screen',
        count: 1,
        minutes: 60,
        what:
          'One live coding problem with a Microsoft engineer. Some strong-referral pipelines skip ' +
          'this and move straight to the full loop.',
      },
      {
        name: 'Onsite/Virtual Loop — Coding',
        count: 2,
        minutes: 60,
        what:
          'DSA-focused rounds at a solid-and-fast bar rather than the hardest end of the pattern ' +
          'bank, run over Microsoft Teams for most pipelines.',
      },
      {
        name: 'Onsite/Virtual Loop — Design',
        count: 1,
        minutes: 60,
        what:
          'For SDE II this is frequently a low-level/class-design round (extensibility, OOP) ' +
          'rather than a full distributed-systems design; some orgs (Azure, Bing, Copilot) run a ' +
          'true HLD round instead — confirm which with the recruiter before you prep.',
      },
      {
        name: 'As Appropriate (AA) Round',
        count: 1,
        minutes: 45,
        what:
          'Often run by the hiring manager or a senior engineer. Blends behavioral questions on ' +
          'Microsoft\'s culture values (growth mindset, collaboration) with a technical-judgment ' +
          'discussion, and frequently acts as the tie-breaking round on level and outcome.',
      },
    ],
    failsOn: [
      'Prepares only for DSA and is blindsided by the LLD/class-design round — Microsoft\'s SDE ' +
        'II loop leans harder on low-level design than Google\'s or Meta\'s loop does, and a ' +
        'candidate who has only drilled LeetCode has nothing to say when asked to design a class ' +
        'hierarchy.',
      'Under-rates the As Appropriate round as "just HR" and gives generic answers on growth ' +
        'mindset and collaboration — it is frequently the hiring manager\'s own round and can be ' +
        'the deciding factor between an SDE II offer and an SDE I downlevel.',
      'Skips Online Assessment prep because "it\'s just a filter," then loses to time pressure on ' +
        'a problem they could otherwise solve — for a cold external applicant, the OA is a hard ' +
        'gate before any human interview happens at all.',
    ],
    drill: [
      'lldq-parking-lot, lldq-rate-limiter and lldq-lru-cache worked cold in under 60 minutes ' +
        'each, diagram first, then code — these are the shapes Microsoft\'s LLD round draws on ' +
        'most often.',
      'dsap-trees, dsap-graphs, dsap-heap and dsap-sliding-window for the DSA rounds, aiming for ' +
        'clean and fast rather than exotic.',
      'sdp-caching, sdp-message-queues and sdp-observability if your target org (Azure, Bing, ' +
        'Copilot) runs an HLD-style round instead of LLD — ask the recruiter which one applies ' +
        'before committing prep time.',
      'Two or three growth-mindset/collaboration stories rehearsed specifically for the As ' +
        'Appropriate round, kept distinct from your DSA and design prep so they don\'t collapse ' +
        'into the same generic answer.',
    ],
    marketNote:
      'Microsoft runs one of the largest engineering campuses in India (Hyderabad, Bangalore, ' +
      'Noida) and hires SDE IIs regularly into AI-adjacent teams such as Copilot, Azure AI and ' +
      'Bing — alongside Amazon, this is one of the two most realistic near-term targets on this ' +
      'list for someone in this position.',
  },
  {
    id: 'co-google',
    name: 'Google',
    order: 3,
    level:
      'L3 (Software Engineer II) is the realistic landing level at 2.5 years; L4 (Software ' +
      'Engineer III) is the stretch outcome, and the hiring committee — not the recruiter or the ' +
      'interviewers — makes the final level call independently of what was pitched going in.',
    rounds: [
      {
        name: 'Recruiter Screen',
        count: 1,
        minutes: 30,
        what:
          'Non-technical call covering background, target team, and timeline. The recruiter also ' +
          'schedules the phone screen or a Google Hiring Assessment for some pipelines.',
      },
      {
        name: 'Phone Screen',
        count: 1,
        minutes: 45,
        what:
          'One Google engineer, one coding problem on a shared doc with no code execution — ' +
          'roughly 35 minutes of real coding time after intro and problem setup. Deliberately ' +
          'calibrated a notch below the onsite bar; it is a gate, not the real evaluation.',
      },
      {
        name: 'Onsite — Coding',
        count: 3,
        minutes: 45,
        what:
          'Two to three back-to-back rounds, each with a fresh interviewer and a fresh problem, ' +
          'scored on correctness, complexity analysis, and clean iteration under a whiteboard/doc ' +
          'constraint rather than IDE autocomplete.',
      },
      {
        name: 'Onsite — System Design',
        count: 1,
        minutes: 45,
        what:
          'For L3/L4 generalist roles this is a services-and-scale design problem, not an ' +
          'ML-system problem, unless the req is explicitly ML-titled.',
      },
      {
        name: 'Onsite — Googleyness & Leadership',
        count: 1,
        minutes: 45,
        what:
          'General behavioral round on collaboration, handling ambiguity, and culture fit, ' +
          'scored and packaged independently of the coding feedback.',
      },
      {
        name: 'Hiring Committee Review',
        count: 1,
        minutes: 30,
        what:
          'A separate committee of calibrated senior engineers who were not in the room reviews ' +
          'your full packet on its own. A "strong hire" from every individual interviewer can ' +
          'still be downlevelled or rejected if the packet doesn\'t read as consistent for the ' +
          'target level.',
      },
    ],
    failsOn: [
      'Over-explores: spends the first 15-20 minutes of a 45-minute coding round enumerating ' +
        'every possible approach and asking for more constraints, then never reaches a working, ' +
        'tested solution — Google\'s rubric scores a completed, verified solution well above an ' +
        'elegant-sounding plan that runs out of time.',
      'Treats the phone-screen bar as the onsite bar, holds back accordingly, then hits the real ' +
        '(higher) onsite bar cold without having adjusted preparation between the two stages.',
      'Delivers inconsistent signal across rounds (say, two strong coding rounds and one weak ' +
        'design round) — the hiring committee reviews the packet as a whole and reads that ' +
        'pattern as a real gap, not an off day, since committee members never met the candidate ' +
        'and only see the written packet.',
    ],
    drill: [
      'Timed reps on dsap-graphs, dsap-dp-1d, dsap-two-pointers and dsap-binary-search under a ' +
        'hard 35-minute clock, written on plain text/a shared doc rather than an IDE, since ' +
        'that is the actual interview medium here.',
      'sdp-caching, sdp-load-balancing-gateways, sdp-database-choice-indexing and ' +
        'sdp-sharding-replication for the generalist design round — reserve mlp-* topics for an ' +
        'explicitly ML-titled req rather than a general SWE loop.',
      'topic-transformers and topic-inference, but only if targeting an ML/AI-titled role — a ' +
        'generalist L3/L4 loop will not ask for them, and that prep time is better spent on more ' +
        'coding reps otherwise.',
      'Four to six behavioral stories on ambiguity, conflict, and "why Google," rehearsed to the ' +
        'same depth as the coding prep — the Googleyness round is scored independently and does ' +
        'not get a pass for strong coding.',
    ],
    marketNote:
      'Google hires SWEs and ML engineers out of Bangalore, Hyderabad and Gurugram, so this is a ' +
      'real, standing pipeline for an India-based candidate — but hiring volume there is lower ' +
      'than Amazon\'s or Microsoft\'s and the L4 bar is genuinely hard to clear at 2.5 years; plan ' +
      'for a fair shot at L3 with L4 as the upside, not the default expectation.',
  },
  {
    id: 'co-meta',
    name: 'Meta',
    order: 4,
    level:
      'E4 is the target, E3 the realistic floor — Meta\'s ladder runs E3 (early career) -> E4 ' +
      '(mid) -> E5 (senior), and 2.5 years of production LLM work sits right at the E3/E4 ' +
      'boundary; the design and behavioral rounds can now downlevel an E4-track candidate to E3 ' +
      'even after strong coding.',
    rounds: [
      {
        name: 'Recruiter Screen',
        count: 1,
        minutes: 30,
        what: 'Background call, resume screen, and an early level-calibration conversation.',
      },
      {
        name: 'Online Coding Assessment',
        count: 1,
        minutes: 45,
        what:
          'An automated or lightly-proctored coding test used as a pre-screen filter before a ' +
          'human phone screen sees the candidate.',
      },
      {
        name: 'Technical Phone Screen',
        count: 1,
        minutes: 45,
        what: 'One Meta engineer, one coding problem, at roughly the same bar as the onsite coding rounds.',
      },
      {
        name: 'Onsite — Coding',
        count: 2,
        minutes: 45,
        what:
          'Two back-to-back rounds, each expecting two LeetCode-medium problems solved inside a ' +
          'roughly 35-minute coding window — the specific trap is finishing two mediums, not ' +
          'one. As of the current loop, one of the two rounds may be an "AI-enabled" session where ' +
          'you pair with an AI assistant, but the same four competencies (Problem Solving, Code ' +
          'Quality, Verification, Communication) are scored either way.',
      },
      {
        name: 'Onsite — Design',
        count: 1,
        minutes: 45,
        what:
          'At E4 this is a Product Architecture round (product track: user-facing systems, API ' +
          'design) or a classic System Design round (infra track). This round does not exist at ' +
          'E3, and its addition is a large part of what separates the two levels.',
      },
      {
        name: 'Onsite — Behavioral',
        count: 1,
        minutes: 45,
        what:
          'A single round on how you work with others and handle conflict/ambiguity, weighted ' +
          'equally to coding — strong enough on its own to downlevel an otherwise-E4-shaped ' +
          'coding performance.',
      },
    ],
    failsOn: [
      'Solves one medium well but cannot finish two mediums inside the ~35-minute coding window ' +
        '— Meta\'s coding rounds are paced for two completed problems, and partial credit on an ' +
        'unfinished second problem scores much lower than two finished ones.',
      'Treats the design round as optional prep ("I\'m not that senior yet") — at E4 the design ' +
        'round, alongside the behavioral round, now carries enough weight to downlevel a ' +
        'candidate to E3 or reject them outright even when both coding rounds were strong.',
      'Gives coding-only, task-focused behavioral answers with no reflection on conflict or ' +
        'feedback — Meta scores this round as heavily as a coding round, not as a formality after ' +
        'the technical bar is cleared.',
    ],
    drill: [
      'Timed reps that specifically pair two mediums per session (not one medium plus a deep ' +
        'dive) from dsap-arrays-hashing, dsap-two-pointers, dsap-sliding-window and dsap-trees, ' +
        'with a hard stop at 35 minutes for the pair.',
      'sdp-caching, sdp-load-balancing-gateways and sdp-database-choice-indexing for the E4 ' +
        'design round on the product track; mlp-retrieval-ranking and mlp-experimentation if the ' +
        'req is explicitly ML/ranking-titled.',
      'Two or three behavioral stories on conflict, feedback, and ambiguity, rehearsed to the ' +
        'same depth as the coding prep rather than left for the final week.',
    ],
    marketNote:
      'Meta\'s engineering presence in India is small and skews non-SWE (sales, partnerships, a ' +
      'thin infra footprint); most SWE roles a recruiter opens to an India-based candidate require ' +
      'relocation to the US, London or Singapore — treat this as a relocation-track loop, not a ' +
      'local-hire pipeline.',
  },
  {
    id: 'co-openai',
    name: 'OpenAI',
    order: 5,
    level:
      'Member of Technical Staff (MTS) — OpenAI does not publish a numbered ladder the way ' +
      'Google, Meta and Amazon do; titles are flat, and a 2.5-year candidate would be evaluated ' +
      'as a mid-level MTS, roughly comparable in scope to a Google L4 or Meta E4 — except the ' +
      'applicant pool skews senior enough that "mid" is a genuinely high bar in absolute terms.',
    rounds: [
      {
        name: 'Recruiter / Hiring Manager Screen',
        count: 1,
        minutes: 30,
        what:
          'Background and motivation call, with a heavier emphasis than most companies on why ' +
          'you specifically want to work on frontier AI — a generic "I love AI" answer reads ' +
          'poorly here.',
      },
      {
        name: 'Technical Screen — Coding',
        count: 1,
        minutes: 60,
        what:
          'One live coding round, algorithmic but with a practical bent (parsing, streaming, ' +
          'retry-with-backoff logic) rather than a pure LeetCode puzzle.',
      },
      {
        name: 'Technical Screen — Systems/Architecture',
        count: 1,
        minutes: 60,
        what:
          'A second pre-onsite screen focused on systems or ML-architecture judgment rather than ' +
          'coding.',
      },
      {
        name: 'Onsite Loop',
        count: 4,
        minutes: 60,
        what:
          'A mix of coding, system/ML design, and behavioral rounds. Coding rounds favor ' +
          'real-world tasks — recreate a small piece of production-shaped functionality, then ' +
          'extend it under a changed constraint mid-interview — over contrived algorithm ' +
          'riddles; design rounds for applied roles go deep on LLM-serving and evaluation ' +
          'topics.',
      },
    ],
    failsOn: [
      'Prepares like it\'s a LeetCode company and is thrown by a "build and extend this small ' +
        'system" coding prompt instead of an algorithm puzzle — OpenAI\'s coding rounds run ' +
        'closer to pair-programming on a realistic task than to a contest problem.',
      'Can recite transformer architecture from a textbook but has never actually served, ' +
        'evaluated, or debugged an LLM pipeline in production — the applied-engineering bar ' +
        'rewards people who have shipped and broken these systems, not people who can only ' +
        'describe them.',
      'Under-estimates how senior the applicant pool is and brings startup-scale system design ' +
        'instincts (single service, no eval harness, no serving-cost tradeoffs) to a bar that ' +
        'assumes familiarity with serving models at real scale.',
    ],
    drill: [
      'topic-inference, topic-llm-pretraining, topic-rag-evaluation and topic-fine-tuning until ' +
        'you can explain each from first principles rather than from slides — the technical ' +
        'screens probe depth here, not breadth.',
      'mlp-llm-serving, mlp-agent-platforms and mlp-rag-systems from the system design bank, plus ' +
        'the worked question mlq-design-llm-query-system — applied roles get LLM-serving-shaped ' +
        'design prompts, not generic CRUD design.',
      'dsap-sliding-window, dsap-arrays-hashing and dsap-heap for the coding screen, rehearsed as ' +
        '"extend this working solution when the requirement changes mid-interview" rather than ' +
        'as one-shot solves, matching the reported format.',
      'A specific, non-generic answer for "why OpenAI, why now," grounded in something you\'ve ' +
        'actually built with their APIs — this opening question carries more weight here than at ' +
        'the Big Tech companies.',
    ],
    marketNote:
      'OpenAI has essentially no engineering headcount in India; every one of these roles is a ' +
      'relocation play to the US (occasionally London), the loop assumes system-level LLM ' +
      'experience beyond API-calling, and the applicant pool skews senior — treat this as a ' +
      'stretch target for a later stage of the plan, not a month-six goal.',
  },
  {
    id: 'co-anthropic',
    name: 'Anthropic',
    order: 6,
    level:
      'Member of Technical Staff (MTS) — the same flat-title convention as OpenAI. A 2.5-year ' +
      'candidate would be evaluated as a mid-level MTS, and Anthropic\'s public applicant pool ' +
      'skews even more senior and research-adjacent than OpenAI\'s, so "mid" is a high bar in ' +
      'absolute terms here too.',
    rounds: [
      {
        name: 'Recruiter Screen',
        count: 1,
        minutes: 30,
        what:
          'Background and motivation call with a real check on alignment with Anthropic\'s ' +
          'safety-first framing — a generic "AI is exciting" answer reads poorly here.',
      },
      {
        name: 'Technical Coding Screen',
        count: 1,
        minutes: 60,
        what:
          'One live round leaning toward multi-step, extend-under-new-constraints problems ' +
          'rather than memorized patterns.',
      },
      {
        name: 'Hiring Manager Conversation',
        count: 1,
        minutes: 45,
        what: 'Role-fit and technical-judgment conversation, kept separate from the coding screen.',
      },
      {
        name: 'Onsite Loop (two separate days)',
        count: 5,
        minutes: 60,
        what:
          'A first loop of coding, design, and behavioral rounds; a second loop is scheduled ' +
          'only if the first one passes. Includes a distinctive work-sample round — a realistic, ' +
          'scoped engineering task mirroring actual work rather than a contrived interview ' +
          'question — plus a culture/values round that explicitly probes how you reason about AI ' +
          'risk and responsible deployment.',
      },
    ],
    failsOn: [
      'Treats the culture/values round as small talk and gives an unprepared, surface-level ' +
        'answer on AI risk or responsible deployment — this is a real evaluation of judgment at ' +
        'Anthropic, and a candidate with no considered position on it stands out immediately, for ' +
        'the wrong reason.',
      'Optimizes the work-sample round for "clever" over "correct and adaptable" — it is scored ' +
        'on whether your code holds up when requirements shift mid-task, not on producing an ' +
        'elegant one-shot answer.',
      'Doesn\'t realize the loop spans two separately-scheduled days and treats day one as the ' +
        'whole interview, under-preparing for a second loop that only happens if day one goes ' +
        'well.',
    ],
    drill: [
      'topic-agents-safety and topic-rag-evaluation in enough depth to hold a real, opinionated ' +
        'conversation about model risk and evaluation tradeoffs, not just definitions — this is ' +
        'directly what the culture/values round probes.',
      'A multi-step coding rep that changes requirements halfway through, drawn from ' +
        'dsap-arrays-hashing, dsap-stack or dsap-graphs — practise adapting an already-working ' +
        'solution rather than only practising first-pass solves.',
      'mlp-agent-platforms and mlp-monitoring-drift for the systems-adjacent design conversation, ' +
        'since Anthropic\'s applied roles skew toward agent and production-safety systems over ' +
        'generic web-scale design.',
      'Write out, in your own words, a position on responsible AI deployment grounded in ' +
        'something you\'ve actually built or debugged, and rehearse saying it out loud — a ' +
        'generic rehearsed answer is easy to spot.',
    ],
    marketNote:
      'Anthropic has no meaningful engineering presence in India; this is a relocation-only ' +
      'pipeline into a very small, very senior-skewed company, and the honest read is that it is ' +
      'a stretch target for later in the plan rather than something to actively pursue in the ' +
      'first six months.',
  },
]
