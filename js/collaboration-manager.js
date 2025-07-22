// コラボレーション機能管理クラス
class CollaborationManager {
    constructor() {
        this.familyAlbums = this.loadFamilyAlbums();
        this.sharedMemories = this.loadSharedMemories();
        this.comments = this.loadComments();
    }

    // 家族アルバムの作成
    createFamilyAlbum(albumData) {
        const album = {
            id: Date.now().toString(),
            name: albumData.name,
            description: albumData.description || '',
            createdAt: new Date().toISOString(),
            createdBy: this.getCurrentUserId(),
            members: [this.getCurrentUserId()],
            memories: [],
            inviteCode: this.generateInviteCode()
        };

        this.familyAlbums.push(album);
        this.saveFamilyAlbums();
        return album;
    }

    // 招待コードの生成
    generateInviteCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // アルバムへの参加
    joinAlbumWithCode(inviteCode) {
        const album = this.familyAlbums.find(a => a.inviteCode === inviteCode);
        if (album && !album.members.includes(this.getCurrentUserId())) {
            album.members.push(this.getCurrentUserId());
            this.saveFamilyAlbums();
            return { success: true, album };
        }
        return { success: false, error: '無効な招待コードです' };
    }

    // 記憶をアルバムに追加
    addMemoryToAlbum(albumId, memoryId) {
        const album = this.familyAlbums.find(a => a.id === albumId);
        if (album && !album.memories.includes(memoryId)) {
            album.memories.push(memoryId);
            this.saveFamilyAlbums();
            
            // 共有記憶として記録
            this.shareMemory(memoryId, albumId, 'album');
            return true;
        }
        return false;
    }

    // 記憶の共有
    shareMemory(memoryId, targetId, type = 'direct') {
        const sharedMemory = {
            id: Date.now().toString(),
            memoryId: memoryId,
            sharedBy: this.getCurrentUserId(),
            sharedWith: targetId,
            shareType: type,
            permissions: {
                canComment: true,
                canDownload: false,
                canEdit: false
            },
            sharedAt: new Date().toISOString()
        };

        this.sharedMemories.push(sharedMemory);
        this.saveSharedMemories();
        return sharedMemory;
    }

    // コメントの追加
    addComment(memoryId, commentText) {
        const comment = {
            id: Date.now().toString(),
            memoryId: memoryId,
            userId: this.getCurrentUserId(),
            userName: this.getCurrentUserName(),
            text: commentText,
            createdAt: new Date().toISOString(),
            likes: []
        };

        this.comments.push(comment);
        this.saveComments();
        return comment;
    }

    // コメントの取得
    getCommentsForMemory(memoryId) {
        return this.comments
            .filter(c => c.memoryId === memoryId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // いいねの追加/削除
    toggleLike(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
            const userId = this.getCurrentUserId();
            const likeIndex = comment.likes.indexOf(userId);
            
            if (likeIndex > -1) {
                comment.likes.splice(likeIndex, 1);
            } else {
                comment.likes.push(userId);
            }
            
            this.saveComments();
            return true;
        }
        return false;
    }

    // アルバムの取得
    getUserAlbums() {
        const userId = this.getCurrentUserId();
        return this.familyAlbums.filter(album => 
            album.members.includes(userId)
        );
    }

    // 共有された記憶の取得
    getSharedMemories() {
        const userId = this.getCurrentUserId();
        return this.sharedMemories.filter(share => 
            share.sharedWith === userId || 
            this.isInSameAlbum(share.memoryId, userId)
        );
    }

    // 同じアルバムにいるかチェック
    isInSameAlbum(memoryId, userId) {
        return this.familyAlbums.some(album => 
            album.members.includes(userId) && 
            album.memories.includes(memoryId)
        );
    }

    // 現在のユーザーID取得（デモ用）
    getCurrentUserId() {
        // 実際の実装ではAuthManagerから取得
        return localStorage.getItem('currentUserId') || 'demo-user';
    }

    // 現在のユーザー名取得（デモ用）
    getCurrentUserName() {
        // 実際の実装ではAuthManagerから取得
        return localStorage.getItem('currentUserName') || 'デモユーザー';
    }

    // データの保存と読み込み
    saveFamilyAlbums() {
        localStorage.setItem('familyAlbums', JSON.stringify(this.familyAlbums));
    }

    loadFamilyAlbums() {
        const data = localStorage.getItem('familyAlbums');
        return data ? JSON.parse(data) : [];
    }

    saveSharedMemories() {
        localStorage.setItem('sharedMemories', JSON.stringify(this.sharedMemories));
    }

    loadSharedMemories() {
        const data = localStorage.getItem('sharedMemories');
        return data ? JSON.parse(data) : [];
    }

    saveComments() {
        localStorage.setItem('memoryComments', JSON.stringify(this.comments));
    }

    loadComments() {
        const data = localStorage.getItem('memoryComments');
        return data ? JSON.parse(data) : [];
    }
}

// グローバルに公開
window.CollaborationManager = CollaborationManager;