// Creates a demo account with realistic sample stock so every screen has something to show.
// Dates are relative to today, so statuses (expired / critical / warning / optimal) stay populated.
//
// Usage:  npm run seed          -> demo user "demo" / password "Demo@1234" (region India, prices in INR)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Batch = require('../models/Batch');
const AuditLog = require('../models/AuditLog');

const USERNAME = 'demo';
const PASSWORD = 'Demo@1234';
const RT = 'Room temp (15–25°C)';
const COLD = 'Refrigerated (2–8°C)';
const COOL = 'Cool & dry (below 25°C)';

// [name, lot, storage, price (INR per unit), quantity, unitsSold, days until expiry]
const STOCK = [
  ['Dolo 650 mg | Paracetamol | 15 Tabs',        'DL2406A', RT,   30.91, 1200, 940,   -420],
  ['Crocin Advance 500 mg | 15 Tabs',            'CR2411B', RT,   20.00,  340, 410,   -75],
  ['Azithral 500 mg | Azithromycin | 5 Tabs',    'AZ2502C', RT,  119.50,   86, 130,   -12],
  ['Augmentin 625 Duo | 10 Tabs',                'AG2503D', RT,  204.00,   14,  96,   9],
  ['Pantop 40 mg | Pantoprazole | 15 Tabs',      'PT2504E', RT,  155.00,  260, 175,   18],
  ['Thyronorm 50 mcg | 120 Tabs',                'TN2505F', RT,  245.00,   58,  62,   26],
  ['Insulin Mixtard 30 | 10 ml Vial',            'IM2506G', COLD, 169.00,  42,  88,   41],
  ['Telma 40 | Telmisartan | 15 Tabs',           'TL2507H', RT,  210.00,  310, 205,   58],
  ['Atorva 10 | Atorvastatin | 15 Tabs',         'AT2508J', RT,  98.00,   18,  71,   72],
  ['Glycomet GP 1 | 15 Tabs',                    'GL2509K', RT,   78.50,  540, 360,   88],
  ['Shelcal 500 | Calcium + D3 | 15 Tabs',       'SH2510L', RT,  118.00,  720, 288,   104],
  ['Ecosprin 75 mg | 14 Tabs',                   'EC2511M', RT,    5.80, 1800, 1320, 131],
  ['Combiflam | 20 Tabs',                        'CB2512N', RT,   41.00,  980, 604,   152],
  ['Allegra 120 mg | Fexofenadine | 10 Tabs',    'AL2601P', RT,  210.00,  165,  92,   177],
  ['Liv 52 DS | 60 Tabs',                        'LV2602Q', RT,  166.00,  205, 118,   203],
  ['Becosules | Vitamin B-Complex | 20 Caps',    'BC2603R', RT,   47.60,  630, 402,   228],
  ['ORS Electral | 21.8 g Sachet',               'OR2604S', RT,   21.00, 1500, 1190, 262],
  ['Betadine 5% Ointment | 20 g',                'BT2605T', RT,   82.00,  240, 133,   298],
  ['Volini Gel | 30 g',                          'VL2606U', RT,  120.00,  310, 141,   334],
  ['Digene Gel | Mint | 200 ml',                 'DG2607V', COOL, 118.00,  17,  64,   371],
  ['Cetzine | Cetirizine | 10 Tabs',             'CT2608W', RT,   28.00,  850, 530,   405],
  ['Zincovit | Multivitamin | 15 Tabs',          'ZC2609X', RT,  105.00,  470, 214,   446],
  ['Revital H | 30 Caps',                        'RV2610Y', RT,  326.00,  120,  85,   489],
  ['Vicks Action 500 | 15 Tabs',                 'VK2611Z', RT,   60.00,  390, 222,   520],
  ['Rabeprazole + Domperidone | Razo-D | 15 Caps','RZ2612A', RT, 187.00,   96, 143,   566],
  ['Monocef 1 g | Ceftriaxone Inj | Vial',       'MC2501B', COOL,  84.00,   33,  97,   -210],
  ['Hepatitis B Vaccine | 1 ml Vial',            'HB2502C', COLD, 280.00,   12,  44,   47],
  ['Eptoin 100 mg | Phenytoin | 100 Tabs',       'EP2503D', RT,   46.00,    9,  21,   -40],
];

const dayOffset = (days) => {
  const t = new Date();
  return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate() + days));
};

(async () => {
  await connectDB(process.env.MONGODB_URI);

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  let user = await User.findOne({ usernameKey: USERNAME });
  if (user) {
    user.passwordHash = passwordHash;
    user.region = 'IN';
    await user.save();
    await Batch.deleteMany({ user: user._id });
  } else {
    user = await User.create({ username: USERNAME, passwordHash, role: 'Quality Assurance Officer', region: 'IN' });
  }

  await Batch.insertMany(
    STOCK.map(([medicationName, batchNumber, storage, price, quantity, unitsSold, days]) => ({
      user: user._id, medicationName, batchNumber, storage, price, quantity, unitsSold,
      expirationDate: dayOffset(days),
    }))
  );
  await AuditLog.create({
    user: user._id, username: user.username, role: user.role,
    action: 'Demo Data Loaded', details: `Seeded ${STOCK.length} sample batches (prices in INR).`,
  });

  console.log(`Seeded ${STOCK.length} batches.\n  Username: ${USERNAME}\n  Password: ${PASSWORD}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
