import dotenv from "dotenv";
import axios from "axios";
import connectDB from "./db.js";
import ProductIndex from "./models/ProductIndex.js";

dotenv.config();

const USER_AGENT =
  "Scanalyze/1.0 (raisatwik12@gmail.com)";

const REQUEST_DELAY = 2500;
const RETRY_DELAY = 10000;
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchProduct(barcode) {
  const url =
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}` +
    `?fields=code,ingredients_text,ingredients_tags,ingredients_analysis_tags,additives_tags,allergens_tags,nutriments,nutrition_grades,nutriscore_data,nova_group`;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        timeout: 15000,
      });

      return response.data?.product || null;
    } catch (error) {
      const status =
        error.response?.status;

      if (
        (status === 429 || status === 503) &&
        attempt < MAX_RETRIES
      ) {
        console.log(
          `OFF ${status} for ${barcode}. Retry ${attempt}/${MAX_RETRIES - 1}...`
        );

        await sleep(RETRY_DELAY);
        continue;
      }

      console.log(
        `Failed ${barcode}:`,
        status ||
          error.code ||
          error.message
      );

      return null;
    }
  }

  return null;
}

function hasUsableObject(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function hasUsableArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0
  );
}

async function main() {
  try {
    await connectDB();

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      " Scanalyze Product Enrichment"
    );
    console.log(
      "======================================"
    );
    console.log("");

    const products =
      await ProductIndex.find(
        {
          active: true,
          country: "india",

          $or: [
            {
              ingredients_text: {
                $exists: false,
              },
            },
            {
              ingredients_text: "",
            },

            {
              ingredients_tags: {
                $exists: false,
              },
            },
            {
              ingredients_tags: {
                $size: 0,
              },
            },

            {
              ingredients_analysis_tags: {
                $exists: false,
              },
            },
            {
              ingredients_analysis_tags: {
                $size: 0,
              },
            },

            {
              additives_tags: {
                $exists: false,
              },
            },
            {
              additives_tags: {
                $size: 0,
              },
            },

            {
              allergens_tags: {
                $exists: false,
              },
            },
            {
              allergens_tags: {
                $size: 0,
              },
            },

            {
              nutriments: {
                $exists: false,
              },
            },
            {
              nutriments: {},
            },

            {
              nutrition_grades: {
                $exists: false,
              },
            },
            {
              nutrition_grades: "",
            },

            {
              nutriscore_data: {
                $exists: false,
              },
            },
            {
              nutriscore_data: null,
            },

            {
              nova_group: {
                $exists: false,
              },
            },
            {
              nova_group: null,
            },
          ],
        },
        {
          barcode: 1,
          name: 1,

          ingredients_text: 1,
          ingredients_tags: 1,
          ingredients_analysis_tags: 1,
          additives_tags: 1,
          allergens_tags: 1,

          nutriments: 1,
          nutrition_grades: 1,
          nutriscore_data: 1,
          nova_group: 1,
        }
      )
        .sort({ barcode: 1 })
        .lean();

    console.log(
      `Products needing enrichment: ${products.length}`
    );
    console.log("");

    if (!products.length) {
      console.log(
        "All products already have enrichment data."
      );

      return;
    }

    let updated = 0;
    let failed = 0;

    for (
      let i = 0;
      i < products.length;
      i++
    ) {
      const product =
        products[i];

      console.log(
        `[${i + 1}/${products.length}] ${product.name} (${product.barcode})`
      );

      const data =
        await fetchProduct(
          product.barcode
        );

      if (!data) {
        failed++;

        await sleep(
          REQUEST_DELAY
        );

        continue;
      }

      const updateData = {
        ingredients_text:
          data.ingredients_text || "",

        ingredients_tags:
          Array.isArray(
            data.ingredients_tags
          )
            ? data.ingredients_tags
            : [],

        ingredients_analysis_tags:
          Array.isArray(
            data.ingredients_analysis_tags
          )
            ? data.ingredients_analysis_tags
            : [],

        additives_tags:
          Array.isArray(
            data.additives_tags
          )
            ? data.additives_tags
            : [],

        allergens_tags:
          Array.isArray(
            data.allergens_tags
          )
            ? data.allergens_tags
            : [],

        nutriments:
          hasUsableObject(
            data.nutriments
          )
            ? data.nutriments
            : {},

        nutrition_grades:
          typeof data.nutrition_grades ===
          "string"
            ? data.nutrition_grades
            : "",

        nutriscore_data:
          hasUsableObject(
            data.nutriscore_data
          )
            ? data.nutriscore_data
            : null,

        nova_group:
          Number.isFinite(
            Number(data.nova_group)
          )
            ? Number(data.nova_group)
            : null,

        lastUpdated:
          new Date(),
      };

      await ProductIndex.updateOne(
        {
          barcode:
            product.barcode,
        },
        {
          $set: updateData,
        }
      );

      updated++;

      console.log(
        "  Updated."
      );

      await sleep(
        REQUEST_DELAY
      );
    }

    console.log("");
    console.log(
      "======================================"
    );
    console.log(
      " Enrichment complete"
    );
    console.log(
      "======================================"
    );
    console.log(
      `Updated: ${updated}`
    );
    console.log(
      `Failed: ${failed}`
    );
    console.log(
      `Total: ${products.length}`
    );
    console.log("");
  } catch (error) {
    console.error(
      "Enrichment failed:",
      error.message
    );
  } finally {
    process.exit(0);
  }
}

main();