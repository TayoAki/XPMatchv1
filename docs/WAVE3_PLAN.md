# Wave 3 plan: reservation import and real travel times

**Status: shipped.** Flows in `docs/USER_FLOWS.md`, costs in `docs/COGS.md`, beta notes in
`docs/BETA_READINESS.md`; tests in `tests/unit/reservations.test.ts` (normalization, PDF text, Routes API
parsing, directions links) and `tests/e2e/reservations.spec.ts` (paste → cards → Add to trip → Bookings →
board with routed legs per mode → PDF → chat → API guards).

Wave 3 is what `docs/GAP_ANALYSIS.md` scheduled for it minus what Wave 2 already absorbed (link and
screenshot import, drag-and-drop): **reservations into the trip** (Wanderlog's confirmation import) and
**real travel times by mode** (the Routes API decision left open in Wave 2). No new vendor: the Routes API
is a second Google SKU on the existing server key. Password reset, email verification and flight price
tracking were sketched as Wave 4 (they need an email provider and a fare API) and Wave 4 is skipped by
decision.

| Step | Feature | Depends on |
| --- | --- | --- |
| 1 | Reservation import: pasted confirmation emails, PDFs and screenshots → bookings with structured details, on the trip, its map and its board | Wave 2 import pipeline, trip items |
| 2 | Routes API travel legs on the board with a Walk / Drive / Transit mode, cached, with the estimate as fallback | Wave 2 board |

## 1. Reservations

### What it looks like
- **Import inspiration** gains a second mode, *A reservation*: paste the confirmation email, or upload the
  PDF or a screenshot. In chat, pasting a confirmation calls `import_reservation`. Either way the result
  is a set of **reservation cards**: kind (flight, hotel, restaurant, car, train, activity), provider,
  confirmation code, dates and times, place or address, travelers, price; flights list their legs.
- **Add to trip** on a card stores it under the trip's **Bookings** with the structured details (icon,
  dates, code, provider, price, link) and, for hotels, restaurants and venues that resolve through Places,
  a pin on the trip map. On the **Board**, a day shows the reservations that start on it above its stops
  (check-in, flight departure, dinner at 20:00).

### How it works
1. `trip_items.details jsonb` (migration `0004_reservations`) carries the reservation; the items API accepts
   and returns it; nothing else in the table changes.
2. `src/server/reservations.ts`: text from a paste, from a PDF (`unpdf`, no native dependency) or from an
   image (the Wave 2 vision path) goes to one structured model call ("extract the reservations", at most
   ten), then normalization (known kinds, dates as `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`, codes upper-case,
   capped lengths) and verification: hotels, restaurants and venues resolve through Places with the Wave 2
   name match; flights keep their IATA legs. `POST /api/reservations` takes JSON `{ text }` or multipart
   `file` (PDF, PNG, JPEG, WebP; 6 MB).
3. Client: `ReservationCards`, the import form's mode switch, `AddToTripRequest.booking`, structured
   rows in the Bookings tile, a reservations strip per day on the board, `import_reservation` chat tool
   and prompt rule.

### Tests
- Unit: normalization (kinds, dates, codes, caps, empty titles dropped), flight legs, a PDF fixture read
  by `unpdf`.
- End to end: paste a confirmation on Create › Import → cards → Add to trip → Bookings shows code and
  dates → Board shows it on Day 1; PDF upload → cards; the same text pasted in chat → cards.

## 2. Travel times

### How it works
- `POST /api/routes/legs { mode, points }` → `src/server/routes.ts` calls the Routes API
  (`computeRoutes` with intermediates for walking and driving, one call per leg for transit, field mask
  limited to distance and duration), caches by mode and rounded coordinates for a day, and falls back to
  the straight-line estimate with `source: "estimate"` when the key is missing, `ROUTES_API_ENABLED=0`, or
  the call fails. `ROUTES_BASE_URL` points the end-to-end suite at a stub that computes deterministic legs.
- The board gets a **Walk / Drive / Transit** control (remembered per browser); each day requests its legs
  when its placed stops or the mode change, shows "12 min walk · 0.9 km · via Google" when real and keeps
  "est." otherwise; Directions links use the same mode.

### Cost
Routes API Compute Routes (Basic) is about $5 per 1,000 requests; one request per day per change with a
one-day cache, so a busy planning session costs cents. See `docs/COGS.md`.
