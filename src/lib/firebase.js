import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getMessaging } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "AIzaSyB32o_87NPwBOuj5ObjTv9Lnveexejin_M",
  authDomain: "protrack-3ff7d.firebaseapp.com",
  projectId: "protrack-3ff7d",
  storageBucket: "protrack-3ff7d.firebasestorage.app",
  messagingSenderId: "102371674439",
  appId: "1:102371674439:web:bc69563804f907674ae462",
  measurementId: "G-ZSFJ74SPNH",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const messaging = getMessaging(app)
export default app
