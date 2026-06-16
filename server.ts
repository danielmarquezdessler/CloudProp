import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  authenticateUser, 
  resolveUserSession, 
  checkEmailAvailability, 
  createUserAccount, 
  repairUserAccess, 
  deleteUserAccount, 
  updateUserInfo, 
  getProperties, 
  createProperty, 
  updateProperty, 
  deleteProperty, 
  getAuditLogs,
  getUsers,
  logAudit
} from "./server/dbService";

import firebaseRoutes from "./server/firebase/routes";
import aguadiRoutes from "./server/firebase/aguadiRoutes";
import { getFirestoreAdmin, getAuthAdmin } from "./server/firebase/admin";
import { getPropertiesFromFirestore } from "./server/firebase/firestore";

const PORT = 3000;

let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required on server start.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-ai-hub',
        }
      }
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  
  // Parse JSON payloads
  app.use(express.json());

  // Mount Firebase Admin & Cloud Functions Router
  app.use("/api", firebaseRoutes);
  app.use("/api", aguadiRoutes);

  // API Middleware to recover the authenticated caller
  const requireAuth = (req: any, res: any, next: any) => {
    const callerUid = req.headers['x-user-uid'] || (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].split(' ')[1] : null);
    if (!callerUid) {
      return res.status(401).json({ success: false, error: "Infracción de seguridad: no se ha proporcionado UID de sesión." });
    }
    req.callerUid = callerUid;
    next();
  };

  // --- API ROUTES ---

  // --- AI API PORTS FOR COGNITIVE HUB ---
  
  // 1. AI Ficha/Brochure Synthesizer
  app.post("/api/ai/generate-ficha", requireAuth, async (req: any, res) => {
    const { title, price, address, bedrooms, bathrooms, areaSqM, description } = req.body;
    if (!title || !price || !address) {
      return res.status(400).json({ success: false, error: "Datos insuficientes para generar la ficha (Título, precio y dirección requeridos)." });
    }
    try {
      const ai = getAI();
      const prompt = `
Eres un redactor inmobiliario de élite trabajando para 'Facundo Aguad Bienes Raíces' (Tucumán, Argentina). Tu tarea es crear una ficha técnica y descripción de alta conversión para las redes sociales y portal de la siguiente propiedad:
Propiedad: ${title}
Precio: USD ${price}
Ubicación: ${address}
Características: ${bedrooms || 0} dorms, ${bathrooms || 0} baños, ${areaSqM || 0} m2.
Detalles: ${description || 'Sin descripción adicional'}.

Crea una redacción sumamente atractiva y profesional dividida en 3 secciones en base al idioma claramente etiquetadas con banderas y emojis: Español (ES 🇦🇷), Inglés (EN 🇬🇧) y Portugués (PT 🇧🇷). Destaca el estilo de vida, la luminosidad, la ubicación táctica, y añade un gancho de venta (Call to action) con emojis inmobiliarios.
      `.trim();

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ success: true, brochure: response.text });
    } catch (err: any) {
      console.error("[AI Ficha Error]:", err);
      res.status(500).json({ success: false, error: "Error en el sintetizador AI: " + err.message });
    }
  });

  // 2. AI Lead Coach & Cognitive Analysis
  app.post("/api/ai/analyze-lead", requireAuth, async (req: any, res) => {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: "Requerimiento de conversación vacío." });
    }
    try {
      const ai = getAI();
      const systemInstruction = `
Actúa como un motor de análisis cognitivo avanzado para 'Facundo Aguad Bienes Raíces'.
Deberás procesar el requerimiento o mensaje directo del potencial cliente, extraer y clasificar los datos clave con precisión predictiva.
Debes retornar estrictamente un JSON válido con esta estructura:
{
  "name": "Nombre extraído o 'No identificado'",
  "phone": "Teléfono o 'No provisto'",
  "operationType": "compra" | "venta" | "alquiler" | "otro",
  "propertyType": "casa" | "departamento" | "terreno" | "comercial" | "otro",
  "zone": "Yerba Buena, Barrio Norte, Centro, etc. o 'No especificada'",
  "budget": "Presupuesto o 'No definido'",
  "temp": "Fría" | "Tibia" | "Caliente",
  "score": 0 a 100,
  "summary": "Resumen conciso del lead de un párrafo rápido",
  "nextStep": "Guía táctica para el agente de venta"
}
IMPORTANTE: Retorna únicamente el JSON válido, sin delimitadores rústicos de markdown ni textos introductorios.
      `.trim();

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analiza este requerimiento: "${message}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      let cleaned = text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
      }

      res.json({ success: true, analysis: JSON.parse(cleaned) });
    } catch (err: any) {
      console.error("[AI Lead Coach Error]:", err);
      res.status(500).json({ success: false, error: "Error de análisis cognitivo: " + err.message });
    }
  });

  // 3. AI Predictive Appraisal (Tasación)
  app.post("/api/ai/tasar", requireAuth, async (req: any, res) => {
    const { zone, areaSqM, bedrooms, propertyType, description } = req.body;
    if (!zone || !areaSqM || !propertyType) {
      return res.status(400).json({ success: false, error: "Parámetros de tasación incompletos (Zona, Superficie y Tipo requeridos)." });
    }
    try {
      const ai = getAI();
      const prompt = `
Actúa como tasador inmobiliario experto en San Miguel de Tucumán y Yerba Buena (líderes del mercado en Tucumán). Realiza una estimación rápida de valor de mercado e informe de tasación para:
- Tipo de Inmueble: ${propertyType}
- Zona/Barrio: ${zone}
- Superficie total: ${areaSqM} m2
- Dormitorios: ${bedrooms || 1}
- Comentarios adicionales: ${description || 'Sin comentarios'}

Genera un informe rápido de tasación en español argentino bien estructurado usando Markdown. Incluye:
1. Rango de Valor Estimado (USD de venta y AR$ de alquiler recomendados para el contexto regional actual).
2. Justificación Técnica (Por qué vale eso basándote en la superficie y zona).
3. Consejos de Publicación (Cómo optimizar la oferta para vender o alquilar rápido).
      `.trim();

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ success: true, report: response.text });
    } catch (err: any) {
      console.error("[AI Valuation Error]:", err);
      res.status(500).json({ success: false, error: "Error en el motor de tasación AI: " + err.message });
    }
  });

  // Auth: Email availability check
  app.get("/api/auth/check-email", async (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, error: "El parámetro de correo electrónico es requerido." });
    }
    
    // Strict production isolation check
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const authAdm = getAuthAdmin();
        const dbAdm = getFirestoreAdmin();
        const emailNorm = email.trim().toLowerCase();
        let authExists = false;
        let firestoreExists = false;
        let userRecord: any = null;
        
        try {
          const authUser = await authAdm.getUserByEmail(emailNorm);
          authExists = !!authUser;
        } catch (e) {}

        const snap = await dbAdm.collection('users').where('email', '==', emailNorm).get();
        if (!snap.empty) {
          firestoreExists = true;
          userRecord = snap.docs[0].data();
        }

        let consistencyStatus: any = 'available';
        let canCreate = true;
        let canRepair = false;
        let recommendedAction = "Puede crear este nuevo usuario libremente.";

        if (authExists && firestoreExists) {
          const uidMatches = userRecord.uid === userRecord.authUid;
          if (uidMatches) {
            consistencyStatus = 'active_user_exists';
            canCreate = false;
            recommendedAction = "El usuario ya existe de forma completa y consistente. Inicie sesión.";
          } else {
            consistencyStatus = 'uid_mismatch';
            canCreate = false;
            canRepair = true;
            recommendedAction = "Se detectó desajuste crítico entre Auth y Base de datos. Ejecute reparación.";
          }
        } else if (authExists && !firestoreExists) {
          consistencyStatus = 'auth_only';
          canCreate = false;
          canRepair = true;
          recommendedAction = "Registro incompleto en Auth sin documento de base de datos. Requiere reparación.";
        } else if (!authExists && firestoreExists) {
          consistencyStatus = 'firestore_only';
          canCreate = false;
          canRepair = true;
          recommendedAction = "Existe perfil pero no credenciales de acceso. Requiere asignarle contraseña.";
        }

        return res.json({
          success: true,
          email: emailNorm,
          authExists,
          firestoreExists,
          consistencyStatus,
          canCreate,
          canRepair,
          recommendedAction,
          uid: userRecord?.uid
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Error en validación real de email de producción: " + err.message });
      }
    } else {
      try {
        const info = checkEmailAvailability(email);
        res.json({ success: true, ...info });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Auth: Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Faltan ingresar las credenciales." });
    }
    
    // Login endpoints are strictly disabled on servers under production
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      return res.status(400).json({ 
        success: false, 
        error: "El inicio de sesión local está deshabilitado en producción. Inicie sesión directamente mediante Firebase Auth en la interfaz comercial." 
      });
    }

    try {
      const result = authenticateUser(email, password);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Auth: Resolve user session details
  app.get("/api/auth/session", requireAuth, async (req: any, res) => {
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const dbAdm = getFirestoreAdmin();
        const userDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!userDoc.exists) {
          return res.json({ allowed: false, reason: "Perfil de usuario no activo/existente en Firestore.", messageKey: "errors.profile_missing" });
        }
        const userData = userDoc.data();
        if (userData?.status !== 'active') {
          return res.json({ allowed: false, reason: "Tu cuenta ha sido suspendida.", messageKey: "auth.suspended" });
        }
        return res.json({
          success: true,
          allowed: true,
          role: userData.role,
          redirectTo: '/dashboard',
          reason: "Sesión autorizada correctamente vía Firestore de producción."
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Error de verificación de sesión en producción: " + err.message });
      }
    } else {
      try {
        const result = resolveUserSession(req.callerUid);
        res.json({ success: true, ...result });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Auth: Repair user account access
  app.post("/api/auth/repair", requireAuth, async (req: any, res) => {
    const { email, repairOption } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "El correo es requerido para la reparación." });
    }
    
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const authAdm = getAuthAdmin();
        const dbAdm = getFirestoreAdmin();
        
        // Secure verify caller role First
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
          return res.status(403).json({ success: false, error: "Acceso denegado. Permisos de Superadministrador mandatorios para restaurar credenciales." });
        }

        const emailNorm = email.trim().toLowerCase();
        let authUser: any = null;
        try {
          authUser = await authAdm.getUserByEmail(emailNorm);
        } catch (e) {}

        const userSnap = await dbAdm.collection('users').where('email', '==', emailNorm).get();
        const userDoc = userSnap.empty ? null : userSnap.docs[0];

        if (!authUser && !userDoc) {
          return res.status(404).json({ success: false, error: "No se encontraron registros de usuario en el servidor para restaurar." });
        }

        if (!authUser && userDoc) {
          const tempPass = "TempPass123!";
          const createdAuth = await authAdm.createUser({
            email: emailNorm,
            password: tempPass,
            displayName: userDoc.data().displayName
          });
          
          if (userDoc.id !== createdAuth.uid) {
            const data = userDoc.data();
            await dbAdm.collection('users').doc(createdAuth.uid).set({
              ...data,
              uid: createdAuth.uid,
              authUid: createdAuth.uid,
              authCreated: true,
              updatedAt: new Date().toISOString()
            });
            await userDoc.ref.delete();
          } else {
            await userDoc.ref.update({
              authUid: createdAuth.uid,
              authCreated: true,
              updatedAt: new Date().toISOString()
            });
          }
          return res.json({ success: true, message: `Reparación exitosa: Creadas credenciales de ingreso en Auth con contraseña provisoria: ${tempPass}` });
        } else if (authUser && !userDoc) {
          await dbAdm.collection('users').doc(authUser.uid).set({
            uid: authUser.uid,
            authUid: authUser.uid,
            email: emailNorm,
            displayName: authUser.displayName || 'Usuario Recuperado',
            role: 'client',
            status: 'active',
            orgId: callerDoc.data().orgId || 'aguad-bienes-raices',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            authCreated: true
          });
          return res.json({ success: true, message: "Reparación exitosa: Se recompuso el documento de perfil del usuario en Firestore." });
        } else if (authUser && userDoc) {
          if (userDoc.id !== authUser.uid) {
            const data = userDoc.data();
            await dbAdm.collection('users').doc(authUser.uid).set({
              ...data,
              uid: authUser.uid,
              authUid: authUser.uid,
              authCreated: true,
              updatedAt: new Date().toISOString()
            });
            await userDoc.ref.delete();
            return res.json({ success: true, message: "Reparación exitosa: Se consolidó el ID de colección con UID de autenticación." });
          }
        }
        return res.json({ success: true, message: "El usuario ya se encuentra en un estado completamente consistente." });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo al ejecutar reparación de producción: " + err.message });
      }
    } else {
      try {
        const result = repairUserAccess(req.callerUid, email, repairOption || 'auto');
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Users: Get all users
  app.get("/api/users", requireAuth, async (req: any, res) => {
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const dbAdm = getFirestoreAdmin();
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!callerDoc.exists) {
          return res.status(403).json({ success: false, error: "Usuario de sesión inválido." });
        }
        const callerData = callerDoc.data();
        let query = dbAdm.collection('users');
        if (callerData?.role !== 'super_admin') {
          query = query.where('orgId', '==', callerData?.orgId || 'aguad-bienes-raices');
        }
        const snap = await query.get();
        const list: any[] = [];
        snap.forEach((doc: any) => {
          list.push(doc.data());
        });
        return res.json({ success: true, users: list });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo al obtener usuarios reales de Firestore: " + err.message });
      }
    } else {
      try {
        const list = getUsers(req.callerUid);
        res.json({ success: true, users: list });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Users: Create system user (Cloud Function equivalent)
  app.post("/api/users/create", requireAuth, async (req: any, res) => {
    const { email, displayName, role, status, password, orgId } = req.body;
    if (!email || !displayName || !role || !password) {
      return res.status(400).json({ success: false, error: "Existen campos mandatorios incompletos." });
    }
    
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const dbAdm = getFirestoreAdmin();
        const authAdm = getAuthAdmin();
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
          return res.status(403).json({ success: false, error: "Solo superadministradores pueden registrar nuevos usuarios en el sistema." });
        }
        
        const emailNorm = email.trim().toLowerCase();
        const authUser = await authAdm.createUser({
          email: emailNorm,
          password: password,
          displayName: displayName
        });

        const uid = authUser.uid;
        const nowStr = new Date().toISOString();

        await dbAdm.collection('users').doc(uid).set({
          uid,
          authUid: uid,
          email: emailNorm,
          displayName,
          role,
          roleLabel: role === 'super_admin' ? 'Superadministrador' : role === 'agent' ? 'Agente de Ventas' : 'Cliente',
          status: status || 'active',
          orgId: orgId || callerDoc.data().orgId || 'aguad-bienes-raices',
          permissions: role === 'super_admin' ? ["*"] : role === 'agent' ? [
            "properties.read", "properties.write", "leads.read", "leads.manage", "aguadi.view", "aguadi.conversations.read"
          ] : ["properties.read"],
          authCreated: true,
          createdAt: nowStr,
          updatedAt: nowStr,
          createdBy: req.callerUid
        });

        return res.json({
          success: true,
          user: { uid, email: emailNorm, displayName, role, orgId: orgId || callerDoc.data().orgId || 'aguad-bienes-raices' }
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo al crear usuario en producción: " + err.message });
      }
    } else {
      try {
        const result = createUserAccount(req.callerUid, { email, displayName, role, status, passwordString: password, orgId });
        if (!result.success) {
          return res.status(400).json(result);
        }
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Users: Update user (Cloud Function with secure admin constraints)
  app.post("/api/users/update", requireAuth, async (req: any, res) => {
    const { targetUid, displayName, email, role, status } = req.body;
    if (!targetUid) {
      return res.status(400).json({ success: false, error: "El UID del destinatario es requerido." });
    }
    
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const dbAdm = getFirestoreAdmin();
        const authAdm = getAuthAdmin();
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
          return res.status(403).json({ success: false, error: "Solo superadministradores pueden modificar perfiles en el sistema." });
        }
        
        const targetDocRef = dbAdm.collection('users').doc(targetUid);
        const targetDoc = await targetDocRef.get();
        if (!targetDoc.exists) {
          return res.status(404).json({ success: false, error: "Usuario a modificar no encontrado en Firestore." });
        }

        const primaryAdmin = (process.env.ADMIN_EMAIL || "webmaster@aguadbienesraices.com.ar").trim().toLowerCase();
        if (targetDoc.data()?.email === primaryAdmin && role !== 'super_admin') {
          return res.status(400).json({ success: false, error: "Para prevenir bloqueos, el rol del super_admin principal no puede ser degradado." });
        }

        const emailNorm = email.trim().toLowerCase();
        await targetDocRef.update({
          displayName,
          email: emailNorm,
          role,
          status,
          updatedAt: new Date().toISOString()
        });

        try {
          await authAdm.updateUser(targetUid, {
            displayName,
            email: emailNorm
          });
        } catch (e: any) {
          console.warn("[Auth Sync Warn] El UID no pudo sincronizarse en Firebase Auth:", e.message);
        }

        return res.json({ success: true, message: "Usuario modificado correctamente en Firestore y Firebase Auth." });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo al modificar usuario en producción: " + err.message });
      }
    } else {
      try {
        const result = updateUserInfo(req.callerUid, targetUid, { displayName, email, role, status });
        if (!result.success) {
          return res.status(400).json(result);
        }
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Users: Permanent delete
  app.post("/api/users/delete", requireAuth, async (req: any, res) => {
    const { targetUid } = req.body;
    if (!targetUid) {
      return res.status(400).json({ success: false, error: "El UID destinatario es obligatorio." });
    }
    
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const dbAdm = getFirestoreAdmin();
        const authAdm = getAuthAdmin();
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
          return res.status(403).json({ success: false, error: "Solo superadministradores pueden eliminar cuentas del sistema." });
        }

        const targetDocRef = dbAdm.collection('users').doc(targetUid);
        const targetDoc = await targetDocRef.get();
        if (!targetDoc.exists) {
          return res.status(404).json({ success: false, error: "Usuario a eliminar no encontrado." });
        }

        const primaryAdmin = (process.env.ADMIN_EMAIL || "webmaster@aguadbienesraices.com.ar").trim().toLowerCase();
        if (targetDoc.data()?.email === primaryAdmin || targetDoc.data()?.role === 'super_admin') {
          return res.status(400).json({ success: false, error: "La cuenta de administración inicial y perfiles de super_admin asociados están blindados contra eliminación." });
        }

        await targetDocRef.delete();
        try {
          await authAdm.deleteUser(targetUid);
        } catch (e: any) {
          console.warn("[Auth Sync Warn] El usuario no existía o no pudo borrarse de Auth:", e.message);
        }

        return res.json({ success: true, message: "Usuario removido correctamente de Firestore y Firebase Auth." });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo al eliminar usuario en producción: " + err.message });
      }
    } else {
      try {
        const result = deleteUserAccount(req.callerUid, targetUid);
        if (!result.success) {
          return res.status(400).json(result);
        }
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Properties: Read (filtered by multitenancy)
  app.get("/api/properties", requireAuth, async (req: any, res) => {
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const dbAdm = getFirestoreAdmin();
        const userDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!userDoc.exists) {
          return res.status(403).json({ success: false, error: "ID de usuario de producción inválido." });
        }
        const userData = userDoc.data();
        const orgId = userData?.orgId || 'aguad-bienes-raices';
        const list = await getPropertiesFromFirestore(orgId);
        return res.json({ success: true, properties: list });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo de lectura de propiedades reales en Firestore: " + err.message });
      }
    } else {
      try {
        const list = getProperties(req.callerUid);
        res.json({ success: true, properties: list });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Properties: Create
  app.post("/api/properties/create", requireAuth, async (req: any, res) => {
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const dbAdm = getFirestoreAdmin();
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!callerDoc.exists) {
          return res.status(403).json({ success: false, error: "Identidad inválida." });
        }
        const callerData = callerDoc.data();
        const propData = req.body;
        const newId = propData.id || `prop-${Date.now()}`;
        const nowStr = new Date().toISOString();

        const payload = {
          ...propData,
          id: newId,
          orgId: callerData?.orgId || 'aguad-bienes-raices',
          createdBy: req.callerUid,
          createdAt: nowStr,
          updatedAt: nowStr
        };

        await dbAdm.collection('properties').doc(newId).set(payload);
        return res.json({ success: true, property: payload });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo al registrar propiedad en Firestore: " + err.message });
      }
    } else {
      try {
        const result = createProperty(req.callerUid, req.body);
        if (!result.success) {
          return res.status(400).json(result);
        }
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Properties: Update
  app.post("/api/properties/update", requireAuth, async (req: any, res) => {
    const { id, ...updates } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: "Falta el ID de la propiedad a modificar." });
    }
    
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const dbAdm = getFirestoreAdmin();
        const propRef = dbAdm.collection('properties').doc(id);
        const propDoc = await propRef.get();
        if (!propDoc.exists) {
          return res.status(404).json({ success: false, error: "Propiedad no encontrada en Firestore." });
        }
        
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (callerDoc.data()?.role !== 'super_admin' && propDoc.data()?.orgId !== callerDoc.data()?.orgId) {
          return res.status(403).json({ success: false, error: "Operación de seguridad bloqueada: la propiedad pertenece al entorno multitenant de otra organización." });
        }

        await propRef.update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        return res.json({ success: true, message: "Propiedad modificada correctamente en Firestore de producción." });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo al modificar propiedad en Firestore: " + err.message });
      }
    } else {
      try {
        const result = updateProperty(req.callerUid, id, updates);
        if (!result.success) {
          return res.status(400).json(result);
        }
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Properties: Delete
  app.post("/api/properties/delete", requireAuth, async (req: any, res) => {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: "ID de propiedad requerido." });
    }
    
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const dbAdm = getFirestoreAdmin();
        const propRef = dbAdm.collection('properties').doc(id);
        const propDoc = await propRef.get();
        if (!propDoc.exists) {
          return res.status(404).json({ success: false, error: "Propiedad no encontrada." });
        }
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (callerDoc.data()?.role !== 'super_admin' && propDoc.data()?.orgId !== callerDoc.data()?.orgId) {
          return res.status(403).json({ success: false, error: "No tienes permisos para suprimir propiedades de otra organización." });
        }

        await propRef.delete();
        return res.json({ success: true, message: "Propiedad eliminada correctamente de Firestore de producción." });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo al suprimir la propiedad en Firestore: " + err.message });
      }
    } else {
      try {
        const result = deleteProperty(req.callerUid, id);
        if (!result.success) {
          return res.status(400).json(result);
        }
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Audit: Load log trails
  app.get("/api/audit-logs", requireAuth, async (req: any, res) => {
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const dbAdm = getFirestoreAdmin();
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
          return res.status(403).json({ success: false, error: "Acceso restingido. Solo un Superadministrador puede visualizar bitácoras de auditoría." });
        }

        const snap = await dbAdm.collection('audit_logs').orderBy('createdAt', 'desc').limit(100).get();
        const list: any[] = [];
        snap.forEach((doc: any) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        return res.json({ success: true, logs: list });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Error de lectura de logs reales en Firestore: " + err.message });
      }
    } else {
      try {
        const logs = getAuditLogs(req.callerUid);
        res.json({ success: true, logs });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // Audit: Manually record an action
  app.post("/api/audit-logs/record", requireAuth, async (req: any, res) => {
    const { action, details, userEmail } = req.body;
    if (!action || !details) {
      return res.status(400).json({ success: false, error: "Falta acción o detalles." });
    }
    
    if (process.env.NODE_ENV === "production" || process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        const dbAdm = getFirestoreAdmin();
        await dbAdm.collection('audit_logs').add({
          userId: req.callerUid,
          userEmail: userEmail || "unknown@aguadbienesraices.com.ar",
          action,
          details,
          createdAt: new Date().toISOString(),
          source: "web-client"
        });
        return res.json({ success: true });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Error de registro de log real en Firestore: " + err.message });
      }
    } else {
      try {
        logAudit(req.callerUid, userEmail || "unknown@aguadbienesraices.com.ar", action, details);
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  });

  // --- VITE INTERFACE INTEGRATION ---

  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Listen
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Aguad CloudProp Suite Server] Corriendo en http://localhost:${PORT}`);
  });
}

startServer();
