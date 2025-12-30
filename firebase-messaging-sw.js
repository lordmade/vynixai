import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import { getMessaging, onBackgroundMessage } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-sw.js';

const firebaseConfig = {
    apiKey: "AIzaSyBOyZ3As4GTuNvjemvPF_SpsC6m6vqtNhc",
    authDomain: "fire-b-a8878.firebaseapp.com",
    databaseURL: "https://fire-b-a8878.firebaseio.com",
    projectId: "fire-b-a8878",
    storageBucket: "fire-b-a8878.firebasestorage.app",
    messagingSenderId: "658673187627",
    appId: "1:658673187627:web:6e4c29af661785f0afa36e"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: 'https://i.postimg.cc/W3Msxg6q/Gemini-Generated-Image-1oaeg71oaeg71oae.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
