/* Weekly meal planner — data persistence + rendering (vanilla JS) */

const PLANNER_DRAFT_KEY = "mealplanner:planner:current";
const PLANNER_ARCHIVE_KEY = "mealplanner:planner:archive";

let plannerViewMode = "current"; // "current" | "archive"
let plannerArchiveOpenId = null; // id of an archived week currently expanded

function plannerEmptyDraft() {
  const menu = {};
  PLANNER_MENU_CATEGORIES.forEach((slug) => { menu[slug] = { dish: "", doses: "" }; });

  const grid = {};
  PLANNER_DAYS.forEach((d) => {
    grid[d.key] = { almoco: "", jantar: "" };
    if (d.weekday) grid[d.key].tupperware = d.tupperwareDefault;
  });
  grid.terca.almoco = "Salada";
  grid.terca.almocoHighlight = "green";
  grid.sexta.jantar = "Uber eats";
  grid.sexta.jantarHighlight = "green";

  return { week: "", portions: "20", notes: "", menu, grid };
}

function plannerLoadDraft() {
  try {
    const raw = localStorage.getItem(PLANNER_DRAFT_KEY);
    if (!raw) return plannerEmptyDraft();
    const parsed = JSON.parse(raw);
    // merge with defaults so new categories/days added later don't break old saves
    const base = plannerEmptyDraft();
    return {
      ...base,
      ...parsed,
      menu: { ...base.menu, ...(parsed.menu || {}) },
      grid: { ...base.grid, ...(parsed.grid || {}) },
    };
  } catch (e) {
    return plannerEmptyDraft();
  }
}

function plannerSaveDraft(draft) {
  localStorage.setItem(PLANNER_DRAFT_KEY, JSON.stringify(draft));
}

function plannerLoadArchive() {
  try {
    const raw = localStorage.getItem(PLANNER_ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function plannerSaveArchive(list) {
  localStorage.setItem(PLANNER_ARCHIVE_KEY, JSON.stringify(list));
}

function plannerDishOptions(categorySlug) {
  if (categorySlug === "easy") {
    return SIMPLE_LISTS.easy.items.map((it) => ({ name: it.name, doses: it.value }));
  }
  const list = RECIPES[categorySlug] || [];
  return list.map((r) => ({ name: r.name, doses: String(r.doses) }));
}

function plannerTotalDoses(draft) {
  return PLANNER_MENU_CATEGORIES.reduce((sum, slug) => {
    const n = parseInt((draft.menu[slug] && draft.menu[slug].doses) || "", 10);
    return sum + (Number.isNaN(n) ? 0 : n);
  }, 0);
}

function plannerFormatWeekLabel(iso) {
  if (!iso) return "Semana sem data";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* ---------- Rendering ---------- */

function plannerMeasureTextWidth(text, font) {
  const canvas = plannerMeasureTextWidth._canvas || (plannerMeasureTextWidth._canvas = document.createElement("canvas"));
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  return ctx.measureText(text || "").width;
}

function plannerFitPillWidth(textarea) {
  const cell = textarea.closest(".grid-cell");
  if (!cell) return;
  const isHighlighted = cell.classList.contains("highlight-pink") || cell.classList.contains("highlight-green");
  if (!isHighlighted) { textarea.style.width = ""; return; }

  const style = getComputedStyle(textarea);
  const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const textWidth = plannerMeasureTextWidth(textarea.value, font);
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  const cellMax = cell.clientWidth - 16;
  const target = Math.min(Math.max(textWidth + paddingLeft + paddingRight + 4, 40), Math.max(cellMax, 40));
  textarea.style.width = `${target}px`;
}

function plannerIconHtml(count) {
  if (count === 1) return `<img class="tupperware-icon" src="assets/img/icons/tupperware-1.svg" alt="Tupperware x1" />`;
  if (count === 2) return `<img class="tupperware-icon" src="assets/img/icons/tupperware-2.svg" alt="Tupperware x2" />`;
  return "";
}

function plannerGridCellHtml(day, meal, draft, readOnly) {
  const cell = draft.grid[day.key] || {};
  const value = escapeHtml(cell[meal] || "");
  const isTupperwareCell = day.weekday && meal === "almoco";
  const count = isTupperwareCell ? (cell.tupperware || 0) : 0;
  const highlight = cell[`${meal}Highlight`] || "";

  const tupperwareControlsHtml = isTupperwareCell && !readOnly
    ? `
      <button type="button" class="tupperware-plus" data-day="${day.key}" aria-label="Tupperware">+</button>
      <div class="tupperware-menu" hidden data-day="${day.key}">
        <button type="button" data-count="0">0</button>
        <button type="button" data-count="1">1</button>
        <button type="button" data-count="2">2</button>
      </div>
    `
    : "";

  const highlightControlsHtml = !readOnly
    ? `
      <button type="button" class="highlight-swatch highlight-swatch-${highlight || "none"}" data-day="${day.key}" data-meal="${meal}" aria-label="Cor de destaque"></button>
      <div class="highlight-menu" hidden data-day="${day.key}" data-meal="${meal}">
        <button type="button" class="highlight-option highlight-option-none" data-color="" aria-label="Sem cor"></button>
        <button type="button" class="highlight-option highlight-option-pink" data-color="pink" aria-label="Rosa"></button>
        <button type="button" class="highlight-option highlight-option-green" data-color="green" aria-label="Verde"></button>
      </div>
    `
    : "";

  return `
    <div class="grid-cell${highlight ? ` highlight-${highlight}` : ""}">
      ${highlightControlsHtml}
      <textarea class="grid-textarea" data-day="${day.key}" data-meal="${meal}" ${readOnly ? "readonly" : ""} placeholder="" rows="1">${value}</textarea>
      ${tupperwareControlsHtml}
      ${isTupperwareCell ? plannerIconHtml(count) : ""}
    </div>
  `;
}

function plannerMenuRowHtml(slug, draft, readOnly) {
  const cat = findCategory(slug);
  const row = draft.menu[slug] || { dish: "", doses: "" };
  return `
    <div class="menu-row" style="--row-bg:${cat.pastel};--row-text:${cat.colorDark}">
      <span class="menu-row-label" draggable="${readOnly ? "false" : "true"}" data-category="${slug}">${cat.short}</span>
      <div class="menu-row-field">
        <input type="text" class="menu-dish-input" data-category="${slug}" value="${escapeHtml(row.dish)}" ${readOnly ? "readonly" : ""} autocomplete="off" />
        ${readOnly ? "" : `<div class="menu-suggestions" data-category="${slug}" hidden></div>`}
      </div>
      <input type="text" class="menu-doses-input" data-category="${slug}" value="${escapeHtml(row.doses)}" ${readOnly ? "readonly" : ""} />
    </div>
  `;
}

function plannerTotalRowHtml(draft) {
  return `
    <div class="menu-row menu-row-total">
      <span class="menu-row-label">TOTAL</span>
      <div class="menu-row-field"></div>
      <span class="menu-doses-total">${plannerTotalDoses(draft)}</span>
    </div>
  `;
}

function plannerFormHtml(draft, readOnly) {
  const menuRows = PLANNER_MENU_CATEGORIES.map((slug) => plannerMenuRowHtml(slug, draft, readOnly)).join("") + plannerTotalRowHtml(draft);

  const weeklyRows = PLANNER_DAYS.map((day) => `
    <div class="weekly-row">
      <div class="day-label">${day.label}</div>
      ${plannerGridCellHtml(day, "almoco", draft, readOnly)}
      ${plannerGridCellHtml(day, "jantar", draft, readOnly)}
    </div>
  `).join("");

  return `
    <div class="planner-layout">
      <div class="info-box">
        <div class="info-row">
          <label>WEEK:</label>
          <input type="date" class="planner-week-input" value="${escapeHtml(draft.week)}" ${readOnly ? "readonly" : ""} />
        </div>
        <div class="info-row">
          <label>PORTIONS:</label>
          <input type="text" class="planner-portions-input" value="${escapeHtml(draft.portions)}" ${readOnly ? "readonly" : ""} />
        </div>
        <div class="notes-label">NOTES</div>
        <textarea class="notes-textarea" ${readOnly ? "readonly" : ""} placeholder="">${escapeHtml(draft.notes)}</textarea>
      </div>

      <div class="menu-box">
        <div class="menu-box-head">
          <span class="menu-title">Menu da semana</span>
          <span class="menu-doses-head">doses</span>
        </div>
        <div class="menu-table">${menuRows}</div>
      </div>
    </div>

    <div class="weekly-table">
      <div class="weekly-head">
        <div class="day-label"></div>
        <div class="meal-head">ALMOÇO</div>
        <div class="meal-head">JANTAR</div>
      </div>
      ${weeklyRows}
    </div>
  `;
}

function plannerArchiveListHtml() {
  const archive = plannerLoadArchive();
  if (archive.length === 0) {
    return `<div class="empty-state"><span class="emoji">🗂️</span>Ainda não guardaste nenhuma semana.</div>`;
  }
  const sorted = [...archive].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const cards = sorted.map((entry) => `
    <div class="archive-card">
      <div class="archive-card-head">
        <div>
          <strong>${escapeHtml(plannerFormatWeekLabel(entry.week))}</strong>
          <span class="archive-portions">Portions: ${escapeHtml(entry.portions)}</span>
        </div>
        <div class="archive-actions">
          <button type="button" class="archive-toggle-btn" data-id="${entry.id}">${plannerArchiveOpenId === entry.id ? "Fechar" : "Ver"}</button>
          <button type="button" class="archive-delete-btn" data-id="${entry.id}">Apagar</button>
        </div>
      </div>
      ${plannerArchiveOpenId === entry.id ? `<div class="archive-card-body">${plannerFormHtml(entry, true)}</div>` : ""}
    </div>
  `).join("");
  return `<div class="archive-list">${cards}</div>`;
}

function renderPlanner() {
  document.body.className = "cat-planner";
  const draft = plannerLoadDraft();

  const currentActive = plannerViewMode === "current" ? "is-active" : "";
  const archiveActive = plannerViewMode === "archive" ? "is-active" : "";

  const body = plannerViewMode === "current"
    ? `
      <div class="planner-actions">
        <button type="button" class="planner-btn planner-btn-ghost planner-reset-btn">Nova semana em branco</button>
        <button type="button" class="planner-btn planner-btn-icon planner-save-btn" title="Guardar no Arquivo" aria-label="Guardar no Arquivo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/>
            <path d="M17 21v-8H7v8"/>
            <path d="M7 3v5h8"/>
          </svg>
        </button>
      </div>
      ${plannerFormHtml(draft, false)}
    `
    : plannerArchiveListHtml();

  return `
    <div class="app-shell">
      <main class="main">
        <div class="banner">
          <div class="banner-left">
            <a class="back-link" href="#/">← Categorias</a>
            <h1>Weekly meal planner</h1>
          </div>
          <div class="banner-tagline">Blank page to plan the menu of the week.</div>
        </div>

        ${tabbarHtml("planner")}

        <div class="planner-toggle-wrap">
          <div class="planner-toggle">
            <button type="button" class="toggle-btn ${currentActive}" data-view="current">Semana atual</button>
            <button type="button" class="toggle-btn ${archiveActive}" data-view="archive">Arquivo</button>
          </div>
        </div>

        <div class="planner-page">${body}</div>
      </main>
    </div>
  `;
}

/* ---------- Event binding (called after innerHTML is set) ---------- */

function plannerCloseAllPopovers() {
  document.querySelectorAll(".menu-suggestions").forEach((el) => { el.hidden = true; });
  document.querySelectorAll(".tupperware-menu").forEach((el) => { el.hidden = true; });
  document.querySelectorAll(".highlight-menu").forEach((el) => { el.hidden = true; });
}

function bindPlannerEvents() {
  const root = document.querySelector(".planner-page");
  const toggleWrap = document.querySelector(".planner-toggle");
  if (!root && !toggleWrap) return;

  // view toggle
  if (toggleWrap) {
    toggleWrap.querySelectorAll(".toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        plannerViewMode = btn.dataset.view;
        plannerArchiveOpenId = null;
        router();
      });
    });
  }

  if (!root) return;

  const draft = plannerLoadDraft();

  function persist() { plannerSaveDraft(draft); }

  // info box
  const weekInput = root.querySelector(".planner-week-input");
  if (weekInput) weekInput.addEventListener("change", () => { draft.week = weekInput.value; persist(); });

  const portionsInput = root.querySelector(".planner-portions-input");
  if (portionsInput) portionsInput.addEventListener("input", () => { draft.portions = portionsInput.value; persist(); });

  const notesTextarea = root.querySelector(".notes-textarea");
  if (notesTextarea) notesTextarea.addEventListener("input", () => { draft.notes = notesTextarea.value; persist(); });

  // menu rows: autocomplete
  root.querySelectorAll(".menu-dish-input").forEach((input) => {
    const slug = input.dataset.category;
    const suggestionsBox = root.querySelector(`.menu-suggestions[data-category="${slug}"]`);
    const dosesInput = root.querySelector(`.menu-doses-input[data-category="${slug}"]`);

    input.addEventListener("input", () => {
      draft.menu[slug].dish = input.value;
      persist();

      const q = input.value.trim().toLowerCase();
      if (!suggestionsBox) return;
      if (!q) { suggestionsBox.hidden = true; suggestionsBox.innerHTML = ""; return; }

      const matches = plannerDishOptions(slug).filter((d) => d.name.toLowerCase().includes(q)).slice(0, 8);
      if (matches.length === 0) { suggestionsBox.hidden = true; suggestionsBox.innerHTML = ""; return; }

      suggestionsBox.innerHTML = matches.map((d) =>
        `<div class="menu-suggestion-item" data-name="${escapeHtml(d.name)}" data-doses="${escapeHtml(d.doses)}">${escapeHtml(d.name)} <span>${escapeHtml(d.doses)}</span></div>`
      ).join("");
      suggestionsBox.hidden = false;
    });

    input.addEventListener("focus", () => {
      if (suggestionsBox && suggestionsBox.innerHTML && input.value.trim()) suggestionsBox.hidden = false;
    });

    if (suggestionsBox) {
      suggestionsBox.addEventListener("click", (e) => {
        const item = e.target.closest(".menu-suggestion-item");
        if (!item) return;
        input.value = item.dataset.name;
        draft.menu[slug].dish = item.dataset.name;
        if (dosesInput) {
          dosesInput.value = item.dataset.doses;
          draft.menu[slug].doses = item.dataset.doses;
        }
        persist();
        suggestionsBox.hidden = true;
        const totalEl = root.querySelector(".menu-doses-total");
        if (totalEl) totalEl.textContent = plannerTotalDoses(draft);
      });
    }

    if (dosesInput) {
      dosesInput.addEventListener("input", () => {
        draft.menu[slug].doses = dosesInput.value;
        persist();
        const totalEl = root.querySelector(".menu-doses-total");
        if (totalEl) totalEl.textContent = plannerTotalDoses(draft);
      });
    }

    // drag source: the colored category label carries whatever dish is currently typed
    const label = root.querySelector(`.menu-row-label[data-category="${slug}"]`);
    if (label) {
      label.addEventListener("dragstart", (e) => {
        const dish = draft.menu[slug].dish.trim();
        if (!dish) { e.preventDefault(); return; }
        e.dataTransfer.setData("text/plain", dish);
        e.dataTransfer.effectAllowed = "copy";
      });
    }
  });

  // weekly grid cells: free text + drop target
  root.querySelectorAll(".grid-textarea").forEach((textarea) => {
    const day = textarea.dataset.day;
    const meal = textarea.dataset.meal;

    const autoGrow = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
      plannerFitPillWidth(textarea);
    };
    autoGrow();

    textarea.addEventListener("input", () => {
      draft.grid[day][meal] = textarea.value;
      persist();
      autoGrow();
    });

    textarea.addEventListener("dragover", (e) => { e.preventDefault(); });
    textarea.addEventListener("drop", (e) => {
      e.preventDefault();
      const dish = e.dataTransfer.getData("text/plain");
      if (!dish) return;
      textarea.value = textarea.value.trim() ? `${textarea.value.trim()} + ${dish}` : dish;
      draft.grid[day][meal] = textarea.value;
      persist();
      autoGrow();
    });
  });

  // highlight color picker (pink / green label behind the text)
  root.querySelectorAll(".highlight-swatch").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const day = btn.dataset.day;
      const meal = btn.dataset.meal;
      const menu = root.querySelector(`.highlight-menu[data-day="${day}"][data-meal="${meal}"]`);
      const wasOpen = menu && !menu.hidden;
      plannerCloseAllPopovers();
      if (menu) menu.hidden = wasOpen;
    });
  });

  root.querySelectorAll(".highlight-menu").forEach((menu) => {
    const day = menu.dataset.day;
    const meal = menu.dataset.meal;
    menu.querySelectorAll("button").forEach((optBtn) => {
      optBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        draft.grid[day][`${meal}Highlight`] = optBtn.dataset.color || "";
        persist();
        router();
      });
    });
  });

  // tupperware selector
  root.querySelectorAll(".tupperware-plus").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const day = btn.dataset.day;
      const menu = root.querySelector(`.tupperware-menu[data-day="${day}"]`);
      const wasOpen = menu && !menu.hidden;
      plannerCloseAllPopovers();
      if (menu) menu.hidden = wasOpen;
    });
  });

  root.querySelectorAll(".tupperware-menu").forEach((menu) => {
    const day = menu.dataset.day;
    menu.querySelectorAll("button").forEach((optBtn) => {
      optBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const count = parseInt(optBtn.dataset.count, 10);
        draft.grid[day].tupperware = count;
        persist();
        router();
      });
    });
  });

  // buttons
  const saveBtn = root.querySelector(".planner-save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const entry = { ...JSON.parse(JSON.stringify(draft)), id: String(Date.now()), savedAt: new Date().toISOString() };
      const archive = plannerLoadArchive();
      archive.push(entry);
      plannerSaveArchive(archive);
      alert("Semana guardada no Arquivo.");
    });
  }

  const resetBtn = root.querySelector(".planner-reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!confirm("Isto limpa a semana atual (o que não guardaste no Arquivo perde-se). Continuar?")) return;
      plannerSaveDraft(plannerEmptyDraft());
      router();
    });
  }

  // archive view
  root.querySelectorAll(".archive-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      plannerArchiveOpenId = plannerArchiveOpenId === id ? null : id;
      router();
    });
  });
  root.querySelectorAll(".archive-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Apagar esta semana do Arquivo?")) return;
      const id = btn.dataset.id;
      const archive = plannerLoadArchive().filter((e) => e.id !== id);
      plannerSaveArchive(archive);
      router();
    });
  });
}

document.addEventListener("click", (e) => {
  if (
    !e.target.closest(".menu-row-field") &&
    !e.target.closest(".tupperware-plus") &&
    !e.target.closest(".tupperware-menu") &&
    !e.target.closest(".highlight-swatch") &&
    !e.target.closest(".highlight-menu")
  ) {
    plannerCloseAllPopovers();
  }
});
