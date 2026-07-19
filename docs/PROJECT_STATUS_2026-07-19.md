# Duewise status — 2026-07-19

The core application is working and is considered feature-complete for the current milestone. There are no known blocking items.

## Completed in this pass

- Document grid cards now constrain long titles, owners, relation values, and action controls without horizontal overflow.
- Document cards use equal-height content regions for more consistent row alignment.
- Images and PDFs open in a secure in-app preview modal; other file types continue to open in a new browser tab.
- Added a private **Stream** page for durable cross-session and cross-device drops.
- Stream supports messages, images, PDFs and other files, drag-and-drop attachment, copy, download, delete, manual refresh, and 15-second background refresh.
- Stream data and files stay inside the signed-in user's existing Firestore and Cloud Storage namespace.

## Deployment note

Deploy the updated `firestore.rules` with the application so the new `streamItems` collection is available to Firebase client tooling. The Stream API itself uses the authenticated server-side Firebase Admin path and is already scoped to the current user.

## Possible later enhancements (not required for this milestone)

- Replace polling with real-time Firestore listeners or server-sent events.
- Promote a Stream attachment directly into Documents without re-uploading it.
- Add pinning, expiry/auto-cleanup, multi-select, and search to Stream.
- Add shared household streams if account-to-account sharing becomes part of the product model.
