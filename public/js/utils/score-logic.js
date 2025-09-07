export function calculateIngredientScore(ingredientsText, nutriments = {}) {
  if (!ingredientsText || ingredientsText.trim() === '') return 0.5;

  const text = ingredientsText.toLowerCase();
  let score = 5.0;

  const healthy = [
    'whole grain', 'oat', 'quinoa', 'lentil', 'chickpea',
    'brown rice', 'fruit', 'vegetable', 'dehydrated vegetable',
    'garlic', 'onion', 'tomato'
  ];
  healthy.forEach(h => { if (text.includes(h)) score += 0.1; });

  const redFlags = [
    '\\bsugar\\b', '\\bglucose\\b', '\\bfructose\\b', 'corn syrup',
    'palm oil', 'hydrogenated', '\\bmsg\\b', 'monosodium glutamate',
    '\\bmaltodextrin\\b', '\\bsalt\\b', 'high fructose corn syrup',
    'artificial flavor', 'artificial flavour', 'preservative', 'colour', 'color',
    'sweetener', '\\be\\d+\\b', 'emulsifier', 'additive'
  ];
  redFlags.forEach(pattern => {
    const regex = new RegExp(pattern, 'gi');
    const matches = text.match(regex) || [];
    score -= 0.8 * matches.length;
  });

  const separators = (ingredientsText.match(/[,;]/g) || []).length;
  if (separators >= 6) score -= 0.3;
  if (separators >= 10) score -= 0.3;

  if (nutriments.sugars_100g && nutriments.sugars_100g > 10) {
    score -= (nutriments.sugars_100g - 10) * 0.03;
  }
  if (nutriments.fat_100g && nutriments.fat_100g > 10) {
    score -= (nutriments.fat_100g - 10) * 0.02;
  }
  if (nutriments['saturated-fat_100g'] && nutriments['saturated-fat_100g'] > 5) {
    score -= (nutriments['saturated-fat_100g'] - 5) * 0.05;
  }
  if (nutriments.salt_100g && nutriments.salt_100g > 1) {
    score -= (nutriments.salt_100g - 1) * 0.2;
  }

  return Math.max(0.5, Math.min(score, 5.0));
}
