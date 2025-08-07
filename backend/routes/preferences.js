const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ✅ POST /api/preferences/login
router.post('/login', async (req, res) => {
  const { identifier } = req.body;

  if (!identifier) {
    return res.status(400).json({ error: "Email or phone number required" });
  }

  const isEmail = identifier.includes('@');
  const query = { identifier }; // ✅ Query directly using identifier

  try {
    let user = await User.findOne(query);

    // Create user if not found
    if (!user) {
      user = new User({
        email: isEmail ? identifier : undefined,
        phone: !isEmail ? identifier : undefined,
        identifier, // ✅ Save identifier explicitly
        preferences: []
      });

      await user.save();
    }

    res.json({ message: "Login successful", user });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ POST /api/preferences — Save preferences
router.post('/', async (req, res) => {
  const { email, preferences } = req.body;

  if (!email || !Array.isArray(preferences)) {
    return res.status(400).json({ error: "Email/phone and preferences are required" });
  }

  try {
    const user = await User.findOneAndUpdate(
      {
        $or: [{ email: email }, { phone: email }, { identifier: email }]
      },
      { preferences },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Preferences saved", user });
  } catch (err) {
    console.error("❌ Preferences saving error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
