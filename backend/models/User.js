import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    sparse: true, // optional
    lowercase: true, // normalize emails
    trim: true
  },
  phone: {
    type: String,
    sparse: true, // optional
    trim: true
  },
  identifier: {
    type: String,
    required: true,   // ✅ must always exist
    unique: true,     // enforce uniqueness
    index: true,
    lowercase: true,  // normalize for login
    trim: true
  },
  userName: {
    type: String,
    default: ""
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

const User = mongoose.model("User", userSchema);

export default User;
