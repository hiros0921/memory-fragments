(function (global) {
  class PremiumService {
    constructor({ db, firebase }) {
      this.db = db;
      this.firebase = firebase;
    }

    async getPremiumStatus(uid) {
      try {
        const userDoc = await this.db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data() || {};
          return userData.isPremium === true;
        }

        // Keep a profile for the existing server webhook's update(), but never
        // initialize billing from a client. Merge preserves concurrent grants.
        await this.db.collection('users').doc(uid).set({
          createdAt: this.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
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
