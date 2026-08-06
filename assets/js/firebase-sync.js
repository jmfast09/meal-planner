// Live sync for recipe edits, shared across every device/browser via Firestore.
// Keeps window.__recipeEditsCache mirroring the remote document in real time and
// re-runs the app's router() whenever it changes, so edits show up everywhere.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
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

window.__recipeEditsCache = {};

onSnapshot(
  recipeEditsRef,
  (snap) => {
    window.__recipeEditsCache = snap.exists() ? snap.data() : {};
    if (typeof router === "function") router();
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
