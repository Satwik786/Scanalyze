import express from "express";
import axios from "axios";
import User from "../models/User.js";

const router = express.Router();

/**
 * Helper: fetch Indian products from OpenFoodFacts
 */
async function fetchIndianProducts(limit = 20) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?action=process&tagtype_0=countries&tag_contains_0=contains&tag_0=india&page_size=${limit}&json=1`;

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "ScanalyzeApp/1.0" },
    });
    return response.data.products || [];
  } catch (err) {
    console.error("OpenFoodFacts fetch error:", err.message);
    return [];
  }
}

/**
 * GET /api/discover/:identifier
 * Returns safe Indian products for the logged-in user
 */
router.get("/:identifier", async (req, res) => {
  try {
    const identifier = req.params.identifier;

    // Find user
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }, { identifier }],
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const preferences = (user.preferences || []).map((p) => p.toLowerCase());

    // Fetch Indian products
    const products = await fetchIndianProducts(20);

    // Filter out products containing allergens
    const safeProducts = products.filter((product) => {
      const ingredientsText = product.ingredients_text
        ? product.ingredients_text.toLowerCase()
        : "";
      return !preferences.some((allergen) =>
        ingredientsText.includes(allergen)
      );
    });

    res.json(safeProducts);
  } catch (err) {
    console.error("Discover fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch discover products" });
  }
});

/**
 * GET /api/discover/guest
 * Returns a generic top Indian product feed
 */
router.get("/guest", async (req, res) => {
  try {
    const products = await fetchIndianProducts(20);
    res.json(products);
  } catch (err) {
    console.error("Guest discover fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch guest products" });
  }
});

export default router;
