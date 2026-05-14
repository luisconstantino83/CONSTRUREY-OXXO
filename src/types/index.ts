export type Prioridad = 'ALTA' | 'MEDIA' | 'BAJA'
export type Estatus   = 'Abierto' | 'Cerrado' | 'Vencido'
export type Rol       = 'admin' | 'supervisor' | 'tecnico' | 'readonly'
export type SuperHeatEstatus = 'pendiente' | 'programado' | 'realizado'

export interface Usuario {
  id: string
  nombre: string
  correo: string
  rol: Rol
  activo: boolean
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Folio {
  id: string
  numero_folio: string
  id_tienda?: string
  tienda_nombre: string
  ciudad: string
  prioridad: Prioridad
  categoria?: string
  motivo?: string
  falla?: string
  falla_especifica?: string
  representante_propietario?: string
  prestador_servicio?: string
  tecnico_asignado?: string
  fecha_asignacion?: string
  fecha_vencimiento: string
  fecha_cierre?: string
  estatus: Estatus
  comentarios_cierre?: string
  nombre_persona_cierra?: string
  cerrado_a_tiempo?: boolean
  tiempo_vencido_mins?: number
  correo_origen?: string
  fecha_importacion?: string
  actualizado_por?: string
  created_at: string
  updated_at: string
  // computed client-side
  segundos_restantes?: number
}

export interface HistorialCambio {
  id: string
  folio_id: string
  usuario_id?: string
  usuario_nombre?: string
  accion: string
  valor_anterior?: string
  valor_nuevo?: string
  created_at: string
}

export interface CorreoImportado {
  id: string
  tipo?: string
  contenido: string
  folio_detectado?: string
  folio_id?: string
  procesado: boolean
  resultado?: string
  importado_por?: string
  created_at: string
}

export interface SuperHeat {
  id: string
  tienda_nombre: string
  ciudad: string
  estatus: SuperHeatEstatus
  fecha_super_heat?: string
  realizado_por?: string
  cuadrilla?: string
  comentarios?: string
  evidencia_url?: string
  actualizado_por?: string
  created_at: string
  updated_at: string
}

export interface Tecnico {
  id: string
  nombre: string
  cuadrilla?: string
  telefono?: string
  activo: boolean
}

export interface DashboardStats {
  total: number
  abiertos: number
  cerrados: number
  vencidos: number
  altas: number
  medias: number
  bajas: number
  proximosVencer: number
}

export interface ParsedCorreo {
  tipo: 'apertura' | 'cierre' | 'desconocido'
  ticket?: string
  id_tienda?: string
  tienda_nombre?: string
  ciudad?: string
  prioridad?: Prioridad
  categoria?: string
  motivo?: string
  falla?: string
  falla_especifica?: string
  representante_propietario?: string
  prestador_servicio?: string
  fecha_asignacion?: string
  tiempo_respuesta?: string
  comentarios_cierre?: string
  nombre_persona_cierra?: string
  fecha_solucion?: string
  raw: string
}
