import type { DsaPattern, DsaProblem } from '@/lib/content/schema'

export const dsaPatterns: DsaPattern[] = [
  {
    id: 'dsap-arrays-hashing',
    name: 'Arrays & Hashing',
    order: 1,
    signals: [
      'You need to count, group, or deduplicate values in one pass.',
      'The brute force is a nested loop over pairs and you want O(n).',
      'The question asks whether something has been seen before.',
    ],
    template: `# Count or index by value in one pass.
seen = {}
for i, x in enumerate(nums):
    if target - x in seen:
        return [seen[target - x], i]
    seen[x] = i
return []`,
    pitfalls: [
      'Writing the current value into the map before checking for its complement, which lets an element pair with itself.',
      'Using a list instead of a set for membership tests, turning O(n) into O(n^2).',
      'Forgetting that dict ordering is insertion order, not sorted order.',
    ],
  },
  {
    id: 'dsap-two-pointers',
    name: 'Two Pointers',
    order: 2,
    signals: [
      'The input is sorted, or sorting it does not lose information you need.',
      'You are looking for a pair or triple that satisfies a condition.',
      'You need to compare the ends of an array or string moving inward.',
    ],
    template: `# Converge from both ends on a sorted array.
lo, hi = 0, len(nums) - 1
while lo < hi:
    total = nums[lo] + nums[hi]
    if total == target:
        return [lo, hi]
    if total < target:
        lo += 1
    else:
        hi -= 1
return []`,
    pitfalls: [
      'Forgetting to skip duplicates after a match, which produces repeated answers in 3Sum.',
      'Using <= instead of < in the loop guard, which lets both pointers land on the same index.',
    ],
  },
  {
    id: 'dsap-sliding-window',
    name: 'Sliding Window',
    order: 3,
    signals: [
      'You need the best contiguous subarray or substring under a constraint.',
      'The brute force recomputes a window sum or count from scratch each time.',
      'The constraint is monotonic: growing the window only ever helps or only ever hurts.',
    ],
    template: `# Expand right, shrink left while the window is invalid.
left = 0
best = 0
count: dict[str, int] = {}
for right, ch in enumerate(s):
    count[ch] = count.get(ch, 0) + 1
    while invalid(count):
        count[s[left]] -= 1
        left += 1
    best = max(best, right - left + 1)
return best`,
    pitfalls: [
      'Shrinking the window with an if instead of a while, so it stops one step early when multiple shrinks are needed.',
      'Recomputing the window state from scratch on every right-pointer step instead of updating incrementally.',
    ],
  },
  {
    id: 'dsap-stack',
    name: 'Stack',
    order: 4,
    signals: [
      'You need to match nested pairs, like parentheses or tags.',
      'You are looking for the next greater or smaller element relative to each position.',
      'Undoing the most recent unresolved operation solves the problem (monotonic stack or expression eval).',
    ],
    template: `# Monotonic decreasing stack of indices for next-greater-element.
stack: list[int] = []
result = [0] * len(nums)
for i, x in enumerate(nums):
    while stack and nums[stack[-1]] < x:
        j = stack.pop()
        result[j] = i - j
    stack.append(i)
return result`,
    pitfalls: [
      'Popping the stack without checking it is non-empty first, causing an index error.',
      'Pushing values instead of indices when the answer depends on distance or position.',
    ],
  },
  {
    id: 'dsap-binary-search',
    name: 'Binary Search',
    order: 5,
    signals: [
      'The search space is sorted, or is monotonic even if the array itself is not (search on the answer).',
      'You need the boundary where a predicate flips from false to true.',
      'A linear scan works but the input size demands O(log n).',
    ],
    template: `# Search on the answer: find smallest x where feasible(x) is true.
lo, hi = low_bound, high_bound
while lo < hi:
    mid = (lo + hi) // 2
    if feasible(mid):
        hi = mid
    else:
        lo = mid + 1
return lo`,
    pitfalls: [
      'Using mid = (lo + hi) // 2 with hi = mid instead of mid - 1 inconsistently, causing an infinite loop.',
      'Forgetting to handle the rotated-array case where one half is sorted and the other is not.',
    ],
  },
  {
    id: 'dsap-linked-list',
    name: 'Linked List',
    order: 6,
    signals: [
      'You need to reverse, reorder, or detect a cycle without extra memory.',
      'The problem gives you a singly linked list and forbids converting it to an array.',
      'You need a fast and slow pointer to find a midpoint, cycle, or nth-from-end node.',
    ],
    template: `# Reverse a singly linked list iteratively.
prev = None
curr = head
while curr:
    nxt = curr.next
    curr.next = prev
    prev = curr
    curr = nxt
return prev`,
    pitfalls: [
      'Losing the reference to the next node before reassigning curr.next, orphaning the rest of the list.',
      'Forgetting a dummy head node, which complicates edge cases where the head itself is removed or replaced.',
    ],
  },
  {
    id: 'dsap-trees',
    name: 'Trees',
    order: 7,
    signals: [
      'The input is a binary tree or BST and you need depth, path, or structural comparison.',
      'A property must hold recursively for every subtree (balanced, same, valid BST).',
      'You need a level-by-level view, which points to BFS over DFS.',
    ],
    template: `# DFS returning a pair of (subtree valid, aggregated value).
def dfs(node, lo=float('-inf'), hi=float('inf')):
    if not node:
        return True
    if not (lo < node.val < hi):
        return False
    return dfs(node.left, lo, node.val) and dfs(node.right, node.val, hi)
return dfs(root)`,
    pitfalls: [
      'Validating a BST by only comparing a node to its immediate children instead of threading min/max bounds down the recursion.',
      'Using recursion depth equal to tree height without considering a skewed tree can blow the call stack.',
    ],
  },
  {
    id: 'dsap-heap',
    name: 'Heap / Priority Queue',
    order: 8,
    signals: [
      'You repeatedly need the current min or max as the data set changes.',
      'The question says "kth largest/smallest" or "top k".',
      'You need to merge many sorted sources or schedule by priority.',
    ],
    template: `# Maintain the k largest seen so far with a min-heap of size k.
import heapq
heap: list[int] = []
for x in nums:
    heapq.heappush(heap, x)
    if len(heap) > k:
        heapq.heappop(heap)
return heap[0]`,
    pitfalls: [
      'Using a max-heap approach that keeps every element instead of a bounded min-heap of size k, costing extra memory and time.',
      "Forgetting Python's heapq is min-heap only, so max-heap behavior needs negated values.",
    ],
  },
  {
    id: 'dsap-backtracking',
    name: 'Backtracking',
    order: 9,
    signals: [
      'You need all combinations, subsets, or permutations satisfying a constraint.',
      'A greedy or DP shortcut does not exist because you must enumerate, not just count.',
      'The problem allows pruning: an invalid partial choice can be abandoned early.',
    ],
    template: `# Build subsets by choosing to include or skip each index.
def backtrack(i, path):
    if i == len(nums):
        result.append(path[:])
        return
    path.append(nums[i])
    backtrack(i + 1, path)
    path.pop()
    backtrack(i + 1, path)
backtrack(0, [])`,
    pitfalls: [
      'Appending a reference to the mutable path list instead of a copy, so later mutations corrupt saved results.',
      'Forgetting to undo (pop) a choice before trying the next branch, leaking state across siblings.',
    ],
  },
  {
    id: 'dsap-tries',
    name: 'Tries',
    order: 10,
    signals: [
      'You need fast prefix lookups across many strings.',
      'The question involves autocomplete, word search with a dictionary, or "starts with".',
      'A hash set of full words is too slow because you need partial-match queries.',
    ],
    template: `# Insert a word into a trie of nested dicts.
node = root
for ch in word:
    node = node.setdefault(ch, {})
node['#'] = True  # end-of-word marker`,
    pitfalls: [
      'Forgetting an explicit end-of-word marker, so "app" incorrectly reports as present when only "apple" was inserted.',
      'Rebuilding the trie from scratch per query instead of reusing one built once.',
    ],
  },
  {
    id: 'dsap-graphs',
    name: 'Graphs',
    order: 11,
    signals: [
      'The input is a grid, adjacency list, or edges describing connections.',
      'You need connectivity, shortest unweighted path, or cycle detection.',
      'A dependency ordering (course prerequisites) implies topological sort.',
    ],
    template: `# BFS shortest path / level order on an adjacency list.
from collections import deque
visited = {start}
q = deque([start])
steps = 0
while q:
    for _ in range(len(q)):
        node = q.popleft()
        if node == target:
            return steps
        for nb in graph[node]:
            if nb not in visited:
                visited.add(nb)
                q.append(nb)
    steps += 1
return -1`,
    pitfalls: [
      'Marking a node visited when it is popped instead of when it is enqueued, allowing duplicates in the queue.',
      'Using DFS for shortest-path-in-unweighted-graph problems, which does not guarantee the minimum distance.',
    ],
  },
  {
    id: 'dsap-advanced-graphs',
    name: 'Advanced Graphs',
    order: 12,
    signals: [
      'Edges carry weights and you need shortest path, minimum spanning tree, or a bounded number of stops.',
      'The graph has an ordering constraint that a simple topological sort cannot capture (cycles allowed, weighted).',
      'Union-Find is a better fit than repeated DFS for incremental connectivity queries.',
    ],
    template: `# Dijkstra shortest path with a min-heap.
import heapq
dist = {start: 0}
heap = [(0, start)]
while heap:
    d, node = heapq.heappop(heap)
    if d > dist.get(node, float('inf')):
        continue
    for nb, w in graph[node]:
        nd = d + w
        if nd < dist.get(nb, float('inf')):
            dist[nb] = nd
            heapq.heappush(heap, (nd, nb))
return dist`,
    pitfalls: [
      'Not skipping a stale heap entry when a shorter distance was already found, causing wasted or incorrect relaxations.',
      "Using Dijkstra on a graph with negative edge weights, where it silently gives wrong answers instead of erroring.",
    ],
  },
  {
    id: 'dsap-dp-1d',
    name: '1-D Dynamic Programming',
    order: 13,
    signals: [
      "The answer at position i depends only on a fixed number of previous positions (i-1, i-2, ...).",
      'A recursive brute force has overlapping subproblems indexed by a single integer.',
      'The question asks for a count, min cost, or max value over sequences ending at each index.',
    ],
    template: `# Bottom-up DP where dp[i] depends on dp[i-1] and dp[i-2].
if n <= 1:
    return 1
dp = [0] * (n + 1)
dp[0], dp[1] = 1, 1
for i in range(2, n + 1):
    dp[i] = dp[i - 1] + dp[i - 2]
return dp[n]`,
    pitfalls: [
      'Sizing dp as [0] * (n + 1) and then writing dp[0], dp[1] = 1, 1 without a base-case guard, which throws an IndexError as soon as n is 0.',
      'Off-by-one errors in the base cases, especially dp[0] vs dp[1], that silently shift every later value.',
    ],
  },
  {
    id: 'dsap-dp-2d',
    name: '2-D Dynamic Programming',
    order: 14,
    signals: [
      'You are comparing or combining two sequences (strings, arrays) index by index.',
      'The state needs two indices, like position in string A and position in string B.',
      'A grid problem asks for the number of paths or the min/max cost to reach each cell.',
    ],
    template: `# Longest common subsequence over a 2-D grid of dp states.
m, n = len(a), len(b)
dp = [[0] * (n + 1) for _ in range(m + 1)]
for i in range(1, m + 1):
    for j in range(1, n + 1):
        if a[i - 1] == b[j - 1]:
            dp[i][j] = dp[i - 1][j - 1] + 1
        else:
            dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
return dp[m][n]`,
    pitfalls: [
      'Allocating the dp grid with shared row references (e.g. [[0]*n]*m), so writing to one row mutates all rows.',
      'Confusing the 1-indexed dp grid with the 0-indexed input strings, off-by-one in the char lookups.',
    ],
  },
  {
    id: 'dsap-greedy',
    name: 'Greedy',
    order: 15,
    signals: [
      'A local optimal choice at each step provably leads to a global optimum.',
      'Sorting the input first, then scanning once, solves the problem.',
      'DP would work but is overkill because no subproblem needs to be revisited.',
    ],
    template: `# Track the farthest reachable index while scanning left to right.
farthest = 0
for i, x in enumerate(nums):
    if i > farthest:
        return False
    farthest = max(farthest, i + x)
return True`,
    pitfalls: [
      'Updating farthest with max(farthest, i + x) but never checking i > farthest first, so the loop walks past a gap it could never have reached and returns the wrong answer instead of failing fast.',
      'Forgetting to sort by the right key (start time vs end time) before the greedy scan.',
    ],
  },
  {
    id: 'dsap-intervals',
    name: 'Intervals',
    order: 16,
    signals: [
      'The input is a list of (start, end) ranges that may overlap.',
      'You need to merge, insert, or count overlaps among ranges.',
      'The question is about scheduling rooms, meetings, or resource conflicts.',
    ],
    template: `# Merge overlapping intervals after sorting by start.
if not intervals:
    return []
intervals.sort(key=lambda iv: iv[0])
merged = [intervals[0]]
for start, end in intervals[1:]:
    if start <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], end)
    else:
        merged.append([start, end])
return merged`,
    pitfalls: [
      'Forgetting to sort the intervals first, so the merge scan misses overlaps that are out of order.',
      'Using < instead of <= when checking overlap, mishandling intervals that touch exactly at the boundary.',
      'Indexing intervals[0] to seed merged before checking whether intervals is empty, which throws an IndexError on an empty input.',
    ],
  },
  {
    id: 'dsap-math-geometry',
    name: 'Math & Geometry',
    order: 17,
    signals: [
      'The problem is about matrix rotation, traversal order, or in-place transformation.',
      'You need modular arithmetic, digit manipulation, or careful floating point handling.',
      'Simulating the process directly is feasible and clearer than finding a closed form.',
    ],
    template: `# Rotate an n x n matrix 90 degrees clockwise in place.
n = len(matrix)
for i in range(n):
    for j in range(i + 1, n):
        matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
for row in matrix:
    row.reverse()`,
    pitfalls: [
      'Allocating a new matrix when the problem requires an in-place transformation.',
      'Transposing and reversing in the wrong order, which rotates counter-clockwise instead of clockwise.',
    ],
  },
  {
    id: 'dsap-bit-manipulation',
    name: 'Bit Manipulation',
    order: 18,
    signals: [
      'The question mentions XOR, AND/OR masks, or counting set bits.',
      'You need O(1) extra space and the input fits in a fixed-width integer.',
      'Finding a single unique element among duplicates hints at XOR cancellation.',
    ],
    template: `# XOR cancels every value that appears twice, leaving the unique one.
result = 0
for x in nums:
    result ^= x
return result`,
    pitfalls: [
      "Assuming Python integers wrap like fixed-width ints, forgetting to mask with 0xFFFFFFFF for 32-bit results.",
      'Returning a masked value like x & 0xFFFFFFFF directly as a negative number without converting back through two’s complement, so a result that should be negative in 32-bit arithmetic instead prints as a large positive Python int.',
    ],
  },
]

export const dsaProblems: DsaProblem[] = [
  // --- Arrays & Hashing (9) ---
  {
    id: 'dsa-217-contains-duplicate',
    patternId: 'dsap-arrays-hashing',
    name: 'Contains Duplicate',
    leetcodeNumber: 217,
    url: 'https://leetcode.com/problems/contains-duplicate/',
    difficulty: 'easy',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 20,
    signal: 'The question is only ever "has this value appeared before?" — no order, no index, no count is asked for.',
    approach: `Brute force compares every pair, which is O(n^2). A set answers "seen before?"
in O(1) expected time, so one pass over the array is enough: add as you go and
return the moment an insert finds a value already present. The early return
matters — you do not have to build the whole set to know the answer.`,
    solution: `def contains_duplicate(nums: list[int]) -> bool:
    seen: set[int] = set()
    for n in nums:
        if n in seen:
            return True
        seen.add(n)
    return False`,
    complexity: {
      time: 'O(n) — one pass, and each set membership test and insert is O(1) expected on hashed integers.',
      space: 'O(n) — worst case every element is distinct and lands in the set.',
    },
    followUps: [
      'What if the array is sorted? Then adjacent equality is enough and you drop to O(1) extra space.',
      'What if it does not fit in memory? Hash-partition by value into buckets and check each bucket independently.',
      'What if you must find the duplicate value, not just whether one exists, in O(1) space?',
    ],
  },
  {
    id: 'dsa-242-valid-anagram',
    patternId: 'dsap-arrays-hashing',
    name: 'Valid Anagram',
    leetcodeNumber: 242,
    url: 'https://leetcode.com/problems/valid-anagram/',
    difficulty: 'easy',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 20,
    signal: 'Two strings, and only the multiset of characters matters — order is explicitly irrelevant.',
    approach: `An anagram is a statement about counts, not order, so compare character counts.
Sorting both strings also works and is O(n log n); counting is O(n) and reads
better. Check lengths first: unequal lengths can never be anagrams and the
early exit saves a pass.`,
    solution: `from collections import Counter


def is_anagram(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    return Counter(s) == Counter(t)`,
    complexity: {
      time: 'O(n) — one pass to count each string, and the dict comparison touches each distinct key once.',
      space: 'O(k) — bounded by the alphabet size k, so O(1) for lowercase ASCII.',
    },
    followUps: [
      'What if the inputs are Unicode? Counter still works, but the O(1) space claim dies with a fixed 26-slot array.',
      'What if you get a stream of words and must group all anagrams together?',
      'What if you may ignore case and punctuation — where does the normalisation belong?',
    ],
  },
  {
    id: 'dsa-1-two-sum',
    patternId: 'dsap-arrays-hashing',
    name: 'Two Sum',
    leetcodeNumber: 1,
    url: 'https://leetcode.com/problems/two-sum/',
    difficulty: 'easy',
    core: true,
    companies: ['google', 'meta', 'amazon'],
    minutes: 20,
    signal: 'Find the pair that sums to a target, and the answer wanted is indices — so you must remember where each value lived.',
    approach: `Instead of asking "which two add to target", ask for each element "have I already
seen target - x?". A dict from value to index answers that in O(1), turning the
O(n^2) double loop into one pass. Record the current value only after checking,
or an element can pair with itself.`,
    solution: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen: dict[int, int] = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []`,
    complexity: {
      time: 'O(n) — one pass, with an O(1) expected dict lookup and insert per element.',
      space: 'O(n) — the dict holds up to every prefix element before the match is found.',
    },
    followUps: [
      'What if the array is sorted? Two converging pointers solve it in O(1) extra space.',
      'What if there are multiple valid pairs and you must return all of them without duplicates?',
      'What if it is three numbers summing to the target instead of two?',
    ],
  },
  {
    id: 'dsa-49-group-anagrams',
    patternId: 'dsap-arrays-hashing',
    name: 'Group Anagrams',
    leetcodeNumber: 49,
    url: 'https://leetcode.com/problems/group-anagrams/',
    difficulty: 'medium',
    core: true,
    companies: ['meta'],
    minutes: 30,
    signal: 'You must partition items into buckets, and membership in a bucket is decided by a canonical form of the item.',
    approach: `Every grouping problem reduces to finding a key that is identical for members of a
group and different across groups. For anagrams the sorted characters — or the
26-length count tuple — is that key. One pass builds a dict from key to list;
comparing every pair instead would be O(n^2) string comparisons.`,
    solution: `from collections import defaultdict


def group_anagrams(strs: list[str]) -> list[list[str]]:
    groups: dict[tuple[int, ...], list[str]] = defaultdict(list)
    for word in strs:
        counts = [0] * 26
        for ch in word:
            counts[ord(ch) - ord("a")] += 1
        groups[tuple(counts)].append(word)
    return list(groups.values())`,
    complexity: {
      time: 'O(n * k) — each of the n words is counted once in a pass over its k characters; no sort needed.',
      space: 'O(n * k) — the output holds every input string, plus one 26-slot key per distinct group.',
    },
    followUps: [
      'What if the alphabet is Unicode? The fixed 26-slot key breaks; switch to a sorted tuple or a frozen Counter.',
      'What if the word list does not fit in memory? Shard by the hash of the canonical key so each group lands on one machine.',
      'What if you only need the largest anagram group, not all of them?',
    ],
  },
  {
    id: 'dsa-347-top-k-frequent-elements',
    patternId: 'dsap-arrays-hashing',
    name: 'Top K Frequent Elements',
    leetcodeNumber: 347,
    url: 'https://leetcode.com/problems/top-k-frequent-elements/',
    difficulty: 'medium',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 30,
    signal: '"The k most frequent" — a ranking question where k is much smaller than n, so a full sort is more work than you need.',
    approach: `Count with a dict, then rank. Sorting the counts is O(n log n); bucket sort is
O(n) because a frequency can never exceed n, so an array of n+1 buckets indexed
by count holds every element. Walk the buckets from high to low and stop once
you have k. A size-k heap is the middle ground at O(n log k).`,
    solution: `from collections import Counter


def top_k_frequent(nums: list[int], k: int) -> list[int]:
    counts = Counter(nums)
    buckets: list[list[int]] = [[] for _ in range(len(nums) + 1)]
    for value, freq in counts.items():
        buckets[freq].append(value)

    out: list[int] = []
    for freq in range(len(nums), 0, -1):
        for value in buckets[freq]:
            out.append(value)
            if len(out) == k:
                return out
    return out`,
    complexity: {
      time: 'O(n) — counting is one pass and the bucket walk visits n+1 buckets holding n values in total, with no comparison sort.',
      space: 'O(n) — the counter plus n+1 buckets, both linear in the input.',
    },
    followUps: [
      'What if the numbers arrive as an unbounded stream? Buckets need n up front; use a size-k heap or a sketch like count-min instead.',
      'What if you need the k least frequent? The bucket walk reverses, but ties now matter more.',
      'What if counts are approximate but memory is fixed — how much error does count-min sketch admit?',
    ],
  },
  {
    id: 'dsa-271-encode-and-decode-strings',
    patternId: 'dsap-arrays-hashing',
    name: 'Encode and Decode Strings',
    leetcodeNumber: 271,
    url: 'https://leetcode.com/problems/encode-and-decode-strings/',
    difficulty: 'medium',
    core: true,
    companies: ['meta'],
    minutes: 30,
    signal: 'You must round-trip a list through a single string with no forbidden characters — so no delimiter is safe and you need length prefixes.',
    approach: `Any separator character can also appear inside a payload, so delimiting is wrong.
Instead prefix each string with its length and a marker: "5#hello". The decoder
reads digits up to the marker, then takes exactly that many characters, so the
payload is never scanned for structure. This is the same framing every wire
protocol uses.`,
    solution: `def encode(strs: list[str]) -> str:
    return "".join(f"{len(s)}#{s}" for s in strs)


def decode(s: str) -> list[str]:
    out: list[str] = []
    i = 0
    while i < len(s):
        j = s.index("#", i)
        length = int(s[i:j])
        out.append(s[j + 1 : j + 1 + length])
        i = j + 1 + length
    return out`,
    complexity: {
      time: 'O(total) for each direction — every character of every string is written once and read once, with no rescanning.',
      space: 'O(total) — the encoded string, or the decoded list, is the same size as the input.',
    },
    followUps: [
      'What if strings can be gigabytes? Stream the length header then copy bytes, never materialising the whole joined string.',
      'What if the transport is binary? Use a fixed-width big-endian length rather than decimal digits and a marker.',
      'What if the list is nested, so entries are themselves lists? The framing has to become recursive.',
    ],
  },
  {
    id: 'dsa-238-product-of-array-except-self',
    patternId: 'dsap-arrays-hashing',
    name: 'Product of Array Except Self',
    leetcodeNumber: 238,
    url: 'https://leetcode.com/problems/product-of-array-except-self/',
    difficulty: 'medium',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 30,
    signal: 'Every output cell needs an aggregate of everything except itself, and division is banned or unsafe because of zeros.',
    approach: `Everything except i splits cleanly into everything left of i and everything right
of i. One forward pass writes running prefix products into the output, one
backward pass multiplies in the running suffix product held in a single
variable. That is two passes and no extra array beyond the answer.`,
    solution: `def product_except_self(nums: list[int]) -> list[int]:
    n = len(nums)
    out = [1] * n

    prefix = 1
    for i in range(n):
        out[i] = prefix
        prefix *= nums[i]

    suffix = 1
    for i in range(n - 1, -1, -1):
        out[i] *= suffix
        suffix *= nums[i]

    return out`,
    complexity: {
      time: 'O(n) — exactly two passes over the array, each doing one multiply per element.',
      space: 'O(1) extra — the output array is required by the problem; only two scalars are held besides it.',
    },
    followUps: [
      'What if division were allowed? One pass and a total product works, but you must special-case one zero and two-or-more zeros.',
      'What if the array is updated and re-queried? Precomputed prefix and suffix arrays go stale; a segment tree gives O(log n) updates.',
      'What if products overflow a 64-bit integer — do you switch to logs, or to modular arithmetic?',
    ],
  },
  {
    id: 'dsa-36-valid-sudoku',
    patternId: 'dsap-arrays-hashing',
    name: 'Valid Sudoku',
    leetcodeNumber: 36,
    url: 'https://leetcode.com/problems/valid-sudoku/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
    signal: 'A grid with three overlapping uniqueness constraints — row, column, and box — all checkable in a single pass.',
    approach: `Do not validate row by row then column by column; make one pass and record each
filled digit in three sets keyed by row index, column index, and box index. The
box index is the pair (r // 3, c // 3). If any insert finds a duplicate, the
board is invalid. Only the given digits are checked; solvability is a different
problem.`,
    solution: `from collections import defaultdict


def is_valid_sudoku(board: list[list[str]]) -> bool:
    rows: dict[int, set[str]] = defaultdict(set)
    cols: dict[int, set[str]] = defaultdict(set)
    boxes: dict[tuple[int, int], set[str]] = defaultdict(set)

    for r, row in enumerate(board):
        for c, val in enumerate(row):
            if val == ".":
                continue
            box = (r // 3, c // 3)
            if val in rows[r] or val in cols[c] or val in boxes[box]:
                return False
            rows[r].add(val)
            cols[c].add(val)
            boxes[box].add(val)
    return True`,
    complexity: {
      time: 'O(1) for a fixed 9x9 board — 81 cells, each doing three O(1) set operations; O(n^2) for an n x n generalisation.',
      space: 'O(1) for 9x9 — 27 sets of at most 9 digits each; O(n^2) in general.',
    },
    followUps: [
      'What if you must actually solve the board? Backtracking reuses exactly these three constraint sets for pruning.',
      'What if the board is n^2 x n^2 for arbitrary n — does the box index formula still hold?',
      'What if cells stream in one at a time and you must reject the first illegal move?',
    ],
  },
  {
    id: 'dsa-128-longest-consecutive-sequence',
    patternId: 'dsap-arrays-hashing',
    name: 'Longest Consecutive Sequence',
    leetcodeNumber: 128,
    url: 'https://leetcode.com/problems/longest-consecutive-sequence/',
    difficulty: 'medium',
    core: true,
    companies: ['meta'],
    minutes: 30,
    signal: 'Longest run of consecutive integers, but the input is unsorted and the required time forbids sorting.',
    approach: `Sorting gives the answer in O(n log n); the O(n) trick is to put everything in a
set and only start counting from a value whose predecessor is absent — that
value is the head of its run. Each run is then walked once, so across all runs
the total work is linear, not quadratic.`,
    solution: `def longest_consecutive(nums: list[int]) -> int:
    values = set(nums)
    best = 0
    for n in values:
        if n - 1 in values:
            continue  # not the start of a run
        length = 1
        while n + length in values:
            length += 1
        best = max(best, length)
    return best`,
    complexity: {
      time: 'O(n) — the inner while only runs from a run\'s head, so every value is visited at most twice overall.',
      space: 'O(n) — the set of distinct values.',
    },
    followUps: [
      'What if the numbers arrive as a stream and you must report the current best after each insert? Union-find over neighbours does it.',
      'What if you must return the sequence itself, not its length?',
      'What if duplicates should count separately — does the set-based approach still apply?',
    ],
  },

  // --- Two Pointers (5) ---
  {
    id: 'dsa-125-valid-palindrome',
    patternId: 'dsap-two-pointers',
    name: 'Valid Palindrome',
    leetcodeNumber: 125,
    url: 'https://leetcode.com/problems/valid-palindrome/',
    difficulty: 'easy',
    core: true,
    companies: ['meta'],
    minutes: 20,
    signal: 'Compare a sequence against its reverse, with characters to skip — the classic converge-from-both-ends shape.',
    approach: `Building a cleaned copy then comparing with its reverse is correct but costs O(n)
extra space. Two pointers walking inward do it in place: advance each past any
character that is not alphanumeric, then compare case-folded. Mismatch means
not a palindrome; the pointers crossing means it is.`,
    solution: `def is_palindrome(s: str) -> bool:
    lo, hi = 0, len(s) - 1
    while lo < hi:
        if not s[lo].isalnum():
            lo += 1
        elif not s[hi].isalnum():
            hi -= 1
        elif s[lo].lower() != s[hi].lower():
            return False
        else:
            lo += 1
            hi -= 1
    return True`,
    complexity: {
      time: 'O(n) — each pointer moves only forward or only backward, so together they take at most n steps.',
      space: 'O(1) — two indices, no cleaned copy of the string.',
    },
    followUps: [
      'What if you may delete one character and still call it a palindrome? The pointers fork into two candidate checks.',
      'What if the input is a linked list, where you cannot index from the end?',
      'What if \'alphanumeric\' must follow Unicode rules rather than ASCII?',
    ],
  },
  {
    id: 'dsa-167-two-sum-ii-input-array-is-sorted',
    patternId: 'dsap-two-pointers',
    name: 'Two Sum II',
    leetcodeNumber: 167,
    url: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/',
    difficulty: 'medium',
    core: false,
    companies: ['meta'],
    minutes: 30,
    signal: 'Two Sum, except the array is stated to be sorted — that word is the whole hint, and O(1) space is demanded.',
    approach: `Sortedness makes the sum monotonic in each pointer: moving lo right can only
increase the sum, moving hi left can only decrease it. So compare the current
sum to the target and move the one pointer that can help. No hash map is
needed, which is why the space bound drops to O(1).`,
    solution: `def two_sum_sorted(numbers: list[int], target: int) -> list[int]:
    lo, hi = 0, len(numbers) - 1
    while lo < hi:
        total = numbers[lo] + numbers[hi]
        if total == target:
            return [lo + 1, hi + 1]  # problem uses 1-based indices
        if total < target:
            lo += 1
        else:
            hi -= 1
    return []`,
    complexity: {
      time: 'O(n) — the two pointers only ever move toward each other, so the window shrinks by one every iteration.',
      space: 'O(1) — two indices and a sum, no auxiliary structure.',
    },
    followUps: [
      'What if the array were unsorted? You are back to a hash map and O(n) space, or O(n log n) to sort first.',
      'What if the array is enormous and you may only binary search? For each i, search for target - numbers[i] in O(n log n).',
      'What if you must count all pairs summing to the target, with duplicates present?',
    ],
  },
  {
    id: 'dsa-15-3sum',
    patternId: 'dsap-two-pointers',
    name: '3Sum',
    leetcodeNumber: 15,
    url: 'https://leetcode.com/problems/3sum/',
    difficulty: 'medium',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 30,
    signal: 'Find triples summing to a fixed value, and the answer set must contain no duplicate triples.',
    approach: `Sort, then fix the first element and solve the remaining Two Sum with two
pointers — O(n^2) instead of the O(n^3) triple loop. Sorting is what makes both
the pointer walk and the duplicate handling possible: skip a fixed element equal
to its predecessor, and after recording a hit skip equal values on both sides.`,
    solution: `def three_sum(nums: list[int]) -> list[list[int]]:
    nums.sort()
    out: list[list[int]] = []
    n = len(nums)

    for i in range(n - 2):
        if nums[i] > 0:
            break  # sorted, so no triple from here can reach zero
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        lo, hi = i + 1, n - 1
        while lo < hi:
            total = nums[i] + nums[lo] + nums[hi]
            if total < 0:
                lo += 1
            elif total > 0:
                hi -= 1
            else:
                out.append([nums[i], nums[lo], nums[hi]])
                lo += 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1
    return out`,
    complexity: {
      time: 'O(n^2) — an O(n log n) sort, then for each of n fixed elements a linear two-pointer sweep.',
      space: 'O(1) beyond the output if the sort is in place, since only indices are held.',
    },
    followUps: [
      'What if it is 4Sum? Fix two elements and reuse the same sweep — the pattern generalises to kSum at O(n^(k-1)).',
      'What if you want the triple closest to a target rather than exactly equal to it?',
      'What if you only need the count of triples, not the triples themselves — can you avoid deduplicating?',
    ],
  },
  {
    id: 'dsa-11-container-with-most-water',
    patternId: 'dsap-two-pointers',
    name: 'Container With Most Water',
    leetcodeNumber: 11,
    url: 'https://leetcode.com/problems/container-with-most-water/',
    difficulty: 'medium',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 30,
    signal: 'Maximise a value formed by a pair of positions where the value depends on their distance and the smaller of the two.',
    approach: `Start with the widest possible pair. Area is width times the shorter wall, so
moving the taller wall inward can never help: width strictly shrinks and the
limiting height cannot rise. Therefore always move the shorter wall, which is
the only move that can improve the answer, and one linear sweep suffices.`,
    solution: `def max_area(height: list[int]) -> int:
    lo, hi = 0, len(height) - 1
    best = 0
    while lo < hi:
        best = max(best, (hi - lo) * min(height[lo], height[hi]))
        if height[lo] < height[hi]:
            lo += 1
        else:
            hi -= 1
    return best`,
    complexity: {
      time: 'O(n) — one pointer moves inward every iteration, so there are at most n iterations.',
      space: 'O(1) — two indices and the running best.',
    },
    followUps: [
      'Prove the greedy move is safe: why can discarding the shorter wall never discard the optimal pair?',
      'What if the container may use three walls, forming a trapped-water problem instead?',
      'What if heights stream in and you must report the best area so far after every arrival?',
    ],
  },
  {
    id: 'dsa-42-trapping-rain-water',
    patternId: 'dsap-two-pointers',
    name: 'Trapping Rain Water',
    leetcodeNumber: 42,
    url: 'https://leetcode.com/problems/trapping-rain-water/',
    difficulty: 'hard',
    core: false,
    companies: ['google', 'amazon'],
    minutes: 45,
    signal: 'Water above each bar is bounded by the tallest bar on each side — a per-cell answer that depends on a prefix max and a suffix max.',
    approach: `Water over index i is min(max left, max right) - height[i]. Precomputing both max
arrays is O(n) time and O(n) space; two pointers get it to O(1) space. Whichever
side has the smaller running max is the binding constraint, so that side's cell
can be settled immediately and its pointer advanced.`,
    solution: `def trap(height: list[int]) -> int:
    if not height:
        return 0

    lo, hi = 0, len(height) - 1
    left_max, right_max = height[lo], height[hi]
    total = 0

    while lo < hi:
        if left_max <= right_max:
            lo += 1
            left_max = max(left_max, height[lo])
            total += left_max - height[lo]
        else:
            hi -= 1
            right_max = max(right_max, height[hi])
            total += right_max - height[hi]

    return total`,
    complexity: {
      time: 'O(n) — each index is visited exactly once as one of the two pointers sweeps toward the other.',
      space: 'O(1) — two running maxima replace the prefix and suffix max arrays.',
    },
    followUps: [
      'What if the terrain is 2D? The greedy fails; you need a min-heap flood fill from the border inward.',
      'What if bars have width, or the answer must be per-column volumes rather than a total?',
      'Can you do it with a monotonic decreasing stack instead — what does each pop represent?',
    ],
  },

  // --- Sliding Window (6) ---
  {
    id: 'dsa-121-best-time-to-buy-and-sell-stock',
    patternId: 'dsap-sliding-window',
    name: 'Best Time to Buy and Sell Stock',
    leetcodeNumber: 121,
    url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
    difficulty: 'easy',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 20,
    signal: 'Maximise a difference where the smaller value must come first in the array — order-constrained, single transaction.',
    approach: `The best sale on day i is that day's price minus the cheapest price seen before
it. So sweep once, carrying the running minimum, and take the best difference.
The O(n^2) pairwise scan recomputes that minimum from scratch every day, which
is the only thing it wastes.`,
    solution: `def max_profit(prices: list[int]) -> int:
    cheapest = float("inf")
    best = 0
    for price in prices:
        cheapest = min(cheapest, price)
        best = max(best, price - cheapest)
    return best`,
    complexity: {
      time: 'O(n) — a single pass keeping a running minimum, no recomputation per day.',
      space: 'O(1) — two scalars regardless of how long the price series is.',
    },
    followUps: [
      'What if you may transact any number of times? Sum every upward step — a different greedy entirely.',
      'What if you are limited to at most k transactions? That becomes 2D DP over day and transactions used.',
      'What if a cooldown day is enforced after every sale?',
    ],
  },
  {
    id: 'dsa-3-longest-substring-without-repeating-characters',
    patternId: 'dsap-sliding-window',
    name: 'Longest Substring Without Repeating Characters',
    leetcodeNumber: 3,
    url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
    difficulty: 'medium',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 30,
    signal: 'Longest contiguous stretch under a constraint that only ever breaks by adding a character — the textbook sliding window.',
    approach: `Grow the window to the right. When the incoming character is already inside, the
window is invalid, so shrink from the left until it is not. Every index enters
and leaves the window at most once, so the sweep is linear where the brute force
re-scans every substring at O(n^2).`,
    solution: `def length_of_longest_substring(s: str) -> int:
    window: set[str] = set()
    left = 0
    best = 0

    for right, ch in enumerate(s):
        while ch in window:
            window.remove(s[left])
            left += 1
        window.add(ch)
        best = max(best, right - left + 1)

    return best`,
    complexity: {
      time: 'O(n) — left and right each advance at most n times in total, so the nested while is amortised O(1).',
      space: 'O(k) — the window set holds at most one entry per distinct character, so O(1) for a fixed alphabet.',
    },
    followUps: [
      'What if at most k distinct characters are allowed instead of zero repeats? Swap the set for a count map.',
      'What if you must return the substring itself? Track the left index at the moment the best was set.',
      'Can you jump the left pointer straight past the previous occurrence instead of shrinking one step at a time?',
    ],
  },
  {
    id: 'dsa-424-longest-repeating-character-replacement',
    patternId: 'dsap-sliding-window',
    name: 'Longest Repeating Character Replacement',
    leetcodeNumber: 424,
    url: 'https://leetcode.com/problems/longest-repeating-character-replacement/',
    difficulty: 'medium',
    core: true,
    companies: ['meta'],
    minutes: 30,
    signal: 'A window is legal while the number of edits needed to make it uniform stays within a budget k.',
    approach: `A window can be made uniform with (length - count of its most common character)
replacements. Keep counts as the window grows; when that cost exceeds k, shrink
from the left. Because the answer only ever grows, the classic trick is to never
shrink the window below the best seen, giving a single clean pass.`,
    solution: `from collections import defaultdict


def character_replacement(s: str, k: int) -> int:
    counts: dict[str, int] = defaultdict(int)
    left = 0
    most_common = 0
    best = 0

    for right, ch in enumerate(s):
        counts[ch] += 1
        most_common = max(most_common, counts[ch])
        while (right - left + 1) - most_common > k:
            counts[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)

    return best`,
    complexity: {
      time: 'O(n) — right advances n times and left never moves backward, so total pointer movement is bounded by 2n.',
      space: 'O(k) — one counter per distinct character, so O(1) for a fixed alphabet.',
    },
    followUps: [
      'Why is it safe never to decrease most_common when shrinking? What invariant does the answer rely on?',
      'What if replacements cost different amounts per character, so the budget is weighted?',
      'What if you must return which characters to replace, not just the length?',
    ],
  },
  {
    id: 'dsa-567-permutation-in-string',
    patternId: 'dsap-sliding-window',
    name: 'Permutation in String',
    leetcodeNumber: 567,
    url: 'https://leetcode.com/problems/permutation-in-string/',
    difficulty: 'medium',
    core: false,
    companies: ['meta'],
    minutes: 30,
    signal: 'Does any contiguous window match a target multiset? The window length is fixed, which is the tell for a fixed-size window.',
    approach: `A permutation of s1 is exactly a window of length len(s1) whose character counts
match s1's. So slide a fixed-width window across s2, adding the entering char
and removing the leaving one, and compare counts. Keeping a running "how many
of the 26 counts currently match" makes each step O(1) rather than O(26).`,
    solution: `def check_inclusion(s1: str, s2: str) -> bool:
    if len(s1) > len(s2):
        return False

    need = [0] * 26
    window = [0] * 26
    for ch in s1:
        need[ord(ch) - 97] += 1
    for ch in s2[: len(s1)]:
        window[ord(ch) - 97] += 1

    matches = sum(1 for i in range(26) if need[i] == window[i])
    if matches == 26:
        return True

    for right in range(len(s1), len(s2)):
        for idx, delta in ((ord(s2[right]) - 97, 1), (ord(s2[right - len(s1)]) - 97, -1)):
            if need[idx] == window[idx]:
                matches -= 1
            window[idx] += delta
            if need[idx] == window[idx]:
                matches += 1
        if matches == 26:
            return True

    return False`,
    complexity: {
      time: 'O(n + m) — the initial window costs m, then each of the n - m slides does a constant amount of counter fixing.',
      space: 'O(1) — two fixed 26-slot arrays, independent of input length.',
    },
    followUps: [
      'What if you must return every start index, not just whether one exists? That is Find All Anagrams, same window.',
      'What if the alphabet is Unicode? The 26-slot arrays become dicts and the O(1) space claim goes.',
      'What if s2 is a stream you can only read once — does the fixed window still work?',
    ],
  },
  {
    id: 'dsa-76-minimum-window-substring',
    patternId: 'dsap-sliding-window',
    name: 'Minimum Window Substring',
    leetcodeNumber: 76,
    url: 'https://leetcode.com/problems/minimum-window-substring/',
    difficulty: 'hard',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 45,
    signal: 'Smallest window covering a required multiset — a shrinking window where validity is measured by how many required counts are satisfied.',
    approach: `Expand right until the window covers every required character, then shrink from
the left as far as validity allows, recording the best. A single "how many
distinct required characters are currently satisfied" counter turns the validity
check into O(1), so the whole sweep is linear rather than the O(n^2) scan over
all substrings.`,
    solution: `from collections import Counter


def min_window(s: str, t: str) -> str:
    if not t or len(t) > len(s):
        return ""

    need = Counter(t)
    window: Counter[str] = Counter()
    required = len(need)
    satisfied = 0

    best_len = len(s) + 1
    best_start = 0
    left = 0

    for right, ch in enumerate(s):
        window[ch] += 1
        if ch in need and window[ch] == need[ch]:
            satisfied += 1

        while satisfied == required:
            if right - left + 1 < best_len:
                best_len = right - left + 1
                best_start = left
            out = s[left]
            window[out] -= 1
            if out in need and window[out] < need[out]:
                satisfied -= 1
            left += 1

    return "" if best_len > len(s) else s[best_start : best_start + best_len]`,
    complexity: {
      time: 'O(n + m) — right and left each traverse s once, and the satisfied counter makes each validity check O(1) instead of O(alphabet).',
      space: 'O(m) — the need and window counters hold at most one entry per distinct character of t.',
    },
    followUps: [
      'What if t may contain duplicates? It already does here — the count comparison, not set membership, is what handles it.',
      'What if s arrives as a stream and you must emit the best window so far without storing all of s?',
      'What if you need the k smallest valid windows, or all minimal windows rather than one?',
    ],
  },
  {
    id: 'dsa-239-sliding-window-maximum',
    patternId: 'dsap-sliding-window',
    name: 'Sliding Window Maximum',
    leetcodeNumber: 239,
    url: 'https://leetcode.com/problems/sliding-window-maximum/',
    difficulty: 'hard',
    core: false,
    companies: ['google', 'amazon'],
    minutes: 45,
    signal: 'An aggregate over a fixed-size window that is not reversible — you can add on the right but you cannot un-take a maximum on the left.',
    approach: `A running max cannot be undone when the window slides, so keep a deque of indices
whose values are strictly decreasing: the front is always the window maximum.
Push by evicting every smaller value from the back — those can never be the max
again while the new element is in the window — and pop the front when it exits.`,
    solution: `from collections import deque


def max_sliding_window(nums: list[int], k: int) -> list[int]:
    if not nums or k <= 0:
        return []

    dq: deque[int] = deque()  # indices, values strictly decreasing
    out: list[int] = []

    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(nums[dq[0]])

    return out`,
    complexity: {
      time: 'O(n) — every index is appended to the deque once and removed at most once, so the inner while is amortised O(1).',
      space: 'O(k) — the deque never holds more than one window\'s worth of indices.',
    },
    followUps: [
      'What if you need the window median instead of the maximum? Two heaps, or an order-statistic tree.',
      'What if the window size varies per query? A sparse table gives O(1) range max after O(n log n) preprocessing.',
      'What if the stream is unbounded and k is huge — what is the memory floor?',
    ],
  },

  // --- Stack (7) ---
  {
    id: 'dsa-20-valid-parentheses',
    patternId: 'dsap-stack',
    name: 'Valid Parentheses',
    leetcodeNumber: 20,
    url: 'https://leetcode.com/problems/valid-parentheses/',
    difficulty: 'easy',
    core: true,
    companies: ['google', 'meta', 'amazon'],
    minutes: 20,
  },
  {
    id: 'dsa-155-min-stack',
    patternId: 'dsap-stack',
    name: 'Min Stack',
    leetcodeNumber: 155,
    url: 'https://leetcode.com/problems/min-stack/',
    difficulty: 'medium',
    core: false,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-150-evaluate-reverse-polish-notation',
    patternId: 'dsap-stack',
    name: 'Evaluate Reverse Polish Notation',
    leetcodeNumber: 150,
    url: 'https://leetcode.com/problems/evaluate-reverse-polish-notation/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-22-generate-parentheses',
    patternId: 'dsap-stack',
    name: 'Generate Parentheses',
    leetcodeNumber: 22,
    url: 'https://leetcode.com/problems/generate-parentheses/',
    difficulty: 'medium',
    core: false,
    companies: ['meta'],
    minutes: 30,
  },
  {
    id: 'dsa-739-daily-temperatures',
    patternId: 'dsap-stack',
    name: 'Daily Temperatures',
    leetcodeNumber: 739,
    url: 'https://leetcode.com/problems/daily-temperatures/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-853-car-fleet',
    patternId: 'dsap-stack',
    name: 'Car Fleet',
    leetcodeNumber: 853,
    url: 'https://leetcode.com/problems/car-fleet/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-84-largest-rectangle-in-histogram',
    patternId: 'dsap-stack',
    name: 'Largest Rectangle in Histogram',
    leetcodeNumber: 84,
    url: 'https://leetcode.com/problems/largest-rectangle-in-histogram/',
    difficulty: 'hard',
    core: false,
    companies: ['google'],
    minutes: 45,
  },

  // --- Binary Search (7) ---
  {
    id: 'dsa-704-binary-search',
    patternId: 'dsap-binary-search',
    name: 'Binary Search',
    leetcodeNumber: 704,
    url: 'https://leetcode.com/problems/binary-search/',
    difficulty: 'easy',
    core: false,
    companies: ['google'],
    minutes: 20,
  },
  {
    id: 'dsa-74-search-a-2d-matrix',
    patternId: 'dsap-binary-search',
    name: 'Search a 2D Matrix',
    leetcodeNumber: 74,
    url: 'https://leetcode.com/problems/search-a-2d-matrix/',
    difficulty: 'medium',
    core: false,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-875-koko-eating-bananas',
    patternId: 'dsap-binary-search',
    name: 'Koko Eating Bananas',
    leetcodeNumber: 875,
    url: 'https://leetcode.com/problems/koko-eating-bananas/',
    difficulty: 'medium',
    core: false,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-153-find-minimum-in-rotated-sorted-array',
    patternId: 'dsap-binary-search',
    name: 'Find Minimum in Rotated Sorted Array',
    leetcodeNumber: 153,
    url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/',
    difficulty: 'medium',
    core: true,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-33-search-in-rotated-sorted-array',
    patternId: 'dsap-binary-search',
    name: 'Search in Rotated Sorted Array',
    leetcodeNumber: 33,
    url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'meta'],
    minutes: 30,
  },
  {
    id: 'dsa-981-time-based-key-value-store',
    patternId: 'dsap-binary-search',
    name: 'Time Based Key-Value Store',
    leetcodeNumber: 981,
    url: 'https://leetcode.com/problems/time-based-key-value-store/',
    difficulty: 'medium',
    core: false,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-4-median-of-two-sorted-arrays',
    patternId: 'dsap-binary-search',
    name: 'Median of Two Sorted Arrays',
    leetcodeNumber: 4,
    url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
    difficulty: 'hard',
    core: false,
    companies: ['google'],
    minutes: 45,
  },

  // --- Linked List (11) ---
  {
    id: 'dsa-206-reverse-linked-list',
    patternId: 'dsap-linked-list',
    name: 'Reverse Linked List',
    leetcodeNumber: 206,
    url: 'https://leetcode.com/problems/reverse-linked-list/',
    difficulty: 'easy',
    core: true,
    companies: ['amazon'],
    minutes: 20,
  },
  {
    id: 'dsa-21-merge-two-sorted-lists',
    patternId: 'dsap-linked-list',
    name: 'Merge Two Sorted Lists',
    leetcodeNumber: 21,
    url: 'https://leetcode.com/problems/merge-two-sorted-lists/',
    difficulty: 'easy',
    core: true,
    companies: ['amazon'],
    minutes: 20,
  },
  {
    id: 'dsa-143-reorder-list',
    patternId: 'dsap-linked-list',
    name: 'Reorder List',
    leetcodeNumber: 143,
    url: 'https://leetcode.com/problems/reorder-list/',
    difficulty: 'medium',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-19-remove-nth-node-from-end-of-list',
    patternId: 'dsap-linked-list',
    name: 'Remove Nth Node From End of List',
    leetcodeNumber: 19,
    url: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/',
    difficulty: 'medium',
    core: true,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-138-copy-list-with-random-pointer',
    patternId: 'dsap-linked-list',
    name: 'Copy List With Random Pointer',
    leetcodeNumber: 138,
    url: 'https://leetcode.com/problems/copy-list-with-random-pointer/',
    difficulty: 'medium',
    core: false,
    companies: ['meta'],
    minutes: 30,
  },
  {
    id: 'dsa-2-add-two-numbers',
    patternId: 'dsap-linked-list',
    name: 'Add Two Numbers',
    leetcodeNumber: 2,
    url: 'https://leetcode.com/problems/add-two-numbers/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-141-linked-list-cycle',
    patternId: 'dsap-linked-list',
    name: 'Linked List Cycle',
    leetcodeNumber: 141,
    url: 'https://leetcode.com/problems/linked-list-cycle/',
    difficulty: 'easy',
    core: true,
    companies: ['amazon'],
    minutes: 20,
  },
  {
    id: 'dsa-287-find-the-duplicate-number',
    patternId: 'dsap-linked-list',
    name: 'Find the Duplicate Number',
    leetcodeNumber: 287,
    url: 'https://leetcode.com/problems/find-the-duplicate-number/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-146-lru-cache',
    patternId: 'dsap-linked-list',
    name: 'LRU Cache',
    leetcodeNumber: 146,
    url: 'https://leetcode.com/problems/lru-cache/',
    difficulty: 'medium',
    core: false,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-23-merge-k-sorted-lists',
    patternId: 'dsap-linked-list',
    name: 'Merge K Sorted Lists',
    leetcodeNumber: 23,
    url: 'https://leetcode.com/problems/merge-k-sorted-lists/',
    difficulty: 'hard',
    core: true,
    companies: ['google'],
    minutes: 45,
  },
  {
    id: 'dsa-25-reverse-nodes-in-k-group',
    patternId: 'dsap-linked-list',
    name: 'Reverse Nodes in K-Group',
    leetcodeNumber: 25,
    url: 'https://leetcode.com/problems/reverse-nodes-in-k-group/',
    difficulty: 'hard',
    core: false,
    companies: ['google'],
    minutes: 45,
  },

  // --- Trees (15) ---
  {
    id: 'dsa-226-invert-binary-tree',
    patternId: 'dsap-trees',
    name: 'Invert Binary Tree',
    leetcodeNumber: 226,
    url: 'https://leetcode.com/problems/invert-binary-tree/',
    difficulty: 'easy',
    core: true,
    companies: ['google', 'meta', 'amazon'],
    minutes: 20,
  },
  {
    id: 'dsa-104-maximum-depth-of-binary-tree',
    patternId: 'dsap-trees',
    name: 'Maximum Depth of Binary Tree',
    leetcodeNumber: 104,
    url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/',
    difficulty: 'easy',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 20,
  },
  {
    id: 'dsa-543-diameter-of-binary-tree',
    patternId: 'dsap-trees',
    name: 'Diameter of Binary Tree',
    leetcodeNumber: 543,
    url: 'https://leetcode.com/problems/diameter-of-binary-tree/',
    difficulty: 'easy',
    core: false,
    companies: ['meta'],
    minutes: 20,
  },
  {
    id: 'dsa-110-balanced-binary-tree',
    patternId: 'dsap-trees',
    name: 'Balanced Binary Tree',
    leetcodeNumber: 110,
    url: 'https://leetcode.com/problems/balanced-binary-tree/',
    difficulty: 'easy',
    core: false,
    companies: [],
    minutes: 20,
  },
  {
    id: 'dsa-100-same-tree',
    patternId: 'dsap-trees',
    name: 'Same Tree',
    leetcodeNumber: 100,
    url: 'https://leetcode.com/problems/same-tree/',
    difficulty: 'easy',
    core: true,
    companies: ['meta'],
    minutes: 20,
  },
  {
    id: 'dsa-572-subtree-of-another-tree',
    patternId: 'dsap-trees',
    name: 'Subtree of Another Tree',
    leetcodeNumber: 572,
    url: 'https://leetcode.com/problems/subtree-of-another-tree/',
    difficulty: 'easy',
    core: true,
    companies: ['meta'],
    minutes: 20,
  },
  {
    id: 'dsa-235-lowest-common-ancestor-of-a-binary-search-tree',
    patternId: 'dsap-trees',
    name: 'Lowest Common Ancestor of a BST',
    leetcodeNumber: 235,
    url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/',
    difficulty: 'medium',
    core: true,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-102-binary-tree-level-order-traversal',
    patternId: 'dsap-trees',
    name: 'Binary Tree Level Order Traversal',
    leetcodeNumber: 102,
    url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/',
    difficulty: 'medium',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-199-binary-tree-right-side-view',
    patternId: 'dsap-trees',
    name: 'Binary Tree Right Side View',
    leetcodeNumber: 199,
    url: 'https://leetcode.com/problems/binary-tree-right-side-view/',
    difficulty: 'medium',
    core: false,
    companies: ['meta'],
    minutes: 30,
  },
  {
    id: 'dsa-1448-count-good-nodes-in-binary-tree',
    patternId: 'dsap-trees',
    name: 'Count Good Nodes in Binary Tree',
    leetcodeNumber: 1448,
    url: 'https://leetcode.com/problems/count-good-nodes-in-binary-tree/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-98-validate-binary-search-tree',
    patternId: 'dsap-trees',
    name: 'Validate Binary Search Tree',
    leetcodeNumber: 98,
    url: 'https://leetcode.com/problems/validate-binary-search-tree/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-230-kth-smallest-element-in-a-bst',
    patternId: 'dsap-trees',
    name: 'Kth Smallest Element in a BST',
    leetcodeNumber: 230,
    url: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/',
    difficulty: 'medium',
    core: true,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-105-construct-binary-tree-from-preorder-and-inorder-traversal',
    patternId: 'dsap-trees',
    name: 'Construct Binary Tree from Preorder and Inorder Traversal',
    leetcodeNumber: 105,
    url: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/',
    difficulty: 'medium',
    core: true,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-124-binary-tree-maximum-path-sum',
    patternId: 'dsap-trees',
    name: 'Binary Tree Maximum Path Sum',
    leetcodeNumber: 124,
    url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/',
    difficulty: 'hard',
    core: true,
    companies: ['google'],
    minutes: 45,
  },
  {
    id: 'dsa-297-serialize-and-deserialize-binary-tree',
    patternId: 'dsap-trees',
    name: 'Serialize and Deserialize Binary Tree',
    leetcodeNumber: 297,
    url: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/',
    difficulty: 'hard',
    core: true,
    companies: ['google', 'meta', 'amazon'],
    minutes: 45,
  },

  // --- Heap / Priority Queue (7) ---
  {
    id: 'dsa-703-kth-largest-element-in-a-stream',
    patternId: 'dsap-heap',
    name: 'Kth Largest Element in a Stream',
    leetcodeNumber: 703,
    url: 'https://leetcode.com/problems/kth-largest-element-in-a-stream/',
    difficulty: 'easy',
    core: false,
    companies: [],
    minutes: 20,
  },
  {
    id: 'dsa-1046-last-stone-weight',
    patternId: 'dsap-heap',
    name: 'Last Stone Weight',
    leetcodeNumber: 1046,
    url: 'https://leetcode.com/problems/last-stone-weight/',
    difficulty: 'easy',
    core: false,
    companies: [],
    minutes: 20,
  },
  {
    id: 'dsa-973-k-closest-points-to-origin',
    patternId: 'dsap-heap',
    name: 'K Closest Points to Origin',
    leetcodeNumber: 973,
    url: 'https://leetcode.com/problems/k-closest-points-to-origin/',
    difficulty: 'medium',
    core: false,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-215-kth-largest-element-in-an-array',
    patternId: 'dsap-heap',
    name: 'Kth Largest Element in an Array',
    leetcodeNumber: 215,
    url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/',
    difficulty: 'medium',
    core: false,
    companies: ['google', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-621-task-scheduler',
    patternId: 'dsap-heap',
    name: 'Task Scheduler',
    leetcodeNumber: 621,
    url: 'https://leetcode.com/problems/task-scheduler/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-355-design-twitter',
    patternId: 'dsap-heap',
    name: 'Design Twitter',
    leetcodeNumber: 355,
    url: 'https://leetcode.com/problems/design-twitter/',
    difficulty: 'medium',
    core: false,
    companies: ['meta', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-295-find-median-from-data-stream',
    patternId: 'dsap-heap',
    name: 'Find Median from Data Stream',
    leetcodeNumber: 295,
    url: 'https://leetcode.com/problems/find-median-from-data-stream/',
    difficulty: 'hard',
    core: true,
    companies: ['google', 'amazon'],
    minutes: 45,
  },

  // --- Backtracking (9) ---
  {
    id: 'dsa-78-subsets',
    patternId: 'dsap-backtracking',
    name: 'Subsets',
    leetcodeNumber: 78,
    url: 'https://leetcode.com/problems/subsets/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-39-combination-sum',
    patternId: 'dsap-backtracking',
    name: 'Combination Sum',
    leetcodeNumber: 39,
    url: 'https://leetcode.com/problems/combination-sum/',
    difficulty: 'medium',
    core: true,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-40-combination-sum-ii',
    patternId: 'dsap-backtracking',
    name: 'Combination Sum II',
    leetcodeNumber: 40,
    url: 'https://leetcode.com/problems/combination-sum-ii/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-46-permutations',
    patternId: 'dsap-backtracking',
    name: 'Permutations',
    leetcodeNumber: 46,
    url: 'https://leetcode.com/problems/permutations/',
    difficulty: 'medium',
    core: false,
    companies: ['google', 'meta'],
    minutes: 30,
  },
  {
    id: 'dsa-90-subsets-ii',
    patternId: 'dsap-backtracking',
    name: 'Subsets II',
    leetcodeNumber: 90,
    url: 'https://leetcode.com/problems/subsets-ii/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-79-word-search',
    patternId: 'dsap-backtracking',
    name: 'Word Search',
    leetcodeNumber: 79,
    url: 'https://leetcode.com/problems/word-search/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'meta'],
    minutes: 30,
  },
  {
    id: 'dsa-131-palindrome-partitioning',
    patternId: 'dsap-backtracking',
    name: 'Palindrome Partitioning',
    leetcodeNumber: 131,
    url: 'https://leetcode.com/problems/palindrome-partitioning/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-17-letter-combinations-of-a-phone-number',
    patternId: 'dsap-backtracking',
    name: 'Letter Combinations of a Phone Number',
    leetcodeNumber: 17,
    url: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number/',
    difficulty: 'medium',
    core: false,
    companies: ['meta'],
    minutes: 30,
  },
  {
    id: 'dsa-51-n-queens',
    patternId: 'dsap-backtracking',
    name: 'N-Queens',
    leetcodeNumber: 51,
    url: 'https://leetcode.com/problems/n-queens/',
    difficulty: 'hard',
    core: false,
    companies: ['google'],
    minutes: 45,
  },

  // --- Tries (3) ---
  {
    id: 'dsa-208-implement-trie-prefix-tree',
    patternId: 'dsap-tries',
    name: 'Implement Trie',
    leetcodeNumber: 208,
    url: 'https://leetcode.com/problems/implement-trie-prefix-tree/',
    difficulty: 'medium',
    core: true,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-211-design-add-and-search-words-data-structure',
    patternId: 'dsap-tries',
    name: 'Design Add and Search Words Data Structure',
    leetcodeNumber: 211,
    url: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/',
    difficulty: 'medium',
    core: true,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-212-word-search-ii',
    patternId: 'dsap-tries',
    name: 'Word Search II',
    leetcodeNumber: 212,
    url: 'https://leetcode.com/problems/word-search-ii/',
    difficulty: 'hard',
    core: true,
    companies: ['google', 'amazon'],
    minutes: 45,
  },

  // --- Graphs (13) ---
  {
    id: 'dsa-200-number-of-islands',
    patternId: 'dsap-graphs',
    name: 'Number of Islands',
    leetcodeNumber: 200,
    url: 'https://leetcode.com/problems/number-of-islands/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'meta', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-695-max-area-of-island',
    patternId: 'dsap-graphs',
    name: 'Max Area of Island',
    leetcodeNumber: 695,
    url: 'https://leetcode.com/problems/max-area-of-island/',
    difficulty: 'medium',
    core: false,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-133-clone-graph',
    patternId: 'dsap-graphs',
    name: 'Clone Graph',
    leetcodeNumber: 133,
    url: 'https://leetcode.com/problems/clone-graph/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'meta', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-286-walls-and-gates',
    patternId: 'dsap-graphs',
    name: 'Walls and Gates',
    leetcodeNumber: 286,
    url: 'https://leetcode.com/problems/walls-and-gates/',
    difficulty: 'medium',
    core: false,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-994-rotting-oranges',
    patternId: 'dsap-graphs',
    name: 'Rotting Oranges',
    leetcodeNumber: 994,
    url: 'https://leetcode.com/problems/rotting-oranges/',
    difficulty: 'medium',
    core: false,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-417-pacific-atlantic-water-flow',
    patternId: 'dsap-graphs',
    name: 'Pacific Atlantic Water Flow',
    leetcodeNumber: 417,
    url: 'https://leetcode.com/problems/pacific-atlantic-water-flow/',
    difficulty: 'medium',
    core: true,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-130-surrounded-regions',
    patternId: 'dsap-graphs',
    name: 'Surrounded Regions',
    leetcodeNumber: 130,
    url: 'https://leetcode.com/problems/surrounded-regions/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-207-course-schedule',
    patternId: 'dsap-graphs',
    name: 'Course Schedule',
    leetcodeNumber: 207,
    url: 'https://leetcode.com/problems/course-schedule/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-210-course-schedule-ii',
    patternId: 'dsap-graphs',
    name: 'Course Schedule II',
    leetcodeNumber: 210,
    url: 'https://leetcode.com/problems/course-schedule-ii/',
    difficulty: 'medium',
    core: false,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-261-graph-valid-tree',
    patternId: 'dsap-graphs',
    name: 'Graph Valid Tree',
    leetcodeNumber: 261,
    url: 'https://leetcode.com/problems/graph-valid-tree/',
    difficulty: 'medium',
    core: true,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-323-number-of-connected-components-in-an-undirected-graph',
    patternId: 'dsap-graphs',
    name: 'Number of Connected Components in an Undirected Graph',
    leetcodeNumber: 323,
    url: 'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/',
    difficulty: 'medium',
    core: true,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-684-redundant-connection',
    patternId: 'dsap-graphs',
    name: 'Redundant Connection',
    leetcodeNumber: 684,
    url: 'https://leetcode.com/problems/redundant-connection/',
    difficulty: 'medium',
    core: false,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-127-word-ladder',
    patternId: 'dsap-graphs',
    name: 'Word Ladder',
    leetcodeNumber: 127,
    url: 'https://leetcode.com/problems/word-ladder/',
    difficulty: 'hard',
    core: false,
    companies: ['google', 'amazon'],
    minutes: 45,
  },

  // --- Advanced Graphs (6) ---
  {
    id: 'dsa-332-reconstruct-itinerary',
    patternId: 'dsap-advanced-graphs',
    name: 'Reconstruct Itinerary',
    leetcodeNumber: 332,
    url: 'https://leetcode.com/problems/reconstruct-itinerary/',
    difficulty: 'hard',
    core: false,
    companies: ['google'],
    minutes: 45,
  },
  {
    id: 'dsa-1584-min-cost-to-connect-all-points',
    patternId: 'dsap-advanced-graphs',
    name: 'Min Cost to Connect All Points',
    leetcodeNumber: 1584,
    url: 'https://leetcode.com/problems/min-cost-to-connect-all-points/',
    difficulty: 'medium',
    core: false,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-743-network-delay-time',
    patternId: 'dsap-advanced-graphs',
    name: 'Network Delay Time',
    leetcodeNumber: 743,
    url: 'https://leetcode.com/problems/network-delay-time/',
    difficulty: 'medium',
    core: false,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-778-swim-in-rising-water',
    patternId: 'dsap-advanced-graphs',
    name: 'Swim in Rising Water',
    leetcodeNumber: 778,
    url: 'https://leetcode.com/problems/swim-in-rising-water/',
    difficulty: 'hard',
    core: false,
    companies: ['google'],
    minutes: 45,
  },
  {
    id: 'dsa-269-alien-dictionary',
    patternId: 'dsap-advanced-graphs',
    name: 'Alien Dictionary',
    leetcodeNumber: 269,
    url: 'https://leetcode.com/problems/alien-dictionary/',
    difficulty: 'hard',
    core: true,
    companies: ['google', 'amazon'],
    minutes: 45,
  },
  {
    id: 'dsa-787-cheapest-flights-within-k-stops',
    patternId: 'dsap-advanced-graphs',
    name: 'Cheapest Flights Within K Stops',
    leetcodeNumber: 787,
    url: 'https://leetcode.com/problems/cheapest-flights-within-k-stops/',
    difficulty: 'medium',
    core: false,
    companies: ['google'],
    minutes: 30,
  },

  // --- 1-D Dynamic Programming (12) ---
  {
    id: 'dsa-70-climbing-stairs',
    patternId: 'dsap-dp-1d',
    name: 'Climbing Stairs',
    leetcodeNumber: 70,
    url: 'https://leetcode.com/problems/climbing-stairs/',
    difficulty: 'easy',
    core: true,
    companies: ['google'],
    minutes: 20,
  },
  {
    id: 'dsa-746-min-cost-climbing-stairs',
    patternId: 'dsap-dp-1d',
    name: 'Min Cost Climbing Stairs',
    leetcodeNumber: 746,
    url: 'https://leetcode.com/problems/min-cost-climbing-stairs/',
    difficulty: 'easy',
    core: false,
    companies: [],
    minutes: 20,
  },
  {
    id: 'dsa-198-house-robber',
    patternId: 'dsap-dp-1d',
    name: 'House Robber',
    leetcodeNumber: 198,
    url: 'https://leetcode.com/problems/house-robber/',
    difficulty: 'medium',
    core: true,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-213-house-robber-ii',
    patternId: 'dsap-dp-1d',
    name: 'House Robber II',
    leetcodeNumber: 213,
    url: 'https://leetcode.com/problems/house-robber-ii/',
    difficulty: 'medium',
    core: true,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-5-longest-palindromic-substring',
    patternId: 'dsap-dp-1d',
    name: 'Longest Palindromic Substring',
    leetcodeNumber: 5,
    url: 'https://leetcode.com/problems/longest-palindromic-substring/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'meta'],
    minutes: 30,
  },
  {
    id: 'dsa-647-palindromic-substrings',
    patternId: 'dsap-dp-1d',
    name: 'Palindromic Substrings',
    leetcodeNumber: 647,
    url: 'https://leetcode.com/problems/palindromic-substrings/',
    difficulty: 'medium',
    core: true,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-91-decode-ways',
    patternId: 'dsap-dp-1d',
    name: 'Decode Ways',
    leetcodeNumber: 91,
    url: 'https://leetcode.com/problems/decode-ways/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-322-coin-change',
    patternId: 'dsap-dp-1d',
    name: 'Coin Change',
    leetcodeNumber: 322,
    url: 'https://leetcode.com/problems/coin-change/',
    difficulty: 'medium',
    core: true,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-152-maximum-product-subarray',
    patternId: 'dsap-dp-1d',
    name: 'Maximum Product Subarray',
    leetcodeNumber: 152,
    url: 'https://leetcode.com/problems/maximum-product-subarray/',
    difficulty: 'medium',
    core: true,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-139-word-break',
    patternId: 'dsap-dp-1d',
    name: 'Word Break',
    leetcodeNumber: 139,
    url: 'https://leetcode.com/problems/word-break/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'meta'],
    minutes: 30,
  },
  {
    id: 'dsa-300-longest-increasing-subsequence',
    patternId: 'dsap-dp-1d',
    name: 'Longest Increasing Subsequence',
    leetcodeNumber: 300,
    url: 'https://leetcode.com/problems/longest-increasing-subsequence/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-416-partition-equal-subset-sum',
    patternId: 'dsap-dp-1d',
    name: 'Partition Equal Subset Sum',
    leetcodeNumber: 416,
    url: 'https://leetcode.com/problems/partition-equal-subset-sum/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },

  // --- 2-D Dynamic Programming (11) ---
  {
    id: 'dsa-62-unique-paths',
    patternId: 'dsap-dp-2d',
    name: 'Unique Paths',
    leetcodeNumber: 62,
    url: 'https://leetcode.com/problems/unique-paths/',
    difficulty: 'medium',
    core: true,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-1143-longest-common-subsequence',
    patternId: 'dsap-dp-2d',
    name: 'Longest Common Subsequence',
    leetcodeNumber: 1143,
    url: 'https://leetcode.com/problems/longest-common-subsequence/',
    difficulty: 'medium',
    core: true,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-309-best-time-to-buy-and-sell-stock-with-cooldown',
    patternId: 'dsap-dp-2d',
    name: 'Best Time to Buy and Sell Stock with Cooldown',
    leetcodeNumber: 309,
    url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-518-coin-change-ii',
    patternId: 'dsap-dp-2d',
    name: 'Coin Change II',
    leetcodeNumber: 518,
    url: 'https://leetcode.com/problems/coin-change-ii/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-494-target-sum',
    patternId: 'dsap-dp-2d',
    name: 'Target Sum',
    leetcodeNumber: 494,
    url: 'https://leetcode.com/problems/target-sum/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-97-interleaving-string',
    patternId: 'dsap-dp-2d',
    name: 'Interleaving String',
    leetcodeNumber: 97,
    url: 'https://leetcode.com/problems/interleaving-string/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-329-longest-increasing-path-in-a-matrix',
    patternId: 'dsap-dp-2d',
    name: 'Longest Increasing Path in a Matrix',
    leetcodeNumber: 329,
    url: 'https://leetcode.com/problems/longest-increasing-path-in-a-matrix/',
    difficulty: 'hard',
    core: false,
    companies: ['google'],
    minutes: 45,
  },
  {
    id: 'dsa-115-distinct-subsequences',
    patternId: 'dsap-dp-2d',
    name: 'Distinct Subsequences',
    leetcodeNumber: 115,
    url: 'https://leetcode.com/problems/distinct-subsequences/',
    difficulty: 'hard',
    core: false,
    companies: [],
    minutes: 45,
  },
  {
    id: 'dsa-72-edit-distance',
    patternId: 'dsap-dp-2d',
    name: 'Edit Distance',
    leetcodeNumber: 72,
    url: 'https://leetcode.com/problems/edit-distance/',
    difficulty: 'medium',
    core: false,
    companies: ['google', 'meta', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-312-burst-balloons',
    patternId: 'dsap-dp-2d',
    name: 'Burst Balloons',
    leetcodeNumber: 312,
    url: 'https://leetcode.com/problems/burst-balloons/',
    difficulty: 'hard',
    core: false,
    companies: ['google', 'amazon'],
    minutes: 45,
  },
  {
    id: 'dsa-10-regular-expression-matching',
    patternId: 'dsap-dp-2d',
    name: 'Regular Expression Matching',
    leetcodeNumber: 10,
    url: 'https://leetcode.com/problems/regular-expression-matching/',
    difficulty: 'hard',
    core: false,
    companies: ['google', 'amazon'],
    minutes: 45,
  },

  // --- Greedy (8) ---
  {
    id: 'dsa-53-maximum-subarray',
    patternId: 'dsap-greedy',
    name: 'Maximum Subarray',
    leetcodeNumber: 53,
    url: 'https://leetcode.com/problems/maximum-subarray/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'meta'],
    minutes: 30,
  },
  {
    id: 'dsa-55-jump-game',
    patternId: 'dsap-greedy',
    name: 'Jump Game',
    leetcodeNumber: 55,
    url: 'https://leetcode.com/problems/jump-game/',
    difficulty: 'medium',
    core: true,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-45-jump-game-ii',
    patternId: 'dsap-greedy',
    name: 'Jump Game II',
    leetcodeNumber: 45,
    url: 'https://leetcode.com/problems/jump-game-ii/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-134-gas-station',
    patternId: 'dsap-greedy',
    name: 'Gas Station',
    leetcodeNumber: 134,
    url: 'https://leetcode.com/problems/gas-station/',
    difficulty: 'medium',
    core: false,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-1296-divide-array-in-sets-of-k-consecutive-numbers',
    patternId: 'dsap-greedy',
    name: 'Hand of Straights',
    leetcodeNumber: 1296,
    url: 'https://leetcode.com/problems/divide-array-in-sets-of-k-consecutive-numbers/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-1899-merge-triplets-to-form-target-triplet',
    patternId: 'dsap-greedy',
    name: 'Merge Triplets to Form Target Triplet',
    leetcodeNumber: 1899,
    url: 'https://leetcode.com/problems/merge-triplets-to-form-target-triplet/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-763-partition-labels',
    patternId: 'dsap-greedy',
    name: 'Partition Labels',
    leetcodeNumber: 763,
    url: 'https://leetcode.com/problems/partition-labels/',
    difficulty: 'medium',
    core: false,
    companies: ['meta'],
    minutes: 30,
  },
  {
    id: 'dsa-678-valid-parenthesis-string',
    patternId: 'dsap-greedy',
    name: 'Valid Parenthesis String',
    leetcodeNumber: 678,
    url: 'https://leetcode.com/problems/valid-parenthesis-string/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },

  // --- Intervals (6) ---
  {
    id: 'dsa-57-insert-interval',
    patternId: 'dsap-intervals',
    name: 'Insert Interval',
    leetcodeNumber: 57,
    url: 'https://leetcode.com/problems/insert-interval/',
    difficulty: 'medium',
    core: true,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-56-merge-intervals',
    patternId: 'dsap-intervals',
    name: 'Merge Intervals',
    leetcodeNumber: 56,
    url: 'https://leetcode.com/problems/merge-intervals/',
    difficulty: 'medium',
    core: true,
    companies: ['google', 'meta', 'amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-435-non-overlapping-intervals',
    patternId: 'dsap-intervals',
    name: 'Non-overlapping Intervals',
    leetcodeNumber: 435,
    url: 'https://leetcode.com/problems/non-overlapping-intervals/',
    difficulty: 'medium',
    core: true,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-252-meeting-rooms',
    patternId: 'dsap-intervals',
    name: 'Meeting Rooms',
    leetcodeNumber: 252,
    url: 'https://leetcode.com/problems/meeting-rooms/',
    difficulty: 'easy',
    core: true,
    companies: ['meta', 'amazon'],
    minutes: 20,
  },
  {
    id: 'dsa-253-meeting-rooms-ii',
    patternId: 'dsap-intervals',
    name: 'Meeting Rooms II',
    leetcodeNumber: 253,
    url: 'https://leetcode.com/problems/meeting-rooms-ii/',
    difficulty: 'medium',
    core: true,
    companies: ['amazon'],
    minutes: 30,
  },
  {
    id: 'dsa-1851-minimum-interval-to-include-each-query',
    patternId: 'dsap-intervals',
    name: 'Minimum Interval to Include Each Query',
    leetcodeNumber: 1851,
    url: 'https://leetcode.com/problems/minimum-interval-to-include-each-query/',
    difficulty: 'hard',
    core: false,
    companies: [],
    minutes: 45,
  },

  // --- Math & Geometry (8) ---
  {
    id: 'dsa-48-rotate-image',
    patternId: 'dsap-math-geometry',
    name: 'Rotate Image',
    leetcodeNumber: 48,
    url: 'https://leetcode.com/problems/rotate-image/',
    difficulty: 'medium',
    core: true,
    companies: ['meta'],
    minutes: 30,
  },
  {
    id: 'dsa-54-spiral-matrix',
    patternId: 'dsap-math-geometry',
    name: 'Spiral Matrix',
    leetcodeNumber: 54,
    url: 'https://leetcode.com/problems/spiral-matrix/',
    difficulty: 'medium',
    core: true,
    companies: ['meta'],
    minutes: 30,
  },
  {
    id: 'dsa-73-set-matrix-zeroes',
    patternId: 'dsap-math-geometry',
    name: 'Set Matrix Zeroes',
    leetcodeNumber: 73,
    url: 'https://leetcode.com/problems/set-matrix-zeroes/',
    difficulty: 'medium',
    core: true,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-202-happy-number',
    patternId: 'dsap-math-geometry',
    name: 'Happy Number',
    leetcodeNumber: 202,
    url: 'https://leetcode.com/problems/happy-number/',
    difficulty: 'easy',
    core: false,
    companies: [],
    minutes: 20,
  },
  {
    id: 'dsa-66-plus-one',
    patternId: 'dsap-math-geometry',
    name: 'Plus One',
    leetcodeNumber: 66,
    url: 'https://leetcode.com/problems/plus-one/',
    difficulty: 'easy',
    core: false,
    companies: ['amazon'],
    minutes: 20,
  },
  {
    id: 'dsa-50-powx-n',
    patternId: 'dsap-math-geometry',
    name: 'Pow(x, n)',
    leetcodeNumber: 50,
    url: 'https://leetcode.com/problems/powx-n/',
    difficulty: 'medium',
    core: false,
    companies: ['google'],
    minutes: 30,
  },
  {
    id: 'dsa-43-multiply-strings',
    patternId: 'dsap-math-geometry',
    name: 'Multiply Strings',
    leetcodeNumber: 43,
    url: 'https://leetcode.com/problems/multiply-strings/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-2013-detect-squares',
    patternId: 'dsap-math-geometry',
    name: 'Detect Squares',
    leetcodeNumber: 2013,
    url: 'https://leetcode.com/problems/detect-squares/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },

  // --- Bit Manipulation (7) ---
  {
    id: 'dsa-136-single-number',
    patternId: 'dsap-bit-manipulation',
    name: 'Single Number',
    leetcodeNumber: 136,
    url: 'https://leetcode.com/problems/single-number/',
    difficulty: 'easy',
    core: false,
    companies: ['meta'],
    minutes: 20,
  },
  {
    id: 'dsa-191-number-of-1-bits',
    patternId: 'dsap-bit-manipulation',
    name: 'Number of 1 Bits',
    leetcodeNumber: 191,
    url: 'https://leetcode.com/problems/number-of-1-bits/',
    difficulty: 'easy',
    core: true,
    companies: ['google'],
    minutes: 20,
  },
  {
    id: 'dsa-338-counting-bits',
    patternId: 'dsap-bit-manipulation',
    name: 'Counting Bits',
    leetcodeNumber: 338,
    url: 'https://leetcode.com/problems/counting-bits/',
    difficulty: 'easy',
    core: true,
    companies: [],
    minutes: 20,
  },
  {
    id: 'dsa-190-reverse-bits',
    patternId: 'dsap-bit-manipulation',
    name: 'Reverse Bits',
    leetcodeNumber: 190,
    url: 'https://leetcode.com/problems/reverse-bits/',
    difficulty: 'easy',
    core: true,
    companies: [],
    minutes: 20,
  },
  {
    id: 'dsa-268-missing-number',
    patternId: 'dsap-bit-manipulation',
    name: 'Missing Number',
    leetcodeNumber: 268,
    url: 'https://leetcode.com/problems/missing-number/',
    difficulty: 'easy',
    core: true,
    companies: ['amazon'],
    minutes: 20,
  },
  {
    id: 'dsa-371-sum-of-two-integers',
    patternId: 'dsap-bit-manipulation',
    name: 'Sum of Two Integers',
    leetcodeNumber: 371,
    url: 'https://leetcode.com/problems/sum-of-two-integers/',
    difficulty: 'medium',
    core: true,
    companies: [],
    minutes: 30,
  },
  {
    id: 'dsa-7-reverse-integer',
    patternId: 'dsap-bit-manipulation',
    name: 'Reverse Integer',
    leetcodeNumber: 7,
    url: 'https://leetcode.com/problems/reverse-integer/',
    difficulty: 'medium',
    core: false,
    companies: [],
    minutes: 30,
  },
]
