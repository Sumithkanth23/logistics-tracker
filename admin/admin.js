import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import {
  getDatabase,
  ref,
  set
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyCaNsjn5XPnr7P6ufN10T1Ej10mNFAcBP4",
  authDomain: "tracking-application-d2060.firebaseapp.com",
  databaseURL: "https://tracking-application-d2060-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tracking-application-d2060",
  storageBucket: "tracking-application-d2060.appspot.com",
  messagingSenderId: "401177639432",
  appId: "1:401177639432:web:1b6f9a914aa4d53efcefbd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Admin Login
window.adminLogin = function () {
  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;
  const message = document.getElementById("loginMessage");

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      message.textContent = "Logged in!";
      document.getElementById("loginSection").style.display = "none";
      document.getElementById("accessSection").style.display = "block";
    })
    .catch(err => {
      message.textContent = "Login failed: " + err.message;
    });
};

// Add Access to Email
window.addAccess = function () {
  const email = document.getElementById("userEmail").value.trim();
  const accessMessage = document.getElementById("accessMessage");

  if (!email) {
    accessMessage.textContent = "Enter a valid email";
    return;
  }

  const safeKey = email.replace(/[.#$\[\]]/g, "_"); // Sanitize key
  const accessRef = ref(db, `allowedUsers/${safeKey}`);

  set(accessRef, {
    email: email,
    allowed: true
  })
    .then(() => {
      accessMessage.textContent = `Access granted to ${email}`;
      document.getElementById("userEmail").value = '';
    })
    .catch(err => {
      accessMessage.textContent = "Error: " + err.message;
    });
};

// Sign out helper
window.logout = function () {
  signOut(auth).then(() => {
    window.location.href = '../index.html';
  }).catch(err => console.error('Logout error', err));
};
