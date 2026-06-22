import { Router } from "express";
import { getFirestoreAdmin } from "./admin";
import { 
  processIncomingMessage, 
  getOrCreateAguadiSettings, 
  getOrCreateWidgetConfig, 
  logAguadiEvent 
} from "./aguadiService";
import {
  AGUADI_ZAP_COLLECTIONS,
  AGUADI_ZAP_DEFAULT_ORG_ID,
  AGUADI_ZAP_PERMISSIONS,
  LEGACY_AGUADI_COLLECTIONS
} from "../../shared/aguadiZap";

const router = Router();
const AGUADI_COLLECTIONS = LEGACY_AGUADI_COLLECTIONS;

const requireProfileOrgId = (profile: any): string => {
  const orgId = profile?.orgId;
  if (!orgId) {
    throw new Error("Falta orgId en el perfil autenticado. AGUADI ZAP no usará fallback de organización.");
  }
  return orgId;
};

// Middleware to authorize AGUADI ZAP access.
const requireAguadiStaff = async (req: any, res: any, next: any) => {
  const callerUid = req.headers['x-user-uid'] || (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].split(' ')[1] : null);
  if (!callerUid) {
    return res.status(401).json({ success: false, error: "Identidad no verificada: UID ausente." });
  }

  try {
    const db = getFirestoreAdmin();
    const userDoc = await db.collection('users').doc(callerUid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Perfil de usuario no encontrado en el sistema." });
    }
    const profile = userDoc.data();
    const permissions = Array.isArray(profile?.permissions) ? profile.permissions : [];
    const canViewAguadiZap =
      profile?.role === 'super_admin' ||
      permissions.includes('*') ||
      permissions.includes(AGUADI_ZAP_PERMISSIONS.legacyView) ||
      permissions.includes(AGUADI_ZAP_PERMISSIONS.view);

    if (!canViewAguadiZap) {
      return res.status(403).json({ success: false, error: "Permiso denegado: Se requiere acceso a AGUADI ZAP." });
    }

    req.callerUid = callerUid;
    req.callerProfile = profile;
    next();
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Error de autorización de AGUADI: " + error.message });
  }
};

const normalizeAttentionStatus = (status: string | undefined) => {
  if (status === "pending" || status === "bot_active" || status === "assigned" || status === "closed") {
    return status;
  }
  if (status === "active" || status === "open") return "bot_active";
  if (status === "routed_to_agent") return "assigned";
  return "pending";
};

const normalizeAttentionChannel = (channel: string | undefined) => {
  if (channel === "whatsapp" || channel === "widget" || channel === "manual") {
    return channel;
  }
  return "manual";
};

const toAttentionCenterItem = (doc: any) => {
  const data = doc.data() || {};
  return {
    id: data.id || data.conversationId || doc.id,
    orgId: data.orgId || "",
    customerName: data.customerName || data.contactName || "Sin nombre registrado",
    customerPhone: data.customerPhone || data.contactPhone || "",
    channel: normalizeAttentionChannel(data.channel),
    status: normalizeAttentionStatus(data.status),
    assignedAgentId: data.assignedAgentId || "",
    assignedAgentName: data.assignedAgentName || "",
    lastMessage: data.lastMessage || data.lastMessageText || "",
    lastMessageAt: data.lastMessageAt || data.updatedAt || data.createdAt || "",
    unreadCount: Number(data.unreadCount) || 0,
    leadScore: Number(data.leadScore ?? data.score) || 0,
    intent: data.intent || data.operationType || "",
    source: data.source || data.channel || "",
    createdAt: data.createdAt || "",
    updatedAt: data.updatedAt || ""
  };
};

const sortByLastActivityDesc = (a: any, b: any) => {
  const left = new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime();
  const right = new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime();
  return right - left;
};

/**
 * 1. public widget configuration endpoint
 */
router.get("/public/widget-config", async (req, res) => {
  const orgId = (req.query.orgId as string) || AGUADI_ZAP_DEFAULT_ORG_ID;
  try {
    const config = await getOrCreateWidgetConfig(orgId);
    res.json({ success: true, config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. WhatsApp Webhook Verification (GET /api/aguadi/webhook)
 * Validates the verification token with Facebook verification protocol.
 */
router.get("/aguadi/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "aguad_verify_token_2026";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[AGUADI Webhook] Successfully verified webhook connection!");
    return res.status(200).send(challenge);
  } else {
    console.warn("[AGUADI Webhook] Failed to verify webhook connection. Token mismatch.");
    return res.status(403).json({ error: "Verification token mismatch" });
  }
});

/**
 * 3. WhatsApp Webhook Event Handler (POST /api/aguadi/webhook)
 * Receives real incoming WhatsApp messages from FB servers.
 */
router.post("/aguadi/webhook", async (req, res) => {
  const body = req.body;

  try {
    // Only accept WhatsApp Business message payload structure
    if (body.object === "whatsapp_business_account" && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const changeValue = body.entry[0].changes[0].value;
      const message = changeValue.messages[0];
      const fromPhone = message.from; // Sender phone number
      const text = message.text?.body || "";

      if (text) {
        // Run AGUADI ZAP Engine asynchronously to respond instantly to WhatsApp.
        processIncomingMessage(fromPhone, text, 'whatsapp', AGUADI_ZAP_DEFAULT_ORG_ID)
          .then((result) => {
            console.log(`[AGUADI Webhook] Correctly processed WhatsApp reply: "${result.reply.substring(0, 30)}..."`);
          })
          .catch((err) => {
            console.error("[AGUADI Webhook] Error processing message async:", err);
          });
      }
    }

    // Always respond 200 OK immediately to WhatsApp headers to prevent retries
    res.status(200).send("EVENT_RECEIVED");
  } catch (error: any) {
    console.error("[AGUADI Webhook] Fatal webhook error:", error);
    res.status(500).send("FAIL");
  }
});

/**
 * 4. Conversational Simulator endpoint (POST /api/aguadi/simulate-incoming)
 * Emulates an incoming WhatsApp/Widget chat message for diagnostics and review.
 */
router.post("/aguadi/simulate-incoming", async (req, res) => {
  const { phone, text, channel, orgId } = req.body;

  if (!phone || !text) {
    return res.status(400).json({ success: false, error: "Número o Texto incompletos en el simulador." });
  }

  const targetChannel = channel === 'widget' ? 'widget' : 'whatsapp';
  if (!orgId) {
    return res.status(400).json({ success: false, error: "Falta orgId para ejecutar el simulador. No se usará fallback de organización." });
  }
  const targetOrg = orgId;

  try {
    const result = await processIncomingMessage(phone, text, targetChannel, targetOrg);
    res.json({
      success: true,
      reply: result.reply,
      conversationId: result.conversationId,
      classification: result.classification,
      leadCreatedOrUpdated: result.leadCreatedOrUpdated
    });
  } catch (error: any) {
    console.error("[AGUADI Simulator] Error running chat emulators:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 5. GET Current AGUADI configuration, training, routing and templates (Multi-entity get)
 */
router.get("/aguadi/settings", requireAguadiStaff, async (req: any, res) => {
  const db = getFirestoreAdmin();

  try {
    const orgId = requireProfileOrgId(req.callerProfile);
    const [settings, widget, rulesSnap, trainingSnap, templatesSnap] = await Promise.all([
      getOrCreateAguadiSettings(orgId),
      getOrCreateWidgetConfig(orgId),
      db.collection(AGUADI_COLLECTIONS.routingRules).where('orgId', '==', orgId).get(),
      db.collection(AGUADI_COLLECTIONS.trainingRules).where('orgId', '==', orgId).get(),
      db.collection(AGUADI_COLLECTIONS.responseTemplates).where('orgId', '==', orgId).get()
    ]);

    const routingRules: any[] = [];
    rulesSnap.forEach((doc: any) => routingRules.push({ id: doc.id, ...doc.data() }));

    const trainingRules: any[] = [];
    trainingSnap.forEach((doc: any) => trainingRules.push({ id: doc.id, ...doc.data() }));

    const responseTemplates: any[] = [];
    templatesSnap.forEach((doc: any) => responseTemplates.push({ id: doc.id, ...doc.data() }));

    res.json({
      success: true,
      settings,
      widget,
      routingRules,
      trainingRules,
      responseTemplates
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6. SAVE AGUADI settings
 */
router.post("/aguadi/settings", requireAguadiStaff, async (req: any, res) => {
  const updates = req.body;
  const db = getFirestoreAdmin();

  try {
    const orgId = requireProfileOrgId(req.callerProfile);
    const ref = db.collection(AGUADI_COLLECTIONS.settings).doc(orgId);
    const updatedPayload = {
      ...updates,
      orgId,
      updatedAt: new Date().toISOString(),
      updatedBy: req.callerUid
    };

    await ref.set(updatedPayload, { merge: true });
    await logAguadiEvent(orgId, 'message_sent', `Configuración general modificada por ${req.callerProfile.email}`);

    res.json({ success: true, message: "Parámetros de AGUADI grabados correctamente.", settings: updatedPayload });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 7. SAVE widget styling config
 */
router.post("/aguadi/widget-config", requireAguadiStaff, async (req: any, res) => {
  const updates = req.body;
  const db = getFirestoreAdmin();

  try {
    const orgId = requireProfileOrgId(req.callerProfile);
    const ref = db.collection(AGUADI_COLLECTIONS.widgetConfigs).doc(orgId);
    const updatedPayload = {
      ...updates,
      orgId,
      updatedAt: new Date().toISOString()
    };

    await ref.set(updatedPayload, { merge: true });
    await logAguadiEvent(orgId, 'message_sent', `Estilos del Widget de Chat actualizados por ${req.callerProfile.email}`);

    res.json({ success: true, message: "Estilos visuales e iniciales de Widget grabados con éxito.", widget: updatedPayload });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 8. GET Attention Center inbox (future AGUADI ZAP collection, read-only)
 */
router.get("/aguadi/attention-center", requireAguadiStaff, async (req: any, res) => {
  const db = getFirestoreAdmin();

  try {
    const orgId = requireProfileOrgId(req.callerProfile);
    const snap = await db.collection(AGUADI_ZAP_COLLECTIONS.conversations)
      .where("orgId", "==", orgId)
      .get();

    const items: any[] = [];
    snap.forEach((doc: any) => items.push(toAttentionCenterItem(doc)));
    items.sort(sortByLastActivityDesc);

    res.json({
      success: true,
      items,
      total: items.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 9. GET Conversations list (filtered by multitenant org)
 */
router.get("/aguadi/conversations", requireAguadiStaff, async (req: any, res) => {
  const db = getFirestoreAdmin();

  try {
    const orgId = requireProfileOrgId(req.callerProfile);
    const snap = await db.collection(AGUADI_COLLECTIONS.conversations)
      .where('orgId', '==', orgId)
      .get();

    const conversations: any[] = [];
    snap.forEach((doc: any) => conversations.push(doc.data()));
    conversations.sort(sortByLastActivityDesc);

    res.json({ success: true, conversations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 9. GET Messages in a specific conversation
 */
router.get("/aguadi/conversations/:id/messages", requireAguadiStaff, async (req: any, res) => {
  const convId = req.params.id;
  const db = getFirestoreAdmin();

  try {
    const snap = await db.collection(AGUADI_COLLECTIONS.messages)
      .where('conversationId', '==', convId)
      .orderBy('timestamp', 'asc')
      .limit(100)
      .get();

    const messages: any[] = [];
    snap.forEach((doc: any) => messages.push(doc.data()));

    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 10. GET Captured Leads
 */
router.get("/aguadi/leads", requireAguadiStaff, async (req: any, res) => {
  const db = getFirestoreAdmin();

  try {
    const orgId = requireProfileOrgId(req.callerProfile);
    const snap = await db.collection(AGUADI_COLLECTIONS.leads)
      .where('orgId', '==', orgId)
      .orderBy('createdAt', 'desc')
      .get();

    const leads: any[] = [];
    snap.forEach((doc: any) => leads.push(doc.data()));

    res.json({ success: true, leads });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 11. GET Dashboard Diagnostics: aggregate numbers, active history, daily counts
 */
router.get("/aguadi/metrics", requireAguadiStaff, async (req: any, res) => {
  const db = getFirestoreAdmin();

  try {
    const orgId = requireProfileOrgId(req.callerProfile);
    const [eventsSnap, metricsSnap, leadsSnap, convsSnap] = await Promise.all([
      db.collection(AGUADI_COLLECTIONS.events).where('orgId', '==', orgId).orderBy('timestamp', 'desc').limit(50).get(),
      db.collection(AGUADI_COLLECTIONS.metricsDaily).where('orgId', '==', orgId).orderBy('date', 'desc').limit(15).get(),
      db.collection(AGUADI_COLLECTIONS.leads).where('orgId', '==', orgId).get(),
      db.collection(AGUADI_COLLECTIONS.conversations).where('orgId', '==', orgId).get()
    ]);

    const events: any[] = [];
    eventsSnap.forEach((doc: any) => events.push(doc.data()));

    const metricsDaily: any[] = [];
    metricsSnap.forEach((doc: any) => metricsDaily.push(doc.data()));

    const totalLeads = leadsSnap.size;
    const totalConversations = convsSnap.size;

    let calificadosCount = 0;
    let scoreSum = 0;
    leadsSnap.forEach((doc: any) => {
      const data = doc.data();
      if (data.status === 'calificado') calificadosCount++;
      scoreSum += Number(data.score) || 0;
    });

    res.json({
      success: true,
      summary: {
        totalLeads,
        totalConversations,
        qualifiedLeads: calificadosCount,
        averageLeadScore: totalLeads > 0 ? Math.round(scoreSum / totalLeads) : 0
      },
      events,
      metricsDaily
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 12. CRUD Endpoints: AGENT ROUTING RULES
 */
router.post("/aguadi/routing-rules/save", requireAguadiStaff, async (req: any, res) => {
  const { id, criteriaType, criteriaValue, assignedAgentId, isActive, priority, name } = req.body;
  const db = getFirestoreAdmin();

  try {
    const orgId = requireProfileOrgId(req.callerProfile);
    const ruleId = id || db.collection(AGUADI_COLLECTIONS.routingRules).doc().id;
    const ref = db.collection(AGUADI_COLLECTIONS.routingRules).doc(ruleId);
    
    const rulePayload = {
      ruleId,
      orgId,
      name: name || `Regla de ${criteriaType}`,
      criteriaType,
      criteriaValue,
      assignedAgentId,
      isActive: isActive !== false,
      priority: Number(priority) || 0,
      updatedAt: new Date().toISOString()
    };

    await ref.set(rulePayload, { merge: true });
    await logAguadiEvent(orgId, 'lead_routed', `Regla de ruteo "${rulePayload.name}" guardada por ${req.callerProfile.email}`);

    res.json({ success: true, message: "Regla de ruteo guardada con éxito.", rule: rulePayload });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/aguadi/routing-rules/delete", requireAguadiStaff, async (req: any, res) => {
  const { id } = req.body;
  const db = getFirestoreAdmin();

  try {
    if (!id) return res.status(400).json({ success: false, error: "ID de regla faltante." });
    await db.collection(AGUADI_COLLECTIONS.routingRules).doc(id).delete();
    res.json({ success: true, message: "Regla eliminada exitosamente." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 13. CRUD Endpoints: TRAINING GUIDELINES (AI instruction injections)
 */
router.post("/aguadi/training-rules/save", requireAguadiStaff, async (req: any, res) => {
  const { id, keywordOrTopic, customGuideline, isActive } = req.body;
  const db = getFirestoreAdmin();

  try {
    const orgId = requireProfileOrgId(req.callerProfile);
    const ruleId = id || db.collection(AGUADI_COLLECTIONS.trainingRules).doc().id;
    const ref = db.collection(AGUADI_COLLECTIONS.trainingRules).doc(ruleId);
    
    const trainingPayload = {
      ruleId,
      orgId,
      keywordOrTopic,
      customGuideline,
      isActive: isActive !== false,
      updatedAt: new Date().toISOString()
    };

    await ref.set(trainingPayload, { merge: true });
    res.json({ success: true, message: "Directriz de entrenamiento IA grabada con éxito.", rule: trainingPayload });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/aguadi/training-rules/delete", requireAguadiStaff, async (req: any, res) => {
  const { id } = req.body;
  const db = getFirestoreAdmin();

  try {
    if (!id) return res.status(400).json({ success: false, error: "ID de directriz requerido." });
    await db.collection(AGUADI_COLLECTIONS.trainingRules).doc(id).delete();
    res.json({ success: true, message: "Directriz eliminada de forma exitosa." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 14. CRUD Endpoints: CUSTOM RESPONSE TEMPLATES
 */
router.post("/aguadi/response-templates/save", requireAguadiStaff, async (req: any, res) => {
  const { id, title, category, text } = req.body;
  const db = getFirestoreAdmin();

  try {
    const orgId = requireProfileOrgId(req.callerProfile);
    const templateId = id || db.collection(AGUADI_COLLECTIONS.responseTemplates).doc().id;
    const ref = db.collection(AGUADI_COLLECTIONS.responseTemplates).doc(templateId);
    
    const templatePayload = {
      templateId,
      orgId,
      title,
      category,
      text,
      updatedAt: new Date().toISOString()
    };

    await ref.set(templatePayload, { merge: true });
    res.json({ success: true, message: "Plantilla institucional registrada con éxito.", template: templatePayload });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/aguadi/response-templates/delete", requireAguadiStaff, async (req: any, res) => {
  const { id } = req.body;
  const db = getFirestoreAdmin();

  try {
    if (!id) return res.status(400).json({ success: false, error: "ID de plantilla faltante." });
    await db.collection(AGUADI_COLLECTIONS.responseTemplates).doc(id).delete();
    res.json({ success: true, message: "Plantilla institucional borrada con éxito." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
