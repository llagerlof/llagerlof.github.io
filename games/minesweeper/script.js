// Game constants
const BOARD_SIZES = {
    small: { rows: 8, cols: 8, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    large: { rows: 24, cols: 24, mines: 99 }
};

// Game state
let gameBoard = [];
let currentSize = 'small';
let minesCount = 0;
let flagsPlaced = 0;
let timer = 0;
let timerInterval;
let isGameOver = false;
let isFirstClick = true;
let isMobile = false;
let lastClickedTile = null; // Track the last clicked tile

// Check if the device is mobile
function checkMobile() {
    return window.matchMedia("(max-width: 768px)").matches || 
           ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0);
}

// IndexedDB setup
const DB_NAME = 'minesweeperDB';
const DB_VERSION = 1;
const SCORES_STORE = 'highScores';
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB initialized successfully');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(SCORES_STORE)) {
                const store = db.createObjectStore(SCORES_STORE, { autoIncrement: true });
                store.createIndex('boardSize', 'boardSize', { unique: false });
                store.createIndex('time', 'time', { unique: false });
            }
        };
    });
}

// Save score to IndexedDB
function saveScore(name, time, boardSize) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction([SCORES_STORE], 'readwrite');
        const store = transaction.objectStore(SCORES_STORE);
        
        const score = {
            name: name,
            time: time,
            boardSize: boardSize,
            date: new Date()
        };
        
        const request = store.add(score);
        
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// Get high scores from IndexedDB
function getHighScores(boardSize) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction([SCORES_STORE], 'readonly');
        const store = transaction.objectStore(SCORES_STORE);
        const index = store.index('boardSize');
        const request = index.openCursor(IDBKeyRange.only(boardSize));
        
        const scores = [];
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                scores.push(cursor.value);
                cursor.continue();
            } else {
                // Sort by time (ascending)
                scores.sort((a, b) => a.time - b.time);
                resolve(scores.slice(0, 10)); // Get top 10 scores
            }
        };
        
        request.onerror = (event) => reject(event.target.error);
    });
}

// DOM Elements
const screens = {
    splash: document.getElementById('splash-screen'),
    setup: document.getElementById('setup-screen'),
    game: document.getElementById('game-screen'),
    gameOver: document.getElementById('game-over-screen'),
    highScores: document.getElementById('highscores-screen')
};

// Calculate the optimal tile size based on window dimensions and board size
function calculateTileSize(rows, cols) {
    // Get available space for the board
    const gameScreen = document.getElementById('game-screen');
    const gameHeader = document.querySelector('.game-header');
    const gameControls = document.querySelector('.game-controls');
    
    // Calculate available height and width
    const availableHeight = window.innerHeight - 
                           (gameHeader.offsetHeight + 
                           gameControls.offsetHeight + 
                           100); // Extra padding and margins
    
    const availableWidth = Math.min(window.innerWidth - 40, gameScreen.offsetWidth - 40);
    
    // Calculate maximum tile size that would fit
    const maxTileHeight = Math.floor(availableHeight / rows);
    const maxTileWidth = Math.floor(availableWidth / cols);
    
    // Use the smaller dimension to ensure square tiles
    let tileSize = Math.min(maxTileHeight, maxTileWidth);
    
    // Set a minimum tile size
    tileSize = Math.max(tileSize, 18);
    
    // Set a maximum tile size
    tileSize = Math.min(tileSize, 40);
    
    return tileSize;
}

// Game board setup
function createBoard(rows, cols) {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    
    // Calculate the optimal tile size
    const tileSize = calculateTileSize(rows, cols);
    
    // Set CSS variables for tile size
    document.documentElement.style.setProperty('--tile-size', `${tileSize}px`);
    
    // Add class for board size
    board.className = '';
    board.classList.add(`board-${currentSize}`);
    
    // Set grid template columns
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    
    gameBoard = Array(rows).fill().map(() => Array(cols).fill(0));
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.dataset.row = row;
            tile.dataset.col = col;
            
            // Add event listeners based on device type
            if (isMobile) {
                // For mobile: tap to reveal, long press to flag
                let timer;
                
                tile.addEventListener('touchstart', (e) => {
                    if (isGameOver) return;
                    
                    timer = setTimeout(() => {
                        // Long press: flag/unflag
                        handleFlag(row, col);
                        timer = null;
                    }, 500);
                });
                
                tile.addEventListener('touchend', (e) => {
                    if (isGameOver) return;
                    
                    if (timer) {
                        // Short tap: reveal
                        clearTimeout(timer);
                        handleReveal(row, col, true);
                    }
                });
                
                // Prevent context menu on long press
                tile.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                });
            } else {
                // For desktop: left click to reveal, right click to flag
                tile.addEventListener('click', () => {
                    if (isGameOver) return;
                    handleReveal(row, col, true);
                });
                
                tile.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (isGameOver) return;
                    handleFlag(row, col);
                });
            }
            
            board.appendChild(tile);
        }
    }
    
    // Make sure the board fits on screen after rendering
    setTimeout(() => {
        adjustBoardIfNeeded(rows, cols);
    }, 0);
}

// Adjust board if it doesn't fit the screen
function adjustBoardIfNeeded(rows, cols) {
    const board = document.getElementById('game-board');
    const windowHeight = window.innerHeight;
    const boardRect = board.getBoundingClientRect();
    
    // Check if board exceeds window boundaries
    if (boardRect.height > windowHeight * 0.8 || boardRect.width > window.innerWidth * 0.9) {
        // Recalculate tile size with smaller constraints
        const tileSize = calculateTileSize(rows, cols) - 2;
        document.documentElement.style.setProperty('--tile-size', `${tileSize}px`);
    }
}

// Place mines randomly on the board (after first click)
function placeMines(rows, cols, mines, firstClickRow, firstClickCol) {
    let minesPlaced = 0;
    
    while (minesPlaced < mines) {
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);
        
        // Ensure we don't place a mine at the first click or where a mine already exists
        if ((row !== firstClickRow || col !== firstClickCol) && gameBoard[row][col] !== -1) {
            gameBoard[row][col] = -1; // -1 represents a mine
            minesPlaced++;
        }
    }
    
    // Calculate numbers for each tile
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            // Skip mines
            if (gameBoard[row][col] === -1) continue;
            
            // Count adjacent mines
            let count = 0;
            for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
                for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
                    if (gameBoard[r][c] === -1) count++;
                }
            }
            
            gameBoard[row][col] = count;
        }
    }
}

// Handle tile reveal
function handleReveal(row, col, isUserClick = true) {
    const tile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
    
    // Don't reveal if the tile is already revealed or flagged
    if (tile.classList.contains('revealed') || tile.classList.contains('flagged')) {
        return;
    }
    
    // Start the game on first click
    if (isFirstClick) {
        isFirstClick = false;
        startTimer();
        
        const { rows, cols, mines } = BOARD_SIZES[currentSize];
        placeMines(rows, cols, mines, row, col);
    }
    
    // Only update the last-clicked indicator for direct user clicks
    if (isUserClick) {
        // Remove the last-clicked indicator from previous tile
        if (lastClickedTile) {
            lastClickedTile.classList.remove('last-clicked');
        }
        
        // Set this tile as the last clicked
        tile.classList.add('last-clicked');
        lastClickedTile = tile;
    }
    
    // Reveal the tile
    tile.classList.add('revealed');
    
    // If it's a mine, game over
    if (gameBoard[row][col] === -1) {
        tile.classList.add('mine');
        gameOver(false);
        return;
    }
    
    // If it's a number, show it
    if (gameBoard[row][col] > 0) {
        tile.textContent = gameBoard[row][col];
        tile.classList.add(`num-${gameBoard[row][col]}`);
    }
    
    // If it's an empty tile, reveal adjacent tiles
    if (gameBoard[row][col] === 0) {
        const { rows, cols } = BOARD_SIZES[currentSize];
        
        // Reveal adjacent tiles (flood fill)
        for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c++) {
                if (r === row && c === col) continue;
                handleReveal(r, c, false); // Pass false to indicate this is not a direct user click
            }
        }
    }
    
    // Check if game is won
    checkWin();
}

// Handle flag placement/removal
function handleFlag(row, col) {
    const tile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
    
    // Don't flag if the tile is already revealed
    if (tile.classList.contains('revealed')) {
        return;
    }
    
    if (tile.classList.contains('flagged')) {
        // Remove flag
        tile.classList.remove('flagged');
        flagsPlaced--;
    } else {
        // Add flag if we haven't used all flags
        if (flagsPlaced < minesCount) {
            tile.classList.add('flagged');
            flagsPlaced++;
        }
    }
    
    // Update flags counter
    document.getElementById('flags-left').textContent = minesCount - flagsPlaced;
}

// Start the timer
function startTimer() {
    const timerElement = document.getElementById('timer');
    timer = 0;
    timerElement.textContent = timer;
    
    timerInterval = setInterval(() => {
        timer++;
        timerElement.textContent = timer;
    }, 1000);
}

// Stop the timer
function stopTimer() {
    clearInterval(timerInterval);
}

// Check if the game is won
function checkWin() {
    const { rows, cols, mines } = BOARD_SIZES[currentSize];
    const totalTiles = rows * cols;
    const revealedTiles = document.querySelectorAll('.tile.revealed').length;
    
    if (revealedTiles + mines === totalTiles) {
        gameOver(true);
    }
}

// Game over function
function gameOver(isWin) {
    isGameOver = true;
    stopTimer();
    
    // Show all mines if the game is lost
    if (!isWin) {
        const { rows, cols } = BOARD_SIZES[currentSize];
        const mineTiles = [];
        
        // Collect all mine tiles first
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (gameBoard[row][col] === -1) {
                    const tile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
                    if (!tile.classList.contains('flagged') && !tile.classList.contains('revealed')) {
                        mineTiles.push({ tile, row, col });
                    }
                }
            }
        }
        
        // Reveal mines with a slight delay between each one
        mineTiles.forEach((mineInfo, index) => {
            setTimeout(() => {
                mineInfo.tile.classList.add('revealed', 'mine');
            }, index * 50); // 50ms delay between each mine reveal
        });
    }
    
    // Create and show the in-game result notification
    let resultBanner = document.getElementById('result-banner');
    if (!resultBanner) {
        resultBanner = document.createElement('div');
        resultBanner.id = 'result-banner';
        
        // Insert the banner before the game board
        const gameBoard = document.getElementById('game-board');
        gameBoard.parentNode.insertBefore(resultBanner, gameBoard);
    }
    
    // Set result message and styles
    resultBanner.className = isWin ? 'result-banner win' : 'result-banner lose';
    resultBanner.innerHTML = `
        <h2>${isWin ? 'You Win!' : 'Game Over!'}</h2>
        <div class="banner-stats">
            <p>Time: ${timer} seconds</p>
            ${isWin ? '<p>Congratulations!</p>' : '<p>Better luck next time!</p>'}
        </div>
        <div class="banner-buttons">
            <button id="continue-btn" class="btn">Continue</button>
            <button id="play-again-banner-btn" class="btn">Play Again</button>
        </div>
    `;
    
    // Add event listeners to the banner buttons
    document.getElementById('continue-btn').addEventListener('click', () => {
        // Hide the banner
        resultBanner.classList.add('hidden');
        
        // Save score if it's a win
        if (isWin) {
            // Show the game over screen for saving score
            showScreen('gameOver');
        } else {
            // Just go back to main menu
            showScreen('splash');
        }
    });
    
    document.getElementById('play-again-banner-btn').addEventListener('click', () => {
        // Hide the banner
        resultBanner.classList.add('hidden');
        
        // Start a new game with the same size
        initGame(currentSize);
    });
    
    // Set game over screen values
    const resultMessage = document.getElementById('result-message');
    resultMessage.textContent = isWin ? 'You Win!' : 'Game Over!';
    
    // Show/hide save score form based on win/loss
    document.getElementById('win-form').style.display = isWin ? 'flex' : 'none';
    
    // Set final time
    document.getElementById('final-time').textContent = timer;
}

// Initialize a new game
function initGame(size) {
    currentSize = size;
    const { rows, cols, mines } = BOARD_SIZES[size];
    
    // Reset game state
    gameBoard = [];
    minesCount = mines;
    flagsPlaced = 0;
    timer = 0;
    isGameOver = false;
    isFirstClick = true;
    lastClickedTile = null; // Reset last clicked tile
    
    // Hide result banner if it exists
    const resultBanner = document.getElementById('result-banner');
    if (resultBanner) {
        resultBanner.classList.add('hidden');
    }
    
    // Update flags counter
    document.getElementById('flags-left').textContent = minesCount;
    
    // Create the board
    createBoard(rows, cols);
    
    // Show mobile controls info if on mobile
    if (isMobile) {
        document.getElementById('mobile-controls-info').classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('mobile-controls-info').classList.add('hidden');
        }, 5000);
    }
    
    // Reset timer
    document.getElementById('timer').textContent = '0';
    stopTimer();
    
    // Show game screen
    showScreen('game');
    
    // Add a second recalculation after a short delay to ensure proper sizing
    setTimeout(() => {
        const tileSize = calculateTileSize(rows, cols);
        document.documentElement.style.setProperty('--tile-size', `${tileSize}px`);
        adjustBoardIfNeeded(rows, cols);
    }, 100);
}

// Show high scores
async function showHighScores(boardSize = 'small') {
    try {
        const scores = await getHighScores(boardSize);
        const tbody = document.getElementById('highscores-body');
        tbody.innerHTML = '';
        
        // Show message if no scores
        document.getElementById('no-scores-message').classList.toggle('hidden', scores.length > 0);
        
        // Populate scores table
        scores.forEach((score, index) => {
            const row = document.createElement('tr');
            row.classList.add('highscore-row');
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${score.name}</td>
                <td>${score.time} sec</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Update active filter button
        document.querySelectorAll('.score-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${boardSize}-scores-btn`).classList.add('active');
        
        // Show high scores screen
        showScreen('highScores');
    } catch (error) {
        console.error('Error fetching high scores:', error);
    }
}

// Switch between screens
function showScreen(screenId) {
    // Hide all screens
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show requested screen
    screens[screenId].classList.add('active');
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize IndexedDB
    try {
        await initDB();
    } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
    }
    
    // Check if device is mobile
    isMobile = checkMobile();
    
    // Splash screen buttons
    document.getElementById('play-btn').addEventListener('click', () => {
        showScreen('setup');
    });
    
    document.getElementById('highscores-btn').addEventListener('click', () => {
        showHighScores('small');
    });
    
    // Setup screen buttons
    document.getElementById('small-btn').addEventListener('click', () => {
        initGame('small');
    });
    
    document.getElementById('medium-btn').addEventListener('click', () => {
        initGame('medium');
    });
    
    document.getElementById('large-btn').addEventListener('click', () => {
        initGame('large');
    });
    
    document.getElementById('back-to-splash').addEventListener('click', () => {
        showScreen('splash');
    });
    
    // Game screen buttons
    document.getElementById('restart-btn').addEventListener('click', () => {
        initGame(currentSize);
    });
    
    document.getElementById('back-to-menu').addEventListener('click', () => {
        showScreen('splash');
    });
    
    // Game over screen buttons
    document.getElementById('save-score-btn').addEventListener('click', async () => {
        const nameInput = document.getElementById('player-name');
        const playerName = nameInput.value.trim() || 'Anonymous';
        
        try {
            await saveScore(playerName, timer, currentSize);
            nameInput.value = '';
            showHighScores(currentSize);
        } catch (error) {
            console.error('Error saving score:', error);
        }
    });
    
    document.getElementById('play-again-btn').addEventListener('click', () => {
        initGame(currentSize);
    });
    
    document.getElementById('back-to-main-btn').addEventListener('click', () => {
        showScreen('splash');
    });
    
    // High scores screen buttons
    document.getElementById('small-scores-btn').addEventListener('click', () => {
        showHighScores('small');
    });
    
    document.getElementById('medium-scores-btn').addEventListener('click', () => {
        showHighScores('medium');
    });
    
    document.getElementById('large-scores-btn').addEventListener('click', () => {
        showHighScores('large');
    });
    
    document.getElementById('highscores-back-btn').addEventListener('click', () => {
        showScreen('splash');
    });
    
    // Prevent context menu on the game board
    document.getElementById('game-board').addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Listen for window resize to detect mobile/desktop and adjust board size
    window.addEventListener('resize', () => {
        const wasMobile = isMobile;
        isMobile = checkMobile();
        
        // Reinitialize game if the device type changed and a game is in progress
        if (wasMobile !== isMobile && screens.game.classList.contains('active')) {
            initGame(currentSize);
        } else if (screens.game.classList.contains('active')) {
            // Just adjust the board size if we're in game mode
            const { rows, cols } = BOARD_SIZES[currentSize];
            const tileSize = calculateTileSize(rows, cols);
            document.documentElement.style.setProperty('--tile-size', `${tileSize}px`);
            adjustBoardIfNeeded(rows, cols);
        }
    });
}); 