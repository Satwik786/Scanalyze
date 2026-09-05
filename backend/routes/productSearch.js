import express from "express";
import ProductIndex from "../models/ProductIndex.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = (req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        error: "Search query is required",
      });
    }

    const products = await ProductIndex.find(
      {
        active: true,
        country: "india",
        $text: {
          $search: query,
        },
      },
      {
        barcode: 1,
        name: 1,
        brand: 1,
        image: 1,
        searchNames: 1,
        categories: 1,

        ingredients_text: 1,
        ingredients_tags: 1,
        ingredients_analysis_tags: 1,
        additives_tags: 1,
        allergens_tags: 1,

        nutriments: 1,
        nutrition_grades: 1,
        nutriscore_data: 1,
        nova_group: 1,

        _id: 0,
      }
    )
      .sort({
        score: { $meta: "textScore" },
      })
      .limit(20)
      .lean();

    res.json({
      products,
      count: products.length,
      source: "scanalyze",
    });
  } catch (error) {
    console.error(
      "Local product search error:",
      error
    );

    res.status(500).json({
      error:
        "Failed to search Scanalyze product database",
    });
  }
});

export default router;