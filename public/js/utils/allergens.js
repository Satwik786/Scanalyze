// Fetch user allergens from backend
export async function getUserAllergens() {
  const identifier = localStorage.getItem("userIdentifier");
  if (!identifier) return [];

  try {
    const res = await fetch("/api/preferences/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.preferences || [];
  } catch (err) {
    console.error("Error fetching user allergens:", err);
    return [];
  }
}

// Filter products based on allergens
export function filterProductsByAllergens(products, allergens) {
  return products.filter(prod => {
    if (!prod.allergens_tags) return true;
    return !allergens.some(a => prod.allergens_tags.includes(a));
  });
}
