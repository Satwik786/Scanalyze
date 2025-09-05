import express from "express";
import User from "../models/User.js";

const router = express.Router();

/**
 * Normalize identifier (email → lowercase/trim)
 */
function normalizeIdentifier(identifier) {
  if (!identifier) return null;
  return identifier.includes("@")
    ? identifier.toLowerCase().trim()
    : identifier.trim();
}

/**
 * Register a new user
 * POST /api/preferences/register
 * body: { email, phone, userName, preferences? }
 */
router.post("/register", async (req, res) => {
  try {
    const { email, phone, userName, preferences } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: "Email or phone is required" });
    }

    const identifier = normalizeIdentifier(email || phone);

    const existingUser = await User.findOne({ identifier });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const newUser = new User({
      email: email ? email.toLowerCase().trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      identifier,
      userName: userName || "",
      preferences: preferences || []
    });
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
 * body: { identifier, userName? }
 */
router.post("/login", async (req, res) => {
  try {
    let { identifier, userName } = req.body;
    if (!identifier) return res.status(400).json({ error: "Identifier is required" });

    identifier = normalizeIdentifier(identifier);

    let user = await User.findOne({ identifier });

    // Auto-register if user not found
    if (!user) {
      user = new User({
        email: identifier.includes("@") ? identifier : undefined,
        phone: !identifier.includes("@") ? identifier : undefined,
        identifier,
        userName: userName || "",
        preferences: []
      });
      await user.save();
      console.log(`✅ New user created: ${identifier}`);
    }

    res.json({
      user: {
        _id: user._id,
        email: user.email || "",
        phone: user.phone || "",
        identifier: user.identifier,
        userName: user.userName || "",
        preferences: user.preferences || []
      },
      prefsSaved: user.preferences?.length > 0
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
    let { identifier, userName, preferences } = req.body;

    identifier = normalizeIdentifier(identifier);
    if (!identifier) return res.status(400).json({ error: "Identifier is required" });
    if (!Array.isArray(preferences) || preferences.length === 0) {
      return res.status(400).json({ error: "Preferences must be a non-empty array" });
    }

    let user = await User.findOne({ identifier });

    if (!user) {
      user = new User({
        email: identifier.includes("@") ? identifier : undefined,
        phone: !identifier.includes("@") ? identifier : undefined,
        identifier,
        userName: userName || "",
        preferences
      });
    } else {
      if (userName) user.userName = userName;
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
    let { identifier } = req.body;
    identifier = normalizeIdentifier(identifier);
    if (!identifier) return res.status(400).json({ error: "Identifier is required" });

    const user = await User.findOne({ identifier }).select("identifier email phone userName preferences");

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      identifier: user.identifier,
      userName: user.userName || "",
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
    let { identifier } = req.body;
    identifier = normalizeIdentifier(identifier);
    if (!identifier) return res.status(400).json({ valid: false, error: "Identifier required" });

    const user = await User.findOne({ identifier }).select("userName preferences");

    if (!user) {
      return res.json({ valid: false });
    }

    res.json({
      valid: true,
      userName: user.userName || "",
      prefsSaved: user.preferences?.length > 0
    });
  } catch (err) {
    console.error("Validation error:", err);
    res.status(500).json({ valid: false, error: "Server error" });
  }
});

export default router;
