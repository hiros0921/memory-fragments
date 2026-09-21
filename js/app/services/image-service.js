(function (global) {
  class ImageService {
    constructor({ storage, auth, bucket = 'memory-fragments.firebasestorage.app', fetchImpl = global.fetch.bind(global) }) {
      this.storage = storage;
      this.auth = auth;
      this.bucket = bucket;
      this.fetch = fetchImpl;
      this.privateUrls = new Set();
      this.requests = new Set();
      this.imageGeneration = 0;
    }

    clearPrivateImages() {
      this.imageGeneration++;
      this.requests.forEach(controller => controller.abort());
      this.requests.clear();
      this.privateUrls.forEach(url => URL.revokeObjectURL(url));
      this.privateUrls.clear();
    }

    ownerPath(value, uid) {
      if (typeof value !== 'string' || !uid) return null;
      try {
        const url = new URL(value);
        let path;
        if (url.protocol === 'gs:' && url.hostname === this.bucket) {
          path = decodeURIComponent(url.pathname.slice(1));
        } else if (url.origin === 'https://firebasestorage.googleapis.com') {
          const prefix = `/v0/b/${this.bucket}/o/`;
          if (!url.pathname.startsWith(prefix)) return null;
          path = decodeURIComponent(url.pathname.slice(prefix.length));
        } else {
          return null;
        }
        const segments = path.split('/');
        if (!['memories', 'images', 'profiles'].includes(segments[0]) || segments[1] !== uid ||
            segments.length < 3 || segments.some(part => !part || part === '.' || part === '..')) return null;
        return path;
      } catch {
        return null;
      }
    }

    async loadPrivateImage(memory, user) {
      const generation = this.imageGeneration;
      const active = () => user?.uid && this.auth?.currentUser === user && generation === this.imageGeneration;
      if (!active() || memory?.userId !== user.uid) return null;

      let blob;
      const inlineImage = /^data:image\/(png|jpeg|webp|gif);base64,/i.test(memory.imageUrl || '')
        ? memory.imageUrl : memory.imageData;
      if (memory.imageUrl && inlineImage !== memory.imageUrl) {
        const path = this.ownerPath(memory.imageUrl, user.uid);
        if (!path) return null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (!active()) return null;
          const token = await user.getIdToken();
          if (!active()) return null;
          const controller = new AbortController();
          this.requests.add(controller);
          const timeout = setTimeout(() => controller.abort(), 30000);
          try {
            // Never reuse the stored bearer token or send credentials to a stored URL.
            const response = await this.fetch(
              `https://firebasestorage.googleapis.com/v0/b/${this.bucket}/o/${encodeURIComponent(path)}?alt=media`,
              { headers: { Authorization: `Firebase ${token}` }, cache: 'no-store',
                credentials: 'omit', redirect: 'error', signal: controller.signal }
            );
            if (!response.ok) {
              try { await response.body?.cancel(); } catch { /* Preserve the received HTTP status. */ }
              const error = new Error('写真を読み込めませんでした。再読み込みしてお試しください。');
              error.status = response.status;
              throw error;
            }
            blob = await response.blob();
            break;
          } catch (error) {
            if (!active()) return null;
            // Retry transport failures only; never retry permission denials or bypass auth.
            if (attempt === 2 || !['TypeError', 'AbortError'].includes(error.name)) throw error;
          } finally {
            clearTimeout(timeout);
            this.requests.delete(controller);
          }
          await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
        }
      } else if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(inlineImage || '')) {
        blob = await (await this.fetch(inlineImage)).blob();
      } else {
        return null;
      }
      if (!active() || !blob.type.startsWith('image/')) return null;
      const objectUrl = URL.createObjectURL(blob);
      this.privateUrls.add(objectUrl);
      return objectUrl;
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
      if (!currentUser?.uid || this.auth?.currentUser !== currentUser) return null;

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
              const path = uploadTask.snapshot.ref.fullPath;
              resolve(`gs://${this.bucket}/${path.split('/').map(encodeURIComponent).join('/')}`);
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
