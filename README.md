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

- Next.js 16 (App Router)
- React 19 & TypeScript
- Gemini API (`@google/genai`)
- Firebase Auth (Google sign-in)
- Notion as operational data store
- Telegram Bot API
- Twilio WhatsApp Sandbox
- Vitest for unit & integration testing
- Structured JSON Logger (`lib/logger.ts`)

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

### App & Observability

- `NEXT_PUBLIC_APP_URL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL_NAME`
- `CRON_SECRET` (used for protecting reminder dispatch cron API routes)
- `SENTRY_DSN` (optional, for production error tracking via `lib/logger.ts`)

### Notion

- `NOTION_API_KEY`
- `NOTION_TASKS_DATABASE_ID`
- `NOTION_PROJECTS_DATABASE_ID`
- `NOTION_KNOWLEDGE_DATABASE_ID`
- `NOTION_USERS_DATABASE_ID`
- `NOTION_PENDING_TELEGRAM_LINKS_DB_ID` (required for Telegram verification code storage)

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

### Fresh clone setup

1. Install dependencies:
   - `npm ci`
2. Copy env file and fill values:
   - `cp .env.example .env`
3. Run the app:
   - `npm run dev`
4. Open dashboard and sign in.
5. Link integrations.

### Build & Typecheck

- `npm run build`
- `npx tsc --noEmit`

### Code Quality & Testing

- Run unit & integration tests: `npm test`
- Run test suite with coverage report: `npm run test:coverage`
- Run linter: `npm run lint`
- Run dependency audit: `npm audit --audit-level=high`

### CI/CD Pipeline

Continuous Integration runs automatically on GitHub Actions ([.github/workflows/ci.yml](file:///.github/workflows/ci.yml)):
1. `npm ci` (Dependency installation)
2. `npm run lint` (ESLint style check)
3. `npx tsc --noEmit` (TypeScript type check)
4. `npm audit --audit-level=high` (Security dependency audit)
5. `npm test` (Vitest test suite execution)

Automated weekly dependency updates are handled via Dependabot ([.github/dependabot.yml](file:///.github/dependabot.yml)).

### Docker Compose

Start app + Redis with one command:

- `docker compose up --build`

## Production (Vercel)

1. Import project into Vercel.
2. Create required Notion databases:
   - **Pending Telegram Links DB**: Used for verification token storage (prevents serverless instance loss)
     - Create a database with these properties:
       - `Token` (Title) - The verification token
       - `Email` (Email)
       - `Name` (Rich Text)
       - `Avatar URL` (URL)
       - `Created At` (Number) - Unix timestamp
       - `Expires At` (Number) - Unix timestamp (30 min TTL)
3. Add all environment variables including `NOTION_PENDING_TELEGRAM_LINKS_DB_ID` and `CRON_SECRET`.
4. Deploy to production.
5. Set provider callbacks and webhooks:
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
- Structured logging format (`lib/logger.ts`) emits JSON payloads for production observability.

## License

Private project.
