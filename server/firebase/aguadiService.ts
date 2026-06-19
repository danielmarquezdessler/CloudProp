import { GoogleGenAI, Type } from "@google/genai";
import { getFirestoreAdmin } from "./admin";

// Initialize Google GenAI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * Interface definition for structured AGUADI response from Gemini
 */
export interface AguadiGeminiOutput {
  reply: string;
  classification: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
    operationType: 'compra' | 'venta' | 'alquiler' | 'otro' | null;
    propertyType: 'casa' | 'departamento' | 'terreno' | 'comercial' | 'otro' | null;
    zone: string | null;
    budgetRange: string | null;
    urgency: 'alta' | 'media' | 'baja' | null;
    isLeadComplete: boolean;
    leadScore: number; // 0 to 100
    aiSummary: string;
    nextBestAction: string;
  };
}

/**
 * Helper to fetch or create AGUADI base settings for an organization
 */
export async function getOrCreateAguadiSettings(orgId: string): Promise<any> {
  if (!orgId) {
    throw new Error("Falta orgId. No se usará fallback de organización.");
  }
  const db = getFirestoreAdmin();
  const settingsRef = db.collection('aguadi_settings').doc(orgId);
  const snapshot = await settingsRef.get();

  if (snapshot.exists) {
    return snapshot.data();
  }

  // Create default settings if not exists
  const defaultSettings = {
    orgId,
    assistantName: "AGUADI",
    businessName: "Facundo Aguad Bienes Raíces",
    status: 'active',
    whatsappEnabled: false,
    geminiEnabled: true,
    widgetEnabled: true,
    defaultAgentId: "agent-default",
    defaultFlow: "conversational_lead_gen",
    tone: 'warm',
    safetyMode: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: "system"
  };

  await settingsRef.set(defaultSettings);
  return defaultSettings;
}

/**
 * Helper to fetch or create Widget Config for an organization
 */
export async function getOrCreateWidgetConfig(orgId: string): Promise<any> {
  if (!orgId) {
    throw new Error("Falta orgId. No se usará fallback de organización.");
  }
  const db = getFirestoreAdmin();
  const configRef = db.collection('aguadi_widget_configs').doc(orgId);
  const snapshot = await configRef.get();

  if (snapshot.exists) {
    return snapshot.data();
  }

  // Create default widget configuration
  const defaultConfig = {
    orgId,
    visibleName: "Asistente AGUADI 24/7",
    initialMessage: "¡Hola! Estoy aquí para ayudarte a comprar, vender o alquilar propiedades de forma óptima. ¿Cuál es tu consulta hoy?",
    buttonText: "Escribinos por WhatsApp/Chat",
    primaryColor: "#0f172a", // slate-900
    secondaryColor: "#10b981", // emerald-500
    position: 'right',
    botAvatarUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=60",
    quickOptions: [
      "Quiero comprar una propiedad",
      "Quiero tasar/vender mi propiedad",
      "Quiero alquilar un inmueble"
    ],
    whatsappNumber: "+5493816666666",
    allowedDomain: "cloudprop.aguadbienesraices.com.ar",
    outOfHoursMode: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await configRef.set(defaultConfig);
  return defaultConfig;
}

/**
 * Log AGUADI Automation Event
 */
export async function logAguadiEvent(orgId: string, eventType: string, details: string): Promise<void> {
  try {
    const db = getFirestoreAdmin();
    const eventRef = db.collection('aguadi_events').doc();
    await eventRef.set({
      eventId: eventRef.id,
      orgId,
      eventType,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[AGUADI Event Log] Error writing audit log:", error);
  }
}

/**
 * Update daily metrics
 */
export async function incrementDailyMetric(orgId: string, type: 'received' | 'sent' | 'lead'): Promise<void> {
  try {
    const db = getFirestoreAdmin();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const metricId = `${orgId}_${today}`;
    const metricRef = db.collection('aguadi_metrics_daily').doc(metricId);

    await db.runTransaction(async (transaction: any) => {
      const doc = await transaction.get(metricRef);
      if (!doc.exists) {
        transaction.set(metricRef, {
          metricId,
          orgId,
          date: today,
          totalMessagesReceived: type === 'received' ? 1 : 0,
          totalMessagesSent: type === 'sent' ? 1 : 0,
          totalLeadsCreated: type === 'lead' ? 1 : 0,
          updatedAt: new Date().toISOString()
        });
      } else {
        const data = doc.data();
        const updates: any = { updatedAt: new Date().toISOString() };
        if (type === 'received') updates.totalMessagesReceived = (data.totalMessagesReceived || 0) + 1;
        if (type === 'sent') updates.totalMessagesSent = (data.totalMessagesSent || 0) + 1;
        if (type === 'lead') updates.totalLeadsCreated = (data.totalLeadsCreated || 0) + 1;
        transaction.update(metricRef, updates);
      }
    });
  } catch (error) {
    console.error("[AGUADI Metrics] Error updating daily metrics:", error);
  }
}

/**
 * Route Lead to Agent based on active criteria rules
 */
export async function routeLeadToAgent(orgId: string, leadData: any, defaultAgentId: string): Promise<string> {
  try {
    const db = getFirestoreAdmin();
    const rulesSnapshot = await db.collection('aguadi_agent_routing_rules')
      .where('orgId', '==', orgId)
      .where('isActive', '==', true)
      .get();

    const rules: any[] = [];
    rulesSnapshot.forEach((doc: any) => rules.push({ ruleId: doc.id, ...doc.data() }));

    // Sort by priority (higher priority runs first)
    rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of rules) {
      const { criteriaType, criteriaValue, assignedAgentId } = rule;
      if (!criteriaType || !criteriaValue || !assignedAgentId) continue;

      if (criteriaType === 'operationType' && leadData.operationType?.toLowerCase() === criteriaValue.toLowerCase()) {
        await logAguadiEvent(orgId, 'lead_routed', `Lead asignado al agente ${assignedAgentId} vía regla ID: ${rule.ruleId} de operación "${criteriaValue}"`);
        return assignedAgentId;
      }
      if (criteriaType === 'propertyType' && leadData.propertyType?.toLowerCase() === criteriaValue.toLowerCase()) {
        await logAguadiEvent(orgId, 'lead_routed', `Lead asignado al agente ${assignedAgentId} vía regla ID: ${rule.ruleId} de tipo propiedad "${criteriaValue}"`);
        return assignedAgentId;
      }
      if (criteriaType === 'zone' && leadData.zone && leadData.zone.toLowerCase().includes(criteriaValue.toLowerCase())) {
        await logAguadiEvent(orgId, 'lead_routed', `Lead asignado al agente ${assignedAgentId} vía regla ID: ${rule.ruleId} de zona coincidente con "${criteriaValue}"`);
        return assignedAgentId;
      }
    }

    // Default agent route
    await logAguadiEvent(orgId, 'lead_routed', `Lead asignado al agente de contingencia ${defaultAgentId}`);
    return defaultAgentId;
  } catch (error) {
    console.error("[AGUADI Routing] Error executing routing rules:", error);
    return defaultAgentId;
  }
}

/**
 * Call Gemini to analyze the context and produce an answer conforming to structured output
 */
export async function generateAguadiReply(
  userInput: string,
  history: { sender: string; text: string }[],
  settings: any,
  trainingRules: any[],
  templates: any[]
): Promise<AguadiGeminiOutput> {
  
  // Format conversation history
  const historyText = history.map(h => `${h.sender === 'client' ? 'Cliente' : h.sender === 'bot' ? 'AGUADI' : 'Agente Humano'}: ${h.text}`).join('\n');

  // Format custom training guidelines
  const trainingText = trainingRules && trainingRules.length > 0 
    ? trainingRules.map(r => `- Tema: "${r.keywordOrTopic}" -> Directiva de respuesta: "${r.customGuideline}"`).join('\n')
    : "Sin directivas específicas aún.";

  // Format templates to let AI refer to official ones
  const templateText = templates && templates.length > 0
    ? templates.map(t => `- Título: "${t.title}" (Categoría: ${t.category}): "${t.text}"`).join('\n')
    : "Sin plantillas institucionales de respuesta.";

  // System instruction with real estate strict boundaries
  const systemInstruction = `
Eres AGUADI, el agente inteligente bilingüe interactivo y robot oficial de Facundo Aguad Bienes Raíces (sitio de desarrollo: cloudprop.aguadbienesraices.com.ar). Tu objetivo es guiar, responder consultas, amablemente capturar información relevante de los leads (clientes interesados en comprar, vender o alquilar) y derivar un resumen calificado a un agente de ventas humano calificado.

REGLAS DE COMPORTAMIENTO MANDATORIAS (CERO COMPROMISOS):
1. NO inventarás propiedades o listados ficticios. Siempre basate estrictamente en lo que el usuario declara o de forma genérica respecto al mercado inmobiliario de San Miguel de Tucumán y Yerba Buena.
2. NO harás tasaciones oficiales ni prometerás valuaciones de mercado específicas sobre la marcha. Ofrece coordinar un turno con un agente experto para realizar una tasación profesional fundamentada.
3. NO prometas disponibilidad inmediata para alquileres o ventas de inmuebles específicos en nombre de la inmobiliaria sin previa validación directa.
4. NUNCA pretendas reemplazar en su totalidad o de forma exclusiva la figura del agente inmobiliario real. Eres su robot asistente.
5. El tono preferencial configurado para la empresa es: "${settings.tone}". Mantén este estilo lingüístico en todo momento (profesional, cálido, formal o moderno).
6. Comunícate preferentemente en español nativo de Argentina, pero responde amablemente en inglés si el cliente te saluda o responde en ese idioma.
7. Guíate y aplica estas Directivas de Entrenamiento Específicas si el cliente menciona temas relacionados:
${trainingText}

PLAN PLANTILLAS SUGERIDAS (Úsalas para inspirarte o adoptarlas textualmente si encajan con el contexto):
${templateText}

Deberás recolectar amablemente los datos del cliente a lo largo de la conversación, de forma ágil sin abrumarlos (lo ideal es obtener Nombre, Teléfono/Email, Tipo de Operación: Compra/Venta/Alquiler, Tipo de Propiedad, Zona y Presupuesto).

DEBES RETORNAR UN RESULTADO ESTRUCTURADO EN FORMATO JSON QUE CUMPLA CON LA SIGUIENTE ESTRUCTURA EXACTA:
{
  "reply": "Tu mensaje respuesta en texto que se le enviará directamente al cliente por WhatsApp/Web Chat.",
  "classification": {
    "fullName": "Nombre completo extraído del cliente hasta el momento en esta interacción (null si no se ha mencionado o no se deduce con claridad)",
    "email": "Email del cliente extraído de esta interacción (null si no mencionado)",
    "phone": "Teléfono del cliente (null si no mencionado)",
    "operationType": "compra" | "venta" | "alquiler" | "otro" | null,
    "propertyType": "casa" | "departamento" | "terreno" | "comercial" | "otro" | null,
    "zone": "Zona o barrio geográfico de preferencia del lead, ej: 'Yerba Buena', 'Barrio Norte' (null si no mencionado)",
    "budgetRange": "Rango de presupuesto del cliente, ej: 'USD 80,000 - 100,000', 'AR$ 150,000' (null si no mencionado)",
    "urgency": "alta" | "media" | "baja" | null,
    "isLeadComplete": true o false (debe ser true si al menos se conoce el fullName del cliente Y tiene claro lo que busca, permitiendo su contacto directo; false de lo contrario),
    "leadScore": un entero entre 0 y 100 estimando qué tan calificado y listo para comerciar está este lead basándote en la precisión de sus datos y de lo que busca,
    "aiSummary": "Un resumen conciso y profesional de un párrafo breve conteniendo la situación y el interés de este lead para que lo lea el agente de ventas.",
    "nextBestAction": "La mejor acción inmediata sugerida para el agente de ventas respecto a este lead."
  }
}

IMPORTANTE: Escribe la respuesta JSON de forma impecable sin preámbulos, delimitadores rústicos de texto markdown como \`\`\`json, solo el JSON puro.
`;

  const prompt = `
HISTORIAL DE LA CONVERSACIÓN PREVIO:
${historyText}

NUEVO MENSAJE ENTRANTE DEL CLIENTE:
"${userInput}"

Determina la respuesta adecuada para el cliente y actualiza el análisis y estructuración calificada del lead en formato JSON:
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const textOutput = response.text || "{}";
    let cleanedJson = textOutput.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.replace(/^```/, "").replace(/```$/, "").trim();
    }

    return JSON.parse(cleanedJson) as AguadiGeminiOutput;
  } catch (error) {
    console.error("[AGUADI Gemini] Error generating response:", error);
    return {
      reply: "Hola, disculpas por el inconveniente. En este momento estoy experimentando un pequeño problema técnico para procesar tu solicitud de forma dinámica. Dejo tu mensaje registrado para que uno de nuestros asesores comerciales te contacte a la brevedad.",
      classification: {
        fullName: null,
        email: null,
        phone: null,
        operationType: null,
        propertyType: null,
        zone: null,
        budgetRange: null,
        urgency: 'media',
        isLeadComplete: false,
        leadScore: 10,
        aiSummary: "Falla temporal en el análisis lingüístico de IA. Detalle del último mensaje: " + userInput,
        nextBestAction: "Contactar de forma manual por el canal correspondiente."
      }
    };
  }
}

/**
 * Core Algorithm: Process incoming text message (from WhatsApp webhook or Widget testing page)
 */
export async function processIncomingMessage(
  fromPhone: string,
  text: string,
  channel: 'whatsapp' | 'widget',
  orgId: string
): Promise<{ reply: string; conversationId: string; classification: any; leadCreatedOrUpdated: boolean }> {
  if (!orgId) {
    throw new Error("Falta orgId. No se usará fallback de organización.");
  }
  
  const db = getFirestoreAdmin();
  const conversationId = `${channel}_${fromPhone.replace(/\D/g, '')}`;

  console.log(`[AGUADI Engine] Processing message from: ${fromPhone} to conversation: ${conversationId}`);

  // 1. Log metric & event
  await incrementDailyMetric(orgId, 'received');
  await logAguadiEvent(orgId, 'webhook_received', `Mensaje recibido de ${fromPhone} vía ${channel}: "${text.substring(0, 60)}"`);

  // 2. Fetch or create settings, training rules, and templates in parallel
  const [settings, trainingRulesSnap, templatesSnap] = await Promise.all([
    getOrCreateAguadiSettings(orgId),
    db.collection('aguadi_training_rules').where('orgId', '==', orgId).where('isActive', '==', true).get(),
    db.collection('aguadi_response_templates').where('orgId', '==', orgId).get()
  ]);

  const trainingRules: any[] = [];
  trainingRulesSnap.forEach((doc: any) => trainingRules.push(doc.data()));

  const templates: any[] = [];
  templatesSnap.forEach((doc: any) => templates.push(doc.data()));

  // 3. Save incoming client message
  const msgClientRef = db.collection('aguadi_messages').doc();
  await msgClientRef.set({
    messageId: msgClientRef.id,
    conversationId,
    orgId,
    sender: 'client',
    text,
    channel,
    timestamp: new Date().toISOString()
  });

  // 4. Fetch conversation history (last 10 messages)
  const historySnap = await db.collection('aguadi_messages')
    .where('conversationId', '==', conversationId)
    .orderBy('timestamp', 'asc')
    .limit(10)
    .get();

  const history: { sender: string; text: string }[] = [];
  historySnap.forEach((doc: any) => {
    const data = doc.data();
    history.push({ sender: data.sender, text: data.text });
  });

  // Ensure settings allow AGUADI to respond
  if (settings.status !== 'active') {
    const defaultAgentRoute = settings.defaultAgentId || "agent-default";
    const outOfServiceReply = "Estimado cliente, nuestro asistente inteligente AGUADI está inactivo temporalmente por mantenimiento. Por favor, aguarde unos momentos, su consulta ya está registrada y será atendida personalmente por uno de nuestros asesores inmobiliarios.";
    
    // Save bot message
    const msgBotRef = db.collection('aguadi_messages').doc();
    await msgBotRef.set({
      messageId: msgBotRef.id,
      conversationId,
      orgId,
      sender: 'bot',
      text: outOfServiceReply,
      channel,
      timestamp: new Date().toISOString()
    });

    return {
      reply: outOfServiceReply,
      conversationId,
      classification: null,
      leadCreatedOrUpdated: false
    };
  }

  // 5. Call Gemini to get Reply + Classification Analysis
  const aiOutput = await generateAguadiReply(text, history, settings, trainingRules, templates);

  // 6. Save bot response message
  const msgBotRef = db.collection('aguadi_messages').doc();
  await msgBotRef.set({
    messageId: msgBotRef.id,
    conversationId,
    orgId,
    sender: 'bot',
    text: aiOutput.reply,
    channel,
    timestamp: new Date().toISOString(),
    metadata: {
      leadScore: aiOutput.classification.leadScore,
      isLeadComplete: aiOutput.classification.isLeadComplete
    }
  });

  await incrementDailyMetric(orgId, 'sent');
  await logAguadiEvent(orgId, 'message_sent', `Respuesta enviada a ${fromPhone}: "${aiOutput.reply.substring(0, 60)}"`);

  // 7. Manage or Create Conversation
  const convRef = db.collection('aguadi_conversations').doc(conversationId);
  const convSnapshot = await convRef.get();

  const conversationStatus = aiOutput.classification.isLeadComplete ? 'active' : 'open';

  if (!convSnapshot.exists) {
    await convRef.set({
      conversationId,
      orgId,
      contactName: aiOutput.classification.fullName || fromPhone,
      contactPhone: fromPhone,
      contactEmail: aiOutput.classification.email || "",
      channel,
      status: conversationStatus,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } else {
    const existingConv = convSnapshot.data();
    await convRef.update({
      contactName: aiOutput.classification.fullName || existingConv.contactName || fromPhone,
      contactEmail: aiOutput.classification.email || existingConv.contactEmail || "",
      status: conversationStatus,
      lastMessageAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // 8. Lead Capture System
  let leadCreatedOrUpdated = false;
  
  // Create / Update lead document if any parameter is captured
  if (aiOutput.classification.fullName || aiOutput.classification.propertyType || aiOutput.classification.operationType) {
    const leadId = `lead_${conversationId}`;
    const leadRef = db.collection('aguadi_leads').doc(leadId);
    const leadSnapshot = await leadRef.get();

    const assignedAgentId = await routeLeadToAgent(orgId, aiOutput.classification, settings.defaultAgentId || "agent-default");

    const payload: any = {
      leadId,
      orgId,
      conversationId,
      fullName: aiOutput.classification.fullName || fromPhone,
      phone: fromPhone,
      email: aiOutput.classification.email || "",
      operationType: aiOutput.classification.operationType || null,
      propertyType: aiOutput.classification.propertyType || null,
      zone: aiOutput.classification.zone || null,
      budgetRange: aiOutput.classification.budgetRange || null,
      urgency: aiOutput.classification.urgency || 'media',
      source: channel,
      status: aiOutput.classification.isLeadComplete ? 'calificado' : 'nuevo',
      score: aiOutput.classification.leadScore,
      assignedAgentId,
      aiSummary: aiOutput.classification.aiSummary,
      nextBestAction: aiOutput.classification.nextBestAction,
      updatedAt: new Date().toISOString()
    };

    if (!leadSnapshot.exists) {
      payload.createdAt = new Date().toISOString();
      payload.createdBy = "AGUADI_BOT";
      await leadRef.set(payload);
      leadCreatedOrUpdated = true;
      await incrementDailyMetric(orgId, 'lead');
      await logAguadiEvent(orgId, 'lead_created', `Nuevo Lead capturado y registrado: ${payload.fullName} (${payload.operationType || 'Consulta'}) - Calificación: ${payload.score}`);
    } else {
      await leadRef.update(payload);
      leadCreatedOrUpdated = true;
    }
  }

  // 9. Real WhatsApp API integration (If configured helper is present)
  // We check if the token and active credentials exist
  if (channel === 'whatsapp' && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
      const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: fromPhone,
          type: "text",
          text: { body: aiOutput.reply }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[AGUADI Engine] Failed to dispatch real WhatsApp message:", errorData);
        await logAguadiEvent(orgId, 'ai_error', `Error enviando mensaje real a través de WhatsApp Business API: ${JSON.stringify(errorData)}`);
      } else {
        console.log(`[AGUADI Engine] Message dispatched via real WhatsApp Cloud API successfully!`);
      }
    } catch (wsErr: any) {
      console.error("[AGUADI Engine] Network error dispatching real WhatsApp message:", wsErr);
      await logAguadiEvent(orgId, 'ai_error', `Error de red contactando la API de WhatsApp Cloud: ${wsErr.message}`);
    }
  }

  return {
    reply: aiOutput.reply,
    conversationId,
    classification: aiOutput.classification,
    leadCreatedOrUpdated
  };
}
