/* Weekly meal planner — data persistence + rendering (vanilla JS)
 *
 * The current-week draft and the archive are shared across devices via Firestore
 * (see assets/js/firebase-sync.js, which maintains window.__plannerDraftCache /
 * window.__plannerArchiveCache and exposes window.savePlannerDraftRemote() /
 * window.savePlannerArchiveRemote()). Loads fall back to blank/empty until the
 * first snapshot arrives, mirroring the old localStorage "nothing saved yet" case.
 */

let plannerViewMode = "current"; // "current" | "archive"
let plannerArchiveOpenId = null; // id of an archived week currently expanded
let shoppingAddOpenSection = null; // shopping-list section currently showing its "+" input

function plannerEmptyDraft() {
  const menu = {};
  PLANNER_MENU_CATEGORIES.forEach((slug) => { menu[slug] = { dish: "", doses: "" }; });
  menu.extra = { dish: "", doses: "" };

  const grid = {};
  PLANNER_DAYS.forEach((d) => {
    grid[d.key] = { almoco: "", jantar: "" };
    if (d.weekday) grid[d.key].tupperware = d.tupperwareDefault;
  });
  grid.terca.almoco = "Salada";
  grid.terca.almocoHighlight = "green";
  grid.sexta.jantar = "Uber eats";
  grid.sexta.jantarHighlight = "green";

  return { week: "", portions: "18", notes: "", menu, grid };
}

function plannerLoadDraft() {
  const cached = window.__plannerDraftCache;
  if (!cached) return plannerEmptyDraft();
  // merge with defaults so new categories/days added later don't break old saves
  const base = plannerEmptyDraft();
  return {
    ...base,
    ...cached,
    menu: { ...base.menu, ...(cached.menu || {}) },
    grid: { ...base.grid, ...(cached.grid || {}) },
  };
}

function plannerSaveDraft(draft) {
  if (window.savePlannerDraftRemote) window.savePlannerDraftRemote(draft);
}

function plannerLoadArchive() {
  return Array.isArray(window.__plannerArchiveCache) ? window.__plannerArchiveCache : [];
}

function plannerSaveArchive(list) {
  if (window.savePlannerArchiveRemote) window.savePlannerArchiveRemote(list);
}

/* Weeks (from the archive) where a given dish was set in the Menu da semana table. */
function plannerFindWeeksForDish(dishName) {
  const needle = dishName.trim().toLowerCase();
  if (!needle) return [];
  const matches = [];
  plannerLoadArchive().forEach((entry) => {
    PLANNER_MENU_CATEGORIES.forEach((slug) => {
      const row = entry.menu && entry.menu[slug];
      if (row && row.dish && row.dish.trim().toLowerCase() === needle) {
        matches.push({ week: entry.week, savedAt: entry.savedAt, category: slug });
      }
    });
  });
  return matches.sort((a, b) => (b.week || "").localeCompare(a.week || "") || b.savedAt.localeCompare(a.savedAt));
}

/* Recipe slug for a dish typed into the Menu da semana table, if it matches an
   existing recipe in that category (categories without recipe pages, e.g. Easy, return null). */
function plannerRecipeSlugForDish(categorySlug, dishName) {
  const name = (dishName || "").trim().toLowerCase();
  if (!name) return null;
  const list = getAllRecipes(categorySlug);
  const match = list.find((r) => getEffectiveRecipe(categorySlug, r).name.toLowerCase() === name);
  return match ? match.slug : null;
}

function plannerDishOptions(categorySlug) {
  if (categorySlug === "easy") {
    return SIMPLE_LISTS.easy.items.map((it) => ({ name: it.name, doses: it.value }));
  }
  const list = getAllRecipes(categorySlug);
  return list.map((r) => {
    const eff = getEffectiveRecipe(categorySlug, r);
    return { name: eff.name, doses: String(eff.doses) };
  });
}

/* Recipe (category + slug) for a dish name, searched across every Menu da
   semana category — used by the EXTRA row, which isn't tied to just one. */
function plannerRecipeRefForDishAnyCategory(dishName) {
  const name = (dishName || "").trim().toLowerCase();
  if (!name) return null;
  for (const slug of PLANNER_MENU_CATEGORIES) {
    const recipeSlug = plannerRecipeSlugForDish(slug, dishName);
    if (recipeSlug) return { category: slug, slug: recipeSlug };
  }
  return null;
}

/* Short stable id for a shopping-list item, safe as a Firestore field name
   (raw ingredient text can contain dots, which Firestore reads as nested
   field paths when used as an object key in setDoc). */
function shoppingItemKey(parts) {
  const raw = parts.join("::");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  return "i" + Math.abs(hash).toString(36);
}

// Pantry staples assumed always on hand — never added to the shopping list.
const SHOPPING_LIST_EXCLUDED_WORDS = ["sal", "pimenta", "azeite", "agua"];
function shoppingListExcluded(text) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return SHOPPING_LIST_EXCLUDED_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(normalized));
}

/* Section an ingredient line falls under, guessed from keywords. Checked in
   order — more specific buckets (e.g. Congelados, Conservas) come before
   broad ones (Frutas e legumes) so e.g. "espinafres congelados" lands in
   Congelados rather than Frutas e legumes, and "alho em pó" in Molhos e
   temperos rather than under fresh Frutas e legumes "alho". */
const SHOPPING_SECTIONS = [
  { label: "Congelados", keywords: ["congelad"] },
  // Checked before Carnes/Peixes/Laticínios/Cereais so e.g. "caldo de frango",
  // "noz-moscada" and "leite de coco" land here rather than under
  // chicken/nuts/dairy.
  { label: "Molhos e temperos", keywords: ["molho", "tempero", "oregao", "noz-moscada", "noz moscada", "canela", "colorau", "paprika", "curcuma", "caril", "alho em po", "gengibre em po", "mostarda", "ketchup", "maionese", "vinagre", "caldo", "louro", "oleo", "mel", "concentrado", "leite de coco", "polpa"] },
  { label: "Peixes", keywords: ["peixe", "atum", "bacalhau", "salm", "camar", "marisco", "mexilh", "polvo", "lula", "robalo", "dourada", "sardinha", "pescada"] },
  { label: "Carnes", keywords: ["carne", "frango", "peru", "porco", "vaca", "bovin", "borrego", "novilho", "bacon", "presunto", "fiambre", "chouric", "salpicao", "hamburguer", "almondega", "costeleta", "entrecosto", "picanha", "salsicha", "linguica", "toucinho"] },
  { label: "Laticínios e ovos", keywords: ["leite", "queijo", "iogurte", "manteiga", "natas", "creme", "ricotta", "mozarella", "mussarela", "parmesao", "ovo", "gema", "requeijao", "mascarpone", "feta", "flamengo"] },
  { label: "Conservas", keywords: ["conserva", "lata", "enlatad", "azeitona", "pickles", "picles"] },
  { label: "Cereais e grãos", keywords: ["arroz", "massa", "esparguete", "penne", "macarrao", "feijao", "grao", "lentilha", "quinoa", "aveia", "cuscuz", "semente", "caju", "amendoim", "noz", "amendoa"] },
  { label: "Panificação e confeitaria", keywords: ["farinha", "fermento", "levedura", "acucar", "pao ralado", "pao", "baguete", "broa", "chocolate", "cacau", "bolacha", "biscoito"] },
  { label: "Frutas e legumes", keywords: ["cebola", "alho", "batata", "tomate", "pepino", "abacate", "lima", "limao", "laranja", "maca", "banana", "pimento", "cenoura", "courgette", "brocolo", "espinafre", "alface", "rucula", "milho", "cebolinho", "salsa", "coentro", "manjericao", "salada", "fruta", "verdura", "legume"] },
];
// Display order on the page — independent of the keyword-matching priority above.
const SHOPPING_SECTION_ORDER = [
  "Panificação e confeitaria",
  "Frutas e legumes",
  "Laticínios e ovos",
  "Congelados",
  "Carnes",
  "Peixes",
  "Molhos e temperos",
  "Cereais e grãos",
  "Conservas",
  "Outros",
];

function classifyShoppingItem(text) {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const found = SHOPPING_SECTIONS.find((section) => section.keywords.some((k) => normalized.includes(k)));
  return found ? found.label : "Outros";
}

/* Strips a leading quantity/unit phrase (e.g. "8 c. de sopa de", "2 dentes
   de", "500g de") so two lines for the same ingredient in different amounts
   ("Queijo cottage" / "8 c. de sopa de queijo cottage") can be recognized as
   duplicates and merged. */
function shoppingItemBaseName(text) {
  let s = text.trim();
  s = s.replace(/^[\d\u00bd\u00bc\u00be/.,\-\s]+\s*(?:kg|g|ml|l|cm)?\.?\s*/i, "");
  s = s.replace(/^(c\.\s*(de\s*)?(sopa|ch[a\u00e1])|dentes?|folhas?|embalage(m|ns)|cubos?|bolbos?|gemas?|ma[c\u00e7]arocas?)\s+(de\s+)?/i, "");
  s = s.replace(/^de\s+/i, "");
  return s.trim().toLowerCase();
}

/* Parses a leading quantity out of an ingredient line so duplicate amounts
   can be added together instead of just counted. Returns null (not
   summable) for tablespoon/teaspoon amounts — the user asked those to stay
   as "xN" — and for anything without a parseable leading number. */
function parseShoppingQuantity(text) {
  const s = text.trim();
  if (/^[\d½¼¾/.,\-\s]+\s*c\.\s*(de\s*)?(sopa|ch[aá])/i.test(s)) return null;

  let m = s.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|litros?)\b\.?\s*(?:de\s+)?(.+)$/i);
  if (m) {
    let unit = m[2].toLowerCase();
    if (unit.startsWith("litro")) unit = "l";
    return { amount: parseFloat(m[1].replace(",", ".")), unit, name: m[3].trim(), kind: "metric" };
  }

  m = s.match(/^(\d+(?:[.,]\d+)?)\s+(dentes?|folhas?|embalage(?:m|ns)|cubos?|bolbos?|gemas?|ma[cç]arocas?)\s+de\s+(.+)$/i);
  if (m) {
    const stem = m[2].toLowerCase().replace(/s$/, "");
    return { amount: parseFloat(m[1].replace(",", ".")), unit: stem, name: m[3].trim(), kind: "noun" };
  }

  m = s.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (m) return { amount: parseFloat(m[1].replace(",", ".")), unit: null, name: m[2].trim(), kind: "bare" };

  return null;
}

function formatShoppingAmount(n) {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

/* Collapses items that share a base name into one row. When every item in
   the group has a summable leading quantity (same kind + unit — not
   tablespoons/teaspoons), the amounts are added together, e.g. "30g de
   parmesão ralado" + "150g de parmesão ralado" -> "180g de parmesão
   ralado". Otherwise falls back to "xN" on the shortest label. Keeps every
   underlying item's key so checking the merged row updates all of them. */
function mergeShoppingDuplicates(items) {
  const groups = new Map();
  items.forEach((it) => {
    // Section is part of the grouping key so a drag & drop move to a
    // different section splits it back out instead of hiding it.
    const key = `${it.section}::${shoppingItemBaseName(it.text)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  });
  return [...groups.values()].map((group) => {
    const keys = group.map((g) => g.key);
    const section = group[0].section;
    const order = Math.min(...group.map((g) => g.order));
    if (group.length === 1) return { keys, text: group[0].text, section, order };

    const parsed = group.map((it) => parseShoppingQuantity(it.text));
    const summable = parsed.every((p) => p && p.kind === parsed[0].kind && p.unit === parsed[0].unit);
    if (summable) {
      const sum = formatShoppingAmount(parsed.reduce((acc, p) => acc + p.amount, 0));
      const { kind, unit, name } = parsed[0];
      const text = kind === "metric" ? `${sum}${unit} de ${name}`
        : kind === "noun" ? `${sum} ${unit}s de ${name}`
        : `${sum} ${name}`;
      return { keys, text, section, order };
    }

    const shortest = group.reduce((a, b) => (b.text.length < a.text.length ? b : a));
    return { keys, text: `${shortest.text} x${group.length}`, section, order };
  });
}

/* Shopping list, derived fresh from the current Menu da semana draft: pulls
   every ingredient from each row's matched recipe, or — for rows with no
   matching recipe (always true for Easy, which has no recipe pages, and
   for any typed dish that doesn't match one) — adds the dish name itself. */
function buildShoppingList(draft) {
  const rowSlugs = [...PLANNER_MENU_CATEGORIES, "extra"];
  const rawItems = [];

  rowSlugs.forEach((slug) => {
    const dishName = ((draft.menu[slug] && draft.menu[slug].dish) || "").trim();
    if (!dishName) return;

    let recipe = null;
    let recipeCat = null;
    if (slug === "extra") {
      const ref = plannerRecipeRefForDishAnyCategory(dishName);
      if (ref) {
        recipeCat = ref.category;
        recipe = getAllRecipes(ref.category).find((r) => r.slug === ref.slug);
      }
    } else if (slug !== "easy") {
      const recipeSlug = plannerRecipeSlugForDish(slug, dishName);
      if (recipeSlug) {
        recipeCat = slug;
        recipe = getAllRecipes(slug).find((r) => r.slug === recipeSlug);
      }
    }

    if (recipe) {
      const eff = getEffectiveRecipe(recipeCat, recipe);
      const lines = [...(eff.ingredients || [])];
      if (eff.ingredientsExtra && eff.ingredientsExtra.items) lines.push(...eff.ingredientsExtra.items);
      let idx = 0;
      lines.forEach((text) => {
        const clean = (text || "").trim();
        if (!clean || shoppingListExcluded(clean)) return;
        rawItems.push({ key: shoppingItemKey([slug, dishName, idx++]), text: clean, source: dishName, section: classifyShoppingItem(clean) });
      });
    } else if (!shoppingListExcluded(dishName)) {
      // Easy dishes are frozen convenience foods (no recipe page ever exists for them).
      const section = slug === "easy" ? "Congelados" : classifyShoppingItem(dishName);
      rawItems.push({ key: shoppingItemKey([slug, dishName, "self"]), text: dishName, source: dishName, section });
    }
  });

  // Auto-derived items only exist fresh each render, so per-item edits/moves/
  // deletes/reordering (from inline editing and drag & drop) are persisted as
  // overrides applied on top, keyed by the item's stable hash key.
  const overrides = window.__shoppingOverridesCache || {};
  const items = [];
  rawItems.forEach((it, idx) => {
    const ov = overrides[it.key];
    if (ov && ov.deleted) return;
    items.push({
      ...it,
      text: ov && typeof ov.text === "string" ? ov.text : it.text,
      section: ov && ov.section ? ov.section : it.section,
      order: ov && typeof ov.order === "number" ? ov.order : idx,
    });
  });

  const manual = window.__shoppingManualCache || {};
  Object.keys(manual).forEach((id, idx) => {
    const entry = manual[id];
    if (!entry || !entry.text || !entry.text.trim()) return;
    items.push({
      key: id,
      text: entry.text.trim(),
      source: "manual",
      section: entry.section,
      order: typeof entry.order === "number" ? entry.order : rawItems.length + idx,
    });
  });

  return items;
}

/* Unified edit path for a single shopping-list item, whichever storage it
   actually lives in: manual items keep their own {section, text, order}
   entry, auto-derived items get an override patch layered on top (see
   buildShoppingList). "deleted" on a manual item just clears its text —
   buildShoppingList already skips manual entries with empty text. */
function shoppingApplyItemPatch(key, patch) {
  const manual = window.__shoppingManualCache || {};
  if (Object.prototype.hasOwnProperty.call(manual, key)) {
    const current = manual[key] || {};
    // Firestore rejects "undefined" field values, so order is only included
    // once it actually resolves to a number (i.e. the item has been dragged).
    const order = patch.order !== undefined ? patch.order : current.order;
    const next = {
      section: patch.section || current.section,
      text: patch.deleted ? "" : (patch.text !== undefined ? patch.text : current.text),
    };
    if (typeof order === "number") next.order = order;
    if (window.saveManualShoppingItemRemote) window.saveManualShoppingItemRemote(key, next);
  } else if (window.saveShoppingItemOverrideRemote) {
    window.saveShoppingItemOverrideRemote(key, patch);
  }
}

function plannerTotalDoses(draft) {
  const slugs = [...PLANNER_MENU_CATEGORIES, "extra"];
  return slugs.reduce((sum, slug) => {
    const n = parseInt((draft.menu[slug] && draft.menu[slug].doses) || "", 10);
    return sum + (Number.isNaN(n) ? 0 : n);
  }, 0);
}

/* Copies an archived week's data into the current draft, keeping the current draft's Week field. */
function plannerCopyEntryToCurrentWeek(entryId) {
  const entry = plannerLoadArchive().find((e) => e.id === entryId);
  if (!entry) return;
  const currentWeek = plannerLoadDraft().week;
  const copied = JSON.parse(JSON.stringify(entry));
  delete copied.id;
  delete copied.savedAt;
  copied.week = currentWeek;
  plannerSaveDraft(copied);
}

function plannerFormatWeekLabel(iso) {
  if (!iso) return "Semana sem data";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function plannerRandomDishAnyCategory() {
  const candidates = [];
  PLANNER_MENU_CATEGORIES.forEach((slug) => {
    plannerDishOptions(slug).forEach((d) => candidates.push(d));
  });
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function plannerRandomDish(categorySlug) {
  if (categorySlug === "extra") return plannerRandomDishAnyCategory();
  const options = plannerDishOptions(categorySlug);
  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)];
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

function plannerMenuRowOpenLinkHtml(slug, dishName) {
  const recipeSlug = plannerRecipeSlugForDish(slug, dishName);
  return `
    <a class="menu-row-open" data-category="${slug}" href="${recipeSlug ? `#/cat/${slug}/${recipeSlug}` : "#"}" ${recipeSlug ? "" : "hidden"} aria-label="Ver receita" title="Ver receita">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>
  `;
}

function plannerMenuRowHtml(slug, draft, readOnly) {
  const cat = findCategory(slug);
  const row = draft.menu[slug] || { dish: "", doses: "" };
  return `
    <div class="menu-row" style="--row-bg:${cat.pastel};--row-text:${cat.colorDark}">
      <span class="menu-row-label" draggable="${readOnly ? "false" : "true"}" data-category="${slug}">${cat.short}</span>
      <div class="menu-row-field">
        ${plannerMenuRowOpenLinkHtml(slug, row.dish)}
        <input type="text" class="menu-dish-input" data-category="${slug}" value="${escapeHtml(row.dish)}" ${readOnly ? "readonly" : ""} autocomplete="off" />
        ${readOnly ? "" : `<div class="menu-suggestions" data-category="${slug}" hidden></div>`}
        ${readOnly ? "" : `<button type="button" class="menu-row-generate" data-category="${slug}" aria-label="Gerar prato aleatório"><img src="assets/img/icons/sparkle-${slug}.svg" alt="" /></button>`}
      </div>
      <input type="text" class="menu-doses-input" data-category="${slug}" value="${escapeHtml(row.doses)}" ${readOnly ? "readonly" : ""} />
    </div>
  `;
}

function plannerExtraOpenLinkHtml(dishName) {
  const ref = plannerRecipeRefForDishAnyCategory(dishName);
  return `
    <a class="menu-row-open" data-category="extra" href="${ref ? `#/cat/${ref.category}/${ref.slug}` : "#"}" ${ref ? "" : "hidden"} aria-label="Ver receita" title="Ver receita">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
    </a>
  `;
}

function plannerExtraRowHtml(draft, readOnly) {
  const row = draft.menu.extra || { dish: "", doses: "" };
  return `
    <div class="menu-row" style="--row-bg:#FFCFE0;--row-text:#F884AF">
      <span class="menu-row-label" draggable="${readOnly ? "false" : "true"}" data-category="extra">EXTRA</span>
      <div class="menu-row-field">
        ${plannerExtraOpenLinkHtml(row.dish)}
        <input type="text" class="menu-dish-input" data-category="extra" value="${escapeHtml(row.dish)}" ${readOnly ? "readonly" : ""} autocomplete="off" />
        ${readOnly ? "" : `<button type="button" class="menu-row-generate" data-category="extra" aria-label="Gerar prato aleatório"><img src="assets/img/icons/sparkle-extra.svg" alt="" /></button>`}
      </div>
      <input type="text" class="menu-doses-input" data-category="extra" value="${escapeHtml(row.doses)}" ${readOnly ? "readonly" : ""} />
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
  const menuRows = PLANNER_MENU_CATEGORIES.map((slug) => plannerMenuRowHtml(slug, draft, readOnly)).join("")
    + plannerExtraRowHtml(draft, readOnly)
    + plannerTotalRowHtml(draft);

  const weeklyRows = PLANNER_DAYS.map((day) => `
    <div class="weekly-row">
      <div class="day-label"><span class="day-label-full">${day.label}</span><span class="day-label-short">${day.short}</span></div>
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
          <span class="menu-title-group">
            <span class="menu-title">Menu da semana</span>
            ${readOnly ? "" : `<button type="button" class="menu-generate-all" aria-label="Gerar menu aleatório"><img src="assets/img/icons/generate.svg" alt="" /></button>`}
          </span>
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

let plannerArchiveFilterMonth = "";
let plannerArchiveFilterYear = "";
let plannerArchiveSearchQuery = "";
let plannerArchiveSearchWasFocused = false;

function plannerArchiveEntryText(entry) {
  const dishNames = [...PLANNER_MENU_CATEGORIES, "extra"].map((slug) => (entry.menu && entry.menu[slug] && entry.menu[slug].dish) || "").join(" ");
  return `${dishNames} ${entry.notes || ""} ${entry.portions || ""}`.toLowerCase();
}

function plannerArchiveListHtml() {
  const archive = plannerLoadArchive();
  if (archive.length === 0) {
    return `<div class="empty-state"><span class="emoji">🗂️</span>Ainda não guardaste nenhuma semana.</div>`;
  }

  const years = Array.from(new Set(archive.filter((e) => e.week).map((e) => e.week.slice(0, 4)))).sort().reverse();
  const monthOptions = MONTH_NAMES_PT.map((m, i) => {
    const v = String(i + 1).padStart(2, "0");
    return `<option value="${v}" ${plannerArchiveFilterMonth === v ? "selected" : ""}>${m}</option>`;
  }).join("");
  const yearOptions = years.map((y) => `<option value="${y}" ${plannerArchiveFilterYear === y ? "selected" : ""}>${y}</option>`).join("");

  const filtersHtml = `
    <div class="archive-filters">
      <select class="archive-month-filter">
        <option value="">Mês (todos)</option>
        ${monthOptions}
      </select>
      <select class="archive-year-filter">
        <option value="">Ano (todos)</option>
        ${yearOptions}
      </select>
      <input type="text" class="archive-search" placeholder="Procurar prato, nota..." value="${escapeHtml(plannerArchiveSearchQuery)}" autocomplete="off" />
    </div>
  `;

  const filtered = archive.filter((entry) => {
    if (plannerArchiveFilterMonth || plannerArchiveFilterYear) {
      if (!entry.week) return false;
      const [y, mo] = entry.week.split("-");
      if (plannerArchiveFilterYear && y !== plannerArchiveFilterYear) return false;
      if (plannerArchiveFilterMonth && mo !== plannerArchiveFilterMonth) return false;
    }
    if (plannerArchiveSearchQuery) {
      if (!plannerArchiveEntryText(entry).includes(plannerArchiveSearchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const sorted = filtered.sort((a, b) => b.savedAt.localeCompare(a.savedAt));

  if (sorted.length === 0) {
    return `${filtersHtml}<div class="empty-state"><span class="emoji">🔍</span>Nenhuma semana encontrada com estes filtros.</div>`;
  }

  const cards = sorted.map((entry) => `
    <div class="archive-card">
      <div class="archive-card-head">
        <div>
          <strong>${escapeHtml(plannerFormatWeekLabel(entry.week))}</strong>
          <span class="archive-portions">Portions: ${escapeHtml(entry.portions)}</span>
        </div>
        <div class="archive-actions">
          <button type="button" class="archive-copy-btn" data-id="${entry.id}">Copiar para a semana atual</button>
          <button type="button" class="archive-toggle-btn" data-id="${entry.id}">${plannerArchiveOpenId === entry.id ? "Fechar" : "Ver"}</button>
          <button type="button" class="archive-delete-btn" data-id="${entry.id}">Apagar</button>
        </div>
      </div>
      ${plannerArchiveOpenId === entry.id ? `<div class="archive-card-body">${plannerFormHtml(entry, true)}</div>` : ""}
    </div>
  `).join("");
  return `${filtersHtml}<div class="archive-list">${cards}</div>`;
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

  // menu rows: keep each row's "view recipe" link in sync with its dish input
  function updateMenuRowOpenLink(slug) {
    const openLink = root.querySelector(`.menu-row-open[data-category="${slug}"]`);
    if (!openLink) return;
    if (slug === "extra") {
      const ref = plannerRecipeRefForDishAnyCategory(draft.menu.extra.dish);
      if (ref) {
        openLink.href = `#/cat/${ref.category}/${ref.slug}`;
        openLink.hidden = false;
      } else {
        openLink.hidden = true;
      }
      return;
    }
    const recipeSlug = plannerRecipeSlugForDish(slug, draft.menu[slug].dish);
    if (recipeSlug) {
      openLink.href = `#/cat/${slug}/${recipeSlug}`;
      openLink.hidden = false;
    } else {
      openLink.hidden = true;
    }
  }

  // menu rows: autocomplete
  root.querySelectorAll(".menu-dish-input").forEach((input) => {
    const slug = input.dataset.category;
    const suggestionsBox = root.querySelector(`.menu-suggestions[data-category="${slug}"]`);
    const dosesInput = root.querySelector(`.menu-doses-input[data-category="${slug}"]`);

    input.addEventListener("input", () => {
      draft.menu[slug].dish = input.value;
      persist();
      updateMenuRowOpenLink(slug);

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
        updateMenuRowOpenLink(slug);
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

    // sparkle button: random dish for this category only
    const generateBtn = root.querySelector(`.menu-row-generate[data-category="${slug}"]`);
    if (generateBtn) {
      generateBtn.addEventListener("click", () => {
        const pick = plannerRandomDish(slug);
        if (!pick) return;
        input.value = pick.name;
        draft.menu[slug].dish = pick.name;
        if (dosesInput) {
          dosesInput.value = pick.doses;
          draft.menu[slug].doses = pick.doses;
        }
        persist();
        updateMenuRowOpenLink(slug);
        const totalEl = root.querySelector(".menu-doses-total");
        if (totalEl) totalEl.textContent = plannerTotalDoses(draft);
      });
    }
  });

  // header sparkle button: random dish for every category at once
  const generateAllBtn = root.querySelector(".menu-generate-all");
  if (generateAllBtn) {
    generateAllBtn.addEventListener("click", () => {
      PLANNER_MENU_CATEGORIES.forEach((slug) => {
        const pick = plannerRandomDish(slug);
        if (!pick) return;
        draft.menu[slug].dish = pick.name;
        draft.menu[slug].doses = pick.doses;
        const rowInput = root.querySelector(`.menu-dish-input[data-category="${slug}"]`);
        const rowDoses = root.querySelector(`.menu-doses-input[data-category="${slug}"]`);
        if (rowInput) rowInput.value = pick.name;
        if (rowDoses) rowDoses.value = pick.doses;
        updateMenuRowOpenLink(slug);
      });
      persist();
      const totalEl = root.querySelector(".menu-doses-total");
      if (totalEl) totalEl.textContent = plannerTotalDoses(draft);
    });
  }

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

  // archive view: month/year filter + search
  const archiveMonthFilter = root.querySelector(".archive-month-filter");
  if (archiveMonthFilter) {
    archiveMonthFilter.addEventListener("change", () => {
      plannerArchiveFilterMonth = archiveMonthFilter.value;
      router();
    });
  }
  const archiveYearFilter = root.querySelector(".archive-year-filter");
  if (archiveYearFilter) {
    archiveYearFilter.addEventListener("change", () => {
      plannerArchiveFilterYear = archiveYearFilter.value;
      router();
    });
  }
  const archiveSearch = root.querySelector(".archive-search");
  if (archiveSearch) {
    archiveSearch.addEventListener("input", () => {
      plannerArchiveSearchQuery = archiveSearch.value;
      plannerArchiveSearchWasFocused = true;
      router();
    });
    if (plannerArchiveSearchWasFocused) {
      const val = archiveSearch.value;
      archiveSearch.focus();
      archiveSearch.setSelectionRange(val.length, val.length);
      plannerArchiveSearchWasFocused = false;
    }
  }

  root.querySelectorAll(".archive-copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Isto substitui a semana atual pelos dados desta semana do arquivo (exceto a data). Continuar?")) return;
      plannerCopyEntryToCurrentWeek(btn.dataset.id);
      plannerViewMode = "current";
      router();
    });
  });

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

/* ---------- Shopping list ---------- */

function shoppingDragHandleHtml(cls) {
  return `
    <span class="${cls}" title="Arrastar">
      <svg viewBox="0 0 10 16" width="10" height="16" fill="currentColor">
        <circle cx="2" cy="2" r="1.3"/><circle cx="8" cy="2" r="1.3"/>
        <circle cx="2" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/>
        <circle cx="2" cy="14" r="1.3"/><circle cx="8" cy="14" r="1.3"/>
      </svg>
    </span>
  `;
}

function shoppingRowHtml(item) {
  const keys = item.keys.join(",");
  const cbId = "shcb-" + keys.replace(/,/g, "_");
  return `
    <div class="shopping-row" data-keys="${keys}" data-order="${item.order}">
      ${shoppingDragHandleHtml("shopping-drag-handle")}
      <div class="shopping-check">
        <input type="checkbox" id="${cbId}" class="shopping-bought-check" data-keys="${keys}" />
        <label class="shopping-checkbox-visual" for="${cbId}"></label>
        <span class="shopping-item-text" contenteditable="true" spellcheck="false" data-singleline="true" data-item-keys="${keys}">${escapeHtml(item.text)}</span>
      </div>
      <label class="shopping-have-check" title="Já tenho em casa">
        <input type="checkbox" class="shopping-have-checkbox" data-keys="${keys}" />
        <img class="shopping-have-icon" src="assets/img/icons/house.svg" alt="Já tenho em casa" />
      </label>
    </div>
  `;
}

function shoppingSectionRowHtml(item) {
  const keys = item.keys.join(",");
  const cbId = "shcb-" + keys.replace(/,/g, "_");
  return `
    <div class="shopping-check">
      <input type="checkbox" id="${cbId}" class="shopping-section-toggle" data-keys="${keys}" checked />
      <label class="shopping-checkbox-visual" for="${cbId}"></label>
      <span class="shopping-item-text" contenteditable="true" spellcheck="false" data-singleline="true" data-item-keys="${keys}">${escapeHtml(item.text)}</span>
    </div>
  `;
}

function shoppingAddControlHtml(section) {
  if (shoppingAddOpenSection === section) {
    return `<input type="text" class="shopping-add-input" data-section="${escapeHtml(section)}" placeholder="Adicionar ingrediente..." autocomplete="off" />`;
  }
  return `<button type="button" class="shopping-add-btn" data-section="${escapeHtml(section)}" aria-label="Adicionar ingrediente a ${escapeHtml(section)}">+</button>`;
}

/* Default section order, with any saved custom order (from dragging whole
   sections) taking priority; sections not yet in the saved order (e.g. a
   category that never had items before) are appended at the end. */
function shoppingSectionOrder() {
  const custom = window.__shoppingSectionOrderCache;
  if (!custom || !custom.length) return SHOPPING_SECTION_ORDER;
  return [...custom, ...SHOPPING_SECTION_ORDER.filter((s) => !custom.includes(s))];
}

function renderShoppingList() {
  document.body.className = "cat-compras";
  const draft = plannerLoadDraft();
  const allItems = buildShoppingList(draft);
  const state = window.__shoppingListCache || {};

  const toBuy = mergeShoppingDuplicates(allItems.filter((it) => !state[it.key]));
  const have = mergeShoppingDuplicates(allItems.filter((it) => state[it.key] === "have"));
  const bought = mergeShoppingDuplicates(allItems.filter((it) => state[it.key] === "bought"));

  const toBuyHtml = toBuy.length
    ? shoppingSectionOrder()
        .map((section) => toBuy.filter((it) => it.section === section).sort((a, b) => a.order - b.order))
        .filter((group) => group.length)
        .map((group) => `
          <div class="shopping-section-group" data-section="${escapeHtml(group[0].section)}">
            <div class="list-header">
              ${shoppingDragHandleHtml("shopping-section-drag-handle")}
              <span class="list-pill">${escapeHtml(group[0].section)}</span>
            </div>
            <div class="shopping-list">${group.map(shoppingRowHtml).join("")}</div>
            ${shoppingAddControlHtml(group[0].section)}
          </div>
        `).join("")
    : `<div class="empty-state"><span class="emoji">🛒</span>Sem ingredientes por comprar.<br/>Adiciona pratos ao Menu da semana.</div>`;

  const haveSection = have.length ? `
    <div class="wavy-wrap">
      <div class="wavy-frame">
        <div class="wavy-inner">
          <div class="list-header"><span class="list-pill list-pill-inverted">Já tenho em casa</span></div>
          <div class="shopping-list shopping-list-secondary">${have.map(shoppingSectionRowHtml).join("")}</div>
        </div>
      </div>
    </div>
  ` : "";

  const boughtSection = bought.length ? `
    <div class="wavy-wrap">
      <div class="wavy-frame">
        <div class="wavy-inner">
          <div class="list-header"><span class="list-pill list-pill-inverted">Comprado</span></div>
          <div class="shopping-list shopping-list-secondary">${bought.map(shoppingSectionRowHtml).join("")}</div>
        </div>
      </div>
    </div>
  ` : "";

  return `
    <div class="app-shell">
      <main class="main">
        <div class="banner">
          <div class="banner-left">
            <a class="back-link" href="#/">← Categorias</a>
            <h1>Lista de Compras</h1>
          </div>
          <div class="banner-tagline">Gerada automaticamente a partir do Menu da semana atual.</div>
        </div>

        ${tabbarHtml("compras")}

        <div class="wavy-wrap">
          <div class="wavy-frame">
            <div class="wavy-inner">
              ${toBuy.length ? `<div class="shopping-list-head">Comprado</div>` : ""}
              ${toBuyHtml}
            </div>
          </div>
        </div>
        ${haveSection}
        ${boughtSection}
      </main>
    </div>
  `;
}

function bindShoppingListEvents() {
  const setAll = (cb, state) => {
    if (!window.saveShoppingListStateRemote) return;
    cb.dataset.keys.split(",").forEach((key) => window.saveShoppingListStateRemote(key, state));
  };
  document.querySelectorAll(".shopping-bought-check").forEach((cb) => {
    cb.addEventListener("change", () => {
      setAll(cb, cb.checked ? "bought" : "");
      router();
    });
  });
  document.querySelectorAll(".shopping-have-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => {
      setAll(cb, cb.checked ? "have" : "");
      router();
    });
  });
  document.querySelectorAll(".shopping-section-toggle").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) return;
      setAll(cb, "");
      router();
    });
  });
  document.querySelectorAll(".shopping-add-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      shoppingAddOpenSection = btn.dataset.section;
      router();
      const input = document.querySelector(".shopping-add-input");
      if (input) input.focus();
    });
  });
  document.querySelectorAll(".shopping-add-input").forEach((input) => {
    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      const text = input.value.trim();
      shoppingAddOpenSection = null;
      if (text && window.saveManualShoppingItemRemote) {
        const id = "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        window.saveManualShoppingItemRemote(id, { section: input.dataset.section, text });
      }
      router();
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { committed = true; shoppingAddOpenSection = null; router(); }
    });
    input.addEventListener("blur", commit);
  });

  shoppingEnableItemDrag();
  shoppingEnableSectionDrag();
}

/* Drag & drop for a single ingredient row: reorders it within its section,
   or — dropped on another section's list — moves it there. Pointer Events
   (not native HTML5 DnD, which touch browsers largely ignore) drive a live
   DOM reorder as the pointer moves; on release, the new order/section is
   read back off the DOM and persisted via shoppingApplyItemPatch. */
function shoppingEnableItemDrag() {
  document.querySelectorAll(".shopping-drag-handle").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      const row = handle.closest(".shopping-row");
      if (!row) return;
      e.preventDefault();
      const keys = row.dataset.keys.split(",");
      let lastY = e.clientY;
      row.setPointerCapture(e.pointerId);
      row.classList.add("dragging");

      const onMove = (ev) => {
        const y = ev.clientY;
        const target = document.elementFromPoint(ev.clientX, y);
        const targetRow = target && target.closest(".shopping-row");
        if (targetRow && targetRow !== row) {
          const rect = targetRow.getBoundingClientRect();
          const before = y < rect.top + rect.height / 2;
          targetRow.parentNode.insertBefore(row, before ? targetRow : targetRow.nextSibling);
        } else {
          const targetList = target && target.closest(".shopping-list:not(.shopping-list-secondary)");
          if (targetList && !targetList.contains(row)) targetList.appendChild(row);
        }
        lastY = y;
      };

      const onUp = () => {
        row.releasePointerCapture(e.pointerId);
        row.classList.remove("dragging");
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);

        const list = row.parentNode;
        const group = row.closest(".shopping-section-group");
        const section = group ? group.dataset.section : null;
        const rows = [...list.querySelectorAll(".shopping-row")];
        const idx = rows.indexOf(row);
        const prevOrder = idx > 0 ? parseFloat(rows[idx - 1].dataset.order) : null;
        const nextOrder = idx < rows.length - 1 ? parseFloat(rows[idx + 1].dataset.order) : null;
        let order;
        if (prevOrder != null && nextOrder != null) order = (prevOrder + nextOrder) / 2;
        else if (prevOrder != null) order = prevOrder + 1;
        else if (nextOrder != null) order = nextOrder - 1;
        else order = 0;

        keys.forEach((key) => shoppingApplyItemPatch(key, section ? { order, section } : { order }));
        router();
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    });
  });
}

/* Drag & drop for a whole section block — reorders it among the other
   sections and persists the resulting order so it stays that way. */
function shoppingEnableSectionDrag() {
  document.querySelectorAll(".shopping-section-drag-handle").forEach((handle) => {
    handle.addEventListener("pointerdown", (e) => {
      const group = handle.closest(".shopping-section-group");
      if (!group) return;
      e.preventDefault();
      group.setPointerCapture(e.pointerId);
      group.classList.add("dragging");

      const onMove = (ev) => {
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        const targetGroup = target && target.closest(".shopping-section-group");
        if (targetGroup && targetGroup !== group) {
          const rect = targetGroup.getBoundingClientRect();
          const before = ev.clientY < rect.top + rect.height / 2;
          targetGroup.parentNode.insertBefore(group, before ? targetGroup : targetGroup.nextSibling);
        }
      };

      const onUp = () => {
        group.releasePointerCapture(e.pointerId);
        group.classList.remove("dragging");
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);

        const order = [...group.parentNode.querySelectorAll(".shopping-section-group")].map((g) => g.dataset.section);
        if (window.saveShoppingSectionOrderRemote) window.saveShoppingSectionOrderRemote(order);
        router();
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    });
  });
}

/* Delegated: inline-edited ingredient text (contenteditable) — empty text
   deletes the item(s), otherwise the new text is saved on the first
   underlying key and any other keys sharing a merged row are dropped (a
   merged/summed row is collapsed into one line once edited). */
document.addEventListener("focusout", (e) => {
  const el = e.target.closest(".shopping-item-text[data-item-keys]");
  if (!el || !el.isContentEditable) return;
  const keys = el.dataset.itemKeys.split(",");
  const text = el.textContent.replace(/\u00a0/g, " ").trim();
  if (!text) {
    keys.forEach((key) => shoppingApplyItemPatch(key, { deleted: true }));
  } else {
    shoppingApplyItemPatch(keys[0], { text });
    keys.slice(1).forEach((key) => shoppingApplyItemPatch(key, { deleted: true }));
  }
  router();
});

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
