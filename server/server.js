require('dotenv').config();
const connectDB = require('./config/db');
const app = require('./app');

const { MONGODB_URI, JWT_SECRET, PORT = 3000 } = process.env;

if (!MONGODB_URI || !JWT_SECRET) {
  console.error('\nMissing configuration. Copy server/.env.example to server/.env and set:');
  if (!MONGODB_URI) console.error('  - MONGODB_URI');
  if (!JWT_SECRET) console.error('  - JWT_SECRET');
  console.error('');
  process.exit(1);
}

(async () => {
  await connectDB(MONGODB_URI);
  app.listen(PORT, () => console.log(`PharmaGuard API running on http://localhost:${PORT}`));
})();
