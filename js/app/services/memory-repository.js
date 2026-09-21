(function (global) {
  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function readLocalMemories(uid) {
    if (!uid) return [];
    const raw = localStorage.getItem(`memories:${uid}`) ?? localStorage.getItem('memories');
    const records = safeJsonParse(raw || '[]', []);
    return Array.isArray(records) ? records.filter(memory => memory?.userId === uid) : [];
  }

  class MemoryRepository {
    constructor({ db, auth }) {
      this.db = db;
      this.auth = auth;
    }

    listLocal() {
      return readLocalMemories(this.auth?.currentUser?.uid);
    }

    cacheForUser({ uid, memories }) {
      if (!uid || uid !== this.auth?.currentUser?.uid) return;
      const owned = memories.filter(memory => memory.userId === uid);
      const ids = new Set(owned.map(memory => memory.id));
      const pending = readLocalMemories(uid).filter(memory => memory.localOnly && !ids.has(memory.id));
      localStorage.setItem(`memories:${uid}`, JSON.stringify([...pending, ...owned]));
    }

    removeLocal(id) {
      const uid = this.auth?.currentUser?.uid;
      if (!uid) return;
      localStorage.setItem(`memories:${uid}`, JSON.stringify(this.listLocal().filter(memory => memory.id !== id)));
    }

    saveLocal(memory, { prepend = true } = {}) {
      const uid = this.auth?.currentUser?.uid;
      if (!uid || memory.userId !== uid) throw new Error('保存するアカウントが一致しません');
      const memories = readLocalMemories(uid);
      const id = memory.id || Date.now().toString();
      const stored = { ...memory, id, localOnly: true };
      if (prepend) {
        memories.unshift(stored);
      } else {
        memories.push(stored);
      }
      this.cacheForUser({ uid, memories });
      return stored;
    }

    getLocalById(id) {
      const memories = this.listLocal();
      return memories.find((m) => String(m.id) === String(id)) || null;
    }

    async addForUser({ uid, memory }) {
      const docRef = await this.db.collection('users').doc(uid).collection('memories').add(memory);
      return { id: docRef.id, ...memory };
    }

    async listForUser({ uid }) {
      const snapshot = await this.db
        .collection('users')
        .doc(uid)
        .collection('memories')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id, userId: uid }));
    }

    async getForUserById({ uid, id }) {
      const doc = await this.db.collection('users').doc(uid).collection('memories').doc(id).get();
      if (!doc.exists) return null;
      return { ...doc.data(), id: doc.id, userId: uid };
    }
  }

  global.AppServices = global.AppServices || {};
  global.AppServices.MemoryRepository = MemoryRepository;
})(window);
