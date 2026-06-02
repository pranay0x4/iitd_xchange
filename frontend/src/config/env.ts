const trimEnv = (value: string | undefined) => value?.trim() ?? ""

const csvEnv = (value: string | undefined) =>
  trimEnv(value)
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

export const firebaseClientConfig = {
  apiKey: trimEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: trimEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: trimEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  appId: trimEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  storageBucket: trimEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: trimEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  measurementId: trimEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
}

export const adminEmails = csvEnv(import.meta.env.VITE_ADMIN_EMAILS)
export const isArchiveModeEnabled = trimEnv(import.meta.env.VITE_ARCHIVE_MODE).toLowerCase() !== "false"

export const isAdminEmail = (email: string | null | undefined) =>
  !!email && adminEmails.includes(email.toLowerCase())
