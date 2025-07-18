// 認証UIコンポーネント
class AuthUI {
    constructor(authManager) {
        this.authManager = authManager;
        this.currentView = 'signin';
    }

    // 認証画面の表示
    showAuthScreen() {
        const authContainer = document.createElement('div');
        authContainer.id = 'authContainer';
        authContainer.className = 'auth-container';
        authContainer.innerHTML = this.getAuthHTML();
        document.body.appendChild(authContainer);
        
        this.setupEventListeners();
    }

    // 認証画面を非表示
    hideAuthScreen() {
        const authContainer = document.getElementById('authContainer');
        if (authContainer) {
            authContainer.remove();
        }
    }

    // 認証画面のHTML
    getAuthHTML() {
        return `
            <div class="auth-card">
                <div class="auth-header">
                    <h1 class="auth-title">Memory Fragments</h1>
                    <p class="auth-subtitle">
                        ${this.currentView === 'signin' 
                            ? '大切な記憶を永遠に保存' 
                            : '新しいアカウントを作成'}
                    </p>
                </div>

                <div id="authMessage"></div>

                ${this.currentView === 'signin' 
                    ? this.getSignInForm() 
                    : this.getSignUpForm()}

                <div class="auth-divider">
                    <span>または</span>
                </div>

                <div class="social-auth-buttons">
                    <button class="social-auth-button" onclick="authUI.signInWithGoogle()">
                        <svg class="social-icon" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Googleでログイン
                    </button>
                </div>

                <div class="auth-footer">
                    ${this.currentView === 'signin' 
                        ? `
                            <p>アカウントをお持ちでない方は 
                                <a href="#" class="auth-link" onclick="authUI.switchView('signup')">
                                    新規登録
                                </a>
                            </p>
                            <p style="margin-top: 10px;">
                                <a href="#" class="auth-link" onclick="authUI.showResetPassword()">
                                    パスワードを忘れた方
                                </a>
                            </p>
                        `
                        : `
                            <p>既にアカウントをお持ちの方は 
                                <a href="#" class="auth-link" onclick="authUI.switchView('signin')">
                                    ログイン
                                </a>
                            </p>
                        `
                    }
                </div>
            </div>
        `;
    }

    // ログインフォーム
    getSignInForm() {
        return `
            <form id="signInForm" class="auth-form">
                <div class="auth-input-group">
                    <label class="auth-label">メールアドレス</label>
                    <input type="email" class="auth-input" id="signInEmail" required 
                           placeholder="your@email.com">
                </div>
                <div class="auth-input-group">
                    <label class="auth-label">パスワード</label>
                    <input type="password" class="auth-input" id="signInPassword" required 
                           placeholder="••••••••">
                </div>
                <button type="submit" class="auth-button auth-button-primary">
                    ログイン
                </button>
            </form>
        `;
    }

    // 新規登録フォーム
    getSignUpForm() {
        return `
            <form id="signUpForm" class="auth-form">
                <div class="auth-input-group">
                    <label class="auth-label">お名前</label>
                    <input type="text" class="auth-input" id="signUpName" required 
                           placeholder="山田太郎">
                </div>
                <div class="auth-input-group">
                    <label class="auth-label">メールアドレス</label>
                    <input type="email" class="auth-input" id="signUpEmail" required 
                           placeholder="your@email.com">
                </div>
                <div class="auth-input-group">
                    <label class="auth-label">パスワード（6文字以上）</label>
                    <input type="password" class="auth-input" id="signUpPassword" required 
                           placeholder="••••••••" minlength="6">
                </div>
                <button type="submit" class="auth-button auth-button-primary">
                    アカウント作成
                </button>
            </form>
        `;
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // ログインフォーム
        const signInForm = document.getElementById('signInForm');
        if (signInForm) {
            signInForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSignIn();
            });
        }

        // 新規登録フォーム
        const signUpForm = document.getElementById('signUpForm');
        if (signUpForm) {
            signUpForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleSignUp();
            });
        }
    }

    // ログイン処理
    async handleSignIn() {
        const email = document.getElementById('signInEmail').value;
        const password = document.getElementById('signInPassword').value;

        this.showLoading();
        const result = await this.authManager.signInWithEmail(email, password);
        this.hideLoading();

        if (result.success) {
            this.showMessage('ログインしました', 'success');
            setTimeout(() => {
                this.hideAuthScreen();
                location.reload();
            }, 1000);
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    // 新規登録処理
    async handleSignUp() {
        const name = document.getElementById('signUpName').value;
        const email = document.getElementById('signUpEmail').value;
        const password = document.getElementById('signUpPassword').value;

        this.showLoading();
        const result = await this.authManager.signUpWithEmail(email, password, name);
        this.hideLoading();

        if (result.success) {
            this.showMessage('アカウントを作成しました', 'success');
            setTimeout(() => {
                this.hideAuthScreen();
                location.reload();
            }, 1000);
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    // Googleログイン
    async signInWithGoogle() {
        this.showLoading();
        const result = await this.authManager.signInWithGoogle();
        this.hideLoading();

        if (result.success) {
            this.showMessage('ログインしました', 'success');
            setTimeout(() => {
                this.hideAuthScreen();
                location.reload();
            }, 1000);
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    // パスワードリセット画面
    showResetPassword() {
        const email = prompt('パスワードリセット用のメールアドレスを入力してください');
        if (email) {
            this.authManager.resetPassword(email).then(result => {
                if (result.success) {
                    this.showMessage(result.message, 'success');
                } else {
                    this.showMessage(result.error, 'error');
                }
            });
        }
    }

    // ビュー切り替え
    switchView(view) {
        this.currentView = view;
        const authContainer = document.getElementById('authContainer');
        if (authContainer) {
            authContainer.innerHTML = this.getAuthHTML();
            this.setupEventListeners();
        }
    }

    // メッセージ表示
    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('authMessage');
        messageEl.className = type === 'error' ? 'auth-error' : 'auth-success';
        messageEl.innerHTML = `
            <span>${type === 'error' ? '⚠️' : '✅'}</span>
            <span>${message}</span>
        `;
    }

    // ローディング表示
    showLoading() {
        const buttons = document.querySelectorAll('.auth-button');
        buttons.forEach(button => {
            button.disabled = true;
            button.style.opacity = '0.6';
        });
    }

    hideLoading() {
        const buttons = document.querySelectorAll('.auth-button');
        buttons.forEach(button => {
            button.disabled = false;
            button.style.opacity = '1';
        });
    }

    // ユーザープロフィール表示
    createUserProfile(user) {
        const profile = document.createElement('div');
        profile.className = 'user-profile';
        profile.innerHTML = `
            <div class="user-avatar">
                ${user.photoURL 
                    ? `<img src="${user.photoURL}" alt="${user.displayName}">` 
                    : user.displayName.charAt(0).toUpperCase()
                }
            </div>
            <div class="user-info">
                <div class="user-name">${user.displayName}</div>
                <div class="user-plan">${user.plan === 'premium' ? '👑 プレミアム' : '無料プラン'}</div>
            </div>
        `;

        // ドロップダウンメニュー
        const dropdown = document.createElement('div');
        dropdown.className = 'user-dropdown';
        dropdown.innerHTML = `
            ${user.plan === 'free' ? `
                <a href="#" class="dropdown-item" onclick="premiumFeatures.showUpgradeModal()">
                    <span>👑</span>
                    <span>プレミアムにアップグレード</span>
                </a>
                <div class="dropdown-divider"></div>
            ` : ''}
            <a href="#" class="dropdown-item" onclick="authUI.showAccountSettings()">
                <span>⚙️</span>
                <span>アカウント設定</span>
            </a>
            <a href="#" class="dropdown-item" onclick="authUI.handleSignOut()">
                <span>🚪</span>
                <span>ログアウト</span>
            </a>
        `;

        profile.appendChild(dropdown);

        // クリックでドロップダウン表示
        profile.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        // 外側クリックで閉じる
        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });

        return profile;
    }

    // ログアウト処理
    async handleSignOut() {
        if (confirm('ログアウトしますか？')) {
            const result = await this.authManager.signOut();
            if (result.success) {
                location.reload();
            }
        }
    }

    // アカウント設定（仮）
    showAccountSettings() {
        alert('アカウント設定画面は準備中です');
    }
}

// グローバルに公開
window.AuthUI = AuthUI;