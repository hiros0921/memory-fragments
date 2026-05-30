(function (global) {
  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function readLocalMemories() {
    const raw = localStorage.getItem('memories');
    return Array.isArray(raw) ? raw : safeJsonParse(raw || '[]', []);
  }

  function writeLocalMemories(memories) {
    localStorage.setItem('memories', JSON.stringify(memories));
  }

  class MemoryRepository {
    constructor({ db }) {
      this.db = db;
    }

    listLocal() {
      return readLocalMemories();
    }

    saveLocal(memory, { prepend = true } = {}) {
      const memories = readLocalMemories();
      const id = memory.id || Date.now().toString();
      const stored = { ...memory, id };
      if (prepend) {
        memories.unshift(stored);
      } else {
        memories.push(stored);
      }
      writeLocalMemories(memories);
      return stored;
    }

    getLocalById(id) {
      const memories = readLocalMemories();
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

      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    async getForUserById({ uid, id }) {
      const doc = await this.db.collection('users').doc(uid).collection('memories').doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    }
  }

  global.AppServices = global.AppServices || {};
  global.AppServices.MemoryRepository = MemoryRepository;
})(window);

