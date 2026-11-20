// One-off import of the old SQLite data (exported to data/legacy-export.json) into MongoDB.
// Rows that were stored one-per-unit are already merged by medication + lot + expiry
// with their quantities summed, so no units are lost.
//
// Usage:  npm run migrate:legacy
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Batch = require('../models/Batch');
const AuditLog = require('../models/AuditLog');

const FILE = path.join(__dirname, '..', 'data', 'legacy-export.json');

(async () => {
  if (!fs.existsSync(FILE)) {
    console.error(`Missing ${FILE}`);
    process.exit(1);
  }
  const { users } = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  await connectDB(process.env.MONGODB_URI);

  for (const legacy of users) {
    let user = await User.findOne({ usernameKey: legacy.username.toLowerCase() });
    if (!user) {
      user = await User.create({
        username: legacy.username,
        passwordHash: legacy.passwordHash, // bcrypt hash: the old password keeps working
        role: 'Inventory Manager',
        region: 'IN',
      });
      console.log(`Created user "${user.username}" (existing password still works)`);
    } else {
      console.log(`User "${user.username}" already exists, reusing it`);
    }

    const ops = legacy.batches.map((b) => ({
      updateOne: {
        filter: {
          user: user._id,
          medicationName: b.medicationName,
          batchNumber: b.batchNumber,
          expirationDate: new Date(`${b.expirationDate}T00:00:00.000Z`),
        },
        update: { $setOnInsert: { quantity: b.quantity, price: 0, unitsSold: 0 } },
        upsert: true,
      },
    }));
    const result = await Batch.bulkWrite(ops, { ordered: false });
    console.log(`  ${result.upsertedCount} batches imported, ${result.matchedCount} already present`);

    if (result.upsertedCount > 0) {
      await AuditLog.create({
        user: user._id,
        username: user.username,
        role: user.role,
        action: 'Legacy Migration',
        details: `Imported ${result.upsertedCount} batches from the SQLite version of PharmaGuard. Prices were not recorded in the old schema and are set to 0.`,
      });
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
