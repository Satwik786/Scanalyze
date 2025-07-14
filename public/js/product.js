function calculateIngredientScore(ingredientsText) {
  if (!ingredientsText || ingredientsText.trim() === '') return 1.0;

  const text = ingredientsText.toLowerCase();
  let score = 5.0;

  const healthy = ['oat', 'quinoa', 'whole grain', 'lentil', 'fruit', 'vegetable'];
  const harmful = ['preservative', 'color', 'colour', 'flavouring', 'flavor', 'emulsifier', 'sweetener', '\\be\\d+\\b'];
  const redFlags = ['sugar', 'salt', 'palm oil', 'flavour enhancer', 'msg', 'monosodium glutamate'];

  healthy.forEach(h => {
    if (text.includes(h)) score += 0.2;
  });

  redFlags.forEach(f => {
    if (text.includes(f)) score -= 1.0;
  });

  harmful.forEach(word => {
    const regex = new RegExp(`\\b${word}\\w*\\b`, 'gi');
    const matches = text.match(regex) || [];
    score -= 0.5 * matches.length;
  });

  const separators = (ingredientsText.match(/[,;]/g) || []).length;
  if (separators > 7) score -= 0.5;

  return Math.max(0.5, Math.min(score, 5.0));
}

function displayNutrient(value, unit = '') {
  return value !== undefined ? `${value} ${unit}` : '–';
}

function toggleEnergyCost() {
  const details = document.getElementById('energy-cost-details');
  details.classList.toggle('hidden');
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
    const kcal = n['energy-kcal_100g'] ?? n['energy_100g'];

    document.getElementById('nutr-energy').textContent = displayNutrient(kcal, 'kcal');
    document.getElementById('nutr-fat').textContent = displayNutrient(n.fat_100g, 'g');
    document.getElementById('nutr-sugars').textContent = displayNutrient(n.sugars_100g, 'g');
    document.getElementById('nutr-salt').textContent = displayNutrient(n.salt_100g, 'g');

    const nutrNoteEl = document.getElementById('nutr-note');
    const nutrValues = ['energy-kcal_100g', 'energy_100g', 'fat_100g', 'sugars_100g', 'salt_100g'];
    const hasAnyNutrition = nutrValues.some(key => n[key] !== undefined);
    if (!hasAnyNutrition) {
      nutrNoteEl.textContent = 'Nutritional data is unavailable for this product.';
    }

    const ingredients = p.ingredients_text || '';
    const ratingContainer = document.getElementById('rating-score');

    document.getElementById('ingredients').textContent = ingredients || '–';
    document.getElementById('quantity').textContent = p.quantity || '–';
    document.getElementById('categories').textContent = p.categories || '–';

    const allergens = p.allergens || (p.allergens_tags?.join(', ') || '');
    if (allergens.trim()) {
      document.getElementById('allergens').textContent = allergens.replace(/_/g, ' ');
    } else {
      document.getElementById('allergens-container').style.display = 'none';
    }

    ['quantity', 'categories', 'ingredients'].forEach(id => {
      const el = document.getElementById(id);
      if (!el.textContent || el.textContent.trim() === '–') {
        el.parentElement.style.display = 'none';
      }
    });

    // Ingredient Rating
    if (!ingredients.trim()) {
      ratingContainer.style.display = 'none';
    } else {
      const score = calculateIngredientScore(ingredients);
      ratingContainer.classList.remove('rating-red', 'rating-orange', 'rating-green');

      if (score < 2.0) {
        ratingContainer.classList.add('rating-red');
      } else if (score < 3.5) {
        ratingContainer.classList.add('rating-orange');
      } else {
        ratingContainer.classList.add('rating-green');
      }

      ratingContainer.innerHTML = `
        <strong>Rating:</strong> ${score.toFixed(1)} / 5
        <p class="rating-note">Rating based on ingredient analysis.</p>
      `;
    }

    // 🔥 Energy Cost
    const energyCostContainer = document.getElementById('energy-cost');
    const energyDetails = document.getElementById('energy-cost-details');

    if (!kcal) {
      energyCostContainer.style.display = 'none';
    } else {
      const weight = 70; // kg
      const met = {
        walk: 3.5,
        cycle: 7,
        run: 9.8
      };

      function calcBurnTime(metValue) {
        return Math.round((kcal * 60) / (metValue * weight));
      }

      document.getElementById('burn-walk').textContent = `${calcBurnTime(met.walk)} min`;
      document.getElementById('burn-cycle').textContent = `${calcBurnTime(met.cycle)} min`;
      document.getElementById('burn-run').textContent = `${calcBurnTime(met.run)} min`;
    }

  } catch (err) {
    console.error(err);
    document.body.innerHTML = '<p>Error loading product details.</p>';
  }
}

// Register event listener for energy toggle
document.getElementById('burn-toggle')?.addEventListener('click', toggleEnergyCost);

// Load product on page load
loadProduct();
