// カレンダービュー機能（プレミアム専用）
class CalendarView {
    constructor() {
        this.calendar = null;
        this.memories = [];
        this.currentView = 'month';
    }

    // カレンダービューセクションのHTML
    createCalendarSection() {
        return `
            <div id="calendarSection" class="mb-8 hidden">
                <div class="bg-purple-900/20 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-purple-400/30">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-bold text-purple-300">
                            📅 記憶のカレンダー
                            <span class="text-xs ml-2 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">PREMIUM</span>
                        </h3>
                        <div class="flex gap-2">
                            <button onclick="calendarView.changeView('month')" 
                                    class="px-4 py-2 bg-purple-800/30 rounded-lg hover:bg-purple-700/40 transition-colors view-btn" data-view="month">
                                月表示
                            </button>
                            <button onclick="calendarView.changeView('week')" 
                                    class="px-4 py-2 bg-purple-800/30 rounded-lg hover:bg-purple-700/40 transition-colors view-btn" data-view="week">
                                週表示
                            </button>
                            <button onclick="calendarView.changeView('list')" 
                                    class="px-4 py-2 bg-purple-800/30 rounded-lg hover:bg-purple-700/40 transition-colors view-btn" data-view="list">
                                リスト
                            </button>
                        </div>
                    </div>
                    <div id="calendar" class="bg-black/20 rounded-xl p-4"></div>
                </div>
            </div>
        `;
    }

    // カレンダー初期化
    async initCalendar() {
        // FullCalendarライブラリを動的に読み込み
        if (!window.FullCalendar) {
            await this.loadFullCalendar();
        }

        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        // 記憶データをカレンダーイベントに変換
        const events = await this.convertMemoriesToEvents();

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'ja',
            height: 'auto',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listMonth'
            },
            buttonText: {
                today: '今日',
                month: '月',
                week: '週',
                list: 'リスト'
            },
            events: events,
            eventClick: (info) => {
                this.showMemoryDetail(info.event.extendedProps.memoryId);
            },
            eventDisplay: 'block',
            eventBackgroundColor: '#9333ea',
            eventBorderColor: '#a855f7',
            dayMaxEvents: 3,
            moreLinkText: 'その他',
            eventTimeFormat: {
                hour: 'numeric',
                minute: '2-digit',
                meridiem: false,
                hour12: false
            },
            // カスタムスタイル
            eventDidMount: (info) => {
                // 感情に応じて色を変える
                const emotion = info.event.extendedProps.emotion;
                if (emotion) {
                    const emotionColors = {
                        '😊': '#10b981', // 幸せ - 緑
                        '😢': '#3b82f6', // 悲しい - 青
                        '😡': '#ef4444', // 怒り - 赤
                        '😴': '#6b7280', // 疲れ - グレー
                        '🎉': '#f59e0b', // 喜び - 黄
                        '😰': '#8b5cf6', // 不安 - 紫
                        '💕': '#ec4899', // 愛 - ピンク
                    };
                    
                    if (emotionColors[emotion]) {
                        info.el.style.backgroundColor = emotionColors[emotion];
                        info.el.style.borderColor = emotionColors[emotion];
                    }
                }

                // ツールチップ追加
                info.el.setAttribute('title', info.event.title);
                if (info.event.extendedProps.preview) {
                    info.el.setAttribute('data-tooltip', info.event.extendedProps.preview);
                }
            }
        });

        this.calendar.render();
        
        // カスタムスタイル適用
        this.applyCustomStyles();
    }

    // FullCalendarライブラリを動的に読み込み
    async loadFullCalendar() {
        return new Promise((resolve) => {
            // CSS
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.css';
            document.head.appendChild(cssLink);

            // JavaScript
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js';
            script.onload = () => {
                // 日本語ロケール
                const localeScript = document.createElement('script');
                localeScript.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/locales/ja.global.min.js';
                localeScript.onload = resolve;
                document.head.appendChild(localeScript);
            };
            document.head.appendChild(script);
        });
    }

    // 記憶データをカレンダーイベントに変換
    async convertMemoriesToEvents() {
        // Firestoreまたはローカルストレージから記憶を取得
        const memories = await this.fetchMemories();
        
        return memories.map(memory => {
            const date = new Date(memory.date || memory.timestamp);
            const title = memory.title || '無題の記憶';
            const content = memory.content || '';
            
            return {
                id: memory.id,
                title: title,
                start: date.toISOString().split('T')[0],
                allDay: true,
                extendedProps: {
                    memoryId: memory.id,
                    content: content,
                    preview: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                    emotion: memory.emotion || '',
                    category: memory.category || '',
                    images: memory.images || [],
                    tags: memory.tags || []
                },
                className: `memory-event category-${memory.category || 'other'}`
            };
        });
    }

    // 記憶データを取得
    async fetchMemories() {
        const user = firebase.auth().currentUser;
        if (!user) return [];

        try {
            const snapshot = await db.collection('memories')
                .where('userId', '==', user.uid)
                .orderBy('timestamp', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching memories:', error);
            // ローカルストレージから取得
            const localMemories = localStorage.getItem('memories');
            return localMemories ? JSON.parse(localMemories) : [];
        }
    }

    // ビュー変更
    changeView(viewType) {
        if (!this.calendar) return;

        const viewMap = {
            'month': 'dayGridMonth',
            'week': 'timeGridWeek',
            'list': 'listMonth'
        };

        this.calendar.changeView(viewMap[viewType] || 'dayGridMonth');
        this.currentView = viewType;

        // ボタンのアクティブ状態を更新
        document.querySelectorAll('.view-btn').forEach(btn => {
            if (btn.dataset.view === viewType) {
                btn.classList.add('bg-purple-600/50');
            } else {
                btn.classList.remove('bg-purple-600/50');
            }
        });
    }

    // 記憶の詳細を表示
    showMemoryDetail(memoryId) {
        // 既存の記憶詳細表示機能を呼び出し
        const memory = this.memories.find(m => m.id === memoryId);
        if (memory && window.displaySingleMemoryView) {
            window.displaySingleMemoryView(memory);
        }
    }

    // カスタムスタイル適用
    applyCustomStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* カレンダーのカスタムスタイル */
            .fc {
                background: transparent !important;
                color: #e5e7eb !important;
            }
            
            .fc-theme-standard td, .fc-theme-standard th {
                border-color: rgba(168, 85, 247, 0.2) !important;
            }
            
            .fc-button {
                background: linear-gradient(135deg, #9333ea, #c084fc) !important;
                border: none !important;
                color: white !important;
            }
            
            .fc-button:hover {
                background: linear-gradient(135deg, #a855f7, #c084fc) !important;
            }
            
            .fc-button-active {
                background: linear-gradient(135deg, #7c3aed, #9333ea) !important;
            }
            
            .fc-day-today {
                background: rgba(168, 85, 247, 0.1) !important;
            }
            
            .fc-event {
                border-radius: 6px !important;
                padding: 2px 4px !important;
                font-size: 12px !important;
                cursor: pointer !important;
                transition: transform 0.2s !important;
            }
            
            .fc-event:hover {
                transform: scale(1.05) !important;
                box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4) !important;
            }
            
            .fc-daygrid-day-number {
                color: #d1d5db !important;
            }
            
            .fc-col-header-cell-cushion {
                color: #e5e7eb !important;
            }
            
            /* カテゴリ別の色 */
            .category-日常 { background: #10b981 !important; }
            .category-旅行 { background: #3b82f6 !important; }
            .category-仕事 { background: #f59e0b !important; }
            .category-趣味 { background: #ec4899 !important; }
            .category-家族 { background: #8b5cf6 !important; }
            .category-その他 { background: #6b7280 !important; }
        `;
        document.head.appendChild(style);
    }

    // カレンダーをリフレッシュ
    async refreshCalendar() {
        if (!this.calendar) return;
        
        const events = await this.convertMemoriesToEvents();
        this.calendar.removeAllEvents();
        this.calendar.addEventSource(events);
    }
}

// グローバルインスタンス
const calendarView = new CalendarView();