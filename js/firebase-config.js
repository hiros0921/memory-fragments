// Firebase設定と初期化
const firebaseConfig = {
    apiKey: "AIzaSyBqOMvegX7nfUrtVtTSpVNYpiq1BJTAM0k",
    authDomain: "memory-fragments.firebaseapp.com",
    projectId: "memory-fragments",
    storageBucket: "memory-fragments.firebasestorage.app",
    messagingSenderId: "798156189875",
    appId: "1:798156189875:web:404069566f9fa68a8580c6",
    measurementId: "G-8T2KT0Z9ZE"
};

// Firebaseの初期化
firebase.initializeApp(firebaseConfig);

// サービスの初期化
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 認証の永続性設定
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);