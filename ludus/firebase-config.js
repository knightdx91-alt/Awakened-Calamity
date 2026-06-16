/* ludus/firebase-config.js — fill this in to enable ONLINE multiplayer.
 *
 * 1. Create a Firebase project (https://console.firebase.google.com).
 * 2. Add a Web App; enable Realtime Database (test mode is fine to start).
 * 3. Paste the config below. databaseURL is required for Realtime DB.
 *
 * Local play vs the bot and hotseat work WITHOUT any of this — online mode
 * simply stays disabled until a valid config (with databaseURL) is present.
 */
window.LUDUS_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",   // e.g. https://your-project-default-rtdb.firebaseio.com
  projectId: "",
  appId: ""
};
