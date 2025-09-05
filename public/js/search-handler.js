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
    resultsContainer.innerHTML = '<p>Invalid or unknown category.</p>';
  } else {
    // Set readable title
    const readableTitle = normalizedKey
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    title.textContent = readableTitle;

    const categorySlug = categoryMap[normalizedKey];
    performCategorySearch(categorySlug);
  }
} else if (query) {
  title.textContent = `Search results for "${query}"`;
  performKeywordSearch(query);
} else {
  title.textContent = 'No search query provided.';
  resultsContainer.innerHTML = '<p>Please enter a search term or choose a category.</p>';
}

// 🔍 Category search function
async function performCategorySearch(categorySlug) {
  resultsContainer.innerHTML = '<p style="font-style: italic; color: gray;">Searching…</p>';

  try {
    const url = `${window.location.origin}/api/category/${encodeURIComponent(categorySlug)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch category data');

    const data = await res.json();

    if (!data.products || data.products.length === 0) {
      resultsContainer.innerHTML = '<p>No products found.</p>';
      return;
    }

    displayResults(data.products);
  } catch (err) {
    console.error(err);
    resultsContainer.innerHTML = '<p>Error fetching data. Please try again later.</p>';
  }
}

// 🔍 Keyword search function
async function performKeywordSearch(query) {
  resultsContainer.innerHTML = '<p style="font-style: italic; color: gray;">Searching…</p>';

  try {
    const url = `${window.location.origin}/api/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch search results');

    const data = await res.json();

    if (!data.products || data.products.length === 0) {
      resultsContainer.innerHTML = '<p>No products found.</p>';
      return;
    }

    displayResults(data.products);
  } catch (err) {
    console.error(err);
    resultsContainer.innerHTML = '<p>Error fetching data. Please try again later.</p>';
  }
}

// Display results in cards
function displayResults(products) {
  resultsContainer.innerHTML = '';

  products.slice(0, 20).forEach(prod => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <img id = "productImg" src="${prod.image_front_url || 'https://via.placeholder.com/150'}" 
           alt="${prod.product_name || 'Product'}"
           onerror="this.src='https://via.placeholder.com/150'" />
      <h4>${prod.product_name || 'Unnamed'}</h4>
      <p>${prod.brands || 'Unknown brand'}</p>
    `;

    card.addEventListener('click', () => {
      if (prod.code) {
        window.location.href = `product.html?code=${encodeURIComponent(prod.code)}`;
      }
    });

    resultsContainer.appendChild(card);
  });
}
