import { getFirestoreAdmin } from './admin';

/**
 * Simulates calling getPropertyStats on the server.
 * This runs the actual analytical query against our Firestored database using Admin SDK.
 */
export async function simulateGetPropertyStats(orgId: string): Promise<any> {
  console.log(`[Cloud Functions Sim] Executing simulateGetPropertyStats for org: ${orgId}`);
  try {
    const db = getFirestoreAdmin();
    const propertiesSnapshot = await db.collection('properties')
      .where('orgId', '==', orgId)
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
      orgId,
      summary: {
        totalProperties: count,
        averagePrice: count > 0 ? (totalValuation / count) : 0,
        totalValuation,
        typeDistribution: typeBreakdown
      },
      simulated: true,
      executedAt: new Date().toISOString()
    };
  } catch (error: any) {
    console.error("[Cloud Functions Sim] Error calculating property stats:", error);
    throw new Error(error.message || "Failed to execute simulated getPropertyStats Cloud Function.");
  }
}

/**
 * Mock dispatcher of Cloud Functions triggers. 
 * Can be called manually to simulate a user registration Auth trigger.
 */
export async function simulateOnUserCreatedAuthTrigger(uid: string, email: string, displayName?: string): Promise<any> {
  console.log(`[Cloud Functions Sim] Simulating onUserCreated auth trigger for ${uid}`);
  try {
    const db = getFirestoreAdmin();
    const userRef = db.collection('users').doc(uid);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      const newUserProfile = {
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'Nuevo Usuario Simulado',
        role: 'client',
        status: 'active',
        orgId: 'aguad-corp',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authUid: uid,
        authCreated: true,
        simulatedTrigger: true
      };

      await userRef.set(newUserProfile);
      console.log(`[Cloud Functions Sim] Successfully created Firestore user profile via trigger simulation`);
      return { success: true, created: true, user: newUserProfile };
    }
    
    return { success: true, created: false, message: "User profile already existed" };
  } catch (error: any) {
    console.error("[Cloud Functions Sim] Error executing simulated Auth trigger:", error);
    throw error;
  }
}
