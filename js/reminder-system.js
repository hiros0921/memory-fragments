// リマインダー機能（プレミアム専用）
class ReminderSystem {
    constructor() {
        this.reminders = [];
        this.notificationPermission = null;
        this.checkInterval = null;
    }

    // 初期化
    async init() {
        // 通知権限の確認
        await this.requestNotificationPermission();
        
        // 保存済みリマインダーを読み込み
        await this.loadReminders();
        
        // リマインダーチェックを開始（1分ごと）
        this.startReminderCheck();
    }

    // 通知権限をリクエスト
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('このブラウザは通知をサポートしていません');
            return false;
        }

        if (Notification.permission === 'granted') {
            this.notificationPermission = 'granted';
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission;
            return permission === 'granted';
        }

        return false;
    }

    // リマインダー作成UI
    createReminderUI() {
        return `
            <div class="reminder-section mt-4 p-4 bg-purple-900/20 rounded-lg border border-purple-400/30">
                <h4 class="text-lg font-bold mb-3 text-purple-300">
                    🔔 リマインダー設定
                    <span class="text-xs ml-2 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">PREMIUM</span>
                </h4>
                
                <div class="space-y-3">
                    <div class="flex items-center gap-3">
                        <input type="checkbox" id="enableReminder" class="w-5 h-5 rounded border-purple-400/30 bg-purple-900/20 text-purple-600 focus:ring-purple-600">
                        <label for="enableReminder" class="cursor-pointer">この記憶のリマインダーを設定</label>
                    </div>
                    
                    <div id="reminderOptions" class="hidden space-y-3">
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">リマインダータイプ</label>
                            <select id="reminderType" class="w-full px-3 py-2 bg-purple-900/20 border border-purple-400/30 rounded-lg text-white">
                                <option value="anniversary">記念日（毎年）</option>
                                <option value="monthly">毎月</option>
                                <option value="weekly">毎週</option>
                                <option value="daily">毎日</option>
                                <option value="once">一度だけ</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">通知時刻</label>
                            <input type="time" id="reminderTime" 
                                   class="w-full px-3 py-2 bg-purple-900/20 border border-purple-400/30 rounded-lg text-white"
                                   value="09:00">
                        </div>
                        
                        <div id="specificDateField" class="hidden">
                            <label class="block text-sm text-gray-400 mb-1">日付</label>
                            <input type="date" id="reminderDate" 
                                   class="w-full px-3 py-2 bg-purple-900/20 border border-purple-400/30 rounded-lg text-white">
                        </div>
                        
                        <div>
                            <label class="block text-sm text-gray-400 mb-1">メッセージ（オプション）</label>
                            <input type="text" id="reminderMessage" 
                                   placeholder="例：去年の今日、素敵な思い出ができました"
                                   class="w-full px-3 py-2 bg-purple-900/20 border border-purple-400/30 rounded-lg text-white placeholder-gray-500">
                        </div>
                        
                        <button onclick="reminderSystem.saveReminder()" 
                                class="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all">
                            リマインダーを保存
                        </button>
                    </div>
                </div>
                
                <div id="reminderStatus" class="mt-3"></div>
            </div>
        `;
    }

    // リマインダー一覧UI
    createReminderListUI() {
        return `
            <div id="reminderListSection" class="mb-8 hidden">
                <div class="bg-purple-900/20 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-purple-400/30">
                    <h3 class="text-xl font-bold mb-4 text-purple-300">
                        🔔 アクティブなリマインダー
                        <span class="text-xs ml-2 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">PREMIUM</span>
                    </h3>
                    
                    <div id="reminderList" class="space-y-3">
                        <!-- リマインダーがここに表示される -->
                    </div>
                    
                    <div class="mt-4 text-center">
                        <button onclick="reminderSystem.showAllReminders()" 
                                class="px-4 py-2 bg-purple-800/30 rounded-lg hover:bg-purple-700/40 transition-colors">
                            すべてのリマインダーを表示
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // リマインダー保存
    async saveReminder() {
        const enableReminder = document.getElementById('enableReminder')?.checked;
        if (!enableReminder) return;

        const type = document.getElementById('reminderType')?.value;
        const time = document.getElementById('reminderTime')?.value;
        const date = document.getElementById('reminderDate')?.value;
        const message = document.getElementById('reminderMessage')?.value;

        // 現在の記憶データを取得（仮定）
        const currentMemory = window.currentEditingMemory || {};

        const reminder = {
            id: `reminder_${Date.now()}`,
            memoryId: currentMemory.id || null,
            memoryTitle: currentMemory.title || '無題の記憶',
            type: type,
            time: time,
            date: date,
            message: message || `「${currentMemory.title || '記憶'}」を振り返る時間です`,
            enabled: true,
            createdAt: new Date().toISOString(),
            lastTriggered: null,
            nextTrigger: this.calculateNextTrigger(type, time, date)
        };

        // リマインダーを保存
        this.reminders.push(reminder);
        await this.saveRemindersToStorage();

        // UI更新
        this.showStatus('リマインダーを設定しました', 'success');
        this.updateReminderList();

        return reminder;
    }

    // 次のトリガー時刻を計算
    calculateNextTrigger(type, time, specificDate) {
        const now = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        let nextDate = new Date();

        switch (type) {
            case 'anniversary':
                // 毎年同じ日
                if (specificDate) {
                    const [year, month, day] = specificDate.split('-').map(Number);
                    nextDate = new Date(now.getFullYear(), month - 1, day, hours, minutes);
                    if (nextDate <= now) {
                        nextDate.setFullYear(nextDate.getFullYear() + 1);
                    }
                }
                break;

            case 'monthly':
                // 毎月同じ日
                nextDate.setHours(hours, minutes, 0, 0);
                if (nextDate <= now) {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }
                break;

            case 'weekly':
                // 毎週同じ曜日
                nextDate.setHours(hours, minutes, 0, 0);
                if (nextDate <= now) {
                    nextDate.setDate(nextDate.getDate() + 7);
                }
                break;

            case 'daily':
                // 毎日
                nextDate.setHours(hours, minutes, 0, 0);
                if (nextDate <= now) {
                    nextDate.setDate(nextDate.getDate() + 1);
                }
                break;

            case 'once':
                // 一度だけ
                if (specificDate) {
                    const [year, month, day] = specificDate.split('-').map(Number);
                    nextDate = new Date(year, month - 1, day, hours, minutes);
                }
                break;
        }

        return nextDate.toISOString();
    }

    // リマインダーチェックを開始
    startReminderCheck() {
        // 既存のインターバルをクリア
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        // 1分ごとにチェック
        this.checkInterval = setInterval(() => {
            this.checkReminders();
        }, 60000);

        // 即座に一度チェック
        this.checkReminders();
    }

    // リマインダーをチェック
    async checkReminders() {
        const now = new Date();

        for (const reminder of this.reminders) {
            if (!reminder.enabled) continue;

            const triggerTime = new Date(reminder.nextTrigger);
            
            // トリガー時刻を過ぎている場合
            if (triggerTime <= now && (!reminder.lastTriggered || new Date(reminder.lastTriggered) < triggerTime)) {
                await this.triggerReminder(reminder);
                
                // 次のトリガー時刻を更新
                reminder.lastTriggered = now.toISOString();
                
                if (reminder.type !== 'once') {
                    reminder.nextTrigger = this.calculateNextTrigger(
                        reminder.type,
                        reminder.time,
                        reminder.date
                    );
                } else {
                    reminder.enabled = false; // 一度だけの場合は無効化
                }
                
                await this.saveRemindersToStorage();
            }
        }
    }

    // リマインダーをトリガー
    async triggerReminder(reminder) {
        // ブラウザ通知を表示
        if (this.notificationPermission === 'granted') {
            const notification = new Notification('Memory Fragments - リマインダー', {
                body: reminder.message,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: reminder.id,
                requireInteraction: true,
                actions: [
                    { action: 'view', title: '記憶を見る' },
                    { action: 'dismiss', title: '閉じる' }
                ]
            });

            notification.onclick = () => {
                window.focus();
                if (reminder.memoryId) {
                    // 該当する記憶を表示
                    this.viewMemory(reminder.memoryId);
                }
                notification.close();
            };
        }

        // アプリ内通知も表示
        this.showInAppNotification(reminder);
    }

    // アプリ内通知を表示
    showInAppNotification(reminder) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-50 max-w-sm animate-float';
        notification.innerHTML = `
            <div class="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-2xl p-4 text-white">
                <div class="flex items-start">
                    <div class="text-2xl mr-3">🔔</div>
                    <div class="flex-1">
                        <h4 class="font-bold mb-1">リマインダー</h4>
                        <p class="text-sm">${reminder.message}</p>
                        <div class="mt-3 flex gap-2">
                            <button onclick="reminderSystem.viewMemory('${reminder.memoryId}')" 
                                    class="px-3 py-1 bg-white/20 rounded hover:bg-white/30 text-xs">
                                記憶を見る
                            </button>
                            <button onclick="this.closest('.fixed').remove()" 
                                    class="px-3 py-1 bg-white/20 rounded hover:bg-white/30 text-xs">
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 10秒後に自動的に削除
        setTimeout(() => {
            notification.remove();
        }, 10000);
    }

    // 記憶を表示
    viewMemory(memoryId) {
        // 既存の記憶表示機能を呼び出し
        const memory = window.memories?.find(m => m.id === memoryId);
        if (memory && window.displaySingleMemoryView) {
            window.displaySingleMemoryView(memory);
        }
    }

    // リマインダー一覧を更新
    updateReminderList() {
        const listContainer = document.getElementById('reminderList');
        if (!listContainer) return;

        const activeReminders = this.reminders.filter(r => r.enabled);
        
        if (activeReminders.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-400 text-center">アクティブなリマインダーはありません</p>';
            return;
        }

        listContainer.innerHTML = activeReminders.map(reminder => `
            <div class="bg-purple-800/20 rounded-lg p-3 flex justify-between items-center">
                <div>
                    <div class="font-semibold">${reminder.memoryTitle}</div>
                    <div class="text-sm text-gray-400">
                        ${this.getReminderTypeLabel(reminder.type)} - ${reminder.time}
                    </div>
                    <div class="text-xs text-gray-500">
                        次回: ${new Date(reminder.nextTrigger).toLocaleString('ja-JP')}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="reminderSystem.toggleReminder('${reminder.id}')" 
                            class="px-3 py-1 ${reminder.enabled ? 'bg-green-600' : 'bg-gray-600'} rounded text-xs">
                        ${reminder.enabled ? 'ON' : 'OFF'}
                    </button>
                    <button onclick="reminderSystem.deleteReminder('${reminder.id}')" 
                            class="px-3 py-1 bg-red-600 rounded text-xs">
                        削除
                    </button>
                </div>
            </div>
        `).join('');
    }

    // リマインダータイプのラベル取得
    getReminderTypeLabel(type) {
        const labels = {
            'anniversary': '毎年',
            'monthly': '毎月',
            'weekly': '毎週',
            'daily': '毎日',
            'once': '一度だけ'
        };
        return labels[type] || type;
    }

    // リマインダーの有効/無効を切り替え
    async toggleReminder(reminderId) {
        const reminder = this.reminders.find(r => r.id === reminderId);
        if (reminder) {
            reminder.enabled = !reminder.enabled;
            await this.saveRemindersToStorage();
            this.updateReminderList();
        }
    }

    // リマインダーを削除
    async deleteReminder(reminderId) {
        this.reminders = this.reminders.filter(r => r.id !== reminderId);
        await this.saveRemindersToStorage();
        this.updateReminderList();
    }

    // リマインダーをストレージに保存
    async saveRemindersToStorage() {
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                await db.collection('reminders').doc(user.uid).set({
                    reminders: this.reminders,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error('Failed to save reminders:', error);
                // ローカルストレージにバックアップ
                localStorage.setItem('reminders', JSON.stringify(this.reminders));
            }
        } else {
            localStorage.setItem('reminders', JSON.stringify(this.reminders));
        }
    }

    // リマインダーを読み込み
    async loadReminders() {
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                const doc = await db.collection('reminders').doc(user.uid).get();
                if (doc.exists) {
                    this.reminders = doc.data().reminders || [];
                }
            } catch (error) {
                console.error('Failed to load reminders:', error);
                // ローカルストレージから読み込み
                const local = localStorage.getItem('reminders');
                if (local) {
                    this.reminders = JSON.parse(local);
                }
            }
        } else {
            const local = localStorage.getItem('reminders');
            if (local) {
                this.reminders = JSON.parse(local);
            }
        }
    }

    // ステータス表示
    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('reminderStatus');
        if (statusEl) {
            statusEl.className = `mt-3 text-sm ${type === 'success' ? 'text-green-400' : 'text-gray-400'}`;
            statusEl.textContent = message;
            setTimeout(() => {
                statusEl.textContent = '';
            }, 3000);
        }
    }
}

// グローバルインスタンス
const reminderSystem = new ReminderSystem();