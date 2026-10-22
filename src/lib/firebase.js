// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration is read from environment variables
// defined in .env.local (see below for the required keys)
const firebaseConfig = {
  apiKey: "AIzaSyChWr-TD6cMeKiSNU1zlhwXoX8h3ci3XI8",
  authDomain: "common-kin.firebaseapp.com",
  projectId: "common-kin",
  storageBucket: "common-kin.firebasestorage.app",
  messagingSenderId: "822414671990",
  appId: "1:822414671990:web:cf2bf044e626aad9ac5f57",
  measurementId: "G-FJEBRE8XHH",
};

// Initialize Firebase (guard against re-initializing on hot reload / SSR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Firestore instance
const db = getFirestore(app);

// Analytics only works in the browser and only if supported (e.g. not in SSR)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, db, analytics };