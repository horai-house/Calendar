/**
 * Firebase 設定ファイル
 * Firebase Console から取得した設定情報を以下に貼り付けてください。
 */
const firebaseConfig = {
  apiKey: "AIzaSyA8zeM_nFxTD8k5u3yudWkoxbsYPhRcsbQ",
  authDomain: "annualcalendar-7ec4c.firebaseapp.com",
  projectId: "annualcalendar-7ec4c",
  storageBucket: "annualcalendar-7ec4c.firebasestorage.app",
  messagingSenderId: "183493934695",
  appId: "1:183493934695:web:3e2258c7ff19d163d01ec2",
  measurementId: "G-3ZZQ1W7FSZ"
};

// Firebase 初期化
if (typeof firebase !== 'undefined') {
  try {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();
    console.log("Firebase initialized successfully.");
  } catch (e) {
    console.warn("Firebase initialization failed or config is default:", e);
  }
}
