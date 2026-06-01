// Firebase wrapper with offline-safe dynamic loading.
const firebaseConfig = {
  apiKey: "AIzaSyD3fj56SzHo_E1B_9o7Ly6Zsc908SqXWD0",
  authDomain: "ffbewg.firebaseapp.com",
  projectId: "ffbewg",
  storageBucket: "ffbewg.firebasestorage.app",
  messagingSenderId: "50576678844",
  appId: "1:50576678844:web:992fa122a49339a3fc95b9",
};

let firebasePromise = null;
let offlineMode = false;

async function loadFirebase() {
  if (firebasePromise) return firebasePromise;
  firebasePromise = (async () => {
    const [{ initializeApp }, authMod, storeMod] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'),
    ]);
    const app = initializeApp(firebaseConfig);
    const auth = authMod.getAuth(app);
    const db = storeMod.getFirestore(app);
    return { authMod, storeMod, auth, db };
  })().catch((error) => {
    offlineMode = true;
    console.warn('[FFBEWG] Firebase unavailable, using local offline mode:', error);
    throw error;
  });
  return firebasePromise;
}

function cleanForFirestore(value) {
  if (Array.isArray(value)) return value.map((item) => cleanForFirestore(item)).filter((item) => item !== undefined);
  if (!value || typeof value !== 'object') return value === undefined ? undefined : value;
  return Object.entries(value).reduce((acc, [key, item]) => {
    if (item === undefined || typeof item === 'function') return acc;
    const cleaned = cleanForFirestore(item);
    if (cleaned !== undefined) acc[key] = cleaned;
    return acc;
  }, {});
}

export async function loginWithGoogle(emailHint = '', forceSelect = false) {
  const { authMod, auth } = await loadFirebase();
  const provider = new authMod.GoogleAuthProvider();
  const params = {};
  if (emailHint) params.login_hint = emailHint;
  if (forceSelect) params.prompt = 'select_account';
  if (Object.keys(params).length) provider.setCustomParameters(params);
  const result = await authMod.signInWithPopup(auth, provider);
  return result.user;
}

export async function logout() {
  try {
    const { authMod, auth } = await loadFirebase();
    await authMod.signOut(auth);
  } catch (_) {
    offlineMode = true;
  }
}

export function onUserChange(callback) {
  loadFirebase()
    .then(({ authMod, auth }) => authMod.onAuthStateChanged(auth, callback))
    .catch(() => {
      offlineMode = true;
      window.setTimeout(() => callback({ uid: 'offline-local', email: '', providerData: [] }), 0);
    });
  return () => {};
}

export async function loadUserData(uid) {
  if (offlineMode || uid === 'offline-local') return null;
  const { storeMod, db } = await loadFirebase();
  const ref = storeMod.doc(db, 'users', uid);
  const snap = await storeMod.getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveUserData(uid, data) {
  if (offlineMode || uid === 'offline-local') return false;
  const { storeMod, db } = await loadFirebase();
  const ref = storeMod.doc(db, 'users', uid);
  await storeMod.setDoc(ref, cleanForFirestore(data));
  return true;
}