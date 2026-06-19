import fs from "fs";
import path from "path";
import {
  applicationDefault,
  getApp,
  getApps,
  initializeApp,
  type App
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
const isProductionRuntime = () => process.env.NODE_ENV === "production" || !!process.env.K_SERVICE;

type FirebaseAppletConfig = {
  projectId?: string;
  firestoreDatabaseId?: string;
};

/**
 * Reads optional local Firebase config generated/exported with the project.
 * This file must never contain secrets.
 */
function readFirebaseAppletConfig(): FirebaseAppletConfig {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    console.warn("[Firebase Admin] Could not parse firebase-applet-config.json. Using default config.");
    return {};
  }
}

/**
 * Initializes and returns the Firebase Admin App instance.
 *
 * Local development:
 * - Prefer GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON outside git.
 * - Or use Application Default Credentials if configured.
 *
 * Production:
 * - Use the runtime service account from Google Cloud/Firebase.
 */
export function getFirebaseAdmin(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length > 0) {
    adminApp = getApp();
    return adminApp;
  }

  const config = readFirebaseAppletConfig();

  try {
    adminApp = initializeApp({
      credential: applicationDefault(),
      projectId: config.projectId,
      databaseURL: config.projectId ? `https://${config.projectId}.firebaseio.com` : undefined
    });

    console.log(
      `[Firebase Admin] Initialized${config.projectId ? ` for projectId: ${config.projectId}` : ""}.`
    );

    return adminApp;
  } catch (error: any) {
    if (isProductionRuntime()) {
      throw new Error(`[Firebase Admin] No se pudo inicializar Firebase Admin en producción: ${error.message}`);
    }

    console.warn("[Firebase Admin] applicationDefault initialization failed in local development. Trying default initializeApp().");

    adminApp = initializeApp({
      projectId: config.projectId,
      databaseURL: config.projectId ? `https://${config.projectId}.firebaseio.com` : undefined
    });

    return adminApp;
  }
}

/**
 * Gets a Firestore Admin instance.
 * Supports optional custom databaseId from firebase-applet-config.json.
 */
export function getFirestoreAdmin() {
  const app = getFirebaseAdmin();
  const config = readFirebaseAppletConfig();

  if (config.firestoreDatabaseId) {
    return getFirestore(app, config.firestoreDatabaseId);
  }

  return getFirestore(app);
}

/**
 * Gets an Auth Admin instance.
 */
export function getAuthAdmin() {
  return getAuth(getFirebaseAdmin());
}
