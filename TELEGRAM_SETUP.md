# Telegram Verification Setup Guide

## Problem Solved
The in-memory pending token storage didn't work in Vercel's serverless environment because each request could hit a different server instance. This caused verification to fail when the user clicked the Telegram link on a different instance than where the token was created.

## Solution Implemented
Pending verification tokens are now stored in a dedicated Notion database that persists across all serverless instances.

## Setup Steps

### 1. Create Pending Telegram Links Database in Notion

Create a new database with the following properties:

| Property Name | Property Type | Description |
|---|---|---|
| Token | Title | The verification token (indexed for fast lookup) |
| Email | Email | User's email address |
| Name | Rich Text | User's name |
| Avatar URL | URL | Optional user avatar URL |
| Created At | Number | Unix timestamp when created |
| Expires At | Number | Unix timestamp when link expires (30 min TTL) |

### 2. Add Environment Variable

Add to Vercel Project Settings and local `.env`:

```
NOTION_PENDING_TELEGRAM_LINKS_DB_ID=your_database_id_here
```

Copy the database ID from the Notion database URL:
```
https://www.notion.so/workspace_id/YOUR_DATABASE_ID?v=...
                            ^^^^^^^^^^^^^^^^^^^^^^^^
```

### 3. Deploy

Push the latest code to production. The changes are:

- `lib/telegram-link-verification.ts` - Now uses Notion instead of in-memory Map
- `app/api/integrations/telegram/link/route.ts` - Creates async pending link
- `app/api/webhooks/telegram/route.ts` - Consumes async pending link

### 4. Test Flow

1. Go to Dashboard → Integrations
2. Click "Link" on Telegram card
3. Modal appears without username field
4. Click "Connect" button
5. You receive a deep-link: `https://t.me/YOUR_BOT?start=flowmind_link_TOKEN`
6. Click the link (opens Telegram app)
7. Bot automatically shows with `/start flowmind_link_TOKEN` in input
8. Send the message or let it auto-send
9. Bot verifies the token in Notion DB
10. Bot responds: "✅ Telegram verified and linked successfully."
11. Dashboard shows Telegram as "Linked"

## How It Works Now

### Token Creation (User clicks "Connect")
```
POST /api/integrations/telegram/link
→ Creates pending link in Notion DB
→ Returns deep-link: https://t.me/bot?start=flowmind_link_ABC123...
```

### Verification (User sends /start in Telegram)
```
Telegram webhook receives: /start flowmind_link_ABC123...
→ Extracts token: ABC123...
→ Queries Notion DB for Token property
→ If found and not expired:
   - Stores telegramChatId + username in Users DB
   - Archives the pending link (marks as used)
   - Sends success message
→ If expired or not found:
   - Sends error message: "Link expired, please reconnect from dashboard"
```

## Troubleshooting

### "Token expired" error
- The 30-minute TTL may have passed. Ask user to click "Link" again in dashboard.

### "Verification failed" error
- Check `NOTION_PENDING_TELEGRAM_LINKS_DB_ID` is set in Vercel
- Check Notion database properties match expected schema
- Check Notion API key has permission to create pages

### Telegram link shows but bot doesn't respond
- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_URL` are correct
- Check Telegram webhook is properly registered

## Database Cleanup

Pending links are automatically archived (not deleted) when:
1. Successfully consumed
2. Queried after 30-minute expiration

To manually clean up, search for archived pages in the Pending Telegram Links database.

## Future Improvements

- Add UI to view/debug pending links
- Add admin endpoint to manually expire links
- Add metrics: token creation rate, verification success rate, average time to verify
