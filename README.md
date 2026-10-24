# Brabo Tabacos — ERP retail (front)

Instancia fork desde plantilla GOLD Aurix Retail (origen mfcomputers).

- Reparaciones: **deshabilitadas**
- Branding: Brabo Tabacos
- API esperada: `brabo-tabacos-api` en `http://localhost:8086/api/`

## Local

```bash
cp .env.brabo.example .env.local
npm install
npm run dev -- -p 43127
```

Credenciales: las del seed de la API (mock local). Ver `scripts/alta-instancia.md`.

## Pendiente

- Repo GitHub/Origin `fertadeo/brabo-tabacos` + push main
- API `brabo-tabacos-api` (GOLD API limpia + seed tabacos)
- Logos definitivos
- Dominio / VPS / secretos
- Registrar en Fenec Admin después
