(function (global) {
  class LocationService {
    async getCurrentLocation({ enableHighAccuracy = true, timeout = 10000, maximumAge = 0 } = {}) {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('お使いのブラウザは位置情報をサポートしていません'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          (error) => {
            let message = '位置情報を取得できませんでした';
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message = '位置情報の使用が許可されていません';
                break;
              case error.POSITION_UNAVAILABLE:
                message = '位置情報が利用できません';
                break;
              case error.TIMEOUT:
                message = '位置情報の取得がタイムアウトしました';
                break;
            }
            reject(new Error(message));
          },
          { enableHighAccuracy, timeout, maximumAge }
        );
      });
    }
  }

  global.AppServices = global.AppServices || {};
  global.AppServices.LocationService = LocationService;
})(window);
