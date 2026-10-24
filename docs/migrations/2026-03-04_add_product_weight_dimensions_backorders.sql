-- WooCommerce: reservas, dimensiones y peso (productos por encargo / envíos)
-- Ejecutar antes de usar estos campos en producción.
-- Si alguna columna ya existe (p. ej. por db-test), comentar esa línea para evitar "Duplicate column name".

ALTER TABLE products ADD COLUMN weight DECIMAL(10,2) NULL COMMENT 'Peso en kg (envíos)';
ALTER TABLE products ADD COLUMN length DECIMAL(10,2) NULL COMMENT 'Longitud en cm';
ALTER TABLE products ADD COLUMN width DECIMAL(10,2) NULL COMMENT 'Ancho en cm';
ALTER TABLE products ADD COLUMN height DECIMAL(10,2) NULL COMMENT 'Alto en cm';
ALTER TABLE products ADD COLUMN allow_backorders TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = venta por encargo (reservas con stock 0)';
