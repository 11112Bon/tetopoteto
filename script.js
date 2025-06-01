const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
context.scale(20, 20);

const holdCanvas = document.getElementById("hold");
const holdContext = holdCanvas.getContext("2d");
holdContext.scale(20, 20);

const arenaWidth = 12;
const arenaHeight = 20;
const arena = createMatrix(arenaWidth, arenaHeight);

const nextCanvas = document.getElementById("next");
const nextContext = nextCanvas.getContext("2d");
nextContext.scale(20, 20);


const colors = [
  null,
  "#FF0D72", // T
  "#0DC2FF", // O
  "#0DFF72", // L
  "#F538FF", // J
  "#FF8E0D", // I
  "#FFE138", // S
  "#3877FF" // Z
];

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

let lockDelay = 500;
let lockTimer = 0;
let isGrounded = false;

let holdMatrix = null;
let holdUsed = false;
let bag = [];

let nextPiece = null;

const player = {
  pos: { x: 0, y: 0 },
  matrix: null
};

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function createPiece(type) {
  switch (type) {
    case "T":
      return [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ];
    case "O":
      return [
        [2, 2],
        [2, 2]
      ];
    case "L":
      return [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0]
      ];
    case "J":
      return [
        [4, 0, 0],
        [4, 4, 4],
        [0, 0, 0]
      ];
    case "I":
      return [
        [0, 0, 0, 0],
        [5, 5, 5, 5],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ];
    case "S":
      return [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0]
      ];
    case "Z":
      return [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
      ];
  }
}

function drawMatrix(matrix, context, offset, cellSize = 1, alpha = 1.0) {
  context.globalAlpha = alpha;
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < matrix[y].length; ++x) {
      if (matrix[y][x] !== 0) {
        context.fillStyle = colors[matrix[y][x]];
        context.fillRect(x + offset.x, y + offset.y, cellSize, cellSize);
      }
    }
  }
  context.globalAlpha = 1.0;
}

function drawHold() {
  holdContext.fillStyle = "#222";
  holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (holdMatrix) {
    const cellSize = 1;
    const offsetX = Math.floor(
      (holdCanvas.width / 20 - holdMatrix[0].length) / 2
    );
    const offsetY = Math.floor(
      (holdCanvas.height / 20 - holdMatrix.length) / 2
    );
    drawMatrix(holdMatrix, holdContext, { x: offsetX, y: offsetY });
  }
}

function draw() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(arena, context, { x: 0, y: 0 });

  const ghost = getGhostPosition();
  drawMatrix(ghost.matrix, context, ghost.pos, 1, 0.3);

  drawMatrix(player.matrix, context, player.pos);

  drawHold();
}

function drawNext() {
  nextContext.fillStyle = "#222";
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (nextPiece) {
    const offsetX = Math.floor(
      (nextCanvas.width / 20 - nextPiece[0].length) / 2
    );
    const offsetY = Math.floor(
      (nextCanvas.height / 20 - nextPiece.length) / 2
    );
    drawMatrix(nextPiece, nextContext, { x: offsetX, y: offsetY });
  }
}



function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    isGrounded = true;
    return;
  } else {
    isGrounded = false;
    lockTimer = 0;
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  } else {
    lockTimer = 0;
  }
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach((row) => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
  lockTimer = 0;
}

function generateBag() {
  const types = ["T", "O", "L", "J", "I", "S", "Z"];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
}

function playerReset() {
  if (player.matrix === null) {
    if (bag.length === 0) bag = generateBag();
    const type = bag.pop();
    player.matrix = createPiece(type);
  } else {
    player.matrix = nextPiece;
  }

  player.pos.y = 0;
  player.pos.x = ((arenaWidth / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  // 次のピースをセット
  if (bag.length === 0) bag = generateBag();
  const nextType = bag.pop();
  nextPiece = createPiece(nextType);

  holdUsed = false;

  if (collide(arena, player)) {
    arena.forEach((row) => row.fill(0));
      holdMatrix = null;
    alert("Game Over");
  }

  drawNext(); //描画更新
}


function arenaSweep() {
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
  }
}

function playerHold() {
  if (holdUsed) return;
  holdUsed = true;

  const current = player.matrix;

  if (!holdMatrix) {
    holdMatrix = current;
    playerReset();
  } else {
    const temp = holdMatrix;
    holdMatrix = current;
    player.matrix = temp;
    player.pos.y = 0;
    player.pos.x = ((arenaWidth / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  }
}

function getGhostPosition() {
  const ghost = {
    matrix: player.matrix,
    pos: { x: player.pos.x, y: player.pos.y }
  };
  while (!collide(arena, ghost)) {
    ghost.pos.y++;
  }
  ghost.pos.y--;
  return ghost;
}

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;

  if (dropCounter > dropInterval) {
    playerDrop();
  }

  if (isGrounded) {
    lockTimer += deltaTime;
    if (lockTimer >= lockDelay) {
      merge(arena, player);
      arenaSweep();
      playerReset();
      lockTimer = 0;
      isGrounded = false;
    }
  }

  draw();
  requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    playerMove(-1);
  } else if (event.key === "ArrowRight") {
    playerMove(1);
  } else if (event.key === "ArrowDown") {
    playerDrop();
  } else if (event.key === "z") {
    playerRotate(-1);
  } else if (event.key === "x" || event.key === "ArrowUp") {
    playerRotate(1);
  } else if (event.key === " ") {
    const ghost = getGhostPosition();
    player.pos.y = ghost.pos.y;
    playerDrop();
  } else if (event.key === "c") {
    playerHold();
  }
});

playerReset();
update();
