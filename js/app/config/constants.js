(function (global) {
  global.AppConfig = {
    FREE_LIMIT: 50,
    STORAGE_KEYS: {
      MEMORIES: 'memories',
      CUSTOM_SETTINGS: 'customSettings'
    },
    EMOTION: {
      DEFAULT_MODE: 'mock',
      API_ENDPOINT: '/api/emotion-analysis'
    }
  };
})(window);
