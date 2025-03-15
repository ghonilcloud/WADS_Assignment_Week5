import { initializeApp } from "firebase/app";
import { getFirestore, collection, deleteDoc, doc, getDoc, setDoc, query, where, getDocs, addDoc } from "firebase/firestore"; // Add this import
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";  // Updated imports

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBszujh20Ov-Fd0c8lJKgwugY7i5XYmpIw",
  authDomain: "todo-auth-a649d.firebaseapp.com",
  projectId: "todo-auth-a649d",
  storageBucket: "todo-auth-a649d.appspot.com",
  messagingSenderId: "692557378630",
  appId: "1:692557378630:web:eea4a8cab3297c7ad4c647",
  measurementId: "G-5CKLNF7VPT"
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Session persistence set");
  })
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

const signInWithGoogle = async () => {
    try {
        const res = await signInWithPopup(auth, googleProvider);
        const user = res.user;
        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        const docs = await getDocs(q);
        if (docs.docs.length === 0) {
            await addDoc(collection(db, "users"), {
                uid: user.uid,
                name: user.displayName,
                authProvider: "google",
                email: user.email,
            });
        }
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};

const logInWithEmailAndPassword = async (email, password) => {
    try {
        await signInWithEmailAndPassword(auth, email, password);  // Correct function call
        console.log('User signed in!');
    } catch (error) {
        console.error('Error signing in: ', error);
    }
};

const registerWithEmailAndPassword = async (name, email, password) => {
    try {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        const user = res.user;
        await addDoc(collection(db, "users"), {
            uid: user.uid,
            name,
            authProvider: "local",
            email,
        });
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};

const sendPasswordReset = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Password reset link sent!");
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};

const logout = () => {
    signOut(auth);
};

export {
    auth,
    db,
    signInWithGoogle,
    logInWithEmailAndPassword, 
    registerWithEmailAndPassword,
    sendPasswordReset,
    logout,
};
