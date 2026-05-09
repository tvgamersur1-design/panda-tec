# 🔗 Vinculación Automática con Google

## 🎯 Cómo funciona

Cuando un usuario inicia sesión con Google, el sistema **automáticamente vincula** su cuenta de Google si:

1. ✅ Existe un usuario con ese correo en el sistema
2. ✅ La cuenta está activa
3. ✅ Aún no tiene `google_id` vinculado

## 📋 Flujo de vinculación

### **Escenario 1: Usuario creado manualmente → Primera vez con Google**

1. Admin crea usuario: `juan@gmail.com`
2. Usuario intenta iniciar sesión con Google
3. Sistema detecta que existe `juan@gmail.com` pero sin `google_id`
4. **Vincula automáticamente** el `google_id` de Google
5. Usuario puede iniciar sesión con Google desde ahora

### **Escenario 2: Usuario ya vinculado**

1. Usuario ya tiene `google_id` en la base de datos
2. Inicia sesión con Google
3. Sistema lo reconoce inmediatamente
4. Acceso concedido ✅

### **Escenario 3: Correo no existe en el sistema**

1. Usuario intenta iniciar sesión con Google
2. Sistema no encuentra ese correo en la base de datos
3. **Acceso denegado** ❌
4. Mensaje: "No hay una cuenta vinculada a este correo de Google"

## 🔍 Verificar vinculación

### **En el frontend:**

1. Ir a **Gestión de Usuarios** (solo admin)
2. Ver columna **"Google"**:
   - 🟢 **Vinculado**: Cuenta conectada con Google
   - ⚪ **No**: Sin vincular

### **En la base de datos:**

```javascript
// Usuario vinculado
{
  correo: "juan@gmail.com",
  google_id: "1234567890", // ← ID de Google
  email_verificado: true
}

// Usuario sin vincular
{
  correo: "maria@gmail.com",
  google_id: null, // ← Sin vincular
  email_verificado: false
}
```

## 🛠️ Código relevante

### **Backend: `src/controllers/googleAuthController.js`**

```javascript
// Buscar usuario por google_id o correo
let usuario = await Usuario.findOne({
  $or: [{ google_id: googleId }, { correo: email }],
  eliminado: false,
});

// Si existe pero no tiene google_id, vincularlo automáticamente
if (!usuario.google_id) {
  usuario.google_id = googleId;
  usuario.email_verificado = true;
  await usuario.save();
}
```

### **Frontend: `public/js/modules/usuarios.js`**

```javascript
// Mostrar estado de vinculación
const googleVinculado = u.google_id ? true : false;

<span class="badge ${googleVinculado ? 'badge-ok' : 'badge-muted'}">
  <i class="fab fa-google"></i> ${googleVinculado ? 'Vinculado' : 'No'}
</span>
```

## ⚠️ Problemas comunes

### **1. Usuario dice "no está vinculado" pero sí lo está**

**Causa:** El frontend no está mostrando el campo `google_id`

**Solución:** Ya actualicé `public/js/modules/usuarios.js` para mostrar la columna "Google"

### **2. Usuario no puede iniciar sesión con Google**

**Posibles causas:**
- ❌ El correo no existe en el sistema → Admin debe crear el usuario primero
- ❌ La cuenta está inactiva → Admin debe activarla
- ❌ El correo en Google es diferente al del sistema → Verificar correos

### **3. Vinculación no se guarda**

**Posibles causas:**
- ❌ Error al guardar en MongoDB
- ❌ Permisos de escritura en la base de datos

**Verificar logs del servidor:**
```bash
# Buscar errores al vincular
grep "Error al vincular" logs.txt
```

## 🔧 Desvincular manualmente (MongoDB)

Si necesitas desvincular una cuenta:

```javascript
// En MongoDB Compass o shell
db.usuarios.updateOne(
  { correo: "usuario@gmail.com" },
  { 
    $set: { 
      google_id: null,
      email_verificado: false 
    } 
  }
);
```

## 📊 Estadísticas de vinculación

Para ver cuántos usuarios están vinculados:

```javascript
// Usuarios vinculados
db.usuarios.countDocuments({ 
  google_id: { $ne: null },
  eliminado: false 
});

// Usuarios sin vincular
db.usuarios.countDocuments({ 
  google_id: null,
  eliminado: false 
});
```

## ✅ Resumen

- ✅ La vinculación es **automática** al primer login con Google
- ✅ No requiere acción manual del usuario
- ✅ El admin puede ver el estado en la tabla de usuarios
- ✅ Una vez vinculado, el usuario puede usar Google siempre
- ⚠️ El correo debe existir en el sistema primero

---

## 🎯 Próximos pasos

Si quieres agregar más funcionalidades:

1. **Botón para desvincular** (desde el frontend)
2. **Notificación al usuario** cuando se vincula su cuenta
3. **Registro automático** con Google (crear usuario si no existe)
4. **Vincular desde perfil de usuario** (no solo en login)
