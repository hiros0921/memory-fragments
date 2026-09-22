// Historical browser checkout reference, extracted from commit e72ae24.
// NOT included in the public build or loaded by the app. Not a runnable demo.
// Requires the former Firebase/Stripe bindings and UI; retain as portfolio evidence.
// No claim of production readiness: server price validation, paid-state verification,
// webhook retry safety, and a real trial configuration need review before any reuse.
        // 決済処理を開始
        async function startCheckout() {
            if (!currentUser) {
                Toast.warning('ログインしてください');
                return;
            }

            try {
                // ローディング表示
                const checkoutBtn = event.target;
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = '処理中...';

                // Firebase Functionsを呼び出してCheckoutセッションを作成
                // 注意：この関数はFirebase Functionsで実装する必要があります
                const createCheckoutSession = functions.httpsCallable('createCheckoutSession');
                const { data } = await createCheckoutSession({
                    priceId: 'price_1Rtt4MRritviSYbGuwIDp1WW', // Memory Fragments プレミアム月額500円
                    successUrl: window.location.origin + '?success=true',
                    cancelUrl: window.location.origin + '?canceled=true',
                });

                // Stripe Checkoutにリダイレクト
                const result = await stripe.redirectToCheckout({
                    sessionId: data.sessionId
                });

                if (result.error) {
                    Toast.error('エラーが発生しました: ' + result.error.message);
                }
            } catch (error) {
                console.error('Checkout error:', error);
                Toast.error('現在、決済機能の設定中です。詳細は開発者にお問い合わせください。', { duration: 6000 });
            } finally {
                // ボタンを元に戻す
                const checkoutBtn = event.target;
                if (checkoutBtn) {
                    checkoutBtn.disabled = false;
                    checkoutBtn.textContent = '今すぐアップグレード ✨';
                }
            }
        }
