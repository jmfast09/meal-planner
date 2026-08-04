/* Meal Planner — app logic (vanilla JS, hash router, no build step) */

function findCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug);
}

function findRecipe(catSlug, recipeSlug) {
  const list = RECIPES[catSlug] || [];
  return list.find((r) => r.slug === recipeSlug);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const PLATE_ICON = `<svg width="34" height="34" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="11"/></svg>`;

function tabbarHtml(activeSlug) {
  const pills = CATEGORIES.map((c) => {
    const active = c.slug === activeSlug ? "is-active" : "";
    return `<a class="tabpill ${active}" style="--pill-bg:${c.pastel}" href="#/cat/${c.slug}">${c.short}</a>`;
  }).join("");
  return `<div class="tabbar-wrap"><nav class="tabbar">${pills}</nav></div>`;
}

function renderHome() {
  document.body.className = "";
  const covers = CATEGORIES.map((c) => `
    <a class="cover-card" style="--card-color:${c.color}" href="#/cat/${c.slug}">
      <span class="cover-short">${c.short}</span>
      <div>
        <div class="cover-title">${escapeHtml(c.title)}</div>
        <div class="cover-tagline">${escapeHtml(c.tagline)}</div>
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

function renderCategoryList(cat) {
  const items = RECIPES[cat.slug] || [];
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
      <tr class="is-link">
        <td><a href="#/cat/${cat.slug}/${r.slug}">${escapeHtml(r.name)}</a></td>
        <td>${r.doses}</td>
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
          <span class="list-pill">Lista de Receitas</span>
          ${bodyHtml}
        </div>
      </div>
    </div>
  `;
}

function renderSimpleList(cat) {
  const data = SIMPLE_LISTS[cat.slug];
  const rows = data.items.map((it) => `
    <tr>
      <td>${escapeHtml(it.name)}</td>
      <td>${escapeHtml(it.value)}</td>
    </tr>
  `).join("");

  return `
    <div class="wavy-wrap">
      <div class="wavy-frame">
        <div class="wavy-inner">
          <span class="list-pill">Lista de Receitas</span>
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
  const items = data.items.map((name) => `
    <div class="side-item">
      <div class="side-icon">${PLATE_ICON}</div>
      <div class="side-name">${escapeHtml(name)}</div>
    </div>
  `).join("");

  return `
    <div class="wavy-wrap">
      <div class="wavy-frame">
        <div class="wavy-inner" style="padding:0;">
          <div style="padding:30px 34px 0;"><span class="list-pill">Lista de Sides</span></div>
          <div class="sides-grid">${items}</div>
          <div style="height:20px;"></div>
        </div>
      </div>
    </div>
  `;
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

function ingredientListHtml(items) {
  return `<ul class="ingredient-list">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
}

function prepChecklistHtml(catSlug, recipeSlug, steps) {
  const items = steps.map((step, i) => {
    const key = prepStorageKey(catSlug, recipeSlug, i);
    const checked = localStorage.getItem(key) === "1" ? "checked" : "";
    return `
      <li>
        <label class="prep-step">
          <input type="checkbox" data-prep-key="${key}" ${checked} />
          <span class="prep-step-num">${i + 1}.</span>
          <span class="prep-step-text">${escapeHtml(step)}</span>
        </label>
      </li>
    `;
  }).join("");
  return `<ul class="prep-list">${items}</ul>`;
}

function prepStorageKey(catSlug, recipeSlug, stepIndex) {
  return `mealplanner:prep:${catSlug}:${recipeSlug}:${stepIndex}`;
}

function renderRecipe(catSlug, recipeSlug) {
  const cat = findCategory(catSlug);
  const recipe = findRecipe(catSlug, recipeSlug);
  if (!cat || !recipe) return renderNotFound();
  document.body.className = "cat-" + cat.slug;

  const notasHtml = recipe.notas
    ? `
      <div class="box notas-box">
        <div class="box-header">Notas</div>
        <div class="box-body">${escapeHtml(recipe.notas)}</div>
      </div>
    `
    : "";

  const extraIngredients = recipe.ingredientsExtra
    ? `
      <div class="ingredient-subtitle">${escapeHtml(recipe.ingredientsExtra.title)}</div>
      ${ingredientListHtml(recipe.ingredientsExtra.items)}
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
            <div class="recipe-icon">${PLATE_ICON}</div>
            <h1>${escapeHtml(recipe.name)}</h1>
          </div>

          <div class="recipe-meta">
            <span>DOSES: ${recipe.doses}</span>
            <span>TEMPO DE PREP: ${escapeHtml(recipe.tempo)}${tempoFlag}</span>
          </div>

          <div class="recipe-grid">
            <div>
              <div class="box">
                <div class="box-header">Ingredientes</div>
                <div class="box-body">
                  ${ingredientListHtml(recipe.ingredients)}
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
        </div>
      </main>
    </div>
  `;
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

function router() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  const app = document.getElementById("app");

  let html;
  if (parts.length === 0) {
    html = renderHome();
  } else if (parts[0] === "cat" && parts[1] && !parts[2]) {
    html = renderCategory(parts[1]);
  } else if (parts[0] === "cat" && parts[1] && parts[2]) {
    html = renderRecipe(parts[1], parts[2]);
  } else {
    html = renderNotFound();
  }

  app.innerHTML = html;
  window.scrollTo(0, 0);
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

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);
