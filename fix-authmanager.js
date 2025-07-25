// このスクリプトをindex.htmlの最後に追加する必要があります

// 既存のコード:
// const authManager = new AuthManager();

// 修正後のコード:
const authManager = new AuthManager();
window.authManager = authManager;  // ← この行を追加

// これにより、StorageManagerがwindow.authManagerを参照できるようになります