const resultsContainer = document.getElementById('search-results');
const title = document.getElementById('category-title');

const categoryMap = {
  'biscuits': 'biscuits',
  'frozen foods': 'frozen-foods',
  'chocolates': 'chocolates',
  'cold drinks juices': 'non-alcoholic-beverages',
  'dairy bread eggs': 'dairies',
  'instant food': 'instant-meals',
  'munchies': 'salty-snacks',
  'cakes bakes': 'cakes',
  'rice atta dals': 'rice',
  'oil masalas': 'culinary-oils'
};

// Normalize category key from URL
const params = new URLSearchParams(window.location.search);
const categoryKey = params.get('category');
const normalizedKey = categoryKey?.toLowerCase();

if (!normalizedKey || !categoryMap[normalizedKey]) {
  resultsContainer.innerHTML = '<p>Invalid or unknown category.</p>';
} else {
  // Set readable title
  const readableTitle = normalizedKey
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  title.textContent = readableTitle;

  const categorySlug = categoryMap[normalizedKey];
  performSearch(categorySlug);
}

async function performSearch(categorySlug) {
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

    resultsContainer.innerHTML = '';

    data.products.slice(0, 20).forEach(prod => {
      const card = document.createElement('div');
      card.className = 'result-card';
      card.innerHTML = `
        <img src="${prod.image_front_thumb_url || 'https://via.placeholder.com/150'}" 
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
  } catch (err) {
    console.error(err);
    resultsContainer.innerHTML = '<p>Error fetching data. Please try again later.</p>';
  }
}
