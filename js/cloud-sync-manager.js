// クラウド同期管理クラス
class CloudSyncManager {
    constructor() {
        this.syncQueue = [];
        this.isSyncing = false;
        this.syncInterval = null;
        this.offlineQueue = [];
        this.lastSyncTime = null;
        this.initializeSync();
    }

    // 同期の初期化
    initializeSync() {
        // オンライン/オフライン状態の監視
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        // Service Workerの登録（オフライン対応）
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }

        // IndexedDBの初期化（オフラインストレージ）
        this.initializeIndexedDB();
    }

    // Service Workerの登録
    async registerServiceWorker() {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    // IndexedDBの初期化
    initializeIndexedDB() {
        const request = indexedDB.open('MemoryFragmentsDB', 1);

        request.onerror = () => {
            console.error('IndexedDB initialization failed');
        };

        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('IndexedDB initialized');
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // メモリーストア
            if (!db.objectStoreNames.contains('memories')) {
                const memoryStore = db.createObjectStore('memories', { keyPath: 'id' });
                memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
                memoryStore.createIndex('synced', 'synced', { unique: false });
            }

            // 同期キュー
            if (!db.objectStoreNames.contains('syncQueue')) {
                db.createObjectStore('syncQueue', { keyPath: 'id' });
            }
        };
    }

    // プレミアムユーザーの自動同期開始
    startAutoSync(interval = 30000) { // 30秒ごと
        if (!this.authManager?.isPremiumUser()) {
            console.log('Auto sync is available for premium users only');
            return;
        }

        this.stopAutoSync();
        this.syncInterval = setInterval(() => {
            this.syncToCloud();
        }, interval);

        // 初回同期
        this.syncToCloud();
    }

    // 自動同期停止
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // クラウドへの同期
    async syncToCloud() {
        if (!navigator.onLine) {
            console.log('Offline: Sync queued');
            return;
        }

        if (!this.authManager?.isAuthenticated()) {
            console.log('Not authenticated');
            return;
        }

        if (this.isSyncing) {
            console.log('Sync already in progress');
            return;
        }

        this.isSyncing = true;
        this.notifySyncStatus('syncing');

        try {
            const user = this.authManager.getCurrentUser();
            
            // ローカルの未同期データを取得
            const unsyncedMemories = await this.getUnsyncedMemories();
            
            if (unsyncedMemories.length > 0) {
                console.log(`Syncing ${unsyncedMemories.length} memories`);
                
                // バッチ処理で効率的に同期
                const batch = db.batch();
                
                for (const memory of unsyncedMemories) {
                    const docRef = db.collection('users')
                        .doc(user.uid)
                        .collection('memories')
                        .doc(memory.id);
                    
                    batch.set(docRef, {
                        ...memory,
                        synced: true,
                        lastSyncedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                await batch.commit();
                
                // ローカルの同期フラグを更新
                await this.markAsSynced(unsyncedMemories);
            }

            // クラウドから最新データを取得
            await this.pullFromCloud();

            this.lastSyncTime = new Date();
            this.notifySyncStatus('completed');
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.notifySyncStatus('error');
        } finally {
            this.isSyncing = false;
        }
    }

    // クラウドからデータを取得
    async pullFromCloud() {
        if (!this.authManager?.isPremiumUser()) {
            return;
        }

        try {
            const user = this.authManager.getCurrentUser();
            const lastSync = this.lastSyncTime || new Date(0);

            // 最終同期以降の更新データを取得
            const snapshot = await db.collection('users')
                .doc(user.uid)
                .collection('memories')
                .where('lastSyncedAt', '>', lastSync)
                .get();

            const cloudMemories = [];
            snapshot.forEach(doc => {
                cloudMemories.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            if (cloudMemories.length > 0) {
                await this.mergeCloudData(cloudMemories);
            }
        } catch (error) {
            console.error('Pull from cloud failed:', error);
        }
    }

    // クラウドデータのマージ
    async mergeCloudData(cloudMemories) {
        const transaction = this.db.transaction(['memories'], 'readwrite');
        const store = transaction.objectStore('memories');

        for (const cloudMemory of cloudMemories) {
            const localRequest = store.get(cloudMemory.id);
            
            localRequest.onsuccess = (event) => {
                const localMemory = event.target.result;
                
                // 競合解決: タイムスタンプが新しい方を採用
                if (!localMemory || 
                    new Date(cloudMemory.timestamp) > new Date(localMemory.timestamp)) {
                    store.put({
                        ...cloudMemory,
                        synced: true
                    });
                }
            };
        }
    }

    // 未同期メモリーの取得
    async getUnsyncedMemories() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['memories'], 'readonly');
            const store = transaction.objectStore('memories');
            const index = store.index('synced');
            const request = index.getAll(false);

            request.onsuccess = (event) => {
                resolve(event.target.result || []);
            };

            request.onerror = () => {
                reject(new Error('Failed to get unsynced memories'));
            };
        });
    }

    // 同期済みとしてマーク
    async markAsSynced(memories) {
        const transaction = this.db.transaction(['memories'], 'readwrite');
        const store = transaction.objectStore('memories');

        memories.forEach(memory => {
            store.put({
                ...memory,
                synced: true
            });
        });
    }

    // オフライン時の処理
    handleOffline() {
        console.log('App is offline');
        this.stopAutoSync();
        this.notifyConnectionStatus('offline');
    }

    // オンライン復帰時の処理
    handleOnline() {
        console.log('App is online');
        this.notifyConnectionStatus('online');
        
        // プレミアムユーザーの場合、自動同期を再開
        if (this.authManager?.isPremiumUser()) {
            this.startAutoSync();
            // オフライン中のデータを同期
            this.processOfflineQueue();
        }
    }

    // オフラインキューの処理
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) return;

        console.log(`Processing ${this.offlineQueue.length} offline items`);
        
        for (const item of this.offlineQueue) {
            try {
                await this.syncItem(item);
            } catch (error) {
                console.error('Failed to sync offline item:', error);
            }
        }

        this.offlineQueue = [];
    }

    // 個別アイテムの同期
    async syncItem(item) {
        if (!this.authManager?.isAuthenticated()) return;

        const user = this.authManager.getCurrentUser();
        
        switch (item.action) {
            case 'create':
                await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .doc(item.data.id)
                    .set(item.data);
                break;
                
            case 'update':
                await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .doc(item.data.id)
                    .update(item.data);
                break;
                
            case 'delete':
                await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .doc(item.id)
                    .delete();
                break;
        }
    }

    // オフライン用データ保存
    async saveOffline(action, data) {
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        
        store.add({
            id: Date.now().toString(),
            action: action,
            data: data,
            timestamp: new Date().toISOString()
        });

        this.offlineQueue.push({ action, data });
    }

    // 同期状態の通知
    notifySyncStatus(status) {
        window.dispatchEvent(new CustomEvent('syncStatusChanged', {
            detail: { status, lastSync: this.lastSyncTime }
        }));
    }

    // 接続状態の通知
    notifyConnectionStatus(status) {
        window.dispatchEvent(new CustomEvent('connectionStatusChanged', {
            detail: { status }
        }));
    }

    // 同期状態UI
    createSyncStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'sync-status-indicator';
        indicator.innerHTML = `
            <span class="sync-icon">☁️</span>
            <span class="sync-text">同期中...</span>
        `;

        window.addEventListener('syncStatusChanged', (event) => {
            const { status } = event.detail;
            const icon = indicator.querySelector('.sync-icon');
            const text = indicator.querySelector('.sync-text');

            switch (status) {
                case 'syncing':
                    icon.textContent = '🔄';
                    text.textContent = '同期中...';
                    indicator.classList.add('syncing');
                    break;
                case 'completed':
                    icon.textContent = '✅';
                    text.textContent = '同期完了';
                    indicator.classList.remove('syncing');
                    setTimeout(() => {
                        indicator.style.opacity = '0';
                    }, 3000);
                    break;
                case 'error':
                    icon.textContent = '❌';
                    text.textContent = '同期エラー';
                    indicator.classList.remove('syncing');
                    break;
            }
        });

        return indicator;
    }
}

// グローバルに公開
window.CloudSyncManager = CloudSyncManager;