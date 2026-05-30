/**
 * Lightweight Analytics
 * Firestoreベースのイベントトラッキング
 * navigator.doNotTrack を尊重
 */
(function() {
    'use strict';

    var enabled = true;
    var sessionId = null;
    var dbRef = null;

    function init(firestore) {
        // Do Not Track を尊重
        if (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes') {
            enabled = false;
            return;
        }

        dbRef = firestore;
        sessionId = generateSessionId();

        // ページビューを自動記録
        track('page_view', {
            path: window.location.pathname,
            referrer: document.referrer || '(direct)'
        });
    }

    /**
     * イベントをトラッキング
     * @param {string} event - イベント名
     * @param {Object} data - 追加データ
     */
    function track(event, data) {
        if (!enabled || !dbRef) return;

        var payload = {
            event: event,
            timestamp: new Date().toISOString(),
            sessionId: sessionId,
            userAgent: navigator.userAgent,
            screenWidth: window.innerWidth,
            isMobile: window.innerWidth < 768
        };

        if (data) {
            payload.data = data;
        }

        try {
            dbRef.collection('analytics').add(payload).catch(function(err) {
                // サイレントに失敗（ユーザー体験に影響しない）
                console.debug('Analytics write failed:', err.message);
            });
        } catch (e) {
            // エラーを飲み込む
        }
    }

    function generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    }

    window.Analytics = {
        init: init,
        track: track
    };
})();
