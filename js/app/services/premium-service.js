(function (global) {
  class PremiumService {
    constructor({ db, firebase }) {
      this.db = db;
      this.firebase = firebase;
    }

    async getOrCreatePremiumStatus(uid) {
      try {
        const userDoc = await this.db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data() || {};
          return Boolean(userData.isPremium);
        }

        await this.db.collection('users').doc(uid).set({
          isPremium: false,
          createdAt: this.firebase.firestore.FieldValue.serverTimestamp()
        });
        return false;
      } catch (error) {
        console.error('プレミアムステータスのチェックエラー:', error);
        return false;
      }
    }
  }

  global.AppServices = global.AppServices || {};
  global.AppServices.PremiumService = PremiumService;
})(window);
