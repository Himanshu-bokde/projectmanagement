importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB32o_87NPwBOuj5ObjTv9Lnveexejin_M",
  authDomain: "protrack-3ff7d.firebaseapp.com",
  projectId: "protrack-3ff7d",
  storageBucket: "protrack-3ff7d.firebasestorage.app",
  messagingSenderId: "102371674439",
  appId: "1:102371674439:web:bc69563804f907674ae462",
  measurementId: "G-ZSFJ74SPNH",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // Add your notification icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
