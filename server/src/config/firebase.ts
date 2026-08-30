import { initializeApp, getApps } from 'firebase-admin/app';
import { cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const getFirebasePrivateKey = (): string => {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY is not defined in environment variables');
  }
  return privateKey.replace(/\\n/g, '\n');
};

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: getFirebasePrivateKey(),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw error;
  }
}

export const firebaseAuth = getAuth();

export default getApps().length > 0 ? getApps()[0] : null;
