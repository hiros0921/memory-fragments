/**
 * Toast Notification System
 * グラスモーフィズムデザインのトースト通知コンポーネント
 */
(function() {
    'use strict';

    // トーストコンテナを作成
    let container = null;

    function getContainer() {
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'false');
            document.body.appendChild(container);

            // スタイルを注入
            const style = document.createElement('style');
            style.textContent = `
                #toast-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 400px;
                    pointer-events: none;
                }

                @media (max-width: 480px) {
                    #toast-container {
                        top: 10px;
                        right: 10px;
                        left: 10px;
                        max-width: none;
                    }
                }

                .toast {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 14px 18px;
                    border-radius: 14px;
                    background: rgba(30, 20, 60, 0.85);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                    color: #fff;
                    font-size: 14px;
                    line-height: 1.5;
                    pointer-events: auto;
                    transform: translateX(120%);
                    opacity: 0;
                    transition: transform 0.35s cubic-bezier(0.21, 1.02, 0.73, 1),
                                opacity 0.35s ease;
                    cursor: pointer;
                    max-width: 100%;
                    word-break: break-word;
                }

                .toast.toast--visible {
                    transform: translateX(0);
                    opacity: 1;
                }

                .toast.toast--hiding {
                    transform: translateX(120%);
                    opacity: 0;
                }

                .toast__icon {
                    font-size: 20px;
                    flex-shrink: 0;
                    margin-top: 1px;
                }

                .toast__body {
                    flex: 1;
                    min-width: 0;
                }

                .toast__title {
                    font-weight: 600;
                    margin-bottom: 2px;
                }

                .toast__message {
                    color: rgba(255, 255, 255, 0.8);
                }

                .toast__close {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    flex-shrink: 0;
                    transition: color 0.2s;
                }

                .toast__close:hover {
                    color: #fff;
                }

                .toast__progress {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    height: 3px;
                    border-radius: 0 0 14px 14px;
                    transition: width linear;
                }

                /* Type variants */
                .toast--success {
                    border-color: rgba(16, 185, 129, 0.3);
                }
                .toast--success .toast__progress {
                    background: #10b981;
                }

                .toast--error {
                    border-color: rgba(239, 68, 68, 0.3);
                }
                .toast--error .toast__progress {
                    background: #ef4444;
                }

                .toast--warning {
                    border-color: rgba(245, 158, 11, 0.3);
                }
                .toast--warning .toast__progress {
                    background: #f59e0b;
                }

                .toast--info {
                    border-color: rgba(99, 102, 241, 0.3);
                }
                .toast--info .toast__progress {
                    background: #6366f1;
                }
            `;
            document.head.appendChild(style);
        }
        return container;
    }

    const ICONS = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    const DEFAULTS = {
        type: 'info',
        duration: 4000,
        title: '',
        dismissible: true
    };

    /**
     * トーストを表示する
     * @param {string} message - メッセージ
     * @param {Object} options - オプション
     * @param {string} options.type - 'success' | 'error' | 'warning' | 'info'
     * @param {number} options.duration - 自動消去までのミリ秒 (0で無限)
     * @param {string} options.title - タイトル（オプション）
     * @param {boolean} options.dismissible - クリックで閉じるか
     */
    function showToast(message, options = {}) {
        const opts = Object.assign({}, DEFAULTS, options);
        const cntr = getContainer();

        const el = document.createElement('div');
        el.className = `toast toast--${opts.type}`;
        el.setAttribute('role', 'alert');
        el.style.position = 'relative';
        el.style.overflow = 'hidden';

        let html = `<span class="toast__icon">${ICONS[opts.type] || ICONS.info}</span>`;
        html += '<div class="toast__body">';
        if (opts.title) {
            html += `<div class="toast__title">${escapeHTML(opts.title)}</div>`;
        }
        html += `<div class="toast__message">${escapeHTML(message)}</div>`;
        html += '</div>';

        if (opts.dismissible) {
            html += '<button class="toast__close" aria-label="閉じる">&times;</button>';
        }

        if (opts.duration > 0) {
            html += `<div class="toast__progress" style="width: 100%;"></div>`;
        }

        el.innerHTML = html;

        // 閉じるボタン
        const closeBtn = el.querySelector('.toast__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                dismiss(el);
            });
        }

        // クリックで閉じる
        if (opts.dismissible) {
            el.addEventListener('click', function() {
                dismiss(el);
            });
        }

        // コンテナに追加
        cntr.appendChild(el);

        // スタック制限（最大5件）
        const toasts = cntr.querySelectorAll('.toast');
        if (toasts.length > 5) {
            dismiss(toasts[0]);
        }

        // アニメーション開始
        requestAnimationFrame(function() {
            el.classList.add('toast--visible');
        });

        // プログレスバー & 自動消去
        if (opts.duration > 0) {
            const progress = el.querySelector('.toast__progress');
            if (progress) {
                progress.style.transitionDuration = opts.duration + 'ms';
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() {
                        progress.style.width = '0%';
                    });
                });
            }

            el._timeout = setTimeout(function() {
                dismiss(el);
            }, opts.duration);
        }

        return el;
    }

    function dismiss(el) {
        if (!el || el._dismissed) return;
        el._dismissed = true;

        if (el._timeout) clearTimeout(el._timeout);

        el.classList.remove('toast--visible');
        el.classList.add('toast--hiding');

        el.addEventListener('transitionend', function() {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, { once: true });

        // フォールバック（transitionendが発火しない場合）
        setTimeout(function() {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 500);
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // 便利メソッド
    window.Toast = {
        show: showToast,
        success: function(message, options) {
            return showToast(message, Object.assign({}, options, { type: 'success' }));
        },
        error: function(message, options) {
            return showToast(message, Object.assign({}, options, { type: 'error' }));
        },
        warning: function(message, options) {
            return showToast(message, Object.assign({}, options, { type: 'warning' }));
        },
        info: function(message, options) {
            return showToast(message, Object.assign({}, options, { type: 'info' }));
        }
    };
})();
