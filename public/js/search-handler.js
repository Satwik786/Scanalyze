import { getUserAllergens, filterProductsByAllergens } from './utils/allergens.js';

const resultsContainer = document.getElementById('search-results');
const title = document.getElementById('category-title');

const categoryMap = {
  'biscuits': 'biscuits',
  'frozen foods': 'frozen-foods',
  'chocolates': 'chocolates',
  'cold drinks juices': 'non-alcoholic-beverages',
  'dairy bread eggs': 'dairies',
  'instant food': 'instant-noodles',
  'munchies': 'salty-snacks',
  'cakes bakes': 'cakes',
  'rice atta dals': 'rice',
  'spices': 'spices'
};

const params = new URLSearchParams(window.location.search);
const categoryKey = params.get('category');
const query = params.get('query');

if (categoryKey) {
  const normalizedKey = categoryKey.toLowerCase();

  if (!categoryMap[normalizedKey]) {
    title.textContent = 'Invalid Category';
    resultsContainer.innerHTML = '<p>Invalid or unknown category.</p>';
  } else {
    const readableTitle = normalizedKey
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    title.textContent = readableTitle;

    const categorySlug = categoryMap[normalizedKey];

    performCategorySearch(categorySlug);
  }
} else if (query) {
  title.textContent = `Search results for "${query}"`;

  performKeywordSearch(query);
} else {
  title.textContent = 'Search';

  resultsContainer.innerHTML =
    '<p>Please enter a search term or choose a category.</p>';
}

async function performKeywordSearch(query) {
  resultsContainer.innerHTML =
    '<p style="font-style: italic; color: gray;">Searching…</p>';

  try {
    const res = await fetch(
      `/api/local-search?q=${encodeURIComponent(query)}`
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch search results: ${res.status}`);
    }

    const data = await res.json();

    if (!data.products || data.products.length === 0) {
      resultsContainer.innerHTML = '<p>No products found.</p>';
      return;
    }

    const allergens = await getUserAllergens();

    const filteredProducts = filterProductsByAllergens(
      data.products,
      allergens
    );

    displayResults(filteredProducts);
  } catch (err) {
    console.error('Local search error:', err);

    resultsContainer.innerHTML =
      '<p>Error searching Scanalyze database. Please try again later.</p>';
  }
}

async function performCategorySearch(categorySlug) {
  resultsContainer.innerHTML =
    '<p style="font-style: italic; color: gray;">Searching…</p>';

  try {
    const res = await fetch(
      `/api/category/${encodeURIComponent(categorySlug)}`
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch category data: ${res.status}`);
    }

    const data = await res.json();

    if (!data.products || data.products.length === 0) {
      resultsContainer.innerHTML = '<p>No products found.</p>';
      return;
    }

    const allergens = await getUserAllergens();

    const filteredProducts = filterProductsByAllergens(
      data.products,
      allergens
    );

    displayResults(filteredProducts);
  } catch (err) {
    console.error('Category search error:', err);

    resultsContainer.innerHTML =
      '<p>Error fetching category data. Please try again later.</p>';
  }
}

function displayResults(products) {
  resultsContainer.innerHTML = '';

  if (!products.length) {
    resultsContainer.innerHTML =
      '<p>No products found for your preferences.</p>';
    return;
  }

  products.slice(0, 20).forEach(prod => {
    const card = document.createElement('div');
    card.className = 'result-card';

    const image =
      prod.image ||
      prod.image_front_url ||
      prod.image_front_small_url ||
      'https://via.placeholder.com/150';

    const name =
      prod.name ||
      prod.product_name ||
      'Unnamed Product';

    const brand =
      prod.brand ||
      prod.brands ||
      'Unknown brand';

    const barcode =
      prod.barcode ||
      prod.code ||
      '';

    card.innerHTML = `
      <img
        id="productImg"
        src="${image}"
        alt="${name}"
        onerror="this.src='https://via.placeholder.com/150'"
      />

      <h4>${name}</h4>

      <p>${brand}</p>
    `;

    card.addEventListener('click', () => {
      if (!barcode) return;

      window.location.href =
        `product.html?code=${encodeURIComponent(barcode)}`;
    });

    resultsContainer.appendChild(card);
  });
}