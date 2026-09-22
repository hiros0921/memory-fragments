(function (global) {
  const DEMO_USER_ID = 'demo-session';
  const DEFAULT_MEMORIES = [
    {
      id: 'demo-sunset',
      userId: DEMO_USER_ID,
      title: '海辺で見た夕焼け',
      content: '週末に海辺を歩き、空の色がゆっくり変わる時間を楽しみました。',
      category: '旅行',
      tags: ['海', '夕焼け', '週末'],
      createdAt: '2026-09-20T09:30:00.000Z',
      demoImageUrl: '/assets/demo/demo-sunset.png',
      demoImageAlt: 'デモ用合成画像：夕方の海辺'
    },
    {
      id: 'demo-cafe',
      userId: DEMO_USER_ID,
      title: '静かなカフェで読書',
      content: '気になっていた本を開き、落ち着いた時間を過ごしました。',
      category: '趣味',
      tags: ['読書', 'カフェ', '休日'],
      createdAt: '2026-09-19T05:00:00.000Z',
      demoImageUrl: '/assets/demo/demo-cafe.png',
      demoImageAlt: 'デモ用合成画像：本と飲み物がある静かなカフェ'
    },
    {
      id: 'demo-goal',
      userId: DEMO_USER_ID,
      title: '小さな目標を達成した日',
      content: '今日やると決めたことを一つ終え、次の目標をノートに書きました。',
      category: '日常',
      tags: ['目標', '振り返り', '成長'],
      createdAt: '2026-09-18T11:15:00.000Z',
      demoImageUrl: '/assets/demo/demo-goal.png',
      demoImageAlt: 'デモ用合成画像：付箋とノートがある机'
    }
  ];

  const clone = value => JSON.parse(JSON.stringify(value));

  class DemoMemoryStore {
    constructor(seed = DEFAULT_MEMORIES) {
      this.seed = clone(seed);
      this.reset();
    }

    list() {
      return clone(this.memories);
    }

    getById(id) {
      return clone(this.memories.find(memory => memory.id === id) || null);
    }

    add(memory) {
      const stored = {
        ...clone(memory),
        id: memory.id || crypto.randomUUID()
      };
      this.memories.unshift(stored);
      return clone(stored);
    }

    remove(id) {
      const before = this.memories.length;
      this.memories = this.memories.filter(memory => memory.id !== id);
      return before !== this.memories.length;
    }

    reset() {
      this.memories = clone(this.seed);
      return this.list();
    }
  }

  global.AppDemo = {
    DEMO_USER_ID,
    DEFAULT_MEMORIES: clone(DEFAULT_MEMORIES),
    DemoMemoryStore
  };
})(window);
