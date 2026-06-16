import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let adminApp: any = null;

/**
 * Initializes and returns the Firebase Admin App instance.
 * Automatically falls back to local or applicationDefault credentials.
 */
export function getFirebaseAdmin(): any {
  if (!adminApp) {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn("[Firebase Admin] Configuration file 'firebase-applet-config.json' not found. Trying default initialization.");
      try {
        adminApp = (admin as any).initializeApp();
      } catch (err: any) {
        if (err.code === 'app/duplicate-app') {
          adminApp = (admin as any).app();
        } else {
          throw err;
        }
      }
    } else {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        let credentialOption: any = null;
        try {
          credentialOption = (admin as any).credential?.applicationDefault();
        } catch (credErr) {
          console.warn("[Firebase Admin] unable to fetch applicationDefault credentials: using default configuration.");
        }

        adminApp = (admin as any).initializeApp({
          credential: credentialOption || undefined,
          projectId: config.projectId,
          databaseURL: `https://${config.projectId}.firebaseio.com`
        });
        
        console.log(`[Firebase Admin] Successfully initialized for projectId: ${config.projectId}`);
      } catch (err) {
        console.warn("[Firebase Admin] Standard credential initialization failed, falling back to default:", err);
        try {
          adminApp = (admin as any).initializeApp();
        } catch (stdErr: any) {
          if (stdErr.code === 'app/duplicate-app') {
            adminApp = (admin as any).app();
          } else {
            console.error("[Firebase Admin] Fatal administration initialization failure", stdErr);
            throw stdErr;
          }
        }
      }
    }
  }
  return adminApp;
}

/**
 * Gets a Firestore Admin instance targeting the custom databaseId.
 */
export function getFirestoreAdmin(): any {
  const app = getFirebaseAdmin();
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.firestoreDatabaseId) {
        return (app as any).firestore(config.firestoreDatabaseId);
      }
    } catch (e) {
      console.error("[Firebase Admin] Error parsing for custom databaseId", e);
    }
  }
  return (app as any).firestore();
}

/**
 * Gets an Auth Admin instance.
 */
export function getAuthAdmin(): any {
  return getFirebaseAdmin().auth();
}
