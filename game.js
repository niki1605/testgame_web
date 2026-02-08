// Единая версия игры для всех устройств
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Элементы меню и управления
const menuBtn = document.getElementById('menuBtn');
const sidePanel = document.getElementById('sidePanel');
const closePanel = document.getElementById('closePanel');

// Элементы статистики (панель)
const livesElement = document.getElementById('lives');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');

// Быстрая статистика (на игровом поле)
const quickLives = document.getElementById('quickLives');
const quickScore = document.getElementById('quickScore');
const quickLevel = document.getElementById('quickLevel');

// Элементы управления
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const shareBtn = document.getElementById('shareBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

// Настройки
const soundToggle = document.getElementById('soundToggle');
const vibrateToggle = document.getElementById('vibrateToggle');

// Game over элементы
const gameOverModal = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const finalLevelElement = document.getElementById('finalLevel');
const bestScoreElement = document.getElementById('bestScore');

// Размеры canvas (полноэкранный)
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Обновляем позицию игрока и планеты
    if (player) {
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - 100;
    }
    if (gameSettings) {
        gameSettings.planetY = canvas.height - 50;
        gameSettings.planetRadius = Math.min(80, canvas.width / 8);
    }
}

// Игровые переменные
let game = {
    running: false,
    paused: false,
    score: 0,
    lives: 3,
    level: 1,
    asteroids: [],
    bullets: [],
    particles: [],
    lastAsteroidTime: 0,
    asteroidInterval: 1500,
    soundEnabled: true,
    vibrationEnabled: true,
    panelOpen: false,
    wasPausedBeforePanel: false,
    isDragging: false,
    dragStartX: 0,
    lastShootTime: 0, // время последнего выстрела для предотвращения спама
    shootCooldownTime: 300 // задержка между выстрелами в мс
};

// Лучший результат
let bestScore = localStorage.getItem('bestScore') || 0;
bestScoreElement.textContent = bestScore;

// Игрок
const player = {
    x: 0,
    y: 0,
    width: 50,
    height: 60,
    speed: 8,
    color: '#00e5ff',
    shootCooldown: 0
};

// Настройки игры
const gameSettings = {
    bgStars: [],
    planetRadius: 80,
    planetY: 0
};

// Инициализация игры
function init() {
    // Инициализация canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', function() {
        setTimeout(resizeCanvas, 100);
    });
    
    // Настройка планеты
    gameSettings.planetY = canvas.height - 50;
    gameSettings.planetRadius = Math.min(80, canvas.width / 8);
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 100;
    
    // Инициализация фона
    initBackground();
    
    // Настройка обработчиков
    setupEventListeners();
    
    // Запуск игрового цикла
    gameLoop();
    
    // Автоматический старт игры
    setTimeout(startGame, 1000);
}

// Инициализация фона
function initBackground() {
    gameSettings.bgStars = [];
    const starCount = Math.min(100, Math.floor(canvas.width * canvas.height / 500));
    
    for (let i = 0; i < starCount; i++) {
        gameSettings.bgStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.3 + 0.1,
            brightness: Math.random() * 0.5 + 0.3
        });
    }
}

// Настройка обработчиков событий (единые для всех устройств)
function setupEventListeners() {
    // Открытие/закрытие панели - автоматическая пауза
    menuBtn.addEventListener('click', togglePanel);
    closePanel.addEventListener('click', closePanelHandler);
    
    // Клик вне панели закрывает ее
    document.addEventListener('click', function(e) {
        if (game.running && game.panelOpen && 
            !sidePanel.contains(e.target) && 
            e.target !== menuBtn && 
            !menuBtn.contains(e.target)) {
            closePanelHandler();
        }
    });
    
    // Предотвращение закрытия при клике внутри панели
    sidePanel.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // УПРАВЛЕНИЕ НА ПК И МОБИЛЬНЫХ (единое)
    
    // Мышь и тач для движения
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);
    
    // КЛИК/ТАП ТОЛЬКО ДЛЯ СТРЕЛЬБЫ
    canvas.addEventListener('click', handleShoot);
    canvas.addEventListener('touchend', handleShootTouch);
    
    // Клавиатура для ПК (дополнительное управление)
    window.addEventListener('keydown', handleKeyDown);
    
    // Основные кнопки игры
    startBtn.addEventListener('click', function() {
        startGame();
        closePanelHandler();
    });
    
    restartBtn.addEventListener('click', function() {
        startGame();
        closePanelHandler();
    });
    
    playAgainBtn.addEventListener('click', startGame);
    shareBtn.addEventListener('click', shareScore);
    
    // Полноэкранный режим
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Настройки
    soundToggle.addEventListener('change', toggleSound);
    vibrateToggle.addEventListener('change', toggleVibration);
    
    // Предотвращение масштабирования
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    });
    
    // Обработка контекстного меню (правый клик)
    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
}

// Обработчики мыши (для ПК) - ТОЛЬКО ДЛЯ ДВИЖЕНИЯ
function handleMouseDown(e) {
    if (game.panelOpen || !game.running) return;
    
    e.preventDefault();
    game.isDragging = true;
    game.dragStartX = e.clientX;
}

function handleMouseMove(e) {
    if (!game.isDragging || game.panelOpen || !game.running || game.paused) return;
    
    e.preventDefault();
    const deltaX = e.clientX - game.dragStartX;
    
    // Двигаем игрока по горизонтали
    player.x += deltaX * 0.8;
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    
    game.dragStartX = e.clientX;
}

function handleMouseUp(e) {
    game.isDragging = false;
}

// Обработчики тача (для мобильных) - ТОЛЬКО ДЛЯ ДВИЖЕНИЯ
function handleTouchStart(e) {
    if (game.panelOpen || !game.running) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    game.isDragging = true;
    game.dragStartX = touch.clientX;
}

function handleTouchMove(e) {
    if (!game.isDragging || game.panelOpen || !game.running || game.paused) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - game.dragStartX;
    
    // Двигаем игрока по горизонтали
    player.x += deltaX * 0.8;
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    
    game.dragStartX = touch.clientX;
}

function handleTouchEnd(e) {
    game.isDragging = false;
}

// СТРЕЛЬБА ПРИ КЛИКЕ (для ПК)
function handleShoot(e) {
    if (game.panelOpen || !game.running || game.paused) return;
    
    e.preventDefault();
    
    // Проверяем, был ли это драг или клик
    // Если двигали - не стреляем
    if (Math.abs(e.clientX - game.dragStartX) > 10) return;
    
    // Проверяем кулдаун
    const currentTime = Date.now();
    if (currentTime - game.lastShootTime < game.shootCooldownTime) return;
    
    game.lastShootTime = currentTime;
    shootBullet();
}

// СТРЕЛЬБА ПРИ ТАПЕ (для мобильных)
function handleShootTouch(e) {
    if (game.panelOpen || !game.running || game.paused) return;
    
    e.preventDefault();
    
    // Проверяем кулдаун
    const currentTime = Date.now();
    if (currentTime - game.lastShootTime < game.shootCooldownTime) return;
    
    game.lastShootTime = currentTime;
    shootBullet();
}

// Управление клавиатурой (для ПК)
function handleKeyDown(e) {
    if (game.panelOpen || !game.running || game.paused) return;
    
    switch(e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            player.x = Math.max(0, player.x - player.speed);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            player.x = Math.min(canvas.width - player.width, player.x + player.speed);
            break;
        case ' ':
            // Проверяем кулдаун
            const currentTime = Date.now();
            if (currentTime - game.lastShootTime < game.shootCooldownTime) return;
            
            game.lastShootTime = currentTime;
            shootBullet();
            e.preventDefault();
            break;
        case 'Escape':
            if (game.panelOpen) {
                closePanelHandler();
            } else {
                togglePanel();
            }
            break;
    }
}

// Управление панелью с автоматической паузой
function togglePanel() {
    if (game.panelOpen) {
        closePanelHandler();
    } else {
        openPanel();
    }
}

function openPanel() {
    // Запоминаем состояние паузы перед открытием
    game.wasPausedBeforePanel = game.paused;
    
    // Ставим игру на паузу при открытии меню
    if (game.running && !game.paused) {
        game.paused = true;
        showMessage('Игра на паузе', '#ff9800', 1000);
    }
    
    sidePanel.classList.add('open');
    game.panelOpen = true;
    document.body.classList.add('no-scroll');
}

function closePanelHandler() {
    sidePanel.classList.remove('open');
    game.panelOpen = false;
    document.body.classList.remove('no-scroll');
    
    // Восстанавливаем состояние паузы после закрытия
    // Если игра не была на паузе до открытия меню - продолжаем
    if (game.running && !game.wasPausedBeforePanel) {
        game.paused = false;
    }
}

// Вибрация
function vibrate(duration) {
    if (game.vibrationEnabled && navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

function toggleSound() {
    game.soundEnabled = soundToggle.checked;
}

function toggleVibration() {
    game.vibrationEnabled = vibrateToggle.checked;
}

// Полноэкранный режим
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Ошибка полноэкранного режима: ${err.message}`);
        });
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i><span>Выйти</span>';
    } else {
        document.exitFullscreen();
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i><span>Полный экран</span>';
    }
}

// Обновление статистики на всех элементах
function updateStats() {
    livesElement.textContent = game.lives;
    scoreElement.textContent = game.score;
    levelElement.textContent = game.level;
    
    quickLives.textContent = game.lives;
    quickScore.textContent = game.score;
    quickLevel.textContent = game.level;
}

// Стрельба
function shootBullet() {
    if (!game.running || game.paused || game.panelOpen) return;
    
    game.bullets.push({
        x: player.x + player.width / 2 - 3,
        y: player.y,
        width: 6,
        height: 15,
        speed: 10,
        color: '#ffeb3b'
    });
    
    player.shootCooldown = 12;
    vibrate(50);
}

// Создание астероида
function createAsteroid() {
    const size = Math.random() * 30 + 20;
    return {
        x: Math.random() * (canvas.width - size),
        y: -size,
        size: size,
        speed: Math.random() * 2 + 1 + game.level * 0.3,
        color: `hsl(${Math.random() * 30 + 20}, 70%, 40%)`,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        vertices: Math.floor(Math.random() * 3) + 6
    };
}

// Создание частиц
function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        game.particles.push({
            x: x,
            y: y,
            size: Math.random() * 4 + 2,
            speedX: (Math.random() - 0.5) * 8,
            speedY: (Math.random() - 0.5) * 8,
            color: color,
            life: 1,
            decay: Math.random() * 0.05 + 0.02
        });
    }
}

// Проверка столкновений
function checkCollisions() {
    // Пули с астероидами
    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const bullet = game.bullets[i];
        
        for (let j = game.asteroids.length - 1; j >= 0; j--) {
            const asteroid = game.asteroids[j];
            
            const dx = (bullet.x + bullet.width / 2) - (asteroid.x + asteroid.size / 2);
            const dy = (bullet.y + bullet.height / 2) - (asteroid.y + asteroid.size / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < asteroid.size / 2 + bullet.width / 2) {
                // Столкновение!
                createParticles(
                    asteroid.x + asteroid.size / 2,
                    asteroid.y + asteroid.size / 2,
                    15,
                    asteroid.color
                );
                
                game.bullets.splice(i, 1);
                game.asteroids.splice(j, 1);
                game.score += Math.floor(100 - asteroid.size);
                updateStats();
                vibrate(100);
                
                // Проверяем уровень
                if (game.score >= game.level * 1000) {
                    game.level++;
                    game.asteroidInterval = Math.max(300, 1500 - game.level * 100);
                    updateStats();
                    showMessage(`Уровень ${game.level}!`, '#00e5ff', 2000);
                }
                break;
            }
        }
    }
    
    // Астероиды с игроком
    for (let i = game.asteroids.length - 1; i >= 0; i--) {
        const asteroid = game.asteroids[i];
        
        if (
            asteroid.x + asteroid.size > player.x &&
            asteroid.x < player.x + player.width &&
            asteroid.y + asteroid.size > player.y &&
            asteroid.y < player.y + player.height
        ) {
            createParticles(
                asteroid.x + asteroid.size / 2,
                asteroid.y + asteroid.size / 2,
                20,
                '#ff0000'
            );
            
            game.asteroids.splice(i, 1);
            game.lives--;
            updateStats();
            vibrate(200);
            
            if (game.lives <= 0) {
                endGame();
            } else {
                showMessage('-1 жизнь!', '#ff5252', 1500);
            }
        }
    }
    
    // Астероиды с планетой
    for (let i = game.asteroids.length - 1; i >= 0; i--) {
        const asteroid = game.asteroids[i];
        
        if (asteroid.y + asteroid.size > canvas.height - gameSettings.planetRadius) {
            const dx = (asteroid.x + asteroid.size / 2) - (canvas.width / 2);
            const dy = (asteroid.y + asteroid.size / 2) - gameSettings.planetY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < gameSettings.planetRadius + asteroid.size / 2) {
                createParticles(
                    asteroid.x + asteroid.size / 2,
                    asteroid.y + asteroid.size / 2,
                    15,
                    '#ff5722'
                );
                
                game.asteroids.splice(i, 1);
                game.lives--;
                updateStats();
                vibrate(200);
                
                if (game.lives <= 0) {
                    endGame();
                } else {
                    showMessage('Планета повреждена!', '#ff9800', 1500);
                }
            }
        }
    }
}

// Игровая логика
function update() {
    if (!game.running || game.paused) return;
    
    // Обновление перезарядки
    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }
    
    // Создание астероидов
    const currentTime = Date.now();
    if (currentTime - game.lastAsteroidTime > game.asteroidInterval) {
        game.asteroids.push(createAsteroid());
        game.lastAsteroidTime = currentTime;
    }
    
    // Обновление астероидов
    for (let i = game.asteroids.length - 1; i >= 0; i--) {
        const asteroid = game.asteroids[i];
        asteroid.y += asteroid.speed;
        asteroid.rotation += asteroid.rotationSpeed;
        
        if (asteroid.y > canvas.height + asteroid.size) {
            game.asteroids.splice(i, 1);
        }
    }
    
    // Обновление пуль
    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const bullet = game.bullets[i];
        bullet.y -= bullet.speed;
        
        if (bullet.y < -bullet.height) {
            game.bullets.splice(i, 1);
        }
    }
    
    // Проверка столкновений
    checkCollisions();
    
    // Обновление частиц
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.life -= p.decay;
        
        if (p.life <= 0) {
            game.particles.splice(i, 1);
        }
    }
}

// Отрисовка фона
function drawBackground() {
    // Космический фон
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000428');
    gradient.addColorStop(1, '#004e92');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Звезды
    gameSettings.bgStars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Движение звезд
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
    
    // Планета внизу
    const planetGradient = ctx.createRadialGradient(
        canvas.width / 2, gameSettings.planetY, 0,
        canvas.width / 2, gameSettings.planetY, gameSettings.planetRadius
    );
    planetGradient.addColorStop(0, '#4a148c');
    planetGradient.addColorStop(1, '#1a237e');
    
    ctx.beginPath();
    ctx.arc(canvas.width / 2, gameSettings.planetY, gameSettings.planetRadius, 0, Math.PI * 2);
    ctx.fillStyle = planetGradient;
    ctx.fill();
    
    // Атмосфера планеты
    ctx.beginPath();
    ctx.arc(canvas.width / 2, gameSettings.planetY, gameSettings.planetRadius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();
}

// Отрисовка астероида
function drawAsteroid(asteroid) {
    ctx.save();
    ctx.translate(asteroid.x + asteroid.size / 2, asteroid.y + asteroid.size / 2);
    ctx.rotate(asteroid.rotation);
    
    ctx.fillStyle = asteroid.color;
    ctx.beginPath();
    for (let i = 0; i < asteroid.vertices; i++) {
        const angle = (i / asteroid.vertices) * Math.PI * 2;
        const radius = asteroid.size / 2 + Math.sin(angle * 3) * 5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    
    // Детали на астероиде
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (asteroid.size / 3);
        const size = Math.random() * 5 + 2;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

// Отрисовка игрока
function drawPlayer() {
    // Корпус корабля
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // Кабина
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + 15, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Двигатели
    ctx.fillStyle = '#ff5722';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 4, player.y + player.height, 8, 0, Math.PI);
    ctx.arc(player.x + 3 * player.width / 4, player.y + player.height, 8, 0, Math.PI);
    ctx.fill();
    
    // Эффект огня из двигателей
    const fireHeight = 15 + Math.sin(Date.now() / 100) * 5;
    const gradient = ctx.createLinearGradient(
        player.x, player.y + player.height,
        player.x, player.y + player.height + fireHeight
    );
    gradient.addColorStop(0, '#ff9800');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(player.x + player.width / 4 - 8, player.y + player.height, 16, fireHeight);
    ctx.fillRect(player.x + 3 * player.width / 4 - 8, player.y + player.height, 16, fireHeight);
}

// Отрисовка пули
function drawBullet(bullet) {
    // Основная часть пули
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    
    // Свечение
    const gradient = ctx.createRadialGradient(
        bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 0,
        bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 15
    );
    gradient.addColorStop(0, 'rgba(255, 235, 59, 0.8)');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 15, 0, Math.PI * 2);
    ctx.fill();
}

// Отрисовка игры
function draw() {
    // Очистка
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Фон
    drawBackground();
    
    // Астероиды
    game.asteroids.forEach(drawAsteroid);
    
    // Пули
    game.bullets.forEach(drawBullet);
    
    // Игрок
    drawPlayer();
    
    // Частицы
    game.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    // UI на canvas (пауза при открытой панели)
    if (game.paused || game.panelOpen) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        
        if (game.panelOpen) {
            ctx.fillText('МЕНЮ ОТКРЫТО', canvas.width / 2, canvas.height / 2);
            ctx.font = 'bold 18px Arial';
            ctx.fillText('Игра на паузе', canvas.width / 2, canvas.height / 2 + 40);
        } else {
            ctx.fillText('ПАУЗА', canvas.width / 2, canvas.height / 2);
            ctx.font = 'bold 18px Arial';
            ctx.fillText('Нажмите меню для продолжения', canvas.width / 2, canvas.height / 2 + 40);
        }
        ctx.textAlign = 'left';
    }
}

// Игровой цикл
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Старт игры
function startGame() {
    game.running = true;
    game.paused = false;
    game.score = 0;
    game.lives = 3;
    game.level = 1;
    game.asteroids = [];
    game.bullets = [];
    game.particles = [];
    game.asteroidInterval = 1500;
    game.panelOpen = false;
    game.wasPausedBeforePanel = false;
    game.lastShootTime = 0;
    
    player.x = canvas.width / 2 - player.width / 2;
    player.shootCooldown = 0;
    
    // Обновление статистики
    updateStats();
    
    // Закрытие панели при старте игры
    sidePanel.classList.remove('open');
    document.body.classList.remove('no-scroll');
    
    gameOverModal.style.display = 'none';
    
    // Вибрация при старте
    vibrate(100);
    
    // Показать подсказку
    showMessage('Уничтожай астероиды!', '#00e5ff', 2000);
}

// Конец игры
function endGame() {
    game.running = false;
    game.paused = true;
    
    // Обновляем лучший результат
    if (game.score > bestScore) {
        bestScore = game.score;
        localStorage.setItem('bestScore', bestScore);
        bestScoreElement.textContent = bestScore;
        showMessage('Новый рекорд!', '#ffeb3b', 3000);
    }
    
    // Показываем модальное окно
    finalScoreElement.textContent = game.score;
    finalLevelElement.textContent = game.level;
    gameOverModal.style.display = 'flex';
    
    // Длительная вибрация
    vibrate([100, 50, 100, 50, 100]);
}

// Поделиться результатом
function shareScore() {
    const text = `Я набрал ${game.score} очков в игре "Космический защитник"! Сможешь побить мой рекорд?`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Космический защитник',
            text: text,
            url: window.location.href
        });
    } else {
        // Копируем в буфер обмена
        navigator.clipboard.writeText(text).then(() => {
            showMessage('Результат скопирован в буфер!', '#4caf50', 2000);
        });
    }
}

// Показать сообщение
function showMessage(text, color, duration = 2000) {
    // Создаем элемент для сообщения
    const message = document.createElement('div');
    message.textContent = text;
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.85);
        color: ${color};
        padding: 15px 30px;
        border-radius: 10px;
        font-weight: bold;
        font-size: 1.2rem;
        z-index: 1001;
        border: 2px solid ${color};
        animation: fadeInOut ${duration}ms ease-in-out;
        white-space: nowrap;
        max-width: 90%;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    
    // Добавляем стили для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -60%); }
            20% { opacity: 1; transform: translate(-50%, -50%); }
            80% { opacity: 1; transform: translate(-50%, -50%); }
            100% { opacity: 0; transform: translate(-50%, -40%); }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(message);
    
    // Удаляем сообщение через указанное время
    setTimeout(() => {
        message.remove();
        style.remove();
    }, duration);
}

// Инициализация при загрузке
window.addEventListener('load', init);

// Telegram WebApp интеграция
if (window.Telegram && window.Telegram.WebApp) {
    // Расширяем на весь экран в Telegram
    Telegram.WebApp.expand();
    
    // Меняем цвет кнопок под тему Telegram
    Telegram.WebApp.ready();
    
    // Обработка закрытия
    Telegram.WebApp.onEvent('viewportChanged', function(e) {
        resizeCanvas();
    });
}