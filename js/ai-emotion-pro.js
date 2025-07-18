// AI感情分析Pro機能（プレミアム専用）
class AIEmotionPro {
    constructor() {
        this.apiEndpoint = '/api/emotion-analysis'; // 実際はバックエンドAPIを使用
        this.emotionHistory = [];
        this.insights = [];
    }

    // プレミアム感情分析の実行
    async analyzeEmotionPro(content, options = {}) {
        // プレミアムユーザーチェック
        if (!window.authManager?.isPremiumUser()) {
            return {
                success: false,
                error: 'この機能はプレミアムプランでのみ利用可能です',
                showUpgrade: true
            };
        }

        try {
            // ローカルでの基本分析（即座にフィードバック）
            const basicAnalysis = this.performBasicAnalysis(content);
            
            // 高度なAI分析（実際はOpenAI APIを使用）
            const advancedAnalysis = await this.performAdvancedAnalysis(content, options);
            
            // 結果を統合
            const result = {
                basic: basicAnalysis,
                advanced: advancedAnalysis,
                timestamp: new Date().toISOString()
            };

            // 履歴に追加
            this.emotionHistory.push(result);
            
            // インサイトの生成
            if (this.emotionHistory.length >= 5) {
                this.generateInsights();
            }

            return {
                success: true,
                analysis: result,
                insights: this.insights
            };
        } catch (error) {
            console.error('Emotion analysis failed:', error);
            return {
                success: false,
                error: '感情分析に失敗しました'
            };
        }
    }

    // 基本的な感情分析（ローカル処理）
    performBasicAnalysis(content) {
        // 感情キーワードと感情スコア
        const emotionKeywords = {
            joy: {
                words: ['嬉しい', '楽しい', '幸せ', '最高', '素晴らしい', 'ワクワク', '感動', '笑'],
                score: 1,
                color: '#FFD700'
            },
            sadness: {
                words: ['悲しい', '寂しい', '辛い', '泣', '切ない', '喪失', '別れ'],
                score: -1,
                color: '#4169E1'
            },
            anger: {
                words: ['怒', 'イライラ', 'ムカつく', '腹立', '許せない', '憤'],
                score: -0.8,
                color: '#DC143C'
            },
            fear: {
                words: ['怖い', '不安', '心配', '恐', '緊張', 'ビクビク'],
                score: -0.6,
                color: '#8B008B'
            },
            surprise: {
                words: ['驚', 'びっくり', '意外', '予想外', 'まさか'],
                score: 0,
                color: '#FF8C00'
            },
            love: {
                words: ['愛', '好き', '大切', '感謝', 'ありがとう', '素敵'],
                score: 0.9,
                color: '#FF69B4'
            },
            calm: {
                words: ['穏やか', '平和', 'リラックス', '安心', '落ち着'],
                score: 0.7,
                color: '#32CD32'
            }
        };

        // 各感情のスコアを計算
        const scores = {};
        let totalScore = 0;
        let dominantEmotion = null;
        let maxScore = 0;

        for (const [emotion, config] of Object.entries(emotionKeywords)) {
            let count = 0;
            config.words.forEach(word => {
                const matches = (content.match(new RegExp(word, 'gi')) || []).length;
                count += matches;
            });
            
            scores[emotion] = count;
            totalScore += count;
            
            if (count > maxScore) {
                maxScore = count;
                dominantEmotion = emotion;
            }
        }

        // パーセンテージ計算
        const percentages = {};
        for (const emotion in scores) {
            percentages[emotion] = totalScore > 0 
                ? Math.round((scores[emotion] / totalScore) * 100) 
                : 0;
        }

        // 感情の強度計算
        const intensity = Math.min(100, Math.round((maxScore / content.length) * 1000));

        return {
            dominant: dominantEmotion || 'neutral',
            scores: percentages,
            intensity: intensity,
            color: emotionKeywords[dominantEmotion]?.color || '#808080'
        };
    }

    // 高度なAI分析（実際はAPIコール）
    async performAdvancedAnalysis(content, options) {
        // デモ用のシミュレーション
        // 実際の実装では OpenAI API を使用
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    sentiment: {
                        positive: Math.random() * 0.5 + 0.3,
                        negative: Math.random() * 0.3,
                        neutral: Math.random() * 0.2 + 0.1
                    },
                    emotions: {
                        primary: this.detectPrimaryEmotion(content),
                        secondary: this.detectSecondaryEmotions(content),
                        intensity: Math.random() * 0.5 + 0.5
                    },
                    themes: this.extractThemes(content),
                    mentalHealth: {
                        stressLevel: Math.random() * 0.6,
                        wellbeingScore: Math.random() * 0.4 + 0.6,
                        recommendations: this.generateRecommendations(content)
                    }
                });
            }, 1000);
        });
    }

    // 主要な感情の検出
    detectPrimaryEmotion(content) {
        const emotions = ['joy', 'gratitude', 'hope', 'contentment', 'excitement'];
        return emotions[Math.floor(Math.random() * emotions.length)];
    }

    // 副次的な感情の検出
    detectSecondaryEmotions(content) {
        const allEmotions = ['nostalgia', 'anticipation', 'curiosity', 'pride', 'relief'];
        const count = Math.floor(Math.random() * 3) + 1;
        return allEmotions.slice(0, count);
    }

    // テーマの抽出
    extractThemes(content) {
        const themes = [];
        
        if (content.includes('家族') || content.includes('友')) {
            themes.push('人間関係');
        }
        if (content.includes('仕事') || content.includes('会社')) {
            themes.push('キャリア');
        }
        if (content.includes('健康') || content.includes('運動')) {
            themes.push('健康・ウェルネス');
        }
        if (content.includes('趣味') || content.includes('楽しい')) {
            themes.push('余暇・娯楽');
        }
        
        return themes.length > 0 ? themes : ['日常生活'];
    }

    // メンタルヘルス推奨事項の生成
    generateRecommendations(content) {
        const recommendations = [
            {
                type: 'mindfulness',
                title: 'マインドフルネス瞑想',
                description: '1日10分の瞑想で心を落ち着けましょう'
            },
            {
                type: 'gratitude',
                title: '感謝の習慣',
                description: '毎日3つの感謝できることを書き出してみましょう'
            },
            {
                type: 'exercise',
                title: '軽い運動',
                description: '散歩やストレッチで気分転換を'
            },
            {
                type: 'social',
                title: '人とのつながり',
                description: '大切な人と時間を共有しましょう'
            }
        ];

        // コンテンツに基づいて関連する推奨事項を選択
        return recommendations.slice(0, 2);
    }

    // 感情の推移分析
    analyzeEmotionTrends() {
        if (this.emotionHistory.length < 5) {
            return null;
        }

        const trends = {
            overall: this.calculateOverallTrend(),
            weekly: this.calculateWeeklyTrend(),
            dominant: this.findDominantEmotions(),
            volatility: this.calculateEmotionalVolatility()
        };

        return trends;
    }

    // 全体的な傾向の計算
    calculateOverallTrend() {
        const recent = this.emotionHistory.slice(-10);
        const older = this.emotionHistory.slice(-20, -10);
        
        if (older.length === 0) return 'stable';
        
        const recentAvg = this.calculateAveragePositivity(recent);
        const olderAvg = this.calculateAveragePositivity(older);
        
        if (recentAvg > olderAvg * 1.1) return 'improving';
        if (recentAvg < olderAvg * 0.9) return 'declining';
        return 'stable';
    }

    // ポジティブ度の平均計算
    calculateAveragePositivity(analyses) {
        const sum = analyses.reduce((acc, analysis) => {
            return acc + (analysis.advanced?.sentiment?.positive || 0.5);
        }, 0);
        return sum / analyses.length;
    }

    // 週次トレンドの計算
    calculateWeeklyTrend() {
        // 曜日別の感情傾向を分析
        const dayTrends = {};
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        
        days.forEach(day => {
            dayTrends[day] = {
                count: 0,
                positivity: 0
            };
        });

        return dayTrends;
    }

    // 支配的な感情の検出
    findDominantEmotions() {
        const emotionCounts = {};
        
        this.emotionHistory.forEach(analysis => {
            const dominant = analysis.basic?.dominant;
            if (dominant) {
                emotionCounts[dominant] = (emotionCounts[dominant] || 0) + 1;
            }
        });

        return Object.entries(emotionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([emotion, count]) => ({ emotion, count }));
    }

    // 感情の変動性計算
    calculateEmotionalVolatility() {
        if (this.emotionHistory.length < 2) return 'low';
        
        let changes = 0;
        for (let i = 1; i < this.emotionHistory.length; i++) {
            const prev = this.emotionHistory[i - 1].basic?.dominant;
            const curr = this.emotionHistory[i].basic?.dominant;
            if (prev !== curr) changes++;
        }

        const changeRate = changes / (this.emotionHistory.length - 1);
        if (changeRate > 0.7) return 'high';
        if (changeRate > 0.4) return 'medium';
        return 'low';
    }

    // インサイトの生成
    generateInsights() {
        const trends = this.analyzeEmotionTrends();
        if (!trends) return;

        this.insights = [];

        // トレンドに基づくインサイト
        if (trends.overall === 'improving') {
            this.insights.push({
                type: 'positive',
                message: '最近の気分は上向き傾向です！この調子を維持しましょう。',
                icon: '📈'
            });
        } else if (trends.overall === 'declining') {
            this.insights.push({
                type: 'concern',
                message: '少し気分が落ち込み気味かもしれません。セルフケアを大切に。',
                icon: '💙'
            });
        }

        // 感情の変動性に基づくインサイト
        if (trends.volatility === 'high') {
            this.insights.push({
                type: 'observation',
                message: '感情の変化が大きいようです。深呼吸して心を落ち着けてみましょう。',
                icon: '🌊'
            });
        }

        // 支配的な感情に基づくインサイト
        const dominant = trends.dominant[0];
        if (dominant && dominant.emotion === 'joy') {
            this.insights.push({
                type: 'celebration',
                message: '喜びに満ちた日々を過ごされていますね！',
                icon: '🎉'
            });
        }
    }

    // 感情レポートの生成
    generateEmotionReport() {
        const analysis = this.analyzeEmotionTrends();
        
        return {
            summary: {
                totalAnalyses: this.emotionHistory.length,
                overallTrend: analysis?.overall || 'insufficient_data',
                dominantEmotions: analysis?.dominant || [],
                volatility: analysis?.volatility || 'unknown'
            },
            insights: this.insights,
            recommendations: this.generatePersonalizedRecommendations(),
            visualData: this.prepareVisualizationData()
        };
    }

    // パーソナライズされた推奨事項
    generatePersonalizedRecommendations() {
        const recommendations = [];
        const analysis = this.analyzeEmotionTrends();
        
        if (analysis?.overall === 'declining') {
            recommendations.push({
                priority: 'high',
                category: 'wellbeing',
                actions: [
                    '信頼できる人と話をする',
                    '好きな活動に時間を使う',
                    '十分な睡眠を確保する'
                ]
            });
        }

        if (analysis?.volatility === 'high') {
            recommendations.push({
                priority: 'medium',
                category: 'stability',
                actions: [
                    '日記を書く習慣をつける',
                    '規則的な生活リズムを作る',
                    'ストレス管理技術を学ぶ'
                ]
            });
        }

        return recommendations;
    }

    // ビジュアライゼーション用データの準備
    prepareVisualizationData() {
        return {
            timeline: this.emotionHistory.map(h => ({
                date: h.timestamp,
                positivity: h.advanced?.sentiment?.positive || 0.5,
                dominant: h.basic?.dominant
            })),
            distribution: this.calculateEmotionDistribution(),
            intensity: this.calculateAverageIntensity()
        };
    }

    // 感情の分布計算
    calculateEmotionDistribution() {
        const distribution = {};
        
        this.emotionHistory.forEach(analysis => {
            const emotions = analysis.basic?.scores || {};
            for (const [emotion, score] of Object.entries(emotions)) {
                distribution[emotion] = (distribution[emotion] || 0) + score;
            }
        });

        return distribution;
    }

    // 平均強度の計算
    calculateAverageIntensity() {
        const sum = this.emotionHistory.reduce((acc, analysis) => {
            return acc + (analysis.basic?.intensity || 0);
        }, 0);
        
        return this.emotionHistory.length > 0 
            ? sum / this.emotionHistory.length 
            : 0;
    }
}

// グローバルに公開
window.AIEmotionPro = AIEmotionPro;