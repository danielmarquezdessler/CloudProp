export const AGUADI_ZAP_MODULE_NAME = "AGUADI ZAP";
export const AGUADI_ZAP_DISPLAY_NAME = "AGUADI ZAP — Conversión WhatsApp 24/7";
export const AGUADI_ZAP_TECHNICAL_NAME = "aguadi_zap";
export const AGUADI_ZAP_COLLECTION_PREFIX = "aguadi_zap";
export const AGUADI_ZAP_DEFAULT_ORG_ID = "aguad-bienes-raices";

export const AGUADI_ZAP_PERMISSIONS = {
  legacyView: "aguadi.view",
  view: "aguadi_zap.view"
} as const;

export const AGUADI_ZAP_COLLECTIONS = {
  settings: "aguadi_zap_settings",
  conversations: "aguadi_zap_conversations",
  messages: "aguadi_zap_messages",
  leads: "aguadi_zap_leads",
  events: "aguadi_zap_events",
  trainingRules: "aguadi_zap_training_rules",
  routingRules: "aguadi_zap_routing_rules",
  widgetConfigs: "aguadi_zap_widget_configs",
  siteSources: "aguadi_zap_site_sources",
  propertySnapshots: "aguadi_zap_property_snapshots"
} as const;

export const LEGACY_AGUADI_COLLECTIONS = {
  settings: "aguadi_settings",
  conversations: "aguadi_conversations",
  messages: "aguadi_messages",
  leads: "aguadi_leads",
  events: "aguadi_events",
  metricsDaily: "aguadi_metrics_daily",
  trainingRules: "aguadi_training_rules",
  routingRules: "aguadi_agent_routing_rules",
  responseTemplates: "aguadi_response_templates",
  widgetConfigs: "aguadi_widget_configs"
} as const;
