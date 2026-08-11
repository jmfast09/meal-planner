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
const CLOCHE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" zoomAndPan="magnify" viewBox="0 0 1500 1499.999933" height="100%" preserveAspectRatio="xMidYMid meet" version="1.0"><defs><clipPath id="e18b330588"><path d="M 116 374.347656 L 1384 374.347656 L 1384 1125.847656 L 116 1125.847656 Z M 116 374.347656 " clip-rule="nonzero"/></clipPath></defs><path fill="currentColor" d="M 733.066406 530.339844 L 732.488281 513.007812 C 678.644531 514.855469 625.835938 525.140625 575.457031 543.628906 L 581.464844 559.921875 C 630.113281 542.011719 681.070312 532.074219 733.066406 530.339844 Z M 733.066406 530.339844 " fill-opacity="1" fill-rule="nonzero"/><path fill="currentColor" d="M 406.179688 672.351562 C 445.8125 632.71875 491.453125 600.480469 541.601562 576.675781 L 534.207031 560.960938 C 482.210938 585.6875 434.949219 618.964844 393.929688 659.988281 C 351.523438 702.394531 317.550781 751.039062 292.710938 804.652344 C 267.980469 858.152344 252.960938 915.351562 248.222656 974.625 L 265.554688 976.011719 C 274.683594 861.734375 324.601562 753.8125 406.179688 672.351562 Z M 406.179688 672.351562 " fill-opacity="1" fill-rule="nonzero"/><g clip-path="url(#e18b330588)"><path fill="currentColor" d="M 1361.078125 1048.578125 L 1326.875 1048.578125 C 1326.875 1045.574219 1325.949219 1042.570312 1323.984375 1039.914062 L 1313.933594 1025.699219 C 1309.3125 1019.113281 1301.914062 1013.914062 1293.25 1010.792969 C 1292.554688 939.152344 1278.226562 869.707031 1250.613281 804.191406 C 1223.226562 739.484375 1184.054688 681.363281 1134.136719 631.445312 C 1038.578125 535.886719 912.285156 479.84375 777.898438 472.914062 C 780.671875 456.390625 786.335938 442.984375 795.578125 431.546875 C 803.4375 421.839844 805.054688 410.167969 800.085938 399.539062 C 793.035156 384.515625 774.085938 374.578125 752.015625 374.347656 C 750.515625 374.347656 749.128906 374.347656 747.625 374.347656 C 725.554688 374.578125 706.605469 384.402344 699.558594 399.539062 C 694.589844 410.167969 696.207031 421.839844 704.0625 431.546875 C 713.308594 442.984375 719.085938 456.273438 721.742188 472.914062 C 587.242188 479.730469 461.0625 535.769531 365.503906 631.445312 C 315.585938 681.363281 276.417969 739.484375 249.03125 804.191406 C 221.300781 869.707031 206.972656 939.152344 206.394531 1010.792969 C 197.613281 1014.027344 190.332031 1019.113281 185.710938 1025.699219 L 175.65625 1039.914062 C 173.808594 1042.570312 172.769531 1045.574219 172.769531 1048.578125 L 138.566406 1048.578125 C 130.476562 1048.578125 122.96875 1052.738281 119.039062 1059.324219 C 115.339844 1065.449219 115.226562 1072.84375 118.578125 1079.082031 L 129.667969 1099.535156 C 138.335938 1115.597656 155.898438 1125.648438 175.542969 1125.648438 L 1324.449219 1125.648438 C 1344.089844 1125.648438 1361.65625 1115.710938 1370.320312 1099.535156 L 1381.414062 1079.082031 C 1384.765625 1072.84375 1384.648438 1065.449219 1380.949219 1059.324219 C 1376.675781 1052.738281 1369.164062 1048.578125 1361.078125 1048.578125 Z M 717.351562 420.683594 C 713.65625 416.179688 712.960938 411.554688 715.042969 406.933594 C 718.507812 399.539062 729.945312 391.914062 747.625 391.679688 C 748.320312 391.679688 749.011719 391.679688 749.589844 391.679688 C 750.285156 391.679688 750.976562 391.679688 751.554688 391.679688 C 769.234375 391.914062 780.671875 399.421875 784.140625 406.933594 C 786.335938 411.554688 785.527344 416.179688 781.828125 420.683594 C 770.160156 435.128906 763.226562 451.652344 760.105469 472.335938 C 759.875 472.335938 759.644531 472.335938 759.296875 472.335938 C 758.601562 472.335938 757.910156 472.335938 757.101562 472.335938 C 756.175781 472.335938 755.136719 472.335938 754.210938 472.335938 C 753.75 472.335938 753.402344 472.335938 752.941406 472.335938 C 750.628906 472.335938 748.320312 472.335938 746.007812 472.335938 C 745.546875 472.335938 745.085938 472.335938 744.621094 472.335938 C 743.699219 472.335938 742.773438 472.335938 741.734375 472.335938 C 741.039062 472.335938 740.230469 472.335938 739.539062 472.335938 C 739.304688 472.335938 739.074219 472.335938 738.730469 472.335938 C 736.070312 451.765625 729.023438 435.128906 717.351562 420.683594 Z M 223.496094 1007.210938 C 225.691406 869.9375 280.230469 741.101562 377.523438 643.808594 C 472.273438 549.058594 597.988281 494.40625 731.679688 490.015625 C 736.070312 489.898438 740.578125 489.78125 745.082031 489.78125 C 746.585938 489.78125 748.089844 489.78125 749.589844 489.78125 C 752.824219 489.78125 755.945312 489.78125 759.066406 489.898438 C 761.953125 489.898438 764.726562 490.011719 767.5 490.128906 L 767.617188 490.128906 C 901.191406 494.636719 1026.910156 549.289062 1121.660156 643.925781 C 1219.066406 741.332031 1273.492188 870.054688 1275.6875 1007.328125 L 223.496094 1007.328125 Z M 190.792969 1048.117188 L 199.578125 1035.753906 C 204.3125 1029.050781 215.40625 1024.542969 227.191406 1024.542969 L 1272.21875 1024.542969 C 1284.003906 1024.542969 1295.097656 1029.050781 1299.835938 1035.753906 L 1308.617188 1048.117188 C 1307.925781 1048.347656 1307 1048.578125 1305.730469 1048.578125 L 193.683594 1048.578125 C 192.527344 1048.578125 191.488281 1048.460938 190.792969 1048.117188 Z M 1365.8125 1070.996094 L 1354.722656 1091.445312 C 1349.175781 1101.730469 1337.15625 1108.433594 1324.101562 1108.433594 L 175.195312 1108.433594 C 162.136719 1108.433594 150.238281 1101.730469 144.574219 1091.445312 L 133.480469 1070.996094 C 133.136719 1070.417969 132.789062 1069.492188 133.597656 1068.335938 C 134.292969 1067.179688 135.792969 1066.027344 138.335938 1066.027344 L 1360.960938 1066.027344 C 1363.386719 1066.027344 1365.003906 1067.179688 1365.699219 1068.335938 C 1366.507812 1069.492188 1366.160156 1070.417969 1365.8125 1070.996094 Z M 1365.8125 1070.996094 " fill-opacity="1" fill-rule="nonzero"/></g></svg>`;
const CAMERA_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
const TRASH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
const FILTER_ICON = `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 3.5H17.5L12.1 10.2V15.8L7.9 17.5V10.2L2.5 3.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
const EDIT_ICON = `<svg viewBox="0 0 1500 1499.999933" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M 1147.523438 777.4375 C 1147.523438 764.007812 1158.421875 753.109375 1171.851562 753.109375 C 1185.28125 753.109375 1196.179688 764.007812 1196.179688 777.4375 L 1196.179688 1082.613281 C 1196.179688 1133.703125 1175.257812 1180.171875 1141.636719 1213.84375 C 1107.964844 1247.511719 1061.546875 1268.386719 1010.457031 1268.386719 L 417.085938 1268.386719 C 365.996094 1268.386719 319.527344 1247.511719 285.855469 1213.84375 C 252.1875 1180.171875 231.3125 1133.753906 231.3125 1082.613281 L 231.3125 489.242188 C 231.3125 438.152344 252.234375 391.683594 285.855469 358.0625 C 319.527344 324.394531 365.945312 303.519531 417.085938 303.519531 L 722.261719 303.519531 C 735.691406 303.519531 746.589844 314.417969 746.589844 327.847656 C 746.589844 341.277344 735.691406 352.175781 722.261719 352.175781 L 417.085938 352.175781 C 379.375 352.175781 345.121094 367.601562 320.207031 392.464844 C 295.34375 417.328125 279.921875 451.628906 279.921875 489.292969 L 279.921875 1082.664062 C 279.921875 1120.371094 295.34375 1154.628906 320.207031 1179.492188 C 345.070312 1204.355469 379.375 1219.777344 417.085938 1219.777344 L 1010.457031 1219.777344 C 1048.117188 1219.777344 1082.421875 1204.355469 1107.285156 1179.492188 C 1132.148438 1154.628906 1147.570312 1120.371094 1147.570312 1082.664062 L 1147.570312 777.488281 Z M 697.398438 910.953125 L 588.746094 802.253906 L 576.242188 923.457031 L 697.445312 910.953125 Z M 604.21875 749.023438 L 750.628906 895.429688 L 1062.859375 583.199219 L 916.449219 436.789062 Z M 950.804688 402.4375 L 1097.210938 548.847656 L 1191.070312 455.035156 C 1210.242188 435.867188 1219.777344 410.660156 1219.777344 385.457031 C 1219.777344 360.203125 1210.242188 335 1191.070312 315.878906 L 1191.121094 315.828125 L 1185.183594 309.894531 L 1183.820312 308.628906 C 1164.652344 289.457031 1139.445312 279.921875 1114.242188 279.921875 C 1088.988281 279.921875 1063.785156 289.457031 1044.664062 308.628906 L 950.804688 402.488281 Z M 552.644531 731.847656 L 899.179688 385.3125 L 899.324219 385.164062 L 1010.308594 274.226562 C 1038.96875 245.566406 1076.628906 231.261719 1114.289062 231.261719 C 1151.949219 231.261719 1189.613281 245.566406 1218.269531 274.226562 L 1219.535156 275.589844 L 1225.472656 281.527344 L 1225.519531 281.476562 C 1254.179688 310.136719 1268.484375 347.796875 1268.484375 385.457031 C 1268.484375 423.117188 1254.179688 460.777344 1225.519531 489.4375 L 767.902344 947.054688 C 763.375 951.582031 757.441406 953.964844 751.503906 954.160156 L 551.523438 974.839844 C 538.191406 976.203125 526.269531 966.519531 524.957031 953.1875 C 524.761719 951.386719 524.761719 949.585938 525.003906 947.835938 L 545.832031 746.589844 C 546.414062 740.800781 548.992188 735.738281 552.789062 731.894531 L 552.738281 731.847656 Z M 552.644531 731.847656 " fill-opacity="1" fill-rule="nonzero"/></svg>`;
const SAVE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;

/* Doses-column sort toggled by the filter button, kept per category so it
   survives the full re-renders triggered by editing rows on the same page. */
const categoryDoseSort = {};

/* Ingredients/Preparação text is read-only until the pencil button in that
   box's header is clicked; the same button then shows a save icon and
   clicking it again just returns to read-only (every field already saves
   itself on blur, same as before — this only toggles whether the text can
   be touched at all). Kept in memory per recipe+section, not persisted. */
const recipeSectionEditMode = {};
function isSectionEditable(catSlug, recipeSlug, section) {
  return !!recipeSectionEditMode[`${catSlug}|${recipeSlug}|${section}`];
}

function recipeIconUploadHtml() {
  return `
    <label class="recipe-icon-upload" title="Adicionar ícone" aria-label="Adicionar ícone">
      <input type="file" accept="image/*" class="recipe-icon-input" hidden />
      ${CAMERA_ICON}
    </label>
  `;
}

/* Reads an image file, center-crops it to a square, and downsizes it to a
   compact data URL so it fits comfortably in a Firestore document. */
function resizeImageToDataUrl(file, size) {
  // SVGs are vector — store them as-is so they stay perfectly crisp at any
  // display size, instead of rasterizing (and possibly blurring) them.
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name || "")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cropSize = Math.min(img.width, img.height);
        const sx = (img.width - cropSize) / 2;
        const sy = (img.height - cropSize) / 2;
        // Never upscale past the source's own resolution — that just blurs it further.
        const outSize = Math.min(size, cropSize);
        const canvas = document.createElement("canvas");
        canvas.width = outSize;
        canvas.height = outSize;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, outSize, outSize);
        // JPEG, not PNG: photos are stored inline in a shared Firestore document
        // (1 MiB hard limit across every recipe in the category), and PNG can run
        // 5-20x larger than JPEG for photographic content. At this icon's display
        // size (110px, ~330px at 3x DPR) quality 0.85 shows no visible artifacting,
        // so this trades invisible fidelity for staying well under that limit.
        // Steps down further only if a single upload is still unusually large.
        let dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        if (dataUrl.length > 400000) dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        if (dataUrl.length > 400000) dataUrl = canvas.toDataURL("image/jpeg", 0.55);
        resolve(dataUrl);
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

  const shoppingActive = activeSlug === "compras" ? "is-active" : "";
  const shoppingPill = `<a class="tabpill tabpill-icon ${shoppingActive}" href="#/compras" aria-label="Lista de compras" title="Lista de compras"><img src="assets/img/icons/cart.svg" alt="" /></a>`;

  return `<div class="tabbar-wrap"><nav class="tabbar">${plannerPill}${pills}${shoppingPill}</nav></div>`;
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
    .map((r) => getEffectiveRecipe(cat.slug, r));
  const doseSort = categoryDoseSort[cat.slug];
  if (doseSort === "asc") items.sort((a, b) => parseFloat(a.doses) - parseFloat(b.doses));
  else if (doseSort === "desc") items.sort((a, b) => parseFloat(b.doses) - parseFloat(a.doses));
  else items.sort((a, b) => a.name.localeCompare(b.name, "pt"));
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
          <a class="recipe-row-link" href="#/cat/${cat.slug}/${r.slug}">
            ${recipeRowIconHtml(r)}
            <span class="recipe-row-name">${escapeHtml(r.name)}</span>
          </a>
        </td>
        <td class="recipe-row-doses" contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${cat.slug}" data-recipe="${r.slug}" data-field="doses">${escapeHtml(String(r.doses))}</td>
      </tr>
    `).join("");
    bodyHtml = `
      <table class="recipe-table">
        <thead><tr><th>Receita</th><th>Doses <button type="button" class="list-filter-btn" data-cat="${cat.slug}" aria-label="Ordenar por doses" title="Ordenar por doses">${FILTER_ICON}</button></th></tr></thead>
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
  if (input) {
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      document.querySelectorAll("[data-search-name]").forEach((el) => {
        const name = el.dataset.searchName.toLowerCase();
        el.style.display = name.includes(q) ? "" : "none";
      });
    });
  }

  const filterBtn = document.querySelector(".list-filter-btn");
  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      const cat = filterBtn.dataset.cat;
      const cur = categoryDoseSort[cat];
      categoryDoseSort[cat] = cur === "asc" ? "desc" : cur === "desc" ? undefined : "asc";
      router();
    });
  }
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

function editToggleBtnHtml(catSlug, recipeSlug, section, editing, disabled) {
  const title = disabled ? "Volta às doses standard para editar" : editing ? "Guardar" : "Editar";
  return `
    <button type="button" class="box-edit-btn${editing ? " box-edit-btn-active" : ""}" data-cat="${catSlug}" data-recipe="${recipeSlug}" data-section="${section}" aria-label="${title}" title="${title}"${disabled ? " disabled" : ""}>
      ${editing ? SAVE_ICON : EDIT_ICON}
    </button>
  `;
}

function ingredientLineHtml(text, field, editCtx) {
  if (!editCtx) return `<li>${escapeHtml(text)}</li>`;
  // Editing is locked while the recipe is showing a scaled (non-standard)
  // dose count (a scaled line is recomputed from the standard baseline
  // every time doses change, so an edit made here would look saved but
  // then vanish on the next +/- click — confusing) or while the box isn't
  // in edit mode (see the pencil/save button in the box header). Editing
  // only sticks (see commitFieldEdit) when it corrects the standard-doses
  // baseline. (The per-dose override plumbing in
  // commitFieldEdit/rescaleRecipeIngredients stays wired up even though the
  // UI can't reach it — it still needs to read back any override saved
  // while editing was briefly unlocked.)
  if (editCtx.locked) {
    const title = editCtx.lockedReason === "doses"
      ? "Volta às doses standard para editar ingredientes"
      : "Clica no lápis para editar";
    return `<li class="ingredient-locked" title="${title}">${escapeHtml(text)}</li>`;
  }
  return `<li contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${editCtx.cat}" data-recipe="${editCtx.recipe}" data-field="${field}">${escapeHtml(text)}</li>`;
}

// addedItems are ingredients the user appended via the "+" button — stored
// separately from the recipe's own (shipped or Firestore-created) ingredient
// list under "{prefix}Added{k}" fields, so adding one never requires
// resizing a fixed-length array. They render seamlessly at the end of the
// same list and scale the same way as any other ingredient (see
// rescaleAddedIngredients).
function ingredientListHtml(items, addedItems, editCtx) {
  const baseLis = items.map((i, idx) => ingredientLineHtml(i, editCtx && `${editCtx.prefix}${idx}`, editCtx)).join("");
  const addedLis = (addedItems || [])
    .map((i, idx) => ingredientLineHtml(i, editCtx && `${editCtx.prefix}Added${idx}`, editCtx))
    .join("");
  const addBtn = editCtx && !editCtx.locked
    ? `<button type="button" class="ingredient-add-btn" data-cat="${editCtx.cat}" data-recipe="${editCtx.recipe}" data-prefix="${editCtx.prefix}" aria-label="Adicionar ingrediente" title="Adicionar ingrediente">+</button>`
    : "";
  return `<ul class="ingredient-list">${baseLis}${addedLis}</ul>${addBtn}`;
}

function prepChecklistHtml(catSlug, recipeSlug, steps, editable) {
  const items = steps.map((step, i) => {
    const key = prepStorageKey(catSlug, recipeSlug, i);
    const checked = localStorage.getItem(key) === "1" ? "checked" : "";
    // The checklist itself (checkboxes) always works regardless of edit
    // mode — only the step text is gated behind the pencil/save button.
    const textHtml = editable
      ? `<span class="prep-step-text" contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${catSlug}" data-recipe="${recipeSlug}" data-field="prep${i}">${escapeHtml(step)}</span>`
      : `<span class="prep-step-text">${escapeHtml(step)}</span>`;
    return `
      <li>
        <div class="prep-step">
          <label class="prep-step-check">
            <input type="checkbox" data-prep-key="${key}" ${checked} />
            <span class="prep-step-num">${i + 1}.</span>
          </label>
          ${textHtml}
        </div>
      </li>
    `;
  }).join("");
  const unselectBtn = `
    <button type="button" class="prep-unselect-all" aria-label="Desmarcar tudo" title="Desmarcar tudo">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
    </button>
  `;
  return `<ul class="prep-list">${items}</ul>${unselectBtn}`;
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

function dosesStepperHtml(catSlug, recipeSlug, currentDoses) {
  const disabledDown = Number.isNaN(currentDoses) || currentDoses <= 1 ? "disabled" : "";
  return `
    <button type="button" class="doses-step-btn doses-decrease-btn" data-cat="${catSlug}" data-recipe="${recipeSlug}" aria-label="Diminuir doses" title="Diminuir doses" ${disabledDown}>
      <svg viewBox="0 0 16 14" width="12" height="11"><path d="M0 0H16L8 14Z" fill="currentColor"/></svg>
    </button>
    <button type="button" class="doses-step-btn doses-increase-btn" data-cat="${catSlug}" data-recipe="${recipeSlug}" aria-label="Aumentar doses" title="Aumentar doses">
      <svg viewBox="0 0 16 14" width="12" height="11"><path d="M8 0L16 14H0Z" fill="currentColor"/></svg>
    </button>
  `;
}

function renderRecipe(catSlug, recipeSlug) {
  const cat = findCategory(catSlug);
  const rawRecipe = findRecipe(catSlug, recipeSlug);
  if (!cat || !rawRecipe) return renderNotFound();
  const recipe = getEffectiveRecipe(catSlug, rawRecipe);
  document.body.className = "cat-" + cat.slug;

  // rawRecipe.doses can be a number (built-in recipes) or a string (recipes
  // created in-app), so compare numerically rather than with ===.
  const atNonStandardDoses = !!rawRecipe.doses && parseInt(recipe.doses, 10) !== parseInt(rawRecipe.doses, 10);

  const ingredientsEditing = isSectionEditable(cat.slug, recipe.slug, "ingredients");
  const ingredientsEditCtx = {
    locked: atNonStandardDoses || !ingredientsEditing,
    lockedReason: atNonStandardDoses ? "doses" : "not-editing",
  };
  const prepEditing = isSectionEditable(cat.slug, recipe.slug, "preparacao");

  const addedIngredients = getAddedIngredients(cat.slug, recipe.slug, "ingredient");
  const addedExtraIngredients = getAddedIngredients(cat.slug, recipe.slug, "ingredientExtra");

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
      <div class="ingredient-subtitle"${ingredientsEditCtx.locked ? "" : ` contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${cat.slug}" data-recipe="${recipe.slug}" data-field="ingredientsExtraTitle"`}>${escapeHtml(recipe.ingredientsExtra.title)}</div>
      ${ingredientListHtml(recipe.ingredientsExtra.items, addedExtraIngredients, { ...ingredientsEditCtx, cat: cat.slug, recipe: recipe.slug, prefix: "ingredientExtra" })}
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
          <div class="recipe-actions">
            <button type="button" class="planner-btn planner-btn-icon recipe-delete-btn" data-cat="${cat.slug}" data-recipe="${recipe.slug}" title="Apagar receita" aria-label="Apagar receita">
              ${TRASH_ICON}
            </button>
          </div>
          <div class="recipe-head">
            ${recipe.iconData
              ? `<img class="recipe-dish-icon" src="${recipe.iconData}" alt="" />`
              : recipe.icon
                ? `<img class="recipe-dish-icon" src="assets/img/icons/recipes/${recipe.icon}.svg" alt="" />`
                : `<div class="recipe-icon">${PLATE_ICON}</div>`}
            <h1 contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${cat.slug}" data-recipe="${recipe.slug}" data-field="name">${escapeHtml(recipe.name)}</h1>
          </div>

          <div class="recipe-meta">
            <span>DOSES: <span contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${cat.slug}" data-recipe="${recipe.slug}" data-field="doses">${escapeHtml(String(recipe.doses))}</span>${rawRecipe.doses ? dosesStepperHtml(cat.slug, recipe.slug, parseInt(recipe.doses, 10)) : ""}</span>
            <span>TEMPO DE PREP: <span contenteditable="true" spellcheck="false" data-singleline="true" data-cat="${cat.slug}" data-recipe="${recipe.slug}" data-field="tempo">${escapeHtml(recipe.tempo)}</span>${tempoFlag}</span>
          </div>

          <div class="recipe-grid">
            <div>
              <div class="box">
                <div class="box-header box-header-actions">
                  Ingredientes
                  ${editToggleBtnHtml(cat.slug, recipe.slug, "ingredients", ingredientsEditing, atNonStandardDoses)}
                </div>
                <div class="box-body">
                  ${ingredientListHtml(recipe.ingredients, addedIngredients, { ...ingredientsEditCtx, cat: cat.slug, recipe: recipe.slug, prefix: "ingredient" })}
                  ${extraIngredients}
                </div>
              </div>
              ${notasHtml}
            </div>
            <div class="box">
              <div class="box-header box-header-actions">
                Preparação
                ${editToggleBtnHtml(cat.slug, recipe.slug, "preparacao", prepEditing, false)}
              </div>
              <div class="box-body">
                ${prepChecklistHtml(cat.slug, recipe.slug, recipe.preparacao, prepEditing)}
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
              <div class="recipe-icon-preview recipe-icon new-recipe-icon-placeholder">${CLOCHE_ICON}</div>
              ${recipeIconUploadHtml()}
            </div>
            <h1 class="new-recipe-name" contenteditable="true" spellcheck="false" data-singleline="true" data-placeholder="Nome da receita"></h1>
          </div>

          <div class="recipe-meta">
            <span>DOSES: <span class="new-recipe-doses" contenteditable="true" spellcheck="false" data-singleline="true" data-placeholder="ex: 4"></span></span>
            <span>TEMPO DE PREP: <span class="new-recipe-tempo" contenteditable="true" spellcheck="false" data-singleline="true" data-placeholder="ex: 30 min"></span></span>
          </div>

          <div class="recipe-grid">
            <div>
              <div class="box">
                <div class="box-header">Ingredientes</div>
                <div class="box-body">
                  <ul class="ingredient-list new-recipe-list" data-new-list="ingredients">
                    <li contenteditable="true" spellcheck="false" data-placeholder="Escreve ou cola os ingredientes"></li>
                  </ul>
                </div>
              </div>
              <div class="box notas-box">
                <div class="box-header">Notas</div>
                <div class="box-body new-recipe-notas" contenteditable="true" spellcheck="false" data-placeholder="Notas (opcional)"></div>
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
      const notas = root.querySelector(".new-recipe-notas").innerText.trim();

      if (!window.saveNewRecipeRemote) {
        alert("A app ainda está a ligar-se à base de dados. Espera um instante e tenta guardar de novo.");
        return;
      }

      const slug = uniqueRecipeSlug(catSlug, slugifyRecipeName(name));
      const recipe = { slug, name, doses, tempo, ingredients, preparacao };
      if (notas) recipe.notas = notas;
      const iconWrap = root.querySelector(".recipe-icon-wrap");
      if (iconWrap && iconWrap.dataset.iconData) recipe.iconData = iconWrap.dataset.iconData;
      // uniqueRecipeSlug ignores hidden (deleted) recipes when checking for
      // collisions, so recreating one reuses its old slug — clear any stale
      // "hidden" flag left over from that deletion, or the new recipe would
      // be filtered out by getAllRecipes and immediately 404.
      saveRecipeEdit(catSlug, slug, "hidden", "");
      window.saveNewRecipeRemote(catSlug, recipe);
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
  } else if (parts[0] === "compras") {
    html = renderShoppingList();
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
  else if (parts[0] === "compras") bindShoppingListEvents();
  else if (parts[0] === "cat" && parts[1] && !parts[2]) bindCategorySearch();
  else if (parts[0] === "cat" && parts[1] && parts[2] === "new") bindNewRecipeEvents(parts[1]);
  else if (parts[0] === "cat" && parts[1] && parts[2]) {
    const recipe = findRecipe(parts[1], parts[2]);
    if (recipe) bindRecipeHistory(getEffectiveRecipe(parts[1], recipe));
    bindRecipeDelete();
    bindDosesIncrease();
  }
}

function bindRecipeDelete() {
  const btn = document.querySelector(".recipe-delete-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const { cat, recipe } = btn.dataset;
    if (!confirm("Apagar esta receita? Esta ação não pode ser desfeita.")) return;
    saveRecipeEdit(cat, recipe, "hidden", "1");
    location.hash = `#/cat/${cat}`;
  });
}

// Bumps doses by 1 and rescales every ingredient — always computed fresh
// from the recipe's standard (shipped/as-created) doses and ingredient
// text, not from whatever the last click already changed.
// Rescales every ingredient of rawRecipe from its standard doses to
// newDoses and saves each — shared by the +/- stepper and by typing a new
// number directly into the DOSES field.
// A recipe's doseOverrides/ingredientsExtraDoseOverrides ({ [ingredientIndex]:
// { [doseCount]: exactText } }) pin an ingredient's text at specific dose
// counts where the general scaling rules don't match reality (e.g. a
// packaging step, or a deliberate one-off exception) — checked before
// falling back to the formula. Never needed at standard doses, since that
// value always comes from the shipped/edited text directly.
function resolveScaledIngredientText(overridesForIngredient, newDoses, standardText, standardDoses, recipeSlug) {
  const override = overridesForIngredient && overridesForIngredient[newDoses];
  if (override !== undefined) return override;
  return scaleRecipeIngredientText(standardText, standardDoses, newDoses, recipeSlug);
}

// Ingredients appended via the "+" button live entirely in Firestore, as
// "{prefix}AddedCount" (how many) plus one "{prefix}Added{k}" field per
// line — never a fixed-length array, so adding one never needs resizing
// anything. Works the same for built-in and in-app-created recipes.
function getAddedIngredientCount(cat, recipeSlug, prefix) {
  return parseInt(getRecipeEdit(cat, recipeSlug, `${prefix}AddedCount`, "0"), 10) || 0;
}

function getAddedIngredients(cat, recipeSlug, prefix) {
  const count = getAddedIngredientCount(cat, recipeSlug, prefix);
  const items = [];
  for (let k = 0; k < count; k++) items.push(getRecipeEdit(cat, recipeSlug, `${prefix}Added${k}`, ""));
  return items;
}

function rescaleAddedIngredients(cat, recipeSlug, prefix, standardDoses, newDoses) {
  const count = getAddedIngredientCount(cat, recipeSlug, prefix);
  for (let k = 0; k < count; k++) {
    const standardText = getRecipeEdit(cat, recipeSlug, `${prefix}AddedStandard${k}`, "");
    saveRecipeEdit(cat, recipeSlug, `${prefix}Added${k}`, scaleRecipeIngredientText(standardText, standardDoses, newDoses, recipeSlug));
  }
}

function rescaleRecipeIngredients(cat, recipeSlug, rawRecipe, newDoses) {
  const standardDoses = rawRecipe.doses;
  (rawRecipe.ingredients || []).forEach((ing, i) => {
    // A manual correction saved while viewing standard doses (see the
    // focusout handler below) replaces the shipped text as the baseline.
    const standardText = getRecipeEdit(cat, recipeSlug, `ingredientStandard${i}`, ing);
    // A manual correction saved while viewing a non-standard dose count
    // (a user-typed dose-specific fix, synced via Firestore so it works for
    // any recipe including ones created in-app) wins over a built-in
    // doseOverrides entry, which in turn wins over the plain formula.
    const manualOverride = getRecipeEdit(cat, recipeSlug, `ingredientDoseOverride${i}_${newDoses}`, undefined);
    const staticOverridesForIngredient = rawRecipe.doseOverrides && rawRecipe.doseOverrides[i];
    const value = manualOverride !== undefined
      ? manualOverride
      : resolveScaledIngredientText(staticOverridesForIngredient, newDoses, standardText, standardDoses, recipeSlug);
    saveRecipeEdit(cat, recipeSlug, `ingredient${i}`, value);
  });
  rescaleAddedIngredients(cat, recipeSlug, "ingredient", standardDoses, newDoses);
  if (rawRecipe.ingredientsExtra) {
    rawRecipe.ingredientsExtra.items.forEach((ing, i) => {
      const standardText = getRecipeEdit(cat, recipeSlug, `ingredientExtraStandard${i}`, ing);
      const manualOverride = getRecipeEdit(cat, recipeSlug, `ingredientExtraDoseOverride${i}_${newDoses}`, undefined);
      const staticOverridesForIngredient = rawRecipe.ingredientsExtraDoseOverrides && rawRecipe.ingredientsExtraDoseOverrides[i];
      const value = manualOverride !== undefined
        ? manualOverride
        : resolveScaledIngredientText(staticOverridesForIngredient, newDoses, standardText, standardDoses, recipeSlug);
      saveRecipeEdit(cat, recipeSlug, `ingredientExtra${i}`, value);
    });
    rescaleAddedIngredients(cat, recipeSlug, "ingredientExtra", standardDoses, newDoses);
  }
}

function applyDosesStep(cat, recipeSlug, delta) {
  const rawRecipe = findRecipe(cat, recipeSlug);
  if (!rawRecipe || !rawRecipe.doses) return;
  const currentDoses = parseInt(getEffectiveRecipe(cat, rawRecipe).doses, 10);
  const base = Number.isNaN(currentDoses) ? rawRecipe.doses : currentDoses;
  const newDoses = Math.max(1, base + delta);
  if (newDoses === base) return;

  saveRecipeEdit(cat, recipeSlug, "doses", String(newDoses));
  rescaleRecipeIngredients(cat, recipeSlug, rawRecipe, newDoses);
  router();
}

function bindDosesIncrease() {
  const incBtn = document.querySelector(".doses-increase-btn");
  if (incBtn) {
    incBtn.addEventListener("click", () => {
      const { cat, recipe: recipeSlug } = incBtn.dataset;
      applyDosesStep(cat, recipeSlug, 1);
    });
  }
  const decBtn = document.querySelector(".doses-decrease-btn");
  if (decBtn) {
    decBtn.addEventListener("click", () => {
      const { cat, recipe: recipeSlug } = decBtn.dataset;
      applyDosesStep(cat, recipeSlug, -1);
    });
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

// Delegated listener: clears every step's checked state for this recipe.
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".prep-unselect-all");
  if (!btn) return;
  const box = btn.closest(".box");
  if (!box) return;
  box.querySelectorAll('.prep-step input[type="checkbox"]').forEach((cb) => {
    cb.checked = false;
    if (cb.dataset.prepKey) localStorage.removeItem(cb.dataset.prepKey);
  });
});

// Delegated listener: appends a new empty, editable ingredient line and
// focuses it so the user can type right away.
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".ingredient-add-btn");
  if (!btn) return;
  const { cat, recipe, prefix } = btn.dataset;
  const count = getAddedIngredientCount(cat, recipe, prefix);
  saveRecipeEdit(cat, recipe, `${prefix}AddedCount`, String(count + 1));
  router();
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-field="${prefix}Added${count}"]`);
    if (el) el.focus();
  });
});

// Delegated listener: toggles a box between read-only and editable — every
// field still saves itself on blur exactly as before, this only decides
// whether the text can be touched at all.
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".box-edit-btn");
  if (!btn || btn.disabled) return;
  const { cat, recipe, section } = btn.dataset;
  const key = `${cat}|${recipe}|${section}`;
  recipeSectionEditMode[key] = !recipeSectionEditMode[key];
  router();
});

// Delegated listener: uploaded icon on the new-recipe editor — resize/compress
// and stash it on the wrapper for the Save button to pick up.
document.addEventListener("change", (e) => {
  const input = e.target;
  if (!input.matches || !input.matches(".recipe-icon-input")) return;
  const file = input.files && input.files[0];
  if (!file) return;

  resizeImageToDataUrl(file, 480)
    .then((dataUrl) => {
      const wrap = input.closest(".recipe-icon-wrap");
      if (wrap) {
        wrap.dataset.iconData = dataUrl;
        const preview = wrap.querySelector(".recipe-icon-preview");
        if (preview) preview.outerHTML = `<img class="recipe-icon-preview recipe-dish-icon" src="${dataUrl}" alt="" />`;
      }
    })
    .catch((err) => {
      console.error("Failed to process uploaded icon:", err);
      alert("Não foi possível processar essa imagem. Tenta outra.");
    });
});

// Delegated listeners: persist edits made directly on recipe text (name, doses,
// tempo, ingredients, prep steps, notas) as the user types, on all recipe pages.

// textContent for single-line fields avoids CSS text-transform (e.g. the
// uppercase recipe title) leaking into the saved value; innerText is only
// needed for multi-line fields (Notas) to preserve line breaks as \n.
function readFieldValue(el) {
  const raw = el.hasAttribute("data-singleline") ? el.textContent : el.innerText;
  return raw.replace(/\u00a0/g, " ").trim();
}

function commitFieldEdit(el) {
  const { cat, recipe, field } = el.dataset;
  if (!cat || !recipe || !field) return;
  const value = readFieldValue(el);
  saveRecipeEdit(cat, recipe, field, value);

  // Editing an ingredient line while the recipe is showing its standard
  // doses corrects the baseline used for future scaling, not just the
  // currently displayed text — otherwise the next +/- click or a retyped
  // DOSES number would overwrite the correction with the original shipped
  // value again.
  const ingredientMatch = /^(ingredientExtra|ingredient)(\d+)$/.exec(field);
  if (ingredientMatch) {
    const rawRecipe = findRecipe(cat, recipe);
    if (rawRecipe && rawRecipe.doses) {
      // rawRecipe.doses is a number for built-in recipes but a string for
      // ones created in-app (the new-recipe form saves raw textContent), so
      // compare numerically rather than with === to avoid a 4 !== "4" miss.
      const currentDoses = parseInt(getEffectiveRecipe(cat, rawRecipe).doses, 10);
      const standardDoses = parseInt(rawRecipe.doses, 10);
      if (currentDoses === standardDoses) {
        saveRecipeEdit(cat, recipe, `${ingredientMatch[1]}Standard${ingredientMatch[2]}`, value);
      } else if (!Number.isNaN(currentDoses)) {
        // Editing away from standard doses pins this exact text to this
        // exact dose count, so it survives future +/- clicks instead of
        // being recomputed away — same idea as the standard-doses baseline,
        // just scoped to one dose count instead of becoming the new base.
        saveRecipeEdit(cat, recipe, `${ingredientMatch[1]}DoseOverride${ingredientMatch[2]}_${currentDoses}`, value);
      }
    }
  }

  // A "+"-added ingredient can only be edited at standard doses (same lock
  // as any other ingredient), so every edit directly corrects its baseline —
  // no separate non-standard-dose-override case needed here.
  const addedMatch = /^(ingredientExtra|ingredient)Added(\d+)$/.exec(field);
  if (addedMatch) {
    const prefix = addedMatch[1];
    const k = parseInt(addedMatch[2], 10);
    if (!value) {
      // Left blank: drop it instead of leaving a permanent empty line, but
      // only if it's the last one — removing an earlier one would shift
      // every later index and orphan their saved fields.
      const count = getAddedIngredientCount(cat, recipe, prefix);
      if (k === count - 1) saveRecipeEdit(cat, recipe, `${prefix}AddedCount`, String(count - 1));
    } else {
      saveRecipeEdit(cat, recipe, `${prefix}AddedStandard${k}`, value);
    }
  }

  // Typing a new doses number directly should rescale ingredients the same
  // way the up/down arrows do, not just save the raw number.
  if (field === "doses") {
    const rawRecipe = findRecipe(cat, recipe);
    const newDoses = parseInt(value, 10);
    if (rawRecipe && rawRecipe.doses && !Number.isNaN(newDoses) && newDoses >= 1) {
      rescaleRecipeIngredients(cat, recipe, rawRecipe, newDoses);
    }
  }
}

document.addEventListener("focusout", (e) => {
  const el = e.target.closest("[data-field]");
  if (!el || !el.isContentEditable) return;
  commitFieldEdit(el);
  router();
});

// Safety net for mobile: some mobile browsers don't fire focusout before a
// refresh/app-switch tears the page down mid-edit (e.g. tapping the
// browser's own reload button, pull-to-refresh, or the OS backgrounding/
// discarding the tab) — the Firestore write that normally happens on
// focusout would then never get sent, silently dropping the edit. So we
// also save early while still typing (debounced, no re-render, so the
// cursor/keyboard isn't disturbed) and flush immediately the moment the
// page is about to be hidden or unloaded.
const pendingFieldSaves = new WeakMap();
document.addEventListener("input", (e) => {
  const el = e.target.closest("[data-field]");
  if (!el || !el.isContentEditable) return;
  clearTimeout(pendingFieldSaves.get(el));
  pendingFieldSaves.set(
    el,
    setTimeout(() => {
      const { cat, recipe, field } = el.dataset;
      if (!cat || !recipe || !field) return;
      saveRecipeEdit(cat, recipe, field, readFieldValue(el));
    }, 600)
  );
});

function flushActiveFieldEdit() {
  const el = document.activeElement;
  if (!el || !el.matches || !el.matches("[data-field]") || !el.isContentEditable) return;
  clearTimeout(pendingFieldSaves.get(el));
  commitFieldEdit(el);
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushActiveFieldEdit();
});
window.addEventListener("pagehide", flushActiveFieldEdit);

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
