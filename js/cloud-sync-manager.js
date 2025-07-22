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
            
            // ユーザーがnullでないことを確認
            if (!user || !user.uid) {
                throw new Error('User not authenticated');
            }
            
            // ローカルの未同期データを取得
            const unsyncedMemories = await this.getUnsyncedMemories();
            
            if (unsyncedMemories.length > 0) {
                console.log(`Syncing ${unsyncedMemories.length} memories`);
                
                // バッチ処理で効率的に同期
                const batch = db.batch();
                const storage = firebase.storage();
                
                for (const memory of unsyncedMemories) {
                    let memoryToSync = { ...memory };
                    
                    // 画像がある場合はFirebase Storageにアップロード
                    if (memory.image && memory.image.startsWith('data:')) {
                        try {
                            console.log('Uploading image to Firebase Storage...');
                            
                            // base64をBlobに変換
                            const base64Data = memory.image.split(',')[1];
                            const byteCharacters = atob(base64Data);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: 'image/jpeg' });
                            
                            // Storage参照を作成
                            const imageRef = storage.ref()
                                .child(`images/${user.uid}/${memory.id}_${Date.now()}.jpg`);
                            
                            // アップロード
                            const snapshot = await imageRef.put(blob);
                            const imageUrl = await snapshot.ref.getDownloadURL();
                            
                            // メモリーオブジェクトを更新（画像データをURLに置き換え）
                            memoryToSync.imageUrl = imageUrl;
                            delete memoryToSync.image; // base64データは削除
                            
                            console.log('Image uploaded successfully:', imageUrl);
                        } catch (imageError) {
                            console.error('Image upload failed:', imageError);
                            // 画像アップロードが失敗してもメモリー自体は保存を続行
                            delete memoryToSync.image;
                        }
                    }
                    
                    const docRef = db.collection('users')
                        .doc(user.uid)
                        .collection('memories')
                        .doc(memory.id.toString());
                    
                    // Firestoreに保存（画像URLのみ）
                    batch.set(docRef, {
                        ...memoryToSync,
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
            
            // 権限エラーの場合は特別な処理
            if (error.code === 'permission-denied') {
                console.error('Firestore permission denied. Please check Firestore rules.');
                this.notifySyncStatus('permission-error');
            } else {
                this.notifySyncStatus('error');
            }
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
        
        if (!user || !user.uid) {
            console.error('User not authenticated');
            return;
        }
        
        let dataToSync = { ...item.data };
        
        // 画像がある場合はFirebase Storageにアップロード
        if (item.action !== 'delete' && dataToSync.image && dataToSync.image.startsWith('data:')) {
            try {
                const storage = firebase.storage();
                
                // base64をBlobに変換
                const base64Data = dataToSync.image.split(',')[1];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'image/jpeg' });
                
                // Storage参照を作成
                const imageRef = storage.ref()
                    .child(`images/${user.uid}/${dataToSync.id}_${Date.now()}.jpg`);
                
                // アップロード
                const snapshot = await imageRef.put(blob);
                const imageUrl = await snapshot.ref.getDownloadURL();
                
                // データを更新
                dataToSync.imageUrl = imageUrl;
                delete dataToSync.image; // base64データは削除
            } catch (imageError) {
                console.error('Image upload failed:', imageError);
                delete dataToSync.image;
            }
        }
        
        switch (item.action) {
            case 'create':
                await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .doc(dataToSync.id.toString())
                    .set(dataToSync);
                break;
                
            case 'update':
                await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .doc(dataToSync.id.toString())
                    .update(dataToSync);
                break;
                
            case 'delete':
                await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .doc(item.id.toString())
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