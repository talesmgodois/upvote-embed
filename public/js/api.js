(function () {
  const TOKEN_KEY = "upvote-embed-token";

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let body = options.body;
    if (body && typeof body === "object" && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }

    const res = await fetch(path, { ...options, headers, body });
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* no body */
    }

    if (!res.ok) {
      const message = data?.error || `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }

    return data;
  }

  window.UpvoteAPI = {
    getToken,
    setToken,
    isAuthed: () => !!getToken(),

    register: (body) => request("/api/auth/register", { method: "POST", body }),
    login: (body) => request("/api/auth/login", { method: "POST", body }),
    me: () => request("/api/auth/me"),

    listCatalogues: () => request("/api/catalogues"),
    createCatalogue: (body) => request("/api/catalogues", { method: "POST", body }),
    getCatalogue: (id) => request(`/api/catalogues/${id}`),
    updateCatalogue: (id, body) =>
      request(`/api/catalogues/${id}`, { method: "PUT", body }),
    deleteCatalogue: (id) => request(`/api/catalogues/${id}`, { method: "DELETE" }),

    listItems: (catalogueId) => request(`/api/catalogues/${catalogueId}/items`),
    createItem: (catalogueId, body) =>
      request(`/api/catalogues/${catalogueId}/items`, { method: "POST", body }),
    updateItem: (id, body) => request(`/api/items/${id}`, { method: "PUT", body }),
    deleteItem: (id) => request(`/api/items/${id}`, { method: "DELETE" }),

    publicCatalogue: (id) =>
      request(`/api/public/catalogues/${id}`, {
        headers: { "X-Voter-Id": window.UpvoteVoter?.id || "" },
      }),
    publicItem: (id) =>
      request(`/api/public/items/${id}`, {
        headers: { "X-Voter-Id": window.UpvoteVoter?.id || "" },
      }),
    vote: (itemId, type) =>
      request(`/api/public/items/${itemId}/vote`, {
        method: "POST",
        body: { type },
        headers: { "X-Voter-Id": window.UpvoteVoter?.id || "" },
      }),
  };
})();
