// ============================================
// Firebase Configuration
// Weekly Planner - firebase-config.js
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyBQxJWmXXFQWCHOleKIHdsmX6LeUZU_9qQ",
  authDomain: "fixed-weekly-schedule.firebaseapp.com",
  projectId: "fixed-weekly-schedule",
  storageBucket: "fixed-weekly-schedule.firebasestorage.app",
  messagingSenderId: "24973582100",
  appId: "1:24973582100:web:18bdb5bebfc623f6b82c01",
  measurementId: "G-LC7PYSMC0G"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// グローバル名前空間
window.WP = window.WP || {};

// Firebase サービスインスタンス
WP.auth = firebase.auth();
WP.db = firebase.firestore();
WP.analytics = firebase.analytics();

// Google認証プロバイダー
WP.googleProvider = new firebase.auth.GoogleAuthProvider();

// カテゴリ定義
WP.CATEGORIES = {
  '授業': { color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)' },
  'アルバイト': { color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)' },
  '研究': { color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.4)' },
  'サークル': { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)' },
  'プライベート': { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' },
  'その他': { color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)', borderColor: 'rgba(107, 114, 128, 0.4)' }
};

// 曜日マッピング
WP.DAY_NAMES = ['月', '火', '水', '木', '金', '土', '日'];
WP.DAY_NAMES_FULL = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];

// スケジュール定数
WP.SLOT_HEIGHT = 40; // 30分あたりのピクセル数
WP.TOTAL_HOURS = 24;
WP.TOTAL_SLOTS = 48; // 24時間 × 2 (30分刻み)

console.log('Firebase initialized successfully');
