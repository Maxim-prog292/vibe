(() => {
  "use strict";

  const STORAGE_META = {
    local: { short: "LOCAL", note: "Останется после перезапуска браузера" },
    session: { short: "SESSION", note: "Исчезнет после закрытия вкладки" },
    cookie: { short: "COOKIE", note: "Сохранится в cookie на 30 дней" },
  };

  const TYPE_TONE = {
    "Краш": "pink",
    "Грин-флаг": "lime",
    "Соулмейт": "blue",
    "Ситуэйшеншип": "violet",
    "Вайб": "orange",
    "Ред-флаг": "red",
  };

  const SEED = [
    {
      id: "demo-1",
      name: "Алекс",
      type: "Грин-флаг",
      category: "Серьёзно",
      age: 27,
      review: "Спокойный вайб, отличный плейлист и всегда пишет, что добрался.",
      createdAt: "2026-07-24T18:30:00.000Z",
      storage: "local",
    },
    {
      id: "demo-2",
      name: "Саша",
      type: "Краш",
      category: "Симпатия",
      age: 24,
      review: "Смех на десять из десяти. Химия тоже на месте.",
      createdAt: "2026-07-19T12:00:00.000Z",
      storage: "local",
    },
    {
      id: "demo-3",
      name: "Мика",
      type: "Вайб",
      category: "Без обязательств",
      age: 29,
      review: "Легко, честно и без странных исчезновений. Респект.",
      createdAt: "2026-07-12T09:20:00.000Z",
      storage: "session",
    },
    {
      id: "demo-4",
      name: "Женя",
      type: "Ситуэйшеншип",
      category: "Дружба+",
      age: 26,
      review: "Пока непонятно, но сюжет держит внимание.",
      createdAt: "2026-06-30T20:15:00.000Z",
      storage: "cookie",
    },
  ];

  const state = {
    partners: [],
    query: "",
    category: "Все",
    type: "Все типы",
    sort: "newest",
    view: "grid",
  };

  const elements = {
    grid: document.querySelector("#catalogGrid"),
    empty: document.querySelector("#emptyState"),
    total: document.querySelector("#totalCount"),
    average: document.querySelector("#averageAge"),
    leading: document.querySelector("#leadingType"),
    visible: document.querySelector("#visibleCount"),
    search: document.querySelector("#searchInput"),
    type: document.querySelector("#typeFilter"),
    sort: document.querySelector("#sortSelect"),
    filters: document.querySelector("#categoryFilters"),
    gridView: document.querySelector("#gridView"),
    listView: document.querySelector("#listView"),
    modal: document.querySelector("#modal"),
    form: document.querySelector("#partnerForm"),
    name: document.querySelector("#partnerName"),
    review: document.querySelector("#partnerReview"),
    reviewLength: document.querySelector("#reviewLength"),
    toast: document.querySelector("#toast"),
  };

  function readCookie(name) {
    const item = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
    return item ? decodeURIComponent(item.split("=").slice(1).join("=")) : null;
  }

  function readList(kind) {
    try {
      const raw = kind === "local"
        ? localStorage.getItem("vibe-archive.local.v1")
        : kind === "session"
          ? sessionStorage.getItem("vibe-archive.session.v1")
          : readCookie("vibe_archive_cookie_v1");
      const value = raw ? JSON.parse(raw) : [];
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function writeList(kind, records) {
    const value = JSON.stringify(records);
    if (kind === "local") {
      localStorage.setItem("vibe-archive.local.v1", value);
      return;
    }
    if (kind === "session") {
      sessionStorage.setItem("vibe-archive.session.v1", value);
      return;
    }
    const encoded = encodeURIComponent(value);
    if (encoded.length > 3600) throw new Error("cookie-full");
    document.cookie = `vibe_archive_cookie_v1=${encoded}; Max-Age=2592000; Path=/; SameSite=Lax`;
  }

  function initializeData() {
    let records = ["local", "session", "cookie"].flatMap(readList);
    let initialized = false;
    try {
      initialized = localStorage.getItem("vibe-archive.initialized.v1") === "yes";
    } catch {
      initialized = true;
    }

    if (!records.length && !initialized) {
      ["local", "session", "cookie"].forEach((kind) => {
        writeList(kind, SEED.filter((item) => item.storage === kind));
      });
      localStorage.setItem("vibe-archive.initialized.v1", "yes");
      records = [...SEED];
    }
    state.partners = records;

    const savedView = readCookie("vibe_archive_view");
    state.view = savedView === "list" ? "list" : "grid";
    setView(state.view);
  }

  function filteredPartners() {
    const normalized = state.query.trim().toLocaleLowerCase("ru");
    return state.partners
      .filter((item) => state.category === "Все" || item.category === state.category)
      .filter((item) => state.type === "Все типы" || item.type === state.type)
      .filter((item) => {
        if (!normalized) return true;
        return `${item.name} ${item.review} ${item.type} ${item.category}`
          .toLocaleLowerCase("ru")
          .includes(normalized);
      })
      .sort((a, b) => {
        if (state.sort === "name") return a.name.localeCompare(b.name, "ru");
        if (state.sort === "category") return a.category.localeCompare(b.category, "ru");
        if (state.sort === "type") return a.type.localeCompare(b.type, "ru");
        if (state.sort === "age") return a.age - b.age;
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });
  }

  function text(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  }

  function createCard(partner, index) {
    const card = document.createElement("article");
    card.className = `person-card tone-${TYPE_TONE[partner.type] || "blue"}`;

    const top = document.createElement("div");
    top.className = "card-topline";
    top.append(text("span", "card-index", `#${String(index + 1).padStart(2, "0")}`));
    top.append(text("span", "type-badge", partner.type));
    const remove = text("button", "remove-button", "×");
    remove.type = "button";
    remove.setAttribute("aria-label", `Удалить ${partner.name}`);
    remove.addEventListener("click", () => removePartner(partner));
    top.append(remove);

    const main = document.createElement("div");
    main.className = "card-main";
    const identity = document.createElement("div");
    identity.append(text("h3", "", partner.name));
    identity.append(text("p", "person-meta", `${partner.age} лет · ${partner.category}`));
    main.append(identity);
    main.append(text("p", "review", `«${partner.review}»`));

    const footer = document.createElement("div");
    footer.className = "card-footer";
    const storage = document.createElement("span");
    storage.className = "storage-pill";
    storage.title = STORAGE_META[partner.storage].note;
    const dot = document.createElement("i");
    dot.setAttribute("aria-hidden", "true");
    storage.append(dot, document.createTextNode(` ${STORAGE_META[partner.storage].short}`));
    const date = document.createElement("time");
    date.dateTime = partner.createdAt;
    date.textContent = new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(partner.createdAt));
    footer.append(storage, date);

    card.append(top, main, footer);
    return card;
  }

  function recordWord(count) {
    const lastTwo = count % 100;
    const last = count % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return "записей";
    if (last === 1) return "запись";
    if (last >= 2 && last <= 4) return "записи";
    return "записей";
  }

  function render() {
    const visible = filteredPartners();
    elements.grid.replaceChildren(...visible.map(createCard));
    elements.grid.hidden = visible.length === 0;
    elements.empty.hidden = visible.length !== 0;
    elements.visible.textContent = String(visible.length).padStart(2, "0");
    elements.total.textContent = String(state.partners.length).padStart(2, "0");

    const average = state.partners.length
      ? Math.round(state.partners.reduce((sum, item) => sum + Number(item.age), 0) / state.partners.length)
      : 0;
    elements.average.textContent = average || "—";

    const counts = state.partners.reduce((result, item) => {
      result[item.type] = (result[item.type] || 0) + 1;
      return result;
    }, {});
    const leader = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    elements.leading.textContent = leader ? leader[0] : "—";

    ["local", "session", "cookie"].forEach((kind) => {
      const count = state.partners.filter((item) => item.storage === kind).length;
      document.querySelector(`#${kind}Count`).textContent = `${count} ${recordWord(count)}`;
    });
  }

  function setView(view) {
    state.view = view;
    elements.grid.classList.toggle("is-list", view === "list");
    elements.gridView.classList.toggle("active", view === "grid");
    elements.listView.classList.toggle("active", view === "list");
    elements.gridView.setAttribute("aria-pressed", String(view === "grid"));
    elements.listView.setAttribute("aria-pressed", String(view === "list"));
    document.cookie = `vibe_archive_view=${view}; Max-Age=2592000; Path=/; SameSite=Lax`;
  }

  let toastTimeout;
  function showToast(message, error = false) {
    window.clearTimeout(toastTimeout);
    elements.toast.textContent = `${error ? "!" : "✓"} ${message}`;
    elements.toast.style.borderColor = error ? "var(--red)" : "var(--acid)";
    elements.toast.hidden = false;
    toastTimeout = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 2800);
  }

  function openForm() {
    elements.modal.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => elements.name.focus(), 0);
  }

  function closeForm() {
    elements.modal.hidden = true;
    document.body.style.overflow = "";
  }

  function removePartner(partner) {
    if (!window.confirm(`Удалить запись «${partner.name}»?`)) return;
    const updated = readList(partner.storage).filter((item) => item.id !== partner.id);
    writeList(partner.storage, updated);
    state.partners = state.partners.filter((item) => item.id !== partner.id);
    render();
    showToast("Запись удалена");
  }

  function savePartner(event) {
    event.preventDefault();
    const data = new FormData(elements.form);
    const age = Number(data.get("age"));
    if (age < 18 || age > 99) {
      showToast("Возраст должен быть от 18 до 99", true);
      return;
    }

    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(data.get("name") || "").trim(),
      type: String(data.get("type")),
      category: String(data.get("category")),
      age,
      review: String(data.get("review") || "").trim(),
      storage: String(data.get("storage")),
      createdAt: new Date().toISOString(),
    };

    try {
      writeList(record.storage, [record, ...readList(record.storage)]);
    } catch {
      showToast("Cookie заполнена — выбери другое хранилище", true);
      return;
    }

    state.partners.unshift(record);
    elements.form.reset();
    document.querySelector("#partnerCategory").value = "Симпатия";
    document.querySelector("input[name='storage'][value='local']").checked = true;
    updateStorageChoice();
    elements.reviewLength.textContent = "0";
    sessionStorage.removeItem("vibe-archive.draft.v1");
    closeForm();
    render();
    showToast(`${record.name} добавлен в архив`);
  }

  function saveDraft() {
    const data = new FormData(elements.form);
    sessionStorage.setItem("vibe-archive.draft.v1", JSON.stringify(Object.fromEntries(data.entries())));
  }

  function restoreDraft() {
    try {
      const raw = sessionStorage.getItem("vibe-archive.draft.v1");
      if (!raw) return;
      const draft = JSON.parse(raw);
      Object.entries(draft).forEach(([name, value]) => {
        const field = elements.form.elements.namedItem(name);
        if (!field) return;
        if (field instanceof RadioNodeList) field.value = value;
        else field.value = value;
      });
      elements.reviewLength.textContent = String(elements.review.value.length);
      updateStorageChoice();
    } catch {
      sessionStorage.removeItem("vibe-archive.draft.v1");
    }
  }

  function updateStorageChoice() {
    document.querySelectorAll(".storage-choice label").forEach((label) => {
      const radio = label.querySelector("input[type='radio']");
      label.classList.toggle("selected", radio.checked);
    });
  }

  document.querySelector("#openForm").addEventListener("click", openForm);
  document.querySelector("#openFormEmpty").addEventListener("click", openForm);
  document.querySelector("#closeForm").addEventListener("click", closeForm);
  document.querySelector("#cancelForm").addEventListener("click", closeForm);
  elements.modal.addEventListener("mousedown", (event) => {
    if (event.target === elements.modal) closeForm();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal.hidden) closeForm();
  });
  elements.form.addEventListener("submit", savePartner);
  elements.form.addEventListener("input", () => {
    elements.reviewLength.textContent = String(elements.review.value.length);
    saveDraft();
  });
  elements.form.addEventListener("change", () => {
    updateStorageChoice();
    saveDraft();
  });

  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });
  elements.type.addEventListener("change", (event) => {
    state.type = event.target.value;
    render();
  });
  elements.sort.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });
  elements.filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    elements.filters.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip === button);
    });
    render();
  });
  elements.gridView.addEventListener("click", () => setView("grid"));
  elements.listView.addEventListener("click", () => setView("list"));

  initializeData();
  restoreDraft();
  render();
})();
