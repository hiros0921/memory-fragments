// 代替案：画像をBase64でFirestoreに保存する方法

class AlternativeStorageManager {
    constructor() {
        this.MAX_IMAGE_SIZE = 1024 * 1024; // 1MB制限
    }

    // 画像をBase64に変換してFirestoreに保存
    async saveMemoryWithBase64Image(memory, imageFile) {
        try {
            // 画像サイズチェック
            if (imageFile.size > this.MAX_IMAGE_SIZE) {
                // 画像を圧縮
                const compressedImage = await this.compressImage(imageFile);
                memory.image = compressedImage;
            } else {
                // Base64に変換
                const base64 = await this.fileToBase64(imageFile);
                memory.image = base64;
            }

            // Firestoreに保存（Storageを使わない）
            const user = firebase.auth().currentUser;
            if (!user) throw new Error('ログインしてください');

            const docRef = await firebase.firestore()
                .collection('users')
                .doc(user.uid)
                .collection('memories')
                .add({
                    ...memory,
                    createdAt: new Date().toISOString(),
                    imageType: 'base64'
                });

            return {
                success: true,
                memory: { ...memory, id: docRef.id }
            };
        } catch (error) {
            console.error('保存エラー:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ファイルをBase64に変換
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // 画像を圧縮
    async compressImage(file, maxWidth = 800) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // 品質を調整して圧縮
                    canvas.toBlob((blob) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    }, 'image/jpeg', 0.7);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
}

// 使用例
async function saveMemoryAlternative() {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('画像を選択してください');
        return;
    }

    const manager = new AlternativeStorageManager();
    const memory = {
        title: document.getElementById('title').value,
        content: document.getElementById('content').value,
        category: document.getElementById('category').value
    };

    const result = await manager.saveMemoryWithBase64Image(memory, file);
    
    if (result.success) {
        alert('保存成功！');
        console.log('保存された記憶:', result.memory);
    } else {
        alert('保存失敗: ' + result.error);
    }
}