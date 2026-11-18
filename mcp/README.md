# Servidor MCP del catálogo GCam (Etapa 12)

Interfaz de herramientas para OpenCode sobre la **API de la Etapa 11**. Corre en tu
máquina por **stdio** (sin desplegar nada ni pagar nada) y usa el token de tu usuario:
no tiene claves privilegiadas ni acceso directo a la base.

## Requisitos

- Node 20+.
- La app desplegada (o `vercel dev` en local) con la API `/api` accesible.
- Un **access token** de Supabase Auth de tu usuario.

## Compilar y probar

```bash
npm run mcp:build   # genera mcp/dist/server.mjs
GCAM_API_URL="https://<tu-app>.vercel.app/api" \
GCAM_API_TOKEN="<access_token>" \
npm run mcp
```

Variables:

| Variable | Obligatoria | Descripción |
|---|---|---|
| `GCAM_API_URL` | sí | Base de la API (incluye `/api`) |
| `GCAM_API_TOKEN` | sí | Access token de Supabase Auth (`sb_publishable_…` **no** sirve aquí) |

> El token caduca (~1 h). Cuando OpenCode deje de responder, renueva el token con
> Supabase Auth y reinicia el servidor MCP. Nunca lo guardes en el repositorio.

## Configuración en OpenCode

Ejemplo de `opencode.json` (local, **sin versionar** si contiene el token):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "gcam": {
      "type": "local",
      "command": ["node", "mcp/dist/server.mjs"],
      "enabled": true,
      "environment": {
        "GCAM_API_URL": "https://<tu-app>.vercel.app/api",
        "GCAM_API_TOKEN": "<access_token>"
      }
    }
  }
}
```

Alternativa más segura: exporta `GCAM_API_URL` y `GCAM_API_TOKEN` en la terminal antes
de abrir OpenCode y deja el bloque `environment` fuera del archivo.

## Herramientas

**Lectura**

| Herramienta | Qué hace |
|---|---|
| `list_cameras` | Cámaras con número de versiones (búsqueda por nombre/slug) |
| `list_camera_versions` | Versiones de una cámara con nodos y perfiles |
| `get_parameter_tree` | Nodos de una versión (`parentId` reconstruye la jerarquía) |
| `find_parameter` | Busca por nombre, clave o ruta; devuelve la ruta y el predeterminado |
| `get_parameter_details` | Ficha completa con ruta calculada |
| `get_configuration` | Perfil con valores actuales y predeterminados |
| `get_parameter_history` | Cambios del parámetro con ruta histórica y `appliedToProfile` |
| `list_experiments` | Experimentos por versión/perfil/estado |
| `compare_experiments` | Estado, conclusiones y último valor por parámetro en dos pruebas |

**Escritura limitada** (siempre por petición del usuario)

| Herramienta | Efecto |
|---|---|
| `create_experiment` | Crea un experimento; escribe solo esa fila |
| `propose_parameter_changes` | Valida una propuesta contra datos reales y **no escribe** |
| `save_recommendation` | Guarda la recomendación como `proposed`; no aplica nada |
| `record_experiment_result` | Actualiza observaciones/conclusión/estado del experimento |

No existe herramienta para aplicar cambios a un perfil ni para borrar nada. Aplicar
un cambio requiere la app (o `POST /api/experiments/:id/changes` con `apply: true`,
explícito).

## Comportamiento esperado del modelo

El servidor declara instrucciones para que el asistente:

- consulte los datos reales antes de recomendar;
- identifique cámara y versión exactas;
- cite la ruta de cada parámetro;
- distinga predeterminado, valor actual y valor propuesto;
- explique el motivo e indique incertidumbre;
- proponga pocos parámetros por experimento;
- no invente nombres, rutas ni valores; si faltan datos, lo diga;
- no aplique recomendaciones por iniciativa propia.
