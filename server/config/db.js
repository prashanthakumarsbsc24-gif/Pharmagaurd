const mongoose = require('mongoose');

// Reject query operators ($ne, $gt ...) smuggled into filter values.
mongoose.set('sanitizeFilter', true);

async function connectDB(uri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    const { host, name } = mongoose.connection;
    console.log(`MongoDB connected: ${host}/${name}`);
  } catch (err) {
    console.error('\nCould not connect to MongoDB.');
    console.error(`  ${err.message}`);
    console.error('  - Is mongod running (local) or is your IP allow-listed (Atlas)?');
    console.error('  - Check MONGODB_URI in server/.env\n');
    process.exit(1);
  }
}

module.exports = connectDB;
