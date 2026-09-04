import axios from "axios";

const OFF_BASE_URL = "https://world.openfoodfacts.org";

const OFF_HEADERS = {
  "User-Agent": "Scanalyze/1.0 (raisatwik12@gmail.com)",
  Accept: "application/json",
};

const offClient = axios.create({
  baseURL: OFF_BASE_URL,
  headers: OFF_HEADERS,
  timeout: 10000,
});

const cache = new Map();
const pendingRequests = new Map();

const CACHE_TTL = {
  search: 5 * 60 * 1000,
  category: 10 * 60 * 1000,
  discover: 10 * 60 * 1000,
  product: 15 * 60 * 1000,
};

const STALE_TTL = 30 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  const age = Date.now() - entry.timestamp;

  if (age <= entry.ttl) {
    return {
      data: entry.data,
      stale: false,
    };
  }

  if (age <= entry.ttl + STALE_TTL) {
    return {
      data: entry.data,
      stale: true,
    };
  }

  cache.delete(key);
  return null;
}

function setCached(key, data, ttl) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

async function requestWithCache(key, requestFn, ttl) {
  const cached = getCached(key);

  if (cached && !cached.stale) {
    return cached.data;
  }

  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const request = (async () => {
    try {
      const data = await requestFn();

      setCached(key, data, ttl);

      return data;
    } catch (error) {
      const stale = getCached(key);

      if (stale?.stale) {
        console.warn(`Using stale cache for: ${key}`);
        return stale.data;
      }

      throw getOffError(error);
    } finally {
      pendingRequests.delete(key);
    }
  })();

  pendingRequests.set(key, request);

  return request;
}

function getOffError(error) {
  const status = error.response?.status;

  if (status === 429) {
    return {
      status: 429,
      message: "Open Food Facts rate limit reached. Please try again shortly.",
    };
  }

  if (status === 503) {
    return {
      status: 503,
      message:
        "Open Food Facts is temporarily unavailable. Please try again shortly.",
    };
  }

  if (status === 403) {
    return {
      status: 403,
      message: "Open Food Facts temporarily denied this request.",
    };
  }

  if (error.code === "ECONNABORTED") {
    return {
      status: 504,
      message: "Open Food Facts request timed out.",
    };
  }

  return {
    status: 502,
    message: "Unable to reach Open Food Facts.",
  };
}

function productFields() {
  return [
    "code",
    "product_name",
    "brands",
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
    "categories",
    "categories_tags_en",
    "labels_tags_en"
  ].join(",");
}
export async function searchProducts(query, limit = 20, country = "india") {
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    return {
      products: [],
      count: 0,
    };
  }

  const pageSize = Math.min(Number(limit) || 20, 20);

  const cacheKey = `search:${country || "global"}:${normalizedQuery.toLowerCase()}:${pageSize}`;

  return requestWithCache(
    cacheKey,
    async () => {
      const params = {
        search_terms: normalizedQuery,
        search_simple: 1,
        action: "process",
        json: 1,
        page_size: pageSize,
      };

      if (country) {
        params.tagtype_0 = "countries";
        params.tag_contains_0 = "contains";
        params.tag_0 = country;
      }

      const response = await offClient.get("/cgi/search.pl", {
        params,
      });

      return {
        products: response.data?.products || [],
        count: response.data?.count || 0,
      };
    },
    CACHE_TTL.search
  );
}

export async function searchCategory(categorySlug, limit = 20) {
  if (!categorySlug?.trim()) {
    return {
      products: [],
      count: 0,
    };
  }

  const normalizedSlug = categorySlug.trim().toLowerCase();
  const pageSize = Math.min(Number(limit) || 20, 20);

  const cacheKey = `category:${normalizedSlug}:${pageSize}`;

  return requestWithCache(
    cacheKey,
    async () => {
      const response = await offClient.get("/api/v2/search", {
        params: {
          categories_tags_en: normalizedSlug,
          countries_tags_en: "india",
          page_size: pageSize,
          page: 1,
          fields: productFields(),
        },
      });

      return {
        products: response.data?.products || [],
        count: response.data?.count || 0,
      };
    },
    CACHE_TTL.category
  );
}

export async function getIndianProducts(limit = 20) {
  const pageSize = Math.min(Number(limit) || 20, 20);
  const cacheKey = `discover:india:${pageSize}`;

  return requestWithCache(
    cacheKey,
    async () => {
      const response = await offClient.get("/api/v2/search", {
        params: {
          countries_tags_en: "india",
          page_size: pageSize,
          page: 1,
          fields: productFields(),
        },
      });

      return response.data?.products || [];
    },
    CACHE_TTL.discover
  );
}

export async function getProductByBarcode(code) {
  const normalizedCode = code?.trim();

  if (!normalizedCode) {
    throw {
      status: 400,
      message: "Product barcode is required.",
    };
  }

  const cacheKey = `product:${normalizedCode}`;

  return requestWithCache(
    cacheKey,
    async () => {
      const response = await offClient.get(
        `/api/v3/product/${encodeURIComponent(normalizedCode)}`,
        {
          params: {
            fields: productFields(),
          },
        }
      );

      return response.data;
    },
    CACHE_TTL.product
  );
}