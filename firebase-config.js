// ------------------- ▼▼▼ この部分を書き換える ▼▼▼ -------------------
// STEP1でコピーした、あなた自身のFirebase設定情報を貼り付けてください。

const firebaseConfig = {
    apiKey: "AIzaSyDfskC92FG47SGSc_CPGG2s8DeOcZiRyPc",
    authDomain: "fanclub-goods-system.firebaseapp.com",
    projectId: "fanclub-goods-system",
    storageBucket: "fanclub-goods-system.firebasestorage.app",
    messagingSenderId: "738476621067",
    appId: "1:738476621067:web:abd699999de9019f5a360e"
  };

// ------------------- ▲▲▲ この部分を書き換える ▲▲▲ -------------------


// Firebaseを初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
