document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const blockTitleEl = document.getElementById('block-title');
    const timerDisplayEl = document.getElementById('timer-display');
    const progressBarEl = document.getElementById('progress-bar');
    const dateDayNameEl = document.getElementById('date-day-name');
    const dateDayNumberEl = document.getElementById('date-day-number');
    const dateMonthYearEl = document.getElementById('date-month-year');

    // --- ELEMENTOS DEL MODAL ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const modalCloseBtn = document.querySelector('.modal-close-btn');
    const blocksListEditor = document.getElementById('blocks-list-editor');
    const addBlockBtn = document.getElementById('add-block-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const loadProfileBtn = document.getElementById('load-profile-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonInput = document.getElementById('import-json-input');
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    const muteBtn = document.getElementById('mute-btn');

    // --- CONFIGURACIÓN DE BLOQUES ---
    let classBlocks = [
        { name: 'Revisión y objetivos', duration: 10, color: '#4A90E2' },
        { name: 'Teoría', duration: 25, color: '#7A4AE2' },
        { name: 'Ejemplos guiados', duration: 25, color: '#50E3C2' },
        { name: 'Ejercicio práctico', duration: 30, color: '#F5A623' },
        { name: 'Revisión y discusión', duration: 15, color: '#4A4AE2' },
        { name: 'Cierre', duration: 10, color: '#BD10E0' }
    ];

    let currentBlockIndex = 0;
    let timeRemainingInSeconds;
    let timerInterval;
    let isPaused = false;
    let audioCtx; // Contexto de Audio
    let isMuted = false;

    // --- LÓGICA DEL MODAL ---
    function populateModal() {
        blocksListEditor.innerHTML = ''; // Limpiar editor
        classBlocks.forEach((block, index) => {
            addBlockRowToEditor(block);
        });
    }

    function addBlockRowToEditor(block = { name: '', duration: 10, color: '#888888' }) {
        const row = document.createElement('div');
        row.classList.add('block-editor-row');
        row.setAttribute('draggable', 'true'); // Hacer la fila arrastrable
        // Usamos .trim() en el valor del color para evitar problemas de espacios en blanco
        row.innerHTML = `
            <input type="text" class="block-name-input" value="${block.name}" placeholder="Nombre de la sección">
            <input type="number" class="block-duration-input" value="${block.duration}" min="1" placeholder="Minutos">
            <input type="color" class="block-color-input" value="${block.color.trim()}">
            <button class="btn delete-block-btn" title="Eliminar bloque">🗑️</button>
        `;
        blocksListEditor.appendChild(row);
    }

    function handleModalClick(event) {
        // Delegación de eventos para el botón de eliminar
        if (event.target.classList.contains('delete-block-btn')) {
            event.target.closest('.block-editor-row').remove();
        }
    }

    // --- LÓGICA DE AUDIO ---
    function initAudio() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser");
            }
        }
    }

    function playTone(freq = 440, duration = 100, type = 'sine') {
        if (isMuted || !audioCtx) return;

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = type;
        oscillator.frequency.value = freq;

        // Fade out para un sonido más suave
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration / 1000);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + duration / 1000);
    }

    function toggleMute() {
        initAudio(); // El usuario interactúa, podemos iniciar el audio.
        isMuted = !isMuted;
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    }

    // --- LÓGICA DE DRAG AND DROP ---
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.block-editor-row:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function saveSettingsAndRestart() {
        const newBlocks = [];
        const editorRows = blocksListEditor.querySelectorAll('.block-editor-row');

        editorRows.forEach(row => {
            const name = row.querySelector('.block-name-input').value;
            const duration = parseInt(row.querySelector('.block-duration-input').value, 10);
            const color = row.querySelector('.block-color-input').value;

            if (name && duration > 0) {
                newBlocks.push({ name, duration, color });
            }
        });

        if (newBlocks.length > 0) {
            classBlocks = newBlocks;
            closeModal();
            restartApplication();
        } else {
            alert('No se puede guardar una configuración sin bloques. Añade al menos un bloque con nombre y duración positiva.');
        }
    }

    function openModal() {
        populateModal();
        settingsModal.style.display = 'block';
    }

    function closeModal() {
        settingsModal.style.display = 'none';
    }

    // --- LÓGICA DE PERFILES ---
    function getCurrentConfigFromModal() {
        const blocks = [];
        const editorRows = blocksListEditor.querySelectorAll('.block-editor-row');
        editorRows.forEach(row => {
            const name = row.querySelector('.block-name-input').value;
            const duration = parseInt(row.querySelector('.block-duration-input').value, 10);
            const color = row.querySelector('.block-color-input').value;
            if (name && duration > 0) {
                blocks.push({ name, duration, color });
            }
        });
        return blocks;
    }

    function saveProfileToLocalStorage() {
        const currentConfig = getCurrentConfigFromModal();
        if (currentConfig.length > 0) {
            localStorage.setItem('classroomClockProfile', JSON.stringify(currentConfig));
            alert('¡Perfil guardado en el navegador!');
        } else {
            alert('No hay una configuración válida para guardar.');
        }
    }

    function loadProfileFromLocalStorage() {
        const profile = localStorage.getItem('classroomClockProfile');
        if (profile) {
            try {
                const loadedBlocks = JSON.parse(profile);
                if (Array.isArray(loadedBlocks)) {
                    classBlocks = loadedBlocks;
                    populateModal();
                    alert('¡Perfil cargado desde el navegador!');
                } else {
                    throw new Error('El perfil no es un array.');
                }
            } catch (error) {
                alert('Error al cargar el perfil: El formato no es válido.');
                localStorage.removeItem('classroomClockProfile');
            }
        } else {
            alert('No se encontró ningún perfil guardado en el navegador.');
        }
    }

    function exportProfileToJson() {
        const currentConfig = getCurrentConfigFromModal();
        if (currentConfig.length === 0) {
            alert('No hay configuración para exportar.');
            return;
        }
        const jsonString = JSON.stringify(currentConfig, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'classroom-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importProfileFromJson(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const loadedBlocks = JSON.parse(e.target.result);
                // Validación simple
                if (Array.isArray(loadedBlocks) && loadedBlocks.every(b => b.name && b.duration && b.color)) {
                    classBlocks = loadedBlocks;
                    populateModal();
                    alert('¡Perfil importado con éxito!');
                } else {
                    throw new Error('Estructura de JSON no válida.');
                }
            } catch (error) {
                alert(`Error al leer el archivo: ${error.message}`);
            }
        };
        reader.readAsText(file);
        // Limpiar el input para permitir importar el mismo archivo de nuevo
        event.target.value = '';
    }

    function togglePause() {
        initAudio(); // El usuario interactúa, podemos iniciar el audio.
        isPaused = !isPaused;
        if (isPaused) {
            clearInterval(timerInterval);
            pauseResumeBtn.textContent = '▶️';
        } else {
            timerInterval = setInterval(tick, 1000);
            pauseResumeBtn.textContent = '⏸️';
        }
    }

    // --- FUNCIONES ---

    function updateDateCard() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const locale = 'es-ES';

        dateDayNameEl.textContent = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now).replace(/^W/, c => c.toUpperCase());
        dateDayNumberEl.textContent = now.getDate();
        dateMonthYearEl.textContent = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(now).replace(/^W/, c => c.toUpperCase());
    }

    function createProgressBar() {
        const totalDuration = classBlocks.reduce((acc, block) => acc + block.duration, 0);
        
        progressBarEl.innerHTML = ''; // Limpiar la barra

        classBlocks.forEach((block, index) => {
            const segment = document.createElement('div');
            segment.classList.add('progress-segment');
            segment.dataset.index = index;
            segment.style.width = `${(block.duration / totalDuration) * 100}%`;
            segment.style.backgroundColor = block.color;
            segment.setAttribute('title', `${block.name} (${block.duration} min)`);
            
            const fill = document.createElement('div');
            fill.classList.add('progress-fill');
            segment.appendChild(fill);

            progressBarEl.appendChild(segment);
        });
    }

    function startNextBlock() {
        if (currentBlockIndex >= classBlocks.length) {
            endSession();
            return;
        }

        // Actualizar la barra de progreso
        document.querySelectorAll('.progress-segment').forEach(segment => {
            segment.classList.remove('active');
        });
        // Limpiar todos los rellenos antes de activar el nuevo
        document.querySelectorAll('.progress-fill').forEach(fill => fill.style.width = '0%');

        // Activar el segmento actual
        const activeSegment = document.querySelector(`.progress-segment[data-index="${currentBlockIndex}"]`);
        if (activeSegment) {
            activeSegment.classList.add('active');
        }

        const currentBlock = classBlocks[currentBlockIndex];
        blockTitleEl.textContent = currentBlock.name;
        timeRemainingInSeconds = currentBlock.duration * 60;
        
        updateTimerDisplay();
        currentBlockIndex++;
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeRemainingInSeconds / 60);
        const seconds = timeRemainingInSeconds % 60;
        timerDisplayEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function tick() {
        if (timeRemainingInSeconds > 0) {
            timeRemainingInSeconds--;
            updateTimerDisplay();

            // Actualizar el relleno del progreso del bloque actual
            const currentBlock = classBlocks[currentBlockIndex - 1];
            if (currentBlock) {
                const totalSeconds = currentBlock.duration * 60;
                const elapsedSeconds = totalSeconds - timeRemainingInSeconds;
                const progressPercentage = (elapsedSeconds / totalSeconds) * 100;
                
                const activeSegment = document.querySelector('.progress-segment.active .progress-fill');
                if (activeSegment) {
                    activeSegment.style.width = `${progressPercentage}%`;
                }

                // Lógica de sonido de pre-aviso
                if (timeRemainingInSeconds < 3 && timeRemainingInSeconds >= 0) {
                    playTone(880, 50, 'square');
                }
            }

        } else {
            // Sonido de fin de bloque
            playTone(523, 150, 'sine');

            // Asegurarse de que el bloque anterior se muestre como 100% completo
            const lastActiveFill = document.querySelector('.progress-segment.active .progress-fill');
            if(lastActiveFill) lastActiveFill.style.width = '100%';

            startNextBlock();
        }
    }

    function jumpToBlock(blockIndex) {
        clearInterval(timerInterval);
        currentBlockIndex = blockIndex;
        startNextBlock();
        // Reiniciar el intervalo solo si la sesión no ha terminado
        if (currentBlockIndex <= classBlocks.length) {
            timerInterval = setInterval(tick, 1000);
        }
    }

    function handleProgressClick(event) {
        initAudio(); // El usuario interactúa, podemos iniciar el audio.
        const clickedSegment = event.target.closest('.progress-segment');
        if (!clickedSegment) return;

        const segmentIndex = parseInt(clickedSegment.dataset.index, 10);
        if (isNaN(segmentIndex)) return;

        // Si el clic es en el segmento activo, permite "buscar" en el tiempo.
        if (clickedSegment.classList.contains('active')) {
            const segmentRect = clickedSegment.getBoundingClientRect();
            const clickOffset = event.clientX - segmentRect.left;
            const clickPercentage = Math.max(0, Math.min(1, clickOffset / segmentRect.width)); // Asegurar que esté entre 0 y 1

            // currentBlockIndex ya se ha incrementado, por lo que el índice actual es uno menos.
            const currentBlock = classBlocks[currentBlockIndex - 1];
            if (!currentBlock) return; // Guarda de seguridad

            const totalBlockSeconds = currentBlock.duration * 60;
            const elapsedSeconds = Math.round(totalBlockSeconds * clickPercentage);

            timeRemainingInSeconds = totalBlockSeconds - elapsedSeconds;
            updateTimerDisplay();

        } else {
            // Si el clic es en un segmento inactivo, salta a ese bloque.
            jumpToBlock(segmentIndex);
        }
    }

    function endSession() {
        clearInterval(timerInterval);
        blockTitleEl.textContent = '¡Clase finalizada!';
        timerDisplayEl.textContent = '🎉';
        progressBarEl.removeEventListener('click', handleProgressClick);
        document.querySelectorAll('.progress-segment').forEach(segment => {
            segment.classList.remove('active');
            segment.style.cursor = 'default';
        });
    }

    function restartApplication() {
        clearInterval(timerInterval);
        isPaused = false;
        pauseResumeBtn.textContent = '⏸️';
        currentBlockIndex = 0;
        timeRemainingInSeconds = 0;
        updateDateCard();
        createProgressBar();
        startNextBlock();
        timerInterval = setInterval(tick, 1000);
        progressBarEl.addEventListener('click', handleProgressClick); // Re-attach listener
    }

    // --- INICIALIZACIÓN ---
    function init() {
        // Listeners del Modal
        settingsBtn.addEventListener('click', openModal);
        modalCloseBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (event) => {
            if (event.target == settingsModal) {
                closeModal();
            }
        });
        addBlockBtn.addEventListener('click', () => addBlockRowToEditor());
        blocksListEditor.addEventListener('click', handleModalClick);
        saveSettingsBtn.addEventListener('click', saveSettingsAndRestart);
        pauseResumeBtn.addEventListener('click', togglePause);
        muteBtn.addEventListener('click', toggleMute);

        // Listeners de Drag and Drop
        blocksListEditor.addEventListener('dragstart', e => {
            if (e.target.classList.contains('block-editor-row')) {
                e.target.classList.add('dragging');
            }
        });

        blocksListEditor.addEventListener('dragend', e => {
            if (e.target.classList.contains('block-editor-row')) {
                e.target.classList.remove('dragging');
            }
        });

        blocksListEditor.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(blocksListEditor, e.clientY);
            const dragging = document.querySelector('.dragging');
            if (dragging) {
                if (afterElement == null) {
                    blocksListEditor.appendChild(dragging);
                } else {
                    blocksListEditor.insertBefore(dragging, afterElement);
                }
            }
        });

        // Listeners de Perfiles
        saveProfileBtn.addEventListener('click', saveProfileToLocalStorage);
        loadProfileBtn.addEventListener('click', loadProfileFromLocalStorage);
        exportJsonBtn.addEventListener('click', exportProfileToJson);
        importJsonInput.addEventListener('change', importProfileFromJson);

        // Cargar perfil guardado al iniciar, si existe
        const savedProfile = localStorage.getItem('classroomClockProfile');
        if (savedProfile) {
            try {
                classBlocks = JSON.parse(savedProfile);
            } catch (e) {
                // Si el perfil guardado está corrupto, se usa el de por defecto
                console.error("Error al cargar perfil de localStorage:", e);
            }
        }

        restartApplication(); // Primera carga de la aplicación
    }

    init();
});
