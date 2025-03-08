import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Load the service account JSON file
const serviceAccountPath = path.resolve('./attached_assets/finance-tracker-83308-firebase-adminsdk-fbsvc-96056ba863.json');
let serviceAccount;

try {
  // Check if the file exists
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccountRaw = fs.readFileSync(serviceAccountPath, 'utf8');
    serviceAccount = JSON.parse(serviceAccountRaw);
    console.log('Firebase service account loaded successfully');
  } else {
    console.error(`Service account file not found at: ${serviceAccountPath}`);
    throw new Error('Service account file not found');
  }
} catch (error) {
  console.error('Error loading service account:', error);
  throw error;
}

// Initialize the Firebase Admin SDK
try {
  // Initialize only if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
    console.log('Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  console.error('Firebase admin initialization error:', error);
  throw error;
}

export const auth = admin.auth();
export const firestore = admin.firestore();

export default admin;