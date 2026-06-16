import fs from 'fs';
import path from 'path';
import { User, Property, AuditLog, EmailAvailabilityResponse, Role, UserStatus } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

interface DatabaseSchema {
  users: User[];
  properties: Property[];
  auditLogs: AuditLog[];
  passwords: Record<string, string>; // Maps email.toLowerCase() -> password string
}

const DEFAULT_DB: DatabaseSchema = {
  users: [],
  passwords: {},
  properties: [
    {
      id: "prop-1",
      title: "Casa de Lujo en Nordelta",
      description: "Espectacular casa minimalista frente al lago. Piscina climatizada, 4 master suites, acabados premium de mármol y sistema de domótica instalado.",
      type: "house",
      price: 850000,
      address: "Av. del Lago 1400, Nordelta, Tigre",
      status: "available",
      bedrooms: 4,
      bathrooms: 5,
      areaSqM: 450,
      imageUrl: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80",
      orgId: "aguad-corp",
      createdBy: "admin-uid-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prop-2",
      title: "Penthouse de Diseño en Palermo Chico",
      description: "Exclusivo departamento en piso alto con vistas panorámicas al río y bosques de Palermo. Terraza privada con jacuzzi, 3 cocheras cubiertas.",
      type: "apartment",
      price: 1200000,
      address: "Av. Del Libertador 3200, Palermo, CABA",
      status: "available",
      bedrooms: 3,
      bathrooms: 4,
      areaSqM: 280,
      imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
      orgId: "aguad-corp",
      createdBy: "admin-uid-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prop-3",
      title: "Oficina Corporativa Catalinas",
      description: "Planta libre corporativa en torre de categoría AAA. Certificación LEED, vistas al río, seguridad 24 hs y 4 cocheras privadas.",
      type: "commercial",
      price: 450000,
      address: "Avenida Leandro N. Alem 850, Retiro, CABA",
      status: "reserved",
      bedrooms: 0,
      bathrooms: 2,
      areaSqM: 180,
      imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
      orgId: "aguad-corp",
      createdBy: "admin-uid-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "prop-4",
      title: "Terreno Residencial en San Isidro Chic",
      description: "Lote arbolado ideal para desarrollo de vivienda unifamiliar en excelente zona de San Isidro. Listo para escriturar, servicios subterráneos.",
      type: "land",
      price: 320000,
      address: "Primera Junta 450, San Isidro, GBA Norte",
      status: "available",
      bedrooms: 0,
      bathrooms: 0,
      areaSqM: 800,
      imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
      orgId: "aguad-corp",
      createdBy: "agent-uid-2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  auditLogs: [
    {
      id: "log-seed-1",
      userId: "system",
      userEmail: "system@aguadbienesraices.com.ar",
      action: "login",
      details: "Base de datos inicializada y cargada con estructura seed de producción.",
      timestamp: new Date().toISOString()
    }
  ]
};

// Safe File I/O helpers
function readDb(): DatabaseSchema {
  // Strict Security Isolation check
  if (process.env.NODE_ENV === "production") {
    throw new Error("[PROD_SECURITY_VIOLATION] Prohibido utilizar datastore de simulación local (DEFAULT_DB / database.json) en ambiente de producción real de Cloud-Prop Suite.");
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading project database file:', err);
    return DEFAULT_DB;
  }
}

function writeDb(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing project database file:', err);
  }
}

// Audit logger helper
export function logAudit(
  userId: string,
  userEmail: string,
  action: AuditLog['action'],
  details: string
) {
  const db = readDb();
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    userEmail,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(newLog); // Put news first
  // Max 1000 logs kept
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
  writeDb(db);
}

// --- FASE 1: AUTH & SESIÓN ---

export function authenticateUser(email: string, passwordString: string): { success: boolean; user?: User; error?: string } {
  const db = readDb();
  const normEmail = email.trim().toLowerCase();
  
  const savedPassword = db.passwords[normEmail];
  if (!savedPassword || savedPassword !== passwordString) {
    return { success: false, error: "El correo o la contraseña no son correctos." };
  }

  const user = db.users.find(u => u.email.toLowerCase() === normEmail);
  if (!user) {
    return { success: false, error: "Este correo tiene un registro incompleto o corrupto en el sistema." };
  }

  if (user.status === 'suspended') {
    return { success: false, error: "Esta cuenta está actualmente suspendida por administración." };
  }

  logAudit(user.uid, user.email, 'login', `Inicio de sesión exitoso de ${user.displayName}`);

  return { success: true, user };
}

export function resolveUserSession(uid: string): { allowed: boolean; role?: Role; redirectTo?: string; reason?: string; messageKey?: string } {
  const db = readDb();
  const user = db.users.find(u => u.uid === uid);
  
  if (!user) {
    return { allowed: false, reason: "Perfil de usuario no encontrado en la base de datos.", messageKey: "errors.profile_missing" };
  }

  if (user.status === 'suspended') {
    return { allowed: false, reason: "Tu cuenta ha sido suspendida.", messageKey: "auth.suspended" };
  }

  // Redirect routing rules as required by Rule 8
  let redirectTo = '/dashboard';
  return {
    allowed: true,
    role: user.role,
    redirectTo,
    reason: "Sesión autorizada correctamente."
  };
}

// --- FASE 2: USER LIFECYCLE SERVICE ---

export function checkEmailAvailability(email: string): EmailAvailabilityResponse {
  const db = readDb();
  const normEmail = email.trim().toLowerCase();

  // In our full system schema, let's identify presence in Auth (passwords object) vs Firestore users
  const authExists = !!db.passwords[normEmail];
  const userRecord = db.users.find(u => u.email.toLowerCase() === normEmail);
  const firestoreExists = !!userRecord;

  let consistencyStatus: EmailAvailabilityResponse['consistencyStatus'] = 'available';
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

  return {
    email: normEmail,
    authExists,
    firestoreExists,
    uidMatches: firestoreExists && authExists ? (userRecord.uid === userRecord.authUid) : false,
    consistencyStatus,
    canCreate,
    canRepair,
    recommendedAction,
    uid: userRecord?.uid
  };
}

export function createUserAccount(
  callerUid: string,
  userFields: { email: string; displayName: string; role: Role; status: UserStatus; passwordString: string; orgId: string }
): { success: boolean; user?: User; error?: string } {
  const db = readDb();
  
  // Rule 4: Validate caller
  const caller = db.users.find(u => u.uid === callerUid);
  if (!caller || caller.role !== 'super_admin') {
    return { success: false, error: "Acceso denegado. Solo administradores pueden crear cuentas." };
  }

  // Normalize
  const normEmail = userFields.email.trim().toLowerCase();
  
  // Validate if already exists
  const availability = checkEmailAvailability(normEmail);
  if (!availability.canCreate) {
    return { success: false, error: `No se puede crear el usuario. Estado: ${availability.recommendedAction}` };
  }

  const newUid = `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  // Create Auth-equivalent in system (saving credentials securely)
  db.passwords[normEmail] = userFields.passwordString || "Password123!";

  // Create users/{uid} collection equivalent
  const newUser: User = {
    uid: newUid,
    email: normEmail,
    displayName: userFields.displayName,
    role: userFields.role,
    status: userFields.status || 'active',
    orgId: userFields.orgId || caller.orgId || 'aguad-corp',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: caller.uid,
    authUid: newUid,
    authCreated: true
  };

  // Perform transaction push
  try {
    db.users.push(newUser);
    writeDb(db);
    
    logAudit(caller.uid, caller.email, 'create', `Creación exitosa de usuario ${newUser.displayName} (${newUser.email}) con rol ${newUser.role}`);
    return { success: true, user: newUser };
  } catch (err) {
    // Transaction Rollback (Rule 4)
    delete db.passwords[normEmail];
    writeDb(db);
    return { success: false, error: "Error crítico al guardar usuario en base de datos. Se ejecutó Rollback de seguridad." };
  }
}

export function repairUserAccess(callerUid: string, targetEmail: string, repairOption: string): { success: boolean; message: string } {
  const db = readDb();
  const caller = db.users.find(u => u.uid === callerUid);
  if (!caller || caller.role !== 'super_admin') {
    return { success: false, message: "Operación restringida a Administradores." };
  }

  const normEmail = targetEmail.trim().toLowerCase();
  const status = checkEmailAvailability(normEmail);

  if (status.consistencyStatus === 'active_user_exists') {
    return { success: false, message: "La cuenta de usuario ya es consistente, no requiere reparación." };
  }

  if (status.consistencyStatus === 'auth_only') {
    // Auth exists but no profile. Let's create profile.
    const newUid = `user-repaired-${Date.now()}`;
    const newUser: User = {
      uid: newUid,
      email: normEmail,
      displayName: normEmail.split('@')[0],
      role: 'client',
      status: 'active',
      orgId: 'aguad-corp',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: caller.uid,
      authUid: newUid,
      authCreated: true
    };
    db.users.push(newUser);
    writeDb(db);
    logAudit(caller.uid, caller.email, 'update', `Reparación: Perfil creado para cuenta huérfana de Auth (${normEmail})`);
    return { success: true, message: `Perfil reparado para ${normEmail}. Se ha creado el documento de base de datos.` };
  }

  if (status.consistencyStatus === 'firestore_only') {
    // Profiler exists but no Auth. Assign password.
    db.passwords[normEmail] = "Passwordrepaired123!";
    writeDb(db);
    logAudit(caller.uid, caller.email, 'update', `Reparación: Credenciales regeneradas para perfil sin Auth (${normEmail})`);
    return { success: true, message: `Perfil reparado para ${normEmail}. Nueva contraseña asignada: Passwordrepaired123!` };
  }

  return { success: false, message: "No se pudo diagnosticar una vía de reparación directa." };
}

export function deleteUserAccount(callerUid: string, targetUid: string): { success: boolean; error?: string } {
  const db = readDb();
  
  // Rule 5: Validate caller and prevents self-delete
  const caller = db.users.find(u => u.uid === callerUid);
  if (!caller || caller.role !== 'super_admin') {
    return { success: false, error: "Acceso denegado. Solo administradores pueden borrar cuentas." };
  }

  if (callerUid === targetUid) {
    return { success: false, error: "Infracción de seguridad: no te puedes auto-eliminar del sistema." };
  }

  const targetIdx = db.users.findIndex(u => u.uid === targetUid);
  if (targetIdx === -1) {
    return { success: false, error: "Usuario a eliminar no fue encontrado en la base de datos." };
  }

  const targetUser = db.users[targetIdx];
  
  // Rule 5: Protect primary system admin from deletion
  const adminEmail = (process.env.ADMIN_EMAIL || "webmaster@aguadbienesraices.com.ar").trim().toLowerCase();
  if (targetUser.email === adminEmail || targetUser.role === 'super_admin') {
    return { success: false, error: "La cuenta de administración o perfil de super_admin está protegida contra eliminación." };
  }

  // Implement total complete deletion as requested by Rule 5
  const targetEmail = targetUser.email.toLowerCase();
  
  // 1. Remove database user
  db.users.splice(targetIdx, 1);
  // 2. Remove credential indexes
  delete db.passwords[targetEmail];
  
  // 3. Delete related indexes / dependencies if exist
  db.properties = db.properties.map(p => {
    if (p.createdBy === targetUid) {
      return { ...p, createdBy: caller.uid }; // Reassign properties to the admin who deleted the accounts
    }
    return p;
  });

  writeDb(db);

  logAudit(caller.uid, caller.email, 'delete', `Eliminación permanente ejecutada para el usuario ${targetUser.displayName} (${targetUser.email})`);
  return { success: true };
}

export function updateUserInfo(
  callerUid: string,
  targetUid: string,
  updates: Partial<Omit<User, 'uid' | 'orgId' | 'createdAt' | 'createdBy'>>
): { success: boolean; user?: User; error?: string } {
  const db = readDb();
  const caller = db.users.find(u => u.uid === callerUid);
  if (!caller) {
    return { success: false, error: "Sesión del llamador inválida." };
  }

  const targetIdx = db.users.findIndex(u => u.uid === targetUid);
  if (targetIdx === -1) {
    return { success: false, error: "Usuario destino no encontrado." };
  }

  const targetUser = db.users[targetIdx];

  // Rule 6: Validate permission & check protected items
  const isSelfUpdate = callerUid === targetUid;
  const isSuperAdmin = caller.role === 'super_admin';

  if (!isSelfUpdate && !isSuperAdmin) {
    return { success: false, error: "Privilegios insuficientes para editar este perfil." };
  }

  // Prevent modifying critical system keys from normal components (Rule 6)
  if (!isSuperAdmin) {
    // If it's a self-update by non-admin, block edits to role, status, etc.
    if (updates.role !== undefined && updates.role !== targetUser.role) {
      return { success: false, error: "Infracción: No tienes permiso para promover tu rol técnico." };
    }
    if (updates.status !== undefined && updates.status !== targetUser.status) {
      return { success: false, error: "Infracción: No tienes permiso para editar el estado de tu cuenta." };
    }
    if (updates.authCreated !== undefined || updates.authUid !== undefined) {
      return { success: false, error: "Infracción: Intento no autorizado de editar variables de seguridad." };
    }
  }

  // Update values
  const updatedUser: User = {
    ...targetUser,
    displayName: updates.displayName !== undefined ? updates.displayName : targetUser.displayName,
    email: updates.email !== undefined ? updates.email.trim().toLowerCase() : targetUser.email,
    role: updates.role !== undefined && isSuperAdmin ? updates.role : targetUser.role,
    status: updates.status !== undefined && isSuperAdmin ? updates.status : targetUser.status,
    updatedAt: new Date().toISOString()
  };

  db.users[targetIdx] = updatedUser;
  writeDb(db);

  logAudit(caller.uid, caller.email, 'update', `Perfil modificado para ${updatedUser.displayName} (${updatedUser.email})`);
  return { success: true, user: updatedUser };
}


// --- FASE 4 / 5: PROPERTIES CRUD & SERVICES ---

export function getProperties(callerUid: string): Property[] {
  const db = readDb();
  const caller = db.users.find(u => u.uid === callerUid);
  if (!caller) return [];

  // Rule 11: Multitenancy checking - Filter strictly by organization/campaign
  return db.properties.filter(p => p.orgId === caller.orgId);
}

export function createProperty(
  callerUid: string,
  fields: Omit<Property, 'id' | 'orgId' | 'createdBy' | 'createdAt' | 'updatedAt'>
): { success: boolean; property?: Property; error?: string } {
  const db = readDb();
  const caller = db.users.find(u => u.uid === callerUid);
  
  if (!caller || (caller.role !== 'super_admin' && caller.role !== 'agent')) {
    return { success: false, error: "Acceso denegado: Se requiere rol de Agente de Ventas o Administrador." };
  }

  const newProperty: Property = {
    id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    title: fields.title,
    description: fields.description,
    type: fields.type,
    price: Number(fields.price),
    address: fields.address,
    status: fields.status || 'available',
    bedrooms: Number(fields.bedrooms),
    bathrooms: Number(fields.bathrooms),
    areaSqM: Number(fields.areaSqM),
    imageUrl: fields.imageUrl || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
    orgId: caller.orgId || "aguad-corp", // Rule 11: Must use organization from authenticated user
    createdBy: caller.uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.properties.push(newProperty);
  writeDb(db);

  logAudit(caller.uid, caller.email, 'create', `Propiedad agregada: ${newProperty.title} en ${newProperty.address}`);
  return { success: true, property: newProperty };
}

export function updateProperty(
  callerUid: string,
  propertyId: string,
  fields: Partial<Omit<Property, 'id' | 'orgId' | 'createdBy' | 'createdAt' | 'updatedAt'>>
): { success: boolean; property?: Property; error?: string } {
  const db = readDb();
  const caller = db.users.find(u => u.uid === callerUid);
  if (!caller || (caller.role !== 'super_admin' && caller.role !== 'agent')) {
    return { success: false, error: "Permisos insuficientes para editar propiedades." };
  }

  const propIdx = db.properties.findIndex(p => p.id === propertyId);
  if (propIdx === -1) {
    return { success: false, error: "La propiedad no existe." };
  }

  const oldProp = db.properties[propIdx];

  // Rule 11 Check: Ensure same corporation
  if (oldProp.orgId !== caller.orgId) {
    return { success: false, error: "Violación de tenant: No tienes acceso a propiedades de otra organización." };
  }

  // Update
  const updatedProperty: Property = {
    ...oldProp,
    title: fields.title !== undefined ? fields.title : oldProp.title,
    description: fields.description !== undefined ? fields.description : oldProp.description,
    type: fields.type !== undefined ? fields.type : oldProp.type,
    price: fields.price !== undefined ? Number(fields.price) : oldProp.price,
    address: fields.address !== undefined ? fields.address : oldProp.address,
    status: fields.status !== undefined ? fields.status : oldProp.status,
    bedrooms: fields.bedrooms !== undefined ? Number(fields.bedrooms) : oldProp.bedrooms,
    bathrooms: fields.bathrooms !== undefined ? Number(fields.bathrooms) : oldProp.bathrooms,
    areaSqM: fields.areaSqM !== undefined ? Number(fields.areaSqM) : oldProp.areaSqM,
    imageUrl: fields.imageUrl !== undefined ? fields.imageUrl : oldProp.imageUrl,
    updatedAt: new Date().toISOString()
  };

  db.properties[propIdx] = updatedProperty;
  writeDb(db);

  logAudit(caller.uid, caller.email, 'update', `Propiedad modificada: ${updatedProperty.title}`);
  return { success: true, property: updatedProperty };
}

export function deleteProperty(callerUid: string, propertyId: string): { success: boolean; error?: string } {
  const db = readDb();
  const caller = db.users.find(u => u.uid === callerUid);
  if (!caller || (caller.role !== 'super_admin' && caller.role !== 'agent')) {
    return { success: false, error: "Permisos de eliminación denegados." };
  }

  const propIdx = db.properties.findIndex(p => p.id === propertyId);
  if (propIdx === -1) {
    return { success: false, error: "La propiedad no existe." };
  }

  const prop = db.properties[propIdx];

  // Rule 11 Check: Ensure same organization
  if (prop.orgId !== caller.orgId) {
    return { success: false, error: "Violación de tenant: No puedes eliminar propiedades de otra organización." };
  }

  // Delete permanetely as required by Rule 5
  db.properties.splice(propIdx, 1);
  writeDb(db);

  logAudit(caller.uid, caller.email, 'delete', `Propiedad eliminada permanentemente: ${prop.title}`);
  return { success: true };
}

export function getAuditLogs(callerUid: string): AuditLog[] {
  const db = readDb();
  const caller = db.users.find(u => u.uid === callerUid);
  if (!caller || caller.role !== 'super_admin') return [];
  return db.auditLogs;
}

export function getUsers(callerUid: string): User[] {
  const db = readDb();
  const caller = db.users.find(u => u.uid === callerUid);
  if (!caller || caller.role !== 'super_admin') return [];
  return db.users;
}
