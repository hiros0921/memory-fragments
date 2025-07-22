// エクスポート機能管理クラス
class ExportManager {
    constructor() {
        this.memoryArchive = null;
        this.collaborationManager = null;
    }

    // 初期化
    init(memoryArchive, collaborationManager) {
        this.memoryArchive = memoryArchive;
        this.collaborationManager = collaborationManager;
        console.log('[ExportManager] 初期化完了');
    }

    // エクスポートモーダルの表示
    showExportModal(memories) {
        if (!memories || memories.length === 0) {
            this.memoryArchive.showNotification('エクスポートする記憶がありません', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="export-modal">
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
                <h2>記憶をエクスポート</h2>
                
                <div class="export-options">
                    <div class="export-option" onclick="window.exportManager.exportAsJSON()">
                        <span class="export-icon">📄</span>
                        <h3>JSON形式</h3>
                        <p>すべてのデータを含む完全なバックアップ</p>
                    </div>
                    
                    <div class="export-option" onclick="window.exportManager.exportAsCSV()">
                        <span class="export-icon">📊</span>
                        <h3>CSV形式</h3>
                        <p>表計算ソフトで開ける形式</p>
                    </div>
                    
                    <div class="export-option" onclick="window.exportManager.exportAsPDF()">
                        <span class="export-icon">📑</span>
                        <h3>PDF形式</h3>
                        <p>印刷用の美しいレイアウト</p>
                    </div>
                    
                    <div class="export-option" onclick="window.exportManager.exportAsMarkdown()">
                        <span class="export-icon">📝</span>
                        <h3>Markdown形式</h3>
                        <p>テキストエディタで編集可能</p>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <p style="color: #a0a0c0;">エクスポート件数: ${memories.length}件</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // JSON形式でエクスポート
    exportAsJSON() {
        const data = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            memories: this.memoryArchive.memories,
            albums: this.collaborationManager ? this.collaborationManager.getUserAlbums() : [],
            totalCount: this.memoryArchive.memories.length
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `memories_${this.getDateString()}.json`);
        this.closeModal();
    }

    // CSV形式でエクスポート
    exportAsCSV() {
        const headers = ['ID', '日付', 'カテゴリー', '内容', '感情', '画像', '作成日時'];
        const rows = [headers];

        this.memoryArchive.memories.forEach(memory => {
            rows.push([
                memory.id,
                memory.date,
                memory.category,
                `"${memory.content.replace(/"/g, '""')}"`,
                memory.emotion ? memory.emotion.analysis : '',
                memory.image ? 'あり' : 'なし',
                memory.timestamp || ''
            ]);
        });

        const csv = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        this.downloadFile(blob, `memories_${this.getDateString()}.csv`);
        this.closeModal();
    }

    // PDF形式でエクスポート（簡易実装）
    exportAsPDF() {
        // 簡易的なHTML to PDFの実装
        const printWindow = window.open('', '_blank');
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Memory Fragments Export</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    h1 { color: #6366f1; }
                    .memory { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; }
                    .date { color: #666; font-size: 0.9em; }
                    .category { background: #6366f1; color: white; padding: 2px 8px; border-radius: 4px; display: inline-block; }
                    .content { margin: 10px 0; }
                    .emotion { color: #888; }
                    @media print {
                        .memory { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <h1>Memory Fragments - ${new Date().toLocaleDateString('ja-JP')}</h1>
                ${this.memoryArchive.memories.map(memory => `
                    <div class="memory">
                        <div class="date">${this.memoryArchive.formatDate(memory.date)}</div>
                        <span class="category">${memory.category}</span>
                        <div class="content">${this.escapeHtml(memory.content)}</div>
                        ${memory.emotion ? `<div class="emotion">${memory.emotion.analysis}</div>` : ''}
                    </div>
                `).join('')}
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            this.closeModal();
        }, 500);
    }

    // Markdown形式でエクスポート
    exportAsMarkdown() {
        let markdown = `# Memory Fragments\n\n`;
        markdown += `エクスポート日: ${new Date().toLocaleDateString('ja-JP')}\n\n`;
        markdown += `総記憶数: ${this.memoryArchive.memories.length}\n\n`;
        markdown += `---\n\n`;

        // カテゴリー別にグループ化
        const grouped = {};
        this.memoryArchive.memories.forEach(memory => {
            if (!grouped[memory.category]) {
                grouped[memory.category] = [];
            }
            grouped[memory.category].push(memory);
        });

        Object.entries(grouped).forEach(([category, memories]) => {
            markdown += `## ${category}\n\n`;
            
            memories.forEach(memory => {
                markdown += `### ${this.memoryArchive.formatDate(memory.date)}\n\n`;
                markdown += `${memory.content}\n\n`;
                if (memory.emotion) {
                    markdown += `*感情: ${memory.emotion.analysis}*\n\n`;
                }
                if (memory.image) {
                    markdown += `![画像](画像あり)\n\n`;
                }
                markdown += `---\n\n`;
            });
        });

        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        this.downloadFile(blob, `memories_${this.getDateString()}.md`);
        this.closeModal();
    }

    // ファイルダウンロード
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        if (this.memoryArchive) {
            this.memoryArchive.showNotification('エクスポートが完了しました', 'success');
        }
    }

    // 日付文字列の取得
    getDateString() {
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    }

    // HTMLエスケープ
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // モーダルを閉じる
    closeModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }
}

// グローバルに公開
window.ExportManager = ExportManager;