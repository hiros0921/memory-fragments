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
                const docRef = await db.collection('users')
                    .doc(user.uid)
                    .collection('memories')
                    .add(memory);
                
                memory.id = docRef.id;
                this.memories.unshift(memory);
                
                // ユーザーのメモリーカウントを更新
                await db.collection('users').doc(user.uid).update({
                    memoryCount: firebase.firestore.FieldValue.increment(1)
                });
                
                // ローカルにも保存
                localStorage.setItem('memories', JSON.stringify(this.memories));
                
                return {
                    success: true,
                    memory: memory,
                    currentCount: this.memories.length
                };
            } catch (error) {
                console.error('Cloud save error:', error);
                // クラウド保存失敗時はローカルに保存
            }
        }

        // ローカル保存
        memory.id = Date.now().toString();
        this.memories.unshift(memory);
        
        try {
            localStorage.setItem('memories', JSON.stringify(this.memories));
            return {
                success: true,
                memory: memory,
                currentCount: this.memories.length
            };
        } catch (error) {
            return {
                success: false,
                error: 'STORAGE_ERROR',
                message: 'ストレージへの保存に失敗しました。'
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