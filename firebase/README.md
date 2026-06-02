# Firebase

This directory contains the Firebase project artifacts that are safe to publish:

- `firebase.json` for hosting and Firestore deployment config
- `.firebaserc` for project aliasing
- `firestore.rules` for published rules
- `firebase-blueprint.json` as a lightweight schema reference

Sensitive runtime credentials have been removed from source control. Client configuration now comes from environment variables documented in [`../.env.example`](/Users/pranay/iitdmarket/.env.example).

To deploy from the repository root:

```bash
firebase deploy --config firebase/firebase.json
```
