const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: false,
    sparse: true // Optional field
  },
  phone: {
    type: String,
    unique: false,
    sparse: true // Optional field
  },
  identifier: {
    type: String,
    unique: true,
    sparse: true // ✅ This ensures email or phone is treated as unique identifier
  },
  preferences: {
    type: [String],
    default: []
  },
  role: {
    type: String,
    default: "user"
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
