const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret_key);

admin.initializeApp();

// Stripe Checkoutセッションを作成
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
    // 認証確認
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'ログインが必要です'
        );
    }

    const userId = context.auth.uid;
    const userEmail = context.auth.token.email;

    try {
        // Stripe Checkoutセッションを作成
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: data.priceId, // Stripeダッシュボードで作成した価格ID
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: data.successUrl,
            cancel_url: data.cancelUrl,
            customer_email: userEmail,
            client_reference_id: userId,
            metadata: {
                userId: userId
            }
        });

        return { sessionId: session.id };
    } catch (error) {
        console.error('Stripe session creation error:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Checkoutセッションの作成に失敗しました'
        );
    }
});

// Stripe Webhookを処理（サブスクリプション状態の更新）
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = functions.config().stripe.webhook_secret;

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            webhookSecret
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // イベントタイプに応じて処理
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const userId = session.client_reference_id;

            // ユーザーのプレミアムステータスを更新
            await admin.firestore().collection('users').doc(userId).update({
                isPremium: true,
                stripeCustomerId: session.customer,
                stripeSubscriptionId: session.subscription,
                premiumStartDate: admin.firestore.FieldValue.serverTimestamp()
            });
            break;

        case 'customer.subscription.deleted':
            const subscription = event.data.object;
            
            // サブスクリプションがキャンセルされた場合
            const userSnapshot = await admin.firestore().collection('users')
                .where('stripeSubscriptionId', '==', subscription.id)
                .get();
            
            if (!userSnapshot.empty) {
                const userDoc = userSnapshot.docs[0];
                await userDoc.ref.update({
                    isPremium: false,
                    premiumEndDate: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            break;
    }

    res.json({ received: true });
});