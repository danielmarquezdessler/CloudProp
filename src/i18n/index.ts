export type Language = 'es' | 'en' | 'pt-BR';

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
    }
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
    }
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

export const dictionary: Record<Language, Translations> = {
  es: {
    auth: {
      title: "Aguad CloudProp",
      subtitle: "Suite de GestiÃ³n Inmobiliaria Inteligente",
      email: "Correo electrÃ³nico",
      password: "contraseña",
      submit: "Iniciar sesión",
      forgot: "Â¿OlvidÃ³ su contraseña?",
      suspended: "Su cuenta ha sido suspendida por el administrador.",
      incorrect: "El correo o la contraseña no son correctos.",
      help: "Contacto Soporte",
      incomplete: "Este correo tiene un registro incompleto. ComunÃ­quese con administraciÃ³n."
    },
    navigation: {
      dashboard: "Escritorio",
      properties: "Propiedades",
      users: "Usuarios",
      audit: "Auditoría de Cambios",
      logout: "Cerrar sesión",
      welcome: "Hola, "
    },
    dashboard: {
      title: "Tablero Principal",
      properties_count: "Propiedades en venta/alquiler",
      active_users: "Cuentas del Sistema",
      critical_logs: "Acciones Auditadas",
      recent_activity: "Actividad Reciente del Sistema",
      welcome_message: "Bienvenido a la suite inmobiliaria unificada de Aguad Bienes RaÃ­ces.",
      quick_stats: "Indicadores Clave de Rendimiento",
      role_info: "Nivel de acceso autorizado: ",
      see_all: "Ver todas"
    },
    properties: {
      title: "CatÃ¡logo de Propiedades",
      subtitle: "BÃºsqueda, creaciÃ³n, ediciÃ³n y administraciÃ³n de inmuebles",
      add_new: "Agregar Propiedad",
      edit: "Editar Propiedad",
      delete: "Eliminar Propiedad",
      property_type: "Tipo de Inmueble",
      status: "Estado Comercial",
      price: "Precio (USD)",
      address: "DirecciÃ³n",
      bedrooms: "Dormitorios",
      bathrooms: "baños",
      area: "Superficie",
      empty_state: "No se encontraron propiedades. Intente ajustar los filtros de bÃºsqueda.",
      search_placeholder: "Buscar por tÃ­tulo, direcciÃ³n o tipo...",
      save_success: "Propiedad guardada correctamente en el servidor.",
      delete_success: "Propiedad eliminada permanentemente de la base de datos.",
      types: {
        house: "Casa Residencial",
        apartment: "Departamento",
        land: "Lote / Terreno",
        commercial: "Local Comercial"
      },
      statuses: {
        available: "Disponible",
        reserved: "Reservado",
        sold: "Vendido"
      },
      form: {
        title_label: "TÃ­tulo de la Propiedad",
        desc_label: "descripción Detallada",
        address_label: "DirecciÃ³n FÃ­sica Completa",
        price_label: "Precio de Venta ($)",
        type_label: "Tipo de Propiedad",
        status_label: "Estado de Venta",
        beds_label: "NÃºmero de Dormitorios",
        baths_label: "NÃºmero de baños",
        area_label: "Superficie Cubierta (mÂ²)",
        img_label: "URL de Imagen de Portada"
      }
    },
    users: {
      title: "GestiÃ³n de Personal y Clientes",
      subtitle: "CreaciÃ³n sincronizada de credenciales y perfiles relacionados",
      add_new: "Crear Cuenta de Usuario",
      role: "Rol del Sistema",
      status: "Estado de Cuenta",
      verify_email: "Verificar Disponibilidad de Email",
      email_check_title: "Verificador de Disponibilidad e Inconsistencias de Email",
      email_check_desc: "Verifica si el email existe en Auth, Firestore o si se encuentra huÃ©rfano.",
      check_btn: "Consultar Estado de Correo",
      repair_btn: "Reparar Cuenta Incompleta",
      delete_confirm: "Â¿EstÃ¡ seguro de eliminar permanentemente este usuario? Esta acciÃ³n es irreversible.",
      delete_success: "Usuario eliminado definitivamente de Auth y Firestore.",
      create_success: "Usuario creado exitosamente con sincronizaciÃ³n completa.",
      roles: {
        super_admin: "Superadministrador",
        agent: "Agente de Ventas",
        client: "Cliente Asociado"
      },
      statuses: {
        active: "Activo / Autorizado",
        suspended: "Suspendido / Bloqueado",
        incomplete: "Incompleto / HuÃ©rfano"
      },
      form: {
        name: "Nombre y Apellido",
        email: "DirecciÃ³n de Correo",
        password: "contraseña Temporal",
        role: "Rol TÃ©cnico",
        status: "Estado Inicial de Cuenta"
      }
    },
    logs: {
      title: "Registro de Auditoría TÃ©cnica",
      subtitle: "Historial detallado de operaciones sensibles de base de datos en el servidor",
      table_action: "operación",
      table_user: "Usuario Operador",
      table_details: "descripción del Cambio",
      table_time: "Sello de Tiempo (UTC)",
      empty: "Sin registros de Auditoría disponibles."
    },
    common: {
      save: "Guardar Cambios",
      cancel: "Cancelar",
      confirm: "Confirmar AcciÃ³n",
      delete: "Eliminar Permanente",
      back: "Volver",
      actions: "Acciones",
      loading: "Procesando operación segura...",
      error: "Ha ocurrido un error en la transacciÃ³n",
      no_permission: "No tiene permisos requeridos para ver esta pÃ¡gina.",
      success: "TransacciÃ³n confirmada.",
      view_details: "Detalles"
    }
  },
  en: {
    auth: {
      title: "Aguad CloudProp",
      subtitle: "Smart Real Estate Management Suite",
      email: "Email address",
      password: "Password",
      submit: "Sign In",
      forgot: "Forgot your password?",
      suspended: "Your account has been suspended by the administrator.",
      incorrect: "Incorrect email or password.",
      help: "Technical Support",
      incomplete: "This email has an incomplete registration. Contact admin."
    },
    navigation: {
      dashboard: "Dashboard",
      properties: "Properties",
      users: "Users",
      audit: "Audit Trail",
      logout: "Log Out",
      welcome: "Hello, "
    },
    dashboard: {
      title: "Main Dashboard",
      properties_count: "Properties listed",
      active_users: "System Accounts",
      critical_logs: "Audited Actions",
      recent_activity: "Recent System Activity",
      welcome_message: "Welcome to Aguad Bienes RaÃ­ces unified real estate suite.",
      quick_stats: "Key Performance Indicators",
      role_info: "Authorized Access Level: ",
      see_all: "See all"
    },
    properties: {
      title: "Property Catalog",
      subtitle: "Search, create, edit, and manage estates",
      add_new: "Add Property",
      edit: "Edit Property",
      delete: "Delete Property",
      property_type: "Property Type",
      status: "Commercial Status",
      price: "Price (USD)",
      address: "Address",
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      area: "Area (sq m)",
      empty_state: "No properties found. Try adjusting the search filters.",
      search_placeholder: "Search by title, address, or type...",
      save_success: "Property saved successfully on server.",
      delete_success: "Property deleted permanently from database.",
      types: {
        house: "Residential House",
        apartment: "Apartment / Flat",
        land: "Land / Plot",
        commercial: "Commercial Premises"
      },
      statuses: {
        available: "Available",
        reserved: "Reserved",
        sold: "Sold"
      },
      form: {
        title_label: "Property Title",
        desc_label: "Detailed Description",
        address_label: "Full Physical Address",
        price_label: "Sale Price ($)",
        type_label: "Property Type",
        status_label: "Sales Status",
        beds_label: "Bedrooms Count",
        baths_label: "Bathrooms Count",
        area_label: "Floor Area (mÂ²)",
        img_label: "Cover Image URL"
      }
    },
    users: {
      title: "Staff & Client Directory",
      subtitle: "Synchronous creation of cloud credentials and matching profiles",
      add_new: "Create User Account",
      role: "System Role",
      status: "Account Status",
      verify_email: "Check Email Availability",
      email_check_title: "Email Availability & Orphan Index Checker",
      email_check_desc: "Verifies if the email matches records in Auth, Firestore, or is orphaned.",
      check_btn: "Query Email Status",
      repair_btn: "Repair Incomplete Account",
      delete_confirm: "Are you sure you want to permanently delete this user? This action is irreversible.",
      delete_success: "User deleted permanently from Auth and Firestore.",
      create_success: "User created successfully with full synchronization.",
      roles: {
        super_admin: "Super Admin",
        agent: "Sales Agent",
        client: "Associated Client"
      },
      statuses: {
        active: "Active / Authorized",
        suspended: "Suspended / Blocked",
        incomplete: "Incomplete / Orphaned"
      },
      form: {
        name: "Full Name",
        email: "Email Address",
        password: "Temporary Password",
        role: "Technical Role",
        status: "Initial Account Status"
      }
    },
    logs: {
      title: "Technical Audit Trail",
      subtitle: "Detailed record of sensitive database transactions processed on the server",
      table_action: "Action",
      table_user: "Operating User",
      table_details: "Modification Details",
      table_time: "Timestamp (UTC)",
      empty: "No audit logs available."
    },
    common: {
      save: "Save Changes",
      cancel: "Cancel",
      confirm: "Confirm Action",
      delete: "Permanently Delete",
      back: "Go Back",
      actions: "Actions",
      loading: "Processing secure transaction...",
      error: "An error occurred during transaction",
      no_permission: "You do not have required permissions to view this page.",
      success: "Transaction confirmed.",
      view_details: "Details"
    }
  },
  'pt-BR': {
    auth: {
      title: "Aguad CloudProp",
      subtitle: "Smart Real Estate Management Suite",
      email: "EndereÃ§o de e-mail",
      password: "Senha",
      submit: "Entrar",
      forgot: "Esqueceu sua senha?",
      suspended: "Sua conta foi suspensa temporariamente pelo administrador.",
      incorrect: "E-mail ou senha incorretos.",
      help: "Suporte TÃ©cnico",
      incomplete: "Esta conta estÃ¡ com registro incompleto. Entre em contato."
    },
    navigation: {
      dashboard: "Painel",
      properties: "Propriedades",
      users: "UsuÃ¡rios",
      audit: "Trilha de Auditoria",
      logout: "Sair",
      welcome: "OlÃ¡, "
    },
    dashboard: {
      title: "Painel de Controle",
      properties_count: "ImÃ³veis listados",
      active_users: "UsuÃ¡rios Ativos",
      critical_logs: "AÃ§Ãµes Auditadas",
      recent_activity: "Atividade Recente do Sistema",
      welcome_message: "Bem-vindo Ã s soluÃ§Ãµes imobiliÃ¡rias integradas da Aguad Bienes RaÃ­ces.",
      quick_stats: "Indicadores Clave de Performance",
      role_info: "NÃ­vel de Acesso Autorizado: ",
      see_all: "Ver tudo"
    },
    properties: {
      title: "CatÃ¡logo de ImÃ³veis",
      subtitle: "Pesquisar, criar, editar e gerenciar propriedades",
      add_new: "Adicionar ImÃ³vel",
      edit: "Editar ImÃ³vel",
      delete: "Excluir ImÃ³vel",
      property_type: "Tipo do ImÃ³vel",
      status: "Status Comercial",
      price: "PreÃ§o (USD)",
      address: "EndereÃ§o completo",
      bedrooms: "Quartos",
      bathrooms: "Banheiros",
      area: "Ãrea de cobertura",
      empty_state: "Nenhum imÃ³vel foi encontrado. Tente ajustar os filtros.",
      search_placeholder: "Buscar por tÃ­tulo, endereÃ§o ou tipo...",
      save_success: "ImÃ³vel cadastrado com sucesso no servidor corporativo.",
      delete_success: "ImÃ³vel excluÃ­do permanentemente da base de dados.",
      types: {
        house: "Casa Residencial",
        apartment: "Apartamento",
        land: "Lote / Terreno",
        commercial: "Ponto Comercial"
      },
      statuses: {
        available: "DisponÃ­vel",
        reserved: "Reservado",
        sold: "Vendido"
      },
      form: {
        title_label: "TÃ­tulo do ImÃ³vel",
        desc_label: "DescriÃ§Ã£o Detalhada",
        address_label: "EndereÃ§o FÃ­sico Completo",
        price_label: "PreÃ§o de Venda ($)",
        type_label: "Tipo de ImÃ³vel",
        status_label: "Status da TransaÃ§Ã£o",
        beds_label: "Quantidade de Quartos",
        baths_label: "Quantidade de Banheiros",
        area_label: "Ãrea Total (mÂ²)",
        img_label: "URL da Imagem Principal"
      }
    },
    users: {
      title: "GestÃ£o de Pessoas",
      subtitle: "CriaÃ§Ã£o sÃ­ncrona de credenciais em Auth e perfis Firestore correspondentes",
      add_new: "Criar Conta de UsuÃ¡rio",
      role: "FunÃ§Ã£o no Painel",
      status: "Status do Cadastro",
      verify_email: "Verificar Disponibilidade de E-mail",
      email_check_title: "Validador TÃ©cnico de E-mails",
      email_check_desc: "Verifique a existÃªncia em Auth, base de dados ou falhas de sincronizaÃ§Ã£o.",
      check_btn: "Pesquisar SituaÃ§Ã£o",
      repair_btn: "Reparar Cadastro Corrompido",
      delete_confirm: "Deseja mesmo remover permanentemente esse usuÃ¡rio? Esta aÃ§Ã£o Ã© irreversÃ­vel.",
      delete_success: "UsuÃ¡rio removido definitivamente de Auth e Firestore.",
      create_success: "UsuÃ¡rio criado com sucesso e sincronizado.",
      roles: {
        super_admin: "Super Administrador",
        agent: "Agente de Vendas",
        client: "Cliente Associado"
      },
      statuses: {
        active: "Ativo / Autorizado",
        suspended: "Suspenso / Bloqueado",
        incomplete: "Incompleto / Ã“rfÃ£o"
      },
      form: {
        name: "Nome completo",
        email: "E-mail de cadastro",
        password: "Senha temporÃ¡ria",
        role: "NÃ­vel tÃ©cnico",
        status: "AtivaÃ§Ã£o inicial"
      }
    },
    logs: {
      title: "HistÃ³rico de Trilha TÃ©cnica",
      subtitle: "Registros detalhados de modificaÃ§Ãµes na base executadas pelo servidor",
      table_action: "FunÃ§Ã£o",
      table_user: "UsuÃ¡rio executor",
      table_details: "Trilha do Log",
      table_time: "Protocolo de Tempo (UTC)",
      empty: "Sem registros histÃ³ricos no momento."
    },
    common: {
      save: "Salvar alteraÃ§Ãµes",
      cancel: "Cancelar",
      confirm: "Confirmar aÃ§Ã£o",
      delete: "Excluir Definitivo",
      back: "Volver",
      actions: "AÃ§Ãµes",
      loading: "Aguardando transaÃ§Ã£o segura...",
      error: "Ocorreu um erro no servidor",
      no_permission: "VocÃª nÃ£o possui as permissÃµes necessÃ¡rias para acessar esta pÃ¡gina.",
      success: "TransaÃ§Ã£o confirmada com sucesso.",
      view_details: "Visualizar"
    }
  }
};
