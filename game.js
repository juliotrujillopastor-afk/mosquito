// --- Variables de Estado y Configuración ---
let isGameRunning = false;
let currentLevel = 1;
const LEVEL_DURATION = 30;
let bites = 0;
const MAX_BITES = 5;
// ⭐ NUEVA VARIABLE: Marcador de mosquitos aplastados ⭐
let score = 0;
const MOSQUITO_SPEED = 1000;
const BITE_DELAY = 1500;
const PAUSE_ON_BITE = 1000;
const PAUSE_ON_KILL = 1000;
const LANDING_PROBABILITY = 0.6;
const LEVEL_PAUSE_DURATION = 5000;

let timerInterval;
let timeLeft;

let activeMosquitos = [];

// Objetos de Audio (usando .wav según tu solicitud)
const flightSound = new Audio('sounds/flight_loop.wav');
flightSound.loop = true; 
flightSound.volume = 0.5; 
const biteSound = new Audio('sounds/bite.wav');
const smashSound = new Audio('sounds/smash.wav');
smashSound.volume = 0.8; 

// --- Referencias al DOM ---
const paleta = document.getElementById('paleta');
const gameContainer = document.getElementById('game-container');
const bitesDisplay = document.getElementById('bites');
const timerDisplay = document.getElementById('timer');
const levelDisplay = document.getElementById('level-display');
// ⭐ NUEVA REFERENCIA: Marcador de puntuación ⭐
const scoreDisplay = document.getElementById('score');

// --- Funciones de Mosquitos ---
function createMosquitoElement(id) {
    const newMosquito = document.createElement('div');
    newMosquito.id = 'mosquito-' + id;
    newMosquito.className = 'mosquito';
    gameContainer.appendChild(newMosquito);

    newMosquito.flyTimeout = null;
    newMosquito.biteTimeout = null;
    newMosquito.bitePauseTimeout = null;
    newMosquito.killPauseTimeout = null;
    newMosquito.hittable = false;

    return newMosquito;
}

function manageMosquitoLife(mosquitoElement) {
    if (!isGameRunning) {
        flightSound.pause();
        return;
    }

    // Limpiar temporizadores
    clearTimeout(mosquitoElement.flyTimeout);
    clearTimeout(mosquitoElement.biteTimeout);
    clearTimeout(mosquitoElement.bitePauseTimeout);
    clearTimeout(mosquitoElement.killPauseTimeout);

    mosquitoElement.hittable = false;

    const containerWidth = gameContainer.offsetWidth;
    const containerHeight = gameContainer.offsetHeight;
    const mosqSize = mosquitoElement.offsetWidth || 40;

    const newX = Math.random() * (containerWidth - mosqSize);
    const newY = Math.random() * (containerHeight - mosqSize);

    mosquitoElement.style.left = newX + 'px';
    mosquitoElement.style.top = newY + 'px';
    mosquitoElement.classList.remove('landed', 'bitten', 'smashed');

    if (Math.random() < LANDING_PROBABILITY) {
        // Aterriza y pica
        if (flightSound.paused) {
            flightSound.play().catch(e => console.log('Autoplay blocked:', e));
        }

        mosquitoElement.flyTimeout = setTimeout(() => {
            if (!isGameRunning) return;

            flightSound.pause();

            mosquitoElement.classList.add('landed');
            mosquitoElement.hittable = true;

            mosquitoElement.biteTimeout = setTimeout(() => {
                if (mosquitoElement.hittable) {
                    checkBite(mosquitoElement);
                }
            }, BITE_DELAY);
        }, MOSQUITO_SPEED);
    } else {
        // Sigue volando
        if (flightSound.paused) {
            flightSound.play().catch(e => console.log('Autoplay blocked:', e));
        }

        mosquitoElement.flyTimeout = setTimeout(() => {
            manageMosquitoLife(mosquitoElement);
        }, MOSQUITO_SPEED);
    }
}

function checkBite(mosquitoElement) {
    if (!isGameRunning || !mosquitoElement.hittable) return;

    biteSound.currentTime = 0; 
    biteSound.play();

    bites++;
    bitesDisplay.textContent = `${bites} / ${MAX_BITES}`;

    mosquitoElement.hittable = false; 
    mosquitoElement.classList.remove('landed'); 
    mosquitoElement.classList.add('bitten');

    if (bites >= MAX_BITES) {
        endGame('¡El mosquito te ganó! PERDISTE.');
        return;
    }

    mosquitoElement.bitePauseTimeout = setTimeout(() => {
        if (isGameRunning) {
            manageMosquitoLife(mosquitoElement);
        }
    }, PAUSE_ON_BITE);
}

function handleMosquitoSmash(mosquitoElement) {
    // AUDIO: Sonido de Aplastado
    smashSound.currentTime = 0;
    smashSound.play();
    
    // ⭐ LÓGICA DE PUNTUACIÓN: Incrementar el marcador ⭐
    score++;
    scoreDisplay.textContent = score;

    flightSound.pause();

    clearTimeout(mosquitoElement.flyTimeout);
    clearTimeout(mosquitoElement.biteTimeout);
    clearTimeout(mosquitoElement.bitePauseTimeout);

    mosquitoElement.hittable = false;

    mosquitoElement.classList.remove('landed', 'bitten');
    mosquitoElement.classList.add('smashed');

    mosquitoElement.killPauseTimeout = setTimeout(() => {
        mosquitoElement.remove();
        activeMosquitos = activeMosquitos.filter(m => m !== mosquitoElement);

        if (isGameRunning) {
            const newMosquito = createMosquitoElement(Date.now());
            activeMosquitos.push(newMosquito);
            manageMosquitoLife(newMosquito);
        }
    }, PAUSE_ON_KILL);
}

// --- Niveles ---
function startLevel() {
    // Resetear picaduras al inicio de cada nivel
    bites = 0;
    bitesDisplay.textContent = `${bites} / ${MAX_BITES}`;

    const targetMosquitos = currentLevel;
    levelDisplay.textContent = currentLevel;

    // Limpiar mosquitos anteriores
    activeMosquitos.forEach(m => {
        clearTimeout(m.flyTimeout);
        clearTimeout(m.biteTimeout);
        clearTimeout(m.bitePauseTimeout);
        clearTimeout(m.killPauseTimeout);
        m.remove();
    });
    activeMosquitos = [];

    flightSound.play().catch(e => console.log('Autoplay blocked:', e));

    for (let i = 0; i < targetMosquitos; i++) {
        const newMosquito = createMosquitoElement(i);
        activeMosquitos.push(newMosquito);
        manageMosquitoLife(newMosquito);
    }

    timeLeft = LEVEL_DURATION;
    timerDisplay.textContent = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            nextLevel();
        }
    }, 1000);
}

function nextLevel() {
    if (isGameRunning) {
        
        flightSound.pause();

        activeMosquitos.forEach(m => {
            clearTimeout(m.flyTimeout);
            clearTimeout(m.biteTimeout);
            clearTimeout(m.bitePauseTimeout);
            clearTimeout(m.killPauseTimeout);
            m.remove();
        });
        activeMosquitos = [];

        currentLevel++;
        
        showMessage(`¡Nivel ${currentLevel - 1} superado! Preparando Nivel ${currentLevel}.`);
        
        setTimeout(() => {
            if (isGameRunning) {
                startLevel();
            }
        }, LEVEL_PAUSE_DURATION); 
    }
}

// --- Interacción: Soporte Ratón y Táctil ---

function updatePaletaPosition(e) {
    if (!isGameRunning) return;

    // Detectar si es un evento táctil o de ratón
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = gameContainer.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    paleta.style.left = x - paleta.offsetWidth / 2 + 'px';
    paleta.style.top = y - paleta.offsetHeight / 2 + 'px';
}

// Evento para Ratón (PC)
gameContainer.addEventListener('mousemove', updatePaletaPosition);

// Evento para Táctil (Móvil)
gameContainer.addEventListener('touchmove', updatePaletaPosition);


gameContainer.addEventListener('click', (e) => {
    if (!isGameRunning) return;

    const rect = gameContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    for (let i = 0; i < activeMosquitos.length; i++) {
        const mosquitoElement = activeMosquitos[i];
        if (!mosquitoElement.hittable) continue;

        const mosqX = mosquitoElement.offsetLeft;
        const mosqY = mosquitoElement.offsetTop;
        const mosqSize = mosquitoElement.offsetWidth;

        const mosqCenterX = mosqX + mosqSize / 2;
        const mosqCenterY = mosqY + mosqSize / 2;
        const radius = mosqSize / 2;

        const distance = Math.sqrt(
            Math.pow(clickX - mosqCenterX, 2) +
            Math.pow(clickY - mosqCenterY, 2)
        );

        if (distance < radius) {
            handleMosquitoSmash(mosquitoElement);
            return;
        }
    }
});


// --- Inicio y Fin del Juego ---
window.startGame = function() {
    if (isGameRunning) return;

    isGameRunning = true;
    currentLevel = 1;
    bites = 0;
    // ⭐ Inicializar marcador de puntuación ⭐
    score = 0; 
    
    bitesDisplay.textContent = `${bites}/${MAX_BITES}`;
    levelDisplay.textContent = currentLevel;
    scoreDisplay.textContent = score;

    paleta.style.display = 'block';

    startLevel();
}

function endGame(message) {
    isGameRunning = false;
    currentLevel = 1;

    clearInterval(timerInterval);

    flightSound.pause();

    activeMosquitos.forEach(m => {
        clearTimeout(m.flyTimeout);
        clearTimeout(m.biteTimeout);
        clearTimeout(m.bitePauseTimeout);
        clearTimeout(m.killPauseTimeout);
        m.remove();
    });
    activeMosquitos = [];

    paleta.style.display = 'none';

    showMessage(`FIN DEL JUEGO. ${message} Total Aplastados: ${score}`);
}

// --- Mensajes en pantalla (sin cambios) ---
function showMessage(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = msg;
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.padding = '20px 30px';
    messageDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    messageDiv.style.color = '#fff';
    messageDiv.style.fontSize = '18px';
    messageDiv.style.borderRadius = '10px';
    messageDiv.style.zIndex = '999';
    messageDiv.style.textAlign = 'center';
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, LEVEL_PAUSE_DURATION - 500); 
}