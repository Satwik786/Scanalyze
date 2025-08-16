// Helper function to validate user on backend
async function validateUser() {
  const userId = localStorage.getItem("userId");
  const userIdentifier = localStorage.getItem("userIdentifier");

  if (!userId || !userIdentifier) {
    localStorage.clear();
    window.location.replace("/html/login.html");
    return false;
  }

  try {
    const res = await fetch("/api/preferences/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, identifier: userIdentifier }),
    });
    const data = await res.json();

    if (!res.ok || !data.valid) {
      localStorage.clear();
      window.location.replace("/html/login.html");
      return false;
    }
    return true;
  } catch (err) {
    console.error("User validation failed:", err);
    localStorage.clear();
    window.location.replace("/html/login.html");
    return false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  validateUser().then(isValid => {
    if (!isValid) return; // Already redirected inside validateUser()

    const form = document.getElementById("prefsForm");
    const userEmailDisplay = document.getElementById("user-email");
    const nameInput = document.getElementById("userName");

    const email = localStorage.getItem("userIdentifier");

    // 🚫 Skip preferences page if preferences already saved
    if (localStorage.getItem("prefsSaved") === "true") {
      window.location.replace("/html/home-page.html");
      return;
    }

    if (!form) {
      console.error("⚠️ Preference form not found!");
      return;
    }

    if (userEmailDisplay) {
      userEmailDisplay.textContent = email;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Get the user's name
      const name = nameInput ? nameInput.value.trim() : "";
      if (!name) {
        alert("Please enter your name.");
        return;
      }

      // Save the name locally for the welcome message
      localStorage.setItem("userName", name);

      // Get selected preferences
      const checkboxes = form.querySelectorAll("input[type='checkbox']:checked");
      const selectedPrefs = Array.from(checkboxes).map(cb => cb.value);

      try {
        const res = await fetch("/api/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, preferences: selectedPrefs }), // include name in POST
        });

        if (res.ok) {
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
      }
    });
  });
});
