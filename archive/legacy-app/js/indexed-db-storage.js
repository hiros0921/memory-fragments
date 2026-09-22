// IndexedDBを使用した大容量画像ストレージ
class IndexedDBStorage {
    constructor() {
        this.dbName = 'MemoryFragmentsDB';
        this.dbVersion = 1;
        this.storeName = 'images';
        this.db = null;
        this.initDB();
    }

    // IndexedDBの初期化
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB初期化エラー:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB初期化成功');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 画像ストアの作成
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    objectStore.createIndex('memoryId', 'memoryId', { unique: false });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // 画像を保存（大容量対応）
    async saveImage(file, memoryId) {
        try {
            // ファイルサイズチェック（最大50MBまで許可）
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                throw new Error(`ファイルサイズが大きすぎます。最大${maxSize / 1024 / 1024}MBまでです。`);
            }

            // 画像をBlobとして読み込み
            const imageBlob = await this.fileToBlob(file);
            
            // IndexedDBに保存
            const imageData = {
                id: `image_${memoryId}_${Date.now()}`,
                memoryId: memoryId,
                blob: imageBlob,
                type: file.type,
                name: file.name,
                size: file.size,
                timestamp: new Date().toISOString()
            };

            await this.saveToIndexedDB(imageData);

            // プレビュー用のData URLも生成
            const dataUrl = await this.blobToDataUrl(imageBlob);

            return {
                success: true,
                imageUrl: dataUrl,
                size: file.size,
                stored: 'indexedDB'
            };
        } catch (error) {
            console.error('Image save error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ファイルをBlobに変換
    async fileToBlob(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Blob([reader.result], { type: file.type }));
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // BlobをData URLに変換
    async blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // IndexedDBに保存
    async saveToIndexedDB(data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 画像を取得
    async getImage(memoryId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('memoryId');
            const request = index.getAll(memoryId);

            request.onsuccess = async () => {
                const results = request.result;
                if (results.length > 0) {
                    // 最新の画像を取得
                    const latestImage = results[results.length - 1];
                    const dataUrl = await this.blobToDataUrl(latestImage.blob);
                    resolve(dataUrl);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    // 画像を削除
    async deleteImage(memoryId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('memoryId');
            const request = index.getAllKeys(memoryId);

            request.onsuccess = () => {
                const keys = request.result;
                keys.forEach(key => {
                    objectStore.delete(key);
                });
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // ストレージ使用量を取得
    async getStorageInfo() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage,
                quota: estimate.quota,
                percentage: (estimate.usage / estimate.quota) * 100,
                usageInMB: (estimate.usage / (1024 * 1024)).toFixed(2),
                quotaInMB: (estimate.quota / (1024 * 1024)).toFixed(2)
            };
        }
        return null;
    }

    // すべての画像データをクリア（デバッグ用）
    async clearAllImages() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
}

// グローバルに公開
window.IndexedDBStorage = IndexedDBStorage;