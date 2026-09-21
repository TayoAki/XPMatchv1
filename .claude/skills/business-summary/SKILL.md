---
name: business-summary
description: "Generate a broker-grade Business Summary (prospectus) for a business you intend to START, modeled on Quiet Light Brokerage listing packages: executive summary with financial quickview, key benefits, projected financials with SDE, a numbered founder interview (business model, products, customers, marketing, operations, technology, financials, competition, launch plan, clear path to growth, SWOT), and a validation scorecard. Use when the user says: business summary, write up this business idea, prospectus for X, evaluate this business idea like a buyer would, document a business we might start, compare our business ideas, update the summary for X. Outputs ./business-summaries/<slug>/1-business-summary.md and 2-financial-model.md. Reads: business.md, brand/positioning.md, brand/audience.md, brand/competitors.md if present."
user-invocable: true
---

# Business Summary: a listing package for a business that does not exist yet

**Purpose:** Produce the document a business broker would write about this business three years from now, written today, with every number honestly tagged as Verified, Estimated, or Assumed. The format is borrowed from Quiet Light Brokerage listing packages because that format forces the questions a skeptical buyer asks. If the idea cannot survive those questions on paper, it should not get capital or a year of your life.

The reader is a future buyer, a lending partner, or a co-founder deciding whether to commit. Write for them, not for a pitch meeting.

## Files in this skill

- `references/template.md` — the exact document skeleton and section order. Follow it.
- `references/question-bank.md` — the founder interview questions: a core set plus modules per business type. Pick modules, do not ask everything.
- `references/financial-model.md` — how to build the projection, compute SDE, fill the Financial Quickview, and pick an exit multiple.
- `references/style-guide.md` — voice, formatting, and honesty rules observed in the source listings. Read before writing.

## Modes

1. **New** — no `./business-summaries/<slug>/` exists. Run the full workflow below.
2. **Update** — the folder exists. Read both files, show a one-screen summary of what is there, ask what changed, re-interview only the affected sections, rebuild the financial model if any assumption moved, rewrite the affected sections, bump the "Last updated" line.
3. **Compare** — user asks to compare or rank ideas, or two or more summary folders exist and the user asks "which one". Read every `1-business-summary.md` Financial Quickview and Validation Scorecard, then produce `./business-summaries/COMPARISON.md`: one table (capital required, months to first revenue, Year-3 revenue, Year-3 SDE, SDE margin, founder hours/week, verified-fact share, implied Year-3 valuation) and a short ranked recommendation with the single biggest unknown per idea.

## Workflow (New mode)

### Step 1: Intake (one message)

Ask for, in a single message:
- The idea in two sentences.
- The business type. Offer the list: content/media site, SaaS or software, e-commerce or physical product, marketplace or directory, service or agency, education or community. Multiple allowed.
- Anything already written down (notes, a deck, a spreadsheet, a URL). Read whatever they point to.
- Who the founders are and roughly how many hours per week each can give.

Also read, if present: `business.md`, `brand/positioning.md`, `brand/audience.md`, `brand/competitors.md`. Do not re-ask what those files already answer.

Pick the interview modules from `references/question-bank.md` based on the type. Announce which modules you picked in one line.

### Step 2: Founder interview (batched, section by section)

Ask the Core questions plus the chosen modules, **one section per message, 4 to 8 questions per message**. Never one question at a time (the full set is 60 to 90 questions) and never the whole list at once.

Rules while interviewing:
- Every answer with a number gets a tag: **Verified** (there is a document, a bank statement, a signed quote, a screenshot), **Estimated** (founder's informed guess, say from what), **Assumed** (nobody knows yet). Ask "how do you know?" once per number, then move on.
- If the founder says "I don't know", do not stall. Say what you will assume, why, and mark it Assumed. Put it in the Validation Scorecard later.
- Push back on marketing-speak once, then take the real answer. "Best-in-class" is not an answer. "Cheaper than X by Y% because Z" is.
- Skip questions the founder already answered in an earlier section.
- **Defaults mode.** If the founder says "make it up", "use defaults", or stops answering, do not keep asking. State the defaults you will use for every founder-side input in one short message, tag them all Assumed, run the rest of the workflow without further questions, and open the summary with a line saying founder inputs are defaults. Never upgrade a default to Estimated or Verified on your own.

### Step 3: Research (Claude does this, not the founder)

Answer the market-facing questions yourself with live data. Use whatever is available in this order: `WebSearch`/`WebFetch`, the `firecrawl-search` or `firecrawl-scrape` skills, `treg` for SEO and SERP data, `mcp__perplexity__*` if connected. Never invent competitor pricing, member counts, or search volumes; if a number cannot be found, say so and tag it Assumed.

Minimum research set:
- Top 3 to 5 competitors: real pricing, positioning, visible weaknesses, what they do better.
- Demand evidence: search volume for the 5 to 10 head terms, marketplace listing counts, community size, or comparable businesses' disclosed revenue.
- Category benchmarks for the financial model: gross margin, CAC or cost per lead, churn or repeat rate, typical ad spend as a share of revenue. Cite the source in the assumptions table.
- Comparable exits or listings, if any, to justify the exit multiple.
- Regulatory or platform-policy issues (marketplace terms, licensing, tariffs, data rules) that could stop the business.

### Step 4: Financial model

Follow `references/financial-model.md`. Build the assumptions table first, then the three-year projection, then SDE, then the Financial Quickview. Write the model to `2-financial-model.md`. Every assumption row carries its tag and its source.

If the founder wants a workbook, use the `anthropic-skills:xlsx` skill and mirror the tab structure in the reference (Start Here, Key Metrics, Annual Views, Year 1 Monthly, SDE Add-backs, Assumptions).

### Step 5: Write the summary

Follow `references/template.md` section by section and `references/style-guide.md` for voice. Write to `./business-summaries/<slug>/1-business-summary.md` where `<slug>` is the kebab-case business name.

Non-negotiables in the written document:
- The Executive Summary fits on one page: what it is, who pays, why now, the headline numbers, the founders' edge, and one "Note:" line with the biggest caveat.
- Key Benefits: 5 to 9 bullets, each a bolded lead phrase, a colon, then one sentence containing a number.
- Key Risks sits directly under Key Benefits with the same format. The source listings bury risks in SWOT; this document does not.
- The founder interview is numbered continuously across sections, questions in second person, answers in the founder's first person.
- The Clear Path to Growth lists 3 to 5 projects, then answers: which has the greatest potential, which is cheapest, which is most expensive, and why.
- The SWOT is honest. A weaknesses list with one item is a red flag, not a strength.
- The Validation Scorecard lists every Assumed number, the cheapest test that would move it to Verified, its cost, and its timebox.

### Step 6: QA pass before delivering

Check, and fix, all of the following:
- Every number in the Executive Summary and Quickview reconciles to `2-financial-model.md`.
- No untagged numbers anywhere in the interview answers.
- No competitor claim without a source line.
- No sentence that would embarrass the founder in front of a lender ("huge", "disruptive", "no competition").
- The document names the business consistently and the "Last updated" line is today's date.

Then tell the user: the two file paths, the three numbers that matter most (capital required, Year-3 SDE, share of facts that are Verified), and the top two items on the Validation Scorecard.

## Output

```
./business-summaries/<slug>/
  1-business-summary.md     the prospectus (template.md structure)
  2-financial-model.md      assumptions, 3-year projection, SDE, quickview math
  research/                 optional: raw notes, scraped competitor pages, search data
./business-summaries/COMPARISON.md   compare mode only
```

## Chains to

- `/business` if no business.md exists and the founder wants one after this.
- `/side-hustle-designer` to turn the top Validation Scorecard items into a 90-day test.
- `/competitor-analysis` or `/competitor-spy` for a deeper competitor section.
- `/pricing-strategy` when the pricing answers in the interview were all Assumed.
- `anthropic-skills:docx` or `anthropic-skills:pdf` when a shareable file is needed.
