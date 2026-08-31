import express from "express";
import User from "../models/User.js";
import ProductIndex from "../models/ProductIndex.js";

const router = express.Router();

function filterByPreferences(products, preferences = []) {
  const normalizedPreferences = preferences
    .filter(Boolean)
    .map((preference) => preference.toLowerCase().trim())
    .filter(Boolean);

  if (!normalizedPreferences.length) {
    return products;
  }

  return products.filter((product) => {
    const ingredientsText = (
      product.ingredients_text ||
      ""
    ).toLowerCase();

    return !normalizedPreferences.some((preference) =>
      ingredientsText.includes(preference)
    );
  });
}

async function getLocalProducts(limit = 20) {
  return ProductIndex.find(
    {
      active: true,
      country: "india",
    },
    {
      barcode: 1,
      name: 1,
      brand: 1,
      image: 1,
      categories: 1,
      searchNames: 1,

      ingredients_text: 1,
      ingredients_tags: 1,
      ingredients_analysis_tags: 1,
      allergens_tags: 1,
      nutriments: 1,

      _id: 0,
    }
  )
    .limit(limit)
    .lean();
}

router.get("/guest", async (req, res) => {
  try {
    const products = await getLocalProducts(20);

    res.json({
      products,
      count: products.length,
      source: "scanalyze",
    });
  } catch (error) {
    console.error("Guest Discover API error:", error);

    res.status(500).json({
      error: "Failed to fetch local discover products",
    });
  }
});

router.get("/:identifier", async (req, res) => {
  try {
    const identifier = req.params.identifier;

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phone: identifier },
        { identifier },
      ],
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const products = await getLocalProducts(20);

    const safeProducts = filterByPreferences(
      products,
      user.preferences || []
    );

    res.json({
      products: safeProducts,
      count: safeProducts.length,
      source: "scanalyze",
    });
  } catch (error) {
    console.error("Discover API error:", error);

    res.status(500).json({
      error: "Failed to fetch local discover products",
    });
  }
});

export default router;