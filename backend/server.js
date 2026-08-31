import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import User from "./models/User.js";
import ProductIndex from "./models/ProductIndex.js";
import discoverRoute from "./routes/discover.js";
import connectDB from "./db.js";
import dotenv from "dotenv";
import preferencesRoute from "./routes/preferences.js";
import categoryRoute from "./routes/category.js";
import productSearchRoute from "./routes/productSearch.js";
import {
  searchProducts,
  getProductByBarcode,
} from "./services/openFoodFacts.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDB();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/preferences", preferencesRoute);
app.use("/api/category", categoryRoute);
app.use("/api/local-search", productSearchRoute);
app.use("/api/discover", discoverRoute);

app.get("/api/search", async (req, res) => {
  const searchTerms = req.query.q || "";

  if (!searchTerms.trim()) {
    return res.status(400).json({
      error: "Search query is required",
    });
  }

  try {
    const data = await searchProducts(searchTerms, 20);

    res.json(data);
  } catch (error) {
    console.error("Search API error:", error);

    res.status(error.status || 502).json({
      error:
        error.message || "Failed to perform search",
    });
  }
});

app.get("/api/product/:code", async (req, res) => {
  const { code } = req.params;
  const identifier = req.query.identifier;

  try {
    const data = await getProductByBarcode(code);

    const product = data?.product || data;
    let warnings = [];

    if (identifier && product) {
      const user = await User.findOne({
        $or: [
          { email: identifier },
          { phone: identifier },
          { identifier },
        ],
      });

      if (
        user?.preferences?.length &&
        product.ingredients_text
      ) {
        const productIngredients =
          product.ingredients_text.toLowerCase();

        user.preferences.forEach((pref) => {
          if (
            pref &&
            productIngredients.includes(
              pref.toLowerCase().trim()
            )
          ) {
            warnings.push(pref);
          }
        });
      }
    }

    res.json({
      product,
      warnings,
    });
  } catch (error) {
    console.error("Product API error:", error);

    res.status(error.status || 502).json({
      error:
        error.message ||
        "Failed to fetch product data",
    });
  }
});

app.get("/api/barcode-search", async (req, res) => {
  const query = (req.query.q || "").trim();

  if (!query) {
    return res.status(400).json({
      error: "Search query is required",
    });
  }

  try {
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
        _id: 0,
      }
    )
      .sort({
        score: {
          $meta: "textScore",
        },
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
      "Barcode search API error:",
      error
    );

    res.status(500).json({
      error:
        "Failed to search Scanalyze product database",
    });
  }
});

app.get("/login", (req, res) => {
  res.redirect("/html/login.html");
});

app.get("/home", (req, res) => {
  res.redirect("/html/home-page.html");
});

app.get("/", (req, res) => {
  res.redirect("/html/login.html");
});

app.use((req, res) => {
  res.status(404).send(
    "404 - Page Not Found"
  );
});

app.listen(PORT, () => {
  console.log(
    `Server running at http://localhost:${PORT}`
  );
});