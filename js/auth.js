// ============================================
// Weekly Planner - Authentication
// js/auth.js
// ============================================

window.WP = window.WP || {};

WP.Auth = {
  currentUser: null,

  // ==============================
  // Initialize Auth Listener
  // ==============================
  init() {
    WP.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUser = user;
        
        // Firestoreにユーザー情報を保存/更新
        await WP.Firestore.saveUser(user);

        // UI更新
        this.updateUserUI(user);
        WP.UI.showScreen('app-screen');
        WP.UI.hideLoading();

        // スケジュール読み込み
        if (WP.Schedule) {
          WP.Schedule.init();
        }

        // Analytics: ログインイベント
        WP.analytics.logEvent('login', { method: 'Google' });

      } else {
        this.currentUser = null;
        WP.UI.showScreen('login-screen');
        WP.UI.hideLoading();
      }
    });
  },

  // ==============================
  // Google Login
  // ==============================
  async login() {
    try {
      const result = await WP.auth.signInWithPopup(WP.googleProvider);
      console.log('Login successful:', result.user.displayName);
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        WP.UI.showToast('ログインがキャンセルされました', 'info');
      } else if (error.code === 'auth/popup-blocked') {
        WP.UI.showToast('ポップアップがブロックされました。ポップアップを許可してください。', 'error');
      } else {
        WP.UI.showToast('ログインに失敗しました', 'error');
      }
    }
  },

  // ==============================
  // Logout
  // ==============================
  async logout() {
    try {
      await WP.auth.signOut();
      WP.UI.showToast('ログアウトしました', 'info');
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      WP.UI.showToast('ログアウトに失敗しました', 'error');
    }
  },

  // ==============================
  // Update User UI
  // ==============================
  updateUserUI(user) {
    const photo = document.getElementById('user-photo');
    const name = document.getElementById('user-name');

    if (photo) {
      photo.src = user.photoURL || 'assets/logo.png';
      photo.alt = user.displayName || 'ユーザー';
    }

    if (name) {
      name.textContent = user.displayName || 'ユーザー';
    }
  },

  // ==============================
  // Get Current UID
  // ==============================
  getUid() {
    return this.currentUser ? this.currentUser.uid : null;
  }
};
