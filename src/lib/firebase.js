import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
let messaging = null;
let messagingSupported = false;

// Initialize Firebase only in browser
if (typeof window !== "undefined") {
  app = initializeApp(firebaseConfig);

  // Check if messaging is supported before initializing
  isSupported()
    .then((supported) => {
      messagingSupported = supported;
      if (supported) {
        try {
          messaging = getMessaging(app);
          console.log("Firebase Messaging initialized successfully");
        } catch (error) {
          console.warn(
            "Firebase Messaging initialization failed:",
            error.message
          );
          messaging = null;
        }
      } else {
        console.warn("Firebase Messaging is not supported in this browser");
      }
    })
    .catch((error) => {
      console.warn("Error checking Firebase Messaging support:", error.message);
    });
}

export const isMessagingSupported = () => {
  return messagingSupported && messaging !== null;
};

export const requestNotificationPermission = async () => {
  try {
    // Check if notifications are supported
    if (!("Notification" in window)) {
      console.warn("sNotifications not supported in this browser");
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted");
      return true;
    } else {
      console.log("Notification permission denied");
      return false;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

export const getFCMToken = async () => {
  try {
    if (!isMessagingSupported()) {
      console.warn("Messaging not supported - skipping token retrieval");
      return null;
    }

    if (!messaging) {
      throw new Error("Firebase Messaging not initialized");
    }

    const currentToken = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (currentToken) {
      console.log("FCM Token retrieved successfully");
      return currentToken;
    } else {
      console.log("No registration token available");
      return null;
    }
  } catch (error) {
    console.error("Error retrieving FCM token:", error.message);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!isMessagingSupported() || !messaging) {
      console.warn("Message listener not available - messaging not supported");
      resolve(null);
      return;
    }

    try {
      onMessage(messaging, (payload) => {
        console.log("Message received:", payload);
        resolve(payload);
      });
    } catch (error) {
      console.error("Error setting up message listener:", error);
      resolve(null);
    }
  });

export { messaging };
