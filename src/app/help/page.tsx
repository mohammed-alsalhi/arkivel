import Link from "next/link";
import type { Metadata } from "next";
import { DataTable, LinkButton, Page, PageHeader, SectionPanel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Help",
};

export default function HelpPage() {
  return (
    <Page>
      <PageHeader
        kicker="Reference"
        title="Help &amp; Features Guide"
        description={
          <>
            This guide covers all features available in the wiki. Use the sections below to learn how to create, edit, organize, and get the most from your articles.
            For a feature overview see <Link href="/features">Features</Link>.
          </>
        }
        actions={
          <>
            <LinkButton href="/features">Features</LinkButton>
            <LinkButton href="/articles/new" variant="primary">Create article</LinkButton>
          </>
        }
      />

      {/* Getting Started */}
      <SectionPanel className="mb-4" title="Getting Started" bodyClassName="text-[13px]">
          <p className="mb-2">
            To create a new article, click <Link href="/articles/new">Create new article</Link> in the sidebar or navigate to <Link href="/articles/new">/articles/new</Link>.
          </p>
          <p className="mb-2">Each article has:</p>
          <ul className="list-disc pl-5 mb-2 space-y-0.5">
            <li><strong>Title</strong> &mdash; the article name, used to generate the URL slug</li>
            <li><strong>Content</strong> &mdash; rich text body written in the Tiptap editor</li>
            <li><strong>Category</strong> &mdash; optional, for organizing articles into groups</li>
            <li><strong>Tags</strong> &mdash; optional labels for cross-cutting topics</li>
            <li><strong>Excerpt</strong> &mdash; short summary shown in search results and article lists</li>
            <li><strong>Status</strong> &mdash; Draft (admin-only), Review, or Published (visible to all)</li>
          </ul>
      </SectionPanel>

      {/* The Editor */}
      <SectionPanel className="mb-4" title="The Editor" bodyClassName="text-[13px]">
          <p className="mb-2">The rich text editor opens as a calm writing surface with advanced tools tucked into feature trays:</p>
          <ul className="list-disc pl-5 mb-2 space-y-0.5">
            <li><strong>Block</strong> &mdash; paragraph, heading, quote, and code block styles</li>
            <li><strong>Primary toolbar</strong> &mdash; undo/redo, bold, italic, URL links, wiki links, lists, and image upload</li>
            <li><strong>More</strong> &mdash; quote, table, strikethrough, inline code, superscript, subscript, footnotes, math, TOC, find/replace, typewriter mode, AI, claims, highlight, voice, and shortcuts</li>
            <li><strong>Insert tray</strong> &mdash; scaffolds, callouts, tables, data tables, diagrams, math, decision trees, timelines, collapsibles, and live query blocks</li>
            <li><strong>Review tray</strong> &mdash; readiness score, document signals, quality checks, grammar/style checker, and writing coach</li>
            <li><strong>Outline tray</strong> &mdash; section navigation, with the outline builder tucked into a disclosure</li>
            <li><strong>Table lab</strong> &mdash; row, column, merge, split, header, and delete controls while editing a table</li>
          </ul>
          <p className="mb-2">
            <strong>Slash commands:</strong> Type <code className="bg-surface-hover px-1 text-[12px]">/</code> anywhere in the editor to open the command palette. Commands include reusable callout, metadata table, timeline, infobox, decision log, research note, worldbuilding entry templates, Mermaid diagram, Math block, Excalidraw drawing, Data table, Decision tree, heading/list types, accordion/FAQ block, two-column layout, YouTube/Vimeo video embed, Twitter/X post embed, GitHub Gist embed, and your saved snippets via <code className="bg-surface-hover px-1 text-[12px]">/snippet</code>.
          </p>
          <p className="mb-2">
            <strong>Feature trays:</strong> Click <strong>Insert</strong>, <strong>Review</strong>, or <strong>Outline</strong> when you need advanced tools. The editor keeps those panels closed by default so the writing canvas stays clear.
          </p>
          <p className="mb-2">
            <strong>Selection actions:</strong> Selecting text opens inline actions for AI rewrite, AI expand, wiki links, URL links, and footnotes.
          </p>
          <p className="mb-2">
            <strong>Markdown mode:</strong> Click the <code className="bg-surface-hover px-1 text-[12px]">Markdown</code> button to switch to raw markdown editing. Click <code className="bg-surface-hover px-1 text-[12px]">Write</code> to switch back.
          </p>
          <p className="mb-2">
            <strong>Templates:</strong> When creating a new article, choose from predefined templates (Person, Place, Event, Thing, Group) that provide a starting structure with an infobox and sections.
          </p>
          <p className="mb-2">
            <strong>Outline builder:</strong> Open the <strong>Outline</strong> tray to generate a structured list of section headings from the article title. Choose Encyclopedic, Tutorial, or Reference style. Click <strong>Insert into article</strong> to add the headings as editable H2/H3 nodes.
          </p>
          <p className="mb-2">
            <strong>AI alt-text:</strong> When you upload an image, the caption prompt is pre-filled with a suggested description based on the filename (AI-enhanced when <code className="bg-surface-hover px-1 text-[12px]">AI_API_KEY</code> is configured).
          </p>
          <p>
            <strong>Grammar &amp; style checker:</strong> Open the <strong>Review</strong> tray and expand &ldquo;Grammar &amp; style&rdquo; to check your text for issues. Click <strong>Check now</strong> to analyse; each issue shows a severity (error / warning / style) with an <strong>Apply</strong> button to fix it inline.
          </p>
      </SectionPanel>

      {/* Rich Content Blocks */}
      <SectionPanel className="mb-4" title="Rich Content Blocks" bodyClassName="text-[13px]">
          <p className="mb-2">Beyond standard text, the editor supports specialized content blocks inserted via slash commands:</p>
          <ul className="list-disc pl-5 mb-2 space-y-1">
            <li><strong>Mermaid diagrams</strong> &mdash; write <code className="bg-surface-hover px-1 text-[12px]">graph TD; A--&gt;B</code> syntax; renders as a flowchart, sequence diagram, Gantt chart, etc. on the article page</li>
            <li><strong>Math (KaTeX)</strong> &mdash; inline math with <code className="bg-surface-hover px-1 text-[12px]">$...$</code> and block math with <code className="bg-surface-hover px-1 text-[12px]">$$...$$</code></li>
            <li><strong>Excalidraw</strong> &mdash; embed an interactive whiteboard drawing; stored as JSON and rendered read-only on the article page</li>
            <li><strong>Data table</strong> &mdash; paste CSV or JSON data to create a sortable, filterable table with a CSV download button</li>
            <li><strong>Article table</strong> &mdash; insert a standard table when cells should read as one merged grid with collapsed borders</li>
            <li><strong>Decision tree</strong> &mdash; define a yes/no tree as JSON; renders as an interactive SVG with expand/collapse</li>
          </ul>
          <p><strong>Voice dictation:</strong> Click the microphone button in the toolbar to speak &mdash; your words are inserted at the cursor using the browser&apos;s speech recognition.</p>
      </SectionPanel>

      {/* Presentation Mode */}
      <SectionPanel className="mb-4" title="Presentation Mode" bodyClassName="text-[13px]">
          <p>
            Click <strong>Present</strong> in the article action bar to open the article as a slideshow. Each H2 / H3 heading becomes a new slide. Use arrow keys or click to advance. Press <kbd>Esc</kbd> to exit. Long slides scroll inside the slide stage so the title, progress, overview, and navigation controls stay reachable.
          </p>
      </SectionPanel>

      {/* Article Action Panel */}
      <SectionPanel className="mb-4" title="Article Action Panel" bodyClassName="text-[13px]">
          <p className="mb-2">The compact rail below the article header keeps Navigate, Collect, and Share actions visible. Read and Tools open as disclosure menus so dense reading controls stay available without taking over the page.</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li><strong>Present</strong> &mdash; open as a slideshow</li>
            <li><strong>Bookmark</strong> &mdash; save to your personal bookmarks with an optional note</li>
            <li><strong>+ List</strong> &mdash; add to one of your reading lists</li>
            <li><strong>Copy link</strong> &mdash; copy the article URL to the clipboard</li>
            <li><strong>Share</strong> &mdash; native share sheet (or clipboard fallback)</li>
            <li><strong>Print</strong> &mdash; clean print layout (hides navigation UI)</li>
            <li><strong>Export ▾</strong> &mdash; download as PDF, Markdown, ePub, or Word (.docx)</li>
            <li><strong>Aa</strong> &mdash; toggle dyslexia-friendly font and spacing</li>
            <li><strong>RTL</strong> &mdash; toggle right-to-left reading direction for the article</li>
            <li><strong>Translate ▾</strong> &mdash; machine-translate to another language (requires API key)</li>
            <li><strong>S/M/L/XL</strong> &mdash; font size selector; persisted between sessions</li>
            <li><strong>Focus</strong> &mdash; dims non-hovered paragraphs for distraction-free reading; persisted</li>
            <li><strong>Night mode</strong> &mdash; warm sepia-toned dark theme for late-night reading; moon/sun button; persisted</li>
            <li><strong>High contrast (A)</strong> &mdash; pure black/white/yellow theme for maximum readability; persisted</li>
            <li><strong>Text only (T)</strong> &mdash; hides images and media from the article for distraction-free reading; persisted</li>
            <li><strong>Speed read</strong> &mdash; RSVP speed-reading modal; choose 150/250/400/600 WPM; ORP pivot character highlighted; Start/Pause/Reset controls</li>
            <li><strong>Font preference</strong> &mdash; dropdown to switch article body font between Serif, Sans, or Mono; Serif is the default; persisted</li>
            <li><strong>Accent color</strong> &mdash; color-swatch button opens an HSL hue slider to customize the wiki accent color; persisted</li>
            <li><strong>Quick note</strong> &mdash; collapsible private note panel per article; stored only in this browser; save and delete controls</li>
            <li><strong>Copy plain text</strong> &mdash; button in article toolbar copies the article body as plain text (HTML stripped)</li>
          </ul>
      </SectionPanel>

      {/* Wiki Links */}
      <SectionPanel className="mb-4" title="Wiki Links" bodyClassName="text-[13px]">
          <p className="mb-1 font-bold text-heading">Typing syntax</p>
          <ul className="list-disc pl-5 mb-3 space-y-0.5">
            <li>Type <code className="bg-surface-hover px-1 text-[12px]">[[Article Name]]</code> &mdash; auto-converts to a wiki link</li>
            <li>Type <code className="bg-surface-hover px-1 text-[12px]">[[Article Name|Display Text]]</code> &mdash; link with custom display text</li>
          </ul>
          <p className="mb-1 font-bold text-heading">Link suggester</p>
          <p className="mb-3">
            Type <code className="bg-surface-hover px-1 text-[12px]">[[</code> to open the autocomplete dropdown. Use arrow keys to navigate, Enter to select, Escape to dismiss.
          </p>
          <p className="mb-1 font-bold text-heading">Link status</p>
          <p className="mb-2">
            Links to existing articles appear in <span className="text-wiki-link">blue</span>. Links to missing articles appear in <span className="text-wiki-link-broken">red</span> &mdash; a cue to create that article.
          </p>
          <p className="mb-1 font-bold text-heading">Keyboard shortcut</p>
          <p>Press <code className="bg-surface-hover px-1 text-[12px]">Ctrl+Shift+L</code> (Cmd on Mac) to insert a wiki link.</p>
      </SectionPanel>

      {/* Search */}
      <SectionPanel className="mb-4" title="Search" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-0.5">
            <li>The search bar provides instant results as you type; press <strong>Enter</strong> for the <Link href="/search">full search page</Link></li>
            <li>Instant search, the full search page, command palette, wiki-link autocomplete, split view article pickers, and edit fallback all use the same search result contract</li>
            <li>Multi-word queries use <strong>AND</strong> logic — every word must appear somewhere in the article</li>
              <li>Results use relevance v2 ranking across exact title, phrase, alias/redirect, word coverage, freshness, review, and verification signals</li>
              <li>Admins can request <code className="bg-surface-hover px-1 text-[12px]">/api/search?q=...&amp;explain=1</code> for per-result score explanations</li>
            <li><strong>Semantic search:</strong> set <code className="bg-surface-hover px-1 text-[12px]">OPENAI_API_KEY</code> to blend AI-ranked results based on meaning, not just keywords</li>
            <li><strong>Federated search:</strong> when peer wikis are configured, results from other wikis appear in a separate section on the search page automatically</li>
            <li><strong>Search history:</strong> your last 20 successful searches are stored in browser memory and shown as clickable chips when the search page has no active query; use the Clear button to wipe the list</li>
          </ul>
      </SectionPanel>

      {/* AI Features */}
      <SectionPanel className="mb-4" title="AI Features" bodyClassName="text-[13px]">
          <p className="mb-2">AI features are gated on environment variables and degrade gracefully when keys are absent.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Writing Coach</strong> &mdash; disclosure inside the Review tray. Shows Flesch-Kincaid readability score, passive-voice count, sentence length stats, and AI suggestions.</li>
            <li><strong>Article summaries</strong> &mdash; auto-generated on save; used as the page meta description.</li>
            <li><strong>Semantic search</strong> &mdash; vector embeddings via OpenAI. Requires <code className="bg-surface-hover px-1 text-[12px]">OPENAI_API_KEY</code>.</li>
            <li><strong>Knowledge gaps</strong> &mdash; <Link href="/admin/knowledge-gaps">/admin/knowledge-gaps</Link> lists referenced but uncreated article titles, sorted by incoming-link count.</li>
            <li><strong>Duplicate detection</strong> &mdash; checks for semantically similar existing articles when creating a new one.</li>
            <li><strong>Category suggestions</strong> &mdash; Claude suggests topics missing from a category.</li>
            <li><strong>Quiz generation</strong> &mdash; Claude generates 5 multiple-choice questions from any article for self-testing.</li>
            <li><strong>AI auto-fill</strong> &mdash; on the new article page, type a title and choose a template type (Person, Event, Place, Concept, Organization, Product); click <em>Auto-fill</em> to generate a full structured draft.</li>
            <li><strong>Category overview generator</strong> &mdash; button on category pages; AI reads all published articles and writes a 2–4 paragraph encyclopedic introduction.</li>
            <li><strong>AI fact-check</strong> &mdash; button at the bottom of any article; Claude analyzes 3–6 factual claims and rates each as Verified / Plausible / Uncertain / Questionable with a confidence bar.</li>
            <li><strong>Smart editor suggestions</strong> &mdash; click <em>Suggestions</em> in the editor toolbar while writing; shows unlinked article mentions, related pages, and AI-generated ideas for missing sections.</li>
          </ul>
      </SectionPanel>

      {/* Learning & Retention */}
      <SectionPanel className="mb-4" title="Learning & Retention" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Learning Paths</strong> &mdash; curated sequences of articles. Browse at <Link href="/learning-paths">/learning-paths</Link> or create your own. Progress is tracked per path.</li>
            <li><strong>Flashcards</strong> &mdash; create flashcards from any article. Review due cards at <Link href="/flashcards">/flashcards</Link> using the SM-2 spaced repetition algorithm (grade 0–5 after each card).</li>
            <li><strong>Quizzes</strong> &mdash; AI-generated multiple choice questions per article. Results saved to your quiz history.</li>
            <li><strong>AI Tutor Mode</strong> &mdash; <em>Tutor me</em> button on any article opens a Socratic AI chat that asks probing questions, tests comprehension, and gives feedback.</li>
            <li><strong>Spaced repetition review queue</strong> &mdash; click <em>Review</em> on any article to enroll it; due cards appear at <Link href="/review">/review</Link> using SM-2 scheduling.</li>
            <li><strong>Daily digest</strong> &mdash; personalised in-app briefing at <Link href="/digest">/digest</Link>; sections: Article of the Day, due reviews, watched updates, Did You Know, On This Day.</li>
            <li><strong>Audio narration</strong> &mdash; <em>Listen</em> button on every article narrates the full text using browser TTS with pause/stop and a progress bar.</li>
            <li><strong>Reading progress</strong> &mdash; mark articles as read. Track completion by category via the progress ring on category pages.</li>
            <li><strong>Email digest</strong> &mdash; opt in under Settings → Digest to receive a scheduled summary email of watchlist changes.</li>
          </ul>
      </SectionPanel>

      {/* Discovery & Navigation */}
      <SectionPanel className="mb-4" title="Discovery & Navigation" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Main Page</strong> &mdash; <Link href="/">/</Link> is the working wiki front page with live article/category/tag/revision stats, featured content, a browse directory, recently updated articles, and compact sidebar modules.</li>
            <li><strong>Page headers</strong> &mdash; core browse and reference pages use a shared header with a short kicker, serif title, explanatory dek, and wrapping action buttons.</li>
            <li><strong>Main menu</strong> &mdash; the three-line button in the top-left opens the simplified sidebar on phones, while desktop and tablet layouts keep the sidebar docked.</li>
            <li><strong>Brand mark and compact search</strong> &mdash; the preliminary Arkivel mark appears in the sidebar/mobile header, and the header search expands only when opened.</li>
            <li><strong>Arkivel Studio</strong> &mdash; <Link href="/studio">/studio</Link> combines a generated article board, base-style queues, graph links, review pressure, and JSON Canvas export in one workspace.</li>
            <li><strong>Bookmarks</strong> &mdash; save articles with optional notes at <Link href="/bookmarks">/bookmarks</Link>.</li>
            <li><strong>Reading Lists</strong> &mdash; organize articles into ordered lists at <Link href="/reading-lists">/reading-lists</Link>. Lists can be made public and shared via a link.</li>
            <li><strong>Smart Collections</strong> &mdash; saved searches with filters (tags, category, author, date range) at <Link href="/collections">/collections</Link>.</li>
            <li><strong>TIL (Today I Learned)</strong> &mdash; post short (280-char) notes at <Link href="/til">/til</Link>. Tag them for discovery.</li>
            <li><strong>Explore mode</strong> &mdash; guided walk through articles using semantic similarity at <Link href="/explore">/explore</Link>.</li>
            <li><strong>Canon Trails</strong> &mdash; <Link href="/trails">/trails</Link> builds guided reading routes from live wiki links, backlinks, categories, freshness, article depth, and engagement so readers get a path through the canon instead of another dashboard.</li>
            <li><strong>Session reading trail</strong> &mdash; collapsible breadcrumb at the bottom of each article showing your navigation history for the current session.</li>
            <li><strong>Reading history</strong> &mdash; browser-local list of the last 50 articles you visited, with relative timestamps, at <Link href="/history">/history</Link>. No server data stored.</li>
            <li><strong>Last-visit badge</strong> &mdash; on return visits, articles show &ldquo;You read this X ago&rdquo; in the article header.</li>
            <li><strong>Sticky article header</strong> &mdash; a slim floating bar with the article title, Edit and Top links appears after scrolling past the article&apos;s heading.</li>
            <li><strong>Article Q&amp;A</strong> &mdash; &ldquo;Ask a question&rdquo; panel at the bottom of every article; answers are grounded in wiki content and cite source articles.</li>
            <li><strong>Suggest edit</strong> &mdash; a &ldquo;Suggest edit&rdquo; link at the bottom of every article opens an inline form where anyone can propose a correction; admins review suggestions at <Link href="/admin/suggestions">/admin/suggestions</Link>.</li>
            <li><strong>Popularity leaderboard</strong> &mdash; <Link href="/popular">/popular</Link> ranks published articles by read and reaction activity.</li>
            <li><strong>Article comparison</strong> &mdash; open two articles side by side at <code className="bg-surface-hover px-1 text-[12px]">/compare?a=slug1&amp;b=slug2</code>.</li>
            <li><strong>Contributor leaderboard</strong> &mdash; <Link href="/leaderboard">/leaderboard</Link> shows top editors ranked by revision count.</li>
            <li><strong>Discussion index</strong> &mdash; <Link href="/discussions">/discussions</Link> lists all open discussion threads across every article, filterable by article slug and author.</li>
            <li><strong>Activity heat map</strong> &mdash; <Link href="/activity">/activity</Link> shows a GitHub-style contribution calendar of daily edit counts over the past 52 weeks.</li>
            <li><strong>Wiki stats</strong> &mdash; <Link href="/stats">/stats</Link> displays total articles, word count, categories, tags, contributors, revisions, weekly active users, and a top-contributors leaderboard.</li>
            <li><strong>Mentions feed</strong> &mdash; <Link href="/mentions">/mentions</Link> lists every discussion thread that mentions your <code className="bg-surface-hover px-1 text-[12px]">@username</code> (requires login).</li>
          </ul>
      </SectionPanel>

      {/* Article Page */}
      <SectionPanel className="mb-4" title="Article Page Features" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Article header</strong> &mdash; title, category, excerpt, freshness, verification, reading metrics, return-visit badge, and co-authors are grouped at the top of the page.</li>
            <li><strong>Action panel</strong> &mdash; article controls are grouped as Navigate, Collect, Share, Read, and Tools.</li>
            <li><strong>Taxonomy footer</strong> &mdash; category and tag links appear as wrapping chips near the bottom of the article.</li>
            <li><strong>Responsive layout</strong> &mdash; article tabs, infoboxes, collapsed article tables, table of contents, backlinks, and action groups are constrained for narrow screens.</li>
            <li><strong>Reading time</strong> &mdash; every article shows &ldquo;~X min read&rdquo; in the byline, estimated at 200 words per minute.</li>
            <li><strong>Reading ETA</strong> &mdash; the byline also shows &ldquo;~X min left&rdquo; which updates live as you scroll through the article; disappears once you finish.</li>
            <li><strong>Reading mode</strong> &mdash; click &ldquo;Reading mode&rdquo; in the article toolbar (or press <kbd>R</kbd>) to enter a distraction-free view that hides the header and sidebar. Press again or <kbd>R</kbd> to exit.</li>
            <li><strong>Draft share links</strong> &mdash; admins can generate a secret URL (<code className="bg-surface-hover px-1 text-[12px]">POST /api/articles/[id]/share-token</code>) so anyone with the link can preview a draft at <code className="bg-surface-hover px-1 text-[12px]">/share/[token]</code> without needing to log in.</li>
            <li><strong>Expiry warning banner</strong> &mdash; a yellow notice appears when an article&apos;s <em>Review due</em> date is within 30 days, prompting editors to verify its accuracy.</li>
            <li><strong>Mark as verified</strong> &mdash; admins see a &ldquo;Mark as verified&rdquo; button at the bottom of each article. Clicking it stamps the current date as <em>lastVerifiedAt</em>, shown as a &ldquo;✓ Verified&rdquo; badge in the byline.</li>
            <li><strong>&ldquo;You might also like&rdquo;</strong> &mdash; up to 5 related articles sharing the same tags are suggested at the bottom of each article.</li>
            <li><strong>Floating table of contents</strong> &mdash; on wide screens (&ge;1280 px) a fixed sidebar TOC highlights the section currently in view.</li>
            <li><strong>Article stats panel</strong> &mdash; collapsible panel at the bottom of every article showing read count, reaction count, word count, quality score, article age, and a 30-day view sparkline.</li>
            <li><strong>Article flags</strong> &mdash; admins assign short labels (e.g. &ldquo;Needs images&rdquo;, &ldquo;Outdated&rdquo;) that appear as orange badges near the article title.</li>
            <li><strong>Article co-authors</strong> &mdash; admins link additional contributors to an article; their names appear in the byline after the primary author.</li>
            <li><strong>Named snapshots</strong> &mdash; admins can save a labeled snapshot of the current article state (e.g. &ldquo;v1.0 – before major rewrite&rdquo;) via <code className="bg-surface-hover px-1 text-[12px]">POST /api/articles/[id]/snapshots</code>.</li>
            <li><strong>Cover image focal point</strong> &mdash; in the article edit form, click or drag on the cover image preview to set a focal point (X%/Y%). The focal point is stored as <em>coverFocalX</em>/<em>coverFocalY</em> and applied as <code className="bg-surface-hover px-1 text-[12px]">object-position</code> when the image is displayed.</li>
          </ul>
      </SectionPanel>

      {/* Collaboration */}
      <SectionPanel className="mb-4" title="Collaboration" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Article reactions</strong> &mdash; mark articles as Helpful, Insightful, Outdated, or Confusing via the reaction bar at the bottom.</li>
            <li><strong>Star rating</strong> &mdash; rate any article 1–5 stars using the rating widget below the reaction bar; your rating is saved per session, and the average and count are shown live.</li>
            <li><strong>Article checklist</strong> &mdash; per-article todo list below the article; readers can check off tasks; admins add and delete tasks via the inline form.</li>
            <li><strong>Article polls</strong> &mdash; admins add polls to any article; readers vote once per session; vote counts and percentage bars are revealed after voting or when the poll is closed; admins can close, reopen, or delete polls from the poll widget.</li>
            <li><strong>Blame view</strong> &mdash; visit the <em>Blame</em> tab on any article to see each paragraph colour-coded by the revision that first introduced it; sidebar shows editor name, date, and edit summary with a link to the full revision.</li>
            <li><strong>Content warning tags</strong> &mdash; admins add CW labels to articles in the edit form; readers see a dismissible amber banner (Spoilers, Violence, Mature content, etc.) before the article body.</li>
            <li><strong>Article forks</strong> &mdash; propose a complete rewrite of any article. Admins review, merge, or reject forks at <Link href="/forks">/forks</Link>.</li>
            <li><strong>Review requests</strong> &mdash; editors can request review from an article action, assign or self-assign a reviewer, discuss the draft at <Link href="/reviews">/reviews</Link>, approve to publish, request changes, reject, or resubmit after fixes.</li>
            <li><strong>Claim Review Mode</strong> &mdash; claims marked in the editor appear in the article claims panel. Editors can approve, request a source, dispute, reject, or leave notes for each claim.</li>
            <li><strong>Knowledge bounties</strong> &mdash; request articles on specific topics at <Link href="/bounties">/bounties</Link>. Contributors can claim and fulfil them.</li>
            <li><strong>Expert badges</strong> &mdash; admins grant expert badges per category. Expert contributors are highlighted in revision history and bylines.</li>
            <li><strong>Article certification</strong> &mdash; admins can certify articles reviewed by at least two experts. Certified articles show a &ldquo;Verified by experts&rdquo; badge.</li>
            <li><strong>Discussions</strong> &mdash; every article has a Discussion tab. Mention <code className="bg-surface-hover px-1 text-[12px]">@username</code> to notify a contributor.</li>
            <li><strong>Article lock</strong> &mdash; opening the editor acquires a 10-minute lock. Other users editing the same article simultaneously see a &ldquo;Being edited by X&rdquo; warning banner; admins can force-unlock.</li>
            <li><strong>Revision restore</strong> &mdash; on the article history page, click &ldquo;restore&rdquo; next to any revision to revert to it (current content is auto-saved as a new revision first).</li>
          </ul>
      </SectionPanel>

      {/* Accessibility */}
      <SectionPanel className="mb-4" title="Accessibility & Reading Comfort" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Dyslexia mode (Aa)</strong> &mdash; click <em>Aa</em> in the action bar to switch to OpenDyslexic font with increased spacing and a warm background tint. Persists across sessions.</li>
            <li><strong>RTL toggle</strong> &mdash; click <em>RTL</em> to switch article content to right-to-left reading direction.</li>
            <li><strong>Audio narration</strong> &mdash; click <em>Listen</em> on any article to hear it read aloud. Uses ElevenLabs if configured; otherwise browser speech synthesis. Includes speed control.</li>
            <li><strong>Machine translation</strong> &mdash; click <em>Translate ▾</em> and select a language. Creates a draft translation via DeepL or Google Translate (requires API key).</li>
            <li><strong>Skip-to-content link</strong> &mdash; first focusable element on every page, visible on keyboard focus.</li>
          </ul>
      </SectionPanel>

      {/* Categories & Tags */}
      <SectionPanel className="mb-4" title="Categories & Tags" bodyClassName="text-[13px]">
          <p className="mb-2">
            <strong>Categories</strong> are hierarchical groups shown in the sidebar. Each article belongs to one category. Browse all at <Link href="/categories">Categories</Link>.
          </p>
          <p>
            <strong>Tags</strong> are hierarchical labels; an article can have multiple tags. Browse all at <Link href="/tags">Tags</Link>, which shows a size-scaled tag cloud.
          </p>
      </SectionPanel>

      {/* Revision History */}
      <SectionPanel className="mb-4" title="Revision History" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Every save auto-snapshots the current state as a revision</li>
            <li>Click the <strong>History</strong> tab on any article to see all past revisions</li>
            <li>Select two revisions and click <strong>Compare</strong> for a side-by-side diff</li>
            <li>Added text shown in <span className="bg-diff-added px-1">green</span>, removed in <span className="bg-diff-removed px-1">red</span></li>
          </ul>
      </SectionPanel>

      {/* Import & Export */}
      <SectionPanel className="mb-4" title="Import & Export" bodyClassName="text-[13px]">
          <p className="mb-1 font-bold text-heading">Import</p>
          <ul className="list-disc pl-5 mb-3 space-y-0.5">
            <li><strong>File upload:</strong> drag-and-drop <code className="bg-surface-hover px-1 text-[12px]">.md</code>, <code className="bg-surface-hover px-1 text-[12px]">.txt</code>, <code className="bg-surface-hover px-1 text-[12px]">.html</code>, or <code className="bg-surface-hover px-1 text-[12px]">.json</code> at <Link href="/import">Import</Link></li>
            <li><strong>Obsidian vault:</strong> upload a <code className="bg-surface-hover px-1 text-[12px]">.zip</code> at <Link href="/import/obsidian">/import/obsidian</Link>. Front matter and <code className="bg-surface-hover px-1 text-[12px]">[[wikilinks]]</code> are resolved automatically.</li>
            <li><strong>Notion:</strong> connect your Notion integration token and import a page tree at <Link href="/import/notion">/import/notion</Link>.</li>
          </ul>
          <p className="mb-1 font-bold text-heading">Export</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li><strong>PDF</strong> &mdash; print-ready window using your browser&apos;s print dialog</li>
            <li><strong>Markdown</strong> &mdash; downloads as a <code className="bg-surface-hover px-1 text-[12px]">.md</code> file</li>
            <li><strong>ePub</strong> &mdash; downloads as a valid ePub 3 e-book</li>
            <li><strong>Word (.docx)</strong> &mdash; downloads as a Microsoft Word document</li>
            <li><strong>Category export:</strong> export an entire category as a multi-chapter ePub or zip from the admin area</li>
            <li><strong>Bulk ZIP export:</strong> download the entire wiki (or one category) as a <code className="bg-surface-hover px-1 text-[12px]">.zip</code> of Markdown files from the <Link href="/export">Export</Link> page — one <code className="bg-surface-hover px-1 text-[12px]">.md</code> per article with YAML front-matter, organised in category subfolders</li>
          </ul>
          <p className="mt-2">All export formats are in the <strong>Export ▾</strong> dropdown on every article page.</p>
          <p className="mb-1 mt-3 font-bold text-heading">Confluence import</p>
          <p className="mb-1">Upload a Confluence HTML export file or paste the HTML directly at <Link href="/admin/import">/admin/import</Link>. The title is extracted from the page heading and Confluence macros are stripped. The result is saved as a draft article.</p>
      </SectionPanel>

      {/* Web Clipping */}
      <SectionPanel className="mb-4" title="Web Clipping" bodyClassName="text-[13px]">
          <p className="mb-2">Save content from the web directly into the wiki without leaving your browser.</p>
          <p className="mb-1 font-bold text-heading">Browser extension</p>
          <p className="mb-2">
            Install the Manifest V3 browser extension (Chrome, Edge, Brave) from <Link href="/clipper-extension">/clipper-extension</Link>. Click the extension popup on any page: the title and selected text are pre-filled; choose a category and click <strong>Save to Wiki</strong>. The article is created as a draft and the popup offers &ldquo;Open editor&rdquo; to refine it.
          </p>
          <p className="mb-1 font-bold text-heading">Bookmarklet</p>
          <p>
            Go to <Link href="/bookmarklet">/bookmarklet</Link> and drag the button to your bookmarks bar (or copy the code). Click the bookmarklet on any page to clip the URL, title, and selected text as a draft article. Selected text is wrapped in a blockquote with a source link; full-page HTML has nav/headers/scripts stripped.
          </p>
      </SectionPanel>

      {/* Whiteboards */}
      <SectionPanel className="mb-4" title="Whiteboards" bodyClassName="text-[13px]">
          <p className="mb-2">
            Create standalone Excalidraw canvases at <Link href="/whiteboards">/whiteboards</Link>. These are separate from the Excalidraw blocks you can embed inside articles.
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Create unlimited named canvases; the canvas auto-saves 2 seconds after each change</li>
            <li>Edit the title inline at the top of the editor</li>
            <li>Full Excalidraw toolkit: shapes, text, arrows, images, freehand drawing</li>
          </ul>
      </SectionPanel>

      {/* Dashboard */}
      <SectionPanel className="mb-4" title="Personal Dashboard" bodyClassName="text-[13px]">
          <p className="mb-2">
            Your personalized homepage at <Link href="/dashboard">/dashboard</Link> shows a grid of widgets you can rearrange and toggle.
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li><strong>Available widgets:</strong> Recent articles, Watchlist, Recent edits, Random article, Scratchpad preview, Wiki stats, Notifications</li>
            <li>Click <strong>Customize</strong> to show/hide widgets and drag cards to reorder them</li>
            <li>Layout is saved to your user preferences and restored on every visit</li>
          </ul>
      </SectionPanel>

      {/* Analytics */}
      <SectionPanel className="mb-4" title="Analytics & Wiki Health" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-0.5">
            <li><strong>Analytics dashboard</strong> &mdash; scroll depth heatmap, reader navigation paths, search gap tracking</li>
            <li><strong>Arkivel Studio</strong> &mdash; <Link href="/studio">/studio</Link> turns live wiki data into a portable visual workspace with base views and next moves</li>
            <li><strong>Studio API</strong> &mdash; <Link href="/api/studio">/api/studio</Link> returns the generated board, bases, links, and action queue; <Link href="/api/studio/canvas">/api/studio/canvas</Link> downloads the board as JSON Canvas</li>
            <li><strong>Canon Atlas</strong> &mdash; <Link href="/atlas">/atlas</Link> turns the wiki into a live map of territories, article signals, story threads, a flagship dossier, continuity pressure, and atlas moves</li>
            <li><strong>Atlas API</strong> &mdash; <Link href="/api/atlas">/api/atlas</Link> returns the same territories, signals, threads, dossier, continuity pressure, and action queue as JSON</li>
            <li><strong>Canon Trails</strong> &mdash; <Link href="/trails">/trails</Link> turns the wiki into guided reading routes through strongest canon, recent updates, deep pages, and repair paths</li>
            <li><strong>Trails API</strong> &mdash; <Link href="/api/trails">/api/trails</Link> returns guided reading routes, stop reasons, estimates, word totals, and link totals as JSON</li>
            <li><strong>Knowledge Command Center</strong> &mdash; <Link href="/intelligence">/intelligence</Link> combines mission readiness, editorial queue pressure, graph gaps, stale content, taxonomy debt, reader demand, and cleanup flags into one cockpit with an article constellation, readiness radar, impact simulator, and 20 operational engines</li>
            <li><strong>Intelligence API</strong> &mdash; <Link href="/api/intelligence">/api/intelligence</Link> returns the same score, summary, graph constellation, radar axes, pressure model, 20 engines, and action queue as JSON</li>
            <li><strong>Search analytics</strong> &mdash; <Link href="/admin/search-analytics">/admin/search-analytics</Link> shows daily search volume, top queries with average result counts, and zero-result queries to surface content gaps</li>
            <li><strong>Search gaps</strong> &mdash; <Link href="/admin/search-gaps">/admin/search-gaps</Link> shows top zero-result queries</li>
            <li><strong>Stale articles</strong> &mdash; <Link href="/admin/staleness">/admin/staleness</Link> lists articles not updated in 180+ days</li>
            <li><strong>Wiki health score</strong> &mdash; <Link href="/admin/health">/admin/health</Link> gives an A–F grade: link coverage, freshness, stub %, search gap %, certification %</li>
            <li><strong>Wiki Health Dashboard</strong> &mdash; <Link href="/health">/health</Link> audits all articles for stubs, outdated content, missing excerpts, missing categories/tags, and broken wiki links; shows a 0–100 health score with per-article fix links</li>
            <li><strong>Embeddings coverage</strong> &mdash; <Link href="/admin/embeddings">/admin/embeddings</Link> shows AI embedding status per article</li>
            <li><strong>Maintenance mode</strong> &mdash; <Link href="/admin/maintenance">/admin/maintenance</Link> toggle displays a site-wide yellow banner while the wiki is under maintenance</li>
            <li><strong>Cleanup tags</strong> &mdash; flag articles with attention labels (Needs Images, Stub, Outdated, etc.); shown as orange banner on article page; set in article edit form</li>
            <li><strong>Article adoption</strong> &mdash; mark articles as abandoned in the edit form; adoption banner with one-click claim appears on the article page</li>
            <li><strong>Scheduled announcements</strong> &mdash; set a &ldquo;Go live at&rdquo; time on banners; shown only once that time is reached</li>
            <li><strong>Read-only mode</strong> &mdash; <Link href="/admin/read-only">/admin/read-only</Link> disables editing for non-admins; blue banner shown site-wide</li>
            <li><strong>Revision pruning</strong> &mdash; <Link href="/admin/prune-revisions">/admin/prune-revisions</Link> deletes old revisions beyond a configurable keep threshold</li>
            <li><strong>User activity log</strong> &mdash; <Link href="/admin/user-activity">/admin/user-activity</Link> shows any user&apos;s full revision history</li>
            <li><strong>Writing velocity</strong> &mdash; <Link href="/admin/writing-velocity">/admin/writing-velocity</Link> bar chart of words added per week over the last 12 weeks</li>
            <li><strong>Session management</strong> &mdash; <Link href="/settings/sessions">/settings/sessions</Link> shows active sessions (device, IP, dates); revoke any session</li>
            <li><strong>AI tag &amp; category suggestions</strong> &mdash; &ldquo;AI suggest&rdquo; buttons in article edit form suggest relevant tags and best-fit category from content</li>
            <li><strong>AI title suggestions</strong> &mdash; &ldquo;AI suggest&rdquo; next to the title field returns 5 alternative encyclopedic titles; click any to apply</li>
            <li><strong>Featured article badge</strong> &mdash; admins can mark articles as Featured; a gold star badge is displayed in the article header</li>
            <li><strong>Auto-save indicator</strong> &mdash; article edit form auto-saves draft to localStorage after 2 s of inactivity; &ldquo;Unsaved changes&rdquo; / &ldquo;Draft saved&rdquo; shown above editor</li>
            <li><strong>Editor reliability</strong> &mdash; <code className="bg-surface-hover px-1 text-[12px]">docs/editor-troubleshooting.md</code> covers draft recovery, snapshot restore/compare/discard, offline warnings, autosave repair, paste/embed handling, diagnostics, and large-document fixtures.</li>
            <li><strong>Character count</strong> &mdash; displayed alongside word count in article byline</li>
            <li><strong>Did-you-mean suggestions</strong> &mdash; zero-result search shows the closest matching article title as a clickable suggestion</li>
            <li><strong>Tag cloud</strong> &mdash; <Link href="/tags/cloud">/tags/cloud</Link> shows all tags sized proportionally by article count</li>
            <li><strong>Article width preference</strong> &mdash; narrow/default/full reading width toggle in article toolbar; persisted to localStorage</li>
            <li><strong>Category growth chart</strong> &mdash; <Link href="/admin/category-growth">/admin/category-growth</Link>; stacked bar chart of new articles per category per month (last 12 months)</li>
            <li><strong>Image lightbox</strong> &mdash; click any image in article content to view full-size; close with Esc or click outside</li>
            <li><strong>AI expand section</strong> &mdash; &ldquo;AI Expand&rdquo; in editor toolbar; select a paragraph, click to expand into more detail with AI</li>
            <li><strong>Smart URL paste</strong> &mdash; pasting a plain HTTP/HTTPS URL in the editor auto-creates a hyperlink; if text is selected the URL becomes its href, otherwise it is inserted as linked text</li>
            <li><strong>Typewriter scrolling mode</strong> &mdash; &ldquo;Typewriter&rdquo; toggle in the editor toolbar keeps the cursor vertically centred as you type; preference persisted to localStorage</li>
            <li><strong>Short-article merger suggestions</strong> &mdash; <Link href="/admin/short-articles">/admin/short-articles</Link>; lists stub articles under 100 words and suggests up to 3 same-category merge targets</li>
            <li><strong>Sidebar position</strong> &mdash; the Dock left/right button in the sidebar footer moves the desktop sidebar to either side with matching borders; the top-left main-menu icon collapses or expands it on larger screens, and both preferences persist to localStorage</li>
            <li><strong>Page titles</strong> &mdash; browser tabs use <code className="bg-surface-hover px-1 text-[12px]">Arkivel - Page Name</code>, with the visible page heading used as the fallback when a route does not define metadata</li>
            <li><strong>Tabbed content blocks</strong> &mdash; <code className="bg-surface-hover px-1 text-[12px]">/tabs</code> slash command inserts an interactive two-tab block; panels are editable inline</li>
            <li><strong>Gallery grid blocks</strong> &mdash; <code className="bg-surface-hover px-1 text-[12px]">/gallery</code> slash command inserts a responsive image grid with captions</li>
            <li><strong>AI wiki assistant</strong> &mdash; floating chat button on every article page; ask questions about the current article or the whole wiki; context-aware conversation powered by AI</li>
            <li><strong>AI article generation</strong> &mdash; &ldquo;AI Generate&rdquo; in editor toolbar; reads document headings and fills in encyclopedic paragraph content under each section</li>
            <li><strong>Button / CTA blocks</strong> &mdash; <code className="bg-surface-hover px-1 text-[12px]">/button</code> slash command inserts a call-to-action button with configurable label, URL, and style (primary / secondary / outline)</li>
            <li><strong>Divider with label blocks</strong> &mdash; <code className="bg-surface-hover px-1 text-[12px]">/divider</code> slash command inserts a horizontal rule with an optional centered text label</li>
            <li><strong>AI revision summary</strong> &mdash; &ldquo;AI summarize&rdquo; button next to the edit summary field auto-generates a concise one-sentence description of what changed</li>
            <li><strong>Article quiz mode</strong> &mdash; &ldquo;Quiz me&rdquo; button in article tools bar; AI generates 5 multiple-choice questions from the article; shows score and records attempt</li>
            <li><strong>Ask my wiki</strong> &mdash; full-page AI oracle at <Link href="/ask">/ask</Link>; streaming answers grounded in your wiki content via semantic search; source article chips; multi-turn conversation; linked from sidebar</li>
            <li><strong>Knowledge synthesis</strong> &mdash; &ldquo;Synthesize&rdquo; button on category pages; AI reads all articles and writes a comprehensive overview; preview modal; one-click to create as a new article</li>
            <li><strong>Presentation mode</strong> &mdash; &ldquo;Present&rdquo; button on any article; opens <code className="bg-surface-hover px-1 text-[12px]">/present/[slug]</code>; cinematic full-screen slideshow with a scrollable slide stage, keyboard navigation, slide overview grid (G), fullscreen (F), and responsive controls that avoid overlap</li>
            <li><strong>Bulk JSON export</strong> &mdash; <Link href="/api/export/json">/api/export/json</Link> downloads all articles as structured JSON (admin only)</li>
            <li><strong>Series progress tracker</strong> &mdash; series navigation shows &ldquo;X of N read&rdquo; from browser reading history</li>
            <li><strong>Writing session goal</strong> &mdash; enter a word-count target in the editor status bar and click Start; a progress bar, elapsed timer, and green completion indicator track your session in real time</li>
            <li><strong>Long article suggestions</strong> &mdash; <Link href="/admin/long-articles">/admin/long-articles</Link> flags published articles over a word threshold (default 5,000); threshold adjustable via the form; linked from admin sidebar</li>
            <li><strong>Random article</strong> &mdash; click &ldquo;Random article&rdquo; in the sidebar Discover section or the &ldquo;Random&rdquo; button on any category page to jump to a random published article; category-filtered via <code className="bg-surface-hover px-1 text-[12px]">/api/random?category=slug</code></li>
            <li><strong>New articles feed</strong> &mdash; homepage sidebar widget listing recently <em>created</em> articles (sorted by creation date, not last edit)</li>
            <li><strong>Top referrers dashboard</strong> &mdash; <Link href="/admin/referrers">/admin/referrers</Link> shows top 30 referring domains with bar charts; toggle 7/30/90-day windows; linked from admin sidebar</li>
            <li><strong>Tag usage trends</strong> &mdash; <Link href="/admin/tag-trends">/admin/tag-trends</Link> heat-map table of new articles per tag per month (last 12 months); linked from admin sidebar</li>
            <li><strong>Analytics CSV export</strong> &mdash; <Link href="/api/export/analytics">/api/export/analytics</Link> downloads a CSV of all published articles including read counts, reactions, revision counts, category, and dates (admin only)</li>
          </ul>
      </SectionPanel>

      {/* Achievements */}
      <SectionPanel className="mb-4" title="Contributor Achievements" bodyClassName="text-[13px]">
          <p className="mb-2">Achievements are awarded automatically based on contribution activity:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li><strong>First edit, 10 edits, 100 edits</strong> &mdash; contribution milestones</li>
            <li><strong>7-day streak / 30-day streak</strong> &mdash; editing on consecutive days</li>
            <li><strong>Category expert</strong> &mdash; significant contributions to a single category</li>
          </ul>
          <p className="mt-2">Unlock notifications appear as a toast after saving.</p>
      </SectionPanel>

      {/* Integrations */}
      <SectionPanel className="mb-4" title="Integrations" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Slack:</strong> <code className="bg-surface-hover px-1 text-[12px]">/wiki &lt;query&gt;</code> slash command to search articles from Slack. Requires <code className="bg-surface-hover px-1 text-[12px]">SLACK_SIGNING_SECRET</code>.</li>
            <li><strong>Discord:</strong> <code className="bg-surface-hover px-1 text-[12px]">/wiki</code> slash command in Discord. Requires <code className="bg-surface-hover px-1 text-[12px]">DISCORD_PUBLIC_KEY</code>.</li>
            <li><strong>Issue links:</strong> link GitHub, Jira, or Linear issues to articles. Status badges appear inline on the article page.</li>
            <li><strong>Embeds:</strong> generate an embed token for any article. The view at <code className="bg-surface-hover px-1 text-[12px]">/embed/[token]</code> is iframe-safe with no navigation.</li>
          </ul>
      </SectionPanel>

      {/* Map */}
      <SectionPanel className="mb-4" title="Interactive Map" bodyClassName="text-[13px]">
          <p className="mb-2">Optional feature, disabled by default. Enable with <code className="bg-surface-hover px-1 text-[12px]">NEXT_PUBLIC_MAP_ENABLED=true</code>.</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Multiple maps with background images and layers</li>
            <li>Clickable polygon areas linked to articles with hover tooltips</li>
            <li>Zoomable with different detail levels per zoom</li>
            <li>Edit mode: draw, reshape, recolor, link to articles (admin only)</li>
          </ul>
      </SectionPanel>

      {/* Navigation & Organization */}
      <SectionPanel className="mb-4" title="Navigation & Organization" bodyClassName="text-[13px]">
          <p className="mb-1">On desktop and tablet, the top-left three-line button collapses or expands the simplified sidebar, section headers fold individual groups, and Dock left/right in the footer chooses the sidebar side. The sidebar starts with navigation rather than repeating the app brand. On phones, the same top-left button opens the menu as an overlay, while the bottom navigation keeps Home, Search, Create, and Recent one tap away.</p>
          <p className="mb-2">Use <kbd>Cmd+K</kbd> / <kbd>Ctrl+K</kbd> to open the command palette from anywhere. It groups destinations across navigation, discovery, personal, reference, and admin areas, then searches articles in the same panel when you type a query.</p>
          <p className="font-semibold mb-0.5">Navigation</p>
          <ul className="list-disc pl-5 space-y-0.5 mb-2">
            <li><Link href="/">Main Page</Link>, <Link href="/articles">All articles</Link>, <Link href="/recent-changes">Recent changes</Link>, <Link href="/random">Random article</Link></li>
            <li><Link href="/search">Search</Link>, <Link href="/tags">Tags</Link>, <Link href="/studio">Arkivel Studio</Link>, <Link href="/atlas">Canon atlas</Link>, <Link href="/trails">Canon trails</Link>, <Link href="/graph">Article graph</Link></li>
          </ul>
          <p className="font-semibold mb-0.5">Discover</p>
          <ul className="list-disc pl-5 space-y-0.5 mb-2">
            <li><Link href="/explore">Explore</Link> — curated entry points; <Link href="/activity">Activity</Link> — recent contribution feed; <Link href="/intelligence">Command center</Link> — live wiki cockpit and intelligence engines</li>
            <li><Link href="/collections">Collections</Link>, <Link href="/change-requests">Change requests</Link>, <Link href="/reviews">Review requests</Link>, <Link href="/bounties">Bounties</Link>, <Link href="/forks">Forks</Link></li>
          </ul>
          <p className="font-semibold mb-0.5">Personal</p>
          <ul className="list-disc pl-5 space-y-0.5 mb-2">
            <li><Link href="/dashboard">Dashboard</Link>, <Link href="/reading-lists">Reading lists</Link>, <Link href="/bookmarks">Bookmarks</Link>, <Link href="/watchlist">Watchlist</Link></li>
            <li><Link href="/flashcards">Flashcards</Link>, <Link href="/learning-paths">Learning paths</Link>, <Link href="/til">Today I Learned</Link>, <Link href="/scratchpad">Scratchpad</Link>, <Link href="/settings">Settings</Link></li>
          </ul>
          <p className="font-semibold mb-0.5">Tools</p>
          <ul className="list-disc pl-5 space-y-0.5 mb-2">
            <li><Link href="/whiteboards">Whiteboards</Link>, <Link href="/timeline">Timeline</Link>, <Link href="/bookmarklet">Bookmarklet</Link>, <Link href="/clipper-extension">Clipper extension</Link></li>
          </ul>
          <p className="font-semibold mb-0.5">Article structure</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li><strong>Backlinks:</strong> &ldquo;What links here&rdquo; at the bottom of every article</li>
            <li><strong>Table of contents:</strong> auto-generated for articles with multiple headings</li>
            <li><strong>Breadcrumb:</strong> category hierarchy shown above the article title</li>
            <li><strong>Disambiguation:</strong> articles with ambiguous titles get a notice</li>
            <li><strong>Redirects:</strong> set a &ldquo;Redirect to&rdquo; slug in the editor to forward the old URL automatically</li>
          </ul>
      </SectionPanel>

      {/* Administration */}
      <SectionPanel className="mb-4" title="Administration" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-0.5">
            <li><strong>Roles:</strong> Viewer (read only), Editor (create/edit), Admin (full access)</li>
            <li><strong>Legacy admin login:</strong> enter the <code className="bg-surface-hover px-1 text-[12px]">ADMIN_SECRET</code> at <Link href="/admin">/admin</Link>; works alongside user accounts</li>
            <li><Link href="/admin">Dashboard</Link> — review queue, statistics, embed tokens</li>
            <li><Link href="/admin/analytics">Analytics</Link>, <Link href="/admin/metrics">Metrics</Link>, <Link href="/admin/operations">Operations</Link>, <Link href="/admin/health">Health</Link></li>
            <li><Link href="/admin/plugins">Plugins</Link>, <Link href="/admin/webhooks">Webhooks</Link>, <Link href="/admin/templates">Templates</Link>, <Link href="/admin/theme">Theme</Link></li>
            <li><Link href="/admin/lint">Content lint</Link>, <Link href="/admin/knowledge-gaps">Knowledge gaps</Link>, <Link href="/admin/search-gaps">Search gaps</Link>, <Link href="/admin/staleness">Staleness</Link>, <Link href="/admin/embeddings">Embeddings</Link></li>
            <li><Link href="/admin/dead-ends">Dead-end articles</Link>, <Link href="/admin/duplicate-content">Duplicate content</Link>, <Link href="/admin/orphans">Orphan articles</Link> — content health tools for finding articles with no outgoing links, similar content, or no incoming links</li>
            <li><Link href="/admin/macros">Macros</Link>, <Link href="/admin/content-schedule">Content schedule</Link>, <Link href="/admin/kanban">Kanban board</Link>, <Link href="/admin/audit-log">Audit log</Link> with filters and redacted export</li>
            <li><Link href="/admin/metadata-schemas">Metadata schemas</Link> — define typed fields per category; <Link href="/admin/federated-peers">Federated peers</Link> — configure peer wikis for cross-wiki search</li>
            <li><Link href="/admin/import">Import tools</Link> — Confluence, Notion, Obsidian import in one place</li>
            <li><strong>Operations dashboard:</strong> <Link href="/admin/operations">/admin/operations</Link>, service health, queues, slow pages, failed webhooks, imports, exports, plugin errors, database health, admin alerts, browser-local acknowledgements, and redacted support bundles</li>
            <li><strong>Maintenance tooling:</strong> <Link href="/admin/maintenance">/admin/maintenance</Link>, safe-upgrade checks, backup reminders, background task pausing, cleanup queues, and runbook links</li>
            <li><strong>Observability:</strong> <Link href="/admin/observability">/admin/observability</Link>, structured operational events, metric ingestion, privacy controls, and external collector guidance</li>
            <li><strong>Performance budgets:</strong> <Link href="/admin/performance">/admin/performance</Link>, route budgets, large-wiki fixtures, slow samples, and Prisma query review guidance</li>
            <li><strong>Security review:</strong> <code className="bg-surface-hover px-1 text-[12px]">docs/security-review.md</code> covers browser headers, reviewed surfaces, abuse-case gates, supply-chain checks, and the pre-v5 threat-model draft</li>
            <li><strong>Marketplace security:</strong> <code className="bg-surface-hover px-1 text-[12px]">docs/secure-marketplace-plugins.md</code> covers unsafe pack rejection, blocked permissions/hooks, dangerous plugin capabilities, provenance checks, and local-only installation</li>
            <li><strong>External references:</strong> <code className="bg-surface-hover px-1 text-[12px]">docs/external-references.md</code> covers imported/mirrored provenance labels, broken-reference diagnostics, and public index privacy planning</li>
            <li><strong>Upgrade assistant:</strong> <code className="bg-surface-hover px-1 text-[12px]">docs/v5-upgrade-planning.md</code> covers v5 readiness checks, pre-upgrade diagnostics, post-upgrade smoke checks, compatibility warnings, and release-note/migration doc links</li>
            <li><strong>Documentation onboarding:</strong> <code className="bg-surface-hover px-1 text-[12px]">docs/index.md</code> and <code className="bg-surface-hover px-1 text-[12px]">docs/maintainer-guide.md</code> cover maintainer docs, setup paths, troubleshooting, docs IA, and practical link-test coverage</li>
            <li><strong>Batch operations:</strong> on <Link href="/articles">All Articles</Link>, bulk-assign category, publish/unpublish, or delete</li>
            <li><strong>Customization:</strong> name, tagline, welcome text, footer set via <code className="bg-surface-hover px-1 text-[12px]">NEXT_PUBLIC_*</code> environment variables</li>
            <li><strong>Customization manifest:</strong> <code className="bg-surface-hover px-1 text-[12px]">/api/customization</code>, public grouped config, supported env vars, style presets, color themes, layout presets, layout composition hooks, component packs, theme packs with the theme-pack schema, and marketplace registry items, contract, and validation metadata for self-hosters and plugins</li>
            <li><strong>Trusted local plugins:</strong> <Link href="/admin/plugins">/admin/plugins</Link> discovers trusted local <code className="bg-surface-hover px-1 text-[12px]">plugin.json</code> manifests only when <code className="bg-surface-hover px-1 text-[12px]">ARKIVEL_ENABLE_TRUSTED_PLUGINS=true</code> and <code className="bg-surface-hover px-1 text-[12px]">ARKIVEL_TRUSTED_PLUGIN_DIR</code> points to an absolute local directory. Review permissions, routes, widgets, hooks, compatibility, source, and load errors before enabling a plugin.</li>
            <li><strong>Plugin security boundary:</strong> v1 plugins are trusted-local and manifest-first. Arkivel does not fetch remote plugin code or run arbitrary install scripts; admins review permission prompts, risk labels, health metadata, routes, widgets, hooks, and audit-backed enable/disable changes before future runtime sandbox work expands execution.</li>
            <li><strong>Plugin authoring:</strong> start from <code className="bg-surface-hover px-1 text-[12px]">examples/plugins/starter-plugin/</code>, validate with <code className="bg-surface-hover px-1 text-[12px]">npm run plugin:validate -- path/to/plugin.json</code>, list supported surfaces with <code className="bg-surface-hover px-1 text-[12px]">npm run plugin:validate -- --list-surfaces</code>, and use <code className="bg-surface-hover px-1 text-[12px]">docs/plugin-authoring.md</code> plus <code className="bg-surface-hover px-1 text-[12px]">examples/plugins/marketplace-listing-template.json</code> for compatibility notes and submission prep.</li>
            <li><strong>Portable bundles:</strong> <code className="bg-surface-hover px-1 text-[12px]">docs/portable-bundles.md</code> defines the full-site bundle manifest, checksums, source metadata, export scope, privacy filters, and dry-run import report before v5. Sessions, API keys, and analytics are excluded by default.</li>
            <li><strong>Export history:</strong> <code className="bg-surface-hover px-1 text-[12px]">/api/export/history</code> lists recent admin export reports, and <code className="bg-surface-hover px-1 text-[12px]">/api/export/history?download=1</code> downloads the report JSON. Export manifests include file counts, byte counts, checksums, warnings, omitted private data, format, status, and scope.</li>
            <li><strong>Audit trail:</strong> <code className="bg-surface-hover px-1 text-[12px]">docs/audit-trail.md</code> documents immutable event coverage, actor/target/workspace/severity/date filters, redacted JSON exports, alert hooks, and retention defaults.</li>
            <li><strong>Moderation:</strong> <code className="bg-surface-hover px-1 text-[12px]">docs/moderation.md</code> covers discussion reports, reviewer-only visibility, suggestion review actions, public contribution spam scoring, and rate-limit planning.</li>
            <li><strong>Workspaces:</strong> <code className="bg-surface-hover px-1 text-[12px]">docs/workspaces.md</code> covers bootstrap profiles, invitations, scoped APIs, marketplace selections, and the single-workspace migration path.</li>
            <li><strong>Private team knowledge base:</strong> <code className="bg-surface-hover px-1 text-[12px]">docs/private-team-knowledge-base.md</code> covers private workspace setup, collaboration controls, user preferences, and public-surface visibility checks for RSS, Atom, sitemap, and API v1.</li>
            <li><strong>Editorial governance:</strong> <code className="bg-surface-hover px-1 text-[12px]">docs/editorial-governance.md</code> covers review governance, claim queues, verification stamps, ownership/escalation paths, and release-blocker summary cards.</li>
            <li><strong>Space customization API:</strong> <code className="bg-surface-hover px-1 text-[12px]">/api/categories/:id/customization</code> and <code className="bg-surface-hover px-1 text-[12px]">/api/articles/:id/customization</code> resolve global, parent category, category, and article overrides for appearance, component pack, template pack, navigation, and metadata schema. Public reads hide <code className="bg-surface-hover px-1 text-[12px]">privateDraftConfig</code>; admin <code className="bg-surface-hover px-1 text-[12px]">PUT</code> requests validate and persist overrides.</li>
            <li><strong>Space customization editor:</strong> <Link href="/admin/categories">/admin/categories</Link> includes the admin editor for category-space overrides, inherited value previews, explicit override markers, reset-to-parent/global controls, conflict warnings, landing previews, and responsive QA checkpoints.</li>
            <li><strong>Space governance:</strong> <code className="bg-surface-hover px-1 text-[12px]">/api/categories/:id/governance</code> stores inherited owner, reviewer, default visibility, review cadence, stale-page threshold, and required health signals. Article pages show inherited governance badges; the admin dashboard summarizes stale pages, draft/review articles, and configured health widgets.</li>
            <li><strong>Component packs:</strong> built-in default wiki, docs portal, team knowledge base, worldbuilding atlas, and research notebook packs declare named slot components and recommended layouts for future runtime pack loading</li>
            <li><strong>Layout composition:</strong> Customization Studio previews the selected layout&apos;s shell density, homepage order, article columns, right rail, dashboard modules, category landing behavior, and scoped <code className="bg-surface-hover px-1 text-[12px]">html[data-layout=&quot;...&quot;]</code> hooks</li>
            <li><strong>Component-pack authoring:</strong> use <code className="bg-surface-hover px-1 text-[12px]">npm run marketplace:generate-component-pack</code>, <code className="bg-surface-hover px-1 text-[12px]">npm run marketplace:validate-pack</code>, <code className="bg-surface-hover px-1 text-[12px]">examples/marketplace/component-pack</code>, and <code className="bg-surface-hover px-1 text-[12px]">docs/component-pack-preview-harness.md</code> to scaffold, validate, document, and plan preview-safe packs</li>
            <li><strong>Style preset:</strong> Set <code className="bg-surface-hover px-1 text-[12px]">NEXT_PUBLIC_ARKIVEL_STYLE</code> to <code className="bg-surface-hover px-1 text-[12px]">classic-wiki</code> or <code className="bg-surface-hover px-1 text-[12px]">atlas-modern</code>, then rebuild/redeploy because <code className="bg-surface-hover px-1 text-[12px]">NEXT_PUBLIC_*</code> values are build-time config</li>
            <li><strong>Color theme:</strong> Set <code className="bg-surface-hover px-1 text-[12px]">NEXT_PUBLIC_ARKIVEL_COLOR_THEME</code> to <code className="bg-surface-hover px-1 text-[12px]">standard</code>, <code className="bg-surface-hover px-1 text-[12px]">forest</code>, or <code className="bg-surface-hover px-1 text-[12px]">ember</code>, then rebuild/redeploy because <code className="bg-surface-hover px-1 text-[12px]">NEXT_PUBLIC_*</code> values are build-time config</li>
            <li><strong>Layout preset:</strong> Set <code className="bg-surface-hover px-1 text-[12px]">NEXT_PUBLIC_ARKIVEL_LAYOUT</code> to <code className="bg-surface-hover px-1 text-[12px]">classic-wiki</code>, <code className="bg-surface-hover px-1 text-[12px]">docs-portal</code>, <code className="bg-surface-hover px-1 text-[12px]">team-knowledge-base</code>, <code className="bg-surface-hover px-1 text-[12px]">worldbuilding-atlas</code>, or <code className="bg-surface-hover px-1 text-[12px]">research-notebook</code></li>
            <li><strong>Admin customization:</strong> <Link href="/admin/customization">/admin/customization</Link> is a tabbed env-first workbench for brand copy, logos, style presets, color themes, layout presets, feature flags, browser-local drafts, named presets, active-vs-draft diffs, keyboard-accessible tabs, screen-reader summaries, responsive QA checkpoints, palette/dark-theme/asset-size diagnostics, live preview panels, source badges, theme-pack validation, downloadable support reports, and copy-ready <code className="bg-surface-hover px-1 text-[12px]">.env</code>, <code className="bg-surface-hover px-1 text-[12px]">.env.local</code>, Vercel, or Docker Compose values; <Link href="/admin/marketplace">/admin/marketplace</Link> filters the versioned local registry, opens item detail panels, copies env vars/pack JSON/plugin manifests/install notes, and previews pasted/uploaded pack JSON with schema, source, license, checksum, token diff, and validation health</li>
            <li><strong>Marketplace contributions:</strong> use <code className="bg-surface-hover px-1 text-[12px]">docs/marketplace-contributions.md</code>, <code className="bg-surface-hover px-1 text-[12px]">examples/marketplace/</code>, and the GitHub marketplace issue templates when preparing preview-safe style, theme, layout, component, plugin, or template pack submissions</li>
          </ul>
      </SectionPanel>

      {/* Maintainer Workflow */}
      <SectionPanel className="mb-4" title="Maintainer Workflow" bodyClassName="text-[13px]">
          <p className="mb-2">
            Documentation and versioning are part of every release. User-visible, API, schema, configuration, workflow, design, or contributor-guidance changes should update the matching references in the same commit.
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Root docs: <code className="bg-surface-hover px-1 text-[12px]">README.md</code>, <code className="bg-surface-hover px-1 text-[12px]">CHANGELOG.md</code>, <code className="bg-surface-hover px-1 text-[12px]">ROADMAP.md</code>, <code className="bg-surface-hover px-1 text-[12px]">DESIGN.md</code>, <code className="bg-surface-hover px-1 text-[12px]">ARCHITECTURE.md</code>, <code className="bg-surface-hover px-1 text-[12px]">CONTRIBUTING.md</code>, and <code className="bg-surface-hover px-1 text-[12px]">AGENTS.md</code></li>
            <li>Product docs: <code className="bg-surface-hover px-1 text-[12px]">docs/help.md</code>, <code className="bg-surface-hover px-1 text-[12px]">docs/features.md</code>, <Link href="/help">/help</Link>, <Link href="/features">/features</Link>, and <Link href="/api-docs">/api-docs</Link> when relevant</li>
            <li>Version metadata: bump <code className="bg-surface-hover px-1 text-[12px]">package.json</code> and <code className="bg-surface-hover px-1 text-[12px]">package-lock.json</code>; patch for docs/process/UI copy, minor for new capabilities, major for breaking changes</li>
            <li>Commit messages: release commits use <code className="bg-surface-hover px-1 text-[12px]">vX.Y.Z: imperative summary</code>, dependency commits keep <code className="bg-surface-hover px-1 text-[12px]">build(deps): ...</code>, and non-version commits use a short imperative subject</li>
          </ul>
      </SectionPanel>

      {/* User Accounts */}
      <SectionPanel className="mb-4" title="User Accounts" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-0.5">
            <li><Link href="/register">Register</Link> with username, email, and password</li>
            <li>User profiles at <code className="bg-surface-hover px-1 text-[12px]">/users/username</code> show contribution history and achievements</li>
            <li>Manage display name, password, notifications, digest schedule, and accessibility defaults at <Link href="/settings">/settings</Link></li>
          </ul>
      </SectionPanel>

      {/* Watchlist & Notifications */}
      <SectionPanel className="mb-4" title="Watchlist & Notifications" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-0.5">
            <li>Watch articles to get notified when they&apos;re edited. Manage your <Link href="/watchlist">watchlist</Link> from the sidebar.</li>
            <li>The bell icon in the header shows unread notification count</li>
            <li><code className="bg-surface-hover px-1 text-[12px]">@username</code> mentions in discussions trigger a notification</li>
            <li>Enable the daily digest under Settings → Digest for a scheduled summary email</li>
          </ul>
      </SectionPanel>

      {/* RSS & API */}
      <SectionPanel className="mb-4" title="RSS Feeds & APIs" bodyClassName="text-[13px]">
          <ul className="list-disc pl-5 space-y-0.5">
            <li><strong>RSS:</strong> <code className="bg-surface-hover px-1 text-[12px]">/feed.xml</code></li>
            <li><strong>Atom:</strong> <code className="bg-surface-hover px-1 text-[12px]">/feed/atom</code></li>
            <li><strong>Public REST API v1:</strong> <code className="bg-surface-hover px-1 text-[12px]">/api/v1/</code> with <code className="bg-surface-hover px-1 text-[12px]">X-API-Key</code> authentication. See <Link href="/api-docs">API Documentation</Link>.</li>
            <li><strong>GraphQL API:</strong> <code className="bg-surface-hover px-1 text-[12px]">/api/graphql</code> — interactive GraphiQL playground at the same URL (GET). Supports queries for articles, categories, tags, revisions, search, and wiki stats.</li>
            <li><strong>Webhooks:</strong> configure HTTP callbacks for article events at <Link href="/admin/webhooks">/admin/webhooks</Link>; delivery log included.</li>
            <li><strong>Operations:</strong> <Link href="/admin/operations">/admin/operations</Link> and <code className="bg-surface-hover px-1 text-[12px]">/api/admin/operations?bundle=1</code> provide admin-only health and diagnostic data for operators.</li>
            <li><strong>Maintenance:</strong> <code className="bg-surface-hover px-1 text-[12px]">/api/admin/maintenance/report</code> provides admin-only upgrade readiness, cleanup queue, and background pause data.</li>
            <li><strong>Observability:</strong> <code className="bg-surface-hover px-1 text-[12px]">/api/admin/observability</code> provides structured event feed and metric ingestion data.</li>
            <li><strong>Performance:</strong> <code className="bg-surface-hover px-1 text-[12px]">/api/admin/performance</code> provides route budget status, large-wiki fixtures, slow samples, and slow-query review data.</li>
          </ul>
      </SectionPanel>

      {/* Keyboard Shortcuts */}
      <SectionPanel className="mb-4" title="Keyboard Shortcuts" bodyClassName="text-[13px]">
          <p className="mb-1 font-bold text-heading">Global</p>
          <DataTable className="mb-4">
            <tbody>
              {([
                ["?", "Show keyboard shortcuts overlay (categorized modal)"],
                ["/", "Focus search bar"],
                ["R", "Toggle reading mode on article pages"],
                ["g then h", "Go to home page"],
                ["g then a", "All articles"],
                ["g then n", "New article"],
                ["g then s", "Search page"],
                ["g then r", "Recent changes"],
                ["g then g", "Article graph"],
                ["Esc", "Close dialog / blur input"],
              ] as [string, string][]).map(([key, desc]) => (
                <tr key={key}>
                  <td className="w-36"><kbd>{key}</kbd></td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <p className="mb-1 font-bold text-heading">In the editor (Ctrl = Cmd on Mac)</p>
          <DataTable>
            <tbody>
              {([
                ["Ctrl+B", "Bold"],
                ["Ctrl+I", "Italic"],
                ["Ctrl+Shift+X", "Strikethrough"],
                ["Ctrl+Shift+L", "Insert wiki link"],
                ["Ctrl+Shift+F", "Insert footnote"],
                ["Ctrl+Shift+7", "Ordered list"],
                ["Ctrl+Shift+8", "Bullet list"],
                ["Ctrl+Shift+B", "Blockquote"],
                ["Ctrl+Shift+E", "Code block"],
                ["Ctrl+Z / Ctrl+Shift+Z", "Undo / Redo"],
              ] as [string, string][]).map(([key, desc]) => (
                <tr key={key}>
                  <td><code className="bg-surface-hover px-1 text-[12px]">{key}</code></td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
      </SectionPanel>

      <div className="wiki-notice">
        <strong>Tip:</strong> Type <code className="bg-surface-hover px-1 text-[12px]">[[</code> anywhere in the editor to search and link to existing articles. Type <code className="bg-surface-hover px-1 text-[12px]">/</code> to open the slash command menu for rich content blocks.
      </div>
    </Page>
  );
}
