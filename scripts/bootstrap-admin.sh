#!/usr/bin/env bash

# Script seguro de ayuda para el bootstrap del primer administrador fundador

# Evitar la impresion de comandos ejecutados en consola
set +x

echo "====================================================================="
echo "   F.A CLOUD-PROP SUITE - CONFIGURACIÓN DE ADMINISTRADOR FUNDADOR   "
echo "====================================================================="
echo "Este script facilita la inicialización segura del rol super_admin"
echo "asociado al correo: webmaster@aguadbienesraices.com.ar"
echo ""

# 1. Ingreso de datos seguros
echo -n "Ingrese el BOOTSTRAP_SECRET asignado al servidor: "
read -s BOOTSTRAP_SECRET
echo ""

echo -n "Ingrese la CONTRASEÑA para el nuevo super_admin (mínimo 12 caracteres, mayúscula, minúscula, número y símbolo): "
read -s ADMIN_PASSWORD
echo ""

# 2. Selección de entorno
echo ""
echo "Seleccione el entorno destino para ejecutar el bootstrap:"
echo "1) Entorno Local (http://localhost:3000)"
echo "2) Entorno Producción (https://cloudprop.aguadbienesraices.com.ar)"
echo "3) Otro (especificar URL personalizada)"
echo -n "Opción [1-3] (Default: 1): "
read -r ENTORNO_OPT

BASE_URL="http://localhost:3000"

if [ "$ENTORNO_OPT" == "2" ]; then
  BASE_URL="https://cloudprop.aguadbienesraices.com.ar"
elif [ "$ENTORNO_OPT" == "3" ]; then
  echo -n "Ingrese la URL base personalizada (ej: https://su-dominio.com): "
  read -r CUSTOM_URL
  # Limpiar barra diagonal final si existe
  BASE_URL="${CUSTOM_URL%/}"
fi

ENDPOINT_URL="${BASE_URL}/api/firebase-admin/bootstrap"

echo ""
echo "Enviando solicitud HTTPS POST a: ${ENDPOINT_URL}..."
echo "====================================================================="

# 3. Envío de petición usando un body JSON construido dinámicamente sin persistir secretos
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT_URL}" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "secret": "${BOOTSTRAP_SECRET}",
  "email": "webmaster@aguadbienesraices.com.ar",
  "password": "${ADMIN_PASSWORD}",
  "displayName": "Webmaster Aguad"
}
EOF
)

# Obtener código de retorno http del response
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')

# Limpieza rápida de variables en memoria
unset BOOTSTRAP_SECRET
unset ADMIN_PASSWORD

echo ""
echo "Código de estado HTTP recibido: ${HTTP_STATUS}"
echo "Cuerpo de la respuesta del servidor:"
echo "---------------------------------------------------------------------"
echo "${HTTP_BODY}"
echo "---------------------------------------------------------------------"

if [ "$HTTP_STATUS" == "200" ]; then
  echo "✔ Operación ejecutada con éxito. Por favor compruebe la base de datos de Firestore en la colección 'users'."
else
  echo "✖ Fallo en la inicialización (Estado HTTP $HTTP_STATUS). Compruebe los logs de error del servidor o las restricciones de seguridad."
fi
echo "====================================================================="
