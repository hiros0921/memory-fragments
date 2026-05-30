(function (global) {
  class MemoryService {
    constructor({ memoryRepository, imageService, locationService }) {
      this.memoryRepository = memoryRepository;
      this.imageService = imageService;
      this.locationService = locationService;
    }

    validateMemoryInput({ title, content, category }) {
      if (!title || !content || !category) {
        return { ok: false, message: 'すべての項目を入力してください' };
      }
      return { ok: true };
    }

    buildMemoryPayload({ title, content, category, tags, userId }) {
      return {
        title,
        content,
        category,
        tags: Array.isArray(tags) ? tags : [],
        createdAt: new Date().toISOString(),
        userId
      };
    }

    async attachLocation(memory, { enabled, onStatusUpdate } = {}) {
      if (!enabled) return memory;
      try {
        if (typeof onStatusUpdate === 'function') {
          onStatusUpdate('位置情報を取得中...');
        }
        const location = await this.locationService.getCurrentLocation();
        if (typeof onStatusUpdate === 'function') {
          onStatusUpdate('✅ 位置情報を取得しました');
        }
        return { ...memory, location };
      } catch (error) {
        if (typeof onStatusUpdate === 'function') {
          onStatusUpdate(`❌ ${error.message}`);
        }
        throw error;
      }
    }

    async attachImage(memory, { imageFile, currentUser, onProgress, onResizeInfo }) {
      if (!imageFile) return memory;

      try {
        const { file: resizedFile, info } = await this.imageService.resizeImage(imageFile);
        if (info && typeof onResizeInfo === 'function') {
          onResizeInfo(info);
        }

        const imageUrl = await this.imageService.uploadToFirebase({
          currentUser,
          file: resizedFile,
          onProgress
        });

        if (imageUrl) {
          return { ...memory, imageUrl };
        }

        const imageData = await this.imageService.toBase64(resizedFile);
        return imageData ? { ...memory, imageData } : memory;
      } catch (error) {
        console.error('画像処理エラー:', error);
        try {
          const { file: resizedFile } = await this.imageService.resizeImage(imageFile);
          const imageData = await this.imageService.toBase64(resizedFile);
          return imageData ? { ...memory, imageData } : memory;
        } catch (resizeError) {
          console.error('リサイズエラー:', resizeError);
          throw new Error('画像の処理に失敗しました');
        }
      }
    }

    async saveForUser({ uid, memory }) {
      return this.memoryRepository.addForUser({ uid, memory });
    }

    async listForUser({ uid }) {
      return this.memoryRepository.listForUser({ uid });
    }

    saveLocal(memory) {
      return this.memoryRepository.saveLocal(memory, { prepend: true });
    }

    listLocal() {
      return this.memoryRepository.listLocal();
    }

    getLocalById(id) {
      return this.memoryRepository.getLocalById(id);
    }

    async getForUserById({ uid, id }) {
      return this.memoryRepository.getForUserById({ uid, id });
    }
  }

  global.AppServices = global.AppServices || {};
  global.AppServices.MemoryService = MemoryService;
})(window);
