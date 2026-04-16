# KON-NECT — Server Guide

This is the back-end of KON-NECT. It handles everything that happens behind the scenes — user accounts, live location sharing, chat, friend connections, and all the smart matching that powers the app.

---

## What the Server Does

The server is the brain of KON-NECT. Every time you open the map, send a message, or connect with someone, the server is doing the work. It talks to the database, manages live connections, and enforces all the rules that keep the platform safe and private.

---

## Core Capabilities

### 👤 User Accounts
- **Sign up with email & password** — passwords are hashed and never stored in plain text
- **Sign in with Google** — one-click login using your Google account
- **Forgot password** — generates a secure temporary password shown only to you
- **Change password** — update your password any time from your profile
- **Delete account** — fully removes your profile, friend connections, and requests from the system instantly

### 📍 Live Location
- Your location updates live as you move, keeping the map accurate for nearby users
- The server stores only your general area, not a precise pin-point
- Location is used only for discovery — it is never sold or shared

### 🔍 People Discovery
The server has three ways to find people for you:

- **Nearby + Interest Match**: Finds everyone within 20km who shares at least one of your interests, then ranks them by how many interests you have in common
- **Discover Mode**: Finds the 50 nearest people to you (regardless of interests) and sorts them by how well they match your profile
- **Global View**: Shows all users on the platform sorted by match score, for when you want to explore beyond your local area

Blocked users and users who have blocked you are automatically excluded from all results.

### 🤝 Friend Connections
- Send a friend request to anyone you find on the platform
- If the other person already sent you a request, you are connected instantly (auto-accept)
- Accept, decline, or withdraw requests at any time
- Unfriend removes the connection from both sides
- Special bot users (used for testing) auto-accept requests immediately

### 💬 Encrypted Persistent Chat
All messages between friends are:
- **Encrypted** with AES before being stored — the server holds encrypted data, not plain text
- **Persistent** — your full conversation history is restored when you reopen the chat
- **Status-tracked** — messages transition from *Sent → Delivered → Read*, similar to blue ticks
- **Unread counts** are tracked per conversation so friends lists always show accurate notification badges

### 🚫 Safety & Blocking
- Blocking a user instantly removes them from your map, friend list, and future search results
- Both sides are notified live so no ghost profiles appear
- Accounts can be unblocked at any time from your profile settings

### 🛡️ Content Moderation
- All interests submitted by users are run through a moderation filter
- Flagged content triggers a **warning** logged against the account
- Repeated violations (6 strikes) result in automatic account termination, with all connections cleaned up instantly
- The system is fully automatic — no manual review needed

### 📊 Local Statistics
The server computes live stats for your home dashboard:
- **Friends active nearby** — how many of your mutual friends are within 20km in the last 24 hours
- **Matched interest count** — how many of your unique interests are shared by nearby users
- **Trending Near You** — the top 5 most popular interests within 20km, updated on every page load

### 🔔 Real-time Notifications
Using a live connection (no polling needed), the server immediately tells your device when:
- Someone sends you a friend request
- A friend request is accepted or declined
- A new chat message arrives
- A friend comes online or goes offline
- You are blocked or removed (your screen updates instantly)
- Someone is getting directions to your location (a fun courtesy alert)

---

## Test Data / Seeding

The server includes a seeding tool to populate the database with realistic test users for development and demo purposes. Seed users are placed in the Andhra Pradesh region of India and auto-accept friend requests, making it easy to test the full discovery and chat flow without needing real accounts.

To seed users, use the admin URL with the correct secret key (configured in your `.env` file).

---

## Environment Setup

You will need a `.env` file in the project root with the following values (see `.env.example` for the full list):

| Setting | Purpose |
|---|---|
| `MONGODB_URI` | Your database connection string |
| `JWT_SECRET` | Secret key for signing login sessions |
| `MESSAGE_SECRET` | Secret key for encrypting chat messages |
| `GOOGLE_CLIENT_ID` | Your Google app credentials for Google Sign-In |
| `GOOGLE_CLIENT_SECRET` | Your Google app credentials for Google Sign-In |
| `CLIENT_URL` | The URL of your front-end app |

---

© 2026 KON-NECT. All rights reserved.
