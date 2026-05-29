// ============================================
// Weekly Planner - Main Application
// js/app.js
// ============================================

window.WP = window.WP || {};

WP.App = {
  // ==============================
  // Initialize Application
  // ==============================
  init() {
    console.log('Weekly Planner initializing...');

    // モーダル初期化
    WP.Modal.init();

    // 認証初期化 (Auth状態変化で画面遷移)
    WP.Auth.init();

    // イベントリスナー設定
    this.bindGlobalEvents();

    // Analytics: ページビュー
    WP.analytics.logEvent('page_view', {
      page_title: 'Weekly Planner',
      page_location: window.location.href
    });

    console.log('Weekly Planner initialized');
  },

  // ==============================
  // Global Event Listeners
  // ==============================
  bindGlobalEvents() {
    // Googleログインボタン
    document.getElementById('google-login-btn').addEventListener('click', () => {
      WP.Auth.login();
    });

    // ログアウトボタン
    document.getElementById('logout-btn').addEventListener('click', () => {
      WP.Auth.logout();
    });

    // FABボタン (予定追加)
    document.getElementById('add-schedule-fab').addEventListener('click', () => {
      // モバイルの場合は現在選択中の曜日をプリセット
      if (WP.UI.isMobile() && WP.Schedule) {
        WP.Modal.openAddModal(WP.Schedule.selectedMobileDay);
      } else {
        WP.Modal.openAddModal();
      }
    });

    // エラーハンドリング
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }
};

// ==============================
// DOM Ready
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  WP.App.init();
});
