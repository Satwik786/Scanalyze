function calculateIngredientScore(ingredientsText) {
  if (!ingredientsText || ingredientsText.trim() === '') return 1.0;

  const text = ingredientsText.toLowerCase();
  let score = 5.0;

  const healthy = ['oat', 'quinoa', 'whole grain', 'lentil', 'fruit', 'vegetable'];
  const harmful = ['preservative', 'color', 'colour', 'flavouring', 'flavor', 'emulsifier', 'sweetener', '\\be\\d+\\b'];
  const redFlags = ['sugar', 'salt', 'palm oil', 'flavour enhancer', 'msg', 'monosodium glutamate'];

  healthy.forEach(h => { if (text.includes(h)) score += 0.2; });
  redFlags.forEach(f => { if (text.includes(f)) score -= 1.0; });

  harmful.forEach(word => {
    const regex = new RegExp(`\\b${word}\\w*\\b`, 'gi');
    const matches = text.match(regex) || [];
    score -= 0.5 * matches.length;
  });

  const separators = (ingredientsText.match(/[,;]/g) || []).length;
  if (separators > 7) score -= 0.5;

  return Math.max(0.5, Math.min(score, 5.0));
}

async function loadProduct() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');

  if (!code) {
    document.body.innerHTML = '<p>Product code missing.</p>';
    return;
  }

  const productNameEl = document.getElementById('product-name');
  productNameEl.textContent = 'Loading…';

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
    const json = await res.json();

    if (json.status === 0) {
      document.body.innerHTML = '<p>Product not found.</p>';
      return;
    }

    const p = json.product;

    document.getElementById('product-img').src = p.image_front_url || 'https://via.placeholder.com/200';
    productNameEl.textContent = p.product_name || 'Unnamed';
    document.getElementById('product-brand').textContent = p.brands || 'Unknown brand';

    const n = p.nutriments || {};
    document.getElementById('nutr-energy').textContent = n['energy-kcal_100g'] ?? '–';
    document.getElementById('nutr-fat').textContent = n.fat_100g ?? '–';
    document.getElementById('nutr-sugars').textContent = n.sugars_100g ?? '–';
    document.getElementById('nutr-salt').textContent = n.salt_100g ?? '–';

    const ingredients = p.ingredients_text || '';
    document.getElementById('ingredients').textContent = ingredients || '–';
    document.getElementById('quantity').textContent = p.quantity || '–';
    document.getElementById('categories').textContent = p.categories || '–';

    // Allergens
    const allergens = p.allergens || (p.allergens_tags?.join(', ') || '');
    if (allergens.trim()) {
      document.getElementById('allergens').textContent = allergens.replace(/_/g, ' ');
    } else {
      document.getElementById('allergens-container').style.display = 'none';
    }

    // Hide sections with no content
    ['quantity', 'categories', 'ingredients'].forEach(id => {
      const el = document.getElementById(id);
      if (!el.textContent || el.textContent.trim() === '–') {
        el.parentElement.style.display = 'none';
      }
    });

    // Ingredient Score & Rating
    const score = calculateIngredientScore(ingredients);
    const ratingContainer = document.getElementById('rating-score');
    ratingContainer.innerHTML = `
      <strong>Rating:</strong> ${score.toFixed(1)} / 5
      <p class="rating-note">Rating based on ingredient analysis.</p>
    `;

  } catch (err) {
    console.error(err);
    document.body.innerHTML = '<p>Error loading product details.</p>';
  }
}

loadProduct();
