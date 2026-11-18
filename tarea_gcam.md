# PROMPT MAESTRO --- Construcción del Laboratorio de Configuraciones GCam

> **Instrucción para OpenCode:** Lee este documento completo antes de
> modificar el proyecto. Ejecuta las etapas en orden, inspecciona
> primero el código existente y conserva lo que ya funciona. No intentes
> construir toda la aplicación en una sola operación. Trabaja por
> etapas, verifica cada una y actualiza la documentación.

------------------------------------------------------------------------

## 1. Objetivo general

Construir una aplicación web privada, responsive y de bajo costo para
administrar cámaras GCam y sus configuraciones, con especial atención a
una **estructura jerárquica de niveles ilimitados**.

La aplicación permitirá:

-   Registrar distintas familias o modificaciones de GCam, por ejemplo
    LMC, AGC y BSG.
-   Registrar distintas versiones de cada cámara.
-   Crear y administrar árboles jerárquicos de categorías,
    subcategorías, grupos y subgrupos.
-   Registrar parámetros dentro de cualquier nivel del árbol.
-   Documentar el valor predeterminado y el valor actual de cada
    parámetro.
-   Crear perfiles de configuración y conservar su historial.
-   Registrar experimentos: qué se cambió, desde qué valor, a qué valor,
    por qué y cuál fue el resultado observado.
-   Consultar la información desde distintos dispositivos mediante
    Internet.
-   Exponer una API segura para que OpenCode y, en una etapa posterior,
    un servidor MCP puedan consultar los datos y ayudar a proponer
    experimentos.
-   Importar y exportar datos estructurados de configuraciones cuando se
    defina el formato correspondiente.

**No se almacenarán fotografías ni videos.** No crear módulos, tablas,
buckets ni funcionalidades para subir, guardar o comparar imágenes. Las
observaciones de resultados serán texto y datos estructurados.

La aplicación será un catálogo y laboratorio de parámetros; no debe
afirmar que puede modificar directamente la aplicación GCam instalada en
el teléfono. Los cambios se documentan en esta web y el usuario los
aplica manualmente en GCam, salvo que posteriormente se implemente una
integración real y verificable.

## 2. Stack tecnológico obligatorio

El proyecto ya tiene React, Vite y Tailwind CSS instalados. Respeta la
configuración existente.

### Librerías permitidas

-   `zustand`: estado global de interfaz cuando sea necesario.
-   `lucide-react`: iconos.
-   `axios`: solicitudes HTTP a la API propia.
-   `@dnd-kit/core`, `@dnd-kit/sortable` y `@dnd-kit/utilities`: ordenar
    y mover nodos del árbol mediante arrastrar y soltar.
-   `@supabase/supabase-js`: conexión con Supabase.
-   `react-router-dom`: navegación y rutas.

No agregues librerías de formularios, validación, tablas, modales,
componentes UI, gráficos, fechas, utilidades ni otras dependencias sin
autorización expresa. Los formularios, validaciones, tablas, árboles,
diálogos, notificaciones, selectores y demás componentes se
implementarán con React, JavaScript/TypeScript según el lenguaje que ya
use el proyecto, CSS/Tailwind y componentes propios.

No reemplaces Axios por `fetch` ni agregues una segunda solución de
estado. Antes de instalar paquetes, revisa `package.json` y reutiliza lo
que ya esté instalado. No actualices versiones de dependencias sin una
razón técnica documentada.

### Servicios externos

-   **Frontend:** Vercel, plan gratuito, sujeto a sus límites vigentes.
-   **Base de datos y autenticación:** Supabase, plan gratuito.
-   **Repositorio:** GitHub.
-   **IA durante el desarrollo:** OpenCode.
-   **Memoria de trabajo de OpenCode:** Engram MCP, ya instalado y
    configurado por el usuario.

No guardes secretos en el repositorio. Usa variables de entorno y crea
`.env.example` con nombres de variables y valores ficticios.

## 3. Reglas obligatorias de trabajo para OpenCode

1.  Inspecciona primero el proyecto: estructura de carpetas,
    `package.json`, scripts, versiones, configuración de Vite, Tailwind,
    TypeScript si existe y archivos actuales.
2.  No borres ni reemplaces código funcional sin justificarlo y sin
    comprobar sus dependencias.
3.  Identifica si el proyecto usa JavaScript o TypeScript y conserva esa
    elección. No migres todo el proyecto de lenguaje.
4.  Antes de cada etapa, explica brevemente qué vas a modificar y qué
    archivos estarán involucrados.
5.  Implementa una etapa a la vez. No avances si hay errores de
    compilación, errores de consola o fallos funcionales importantes.
6.  Ejecuta los scripts disponibles (`lint`, `typecheck`, `test`,
    `build`) cuando existan. Si no existen, como mínimo ejecuta
    `npm run build` y las verificaciones manuales pertinentes.
7.  No inventes parámetros reales de LMC, AGC o BSG, ni sus valores
    predeterminados. Los datos de demostración deben identificarse
    claramente como ficticios.
8.  No asumas que todas las cámaras o versiones tienen la misma
    estructura de parámetros.
9.  No uses fotografías ni almacenamiento de imágenes.
10. No incluyas claves `service_role` ni secretos de Supabase en el
    navegador.
11. Aplica seguridad por defecto: autenticación, autorización y
    políticas RLS en todas las tablas expuestas.
12. Evita duplicar lógica, componentes enormes, consultas directas
    dispersas y archivos monolíticos.
13. Mantén nombres consistentes, código legible, funciones pequeñas y
    componentes reutilizables.
14. No agregues funcionalidades no solicitadas por iniciativa propia.
15. Al terminar cada etapa, informa: archivos creados/modificados,
    decisiones, pruebas ejecutadas, resultados y pendientes.
16. Actualiza `AGENTS.md` y la documentación cuando cambien
    convenciones, arquitectura o decisiones importantes.
17. Usa Engram MCP para registrar decisiones técnicas importantes,
    estado de etapas y contexto que deba conservarse entre sesiones.
    Primero inspecciona las herramientas y las instrucciones disponibles
    de Engram; no inventes nombres de herramientas ni parámetros. No
    guardes secretos ni datos sensibles en Engram.
18. Si Engram no está disponible durante una sesión, continúa con la
    documentación local y deja constancia de ello; no bloquees el
    desarrollo.

------------------------------------------------------------------------

# ETAPA 0 --- Auditoría inicial y plan de trabajo

Antes de escribir código:

1.  Examina todo el proyecto y determina qué está instalado y qué
    funciona.
2.  Revisa `package.json`, `vite.config.*`, configuración de Tailwind,
    estructura `src/`, archivos de entrada y estilos globales.
3.  Comprueba si ya existen rutas, componentes, stores o integraciones.
4.  Identifica la versión de React, Vite y Tailwind.
5.  Comprueba si las librerías permitidas ya están instaladas.
6.  No reinstales paquetes que ya estén disponibles.
7.  Detecta errores preexistentes y sepáralos de los errores que
    introduzcas.
8.  Propón una estructura de carpetas coherente y explica brevemente las
    decisiones.
9.  Prepara una lista de etapas y criterios de aceptación.

**Resultado esperado:** diagnóstico del estado inicial, plan de
ejecución y lista de riesgos. Todavía no construyas módulos funcionales.

# ETAPA 1 --- Crear AGENTS.md y documentación base

Crea un archivo `AGENTS.md` en la raíz del proyecto. Debe ser una guía
permanente para OpenCode y cualquier agente que trabaje en el
repositorio.

Incluye en `AGENTS.md`:

-   Objetivo y alcance del Laboratorio GCam.
-   Stack permitido y prohibición de agregar otras dependencias sin
    autorización.
-   Arquitectura y estructura de carpetas.
-   Convenciones de nombres para componentes, hooks, stores, servicios y
    archivos.
-   Reglas para componentes pequeños y reutilizables.
-   Reglas para formularios y validaciones implementadas manualmente por
    componente.
-   Reglas de acceso a Supabase: las consultas deben centralizarse en
    servicios/repositorios, no dispersarse por las vistas.
-   Reglas de seguridad, variables de entorno y RLS.
-   Reglas para el árbol jerárquico: profundidad ilimitada, `parent_id`,
    orden, rutas y prevención de ciclos.
-   Reglas para conservar el valor predeterminado y el historial de
    cambios.
-   Reglas para no inventar parámetros ni valores reales de GCam.
-   Regla expresa: no almacenar fotografías ni videos.
-   Flujo de trabajo por etapas y comprobaciones requeridas.
-   Uso de Engram MCP para memoria técnica y continuidad.
-   Criterios para considerar terminada una etapa.

Crea también, según resulte útil:

-   `README.md`: instalación, configuración y ejecución local.
-   `docs/ARCHITECTURE.md`: arquitectura general.
-   `docs/DATABASE.md`: modelo de datos y relaciones.
-   `docs/ROADMAP.md`: etapas y estado.
-   `docs/DECISIONS.md`: decisiones técnicas relevantes.
-   `.env.example`: variables necesarias, sin secretos reales.

No dupliques documentación innecesariamente. Mantén los documentos
breves, precisos y actualizados.

**Criterio de aceptación:** `AGENTS.md` existe en la raíz y contiene
instrucciones suficientes para que una nueva sesión de OpenCode pueda
continuar sin reconstruir el contexto desde cero.

# ETAPA 2 --- Arquitectura y estructura del frontend

Diseña una estructura modular. Adáptala al proyecto existente, pero
considera una organización equivalente a:

``` text
src/
  app/
    router/
    providers/
  components/
    common/
    layout/
    feedback/
    forms/
    tree/
  features/
    cameras/
    versions/
    hierarchy/
    parameters/
    configurations/
    experiments/
    history/
    assistant/
  hooks/
  lib/
    supabase/
    axios/
    constants/
    helpers/
  services/
  stores/
  styles/
  pages/
```

Responsabilidades:

-   `app`: arranque, rutas y composición global.
-   `components`: componentes reutilizables sin lógica de negocio
    específica.
-   `features`: vistas y lógica por módulo.
-   `services`: acceso a API y operaciones de datos.
-   `stores`: estado global realmente compartido mediante Zustand.
-   `lib`: configuración de Supabase, Axios y utilidades pequeñas.
-   `pages`: páginas asociadas a las rutas, si el diseño del proyecto lo
    requiere.

Implementa un diseño profesional, moderno y responsive:

-   Navegación clara.
-   Menú lateral en escritorio y navegación adaptada a móvil.
-   Encabezados con contexto y acciones principales.
-   Estados de carga, vacío, error y confirmación.
-   Tema visual consistente y contraste adecuado.
-   Componentes propios para botones, campos, tarjetas, tablas, badges,
    menús, diálogos y notificaciones.
-   Accesibilidad básica: etiquetas, foco visible, navegación por
    teclado y nombres accesibles.

No conviertas el panel en una pantalla saturada de tarjetas. Prioriza
jerarquía visual, lectura y rapidez de uso.

**Criterio de aceptación:** la navegación y el sistema visual funcionan
en escritorio y móvil; no hay errores de consola ni dependencias nuevas
no autorizadas.

# ETAPA 3 --- Diseño de datos y Supabase

Diseña primero el modelo relacional y documenta las relaciones antes de
crear las tablas.

## Entidades principales propuestas

### `cameras`

Representa una familia o modificación de GCam.

Campos orientativos:

-   `id` UUID, clave primaria.
-   `name`: nombre visible, por ejemplo LMC, AGC o BSG.
-   `slug`: identificador único.
-   `description`: descripción opcional.
-   `developer`: desarrollador o responsable, si se conoce.
-   `website_url`: enlace opcional.
-   `is_active`: estado.
-   `created_at`, `updated_at`.

### `camera_versions`

Versiones pertenecientes a una cámara.

-   `id` UUID.
-   `camera_id` FK.
-   `version`: versión visible.
-   `release_label`: etiqueta opcional.
-   `notes`: notas.
-   `is_default`: indica versión seleccionada por defecto en la
    interfaz, no un valor de parámetro.
-   `created_at`, `updated_at`.

La combinación cámara + versión debe tener una regla de unicidad
adecuada.

### `parameter_nodes`

Contiene el árbol jerárquico ilimitado de cada versión.

-   `id` UUID.
-   `camera_version_id` FK.
-   `parent_id` UUID nullable, autorreferencia a `parameter_nodes.id`.
-   `name`.
-   `description`.
-   `node_type`: por ejemplo `category`, `group` o `subgroup`; permitir
    evolución sin limitar la profundidad.
-   `sort_order`: orden entre hermanos.
-   `created_at`, `updated_at`.

El nodo raíz tendrá `parent_id = NULL`. Cada nodo debe pertenecer a una
versión concreta. No mezclar árboles entre versiones.

### `parameters`

Define cada parámetro que aparece dentro del árbol.

-   `id` UUID.
-   `node_id` FK al nodo donde se ubica.
-   `key`: identificador técnico, si se conoce.
-   `name`: nombre visible.
-   `description`.
-   `data_type`: `integer`, `decimal`, `boolean`, `string`, `enum` o
    `json`, según los tipos realmente necesarios.
-   `unit`: unidad opcional.
-   `default_value`: valor predeterminado documentado.
-   `default_value_source`: procedencia del valor, por ejemplo
    documentación, XML original, observación o desconocida.
-   `default_value_confidence`: nivel de certeza opcional.
-   `allowed_values`: opciones permitidas para parámetros enumerados, si
    aplica.
-   `sort_order`.
-   `is_active`.
-   `created_at`, `updated_at`.

El valor debe almacenarse de forma tipada y consistente. No conviertas
todos los valores en números: existen booleanos, cadenas y listas.

No inventes valores por defecto. Permite indicar que el valor
predeterminado es desconocido o no verificado.

### `configurations`

Perfiles o conjuntos de valores que el usuario guarda para una versión
de cámara.

-   `id` UUID.
-   `camera_version_id` FK.
-   `name`.
-   `description`.
-   `is_default`.
-   `created_at`, `updated_at`.

### `configuration_values`

Valor de cada parámetro dentro de una configuración.

-   `id` UUID.
-   `configuration_id` FK.
-   `parameter_id` FK.
-   `value`: valor tipado o JSONB con validación coherente.
-   `notes`: observación opcional.
-   `updated_at`.

Debe existir una restricción única por configuración y parámetro. La
configuración no debe modificar el valor predeterminado del catálogo.

### `experiments`

Registro de cada prueba.

-   `id` UUID.
-   `configuration_id` FK.
-   `title`.
-   `objective`: qué se quiere comprobar.
-   `hypothesis`: resultado esperado.
-   `status`: `planned`, `in_progress`, `completed`, `failed` o
    `inconclusive`.
-   `observations`: texto.
-   `conclusion`: texto.
-   `created_at`, `updated_at`, `completed_at`.

### `parameter_changes`

Historial de modificaciones hechas durante un experimento.

-   `id` UUID.
-   `experiment_id` FK.
-   `parameter_id` FK.
-   `previous_value`.
-   `new_value`.
-   `reason`: motivo del cambio.
-   `observation`: observación del usuario.
-   `created_at`.

Cada modificación debe conservar los valores anterior y nuevo. No
sobrescribir el historial.

### `ai_recommendations`

Registro opcional de recomendaciones generadas o aceptadas.

-   `id` UUID.
-   `camera_version_id` FK.
-   `configuration_id` FK nullable.
-   `experiment_id` FK nullable.
-   `title`.
-   `reasoning_summary`: explicación breve.
-   `suggested_changes`: JSONB estructurado.
-   `status`: `proposed`, `accepted`, `rejected` o `tested`.
-   `created_at`, `updated_at`.

Las recomendaciones deben poder consultarse sin convertirse
automáticamente en cambios reales.

## Consideraciones del esquema

-   Usa UUID, claves foráneas, índices y restricciones adecuadas.
-   Define políticas claras para borrado: evita eliminar en cascada
    datos históricos que deban conservarse.
-   Considera `created_at` y `updated_at` donde corresponda.
-   Evita duplicar datos que puedan derivarse de relaciones.
-   Documenta qué entidades pertenecen al usuario y cuáles son
    catálogos.
-   Si se decide permitir múltiples usuarios, incluye `user_id` y
    políticas de aislamiento desde el inicio.
-   Para el primer despliegue puede ser una aplicación privada de un
    usuario, pero no confíes en ocultar botones como mecanismo de
    seguridad.

## Seguridad y acceso

-   Configura Supabase Auth para acceso privado.
-   Activa RLS en todas las tablas expuestas al cliente.
-   Define políticas que permitan al usuario autenticado acceder
    únicamente a sus registros, salvo catálogos públicos explícitamente
    diseñados como tales.
-   No uses `service_role` en frontend.
-   Usa la clave publicable/anon correspondiente y RLS.
-   No expongas datos privados mediante endpoints sin autenticación.
-   No crees buckets de almacenamiento de fotos.

Crea migraciones SQL versionadas en el repositorio, si el flujo
disponible de Supabase lo permite. Documenta cómo aplicar cada
migración. No dependas de cambios manuales invisibles en el dashboard.

**Criterio de aceptación:** esquema documentado, relaciones correctas,
migraciones reproducibles y RLS probado con usuario autenticado y no
autenticado.

# ETAPA 4 --- Conexión y capa de datos

1.  Configura `@supabase/supabase-js` en un único módulo.
2.  Configura Axios en una instancia centralizada con `baseURL`, timeout
    y manejo común de errores.
3.  Define servicios/repositorios por dominio: cámaras, versiones,
    nodos, parámetros, configuraciones y experimentos.
4.  Las vistas no deben contener consultas SQL ni lógica de persistencia
    dispersa.
5.  Centraliza la transformación de errores y respuestas.
6.  Implementa estados de carga, vacío, error y reintento.
7.  No guardes secretos en Zustand ni en el almacenamiento local del
    navegador.
8.  Usa Zustand únicamente para estado global de interfaz, por ejemplo
    cámara seleccionada, versión seleccionada, preferencias de
    navegación o filtros compartidos. La base de datos es la fuente de
    verdad de los datos persistentes.
9.  Evita duplicar en Zustand registros que ya se consultan desde
    Supabase sin una necesidad real.
10. Documenta el contrato de cada servicio.

**Criterio de aceptación:** una operación CRUD básica funciona de
extremo a extremo y los errores se muestran de forma entendible.

# ETAPA 5 --- Catálogo principal de cámaras

Crear la primera vista de la aplicación: **Mis cámaras GCam**.

Funciones:

-   Listar cámaras registradas.
-   Crear cámara.
-   Editar cámara.
-   Activar/desactivar cámara.
-   Consultar detalle.
-   Eliminar únicamente cuando sea seguro y no existan dependencias
    históricas; de lo contrario, permitir archivarla.
-   Buscar y filtrar cámaras.
-   Mostrar cantidad de versiones y, si es viable, cantidad de
    parámetros registrados.
-   Mostrar estados vacíos con una acción clara para crear la primera
    cámara.

La interfaz debe permitir registrar LMC, AGC, BSG u otras cámaras sin
codificar sus nombres en la lógica. Son registros de datos, no opciones
fijas.

Formulario de cámara:

-   Nombre.
-   Identificador/slug.
-   Descripción.
-   Desarrollador, opcional.
-   Enlace, opcional.
-   Estado.

Validar campos obligatorios mediante funciones de validación propias del
componente o del dominio. Mostrar mensajes junto al campo
correspondiente.

**Criterio de aceptación:** CRUD de cámaras completo, con persistencia
real y experiencia responsive.

# ETAPA 6 --- Versiones de cada cámara

Al ingresar a una cámara, mostrar sus versiones.

Funciones:

-   Crear versión.
-   Editar versión.
-   Seleccionar versión activa.
-   Consultar detalles.
-   Archivar versión si ya tiene datos asociados.
-   Evitar duplicados de versión dentro de la misma cámara.
-   Mostrar si la versión tiene estructura de parámetros creada.

No copies automáticamente parámetros de una versión a otra. Ofrece una
acción explícita para duplicar estructura, indicando que se trata de una
copia y permitiendo revisar antes de guardar.

**Criterio de aceptación:** una cámara puede tener varias versiones y
cada versión mantiene su árbol y datos separados.

# ETAPA 7 --- Constructor de jerarquía ilimitada

Esta es la funcionalidad más importante del proyecto. Dedica especial
atención a su diseño y pruebas.

Al ingresar a una versión, mostrar un constructor de estructura
jerárquica.

Ejemplo ilustrativo:

``` text
LMC 8.4
└── Configuración de cámara
    ├── HDR+
    │   ├── Procesamiento
    │   │   ├── Frames
    │   │   │   ├── Max Frames
    │   │   │   └── Min Frames
    │   │   └── Reducción de ruido
    │   └── Otros ajustes
    ├── Lib Patcher
    └── Ajustes adicionales
```

Los nombres anteriores son ejemplos de organización; no representan una
lista oficial ni exhaustiva de parámetros.

## Funciones obligatorias

-   Crear nodo raíz.
-   Crear nodo hijo en cualquier nivel.
-   Editar nombre y descripción.
-   Eliminar nodo, con advertencia sobre parámetros y descendientes.
-   Mover nodo a otro padre.
-   Reordenar hermanos.
-   Expandir y contraer ramas.
-   Buscar nodos por nombre.
-   Mostrar ruta completa o breadcrumbs.
-   Mostrar cantidad de descendientes y parámetros, si resulta útil.
-   Permitir profundidad ilimitada.
-   Recordar el nodo seleccionado al navegar por el módulo.
-   Mostrar un panel de detalle del nodo seleccionado.

Usa dnd-kit para arrastrar y soltar. La operación debe actualizar
correctamente `parent_id` y `sort_order`.

## Reglas de integridad

-   Un nodo no puede ser su propio padre.
-   Un nodo no puede moverse dentro de uno de sus descendientes.
-   No permitir ciclos.
-   No permitir mover nodos entre versiones distintas.
-   Mantener un orden estable.
-   Confirmar operaciones destructivas.
-   Si se mueve un nodo, todos sus descendientes deben conservarse.
-   La ruta se calcula desde las relaciones; no guardes rutas duplicadas
    como fuente de verdad.
-   Manejar árboles grandes sin bloquear innecesariamente la interfaz.

La profundidad no debe depender de un número fijo de componentes
anidados. Implementa el árbol recursivamente o con un algoritmo
equivalente que soporte niveles arbitrarios.

**Criterio de aceptación:** crear al menos seis niveles, mover ramas
completas, reordenar nodos, recargar la página y comprobar que el árbol
conserva exactamente su estructura. Probar prevención de ciclos y
movimientos entre versiones.

# ETAPA 8 --- Catálogo y ficha de parámetros

Dentro de cualquier nodo, permitir registrar parámetros.

Campos de un parámetro:

-   Nombre visible.
-   Clave técnica, si se conoce.
-   Descripción.
-   Tipo de dato.
-   Valor predeterminado.
-   Fuente del valor predeterminado.
-   Nivel de certeza del valor predeterminado, si se utiliza.
-   Unidad, opcional.
-   Valores permitidos, si es enum.
-   Orden de visualización.
-   Estado activo/inactivo.

Tipos mínimos:

-   Entero.
-   Decimal.
-   Booleano.
-   Texto.
-   Enumeración/lista de opciones.
-   JSON, solo si existe un caso de uso justificado.

La interfaz debe representar cada tipo correctamente. No conviertas
booleanos en cadenas ni decimales en enteros.

La ficha de parámetro debe mostrar:

1.  Nombre.
2.  Ruta jerárquica completa.
3.  Cámara y versión.
4.  Tipo de dato.
5.  Valor predeterminado.
6.  Procedencia y certeza del valor predeterminado.
7.  Valor actual en la configuración seleccionada.
8.  Historial de modificaciones.
9.  Observaciones.

El valor predeterminado es documentación de referencia. No debe
modificarse cuando el usuario cambie el valor de una configuración.

Permite duplicar un parámetro únicamente con confirmación y control de
claves duplicadas cuando corresponda.

**Criterio de aceptación:** CRUD de parámetros funcional, tipos
correctamente representados y separación comprobable entre valor
predeterminado y valor de configuración.

# ETAPA 9 --- Perfiles de configuración

Una versión de cámara puede tener varias configuraciones o perfiles.

Funciones:

-   Crear perfil.
-   Editar nombre y descripción.
-   Duplicar perfil.
-   Seleccionar perfil activo.
-   Archivar perfil.
-   Consultar valores de parámetros.
-   Mostrar valores actuales y valores predeterminados lado a lado.
-   Buscar parámetros dentro de la configuración.
-   Filtrar por categoría, tipo o estado de modificación.
-   Restaurar el valor predeterminado para un parámetro mediante una
    acción explícita.
-   Restaurar una configuración a una versión anterior mediante un
    procedimiento que conserve el historial.

Al crear un perfil, define claramente qué ocurre con los parámetros aún
no configurados. No inventes valores: pueden mostrarse como "sin valor
personalizado" y utilizar el valor predeterminado solo cuando la lógica
de aplicación lo indique explícitamente.

**Criterio de aceptación:** varios perfiles independientes por versión y
comparación clara entre valores predeterminados y personalizados.

# ETAPA 10 --- Laboratorio de experimentos e historial

El laboratorio permite documentar las pruebas que el usuario realiza
manualmente en su teléfono.

Cada experimento tendrá:

-   Título.
-   Cámara y versión.
-   Configuración utilizada.
-   Objetivo.
-   Hipótesis.
-   Estado.
-   Fecha de inicio y finalización.
-   Observaciones.
-   Conclusión.

Cada cambio de parámetro guardará:

-   Parámetro afectado.
-   Ruta jerárquica del parámetro en el momento de la prueba.
-   Valor anterior.
-   Valor nuevo.
-   Motivo del cambio.
-   Observación.
-   Fecha.

La ruta histórica debe poder reconstruirse aunque después se cambie el
nombre de un nodo. Considera guardar una instantánea de la ruta o de los
nombres jerárquicos en el registro histórico.

Estados del experimento:

-   Planificado.
-   En curso.
-   Completado.
-   Fallido.
-   No concluyente.

Funciones:

-   Crear experimento.
-   Añadir varios cambios.
-   Editar observaciones y conclusión.
-   Marcar resultado.
-   Consultar cronología.
-   Comparar experimentos.
-   Duplicar un experimento como base de uno nuevo.
-   Consultar qué parámetros se modificaron con mayor frecuencia.

No permitir que editar un experimento antiguo altere silenciosamente el
estado actual de una configuración. Define y documenta cuándo un cambio
se aplica al perfil y cuándo solo se registra como observación
histórica.

No crear campos ni componentes para fotografías.

**Criterio de aceptación:** historial inmutable de cambios o con
correcciones explícitas auditables; comparación de pruebas y
trazabilidad de cada valor.

# ETAPA 11 --- API segura para OpenCode

Diseña una API documentada que permita a herramientas externas consultar
el catálogo y los experimentos.

La API debe tener endpoints equivalentes a:

``` text
GET    /api/cameras
GET    /api/cameras/:cameraId
GET    /api/cameras/:cameraId/versions
GET    /api/versions/:versionId/tree
GET    /api/versions/:versionId/parameters
GET    /api/parameters/:parameterId
GET    /api/configurations/:configurationId
GET    /api/configurations/:configurationId/changes
GET    /api/experiments
GET    /api/experiments/:experimentId
POST   /api/experiments
POST   /api/experiments/:experimentId/changes
POST   /api/ai/recommendations
```

Adapta las rutas al framework disponible en el proyecto. Si Vercel
Functions es la opción elegida, implementa funciones compatibles con
Vercel y evita introducir un servidor permanente que no sea necesario.

La API debe:

-   Validar autenticación.
-   Verificar autorización en cada operación.
-   Validar IDs y tipos de datos.
-   Limitar resultados y ofrecer paginación.
-   Filtrar por cámara, versión, perfil y estado.
-   Responder con JSON consistente.
-   Devolver códigos HTTP correctos.
-   Evitar consultas sin límites.
-   No confiar en que OpenCode enviará datos válidos.
-   No exponer secretos.
-   No permitir modificaciones destructivas sin autorización.
-   Registrar las recomendaciones y cambios relevantes.

Documenta los endpoints, parámetros, respuestas y errores en
`docs/API.md`.

Si el frontend se conecta directamente a Supabase, la API externa para
OpenCode debe seguir siendo una capa controlada y segura. No publiques
credenciales privilegiadas para simplificar la integración.

**Criterio de aceptación:** OpenCode puede consultar información
autenticada y no puede leer ni modificar datos fuera de los permisos
autorizados.

# ETAPA 12 --- Integración con OpenCode y MCP

MCP no es requisito para que la aplicación funcione. Primero deja
estable la API REST. Después evalúa el servidor MCP como una interfaz de
herramientas para OpenCode.

## Herramientas que debería ofrecer la integración

Lectura:

-   `list_cameras`: listar cámaras.
-   `list_camera_versions`: consultar versiones.
-   `get_parameter_tree`: obtener el árbol completo de una versión.
-   `find_parameter`: buscar por nombre, clave o ruta.
-   `get_parameter_details`: consultar ficha y valor predeterminado.
-   `get_configuration`: consultar perfil y valores actuales.
-   `get_parameter_history`: consultar modificaciones.
-   `list_experiments`: consultar experimentos.
-   `compare_experiments`: comparar cambios y resultados.

Escritura controlada:

-   `create_experiment`: crear un experimento.
-   `propose_parameter_changes`: proponer cambios sin aplicarlos.
-   `save_recommendation`: guardar una recomendación.
-   `record_experiment_result`: registrar observaciones y conclusión.

No des a la IA permiso ilimitado para modificar el catálogo. Las
herramientas de escritura deben tener validaciones, permisos y
confirmación explícita cuando impliquen cambios en configuraciones.

## Comportamiento esperado de la IA

La IA debe poder responder preguntas como:

-   ¿Dónde se encuentra el parámetro X?
-   ¿Cuál es su valor predeterminado y cuál estoy usando?
-   ¿Qué parámetros he cambiado en mis últimos experimentos?
-   ¿Qué ocurrió cuando aumenté determinado valor?
-   Compara mis últimos tres experimentos.
-   Quiero investigar cómo reducir el ruido nocturno. ¿Qué parámetros
    registrados podrían ser relevantes?
-   Propón un experimento pequeño y explícame qué observar.

La IA debe:

1.  Consultar los datos reales de la aplicación antes de recomendar.
2.  Identificar cámara y versión exactas.
3.  Citar la ruta jerárquica de cada parámetro recomendado.
4.  Mostrar valor predeterminado, valor actual y valor propuesto cuando
    estén disponibles.
5.  Explicar por qué propone el cambio.
6.  Indicar incertidumbre y no presentar hipótesis como hechos.
7.  Recomendar cambiar pocos parámetros por experimento para poder
    atribuir resultados.
8.  No inventar nombres, rutas, rangos ni valores admitidos.
9.  No asumir que un parámetro tiene el mismo efecto en diferentes
    cámaras o versiones.
10. No aplicar automáticamente recomendaciones.
11. Permitir que el usuario acepte, rechace o edite una propuesta.
12. Registrar el experimento y el resultado solo cuando el usuario lo
    solicite.

Si no existen datos suficientes, debe decirlo y pedir que se documente
el parámetro o la prueba.

## Engram MCP

Engram es una herramienta de memoria para el proceso de desarrollo de
OpenCode, no debe confundirse con el MCP que se construirá para
consultar el catálogo GCam.

-   Usa Engram para recordar decisiones de arquitectura, convenciones,
    etapas completadas, problemas pendientes y contexto de
    implementación.
-   Inspecciona las herramientas reales disponibles de Engram y sigue
    sus esquemas.
-   No inventes comandos o nombres de herramientas.
-   No guardes secretos, claves, tokens ni información sensible.
-   Al terminar cada etapa, registra un resumen útil para continuar en
    otra sesión.
-   Mantén `AGENTS.md` y los documentos del proyecto como fuente de
    verdad compartida; Engram es apoyo de continuidad, no reemplazo de
    la documentación.

**Criterio de aceptación:** OpenCode consulta la API y produce
respuestas fundamentadas en registros reales. La escritura queda
limitada y requiere autorización.

# ETAPA 13 --- Importación y exportación de datos

Implementa esta etapa después de estabilizar el modelo de parámetros y
perfiles.

Primero crea formatos propios de respaldo en JSON para:

-   Cámara y versiones.
-   Árbol jerárquico.
-   Definiciones de parámetros.
-   Configuraciones y valores.
-   Experimentos e historial, cuando sea apropiado.

Requisitos:

-   Exportar una versión o cámara completa.
-   Exportar un perfil individual.
-   Importar un respaldo validado.
-   Mostrar resumen y errores antes de confirmar importación.
-   Detectar duplicados.
-   No sobrescribir información existente sin confirmación.
-   Mantener relaciones entre nodos, parámetros y configuraciones.
-   Incluir versión del esquema del archivo exportado.

La compatibilidad directa con XML de LMC, AGC o BSG debe tratarse como
una integración específica por formato y versión. No asumir que todas
las cámaras usan el mismo XML ni prometer importación universal. Antes
de implementarla, inspecciona archivos XML reales proporcionados por el
usuario y documenta qué estructuras se reconocen.

No almacenes fotos.

**Criterio de aceptación:** exportar, borrar una copia de prueba e
importar el archivo sin perder relaciones ni valores.

# ETAPA 14 --- Pruebas, seguridad y calidad

Realiza una revisión integral.

## Pruebas funcionales

-   Crear, editar y archivar cámaras.
-   Crear versiones.
-   Crear árboles de varios niveles.
-   Crear nodos y mover ramas.
-   Prevenir ciclos.
-   Reordenar hermanos.
-   Crear parámetros de distintos tipos.
-   Distinguir valor predeterminado y valor actual.
-   Crear perfiles independientes.
-   Registrar experimentos y cambios.
-   Consultar historial.
-   Exportar e importar JSON.
-   Consultar API con permisos correctos.

## Pruebas de seguridad

-   Usuario no autenticado.
-   Usuario autenticado sin permisos.
-   Acceso a registros ajenos.
-   IDs inválidos.
-   Datos con tipos incorrectos.
-   Operaciones destructivas.
-   Exposición de variables de entorno.
-   Reglas RLS.
-   Intentos de saltarse validaciones del frontend.

## Pruebas de interfaz

-   Escritorio.
-   Tablet.
-   Móvil.
-   Árbol extenso.
-   Estados vacíos.
-   Errores de red.
-   Carga lenta.
-   Formularios con datos inválidos.
-   Accesibilidad básica.

No afirmes que una prueba pasó si no se ejecutó.

# ETAPA 15 --- Despliegue en Vercel y entrega

1.  Revisa variables de entorno de producción.
2.  Comprueba que no haya secretos en Git.
3.  Ejecuta build de producción.
4.  Configura Vercel para el proyecto Vite.
5.  Configura las rutas SPA para que las rutas internas no devuelvan 404
    al recargar.
6.  Configura Supabase Auth y las URLs permitidas para el dominio de
    producción.
7.  Verifica RLS desde la aplicación desplegada.
8.  Verifica API y CORS si corresponde.
9.  Comprueba que la aplicación funcione desde otro dispositivo.
10. Documenta despliegue, restauración y respaldo de datos.
11. Revisa los límites de los planes gratuitos y evita afirmar que el
    servicio será gratuito de forma ilimitada.

------------------------------------------------------------------------

## 4. Requisitos de experiencia de usuario

La navegación principal debe ser sencilla:

``` text
Inicio
└── Mis cámaras
    └── Cámara seleccionada
        └── Versión seleccionada
            ├── Estructura de parámetros
            ├── Configuraciones
            ├── Experimentos
            ├── Historial
            └── Asistente IA
```

### Vista 1: Mis cámaras

-   Mostrar cámaras como LMC, AGC, BSG y las que el usuario cree.
-   Acción visible para crear una cámara.
-   Buscar y filtrar.
-   Entrar al detalle de una cámara.

### Vista 2: Cámara y versiones

-   Información de la cámara.
-   Listado de versiones.
-   Acción para crear una versión.
-   Acceso a la versión seleccionada.

### Vista 3: Estructura de parámetros

-   Árbol jerárquico en un panel.
-   Detalle del nodo o parámetro seleccionado.
-   Acciones para crear, editar, mover y ordenar.
-   Breadcrumbs con la ruta exacta.
-   Búsqueda de parámetros.
-   Acceso a la ficha del parámetro.

### Vista 4: Configuraciones

-   Listado de perfiles.
-   Crear y duplicar.
-   Consultar parámetros y valores.
-   Comparar con valores predeterminados.
-   Buscar y filtrar.

### Vista 5: Experimentos

-   Listado y estados.
-   Crear experimento.
-   Añadir cambios de parámetros.
-   Documentar resultados.
-   Comparar pruebas.

### Vista 6: Asistente IA

-   Consultar parámetros y rutas.
-   Consultar historial.
-   Solicitar propuestas de experimentos.
-   Revisar, aceptar o rechazar recomendaciones.
-   No aplicar cambios sin autorización.

------------------------------------------------------------------------

## 5. Reglas de negocio que no deben romperse

1.  Cada cámara tiene sus propias versiones.
2.  Cada versión tiene su propio árbol jerárquico.
3.  Los niveles son ilimitados.
4.  Un parámetro pertenece a un nodo específico.
5.  Un parámetro tiene una definición y puede tener valores diferentes
    en distintos perfiles.
6.  El valor predeterminado no se sobrescribe al modificar un perfil.
7.  Cada cambio relevante conserva valor anterior, valor nuevo, motivo y
    fecha.
8.  Los experimentos no deben alterar silenciosamente el historial.
9.  Las recomendaciones de IA son propuestas, no cambios aplicados.
10. Las rutas jerárquicas deben ser comprensibles para personas y
    herramientas.
11. No se deben inventar parámetros ni valores reales de las cámaras.
12. No se almacenan fotografías ni videos.
13. No se agregan dependencias sin autorización.
14. Los datos privados siempre deben estar protegidos por autenticación
    y RLS.
15. La interfaz nunca debe ser la única capa de validación o seguridad.

------------------------------------------------------------------------

## 6. Orden de ejecución recomendado

OpenCode debe ejecutar este orden y detenerse al final de cada etapa
para informar y verificar:

    Orden Etapa                       Resultado
  ------- --------------------------- --------------------------------------
        0 Auditoría                   Conocer el proyecto existente
        1 AGENTS.md y documentación   Reglas permanentes del proyecto
        2 Arquitectura frontend       Estructura y diseño base
        3 Modelo de datos             Esquema y seguridad Supabase
        4 Capa de datos               Conexión y servicios
        5 Catálogo de cámaras         CRUD de cámaras
        6 Versiones                   CRUD de versiones
        7 Jerarquía                   Árbol ilimitado
        8 Parámetros                  Catálogo y fichas
        9 Configuraciones             Perfiles y valores
       10 Experimentos                Pruebas e historial
       11 API                         Acceso externo seguro
       12 OpenCode/MCP                Asistente conectado a datos
       13 Importar/exportar           Respaldo JSON y formatos compatibles
       14 Calidad                     Pruebas funcionales y de seguridad
       15 Despliegue                  Publicación en Vercel

## 7. Primera instrucción que debes ejecutar ahora

**No construyas todavía toda la aplicación.** Comienza únicamente por la
ETAPA 0 y la ETAPA 1:

1.  Audita el proyecto existente.
2.  Comprueba las dependencias instaladas.
3.  Crea `AGENTS.md` en la raíz.
4.  Crea o actualiza `README.md` y los documentos base necesarios.
5.  Registra en Engram las decisiones iniciales y el estado del
    proyecto, usando las herramientas disponibles.
6.  Presenta el diagnóstico y el plan de la ETAPA 2.
7.  Detente y espera mi autorización antes de comenzar la ETAPA 2.

A partir de ahí, continúa etapa por etapa, solicitando autorización al
terminar cada una. No omitas verificaciones ni avances dejando errores
importantes pendientes.
