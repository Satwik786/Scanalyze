// 🔑 Import centralized auth handler
import { handleAuthRedirect } from "./auth.js";

// 🚀 Run auth check (home requires authentication)
handleAuthRedirect(true);

// --- Personalized Welcome Message ---
const welcomeEl = document.getElementById("welcome-message");
const userName = localStorage.getItem("userName") || "User";
if (welcomeEl) welcomeEl.textContent = `Welcome, ${userName}!`;

// --- Carousel ---
const slides = document.querySelector('.slides');
const images = document.querySelectorAll('.slides img');
const prevBtn = document.querySelector('.prev');
const nextBtn = document.querySelector('.next');
const loginBtn = document.querySelector('.login-btn');
const logoutBtn = document.querySelector('.logout-btn');

let index = 0;
let interval = setInterval(nextSlide, 4000);

function showSlide(i) {
  index = (i + images.length) % images.length;
  slides.style.transform = `translateX(${-index * 100}%)`;
}
function nextSlide() { showSlide(index + 1); }
function prevSlide() { showSlide(index - 1); }

nextBtn?.addEventListener('click', () => { nextSlide(); resetInterval(); });
prevBtn?.addEventListener('click', () => { prevSlide(); resetInterval(); });

function resetInterval() {
  clearInterval(interval);
  interval = setInterval(nextSlide, 3000);
}

// --- Barcode scanning & search ---
import { BrowserMultiFormatReader } from 'https://cdn.jsdelivr.net/npm/@zxing/browser@latest/+esm';
const codeReader = new BrowserMultiFormatReader();
const imageInput = document.getElementById('barcode-file');
const searchInput = document.querySelector('.search-input');
const searchButton = document.querySelector('.search-button');
const resultsContainer = document.getElementById('search-results');

imageInput?.addEventListener('change', async (e) => {
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
      alert('Could not detect barcode. Please try a clearer image or use search.');
    }
  };
});

searchButton?.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (q) window.location.href = `/html/search.html?query=${encodeURIComponent(q)}`;
});
searchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = searchInput.value.trim();
    if (q) window.location.href = `/html/search.html?query=${encodeURIComponent(q)}`;
  }
});

async function performSearch(query) {
  if (/^\d{8,14}$/.test(query)) {
    window.location.href = `/html/product.html?code=${encodeURIComponent(query)}`;
    return;
  }

  resultsContainer.innerHTML = '<p style="font-style:italic;color:gray;">Searching…</p>';
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.products?.length) {
      resultsContainer.innerHTML = '<p>No products found.</p>';
      return;
    }

    resultsContainer.innerHTML = '';
    data.products.slice(0, 10).forEach(prod => {
      const card = document.createElement('div');
      card.className = 'result-card';
      card.innerHTML = `
        <img src="${prod.image_front_thumb_url || 'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg'}" alt="${prod.product_name || 'Product'}">
        <h4>${prod.product_name || 'Unnamed'}</h4>
        <p>${prod.brands || 'Unknown brand'}</p>
      `;
      card.addEventListener('click', () => {
        if (prod.code) {
          window.location.href = `/html/product.html?code=${encodeURIComponent(prod.code)}`;
        }
      });
      resultsContainer.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    resultsContainer.innerHTML = '<p>Error fetching data.</p>';
  }
}

// --- Category search ---
window.searchCategory = (categoryKey) => {
  window.location.href = `/html/search.html?category=${encodeURIComponent(categoryKey)}`;
};

// --- Login & Logout handling ---
loginBtn?.addEventListener('click', () => {
  localStorage.removeItem("guestMode");
  window.location.href = "/html/login.html";
});

logoutBtn?.addEventListener('click', () => {
  localStorage.removeItem("userIdentifier");
  localStorage.removeItem("userId");
  localStorage.removeItem("prefsSaved");
  localStorage.removeItem("userName"); // also clear the saved name
  localStorage.removeItem("guestMode");
  window.location.replace('/html/login.html');
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
