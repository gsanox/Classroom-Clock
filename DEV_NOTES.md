# Notas de Desarrollo - Classroom Clock

Este archivo contiene notas técnicas para facilitar futuras actualizaciones y mantenimiento de la aplicación.

## Arquitectura del Código (`script.js`)

El script está autocontenido y se ejecuta al cargar el DOM. La lógica principal se puede dividir en varios componentes clave:

### 1. Estado Principal

Las fuentes de verdad de la aplicación son el array `classBlocks` y la variable booleana `isPaused`.

```javascript
let classBlocks = [
    { name: 'Nombre del Bloque', duration: 25, color: '#7A4AE2' },
    // ... otros bloques
];
let isPaused = false;
```

Casi todas las funciones leen de este array para construir la UI (barra de progreso, modal) o para controlar el temporizador.

### 2. Ciclo de Vida de la Aplicación

- **`init()`**: Se ejecuta una sola vez al cargar la página. Su única responsabilidad es configurar todos los `event listeners` (para el modal, botones de perfil, etc.) y realizar la primera llamada a `restartApplication()`.
- **`restartApplication()`**: Es la función que (re)inicia el temporizador. Limpia cualquier intervalo anterior, resetea los índices, crea la barra de progreso y comienza el primer bloque. Se llama desde `init()` y también desde `saveSettingsAndRestart()`.
- **Separar `init` de `restart` es CRUCIAL** para evitar la duplicación de `event listeners` cada vez que se guardan los ajustes.

### 3. Lógica del Temporizador

- Un `setInterval` (`timerInterval`) llama a la función `tick()` cada segundo.
- `tick()` reduce el contador `timeRemainingInSeconds`.
- Cuando el contador llega a 0, se llama a `startNextBlock()` para pasar a la siguiente sección.
- **`togglePause()`**: Cambia el estado de `isPaused` y, correspondientemente, limpia o reinicia el `setInterval` del temporizador. También actualiza el icono del botón.
- `jumpToBlock(index)` permite la navegación manual a través de la barra de progreso. Limpia y reinicia el `setInterval` para evitar conflictos.

### 4. Lógica del Modal y Personalización

- **`populateModal()`**: Lee el array `classBlocks` y construye dinámicamente las filas de edición en el modal.
- **`saveSettingsAndRestart()`**: Es el punto central de la personalización. Lee todos los valores de los inputs del modal, construye un nuevo array `newBlocks`, lo valida, lo asigna a `classBlocks` y finalmente llama a `restartApplication()`.

### 5. Gestión de Perfiles

- **LocalStorage**: Usa `localStorage.setItem` y `getItem` con la clave `classroomClockProfile`. La data se guarda como un string JSON.
- **Archivos JSON**: 
  - **Exportar**: Construye un `Blob` de tipo `application/json` y crea un enlace `<a>` temporal para iniciar la descarga.
  - **Importar**: Usa la API `FileReader` para leer el archivo de texto. El resultado se parsea con `JSON.parse()` dentro de un bloque `try...catch` para manejar errores de formato.

### 6. Lógica de Audio
- **Web Audio API:** Se utiliza para generar tonos sin necesidad de archivos de audio externos.
- **`initAudio()`**: La creación del `AudioContext` está encapsulada en esta función. Se llama tras la primera interacción del usuario (clic en pausa, mute, etc.) para cumplir con las políticas de autoplay de los navegadores.
- **`playTone()`**: Función de utilidad que genera un tono con una frecuencia, duración y forma de onda específicas. Incluye un suave *fade out* para que los sonidos no sean abruptos.
- **`isMuted`**: Una variable de estado booleana que controla si los sonidos deben reproducirse. Se gestiona con el botón 🔊/🔇.
- **Triggers en `tick()`**: La función `tick()` comprueba el tiempo restante para disparar un tono de aviso en los últimos 3 segundos y un tono de finalización cuando el tiempo llega a cero.

## Posibles Mejoras Futuras

### Mejoras Visuales y de Tema
- **Modo Claro/Oscuro:** Añadir un interruptor para un tema claro, además del oscuro actual.
- **Paletas de Colores Predefinidas:** Ofrecer conjuntos de colores predefinidos para los bloques en el modal de ajustes.
- **Modo Minimalista/Zen:** Un botón para ocultar todo excepto el título del bloque y el temporizador.

### Mejoras de Funcionalidad y Gestión
- **Modo "Tiempo Extra":** Al finalizar el último bloque, empezar a contar hacia arriba para controlar el tiempo extra.
- **Ajuste Rápido de Tiempo:** Botones de `+1/-1` junto al temporizador para modificar el tiempo del bloque actual al instante.
- **Plantillas Predefinidas:** Incluir configuraciones de fábrica (ej. "Pomodoro", "Clase 50 min") además de los perfiles de usuario.

### Mejoras Avanzadas
- **Compartir por URL:** Generar un enlace que contenga la configuración de la sesión para compartirla fácilmente.
- **PWA (Progressive Web App):** Añadir un Service Worker y un manifiesto para que la app sea instalable y funcione offline.
- **Internacionalización (i18n):** Abstraer todos los strings de texto a un objeto para facilitar la traducción a otros idiomas.
