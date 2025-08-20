// 複数画像アップロード機能（プレミアム専用）
class MultiImageHandler {
    constructor() {
        this.maxImages = 10; // プレミアムユーザーは最大10枚
        this.maxSizePerImage = 5 * 1024 * 1024; // 5MB per image
        this.selectedImages = [];
        this.compressedImages = [];
    }

    // プレミアムユーザーかチェック
    isPremiumUser() {
        const user = firebase.auth().currentUser;
        if (!user) return false;
        
        // Firestoreでユーザーのサブスクリプション状態を確認
        return new Promise(async (resolve) => {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                const userData = userDoc.data();
                resolve(userData?.subscriptionStatus === 'active' || userData?.isPremium === true);
            } catch (error) {
                console.error('Premium check error:', error);
                resolve(false);
            }
        });
    }

    // 複数画像選択UI
    async createMultiImageInput() {
        const isPremium = await this.isPremiumUser();
        
        if (!isPremium) {
            return `
                <div class="relative">
                    <input type="file" id="imageFile" accept="image/*" class="hidden">
                    <label for="imageFile" class="block w-full px-4 py-3 bg-purple-900/20 border border-purple-400/30 rounded-lg cursor-pointer hover:bg-purple-800/30 transition-all duration-300 text-center">
                        📷 画像を選択（1枚まで）
                    </label>
                    <div id="imageInfo" class="mt-2 text-xs text-gray-400 hidden"></div>
                </div>
            `;
        }

        return `
            <div class="relative">
                <input type="file" id="multiImageFile" accept="image/*" multiple class="hidden">
                <label for="multiImageFile" class="block w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg cursor-pointer hover:from-purple-700 hover:to-pink-700 transition-all duration-300 text-center font-semibold">
                    📸 複数画像を選択（最大10枚） - プレミアム機能
                </label>
                <div id="imagePreviewContainer" class="mt-4 grid grid-cols-3 gap-2 hidden"></div>
                <div id="imageInfo" class="mt-2 text-xs text-purple-400"></div>
            </div>
        `;
    }

    // 画像プレビュー表示
    displayImagePreviews(files) {
        const container = document.getElementById('imagePreviewContainer');
        const info = document.getElementById('imageInfo');
        
        if (!container || !info) return;
        
        container.innerHTML = '';
        container.classList.remove('hidden');
        
        if (files.length > this.maxImages) {
            info.innerHTML = `⚠️ 最大${this.maxImages}枚まで選択可能です`;
            info.className = 'mt-2 text-xs text-yellow-400';
            return;
        }
        
        this.selectedImages = Array.from(files);
        info.innerHTML = `✅ ${files.length}枚の画像が選択されました`;
        info.className = 'mt-2 text-xs text-green-400';
        
        // プレビュー表示
        this.selectedImages.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.createElement('div');
                preview.className = 'relative group';
                preview.innerHTML = `
                    <img src="${e.target.result}" alt="Preview ${index + 1}" 
                         class="w-full h-24 object-cover rounded-lg">
                    <button onclick="multiImageHandler.removeImage(${index})" 
                            class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        ×
                    </button>
                    <div class="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                        ${(file.size / 1024 / 1024).toFixed(1)}MB
                    </div>
                `;
                container.appendChild(preview);
            };
            reader.readAsDataURL(file);
        });
    }

    // 画像を削除
    removeImage(index) {
        this.selectedImages.splice(index, 1);
        const fileInput = document.getElementById('multiImageFile');
        
        // FileListを再構築（直接変更できないため）
        const dt = new DataTransfer();
        this.selectedImages.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;
        
        this.displayImagePreviews(this.selectedImages);
    }

    // 画像圧縮
    async compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 最大幅/高さを1920pxに制限
                    let { width, height } = img;
                    const maxDimension = 1920;
                    
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = (maxDimension / width) * height;
                            width = maxDimension;
                        } else {
                            width = (maxDimension / height) * width;
                            height = maxDimension;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    }, 'image/jpeg', 0.85);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // 複数画像をFirebase Storageにアップロード
    async uploadImages(memoryId) {
        if (this.selectedImages.length === 0) return [];
        
        const uploadPromises = this.selectedImages.map(async (file, index) => {
            try {
                // 画像を圧縮
                const compressedFile = await this.compressImage(file);
                
                // Firebase Storageにアップロード
                const storageRef = storage.ref();
                const imageRef = storageRef.child(`memories/${memoryId}/image_${index}_${Date.now()}.jpg`);
                
                const snapshot = await imageRef.put(compressedFile);
                const downloadURL = await snapshot.ref.getDownloadURL();
                
                return {
                    url: downloadURL,
                    index: index,
                    name: file.name,
                    size: compressedFile.size
                };
            } catch (error) {
                console.error(`Image ${index} upload error:`, error);
                return null;
            }
        });
        
        const results = await Promise.all(uploadPromises);
        return results.filter(r => r !== null);
    }

    // 画像ギャラリー表示
    createImageGallery(images) {
        if (!images || images.length === 0) return '';
        
        if (images.length === 1) {
            return `<img src="${images[0].url}" alt="Memory" class="w-full rounded-lg mb-4">`;
        }
        
        return `
            <div class="image-gallery mb-4">
                <div class="main-image-container relative">
                    <img id="galleryMainImage" src="${images[0].url}" alt="Main" class="w-full rounded-lg">
                    <div class="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                        1 / ${images.length}
                    </div>
                </div>
                <div class="thumbnail-container grid grid-cols-5 gap-2 mt-2">
                    ${images.map((img, idx) => `
                        <img src="${img.url}" alt="Thumb ${idx + 1}" 
                             class="w-full h-16 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity ${idx === 0 ? 'ring-2 ring-purple-500' : ''}"
                             onclick="multiImageHandler.switchGalleryImage(${idx}, '${img.url}', this)">
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ギャラリー画像切り替え
    switchGalleryImage(index, url, element) {
        const mainImage = document.getElementById('galleryMainImage');
        if (mainImage) {
            mainImage.src = url;
            
            // サムネイルのハイライト更新
            const thumbnails = element.parentElement.querySelectorAll('img');
            thumbnails.forEach(thumb => thumb.classList.remove('ring-2', 'ring-purple-500'));
            element.classList.add('ring-2', 'ring-purple-500');
            
            // カウンター更新
            const counter = mainImage.parentElement.querySelector('.absolute');
            if (counter) {
                counter.textContent = `${index + 1} / ${thumbnails.length}`;
            }
        }
    }
}

// グローバルインスタンス
const multiImageHandler = new MultiImageHandler();