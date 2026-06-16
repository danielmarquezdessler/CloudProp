# Documentación Operativa: Bootstrap de Administrador Fundador

Este documento describe el procedimiento operativo estándar para inicializar y verificar el primer administrador fundador real (`webmaster@aguadbienesraices.com.ar`) en el sistema **F.A Cloud-Prop Suite** para **Aguad Bienes Raíces**.

---

## 1. Configuración de Variables de Entorno

El endpoint seguro de bootstrap requiere la configuración de la variable secreta en el archivo `.env` del servidor (local) o mediante las variables de entorno de la plataforma de hosting (Cloud Run / Vercel / Heroku de producción).

### Variables de entorno requeridas:
```env
BOOTSTRAP_SECRET=TU_CLAVE_SECRETA_SUPER_ADMIN_AQUI
```

*Nota:* Después de modificar o agregar variables de entorno en el archivo `.env` local, **se debe reiniciar el servidor de desarrollo** para que el proceso de Node lea las nuevas variables de `process.env`. En los entornos de producción (Cloud Run), la configuración de la variable de entorno desencadena un redespliegue automático de contenedor.

---

## 2. Contrato del Endpoint

* **Ruta (Local):** `http://localhost:3000/api/firebase-admin/bootstrap`
* **Ruta (Producción):** `https://cloudprop.aguadbienesraices.com.ar/api/firebase-admin/bootstrap`
* **Método HTTP:** `POST`
* **Cabeceras obligatorias:** `Content-Type: application/json`

### Estructura del Body (JSON esperado):
```json
{
  "secret": "BOOTSTRAP_SECRET_INGRESADO_EN_FORMA_SEGURA",
  "email": "webmaster@aguadbienesraices.com.ar",
  "password": "PASSWORD_SEGURA_INGRESADA_EN_FORMA_SEGURA",
  "displayName": "Webmaster Aguad"
}
```

### Reglas de Validación de Contraseña:
La contraseña enviada debe cumplir estrictamente con los siguientes requisitos en resguardo de la seguridad SaaS de la organización:
* Mínimo 12 caracteres de longitud.
* Al menos una letra mayúscula (`A-Z`).
* Al menos una letra minúscula (`a-z`).
* Al menos un número (`0-9`).
* Al menos un carácter especial/símbolo (ej. `@`, `#`, `$`, `%`, etc.).

---

## 3. Respuestas esperadas del Endpoint

### Caso 1: Creación Exitosa (Usuario Creado por Primera Vez - Código 200)
```json
{
  "success": true,
  "message": "Administrador fundador creado correctamente.",
  "uid": "UID_REAL_GENERADO_POR_FIREBASE_AUTH",
  "email": "webmaster@aguadbienesraices.com.ar",
  "role": "super_admin",
  "permissions": ["*"],
  "orgId": "aguad-bienes-raices"
}
```

### Caso 2: El Administrador ya Existe Correctamente (Duplicación Evitada - Código 200)
```json
{
  "success": true,
  "alreadyExists": true,
  "message": "El administrador fundador ya existe y está correctamente configurado.",
  "email": "webmaster@aguadbienesraices.com.ar",
  "role": "super_admin",
  "permissions": ["*"],
  "orgId": "aguad-bienes-raices"
}
```

### Caso 3: Error de Firma o Secreto Incorrecto (Código 403)
```json
{
  "success": false,
  "error": {
    "code": "BOOTSTRAP_FORBIDDEN",
    "message": "No se pudo crear el administrador fundador. Secret inválido o no configurado."
  }
}
```

### Caso 4: Ya existe otro Super_Admin miembro configurado en el sistema (Previene múltiples ejecuciones - Código 403)
```json
{
  "success": false,
  "error": {
    "code": "BOOTSTRAP_FORBIDDEN",
    "message": "El administrador fundador ya existe. Use el panel administrativo o una función de reparación controlada."
  }
}
```

---

## 4. Ejecución mediante comando manual `curl`

Para inicializar el usuario administrador real sin scripts auxiliares, ejecuta la siguiente consulta `curl` de forma directa en tu terminal (reemplazando `TU_BOOTSTRAP_SECRET_AQUI` y la contraseña por los valores elegidos):

### Comando Local:
```bash
curl -X POST http://localhost:3000/api/firebase-admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "TU_BOOTSTRAP_SECRET_AQUI",
    "email": "webmaster@aguadbienesraices.com.ar",
    "password": "Contraseña_Muy_Segura_15!",
    "displayName": "Webmaster Aguad"
  }'
```

### Comando Producción:
```bash
curl -X POST https://cloudprop.aguadbienesraices.com.ar/api/firebase-admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "TU_BOOTSTRAP_SECRET_AQUI",
    "email": "webmaster@aguadbienesraices.com.ar",
    "password": "Contraseña_Muy_Segura_15!",
    "displayName": "Webmaster Aguad"
  }'
```

---

## 5. Validación post-ejecución

### En consola de Firebase Auth:
1. Navega a **Firebase Console** -> **Authentication** -> pestaña **Users**.
2. Busca el email `webmaster@aguadbienesraices.com.ar`.
3. Toma nota de su identificador único (User UID).

### En consola de Firestore Database:
1. Navega a **Firebase Console** -> **Firestore Database** -> colección **users**.
2. Verifica la existencia del documento con el ID exacto asignado en Auth (`users/{uid}`).
3. El documento debe contener de manera exacta los siguientes atributos (sin contraseñas ni secretos guardados):
   * `uid`: `UID_PROVISTO_POR_AUTH`
   * `authUid`: `UID_PROVISTO_POR_AUTH`
   * `email`: `"webmaster@aguadbienesraices.com.ar"`
   * `displayName`: `"Webmaster Aguad"`
   * `role`: `"super_admin"`
   * `roleLabel`: `"Superadministrador"`
   * `orgId`: `"aguad-bienes-raices"`
   * `status`: `"active"`
   * `permissions`: `["*"]`
   * `authCreated`: `true`
   * `emailVerified`: `true`
4. En la colección **organizations**, verifica el id `aguad-bienes-raices` con su estado activo.
