// Demo seed: a believable personal-knowledge-wiki dataset.
// Idempotent — upserts by slug/name everywhere, safe to run repeatedly.
// Run with: npm run seed:demo   (or: node prisma/seed-demo.mjs)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Mirrors generateSlug() in src/lib/utils.ts (and slugify() in WikiLinkExtension.ts)
function slugify(title) {
  return title
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Wiki-link anchor in the exact shape WikiLinkExtension.renderHTML() stores it:
//   <a href="/articles/<slug>" class="wiki-link" data-wiki-link="<Title>">label</a>
// resolveWikiLinks() scans for data-wiki-link="..." and rewrites the contiguous
// substring `class="wiki-link" data-wiki-link="<Title>"`, so attribute order matters.
function wl(title, label) {
  return `<a href="/articles/${slugify(title)}" class="wiki-link" data-wiki-link="${title}">${label || title}</a>`;
}

function d(iso) {
  return new Date(iso);
}

// ── Categories ─────────────────────────────────────────────────────────────
const rootCategories = [
  { name: "Technology", slug: "technology", description: "Computing, software, and the systems behind the tools I use", sortOrder: 0 },
  { name: "Science", slug: "science", description: "How the natural world works — biology, statistics, and method", sortOrder: 1 },
  { name: "Philosophy", slug: "philosophy", description: "Mental models, ethics, and frameworks for thinking clearly", sortOrder: 2 },
  { name: "Learning", slug: "learning", description: "Note-taking systems, memory, and how to actually retain knowledge", sortOrder: 3 },
  { name: "Projects", slug: "projects", description: "Things I am building, with running notes", sortOrder: 4 },
  { name: "Journal", slug: "journal", description: "Periodic reviews, workflows, and personal retrospectives", sortOrder: 5 },
  { name: "Reference", slug: "reference", description: "Evergreen lookups and cheat sheets", sortOrder: 6 },
];

const childCategories = [
  { name: "Programming", slug: "programming-topics", description: "Languages, algorithms, and craft", sortOrder: 0, parentSlug: "technology" },
  { name: "Systems & Networking", slug: "systems-networking", description: "Protocols, infrastructure, and how the internet fits together", sortOrder: 1, parentSlug: "technology" },
];

// ── Tags ───────────────────────────────────────────────────────────────────
const rootTags = [
  { name: "programming", slug: "programming", color: "#6366f1" },
  { name: "learning", slug: "learning", color: "#10b981" },
  { name: "systems", slug: "systems", color: "#f59e0b" },
  { name: "mental-models", slug: "mental-models", color: "#8b5cf6" },
  { name: "philosophy", slug: "philosophy", color: "#0ea5e9" },
  { name: "probability", slug: "probability", color: "#ec4899" },
  { name: "productivity", slug: "productivity", color: "#14b8a6" },
  { name: "health", slug: "health", color: "#ef4444" },
  { name: "finance", slug: "finance", color: "#84cc16" },
  { name: "writing", slug: "writing", color: "#f97316" },
  { name: "homelab", slug: "homelab", color: "#64748b" },
];

const childTags = [
  { name: "rust", slug: "rust", parentSlug: "programming" },
  { name: "algorithms", slug: "algorithms", parentSlug: "programming" },
  { name: "git", slug: "git", parentSlug: "programming" },
  { name: "networking", slug: "networking", parentSlug: "systems" },
  { name: "security", slug: "security", parentSlug: "systems" },
  { name: "note-taking", slug: "note-taking", parentSlug: "learning" },
  { name: "memory", slug: "memory", parentSlug: "learning" },
];

// ── Articles ───────────────────────────────────────────────────────────────
// Each entry: title, category slug, tags, status, isPinned, dates, excerpt, content (Tiptap HTML).
const articles = [
  {
    title: "Zettelkasten Method",
    category: "learning",
    tags: ["learning", "note-taking", "writing"],
    status: "published",
    isPinned: true,
    createdAt: d("2025-09-14T10:12:00Z"),
    updatedAt: d("2026-06-02T18:40:00Z"),
    excerpt: "Niklas Luhmann's slip-box system: atomic notes, dense linking, and why the value of a note collection compounds with connectivity rather than volume.",
    content: `
<h2>What it is</h2>
<p>The Zettelkasten ("slip box") is a note-taking system developed most famously by the sociologist Niklas Luhmann, who credited it with helping him publish over seventy books and hundreds of papers. The core move is deceptively simple: instead of filing notes by topic, you write small, atomic notes and link each one to the notes it relates to. The filing system is the network of links itself.</p>
<p>Luhmann treated the slip box as a conversation partner. Because every note had to be connected to something already in the box, adding a note forced him to ask: <em>what does this change about what I already believe?</em> That question is where the thinking happens.</p>
<h2>The three rules that matter</h2>
<ul>
<li><strong>Atomicity.</strong> One idea per note. If a note contains two ideas, you cannot link to either of them precisely.</li>
<li><strong>Write in your own words.</strong> A pasted quote is storage; a restatement is understanding. This is the same principle behind ${wl("The Feynman Technique")}.</li>
<li><strong>Link at write time.</strong> A note without links is a note you will never see again. The moment of writing is when context is cheapest.</li>
</ul>
<blockquote><p>"Every note is just an element that gets its quality from the network of links in the system. A note that is not connected to the network will be lost." — Luhmann, <em>Communicating with Slip Boxes</em></p></blockquote>
<h2>Why topic folders fail</h2>
<p>Hierarchical filing forces you to decide, at capture time, the single context in which an idea will be useful later. But interesting ideas are interesting precisely because they apply in contexts you did not anticipate. A note on incentive gradients filed under "Economics" is invisible when you are writing about software team design. Links are lazy-evaluated categorization: you defer the decision and make it many times, cheaply.</p>
<h2>How this wiki implements it</h2>
<p>My version of the system lives here. Notes that have earned permanence get promoted into ${wl("Evergreen Notes")} — durably titled, revised over time rather than appended to. Ideas I want to retain rather than merely reference go into a review queue driven by ${wl("Spaced Repetition")}. The combination covers both failure modes of note-taking: notes you cannot find, and notes you found but forgot.</p>
<h3>A typical capture flow</h3>
<ol>
<li>Fleeting note captured inline while reading (one sentence, no ceremony).</li>
<li>Within a day or two, rewrite it as a standalone note with a claim as its title.</li>
<li>Search the wiki for two or three existing notes it should link to, and add the links in both prose and the graph.</li>
<li>If the note states something I want available from memory, add a flashcard.</li>
</ol>
<h2>What it is not</h2>
<p>The Zettelkasten is not an archive, a read-it-later queue, or a journal. Its output is not "notes" — it is <em>drafts</em>. When enough linked notes accumulate around a theme, most of the writing is already done; assembling an essay becomes an act of arrangement rather than creation. If your slip box never produces writing, it has quietly become a scrapbook, and the effort-to-value ratio of a scrapbook is poor.</p>
<p>Related habits worth pairing with it: ${wl("Deliberate Practice")} for skills (notes do not build skills), and a periodic pruning pass — Luhmann's box worked because he used it daily, not because the method is magic.</p>
`,
  },
  {
    title: "Spaced Repetition",
    category: "learning",
    tags: ["learning", "memory"],
    status: "published",
    isPinned: false,
    createdAt: d("2025-09-20T08:30:00Z"),
    updatedAt: d("2026-04-11T09:05:00Z"),
    excerpt: "The single most evidence-backed technique in learning science: review material at expanding intervals timed to just before you would forget it.",
    content: `
<h2>The forgetting curve</h2>
<p>Hermann Ebbinghaus showed in the 1880s that memory decays roughly exponentially: most of what you learn today is gone within days unless it is reinforced. The insight behind spaced repetition is that each successful recall <em>flattens</em> the curve — after every review, the memory decays more slowly. So the optimal review schedule is one with expanding intervals: 1 day, 3 days, a week, a month, several months.</p>
<p>Crucially, the reviews must be <strong>active recall</strong> — retrieving the answer from memory, not rereading it. Recognition ("ah yes, I knew that") is nearly worthless as reinforcement; retrieval is what strengthens the trace.</p>
<h2>The SM-2 algorithm</h2>
<p>Most software implementations descend from SuperMemo's SM-2 algorithm (1987), which Anki also uses in modified form. Each card carries an <em>ease factor</em> and an <em>interval</em>. After a review you grade yourself, and the schedule updates:</p>
<pre><code class="language-text">if grade &gt;= 3 (correct):
    if repetitions == 0: interval = 1 day
    elif repetitions == 1: interval = 6 days
    else: interval = round(interval * easeFactor)
    repetitions += 1
else (lapse):
    repetitions = 0
    interval = 1 day

easeFactor += 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)
easeFactor = max(easeFactor, 1.3)</code></pre>
<p>The details matter less than the shape: easy cards drift toward yearly reviews and stop costing you time, while leeches keep coming back until they stick. This wiki's flashcard system stores exactly these fields per card.</p>
<h2>What to put into the system</h2>
<p>Spaced repetition is a power tool with a narrow blade. It works spectacularly for atomic, stable, unambiguous facts and poorly for everything else.</p>
<ul>
<li><strong>Great:</strong> vocabulary, APIs and shell flags, anatomy, definitions, key numbers, people and dates.</li>
<li><strong>Mediocre:</strong> concepts phrased as facts. Better to card several angles on the concept than one big card.</li>
<li><strong>Bad:</strong> anything you can derive quickly, anything still changing, anything you do not actually care about. Every card is a recurring tax; audit ruthlessly.</li>
</ul>
<h3>Card-writing rules</h3>
<ol>
<li>Minimum information principle: one fact per card, shortest possible answer.</li>
<li>Prefer cloze deletions over open questions for dense material.</li>
<li>Write cards in your own words — the same reason ${wl("Zettelkasten Method", "Zettelkasten")} notes must be rewritten, not clipped.</li>
<li>Delete or rewrite any card you fail three times running.</li>
</ol>
<h2>Relationship to understanding</h2>
<p>A common objection: "I want understanding, not memorization." This is a false dichotomy. Understanding is built out of retrieved components; you cannot reason fluently about TLS handshakes while looking up what a cipher suite is. Memory is the substrate of thought, and techniques like ${wl("The Feynman Technique")} test the structure while spaced repetition maintains the bricks. Used together — explain to find the gaps, card the gaps, review on schedule — they compound.</p>
`,
  },
  {
    title: "Evergreen Notes",
    category: "learning",
    tags: ["learning", "note-taking", "writing"],
    status: "published",
    isPinned: false,
    createdAt: d("2025-10-05T14:00:00Z"),
    updatedAt: d("2026-03-18T20:22:00Z"),
    excerpt: "Notes as living documents: concept-oriented, densely linked, and revised over years — Andy Matuschak's refinement of the slip-box idea.",
    content: `
<h2>The core idea</h2>
<p>Most notes are write-once, read-never. Evergreen notes — the term is Andy Matuschak's — invert this: a note is a <em>living document</em> that you return to and revise as your understanding deepens. The unit of progress is not "notes taken" but "notes improved."</p>
<p>The practice is a direct descendant of the ${wl("Zettelkasten Method")}, but it shifts the emphasis from accumulation to refinement. Luhmann's box grew by addition; an evergreen garden grows by tending.</p>
<h2>Properties of a good evergreen note</h2>
<ul>
<li><strong>Concept-oriented, not source-oriented.</strong> The note is "Willpower depletion is contested science", not "Notes on <em>Thinking, Fast and Slow</em> ch. 3". Sources feed notes; they are not notes.</li>
<li><strong>Atomic.</strong> One claim, fully developed. Same rule as the slip box.</li>
<li><strong>Titled as an API.</strong> The title should function as a claim you can transclude into a sentence. "Spaced repetition flattens the forgetting curve" is a usable title; "Memory stuff" is not.</li>
<li><strong>Densely linked.</strong> Each note should cite the notes it builds on and be reachable from the notes that build on it.</li>
</ul>
<blockquote><p>Better to have a hundred notes you revisit than ten thousand you never see again.</p></blockquote>
<h2>Titles as APIs</h2>
<p>The most transferable trick in the whole practice is treating note titles like function signatures. A well-named function can be called without reading its body; a well-titled note can be <em>cited in thought</em> without reopening it. When a title is a full claim, linking to it in another note reads as an argument: "this holds because [[Spaced repetition flattens the forgetting curve]]." Vague titles produce vague thinking, because you cannot compose them.</p>
<h2>Workflow in this wiki</h2>
<ol>
<li>Fleeting captures land in the inbox with minimal structure.</li>
<li>During weekly review, captures worth keeping are rewritten into claim-titled notes and linked into the graph.</li>
<li>When an existing note's claim turns out to be wrong or incomplete, I edit it in place. The revision history preserves the old thinking — the article's timeline is itself a record of changing my mind.</li>
<li>Facts worth having on instant recall get carded into ${wl("Spaced Repetition")}.</li>
</ol>
<h2>Failure modes</h2>
<p>Three ways I have watched this practice die (twice in my own hands):</p>
<ol>
<li><strong>Collector's fallacy.</strong> Highlighting and clipping feel like work but produce nothing durable. If a capture is never rewritten, it was entertainment.</li>
<li><strong>Premature ontology.</strong> Building elaborate folder trees and tag taxonomies before having a hundred real notes. Structure should be discovered, not designed.</li>
<li><strong>Write-only mode.</strong> Notes that are never revisited during actual writing or problem-solving. The fix is upstream: start every project by searching the garden first.</li>
</ol>
<p>The test of the system is whether writing gets easier over time. After a year of tending, drafting an essay should feel like assembling prefabricated parts — the same compounding effect described in ${wl("Compound Interest")}, applied to ideas.</p>
`,
  },
  {
    title: "The Feynman Technique",
    category: "learning",
    tags: ["learning", "writing"],
    status: "published",
    isPinned: false,
    createdAt: d("2025-10-19T16:45:00Z"),
    updatedAt: d("2026-01-25T11:10:00Z"),
    excerpt: "Explain it simply or you don't understand it: a four-step loop for converting the illusion of knowledge into the real thing.",
    content: `
<h2>The technique</h2>
<p>Named for physicist Richard Feynman, who was famous for reducing intimidating physics to plain language, the technique is a loop for exposing the difference between recognizing an idea and actually understanding it:</p>
<ol>
<li><strong>Pick a concept</strong> and write its name at the top of a blank page.</li>
<li><strong>Explain it in plain words</strong>, as if teaching a bright twelve-year-old. No jargon; jargon is where misunderstanding hides.</li>
<li><strong>Find the gaps.</strong> Every place you hesitate, hand-wave, or reach for a technical term you cannot unpack is a hole in your understanding. Go back to the source and fill exactly that hole.</li>
<li><strong>Simplify and analogize.</strong> Rewrite until the explanation flows, then invent an analogy. Analogies are compression tests: they fail loudly when your model is wrong.</li>
</ol>
<h2>Why it works</h2>
<p>Reading produces a treacherous feeling of fluency. The text is in front of you, so everything in it feels known — psychologists call this the <em>illusion of explanatory depth</em>. Most people believe they can explain how a zipper or a flush toilet works until asked to actually do it. Explanation is the cheapest available test that distinguishes familiarity from understanding, because generating an explanation requires retrieving and assembling the pieces yourself, with no text to lean on.</p>
<blockquote><p>"What I cannot create, I do not understand." — found on Feynman's blackboard at his death</p></blockquote>
<p>The generation step is the active ingredient. This makes the technique a close cousin of the retrieval practice underlying ${wl("Spaced Repetition")}: both replace passive re-exposure with effortful reconstruction.</p>
<h2>Where it fits in a note system</h2>
<p>In this wiki, the technique is effectively the drafting standard for ${wl("Evergreen Notes")}. A note that merely paraphrases a source has skipped steps 2 and 3; the tell is prose that leans on the source's own vocabulary. When I catch a note doing this, I rewrite it from memory first and only then check it against the original. The diff between the two versions is a precise map of what I had not understood.</p>
<h3>Practical variations</h3>
<ul>
<li><strong>Rubber-duck teaching:</strong> explain aloud to no one. Slower than writing but catches different gaps, especially in sequencing.</li>
<li><strong>The five-year-old pass:</strong> after the twelve-year-old version works, try one more compression level. Usually impossible — but the attempt locates the concept's irreducible core.</li>
<li><strong>Reverse Feynman:</strong> take someone else's simple explanation and expand it back into the technical version. Great for interview prep.</li>
</ul>
<h2>Limits</h2>
<p>The technique verifies conceptual understanding; it does not build skill. You can explain the ${wl("Rust Ownership Model")} flawlessly and still fight the borrow checker for a week — procedural fluency comes only from ${wl("Deliberate Practice")}. And for raw factual density (anatomy, vocabulary, flags of the world), explanation is inefficient; that is flashcard territory. Use the right tool: explain concepts, drill facts, practice skills.</p>
`,
  },
  {
    title: "Deliberate Practice",
    category: "learning",
    tags: ["learning", "productivity"],
    status: "published",
    isPinned: false,
    createdAt: d("2025-11-02T09:15:00Z"),
    updatedAt: d("2026-02-14T15:30:00Z"),
    excerpt: "Ericsson's research on expert performance: why ten thousand hours of comfortable repetition build nothing, and what the effective kind of practice actually looks like.",
    content: `
<h2>Practice is not repetition</h2>
<p>Anders Ericsson's studies of violinists, chess players, and athletes converge on an uncomfortable finding: experience alone does not produce expertise. Twenty years of driving does not make you a great driver; it makes you a comfortable one. Performance plateaus the moment execution becomes automatic, because automaticity is precisely the brain ceasing to adapt.</p>
<p>What separates experts is a specific activity Ericsson called <strong>deliberate practice</strong>, and it has a recognizable signature:</p>
<ul>
<li>It targets a <strong>specific weakness</strong>, not the whole skill.</li>
<li>It operates just <strong>beyond current ability</strong> — the practice fails often, by design.</li>
<li>It provides <strong>immediate feedback</strong> on each attempt.</li>
<li>It is <strong>mentally exhausting</strong> and cannot be sustained more than a few hours a day, even by professionals.</li>
</ul>
<blockquote><p>The popularized "10,000-hour rule" flattened this into a mileage counter. Ericsson himself objected: the number was an average, and the hours only count if they are the hard kind.</p></blockquote>
<h2>Why plateaus happen</h2>
<p>Skills automate. Automation frees attention, which is why you can drive and talk at once — but attention is exactly what improvement requires. The expert's trick is to <em>deautomatize</em>: deliberately operate at a speed or difficulty where errors return, so there is signal to learn from. Typing faster than you can type accurately, playing the passage at a tempo you miss notes at, writing the proof without the textbook open.</p>
<h2>Applying it to programming</h2>
<p>Most working programmers accumulate experience without practice — production work optimizes for shipping, not learning, and mostly exercises what you already know. Deliberate practice for a programmer looks different from work:</p>
<ol>
<li><strong>Re-implement primitives</strong> you normally import: a hash map, a parser, a small key-value store. Failure is safe and feedback is immediate (tests pass or they do not).</li>
<li><strong>Time-boxed katas with a twist</strong> — solve it again with no mutation, or no loops, or in a language that resists you, like fighting the borrow checker in the ${wl("Rust Ownership Model", "Rust ownership model")}.</li>
<li><strong>Read excellent code closely</strong> and predict each function's body before revealing it. Prediction with feedback is the fundamental unit of practice.</li>
<li><strong>Post-mortem your own diffs</strong> a month later. The gap between what you wrote and what you would write now is your curriculum.</li>
</ol>
<h2>Feedback is the bottleneck</h2>
<p>Of the four signature properties, feedback is the one most often missing in self-directed learning — and without it, practice degrades into repetition. Coaches exist to supply it. Absent a coach, you can manufacture feedback: tests, benchmarks, recording yourself, comparing against a reference solution, or explaining the attempt via ${wl("The Feynman Technique")} until the weak step exposes itself. Knowledge work rarely provides feedback by default; building the loop is itself the skill. Notes and study systems like the ${wl("Zettelkasten Method")} maintain what you know — but only practice extends what you can do.</p>
`,
  },
  {
    title: "How DNS Resolution Works",
    category: "systems-networking",
    tags: ["networking", "systems"],
    status: "published",
    isPinned: false,
    createdAt: d("2025-09-28T19:00:00Z"),
    updatedAt: d("2026-05-07T12:00:00Z"),
    excerpt: "From typing a hostname to getting an IP address: recursive resolvers, the root servers, delegation, caching, and the TTL tradeoff.",
    content: `
<h2>The problem DNS solves</h2>
<p>Machines route packets to IP addresses; humans remember names. DNS is the distributed, hierarchical, aggressively cached database that maps one to the other. It is arguably the largest distributed system in existence, and its design — delegation plus caching — is why it has scaled from a single HOSTS.TXT file to billions of lookups per second.</p>
<h2>The resolution path</h2>
<p>When you request <code>en.wikipedia.org</code>, the full (uncached) journey involves four parties:</p>
<ol>
<li><strong>Stub resolver</strong> — the tiny client in your OS. It asks one question of a recursive resolver and waits.</li>
<li><strong>Recursive resolver</strong> — usually your ISP's, or a public one like 1.1.1.1 or 8.8.8.8. It does the actual legwork and caches everything it learns.</li>
<li><strong>Root servers</strong> — thirteen named authorities (a.root-servers.net through m), massively replicated via anycast. They do not know the answer; they know who runs <code>.org</code>.</li>
<li><strong>TLD and authoritative servers</strong> — the <code>.org</code> servers refer the resolver to Wikipedia's own nameservers, which finally return the A/AAAA record.</li>
</ol>
<pre><code class="language-text">stub → recursive: "A record for en.wikipedia.org?"
recursive → root: same question
root → recursive: "ask the .org servers, here they are"
recursive → .org TLD: same question
TLD → recursive: "ask ns0.wikimedia.org, here it is"
recursive → authoritative: same question
authoritative → recursive: "208.80.154.224, TTL 300"
recursive → stub: answer (cached for 300s)</code></pre>
<p>Each referral is a <em>delegation</em>: no single server holds the whole map, and each zone controls its own records. That is the entire trick.</p>
<h2>Caching and TTLs</h2>
<p>In practice the root is almost never consulted — every step is cached. Each record carries a TTL (time to live) chosen by the zone owner, and the choice is a real tradeoff:</p>
<ul>
<li><strong>Long TTL (hours-days):</strong> fewer lookups, faster resolution, but changes propagate slowly — painful during failover.</li>
<li><strong>Short TTL (30-300s):</strong> agile failover and load shifting, at the cost of more query traffic and more exposure to resolver outages.</li>
</ul>
<p>The standard operational move before a migration is lowering the TTL a day in advance, switching the record, then raising it again.</p>
<h2>Common record types</h2>
<table>
<thead><tr><th>Type</th><th>Maps name to</th><th>Typical use</th></tr></thead>
<tbody>
<tr><td>A / AAAA</td><td>IPv4 / IPv6 address</td><td>The actual endpoint</td></tr>
<tr><td>CNAME</td><td>Another name</td><td>Aliasing www to apex, pointing at CDNs</td></tr>
<tr><td>MX</td><td>Mail server name</td><td>Email routing</td></tr>
<tr><td>TXT</td><td>Arbitrary text</td><td>SPF/DKIM, domain-ownership proofs</td></tr>
<tr><td>NS</td><td>Nameserver</td><td>Delegation itself</td></tr>
</tbody>
</table>
<h2>Trust, or the lack of it</h2>
<p>Classic DNS is unauthenticated UDP — any on-path attacker can forge answers, and cache-poisoning attacks exploit exactly this. DNSSEC signs records but deployment remains patchy; DNS-over-HTTPS encrypts the stub-to-resolver hop, which mostly moves the trust to the resolver operator. Critically, DNS integrity is <em>not</em> what keeps your banking session safe — that job belongs to certificate validation, covered in ${wl("How HTTPS Works")}. Even with a poisoned answer, an attacker without a valid certificate cannot impersonate the site.</p>
`,
  },
  {
    title: "How HTTPS Works",
    category: "systems-networking",
    tags: ["networking", "security", "systems"],
    status: "published",
    isPinned: false,
    createdAt: d("2025-11-16T13:20:00Z"),
    updatedAt: d("2026-05-07T12:15:00Z"),
    excerpt: "TLS in plain terms: the handshake, why asymmetric crypto bootstraps symmetric crypto, and what certificates actually prove.",
    content: `
<h2>Three guarantees</h2>
<p>HTTPS is HTTP running inside a TLS tunnel, and TLS provides three distinct guarantees that are worth keeping separate in your head:</p>
<ul>
<li><strong>Confidentiality</strong> — an observer sees which server you connected to, but not the request paths, headers, or bodies.</li>
<li><strong>Integrity</strong> — tampered records are detected and the connection dies.</li>
<li><strong>Authentication</strong> — you are talking to a server that holds the private key for a certificate covering that hostname. This is the guarantee people forget, and it is the load-bearing one.</li>
</ul>
<h2>Why two kinds of cryptography</h2>
<p>Symmetric ciphers (AES, ChaCha20) are fast but require both sides to already share a secret. Asymmetric cryptography (RSA, elliptic curves) lets strangers establish a shared secret over a hostile network, but it is thousands of times slower. TLS uses the classic hybrid: an asymmetric <em>handshake</em> to agree on keys, then symmetric encryption for the actual data. Modern TLS 1.3 uses ephemeral Diffie-Hellman key exchange, which adds <strong>forward secrecy</strong> — even if the server's long-term private key leaks next year, recorded traffic from today stays unreadable, because the session keys were never transmitted and are discarded.</p>
<h2>The TLS 1.3 handshake</h2>
<pre><code class="language-text">Client → Server: ClientHello
  (supported ciphers, key share, SNI: which hostname I want)
Server → Client: ServerHello
  (chosen cipher, key share, certificate, proof of private key)
-- both sides now derive identical session keys --
Client → Server: Finished (first encrypted record)
... application data flows, symmetric from here on ...</code></pre>
<p>TLS 1.3 cut the handshake to one round trip (from two in 1.2) and removed a museum's worth of broken options: RSA key exchange, CBC modes, renegotiation. Most of what made TLS configuration hazardous simply no longer exists in 1.3.</p>
<h2>What a certificate proves</h2>
<p>A certificate is a signed statement from a certificate authority: "the holder of this public key controls this hostname." Your OS and browser ship with a trust store of roughly 150 root CAs; any of them (or their intermediates) can vouch for any site, which is why CA compromise is a systemic risk, partially mitigated by Certificate Transparency logs that make every issued certificate publicly auditable.</p>
<p>Note what the certificate does <em>not</em> prove: that the site is honest, safe, or the one you meant to visit. A phishing domain gets a padlock in minutes from Let's Encrypt. The padlock means "encrypted connection to whoever owns this name" — nothing more.</p>
<h2>The full picture of a page load</h2>
<ol>
<li>Name to address via DNS — see ${wl("How DNS Resolution Works")} for that half of the story.</li>
<li>TCP connection to the address.</li>
<li>TLS handshake: authenticate, agree on keys.</li>
<li>HTTP requests inside the tunnel.</li>
</ol>
<p>Layering matters for reasoning about failures: DNS can lie about the address, but TLS certificate validation is what stops the lie from becoming an impersonation. Performance-wise, each layer adds a round trip, which is why CDNs terminate TLS close to users and why caching at every layer — including the strategies in ${wl("Caching Strategies")} — dominates real-world latency.</p>
`,
  },
  {
    title: "Rust Ownership Model",
    category: "programming-topics",
    tags: ["programming", "rust"],
    status: "published",
    isPinned: false,
    createdAt: d("2025-12-04T21:10:00Z"),
    updatedAt: d("2026-06-20T10:45:00Z"),
    excerpt: "Move semantics, borrowing, and lifetimes: how Rust gets memory safety without a garbage collector by making aliasing and mutation mutually exclusive.",
    content: `
<h2>The problem being solved</h2>
<p>Memory bugs — use-after-free, double-free, data races — come from an innocuous-sounding combination: <strong>aliasing plus mutation</strong>. Two pointers to the same data, one of them writes (or frees), the other one is now wrong. Garbage-collected languages solve this by never freeing anything that is still reachable, at the cost of a runtime. C solves it by trusting you, at the cost of CVEs. Rust's bet: make aliasing and mutation <em>mutually exclusive at compile time</em>.</p>
<h2>Ownership and moves</h2>
<p>Every value has exactly one owner. When the owner goes out of scope, the value is dropped — deterministic destruction, no GC. Assignment of a heap value <em>moves</em> ownership rather than copying:</p>
<pre><code class="language-rust">let s1 = String::from("hello");
let s2 = s1;            // ownership moves to s2
println!("{}", s1);     // compile error: value borrowed after move</code></pre>
<p>That error is the whole philosophy in one line: the compiler would rather reject a valid-looking program than allow one where two variables both believe they own — and will both free — the same buffer.</p>
<h2>Borrowing: the aliasing rules</h2>
<p>Moving everything would be unusable, so Rust lets you <em>borrow</em> references, governed by one rule: at any moment a value has either <strong>any number of shared references</strong> (<code>&amp;T</code>, read-only) <strong>or exactly one mutable reference</strong> (<code>&amp;mut T</code>) — never both.</p>
<pre><code class="language-rust">let mut v = vec![1, 2, 3];
let first = &amp;v[0];      // shared borrow of v
v.push(4);              // error: cannot borrow v as mutable
println!("{}", first);  // while a shared borrow is alive</code></pre>
<p>This example is not pedantry — <code>push</code> may reallocate the vector, leaving <code>first</code> dangling. The borrow checker is rejecting a real use-after-free that C++ would compile silently. The same rule, applied across threads, is why data races are compile errors in safe Rust: sharing mutable state between threads requires types (Mutex, atomics) that make the synchronization explicit.</p>
<h2>Lifetimes</h2>
<p>Lifetimes are the compiler's bookkeeping for how long references live; mostly inferred, occasionally annotated. A function returning a reference must tie it to an input, so it can never outlive the data it points into. When you fight the borrow checker, roughly 80% of the time the honest answer is that your design had an ownership story you had not thought through — the compiler is asking a fair question: <em>who owns this, and for how long?</em></p>
<h2>Escape hatches and costs</h2>
<ul>
<li><code>Clone</code>: just copy the data. Often the right call; correctness first.</li>
<li><code>Rc&lt;T&gt;</code> / <code>Arc&lt;T&gt;</code>: reference counting when ownership is genuinely shared.</li>
<li><code>RefCell&lt;T&gt;</code> / <code>Mutex&lt;T&gt;</code>: move the exclusive-access check to runtime.</li>
<li><code>unsafe</code>: you take over the proof obligation, in a searchable, auditable block.</li>
</ul>
<p>The costs are real: a learning curve measured in weeks and slower iteration on certain designs (graphs, self-referencing structures). What you get back is a class of bugs that simply does not occur, and — more subtly — codebases where ownership is documented in the types. Learning it is genuine ${wl("Deliberate Practice")}: the compiler is a tireless feedback loop, failing fast and specifically. For the "reject bad states at the boundary" idea applied more broadly, see ${wl("The Unix Philosophy")} — Rust applies the opposite tradeoff, doing at compile time what Unix defers to composition.</p>
`,
  },
  {
    title: "Big O Notation",
    category: "programming-topics",
    tags: ["programming", "algorithms"],
    status: "published",
    isPinned: false,
    createdAt: d("2026-01-10T17:30:00Z"),
    updatedAt: d("2026-02-01T09:00:00Z"),
    excerpt: "What asymptotic complexity actually claims, the standard classes from O(1) to O(n!), and the cases where the notation misleads more than it informs.",
    content: `
<h2>What the notation claims</h2>
<p>Big O describes how an algorithm's cost <em>grows</em> as input size grows — nothing more. It deliberately discards constant factors and lower-order terms, because for large enough n, growth rate dominates everything. An O(n) algorithm with a terrible constant beats an O(n²) algorithm with a great one <em>eventually</em>; Big O tells you nothing about where "eventually" is.</p>
<p>Formally, f(n) = O(g(n)) means f is bounded above by some constant multiple of g for all sufficiently large n. It is an upper bound on growth, not a running time.</p>
<h2>The standard classes</h2>
<table>
<thead><tr><th>Class</th><th>Name</th><th>Canonical example</th><th>n=1,000,000 feels like</th></tr></thead>
<tbody>
<tr><td>O(1)</td><td>Constant</td><td>Hash table lookup</td><td>Instant</td></tr>
<tr><td>O(log n)</td><td>Logarithmic</td><td>Binary search</td><td>~20 steps, instant</td></tr>
<tr><td>O(n)</td><td>Linear</td><td>Single scan</td><td>Milliseconds</td></tr>
<tr><td>O(n log n)</td><td>Linearithmic</td><td>Merge sort; comparison-sort floor</td><td>Milliseconds</td></tr>
<tr><td>O(n²)</td><td>Quadratic</td><td>Nested loops over pairs</td><td>Minutes</td></tr>
<tr><td>O(2ⁿ)</td><td>Exponential</td><td>Brute-force subsets</td><td>Heat death of the universe</td></tr>
</tbody>
</table>
<p>The practical dividing line is n log n: everything at or below it scales to real-world data sizes; quadratic survives only on small inputs; exponential means "find a different approach or accept approximation."</p>
<h2>Where the notation misleads</h2>
<ul>
<li><strong>Constants matter in practice.</strong> For small n — and much real data is small — insertion sort beats quicksort, which is why production sorts switch algorithms below a threshold.</li>
<li><strong>Memory hierarchy is invisible to Big O.</strong> A linked list and an array are both O(n) to traverse, but the array can be 100x faster: sequential access rides the cache, pointer-chasing defeats it. The model charges every operation equally; hardware does not.</li>
<li><strong>Worst case is not typical case.</strong> Hash tables are O(n) worst case and O(1) in any sane deployment. Quicksort is O(n²) worst case, and nobody cares, because randomized pivots make it vanishingly unlikely.</li>
<li><strong>Amortized analysis.</strong> A dynamic array's push is occasionally O(n) (resize) but O(1) averaged over a sequence — the honest unit of account is the sequence, not the operation.</li>
</ul>
<h2>How to actually use it</h2>
<p>Big O earns its keep in two moments. First, <strong>design time</strong>: seeing that a nested loop over users and orders is quadratic before writing it, and reaching for a hash join instead. Second, <strong>code review</strong>: complexity bugs (accidental O(n²) string building, an O(n) lookup inside a loop) are among the few bug classes visible from the armchair, no profiler needed.</p>
<blockquote><p>Rule of thumb: know the complexity of everything you call. The classic incident is the O(n) <code>contains</code> on a list that someone swore was a set.</p></blockquote>
<p>Past design and review, measure. A profiler tells you about constants, caches, and the n you actually have — the things Big O deliberately ignores. And often the winning move is not a better algorithm but not doing the work at all; that is the subject of ${wl("Caching Strategies")}.</p>
`,
  },
  {
    title: "The Unix Philosophy",
    category: "programming-topics",
    tags: ["programming", "systems"],
    status: "published",
    isPinned: false,
    createdAt: d("2026-01-28T11:00:00Z"),
    updatedAt: d("2026-04-03T14:20:00Z"),
    excerpt: "Do one thing well, compose through text streams, expect your output to become someone's input — and why these fifty-year-old rules still describe good software.",
    content: `
<h2>The rules</h2>
<p>Doug McIlroy — inventor of the Unix pipe — summarized the philosophy in 1978, and the formulation has barely needed editing since:</p>
<blockquote><p>Write programs that do one thing and do it well. Write programs to work together. Write programs to handle text streams, because that is a universal interface.</p></blockquote>
<p>Each clause carries weight. "Do one thing well" is about <em>composability through modesty</em> — a program with a narrow contract can be recombined in ways its author never imagined. "Work together" means your output is someone else's input, so resist decorating it. "Text streams" names a universal interface that any language, era, and skill level can produce and consume.</p>
<h2>The canonical demonstration</h2>
<p>McIlroy's famous rebuttal to Donald Knuth makes the case better than any essay. Knuth had published an elegant, bespoke literate program to count word frequencies. McIlroy replied with six stages of pipeline:</p>
<pre><code class="language-bash">tr -cs A-Za-z '\\n' &lt; input |
tr A-Z a-z |
sort |
uniq -c |
sort -rn |
head -n 10</code></pre>
<p>Six existing tools, none of which knows what a "word frequency" is, composed into a solution in a minute. The individual tools are unimpressive; the <em>algebra</em> connecting them is the achievement.</p>
<h2>Why it aged well</h2>
<p>The philosophy encodes a bet about uncertainty: you cannot predict future requirements, so optimize for recombination rather than anticipation. Fifty years later the bet keeps paying out in new costumes — microservices ("do one thing well" over HTTP), functional programming's small composable functions, container images, even shell-first data science. The failure modes it warns against also keep recurring: the monolithic tool that does forty things adequately, the binary format that locks data inside one program, the chatty output that breaks every downstream parser.</p>
<h2>Honest limitations</h2>
<ul>
<li><strong>Untyped text is a double-edged sword.</strong> Every pipeline stage re-parses upstream output, and a space in a filename breaks half the scripts ever written. Structured alternatives (JSON pipelines, PowerShell objects) trade universality for safety — a genuine tradeoff, not an error. Rust makes the opposite bet at the language level, encoding contracts in types, as discussed in ${wl("Rust Ownership Model")}.</li>
<li><strong>Composition has a ceiling.</strong> Interactive applications, GUIs, and tightly-coupled performance-critical systems resist the model; nobody builds a video editor from pipes.</li>
<li><strong>"One thing" is a judgment call.</strong> Git does one thing (version control) or several hundred (every subcommand), depending on where you draw the boundary — see ${wl("How Git Stores Data")} for the small core underneath its sprawling surface.</li>
</ul>
<h2>The transferable core</h2>
<p>Strip away the 1970s specifics and three habits remain, applicable to any system design: <strong>small pieces with narrow contracts</strong>, <strong>a universal interchange format agreed early</strong>, and <strong>optimizing for the recombinations you cannot foresee</strong>. When a design decision is hard, asking "which option keeps the pieces recombinable?" is rarely a bad tiebreaker.</p>
`,
  },
  {
    title: "How Git Stores Data",
    category: "programming-topics",
    tags: ["programming", "git", "systems"],
    status: "published",
    isPinned: false,
    createdAt: d("2026-02-19T20:00:00Z"),
    updatedAt: d("2026-03-30T16:50:00Z"),
    excerpt: "Git is a content-addressed object database with a commit graph on top: blobs, trees, commits, and why branches are just 41-byte files.",
    content: `
<h2>The mental model that makes Git click</h2>
<p>Git's interface is famously confusing; its data model is famously simple. Underneath every command sits a <strong>content-addressed object store</strong>: every object is named by the SHA-1 hash of its own contents. Same content, same name, stored once. Different content, different name, guaranteed. All of Git — branching, merging, integrity, deduplication — falls out of this one decision.</p>
<h2>Four object types</h2>
<ul>
<li><strong>Blob</strong> — file contents, nothing else. No filename, no permissions. Two identical files anywhere in history are one blob.</li>
<li><strong>Tree</strong> — a directory listing: names and modes pointing at blobs and other trees. A tree hash pins an entire directory snapshot.</li>
<li><strong>Commit</strong> — a pointer to one root tree, plus parent commit(s), author, timestamp, message. A commit is a snapshot with ancestry, <em>not</em> a diff.</li>
<li><strong>Tag</strong> — a signed, named pointer at a commit.</li>
</ul>
<pre><code class="language-bash">$ git cat-file -p HEAD
tree 92b8b6ffe1e0f2b7fd126e88a6446db0031aab29
parent 3f7a21c8d94b1e0acdd1a5c31a3e9f0b8c112233
author Mohammed &lt;m@example.com&gt; 1755865200 +0300

v5.2.2: remove dead functionality</code></pre>
<p>Follow the tree hash with <code>cat-file -p</code> again and you walk the actual stored snapshot. There is no magic below this level — it is a key-value store you can inspect by hand.</p>
<h2>Branches are 41 bytes</h2>
<p>A branch is a file in <code>.git/refs/heads/</code> containing one commit hash and a newline. That is the entire implementation. "Creating a branch" writes 41 bytes; committing appends objects and updates the ref. This is why Git branching is instant while older systems copied directories — and why deleting a branch loses nothing but a name: the commits remain, findable via <code>git reflog</code>, until garbage collection.</p>
<h2>Immutability and integrity</h2>
<p>Because names are hashes of contents, objects are immutable — "amending" a commit creates a <em>new</em> commit and moves the ref. History rewriting is always re-pointing, never editing. The same property gives integrity for free: corrupt one bit anywhere and the hash chain breaks loudly, since each commit's hash covers its tree and its parents, transitively covering all of history.</p>
<h2>Where the efficiency comes from</h2>
<p>Snapshots sound wasteful; two tricks make them cheap. First, unchanged files hash to existing blobs, and unchanged directories hash to existing trees — a commit touching one file adds a handful of objects, sharing everything else structurally. Second, <code>packfiles</code> periodically delta-compress similar objects against each other, recovering diff-level storage efficiency without making diffs the model.</p>
<h2>Design lineage</h2>
<p>The elegance is characteristic of its Unix heritage — a tiny composable core (the object store barely changed since 2005) under a sprawling porcelain, very much in the spirit of ${wl("The Unix Philosophy")}. The same content-addressing idea powers IPFS, Nix, container image layers, and every build cache worth using; it is one of those primitives that, once seen, shows up everywhere. Understanding the internals converts Git from incantations to a system you can reason about — <em>detached HEAD</em> stops being scary once you know HEAD is one more pointer file.</p>
`,
  },
  {
    title: "Caching Strategies",
    category: "systems-networking",
    tags: ["systems", "programming"],
    status: "review",
    isPinned: false,
    createdAt: d("2026-04-22T08:40:00Z"),
    updatedAt: d("2026-07-15T19:25:00Z"),
    excerpt: "Cache-aside, write-through, TTLs, and invalidation: the patterns, the two hard problems, and why every cache is a bet on repetition.",
    content: `
<h2>Why caching works at all</h2>
<p>Every cache is a bet that the recent past predicts the near future — that what was just requested will be requested again. The bet pays because real workloads are wildly skewed: a small fraction of keys receives most of the traffic (roughly Zipf-distributed), so a cache holding 1% of the data can serve 90% of the requests. When access patterns are uniform or one-shot (full table scans, backup reads), the bet loses and a cache only adds latency and complexity.</p>
<h2>The core patterns</h2>
<h3>Cache-aside (lazy loading)</h3>
<p>The application checks the cache first; on a miss it reads the database and populates the cache. Simple, resilient (cache death just means slow, not wrong), and the default choice. Weaknesses: the first request after expiry eats the miss, and a popular key expiring can send a herd of concurrent misses to the database — the <em>thundering herd</em>, mitigated by locking or probabilistic early refresh.</p>
<h3>Write-through and write-behind</h3>
<p>Write-through updates cache and database together, keeping the cache warm and consistent at the cost of write latency. Write-behind acknowledges immediately and flushes asynchronously — fast and dangerous, since an outage loses acknowledged writes. Use write-behind only where loss is tolerable (counters, analytics).</p>
<h3>Eviction policies</h3>
<ul>
<li><strong>LRU</strong> — evict least-recently-used; the sane default and what Redis approximates.</li>
<li><strong>LFU</strong> — frequency-based; resists one-off scans polluting the cache, but adapts slowly when popularity shifts.</li>
<li><strong>TTL</strong> — not eviction but expiry: a bound on staleness, and the bluntest, most reliable invalidation there is.</li>
</ul>
<h2>Invalidation, the actual hard problem</h2>
<blockquote><p>"There are only two hard things in computer science: cache invalidation and naming things." — Phil Karlton</p></blockquote>
<p>The joke endures because invalidation is a <em>distributed consistency</em> problem in disguise: the cache is a replica, and updating a replica exactly once, in order, during failures, is the hard part of distributed systems. The practical hierarchy, from robust to fragile:</p>
<ol>
<li><strong>Short TTLs</strong> — bounded staleness, zero coordination. Choose this whenever the product tolerates it.</li>
<li><strong>Explicit invalidation on write</strong> — precise, but now every write path must know every cache key it affects, and a missed one is an unbounded-staleness bug.</li>
<li><strong>Versioned keys</strong> — never invalidate, change the key (<code>user:42:v7</code>); old entries age out. Elegant where key cardinality allows.</li>
</ol>
<h2>Caches all the way down</h2>
<p>The same patterns recur at every layer: CPU caches, page cache, application memory, Redis, CDN edges, browser HTTP cache — and DNS resolvers, whose TTL tradeoffs are the purest example (see ${wl("How DNS Resolution Works")}). Layering is why cache bugs are maddening: a stale response may be cached in four places, and "did you clear the cache" is a genuinely deep question. When reasoning about a system's performance, asking <em>what is cached where, for how long, and what invalidates it</em> usually explains more than any amount of ${wl("Big O Notation", "asymptotic analysis")}.</p>
`,
  },
  {
    title: "Antifragility",
    category: "philosophy",
    tags: ["mental-models", "philosophy"],
    status: "published",
    isPinned: true,
    createdAt: d("2025-10-12T12:00:00Z"),
    updatedAt: d("2026-07-28T21:35:00Z"),
    excerpt: "Taleb's triad — fragile, robust, antifragile — and the systems that gain from disorder: why some things need stressors the way muscles need load.",
    content: `
<h2>The missing word</h2>
<p>Nassim Taleb's central observation is lexical: we have a word for things harmed by volatility (<em>fragile</em>) and a word for things indifferent to it (<em>robust</em>), but no word for things that <strong>benefit</strong> from shocks — so we fail to notice how many such things exist. Muscles grow from stress. Immune systems require exposure. Good ideas sharpen under attack. Taleb's coinage, <em>antifragile</em>, names the third category.</p>
<table>
<thead><tr><th>Category</th><th>Response to stressors</th><th>Emblem</th><th>Wants</th></tr></thead>
<tbody>
<tr><td>Fragile</td><td>Breaks</td><td>Porcelain cup</td><td>Tranquility</td></tr>
<tr><td>Robust</td><td>Unchanged</td><td>Stone</td><td>Indifferent</td></tr>
<tr><td>Antifragile</td><td>Improves</td><td>Hydra</td><td>Volatility (in doses)</td></tr>
</tbody>
</table>
<h2>The mechanism: optionality</h2>
<p>Strip the rhetoric and antifragility has a precise engine: <strong>asymmetric payoffs</strong>. A system is antifragile when disorder costs it little on the downside and offers a lot on the upside — mathematically, when its response to volatility is convex. A venture portfolio is the clean example: each bet can lose 1x and win 100x, so <em>more variance is better</em>. Evolution runs on the same asymmetry — individual organisms are fragile, the species' option-generating process is antifragile. Once you see the convexity framing, "gains from disorder" stops being mystical and becomes a shape you can look for in any payoff structure.</p>
<h2>Fragilizing by protecting</h2>
<p>The book's sharpest practical warning: suppressing small stressors often <em>transfers</em> fragility to the tail. Forests managed to prevent all small fires accumulate fuel for catastrophic ones. Never-tested backup systems fail on the day they matter — the reason chaos engineering deliberately injects failures. Interventions that remove volatility frequently remove the information and adaptation the volatility carried; stability achieved by suppression is fragility on layaway.</p>
<h2>The barbell</h2>
<p>Taleb's portfolio construction for an antifragile life: combine <strong>extreme safety</strong> in most things with <strong>aggressive risk-taking</strong> in small, capped doses — and avoid the deceptively moderate middle, where risks are large enough to ruin you and too small to transform you. Ninety percent in boring safety, ten percent in bets with unbounded upside. The middle office job with hidden layoff risk is the fragile position; the barbell of stable income plus wild side projects is not.</p>
<h2>Using it honestly</h2>
<p>The concept degrades into a slogan when "what doesn't kill you makes you stronger" is applied without checking the mechanism — plenty of what does not kill you just weakens you. The honest checklist: <em>Is the downside capped? Is the upside open? Does the system actually adapt after stress, and at what layer?</em> (Systems are often antifragile only at the ensemble level, at the expense of members.) The old questions of ${wl("Stoicism in Practice", "Stoic practice")} — what is the worst case, can I absorb it — are the same audit run on a personal scale, and the related ${wl("The Lindy Effect", "Lindy effect")} applies the survival logic to ideas and technologies over time.</p>
`,
  },
  {
    title: "Stoicism in Practice",
    category: "philosophy",
    tags: ["philosophy", "productivity"],
    status: "published",
    isPinned: false,
    createdAt: d("2025-11-25T07:50:00Z"),
    updatedAt: d("2026-06-09T18:00:00Z"),
    excerpt: "The dichotomy of control, negative visualization, and voluntary discomfort — Stoicism as a set of daily exercises rather than a temperament.",
    content: `
<h2>Not a temperament, a practice</h2>
<p>Lowercase-s "stoic" has come to mean emotionally suppressed, which is nearly the opposite of the school. The Stoics — Marcus Aurelius writing private notes as emperor, Epictetus teaching as a freed slave, Seneca advising Nero while negotiating his own compromises — built a system of <em>daily exercises</em> for keeping judgment clear under pressure. It survives because it was engineered by practitioners under real stress, not theorized from an armchair.</p>
<h2>The dichotomy of control</h2>
<blockquote><p>"Some things are up to us and some are not." — Epictetus, opening line of the <em>Enchiridion</em></p></blockquote>
<p>The load-bearing move of the whole system. Up to us: judgments, intentions, responses. Not up to us: outcomes, reputations, other people, the past. The Stoic claim is that misery mostly comes from staking well-being on the second category, and the practical skill is re-sorting concerns into the right bin, dozens of times a day. An interview: preparation is yours, the decision is not. A difficult conversation: your words are yours, the reaction is not. The re-sort does not reduce effort — it <em>redirects</em> it toward the levers that exist.</p>
<h2>The exercises</h2>
<h3>Negative visualization (premeditatio malorum)</h3>
<p>Periodically and deliberately imagine losing what you value — the job, the relationship, the health. Two effects, both testable in your own experience: rehearsed setbacks lose their power to blindside, and contemplated loss renews attention to what is currently, quietly present. It is gratitude practice run through a pessimist's compiler.</p>
<h3>Voluntary discomfort</h3>
<p>Seneca recommended scheduled days of plain food and rough clothes, asking "is this what I feared?" Cold showers, fasting, and hard training serve the same function: calibrating the fear of loss against the reality, which is usually milder than the anticipation. Comfort, unexamined, quietly becomes a requirement; discomfort practice keeps it a preference. There is a clear kinship with ${wl("Antifragility", "antifragile")} systems that need stressors to stay strong.</p>
<h3>The evening review</h3>
<p>Seneca's nightly audit: What did I do badly? What did I do well? What did I omit? Ten minutes, three questions, written down. This is the feedback loop of the whole practice — without it the exercises drift into ritual. (It is, recognizably, ${wl("Deliberate Practice")} applied to character: specific errors, reviewed with feedback, retried tomorrow.)</p>
<h2>Honest objections</h2>
<p>Two criticisms deserve standing. First, the dichotomy of control can rationalize passivity — "outcomes aren't up to me" shading into not trying. The classical answer (Cicero's archer: aim perfectly, release, accept the wind) is good but demands maturity to apply. Second, preemptively loosening attachments may trade the peaks of joy against the valleys of grief; whether that trade is wise is a genuine values question, not a settled one. Practiced honestly, though, Stoicism is less about feeling nothing than about <em>wasting nothing</em> — no anguish spent on levers that were never yours.</p>
`,
  },
  {
    title: "First Principles Thinking",
    category: "philosophy",
    tags: ["mental-models"],
    status: "published",
    isPinned: false,
    createdAt: d("2025-12-15T10:30:00Z"),
    updatedAt: d("2026-02-27T13:15:00Z"),
    excerpt: "Reasoning from physics rather than precedent: decompose the problem into constraints that are actually true, then rebuild — expensive, occasionally revolutionary.",
    content: `
<h2>Two modes of reasoning</h2>
<p>Most reasoning is <strong>analogical</strong>: this is like that, so do what worked for that. It is fast, cheap, and usually right — precedent encodes centuries of debugging. <strong>First principles</strong> reasoning instead decomposes a problem into its foundational constraints — things true by physics, mathematics, or economics rather than by convention — and rebuilds the solution from those alone. It is slow, expensive, error-prone, and occasionally the only way to notice that everyone has been solving the wrong problem.</p>
<h2>The canonical example</h2>
<p>Rocket launches cost roughly $65M when SpaceX started. Analogical reasoning: launches cost ~$65M, budget accordingly. First-principles: a rocket is aluminum, titanium, fuel, and electronics — sum the commodity prices and you get about 2% of the launch price. The other 98% is convention: expendable vehicles, bespoke processes, cost-plus contracting. That decomposition does not build the reusable rocket, but it proves a 10x improvement is not forbidden by physics — which is exactly the information analogy can never provide, because analogy only interpolates between existing examples.</p>
<h2>The method, concretely</h2>
<ol>
<li><strong>State the goal without the inherited solution.</strong> Not "a cheaper rocket" but "mass to orbit per dollar."</li>
<li><strong>List the constraints and interrogate each:</strong> physics, or regulation, or convention, or someone's preference wearing a convention costume? Most alleged constraints fail this audit.</li>
<li><strong>Price the floor.</strong> What do the irreducible inputs cost? The gap between floor and current practice is the opportunity.</li>
<li><strong>Rebuild upward,</strong> re-admitting conventional choices only when they re-justify themselves.</li>
</ol>
<h2>When to pay the cost</h2>
<p>First-principles analysis is a scarce resource; spent everywhere, you re-derive arithmetic at breakfast. The heuristics for when it earns its cost:</p>
<ul>
<li>The domain's assumptions were set under conditions that no longer hold (a price collapse, a new technology).</li>
<li>Everyone repeats the same justification and nobody can source it.</li>
<li>Incumbent solutions cluster tightly — convergence suggests copying, not optimization.</li>
<li>You are about to commit years or fortunes, so the audit is cheap relative to the bet.</li>
</ul>
<blockquote><p>Analogy is the default and should be: it is how knowledge compounds. First principles is the audit you run when the default smells wrong.</p></blockquote>
<h2>The failure mode and its guardrail</h2>
<p>The technique's dark twin is naive disruption: declaring an industry's practices stupid, rebuilding from scratch, and rediscovering — expensively — why the practices existed. Plenty of "conventions" are load-bearing in ways invisible from outside. The guardrail is ${wl("Chesterton's Fence")}: before demolishing an inherited practice, be able to state what it was for. First principles tells you what is possible; the fence tells you what the existing structure was doing. Run both, in that order, and you get the upside of fresh thinking without paying full price for old lessons. On the input side, the audit is only as good as your priors are calibrated — ${wl("Bayes' Theorem", "Bayesian updating")} is the discipline for that half.</p>
`,
  },
  {
    title: "Chesterton's Fence",
    category: "philosophy",
    tags: ["mental-models"],
    status: "published",
    isPinned: false,
    createdAt: d("2026-02-08T15:00:00Z"),
    updatedAt: d("2026-03-12T10:40:00Z"),
    excerpt: "Don't remove a fence until you know why it was put up: a principle about hidden load-bearing structure in inherited systems, and its limits.",
    content: `
<h2>The parable</h2>
<p>G.K. Chesterton, 1929: a reformer finds a fence across a road and, seeing no purpose, proposes removing it. The wiser reply: <em>"If you don't see the use of it, I certainly won't let you clear it away. Go and think; when you can tell me why it is here, I may allow you to destroy it."</em></p>
<p>The principle is narrow and precise — it is not "never change things." It is: <strong>the inability to see a reason is not evidence there is no reason.</strong> Fences are built by people expending effort; effort implies purpose; your ignorance of the purpose is a fact about you, not about the fence. Understanding first is the toll you pay for the right to demolish.</p>
<h2>Where the fences are</h2>
<p>Software is fence country, because code outlives context:</p>
<ul>
<li>The <code>sleep(2)</code> in a deploy script that turns out to paper over a race in a vendor API.</li>
<li>The validation rule nobody remembers, which encodes a regulatory requirement from an incident before your tenure.</li>
<li>The "pointless" retry wrapper that is the only thing standing between you and a flaky upstream at 3 a.m.</li>
</ul>
<p>The universal experience: delete the weird thing, ship, and three weeks later an obscure failure teaches you — expensively — what the weird thing was for. Every senior engineer's respect for old code is scar tissue from exactly this loop.</p>
<h2>Applying it without being paralyzed by it</h2>
<ol>
<li><strong>Archaeology first.</strong> Version control blame, commit messages, tickets, the author if reachable. Twenty minutes of history often answers the question outright — this is why commit messages explaining <em>why</em> are a gift to the future.</li>
<li><strong>Reconstruct the threat model.</strong> What failure would this plausibly prevent? Can you trigger that failure in a test environment with the fence removed?</li>
<li><strong>Time-box the investigation.</strong> If honest effort finds nothing, you are allowed to conclude the reason is gone or never existed — fences do rot.</li>
<li><strong>Remove reversibly.</strong> Feature-flag it, deprecate loudly, keep the revert one command away. Reversibility converts a bet into an experiment.</li>
</ol>
<h2>The counter-failure</h2>
<p>The principle has a dark twin of its own: <strong>fence worship</strong>. Systems accrete genuinely purposeless structure — workarounds for bugs fixed a decade ago, rules whose regulation was repealed — and "someone must have had a reason" becomes a universal veto on change. The test of honest use is symmetry: the fence rule obligates you to <em>investigate</em>, not to <em>preserve</em>. Once you can state what the fence was for and show the need is gone, tearing it down is not recklessness; it is maintenance. The principle pairs naturally with ${wl("First Principles Thinking")} — one audits what is possible, the other audits what is already there — and misjudging fences from a sample of visible survivors is exactly the trap described in ${wl("Survivorship Bias")}.</p>
`,
  },
  {
    title: "The Lindy Effect",
    category: "philosophy",
    tags: ["mental-models", "probability"],
    status: "review",
    isPinned: false,
    createdAt: d("2026-05-14T09:20:00Z"),
    updatedAt: d("2026-08-10T17:05:00Z"),
    excerpt: "For non-perishables, age predicts longevity: why the fifty-year-old book and the forty-year-old protocol are good bets — and where the heuristic breaks.",
    content: `
<h2>The claim</h2>
<p>For <strong>perishable</strong> things — organisms, machines — expected remaining life <em>decreases</em> with age; a 90-year-old does not expect another 90 years. The Lindy effect observes that for <strong>non-perishable</strong> things — ideas, books, technologies, institutions — the relationship inverts: the longer something has survived, the longer it is likely to keep surviving. A book in print for fifty years is a better bet for the next fifty than this year's bestseller is for five.</p>
<h2>Why it works</h2>
<p>Survival time is evidence. Everything faces a continuous barrage of chances to die — competition, obsolescence, fashion cycles, refutation. Surviving decades of that barrage is data suggesting the thing has properties that resist the barrage, even if you cannot name them. Age, for non-perishables, is an <em>audition already passed</em>. Statistically the effect falls out of power-law lifetime distributions, where conditional expected remaining life grows with age — in Taleb's strong formulation, proportionally: every additional year of survival raises the expectation of another year.</p>
<h2>Using it</h2>
<ul>
<li><strong>Reading:</strong> the strongest practical application. The classics filter is a century of readers voting with attention; this year's business bestseller has passed no filter but marketing. Default old, sample new.</li>
<li><strong>Technology choices:</strong> SQL (1974), Unix (1969), TCP/IP (1974), Lisp (1958) keep outliving their announced replacements. For load-bearing infrastructure, boring old tools are the Lindy pick — the reasoning behind "choose boring technology," and a cousin of the survival logic in ${wl("Antifragility")}.</li>
<li><strong>Practices:</strong> exercises like the evening review in ${wl("Stoicism in Practice")} have run continuously for two millennia — some epistemic weight attaches to that, independent of any study.</li>
</ul>
<h2>Where it breaks</h2>
<p>The heuristic deserves its skeptics, and three failure modes are worth pinning down:</p>
<ol>
<li><strong>Environment shifts.</strong> Lindy extrapolates from a survival record compiled under past conditions. When the selection environment changes discontinuously — horses meet automobiles, print meets internet — the record stops being evidence. Age measures fit to the <em>old</em> game.</li>
<li><strong>Survivorship without merit.</strong> Things persist for reasons other than quality: lock-in, monopoly, ritual, switching costs. QWERTY is old. Astrology is <em>very</em> old. Lindy measures survival, and survival only correlates with merit — the gap between the two is exactly the territory of ${wl("Survivorship Bias")}.</li>
<li><strong>Category errors.</strong> The effect applies to the non-perishable idea, not perishable instances of it. "The database" is Lindy; your database server is not.</li>
</ol>
<blockquote><p>Honest summary: Lindy is a prior, not a verdict. Let age set your default expectation, then let evidence about mechanism and environment move you off the default.</p></blockquote>
<p>Still to add before publishing: the mathematical derivation from Pareto survival curves, and a worked example with programming-language lifetimes.</p>
`,
  },
  {
    title: "Bayes' Theorem",
    category: "science",
    tags: ["probability", "mental-models"],
    status: "published",
    isPinned: false,
    createdAt: d("2026-01-18T14:10:00Z"),
    updatedAt: d("2026-04-25T11:55:00Z"),
    excerpt: "One line of algebra, one large worldview: updating beliefs in proportion to evidence, base-rate neglect, and why most positive tests for rare things are false.",
    content: `
<h2>The theorem</h2>
<pre><code class="language-text">P(H | E) = P(E | H) × P(H) / P(E)</code></pre>
<p>In words: your belief in hypothesis H after seeing evidence E should equal how strongly H predicts E, times how plausible H was before, normalized by how surprising E is overall. The algebra is trivial — it follows in two lines from the definition of conditional probability. The worldview is not: it says beliefs are quantities with an update rule, and the update rule is not optional.</p>
<h2>The example everyone should compute once</h2>
<p>A disease affects 1 in 1,000 people. The test is excellent: 99% sensitive, 95% specific. You test positive. How worried should you be?</p>
<p>Run 100,000 people through: about 100 have the disease, ~99 of them test positive. Of the 99,900 healthy, 5% — about 4,995 — <em>also</em> test positive. Your positive is one of 5,094, of which 99 are real:</p>
<pre><code class="language-text">P(disease | positive) = 99 / (99 + 4995) ≈ 1.9%</code></pre>
<p>A 99%-accurate test moved you from 0.1% to about 2%. The intuition that says "99% accurate test, so ~99% likely sick" has quietly discarded the base rate — and in studies, most physicians make exactly this error. <strong>When the condition is rare, most positives are false positives</strong>, and no test accuracy short of extraordinary overcomes an extraordinary prior.</p>
<h2>The reusable furniture</h2>
<ul>
<li><strong>Priors are not bias; they are memory.</strong> Refusing to have a prior just means using an unexamined one (usually uniform, usually wrong). The question is never "prior or no prior" but "defensible prior or smuggled one."</li>
<li><strong>Evidence has a strength, and it is a ratio.</strong> What matters is P(E|H) versus P(E|not-H). Evidence consistent with your theory but equally consistent with rivals has a likelihood ratio near 1 and should move you almost nothing — the razor that deflates most punditry.</li>
<li><strong>Update incrementally, not epiphanically.</strong> Beliefs should drift with each datum, not flip at a threshold. If you can name what evidence would change your mind and by roughly how much, you are doing it; if no evidence could, you have a commitment, not a belief.</li>
</ul>
<h2>Diagnostic debugging</h2>
<p>Debugging is Bayesian inference under a deadline. The base-rate lesson transfers directly: given a bizarre failure, "compiler bug" has a spectacular likelihood ratio but a microscopic prior; "my code is wrong" has the boring prior of, roughly, always. The experienced engineer's instinct — <em>check your own code first, then the library, then the platform</em> — is a correctly ordered prior. The related trap of reasoning from a filtered sample gets its own treatment in ${wl("Survivorship Bias")}, and the honest-priors discipline is half of what makes ${wl("First Principles Thinking")} work rather than merely feel rigorous.</p>
<h2>Limits</h2>
<p>Formal updating requires numbers that are often unavailable, and hypothesis spaces you did not think to enumerate contribute nothing (the theorem cannot rescue you from a missing H). In practice Bayes functions less as arithmetic and more as posture: hold beliefs with confidence proportional to evidence, weigh base rates before drama, and treat "what would change my mind?" as a question with a mandatory answer.</p>
`,
  },
  {
    title: "Survivorship Bias",
    category: "science",
    tags: ["mental-models", "probability"],
    status: "published",
    isPinned: false,
    createdAt: d("2026-03-05T18:25:00Z"),
    updatedAt: d("2026-05-19T08:10:00Z"),
    excerpt: "The bombers that came back, the missing dead startups, and the general failure mode: drawing conclusions from a sample filtered by the outcome you're studying.",
    content: `
<h2>The bombers</h2>
<p>World War II: the military maps bullet holes on returning bombers, finds them clustered on wings and fuselage, and proposes armoring those areas. Statistician Abraham Wald's correction has become the emblem of the entire bias: the map shows where planes can be shot <em>and survive</em>. The planes hit in the engines are missing from the sample — because they are at the bottom of the Channel. <strong>Armor where the returning planes are clean.</strong></p>
<p>The general form: when a selection process filters your sample, and the filter is correlated with the outcome you are studying, the visible cases systematically mislead. The missing data is not randomly missing — it is missing <em>because of</em> the thing you want to measure.</p>
<h2>Where it lives today</h2>
<ul>
<li><strong>Success literature.</strong> Study 10 famous founders, extract their habits, sell the book. The thousand founders with identical habits who failed appear in no dataset. Without the failure sample you cannot distinguish causes of success from common traits of entrants — dropping out of Stanford correlates with billion-dollar companies mostly in the surviving tail.</li>
<li><strong>Fund performance.</strong> Funds that die are dropped from databases; surviving funds' average overstates the category. The same laundering happens with backtests that quietly exclude delisted stocks.</li>
<li><strong>"They don't build them like they used to."</strong> The 100-year-old buildings still standing are the best of their era; the mediocre majority was demolished. Old music, old code, old books — every "golden age" is partly a survivorship artifact. This is precisely the caveat that keeps ${wl("The Lindy Effect")} honest: survival is evidence, but of survival-fitness, not necessarily of merit.</li>
<li><strong>Safety data.</strong> "Nobody ever complained" about the missing guardrail mostly samples people who did not fall.</li>
</ul>
<h2>The diagnostic questions</h2>
<ol>
<li><strong>What process produced this sample?</strong> Not "what does the data say" but "what data could have reached me, and what could not?"</li>
<li><strong>Where are the dead?</strong> Actively hunt the failure cases: dead startups, closed funds, deleted projects, patients lost to follow-up. If the failures are unobservable even in principle, your confidence ceiling drops accordingly.</li>
<li><strong>Is the filter correlated with the outcome?</strong> Random attrition merely shrinks samples; <em>selective</em> attrition poisons them.</li>
</ol>
<blockquote><p>Wald's move generalizes: treat the absence in your data as data. The clean spots on the bomber were the finding.</p></blockquote>
<h2>Relation to inference generally</h2>
<p>Survivorship bias is conditioning done wrong: computing P(trait | observed) while wanting P(success | trait), with observation itself entangled with success. It is in that sense a special case of the base-rate failures cataloged in ${wl("Bayes' Theorem")} — both are refusals to ask what the full sample looked like before the filter. The bias also quietly inflates engineering lore: the "battle-tested" legacy patterns we imitate are the surviving ones, which is worth remembering when auditing old structure with ${wl("Chesterton's Fence")} — some fences still stand simply because nobody happened to trip over them yet.</p>
`,
  },
  {
    title: "Circadian Rhythms",
    category: "science",
    tags: ["health"],
    status: "published",
    isPinned: false,
    createdAt: d("2026-02-25T06:45:00Z"),
    updatedAt: d("2026-07-01T22:30:00Z"),
    excerpt: "The body's ~24-hour clock: how light entrains it, why late-night screens and jet lag hurt, and the outsized leverage of morning light and consistent timing.",
    content: `
<h2>The clock and its conductor</h2>
<p>Nearly every cell in your body runs a molecular clock — interlocking transcription feedback loops with a period of roughly (not exactly) 24 hours. The suprachiasmatic nucleus (SCN), a few thousand neurons in the hypothalamus, conducts them into synchrony, and the SCN itself is set by exactly one dominant signal: <strong>light on the retina</strong>. Specialized photoreceptors (ipRGCs, tuned to blue ~480nm light) report brightness straight to the clock, entirely apart from vision — some functionally blind people still entrain normally.</p>
<p>Because the intrinsic period averages slightly over 24 hours, the clock must be nudged earlier every single day, and morning light is the nudge. Two practical asymmetries follow: light in the morning <em>advances</em> the clock, light late at night <em>delays</em> it — same stimulus, opposite effect, depending on internal time.</p>
<h2>What runs on the schedule</h2>
<ul>
<li><strong>Melatonin</strong> rises ~2 hours before habitual sleep, signaling biological night — it is a darkness signal, not a sedative.</li>
<li><strong>Core temperature</strong> peaks early evening and troughs ~2 hours before waking; sleep onset rides the downslope.</li>
<li><strong>Cortisol</strong> spikes at waking; alertness dips mid-afternoon independent of lunch, then rebounds into a pre-bed "wake maintenance zone" — the reason going to bed unusually early often fails.</li>
<li><strong>Metabolism:</strong> identical meals produce worse glucose responses at biological night; shift work's metabolic toll follows partly from eating against the clock.</li>
</ul>
<h2>When the clock and the world disagree</h2>
<p>Jet lag is the honest version: the clock re-entrains roughly one time zone per day, faster with disciplined light exposure. Shift work is the chronic version, and consistently associates with elevated cardiovascular and metabolic risk. The mundane version — <em>social jet lag</em> — is sleeping 11pm-7am on weekdays and 2am-10am on weekends: a weekly round-trip to a time zone three hours west, paid for every Monday. Chronotype (lark vs. owl) is substantially genetic and shifts with age; teenagers are biologically late, and early school start times fight physiology, not laziness.</p>
<h2>The high-leverage interventions</h2>
<ol>
<li><strong>Morning outdoor light</strong>, 10-20 minutes soon after waking. Outdoor shade is ~10,000 lux; a bright office ~500. Nothing else on this list rivals it.</li>
<li><strong>Consistent wake time</strong>, weekends included — the anchor from which the rest of the rhythm hangs.</li>
<li><strong>Dim, warm light after sunset.</strong> Screen spectra matter less than total brightness and timing; the doomscroll's content-driven arousal is a co-conspirator.</li>
<li><strong>Caffeine cutoff ~8-10h before bed</strong> (half-life ~5-6h), and meals earlier rather than later.</li>
</ol>
<blockquote><p>None of this is exotic. It is scheduling — treating timing as a first-class input to cognition, mood, and metabolism rather than noise.</p></blockquote>
<p>For knowledge work, the timing dividend is real: aligning demanding focus blocks with your alertness peaks (for most people, mid-morning) is a free performance gain, and protecting a consistent sleep window compounds like the habits in ${wl("Compound Interest")} — invisible daily, decisive over years. My own experiments with schedule anchoring are logged in ${wl("Reading Workflow 2026")}.</p>
`,
  },
  {
    title: "Compound Interest",
    category: "reference",
    tags: ["finance", "mental-models"],
    status: "published",
    isPinned: false,
    createdAt: d("2025-12-28T16:20:00Z"),
    updatedAt: d("2026-06-30T12:35:00Z"),
    excerpt: "Growth on growth: the arithmetic, the rule of 72, why time beats rate, and the same exponential arithmetic running through debt, habits, and knowledge.",
    content: `
<h2>The arithmetic</h2>
<p>Simple interest pays on the principal; compound interest pays on the principal <em>plus accumulated interest</em> — growth on growth. The formula:</p>
<pre><code class="language-text">A = P × (1 + r/n)^(n×t)
P: principal   r: annual rate   n: compounds/year   t: years</code></pre>
<p>The consequences are exponential, and human intuition is stubbornly linear. $10,000 at 7% for 10 years is ~$19,700; for 40 years it is ~$150,000. The last decade of those forty adds more than the first three combined — the curve does most of its work at the end, which is precisely where impatience has already made most people quit.</p>
<h2>Rule of 72</h2>
<p>Doubling time ≈ 72 / rate. At 6%, money doubles every ~12 years; at 12%, every ~6. Handy in both directions: 8% inflation halves purchasing power in ~9 years, and a 24% APR credit card doubles the debt in three — compounding is symmetric, and it works for the lender.</p>
<h2>Time beats rate (and behavior beats both)</h2>
<p>Start investing $500/month at 25 and stop at 35, versus start at 35 and continue to 65: at 7%, the ten early years finish ahead of the thirty later ones. Early money simply has more doubling periods. The corollaries are the whole of sensible personal finance:</p>
<ul>
<li><strong>Starting now beats optimizing.</strong> Years in the market are the scarce input; picking the perfect fund is rounding error next to a decade's head start.</li>
<li><strong>Fees compound too.</strong> A 1% annual fee sounds trivial and consumes roughly a quarter of a 40-year outcome versus a 0.1% index fund.</li>
<li><strong>Interruptions are catastrophic.</strong> Selling in a panic doesn't pause the exponential, it truncates it. The rate matters less than staying on the curve.</li>
</ul>
<h2>The general pattern</h2>
<p>Money is the textbook case, but the arithmetic runs anywhere output feeds back into capacity:</p>
<ul>
<li><strong>Knowledge.</strong> Concepts learned become hooks for learning faster — a linked note system is explicitly a compounding device, each note raising the value of every future note (see ${wl("Evergreen Notes")}).</li>
<li><strong>Habits.</strong> One percent better per day is 37x in a year, as the arithmetic goes; the honest version is subtler (habits plateau; markets don't) but the direction holds — small consistent inputs, held over years, dominate heroic bursts. Sleep regularity, covered in ${wl("Circadian Rhythms")}, is a compounding health input of exactly this kind.</li>
<li><strong>Trust and reputation.</strong> Reliability accretes opportunities, which build further reputation. Also symmetric: technical debt and burned trust compound on the same curve, downward.</li>
</ul>
<blockquote><p>"The first rule of compounding: never interrupt it unnecessarily." — Charlie Munger</p></blockquote>
<h2>The discipline it implies</h2>
<p>Taking exponentials seriously reorders priorities: protect the streak over maximizing the sprint, start early over starting perfectly, and audit anything — fees, debt, bad habits — quietly compounding against you. The math is available to anyone; the edge is entirely in the sitting still.</p>
`,
  },
  {
    title: "Home Lab Setup",
    category: "projects",
    tags: ["homelab", "systems", "networking"],
    status: "draft",
    isPinned: false,
    createdAt: d("2026-07-08T20:15:00Z"),
    updatedAt: d("2026-08-24T23:40:00Z"),
    excerpt: "Running notes on the self-hosted rack: hardware, services, backup strategy, and lessons from running my own infrastructure. Work in progress.",
    content: `
<h2>Goals</h2>
<p>Three reasons to run servers at home, in priority order: <strong>learning</strong> (nothing teaches networking like debugging your own — half my notes in ${wl("How DNS Resolution Works")} came from misconfiguring my own resolver), <strong>data ownership</strong> (photos, documents, and notes on hardware I control), and <strong>degoogling</strong> where practical. Explicitly a non-goal: five-nines uptime. This is a lab; things are allowed to break on Saturdays.</p>
<h2>Current hardware</h2>
<table>
<thead><tr><th>Box</th><th>Spec</th><th>Role</th></tr></thead>
<tbody>
<tr><td>Mini PC (N100)</td><td>16GB RAM, 512GB NVMe</td><td>Main Docker host</td></tr>
<tr><td>Raspberry Pi 4</td><td>4GB</td><td>DNS (Pi-hole + Unbound), Wireguard</td></tr>
<tr><td>Used ThinkCentre</td><td>i5, 32GB, 2×8TB mirror</td><td>NAS + backup target</td></tr>
</tbody>
</table>
<p>Total draw is ~35W idle — about $6/month of electricity, which reframes every "just $5/month" cloud service comparison.</p>
<h2>Services running</h2>
<ul>
<li><strong>Pi-hole + Unbound:</strong> network-wide ad blocking, recursive DNS (no upstream resolver sees my queries).</li>
<li><strong>Wireguard:</strong> road-warrior VPN back home; the only inbound port open.</li>
<li><strong>Immich:</strong> photo backup that has genuinely replaced Google Photos for the family.</li>
<li><strong>Paperless-ngx:</strong> every document scanned, OCRed, searchable. Sleeper hit of the whole lab.</li>
<li><strong>This wiki</strong>, plus Uptime Kuma, Grafana, and a Forgejo mirror of my repos.</li>
</ul>
<h2>Backup strategy (3-2-1)</h2>
<pre><code class="language-bash"># nightly: docker volumes → restic → NAS
restic -r /mnt/nas/restic backup /srv/docker/volumes \\
  --exclude-caches --tag nightly
# weekly: NAS → encrypted cloud bucket (offsite copy)
restic -r b2:homelab-backup backup /mnt/tank/critical --tag weekly</code></pre>
<p>Three copies, two media, one offsite. Restores tested monthly since the Great Immich Scare of June — an untested backup is a hope, not a backup (a lesson filed squarely under ${wl("Chesterton's Fence", "fences I now understand")}).</p>
<h2>Lessons so far</h2>
<ol>
<li><strong>Boring beats clever.</strong> Every exotic choice (custom kernels, beta releases) has cost a weekend; Debian stable + Docker Compose has cost zero.</li>
<li><strong>DNS is always the culprit.</strong> Three separate "outages" were me breaking my own resolver.</li>
<li><strong>Document as you go.</strong> Future-me cannot remember why port 8443 is forwarded; this wiki is the lab's memory.</li>
</ol>
<h2>TODO</h2>
<ul>
<li>VLAN segmentation — IoT devices off the main network</li>
<li>Automated Compose updates with Renovate, staging first</li>
<li>Write up the reverse-proxy + wildcard cert setup (relates to ${wl("How HTTPS Works")})</li>
<li>Decide: k3s for learning, or is that a clever choice violating lesson 1?</li>
</ul>
`,
  },
  {
    title: "Reading Workflow 2026",
    category: "journal",
    tags: ["productivity", "note-taking", "writing"],
    status: "draft",
    isPinned: false,
    createdAt: d("2026-08-02T10:00:00Z"),
    updatedAt: d("2026-08-29T21:15:00Z"),
    excerpt: "This year's experiment in reading deliberately: selection filters, capture pipeline, and honest numbers on what actually sticks. Draft — reviewing at year end.",
    content: `
<h2>The problem with last year</h2>
<p>2025's retrospective was uncomfortable: 34 books finished, and for maybe six of them I could state the central argument a month later. Reading had become consumption with a progress bar — input optimized, retention ignored. The 2026 experiment: read fewer things, harder, with a pipeline that forces engagement. Volume is explicitly not a goal this year.</p>
<h2>Selection: the front of the funnel</h2>
<ul>
<li><strong>Lindy default:</strong> at least half of the list must be over 20 years old — the filter argument from ${wl("The Lindy Effect")} applied literally.</li>
<li><strong>The 100-page rule:</strong> quit anything by page 100 without guilt. Sunk-cost reading crowds out better books; quitting is the selection mechanism working.</li>
<li><strong>One queue, capped at ten.</strong> When the to-read list exceeds ten, adding requires removing. Infinite queues are where intentions go to die.</li>
</ul>
<h2>Capture pipeline</h2>
<ol>
<li><strong>While reading:</strong> marginalia and one index card per chapter — a single sentence stating the chapter's claim. No highlighting; highlighting is how my hand pretends to read.</li>
<li><strong>Within 48 hours:</strong> write the book's argument from memory, one page, before consulting notes — ${wl("The Feynman Technique")} as a retention test. The gap between what I wrote and what the book said is the real reading list.</li>
<li><strong>Within a week:</strong> promote what survived into ${wl("Evergreen Notes", "evergreen notes")}, linked into the wiki, and card the few facts worth drilling into ${wl("Spaced Repetition", "the review queue")}.</li>
</ol>
<blockquote><p>Working rule: a book is not finished when the last page turns; it is finished when the note is written. Unwritten-up books go back on the queue.</p></blockquote>
<h2>Numbers so far (January-August)</h2>
<table>
<thead><tr><th>Metric</th><th>2025 pace</th><th>2026 actual</th></tr></thead>
<tbody>
<tr><td>Books finished</td><td>~23</td><td>11</td></tr>
<tr><td>Books quit at 100 pages</td><td>~2</td><td>7</td></tr>
<tr><td>Evergreen notes produced</td><td>—</td><td>31</td></tr>
<tr><td>Arguments recallable at 1 month</td><td>embarrassing</td><td>9 of 11</td></tr>
</tbody>
</table>
<p>The recall number is the one that matters, and it is night-and-day. The surprise cost: the pipeline takes 3-4 hours per book beyond reading time. The surprise benefit: knowing the write-up is coming changes how I read — I argue with chapters now instead of nodding along.</p>
<h2>Open questions for the year-end review</h2>
<ul>
<li>Fiction sits awkwardly in the pipeline — the argument-summary step feels wrong there. Exempt it, or find a different capture form?</li>
<li>Morning reading blocks (post-light-walk, per ${wl("Circadian Rhythms")}) are measurably better than evening ones — formalize the schedule?</li>
<li>Is 3-4 hours of processing per book the right trade against reading two more books? Current answer: yes, decisively. Re-ask in December.</li>
</ul>
`,
  },
];

// ── Semantic relations (ArticleLink) ───────────────────────────────────────
// relation values come from RELATION_TYPES in src/lib/relations.ts
const semanticLinks = [
  { source: "Zettelkasten Method", target: "Evergreen Notes", relation: "related-to" },
  { source: "Evergreen Notes", target: "Zettelkasten Method", relation: "derived-from" },
  { source: "Spaced Repetition", target: "Zettelkasten Method", relation: "related-to" },
  { source: "The Feynman Technique", target: "Deliberate Practice", relation: "see-also" },
  { source: "How DNS Resolution Works", target: "How HTTPS Works", relation: "followed-by" },
  { source: "How HTTPS Works", target: "How DNS Resolution Works", relation: "preceded-by" },
  { source: "How Git Stores Data", target: "The Unix Philosophy", relation: "derived-from" },
  { source: "Big O Notation", target: "Caching Strategies", relation: "see-also" },
  { source: "Antifragility", target: "The Lindy Effect", relation: "related-to" },
  { source: "Stoicism in Practice", target: "Antifragility", relation: "see-also" },
  { source: "First Principles Thinking", target: "Chesterton's Fence", relation: "see-also" },
  { source: "Survivorship Bias", target: "Bayes' Theorem", relation: "related-to" },
];

// ── Discussions ────────────────────────────────────────────────────────────
const discussions = [
  {
    article: "Zettelkasten Method",
    author: "Lina",
    content: "The 'lazy-evaluated categorization' framing finally made links vs. folders click for me. Do you still keep any folder structure at all, or is it links and search all the way down?",
    createdAt: d("2026-06-05T09:30:00Z"),
  },
  {
    article: "Zettelkasten Method",
    author: "Omar",
    content: "Worth adding a note on how long it takes before the compounding kicks in — my box felt useless for the first ~200 notes and I nearly quit. The payoff curve is real but the trough is too.",
    createdAt: d("2026-06-12T19:45:00Z"),
  },
  {
    article: "Rust Ownership Model",
    author: "Priya",
    content: "The vec.push() example is the best borrow-checker illustration I have seen — it rejects an actual dangling pointer, not a style preference. Stealing this for our onboarding docs.",
    createdAt: d("2026-06-25T14:20:00Z"),
  },
  {
    article: "Antifragility",
    author: "Marcus T.",
    content: "Good honest treatment. One pushback: the barbell section could mention that 'capped downside' is doing all the work — most people misjudge what their actual worst case is, especially with leverage involved.",
    createdAt: d("2026-08-01T11:05:00Z"),
  },
  {
    article: "How DNS Resolution Works",
    author: "Sam",
    content: "Minor nit: might be worth mentioning negative caching (NXDOMAIN TTLs from the SOA record) — it bites people constantly when they add a record right after querying for it.",
    createdAt: d("2026-05-30T16:10:00Z"),
  },
];

// ── Seeding ────────────────────────────────────────────────────────────────
async function main() {
  // Categories: roots first, then children.
  const categoryIdBySlug = new Map();
  for (const cat of rootCategories) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
      create: cat,
    });
    categoryIdBySlug.set(cat.slug, row.id);
  }
  for (const cat of childCategories) {
    const { parentSlug, ...data } = cat;
    const parentId = categoryIdBySlug.get(parentSlug) ?? null;
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder, parentId },
      create: { ...data, parentId },
    });
    categoryIdBySlug.set(cat.slug, row.id);
  }
  console.log(`Seeded ${rootCategories.length + childCategories.length} categories`);

  // Tags: roots first, then children.
  const tagIdBySlug = new Map();
  for (const tag of rootTags) {
    const row = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name, color: tag.color ?? null },
      create: tag,
    });
    tagIdBySlug.set(tag.slug, row.id);
  }
  for (const tag of childTags) {
    const { parentSlug, ...data } = tag;
    const parentId = tagIdBySlug.get(parentSlug) ?? null;
    const row = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name, parentId },
      create: { ...data, parentId },
    });
    tagIdBySlug.set(tag.slug, row.id);
  }
  console.log(`Seeded ${rootTags.length + childTags.length} tags`);

  // Articles.
  const articleIdBySlug = new Map();
  for (const a of articles) {
    const slug = slugify(a.title);
    const content = a.content.trim();
    const data = {
      title: a.title,
      excerpt: a.excerpt,
      content,
      status: a.status,
      isPinned: a.isPinned,
      published: a.status === "published",
      categoryId: categoryIdBySlug.get(a.category) ?? null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
    const row = await prisma.article.upsert({
      where: { slug },
      update: data,
      create: { slug, ...data },
    });
    articleIdBySlug.set(slug, row.id);

    // Attach tags via the ArticleTag join.
    for (const tagSlug of a.tags) {
      const tagId = tagIdBySlug.get(tagSlug);
      if (!tagId) {
        console.warn(`  ! unknown tag "${tagSlug}" on "${a.title}"`);
        continue;
      }
      await prisma.articleTag.upsert({
        where: { articleId_tagId: { articleId: row.id, tagId } },
        update: {},
        create: { articleId: row.id, tagId },
      });
    }
  }
  console.log(`Seeded ${articles.length} articles`);

  // Semantic relations (ArticleLink), upserted on the compound unique key.
  let linkCount = 0;
  for (const link of semanticLinks) {
    const sourceId = articleIdBySlug.get(slugify(link.source));
    const targetSlug = slugify(link.target);
    if (!sourceId) {
      console.warn(`  ! unknown source article "${link.source}"`);
      continue;
    }
    await prisma.articleLink.upsert({
      where: {
        sourceId_targetSlug_relation: { sourceId, targetSlug, relation: link.relation },
      },
      update: {},
      create: { sourceId, targetSlug, relation: link.relation },
    });
    linkCount++;
  }
  console.log(`Seeded ${linkCount} semantic relations`);

  // Discussions: no unique key in the schema, so guard with findFirst.
  let discussionCount = 0;
  for (const disc of discussions) {
    const articleId = articleIdBySlug.get(slugify(disc.article));
    if (!articleId) {
      console.warn(`  ! unknown discussion article "${disc.article}"`);
      continue;
    }
    const existing = await prisma.discussion.findFirst({
      where: { articleId, author: disc.author, content: disc.content },
      select: { id: true },
    });
    if (!existing) {
      await prisma.discussion.create({
        data: { articleId, author: disc.author, content: disc.content, createdAt: disc.createdAt },
      });
      discussionCount++;
    }
  }
  console.log(`Seeded ${discussionCount} new discussion comments (${discussions.length - discussionCount} already present)`);

  console.log("Demo seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
