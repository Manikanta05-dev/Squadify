
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "squadify-mmhjg",
  "appId": "1:419969896744:web:bcad335561a8eff06e401d",
  "storageBucket": "squadify-mmhjg.firebasestorage.app",
  "apiKey": "AIzaSyBz3PXyPAQs8lMBAp4OnUAqpgv35D5hLx4",
  "authDomain": "squadify-mmhjg.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "419969896744"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a time.
      console.warn('Firestore persistence failed: multiple tabs open.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      console.warn('Firestore persistence not available in this browser.');
    }
  });
