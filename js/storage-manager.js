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

    // ストレージの初期化
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

    // 現在のプランを取得
    getCurrentPlan() {
        if (this.authManager && this.authManager.isAuthenticated()) {
            const user = this.authManager.getCurrentUser();
            return user.plan || 'free';
        }
        return 'free';
    }

    // プランを設定
    setUserPlan(plan) {
        localStorage.setItem('userPlan', plan);
        this.currentPlan = plan;
        this.notifyPlanChange(plan);
    }

    // ローカルストレージから読み込み
    loadMemoriesFromLocal() {
        const data = localStorage.getItem('memories');
        return data ? JSON.parse(data) : [];
    }

    // クラウドから読み込み
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

            // ローカルにもキャッシュ
            localStorage.setItem('memories', JSON.stringify(this.memories));
            return this.memories;
        } catch (error) {
            console.error('Error loading from cloud:', error);
            return this.loadMemoriesFromLocal();
        }
    }

    // メモリーを保存
    async saveMemory(memory) {
        // 無料プランの場合、容量チェック
        if (this.currentPlan === 'free' && this.memories.length >= this.FREE_LIMIT) {
            return {
                success: false,
                error: 'FREE_LIMIT_EXCEEDED',
                message: `無料プランでは${this.FREE_LIMIT}件までしか保存できません。プレミアムプランにアップグレードしてください。`,
                currentCount: this.memories.length,
                limit: this.FREE_LIMIT
            };
        }

        memory.createdAt = new Date().toISOString();

        // クラウドが有効な場合
        if (this.isCloudEnabled && this.authManager && this.authManager.isAuthenticated()) {
            try {
                const user = this.authManager.getCurrentUser();
                
                // ユーザーがnullでないことを確認
                if (!user || !user.uid) {
                    throw new Error('User not authenticated');
                }
                
                let memoryToSave = { ...memory };
                
                // 画像がある場合の処理
                // 注意: index.htmlで既にFirebase Storageにアップロード済みの場合はimageUrlが設定されている
                if (memory.imageUrl && memory.imageStorage === 'firebase') {
                    // 既にFirebase Storageにアップロード済み
                    console.log('Image already uploaded to Firebase Storage:', memory.imageUrl);
                    memoryToSave.imageUrl = memory.imageUrl;
                    delete memoryToSave.image; // Base64データは保存しない
                    delete memoryToSave.imageFile; // Fileオブジェクトも保存しない
                } else if (memory.imageFile) {
                    // まだアップロードされていない場合（通常はここには来ないはず）
                    try {
                        console.log('Uploading image to Firebase Storage from storage-manager...');
                        const storage = firebase.storage();
                        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${memory.imageFile.name}`;
                        const imageRef = storage.ref().child(`images/${user.uid}/${fileName}`);
                        
                        const snapshot = await imageRef.put(memory.imageFile);
                        const imageUrl = await snapshot.ref.getDownloadURL();
                        
                        memoryToSave.imageUrl = imageUrl;
                        delete memoryToSave.image;
                        delete memoryToSave.imageFile;
                        
                        console.log('Image uploaded successfully from storage-manager:', imageUrl);
                    } catch (imageError) {
                        console.error('Image upload failed in storage-manager:', imageError);
                        delete memoryToSave.image;
                        delete memoryToSave.imageFile;
                    }
                }
                
                // Firestoreに保存（画像URLのみ）
                const docRef = await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .add(memoryToSave);
                
                memory.id = docRef.id;
                this.memories.unshift(memory);
                
                // ユーザーのメモリーカウントを更新
                await db.collection('users').doc(user.uid).update({
                    memoryCount: firebase.firestore.FieldValue.increment(1)
                });
                
                // ローカルにも保存（元の画像データを含む）
                localStorage.setItem('memories', JSON.stringify(this.memories));
                
                return {
                    success: true,
                    memory: memory,
                    currentCount: this.memories.length
                };
            } catch (error) {
                console.error('Cloud save error:', error);
                
                // 権限エラーの場合
                if (error.code === 'permission-denied') {
                    return {
                        success: false,
                        error: 'PERMISSION_DENIED',
                        message: 'Firestoreへの保存権限がありません。管理者に連絡してください。'
                    };
                }
                
                // その他のエラーの場合はローカルに保存を試みる
                console.log('Falling back to local storage...');
            }
        }

        // ローカル保存
        memory.id = Date.now().toString();
        
        // ローカルストレージに保存する前にBase64画像データを除外
        let memoryForLocal = { ...memory };
        if (memoryForLocal.image && memoryForLocal.image.startsWith('data:')) {
            delete memoryForLocal.image; // Base64データは保存しない
        }
        if (memoryForLocal.imageFile) {
            delete memoryForLocal.imageFile; // Fileオブジェクトも保存しない
        }
        
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
                message: 'ストレージへの保存に失敗しました。容量が不足している可能性があります。'
            };
        }
    }

    // メモリーを削除
    async deleteMemory(id) {
        // クラウドから削除
        if (this.isCloudEnabled && this.authManager && this.authManager.isAuthenticated()) {
            try {
                const user = this.authManager.getCurrentUser();
                await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .doc(id)
                    .delete();
                
                // ユーザーのメモリーカウントを更新
                await db.collection('users').doc(user.uid).update({
                    memoryCount: firebase.firestore.FieldValue.increment(-1)
                });
            } catch (error) {
                console.error('Cloud delete error:', error);
            }
        }

        // ローカルから削除
        const index = this.memories.findIndex(m => m.id === id);
        if (index !== -1) {
            this.memories.splice(index, 1);
            localStorage.setItem('memories', JSON.stringify(this.memories));
            return true;
        }
        return false;
    }

    // 使用状況を取得
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

    // クラウドプランへの移行時のデータ移行
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

    // プラン変更通知
    notifyPlanChange(plan) {
        window.dispatchEvent(new CustomEvent('planChanged', { 
            detail: { plan, usage: this.getUsageStats() }
        }));
    }

    // ストレージ容量警告
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
                    message: '無料プランの上限に達しました。プレミアムプランへのアップグレードをご検討ください。',
                    type: 'error'
                };
            }
        }
        return { show: false };
    }
}

// エクスポート
window.StorageManager = StorageManager;