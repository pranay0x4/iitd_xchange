import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseClientConfig } from "@/src/config/env";

const app = initializeApp(firebaseClientConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export { onAuthStateChanged, signOut };
