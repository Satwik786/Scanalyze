function clearAuthStorage() {
  localStorage.removeItem("userId");
  localStorage.removeItem("userIdentifier");
  localStorage.removeItem("prefsSaved");
  localStorage.removeItem("guestMode");
}

// Validate user on backend

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

    // Sync userName in localStorage
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

// Preferences form logic

document.addEventListener("DOMContentLoaded", () => {
  validateUser().then(async (isValid) => {
    if (!isValid) return;

    const form = document.getElementById("prefsForm");
    const userEmailDisplay = document.getElementById("user-email");
    const nameInput = document.getElementById("userName");
    const submitBtn = document.getElementById("prefsSubmit");
    const identifier = localStorage.getItem("userIdentifier");

    if (!form || !submitBtn || !nameInput) {
      console.error("⚠️ One or more form elements not found!");
      return;
    }

    if (userEmailDisplay) {
      userEmailDisplay.textContent = identifier;
    }

    // Prefill existing preferences and name
    try {
      const res = await fetch("/api/preferences/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.userName) nameInput.value = data.userName;
        if (data.preferences?.length) {
          data.preferences.forEach((pref) => {
            const cb = form.querySelector(`input[type="checkbox"][value="${pref}"]`);
            if (cb) cb.checked = true;
          });
        }
      }
    } catch (err) {
      console.error("⚠️ Could not prefill preferences:", err);
    }

    form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  if (!name) {
    alert("Please enter your name.");
    return;
  }

  const checkboxes = form.querySelectorAll("input[type='checkbox']:checked");
  const selectedPrefs = Array.from(checkboxes).map((cb) => cb.value);

  if (selectedPrefs.length === 0) {
    alert("Please select at least one preference.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "Saving...";

  // ✅ Create or get a message element
  let msgEl = document.getElementById("prefsSavedMessage");
  if (!msgEl) {
    msgEl = document.createElement("p");
    msgEl.id = "prefsSavedMessage";
    msgEl.style.color = "green";
    msgEl.style.fontWeight = "bold";
    form.appendChild(msgEl);
  }
  msgEl.textContent = ""; // clear previous messages

  try {
    const res = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier,
        userName: name,
        preferences: selectedPrefs,
      }),
    });

    if (res.ok) {
      localStorage.setItem("userName", name);
      localStorage.setItem("prefsSaved", "true");

      // ✅ Show saved message
      msgEl.textContent = "Preferences saved successfully!";

      // Optional: delay redirect so user sees the message
      setTimeout(() => {
        window.location.replace("/html/home-page.html");
      }, 1500); // 1.5 seconds
    } else {
      const result = await res.json();
      console.error("⚠️ Error saving preferences:", result.error);
      msgEl.textContent = "Failed to save preferences. Please try again.";
      msgEl.style.color = "red";
    }
  } catch (err) {
    console.error("❌ Request error:", err);
    msgEl.textContent = "An error occurred. Please try again.";
    msgEl.style.color = "red";
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Save Preferences";
  }
    });
  });
});
