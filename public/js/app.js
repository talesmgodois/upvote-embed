(function () {
  const app = document.getElementById("app");
  const topbarActions = document.getElementById("topbar-actions");
  const toastEl = document.getElementById("toast");

  let currentUser = null;
  let toastTimer = null;

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }
  window.UpvoteToast = toast;

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => toast("Copied to clipboard"),
        () => toast("Could not copy"),
      );
    } else {
      toast("Copy not supported in this browser");
    }
  }

  function themeToggleButton() {
    const btn = document.createElement("button");
    btn.className = "theme-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Toggle theme");
    const sun =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    const moon =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
    const paint = () => {
      btn.innerHTML = window.UpvoteTheme.current() === "dark" ? sun : moon;
    };
    paint();
    btn.addEventListener("click", () => {
      window.UpvoteTheme.toggle();
      paint();
    });
    return btn;
  }

  function renderTopbar() {
    topbarActions.innerHTML = "";
    topbarActions.appendChild(themeToggleButton());

    if (currentUser) {
      const email = document.createElement("span");
      email.style.cssText = "color: var(--fg-secondary); font-size: 13px; margin-right: 4px;";
      email.textContent = currentUser.email;

      const logoutBtn = document.createElement("button");
      logoutBtn.className = "btn sm";
      logoutBtn.textContent = "Log out";
      logoutBtn.addEventListener("click", () => {
        window.UpvoteAPI.setToken(null);
        currentUser = null;
        location.hash = "#/login";
      });

      topbarActions.appendChild(email);
      topbarActions.appendChild(logoutBtn);
    } else {
      const loginBtn = document.createElement("a");
      loginBtn.className = "btn sm";
      loginBtn.href = "#/login";
      loginBtn.textContent = "Log in";
      topbarActions.appendChild(loginBtn);
    }
  }

  // ---------- Modal helper ----------

  function openModal(innerHtml, onMount) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `<div class="modal">${innerHtml}</div>`;
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", onKey);

    onMount?.(overlay.querySelector(".modal"), close);
    return close;
  }

  // ---------- Auth views ----------

  function viewLogin() {
    app.innerHTML = `
      <div class="container narrow">
        <div class="auth-card">
          <h1 style="font-size:19px; margin-bottom: 4px;">Welcome back</h1>
          <p class="sub" style="color:var(--fg-secondary); font-size:13px; margin-bottom:24px;">Log in to manage your catalogues</p>
          <form id="login-form">
            <div class="field">
              <label>Email</label>
              <input type="email" name="email" required autocomplete="email" />
            </div>
            <div class="field">
              <label>Password</label>
              <input type="password" name="password" required autocomplete="current-password" />
            </div>
            <div class="error-text hidden" id="login-error"></div>
            <button class="btn primary" type="submit" style="width:100%;">Log in</button>
          </form>
          <p style="margin-top:18px; font-size:13px; color:var(--fg-secondary); text-align:center;">
            No account? <a href="#/register" style="color:var(--accent); text-decoration:none;">Create one</a>
          </p>
        </div>
      </div>
    `;

    const form = document.getElementById("login-form");
    const errorEl = document.getElementById("login-error");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      const fd = new FormData(form);
      try {
        const { token, user } = await window.UpvoteAPI.login({
          email: fd.get("email"),
          password: fd.get("password"),
        });
        window.UpvoteAPI.setToken(token);
        currentUser = user;
        renderTopbar();
        location.hash = "#/";
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove("hidden");
      }
    });
  }

  function viewRegister() {
    app.innerHTML = `
      <div class="container narrow">
        <div class="auth-card">
          <h1 style="font-size:19px; margin-bottom: 4px;">Create your account</h1>
          <p class="sub" style="color:var(--fg-secondary); font-size:13px; margin-bottom:24px;">Start prioritizing what to build next</p>
          <form id="register-form">
            <div class="field">
              <label>Name</label>
              <input type="text" name="name" autocomplete="name" />
            </div>
            <div class="field">
              <label>Email</label>
              <input type="email" name="email" required autocomplete="email" />
            </div>
            <div class="field">
              <label>Password</label>
              <input type="password" name="password" required minlength="8" autocomplete="new-password" />
              <span class="hint">At least 8 characters</span>
            </div>
            <div class="error-text hidden" id="register-error"></div>
            <button class="btn primary" type="submit" style="width:100%;">Create account</button>
          </form>
          <p style="margin-top:18px; font-size:13px; color:var(--fg-secondary); text-align:center;">
            Already have an account? <a href="#/login" style="color:var(--accent); text-decoration:none;">Log in</a>
          </p>
        </div>
      </div>
    `;

    const form = document.getElementById("register-form");
    const errorEl = document.getElementById("register-error");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.classList.add("hidden");
      const fd = new FormData(form);
      try {
        const { token, user } = await window.UpvoteAPI.register({
          name: fd.get("name") || undefined,
          email: fd.get("email"),
          password: fd.get("password"),
        });
        window.UpvoteAPI.setToken(token);
        currentUser = user;
        renderTopbar();
        location.hash = "#/";
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove("hidden");
      }
    });
  }

  // ---------- Dashboard ----------

  function catalogueEmbedUrl(id) {
    return `${location.origin}/embed/catalogue/${id}`;
  }
  function itemEmbedUrl(id) {
    return `${location.origin}/embed/item/${id}`;
  }

  function openCatalogueFormModal(existing, onSaved) {
    const isEdit = !!existing;
    openModal(
      `
      <h2>${isEdit ? "Edit catalogue" : "New catalogue"}</h2>
      <form id="cat-form">
        <div class="field">
          <label>Name</label>
          <input type="text" name="name" required maxlength="120" value="${escapeHtml(existing?.name ?? "")}" />
        </div>
        <div class="field">
          <label>Description</label>
          <textarea name="description" maxlength="2000">${escapeHtml(existing?.description ?? "")}</textarea>
        </div>
        <div class="error-text hidden" id="cat-form-error"></div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close>Cancel</button>
          <button type="submit" class="btn primary">${isEdit ? "Save changes" : "Create catalogue"}</button>
        </div>
      </form>
    `,
      (modal, close) => {
        modal.querySelector("[data-close]").addEventListener("click", close);
        const form = modal.querySelector("#cat-form");
        const errorEl = modal.querySelector("#cat-form-error");
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const body = {
            name: fd.get("name").trim(),
            description: fd.get("description")?.trim() ?? "",
          };
          try {
            const result = isEdit
              ? await window.UpvoteAPI.updateCatalogue(existing.id, body)
              : await window.UpvoteAPI.createCatalogue(body);
            close();
            onSaved?.(result.catalogue);
          } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove("hidden");
          }
        });
      },
    );
  }

  async function viewDashboard() {
    app.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Your catalogues</h1>
          <p class="sub">Create a catalogue of projects or features, then let people vote on what matters.</p>
        </div>
        <button class="btn primary" id="new-cat-btn">+ New catalogue</button>
      </div>
      <div id="cat-list" class="center-loading"><div class="spinner"></div></div>
    `;

    document.getElementById("new-cat-btn").addEventListener("click", () => {
      openCatalogueFormModal(null, (catalogue) => {
        toast("Catalogue created");
        location.hash = `#/catalogues/${catalogue.id}`;
      });
    });

    try {
      const { catalogues } = await window.UpvoteAPI.listCatalogues();
      const listEl = document.getElementById("cat-list");

      if (catalogues.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="big">📋</div>
            <p>No catalogues yet. Create one to start collecting votes.</p>
          </div>
        `;
        return;
      }

      listEl.className = "grid";
      listEl.innerHTML = catalogues
        .map(
          (c) => `
        <div class="cat-card" data-id="${c.id}">
          <h3>${escapeHtml(c.name)}</h3>
          <p>${escapeHtml(c.description || "No description")}</p>
          <div class="meta">
            <span class="badge">${c.item_count} item${c.item_count === 1 ? "" : "s"}</span>
            <span>${new Date(c.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      `,
        )
        .join("");

      listEl.querySelectorAll(".cat-card").forEach((card) => {
        card.addEventListener("click", () => {
          location.hash = `#/catalogues/${card.dataset.id}`;
        });
      });
    } catch (err) {
      document.getElementById("cat-list").innerHTML =
        `<div class="empty-state">${escapeHtml(err.message)}</div>`;
    }
  }

  // ---------- Item form (with paste-to-image) ----------

  function setupPasteZone(modal, initialUrl) {
    const zone = modal.querySelector("#paste-zone");
    const urlInput = modal.querySelector("input[name='image_url']");
    const preview = modal.querySelector("#img-preview");

    function updatePreview() {
      const url = urlInput.value.trim();
      if (url) {
        preview.innerHTML = `<img src="${escapeHtml(url)}" alt="" onerror="this.style.display='none'" /><span style="font-size:12px; color:var(--fg-tertiary);">Preview</span>`;
        preview.classList.remove("hidden");
      } else {
        preview.classList.add("hidden");
        preview.innerHTML = "";
      }
    }

    urlInput.addEventListener("input", updatePreview);
    if (initialUrl) updatePreview();

    async function handlePaste(e) {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          const reader = new FileReader();
          reader.onload = () => {
            urlInput.value = reader.result;
            updatePreview();
            toast("Image pasted");
          };
          reader.readAsDataURL(file);
          return;
        }
      }
      const text = e.clipboardData?.getData("text");
      if (text) {
        urlInput.value = text.trim();
        updatePreview();
      }
    }

    zone.addEventListener("paste", handlePaste);
    zone.addEventListener("focus", () => zone.classList.add("focused"));
    zone.addEventListener("blur", () => zone.classList.remove("focused"));
    zone.addEventListener("click", () => zone.focus());
  }

  function openItemFormModal(catalogueId, existing, onSaved) {
    const isEdit = !!existing;
    openModal(
      `
      <h2>${isEdit ? "Edit item" : "New item"}</h2>
      <form id="item-form">
        <div class="field">
          <label>Title</label>
          <input type="text" name="title" required maxlength="160" value="${escapeHtml(existing?.title ?? "")}" />
        </div>
        <div class="field">
          <label>Description</label>
          <textarea name="description" maxlength="4000">${escapeHtml(existing?.description ?? "")}</textarea>
        </div>
        <div class="field">
          <label>Image URL</label>
          <input type="text" name="image_url" placeholder="https://... or paste an image below" value="${escapeHtml(existing?.image_url ?? "")}" />
          <div class="paste-zone" id="paste-zone" tabindex="0">Click here and paste (Ctrl/Cmd+V) a screenshot or image URL to preview it</div>
          <div class="paste-preview hidden" id="img-preview"></div>
        </div>
        <div class="error-text hidden" id="item-form-error"></div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close>Cancel</button>
          <button type="submit" class="btn primary">${isEdit ? "Save changes" : "Add item"}</button>
        </div>
      </form>
    `,
      (modal, close) => {
        modal.querySelector("[data-close]").addEventListener("click", close);
        setupPasteZone(modal, existing?.image_url);

        const form = modal.querySelector("#item-form");
        const errorEl = modal.querySelector("#item-form-error");
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const body = {
            title: fd.get("title").trim(),
            description: fd.get("description")?.trim() ?? "",
            image_url: fd.get("image_url")?.trim() || undefined,
          };
          try {
            const result = isEdit
              ? await window.UpvoteAPI.updateItem(existing.id, body)
              : await window.UpvoteAPI.createItem(catalogueId, body);
            close();
            onSaved?.(result.item);
          } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove("hidden");
          }
        });
      },
    );
  }

  function openEmbedModal(title, url) {
    const iframeSnippet = `<iframe src="${url}" width="100%" height="480" frameborder="0" style="border-radius:12px;"></iframe>`;
    openModal(
      `
      <h2>${escapeHtml(title)}</h2>
      <div class="field">
        <label>Direct link</label>
        <div class="link-row">
          <input type="text" readonly value="${escapeHtml(url)}" id="embed-url" />
          <button class="btn sm" id="copy-url" type="button">Copy</button>
        </div>
      </div>
      <div class="field">
        <label>Embed snippet</label>
        <div class="link-row">
          <input type="text" readonly value="${escapeHtml(iframeSnippet)}" id="embed-code" />
          <button class="btn sm" id="copy-code" type="button">Copy</button>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-close>Close</button>
      </div>
    `,
      (modal, close) => {
        modal.querySelector("[data-close]").addEventListener("click", close);
        modal.querySelector("#copy-url").addEventListener("click", () => copyToClipboard(url));
        modal.querySelector("#copy-code").addEventListener("click", () => copyToClipboard(iframeSnippet));
      },
    );
  }

  function itemRowHtml(item) {
    const thumb = item.image_url
      ? `<img class="item-thumb" src="${escapeHtml(item.image_url)}" alt="" onerror="this.style.visibility='hidden'" />`
      : `<div class="item-thumb empty">no img</div>`;
    return `
      <div class="item-row" data-id="${item.id}">
        ${thumb}
        <div class="item-body">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.description || "")}</p>
        </div>
        <div class="vote-slot" data-role="vote-slot"></div>
        <div class="item-actions">
          <button class="btn sm icon" data-action="embed" title="Copy embed link">🔗</button>
          <button class="btn sm icon" data-action="edit" title="Edit">✎</button>
          <button class="btn sm icon danger" data-action="delete" title="Delete">🗑</button>
        </div>
      </div>
    `;
  }

  async function viewCatalogue(id) {
    app.innerHTML = `<div class="center-loading"><div class="spinner"></div></div>`;

    let catalogue, items;
    try {
      [{ catalogue }, { items }] = await Promise.all([
        window.UpvoteAPI.getCatalogue(id),
        window.UpvoteAPI.listItems(id),
      ]);
    } catch (err) {
      app.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
      return;
    }

    app.innerHTML = `
      <div class="back-link" id="back-link">&larr; All catalogues</div>
      <div class="page-header">
        <div>
          <h1>${escapeHtml(catalogue.name)}</h1>
          <p class="sub">${escapeHtml(catalogue.description || "No description")}</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn sm" id="embed-cat-btn">Embed catalogue</button>
          <button class="btn sm" id="edit-cat-btn">Edit</button>
          <button class="btn sm danger" id="delete-cat-btn">Delete</button>
        </div>
      </div>
      <div class="page-header" style="margin-bottom:14px;">
        <h3 style="font-size:15px;">Items</h3>
        <button class="btn primary sm" id="new-item-btn">+ Add item</button>
      </div>
      <div id="items-list"></div>
    `;

    document.getElementById("back-link").addEventListener("click", () => {
      location.hash = "#/";
    });
    document.getElementById("embed-cat-btn").addEventListener("click", () => {
      openEmbedModal("Embed this catalogue", catalogueEmbedUrl(catalogue.id));
    });
    document.getElementById("edit-cat-btn").addEventListener("click", () => {
      openCatalogueFormModal(catalogue, (updated) => {
        catalogue = updated;
        toast("Catalogue updated");
        viewCatalogue(id);
      });
    });
    document.getElementById("delete-cat-btn").addEventListener("click", async () => {
      if (!confirm(`Delete "${catalogue.name}" and all its items? This cannot be undone.`)) return;
      try {
        await window.UpvoteAPI.deleteCatalogue(catalogue.id);
        toast("Catalogue deleted");
        location.hash = "#/";
      } catch (err) {
        toast(err.message);
      }
    });
    document.getElementById("new-item-btn").addEventListener("click", () => {
      openItemFormModal(catalogue.id, null, () => {
        toast("Item added");
        viewCatalogue(id);
      });
    });

    const listEl = document.getElementById("items-list");
    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="big">✨</div>
          <p>No items yet. Add the first thing you want feedback on.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = items.map(itemRowHtml).join("");

    listEl.querySelectorAll(".item-row").forEach((row) => {
      const itemId = row.dataset.id;
      const item = items.find((i) => i.id === itemId);

      const slot = row.querySelector('[data-role="vote-slot"]');
      slot.appendChild(window.UpvoteVoteWidget.create(item));

      row.querySelector('[data-action="embed"]').addEventListener("click", () => {
        openEmbedModal("Embed this item", itemEmbedUrl(itemId));
      });
      row.querySelector('[data-action="edit"]').addEventListener("click", () => {
        openItemFormModal(catalogue.id, item, () => {
          toast("Item updated");
          viewCatalogue(id);
        });
      });
      row.querySelector('[data-action="delete"]').addEventListener("click", async () => {
        if (!confirm(`Delete "${item.title}"?`)) return;
        try {
          await window.UpvoteAPI.deleteItem(itemId);
          toast("Item deleted");
          viewCatalogue(id);
        } catch (err) {
          toast(err.message);
        }
      });
    });
  }

  // ---------- Router ----------

  async function router() {
    const hash = location.hash || "#/";

    if (hash === "#/login") return renderTopbar(), viewLogin();
    if (hash === "#/register") return renderTopbar(), viewRegister();

    if (!window.UpvoteAPI.isAuthed()) {
      currentUser = null;
      renderTopbar();
      return viewLogin();
    }

    if (!currentUser) {
      try {
        const { user } = await window.UpvoteAPI.me();
        currentUser = user;
      } catch {
        window.UpvoteAPI.setToken(null);
        renderTopbar();
        return viewLogin();
      }
    }
    renderTopbar();

    const catalogueMatch = hash.match(/^#\/catalogues\/([^/]+)$/);
    if (catalogueMatch) return viewCatalogue(catalogueMatch[1]);

    return viewDashboard();
  }

  window.addEventListener("hashchange", router);
  window.addEventListener("DOMContentLoaded", router);
})();
