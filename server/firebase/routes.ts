import { Router } from "express";
import { getFirestoreAdmin, getAuthAdmin } from "./admin";
import { 
  getPropertiesFromFirestore, 
  savePropertyToFirestore, 
  deletePropertyFromFirestore, 
  recordAuditInFirestore 
} from "./firestore";
import { 
  simulateGetPropertyStats, 
  simulateOnUserCreatedAuthTrigger 
} from "./functions";

const router = Router();

// Middleware to ensure standard admin authentication
const requireAdmin = async (req: any, res: any, next: any) => {
  const callerUid = req.headers['x-user-uid'] || (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].split(' ')[1] : null);
  if (!callerUid) {
    return res.status(401).json({ success: false, error: "Access Denied: UID not provided." });
  }
  
  try {
    const db = getFirestoreAdmin();
    // Resolve user profile
    const userDoc = await db.collection('users').doc(callerUid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Profile not found." });
    }
    const profile = userDoc.data();
    if (profile?.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: "Access Denied: Requires super_admin role." });
    }
    req.callerUid = callerUid;
    req.callerProfile = profile;
    next();
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Authentication check failed: " + error.message });
  }
};

/**
 * 1. Cloud Function Verification Endpoint (Simulated HTTP onRequest)
 */
router.get("/functions/ping", (req, res) => {
  res.json({
    status: "ok",
    message: "[Cloud Functions Sim] Aguad CloudProp Suite Cloud Functions are fully active and reachable in the sandbox backend!",
    timestamp: new Date().toISOString()
  });
});

/**
 * 2. Simulated callable Cloud Function to retrieve property stats
 */
router.post("/functions/getPropertyStats", async (req, res) => {
  const { orgId } = req.body;
  try {
    const stats = await simulateGetPropertyStats(orgId || 'aguad-corp');
    res.json({ success: true, ...stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. Simulate Firebase Auth trigger function onUserCreated
 */
router.post("/functions/trigger/userCreated", requireAdmin, async (req: any, res) => {
  const { uid, email, displayName } = req.body;
  if (!uid || !email) {
    return res.status(400).json({ success: false, error: "Missing mandatory uid or email to simulate the trigger." });
  }
  try {
    const result = await simulateOnUserCreatedAuthTrigger(uid, email, displayName);
    // Record audit of this simulated execution
    await recordAuditInFirestore({
      userId: req.callerUid,
      userEmail: req.callerProfile.email,
      action: "update",
      details: `Trigger simulated for authenticated onboarding profile: UID: ${uid}, Email: ${email}`
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. Admin SDK Firestore Reader endpoint (Multitenanted)
 */
router.get("/admin-firestore/properties", async (req, res) => {
  const orgId = (req.query.orgId as string) || "aguad-corp";
  try {
    const list = await getPropertiesFromFirestore(orgId);
    res.json({ success: true, source: "Firebase-Admin-Firestore", properties: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 5. Admin SDK Firestore Writer endpoint
 */
router.post("/admin-firestore/properties/save", async (req, res) => {
  const propertyData = req.body;
  if (!propertyData.id || !propertyData.title) {
    return res.status(400).json({ success: false, error: "id and title are required properties." });
  }
  try {
    await savePropertyToFirestore(propertyData);
    res.json({ success: true, message: "Property saved successfully via Firebase Admin SDK." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6. Admin SDK Firestore Deleter endpoint
 */
router.post("/admin-firestore/properties/delete", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, error: "id is required." });
  }
  try {
    await deletePropertyFromFirestore(id);
    res.json({ success: true, message: "Property deleted successfully via Firebase Admin SDK." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 7. Secure Admin Bootstrap Endpoint with precise case handling (A-F)
 */
const handleBootstrapFirstAdmin = async (req: any, res: any) => {
  // 1. Accept only POST method
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Only POST method is allowed." }
    });
  }

  const { secret, email: reqEmail, password, displayName = "Webmaster Aguad" } = req.body;

  // 2. Validate BOOTSTRAP_SECRET
  const expectedSecret = process.env.BOOTSTRAP_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return res.status(403).json({
      success: false,
      error: { code: "BOOTSTRAP_FORBIDDEN", message: "No se pudo crear el administrador fundador. Secret inválido o no configurado." }
    });
  }

  // 3. Email validation: must be webmaster@aguadbienesraices.com.ar
  if (!reqEmail) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "El email de administrador fundador es obligatorio." }
    });
  }

  const email = reqEmail.trim().toLowerCase();
  if (email !== "webmaster@aguadbienesraices.com.ar") {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "El email debe ser exactamente webmaster@aguadbienesraices.com.ar para este bootstrap." }
    });
  }

  // 4. Password validation
  if (!password) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "La contraseña es obligatoria." }
    });
  }

  // Password policy:
  // - mínimo 12 caracteres
  // - al menos una mayúscula
  // - al menos una minúscula
  // - al menos un número
  // - al menos un símbolo
  const hasMinLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
    return res.status(400).json({
      success: false,
      error: {
        code: "WEAK_PASSWORD",
        message: "En resguardo de la seguridad SaaS del deudor Aguad Bienes Raíces, la contraseña del administrador fundador debe tener al menos 12 caracteres, incluir una mayúscula, una minúscula, un número y un símbolo especial."
      }
    });
  }

  const orgId = "aguad-bienes-raices";

  try {
    const db = getFirestoreAdmin();
    const authAdmin = getAuthAdmin();
    const nowStr = new Date().toISOString();

    // 1. Search if any active super_admin exists in Firestore (role === 'super_admin' && status === 'active', NOT demo/mock)
    const superAdminQuery = await db.collection('users')
      .where('role', '==', 'super_admin')
      .where('status', '==', 'active')
      .get();
    
    let otherSuperAdminActiveExists = false;
    superAdminQuery.forEach(doc => {
      const uData = doc.data();
      if (uData.email !== "webmaster@aguadbienesraices.com.ar" && !uData.isDemo) {
        otherSuperAdminActiveExists = true;
      }
    });

    if (otherSuperAdminActiveExists) {
      return res.status(403).json({
        success: false,
        error: {
          code: "BOOTSTRAP_FORBIDDEN",
          message: "El administrador fundador ya existe. Use el panel administrativo o una función de reparación controlada."
        }
      });
    }

    // 2. Find if existing Firestore doc for our webmaster exist
    const webmasterDocQuery = await db.collection('users')
      .where('email', '==', "webmaster@aguadbienesraices.com.ar")
      .get();
    
    let existingFirestoreDoc: any = null;
    let existingFirestoreUid: string | null = null;
    if (!webmasterDocQuery.empty) {
      existingFirestoreDoc = webmasterDocQuery.docs[0].data();
      existingFirestoreUid = webmasterDocQuery.docs[0].id;
    }

    // 3. Find if Auth user exists
    let existingAuthUser = null;
    try {
      existingAuthUser = await authAdmin.getUserByEmail("webmaster@aguadbienesraices.com.ar");
    } catch (e) {
      // User not found in Auth
    }

    // Determine the case
    if (!existingAuthUser && !existingFirestoreDoc) {
      // --- CASO A: No existe Auth ni Firestore ---
      let authUser: any = null;
      try {
        authUser = await authAdmin.createUser({
          email,
          password,
          displayName,
          disabled: false,
          emailVerified: true
        });
      } catch (authErr: any) {
        return res.status(500).json({
          success: false,
          error: { code: "AUTH_CREATION_FAILED", message: "Fallo al crear el usuario en Firebase Auth: " + authErr.message }
        });
      }

      const uid = authUser.uid;
      try {
        // Create Firestore document with the generated Auth UID
        const userDocRef = db.collection('users').doc(uid);
        const userDocPayload = {
          uid,
          authUid: uid,
          email,
          displayName,
          role: "super_admin",
          roleLabel: "Superadministrador",
          status: "active",
          orgId,
          permissions: ["*"],
          authCreated: true,
          emailVerified: true,
          createdAt: nowStr,
          updatedAt: nowStr,
          createdBy: "system_bootstrap"
        };
        await userDocRef.set(userDocPayload);

        // Verify organization
        const orgDocRef = db.collection('organizations').doc(orgId);
        const orgSnap = await orgDocRef.get();
        if (!orgSnap.exists) {
          const orgDocPayload = {
            id: orgId,
            name: "Aguad Bienes Raíces",
            legalName: "Aguad Bienes Raíces",
            status: "active",
            domain: "aguadbienesraices.com.ar",
            cloudPropDomain: "cloudprop.aguadbienesraices.com.ar",
            createdAt: nowStr,
            updatedAt: nowStr,
            createdBy: "system_bootstrap"
          };
          await orgDocRef.set(orgDocPayload);
        }

        // Record audit
        const auditLogRef = db.collection('audit_logs').doc();
        const auditLogPayload = {
          action: "BOOTSTRAP_FIRST_ADMIN_CREATED",
          actor: "system_bootstrap",
          targetEmail: email,
          targetUid: uid,
          orgId,
          createdAt: nowStr,
          metadata: {
            method: "secure_bootstrap",
            passwordStored: false,
            secretStored: false
          }
        };
        await auditLogRef.set(auditLogPayload);

        return res.status(200).json({
          success: true,
          message: "Administrador fundador creado correctamente.",
          uid,
          email,
          role: "super_admin",
          permissions: ["*"],
          orgId
        });

      } catch (fsErr: any) {
        // Rollback Auth user
        await authAdmin.deleteUser(uid);
        return res.status(500).json({
          success: false,
          error: { code: "FIRESTORE_CREATION_FAILED", message: "Fallo al sincronizar perfil en Firestore. Se deshizo el registro en Firebase Auth. " + fsErr.message }
        });
      }

    } else if (existingAuthUser && !existingFirestoreDoc) {
      // --- CASO B: Existe Auth pero no Firestore ---
      const uid = existingAuthUser.uid;
      try {
        // Update password if provided
        await authAdmin.updateUser(uid, { password });

        const userDocRef = db.collection('users').doc(uid);
        const userDocPayload = {
          uid,
          authUid: uid,
          email,
          displayName,
          role: "super_admin",
          roleLabel: "Superadministrador",
          status: "active",
          orgId,
          permissions: ["*"],
          authCreated: true,
          emailVerified: true,
          createdAt: nowStr,
          updatedAt: nowStr,
          createdBy: "system_bootstrap"
        };
        await userDocRef.set(userDocPayload);

        // Verify organization
        const orgDocRef = db.collection('organizations').doc(orgId);
        const orgSnap = await orgDocRef.get();
        if (!orgSnap.exists) {
          await orgDocRef.set({
            id: orgId,
            name: "Aguad Bienes Raíces",
            legalName: "Aguad Bienes Raíces",
            status: "active",
            domain: "aguadbienesraices.com.ar",
            cloudPropDomain: "cloudprop.aguadbienesraices.com.ar",
            createdAt: nowStr,
            updatedAt: nowStr,
            createdBy: "system_bootstrap"
          });
        }

        // Record audit
        const auditLogRef = db.collection('audit_logs').doc();
        await auditLogRef.set({
          action: "BOOTSTRAP_FIRST_ADMIN_CREATED",
          actor: "system_bootstrap",
          targetEmail: email,
          targetUid: uid,
          orgId,
          createdAt: nowStr,
          metadata: {
            method: "secure_bootstrap",
            repaired: true,
            passwordStored: false,
            secretStored: false
          }
        });

        return res.status(200).json({
          success: true,
          repaired: true,
          message: "Administrador fundador reparado correctamente en Firestore.",
          uid,
          email,
          role: "super_admin",
          permissions: ["*"],
          orgId
        });
      } catch (fsErr: any) {
        return res.status(500).json({
          success: false,
          error: { code: "FIRESTORE_REPAIR_FAILED", message: "Fallo al reparar perfil en Firestore: " + fsErr.message }
        });
      }

    } else if (!existingAuthUser && existingFirestoreDoc) {
      // --- CASO C: Existe Firestore pero no Auth ---
      let authUser: any = null;
      try {
        authUser = await authAdmin.createUser({
          email,
          password,
          displayName,
          disabled: false,
          emailVerified: true
        });
      } catch (authErr: any) {
        return res.status(500).json({
          success: false,
          error: { code: "AUTH_CREATION_FAILED", message: "Fallo al crear Auth en conciliación: " + authErr.message }
        });
      }

      const uid = authUser.uid;
      try {
        if (existingFirestoreUid && existingFirestoreUid !== uid) {
          // If previous document has mismatching ID, delete it to prevent orphaning
          await db.collection('users').doc(existingFirestoreUid).delete();
        }

        const userDocRef = db.collection('users').doc(uid);
        const userDocPayload = {
          uid,
          authUid: uid,
          email,
          displayName,
          role: "super_admin",
          roleLabel: "Superadministrador",
          status: "active",
          orgId,
          permissions: ["*"],
          authCreated: true,
          emailVerified: true,
          createdAt: nowStr,
          updatedAt: nowStr,
          createdBy: "system_bootstrap"
        };
        await userDocRef.set(userDocPayload);

        // Verify organization
        const orgDocRef = db.collection('organizations').doc(orgId);
        const orgSnap = await orgDocRef.get();
        if (!orgSnap.exists) {
          await orgDocRef.set({
            id: orgId,
            name: "Aguad Bienes Raíces",
            legalName: "Aguad Bienes Raíces",
            status: "active",
            domain: "aguadbienesraices.com.ar",
            cloudPropDomain: "cloudprop.aguadbienesraices.com.ar",
            createdAt: nowStr,
            updatedAt: nowStr,
            createdBy: "system_bootstrap"
          });
        }

        // Record audit
        const auditLogRef = db.collection('audit_logs').doc();
        await auditLogRef.set({
          action: "BOOTSTRAP_FIRST_ADMIN_CREATED",
          actor: "system_bootstrap",
          targetEmail: email,
          targetUid: uid,
          orgId,
          createdAt: nowStr,
          metadata: {
            method: "secure_bootstrap",
            reconciled: true,
            passwordStored: false,
            secretStored: false
          }
        });

        return res.status(200).json({
          success: true,
          reconciled: true,
          message: "Administrador fundador reconciliado y creado en Auth.",
          uid,
          email,
          role: "super_admin",
          permissions: ["*"],
          orgId
        });
      } catch (fsErr: any) {
        await authAdmin.deleteUser(uid);
        return res.status(500).json({
          success: false,
          error: { code: "RECONCILIATION_FAILED", message: "Fallo durante conciliación en Firestore: " + fsErr.message }
        });
      }

    } else {
      // --- CASO D: Existe Auth y Firestore con mismo uid ---
      const uid = existingAuthUser.uid;
      
      if (existingFirestoreUid !== uid) {
        try {
          if (existingFirestoreUid) {
            await db.collection('users').doc(existingFirestoreUid).delete();
          }
          const userDocRef = db.collection('users').doc(uid);
          await userDocRef.set({
            uid,
            authUid: uid,
            email,
            displayName,
            role: "super_admin",
            roleLabel: "Superadministrador",
            status: "active",
            orgId,
            permissions: ["*"],
            authCreated: true,
            emailVerified: true,
            createdAt: nowStr,
            updatedAt: nowStr,
            createdBy: "system_bootstrap"
          });
        } catch (mismatchErr: any) {
          return res.status(500).json({
            success: false,
            error: { code: "REPAIR_UID_FAILED", message: "Fallo al corregir mismatch de UID: " + mismatchErr.message }
          });
        }
      }

      if (existingFirestoreDoc && existingFirestoreDoc.role === 'super_admin' && existingFirestoreDoc.status === 'active' && existingFirestoreDoc.permissions?.includes('*') && existingFirestoreUid === uid) {
        return res.status(200).json({
          success: true,
          alreadyExists: true,
          message: "El administrador fundador ya existe y está correctamente configurado.",
          email,
          role: "super_admin",
          permissions: ["*"],
          orgId
        });
      }

      try {
        const userDocRef = db.collection('users').doc(uid);
        await userDocRef.set({
          uid,
          authUid: uid,
          email,
          displayName: existingFirestoreDoc?.displayName || displayName,
          role: "super_admin",
          roleLabel: "Superadministrador",
          status: "active",
          orgId,
          permissions: ["*"],
          authCreated: true,
          emailVerified: true,
          updatedAt: nowStr,
          createdBy: existingFirestoreDoc?.createdBy || "system_bootstrap"
        }, { merge: true });

        // Update password too
        await authAdmin.updateUser(uid, { password });

        return res.status(200).json({
          success: true,
          repaired: true,
          message: "El administrador fundador ha sido reparado y configurado como super_admin.",
          email,
          role: "super_admin",
          permissions: ["*"],
          orgId
        });
      } catch (updateErr: any) {
        return res.status(500).json({
          success: false,
          error: { code: "REPAIR_UPDATE_FAILED", message: "Fallo al reparar el perfil existente: " + updateErr.message }
        });
      }
    }

  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: "BOOTSTRAP_FAILED", message: "Fallo técnico en bootstrap: " + err.message }
    });
  }
};

router.post("/functions/bootstrapFirstAdmin", handleBootstrapFirstAdmin);
router.post("/bootstrapFirstAdmin", handleBootstrapFirstAdmin);
router.post("/firebase-admin/bootstrap", handleBootstrapFirstAdmin);

/**
 * 8. Clean up demo users
 */
const handleCleanupDemoUsers = async (req: any, res: any) => {
  const bSecret = req.body.secret || req.headers['x-bootstrap-secret'] || req.query.secret;
  const expectedSecret = process.env.BOOTSTRAP_SECRET;
  
  if (!expectedSecret || bSecret !== expectedSecret) {
    return res.status(403).json({ 
      success: false, 
      error: "Infracción de seguridad: BOOTSTRAP_SECRET inválido o no configurado en servidor." 
    });
  }

  const demoEmails = [
    "agent1@aguadbienesraices.com.ar",
    "client1@aquaprop.com"
  ];

  const results: any[] = [];
  const db = getFirestoreAdmin();
  const authAdmin = getAuthAdmin();

  try {
    for (const email of demoEmails) {
      const report: any = { 
        email, 
        authDeleted: false, 
        firestoreDeleted: false, 
        errorCount: 0 
      };
      
      // Delete from Auth
      try {
        const authUser = await authAdmin.getUserByEmail(email);
        if (authUser) {
          await authAdmin.deleteUser(authUser.uid);
          report.authDeleted = true;
          report.uid = authUser.uid;
        }
      } catch (e: any) {
        if (e.code !== 'auth/user-not-found') {
          report.authError = e.message;
          report.errorCount++;
        }
      }

      // Delete from Firestore users collection
      try {
        const querySnap = await db.collection('users').where('email', '==', email).get();
        if (!querySnap.empty) {
          for (const doc of querySnap.docs) {
            await doc.ref.delete();
            report.firestoreDeleted = true;
            report.uid = doc.id;
          }
        }
      } catch (e: any) {
        report.firestoreError = e.message;
        report.errorCount++;
      }

      results.push(report);
    }

    // Write audit log
    const nowStr = new Date().toISOString();
    await db.collection('audit_logs').add({
      action: "cleanup_demo_users",
      status: "success",
      createdAt: nowStr,
      source: "system",
      details: `Eliminación de usuarios de prueba procesada: ${JSON.stringify(results)}`
    });

    return res.json({
      success: true,
      message: "Proceso de limpieza de usuarios demo concluido con éxito.",
      deletedSummary: results
    });

  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      error: "Error de ejecución en la limpieza de demo: " + error.message 
    });
  }
};

router.post("/functions/cleanupDemoUsers", handleCleanupDemoUsers);
router.post("/cleanupDemoUsers", handleCleanupDemoUsers);

export default router;
