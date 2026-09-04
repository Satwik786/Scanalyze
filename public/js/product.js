import { calculateProductRating } from './utils/score-logic.js';
import { getUserAllergens } from './utils/allergens.js';

function displayNutrient(value, unit = '') {
  return value !== undefined && value !== null && Number.isFinite(Number(value))
    ? `${value} ${unit}`
    : '–';
}

function toggleEnergyCost() {
  const details = document.getElementById('energy-cost-details');

  if (details) {
    details.classList.toggle('hidden');
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeAllergen(value) {
  if (typeof value !== 'string') return '';

  return value
    .toLowerCase()
    .replace(/^en:/, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function getEnergyKcal(nutriments = {}) {
  const kcal =
    Number(nutriments['energy-kcal_100g']);

  if (Number.isFinite(kcal) && kcal >= 0) {
    return kcal;
  }

  const kcalMl =
    Number(nutriments['energy-kcal_100ml']);

  if (Number.isFinite(kcalMl) && kcalMl >= 0) {
    return kcalMl;
  }

  const kj =
    Number(nutriments['energy_100g']);

  if (Number.isFinite(kj) && kj >= 0) {
    return kj / 4.184;
  }

  const kjMl =
    Number(nutriments['energy_100ml']);

  if (Number.isFinite(kjMl) && kjMl >= 0) {
    return kjMl / 4.184;
  }

  return null;
}

function getFactorLabel(name) {
  const labels = {
    nutrition: 'Nutrition',
    ingredients: 'Ingredients',
    additives: 'Additives',
    processing: 'Processing'
  };

  return labels[name] || name;
}

function getScoreClass(score) {
  if (score === null || score === undefined) {
    return '';
  }

  if (score >= 70) return 'rating-green';
  if (score >= 50) return 'rating-orange';

  return 'rating-red';
}

function renderRating(result) {
  const ratingContainer = document.getElementById('rating-score');

  if (!ratingContainer) {
    return;
  }

  ratingContainer.classList.remove(
    'rating-red',
    'rating-orange',
    'rating-green'
  );

  if (result.score === null) {
    ratingContainer.innerHTML = `
      <strong>Rating:</strong> N/A
      <p class="rating-note">
        There is not enough reliable product information to calculate a rating.
      </p>
    `;

    return;
  }

  ratingContainer.classList.add(getScoreClass(result.score));

  const factorEntries = Object.entries(result.factors)
    .filter(([, factor]) => factor !== null);

  const factorHtml = factorEntries
    .map(([name, factor]) => {
      const reasons = factor.reasons?.length
        ? `
          <ul class="rating-factor-reasons">
            ${factor.reasons
              .map(reason => `<li>${escapeHtml(reason)}</li>`)
              .join('')}
          </ul>
        `
        : '';

      return `
        <div class="rating-factor">
          <div class="rating-factor-header">
            <span>
              <strong>${getFactorLabel(name)}</strong>
            </span>
            <span>${factor.score}/100</span>
          </div>

          ${reasons}
        </div>
      `;
    })
    .join('');

  const warningHtml = result.warnings?.length
    ? `
      <div class="rating-warnings">
        <strong>Warnings</strong>
        <ul>
          ${result.warnings
            .map(warning => `<li>${escapeHtml(warning.message)}</li>`)
            .join('')}
        </ul>
      </div>
    `
    : '';

  const errorHtml = result.errors?.length
    ? `
      <div class="rating-errors">
        <strong>Rating issues</strong>
        <ul>
          ${result.errors
            .map(error => `<li>${escapeHtml(error.message)}</li>`)
            .join('')}
        </ul>
      </div>
    `
    : '';

  ratingContainer.innerHTML = `
    <div class="rating-overall">
      <div>
        <strong>Scanalyze Score</strong>
        <div class="rating-score-number">
          ${result.score}<span>/100</span>
        </div>
      </div>

      <div class="rating-summary">
        <strong>${escapeHtml(result.rating)}</strong>
        <span>
          Confidence: ${escapeHtml(result.confidence)}
        </span>
      </div>
    </div>

    <div class="rating-factors">
      ${factorHtml}
    </div>

    ${warningHtml}
    ${errorHtml}
  `;
}

function renderAllergens(product, userAllergens) {
  const allergensContainer =
    document.getElementById('allergens-container');

  if (!allergensContainer) {
    return;
  }

  const productAllergens = Array.isArray(product.allergens_tags)
    ? product.allergens_tags
        .filter(item => typeof item === 'string')
        .map(normalizeAllergen)
        .filter(Boolean)
    : [];

  const normalizedUserAllergens = Array.isArray(userAllergens)
    ? userAllergens
        .filter(item => typeof item === 'string')
        .map(normalizeAllergen)
        .filter(Boolean)
    : [];

  const matchedAllergens = normalizedUserAllergens.filter(userAllergen =>
    productAllergens.some(productAllergen =>
      productAllergen === userAllergen ||
      productAllergen.includes(userAllergen) ||
      userAllergen.includes(productAllergen)
    )
  );

  if (productAllergens.length === 0) {
    allergensContainer.innerHTML = `
      <p><strong>Allergens:</strong> None reported</p>
    `;

    return;
  }

  if (matchedAllergens.length > 0) {
    allergensContainer.innerHTML = `
      <p>
        ⚠️ <strong>Personal allergen match:</strong>
        ${matchedAllergens
          .map(escapeHtml)
          .join(', ')}
      </p>

      <p>
        <strong>Reported allergens:</strong>
        ${productAllergens
          .map(escapeHtml)
          .join(', ')}
      </p>
    `;

    return;
  }

  allergensContainer.innerHTML = `
    <p>
      <strong>Reported allergens:</strong>
      ${productAllergens
        .map(escapeHtml)
        .join(', ')}
    </p>
  `;
}

function renderIngredients(ingredients, userAllergens, productAllergens) {
  const ingredientsElement =
    document.getElementById('ingredients');

  if (!ingredientsElement) {
    return;
  }

  if (!ingredients || !ingredients.trim()) {
    ingredientsElement.textContent = '–';
    return;
  }

  let safeIngredients = escapeHtml(ingredients);

  const normalizedUserAllergens = Array.isArray(userAllergens)
    ? userAllergens
        .filter(item => typeof item === 'string')
        .map(normalizeAllergen)
        .filter(Boolean)
    : [];

  const normalizedProductAllergens = Array.isArray(productAllergens)
    ? productAllergens
        .filter(item => typeof item === 'string')
        .map(normalizeAllergen)
        .filter(Boolean)
    : [];

  const allergensToHighlight = normalizedUserAllergens.filter(
    userAllergen =>
      normalizedProductAllergens.some(productAllergen =>
        productAllergen === userAllergen ||
        productAllergen.includes(userAllergen) ||
        userAllergen.includes(productAllergen)
      )
  );

  for (const allergen of allergensToHighlight) {
    const escapedAllergen = escapeHtml(allergen);

    const regex = new RegExp(
      `\\b(${escapedAllergen.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`,
      'gi'
    );

    safeIngredients = safeIngredients.replace(
      regex,
      '<span class="allergen-highlight">$1</span>'
    );
  }

  ingredientsElement.innerHTML = safeIngredients;
}

function renderMissingMetadata() {
  ['quantity', 'categories', 'ingredients'].forEach(id => {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    if (!element.textContent || element.textContent.trim() === '–') {
      element.parentElement.style.display = 'none';
    }
  });
}

function renderEnergyCost(kcal) {
  const energyCostContainer =
    document.getElementById('energy-cost');

  if (!energyCostContainer) {
    return;
  }

  if (kcal === null || kcal === undefined || kcal <= 0) {
    energyCostContainer.style.display = 'none';
    return;
  }

  const weight = 70;

  const met = {
    walk: 3.5,
    cycle: 7,
    run: 9.8
  };

  const calcBurnTime = metValue =>
    Math.round((kcal * 60) / (metValue * weight));

  const walkElement = document.getElementById('burn-walk');
  const cycleElement = document.getElementById('burn-cycle');
  const runElement = document.getElementById('burn-run');

  if (walkElement) {
    walkElement.textContent = `${calcBurnTime(met.walk)} min`;
  }

  if (cycleElement) {
    cycleElement.textContent = `${calcBurnTime(met.cycle)} min`;
  }

  if (runElement) {
    runElement.textContent = `${calcBurnTime(met.run)} min`;
  }
}

async function loadUserAllergens() {
  try {
    const allergens = await getUserAllergens();

    return Array.isArray(allergens)
      ? allergens
      : [];
  } catch (error) {
    console.error('Failed to load user allergens:', error);
    return [];
  }
}

async function loadProduct() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const identifier = localStorage.getItem('userIdentifier');

  if (!code || !/^\d+$/.test(code)) {
    document.body.innerHTML = '<p>Invalid product code.</p>';
    return;
  }

  const productNameElement =
    document.getElementById('product-name');

  if (productNameElement) {
    productNameElement.textContent = 'Loading…';
  }

  try {
    const url =
      `/api/product/${encodeURIComponent(code)}` +
      `?identifier=${encodeURIComponent(identifier || '')}`;

    const response = await fetch(url);

    let json;

    try {
      json = await response.json();
    } catch {
      throw new Error('The server returned an invalid response.');
    }

    if (!response.ok) {
      throw new Error(
        json?.error ||
        `Failed to load product (${response.status}).`
      );
    }

    const product = json?.product;

    if (!product) {
      document.body.innerHTML = '<p>Product not found.</p>';
      return;
    }

    const productImage =
      document.getElementById('product-img');

    if (productImage) {
      productImage.src =
        product.image_front_url ||
        'https://via.placeholder.com/200';

      productImage.alt =
        product.product_name || 'Product image';
    }

    if (productNameElement) {
      productNameElement.textContent =
        product.product_name || 'Unnamed product';
    }

    const brandElement =
      document.getElementById('product-brand');

    if (brandElement) {
      brandElement.textContent =
        product.brands || 'Unknown brand';
    }

    const nutriments =
      product.nutriments &&
      typeof product.nutriments === 'object'
        ? product.nutriments
        : {};

    const kcal = getEnergyKcal(nutriments);

    const energyElement =
      document.getElementById('nutr-energy');

    if (energyElement) {
      energyElement.textContent =
        displayNutrient(kcal, 'kcal');
    }

    const fatElement =
      document.getElementById('nutr-fat');

    if (fatElement) {
      fatElement.textContent =
        displayNutrient(nutriments.fat_100g, 'g');
    }

    const sugarsElement =
      document.getElementById('nutr-sugars');

    if (sugarsElement) {
      sugarsElement.textContent =
        displayNutrient(nutriments.sugars_100g, 'g');
    }

    const saltElement =
      document.getElementById('nutr-salt');

    if (saltElement) {
      saltElement.textContent =
        displayNutrient(nutriments.salt_100g, 'g');
    }

    const nutritionNote =
      document.getElementById('nutr-note');

    const hasNutritionData =
      Object.keys(nutriments).some(key =>
        key.endsWith('_100g') &&
        Number.isFinite(Number(nutriments[key]))
      );

    if (nutritionNote) {
      nutritionNote.textContent = hasNutritionData
        ? ''
        : 'Some nutritional information is unavailable.';
    }

    const quantityElement =
      document.getElementById('quantity');

    if (quantityElement) {
      quantityElement.textContent =
        product.quantity || '–';
    }

    const categoriesElement =
      document.getElementById('categories');

    if (categoriesElement) {
      categoriesElement.textContent =
        Array.isArray(product.categories_tags_en)
          ? product.categories_tags_en.join(', ')
          : product.categories || '–';
    }

    const ingredients =
      typeof product.ingredients_text === 'string'
        ? product.ingredients_text.trim()
        : '';

    const productAllergens =
      Array.isArray(product.allergens_tags)
        ? product.allergens_tags
        : [];

    const userAllergens =
      await loadUserAllergens();

    renderIngredients(
      ingredients,
      userAllergens,
      productAllergens
    );

    renderAllergens(
      product,
      userAllergens
    );

    const rating = calculateProductRating(
      product,
      {
        userAllergens
      }
    );

    renderRating(rating);

    renderEnergyCost(kcal);

    renderMissingMetadata();

  } catch (error) {
    console.error('Error loading product:', error);

    document.body.innerHTML = `
      <div class="product-error">
        <h2>Unable to load product</h2>
        <p>
          ${escapeHtml(
            error?.message ||
            'Something went wrong while loading this product.'
          )}
        </p>
      </div>
    `;
  }
}

document
  .getElementById('burn-toggle')
  ?.addEventListener('click', toggleEnergyCost);

loadProduct();