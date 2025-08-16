import express from "express";
import User from "../models/User.js"; // adjust path if needed

const router = express.Router();

/**
 * Save or update preferences
 * POST /api/preferences
 * body: { userId, userName, preferences: [], identifier? }
 */
router.post("/", async (req, res) => {
  try {
    const { userId, userName, preferences, identifier } = req.body;

    if (!userId) return res.status(400).json({ error: "Missing userId" });
    if (!preferences || !Array.isArray(preferences))
      return res.status(400).json({ error: "Preferences must be a non-empty array" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (userName) user.name = userName;
    if (preferences) user.preferences = preferences;

    // Optionally update identifier (email/phone)
    if (identifier) user.identifier = identifier;

    await user.save();
    res.json({ message: "Preferences saved successfully", user });
  } catch (err) {
    console.error("Error saving preferences:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Get preferences by userId
 * GET /api/preferences/:userId
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("email phone name preferences");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error("Error fetching preferences:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Get preferences by identifier (email or phone)
 * POST /api/preferences/get
 * body: { identifier }
 */
router.post("/get", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ error: "Identifier is required" });

    const user = await User.findOne({ identifier }).select("email phone name preferences");
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
 * Validate user (used in frontend)
 * POST /api/preferences/validate
 * body: { userId, identifier }
 */
router.post("/validate", async (req, res) => {
  try {
    const { userId, identifier } = req.body;
    if (!userId || !identifier) return res.status(400).json({ valid: false });

    const user = await User.findById(userId);
    if (!user || user.identifier !== identifier) return res.json({ valid: false });

    res.json({ valid: true });
  } catch (err) {
    console.error("Error validating user:", err);
    res.status(500).json({ valid: false });
  }
});

export default router;
