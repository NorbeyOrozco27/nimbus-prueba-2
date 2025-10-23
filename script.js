// Configuración base
const TIEMPOS_VIAJE = {
    "La Ceja - Rionegro": 35,
    "Rionegro - La Ceja": 41
};

const CONFIG_PUNTOS_CONTROL = {
    "La Ceja - Rionegro": [
        {"id": "tramo_memos", "label": "CIT-Los Memos", "duracion": 5},
        {"id": "tramo_canada", "label": "Los Memos-El Canadá", "duracion": 14},
        {"id": "tramo_ipanema", "label": "El Canadá-Ipanema", "duracion": 14} // cambiar valor po 14
     ],
    "Rionegro - La Ceja": [
        {"id": "tramo_city_medic", "label": "TUC-City Medic", "duracion": 13},
        {"id": "tramo_el_canada", "label": "City Medic-El Canadá", "duracion": 16},
        {"id": "tramo_viva_ceja", "label": "El Canada-Viva La Ceja", "duracion": 12}
    ]
};

const CAUSAS_EXTERNAS = ["Accidente", "Obras Viales", "Tráfico", "Otros"];

// --- INICIALIZACIÓN DE SUPABASE ---
const supabaseUrl = 'https://pdggnzcswtklsuzinekt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZ2duemNzd3RrbHN1emluZWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2ODYwMTksImV4cCI6MjA2NzI2MjAxOX0.rd9PC9sG1n8L-1EnGutZoL74SyF_2Q_bIs7KmU7u780';
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
// --- FIN INICIALIZACIÓN ---

// Variables globales para almacenar los datos cargados
let conductoresData = [];
let vehiculosData = [];
let tablasData = [];

// ===== FUNCIONES DE UTILIDAD =====
function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;  // NUEVO: Chequea string, fallback 0 si null/undefined
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;  // NUEVO: Si split falla, 0
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const totalMinutes = minutes % (24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function diffInMinutes(start, end) {
    if (!start || !end) return 0;
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);
    let diff = endMins - startMins;
    
    // Fix: Si diff <0, chequea si es adelanto (mismo día) o wrap-around (ej. nocturno)
    if (diff < 0) {
        // Asume adelanto si |diff| < 12h (mismo día); suma 24h solo si parece nocturno (end mucho después)
        if (Math.abs(diff) < 720) {  // <12h = adelanto, return 0 para no penalizar
            return 0;  // Adelanto: No retraso
        } else {
            diff += 24 * 60;  // Wrap-around real (ej. 23:00 a 01:00)
        }
    }
    return diff;
}

// ===== FUNCIONES DE CARGA DE DATOS =====
async function cargarSelectores() {
    const conductorSelect = document.getElementById('conductor_id');
    const vehiculoSelect = document.getElementById('vehiculo_id');
    const tablaSelect = document.getElementById('tabla_id');

    if (!conductorSelect || !vehiculoSelect || !tablaSelect) {
        console.error('No se encontraron los elementos select');
        return;
    }

    conductorSelect.innerHTML = '<option value="">-- Cargando... --</option>';
    vehiculoSelect.innerHTML = '<option value="">-- Cargando... --</option>';
    tablaSelect.innerHTML = '<option value="">-- Cargando... --</option>';

    try {
        // Cargar Conductores
        const { data: conductores, error: errorConductores } = await supabaseClient
            .from('conductores_rionegro')
            .select('id, nombre')
            .order('nombre');

        if (errorConductores) throw errorConductores;
        conductoresData = conductores;
        conductorSelect.innerHTML = '<option value="">-- Seleccionar --</option>';
        conductoresData.forEach(conductor => {
            const option = document.createElement('option');
            option.value = conductor.id;
            option.textContent = conductor.nombre;
            conductorSelect.appendChild(option);
        });

        // Cargar Vehículos
        const { data: vehiculos, error: errorVehiculos } = await supabaseClient
            .from('vehiculos_rionegro')
            .select('id, numero_interno')
            .order('numero_interno');

        if (errorVehiculos) throw errorVehiculos;
        vehiculosData = vehiculos;
        vehiculoSelect.innerHTML = '<option value="">-- Seleccionar --</option>';
        vehiculosData.forEach(vehiculo => {
            const option = document.createElement('option');
            option.value = vehiculo.id;
            option.textContent = vehiculo.numero_interno;
            vehiculoSelect.appendChild(option);
        });

        // Cargar Tablas
        const { data: tablas, error: errorTablas } = await supabaseClient
            .from('tablas_rionegro')
            .select('id, nombre_tabla')
            .order('nombre_tabla', { ascending: true });

        if (errorTablas) throw errorTablas;
        tablasData = tablas;

        tablasData.sort((a, b) => {
            const numA = parseFloat(a.nombre_tabla);
            const numB = parseFloat(b.nombre_tabla);
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return a.nombre_tabla.localeCompare(b.nombre_tabla);
        });

        tablaSelect.innerHTML = '<option value="">-- Seleccionar --</option>';
        tablasData.forEach(tabla => {
            const option = document.createElement('option');
            option.value = tabla.id;
            option.textContent = tabla.nombre_tabla;
            tablaSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar los selectores desde Supabase:', error);
        alert('Error al cargar los datos desde Supabase. Revisa la consola.');
        conductorSelect.innerHTML = '<option value="">-- Error --</option>';
        vehiculoSelect.innerHTML = '<option value="">-- Error --</option>';
        tablaSelect.innerHTML = '<option value="">-- Error --</option>';
    }
}

// ===== FUNCIONES DE PUNTOS DE CONTROL =====
function actualizarPuntosControl(ruta) {
    const container = document.getElementById('puntos-control-container');
    if (!container) return;

    container.innerHTML = '';

    if (!ruta || !CONFIG_PUNTOS_CONTROL[ruta]) return;

    const puntos = CONFIG_PUNTOS_CONTROL[ruta];
    let tiempoAcumulado = 0;

    puntos.forEach((punto, index) => {
        tiempoAcumulado += punto.duracion;
        const esUltimo = index === puntos.length - 1;
        const labelFinal = esUltimo ? `${punto.label}` : punto.label;
        const esObligatorio = esUltimo;

        const puntoDiv = document.createElement('div');
        puntoDiv.className = 'extra-container';
        puntoDiv.innerHTML = `
            <div class="form-group">
                <label>
                    <span id="proyeccion-label-${punto.id}">${labelFinal} (Proyección: <span id="proyeccion-${punto.id}" class="proyeccion-time">--:--</span>)</span>
                    <div class="radio-group">
                        <label><input type="radio" name="estado_${punto.id}" value="a_tiempo" checked> A tiempo</label>
                        <label><input type="radio" name="estado_${punto.id}" value="tarde"> Tarde</label>
                    </div>
                </label>
            </div>
            <div id="detalle-${punto.id}" style="display: ${esUltimo ? 'block' : 'none'};">
                <div class="form-group">
                    <label for="hora_real_${punto.id}">Hora Real de Paso${esObligatorio ? ' (Obligatoria para llegada final)' : ''}:</label>
                    <input type="time" id="hora_real_${punto.id}" name="hora_real_${punto.id}" ${esObligatorio ? 'required' : ''}>
                </div>
                <div class="form-group">
                    <label>¿Fue justificado?</label>
                    <div class="radio-group">
                        <label><input type="radio" name="justificado_${punto.id}" value="si"> Sí</label>
                        <label><input type="radio" name="justificado_${punto.id}" value="no"> No</label>
                    </div>
                </div>
                <div class="form-group">
                    <label for="motivo_${punto.id}">Motivo del Retraso:</label>
                    <select id="motivo_${punto.id}" name="motivo_${punto.id}">
                        <option value="">-- Seleccionar --</option>
                        ${CAUSAS_EXTERNAS.map(causa => `<option value="${causa}">${causa}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
        container.appendChild(puntoDiv);
// Evento para cambio de estado
        const radios = puntoDiv.querySelectorAll(`input[name="estado_${punto.id}"]`);
        radios.forEach(radio => {
            radio.addEventListener('change', function() {
                const detalle = document.getElementById(`detalle-${punto.id}`);
                if (detalle) {
                    if (this.value === 'tarde') {
                        detalle.style.display = 'block';
                    } else if (!esUltimo) {
                        detalle.style.display = 'none';
                        const horaRealInput = document.getElementById(`hora_real_${punto.id}`);
                        if (horaRealInput) horaRealInput.value = '';
                        const radiosJust = puntoDiv.querySelectorAll(`input[name="justificado_${punto.id}"]`);
                        radiosJust.forEach(radio => radio.checked = false);
                    }
                }
            });
        });

        // Evento para hora real
        const horaRealInput = puntoDiv.querySelector(`#hora_real_${punto.id}`);
        if (horaRealInput) {
            horaRealInput.addEventListener('change', function() {
                const proyeccionSpan = document.getElementById(`proyeccion-${punto.id}`);
                if (proyeccionSpan && proyeccionSpan.dataset.minutos) {
                    const proyeccionMinutos = parseInt(proyeccionSpan.dataset.minutos);
                    actualizarColorProyeccion(punto.id, proyeccionMinutos, this.value);
                    if (!esUltimo) {
                        recalcularProyeccionesSiguientes(ruta, punto.id, this.value);
                    } else {
                        // Para último: Validar vs. tiempo total
                        const salidaReal = document.getElementById('salida_real').value;
                        const tiempoTotal = diffInMinutes(salidaReal, this.value);
                        const maxTiempo = TIEMPOS_VIAJE[ruta];
                        const estadoRadios = puntoDiv.querySelectorAll(`input[name="estado_${punto.id}"]`);
                        const tardeRadio = Array.from(estadoRadios).find(r => r.value === 'tarde');
                        const detalle = document.getElementById(`detalle-${punto.id}`);
                        if (tiempoTotal > maxTiempo) {
                            if (tardeRadio) tardeRadio.checked = true;
                            detalle.style.display = 'block';
                        }
                    }
                }
            });
        }
    });
}
function calcularProyecciones(ruta, salidaReal) {
    console.log('DEBUG RUTA INVERSA: Calculando proyecciones para ruta:', ruta, 'salida:', salidaReal);  // DEBUG
    if (!ruta || !salidaReal || !CONFIG_PUNTOS_CONTROL[ruta]) {
        console.error('DEBUG RUTA INVERSA: Ruta, salida o config inválida:', ruta, salidaReal, CONFIG_PUNTOS_CONTROL[ruta]);  // DEBUG
        return;
    }
    const puntos = CONFIG_PUNTOS_CONTROL[ruta];
    let tiempoBase = timeToMinutes(salidaReal);
    console.log('DEBUG RUTA INVERSA: Tiempo base min:', tiempoBase);

    puntos.forEach((punto, index) => {
        tiempoBase += punto.duracion;
        const proyeccion = minutesToTime(tiempoBase);
        const proyeccionSpan = document.getElementById(`proyeccion-${punto.id}`);
        if (proyeccionSpan) {
            proyeccionSpan.textContent = proyeccion;
            proyeccionSpan.dataset.minutos = tiempoBase;
            proyeccionSpan.classList.remove('verde', 'rojo', 'naranja');

            const horaRealInput = document.getElementById(`hora_real_${punto.id}`);
            if (horaRealInput && horaRealInput.value) {
                actualizarColorProyeccion(punto.id, tiempoBase, horaRealInput.value);
                if (index < puntos.length - 1) {
                    recalcularProyeccionesSiguientes(ruta, punto.id, horaRealInput.value);
                }
            }
        }
    });
}

function actualizarColorProyeccion(puntoId, proyeccionMinutos, horaReal) {
    const proyeccionSpan = document.getElementById(`proyeccion-${puntoId}`);
    if (!proyeccionSpan || !horaReal || horaReal === '') {
        if (proyeccionSpan) proyeccionSpan.classList.remove('verde', 'rojo', 'naranja');
        return;
    }

    const horaRealMinutos = timeToMinutes(horaReal);
    const diff = horaRealMinutos - proyeccionMinutos;
    if (diff > 0) {
        proyeccionSpan.classList.remove('verde');
        proyeccionSpan.classList.add(diff > 5 ? 'rojo' : 'naranja');
    } else {
        proyeccionSpan.classList.remove('rojo', 'naranja');
        proyeccionSpan.classList.add('verde');
    }
}

function recalcularProyeccionesSiguientes(ruta, puntoActualId, horaRealActual) {
    if (!ruta || !horaRealActual) return;

    const puntos = CONFIG_PUNTOS_CONTROL[ruta];
    let indiceActual = puntos.findIndex(p => p.id === puntoActualId);

    if (indiceActual === -1) return;

    let tiempoBase = timeToMinutes(horaRealActual);

    for (let i = indiceActual + 1; i < puntos.length; i++) {
        const punto = puntos[i];
        tiempoBase += punto.duracion;
        const proyeccion = minutesToTime(tiempoBase);
        const proyeccionSpan = document.getElementById(`proyeccion-${punto.id}`);
        if (proyeccionSpan) {
            proyeccionSpan.textContent = proyeccion;
            proyeccionSpan.dataset.minutos = tiempoBase;
            proyeccionSpan.classList.remove('verde', 'rojo', 'naranja');

            const horaRealInput = document.getElementById(`hora_real_${punto.id}`);
            if (horaRealInput && horaRealInput.value) {
                actualizarColorProyeccion(punto.id, tiempoBase, horaRealInput.value);
            }
        }
    }
}
// ===== FUNCIONES DE VALIDACIÓN =====
function evaluarRetrasoSalida() {
    const salidaProgramada = document.getElementById('salida_programada');
    const salidaReal = document.getElementById('salida_real');
    const retrasoContainer = document.getElementById('retraso-salida-container');

    if (!salidaProgramada || !salidaReal || !retrasoContainer) return;

    const salidaProgramadaVal = salidaProgramada.value;
    const salidaRealVal = salidaReal.value;

    if (salidaProgramadaVal && salidaRealVal) {
        const minutosRetraso = diffInMinutes(salidaProgramadaVal, salidaRealVal);
        if (minutosRetraso > 1) {
            retrasoContainer.style.display = 'block';
        } else {
            retrasoContainer.style.display = 'none';
        }
    }
}

function validarLlegadaFinal(ruta) {
    const ultimoId = CONFIG_PUNTOS_CONTROL[ruta][CONFIG_PUNTOS_CONTROL[ruta].length - 1].id;
    const horaRealUltimo = document.getElementById(`hora_real_${ultimoId}`);
    if (!horaRealUltimo || !horaRealUltimo.value) {
        alert(`La hora real de llegada final (${CONFIG_PUNTOS_CONTROL[ruta][CONFIG_PUNTOS_CONTROL[ruta].length - 1].label}) es obligatoria.`);
        return false;
    }
    return true;
}

// ===== FUNCIÓN DE CLASIFICACIÓN =====
function clasificarViaje(ruta, salidaProgramada, salidaReal, puntosControlData) {
    const ultimoPunto = puntosControlData[puntosControlData.length - 1];
    const llegadaReal = ultimoPunto.hora_real;
    const tiempoTotal = diffInMinutes(salidaReal, llegadaReal);
    const maxTiempo = TIEMPOS_VIAJE[ruta];
    const retrasoLlegada = tiempoTotal > maxTiempo;
    const justificadoLlegada = ultimoPunto.justificado === 'si';
    const motivoLlegada = ultimoPunto.motivo;

    const retrasoSalidaMin = diffInMinutes(salidaProgramada, salidaReal);
    const retrasoSalida = retrasoSalidaMin > 1;
    const justificadoSalida = document.querySelector('input[name="retraso_salida_justificado"]:checked')?.value === 'si';

    const puntosIntermedios = puntosControlData.slice(0, -1);
    const puntosTardeNoJust = puntosIntermedios.some(p => p.estado === 'tarde' && p.justificado !== 'si');

    let tipo, detalle;
    if (retrasoLlegada && !justificadoLlegada) {
        tipo = 'Novedad Injustificada';
        detalle = `El viaje llegó tarde (${tiempoTotal} min > ${maxTiempo} min) y no fue justificado.`;
    } else if (retrasoSalida && !justificadoSalida) {
        tipo = 'Novedad Leve';
        detalle = `Hubo un retraso en la salida no justificado (${retrasoSalidaMin} min).`;
    } else if (puntosTardeNoJust) {
        tipo = 'Novedad Leve';
        detalle = 'Hubo un punto de control intermedio incumplido no justificado.';
    } else if (retrasoLlegada && justificadoLlegada) {
        tipo = 'Novedad Justificada';
        detalle = `El viaje llegó tarde, pero la llegada fue justificada (${motivoLlegada}).`;
    } else {
        tipo = 'A Tiempo';
        detalle = 'El viaje se completó sin novedades significativas.';
    }

    return {
        tipo,
        detalle,
        tiempo_total_viaje: tiempoTotal,
        tiempo_max_permitido: maxTiempo,
        retraso_llegada_justificado: justificadoLlegada,
        motivo_retraso_llegada: motivoLlegada,
        puntos_control_detalle: puntosControlData
    };
}

function inicializarEventosFormulario() {
    const rutaSelect = document.getElementById('ruta');
    const salidaProgramada = document.getElementById('salida_programada');
    const salidaReal = document.getElementById('salida_real');
    const btnCalcular = document.getElementById('btn-calcular');

    if (rutaSelect) {
        rutaSelect.addEventListener('change', function() {
            const ruta = this.value;
            document.getElementById('ruta-info').style.display = ruta ? 'block' : 'none';
            if (ruta) {
                actualizarPuntosControl(ruta);
            }
            if (salidaReal && salidaReal.value) {
                calcularProyecciones(ruta, salidaReal.value);
            }
        });
    }

    if (salidaProgramada && salidaReal) {
        salidaProgramada.addEventListener('change', evaluarRetrasoSalida);
        salidaReal.addEventListener('change', function() {
            const ruta = rutaSelect.value;
            calcularProyecciones(ruta, this.value);
            evaluarRetrasoSalida();
        });
    }

    if (btnCalcular) {
        btnCalcular.addEventListener('click', async function() {
            const ruta = rutaSelect.value;
            if (!ruta) {
                alert('Selecciona una ruta.');
                return;
            }
            if (!validarLlegadaFinal(ruta)) return;

            const puntosControlData = [];
            const puntos = CONFIG_PUNTOS_CONTROL[ruta];
            puntos.forEach(punto => {
                const estado = document.querySelector(`input[name="estado_${punto.id}"]:checked`)?.value || 'a_tiempo';
                const horaReal = document.getElementById(`hora_real_${punto.id}`)?.value || null;
                const justificado = document.querySelector(`input[name="justificado_${punto.id}"]:checked`)?.value || null;
                const motivo = document.getElementById(`motivo_${punto.id}`)?.value || null;
                const proyeccion = document.getElementById(`proyeccion-${punto.id}`)?.textContent || null;

                puntosControlData.push({
                    id: punto.id,
                    label: punto.label,
                    estado,
                    hora_real: horaReal,
                    justificado,
                    motivo,
                    proyeccion
                });
            });

            const resultadoClasificacion = clasificarViaje(ruta, salidaProgramada.value, salidaReal.value, puntosControlData);

            const datosParaGuardar = {
                fecha_monitoreo: document.getElementById('fecha_monitoreo').value,
                tipo_monitoreo: document.getElementById('tipo_monitoreo').value,
                ruta,
                conductor_id: document.getElementById('conductor_id').value,
                vehiculo_id: document.getElementById('vehiculo_id').value,
                tabla_id: document.getElementById('tabla_id').value || null,
                salida_programada: salidaProgramada.value,
                salida_real: salidaReal.value,
                llegada_real: puntosControlData[puntosControlData.length - 1].hora_real,
                retraso_salida_justificado: document.querySelector('input[name="retraso_salida_justificado"]:checked')?.value === 'si',
                motivo_retraso_salida: document.getElementById('motivo_retraso_salida').value,
                retraso_llegada_justificado: resultadoClasificacion.retraso_llegada_justificado,
                motivo_retraso_llegada: resultadoClasificacion.motivo_retraso_llegada,
                tiempo_total_viaje: resultadoClasificacion.tiempo_total_viaje,
                tiempo_max_permitido: resultadoClasificacion.tiempo_max_permitido,
                clasificacion_final: resultadoClasificacion.tipo,
                detalle_clasificacion: resultadoClasificacion.detalle,
                puntos_control_detalle: puntosControlData
            };

            try {
                const { data, error } = await supabaseClient
                    .from('viajes_rionegro')
                    .insert([datosParaGuardar])
                    .select();

                if (error) throw error;

                const resultadoContainer = document.getElementById('resultado-clasificacion');
                let color = 'var(--success-color)';
                if (resultadoClasificacion.tipo.includes('Injustificada')) {
                    color = 'var(--danger-color)';
                } else if (resultadoClasificacion.tipo.includes('Justificada') || resultadoClasificacion.tipo.includes('Leve')) {
                    color = 'var(--warning-color)';
                }

                resultadoContainer.innerHTML = `
                    <div style="color: ${color}; font-weight: bold; margin-bottom: 1rem;">
                        <i class="fas fa-${color === 'var(--success-color)' ? 'check' : 'exclamation-triangle'}"></i>
                        Clasificación: ${resultadoClasificacion.tipo}
                    </div>
                    <p>${resultadoClasificacion.detalle}</p>
                    <p style="margin-top: 1rem; color: var(--success-color);">
                        <i class="fas fa-check-circle"></i> Datos guardados exitosamente en TransUnidos.
                    </p>
                `;
                console.log("Datos guardados en Supabase:", data);
            } catch (error) {
                console.error('Error al guardar en Supabase:', error);
                const resultadoContainer = document.getElementById('resultado-clasificacion');
                if (resultadoContainer) {
                    resultadoContainer.innerHTML = `
                        <div style="color: var(--danger-color); font-weight: bold;">
                            <i class="fas fa-exclamation-triangle"></i>
                            Error al guardar los datos: ${error.message}
                        </div>
                    `;
                }
            }
        });
    }
}

// ===== NAVEGACIÓN =====
function inicializarNavegacion() {
    const navButtons = document.querySelectorAll('.sidebar-menu button');
    const sections = document.querySelectorAll('main > section');

    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            const targetId = this.id.replace('nav-', 'section-');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                sections.forEach(sec => {
                    sec.classList.remove('section-active');
                    sec.classList.add('section-hidden');
                });
                targetSection.classList.add('section-active');
                targetSection.classList.remove('section-hidden');
            }
        });
    });
}

// ===== BÚSQUEDAS =====
function inicializarBusquedas() {
    const searchRegistros = document.getElementById('search-registros');
    if (searchRegistros) {
        searchRegistros.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const tablaContainer = document.getElementById('tabla-registros-container');
            if (!tablaContainer) return;
            
            const rows = tablaContainer.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

// ===== INFORMES (INTEGRADAS DESDE TU CÓDIGO) =====
function inicializarEventosInformes() {
    const btnCargarRegistros = document.getElementById('btn-cargar-registros');
    if (btnCargarRegistros) {
        btnCargarRegistros.addEventListener('click', cargarRegistros);
        console.log('DEBUG: Listener de Actualizar agregado.');
    }

    const btnInformeVehiculos = document.getElementById('btn-cargar-informe-vehiculos');
    if (btnInformeVehiculos) {
        btnInformeVehiculos.addEventListener('click', cargarInformeVehiculos);
    }

    const btnInformeAdvertencias = document.getElementById('btn-cargar-informe-advertencias');
    if (btnInformeAdvertencias) {
        btnInformeAdvertencias.addEventListener('click', cargarInformeAdvertencias);
    }

    const btnInformeDescargos = document.getElementById('btn-cargar-informe-descargos');
    if (btnInformeDescargos) {
        btnInformeDescargos.addEventListener('click', cargarInformeDescargos);
    }
}

async function cargarInformeVehiculos() {
    const tablaInforme = document.getElementById('tabla-informe-vehiculos');
    const btnInforme = document.getElementById('btn-cargar-informe-vehiculos');

    if (!tablaInforme || !btnInforme) return;

    tablaInforme.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando informe...</p></div>';
    btnInforme.disabled = true;

    try {
        const { data: viajes, error } = await supabaseClient
            .from('viajes_rionegro')
            .select(`vehiculo_id, vehiculos_rionegro (numero_interno), tipo_monitoreo, fecha_monitoreo`);

        if (error) throw error;
        if (!viajes || viajes.length === 0) {
            tablaInforme.innerHTML = '<div class="empty-state"><i class="fas fa-chart-bar"></i><h3>No hay datos disponibles</h3><p>No se encontraron viajes para generar el informe.</p></div>';
            btnInforme.disabled = false;
            return;
        }

        // Contar monitoreos por vehículo
        const conteosPorVehiculo = {};
        viajes.forEach(viaje => {
            const vehiculo = viaje.vehiculos_rionegro?.numero_interno || 'Desconocido';
            if (!conteosPorVehiculo[vehiculo]) {
                conteosPorVehiculo[vehiculo] = { total: 0, real: 0, historico: 0 };
            }
            conteosPorVehiculo[vehiculo].total++;
            if (viaje.tipo_monitoreo === 'Real') conteosPorVehiculo[vehiculo].real++;
            if (viaje.tipo_monitoreo === 'Historico') conteosPorVehiculo[vehiculo].historico++;
        });

        // Convertir a array y ordenar
        const sortedConteos = Object.entries(conteosPorVehiculo)
            .sort((a, b) => b[1].total - a[1].total);

        // Generar HTML con filtros y búsqueda
        let html = `
            <div class="filtros-container">
                <div class="filtro-group">
                    <label>Fecha Inicio: </label>
                    <input type="date" id="fecha-inicio-vehiculos" class="filtro-input">
                </div>
                <div class="filtro-group">
                    <label>Fecha Fin: </label>
                    <input type="date" id="fecha-fin-vehiculos" class="filtro-input">
                </div>
                <div class="filtro-group">
                    <input type="text" id="search-vehiculos" placeholder="Buscar vehículo..." class="filtro-input">
                </div>
            </div>
            <table id="tabla-vehiculos">
                <thead>
                    <tr>
                        <th>Vehículo</th>
                        <th>Número de Monitoreos Total</th>
                        <th>Real</th>
                        <th>Histórico</th>
                    </tr>
                </thead>
                <tbody>`;

        sortedConteos.forEach(([vehiculo, counts]) => {
            html += `
                <tr>
                    <td>${vehiculo}</td>
                    <td>${counts.total}</td>
                    <td>${counts.real}</td>
                    <td>${counts.historico}</td>
                </tr>`;
        });

        html += `</tbody></table>`;
        tablaInforme.innerHTML = html;

        // Filtro de búsqueda y fechas
        const searchInput = document.getElementById('search-vehiculos');
        const fechaInicio = document.getElementById('fecha-inicio-vehiculos');
        const fechaFin = document.getElementById('fecha-fin-vehiculos');
        const table = document.getElementById('tabla-vehiculos');

        function filterTable() {
            const searchText = searchInput.value.toLowerCase();
            const startDate = fechaInicio.value ? new Date(fechaInicio.value) : null;
            const endDate = fechaFin.value ? new Date(fechaFin.value) : null;

            // Filtrar viajes por fecha
            const filteredViajes = viajes.filter(viaje => {
                const fechaViaje = new Date(viaje.fecha_monitoreo);
                if (startDate && fechaViaje < startDate) return false;
                if (endDate && fechaViaje > endDate) return false;
                return true;
            });

            // Recalcular conteos con viajes filtrados
            const filteredConteos = {};
            filteredViajes.forEach(viaje => {
                const vehiculo = viaje.vehiculos_rionegro?.numero_interno || 'Desconocido';
                if (!filteredConteos[vehiculo]) {
                    filteredConteos[vehiculo] = { total: 0, real: 0, historico: 0 };
                }
                filteredConteos[vehiculo].total++;
                if (viaje.tipo_monitoreo === 'Real') filteredConteos[vehiculo].real++;
                if (viaje.tipo_monitoreo === 'Historico') filteredConteos[vehiculo].historico++;
            });

            // Actualizar tabla
            let tbodyHTML = '';
            Object.entries(filteredConteos)
                .sort((a, b) => b[1].total - a[1].total)
                .forEach(([vehiculo, counts]) => {
                    if (vehiculo.toLowerCase().includes(searchText)) {
                        tbodyHTML += `
                            <tr>
                                <td>${vehiculo}</td>
                                <td>${counts.total}</td>
                                <td>${counts.real}</td>
                                <td>${counts.historico}</td>
                            </tr>`;
                    }
                });

            if (table && table.tBodies[0]) {
                table.tBodies[0].innerHTML = tbodyHTML;
            }
        }

        if (searchInput) searchInput.addEventListener('input', filterTable);
        if (fechaInicio) fechaInicio.addEventListener('change', filterTable);
        if (fechaFin) fechaFin.addEventListener('change', filterTable);

    } catch (error) {
        console.error('Error al cargar informe de vehículos:', error);
        tablaInforme.innerHTML = `<div class="empty-state" style="color: var(--danger-color);">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error al cargar el informe</h3>
            <p>${error.message}</p>
        </div>`;
    } finally {
        btnInforme.disabled = false;
    }
}

async function cargarInformeAdvertencias() {
    const tablaInforme = document.getElementById('tabla-informe-advertencias');
    const btnInforme = document.getElementById('btn-cargar-informe-advertencias');

    if (!tablaInforme || !btnInforme) return;

    tablaInforme.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando informe...</p></div>';
    btnInforme.disabled = true;

    try {
        const { data: viajes, error } = await supabaseClient
    .from('viajes_rionegro')
    .select(`
        *,
        conductores_rionegro (nombre),
        vehiculos_rionegro (numero_interno),
        tablas_rionegro (nombre_tabla)
    `);

        if (error) throw error;
        if (!viajes || viajes.length === 0) {
            tablaInforme.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>No hay datos disponibles</h3><p>No se encontraron viajes para generar el informe.</p></div>';
            btnInforme.disabled = false;
            return;
        }

        // Contar advertencias por conductor
        const advertenciasPorConductor = {};
        const evidenciasPorConductor = {};
        // punto B, falta los otros
        viajes.forEach(viaje => {
    const conductor = viaje.conductores_rionegro?.nombre || 'Desconocido';
    let hayInfraccionInjustificada = false;  // ✅ Bien declarado

    // Calcular retraso en salida
    const salidaProgramadaMins = timeToMinutes(viaje.salida_programada || '00:00');
    const salidaRealMins = timeToMinutes(viaje.salida_real || '00:00');
    const retrasoSalida = salidaRealMins - salidaProgramadaMins > 0 ? salidaRealMins - salidaProgramadaMins : 0;

    // ✅ NUEVA LÓGICA - Verificar salida injustificada
    if (retrasoSalida > 0 && !viaje.retraso_salida_justificado) {
        hayInfraccionInjustificada = true;
    }

    // ✅ NUEVA LÓGICA - Verificar puntos injustificados
    if (viaje.puntos_control_detalle?.some(p => 
        p.estado === 'tarde' && p.justificado === 'no'  // ← SOLO "no" explícito
    )) {
        hayInfraccionInjustificada = true;
    }

    // ✅ AHORA usa hayInfraccionInjustificada en lugar de hayInfraccion
    if (!advertenciasPorConductor[conductor]) {
        advertenciasPorConductor[conductor] = 0;
    }
    if (!evidenciasPorConductor[conductor]) {
        evidenciasPorConductor[conductor] = [];
    }
    
    // ✅ CAMBIAR ESTA LÍNEA:
    if (hayInfraccionInjustificada) {  // ← Usar la nueva variable
        advertenciasPorConductor[conductor]++;
        evidenciasPorConductor[conductor].push(viaje);
    }
});

        // Convertir a array y ordenar
        const sortedAdvertencias = Object.entries(advertenciasPorConductor)
            .sort((a, b) => b[1] - a[1]);

        // Generar HTML de la tabla
        let html = `
            <table id="tabla-advertencias">
                <thead>
                    <tr>
                        <th>Conductor</th>
                        <th>Número de Advertencias</th>
                        <th>Mandar a Gestión Humana</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>`;

        sortedAdvertencias.forEach(([conductor, count]) => {
            const vecesGestion = Math.floor(count / 5);
            const estilo = count >= 5 ? 'style="color: var(--danger-color); font-weight: bold;"' : '';
            const mandarGestion = count >= 5 ? `Sí (${vecesGestion} veces)` : 'No';
            const botonDetalles = `<button class="btn-ver-detalles" data-conductor="${conductor}">
            <i class="fas fa-list"></i> Ver Detalles
              </button>`;

            html += `
                <tr ${estilo}>
                    <td>${conductor}</td>
                    <td>${count}</td>
                    <td>${mandarGestion}</td>
                    <td>${botonDetalles}</td>
                </tr>`;
        });

        html += `</tbody></table>`;
        tablaInforme.innerHTML = html;

        // Evento para generar PDF
        document.querySelectorAll('.btn-ver-detalles').forEach(btn => {
    btn.addEventListener('click', () => {
        const conductor = btn.dataset.conductor;
        const evidencias = evidenciasPorConductor[conductor] || [];
        mostrarDetallesConductor(conductor, evidencias);
    });
});

    } catch (error) {
        console.error('Error al cargar informe de advertencias:', error);
        tablaInforme.innerHTML = `<div class="empty-state" style="color: var(--danger-color);">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error al cargar el informe</h3>
            <p>${error.message}</p>
        </div>`;
    } finally {
        btnInforme.disabled = false;
    }
}
async function cargarInformeDescargos() {
    const tablaInforme = document.getElementById('tabla-informe-descargos');
    const btnInforme = document.getElementById('btn-cargar-informe-descargos');

    if (!tablaInforme || !btnInforme) return;

    tablaInforme.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Cargando informe...</p></div>';
    btnInforme.disabled = true;

    try {
        // ✅ CONSULTA CORREGIDA - Incluye todas las relaciones
        const { data: viajes, error } = await supabaseClient
            .from('viajes_rionegro')
            .select(`
                *,
                conductores_rionegro (nombre),
                vehiculos_rionegro (numero_interno),
                tablas_rionegro (nombre_tabla)
            `);

        if (error) throw error;
        if (!viajes || viajes.length === 0) {
            tablaInforme.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><h3>No hay datos disponibles</h3><p>No se encontraron conductores para descargos.</p></div>';
            btnInforme.disabled = false;
            return;
        }

        const advertenciasPorConductor = {};
        const evidenciasPorConductor = {};
        const fechasGestionHumana = {}; // Nuevo: para rastrear fechas de acumulación

        viajes.forEach(viaje => {
            const conductor = viaje.conductores_rionegro?.nombre || 'Desconocido';
            let hayInfraccionInjustificada = false;

            const salidaProgramadaMins = timeToMinutes(viaje.salida_programada || '00:00');
            const salidaRealMins = timeToMinutes(viaje.salida_real || '00:00');
            const retrasoSalida = salidaRealMins - salidaProgramadaMins > 0 ? salidaRealMins - salidaProgramadaMins : 0;

            // Verificar salida injustificada
            if (retrasoSalida > 0 && !viaje.retraso_salida_justificado) {
                hayInfraccionInjustificada = true;
            }

            // Verificar puntos injustificados
            if (viaje.puntos_control_detalle?.some(p => 
                p.estado === 'tarde' && p.justificado === 'no'
            )) {
                hayInfraccionInjustificada = true;
            }

            if (!advertenciasPorConductor[conductor]) {
                advertenciasPorConductor[conductor] = 0;
                evidenciasPorConductor[conductor] = [];
                fechasGestionHumana[conductor] = []; // Inicializar array de fechas
            }
            
            if (hayInfraccionInjustificada) {
                advertenciasPorConductor[conductor]++;
                evidenciasPorConductor[conductor].push(viaje);
                
                // ✅ NUEVO: Registrar cuando llega a múltiplos de 5
                if (advertenciasPorConductor[conductor] % 5 === 0) {
                    fechasGestionHumana[conductor].push({
                        fecha: viaje.fecha_monitoreo,
                        conteo: advertenciasPorConductor[conductor]
                    });
                }
            }
        });

        // Filtrar solo >=5
        const sortedDescargos = Object.entries(advertenciasPorConductor)
            .filter(([_, count]) => count >= 5)
            .sort((a, b) => b[1] - a[1]);

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Conductor</th>
                        <th>Advertencias</th>
                        <th>Veces a Gestión Humana</th>
                        <th>Fechas de Acumulación</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>`;

        sortedDescargos.forEach(([conductor, count]) => {
            const vecesGestion = Math.floor(count / 5);
            const acumulaciones = fechasGestionHumana[conductor] || [];
            
            // Formatear fechas de acumulación
            let fechasHTML = '<ul style="margin: 0; padding-left: 1rem; font-size: 0.8rem;">';
            acumulaciones.forEach(acum => {
                fechasHTML += `<li>${acum.fecha} (${acum.conteo} advertencias)</li>`;
            });
            fechasHTML += '</ul>';

            html += `
                <tr style="color: var(--danger-color); font-weight: bold;">
                    <td>${conductor}</td>
                    <td>${count}</td>
                    <td>${vecesGestion}</td>
                    <td>${fechasHTML}</td>
                    <td>
                        <button class="btn-ver-detalles" data-conductor="${conductor}">
                            <i class="fas fa-list"></i> Ver Detalles
                        </button>
                    </td>
                </tr>`;
        });

        html += `</tbody></table>`;
        tablaInforme.innerHTML = html;

        // Evento para mostrar detalles
        document.querySelectorAll('.btn-ver-detalles').forEach(btn => {
            btn.addEventListener('click', () => {
                const conductor = btn.dataset.conductor;
                const evidencias = evidenciasPorConductor[conductor] || [];
                mostrarDetallesConductor(conductor, evidencias);
            });
        });

    } catch (error) {
        console.error('Error al cargar informe de descargos:', error);
        tablaInforme.innerHTML = `<div class="empty-state" style="color: var(--danger-color);">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error al cargar el informe</h3>
            <p>${error.message}</p>
        </div>`;
    } finally {
        btnInforme.disabled = false;
    }
}

// ===== FUNCIÓN PARA GENERAR PDF =====
function generarPDFEvidencias(conductor, evidencias) {
    if (typeof jsPDF === 'undefined') {
        alert('Error: La librería jsPDF no está cargada. No se puede generar el PDF.');
        return;
    }

    try {
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(16);
        doc.setTextColor(0, 112, 243);
        doc.text(`Evidencias de Advertencias - ${conductor}`, 20, 20);
        
        // Información del conductor
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Conductor: ${conductor}`, 20, 35);
        doc.text(`Total de infracciones: ${evidencias.length}`, 20, 45);
        doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 20, 55);
        
        // Tabla de evidencias
        const tableData = evidencias.map((viaje, index) => [
            index + 1,
            viaje.fecha_monitoreo,
            viaje.ruta,
            viaje.salida_programada,
            viaje.salida_real,
            viaje.puntos_control_detalle?.filter(p => p.estado === 'tarde').length || 0
        ]);

        doc.autoTable({
            startY: 65,
            head: [['#', 'Fecha', 'Ruta', 'Salida Prog.', 'Salida Real', 'Puntos Tarde']],
            body: tableData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 112, 243] }
        });

        // Guardar PDF
        doc.save(`evidencias_${conductor.replace(/\s+/g, '_')}.pdf`);
        
    } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('Error al generar el PDF: ' + error.message);
    }
}
// ===== FUNCIÓN PARA MOSTRAR DETALLES DE INFRACCIONES =====
function mostrarDetallesConductor(conductor, evidencias) {
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'modal-detalles';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Detalles de Mensajes de Advertencias - ${conductor}</h3>
                <button class="btn-cerrar-modal">&times;</button>
            </div>
            <div class="modal-body">
                ${generarTablaDetalles(conductor, evidencias)}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Eventos del modal
    modal.querySelector('.btn-cerrar-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}
function generarTablaDetalles(conductor, evidencias) {
    if (!evidencias || evidencias.length === 0) {
        return '<p>No hay evidencias de infracciones.</p>';
    }
    
    let tablaHTML = `
        <div class="tabla-detalles-container">
            <table class="tabla-detalles">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Ruta</th>
                        <th>Vehículo</th>
                        <th>Tabla</th>
                        <th>Punto de Control</th>
                        <th>Proyección</th>
                        <th>Hora Real</th>
                        <th>Demora (min)</th>
                        <th>Justificado</th>
                    </tr>
                </thead>
                <tbody>`;
    
    evidencias.forEach(viaje => {
        // Obtener datos de vehículo y tabla
        const vehiculo = viaje.vehiculos_rionegro?.numero_interno || 'N/A';
        const tabla = viaje.tablas_rionegro?.nombre_tabla || 'N/A';

        const puntosInjustificados = viaje.puntos_control_detalle?.filter(p => 
            p.estado === 'tarde' && p.justificado === 'no'
        ) || [];
        
        if (puntosInjustificados.length === 0) {
            // Si no hay puntos injustificados, mostrar solo salida injustificada
            if (viaje.retraso_salida_justificado === false) {
                tablaHTML += `
                    <tr>
                        <td>${viaje.fecha_monitoreo}</td>
                        <td>${viaje.ruta}</td>
                        <td>${vehiculo}</td>
                        <td>${tabla}</td>
                        <td><strong>SALIDA</strong></td>
                        <td>${viaje.salida_programada}</td>
                        <td>${viaje.salida_real}</td>
                        <td>${diffInMinutes(viaje.salida_programada, viaje.salida_real)}</td>
                        <td>NO</td>
                    </tr>`;
            }
        } else {
            puntosInjustificados.forEach(punto => {
                const proyeccionMins = timeToMinutes(punto.proyeccion || '00:00');
                const horaRealMins = timeToMinutes(punto.hora_real || '00:00');
                const demora = horaRealMins - proyeccionMins;
                
                tablaHTML += `
                    <tr>
                        <td>${viaje.fecha_monitoreo}</td>
                        <td>${viaje.ruta}</td>
                        <td>${vehiculo}</td>
                        <td>${tabla}</td>
                        <td>${punto.label}</td>
                        <td>${punto.proyeccion || 'N/A'}</td>
                        <td>${punto.hora_real || 'N/A'}</td>
                        <td>${demora}</td>
                        <td>NO</td>
                    </tr>`;
            });
        }
    });
    
    tablaHTML += `</tbody></table></div>`;
    return tablaHTML;
}

// ===== CARGAR REGISTROS (FUNCIONAL COMPLETA) =====
async function cargarRegistros() {
    console.log('DEBUG: Iniciando carga de registros...');  // DEBUG: Confirma ejecución
    const tablaContainer = document.getElementById('tabla-registros-container');
    const btnCargar = document.getElementById('btn-cargar-registros');

    if (!tablaContainer || !btnCargar) {
        console.error('DEBUG: Elementos no encontrados (tabla o botón)');
        return;
    }

    tablaContainer.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando registros...</p></div>';
    btnCargar.disabled = true;

    try {
        console.log('DEBUG: Ejecutando query Supabase (con joins opcionales)...');
        // Query simplificada: Usa left joins implícitos con fallback
        const { data: viajes, error } = await supabaseClient
            .from('viajes_rionegro')
            .select(`
                *,
                conductores_rionegro!inner (nombre),
                vehiculos_rionegro!inner (numero_interno),
                tablas_rionegro!inner (nombre_tabla)
            `)
            .order('created_at', { ascending: false });

        console.log('DEBUG: Respuesta Supabase - Data:', viajes?.length || 0, 'Error:', error);  // DEBUG: Muestra count/error

        if (error) {
            console.error('DEBUG: Error en query:', error.code, error.message);
            throw error;
        }

        if (!viajes || viajes.length === 0) {
            console.log('DEBUG: Tabla vacía - No hay viajes.');
            tablaContainer.innerHTML = '<div class="empty-state"><i class="fas fa-table"></i><h3>No se encontraron registros</h3><p>La tabla está vacía. Verifica inserts en Supabase o prueba guardar un viaje nuevo.</p></div>';
            btnCargar.disabled = false;
            return;
        }

        console.log('DEBUG: Generando tabla con', viajes.length, 'registros...');

        let tablaHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Fecha Monitoreo</th>
                        <th>Tipo Monitoreo</th>
                        <th>Conductor</th>
                        <th>Vehículo</th>
                        <th>Tabla</th>
                        <th>Ruta</th>
                        <th>Salida Programada</th>
                        <th>Salida Real</th>
                        <th>Llegada Real</th>
                        <th>Ret. Sal. Justif.</th>
                        <th>Motivo Ret. Sal.</th>
                        <th>Ret. Lleg. Justif.</th>
                        <th>Motivo Ret. Lleg.</th>
                        <th>Tiempo Total (min)</th>
                        <th>Tiempo Max (min)</th>
                        <th>Clasificación Final</th>
                        <th>Detalle Clasificación</th>
                        <th>Puntos de Control</th>
                    </tr>
                </thead>
                <tbody>`;

        viajes.forEach(viaje => {
            // Fallback para joins (si null, usa 'N/A')
            const conductor = viaje.conductores_rionegro?.nombre || 'N/A';
            const vehiculo = viaje.vehiculos_rionegro?.numero_interno || 'N/A';
            const tabla = viaje.tablas_rionegro?.nombre_tabla || 'N/A';

            // Resumen y detalle puntos de control
            const puntosControlResumen = viaje.puntos_control_detalle ?
    viaje.puntos_control_detalle.map(p => `[${p.label}: ${p.estado}]`).join(', ') : 'N/A';
// NUEVA LÍNEA: Formateo como lista legible para popup
   const puntosControlDetalle = viaje.puntos_control_detalle ? 
    '<ul style="margin: 0; padding-left: 1rem; list-style-type: disc;">' + 
    viaje.puntos_control_detalle.map(p => 
        `<li><strong>${p.label}:</strong> Estado: ${p.estado} | Proyección: ${p.proyeccion || 'N/A'} | Justificado: ${p.justificado || 'N/A'} | Hora Real: ${p.hora_real || 'N/A'}</li>`
    ).join('') + 
    '</ul>' : 
    'N/A';

            // Resto de lógica para infracciones y advertencia (copia del original si no está)
            const salidaProgramadaMins = timeToMinutes(viaje.salida_programada || '00:00');
            const salidaRealMins = timeToMinutes(viaje.salida_real || '00:00');
            const retrasoSalida = salidaRealMins - salidaProgramadaMins > 0 ? salidaRealMins - salidaProgramadaMins : 0;

            let hayInfraccion = false;
        let advertencia = '';
// NUEVO: Chequea solo injustificados
const justificadoSalida = viaje.retraso_salida_justificado || false;  // Del DB
const hayPuntoInjustif = viaje.puntos_control_detalle ? viaje.puntos_control_detalle.some(p => p.estado === 'tarde' && p.justificado === 'no') : false;
if ((retrasoSalida > 0 && !justificadoSalida) || hayPuntoInjustif) {
    hayInfraccion = true;
    // ... (resto del bloque igual: conductor, vehiculo, forEach, template)

    const conductor = viaje.conductores_rionegro?.nombre || 'Desconocido';
    const vehiculo = viaje.vehiculos_rionegro?.numero_interno || '000';
    const tabla = viaje.tablas_rionegro?.nombre_tabla || '00';
    const fecha = viaje.fecha_monitoreo;
    const fechaActual = new Date().toLocaleDateString('es-CO');  // DD/MM/YYYY local

    const puntosControlConfig = CONFIG_PUNTOS_CONTROL[viaje.ruta] || [];
    let mensajePuntos = '';


let horaAnterior = timeToMinutes(viaje.salida_real || '00:00');  // Base salida
let labelsPrevios = [];  // Rastrear labels

// El forEach
viaje.puntos_control_detalle.forEach(punto => {
    const configPunto = puntosControlConfig.find(pc => pc.id === punto.id);
    if (!configPunto) return;

    let labelAjustado = punto.label;
    if (viaje.ruta === 'La Ceja - Rionegro') {
        if (punto.label.includes('CIT-Los Memos')) labelAjustado = 'CIT-los Memos';
        else if (punto.label.includes('Los Memos-El Canadá')) labelAjustado = 'El Canada';
        else if (punto.label.includes('El Canadá-Ipanema')) labelAjustado = 'Ipanema desde La Ceja';
    } else if (viaje.ruta === 'Rionegro - La Ceja') {
        if (punto.label.includes('TUC-City Medic')) labelAjustado = 'TUC-City Medica';
        else if (punto.label.includes('City Medic-El Canadá')) labelAjustado = 'El Canada';
        else if (punto.label.includes('El Canada-Viva La Ceja')) labelAjustado = 'Viva La Ceja';
    }

    labelsPrevios.push(labelAjustado);
    
    // ✅ USAR hora real O proyección si no hay hora real
    const horaRealActual = timeToMinutes(punto.hora_real || punto.proyeccion || '00:00');

    if (punto.estado === 'tarde' && punto.justificado === 'no') {
        const tiempoEstablecido = configPunto.duracion;
        
        // ✅ CÁLCULO CORRECTO DEL SEGMENTO
        const tiempoRealSegmento = horaRealActual - horaAnterior;
        
        // ✅ CÁLCULO CORRECTO DE LA DEMORA (vs proyección)
        const proyeccionMins = timeToMinutes(punto.proyeccion || '00:00');
        const horaRealMins = timeToMinutes(punto.hora_real || '00:00');
        const demoraReal = horaRealMins - proyeccionMins;
        
        const horaProyectada = punto.proyeccion || 'N/A';
        const horaRealPunto = punto.hora_real || 'N/A';
        const puntoAnteriorLabel = labelsPrevios.length > 1 ? labelsPrevios[labelsPrevios.length - 2] : 'La Terminal';
        
        // ✅ VERIFICAR QUE SE USA tiempoRealSegmento EN EL MENSAJE
        mensajePuntos += `LLegada tarde al punto de control ${labelAjustado} (Hora proyectada: ${horaProyectada} | Hora real: ${horaRealPunto} | Se demoró ${demoraReal} min más), el cual tiene un tiempo establecido de viaje de ${tiempoEstablecido} Min, teniendo un tiempo de recorrido ${tiempoRealSegmento} minutos en este tramo desde ${puntoAnteriorLabel} ().\n`;
    }
    
    // ✅ ACTUALIZAR horaAnterior DESPUÉS del cálculo
    horaAnterior = horaRealActual;
});
    // Template por ruta (exacto a tu spec)
// ✅ TEMPLATE MEJORADO - Incluye TODA la información SIEMPRE
let template = '';
if (viaje.ruta === 'La Ceja - Rionegro') {
    template = `
Fecha del Viaje: ${fecha}
Conductor: ${conductor}
Vehículo: ${vehiculo}
Tabla: ${tabla}
Ruta: La Ceja - Rionegro

${retrasoSalida > 0 ? `Salida tarde de ${retrasoSalida} minutos (Hora programada: ${viaje.salida_programada} vs. Hora real: ${viaje.salida_real}).\n` : ''}

${mensajePuntos}

Le recordamos que la puntualidad es uno de nuestros valores corporativos, por tanto debemos respetarlos a cabalidad. Recuerde por favor cumplir los tiempos establecidos en cada una de las rutas de la empresa y salir conforme a la hora de salida programada por tabla. Esperamos que esta situación no se repita ya que en caso de reincidencia nos veremos en la obligación de notificarlo al área de gestión humana para iniciar un proceso disciplinario.

Muchas Gracias y Feliz dia! le desea: Atentamente,
El area de operaciones.`;
} else if (viaje.ruta === 'Rionegro - La Ceja') {
    template = `
Fecha del Viaje: ${fecha}
Conductor: ${conductor}
Vehículo: ${vehiculo}
Tabla: ${tabla}
Ruta: Rionegro - La Ceja

${retrasoSalida > 0 ? `Salida tarde de ${retrasoSalida} minutos (Hora programada: ${viaje.salida_programada} vs. Hora real: ${viaje.salida_real}).\n` : ''}

${mensajePuntos}

Le recordamos que la puntualidad es uno de nuestros valores corporativos, por tanto debemos respetarlos a cabalidad. Recuerde por favor cumplir los tiempos establecidos en cada una de las rutas de la empresa y salir conforme a la hora de salida programada por tabla. Esperamos que esta situación no se repita ya que en caso de reincidencia nos veremos en la obligación de notificarlo al área de gestión humana para iniciar un proceso disciplinario.

Muchas Gracias y Feliz dia! le desea: Atentamente,
El area de operaciones.`;
}

    advertencia = template.trim();
}

let celdaPuntos = `
    <td class="puntos-control-cell">
        <div class="puntos-control-summary">${puntosControlResumen}</div>
        <div class="puntos-control-popup">${puntosControlDetalle}</div>`;
if (hayInfraccion) {
    celdaPuntos += `<br><button class="btn-copiar-advertencia" data-advertencia="${encodeURIComponent(advertencia)}"><i class="fas fa-copy"></i> Copiar</button>`;
}
celdaPuntos += `</td>`;

const claseEstado = viaje.clasificacion_final === "A Tiempo" ? 'status-badge success' : 
    (viaje.clasificacion_final === "Novedad Leve" ? 'status-badge warning' : 'status-badge error');

            tablaHTML += `
                <tr>
                    <td>${viaje.id}</td>
                    <td>${viaje.fecha_monitoreo}</td>
                    <td>${viaje.tipo_monitoreo}</td>
                    <td>${conductor}</td>
                    <td>${vehiculo}</td>
                    <td>${tabla}</td>
                    <td>${viaje.ruta}</td>
                    <td>${viaje.salida_programada}</td>
                    <td>${viaje.salida_real}</td>
                    <td>${viaje.llegada_real}</td>
                    <td>${viaje.retraso_salida_justificado ? 'Sí' : 'No'}</td>
                    <td>${viaje.motivo_retraso_salida || 'N/A'}</td>
                    <td>${viaje.retraso_llegada_justificado ? 'Sí' : 'No'}</td>
                    <td>${viaje.motivo_retraso_llegada || 'N/A'}</td>
                    <td>${viaje.tiempo_total_viaje}</td>
                    <td>${viaje.tiempo_max_permitido}</td>
                    <td><span class="${claseEstado}">${viaje.clasificacion_final}</span></td>
                    <td>${viaje.detalle_clasificacion}</td>
                    ${celdaPuntos}
                </tr>`;
        });

        tablaHTML += `</tbody></table>`;
        tablaContainer.innerHTML = tablaHTML;

        // Eventos para botones (idéntico)
        document.querySelectorAll('.btn-copiar-advertencia').forEach(btn => {
            btn.addEventListener('click', () => {
                const mensaje = decodeURIComponent(btn.dataset.advertencia);
                navigator.clipboard.writeText(mensaje).then(() => alert('Mensaje de adevertencia, para el conductor, Copiado!')).catch(err => console.error(err));
            });
        });

        console.log('DEBUG: Tabla generada exitosamente.');
    } catch (error) {
        console.error('DEBUG: Error completo:', error);  // DEBUG detallado
        tablaContainer.innerHTML = `<div class="empty-state" style="color: var(--danger-color);">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error al cargar</h3>
            <p>${error.message}. Chequea consola y Supabase.</p>
        </div>`;
    } finally {
        btnCargar.disabled = false;
    }
}
// ===== INICIALIZACIÓN PRINCIPAL =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando aplicación...');
    
    cargarSelectores();
    inicializarNavegacion();
    inicializarEventosFormulario();
    inicializarBusquedas();
    inicializarEventosInformes();
    
    console.log('Aplicación inicializada correctamente');
});