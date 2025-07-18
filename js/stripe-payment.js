// Stripe決済機能の実装
class StripePayment {
    constructor() {
        // TODO: 本番環境では環境変数から読み込む
        this.publishableKey = 'pk_test_51xxxxxxxxxxxxx'; // Stripeダッシュボードから取得
        this.stripe = null;
        this.priceId = 'price_xxxxxxxxxxxxx'; // 月額プランの価格ID
        
        this.init();
    }

    async init() {
        // Stripeライブラリが読み込まれているか確認
        if (typeof Stripe === 'undefined') {
            console.warn('Stripeライブラリが読み込まれていません。index.htmlに以下を追加してください:');
            console.warn('<script src="https://js.stripe.com/v3/"></script>');
            return;
        }

        this.stripe = Stripe(this.publishableKey);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // アップグレードボタンのイベントを監視
        document.addEventListener('click', async (e) => {
            // プレミアムアップグレードボタンがクリックされた場合
            if (e.target.closest('.upgrade-to-premium') || 
                e.target.closest('.btn-upgrade') ||
                e.target.closest('[onclick*="startUpgrade"]')) {
                e.preventDefault();
                e.stopPropagation();
                await this.startCheckout();
            }
        });
    }

    async startCheckout() {
        try {
            // 認証チェック
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                this.showNotification('ログインが必要です', 'error');
                return;
            }

            this.showNotification('決済ページを準備中...', 'info');

            // Firebase Cloud Functionを呼び出してCheckout Sessionを作成
            const createCheckoutSession = firebase.functions().httpsCallable('createCheckoutSession');
            const { data } = await createCheckoutSession({
                priceId: this.priceId,
                successUrl: window.location.origin + '/#/success',
                cancelUrl: window.location.origin + '/#/premium'
            });

            // Stripeの決済ページへリダイレクト
            const result = await this.stripe.redirectToCheckout({
                sessionId: data.sessionId
            });

            if (result.error) {
                this.showNotification('決済エラー: ' + result.error.message, 'error');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            this.showNotification('決済の開始に失敗しました。しばらく後でお試しください。', 'error');
        }
    }

    // 決済成功後の処理
    async handleSuccess(sessionId) {
        this.showNotification('決済が完了しました！プレミアムプランをお楽しみください', 'success');
        
        // ユーザー情報を更新
        if (window.memoryArchive && window.memoryArchive.storageManager) {
            window.memoryArchive.storageManager.setUserPlan('premium');
            
            // UIを更新
            setTimeout(() => {
                location.reload();
            }, 2000);
        }
    }

    // サブスクリプション解約
    async cancelSubscription() {
        if (!confirm('プレミアムプランを解約しますか？\n現在の請求期間が終了するまでは引き続きご利用いただけます。')) {
            return;
        }

        try {
            this.showNotification('解約処理中...', 'info');
            
            const cancelSubscription = firebase.functions().httpsCallable('cancelSubscription');
            await cancelSubscription();
            
            this.showNotification('解約が完了しました。期間終了まで引き続きご利用いただけます。', 'success');
        } catch (error) {
            console.error('Cancel subscription error:', error);
            this.showNotification('解約処理に失敗しました。サポートにお問い合わせください。', 'error');
        }
    }

    // 通知表示
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = 'notification show';
            if (type === 'error') {
                notification.classList.add('error');
            }
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 5000);
        } else {
            // フォールバック
            if (type === 'error') {
                console.error(message);
                alert(message);
            } else {
                console.log(message);
            }
        }
    }

    // 価格表示用のヘルパー関数
    formatPrice(amount, currency = 'JPY') {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0
        }).format(amount);
    }

    // 料金プラン情報
    getPlanInfo() {
        return {
            free: {
                name: '無料プラン',
                price: 0,
                features: [
                    '記憶の保存（50件まで）',
                    '基本的な感情分析',
                    '写真アップロード（2MBまで）'
                ],
                limitations: [
                    '保存数に制限あり',
                    '大容量画像は非対応',
                    '高度な機能は利用不可'
                ]
            },
            premium: {
                name: 'プレミアムプラン',
                price: 480,
                priceDisplay: this.formatPrice(480),
                features: [
                    '✨ 無制限の記憶保存',
                    '🖼️ 大容量画像対応（50MBまで）',
                    '🤖 AI感情分析Pro',
                    '👨‍👩‍👧‍👦 家族アルバム共有',
                    '☁️ クラウドバックアップ',
                    '🔍 高度な検索機能',
                    '📊 詳細な分析レポート',
                    '🎯 優先サポート'
                ],
                trial: '7日間無料トライアル付き'
            }
        };
    }
}

// グローバルに公開
window.StripePayment = StripePayment;

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    window.stripePayment = new StripePayment();
});