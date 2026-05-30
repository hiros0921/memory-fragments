(function (global) {
  class ImageService {
    constructor({ storage }) {
      this.storage = storage;
    }

    async resizeImage(file, { maxWidth = 1200, maxHeight = 1200, quality = 0.85 } = {}) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const originalWidth = img.width;
            const originalHeight = img.height;

            if (originalWidth <= maxWidth && originalHeight <= maxHeight && file.size < 1000000) {
              resolve({ file, info: null });
              return;
            }

            let width = originalWidth;
            let height = originalHeight;
            if (width > maxWidth) {
              height = (maxWidth / width) * height;
              width = maxWidth;
            }
            if (height > maxHeight) {
              width = (maxHeight / height) * width;
              height = maxHeight;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  resolve({ file, info: null });
                  return;
                }

                const resizedFile = new File([blob], file.name, {
                  type: file.type || 'image/jpeg',
                  lastModified: Date.now()
                });

                resolve({
                  file: resizedFile,
                  info: {
                    originalBytes: file.size,
                    resizedBytes: blob.size,
                    originalWidth,
                    originalHeight,
                    width,
                    height
                  }
                });
              },
              file.type || 'image/jpeg',
              quality
            );
          };
          img.onerror = () => resolve({ file, info: null });
          img.src = e.target.result;
        };
        reader.onerror = () => resolve({ file, info: null });
        reader.readAsDataURL(file);
      });
    }

    async toBase64(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }

    async uploadToFirebase({ currentUser, file, onProgress, timeoutMs = 30000 }) {
      if (!currentUser?.uid) return null;

      return new Promise((resolve) => {
        const fileName = `memories/${currentUser.uid}/${Date.now()}_${file.name}`;
        const storageRef = this.storage.ref(fileName);
        const uploadTask = storageRef.put(file);

        const timeout = setTimeout(() => {
          uploadTask.cancel();
          resolve(null);
        }, timeoutMs);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (typeof onProgress === 'function') {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress(progress);
            }
          },
          (error) => {
            clearTimeout(timeout);
            console.error('Upload error:', error);
            resolve(null);
          },
          async () => {
            clearTimeout(timeout);
            try {
              const url = await uploadTask.snapshot.ref.getDownloadURL();
              resolve(url);
            } catch {
              resolve(null);
            }
          }
        );
      });
    }
  }

  global.AppServices = global.AppServices || {};
  global.AppServices.ImageService = ImageService;
})(window);

