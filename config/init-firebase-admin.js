var admin = require("firebase-admin");

var serviceAccount = require("./leagr-app-firebase-adminsdk-n4gt5-9dd4ee8856.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://leagr-app.firebaseio.com"
});
