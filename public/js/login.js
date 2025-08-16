// 🔑 Import centralized auth handler
import { handleAuthRedirect } from "./auth.js";

// 🚀 Run auth check (but allow login page if not authenticated)
handleAuthRedirect(false);

document.addEventListener("DOMContentLoaded", () => {
  const inputField = document.getElementById("inputField");
  const verifyBtn = document.querySelector(".verify-btn");
  const guestBtn = document.querySelector(".guest-btn");

  if (!inputField || !verifyBtn) {
    console.error("⚠️ Input field or verify button not found!");
    return;
  }

  inputField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") verifyBtn.click();
  });

  function isValidInput(value) {
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
    const phonePattern = /^\d{10}$/;
    return emailPattern.test(value) || phonePattern.test(value);
  }

  verifyBtn.addEventListener("click", async () => {
    const userInput = inputField.value.trim();

    if (!userInput) {
      inputField.placeholder = "Please enter your email or mobile number!";
      inputField.classList.add("input-error");
      return;
    }

    if (!isValidInput(userInput)) {
      inputField.value = "";
      inputField.placeholder = "Enter valid email or 10-digit phone number.";
      inputField.classList.add("input-error");
      return;
    }

    inputField.classList.remove("input-error");
    verifyBtn.disabled = true;
    verifyBtn.innerText = "Verifying...";

    try {
      const response = await fetch("/api/preferences/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: userInput })
      });

      const data = await response.json();

      if (response.ok && data.user && data.user._id) {
        console.log("✅ Login successful:", data);

        // Clear guest mode if they log in
        localStorage.removeItem("guestMode");

        localStorage.setItem("userIdentifier", userInput);
        localStorage.setItem("userId", data.user._id);

        if (data.prefsSaved) {
          localStorage.setItem("prefsSaved", "true");
          window.location.replace("/html/home-page.html");
        } else {
          localStorage.removeItem("prefsSaved");
          window.location.replace("/html/preferences.html");
        }
      } else {
        console.error("❌ Login failed:", data.error || "Unknown error");
        inputField.value = "";
        inputField.placeholder = "Login failed. Try again.";
      }
    } catch (err) {
      console.error("⚠️ Request error:", err);
      inputField.value = "";
      inputField.placeholder = "Server error. Try again later.";
    }

    verifyBtn.disabled = false;
    verifyBtn.innerText = "Verify & Continue";
  });

  // 🟢 Guest Mode handler
  guestBtn?.addEventListener("click", () => {
    localStorage.clear();              // clear any previous user state
    localStorage.setItem("guestMode", "true");
    window.location.replace("/html/home-page.html");
  });
});
