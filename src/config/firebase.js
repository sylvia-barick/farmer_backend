const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Check if already initialized to avoid re-initialization
if (!admin.apps.length) {
    try {
        // Option 1: Using service account JSON file (recommended for production)
        // Uncomment and use this if you have a service account key file
        // const serviceAccount = require('../../path/to/serviceAccountKey.json');
        // admin.initializeApp({
        //     credential: admin.credential.cert(serviceAccount)
        // });

        // Option 2: Using environment variable (recommended)
        // Set GOOGLE_APPLICATION_CREDENTIALS env variable to path of service account JSON
        // Or use applicationDefault() which looks for credentials automatically
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            admin.initializeApp({
                credential: admin.credential.applicationDefault()
            });
        } 
        // Option 3: Using Firebase project credentials from environment
        else if (process.env.FIREBASE_PROJECT_ID) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
                })
            });
        }
        // Option 4: For development/testing without credentials (limited functionality)
        else {
            console.warn('⚠️  Firebase Admin SDK initialized without credentials. Some features may not work.');
            admin.initializeApp();
        }

        console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Firebase Admin SDK:', error.message);
    }
}

module.exports = admin;
