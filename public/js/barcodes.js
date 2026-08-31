document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");

  searchBtn?.addEventListener("click", searchProducts);

  searchInput?.addEventListener("keypress", (event) => {
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
    spinner.style.display = "block";

    const url =
      `/api/barcode-search?q=${encodeURIComponent(query)}`;

    const res = await fetch(url);

    if (!res.ok) {
      let message = "Failed to search products";

      try {
        const errorData = await res.json();

        if (errorData.error) {
          message = errorData.error;
        }
      } catch {
        // Keep default error message
      }

      throw new Error(message);
    }

    const data = await res.json();
    const products = data.products || [];

    if (products.length === 0) {
      searchInput.value = "";
      searchInput.placeholder = "⚠ No products found";
      searchInput.classList.add("error");
      return;
    }

    products.forEach((product) => {
      const code =
        product.barcode ||
        product.code ||
        "";

      if (!code) {
        return;
      }

      const name =
        product.name ||
        product.product_name ||
        "Unnamed Product";

      const imgUrl =
        product.image ||
        product.image_front_small_url ||
        product.image_front_url ||
        "";

      const item =
        document.createElement("div");

      item.className = "barcode-item";

      if (imgUrl) {
        const img =
          document.createElement("img");

        img.src = imgUrl;
        img.alt = name;

        img.onerror = () => {
          img.style.display = "none";
        };

        item.appendChild(img);
      }

      const title =
        document.createElement("h3");

      title.textContent = name;

      item.appendChild(title);

      const canvas =
        document.createElement("canvas");

      canvas.id =
        "barcode-" + code;

      item.appendChild(canvas);

      try {
        JsBarcode(canvas, code, {
          format: "EAN13",
          lineColor: "#000",
          width: 2,
          height: 100,
          displayValue: true,
        });
      } catch {
        try {
          JsBarcode(canvas, code, {
            format: "CODE128",
            lineColor: "#000",
            width: 2,
            height: 100,
            displayValue: true,
          });
        } catch (barcodeError) {
          console.error(
            "Barcode generation error:",
            barcodeError
          );
        }
      }

      const downloadBtn =
        document.createElement("a");

      downloadBtn.textContent =
        "Download Barcode";

      downloadBtn.className =
        "download-btn";

      downloadBtn.href =
        canvas.toDataURL("image/png");

      downloadBtn.download =
        `barcode-${code}.png`;

      item.appendChild(downloadBtn);

      gallery.appendChild(item);
    });
  } catch (error) {
    console.error(
      "Barcode search error:",
      error
    );

    searchInput.value = "";

    searchInput.placeholder =
      "⚠ " + error.message;

    searchInput.classList.add("error");
  } finally {
    spinner.style.display = "none";
  }
}