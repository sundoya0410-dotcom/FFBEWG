// ============================================================
// Firebase 초기화 & Auth/Firestore 헬퍼
// ============================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyD3fj56SzHo_E1B_9o7Ly6Zsc908SqXWD0",
  authDomain: "ffbewg.firebaseapp.com",
  projectId: "ffbewg",
  storageBucket: "ffbewg.firebasestorage.app",
  messagingSenderId: "50576678844",
  appId: "1:50576678844:web:992fa122a49339a3fc95b9",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

function cleanForFirestore(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanForFirestore(item)).filter((item) => item !== undefined);
  }
  if (!value || typeof value !== 'object') {
    return value === undefined ? undefined : value;
  }
  return Object.entries(value).reduce((acc, [key, item]) => {
    if (item === undefined || typeof item === 'function') return acc;
    const cleaned = cleanForFirestore(item);
    if (cleaned !== undefined) acc[key] = cleaned;
    return acc;
  }, {});
}

// 구글 로그인
export async function loginWithGoogle(emailHint = '', forceSelect = false) {
  const provider = new GoogleAuthProvider();
  const params = {};
  if (emailHint) {
    params.login_hint = emailHint;
  }
  if (forceSelect) params.prompt = 'select_account';
  if (Object.keys(params).length) provider.setCustomParameters(params);
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

// 로그아웃
export async function logout() {
  await signOut(auth);
}

// 유저 상태 감지
export function onUserChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Firestore에서 유저 데이터 불러오기
export async function loadUserData(uid) {
  const ref  = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// Firestore에 유저 데이터 저장
export async function saveUserData(uid, data) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, cleanForFirestore(data));
}
