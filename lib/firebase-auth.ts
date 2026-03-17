"use client";

import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { defaultUser, setUserProfile } from "@/lib/preferences";
import { getFirebaseApp } from "@/lib/firebase-client";

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  const credential = await signInWithPopup(auth, provider);
  syncProfileFromFirebaseUser(credential.user);
  return credential.user;
}

export async function signOutGoogle() {
  const auth = getFirebaseAuth();
  await signOut(auth);
  setUserProfile(defaultUser);
}

export function subscribeToAuthChanges(cb: (user: User | null) => void): Unsubscribe {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      syncProfileFromFirebaseUser(user);
    }
    cb(user);
  });
}

function syncProfileFromFirebaseUser(user: User) {
  setUserProfile({
    displayName: user.displayName || user.email || defaultUser.displayName,
    email: user.email || defaultUser.email,
    avatarUrl: user.photoURL || undefined,
  });
}
