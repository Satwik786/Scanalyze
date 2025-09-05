import { handleAuthRedirect, clearAuthStorage } from "./auth.js";

// Allow unauthenticated users on login page
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
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/; // extended regex
    const phonePattern = /^\d{10}$/;
    return emailPattern.test(value) || phonePattern.test(value);
  }

  verifyBtn.addEventListener("click", async () => {
    let userInput = inputField.value.trim();
    if (!userInput) {
      inputField.placeholder = "Please enter your email or mobile number!";
      inputField.classList.add("input-error");
      return;
    }

    // normalize to lowercase for emails
    if (userInput.includes("@")) {
      userInput = userInput.toLowerCase();
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

        // Clear guest mode if previously enabled
        localStorage.removeItem("guestMode");

        // Save identifiers
        localStorage.setItem("userIdentifier", userInput);
        localStorage.setItem("userId", data.user._id);
        localStorage.setItem("prefsSaved", data.prefsSaved ? "true" : "false");

        // ✅ Save userName directly from login response
        if (data.user.userName) {
          localStorage.setItem("userName", data.user.userName);
        } else {
          localStorage.removeItem("userName");
        }

        // Redirect based on prefs status
        if (data.prefsSaved) {
          window.location.replace("/html/home-page.html");
        } else {
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

  // Guest Mode handler
  guestBtn?.addEventListener("click", () => {
    clearAuthStorage(); // ✅ safer than localStorage.clear()
    localStorage.setItem("guestMode", "true");
    window.location.replace("/html/home-page.html");
  });
});
