# Platinum Operations Platform — Developer Guide

Live: https://app.amiinnovations.com/platinum/ (GitHub Pages, this repository, folder `platinum/`).
Back end: Supabase project **AMI Commercial** (`xxdqrvcpxhsepwzfmnjs`), database schema `plat`.

## Front end (folder `platinum/`)
Plain HTML, CSS and JavaScript. No build step. Scripts are classic scripts loaded in order with `defer`; they share one global scope.

| File | What it holds |
|---|---|
| `index.html` | Page markup only (sign-in, section chooser, tab bar, view area) and the list of scripts |
| `css/platinum.css` | All styles |
| `js/core.js` | Supabase connection, helpers (`say`, `money`, `esc`, `table` with search box, `kpis`, CSV), calls to every server function (`api`, `kapi`, `gapi`, `bapi`, `sapi`, `reapi`), sections and tabs (`SECTIONS`, `TAB_ROLES`, `openSection`, `openTab`), sign-in with email code. Ends with `const VIEWS = {}` |
| `js/views-*.js` | One file per area. Each adds its screens with `Object.assign(VIEWS, { tab_id() {...} })`. Tab ids match `SECTIONS[...].tabs` |
| `js/forms.js` | Client file, KYC form, quarterly report chooser, wordings, product rules |
| `js/start.js` | Signs the person in and opens their own workspace |
| `print.html` | Printed policy and motor certificates (sticker and Brown Card numbers); locked by `sharelock.js` without GM/CEO approval |
| `cbl.html`, `africare.html` | CBL quarterly return and Africa Re submission; GM/CEO only; editing through `qedit.js` |
| `board.html` | Board report |

To change a screen: edit its `js/views-*.js` file, then raise `?v=` on that script in `index.html` so phones load the new copy.

## Server functions (Supabase Edge Functions)
| Function | Purpose | Roles |
|---|---|---|
| `plat` | Main: policies, underwriting, approvals, receipts, claims, payroll, lists, reports (large, older) | by action |
| `platkyc` | KYC, client underwriting files, replace old policies, stickers and Brown Cards | admin, gm, underwriter (+sales for KYC) |
| `platagent` | Agents and brokers, give policies, commission payments with checks | see file |
| `platbooks` | Creditors, purchases, petty cash, debtors by agent, CBL/Africa Re report figures and edits | see file |
| `platre` | Reinsurer accounts (Africa Re, facultative), payments with GM/CEO approval, access setting | gm, admin (+accountant if allowed) |
| `platshare` | Approval to share policies and statements (48 hours) | all; decide = gm, admin |
| `platcheck` | Books check and last night's automatic check | admin, gm, accountant |

Every function checks the signed-in email against `plat.users` and its role, and writes changes to `plat.audit`.

## Accounting rules
- All entries go through `plat.post(date, memo, source, source_id, lines)`; a deferred trigger refuses any entry that does not balance.
- Policies post when approved (`plat.issue_policy`): receivable, premium, Africa Re share, reinsurance commission.
- Commission is earned on receipt (`plat.receive`); paid only through `platagent` (old route blocked by trigger `block_old_commission_pay`).
- Closed months (`plat.periods.closed`) are refused by the newer functions.
- `plat.books_check()` runs every night at 01:17 (pg_cron job `plat-nightly-books-check`), results in `plat.check_runs`.

## Pending before go-live
- Real opening bank balance, share capital, CBL deposit (`plat.settings` key `opening_balances` is a placeholder).
- Sum insured on non-motor policies; real sticker and Brown Card numbers (`plat.remove_test_certificates()` removes TEST stock).
- Two-step sign-in for GM, CEO and Accounting.
