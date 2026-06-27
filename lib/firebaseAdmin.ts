import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Lazily initialises a single Firebase Admin app and returns its Firestore
 * instance. All blog data access runs through the Admin SDK on the server,
 * which keeps credentials private and means switching from our own test
 * project to the client's project is just a matter of swapping the three
 * FIREBASE_* environment variables — no code changes required.
 */

let cachedDb: Firestore | null = null;

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Private keys are stored with escaped newlines in env files; restore them.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

/** True when all required Firebase credentials are present. */
export function isFirebaseConfigured(): boolean {
  return getServiceAccount() !== null;
}

function getApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in your environment.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
      privateKey: serviceAccount.privateKey,
    }),
  });
}

/** Returns the shared Firestore instance, initialising the app on first use. */
export function getDb(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }
  cachedDb = getFirestore(getApp());
  return cachedDb;
}
