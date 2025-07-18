// Firebase設定と初期化
// 注意: 実際の値はFirebaseコンソールから取得してください
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebaseの初期化
firebase.initializeApp(firebaseConfig);

// サービスの初期化
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 認証の永続性設定
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);