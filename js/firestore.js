// ============================================
// Weekly Planner - Firestore Operations
// js/firestore.js
// ============================================

window.WP = window.WP || {};

WP.Firestore = {
  // ==============================
  // User Operations
  // ==============================
  async saveUser(user) {
    try {
      const userRef = WP.db.collection('users').doc(user.uid);
      const doc = await userRef.get();

      if (!doc.exists) {
        // 新規ユーザー
        await userRef.set({
          uid: user.uid,
          name: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('New user created:', user.uid);
      } else {
        // 既存ユーザー - 必要な情報を更新
        await userRef.update({
          name: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || ''
        });
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  },

  // ==============================
  // Recurring Schedule Operations
  // ==============================

  // 全固定スケジュール取得
  async getRecurringSchedules(uid) {
    try {
      const snapshot = await WP.db.collection('recurringSchedules')
        .where('uid', '==', uid)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting recurring schedules:', error);
      WP.UI.showToast('スケジュールの読み込みに失敗しました', 'error');
      return [];
    }
  },

  // 固定スケジュール追加
  async addRecurringSchedule(data) {
    try {
      const uid = WP.Auth.getUid();
      if (!uid) throw new Error('Not authenticated');

      const docRef = await WP.db.collection('recurringSchedules').add({
        uid: uid,
        title: data.title.trim(),
        category: data.category,
        dayOfWeek: Number(data.dayOfWeek),
        startTime: data.startTime,
        endTime: data.endTime,
        memo: data.memo ? data.memo.trim() : '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Analytics
      WP.analytics.logEvent('schedule_created', {
        category: data.category,
        day: data.dayOfWeek
      });

      console.log('Schedule added:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding schedule:', error);
      WP.UI.showToast('予定の追加に失敗しました', 'error');
      return null;
    }
  },

  // 固定スケジュール更新
  async updateRecurringSchedule(scheduleId, data) {
    try {
      await WP.db.collection('recurringSchedules').doc(scheduleId).update({
        title: data.title.trim(),
        category: data.category,
        dayOfWeek: Number(data.dayOfWeek),
        startTime: data.startTime,
        endTime: data.endTime,
        memo: data.memo ? data.memo.trim() : '',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Analytics
      WP.analytics.logEvent('schedule_updated', {
        category: data.category
      });

      console.log('Schedule updated:', scheduleId);
      return true;
    } catch (error) {
      console.error('Error updating schedule:', error);
      WP.UI.showToast('予定の更新に失敗しました', 'error');
      return false;
    }
  },

  // 固定スケジュール削除
  async deleteRecurringSchedule(scheduleId) {
    try {
      await WP.db.collection('recurringSchedules').doc(scheduleId).delete();

      // 関連するoverridesも削除
      const overrides = await WP.db.collection('scheduleOverrides')
        .where('recurringScheduleId', '==', scheduleId)
        .get();

      const batch = WP.db.batch();
      overrides.docs.forEach(doc => batch.delete(doc.ref));
      if (overrides.docs.length > 0) {
        await batch.commit();
      }

      // Analytics
      WP.analytics.logEvent('schedule_deleted');

      console.log('Schedule deleted:', scheduleId);
      return true;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      WP.UI.showToast('予定の削除に失敗しました', 'error');
      return false;
    }
  },

  // ==============================
  // Schedule Override Operations
  // ==============================

  // 指定週のoverrides取得
  async getScheduleOverrides(uid, targetWeekStr) {
    try {
      const snapshot = await WP.db.collection('scheduleOverrides')
        .where('uid', '==', uid)
        .where('targetWeek', '==', targetWeekStr)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting schedule overrides:', error);
      return [];
    }
  },

  // Override追加(今週のみ変更)
  async addScheduleOverride(data) {
    try {
      const uid = WP.Auth.getUid();
      if (!uid) throw new Error('Not authenticated');

      // 同じ週の同じrecurringScheduleIdのoverrideがあれば上書き
      const existing = await WP.db.collection('scheduleOverrides')
        .where('uid', '==', uid)
        .where('recurringScheduleId', '==', data.recurringScheduleId)
        .where('targetWeek', '==', data.targetWeek)
        .get();

      if (!existing.empty) {
        // 既存のoverrideを更新
        const docId = existing.docs[0].id;
        await WP.db.collection('scheduleOverrides').doc(docId).update({
          title: data.title,
          category: data.category,
          dayOfWeek: Number(data.dayOfWeek),
          startTime: data.startTime,
          endTime: data.endTime,
          memo: data.memo || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Override updated:', docId);
        return docId;
      } else {
        // 新規override
        const docRef = await WP.db.collection('scheduleOverrides').add({
          uid: uid,
          recurringScheduleId: data.recurringScheduleId,
          targetWeek: data.targetWeek,
          title: data.title,
          category: data.category,
          dayOfWeek: Number(data.dayOfWeek),
          startTime: data.startTime,
          endTime: data.endTime,
          memo: data.memo || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Override added:', docRef.id);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error adding override:', error);
      WP.UI.showToast('例外スケジュールの保存に失敗しました', 'error');
      return null;
    }
  },

  // Override削除
  async deleteScheduleOverride(overrideId) {
    try {
      await WP.db.collection('scheduleOverrides').doc(overrideId).delete();
      console.log('Override deleted:', overrideId);
      return true;
    } catch (error) {
      console.error('Error deleting override:', error);
      return false;
    }
  }
};
