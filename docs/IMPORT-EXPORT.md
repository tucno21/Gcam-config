# Importación y exportación (Etapa 13)

Formato propio de respaldo en JSON. Detalles de implementación: D-034.
No sustituye a la base de datos ni contiene claves; son datos del catálogo.

## Exportar

| Acción | Dónde | Contenido |
|---|---|---|
| Exportar cámara | Lista de cámaras (icono) y ficha de la cámara (botón) | Cámara, todas sus versiones, niveles, parámetros (con valor actual, notas y linaje), historial de valores y, si existen, perfiles y experimentos heredados |
| Exportar perfil | Lista de perfiles (icono) | Perfil con sus valores y las definiciones de los parámetros usados, con ruta (herencia de la Etapa 9) |

Nombre del archivo: `gcam-<slug>-<fecha>.json` y
`gcam-<slug-cámara>-<perfil>-<fecha>.json` para perfiles.

> Desde la Etapa 16 la interfaz ya no crea perfiles ni experimentos (D-037), pero
> los respaldos antiguos siguen importándose y se exportan los datos heredados si
> existen. Los campos nuevos (`lineageId`, `notes`, `currentValue`,
> `currentValueSource`, `isActive` en niveles y `history`) son **opcionales** al
> importar, así que un archivo de la Etapa 13 sigue siendo válido.

## Formato `gcam-camera-backup` (versión de esquema 1)

```json
{
  "format": "gcam-camera-backup",
  "schemaVersion": 1,
  "exportedAt": "2026-11-18T10:00:00.000Z",
  "camera": { "name": "…", "slug": "…", "description": null, "developer": null, "websiteUrl": null, "isActive": true },
  "versions": [
    {
      "version": "1.0",
      "releaseLabel": null,
      "notes": null,
      "isDefault": true,
      "isActive": true,
      "createdAt": "…",
      "nodes": [
        { "id": "uuid", "parentId": null, "name": "Base", "description": null, "nodeType": "category", "sortOrder": 0, "createdAt": "…" }
      ],
      "parameters": [
        {
          "id": "uuid", "nodeId": "uuid", "key": "max_frames", "name": "Max Frames", "description": null,
          "dataType": "integer", "unit": "f", "defaultValue": 10, "defaultValueSource": "documentation",
          "defaultValueConfidence": null, "allowedValues": null, "sortOrder": 0, "isActive": true, "createdAt": "…"
        }
      ],
      "configurations": [
        {
          "id": "uuid", "name": "Nocturno", "description": null, "isDefault": true, "isActive": true,
          "createdAt": "…", "values": [ { "parameterId": "uuid", "value": 20, "notes": null } ]
        }
      ],
      "experiments": [
        {
          "id": "uuid", "configurationId": "uuid", "title": "…", "objective": null, "hypothesis": null,
          "status": "completed", "observations": null, "conclusion": null,
          "startedAt": "…", "completedAt": "…", "createdAt": "…",
          "changes": [
            {
              "parameterId": "uuid", "previousValue": 10, "newValue": 20, "reason": null, "observation": null,
              "pathSnapshot": ["Base", "Exposición"], "appliedToProfile": true, "createdAt": "…"
            }
          ]
        }
      ]
    }
  ]
}
```

Los `id` solo sirven para **relacionar** dentro del archivo: al importar se generan ids
nuevos y se remapean todas las referencias (`parentId`, `nodeId`, `parameterId`,
`configurationId`).

### Formato `gcam-profile-backup`

Mismo `schemaVersion`; incluye `context` (cámara y versión de origen),
`configuration` (perfil y valores) y `parameters` (definiciones usadas con `path`).
Se usa para consulta y respaldo; **la importación soportada es la de cámara
completa** (no se mezcla un perfil en una versión existente para evitar sobrescribir).

## Importar

1. Elegir el archivo JSON.
2. La app valida formato, esquema, límites, duplicados internos y referencias.
3. Se muestra un **resumen** (versiones, nodos, parámetros, perfiles, valores,
   experimentos y cambios) y la lista de **errores** si los hay.
4. Nombre y slug son editables; si el slug existe, la importación se bloquea hasta
   cambiarlo.
5. Se puede incluir o excluir experimentos e historial (si el archivo los trae).

**Nunca sobrescribe**: crea una cámara nueva. Si quieres «restaurar» sobre una
existente, elimínala antes (con respaldo previo) o deja ambas y compara.

### Qué se conserva

- Relaciones: versiones → nodos (jerarquía y orden) → parámetros → perfiles → valores.
- Definiciones completas: tipo, unidad, valor predeterminado, procedencia, certeza,
  opciones de enum, estado y orden.
- Predeterminados (uno por cámara/versión) y archivado (`isActive`).
- Experimentos: campos y fechas (`startedAt`, `completedAt`).
- Historial: valor anterior/nuevo, motivo, observación, ruta congelada,
  `appliedToProfile` y `createdAt`.
- `createdAt` de versiones, nodos, parámetros, perfiles y experimentos.

### Qué cambia

- Los **ids** (se generan nuevos).
- `updated_at` se recalcula al insertar.
- El slug y el nombre, si los editas en el paso 4.

## Límites y validación

| Elemento | Máximo por respaldo |
|---|---|
| Versiones | 20 |
| Nodos | 5 000 |
| Parámetros | 5 000 |
| Perfiles | 100 |
| Valores | 10 000 |
| Experimentos | 500 |
| Cambios | 5 000 |

Errores detectados antes de escribir: formato/esquema desconocido, campos faltantes,
tipo o enum inválidos, nodos huérfanos o con padre inexistente, autoparentado,
hermanos con el mismo nombre, claves repetidas por nodo, perfiles con parámetros
inexistentes o repetidos, experimentos con perfil/parámetro ajenos, más de un
predeterminado por versión y etiquetas de versión duplicadas.

## XML de LMC/AGC/BSG: fuera de alcance por ahora

La compatibilidad con XML de terceros es una integración **específica por formato y
versión**. No se promete importación universal ni se asume que todas las cámaras usan
el mismo XML. Para abordarla hace falta que el usuario aporte archivos reales; entonces
se documentarían las estructuras reconocidas y sus límites. Este formato JSON es el
respaldo propio de la aplicación.
