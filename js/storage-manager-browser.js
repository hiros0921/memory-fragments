// ブラウザ互換版のstorage-manager.js（importを使わない）

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
            const userId = this.authManager.getCurrentUser().uid;
            const snapshot = await db.collection('users')
                .doc(userId)
                .collection('memories')
                .orderBy('createdAt', 'desc')
                .get();

            this.memories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // ローカルにもバックアップ
            localStorage.setItem('memories', JSON.stringify(this.memories));
            
            return this.memories;
        } catch (error) {
            console.error('クラウドから読み込みエラー:', error);
            return this.loadMemoriesFromLocal();
        }
    }

    async saveMemory(memory) {
        if (this.isAtFreeLimit() && this.currentPlan === 'free') {
            return { 
                success: false, 
                message: '無料プランの上限（50個）に達しました。プレミアムプランにアップグレードしてください。' 
            };
        }

        // 画像処理が必要な場合
        if (memory.imageFile) {
            const uploadResult = await this.uploadImageToStorage(memory);
            if (uploadResult.success) {
                memory.imageUrl = uploadResult.url;
                delete memory.imageFile;
            } else {
                console.error('画像アップロードエラー:', uploadResult.error);
                // 画像なしで続行するか確認
                if (!confirm('画像のアップロードに失敗しました。画像なしで保存しますか？')) {
                    return { success: false, message: 'キャンセルされました' };
                }
            }
        }

        if (this.isCloudEnabled) {
            return await this.saveToCloud(memory);
        } else {
            return this.saveToLocal(memory);
        }
    }

    async uploadImageToStorage(memory) {
        try {
            if (!firebase.auth().currentUser) {
                throw new Error('ログインが必要です');
            }

            // 認証トークンを更新
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
                await currentUser.getIdToken(true);
            }

            const timestamp = Date.now();
            const fileName = `memories/${currentUser.uid}/${timestamp}_${memory.imageFile.name}`;
            
            // Firebase Storage参照を作成
            const storageRef = firebase.storage().ref(fileName);
            
            // メタデータ設定
            const metadata = {
                contentType: memory.imageFile.type,
                customMetadata: {
                    uploadedBy: currentUser.uid,
                    uploadedAt: new Date().toISOString(),
                    memoryTitle: memory.title || 'Untitled'
                }
            };

            console.log('アップロード開始:', fileName);
            
            // ファイルをアップロード
            const uploadTask = storageRef.put(memory.imageFile, metadata);
            
            // アップロードの進行状況を監視
            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('アップロード進行状況: ' + progress + '%');
                    },
                    (error) => {
                        console.error('アップロードエラー:', error);
                        reject({
                            success: false,
                            error: error.message
                        });
                    },
                    async () => {
                        try {
                            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                            console.log('アップロード成功:', downloadURL);
                            resolve({
                                success: true,
                                url: downloadURL
                            });
                        } catch (error) {
                            console.error('URL取得エラー:', error);
                            reject({
                                success: false,
                                error: error.message
                            });
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Firebase Storage Error:', {
                code: error.code,
                message: error.message,
                serverResponse: error.serverResponse,
                customData: error.customData
            });
            
            // ユーザーにわかりやすいエラーメッセージ
            if (error.code === 'storage/unauthorized') {
                return { success: false, error: 'アップロード権限がありません。ログインしてください。' };
            } else if (error.code === 'storage/canceled') {
                return { success: false, error: 'アップロードがキャンセルされました。' };
            } else if (error.code === 'storage/unknown') {
                return { success: false, error: 'ネットワークエラーが発生しました。再度お試しください。' };
            }
            
            return { success: false, error: error.message };
        }
    }

    async saveToCloud(memory) {
        if (!this.authManager || !this.authManager.isAuthenticated()) {
            return this.saveToLocal(memory);
        }

        try {
            const userId = this.authManager.getCurrentUser().uid;
            const docRef = await db.collection('users')
                .doc(userId)
                .collection('memories')
                .add({
                    ...memory,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });

            memory.id = docRef.id;
            this.memories.unshift(memory);

            // ローカルにもバックアップ
            localStorage.setItem('memories', JSON.stringify(this.memories));

            return { success: true, memory };
        } catch (error) {
            console.error('クラウド保存エラー:', error);
            // フォールバック：ローカルに保存
            return this.saveToLocal(memory);
        }
    }

    saveToLocal(memory) {
        memory.id = Date.now().toString();
        memory.createdAt = new Date().toISOString();
        
        this.memories.unshift(memory);
        localStorage.setItem('memories', JSON.stringify(this.memories));
        
        return { success: true, memory };
    }

    getMemories(filter = {}) {
        let filtered = [...this.memories];

        if (filter.category) {
            filtered = filtered.filter(m => m.category === filter.category);
        }

        if (filter.searchText) {
            const searchLower = filter.searchText.toLowerCase();
            filtered = filtered.filter(m => 
                m.content.toLowerCase().includes(searchLower) ||
                m.category.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    }

    isAtFreeLimit() {
        return this.memories.length >= this.FREE_LIMIT;
    }

    isPremiumUser() {
        return this.currentPlan === 'premium' || this.currentPlan === 'lifetime';
    }

    notifyPlanChange(newPlan) {
        // カスタムイベントを発火
        window.dispatchEvent(new CustomEvent('planChanged', { 
            detail: { plan: newPlan } 
        }));
    }

    deleteMemory(memoryId) {
        const index = this.memories.findIndex(m => m.id === memoryId);
        if (index !== -1) {
            this.memories.splice(index, 1);
            
            if (this.isCloudEnabled) {
                // クラウドから削除
                const userId = this.authManager.getCurrentUser().uid;
                db.collection('users')
                    .doc(userId)
                    .collection('memories')
                    .doc(memoryId)
                    .delete()
                    .catch(error => console.error('クラウド削除エラー:', error));
            }
            
            // ローカルストレージを更新
            localStorage.setItem('memories', JSON.stringify(this.memories));
            return true;
        }
        return false;
    }

    updateMemory(memoryId, updates) {
        const memory = this.memories.find(m => m.id === memoryId);
        if (memory) {
            Object.assign(memory, updates);
            memory.updatedAt = new Date().toISOString();
            
            if (this.isCloudEnabled) {
                // クラウドを更新
                const userId = this.authManager.getCurrentUser().uid;
                db.collection('users')
                    .doc(userId)
                    .collection('memories')
                    .doc(memoryId)
                    .update({
                        ...updates,
                        updatedAt: memory.updatedAt
                    })
                    .catch(error => console.error('クラウド更新エラー:', error));
            }
            
            // ローカルストレージを更新
            localStorage.setItem('memories', JSON.stringify(this.memories));
            return true;
        }
        return false;
    }
}