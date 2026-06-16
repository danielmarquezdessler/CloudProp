export type Role = 'super_admin' | 'agent' | 'client';
export type UserStatus = 'active' | 'suspended' | 'incomplete';
export type PropertyType = 'house' | 'apartment' | 'land' | 'commercial';
export type PropertyStatus = 'available' | 'reserved' | 'sold';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  status: UserStatus;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  authUid: string;
  authCreated: boolean;
  permissions?: string[];
}

export interface Property {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  price: number;
  address: string;
  status: PropertyStatus;
  bedrooms: number;
  bathrooms: number;
  areaSqM: number;
  imageUrl: string;
  orgId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'access_denied' | 'role_changed';
  details: string;
  timestamp: string;
}

export interface SessionResolverResponse {
  allowed: boolean;
  role?: Role;
  redirectTo?: string;
  reason?: string;
  messageKey?: string;
}

export interface EmailAvailabilityResponse {
  email: string;
  authExists: boolean;
  firestoreExists: boolean;
  uidMatches: boolean;
  consistencyStatus: 'available' | 'active_user_exists' | 'auth_only' | 'firestore_only' | 'uid_mismatch' | 'orphan_index' | 'incomplete_user';
  canCreate: boolean;
  canRepair: boolean;
  recommendedAction: string;
  uid?: string;
}

export interface AguadiSettings {
  orgId: string;
  assistantName: string;
  businessName: string;
  status: 'active' | 'inactive';
  whatsappEnabled: boolean;
  geminiEnabled: boolean;
  widgetEnabled: boolean;
  defaultAgentId: string;
  defaultFlow: string;
  tone: 'professional' | 'warm' | 'formal';
  safetyMode: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AguadiConversation {
  conversationId: string;
  orgId: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  channel: 'whatsapp' | 'widget';
  status: 'open' | 'active' | 'routed_to_agent' | 'closed';
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AguadiMessage {
  messageId: string;
  conversationId: string;
  orgId: string;
  sender: 'bot' | 'client' | 'agent';
  text: string;
  timestamp: string;
  channel: 'whatsapp' | 'widget';
  metadata?: {
    leadScore?: number;
    isLeadComplete?: boolean;
    tokensUsed?: number;
  };
}

export interface AguadiLead {
  leadId: string;
  orgId: string;
  conversationId: string;
  fullName: string;
  phone: string;
  email?: string;
  operationType?: 'compra' | 'venta' | 'alquiler' | 'otro';
  propertyType?: 'casa' | 'departamento' | 'terreno' | 'comercial' | 'otro';
  zone?: string;
  budgetRange?: string;
  urgency?: 'alta' | 'media' | 'baja';
  source: 'whatsapp' | 'widget';
  status: 'nuevo' | 'contactado' | 'calificado' | 'descartado';
  score?: number;
  assignedAgentId?: string;
  aiSummary?: string;
  nextBestAction?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AguadiWidgetConfig {
  orgId: string;
  visibleName: string;
  initialMessage: string;
  buttonText: string;
  primaryColor: string;
  secondaryColor: string;
  position: 'right' | 'left';
  botAvatarUrl: string;
  quickOptions: string[];
  whatsappNumber?: string;
  allowedDomain: string;
  outOfHoursMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AguadiRoutingRule {
  id?: string;
  ruleId: string;
  orgId: string;
  name: string;
  criteriaType: 'operationType' | 'budget' | 'zone' | 'propertyType';
  criteriaValue: string;
  assignedAgentId: string;
  isActive: boolean;
  priority: number;
}

export interface AguadiTrainingRule {
  id?: string;
  ruleId: string;
  orgId: string;
  keywordOrTopic: string;
  customGuideline: string;
  isActive: boolean;
}

export interface AguadiResponseTemplate {
  id?: string;
  templateId: string;
  orgId: string;
  title: string;
  category: string;
  text: string;
}

export interface AguadiEvent {
  eventId: string;
  orgId: string;
  eventType: 'webhook_received' | 'message_sent' | 'lead_created' | 'lead_routed' | 'ai_error';
  details: string;
  timestamp: string;
}

export interface AguadiMetricsDaily {
  metricId: string;
  orgId: string;
  date: string;
  totalMessagesReceived: number;
  totalMessagesSent: number;
  totalLeadsCreated: number;
  averageScore?: number;
}
