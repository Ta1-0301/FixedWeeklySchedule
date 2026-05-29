// ============================================
// Weekly Planner - Modal Management
// js/modal.js
// ============================================

window.WP = window.WP || {};

WP.Modal = {
  editingScheduleId: null,    // 編集中のスケジュールID
  editingIsOverride: false,   // 編集対象がoverrideかどうか
  editingOriginalData: null,  // 編集前の元データ

  // ==============================
  // Initialize
  // ==============================
  init() {
    // 時刻選択肢を生成
    const startSelect = document.getElementById('input-start-time');
    const endSelect = document.getElementById('input-end-time');
    WP.UI.generateTimeOptions(startSelect, false);
    WP.UI.generateTimeOptions(endSelect, true);

    // モーダルイベント
    this.bindEvents();
  },

  // ==============================
  // Event Binding
  // ==============================
  bindEvents() {
    // Schedule Modal
    const form = document.getElementById('schedule-form');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    const deleteBtn = document.getElementById('modal-delete-btn');
    const overlay = document.getElementById('schedule-modal');

    form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    cancelBtn.addEventListener('click', () => this.closeScheduleModal());
    closeBtn.addEventListener('click', () => this.closeScheduleModal());
    deleteBtn.addEventListener('click', () => this.handleDeleteClick());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeScheduleModal();
    });

    // Drag Modal
    const dragSaveBtn = document.getElementById('drag-save-btn');
    const dragCancelBtn = document.getElementById('drag-cancel-btn');
    const dragOverlay = document.getElementById('drag-modal');

    dragSaveBtn.addEventListener('click', () => this.handleDragSave());
    dragCancelBtn.addEventListener('click', () => this.closeDragModal());
    dragOverlay.addEventListener('click', (e) => {
      if (e.target === dragOverlay) this.closeDragModal();
    });

    // Delete Modal
    const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
    const deleteCancelBtn = document.getElementById('delete-cancel-btn');
    const deleteOverlay = document.getElementById('delete-modal');

    deleteConfirmBtn.addEventListener('click', () => this.handleDeleteConfirm());
    deleteCancelBtn.addEventListener('click', () => this.closeDeleteModal());
    deleteOverlay.addEventListener('click', (e) => {
      if (e.target === deleteOverlay) this.closeDeleteModal();
    });

    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeScheduleModal();
        this.closeDragModal();
        this.closeDeleteModal();
      }
    });
  },

  // ==============================
  // Schedule Modal: Open for Add
  // ==============================
  openAddModal(dayOfWeek = '', startTime = '', endTime = '') {
    this.editingScheduleId = null;
    this.editingIsOverride = false;
    this.editingOriginalData = null;

    // タイトル変更
    document.getElementById('modal-title').textContent = '予定を追加';

    // フォームリセット
    document.getElementById('schedule-form').reset();
    this.clearFormErrors();

    // プリセット値
    if (dayOfWeek !== '') {
      document.getElementById('input-day').value = dayOfWeek;
    }
    if (startTime) {
      document.getElementById('input-start-time').value = startTime;
    }
    if (endTime) {
      document.getElementById('input-end-time').value = endTime;
    }

    // 削除ボタン非表示
    document.getElementById('modal-delete-btn').classList.add('hidden');

    // モーダル表示
    document.getElementById('schedule-modal').classList.remove('hidden');
    
    // フォーカス
    setTimeout(() => {
      document.getElementById('input-title').focus();
    }, 100);
  },

  // ==============================
  // Schedule Modal: Open for Edit
  // ==============================
  openEditModal(schedule) {
    this.editingScheduleId = schedule.id;
    this.editingIsOverride = schedule.isOverride || false;
    this.editingOriginalData = { ...schedule };

    // タイトル変更
    document.getElementById('modal-title').textContent = '予定を編集';

    // フォームに値をセット
    document.getElementById('input-title').value = schedule.title || '';
    document.getElementById('input-category').value = schedule.category || '';
    document.getElementById('input-day').value = schedule.dayOfWeek !== undefined ? schedule.dayOfWeek : '';
    document.getElementById('input-start-time').value = schedule.startTime || '';
    document.getElementById('input-end-time').value = schedule.endTime || '';
    document.getElementById('input-memo').value = schedule.memo || '';

    this.clearFormErrors();

    // 削除ボタン表示
    document.getElementById('modal-delete-btn').classList.remove('hidden');

    // モーダル表示
    document.getElementById('schedule-modal').classList.remove('hidden');
  },

  // ==============================
  // Schedule Modal: Close
  // ==============================
  closeScheduleModal() {
    document.getElementById('schedule-modal').classList.add('hidden');
    this.editingScheduleId = null;
    this.editingIsOverride = false;
    this.editingOriginalData = null;
  },

  // ==============================
  // Form Submission
  // ==============================
  async handleFormSubmit(e) {
    e.preventDefault();

    const data = {
      title: document.getElementById('input-title').value,
      category: document.getElementById('input-category').value,
      dayOfWeek: document.getElementById('input-day').value,
      startTime: document.getElementById('input-start-time').value,
      endTime: document.getElementById('input-end-time').value,
      memo: document.getElementById('input-memo').value
    };

    // バリデーション
    const validation = WP.UI.validateScheduleForm(data);
    if (!validation.isValid) {
      this.showFormErrors(validation.errors);
      return;
    }

    // 保存ボタン無効化
    const saveBtn = document.getElementById('modal-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      if (this.editingScheduleId) {
        // 編集モード
        if (this.editingIsOverride) {
          // overrideの編集 → overrideを更新
          const overrideData = {
            ...data,
            recurringScheduleId: this.editingOriginalData.recurringScheduleId || this.editingOriginalData.originalScheduleId,
            targetWeek: WP.Schedule.getCurrentTargetWeek()
          };
          await WP.Firestore.addScheduleOverride(overrideData);
        } else {
          // 固定スケジュールの編集
          await WP.Firestore.updateRecurringSchedule(this.editingScheduleId, data);
        }
        WP.UI.showToast('予定を更新しました', 'success');
      } else {
        // 新規追加
        await WP.Firestore.addRecurringSchedule(data);
        WP.UI.showToast('予定を追加しました', 'success');
      }

      this.closeScheduleModal();
      await WP.Schedule.loadAndRender();
    } catch (error) {
      console.error('Form submission error:', error);
      WP.UI.showToast('保存に失敗しました', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '保存';
    }
  },

  // ==============================
  // Form Validation Display
  // ==============================
  showFormErrors(errors) {
    this.clearFormErrors();

    const fieldMap = {
      title: 'error-title',
      category: 'error-category',
      day: 'error-day',
      startTime: 'error-start-time',
      endTime: 'error-end-time'
    };

    for (const [field, message] of Object.entries(errors)) {
      const errorEl = document.getElementById(fieldMap[field]);
      if (errorEl) {
        errorEl.textContent = message;
      }

      const inputEl = document.getElementById(`input-${field === 'day' ? 'day' : field === 'startTime' ? 'start-time' : field === 'endTime' ? 'end-time' : field}`);
      if (inputEl) {
        inputEl.classList.add('error');
      }
    }
  },

  clearFormErrors() {
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  },

  // ==============================
  // Delete Flow
  // ==============================
  handleDeleteClick() {
    this.closeScheduleModal();
    
    const title = this.editingOriginalData ? this.editingOriginalData.title : '選択した予定';
    document.getElementById('delete-message').textContent = `「${title}」を削除しますか？`;
    
    document.getElementById('delete-modal').classList.remove('hidden');
  },

  async handleDeleteConfirm() {
    if (!this.editingScheduleId) return;

    const confirmBtn = document.getElementById('delete-confirm-btn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '削除中...';

    try {
      if (this.editingIsOverride) {
        // overrideを削除（固定に戻す）
        await WP.Firestore.deleteScheduleOverride(this.editingScheduleId);
        WP.UI.showToast('例外スケジュールを削除しました（固定に戻ります）', 'success');
      } else {
        // 固定スケジュールを削除
        await WP.Firestore.deleteRecurringSchedule(this.editingScheduleId);
        WP.UI.showToast('予定を削除しました', 'success');
      }

      this.closeDeleteModal();
      this.editingScheduleId = null;
      this.editingOriginalData = null;
      
      await WP.Schedule.loadAndRender();
    } catch (error) {
      console.error('Delete error:', error);
      WP.UI.showToast('削除に失敗しました', 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = '削除する';
    }
  },

  closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
  },

  // ==============================
  // Drag Change Modal
  // ==============================
  _dragResolve: null,
  _dragData: null,

  openDragModal(schedule, newDayOfWeek, newStartTime, newEndTime) {
    this._dragData = {
      schedule,
      newDayOfWeek,
      newStartTime,
      newEndTime
    };

    // 説明テキスト
    const oldDay = WP.DAY_NAMES_FULL[schedule.dayOfWeek];
    const newDay = WP.DAY_NAMES_FULL[newDayOfWeek];
    const desc = `${oldDay} ${schedule.startTime}〜${schedule.endTime} → ${newDay} ${newStartTime}〜${newEndTime}`;
    document.getElementById('drag-change-desc').textContent = desc;

    // ラジオ初期化
    document.querySelector('input[name="change-type"][value="this-week"]').checked = true;

    document.getElementById('drag-modal').classList.remove('hidden');

    return new Promise((resolve) => {
      this._dragResolve = resolve;
    });
  },

  async handleDragSave() {
    if (!this._dragData) return;

    const changeType = document.querySelector('input[name="change-type"]:checked').value;
    const { schedule, newDayOfWeek, newStartTime, newEndTime } = this._dragData;

    const saveBtn = document.getElementById('drag-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      if (changeType === 'this-week') {
        // 今週のみ変更 → override作成
        const overrideData = {
          recurringScheduleId: schedule.isOverride ? schedule.recurringScheduleId : schedule.id,
          targetWeek: WP.Schedule.getCurrentTargetWeek(),
          title: schedule.title,
          category: schedule.category,
          dayOfWeek: newDayOfWeek,
          startTime: newStartTime,
          endTime: newEndTime,
          memo: schedule.memo || ''
        };

        await WP.Firestore.addScheduleOverride(overrideData);
        WP.UI.showToast('今週のみ変更しました', 'success');
      } else {
        // 今後も変更 → 固定スケジュール更新
        const scheduleId = schedule.isOverride ? schedule.recurringScheduleId : schedule.id;
        await WP.Firestore.updateRecurringSchedule(scheduleId, {
          title: schedule.title,
          category: schedule.category,
          dayOfWeek: newDayOfWeek,
          startTime: newStartTime,
          endTime: newEndTime,
          memo: schedule.memo || ''
        });

        // 今週のoverrideがあれば削除
        if (schedule.isOverride && schedule.overrideId) {
          await WP.Firestore.deleteScheduleOverride(schedule.overrideId);
        }

        WP.UI.showToast('固定スケジュールを更新しました', 'success');
      }

      this.closeDragModal();
      await WP.Schedule.loadAndRender();

      if (this._dragResolve) {
        this._dragResolve(true);
      }
    } catch (error) {
      console.error('Drag save error:', error);
      WP.UI.showToast('保存に失敗しました', 'error');
      if (this._dragResolve) {
        this._dragResolve(false);
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '保存';
    }
  },

  closeDragModal() {
    document.getElementById('drag-modal').classList.add('hidden');
    this._dragData = null;
    if (this._dragResolve) {
      this._dragResolve(false);
      this._dragResolve = null;
    }
  }
};
