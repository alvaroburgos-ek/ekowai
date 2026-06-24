import type { FormTemplateSpec } from '../types';

/**
 * ISO 5667-6:2015 — Annex B (informative) "Ejemplo de un informe — Muestreo de ríos
 * y cursos de agua" (copy-permitted form), lines 2206–2351. Tabla B.1 = field sampling
 * sheet; Tabla B.2 = preservation log (repeating rows). Detection: FORM_TEMPLATE;
 * alignment REMAP_NEEDED — B.1 fields live inside the single `report_item` enum (not
 * discrete fields); Tabla B.2 not modeled at all (MISSING). Source labels are Spanish.
 * Source spec: _site_audit/ISO-5667-6/_form_layout_spec.md.
 */
const REMAP = 'captured only inside the report_item enum (not a discrete field)';

export const iso5667_6AnnexB: FormTemplateSpec = {
  standardCode: 'ISO-5667-6',
  title: 'Informe de muestreo — Ríos y cursos de agua (Anexo B)',
  sourceLocation: 'Anexo B, Tablas B.1 + B.2 (líneas 2206–2351, p. 29–30)',
  note: 'NOTA: "Se otorga permiso para copiar este formulario." Anexo B es informativo.',
  sections: [
    {
      title: 'Encabezado',
      fields: [
        { label: 'Nombre del río', kind: 'text', encodedSymbol: null, remapNote: REMAP },
        { label: 'Fecha', kind: 'date', encodedSymbol: null, remapNote: REMAP },
        { label: 'Área de identificación', kind: 'text', encodedSymbol: null, remapNote: REMAP },
        { label: 'Hora', kind: 'time', encodedSymbol: null, remapNote: REMAP },
        { label: 'Punto de muestreo', kind: 'text', encodedSymbol: null, remapNote: REMAP },
        { label: 'Este', kind: 'text', encodedSymbol: null },
        { label: 'Río (km)', kind: 'number', unit: 'km', encodedSymbol: null },
        { label: 'Norte', kind: 'text', encodedSymbol: null },
      ],
    },
    {
      title: 'Muestreo / equipo',
      fields: [
        { label: 'Tipo de muestreo', kind: 'checkbox-group', options: ['discreta'], encodedSymbol: null, remapNote: REMAP },
        { label: 'Sistema de coordenadas', kind: 'checkbox-group', options: ['Gauss-Krüger', 'UTM'], encodedSymbol: null },
        { label: 'Profundidad retirada', kind: 'checkbox-group', options: ['subsuelo'], encodedSymbol: null },
        { label: 'Equipo de muestreo', kind: 'checkbox-group', options: ['balde', 'recipiente'], encodedSymbol: null, remapNote: REMAP },
        { label: 'Nombre del recolector de la muestra', kind: 'text', encodedSymbol: null, remapNote: REMAP },
      ],
    },
    {
      title: 'Clima',
      fields: [
        { label: 'Clima — Día del muestreo', kind: 'checkbox-group', options: ['Soleado', 'Nublado', 'Cambiante', 'Lluvioso', 'Caluroso', 'Frío'], encodedSymbol: null, remapNote: REMAP },
        { label: 'Clima — Día anterior', kind: 'checkbox-group', options: ['Soleado', 'Nublado', 'Cambiante', 'Lluvioso', 'Caluroso', 'Frío'], encodedSymbol: null, remapNote: REMAP },
      ],
    },
    {
      title: 'Hidráulica',
      fields: [
        { label: 'Ancho del río — valor estimado', kind: 'number', unit: 'm', encodedSymbol: null },
        { label: 'Profundidad promedio estimada', kind: 'number', unit: 'm', encodedSymbol: null },
        { label: 'Velocidad del flujo — valor estimado', kind: 'number', unit: 'm/s', encodedSymbol: null },
        { label: 'Lectura del personal', kind: 'number', unit: 'cm', encodedSymbol: null },
        { label: 'Descarga — valor estimado', kind: 'number', unit: 'L/s', encodedSymbol: null },
      ],
    },
    {
      title: 'Lugar del muestreo (Orilla del río)',
      fields: [
        { label: 'Orilla', kind: 'checkbox-group', options: ['derecha', 'izquierda', 'medio'], encodedSymbol: null },
      ],
    },
    {
      title: 'Carácter de la muestra de agua',
      fields: [
        { label: 'Color', kind: 'checkbox-group', options: ['sin color', 'claro', 'intenso', 'café', 'gris', 'amarillo', 'verde-azul', 'amarillo-verde', 'amarillo-café'], encodedSymbol: null, remapNote: REMAP },
        { label: 'Información de la espuma', kind: 'checkbox-group', options: ['no presenta', 'ligera', 'intensa'], encodedSymbol: null, remapNote: REMAP },
        { label: 'Turbidez', kind: 'checkbox-group', options: ['claro', 'casi claro', 'ligero', 'intenso'], encodedSymbol: null, remapNote: REMAP },
        { label: 'Olor', kind: 'checkbox-group', options: ['no presenta', 'ligero', 'fuerte', 'tierra', 'moho', 'putrefacto', 'estiércol', 'pescado', 'aromático', 'aguas residuales', 'combustible/aceite'], encodedSymbol: null, remapNote: REMAP },
        { label: 'In situ — valor del pH', kind: 'number', encodedSymbol: null },
        { label: 'In situ — Conductividad', kind: 'number', unit: 'µS/cm a 25°C', encodedSymbol: null },
        { label: 'In situ — Contenido/saturación de oxígeno', kind: 'number', unit: 'mg/L %', encodedSymbol: null },
        { label: 'In situ — Temperatura del agua/aire', kind: 'number', unit: '°C', encodedSymbol: null },
      ],
    },
    {
      title: 'Tabla B.2 — Medidas de conservación (registro de filas repetidas)',
      grid: {
        title: 'Medidas de conservación',
        orientation: 'columns-x-rows',
        note: 'Tabla B.2 no está modelada en la codificación (MISSING_FIELDS). * = no capturado.',
        members: [
          { label: 'Parámetro (identificación sobre el recipiente)', kind: 'text', encodedSymbol: null },
          { label: 'Recipiente (número / material / volumen)', kind: 'text', encodedSymbol: null },
          { label: 'Pre-tratamiento', kind: 'text', encodedSymbol: null },
          { label: 'Conservación', kind: 'text', encodedSymbol: null },
          { label: 'En el lugar', kind: 'checkbox', encodedSymbol: null },
          { label: 'En el laboratorio', kind: 'checkbox', encodedSymbol: null },
        ],
      },
    },
  ],
  signoff: [
    { label: 'Comentarios', kind: 'textarea', encodedSymbol: null, remapNote: REMAP },
    { label: 'Fecha / firma', kind: 'signature' },
  ],
};
