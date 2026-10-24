-- Personería y CUIL/CUIT en clientes (ver docs/CLIENTES_FRONTEND_PERSONERIA_CUIL.md)
-- Si las columnas ya existen, solo se modifican (tipo, default, comentario).
ALTER TABLE `clients`
  MODIFY COLUMN `personeria` VARCHAR(20) NOT NULL DEFAULT 'consumidor_final'
    COMMENT 'persona_fisica | persona_juridica | consumidor_final',
  MODIFY COLUMN `cuil_cuit` VARCHAR(20) DEFAULT NULL
    COMMENT 'CUIL o CUIT (11 dígitos)';
