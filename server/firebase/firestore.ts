import { getFirestoreAdmin } from './admin';
import { User, Property, AuditLog } from '../../src/types';

/**
 * Basic read service: Fetch all properties for an organization
 */
export async function getPropertiesFromFirestore(orgId: string): Promise<Property[]> {
  try {
    const db = getFirestoreAdmin();
    const snapshot = await db.collection('properties')
      .where('orgId', '==', orgId)
      .get();
    
    const list: Property[] = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() } as Property);
    });
    return list;
  } catch (error) {
    console.error("[Firestore Admin DB] Error fetching properties:", error);
    throw error;
  }
}

/**
 * Basic write service: Add or update a property record
 */
export async function savePropertyToFirestore(propertyData: Partial<Property> & { id: string }): Promise<void> {
  try {
    const db = getFirestoreAdmin();
    const docRef = db.collection('properties').doc(propertyData.id);
    await docRef.set({
      ...propertyData,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`[Firestore Admin DB] Saved property ${propertyData.id}`);
  } catch (error) {
    console.error("[Firestore Admin DB] Error saving property:", error);
    throw error;
  }
}

/**
 * Basic delete service: Remove property
 */
export async function deletePropertyFromFirestore(propertyId: string): Promise<void> {
  try {
    const db = getFirestoreAdmin();
    await db.collection('properties').doc(propertyId).delete();
    console.log(`[Firestore Admin DB] Deleted property ${propertyId}`);
  } catch (error) {
    console.error("[Firestore Admin DB] Error deleting property:", error);
    throw error;
  }
}

/**
 * Audit log recording via Firebase Admin SDK
 */
export async function recordAuditInFirestore(logEntry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
  try {
    const db = getFirestoreAdmin();
    const newDocRef = db.collection('auditLogs').doc();
    const id = newDocRef.id;
    
    await newDocRef.set({
      id,
      ...logEntry,
      timestamp: new Date().toISOString()
    });
    return id;
  } catch (error) {
    console.error("[Firestore Admin DB] Error recording audit log:", error);
    throw error;
  }
}
