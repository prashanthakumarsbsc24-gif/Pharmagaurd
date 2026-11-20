# PharmaGuard

Track pharmaceutical batches, expiry dates, losses and audit history.
React (Vite) front end, Express API, MongoDB (Mongoose) database.

## What it does

- **Overview**: a shelf-life runway (expired / critical / warning / optimal), key figures, the next batches to expire and a searchable stock register with add, edit, remove, CSV import and export.
- **Analytics, Losses, Demand & production, Disposal queue, Low stock**: each view is computed from your stored batches. Write-offs and disposals are recorded.
- **Audit trail**: written by the server on every sign-in, stock change, import and disposal. Entries are append-only (the model refuses updates and deletes).
- **Regional currency**: every account has a region (India ₹, US $, UK £, Eurozone €, UAE, Saudi Arabia, Singapore, Australia, Canada, Japan). Money and dates follow that region's formatting, for example `₹12,34,567.00` for India versus `$1,234,567.00` for the US. The region is picked at sign-up (guessed from your browser) and can be switched from the top bar.
- **Accounts**: JWT sign-in, bcrypt password hashes, and each user only ever sees their own data.

> Prices are stored as plain numbers in the account's currency. Switching region changes how amounts are *displayed*; it does not convert them (exchange rates change, and silently rewriting prices would corrupt records). The app asks you to confirm before switching.

## Project layout

```
client/   React app
  src/pages  src/components  src/context  src/services  src/utils  src/styles
server/   Express + Mongoose API
  config  models  controllers  routes  middleware  utils  scripts  tests
```

## Run it locally

You need Node 20+ and a MongoDB, either local (`mongod`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

```bash
npm run install:all
cp server/.env.example server/.env      # then edit it (see below)
npm run seed                            # optional: demo data
npm run dev                             # API on :3000, app on http://localhost:5173
```

`server/.env`:

| Variable | Meaning |
| --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/pharmaguard` locally, or your Atlas `mongodb+srv://…` string |
| `JWT_SECRET` | Long random string. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | API port, default `3000` |

`npm run seed` creates the account **demo / Demo@1234** (region India, prices in ₹) with 28 realistic batches whose dates are relative to today, so every status is populated.

**Atlas tip:** add your IP under *Network Access*, and create a database user under *Database Access*, otherwise the server prints a connection error and exits.

## Bring over your old SQLite data

Your previous version stored data in `server/pharmaguard.db`. It has been exported to `server/data/legacy-export.json` (git-ignored because it contains a password hash). To import it:

```bash
npm run migrate:legacy
```

- The user `HealthCare Pharma` is recreated with its **existing password**.
- The old table stored one row per unit (20,219 rows for 2,076 distinct medicines, all with batch `N/A` and expiry 2024-11-19). They are merged into 2,076 batches with quantities summed, so no units are lost.
- The old schema had no price, storage or sales columns. Those start at 0 / default. Edit a batch, or re-import a CSV that has a `price` column, to fill them in. The Losses page tells you when expired batches have no price.
- Running it twice is safe; existing records are skipped.

You can delete `server/pharmaguard.db` once you've confirmed the migration.

## Production

```bash
npm run build     # builds client/dist
npm start         # Express serves the API and the built app on one port
```

## CSV import

Required: a medication name and an expiry date. Optional: batch, price, stock, storage, units_sold. Common header spellings are recognised (`name`, `medicine`, `lot`, `qty`, `expiry_date`, `mrp`, …).
Dates may be `2027-03-31`, `31/03/2027` (`03/31/2027` for the US region), `31-Mar-2027`, or pharma-style `03/2027` (last day of that month). Comma, semicolon and tab delimiters work. Rows already in your stock (same medicine + lot + expiry) are skipped, so re-importing a file is safe. Missing batch numbers become `N/A`, and missing sales figures become 0.

## API

All routes except `/api/meta/options`, `/api/health`, `/api/auth/register` and `/api/auth/login` need `Authorization: Bearer <token>`.

| Method | Route | |
| --- | --- | --- |
| GET | `/api/meta/options` | regions, currencies, roles |
| POST | `/api/auth/register` · `/api/auth/login` | returns `{ token, user }` |
| GET / PATCH | `/api/auth/me` | current user / change region |
| POST | `/api/auth/logout` | records sign-out in the audit trail |
| GET / POST | `/api/batches` | list / create |
| PUT / DELETE | `/api/batches/:id` | update / delete (`?reason=remove\|write-off\|disposal`) |
| POST | `/api/batches/import` | `{ rows, filename }`, idempotent |
| GET | `/api/audit` | newest first |

## Tests

```bash
npm test     # 11 API integration tests against a real MongoDB (uses database "pharmaguard_test")
```
