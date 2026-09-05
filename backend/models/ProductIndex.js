import mongoose from "mongoose";

const productIndexSchema = new mongoose.Schema(
  {
    barcode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    brand: {
      type: String,
      default: "",
      trim: true,
    },

    searchNames: {
      type: [String],
      default: [],
    },

    categories: {
      type: [String],
      default: [],
    },

    image: {
      type: String,
      default: "",
    },

    ingredients_text: {
      type: String,
      default: "",
    },

    ingredients_tags: {
      type: [String],
      default: [],
    },

    ingredients_analysis_tags: {
      type: [String],
      default: [],
    },

    additives_tags: {
      type: [String],
      default: [],
    },

    allergens_tags: {
      type: [String],
      default: [],
    },

    nutriments: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    nutrition_grades: {
      type: String,
      default: "",
    },

    nutriscore_data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    nova_group: {
      type: Number,
      default: null,
    },

    country: {
      type: String,
      default: "india",
      index: true,
    },

    source: {
      type: String,
      default: "openfoodfacts",
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

productIndexSchema.index({
  name: "text",
  brand: "text",
  searchNames: "text",
});

const ProductIndex = mongoose.model(
  "ProductIndex",
  productIndexSchema
);

export default ProductIndex;