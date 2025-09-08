document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");

  // Click search button
  searchBtn.addEventListener("click", searchProducts);

  // Press Enter
  searchInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchProducts();
    }
  });
});

async function searchProducts() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput.value.trim();
  const gallery = document.getElementById("gallery");
  const spinner = document.getElementById("spinner");

  gallery.innerHTML = "";
  searchInput.classList.remove("error");

  if (!query) {
    searchInput.value = "";
    searchInput.placeholder = "⚠ Please enter a product name";
    searchInput.classList.add("error");
    return;
  }

  try {
    spinner.style.display = "block"; // show spinner

    // Search in Indian database first
    let url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&tagtype_0=countries&tag_contains_0=contains&tag_0=india`;
    let res = await fetch(url);
    let data = await res.json();
    let products = data.products || [];

    // If no Indian products, fallback to global
    if (products.length === 0) {
      url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
      res = await fetch(url);
      data = await res.json();
      products = data.products || [];
    }

    if (products.length === 0) {
      searchInput.value = "";
      searchInput.placeholder = "⚠ No products found";
      searchInput.classList.add("error");
      return;
    }

    products.forEach(product => {
      if (!product.code) return;

      const code = product.code;
      const name = product.product_name || "Unnamed Product";
      const imgUrl = product.image_front_small_url || "";

      // Create product card
      const item = document.createElement("div");
      item.className = "barcode-item";

      // Product image
      if (imgUrl) {
        const img = document.createElement("img");
        img.src = imgUrl;
        img.alt = name;
        item.appendChild(img);
      }

      // Title
      const title = document.createElement("h3");
      title.textContent = name;
      item.appendChild(title);

      // Barcode
      const canvas = document.createElement("canvas");
      canvas.id = "barcode-" + code;
      item.appendChild(canvas);

      try {
        JsBarcode(canvas, code, {
          format: "EAN13",
          lineColor: "#000",
          width: 2,
          height: 100,
          displayValue: true
        });
      } catch (err) {
        JsBarcode(canvas, code, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 100,
          displayValue: true
        });
      }

      // Download button
      const downloadBtn = document.createElement("a");
      downloadBtn.textContent = "Download Barcode";
      downloadBtn.className = "download-btn";
      downloadBtn.href = canvas.toDataURL("image/png");
      downloadBtn.download = `barcode-${code}.png`;
      item.appendChild(downloadBtn);

      gallery.appendChild(item);
    });

  } catch (error) {
    console.error(error);
    searchInput.value = "";
    searchInput.placeholder = "⚠ Error fetching products";
    searchInput.classList.add("error");
  } finally {
    spinner.style.display = "none"; // hide spinner
  }
}
