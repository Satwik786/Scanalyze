// 🔑 Import centralized auth handler
import { handleAuthRedirect } from "./auth.js";
import { clearAuthStorage } from "./auth.js"; // ✅ reuse cleanup

// 🚀 Run auth check (home requires authentication)
handleAuthRedirect(true);

// --- Personalized Welcome Message ---
const welcomeEl = document.getElementById("welcome-message");

function updateWelcome(name) {
  if (welcomeEl) {
    welcomeEl.textContent = `Welcome, ${name || "User"}!`;
  }
}

// Initially blank (avoid flash of "User")
updateWelcome("");

// Try localStorage first
const cachedName = localStorage.getItem("userName");
if (cachedName) updateWelcome(cachedName);

// 🔄 Fallback: Refresh from backend
(async () => {
  if (!localStorage.getItem("guestMode")) {
    const identifier = localStorage.getItem("userIdentifier");
    if (identifier) {
      try {
        const res = await fetch("/api/preferences/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier })
        });

        if (res.ok) {
          const data = await res.json();

          if (data.userName) {
            localStorage.setItem("userName", data.userName);
            updateWelcome(data.userName);
          }

          // ✅ Keep prefsSaved in sync
          if (data.preferences) {
            localStorage.setItem(
              "prefsSaved",
              data.preferences.length > 0 ? "true" : "false"
            );
          }
        }
      } catch (err) {
        console.error("⚠️ Could not refresh user details:", err);
      }
    }
  }
})();

const loginBtn = document.querySelector(".login-btn");
const logoutBtn = document.querySelector(".logout-btn");

// --- Barcode scanning & search ---
import { BrowserMultiFormatReader } from "https://cdn.jsdelivr.net/npm/@zxing/browser@latest/+esm";
const codeReader = new BrowserMultiFormatReader();
const imageInput = document.getElementById("barcode-file");
const searchInput = document.querySelector(".search-input");
const searchButton = document.querySelector(".search-button");
const resultsContainer = document.getElementById("search-results");

imageInput?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = async () => {
    try {
      const result = await codeReader.decodeFromImageElement(img);
      searchInput.value = result.text;
      await performSearch(result.text);
    } catch {
      alert(
        "Could not detect barcode. Please try a clearer image or use search."
      );
    }
  };
});

searchButton?.addEventListener("click", () => {
  const q = searchInput.value.trim();
  if (q) window.location.href = `/html/search.html?query=${encodeURIComponent(q)}`;
});
searchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = searchInput.value.trim();
    if (q)
      window.location.href = `/html/search.html?query=${encodeURIComponent(q)}`;
  }
});

async function performSearch(query) {
  if (/^\d{8,14}$/.test(query)) {
    window.location.href = `/html/product.html?code=${encodeURIComponent(query)}`;
    return;
  }

  resultsContainer.innerHTML =
    '<p style="font-style:italic;color:gray;">Searching…</p>';
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.products?.length) {
      resultsContainer.innerHTML = "<p>No products found.</p>";
      return;
    }

    resultsContainer.innerHTML = "";
    data.products.slice(0, 10).forEach((prod) => {
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <img src="${
          prod.image_front_thumb_url ||
          "https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg"
        }" alt="${prod.product_name || "Product"}">
        <h4>${prod.product_name || "Unnamed"}</h4>
        <p>${prod.brands || "Unknown brand"}</p>
      `;
      card.addEventListener("click", () => {
        if (prod.code) {
          window.location.href = `/html/product.html?code=${encodeURIComponent(
            prod.code
          )}`;
        }
      });
      resultsContainer.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    resultsContainer.innerHTML = "<p>Error fetching data.</p>";
  }
}

// --- Category search ---
window.searchCategory = (categoryKey) => {
  window.location.href = `/html/search.html?category=${encodeURIComponent(
    categoryKey
  )}`;
};

/* scroll to barcode section makes the header change them */
const header = document.querySelector('.header');
const barcodeSection = document.getElementById('barcodeSection');
const aboutSection = document.getElementById('about');
const ctaButton = document.querySelector('.js-cta-btn');

function toggleHeaderEffect() {
  const headerBottom = header.getBoundingClientRect().bottom;

  const barcodeRect = barcodeSection.getBoundingClientRect();
  const aboutRect = aboutSection.getBoundingClientRect();

  // Dark theme when header overlaps any section
  if (
    (headerBottom >= barcodeRect.top && headerBottom <= barcodeRect.bottom) ||
    (headerBottom >= aboutRect.top && headerBottom <= aboutRect.bottom)
  ) {
    header.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    header.classList.add('header-dark');
  } else {
    // Default semi-glass transparent
    header.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    header.style.boxShadow = '0 2px 10px rgba(14, 165, 233, 0.1)';
    header.classList.remove('header-dark');
  }
}

window.addEventListener('scroll', toggleHeaderEffect);
window.addEventListener('resize', toggleHeaderEffect);

// --- Login & Logout handling ---
loginBtn?.addEventListener("click", () => {
  localStorage.removeItem("guestMode");
  window.location.href = "/html/login.html";
});

logoutBtn?.addEventListener("click", () => {
  clearAuthStorage(); // ✅ use centralized cleanup
  window.location.replace("/html/login.html");
});

ctaButton.addEventListener("click", () => {
  window.location.href = "/html/t.html"
});

// --- Toggle button visibility on page load ---
function updateAuthButtons() {
  const isLoggedIn = !!localStorage.getItem("userId");
  const isGuest = !!localStorage.getItem("guestMode");

  if (isLoggedIn) {
    loginBtn?.style.setProperty("display", "none", "important");
    logoutBtn?.style.removeProperty("display");
  } else if (isGuest) {
    logoutBtn?.style.setProperty("display", "none", "important");
    loginBtn?.style.removeProperty("display");
  } else {
    logoutBtn?.style.setProperty("display", "none", "important");
    loginBtn?.style.removeProperty("display");
  }
}
updateAuthButtons();

// --- Guest Restrictions ---
function applyGuestRestrictions() {
  const discover = document.getElementById("discover-link");
  const preferences = document.getElementById("preferences-link");
  const categories = document.getElementById("categories-section");

  if (discover) discover.style.display = "none";
  if (preferences) preferences.style.display = "none";
  if (categories) categories.style.display = "none";

  updateWelcome("Guest");
}

// Apply if guest
if (localStorage.getItem("guestMode")) {
  applyGuestRestrictions();
}
