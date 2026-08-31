import express from "express";
import ProductIndex from "../models/ProductIndex.js";

const router = express.Router();

const categoryMap = {
  biscuits: ["biscuits"],
  "frozen-foods": ["frozen foods", "frozen food"],
  chocolates: ["chocolates", "chocolate"],
  "non-alcoholic-beverages": [
    "non-alcoholic beverages",
    "soft drinks",
    "carbonated drinks",
    "juices",
    "fruit juices",
    "beverages"
  ],
  dairies: ["dairies", "dairy", "yogurts", "cheeses"],
  "instant-noodles": ["instant noodles", "instant food", "noodles"],
  "salty-snacks": ["salty snacks", "snacks", "crisps", "chips"],
  cakes: ["cakes", "cakes and cakes", "biscuits and cakes"],
  rice: ["rice", "rice products"],
  spices: ["spices", "spices and masalas", "masalas"]
};

router.get("/:slug", async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase().trim();

    const categoryTerms = categoryMap[slug];

    if (!categoryTerms) {
      return res.status(400).json({
        error: "Unknown category"
      });
    }

    const categoryRegex = categoryTerms.map(term => ({
      categories: {
        $regex: `^${term}$`,
        $options: "i"
      }
    }));

    const products = await ProductIndex.find({
      active: true,
      country: "india",
      $or: categoryRegex
    })
      .select(
        "barcode name brand categories image"
      )
      .limit(100)
      .lean();

    res.json({
      products,
      count: products.length,
      source: "scanalyze"
    });
  } catch (error) {
    console.error("Local category search error:", error);

    res.status(500).json({
      error: "Failed to fetch category products"
    });
  }
});

export default router;