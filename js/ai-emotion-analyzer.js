// AI感情分析機能（プレミアム専用）
class AIEmotionAnalyzer {
    constructor() {
        this.emotions = {
            positive: {
                keywords: ['嬉しい', '楽しい', '幸せ', '最高', '素晴らしい', '良い', '好き', '愛', 'ありがとう', '感謝', '喜び', '笑', '満足', '成功', '達成', '祝', '楽しみ', 'わくわく', 'ドキドキ'],
                emoji: '😊',
                color: '#10b981',
                label: '幸せ・喜び'
            },
            negative: {
                keywords: ['悲しい', '辛い', '苦しい', '痛い', '嫌', '最悪', '失敗', '後悔', '寂しい', '泣', '涙', '不安', '心配', '怖い', '恐怖', 'ストレス', '疲れ', 'がっかり'],
                emoji: '😢',
                color: '#3b82f6',
                label: '悲しみ・不安'
            },
            angry: {
                keywords: ['怒り', '腹立つ', 'むかつく', 'イライラ', '許せない', '頭にくる', '憤り', '不満', '文句', '愚痴'],
                emoji: '😡',
                color: '#ef4444',
                label: '怒り・不満'
            },
            love: {
                keywords: ['愛してる', '大好き', '恋', 'デート', 'キス', 'ハグ', '彼氏', '彼女', '恋人', '結婚', 'プロポーズ', '記念日', 'バレンタイン'],
                emoji: '💕',
                color: '#ec4899',
                label: '愛・恋愛'
            },
            excited: {
                keywords: ['興奮', 'やった', '最高', 'すごい', '感動', '驚き', 'びっくり', 'サプライズ', '祝い', 'パーティー', 'イベント', '楽しみ'],
                emoji: '🎉',
                color: '#f59e0b',
                label: '興奮・感動'
            },
            peaceful: {
                keywords: ['穏やか', '平和', 'リラックス', '落ち着', '静か', '癒し', '休息', '眠', '瞑想', 'のんびり', 'ゆっくり'],
                emoji: '😌',
                color: '#8b5cf6',
                label: '平穏・安らぎ'
            },
            nostalgic: {
                keywords: ['懐かしい', '思い出', '昔', '子供の頃', '学生時代', '青春', '記憶', '過去', 'あの頃', 'タイムスリップ'],
                emoji: '🌅',
                color: '#f97316',
                label: '懐かしさ'
            }
        };

        this.sentimentPatterns = {
            veryPositive: /とても.*?(良|嬉しい|楽しい|幸せ)|最高|素晴らしい|感動的|完璧/gi,
            positive: /良い|嬉しい|楽しい|幸せ|好き|ありがとう/gi,
            veryNegative: /とても.*?(悪|悲しい|辛い|苦しい)|最悪|ひどい|耐えられない/gi,
            negative: /悪い|悲しい|辛い|苦しい|嫌い|つらい/gi
        };
    }

    // 感情分析実行
    async analyzeEmotion(text, options = {}) {
        if (!text || text.length < 5) {
            return this.getDefaultAnalysis();
        }

        // 基本的な感情分析
        const basicAnalysis = this.performBasicAnalysis(text);
        
        // プレミアムユーザーの場合、高度な分析を追加
        if (options.isPremium) {
            const advancedAnalysis = await this.performAdvancedAnalysis(text);
            return this.mergeAnalyses(basicAnalysis, advancedAnalysis);
        }

        return basicAnalysis;
    }

    // 基本的な感情分析
    performBasicAnalysis(text) {
        const analysis = {
            primaryEmotion: null,
            secondaryEmotions: [],
            sentiment: 0, // -1 to 1
            emotionScores: {},
            keywords: [],
            summary: '',
            insights: []
        };

        // 各感情カテゴリのスコアを計算
        for (const [emotionKey, emotion] of Object.entries(this.emotions)) {
            const score = this.calculateEmotionScore(text, emotion.keywords);
            analysis.emotionScores[emotionKey] = score;
        }

        // 最も高いスコアの感情を特定
        const sortedEmotions = Object.entries(analysis.emotionScores)
            .sort((a, b) => b[1] - a[1]);

        if (sortedEmotions[0][1] > 0) {
            analysis.primaryEmotion = {
                type: sortedEmotions[0][0],
                ...this.emotions[sortedEmotions[0][0]],
                score: sortedEmotions[0][1]
            };
        }

        // 副次的な感情
        for (let i = 1; i < Math.min(3, sortedEmotions.length); i++) {
            if (sortedEmotions[i][1] > 0.2) {
                analysis.secondaryEmotions.push({
                    type: sortedEmotions[i][0],
                    ...this.emotions[sortedEmotions[i][0]],
                    score: sortedEmotions[i][1]
                });
            }
        }

        // センチメント分析
        analysis.sentiment = this.calculateSentiment(text);

        // キーワード抽出
        analysis.keywords = this.extractKeywords(text);

        // サマリー生成
        analysis.summary = this.generateSummary(analysis);

        return analysis;
    }

    // 高度な分析（プレミアム機能）
    async performAdvancedAnalysis(text) {
        const advancedAnalysis = {
            insights: [],
            patterns: [],
            recommendations: [],
            emotionalJourney: [],
            timeAnalysis: null
        };

        // テキストの長さに基づく分析
        if (text.length > 100) {
            // テキストを段落に分割して感情の変化を追跡
            const paragraphs = text.split(/\n\n|\n/).filter(p => p.length > 10);
            advancedAnalysis.emotionalJourney = paragraphs.map((para, index) => {
                const emotion = this.performBasicAnalysis(para);
                return {
                    position: index,
                    text: para.substring(0, 50) + '...',
                    emotion: emotion.primaryEmotion?.emoji || '😐',
                    sentiment: emotion.sentiment
                };
            });
        }

        // パターン認識
        advancedAnalysis.patterns = this.detectPatterns(text);

        // インサイト生成
        advancedAnalysis.insights = this.generateInsights(text, advancedAnalysis.patterns);

        // レコメンデーション
        advancedAnalysis.recommendations = this.generateRecommendations(advancedAnalysis);

        // 時間に関する分析
        advancedAnalysis.timeAnalysis = this.analyzeTimeReferences(text);

        return advancedAnalysis;
    }

    // 感情スコア計算
    calculateEmotionScore(text, keywords) {
        let score = 0;
        const lowerText = text.toLowerCase();

        for (const keyword of keywords) {
            const regex = new RegExp(keyword, 'gi');
            const matches = lowerText.match(regex);
            if (matches) {
                score += matches.length * (1 / keywords.length);
            }
        }

        // 文字数で正規化
        return Math.min(1, score * (100 / text.length));
    }

    // センチメント計算
    calculateSentiment(text) {
        let score = 0;

        // ポジティブ/ネガティブパターンのマッチング
        const veryPositiveMatches = text.match(this.sentimentPatterns.veryPositive);
        const positiveMatches = text.match(this.sentimentPatterns.positive);
        const veryNegativeMatches = text.match(this.sentimentPatterns.veryNegative);
        const negativeMatches = text.match(this.sentimentPatterns.negative);

        if (veryPositiveMatches) score += veryPositiveMatches.length * 0.3;
        if (positiveMatches) score += positiveMatches.length * 0.1;
        if (veryNegativeMatches) score -= veryNegativeMatches.length * 0.3;
        if (negativeMatches) score -= negativeMatches.length * 0.1;

        // -1 to 1 の範囲に正規化
        return Math.max(-1, Math.min(1, score / 10));
    }

    // キーワード抽出
    extractKeywords(text) {
        const keywords = [];
        const allKeywords = Object.values(this.emotions).flatMap(e => e.keywords);

        for (const keyword of allKeywords) {
            if (text.includes(keyword)) {
                keywords.push(keyword);
            }
        }

        return [...new Set(keywords)].slice(0, 5);
    }

    // パターン検出
    detectPatterns(text) {
        const patterns = [];

        // 疑問文の検出
        if (text.match(/[？?]/g)?.length > 2) {
            patterns.push({ type: 'questioning', label: '多くの疑問を含む' });
        }

        // 感嘆文の検出
        if (text.match(/[！!]/g)?.length > 3) {
            patterns.push({ type: 'exclamation', label: '強い感情表現' });
        }

        // 繰り返しの検出
        const words = text.split(/\s+/);
        const wordCounts = {};
        words.forEach(word => {
            if (word.length > 2) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });
        const repeatedWords = Object.entries(wordCounts)
            .filter(([word, count]) => count > 3)
            .map(([word]) => word);
        
        if (repeatedWords.length > 0) {
            patterns.push({ 
                type: 'repetition', 
                label: '繰り返し表現',
                words: repeatedWords
            });
        }

        return patterns;
    }

    // インサイト生成
    generateInsights(text, patterns) {
        const insights = [];

        // 文章の長さに基づくインサイト
        if (text.length > 500) {
            insights.push('詳細な記録をされていますね。振り返りに最適です。');
        } else if (text.length < 50) {
            insights.push('簡潔な記録です。後で詳細を追加してみては？');
        }

        // パターンに基づくインサイト
        patterns.forEach(pattern => {
            switch (pattern.type) {
                case 'questioning':
                    insights.push('多くの疑問や不確実性を感じているようです。');
                    break;
                case 'exclamation':
                    insights.push('強い感情が表現されています。');
                    break;
                case 'repetition':
                    insights.push(`「${pattern.words[0]}」という言葉が繰り返されています。重要なポイントかもしれません。`);
                    break;
            }
        });

        return insights;
    }

    // レコメンデーション生成
    generateRecommendations(analysis) {
        const recommendations = [];

        if (analysis.emotionalJourney?.length > 3) {
            const emotionChanges = analysis.emotionalJourney.filter((e, i) => 
                i > 0 && e.sentiment !== analysis.emotionalJourney[i-1].sentiment
            ).length;

            if (emotionChanges > 2) {
                recommendations.push('感情の変化が多い一日でした。リラックスする時間を作りましょう。');
            }
        }

        return recommendations;
    }

    // 時間参照の分析
    analyzeTimeReferences(text) {
        const timePatterns = {
            morning: /朝|午前|モーニング|起床|目覚め/gi,
            afternoon: /昼|午後|ランチ|お昼/gi,
            evening: /夕方|夕食|夕暮れ/gi,
            night: /夜|深夜|就寝|眠/gi,
            past: /昔|以前|かつて|昨日|先週|先月|去年/gi,
            future: /明日|来週|来月|来年|将来|今後/gi
        };

        const timeAnalysis = {};
        for (const [time, pattern] of Object.entries(timePatterns)) {
            const matches = text.match(pattern);
            if (matches) {
                timeAnalysis[time] = matches.length;
            }
        }

        return Object.keys(timeAnalysis).length > 0 ? timeAnalysis : null;
    }

    // サマリー生成
    generateSummary(analysis) {
        if (!analysis.primaryEmotion) {
            return '感情を特定できませんでした。';
        }

        const emotion = analysis.primaryEmotion;
        let summary = `${emotion.emoji} ${emotion.label}を感じる内容です。`;

        if (analysis.sentiment > 0.5) {
            summary += ' とてもポジティブな記憶ですね。';
        } else if (analysis.sentiment < -0.5) {
            summary += ' 少し辛い経験だったようです。';
        }

        if (analysis.secondaryEmotions.length > 0) {
            const secondary = analysis.secondaryEmotions.map(e => e.emoji).join('');
            summary += ` 他にも${secondary}の感情が含まれています。`;
        }

        return summary;
    }

    // 分析結果のマージ
    mergeAnalyses(basic, advanced) {
        return {
            ...basic,
            ...advanced,
            insights: [...basic.insights, ...advanced.insights],
            isPremiumAnalysis: true
        };
    }

    // デフォルト分析結果
    getDefaultAnalysis() {
        return {
            primaryEmotion: {
                type: 'neutral',
                emoji: '😐',
                color: '#6b7280',
                label: '中立',
                score: 0
            },
            secondaryEmotions: [],
            sentiment: 0,
            emotionScores: {},
            keywords: [],
            summary: 'テキストが短すぎて分析できません。',
            insights: []
        };
    }

    // 分析結果の表示UI
    createAnalysisUI(analysis) {
        const isPremium = analysis.isPremiumAnalysis;

        return `
            <div class="emotion-analysis bg-purple-900/20 backdrop-blur-lg rounded-xl p-4 mt-4 border border-purple-400/30">
                <h4 class="text-lg font-bold mb-3 text-purple-300">
                    🤖 AI感情分析
                    ${isPremium ? '<span class="text-xs ml-2 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">PREMIUM</span>' : ''}
                </h4>
                
                <div class="primary-emotion mb-4 text-center">
                    <div class="text-4xl mb-2">${analysis.primaryEmotion?.emoji || '😐'}</div>
                    <div class="text-lg font-semibold" style="color: ${analysis.primaryEmotion?.color || '#6b7280'}">
                        ${analysis.primaryEmotion?.label || '分析中...'}
                    </div>
                    <div class="sentiment-bar mt-2">
                        <div class="w-full bg-gray-700 rounded-full h-2">
                            <div class="h-2 rounded-full transition-all duration-500" 
                                 style="width: ${50 + (analysis.sentiment * 50)}%; 
                                        background: linear-gradient(to right, #ef4444, #10b981)">
                            </div>
                        </div>
                        <div class="text-xs mt-1 text-gray-400">
                            センチメント: ${analysis.sentiment > 0 ? 'ポジティブ' : analysis.sentiment < 0 ? 'ネガティブ' : 'ニュートラル'}
                        </div>
                    </div>
                </div>

                ${analysis.secondaryEmotions.length > 0 ? `
                    <div class="secondary-emotions mb-4">
                        <div class="text-sm text-gray-400 mb-2">その他の感情:</div>
                        <div class="flex gap-2 justify-center">
                            ${analysis.secondaryEmotions.map(e => `
                                <span class="text-2xl" title="${e.label}">${e.emoji}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="summary mb-4 text-sm text-gray-300">
                    ${analysis.summary}
                </div>

                ${analysis.keywords.length > 0 ? `
                    <div class="keywords mb-4">
                        <div class="text-sm text-gray-400 mb-2">キーワード:</div>
                        <div class="flex flex-wrap gap-2">
                            ${analysis.keywords.map(keyword => `
                                <span class="px-2 py-1 bg-purple-800/30 rounded-full text-xs">
                                    ${keyword}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${isPremium && analysis.insights.length > 0 ? `
                    <div class="insights mb-4">
                        <div class="text-sm text-gray-400 mb-2">インサイト:</div>
                        <ul class="text-sm text-gray-300 space-y-1">
                            ${analysis.insights.map(insight => `
                                <li class="flex items-start">
                                    <span class="mr-2">💡</span>
                                    <span>${insight}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${isPremium && analysis.emotionalJourney?.length > 0 ? `
                    <div class="emotional-journey mb-4">
                        <div class="text-sm text-gray-400 mb-2">感情の変化:</div>
                        <div class="flex gap-1 justify-center">
                            ${analysis.emotionalJourney.map(e => `
                                <span class="text-xl" title="${e.text}">${e.emotion}</span>
                            `).join(' → ')}
                        </div>
                    </div>
                ` : ''}

                ${!isPremium ? `
                    <div class="upgrade-prompt mt-4 p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg">
                        <p class="text-xs text-gray-300">
                            🌟 プレミアムにアップグレードして、より詳細な感情分析とインサイトを取得しましょう
                        </p>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

// グローバルインスタンス
const aiEmotionAnalyzer = new AIEmotionAnalyzer();