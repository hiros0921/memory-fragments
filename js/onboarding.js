/**
 * Onboarding System
 * 新規ユーザー向けの3ステップウェルカムオーバーレイ
 */
(function() {
    'use strict';

    const STORAGE_PREFIX = 'mf_onboarding_done_';

    function isCompleted(uid) {
        return localStorage.getItem(STORAGE_PREFIX + uid) === '1';
    }

    function markCompleted(uid) {
        localStorage.setItem(STORAGE_PREFIX + uid, '1');
    }

    /**
     * オンボーディングを開始する
     * @param {Object} options
     * @param {string} options.uid - ユーザーUID
     * @param {string} options.displayName - 表示名
     */
    function start(options) {
        const { uid, displayName } = options;

        if (isCompleted(uid)) return;

        injectStyles();

        const name = displayName || 'ゲスト';
        let currentStep = 0;

        const steps = [
            {
                title: `ようこそ、${escapeHTML(name)}さん！`,
                body: `
                    <div class="onb-welcome-icon">🌟</div>
                    <p class="onb-welcome-text">
                        Memory Fragmentsへようこそ。<br>
                        あなたの大切な思い出を、美しく記録・保存できるアプリです。
                    </p>
                    <div class="onb-features">
                        <div class="onb-feature-item">
                            <span class="onb-feature-icon">📸</span>
                            <span>写真と一緒に記憶を保存</span>
                        </div>
                        <div class="onb-feature-item">
                            <span class="onb-feature-icon">🏷️</span>
                            <span>タグやカテゴリーで整理</span>
                        </div>
                        <div class="onb-feature-item">
                            <span class="onb-feature-icon">🔍</span>
                            <span>いつでも簡単に振り返り</span>
                        </div>
                    </div>
                `
            },
            {
                title: '記憶の記録方法',
                body: `
                    <div class="onb-form-guide">
                        <div class="onb-guide-step">
                            <div class="onb-guide-num">1</div>
                            <div>
                                <strong>タイトル</strong>
                                <p>思い出に名前をつけましょう</p>
                            </div>
                        </div>
                        <div class="onb-guide-step">
                            <div class="onb-guide-num">2</div>
                            <div>
                                <strong>内容</strong>
                                <p>その時の気持ちや出来事を自由に書きましょう</p>
                            </div>
                        </div>
                        <div class="onb-guide-step">
                            <div class="onb-guide-num">3</div>
                            <div>
                                <strong>カテゴリー・タグ</strong>
                                <p>「旅行」「家族」などで分類できます</p>
                            </div>
                        </div>
                        <div class="onb-guide-step">
                            <div class="onb-guide-num">4</div>
                            <div>
                                <strong>写真</strong>
                                <p>お気に入りの写真を添えて保存（任意）</p>
                            </div>
                        </div>
                    </div>
                `
            },
            {
                title: '最初の記憶を記録しましょう！',
                body: `
                    <div class="onb-cta-section">
                        <div class="onb-cta-icon">✨</div>
                        <p class="onb-cta-text">
                            準備ができました！<br>
                            上のフォームから、最初の思い出を記録してみましょう。
                        </p>
                        <p class="onb-cta-sub">
                            無料プランでは最大50件まで保存できます
                        </p>
                    </div>
                `
            }
        ];

        // オーバーレイ作成
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.className = 'onb-overlay';

        function render() {
            const step = steps[currentStep];
            const isFirst = currentStep === 0;
            const isLast = currentStep === steps.length - 1;

            overlay.innerHTML = `
                <div class="onb-card" role="dialog" aria-modal="true" aria-label="ウェルカムガイド">
                    <div class="onb-progress">
                        ${steps.map(function(_, i) {
                            return '<div class="onb-dot ' + (i <= currentStep ? 'onb-dot--active' : '') + '"></div>';
                        }).join('')}
                    </div>
                    <h2 class="onb-title">${step.title}</h2>
                    <div class="onb-body">${step.body}</div>
                    <div class="onb-actions">
                        ${!isFirst ? '<button class="onb-btn onb-btn--secondary" data-action="prev">戻る</button>' : ''}
                        ${isLast
                            ? '<button class="onb-btn onb-btn--primary" data-action="finish">始める！</button>'
                            : '<button class="onb-btn onb-btn--primary" data-action="next">次へ</button>'
                        }
                    </div>
                    <button class="onb-skip" data-action="skip">スキップ</button>
                </div>
            `;

            // イベント
            overlay.querySelectorAll('[data-action]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var action = this.getAttribute('data-action');
                    if (action === 'next') {
                        currentStep++;
                        render();
                    } else if (action === 'prev') {
                        currentStep--;
                        render();
                    } else if (action === 'finish' || action === 'skip') {
                        close();
                    }
                });
            });
        }

        function close() {
            markCompleted(uid);
            overlay.classList.add('onb-overlay--hiding');
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 300);
        }

        document.body.appendChild(overlay);
        requestAnimationFrame(function() {
            overlay.classList.add('onb-overlay--visible');
            render();
        });
    }

    function injectStyles() {
        if (document.getElementById('onboarding-styles')) return;
        const style = document.createElement('style');
        style.id = 'onboarding-styles';
        style.textContent = `
            .onb-overlay {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                opacity: 0;
                transition: opacity 0.3s ease;
                padding: 20px;
            }

            .onb-overlay--visible {
                opacity: 1;
            }

            .onb-overlay--hiding {
                opacity: 0;
            }

            .onb-card {
                background: rgba(30, 20, 60, 0.92);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 24px;
                padding: 40px 36px 32px;
                max-width: 480px;
                width: 100%;
                text-align: center;
                box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
                animation: onb-slideUp 0.4s cubic-bezier(0.21, 1.02, 0.73, 1);
            }

            @keyframes onb-slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .onb-progress {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-bottom: 28px;
            }

            .onb-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                transition: background 0.3s, transform 0.3s;
            }

            .onb-dot--active {
                background: #a855f7;
                transform: scale(1.2);
            }

            .onb-title {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 20px;
                background: linear-gradient(135deg, #a855f7, #6366f1);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .onb-body {
                margin-bottom: 28px;
                color: rgba(255, 255, 255, 0.85);
                line-height: 1.7;
            }

            .onb-welcome-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            .onb-welcome-text {
                font-size: 15px;
                margin-bottom: 24px;
            }

            .onb-features {
                display: flex;
                flex-direction: column;
                gap: 12px;
                text-align: left;
            }

            .onb-feature-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 14px;
                background: rgba(255, 255, 255, 0.06);
                border-radius: 12px;
                font-size: 14px;
            }

            .onb-feature-icon {
                font-size: 20px;
                flex-shrink: 0;
            }

            .onb-form-guide {
                display: flex;
                flex-direction: column;
                gap: 14px;
                text-align: left;
            }

            .onb-guide-step {
                display: flex;
                gap: 14px;
                align-items: flex-start;
            }

            .onb-guide-num {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, #a855f7, #6366f1);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 14px;
                flex-shrink: 0;
            }

            .onb-guide-step strong {
                display: block;
                margin-bottom: 2px;
                color: #fff;
            }

            .onb-guide-step p {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.6);
                margin: 0;
            }

            .onb-cta-section {
                padding: 10px 0;
            }

            .onb-cta-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            .onb-cta-text {
                font-size: 16px;
                margin-bottom: 12px;
            }

            .onb-cta-sub {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.5);
            }

            .onb-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
                margin-bottom: 16px;
            }

            .onb-btn {
                padding: 12px 32px;
                border-radius: 12px;
                font-size: 15px;
                font-weight: 600;
                border: none;
                cursor: pointer;
                transition: all 0.2s;
            }

            .onb-btn--primary {
                background: linear-gradient(135deg, #a855f7, #6366f1);
                color: #fff;
            }

            .onb-btn--primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(168, 85, 247, 0.4);
            }

            .onb-btn--secondary {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .onb-btn--secondary:hover {
                background: rgba(255, 255, 255, 0.15);
            }

            .onb-skip {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.4);
                font-size: 13px;
                cursor: pointer;
                transition: color 0.2s;
            }

            .onb-skip:hover {
                color: rgba(255, 255, 255, 0.7);
            }

            @media (max-width: 480px) {
                .onb-card {
                    padding: 28px 20px 24px;
                }

                .onb-title {
                    font-size: 20px;
                }

                .onb-btn {
                    padding: 10px 24px;
                    font-size: 14px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    window.Onboarding = {
        start: start,
        isCompleted: isCompleted
    };
})();
