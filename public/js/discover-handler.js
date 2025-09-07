import { calculateIngredientScore } from './utils/score-logic.js';

// Get login info
const guestMode = localStorage.getItem("guestMode") === "true";
const userIdentifier = localStorage.getItem("userIdentifier");
const userName = localStorage.getItem("userName");

// Show greeting
if (userName) {
  const welcomeEl = document.getElementById("welcome-message");
  if (welcomeEl) welcomeEl.textContent = `Welcome, ${userName}!`;
}

// Redirect if not logged in and not guest
if (!guestMode && !userIdentifier) {
  console.error("User not logged in.");
  window.location.href = "/login";
}

// Track all products
let allProducts = [];

// Display loading spinner
function showLoading() {
  const container = document.getElementById("discoverResults");
  container.innerHTML = `<div class="loading-spinner"><div></div></div>`;
}

// Load Discover products
async function loadDiscoverProducts() {
  showLoading();
  try {
    const url = guestMode
      ? "/api/discover/guest"
      : `/api/discover/${encodeURIComponent(userIdentifier)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

    const data = await res.json();
    allProducts = data || [];
    applyFilters();
  } catch (err) {
    console.error("Error loading products:", err);
    const container = document.getElementById("discoverResults");
    container.innerHTML = "<p>Failed to load products. Please try again later.</p>";
  }
}

// Search functionality
async function searchProducts(query) {
  showLoading();
  try {
    if (!query.trim()) return loadDiscoverProducts();

    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Failed to search: ${res.status}`);

    const data = await res.json();
    allProducts = data.products || [];
    applyFilters();
  } catch (err) {
    console.error("Search error:", err);
    document.getElementById("discoverResults").innerHTML = "<p>Search failed. Try again later.</p>";
  }
}

// Apply veg/non-veg filter
function applyFilters() {
  const selectedDiet = document.querySelector('input[name="diet"]:checked')?.value || "all";
  let filtered = [...allProducts];

  if (selectedDiet === "veg") {
    filtered = filtered.filter(p =>
      p.ingredients_tags?.includes("vegetarian") ||
      p.ingredients_analysis_tags?.includes("en:vegetarian")
    );
  } else if (selectedDiet === "nonveg") {
    filtered = filtered.filter(p =>
      p.ingredients_tags?.includes("non-vegetarian") ||
      p.ingredients_analysis_tags?.includes("en:non-vegetarian")
    );
  }

  displayDiscover(filtered);
}

// Display products in a grid
function displayDiscover(products) {
  const container = document.getElementById("discoverResults");
  container.innerHTML = "";

  if (!products.length) {
    container.innerHTML = "<p>No products found for your selection.</p>";
    return;
  }

  products.forEach(prod => {
    const card = document.createElement("div");
    card.className = "product-card";

    const name = prod.product_name || "Unknown Product";
    const brand = prod.brands || "Unknown";
    const image = prod.image_front_small_url || "../images/default-product.png";
    const ingredients = prod.ingredients_text || "";
    const nutriments = prod.nutriments || {};
    const rating = calculateIngredientScore(ingredients, nutriments);

    card.innerHTML = `
      <a href="product.html?code=${prod.code}" class="product-link">
        <img src="${image}" alt="${name}" />
        <h3>${name}</h3>
        <p>Brand: ${brand}</p>
        <p>Rating: ${rating.toFixed(1)} / 5</p>
      </a>
    `;

    container.appendChild(card);
  });
}

// 🔹 Event listeners

// Search button click
document.getElementById("searchBtn")?.addEventListener("click", () => {
  const query = document.getElementById("searchInput").value;
  searchProducts(query);
});

// Search on Enter key
document.getElementById("searchInput")?.addEventListener("keydown", e => {
  if (e.key === "Enter") searchProducts(e.target.value);
});

// Diet filter radios
document.querySelectorAll('input[name="diet"]').forEach(radio => {
  radio.addEventListener("change", applyFilters);
});

// Filter button dropdown
const filterBtn = document.getElementById("filterBtn");
const filterOptions = document.getElementById("filterOptions");

filterBtn?.addEventListener("click", () => {
  filterOptions.classList.toggle("hidden");
});

// Close filter dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!filterBtn.contains(e.target) && !filterOptions.contains(e.target)) {
    filterOptions.classList.add("hidden");
  }
});

// Run on page load
window.addEventListener("DOMContentLoaded", loadDiscoverProducts);
