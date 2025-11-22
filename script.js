const game = document.getElementById("game");
const gridRows = 8;
const gridCols = 12;
let playerPos = { row: 0, col: 0 };
let treasuresCollected = 0;
let movesTaken = 0;
let gameFrozen = false;

let cells = [];
const NUM_TREASURES = 10;

const overlay = document.getElementById("game-overlay");
const endImage = document.getElementById("end-image");
const endText = document.getElementById("end-text");
const restartBtn = document.getElementById("restart-btn");

restartBtn.onclick = () => window.location.reload();

const DIRECTIONS = [
    { r: -1, c: 0 }, // up
    { r: 1, c: 0 },  // down
    { r: 0, c: -1 }, // left
    { r: 0, c: 1 }   // right
];

// Freeze game after win/lose
function freezeGame() {
    gameFrozen = true;
}

// Show Win/Lose Screen
function showEndScreen(type) {
    freezeGame();
    overlay.style.display = "flex";

    if (type === "win") {
        endImage.src = "images/trophy.png";
        endText.textContent = "YOU WON!";
        endText.style.color = "#00eeff";
    } else {
        endImage.src = "images/boom.png";
        endText.textContent = "YOU LOST!";
        endText.style.color = "#ff0000";
    }
}

// =============================
// 🔹 GRID / CELL HELPERS
// =============================
function findCell(r, c) {
    if (r < 0 || r >= gridRows || c < 0 || c >= gridCols) return null;
    return cells[r * gridCols + c] || null;
}

// BFS Check reachability for treasure
function isReachable(targetCell) {
    const startCell = findCell(0, 0);
    if (!startCell) return false;

    const queue = [startCell];
    const visited = new Set();

    while (queue.length > 0) {
        const current = queue.shift();
        const key = `${current.row},${current.col}`;

        if (visited.has(key)) continue;
        visited.add(key);

        if (current === targetCell) return true;

        for (let d of DIRECTIONS) {
            const n = findCell(current.row + d.r, current.col + d.c);
            if (n &&
                !n.element.classList.contains("wall") &&
                !visited.has(`${n.row},${n.col}`)
            ) {
                queue.push(n);
            }
        }
    }
    return false;
}

// =============================
// 🔹 TREASURE PLACEMENT
// =============================
function placeTreasure() {
    const emptyCells = cells.filter(c =>
        !c.element.classList.contains("wall") &&
        !c.element.classList.contains("player") &&
        !c.element.classList.contains("treasure") &&
        !c.element.classList.contains("cursed")
    );

    if (emptyCells.length === 0) return;

    const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    cell.element.classList.add("treasure");
}

// =============================
// 🔹 GRID GENERATION
// =============================
function generateGrid() {
    game.innerHTML = "";
    cells = [];

    for (let r = 0; r < gridRows; r++) {
        let wallsPerRow = Math.floor(gridCols * 0.3);
        let wallCount = 0;

        for (let c = 0; c < gridCols; c++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");

            // Random wall generator
            let prob = (wallsPerRow - wallCount) / (gridCols - c);

            if (Math.random() < prob && !(r <= 1 && c <= 1)) {
                cell.classList.add("wall");
                wallCount++;
            }

            game.appendChild(cell);
            cells.push({ element: cell, row: r, col: c, pending: false });
        }
    }

    // Place guaranteed treasure
    const treasureCells = [];
    let count = 0;

    while (count < NUM_TREASURES) {
        const empty = cells.filter(c =>
            !c.element.classList.contains("wall") &&
            !c.element.classList.contains("treasure") &&
            !(c.row === 0 && c.col === 0)
        );

        const cell = empty[Math.floor(Math.random() * empty.length)];
        cell.element.classList.add("treasure");
        treasureCells.push(cell);
        count++;
    }

    // Make sure treasure is reachable
    for (const t of treasureCells) {
        if (!isReachable(t)) {
            // Remove walls until reachable
            for (const cell of cells) {
                if (cell.element.classList.contains("wall")) {
                    cell.element.classList.remove("wall");
                    if (isReachable(t)) break;
                }
            }

            // If STILL not reachable, replace treasure
            if (!isReachable(t)) {
                t.element.classList.remove("treasure");
                placeTreasure();
            }
        }
    }
}

generateGrid();

// =============================
// 🔹 PLAYER
// =============================
function drawPlayer() {
    cells.forEach(c => c.element.classList.remove("player"));
    findCell(playerPos.row, playerPos.col).element.classList.add("player");
}

drawPlayer();

// =============================
// 🔹 ENEMY
// =============================
let enemyPos = {
    row: gridRows - 1,
    col: gridCols - 1
};

function drawEnemy() {
    cells.forEach(c => c.element.classList.remove("enemy"));
    findCell(enemyPos.row, enemyPos.col).element.classList.add("enemy");
}

function moveEnemy() {
    if (gameFrozen) return;

    let dRow = playerPos.row - enemyPos.row;
    let dCol = playerPos.col - enemyPos.col;

    if (Math.abs(dRow) > Math.abs(dCol)) {
        enemyPos.row += Math.sign(dRow);
    } else {
        enemyPos.col += Math.sign(dCol);
    }

    drawEnemy();

    // 🔥 FIXED: Lose sound on enemy catch
    if (enemyPos.row === playerPos.row && enemyPos.col === playerPos.col) {
        playLoseSound();
        showEndScreen("lose");
        return;
    }

    setTimeout(moveEnemy, 350);
}

drawEnemy();
moveEnemy();

// =============================
// 🔹 TREASURE CURSING SYSTEM
// =============================
function checkNearbyTreasures() {
    if (gameFrozen) return;

    for (let d of DIRECTIONS) {
        const cell = findCell(playerPos.row + d.r, playerPos.col + d.c);

        if (cell &&
            cell.element.classList.contains("treasure") &&
            !cell.pending
        ) {
            cell.pending = true;

            setTimeout(() => {
                const now = findCell(cell.row, cell.col);

                if (now &&
                    now.element.classList.contains("treasure") &&
                    !now.element.classList.contains("player")
                ) {
                    if (Math.random() < 0.8) {
                        now.element.classList.remove("treasure");
                        now.element.classList.add("cursed");
                    } else {
                        now.element.classList.remove("treasure");
                        placeTreasure();
                    }
                }

                cell.pending = false;
            }, 800);
        }
    }
}

// =============================
// 🔹 SOUNDS
// =============================
function playWinSound() {
    document.getElementById("winSound").play();
}

function playLoseSound() {
    document.getElementById("loseSound").play();
}

// =============================
// 🔹 PLAYER MOVEMENT
// =============================
document.addEventListener("keydown", e => {
    if (gameFrozen) return;

    let newRow = playerPos.row;
    let newCol = playerPos.col;

    if (e.key === "ArrowUp") newRow--;
    if (e.key === "ArrowDown") newRow++;
    if (e.key === "ArrowLeft") newCol--;
    if (e.key === "ArrowRight") newCol++;

    const target = findCell(newRow, newCol);

    if (!target || target.element.classList.contains("wall")) return;

    playerPos = { row: newRow, col: newCol };
    movesTaken++;

    document.getElementById("moves-count").textContent = movesTaken;

    drawPlayer();
    checkNearbyTreasures();

    const current = findCell(playerPos.row, playerPos.col);

    // Stepped on cursed tile → LOSE
    if (current.element.classList.contains("cursed")) {
        playLoseSound();
        showEndScreen("lose");
        return;
    }

    // Collect treasure → WIN
    if (current.element.classList.contains("treasure")) {
        treasuresCollected++;
        current.element.classList.remove("treasure");
        document.getElementById("treasure-count").textContent = treasuresCollected;

        if (treasuresCollected === NUM_TREASURES) {
            playWinSound();
            showEndScreen("win");
        }
    }

});
