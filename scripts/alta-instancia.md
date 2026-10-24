# Checklist de alta — fork desde GOLD (front + API)

Base del futuro “script de fork”. Repetible por cliente.

## 0. Repos (confirmar URLs)

**Gold (origen, no ensuciar prod):**

- Front: `https://github.com/fertadeo/mfcomputers-nextjs` · Origin `fertadeo/mfcomputers-nextjs`
- API: `https://github.com/fertadeo/mfcomputers-API` · Origin `fertadeo/mfcomputers-API`

**Destino Brabo (crear si no existen):**

- Front: `fertadeo/brabo-tabacos`
- API: `fertadeo/brabo-tabacos-api`

Alternativa segura: `*-template` (GOLD limpio) + forks Brabo desde template.

## 1. Crear repos destino

```bash
# GitHub o Origin — quien tenga permiso
gh repo create fertadeo/brabo-tabacos --private
gh repo create fertadeo/brabo-tabacos-api --private
# o: origin repo create fertadeo/brabo-tabacos
```

## 2. Clonar GOLD limpio → Brabo

```bash
git clone <gold-front-template> brabo-tabacos
cd brabo-tabacos
git remote set-url origin git@github.com:fertadeo/brabo-tabacos.git
cp .env.brabo.example .env.local
# Ajustar package.json name, logos en public/images
```

Repetir con API template → `brabo-tabacos-api`.

## 3. Base de datos (API)

```bash
# En API:
cp .env.example .env
# crear BD vacía (postgres/mysql según stack)
# migrate + seed mínimo: admin + categorías tabaco
npm run migrate   # o el comando del repo
npm run seed      # seed neutro / Brabo
```

Credenciales mock típicas (documentar las reales del seed):

- user: `admin@brabotabacos.local`
- pass: `CambiarYa123!` (solo local)

## 4. Feature flags Brabo

```
NEXT_PUBLIC_FEATURE_REPARACIONES=false
NEXT_PUBLIC_FEATURE_WOOCOMMERCE=false
NEXT_PUBLIC_FEATURE_TIENDA=false
NEXT_PUBLIC_APP_NAME=Brabo Tabacos
```

## 5. Smoke

- [ ] Login admin
- [ ] Alta producto / categoría tabaco
- [ ] Stock visible
- [ ] Venta o POS básico
- [ ] Menú sin reparaciones

## 6. Push

```bash
git push -u origin main
```

## 7. Después

- [ ] Registrar instancia en Fenec Admin (otro workstream)
- [ ] VPS / secretos / dominio (no inventar acceso)
- [ ] Reglas de negocio finas (precios, IVA tabaco, etc.)

## No hacer

- Meter Brabo en Aurix multi-tenant
- Tocar `fenec-admin-nextjs` / `fenec-admin-api` salvo pedido explícito
- Push a repos ajenos o a main de prod MF sin template/fork
