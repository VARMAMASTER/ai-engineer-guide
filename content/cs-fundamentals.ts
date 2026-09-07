import type { CsQuestion, CsTopic } from '@/lib/content/schema'

// CS fundamentals bank. This is the round separate from DSA and system design.
//
// Amazon runs it as an explicit gated round of roughly 30-40 minutes over OS, DBMS and
// networking; Meta runs a comparable short OS/Linux/networking screen on the Production
// Engineer track and expects Linux internals plus real troubleshooting fluency. Google
// and general SWE loops fold a subset (concurrency, caching, walking through a URL)
// into other rounds rather than a dedicated quiz, so those questions carry no company tag.
//
// `companies` is tagged only where the research supports it: Amazon on OS + DBMS +
// networking, Meta on OS + networking + Linux internals (not databases). Everything else
// is deliberately `[]` rather than guessed at.
//
// Every `answer` is written the way you would say it out loud in the room - the mechanism
// and the consequence, not the textbook definition. Every `keyPoint` is the detail that
// separates a strong answer from a memorised one, and never a restatement of the answer.

export const csTopics: CsTopic[] = [
  {
    id: 'cst-os',
    area: 'os',
    name: 'Operating Systems',
    order: 1,
    summary: 'Processes and threads, context switching, virtual memory and paging, page faults and thrashing, the TLB, fork and copy-on-write, process lifecycle, IPC, and CPU scheduling. The largest single slice of the Amazon CS-fundamentals round and the core of the Meta Production Engineer screen.',
  },
  {
    id: 'cst-networking',
    area: 'networking',
    name: 'Networking',
    order: 2,
    summary: 'TCP versus UDP, the handshake and teardown, congestion control, head-of-line blocking across HTTP/1.1, HTTP/2 and HTTP/3, DNS resolution, TLS and what a certificate proves, L4 versus L7 load balancing, CDNs, NAT, proxies, CIDR, and how to bisect a connectivity problem layer by layer.',
  },
  {
    id: 'cst-databases',
    area: 'databases',
    name: 'Databases',
    order: 3,
    summary: 'ACID with the mechanism underneath it, the four isolation levels and the anomaly each one permits, normalisation and when to trade it away, B-tree versus hash indexes, composite and clustered index design, reading a query plan, database deadlocks, MVCC, and optimistic versus pessimistic locking.',
  },
  {
    id: 'cst-concurrency',
    area: 'concurrency',
    name: 'Concurrency',
    order: 4,
    summary: 'Race conditions, mutexes, semaphores and spinlocks, monitors, the producer-consumer problem, the four necessary conditions for deadlock plus detection and prevention, livelock and starvation, atomics and compare-and-swap, and the hardware layer underneath: cache coherence and false sharing.',
  },
  {
    id: 'cst-oop',
    area: 'oop',
    name: 'OOP Fundamentals',
    order: 5,
    summary: 'The object-oriented questions interviewers ask as a knowledge check, separately from a low-level design exercise: what encapsulation actually buys, overloading versus overriding, how dynamic dispatch works, composition versus inheritance and why to favour composition, Liskov substitution, equality and hashing, immutability, and dependency inversion.',
  },
]

// ------------------------------------------------------------------ Operating systems
const osQuestions: CsQuestion[] = [
  {
    id: 'csq-process-vs-thread',
    topicId: 'cst-os',
    text: 'What is the difference between a process and a thread?',
    answer: "A process is an independent unit with its own virtual address space, its own page table, its own file descriptor table and its own heap - the kernel isolates it from every other process. A thread is a schedulable unit inside a process: it gets its own stack, registers and program counter, but shares the address space, the heap, the descriptors and the loaded code with its siblings. So sharing data between threads is just a pointer; sharing between processes needs a pipe, a socket, or an explicit shared-memory mapping.",
    keyPoint: 'Isolation is the thing you are paying for, not an accident of the design. One misbehaving thread can corrupt shared heap state and take the whole process down, while a crashing process leaves its siblings untouched - which is exactly why a browser puts tabs in separate processes rather than threads.',
    companies: ['amazon', 'meta'],
    minutes: 7,
  },
  {
    id: 'csq-context-switch-cost',
    topicId: 'cst-os',
    text: 'Why is a process context switch more expensive than a thread context switch?',
    answer: "A thread switch saves and restores the register set and swaps the stack pointer; the address space does not change, so the page table stays installed and the caches stay warm. A process switch additionally loads a new page-table base register, which invalidates the translations cached for the old address space, so the first stretch of memory accesses after the switch each pay a full page-table walk. Saving registers is nanoseconds - the cold TLB and cold L1 are what actually cost you.",
    keyPoint: 'Naming the indirect cost is what makes the answer land, and then hedging it correctly: modern CPUs tag translations with an address-space identifier (PCID on x86, ASID on ARM) specifically to avoid flushing the whole thing, so the accurate version is a flush unless the hardware supports tagged entries.',
    companies: ['amazon', 'meta'],
    minutes: 7,
  },
  {
    id: 'csq-virtual-memory',
    topicId: 'cst-os',
    text: 'What is virtual memory and why does it exist?',
    answer: "Virtual memory gives every process its own flat address space that the MMU translates into physical frames through a page table. It buys two things. Isolation, because a process cannot even name another process's memory - there is no address it can form that reaches it. And the illusion of more memory than you physically have, because cold pages can live on disk and be faulted back in on demand. It also makes relocation free: the loader does not care which physical frames the pages land in.",
    keyPoint: 'The third win is the one candidates skip: translation makes controlled sharing cheap. Two processes can map the same physical frame, so a shared library is paid for once across hundreds of processes, and a shared-memory IPC segment is just one frame appearing in two page tables.',
    companies: ['amazon', 'meta'],
    minutes: 7,
  },
  {
    id: 'csq-paging-vs-segmentation',
    topicId: 'cst-os',
    text: 'Paging versus segmentation - what is the difference, and which do real systems use?',
    answer: "Paging cuts the address space into fixed-size pages, typically 4 KB, and physical memory into frames of the same size, so any page fits any frame. Segmentation cuts it into variable-length, logically meaningful pieces - code, data, stack - which matches how a programmer thinks about a program and makes per-region protection natural. Real systems manage memory with paging and keep segmentation only vestigially, mostly as a protection and addressing artefact.",
    keyPoint: 'The decision is which kind of fragmentation you are willing to accept. Fixed-size units waste part of the final unit per region, a bounded cost, while variable-length units leave unusable gaps between allocations that grow without bound and can only be reclaimed by compaction. Bounded waste beats unbounded waste.',
    companies: ['amazon'],
    minutes: 6,
  },
  {
    id: 'csq-page-fault',
    topicId: 'cst-os',
    text: 'What is a page fault, and what is the difference between a major and a minor fault?',
    answer: "A page fault is the MMU trapping into the kernel because the virtual page you touched has no valid mapping to a physical frame. A minor fault means the data is already in memory somewhere - it is in the page cache, or it is a copy-on-write page, or the mapping simply had not been installed yet - so the kernel fixes up the page table and returns in microseconds. A major fault means the kernel has to fetch from disk, which is milliseconds: four to five orders of magnitude worse.",
    keyPoint: 'The operational reading beats the definition here. High minor-fault counts are normal and largely harmless - every freshly mapped page produces one - whereas a climbing major rate is the signal that your working set no longer fits in RAM and the machine is on its way to thrashing.',
    companies: ['meta'],
    minutes: 6,
  },
  {
    id: 'csq-thrashing',
    topicId: 'cst-os',
    text: 'What is thrashing, how do you detect it, and how do you fix it?',
    answer: "Thrashing is when the combined working set of the runnable processes exceeds physical memory, so each process's next instruction evicts a page that another process immediately needs back. You detect it from the shape of the symptoms: CPU utilisation collapses while disk utilisation pins near 100%, so the machine looks idle and is completely unresponsive. The fix is to reduce the degree of multiprogramming - suspend or kill processes until the resident sets fit - or add memory.",
    keyPoint: 'The interesting part is the feedback loop that makes it self-reinforcing: a naive scheduler sees low CPU utilisation, concludes the machine is underloaded and admits more work, which deepens the shortage. That is precisely why working-set and page-fault-frequency based admission control exists.',
    companies: ['amazon', 'meta'],
    minutes: 7,
  },
  {
    id: 'csq-tlb',
    topicId: 'cst-os',
    text: 'What is the TLB and why does it matter for performance?',
    answer: "The TLB is a small, very fast cache of virtual-to-physical page translations sitting in front of the page tables. Without it every memory access would need a page-table walk, and on x86-64 a four-level table means several extra memory accesses for every single access your program makes. Hit rates in practice are very high, which is why the walk cost is invisible - right up until you run a workload whose access pattern defeats it.",
    keyPoint: 'Coverage is the concept that makes this concrete: the TLB holds only a few hundred to a couple of thousand entries, so at 4 KB apiece it maps only a few megabytes at a time. A large random-access working set therefore misses constantly, and that is exactly the problem huge pages solve - each entry then covers 2 MB or 1 GB.',
    companies: ['meta'],
    minutes: 7,
  },
  {
    id: 'csq-fork-cow',
    topicId: 'cst-os',
    text: 'What happens in memory when you call fork()?',
    answer: "fork() gives the child a copy of the parent's address space, but the kernel copies no data pages at all. It copies the page table and marks every writable page read-only in both processes. The first write from either side traps into the kernel, which allocates a fresh frame, copies that one page and clears the read-only bit for the writer. So the cost of fork is proportional to the size of the page table, not the size of the address space, and pages that are only ever read stay shared indefinitely.",
    keyPoint: 'The consequence is that the memory cost is deferred rather than avoided, and that surprises people in production: a large parent that forks and then has both sides touch most of their pages suddenly needs close to double the RAM. That is the mechanism behind the memory spike when an in-memory datastore forks to write a snapshot.',
    companies: ['meta'],
    minutes: 8,
  },
  {
    id: 'csq-fork-vs-exec',
    topicId: 'cst-os',
    text: 'What is the difference between fork() and exec()?',
    answer: "fork() duplicates the calling process and returns twice - zero in the child, the child's pid in the parent. exec() creates nothing: it replaces the current process's address space with a new program image, keeping the same pid and, by default, the same open file descriptors. Every command your shell runs is the pair: fork, then exec in the child, while the parent waits for it.",
    keyPoint: 'The reason the two are split rather than fused into one spawn call is the window between them. That is where the child rearranges its own environment before the new program starts - dup2 a pipe onto stdout, close descriptors it should not inherit, chdir, drop privileges - which is exactly how shell redirection and pipelines are implemented.',
    companies: ['meta'],
    minutes: 6,
  },
  {
    id: 'csq-zombie-vs-orphan',
    topicId: 'cst-os',
    text: 'What is a zombie process, and how is it different from an orphan?',
    answer: "A zombie has already exited, but its parent has not called wait() yet, so the kernel keeps its exit status and its entry in the process table. It holds no memory and no descriptors - just the table slot and the pid. An orphan is the inverse: the parent died first, so init or the nearest subreaper adopts the child and will reap it when it exits. Zombies are a bug in the parent; orphans are handled by the system for you.",
    keyPoint: 'They only matter in bulk, and that is the follow-up: each one pins a pid, so a long-lived parent that forks in a loop and never reaps will exhaust the pid table until nobody on the box can start anything. The fix is waitpid() from a SIGCHLD handler, or explicitly setting SIGCHLD to SIG_IGN so the kernel reaps for you.',
    companies: ['meta'],
    minutes: 6,
  },
  {
    id: 'csq-hard-vs-symlink',
    topicId: 'cst-os',
    text: 'Hard link versus symbolic link?',
    answer: "A hard link is a second directory entry pointing at the same inode, so the two names are genuinely indistinguishable - there is no original - and the data is freed only when the link count reaches zero and no process still holds the file open. A symlink is its own inode whose content is a path string, resolved afresh at every lookup, so it can cross filesystems and point at a directory, and it dangles harmlessly if the target disappears.",
    keyPoint: 'Late resolution is what makes symlinks operationally useful: because the path is followed on every open, you can atomically repoint a live path by rename()-ing a new link over the old one. That is how a deployment scheme swaps a stable path onto a new release directory with no window where it points at nothing.',
    companies: ['meta'],
    minutes: 6,
  },
  {
    id: 'csq-ipc-mechanisms',
    topicId: 'cst-os',
    text: 'What IPC mechanisms are there, and how do you choose between them?',
    answer: "Pipes and sockets are byte streams the kernel copies through: simple and safe, and you pay a copy in each direction plus a syscall per message. Pipes for a parent and child on one box, Unix domain sockets for unrelated local processes, TCP sockets once you cross machines. Message queues give you discrete, optionally prioritised messages with kernel-managed buffering and no framing work. Shared memory is the fast one - after the mapping is set up, transfers happen at memory speed with no kernel involvement - but the kernel gives you no synchronisation, so you bring your own semaphore or futex.",
    keyPoint: 'Choose on the copy-versus-coordination tradeoff rather than on familiarity. Shared memory is the only mechanism that avoids kernel copies, and it is therefore the only one where the concurrency control is your problem and a data race is possible; everything else serialises through the kernel and is race-free by construction.',
    companies: ['amazon', 'meta'],
    minutes: 8,
  },
  {
    id: 'csq-cpu-scheduling',
    topicId: 'cst-os',
    text: 'Walk me through the CPU scheduling algorithms and their tradeoffs.',
    answer: "FCFS is trivial and fair in arrival order, but one long job at the head wrecks average waiting time for everything behind it - the convoy effect. Shortest-job-first is provably optimal for average waiting time, but it needs burst lengths you do not have and it starves long jobs. Round robin bounds the time before any job gets the CPU, which is what interactive work needs, and pays for it in extra context switches. Multi-level feedback queues are what real kernels approximate: start every job at high priority and demote it as it consumes full quanta, so the scheduler infers which jobs are interactive instead of being told.",
    keyPoint: 'The interesting part of MLFQ is the safeguards, not the demotion. Without periodic priority boosting a long CPU-bound job that turns interactive stays stuck at the bottom forever, and without accounting for total quantum consumed rather than per-slice yielding, a process games its way into permanent high priority by relinquishing the CPU just before each slice expires.',
    companies: ['amazon'],
    minutes: 9,
  },
  {
    id: 'csq-priority-inversion',
    topicId: 'cst-os',
    text: 'What is priority inversion and how is it solved?',
    answer: "Priority inversion is when a high-priority task blocks on a lock held by a low-priority task, and then a medium-priority task that wants neither preempts the lock holder. The highest-priority task now waits, indirectly, on the lowest, for an unbounded time. Priority inheritance fixes it by temporarily raising the holder to the priority of the highest waiter so nothing in between can preempt it. Priority ceiling is the stricter variant: the holder immediately runs at the ceiling priority of any task that could ever acquire that lock.",
    keyPoint: 'What makes this worth understanding rather than memorising is that the locking code is correct - the scheduling policy is what is wrong - so the failure survives code review and unit testing and only appears under a particular timing. The Mars Pathfinder watchdog resets in 1997 are the canonical case, and were fixed by turning inheritance on.',
    companies: [],
    minutes: 7,
  },
  {
    id: 'csq-threading-models',
    topicId: 'cst-os',
    text: 'Explain the 1:1, N:1 and M:N multithreading models.',
    answer: "1:1 maps each user thread onto its own kernel thread: real parallelism across cores, and the kernel sees a blocking call so only that thread stops - but each thread costs a kernel stack and creating one is a syscall. This is what Linux and Windows do. N:1 multiplexes many user threads onto a single kernel thread: creation is almost free, but one blocking syscall stalls every thread and you can never use more than one core. M:N maps M user threads onto N kernel threads, which gets you cheap threads and parallelism at the cost of a substantially harder two-level scheduler.",
    keyPoint: 'M:N is where modern language runtimes live - goroutines and Java virtual threads are userspace schedulers riding on 1:1 kernel threads - and the hard part is the N:1 problem in miniature: the runtime has to notice a blocking syscall and hand the carrier thread off, or a single blocking call stalls everything queued behind it.',
    companies: [],
    minutes: 7,
  },
]

export const csQuestions: CsQuestion[] = [...osQuestions]
