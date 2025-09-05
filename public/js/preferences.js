// -----------------------------
// Auth Storage Helper
// -----------------------------
function clearAuthStorage() {
  localStorage.removeItem("userId");
  localStorage.removeItem("userIdentifier");
  localStorage.removeItem("prefsSaved");
  localStorage.removeItem("guestMode");
  // ❌ Do not remove "userName" here
}

// -----------------------------
// Validate user on backend
// -----------------------------
async function validateUser() {
  const userIdentifier = localStorage.getItem("userIdentifier");

  if (!userIdentifier) {
    clearAuthStorage();
    window.location.replace("/html/login.html");
    return false;
  }

  try {
    const res = await fetch("/api/preferences/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: userIdentifier }),
    });
    const data = await res.json();

    if (!res.ok || !data.valid) {
      clearAuthStorage();
      window.location.replace("/html/login.html");
      return false;
    }

    // ✅ If backend includes userName, update it
    if (data.userName) {
      localStorage.setItem("userName", data.userName);
    }

    return true;
  } catch (err) {
    console.error("⚠️ User validation failed:", err);
    clearAuthStorage();
    window.location.replace("/html/login.html");
    return false;
  }
}

// -----------------------------
// Preferences form logic
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  validateUser().then(isValid => {
    if (!isValid) return;

    const form = document.getElementById("prefsForm");
    const userEmailDisplay = document.getElementById("user-email");
    const nameInput = document.getElementById("userName");
    const submitBtn = document.getElementById("prefsSubmit");

    if (!form || !submitBtn || !nameInput) {
      console.error("⚠️ One or more form elements not found!");
      return;
    }

    const identifier = localStorage.getItem("userIdentifier");

    // Redirect if prefs already saved
    if (localStorage.getItem("prefsSaved") === "true") {
      window.location.replace("/html/home-page.html");
      return;
    }

    if (userEmailDisplay) {
      userEmailDisplay.textContent = identifier;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = nameInput.value.trim();
      if (!name) {
        alert("Please enter your name.");
        return;
      }

      const checkboxes = form.querySelectorAll("input[type='checkbox']:checked");
      const selectedPrefs = Array.from(checkboxes).map(cb => cb.value);

      if (selectedPrefs.length === 0) {
        alert("Please select at least one preference.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = "Saving...";

      try {
        const res = await fetch("/api/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier,
            userName: name,
            preferences: selectedPrefs
          }),
        });

        if (res.ok) {
          // ✅ Save username locally so dashboard can greet properly
          localStorage.setItem("userName", name);
          localStorage.setItem("prefsSaved", "true");
          window.location.replace("/html/home-page.html");
        } else {
          const result = await res.json();
          console.error("⚠️ Error saving preferences:", result.error);
          alert("Failed to save preferences. Please try again.");
        }
      } catch (err) {
        console.error("❌ Request error:", err);
        alert("An error occurred. Please try again.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Save Preferences";
      }
    });
  });
});
