// 高度な検索機能（プレミアム専用）
class AdvancedSearch {
    constructor() {
        this.searchIndex = [];
        this.tagDatabase = new Map();
        this.similarityThreshold = 0.65;
        this.initializeSearch();
    }

    // 検索エンジンの初期化
    initializeSearch() {
        // 既存のメモリーからインデックスを構築
        this.buildSearchIndex();
    }

    // 検索インデックスの構築
    buildSearchIndex() {
        const memories = window.memoryArchive?.memories || [];
        
        memories.forEach(memory => {
            this.addToIndex(memory);
        });
    }

    // インデックスへの追加
    addToIndex(memory) {
        const indexEntry = {
            id: memory.id,
            content: memory.content.toLowerCase(),
            date: memory.date,
            category: memory.category,
            tokens: this.tokenize(memory.content),
            tags: this.generateTags(memory),
            embedding: this.createEmbedding(memory.content)
        };

        this.searchIndex.push(indexEntry);
        
        // タグデータベースの更新
        indexEntry.tags.forEach(tag => {
            if (!this.tagDatabase.has(tag)) {
                this.tagDatabase.set(tag, []);
            }
            this.tagDatabase.get(tag).push(memory.id);
        });
    }

    // 自然言語検索
    async searchNaturalLanguage(query, options = {}) {
        // プレミアムユーザーチェック
        if (!window.authManager?.isPremiumUser()) {
            return {
                success: false,
                error: 'この機能はプレミアムプランでのみ利用可能です',
                showUpgrade: true
            };
        }

        try {
            // クエリの解析
            const parsedQuery = this.parseQuery(query);
            
            // 検索実行
            const results = await this.performSearch(parsedQuery, options);
            
            // 結果のランキング
            const rankedResults = this.rankResults(results, parsedQuery);
            
            // 関連する記憶の提案
            const suggestions = this.findSimilarMemories(rankedResults[0], 3);

            return {
                success: true,
                results: rankedResults,
                suggestions: suggestions,
                query: parsedQuery,
                totalFound: rankedResults.length
            };
        } catch (error) {
            console.error('Search failed:', error);
            return {
                success: false,
                error: '検索に失敗しました'
            };
        }
    }

    // クエリの解析
    parseQuery(query) {
        const parsed = {
            original: query,
            tokens: this.tokenize(query),
            intent: this.detectIntent(query),
            filters: this.extractFilters(query),
            keywords: this.extractKeywords(query)
        };

        return parsed;
    }

    // 検索意図の検出
    detectIntent(query) {
        const intents = {
            temporal: /いつ|昨日|今日|先週|先月|去年|[0-9]+月|[0-9]+日/,
            emotional: /嬉しい|悲しい|楽しい|辛い|幸せ|感動/,
            categorical: /家族|友達|仕事|趣味|ペット|食事/,
            similar: /似た|同じような|関連する/
        };

        for (const [intent, pattern] of Object.entries(intents)) {
            if (pattern.test(query)) {
                return intent;
            }
        }

        return 'general';
    }

    // フィルターの抽出
    extractFilters(query) {
        const filters = {};

        // 日付フィルター
        const dateMatch = query.match(/(\d{4}年)?(\d{1,2}月)?(\d{1,2}日)?/);
        if (dateMatch[0]) {
            filters.date = this.parseDateFilter(dateMatch);
        }

        // カテゴリーフィルター
        const categories = ['家族', '友達', 'ペット', '風景', '食事', '趣味', '仕事', 'その他'];
        categories.forEach(category => {
            if (query.includes(category)) {
                filters.category = category;
            }
        });

        // 感情フィルター
        const emotions = this.detectEmotionsInQuery(query);
        if (emotions.length > 0) {
            filters.emotions = emotions;
        }

        return filters;
    }

    // キーワードの抽出
    extractKeywords(query) {
        // ストップワードの除去
        const stopWords = ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'ため', 'など', 'これ', 'それ', 'あれ'];
        
        const tokens = this.tokenize(query);
        const keywords = tokens.filter(token => 
            !stopWords.includes(token) && token.length > 1
        );

        // TF-IDFスコアの計算（簡易版）
        const scores = this.calculateTFIDF(keywords);
        
        return keywords.sort((a, b) => scores[b] - scores[a]).slice(0, 5);
    }

    // 検索の実行
    async performSearch(parsedQuery, options) {
        let results = [...this.searchIndex];

        // フィルターの適用
        if (parsedQuery.filters.category) {
            results = results.filter(item => 
                item.category === parsedQuery.filters.category
            );
        }

        if (parsedQuery.filters.date) {
            results = results.filter(item => 
                this.matchDateFilter(item.date, parsedQuery.filters.date)
            );
        }

        // キーワード検索
        if (parsedQuery.keywords.length > 0) {
            results = results.filter(item => {
                const score = this.calculateRelevance(item, parsedQuery.keywords);
                return score > 0.3;
            });
        }

        // セマンティック検索（意味的類似性）
        if (parsedQuery.intent === 'similar' && options.useSemanticSearch) {
            results = this.semanticSearch(parsedQuery.original, results);
        }

        return results;
    }

    // 関連性スコアの計算
    calculateRelevance(item, keywords) {
        let score = 0;
        const contentLower = item.content.toLowerCase();

        keywords.forEach(keyword => {
            // 完全一致
            if (contentLower.includes(keyword)) {
                score += 1.0;
            }
            
            // 部分一致
            const partialMatches = this.findPartialMatches(keyword, item.tokens);
            score += partialMatches * 0.5;
            
            // タグマッチ
            if (item.tags.includes(keyword)) {
                score += 0.8;
            }
        });

        return score / keywords.length;
    }

    // 結果のランキング
    rankResults(results, parsedQuery) {
        return results.map(result => {
            const score = this.calculateRankingScore(result, parsedQuery);
            return { ...result, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    }

    // ランキングスコアの計算
    calculateRankingScore(result, parsedQuery) {
        let score = 0;

        // キーワード関連性
        const relevance = this.calculateRelevance(result, parsedQuery.keywords);
        score += relevance * 0.4;

        // 日付の新しさ
        const recency = this.calculateRecencyScore(result.date);
        score += recency * 0.2;

        // タグの一致度
        const tagMatch = this.calculateTagMatchScore(result.tags, parsedQuery.keywords);
        score += tagMatch * 0.3;

        // 意図との一致
        if (parsedQuery.intent === 'temporal' && parsedQuery.filters.date) {
            score += 0.1;
        }

        return score;
    }

    // 類似記憶の検索
    findSimilarMemories(referenceMemory, count = 5) {
        if (!referenceMemory) return [];

        const similarities = this.searchIndex
            .filter(item => item.id !== referenceMemory.id)
            .map(item => ({
                ...item,
                similarity: this.calculateSimilarity(referenceMemory, item)
            }))
            .filter(item => item.similarity > this.similarityThreshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, count);

        return similarities;
    }

    // 類似度の計算
    calculateSimilarity(item1, item2) {
        // コサイン類似度
        const cosineSim = this.cosineSimilarity(item1.embedding, item2.embedding);
        
        // カテゴリの一致
        const categoryMatch = item1.category === item2.category ? 0.2 : 0;
        
        // タグの重複
        const tagOverlap = this.calculateTagOverlap(item1.tags, item2.tags);
        
        return cosineSim * 0.6 + categoryMatch + tagOverlap * 0.2;
    }

    // 自動タグ生成
    generateTags(memory) {
        const tags = new Set();

        // カテゴリをタグとして追加
        tags.add(memory.category);

        // 日付関連のタグ
        const date = new Date(memory.date);
        tags.add(`${date.getFullYear()}年`);
        tags.add(`${date.getMonth() + 1}月`);
        tags.add(this.getSeasonTag(date));

        // 内容から抽出したタグ
        const contentTags = this.extractContentTags(memory.content);
        contentTags.forEach(tag => tags.add(tag));

        // 感情タグ
        if (memory.emotion) {
            tags.add(`感情_${memory.emotion.dominant}`);
        }

        return Array.from(tags);
    }

    // コンテンツからのタグ抽出
    extractContentTags(content) {
        const tags = [];

        // 人名パターン
        const namePattern = /([A-Z][a-z]+\s?){1,3}|[ぁ-ん゛゜ァ-ヴー]{2,4}(さん|くん|ちゃん)/g;
        const names = content.match(namePattern) || [];
        names.forEach(name => tags.push(`人物_${name}`));

        // 場所パターン
        const placePattern = /(駅|公園|店|カフェ|レストラン|ホテル|空港|病院|学校|会社)/g;
        const places = content.match(placePattern) || [];
        places.forEach(place => tags.push(`場所_${place}`));

        // イベントパターン
        const eventPattern = /(誕生日|結婚式|卒業|入学|旅行|パーティー|会議|デート)/g;
        const events = content.match(eventPattern) || [];
        events.forEach(event => tags.push(`イベント_${event}`));

        return tags;
    }

    // トークン化
    tokenize(text) {
        // 簡易的な日本語トークナイザー
        const tokens = text
            .toLowerCase()
            .replace(/[。、！？\s]+/g, ' ')
            .split(' ')
            .filter(token => token.length > 0);

        return tokens;
    }

    // 埋め込みベクトルの作成（簡易版）
    createEmbedding(text) {
        // 実際はWord2VecやBERTを使用
        const tokens = this.tokenize(text);
        const vector = new Array(100).fill(0);

        tokens.forEach((token, index) => {
            const hash = this.hashCode(token);
            const position = Math.abs(hash) % 100;
            vector[position] += 1;
        });

        // 正規化
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return vector.map(val => val / (magnitude || 1));
    }

    // ハッシュ関数
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    // コサイン類似度
    cosineSimilarity(vec1, vec2) {
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            magnitude1 += vec1[i] * vec1[i];
            magnitude2 += vec2[i] * vec2[i];
        }

        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);

        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }

        return dotProduct / (magnitude1 * magnitude2);
    }

    // 季節タグの取得
    getSeasonTag(date) {
        const month = date.getMonth() + 1;
        if (month >= 3 && month <= 5) return '春';
        if (month >= 6 && month <= 8) return '夏';
        if (month >= 9 && month <= 11) return '秋';
        return '冬';
    }

    // TF-IDFスコアの計算
    calculateTFIDF(keywords) {
        const scores = {};
        const totalDocs = this.searchIndex.length;

        keywords.forEach(keyword => {
            let df = 0;
            this.searchIndex.forEach(doc => {
                if (doc.content.includes(keyword)) {
                    df++;
                }
            });

            const idf = Math.log(totalDocs / (df + 1));
            scores[keyword] = idf;
        });

        return scores;
    }

    // タグの重複率計算
    calculateTagOverlap(tags1, tags2) {
        const set1 = new Set(tags1);
        const set2 = new Set(tags2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        return union.size > 0 ? intersection.size / union.size : 0;
    }

    // 部分一致の検索
    findPartialMatches(keyword, tokens) {
        let matches = 0;
        tokens.forEach(token => {
            if (token.includes(keyword) || keyword.includes(token)) {
                matches++;
            }
        });
        return matches;
    }

    // 日付フィルターのマッチング
    matchDateFilter(itemDate, filter) {
        const date = new Date(itemDate);
        
        if (filter.year && date.getFullYear() !== filter.year) {
            return false;
        }
        if (filter.month && date.getMonth() + 1 !== filter.month) {
            return false;
        }
        if (filter.day && date.getDate() !== filter.day) {
            return false;
        }

        return true;
    }

    // 日付フィルターの解析
    parseDateFilter(match) {
        const filter = {};
        
        if (match[1]) {
            filter.year = parseInt(match[1].replace('年', ''));
        }
        if (match[2]) {
            filter.month = parseInt(match[2].replace('月', ''));
        }
        if (match[3]) {
            filter.day = parseInt(match[3].replace('日', ''));
        }

        return filter;
    }

    // 感情の検出
    detectEmotionsInQuery(query) {
        const emotionKeywords = {
            joy: ['嬉しい', '楽しい', '幸せ'],
            sadness: ['悲しい', '寂しい', '辛い'],
            anger: ['怒り', 'イライラ', 'ムカつく'],
            fear: ['怖い', '不安', '心配'],
            love: ['愛', '好き', '大切']
        };

        const detected = [];
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            if (keywords.some(keyword => query.includes(keyword))) {
                detected.push(emotion);
            }
        }

        return detected;
    }
}

// グローバルに公開
window.AdvancedSearch = AdvancedSearch;