document.addEventListener("DOMContentLoaded", () => {
  const inputField = document.getElementById("inputField");
  const verifyBtn = document.querySelector(".verify-btn");
  const guestBtn = document.querySelector(".guest-btn");

  if (!inputField || !verifyBtn) {
    console.error("Input field or verify button not found!");
    return;
  }

  inputField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      verifyBtn.click();
    }
  });

  // ✅ Validate email or phone number
  function isValidInput(value) {
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
    const phonePattern = /^\d{10}$/;
    return emailPattern.test(value) || phonePattern.test(value);
  }

  // 🔐 Handle Verify button click
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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ identifier: userInput })
      });

      const data = await response.json();

      if (response.ok && data.user && data.user._id) {
        console.log("✅ Login successful:", data);

        // Save to localStorage
        localStorage.setItem("userIdentifier", userInput); // email or phone
        localStorage.setItem("userId", data.user._id);     // MongoDB _id

        // Redirect to preferences page
        window.location.href = "/html/preferences.html";
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

  // 👤 Guest login button
  if (guestBtn) {
    guestBtn.addEventListener("click", () => {
      window.location.href = "/html/home-page.html";
    });
  }
});
