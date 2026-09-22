// firebase/storage モジュールの関数を明示的にインポート
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase-config"; // firebase appの構成

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
                if (!user || !user.uid) throw new Error('User not authenticated');

                let memoryToSave = { ...memory };

                if (memory.imageUrl && memory.imageStorage === 'firebase') {
                    memoryToSave.imageUrl = memory.imageUrl;
                    delete memoryToSave.image;
                    delete memoryToSave.imageFile;
                } else if (memory.imageFile) {
                    try {
                        // Firebase認証トークンをリフレッシュ
                        const currentUser = firebase.auth().currentUser;
                        if (currentUser) {
                            await currentUser.getIdToken(true);
                        }
                        
                        console.log('Starting image upload...', {
                            fileName: memory.imageFile.name,
                            fileSize: memory.imageFile.size,
                            fileType: memory.imageFile.type,
                            userId: user.uid
                        });
                        
                        // ファイル名を安全に生成
                        const safeFileName = memory.imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${safeFileName}`;
                        const imageRef = ref(storage, `images/${user.uid}/${fileName}`);
                        // メタデータを追加
                        const metadata = {
                            contentType: memory.imageFile.type || 'image/jpeg',
                            customMetadata: {
                                uploadedBy: user.uid,
                                uploadedAt: new Date().toISOString()
                            }
                        };
                        
                        console.log('Uploading to Firebase Storage...');
                        const snapshot = await uploadBytes(imageRef, memory.imageFile, metadata);
                        console.log('Upload successful, getting download URL...');
                        const imageUrl = await getDownloadURL(imageRef);
                        console.log('Image uploaded successfully:', imageUrl);
                        memoryToSave.imageUrl = imageUrl;
                        delete memoryToSave.image;
                        delete memoryToSave.imageFile;
                    } catch (imageError) {
                        console.error('Image upload failed in storage-manager:', imageError);
                        console.error('Error details:', {
                            code: imageError.code,
                            message: imageError.message,
                            serverResponse: imageError.serverResponse
                        });
                        
                        // 画像アップロードが失敗しても記憶は保存する
                        if (memory.image) {
                            memoryToSave.image = memory.image;
                        }
                        delete memoryToSave.image;
                        delete memoryToSave.imageFile;
                    }
                }

                const docRef = await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .add(memoryToSave);

                memory.id = docRef.id;
                this.memories.unshift(memory);

                await db.collection('users').doc(user.uid).update({
                    memoryCount: firebase.firestore.FieldValue.increment(1)
                });

                localStorage.setItem('memories', JSON.stringify(this.memories));

                return {
                    success: true,
                    memory: memory,
                    currentCount: this.memories.length
                };
            } catch (error) {
                console.error('Cloud save error:', error);
                if (error.code === 'permission-denied') {
                    return {
                        success: false,
                        error: 'PERMISSION_DENIED',
                        message: 'Firestoreへの保存権限がありません'
                    };
                }
            }
        }

        memory.id = Date.now().toString();
        let memoryForLocal = { ...memory };
        if (memoryForLocal.image && memoryForLocal.image.startsWith('data:')) delete memoryForLocal.image;
        if (memoryForLocal.imageFile) delete memoryForLocal.imageFile;
        this.memories.unshift(memoryForLocal);
        try {
            localStorage.setItem('memories', JSON.stringify(this.memories));
            return {
                success: true,
                memory: memoryForLocal,
                currentCount: this.memories.length
            };
        } catch (error) {
            console.error('LocalStorage save error:', error);
            return {
                success: false,
                error: 'STORAGE_ERROR',
                message: 'ストレージへの保存に失敗しました'
            };
        }
    }

    async deleteMemory(id) {
        if (this.isCloudEnabled && this.authManager && this.authManager.isAuthenticated()) {
            try {
                const user = this.authManager.getCurrentUser();
                await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .doc(id)
                    .delete();
                await db.collection('users').doc(user.uid).update({
                    memoryCount: firebase.firestore.FieldValue.increment(-1)
                });
            } catch (error) {
                console.error('Cloud delete error:', error);
            }
        }

        const index = this.memories.findIndex(m => m.id === id);
        if (index !== -1) {
            this.memories.splice(index, 1);
            localStorage.setItem('memories', JSON.stringify(this.memories));
            return true;
        }
        return false;
    }

    getUsageStats() {
        return {
            currentCount: this.memories.length,
            limit: this.currentPlan === 'free' ? this.FREE_LIMIT : '無制限',
            percentage: this.currentPlan === 'free' 
                ? Math.round((this.memories.length / this.FREE_LIMIT) * 100)
                : 0,
            plan: this.currentPlan,
            canAddMore: this.currentPlan === 'premium' || this.memories.length < this.FREE_LIMIT
        };
    }

    async migrateToCloud() {
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            return { success: false, error: 'ログインが必要です' };
        }

        const user = this.authManager.getCurrentUser();
        const localMemories = this.loadMemoriesFromLocal();

        if (localMemories.length === 0) {
            return { success: true, message: '移行するデータがありません' };
        }

        try {
            const batch = db.batch();
            localMemories.forEach(memory => {
                const docRef = db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .doc();
                batch.set(docRef, memory);
            });

            await batch.commit();
            await this.loadMemoriesFromCloud();

            return {
                success: true,
                message: `${localMemories.length}件のメモリーをクラウドに移行しました`
            };
        } catch (error) {
            return { success: false, error: '移行に失敗しました' };
        }
    }

    notifyPlanChange(plan) {
        window.dispatchEvent(new CustomEvent('planChanged', {
            detail: { plan, usage: this.getUsageStats() }
        }));
    }

    checkStorageWarning() {
        if (this.currentPlan === 'free') {
            const remaining = this.FREE_LIMIT - this.memories.length;
            if (remaining <= 5 && remaining > 0) {
                return {
                    show: true,
                    message: `あと${remaining}件で無料プランの上限に達します。`,
                    type: 'warning'
                };
            } else if (remaining === 0) {
                return {
                    show: true,
                    message: '無料プランの上限に達しました',
                    type: 'error'
                };
            }
        }
        return { show: false };
    }
}

window.StorageManager = StorageManager;
