import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const rawConfig = import.meta.env.VITE_FIREBASE_CONFIG;
const firebaseConfig = rawConfig ? JSON.parse(rawConfig) : {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: ""
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
