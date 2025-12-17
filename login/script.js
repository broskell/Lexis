// ===== FORM TOGGLE (Login <-> Register) =====
const container = document.querySelector(".container");
const signUpLink = document.querySelector(".SignUpLink");
const signInLink = document.querySelector(".SignInLink");

if (signUpLink && signInLink && container) {
  signUpLink.addEventListener("click", (e) => {
    e.preventDefault();
    container.classList.add("active");
  });

  signInLink.addEventListener("click", (e) => {
    e.preventDefault();
    container.classList.remove("active");
  });
}

// ===== FIREBASE CONFIGURATION (YOUR REAL CONFIG) =====
const firebaseConfig = {
  apiKey: "AIzaSyC8hZkOxbVtMIU80319ut2zQiqXDn9fRqw",
  authDomain: "lexis-4c25b.firebaseapp.com",
  projectId: "lexis-4c25b",
  storageBucket: "lexis-4c25b.firebasestorage.app",
  messagingSenderId: "116014649698",
  appId: "1:116014649698:web:072b043b6b9f7029851c3b",
  measurementId: "G-2GWVJB0FSV"
};

// We are using the compat SDKs loaded from CDN in login.html,
// so we DO NOT use ES module imports here.

// Initialize Firebase (compat)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

console.log("Firebase initialized for project:", firebaseConfig.projectId);

// ===== GOOGLE AUTHENTICATION =====
const provider = new firebase.auth.GoogleAuthProvider();

const googleLoginBtn = document.getElementById("googleLoginBtn");
const googleSignUpBtn = document.getElementById("googleSignUpBtn");

// Best-effort Firestore user doc creation/update
async function upsertUserDoc(user) {
  try {
    const userRef = db.collection("users").doc(user.uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      await userRef.set({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      });
      console.log("New user document created in Firestore");
    } else {
      await userRef.update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Existing user lastLogin updated");
    }
  } catch (err) {
    // Non‑fatal: if offline / blocked, just log and continue.
    console.warn(
      "Could not update Firestore user doc (non‑fatal, continuing anyway):",
      err
    );
  }
}

// Shared Google sign‑in handler
async function signInWithGoogle(button) {
  if (!button) return;

  let user;

  // 1) Auth: must succeed, otherwise we stop.
  try {
    console.log("Starting Google sign‑in...");
    button.classList.add("loading");

    const result = await auth.signInWithPopup(provider);
    user = result.user;
    console.log("Google sign‑in success:", user.email);
  } catch (error) {
    button.classList.remove("loading");
    console.error("Google sign‑in error:", error);

    if (error.code === "auth/popup-closed-by-user") {
      console.log("Popup closed by user");
      return;
    }
    if (error.code === "auth/cancelled-popup-request") {
      console.log("Popup request cancelled");
      return;
    }
    if (error.code === "auth/network-request-failed") {
      alert("Network error during sign‑in. Please check your connection.");
      return;
    }
    if (error.code === "auth/unauthorized-domain") {
      alert(
        "auth/unauthorized-domain:\nAdd your localhost / 127.0.0.1 domain to Firebase Auth → Settings → Authorized domains."
      );
      return;
    }

    alert("Error signing in: " + error.message);
    return;
  }

  // 2) Firestore: try, but don't block login if it fails.
  await upsertUserDoc(user);

  // 3) Store user info for the main Lexis app
  localStorage.setItem(
    "lexis_user",
    JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    })
  );

  button.classList.remove("loading");

  // 4) Redirect into main Lexis dashboard (root index.html)
  window.location.href = "../index.html";
}

// Attach listeners
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", () =>
    signInWithGoogle(googleLoginBtn)
  );
}
if (googleSignUpBtn) {
  googleSignUpBtn.addEventListener("click", () =>
    signInWithGoogle(googleSignUpBtn)
  );
}

// // ===== AUTH STATE OBSERVER =====
// auth.onAuthStateChanged((user) => {
//   if (user) {
//     console.log("Auth state: signed in as", user.email);
//     localStorage.setItem(
//       "lexis_user",
//       JSON.stringify({
//         uid: user.uid,
//         email: user.email,
//         displayName: user.displayName,
//         photoURL: user.photoURL,
//       })
//     );
//   } else {
//     console.log("Auth state: signed out");
//     localStorage.removeItem("lexis_user");
//   }
// });

// auth.onAuthStateChanged((user) => {
//   if (user) {
//     localStorage.setItem(
//       "lexis_user",
//       JSON.stringify({
//         uid: user.uid,
//         email: user.email,
//         displayName: user.displayName,
//         photoURL: user.photoURL,
//       })
//     );

//     // If we're on /login and already signed in, go to main app
//     if (window.location.pathname.startsWith("/login")) {
//       window.location.href = "/";
//     }
//   } else {
//     localStorage.removeItem("lexis_user");
//   }
// });

// ===== SIGN OUT (for dashboard use) =====
function signOut() {
  auth
    .signOut()
    .then(() => {
      console.log("User signed out");
      localStorage.removeItem("lexis_user");
      window.location.href = "./login/login.html";
    })
    .catch((err) => console.error("Error signing out:", err));
}

// Make signOut usable from main app: window.lexisSignOut()
window.lexisSignOut = signOut;