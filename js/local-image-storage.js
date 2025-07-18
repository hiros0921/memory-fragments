// ローカルストレージを使用した画像保存（Firebase Storage不要版）
class LocalImageStorage {
    constructor() {
        this.maxImageSize = 10 * 1024 * 1024; // 10MB
        this.imageQuality = 0.95; // 高品質に変更
    }

    // 画像をBase64に変換して保存
    async saveImage(file, memoryId) {
        try {
            // 画像をリサイズ・圧縮
            const compressedImage = await this.compressImage(file);
            
            // ローカルストレージに保存
            const key = `image_${memoryId}`;
            localStorage.setItem(key, compressedImage);
            
            return {
                success: true,
                imageUrl: compressedImage,
                size: compressedImage.length
            };
        } catch (error) {
            console.error('Image save error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 画像を圧縮
    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    // キャンバスで画像をリサイズ
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 最大幅を2000pxに拡大（より高解像度の画像をサポート）
                    const maxWidth = 2000;
                    const maxHeight = 2000;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxWidth) {
                            height = height * (maxWidth / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = width * (maxHeight / height);
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // 画像を描画
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Base64形式で出力
                    const compressedBase64 = canvas.toDataURL('image/jpeg', this.imageQuality);
                    resolve(compressedBase64);
                };
                
                img.onerror = () => {
                    reject(new Error('画像の読み込みに失敗しました'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('ファイルの読み込みに失敗しました'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    // 画像を取得
    getImage(memoryId) {
        const key = `image_${memoryId}`;
        return localStorage.getItem(key);
    }

    // 画像を削除
    deleteImage(memoryId) {
        const key = `image_${memoryId}`;
        localStorage.removeItem(key);
    }

    // 全画像のサイズを計算
    calculateTotalSize() {
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('image_')) {
                const value = localStorage.getItem(key);
                totalSize += value.length;
            }
        }
        return totalSize;
    }

    // 容量の警告チェック
    checkStorageCapacity() {
        const totalSize = this.calculateTotalSize();
        const maxSize = 5 * 1024 * 1024; // 5MB（ローカルストレージの一般的な上限）
        
        return {
            used: totalSize,
            max: maxSize,
            percentage: (totalSize / maxSize) * 100,
            remaining: maxSize - totalSize,
            canAddMore: totalSize < maxSize * 0.9 // 90%未満なら追加可能
        };
    }
}

// グローバルに公開
window.LocalImageStorage = LocalImageStorage;