# Duewise

Duewise is a single Next.js Backend-for-Frontend app for personal life admin and life history: deadlines, documents, subscriptions, inventory, family members, life events, dashboard aggregation, and timeline aggregation.

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

   For uploads, set `GCP_STORAGE_BUCKET` to the Google Cloud Storage bucket Duewise should use. If it is not set, the app falls back to `FIREBASE_STORAGE_BUCKET`. The Firebase Admin service account must have permission to create objects in that bucket.

   Keep public access prevention enabled on the bucket. Duewise stores files privately and uploads through short-lived signed URLs created by the BFF.

   Browser uploads also need bucket CORS for local development. Copy `gcs-cors.local.json.example` to your own local file, keep `http://localhost:3000` in the origin list, and apply it:

   ```bash
   gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=gcs-cors.local.json
   ```

   To confirm it was applied:

   ```bash
   gcloud storage buckets describe gs://YOUR_BUCKET_NAME --format="default(cors_config)"
   ```

3. Enable Firebase Authentication providers:
   - Email/password
   - Google, optional but already wired in the UI

4. Run the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Free Notifications

Duewise uses Firebase Cloud Messaging for free browser push notifications. Users enable push from Settings, which stores a browser FCM token under their user document in Firestore.

Set these environment variables:

```bash
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_web_push_certificate_key
CRON_SECRET=long_random_shared_secret
```

Get `NEXT_PUBLIC_FIREBASE_VAPID_KEY` from Firebase Console:

```text
Project settings -> Cloud Messaging -> Web Push certificates
```

For free scheduled delivery, create a cron-job.org job that calls:

```text
https://YOUR_DOMAIN/api/cron/notifications?secret=YOUR_CRON_SECRET
```

Run it once per day. If you prefer headers in cron-job.org, use:

```text
Authorization: Bearer YOUR_CRON_SECRET
```

or:

```text
X-Cron-Secret: YOUR_CRON_SECRET
```

The endpoint also accepts `POST` JSON:

```json
{ "secret": "YOUR_CRON_SECRET" }
```

The endpoint sends at most one attention digest push per user per day and records delivery under `notificationDeliveries` to avoid duplicates.

## Firebase Data Model

All application data is scoped under:

```text
users/{userId}
users/{userId}/tasks/{taskId}
users/{userId}/documents/{documentId}
users/{userId}/subscriptions/{subscriptionId}
users/{userId}/inventory/{itemId}
users/{userId}/familyMembers/{memberId}
users/{userId}/lifeEvents/{eventId}
```

Storage paths:

```text
users/{userId}/documents/{documentId}/{fileName}
users/{userId}/inventory/{itemId}/{fileName}
```

Uploaded file metadata stores a private `gs://bucket/users/{userId}/...` reference plus the object path. The bucket does not need to be public.

## BFF Routes

The app uses one codebase for frontend pages and server-side BFF routes:

- `/api/tasks`
- `/api/documents`
- `/api/documents/upload-url`
- `/api/subscriptions`
- `/api/inventory`
- `/api/inventory/upload-url`
- `/api/notifications/preferences`
- `/api/notifications/register-token`
- `/api/cron/notifications`
- `/api/family`
- `/api/life-events`
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
