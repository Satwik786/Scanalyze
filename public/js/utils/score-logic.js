const WEIGHTS = {
  nutrition: 45,
  ingredients: 25,
  additives: 15,
  processing: 15
};

const SCORE_BANDS = [
  { min: 85, label: 'Excellent' },
  { min: 70, label: 'Good' },
  { min: 50, label: 'Fair' },
  { min: 30, label: 'Poor' },
  { min: 0, label: 'Very Poor' }
];

const NUTRISCORE_MAP = {
  a: 100,
  b: 80,
  c: 60,
  d: 40,
  e: 20
};

function isValidNumber(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeText(value) {
  if (typeof value !== 'string') return '';

  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  return tags
    .filter(tag => typeof tag === 'string')
    .map(tag =>
      tag
        .toLowerCase()
        .replace(/^en:/, '')
        .replace(/[_-]+/g, ' ')
        .trim()
    )
    .filter(Boolean);
}

function getRatingLabel(score) {
  const band = SCORE_BANDS.find(item => score >= item.min);
  return band?.label || 'Very Poor';
}

function getConfidence(availableFactors, dataQuality, errors) {
  const factorCount = availableFactors.length;

  if (errors.length > 0) {
    return factorCount >= 3 ? 'medium' : 'low';
  }

  if (
    factorCount === 4 &&
    dataQuality.length === 0
  ) {
    return 'high';
  }

  if (factorCount >= 3) {
    return 'medium';
  }

  if (factorCount >= 2) {
    return 'low';
  }

  return 'unavailable';
}

function getNutrientValue(nutriments, keys) {
  for (const key of keys) {
    const value = nutriments?.[key];

    if (isValidNumber(value)) {
      return {
        value,
        key
      };
    }
  }

  return null;
}

function getEnergyKcal(nutriments) {
  const kcal = getNutrientValue(nutriments, [
    'energy-kcal_100g',
    'energy-kcal_100ml'
  ]);

  if (kcal) {
    return {
      value: kcal.value,
      source: kcal.key
    };
  }

  const kj = getNutrientValue(nutriments, [
    'energy_100g',
    'energy_100ml'
  ]);

  if (kj) {
    return {
      value: kj.value / 4.184,
      source: `${kj.key} converted from kJ`
    };
  }

  return null;
}

function scoreEnergy(value) {
  if (value <= 100) return 100;
  if (value <= 150) return 90;
  if (value <= 250) return 75;
  if (value <= 350) return 60;
  if (value <= 500) return 40;
  if (value <= 650) return 20;

  return 0;
}

function scoreSugars(value) {
  if (value <= 1) return 100;
  if (value <= 5) return 90;
  if (value <= 10) return 75;
  if (value <= 15) return 60;
  if (value <= 22.5) return 40;
  if (value <= 30) return 20;

  return 0;
}

function scoreSaturatedFat(value) {
  if (value <= 1) return 100;
  if (value <= 2) return 90;
  if (value <= 5) return 70;
  if (value <= 10) return 40;

  return 0;
}

function scoreSalt(value) {
  if (value <= 0.2) return 100;
  if (value <= 0.5) return 90;
  if (value <= 1) return 75;
  if (value <= 1.5) return 55;
  if (value <= 2) return 30;

  return 0;
}

function scoreProtein(value) {
  if (value >= 10) return 100;
  if (value >= 5) return 80;
  if (value >= 3) return 65;
  if (value >= 1) return 55;
  if (value > 0) return 50;

  return 50;
}

function scoreFiber(value) {
  if (value >= 6) return 100;
  if (value >= 3) return 80;
  if (value >= 1.5) return 60;
  if (value > 0) return 50;

  return 50;
}

function getNutriScoreValue(product) {
  const grade =
    normalizeText(product?.nutrition_grades);

  if (NUTRISCORE_MAP[grade] !== undefined) {
    return {
      grade,
      score: NUTRISCORE_MAP[grade]
    };
  }

  const gradeFromData =
    normalizeText(product?.nutriscore_data?.grade);

  if (NUTRISCORE_MAP[gradeFromData] !== undefined) {
    return {
      grade: gradeFromData,
      score: NUTRISCORE_MAP[gradeFromData]
    };
  }

  return null;
}

function calculateNutritionScore(product, dataQuality, errors) {
  const nutriments = product?.nutriments;

  if (!nutriments || typeof nutriments !== 'object') {
    return null;
  }

  const components = [];

  const energy = getEnergyKcal(nutriments);

  if (energy) {
    components.push({
      name: 'Energy',
      score: scoreEnergy(energy.value),
      weight: 15,
      reason:
        energy.value <= 100
          ? 'Low energy density'
          : energy.value <= 250
            ? 'Moderate energy density'
            : 'High energy density'
    });
  }

  const sugars = getNutrientValue(nutriments, [
    'sugars_100g',
    'sugars_100ml'
  ]);

  if (sugars) {
    components.push({
      name: 'Sugars',
      score: scoreSugars(sugars.value),
      weight: 25,
      reason:
        sugars.value <= 5
          ? 'Low sugar content'
          : sugars.value <= 15
            ? 'Moderate sugar content'
            : 'High sugar content'
    });
  }

  const saturatedFat = getNutrientValue(nutriments, [
    'saturated-fat_100g',
    'saturated-fat_100ml'
  ]);

  if (saturatedFat) {
    components.push({
      name: 'Saturated fat',
      score: scoreSaturatedFat(saturatedFat.value),
      weight: 20,
      reason:
        saturatedFat.value <= 2
          ? 'Low saturated fat'
          : saturatedFat.value <= 5
            ? 'Moderate saturated fat'
            : 'High saturated fat'
    });
  }

  const salt = getNutrientValue(nutriments, [
    'salt_100g',
    'salt_100ml'
  ]);

  if (salt) {
    components.push({
      name: 'Salt',
      score: scoreSalt(salt.value),
      weight: 20,
      reason:
        salt.value <= 0.5
          ? 'Low salt content'
          : salt.value <= 1.5
            ? 'Moderate salt content'
            : 'High salt content'
    });
  }

  const protein = getNutrientValue(nutriments, [
    'proteins_100g',
    'proteins_100ml'
  ]);

  if (protein) {
    components.push({
      name: 'Protein',
      score: scoreProtein(protein.value),
      weight: 10,
      reason:
        protein.value >= 5
          ? 'Good protein contribution'
          : protein.value > 0
            ? 'Some protein present'
            : 'Little protein contribution'
    });
  }

  const fiber = getNutrientValue(nutriments, [
    'fiber_100g',
    'fiber_100ml'
  ]);

  if (fiber) {
    components.push({
      name: 'Fibre',
      score: scoreFiber(fiber.value),
      weight: 10,
      reason:
        fiber.value >= 3
          ? 'Good fibre contribution'
          : fiber.value > 0
            ? 'Some fibre present'
            : 'Little fibre contribution'
    });
  }

  if (components.length === 0) {
    errors.push({
      code: 'NUTRITION_DATA_UNAVAILABLE',
      message: 'No usable nutrition values were available.'
    });

    return null;
  }

  const totalWeight = components.reduce(
    (sum, component) => sum + component.weight,
    0
  );

  const nutrientScore =
    components.reduce(
      (sum, component) =>
        sum + component.score * component.weight,
      0
    ) / totalWeight;

  let score = nutrientScore;
  const nutriScore = getNutriScoreValue(product);

  if (nutriScore) {
    score =
      (nutrientScore * 0.6) +
      (nutriScore.score * 0.4);

    dataQuality.push({
      code: 'NUTRISCORE_USED',
      message: `Nutri-Score grade ${nutriScore.grade.toUpperCase()} was used as a supporting nutrition signal.`
    });
  }

  const reasons = components
    .filter(component =>
      component.score <= 60 ||
      component.score >= 90
    )
    .map(component => component.reason);

  if (nutriScore) {
    reasons.push(
      `Nutri-Score: ${nutriScore.grade.toUpperCase()}`
    );
  }

  return {
    score: round(clamp(score)),
    weight: WEIGHTS.nutrition,
    reasons: [...new Set(reasons)],
    details: components.map(component => ({
      name: component.name,
      score: component.score
    }))
  };
}

const WHOLE_FOOD_TAGS = new Set([
  'whole grain',
  'whole wheat',
  'oat',
  'oats',
  'quinoa',
  'lentil',
  'chickpea',
  'bean',
  'brown rice',
  'vegetable',
  'fruit',
  'nut',
  'seed'
]);

const INGREDIENT_CONCERN_RULES = [
  {
    terms: [
      'high fructose corn syrup',
      'corn syrup',
      'glucose syrup',
      'invert syrup'
    ],
    penalty: 18,
    reason: 'Concentrated sugar or syrup detected'
  },
  {
    terms: [
      'partially hydrogenated oil',
      'partially hydrogenated fat',
      'hydrogenated oil',
      'hydrogenated fat'
    ],
    penalty: 25,
    reason: 'Hydrogenated fat detected'
  },
  {
    terms: [
      'maltodextrin'
    ],
    penalty: 6,
    reason: 'Highly refined carbohydrate ingredient detected'
  }
];

function calculateIngredientComplexityPenalty(
  ingredientCount
) {
  if (!Number.isFinite(ingredientCount)) {
    return 0;
  }

  if (ingredientCount <= 8) {
    return 0;
  }

  if (ingredientCount <= 12) {
    return 3;
  }

  if (ingredientCount <= 18) {
    return 6;
  }

  if (ingredientCount <= 25) {
    return 10;
  }

  return 14;
}

function calculateIngredientsScore(product) {
  const rawText = normalizeText(product?.ingredients_text);
  const tags = normalizeTags(product?.ingredients_tags);

  if (!rawText && tags.length === 0) return null;

  let score = 100;
  const reasons = [];

  const wholeFoodMatches = [
    ...new Set(tags.filter(tag => WHOLE_FOOD_TAGS.has(tag)))
  ];

  for (const rule of INGREDIENT_CONCERN_RULES) {
    const found = rule.terms.some(term => rawText.includes(term));

    if (found) {
      score -= rule.penalty;
      reasons.push(rule.reason);
    }
  }

  const complexityPenalty = calculateIngredientComplexityPenalty(tags.length);

  if (complexityPenalty > 0) {
    score -= complexityPenalty;

    if (tags.length > 18) {
      reasons.push("Long ingredient list");
    } else {
      reasons.push("Moderately complex ingredient list");
    }
  }

  const hasArtificialFlavouring =
    rawText.includes("artificial flavor") ||
    rawText.includes("artificial flavour") ||
    rawText.includes("mature-identical");

  if (hasArtificialFlavouring) {
    score -= 5;
    reasons.push("Artificial or flavouring ingredients identified");
  }

  const hasVeryLimitedWholeFoods =
    tags.length >= 8 && wholeFoodMatches.length === 0;

  if (hasVeryLimitedWholeFoods) {
    score -= 5;
    reasons.push("Limited recognizable whole-food ingredients");
  }

  if (reasons.length === 0) {
    if (wholeFoodMatches.length > 0) {
      reasons.push(
        `Contains ${wholeFoodMatches.slice(0, 3).join(", ")}`
      );
    } else {
      reasons.push("No major ingredient-quality concerns detected");
    }
  }

  return {
    score: round(clamp(score)),
    weight: WEIGHTS.ingredients,
    reasons: [...new Set(reasons)],
    details: {
      ingredientTagCount: tags.length,
      wholeFoodMatches,
      complexityPenalty,
      artificialFlavouring: hasArtificialFlavouring,
      limitedWholeFoods: hasVeryLimitedWholeFoods
    }
  };
}

const ADDITIVE_CATEGORIES = {
  preservatives: [
    'preservative',
    'e200',
    'e201',
    'e202',
    'e203',
    'e210',
    'e211',
    'e212',
    'e213',
    'e214',
    'e215',
    'e216',
    'e217',
    'e218',
    'e219'
  ],

  sweeteners: [
    'sweetener',
    'e950',
    'e951',
    'e952',
    'e954',
    'e955',
    'e956',
    'e957',
    'e959',
    'e960',
    'e961',
    'e962',
    'e964',
    'e965',
    'e966',
    'e967',
    'e968',
    'e969'
  ],

  colours: [
    'colour',
    'color',
    'colouring',
    'coloring'
  ],

  emulsifiers: [
    'emulsifier'
  ],

  acidityRegulators: [
    'acidity regulator'
  ],

  stabilizers: [
    'stabilizer',
    'stabiliser'
  ],

  antioxidants: [
    'antioxidant'
  ],

  raisingAgents: [
    'raising agent'
  ]
};

function getAdditiveCategory(tag) {
  const normalized = normalizeText(tag);

  for (const [
    category,
    terms
  ] of Object.entries(ADDITIVE_CATEGORIES)) {
    if (
      terms.some(term =>
        normalized === term ||
        normalized.includes(term)
      )
    ) {
      return category;
    }
  }

  if (
    /^e\d{3,4}[a-z]?$/i.test(normalized)
  ) {
    return 'other';
  }

  return null;
}

function calculateAdditivesScore(product) {
  const ingredientTags = normalizeTags(
    product?.ingredients_tags
  );

  const explicitAdditiveTags = Array.isArray(
    product?.additives_tags
  )
    ? normalizeTags(product.additives_tags)
    : [];

  const sourceTags = [
    ...new Set([
      ...ingredientTags,
      ...explicitAdditiveTags
    ])
  ];

  if (
    sourceTags.length === 0 &&
    !product?.ingredients_text
  ) {
    return null;
  }

  const categorized = [];

  for (const tag of sourceTags) {
    const category = getAdditiveCategory(tag);

    if (category) {
      categorized.push({
        tag,
        category
      });
    }
  }

  const uniqueAdditives = [
    ...new Map(
      categorized.map(item => [
        `${item.category}:${item.tag}`,
        item
      ])
    ).values()
  ];

  if (uniqueAdditives.length === 0) {
    return {
      score: 100,
      weight: WEIGHTS.additives,

      reasons: [
        'No structured additives were identified'
      ],

      details: {
        count: 0,
        additives: [],
        categories: {}
      }
    };
  }

  const categories = {};

  for (const additive of uniqueAdditives) {
    if (!categories[additive.category]) {
      categories[additive.category] = [];
    }

    categories[additive.category].push(
      additive.tag
    );
  }

  const additiveCount =
    uniqueAdditives.length;

  let score = 100;

  if (additiveCount <= 2) {
    score -= 5;
  } else if (additiveCount <= 4) {
    score -= 15;
  } else if (additiveCount <= 7) {
    score -= 25;
  } else if (additiveCount <= 10) {
    score -= 35;
  } else {
    score -= 45;
  }

  const reasons = [];

  if (additiveCount === 1) {
    reasons.push(
      'One additive identified'
    );
  } else {
    reasons.push(
      `${additiveCount} additives identified`
    );
  }

  if (categories.preservatives?.length) {
    reasons.push(
      `${categories.preservatives.length} preservative${
        categories.preservatives.length > 1
          ? 's'
          : ''
      } identified`
    );
  }

  if (categories.sweeteners?.length) {
    reasons.push(
      `${categories.sweeteners.length} sweetener${
        categories.sweeteners.length > 1
          ? 's'
          : ''
      } identified`
    );
  }

  if (categories.colours?.length) {
    reasons.push(
      'Colouring agents identified'
    );
  }

  if (categories.emulsifiers?.length) {
    reasons.push(
      'Emulsifiers identified'
    );
  }

  if (categories.acidityRegulators?.length) {
    reasons.push(
      'Acidity regulators identified'
    );
  }

  if (categories.stabilizers?.length) {
    reasons.push(
      'Stabilizers identified'
    );
  }

  if (categories.antioxidants?.length) {
    reasons.push(
      'Antioxidants identified'
    );
  }

  if (categories.raisingAgents?.length) {
    reasons.push(
      'Raising agents identified'
    );
  }

  return {
    score: round(clamp(score)),
    weight: WEIGHTS.additives,

    reasons: [
      ...new Set(reasons)
    ],

    details: {
      count: additiveCount,
      additives: uniqueAdditives,
      categories
    }
  };
}

function calculateProcessingScore(product) {
  const nova = Number(product?.nova_group);

  if (!Number.isFinite(nova)) {
    return null;
  }

  if (![1, 2, 3, 4].includes(nova)) {
    return null;
  }

  const scores = {
    1: 100,
    2: 85,
    3: 65,
    4: 35
  };

  const descriptions = {
    1: 'Minimally or unprocessed',
    2: 'Processed culinary ingredient',
    3: 'Processed food',
    4: 'Ultra-processed food'
  };

  return {
    score: scores[nova],
    weight: WEIGHTS.processing,
    reasons: [
      descriptions[nova]
    ],
    details: {
      novaGroup: nova
    }
  };
}

function calculateAllergens(product, userAllergens = []) {
  const productHasAllergenField =
    Array.isArray(product?.allergens_tags);

  const detected = normalizeTags(
    product?.allergens_tags
  );

  const normalizedUserAllergens =
    Array.isArray(userAllergens)
      ? userAllergens
          .filter(item => typeof item === 'string')
          .map(normalizeText)
          .filter(Boolean)
      : [];

  const personalMatches =
    normalizedUserAllergens.filter(userAllergen =>
      detected.some(productAllergen =>
        productAllergen === userAllergen ||
        productAllergen.includes(userAllergen) ||
        userAllergen.includes(productAllergen)
      )
    );

  let status = 'none_reported';

  if (!productHasAllergenField) {
    status = 'unknown';
  } else if (detected.length > 0) {
    status =
      personalMatches.length > 0
        ? 'personal_match'
        : 'reported';
  }

  return {
    status,
    detected,
    personalMatches: [
      ...new Set(personalMatches)
    ]
  };
}

function calculateOverallScore(factors) {
  const available =
    Object.entries(factors)
      .filter(([, factor]) => factor !== null);

  if (available.length === 0) {
    return null;
  }

  const availableWeight =
    available.reduce(
      (sum, [, factor]) => sum + factor.weight,
      0
    );

  const score =
    available.reduce(
      (sum, [, factor]) =>
        sum + factor.score * factor.weight,
      0
    ) / availableWeight;

  return round(clamp(score));
}

function collectWarnings(product, dataQuality) {
  const warnings = [];
  const nutriments = product?.nutriments;

  if (nutriments && typeof nutriments === 'object') {
    const caffeine =
      nutriments.caffeine_100g;

    if (
      isValidNumber(caffeine) &&
      caffeine > 0
    ) {
      warnings.push({
        code: 'CAFFEINE_PRESENT',
        message: 'Caffeine is present in this product.'
      });
    }

    const caffeineUnit =
      nutriments.caffeine_unit;

    if (
      caffeine !== undefined &&
      typeof caffeineUnit === 'string' &&
      caffeineUnit.toLowerCase() === 'g' &&
      caffeine >= 10
    ) {
      dataQuality.push({
        code: 'CAFFEINE_UNIT_INCONSISTENCY',
        message:
          'Caffeine unit information appears inconsistent with the reported value.'
      });
    }
  }

  if (
    product?.nutrition_data === 'off' ||
    product?.nutrition_data === 'no'
  ) {
    dataQuality.push({
      code: 'NUTRITION_TABLE_UNAVAILABLE',
      message: 'The nutrition table is unavailable.'
    });
  }

  if (
    Number(product?.nova_group) === 4
  ) {
    warnings.push({
      code: 'HIGH_PROCESSING',
      message:
        'This product is classified as ultra-processed.'
    });
  }

  return warnings;
}

function validateProductData(product, dataQuality) {
  const nutriments = product?.nutriments;

  if (!nutriments || typeof nutriments !== 'object') {
    return;
  }

  const fieldsToCheck = [
    'energy-kcal_100g',
    'energy_100g',
    'fat_100g',
    'sugars_100g',
    'saturated-fat_100g',
    'salt_100g',
    'proteins_100g',
    'fiber_100g'
  ];

  for (const field of fieldsToCheck) {
    if (nutriments[field] === undefined) {
      continue;
    }

    const value = Number(nutriments[field]);

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      dataQuality.push({
        code: 'INVALID_NUTRIENT_VALUE',
        message:
          `The nutrition value for ${field} is invalid.`
      });
    }
  }
}

export function calculateProductRating(
  product,
  options = {}
) {
  const warnings = [];
  const errors = [];
  const dataQuality = [];

  if (!product || typeof product !== 'object') {
    return {
      status: 'error',
      score: null,
      rating: 'Unavailable',
      confidence: 'unavailable',

      factors: {
        nutrition: null,
        ingredients: null,
        additives: null,
        processing: null
      },

      allergens: {
        status: 'unknown',
        detected: [],
        personalMatches: []
      },

      warnings: [],
      dataQuality: [],

      errors: [
        {
          code: 'INVALID_PRODUCT',
          message:
            'A valid product object is required.'
        }
      ]
    };
  }

  validateProductData(
    product,
    dataQuality
  );

  const factors = {
    nutrition: calculateNutritionScore(
      product,
      dataQuality,
      errors
    ),

    ingredients:
      calculateIngredientsScore(product),

    additives:
      calculateAdditivesScore(product),

    processing:
      calculateProcessingScore(product)
  };

  const availableFactors =
    Object.values(factors).filter(Boolean);

  if (availableFactors.length === 0) {
    errors.push({
      code: 'INSUFFICIENT_DATA',
      message:
        'There is not enough product data to calculate a meaningful rating.'
    });
  }

  warnings.push(
    ...collectWarnings(
      product,
      dataQuality
    )
  );

  const score =
    calculateOverallScore(factors);

  const status =
    score === null
      ? 'insufficient_data'
      : 'complete';

  const confidence =
    getConfidence(
      availableFactors,
      dataQuality,
      errors
    );

  return {
    status,
    score,

    rating:
      score === null
        ? 'Unavailable'
        : getRatingLabel(score),

    confidence,

    factors,

    allergens:
      calculateAllergens(
        product,
        options.userAllergens
      ),

    warnings: [
      ...new Map(
        warnings.map(item => [
          item.code,
          item
        ])
      ).values()
    ],

    dataQuality: [
      ...new Map(
        dataQuality.map(item => [
          item.code,
          item
        ])
      ).values()
    ],

    errors: [
      ...new Map(
        errors.map(item => [
          item.code,
          item
        ])
      ).values()
    ]
  };
}

/*
 * Temporary backward compatibility.
 * This can be removed after all callers migrate
 * to calculateProductRating().
 */
export function calculateIngredientScore(
  ingredientsText,
  nutriments = {}
) {
  const result =
    calculateProductRating({
      ingredients_text: ingredientsText,
      nutriments,
      ingredients_tags: [],
      allergens_tags: []
    });

  if (result.score === null) {
    return 0.5;
  }

  return Math.max(
    0.5,
    Math.min(
      5,
      result.score / 20
    )
  );
}