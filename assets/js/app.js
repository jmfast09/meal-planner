/* Meal Planner — app logic (vanilla JS, hash router, no build step) */

function findCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug);
}

function findRecipe(catSlug, recipeSlug) {
  const list = getAllRecipes(catSlug);
  return list.find((r) => r.slug === recipeSlug);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const PLATE_ICON = `<svg width="34" height="34" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="11"/></svg>`;
const CAMERA_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

function recipeIconUploadHtml(catSlug, recipeSlug) {
  const idAttrs = catSlug && recipeSlug ? `data-cat="${catSlug}" data-recipe="${recipeSlug}"` : "";
  return `
    <label class="recipe-icon-upload" title="Alterar ícone" aria-label="Alterar ícone">
      <input type="file" accept="image/*" class="recipe-icon-input" ${idAttrs} hidden />
      ${CAMERA_ICON}
    </label>
  `;
}

/* Reads an image file, center-crops it to a square, and downsizes it to a
   compact JPEG data URL so it fits comfortably in a Firestore document. */
function resizeImageToDataUrl(file, size) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cropSize = Math.min(img.width, img.height);
        const sx = (img.width - cropSize) / 2;
        const sy = (img.height - cropSize) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function tabbarHtml(activeSlug) {
  const plannerActive = activeSlug === "planner" ? "is-active" : "";
  const plannerPill = `<a class="tabpill tabpill-planner ${plannerActive}" style="--pill-bg:${PLANNER_TAB.pastel};--pill-text:${PLANNER_TAB.colorDark}" href="#/planner">${PLANNER_TAB.short}</a>`;

  const pills = CATEGORIES.map((c) => {
    const active = c.slug === activeSlug ? "is-active" : "";
    return `<a class="tabpill ${active}" style="--pill-bg:${c.pastel};--pill-text:${c.colorDark}" href="#/cat/${c.slug}">${c.short}</a>`;
  }).join("");

  return `<div class="tabbar-wrap"><nav class="tabbar">${plannerPill}${pills}</nav></div>`;
}

function renderHome() {
  document.body.className = "";
  const covers = CATEGORIES.map((c) => `
    <a class="cover-card" style="--card-color:${c.pastel};--card-text:${c.colorDark}" href="#/cat/${c.slug}">
      <span class="cover-short">${c.short}</span>
      <div>
        <div class="cover-icon"><img src="assets/img/icons/${c.slug}.svg" alt="" /></div>
        <div class="cover-title">${escapeHtml(c.title)}</div>
      </div>
    </a>
  `).join("");

  return `
    <div class="app-shell">
      <main class="main">
        <div class="home-hero">
          <h1>Meal Planner</h1>
          <p>Escolhe uma categoria para ver as receitas.</p>
        </div>
        ${tabbarHtml(null)}
        <div class="cover-grid">${covers}</div>
      </main>
    </div>
  `;
}

function listHeaderHtml(label, addHref) {
  return `
    <div class="list-header">
      <span class="list-pill">${escapeHtml(label)}</span>
      ${addHref ? `<a class="list-add-btn" href="${addHref}" aria-label="Criar nova receita" title="Criar nova receita">+</a>` : ""}
      <input type="text" class="category-search" placeholder="Procurar..." autocomplete="off" />
    </div>
  `;
}

function recipeRowIconHtml(recipe) {
  if (recipe.iconData) return `<img class="recipe-row-icon" src="${recipe.iconData}" alt="" />`;
  return recipe.icon
    ? `<img class="recipe-row-icon" src="assets/img/icons/recipes/${recipe.icon}.svg" alt="" />`
    : `<span class="recipe-row-icon recipe-row-icon-placeholder">${PLATE_ICON}</span>`;
}

function renderCategoryList(cat) {
  const items = getAllRecipes(cat.slug)
    .map((r) => getEffectiveRecipe(cat.slug, r))
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));
  let bodyHtml;

  if (items.length === 0) {
    bodyHtml = `
      <div class="empty-state">
        <span class="emoji">🍽️</span>
        Ainda sem receitas nesta categoria.<br/>Volta em breve!
      </div>
    `;
  } else {
    const rows = items.map((r) => `
      <tr class="is-link" data-search-name="${escapeHtml(r.name)}">
        <td>
          <div class="recipe-row-link">
            <a class="recipe-row-icon-link" href="#/cat/${cat.slug}/${r.slug}" aria-label="Ver receita">
              ${recipeRowIconHtml(r)}
            </a>
            <span class="recipe-row-name" contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${cat.slug}" data-recipe="${r.slug}" data-field="name">${escapeHtml(r.name)}</span>
          </div>
        </td>
        <td class="recipe-row-doses" contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${cat.slug}" data-recipe="${r.slug}" data-field="doses">${escapeHtml(String(r.doses))}</td>
      </tr>
    `).join("");
    bodyHtml = `
      <table class="recipe-table">
        <thead><tr><th>Receita</th><th>Doses</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  return `
    <div class="wavy-wrap">
      <div class="wavy-frame">
        <div class="wavy-inner">
          ${listHeaderHtml("Lista de Receitas", `#/cat/${cat.slug}/new`)}
          ${bodyHtml}
        </div>
      </div>
    </div>
  `;
}

function renderSimpleList(cat) {
  const data = SIMPLE_LISTS[cat.slug];
  const items = [...data.items].sort((a, b) => a.name.localeCompare(b.name, "pt"));
  const rows = items.map((it) => `
    <tr data-search-name="${escapeHtml(it.name)}">
      <td>${escapeHtml(it.name)}</td>
      <td>${escapeHtml(it.value)}</td>
    </tr>
  `).join("");

  return `
    <div class="wavy-wrap">
      <div class="wavy-frame">
        <div class="wavy-inner">
          ${listHeaderHtml(cat.listLabel || "Lista de Receitas")}
          <table class="recipe-table">
            <thead><tr><th>${data.columns[0]}</th><th>${data.columns[1]}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderGridList(cat) {
  const data = SIMPLE_LISTS[cat.slug];
  const cells = data.items.map((it) => `
    <div class="side-item" data-search-name="${escapeHtml(it.name)}">
      <div class="side-icon">
        ${it.icon ? `<img src="assets/img/icons/recipes/${it.icon}.svg" alt="" />` : PLATE_ICON}
      </div>
      <div class="side-name" style="color:${it.color || "var(--ink)"}">${escapeHtml(it.name)}</div>
    </div>
  `).join("");

  return `
    <div class="wavy-wrap">
      <div class="wavy-frame">
        <div class="wavy-inner" style="padding:0;">
          <div style="padding:30px 34px 0;">${listHeaderHtml("Lista de Sides")}</div>
          <div class="sides-grid">${cells}</div>
          <div style="height:20px;"></div>
        </div>
      </div>
    </div>
  `;
}

function bindCategorySearch() {
  const input = document.querySelector(".category-search");
  if (!input) return;
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll("[data-search-name]").forEach((el) => {
      const name = el.dataset.searchName.toLowerCase();
      el.style.display = name.includes(q) ? "" : "none";
    });
  });
}

function renderCategory(slug) {
  const cat = findCategory(slug);
  if (!cat) return renderNotFound();
  document.body.className = "cat-" + cat.slug;

  let listHtml;
  if (cat.type === "recipes") listHtml = renderCategoryList(cat);
  else if (cat.type === "simple-list") listHtml = renderSimpleList(cat);
  else listHtml = renderGridList(cat);

  return `
    <div class="app-shell">
      <main class="main">
        <div class="banner">
          <div class="banner-left">
            <a class="back-link" href="#/">← Categorias</a>
            <h1>${escapeHtml(cat.title)}</h1>
          </div>
          <div class="banner-tagline">${escapeHtml(cat.tagline)}</div>
        </div>
        ${tabbarHtml(cat.slug)}
        ${listHtml}
      </main>
    </div>
  `;
}

function ingredientListHtml(items, editCtx) {
  return `<ul class="ingredient-list">${items.map((i, idx) => {
    if (!editCtx) return `<li>${escapeHtml(i)}</li>`;
    return `<li contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${editCtx.cat}" data-recipe="${editCtx.recipe}" data-field="${editCtx.prefix}${idx}">${escapeHtml(i)}</li>`;
  }).join("")}</ul>`;
}

function prepChecklistHtml(catSlug, recipeSlug, steps) {
  const items = steps.map((step, i) => {
    const key = prepStorageKey(catSlug, recipeSlug, i);
    const checked = localStorage.getItem(key) === "1" ? "checked" : "";
    return `
      <li>
        <div class="prep-step">
          <label class="prep-step-check">
            <input type="checkbox" data-prep-key="${key}" ${checked} />
            <span class="prep-step-num">${i + 1}.</span>
          </label>
          <span class="prep-step-text" contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${catSlug}" data-recipe="${recipeSlug}" data-field="prep${i}">${escapeHtml(step)}</span>
        </div>
      </li>
    `;
  }).join("");
  return `<ul class="prep-list">${items}</ul>`;
}

function prepStorageKey(catSlug, recipeSlug, stepIndex) {
  return `mealplanner:prep:${catSlug}:${recipeSlug}:${stepIndex}`;
}

function recipeHistorySectionHtml(recipe) {
  const matches = plannerFindWeeksForDish(recipe.name);
  const years = Array.from(new Set(matches.filter((m) => m.week).map((m) => m.week.slice(0, 4)))).sort().reverse();
  const monthOptions = MONTH_NAMES_PT.map((m, i) => `<option value="${String(i + 1).padStart(2, "0")}">${m}</option>`).join("");
  const yearOptions = years.map((y) => `<option value="${y}">${y}</option>`).join("");

  return `
    <div class="box history-box">
      <div class="box-header">Histórico (Menu da semana)</div>
      <div class="box-body">
        <div class="history-filters">
          <select class="history-month-filter"><option value="">Mês (todos)</option>${monthOptions}</select>
          <select class="history-year-filter"><option value="">Ano (todos)</option>${yearOptions}</select>
        </div>
        <ul class="history-list"></ul>
        
      </div>
    </div>
  `;
}

function bindRecipeHistory(recipe) {
  const list = document.querySelector(".history-list");
  const monthSel = document.querySelector(".history-month-filter");
  const yearSel = document.querySelector(".history-year-filter");
  if (!list || !monthSel || !yearSel) return;

  function renderList() {
    const month = monthSel.value;
    const year = yearSel.value;
    const filtered = plannerFindWeeksForDish(recipe.name).filter((m) => {
      if (!m.week) return !month && !year;
      const [y, mo] = m.week.split("-");
      if (year && y !== year) return false;
      if (month && mo !== month) return false;
      return true;
    });

    if (filtered.length === 0) {
      list.innerHTML = `<li class="history-empty">Ainda sem histórico para este prato.</li>`;
      return;
    }
    list.innerHTML = filtered.map((m) => `<li>${escapeHtml(plannerFormatWeekLabel(m.week))}</li>`).join("");
  }

  monthSel.addEventListener("change", renderList);
  yearSel.addEventListener("change", renderList);
  renderList();
}

function renderRecipe(catSlug, recipeSlug) {
  const cat = findCategory(catSlug);
  const rawRecipe = findRecipe(catSlug, recipeSlug);
  if (!cat || !rawRecipe) return renderNotFound();
  const recipe = getEffectiveRecipe(catSlug, rawRecipe);
  document.body.className = "cat-" + cat.slug;

  const notasHtml = recipe.notas
    ? `
      <div class="box notas-box">
        <div class="box-header">Notas</div>
        <div class="box-body" contenteditable="true" spellcheck="false" data-cat="${cat.slug}" data-recipe="${recipe.slug}" data-field="notas">${escapeHtml(recipe.notas)}</div>
      </div>
    `
    : "";

  const extraIngredients = recipe.ingredientsExtra
    ? `
      <div class="ingredient-subtitle" contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${cat.slug}" data-recipe="${recipe.slug}" data-field="ingredientsExtraTitle">${escapeHtml(recipe.ingredientsExtra.title)}</div>
      ${ingredientListHtml(recipe.ingredientsExtra.items, { cat: cat.slug, recipe: recipe.slug, prefix: "ingredientExtra" })}
    `
    : "";

  const tempoFlag = recipe.tempoFlag
    ? `<span class="tempo-flag">${escapeHtml(recipe.tempoFlag)}</span>`
    : "";

  return `
    <div class="app-shell">
      <main class="main">
        <div class="banner">
          <div class="banner-left">
            <a class="back-link" href="#/cat/${cat.slug}">← ${escapeHtml(cat.short)}</a>
            <h1>${escapeHtml(cat.title)}</h1>
          </div>
        </div>

        ${tabbarHtml(cat.slug)}

        <div class="crumbs"><a href="#/">Categorias</a> / <a href="#/cat/${cat.slug}">${escapeHtml(cat.short)}</a> / ${escapeHtml(recipe.name)}</div>

        <div class="recipe-page">
          <div class="recipe-head">
            <div class="recipe-icon-wrap">
              ${recipe.iconData
                ? `<img class="recipe-icon-preview recipe-dish-icon" src="${recipe.iconData}" alt="" />`
                : recipe.icon
                  ? `<img class="recipe-icon-preview recipe-dish-icon" src="assets/img/icons/recipes/${recipe.icon}.svg" alt="" />`
                  : `<div class="recipe-icon-preview recipe-icon">${PLATE_ICON}</div>`}
              ${recipeIconUploadHtml(cat.slug, recipe.slug)}
            </div>
            <h1 contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${cat.slug}" data-recipe="${recipe.slug}" data-field="name">${escapeHtml(recipe.name)}</h1>
          </div>

          <div class="recipe-meta">
            <span>DOSES: <span contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${cat.slug}" data-recipe="${recipe.slug}" data-field="doses">${escapeHtml(String(recipe.doses))}</span></span>
            <span>TEMPO DE PREP: <span contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${cat.slug}" data-recipe="${recipe.slug}" data-field="tempo">${escapeHtml(recipe.tempo)}</span>${tempoFlag}</span>
          </div>

          <div class="recipe-grid">
            <div>
              <div class="box">
                <div class="box-header">Ingredientes</div>
                <div class="box-body">
                  ${ingredientListHtml(recipe.ingredients, { cat: cat.slug, recipe: recipe.slug, prefix: "ingredient" })}
                  ${extraIngredients}
                </div>
              </div>
              ${notasHtml}
            </div>
            <div class="box">
              <div class="box-header">Preparação</div>
              <div class="box-body">
                ${prepChecklistHtml(cat.slug, recipe.slug, recipe.preparacao)}
              </div>
            </div>
          </div>

          ${recipeHistorySectionHtml(recipe)}
        </div>
      </main>
    </div>
  `;
}

function renderNewRecipe(catSlug) {
  const cat = findCategory(catSlug);
  if (!cat || cat.type !== "recipes") return renderNotFound();
  document.body.className = "cat-" + cat.slug;

  return `
    <div class="app-shell">
      <main class="main">
        <div class="banner">
          <div class="banner-left">
            <a class="back-link" href="#/cat/${cat.slug}">← ${escapeHtml(cat.short)}</a>
            <h1>${escapeHtml(cat.title)}</h1>
          </div>
        </div>

        ${tabbarHtml(cat.slug)}

        <div class="crumbs"><a href="#/">Categorias</a> / <a href="#/cat/${cat.slug}">${escapeHtml(cat.short)}</a> / Nova receita</div>

        <div class="recipe-page recipe-page-new">
          <div class="recipe-new-actions">
            <button type="button" class="planner-btn planner-btn-ghost new-recipe-clear-btn">Limpar</button>
            <button type="button" class="planner-btn planner-btn-icon new-recipe-save-btn" title="Guardar receita" aria-label="Guardar receita">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/>
                <path d="M17 21v-8H7v8"/>
                <path d="M7 3v5h8"/>
              </svg>
            </button>
          </div>

          <div class="recipe-head">
            <div class="recipe-icon-wrap">
              <div class="recipe-icon-preview recipe-icon">${PLATE_ICON}</div>
              ${recipeIconUploadHtml()}
            </div>
            <h1 class="new-recipe-name" contenteditable="true" spellcheck="false" data-singleline="true" data-placeholder="Nome da receita"></h1>
          </div>

          <div class="recipe-meta">
            <span>DOSES: <span class="new-recipe-doses" contenteditable="true" spellcheck="false" data-singleline="true" data-placeholder="ex: 4"></span></span>
            <span>TEMPO DE PREP: <span class="new-recipe-tempo" contenteditable="true" spellcheck="false" data-singleline="true" data-placeholder="ex: 30 min"></span></span>
          </div>

          <div class="recipe-grid">
            <div class="box">
              <div class="box-header">Ingredientes</div>
              <div class="box-body">
                <ul class="ingredient-list new-recipe-list" data-new-list="ingredients">
                  <li contenteditable="true" spellcheck="false" data-placeholder="Escreve ou cola os ingredientes"></li>
                </ul>
              </div>
            </div>
            <div class="box">
              <div class="box-header">Preparação</div>
              <div class="box-body">
                <ul class="prep-list new-recipe-list" data-new-list="preparacao">
                  <li>
                    <div class="prep-step">
                      <span class="prep-step-num">1.</span>
                      <span class="prep-step-text" contenteditable="true" spellcheck="false" data-placeholder="Escreve ou cola os passos"></span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
}

function placeCursorAtEnd(el) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function bindNewRecipeList(ul) {
  const isPrep = ul.dataset.newList === "preparacao";

  function renumber() {
    if (!isPrep) return;
    ul.querySelectorAll(".prep-step-num").forEach((el, i) => { el.textContent = `${i + 1}.`; });
  }

  function editableOf(li) {
    return isPrep ? li.querySelector(".prep-step-text") : li;
  }

  function insertItemAfter(li, text) {
    const html = isPrep
      ? `<li><div class="prep-step"><span class="prep-step-num"></span><span class="prep-step-text" contenteditable="true" spellcheck="false" data-placeholder="Escreve ou cola os passos">${escapeHtml(text)}</span></div></li>`
      : `<li contenteditable="true" spellcheck="false" data-placeholder="Escreve ou cola os ingredientes">${escapeHtml(text)}</li>`;
    li.insertAdjacentHTML("afterend", html);
    return li.nextElementSibling;
  }

  ul.addEventListener("keydown", (e) => {
    const editable = e.target.closest(isPrep ? ".prep-step-text" : "li");
    if (!editable || !ul.contains(editable)) return;
    const li = isPrep ? editable.closest("li") : editable;

    if (e.key === "Enter") {
      e.preventDefault();
      const newLi = insertItemAfter(li, "");
      renumber();
      placeCursorAtEnd(editableOf(newLi));
      return;
    }

    if (e.key === "Backspace" && editable.textContent.trim() === "" && ul.children.length > 1) {
      const prevLi = li.previousElementSibling;
      if (!prevLi) return;
      e.preventDefault();
      li.remove();
      renumber();
      placeCursorAtEnd(editableOf(prevLi));
    }
  });

  ul.addEventListener("paste", (e) => {
    const editable = e.target.closest(isPrep ? ".prep-step-text" : "li");
    if (!editable || !ul.contains(editable)) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    editable.textContent = lines[0];
    let li = isPrep ? editable.closest("li") : editable;
    for (let i = 1; i < lines.length; i++) {
      li = insertItemAfter(li, lines[i]);
    }
    renumber();
    placeCursorAtEnd(editableOf(li));
  });
}

function bindNewRecipeEvents(catSlug) {
  const root = document.querySelector(".recipe-page-new");
  if (!root) return;

  root.querySelectorAll(".new-recipe-list").forEach((ul) => bindNewRecipeList(ul));

  const saveBtn = root.querySelector(".new-recipe-save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const name = root.querySelector(".new-recipe-name").textContent.trim();
      if (!name) {
        alert("Escreve pelo menos o nome da receita.");
        return;
      }
      const doses = root.querySelector(".new-recipe-doses").textContent.trim();
      const tempo = root.querySelector(".new-recipe-tempo").textContent.trim();
      const ingredients = Array.from(root.querySelectorAll('[data-new-list="ingredients"] > li'))
        .map((li) => li.textContent.trim())
        .filter(Boolean);
      const preparacao = Array.from(root.querySelectorAll('[data-new-list="preparacao"] .prep-step-text'))
        .map((el) => el.textContent.trim())
        .filter(Boolean);

      const slug = uniqueRecipeSlug(catSlug, slugifyRecipeName(name));
      const recipe = { slug, name, doses, tempo, ingredients, preparacao };
      const iconWrap = root.querySelector(".recipe-icon-wrap");
      if (iconWrap && iconWrap.dataset.iconData) recipe.iconData = iconWrap.dataset.iconData;
      if (window.saveNewRecipeRemote) window.saveNewRecipeRemote(catSlug, recipe);
      location.hash = `#/cat/${catSlug}/${slug}`;
    });
  }

  const clearBtn = root.querySelector(".new-recipe-clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!confirm("Isto limpa tudo o que escreveste nesta página. Continuar?")) return;
      router();
    });
  }
}

function renderNotFound() {
  document.body.className = "";
  return `
    <div class="app-shell">
      <main class="main">
        <div class="home-hero">
          <h1>Oops</h1>
          <p>Página não encontrada. <a href="#/">Voltar ao início</a></p>
        </div>
        ${tabbarHtml(null)}
      </main>
    </div>
  `;
}

let lastRouterHash = null;

function router() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  const app = document.getElementById("app");

  let html;
  if (parts.length === 0) {
    html = renderHome();
  } else if (parts[0] === "planner") {
    html = renderPlanner();
  } else if (parts[0] === "cat" && parts[1] && !parts[2]) {
    html = renderCategory(parts[1]);
  } else if (parts[0] === "cat" && parts[1] && parts[2] === "new") {
    html = renderNewRecipe(parts[1]);
  } else if (parts[0] === "cat" && parts[1] && parts[2]) {
    html = renderRecipe(parts[1], parts[2]);
  } else {
    html = renderNotFound();
  }

  app.innerHTML = html;

  if (hash !== lastRouterHash) window.scrollTo(0, 0);
  lastRouterHash = hash;

  if (parts[0] === "planner") bindPlannerEvents();
  else if (parts[0] === "cat" && parts[1] && !parts[2]) bindCategorySearch();
  else if (parts[0] === "cat" && parts[1] && parts[2] === "new") bindNewRecipeEvents(parts[1]);
  else if (parts[0] === "cat" && parts[1] && parts[2]) {
    const recipe = findRecipe(parts[1], parts[2]);
    if (recipe) bindRecipeHistory(getEffectiveRecipe(parts[1], recipe));
  }
}

// Delegated listener: persists checklist state across visits (per recipe step).
document.addEventListener("change", (e) => {
  const input = e.target;
  if (input.matches && input.matches('.prep-step input[type="checkbox"]')) {
    const key = input.dataset.prepKey;
    if (input.checked) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  }
});

// Delegated listener: uploaded recipe icons — resize/compress, then either save
// straight to the recipe (existing recipe pages) or stash on the wrapper for the
// "new recipe" Save button to pick up (recipe doesn't exist yet).
document.addEventListener("change", (e) => {
  const input = e.target;
  if (!input.matches || !input.matches(".recipe-icon-input")) return;
  const file = input.files && input.files[0];
  if (!file) return;

  resizeImageToDataUrl(file, 240)
    .then((dataUrl) => {
      const wrap = input.closest(".recipe-icon-wrap");
      if (wrap) {
        wrap.dataset.iconData = dataUrl;
        const preview = wrap.querySelector(".recipe-icon-preview");
        if (preview) preview.outerHTML = `<img class="recipe-icon-preview recipe-dish-icon" src="${dataUrl}" alt="" />`;
      }
      const { cat, recipe } = input.dataset;
      if (cat && recipe) saveRecipeEdit(cat, recipe, "iconData", dataUrl);
    })
    .catch((err) => {
      console.error("Failed to process uploaded icon:", err);
      alert("Não foi possível processar essa imagem. Tenta outra.");
    });
});

// Delegated listeners: persist edits made directly on recipe text (name, doses,
// tempo, ingredients, prep steps, notas) as the user types, on all recipe pages.
document.addEventListener("focusout", (e) => {
  const el = e.target.closest("[data-field]");
  if (!el || !el.isContentEditable) return;
  const { cat, recipe, field } = el.dataset;
  if (!cat || !recipe || !field) return;
  // textContent for single-line fields avoids CSS text-transform (e.g. the
  // uppercase recipe title) leaking into the saved value; innerText is only
  // needed for multi-line fields (Notas) to preserve line breaks as \n.
  const raw = el.hasAttribute("data-singleline") ? el.textContent : el.innerText;
  const value = raw.replace(/\u00a0/g, " ").trim();
  saveRecipeEdit(cat, recipe, field, value);
  router();
});

document.addEventListener("keydown", (e) => {
  const el = e.target.closest("[data-singleline]");
  if (!el) return;
  if (e.key === "Enter") {
    e.preventDefault();
    el.blur();
  }
});

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);
