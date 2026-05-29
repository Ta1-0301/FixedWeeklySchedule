// ============================================
// Weekly Planner - UI Utilities
// js/ui.js
// ============================================

window.WP = window.WP || {};

WP.UI = {
  // ==============================
  // Toast Notifications
  // ==============================
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ==============================
  // Screen Management
  // ==============================
  showScreen(screenId) {
    const screens = ['loading-screen', 'login-screen', 'app-screen'];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === screenId) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });
  },

  hideLoading() {
    const loading = document.getElementById('loading-screen');
    if (loading) {
      loading.classList.add('fade-out');
      setTimeout(() => loading.classList.add('hidden'), 400);
    }
  },

  // ==============================
  // Date Utilities
  // ==============================

  // 指定日の週の月曜日を取得
  getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  },

  // 週ラベルを生成 (例: "2026年5月25日 〜 5月31日")
  formatWeekLabel(monday) {
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const monYear = monday.getFullYear();
    const monMonth = monday.getMonth() + 1;
    const monDay = monday.getDate();
    const sunMonth = sunday.getMonth() + 1;
    const sunDay = sunday.getDate();

    if (monMonth === sunMonth) {
      return `${monYear}年${monMonth}月${monDay}日 〜 ${sunDay}日`;
    } else {
      return `${monYear}年${monMonth}月${monDay}日 〜 ${sunMonth}月${sunDay}日`;
    }
  },

  // 日付フォーマット (M/D)
  formatDateShort(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  },

  // targetWeek用のISO日付文字列 (YYYY-MM-DD)
  formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  // 今日の曜日インデックス (0=月, 6=日)
  getTodayDayIndex() {
    const jsDay = new Date().getDay(); // 0=日, 1=月, ..., 6=土
    return jsDay === 0 ? 6 : jsDay - 1;
  },

  // 指定Mondayが今週かどうか
  isCurrentWeek(monday) {
    const currentMonday = this.getMonday(new Date());
    return monday.getTime() === currentMonday.getTime();
  },

  // ==============================
  // Time Utilities
  // ==============================

  // 時刻文字列を分に変換 ("09:30" → 570)
  timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  },

  // 分を時刻文字列に変換 (570 → "09:30")
  minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  // 時刻からピクセル位置を計算
  timeToPixel(timeStr) {
    const minutes = this.timeToMinutes(timeStr);
    return (minutes / 30) * WP.SLOT_HEIGHT;
  },

  // ピクセル位置から時刻を計算 (30分刻みにスナップ)
  pixelToTime(px) {
    const slot = Math.round(px / WP.SLOT_HEIGHT);
    const clampedSlot = Math.max(0, Math.min(slot, WP.TOTAL_SLOTS));
    return this.minutesToTime(clampedSlot * 30);
  },

  // 時間の選択肢を生成
  generateTimeOptions(selectElement, isEnd = false) {
    selectElement.innerHTML = '';
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '選択';
    selectElement.appendChild(defaultOption);

    const startMinutes = isEnd ? 30 : 0;
    const endMinutes = isEnd ? 1440 : 1410; // 24:00 or 23:30

    for (let m = startMinutes; m <= endMinutes; m += 30) {
      const option = document.createElement('option');
      option.value = this.minutesToTime(m);
      option.textContent = this.minutesToTime(m);
      selectElement.appendChild(option);
    }
  },

  // ==============================
  // HTML Escaping (XSS対策)
  // ==============================
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  },

  // ==============================
  // Input Validation
  // ==============================
  validateScheduleForm(data) {
    const errors = {};

    if (!data.title || data.title.trim() === '') {
      errors.title = 'タイトルを入力してください';
    } else if (data.title.length > 50) {
      errors.title = 'タイトルは50文字以内で入力してください';
    }

    if (!data.category) {
      errors.category = 'カテゴリを選択してください';
    }

    if (data.dayOfWeek === '' || data.dayOfWeek === undefined || data.dayOfWeek === null) {
      errors.day = '曜日を選択してください';
    }

    if (!data.startTime) {
      errors.startTime = '開始時刻を選択してください';
    }

    if (!data.endTime) {
      errors.endTime = '終了時刻を選択してください';
    }

    if (data.startTime && data.endTime) {
      const start = this.timeToMinutes(data.startTime);
      const end = this.timeToMinutes(data.endTime);
      if (start >= end) {
        errors.endTime = '終了時刻は開始時刻より後にしてください';
      }
    }

    if (data.memo && data.memo.length > 200) {
      errors.memo = 'メモは200文字以内で入力してください';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // ==============================
  // Responsive Detection
  // ==============================
  isMobile() {
    return window.innerWidth <= 768;
  },

  // ==============================
  // Debounce
  // ==============================
  debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
};
