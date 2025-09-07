// -----------------------------
// Auth Storage Helper
// -----------------------------
export function clearAuthStorage() {
  localStorage.removeItem("userId");
  localStorage.removeItem("userIdentifier");
  localStorage.removeItem("prefsSaved");
  localStorage.removeItem("guestMode");
  localStorage.removeItem("userName");
}

// -----------------------------
// Validate user against backend
// -----------------------------
async function validateUser() {
  const userId = localStorage.getItem("userId");
  const userIdentifier = localStorage.getItem("userIdentifier");

  if (!userId || !userIdentifier) {
    clearAuthStorage();
    return false;
  }

  try {
    const res = await fetch("/api/preferences/get", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: userIdentifier })
    });

    const data = await res.json();

    if (!res.ok || !data.userName) {
      clearAuthStorage();
      return false;
    }

    localStorage.setItem("userName", data.userName || "User");
    localStorage.setItem("prefsSaved", (data.preferences?.length > 0) ? "true" : "false");

    return true;
  } catch (err) {
    console.error("⚠️ User validation failed:", err);
    clearAuthStorage();
    return false;
  }
}

// -----------------------------
// Helpers
// -----------------------------
function isPreferencesPage(path) {
  return path.endsWith("/html/preferences.html") || path.endsWith("/preferences");
}

function isHomePage(path) {
  return path.endsWith("/html/home-page.html") || path.endsWith("/home");
}

function isLoginPage(path) {
  return path.endsWith("/html/login.html") || path.endsWith("/login");
}

// -----------------------------
// Centralized redirect handler
// -----------------------------
export async function handleAuthRedirect(requiredAuth = true) {
  const currentPage = window.location.pathname;

  // 🟢 Guest Mode
  if (localStorage.getItem("guestMode") === "true") {
    if (!isHomePage(currentPage)) {
      window.location.replace("/html/home-page.html");
    }
    return;
  }

  // 🔹 Normal user flow
  const isValid = await validateUser();

  if (!isValid) {
    if (requiredAuth && !isLoginPage(currentPage)) {
      window.location.replace("/html/login.html");
    }
    return;
  }

  const prefsSaved = localStorage.getItem("prefsSaved") === "true";

  // Case 1: Preferences saved → allow home OR preferences
  if (prefsSaved) {
    if (!isHomePage(currentPage) && !isPreferencesPage(currentPage)) {
      window.location.replace("/html/home-page.html");
      return;
    }
  }

  // Case 2: Preferences not saved → force preferences
  if (!prefsSaved && !isPreferencesPage(currentPage)) {
    window.location.replace("/html/preferences.html");
    return;
  }

  // Case 3: On login page but already authenticated
  if (isLoginPage(currentPage)) {
    if (prefsSaved) {
      window.location.replace("/html/home-page.html");
    } else {
      window.location.replace("/html/preferences.html");
    }
  }
}
