// -----------------------------
// Validate user against backend
// -----------------------------
async function validateUser() {
  const userId = localStorage.getItem("userId");
  const userIdentifier = localStorage.getItem("userIdentifier");

  if (!userId || !userIdentifier) {
    localStorage.clear();
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
      return false;
    }
    return true;
  } catch (err) {
    console.error("⚠️ User validation failed:", err);
    localStorage.clear();
    return false;
  }
}

// -----------------------------
// Centralized redirect handler
// -----------------------------
export async function handleAuthRedirect(requiredAuth = true) {
  const currentPage = window.location.pathname;

  // 🟢 Guest Mode: skip validation
  if (localStorage.getItem("guestMode") === "true") {
    // If guest tries to go to login/preferences, push them to home
    if (!currentPage.endsWith("/html/home-page.html")) {
      window.location.replace("/html/home-page.html");
    }
    return;
  }

  // 🔹 Normal user flow
  const isValid = await validateUser();

  // If user is NOT valid
  if (!isValid) {
    if (requiredAuth && !currentPage.endsWith("/html/login.html")) {
      window.location.replace("/html/login.html");
    }
    return;
  }

  // If user IS valid
  const prefsSaved = localStorage.getItem("prefsSaved") === "true";

  // Case 1: Preferences saved → go home
  if (prefsSaved && !currentPage.endsWith("/html/home-page.html")) {
    window.location.replace("/html/home-page.html");
    return;
  }

  // Case 2: Preferences not saved → go preferences
  if (!prefsSaved && !currentPage.endsWith("/html/preferences.html")) {
    window.location.replace("/html/preferences.html");
    return;
  }

  // Case 3: On login page but already authenticated
  if (currentPage.endsWith("/html/login.html")) {
    if (prefsSaved) {
      window.location.replace("/html/home-page.html");
    } else {
      window.location.replace("/html/preferences.html");
    }
  }
}
