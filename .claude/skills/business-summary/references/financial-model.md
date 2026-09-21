# Financial model — how to build `2-financial-model.md`

The source listings ship an income-statement workbook alongside the summary with these tabs: Start Here, Key Metrics, Charts & Trends, Annual Views, TTM, one monthly tab per year, SDE Add-backs – Detail, Historical P&L. Mirror that structure in markdown (and in xlsx if asked), but for a business that does not exist yet the first tab is **Assumptions**, because that is where all the risk lives.

## Order of work

1. Assumptions table
2. Year-1 monthly projection
3. Three-year annual projection
4. SDE and add-backs
5. Capital required and cash low point
6. Financial Quickview values
7. Sensitivity: the three assumptions that move SDE most

Never write a projection line without an assumption row behind it.

## 1. Assumptions table

One row per input. Columns: Assumption · Value · Tag (V/E/A) · Source · Used in.

Minimum rows by section:

**Demand and pricing**
- Price per unit / plan / placement
- Customers (or orders, or subscribers) at month 1, 6, 12, 24, 36
- Growth rate per month, and what drives it (channel, budget)
- Repeat rate, churn, or renewal rate
- Average order value or average revenue per account

**Acquisition**
- Cost per acquisition by channel, or blended
- Paid budget per month
- Organic traffic and conversion rate (if content or e-commerce)
- Trial-to-paid conversion (if SaaS)

**Cost of goods**
- Landed cost per unit, or hosting and API cost per customer, or delivery cost per engagement
- Payment processing fees (Stripe ≈ 2.9% + $0.30; Shopify, Amazon, Etsy fee stacks as applicable)
- Shipping and packaging per order (e-commerce)
- Refund and return rate

**Operating**
- Each contractor or employee: role, monthly cost, start month
- Each software subscription: monthly cost
- Owner salary assumed in the P&L (this becomes an add-back)
- One-time build costs: site, app, brand, legal, initial content, initial inventory

**Capital**
- Founder cash available
- Any outside capital and its terms

Tag rules: **V** requires a document or a screenshot the founder can produce. **E** requires the founder to name what the estimate is based on (a comparable, a quote, a benchmark). Everything else is **A**. Benchmarks pulled by Claude from research are **E** with the source URL; if no source, **A**.

## 2. Year-1 monthly projection

Twelve columns. Rows:

```
Revenue by stream (one row each)
Total revenue
COGS (one row per major component)
Gross profit
Gross margin %
Advertising & marketing (by platform if paid)
Contractors & staff
Software & hosting
Payment processing
Other operating
Total operating expenses
Net operating profit
Owner salary (already inside opex; shown for the add-back)
One-time costs (build, inventory, legal)
Net cash flow
Cumulative cash
```

Cumulative cash starts at founder capital in. The lowest point on that row is the **cash low point**; it drives the capital-required number. Do not let the model assume revenue in month 1 unless the founder can say who pays and why.

## 3. Three-year annual projection

Same rows, three columns, plus the growth rate year over year. Year 2 and 3 monthly detail is optional; annual is required. State the growth driver for each year in one line under the table (new channel, new SKU line, price increase, second region).

## 4. SDE and add-backs

Seller's Discretionary Earnings is the number the whole listing format is built on. It is what a single owner-operator takes home before their own pay, interest, tax, depreciation, and one-off or personal spending.

```
SDE = Net operating profit
    + Owner salary and owner payroll taxes
    + Owner benefits (health insurance, retirement contributions)
    + Interest, depreciation, amortization
    + One-time costs (site build, launch legal, initial brand work, non-recurring inventory write-offs)
    + Personal expenses run through the business (travel, meals, vehicle, home office, if any)
    − Any expense a buyer would have to add (e.g. a replacement for a founder who works unpaid)
```

Build the **SDE Add-backs – Detail** table exactly like the source workbooks: one row per add-back, one column per year, a total row. For a new business the largest rows are owner salary and one-time build costs. If the founders plan to work unpaid, add a **negative** add-back for the market cost of replacing them; the source listings' buyers always ask this.

Report SDE margin = SDE ÷ revenue. Source-listing reference points for context, not targets: content directory 53%, vertical SaaS 70%+, e-commerce jewelry 31%, small SaaS with usage pricing 64%.

## 5. Capital required

```
Capital required = one-time build costs
                 + initial inventory (if any)
                 + |cash low point| from the monthly projection
                 + working-capital buffer (2 to 3 months of operating expenses)
```

Show the four lines separately. If the founder's available cash is less than this, say so in the Executive Summary "Note:" line.

If a loan is contemplated: the SBA 7(a) pre-qualifications in the source set required a 35–40% equity injection for acquisitions, a 10-year term, and a rate capped at prime + 2.75%. Startups face stricter terms than acquisitions. Do not present a loan as the plan unless the founder has spoken to a lender; tag it **A** otherwise.

## 6. Financial Quickview values

Pull directly from the model; never retype by hand.

| Quickview field | Comes from |
|---|---|
| Startup capital required | Section 5 total |
| Months to first revenue | first month with revenue > 0 |
| Months to breakeven (cash) | first month where monthly net cash flow > 0 and stays positive |
| Year-1 / Year-3 revenue | annual projection |
| Year-3 SDE and margin | Section 4 |
| Founder hours/week | interview Q35 |
| Target exit multiple | Section 7 |
| Implied Year-3 valuation | Year-3 SDE × multiple |
| Facts V / E / A | count of tags in the assumptions table |

## 7. Exit multiple

The source listings priced at **1.9x to 4.2x SDE**. Observed drivers:

| Multiple | What it looked like |
|---|---|
| ~1.9x | Small SaaS, revenue flat or declining, usage-based revenue that fluctuates, founder team leaving |
| ~3.9x | Content directory, 10+ years old, revenue up every year since 2020, 75–95% advertiser retention, lean contractor team, founders under 20 hrs/week |
| ~4.2x | Vertical SaaS, 0.6% monthly churn, 96% contracted annual revenue, first mover, 70%+ margins, one customer at 33% (which held it back from higher) |

Rules of thumb for a Year-3 target, all tagged **E**: content and affiliate 2.5–4x; e-commerce 2.5–4x (higher with own brand and repeat rate); SaaS 3–5x SDE for sub-$5M businesses; services and agencies 2–3x; anything dependent on one founder's face or one platform, subtract 0.5–1x. Justify the chosen multiple in two sentences that reference these drivers. A multiple above 4x needs a reason a buyer would accept.

## 8. Sensitivity

Take the three assumptions with the largest effect on Year-3 SDE. For each, show SDE at the base value, at 30% worse, and at 30% better. This is the last table in the file. If a 30% miss on one assumption makes Year-3 SDE negative, that assumption is row 1 of the Validation Scorecard.

## File layout for `2-financial-model.md`

```
# [Business] — Financial Model
Last updated: [date]

## Assumptions
## Year-1 Monthly Projection
## Three-Year Projection
## SDE Add-backs – Detail
## Capital Required
## Financial Quickview (source of truth)
## Sensitivity
## Change log   (Update mode: date, what changed, why)
```
