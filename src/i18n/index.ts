export interface Translations {
  auth: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    submit: string;
    forgot: string;
    suspended: string;
    incorrect: string;
    help: string;
    incomplete: string;
  };
  navigation: {
    dashboard: string;
    properties: string;
    users: string;
    audit: string;
    logout: string;
    welcome: string;
  };
  dashboard: {
    title: string;
    properties_count: string;
    active_users: string;
    critical_logs: string;
    recent_activity: string;
    welcome_message: string;
    quick_stats: string;
    role_info: string;
    see_all: string;
  };
  properties: {
    title: string;
    subtitle: string;
    add_new: string;
    edit: string;
    delete: string;
    property_type: string;
    status: string;
    price: string;
    address: string;
    bedrooms: string;
    bathrooms: string;
    area: string;
    empty_state: string;
    search_placeholder: string;
    save_success: string;
    delete_success: string;
    types: {
      house: string;
      apartment: string;
      land: string;
      commercial: string;
    };
    statuses: {
      available: string;
      reserved: string;
      sold: string;
    };
    form: {
      title_label: string;
      desc_label: string;
      address_label: string;
      price_label: string;
      type_label: string;
      status_label: string;
      beds_label: string;
      baths_label: string;
      area_label: string;
      img_label: string;
    };
  };
  users: {
    title: string;
    subtitle: string;
    add_new: string;
    role: string;
    status: string;
    verify_email: string;
    email_check_title: string;
    email_check_desc: string;
    check_btn: string;
    repair_btn: string;
    delete_confirm: string;
    delete_success: string;
    create_success: string;
    roles: {
      super_admin: string;
      agent: string;
      client: string;
    };
    statuses: {
      active: string;
      suspended: string;
      incomplete: string;
    };
    form: {
      name: string;
      email: string;
      password: string;
      role: string;
      status: string;
    };
  };
  logs: {
    title: string;
    subtitle: string;
    table_action: string;
    table_user: string;
    table_details: string;
    table_time: string;
    empty: string;
  };
  common: {
    save: string;
    cancel: string;
    confirm: string;
    delete: string;
    back: string;
    actions: string;
    loading: string;
    error: string;
    no_permission: string;
    success: string;
    view_details: string;
  };
}

export const t: Translations = {
  auth: {
    title: "Aguad CloudProp",
    subtitle: "Suite de gestión inmobiliaria inteligente",
    email: "Correo electrónico",
    password: "Contraseña",
    submit: "Iniciá sesión",
    forgot: "¿Olvidaste tu contraseña?",
    suspended: "Tu cuenta fue suspendida por el administrador.",
    incorrect: "El correo electrónico o la contraseña no son correctos.",
    help: "Contactá a soporte",
    incomplete: "Este correo electrónico tiene un registro incompleto. Contactá a administración."
  },
  navigation: {
    dashboard: "Dashboard",
    properties: "Propiedades",
    users: "Usuarios y permisos",
    audit: "Auditoría",
    logout: "Cerrar sesión",
    welcome: "Hola, "
  },
  dashboard: {
    title: "Panel ejecutivo",
    properties_count: "Propiedades en venta/alquiler",
    active_users: "Cuentas del sistema",
    critical_logs: "Acciones auditadas",
    recent_activity: "Actividad reciente del sistema",
    welcome_message: "Bienvenido a la suite inmobiliaria unificada de Aguad Bienes Raíces.",
    quick_stats: "Indicadores clave de rendimiento",
    role_info: "Nivel de acceso autorizado: ",
    see_all: "Ver todas"
  },
  properties: {
    title: "Catálogo de propiedades",
    subtitle: "Búsqueda, creación, edición y administración de propiedades",
    add_new: "Agregar propiedad",
    edit: "Editar propiedad",
    delete: "Eliminar propiedad",
    property_type: "Tipo de propiedad",
    status: "Estado comercial",
    price: "Precio (USD)",
    address: "Dirección",
    bedrooms: "Dormitorios",
    bathrooms: "Baños",
    area: "Superficie",
    empty_state: "No se encontraron propiedades. Probá ajustar los filtros de búsqueda.",
    search_placeholder: "Buscar por título, dirección o tipo...",
    save_success: "Propiedad guardada correctamente.",
    delete_success: "Propiedad eliminada correctamente.",
    types: {
      house: "Casa",
      apartment: "Departamento",
      land: "Terreno",
      commercial: "Comercial"
    },
    statuses: {
      available: "Disponible",
      reserved: "Reservada",
      sold: "Vendida"
    },
    form: {
      title_label: "Título de la propiedad",
      desc_label: "Descripción detallada",
      address_label: "Dirección",
      price_label: "Precio de venta",
      type_label: "Tipo de propiedad",
      status_label: "Estado comercial",
      beds_label: "Dormitorios",
      baths_label: "Baños",
      area_label: "Superficie cubierta (m²)",
      img_label: "URL de imagen de portada"
    }
  },
  users: {
    title: "Usuarios y permisos",
    subtitle: "Gestión de perfiles, roles y permisos del sistema",
    add_new: "Crear usuario",
    role: "Rol",
    status: "Estado",
    verify_email: "Verificar correo electrónico",
    email_check_title: "Verificador de correo electrónico",
    email_check_desc: "Verifica si el correo electrónico existe en Auth, Firestore o si quedó incompleto.",
    check_btn: "Consultar estado",
    repair_btn: "Reparar cuenta incompleta",
    delete_confirm: "¿Seguro que querés eliminar este usuario? Esta acción es irreversible.",
    delete_success: "Usuario eliminado correctamente.",
    create_success: "Usuario creado correctamente.",
    roles: {
      super_admin: "Administrador",
      agent: "Agente",
      client: "Cliente"
    },
    statuses: {
      active: "Activo",
      suspended: "Suspendido",
      incomplete: "Incompleto"
    },
    form: {
      name: "Nombre y apellido",
      email: "Correo electrónico",
      password: "Contraseña",
      role: "Rol",
      status: "Estado"
    }
  },
  logs: {
    title: "Auditoría",
    subtitle: "Historial de operaciones sensibles del sistema",
    table_action: "Acción",
    table_user: "Usuario",
    table_details: "Detalles",
    table_time: "Fecha y hora",
    empty: "Sin registros de auditoría disponibles."
  },
  common: {
    save: "Guardar cambios",
    cancel: "Cancelar",
    confirm: "Confirmar acción",
    delete: "Eliminar",
    back: "Volver",
    actions: "Acciones",
    loading: "Cargando...",
    error: "Ocurrió un error",
    no_permission: "No tenés permisos para ver esta página.",
    success: "Operación confirmada.",
    view_details: "Ver detalles"
  }
};
