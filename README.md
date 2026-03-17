# FlowMind

FlowMind is an AI-powered workflow assistant you can use from your dashboard, Telegram, and WhatsApp.

It helps you:

- Manage tasks in Notion
- Connect Gmail, GitHub, and Google Calendar
- Interact through chat commands
- Keep your workflow in one place

## Live App

- Production URL: [https://flowmind.kaniujeffray.me](https://flowmind.kaniujeffray.me)

## Core Stack

- Next.js (App Router)
- TypeScript
- Gemini API
- Firebase Auth (Google sign-in)
- Notion as operational data store
- Telegram Bot API
- Twilio WhatsApp Sandbox

## Current Working Flow

1. Sign in with Google.
2. User profile syncs to Notion Users DB.
3. Link Telegram and/or WhatsApp in Integrations.
4. Connect Google (Gmail + Calendar) and GitHub with OAuth.
5. Send messages through Telegram/WhatsApp.
6. FlowMind executes task tools with user-scoped context.

## Integrations

### Messaging

- Telegram: linked username + webhook
- WhatsApp: linked number + Twilio webhook

### OAuth Tools

- Google OAuth
  - Gmail scopes
  - Calendar scope
- GitHub OAuth

## Public Legal Pages

Required for OAuth verification:

- Privacy Policy: /privacy-policy
- Terms of Service: /terms-of-service

## Environment Variables

Set these in local `.env` and in Vercel Project Settings.

### App

- `NEXT_PUBLIC_APP_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL_NAME`

### Notion

- `NOTION_API_KEY`
- `NOTION_TASKS_DATABASE_ID`
- `NOTION_PROJECTS_DATABASE_ID`
- `NOTION_KNOWLEDGE_DATABASE_ID`
- `NOTION_USERS_DATABASE_ID`

### Telegram

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_URL`

### Twilio

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `TWILIO_WEBHOOK_SECRET`

### Firebase

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`

### Google OAuth

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

### GitHub OAuth

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_OAUTH_REDIRECT_URI`

## Local Development

1. Install dependencies.
2. Add `.env` values.
3. Run dev server.
4. Open dashboard and sign in.
5. Link integrations.

## Production (Vercel)

1. Import project into Vercel.
2. Add all environment variables.
3. Deploy to production.
4. Set provider callbacks and webhooks:
   - Google callback: `https://flowmind.kaniujeffray.me/api/integrations/google/callback`
   - GitHub callback: `https://flowmind.kaniujeffray.me/api/integrations/github/callback`
   - Telegram webhook: `https://flowmind.kaniujeffray.me/api/webhooks/telegram`
   - Twilio webhook: `https://flowmind.kaniujeffray.me/api/webhooks/whatsapp`

## How to Use FlowMind

### In Dashboard

- Go to Integrations
- Link Telegram and WhatsApp
- Connect Google and GitHub
- Use Tasks, Projects, and Flows pages

### In Telegram / WhatsApp

Example commands:

- "What are my tasks for today?"
- "Create a task: Follow up on API bug"
- "Show my pending tasks"

## Notes

- Data access is user-scoped for linked messaging identities.
- If an integration fails, verify callback URL and env values first.

## License

Private project.



