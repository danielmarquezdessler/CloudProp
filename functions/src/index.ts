import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Admin SDK
try {
  admin.initializeApp();
} catch (e) {
  // Already initialized
}

const db = admin.firestore();

/**
 * Cloud Function 1: HTTP GET/POST ping standard verification
 */
export const pingFunctions = functions.https.onRequest((request, response) => {
  functions.logger.info("Ping function executed", { structuredData: true });
  response.status(200).json({
    status: "ok",
    message: "Aguad CloudProp Suite Cloud Functions are fully active and reachable!",
    timestamp: new Date().toISOString()
  });
});

/**
 * Cloud Function 2: HTTPS Callable Function to calculate statistics
 */
export const getPropertyStats = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated via standard Firebase Auth context
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called by an authenticated user.'
    );
  }

  try {
    const propertiesSnapshot = await db.collection('properties')
      .where('orgId', '==', data.orgId || 'aguad-corp')
      .get();

    let totalValuation = 0;
    let count = 0;
    const typeBreakdown: Record<string, number> = {};

    propertiesSnapshot.forEach(doc => {
      const prop = doc.data();
      const price = Number(prop.price) || 0;
      totalValuation += price;
      count++;

      const type = prop.type || 'unknown';
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });

    return {
      success: true,
      orgId: data.orgId || 'aguad-corp',
      summary: {
        totalProperties: count,
        averagePrice: count > 0 ? (totalValuation / count) : 0,
        totalValuation,
        typeDistribution: typeBreakdown
      }
    };
  } catch (error: any) {
    functions.logger.error("Error retrieving properties stats", error);
    throw new functions.https.HttpsError('internal', error.message || 'Error occurred');
  }
});

/**
 * Cloud Function 3: Auth Trigger
 * Automatically seeds the Firestore database with a new user profile when someone signs up
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  functions.logger.info(`Auth Trigger active for user ${user.uid}`, { structuredData: true });

  const userRef = db.collection('users').doc(user.uid);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    const newUserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Nuevo Usuario',
      role: 'client',
      status: 'active',
      orgId: 'aguad-corp',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      authUid: user.uid,
      authCreated: true
    };

    try {
      await userRef.set(newUserProfile);
      functions.logger.info(`Successfully synchronized profile for user ${user.uid}`);
    } catch (err) {
      functions.logger.error(`Error saving user profile for ${user.uid}`, err);
    }
  }
});
