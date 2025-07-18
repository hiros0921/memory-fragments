// ユーザー認証管理クラス
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = [];
        this.setupAuthListener();
    }

    // 認証状態の監視
    setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // ユーザー情報とプラン情報を取得
                this.currentUser = await this.getUserData(user);
                this.notifyAuthStateChange(true);
            } else {
                this.currentUser = null;
                this.notifyAuthStateChange(false);
            }
        });
    }

    // ユーザーデータの取得
    async getUserData(user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                return {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    ...userDoc.data()
                };
            } else {
                // 新規ユーザーの場合、初期データを作成
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    photoURL: user.photoURL,
                    plan: 'free',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
                    memoryCount: 0,
                    maxMemories: 50
                };
                await db.collection('users').doc(user.uid).set(userData);
                return userData;
            }
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    // メールアドレスでサインアップ
    async signUpWithEmail(email, password, displayName) {
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            
            // プロフィール更新
            await result.user.updateProfile({
                displayName: displayName
            });

            // ウェルカムメール送信（オプション）
            await this.sendWelcomeEmail(result.user);

            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    // メールアドレスでログイン
    async signInWithEmail(email, password) {
        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            
            // 最終ログイン時刻を更新
            await db.collection('users').doc(result.user.uid).update({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    // Googleでログイン
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            
            const result = await auth.signInWithPopup(provider);
            
            // 最終ログイン時刻を更新
            await db.collection('users').doc(result.user.uid).update({
                lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, user: result.user };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    // パスワードリセット
    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            return { success: true, message: 'パスワードリセットメールを送信しました' };
        } catch (error) {
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    }

    // ログアウト
    async signOut() {
        try {
            await auth.signOut();
            // ローカルストレージのクリア（オプション）
            localStorage.removeItem('userPlan');
            localStorage.removeItem('memories');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 現在のユーザー取得
    getCurrentUser() {
        return this.currentUser;
    }

    // ユーザーがログイン済みか確認
    isAuthenticated() {
        return !!this.currentUser;
    }

    // ユーザーがプレミアムプランか確認
    isPremiumUser() {
        return this.currentUser && this.currentUser.plan === 'premium';
    }

    // 認証状態変更の通知
    notifyAuthStateChange(isAuthenticated) {
        this.authStateListeners.forEach(listener => listener(isAuthenticated));
    }

    // 認証状態リスナーの登録
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
    }

    // エラーメッセージの日本語化
    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'このメールアドレスは既に使用されています',
            'auth/invalid-email': 'メールアドレスの形式が正しくありません',
            'auth/weak-password': 'パスワードは6文字以上にしてください',
            'auth/user-not-found': 'ユーザーが見つかりません',
            'auth/wrong-password': 'パスワードが間違っています',
            'auth/popup-closed-by-user': 'ログインがキャンセルされました',
            'auth/network-request-failed': 'ネットワークエラーが発生しました',
            'auth/too-many-requests': 'しばらく時間をおいてから再試行してください'
        };
        return errorMessages[errorCode] || 'エラーが発生しました';
    }

    // ウェルカムメール送信（Firebase Functionsで実装推奨）
    async sendWelcomeEmail(user) {
        // 実際の実装ではFirebase Functionsを使用
        console.log(`Welcome email would be sent to ${user.email}`);
    }

    // プラン変更時の処理
    async updateUserPlan(plan) {
        if (!this.currentUser) return { success: false, error: 'ログインが必要です' };

        try {
            await db.collection('users').doc(this.currentUser.uid).update({
                plan: plan,
                maxMemories: plan === 'premium' ? null : 50,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.currentUser.plan = plan;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// グローバルに公開
window.AuthManager = AuthManager;