## Problem

In the **Record Contribution** dialog:
1. The **Investment** dropdown shows `$0.00` instead of the real investment amount, because it builds options from past contributions only (not from the `investments` table).
2. There is no visibility into how much of an investor's share is still due — so the user keeps typing wrong dollar amounts manually.

## Plan — edit `src/pages/Investment.tsx` (Record Contribution dialog only)

### 1. Investment dropdown — source from registry
Replace the current `Set` built from contributions with `investments.map(...)`. Each option shows:
```
{inv.name} — {fmtUSD(inv.total_amount_usd)}
```
Empty state: "No investments — add one first".

### 2. Investment summary panel (below the dropdown)
When an investment is selected, show a small bordered panel with three columns:
- **Total** — `inv.total_amount_usd`
- **Paid** — sum of contributions for this investment
- **Due** — `Total − Paid`
Plus a thin progress bar.

### 3. Investor dropdown — show share %
Each option: `{full_name} · {share_percent}%`.

### 4. Investor summary panel + auto-fill
On investor select, compute:
- `committed = invTotal × share% / 100`
- `paidSoFar = sum of this investor's contributions to this investment`
- `due = committed − paidSoFar`

Show a small panel with: Share %, Committed, Already paid, **Remaining due**.

Auto-set `Amount` field to `due` (only if amount is empty or user just changed investor). Also add a small "Use due $X" link next to the Amount label so the user can re-apply it after editing.

### 5. Keep submit logic unchanged
`submitRecord` already inserts using `investment_name`, `shareholder_id`, `amount_usd`. No schema changes.

## Result
- Investment dropdown now correctly shows the real total (e.g. `Capital Amount Investment — $250,000.00`).
- User sees, before typing anything, exactly how much that investor still owes for that investment.
- One click auto-fills the correct due amount → no more wrong dollar values.

No DB migration, no new components, no other files touched.