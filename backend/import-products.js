import dotenv from "dotenv";
import axios from "axios";
import connectDB from "./db.js";
import ProductIndex from "./models/ProductIndex.js";

dotenv.config();

const OFF_URL = "https://world.openfoodfacts.org/api/v2/search";

const USER_AGENT = "Scanalyze/1.0 (raisatwik12@gmail.com)";

const PAGE_SIZE = 100;
const MAX_PAGES_PER_CATEGORY = 2;

const REQUEST_DELAY = 3000;
const CATEGORY_DELAY = 5000;

const CATEGORIES = [
  "biscuits",
  "frozen-foods",
  "chocolates",
  "non-alcoholic-beverages",
  "dairies",
  "instant-foods",
  "salty-snacks",
  "cakes",
  "rice",
  "spices",

  "breakfast-cereals",
  "breads",
  "sauces",
  "spreads",
  "jams",
  "fruit-juices",
  "sodas",
  "waters",
  "teas",
  "coffees",
  "ice-creams",
  "yogurts",
  "cheeses",
  "pasta",
  "noodles",
  "soups",
  "ready-meals",
  "canned-foods",
  "snacks",
  "chocolate-spreads",
  "confectioneries",
  "energy-drinks",
  "protein-bars",
  "cookies",
];

const FIELDS = [
  "code",
  "product_name",
  "brands",
  "categories_tags_en",
  "image_front_url",
  "image_front_small_url",

  "ingredients_text",
  "ingredients_tags",
  "ingredients_analysis_tags",
  "additives_tags",
  "allergens_tags",

  "nutriments",
  "nutrition_grades",
  "nutriscore_data",
  "nova_group",
].join(",");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clean(value) {
  if (!value) return "";

  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function cleanArray(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map(clean)
    .filter(Boolean);
}

function normalize(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchNames(name, brand, categories) {
  const searchNames = new Set();

  const normalizedName = normalize(name);
  const normalizedBrand = normalize(brand);

  if (normalizedName) {
    searchNames.add(normalizedName);

    const words = normalizedName.split(" ");

    for (let i = 1; i <= words.length; i++) {
      searchNames.add(
        words.slice(0, i).join(" ")
      );
    }
  }

  if (normalizedBrand) {
    searchNames.add(normalizedBrand);

    const brandWords = normalizedBrand.split(" ");

    for (
      let i = 1;
      i <= brandWords.length;
      i++
    ) {
      searchNames.add(
        brandWords.slice(0, i).join(" ")
      );
    }
  }

  if (normalizedName && normalizedBrand) {
    searchNames.add(
      `${normalizedBrand} ${normalizedName}`
    );

    searchNames.add(
      `${normalizedName} ${normalizedBrand}`
    );
  }

  for (const category of categories) {
    const normalizedCategory =
      normalize(category);

    if (normalizedCategory) {
      searchNames.add(normalizedCategory);
    }
  }

  return [...searchNames];
}

function createProductDocument(product) {
  const barcode = clean(product.code);
  const name = clean(product.product_name);
  const brand = clean(product.brands);

  if (!barcode || !name) {
    return null;
  }

  const categories = cleanArray(
    product.categories_tags_en
  );

  const ingredientsTags = cleanArray(
    product.ingredients_tags
  );

  const ingredientsAnalysisTags =
    cleanArray(
      product.ingredients_analysis_tags
    );

  const additivesTags = cleanArray(
    product.additives_tags
  );

  const allergensTags = cleanArray(
    product.allergens_tags
  );

  return {
    barcode,
    name,
    brand,

    searchNames: buildSearchNames(
      name,
      brand,
      categories
    ),

    categories,

    image:
      clean(product.image_front_url) ||
      clean(product.image_front_small_url),

    ingredients_text:
      clean(product.ingredients_text),

    ingredients_tags:
      ingredientsTags,

    ingredients_analysis_tags:
      ingredientsAnalysisTags,

    additives_tags:
      additivesTags,

    allergens_tags:
      allergensTags,

    nutriments:
      product.nutriments &&
      typeof product.nutriments === "object"
        ? product.nutriments
        : {},

    nutrition_grades:
      clean(product.nutrition_grades),

    nutriscore_data:
      product.nutriscore_data &&
      typeof product.nutriscore_data === "object"
        ? product.nutriscore_data
        : null,

    nova_group:
      Number.isFinite(
        Number(product.nova_group)
      )
        ? Number(product.nova_group)
        : null,

    country: "india",
    source: "openfoodfacts",
    lastUpdated: new Date(),
    active: true,
  };
}

async function fetchCategoryPage(
  category,
  page
) {
  const response = await axios.get(
    OFF_URL,
    {
      params: {
        categories_tags_en: category,
        countries_tags_en: "india",
        page_size: PAGE_SIZE,
        page,
        fields: FIELDS,
      },

      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },

      timeout: 15000,
    }
  );

  return response.data;
}

async function importCategory(category) {
  console.log("");
  console.log(`=== ${category} ===`);

  let imported = 0;

  for (
    let page = 1;
    page <= MAX_PAGES_PER_CATEGORY;
    page++
  ) {
    console.log(
      `Fetching page ${page}...`
    );

    try {
      const data =
        await fetchCategoryPage(
          category,
          page
        );

      const products =
        data.products || [];

      if (!products.length) {
        console.log(
          "No more products found."
        );

        break;
      }

      const operations = [];

      for (const product of products) {
        const document =
          createProductDocument(
            product
          );

        if (!document) continue;

        operations.push({
          updateOne: {
            filter: {
              barcode:
                document.barcode,
            },

            update: {
              $set: document,
            },

            upsert: true,
          },
        });
      }

      if (operations.length) {
        const result =
          await ProductIndex.bulkWrite(
            operations,
            {
              ordered: false,
            }
          );

        const affected =
          (result.upsertedCount || 0) +
          (result.modifiedCount || 0);

        imported += affected;

        console.log(
          `Page ${page}: ${products.length} received, ${affected} records affected`
        );
      }

      if (
        page <
        MAX_PAGES_PER_CATEGORY
      ) {
        await sleep(
          REQUEST_DELAY
        );
      }
    } catch (error) {
      const status =
        error.response?.status;

      if (status === 429) {
        console.log(
          `Rate limited on ${category}, page ${page}. Skipping category.`
        );
      } else if (status === 503) {
        console.log(
          `OFF temporarily unavailable for ${category}, page ${page}. Skipping category.`
        );
      } else {
        console.log(
          `Failed ${category}, page ${page}:`,
          status ||
            error.code ||
            error.message
        );
      }

      break;
    }
  }

  console.log(
    `${category}: ${imported} records affected`
  );

  return imported;
}

async function main() {
  try {
    await connectDB();

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      " Scanalyze Product Index Importer"
    );
    console.log(
      "======================================"
    );
    console.log("");

    console.log(
      `Categories: ${CATEGORIES.length}`
    );

    console.log(
      `Pages per category: ${MAX_PAGES_PER_CATEGORY}`
    );

    console.log(
      `Products per page: ${PAGE_SIZE}`
    );

    console.log("");

    let totalAffected = 0;

    for (const category of CATEGORIES) {
      const affected =
        await importCategory(
          category
        );

      totalAffected += affected;

      await sleep(
        CATEGORY_DELAY
      );
    }

    const count =
      await ProductIndex.countDocuments(
        {
          active: true,
          country: "india",
        }
      );

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      " Import complete"
    );
    console.log(
      "======================================"
    );

    console.log(
      `Total records affected: ${totalAffected}`
    );

    console.log(
      `Total active Indian products: ${count}`
    );

    console.log("");
  } catch (error) {
    console.error(
      "Importer failed:",
      error.message
    );
  } finally {
    process.exit(0);
  }
}

main();