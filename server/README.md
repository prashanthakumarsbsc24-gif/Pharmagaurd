# PharmaGuard API

Express 5 + Mongoose 9. See the [root README](../README.md) for setup.

```
config/       db connection, regions (currency + locale), roles
models/       User, Batch, AuditLog (append-only)
controllers/  auth, batches, audit, meta
routes/       one router per controller
middleware/   JWT auth, error handler
utils/        validators, audit helper
scripts/      seed.js (demo data), migrate-legacy.js (SQLite -> MongoDB)
tests/        node:test integration tests
```

Scripts: `npm start`, `npm run dev` (nodemon), `npm run seed`, `npm run migrate:legacy`, `npm test`.
