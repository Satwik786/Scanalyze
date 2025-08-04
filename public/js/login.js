// public/js/login.js
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

  // Validate email or phone
  function isValidInput(value) {
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
    const phonePattern = /^\d{10}$/;
    return emailPattern.test(value) || phonePattern.test(value);
  }

  // Handle verify button click
  verifyBtn.addEventListener("click", () => {
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

    setTimeout(() => {
      verifyBtn.innerText = "Verify & Continue";
      verifyBtn.disabled = false;
      // ✅ Correct path from root URL (served from /public)
      window.location.href = "/html/home-page.html";
    }, 1200);
  });

  // Guest button
  if (guestBtn) {
    guestBtn.addEventListener("click", () => {
      // ✅ Same here
      window.location.href = "/html/home-page.html";
    });
  }
});
