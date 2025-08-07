document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("prefsForm");

  if (!form) {
    console.error("⚠️ Preference form not found!");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = localStorage.getItem("userIdentifier"); // must match backend
    if (!email) {
      alert("⚠️ User not identified. Please login again.");
      window.location.href = "/html/login.html";
      return;
    }

    const checkboxes = form.querySelectorAll("input[type='checkbox']:checked");
    const selectedPrefs = Array.from(checkboxes).map(cb => cb.value);

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          preferences: selectedPrefs
        })
      });

      const result = await res.json();

      if (res.ok) {
        alert("✅ Preferences saved successfully!");
        window.location.href = "/html/home-page.html";
      } else {
        console.error("⚠️ Error saving preferences:", result.error);
        alert("⚠️ Failed to save: " + result.error);
      }
    } catch (err) {
      console.error("❌ Request error:", err);
      alert("⚠️ Server error while saving preferences.");
    }
  });
});
