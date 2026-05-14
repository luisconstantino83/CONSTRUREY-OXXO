-- ═══════════════════════════════════════════════════════════
-- CONSTRUREY OXXO — ESQUEMA COMPLETO SUPABASE
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM TYPES ────────────────────────────────────────────
CREATE TYPE prioridad_type  AS ENUM ('ALTA','MEDIA','BAJA');
CREATE TYPE estatus_type    AS ENUM ('Abierto','Cerrado','Vencido');
CREATE TYPE rol_type        AS ENUM ('admin','supervisor','tecnico','readonly');
CREATE TYPE superheat_type  AS ENUM ('pendiente','programado','realizado');

-- ─── USUARIOS (extiende auth.users) ───────────────────────
CREATE TABLE usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  correo      TEXT NOT NULL UNIQUE,
  rol         rol_type NOT NULL DEFAULT 'readonly',
  activo      BOOLEAN NOT NULL DEFAULT true,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CATEGORIAS ────────────────────────────────────────────
CREATE TABLE categorias (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);
INSERT INTO categorias (nombre) VALUES
  ('Climatización'),('Refrigeración'),('Electricidad'),
  ('Seguridad'),('Plomería'),('Sistemas'),('Obra Civil'),
  ('Bomba'),('Iluminación'),('Super Heat'),('Otro');

-- ─── TIENDAS ───────────────────────────────────────────────
CREATE TABLE tiendas (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo    TEXT,
  nombre    TEXT NOT NULL,
  ciudad    TEXT NOT NULL DEFAULT 'Reynosa',
  direccion TEXT,
  activa    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── TECNICOS ──────────────────────────────────────────────
CREATE TABLE tecnicos (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre    TEXT NOT NULL,
  cuadrilla TEXT,
  telefono  TEXT,
  activo    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── FOLIOS ────────────────────────────────────────────────
CREATE TABLE folios (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_folio            TEXT NOT NULL UNIQUE,
  id_tienda               TEXT,
  tienda_nombre           TEXT NOT NULL,
  ciudad                  TEXT NOT NULL DEFAULT 'Reynosa',
  prioridad               prioridad_type NOT NULL DEFAULT 'MEDIA',
  categoria               TEXT,
  motivo                  TEXT,
  falla                   TEXT,
  falla_especifica        TEXT,
  representante_propietario TEXT,
  prestador_servicio      TEXT,
  tecnico_asignado        TEXT,
  fecha_asignacion        TIMESTAMPTZ,
  fecha_vencimiento       TIMESTAMPTZ NOT NULL,
  fecha_cierre            TIMESTAMPTZ,
  estatus                 estatus_type NOT NULL DEFAULT 'Abierto',
  comentarios_cierre      TEXT,
  nombre_persona_cierra   TEXT,
  cerrado_a_tiempo        BOOLEAN,
  tiempo_vencido_mins     INTEGER,
  correo_origen           TEXT,
  fecha_importacion       TIMESTAMPTZ DEFAULT now(),
  actualizado_por         UUID REFERENCES usuarios(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── HISTORIAL ─────────────────────────────────────────────
CREATE TABLE historial_cambios (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio_id       UUID NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
  usuario_id     UUID REFERENCES usuarios(id),
  usuario_nombre TEXT,
  accion         TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CORREOS IMPORTADOS ────────────────────────────────────
CREATE TABLE correos_importados (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo             TEXT,  -- 'apertura' | 'cierre' | 'desconocido'
  contenido        TEXT NOT NULL,
  folio_detectado  TEXT,
  folio_id         UUID REFERENCES folios(id),
  procesado        BOOLEAN NOT NULL DEFAULT false,
  resultado        TEXT,
  importado_por    UUID REFERENCES usuarios(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── SUPER HEAT ────────────────────────────────────────────
CREATE TABLE super_heat (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tienda_nombre   TEXT NOT NULL,
  ciudad          TEXT NOT NULL DEFAULT 'Reynosa',
  estatus         superheat_type NOT NULL DEFAULT 'pendiente',
  fecha_super_heat TIMESTAMPTZ,
  realizado_por   TEXT,
  cuadrilla       TEXT,
  comentarios     TEXT,
  evidencia_url   TEXT,
  actualizado_por UUID REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── INSERTAR TIENDAS SUPER HEAT ──────────────────────────
INSERT INTO super_heat (tienda_nombre, ciudad) VALUES
('AGUSTIN LARA','Reynosa'),('BEETHOVEN','Reynosa'),('CAÑADA','Reynosa'),
('CIRCUITO INDEPENDENCIA','Reynosa'),('DEL MAESTRO','Reynosa'),('DOCTORES','Reynosa'),
('ELIAS PINA','Reynosa'),('FUENTES','Reynosa'),('GENERAL ALVARO','Reynosa'),
('JUAREZ 2','Reynosa'),('CALZADA VICTORIA','Reynosa'),('ENRIQUE CANSECO','Reynosa'),
('RIO PURIFICACION','Reynosa'),('PLAZA JUAREZ','Reynosa'),('LA PRESA','Reynosa'),
('TAMAULIPAS','Reynosa'),('BLVD REYNOSA','Reynosa'),('IDEAL','Reynosa'),
('LAREDO','Reynosa'),('PUERTO ESCONDIDO','Reynosa'),('BENITO JUAREZ','Reynosa'),
('IGNACIO MARISCAL','Reynosa'),('HEROES DE LA REFORMA','Reynosa'),('COLOSIO','Reynosa'),
('MORELOS II','Reynosa'),('GUELATAO','Reynosa'),('BETONICA','Reynosa'),
('JACALITOS','Reynosa'),('SEGUNDA','Reynosa'),('LAS TORRES','Reynosa'),
('LOPEZ PORTILLO','Reynosa'),('PETROLERA','Reynosa'),('UNIDAD OBRERA','Reynosa'),
('ANHELO','Reynosa'),('DELICIAS','Reynosa'),('ESPUELA','Reynosa'),
('LAMPACITOS','Reynosa'),('AEROPUERTO','Reynosa'),('UNIV TECNOLOGICA','Reynosa'),
('COMMSCOPE','Reynosa'),('ALMAGUER','Reynosa'),('TOTECO','Reynosa'),
('GENERAL RODRIGUEZ','Reynosa'),('ZACATECAS','Reynosa'),('LA JOYA','Reynosa'),
('ALMENDROS','Río Bravo'),('CIPRES','Reynosa'),('VIADUCTO REYNOSA','Reynosa'),
('VILLA ESMERALDA','Reynosa'),('TREBOL','Reynosa'),('HIMALAYA','Reynosa'),
('BALCONES DE ALCALA','Reynosa'),('GIRASOL','Reynosa'),('VALLE SOLEADO','Reynosa'),
('AV. DEL PARQUE','Reynosa'),('ROCALLOSA','Reynosa'),('LAUREL','Reynosa'),
('LATON','Reynosa'),('ALAMO','Reynosa'),('BRILLANTE','Reynosa'),
('CONQUISTADORES','Reynosa'),('CAMPO MILITAR','Reynosa'),('NOCHEBUENA','Reynosa'),
('CUAUHTEMOC','Reynosa'),('DEL RIO','Reynosa'),('AGHATA','Reynosa'),
('RIVERAS DEL CARMEN','Reynosa'),('18 DE MARZO','Reynosa'),('AMERICAS','Reynosa'),
('SANTA FE','Reynosa'),('PLATA','Reynosa'),('LAS PALMAS','Reynosa'),
('MATAMOROS','Reynosa'),('GUERRERO','Río Bravo'),('TLAXCALA','Río Bravo'),
('BRISAS DEL CAMPO','Río Bravo'),('COLEGIO MILITAR','Río Bravo'),('JALAPA','Río Bravo'),
('CENTRAL RIO BRAVO','Río Bravo'),('COLONIAL','Río Bravo'),('YUCATAN','Río Bravo'),
('NUEVO PROGRESO','Río Bravo'),('NUEVO PROGRESO II','Río Bravo'),('OCEANO ATLANTICO','Río Bravo'),
('PIRUL','Río Bravo'),('GUANAJUATO','Río Bravo'),('COAHUILA','Río Bravo'),
('BARD','Río Bravo'),('CAMPANARIO','Río Bravo'),('CHAPULTEPEC','Río Bravo'),
('MAQUILADORAS','Río Bravo'),('BRECHA 108','Río Bravo'),('BRECHA','Río Bravo'),
('COMETA','Río Bravo'),('ALLENDE','Río Bravo'),('ONIX','Río Bravo'),
('SATELITE','Río Bravo'),('RUIZ CORTINEZ','Río Bravo'),('AZTECA','Río Bravo'),
('GUINDA','Río Bravo'),('EMILIANO ZAPATA','Río Bravo'),('24 DE FEBRERO','Río Bravo'),
('FRANCISCO I. MADERO','Río Bravo'),('LUCIO BLANCO','Río Bravo'),('LAS LIEBRES','Río Bravo'),
('ABASOLO','Río Bravo'),('16 DE SEPTIEMBRE','Río Bravo'),('AGENCIAS ADUANALES','Río Bravo'),
('CALLE 20','Río Bravo'),('CATERPILLAR','Río Bravo'),('DE LOS LAGOS','Río Bravo'),
('FCO NICODEMO','Río Bravo'),('GAS VALEO','Río Bravo'),('IMSS 270','Río Bravo'),
('INDEPENDENCIA','Río Bravo'),('KIMBALL','Río Bravo'),('RODHE','Río Bravo'),
('SAN ANGEL','Río Bravo'),('SAN FRANCISCO','Río Bravo'),('SUR 2','Río Bravo'),
('RIO RHIN MTY','Reynosa'),('ROMULO MTY','Reynosa'),('INGLATERRA','Reynosa'),
('JARACHINA NTE','Reynosa'),('MODULO 2000','Reynosa'),('NOVENA','Reynosa'),
('ORIENTE 2','Reynosa'),('PEKIN','Reynosa'),('SIERRA LEONA','Reynosa'),
('SUR TRES','Reynosa'),('SUR UNO','Reynosa'),('TRES PICOS','Reynosa'),
('PIRAMIDES','Reynosa'),('AVENIDA FELIPE','Reynosa');

-- ─── INDEXES ───────────────────────────────────────────────
CREATE INDEX idx_folios_estatus    ON folios(estatus);
CREATE INDEX idx_folios_prioridad  ON folios(prioridad);
CREATE INDEX idx_folios_ciudad     ON folios(ciudad);
CREATE INDEX idx_folios_vencimiento ON folios(fecha_vencimiento);
CREATE INDEX idx_folios_numero     ON folios(numero_folio);
CREATE INDEX idx_superheat_tienda  ON super_heat(tienda_nombre);
CREATE INDEX idx_historial_folio   ON historial_cambios(folio_id);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER folios_updated_at      BEFORE UPDATE ON folios      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER super_heat_updated_at  BEFORE UPDATE ON super_heat  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER usuarios_updated_at    BEFORE UPDATE ON usuarios     FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── AUTO CREAR USUARIO EN TABLA USUARIOS ─────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nombre, correo, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'rol')::rol_type, 'readonly')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── RLS POLICIES ─────────────────────────────────────────
ALTER TABLE usuarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE folios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_cambios ENABLE ROW LEVEL SECURITY;
ALTER TABLE correos_importados ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_heat       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tecnicos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiendas          ENABLE ROW LEVEL SECURITY;

-- Usuarios: ver todos, editar solo admins
CREATE POLICY "usuarios_select" ON usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "usuarios_update_admin" ON usuarios FOR UPDATE TO authenticated
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','supervisor'));

-- Folios: todos autenticados pueden leer, admins/supervisores pueden escribir
CREATE POLICY "folios_select"    ON folios FOR SELECT TO authenticated USING (true);
CREATE POLICY "folios_insert"    ON folios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "folios_update"    ON folios FOR UPDATE TO authenticated USING (
  (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','supervisor','tecnico')
);
CREATE POLICY "folios_delete"    ON folios FOR DELETE TO authenticated USING (
  (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin'
);

-- Historial: todos leen, cualquiera inserta
CREATE POLICY "hist_select" ON historial_cambios FOR SELECT TO authenticated USING (true);
CREATE POLICY "hist_insert" ON historial_cambios FOR INSERT TO authenticated WITH CHECK (true);

-- Correos
CREATE POLICY "correos_select" ON correos_importados FOR SELECT TO authenticated USING (true);
CREATE POLICY "correos_insert" ON correos_importados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "correos_update" ON correos_importados FOR UPDATE TO authenticated USING (true);

-- Super Heat
CREATE POLICY "sh_select" ON super_heat FOR SELECT TO authenticated USING (true);
CREATE POLICY "sh_update" ON super_heat FOR UPDATE TO authenticated USING (
  (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','supervisor','tecnico')
);
CREATE POLICY "sh_insert" ON super_heat FOR INSERT TO authenticated WITH CHECK (
  (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','supervisor')
);

-- Catálogos
CREATE POLICY "cats_select"    ON categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "tiendas_select" ON tiendas    FOR SELECT TO authenticated USING (true);
CREATE POLICY "tecs_select"    ON tecnicos   FOR SELECT TO authenticated USING (true);
CREATE POLICY "tecs_write"     ON tecnicos   FOR ALL   TO authenticated USING (
  (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin','supervisor')
);

-- ─── ENABLE REALTIME ──────────────────────────────────────
-- En Supabase Dashboard > Database > Replication:
-- Habilitar realtime para: folios, super_heat, historial_cambios

-- ─── VISTA FOLIOS CON STATS ───────────────────────────────
CREATE OR REPLACE VIEW vista_folios_stats AS
SELECT
  f.*,
  CASE
    WHEN f.estatus = 'Cerrado' THEN NULL
    WHEN f.fecha_vencimiento < now() THEN 0
    ELSE EXTRACT(EPOCH FROM (f.fecha_vencimiento - now()))::INTEGER
  END AS segundos_restantes,
  CASE
    WHEN f.estatus = 'Cerrado' THEN false
    WHEN f.fecha_vencimiento < now() THEN true
    ELSE false
  END AS esta_vencido
FROM folios f;

GRANT SELECT ON vista_folios_stats TO authenticated;
