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

const PORT = Number(process.env.PORT) || 3000;
const USE_FIREBASE_BACKEND =
  process.env.NODE_ENV === "production" ||
  !!process.env.K_SERVICE ||
  process.env.USE_FIREBASE_EMULATOR === "true";

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
      return res.status(401).json({ success: false, error: "InfracciÃ³n de seguridad: no se ha proporcionado UID de sesiÃ³n." });
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
      return res.status(400).json({ success: false, error: "Datos insuficientes para generar la ficha (TÃ­tulo, precio y direcciÃ³n requeridos)." });
    }
    try {
      const ai = getAI();
      const prompt = `
Eres un redactor inmobiliario de Ã©lite trabajando para 'Facundo Aguad Bienes RaÃ­ces' (TucumÃ¡n, Argentina). Tu tarea es crear una ficha tÃ©cnica y descripciÃ³n de alta conversiÃ³n para las redes sociales y portal de la siguiente propiedad:
Propiedad: ${title}
Precio: USD ${price}
UbicaciÃ³n: ${address}
CaracterÃ­sticas: ${bedrooms || 0} dorms, ${bathrooms || 0} baÃ±os, ${areaSqM || 0} m2.
Detalles: ${description || 'Sin descripciÃ³n adicional'}.

Crea una redacciÃ³n sumamente atractiva y profesional dividida en 3 secciones en base al idioma claramente etiquetadas con banderas y emojis: EspaÃ±ol (ES ðŸ‡¦ðŸ‡·), InglÃ©s (EN ðŸ‡¬ðŸ‡§) y PortuguÃ©s (PT ðŸ‡§ðŸ‡·). Destaca el estilo de vida, la luminosidad, la ubicaciÃ³n tÃ¡ctica, y aÃ±ade un gancho de venta (Call to action) con emojis inmobiliarios.
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
      return res.status(400).json({ success: false, error: "Requerimiento de conversaciÃ³n vacÃ­o." });
    }
    try {
      const ai = getAI();
      const systemInstruction = `
ActÃºa como un motor de anÃ¡lisis cognitivo avanzado para 'Facundo Aguad Bienes RaÃ­ces'.
DeberÃ¡s procesar el requerimiento o mensaje directo del potencial cliente, extraer y clasificar los datos clave con precisiÃ³n predictiva.
Debes retornar estrictamente un JSON vÃ¡lido con esta estructura:
{
  "name": "Nombre extraÃ­do o 'No identificado'",
  "phone": "TelÃ©fono o 'No provisto'",
  "operationType": "compra" | "venta" | "alquiler" | "otro",
  "propertyType": "casa" | "departamento" | "terreno" | "comercial" | "otro",
  "zone": "Yerba Buena, Barrio Norte, Centro, etc. o 'No especificada'",
  "budget": "Presupuesto o 'No definido'",
  "temp": "FrÃ­a" | "Tibia" | "Caliente",
  "score": 0 a 100,
  "summary": "Resumen conciso del lead de un pÃ¡rrafo rÃ¡pido",
  "nextStep": "GuÃ­a tÃ¡ctica para el agente de venta"
}
IMPORTANTE: Retorna Ãºnicamente el JSON vÃ¡lido, sin delimitadores rÃºsticos de markdown ni textos introductorios.
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
      res.status(500).json({ success: false, error: "Error de anÃ¡lisis cognitivo: " + err.message });
    }
  });

  // 3. AI Predictive Appraisal (TasaciÃ³n)
  app.post("/api/ai/tasar", requireAuth, async (req: any, res) => {
    const { zone, areaSqM, bedrooms, propertyType, description } = req.body;
    if (!zone || !areaSqM || !propertyType) {
      return res.status(400).json({ success: false, error: "ParÃ¡metros de tasaciÃ³n incompletos (Zona, Superficie y Tipo requeridos)." });
    }
    try {
      const ai = getAI();
      const prompt = `
ActÃºa como tasador inmobiliario experto en San Miguel de TucumÃ¡n y Yerba Buena (lÃ­deres del mercado en TucumÃ¡n). Realiza una estimaciÃ³n rÃ¡pida de valor de mercado e informe de tasaciÃ³n para:
- Tipo de Inmueble: ${propertyType}
- Zona/Barrio: ${zone}
- Superficie total: ${areaSqM} m2
- Dormitorios: ${bedrooms || 1}
- Comentarios adicionales: ${description || 'Sin comentarios'}

Genera un informe rÃ¡pido de tasaciÃ³n en espaÃ±ol argentino bien estructurado usando Markdown. Incluye:
1. Rango de Valor Estimado (USD de venta y AR$ de alquiler recomendados para el contexto regional actual).
2. JustificaciÃ³n TÃ©cnica (Por quÃ© vale eso basÃ¡ndote en la superficie y zona).
3. Consejos de PublicaciÃ³n (CÃ³mo optimizar la oferta para vender o alquilar rÃ¡pido).
      `.trim();

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ success: true, report: response.text });
    } catch (err: any) {
      console.error("[AI Valuation Error]:", err);
      res.status(500).json({ success: false, error: "Error en el motor de tasaciÃ³n AI: " + err.message });
    }
  });

  // Auth: Email availability check
  app.get("/api/auth/check-email", async (req, res) => {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, error: "El parÃ¡metro de correo electrÃ³nico es requerido." });
    }
    
    // Strict production isolation check
    if (USE_FIREBASE_BACKEND) {
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
            recommendedAction = "El usuario ya existe de forma completa y consistente. Inicie sesiÃ³n.";
          } else {
            consistencyStatus = 'uid_mismatch';
            canCreate = false;
            canRepair = true;
            recommendedAction = "Se detectÃ³ desajuste crÃ­tico entre Auth y Base de datos. Ejecute reparaciÃ³n.";
          }
        } else if (authExists && !firestoreExists) {
          consistencyStatus = 'auth_only';
          canCreate = false;
          canRepair = true;
          recommendedAction = "Registro incompleto en Auth sin documento de base de datos. Requiere reparaciÃ³n.";
        } else if (!authExists && firestoreExists) {
          consistencyStatus = 'firestore_only';
          canCreate = false;
          canRepair = true;
          recommendedAction = "Existe perfil pero no credenciales de acceso. Requiere asignarle contraseÃ±a.";
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
        return res.status(500).json({ success: false, error: "Error en validaciÃ³n real de email de producciÃ³n: " + err.message });
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
    if (USE_FIREBASE_BACKEND) {
      return res.status(400).json({ 
        success: false, 
        error: "El inicio de sesiÃ³n local estÃ¡ deshabilitado en producciÃ³n. Inicie sesiÃ³n directamente mediante Firebase Auth en la interfaz comercial." 
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
    if (USE_FIREBASE_BACKEND) {
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
          reason: "SesiÃ³n autorizada correctamente vÃ­a Firestore de producciÃ³n."
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Error de verificaciÃ³n de sesiÃ³n en producciÃ³n: " + err.message });
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
      return res.status(400).json({ success: false, error: "El correo es requerido para la reparaciÃ³n." });
    }
    
    if (USE_FIREBASE_BACKEND) {
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
          return res.status(409).json({
            success: false,
            error: "Perfil sin credenciales detectado. Por seguridad no se crean usuarios Auth con contraseñas temporales hardcodeadas; use un flujo backend seguro de Firebase Admin SDK con credencial provista por canal seguro."
          });
        } else if (authUser && !userDoc) {
          const callerOrgId = callerDoc.data().orgId;
          if (!callerOrgId) {
            return res.status(400).json({ success: false, error: "Falta orgId en el perfil administrador autenticado. No se usará fallback de organización." });
          }
          await dbAdm.collection('users').doc(authUser.uid).set({
            uid: authUser.uid,
            authUid: authUser.uid,
            email: emailNorm,
            displayName: authUser.displayName || 'Usuario Recuperado',
            role: 'client',
            status: 'active',
            orgId: callerOrgId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            authCreated: true
          });
          return res.json({ success: true, message: "ReparaciÃ³n exitosa: Se recompuso el documento de perfil del usuario en Firestore." });
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
            return res.json({ success: true, message: "ReparaciÃ³n exitosa: Se consolidÃ³ el ID de colecciÃ³n con UID de autenticaciÃ³n." });
          }
        }
        return res.json({ success: true, message: "El usuario ya se encuentra en un estado completamente consistente." });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo al ejecutar reparaciÃ³n de producciÃ³n: " + err.message });
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
    if (USE_FIREBASE_BACKEND) {
      try {
        const dbAdm = getFirestoreAdmin();
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!callerDoc.exists) {
          return res.status(403).json({ success: false, error: "Usuario de sesiÃ³n invÃ¡lido." });
        }
        const callerData = callerDoc.data();
        let query: any = dbAdm.collection('users');
        if (callerData?.role !== 'super_admin') {
          if (!callerData?.orgId) {
            return res.status(400).json({ success: false, error: "Falta orgId en el perfil autenticado. No se usará fallback de organización." });
          }
          query = query.where('orgId', '==', callerData.orgId);
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
    
    if (USE_FIREBASE_BACKEND) {
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

        const callerOrgId = callerDoc.data().orgId;
        const targetOrgId = orgId || callerOrgId;
        if (!targetOrgId) {
          return res.status(400).json({ success: false, error: "Falta orgId para el usuario a crear. No se usará fallback de organización." });
        }

        await dbAdm.collection('users').doc(uid).set({
          uid,
          authUid: uid,
          email: emailNorm,
          displayName,
          role,
          roleLabel: role === 'super_admin' ? 'Superadministrador' : role === 'agent' ? 'Agente de Ventas' : 'Cliente',
          status: status || 'active',
          orgId: targetOrgId,
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
          user: { uid, email: emailNorm, displayName, role, orgId: targetOrgId }
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo al crear usuario en producciÃ³n: " + err.message });
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
    
    if (USE_FIREBASE_BACKEND) {
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
        return res.status(500).json({ success: false, error: "Fallo al modificar usuario en producciÃ³n: " + err.message });
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
    
    if (USE_FIREBASE_BACKEND) {
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
          return res.status(400).json({ success: false, error: "La cuenta de administraciÃ³n inicial y perfiles de super_admin asociados estÃ¡n blindados contra eliminaciÃ³n." });
        }

        await targetDocRef.delete();
        try {
          await authAdm.deleteUser(targetUid);
        } catch (e: any) {
          console.warn("[Auth Sync Warn] El usuario no existÃ­a o no pudo borrarse de Auth:", e.message);
        }

        return res.json({ success: true, message: "Usuario removido correctamente de Firestore y Firebase Auth." });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: "Fallo al eliminar usuario en producciÃ³n: " + err.message });
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
    if (USE_FIREBASE_BACKEND) {
      try {
        const dbAdm = getFirestoreAdmin();
        const userDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!userDoc.exists) {
          return res.status(403).json({ success: false, error: "ID de usuario de producciÃ³n invÃ¡lido." });
        }
        const userData = userDoc.data();
        const orgId = userData?.orgId;
        if (!orgId) {
          return res.status(400).json({ success: false, error: "Falta orgId en el perfil autenticado. No se usará fallback de organización." });
        }
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
    if (USE_FIREBASE_BACKEND) {
      try {
        const dbAdm = getFirestoreAdmin();
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!callerDoc.exists) {
          return res.status(403).json({ success: false, error: "Identidad invÃ¡lida." });
        }
        const callerData = callerDoc.data();
        const propData = req.body;
        const newId = propData.id || `prop-${Date.now()}`;
        const nowStr = new Date().toISOString();

        if (!callerData?.orgId) {
          return res.status(400).json({ success: false, error: "Falta orgId en el perfil autenticado. No se usará fallback de organización." });
        }

        const payload = {
          ...propData,
          id: newId,
          orgId: callerData.orgId,
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
    
    if (USE_FIREBASE_BACKEND) {
      try {
        const dbAdm = getFirestoreAdmin();
        const propRef = dbAdm.collection('properties').doc(id);
        const propDoc = await propRef.get();
        if (!propDoc.exists) {
          return res.status(404).json({ success: false, error: "Propiedad no encontrada en Firestore." });
        }
        
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (callerDoc.data()?.role !== 'super_admin' && propDoc.data()?.orgId !== callerDoc.data()?.orgId) {
          return res.status(403).json({ success: false, error: "OperaciÃ³n de seguridad bloqueada: la propiedad pertenece al entorno multitenant de otra organizaciÃ³n." });
        }

        await propRef.update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        return res.json({ success: true, message: "Propiedad modificada correctamente en Firestore de producciÃ³n." });
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
    
    if (USE_FIREBASE_BACKEND) {
      try {
        const dbAdm = getFirestoreAdmin();
        const propRef = dbAdm.collection('properties').doc(id);
        const propDoc = await propRef.get();
        if (!propDoc.exists) {
          return res.status(404).json({ success: false, error: "Propiedad no encontrada." });
        }
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (callerDoc.data()?.role !== 'super_admin' && propDoc.data()?.orgId !== callerDoc.data()?.orgId) {
          return res.status(403).json({ success: false, error: "No tienes permisos para suprimir propiedades de otra organizaciÃ³n." });
        }

        await propRef.delete();
        return res.json({ success: true, message: "Propiedad eliminada correctamente de Firestore de producciÃ³n." });
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
    if (USE_FIREBASE_BACKEND) {
      try {
        const dbAdm = getFirestoreAdmin();
        const callerDoc = await dbAdm.collection('users').doc(req.callerUid).get();
        if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
          return res.status(403).json({ success: false, error: "Acceso restingido. Solo un Superadministrador puede visualizar bitÃ¡coras de auditorÃ­a." });
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
      return res.status(400).json({ success: false, error: "Falta acciÃ³n o detalles." });
    }
    
    if (USE_FIREBASE_BACKEND) {
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

  if (!USE_FIREBASE_BACKEND) {
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

