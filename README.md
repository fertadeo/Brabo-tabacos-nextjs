# Brabo Tabacos — ERP front (Next.js)

Instancia fork desde GOLD retail (origen mfcomputers, sin branding MF).

- API: https://github.com/fertadeo/Brabo-tabacos-api — default **`http://localhost:8088/api/`**
- Reparaciones / WooCommerce: OFF vía env
- En el mismo VPS que MF: no uses puerto 8086 (reservado a MF)

```bash
cp .env.brabo.example .env.local
npm install && npm run dev -- -p 43127
```
