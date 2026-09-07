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
      space: 'O(1) beyond the output — the sort is in place and only indices are held, so nothing else scales with n.',
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
    signal: 'Nested, matched pairs where the most recently opened must close first — last in, first out, which is a stack by definition.',
    approach: `Counting brackets is not enough because "([)]" balances numerically but nests
wrongly. Push every opener, and on a closer check that the top of the stack is
its partner. The string is valid exactly when nothing mismatches and the stack
ends empty.`,
    solution: `def is_valid(s: str) -> bool:
    partner = {")": "(", "]": "[", "}": "{"}
    stack: list[str] = []

    for ch in s:
        if ch in partner:
            if not stack or stack.pop() != partner[ch]:
                return False
        else:
            stack.append(ch)

    return not stack`,
    complexity: {
      time: 'O(n) — each character is pushed at most once and popped at most once.',
      space: 'O(n) — a string of all openers puts every character on the stack.',
    },
    followUps: [
      'What if the string is a stream you cannot buffer? The stack depth is the memory floor, so unbounded nesting is unbounded memory.',
      'What if you must return the length of the longest valid substring instead of a yes or no?',
      'What if a wildcard \'*\' may stand for \'(\' or \')\' or empty — does the stack still decide it?',
    ],
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
    signal: 'A stack that must also answer an aggregate query in O(1) — the aggregate has to be carried along, not recomputed.',
    approach: `Scanning for the minimum on every call is O(n). Instead store, alongside each
value, the minimum of the stack up to and including that value. Popping then
restores the previous minimum for free, because it was never overwritten. The
cost is one extra integer per entry.`,
    solution: `class MinStack:
    def __init__(self) -> None:
        self._stack: list[tuple[int, int]] = []  # (value, min so far)

    def push(self, val: int) -> None:
        current_min = val if not self._stack else min(val, self._stack[-1][1])
        self._stack.append((val, current_min))

    def pop(self) -> None:
        self._stack.pop()

    def top(self) -> int:
        return self._stack[-1][0]

    def get_min(self) -> int:
        return self._stack[-1][1]`,
    complexity: {
      time: 'O(1) per operation — push, pop, top and get_min each touch only the end of the list.',
      space: 'O(n) — two integers per element instead of one, which is still linear.',
    },
    followUps: [
      'Can you do it with O(1) extra space per element? Store the encoded difference from the current minimum.',
      'What if you need get_max too, or a get_median in O(1)?',
      'What if it must be a queue with a min query rather than a stack — how do two stacks help?',
    ],
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
    signal: 'Postfix notation — an operator always applies to the two most recent results, which is exactly stack order.',
    approach: `RPN needs no parsing or precedence rules: push numbers, and on an operator pop
two operands, apply, push the result. The only trap is order — the first pop is
the right operand — and integer division must truncate toward zero, which is not
what Python's // does for negatives.`,
    solution: `def eval_rpn(tokens: list[str]) -> int:
    stack: list[int] = []

    for token in tokens:
        if token in {"+", "-", "*", "/"}:
            right = stack.pop()
            left = stack.pop()
            if token == "+":
                stack.append(left + right)
            elif token == "-":
                stack.append(left - right)
            elif token == "*":
                stack.append(left * right)
            else:
                stack.append(int(left / right))  # truncate toward zero
        else:
            stack.append(int(token))

    return stack[-1] if stack else 0`,
    complexity: {
      time: 'O(n) — one pass, and each token causes a constant number of stack operations.',
      space: 'O(n) — the stack holds the operands not yet consumed, up to half the tokens.',
    },
    followUps: [
      'What if the input is infix with parentheses? You need the shunting-yard algorithm to convert first.',
      'What if division by zero, or an ill-formed expression, must be rejected rather than crash?',
      'What if operands can be arbitrary precision or floating point — where does truncation stop being right?',
    ],
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
    signal: 'Enumerate every well-formed arrangement — you need all answers, not one, so it is a search tree with a validity invariant.',
    approach: `Build the string one character at a time and never let it become invalid: you may
open while opens < n, and close only while closes < opens. That invariant prunes
the whole subtree of malformed strings, so you generate only the Catalan-many
valid results instead of filtering 2^(2n) candidates.`,
    solution: `def generate_parenthesis(n: int) -> list[str]:
    out: list[str] = []
    current: list[str] = []

    def backtrack(opened: int, closed: int) -> None:
        if len(current) == 2 * n:
            out.append("".join(current))
            return
        if opened < n:
            current.append("(")
            backtrack(opened + 1, closed)
            current.pop()
        if closed < opened:
            current.append(")")
            backtrack(opened, closed + 1)
            current.pop()

    backtrack(0, 0)
    return out`,
    complexity: {
      time: 'O(4^n / sqrt(n)) — the number of valid strings is the nth Catalan number and each costs O(n) to emit.',
      space: 'O(n) — the recursion depth and the working buffer, excluding the output list.',
    },
    followUps: [
      'What if there are three bracket types? The invariant needs a stack, not two counters.',
      'What if you only need the k-th string in lexicographic order — can you avoid generating the rest?',
      'What if n is large and you only need the count? That is a closed-form Catalan number, no search at all.',
    ],
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
    signal: 'For every element, find the next element to its right that is greater — "next greater" is the monotonic stack signature.',
    approach: `The naive scan is O(n^2). Keep a stack of indices whose temperatures are
decreasing: they are all still waiting for a warmer day. When today beats the
top, today is that day's answer, so pop and record. Each index is pushed and
popped once, so the whole sweep is linear.`,
    solution: `def daily_temperatures(temperatures: list[int]) -> list[int]:
    out = [0] * len(temperatures)
    stack: list[int] = []  # indices, temperatures decreasing

    for i, t in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < t:
            j = stack.pop()
            out[j] = i - j
        stack.append(i)

    return out`,
    complexity: {
      time: 'O(n) — every index is pushed exactly once and popped at most once, so the inner while is amortised O(1).',
      space: 'O(n) — a strictly decreasing input leaves every index on the stack.',
    },
    followUps: [
      'What if the array is circular, so day n wraps to day 0? Sweep twice without pushing on the second pass.',
      'What if temperatures stream in and you must answer for past days as soon as possible?',
      'What if you need the next smaller instead — what single character changes?',
    ],
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
    signal: 'Items on a line that can catch up but never overtake — the one in front dictates the group, so process from the destination backward.',
    approach: `A car only matters relative to the car ahead of it. Sort by position descending
and compute each car's unobstructed time to the target. Walking from the front,
a car whose time is at most the current leader's is absorbed into that fleet;
otherwise it becomes a new, slower leader. The count of leaders is the answer.`,
    solution: `def car_fleet(target: int, position: list[int], speed: list[int]) -> int:
    cars = sorted(zip(position, speed), reverse=True)  # closest to target first
    fleets = 0
    slowest = 0.0

    for pos, spd in cars:
        time = (target - pos) / spd
        if time > slowest:  # cannot catch the fleet ahead
            fleets += 1
            slowest = time

    return fleets`,
    complexity: {
      time: 'O(n log n) — dominated by the sort; the sweep afterwards touches each car once.',
      space: 'O(n) — the sorted list of (position, speed) pairs.',
    },
    followUps: [
      'What if cars may overtake? The whole ordering argument collapses and it becomes a simulation.',
      'What if you must report the arrival time of each fleet, not just how many there are?',
      'What if positions are added dynamically — can a balanced BST keep the fleet count online?',
    ],
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
    signal: 'The best rectangle is limited by its shortest bar, so each bar asks: how far left and right can I extend before something shorter stops me?',
    approach: `For every bar, the widest rectangle of that height runs until a strictly shorter
bar on either side. A stack of increasing heights finds both boundaries in one
pass: when a shorter bar arrives, every taller bar on the stack is popped and
settled, its left boundary being whatever sits below it on the stack.`,
    solution: `def largest_rectangle_area(heights: list[int]) -> int:
    stack: list[tuple[int, int]] = []  # (start index, height), heights increasing
    best = 0

    for i, h in enumerate(heights):
        start = i
        while stack and stack[-1][1] > h:
            index, height = stack.pop()
            best = max(best, height * (i - index))
            start = index  # this bar can extend back to where the taller one began
        stack.append((start, h))

    for index, height in stack:
        best = max(best, height * (len(heights) - index))

    return best`,
    complexity: {
      time: 'O(n) — each bar is pushed once and popped once, and the final drain visits what remains.',
      space: 'O(n) — a non-decreasing histogram never pops until the end.',
    },
    followUps: [
      'What if the input is a binary matrix and you want the largest all-ones rectangle? Run this per row over accumulated heights.',
      'What if bars have varying widths rather than unit width?',
      'What if you need the rectangle\'s coordinates, not just its area?',
    ],
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
    signal: 'A sorted array and a required O(log n) — the search space halves on every comparison.',
    approach: `Maintain a closed interval [lo, hi] that provably contains the target if it is
present. Compare the midpoint and discard the half that cannot hold it. Compute
the midpoint as lo + (hi - lo) // 2 to avoid overflow in languages with fixed
integers, and use hi = mid - 1 so the interval always shrinks.`,
    solution: `def search(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1

    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1

    return -1`,
    complexity: {
      time: 'O(log n) — the candidate interval halves every iteration, so it is exhausted after log2(n) steps.',
      space: 'O(1) — three indices; the loop form uses no recursion stack.',
    },
    followUps: [
      'What if duplicates exist and you need the first or last occurrence? The loop must not return on the first hit.',
      'What if the array is rotated? The sorted-half test replaces the plain comparison.',
      'What if it is an infinite or unsized stream — how do you find the bounds before searching?',
    ],
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
    signal: 'Rows are sorted and each row starts after the previous one ends — the matrix is one sorted array wearing a disguise.',
    approach: `Because the rows concatenate into a single ascending sequence, index k of the
virtual flat array is matrix[k // cols][k % cols]. Run one ordinary binary
search over 0..rows*cols-1 and translate. Searching for the row first and then
within it also works and is the same O(log(m*n)).`,
    solution: `def search_matrix(matrix: list[list[int]], target: int) -> bool:
    if not matrix or not matrix[0]:
        return False

    rows, cols = len(matrix), len(matrix[0])
    lo, hi = 0, rows * cols - 1

    while lo <= hi:
        mid = lo + (hi - lo) // 2
        value = matrix[mid // cols][mid % cols]
        if value == target:
            return True
        if value < target:
            lo = mid + 1
        else:
            hi = mid - 1

    return False`,
    complexity: {
      time: 'O(log(m * n)) — one binary search over the flattened index space of m * n cells.',
      space: 'O(1) — only indices; the flattening is arithmetic, not an allocated copy.',
    },
    followUps: [
      'What if rows are sorted but do not chain, so row starts can be anything? The staircase walk from the top-right is O(m + n).',
      'What if the matrix is stored column-major — does the index arithmetic still work?',
      'What if you must return the position rather than a boolean?',
    ],
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
    signal: 'Find the smallest rate/size/capacity that still satisfies a condition — the answer itself is monotonic, so binary search the answer, not the array.',
    approach: `Feasibility is monotone: if speed k finishes in time, so does every larger speed.
That makes the answer space 1..max(piles) a sorted boolean array of False then
True, and binary search finds the boundary. Each feasibility test is one O(n)
pass summing ceil(pile / k).`,
    solution: `def min_eating_speed(piles: list[int], h: int) -> int:
    if not piles:
        return 0

    def hours(speed: int) -> int:
        return sum(-(-pile // speed) for pile in piles)  # ceiling division

    lo, hi = 1, max(piles)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if hours(mid) <= h:
            hi = mid  # feasible, but maybe slower still works
        else:
            lo = mid + 1

    return lo`,
    complexity: {
      time: 'O(n log m) — log m binary search steps over speeds 1..max(pile), each costing one O(n) feasibility pass.',
      space: 'O(1) — the feasibility check sums in place and only indices are kept.',
    },
    followUps: [
      'What if piles can be split across hours? The monotonicity survives but the ceiling disappears.',
      'What if there are multiple eaters working in parallel — is the answer still monotone in k?',
      'What if the piles arrive as a stream so max(piles) is unknown? Double the upper bound until feasible.',
    ],
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
    signal: 'Sorted then rotated — the array is two sorted runs, and the minimum is the single point where the order breaks.',
    approach: `Compare the midpoint to the last element. If nums[mid] > nums[hi] the break lies
strictly to the right, so lo = mid + 1; otherwise mid could itself be the
minimum, so hi = mid. Comparing against nums[hi] rather than nums[lo] is what
keeps the already-sorted case correct without a special branch.`,
    solution: `def find_min(nums: list[int]) -> int:
    lo, hi = 0, len(nums) - 1

    while lo < hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1  # break point is to the right
        else:
            hi = mid  # mid may itself be the minimum

    return nums[lo]`,
    complexity: {
      time: 'O(log n) — each comparison discards half the remaining candidates for the break point.',
      space: 'O(1) — two indices, no recursion.',
    },
    followUps: [
      'What if duplicates are allowed? nums[mid] == nums[hi] tells you nothing, and the worst case degrades to O(n).',
      'What if you also need the rotation count? It is exactly the index of the minimum.',
      'What if the array is rotated the other way, or rotated zero times — does this still hold?',
    ],
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
    signal: 'Search in O(log n) but the array is rotated — at every midpoint exactly one half is still properly sorted.',
    approach: `Split at the midpoint. One side is guaranteed sorted, and you can tell which by
comparing nums[lo] to nums[mid]. Check whether the target falls inside that
sorted side's range: if it does, search there, otherwise search the other side.
That decision is what preserves the halving.`,
    solution: `def search_rotated(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1

    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid

        if nums[lo] <= nums[mid]:  # left half is sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:  # right half is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1

    return -1`,
    complexity: {
      time: 'O(log n) — one of the two halves is discarded on every iteration, exactly as in plain binary search.',
      space: 'O(1) — three indices and no auxiliary structure.',
    },
    followUps: [
      'What if duplicates are allowed? nums[lo] == nums[mid] hides which half is sorted, forcing an O(n) worst case.',
      'What if you must find the rotation point first and then search — is two passes ever better?',
      'What if the array is rotated more than once, or rotated by an unknown amount each query?',
    ],
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
    signal: 'Values are versioned by a monotonically increasing timestamp and a read asks for the newest version at or before a time.',
    approach: `Because sets arrive with non-decreasing timestamps, each key's history is already
a sorted list — no sorting needed on write. A get is then a binary search for
the rightmost entry with timestamp <= the query, which bisect gives directly.
A linear scan per get would make heavy read workloads quadratic.`,
    solution: `from bisect import bisect_right
from collections import defaultdict


class TimeMap:
    def __init__(self) -> None:
        self._times: dict[str, list[int]] = defaultdict(list)
        self._values: dict[str, list[str]] = defaultdict(list)

    def set(self, key: str, value: str, timestamp: int) -> None:
        self._times[key].append(timestamp)
        self._values[key].append(value)

    def get(self, key: str, timestamp: int) -> str:
        times = self._times.get(key)
        if not times:
            return ""
        i = bisect_right(times, timestamp)
        return self._values[key][i - 1] if i else ""`,
    complexity: {
      time: 'O(1) amortised per set, O(log n) per get — a set appends to an already-sorted list, and a get binary searches the versions stored under that key.',
      space: 'O(total sets) — every version is retained because any of them may still be the answer to some query.',
    },
    followUps: [
      'What if timestamps can arrive out of order? Appending no longer keeps the list sorted; you need insort or a tree.',
      'What if old versions should expire after a retention window? A deque plus eviction, and gets below the window fail.',
      'What if the store must survive a restart — how does the binary search translate to an on-disk layout?',
    ],
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
    signal: 'Two sorted inputs and a required O(log(m+n)) — merging is O(m+n), so you must binary search a partition instead.',
    approach: `The median is defined by a partition that puts exactly half the combined elements
on the left. Binary search how many elements to take from the shorter array;
the count from the other array follows. The partition is correct when every
element left of the cut is <= every element right of it, checked with the four
boundary values.`,
    solution: `def find_median_sorted_arrays(nums1: list[int], nums2: list[int]) -> float:
    if not nums1 and not nums2:
        raise ValueError("median of an empty collection is undefined")

    a, b = (nums1, nums2) if len(nums1) <= len(nums2) else (nums2, nums1)
    total = len(a) + len(b)
    half = total // 2

    lo, hi = 0, len(a)
    while True:
        i = (lo + hi) // 2  # elements taken from a
        j = half - i  # elements taken from b

        a_left = a[i - 1] if i > 0 else float("-inf")
        a_right = a[i] if i < len(a) else float("inf")
        b_left = b[j - 1] if j > 0 else float("-inf")
        b_right = b[j] if j < len(b) else float("inf")

        if a_left <= b_right and b_left <= a_right:
            if total % 2:
                return float(min(a_right, b_right))
            return (max(a_left, b_left) + min(a_right, b_right)) / 2
        if a_left > b_right:
            hi = i - 1
        else:
            lo = i + 1`,
    complexity: {
      time: 'O(log(min(m, n))) — the binary search runs over the cut position in the shorter array only.',
      space: 'O(1) — four boundary values and two indices; nothing is merged or copied.',
    },
    followUps: [
      'What if there are k sorted arrays instead of two? The partition argument does not generalise; binary search the value instead.',
      'What if you need the k-th smallest rather than the median? Same partition idea with half replaced by k.',
      'What if the arrays are on disk and you may only read sequentially — is O(m + n) actually the better answer?',
    ],
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
    signal: 'Change the direction of the links themselves — nothing about the values matters, only the pointers.',
    approach: `Walk the list carrying the node you have already reversed into. At each step
stash the next pointer before overwriting it, point the current node backward,
then step forward. Losing the stash is the classic bug: once you overwrite
node.next the rest of the list is unreachable.`,
    solution: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None) -> None:
        self.val = val
        self.next = nxt


def reverse_list(head: ListNode | None) -> ListNode | None:
    prev: ListNode | None = None
    while head is not None:
        nxt = head.next  # stash before overwriting
        head.next = prev
        prev = head
        head = nxt
    return prev`,
    complexity: {
      time: 'O(n) — each node\'s next pointer is rewritten exactly once.',
      space: 'O(1) — three pointers; the recursive version would cost O(n) stack instead.',
    },
    followUps: [
      'What if you must reverse only nodes between positions m and n? You need the node before m held aside.',
      'What if it is a doubly linked list — how many pointers change per node?',
      'Write it recursively: what is the base case, and why does the stack cost O(n)?',
    ],
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
    signal: 'Two sorted sequences into one sorted sequence — repeatedly take the smaller head, which is the merge step of merge sort.',
    approach: `Because both lists are sorted, the smallest remaining element is always one of the
two heads. Splice whichever is smaller onto the result and advance that list.
A dummy head node removes the special case for the very first append, and the
tail of whichever list survives can be attached wholesale.`,
    solution: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None) -> None:
        self.val = val
        self.next = nxt


def merge_two_lists(a: ListNode | None, b: ListNode | None) -> ListNode | None:
    dummy = tail = ListNode()

    while a is not None and b is not None:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next

    tail.next = a if a is not None else b
    return dummy.next`,
    complexity: {
      time: 'O(m + n) — every node from both lists is visited and spliced exactly once.',
      space: 'O(1) — nodes are relinked in place; only the dummy and a tail pointer are allocated.',
    },
    followUps: [
      'What if there are k lists? Pairwise merging or a k-sized heap gets you O(n log k).',
      'What if the lists are arrays instead — does merging in place change the space bound?',
      'What if duplicates must be dropped during the merge rather than after?',
    ],
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
    signal: 'You need the last node, then the first, then the second-to-last — a singly linked list cannot walk backward, so half of it must be reversed.',
    approach: `Three known moves composed: find the middle with slow and fast pointers, reverse
the second half so it can be consumed front-to-back, then interleave the two
halves. Copying values into an array and rewriting is O(n) space; this is O(1)
and is what the question is really testing.`,
    solution: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None) -> None:
        self.val = val
        self.next = nxt


def reorder_list(head: ListNode | None) -> None:
    if head is None or head.next is None:
        return

    slow, fast = head, head.next
    while fast is not None and fast.next is not None:
        slow, fast = slow.next, fast.next.next

    second = slow.next
    slow.next = None  # cut the list in two

    prev = None
    while second is not None:
        second.next, prev, second = prev, second, second.next
    second = prev

    first = head
    while second is not None:
        after_first, after_second = first.next, second.next  # stash before rewiring
        first.next = second
        second.next = after_first
        first, second = after_first, after_second`,
    complexity: {
      time: 'O(n) — three linear passes: find the middle, reverse the tail, interleave.',
      space: 'O(1) — all rewiring is done in place with a constant number of pointers.',
    },
    followUps: [
      'What if it is a doubly linked list? You can walk inward from both ends with no reversal.',
      'What if you must undo the reorder afterwards — is the operation invertible in place?',
      'What if the list is huge and stored on disk, so random access is expensive?',
    ],
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
    signal: 'Position counted from the end of a singly linked list, ideally in one pass — that is a fixed gap between two pointers.',
    approach: `Counting the length first and walking again is two passes. Instead advance a lead
pointer n steps, then move both until the lead falls off the end: the trailing
pointer now sits exactly n from the end. Starting the trailer at a dummy node
makes removing the head need no special case.`,
    solution: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None) -> None:
        self.val = val
        self.next = nxt


def remove_nth_from_end(head: ListNode | None, n: int) -> ListNode | None:
    dummy = ListNode(0, head)
    lead: ListNode | None = head
    for _ in range(n):
        if lead is None:
            return head  # n is longer than the list
        lead = lead.next

    trail = dummy
    while lead is not None:
        lead, trail = lead.next, trail.next

    trail.next = trail.next.next
    return dummy.next`,
    complexity: {
      time: 'O(n) — a single traversal, since the two pointers together cover the list once.',
      space: 'O(1) — one dummy node and two pointers regardless of list length.',
    },
    followUps: [
      'What if n exceeds the list length? Decide whether that is a no-op or an error before you write the loop.',
      'What if you must remove every n-th node from the end, not just one?',
      'What if the list is doubly linked with a tail pointer — does the gap trick still buy anything?',
    ],
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
    signal: 'Deep copy a structure whose pointers can target any node, including ones not yet created — you need identity mapping, not traversal order.',
    approach: `The random pointer may point forward, so you cannot resolve it on a single pass.
Pass one clones every node and records original to clone in a dict; pass two
uses that dict to translate both next and random. The O(1) space variant weaves
clones into the original list instead of using a map.`,
    solution: `class Node:
    def __init__(self, val: int) -> None:
        self.val = val
        self.next: "Node | None" = None
        self.random: "Node | None" = None


def copy_random_list(head: Node | None) -> Node | None:
    clones: dict[Node | None, Node | None] = {None: None}

    node = head
    while node is not None:
        clones[node] = Node(node.val)
        node = node.next

    node = head
    while node is not None:
        clones[node].next = clones[node.next]
        clones[node].random = clones[node.random]
        node = node.next

    return clones[head]`,
    complexity: {
      time: 'O(n) — two passes, with an O(1) expected dict lookup per pointer translated.',
      space: 'O(n) — the map from original nodes to clones, on top of the copied list itself.',
    },
    followUps: [
      'Can you do it in O(1) extra space? Interleave each clone after its original, fix randoms, then unzip.',
      'What if the structure is a general graph rather than a list? That is Clone Graph, same map, DFS instead of a walk.',
      'What if node values are large objects — should the copy be deep there too?',
    ],
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
    signal: 'Digits stored least-significant-first — the list order is already the order schoolbook addition wants.',
    approach: `Walk both lists together adding digit plus digit plus carry, emitting the ones
place and carrying the tens. Reverse storage is what makes this work in one
pass with no length alignment. The loop must keep running while either list has
digits or a carry remains, or you drop the final 1.`,
    solution: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None) -> None:
        self.val = val
        self.next = nxt


def add_two_numbers(l1: ListNode | None, l2: ListNode | None) -> ListNode | None:
    dummy = tail = ListNode()
    carry = 0

    while l1 is not None or l2 is not None or carry:
        total = carry
        if l1 is not None:
            total += l1.val
            l1 = l1.next
        if l2 is not None:
            total += l2.val
            l2 = l2.next
        carry, digit = divmod(total, 10)
        tail.next = ListNode(digit)
        tail = tail.next

    return dummy.next`,
    complexity: {
      time: 'O(max(m, n)) — one pass ending when both lists and the carry are exhausted.',
      space: 'O(max(m, n)) — the result list, which is at most one digit longer than the longer input.',
    },
    followUps: [
      'What if the digits are stored most-significant-first? Reverse both, or use two stacks, because carries flow the other way.',
      'What if the numbers are in base 2^32 rather than base 10 — does anything but the divmod change?',
      'What if you must subtract instead, and the result can be negative?',
    ],
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
    signal: 'Detect a loop with O(1) memory — you cannot record visited nodes, so two pointers at different speeds must collide.',
    approach: `A hash set of visited nodes works but costs O(n). Instead run a slow pointer one
step and a fast pointer two steps: inside a cycle the gap closes by one each
iteration, so they must meet. With no cycle the fast pointer simply reaches the
end. This is Floyd's tortoise and hare.`,
    solution: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None) -> None:
        self.val = val
        self.next = nxt


def has_cycle(head: ListNode | None) -> bool:
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False`,
    complexity: {
      time: 'O(n) — the fast pointer covers the tail in n/2 steps, then closes a gap of at most the cycle length.',
      space: 'O(1) — two pointers, versus O(n) for the visited-set approach.',
    },
    followUps: [
      'What if you must return the node where the cycle begins? Reset one pointer to the head and step both by one.',
      'What if you need the cycle\'s length? Keep walking from the meeting point until you return to it.',
      'What if the structure is a graph rather than a list — does Floyd still apply?',
    ],
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
    signal: 'Values are in 1..n inside an array of size n+1, and you may not modify the array or use extra space — the array is secretly a linked list.',
    approach: `Read index i as a node pointing to index nums[i]. Since every value is a valid
index and one value repeats, that functional graph must contain a cycle, and the
cycle's entrance is the duplicate. Floyd's algorithm finds the meeting point,
then a second walk from the start finds the entrance.`,
    solution: `def find_duplicate(nums: list[int]) -> int:
    slow = fast = nums[0]
    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break

    finder = nums[0]
    while finder != slow:
        finder = nums[finder]
        slow = nums[slow]

    return finder`,
    complexity: {
      time: 'O(n) — two linear walks: one to meet inside the cycle, one to locate its entrance.',
      space: 'O(1) — three integer indices; the array itself is never modified.',
    },
    followUps: [
      'What if the array may be modified? Marking visited indices negative is simpler and still O(1) extra space.',
      'What if there can be several duplicates and you must report all of them?',
      'Can you binary search on the value range instead — counting how many entries are <= mid?',
    ],
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
    signal: 'O(1) lookup and O(1) eviction of the least recently used entry — one structure cannot give both, so you compose two.',
    approach: `A dict gives O(1) lookup but no ordering; a doubly linked list gives O(1) reorder
but no lookup. Combine them: the dict maps key to its node, and the list keeps
nodes in recency order with the least recent at the head. Every get and put
unlinks and re-appends in constant time.`,
    solution: `class _Node:
    def __init__(self, key: int = 0, value: int = 0) -> None:
        self.key, self.value = key, value
        self.prev: "_Node | None" = None
        self.next: "_Node | None" = None


class LRUCache:
    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self._map: dict[int, _Node] = {}
        self._head, self._tail = _Node(), _Node()  # head = LRU end, tail = MRU end
        self._head.next, self._tail.prev = self._tail, self._head

    def _unlink(self, node: _Node) -> None:
        node.prev.next, node.next.prev = node.next, node.prev

    def _append(self, node: _Node) -> None:
        node.prev, node.next = self._tail.prev, self._tail
        self._tail.prev.next = node
        self._tail.prev = node

    def get(self, key: int) -> int:
        node = self._map.get(key)
        if node is None:
            return -1
        self._unlink(node)
        self._append(node)
        return node.value

    def put(self, key: int, value: int) -> None:
        if key in self._map:
            node = self._map[key]
            node.value = value
            self._unlink(node)
            self._append(node)
            return
        if len(self._map) >= self.capacity:
            lru = self._head.next
            self._unlink(lru)
            del self._map[lru.key]
        node = _Node(key, value)
        self._map[key] = node
        self._append(node)`,
    complexity: {
      time: 'O(1) per get and put — a dict lookup plus a constant number of pointer rewrites, with no scan for the victim.',
      space: 'O(capacity) — one node and one dict entry per cached key, and nothing beyond the capacity.',
    },
    followUps: [
      'What if it must be thread safe? A single lock serialises everything; sharding by key hash restores concurrency.',
      'What if eviction should be by frequency rather than recency? LFU needs a second index by count.',
      'What if entries also expire by time — how do you evict without scanning?',
    ],
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
    signal: 'k sorted sequences, one sorted output — merging them one at a time is quadratic, so pair them up or use a heap.',
    approach: `Merging list 2 into list 1, then list 3, and so on rescans the growing result and
costs O(n * k). Merging in pairs halves the number of lists each round, so every
element is copied only log k times. A k-sized min-heap over the heads reaches
the same O(n log k) bound.`,
    solution: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None) -> None:
        self.val = val
        self.next = nxt


def _merge(a: ListNode | None, b: ListNode | None) -> ListNode | None:
    dummy = tail = ListNode()
    while a is not None and b is not None:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a if a is not None else b
    return dummy.next


def merge_k_lists(lists: list[ListNode | None]) -> ListNode | None:
    if not lists:
        return None
    while len(lists) > 1:
        lists = [
            _merge(lists[i], lists[i + 1] if i + 1 < len(lists) else None)
            for i in range(0, len(lists), 2)
        ]
    return lists[0]`,
    complexity: {
      time: 'O(n log k) — there are log k merge rounds and each round touches all n nodes exactly once.',
      space: 'O(log k) for the round bookkeeping — nodes are relinked in place, nothing is copied.',
    },
    followUps: [
      'What if the lists are streams from k machines? A heap merges online where pairwise merging needs them all up front.',
      'What if k is enormous compared to n — which of the two O(n log k) strategies wins in practice?',
      'What if you only need the first m elements of the merged result?',
    ],
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
    signal: 'Reverse in fixed-size chunks, leaving a short trailing chunk untouched — you must look ahead k nodes before committing.',
    approach: `Before reversing anything, walk k nodes to confirm a full group exists; a short
tail is left as is. Reverse that group with the standard three-pointer loop,
then stitch it between the node before the group and the node after. A dummy
head makes the first group need no special case.`,
    solution: `class ListNode:
    def __init__(self, val: int = 0, nxt: "ListNode | None" = None) -> None:
        self.val = val
        self.next = nxt


def reverse_k_group(head: ListNode | None, k: int) -> ListNode | None:
    if k <= 1:
        return head

    dummy = ListNode(0, head)
    group_prev = dummy

    while True:
        kth = group_prev
        for _ in range(k):
            kth = kth.next
            if kth is None:
                return dummy.next  # fewer than k nodes left

        group_next = kth.next
        prev, node = group_next, group_prev.next
        while node is not group_next:
            node.next, prev, node = prev, node, node.next

        new_tail = group_prev.next  # the old head is now the group's tail
        group_prev.next = kth
        group_prev = new_tail`,
    complexity: {
      time: 'O(n) — each node is visited once to count its group and once to be reversed.',
      space: 'O(1) — the reversal is in place; only a dummy node and a few pointers are used.',
    },
    followUps: [
      'What if the trailing partial group should also be reversed? The look-ahead check becomes optional, not fatal.',
      'What if k is larger than the list? The first look-ahead fails and the list is returned unchanged.',
      'What if groups must alternate between reversed and left alone?',
    ],
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
    signal: 'A structural transformation that is identical at every node — the definition of the answer is recursive, so the code is too.',
    approach: `Mirroring a tree means swapping each node's children and mirroring both subtrees.
There is no cleverness to find: the recursion is the algorithm. An explicit
stack or queue does the same work iteratively if the tree is deep enough to
threaten the call stack.`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def invert_tree(root: TreeNode | None) -> TreeNode | None:
    if root is None:
        return None
    root.left, root.right = invert_tree(root.right), invert_tree(root.left)
    return root`,
    complexity: {
      time: 'O(n) — every node is visited exactly once and does O(1) work.',
      space: 'O(h) — the recursion stack is as deep as the tree, which is O(log n) balanced and O(n) degenerate.',
    },
    followUps: [
      'What if the tree is a million nodes deep? Python\'s recursion limit bites; convert to an explicit stack.',
      'What if you must not mutate the input and have to return a mirrored copy instead?',
      'How would you check whether a tree is its own mirror — is that the same traversal?',
    ],
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
    signal: 'An aggregate over root-to-leaf paths where each node\'s answer is a simple function of its children\'s answers.',
    approach: `Depth of a node is one more than the deeper of its two subtrees, with an empty
tree at zero. That single recurrence is the whole solution. A BFS counting
levels gives the same number and is the version you want when the tree is deep
or when you need the level structure anyway.`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def max_depth(root: TreeNode | None) -> int:
    if root is None:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))`,
    complexity: {
      time: 'O(n) — each node contributes one comparison and one addition, visited once.',
      space: 'O(h) — recursion depth equals tree height; a BFS would instead cost O(width).',
    },
    followUps: [
      'What if you need the minimum depth? Watch the trap: a node with one child is not a leaf.',
      'What if the tree is n-ary rather than binary — what replaces the max of two?',
      'What if the tree does not fit in memory and children are fetched over the network?',
    ],
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
    signal: 'The best path need not pass through the root — so every node is a candidate turning point and must be scored as one.',
    approach: `At each node the longest path bending there is left height plus right height.
Compute heights bottom-up in one traversal and record the best bend seen. The
naive version recomputes height for every node, making it O(n^2) on a skewed
tree; returning the height as you go collapses that to one pass.`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def diameter_of_binary_tree(root: TreeNode | None) -> int:
    best = 0

    def height(node: TreeNode | None) -> int:
        nonlocal best
        if node is None:
            return 0
        left, right = height(node.left), height(node.right)
        best = max(best, left + right)  # path bending at this node
        return 1 + max(left, right)

    height(root)
    return best`,
    complexity: {
      time: 'O(n) — one post-order pass; each node\'s height is computed once and reused by its parent.',
      space: 'O(h) — the recursion stack, O(n) for a degenerate chain.',
    },
    followUps: [
      'What if edges have weights? The bend value becomes a sum of weights, not a count of edges.',
      'What if you must return the path itself, not its length?',
      'What if the input is a general tree or a graph — does the bottom-up trick survive cycles?',
    ],
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
    signal: 'A property that must hold at every node and depends on subtree heights — compute the height and the verdict in the same return value.',
    approach: `Checking balance by calling a separate height function at every node recomputes
the same heights over and over, which is O(n^2). Instead let one post-order
function return the height, or a sentinel -1 meaning "already unbalanced", so
the failure short-circuits all the way up in a single pass.`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def is_balanced(root: TreeNode | None) -> bool:
    def height(node: TreeNode | None) -> int:
        if node is None:
            return 0
        left = height(node.left)
        if left == -1:
            return -1
        right = height(node.right)
        if right == -1 or abs(left - right) > 1:
            return -1
        return 1 + max(left, right)

    return height(root) != -1`,
    complexity: {
      time: 'O(n) — each node\'s height is computed exactly once, versus O(n^2) if height is recomputed per node.',
      space: 'O(h) — recursion depth only; the sentinel carries the verdict, so no extra structure is needed.',
    },
    followUps: [
      'What if the allowed height difference is k rather than 1 — does anything but the comparison change?',
      'What if you must return the first unbalanced node, not just a boolean?',
      'How would you rebalance it? That is where AVL rotations or a rebuild from a sorted traversal come in.',
    ],
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
    signal: 'Compare two structures node for node — equality is defined recursively, so both trees must be walked in lockstep.',
    approach: `Two trees are the same when both are empty, or both are non-empty with equal
values and matching subtrees. Walking them together is what makes it correct:
comparing serialised traversals can conflate different shapes unless the nulls
are serialised too.`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def is_same_tree(p: TreeNode | None, q: TreeNode | None) -> bool:
    if p is None or q is None:
        return p is q
    return (
        p.val == q.val
        and is_same_tree(p.left, q.left)
        and is_same_tree(p.right, q.right)
    )`,
    complexity: {
      time: 'O(min(m, n)) — the walk stops at the first mismatch, so it never exceeds the smaller tree.',
      space: 'O(h) — the recursion stack, bounded by the height of the shallower tree.',
    },
    followUps: [
      'What if the trees may be mirror images and that still counts as equal? Swap the child comparison.',
      'What if you must report where they first diverge, not just that they do?',
      'What if the trees are huge and remote — can a Merkle hash per subtree cut the comparison short?',
    ],
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
    signal: '"Contains an identical subtree" — an exact-match check anchored at every possible node, so it is a search wrapped around an equality test.',
    approach: `Try to match the pattern at the root; if that fails, recurse into each child and
try again. The equality test is Same Tree, and the outer walk is what makes it
O(m * n) in the worst case. Serialising both trees with null markers turns it
into substring search and gets you to O(m + n).`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def _same(p: TreeNode | None, q: TreeNode | None) -> bool:
    if p is None or q is None:
        return p is q
    return p.val == q.val and _same(p.left, q.left) and _same(p.right, q.right)


def is_subtree(root: TreeNode | None, sub: TreeNode | None) -> bool:
    if sub is None:
        return True
    if root is None:
        return False
    if _same(root, sub):
        return True
    return is_subtree(root.left, sub) or is_subtree(root.right, sub)`,
    complexity: {
      time: 'O(m * n) — each of the m nodes of root may start an O(n) equality check against the pattern.',
      space: 'O(h) — recursion depth of the outer walk plus the nested equality walk.',
    },
    followUps: [
      'Can you get O(m + n)? Serialise with explicit nulls and run KMP for the pattern inside the text.',
      'What if you want the count of matching subtrees rather than a boolean?',
      'What if a match only needs the same shape, not the same values?',
    ],
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
    signal: 'Lowest common ancestor, and the tree is a BST — the ordering tells you which way to walk without any searching.',
    approach: `In a BST the LCA is the first node whose value sits between the two targets. If
both targets are smaller, the answer is in the left subtree; if both are larger,
the right. The moment they split — or one equals the current node — you have
found it. No parent pointers and no path recording needed.`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def lowest_common_ancestor(root: TreeNode | None, p: int, q: int) -> TreeNode | None:
    lo, hi = min(p, q), max(p, q)
    node = root
    while node is not None:
        if hi < node.val:
            node = node.left
        elif lo > node.val:
            node = node.right
        else:
            return node  # the split point, or one of the targets itself
    return None`,
    complexity: {
      time: 'O(h) — one root-to-node descent, so O(log n) on a balanced BST and O(n) on a degenerate one.',
      space: 'O(1) — the loop carries a single pointer, no recursion and no stored paths.',
    },
    followUps: [
      'What if it is an ordinary binary tree with no ordering? You must recurse both sides and combine.',
      'What if either target might be absent from the tree — does this still return a sensible answer?',
      'What if there are many LCA queries on a static tree? Binary lifting answers each in O(log n) after preprocessing.',
    ],
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
    signal: 'The output is grouped by depth — that grouping is a queue processed one full level at a time.',
    approach: `A plain BFS visits nodes in level order but loses the boundaries. Capture the
queue's length before draining it: that count is exactly the current level's
width, so popping that many nodes yields one level. Everything enqueued during
the drain belongs to the next level.`,
    solution: `from collections import deque


class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def level_order_traversal(root: TreeNode | None) -> list[list[int]]:
    if root is None:
        return []

    out: list[list[int]] = []
    queue = deque([root])

    while queue:
        level = []
        for _ in range(len(queue)):  # snapshot the width before draining
            node = queue.popleft()
            level.append(node.val)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        out.append(level)

    return out`,
    complexity: {
      time: 'O(n) — every node is enqueued once and dequeued once.',
      space: 'O(w) — the queue holds at most one level, and the widest level can be n/2 nodes.',
    },
    followUps: [
      'What if levels must alternate direction? Zigzag needs only a reverse on odd levels.',
      'What if the tree is extremely wide — is BFS still the right memory trade against DFS with a depth index?',
      'What if you need the bottom-up order? Build normally and reverse, or prepend.',
    ],
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
    signal: '"What you see from one side" — that is the last node of every level, so the problem is level-order in disguise.',
    approach: `Run a level-order traversal and keep only the final node of each level. The trap
is thinking it is just the right spine: when a right subtree is missing, a node
from the left subtree becomes visible. A DFS that visits right first and records
the first node seen at each new depth works equally well.`,
    solution: `from collections import deque


class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def right_side_view(root: TreeNode | None) -> list[int]:
    if root is None:
        return []

    out: list[int] = []
    queue = deque([root])

    while queue:
        width = len(queue)
        for i in range(width):
            node = queue.popleft()
            if i == width - 1:  # last node of this level
                out.append(node.val)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)

    return out`,
    complexity: {
      time: 'O(n) — a full BFS; every node is enqueued and dequeued once even though most are not emitted.',
      space: 'O(w) — the queue holds one level at a time, up to n/2 nodes at the widest.',
    },
    followUps: [
      'What about the left side view — does the same code work with i == 0?',
      'What if you need the vertical order view, grouping by horizontal offset instead of depth?',
      'Can you avoid BFS entirely with a right-first DFS keyed on depth, and what does that do to the space bound?',
    ],
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
    signal: 'A node\'s verdict depends on everything on the path from the root to it — so carry that path summary down as a parameter.',
    approach: `A node is good when nothing on its root path is larger. Rather than re-scanning
the path at each node, pass the running maximum down the recursion: it is the
only fact about the path that matters. Each node compares against it once and
passes the updated maximum to its children.`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def good_nodes(root: TreeNode | None) -> int:
    def walk(node: TreeNode | None, best: float) -> int:
        if node is None:
            return 0
        good = 1 if node.val >= best else 0
        best = max(best, node.val)
        return good + walk(node.left, best) + walk(node.right, best)

    return walk(root, float("-inf"))`,
    complexity: {
      time: 'O(n) — one pass; carrying the running maximum avoids re-walking each root path.',
      space: 'O(h) — recursion depth only, since the path summary is a single number.',
    },
    followUps: [
      'What if \'good\' meant strictly greater than everything before it — which comparison flips?',
      'What if you need the minimum on the path too, or both bounds at once?',
      'What if nodes are inserted dynamically and the count must stay current?',
    ],
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
    signal: 'A BST constraint is about whole subtrees, not parent-child pairs — so each node needs an allowed range, not a single comparison.',
    approach: `Checking only node against its two children is the classic wrong answer: a value
can be greater than its parent yet still violate an ancestor's bound. Push an
open interval down instead — going left tightens the upper bound, going right
tightens the lower one. An in-order traversal that must be strictly increasing
is the equivalent check.`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def is_valid_bst(root: TreeNode | None) -> bool:
    def valid(node: TreeNode | None, low: float, high: float) -> bool:
        if node is None:
            return True
        if not low < node.val < high:
            return False
        return valid(node.left, low, node.val) and valid(node.right, node.val, high)

    return valid(root, float("-inf"), float("inf"))`,
    complexity: {
      time: 'O(n) — every node is checked once against a range that is passed down, not recomputed.',
      space: 'O(h) — the recursion stack; the bounds themselves are two numbers per frame.',
    },
    followUps: [
      'What if duplicates are allowed on one side? One of the strict inequalities has to relax.',
      'What if exactly two nodes were swapped and you must recover the BST in place?',
      'Why is checking only parent versus child wrong — construct the smallest counterexample.',
    ],
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
    signal: 'k-th smallest in a BST — in-order traversal already emits values in sorted order, so you just need to stop early.',
    approach: `In-order visits a BST in ascending order, so the k-th value it emits is the
answer. Collecting the whole traversal wastes time and memory; an explicit
stack lets you stop the moment the count reaches k. That early exit is the
difference between O(n) and O(h + k).`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def kth_smallest(root: TreeNode | None, k: int) -> int:
    stack: list[TreeNode] = []
    node = root

    while node is not None or stack:
        while node is not None:
            stack.append(node)
            node = node.left
        node = stack.pop()
        k -= 1
        if k == 0:
            return node.val
        node = node.right

    raise ValueError("k is larger than the number of nodes")`,
    complexity: {
      time: 'O(h + k) — the initial descent costs the height, then k pops each do O(1) amortised work.',
      space: 'O(h) — the stack never holds more than one root-to-node path.',
    },
    followUps: [
      'What if the BST is modified often and k-th queries are frequent? Store a subtree size in each node for O(h) lookups.',
      'What if you need the k-th largest? Mirror the traversal to right, node, left.',
      'What if the tree is not a BST — does anything below a full sort survive?',
    ],
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
    signal: 'Two traversals given: preorder names the root, inorder tells you how the rest splits around it.',
    approach: `The first preorder value is the root. Find it in inorder: everything left of it
is the left subtree, everything right is the right, and their sizes tell you how
to slice preorder. Scanning inorder for the root each time is O(n^2); a
value-to-index dict built once makes each split O(1).`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def build_tree_from(preorder: list[int], inorder: list[int]) -> TreeNode | None:
    position = {value: i for i, value in enumerate(inorder)}
    pre_index = 0

    def build(lo: int, hi: int) -> TreeNode | None:
        nonlocal pre_index
        if lo > hi:
            return None
        root = TreeNode(preorder[pre_index])
        pre_index += 1
        mid = position[root.val]
        root.left = build(lo, mid - 1)
        root.right = build(mid + 1, hi)
        return root

    return build(0, len(inorder) - 1)`,
    complexity: {
      time: 'O(n) — each node is created once and its inorder position is found by dict lookup, not a scan.',
      space: 'O(n) — the position map, plus O(h) recursion depth.',
    },
    followUps: [
      'What if you are given postorder and inorder instead? Consume postorder from the back and build right first.',
      'What if preorder and postorder are given, with no inorder? The tree is not unique unless it is full.',
      'What if values may repeat? The position map breaks, and the reconstruction becomes ambiguous.',
    ],
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
    signal: 'A path may start and end anywhere and may bend at a node — so what a node returns upward is not what it contributes locally.',
    approach: `Separate two quantities. What a node can offer its parent is a straight-line gain:
its value plus the better of its two child gains, clamped at zero because a
negative branch is better dropped. What it can score by itself is its value plus
both gains, the bending path, and that is what the running best tracks.`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def max_path_sum(root: TreeNode | None) -> int:
    if root is None:
        raise ValueError("a path needs at least one node")

    best = float("-inf")

    def gain(node: TreeNode | None) -> int:
        nonlocal best
        if node is None:
            return 0
        left = max(gain(node.left), 0)  # drop negative branches
        right = max(gain(node.right), 0)
        best = max(best, node.val + left + right)  # path bending here
        return node.val + max(left, right)  # straight path offered upward

    gain(root)
    return int(best)`,
    complexity: {
      time: 'O(n) — one post-order pass, each node computing its gain once from its children\'s gains.',
      space: 'O(h) — the recursion stack; nothing else is stored.',
    },
    followUps: [
      'What if the path must pass through the root? The bending case at the root is the only candidate.',
      'What if all values are negative — why does clamping at zero not force a wrong answer of 0?',
      'What if you must return the path\'s nodes, not just the sum?',
    ],
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
    signal: 'Round-trip a shape, not just values — so the encoding must record absent children or the structure cannot be recovered.',
    approach: `A preorder walk that writes an explicit marker for every null child is enough to
rebuild the tree unambiguously, because the marker tells the reader exactly when
a subtree ends. Deserialising is the same preorder walk consuming tokens in
order. Without the null markers, two different trees can share an encoding.`,
    solution: `class TreeNode:
    def __init__(self, val: int = 0, left: "TreeNode | None" = None, right: "TreeNode | None" = None) -> None:
        self.val, self.left, self.right = val, left, right


def serialize(root: TreeNode | None) -> str:
    out: list[str] = []

    def walk(node: TreeNode | None) -> None:
        if node is None:
            out.append("#")
            return
        out.append(str(node.val))
        walk(node.left)
        walk(node.right)

    walk(root)
    return ",".join(out)


def deserialize(data: str) -> TreeNode | None:
    tokens = iter(data.split(","))

    def build() -> TreeNode | None:
        token = next(tokens)
        if token == "#":
            return None
        node = TreeNode(int(token))
        node.left = build()
        node.right = build()
        return node

    return build()`,
    complexity: {
      time: 'O(n) for each direction — every real node and every null marker is written once and read once.',
      space: 'O(n) — the token list is proportional to the tree, plus O(h) recursion depth.',
    },
    followUps: [
      'What if values can contain commas? The delimiter breaks; use length prefixes or escaping.',
      'What if the tree is a BST? Preorder alone suffices, because the ordering implies the splits.',
      'What if the encoding must be as small as possible — how much do the null markers actually cost?',
    ],
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
    signal: 'The k-th largest, maintained across an unbounded stream — you can never store everything, and only the top k ever matter.',
    approach: `Keep a min-heap of exactly the k largest values seen. Its root is by definition
the k-th largest. On each arrival push and, if the heap grew past k, pop the
smallest — the value just evicted can never re-enter the top k. Sorting the
whole history on each query would be O(n log n) per call.`,
    solution: `import heapq


class KthLargest:
    def __init__(self, k: int, nums: list[int]) -> None:
        self.k = k
        self.heap = list(nums)
        heapq.heapify(self.heap)
        while len(self.heap) > k:
            heapq.heappop(self.heap)

    def add(self, val: int) -> int:
        heapq.heappush(self.heap, val)
        if len(self.heap) > self.k:
            heapq.heappop(self.heap)
        return self.heap[0]`,
    complexity: {
      time: 'O(log k) per add — one push and at most one pop on a heap that never exceeds k elements.',
      space: 'O(k) — only the current top k are retained, independent of stream length.',
    },
    followUps: [
      'What if k changes between queries? A fixed-size heap no longer works; you need an order-statistic tree.',
      'What if values may be removed as well as added? A lazy-deletion heap or a balanced BST handles it.',
      'What if the stream is distributed across machines — how do you merge per-shard top-k heaps?',
    ],
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
    signal: 'Repeatedly take the two largest, replace them with something derived — a loop over extremes is a heap, not a re-sort.',
    approach: `Re-sorting after every smash is O(n^2 log n). A max-heap gives the two largest in
O(log n) each and reinserts the remainder just as cheaply. Python's heapq is a
min-heap, so negate on the way in and out — a standard idiom worth naming
explicitly in the interview.`,
    solution: `import heapq


def last_stone_weight(stones: list[int]) -> int:
    heap = [-s for s in stones]  # negate: heapq is a min-heap
    heapq.heapify(heap)

    while len(heap) > 1:
        first = -heapq.heappop(heap)
        second = -heapq.heappop(heap)
        if first != second:
            heapq.heappush(heap, -(first - second))

    return -heap[0] if heap else 0`,
    complexity: {
      time: 'O(n log n) — heapify is O(n), then each of at most n smashes does a constant number of O(log n) heap operations.',
      space: 'O(n) — the negated copy of the stones; the smashing itself allocates nothing new.',
    },
    followUps: [
      'What if you may choose which stones to smash to minimise the remainder? That is partition, a DP problem, not a heap one.',
      'What if three stones collide at a time — does the greedy still hold?',
      'What if stones stream in while smashing continues? The heap handles inserts, the answer just becomes a running one.',
    ],
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
    signal: 'The k best by some score, where k is far smaller than n — a full sort does more work than the question asks for.',
    approach: `Rank by squared distance; the square root is monotonic so it changes nothing but
costs precision and time. A size-k max-heap keeps only the current best k at
O(n log k), better than the O(n log n) full sort. Quickselect gets O(n) average
but gives up the heap's streaming ability.`,
    solution: `import heapq


def k_closest(points: list[list[int]], k: int) -> list[list[int]]:
    # squared distance: sqrt is monotonic, so it cannot change the ordering
    return heapq.nsmallest(k, points, key=lambda p: p[0] * p[0] + p[1] * p[1])`,
    complexity: {
      time: 'O(n log k) — nsmallest maintains a heap of size k, doing one O(log k) operation per point.',
      space: 'O(k) — only the current best k points are held, not a sorted copy of the input.',
    },
    followUps: [
      'What if points stream in forever? The size-k heap already handles it; a full sort cannot.',
      'What if you want O(n) average time? Quickselect partitions around the k-th distance instead.',
      'What if the origin moves between queries — can any of the precomputation be reused?',
    ],
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
    signal: 'The k-th largest, not the largest and not a sorted array — a selection problem, where sorting is strictly more than you need.',
    approach: `A min-heap holding the k largest values seen answers it in O(n log k): push each
element, pop when the heap exceeds k, and the root is the answer. Quickselect
partitions around a pivot and recurses into one side only, giving O(n) average
but O(n^2) worst case unless the pivot is randomised.`,
    solution: `import heapq


def find_kth_largest(nums: list[int], k: int) -> int:
    if not nums or not 1 <= k <= len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    heap: list[int] = []
    for n in nums:
        heapq.heappush(heap, n)
        if len(heap) > k:
            heapq.heappop(heap)  # evicted values can never be in the top k

    return heap[0]`,
    complexity: {
      time: 'O(n log k) — one push and at most one pop per element on a heap capped at k entries.',
      space: 'O(k) — only the running top k is stored, versus O(n) for a sorted copy.',
    },
    followUps: [
      'What if you need O(n) average time? Quickselect with a randomised pivot recurses into one partition only.',
      'What if the array does not fit in memory? Stream it through the same k-sized heap, which never grows.',
      'What if many different k values are queried on the same static array?',
    ],
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
    signal: 'Identical items must be spaced apart by a cooldown — the most frequent item alone dictates the schedule\'s skeleton.',
    approach: `The task with the highest count sets the frame: max_count - 1 gaps, each of width
n + 1, plus one final slot for every task tied at that count. Other tasks fill
the idle slots for free. If there are more tasks than the frame holds, no idling
is ever needed and the answer is simply len(tasks).`,
    solution: `from collections import Counter


def least_interval(tasks: list[str], n: int) -> int:
    if not tasks:
        return 0

    counts = Counter(tasks)
    max_count = max(counts.values())
    ties = sum(1 for c in counts.values() if c == max_count)

    frame = (max_count - 1) * (n + 1) + ties
    return max(len(tasks), frame)`,
    complexity: {
      time: 'O(m) — one pass to count the tasks and one over the at most 26 distinct counts; no simulation.',
      space: 'O(k) — one counter entry per distinct task, so O(1) for a fixed alphabet.',
    },
    followUps: [
      'What if you must output an actual valid schedule, not just its length? Then you do need the max-heap simulation.',
      'What if different tasks have different cooldowns? The single-frame formula collapses.',
      'What if tasks arrive as a stream and the schedule must be produced online?',
    ],
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
    signal: 'A design question whose only algorithmic core is "merge k sorted feeds and take the newest ten".',
    approach: `Store each user's tweets as an append-only list, newest last, and follows as a set.
A feed is then the merge of the followees' lists, which is k sorted lists: a heap
seeded with each list's newest entry yields the ten most recent in O(k log k).
A global timestamp counter is what makes the ordering total.`,
    solution: `import heapq
from collections import defaultdict


class Twitter:
    def __init__(self) -> None:
        self._clock = 0
        self._tweets: dict[int, list[tuple[int, int]]] = defaultdict(list)  # user -> [(time, id)]
        self._following: dict[int, set[int]] = defaultdict(set)

    def post_tweet(self, user_id: int, tweet_id: int) -> None:
        self._clock += 1
        self._tweets[user_id].append((self._clock, tweet_id))

    def get_news_feed(self, user_id: int) -> list[int]:
        sources = self._following[user_id] | {user_id}
        recent = (t for u in sources for t in self._tweets[u][-10:])
        return [tweet_id for _, tweet_id in heapq.nlargest(10, recent)]

    def follow(self, follower_id: int, followee_id: int) -> None:
        if follower_id != followee_id:
            self._following[follower_id].add(followee_id)

    def unfollow(self, follower_id: int, followee_id: int) -> None:
        self._following[follower_id].discard(followee_id)`,
    complexity: {
      time: 'O(1) for post, follow and unfollow, O(k log k) for a feed — only the last 10 tweets of each of the k followees can possibly qualify.',
      space: 'O(total tweets + total follow edges) — tweets are never discarded and each edge is stored once.',
    },
    followUps: [
      'What if a user follows millions of accounts? Pull-on-read stops scaling; precompute and push into follower inboxes instead.',
      'What if celebrities have millions of followers? Fan-out on write explodes, so real systems use a hybrid of both.',
      'What if the feed must be ranked rather than purely chronological — where does the heap go?',
    ],
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
    signal: 'A running median over a stream — you need the middle, and the middle is the boundary between the small half and the large half.',
    approach: `Keep the lower half in a max-heap and the upper half in a min-heap, sized so they
differ by at most one. The median is then either the larger heap's root or the
average of both roots, in O(1). Every insert pushes into one heap and rebalances
by moving at most one element across.`,
    solution: `import heapq


class MedianFinder:
    def __init__(self) -> None:
        self._low: list[int] = []  # max-heap via negation: the smaller half
        self._high: list[int] = []  # min-heap: the larger half

    def add_num(self, num: int) -> None:
        heapq.heappush(self._low, -num)
        heapq.heappush(self._high, -heapq.heappop(self._low))  # keep order across halves
        if len(self._high) > len(self._low):
            heapq.heappush(self._low, -heapq.heappop(self._high))

    def find_median(self) -> float:
        if not self._low:
            raise ValueError("no elements yet")
        if len(self._low) > len(self._high):
            return float(-self._low[0])
        return (-self._low[0] + self._high[0]) / 2`,
    complexity: {
      time: 'O(log n) per insert, O(1) per median — the insert does two heap operations plus a rebalance, while the query only reads two roots.',
      space: 'O(n) — every value seen is retained, split across the two heaps.',
    },
    followUps: [
      'What if you only need an approximate median with bounded memory? Reservoir sampling or a t-digest.',
      'What if values must also be removed? Heaps do not support deletion; use lazy removal or a balanced BST.',
      'What if you need an arbitrary percentile rather than the 50th?',
    ],
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
    signal: 'Enumerate every combination — each element is an independent include-or-exclude decision, giving a binary decision tree of depth n.',
    approach: `Walk the elements in order; at each one branch into "take it" and "skip it", and
record the running selection whenever the recursion bottoms out. Every leaf of
that tree is one subset, so there are exactly 2^n of them and no pruning is
possible — the output size is the lower bound.`,
    solution: `def subsets(nums: list[int]) -> list[list[int]]:
    out: list[list[int]] = []
    current: list[int] = []

    def backtrack(i: int) -> None:
        if i == len(nums):
            out.append(current.copy())  # copy: current keeps mutating
            return
        current.append(nums[i])
        backtrack(i + 1)
        current.pop()
        backtrack(i + 1)

    backtrack(0)
    return out`,
    complexity: {
      time: 'O(n * 2^n) — there are 2^n subsets and copying each costs up to n.',
      space: 'O(n) — the recursion depth and working list, excluding the 2^n results returned.',
    },
    followUps: [
      'What if the input has duplicates? Sort first and skip repeated values at the same depth, which is Subsets II.',
      'What if n is 40 — is enumeration still viable, or must the question change to a count?',
      'Can you generate them iteratively by treating each integer 0..2^n-1 as a bitmask?',
    ],
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
    signal: 'Build combinations summing to a target with unlimited reuse — and order must not matter, so each branch may only look forward.',
    approach: `At each step either use the current candidate again — staying at the same index,
which is what allows reuse — or move past it forever. Never revisiting an index
once you have moved on is what prevents [2,3] and [3,2] both appearing. Prune
the branch as soon as the running sum passes the target.`,
    solution: `def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    out: list[list[int]] = []
    current: list[int] = []

    def backtrack(i: int, remaining: int) -> None:
        if remaining == 0:
            out.append(current.copy())
            return
        if i >= len(candidates) or remaining < 0:
            return
        current.append(candidates[i])
        backtrack(i, remaining - candidates[i])  # reuse the same candidate
        current.pop()
        backtrack(i + 1, remaining)  # never look at candidates[i] again

    backtrack(0, target)
    return out`,
    complexity: {
      time: 'O(n^(target / min candidate)) — the recursion tree is as deep as target divided by the smallest candidate, branching n ways.',
      space: 'O(target / min candidate) — the recursion depth and the working combination, excluding the output.',
    },
    followUps: [
      'What if each candidate may be used at most once? That is Combination Sum II, and duplicates need skipping.',
      'What if you only need the count of combinations? That is unbounded-knapsack DP in O(n * target), no enumeration.',
      'What if candidates can be negative — why does the pruning argument collapse?',
    ],
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
    signal: 'Each element usable once and the input may repeat values — the answer set must be free of duplicate combinations, not just duplicate elements.',
    approach: `Sort so equal values sit together. At each depth, take the first copy of a value
freely but skip any later copy at the same depth: choosing the second copy where
the first was skipped would rebuild a combination already generated. Advancing
the index every time enforces the use-once rule.`,
    solution: `def combination_sum2(candidates: list[int], target: int) -> list[list[int]]:
    candidates.sort()
    out: list[list[int]] = []
    current: list[int] = []

    def backtrack(start: int, remaining: int) -> None:
        if remaining == 0:
            out.append(current.copy())
            return
        for i in range(start, len(candidates)):
            if candidates[i] > remaining:
                break  # sorted, so nothing further can fit either
            if i > start and candidates[i] == candidates[i - 1]:
                continue  # skip duplicate choices at this depth
            current.append(candidates[i])
            backtrack(i + 1, remaining - candidates[i])
            current.pop()

    backtrack(0, target)
    return out`,
    complexity: {
      time: 'O(2^n) — every element is taken or not, with duplicate branches pruned and an O(n log n) sort up front.',
      space: 'O(n) — recursion depth and the working combination, excluding the output list.',
    },
    followUps: [
      'What if candidates could be reused without limit? Drop the i + 1 and the duplicate skip becomes unnecessary.',
      'What if you need combinations of exactly k elements summing to the target?',
      'Why does the skip use i > start rather than i > 0 — what breaks with the other condition?',
    ],
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
    signal: 'All orderings, not all selections — every element appears in every answer, only the arrangement changes.',
    approach: `At each position choose any element not yet used, recurse, then undo the choice.
Tracking used elements with a boolean array keeps each level O(n) instead of
scanning the partial result. There are n! outputs, so enumeration is inherently
factorial and no pruning exists for the unconstrained case.`,
    solution: `def permute(nums: list[int]) -> list[list[int]]:
    out: list[list[int]] = []
    current: list[int] = []
    used = [False] * len(nums)

    def backtrack() -> None:
        if len(current) == len(nums):
            out.append(current.copy())
            return
        for i, n in enumerate(nums):
            if used[i]:
                continue
            used[i] = True
            current.append(n)
            backtrack()
            current.pop()
            used[i] = False  # undo, or later branches see a stale state

    backtrack()
    return out`,
    complexity: {
      time: 'O(n * n!) — there are n! permutations and each costs O(n) to build and copy.',
      space: 'O(n) — the used array, the working list and the recursion depth, excluding the output.',
    },
    followUps: [
      'What if the input has duplicates? Sort and skip equal values whose predecessor is unused, or you emit repeats.',
      'What if you need only the k-th permutation in lexicographic order? Factorial number system, no enumeration.',
      'What if you must generate the next permutation in place from a given one?',
    ],
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
    signal: 'Subsets from an input containing repeated values, with no repeated subsets in the answer — dedup has to happen during generation.',
    approach: `Generating all 2^n subsets and filtering with a set costs the full exponential
work plus hashing. Sort instead, and at each depth skip any value equal to the
one just considered at that same depth: the branch it would open was already
explored by its first copy.`,
    solution: `def subsets_with_dup(nums: list[int]) -> list[list[int]]:
    nums.sort()
    out: list[list[int]] = []
    current: list[int] = []

    def backtrack(start: int) -> None:
        out.append(current.copy())
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i - 1]:
                continue  # this value already opened a branch at this depth
            current.append(nums[i])
            backtrack(i + 1)
            current.pop()

    backtrack(0)
    return out`,
    complexity: {
      time: 'O(n * 2^n) worst case — distinct inputs still yield 2^n subsets, each costing O(n) to copy; duplicates only reduce it.',
      space: 'O(n) — recursion depth and the working subset, excluding the returned list.',
    },
    followUps: [
      'What if duplicates should produce distinct subsets by position rather than by value?',
      'What if you only need the count of distinct subsets? Multiply (count + 1) over the distinct values.',
      'Why is sorting mandatory here — what goes wrong if the equal values are not adjacent?',
    ],
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
    signal: 'A path through a grid where cells cannot be reused within one path — that is DFS with an undo, not a visited set that persists.',
    approach: `From every cell that matches the first letter, walk in four directions matching
successive letters. Mark the cell as in-use before recursing and unmark it after,
because a cell blocked on this path must be free for a different one. Mismatches
prune immediately, which is what keeps it tractable.`,
    solution: `def exist(board: list[list[str]], word: str) -> bool:
    if not word:
        return True
    if not board or not board[0]:
        return False

    rows, cols = len(board), len(board[0])

    def dfs(r: int, c: int, i: int) -> bool:
        if i == len(word):
            return True
        if not (0 <= r < rows and 0 <= c < cols) or board[r][c] != word[i]:
            return False

        board[r][c] = "\\0"  # mark in use for this path only
        found = (
            dfs(r + 1, c, i + 1)
            or dfs(r - 1, c, i + 1)
            or dfs(r, c + 1, i + 1)
            or dfs(r, c - 1, i + 1)
        )
        board[r][c] = word[i]  # undo
        return found

    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))`,
    complexity: {
      time: 'O(rows * cols * 3^len(word)) — each of the cells may start a search that branches three ways after the first step.',
      space: 'O(len(word)) — the recursion depth; marking happens in the board itself, so no visited set is allocated.',
    },
    followUps: [
      'What if you must find many words at once? Build a trie of the words and walk the grid once — that is Word Search II.',
      'What if diagonal moves are allowed? The branching factor rises from 3 to 7.',
      'What if the board must not be mutated — what does a separate visited set cost?',
    ],
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
    signal: 'Split a string every possible way subject to a per-piece predicate — the cut positions are the decision tree.',
    approach: `At each position try every prefix that is a palindrome, recurse on the rest, then
backtrack. The palindrome test prunes whole subtrees early, which is the only
thing keeping this below pure 2^(n-1) enumeration of cut sets. Precomputing an
is-palindrome table makes each test O(1) instead of O(n).`,
    solution: `def partition(s: str) -> list[list[str]]:
    out: list[list[str]] = []
    current: list[str] = []

    def is_palindrome(lo: int, hi: int) -> bool:
        while lo < hi:
            if s[lo] != s[hi]:
                return False
            lo, hi = lo + 1, hi - 1
        return True

    def backtrack(start: int) -> None:
        if start == len(s):
            out.append(current.copy())
            return
        for end in range(start, len(s)):
            if is_palindrome(start, end):
                current.append(s[start : end + 1])
                backtrack(end + 1)
                current.pop()

    backtrack(0)
    return out`,
    complexity: {
      time: 'O(n * 2^n) — up to 2^(n-1) cut sets, each verified and copied in O(n).',
      space: 'O(n) — recursion depth and the working partition, excluding the output.',
    },
    followUps: [
      'What if you only need the minimum number of cuts? That is DP in O(n^2), not enumeration.',
      'What if the pieces must instead all be distinct, or all be a fixed length?',
      'How much does a precomputed n by n palindrome table actually save here?',
    ],
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
    signal: 'One choice per input position, drawn from a fixed set — the Cartesian product, which is a fixed-depth decision tree.',
    approach: `Each digit contributes one letter to every output, so the tree has depth len(digits)
and branches by that digit's letter count. Recurse position by position; there
is nothing to prune because every leaf is valid. The empty input is the classic
trap: it should yield no combinations, not one empty string.`,
    solution: `def letter_combinations(digits: str) -> list[str]:
    if not digits:
        return []

    keypad = {
        "2": "abc", "3": "def", "4": "ghi", "5": "jkl",
        "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz",
    }

    out: list[str] = []
    current: list[str] = []

    def backtrack(i: int) -> None:
        if i == len(digits):
            out.append("".join(current))
            return
        for letter in keypad[digits[i]]:
            current.append(letter)
            backtrack(i + 1)
            current.pop()

    backtrack(0)
    return out`,
    complexity: {
      time: 'O(n * 4^n) — at most four letters per digit gives up to 4^n leaves, each costing O(n) to join.',
      space: 'O(n) — the recursion depth and the working buffer, excluding the returned list.',
    },
    followUps: [
      'What if you must return only combinations that are real dictionary words? Prune with a trie mid-recursion.',
      'What if digits 0 and 1 appear — is that an error, a skip, or a literal?',
      'What if the result is huge and should be a generator rather than a list?',
    ],
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
    signal: 'Place items under mutual-exclusion constraints — the constraints are checkable incrementally, so illegal branches die early.',
    approach: `Place one queen per row, so rows can never clash by construction. Track the used
columns and the two diagonal families — row + col is constant on one diagonal,
row - col on the other — as sets, making each legality test O(1). Backtracking
with those three sets prunes the vast majority of the n^n placements.`,
    solution: `def solve_n_queens(n: int) -> list[list[str]]:
    out: list[list[str]] = []
    cols: set[int] = set()
    diag: set[int] = set()  # row + col is constant down-right
    anti: set[int] = set()  # row - col is constant down-left
    placement: list[int] = []

    def backtrack(row: int) -> None:
        if row == n:
            out.append(["." * c + "Q" + "." * (n - c - 1) for c in placement])
            return
        for col in range(n):
            if col in cols or (row + col) in diag or (row - col) in anti:
                continue
            cols.add(col)
            diag.add(row + col)
            anti.add(row - col)
            placement.append(col)
            backtrack(row + 1)
            placement.pop()
            anti.discard(row - col)
            diag.discard(row + col)
            cols.discard(col)

    backtrack(0)
    return out`,
    complexity: {
      time: 'O(n!) in the worst case — row r has at most n - r legal columns, and the three sets make each check O(1).',
      space: 'O(n) — three sets and the placement list all hold at most one entry per row, excluding the output.',
    },
    followUps: [
      'What if you only need the count of solutions? Drop the board construction; bitmasks then make it dramatically faster.',
      'What if n is 30 — is exact enumeration still possible, or do you switch to a constructive heuristic?',
      'What if the board has pre-placed queens or forbidden squares?',
    ],
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
    signal: 'Prefix queries over a set of words — a hash set can answer "is this a word" but never "does any word start with this".',
    approach: `Store one node per character position, with children keyed by the next character
and a flag marking the end of a complete word. Lookup and insert both walk the
string once, independent of how many words are stored. That prefix sharing is
what a hash set cannot give you.`,
    solution: `class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True

    def _walk(self, prefix: str) -> TrieNode | None:
        node = self.root
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:
                return None
        return node

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and node.is_word

    def starts_with(self, prefix: str) -> bool:
        return self._walk(prefix) is not None`,
    complexity: {
      time: 'O(len(word)) per operation — one dict step per character, with no dependence on the number of stored words.',
      space: 'O(total characters) — shared prefixes are stored once, so it is at most the sum of word lengths.',
    },
    followUps: [
      'What if memory is tight? A radix tree collapses single-child chains; a DAWG also shares suffixes.',
      'What if you must support deletion? Refcount each node or prune empty branches on the way back up.',
      'What if you need autocomplete ranked by popularity — where does the score live?',
    ],
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
    signal: 'Exact lookup plus a single-character wildcard — the wildcard forks the search, which only a tree structure survives.',
    approach: `Insertion is an ordinary trie insert. Search walks the trie, but a '.' must try
every child, so the walk becomes a DFS with branching. Non-wildcard characters
still narrow to one child, so the branching is confined to the wildcard
positions rather than the whole word.`,
    solution: `class WordNode:
    def __init__(self) -> None:
        self.children: dict[str, "WordNode"] = {}
        self.is_word = False


class WordDictionary:
    def __init__(self) -> None:
        self.root = WordNode()

    def add_word(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, WordNode())
        node.is_word = True

    def search(self, word: str) -> bool:
        def dfs(node: WordNode, i: int) -> bool:
            if i == len(word):
                return node.is_word
            ch = word[i]
            if ch == ".":
                return any(dfs(child, i + 1) for child in node.children.values())
            child = node.children.get(ch)
            return child is not None and dfs(child, i + 1)

        return dfs(self.root, 0)`,
    complexity: {
      time: 'O(len(word)) with no wildcards, O(26^w * len(word)) worst case — each of the w dots forks the walk into every child.',
      space: 'O(total characters) — the trie itself, plus O(len(word)) recursion depth during a search.',
    },
    followUps: [
      'What if \'*\' matching any number of characters were allowed? The DFS must also try consuming zero characters.',
      'What if a leading wildcard is common? Index suffixes too, or the fork happens at the root every time.',
      'What if the dictionary is enormous — how do you keep the trie off the heap?',
    ],
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
    signal: 'Many words to find in one grid — searching each word separately repeats the same prefix walks over and over.',
    approach: `Put all the words in a trie, then DFS the grid once carrying a trie node instead
of a word index. A cell whose character has no child in the trie kills every
word sharing that prefix at once. Pruning found words out of the trie stops the
search revisiting them.`,
    solution: `class GridNode:
    def __init__(self) -> None:
        self.children: dict[str, "GridNode"] = {}
        self.word: str | None = None


def find_words(board: list[list[str]], words: list[str]) -> list[str]:
    if not board or not board[0]:
        return []

    root = GridNode()
    for word in words:
        node = root
        for ch in word:
            node = node.children.setdefault(ch, GridNode())
        node.word = word

    rows, cols = len(board), len(board[0])
    found: list[str] = []

    def dfs(r: int, c: int, node: GridNode) -> None:
        if not (0 <= r < rows and 0 <= c < cols):
            return
        ch = board[r][c]
        child = node.children.get(ch)
        if child is None:
            return
        if child.word is not None:
            found.append(child.word)
            child.word = None  # do not report it twice

        board[r][c] = "\\0"
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            dfs(r + dr, c + dc, child)
        board[r][c] = ch

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root)

    return found`,
    complexity: {
      time: 'O(rows * cols * 4 * 3^(L-1)) where L is the longest word — the trie collapses all words into one walk instead of one per word.',
      space: 'O(total characters in words) — the trie stores every word once with prefixes shared, plus O(L) recursion depth.',
    },
    followUps: [
      'What if a found word should be prunable from the trie entirely, not just unmarked? Delete childless nodes on the way back up.',
      'What if there are a million words but a tiny grid — which side should drive the search?',
      'What if words may reuse a cell? The whole in-use marking disappears and the search may not terminate.',
    ],
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
    signal: 'Count connected regions in a grid — every cell is a node and adjacency is the edge set, so this is connected components.',
    approach: `Scan the grid; each unvisited land cell starts a new island, and a flood fill from
it consumes the whole component so it is never counted again. Sinking visited
land by overwriting it avoids a separate visited structure. BFS or union-find
give the same count.`,
    solution: `def num_islands(grid: list[list[str]]) -> int:
    if not grid or not grid[0]:
        return 0

    rows, cols = len(grid), len(grid[0])
    count = 0

    def sink(r: int, c: int) -> None:
        stack = [(r, c)]
        while stack:
            cr, cc = stack.pop()
            if not (0 <= cr < rows and 0 <= cc < cols) or grid[cr][cc] != "1":
                continue
            grid[cr][cc] = "0"  # sink it, so it is never counted again
            stack.extend([(cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)])

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                count += 1
                sink(r, c)

    return count`,
    complexity: {
      time: 'O(rows * cols) — every cell is examined once by the scan and sunk at most once by a flood fill.',
      space: 'O(rows * cols) — the explicit stack, in the worst case where the whole grid is one island.',
    },
    followUps: [
      'What if land is added one cell at a time and the count must stay current? Union-find with a running component count.',
      'What if the grid is too large for memory? Process in stripes and union the components that touch the seam.',
      'What if diagonal adjacency counts as connected — which line changes?',
    ],
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
    signal: 'Same connected-components sweep as counting islands, but each component must be measured rather than merely counted.',
    approach: `Flood fill from every unvisited land cell as before, except the fill returns the
number of cells it consumed. Take the maximum over all components. Sinking as
you go keeps each cell in exactly one component, so the total work stays linear
in the grid size.`,
    solution: `def max_area_of_island(grid: list[list[int]]) -> int:
    if not grid or not grid[0]:
        return 0

    rows, cols = len(grid), len(grid[0])

    def fill(r: int, c: int) -> int:
        stack = [(r, c)]
        area = 0
        while stack:
            cr, cc = stack.pop()
            if not (0 <= cr < rows and 0 <= cc < cols) or grid[cr][cc] != 1:
                continue
            grid[cr][cc] = 0
            area += 1
            stack.extend([(cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)])
        return area

    return max(
        (fill(r, c) for r in range(rows) for c in range(cols) if grid[r][c] == 1),
        default=0,
    )`,
    complexity: {
      time: 'O(rows * cols) — each cell is pushed and popped a bounded number of times across all fills.',
      space: 'O(rows * cols) — the stack, when the entire grid is a single island.',
    },
    followUps: [
      'What if you may flip one water cell to land to maximise an island? You must keep per-component areas, not just the best.',
      'What if the grid must not be mutated? A visited set costs the same order but real extra memory.',
      'What if you need the areas of all islands sorted, not just the largest?',
    ],
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
    signal: 'Deep copy a cyclic structure — plain recursion would loop forever, so you need a map from original to clone as the visited marker.',
    approach: `Create a clone the first time a node is seen and record it in a dict immediately,
before recursing into neighbours. That entry doubles as the visited set, so a
cycle finds the existing clone instead of recursing again. Then link each
clone's neighbours through the same map.`,
    solution: `class Node:
    def __init__(self, val: int = 0, neighbors: "list[Node] | None" = None) -> None:
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []


def clone_graph(node: Node | None) -> Node | None:
    if node is None:
        return None

    clones: dict[Node, Node] = {}

    def dfs(current: Node) -> Node:
        if current in clones:
            return clones[current]
        copy = Node(current.val)
        clones[current] = copy  # register before recursing, or cycles never terminate
        copy.neighbors = [dfs(n) for n in current.neighbors]
        return copy

    return dfs(node)`,
    complexity: {
      time: 'O(V + E) — each node is cloned once and each edge is traversed once.',
      space: 'O(V) — the clone map plus recursion depth, which can be the whole graph on a chain.',
    },
    followUps: [
      'What if the graph is disconnected? You are only given one node, so unreachable components cannot be cloned.',
      'What if it is directed with weights — does the map trick change at all?',
      'What if the graph is too deep for recursion? The same map works with an explicit stack.',
    ],
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
    signal: 'Shortest distance from every cell to the nearest of several sources — run one BFS from all sources at once, not one per source.',
    approach: `A BFS from each gate would be O(gates * cells). Instead seed the queue with every
gate at distance zero: the wavefront expands from all of them simultaneously, so
the first time a room is reached it is by its nearest gate. Writing the distance
on arrival doubles as the visited marker.`,
    solution: `from collections import deque

INF = 2**31 - 1


def walls_and_gates(rooms: list[list[int]]) -> None:
    if not rooms or not rooms[0]:
        return

    rows, cols = len(rooms), len(rooms[0])
    queue = deque(
        (r, c) for r in range(rows) for c in range(cols) if rooms[r][c] == 0
    )

    while queue:
        r, c = queue.popleft()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and rooms[nr][nc] == INF:
                rooms[nr][nc] = rooms[r][c] + 1
                queue.append((nr, nc))`,
    complexity: {
      time: 'O(rows * cols) — multi-source BFS visits each cell once regardless of how many gates there are.',
      space: 'O(rows * cols) — the queue, which can hold a whole wavefront.',
    },
    followUps: [
      'What if you also need which gate is nearest, not just how far? Carry the source id along the wavefront.',
      'What if moves had different costs? BFS no longer suffices; you need Dijkstra with a priority queue.',
      'What if gates are added over time — can you update incrementally instead of rerunning?',
    ],
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
    signal: 'Something spreads to neighbours one time-step at a time — the answer is a number of rounds, which is BFS depth.',
    approach: `Seed a queue with every already-rotten orange and expand level by level, each
level being one minute. Count the fresh oranges up front so you can tell at the
end whether any were unreachable. The number of levels processed is the answer;
DFS would give a wrong time because it does not expand uniformly.`,
    solution: `from collections import deque


def oranges_rotting(grid: list[list[int]]) -> int:
    if not grid or not grid[0]:
        return 0

    rows, cols = len(grid), len(grid[0])
    queue = deque()
    fresh = 0

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                queue.append((r, c))
            elif grid[r][c] == 1:
                fresh += 1

    minutes = 0
    while queue and fresh:
        for _ in range(len(queue)):  # one full minute per level
            r, c = queue.popleft()
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    queue.append((nr, nc))
        minutes += 1

    return -1 if fresh else minutes`,
    complexity: {
      time: 'O(rows * cols) — each cell is enqueued at most once and its four neighbours checked once.',
      space: 'O(rows * cols) — the queue holds at most one wavefront, which can be the whole grid.',
    },
    followUps: [
      'What if rotting spreads diagonally too, or at different rates per direction?',
      'What if you must report which oranges can never rot, not just that some cannot?',
      'What if the grid is 3D — does anything but the neighbour list change?',
    ],
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
    signal: 'Cells that can reach two different destinations — invert the question and flood inward from each destination, then intersect.',
    approach: `Testing every cell's downhill path separately repeats enormous amounts of work.
Instead start at each ocean's border and walk uphill — the reverse of the flow —
marking everything reachable. Two such sweeps give two reachable sets, and the
answer is their intersection.`,
    solution: `def pacific_atlantic(heights: list[list[int]]) -> list[list[int]]:
    if not heights or not heights[0]:
        return []

    rows, cols = len(heights), len(heights[0])

    def flood(starts: list[tuple[int, int]]) -> set[tuple[int, int]]:
        seen: set[tuple[int, int]] = set()
        stack = list(starts)
        while stack:
            r, c = stack.pop()
            if (r, c) in seen:
                continue
            seen.add((r, c))
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr, nc = r + dr, c + dc
                if (
                    0 <= nr < rows
                    and 0 <= nc < cols
                    and (nr, nc) not in seen
                    and heights[nr][nc] >= heights[r][c]  # walk uphill, against the flow
                ):
                    stack.append((nr, nc))
        return seen

    pacific = flood(
        [(0, c) for c in range(cols)] + [(r, 0) for r in range(rows)]
    )
    atlantic = flood(
        [(rows - 1, c) for c in range(cols)] + [(r, cols - 1) for r in range(rows)]
    )

    return [list(cell) for cell in pacific & atlantic]`,
    complexity: {
      time: 'O(rows * cols) — two floods, each visiting every cell at most once thanks to the seen set.',
      space: 'O(rows * cols) — the two reachable sets and the traversal stack.',
    },
    followUps: [
      'What if there were three oceans? The intersection generalises, but each extra sweep costs another full pass.',
      'What if water may only flow strictly downhill? The >= becomes >, and plateaus stop conducting.',
      'What if you need the count of such cells only — can you avoid materialising both sets?',
    ],
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
    signal: 'Regions are captured unless they touch the border — so the cheap move is to mark what survives, not to hunt for what is enclosed.',
    approach: `Detecting enclosure directly means proving a negative for every region. Invert it:
flood from every border 'O' and mark those cells safe. Everything still marked
'O' afterwards is by definition enclosed and flips; the safe marks are then
restored.`,
    solution: `def solve_surrounded(board: list[list[str]]) -> None:
    if not board or not board[0]:
        return

    rows, cols = len(board), len(board[0])

    def mark_safe(r: int, c: int) -> None:
        stack = [(r, c)]
        while stack:
            cr, cc = stack.pop()
            if not (0 <= cr < rows and 0 <= cc < cols) or board[cr][cc] != "O":
                continue
            board[cr][cc] = "S"  # reachable from the border, so it survives
            stack.extend([(cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)])

    for r in range(rows):
        mark_safe(r, 0)
        mark_safe(r, cols - 1)
    for c in range(cols):
        mark_safe(0, c)
        mark_safe(rows - 1, c)

    for r in range(rows):
        for c in range(cols):
            board[r][c] = "O" if board[r][c] == "S" else "X"`,
    complexity: {
      time: 'O(rows * cols) — border floods visit each cell at most once, then one final pass rewrites the board.',
      space: 'O(rows * cols) — the flood stack in the worst case; the marking itself is done in place.',
    },
    followUps: [
      'What if you must report the enclosed regions rather than flip them? Keep component ids during the sweep.',
      'What if the board is streamed row by row? Union-find over the seam is the standard trick.',
      'Why is marking survivors easier than detecting enclosure directly?',
    ],
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
    signal: 'Prerequisites that must be satisfiable — a directed graph where the only obstacle is a cycle.',
    approach: `The schedule is possible exactly when the prerequisite graph is acyclic. Kahn's
algorithm repeatedly removes a node with no remaining prerequisites; if it can
remove all n, there was no cycle. Whatever it cannot remove is stuck inside one,
which is also the useful diagnostic to report.`,
    solution: `from collections import defaultdict, deque


def can_finish(num_courses: int, prerequisites: list[list[int]]) -> bool:
    graph: dict[int, list[int]] = defaultdict(list)
    indegree = [0] * num_courses

    for course, prereq in prerequisites:
        graph[prereq].append(course)
        indegree[course] += 1

    queue = deque(c for c in range(num_courses) if indegree[c] == 0)
    taken = 0

    while queue:
        course = queue.popleft()
        taken += 1
        for nxt in graph[course]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)

    return taken == num_courses`,
    complexity: {
      time: 'O(V + E) — every course is enqueued once and every prerequisite edge is relaxed once.',
      space: 'O(V + E) — the adjacency lists, the indegree array and the queue.',
    },
    followUps: [
      'What if you must output a valid order? That is Course Schedule II; record the pop order.',
      'What if you must name the courses inside the cycle? Kahn tells you which remain; DFS colouring finds the cycle itself.',
      'What if prerequisites arrive incrementally and each addition must be checked?',
    ],
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
    signal: 'Produce an order respecting dependencies — a topological sort, with a cycle meaning no order exists.',
    approach: `Same Kahn's algorithm as the yes-or-no version, except you record the order in
which nodes are removed. Every node emitted had all its prerequisites already
emitted, so the sequence is valid. If fewer than n nodes come out, a cycle
blocked the rest and there is no answer at all.`,
    solution: `from collections import defaultdict, deque


def find_order(num_courses: int, prerequisites: list[list[int]]) -> list[int]:
    graph: dict[int, list[int]] = defaultdict(list)
    indegree = [0] * num_courses

    for course, prereq in prerequisites:
        graph[prereq].append(course)
        indegree[course] += 1

    queue = deque(c for c in range(num_courses) if indegree[c] == 0)
    order: list[int] = []

    while queue:
        course = queue.popleft()
        order.append(course)
        for nxt in graph[course]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)

    return order if len(order) == num_courses else []`,
    complexity: {
      time: 'O(V + E) — one enqueue and one dequeue per course, one decrement per prerequisite edge.',
      space: 'O(V + E) — adjacency lists, indegrees, queue and the emitted order.',
    },
    followUps: [
      'What if the order must be lexicographically smallest? Swap the queue for a min-heap, at O(V log V + E).',
      'What if courses can be taken in parallel and you want the minimum number of semesters? Count BFS levels.',
      'What if the graph is enormous — can a DFS post-order topological sort use less memory?',
    ],
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
    signal: '"Is this a tree" — two conditions at once: exactly n-1 edges and fully connected, which together forbid cycles.',
    approach: `A tree on n nodes has exactly n-1 edges and is connected; either property alone is
not enough. Check the edge count first, in O(1), then confirm one traversal
reaches every node. With the count already right, connectivity implies
acyclicity, so no separate cycle check is needed.`,
    solution: `from collections import defaultdict


def valid_tree(n: int, edges: list[list[int]]) -> bool:
    if n == 0:
        return False
    if len(edges) != n - 1:  # too few cannot connect, too many must cycle
        return False

    graph: dict[int, list[int]] = defaultdict(list)
    for a, b in edges:
        graph[a].append(b)
        graph[b].append(a)

    seen = {0}
    stack = [0]
    while stack:
        node = stack.pop()
        for neighbour in graph[node]:
            if neighbour not in seen:
                seen.add(neighbour)
                stack.append(neighbour)

    return len(seen) == n`,
    complexity: {
      time: 'O(V + E) — building the adjacency lists and one traversal that touches each node and edge once.',
      space: 'O(V + E) — the adjacency lists plus the seen set and the stack.',
    },
    followUps: [
      'What if self-loops or duplicate edges can appear? The edge count check passes but the traversal quietly hides them.',
      'What if edges arrive one at a time? Union-find rejects the first edge joining two already-connected nodes.',
      'What if the graph is directed — what is the right definition of a tree then?',
    ],
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
    signal: 'Count components in an edge list — either a traversal per unvisited node, or union-find if edges keep arriving.',
    approach: `Start with n components and union the endpoints of each edge; every union that
actually merges two different sets reduces the count by one. Union-find with
path compression and union by size makes each operation effectively constant,
and unlike DFS it handles edges arriving online.`,
    solution: `def count_components(n: int, edges: list[list[int]]) -> int:
    parent = list(range(n))
    size = [1] * n
    components = n

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]  # path compression
            x = parent[x]
        return x

    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra == rb:
            continue  # already together, no component disappears
        if size[ra] < size[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        size[ra] += size[rb]
        components -= 1

    return components`,
    complexity: {
      time: 'O(E * alpha(n)) — path compression with union by size makes each find and union effectively constant.',
      space: 'O(n) — the parent and size arrays; no adjacency lists are built at all.',
    },
    followUps: [
      'What if edges can also be removed? Union-find cannot undo; you need a link-cut tree or offline processing.',
      'What if you need the size of each component? It is already in the size array at each root.',
      'What if the graph is directed — does connectivity still mean the same thing?',
    ],
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
    signal: 'A tree plus one extra edge — the culprit is the first edge whose endpoints are already connected.',
    approach: `Process the edges in order, unioning endpoints as you go. Every edge that joins
two separate components is legitimate; the first that joins two nodes already in
the same set is the one closing the cycle. Because the input is a tree plus one
edge, that first offender is the answer.`,
    solution: `def find_redundant_connection(edges: list[list[int]]) -> list[int]:
    nodes = max((max(a, b) for a, b in edges), default=0) + 1
    parent = list(range(nodes))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra == rb:
            return [a, b]  # both ends already connected: this edge closes the cycle
        parent[rb] = ra

    return []`,
    complexity: {
      time: 'O(n * alpha(n)) — one find pair and at most one union per edge, each effectively constant with path compression.',
      space: 'O(n) — the parent array, one slot per node.',
    },
    followUps: [
      'What if the graph is directed? A node can have two parents, so union-find alone no longer identifies the right edge.',
      'What if several extra edges were added and all must be found?',
      'What if the answer had to be the edge that appears earliest rather than last — does the scan direction matter?',
    ],
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
    signal: 'Shortest transformation sequence with unit-cost steps — that is BFS on an implicit graph you never build.',
    approach: `Words are nodes and one-letter changes are edges. Building the graph by comparing
every pair is O(n^2 * L); instead generate each word's neighbours by trying all
26 letters at each position and testing membership in the word set, which is
O(26 * L). BFS then gives the shortest ladder.`,
    solution: `from collections import deque
from string import ascii_lowercase


def ladder_length(begin_word: str, end_word: str, word_list: list[str]) -> int:
    words = set(word_list)
    if end_word not in words:
        return 0

    queue = deque([(begin_word, 1)])
    words.discard(begin_word)

    while queue:
        word, steps = queue.popleft()
        if word == end_word:
            return steps
        for i in range(len(word)):
            for letter in ascii_lowercase:
                candidate = word[:i] + letter + word[i + 1 :]
                if candidate in words:
                    words.remove(candidate)  # first arrival is the shortest
                    queue.append((candidate, steps + 1))

    return 0`,
    complexity: {
      time: 'O(n * L * 26) — each of the n words is expanded once, generating 26 candidates per position of length L.',
      space: 'O(n * L) — the word set plus the BFS queue, both linear in the dictionary.',
    },
    followUps: [
      'What if you must return every shortest ladder? BFS to build a parent DAG, then DFS back through it.',
      'What if the dictionary is huge? Bidirectional BFS from both ends roughly square-roots the frontier.',
      'What if words have different lengths, so insertions and deletions are allowed too?',
    ],
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
    signal: 'Use every edge exactly once — that is an Eulerian path, not a shortest path, so ordinary DFS with backtracking is the wrong tool.',
    approach: `Greedily always take the smallest unused destination, and append a node to the
route only once it has no edges left. That post-order append is what makes it
correct: a dead end reached early is the tail of the itinerary, not a failure.
Reversing the collected order yields the Eulerian path.`,
    solution: `from collections import defaultdict


def find_itinerary(tickets: list[list[str]]) -> list[str]:
    if not tickets:
        return []

    graph: dict[str, list[str]] = defaultdict(list)
    for src, dst in sorted(tickets, reverse=True):
        graph[src].append(dst)  # reverse-sorted so pop() takes the smallest

    route: list[str] = []
    stack = ["JFK"]

    while stack:
        while graph[stack[-1]]:
            stack.append(graph[stack[-1]].pop())
        route.append(stack.pop())  # no edges left: this is a tail of the route

    return route[::-1]`,
    complexity: {
      time: 'O(E log E) — the sort dominates; Hierholzer\'s traversal itself uses each of the E edges exactly once.',
      space: 'O(E) — the adjacency lists, the stack and the route all hold at most one entry per ticket.',
    },
    followUps: [
      'What if no valid itinerary exists? The route comes back shorter than E + 1 nodes, which is the check to add.',
      'What if you must visit every airport once instead of every ticket once? That is Hamiltonian and NP-hard.',
      'Why does plain lexicographic DFS with backtracking blow up, and where exactly does it waste time?',
    ],
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
    signal: 'Connect everything at minimum total cost with no requirement on path lengths — a minimum spanning tree, not a shortest-path tree.',
    approach: `The graph is complete, with Manhattan distance as the weight, so listing all
O(n^2) edges for Kruskal is wasteful. Prim's algorithm grows one tree, repeatedly
taking the cheapest edge leaving it, which suits dense graphs. A heap of
candidate edges makes each extraction logarithmic.`,
    solution: `import heapq


def min_cost_connect_points(points: list[list[int]]) -> int:
    n = len(points)
    if n <= 1:
        return 0

    visited = [False] * n
    heap: list[tuple[int, int]] = [(0, 0)]  # (cost to reach, node)
    total = 0
    used = 0

    while used < n:
        cost, node = heapq.heappop(heap)
        if visited[node]:
            continue  # stale entry from before this node was reached
        visited[node] = True
        total += cost
        used += 1
        x1, y1 = points[node]
        for other in range(n):
            if not visited[other]:
                x2, y2 = points[other]
                heapq.heappush(heap, (abs(x1 - x2) + abs(y1 - y2), other))

    return total`,
    complexity: {
      time: 'O(n^2 log n) — each of the n extractions pushes up to n candidate edges onto the heap.',
      space: 'O(n^2) — the heap can hold one entry per unvisited node per extraction before stale ones are discarded.',
    },
    followUps: [
      'What if the graph is sparse and given as an edge list? Kruskal with union-find is O(E log E) and usually wins.',
      'What if one edge\'s weight changes? Recomputing is wasteful; MST-sensitivity analysis updates it locally.',
      'What if you need the second-best spanning tree, or the tree itself rather than its cost?',
    ],
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
    signal: 'Shortest paths from one source with non-negative weights, and the answer is the worst of them — Dijkstra, then take the maximum.',
    approach: `BFS is wrong because edges have weights. Dijkstra settles nodes in increasing
distance order using a min-heap, so the first time a node is popped its distance
is final. The signal reaches everyone at the moment the last node settles, so
the answer is the largest settled distance — or -1 if any node is unreachable.`,
    solution: `import heapq
from collections import defaultdict


def network_delay_time(times: list[list[int]], n: int, k: int) -> int:
    graph: dict[int, list[tuple[int, int]]] = defaultdict(list)
    for u, v, w in times:
        graph[u].append((v, w))

    settled: dict[int, int] = {}
    heap: list[tuple[int, int]] = [(0, k)]

    while heap:
        dist, node = heapq.heappop(heap)
        if node in settled:
            continue  # already settled with a shorter distance
        settled[node] = dist
        for nxt, weight in graph[node]:
            if nxt not in settled:
                heapq.heappush(heap, (dist + weight, nxt))

    return max(settled.values()) if len(settled) == n else -1`,
    complexity: {
      time: 'O(E log V) — every edge may push one heap entry, and each pop costs log of the heap size.',
      space: 'O(V + E) — the adjacency lists, the settled map and the heap.',
    },
    followUps: [
      'What if some weights are negative? Dijkstra\'s settled-once invariant breaks; use Bellman-Ford.',
      'What if you need all-pairs delays? Floyd-Warshall at O(V^3), or Dijkstra from every source.',
      'What if the network changes constantly — is recomputing from scratch each time acceptable?',
    ],
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
    signal: 'Minimise the maximum value along a path, not the sum — a bottleneck shortest path, which Dijkstra solves with max in place of plus.',
    approach: `The cost of a path is the highest cell on it, so relaxation takes the maximum of
the current cost and the next cell rather than the sum. Dijkstra then settles
cells in increasing bottleneck order and the first arrival at the corner is the
answer. Binary searching the water level plus a flood fill also works.`,
    solution: `import heapq


def swim_in_water(grid: list[list[int]]) -> int:
    if not grid or not grid[0]:
        return 0

    n, m = len(grid), len(grid[0])
    seen = {(0, 0)}
    heap: list[tuple[int, int, int]] = [(grid[0][0], 0, 0)]

    while heap:
        level, r, c = heapq.heappop(heap)
        if (r, c) == (n - 1, m - 1):
            return level
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < n and 0 <= nc < m and (nr, nc) not in seen:
                seen.add((nr, nc))
                # bottleneck: the cost of a path is its highest cell, not the sum
                heapq.heappush(heap, (max(level, grid[nr][nc]), nr, nc))

    return -1`,
    complexity: {
      time: 'O(n^2 log n) — each of the n^2 cells is pushed once and each heap operation costs log(n^2).',
      space: 'O(n^2) — the seen set and the heap, both bounded by the number of cells.',
    },
    followUps: [
      'What if you binary search the water level instead? Each guess costs one O(n^2) flood fill, giving O(n^2 log(max)).',
      'What if the cost were the sum of elevations? Then it is ordinary Dijkstra, and max becomes plus.',
      'What if you must also report the path, not just the time?',
    ],
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
    signal: 'Infer a total order from sorted examples — consecutive words give pairwise constraints, which is a topological sort.',
    approach: `Two adjacent words differ first at one character position, and that single pair is
the only ordering fact they carry. Collect those edges and topologically sort.
Two traps: a cycle means the input is inconsistent, and a longer word preceding
its own prefix is impossible, not merely unordered.`,
    solution: `from collections import defaultdict, deque


def alien_order(words: list[str]) -> str:
    graph: dict[str, set[str]] = {ch: set() for word in words for ch in word}
    indegree = {ch: 0 for ch in graph}

    for first, second in zip(words, words[1:]):
        for a, b in zip(first, second):
            if a != b:
                if b not in graph[a]:
                    graph[a].add(b)
                    indegree[b] += 1
                break
        else:
            if len(first) > len(second):
                return ""  # a word cannot precede its own prefix

    queue = deque(sorted(ch for ch in indegree if indegree[ch] == 0))
    order: list[str] = []

    while queue:
        ch = queue.popleft()
        order.append(ch)
        for nxt in sorted(graph[ch]):
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)

    return "".join(order) if len(order) == len(graph) else ""`,
    complexity: {
      time: 'O(C + V log V) where C is the total characters — each adjacent pair yields at most one edge, and the sorted queue adds the log factor.',
      space: 'O(V + E) — at most one node per distinct letter and one edge per adjacent word pair.',
    },
    followUps: [
      'What if several valid orders exist? Any topological order is correct, so the answer is not unique.',
      'What if the alphabet is only partially constrained — should unconstrained letters be omitted or appended?',
      'What if the word list is a stream and constraints keep arriving — can the order be maintained incrementally?',
    ],
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
    signal: 'Cheapest path with a cap on the number of edges — the hop limit breaks Dijkstra\'s settled-once invariant.',
    approach: `Dijkstra can settle a node cheaply via a long path and then refuse a pricier route
that would have left hops to spare. Bellman-Ford relaxes all edges exactly
k+1 times instead, so after round i the distances use at most i edges. Relaxing
from a snapshot of the previous round is what enforces the hop cap.`,
    solution: `def find_cheapest_price(n: int, flights: list[list[int]], src: int, dst: int, k: int) -> int:
    INF = float("inf")
    cost = [INF] * n
    cost[src] = 0

    for _ in range(k + 1):  # k stops means at most k + 1 edges
        snapshot = cost[:]  # relax from the previous round only
        for u, v, price in flights:
            if snapshot[u] + price < cost[v]:
                cost[v] = snapshot[u] + price

    return -1 if cost[dst] == INF else int(cost[dst])`,
    complexity: {
      time: 'O(k * E) — k + 1 relaxation rounds, each sweeping every flight once.',
      space: 'O(n) — one distance array plus the per-round snapshot; the flight list is not copied.',
    },
    followUps: [
      'Why does plain Dijkstra fail here? Construct a graph where the cheap route uses too many hops.',
      'What if you needed the cheapest path with no hop limit? Dijkstra is correct again and faster.',
      'What if there are negative-cost promotions — does Bellman-Ford still terminate correctly?',
    ],
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
    signal: 'Count the ways to reach a target where each move adds a fixed amount — the count at n is a sum of the counts at the states that reach it.',
    approach: `You arrive at step n either from n-1 or n-2, so ways(n) = ways(n-1) + ways(n-2) —
Fibonacci. Naive recursion recomputes the same subproblems exponentially; since
only the last two values ever matter, two rolling variables replace the whole
table.`,
    solution: `def climb_stairs(n: int) -> int:
    prev, current = 1, 1  # ways to reach step 0 and step 1
    for _ in range(n - 1):
        prev, current = current, prev + current
    return current`,
    complexity: {
      time: 'O(n) — one addition per step, versus O(2^n) for the unmemoised recursion.',
      space: 'O(1) — two rolling variables instead of an n-length table.',
    },
    followUps: [
      'What if you may climb 1, 2 or 3 steps? The window widens to three rolling variables.',
      'What if some steps are broken and cannot be landed on? Those states become zero, not skipped.',
      'What if n is 10^18 — matrix exponentiation gets you to O(log n).',
    ],
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
    signal: 'Same two-step recurrence as climbing stairs, but you are minimising a cost rather than counting paths.',
    approach: `The cheapest way to stand on step i is its own cost plus the cheaper of the two
steps you could have come from. Sweep forward carrying just those two values.
The top is one past the last step, so the answer is the cheaper of the final
two — that off-by-one is the whole trap.`,
    solution: `def min_cost_climbing_stairs(cost: list[int]) -> int:
    if len(cost) < 2:
        return 0

    one_back, two_back = 0, 0  # cost to stand on the last two steps
    for c in cost:
        one_back, two_back = c + min(one_back, two_back), one_back

    return min(one_back, two_back)  # the top is one past the last step`,
    complexity: {
      time: 'O(n) — one pass, each step doing a single comparison and addition.',
      space: 'O(1) — two rolling values rather than an n-length DP array.',
    },
    followUps: [
      'What if you may start from any step, not just the first two? The initial conditions change, the recurrence does not.',
      'What if steps may be skipped by up to k? The rolling window becomes a sliding-window minimum.',
      'What if you must also return the actual sequence of steps taken?',
    ],
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
    signal: 'Maximise a sum with an adjacency exclusion — taking an element forbids its neighbour, so each element is a take-or-skip decision.',
    approach: `At each house the best is either skipping it, keeping the previous best, or taking
it and adding the best from two houses back. Only those two values are ever
needed, so a full DP array collapses to two rolling variables. Greedy fails:
taking the biggest house first can block two even bigger ones.`,
    solution: `def rob(nums: list[int]) -> int:
    take, skip = 0, 0  # best including the previous house, best excluding it
    for n in nums:
        take, skip = skip + n, max(take, skip)
    return max(take, skip)`,
    complexity: {
      time: 'O(n) — one pass with constant work per house.',
      space: 'O(1) — two rolling values; the DP table is never materialised.',
    },
    followUps: [
      'What if the houses form a circle? Run it twice, once excluding the first house and once excluding the last.',
      'What if the houses form a binary tree? The same take-or-skip pair is returned bottom-up per node.',
      'What if you must avoid two neighbours on each side instead of one?',
    ],
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
    signal: 'The array is circular — the first and last elements are now adjacent, which a single linear pass cannot express.',
    approach: `The circle only matters through one fact: the first and last houses cannot both be
taken. So split into two linear problems — one that excludes the last house and
one that excludes the first — and take the better. Each is the ordinary House
Robber sweep, so nothing new has to be invented.`,
    solution: `def rob_circular(nums: list[int]) -> int:
    def rob_line(houses: list[int]) -> int:
        take, skip = 0, 0
        for n in houses:
            take, skip = skip + n, max(take, skip)
        return max(take, skip)

    if len(nums) <= 1:
        return sum(nums)
    # first and last are adjacent, so at most one of them can be taken
    return max(rob_line(nums[:-1]), rob_line(nums[1:]))`,
    complexity: {
      time: 'O(n) — two linear sweeps over slices of the array, which is still linear overall.',
      space: 'O(n) — the two slices; iterating with index bounds instead of slicing would bring it to O(1).',
    },
    followUps: [
      'Why is it not enough to run the linear version and subtract the smaller of the ends?',
      'What if the houses formed a general graph rather than a circle? That is maximum weight independent set, NP-hard.',
      'What if the circle can be entered at any point — does the answer change at all?',
    ],
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
    signal: 'Longest substring with a symmetry property — every palindrome has a centre, so enumerate centres rather than substrings.',
    approach: `Checking all O(n^2) substrings for palindromicity costs O(n^3). Instead expand
outward from each of the 2n-1 centres — n single characters and n-1 gaps between
them — while the ends match. That is O(n^2) with O(1) space, and Manacher's
algorithm gets it to O(n) if pressed.`,
    solution: `def longest_palindrome(s: str) -> str:
    if not s:
        return ""

    start, length = 0, 1

    def expand(lo: int, hi: int) -> None:
        nonlocal start, length
        while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
            lo -= 1
            hi += 1
        if hi - lo - 1 > length:
            start, length = lo + 1, hi - lo - 1

    for i in range(len(s)):
        expand(i, i)  # odd-length centre
        expand(i, i + 1)  # even-length centre

    return s[start : start + length]`,
    complexity: {
      time: 'O(n^2) — 2n-1 centres, each expanding at most n/2 steps, versus O(n^3) for checking every substring.',
      space: 'O(1) — two indices track the best window; no DP table is allocated.',
    },
    followUps: [
      'What if you need O(n)? Manacher\'s algorithm reuses previously computed radii to avoid re-expanding.',
      'What if you need the longest palindromic subsequence instead? That is 2D DP, and the centres argument dies.',
      'What if there are many queries on the same string — what would you precompute?',
    ],
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
    signal: 'Count substrings with a symmetry property — the same centre expansion as the longest palindrome, counting instead of measuring.',
    approach: `Every palindromic substring is uniquely identified by its centre and radius, so
expanding from each of the 2n-1 centres and counting every successful step
enumerates each palindrome exactly once. No deduplication is needed, which is
exactly why the centre view beats enumerating substrings.`,
    solution: `def count_substrings(s: str) -> int:
    total = 0

    def expand(lo: int, hi: int) -> int:
        count = 0
        while lo >= 0 and hi < len(s) and s[lo] == s[hi]:
            count += 1
            lo -= 1
            hi += 1
        return count

    for i in range(len(s)):
        total += expand(i, i) + expand(i, i + 1)

    return total`,
    complexity: {
      time: 'O(n^2) — each of the 2n-1 centres expands at most n/2 times, and each step counts one palindrome.',
      space: 'O(1) — only counters and indices; nothing proportional to the input is stored.',
    },
    followUps: [
      'What if only distinct palindromic substrings should be counted? You need a suffix automaton or an Eertree.',
      'What if the string is 10^6 long? Manacher gives all radii in O(n) and the count follows directly.',
      'What if you must count palindromic subsequences instead — why does the centre argument fail?',
    ],
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
    signal: 'Count the ways to segment a string where each piece must be valid — the count at position i depends on one or two positions back.',
    approach: `Ways to decode a prefix ending at i = ways(i-1) if the single digit is 1..9, plus
ways(i-2) if the two-digit pair is 10..26. Zero is the whole difficulty: it can
never stand alone, so it kills the one-digit branch and only survives as part of
10 or 20.`,
    solution: `def num_decodings(s: str) -> int:
    if not s:
        return 0

    two_back, one_back = 1, 1 if s[0] != "0" else 0

    for i in range(1, len(s)):
        current = 0
        if s[i] != "0":
            current += one_back  # a valid single digit
        if 10 <= int(s[i - 1 : i + 1]) <= 26:
            current += two_back  # a valid pair
        two_back, one_back = one_back, current

    return one_back`,
    complexity: {
      time: 'O(n) — one pass, each position doing two constant-time validity checks.',
      space: 'O(1) — two rolling counts replace the length-n DP array.',
    },
    followUps: [
      'What if the string contains \'*\' meaning any digit 1-9? Each branch multiplies by how many digits fit.',
      'What if you must list the decodings rather than count them? That is exponential output, so backtracking.',
      'Why does a leading zero force the answer to zero, and where in the loop is that enforced?',
    ],
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
    signal: 'Fewest items to reach an exact total with unlimited reuse — greedy fails on arbitrary denominations, so it is unbounded-knapsack DP.',
    approach: `Taking the largest coin first is wrong for coin sets like [1, 3, 4] and amount 6.
Instead build up every amount from 0: the best for amount a is one more than the
best of a minus each coin. Each subproblem is solved once and reused, so the
exponential recursion collapses to a table sweep.`,
    solution: `def coin_change(coins: list[int], amount: int) -> int:
    INF = amount + 1
    best = [0] + [INF] * amount  # best[a] = fewest coins summing to a

    for a in range(1, amount + 1):
        for coin in coins:
            if coin <= a:
                best[a] = min(best[a], best[a - coin] + 1)

    return -1 if best[amount] == INF else best[amount]`,
    complexity: {
      time: 'O(amount * len(coins)) — every amount is solved once by trying each coin, and each subresult is reused.',
      space: 'O(amount) — a single table indexed by amount, independent of how many coins there are.',
    },
    followUps: [
      'What if you need the number of ways rather than the fewest coins? Swap the loop order and sum instead of min.',
      'What if each coin may be used only once? That is 0/1 knapsack, and the inner loop must run backwards.',
      'What if the amount is huge but the coins are few — is there a number-theoretic shortcut?',
    ],
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
    signal: 'Best contiguous product, and negatives flip sign — so the smallest running value is as valuable as the largest.',
    approach: `Unlike a max-sum sweep, a very negative running product can become the maximum the
moment another negative appears. So carry both the running maximum and running
minimum, swapping them when the current element is negative. A zero resets both,
because no product can span it.`,
    solution: `def max_product(nums: list[int]) -> int:
    if not nums:
        return 0

    best = high = low = nums[0]

    for n in nums[1:]:
        if n < 0:
            high, low = low, high  # a negative swaps the roles
        high = max(n, high * n)
        low = min(n, low * n)
        best = max(best, high)

    return best`,
    complexity: {
      time: 'O(n) — one pass carrying two running extremes, with constant work per element.',
      space: 'O(1) — three scalars, no table.',
    },
    followUps: [
      'What if the array is circular? Products wrapping the ends need the same two-pass trick as circular sums.',
      'What if division were allowed — why does prefix-product plus division break on zeros?',
      'What if you must return the subarray itself, not just its product?',
    ],
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
    signal: 'Can a string be cut into dictionary pieces — reachability over cut positions, where each position is a subproblem reused many times.',
    approach: `Position i is reachable if some earlier reachable j has s[j:i] in the dictionary.
Plain recursion re-explores the same suffixes exponentially; a boolean array over
cut positions solves each once. Storing the dictionary as a set is what keeps
each membership test O(1).`,
    solution: `def word_break(s: str, word_dict: list[str]) -> bool:
    words = set(word_dict)
    reachable = [True] + [False] * len(s)  # reachable[i]: s[:i] is fully breakable

    for i in range(1, len(s) + 1):
        for j in range(i):
            if reachable[j] and s[j:i] in words:
                reachable[i] = True
                break

    return reachable[len(s)]`,
    complexity: {
      time: 'O(n^2 * k) — every cut pair is tried once and each slice comparison costs up to k, the longest word length.',
      space: 'O(n + total dictionary characters) — the reachability array plus the word set.',
    },
    followUps: [
      'What if you must return every possible sentence? That is exponential output, so memoised backtracking.',
      'What if the dictionary is huge? A trie walk from each start avoids building the substrings at all.',
      'What if words may be used at most once each — does the DP still apply?',
    ],
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
    signal: 'Longest increasing subsequence — not contiguous, so a sliding window is useless and each element must consult all earlier ones.',
    approach: `The O(n^2) DP asks, for each element, the best subsequence ending at any smaller
earlier element. The O(n log n) version keeps \`tails\`, where tails[k] is the
smallest possible tail of an increasing subsequence of length k+1; each element
either extends it or replaces the first tail it can beat.`,
    solution: `from bisect import bisect_left


def length_of_lis(nums: list[int]) -> int:
    tails: list[int] = []  # tails[k] = smallest tail of an LIS of length k + 1

    for n in nums:
        i = bisect_left(tails, n)
        if i == len(tails):
            tails.append(n)  # n extends the longest run so far
        else:
            tails[i] = n  # a smaller tail keeps more options open

    return len(tails)`,
    complexity: {
      time: 'O(n log n) — one binary search per element into a list that never exceeds the answer\'s length.',
      space: 'O(n) — the tails list, which is at most as long as the input.',
    },
    followUps: [
      'What if you must return the subsequence itself? Record predecessor indices; tails alone is not the answer.',
      'What if non-decreasing is allowed? bisect_left becomes bisect_right.',
      'What if the sequence arrives as a stream and the answer is queried continuously?',
    ],
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
    signal: 'Split into two equal-sum halves — really "can any subset hit exactly half the total", which is subset-sum, a 0/1 knapsack.',
    approach: `An odd total is immediately impossible. Otherwise ask whether some subset sums to
total/2. Track reachable sums as a set (or bitset): each number either joins a
sum or does not. Iterating the existing sums rather than re-enumerating subsets
is what turns 2^n into O(n * total).`,
    solution: `def can_partition(nums: list[int]) -> bool:
    total = sum(nums)
    if total % 2:
        return False  # an odd total can never split evenly

    target = total // 2
    reachable = {0}

    for n in nums:
        reachable |= {n + s for s in reachable if n + s <= target}
        if target in reachable:
            return True

    return target in reachable`,
    complexity: {
      time: 'O(n * total) — each number is combined with at most total/2 reachable sums; pseudo-polynomial, not polynomial in the input bits.',
      space: 'O(total) — the reachable set holds at most target + 1 distinct sums.',
    },
    followUps: [
      'What if you must split into k equal parts? That is much harder and needs bitmask DP or careful backtracking.',
      'What if the values are huge? The pseudo-polynomial bound stops helping once total dwarfs n.',
      'What if you must return the actual subsets, not just whether they exist?',
    ],
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
    signal: 'Count paths through a grid with movement restricted to two directions — every cell\'s count is the sum of the cells that lead into it.',
    approach: `A cell can only be entered from above or from the left, so paths(r,c) = paths(r-1,c)
+ paths(r,c-1) with the first row and column all ones. Since each row only needs
the row above, a single array rolled in place suffices — the full m by n table is
never required.`,
    solution: `def unique_paths(m: int, n: int) -> int:
    if m <= 0 or n <= 0:
        return 0

    row = [1] * n  # the top row: exactly one path to each cell
    for _ in range(m - 1):
        for c in range(1, n):
            row[c] += row[c - 1]  # from above (old value) plus from the left

    return row[n - 1]`,
    complexity: {
      time: 'O(m * n) — each cell\'s count is computed once with a single addition.',
      space: 'O(n) — one rolling row instead of the full m by n table.',
    },
    followUps: [
      'What if some cells are blocked? Obstacles zero out those entries, and the recurrence is otherwise unchanged.',
      'What if m and n are enormous? The answer is the binomial coefficient C(m+n-2, m-1), computable directly.',
      'What if diagonal moves are allowed — what third term joins the recurrence?',
    ],
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
    signal: 'Two sequences compared by subsequence, not substring — a 2D table over prefix pairs, the archetype of string DP.',
    approach: `Compare the last characters of the two prefixes. If they match, the answer is one
plus the LCS of both shorter prefixes; if not, it is the better of dropping one
character from either. That gives an (m+1) by (n+1) table, and since each row
only reads the row above, one rolling row suffices.`,
    solution: `def longest_common_subsequence(text1: str, text2: str) -> int:
    previous = [0] * (len(text2) + 1)

    for a in text1:
        current = [0] * (len(text2) + 1)
        for j, b in enumerate(text2, start=1):
            if a == b:
                current[j] = previous[j - 1] + 1
            else:
                current[j] = max(previous[j], current[j - 1])
        previous = current

    return previous[len(text2)]`,
    complexity: {
      time: 'O(m * n) — every prefix pair is resolved exactly once with constant work.',
      space: 'O(n) — two rows instead of the full m by n table, since each row only depends on the previous one.',
    },
    followUps: [
      'What if you need the subsequence itself? Reconstruction needs the full table, or a divide-and-conquer Hirschberg pass.',
      'What if it is the longest common substring instead? Mismatches reset to zero rather than carrying forward.',
      'What if there are three strings — how badly does the table grow?',
    ],
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
    signal: 'Trading with a rest constraint — the answer depends on which state you are in, so the DP is over states, not just days.',
    approach: `Three states per day: holding stock, just sold (so tomorrow is a cooldown), and
free to buy. Each day's states are computed from the previous day's, and the
cooldown is encoded by letting "free" come only from the previous free or the
sold-two-days-ago state. Three scalars replace any table.`,
    solution: `def max_profit_cooldown(prices: list[int]) -> int:
    hold = float("-inf")  # holding a share
    sold = float("-inf")  # sold today, so tomorrow is a cooldown
    free = 0  # holding nothing and free to buy

    for price in prices:
        hold, sold, free = (
            max(hold, free - price),
            hold + price,
            max(free, sold),  # can only buy the day after a sale
        )

    return int(max(free, sold, 0))`,
    complexity: {
      time: 'O(n) — one pass over prices, updating three states in constant time each day.',
      space: 'O(1) — three scalars; the day-by-day table is never materialised.',
    },
    followUps: [
      'What if the cooldown is k days? The state count grows with k, or you keep a sliding window of sold values.',
      'What if there is a transaction fee instead of a cooldown? Subtract it in the sold transition.',
      'What if you may hold at most one share but shorting is allowed — how many states then?',
    ],
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
    signal: 'Count combinations, not permutations — the order of the loops is what decides which of the two you compute.',
    approach: `Iterate coins in the outer loop and amounts in the inner. That way each coin's
contribution is added once, so 1+2 and 2+1 are never counted separately. Swapping
the loops counts ordered sequences instead — the same table, a different
question.`,
    solution: `def change(amount: int, coins: list[int]) -> int:
    ways = [1] + [0] * amount  # one way to make 0: take nothing

    for coin in coins:  # coins outermost: combinations, not permutations
        for a in range(coin, amount + 1):
            ways[a] += ways[a - coin]

    return ways[amount]`,
    complexity: {
      time: 'O(amount * len(coins)) — one pass over amounts per coin, with a single addition each.',
      space: 'O(amount) — a single array reused across coins rather than a 2D table.',
    },
    followUps: [
      'What happens if you swap the loops? You count ordered sequences, which is a different problem entirely.',
      'What if each coin may be used at most once? Iterate amounts downward so a coin cannot be reused.',
      'What if the count overflows 64 bits — do you need modular arithmetic or big integers?',
    ],
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
    signal: 'Assign a plus or minus to every element to hit a target — algebra turns it into a subset-sum count.',
    approach: `If P is the positive subset and N the negative one, P - N = target and P + N = total,
so P = (total + target) / 2. Counting sign assignments therefore reduces to
counting subsets summing to P — reject non-integer or negative P immediately.
Then it is 0/1 knapsack counting.`,
    solution: `def find_target_sum_ways(nums: list[int], target: int) -> int:
    total = sum(nums)
    needed = total + target
    if needed % 2 or needed < 0:
        return 0  # no integer split of the positives can work

    subset = needed // 2
    ways = [1] + [0] * subset

    for n in nums:
        for s in range(subset, n - 1, -1):  # downward: each number used at most once
            ways[s] += ways[s - n]

    return ways[subset]`,
    complexity: {
      time: 'O(n * total) — each number sweeps the reachable-sum array once; pseudo-polynomial in the values.',
      space: 'O(total) — one counting array indexed by subset sum.',
    },
    followUps: [
      'What if zeros are present? Each zero doubles the count, which the DP handles but a naive subset enumeration might not.',
      'What if the numbers can be negative? The algebraic reduction assumes non-negative values.',
      'What if you must list the assignments rather than count them?',
    ],
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
    signal: 'Can two strings be shuffled into a third preserving each one\'s order — the state is how far you have consumed each source.',
    approach: `Greedy fails whenever both sources offer the same next character. The state (i, j)
— characters taken from s1 and from s2 — determines the position in s3, so the
table is 2D and each cell asks whether either source could have supplied the
next character. Lengths must sum, or the answer is immediately no.`,
    solution: `def is_interleave(s1: str, s2: str, s3: str) -> bool:
    if len(s1) + len(s2) != len(s3):
        return False

    reachable = [False] * (len(s2) + 1)
    reachable[0] = True
    for j in range(1, len(s2) + 1):
        reachable[j] = reachable[j - 1] and s2[j - 1] == s3[j - 1]

    for i in range(1, len(s1) + 1):
        reachable[0] = reachable[0] and s1[i - 1] == s3[i - 1]
        for j in range(1, len(s2) + 1):
            from_s1 = reachable[j] and s1[i - 1] == s3[i + j - 1]
            from_s2 = reachable[j - 1] and s2[j - 1] == s3[i + j - 1]
            reachable[j] = from_s1 or from_s2

    return reachable[len(s2)]`,
    complexity: {
      time: 'O(m * n) — every (i, j) prefix pair is decided once with two constant-time checks.',
      space: 'O(n) — one rolling row over s2\'s prefixes instead of the full m by n table.',
    },
    followUps: [
      'What if there are three source strings? The table gains a dimension and the cost becomes O(n^3).',
      'What if you must return which source each character came from?',
      'Why does a greedy character-by-character match fail — give the smallest counterexample.',
    ],
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
    signal: 'Longest path in a grid, but the strictly-increasing rule makes the graph acyclic — so memoisation is safe and no visited set is needed.',
    approach: `Because every move must go strictly up in value, no path can revisit a cell, and
the implicit graph is a DAG. That means the longest path from a cell is a pure
function of the cell, so memoise it: each cell is computed once and read many
times, turning exponential search into linear work.`,
    solution: `from functools import lru_cache


def longest_increasing_path(matrix: list[list[int]]) -> int:
    if not matrix or not matrix[0]:
        return 0

    rows, cols = len(matrix), len(matrix[0])

    @lru_cache(maxsize=None)
    def longest(r: int, c: int) -> int:
        best = 1
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            # strictly increasing means the graph is acyclic, so no visited set
            if 0 <= nr < rows and 0 <= nc < cols and matrix[nr][nc] > matrix[r][c]:
                best = max(best, 1 + longest(nr, nc))
        return best

    return max(longest(r, c) for r in range(rows) for c in range(cols))`,
    complexity: {
      time: 'O(rows * cols) — each cell\'s value is computed once and reused; four neighbour checks each.',
      space: 'O(rows * cols) — the memo table, plus recursion depth up to the path length.',
    },
    followUps: [
      'What if equal values could be stepped onto? Cycles reappear and memoisation is no longer valid.',
      'What if the matrix is too large for recursion? Peel it by topological order of increasing value.',
      'What if you must return the path itself, not just its length?',
    ],
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
    signal: 'Count how many ways one string appears as a subsequence of another — counting, not matching, so every choice must be summed.',
    approach: `Walk prefixes of both strings. If the characters differ, the only option is to skip
a character of the source. If they match you may either consume both or skip the
source character, and the counts add. Iterating the target backwards lets a
single array serve as the whole table.`,
    solution: `def num_distinct(s: str, t: str) -> int:
    ways = [1] + [0] * len(t)  # one way to match the empty target

    for ch in s:
        for j in range(len(t), 0, -1):  # backwards so each source char is used once
            if t[j - 1] == ch:
                ways[j] += ways[j - 1]

    return ways[len(t)]`,
    complexity: {
      time: 'O(m * n) — each source character sweeps the target array once, with a single addition per match.',
      space: 'O(n) — one array over the target\'s prefixes rather than an m by n table.',
    },
    followUps: [
      'What if the counts overflow? Real interviews want a modulus, or Python\'s big integers hide the issue.',
      'What if you needed the longest common subsequence instead — why does max replace the sum?',
      'Why must the inner loop run backwards? Trace what a forward loop double-counts.',
    ],
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
    signal: 'Minimum operations to turn one string into another — three edits map to three neighbouring cells in a prefix-pair table.',
    approach: `dist(i, j) compares prefixes. Matching last characters cost nothing and move
diagonally; otherwise take the cheapest of delete (from above), insert (from the
left) or replace (diagonal), plus one. Base cases are the empty prefixes, which
cost exactly their own length.`,
    solution: `def min_distance(word1: str, word2: str) -> int:
    previous = list(range(len(word2) + 1))  # cost of deleting all of word2's prefix

    for i, a in enumerate(word1, start=1):
        current = [i] + [0] * len(word2)
        for j, b in enumerate(word2, start=1):
            if a == b:
                current[j] = previous[j - 1]
            else:
                current[j] = 1 + min(
                    previous[j],  # delete from word1
                    current[j - 1],  # insert into word1
                    previous[j - 1],  # replace
                )
        previous = current

    return previous[len(word2)]`,
    complexity: {
      time: 'O(m * n) — every prefix pair is resolved once from three already-known neighbours.',
      space: 'O(n) — two rows; the full table is only needed if you must reconstruct the edit script.',
    },
    followUps: [
      'What if the operations have different costs? Weight each of the three terms; the recurrence is unchanged.',
      'What if transposing adjacent characters is also allowed? That is Damerau-Levenshtein, with a fourth term.',
      'What if you only care whether the distance is at most k? Only a diagonal band of the table matters.',
    ],
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
    signal: 'The value of each choice depends on what has already been removed — so decide what is burst LAST in an interval, not first.',
    approach: `Choosing what to burst first makes the neighbours change unpredictably. Reverse
the view: if balloon k is the last one burst in an open interval, its neighbours
are the fixed interval boundaries, and the two sides become independent
subproblems. Padding with virtual 1s removes the edge cases.`,
    solution: `def max_coins(nums: list[int]) -> int:
    balloons = [1] + [n for n in nums if n > 0] + [1]  # virtual 1s at both ends
    n = len(balloons)
    best = [[0] * n for _ in range(n)]

    for width in range(2, n):  # width is the distance between the fixed boundaries
        for lo in range(n - width):
            hi = lo + width
            for last in range(lo + 1, hi):
                # last is burst last, so its neighbours are the untouched boundaries
                gain = balloons[lo] * balloons[last] * balloons[hi]
                best[lo][hi] = max(best[lo][hi], best[lo][last] + gain + best[last][hi])

    return best[0][n - 1]`,
    complexity: {
      time: 'O(n^3) — O(n^2) intervals, each trying every interior balloon as the last to burst.',
      space: 'O(n^2) — the interval table over pairs of boundaries.',
    },
    followUps: [
      'Why does deciding what to burst first fail? Trace how the neighbours change under that framing.',
      'What if balloons are in a circle rather than a line? Duplicate the array, as with circular DP generally.',
      'What if n is 500 — is O(n^3) still acceptable, and what would you profile first?',
    ],
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
    signal: 'A pattern where one token can consume any number of characters — every \'*\' is a branch, so the state is a pair of positions.',
    approach: `Match prefixes of text against prefixes of pattern. A '*' either matches zero
occurrences, skipping two pattern characters, or one more occurrence, consuming
a text character while staying on the same pattern token. Everything else is a
plain character or '.' comparison, and memoising the position pair kills the
exponential blowup.`,
    solution: `from functools import lru_cache


def is_match(s: str, p: str) -> bool:
    @lru_cache(maxsize=None)
    def match(i: int, j: int) -> bool:
        if j == len(p):
            return i == len(s)

        first = i < len(s) and p[j] in (s[i], ".")

        if j + 1 < len(p) and p[j + 1] == "*":
            # zero occurrences, or one more occurrence of the same token
            return match(i, j + 2) or (first and match(i + 1, j))

        return first and match(i + 1, j + 1)

    return match(0, 0)`,
    complexity: {
      time: 'O(m * n) — there are m+1 by n+1 distinct states and each is evaluated once thanks to the memo.',
      space: 'O(m * n) — the memo table, plus recursion depth up to m + n.',
    },
    followUps: [
      'What if \'+\' and \'?\' are added? Both are sugar over the same two branches.',
      'What if the pattern is applied to millions of strings? Compile it to an NFA or DFA once instead.',
      'How does this differ from wildcard matching, where \'*\' is standalone rather than attached to a token?',
    ],
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
    signal: 'Best contiguous sum — the moment the running total goes negative it can only hurt whatever follows, so it is worth discarding.',
    approach: `Kadane's insight: a prefix with a negative sum is never worth carrying, because
starting fresh at the next element is strictly better. So keep a running sum,
reset it to the current element whenever extending is worse, and track the best
seen. That is one pass instead of the O(n^2) sum over all subarrays.`,
    solution: `def max_sub_array(nums: list[int]) -> int:
    if not nums:
        return 0

    best = current = nums[0]
    for n in nums[1:]:
        current = max(n, current + n)  # extend, or start fresh here
        best = max(best, current)

    return best`,
    complexity: {
      time: 'O(n) — one pass with two comparisons per element, versus O(n^2) for summing every subarray.',
      space: 'O(1) — two running scalars, no prefix-sum array.',
    },
    followUps: [
      'What if the array is circular? The answer is either the plain maximum or total minus the minimum subarray.',
      'What if you must return the subarray\'s bounds? Record the start whenever the running sum resets.',
      'What if updates arrive and the maximum must stay current? A segment tree storing prefix, suffix and best per node.',
    ],
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
    signal: 'Reachability with variable step sizes — you never need which path, only how far anything can reach.',
    approach: `Track the furthest index reachable so far. Walk forward; if the current index is
beyond that reach, you are stuck. Otherwise extend the reach. There is no need
to try individual jumps, because reach is monotone — the DP over every jump
choice is O(n^2) and computes nothing extra.`,
    solution: `def can_jump(nums: list[int]) -> bool:
    reach = 0
    for i, jump in enumerate(nums):
        if i > reach:
            return False  # this index was never reachable
        reach = max(reach, i + jump)
    return True`,
    complexity: {
      time: 'O(n) — one pass updating a single running maximum.',
      space: 'O(1) — one integer, versus O(n) for a reachability DP array.',
    },
    followUps: [
      'What if you need the minimum number of jumps? That is Jump Game II, a level-by-level greedy.',
      'What if you may also jump backwards? Reach is no longer monotone and it becomes a BFS.',
      'What if some indices are forbidden landing spots?',
    ],
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
    signal: 'Fewest jumps to the end — each jump defines a window of newly reachable indices, so the answer is a BFS level count.',
    approach: `Think of it as BFS where level k is everything reachable in k jumps. Sweep the
current level's index range, computing the furthest index any of them reaches;
that becomes the next level. Incrementing the count once per level, rather than
per index, is what makes it linear instead of O(n^2).`,
    solution: `def jump(nums: list[int]) -> int:
    jumps = 0
    current_end = 0  # last index reachable with \`jumps\` jumps
    furthest = 0

    for i in range(len(nums) - 1):
        furthest = max(furthest, i + nums[i])
        if i == current_end:  # exhausted this level, so take another jump
            jumps += 1
            current_end = furthest

    return jumps`,
    complexity: {
      time: 'O(n) — one pass; the level boundary advances monotonically so no index is revisited.',
      space: 'O(1) — three integers, no queue and no DP table.',
    },
    followUps: [
      'What if some positions are unreachable? Guard the loop, or furthest stalls and the count is meaningless.',
      'What if each jump had a cost rather than counting one each? Then it is Dijkstra, not a greedy sweep.',
      'What if you must return the actual sequence of landing indices?',
    ],
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
    signal: 'A circular route feasible from exactly one start — if the total is non-negative, the failure points themselves tell you where to begin.',
    approach: `If total gas is less than total cost no start works. Otherwise sweep once with a
running tank: the moment it goes negative, no station from the current candidate
up to here can be the start, so the next station becomes the candidate. That
single pass replaces trying all n starts at O(n^2).`,
    solution: `def can_complete_circuit(gas: list[int], cost: list[int]) -> int:
    if sum(gas) < sum(cost):
        return -1  # not enough fuel overall, so no start can work

    start = 0
    tank = 0
    for i, (g, c) in enumerate(zip(gas, cost)):
        tank += g - c
        if tank < 0:  # nothing from \`start\` to i can be the answer
            start = i + 1
            tank = 0

    return start`,
    complexity: {
      time: 'O(n) — two sums plus one sweep, versus O(n^2) for simulating every possible start.',
      space: 'O(1) — a running tank and a candidate index.',
    },
    followUps: [
      'Prove the greedy: why can no station between the old start and the failure point be a valid start?',
      'What if the tank has a maximum capacity? The prefix argument breaks and it becomes a simulation.',
      'What if several valid starts exist — does this return the smallest index?',
    ],
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
    signal: 'Partition into runs of consecutive values — the smallest remaining value has no choice about which run it starts.',
    approach: `The smallest unused number must be the head of a run, since nothing smaller exists
to precede it. So repeatedly take the smallest, and consume one of each of the
next k-1 values; if any is missing, the partition is impossible. Counting with a
dict keeps each removal O(1).`,
    solution: `from collections import Counter


def is_possible_divide(nums: list[int], k: int) -> bool:
    if k <= 0 or len(nums) % k:
        return False

    counts = Counter(nums)
    for value in sorted(counts):
        need = counts[value]
        if need <= 0:
            continue
        for offset in range(k):  # the smallest left must head its own run
            if counts[value + offset] < need:
                return False
            counts[value + offset] -= need

    return True`,
    complexity: {
      time: 'O(n log n + d * k) — the sort over d distinct values dominates, and each value extends its runs k steps.',
      space: 'O(d) — one counter entry per distinct value.',
    },
    followUps: [
      'What if runs may be of any length at least k? The greedy must decide how far to extend each run.',
      'What if values are huge but few? A heap over the distinct values avoids sorting the whole array.',
      'What if the numbers arrive as a stream and hands must be formed online?',
    ],
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
    signal: 'The operation takes a component-wise maximum, so any triplet exceeding the target in any position is permanently poisonous.',
    approach: `Because merging only ever raises values, a triplet with any component above the
target can never be used — including it would overshoot forever. Every other
triplet is free to merge, so simply check whether the usable ones collectively
supply each target component exactly.`,
    solution: `def merge_triplets(triplets: list[list[int]], target: list[int]) -> bool:
    found = [False, False, False]

    for triplet in triplets:
        if any(t > g for t, g in zip(triplet, target)):
            continue  # merging can only raise values, so this one is unusable
        for i in range(3):
            if triplet[i] == target[i]:
                found[i] = True

    return all(found)`,
    complexity: {
      time: 'O(n) — one pass with a constant three comparisons per triplet.',
      space: 'O(1) — three booleans regardless of input size.',
    },
    followUps: [
      'What if merging took the minimum instead? The whole poisonous-triplet argument inverts.',
      'What if there were k components rather than three — does anything but the loop bound change?',
      'What if you must report which triplets to merge, not just whether it is possible?',
    ],
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
    signal: 'Cut a string so each character lives in exactly one piece — a piece cannot end before the last occurrence of anything inside it.',
    approach: `Record each character's last index in one pass. Then sweep, extending the current
piece's end to the furthest last-occurrence seen so far; when the scan index
reaches that end, nothing inside can appear later, so it is safe to cut. That is
two linear passes and no backtracking.`,
    solution: `def partition_labels(s: str) -> list[int]:
    last = {ch: i for i, ch in enumerate(s)}  # last occurrence of each character

    out: list[int] = []
    start = end = 0

    for i, ch in enumerate(s):
        end = max(end, last[ch])
        if i == end:  # nothing inside this piece appears later
            out.append(end - start + 1)
            start = i + 1

    return out`,
    complexity: {
      time: 'O(n) — two passes, one to record last occurrences and one to cut.',
      space: 'O(k) — one entry per distinct character, so O(1) for a fixed alphabet.',
    },
    followUps: [
      'What if you want the fewest pieces instead of the greedy ones — is this already optimal?',
      'What if some characters may appear in two pieces? The interval-merging argument collapses.',
      'What if the string is a stream? Last occurrences are unknown ahead of time, so this fails outright.',
    ],
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
    signal: 'A wildcard that may be an opener, a closer, or nothing — instead of branching, carry the range of possible open counts.',
    approach: `Trying every interpretation of '*' is exponential. Instead track the minimum and
maximum number of unmatched openers still possible. A '*' widens that range by
one in both directions; the minimum is clamped at zero. The string is valid if
the maximum never drops below zero and the minimum ends at zero.`,
    solution: `def check_valid_string(s: str) -> bool:
    low = high = 0  # possible range of unmatched open brackets

    for ch in s:
        if ch == "(":
            low, high = low + 1, high + 1
        elif ch == ")":
            low, high = low - 1, high - 1
        else:  # '*' may be '(', ')' or empty
            low, high = low - 1, high + 1

        if high < 0:
            return False  # too many closers under every interpretation
        low = max(low, 0)

    return low == 0`,
    complexity: {
      time: 'O(n) — one pass carrying two counters, versus exponential branching on each wildcard.',
      space: 'O(1) — two integers instead of a stack of positions.',
    },
    followUps: [
      'Why is clamping low at zero correct rather than a bug that hides errors?',
      'What if there were multiple bracket types plus wildcards? The interval trick fails and you need a stack per type.',
      'What if you must return one valid assignment of the wildcards, not just a yes or no?',
    ],
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
    signal: 'The list is already sorted and disjoint — so the new interval touches one contiguous run, and everything else is copied untouched.',
    approach: `Walk the sorted list in three phases: intervals ending before the new one starts
are emitted as is; intervals that overlap are absorbed by widening the new
interval's bounds; the rest are emitted after. Because the input is sorted, one
pass suffices and no re-sorting is needed.`,
    solution: `def insert_interval(intervals: list[list[int]], new: list[int]) -> list[list[int]]:
    out: list[list[int]] = []
    start, end = new
    i, n = 0, len(intervals)

    while i < n and intervals[i][1] < start:  # strictly before: no overlap
        out.append(intervals[i])
        i += 1

    while i < n and intervals[i][0] <= end:  # overlapping: absorb
        start = min(start, intervals[i][0])
        end = max(end, intervals[i][1])
        i += 1

    out.append([start, end])
    out.extend(intervals[i:])
    return out`,
    complexity: {
      time: 'O(n) — each interval is examined once across the three phases; no sort is needed because the input is sorted.',
      space: 'O(n) — the output list; the input itself is not copied or mutated.',
    },
    followUps: [
      'What if the list were unsorted? You would sort first and it becomes Merge Intervals at O(n log n).',
      'What if many inserts arrive? A balanced BST or interval tree gives O(log n) per insert instead of O(n).',
      'What if touching endpoints should not merge — which comparison changes?',
    ],
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
    signal: 'Overlapping ranges to collapse — sorting by start is what makes overlap a purely local, adjacent-pair question.',
    approach: `Once sorted by start, any interval can only overlap the one currently being built,
because everything later starts even later. So sweep: extend the current
interval's end when the next one starts within it, otherwise close it out and
begin a new one. Without the sort you would need all-pairs comparisons.`,
    solution: `def merge_intervals(intervals: list[list[int]]) -> list[list[int]]:
    if not intervals:
        return []

    out: list[list[int]] = []
    for start, end in sorted(intervals):
        if out and start <= out[-1][1]:  # overlaps the interval being built
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])

    return out`,
    complexity: {
      time: 'O(n log n) — dominated by the sort; the merging sweep itself is linear.',
      space: 'O(n) — the output list, plus whatever the sort needs.',
    },
    followUps: [
      'What if intervals arrive as a stream? An interval tree or a sorted container maintains the merge online.',
      'What if you want the gaps between intervals rather than the merged ranges?',
      'What if intervals are on a circular timeline, like times of day wrapping midnight?',
    ],
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
    signal: 'Remove the fewest intervals to leave a disjoint set — equivalently keep the most, which is interval scheduling, so sort by END.',
    approach: `Keeping the most intervals means always choosing the one that frees up the timeline
soonest, so sort by end time and greedily keep any interval starting at or after
the last kept end. Sorting by start is the classic wrong move: one long early
interval then blocks several short ones.`,
    solution: `def erase_overlap_intervals(intervals: list[list[int]]) -> int:
    if not intervals:
        return 0

    kept = 0
    last_end = float("-inf")

    for start, end in sorted(intervals, key=lambda iv: iv[1]):  # by END, not start
        if start >= last_end:
            kept += 1
            last_end = end

    return len(intervals) - kept`,
    complexity: {
      time: 'O(n log n) — the sort by end time dominates; the greedy sweep is one linear pass.',
      space: 'O(n) — the sorted copy; the greedy sweep itself keeps only two values.',
    },
    followUps: [
      'Why sort by end rather than start? Construct the counterexample that breaks sorting by start.',
      'What if intervals have weights and you want the maximum total weight? Greedy fails; it becomes DP with binary search.',
      'What if touching endpoints counted as overlapping — which comparison flips?',
    ],
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
    signal: 'Can one resource serve everything — after sorting by start, only adjacent pairs can conflict.',
    approach: `Sort by start time. If any meeting begins before its predecessor ends, one room is
not enough, and if no adjacent pair conflicts then no pair does — because starts
are non-decreasing. That is why checking neighbours is sufficient and the
all-pairs comparison is wasted work.`,
    solution: `def can_attend_meetings(intervals: list[list[int]]) -> bool:
    ordered = sorted(intervals)
    return all(
        current[0] >= previous[1]  # starts only after the previous one ends
        for previous, current in zip(ordered, ordered[1:])
    )`,
    complexity: {
      time: 'O(n log n) — the sort dominates; the adjacent-pair scan is linear.',
      space: 'O(n) — the sorted copy of the intervals.',
    },
    followUps: [
      'What if you need how many rooms are required? That is Meeting Rooms II, a sweep or a heap.',
      'What if meetings arrive one at a time and each must be accepted or rejected immediately?',
      'What if a meeting ending exactly when another starts counts as a conflict?',
    ],
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
    signal: 'Maximum number of simultaneous intervals — the answer is the peak of a sweep, not a property of any single interval.',
    approach: `Rooms needed at any moment is the number of meetings then in progress. Separate
the starts and the ends, sort both, and sweep in time order: a start increments
the occupancy and an end decrements it. The peak occupancy is the answer; a
min-heap of end times computes the same thing.`,
    solution: `def min_meeting_rooms(intervals: list[list[int]]) -> int:
    if not intervals:
        return 0

    starts = sorted(iv[0] for iv in intervals)
    ends = sorted(iv[1] for iv in intervals)

    rooms = peak = 0
    e = 0
    for start in starts:
        while ends[e] <= start:  # a room freed up before this meeting begins
            e += 1
            rooms -= 1
        rooms += 1
        peak = max(peak, rooms)

    return peak`,
    complexity: {
      time: 'O(n log n) — two sorts dominate; the sweep advances each pointer at most n times.',
      space: 'O(n) — the two sorted lists of endpoints.',
    },
    followUps: [
      'What if you must say which meeting goes in which room? The heap version pops the room that frees first.',
      'What if the timeline is huge and sparse — does a difference array still fit in memory?',
      'What if rooms have capacities and meetings have sizes?',
    ],
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
    signal: 'Per-query answers over a static interval set — sorting both sides turns it into one sweep with a heap of live candidates.',
    approach: `Answer the queries in increasing order. Push every interval whose start has been
passed into a min-heap keyed by length, then discard heap entries whose end has
already been passed. The heap's root is then the shortest live interval covering
this query, so each query costs a logarithmic amount.`,
    solution: `import heapq


def min_interval(intervals: list[list[int]], queries: list[int]) -> list[int]:
    ordered = sorted(intervals)
    answers: dict[int, int] = {}
    heap: list[tuple[int, int]] = []  # (length, end)
    i = 0

    for q in sorted(queries):
        while i < len(ordered) and ordered[i][0] <= q:
            start, end = ordered[i]
            heapq.heappush(heap, (end - start + 1, end))
            i += 1
        while heap and heap[0][1] < q:  # already ended, so no longer a candidate
            heapq.heappop(heap)
        answers[q] = heap[0][0] if heap else -1

    return [answers[q] for q in queries]`,
    complexity: {
      time: 'O((n + q) log n) — sorting both inputs, plus each interval entering and leaving the heap at most once.',
      space: 'O(n) — the sorted intervals, the heap and the per-query answer map.',
    },
    followUps: [
      'What if queries must be answered online, in the order given? Offline sorting is no longer allowed; use a segment tree.',
      'What if intervals could be added and removed between queries?',
      'Why is popping expired intervals lazily correct rather than deleting them eagerly?',
    ],
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
    signal: 'An in-place matrix rotation — express it as a composition of two simple involutions rather than juggling four cells at once.',
    approach: `Rotating 90 degrees clockwise equals transposing the matrix and then reversing each
row. Both steps are trivially in place, so no temporary matrix is needed and the
four-way index arithmetic that people get wrong disappears. Counter-clockwise is
the same with the reversal applied to columns.`,
    solution: `def rotate(matrix: list[list[int]]) -> None:
    n = len(matrix)

    for r in range(n):  # transpose across the main diagonal
        for c in range(r + 1, n):
            matrix[r][c], matrix[c][r] = matrix[c][r], matrix[r][c]

    for row in matrix:  # then mirror each row
        row.reverse()`,
    complexity: {
      time: 'O(n^2) — each of the n^2 cells is touched a constant number of times across the two passes.',
      space: 'O(1) — every swap is in place; no second matrix is allocated.',
    },
    followUps: [
      'What about rotating counter-clockwise? Transpose, then reverse the columns instead of the rows.',
      'What if the matrix is not square? In-place is impossible, because the shape itself changes.',
      'What if the matrix is huge and stored row-major on disk — is transposition still cheap?',
    ],
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
    signal: 'No algorithm to discover — the whole difficulty is boundary bookkeeping that must stay correct as the region shrinks.',
    approach: `Keep four boundaries and peel one edge at a time, shrinking the corresponding
boundary after each. The trap is the final row or column of a non-square matrix:
after the top and right passes, you must re-check that a row and a column still
remain before walking back, or values get emitted twice.`,
    solution: `def spiral_order(matrix: list[list[int]]) -> list[int]:
    if not matrix or not matrix[0]:
        return []

    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    out: list[int] = []

    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            out.append(matrix[top][c])
        top += 1

        for r in range(top, bottom + 1):
            out.append(matrix[r][right])
        right -= 1

        if top <= bottom:  # re-check: a single row must not be walked twice
            for c in range(right, left - 1, -1):
                out.append(matrix[bottom][c])
            bottom -= 1

        if left <= right:  # re-check: a single column must not be walked twice
            for r in range(bottom, top - 1, -1):
                out.append(matrix[r][left])
            left += 1

    return out`,
    complexity: {
      time: 'O(rows * cols) — every cell is appended exactly once.',
      space: 'O(1) beyond the output — four boundary indices, no visited matrix.',
    },
    followUps: [
      'What if you must generate a spiral matrix rather than read one? Same boundaries, writing instead of reading.',
      'What if the spiral goes counter-clockwise, or starts from the centre?',
      'Why are the two re-checks necessary — which shapes break without them?',
    ],
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
    signal: 'Marks must be recorded before they are acted on — writing zeroes eagerly destroys the information you still need to read.',
    approach: `Zeroing a cell immediately would make later cells look like original zeroes. Use
the first row and first column as the mark storage, with one extra flag for the
first column's own fate. Two passes — mark, then apply — give O(1) extra space
where the obvious solution needs O(rows + cols) sets.`,
    solution: `def set_zeroes(matrix: list[list[int]]) -> None:
    if not matrix or not matrix[0]:
        return

    rows, cols = len(matrix), len(matrix[0])
    first_col_zero = any(matrix[r][0] == 0 for r in range(rows))

    for r in range(rows):  # mark in the first row and column
        for c in range(1, cols):
            if matrix[r][c] == 0:
                matrix[r][0] = 0
                matrix[0][c] = 0

    for r in range(rows - 1, -1, -1):  # apply backwards so marks survive
        for c in range(cols - 1, 0, -1):
            if matrix[r][0] == 0 or matrix[0][c] == 0:
                matrix[r][c] = 0
        if first_col_zero:
            matrix[r][0] = 0`,
    complexity: {
      time: 'O(rows * cols) — two passes over the grid, each doing constant work per cell.',
      space: 'O(1) — the marks live in the first row and column, plus a single boolean flag.',
    },
    followUps: [
      'Why must the apply pass run backwards? Trace what a forward pass does to the marker row.',
      'What if the matrix is sparse? Storing the zero rows and columns as sets is simpler and smaller.',
      'What if the matrix arrives as a stream of updates rather than all at once?',
    ],
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
    signal: 'Repeatedly apply a function until it stabilises — an eventually-periodic sequence, so the failure mode is a cycle.',
    approach: `The digit-square-sum sequence is bounded, so it must eventually repeat: either it
reaches 1 or it enters a cycle. A seen-set detects the cycle in O(1) per step,
and Floyd's tortoise and hare does the same in O(1) space by running the
function at two speeds.`,
    solution: `def is_happy(n: int) -> bool:
    def next_value(x: int) -> int:
        return sum(int(d) ** 2 for d in str(abs(x)))

    slow, fast = n, next_value(n)
    while fast != 1 and slow != fast:
        slow = next_value(slow)
        fast = next_value(next_value(fast))

    return fast == 1`,
    complexity: {
      time: 'O(log n) — each step sums digit squares in O(log n), and only O(log n) steps pass before the value drops below 1000.',
      space: 'O(1) — two running values, versus O(log n) for a seen-set of visited numbers.',
    },
    followUps: [
      'What if the exponent were 3 instead of 2? More cycles exist, but the same detection works.',
      'What if the base were not 10? The bound argument still holds, only the digit extraction changes.',
      'Can you name the unhappy cycle without running the loop? It is the 4, 16, 37, 58, 89, 145, 42, 20 loop.',
    ],
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
    signal: 'Digit-array arithmetic — the whole question is what happens when the carry runs off the front.',
    approach: `Walk from the least significant digit. A digit below 9 absorbs the increment and
you are done immediately; a 9 becomes 0 and the carry continues. If the loop
finishes still carrying, every digit was a 9, so the answer is a 1 followed by
that many zeros — one digit longer than the input.`,
    solution: `def plus_one(digits: list[int]) -> list[int]:
    result = digits[:]

    for i in range(len(result) - 1, -1, -1):
        if result[i] < 9:
            result[i] += 1
            return result
        result[i] = 0  # 9 rolls over and the carry continues

    return [1] + result  # every digit was a 9`,
    complexity: {
      time: 'O(n) worst case — every digit being a 9 makes the carry run the whole way; it is O(1) whenever the last digit is below 9.',
      space: 'O(n) — the copy of the digits; mutating the input in place would make it O(1) extra.',
    },
    followUps: [
      'What if you must add an arbitrary number rather than one? The carry can then exceed a single digit.',
      'What if the digits were stored most-significant-last — does the loop direction flip?',
      'What if the number is stored as a linked list, where you cannot walk backwards?',
    ],
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
    signal: 'Exponentiation where n can be enormous — squaring halves the exponent, so the work is logarithmic rather than linear.',
    approach: `x^n = (x^(n/2))^2 for even n, and one extra factor of x for odd n. Each step halves
the exponent, so only log n multiplications are needed instead of n. A negative
exponent is handled once up front by inverting the base, and n = 0 must return 1
before anything else.`,
    solution: `def my_pow(x: float, n: int) -> float:
    if n < 0:
        x, n = 1 / x, -n

    result = 1.0
    while n:
        if n & 1:  # an odd exponent leaves one factor behind
            result *= x
        x *= x
        n >>= 1

    return result`,
    complexity: {
      time: 'O(log n) — the exponent is halved every iteration, so there are at most log2(n) multiplications.',
      space: 'O(1) — the iterative form uses no recursion stack.',
    },
    followUps: [
      'What if the result must be taken modulo a prime? Reduce at every multiplication, which is modular exponentiation.',
      'What if x is a matrix? The same halving computes Fibonacci in O(log n).',
      'What about floating point drift over many squarings — how much precision is lost?',
    ],
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
    signal: 'Arbitrary-precision multiplication by hand — digit i times digit j always lands at positions i+j and i+j+1.',
    approach: `Allocate m + n digit slots. The product of digits at positions i and j contributes
to slots i+j (the carry) and i+j+1 (the ones), so accumulate there and normalise
carries as you go. That positional identity is what makes the whole thing one
double loop with no string concatenation.`,
    solution: `def multiply(num1: str, num2: str) -> str:
    if num1 == "0" or num2 == "0":
        return "0"

    m, n = len(num1), len(num2)
    digits = [0] * (m + n)

    for i in range(m - 1, -1, -1):
        for j in range(n - 1, -1, -1):
            product = int(num1[i]) * int(num2[j]) + digits[i + j + 1]
            digits[i + j + 1] = product % 10
            digits[i + j] += product // 10  # carry into the higher slot

    out = "".join(map(str, digits)).lstrip("0")
    return out or "0"`,
    complexity: {
      time: 'O(m * n) — every pair of digits is multiplied exactly once, the schoolbook bound.',
      space: 'O(m + n) — the digit accumulator, which is exactly the maximum result width.',
    },
    followUps: [
      'What if the numbers have a million digits? Karatsuba is O(n^1.58) and FFT-based multiplication is O(n log n).',
      'What if negative numbers or decimal points were allowed?',
      'Why is m + n always enough slots — what is the tightest bound on the product\'s digit count?',
    ],
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
    signal: 'Count configurations through a query point — fix the diagonal partner and the other two corners are fully determined.',
    approach: `Iterate over stored points sharing neither coordinate with the query and forming a
proper diagonal, meaning equal horizontal and vertical distance. That pins the
other two corners exactly, so multiply their counts. Storing counts rather than
a point list is what lets duplicates multiply correctly.`,
    solution: `from collections import defaultdict


class DetectSquares:
    def __init__(self) -> None:
        self._counts: dict[tuple[int, int], int] = defaultdict(int)

    def add(self, point: list[int]) -> None:
        self._counts[(point[0], point[1])] += 1

    def count(self, point: list[int]) -> int:
        px, py = point
        total = 0
        for (x, y), n in list(self._counts.items()):
            if abs(x - px) != abs(y - py) or x == px or y == py:
                continue  # not a proper diagonal partner
            # the diagonal pins the other two corners exactly
            total += n * self._counts[(px, y)] * self._counts[(x, py)]
        return total`,
    complexity: {
      time: 'O(1) per add, O(p) per count — a count checks each of the p distinct stored points as a possible diagonal partner.',
      space: 'O(p) — one counter entry per distinct point, so duplicates cost nothing extra.',
    },
    followUps: [
      'What if squares could be rotated off-axis? The diagonal test generalises but the corner lookup does not.',
      'What if points can be removed? Decrement the counter, and drop the key at zero.',
      'What if there are millions of points — would indexing by x and by y beat scanning all of them?',
    ],
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
    signal: 'Everything pairs up except one, and O(1) space is demanded — XOR annihilates pairs and preserves the odd one out.',
    approach: `XOR is its own inverse, so x ^ x is 0, and it is commutative, so order does not
matter. XOR-ing the whole array therefore cancels every pair and leaves the
unique value. A hash set gives the same answer but costs O(n) memory, which the
problem explicitly forbids.`,
    solution: `from functools import reduce
from operator import xor


def single_number(nums: list[int]) -> int:
    return reduce(xor, nums, 0)  # x ^ x == 0, so every pair cancels`,
    complexity: {
      time: 'O(n) — one XOR per element, with no hashing or sorting.',
      space: 'O(1) — a single accumulator, versus O(n) for a set-based solution.',
    },
    followUps: [
      'What if every element appears three times except one? XOR no longer cancels; count bits modulo 3.',
      'What if two elements appear once? Split the array by a set bit of the total XOR.',
      'What if the array is a stream — does XOR still work with no memory of what came before?',
    ],
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
    signal: 'Count set bits — the trick n & (n - 1) clears the lowest set bit, so the loop runs once per one, not once per bit.',
    approach: `Subtracting one flips the lowest set bit to zero and sets everything below it, so
ANDing with the original clears exactly that bit. Looping until zero therefore
iterates once per set bit — far fewer than 32 iterations on sparse values. This
is Brian Kernighan's algorithm.`,
    solution: `def hamming_weight(n: int) -> int:
    count = 0
    while n:
        n &= n - 1  # clears the lowest set bit
        count += 1
    return count`,
    complexity: {
      time: 'O(number of set bits) — at most 32 for a 32-bit word, and far fewer for sparse values.',
      space: 'O(1) — a counter and the working value.',
    },
    followUps: [
      'What if you must do it for every number from 0 to n? Reuse previous answers — that is Counting Bits.',
      'What if the input is a 64-bit or arbitrary-precision integer? The loop bound scales with the set bits, not the width.',
      'How would a lookup table over bytes compare, and when is that actually faster?',
    ],
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
    signal: 'The same count for every number up to n — each answer is one bit-shift away from a smaller answer already computed.',
    approach: `Dropping the lowest bit of i gives i >> 1, whose count is already known, so
bits(i) = bits(i >> 1) + (i & 1). Every value is then O(1) work instead of an
O(32) popcount, and the whole table is linear. i & (i - 1) gives an equally
valid recurrence.`,
    solution: `def count_bits(n: int) -> list[int]:
    out = [0] * (n + 1)
    for i in range(1, n + 1):
        out[i] = out[i >> 1] + (i & 1)  # reuse the answer for i without its last bit
    return out`,
    complexity: {
      time: 'O(n) — each value does one shift, one mask and one addition, reusing an already-computed answer.',
      space: 'O(n) — the output array, which is the required result.',
    },
    followUps: [
      'What if n is 10^9? The output alone is too big, so the question has to change to a per-query popcount.',
      'What if you need the count of set bits over a range sum rather than per value?',
      'Can you derive the same table using i & (i - 1) instead — which recurrence is clearer?',
    ],
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
    signal: 'A fixed-width bit reversal — the width is part of the specification, so leading zeros must be preserved.',
    approach: `Shift the result left and push in the input's lowest bit, thirty-two times exactly.
Looping a fixed 32 times rather than until the value is zero is what preserves
the leading zeros; stopping early would silently truncate them and give the
wrong answer for small inputs.`,
    solution: `def reverse_bits(n: int) -> int:
    result = 0
    for _ in range(32):  # fixed width: stopping early would drop leading zeros
        result = (result << 1) | (n & 1)
        n >>= 1
    return result`,
    complexity: {
      time: 'O(1) — exactly 32 iterations regardless of the input value.',
      space: 'O(1) — one accumulator and the working value.',
    },
    followUps: [
      'What if reverse_bits is called millions of times? Precompute a byte-level table and reverse four bytes.',
      'What if the width were 64 bits, or configurable? The loop bound becomes a parameter.',
      'Can you do it in O(log w) with a divide-and-conquer swap of bit groups?',
    ],
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
    signal: 'One value missing from a known complete range — pair each index with each value and everything cancels except the gap.',
    approach: `XOR every index from 0 to n together with every value in the array. Each present
number is XOR-ed twice and cancels, leaving only the missing one. Summing the
range and subtracting gives the same answer but can overflow fixed-width
integers; XOR never can.`,
    solution: `def missing_number(nums: list[int]) -> int:
    result = len(nums)
    for i, n in enumerate(nums):
        result ^= i ^ n  # every present value cancels against its index
    return result`,
    complexity: {
      time: 'O(n) — one pass with two XORs per element.',
      space: 'O(1) — a single accumulator, with no set and no sorting.',
    },
    followUps: [
      'What if two numbers are missing? XOR gives their combined value; split by a differing bit to separate them.',
      'What if the array is huge and on disk? XOR is associative, so it maps and reduces perfectly.',
      'Why prefer XOR over the sum formula — what breaks first with 32-bit integers?',
    ],
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
    signal: 'Addition with the plus operator banned — XOR is addition without carry, and AND shifted left is the carry.',
    approach: `XOR gives the sum of each bit position ignoring carries; AND then shifted left one
place gives exactly the carries. Repeat until no carry remains. Python's
unbounded integers make negatives loop forever, so mask to 32 bits and convert
the result back from two's complement at the end.`,
    solution: `def get_sum(a: int, b: int) -> int:
    mask = 0xFFFFFFFF
    a, b = a & mask, b & mask

    while b:
        carry = (a & b) << 1  # AND finds the carries
        a = (a ^ b) & mask  # XOR adds without them
        b = carry & mask

    # Python ints are unbounded, so reinterpret as signed 32-bit
    return a if a <= 0x7FFFFFFF else ~(a ^ mask)`,
    complexity: {
      time: 'O(1) — at most 32 iterations, since each round pushes the carry one bit further left.',
      space: 'O(1) — three fixed-width working values.',
    },
    followUps: [
      'Why does the naive loop never terminate for negatives in Python? Trace what the sign extension does to the carry.',
      'How would you implement subtraction, or multiplication, with the same primitives?',
      'What changes for 64-bit operands — is the mask the only thing?',
    ],
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
    signal: 'The reversal itself is easy — the question is really about detecting 32-bit overflow before it happens.',
    approach: `Peel digits off with divmod and rebuild the number, but check before each append
whether the running value has already passed the point where one more digit
would overflow. Checking after the fact is not allowed in a language with
wrapping integers, so the guard must be predictive.`,
    solution: `def reverse_integer(x: int) -> int:
    INT_MAX, INT_MIN = 2**31 - 1, -(2**31)

    sign = -1 if x < 0 else 1
    value = abs(x)
    result = 0

    while value:
        value, digit = divmod(value, 10)
        # check before appending, because after the fact is already too late
        if result > (INT_MAX - digit) // 10:
            return 0
        result = result * 10 + digit

    result *= sign
    return result if INT_MIN <= result <= INT_MAX else 0`,
    complexity: {
      time: 'O(log x) — one iteration per decimal digit, so at most ten for a 32-bit value.',
      space: 'O(1) — three integer accumulators, no string conversion.',
    },
    followUps: [
      'Why check before appending rather than after? In C the addition would already have wrapped.',
      'What about the asymmetry of two\'s complement, where INT_MIN has no positive counterpart?',
      'What if trailing zeros must be preserved, so 1200 reverses to 0021?',
    ],
  },
]
