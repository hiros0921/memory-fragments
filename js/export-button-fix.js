// エクスポートボタンの表示を確実にするスクリプト
(function() {
    'use strict';
    
    // エクスポートボタンの表示を確認する関数
    function ensureExportButtonVisible() {
        console.log('[ExportButtonFix] チェック開始');
        
        const exportButtons = document.querySelectorAll('.export-btn');
        exportButtons.forEach((btn, index) => {
            // スタイルを強制的に設定
            btn.style.cssText = 'display: flex !important; visibility: visible !important; opacity: 1 !important;';
            console.log(`[ExportButtonFix] ボタン${index + 1}のスタイルを設定`);
        });

        // actionButtonsコンテナも確認
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            actionButtons.style.display = 'flex';
            console.log('[ExportButtonFix] action-buttonsコンテナの表示を確認');
        }
    }

    // ページ読み込み後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureExportButtonVisible);
    } else {
        ensureExportButtonVisible();
    }

    // 定期的にチェック（動的に要素が追加される場合に対応）
    let checkCount = 0;
    const checkInterval = setInterval(() => {
        ensureExportButtonVisible();
        checkCount++;
        
        // 10回チェックしたら停止（10秒間）
        if (checkCount >= 10) {
            clearInterval(checkInterval);
            console.log('[ExportButtonFix] 定期チェック終了');
        }
    }, 1000);

    // MutationObserverで動的な変更を監視
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const addedNodes = Array.from(mutation.addedNodes);
                const hasExportButton = addedNodes.some(node => 
                    node.nodeType === 1 && (
                        node.classList?.contains('export-btn') ||
                        node.querySelector?.('.export-btn')
                    )
                );
                
                if (hasExportButton) {
                    console.log('[ExportButtonFix] 新しいエクスポートボタンを検出');
                    ensureExportButtonVisible();
                }
            }
        });
    });

    // body要素の監視を開始
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        console.log('[ExportButtonFix] MutationObserver開始');
    }
})();