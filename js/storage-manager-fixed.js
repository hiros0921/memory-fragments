// firebase/storage モジュールの関数を明示的にインポート
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase-config";

// ストレージ管理とプラン制限
class StorageManager {
    constructor() {
        this.FREE_LIMIT = 50;
        this.authManager = window.authManager || null;
        this.currentPlan = this.getCurrentPlan();
        this.memories = [];
        this.isCloudEnabled = false;
        this.initializeStorage();
    }

    async initializeStorage() {
        if (this.authManager && this.authManager.isAuthenticated()) {
            const user = this.authManager.getCurrentUser();
            this.currentPlan = user.plan || 'free';
            this.isCloudEnabled = true;
            await this.loadMemoriesFromCloud();
        } else {
            this.memories = this.loadMemoriesFromLocal();
        }
    }

    getCurrentPlan() {
        if (this.authManager && this.authManager.isAuthenticated()) {
            const user = this.authManager.getCurrentUser();
            return user.plan || 'free';
        }
        return 'free';
    }

    setUserPlan(plan) {
        localStorage.setItem('userPlan', plan);
        this.currentPlan = plan;
        this.notifyPlanChange(plan);
    }

    loadMemoriesFromLocal() {
        const data = localStorage.getItem('memories');
        return data ? JSON.parse(data) : [];
    }

    async loadMemoriesFromCloud() {
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            return this.loadMemoriesFromLocal();
        }

        try {
            const user = this.authManager.getCurrentUser();
            const snapshot = await db.collection('users')
                .doc(user.uid)
                .collection('memories')
                .orderBy('createdAt', 'desc')
                .get();

            this.memories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            localStorage.setItem('memories', JSON.stringify(this.memories));
            return this.memories;
        } catch (error) {
            console.error('Error loading from cloud:', error);
            return this.loadMemoriesFromLocal();
        }
    }

    async saveMemory(memory) {
        if (this.currentPlan === 'free' && this.memories.length >= this.FREE_LIMIT) {
            return {
                success: false,
                error: 'FREE_LIMIT_EXCEEDED',
                message: `無料プランでは${this.FREE_LIMIT}件までしか保存できません。`,
                currentCount: this.memories.length,
                limit: this.FREE_LIMIT
            };
        }

        memory.createdAt = new Date().toISOString();

        if (this.isCloudEnabled && this.authManager && this.authManager.isAuthenticated()) {
            try {
                const user = this.authManager.getCurrentUser();
                if (!user || !user.uid) {
                    throw new Error('User not authenticated');
                }

                let memoryToSave = { ...memory };
                let imageUploadError = null;

                // 画像アップロード処理を改善
                if (memory.imageFile && memory.imageFile instanceof File) {
                    try {
                        console.log('Starting image upload...', {
                            fileName: memory.imageFile.name,
                            fileSize: memory.imageFile.size,
                            fileType: memory.imageFile.type
                        });

                        // ファイル名を安全に生成
                        const timestamp = Date.now();
                        const randomId = Math.random().toString(36).substring(2, 9);
                        const originalName = memory.imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                        const fileName = `${timestamp}_${randomId}_${originalName}`;
                        
                        // Firebase Storageの参照を作成
                        const storagePath = `images/${user.uid}/${fileName}`;
                        const imageRef = ref(storage, storagePath);
                        
                        console.log('Uploading to path:', storagePath);
                        
                        // メタデータを追加
                        const metadata = {
                            contentType: memory.imageFile.type || 'image/jpeg',
                            customMetadata: {
                                uploadedBy: user.uid,
                                uploadedAt: new Date().toISOString()
                            }
                        };
                        
                        // アップロード実行
                        const snapshot = await uploadBytes(imageRef, memory.imageFile, metadata);
                        console.log('Upload successful:', snapshot);
                        
                        // ダウンロードURLを取得
                        const imageUrl = await getDownloadURL(imageRef);
                        console.log('Download URL obtained:', imageUrl);
                        
                        memoryToSave.imageUrl = imageUrl;
                        memoryToSave.imageStorage = 'firebase';
                        delete memoryToSave.image;
                        delete memoryToSave.imageFile;
                    } catch (imageError) {
                        console.error('Image upload failed:', imageError);
                        imageUploadError = imageError;
                        
                        // 画像アップロードが失敗した場合、base64で保存を試みる
                        if (memory.image) {
                            memoryToSave.image = memory.image;
                        }
                        delete memoryToSave.imageFile;
                    }
                }

                // Firestoreに保存
                const docRef = await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .add(memoryToSave);

                memory.id = docRef.id;
                if (memoryToSave.imageUrl) {
                    memory.imageUrl = memoryToSave.imageUrl;
                    memory.imageStorage = 'firebase';
                }
                
                this.memories.unshift(memory);

                // メモリカウントを更新
                await db.collection('users').doc(user.uid).update({
                    memoryCount: firebase.firestore.FieldValue.increment(1)
                });

                // ローカルストレージも更新
                localStorage.setItem('memories', JSON.stringify(this.memories));

                // 画像アップロードエラーがあった場合は警告を含める
                const result = {
                    success: true,
                    memory: memory,
                    currentCount: this.memories.length
                };

                if (imageUploadError) {
                    result.warning = '画像のアップロードは失敗しましたが、記憶は保存されました。';
                }

                return result;
            } catch (error) {
                console.error('Cloud save error:', error);
                
                // エラーの詳細をログ
                if (error.code) {
                    console.error('Error code:', error.code);
                }
                if (error.message) {
                    console.error('Error message:', error.message);
                }
                
                // 権限エラーの場合
                if (error.code === 'permission-denied') {
                    return {
                        success: false,
                        error: 'PERMISSION_DENIED',
                        message: 'Firestoreへの保存権限がありません。ログインし直してください。'
                    };
                }
                
                // その他のエラー
                return {
                    success: false,
                    error: 'SAVE_ERROR',
                    message: `保存中にエラーが発生しました: ${error.message}`
                };
            }
        }

        // ローカル保存（ログインしていない場合）
        memory.id = Date.now().toString();
        let memoryForLocal = { ...memory };
        if (memoryForLocal.image && memoryForLocal.image.startsWith('data:')) {
            // base64画像はローカルに保存しない（容量制限のため）
            delete memoryForLocal.image;
        }
        if (memoryForLocal.imageFile) {
            delete memoryForLocal.imageFile;
        }
        
        this.memories.unshift(memoryForLocal);
        
        try {
            localStorage.setItem('memories', JSON.stringify(this.memories));
            return {
                success: true,
                memory: memory,
                currentCount: this.memories.length,
                isLocal: true
            };
        } catch (localError) {
            if (localError.name === 'QuotaExceededError') {
                return {
                    success: false,
                    error: 'STORAGE_FULL',
                    message: 'ローカルストレージがいっぱいです。古い記憶を削除してください。'
                };
            }
            throw localError;
        }
    }

    notifyPlanChange(plan) {
        window.dispatchEvent(new CustomEvent('planChanged', { detail: { plan } }));
    }

    getMemoryCount() {
        return this.memories.length;
    }

    getRemainingCount() {
        if (this.currentPlan === 'free') {
            return Math.max(0, this.FREE_LIMIT - this.memories.length);
        }
        return Infinity;
    }

    isLimitReached() {
        return this.currentPlan === 'free' && this.memories.length >= this.FREE_LIMIT;
    }
}

window.storageManager = new StorageManager();