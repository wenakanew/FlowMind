# FlowMind

**AI-Powered Personal Workflow Operating System**

FlowMind is an intelligent automation platform that turns your workspace into an **AI-powered operating system for your digital life and work**. Instead of manually switching between dozens of tools, FlowMind allows users to interact with their entire workflow through a **simple chat interface** powered by AI.

FlowMind connects messaging platforms, productivity tools, scheduling systems, and developer environments into a **single autonomous AI workflow engine**.

Users can communicate with their system through chat platforms such as **Telegram** or **WhatsApp**, while the AI agent uses **Notion** as its contextual brain to automate tasks, manage projects, and execute real-world digital actions.

---

# Current Flow (Implemented Now)

This is the real flow currently running in the app:

1. User signs in with Google via Firebase Auth.
2. User profile is synced into Notion Users database.
3. User links Telegram or WhatsApp from dashboard.
4. Messaging identity is verified:
	- Telegram via deep-link `/start` verification token
	- WhatsApp via Twilio code verification
5. Incoming webhook message is mapped to the linked Notion user.
6. AI runs with that user context only.
7. AI reads/creates Notion tasks and replies in the same channel.

Important account rules currently enforced:

- One Telegram account per user.
- One WhatsApp number per user.
- To switch, user must delete the existing connection first.

For local testing, one tunnel URL is used for both channels:

- Telegram: `/api/webhooks/telegram`
- WhatsApp: `/api/webhooks/whatsapp`

---

# Project Vision

Modern work is fragmented.

Your:

* tasks live in task managers
* notes live in documents
* conversations happen in messaging apps
* code lives in repositories
* meetings live in calendars

AI assistants today often operate **outside of your workflow**, lacking the context needed to be truly helpful.

FlowMind solves this by making **Notion the central intelligence layer** and allowing AI agents to access and automate the tools users already rely on daily.

Instead of navigating dashboards and apps, users simply **chat with their AI system**, which understands context and performs actions across integrated platforms.

---

# What FlowMind Does

FlowMind transforms a collection of disconnected productivity tools into a **unified AI automation system**.

The platform enables users to:

* Manage tasks and projects
* Automate workflows
* Schedule meetings
* Send emails
* Execute developer tasks
* Analyze project data
* Perform browser automation
* Manage daily planning

All through **natural language chat commands**.

Example interaction:

User message on Telegram:

```
Plan my day and start working on the login bug.
```

FlowMind will:

1. Read the user’s task list from Notion
2. Identify priority tasks
3. Check upcoming meetings
4. Locate the relevant GitHub issue
5. Suggest an execution plan
6. Begin automated actions where applicable

---

# Core Features

## AI Workflow Automation

FlowMind acts as an intelligent automation engine capable of executing multi-step workflows across multiple services.

Example workflow:

```
User Command:
Prepare the meeting summary and email it to the team.
```

AI Execution:

1. Retrieve meeting notes
2. Summarize discussion
3. Generate structured report
4. Send email through Gmail
5. Log the summary in Notion

---

## Chat-Based AI Operating System

FlowMind’s primary interface is conversational.

Users interact through messaging platforms including:

* **Telegram**
* **WhatsApp** via **Twilio**

This allows the system to be accessed from anywhere without requiring a traditional application interface.

---

## Context-Aware AI

FlowMind’s intelligence is powered by contextual knowledge stored in **Notion**.

The AI agent uses Notion databases to understand:

* tasks
* projects
* deadlines
* documentation
* personal knowledge

This allows the AI to make informed decisions rather than operating blindly.

---

## AI Developer Assistant

FlowMind can assist developers by interacting with code repositories hosted on **GitHub**.

Capabilities include:

* analyzing issues
* generating code suggestions
* creating pull requests
* summarizing repository activity
* debugging support

---

## Intelligent Scheduling

FlowMind integrates with **Cal.com** to handle scheduling tasks such as:

* creating meetings
* managing availability
* generating booking links
* coordinating events

---

# The FlowMind Dashboard

While most interaction occurs through chat, FlowMind provides a web dashboard where users can configure their system.

The dashboard is built using **Next.js** and hosted on **Vercel**.

---

# What Exists on the User Dashboard

The dashboard acts as a **control center** for system configuration.

Users can manage:

### Account Information

* user profile
* email
* authentication settings

Authentication is handled through **Firebase**.

---

### Connected Integrations

Users can link external services such as:

* Telegram
* WhatsApp
* GitHub
* Gmail
* Cal.com

The dashboard currently provides first-class linking/management for Telegram and WhatsApp.

---

### AI Settings

Users can configure:

* default AI behavior
* automation preferences
* notification settings
* workflow permissions

---

### Activity Logs

Users can view system activity including:

* executed tasks
* automated workflows
* integration activity
* AI interactions

---

### Subscription Plan

Subscription and billing tiers are roadmap items.

Current implementation focus is:

* authentication
* Notion-backed user/task context
* Telegram/WhatsApp linking + verified chat access

---

# What Is Required From the User

To start using FlowMind, the user must:

1. Create an account
2. Connect their Notion workspace
3. Link at least one messaging platform
4. Configure desired integrations

Once setup is complete, the user can interact with FlowMind entirely through chat.

---

# Technical Architecture

FlowMind is built as a distributed AI automation system composed of several layers.

---

# Frontend Layer

The frontend dashboard is built using:

* **Next.js**
* **TypeScript**

This allows a unified codebase for both frontend and backend logic.

Deployment is handled through **Vercel**.

---

# Backend Layer

The backend consists of serverless API routes responsible for:

* receiving chat messages
* orchestrating AI agents
* executing integrations
* handling authentication

These APIs run as Vercel serverless functions.

---

# AI Agent Layer

The AI reasoning engine is powered by **Gemini**.

The agent is responsible for:

* understanding user intent
* selecting available tools
* executing supported actions
* generating responses

Current tool surface in production code is task-focused (read/create tasks in Notion).

---

# Context and Memory Layer

FlowMind uses **Notion** as its central knowledge base.

Notion databases store:

* tasks
* project information
* documentation
* workflow context

This provides persistent memory for the AI system.

---

# Messaging Layer

The messaging interface includes:

Telegram Bot Integration using **Telegram**

WhatsApp Integration using **Twilio**

Messages are received through webhooks and forwarded to the FlowMind backend.

Implemented webhook routes:

* Telegram: `/api/webhooks/telegram`
* WhatsApp: `/api/webhooks/whatsapp`
* WhatsApp status callback: `/api/webhooks/whatsapp/status`

WhatsApp Sandbox linking UX currently includes:

* simple step-by-step join instructions
* copy button for sandbox phone number
* copy button for sandbox join code
* manage mode (delete existing number before adding another)

---

# Scheduling Layer

Scheduling functionality is implemented using **Cal.com**.

This allows the AI agent to:

* create meeting events
* generate booking links
* manage scheduling availability

---

# Authentication and User Data

User authentication is handled by **Firebase**.

Operational user data is stored in **Notion** (Users database).

Currently:

* user accounts
* session authentication
* identity assertion for account-scoped actions

Notion manages:

* linked Telegram username
* linked WhatsApp number
* task/project/knowledge records

---

# Automation Layer

For browser-based automation tasks, FlowMind uses **Playwright**.

This enables AI agents to:

* interact with websites
* automate repetitive workflows
* perform data extraction

---

# External Service Integrations

FlowMind can integrate with:

* **Gmail**
* **GitHub**
* **Cal.com**
* **Notion**
* **Telegram**
* **WhatsApp**

Each integration extends the capabilities of the AI automation engine.

---

# Deployment

FlowMind is deployed using **Vercel**.

Deployment benefits include:

* automatic scaling
* serverless architecture
* global edge performance
* simple CI/CD pipelines

---

# Example System Workflow

User sends a Telegram message:

```
Start working on the authentication bug.
```

FlowMind performs the following steps:

1. Receives message via Telegram webhook
2. Sends request to backend API
3. AI agent interprets intent
4. Agent retrieves project context from Notion
5. Finds related GitHub issue
6. Generates task plan
7. Updates Notion task status
8. Responds to user with progress summary

---

# Why FlowMind Matters

FlowMind demonstrates how AI agents can move beyond simple chat assistants to become **autonomous workflow orchestrators**.

By combining contextual knowledge, messaging interfaces, and automation tools, FlowMind represents a new paradigm where users interact with their digital environment through **intelligent conversational interfaces**.

---

# Future Development

Future iterations of FlowMind may include:

* additional messaging platform integrations
* deeper developer environment automation
* advanced AI workflow agents
* enterprise collaboration features
* cross-platform productivity intelligence

---


