// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCaNsjn5XPnr7P6ufN10T1Ej10mNFAcBP4",
  authDomain: "tracking-application-d2060.firebaseapp.com",
  projectId: "tracking-application-d2060",
  storageBucket: "tracking-application-d2060.appspot.com",
  messagingSenderId: "401177639432",
  appId: "1:401177639432:web:1b6f9a914aa4d53efcefbd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Handle form submission
document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Sign in with Firebase Auth
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      // Redirect to tracking page on success
      window.location.href = "tracking.html";
    })
    .catch((error) => {
      // Show error message
      const errorMsg = document.getElementById("errorMsg");
      errorMsg.textContent = "Login failed: Invalid email or password.";
      console.error("Login Error:", error.code, error.message);
    });
});

