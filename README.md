# Duewise

Duewise is a single Next.js Backend-for-Frontend app for personal life admin: deadlines, documents, subscriptions, inventory, family members, dashboard aggregation, and timeline aggregation.

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Firebase Authentication
- Firebase Admin SDK in server route handlers
- Cloud Firestore and Firebase Storage
- Zod, React Hook Form, Lucide icons

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in Firebase client and Admin credentials.

3. Enable Firebase Authentication providers:
   - Email/password
   - Google, optional but already wired in the UI

4. Run the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Firebase Data Model

All application data is scoped under:

```text
users/{userId}
users/{userId}/tasks/{taskId}
users/{userId}/documents/{documentId}
users/{userId}/subscriptions/{subscriptionId}
users/{userId}/inventory/{itemId}
users/{userId}/familyMembers/{memberId}
```

Storage paths:

```text
users/{userId}/documents/{documentId}/{fileName}
users/{userId}/inventory/{itemId}/{fileName}
```

## BFF Routes

The app uses one codebase for frontend pages and server-side BFF routes:

- `/api/tasks`
- `/api/documents`
- `/api/documents/upload-url`
- `/api/subscriptions`
- `/api/inventory`
- `/api/inventory/upload-url`
- `/api/family`
- `/api/dashboard`
- `/api/timeline`
- `/api/export`

Client requests include the Firebase ID token as a bearer token. Route handlers verify it with Firebase Admin SDK and only operate inside `users/{uid}`.

## Deploy to Firebase Hosting

Install and authenticate Firebase CLI, then run:

```bash
firebase init hosting
firebase deploy --only hosting,firestore:rules,storage
```

This project includes `firebase.json`, `firestore.rules`, and `storage.rules`. Use Firebase App Hosting or Hosting with framework support for the Next.js server routes.

## Notes

- Firebase Admin secrets must stay server-side in `.env.local` or your deployment secret manager.
- The MVP stores reminder dates and surfaces them through dashboard/timeline aggregation.
- Scheduled push notifications can be added later with Cloud Functions and Firebase Cloud Messaging.
