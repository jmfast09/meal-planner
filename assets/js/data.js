/* Meal Planner — data
 * All category and recipe content lives here. Edit this file to add/change recipes.
 */

const CATEGORIES = [
  {
    slug: "bake",
    short: "BAKE",
    title: "Life is what you bake it",
    tagline: "Warm, golden, and straight from the oven — comfort and coziness.",
    color: "#F2776B",
    colorDark: "#FF8181",
    light: "#FCEEEA",
    pastel: "#FAD2CE",
    type: "recipes",
  },
  {
    slug: "pasta",
    short: "PASTA",
    title: "Pasta la vista baby",
    tagline: "From creamy classics to bold twists, these pasta plates never disappoint.",
    color: "#FFCB28",
    colorDark: "#FFCB28",
    light: "#FFEFBC",
    pastel: "#FFEFBC",
    type: "recipes",
  },
  {
    slug: "classics",
    short: "CLASSICS",
    title: "It's a great opportunaty",
    tagline: "A mix of sea-inspired dishes and timeless favorites that never go out of style.",
    color: "#4FA3C2",
    colorDark: "#4696A6",
    light: "#EAF6FB",
    pastel: "#9EE2F1",
    type: "recipes",
  },
  {
    slug: "world",
    short: "WORLD",
    title: "Taco a chance on me",
    tagline: "A little spice, a lot of soul. Flavors that bring the world to your plate.",
    color: "#34A897",
    colorDark: "#57A292",
    light: "#E8FAF6",
    pastel: "#93E9D7",
    type: "recipes",
  },
  {
    slug: "healthy",
    short: "HEALTHY",
    title: "Healthy ever after",
    tagline: "Light, fresh, and nourishing — feel-good food.",
    color: "#6FA83C",
    colorDark: "#67BFAD",
    light: "#F1FAE6",
    pastel: "#DCF9B6",
    type: "recipes",
  },
  {
    slug: "easy",
    short: "EASY",
    title: "Let it go",
    tagline: "No stress, no mess — just good food made simple. Perfect for busy days or lazy nights.",
    color: "#6B7FD7",
    colorDark: "#92A2E6",
    light: "#EEF0FC",
    pastel: "#DCE3FE",
    type: "simple-list",
    listLabel: "Lista de Easy meals",
  },
  {
    slug: "sides",
    short: "SIDES",
    title: "Sunny sides up",
    tagline: "Every great meal deserves a little backup. From crispy, crunchy, to fresh and bright.",
    color: "#DB6E97",
    colorDark: "#F884AF",
    light: "#FDEFF4",
    pastel: "#FFCFE0",
    type: "grid-list",
  },
];

const MONTH_NAMES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/* Shared (cross-device) recipe content overrides (name/doses/tempo/ingredients/steps/notas),
   so recipe text can be edited in place without touching the shipped data. Synced live via
   Firestore — see assets/js/firebase-sync.js, which maintains window.__recipeEditsCache and
   exposes window.saveRecipeEditRemote(). */
function getRecipeEdit(catSlug, recipeSlug, field, fallback) {
  const cache = window.__recipeEditsCache;
  const value = cache && cache[catSlug] && cache[catSlug][recipeSlug] && cache[catSlug][recipeSlug][field];
  return value !== undefined ? value : fallback;
}

function saveRecipeEdit(catSlug, recipeSlug, field, value) {
  if (window.saveRecipeEditRemote) window.saveRecipeEditRemote(catSlug, recipeSlug, field, value);
}

/* Returns a copy of the recipe with any saved user edits applied on top of the built-in data. */
function getEffectiveRecipe(catSlug, recipe) {
  if (!recipe) return recipe;
  const slug = recipe.slug;
  const eff = { ...recipe };
  eff.name = getRecipeEdit(catSlug, slug, "name", recipe.name);
  eff.doses = getRecipeEdit(catSlug, slug, "doses", String(recipe.doses));
  if (recipe.tempo !== undefined) {
    eff.tempo = getRecipeEdit(catSlug, slug, "tempo", recipe.tempo);
  }
  if (recipe.ingredients) {
    eff.ingredients = recipe.ingredients.map((ing, i) => getRecipeEdit(catSlug, slug, `ingredient${i}`, ing));
  }
  if (recipe.ingredientsExtra) {
    eff.ingredientsExtra = {
      title: getRecipeEdit(catSlug, slug, "ingredientsExtraTitle", recipe.ingredientsExtra.title),
      items: recipe.ingredientsExtra.items.map((it, i) => getRecipeEdit(catSlug, slug, `ingredientExtra${i}`, it)),
    };
  }
  if (recipe.preparacao) {
    eff.preparacao = recipe.preparacao.map((step, i) => getRecipeEdit(catSlug, slug, `prep${i}`, step));
  }
  if (recipe.notas !== undefined) {
    eff.notas = getRecipeEdit(catSlug, slug, "notas", recipe.notas);
  }
  eff.iconData = getRecipeEdit(catSlug, slug, "iconData", recipe.iconData);
  return eff;
}

/* ---------- Doses scaling ----------
   Recalculates ingredient quantities when the "doses" up-arrow bumps the
   serving count by 1. Always computed from the recipe's *standard* (shipped
   or as-created) doses and ingredient text, never from a previous scaling —
   this avoids compounding rounding errors across repeated clicks. */

// "bacon" intentionally excluded: it's a garnish-quantity ingredient in
// Carbonara (the only recipe that uses it), not a main protein cut, and
// scales proportionally rather than by the flat +150g/extra-dose rule below.
const DOSES_MEAT_RED_KEYWORDS = ["carne", "vaca", "porco", "borrego", "novilho", "bovino"];
const DOSES_MEAT_WHITE_KEYWORDS = ["frango", "peru"];
// Ground/mixed-meat sauces where a whole extra 150g cut doesn't make sense.
const DOSES_LOW_MEAT_SLUGS = ["bolonhesa", "lasanha"];

// Things that don't scale with serving size — only doubles/triples/etc. once
// doses reach a whole multiple of the recipe's standard doses. Kept narrow to
// dry seasonings/small quantities and stock; liquids and dairy (wine,
// butter, flour, milk, water, cream, sauces) scale proportionally like
// everything else. "folha(s) de massa" stays here pending a still-unresolved
// halve-below/double-above-standard rule for whole-sheet-count ingredients.
const DOSES_EXCLUDED_KEYWORDS = [
  "folha de massa", "folhas de massa",
  "tempero", "oregao", "noz-moscada", "noz moscada", "canela", "colorau", "paprika",
  "curcuma", "caril", "alho em po", "gengibre em po", "mostarda", "ketchup", "maionese",
  "vinagre", "louro", "oleo",
  "dente de alho", "dentes de alho",
  "caldo",
];

function normalizeForDoseMatch(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function doseIngredientExcluded(text) {
  const n = normalizeForDoseMatch(text);
  return DOSES_EXCLUDED_KEYWORDS.some((k) => n.includes(k));
}

function doseIngredientMeatKind(text) {
  const n = normalizeForDoseMatch(text);
  if (DOSES_MEAT_RED_KEYWORDS.some((k) => n.includes(k))) return "red";
  if (DOSES_MEAT_WHITE_KEYWORDS.some((k) => n.includes(k))) return "white";
  return null;
}

const DOSE_NUM = "(\\d+\\/\\d+|\\d+(?:[.,]\\d+)?)";
function parseDoseNum(raw) {
  if (raw.includes("/")) {
    const [n, d] = raw.split("/").map(Number);
    return n / d;
  }
  return parseFloat(raw.replace(",", "."));
}

/* Parses a leading quantity off an ingredient line so it can be scaled:
   spoon measures ("1 c. sopa de X"), metric (g/kg/ml/l), a counting noun
   (dentes, folhas, embalagens, cubos, bolbos, gemas, maçarocas), or a bare
   "N description" (e.g. "2 abacates"). Returns null for lines with no
   leading number — nothing to scale (e.g. "Sal", "Queijo cottage"). */
function parseDoseQuantity(text) {
  const s = text.trim();

  let m = s.match(new RegExp(`^${DOSE_NUM}\\s*(c\\.\\s*(?:de\\s*)?(?:sopa|ch[aá]))\\s+de\\s+(.+)$`, "i"));
  if (m) return { amount: parseDoseNum(m[1]), unitLabel: m[2].trim(), rest: m[3], kind: "spoon" };

  m = s.match(new RegExp(`^${DOSE_NUM}\\s*(kg|g|ml|l|litros?)\\b\\.?\\s*de\\s+(.+)$`, "i"));
  if (m) {
    let unit = m[2].toLowerCase();
    if (unit.startsWith("litro")) unit = "l";
    return { amount: parseDoseNum(m[1]), unitLabel: unit, rest: m[3], kind: "metric" };
  }

  m = s.match(new RegExp(`^${DOSE_NUM}\\s+(dentes?|folhas?|embalage(?:m|ns)|cubos?|bolbos?|gemas?|ma[cç]arocas?)\\s+de\\s+(.+)$`, "i"));
  if (m) return { amount: parseDoseNum(m[1]), unitLabel: m[2].toLowerCase(), rest: m[3], kind: "noun" };

  m = s.match(new RegExp(`^${DOSE_NUM}\\s+(.+)$`));
  if (m) return { amount: parseDoseNum(m[1]), unitLabel: null, rest: m[2], kind: "bare" };

  return null;
}

function formatDoseNumber(n) {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

// Rounds a scaled gram amount to a "nice" kitchen-friendly number instead of
// leaving an odd value like 583.3 — but only when it isn't already a whole
// number of grams, so an exact result (e.g. 75g) is left untouched.
function roundNiceGramsDoseAmount(v) {
  const v2 = Math.round(v * 100) / 100;
  if (Number.isInteger(v2)) return v2;
  return Math.round(v2 / 10) * 10;
}

function pluralizePt(stem) {
  return /m$/i.test(stem) ? stem.slice(0, -1) + "ns" : stem + "s";
}
function singularizeWordPt(word) {
  if (/ns$/i.test(word)) return word.slice(0, -2) + "m";
  if (/(r|z)es$/i.test(word)) return word.slice(0, -2);
  if (/s$/i.test(word)) return word.slice(0, -1);
  return word;
}
function pluralizeWordPt(word) {
  if (/s$/i.test(word)) return word;
  if (/m$/i.test(word)) return word.slice(0, -1) + "ns";
  if (/(r|z)$/i.test(word)) return word + "es";
  return word + "s";
}

// Adjusts number agreement across the head of a free-text description (the
// noun and any immediately-following adjectives), stopping at the first
// preposition/conjunction/comma/parenthesis so e.g. "iogurte sem lactose"
// only pluralizes "iogurte", not "lactose". Imperfect Portuguese grammar in
// general, but covers the plain noun+adjective phrases used here.
function adjustPluralityPt(rest, makePlural) {
  const stopMatch = rest.search(/[,(]|\s+(?:de|com|sem|para|e|ou)\s+/i);
  const head = stopMatch === -1 ? rest : rest.slice(0, stopMatch);
  const tail = stopMatch === -1 ? "" : rest.slice(stopMatch);
  const fn = makePlural ? pluralizeWordPt : singularizeWordPt;
  const newHead = head.split(/(\s+)/).map((tok) => (/^\s*$/.test(tok) ? tok : fn(tok))).join("");
  return newHead + tail;
}

function formatDoseQuantity(parsed, newAmount) {
  const amountStr = formatDoseNumber(newAmount);
  if (parsed.kind === "metric") {
    if (parsed.unitLabel === "g" && newAmount >= 1000) {
      return `${formatDoseNumber(newAmount / 1000)}kg de ${parsed.rest}`;
    }
    if (parsed.unitLabel === "ml" && newAmount >= 1000) {
      return `${formatDoseNumber(newAmount / 1000)}l de ${parsed.rest}`;
    }
    return `${amountStr}${parsed.unitLabel} de ${parsed.rest}`;
  }
  if (parsed.kind === "spoon") return `${amountStr} ${parsed.unitLabel} de ${parsed.rest}`;
  if (parsed.kind === "noun") {
    const stem = singularizeWordPt(parsed.unitLabel);
    const noun = newAmount === 1 ? stem : pluralizePt(stem);
    return `${amountStr} ${noun} de ${parsed.rest}`;
  }
  const wasPlural = parsed.amount !== 1;
  const isPlural = newAmount !== 1;
  const rest = wasPlural !== isPlural ? adjustPluralityPt(parsed.rest, isPlural) : parsed.rest;
  return `${amountStr} ${rest}`;
}

// Handles ingredients still phrased as "N embalagens de X (Y uni)" — scales
// the package count to the nearest half-package and the annotated unit count
// to the nearest even number. Prefer writing new ingredients with their real
// weight/count instead (e.g. "300g de bacon em cubos") so they scale via
// plain proportional math with no special-casing; this stays only as a
// fallback for recipes already written the old way.
function scaleEmbalagemWithUniCount(parsed, ratio) {
  const newPkg = Math.round(parsed.amount * ratio * 2) / 2;
  const uniMatch = parsed.rest.match(/^(.*)\((\s*)(\d+)(\s*uni[^)]*)\)(.*)$/i);
  if (!uniMatch) return formatDoseQuantity(parsed, newPkg);
  const originalUni = parseInt(uniMatch[3], 10);
  const newUni = Math.ceil((originalUni * ratio) / 2) * 2;
  const stem = singularizeWordPt(parsed.unitLabel);
  const noun = newPkg === 1 ? stem : pluralizePt(stem);
  const rest = `${uniMatch[1]}(${newUni}${uniMatch[4]})${uniMatch[5]}`;
  return `${formatDoseNumber(newPkg)} ${noun} de ${rest}`;
}

/* Scales one ingredient line from standardDoses to newDoses (either
   direction — the doses stepper can go up or down, with a floor of 1):
   - excluded (pantry/seasoning items) only double/triple/etc. once newDoses
     reaches a whole multiple of standardDoses on the way up, and never
     shrink below the original amount on the way down.
   - red/white meat (in whole grams) gets +150g/+180g per extra dose beyond
     standard (+100g for red meat in bolonhesa/lasanha-style ground-meat
     sauces) when increasing — decreasing falls back to proportional
     scaling, since the additive rule can go negative in reverse.
   - everything else scales proportionally, rounded up to a whole unit (for
     counts) or a nice kitchen amount (for grams/ml). */
function scaleRecipeIngredientText(text, standardDoses, newDoses, recipeSlug) {
  if (!text || !text.trim() || !standardDoses) return text;
  const ratio = newDoses / standardDoses;
  if (ratio === 1) return text;

  const excluded = doseIngredientExcluded(text);
  const parsed = parseDoseQuantity(text);
  if (!parsed) return text;

  if (excluded) {
    const multiplier = Math.max(1, Math.floor(newDoses / standardDoses));
    if (multiplier === 1) return text;
    return formatDoseQuantity(parsed, parsed.amount * multiplier);
  }

  const meatKind = doseIngredientMeatKind(text);
  if (ratio > 1 && meatKind && parsed.kind === "metric" && parsed.unitLabel === "g") {
    const extraDoses = newDoses - standardDoses;
    const isLowMeat = DOSES_LOW_MEAT_SLUGS.some((s) => recipeSlug.includes(s));
    const perDose = meatKind === "red" ? (isLowMeat ? 100 : 150) : 180;
    return formatDoseQuantity(parsed, parsed.amount + extraDoses * perDose);
  }

  if (parsed.kind === "noun" && /^embalage/.test(parsed.unitLabel) && /\(\s*\d+\s*uni/i.test(parsed.rest)) {
    return scaleEmbalagemWithUniCount(parsed, ratio);
  }

  const rawScaled = parsed.amount * ratio;
  let newAmount;
  if (parsed.kind === "metric" && parsed.unitLabel === "g") {
    newAmount = roundNiceGramsDoseAmount(rawScaled);
  } else if (parsed.kind === "metric") {
    // ml/l/kg: keep the exact proportional value (no coarse rounding).
    newAmount = rawScaled;
  } else {
    newAmount = Math.max(1, Math.ceil(rawScaled));
  }
  return formatDoseQuantity(parsed, newAmount);
}

/* Recipes created in-app (via the "+" button), shared across devices through
   Firestore — see firebase-sync.js, which maintains window.__newRecipesCache
   and exposes window.saveNewRecipeRemote(). Layered on top of the built-in
   RECIPES so newly created recipes show up in lists, search, and the
   Planner's Menu da semana just like the shipped ones. */
function getAllRecipes(catSlug) {
  const base = RECIPES[catSlug] || [];
  const cache = window.__newRecipesCache;
  const extra = cache && cache[catSlug]
    ? Object.keys(cache[catSlug]).map((slug) => ({ slug, ...cache[catSlug][slug] }))
    : [];
  // If a recreated recipe reuses the slug of a deleted built-in one, let the
  // recreated (newer) version win instead of showing both under one slug.
  const extraSlugs = new Set(extra.map((r) => r.slug));
  const merged = [...base.filter((r) => !extraSlugs.has(r.slug)), ...extra];
  return merged.filter((r) => !getRecipeEdit(catSlug, r.slug, "hidden", false));
}

function slugifyRecipeName(name) {
  const slug = name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "receita";
}

function uniqueRecipeSlug(catSlug, baseSlug) {
  const existing = new Set(getAllRecipes(catSlug).map((r) => r.slug));
  if (!existing.has(baseSlug)) return baseSlug;
  let i = 2;
  while (existing.has(`${baseSlug}-${i}`)) i++;
  return `${baseSlug}-${i}`;
}

/* Weekly meal planner — first tab, kept separate from CATEGORIES since it
   isn't a recipe category (no cover card, no recipe list). */
const PLANNER_TAB = {
  slug: "planner",
  short: "PLANNER",
  pastel: "#FFD6C2",
  colorDark: "#F59E72",
};

/* Categories shown as rows in the "Menu da semana" table (Sides excluded — no doses). */
const PLANNER_MENU_CATEGORIES = ["bake", "pasta", "classics", "world", "healthy", "easy"];

/* Days of the weekly grid, in display order (starts Sunday, ends Saturday). Weekdays get the
   tupperware selector on the Almoço cell; tupperwareDefault sets its starting count. */
const PLANNER_DAYS = [
  { key: "domingo", label: "DOMINGO", short: "DOM", weekday: false },
  { key: "segunda", label: "SEGUNDA", short: "SEG", weekday: true, tupperwareDefault: 0 },
  { key: "terca", label: "TERÇA", short: "TER", weekday: true, tupperwareDefault: 0 },
  { key: "quarta", label: "QUARTA", short: "QUA", weekday: true, tupperwareDefault: 1 },
  { key: "quinta", label: "QUINTA", short: "QUI", weekday: true, tupperwareDefault: 1 },
  { key: "sexta", label: "SEXTA", short: "SEX", weekday: true, tupperwareDefault: 0 },
  { key: "sabado", label: "SÁBADO", short: "SÁB", weekday: false },
];

const RECIPES = {
  bake: [
    {
      slug: "dumpling-bake",
      name: "Dumpling Bake",
      icon: "dumpling-bake",
      doses: 3,
      tempo: "40 min",
      ingredients: [
        "24 gyosas congeladas",
        "2 dentes de alho",
        "1 c. sopa de gengibre em pó",
        "1 c. sopa de caril em pó",
        "2 c. sopa de molho de soja",
        "400ml de leite de coco",
        "250ml de caldo de frango",
        "Ramos de cebolinho",
        "Lima",
        "Sementes de sésamo",
      ],
      preparacao: [
        "Pré-aquecer o forno a 200ºC.",
        "Picar os dentes de alho.",
        "Num pirex grande, juntar o leite de coco, o gengibre, o caril, o molho de soja, caldo de frango, sumo de lima e o alho picado. Mexer bem.",
        "Adicionar o cebolinho, cortando com uma tesoura em rodelas de 1cm, e as gyosas numa única camada. Com uma colher, colocar um pouco da mistura por cima das gyosas.",
        "Espremer um pouco de sumo de lima no topo e polvilhar as sementes de sésamo.",
        "Levar ao forno durante 25 minutos, até as gyosas estarem macias.",
        "Retirar do forno, cortar as gyosas ao meio e servir numa taça de ramen com pauzinhos e colher.",
      ],
      notas: "Gyosas de vegetais = 3 doses\nGyosas de frango e cogumelos = 4 doses",
    },
    {
      slug: "lasanha",
      name: "Lasanha",
      icon: "lasanha",
      doses: 6,
      tempo: "1h30",
      ingredients: [
        "6 folhas de massa",
        "600g de carne de vaca picada",
        "1 cebola grande",
        "3 folhas de louro",
        "250 ml de vinho tinto",
        "500 g de polpa de tomate",
        "1/2 litro de caldo de carne",
        "Sal e pimenta",
        "Flamengo ralado",
        "Mozarella fresca",
        "Salada para acompanhar",
      ],
      ingredientsExtra: {
        title: "Béchamel",
        items: [
          "45g de manteiga",
          "60g de farinha",
          "600 ml de leite",
          "30g de parmesão ralado",
          "Noz-moscada",
          "Sal e pimenta",
        ],
      },
      preparacao: [
        "Picar finamente a cebola e adicionar ao wok com um pouco de azeite. Juntar a carne, temperar e cozinhar até escurecer. Juntar as folhas de louro.",
        "Adicionar o vinho e cozinhar até o álcool evaporar. Depois, juntar a polpa de tomate, o caldo, sal e pimenta. Levantar fervura e cobrir, deixando reduzir.",
        "Pré-aquecer o forno a 180ºC.",
        "Para o béchamel, derreter a manteiga num tacho. Adicionar a farinha, misturar e cozinhar durante alguns minutos.",
        "Juntar gradualmente o leite, mexendo continuamente. Cozinhar durante alguns minutos em lume brando e mexer. Remover do lume e adicionar o queijo, noz-moscada, sal e pimenta a gosto.",
        "Retificar os temperos da carne. Adicionar um pouco no fundo do pirex, depois folhas de massa, seguidas de uma camada de carne, uma camada de béchamel, e flamengo ralado. Repetir até terminarem as folhas.",
        "Terminar com molho bechamel, flamengo ralado e mozarella fresca. Levar ao forno durante 35 minutos.",
      ],
      notas: "",
    },
    {
      slug: "lasanha-ricotta-espinafres",
      name: "Lasanha de Ricotta e Espinafres",
      icon: "lasanha-ricotta",
      doses: 6,
      tempo: "1h",
      ingredients: [
        "6 folhas de massa",
        "1 cebola grande",
        "1 dente de alho",
        "250g de espinafres congelados",
        "1 ovo",
        "250ml de creme de soja",
        "400g de ricotta",
        "125g de parmesão ralado",
        "Queijo mozarella ralado",
        "Mozarella fresca",
        "Salada para acompanhar",
      ],
      preparacao: [
        "Pré-aquecer o forno a 180ºC.",
        "Aquecer o wok com um fio de azeite. Adicionar a cebola e o alho picados e cozinhar durante 2 a 3 minutos.",
        "Juntar os espinafres e cozinhar até descongelarem e perderem a maior parte da água.",
        "Retirar do lume e deixar arrefecer ligeiramente.",
        "Misturar a ricotta, o ovo, parmesão ralado, sal e pimenta. Adicionar os espinafres e envolver bem.",
        "Espalhar uma fina camada do creme de soja no fundo do pirex. Adicionar 1/3 do recheio, polvilhar a mozarella ralada e adicionar uma camada de folhas de massa.",
        "Repetir até terminarem as folhas e o recheio.",
        "Terminar com o creme de soja, mozarella ralada e mozarella fresca. Levar ao forno durante 35 minutos.",
      ],
      notas: "Sal acima do ponto porque seca no forno",
    },
    {
      slug: "gratinado-batata-alho-frances",
      name: "Gratinado de Batata e Alho Francês",
      icon: "gratinado",
      doses: 6,
      tempo: "1h30",
      ingredients: [
        "3 c. de sopa de manteiga",
        "6-8 bolbos de alho francês",
        "10 batatas pequenas",
        "1 dente de alho",
        "Noz-moscada",
        "400ml de natas",
        "Sal e pimenta",
        "Flamengo ralado",
        "Pão ralado",
        "Salada para acompanhar",
      ],
      preparacao: [
        "Untar a casserole La Creuset com manteiga. Descascar e cortar as batatas em rodelas com 5mm de espessura. Pré-aquecer o forno a 180ºC.",
        "Cobrir as batatas em água fria e cozer durante 15 min (picar com um garfo e retirar se moles).",
        "Num wok, saltear o alho francês com azeite e o alho picado. Refogar durante alguns minutos até ficar macio e translúcido. Temperar com noz-moscada e refogar mais alguns minutos.",
        "Adicionar as natas, sal e pimenta e misturar. Cozinhar, mexendo até engrossar. Retificar temperos. Adicionar noz moscada. Retirar do lume.",
        "Colocar um terço das batatas na casserole, espalhando-as para que se sobreponham e cubram o fundo da assadeira. Verter um terço da mistura de alho francês e espalhar para cobrir as batatas uniformemente. Polvilhar o queijo ralado. Repetir mais duas vezes, colocando as batatas, a mistura e o queijo em camadas.",
        "Derreter a restante manteiga no micro-ondas. Juntar o pão ralado e temperar com sal e pimenta. Polvilhar uniformemente por cima do gratinado.",
        "Levar ao forno por 30 minutos. Servir com salada.",
      ],
      notas: "Sal acima do ponto porque seca no forno",
    },
  ],

  pasta: [
    {
      slug: "carbonara",
      name: "Carbonara",
      icon: "carbonara",
      doses: 4,
      tempo: "30 min",
      ingredients: [
        "400g de esparguete",
        "300g de bacon em cubos",
        "1 ovo inteiro",
        "2 gemas de ovo",
        "150g de parmesão ralado",
        "Sal",
        "Azeite",
        "Pimenta",
      ],
      preparacao: [
        "Enquanto a água para a cozedura da massa aquece, ralar o queijo. Deixar um pouco de água no jarro.",
        "Num wok, saltear o bacon num fio de azeite. Cozer a massa durante 7 minutos.",
        "Numa tijela grande, bater os ovos com o queijo, mexer bem e temperar com sal e pimenta.",
        "Escorrer a massa da água e adicioná-la ao wok com o bacon. Misturar tudo.",
        "Juntar a massa com o bacon à tijela com o molho, mexer bem e juntar um pouco da água quente do jarro.",
        "Servir com parmesão ralado e pimenta.",
      ],
      notas: "",
    },
    {
      slug: "bolonhesa",
      name: "Bolonhesa",
      icon: "bolonhesa",
      doses: 4,
      tempo: "30 min",
      ingredients: [
        "300g de esparguete",
        "400g de carne de vaca picada",
        "300 g de polpa de tomate",
        "Meia cebola",
        "Sal e pimenta",
        "Azeite",
        "Orégãos",
        "Parmesão ralado",
      ],
      preparacao: [
        "Enquanto a água para a cozedura da massa aquece, ralar o queijo.",
        "Numa panela, cozer a massa durante 7 minutos. Picar a cebola.",
        "Escorrer a massa da água e adicionar um pouco de manteiga para não colar. Reservar.",
        "Saltear a panela com azeite e a cebola picada.",
        "Juntar a carne, temperar e cozinhar até escurecer.",
        "Adicionar a polpa de tomate e cozinhar durante alguns minutos em lume brando.",
        "Adicionar um pequeno fio de vinagre. Retificar os temperos da carne.",
        "Servir com parmesão ralado.",
      ],
      notas: "",
    },
    {
      slug: "vegan-mac-cheese",
      name: '"Vegan" Mac & Cheese',
      icon: "vegan-mac-cheese",
      doses: 4,
      tempo: "40 min",
      ingredients: [
        "200g de cajus",
        "500ml de água",
        "4 c. sopa de levedura nutricional",
        "350g de massa cotevelinho",
        "150g de mozarella ralada",
        "1 c. sopa de mostarda dijon",
        "1 c. chá de curcuma",
        "1 c. chá de alho em pó",
        "Sal",
      ],
      preparacao: [
        "Pré-aquecer o forno a 180ºC.",
        "Para amolecer os cajus, cobri-los com água a ferver durante 5 minutos.",
        "Cozinhar a massa de acordo com as instruções.",
        "Escorrer os cajus e juntar a uma blender com a levedura nutricional, mostarda, curcuma, alho em pó, uma boa quantidade de sal, e 1/3 do queijo ralado. Adicionar a água aos poucos.",
        "Misturar na blender até ficar suave, garantindo que os cajus ficam bem triturados. Provar.",
        "Adicionar a massa escorrida à casserole, verter o molho e incorporá-lo. Polvilhar com a mozarella.",
        'Levar ao forno durante 20 minutos. Colocar na função "broil" durante 2 minutos para ficar tostado no topo.',
      ],
      notas: "Molho tem de estar bem cremoso\nPara Miguel, fazer bifinhos:\nUsar Casserole Crueset\nAdicionar 2 c. sopa de água ao reaquecer",
    },
  ],

  classics: [
    {
      slug: "carne-porco-portuguesa",
      name: "Carne de Porco à Portuguesa",
      icon: "carne-de-porco",
      doses: 4,
      tempo: "1h",
      ingredients: [
        "400g de carne de porco da perna",
        "8 batatas médias",
        "1 dente de alho",
        "100ml de vinho branco",
        "Azeite",
        "Pickles picados",
        "1 folha de louro",
        "Azeitonas pretas",
        "Sal e pimenta",
        "Óleo para fritar",
      ],
      preparacao: [
        "Cortar a carne de porco em cubos médios e temperar com sal, pimenta, o dente de alho picado finamente, a folha de louro, o vinho branco e 1 colher (sopa) do azeite. Envolver bem e deixar marinar durante pelo menos 2 horas.",
        "Descascar e cortar as batatas em cubos, e fritar em óleo até ficarem douradinhas. Escorrer e temperar com um pouco de sal fino. Opção sem óleo: levar as batatas ao micro-ondas com uma colher de água e fritar na air-fryer.",
        "Levar um tacho largo ao lume com azeite, deixar aquecer, juntar a carne de porco e deixar cozinhar até ganhar cor e ficar macia.",
        "Servir com as azeitonas e pickles.",
      ],
      notas: "",
    },
    {
      slug: "hamburguer-no-prato",
      name: "Hambúrguer no Prato",
      icon: "hamburguer",
      doses: 4,
      tempo: "30 min",
      ingredients: [
        "4 hambúrgueres de bovino",
        "3 dentes de alho",
        "1 cubo de caldo de carne",
        "Azeite",
        "Pimenta",
        "Pickles para acompanhar",
      ],
      preparacao: [
        "Laminar o alho e levá-lo a lume baixo com o azeite.",
        "Após alguns minutos, adicionar o cubo de caldo. Quando tiver formado uma pasta, saltear.",
        "Adicionar os hambúrgueres e temperar com pimenta. Não usar sal porque o caldo já é salgado.",
        "Preparar os acompanhamentos enquanto os hambúrgueres cozinham.",
        "Virar para fritar de ambos os lados.",
      ],
      notas: "Escolher 1 ou 2 acompanhamentos",
    },
    {
      slug: "penne-camaroes-pesto-feta-tomate",
      name: "Penne com Camarões, Pesto, Feta e Tomate",
      icon: "penne",
      doses: 4,
      tempo: "1h",
      tempoFlag: "confirmar tempo de prep",
      ingredients: [
        "600g de camarões c/cabeça (frescos)",
        "Frasco de molho pesto",
        "Massa penne",
        "Feta vegan",
        "12 tomates cherry",
        "5 dentes de alho",
        "Sumo de limão",
        "3 folhas de louro",
      ],
      preparacao: [
        "Descascar e limpar os camarões. Temperá-los com sal grosso e um pouco de sumo de limão.",
        "Laminar os dentes de alho. Saltear com o louro numa boa quantidade de azeite durante alguns minutos.",
        "Cozinhar a massa de acordo com as instruções.",
        "Adicionar os camarões e saltear levemente.",
        "Retirar as cabeças e virá-los. Tapar e frigideira e deixar em lume brando durante alguns minutos.",
        "Cortar os tomates em 4 e o queijo feta.",
        "Retificar os temperos dos camarões.",
        "Na panela, adicionar a massa escorrida com o molho pesto e misturar bem.",
        "Adicionar os restantes ingredientes.",
      ],
      notas: "",
    },
  ],

  world: [
    {
      slug: "mex-bowl",
      name: "Mex Bowl",
      icon: "mex-bowl",
      doses: 4,
      tempo: "1h",
      ingredients: [
        "500g de frango (peito, cortado aos cubos)",
        "2 abacates",
        "4 tomates (cacho/chucha)",
        "1/2 pepino pequeno",
        "2 limas",
        "2 maçarocas de milho",
        "Queijo cottage",
        "1 iogurte grego",
        "1 iogurte sem lactose",
        "12 batatas pequenas para assar",
        "1 dente de alho",
        "Sal, paprika e alho em pó",
      ],
      preparacao: [
        "Temperar o frango com sal, pimenta, paprika, alho em pó e lima. Deixar a marinar.",
        "Descascar as batatas e cortá-las em cubos pequenos.",
        "Levar as batatas ao microondas 2 min com 2 c. sopa de água para amolecerem. Mexer e aquecer +2 min.",
        "Escorrer bem a água das batatas. Colocá-las na air fryer durante 15 min, temperando com sal.",
        "Saltear o frango numa frigideira.",
        "Cortar o abacate e os tomates. Reservar metade dos tomates. Misturar e temperar com sal e sumo de lima.",
        "Colocar a maçaroca de milho na air fryer durante 10 minutos.",
        "Ralar o pepino e espremer com um pano para retirar o excesso de humidade. Polvilhar com sal.",
        "Separar o pepino ralado em duas taças, adicionar iogurte sem lactose numa, e iogurte grego noutra. Espremer meio dente de alho em cada, um pouco de sumo de limão, azeite e pimenta. Mexer bem.",
        "Montar a bowl com todos os ingredientes (reservar metade do frango, das batatas e do molho) e adicionar 2 c. sopa de queijo cottage à minha bowl.",
      ],
      notas: "9º dose: colocar a maçaroca 10 min na air fryer. Cortar o 2º abacate, juntando ao tomate já cortado e temperar com o 2ª lima e sal. Aquecer o frango e as batatas na air fryer. Montar a bowl temperando com o molho de iogurte.",
    },
  ],

  healthy: [],
};

const SIMPLE_LISTS = {
  easy: {
    columns: ["Receita", "Doses"],
    items: [
      { name: "Rissóis de leitão", value: "TBC" },
      { name: "Bolinhas de alheira e chouriço", value: "3" },
      { name: "Pastéis de bacalhau", value: "TBC" },
      { name: "Cordon bleu", value: "1" },
      { name: "Pasteis de massa tenra", value: "TBC" },
      { name: "Douradinhos", value: "4" },
      { name: "Ramen com panados de frango (comprado)", value: "2" },
      { name: "Folhado de alheira e cogumelos (talho)", value: "TBC" },
    ],
  },
  sides: {
    items: [
      { name: "Arroz branco", icon: "arroz", color: "#FFB38D" },
      { name: "Buttered noodles", icon: "noodles", color: "#F8D567" },
      { name: "Carrot \"fries\"", icon: "carrot-fries", color: "#FF8181" },
      { name: "Batatinha air fryer", icon: "batatinha", color: "#D5B75C" },
      { name: "Veggies", icon: "veggies", color: "#74B277" },
      { name: "Pesto penne", icon: "pesto-penne", color: "#4D9D77" },
      { name: "Salada", icon: "salada", color: "#60BBA8" },
      { name: "Batata doce", icon: "batata-doce", color: "#B099CD" },
    ],
  },
};
