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
  fecha_correo?: string
  tiempo_respuesta?: string
  comentarios_cierre?: string
  nombre_persona_cierra?: string
  fecha_solucion?: string
  raw: string
}
