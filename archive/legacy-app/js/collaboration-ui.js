// コラボレーション機能のUIクラス
class CollaborationUI {
    constructor(collaborationManager, memoryArchive) {
        this.collaborationManager = collaborationManager;
        this.memoryArchive = memoryArchive;
    }

    // 共有モーダルの表示
    showShareModal(memoryId) {
        const memory = this.memoryArchive.memories.find(m => m.id === memoryId);
        if (!memory) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="share-modal modal-content">
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
                <h2>記憶を共有</h2>
                
                <div class="share-memory-preview">
                    <div class="memory-date">${this.memoryArchive.formatDate(memory.date)}</div>
                    <div class="memory-content">${this.memoryArchive.escapeHtml(memory.content.substring(0, 100))}...</div>
                </div>

                <div class="share-options">
                    <label class="share-option">
                        <input type="radio" name="shareType" value="link" checked>
                        <div class="option-content">
                            <span class="option-icon">🔗</span>
                            <div>
                                <strong>リンクで共有</strong>
                                <p>URLを知っている人が閲覧できます</p>
                            </div>
                        </div>
                    </label>
                    
                    <label class="share-option">
                        <input type="radio" name="shareType" value="album">
                        <div class="option-content">
                            <span class="option-icon">📚</span>
                            <div>
                                <strong>家族アルバムに追加</strong>
                                <p>アルバムメンバーと共有します</p>
                            </div>
                        </div>
                    </label>
                </div>

                <div class="share-permissions">
                    <h3>アクセス権限</h3>
                    <label class="checkbox-label">
                        <input type="checkbox" id="allowComments" checked>
                        <span>コメントを許可</span>
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="allowDownload">
                        <span>ダウンロードを許可</span>
                    </label>
                </div>

                <div id="shareResult" style="display: none;">
                    <div class="share-link-container">
                        <input type="text" id="shareLink" readonly>
                        <button class="btn btn-primary" onclick="collaborationUI.copyShareLink()">コピー</button>
                    </div>
                </div>

                <button class="btn btn-primary" onclick="collaborationUI.executeShare(${memoryId})">
                    共有する
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // 共有の実行
    executeShare(memoryId) {
        const shareType = document.querySelector('input[name="shareType"]:checked').value;
        
        if (shareType === 'link') {
            // リンク共有の実装
            const shareLink = `${window.location.origin}/memory/${memoryId}`;
            document.getElementById('shareLink').value = shareLink;
            document.getElementById('shareResult').style.display = 'block';
            
            this.memoryArchive.showNotification('共有リンクを生成しました', 'success');
        } else if (shareType === 'album') {
            // アルバム選択画面を表示
            this.showAlbumSelector(memoryId);
        }
    }

    // 共有リンクのコピー
    copyShareLink() {
        const shareLink = document.getElementById('shareLink');
        shareLink.select();
        document.execCommand('copy');
        this.memoryArchive.showNotification('リンクをコピーしました', 'success');
    }

    // アルバム選択画面
    showAlbumSelector(memoryId) {
        const albums = this.collaborationManager.getUserAlbums();
        const albumList = albums.map(album => `
            <div class="album-option" onclick="collaborationUI.addToAlbum('${memoryId}', '${album.id}')">
                <span>📚</span>
                <span>${album.name}</span>
            </div>
        `).join('');

        const selector = document.createElement('div');
        selector.className = 'album-selector';
        selector.innerHTML = `
            <h3>アルバムを選択</h3>
            ${albumList || '<p>アルバムがありません</p>'}
        `;

        document.querySelector('.share-modal').appendChild(selector);
    }

    // アルバムに追加
    addToAlbum(memoryId, albumId) {
        if (this.collaborationManager.addMemoryToAlbum(albumId, memoryId)) {
            this.memoryArchive.showNotification('アルバムに追加しました', 'success');
            document.querySelector('.modal-overlay').remove();
        }
    }

    // コメントモーダルの表示
    showCommentModal(memoryId) {
        const memory = this.memoryArchive.memories.find(m => m.id === memoryId);
        if (!memory) return;

        const comments = this.collaborationManager.getCommentsForMemory(memoryId);
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="comment-modal modal-content">
                <span class="close" onclick="this.closest('.modal-overlay').remove()">&times;</span>
                <h2>コメント</h2>
                
                <div class="comment-memory-preview">
                    <div class="memory-date">${this.memoryArchive.formatDate(memory.date)}</div>
                    <div class="memory-content">${this.memoryArchive.escapeHtml(memory.content.substring(0, 100))}...</div>
                </div>

                <div class="comments-container">
                    ${this.renderComments(comments)}
                </div>

                <form class="comment-form" onsubmit="collaborationUI.addComment(event, ${memoryId})">
                    <textarea placeholder="コメントを入力..." required></textarea>
                    <button type="submit" class="btn btn-primary">投稿</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // コメントのレンダリング
    renderComments(comments) {
        if (comments.length === 0) {
            return '<div class="no-comments">まだコメントがありません</div>';
        }

        return comments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <strong>${comment.userName}</strong>
                    <span class="comment-date">${this.formatCommentDate(comment.createdAt)}</span>
                </div>
                <div class="comment-text">${this.memoryArchive.escapeHtml(comment.text)}</div>
                <div class="comment-actions">
                    <button class="icon-btn" onclick="collaborationUI.toggleLike('${comment.id}')">
                        ${comment.likes.includes(this.collaborationManager.getCurrentUserId()) ? '❤️' : '🤍'} 
                        ${comment.likes.length}
                    </button>
                </div>
            </div>
        `).join('');
    }

    // コメントの追加
    addComment(event, memoryId) {
        event.preventDefault();
        const textarea = event.target.querySelector('textarea');
        const text = textarea.value.trim();
        
        if (text) {
            this.collaborationManager.addComment(memoryId, text);
            textarea.value = '';
            
            // コメント一覧を更新
            const comments = this.collaborationManager.getCommentsForMemory(memoryId);
            document.querySelector('.comments-container').innerHTML = this.renderComments(comments);
            
            this.memoryArchive.showNotification('コメントを投稿しました', 'success');
        }
    }

    // いいねの切り替え
    toggleLike(commentId) {
        this.collaborationManager.toggleLike(commentId);
        // 画面を更新
        const modal = document.querySelector('.comment-modal');
        if (modal) {
            const memoryId = modal.querySelector('form').getAttribute('onsubmit').match(/\d+/)[0];
            const comments = this.collaborationManager.getCommentsForMemory(memoryId);
            document.querySelector('.comments-container').innerHTML = this.renderComments(comments);
        }
    }

    // コメント日時のフォーマット
    formatCommentDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'たった今';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}日前`;
        
        return date.toLocaleDateString('ja-JP');
    }

    // 家族アルバムの表示を更新
    updateFamilyAlbumsDisplay() {
        // この機能は必要に応じて実装
        console.log('Family albums updated');
    }
}

// グローバルに公開
window.CollaborationUI = CollaborationUI;