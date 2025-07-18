// 無料版から有料版への移行を促すフック
class UpgradeHooks {
    constructor() {
        this.hooks = {
            // 容量制限に近づいた時
            nearLimit: {
                threshold: 40, // 40件以上で警告
                message: 'あと{remaining}件で無料プランの上限です',
                action: 'upgrade_prompt'
            },
            // 特定の機能を使おうとした時
            premiumFeatures: {
                cloudBackup: '☁️ クラウドバックアップはプレミアム機能です',
                advancedAnalytics: '📊 詳細分析はプレミアム機能です',
                exportAll: '📥 全データエクスポートはプレミアム機能です',
                multiDevice: '📱 複数デバイス同期はプレミアム機能です'
            },
            // 定期的なリマインダー
            periodicReminder: {
                interval: 7, // 7日ごと
                lastShown: null
            }
        };
    }

    // 保存時のチェック
    checkSaveLimit(currentCount, limit) {
        const remaining = limit - currentCount;
        
        if (remaining <= 10 && remaining > 0) {
            return {
                showUpgrade: true,
                message: `残り${remaining}件です。無制限に保存するにはプレミアムプランへ`,
                urgency: remaining <= 5 ? 'high' : 'medium'
            };
        }
        
        return { showUpgrade: false };
    }

    // プレミアム機能アクセス時
    checkPremiumFeature(feature) {
        if (this.hooks.premiumFeatures[feature]) {
            return {
                blocked: true,
                message: this.hooks.premiumFeatures[feature],
                feature: feature
            };
        }
        return { blocked: false };
    }

    // 定期的なアップグレード提案
    checkPeriodicReminder() {
        const lastShown = localStorage.getItem('lastUpgradeReminder');
        if (!lastShown) {
            localStorage.setItem('lastUpgradeReminder', new Date().toISOString());
            return { show: false };
        }

        const daysSinceLastShown = Math.floor(
            (new Date() - new Date(lastShown)) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastShown >= this.hooks.periodicReminder.interval) {
            localStorage.setItem('lastUpgradeReminder', new Date().toISOString());
            return {
                show: true,
                message: 'プレミアムプランで、より豊かな記憶の管理を'
            };
        }

        return { show: false };
    }

    // アップグレードの利点を表示
    showUpgradeBenefits(context) {
        const benefits = {
            limit_reached: {
                title: '保存容量が上限に達しました',
                benefits: [
                    '✅ 無制限の記憶保存',
                    '✅ 写真・動画の無制限アップロード',
                    '✅ すべてのデバイスで同期'
                ],
                cta: '今すぐ無制限にする'
            },
            feature_blocked: {
                title: 'プレミアム機能です',
                benefits: [
                    '✅ クラウド自動バックアップ',
                    '✅ AI感情分析レポート',
                    '✅ 高度な検索・フィルター'
                ],
                cta: 'すべての機能を解放'
            },
            periodic: {
                title: 'Memory Fragmentsをもっと活用',
                benefits: [
                    '✅ 大切な記憶を永久保存',
                    '✅ 家族や友人と共有',
                    '✅ プレミアムサポート'
                ],
                cta: '7日間無料で試す'
            }
        };

        return benefits[context] || benefits.periodic;
    }

    // スマートなアップセル表示
    createUpgradePrompt(context, onUpgrade) {
        const benefits = this.showUpgradeBenefits(context);
        
        const prompt = document.createElement('div');
        prompt.className = 'upgrade-prompt';
        prompt.innerHTML = `
            <div class="upgrade-prompt-content">
                <button class="close-prompt" onclick="this.parentElement.parentElement.remove()">×</button>
                <h3>${benefits.title}</h3>
                <ul class="benefits-list">
                    ${benefits.benefits.map(b => `<li>${b}</li>`).join('')}
                </ul>
                <div class="price-info">
                    <span class="price">¥500</span>
                    <span class="period">/月</span>
                </div>
                <button class="upgrade-cta" onclick="${onUpgrade}">
                    ${benefits.cta}
                </button>
                <p class="trial-info">初回7日間無料トライアル</p>
            </div>
        `;

        // スタイルを追加
        this.addPromptStyles();

        return prompt;
    }

    // プロンプトのスタイル
    addPromptStyles() {
        if (document.getElementById('upgrade-prompt-styles')) return;

        const style = document.createElement('style');
        style.id = 'upgrade-prompt-styles';
        style.innerHTML = `
            .upgrade-prompt {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: var(--surface);
                border: 2px solid var(--primary);
                border-radius: 16px;
                padding: 24px;
                max-width: 320px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                animation: slideInUp 0.5s ease-out;
            }

            @keyframes slideInUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .upgrade-prompt-content {
                position: relative;
            }

            .close-prompt {
                position: absolute;
                top: -20px;
                right: -20px;
                background: rgba(0, 0, 0, 0.5);
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                transition: all 0.3s;
            }

            .close-prompt:hover {
                background: rgba(0, 0, 0, 0.7);
                transform: rotate(90deg);
            }

            .upgrade-prompt h3 {
                font-size: 20px;
                margin-bottom: 16px;
                color: var(--text-primary);
            }

            .benefits-list {
                list-style: none;
                margin-bottom: 20px;
            }

            .benefits-list li {
                padding: 8px 0;
                color: var(--text-secondary);
                font-size: 14px;
            }

            .price-info {
                text-align: center;
                margin-bottom: 16px;
            }

            .price {
                font-size: 36px;
                font-weight: bold;
                color: var(--primary);
            }

            .period {
                font-size: 16px;
                color: var(--text-secondary);
            }

            .upgrade-cta {
                width: 100%;
                padding: 14px;
                background: var(--gradient-1);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }

            .upgrade-cta:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(99, 102, 241, 0.4);
            }

            .trial-info {
                text-align: center;
                font-size: 12px;
                color: var(--text-secondary);
                margin-top: 8px;
            }

            @media (max-width: 768px) {
                .upgrade-prompt {
                    left: 20px;
                    right: 20px;
                    max-width: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // 使用状況に基づくスマートな提案
    getSmartSuggestion(stats) {
        const suggestions = [];

        // 容量に基づく提案
        if (stats.percentage >= 80) {
            suggestions.push({
                type: 'capacity',
                message: '容量がもうすぐいっぱいです',
                action: 'プレミアムで無制限に'
            });
        }

        // 使用頻度に基づく提案
        if (stats.currentCount >= 20) {
            suggestions.push({
                type: 'active_user',
                message: 'たくさんの記憶を保存されていますね',
                action: 'プレミアムでもっと便利に'
            });
        }

        // 画像が多い場合
        const imagesCount = stats.memories?.filter(m => m.image).length || 0;
        if (imagesCount >= 10) {
            suggestions.push({
                type: 'photo_user',
                message: '写真付きの記憶が多いですね',
                action: 'クラウドバックアップで安心保存'
            });
        }

        return suggestions;
    }
}

// グローバルに公開
window.UpgradeHooks = UpgradeHooks;