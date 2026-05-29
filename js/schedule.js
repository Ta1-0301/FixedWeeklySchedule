// ============================================
// Weekly Planner - Schedule Rendering
// js/schedule.js
// ============================================

window.WP = window.WP || {};

WP.Schedule = {
  currentMonday: null,        // 現在表示中の週の月曜日
  recurringSchedules: [],     // 固定スケジュール一覧
  overrides: [],             // 今週のoverride一覧
  mergedSchedules: [],       // マージ後のスケジュール
  selectedMobileDay: 0,      // モバイルで選択中の曜日 (0=月)

  // ==============================
  // Initialize
  // ==============================
  init() {
    this.currentMonday = WP.UI.getMonday(new Date());
    this.selectedMobileDay = WP.UI.getTodayDayIndex();

    this.buildTimeColumn();
    this.bindEvents();
    this.loadAndRender();

    // 現在時刻ラインの更新
    this.updateCurrentTimeLine();
    setInterval(() => this.updateCurrentTimeLine(), 60000); // 1分ごと

    // 初期スクロール位置 (8:00付近)
    setTimeout(() => {
      const gridBody = document.getElementById('grid-body');
      if (gridBody) {
        const scrollTo = WP.UI.timeToPixel('08:00');
        gridBody.scrollTop = scrollTo - 40;
      }
    }, 100);
  },

  // ==============================
  // Event Binding
  // ==============================
  bindEvents() {
    // 週ナビゲーション
    document.getElementById('prev-week-btn').addEventListener('click', () => this.navigateWeek(-1));
    document.getElementById('next-week-btn').addEventListener('click', () => this.navigateWeek(1));
    document.getElementById('today-btn').addEventListener('click', () => this.goToToday());

    // モバイル曜日タブ
    document.querySelectorAll('.day-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.selectedMobileDay = parseInt(tab.dataset.day);
        this.updateMobileDayTabs();
        this.renderMobileView();
      });
    });

    // グリッドクリックで予定追加 (PC)
    document.querySelectorAll('.day-column').forEach(col => {
      col.addEventListener('click', (e) => {
        if (e.target.closest('.schedule-item')) return;
        const rect = col.getBoundingClientRect();
        const y = e.clientY - rect.top + col.parentElement.parentElement.scrollTop;
        const startTime = WP.UI.pixelToTime(y);
        const startMin = WP.UI.timeToMinutes(startTime);
        const endTime = WP.UI.minutesToTime(Math.min(startMin + 60, 1440));
        WP.Modal.openAddModal(col.dataset.day, startTime, endTime);
      });
    });

    // ウィンドウリサイズ
    window.addEventListener('resize', WP.UI.debounce(() => {
      this.render();
    }, 200));
  },

  // ==============================
  // Build Time Column
  // ==============================
  buildTimeColumn() {
    const timeCol = document.getElementById('time-column');
    if (!timeCol) return;

    timeCol.innerHTML = '';

    for (let i = 0; i < WP.TOTAL_SLOTS; i++) {
      const label = document.createElement('div');
      label.className = 'time-label';

      const minutes = i * 30;
      const isHour = minutes % 60 === 0;

      if (isHour) {
        label.classList.add('hour-label');
        label.textContent = WP.UI.minutesToTime(minutes);
      }
      // 30分の目盛りは空白

      timeCol.appendChild(label);
    }
  },

  // ==============================
  // Week Navigation
  // ==============================
  navigateWeek(offset) {
    const newMonday = new Date(this.currentMonday);
    newMonday.setDate(newMonday.getDate() + offset * 7);
    this.currentMonday = newMonday;
    this.loadAndRender();
  },

  goToToday() {
    this.currentMonday = WP.UI.getMonday(new Date());
    this.selectedMobileDay = WP.UI.getTodayDayIndex();
    this.loadAndRender();
  },

  getCurrentTargetWeek() {
    return WP.UI.formatDateISO(this.currentMonday);
  },

  // ==============================
  // Load Data & Render
  // ==============================
  async loadAndRender() {
    const uid = WP.Auth.getUid();
    if (!uid) return;

    try {
      // 固定スケジュールとoverridesを並列取得
      const targetWeek = this.getCurrentTargetWeek();
      const [recurring, overrides] = await Promise.all([
        WP.Firestore.getRecurringSchedules(uid),
        WP.Firestore.getScheduleOverrides(uid, targetWeek)
      ]);

      this.recurringSchedules = recurring;
      this.overrides = overrides;

      // マージ
      this.mergedSchedules = this.mergeSchedules(recurring, overrides);

      // 描画
      this.render();
    } catch (error) {
      console.error('Error loading schedules:', error);
      WP.UI.showToast('スケジュールの読み込みに失敗しました', 'error');
    }
  },

  // ==============================
  // Merge Schedules
  // ==============================
  mergeSchedules(recurring, overrides) {
    const merged = [];

    for (const schedule of recurring) {
      const override = overrides.find(o => o.recurringScheduleId === schedule.id);

      if (override) {
        // overrideがある場合、override情報で表示
        merged.push({
          id: override.id,
          originalScheduleId: schedule.id,
          recurringScheduleId: schedule.id,
          overrideId: override.id,
          uid: schedule.uid,
          title: override.title,
          category: override.category,
          dayOfWeek: override.dayOfWeek,
          startTime: override.startTime,
          endTime: override.endTime,
          memo: override.memo,
          isOverride: true,
          originalData: { ...schedule }
        });
      } else {
        merged.push({
          ...schedule,
          isOverride: false
        });
      }
    }

    return merged;
  },

  // ==============================
  // Render
  // ==============================
  render() {
    this.updateWeekLabel();
    this.updateDayHeaders();
    this.updateMobileDayTabs();

    if (WP.UI.isMobile()) {
      this.renderMobileView();
    } else {
      this.renderPCGrid();
    }

    this.updateCurrentTimeLine();
  },

  // ==============================
  // Update Week Label
  // ==============================
  updateWeekLabel() {
    const label = document.getElementById('current-week-label');
    if (label) {
      label.textContent = WP.UI.formatWeekLabel(this.currentMonday);
    }

    // 今週ボタンの表示制御
    const todayBtn = document.getElementById('today-btn');
    if (todayBtn) {
      if (WP.UI.isCurrentWeek(this.currentMonday)) {
        todayBtn.style.opacity = '0.5';
        todayBtn.style.pointerEvents = 'none';
      } else {
        todayBtn.style.opacity = '1';
        todayBtn.style.pointerEvents = 'auto';
      }
    }
  },

  // ==============================
  // Update Day Headers (PC)
  // ==============================
  updateDayHeaders() {
    const todayIndex = WP.UI.getTodayDayIndex();
    const isThisWeek = WP.UI.isCurrentWeek(this.currentMonday);

    document.querySelectorAll('.day-header-cell').forEach(cell => {
      const dayIndex = parseInt(cell.dataset.day);
      const date = new Date(this.currentMonday);
      date.setDate(date.getDate() + dayIndex);

      // 日付表示
      const dateEl = cell.querySelector('.day-date');
      if (dateEl) {
        dateEl.textContent = WP.UI.formatDateShort(date);
      }

      // 今日のハイライト
      cell.classList.toggle('today', isThisWeek && dayIndex === todayIndex);
    });

    // 曜日カラムのハイライト
    document.querySelectorAll('.day-column').forEach(col => {
      const dayIndex = parseInt(col.dataset.day);
      col.classList.toggle('today-column', isThisWeek && dayIndex === todayIndex);
    });
  },

  // ==============================
  // Update Mobile Day Tabs
  // ==============================
  updateMobileDayTabs() {
    const todayIndex = WP.UI.getTodayDayIndex();
    const isThisWeek = WP.UI.isCurrentWeek(this.currentMonday);

    document.querySelectorAll('.day-tab').forEach(tab => {
      const dayIndex = parseInt(tab.dataset.day);
      tab.classList.toggle('active', dayIndex === this.selectedMobileDay);
      tab.classList.toggle('today', isThisWeek && dayIndex === todayIndex);

      // 日付追記
      const date = new Date(this.currentMonday);
      date.setDate(date.getDate() + dayIndex);
      const dateStr = `${date.getDate()}`;
      tab.innerHTML = `${WP.DAY_NAMES[dayIndex]}<br><small style="font-size:0.65rem;opacity:0.7;">${dateStr}</small>`;
    });
  },

  // ==============================
  // Render PC Grid
  // ==============================
  renderPCGrid() {
    // 各曜日カラムをクリア
    document.querySelectorAll('.day-column').forEach(col => {
      col.querySelectorAll('.schedule-item').forEach(item => item.remove());
    });

    // スケジュールアイテムを配置
    for (const schedule of this.mergedSchedules) {
      this.renderPCScheduleItem(schedule);
    }
  },

  renderPCScheduleItem(schedule) {
    const col = document.querySelector(`.day-column[data-day="${schedule.dayOfWeek}"]`);
    if (!col) return;

    const top = WP.UI.timeToPixel(schedule.startTime);
    const bottom = WP.UI.timeToPixel(schedule.endTime);
    const height = bottom - top;

    const item = document.createElement('div');
    item.className = 'schedule-item';
    item.dataset.id = schedule.id;
    item.dataset.category = schedule.category;
    item.dataset.dayOfWeek = schedule.dayOfWeek;
    item.style.top = `${top}px`;
    item.style.height = `${Math.max(height, 20)}px`;

    // コンテンツ
    let html = `<div class="item-title">${WP.UI.escapeHtml(schedule.title)}</div>`;
    html += `<div class="item-time">${schedule.startTime} - ${schedule.endTime}</div>`;

    if (height >= 60 && schedule.memo) {
      html += `<div class="item-memo">${WP.UI.escapeHtml(schedule.memo)}</div>`;
    }

    if (schedule.isOverride) {
      html += '<div class="override-badge" title="今週のみの変更"></div>';
    }

    item.innerHTML = html;

    // クリックで編集モーダル
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      WP.Modal.openEditModal(schedule);
    });

    // ドラッグ用データをセット
    item._scheduleData = schedule;

    col.appendChild(item);
  },

  // ==============================
  // Render Mobile View
  // ==============================
  renderMobileView() {
    const titleEl = document.getElementById('mobile-day-title');
    const listEl = document.getElementById('mobile-schedule-list');
    const emptyEl = document.getElementById('mobile-empty');

    const date = new Date(this.currentMonday);
    date.setDate(date.getDate() + this.selectedMobileDay);
    
    titleEl.textContent = `${WP.DAY_NAMES_FULL[this.selectedMobileDay]} (${WP.UI.formatDateShort(date)})`;

    // 選択曜日のスケジュールを時刻順でソート
    const daySchedules = this.mergedSchedules
      .filter(s => s.dayOfWeek === this.selectedMobileDay)
      .sort((a, b) => WP.UI.timeToMinutes(a.startTime) - WP.UI.timeToMinutes(b.startTime));

    listEl.innerHTML = '';

    if (daySchedules.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');

    for (const schedule of daySchedules) {
      const item = document.createElement('div');
      item.className = 'mobile-schedule-item';
      item.dataset.id = schedule.id;
      item.dataset.category = schedule.category;

      let html = `
        <div class="mobile-item-time">
          <span class="mobile-time-start">${schedule.startTime}</span>
          <span class="mobile-time-separator">│</span>
          <span class="mobile-time-end">${schedule.endTime}</span>
        </div>
        <div class="mobile-item-content">
          <div class="mobile-item-title">${WP.UI.escapeHtml(schedule.title)}</div>
          <span class="mobile-item-category" data-category="${schedule.category}">${schedule.category}</span>
          ${schedule.memo ? `<div class="mobile-item-memo">${WP.UI.escapeHtml(schedule.memo)}</div>` : ''}
        </div>
      `;

      if (schedule.isOverride) {
        html += '<div class="mobile-override-badge">変更中</div>';
      }

      item.innerHTML = html;
      item._scheduleData = schedule;

      // タップで編集
      item.addEventListener('click', () => {
        WP.Modal.openEditModal(schedule);
      });

      listEl.appendChild(item);
    }
  },

  // ==============================
  // Current Time Line
  // ==============================
  updateCurrentTimeLine() {
    const line = document.getElementById('current-time-line');
    if (!line) return;

    const isThisWeek = WP.UI.isCurrentWeek(this.currentMonday);

    if (!isThisWeek) {
      line.classList.add('hidden');
      return;
    }

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const top = (totalMinutes / 30) * WP.SLOT_HEIGHT;

    line.style.top = `${top}px`;
    line.classList.remove('hidden');
  },

  // ==============================
  // Get schedule by ID from merged list
  // ==============================
  getScheduleById(id) {
    return this.mergedSchedules.find(s => s.id === id);
  }
};
