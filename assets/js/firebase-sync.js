// Live sync for recipe edits, shared across every device/browser via Firestore.
// Keeps window.__recipeEditsCache mirroring the remote document in real time and
// re-runs the app's router() whenever it changes, so edits show up everywhere.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAggwJDmeKhKzmz2W2Aq2RLvsKmZMzXIKU",
  authDomain: "meal-planner-e483a.firebaseapp.com",
  projectId: "meal-planner-e483a",
  storageBucket: "meal-planner-e483a.firebasestorage.app",
  messagingSenderId: "194578092597",
  appId: "1:194578092597:web:f91932bab1282a7087d77c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const recipeEditsRef = doc(db, "mealPlanner", "recipeEdits");

// Merges a snapshot's data into the existing local cache instead of
// replacing it wholesale. Two saveXRemote calls close together (e.g. typing
// in a field right before clicking "+" to add an ingredient) each start
// their own independent Firestore round-trip; if their onSnapshot echoes
// land out of order, an earlier echo arriving after a later write's
// optimistic update can still only know about writes up to its own moment
// in time. Replacing the whole cache with that echo would erase the later
// write's still-pending value from the cache (and, since it also
// re-renders, from the screen) until its own echo catches up a moment
// later — visible as something that was just added or edited flickering
// away and then not coming back if any of that value depended on it (e.g.
// the "remove if left blank" cleanup for a just-added ingredient line,
// which would fire against a should-be-there row the merge had briefly
// hidden). Merging only ever adds/overwrites known fields, so a partial or
// stale-relative-to-local-writes snapshot can't undo a newer local one.
function mergeCacheFrom(target, source) {
  const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    if (isPlainObject(sourceVal) && isPlainObject(target[key])) {
      mergeCacheFrom(target[key], sourceVal);
    } else {
      target[key] = sourceVal;
    }
  }
  return target;
}

// router() replaces the whole page via innerHTML — calling it while the
// user has a contenteditable field focused (typing an ingredient, a prep
// step, anything) removes that focused element from the document, and
// browsers fire a real "blur" as a direct consequence of that removal. Our
// own focusout handling then treats that as a deliberate blur — for a
// brand new, still-empty added-ingredient line, that meant the "remove if
// left blank" cleanup deleted it. This isn't hypothetical: it fires almost
// every time, because the "+" click's own write gets echoed back by this
// exact onSnapshot a moment later, while the new line is still focused and
// still blank. Skipping the re-render while something is actively focused
// avoids destroying it out from under the user; the cache is still kept
// current either way, and the user's own next focusout re-renders normally.
function isEditingAnyField() {
  const el = document.activeElement;
  return !!(el && el.isContentEditable && el.dataset && el.dataset.field);
}

window.__recipeEditsCache = {};

onSnapshot(
  recipeEditsRef,
  (snap) => {
    if (snap.exists()) mergeCacheFrom(window.__recipeEditsCache, snap.data());
    if (typeof router === "function" && !isEditingAnyField()) router();
  },
  (err) => {
    console.error("Firestore sync error:", err);
  }
);

window.saveRecipeEditRemote = function (catSlug, recipeSlug, field, value) {
  // Optimistic local update so the UI reflects the edit immediately.
  const cache = window.__recipeEditsCache;
  cache[catSlug] = cache[catSlug] || {};
  cache[catSlug][recipeSlug] = cache[catSlug][recipeSlug] || {};
  cache[catSlug][recipeSlug][field] = value;

  setDoc(
    recipeEditsRef,
    { [catSlug]: { [recipeSlug]: { [field]: value } } },
    { merge: true }
  ).catch((err) => {
    console.error("Failed to save recipe edit:", err);
    alert("Não foi possível guardar a alteração (sem ligação?). Tenta novamente.");
  });
};

// ---------- Planner: current-week draft (shared, debounced writes) ----------
// The draft is typed keystroke-by-keystroke, so we don't force a re-render on every
// remote update (that would steal focus mid-typing) — only on the very first snapshot,
// so a freshly loaded page shows whatever was last saved. Later updates (ours or a
// remote device's) just refresh the cache; the next natural render picks them up.
const plannerDraftRef = doc(db, "mealPlanner", "plannerDraft");
window.__plannerDraftCache = null;
let plannerDraftFirstSnapshotHandled = false;
let plannerDraftSaveTimer = null;

onSnapshot(
  plannerDraftRef,
  (snap) => {
    window.__plannerDraftCache = snap.exists() ? snap.data() : null;
    if (!plannerDraftFirstSnapshotHandled) {
      plannerDraftFirstSnapshotHandled = true;
      if (typeof router === "function") router();
    }
  },
  (err) => {
    console.error("Firestore planner draft sync error:", err);
  }
);

window.savePlannerDraftRemote = function (draft) {
  window.__plannerDraftCache = draft; // optimistic
  clearTimeout(plannerDraftSaveTimer);
  plannerDraftSaveTimer = setTimeout(() => {
    setDoc(plannerDraftRef, draft).catch((err) => {
      console.error("Failed to save planner draft:", err);
    });
  }, 600);
};

// ---------- Planner: archive (shared, saved on discrete actions only) ----------
const plannerArchiveRef = doc(db, "mealPlanner", "plannerArchive");
window.__plannerArchiveCache = null;

onSnapshot(
  plannerArchiveRef,
  (snap) => {
    window.__plannerArchiveCache = snap.exists() ? snap.data().list || [] : [];
    if (typeof router === "function" && !isEditingAnyField()) router();
  },
  (err) => {
    console.error("Firestore planner archive sync error:", err);
  }
);

// Adding/removing a single entry goes through arrayUnion/arrayRemove instead
// of a whole-list setDoc, which would depend on window.__plannerArchiveCache
// already being loaded — if a save/delete fires before this doc's first
// onSnapshot arrives (cache still null, so plannerLoadArchive() falls back to
// []), that setDoc would silently overwrite every other saved week with just
// the one entry. arrayUnion/arrayRemove apply server-side against whatever is
// actually stored, so a stale or empty local cache can never clobber it; the
// {merge:true} also means this doc doesn't need to exist yet (e.g. the very
// first week anyone ever archives).
window.addPlannerArchiveEntryRemote = function (entry) {
  const cache = window.__plannerArchiveCache;
  if (Array.isArray(cache)) cache.push(entry); // optimistic
  setDoc(plannerArchiveRef, { list: arrayUnion(entry) }, { merge: true }).catch((err) => {
    console.error("Failed to add planner archive entry:", err);
    alert("Não foi possível guardar a semana no Arquivo (sem ligação?). Tenta novamente.");
  });
};

window.removePlannerArchiveEntryRemote = function (entry) {
  const cache = window.__plannerArchiveCache;
  if (Array.isArray(cache)) {
    const idx = cache.findIndex((e) => e.id === entry.id);
    if (idx !== -1) cache.splice(idx, 1); // optimistic
  }
  setDoc(plannerArchiveRef, { list: arrayRemove(entry) }, { merge: true }).catch((err) => {
    console.error("Failed to remove planner archive entry:", err);
    alert("Não foi possível apagar a semana do Arquivo (sem ligação?). Tenta novamente.");
  });
};

// ---------- Recipes created in-app via the "+" button (shared) ----------
const newRecipesRef = doc(db, "mealPlanner", "newRecipes");
window.__newRecipesCache = {};

onSnapshot(
  newRecipesRef,
  (snap) => {
    if (snap.exists()) mergeCacheFrom(window.__newRecipesCache, snap.data());
    if (typeof router === "function" && !isEditingAnyField()) router();
  },
  (err) => {
    console.error("Firestore new-recipes sync error:", err);
  }
);

window.saveNewRecipeRemote = function (catSlug, recipe) {
  // Optimistic local update so the UI reflects the new recipe immediately.
  const cache = window.__newRecipesCache;
  cache[catSlug] = cache[catSlug] || {};
  cache[catSlug][recipe.slug] = recipe;

  setDoc(
    newRecipesRef,
    { [catSlug]: { [recipe.slug]: recipe } },
    { merge: true }
  ).catch((err) => {
    console.error("Failed to save new recipe:", err);
    alert("Não foi possível guardar a receita (sem ligação?). Tenta novamente.");
  });
};

// ---------- Shopping list check-state (shared) ----------
// Keyed by a short id derived from category+dish+ingredient (see
// shoppingItemKey in planner.js) — value is "bought", "have", or absent.
const shoppingListRef = doc(db, "mealPlanner", "shoppingList");
window.__shoppingListCache = {};

onSnapshot(
  shoppingListRef,
  (snap) => {
    if (snap.exists()) mergeCacheFrom(window.__shoppingListCache, snap.data());
    if (typeof router === "function" && !isEditingAnyField()) router();
  },
  (err) => {
    console.error("Firestore shopping list sync error:", err);
  }
);

window.saveShoppingListStateRemote = function (key, state) {
  window.__shoppingListCache[key] = state; // optimistic
  setDoc(
    shoppingListRef,
    { [key]: state },
    { merge: true }
  ).catch((err) => {
    console.error("Failed to save shopping list state:", err);
  });
};

// ---------- Manually-added shopping list items (shared) ----------
// Keyed by a generated id — value is { section, text }.
const shoppingManualRef = doc(db, "mealPlanner", "shoppingManualItems");
window.__shoppingManualCache = {};

onSnapshot(
  shoppingManualRef,
  (snap) => {
    if (snap.exists()) mergeCacheFrom(window.__shoppingManualCache, snap.data());
    if (typeof router === "function" && !isEditingAnyField()) router();
  },
  (err) => {
    console.error("Firestore manual shopping items sync error:", err);
  }
);

window.saveManualShoppingItemRemote = function (id, item) {
  window.__shoppingManualCache[id] = item; // optimistic
  setDoc(
    shoppingManualRef,
    { [id]: item },
    { merge: true }
  ).catch((err) => {
    console.error("Failed to save manual shopping item:", err);
  });
};

// ---------- Shopping list item overrides (shared) ----------
// Per-item edits on top of the auto-derived list — keyed by item key, value
// is a patch object: { text?, section?, deleted?, order? }.
const shoppingOverridesRef = doc(db, "mealPlanner", "shoppingItemOverrides");
window.__shoppingOverridesCache = {};

onSnapshot(
  shoppingOverridesRef,
  (snap) => {
    if (snap.exists()) mergeCacheFrom(window.__shoppingOverridesCache, snap.data());
    if (typeof router === "function" && !isEditingAnyField()) router();
  },
  (err) => {
    console.error("Firestore shopping item overrides sync error:", err);
  }
);

window.saveShoppingItemOverrideRemote = function (key, patch) {
  window.__shoppingOverridesCache[key] = { ...(window.__shoppingOverridesCache[key] || {}), ...patch }; // optimistic
  setDoc(
    shoppingOverridesRef,
    { [key]: patch },
    { merge: true }
  ).catch((err) => {
    console.error("Failed to save shopping item override:", err);
  });
};

// ---------- Custom shopping list section order (shared) ----------
const shoppingSectionOrderRef = doc(db, "mealPlanner", "shoppingSectionOrder");
window.__shoppingSectionOrderCache = [];

onSnapshot(
  shoppingSectionOrderRef,
  (snap) => {
    window.__shoppingSectionOrderCache = snap.exists() ? (snap.data().order || []) : [];
    if (typeof router === "function" && !isEditingAnyField()) router();
  },
  (err) => {
    console.error("Firestore shopping section order sync error:", err);
  }
);

window.saveShoppingSectionOrderRemote = function (order) {
  window.__shoppingSectionOrderCache = order; // optimistic
  setDoc(
    shoppingSectionOrderRef,
    { order },
    { merge: true }
  ).catch((err) => {
    console.error("Failed to save shopping section order:", err);
  });
};
