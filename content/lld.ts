import type { LldPattern, LldQuestion } from '@/lib/content/schema'

// Low-level design bank (spec 6.6c). Python per spec 6.4b: every snippet below was
// executed before it was committed, so the asserts at the foot of each one are true.
// Mermaid classDiagram sources per spec 6.10; every one was parsed before committing.

export const lldPatterns: LldPattern[] = [
  {
    id: 'lldp-solid',
    name: 'SOLID Principles',
    order: 1,
    solves: 'Gives five named reasons a class is hard to change, so "this feels wrong" becomes a specific, arguable defect you can point at.',
    whenWrong: 'Applying all five to a 200-line script. SOLID buys changeability and you pay for it in indirection up front; on code with one implementation and no second caller in sight, an interface per collaborator is cost with no return. Reach for a principle when you can name the change it protects against.',
    notes: [
      'SRP - the smell: you cannot describe the class without saying "and". An Invoice that totals, renders a PDF and emails it has three reasons to change.',
      'OCP - the smell: every new case means editing the same if/elif ladder. New behaviour should arrive as a new class the old code never sees.',
      'LSP - the smell: a subclass raises NotImplementedError, tightens a precondition, or callers isinstance-check before using it.',
      'ISP - the smell: an implementer writes a method body of pass, or raise NotImplementedError, because the interface demanded a method it does not need.',
      'DIP - the smell: a business-logic class imports psycopg2, requests or boto3 at the top of the file. Policy should name an abstraction and be handed the driver.',
    ],
    pitfalls: [
      'SRP read as "one method per class". It is one reason to change, not one thing to do - splitting Order into OrderData and OrderLogic gives you an anaemic model, not SRP.',
      'Adding an interface with exactly one implementation and calling it DIP. If nothing can be substituted, you have added a file and hidden the call site.',
      'LSP violations survive test suites, because tests run against the base or against one subclass, never against both through the same contract. Write one contract test parameterised over every implementation.',
      'Quoting the principles as rules rather than trade-offs. The interviewer is listening for "I applied OCP here because the tax rules change quarterly", not for the acronym expanded.',
    ],
    example: `from abc import ABC, abstractmethod
from dataclasses import dataclass

# SRP: Invoice knows its own totals and nothing about printing or storage.
@dataclass(frozen=True)
class LineItem:
    sku: str
    qty: int
    unit_paise: int

class Invoice:
    def __init__(self, items: list[LineItem]) -> None:
        self._items = list(items)

    def subtotal_paise(self) -> int:
        return sum(i.qty * i.unit_paise for i in self._items)

# OCP: a new tax rule is a new class; Invoice and Billing are never reopened.
class TaxRule(ABC):
    @abstractmethod
    def tax_paise(self, subtotal_paise: int) -> int: ...

class GstRule(TaxRule):
    def __init__(self, percent: int) -> None:
        self._percent = percent

    def tax_paise(self, subtotal_paise: int) -> int:
        return subtotal_paise * self._percent // 100

class ZeroRatedRule(TaxRule):
    # LSP: same contract - an int >= 0, no new exception, no new precondition.
    def tax_paise(self, subtotal_paise: int) -> int:
        return 0

# ISP: a store is asked only to save. It is not forced to implement email() or print().
class InvoiceStore(ABC):
    @abstractmethod
    def save(self, invoice: Invoice, total_paise: int) -> None: ...

class InMemoryStore(InvoiceStore):
    def __init__(self) -> None:
        self.rows: list[tuple[Invoice, int]] = []

    def save(self, invoice: Invoice, total_paise: int) -> None:
        self.rows.append((invoice, total_paise))

# DIP: Billing depends on TaxRule and InvoiceStore, never on GstRule or a concrete DB.
class Billing:
    def __init__(self, rule: TaxRule, store: InvoiceStore) -> None:
        self._rule = rule
        self._store = store

    def finalise(self, invoice: Invoice) -> int:
        subtotal = invoice.subtotal_paise()
        total = subtotal + self._rule.tax_paise(subtotal)
        self._store.save(invoice, total)
        return total

store = InMemoryStore()
inv = Invoice([LineItem("A", 2, 15000), LineItem("B", 1, 5000)])
assert Billing(GstRule(18), store).finalise(inv) == 35000 + 6300
assert Billing(ZeroRatedRule(), store).finalise(inv) == 35000
assert len(store.rows) == 2`,
  },
  {
    id: 'lldp-creational',
    name: 'Creational Patterns',
    order: 2,
    solves: 'Separates deciding which object to build, and how to build it, from the code that uses it.',
    whenWrong: 'A factory for a single concrete class, or a builder for a three-field object. Python already gives you keyword arguments with defaults, @dataclass and __post_init__ validation, so a builder only earns its place when construction has ordering rules, an invariant that can only be checked at the end, or a genuinely fluent step-by-step API.',
    notes: [
      'Factory: a name-to-class registry (a dict) beats an if/elif chain - a new type registers itself and the factory body never changes again.',
      'Builder: use it when an object has many optional parts and one invariant to check at build() time. Return self for chaining, validate in build(), and hand back a frozen value.',
      'Singleton is usually a smell, and you should say so out loud: it is global mutable state with no injection seam, so every test shares one instance and the suite starts depending on test order.',
      'In Python a module-level object already is a per-process singleton - the import system guarantees the module body runs exactly once - and it is one you can pass in, replace or shadow. A class that hides _instance from you cannot be replaced.',
      'If you genuinely need one-per-process (a connection pool), build it once at the composition root and pass it down. "There is one" is fine; "reach for it from anywhere" is the part that hurts.',
    ],
    pitfalls: [
      '__new__-based or metaclass singletons: they break pickling, confuse subclassing, and still run __init__ on every call, so Config("a") then Config("b") silently reconfigures the shared object.',
      'A factory that returns a union of unrelated types pushes an isinstance check onto every caller. If callers must ask what they got, the factory bought you nothing.',
      'A builder that mutates and returns a shared instance: calling build() twice hands back two references to the same mutable object, and a later add() on one changes the other.',
      'Registering classes at import time and then wondering why a subclass is missing - it is missing because its module was never imported. Prefer an explicit register() call at the composition root.',
    ],
    diagram: `classDiagram
    class Notifier {
        +send(to, body) str
    }
    <<abstract>> Notifier
    class SmsNotifier
    class EmailNotifier
    class NotifierFactory {
        -registry Map
        +make_notifier(channel) Notifier
    }
    class PizzaBuilder {
        -size str
        -cheese bool
        -toppings List
        +with_cheese() PizzaBuilder
        +add(topping) PizzaBuilder
        +build() Pizza
    }
    class Pizza {
        +size str
        +cheese bool
        +toppings tuple
    }
    Notifier <|-- SmsNotifier
    Notifier <|-- EmailNotifier
    NotifierFactory --> Notifier : returns
    NotifierFactory o-- SmsNotifier : registered by name
    NotifierFactory o-- EmailNotifier : registered by name
    PizzaBuilder --> Pizza : build() returns a frozen value`,
    example: `from abc import ABC, abstractmethod
from dataclasses import dataclass

# --- Factory: the caller names the channel, not the class. ---
class Notifier(ABC):
    @abstractmethod
    def send(self, to: str, body: str) -> str: ...

class SmsNotifier(Notifier):
    def send(self, to: str, body: str) -> str:
        return f"sms->{to}"

class EmailNotifier(Notifier):
    def send(self, to: str, body: str) -> str:
        return f"email->{to}"

_NOTIFIERS: dict[str, type[Notifier]] = {"sms": SmsNotifier, "email": EmailNotifier}

def make_notifier(channel: str) -> Notifier:
    try:
        return _NOTIFIERS[channel]()
    except KeyError:
        raise ValueError(f"unknown channel: {channel!r}") from None

# --- Builder: many optional parts, and one place that enforces the invariants. ---
@dataclass(frozen=True)
class Pizza:
    size: str
    cheese: bool
    toppings: tuple[str, ...]

class PizzaBuilder:
    def __init__(self, size: str) -> None:
        if size not in {"s", "m", "l"}:
            raise ValueError("size must be s, m or l")
        self._size = size
        self._cheese = False
        self._toppings: list[str] = []

    def with_cheese(self) -> "PizzaBuilder":
        self._cheese = True
        return self

    def add(self, topping: str) -> "PizzaBuilder":
        if len(self._toppings) == 5:
            raise ValueError("at most 5 toppings")
        self._toppings.append(topping)
        return self

    def build(self) -> Pizza:
        return Pizza(self._size, self._cheese, tuple(self._toppings))

# --- Singleton: in Python a module-level object already is one, and it is honest. ---
# A class that hides its own instance is global mutable state with no seam:
# every test that touches it shares the same object, and order of tests starts to matter.
@dataclass(frozen=True)
class Config:
    region: str
    currency: str

config = Config(region="ap-south-1", currency="INR")  # import it, or better, pass it in.

assert make_notifier("sms").send("+9199", "hi") == "sms->+9199"
try:
    make_notifier("pigeon")
except ValueError as exc:
    assert "pigeon" in str(exc)
pizza = PizzaBuilder("m").with_cheese().add("olive").add("basil").build()
assert pizza == Pizza("m", True, ("olive", "basil"))`,
  },
  {
    id: 'lldp-structural',
    name: 'Structural Patterns',
    order: 3,
    solves: 'Changes the shape of an object graph - the interface something presents, the behaviour wrapped around it, or a tree treated as a single thing - without changing the objects themselves.',
    whenWrong: 'Adapting code you own. If you can change the class, change it; an adapter around your own type is a permanent tax paid to avoid a five-minute rename. Decorators are the wrong tool when the added behaviour needs the wrapped object\'s internals - that is a redesign, not a wrapper.',
    notes: [
      'Adapter: an interface you own (the port) plus a thin class that translates a vendor SDK into it. It is the only file that knows the vendor\'s units, field names and error codes.',
      'Decorator: same interface in, same interface out, one behaviour added. Retry, timing, caching, auth and logging all stack this way and each stays independently testable.',
      'Composite: a leaf and a container implement the same method, so size() on a file and on a directory are one call. The base case must return an identity value (0, an empty list) - an empty container is not an error.',
      'All three are about substitutability: if the wrapper is not usable everywhere the wrapped thing was, you have built a new class, not a decorator.',
    ],
    pitfalls: [
      'Decorator order silently changes semantics: retry outside caching retries a cache hit, caching outside retry caches the failure. Decide the order deliberately and write down why.',
      'A composite where only the container has add() pushes isinstance checks back into callers. Either put add() on the base and have leaves reject it, or keep the type distinction and accept the checks - do not half-do it.',
      'Decorators that forget to forward something - __repr__, an extra method, a property - break callers at runtime only. Wrapping a narrow Protocol rather than a rich class keeps the surface small enough to forward honestly.',
      'Composite recursion on a structure that is secretly a graph (hard links, symlinks, a cyclic org chart) never terminates. If links are in scope, you need a visited set.',
    ],
    diagram: `classDiagram
    class PaymentGateway {
        +charge(amountPaise, cardToken) str
    }
    <<interface>> PaymentGateway
    class VendorPayAdapter {
        +charge(amountPaise, cardToken) str
    }
    class VendorPayClient {
        +charge_in_cents(cents, token) Map
    }
    class RetryingGateway {
        +attempts int
        +charge(amountPaise, cardToken) str
    }
    class Node {
        +size_bytes() int
    }
    <<abstract>> Node
    class File {
        +name str
        -size int
    }
    class Directory {
        +name str
        -children List
        +add(child) Directory
    }
    PaymentGateway <|.. VendorPayAdapter
    PaymentGateway <|.. RetryingGateway
    VendorPayAdapter *-- VendorPayClient : adapts the vendor sdk
    RetryingGateway o-- PaymentGateway : decorates any gateway
    Node <|-- File
    Node <|-- Directory
    Directory *-- Node : composite children`,
    example: `from abc import ABC, abstractmethod
from typing import Protocol

# --- Adapter: a vendor SDK we do not control, made to fit the port we own. ---
class VendorPayClient:            # third party, wrong shape, cannot be edited
    def charge_in_cents(self, cents: int, token: str) -> dict[str, str]:
        return {"status": "OK", "ref": f"v-{token}-{cents}"}

class PaymentGateway(Protocol):   # the port our domain speaks
    def charge(self, amount_paise: int, card_token: str) -> str: ...

class VendorPayAdapter:
    def __init__(self, client: VendorPayClient) -> None:
        self._client = client

    def charge(self, amount_paise: int, card_token: str) -> str:
        result = self._client.charge_in_cents(amount_paise, card_token)
        if result["status"] != "OK":
            raise RuntimeError("charge failed")
        return result["ref"]

# --- Decorator: same interface in, same interface out, one behaviour added. ---
class RetryingGateway:
    def __init__(self, inner: PaymentGateway, attempts: int = 3) -> None:
        if attempts < 1:
            raise ValueError("attempts must be >= 1")
        self._inner = inner
        self._attempts = attempts

    def charge(self, amount_paise: int, card_token: str) -> str:
        last: Exception | None = None
        for _ in range(self._attempts):
            try:
                return self._inner.charge(amount_paise, card_token)
            except RuntimeError as exc:
                last = exc
        raise RuntimeError("all attempts failed") from last

# --- Composite: a leaf and a container answer the same question. ---
class Node(ABC):
    @abstractmethod
    def size_bytes(self) -> int: ...

class File(Node):
    def __init__(self, name: str, size: int) -> None:
        self.name, self._size = name, size

    def size_bytes(self) -> int:
        return self._size

class Directory(Node):
    def __init__(self, name: str) -> None:
        self.name = name
        self._children: list[Node] = []

    def add(self, child: Node) -> "Directory":
        self._children.append(child)
        return self

    def size_bytes(self) -> int:
        return sum(c.size_bytes() for c in self._children)   # 0 for an empty dir, not a crash

gateway: PaymentGateway = RetryingGateway(VendorPayAdapter(VendorPayClient()))
assert gateway.charge(19900, "tok_1") == "v-tok_1-19900"
root = Directory("root").add(File("a.txt", 10)).add(Directory("empty"))
assert root.size_bytes() == 10
assert Directory("empty").size_bytes() == 0`,
  },
  {
    id: 'lldp-behavioural',
    name: 'Behavioural Patterns',
    order: 4,
    solves: 'Lets the decision an object makes, the objects it notifies, or the rules it obeys vary at runtime instead of growing a conditional.',
    whenWrong: 'Two cases that will never become three. `if premium: ... else: ...` is clearer than a Strategy hierarchy, and a single status enum beats a class-per-state when every transition is legal. State earns its keep only when there are illegal transitions to reject.',
    notes: [
      'Strategy: lift the varying decision into an object, or in Python often just a function, and pass it in. Pricing, matching, ranking and eviction are all strategies.',
      'Observer: the subject publishes and does not know its listeners. Always hand back an unsubscribe callable, and iterate over a copy of the listener list - a handler that unsubscribes itself mutates the list you are iterating.',
      'State: each state owns its own legal transitions, so an illegal event raises in one place instead of falling through an if-ladder.',
      'When transitions are pure data with no per-state behaviour, a dict[State, frozenset[State]] table beats a class per state - it is shorter, reviewable at a glance, and testable as data.',
    ],
    pitfalls: [
      'An observer that raises: one broken listener must not stop the rest and must not roll back the publisher. Decide - and say - whether delivery is best-effort or transactional.',
      'Synchronous observers become a hidden latency chain: the publisher\'s p99 is the sum of every handler\'s p99.',
      'State objects that hold mutable context leak ownership: if Placed stores the order, two objects now own the same data. Pass the context into handle(event, ctx) and keep state objects stateless and shareable.',
      'Strategies that need to know which concrete strategy they are (an isinstance check in the context) mean the abstraction is at the wrong level - the varying part is not what you pulled out.',
    ],
    diagram: `classDiagram
    class Pricing {
        +total_paise(basePaise, minutes) int
    }
    <<interface>> Pricing
    class FlatHourly {
        -rate_paise int
    }
    class SurgeHourly {
        -multiplier_bp int
    }
    class EventBus {
        -subs Map
        +subscribe(topic, fn) Callable
        +publish(topic, payload)
    }
    class Subscriber {
        +on_event(payload)
    }
    <<interface>> Subscriber
    class OrderState {
        +name str
        +next(event) OrderState
    }
    <<abstract>> OrderState
    class Placed
    class Shipped
    class Delivered
    Pricing <|.. FlatHourly
    Pricing <|.. SurgeHourly
    SurgeHourly o-- Pricing : wraps an inner strategy
    EventBus o-- Subscriber : notifies handlers
    OrderState <|-- Placed
    OrderState <|-- Shipped
    OrderState <|-- Delivered
    Placed --> Shipped : ship
    Shipped --> Delivered : deliver`,
    example: `from abc import ABC, abstractmethod
from typing import Callable, Protocol

# --- Strategy: one varying decision, lifted out and passed in. ---
class Pricing(Protocol):
    def total_paise(self, base_paise: int, minutes: int) -> int: ...

class FlatHourly:
    def __init__(self, rate_paise: int) -> None:
        self._rate = rate_paise

    def total_paise(self, base_paise: int, minutes: int) -> int:
        hours = -(-minutes // 60)                 # ceil, no float rounding
        return base_paise + hours * self._rate

class SurgeHourly:
    def __init__(self, inner: Pricing, multiplier_bp: int) -> None:
        self._inner, self._bp = inner, multiplier_bp

    def total_paise(self, base_paise: int, minutes: int) -> int:
        return self._inner.total_paise(base_paise, minutes) * self._bp // 10_000

# --- Observer: the subject announces; it does not know who listens. ---
class EventBus:
    def __init__(self) -> None:
        self._subs: dict[str, list[Callable[[dict], None]]] = {}

    def subscribe(self, topic: str, fn: Callable[[dict], None]) -> Callable[[], None]:
        self._subs.setdefault(topic, []).append(fn)
        return lambda: self._subs[topic].remove(fn)      # always hand back an unsubscribe

    def publish(self, topic: str, payload: dict) -> None:
        for fn in list(self._subs.get(topic, ())):        # copy: a handler may unsubscribe
            fn(payload)

# --- State: each state owns its own legal transitions, so there is no if-ladder. ---
class OrderState(ABC):
    name: str
    @abstractmethod
    def next(self, event: str) -> "OrderState": ...

class Placed(OrderState):
    name = "placed"
    def next(self, event: str) -> OrderState:
        return Shipped() if event == "ship" else _reject(self, event)

class Shipped(OrderState):
    name = "shipped"
    def next(self, event: str) -> OrderState:
        return Delivered() if event == "deliver" else _reject(self, event)

class Delivered(OrderState):
    name = "delivered"
    def next(self, event: str) -> OrderState:
        return _reject(self, event)                        # terminal

def _reject(state: OrderState, event: str) -> OrderState:
    raise ValueError(f"cannot {event} while {state.name}")

assert FlatHourly(2000).total_paise(5000, 61) == 5000 + 2 * 2000
assert SurgeHourly(FlatHourly(2000), 15_000).total_paise(0, 60) == 3000
bus, seen = EventBus(), []
off = bus.subscribe("order.placed", seen.append)
bus.publish("order.placed", {"id": 1})
off()
bus.publish("order.placed", {"id": 2})
assert seen == [{"id": 1}]
s: OrderState = Placed()
s = s.next("ship").next("deliver")
assert s.name == "delivered"
try:
    s.next("ship")
except ValueError as exc:
    assert str(exc) == "cannot ship while delivered"`,
  },
  {
    id: 'lldp-concurrency',
    name: 'Concurrency in Python',
    order: 5,
    solves: 'Keeps an invariant true when more than one thread can touch it, and moves work between producers and consumers without polling.',
    whenWrong: 'Adding a lock because an object "might be shared". A lock on a thread-confined or immutable object costs contention and deadlock risk and buys nothing. And threads are the wrong tool for CPU-bound Python entirely - the GIL means they will not run your bytecode in parallel, so that work belongs in multiprocessing or a C extension.',
    notes: [
      'The GIL serialises bytecode; it does not make your code atomic. A single bytecode that never re-enters Python is effectively atomic - list.append, deque.append and popleft, d[k] = v for a plain key - which is why queue.Queue needs no lock around it.',
      'Anything read-modify-write or check-then-act is NOT atomic: counter += 1 is LOAD, ADD, STORE, and `if k not in d: d[k] = v` can interleave between the test and the write. Those need a lock even under the GIL.',
      'Lazy init: the simplest thread-safe singleton in Python is a module-level object, because the import system guarantees a module body runs exactly once. Use a lock only when construction must be deferred to first use.',
      'Double-checked locking is safe in CPython because assigning a global is a single atomic store, unlike Java where it needed volatile - but the re-check inside the lock is still what makes it correct.',
      'Producer-consumer: queue.Queue already owns the lock and the condition variable. Shut down with one sentinel per consumer; never poll in a sleep loop.',
      'Free-threaded builds (PEP 703) remove the GIL. Container operations stay individually safe, but every race above becomes easier to hit, not harder - the locks you needed logically are the locks you needed all along.',
    ],
    pitfalls: [
      'Wrapping a queue.Queue in your own lock: pointless, and a fast route to deadlock the moment you hold that lock across a blocking get().',
      'Two code paths that acquire the same two locks in opposite orders will deadlock. Pick a global order (by id, by name) and acquire in it, or hold exactly one lock at a time.',
      'time.time() for timeouts and rate windows: NTP can step it backwards and hand out free quota. Use time.monotonic().',
      'One global lock for everything. One lock per show, per account, per key is the difference between a design that scales and one that serialises the whole process.',
      'Claiming a naive double-checked-locking singleton is "needed for thread safety in Python". It is a Java answer; in Python the module-level object is already correct and the interviewer is listening for whether you know that.',
    ],
    example: `import queue
import threading

# The GIL serialises bytecode, it does not make your code atomic.
# A single bytecode that never calls back into Python is effectively atomic:
#   list.append, deque.append/popleft, dict[k] = v for a plain key.
# Anything that is read-modify-write, or check-then-act, is NOT:
#   counter += 1        -> LOAD, ADD, STORE; a switch between them loses an update
#   if k not in d: ...  -> another thread can insert between the test and the write

class SeatHold:
    """Guards an invariant (a seat is held at most once), so it needs a lock."""

    def __init__(self, seats: set[str]) -> None:
        self._free = set(seats)
        self._held: dict[str, str] = {}
        self._lock = threading.Lock()
        self.rejected = 0

    def hold(self, seat: str, user: str) -> bool:
        with self._lock:                      # check-then-act must be one critical section
            if seat not in self._free:
                self.rejected += 1            # += is inside the lock, so it is safe here
                return False
            self._free.remove(seat)
            self._held[seat] = user
            return True

# Lazy init. The simplest thread-safe singleton in Python is a module-level object:
# the import system guarantees a module body runs exactly once. Only reach for a lock
# when construction must be deferred until first use.
class _Pool:
    built = 0
    def __init__(self) -> None:
        type(self).built += 1

_pool: _Pool | None = None
_pool_lock = threading.Lock()

def get_pool() -> _Pool:
    global _pool
    if _pool is None:                  # fast path, no lock, safe because we never mutate _pool twice
        with _pool_lock:
            if _pool is None:          # re-check: another thread may have won the race
                _pool = _Pool()
    return _pool

# Producer-consumer: queue.Queue already holds the lock and the condition variable.
# Wrapping it in your own lock is a common and pointless mistake.
def run_pipeline(items: list[int], workers: int = 4) -> int:
    q: queue.Queue[int | None] = queue.Queue(maxsize=32)
    results: list[int] = []            # list.append is atomic, so no lock is needed
    def consume() -> None:
        while (item := q.get()) is not None:
            results.append(item * item)
            q.task_done()
        q.task_done()                  # account for the sentinel too
    threads = [threading.Thread(target=consume, daemon=True) for _ in range(workers)]
    for t in threads:
        t.start()
    for item in items:
        q.put(item)
    for _ in threads:
        q.put(None)                    # one sentinel per consumer, never a poll loop
    for t in threads:
        t.join()
    return sum(results)

hold = SeatHold({f"A{i}" for i in range(50)})
winners: list[bool] = []
ts = [threading.Thread(target=lambda: winners.append(hold.hold("A7", "u"))) for _ in range(20)]
for t in ts:
    t.start()
for t in ts:
    t.join()
assert winners.count(True) == 1 and hold.rejected == 19
pools = []
ts = [threading.Thread(target=lambda: pools.append(get_pool())) for _ in range(20)]
for t in ts:
    t.start()
for t in ts:
    t.join()
assert _Pool.built == 1 and all(p is pools[0] for p in pools)
assert run_pipeline(list(range(1, 101))) == sum(i * i for i in range(1, 101))`,
  },
  {
    id: 'lldp-modelling',
    name: 'Modelling Entities from a Statement',
    order: 6,
    solves: 'Turns a paragraph of prose into a small set of classes with clear ownership, before a single method is written.',
    whenWrong: 'Modelling every noun. "The user sees a green confirmation banner" does not need a Banner class. It is also the wrong frame when the problem is genuinely a pipeline of transformations - a few functions over one dataclass beat an object graph.',
    notes: [
      'Nouns are candidate entities, verbs are behaviour, and behaviour tells you where an invariant lives.',
      'Any relationship that carries its own data is a class. "A member borrows a copy" has a taken date, a due date and a return, so Loan is an entity, not a foreign key.',
      'Find the invariant that spans two entities and give it to the aggregate root. "A seat is held by at most one user" belongs to neither Seat nor User - it belongs to ShowInventory.',
      'Value object (frozen, equal by fields) for anything with no identity: money, a date range, a coordinate, a card. Entity (mutable, identified by id) for anything you track over time.',
      'State the cardinality of every relationship out loud - one-to-many, many-to-many, optional or required. Interviewers grade this and most candidates skip it.',
    ],
    pitfalls: [
      'Anaemic models: dataclasses with no behaviour plus an OrderManager that mutates them. Every invariant then lives in whoever remembered to check it.',
      'Bidirectional references (Order.customer and Customer.orders) that must be kept in sync by hand. Pick one owning direction and derive the other.',
      'Floats for money. Integer paise or cents everywhere, or the last unit goes missing and the interviewer will find it.',
      'Naming a class Manager, Handler, Service or Helper. It is usually a sign the behaviour has no owner yet and you have not finished modelling.',
    ],
    example: `from dataclasses import dataclass
from datetime import date

# Statement: "Members borrow copies of a book from a branch for 14 days."
# Nouns -> candidate entities: Member, Book, Copy, Branch, Loan.
# Verbs  -> behaviour, and behaviour tells you who owns the invariant.
# The give-away: "borrow" has a date, a due date and a return - it is not a verb on Book,
# it is an entity in its own right. Any relationship that carries its own data is a class.

@dataclass(frozen=True)
class Book:                 # the title. There is one row per ISBN, not per physical item.
    isbn: str
    title: str

@dataclass(frozen=True)
class Branch:
    code: str

@dataclass
class Copy:                 # the physical item. Book 1--* Copy, Copy *--1 Branch.
    barcode: str
    isbn: str
    branch: str

@dataclass
class Member:
    member_id: str
    max_loans: int = 5

@dataclass
class Loan:                 # the reified relationship: Member *--* Copy, plus dates.
    barcode: str
    member_id: str
    taken_on: date
    due_on: date
    returned_on: date | None = None

    @property
    def is_open(self) -> bool:
        return self.returned_on is None

# The invariant ("a copy is on loan to at most one member, a member holds at most max_loans")
# spans Member and Copy, so it belongs to neither: it belongs to the aggregate root.
class Library:
    def __init__(self) -> None:
        self.copies: dict[str, Copy] = {}
        self.members: dict[str, Member] = {}
        self._open_by_barcode: dict[str, Loan] = {}
        self._open_by_member: dict[str, set[str]] = {}

    def borrow(self, barcode: str, member_id: str, today: date) -> Loan:
        copy = self.copies[barcode]                 # KeyError is the right answer for a bad id
        member = self.members[member_id]
        if barcode in self._open_by_barcode:
            raise ValueError(f"copy {barcode} is already on loan")
        held = self._open_by_member.setdefault(member_id, set())
        if len(held) >= member.max_loans:
            raise ValueError(f"member {member_id} is at the {member.max_loans}-loan limit")
        loan = Loan(barcode, member_id, today, date.fromordinal(today.toordinal() + 14))
        self._open_by_barcode[barcode] = loan
        held.add(barcode)
        _ = copy
        return loan

lib = Library()
lib.copies["b1"] = Copy("b1", "978", "BLR")
lib.members["m1"] = Member("m1", max_loans=1)
loan = lib.borrow("b1", "m1", date(2026, 1, 1))
assert loan.due_on == date(2026, 1, 15) and loan.is_open
try:
    lib.borrow("b1", "m1", date(2026, 1, 2))
except ValueError as exc:
    assert "already on loan" in str(exc)`,
  },
  {
    id: 'lldp-interfaces',
    name: 'Interfaces and Dependency Inversion',
    order: 7,
    solves: 'Fixes what a collaborator must be able to do, so the high-level policy can be written and tested before any implementation exists.',
    whenWrong: 'An interface per class, mechanically. An abstraction with exactly one implementation and no test double is indirection with no payoff. Wait for the second implementation, or for the test that needs a fake, then extract - the extraction is cheap and the guess is not.',
    notes: [
      'Protocol is structural: the implementer never imports you. Right for a port that third-party or pre-existing classes must satisfy, and it keeps test fakes free of inheritance.',
      'ABC is nominal and can carry shared behaviour (a template method). Right when the subclasses are yours and you want instantiation to fail loudly on a missing method.',
      '@runtime_checkable only checks that method names exist, never signatures. An isinstance pass against a Protocol is not proof of compatibility.',
      'Dependency inversion is the point: the policy class names the abstraction and is handed an implementation at the composition root, usually through __init__. Nothing deep in the call tree constructs its own dependency.',
      'Keep the port narrow - just the methods the caller uses. A four-method port is easy to fake correctly; a twenty-method one gets faked wrong.',
    ],
    pitfalls: [
      'Leaky abstractions: a Repository port that returns a database cursor, or lets psycopg2.IntegrityError escape. Translate types and errors at the adapter boundary or the coupling is still there, just further away.',
      'Default method bodies on an ABC that quietly do nothing, so a subclass that forgets to override gets a silent no-op instead of a failure.',
      'Protocols with attributes: `x: int` is satisfied by a property, a class attribute or an instance attribute, and only some of those are writable - so a Protocol that is written to needs care.',
      'Putting the abstraction in the same module as its only implementation. The import direction is the dependency; if policy imports the adapter\'s module to get the port, you have not inverted anything.',
    ],
    example: `from abc import ABC, abstractmethod
from typing import Protocol

# Protocol: structural. The implementer never imports us, so it is the right tool for a
# port that third-party or already-written classes must satisfy.
class SeatStore(Protocol):
    def reserve(self, show_id: str, seats: frozenset[str]) -> bool: ...
    def release(self, show_id: str, seats: frozenset[str]) -> None: ...

# ABC: nominal, and it can carry shared behaviour. Use it when subclasses are yours and
# you want a template method plus a hard failure at construction on a missing method.
class Reranker(ABC):
    @abstractmethod
    def score(self, query: str, doc: str) -> float: ...

    def top_k(self, query: str, docs: list[str], k: int) -> list[str]:
        if k <= 0:
            return []
        ranked = sorted(docs, key=lambda d: self.score(query, d), reverse=True)
        return ranked[:k]                      # slicing past the end is fine, unlike docs[k]

class LengthReranker(Reranker):
    def score(self, query: str, doc: str) -> float:
        return float(len(set(query.split()) & set(doc.split())))

class InMemorySeatStore:                       # note: does not inherit SeatStore
    def __init__(self) -> None:
        self._taken: dict[str, set[str]] = {}

    def reserve(self, show_id: str, seats: frozenset[str]) -> bool:
        taken = self._taken.setdefault(show_id, set())
        if taken & seats:
            return False
        taken |= seats
        return True

    def release(self, show_id: str, seats: frozenset[str]) -> None:
        self._taken.get(show_id, set()).difference_update(seats)

# Dependency inversion: the high-level policy names the abstraction and is handed an
# implementation. BookingService is now testable with a fake and swappable to Postgres.
class BookingService:
    def __init__(self, store: SeatStore) -> None:
        self._store = store

    def book(self, show_id: str, seats: list[str]) -> str:
        if not seats:
            raise ValueError("book at least one seat")
        wanted = frozenset(seats)
        if len(wanted) != len(seats):
            raise ValueError("duplicate seat in request")
        if not self._store.reserve(show_id, wanted):
            raise ValueError("one or more seats are already taken")
        return f"BK-{show_id}-{len(wanted)}"

svc = BookingService(InMemorySeatStore())
assert svc.book("s1", ["A1", "A2"]) == "BK-s1-2"
try:
    svc.book("s1", ["A2"])
except ValueError as exc:
    assert "already taken" in str(exc)
try:
    svc.book("s1", [])
except ValueError as exc:
    assert "at least one" in str(exc)
assert LengthReranker().top_k("red car", ["a red car", "blue"], 5) == ["a red car", "blue"]
assert LengthReranker().top_k("red car", [], 3) == []
try:
    Reranker()                                  # ABC refuses to instantiate; a Protocol would not
except TypeError:
    pass`,
  },
  {
    id: 'lldp-testability',
    name: 'Testability and Seams',
    order: 8,
    solves: 'Puts a seam wherever code touches something you cannot control - time, randomness, the network, the filesystem - so behaviour can be exercised deterministically and instantly.',
    whenWrong: 'Injecting everything. A Clock for a log timestamp nobody asserts on, or a factory for str, is ceremony. Open a seam where a test would otherwise have to sleep, retry, or match a regex against a timestamp.',
    notes: [
      'A hard-coded time.monotonic() inside a method means the only way to test the window is to sleep. A Clock Protocol plus a FakeClock makes the same test exact and instant.',
      'A hard-coded random.choice means tests either seed a module global - which leaks into every other test - or assert nothing. Inject a random.Random instance instead.',
      'Default the seam in the constructor (clock: Clock | None = None, falling back to SystemClock()), so production callers never see it and tests can always reach it.',
      'Prefer a hand-written fake with real behaviour (FakeClock.advance) over a mock that asserts calls. A mock tests that you called something; a fake tests that it worked.',
      'The seam is a design signal, not a test trick: if a class is hard to fake, it usually has too many collaborators or is reaching for globals.',
    ],
    pitfalls: [
      'datetime.now() called twice in one operation gives two different answers. Sample now once at the edge and pass it down through the call.',
      'Monkeypatching a module global in a test (module.time = fake) works until tests run in parallel, and it hides the coupling instead of removing it.',
      'Singletons and module-level caches leak state between tests, so the suite passes alone and fails in order. Anything with process lifetime needs a reset hook or must be constructor-injected.',
      'Injecting the module random rather than a Random instance. random.choice and rng.choice look identical and only one of them is isolated from the rest of the suite.',
    ],
    example: `import random
import time
from typing import Protocol

# Untestable version, and it is untestable for two reasons that look harmless:
#   def allow(self, key): now = time.monotonic()      <- the clock is welded in
#   def pick(self): return random.choice(self.hosts)  <- so is the randomness
# To test the window you must sleep. To test host choice you must seed a global.
# Both are seams that were never opened.

class Clock(Protocol):
    def now(self) -> float: ...

class SystemClock:
    def now(self) -> float:
        return time.monotonic()

class FakeClock:
    def __init__(self, t: float = 0.0) -> None:
        self._t = t

    def now(self) -> float:
        return self._t

    def advance(self, seconds: float) -> None:
        self._t += seconds

class TokenBucket:
    def __init__(self, capacity: int, refill_per_sec: float, clock: Clock | None = None) -> None:
        if capacity <= 0 or refill_per_sec <= 0:
            raise ValueError("capacity and refill rate must be positive")
        self._capacity = capacity
        self._rate = refill_per_sec
        self._clock = clock or SystemClock()      # default for production, seam for tests
        self._tokens = float(capacity)
        self._last = self._clock.now()

    def allow(self, cost: int = 1) -> bool:
        now = self._clock.now()
        elapsed = max(0.0, now - self._last)      # a clock that goes backwards must not mint tokens
        self._last = now
        self._tokens = min(float(self._capacity), self._tokens + elapsed * self._rate)
        if self._tokens < cost:
            return False
        self._tokens -= cost
        return True

class Picker:
    def __init__(self, hosts: list[str], rng: random.Random | None = None) -> None:
        if not hosts:
            raise ValueError("need at least one host")   # never let random.choice([]) raise for you
        self._hosts = list(hosts)
        self._rng = rng or random.Random()        # inject an instance, never touch the module global

    def pick(self) -> str:
        return self._rng.choice(self._hosts)

clock = FakeClock()
bucket = TokenBucket(capacity=2, refill_per_sec=1.0, clock=clock)
assert bucket.allow() and bucket.allow()
assert not bucket.allow()                          # empty, and the test took zero real seconds
clock.advance(1.0)
assert bucket.allow()
clock.advance(3600.0)
assert bucket.allow() and bucket.allow() and not bucket.allow()   # refill is capped at capacity
assert Picker(["a", "b", "c"], random.Random(7)).pick() == Picker(["a", "b", "c"], random.Random(7)).pick()`,
  },
]

export const lldQuestions: LldQuestion[] = [
  {
    id: 'lldq-parking-lot',
    name: 'Parking Lot',
    statement: 'Design a parking lot. It has multiple floors and multiple kinds of parking spot. A vehicle arrives, is given a spot and a ticket, and pays on the way out.',
    clarify: [
      'How many spot sizes are there, and can a smaller vehicle take a larger spot? That single rule decides whether allocation is a dict lookup or a search over sizes.',
      'Is pricing flat, hourly, or slab-based, and does a partial hour round up? The fee function is what they extend at the end, so I want it behind an interface from the first line.',
      'Is payment in scope, or does the ticket just carry an amount? If it is in scope, does the driver pay at a kiosk before exit or at the gate?',
      'Is this one lot in one process, or many lots behind a service? That is the difference between a dict plus a lock and a real persistence and concurrency story.',
      'What are the failure cases you care about - a lost ticket, the same plate parked twice, a full lot? Those are where the invariants live.',
    ],
    entities: [
      'ParkingLot - the aggregate root. It owns the spot index and every open ticket, and it is the only object allowed to decide that a spot is free.',
      'Spot (value object) - id, floor, size. Frozen, because a spot\'s identity never changes; only its occupancy does, and that lives in the index.',
      'Vehicle (value object) - plate and size. The lot reads it and never mutates it.',
      'SpotIndex - one min-heap of (floor, spot_id) per size. take() and give_back() are O(log n) and always fill the lowest floor first, instead of an O(n) scan of every spot.',
      'Ticket - the reified relationship between a Vehicle and a Spot over time: entry, exit, fee. One open ticket per plate, which is what makes double-parking detectable.',
      'Pricing (Strategy) - fee_paise(size, minutes). HourlySlabPricing keeps its slabs in a dict, so a new rate card is data, not a code change.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-creational',
      'lldp-behavioural',
      'lldp-interfaces',
    ],
    extensions: [
      'Add monthly pass holders with reserved spots. (The trap: a reserved spot must leave the free pool entirely, or a pass holder arrives to find a stranger in their spot.)',
      'Two entry gates issue a ticket at the same instant and one spot is left. Show me exactly where the lock goes, and why it is not around the whole lot.',
      'Add electric-vehicle bays where charging is billed per kWh on top of parking time. Does your Pricing strategy still hold, or does it need the spot, not just the size?',
      'The lot has 100,000 spots and a display board shows free-count-per-floor in real time. What changes, and what does the heap cost you now?',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'flipkart',
      'uber',
    ],
    diagram: `classDiagram
    class ParkingLot {
        +park(vehicle, now) Ticket
        +unpark(ticketId, now) int
        +free_count(size) int
    }
    class SpotIndex {
        -free Map
        +take(size) Spot
        +give_back(spotId)
    }
    class Spot {
        +spot_id str
        +floor int
        +size Size
    }
    class Vehicle {
        +plate str
        +size Size
    }
    class Ticket {
        +ticket_id str
        +entry_at datetime
        +exit_at datetime
        +fee_paise int
    }
    class Pricing {
        +fee_paise(size, minutes) int
    }
    <<abstract>> Pricing
    class HourlySlabPricing {
        -first_hour Map
        -per_hour Map
    }
    ParkingLot *-- SpotIndex : owns
    ParkingLot *-- Ticket : issues one per plate
    ParkingLot --> Pricing : strategy
    SpotIndex o-- Spot : indexes by size and floor
    Ticket --> Spot : occupies
    Ticket --> Vehicle : issued to
    Pricing <|-- HourlySlabPricing`,
    solution: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import heapq

class Size(Enum):
    MOTORCYCLE = 1
    COMPACT = 2
    LARGE = 3

@dataclass(frozen=True)
class Vehicle:
    plate: str
    size: Size

@dataclass(frozen=True)
class Spot:
    spot_id: str
    floor: int
    size: Size

class Pricing(ABC):
    @abstractmethod
    def fee_paise(self, size: Size, minutes: int) -> int: ...

class HourlySlabPricing(Pricing):
    """First hour flat, then per started hour. Slabs live in data, not in an if-ladder."""
    def __init__(self, first_hour: dict[Size, int], per_hour: dict[Size, int]) -> None:
        self._first, self._per = first_hour, per_hour

    def fee_paise(self, size: Size, minutes: int) -> int:
        billed = max(1, -(-minutes // 60))            # ceil, minimum one hour
        return self._first[size] + (billed - 1) * self._per[size]

@dataclass
class Ticket:
    ticket_id: str
    plate: str
    spot_id: str
    size: Size
    entry_at: datetime
    exit_at: datetime | None = None
    fee_paise: int | None = None

class SpotIndex:
    """One min-heap per size, keyed by (floor, spot_id) so we always fill the lowest floor.
    O(log n) park and O(log n) release, versus O(n) for a linear scan of every spot."""
    def __init__(self, spots: list[Spot]) -> None:
        self._free: dict[Size, list[tuple[int, str]]] = {s: [] for s in Size}
        self._by_id: dict[str, Spot] = {}
        for spot in spots:
            self._by_id[spot.spot_id] = spot
            heapq.heappush(self._free[spot.size], (spot.floor, spot.spot_id))

    def take(self, size: Size) -> Spot | None:
        # A motorcycle may use a compact or large spot; a large vehicle may not go smaller.
        for candidate in (s for s in Size if s.value >= size.value):
            if self._free[candidate]:
                _, spot_id = heapq.heappop(self._free[candidate])
                return self._by_id[spot_id]
        return None

    def give_back(self, spot_id: str) -> None:
        spot = self._by_id[spot_id]
        heapq.heappush(self._free[spot.size], (spot.floor, spot.spot_id))

    def free_count(self, size: Size) -> int:
        return len(self._free[size])

class ParkingLot:
    def __init__(self, spots: list[Spot], pricing: Pricing) -> None:
        self._index = SpotIndex(spots)
        self._pricing = pricing
        self._open: dict[str, Ticket] = {}
        self._by_plate: dict[str, str] = {}
        self._seq = 0

    def park(self, vehicle: Vehicle, now: datetime) -> Ticket:
        if vehicle.plate in self._by_plate:
            raise ValueError(f"{vehicle.plate} is already parked")   # idempotency guard
        spot = self._index.take(vehicle.size)
        if spot is None:
            raise ValueError("lot full for this vehicle size")
        self._seq += 1
        ticket = Ticket(f"T{self._seq:06d}", vehicle.plate, spot.spot_id, spot.size, now)
        self._open[ticket.ticket_id] = ticket
        self._by_plate[vehicle.plate] = ticket.ticket_id
        return ticket

    def unpark(self, ticket_id: str, now: datetime) -> int:
        ticket = self._open.pop(ticket_id, None)
        if ticket is None:
            raise ValueError("unknown or already-closed ticket")
        del self._by_plate[ticket.plate]
        minutes = max(0, int((now - ticket.entry_at).total_seconds()) // 60)
        ticket.exit_at, ticket.fee_paise = now, self._pricing.fee_paise(ticket.size, minutes)
        self._index.give_back(ticket.spot_id)
        return ticket.fee_paise

    def free_count(self, size: Size) -> int:
        return self._index.free_count(size)

pricing = HourlySlabPricing(
    first_hour={Size.MOTORCYCLE: 2000, Size.COMPACT: 4000, Size.LARGE: 6000},
    per_hour={Size.MOTORCYCLE: 1000, Size.COMPACT: 2000, Size.LARGE: 3000},
)
lot = ParkingLot([Spot("F1-C1", 1, Size.COMPACT), Spot("F2-C1", 2, Size.COMPACT)], pricing)
t0 = datetime(2026, 1, 1, 9, 0)
tk = lot.park(Vehicle("KA01AB1234", Size.COMPACT), t0)
assert tk.spot_id == "F1-C1"                          # lowest floor first
assert lot.unpark(tk.ticket_id, t0) == 4000           # zero minutes still bills one hour
tk2 = lot.park(Vehicle("KA01AB1234", Size.COMPACT), t0)
assert lot.unpark(tk2.ticket_id, t0 + timedelta(minutes=61)) == 4000 + 2000
try:
    lot.unpark(tk2.ticket_id, t0)
except ValueError as exc:
    assert "already-closed" in str(exc)`,
  },
  {
    id: 'lldq-bookmyshow-seat-booking',
    name: 'BookMyShow Seat Booking',
    statement: 'Design the seat booking flow for a cinema ticketing site. A user picks seats for a show, holds them while they pay, and either confirms the booking or loses the hold.',
    clarify: [
      'How long is a seat held before it expires, and does it expire on a background timer or lazily when the next request arrives? Lazy expiry is simpler and has no thread to own.',
      'Can a user pick non-adjacent seats, and do we forbid leaving a single-seat gap? That rule turns selection from a set operation into a search.',
      'Is the inventory in one process, or in a database shared by several servers? That is the difference between a lock and an optimistic UPDATE ... WHERE version = ?.',
      'What must happen if payment succeeds after the hold has already expired - refund, or a best-effort re-grab of the same seats?',
      'Are there seat tiers with different prices, and may one booking mix tiers?',
    ],
    entities: [
      'ShowInventory - the aggregate root and the concurrency boundary. One lock per show, so two shows never contend and a blockbuster does not stall the whole cinema.',
      'Seat (value object) - id, row, number, tier. Immutable; the changing part is its state, which the inventory owns.',
      'SeatState (FREE / HELD / BOOKED) - one dict from seat id to state, so every seat has exactly one owner of truth.',
      'Hold - a short-lived claim: hold id, user, the frozenset of seats, and an expiry instant. Expiry is data, not a timer.',
      'Booking - the confirmed result of a Hold. Created only inside the same critical section that flips the seats to BOOKED.',
      'Show, Screen, Movie - the catalogue side; a Show is the (Movie, Screen, start time) triple that inventory is keyed by.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-concurrency',
      'lldp-interfaces',
      'lldp-testability',
    ],
    extensions: [
      'Two users click the same seat in the same millisecond. Walk me through your code path line by line and tell me who wins and why.',
      'Move the inventory to Postgres. Which of your in-memory decisions survive, and what does a hold become - a row, a lock, or a version number?',
      'Add a waiting list: when a hold expires, offer those seats to whoever asked next, in order.',
      '10,000 users hit one show at 10am. Where does the per-show lock become the bottleneck, and what would you shard on instead?',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'flipkart',
      'uber',
    ],
    diagram: `classDiagram
    class Show {
        +show_id str
        +starts_at datetime
    }
    class ShowInventory {
        -state Map
        -lock Lock
        +available(now) List
        +hold(userId, seatIds, now) Hold
        +confirm(holdId, now) Set
        +cancel_hold(holdId)
    }
    class Seat {
        +seat_id str
        +row str
        +number int
        +tier str
    }
    class SeatState {
        FREE
        HELD
        BOOKED
    }
    <<enumeration>> SeatState
    class Hold {
        +hold_id str
        +user_id str
        +seats Set
        +expires_at datetime
    }
    class Booking {
        +booking_id str
        +seats Set
        +total_paise int
    }
    Show *-- ShowInventory : one inventory per show
    ShowInventory o-- Seat : owns state for
    ShowInventory *-- Hold : creates and expires
    ShowInventory --> SeatState : tracks per seat
    Hold --> Booking : confirms into`,
    solution: `from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import threading

class SeatState(Enum):
    FREE = "free"
    HELD = "held"
    BOOKED = "booked"

@dataclass(frozen=True)
class Seat:
    seat_id: str          # "A1"
    row: str
    number: int
    tier: str             # gold / silver, drives price

@dataclass
class Hold:
    hold_id: str
    show_id: str
    user_id: str
    seats: frozenset[str]
    expires_at: datetime

class ShowInventory:
    """One lock per show, not one global lock: two shows never contend.
    Seat state lives in a single dict so every seat has exactly one owner of truth."""

    def __init__(self, show_id: str, seats: list[Seat], hold_seconds: int = 300) -> None:
        self.show_id = show_id
        self._seats = {s.seat_id: s for s in seats}
        self._state = {s.seat_id: SeatState.FREE for s in seats}
        self._hold_of: dict[str, str] = {}          # seat_id -> hold_id
        self._holds: dict[str, Hold] = {}
        self._lock = threading.Lock()
        self._hold_seconds = hold_seconds
        self._seq = 0

    def _expire_locked(self, now: datetime) -> None:
        for hold in [h for h in self._holds.values() if h.expires_at <= now]:
            self._release_locked(hold)

    def _release_locked(self, hold: Hold) -> None:
        for seat_id in hold.seats:
            if self._state[seat_id] is SeatState.HELD and self._hold_of.get(seat_id) == hold.hold_id:
                self._state[seat_id] = SeatState.FREE
                del self._hold_of[seat_id]
        self._holds.pop(hold.hold_id, None)

    def available(self, now: datetime) -> list[str]:
        with self._lock:
            self._expire_locked(now)
            return sorted(sid for sid, st in self._state.items() if st is SeatState.FREE)

    def hold(self, user_id: str, seat_ids: list[str], now: datetime) -> Hold:
        wanted = frozenset(seat_ids)
        if not wanted:
            raise ValueError("select at least one seat")
        unknown = wanted - self._seats.keys()
        if unknown:
            raise ValueError(f"no such seats: {sorted(unknown)}")
        with self._lock:                              # check-then-act is one critical section
            self._expire_locked(now)
            taken = [s for s in sorted(wanted) if self._state[s] is not SeatState.FREE]
            if taken:
                raise ValueError(f"seats no longer available: {taken}")
            self._seq += 1
            hold = Hold(f"H{self._seq:06d}", self.show_id, user_id, wanted,
                        now + timedelta(seconds=self._hold_seconds))
            for seat_id in wanted:
                self._state[seat_id] = SeatState.HELD
                self._hold_of[seat_id] = hold.hold_id
            self._holds[hold.hold_id] = hold
            return hold

    def confirm(self, hold_id: str, now: datetime) -> frozenset[str]:
        with self._lock:
            self._expire_locked(now)
            hold = self._holds.get(hold_id)
            if hold is None:
                raise ValueError("hold expired or unknown - ask the user to pick again")
            for seat_id in hold.seats:
                self._state[seat_id] = SeatState.BOOKED
                del self._hold_of[seat_id]
            del self._holds[hold_id]
            return hold.seats

    def cancel_hold(self, hold_id: str) -> None:
        with self._lock:
            hold = self._holds.get(hold_id)
            if hold is not None:
                self._release_locked(hold)

t0 = datetime(2026, 3, 1, 18, 0)
seats = [Seat(f"A{i}", "A", i, "gold") for i in range(1, 6)]
inv = ShowInventory("show-1", seats, hold_seconds=300)
h = inv.hold("u1", ["A1", "A2"], t0)
assert inv.available(t0) == ["A3", "A4", "A5"]
try:
    inv.hold("u2", ["A2"], t0)
except ValueError as exc:
    assert "no longer available" in str(exc)
assert inv.available(t0 + timedelta(seconds=301)) == ["A1", "A2", "A3", "A4", "A5"]
try:
    inv.confirm(h.hold_id, t0 + timedelta(seconds=301))
except ValueError as exc:
    assert "expired" in str(exc)
h2 = inv.hold("u2", ["A1"], t0 + timedelta(seconds=302))
assert inv.confirm(h2.hold_id, t0 + timedelta(seconds=303)) == frozenset({"A1"})
assert "A1" not in inv.available(t0 + timedelta(seconds=304))`,
  },
  {
    id: 'lldq-splitwise',
    name: 'Splitwise',
    statement: 'Design Splitwise. Users belong to groups, add expenses that are split between members equally, by exact amount or by percentage, and can see who owes whom.',
    clarify: [
      'Do balances live inside a group only, or do I net them across groups between the same two people? Those are different data models, not a feature flag.',
      'Which split types are in scope for this round - equal, exact, percentage, shares - and can one expense mix them?',
      'How do we handle the rounding remainder when 100 splits three ways? Someone has to absorb the extra unit and the rule must be deterministic, not whoever the dict iterates first.',
      'Is simplify-debts in scope? It changes the model from pairwise edges to a net position per user.',
      'One currency or several? If several, is the exchange rate frozen at expense time or looked up live?',
    ],
    entities: [
      'Expense - who paid, the total, the participants, and which Split was used. Immutable once recorded; an edit is a new version, not a mutation.',
      'Split (Strategy) - EqualSplit, ExactSplit, PercentSplit. The contract is strict: shares() must sum to exactly the total, in integer paise.',
      'BalanceSheet - the aggregate. It holds a net position per user rather than an n-by-n matrix, so a balance is O(1) to read and "who owes whom" is derived on demand.',
      'Settlement - a payment from one user to another; the only other thing that moves a balance.',
      'User and Group - identity and membership. Membership matters because a split must not include a non-member.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-behavioural',
      'lldp-interfaces',
    ],
    extensions: [
      'Implement simplify-debts, then tell me honestly whether your answer is minimal. (It is not - minimising the number of transfers is NP-hard, and saying so is the answer they want.)',
      'Support multiple currencies. Where does the rate live, and at what instant is it frozen?',
      'A user edits an expense from three weeks ago. What happens to the settlements that were made since?',
      'Render the balance page for a user in 200 groups without recomputing from the whole expense log.',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'flipkart',
      'uber',
    ],
    diagram: `classDiagram
    class Group {
        +group_id str
    }
    class User {
        +user_id str
    }
    class Expense {
        +expense_id str
        +paid_by str
        +total_paise int
        +participants tuple
    }
    class Split {
        +shares(totalPaise, participants) Map
    }
    <<abstract>> Split
    class EqualSplit
    class ExactSplit
    class PercentSplit
    class BalanceSheet {
        -net Map
        +add(expense)
        +settle(payer, payee, amountPaise)
        +balances() Map
        +simplify() List
    }
    Group o-- User : members
    Group *-- Expense : records
    Expense *-- Split : split by
    Expense --> User : paid by
    Split <|-- EqualSplit
    Split <|-- ExactSplit
    Split <|-- PercentSplit
    BalanceSheet --> Expense : folds into net position`,
    solution: `from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass
import heapq

# Money is integer paise everywhere. Floats lose the last paisa and the interviewer will ask.

class Split(ABC):
    @abstractmethod
    def shares(self, total_paise: int, participants: list[str]) -> dict[str, int]:
        """Must return a dict whose values sum to exactly total_paise."""

class EqualSplit(Split):
    def shares(self, total_paise: int, participants: list[str]) -> dict[str, int]:
        if not participants:
            raise ValueError("need at least one participant")
        base, extra = divmod(total_paise, len(participants))
        # The remainder is handed out one paisa at a time, deterministically by sorted id.
        order = sorted(participants)
        return {u: base + (1 if i < extra else 0) for i, u in enumerate(order)}

class ExactSplit(Split):
    def __init__(self, amounts: dict[str, int]) -> None:
        self._amounts = dict(amounts)

    def shares(self, total_paise: int, participants: list[str]) -> dict[str, int]:
        if sum(self._amounts.values()) != total_paise:
            raise ValueError("exact shares must sum to the total")
        return dict(self._amounts)

class PercentSplit(Split):
    def __init__(self, basis_points: dict[str, int]) -> None:   # 10_000 bp == 100%
        if sum(basis_points.values()) != 10_000:
            raise ValueError("percentages must sum to 100")
        self._bp = dict(basis_points)

    def shares(self, total_paise: int, participants: list[str]) -> dict[str, int]:
        out = {u: total_paise * bp // 10_000 for u, bp in self._bp.items()}
        drift = total_paise - sum(out.values())      # floor division loses paise; give them away
        out[sorted(out)[0]] += drift
        return out

@dataclass(frozen=True)
class Expense:
    expense_id: str
    group_id: str
    paid_by: str
    total_paise: int
    participants: tuple[str, ...]
    split: Split

class BalanceSheet:
    """Net position per user, not a transaction log: O(1) to read a balance, and
    "who owes whom" is derived on demand rather than maintained as an n-by-n matrix."""

    def __init__(self) -> None:
        self._net: dict[str, int] = defaultdict(int)   # + means the group owes this user

    def add(self, expense: Expense) -> None:
        if expense.total_paise <= 0:
            raise ValueError("expense must be positive")
        shares = expense.split.shares(expense.total_paise, list(expense.participants))
        if sum(shares.values()) != expense.total_paise:
            raise ValueError("split does not sum to the total")
        for user, owed in shares.items():
            self._net[user] -= owed
        self._net[expense.paid_by] += expense.total_paise

    def settle(self, payer: str, payee: str, amount_paise: int) -> None:
        self._net[payer] += amount_paise
        self._net[payee] -= amount_paise

    def balances(self) -> dict[str, int]:
        return {u: v for u, v in self._net.items() if v != 0}

    def simplify(self) -> list[tuple[str, str, int]]:
        """Greedy largest-debtor against largest-creditor. Not provably minimal - that is
        NP-hard - but it clears every balance in at most n-1 transfers, which is the answer
        the interviewer wants plus the honesty about why it is not optimal."""
        debtors = [(v, u) for u, v in self._net.items() if v < 0]      # most negative first
        creditors = [(-v, u) for u, v in self._net.items() if v > 0]   # most positive first
        heapq.heapify(debtors)
        heapq.heapify(creditors)
        transfers: list[tuple[str, str, int]] = []
        while debtors and creditors:
            owed, debtor = heapq.heappop(debtors)
            due, creditor = heapq.heappop(creditors)
            amount = min(-owed, -due)
            transfers.append((debtor, creditor, amount))
            if -owed > amount:
                heapq.heappush(debtors, (owed + amount, debtor))
            if -due > amount:
                heapq.heappush(creditors, (due + amount, creditor))
        return transfers

sheet = BalanceSheet()
sheet.add(Expense("e1", "g1", "alice", 100, ("alice", "bob", "carol"), EqualSplit()))
assert sheet.balances() == {"alice": 66, "bob": -33, "carol": -33}   # 34/33/33, alice paid 100
sheet.add(Expense("e2", "g1", "bob", 3000, ("alice", "bob"),
                  PercentSplit({"alice": 6000, "bob": 4000})))
transfers = sheet.simplify()
assert sum(a for _, _, a in transfers) == sum(v for v in sheet.balances().values() if v > 0)
for debtor, creditor, amount in transfers:
    sheet.settle(debtor, creditor, amount)
assert sheet.balances() == {}`,
  },
  {
    id: 'lldq-elevator-system',
    name: 'Elevator System',
    statement: 'Design an elevator system for a building with several cars. People press hall buttons on floors and floor buttons inside a car, and the system decides which car serves which request.',
    clarify: [
      'How many cars and how many floors, and are there express cars or restricted floors? Restricted floors add an authorisation step to every request.',
      'What are we optimising - average wait, worst-case wait, or energy? The dispatch score is the whole design and it needs a target before I can write it.',
      'Is a hall call directional (separate up and down buttons) or a single call button? Directional calls are what let a car pick people up on the way.',
      'Do you want a time-stepped simulation, or just the answer to "which car, and in what order does it stop"?',
      'Is there a capacity limit, and what should a full car do when it passes a waiting hall call?',
    ],
    entities: [
      'Elevator - one car. Holds its floor, its direction, and two sets of stops (above and below), which is what makes SCAN work and starvation impossible.',
      'Direction (UP / IDLE / DOWN) - an IntEnum-style value so `floor += direction.value` replaces a branch.',
      'HallCall (value object) - a floor plus the direction the rider wants to go. Without the direction a car cannot tell whether it is "on the way".',
      'Dispatcher (Strategy) - scores every car for a call and assigns the cheapest. The scoring function is the interview; keeping it behind one method is what lets it be swapped.',
      'ElevatorSystem - owns the cars and routes external calls; internal (in-car) requests go straight to their own car and never through the dispatcher.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-behavioural',
      'lldp-interfaces',
    ],
    extensions: [
      'Add a capacity limit so a full car skips hall calls but still serves the requests of the people already inside.',
      'Someone on floor 1 has been waiting four minutes while a car shuttles between 8 and 10. Does your algorithm starve them, and can you prove it does not?',
      'Add a maintenance mode and a fire-alarm mode that override normal dispatch. Where do they live so they do not become two more branches in step()?',
      'Change the objective from nearest-car to lowest-estimated-wait, where estimate includes stops and door time. What has to change, and what does not?',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'uber',
      'flipkart',
    ],
    diagram: `classDiagram
    class ElevatorSystem {
        +request(call) Elevator
    }
    class Dispatcher {
        -cost(car, call) tuple
        +assign(call) Elevator
    }
    class Elevator {
        +car_id str
        +floor int
        +direction Direction
        -up_stops Set
        -down_stops Set
        +request(target)
        +step() int
    }
    class HallCall {
        +floor int
        +direction Direction
    }
    class Direction {
        UP
        IDLE
        DOWN
    }
    <<enumeration>> Direction
    ElevatorSystem *-- Dispatcher : owns
    ElevatorSystem *-- Elevator : owns the cars
    Dispatcher o-- Elevator : scores each car
    Dispatcher --> HallCall : assigns
    Elevator --> Direction : travelling
    HallCall --> Direction : requested`,
    solution: `from dataclasses import dataclass
from enum import Enum

class Direction(Enum):
    UP = 1
    IDLE = 0
    DOWN = -1

@dataclass(frozen=True)
class HallCall:
    floor: int
    direction: Direction     # a hall call carries the direction the rider wants to go

class Elevator:
    """SCAN (the disk-elevator algorithm): keep going in one direction while there is any
    stop ahead, then reverse. Two sorted sets, not one queue - "up stops" and "down stops" -
    so the next stop is O(log n) and starvation is impossible."""

    def __init__(self, car_id: str, floors: range, floor: int = 0) -> None:
        if floor not in floors:
            raise ValueError("start floor is outside the building")
        self.car_id = car_id
        self._floors = floors
        self.floor = floor
        self.direction = Direction.IDLE
        self._up_stops: set[int] = set()      # stops at or above, served going up
        self._down_stops: set[int] = set()

    def request(self, target: int) -> None:
        if target not in self._floors:
            raise ValueError(f"no floor {target}")
        if target == self.floor and self.direction is Direction.IDLE:
            return                            # already there, door logic handles it
        (self._up_stops if target > self.floor else self._down_stops).add(target)
        if self.direction is Direction.IDLE:
            self.direction = Direction.UP if target > self.floor else Direction.DOWN

    def pending(self) -> set[int]:
        return self._up_stops | self._down_stops

    def step(self) -> int | None:
        """Advance one floor. Returns the floor if the car stops there, else None."""
        if not self.pending():
            self.direction = Direction.IDLE
            return None
        if self.direction is Direction.UP and not any(f > self.floor for f in self.pending()):
            self.direction = Direction.DOWN
        elif self.direction is Direction.DOWN and not any(f < self.floor for f in self.pending()):
            self.direction = Direction.UP
        self.floor += self.direction.value
        if self.floor in self._up_stops or self.floor in self._down_stops:
            self._up_stops.discard(self.floor)
            self._down_stops.discard(self.floor)
            if not self.pending():
                self.direction = Direction.IDLE
            return self.floor
        return None

class Dispatcher:
    """Assigns a hall call to a car. The scoring function is the whole interview: keep it
    behind one method so the strategy can be swapped without touching Elevator."""

    def __init__(self, cars: list[Elevator]) -> None:
        if not cars:
            raise ValueError("need at least one car")
        self._cars = cars

    def _cost(self, car: Elevator, call: HallCall) -> tuple[int, int]:
        distance = abs(car.floor - call.floor)
        if car.direction is Direction.IDLE:
            return (0, distance)                             # idle car: cheapest
        moving_towards = (call.floor - car.floor) * car.direction.value > 0
        same_way = car.direction is call.direction
        if moving_towards and same_way:
            return (1, distance)                             # on the way, right direction
        return (2, distance + len(car.pending()))            # must turn around

    def assign(self, call: HallCall) -> Elevator:
        car = min(self._cars, key=lambda c: (self._cost(c, call), c.car_id))
        car.request(call.floor)
        return car

lift = Elevator("A", range(0, 11), floor=0)
lift.request(5)
lift.request(3)
stops = [s for _ in range(6) if (s := lift.step()) is not None]
assert stops == [3, 5]                                        # served in path order, not call order
assert lift.direction is Direction.IDLE and lift.floor == 5
lift.request(1)
seen = [s for _ in range(4) if (s := lift.step()) is not None]
assert seen == [1] and lift.floor == 1
idle = Elevator("B", range(0, 11), floor=8)
busy = Elevator("C", range(0, 11), floor=0)
busy.request(10)
assert Dispatcher([idle, busy]).assign(HallCall(9, Direction.DOWN)).car_id == "B"
assert Dispatcher([busy]).assign(HallCall(4, Direction.UP)).car_id == "C"`,
  },
  {
    id: 'lldq-vending-machine',
    name: 'Vending Machine',
    statement: 'Design a vending machine. It accepts coins, lets the user select a product, dispenses it, and returns the correct change.',
    clarify: [
      'Which denominations does it accept, and does it hold a float it can pay change from - or does it go exact-change-only when it runs low?',
      'What is the full list of user actions? Insert, select, refund - and is selecting before paying an error or just a no-op?',
      'What should happen if the machine cannot make change after money is already in? I would refuse the sale and refund the exact coins inserted, but that is a product decision.',
      'Is restocking and an operator maintenance mode in scope for this round?',
      'Notes and cards too, or coins only? Card payment splits the transaction into authorise and capture, which changes the state machine.',
    ],
    entities: [
      'VendingMachine - the context. It holds the current State, the inserted coins, the slots and the coin bank, and it is the only object that mutates them.',
      'State (Idle / HasMoney / Dispensing) - explicit classes, so "select before paying" is a rejected transition rather than an undefined branch of an if-ladder.',
      'Slot - code, product name, price, remaining count. Sold-out is a property of the slot, not a global check.',
      'CoinBank - the float. can_make(amount) returns a plan or None; returning None rather than a partial plan is the case candidates miss.',
      'Product (value object) - name and price. Kept separate from Slot so the same product can sit in two slots.',
    ],
    patterns: [
      'lldp-behavioural',
      'lldp-modelling',
      'lldp-creational',
    ],
    extensions: [
      'The machine holds two 5s and no 1s, and the user is owed 3. What does your code do, and is that what a real machine does?',
      'Add a maintenance mode where an operator restocks and empties the cash box. Which transitions become legal, and which stop being legal?',
      'Make it safe for a machine with two payment terminals feeding one dispenser.',
      'Add card payment, authorised now and captured after dispensing. Does your state machine survive that, or does it need a new state?',
    ],
    minutes: 45,
    companies: [
      'amazon',
      'flipkart',
    ],
    diagram: `classDiagram
    class VendingMachine {
        -inserted Map
        +state str
        +credit int
        +insert(coin) int
        +select(code) tuple
        +refund() Map
    }
    class State {
        +name() str
    }
    <<abstract>> State
    class Idle
    class HasMoney
    class Dispensing
    class Slot {
        +code str
        +price int
        +count int
    }
    class Product {
        +name str
    }
    class CoinBank {
        -counts Map
        +can_make(amount) Map
        +deposit(coins)
        +dispense(plan)
    }
    VendingMachine *-- State : current state
    VendingMachine *-- CoinBank : owns the float
    VendingMachine o-- Slot : stocked with
    Slot --> Product : holds
    State <|-- Idle
    State <|-- HasMoney
    State <|-- Dispensing`,
    solution: `from abc import ABC, abstractmethod
from dataclasses import dataclass

COINS = (1, 2, 5, 10, 20)      # rupees, largest-first greedy is only safe for a canonical system

@dataclass
class Slot:
    code: str                  # "A1"
    name: str
    price: int
    count: int

class CoinBank:
    def __init__(self, floats: dict[int, int]) -> None:
        self._counts = dict(floats)

    def deposit(self, coins: dict[int, int]) -> None:
        for coin, n in coins.items():
            if coin not in COINS:
                raise ValueError(f"machine does not take a {coin} rupee coin")
            self._counts[coin] = self._counts.get(coin, 0) + n

    def can_make(self, amount: int) -> dict[int, int] | None:
        """Greedy is correct for this coin set. It still fails when a denomination has run
        out, so it must return None rather than pretend - that is the case candidates miss."""
        left, plan = amount, {}
        for coin in sorted(COINS, reverse=True):
            take = min(left // coin, self._counts.get(coin, 0))
            if take:
                plan[coin] = take
                left -= take * coin
        return None if left else plan

    def dispense(self, plan: dict[int, int]) -> None:
        for coin, n in plan.items():
            self._counts[coin] -= n

class State(ABC):
    """Explicit states, so "insert coin twice" or "select before paying" is a rejected
    transition rather than an undefined branch of an if-ladder."""
    @abstractmethod
    def name(self) -> str: ...

class Idle(State):
    def name(self) -> str: return "idle"

class HasMoney(State):
    def name(self) -> str: return "has_money"

class Dispensing(State):
    def name(self) -> str: return "dispensing"

class VendingMachine:
    def __init__(self, slots: list[Slot], bank: CoinBank) -> None:
        self._slots = {s.code: s for s in slots}
        self._bank = bank
        self._state: State = Idle()
        self._inserted: dict[int, int] = {}

    @property
    def state(self) -> str:
        return self._state.name()

    @property
    def credit(self) -> int:
        return sum(c * n for c, n in self._inserted.items())

    def insert(self, coin: int) -> int:
        if coin not in COINS:
            raise ValueError(f"unsupported coin: {coin}")
        self._inserted[coin] = self._inserted.get(coin, 0) + 1
        self._state = HasMoney()
        return self.credit

    def refund(self) -> dict[int, int]:
        coins, self._inserted = self._inserted, {}
        self._state = Idle()
        return coins                                # refund the exact coins inserted, always possible

    def select(self, code: str) -> tuple[str, dict[int, int]]:
        slot = self._slots.get(code)
        if slot is None:
            raise ValueError(f"no slot {code}")
        if slot.count == 0:
            raise ValueError(f"{slot.name} is sold out")
        if self.credit < slot.price:
            raise ValueError(f"insert {slot.price - self.credit} more")
        change_plan = self._bank.can_make(self.credit - slot.price)
        if change_plan is None:
            raise ValueError("exact change only - cannot make change for this amount")
        self._state = Dispensing()
        self._bank.deposit(self._inserted)          # only after we know we can complete
        self._bank.dispense(change_plan)
        self._inserted = {}
        slot.count -= 1
        self._state = Idle()
        return slot.name, change_plan

bank = CoinBank({1: 0, 2: 0, 5: 2, 10: 1, 20: 0})
vm = VendingMachine([Slot("A1", "Chips", 25, 1), Slot("A2", "Cola", 30, 0)], bank)
assert vm.state == "idle"
vm.insert(20)
vm.insert(20)
assert vm.credit == 40 and vm.state == "has_money"
name, change = vm.select("A1")
assert name == "Chips" and change == {10: 1, 5: 1}   # 15 back from a 10 and a 5
assert vm.state == "idle" and vm.credit == 0
vm.insert(10)
try:
    vm.select("A1")
except ValueError as exc:
    assert "sold out" in str(exc)
try:
    vm.select("A2")
except ValueError as exc:
    assert "sold out" in str(exc)
assert vm.refund() == {10: 1} and vm.state == "idle"`,
  },
  {
    id: 'lldq-atm',
    name: 'ATM',
    statement: 'Design an ATM. A customer inserts a card, enters a PIN, and can check a balance, withdraw cash, or deposit.',
    clarify: [
      'Is the account balance authoritative here, or is the ATM a client of a banking service? That decides whether I model transactions or just remote calls with compensations.',
      'Which note denominations are loaded, and may I refuse an amount I cannot compose - 2500 when I only hold 2000s?',
      'Are there daily limits, per-transaction limits, or both? And do daily limits reset at wall-clock midnight, in which timezone?',
      'What is the required behaviour if the cash dispenses but the debit fails, or the debit succeeds but the dispenser jams? That ordering is the whole correctness question.',
      'Are PIN retries and card capture in scope?',
    ],
    entities: [
      'Atm - the aggregate. Owns the dispenser, the daily-spend tracker and the lock, and orders the steps so that nothing irreversible happens before every check has passed.',
      'CashDispenser - note counts plus an exact-change planner. It is bounded-knapsack DP, not greedy, because greedy takes the 2000 for 2500 and then cannot finish.',
      'Account - balance in paise and a daily limit. Never a float.',
      'Card and Session - the authenticated context; a session bounds retries and holds the selected account.',
      'Transaction hierarchy (Withdraw / Deposit / BalanceEnquiry) - each with its own preconditions, so the ATM does not grow one method per operation.',
      'InsufficientFunds, LimitExceeded, CannotDispense - three distinct exceptions, because the UI and the audit log need to tell them apart.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-concurrency',
      'lldp-interfaces',
    ],
    extensions: [
      'The dispenser jams after the account is debited. Walk me through your compensation and where the record of it lives.',
      'The same card is used at two ATMs at the same instant. Where is the check, and is an in-process lock enough?',
      'Why is a greedy note algorithm wrong? Show me a note inventory where it fails, and prove your DP finds the answer greedy misses.',
      'Add cash and cheque deposits, where a cheque credits only after clearing.',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'flipkart',
    ],
    diagram: `classDiagram
    class Atm {
        -spent_today Map
        -lock Lock
        +withdraw(accountNo, rupees) Map
        +balance(accountNo) int
    }
    class CashDispenser {
        -notes Map
        +plan(rupees) Map
        +commit(plan)
    }
    class Account {
        +account_no str
        +balance_paise int
        +daily_limit_paise int
    }
    class Session {
        +pin_attempts int
        +selected_account str
    }
    class Card {
        +number str
        +account_no str
    }
    class Transaction {
        +apply(atm)
    }
    <<abstract>> Transaction
    class Withdraw {
        +rupees int
    }
    class Deposit {
        +rupees int
    }
    Atm *-- CashDispenser : owns
    Atm o-- Account : debits
    Atm *-- Session : one per customer
    Session --> Card : authenticated by
    Card --> Account : identifies
    Atm --> Transaction : executes
    Transaction <|-- Withdraw
    Transaction <|-- Deposit`,
    solution: `from dataclasses import dataclass
from enum import Enum
import threading

class TxnType(Enum):
    WITHDRAW = "withdraw"
    DEPOSIT = "deposit"

@dataclass
class Account:
    account_no: str
    balance_paise: int
    daily_limit_paise: int = 4_000_000      # 40,000 rupees

class InsufficientFunds(Exception): ...
class LimitExceeded(Exception): ...
class CannotDispense(Exception): ...

class CashDispenser:
    """Notes are a constraint, not a detail: 2500 is a valid rupee amount and an invalid
    withdrawal if the machine only holds 2000s and 500s in the wrong counts."""

    def __init__(self, notes: dict[int, int]) -> None:
        self._notes = dict(notes)

    def plan(self, rupees: int) -> dict[int, int]:
        """Exact-change DP over available note counts. Greedy is wrong here: with
        {2000: 1, 500: 3} greedy takes the 2000 for 2500 and then cannot finish."""
        if rupees <= 0:
            raise ValueError("amount must be positive")
        best: dict[int, dict[int, int] | None] = {0: {}}
        for note, available in sorted(self._notes.items(), reverse=True):
            nxt = dict(best)
            for amount, plan in best.items():
                if plan is None:
                    continue
                for count in range(1, available + 1):
                    total = amount + note * count
                    if total > rupees or total in nxt:
                        continue
                    nxt[total] = {**plan, note: count}
            best = nxt
        plan = best.get(rupees)
        if plan is None:
            raise CannotDispense(f"cannot make {rupees} from the notes on hand")
        return plan

    def commit(self, plan: dict[int, int]) -> None:
        for note, count in plan.items():
            self._notes[note] -= count

class Atm:
    def __init__(self, dispenser: CashDispenser, accounts: dict[str, Account]) -> None:
        self._dispenser = dispenser
        self._accounts = accounts
        self._spent_today: dict[str, int] = {}
        self._lock = threading.Lock()       # one card, two ATMs: the balance check must be atomic

    def withdraw(self, account_no: str, rupees: int) -> dict[int, int]:
        paise = rupees * 100
        with self._lock:
            account = self._accounts[account_no]
            if paise > account.balance_paise:
                raise InsufficientFunds(f"balance is {account.balance_paise // 100}")
            spent = self._spent_today.get(account_no, 0)
            if spent + paise > account.daily_limit_paise:
                raise LimitExceeded("daily withdrawal limit reached")
            plan = self._dispenser.plan(rupees)      # may raise before any money moves
            self._dispenser.commit(plan)
            account.balance_paise -= paise
            self._spent_today[account_no] = spent + paise
            return plan

    def balance(self, account_no: str) -> int:
        with self._lock:
            return self._accounts[account_no].balance_paise

accounts = {"acc-1": Account("acc-1", 1_000_000, 2_000_000)}
atm = Atm(CashDispenser({2000: 1, 500: 3}), accounts)
assert atm.withdraw("acc-1", 2500) == {500: 1, 2000: 1}
assert atm.balance("acc-1") == 1_000_000 - 250_000
try:
    atm.withdraw("acc-1", 3000)                      # only 500-rupee notes left, 2 of them
except CannotDispense:
    pass
try:
    atm.withdraw("acc-1", 100)
except CannotDispense:
    pass
try:
    Atm(CashDispenser({500: 20}), {"a": Account("a", 10_000_000, 100_000)}).withdraw("a", 5000)
except LimitExceeded:
    pass`,
  },
  {
    id: 'lldq-snake-and-ladder',
    name: 'Snake and Ladder',
    statement: 'Design snake and ladder for N players on a board of M cells, with snakes and ladders at given positions.',
    clarify: [
      'If a ladder lands you on the mouth of a snake, does the jump chain or stop after one hop? Chaining can loop forever on a badly built board, so I need the rule.',
      'Do you need an exact roll to land on the final cell, or does an overshoot win?',
      'Does rolling a six grant another turn, and is there a cap on consecutive sixes?',
      'Is the board given to me, or must I generate a valid one? Generating means validating that no two jumps share a start cell and no ladder goes downwards.',
      'Is this a single-process simulation, or do turns arrive as events from remote players?',
    ],
    entities: [
      'Board - size plus a single dict of jumps. Snakes and ladders are the same thing (a jump from one cell to another), so modelling them as two classes doubles every validation for no gain.',
      'Jump (value object) - start and end, with is_snake derived from end < start. Validated at construction: on the board, not self-looping, and unique by start cell.',
      'Player - id and position. Position 0 means "not on the board yet".',
      'Game - turn order as a deque so rotate() is the whole turn mechanic, plus the win condition and a move log.',
      'Die (Protocol) with RandomDie and ScriptedDie - the seam. Without it every test of the rules needs luck.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-testability',
      'lldp-creational',
    ],
    extensions: [
      'Now generate a random valid board. What makes a board invalid, and can your generator produce one that is unwinnable?',
      'Rolling a six grants another turn. Where does that go so the turn-order code stays one line?',
      'Make a game resumable: save it mid-play and reload it. What is the minimum state?',
      'Run 10,000 concurrent games in one process. What is per-game state and what can be shared?',
    ],
    minutes: 45,
    companies: [
      'amazon',
      'flipkart',
    ],
    diagram: `classDiagram
    class Game {
        -players deque
        +winner str
        +log List
        +play_turn() str
    }
    class Board {
        +size int
        -jumps Map
        +resolve(cell) int
    }
    class Jump {
        +start int
        +end int
        +is_snake bool
    }
    class Player {
        +player_id str
        +position int
    }
    class Die {
        +roll() int
    }
    <<interface>> Die
    class RandomDie {
        -rng Random
    }
    class ScriptedDie {
        -rolls deque
    }
    Game *-- Board : played on
    Game o-- Player : turn order
    Game --> Die : rolls
    Board *-- Jump : snakes and ladders
    Die <|.. RandomDie
    Die <|.. ScriptedDie`,
    solution: `from collections import deque
from dataclasses import dataclass
import random
from typing import Protocol

class Die(Protocol):
    def roll(self) -> int: ...

class RandomDie:
    def __init__(self, faces: int = 6, rng: random.Random | None = None) -> None:
        self._faces, self._rng = faces, rng or random.Random()

    def roll(self) -> int:
        return self._rng.randint(1, self._faces)

class ScriptedDie:                     # the seam that makes the game testable
    def __init__(self, rolls: list[int]) -> None:
        self._rolls = deque(rolls)

    def roll(self) -> int:
        if not self._rolls:
            raise AssertionError("test asked for more rolls than it scripted")
        return self._rolls.popleft()

@dataclass(frozen=True)
class Jump:
    start: int
    end: int

    @property
    def is_snake(self) -> bool:
        return self.end < self.start

class Board:
    """Snakes and ladders are the same thing - a jump - so there is one dict, not two.
    Modelling them separately doubles every validation and every lookup for no gain."""

    def __init__(self, size: int, jumps: list[Jump]) -> None:
        self.size = size
        self._jumps: dict[int, int] = {}
        for jump in jumps:
            if not (1 <= jump.start < size and 1 <= jump.end < size):
                raise ValueError(f"jump {jump} is off the board")
            if jump.start == jump.end:
                raise ValueError("a jump must move the player")
            if jump.start in self._jumps:
                raise ValueError(f"two jumps start at {jump.start}")
            self._jumps[jump.start] = jump.end

    def resolve(self, cell: int) -> int:
        # Single hop only. Chaining is a rules question to ask, and a loop risk if allowed.
        return self._jumps.get(cell, cell)

@dataclass
class Player:
    player_id: str
    position: int = 0

class Game:
    def __init__(self, board: Board, players: list[Player], die: Die) -> None:
        if len(players) < 2:
            raise ValueError("need at least two players")
        self._board, self._die = board, die
        self._players = deque(players)         # rotate() is the turn order, no index arithmetic
        self.winner: str | None = None
        self.log: list[tuple[str, int, int]] = []

    def play_turn(self) -> str | None:
        if self.winner is not None:
            raise ValueError("game is over")
        player = self._players[0]
        roll = self._die.roll()
        target = player.position + roll
        if target > self._board.size:
            self.log.append((player.player_id, roll, player.position))   # overshoot: stay put
        else:
            player.position = self._board.resolve(target)
            self.log.append((player.player_id, roll, player.position))
            if player.position == self._board.size:
                self.winner = player.player_id
                return self.winner
        self._players.rotate(-1)
        return None

board = Board(30, [Jump(3, 22), Jump(27, 5)])
game = Game(board, [Player("p1"), Player("p2")], ScriptedDie([3, 1, 6, 1, 2]))
winner = None
for _ in range(5):
    winner = game.play_turn()
    if winner:
        break
assert winner == "p1"
assert game.log == [("p1", 3, 22), ("p2", 1, 1), ("p1", 6, 28), ("p2", 1, 2), ("p1", 2, 30)]
assert board.resolve(27) == 5 and board.resolve(4) == 4      # a snake and a plain cell
game2 = Game(board, [Player("a"), Player("b")], ScriptedDie([6]))
game2.play_turn()
assert game2.log == [("a", 6, 6)]
try:
    Board(30, [Jump(3, 22), Jump(3, 9)])
except ValueError as exc:
    assert "two jumps start" in str(exc)
try:
    Board(30, [Jump(3, 45)])
except ValueError as exc:
    assert "off the board" in str(exc)`,
  },
  {
    id: 'lldq-tic-tac-toe',
    name: 'Tic-Tac-Toe',
    statement: 'Design tic-tac-toe for two players, and make it work on an n-by-n board rather than only 3x3.',
    clarify: [
      'Fixed 3x3, or n-by-n? Generalising changes win detection from eight hard-coded lines into running counters, and I would rather write the counters from the start.',
      'Is it n-in-a-row on an n-by-n board, or k-in-a-row where k is smaller? Those need different detection.',
      'Two humans, or is a computer player in scope? A bot means a move generator and an evaluation function.',
      'Should an illegal move raise or return a value? I would raise - placing on a taken cell is a caller bug, not a game outcome.',
      'Do you want move history and undo?',
    ],
    entities: [
      'Board - the cells plus four running counters per mark: one per row, one per column, and one for each diagonal. That makes win detection O(1) per move instead of an O(n^2) rescan.',
      'Mark (X / O) - an enum, so the counters can be keyed by it and there is no stringly-typed "X" floating through the code.',
      'Game - whose turn it is, the result, and the mapping from mark to player. It owns the turn rule; Board owns only the geometry.',
      'Result (IN_PROGRESS / WIN / DRAW) - returned from play(), so the caller never has to infer the state from side effects.',
      'Player - id and display name, kept out of Board so the same board can be replayed with different players.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-behavioural',
      'lldp-solid',
    ],
    extensions: [
      'Generalise to k-in-a-row on an n-by-n board. Do your counters still work? (They do not - say so, and describe what replaces them.)',
      'Add an unbeatable computer player, and tell me the search you would use and why it terminates.',
      'Add undo. What is the minimum state you must record per move to reverse the counters?',
      'Detect a draw the moment it becomes unavoidable, not only when the board fills.',
    ],
    minutes: 45,
    companies: [
      'amazon',
      'google',
      'flipkart',
    ],
    diagram: `classDiagram
    class Game {
        +turn Mark
        +result Result
        +winner str
        +play(row, col) Result
    }
    class Board {
        +n int
        +moves int
        -rows Map
        -cols Map
        -diag Map
        -anti Map
        +place(row, col, mark) bool
        +is_full() bool
    }
    class Mark {
        X
        O
    }
    <<enumeration>> Mark
    class Result {
        IN_PROGRESS
        WIN
        DRAW
    }
    <<enumeration>> Result
    class Player {
        +player_id str
        +name str
    }
    Game *-- Board : owns
    Game o-- Player : one per mark
    Game --> Result : returns
    Board --> Mark : counters per mark
    Player --> Mark : plays as`,
    solution: `from enum import Enum

class Mark(Enum):
    X = "X"
    O = "O"

class Result(Enum):
    IN_PROGRESS = "in_progress"
    WIN = "win"
    DRAW = "draw"

class Board:
    """Running line counters, not a re-scan. Four counter arrays - rows, cols, and the two
    diagonals - give O(1) win detection per move and generalise straight to n-by-n."""

    def __init__(self, n: int = 3) -> None:
        if n < 3:
            raise ValueError("board must be at least 3x3")
        self.n = n
        self._cells: list[list[Mark | None]] = [[None] * n for _ in range(n)]
        self._rows = {m: [0] * n for m in Mark}
        self._cols = {m: [0] * n for m in Mark}
        self._diag = {m: 0 for m in Mark}
        self._anti = {m: 0 for m in Mark}
        self.moves = 0

    def at(self, row: int, col: int) -> Mark | None:
        return self._cells[row][col]

    def place(self, row: int, col: int, mark: Mark) -> bool:
        """Returns True if this move wins. Raises on an illegal move rather than returning
        a sentinel: an invalid move is a caller bug, not a game outcome."""
        if not (0 <= row < self.n and 0 <= col < self.n):
            raise ValueError(f"({row},{col}) is off the board")
        if self._cells[row][col] is not None:
            raise ValueError(f"({row},{col}) is already taken")
        self._cells[row][col] = mark
        self.moves += 1
        self._rows[mark][row] += 1
        self._cols[mark][col] += 1
        if row == col:
            self._diag[mark] += 1
        if row + col == self.n - 1:
            self._anti[mark] += 1
        return (self._rows[mark][row] == self.n or self._cols[mark][col] == self.n
                or self._diag[mark] == self.n or self._anti[mark] == self.n)

    def is_full(self) -> bool:
        return self.moves == self.n * self.n

class Game:
    def __init__(self, players: dict[Mark, str], n: int = 3) -> None:
        if set(players) != set(Mark):
            raise ValueError("need exactly one player per mark")
        self.board = Board(n)
        self._players = players
        self._turn = Mark.X                       # X always starts; ask if that is the rule
        self.result = Result.IN_PROGRESS
        self.winner: str | None = None

    @property
    def turn(self) -> Mark:
        return self._turn

    def play(self, row: int, col: int) -> Result:
        if self.result is not Result.IN_PROGRESS:
            raise ValueError("game is already finished")
        won = self.board.place(row, col, self._turn)
        if won:
            self.result, self.winner = Result.WIN, self._players[self._turn]
        elif self.board.is_full():
            self.result = Result.DRAW
        else:
            self._turn = Mark.O if self._turn is Mark.X else Mark.X
        return self.result

game = Game({Mark.X: "asha", Mark.O: "raj"})
for row, col in [(0, 0), (1, 0), (0, 1), (1, 1)]:
    assert game.play(row, col) is Result.IN_PROGRESS
assert game.play(0, 2) is Result.WIN and game.winner == "asha"
try:
    game.play(2, 2)
except ValueError as exc:
    assert "already finished" in str(exc)
draw = Game({Mark.X: "a", Mark.O: "b"})
for row, col in [(0, 0), (0, 1), (0, 2), (1, 1), (1, 0), (1, 2), (2, 1), (2, 0), (2, 2)]:
    last = draw.play(row, col)
assert last is Result.DRAW and draw.winner is None
big = Game({Mark.X: "a", Mark.O: "b"}, n=4)
for i in range(3):
    big.play(i, i)
    big.play(i, (i + 1) % 4)
assert big.play(3, 3) is Result.WIN                # diagonal on a 4x4 board, same code
try:
    big.play(3, 3)
except ValueError as exc:
    assert "already finished" in str(exc)`,
  },
  {
    id: 'lldq-chess',
    name: 'Chess',
    statement: 'Design a chess game: the board, the pieces, legal move generation, and check.',
    clarify: [
      'Full rules including castling, en passant and promotion, or the basic piece geometry in this round? Full rules do not fit in the time, so I want us to agree the cut deliberately.',
      'Move validation only, or a computer opponent as well? A search changes how much move generation has to cost.',
      'Is draw detection in scope - stalemate, threefold repetition, the fifty-move rule?',
      'Do you want move history in algebraic notation, and undo?',
      'Fixed 8x8, or should board size and piece sets be pluggable for variants?',
    ],
    entities: [
      'Piece (ABC) with SlidingPiece, SteppingPiece and Pawn - the taxonomy that matters. Rook, bishop and queen differ only by a direction tuple; knight and king only by a step tuple.',
      'Square (value object) - file and rank, with offset() returning None when it falls off the board. That single choice removes every bounds check from every piece.',
      'Board - a dict from Square to Piece (sparse, 32 entries, not 64 slots), plus the en-passant square and a trial_move context manager for make/unmake.',
      'Move (value object) - from, to, optional promotion. Recorded in history, so undo and repetition detection have something to work on.',
      'Game - whose turn it is, the history, and the one method that separates pseudo-legal from legal by testing whether the mover\'s own king is left in check.',
      'Colour - with an `other` property, because "the other side" appears in every check calculation.',
    ],
    patterns: [
      'lldp-solid',
      'lldp-structural',
      'lldp-behavioural',
      'lldp-modelling',
    ],
    extensions: [
      'Add castling. Which classes change, and what state did you need that you did not already have?',
      'Add checkmate and stalemate detection. What is the difference between them in one line of code?',
      'Threefold repetition needs position equality. Define exactly what "the same position" means - and it is not just the piece placement.',
      'Make legal-move generation fast enough for a search four moves deep. Where does your current design cost you the most?',
    ],
    minutes: 90,
    companies: [
      'amazon',
      'google',
      'meta',
    ],
    diagram: `classDiagram
    class Game {
        +to_move Colour
        +history List
        +legal_moves(from) List
    }
    class Board {
        -squares Map
        +at(square) Piece
        +king_square(colour) Square
        +is_attacked(square, by) bool
        +trial_move(from, to)
    }
    class Square {
        +file int
        +rank int
        +offset(df, dr) Square
    }
    class Move {
        +frm Square
        +to Square
        +promotion str
    }
    class Piece {
        +colour Colour
        +has_moved bool
        +pseudo_moves(from, board) List
    }
    <<abstract>> Piece
    class SlidingPiece {
        +directions tuple
    }
    class SteppingPiece {
        +steps tuple
    }
    class Pawn
    class Rook
    class Knight
    class King
    Game *-- Board : owns
    Game *-- Move : history
    Board o-- Piece : occupied by
    Board --> Square : keyed by
    Move *-- Square : from and to
    Piece <|-- SlidingPiece
    Piece <|-- SteppingPiece
    Piece <|-- Pawn
    SlidingPiece <|-- Rook
    SteppingPiece <|-- Knight
    SteppingPiece <|-- King`,
    solution: `from abc import ABC, abstractmethod
from contextlib import contextmanager
from dataclasses import dataclass
from enum import Enum

class Colour(Enum):
    WHITE = "w"
    BLACK = "b"

    @property
    def other(self) -> "Colour":
        return Colour.BLACK if self is Colour.WHITE else Colour.WHITE

@dataclass(frozen=True)
class Square:
    file: int          # 0..7 = a..h
    rank: int          # 0..7 = 1..8

    def offset(self, df: int, dr: int) -> "Square | None":
        f, r = self.file + df, self.rank + dr
        return Square(f, r) if 0 <= f < 8 and 0 <= r < 8 else None

@dataclass(frozen=True)
class Move:
    frm: Square
    to: Square
    promotion: str | None = None

class Piece(ABC):
    def __init__(self, colour: Colour) -> None:
        self.colour = colour
        self.has_moved = False        # castling and the pawn double-step both need this

    @property
    @abstractmethod
    def letter(self) -> str: ...

    @abstractmethod
    def pseudo_moves(self, frm: Square, board: "Board") -> list[Square]:
        """Legal for this piece's geometry, ignoring whether the king is left in check.
        Splitting pseudo-legal from legal is the single most important decision here:
        every piece stays simple and the check rule lives in exactly one place."""

class SlidingPiece(Piece):
    directions: tuple[tuple[int, int], ...] = ()

    def pseudo_moves(self, frm: Square, board: "Board") -> list[Square]:
        out: list[Square] = []
        for df, dr in self.directions:
            square = frm.offset(df, dr)
            while square is not None:
                occupant = board.at(square)
                if occupant is None:
                    out.append(square)
                else:
                    if occupant.colour is not self.colour:
                        out.append(square)        # capture, then stop
                    break
                square = square.offset(df, dr)
        return out

class Rook(SlidingPiece):
    directions = ((1, 0), (-1, 0), (0, 1), (0, -1))
    @property
    def letter(self) -> str: return "R"

class Bishop(SlidingPiece):
    directions = ((1, 1), (1, -1), (-1, 1), (-1, -1))
    @property
    def letter(self) -> str: return "B"

class Queen(SlidingPiece):
    directions = Rook.directions + Bishop.directions
    @property
    def letter(self) -> str: return "Q"

class SteppingPiece(Piece):
    steps: tuple[tuple[int, int], ...] = ()

    def pseudo_moves(self, frm: Square, board: "Board") -> list[Square]:
        out = []
        for df, dr in self.steps:
            square = frm.offset(df, dr)
            if square is not None:
                occupant = board.at(square)
                if occupant is None or occupant.colour is not self.colour:
                    out.append(square)
        return out

class Knight(SteppingPiece):
    steps = ((1, 2), (2, 1), (2, -1), (1, -2), (-1, -2), (-2, -1), (-2, 1), (-1, 2))
    @property
    def letter(self) -> str: return "N"

class King(SteppingPiece):
    steps = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1))
    @property
    def letter(self) -> str: return "K"

class Pawn(Piece):
    @property
    def letter(self) -> str: return "P"

    def pseudo_moves(self, frm: Square, board: "Board") -> list[Square]:
        step = 1 if self.colour is Colour.WHITE else -1
        out: list[Square] = []
        one = frm.offset(0, step)
        if one is not None and board.at(one) is None:
            out.append(one)
            two = frm.offset(0, 2 * step)
            if not self.has_moved and two is not None and board.at(two) is None:
                out.append(two)
        for df in (-1, 1):
            diag = frm.offset(df, step)
            if diag is None:
                continue
            target = board.at(diag)
            if (target is not None and target.colour is not self.colour) or diag == board.en_passant:
                out.append(diag)
        return out

class Board:
    def __init__(self) -> None:
        self._squares: dict[Square, Piece] = {}
        self.en_passant: Square | None = None

    def at(self, square: Square) -> Piece | None:
        return self._squares.get(square)

    def put(self, square: Square, piece: Piece) -> None:
        self._squares[square] = piece

    def king_square(self, colour: Colour) -> Square:
        for square, piece in self._squares.items():
            if isinstance(piece, King) and piece.colour is colour:
                return square
        raise ValueError(f"no {colour.value} king on the board")

    @contextmanager
    def trial_move(self, frm: Square, to: Square):
        """Make/unmake as a context manager, so the unmake cannot be skipped by an early
        return or an exception. Copying the whole board per candidate move is the other
        option and it is 30x slower once you add search."""
        piece = self._squares.pop(frm)
        captured = self._squares.get(to)
        self._squares[to] = piece
        try:
            yield
        finally:
            self._squares[frm] = piece
            if captured is None:
                del self._squares[to]
            else:
                self._squares[to] = captured

    def is_attacked(self, square: Square, by: Colour) -> bool:
        return any(square in piece.pseudo_moves(frm, self)
                   for frm, piece in list(self._squares.items()) if piece.colour is by)

class Game:
    def __init__(self, board: Board, to_move: Colour = Colour.WHITE) -> None:
        self.board, self.to_move = board, to_move
        self.history: list[Move] = []

    def legal_moves(self, frm: Square) -> list[Square]:
        piece = self.board.at(frm)
        if piece is None or piece.colour is not self.to_move:
            return []
        legal = []
        for to in piece.pseudo_moves(frm, self.board):
            with self.board.trial_move(frm, to):
                in_check = self.board.is_attacked(self.board.king_square(piece.colour),
                                                  piece.colour.other)
            if not in_check:
                legal.append(to)
        return legal

board = Board()
board.put(Square(4, 0), King(Colour.WHITE))       # e1
board.put(Square(4, 1), Rook(Colour.WHITE))       # e2, pinned
board.put(Square(4, 7), Rook(Colour.BLACK))       # e8
board.put(Square(0, 7), King(Colour.BLACK))       # a8
game = Game(board)
pinned = game.legal_moves(Square(4, 1))
assert all(sq.file == 4 for sq in pinned)          # the pinned rook may only move along the file
assert Square(3, 1) not in pinned
assert board.is_attacked(Square(4, 5), Colour.BLACK)
assert Knight(Colour.WHITE).pseudo_moves(Square(0, 0), Board()) == [Square(1, 2), Square(2, 1)]
assert len(King(Colour.WHITE).pseudo_moves(Square(0, 0), Board())) == 3      # corner king`,
  },
  {
    id: 'lldq-deck-of-cards',
    name: 'Deck of Cards',
    statement: 'Design a deck of cards, then use it to deal and score a game of blackjack.',
    clarify: [
      'One pack, or a casino shoe of six or eight? A shoe changes what "the deck is empty" means and adds a cut card.',
      'Which game are we scoring? Blackjack, poker and rummy score the same 52 cards differently, so scoring cannot live on Card.',
      'Are jokers in the deck, and are aces high, low, or both depending on the hand?',
      'Does the shuffle need to be reproducible - for tests, for replay, or for an audit?',
    ],
    entities: [
      'Card (value object) - frozen and ordered, with Rank and Suit as IntEnums. IntEnum matters: a plain Enum has no ordering, so sorted(hand) raises TypeError.',
      'Deck - the undealt cards plus the dealt pile, and an injected random.Random so a test can pin the shuffle.',
      'Hand - the cards one player holds. It knows how to sort itself and nothing about any game\'s rules.',
      'Scorer (Strategy) - BlackjackScorer today, PokerScorer tomorrow. Putting score() on Hand welds one game into the model.',
      'Shoe - the multi-pack extension: several packs plus a cut-card position that triggers a reshuffle.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-creational',
      'lldp-behavioural',
      'lldp-testability',
    ],
    extensions: [
      'Now score a poker hand. Where does that code go, and did you have to change Card at all?',
      'Add a six-deck shoe with a cut card that triggers a reshuffle. What breaks in deal()?',
      'Make the shuffle auditable: prove to a regulator that a given deal came from a given seed.',
      'Deal to six players concurrently from one shoe. What actually needs a lock?',
    ],
    minutes: 45,
    companies: [
      'amazon',
      'meta',
      'flipkart',
    ],
    diagram: `classDiagram
    class Shoe {
        +packs int
        +cut_card int
    }
    class Deck {
        -cards List
        -rng Random
        +shuffle()
        +deal(n) List
        +burn(n)
    }
    class Card {
        +rank Rank
        +suit Suit
    }
    class Rank {
        TWO
        JACK
        ACE
    }
    <<enumeration>> Rank
    class Suit {
        CLUBS
        HEARTS
        SPADES
    }
    <<enumeration>> Suit
    class Hand {
        -cards List
        +add(card)
        +sorted_cards() List
    }
    class Scorer {
        +score(hand) int
    }
    <<interface>> Scorer
    class BlackjackScorer
    Shoe *-- Deck : several packs
    Deck *-- Card : 52 per pack
    Deck --> Hand : deals into
    Hand o-- Card : holds
    Card --> Rank : value
    Card --> Suit : value
    Scorer <|.. BlackjackScorer
    Scorer --> Hand : scores`,
    solution: `from dataclasses import dataclass
from enum import IntEnum
import random

# IntEnum, not Enum: a plain Enum has no ordering, so \`sorted(hand)\` raises TypeError.
# That is the first thing that breaks when you make Card a dataclass with order=True.
class Suit(IntEnum):
    CLUBS = 1
    DIAMONDS = 2
    HEARTS = 3
    SPADES = 4

    @property
    def symbol(self) -> str:
        return self.name[0]

class Rank(IntEnum):
    TWO = 2; THREE = 3; FOUR = 4; FIVE = 5; SIX = 6; SEVEN = 7; EIGHT = 8
    NINE = 9; TEN = 10; JACK = 11; QUEEN = 12; KING = 13; ACE = 14

@dataclass(frozen=True, order=True)
class Card:
    """Frozen and ordered: cards are values, so two Ace-of-spades compare equal and a hand
    sorts without a key function. Mutable cards are the classic bug - one shuffle and every
    hand that "holds" a card sees it change."""
    rank: Rank
    suit: Suit

    def __str__(self) -> str:
        faces = {11: "J", 12: "Q", 13: "K", 14: "A"}
        return f"{faces.get(self.rank.value, self.rank.value)}{self.suit.symbol}"

class Deck:
    def __init__(self, packs: int = 1, rng: random.Random | None = None) -> None:
        if packs < 1:
            raise ValueError("need at least one pack")
        self._rng = rng or random.Random()          # injected, so a test can pin the shuffle
        self._cards = [Card(r, s) for _ in range(packs) for s in Suit for r in Rank]
        self._dealt: list[Card] = []

    def __len__(self) -> int:
        return len(self._cards)

    def shuffle(self) -> None:
        self._rng.shuffle(self._cards)              # Fisher-Yates, uniform; do not hand-roll it

    def deal(self, n: int = 1) -> list[Card]:
        if n <= 0:
            raise ValueError("deal at least one card")
        if n > len(self._cards):
            raise ValueError(f"only {len(self._cards)} cards left, asked for {n}")
        hand, self._cards = self._cards[-n:], self._cards[:-n]   # deal off the top, O(n)
        self._dealt.extend(hand)
        return hand

    def burn(self, n: int = 1) -> None:
        self.deal(n)

class Hand:
    def __init__(self, cards: list[Card] | None = None) -> None:
        self._cards = list(cards or [])

    def add(self, card: Card) -> None:
        self._cards.append(card)

    def sorted_cards(self) -> list[Card]:
        return sorted(self._cards)

class BlackjackScorer:
    """Scoring is a strategy, not a method on Hand: the same 52 cards are scored differently
    by blackjack, poker and rummy. Putting score() on Card or Hand welds one game in."""

    def score(self, hand: Hand) -> int:
        values, aces = 0, 0
        for card in hand.sorted_cards():
            if card.rank is Rank.ACE:
                aces += 1
                values += 11
            else:
                values += min(card.rank.value, 10)
        while values > 21 and aces:                 # soft ace demotion, one at a time
            values -= 10
            aces -= 1
        return values

deck = Deck(rng=random.Random(42))
assert len(deck) == 52
deck.shuffle()
first = deck.deal(5)
assert len(first) == 5 and len(deck) == 47
assert Deck(rng=random.Random(42)).deal(1) == Deck(rng=random.Random(42)).deal(1)
try:
    Deck().deal(53)
except ValueError as exc:
    assert "only 52 cards left" in str(exc)
scorer = BlackjackScorer()
assert scorer.score(Hand([Card(Rank.ACE, Suit.SPADES), Card(Rank.KING, Suit.HEARTS)])) == 21
assert scorer.score(Hand([Card(Rank.ACE, Suit.SPADES), Card(Rank.ACE, Suit.HEARTS),
                          Card(Rank.NINE, Suit.CLUBS)])) == 21
assert scorer.score(Hand([])) == 0                  # empty hand scores 0, it does not crash
assert str(Card(Rank.ACE, Suit.SPADES)) == "AS"`,
  },
  {
    id: 'lldq-logging-framework',
    name: 'Logging Framework',
    statement: 'Design a logging framework: levels, several output destinations, per-module configuration, and a way to add a new destination without touching existing code.',
    clarify: [
      'Are loggers hierarchical by dotted name, so configuring "app" configures "app.payments" too? The whole design hangs on that one answer.',
      'Synchronous or asynchronous writes? Async means a queue, a drain thread, and a flush-on-exit story I need to design for.',
      'Structured key-value records or plain lines? Structured turns a Record from a string into a dict and changes what a formatter is.',
      'Thread-safe only, or multi-process safe? Two processes appending to one file is a different and much harder problem.',
      'Is rotation and retention in scope?',
    ],
    entities: [
      'Logger - hierarchical by dotted name, with a level of None meaning "inherit". A record walks up to the root collecting sinks, which is what makes "configure once at the root" work.',
      'Record (value object) - level, logger name, message, timestamp, context. Frozen, because it is fanned out to several sinks and none of them may edit it.',
      'Level - an IntEnum, so the entire filter is `record.level >= threshold` with no mapping table.',
      'Formatter - Record to string. Separate from Sink so swapping console for file does not change formatting.',
      'Sink (Handler) - where bytes land, with its own level. The pair (Formatter, Sink) is what lets you send JSON to a file and plain text to a console from one logger.',
      'LoggerFactory - a registry, not a singleton class: one module-level object you can replace in a test rather than a hidden class attribute that leaks state between tests.',
    ],
    patterns: [
      'lldp-solid',
      'lldp-structural',
      'lldp-creational',
      'lldp-interfaces',
    ],
    extensions: [
      'Make writes asynchronous without losing records at process exit.',
      'Add rotation at 100MB keeping five files. Where does that live so formatters never learn about it?',
      'Two processes write the same file. What breaks, and what would you do instead?',
      'Add sampling: keep 1% of DEBUG under load, but keep everything for a request that ended in an error. What has to be in the Record for that to be possible?',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'google',
      'flipkart',
    ],
    diagram: `classDiagram
    class LoggerFactory {
        -loggers Map
        +root Logger
        +get(name) Logger
    }
    class Logger {
        +name str
        +level Level
        +propagate bool
        +effective_level() Level
        +log(level, message)
    }
    class Record {
        +level Level
        +logger str
        +message str
        +at float
        +context Map
    }
    class Level {
        DEBUG
        INFO
        WARN
        ERROR
    }
    <<enumeration>> Level
    class Formatter {
        +format(record) str
    }
    <<abstract>> Formatter
    class PlainFormatter
    class Sink {
        +level Level
        +handle(record)
        +write(line)
    }
    <<abstract>> Sink
    class MemorySink
    LoggerFactory *-- Logger : registry
    Logger o-- Logger : parent in the dotted hierarchy
    Logger *-- Sink : attached sinks
    Logger --> Record : creates
    Sink *-- Formatter : renders with
    Sink --> Level : own threshold
    Record --> Level : severity
    Formatter <|-- PlainFormatter
    Sink <|-- MemorySink`,
    solution: `from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import IntEnum
import threading

class Level(IntEnum):          # IntEnum so \`record.level >= self.level\` is the whole filter
    DEBUG = 10
    INFO = 20
    WARN = 30
    ERROR = 40

@dataclass(frozen=True)
class Record:
    level: Level
    logger: str
    message: str
    at: float
    context: dict[str, object] = field(default_factory=dict)

class Formatter(ABC):
    @abstractmethod
    def format(self, record: Record) -> str: ...

class PlainFormatter(Formatter):
    def format(self, record: Record) -> str:
        extra = " ".join(f"{k}={v}" for k, v in sorted(record.context.items()))
        return f"[{record.level.name}] {record.logger}: {record.message}" + (f" {extra}" if extra else "")

class Sink(ABC):
    """A sink is where bytes land. Keep it separate from the formatter: swapping console for
    file must not change formatting, and swapping JSON for plain must not change the sink."""
    def __init__(self, formatter: Formatter, level: Level = Level.DEBUG) -> None:
        self.formatter, self.level = formatter, level

    def handle(self, record: Record) -> None:
        if record.level >= self.level:
            self.write(self.formatter.format(record))

    @abstractmethod
    def write(self, line: str) -> None: ...

class MemorySink(Sink):
    def __init__(self, formatter: Formatter, level: Level = Level.DEBUG) -> None:
        super().__init__(formatter, level)
        self.lines: list[str] = []
        self._lock = threading.Lock()

    def write(self, line: str) -> None:
        with self._lock:                       # list.append alone is atomic; a file write is not
            self.lines.append(line)

class Logger:
    """Hierarchical by dotted name, like logging.Logger. A record walks up to the root
    collecting sinks, which is what makes "configure once at the root" work."""

    def __init__(self, name: str, parent: "Logger | None" = None, clock=None) -> None:
        self.name, self.parent = name, parent
        self.level: Level | None = None        # None means "inherit"
        self.sinks: list[Sink] = []
        self.propagate = True
        self._clock = clock or (lambda: 0.0)

    def effective_level(self) -> Level:
        node: Logger | None = self
        while node is not None:
            if node.level is not None:
                return node.level
            node = node.parent
        return Level.INFO                      # root default, never None

    def log(self, level: Level, message: str, **context: object) -> None:
        if level < self.effective_level():
            return                             # cheap early exit before formatting anything
        record = Record(level, self.name, message, self._clock(), context)
        node: Logger | None = self
        while node is not None:
            for sink in node.sinks:
                sink.handle(record)
            node = node.parent if node.propagate else None

    def debug(self, message: str, **ctx: object) -> None: self.log(Level.DEBUG, message, **ctx)
    def info(self, message: str, **ctx: object) -> None: self.log(Level.INFO, message, **ctx)
    def warn(self, message: str, **ctx: object) -> None: self.log(Level.WARN, message, **ctx)
    def error(self, message: str, **ctx: object) -> None: self.log(Level.ERROR, message, **ctx)

class LoggerFactory:
    """A registry, not a singleton class. It is one module-level object you can replace in a
    test, instead of a hidden class attribute that leaks state between tests."""

    def __init__(self) -> None:
        self._loggers: dict[str, Logger] = {}
        self.root = Logger("root")
        self._loggers["root"] = self.root
        self._lock = threading.RLock()     # RLock: get() recurses to build the parent chain

    def get(self, name: str) -> Logger:
        with self._lock:                       # check-then-create must be one critical section
            existing = self._loggers.get(name)
            if existing is not None:
                return existing
            parent = self.root if "." not in name else self.get(name.rpartition(".")[0])
            logger = Logger(name, parent)
            self._loggers[name] = logger
            return logger

factory = LoggerFactory()
sink = MemorySink(PlainFormatter(), Level.INFO)
factory.root.sinks.append(sink)
factory.root.level = Level.DEBUG
log = factory.get("app.payments.upi")
log.debug("prepare")                                    # passes the logger level, filtered by sink
log.info("charged", order="o-1", paise=19900)
log.error("declined", order="o-2")
assert sink.lines == ["[INFO] app.payments.upi: charged order=o-1 paise=19900",
                      "[ERROR] app.payments.upi: declined order=o-2"]
log.level = Level.ERROR                                 # per-logger override beats the root
sink.lines.clear()
log.info("quiet")
assert sink.lines == []
assert factory.get("app.payments").parent is factory.get("app")
assert factory.get("app").parent is factory.root
assert factory.get("app.payments.upi") is log           # same name, same logger`,
  },
  {
    id: 'lldq-rate-limiter',
    name: 'Rate Limiter',
    statement: 'Design a rate limiter that allows at most N requests per user per time window.',
    clarify: [
      'Limited per user, per IP, per API key - or a combination? And is there a global cap on top of the per-key one?',
      'Is a short burst acceptable, or must the rate be strictly smooth? That is exactly the token-bucket versus sliding-window choice and it should be your decision, not mine.',
      'One process or a fleet? Distributed moves the counter to Redis and the interesting part becomes atomicity, not the algorithm.',
      'On rejection, do we return 429 immediately or queue and delay the request?',
      'Do different endpoints have different limits, and can one request cost more than one unit?',
    ],
    entities: [
      'Limiter (ABC) - allow(key, cost) returning a bool. Three implementations behind it, chosen per rule.',
      'FixedWindowLimiter - a counter per (key, window). Cheapest, and its flaw is the boundary burst: 100 at 0.99s and 100 at 1.01s is 200 in 20ms, all allowed.',
      'SlidingWindowLogLimiter - a deque of timestamps per key, evicted from the left. Exact, but O(limit) memory per key, so it is wrong for a limit of a million.',
      'TokenBucketLimiter - tokens and a last-seen instant per key, refilled lazily on read. O(1) memory, a controlled burst, and no background thread to own or test.',
      'Rule (value object) - limit and window. Data, so a per-endpoint table is configuration rather than code.',
      'Clock (Protocol) with SystemClock and FakeClock - monotonic in production, and the reason none of these tests sleep.',
    ],
    patterns: [
      'lldp-behavioural',
      'lldp-interfaces',
      'lldp-testability',
      'lldp-concurrency',
    ],
    extensions: [
      'Move it behind Redis for four servers. Which of your three implementations survives, and how do you make check-and-decrement atomic there?',
      'Show me the fixed-window boundary burst with concrete numbers, then show me what the sliding window does with the same input.',
      'Add a global limit on top of the per-user one. Do you take both tokens, and what happens if the second check fails after the first succeeded?',
      'The clock steps backwards by five seconds. What does each of your limiters do?',
    ],
    minutes: 45,
    companies: [
      'amazon',
      'google',
      'meta',
      'uber',
    ],
    diagram: `classDiagram
    class Limiter {
        +allow(key, cost) bool
    }
    <<abstract>> Limiter
    class FixedWindowLimiter {
        -counts Map
    }
    class SlidingWindowLogLimiter {
        -hits Map
    }
    class TokenBucketLimiter {
        -state Map
        +capacity int
        +refill_per_sec float
    }
    class Rule {
        +limit int
        +window_seconds float
    }
    class Clock {
        +now() float
    }
    <<interface>> Clock
    class SystemClock
    class FakeClock {
        +advance(seconds)
    }
    Limiter <|-- FixedWindowLimiter
    Limiter <|-- SlidingWindowLogLimiter
    Limiter <|-- TokenBucketLimiter
    FixedWindowLimiter *-- Rule : configured by
    SlidingWindowLogLimiter *-- Rule : configured by
    Limiter --> Clock : reads monotonic time
    Clock <|.. SystemClock
    Clock <|.. FakeClock`,
    solution: `from abc import ABC, abstractmethod
from collections import deque
from dataclasses import dataclass
import threading
import time
from typing import Protocol

class Clock(Protocol):
    def now(self) -> float: ...

class SystemClock:
    def now(self) -> float:
        return time.monotonic()          # monotonic, never wall clock: NTP must not grant quota

class FakeClock:
    def __init__(self, t: float = 0.0) -> None: self._t = t
    def now(self) -> float: return self._t
    def advance(self, seconds: float) -> None: self._t += seconds

@dataclass(frozen=True)
class Rule:
    limit: int
    window_seconds: float

class Limiter(ABC):
    @abstractmethod
    def allow(self, key: str, cost: int = 1) -> bool: ...

class FixedWindowLimiter(Limiter):
    """Cheapest and the one to name as the baseline. Its flaw is the boundary burst: 100
    requests at 0.99s and 100 more at 1.01s is 200 in a 20ms span, all allowed."""

    def __init__(self, rule: Rule, clock: Clock | None = None) -> None:
        self._rule, self._clock = rule, clock or SystemClock()
        self._counts: dict[tuple[str, int], int] = {}
        self._lock = threading.Lock()

    def allow(self, key: str, cost: int = 1) -> bool:
        bucket = int(self._clock.now() // self._rule.window_seconds)
        with self._lock:
            used = self._counts.get((key, bucket), 0)
            if used + cost > self._rule.limit:
                return False
            self._counts[(key, bucket)] = used + cost
            return True

class SlidingWindowLogLimiter(Limiter):
    """Exact, at the cost of O(limit) memory per key. A deque of timestamps, evicted from the
    left. Use it when the limit is small; it is the wrong answer for limit = 1,000,000."""

    def __init__(self, rule: Rule, clock: Clock | None = None) -> None:
        self._rule, self._clock = rule, clock or SystemClock()
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str, cost: int = 1) -> bool:
        now = self._clock.now()
        cutoff = now - self._rule.window_seconds
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) + cost > self._rule.limit:
                return False
            hits.extend([now] * cost)
            return True

class TokenBucketLimiter(Limiter):
    """The production answer: O(1) memory per key, allows a controlled burst up to capacity,
    and smooths to \`refill\` per second after that. Refill is computed lazily on read, so
    there is no background thread to own, restart or test."""

    def __init__(self, capacity: int, refill_per_sec: float, clock: Clock | None = None) -> None:
        if capacity <= 0 or refill_per_sec <= 0:
            raise ValueError("capacity and refill must be positive")
        self._capacity, self._refill = capacity, refill_per_sec
        self._clock = clock or SystemClock()
        self._state: dict[str, tuple[float, float]] = {}      # key -> (tokens, last_seen)
        self._lock = threading.Lock()

    def allow(self, key: str, cost: int = 1) -> bool:
        now = self._clock.now()
        with self._lock:
            tokens, last = self._state.get(key, (float(self._capacity), now))
            tokens = min(float(self._capacity), tokens + max(0.0, now - last) * self._refill)
            if tokens < cost:
                self._state[key] = (tokens, now)
                return False
            self._state[key] = (tokens - cost, now)
            return True

clock = FakeClock()
fixed = FixedWindowLimiter(Rule(limit=2, window_seconds=1.0), clock)
assert fixed.allow("u1") and fixed.allow("u1") and not fixed.allow("u1")
assert fixed.allow("u2")                              # keys are independent
clock.advance(1.0)
assert fixed.allow("u1")                              # new window

clock2 = FakeClock()
sliding = SlidingWindowLogLimiter(Rule(limit=2, window_seconds=1.0), clock2)
assert sliding.allow("u1") and sliding.allow("u1")
clock2.advance(0.9)
assert not sliding.allow("u1")                        # the boundary burst fixed-window allows
clock2.advance(0.2)
assert sliding.allow("u1")

clock3 = FakeClock()
bucket = TokenBucketLimiter(capacity=3, refill_per_sec=1.0, clock=clock3)
assert [bucket.allow("u1") for _ in range(4)] == [True, True, True, False]
clock3.advance(2.0)
assert [bucket.allow("u1") for _ in range(3)] == [True, True, False]
clock3.advance(10_000.0)
assert [bucket.allow("u1") for _ in range(4)] == [True, True, True, False]   # burst capped
assert not TokenBucketLimiter(3, 1.0, FakeClock()).allow("u1", cost=99)      # cost > capacity`,
  },
  {
    id: 'lldq-lru-cache',
    name: 'In-Memory Cache with LRU Eviction',
    statement: 'Design an in-memory cache with a size limit that evicts the least recently used entry when it is full.',
    clarify: [
      'Is capacity a count of entries or a byte budget? A byte budget makes eviction a loop rather than a single pop, and every entry needs a size.',
      'Is a TTL required as well as LRU? Expiry and eviction are different policies and they interact - an expired entry should not count against capacity.',
      'Does it need to be thread-safe? Note that get() mutates, because LRU promotion is a write on the read path.',
      'Do you want hit and miss statistics, and invalidation by key or by prefix?',
      'Should a miss on a hot key block every caller, or is one in-flight fetch shared?',
    ],
    entities: [
      'LruCache - a dict from key to node, plus an intrusive doubly linked list. O(1) get, put and evict.',
      'Node - key, value, prev, next, expiry. __slots__ because there is one per entry and the memory matters.',
      'Sentinel head and tail - the whole trick. With them there is no `if self.head is None` branch anywhere, which is where hand-rolled versions get their off-by-one bugs.',
      'EvictionPolicy - the seam for the follow-up. LRU picks tail.prev; LFU needs a frequency bucket structure instead.',
      'Clock - injected, so TTL expiry is testable without sleeping.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-interfaces',
      'lldp-concurrency',
    ],
    extensions: [
      'Switch the eviction policy to LFU without rewriting the cache.',
      'Make capacity a byte budget instead of an entry count. What changes in put()?',
      'A thousand threads miss the same key at once. How do you avoid a thousand identical backend calls?',
      'Why not just use OrderedDict.move_to_end, or functools.lru_cache? When would you, and when would you not?',
    ],
    minutes: 45,
    companies: [
      'amazon',
      'google',
      'meta',
      'flipkart',
    ],
    diagram: `classDiagram
    class LruCache {
        +capacity int
        -map Map
        -head Node
        -tail Node
        +hits int
        +misses int
        +evictions int
        +get(key) Value
        +put(key, value)
        +keys_mru_first() Iterator
    }
    class Node {
        +key Key
        +value Value
        +expires_at float
        +prev Node
        +next Node
    }
    class Clock {
        +now() float
    }
    <<interface>> Clock
    LruCache *-- Node : owns every entry
    LruCache o-- Node : head and tail sentinels
    Node --> Node : prev and next
    LruCache --> Clock : ttl expiry`,
    solution: `from typing import Generic, Hashable, Iterator, TypeVar
import threading

K = TypeVar("K", bound=Hashable)
V = TypeVar("V")

class Node(Generic[K, V]):
    __slots__ = ("key", "value", "prev", "next", "expires_at")

    def __init__(self, key: K, value: V, expires_at: float | None) -> None:
        self.key, self.value, self.expires_at = key, value, expires_at
        self.prev: Node[K, V] | None = None
        self.next: Node[K, V] | None = None

class LruCache(Generic[K, V]):
    """dict + intrusive doubly linked list with sentinel head and tail. O(1) get, put and
    evict. The sentinels are the point: with them there is no \`if self.head is None\` branch
    anywhere, which is where hand-rolled versions get their off-by-one bugs.

    (In real Python you would reach for OrderedDict.move_to_end, or functools.lru_cache.
    The interviewer wants the list, because it is the part that transfers to other languages.)"""

    def __init__(self, capacity: int, clock=None, ttl_seconds: float | None = None) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self._capacity = capacity
        self._ttl = ttl_seconds
        self._clock = clock or (lambda: 0.0)
        self._map: dict[K, Node[K, V]] = {}
        self._head: Node[K, V] = Node(None, None, None)   # most recent side
        self._tail: Node[K, V] = Node(None, None, None)   # least recent side
        self._head.next, self._tail.prev = self._tail, self._head
        self._lock = threading.Lock()
        self.hits = self.misses = self.evictions = 0

    def __len__(self) -> int:
        return len(self._map)

    def _unlink(self, node: Node[K, V]) -> None:
        node.prev.next, node.next.prev = node.next, node.prev

    def _push_front(self, node: Node[K, V]) -> None:
        node.prev, node.next = self._head, self._head.next
        self._head.next.prev = node
        self._head.next = node

    def _expired(self, node: Node[K, V]) -> bool:
        return node.expires_at is not None and node.expires_at <= self._clock()

    def get(self, key: K) -> V | None:
        with self._lock:
            node = self._map.get(key)
            if node is None:
                self.misses += 1
                return None
            if self._expired(node):
                self._unlink(node)
                del self._map[key]
                self.misses += 1
                return None
            self._unlink(node)
            self._push_front(node)
            self.hits += 1
            return node.value

    def put(self, key: K, value: V) -> None:
        with self._lock:
            node = self._map.get(key)
            expires = None if self._ttl is None else self._clock() + self._ttl
            if node is not None:
                node.value, node.expires_at = value, expires   # update in place, then promote
                self._unlink(node)
                self._push_front(node)
                return
            if len(self._map) >= self._capacity:
                victim = self._tail.prev
                self._unlink(victim)
                del self._map[victim.key]
                self.evictions += 1
            node = Node(key, value, expires)
            self._map[key] = node
            self._push_front(node)

    def keys_mru_first(self) -> Iterator[K]:
        node = self._head.next
        while node is not self._tail:
            yield node.key
            node = node.next

cache: LruCache[str, int] = LruCache(capacity=2)
cache.put("a", 1)
cache.put("b", 2)
assert cache.get("a") == 1                     # "a" is now the most recent
cache.put("c", 3)                              # evicts "b", not "a"
assert cache.get("b") is None and cache.get("a") == 1 and cache.get("c") == 3
assert list(cache.keys_mru_first()) == ["c", "a"]
assert cache.evictions == 1 and cache.hits == 3 and cache.misses == 1
cache.put("c", 30)                             # update must not evict or grow
assert len(cache) == 2 and cache.get("c") == 30

now = [0.0]
ttl: LruCache[str, int] = LruCache(capacity=4, clock=lambda: now[0], ttl_seconds=5.0)
ttl.put("k", 9)
now[0] = 4.9
assert ttl.get("k") == 9
now[0] = 5.0
assert ttl.get("k") is None and len(ttl) == 0   # expired entries are unlinked, not just hidden
try:
    LruCache(0)
except ValueError as exc:
    assert "positive" in str(exc)
single: LruCache[str, int] = LruCache(capacity=1)
single.put("x", 1)
single.put("y", 2)
assert single.get("x") is None and list(single.keys_mru_first()) == ["y"]`,
  },
  {
    id: 'lldq-notification-service',
    name: 'Notification Service',
    statement: 'Design a notification service that delivers messages to users over SMS, email and push, honouring user preferences and retrying failures.',
    clarify: [
      'Are channels a fan-out (send on all of them) or a fallback chain (SMS only if push failed)? Those have completely different retry semantics.',
      'Are user preferences and quiet hours in scope, and does a critical message like an OTP override them?',
      'Is delivery at-least-once with de-duplication, or at-most-once? At-least-once means I need an idempotency key derived from content, not a generated id.',
      'Do templates live in this service, and are they per-channel? An SMS body and an email body are not the same string.',
      'Is per-user rate limiting in scope, so nobody gets forty pushes in a minute?',
    ],
    entities: [
      'Notification (value object) - user, template, params, channels, priority. Frozen and hashable, because it is the key that de-duplication fingerprints.',
      'Channel (SMS / EMAIL / PUSH) and a Sender Protocol per channel - the adapter boundary where a vendor SDK is translated into SENT / RETRYABLE / PERMANENT.',
      'Template - per-channel bodies, rendered with the notification\'s params, failing loudly on a missing param rather than emitting "Your code is {code}".',
      'UserPrefs - enabled channels, quiet hours, and the address per channel. A missing address is a skip, not a crash.',
      'Deduper - fingerprints (user, template, params, channel). Retries and at-least-once queues mean the same notification will arrive twice.',
      'RetryPolicy - attempts and exponential backoff, returning a delay for the scheduler rather than sleeping in the request path.',
      'Dead-letter list - where a PERMANENT failure or an exhausted retry lands, so nothing is silently dropped.',
    ],
    patterns: [
      'lldp-solid',
      'lldp-behavioural',
      'lldp-interfaces',
      'lldp-testability',
    ],
    extensions: [
      'The SMS vendor is down for ten minutes. Describe your system at minute eleven.',
      'Turn the fan-out into a fallback chain. What changes, and what does "delivered" mean now?',
      'Add scheduled and recurring notifications.',
      'Prove to me that the same OTP is never sent twice when the queue redelivers the same message.',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'meta',
      'flipkart',
      'uber',
    ],
    diagram: `classDiagram
    class NotificationService {
        +dead_letter List
        +send(notification, hour) Map
    }
    class Notification {
        +user_id str
        +template_id str
        +params tuple
        +channels tuple
        +priority int
    }
    class UserPrefs {
        +enabled Set
        +quiet_hours tuple
        +addresses Map
    }
    class Template {
        +template_id str
        +render(channel, params) str
    }
    class Channel {
        SMS
        EMAIL
        PUSH
    }
    <<enumeration>> Channel
    class Sender {
        +channel Channel
        +send(to, body) SendResult
    }
    <<interface>> Sender
    class SmsSender
    class EmailSender
    class Deduper {
        +fingerprint(notification, channel) str
        +first_time(key) bool
    }
    class RetryPolicy {
        +max_attempts int
        +delay_for(attempt) float
    }
    NotificationService *-- Deduper : owns
    NotificationService *-- RetryPolicy : owns
    NotificationService o-- Sender : one per channel
    NotificationService o-- Template : template registry
    NotificationService o-- UserPrefs : reads preferences
    NotificationService --> Notification : delivers
    Notification --> Channel : requested channels
    Sender <|.. SmsSender
    Sender <|.. EmailSender`,
    solution: `from dataclasses import dataclass, field
from enum import Enum
import hashlib
from typing import Protocol

class Channel(Enum):
    SMS = "sms"
    EMAIL = "email"
    PUSH = "push"

@dataclass(frozen=True)
class Notification:
    notification_id: str
    user_id: str
    template_id: str
    params: tuple[tuple[str, str], ...]      # tuple, not dict, so the record stays hashable
    channels: tuple[Channel, ...]
    priority: int = 5                        # 1 is highest; OTP is 1, marketing is 9

@dataclass
class UserPrefs:
    user_id: str
    enabled: frozenset[Channel]
    quiet_hours: tuple[int, int] | None = None      # (22, 7) local
    addresses: dict[Channel, str] = field(default_factory=dict)

class SendResult(Enum):
    SENT = "sent"
    RETRYABLE = "retryable"
    PERMANENT = "permanent"

class Sender(Protocol):
    channel: Channel
    def send(self, to: str, body: str) -> SendResult: ...

class Template:
    def __init__(self, template_id: str, bodies: dict[Channel, str]) -> None:
        self.template_id, self._bodies = template_id, bodies

    def render(self, channel: Channel, params: dict[str, str]) -> str:
        body = self._bodies.get(channel)
        if body is None:
            raise KeyError(f"template {self.template_id} has no {channel.value} body")
        try:
            return body.format(**params)
        except KeyError as exc:
            raise ValueError(f"template {self.template_id} needs param {exc}") from None

class Deduper:
    """Idempotency, not a nice-to-have: retries and at-least-once queues mean the same
    notification arrives twice. Key on (user, template, params), not on a generated id."""

    def __init__(self) -> None:
        self._seen: set[str] = set()

    @staticmethod
    def fingerprint(n: Notification, channel: Channel) -> str:
        raw = f"{n.user_id}|{n.template_id}|{n.params}|{channel.value}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def first_time(self, key: str) -> bool:
        if key in self._seen:
            return False
        self._seen.add(key)
        return True

class RetryPolicy:
    def __init__(self, max_attempts: int = 3, base_delay: float = 1.0) -> None:
        if max_attempts < 1:
            raise ValueError("max_attempts must be >= 1")   # else \`result\` is never assigned
        self.max_attempts, self.base_delay = max_attempts, base_delay

    def delay_for(self, attempt: int) -> float:
        return self.base_delay * (2 ** (attempt - 1))     # exponential; add jitter in production

class NotificationService:
    def __init__(self, templates: dict[str, Template], senders: dict[Channel, Sender],
                 prefs: dict[str, UserPrefs], retry: RetryPolicy | None = None) -> None:
        self._templates, self._senders, self._prefs = templates, senders, prefs
        self._retry = retry or RetryPolicy()
        self._dedupe = Deduper()
        self.dead_letter: list[tuple[Notification, Channel, str]] = []

    def _eligible(self, n: Notification, prefs: UserPrefs, hour: int) -> list[Channel]:
        out = []
        for channel in n.channels:
            if channel not in prefs.enabled or channel not in self._senders:
                continue
            if prefs.quiet_hours and n.priority > 3:
                start, end = prefs.quiet_hours
                in_quiet = (start <= hour < end) if start < end else (hour >= start or hour < end)
                if in_quiet:
                    continue                                # OTP (priority 1) still goes through
            out.append(channel)
        return out

    def send(self, n: Notification, hour: int = 12) -> dict[Channel, SendResult]:
        prefs = self._prefs.get(n.user_id)
        if prefs is None:
            raise KeyError(f"no preferences for {n.user_id}")
        template = self._templates[n.template_id]
        results: dict[Channel, SendResult] = {}
        for channel in self._eligible(n, prefs, hour):
            if not self._dedupe.first_time(Deduper.fingerprint(n, channel)):
                continue
            address = prefs.addresses.get(channel)
            if address is None:
                continue
            body = template.render(channel, dict(n.params))
            sender = self._senders[channel]
            for attempt in range(1, self._retry.max_attempts + 1):
                result = sender.send(address, body)
                if result is not SendResult.RETRYABLE:
                    break
                _ = self._retry.delay_for(attempt)          # scheduled, never a blocking sleep
            results[channel] = result
            if result is not SendResult.SENT:
                self.dead_letter.append((n, channel, body))
        return results

class FakeSender:
    def __init__(self, channel: Channel, script: list[SendResult]) -> None:
        self.channel, self._script, self.calls = channel, list(script), []

    def send(self, to: str, body: str) -> SendResult:
        self.calls.append((to, body))
        return self._script.pop(0) if self._script else SendResult.SENT

sms = FakeSender(Channel.SMS, [SendResult.RETRYABLE, SendResult.SENT])
email = FakeSender(Channel.EMAIL, [SendResult.PERMANENT])
svc = NotificationService(
    templates={"otp": Template("otp", {Channel.SMS: "Your code is {code}",
                                       Channel.EMAIL: "Code: {code}"})},
    senders={Channel.SMS: sms, Channel.EMAIL: email},
    prefs={"u1": UserPrefs("u1", frozenset({Channel.SMS, Channel.EMAIL}), (22, 7),
                           {Channel.SMS: "+9199", Channel.EMAIL: "a@b.c"})},
)
otp = Notification("n1", "u1", "otp", (("code", "482913"),), (Channel.SMS, Channel.EMAIL), priority=1)
results = svc.send(otp, hour=23)
assert results == {Channel.SMS: SendResult.SENT, Channel.EMAIL: SendResult.PERMANENT}
assert len(sms.calls) == 2 and sms.calls[0][1] == "Your code is 482913"   # retried once
assert len(svc.dead_letter) == 1
assert svc.send(otp, hour=23) == {}                       # deduped, nothing sent twice
promo = Notification("n2", "u1", "otp", (("code", "1"),), (Channel.SMS,), priority=9)
assert svc.send(promo, hour=23) == {}                     # quiet hours suppress low priority
assert svc.send(promo, hour=12) == {Channel.SMS: SendResult.SENT}`,
  },
  {
    id: 'lldq-food-ordering',
    name: 'Food Ordering',
    statement: 'Design a food ordering system. A user browses restaurants, adds items to a cart, and places an order that moves through states until it is delivered.',
    clarify: [
      'Where does the cart live - client, server, or both? A server cart needs a merge rule for when a logged-out cart meets a logged-in one.',
      'If the price or the availability changes between add-to-cart and checkout, which one wins? I would freeze the price on the line at add time and re-check availability at placement, but that is a business call.',
      'Which order states must exist, and which transitions must be blocked? "Can a user cancel while it is being cooked" is a rule I need before I write the state machine.',
      'Is delivery partner assignment in scope, or does the order stop at "ready for pickup"?',
      'Are offers, taxes and delivery fees in scope, or just the item subtotal?',
    ],
    entities: [
      'Restaurant - menu, stock and open/closed. availability() is the one place that answers "can this be ordered right now".',
      'MenuItem (value object) - id, name, price, veg flag. The live price, which the cart copies rather than references.',
      'Cart - lines keyed by item id, so adding the same item twice increments a quantity instead of creating a second line.',
      'OrderLine (value object) - the price is COPIED onto the line. If the order reads the menu at checkout, a price change silently rewrites a placed order.',
      'Order - lines, subtotal, status and history. Immutable lines, mutable status.',
      'ALLOWED: dict[OrderStatus, frozenset[OrderStatus]] - the transition table as data. An if-ladder here is the most common way this problem is failed, because each new status multiplies the branches.',
      'OrderService - the aggregate operation: re-check availability, freeze the total, transition to PLACED, all in one place.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-behavioural',
      'lldp-solid',
    ],
    extensions: [
      'The restaurant rejects an order it had already accepted. What states does that need, and what is the refund path?',
      'Two customers order the last biryani at the same instant. Where is the check?',
      'Add a scheduled order for 8pm tomorrow. What breaks in your availability check?',
      'Add group ordering, where three people add to one cart and one pays.',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'flipkart',
      'uber',
    ],
    diagram: `classDiagram
    class Restaurant {
        +restaurant_id str
        +is_open bool
        -menu Map
        -in_stock Set
        +availability(itemId) MenuItem
    }
    class MenuItem {
        +item_id str
        +name str
        +price_paise int
        +veg bool
    }
    class Cart {
        -lines Map
        +add(itemId, qty)
        +remove(itemId, qty)
        +subtotal_paise() int
    }
    class OrderLine {
        +item_id str
        +unit_paise int
        +qty int
    }
    class Order {
        +order_id str
        +subtotal_paise int
        +status OrderStatus
        +history List
        +transition(to)
    }
    class OrderStatus {
        CART
        PLACED
        ACCEPTED
        DELIVERED
        CANCELLED
    }
    <<enumeration>> OrderStatus
    class OrderService {
        +place(userId, cart, restaurant) Order
    }
    Restaurant *-- MenuItem : menu
    Cart --> Restaurant : validates against
    Cart *-- OrderLine : lines with frozen prices
    Order *-- OrderLine : snapshot at placement
    Order --> OrderStatus : transition table
    OrderService --> Cart : reads
    OrderService *-- Order : creates`,
    solution: `from dataclasses import dataclass, field
from enum import Enum

class OrderStatus(Enum):
    CART = "cart"
    PLACED = "placed"
    ACCEPTED = "accepted"
    PREPARING = "preparing"
    PICKED_UP = "picked_up"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

# The legal transitions are data. An if-ladder here is the single most common way this
# problem is failed, because every new status multiplies the branches.
ALLOWED: dict[OrderStatus, frozenset[OrderStatus]] = {
    OrderStatus.CART: frozenset({OrderStatus.PLACED, OrderStatus.CANCELLED}),
    OrderStatus.PLACED: frozenset({OrderStatus.ACCEPTED, OrderStatus.CANCELLED}),
    OrderStatus.ACCEPTED: frozenset({OrderStatus.PREPARING, OrderStatus.CANCELLED}),
    OrderStatus.PREPARING: frozenset({OrderStatus.PICKED_UP}),      # too late to cancel
    OrderStatus.PICKED_UP: frozenset({OrderStatus.DELIVERED}),
    OrderStatus.DELIVERED: frozenset(),
    OrderStatus.CANCELLED: frozenset(),
}

@dataclass(frozen=True)
class MenuItem:
    item_id: str
    name: str
    price_paise: int
    veg: bool

@dataclass(frozen=True)
class OrderLine:
    item_id: str
    name: str
    unit_paise: int          # price is COPIED onto the line, never read live from the menu
    qty: int

    @property
    def total_paise(self) -> int:
        return self.unit_paise * self.qty

@dataclass
class Restaurant:
    restaurant_id: str
    name: str
    menu: dict[str, MenuItem] = field(default_factory=dict)
    in_stock: set[str] = field(default_factory=set)
    is_open: bool = True

    def availability(self, item_id: str) -> MenuItem:
        item = self.menu.get(item_id)
        if item is None:
            raise ValueError(f"{item_id} is not on this menu")
        if item_id not in self.in_stock:
            raise ValueError(f"{item.name} is out of stock")
        return item

class Cart:
    def __init__(self, restaurant: Restaurant) -> None:
        self._restaurant = restaurant
        self._lines: dict[str, OrderLine] = {}

    def add(self, item_id: str, qty: int = 1) -> None:
        if qty <= 0:
            raise ValueError("quantity must be positive")
        item = self._restaurant.availability(item_id)
        existing = self._lines.get(item_id)
        new_qty = qty + (existing.qty if existing else 0)
        self._lines[item_id] = OrderLine(item.item_id, item.name, item.price_paise, new_qty)

    def remove(self, item_id: str, qty: int = 1) -> None:
        line = self._lines.get(item_id)
        if line is None:
            return                                     # removing what is not there is a no-op
        if line.qty <= qty:
            del self._lines[item_id]
        else:
            self._lines[item_id] = OrderLine(line.item_id, line.name, line.unit_paise, line.qty - qty)

    def lines(self) -> list[OrderLine]:
        return sorted(self._lines.values(), key=lambda l: l.item_id)

    def subtotal_paise(self) -> int:
        return sum(line.total_paise for line in self._lines.values())

@dataclass
class Order:
    order_id: str
    user_id: str
    restaurant_id: str
    lines: tuple[OrderLine, ...]
    subtotal_paise: int
    status: OrderStatus = OrderStatus.CART
    history: list[OrderStatus] = field(default_factory=list)

    def transition(self, to: OrderStatus) -> None:
        if to not in ALLOWED[self.status]:
            raise ValueError(f"cannot go {self.status.value} -> {to.value}")
        self.history.append(self.status)
        self.status = to

class OrderService:
    def __init__(self) -> None:
        self._orders: dict[str, Order] = {}
        self._seq = 0

    def place(self, user_id: str, cart: Cart, restaurant: Restaurant) -> Order:
        if not restaurant.is_open:
            raise ValueError(f"{restaurant.name} is closed")
        lines = cart.lines()
        if not lines:
            raise ValueError("cart is empty")
        for line in lines:
            restaurant.availability(line.item_id)      # re-check at placement, not just at add
        self._seq += 1
        order = Order(f"ORD{self._seq:06d}", user_id, restaurant.restaurant_id,
                      tuple(lines), cart.subtotal_paise())
        order.transition(OrderStatus.PLACED)
        self._orders[order.order_id] = order
        return order

biryani = MenuItem("i1", "Biryani", 28000, veg=False)
dal = MenuItem("i2", "Dal", 18000, veg=True)
rest = Restaurant("r1", "Meghana", {"i1": biryani, "i2": dal}, {"i1", "i2"})
cart = Cart(rest)
cart.add("i1", 2)
cart.add("i2")
cart.remove("i1")
assert cart.subtotal_paise() == 28000 + 18000
svc = OrderService()
order = svc.place("u1", cart, rest)
assert order.status is OrderStatus.PLACED and order.subtotal_paise == 46000
order.transition(OrderStatus.ACCEPTED)
order.transition(OrderStatus.PREPARING)
try:
    order.transition(OrderStatus.CANCELLED)
except ValueError as exc:
    assert str(exc) == "cannot go preparing -> cancelled"
order.transition(OrderStatus.PICKED_UP)
order.transition(OrderStatus.DELIVERED)
assert order.history[-1] is OrderStatus.PICKED_UP
rest.in_stock.discard("i2")
try:
    svc.place("u1", cart, rest)                        # cart still holds a now-unavailable item
except ValueError as exc:
    assert "out of stock" in str(exc)
try:
    svc.place("u1", Cart(rest), rest)
except ValueError as exc:
    assert "cart is empty" in str(exc)`,
  },
  {
    id: 'lldq-billing-discounts',
    name: 'Billing and Discounts',
    statement: 'Design the billing engine for a shopping cart: line items, several kinds of discount, tax, and a final payable amount.',
    clarify: [
      'Do discounts stack, and if so in what order? Best-single-offer and sequential give different totals, so this must be settled before I write a line of code.',
      'Is tax computed on the gross or on the discounted amount, and is it per line - different rates per category - or on the cart total?',
      'Which discount types are in scope: percent, flat, buy-N-get-M, category-specific, customer-tier?',
      'Where does rounding happen - per line or once at the end - and who absorbs the remainder?',
      'Can a discount take the payable below zero, and what should happen when it tries?',
    ],
    entities: [
      'Cart and Line (value objects) - sku, category, unit price, quantity. All money in integer paise.',
      'Discount (ABC) - applies(cart) and amount_paise(cart, running_total). The contract is that the amount is never negative and never exceeds the running total.',
      'PercentOff, FlatOff, BuyNGetM - each with its own eligibility. BuyNGetM must state which items are the free ones (cheapest, here) because the alternative changes the number.',
      'Stacking (EXCLUSIVE / SEQUENTIAL) - the answer to the first clarifying question, encoded rather than assumed. Sequential also needs a priority, because order changes the total.',
      'BillCalculator - orchestrates eligibility, stacking, the never-negative clamp, then tax.',
      'Bill (value object) - gross, the discounts actually applied with their amounts, tax and payable. The itemised list is what a customer support agent needs.',
    ],
    patterns: [
      'lldp-solid',
      'lldp-behavioural',
      'lldp-interfaces',
    ],
    extensions: [
      'Add a coupon only some customers are eligible for, and make eligibility testable without a database.',
      'Buy-2-get-1 across two different SKUs in the same category: which one is free, and can you defend it to a customer?',
      'Add per-line GST for a cart mixing 5%, 12% and 18% categories.',
      'Prove the payable can never go negative. Point at the line in your code that guarantees it.',
    ],
    minutes: 60,
    companies: [
      'flipkart',
      'amazon',
    ],
    diagram: `classDiagram
    class Cart {
        +lines tuple
        +customer_tier str
        +gross_paise int
    }
    class Line {
        +sku str
        +category str
        +unit_paise int
        +qty int
    }
    class Discount {
        +code str
        +priority int
        +applies(cart) bool
        +amount_paise(cart, runningTotal) int
    }
    <<abstract>> Discount
    class PercentOff {
        -basis_points int
        -cap_paise int
    }
    class FlatOff {
        -off_paise int
        -min_cart_paise int
    }
    class BuyNGetM {
        -buy int
        -free int
    }
    class Stacking {
        EXCLUSIVE
        SEQUENTIAL
    }
    <<enumeration>> Stacking
    class BillCalculator {
        +tax_bp int
        +bill(cart) Bill
    }
    class Bill {
        +gross_paise int
        +applied tuple
        +discount_paise int
        +tax_paise int
        +payable_paise int
    }
    Cart *-- Line : line items
    BillCalculator o-- Discount : rule set
    BillCalculator --> Stacking : stacking policy
    BillCalculator --> Cart : prices
    BillCalculator --> Bill : produces
    Discount <|-- PercentOff
    Discount <|-- FlatOff
    Discount <|-- BuyNGetM`,
    solution: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

@dataclass(frozen=True)
class Line:
    sku: str
    category: str
    unit_paise: int
    qty: int

    @property
    def gross_paise(self) -> int:
        return self.unit_paise * self.qty

@dataclass(frozen=True)
class Cart:
    lines: tuple[Line, ...]
    customer_tier: str = "regular"

    @property
    def gross_paise(self) -> int:
        return sum(line.gross_paise for line in self.lines)

class Stacking(Enum):
    """The question that decides this design: do discounts stack, and in what order?
    Ask it out loud. EXCLUSIVE means best-single-offer wins; SEQUENTIAL applies in order
    to the running total, which is why order matters and must be explicit."""
    EXCLUSIVE = "exclusive"
    SEQUENTIAL = "sequential"

class Discount(ABC):
    code: str
    priority: int = 100          # lower runs first in SEQUENTIAL mode

    @abstractmethod
    def applies(self, cart: Cart) -> bool: ...

    @abstractmethod
    def amount_paise(self, cart: Cart, running_total: int) -> int:
        """Always returns a non-negative paise amount, never a negative total, and never
        more than running_total. A discount that can push a bill below zero is the bug
        the interviewer probes for."""

class PercentOff(Discount):
    def __init__(self, code: str, basis_points: int, category: str | None = None,
                 cap_paise: int | None = None, priority: int = 10) -> None:
        if not 0 < basis_points <= 10_000:
            raise ValueError("basis points must be in (0, 10000]")
        self.code, self._bp, self._category = code, basis_points, category
        self._cap, self.priority = cap_paise, priority

    def applies(self, cart: Cart) -> bool:
        return self._eligible_paise(cart) > 0

    def _eligible_paise(self, cart: Cart) -> int:
        return sum(l.gross_paise for l in cart.lines
                   if self._category is None or l.category == self._category)

    def amount_paise(self, cart: Cart, running_total: int) -> int:
        raw = self._eligible_paise(cart) * self._bp // 10_000
        if self._cap is not None:
            raw = min(raw, self._cap)
        return min(raw, running_total)

class FlatOff(Discount):
    def __init__(self, code: str, off_paise: int, min_cart_paise: int, priority: int = 20) -> None:
        self.code, self._off, self._min, self.priority = code, off_paise, min_cart_paise, priority

    def applies(self, cart: Cart) -> bool:
        return cart.gross_paise >= self._min

    def amount_paise(self, cart: Cart, running_total: int) -> int:
        return min(self._off, running_total)

class BuyNGetM(Discount):
    """Cheapest items are the free ones - state that assumption, because the alternative
    (most expensive free) changes the number and interviewers pick at it."""

    def __init__(self, code: str, category: str, buy: int, free: int, priority: int = 5) -> None:
        if buy < 1 or free < 1:
            raise ValueError("buy and free must be positive")
        self.code, self._category, self._buy, self._free = code, category, buy, free
        self.priority = priority

    def _unit_prices(self, cart: Cart) -> list[int]:
        prices: list[int] = []
        for line in cart.lines:
            if line.category == self._category:
                prices.extend([line.unit_paise] * line.qty)
        return sorted(prices)

    def applies(self, cart: Cart) -> bool:
        return len(self._unit_prices(cart)) >= self._buy + self._free

    def amount_paise(self, cart: Cart, running_total: int) -> int:
        prices = self._unit_prices(cart)
        group = self._buy + self._free
        free_count = (len(prices) // group) * self._free
        return min(sum(prices[:free_count]), running_total)

@dataclass(frozen=True)
class Bill:
    gross_paise: int
    applied: tuple[tuple[str, int], ...]
    discount_paise: int
    tax_paise: int
    payable_paise: int

class BillCalculator:
    def __init__(self, discounts: list[Discount], tax_bp: int, stacking: Stacking) -> None:
        self._discounts, self._tax_bp, self._stacking = discounts, tax_bp, stacking

    def bill(self, cart: Cart) -> Bill:
        gross = cart.gross_paise
        eligible = [d for d in self._discounts if d.applies(cart)]
        applied: list[tuple[str, int]] = []
        if self._stacking is Stacking.EXCLUSIVE and eligible:
            best = max(eligible, key=lambda d: (d.amount_paise(cart, gross), d.code))
            amount = best.amount_paise(cart, gross)
            applied = [(best.code, amount)] if amount else []
        else:
            running = gross
            for discount in sorted(eligible, key=lambda d: (d.priority, d.code)):
                amount = discount.amount_paise(cart, running)
                if amount > 0:
                    applied.append((discount.code, amount))
                    running -= amount
        total_discount = sum(a for _, a in applied)
        net = gross - total_discount
        assert net >= 0                       # the invariant, stated where it is established
        tax = net * self._tax_bp // 10_000    # tax on the discounted value, not on gross
        return Bill(gross, tuple(applied), total_discount, tax, net + tax)

cart = Cart((Line("s1", "tea", 10000, 3), Line("s2", "mug", 50000, 1)))
calc = BillCalculator([PercentOff("SAVE10", 1000), FlatOff("FLAT100", 10000, 50000)],
                      tax_bp=1800, stacking=Stacking.EXCLUSIVE)
bill = calc.bill(cart)
assert bill.gross_paise == 80000
assert bill.applied == (("FLAT100", 10000),)       # best single offer, 100 rupees beats 80
assert bill.tax_paise == 70000 * 1800 // 10_000 and bill.payable_paise == 70000 + 12600

seq = BillCalculator([PercentOff("SAVE10", 1000), FlatOff("FLAT100", 10000, 50000)],
                     tax_bp=1800, stacking=Stacking.SEQUENTIAL)
bill2 = seq.bill(cart)
assert bill2.applied == (("SAVE10", 8000), ("FLAT100", 10000))
assert bill2.discount_paise == 18000 and bill2.payable_paise == 62000 + 62000 * 1800 // 10_000

bogo = BillCalculator([BuyNGetM("B2G1", "tea", buy=2, free=1)], 0, Stacking.SEQUENTIAL)
assert bogo.bill(cart).applied == (("B2G1", 10000),)          # one free tea, the cheapest
assert bogo.bill(Cart((Line("s1", "tea", 10000, 2),))).applied == ()   # not enough to qualify

huge = BillCalculator([FlatOff("BIG", 99_999_999, 0)], 0, Stacking.SEQUENTIAL)
assert huge.bill(cart).payable_paise == 0                     # clamped, never negative
assert calc.bill(Cart(())).payable_paise == 0                 # empty cart does not crash`,
  },
  {
    id: 'lldq-ride-hailing-dispatch',
    name: 'Ride Hailing Dispatch',
    statement: 'Design the dispatch half of a ride hailing app: a rider requests a ride from a pickup point and a nearby driver is matched to it.',
    clarify: [
      'Is matching nearest-first or lowest-ETA? Straight-line distance and road ETA give different answers, and only one of them needs a routing service on the hot path.',
      'Do we offer to one driver at a time, or broadcast to several and take the first accept? That decides whether I need a lock or a compare-and-set on accept.',
      'How often do drivers push location updates, and how stale may the index be when we search it?',
      'Are vehicle categories, surge pricing and pooling in scope for this round?',
      'What happens when nobody accepts - expand the radius, retry, or fail the request?',
    ],
    entities: [
      'Driver - id, last known location, state (OFFLINE / AVAILABLE / OFFERED / ON_TRIP), rating, vehicle class. The state is what stops one car being promised to two riders.',
      'LatLng (value object) - with a haversine km_to(). Straight-line, and saying so is the point: it is a filter, not an ETA.',
      'GeoIndex - drivers bucketed into rounded lat/lng cells, searched over the 3x3 ring of neighbours because the nearest driver is often just across a cell boundary. Scanning every driver in the city is the O(n) answer that fails at scale.',
      'RideRequest - rider, pickup, drop, vehicle class.',
      'Dispatcher - scores candidates and makes the offer under a lock. The scoring function is a strategy; keeping it in one method is what lets it be replaced by ETA later.',
      'Trip - created on accept. It is the point at which the driver leaves the index entirely.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-behavioural',
      'lldp-concurrency',
    ],
    extensions: [
      'The offered driver never responds. Design the timeout and the re-offer, and say what stops the request being offered to the same driver twice.',
      'Replace haversine with a real ETA service. What is the interface, and how do you keep a network call out of the hot path?',
      'Add surge, where the multiplier depends on supply and demand per zone.',
      'Add pooling, where a driver can accept a second rider mid-trip. What in your Driver state machine breaks?',
    ],
    minutes: 60,
    companies: [
      'uber',
      'amazon',
      'flipkart',
    ],
    diagram: `classDiagram
    class Dispatcher {
        -lock Lock
        +offers Map
        +candidates(request) List
        +offer(request) str
        +accept(requestId, driverId)
        +decline(requestId, driverId)
    }
    class GeoIndex {
        -cells Map
        +upsert(driverId, at)
        +remove(driverId)
        +near(at, rings) Set
    }
    class Driver {
        +driver_id str
        +state DriverState
        +rating float
        +vehicle str
    }
    class DriverState {
        OFFLINE
        AVAILABLE
        OFFERED
        ON_TRIP
    }
    <<enumeration>> DriverState
    class LatLng {
        +lat float
        +lng float
        +km_to(other) float
    }
    class RideRequest {
        +request_id str
        +rider_id str
        +vehicle str
    }
    class Trip {
        +trip_id str
        +started_at datetime
    }
    Dispatcher *-- GeoIndex : owns the index
    Dispatcher o-- Driver : offers to
    Dispatcher --> RideRequest : matches
    Dispatcher --> Trip : creates on accept
    GeoIndex o-- Driver : bucketed by cell
    Driver *-- LatLng : last known location
    Driver --> DriverState : lifecycle
    RideRequest *-- LatLng : pickup and drop`,
    solution: `from collections import defaultdict
from dataclasses import dataclass
from enum import Enum
from math import asin, cos, radians, sin, sqrt
import threading

EARTH_KM = 6371.0

@dataclass(frozen=True)
class LatLng:
    lat: float
    lng: float

    def km_to(self, other: "LatLng") -> float:
        dlat, dlng = radians(other.lat - self.lat), radians(other.lng - self.lng)
        a = sin(dlat / 2) ** 2 + cos(radians(self.lat)) * cos(radians(other.lat)) * sin(dlng / 2) ** 2
        return 2 * EARTH_KM * asin(sqrt(a))      # haversine; straight-line, not road distance

class DriverState(Enum):
    OFFLINE = "offline"
    AVAILABLE = "available"
    OFFERED = "offered"
    ON_TRIP = "on_trip"

@dataclass
class Driver:
    driver_id: str
    location: LatLng
    state: DriverState = DriverState.OFFLINE
    rating: float = 4.8
    vehicle: str = "hatchback"

class GeoIndex:
    """Bucket by rounded lat/lng cell. Scanning every driver in the city is O(n) per request
    and is the answer that fails at scale; a real system uses S2 or geohash, and the cell
    grid is the same idea with a coarser key. Search the 3x3 ring of neighbouring cells,
    because the nearest driver is often just across a cell boundary."""

    def __init__(self, cell_degrees: float = 0.01) -> None:   # ~1.1 km
        self._cell = cell_degrees
        self._cells: dict[tuple[int, int], set[str]] = defaultdict(set)
        self._where: dict[str, tuple[int, int]] = {}

    def _key(self, at: LatLng) -> tuple[int, int]:
        return (int(at.lat // self._cell), int(at.lng // self._cell))

    def upsert(self, driver_id: str, at: LatLng) -> None:
        key = self._key(at)
        old = self._where.get(driver_id)
        if old == key:
            return
        if old is not None:
            self._cells[old].discard(driver_id)
        self._cells[key].add(driver_id)
        self._where[driver_id] = key

    def remove(self, driver_id: str) -> None:
        old = self._where.pop(driver_id, None)
        if old is not None:
            self._cells[old].discard(driver_id)

    def near(self, at: LatLng, rings: int = 1) -> set[str]:
        cx, cy = self._key(at)
        out: set[str] = set()
        for dx in range(-rings, rings + 1):
            for dy in range(-rings, rings + 1):
                out |= self._cells.get((cx + dx, cy + dy), set())
        return out

@dataclass
class RideRequest:
    request_id: str
    rider_id: str
    pickup: LatLng
    drop: LatLng
    vehicle: str = "hatchback"

class Dispatcher:
    def __init__(self, index: GeoIndex, drivers: dict[str, Driver], max_km: float = 5.0) -> None:
        self._index, self._drivers, self._max_km = index, drivers, max_km
        self._lock = threading.Lock()
        self.offers: dict[str, str] = {}                # request_id -> driver_id

    def candidates(self, request: RideRequest) -> list[tuple[float, str]]:
        ranked = []
        for driver_id in self._index.near(request.pickup):
            driver = self._drivers[driver_id]
            if driver.state is not DriverState.AVAILABLE or driver.vehicle != request.vehicle:
                continue
            distance = driver.location.km_to(request.pickup)
            if distance <= self._max_km:
                ranked.append((distance, driver_id))
        return sorted(ranked)                            # nearest first; ETA needs road data

    def offer(self, request: RideRequest) -> str | None:
        """Offer to one driver at a time and mark them OFFERED under the lock, so two riders
        cannot be promised the same car. Broadcasting to all N is the other design, and it
        needs a compare-and-set on accept instead."""
        with self._lock:
            for _, driver_id in self.candidates(request):
                driver = self._drivers[driver_id]
                if driver.state is DriverState.AVAILABLE:
                    driver.state = DriverState.OFFERED
                    self.offers[request.request_id] = driver_id
                    return driver_id
            return None

    def accept(self, request_id: str, driver_id: str) -> None:
        with self._lock:
            if self.offers.get(request_id) != driver_id:
                raise ValueError("this offer is no longer yours")   # expired or reassigned
            self._drivers[driver_id].state = DriverState.ON_TRIP
            self._index.remove(driver_id)

    def decline(self, request_id: str, driver_id: str) -> None:
        with self._lock:
            if self.offers.pop(request_id, None) == driver_id:
                self._drivers[driver_id].state = DriverState.AVAILABLE

index = GeoIndex()
drivers = {
    "d1": Driver("d1", LatLng(12.9716, 77.5946), DriverState.AVAILABLE),
    "d2": Driver("d2", LatLng(12.9750, 77.5990), DriverState.AVAILABLE),
    "d3": Driver("d3", LatLng(12.9716, 77.5946), DriverState.ON_TRIP),
    "d4": Driver("d4", LatLng(13.2000, 77.7000), DriverState.AVAILABLE),   # far away
}
for driver in drivers.values():
    index.upsert(driver.driver_id, driver.location)
dispatch = Dispatcher(index, drivers)
req = RideRequest("r1", "u1", LatLng(12.9718, 77.5950), LatLng(12.99, 77.60))
assert [d for _, d in dispatch.candidates(req)] == ["d1", "d2"]     # d3 busy, d4 out of range
assert dispatch.offer(req) == "d1"
assert drivers["d1"].state is DriverState.OFFERED
req2 = RideRequest("r2", "u2", LatLng(12.9718, 77.5950), LatLng(12.99, 77.60))
assert dispatch.offer(req2) == "d2"                                  # never the same driver twice
dispatch.decline("r1", "d1")
assert drivers["d1"].state is DriverState.AVAILABLE
dispatch.accept("r2", "d2")
assert drivers["d2"].state is DriverState.ON_TRIP
assert "d2" not in index.near(req.pickup)                            # on-trip drivers leave the index
try:
    dispatch.accept("r2", "d1")
except ValueError as exc:
    assert "no longer yours" in str(exc)
empty = Dispatcher(GeoIndex(), {})
assert empty.offer(req) is None                                      # no drivers: None, not a crash`,
  },
  {
    id: 'lldq-library-management',
    name: 'Library Management',
    statement: 'Design a library management system: members borrow and return books, reserve ones that are out, and pay fines when they are late.',
    clarify: [
      'Do we distinguish a book (an ISBN) from a physical copy? Reservations, availability and fines all depend on that split, so I want it settled first.',
      'Are there multiple branches, and can a member borrow at one branch and return at another?',
      'Are reservations FIFO, and when a copy comes back does it get held for the next person or go straight to the shelf?',
      'How are fines computed, is there a cap, and do unpaid fines block borrowing?',
      'Are renewals allowed, and are they blocked when someone is waiting for that title?',
    ],
    entities: [
      'Book (value object) - the title, one per ISBN. Not one per physical item.',
      'Copy - the physical item: barcode, ISBN, branch. Book 1--* Copy.',
      'Member - id, loan limit, outstanding fine, blocked flag.',
      'Loan - the reified relationship between a Member and a Copy over time: taken, due, renewals, returned. "Borrow" carries data, so it is an entity, not a foreign key.',
      'Reservation - a FIFO queue of member ids per ISBN, plus the member the next return is being held for. Held is distinct from queued.',
      'FinePolicy (Strategy) - per-day rate and a cap, so a student rate and a public rate are configuration rather than a subclass of Library.',
      'Library - the aggregate root. Every invariant that spans two entities lives here, because no single entity can see enough to enforce it.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-solid',
      'lldp-interfaces',
    ],
    extensions: [
      'A reserved copy comes back and nobody collects it within 48 hours. What happens to the hold and to the queue?',
      'Add multiple branches with inter-branch transfers. What does availability mean now?',
      'Make fines configurable per member type - student, staff, public - without touching Library.',
      'List every overdue loan in a 200,000-copy library without scanning every loan.',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'flipkart',
    ],
    diagram: `classDiagram
    class Library {
        -open Map
        -held Map
        +borrow(barcode, memberId, today) Loan
        +return_copy(barcode, today) int
        +renew(barcode, today) Loan
        +reserve(isbn, memberId) int
        +pay_fine(memberId, paise) int
    }
    class Book {
        +isbn str
        +title str
        +author str
    }
    class Copy {
        +barcode str
        +isbn str
        +branch str
    }
    class Member {
        +member_id str
        +max_loans int
        +fine_paise int
        +blocked bool
    }
    class Loan {
        +taken_on date
        +due_on date
        +renewals int
        +returned_on date
    }
    class Reservation {
        +isbn str
        +queue deque
        +ready_for str
    }
    class FinePolicy {
        +per_day_paise int
        +cap_paise int
        +fine_for(loan, returnedOn) int
    }
    Book *-- Copy : physical copies
    Library o-- Copy : catalogue
    Library o-- Member : membership
    Library *-- Loan : open loans
    Library *-- Reservation : one queue per isbn
    Library *-- FinePolicy : charges with
    Loan --> Copy : of
    Loan --> Member : to`,
    solution: `from collections import deque
from dataclasses import dataclass, field
from datetime import date, timedelta

@dataclass(frozen=True)
class Book:
    isbn: str
    title: str
    author: str

@dataclass
class Copy:
    barcode: str
    isbn: str
    branch: str

@dataclass
class Member:
    member_id: str
    max_loans: int = 5
    fine_paise: int = 0
    blocked: bool = False

@dataclass
class Loan:
    barcode: str
    member_id: str
    taken_on: date
    due_on: date
    renewals: int = 0
    returned_on: date | None = None

@dataclass
class Reservation:
    isbn: str
    queue: deque[str] = field(default_factory=deque)     # FIFO of member ids
    ready_for: str | None = None                         # member the next return is held for

class FinePolicy:
    def __init__(self, per_day_paise: int = 500, cap_paise: int = 20_000) -> None:
        self._per_day, self._cap = per_day_paise, cap_paise

    def fine_for(self, loan: Loan, returned_on: date) -> int:
        overdue_days = (returned_on - loan.due_on).days
        if overdue_days <= 0:
            return 0                                     # returned early or on time
        return min(overdue_days * self._per_day, self._cap)

class Library:
    """Aggregate root. Every invariant that spans two entities - a copy is on loan to at
    most one member, a member is under their limit, a reserved copy skips the shelf -
    is enforced here, because no single entity can see enough to enforce it."""

    LOAN_DAYS = 14
    MAX_RENEWALS = 2

    def __init__(self, fines: FinePolicy | None = None) -> None:
        self.books: dict[str, Book] = {}
        self.copies: dict[str, Copy] = {}
        self.members: dict[str, Member] = {}
        self._open: dict[str, Loan] = {}                 # barcode -> open loan
        self._held: dict[str, set[str]] = {}             # member -> barcodes
        self._reservations: dict[str, Reservation] = {}
        self._fines = fines or FinePolicy()

    def _free_copies(self, isbn: str) -> list[str]:
        return sorted(b for b, c in self.copies.items()
                      if c.isbn == isbn and b not in self._open)

    def borrow(self, barcode: str, member_id: str, today: date) -> Loan:
        copy = self.copies[barcode]
        member = self.members[member_id]
        if member.blocked or member.fine_paise > 0:
            raise ValueError(f"{member_id} must clear dues before borrowing")
        if barcode in self._open:
            raise ValueError(f"copy {barcode} is already on loan")
        reservation = self._reservations.get(copy.isbn)
        if reservation and reservation.ready_for not in (None, member_id):
            raise ValueError(f"this copy is held for {reservation.ready_for}")
        held = self._held.setdefault(member_id, set())
        if len(held) >= member.max_loans:
            raise ValueError(f"{member_id} is at the {member.max_loans}-loan limit")
        loan = Loan(barcode, member_id, today, today + timedelta(days=self.LOAN_DAYS))
        self._open[barcode] = loan
        held.add(barcode)
        if reservation and reservation.ready_for == member_id:
            reservation.ready_for = None
        return loan

    def return_copy(self, barcode: str, today: date) -> int:
        loan = self._open.pop(barcode, None)
        if loan is None:
            raise ValueError(f"copy {barcode} is not on loan")
        loan.returned_on = today
        self._held[loan.member_id].discard(barcode)
        fine = self._fines.fine_for(loan, today)
        self.members[loan.member_id].fine_paise += fine
        reservation = self._reservations.get(self.copies[barcode].isbn)
        if reservation and reservation.queue:
            reservation.ready_for = reservation.queue.popleft()   # next in line, not first to ask
        return fine

    def renew(self, barcode: str, today: date) -> Loan:
        loan = self._open.get(barcode)
        if loan is None:
            raise ValueError("not on loan")
        reservation = self._reservations.get(self.copies[barcode].isbn)
        if reservation and reservation.queue:
            raise ValueError("cannot renew: someone is waiting")
        if loan.renewals >= self.MAX_RENEWALS:
            raise ValueError("renewal limit reached")
        loan.renewals += 1
        loan.due_on = max(loan.due_on, today) + timedelta(days=self.LOAN_DAYS)
        return loan

    def reserve(self, isbn: str, member_id: str) -> int:
        if self._free_copies(isbn):
            raise ValueError("a copy is on the shelf - borrow it instead of reserving")
        reservation = self._reservations.setdefault(isbn, Reservation(isbn))
        if member_id in reservation.queue:
            return list(reservation.queue).index(member_id) + 1     # idempotent, same position
        reservation.queue.append(member_id)
        return len(reservation.queue)

    def pay_fine(self, member_id: str, paise: int) -> int:
        member = self.members[member_id]
        member.fine_paise = max(0, member.fine_paise - paise)
        return member.fine_paise

lib = Library()
lib.books["978"] = Book("978", "SICP", "Abelson")
lib.copies["c1"] = Copy("c1", "978", "BLR")
lib.members["m1"] = Member("m1")
lib.members["m2"] = Member("m2")
day0 = date(2026, 1, 1)
loan = lib.borrow("c1", "m1", day0)
assert loan.due_on == date(2026, 1, 15)
try:
    lib.borrow("c1", "m2", day0)
except ValueError as exc:
    assert "already on loan" in str(exc)
assert lib.reserve("978", "m2") == 1
assert lib.reserve("978", "m2") == 1                    # reserving twice does not queue twice
try:
    lib.renew("c1", day0)
except ValueError as exc:
    assert "someone is waiting" in str(exc)
fine = lib.return_copy("c1", date(2026, 1, 20))          # 5 days overdue
assert fine == 5 * 500 and lib.members["m1"].fine_paise == 2500
try:
    lib.borrow("c1", "m1", date(2026, 1, 21))
except ValueError as exc:
    assert "clear dues" in str(exc)
assert lib.pay_fine("m1", 9999) == 0                     # overpayment does not go negative
try:
    lib.borrow("c1", "m1", date(2026, 1, 21))            # copy is held for m2
except ValueError as exc:
    assert "held for m2" in str(exc)
assert lib.borrow("c1", "m2", date(2026, 1, 21)).member_id == "m2"
assert lib.return_copy("c1", date(2026, 1, 22)) == 0     # returned early, no fine`,
  },
  {
    id: 'lldq-hotel-booking',
    name: 'Hotel Booking',
    statement: 'Design a hotel booking system: search availability for a date range, book a room, and cancel with a refund.',
    clarify: [
      'Is the stay half-open, so a guest checking out on the 5th and one checking in on the 5th do not conflict? I want to state that explicitly, because getting it closed by accident silently halves the inventory.',
      'Does a guest book a room type or a specific room number? Real hotels sell types and assign numbers at check-in, and that changes what inventory means.',
      'How long can a stay be? If stays are short, per-night counters beat an interval tree and are far easier to reason about.',
      'Is dynamic pricing in scope - weekends, seasons, occupancy-based?',
      'What is the cancellation and refund policy, and is deliberate overbooking allowed?',
    ],
    entities: [
      'Room - number, type, hotel. Static inventory.',
      'RoomType (STANDARD / DELUXE / SUITE) - what is actually sold, and what availability is counted by.',
      'DateRange (value object) - half-open [check_in, check_out), validated in __post_init__ so an inverted or zero-night stay cannot exist anywhere in the system.',
      'Inventory - a dict from (room type, night) to the set of rooms taken. O(nights) to check and to hold, and the concurrency boundary.',
      'Booking - guest, room, stay, total, status. Status transitions are what cancel and check-in operate on.',
      'RatePlan (Strategy) - price per night with a weekend uplift, so seasonal pricing is a new strategy rather than an edit to BookingService.',
      'BookingService - quotes, then holds, then records - in that order, so nothing is charged before inventory is secured.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-concurrency',
      'lldp-behavioural',
    ],
    extensions: [
      'Allow deliberate overbooking at 105% and define exactly what happens when everyone shows up.',
      'Two users book the last deluxe room for overlapping dates at the same instant. Where is the check, and what is the lock scoped to?',
      'Add multi-room bookings that must all succeed or all fail.',
      'Search 500 hotels for a 7-night stay. Does the per-night model still hold, and what would you precompute?',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'flipkart',
      'google',
    ],
    diagram: `classDiagram
    class BookingService {
        +book(guestId, roomType, stay) Booking
        +cancel(bookingId, today) int
    }
    class Inventory {
        -taken Map
        -lock Lock
        +available_rooms(roomType, stay) List
        +hold(roomType, stay) str
        +release(roomNo, roomType, stay)
    }
    class Room {
        +room_no str
        +hotel_id str
    }
    class RoomType {
        STANDARD
        DELUXE
        SUITE
    }
    <<enumeration>> RoomType
    class DateRange {
        +check_in date
        +check_out date
        +nights int
        +overlaps(other) bool
    }
    class Booking {
        +booking_id str
        +guest_id str
        +total_paise int
        +status BookingStatus
    }
    class BookingStatus {
        CONFIRMED
        CHECKED_IN
        CHECKED_OUT
        CANCELLED
    }
    <<enumeration>> BookingStatus
    class RatePlan {
        -base_paise Map
        +quote_paise(roomType, stay) int
    }
    BookingService *-- Inventory : holds rooms through
    BookingService *-- RatePlan : prices with
    BookingService *-- Booking : records
    Inventory o-- Room : tracks per night
    Room --> RoomType : sold as
    Booking *-- DateRange : half open stay
    Booking --> Room : assigned
    Booking --> BookingStatus : lifecycle`,
    solution: `from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from enum import Enum
import threading

class RoomType(Enum):
    STANDARD = "standard"
    DELUXE = "deluxe"
    SUITE = "suite"

@dataclass(frozen=True)
class Room:
    room_no: str
    room_type: RoomType
    hotel_id: str

@dataclass(frozen=True)
class DateRange:
    """Half-open [check_in, check_out): the guest leaving on the 5th and the guest arriving
    on the 5th do not conflict. Getting this closed by accident is the classic off-by-one
    that silently halves your inventory."""
    check_in: date
    check_out: date

    def __post_init__(self) -> None:
        if self.check_out <= self.check_in:
            raise ValueError("check-out must be after check-in")

    @property
    def nights(self) -> int:
        return (self.check_out - self.check_in).days

    def days(self):
        for i in range(self.nights):
            yield self.check_in + timedelta(days=i)

    def overlaps(self, other: "DateRange") -> bool:
        return self.check_in < other.check_out and other.check_in < self.check_out

class BookingStatus(Enum):
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"

@dataclass
class Booking:
    booking_id: str
    guest_id: str
    room_no: str
    stay: DateRange
    total_paise: int
    status: BookingStatus = BookingStatus.CONFIRMED

class Inventory:
    """Per-night counters, not an interval tree. Availability is asked per night anyway, a
    stay is short, and a dict of (room_type, day) -> sold is O(nights) to check and to book.
    Say why: an interval tree is the right answer only when stays can be arbitrarily long."""

    def __init__(self, rooms: list[Room]) -> None:
        self._rooms = rooms
        self._total: dict[RoomType, int] = defaultdict(int)
        for room in rooms:
            self._total[room.room_type] += 1
        self._by_no = {r.room_no: r for r in rooms}
        self._taken: dict[tuple[RoomType, date], set[str]] = defaultdict(set)
        self._lock = threading.Lock()

    def room_type_of(self, room_no: str) -> RoomType:
        return self._by_no[room_no].room_type

    def available_rooms(self, room_type: RoomType, stay: DateRange) -> list[str]:
        busy: set[str] = set()
        for day in stay.days():
            busy |= self._taken[(room_type, day)]
        return sorted(r.room_no for r in self._rooms
                      if r.room_type is room_type and r.room_no not in busy)

    def hold(self, room_type: RoomType, stay: DateRange) -> str:
        with self._lock:                       # check-then-write across every night, atomically
            free = self.available_rooms(room_type, stay)
            if not free:
                raise ValueError(f"no {room_type.value} room free for those dates")
            room_no = free[0]
            for day in stay.days():
                self._taken[(room_type, day)].add(room_no)
            return room_no

    def release(self, room_no: str, room_type: RoomType, stay: DateRange) -> None:
        with self._lock:
            for day in stay.days():
                self._taken[(room_type, day)].discard(room_no)

class RatePlan:
    def __init__(self, base_paise: dict[RoomType, int], weekend_uplift_bp: int = 2500) -> None:
        self._base, self._uplift = base_paise, weekend_uplift_bp

    def quote_paise(self, room_type: RoomType, stay: DateRange) -> int:
        total = 0
        for day in stay.days():
            nightly = self._base[room_type]
            if day.weekday() >= 4:             # Fri and Sat nights cost more
                nightly += nightly * self._uplift // 10_000
            total += nightly
        return total

class BookingService:
    def __init__(self, inventory: Inventory, rates: RatePlan) -> None:
        self._inventory, self._rates = inventory, rates
        self._bookings: dict[str, Booking] = {}
        self._seq = 0

    def book(self, guest_id: str, room_type: RoomType, stay: DateRange) -> Booking:
        total = self._rates.quote_paise(room_type, stay)
        room_no = self._inventory.hold(room_type, stay)      # raises before any money is taken
        self._seq += 1
        booking = Booking(f"BK{self._seq:06d}", guest_id, room_no, stay, total)
        self._bookings[booking.booking_id] = booking
        return booking

    def cancel(self, booking_id: str, today: date) -> int:
        booking = self._bookings[booking_id]
        if booking.status is not BookingStatus.CONFIRMED:
            raise ValueError(f"cannot cancel a {booking.status.value} booking")
        self._inventory.release(booking.room_no, self._inventory.room_type_of(booking.room_no),
                                booking.stay)
        booking.status = BookingStatus.CANCELLED
        free_until = booking.stay.check_in - timedelta(days=1)
        return booking.total_paise if today <= free_until else booking.total_paise // 2

rooms = [Room("101", RoomType.STANDARD, "h1"), Room("102", RoomType.STANDARD, "h1"),
         Room("201", RoomType.DELUXE, "h1")]
inventory = Inventory(rooms)
rates = RatePlan({RoomType.STANDARD: 300_000, RoomType.DELUXE: 600_000})
svc = BookingService(inventory, rates)
stay = DateRange(date(2026, 2, 2), date(2026, 2, 4))          # Mon and Tue nights
b1 = svc.book("g1", RoomType.STANDARD, stay)
assert b1.room_no == "101" and b1.total_paise == 2 * 300_000
b2 = svc.book("g2", RoomType.STANDARD, stay)
assert b2.room_no == "102"
try:
    svc.book("g3", RoomType.STANDARD, stay)
except ValueError as exc:
    assert "no standard room free" in str(exc)
back_to_back = DateRange(date(2026, 2, 4), date(2026, 2, 6))  # starts the day the other ends
assert svc.book("g3", RoomType.STANDARD, back_to_back).room_no == "101"
assert svc.cancel(b1.booking_id, date(2026, 1, 20)) == 600_000          # full refund
assert svc.book("g4", RoomType.STANDARD, stay).room_no == "101"         # released back
weekend = DateRange(date(2026, 2, 6), date(2026, 2, 7))                 # Friday night
assert rates.quote_paise(RoomType.DELUXE, weekend) == 600_000 + 150_000
try:
    DateRange(date(2026, 2, 4), date(2026, 2, 4))
except ValueError as exc:
    assert "after check-in" in str(exc)`,
  },
  {
    id: 'lldq-file-system',
    name: 'File System',
    statement: 'Design an in-memory file system: create directories and files, read and write content, list, delete, and search.',
    clarify: [
      'Absolute paths only, or do I need a working directory and relative paths?',
      'Are symlinks and hard links in scope? Links turn the tree into a graph, which breaks recursive size() and makes delete a reference-count problem.',
      'Are permissions and ownership in scope?',
      'What should ".." at the root do - raise, or stay at the root? And is mkdir -p the expected create semantics, or should creating an existing directory be an error?',
      'Is file content just bytes in memory, or do you want blocks and a size quota?',
    ],
    entities: [
      'Node (ABC) - name, parent, size(), and a path property derived by walking up. Names are validated on attach, not in the constructor, because the root is the one node with no name.',
      'File - content bytes. size() is len(content).',
      'Directory - children keyed by name, so each path segment resolves in O(1) rather than scanning a list. size() sums its children and returns 0 when empty.',
      'Composite relationship - File and Directory answer size() and walk() identically, which is why du and find are written once instead of twice.',
      'FileSystem - the facade. It owns path parsing (".", "..", clamping at the root) and the operations: resolve, mkdirs, write, read, remove, find.',
      'FsError hierarchy (NotFound, AlreadyExists, NotADirectory) - distinct types, because callers genuinely branch on them.',
    ],
    patterns: [
      'lldp-structural',
      'lldp-modelling',
      'lldp-solid',
    ],
    extensions: [
      'Add hard links. What breaks in size(), and what does remove() have to become?',
      'Add permissions and an owner. Where does the check go so that every operation gets it, and none can forget?',
      'The tree is 100,000 levels deep. Does your walk still work? (Recursion will not - what replaces it?)',
      'Add a find that supports glob patterns and does not materialise every path in memory.',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'google',
      'meta',
    ],
    diagram: `classDiagram
    class FileSystem {
        +root Directory
        +resolve(path) Node
        +mkdirs(path) Directory
        +write(path, content) File
        +read(path) bytes
        +remove(path, recursive)
        +find(path, suffix) List
    }
    class Node {
        +name str
        +parent Directory
        +path str
        +size() int
    }
    <<abstract>> Node
    class File {
        +content bytes
    }
    class Directory {
        -children Map
        +add(node) Node
        +walk() Iterator
    }
    class FsError
    class NotFound
    class AlreadyExists
    class NotADirectory
    FileSystem *-- Directory : owns the root
    Node <|-- File
    Node <|-- Directory
    Directory *-- Node : children keyed by name
    Node --> Directory : parent link
    FsError <|-- NotFound
    FsError <|-- AlreadyExists
    FsError <|-- NotADirectory`,
    solution: `from abc import ABC, abstractmethod
from typing import Iterator

class FsError(Exception): ...
class NotFound(FsError): ...
class AlreadyExists(FsError): ...
class NotADirectory(FsError): ...

class Node(ABC):
    # Names are validated on attach, not here: the root is the one node with no name and no
    # parent, and a constructor-side check would make it impossible to build.
    def __init__(self, name: str) -> None:
        self.name = name
        self.parent: "Directory | None" = None

    @property
    def path(self) -> str:
        parts, node = [], self
        while node.parent is not None:
            parts.append(node.name)
            node = node.parent
        return "/" + "/".join(reversed(parts))

    @abstractmethod
    def size(self) -> int: ...

class File(Node):
    def __init__(self, name: str, content: bytes = b"") -> None:
        super().__init__(name)
        self.content = content

    def size(self) -> int:
        return len(self.content)

class Directory(Node):
    """Composite: File and Directory answer size() and walk() the same way, so du and find
    are written once. The children dict is keyed by name, which makes lookup O(1) per path
    segment - a list of children turns every resolve into O(depth * width)."""

    def __init__(self, name: str) -> None:
        super().__init__(name)
        self.children: dict[str, Node] = {}

    def size(self) -> int:
        return sum(child.size() for child in self.children.values())   # 0 when empty

    def add(self, node: Node) -> Node:
        if not node.name or "/" in node.name or node.name in (".", ".."):
            raise ValueError(f"illegal name: {node.name!r}")
        if node.name in self.children:
            raise AlreadyExists(f"{node.name} already exists in {self.path}")
        node.parent = self
        self.children[node.name] = node
        return node

    def walk(self) -> Iterator[Node]:
        for child in sorted(self.children.values(), key=lambda n: n.name):
            yield child
            if isinstance(child, Directory):
                yield from child.walk()          # iterative with an explicit stack if depth is huge

class FileSystem:
    def __init__(self) -> None:
        self.root = Directory("")

    @staticmethod
    def _segments(path: str) -> list[str]:
        if not path.startswith("/"):
            raise ValueError("only absolute paths are supported")
        out: list[str] = []
        for part in path.split("/"):
            if part in ("", "."):
                continue
            if part == "..":
                if out:
                    out.pop()                    # ".." at the root stays at the root, never escapes
                continue
            out.append(part)
        return out

    def resolve(self, path: str) -> Node:
        node: Node = self.root
        for segment in self._segments(path):
            if not isinstance(node, Directory):
                raise NotADirectory(f"{node.path} is a file")
            child = node.children.get(segment)
            if child is None:
                raise NotFound(path)
            node = child
        return node

    def mkdirs(self, path: str) -> Directory:
        node = self.root
        for segment in self._segments(path):
            child = node.children.get(segment)
            if child is None:
                child = node.add(Directory(segment))     # mkdir -p: existing dirs are not an error
            elif not isinstance(child, Directory):
                raise NotADirectory(f"{child.path} is a file")
            node = child
        return node

    def write(self, path: str, content: bytes) -> File:
        segments = self._segments(path)
        if not segments:
            raise ValueError("cannot write to the root")
        parent = self.mkdirs("/" + "/".join(segments[:-1]))
        existing = parent.children.get(segments[-1])
        if isinstance(existing, Directory):
            raise NotADirectory(f"{path} is a directory")
        if isinstance(existing, File):
            existing.content = content                   # overwrite, not a duplicate node
            return existing
        return parent.add(File(segments[-1], content))    # type: ignore[return-value]

    def read(self, path: str) -> bytes:
        node = self.resolve(path)
        if not isinstance(node, File):
            raise NotADirectory(f"{path} is a directory")
        return node.content

    def remove(self, path: str, recursive: bool = False) -> None:
        node = self.resolve(path)
        if node.parent is None:
            raise ValueError("cannot remove the root")
        if isinstance(node, Directory) and node.children and not recursive:
            raise FsError(f"{path} is not empty")
        del node.parent.children[node.name]
        node.parent = None

    def find(self, path: str, suffix: str) -> list[str]:
        start = self.resolve(path)
        if not isinstance(start, Directory):
            return [start.path] if start.name.endswith(suffix) else []
        return [n.path for n in start.walk() if isinstance(n, File) and n.name.endswith(suffix)]

fs = FileSystem()
fs.write("/home/asha/notes.md", b"hello")
fs.write("/home/asha/todo.md", b"x" * 10)
fs.mkdirs("/home/asha/empty")
assert fs.read("/home/asha/notes.md") == b"hello"
assert fs.resolve("/home/asha").size() == 15
assert fs.resolve("/home/asha/empty").size() == 0            # empty dir, not a crash
assert fs.find("/", ".md") == ["/home/asha/notes.md", "/home/asha/todo.md"]
assert fs.resolve("/home/asha/../asha/./notes.md").path == "/home/asha/notes.md"
assert fs.resolve("/../..") is fs.root                       # ".." cannot escape the root
fs.write("/home/asha/notes.md", b"replaced")
assert fs.read("/home/asha/notes.md") == b"replaced" and len(fs.resolve("/home/asha").children) == 3
for bad, exc in (("/nope", NotFound), ("/home/asha/notes.md/deeper", NotADirectory)):
    try:
        fs.resolve(bad)
        raise AssertionError("should have raised")
    except exc:
        pass
try:
    fs.remove("/home/asha")
except FsError as err:
    assert "not empty" in str(err)
fs.remove("/home/asha", recursive=True)
assert fs.resolve("/home").children == {} and fs.root.size() == 0`,
  },
  {
    id: 'lldq-text-editor',
    name: 'Text Editor',
    statement: 'Design the core of a text editor: a text buffer, a cursor, selection, and cut, copy and paste.',
    clarify: [
      'How large can a document get? That is the entire data-structure decision - a plain string is fine at 100KB and hopeless at 100MB.',
      'One cursor or many? Multiple cursors change Selection from a value into a collection and every operation with it.',
      'Do I need line-based operations - line count, go to line - or is it a flat character sequence?',
      'Is undo in scope here, or a separate concern? I would keep the buffer completely ignorant of undo.',
      'Unicode: are positions counted in code points or in grapheme clusters? An emoji with a skin-tone modifier is one thing to a user and several to Python.',
    ],
    entities: [
      'Buffer (ABC) - insert, delete, text, len. The interface is the interesting part, because it lets you name three implementations and their costs: a plain str (O(1) read, O(n) edit), a gap buffer (O(1) amortised at the cursor), and a piece table or rope (O(log n) anywhere, never copies the original).',
      'GapBuffer - one character list split by a gap at the cursor. Typing fills the gap instead of shifting the tail, and growth doubles so it stays amortised O(1).',
      'Selection (value object) - anchor and head, with start, end and is_empty derived. Anchor and head rather than start and end, because direction matters for shift-arrow.',
      'Editor - the facade over Buffer plus Selection plus clipboard. Typing over a selection replaces it; backspace at position 0 is a no-op, not a crash.',
      'Clipboard - deliberately a plain string here, and the seam if system clipboard integration arrives.',
    ],
    patterns: [
      'lldp-interfaces',
      'lldp-solid',
      'lldp-structural',
    ],
    extensions: [
      'Swap the gap buffer for a piece table. What in Editor has to change? (Nothing - and that is the answer the interface was for.)',
      'Add line numbers and go-to-line without rescanning the buffer on every keystroke.',
      'Add multiple cursors. What breaks in your Selection and in your insert path?',
      'Two people edit the same document at once. What is the first assumption in your model that has to go?',
    ],
    minutes: 60,
    companies: [
      'google',
      'amazon',
      'meta',
    ],
    diagram: `classDiagram
    class Editor {
        +text str
        +selection Selection
        +move_to(position)
        +select(start, end)
        +type_text(text)
        +backspace() str
        +cut() str
        +paste()
    }
    class Buffer {
        +insert(at, text)
        +delete(at, length) str
        +text() str
    }
    <<abstract>> Buffer
    class GapBuffer {
        -chars List
        -gap_start int
        -gap_end int
    }
    class StringBuffer {
        -value str
    }
    class PieceTable {
        -pieces List
    }
    class Selection {
        +anchor int
        +head int
        +start int
        +end int
        +is_empty bool
    }
    Editor *-- Buffer : owns the text store
    Editor *-- Selection : cursor and range
    Buffer <|-- GapBuffer
    Buffer <|-- StringBuffer
    Buffer <|-- PieceTable`,
    solution: `from abc import ABC, abstractmethod
from dataclasses import dataclass

class Buffer(ABC):
    """The interface is the interesting part: name three implementations and their costs.
      - plain str          : O(1) read, O(n) per edit. Fine up to a few hundred KB.
      - gap buffer         : O(1) amortised edits at the cursor, O(distance) to move the gap.
      - piece table / rope : O(log n) edits anywhere, and it is what real editors use because
                             the original file is never copied and undo is nearly free.
    Pick the gap buffer in a 60-minute round and say why the piece table would win at scale."""

    @abstractmethod
    def insert(self, at: int, text: str) -> None: ...
    @abstractmethod
    def delete(self, at: int, length: int) -> str: ...
    @abstractmethod
    def text(self) -> str: ...
    @abstractmethod
    def __len__(self) -> int: ...

class GapBuffer(Buffer):
    """One list of characters split by a gap at the cursor. Typing is O(1) amortised because
    it fills the gap instead of shifting the tail on every keystroke."""

    def __init__(self, initial: str = "", gap: int = 16) -> None:
        if gap < 1:
            raise ValueError("gap must be positive")
        self._chars = list(initial) + [""] * gap
        self._gap_start = len(initial)
        self._gap_end = len(self._chars)        # gap is [gap_start, gap_end)

    def __len__(self) -> int:
        return len(self._chars) - (self._gap_end - self._gap_start)

    def _move_gap(self, at: int) -> None:
        if not 0 <= at <= len(self):
            raise IndexError(f"position {at} is outside 0..{len(self)}")
        while self._gap_start > at:             # shift the gap left
            self._gap_start -= 1
            self._gap_end -= 1
            self._chars[self._gap_end] = self._chars[self._gap_start]
        while self._gap_start < at:             # shift the gap right
            self._chars[self._gap_start] = self._chars[self._gap_end]
            self._gap_start += 1
            self._gap_end += 1

    def _grow(self, needed: int) -> None:
        extra = max(needed, len(self._chars))   # double, so growth is amortised O(1)
        self._chars[self._gap_end:self._gap_end] = [""] * extra
        self._gap_end += extra

    def insert(self, at: int, text: str) -> None:
        self._move_gap(at)
        if self._gap_end - self._gap_start < len(text):
            self._grow(len(text) - (self._gap_end - self._gap_start))
        for ch in text:
            self._chars[self._gap_start] = ch
            self._gap_start += 1

    def delete(self, at: int, length: int) -> str:
        if length < 0:
            raise ValueError("length must be non-negative")
        length = min(length, len(self) - at)    # clamp: deleting past the end is not an error
        if length <= 0:
            return ""
        self._move_gap(at)
        removed = "".join(self._chars[self._gap_end:self._gap_end + length])
        self._gap_end += length                 # absorbing into the gap IS the delete
        return removed

    def text(self) -> str:
        return "".join(self._chars[:self._gap_start] + self._chars[self._gap_end:])

@dataclass
class Selection:
    anchor: int
    head: int

    @property
    def start(self) -> int: return min(self.anchor, self.head)
    @property
    def end(self) -> int: return max(self.anchor, self.head)
    @property
    def is_empty(self) -> bool: return self.anchor == self.head

class Editor:
    def __init__(self, buffer: Buffer | None = None) -> None:
        self._buffer = buffer or GapBuffer()
        self.selection = Selection(0, 0)
        self._clipboard = ""

    @property
    def text(self) -> str:
        return self._buffer.text()

    def move_to(self, position: int) -> None:
        self.selection = Selection(position, position)

    def select(self, start: int, end: int) -> None:
        self.selection = Selection(start, end)

    def type_text(self, text: str) -> None:
        if not self.selection.is_empty:
            self._buffer.delete(self.selection.start, self.selection.end - self.selection.start)
            self.move_to(self.selection.start)
        self._buffer.insert(self.selection.head, text)
        self.move_to(self.selection.head + len(text))

    def backspace(self) -> str:
        if not self.selection.is_empty:
            removed = self._buffer.delete(self.selection.start,
                                          self.selection.end - self.selection.start)
            self.move_to(self.selection.start)
            return removed
        if self.selection.head == 0:
            return ""                            # backspace at position 0 is a no-op, not a crash
        self.move_to(self.selection.head - 1)
        return self._buffer.delete(self.selection.head, 1)

    def copy(self) -> str:
        self._clipboard = self.text[self.selection.start:self.selection.end]
        return self._clipboard

    def cut(self) -> str:
        self.copy()
        self.backspace()
        return self._clipboard

    def paste(self) -> None:
        self.type_text(self._clipboard)

editor = Editor()
editor.type_text("hello world")
assert editor.text == "hello world" and editor.selection.head == 11
editor.move_to(5)
editor.type_text(",")
assert editor.text == "hello, world"
editor.select(0, 5)
assert editor.cut() == "hello" and editor.text == ", world"
editor.move_to(len(editor.text))
editor.paste()
assert editor.text == ", worldhello"
editor.move_to(0)
assert editor.backspace() == "" and editor.text == ", worldhello"      # at position 0
buf = GapBuffer("abc", gap=1)
buf.insert(3, "defghijkl")                       # forces a grow
assert buf.text() == "abcdefghijkl" and len(buf) == 12
assert buf.delete(10, 999) == "kl"               # clamped to the end
assert buf.text() == "abcdefghij"
assert buf.delete(0, 0) == "" and GapBuffer().delete(0, 5) == ""       # empty buffer is safe
try:
    buf.insert(999, "x")
except IndexError as exc:
    assert "outside" in str(exc)`,
  },
  {
    id: 'lldq-undo-redo',
    name: 'Undo and Redo',
    statement: 'Design undo and redo for an application with many kinds of edit.',
    clarify: [
      'Command-with-inverse, or full snapshots? A snapshot per edit is O(document) memory; an inverse is O(edit), but then every command must be invertible.',
      'Should typing twenty characters be one undo or twenty? Coalescing is a product decision I need before I design the stack.',
      'Is there a limit on history - a count of commands, or a memory budget?',
      'Must undo survive a restart, or is it in-memory only?',
      'Are there non-undoable actions like save or print, and do they clear the stack or pass through it?',
    ],
    entities: [
      'Command (ABC) - do(), undo(), and merge_with(later) returning the merged command or None. merge_with is what makes coalescing a property of the command rather than a special case in the manager.',
      'InsertText and DeleteRange - concrete commands. DeleteRange captures what it removed inside do(), because the inverse needs data the caller never had.',
      'UndoManager - two stacks. The rule people miss: a new command after an undo CLEARS the redo stack, because the future you undid no longer applies to this history.',
      'History limit - a deque with maxlen, so the oldest command is dropped for free rather than with a manual trim.',
      'Document - the receiver the commands act on. It knows nothing about undo, which is what keeps commands composable.',
    ],
    patterns: [
      'lldp-behavioural',
      'lldp-interfaces',
      'lldp-testability',
    ],
    extensions: [
      'A command raises halfway through do(). What state is the undo stack in, and is the document still consistent?',
      'Add a macro that groups ten commands into a single undo step.',
      'One command cannot be inverted cheaply - a global reformat. How do you mix a snapshot-based command with inverse-based ones in the same stack?',
      'Make undo survive a restart. What has to become serialisable?',
    ],
    minutes: 45,
    companies: [
      'google',
      'amazon',
      'meta',
    ],
    diagram: `classDiagram
    class UndoManager {
        -undo deque
        -redo List
        +undo_depth int
        +can_undo bool
        +can_redo bool
        +execute(command, coalesce)
        +undo() bool
        +redo() bool
    }
    class Command {
        +do()
        +undo()
        +merge_with(later) Command
    }
    <<abstract>> Command
    class InsertText {
        +at int
        +text str
    }
    class DeleteRange {
        +at int
        +length int
        -removed str
    }
    class Document {
        +text str
    }
    UndoManager o-- Command : undo and redo stacks
    Command <|-- InsertText
    Command <|-- DeleteRange
    InsertText --> Document : acts on
    DeleteRange --> Document : acts on`,
    solution: `from abc import ABC, abstractmethod
from collections import deque

class Command(ABC):
    """Command + inverse, not snapshots. A snapshot of the whole document per keystroke is
    the easy answer and it is O(document) memory per edit; an inverse command is O(edit).
    Say both, then pick the inverse, and use a snapshot only for commands that cannot be
    inverted cheaply (a global reformat, say)."""

    @abstractmethod
    def do(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...

    def merge_with(self, later: "Command") -> "Command | None":
        """Coalescing: typing 20 characters should be one Ctrl-Z, not 20. Return the merged
        command, or None when the two must stay separate."""
        return None

class Document:
    def __init__(self, text: str = "") -> None:
        self.text = text

class InsertText(Command):
    def __init__(self, doc: Document, at: int, text: str) -> None:
        if not 0 <= at <= len(doc.text):
            raise IndexError(f"position {at} is outside 0..{len(doc.text)}")
        self._doc, self._at, self._text = doc, at, text

    def do(self) -> None:
        self._doc.text = self._doc.text[:self._at] + self._text + self._doc.text[self._at:]

    def undo(self) -> None:
        end = self._at + len(self._text)
        self._doc.text = self._doc.text[:self._at] + self._doc.text[end:]

    def merge_with(self, later: "Command") -> "Command | None":
        if (isinstance(later, InsertText) and later._doc is self._doc
                and later._at == self._at + len(self._text) and "\\n" not in self._text):
            return InsertText(self._doc, self._at, self._text + later._text)
        return None

class DeleteRange(Command):
    def __init__(self, doc: Document, at: int, length: int) -> None:
        self._doc, self._at = doc, at
        self._length = max(0, min(length, len(doc.text) - at))
        self._removed = ""

    def do(self) -> None:
        self._removed = self._doc.text[self._at:self._at + self._length]
        self._doc.text = self._doc.text[:self._at] + self._doc.text[self._at + self._length:]

    def undo(self) -> None:
        self._doc.text = self._doc.text[:self._at] + self._removed + self._doc.text[self._at:]

class UndoManager:
    """Two stacks. The rule that catches people out: a new command after an undo CLEARS the
    redo stack, because the future you undid no longer applies to this history."""

    def __init__(self, limit: int = 100) -> None:
        if limit < 1:
            raise ValueError("limit must be >= 1")
        self._undo: deque[Command] = deque(maxlen=limit)    # maxlen drops the oldest for free
        self._redo: list[Command] = []

    @property
    def undo_depth(self) -> int:
        return len(self._undo)

    @property
    def can_undo(self) -> bool:
        return bool(self._undo)

    @property
    def can_redo(self) -> bool:
        return bool(self._redo)

    def execute(self, command: Command, coalesce: bool = True) -> None:
        command.do()
        self._redo.clear()
        if coalesce and self._undo:
            merged = self._undo[-1].merge_with(command)
            if merged is not None:
                self._undo[-1] = merged
                return
        self._undo.append(command)

    def undo(self) -> bool:
        if not self._undo:
            return False                                     # nothing to undo: False, not an error
        command = self._undo.pop()
        command.undo()
        self._redo.append(command)
        return True

    def redo(self) -> bool:
        if not self._redo:
            return False
        command = self._redo.pop()
        command.do()
        self._undo.append(command)
        return True

doc = Document()
mgr = UndoManager(limit=3)
for i, ch in enumerate("abc"):
    mgr.execute(InsertText(doc, i, ch))
assert doc.text == "abc"
assert mgr.undo_depth == 1                       # three keystrokes coalesced into one command
assert mgr.undo() and doc.text == ""
assert mgr.redo() and doc.text == "abc"
mgr.execute(DeleteRange(doc, 1, 1))
assert doc.text == "ac"
assert mgr.undo() and doc.text == "abc"
mgr.execute(InsertText(doc, 3, "!"), coalesce=False)
assert doc.text == "abc!" and not mgr.can_redo   # the redo of the delete was discarded
assert not UndoManager().undo() and not UndoManager().redo()
overflow = UndoManager(limit=2)
d2 = Document()
for i, word in enumerate(["x", "y", "z"]):
    overflow.execute(InsertText(d2, i, word), coalesce=False)
assert overflow.undo() and overflow.undo() and not overflow.undo()   # oldest was dropped
assert d2.text == "x"
try:
    InsertText(doc, 99, "boom")
except IndexError as exc:
    assert "outside" in str(exc)`,
  },
  {
    id: 'lldq-pub-sub',
    name: 'Publish-Subscribe System',
    statement: 'Design a publish-subscribe system: publishers post messages to topics and subscribers receive them.',
    clarify: [
      'Push to subscribers or do they pull? Pull gives back-pressure for free; push makes one slow subscriber everybody\'s problem.',
      'Is the log retained so a new subscriber can replay from the beginning, or is a message gone once delivered? Retention is the difference between a log and a queue.',
      'What ordering do we guarantee - global, per topic, or per key? Per-key ordering is what partitioning buys and what it costs.',
      'At-least-once or at-most-once, and what happens to a message whose handler keeps throwing?',
      'In-process, or a broker with network clients? I will design in-process and name what changes over a network.',
    ],
    entities: [
      'Topic - a name plus N partitions. Partitions are what allow parallel consumption while preserving order within a key.',
      'Partition - an append-only list of messages. The log is the source of truth; a subscriber is just a cursor into it, which is what makes replay possible at all.',
      'Message (value object) - topic, payload, optional key. Same key maps to the same partition, which is the whole ordering guarantee.',
      'Subscription - handler, a per-partition offset, an optional filter, and its own dead-letter list. Offsets are per subscriber, so two subscribers never interfere.',
      'Broker - topics, subscriptions, and poll(). Pull-based: a slow subscriber falls behind visibly as lag rather than silently growing a queue.',
      'Dead-letter list - where a message goes after max_delivery_attempts, which is what stops a poison message looping forever.',
    ],
    patterns: [
      'lldp-behavioural',
      'lldp-concurrency',
      'lldp-interfaces',
    ],
    extensions: [
      'One subscriber is ten million messages behind. What do you do, and what does the publisher see?',
      'Guarantee that two messages with the same key are processed in order by a pool of eight workers.',
      'Add persistence so the log survives a restart. What is the minimum you must fsync?',
      'A handler throws every time. Show me exactly why your delivery loop terminates.',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'google',
      'meta',
      'uber',
    ],
    diagram: `classDiagram
    class Broker {
        -topics Map
        -subs Map
        +create_topic(name, partitions) Topic
        +publish(topic, payload, key) tuple
        +subscribe(topic, handler, fromBeginning) str
        +poll(subscriptionId, maxMessages) int
        +lag(subscriptionId) int
        +dead_letter(subscriptionId) List
    }
    class Topic {
        +name str
        +partition_for(key) Partition
        +publish(message) tuple
    }
    class Partition {
        +index int
        +log List
        +append(message) int
    }
    class Message {
        +topic str
        +payload bytes
        +key str
    }
    class Subscription {
        +subscription_id str
        +offsets Map
        +filter_key str
        +dead_letter List
    }
    Broker *-- Topic : owns
    Broker *-- Subscription : owns
    Topic *-- Partition : ordered per key
    Partition o-- Message : append only log
    Subscription --> Partition : one offset per partition
    Subscription --> Message : delivers to handler`,
    solution: `from dataclasses import dataclass, field
from typing import Callable, Protocol
import threading

@dataclass(frozen=True)
class Message:
    topic: str
    payload: bytes
    key: str | None = None          # same key -> same partition -> ordering per key

class Subscriber(Protocol):
    def on_message(self, message: Message, offset: int) -> None: ...

@dataclass
class Partition:
    """An append-only log with per-subscriber offsets. This is the whole design: the log is
    the source of truth, a subscriber is just a cursor into it. Deleting on delivery (a
    queue) makes replay impossible, and replay is the first extension you will be asked for."""
    index: int
    log: list[Message] = field(default_factory=list)

    def append(self, message: Message) -> int:
        self.log.append(message)     # list.append is atomic under the GIL
        return len(self.log) - 1

class Topic:
    def __init__(self, name: str, partitions: int = 1) -> None:
        if partitions < 1:
            raise ValueError("need at least one partition")
        self.name = name
        self.partitions = [Partition(i) for i in range(partitions)]
        self._lock = threading.Lock()

    def partition_for(self, key: str | None) -> Partition:
        if key is None:
            return self.partitions[0]
        # hash() is salted per process; use a stable hash so a restart keeps key affinity.
        return self.partitions[sum(key.encode()) % len(self.partitions)]

    def publish(self, message: Message) -> tuple[int, int]:
        partition = self.partition_for(message.key)
        with self._lock:
            return partition.index, partition.append(message)

@dataclass
class Subscription:
    subscription_id: str
    topic: str
    handler: Callable[[Message, int], None]
    offsets: dict[int, int] = field(default_factory=dict)   # partition index -> next offset
    filter_key: str | None = None
    dead_letter: list[Message] = field(default_factory=list)

class Broker:
    def __init__(self, max_delivery_attempts: int = 3) -> None:
        self._topics: dict[str, Topic] = {}
        self._subs: dict[str, list[Subscription]] = {}
        self._by_id: dict[str, Subscription] = {}
        self._attempts = max_delivery_attempts
        self._lock = threading.Lock()
        self._seq = 0

    def create_topic(self, name: str, partitions: int = 1) -> Topic:
        with self._lock:
            if name not in self._topics:
                self._topics[name] = Topic(name, partitions)
            return self._topics[name]

    def publish(self, topic: str, payload: bytes, key: str | None = None) -> tuple[int, int]:
        if topic not in self._topics:
            raise KeyError(f"no such topic: {topic}")     # auto-create hides typos; ask first
        return self._topics[topic].publish(Message(topic, payload, key))

    def subscribe(self, topic: str, handler: Callable[[Message, int], None],
                  from_beginning: bool = True, filter_key: str | None = None) -> str:
        topic_obj = self._topics[topic]
        with self._lock:
            self._seq += 1
            sub = Subscription(f"sub-{self._seq}", topic, handler, filter_key=filter_key)
            for partition in topic_obj.partitions:
                sub.offsets[partition.index] = 0 if from_beginning else len(partition.log)
            self._subs.setdefault(topic, []).append(sub)
            self._by_id[sub.subscription_id] = sub
            return sub.subscription_id

    def unsubscribe(self, subscription_id: str) -> None:
        with self._lock:
            sub = self._by_id.pop(subscription_id, None)
            if sub is not None:
                self._subs[sub.topic].remove(sub)

    def poll(self, subscription_id: str, max_messages: int = 100) -> int:
        """Pull, not push. A slow subscriber then falls behind instead of blocking the
        publisher, and back-pressure is visible as lag rather than as a growing queue."""
        sub = self._by_id[subscription_id]
        topic = self._topics[sub.topic]
        delivered = 0
        for partition in topic.partitions:
            offset = sub.offsets[partition.index]
            while offset < len(partition.log) and delivered < max_messages:
                message = partition.log[offset]
                offset += 1                          # advance first: a poison message must not loop
                if sub.filter_key is not None and message.key != sub.filter_key:
                    continue
                for attempt in range(1, self._attempts + 1):
                    try:
                        sub.handler(message, offset - 1)
                        break
                    except Exception:
                        if attempt == self._attempts:
                            sub.dead_letter.append(message)   # at-least-once, then park it
                delivered += 1
            sub.offsets[partition.index] = offset
        return delivered

    def dead_letter(self, subscription_id: str) -> list[Message]:
        return list(self._by_id[subscription_id].dead_letter)

    def lag(self, subscription_id: str) -> int:
        sub = self._by_id[subscription_id]
        topic = self._topics[sub.topic]
        return sum(len(p.log) - sub.offsets[p.index] for p in topic.partitions)

broker = Broker(max_delivery_attempts=2)
broker.create_topic("orders", partitions=2)
seen: list[str] = []
sub_id = broker.subscribe("orders", lambda m, off: seen.append(m.payload.decode()))
broker.publish("orders", b"a", key="u1")
broker.publish("orders", b"b", key="u1")
broker.publish("orders", b"c", key="u2")
assert broker.lag(sub_id) == 3
assert broker.poll(sub_id) == 3 and broker.lag(sub_id) == 0
assert seen.count("a") == 1 and set(seen) == {"a", "b", "c"}
assert broker.poll(sub_id) == 0                       # offsets advanced, nothing redelivered

late = broker.subscribe("orders", lambda m, off: None, from_beginning=False)
broker.publish("orders", b"d", key="u1")
assert broker.poll(late) == 1                         # only messages published after it joined

def explode(message: Message, offset: int) -> None:
    raise RuntimeError("handler bug")

bad = broker.subscribe("orders", explode)
broker.poll(bad)
assert len(broker.dead_letter(bad)) == 4              # every message parked, no infinite retry
assert broker.lag(bad) == 0
broker.unsubscribe(bad)
try:
    broker.publish("nope", b"x")
except KeyError as exc:
    assert "no such topic" in str(exc)`,
  },
  {
    id: 'lldq-task-scheduler',
    name: 'Task Scheduler',
    statement: 'Design a task scheduler: run a function after a delay, or repeatedly on an interval, with retries on failure and the ability to cancel.',
    clarify: [
      'One process with a worker pool, or a distributed scheduler? Distributed brings leader election and a persistent store, and I want to know before I pick a data structure.',
      'Are repeating tasks fixed-rate, anchored to the original schedule, or fixed-delay, measured after the previous run finishes? They drift differently and users notice.',
      'What is the retry policy - fixed, exponential, capped - and is there a dead-letter after N failures?',
      'Exactly-once, at-least-once, or at-most-once? Exactly-once across a restart needs persistence and an idempotency key.',
      'Can a task be cancelled while it is running, or only while it is still scheduled? Those promise very different things.',
    ],
    entities: [
      'ScheduledTask - due time, priority, sequence number, the callable, interval, retry state. Ordered by (run_at, priority, seq) with compare=False on the callable, because two tasks due at the same instant would otherwise try to compare functions and raise TypeError.',
      'Scheduler - a min-heap keyed by due time. O(log n) push and pop; a sorted list is O(n) to insert and a thread per task dies at a few thousand tasks.',
      'Lazy cancellation - heapq cannot remove from the middle, so cancel() marks a tombstone and the pop loop skips it. Saying this out loud is the point.',
      'Clock (Protocol) with FakeClock - every test here advances a fake clock instead of sleeping, which is why the retry backoff is testable at all.',
      'TaskState (SCHEDULED / RUNNING / SUCCEEDED / FAILED / CANCELLED) - so a caller can tell a cancelled task from a failed one.',
      'Worker loop - in production it blocks on a condition variable with a timeout of (next due - now), so a newly scheduled earlier task wakes it immediately instead of after a fixed poll.',
    ],
    patterns: [
      'lldp-behavioural',
      'lldp-concurrency',
      'lldp-testability',
    ],
    extensions: [
      'A task takes longer than its own interval. Do you skip the missed run, queue it, or overlap - and what does your code currently do?',
      'Make it survive a restart with no task lost and none run twice.',
      'You have a million scheduled tasks, mostly far in the future. Is a heap still the right structure?',
      'Cancel a task that is currently running. What does your API actually promise, and what can it not promise?',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'google',
      'uber',
    ],
    diagram: `classDiagram
    class Scheduler {
        -heap List
        -cancelled Set
        -lock Lock
        +schedule(taskId, fn, delay, interval, maxRetries) ScheduledTask
        +cancel(taskId) bool
        +run_pending() List
        +next_due_in() float
    }
    class ScheduledTask {
        +run_at float
        +priority int
        +seq int
        +task_id str
        +interval float
        +max_retries int
        +attempts int
        +state TaskState
    }
    class TaskState {
        SCHEDULED
        RUNNING
        SUCCEEDED
        FAILED
        CANCELLED
    }
    <<enumeration>> TaskState
    class Clock {
        +now() float
    }
    <<interface>> Clock
    class SystemClock
    class FakeClock {
        +advance(seconds)
    }
    Scheduler *-- ScheduledTask : min heap by run_at
    Scheduler --> Clock : reads time from
    ScheduledTask --> TaskState : lifecycle
    Clock <|.. SystemClock
    Clock <|.. FakeClock`,
    solution: `from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Protocol
import heapq
import itertools
import threading

class Clock(Protocol):
    def now(self) -> float: ...

class FakeClock:
    def __init__(self, t: float = 0.0) -> None: self._t = t
    def now(self) -> float: return self._t
    def advance(self, seconds: float) -> None: self._t += seconds

class TaskState(Enum):
    SCHEDULED = "scheduled"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass(order=True)
class ScheduledTask:
    """order=True plus the field order below is the whole trick: the heap compares
    (run_at, priority, seq) and never touches \`fn\`, so two tasks due at the same instant
    break the tie deterministically instead of raising TypeError on an uncomparable callable."""
    run_at: float
    priority: int
    seq: int
    task_id: str = field(compare=False)
    fn: Callable[[], object] = field(compare=False)
    interval: float | None = field(default=None, compare=False)
    max_retries: int = field(default=0, compare=False)
    attempts: int = field(default=0, compare=False)
    state: TaskState = field(default=TaskState.SCHEDULED, compare=False)

class Scheduler:
    """A min-heap keyed by due time, not a sorted list and not a per-task thread. Push and
    pop are O(log n); a thread per task dies at a few thousand tasks. Cancellation is lazy:
    mark the id cancelled and skip it on pop, because heapq cannot remove from the middle."""

    def __init__(self, clock: Clock | None = None) -> None:
        self._clock = clock or FakeClock()
        self._heap: list[ScheduledTask] = []
        self._tasks: dict[str, ScheduledTask] = {}
        self._cancelled: set[str] = set()
        self._counter = itertools.count()
        self._lock = threading.Lock()

    def schedule(self, task_id: str, fn: Callable[[], object], delay: float = 0.0,
                 priority: int = 5, interval: float | None = None,
                 max_retries: int = 0) -> ScheduledTask:
        if delay < 0:
            raise ValueError("delay must be non-negative")
        if interval is not None and interval <= 0:
            raise ValueError("interval must be positive, or None for a one-shot task")
        with self._lock:
            if task_id in self._tasks and self._tasks[task_id].state is TaskState.SCHEDULED:
                raise ValueError(f"{task_id} is already scheduled")
            task = ScheduledTask(self._clock.now() + delay, priority, next(self._counter),
                                 task_id, fn, interval, max_retries)
            self._tasks[task_id] = task
            self._cancelled.discard(task_id)
            heapq.heappush(self._heap, task)
            return task

    def cancel(self, task_id: str) -> bool:
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None or task.state is not TaskState.SCHEDULED:
                return False
            task.state = TaskState.CANCELLED
            self._cancelled.add(task_id)
            return True

    def _due(self) -> ScheduledTask | None:
        while self._heap and self._heap[0].run_at <= self._clock.now():
            task = heapq.heappop(self._heap)
            if task.task_id in self._cancelled:
                continue                            # lazy deletion: skip the tombstone
            return task
        return None

    def run_pending(self) -> list[str]:
        """Drains everything due at the current instant. A real worker blocks on a condition
        variable with a timeout of (next_run_at - now), so a newly scheduled earlier task
        wakes it immediately instead of after a fixed poll interval."""
        ran: list[str] = []
        while True:
            with self._lock:
                task = self._due()
            if task is None:
                return ran
            task.state = TaskState.RUNNING
            task.attempts += 1
            try:
                task.fn()
                task.state = TaskState.SUCCEEDED
            except Exception:
                if task.attempts <= task.max_retries:
                    with self._lock:
                        task.state = TaskState.SCHEDULED
                        task.run_at = self._clock.now() + 2 ** (task.attempts - 1)
                        heapq.heappush(self._heap, task)
                    continue                        # backoff, and it is not "ran" yet
                task.state = TaskState.FAILED
            ran.append(task.task_id)
            if task.interval is not None and task.state is TaskState.SUCCEEDED:
                with self._lock:
                    # Next run is anchored to the previous due time, not to now, so a slow
                    # run does not make a 1s job drift into a 1.4s job.
                    task.run_at += task.interval
                    task.state = TaskState.SCHEDULED
                    task.attempts = 0
                    heapq.heappush(self._heap, task)

    def next_due_in(self) -> float | None:
        with self._lock:
            live = [t for t in self._heap if t.task_id not in self._cancelled]
            return min(t.run_at for t in live) - self._clock.now() if live else None

clock = FakeClock()
scheduler = Scheduler(clock)
log: list[str] = []
scheduler.schedule("a", lambda: log.append("a"), delay=10)
scheduler.schedule("b", lambda: log.append("b"), delay=5)
scheduler.schedule("tick", lambda: log.append("tick"), delay=1, interval=3)
assert scheduler.run_pending() == [] and scheduler.next_due_in() == 1
clock.advance(1)
assert scheduler.run_pending() == ["tick"]
clock.advance(9)                                     # now t=10: tick at 4,7,10 plus b and a
ran = scheduler.run_pending()
assert ran.count("tick") == 3 and set(ran) >= {"a", "b"}
assert log.count("tick") == 4

flaky_calls = {"n": 0}
def flaky() -> None:
    flaky_calls["n"] += 1
    if flaky_calls["n"] < 3:
        raise RuntimeError("transient")

scheduler.schedule("flaky", flaky, max_retries=3)
assert scheduler.run_pending() == []                 # first attempt failed, retry is in the future
clock.advance(1)
assert scheduler.run_pending() == []                 # second attempt failed too
clock.advance(2)
assert "flaky" in scheduler.run_pending() and flaky_calls["n"] == 3   # third attempt succeeds

assert scheduler.cancel("tick") and not scheduler.cancel("tick")
clock.advance(100)
assert "tick" not in scheduler.run_pending()
assert Scheduler(FakeClock()).next_due_in() is None  # empty scheduler, not a crash
try:
    scheduler.schedule("x", lambda: None, interval=0)
except ValueError as exc:
    assert "interval must be positive" in str(exc)`,
  },
  {
    id: 'lldq-inventory-management',
    name: 'Inventory Management',
    statement: 'Design inventory management for an e-commerce warehouse: stock levels, reservations at checkout, shipment, and stock counts.',
    clarify: [
      'Is stock tracked per warehouse or as one global number? Multi-warehouse turns availability from a read into a routing decision.',
      'Does adding to cart reserve stock, or only checkout? Reserving at cart means reservations need an expiry and a sweeper.',
      'Is overselling ever acceptable - backorders, pre-orders - or is the invariant hard?',
      'Do you want an audit trail of every movement, or only current levels? An append-only log is the difference between a discrepancy that is investigable and one that is a mystery.',
      'How are cycle-count discrepancies handled, and may on-hand ever go negative?',
    ],
    entities: [
      'StockLevel - on_hand and reserved, with available derived as the difference. Three numbers, never one: collapsing them into a single "stock" field makes you either oversell or lose stock on a cancel.',
      'Movement (value object) - an append-only record of every change with a type, a quantity and a reference. The counters are a materialised view of this log.',
      'MovementType (RECEIVE / RESERVE / RELEASE / SHIP / ADJUST) - so the log is queryable and an adjustment carries a reason.',
      'Inventory - the aggregate, keyed by (sku, warehouse), with the lock around every check-then-act. Reserving the last unit is the classic race.',
      'InsufficientStock - a typed exception carrying wanted and available, because the caller shows both to the user.',
      'Reorder points - a threshold per sku that raises a low-stock alert the moment available crosses it, evaluated inside the same critical section.',
    ],
    patterns: [
      'lldp-modelling',
      'lldp-concurrency',
      'lldp-solid',
    ],
    extensions: [
      'A cycle count finds fewer units than are currently reserved. Whose order gets cancelled, and who decides?',
      'Add multi-warehouse allocation, fulfilling one order from two warehouses.',
      'Add backorders. What does available mean now, and what does the customer see?',
      'Ten thousand people buy the last hundred units of a flash-sale item in one second. Where is your lock, and what is it scoped to?',
    ],
    minutes: 60,
    companies: [
      'amazon',
      'flipkart',
    ],
    diagram: `classDiagram
    class Inventory {
        -levels Map
        -movements List
        -lock Lock
        +receive(sku, warehouse, qty, at) Movement
        +reserve(sku, warehouse, qty, orderId, at) Movement
        +release(sku, warehouse, qty, orderId, at) Movement
        +ship(sku, warehouse, qty, orderId, at) Movement
        +adjust(sku, warehouse, counted, at, reason) Movement
        +total_available(sku) int
    }
    class StockLevel {
        +on_hand int
        +reserved int
        +available int
    }
    class Movement {
        +movement_id str
        +sku str
        +warehouse str
        +kind MovementType
        +quantity int
        +reference str
    }
    class MovementType {
        RECEIVE
        RESERVE
        RELEASE
        SHIP
        ADJUST
    }
    <<enumeration>> MovementType
    class ReorderPoint {
        +sku str
        +threshold int
    }
    class InsufficientStock {
        +wanted int
        +available int
    }
    Inventory *-- StockLevel : one per sku and warehouse
    Inventory *-- Movement : append only audit log
    Inventory o-- ReorderPoint : low stock thresholds
    Movement --> MovementType : kind
    Inventory --> InsufficientStock : raises`,
    solution: `from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import threading

class MovementType(Enum):
    RECEIVE = "receive"
    RESERVE = "reserve"
    RELEASE = "release"
    SHIP = "ship"
    ADJUST = "adjust"

@dataclass(frozen=True)
class Movement:
    """Every change is an append-only movement. The counters below are a materialised view
    of this log, which is what makes a stock discrepancy investigable instead of a mystery."""
    movement_id: str
    sku: str
    warehouse: str
    kind: MovementType
    quantity: int
    at: datetime
    reference: str | None = None

@dataclass
class StockLevel:
    on_hand: int = 0        # physically present
    reserved: int = 0       # promised to an order, still on the shelf

    @property
    def available(self) -> int:
        return self.on_hand - self.reserved      # the number a customer may buy

class InsufficientStock(Exception):
    def __init__(self, sku: str, wanted: int, available: int) -> None:
        super().__init__(f"{sku}: wanted {wanted}, available {available}")
        self.sku, self.wanted, self.available = sku, wanted, available

class Inventory:
    """Three numbers per (sku, warehouse), never one. Collapsing on_hand and available into
    a single "stock" field is the mistake: you then either oversell (reserve does not lower
    it) or lose stock (reserve decrements it and a cancel forgets to put it back)."""

    def __init__(self, reorder_points: dict[str, int] | None = None) -> None:
        self._levels: dict[tuple[str, str], StockLevel] = defaultdict(StockLevel)
        self._movements: list[Movement] = []
        self._reorder = reorder_points or {}
        self._lock = threading.Lock()
        self._seq = 0
        self.low_stock_alerts: list[tuple[str, str, int]] = []

    def _record(self, sku: str, warehouse: str, kind: MovementType, qty: int,
                at: datetime, reference: str | None) -> Movement:
        self._seq += 1
        movement = Movement(f"MV{self._seq:08d}", sku, warehouse, kind, qty, at, reference)
        self._movements.append(movement)
        return movement

    def level(self, sku: str, warehouse: str) -> StockLevel:
        return self._levels[(sku, warehouse)]

    def receive(self, sku: str, warehouse: str, qty: int, at: datetime,
                reference: str | None = None) -> Movement:
        if qty <= 0:
            raise ValueError("receive quantity must be positive")
        with self._lock:
            self._levels[(sku, warehouse)].on_hand += qty
            return self._record(sku, warehouse, MovementType.RECEIVE, qty, at, reference)

    def reserve(self, sku: str, warehouse: str, qty: int, order_id: str,
                at: datetime) -> Movement:
        if qty <= 0:
            raise ValueError("reserve quantity must be positive")
        with self._lock:                          # check-then-act: two orders, one last unit
            level = self._levels[(sku, warehouse)]
            if level.available < qty:
                raise InsufficientStock(sku, qty, level.available)
            level.reserved += qty
            movement = self._record(sku, warehouse, MovementType.RESERVE, qty, at, order_id)
            self._check_reorder(sku, warehouse, level)
            return movement

    def release(self, sku: str, warehouse: str, qty: int, order_id: str,
                at: datetime) -> Movement:
        with self._lock:
            level = self._levels[(sku, warehouse)]
            released = min(qty, level.reserved)   # never release more than is reserved
            level.reserved -= released
            return self._record(sku, warehouse, MovementType.RELEASE, released, at, order_id)

    def ship(self, sku: str, warehouse: str, qty: int, order_id: str,
             at: datetime) -> Movement:
        with self._lock:
            level = self._levels[(sku, warehouse)]
            if level.reserved < qty:
                raise ValueError(f"{sku}: shipping {qty} but only {level.reserved} reserved")
            level.reserved -= qty
            level.on_hand -= qty                  # both drop together, or the books never balance
            return self._record(sku, warehouse, MovementType.SHIP, qty, at, order_id)

    def adjust(self, sku: str, warehouse: str, counted: int, at: datetime,
               reason: str) -> Movement:
        """Cycle count. The delta can be negative (shrinkage) and that is the point: an
        adjustment is a first-class movement with a reason, never a silent overwrite."""
        with self._lock:
            level = self._levels[(sku, warehouse)]
            delta = counted - level.on_hand
            level.on_hand = counted
            if level.reserved > level.on_hand:
                level.reserved = level.on_hand    # a count-down can strand reservations
            return self._record(sku, warehouse, MovementType.ADJUST, delta, at, reason)

    def _check_reorder(self, sku: str, warehouse: str, level: StockLevel) -> None:
        threshold = self._reorder.get(sku)
        if threshold is not None and level.available <= threshold:
            self.low_stock_alerts.append((sku, warehouse, level.available))

    def total_available(self, sku: str) -> int:
        return sum(lvl.available for (s, _), lvl in self._levels.items() if s == sku)

    def history(self, sku: str) -> list[Movement]:
        return [m for m in self._movements if m.sku == sku]

now = datetime(2026, 4, 1, 10, 0)
inv = Inventory(reorder_points={"SKU1": 2})
inv.receive("SKU1", "BLR", 10, now)
inv.receive("SKU1", "HYD", 5, now)
assert inv.total_available("SKU1") == 15
inv.reserve("SKU1", "BLR", 4, "ord-1", now)
assert inv.level("SKU1", "BLR").on_hand == 10 and inv.level("SKU1", "BLR").available == 6
try:
    inv.reserve("SKU1", "BLR", 7, "ord-2", now)
except InsufficientStock as exc:
    assert exc.available == 6 and exc.wanted == 7
inv.release("SKU1", "BLR", 4, "ord-1", now)
assert inv.level("SKU1", "BLR").available == 10       # cancelling gives the stock back
inv.reserve("SKU1", "BLR", 8, "ord-3", now)
assert inv.low_stock_alerts == [("SKU1", "BLR", 2)]   # crossed the reorder point
inv.ship("SKU1", "BLR", 8, "ord-3", now)
level = inv.level("SKU1", "BLR")
assert (level.on_hand, level.reserved, level.available) == (2, 0, 2)
try:
    inv.ship("SKU1", "BLR", 1, "ord-4", now)
except ValueError as exc:
    assert "only 0 reserved" in str(exc)
inv.reserve("SKU1", "BLR", 2, "ord-5", now)
inv.adjust("SKU1", "BLR", counted=1, at=now, reason="cycle count: 1 unit damaged")
level = inv.level("SKU1", "BLR")
assert (level.on_hand, level.reserved, level.available) == (1, 1, 0)
assert inv.history("SKU1")[-1].quantity == -1         # shrinkage is recorded, not hidden
assert inv.level("SKU9", "BLR").available == 0        # unknown sku reads as zero, no KeyError
inv.release("SKU1", "BLR", 999, "ord-5", now)
assert inv.level("SKU1", "BLR").reserved == 0         # over-release is clamped`,
  },
]
