// ============================================
// Weekly Planner - Drag & Drop
// js/dragdrop.js
// ============================================

window.WP = window.WP || {};

WP.DragDrop = {
  isDragging: false,
  dragItem: null,         // ドラッグ中のDOM要素
  dragSchedule: null,     // ドラッグ中のスケジュールデータ
  dragGhost: null,        // ドラッグプレビュー要素
  startX: 0,
  startY: 0,
  offsetY: 0,
  longPressTimer: null,

  // ==============================
  // Initialize
  // ==============================
  init() {
    if (WP.UI.isMobile()) {
      this.initMobileDrag();
    } else {
      this.initPCDrag();
    }

    // リサイズ時に再バインド
    window.addEventListener('resize', WP.UI.debounce(() => {
      this.cleanup();
      if (WP.UI.isMobile()) {
        this.initMobileDrag();
      } else {
        this.initPCDrag();
      }
    }, 300));
  },

  // ==============================
  // PC Drag (Mouse)
  // ==============================
  initPCDrag() {
    const container = document.getElementById('days-container');
    if (!container) return;

    container.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
  },

  onMouseDown(e) {
    const item = e.target.closest('.schedule-item');
    if (!item) return;

    e.preventDefault();
    e.stopPropagation();

    this.dragItem = item;
    this.dragSchedule = item._scheduleData;
    this.startX = e.clientX;
    this.startY = e.clientY;
    
    const rect = item.getBoundingClientRect();
    this.offsetY = e.clientY - rect.top;

    // ドラッグ開始は少し動いてから
    this._mouseDownPending = true;
  },

  onMouseMove(e) {
    if (this._mouseDownPending && this.dragItem) {
      const dx = Math.abs(e.clientX - this.startX);
      const dy = Math.abs(e.clientY - this.startY);

      if (dx > 5 || dy > 5) {
        this._mouseDownPending = false;
        this.startDrag(e);
      }
      return;
    }

    if (!this.isDragging) return;

    e.preventDefault();
    this.updateDragPosition(e.clientX, e.clientY);
  },

  onMouseUp(e) {
    this._mouseDownPending = false;

    if (this.isDragging) {
      this.endDrag(e.clientX, e.clientY);
    }

    this.dragItem = null;
  },

  // ==============================
  // Mobile Drag (Touch - Long Press)
  // ==============================
  initMobileDrag() {
    const list = document.getElementById('mobile-schedule-list');
    if (!list) return;

    // モバイルでもグリッドが表示される場合のための安全チェック
    const container = document.getElementById('days-container');
    
    // モバイルのタッチイベント (リスト内のアイテムに対して)
    list.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    list.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    list.addEventListener('touchend', (e) => this.onTouchEnd(e));
    list.addEventListener('touchcancel', (e) => this.onTouchEnd(e));

    // スワイプナビゲーション
    this.initSwipe();
  },

  onTouchStart(e) {
    const item = e.target.closest('.mobile-schedule-item');
    if (!item) return;

    this.dragItem = item;
    this.dragSchedule = item._scheduleData;

    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;

    // 長押し検出 (300ms)
    this.longPressTimer = setTimeout(() => {
      // ハプティックフィードバック (対応端末のみ)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      item.classList.add('long-press');
      this._longPressTriggered = true;
    }, 300);
  },

  onTouchMove(e) {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - this.startX);
    const dy = Math.abs(touch.clientY - this.startY);

    // 少しでも動いたら長押しキャンセル (ドラッグの場合は除く)
    if (!this._longPressTriggered && (dx > 10 || dy > 10)) {
      clearTimeout(this.longPressTimer);
      return;
    }

    if (this._longPressTriggered) {
      e.preventDefault();
      // モバイルではドラッグ移動の視覚フィードバックのみ
      // (実際の移動はモーダルで行う)
    }
  },

  onTouchEnd(e) {
    clearTimeout(this.longPressTimer);

    if (this._longPressTriggered && this.dragSchedule) {
      // 長押し完了 → 変更モーダルを開く
      this._longPressTriggered = false;
      
      if (this.dragItem) {
        this.dragItem.classList.remove('long-press');
      }

      // モバイルではドラッグ変更モーダルの代わりに編集モーダルを開く
      WP.Modal.openEditModal(this.dragSchedule);
    }

    this._longPressTriggered = false;
    this.dragItem = null;
    this.dragSchedule = null;
  },

  // ==============================
  // Swipe Navigation (Mobile)
  // ==============================
  initSwipe() {
    const dayView = document.getElementById('mobile-day-view');
    if (!dayView) return;

    let swipeStartX = 0;
    let swipeStartY = 0;
    let swiping = false;

    dayView.addEventListener('touchstart', (e) => {
      // スケジュールアイテム上では無視
      if (e.target.closest('.mobile-schedule-item')) return;
      
      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
      swiping = true;
    }, { passive: true });

    dayView.addEventListener('touchend', (e) => {
      if (!swiping) return;
      swiping = false;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - swipeStartX;
      const dy = endY - swipeStartY;

      // 水平方向のスワイプが十分か
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          // 左スワイプ → 次の曜日
          WP.Schedule.selectedMobileDay = Math.min(6, WP.Schedule.selectedMobileDay + 1);
        } else {
          // 右スワイプ → 前の曜日
          WP.Schedule.selectedMobileDay = Math.max(0, WP.Schedule.selectedMobileDay - 1);
        }
        WP.Schedule.updateMobileDayTabs();
        WP.Schedule.renderMobileView();
      }
    }, { passive: true });
  },

  // ==============================
  // Start PC Drag
  // ==============================
  startDrag(e) {
    if (!this.dragItem || !this.dragSchedule) return;

    this.isDragging = true;
    this.dragItem.classList.add('dragging');

    // ドラッグゴーストを作成
    const container = document.getElementById('days-container');
    this.dragGhost = document.createElement('div');
    this.dragGhost.className = 'drag-ghost';
    
    const duration = WP.UI.timeToMinutes(this.dragSchedule.endTime) - WP.UI.timeToMinutes(this.dragSchedule.startTime);
    this.dragGhost.style.height = `${(duration / 30) * WP.SLOT_HEIGHT}px`;
    
    container.appendChild(this.dragGhost);

    this.updateDragPosition(e.clientX, e.clientY);
  },

  // ==============================
  // Update Drag Position
  // ==============================
  updateDragPosition(clientX, clientY) {
    if (!this.isDragging || !this.dragGhost) return;

    const container = document.getElementById('days-container');
    const columns = container.querySelectorAll('.day-column');
    const gridBody = document.getElementById('grid-body');

    // どのカラムの上にいるか判定
    let targetColumn = null;
    let colIndex = -1;

    columns.forEach((col, index) => {
      const rect = col.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        targetColumn = col;
        colIndex = index;
      }
    });

    if (targetColumn) {
      const rect = targetColumn.getBoundingClientRect();
      const scrollTop = gridBody.scrollTop;
      const y = clientY - rect.top + scrollTop - this.offsetY;

      // 30分刻みにスナップ
      const snappedSlot = Math.round(y / WP.SLOT_HEIGHT);
      const snappedY = Math.max(0, snappedSlot * WP.SLOT_HEIGHT);

      // ゴーストを適切な位置に配置
      const colLeft = targetColumn.offsetLeft;
      this.dragGhost.style.left = `${colLeft + 2}px`;
      this.dragGhost.style.right = 'auto';
      this.dragGhost.style.width = `${targetColumn.offsetWidth - 4}px`;
      this.dragGhost.style.top = `${snappedY}px`;
      this.dragGhost.style.display = 'block';

      // ゴーストにデータを保存
      this.dragGhost._targetDay = colIndex;
      this.dragGhost._targetY = snappedY;
    }
  },

  // ==============================
  // End PC Drag
  // ==============================
  async endDrag(clientX, clientY) {
    if (!this.isDragging) return;

    this.isDragging = false;

    if (this.dragItem) {
      this.dragItem.classList.remove('dragging');
    }

    // ゴーストから新しい位置を取得
    if (this.dragGhost && this.dragGhost._targetDay !== undefined) {
      const newDayOfWeek = this.dragGhost._targetDay;
      const newStartTime = WP.UI.pixelToTime(this.dragGhost._targetY);
      
      // 元のdurationを維持
      const originalDuration = WP.UI.timeToMinutes(this.dragSchedule.endTime) - WP.UI.timeToMinutes(this.dragSchedule.startTime);
      const newStartMinutes = WP.UI.timeToMinutes(newStartTime);
      const newEndMinutes = Math.min(newStartMinutes + originalDuration, 1440);
      const newEndTime = WP.UI.minutesToTime(newEndMinutes);

      // 変更があったかチェック
      if (newDayOfWeek !== this.dragSchedule.dayOfWeek ||
          newStartTime !== this.dragSchedule.startTime ||
          newEndTime !== this.dragSchedule.endTime) {
        
        // ドラッグ変更モーダルを表示
        await WP.Modal.openDragModal(
          this.dragSchedule,
          newDayOfWeek,
          newStartTime,
          newEndTime
        );
      }
    }

    this.cleanup();
  },

  // ==============================
  // Cleanup
  // ==============================
  cleanup() {
    if (this.dragGhost && this.dragGhost.parentElement) {
      this.dragGhost.parentElement.removeChild(this.dragGhost);
    }
    this.dragGhost = null;
    this.isDragging = false;
    this._mouseDownPending = false;
    this._longPressTriggered = false;
    clearTimeout(this.longPressTimer);
  }
};
