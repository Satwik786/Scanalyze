import express from "express";
import User from "../models/User.js";

const router = express.Router();

/**
 * Register a new user
 * POST /api/preferences/register
 * body: { email, phone, name, preferences? }
 */
router.post("/register", async (req, res) => {
  try {
    const { email, phone, name, preferences } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: "Email or phone is required" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const newUser = new User({ email, phone, name, preferences: preferences || [] });
    await newUser.save();

    res.json({ message: "User registered successfully", user: newUser });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Login user (auto-registers if new)
 * POST /api/preferences/login
 * body: { identifier, name? }
 */
router.post("/login", async (req, res) => {
  try {
    const { identifier, name } = req.body;
    if (!identifier) return res.status(400).json({ error: "Identifier is required" });

    // Find user by email or phone
    let user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });

    // Auto-register if user not found
    if (!user) {
      user = new User({
        email: identifier.includes("@") ? identifier : undefined,
        phone: !identifier.includes("@") ? identifier : undefined,
        identifier,
        name: name || "",
        preferences: []
      });
      await user.save();
      console.log(`New user created: ${identifier}`);
    }

    res.json({
      user: {
        _id: user._id,
        email: user.email || "",
        phone: user.phone || "",
        name: user.name || "",
        preferences: user.preferences || []
      },
      prefsSaved: user.preferences && user.preferences.length > 0
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Save or update preferences
 * POST /api/preferences
 * body: { identifier, userName, preferences: [] }
 */
router.post("/", async (req, res) => {
  try {
    const { identifier, userName, preferences } = req.body;

    if (!identifier) return res.status(400).json({ error: "Identifier is required" });
    if (!preferences || !Array.isArray(preferences) || preferences.length === 0) {
      return res.status(400).json({ error: "Preferences must be a non-empty array" });
    }

    let user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }, { identifier }] });

    // Auto-register if not found
    if (!user) {
      user = new User({
        email: identifier.includes("@") ? identifier : undefined,
        phone: !identifier.includes("@") ? identifier : undefined,
        identifier,
        name: userName || "",
        preferences
      });
    } else {
      if (userName) user.name = userName;
      user.preferences = preferences;
    }

    await user.save();
    res.json({ message: "Preferences saved successfully", user });
  } catch (err) {
    console.error("Error saving preferences:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Get preferences by identifier
 * POST /api/preferences/get
 * body: { identifier }
 */
router.post("/get", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ error: "Identifier is required" });

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }, { identifier }]
    }).select("email phone name preferences");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      identifier,
      userName: user.name || "",
      preferences: user.preferences || []
    });
  } catch (err) {
    console.error("Error fetching by identifier:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Validate user existence for frontend session
 * POST /api/preferences/validate
 * body: { identifier }
 */
router.post("/validate", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ valid: false, error: "Identifier required" });

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }, { identifier }]
    });

    res.json({ valid: !!user });
  } catch (err) {
    console.error("Validation error:", err);
    res.status(500).json({ valid: false, error: "Server error" });
  }
});

export default router;
