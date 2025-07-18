// プレミアム機能とアップグレード管理
class PremiumFeatures {
    constructor() {
        this.plans = {
            free: {
                name: '無料プラン',
                price: 0,
                features: [
                    '50件までの記憶を保存',
                    '基本的な感情分析',
                    'ローカル保存のみ',
                    '年次レポート（簡易版）'
                ],
                limitations: [
                    '保存件数制限あり',
                    'クラウドバックアップなし',
                    '高度な分析機能なし'
                ]
            },
            premium: {
                name: 'プレミアムプラン',
                price: 500,
                features: [
                    '無制限の記憶保存',
                    'AI高度感情分析',
                    'クラウド自動バックアップ',
                    'すべてのデバイスで同期',
                    '詳細な年次レポート',
                    '記憶の共有機能',
                    'プレミアムサポート'
                ],
                badge: 'PREMIUM'
            }
        };
    }

    // アップグレードモーダルを表示
    showUpgradeModal(context = 'limit_reached') {
        const modal = document.createElement('div');
        modal.className = 'premium-modal';
        modal.innerHTML = `
            <div class="premium-modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="premium-modal-content">
                <button class="close-btn" onclick="this.closest('.premium-modal').remove()">×</button>
                
                <div class="premium-header">
                    <h2>プレミアムプランにアップグレード</h2>
                    ${context === 'limit_reached' 
                        ? '<p class="limit-message">⚠️ 無料プランの保存上限に達しました</p>'
                        : '<p class="upgrade-message">🌟 すべての機能を解放しましょう</p>'
                    }
                </div>

                <div class="plans-comparison">
                    <div class="plan-card current">
                        <h3>無料プラン</h3>
                        <p class="price">¥0<span>/月</span></p>
                        <ul class="features">
                            ${this.plans.free.features.map(f => `<li>✓ ${f}</li>`).join('')}
                        </ul>
                        <ul class="limitations">
                            ${this.plans.free.limitations.map(l => `<li>✗ ${l}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="plan-card premium">
                        <div class="premium-badge">おすすめ</div>
                        <h3>プレミアムプラン</h3>
                        <p class="price">¥${this.plans.premium.price}<span>/月</span></p>
                        <ul class="features">
                            ${this.plans.premium.features.map(f => `<li>✓ ${f}</li>`).join('')}
                        </ul>
                        <button class="upgrade-btn" onclick="premiumFeatures.startUpgrade()">
                            今すぐアップグレード
                        </button>
                    </div>
                </div>

                <div class="payment-info">
                    <p>• いつでもキャンセル可能</p>
                    <p>• 初回7日間無料トライアル</p>
                    <p>• セキュアな決済処理</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.addModalStyles();
    }

    // プレミアムバッジを表示
    showPremiumBadge() {
        const badge = document.createElement('div');
        badge.className = 'premium-user-badge';
        badge.innerHTML = '👑 PREMIUM';
        return badge;
    }

    // 使用状況バーを作成
    createUsageBar(stats) {
        const bar = document.createElement('div');
        bar.className = 'usage-bar-container';
        
        if (stats.plan === 'free') {
            const percentage = Math.min(stats.percentage, 100);
            const isWarning = percentage >= 80;
            const isCritical = percentage >= 95;
            
            bar.innerHTML = `
                <div class="usage-info">
                    <span>使用状況: ${stats.currentCount} / ${stats.limit}</span>
                    ${isCritical ? '<span class="upgrade-link" onclick="premiumFeatures.showUpgradeModal()">アップグレード</span>' : ''}
                </div>
                <div class="usage-bar ${isWarning ? 'warning' : ''} ${isCritical ? 'critical' : ''}">
                    <div class="usage-fill" style="width: ${percentage}%"></div>
                </div>
            `;
        } else {
            bar.innerHTML = `
                <div class="usage-info premium">
                    <span>👑 プレミアムプラン - 無制限</span>
                    <span>${stats.currentCount} 件保存済み</span>
                </div>
            `;
        }
        
        return bar;
    }

    // アップグレード処理を開始
    startUpgrade() {
        // Stripe決済が利用可能か確認
        if (window.stripePayment && window.stripePayment.stripe) {
            // Stripe決済を開始
            window.stripePayment.startCheckout();
        } else {
            // Stripe未設定の場合はデモモード
            alert('決済システムは準備中です。\n実装時にはStripeを使用した安全な決済が可能になります。');
            
            // デモ用：プランを切り替え
            if (confirm('デモ：プレミアムプランに切り替えますか？')) {
                const storageManager = new StorageManager();
                storageManager.setUserPlan('premium');
                location.reload();
            }
        }
    }

    // モーダルのスタイルを追加
    addModalStyles() {
        if (document.getElementById('premium-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'premium-styles';
        style.innerHTML = `
            .premium-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .premium-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(5px);
            }

            .premium-modal-content {
                position: relative;
                background: var(--surface);
                border-radius: 20px;
                padding: 40px;
                max-width: 800px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border: 1px solid var(--glass-border);
            }

            .close-btn {
                position: absolute;
                top: 20px;
                right: 20px;
                background: none;
                border: none;
                color: var(--text-secondary);
                font-size: 24px;
                cursor: pointer;
                transition: color 0.3s;
            }

            .close-btn:hover {
                color: var(--text-primary);
            }

            .premium-header {
                text-align: center;
                margin-bottom: 40px;
            }

            .premium-header h2 {
                font-size: 32px;
                margin-bottom: 10px;
                background: var(--gradient-1);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .limit-message {
                color: var(--secondary);
                font-size: 18px;
                margin-top: 10px;
            }

            .plans-comparison {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
            }

            .plan-card {
                background: var(--glass);
                border: 1px solid var(--glass-border);
                border-radius: 15px;
                padding: 30px;
                position: relative;
                transition: transform 0.3s, box-shadow 0.3s;
            }

            .plan-card.premium {
                border-color: var(--primary);
                background: rgba(99, 102, 241, 0.1);
            }

            .premium-badge {
                position: absolute;
                top: -15px;
                right: 20px;
                background: var(--gradient-1);
                color: white;
                padding: 5px 20px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: bold;
            }

            .plan-card h3 {
                font-size: 24px;
                margin-bottom: 15px;
            }

            .price {
                font-size: 36px;
                font-weight: bold;
                color: var(--primary);
                margin-bottom: 20px;
            }

            .price span {
                font-size: 16px;
                color: var(--text-secondary);
            }

            .features, .limitations {
                list-style: none;
                margin-bottom: 20px;
            }

            .features li, .limitations li {
                padding: 8px 0;
                font-size: 14px;
            }

            .limitations li {
                color: var(--text-secondary);
                opacity: 0.7;
            }

            .upgrade-btn {
                width: 100%;
                padding: 15px;
                background: var(--gradient-1);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.3s, box-shadow 0.3s;
            }

            .upgrade-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
            }

            .payment-info {
                text-align: center;
                color: var(--text-secondary);
                font-size: 14px;
            }

            .payment-info p {
                margin: 5px 0;
            }

            /* 使用状況バー */
            .usage-bar-container {
                background: var(--glass);
                border: 1px solid var(--glass-border);
                border-radius: 10px;
                padding: 15px;
                margin: 20px 0;
            }

            .usage-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                font-size: 14px;
            }

            .usage-info.premium {
                margin-bottom: 0;
                color: var(--primary);
            }

            .upgrade-link {
                color: var(--primary);
                cursor: pointer;
                text-decoration: underline;
            }

            .usage-bar {
                height: 8px;
                background: var(--border);
                border-radius: 4px;
                overflow: hidden;
                position: relative;
            }

            .usage-fill {
                height: 100%;
                background: var(--primary);
                transition: width 0.3s;
            }

            .usage-bar.warning .usage-fill {
                background: #f59e0b;
            }

            .usage-bar.critical .usage-fill {
                background: var(--secondary);
            }

            .premium-user-badge {
                display: inline-flex;
                align-items: center;
                padding: 5px 15px;
                background: var(--gradient-1);
                color: white;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                margin-left: 10px;
            }

            @media (max-width: 768px) {
                .plans-comparison {
                    grid-template-columns: 1fr;
                }
                
                .premium-modal-content {
                    padding: 20px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// エクスポート
window.PremiumFeatures = PremiumFeatures;
const premiumFeatures = new PremiumFeatures();