(function () {
  const STORAGE_KEY = "upvote-embed-theme";

  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      if (theme) localStorage.setItem(STORAGE_KEY, theme);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  applyTheme(getStoredTheme());

  window.UpvoteTheme = {
    current() {
      const stored = getStoredTheme();
      if (stored) return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    },
    toggle() {
      const next = window.UpvoteTheme.current() === "dark" ? "light" : "dark";
      applyTheme(next);
      setStoredTheme(next);
      window.dispatchEvent(new CustomEvent("themechange", { detail: next }));
      return next;
    },
    set(theme) {
      applyTheme(theme);
      setStoredTheme(theme);
    },
  };
})();
