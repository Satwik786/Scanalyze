import { calculateIngredientScore } from './utils/score-logic.js';
import {
  getUserAllergens,
  filterProductsByAllergens
} from './utils/allergens.js';

const guestMode =
  localStorage.getItem("guestMode") === "true";

const userIdentifier =
  localStorage.getItem("userIdentifier");

const userName =
  localStorage.getItem("userName");

if (guestMode) {
  console.warn(
    "Guests cannot access Discover. Redirecting..."
  );

  window.location.href =
    "/html/home-page.html";
}

if (!guestMode && !userIdentifier) {
  console.error("User not logged in.");

  window.location.href = "/login";
}

if (userName) {
  const welcomeEl =
    document.getElementById("welcome-message");

  if (welcomeEl) {
    welcomeEl.textContent =
      `Welcome, ${userName}!`;
  }
}

let allProducts = [];

function showLoading() {
  const container =
    document.getElementById("discoverResults");

  if (container) {
    container.innerHTML =
      `<div class="loading-spinner"><div></div></div>`;
  }
}

async function loadDiscoverProducts() {
  showLoading();

  try {
    const url = guestMode
      ? "/api/discover/guest"
      : `/api/discover/${encodeURIComponent(
          userIdentifier
        )}`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(
        `Failed to fetch: ${res.status}`
      );
    }

    const data = await res.json();

    allProducts = Array.isArray(data)
      ? data
      : data.products || [];

    console.log(
      "Discover products:",
      allProducts.length
    );

    await applyFilters();
  } catch (err) {
    console.error(
      "Error loading products:",
      err
    );

    const container =
      document.getElementById("discoverResults");

    if (container) {
      container.innerHTML =
        "<p>Failed to load products. Please try again later.</p>";
    }
  }
}

async function searchProducts(query) {
  showLoading();

  try {
    if (!query.trim()) {
      await loadDiscoverProducts();
      return;
    }

    const res = await fetch(
      `/api/local-search?q=${encodeURIComponent(
        query
      )}`
    );

    if (!res.ok) {
      throw new Error(
        `Failed to search: ${res.status}`
      );
    }

    const data = await res.json();

    allProducts =
      data.products || [];

    await applyFilters();
  } catch (err) {
    console.error(
      "Search error:",
      err
    );

    const container =
      document.getElementById(
        "discoverResults"
      );

    if (container) {
      container.innerHTML =
        "<p>Search failed. Try again later.</p>";
    }
  }
}

function getTags(product) {
  const ingredientTags =
    Array.isArray(product.ingredients_tags)
      ? product.ingredients_tags
      : [];

  const analysisTags =
    Array.isArray(
      product.ingredients_analysis_tags
    )
      ? product.ingredients_analysis_tags
      : [];

  return [
    ...ingredientTags,
    ...analysisTags
  ].map(tag =>
    String(tag)
      .toLowerCase()
      .trim()
  );
}

function isVegetarian(product) {
  const tags = getTags(product);

  const explicitlyNonVegetarian =
    tags.includes("en:non-vegetarian") ||
    tags.includes("en:non_vegetarian") ||
    tags.includes("non-vegetarian") ||
    tags.includes("non_vegetarian");

  if (explicitlyNonVegetarian) {
    return false;
  }

  const explicitlyVegetarian =
    tags.includes("en:vegetarian") ||
    tags.includes("vegetarian") ||
    tags.includes("en:vegetarian-status-yes");

  return explicitlyVegetarian;
}

function isNonVegetarian(product) {
  const tags = getTags(product);

  return (
    tags.includes("en:non-vegetarian") ||
    tags.includes("en:non_vegetarian") ||
    tags.includes("non-vegetarian") ||
    tags.includes("non_vegetarian")
  );
}

async function applyFilters() {
  const selectedDiet =
    document.querySelector(
      'input[name="diet"]:checked'
    )?.value || "all";

  let filtered =
    [...allProducts];

  console.log(
    "Before diet filter:",
    filtered.length
  );

  if (selectedDiet === "veg") {
    filtered =
      filtered.filter(product =>
        isVegetarian(product)
      );
  }

  if (selectedDiet === "nonveg") {
    filtered =
      filtered.filter(product =>
        isNonVegetarian(product)
      );
  }

  console.log(
    "After diet filter:",
    filtered.length
  );

  const allergens =
    await getUserAllergens();

  if (
    Array.isArray(allergens) &&
    allergens.length > 0
  ) {
    filtered =
      filterProductsByAllergens(
        filtered,
        allergens
      );
  }

  console.log(
    "After allergen filter:",
    filtered.length
  );

  displayDiscover(filtered);
}

function getProductName(product) {
  return (
    product.name ||
    product.product_name ||
    "Unknown Product"
  );
}

function getProductBrand(product) {
  return (
    product.brand ||
    product.brands ||
    "Unknown"
  );
}

function getProductBarcode(product) {
  return (
    product.barcode ||
    product.code ||
    ""
  );
}

function getProductImage(product) {
  return (
    product.image ||
    product.image_front_url ||
    product.image_front_small_url ||
    "../images/default-product.png"
  );
}

function displayDiscover(products) {
  const container =
    document.getElementById(
      "discoverResults"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!products.length) {
    container.innerHTML =
      "<p>No products found for your selection.</p>";

    return;
  }

  products.forEach(product => {
    const card =
      document.createElement("div");

    card.className =
      "product-card";

    const name =
      getProductName(product);

    const brand =
      getProductBrand(product);

    const barcode =
      getProductBarcode(product);

    const image =
      getProductImage(product);

    const ingredients =
      product.ingredients_text || "";

    const nutriments =
      product.nutriments || {};

    let ratingText = "N/A";

    if (ingredients.trim()) {
      try {
        const rating =
          calculateIngredientScore(
            ingredients,
            nutriments
          );

        if (
          typeof rating === "number" &&
          Number.isFinite(rating)
        ) {
          ratingText =
            `${rating.toFixed(1)} / 5`;
        }
      } catch (error) {
        console.error(
          "Rating calculation error:",
          error
        );
      }
    }

    const productUrl =
      barcode
        ? `product.html?code=${encodeURIComponent(
            barcode
          )}`
        : "#";

    card.innerHTML = `
      <a
        href="${productUrl}"
        class="product-link"
      >
        <img
          src="${image}"
          alt="${name}"
          onerror="
            this.onerror=null;
            this.src='../images/default-product.png';
          "
        />

        <h3>${name}</h3>

        <p>Brand: ${brand}</p>

        <p>Rating: ${ratingText}</p>
      </a>
    `;

    container.appendChild(card);
  });
}

document
  .getElementById("searchBtn")
  ?.addEventListener(
    "click",
    () => {
      const input =
        document.getElementById(
          "searchInput"
        );

      if (input) {
        searchProducts(
          input.value
        );
      }
    }
  );

document
  .getElementById("searchInput")
  ?.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        searchProducts(
          event.target.value
        );
      }
    }
  );

document
  .querySelectorAll(
    'input[name="diet"]'
  )
  .forEach(radio => {
    radio.addEventListener(
      "change",
      applyFilters
    );
  });

const filterBtn =
  document.getElementById(
    "filterBtn"
  );

const filterOptions =
  document.getElementById(
    "filterOptions"
  );

filterBtn?.addEventListener(
  "click",
  () => {
    filterOptions?.classList.toggle(
      "hidden"
    );
  }
);

document.addEventListener(
  "click",
  event => {
    if (
      filterBtn &&
      filterOptions &&
      !filterBtn.contains(
        event.target
      ) &&
      !filterOptions.contains(
        event.target
      )
    ) {
      filterOptions.classList.add(
        "hidden"
      );
    }
  }
);

window.addEventListener(
  "DOMContentLoaded",
  loadDiscoverProducts
);