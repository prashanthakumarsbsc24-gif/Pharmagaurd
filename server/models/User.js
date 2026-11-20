const mongoose = require('mongoose');
const { ROLES } = require('../config/roles');
const { REGION_CODES, DEFAULT_REGION } = require('../config/regions');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 40 },
    // Lower-cased copy so "Admin" and "admin" can't both register.
    usernameKey: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'Inventory Manager' },
    region: { type: String, enum: REGION_CODES, default: DEFAULT_REGION },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('validate', function () {
  if (this.username) this.usernameKey = this.username.toLowerCase();
});

userSchema.methods.toPublic = function () {
  return { id: this.id, username: this.username, role: this.role, region: this.region };
};

module.exports = mongoose.model('User', userSchema);
