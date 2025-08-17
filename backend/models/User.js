import mongoose from "mongoose";

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
    sparse: true // Ensures either email or phone is treated as unique identifier
  },
  name: {
    type: String,
    default: "" // Added name field for storing userName
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
