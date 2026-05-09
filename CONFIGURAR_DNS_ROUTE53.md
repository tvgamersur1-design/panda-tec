# 🌐 Configurar DNS en Amazon Route 53 para Resend

## 📋 Registros DNS que necesitas agregar

Basado en la captura de pantalla de Resend, estos son los registros exactos:

### 1️⃣ DKIM - Domain Verification (TXT)

```
Name:    resend._domainkey.panda-tec
Type:    TXT
Content: p=MIGfMA0GCSqG[_]zFudywIDAQAB
TTL:     Auto (o 300)
```

### 2️⃣ SPF - Enable Sending (MX + TXT)

**Registro MX:**
```
Name:    send.panda-tec
Type:    MX
Priority: 10
Content: feedback-sm[_]amazonses.com
TTL:     Auto (o 300)
```

**Registro TXT:**
```
Name:    send.panda-tec
Type:    TXT
Content: v=spf1 include[_]nses.com ~all
TTL:     Auto (o 300)
```

### 3️⃣ DMARC - Optional (TXT)

```
Name:    _dmarc
Type:    TXT
Content: v=DMARC1; p=none;
TTL:     Auto (o 300)
```

---

## 🚀 Pasos en Amazon Route 53

### Paso 1: Acceder a Route 53

1. Ve a [AWS Console](https://console.aws.amazon.com/)
2. Busca **Route 53** en el buscador
3. Haz clic en **Hosted zones** en el menú lateral

### Paso 2: Seleccionar tu zona

1. Busca y selecciona tu zona hospedada
2. Deberías ver una lista de registros DNS existentes

### Paso 3: Agregar el registro DKIM (TXT)

1. Haz clic en **Create record**
2. Configura:
   - **Record name:** `resend._domainkey.panda-tec`
   - **Record type:** TXT
   - **Value:** Copia el valor completo desde Resend (empieza con `p=MIGfMA0GCSqG...`)
   - **TTL:** 300 (o deja Auto)
3. Haz clic en **Create records**

### Paso 4: Agregar el registro SPF MX

1. Haz clic en **Create record**
2. Configura:
   - **Record name:** `send.panda-tec`
   - **Record type:** MX
   - **Value:** `10 feedback-sm[...]amazonses.com` (copia el valor completo desde Resend)
   - **TTL:** 300
3. Haz clic en **Create records**

### Paso 5: Agregar el registro SPF TXT

1. Haz clic en **Create record**
2. Configura:
   - **Record name:** `send.panda-tec`
   - **Record type:** TXT
   - **Value:** `v=spf1 include[...]nses.com ~all` (copia el valor completo desde Resend)
   - **TTL:** 300
3. Haz clic en **Create records**

### Paso 6: Agregar el registro DMARC (Opcional)

1. Haz clic en **Create record**
2. Configura:
   - **Record name:** `_dmarc`
   - **Record type:** TXT
   - **Value:** `v=DMARC1; p=none;`
   - **TTL:** 300
3. Haz clic en **Create records**

---

## ⏱️ Verificación

### Esperar propagación DNS (5-15 minutos)

Puedes verificar si los registros se propagaron usando:

```bash
# Verificar DKIM
nslookup -type=TXT resend._domainkey.panda-tec.onrender.com

# Verificar SPF TXT
nslookup -type=TXT send.panda-tec.onrender.com

# Verificar SPF MX
nslookup -type=MX send.panda-tec.onrender.com
```

O usa herramientas online:
- [DNS Checker](https://dnschecker.org/)
- [MXToolbox](https://mxtoolbox.com/)

### Verificar en Resend

1. Ve a tu dashboard de Resend
2. Selecciona el dominio `panda-tec.onrender.com`
3. Haz clic en **Verify DNS Records**
4. Deberías ver todos los registros en verde ✅

---

## 🎯 Actualizar Variable en Render

Una vez que Resend muestre el dominio como verificado:

1. Ve a tu servicio en Render
2. Ve a **Environment**
3. Actualiza la variable:

```
RESEND_FROM = Panta Tec <noreply@panda-tec.onrender.com>
```

O usa cualquier email que quieras:
- `soporte@panda-tec.onrender.com`
- `ventas@panda-tec.onrender.com`
- `notificaciones@panda-tec.onrender.com`

4. Haz **Manual Deploy**

---

## ⚠️ Notas Importantes

1. **No uses `onrender.com` como dominio principal** - Es mejor tener un dominio propio (ej: `pantatec.com`)
2. **Los valores `[_]` en los registros** - Asegúrate de copiar el valor COMPLETO desde Resend, sin truncar
3. **Propagación DNS** - Puede tomar hasta 48 horas, pero normalmente es 5-15 minutos
4. **Enable Sending debe estar activado** - En la captura se ve el toggle verde ✅

---

## 🐛 Troubleshooting

### Los registros no se verifican

1. Verifica que copiaste los valores completos (sin espacios extra)
2. Espera 15 minutos más
3. Verifica con `nslookup` que los registros existan
4. Revisa que el nombre del registro sea exacto (con puntos y guiones)

### Emails no se envían después de verificar

1. Verifica que `RESEND_FROM` use el dominio verificado
2. Revisa los logs de Render para ver errores
3. Verifica en el dashboard de Resend si hay emails fallidos

### Error "Domain not verified"

1. Asegúrate de que todos los registros DNS estén en verde en Resend
2. Espera a que la propagación DNS termine
3. Haz clic en "Verify DNS Records" nuevamente

---

## ✅ Checklist Final

- [ ] Agregué el registro DKIM (TXT)
- [ ] Agregué el registro SPF MX
- [ ] Agregué el registro SPF TXT
- [ ] Agregué el registro DMARC (opcional)
- [ ] Esperé 15 minutos para propagación
- [ ] Verifiqué con `nslookup` o DNS Checker
- [ ] Hice clic en "Verify DNS Records" en Resend
- [ ] Todos los registros están en verde ✅
- [ ] Actualicé `RESEND_FROM` en Render
- [ ] Hice redeploy en Render
- [ ] Probé enviar un email de recuperación

---

**¿Necesitas ayuda?** Revisa los logs de Render y el dashboard de Resend para ver errores específicos.
