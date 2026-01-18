/**
 * config.js
 *
 * Firebase configuration and initialization
 * Contains Firebase app setup, authentication, Firestore, and analytics
 */

// Firebase imports (for ES6 modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBkQc0Hyw6zFu9s8QQz1KfEz-5lEkpPVd0",
    authDomain: "bibleprogress-48cfd.firebaseapp.com",
    projectId: "bibleprogress-48cfd",
    storageBucket: "bibleprogress-48cfd.firebasestorage.app",
    messagingSenderId: "400605616220",
    appId: "1:400605616220:web:ce3c6f7b3048c90b636e99",
    measurementId: "G-94H40H1FCR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, analytics, provider };
