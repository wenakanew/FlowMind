import * as dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });

async function main() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error("TELEGRAM_BOT_TOKEN is not set in .env");
        process.exit(1);
    }

    const webhookUrl = process.argv[2];
    if (!webhookUrl) {
        console.error("Usage: npx tsx scripts/set-telegram-webhook.ts <WEBHOOK_URL>");
        console.error("Example: npx tsx scripts/set-telegram-webhook.ts https://my-ngrok-url.app/api/webhooks/telegram");
        process.exit(1);
    }

    const apiUrl = `https://api.telegram.org/bot${token}/setWebhook`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl,
                // Optional: strictly defining allowed updates to minimize unnecessary traffic
                allowed_updates: ["message"]
            })
        });

        const data = await response.json();
        console.log("Telegram API Response:", data);
        if (data.ok) {
            console.log(`✅ Webhook successfully set to: ${webhookUrl}`);
        } else {
            console.error("❌ Failed to set webhook");
        }
    } catch (e) {
        console.error("Error setting webhook:", e);
    }
}

main();
