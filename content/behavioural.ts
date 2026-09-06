import type { BehaviouralPrinciple, BehaviouralQuestion, StorySlot } from '@/lib/content/schema'

// Behavioural bank. Over half of an Amazon loop, a full round at Google and Meta.
//
// Written for a Lead AI Engineer with ~2.5 years, building LLM applications on APIs at a
// startup, plus six side projects. The scale problem is real and is addressed head on:
// this candidate cannot say "I led 40 engineers" or "it served 10M QPS". Where a principle
// is usually answered with scale, `meaning` names the small-company equivalent that still
// scores. Every `weakAnswer` is a sentence a real candidate would actually say out loud,
// because "fails to demonstrate ownership" teaches nobody anything. Every `trap` is
// specific to its own question. Story slots carry prompts, never invented achievements.

export const behaviouralPrinciples: BehaviouralPrinciple[] = [
  // ---------------------------------------------------------------- Amazon: all 16 LPs
  {
    id: 'bp-customer-obsession',
    company: 'amazon',
    name: 'Customer Obsession',
    order: 1,
    meaning: 'Can you name one specific customer, say what they were actually trying to get done, and show that you changed something because of what you learned from them rather than because it was on the sprint board? At a startup the customer may be five design partners, or the support team using your internal tool. That counts. What does not count is "users" as an abstraction, or a metric you never traced back to a person.',
    weakAnswer: 'We wanted to make the product better for our users, so I built the feature product had prioritised, shipped it on time, and the feedback afterwards was positive.',
    lookingFor: [
      'A named customer and their actual job-to-be-done, not a persona and not a segment.',
      'Evidence you went to the customer directly - a call, a support ticket you read, a session you watched - instead of hearing it second-hand from product.',
      'A decision that cost you something (scope, a weekend, a design you preferred) and was taken for the customer anyway.',
      'Whether you checked afterwards that the change actually helped them, or declared victory at launch.',
    ],
  },
  {
    id: 'bp-ownership',
    company: 'amazon',
    name: 'Ownership',
    order: 2,
    meaning: 'Ownership is tested at the boundaries: what did you do about the thing that was nobody\'s job? Amazon hears "that was not my team" as a disqualifier. It also has a time axis - did you stay with the consequences of your decision, or did ownership end at the merge? On a five-person team the equivalent of long-term thinking is small and still countable: fixing the cause rather than the symptom on a day when nobody would have noticed the difference.',
    weakAnswer: 'The retrieval pipeline kept breaking but it was owned by the data team, so I raised a ticket, followed up twice, and eventually they fixed it and our numbers went back to normal.',
    lookingFor: [
      'Action taken outside your formal scope, with the reason you judged it worth taking.',
      'Whether you stayed past the ship date - did you watch it in production, or hand it over and move on?',
      'A cause fixed rather than a symptom patched, and evidence you knew the difference at the time.',
      'Pronouns: "we" for credit, "I" for decisions. Wall-to-wall "we" with no first-person decision reads as passenger.',
    ],
  },
  {
    id: 'bp-invent-and-simplify',
    company: 'amazon',
    name: 'Invent and Simplify',
    order: 3,
    meaning: 'Two halves, and most candidates answer only the first. Invent: you produced a solution that was not the obvious one. Simplify: you deleted something. At your level the simplification story scores higher, because deleting a service, a config knob, or a whole framework is verifiable, while invention is easy to overclaim. Adopting a popular library is not invention; it is a purchase.',
    weakAnswer: 'We brought in LangChain, which simplified everything because we no longer had to write the orchestration ourselves, and development got a lot faster after that.',
    lookingFor: [
      'A named thing that got smaller or disappeared - lines, services, steps, config options, on-call pages.',
      'Why the obvious approach was rejected, in one sentence you can defend under pressure.',
      'Whether "simple" was measured for the next reader of the code, or only for the person writing it.',
    ],
  },
  {
    id: 'bp-are-right-a-lot',
    company: 'amazon',
    name: 'Are Right, A Lot',
    order: 4,
    meaning: 'This is not "I was right". It is judgement under incomplete data: what did you believe, what would have changed your mind, and did you deliberately go and find the person most likely to disagree with you? Amazon is also scoring calibration, so a candidate who has never been wrong reads as either junior or unreflective. The strongest version pairs a good call with a bad one and the check you added because of it.',
    weakAnswer: 'I had a strong feeling that fine-tuning would beat prompting for our use case, and I was right - we went with fine-tuning and it worked out really well.',
    lookingFor: [
      'The disconfirming evidence you went looking for on purpose, and where you looked for it.',
      'A cheap test that settled the question instead of a long argument that did not.',
      'One call you got wrong, and the specific thing you now check because of it.',
    ],
  },
  {
    id: 'bp-learn-and-be-curious',
    company: 'amazon',
    name: 'Learn and Be Curious',
    order: 5,
    meaning: 'Not "I take courses and read papers". The signal is a gap you noticed yourself, closed on your own time, and then used for something real. Writing a transformer from scratch when your day job is calling an API is exactly this story - but only if you can say what you now understand that you did not before, in technical terms, and what decision you now make differently because of it.',
    weakAnswer: 'I read papers every week and follow the field closely so I always know about the latest models - for example I read the DeepSeek paper the week it came out.',
    lookingFor: [
      'A gap you could name precisely, and how you noticed it - usually a question you could not answer.',
      'What changed in your work afterwards: a decision you now make differently, with an example.',
      'Depth over breadth. One thing understood properly beats ten skimmed, and the probes will find out which it was.',
    ],
  },
  {
    id: 'bp-hire-and-develop',
    company: 'amazon',
    name: 'Hire and Develop the Best',
    order: 6,
    meaning: 'At 2.5 years you have not hired anyone and the interviewer knows it. The scoring equivalent is: did you make a specific person better, deliberately, and can you show the mechanism? Onboarding an intern, a code review that taught instead of corrected, a runbook that killed a question you kept being asked. The other half is raising the bar, which means being able to say no - did you ever argue against merging someone\'s work, or against a hire?',
    weakAnswer: 'I helped onboard a new joiner, answered his questions whenever he got stuck, and he picked things up quickly and was productive within about a month.',
    lookingFor: [
      'A named person and a specific skill or judgement they did not have before.',
      'The mechanism: what you did that made the learning stick after you left the room.',
      'Willingness to give feedback that was uncomfortable to give, and what it cost you to give it.',
    ],
  },
  {
    id: 'bp-highest-standards',
    company: 'amazon',
    name: 'Insist on the Highest Standards',
    order: 7,
    meaning: 'The test is whether your bar was higher than what shipping required. Concretely: what did you refuse to ship, and what did that refusal cost? The second half is whether you have a stated standard at all - can you say what "done" means for an LLM feature on your team, as a threshold rather than an adjective, and did you write that standard or inherit it?',
    weakAnswer: 'I always write tests and I care a lot about code quality, so my pull requests rarely have bugs and reviewers usually approve them without too many comments.',
    lookingFor: [
      'A specific thing you sent back or blocked, and the cost you accepted for blocking it.',
      'A standard expressed as a number or a rule - a pass rate, a p95, a required eval - not as "high quality".',
      'Whether the standard outlived you: did it become a test, a CI gate, a checklist someone else now runs?',
    ],
  },
  {
    id: 'bp-think-big',
    company: 'amazon',
    name: 'Think Big',
    order: 8,
    meaning: 'Amazon is not asking whether you have grand opinions about AI. It is asking whether you can describe a much larger version of the thing you built and name the specific component that breaks first. At startup scale the credible form is: I built the small version deliberately, here is the design I would need at 100x, and here is the reason it was right not to build that yet. Bold direction plus a defensible reason for not overbuilding.',
    weakAnswer: 'I think AI agents are going to change everything, so I always try to think about the big picture rather than getting stuck on small features.',
    lookingFor: [
      'A concrete larger version, with the first bottleneck named and quantified.',
      'Evidence you communicated the bigger version to someone with power and got them to act on part of it.',
      'Judgement about what not to build yet, and the trigger that would make you build it.',
    ],
  },
  {
    id: 'bp-bias-for-action',
    company: 'amazon',
    name: 'Bias for Action',
    order: 9,
    meaning: 'Speed with reversibility reasoning attached. The strong version names the decision as a two-way door, says what you did to make it cheap to undo, and gives the clock you were racing. The weak version is recklessness with a happy ending, which the probes expose by asking what would have happened had it gone wrong. Amazon almost always probes the mirror image: a time you deliberately slowed down.',
    weakAnswer: 'We did not really have time to plan, so I just started coding over the weekend and had something working by Monday, and everyone was happy with how fast it came together.',
    lookingFor: [
      'Explicit reversible-versus-irreversible reasoning, even if you did not use those words at the time.',
      'What you deliberately skipped in order to move, and who you told that you had skipped it.',
      'A counter-example where you slowed down, which is what proves the first story was a choice and not a habit.',
    ],
  },
  {
    id: 'bp-frugality',
    company: 'amazon',
    name: 'Frugality',
    order: 10,
    meaning: 'For an LLM engineer this is the easiest LP to score on and most candidates waste it. Tokens, GPU hours, an eval run that cost forty dollars, a cache that removed 60 percent of calls, a 7B model that was good enough for the classification step. Frugality also means fewer people and less time, not only less money - the constraint that produced a better design rather than a worse one.',
    weakAnswer: 'We were a startup so we did not have much budget, and I always tried to keep costs low by using cheaper models wherever we could get away with it.',
    lookingFor: [
      'A number: cost per request, per month, or per eval run, with a before and an after.',
      'A constraint that improved the design rather than degrading it, and the reason it did.',
      'Whether you knew what it cost before anyone asked you to cut it - that is the line between frugality and compliance.',
    ],
  },
  {
    id: 'bp-earn-trust',
    company: 'amazon',
    name: 'Earn Trust',
    order: 11,
    meaning: 'Two things: can you take criticism without defending, and do you tell people bad news early? This is usually probed as "tell me about negative feedback you received", and most of the score sits in whether you can repeat the feedback accurately and unflatteringly. A candidate who softens the feedback while retelling it has already answered the question, badly.',
    weakAnswer: 'My manager once said I could communicate a bit more, which was fair enough, though honestly it was mostly because the team was remote and we did not have many syncs.',
    lookingFor: [
      'The feedback repeated in its harshest accurate form, with no defence bolted on the end.',
      'Bad news delivered before it was discovered by someone else, with the timeline stated.',
      'Whether the behaviour actually changed, and how you know - ideally because the person told you later.',
    ],
  },
  {
    id: 'bp-dive-deep',
    company: 'amazon',
    name: 'Dive Deep',
    order: 12,
    meaning: 'The LP you cannot fake, and the one where an AI engineer can shine: a bug whose root cause sat several layers below where it appeared. A tokeniser that silently truncated, an index rebuilt from a stale snapshot, an fp16 overflow, a p99 hidden inside a healthy average. The interviewer will keep asking "and why did that happen" until you run out of floor, so arrive with four levels, not one.',
    weakAnswer: 'The answers were coming out bad, so I tweaked the prompt and added a few more examples, and after a couple of iterations the quality improved and we shipped.',
    lookingFor: [
      'Four or more "why" levels before you reach "that is just how it works".',
      'Instrumentation you added yourself, rather than a dashboard someone else built that you happened to read.',
      'The number you looked at, not the impression you formed. "It felt slower" is not diving deep.',
    ],
  },
  {
    id: 'bp-have-backbone',
    company: 'amazon',
    name: 'Have Backbone; Disagree and Commit',
    order: 13,
    meaning: 'The commit half is what gets scored and what candidates forget. The full arc is: I disagreed, I escalated once with data, the decision went against me, and then I executed it properly - including telling my own team it was the plan without undermining it in private. A story where you disagreed and won is only half of this principle, and the interviewer will ask for the other half.',
    weakAnswer: 'I disagreed with the approach and explained why I was right, and eventually they came around and we did it my way, which turned out to be the correct decision.',
    lookingFor: [
      'A disagreement you lost and then executed well, in good faith, with evidence of the good faith.',
      'Whether you escalated once and stopped, or relitigated the decision every week afterwards.',
      'What you would have needed to see to change your own mind - stated as of before you knew the outcome.',
    ],
  },
  {
    id: 'bp-deliver-results',
    company: 'amazon',
    name: 'Deliver Results',
    order: 14,
    meaning: 'The result must be a number, and it must be a number the business cared about rather than one you picked because it moved. For LLM work: eval pass rate on a frozen set, hallucination rate, p95 latency, cost per query, tickets deflected, time to first token. "Users liked it" is not a result. Expected alongside it: an obstacle that appeared mid-flight and the scope you cut to still land the date.',
    weakAnswer: 'We shipped the feature on time and it was well received, and the customer we built it for said it was much better than what they had before.',
    lookingFor: [
      'A metric with a before, an after, and a sentence on how it was measured.',
      'Scope you cut to hit the date, and who agreed to the cut.',
      'Whether the result held a month later, or was a launch-week spike you never went back to check.',
    ],
  },
  {
    id: 'bp-best-employer',
    company: 'amazon',
    name: 'Strive to be Earth\'s Best Employer',
    order: 15,
    meaning: 'Rarely the headline question, often the frame of a follow-up. Did you make the environment better for the people around you? At your level that means unblocking someone at a cost to your own sprint, fixing the thing everyone complains about that nobody owns, or absorbing a crunch so a teammate did not have to. Empathy demonstrated by an action, never asserted as a personality trait.',
    weakAnswer: 'I try to be a good teammate and I get along with everyone, so people feel comfortable coming to me with problems and I always try to help them out.',
    lookingFor: [
      'An action taken at a real cost to you, for someone else\'s workload or growth.',
      'Awareness that team environment is something you can change, rather than weather that happens to you.',
      'A before and after in how the team worked - a ritual, a rota, a doc - not a description of your temperament.',
    ],
  },
  {
    id: 'bp-success-and-scale',
    company: 'amazon',
    name: 'Success and Scale Bring Broad Responsibility',
    order: 16,
    meaning: 'The newest LP and the most relevant one to LLM work: what harm could your system do, and what did you do about it before anybody made you? PII pasted into prompts and then into logs, a jailbreak that surfaces another tenant\'s document, an agent holding a tool that can send mail or spend money, a model quietly worse for one group of users. Naming a risk you found yourself and mitigated is a rare, strong answer.',
    weakAnswer: 'We added a content filter because the API provider recommended it, and we never really had any safety incidents, so it was not a big concern for us.',
    lookingFor: [
      'A specific harm you identified in your own system, before it happened, and how you spotted it.',
      'A mitigation with a cost you accepted - latency, recall, scope, or a feature you did not ship.',
      'Second-order thinking: who is affected who is not your user at all.',
    ],
  },

  // ------------------------------------------------------------- Google: the four themes
  {
    id: 'bp-g-cognitive',
    company: 'google',
    name: 'General Cognitive Ability',
    order: 17,
    meaning: 'Google scores how you think, not only what you have done, and the behavioural round is one of the places they measure it. In practice: do you restate the problem before answering, do you structure the answer, and do you separate what you knew from what you assumed? A rambling chronological retelling loses here even when the underlying work was excellent.',
    weakAnswer: 'So basically what happened was, we had this project, and then there was an issue with the vector database, and then we tried a few things, and eventually it all got sorted out.',
    lookingFor: [
      'A structured answer - situation, constraint, options, choice, outcome - delivered in about two minutes before the first probe.',
      'Assumptions flagged out loud as assumptions, and revisited later in the same story.',
      'Whether you can compress the same story to thirty seconds on request, which proves you know which parts mattered.',
    ],
  },
  {
    id: 'bp-g-leadership',
    company: 'google',
    name: 'Leadership',
    order: 18,
    meaning: 'Google means the deliberate kind: driving a piece of work across people who do not report to you, setting direction, and making the call when the group is stuck. With no reports, the scoring equivalent is owning a workstream end to end and becoming the person others route decisions through - which you evidence with a design doc people argued in, not with a job title.',
    weakAnswer: 'I was the tech lead on the project, so I assigned the tasks, tracked them in Jira, and made sure everything was delivered by the deadline we had committed to.',
    lookingFor: [
      'A decision the group was stuck on that you resolved, and the method you used to resolve it.',
      'Influence over people with no reporting line to you, and what you traded to get it.',
      'Clarity you created that outlived the meeting: a written trade-off, a decision record, a definition of done.',
    ],
  },
  {
    id: 'bp-g-emergent-leadership',
    company: 'google',
    name: 'Emergent Leadership',
    order: 19,
    meaning: 'Google\'s distinctive one, and the half candidates miss. Can you step up and lead when the situation needs it, and then step back and follow when someone else is better placed? The stepping-back half is what they are really listening for, because it is rare and hard to fake. A candidate who leads every single story in their portfolio fails this theme.',
    weakAnswer: 'Whenever there was no clear owner I would take charge, because I am comfortable leading, and I ended up driving most of the important decisions on the team.',
    lookingFor: [
      'One story where you took the lead unasked and it was clearly the right call.',
      'One story where you handed the lead to someone better placed, with the judgement behind it stated.',
      'Absence of status-seeking: the reason for leading is the problem, not the visibility.',
    ],
  },
  {
    id: 'bp-g-googliness',
    company: 'google',
    name: 'Googliness',
    order: 20,
    meaning: 'Comfort with ambiguity, intellectual humility, a bias to collaboration, and doing the right thing when no rule covers the case. What they actually probe: how you behave when you do not know, and how you treat the person who is wrong. It is not a test of whether you are pleasant, and answering it as one is the most common way to lose it.',
    weakAnswer: 'I am a very collaborative person and I love working in teams, and I think culture fit matters a lot, so I always try to keep a positive attitude at work.',
    lookingFor: [
      'An "I do not know" said out loud to other people, followed by what you did about it.',
      'How you treated someone whose work you had to reject or correct, told from their point of view.',
      'Comfort acting without a spec, with no complaint that there was no spec.',
    ],
  },

  // ----------------------------------------------------------------- Meta: the four signals
  {
    id: 'bp-m-drives-results',
    company: 'meta',
    name: 'Drives Results',
    order: 21,
    meaning: 'Meta wants impact stated in the business\'s terms, and it wants speed. The distinctive probe is scope: what did you personally do as opposed to the team, and did you pick the highest-impact thing available or the thing you were handed? Meta is genuinely comfortable with "I killed my own project because the data said it was not worth finishing".',
    weakAnswer: 'I completed everything that was assigned to me for the quarter and hit all my deliverables, and my manager was happy with the velocity of the team overall.',
    lookingFor: [
      'Impact quantified, plus the counterfactual - what would have happened if you had not done it.',
      'Prioritisation: something real you dropped in order to do the bigger thing.',
      'A shipping cadence, not one launch after six quiet months.',
    ],
  },
  {
    id: 'bp-m-collaboration',
    company: 'meta',
    name: 'Collaboration',
    order: 22,
    meaning: 'Meta probes conflict harder than most: a disagreement with a peer, a dependency that did not deliver, a partner team that ended up unhappy. The score sits in whether you can state the other side\'s position fairly enough that they would recognise it, and whether you repaired the relationship rather than merely routing around it.',
    weakAnswer: 'The other team was not responsive and kept missing their commitments, so in the end I just built it myself and we shipped without them.',
    lookingFor: [
      'The other side\'s reasoning stated fairly, in their terms, with no sarcasm and no air quotes.',
      'What you changed in your own behaviour, not only what they should have changed in theirs.',
      'Whether the working relationship was better afterwards, or simply bypassed.',
    ],
  },
  {
    id: 'bp-m-growth-mindset',
    company: 'meta',
    name: 'Growth Mindset',
    order: 23,
    meaning: 'Feedback and failure, asked directly. The failure has to be one where you were the cause rather than the victim: a project that died because leadership reprioritised is not your failure story, it is theirs. The feedback has to be quoted rather than paraphrased into something flattering, and something has to have actually changed afterwards.',
    weakAnswer: 'The project failed because leadership changed priorities halfway through and moved the resources, so there was not really much I could have done about it, honestly.',
    lookingFor: [
      'A failure where one of your own decisions was the proximate cause, stated early rather than buried at probe three.',
      'The feedback quoted in the giver\'s words, not translated into a strength.',
      'A specific behaviour change, with evidence it stuck longer than a fortnight.',
    ],
  },
  {
    id: 'bp-m-embracing-ambiguity',
    company: 'meta',
    name: 'Embracing Ambiguity',
    order: 24,
    meaning: 'A problem with no spec, no owner and no obvious first step - what did you do in the first week? Meta is scoring whether you generated your own structure: defined the problem, picked a metric, shipped something small to learn from. Waiting for clarity, or asking for a proper spec and stopping there, is exactly the failure mode they are testing for.',
    weakAnswer: 'The requirements were unclear, so I went back to the product manager and asked for a proper spec, and once we had it written down I started building.',
    lookingFor: [
      'Structure you created yourself: a metric, a scope cut, a written definition of done, a decision log.',
      'A cheap experiment run to shrink the ambiguity, rather than a meeting requested to discuss it.',
      'Decisions made on explicit assumptions, with a date you went back and checked them.',
    ],
  },

  // ------------------------------------------------------- General: what every loop asks
  {
    id: 'bp-conflict',
    company: 'general',
    name: 'Conflict with a Peer',
    order: 25,
    meaning: 'Every loop asks it. The interviewer is scoring whether you can disagree technically without making it personal, and whether you have any self-awareness about your own share of the friction. A story in which the other person was simply wrong and you were simply right scores badly at all three companies, however true it felt at the time.',
    weakAnswer: 'A colleague wanted to use a graph database for no real reason, so I ran the benchmarks and showed him the numbers, and after that he had to accept my approach was better.',
    lookingFor: [
      'The other person\'s position stated in a way they would recognise as fair.',
      'A mechanism that resolved it - data, a timeboxed spike, a written trade-off - rather than seniority or attrition.',
      'Your own contribution to the friction, named without being asked for it.',
    ],
  },
  {
    id: 'bp-failure',
    company: 'general',
    name: 'Failure',
    order: 26,
    meaning: 'The trap is picking a failure that is secretly a success. A real one has a cost somebody other than you paid: money, a missed date, a customer who left, a rollback at two in the morning. The score is in the diagnosis and the systemic fix, not in how sorry you sound, and interviewers are practised at spotting the humblebrag version within one sentence.',
    weakAnswer: 'My biggest failure is that I take on too much and I am a bit of a perfectionist, so sometimes things end up taking longer than they really should.',
    lookingFor: [
      'A cost that landed on someone other than you, stated in their terms.',
      'A root cause located in your own judgement, said plainly and early rather than after three probes.',
      'A change to a system or a process, not a resolution to be more careful next time.',
    ],
  },
  {
    id: 'bp-disagree-with-manager',
    company: 'general',
    name: 'Disagreeing with Your Manager',
    order: 27,
    meaning: 'A politics test wearing a technical costume. They are checking that you will push back at all, and that you know how to do it without theatre: in private first, with data, once, and then commit. Candidates who have never disagreed with a manager read as passive; candidates who narrate a running war read as expensive to manage.',
    weakAnswer: 'I did not agree with the decision, but he was the manager, so I went along with it, and it turned out fine in the end so it did not really matter.',
    lookingFor: [
      'A real disagreement with something at stake, not a preference about tooling or formatting.',
      'The channel: private, prepared, with an alternative offered instead of a complaint delivered.',
      'What happened after the decision - whether you executed it wholeheartedly or slow-walked it.',
    ],
  },
  {
    id: 'bp-missed-deadline',
    company: 'general',
    name: 'Missed Deadline',
    order: 28,
    meaning: 'The question is never whether you missed one. It is when you knew and who you told. Strong answers put a date on the escalation - "in week two the burn-up said we would not make it, and I told the PM that week with two options". Weak answers discover the slip in the final week, which tells the interviewer you were not tracking anything at all.',
    weakAnswer: 'We were on track until the last week, and then some unexpected issues came up with the integration, so we ended up delivering a few days late.',
    lookingFor: [
      'The moment you knew, and the gap between knowing and telling.',
      'Options presented alongside the bad news - cut scope, move the date, accept known risk - not just the bad news.',
      'An estimation lesson applied to your next estimate, with the new number and whether it held.',
    ],
  },
  {
    id: 'bp-feedback',
    company: 'general',
    name: 'Receiving Critical Feedback',
    order: 29,
    meaning: 'Asked at Amazon as Earn Trust, at Meta as growth mindset, and everywhere as a standalone question. The entire test is the retelling: can you say the harsh version out loud without softening it and without a "to be fair" clause on the end? Then, separately, did anything actually change - and can someone other than you confirm that it did.',
    weakAnswer: 'I was told I should speak up more in meetings, which I have worked on since, although to be fair I was quite new and still learning the domain at that point.',
    lookingFor: [
      'The feedback in the giver\'s words, harsh edges left intact.',
      'Zero defensiveness in the retelling: no "to be fair", no context supplied to excuse it.',
      'A behaviour change plus the way you know it worked, ideally someone telling you later that it had.',
    ],
  },
]

export const behaviouralQuestions: BehaviouralQuestion[] = [
  // ------------------------------------------------------- Amazon-flavoured, LP by LP
  {
    id: 'bq-customer-feedback-changed-build',
    principleIds: ['bp-customer-obsession', 'bp-deliver-results'],
    prompt: 'Tell me about a time you changed what you were building because of something a customer told you.',
    probes: [
      'How did you hear it - did you speak to them yourself, or did it reach you through product? Who else heard the same thing and did nothing?',
      'What did the change cost you? Name the thing you dropped or delayed to make room for it.',
      'How do you know it helped them? Give me the measurement, or tell me honestly that you never measured it.',
    ],
    traps: [
      'The story where the customer asked for feature X and you built feature X. That is order-taking, not customer obsession; the signal is in what you understood that they had not said.',
      'Answering with an aggregate ("users were complaining"). The interviewer wants one person, one workflow, one specific frustration - aggregates are how candidates hide the fact that they never spoke to anybody.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-said-no-to-customer',
    principleIds: ['bp-customer-obsession', 'bp-have-backbone', 'bp-highest-standards'],
    prompt: 'Tell me about a time you told a customer or a senior stakeholder no.',
    probes: [
      'What did you offer instead? A flat no with no alternative is refusal, not judgement.',
      'How did they take it, and what did the relationship look like three months later?',
      'If they had gone over your head and been granted it anyway, would you still say your no was right? Why?',
    ],
    traps: [
      'Choosing a no about scope creep from an internal PM. The stronger version is a no to a paying customer, where saying yes was both the easy option and the profitable one.',
      'This question invites you to prove you were right. The interviewer is scoring whether you protected the customer\'s actual interest or only your own sprint.',
    ],
    minutes: 7,
  },
  {
    id: 'bq-ownership-outside-scope',
    principleIds: ['bp-ownership', 'bp-bias-for-action'],
    prompt: 'Tell me about a time you took on something that was clearly not your job.',
    probes: [
      'Whose job was it? Did you tell them - before, or after?',
      'What did you drop to make the time, and who noticed that it had been dropped?',
      'When does taking something on become stepping on someone? Where is your line?',
    ],
    traps: [
      'The hero version, where you silently fixed another team\'s code and everyone applauded. Amazon reads unannounced cross-team work as an Earn Trust problem, and the first probe is built to find it.',
      'Picking something trivially small - a flaky test, a stale README. It has to have cost you something, or there was no ownership decision to make.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-ownership-root-cause',
    principleIds: ['bp-ownership', 'bp-highest-standards', 'bp-dive-deep'],
    prompt: 'Tell me about a time you fixed the root cause when patching the symptom would have been accepted.',
    probes: [
      'How much longer did the proper fix take, and who paid for that time?',
      'What convinced you the symptom would come back? Was that a guess, or did you have evidence?',
      'Now tell me about a time you did the opposite - patched it and moved on. Why was that the right call there?',
    ],
    traps: [
      'Root-cause stories collapse under "and why did that happen" when you only understood one level. Rehearse this chain four levels deep before you tell it.',
      'The third probe is not a trapdoor, it is the question. A candidate who claims they always fix root causes is telling the interviewer that they cannot prioritise.',
    ],
    minutes: 9,
  },
  {
    id: 'bq-simplify-deleted',
    principleIds: ['bp-invent-and-simplify', 'bp-ownership'],
    prompt: 'Tell me about the most complicated thing you have made simpler.',
    probes: [
      'What is smaller now, in numbers? Files, services, config options, pipeline steps, pages at night.',
      'What did you lose by simplifying? Something always goes - flexibility, an edge case, somebody\'s favourite feature.',
      'Who disagreed with the deletion, and what was their argument?',
    ],
    traps: [
      'Adopting a framework and calling it simplification. You moved the complexity behind an import; the probes will ask what happens when you need to change the retrieval order, and the answer is now worse than before.',
      'This question rewards deletion, so bring a story where code was removed. A refactor with the same feature set and the same line count is not an answer to it.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-invent-nonobvious',
    principleIds: ['bp-invent-and-simplify', 'bp-g-cognitive'],
    prompt: 'Tell me about a solution you came up with that nobody around you had tried.',
    probes: [
      'What was the obvious approach, and what specifically made you reject it?',
      'What did you build to test the idea before committing to it, and how long did that take?',
      'Has anyone used it since? If it died with you, why did it?',
    ],
    traps: [
      'Claiming invention for something that is standard practice elsewhere - a reranker, a semantic cache, RAG itself. If it is in the papers, your invention was the adaptation, so say that and be precise about the delta.',
      'The second probe punishes anyone who went from idea straight to a month of building. Part of the invention signal is how cheaply you validated it.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-decision-incomplete-data',
    principleIds: ['bp-are-right-a-lot', 'bp-m-embracing-ambiguity'],
    prompt: 'Tell me about an important decision you made without enough data.',
    probes: [
      'What data would have settled it, and why could you not get it in time?',
      'Who did you go to who was most likely to tell you that you were wrong? What did they say?',
      'What would you have accepted as the signal to reverse the decision, and did you write it down anywhere?',
    ],
    traps: [
      'A story with a happy ending and no reversal criteria. Being right by luck scores as luck - the process is what is being measured, and the second probe is the whole question.',
      'The tempting LLM version is "we had no evals so I went with my gut". That works only if your next sentence is what you built so it would not happen again.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-were-wrong',
    principleIds: ['bp-are-right-a-lot', 'bp-m-growth-mindset', 'bp-failure'],
    prompt: 'Tell me about a time you were wrong about something technical.',
    probes: [
      'How long between being wrong and knowing you were wrong? What closed that gap?',
      'Who had told you at the time that you were wrong, and why did you not believe them?',
      'What do you check now, before making that class of call, that you did not check then?',
    ],
    traps: [
      'Choosing a low-stakes wrong ("I thought that library would be faster"). It has to be a call that cost time or money, or there is no calibration signal in it.',
      'Rushing to "and so we did the other thing and it worked". The recovery is not what is being scored; the diagnosis is, and skipping to the ending removes it.',
    ],
    minutes: 7,
  },
  {
    id: 'bq-learn-something-new',
    principleIds: ['bp-learn-and-be-curious', 'bp-g-cognitive'],
    prompt: 'Tell me about a time you had to learn something new to finish a piece of work.',
    probes: [
      'What did you actually not understand at the start? Say it as the question you could not answer.',
      'How did you check that you had learned it rather than just read it?',
      'Take me one level deeper on that topic than you just went.',
    ],
    traps: [
      'The third probe is always coming, and it decides this question. Pick something where you can go two levels below your headline explanation - attention arithmetic, tokenisation, what the loss is actually computed over - not something you skimmed.',
      'Naming a tool ("I learned LangGraph") instead of a concept. Tools expire; the interviewer is scoring how you close a conceptual gap.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-taught-someone',
    principleIds: ['bp-hire-and-develop', 'bp-best-employer'],
    prompt: 'Tell me about someone you helped get better at their job.',
    probes: [
      'What could they do afterwards that they could not do before? Be specific about the skill.',
      'What did you deliberately not do for them, so that they had to do it themselves?',
      'What did they teach you?',
    ],
    traps: [
      'This is a scale trap for a startup engineer: the true answer feels too small to say out loud. One person, one specific skill, one mechanism you left behind is a complete answer - nobody expects a team of eight from you.',
      'Answering with availability ("I was always there if they had questions"). Being reachable is not development. The mechanism is what scores.',
    ],
    minutes: 7,
  },
  {
    id: 'bq-refused-to-ship',
    principleIds: ['bp-highest-standards', 'bp-have-backbone', 'bp-ownership'],
    prompt: 'Tell me about a time you refused to ship something that other people thought was ready.',
    probes: [
      'What was your bar, stated as a number? Did you set that bar, or inherit it?',
      'What did the delay cost, and who paid it?',
      'When have you shipped something below your own bar on purpose? What made that right?',
    ],
    traps: [
      'Perfectionism dressed as standards. The third probe exists to separate judgement from a high bar, and having no answer to it is a bad outcome.',
      'For LLM work, "it was still hallucinating sometimes" is not a bar. A bar is "82 percent on the frozen 200-question set, and we were sitting at 71".',
    ],
    minutes: 8,
  },
  {
    id: 'bq-quality-vs-deadline',
    principleIds: ['bp-highest-standards', 'bp-deliver-results', 'bp-missed-deadline'],
    prompt: 'Tell me about a time you had to choose between quality and a date.',
    probes: [
      'What exactly did you let go of, and did you write the debt down anywhere?',
      'Did you ever go back and pay it? If not, say so.',
      'Who made the final call - you, or somebody above you? What did you recommend?',
    ],
    traps: [
      'The clean answer is "we did both", and it is never true. Claiming it invites the interviewer to hunt for the corner you actually cut, and them finding it is far worse than you naming it.',
      'Claiming you tracked the debt in a ticket that was never picked up. If it was never paid, say it was never paid and say what that cost - the honesty scores higher than the fiction.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-think-bigger-than-asked',
    principleIds: ['bp-think-big', 'bp-g-leadership'],
    prompt: 'Tell me about a time you proposed something substantially bigger than what you were asked to do.',
    probes: [
      'Who did you have to convince, and what was the one objection you could not answer?',
      'How much of the big version actually got built? If none of it, was proposing it still worth doing?',
      'What breaks first if this runs at a hundred times the load? Name the component and the number.',
    ],
    traps: [
      'Ambition with no cost model. The third probe converts vision into engineering, and a candidate who cannot name the first bottleneck was daydreaming rather than thinking big.',
      'This question tempts you towards a story where you overbuilt. Think Big and premature scaling look identical from the outside unless you say what you deliberately did not build, and why.',
    ],
    minutes: 9,
  },
  {
    id: 'bq-calculated-risk',
    principleIds: ['bp-bias-for-action', 'bp-are-right-a-lot'],
    prompt: 'Tell me about a calculated risk you took.',
    probes: [
      'What was the downside if it had gone badly, in concrete terms - money, a customer, a week?',
      'What did you do to make it cheap to undo?',
      'What did you tell the people who would have been affected, and when did you tell them?',
    ],
    traps: [
      'A "risk" with no downside was not a risk. If you cannot state the loss in one sentence, pick a different story.',
      'This question rewards speed, which pulls you towards a story where you skipped a review. Skipping a review is only defensible if you say who you told that you had skipped it.',
    ],
    minutes: 7,
  },
  {
    id: 'bq-move-without-consensus',
    principleIds: ['bp-bias-for-action', 'bp-g-leadership', 'bp-m-embracing-ambiguity'],
    prompt: 'Tell me about a time you made a decision when the team could not agree.',
    probes: [
      'Why was it yours to call? Did anybody dispute that it was?',
      'How did you bring along the people whose option you did not pick?',
      'How long did you let the disagreement run before you called it, and would you cut that shorter now?',
    ],
    traps: [
      'Deciding by outlasting people. If the resolution was that everyone got tired, say so - the interviewer usually hears it in the timeline anyway.',
      'The second probe is the real question. A decision that left two people quietly unconvinced comes back within a month, which is why interviewers ask what happened next.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-do-more-with-less',
    principleIds: ['bp-frugality', 'bp-invent-and-simplify'],
    prompt: 'Tell me about a time you achieved something with far fewer resources than the job seemed to need.',
    probes: [
      'What would the well-resourced version have looked like, and what would it have bought you?',
      'Did the constraint make the design better or worse? Be honest about which.',
      'What broke later because of the shortcut?',
    ],
    traps: [
      'Startup candidates default to "we had no money so we did everything ourselves", which reads as circumstance rather than choice. The signal is a decision you made, not a budget you were handed.',
      'The third probe is not rhetorical. Something always broke, and naming it yourself is worth more than being caught by it.',
    ],
    minutes: 7,
  },
  {
    id: 'bq-cut-inference-cost',
    principleIds: ['bp-frugality', 'bp-dive-deep', 'bp-deliver-results'],
    prompt: 'Tell me about a time you cut the running cost of a system. What did it cost before, and after?',
    probes: [
      'How did you find where the money was going? Walk me through the measurement, not the fix.',
      'What did the cut cost in quality? Show me the eval number on both sides of it.',
      'What is the next thing you would cut, and why have you not cut it yet?',
    ],
    traps: [
      'Saying "we switched to a cheaper model" with no quality number beside it. A cost cut that silently degrades output is a negative signal, and the second probe is there to find out whether you measured or hoped.',
      'This is the LP an LLM engineer should walk in with a number for. Turning up with "it got a lot cheaper" wastes the easiest scoring opportunity in the entire loop.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-hardest-feedback',
    principleIds: ['bp-earn-trust', 'bp-feedback', 'bp-m-growth-mindset'],
    prompt: 'Tell me about the most critical piece of feedback you have received.',
    probes: [
      'Say it again in their words, not yours.',
      'What was your first reaction - honestly, in the moment, not after you had processed it?',
      'How would that person describe you today? Have you asked them?',
    ],
    traps: [
      'Any "to be fair" or "although the context was" clause. The moment you supply mitigating context you have failed the question, and the interviewer stops listening to the rest of the answer.',
      'Choosing feedback that flatters you ("I was told I take on too much"). Pick the one that actually stung - the discomfort in your voice is part of the signal.',
    ],
    minutes: 7,
  },
  {
    id: 'bq-delivered-bad-news',
    principleIds: ['bp-earn-trust', 'bp-ownership', 'bp-missed-deadline'],
    prompt: 'Tell me about a time you had to tell someone something they did not want to hear.',
    probes: [
      'How long did you sit on it before telling them? Be precise.',
      'What options did you bring alongside the news?',
      'What did you do differently the next time you saw the same warning signs?',
    ],
    traps: [
      'The gap between knowing and telling is the whole score. Same-day is strong; two weeks of hoping it would resolve itself needs you to own the hesitation out loud rather than let the timeline expose it.',
      'Bringing news with no options attached. Escalating a problem is table stakes; escalating with two paths and a recommendation is what this level expects.',
    ],
    minutes: 7,
  },
  {
    id: 'bq-hardest-bug',
    principleIds: ['bp-dive-deep', 'bp-g-cognitive'],
    prompt: 'Walk me through the hardest bug you have ever debugged.',
    probes: [
      'And why did that happen? (Expect this question four times in a row. Arrive with four layers.)',
      'How did you know it was that and not something else? What did you rule out, and how?',
      'What did you add so that the next person finds it in ten minutes instead of two days?',
    ],
    traps: [
      'Telling the story backwards from the answer. The interviewer wants the search, including the two hypotheses that were wrong, because that is where your reasoning is visible.',
      'For an LLM system, stopping at "the prompt was wrong". The prompt is a symptom. Go to the retrieved context, then to the chunker, then to the PDF parser that dropped the table structure - and quote the number you saw at each level.',
    ],
    minutes: 12,
  },
  {
    id: 'bq-data-contradicted-belief',
    principleIds: ['bp-dive-deep', 'bp-are-right-a-lot', 'bp-earn-trust'],
    prompt: 'Tell me about a time the data contradicted what everyone on the team believed.',
    probes: [
      'How did you convince people who had believed the opposite for months?',
      'How confident were you that the measurement itself was right? What did you do to check the instrument?',
      'What did the team believe next, and was that also wrong?',
    ],
    traps: [
      'Being right against a group is a good story that turns bad if you visibly enjoy it. Say what the team believed and why it was reasonable to believe it, before you say you disproved it.',
      'The second probe catches candidates who trusted their own dashboard uncritically. Measuring the measurement before you go public with it is the senior move here.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-disagree-and-commit',
    principleIds: ['bp-have-backbone', 'bp-disagree-with-manager'],
    prompt: 'Tell me about a time you disagreed with a decision and had to go along with it anyway.',
    probes: [
      'What did you say about the decision to your own team afterwards?',
      'How would the person who overruled you describe your behaviour over the following month?',
      'Were you right in the end? And if you were, did you say so?',
    ],
    traps: [
      'Wanting vindication. The third probe is bait: a candidate who says "and six months later it failed exactly as I had predicted" with evident satisfaction has just shown how they behave when a decision goes against them.',
      'Committing in public and undermining in private. The first probe exists because "I did it, but I told the team I disagreed" is the most common answer here, and it is a fail.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-unpopular-stand',
    principleIds: ['bp-have-backbone', 'bp-highest-standards', 'bp-conflict'],
    prompt: 'Tell me about a time you were the only person arguing for something.',
    probes: [
      'What would have changed your mind? State it as the evidence you would have accepted.',
      'How many times did you raise it before you let it go?',
      'What did it cost you socially, and was that price worth paying?',
    ],
    traps: [
      'The second probe separates backbone from stubbornness. Once, with data, then commit, scores well; raising it in every retro for a quarter does not.',
      'Picking a stand about a tool preference. It only reads as backbone if something real was at risk - a customer, their data, a person, money.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-delivered-despite-obstacle',
    principleIds: ['bp-deliver-results', 'bp-ownership', 'bp-bias-for-action'],
    prompt: 'Tell me about a time you delivered against a hard deadline when it stopped being achievable halfway through.',
    probes: [
      'What exactly did you cut, and who signed off on the cut?',
      'Which number moved because you delivered, and how was it measured?',
      'Where was that number a month later?',
    ],
    traps: [
      'Answering with effort ("we worked nights and got it done"). Sustained heroics read as an absence of planning at all three companies.',
      'This question needs a metric and vague ones die on the second probe. "Faster" is not a number; "p95 from 9.4 seconds to 3.1 on the same 500-query set" is.',
    ],
    minutes: 9,
  },
  {
    id: 'bq-most-significant-accomplishment',
    principleIds: ['bp-deliver-results', 'bp-think-big', 'bp-g-cognitive'],
    prompt: 'What is the most significant thing you have built or shipped, and why that one?',
    probes: [
      'What was hard about it? If it was not hard, why is it the most significant?',
      'What would you do differently if you started it again on Monday?',
      'What did you personally build, and what did other people build?',
    ],
    traps: [
      'Choosing the biggest-sounding project rather than the one where your judgement is most visible. A small system you designed end to end beats a large one you contributed one service to.',
      'The third probe punishes a vague "we". Have the boundary rehearsed: these three components were mine, this one was not, and I reviewed that one.',
    ],
    minutes: 10,
  },
  {
    id: 'bq-improved-team-environment',
    principleIds: ['bp-best-employer', 'bp-hire-and-develop', 'bp-g-leadership'],
    prompt: 'Tell me about something you changed about how your team works.',
    probes: [
      'Did it survive after you stopped pushing it? How do you know?',
      'Who resisted it, and what was their objection?',
      'What did it cost you in time you would otherwise have spent shipping?',
    ],
    traps: [
      'Describing your personality instead of an action. "I keep the mood positive" is not a change to how a team works; a review rota, a written on-call runbook or a fifteen-minute triage slot is.',
      'The first probe kills most answers to this question. If the ritual died the week you stopped chairing it, say so, and say what you learned about making changes stick.',
    ],
    minutes: 7,
  },
  {
    id: 'bq-risk-your-system-posed',
    principleIds: ['bp-success-and-scale', 'bp-ownership', 'bp-highest-standards'],
    prompt: 'Tell me about a risk your system posed to users that you found before anyone else did.',
    probes: [
      'How did you find it - a deliberate exercise, or an accident?',
      'What did the mitigation cost you - latency, recall, scope, a feature you dropped?',
      'What is still unmitigated in that system today, and why is that acceptable?',
    ],
    traps: [
      'Naming a generic risk ("prompt injection is dangerous") instead of one in your own system. The question is about what you found, in your code, with your data.',
      'The third probe rewards honesty and punishes a claim of completeness. Every LLM system carries accepted residual risk; saying yours has none says you have not looked.',
    ],
    minutes: 9,
  },
  {
    id: 'bq-handled-user-data',
    principleIds: ['bp-success-and-scale', 'bp-earn-trust', 'bp-highest-standards'],
    prompt: 'Tell me about a decision you made about user data - what you would log, what you would retain, what you would send to a third party.',
    probes: [
      'Who else was in that decision? Did you make it alone, and should you have?',
      'What did you stop logging, and what did you lose in debuggability by stopping?',
      'If a customer asked today for everything you hold about one of their users, could you produce it?',
    ],
    traps: [
      'In an LLM application the whole prompt usually goes to a third-party API and often into your traces as well. A candidate who has never thought about that says "we did not store anything sensitive" - and the second probe finds out whether that was verified or assumed.',
      'Treating it as a compliance question and citing a policy. The signal is a decision you personally made at a moment when nobody had yet written the rule.',
    ],
    minutes: 8,
  },

  // ------------------------------------------------------------------ Google-flavoured
  {
    id: 'bq-g-most-ambiguous',
    principleIds: ['bp-g-cognitive', 'bp-m-embracing-ambiguity', 'bp-g-googliness'],
    prompt: 'Tell me about the most ambiguous problem you have been handed. What did you do in the first week?',
    probes: [
      'What did you decide the problem was, and who did you check that definition with?',
      'What was the first thing you shipped, and what did it teach you?',
      'Which of your starting assumptions turned out to be wrong?',
    ],
    traps: [
      'Answering with a request for clarity. "I went back and asked for a proper spec" is exactly the failure mode this question exists to detect, at Google and at Meta both.',
      'Structure invented after the fact. The probes ask for artefacts and dates - a doc, a metric, a demo - because a candidate who really structured it at the time still has them.',
    ],
    minutes: 9,
  },
  {
    id: 'bq-g-led-without-authority',
    principleIds: ['bp-g-leadership', 'bp-g-emergent-leadership', 'bp-ownership'],
    prompt: 'Tell me about a time you led something without being the person in charge of it.',
    probes: [
      'Why did people follow you? What did you have that made your direction worth taking?',
      'Who did not follow, and what did you do about that?',
      'What did you write down, and did anyone read it after the project ended?',
    ],
    traps: [
      'The scale trap. With three engineers and no title, the credible version is: I wrote the design, I ran the decisions, I chased the dependency, and here is the document. Claiming "I led the team" with no artefacts invites probes you cannot answer.',
      'Confusing coordination with leadership. Running standup and updating tickets is administration; setting a direction somebody disagreed with and then carrying it through is leadership.',
    ],
    minutes: 9,
  },
  {
    id: 'bq-g-let-someone-else-lead',
    principleIds: ['bp-g-emergent-leadership', 'bp-g-googliness', 'bp-hire-and-develop'],
    prompt: 'Tell me about a time you stepped back and let someone else take the lead.',
    probes: [
      'How did you judge that they were better placed than you?',
      'What did you do when you thought they were making a mistake?',
      'What was the outcome, and how did you feel about it at the time?',
    ],
    traps: [
      'Nearly every candidate arrives with four stories where they led and none where they followed, and Google scores the second kind specifically. Prepare this one deliberately - it is the rarest answer in the round.',
      'A fake step-back where you handed over the work but kept the decisions. The second probe finds it: if your answer is "I stepped in and fixed it", you never actually stepped back.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-g-someone-changed-your-mind',
    principleIds: ['bp-g-googliness', 'bp-are-right-a-lot', 'bp-m-collaboration'],
    prompt: 'Tell me about a time someone changed your mind.',
    probes: [
      'What was the specific thing they said or showed you that moved you?',
      'How long did it take? Did you concede in the meeting, or a week later?',
      'Did you tell them that they had changed your mind?',
    ],
    traps: [
      'Choosing a small technical preference. A mind change only signals humility if you had a real position with something behind it.',
      'The third probe is quietly the whole question. Changing your mind privately and never acknowledging it is common; telling the person is the behaviour being scored.',
    ],
    minutes: 7,
  },
  {
    id: 'bq-g-out-of-your-depth',
    principleIds: ['bp-g-googliness', 'bp-learn-and-be-curious', 'bp-g-cognitive'],
    prompt: 'Tell me about a time you were out of your depth.',
    probes: [
      'Who did you tell, and how quickly?',
      'What did you do in the first two days that made the second week easier?',
      'Is there anything about that area you still do not understand?',
    ],
    traps: [
      'Turning it into a triumph too quickly. The interviewer wants the period of not knowing; jumping to "and then I learned it over a weekend" deletes the only part being scored.',
      'The third probe rewards a real admission. A candidate who claims full mastery of everything they have touched sounds either incurious or untruthful.',
    ],
    minutes: 7,
  },
  {
    id: 'bq-g-explain-to-nontechnical',
    principleIds: ['bp-g-cognitive', 'bp-m-collaboration', 'bp-earn-trust'],
    prompt: 'Tell me about a time you had to explain something technical to someone without the background for it.',
    probes: [
      'What did they do differently because of your explanation?',
      'What did you leave out, and did leaving it out ever come back on you?',
      'Explain it to me now, as though I were them.',
    ],
    traps: [
      'The third probe is the real test and it happens live. For an LLM engineer the usual case is explaining to a founder or a customer why the model is confidently wrong - rehearse that in one minute with no jargon.',
      'Simplifying into something untrue. "It predicts the next word, so it will invent a plausible citation" is fine; a metaphor that leads the listener to a wrong decision is not.',
    ],
    minutes: 8,
  },

  // -------------------------------------------------------------------- Meta-flavoured
  {
    id: 'bq-m-highest-impact',
    principleIds: ['bp-m-drives-results', 'bp-deliver-results'],
    prompt: 'What is the highest-impact thing you shipped in the last year, and how do you know it was the highest impact?',
    probes: [
      'What else was on the list, and why did this beat it?',
      'What is the counterfactual - what would have happened if you had not built it?',
      'How long from the idea to something in a user\'s hands?',
    ],
    traps: [
      'Impact claimed for something you were handed. Meta scores whether you chose it, so include the prioritisation call and not only the delivery.',
      'The counterfactual probe catches inflated numbers quickly. If the metric would have moved anyway - seasonality, another team\'s launch, a pricing change - say so before the interviewer does.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-m-killed-something',
    principleIds: ['bp-m-drives-results', 'bp-are-right-a-lot', 'bp-frugality'],
    prompt: 'Tell me about something you stopped, killed, or deleted.',
    probes: [
      'Whose work was it? How did you tell them?',
      'What was the evidence that it should stop, and how long had that evidence been sitting there?',
      'What did the freed-up capacity go to instead, and was that better?',
    ],
    traps: [
      'Killing somebody else\'s project is easy to narrate and easy to mark down. The strong version is killing your own - the graph experiment, the fine-tune, the agent framework you had already sunk three weekends into.',
      'The second probe hunts for sunk-cost delay. If the evidence had been available for two months before you acted, own the two months out loud.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-m-peer-conflict',
    principleIds: ['bp-m-collaboration', 'bp-conflict', 'bp-earn-trust'],
    prompt: 'Tell me about a serious disagreement with a colleague.',
    probes: [
      'State their case for me the way they would state it.',
      'What did you get wrong in how you handled it?',
      'What is the working relationship like now?',
    ],
    traps: [
      'This question invites you to blame the other person; the interviewer is listening for whether you owned your half. Arrive with your half already identified, because being asked for it twice makes it look extracted rather than offered.',
      'The first probe is scored on fairness, not accuracy. If their case still sounds silly when you say it in their words, you have not understood it - and you have just told the interviewer so.',
    ],
    minutes: 9,
  },
  {
    id: 'bq-m-blocked-by-dependency',
    principleIds: ['bp-m-collaboration', 'bp-ownership', 'bp-deliver-results'],
    prompt: 'Tell me about a time another team or an external vendor blocked you.',
    probes: [
      'What were their competing priorities? Were they reasonable ones?',
      'What did you try before escalating, and how long did you wait?',
      'What did you change so that it did not happen again on the next dependency?',
    ],
    traps: [
      'Building it yourself and calling that a resolution. It ships the feature and burns the relationship, and Meta is scoring the relationship - the third probe is where that shows up.',
      'Escalating as the first move, or never escalating at all. Both are common; what the interviewer wants is a sequence with a timebox attached to each step.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-m-project-failed',
    principleIds: ['bp-m-growth-mindset', 'bp-failure', 'bp-ownership'],
    prompt: 'Tell me about a project that failed.',
    probes: [
      'Which of your decisions caused it? Not the team\'s - yours.',
      'When was the first moment you could have known? Which signal did you ignore?',
      'What did it cost, and who paid that cost?',
    ],
    traps: [
      'A failure caused by leadership reprioritising is not your failure story. The first probe takes it away from you, and by then you have burned the question with nothing left to answer it with.',
      'Side projects make this easy to dodge - "it was only personal so nothing was really lost". Then pick a different story, or name what was lost: three weekends, and whatever you did not build instead.',
    ],
    minutes: 9,
  },
  {
    id: 'bq-m-feedback-changed-you',
    principleIds: ['bp-m-growth-mindset', 'bp-feedback', 'bp-hire-and-develop'],
    prompt: 'Tell me about feedback that changed how you work.',
    probes: [
      'What is the specific behaviour that is different now? Give me an example from this month.',
      'Who would notice the difference, and would they agree it is real?',
      'What feedback have you received and decided not to act on, and why?',
    ],
    traps: [
      'A change with no example. The first probe asks for one from this month precisely because a vague "I have worked on it" cannot produce one.',
      'The third probe is not a trick. Accepting every piece of feedback uncritically is its own weakness - but you need a reasoned rejection, not a dismissal.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-m-no-spec-no-owner',
    principleIds: ['bp-m-embracing-ambiguity', 'bp-g-emergent-leadership', 'bp-bias-for-action'],
    prompt: 'Tell me about a time you picked up work that had no spec and no owner.',
    probes: [
      'How did you decide it was worth doing at all?',
      'What did you deliberately leave undone, and did you tell anyone you had left it?',
      'Who owns it now, and what happens to it if you move teams tomorrow?',
    ],
    traps: [
      'The last probe is the ownership test. If the answer is "still me, and it is a millstone", that is honest - but follow it with what you did about the bus factor.',
      'Picking up unowned work is easy to make sound noble. The interviewer is checking that you chose it on impact, not because it was the most interesting thing on the floor.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-m-shipped-fast',
    principleIds: ['bp-m-drives-results', 'bp-bias-for-action', 'bp-frugality'],
    prompt: 'Tell me about the fastest you have gone from an idea to something real in front of users.',
    probes: [
      'What did you skip, and which of those things did you go back for?',
      'What would have happened if you had taken twice as long?',
      'How did you know it was working once it was live?',
    ],
    traps: [
      'Speed with no observability. If the answer to the third probe is that a customer told you, the story is about luck rather than about shipping.',
      'A demo is not users. If it reached a demo and never reached production, say that up front instead of letting the probes discover it.',
    ],
    minutes: 7,
  },

  // ---------------------------------------------------------- General: every loop asks
  {
    id: 'bq-technical-disagreement',
    principleIds: ['bp-conflict', 'bp-are-right-a-lot', 'bp-g-cognitive'],
    prompt: 'Tell me about a technical disagreement over an architectural choice.',
    probes: [
      'What was the cheapest experiment that would have settled it? Did you run it?',
      'What did the decision cost, either way, in real terms?',
      'If you had lost the argument, how bad would it actually have been?',
    ],
    traps: [
      'The third probe deflates most of these stories, and it should. Many architecture arguments are between two acceptable options, and a candidate who can say "honestly, either would have worked, and here is why I still preferred mine" reads far more senior than one who cannot.',
      'Winning by producing more detail than the other person had energy for. If that is what happened, your resolution mechanism was stamina, and the interviewer will hear it in the timeline.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-disagree-with-manager',
    principleIds: ['bp-disagree-with-manager', 'bp-have-backbone', 'bp-earn-trust'],
    prompt: 'Tell me about a time you disagreed with your manager.',
    probes: [
      'Where did you raise it - in the room, in private, or in writing?',
      'How many times did you raise it?',
      'What did you do once the decision was final?',
    ],
    traps: [
      'Choosing a disagreement you won, about something small. It reads either as trivial or as a candidate who needed to produce a win for the interview.',
      'This is a politics test in a technical costume. Raising it publicly in front of the team, however right you were, is the version that loses - and candidates volunteer it without realising what they have said.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-missed-deadline',
    principleIds: ['bp-missed-deadline', 'bp-deliver-results', 'bp-earn-trust'],
    prompt: 'Tell me about a time you missed a deadline.',
    probes: [
      'When did you know? Give me the week.',
      'How long between knowing and telling someone?',
      'What was your original estimate based on, and what would you estimate now for the same work?',
    ],
    traps: [
      'Blaming the estimate as though it arrived from somewhere else. If you gave the number, own the number; if somebody else gave it and you accepted it in silence, that is also yours.',
      'The third probe wants a number, not a lesson. "I add a buffer now" is weak; "I estimated three weeks, it took seven, and I now estimate integration work at three times the happy path" is an answer.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-broke-production',
    principleIds: ['bp-ownership', 'bp-earn-trust', 'bp-failure', 'bp-dive-deep'],
    prompt: 'Tell me about a time you broke something in production.',
    probes: [
      'How long from breakage to detection, and from detection to recovery?',
      'How did you find out - your alert, or a person?',
      'What stops that exact class of failure now?',
    ],
    traps: [
      'Choosing an incident where somebody else pushed the change. Pick one that was yours - the question is about your recovery and your fix, not about blast radius.',
      'The second probe is brutal for small teams. If a customer told you, say a customer told you, and make the alerting you added afterwards the point of the story.',
    ],
    minutes: 9,
  },
  {
    id: 'bq-competing-priorities',
    principleIds: ['bp-deliver-results', 'bp-m-drives-results', 'bp-g-cognitive'],
    prompt: 'Tell me about a time you had more work than you could possibly do.',
    probes: [
      'What did you drop, and who did you tell that you had dropped it?',
      'How did you decide the order? What was the criterion?',
      'What went wrong because of what you dropped?',
    ],
    traps: [
      'Answering with a system ("I use a priority matrix") instead of a decision. The interviewer wants the specific thing you did not do, and what happened because of it.',
      'Dropping work silently. Deprioritising is a decision that needs a recipient; if nobody was told, that is the finding - and saying it before the probe does is much better than after.',
    ],
    minutes: 7,
  },
  {
    id: 'bq-pushed-back-on-scope',
    principleIds: ['bp-have-backbone', 'bp-deliver-results', 'bp-highest-standards'],
    prompt: 'Tell me about a time you pushed back on what you were asked to build.',
    probes: [
      'What did you propose instead, and how much smaller was it?',
      'What evidence did you bring, or was it a judgement call?',
      'What happened to the parts you cut - did anybody ever ask for them again?',
    ],
    traps: [
      'The third probe is the payoff and most candidates have never checked. If nobody ever asked for the cut features again, that is the strongest sentence in your whole answer - go and find out before the interview.',
      'Pushing back with an opinion and no alternative. At this level, "that is a bad idea" needs a smaller idea attached to it.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-gave-hard-feedback',
    principleIds: ['bp-hire-and-develop', 'bp-earn-trust', 'bp-conflict'],
    prompt: 'Tell me about a time you gave someone feedback they did not want to hear.',
    probes: [
      'What were the words you used? Say the actual sentence.',
      'How did they react, and what did you do with that reaction?',
      'Did the behaviour change? If not, what did you do next?',
    ],
    traps: [
      'Softening it in the retelling, which reveals that you softened it at the time. The first probe asks for the sentence for exactly this reason.',
      'Delivering it through a manager or into a retro rather than to the person. That is avoidance, and it scores as avoidance even when the outcome turned out fine.',
    ],
    minutes: 8,
  },
  {
    id: 'bq-tell-me-about-yourself',
    principleIds: ['bp-g-cognitive', 'bp-deliver-results', 'bp-learn-and-be-curious'],
    prompt: 'Tell me about yourself and walk me through your background.',
    probes: [
      'Why did you leave that role, and why are you looking now?',
      'You have built a lot of side projects - what is the through line?',
      'What do you want to be doing in two years that you cannot do today?',
    ],
    traps: [
      'Reciting the CV chronologically. Two minutes, three beats: what you do now, the two things you have built that matter for this role, and why this role is the next step. Longer than that and the interviewer stops listening before you reach the good part.',
      'For an LLM engineer whose day job is API calls, this opener is where the side projects become depth rather than hobbies. One clause each on what the project taught you that the day job could not - and no apology for the scale of either.',
    ],
    minutes: 6,
  },
]

// Story slots. Draft each one once, then reuse it across many questions - most loops need
// eight to ten stories, not forty. Every field below is a QUESTION for you to answer. None
// of it is a script, and nothing here claims an achievement on your behalf: the interviewer
// will go four probes deep and only your own material survives that.

export const storySlots: StorySlot[] = [
  {
    id: 'story-rag-eval-harness',
    title: 'The eval harness that made the RAG system trustworthy',
    source: 'proj-rag - the evaluation harness you built alongside the retrieval pipeline',
    covers: ['bp-highest-standards', 'bp-dive-deep', 'bp-are-right-a-lot', 'bp-learn-and-be-curious', 'bp-deliver-results'],
    prompts: {
      situation: 'What was untrustworthy about the system before the harness existed? Write the sentence you would have had to say to a user about whether the answers were correct - including the honest version, that at the start you could not say anything at all.',
      task: 'What did you decide "good enough to ship" meant, as a number on a fixed set? Nobody handed you that threshold, so what did you use to choose it, and what would have made you move it?',
      action: 'Where did the questions come from, how did you get ground truth for them, and how did you separate retrieval quality from generation quality? Name the metrics you chose and the ones you rejected, with the reason.',
      result: 'What was the pass rate the first time you ran it, and what was it when you stopped? Which change moved it most, and which change you were confident about moved it not at all?',
    },
  },
  {
    id: 'story-rag-hallucination-hunt',
    title: 'The week the answers were confidently wrong',
    source: 'proj-rag or proj-advanced-rag - tracing a hallucination to its actual cause',
    covers: ['bp-dive-deep', 'bp-ownership', 'bp-g-cognitive', 'bp-failure'],
    prompts: {
      situation: 'Which specific question came back wrong, and what did the wrong answer claim? Have the real example ready to say out loud - this story dies without one.',
      task: 'What did you have to establish first: was retrieval failing to find the passage, or was generation ignoring a passage it already had? How did you decide which to test first?',
      action: 'Write the chain of causes, one line each, going down at least four levels - answer, prompt context, retrieved chunks, chunking or parsing, source document. What did you measure at each level instead of assuming?',
      result: 'What did you change, what did the metric do afterwards, and what did you add so that the next occurrence shows up in minutes rather than when a user complains?',
    },
  },
  {
    id: 'story-advanced-rag-reranker-tradeoff',
    title: 'Paying latency for retrieval quality',
    source: 'proj-advanced-rag - adding the cross-encoder reranker and paying for it',
    covers: ['bp-are-right-a-lot', 'bp-frugality', 'bp-deliver-results', 'bp-highest-standards'],
    prompts: {
      situation: 'What was retrieval quality before the reranker, and what was p95 latency? Both numbers, from the same run, or the story is not measurable.',
      task: 'What were you actually optimising - a quality floor, a latency ceiling, or a cost budget? Which of the three was non-negotiable, and who decided that it was?',
      action: 'What did you try before reaching for a reranker, and why did you reject each one? How did you choose the top-k to rerank, and what happened to both numbers when you moved it?',
      result: 'State the trade you accepted: how much latency and cost bought how much quality. Would you make the same trade for a user-facing chat as for a batch job? Say which one you were building.',
    },
  },
  {
    id: 'story-graph-rag-bet',
    title: 'The graph bet, and where it did not pay',
    source: 'proj-graph-rag - building the knowledge-graph path and finding its real boundary',
    covers: ['bp-think-big', 'bp-are-right-a-lot', 'bp-m-drives-results', 'bp-failure', 'bp-m-growth-mindset'],
    prompts: {
      situation: 'What class of question was the vector pipeline failing at? Give a real example of one it got wrong, and say how you noticed the pattern rather than the single case.',
      task: 'What was your hypothesis about why a graph would help, and what result would have falsified it? Write the falsifier down before you write anything else in this story.',
      action: 'How much did you build before you had an answer? What was the cheapest version that could have told you the same thing - and did you build that first, or skip straight past it?',
      result: 'Where did the graph win, where did it lose, and what did it cost to keep current? If the honest answer is that it was not worth it for most queries, that is a strong story - say so plainly, and say what you kept.',
    },
  },
  {
    id: 'story-agents-guardrail',
    title: 'Giving an agent a tool that can act on the world',
    source: 'proj-agents - the point where the agent stopped only reading and started doing',
    covers: ['bp-success-and-scale', 'bp-ownership', 'bp-highest-standards', 'bp-bias-for-action'],
    prompts: {
      situation: 'Which tool in your agent could do something irreversible - send, write, spend, delete? What is the worst plausible sequence of steps that reaches it?',
      task: 'What did you decide the agent must never do without a human, and what were you happy to let it do freely? Where exactly did the line fall, and why there rather than one step either side?',
      action: 'What did you actually implement - a confirmation step, a dry run, an allowlist, a spend cap, a step limit, a separate read-only credential? What did each one cost in usefulness?',
      result: 'What did you catch in testing that would have been genuinely bad in production? What is still unguarded today, and what makes that acceptable to you?',
    },
  },
  {
    id: 'story-gpt-from-scratch-depth',
    title: 'Writing the transformer to answer a question I could not answer',
    source: 'proj-gpt-from-scratch - the model and training loop you implemented yourself',
    covers: ['bp-learn-and-be-curious', 'bp-dive-deep', 'bp-g-cognitive', 'bp-g-googliness'],
    prompts: {
      situation: 'What question about model behaviour could you not answer while working only through an API? Say the exact question - it is the opening line of this story and it is what makes it more than a tutorial.',
      task: 'What did you decide you had to implement yourself rather than read about, and why was reading not enough for this particular thing?',
      action: 'Which part broke first and taught you most - the attention mask, positional encoding, the loss over shifted targets, the tokeniser, the learning-rate schedule? What did the bug look like before you understood it?',
      result: 'Name one decision you now make differently at work because of this. Context-window handling, temperature, why a long prompt degrades, why a fine-tune needs that many examples - which of those can you defend two levels deep under probing?',
    },
  },
  {
    id: 'story-fine-tune-vs-prompt',
    title: 'Deciding whether fine-tuning was worth it, with an eval that answered it',
    source: 'proj-fine-tune-eval - the comparison you ran before committing to a fine-tune',
    covers: ['bp-are-right-a-lot', 'bp-frugality', 'bp-deliver-results', 'bp-m-drives-results'],
    prompts: {
      situation: 'What task were you trying to improve, and what was prompting alone achieving on it? One number, one fixed set, stated before you say anything about fine-tuning.',
      task: 'What would fine-tuning have to beat for it to be worth the data work and the ongoing maintenance? Set that bar explicitly before you say what happened.',
      action: 'How did you build the training set, how did you keep the eval set clean of it, and what did you compare against - few-shot, a larger model, a smaller fine-tuned one? Which comparison did you nearly skip?',
      result: 'What did each option cost per thousand requests, and what did each score? Which did you choose, and would you choose the same at ten times the volume? Say what would flip the decision.',
    },
  },
  {
    id: 'story-work-cost-reduction',
    title: 'The month the model bill became a problem',
    source: 'Startup work - inference spend that outgrew what the product could carry',
    covers: ['bp-frugality', 'bp-ownership', 'bp-deliver-results', 'bp-dive-deep'],
    prompts: {
      situation: 'What was the bill, and what was it per request or per active user? Did you know that number before somebody asked you for it, or did the question arrive first? Answer honestly - the second version is still a usable story.',
      task: 'What was the target, who set it, and what quality floor were you not allowed to drop below while hitting it?',
      action: 'How did you find where the spend was concentrated? Which of caching, routing to a smaller model, shortening context, batching, or deleting a redundant call did you use - in what order, and why that order?',
      result: 'Before and after, in money and in the quality metric, from the same eval set. What did you leave on the table, and why did you stop where you stopped?',
    },
  },
  {
    id: 'story-work-latency-incident',
    title: 'A production incident in the LLM path',
    source: 'Startup work - the day the feature degraded in front of real users',
    covers: ['bp-ownership', 'bp-earn-trust', 'bp-dive-deep', 'bp-bias-for-action', 'bp-failure'],
    prompts: {
      situation: 'What did the user see, and when? Who noticed first - an alert, or a person? Say which one honestly, because the honest answer sets up the fix at the end.',
      task: 'In the first ten minutes, was your job to stop the bleeding or to find the cause? Which did you choose, and did you tell anyone which you had chosen?',
      action: 'Give the sequence: what you checked, what you ruled out and how, the mitigation you applied and how you decided it was safe to apply. What did you communicate while you were working, to whom, and how often?',
      result: 'Time to detect, time to mitigate, time to fix properly. What alert or test exists now that would have caught this, and has it fired since?',
    },
  },
  {
    id: 'story-work-scope-cut',
    title: 'The committed date that stopped being achievable',
    source: 'Startup work - a commitment that had to be renegotiated mid-flight',
    covers: ['bp-missed-deadline', 'bp-deliver-results', 'bp-have-backbone', 'bp-earn-trust'],
    prompts: {
      situation: 'What was committed, to whom, and by what date? Who produced the estimate - say so plainly if it was you.',
      task: 'What was the moment the numbers stopped working? Name the week and say what you were looking at that told you.',
      action: 'What options did you take to the person waiting on it - cut scope, move the date, ship with a named gap? What did you recommend, and what did they choose?',
      result: 'What shipped, what did not, and did anybody ever ask for the missing part? What did you change about how you estimate this class of work, expressed as a multiplier rather than as a resolution to be careful.',
    },
  },
  {
    id: 'story-work-peer-conflict',
    title: 'The disagreement with a colleague that got personal enough to matter',
    source: 'Startup work - friction with a peer over a technical direction',
    covers: ['bp-conflict', 'bp-m-collaboration', 'bp-earn-trust', 'bp-g-googliness'],
    prompts: {
      situation: 'What was the disagreement about, and what was actually at stake if the wrong choice had been made? If nothing was at stake, pick a different disagreement.',
      task: 'What was their case, in their words, put as fairly as you can manage? If it still sounds unreasonable once written down, you have not finished this step - go back until it does not.',
      action: 'What mechanism got you out of it - a timeboxed spike, data, a written comparison, a third person? And separately: what did you change about your own behaviour once you noticed it was going badly?',
      result: 'What was decided, and what is the working relationship like now? What was your share of the friction? Have that sentence ready before an interviewer has to ask for it twice.',
    },
  },
  {
    id: 'story-work-manager-disagreement',
    title: 'Disagreeing with the person who decides',
    source: 'Startup work - pushing back on a manager or founder over technical direction',
    covers: ['bp-disagree-with-manager', 'bp-have-backbone', 'bp-earn-trust', 'bp-g-leadership'],
    prompts: {
      situation: 'What was the decision, and why did you think it was wrong? What was the cost if you were right and it went ahead anyway - name it in money, time, or risk.',
      task: 'What were you trying to achieve: reverse it, delay it, or make the risk explicit so that someone senior owned it knowingly? Those are three different goals and they need three different conversations.',
      action: 'Where did you raise it, how did you prepare, and what alternative did you bring rather than an objection? How many times did you raise it before you stopped?',
      result: 'What was decided, and what did you do in the month afterwards? If it went against you, say how you executed it and what you said about it to the rest of the team.',
    },
  },
  {
    id: 'story-work-mentoring',
    title: 'Bringing someone new up to speed on the LLM stack',
    source: 'Startup work - an intern, a new joiner, or a backend engineer moving into AI work',
    covers: ['bp-hire-and-develop', 'bp-best-employer', 'bp-g-emergent-leadership', 'bp-feedback'],
    prompts: {
      situation: 'Who was it, and what could they not do at the start that the work required of them?',
      task: 'What did you decide they should be able to do without you within a month? Be concrete - "be productive" is not a target anybody can check.',
      action: 'What did you do beyond answering questions - pairing, a particular review style, a written runbook, deliberately handing them something slightly too hard? And what did you refuse to do for them, on purpose?',
      result: 'What did they ship without you afterwards? What feedback did you give that was uncomfortable to give, what words did you use, and what happened when you gave it?',
    },
  },
  {
    id: 'story-work-ambiguous-brief',
    title: 'One line of brief, no spec, no owner',
    source: 'Startup work - a vague mandate you turned into a shipped thing',
    covers: ['bp-m-embracing-ambiguity', 'bp-g-googliness', 'bp-g-emergent-leadership', 'bp-bias-for-action', 'bp-g-leadership'],
    prompts: {
      situation: 'What was the sentence you were given? Quote it exactly - the vaguer it was, the better this story works.',
      task: 'What did you decide the problem actually was, and which metric did you pick to know whether it was solved? Who did you get to agree with that definition, and how long did that take?',
      action: 'What did you build first, and how small was it? Which assumptions did you write down, and on what date did you go back and check them?',
      result: 'What did the first version teach you that changed the plan? Who owns it now, and what exists in writing that would let somebody else pick it up tomorrow?',
    },
  },
  {
    id: 'story-work-shipped-wrong-thing',
    title: 'The thing I built that nobody used',
    source: 'Startup work - a feature that shipped and did not land',
    covers: ['bp-failure', 'bp-m-growth-mindset', 'bp-customer-obsession', 'bp-m-drives-results'],
    prompts: {
      situation: 'What did you build, how long did it take, and what was the usage afterwards? Give the real number, including if the real number is zero.',
      task: 'What did you believe users wanted, and where had that belief come from - a customer, a founder, or your own assumption? Trace it back honestly to its actual source.',
      action: 'What would have told you earlier, and how cheap would that check have been? Why did you not run it? Be specific rather than generous to yourself here - this is the part being scored.',
      result: 'What did it cost, and who paid - your time, the roadmap, a customer who waited for something else? What do you now do before building, and can you point at a specific time you have actually done it since?',
    },
  },
]
