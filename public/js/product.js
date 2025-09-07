import { calculateIngredientScore } from './utils/score-logic.js';

// Utility Functions
function displayNutrient(value, unit = '') {
  return value !== undefined ? `${value} ${unit}` : '–';
}

function toggleEnergyCost() {
  const details = document.getElementById('energy-cost-details');
  details.classList.toggle('hidden');
}

function showNoRating() {
  const ratingContainer = document.getElementById('rating-score');
  ratingContainer.innerHTML = `<strong>Rating:</strong> N/A`;
  ratingContainer.classList.remove('rating-red', 'rating-orange', 'rating-green');
}

// Load Product Details
async function loadProduct() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const identifier = localStorage.getItem('identifier'); // User email/phone

  if (!code) {
    document.body.innerHTML = '<p>Product code missing.</p>';
    return;
  }

  const productNameEl = document.getElementById('product-name');
  productNameEl.textContent = 'Loading…';

  try {
    const res = await fetch(`/api/product/${code}?identifier=${encodeURIComponent(identifier || '')}`);
    const json = await res.json();

    if (!json.product) {
      document.body.innerHTML = '<p>Product not found.</p>';
      return;
    }

    const p = json.product;
    const ratingContainer = document.getElementById('rating-score');

    // Basic info
    document.getElementById('product-img').src = p.image_front_url || 'https://via.placeholder.com/200';
    productNameEl.textContent = p.product_name || 'Unnamed';
    document.getElementById('product-brand').textContent = p.brands || 'Unknown brand';

    // Nutritional info
    const n = p.nutriments || {};
    const kcal = n['energy-kcal_100g'] ?? n['energy_100g'];
    document.getElementById('nutr-energy').textContent = displayNutrient(kcal, 'kcal');
    document.getElementById('nutr-fat').textContent = displayNutrient(n.fat_100g, 'g');
    document.getElementById('nutr-sugars').textContent = displayNutrient(n.sugars_100g, 'g');
    document.getElementById('nutr-salt').textContent = displayNutrient(n.salt_100g, 'g');

    const nutrNoteEl = document.getElementById('nutr-note');
    const nutrValues = ['energy-kcal_100g', 'energy_100g', 'fat_100g', 'sugars_100g', 'salt_100g'];
    const hasAnyNutrition = nutrValues.some(key => n[key] !== undefined);

    // Ingredients & metadata
    const ingredients = p.ingredients_text || '';
    if (!ingredients.trim() || (!hasAnyNutrition && !ingredients.trim())) {
      nutrNoteEl.textContent = 'N/A – Insufficient nutritional data or missing ingredient info.';
    }

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

    // Ingredient Rating (Safety-first)
    if (!ingredients.trim()) {
      showNoRating();
    } else {
      let score = calculateIngredientScore(ingredients, n);

      // Minimum floor rating
      if (score < 1.0) score = 0.5;

      ratingContainer.classList.remove('rating-red', 'rating-orange', 'rating-green');
      const infoIcon = `<i id="low-rating-toggle" class="fas fa-info-circle rating-info-icon" title="Why this rating?"></i>`;

      if (score < 2.0) {
        ratingContainer.classList.add('rating-red');
      } else if (score < 3.5) {
        ratingContainer.classList.add('rating-orange');
      } else {
        ratingContainer.classList.add('rating-green');
      }

      ratingContainer.innerHTML = `
        <strong>Rating:</strong> ${score.toFixed(1)} / 5
        ${score < 3.0 ? infoIcon : ''}
        <p class="rating-note">Rating based on ingredient safety.</p>
      `;

      if (score < 3.0) {
        document.getElementById('low-rating-msg').classList.add('hidden');
        setTimeout(() => {
          const toggle = document.getElementById('low-rating-toggle');
          toggle?.addEventListener('click', () => {
            document.getElementById('low-rating-msg').classList.toggle('hidden');
          });
        }, 0);
      }
    }

    // User Preference Warnings
    const warningContainer = document.getElementById('preference-warning');
    if (json.warnings && json.warnings.length > 0) {
      warningContainer.innerHTML = `
        <div class="warning-box">
          <strong>Warning:</strong> This product contains ingredients you're sensitive to: 
          <span class="warning-list">${json.warnings.join(', ')}</span>
        </div>
      `;
    } else {
      warningContainer.innerHTML = '';
    }

    // Energy Cost Calculation
    const energyCostContainer = document.getElementById('energy-cost');

    if (!kcal) {
      energyCostContainer.style.display = 'none';
    } else {
      const weight = 70; // kg
      const met = { walk: 3.5, cycle: 7, run: 9.8 };
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

// Event listeners
document.getElementById('burn-toggle')?.addEventListener('click', toggleEnergyCost);

// Load product on page ready
loadProduct();
