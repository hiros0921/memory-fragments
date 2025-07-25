// 最終版：Firebase StorageとBase64フォールバック機能を持つstorage-manager
// Firebase Storageが失敗した場合、自動的にBase64で保存

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

        // 画像処理
        if (memory.imageFile) {
            // まずFirebase Storageを試す
            console.log('Firebase Storageでアップロードを試みます...');
            const uploadResult = await this.uploadImageToStorage(memory);
            
            if (uploadResult.success) {
                memory.imageUrl = uploadResult.url;
                delete memory.imageFile;
            } else {
                console.log('Firebase Storage失敗。Base64フォールバックを使用します...');
                // Firebase Storageが失敗したらBase64で保存
                const base64Result = await this.convertToBase64(memory.imageFile);
                if (base64Result.success) {
                    memory.imageData = base64Result.data;
                    memory.imageType = 'base64';
                    delete memory.imageFile;
                } else {
                    console.error('画像処理に失敗しました');
                    if (!confirm('画像の保存に失敗しました。画像なしで保存しますか？')) {
                        return { success: false, message: 'キャンセルされました' };
                    }
                }
            }
        }

        if (this.isCloudEnabled) {
            return await this.saveToCloud(memory);
        } else {
            return this.saveToLocal(memory);
        }
    }

    // Base64変換関数
    async convertToBase64(file) {
        return new Promise((resolve) => {
            try {
                // ファイルサイズチェック（5MB以下）
                if (file.size > 5 * 1024 * 1024) {
                    console.log('画像サイズが大きいため圧縮します...');
                    this.compressImage(file, (compressedBase64) => {
                        resolve({ success: true, data: compressedBase64 });
                    });
                } else {
                    // そのままBase64に変換
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        resolve({ success: true, data: e.target.result });
                    };
                    reader.onerror = () => {
                        resolve({ success: false, error: 'ファイル読み込みエラー' });
                    };
                    reader.readAsDataURL(file);
                }
            } catch (error) {
                resolve({ success: false, error: error.message });
            }
        });
    }

    // 画像圧縮関数
    compressImage(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 品質を調整して圧縮（0.7 = 70%品質）
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                callback(compressedBase64);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async uploadImageToStorage(memory) {
        try {
            if (!firebase.auth().currentUser) {
                throw new Error('ログインが必要です');
            }

            const currentUser = firebase.auth().currentUser;
            await currentUser.getIdToken(true);

            const timestamp = Date.now();
            const fileName = `memories/${currentUser.uid}/${timestamp}_${memory.imageFile.name}`;
            const storageRef = firebase.storage().ref(fileName);
            
            const metadata = {
                contentType: memory.imageFile.type,
                customMetadata: {
                    uploadedBy: currentUser.uid,
                    uploadedAt: new Date().toISOString()
                }
            };

            console.log('アップロード開始:', fileName);
            
            // タイムアウト付きでアップロード（30秒）
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadTask = storageRef.put(memory.imageFile, metadata);
                
                // 30秒のタイムアウト
                const timeout = setTimeout(() => {
                    uploadTask.cancel();
                    reject(new Error('アップロードタイムアウト'));
                }, 30000);
                
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('進行状況: ' + progress + '%');
                    },
                    (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    },
                    async () => {
                        clearTimeout(timeout);
                        try {
                            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                            resolve({ success: true, url: downloadURL });
                        } catch (error) {
                            reject(error);
                        }
                    }
                );
            });

            return await uploadPromise;
        } catch (error) {
            console.error('Firebase Storage エラー:', error);
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
            localStorage.setItem('memories', JSON.stringify(this.memories));

            return { success: true, memory };
        } catch (error) {
            console.error('クラウド保存エラー:', error);
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
        window.dispatchEvent(new CustomEvent('planChanged', { 
            detail: { plan: newPlan } 
        }));
    }

    deleteMemory(memoryId) {
        const index = this.memories.findIndex(m => m.id === memoryId);
        if (index !== -1) {
            this.memories.splice(index, 1);
            
            if (this.isCloudEnabled) {
                const userId = this.authManager.getCurrentUser().uid;
                db.collection('users')
                    .doc(userId)
                    .collection('memories')
                    .doc(memoryId)
                    .delete()
                    .catch(error => console.error('クラウド削除エラー:', error));
            }
            
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
            
            localStorage.setItem('memories', JSON.stringify(this.memories));
            return true;
        }
        return false;
    }
}