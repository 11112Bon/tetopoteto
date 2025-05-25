const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const arenaWidth = 12;
const arenaHeight = 20;

const arena = createMatrix(arenaWidth, arenaHeight);

const colors = [
  null,
  '#FF0D72', // T
  '#0DC2FF', // O
  '#0DFF72', // L
  '#F538FF', // J
  '#FF8E0D', // I
  '#FFE138', // S
  '#3877FF'  // Z
];

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0
};

let bag = [];

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function createPiece(type) {
  switch (type) {
    case 'T':
      return [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ];
    case 'O':
      return [
        [2, 2],
        [2, 2],
      ];
    case 'L':
      return [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0],
      ];
    case 'J':
      return [
        [4, 0, 0],
        [4, 4, 4],
        [0, 0, 0],
      ];
    case 'I':
      return [
        [0, 0, 0, 0],
        [5, 5, 5, 5],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
    case 'S':
      return [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0],
      ];
    case 'Z':
      return [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
      ];
  }
}

function drawMatrix(matrix, offset, overrideColor = null, alpha = 1.0) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.globalAlpha = alpha;
        context.fillStyle = overrideColor || colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
        context.globalAlpha = 1.0;
      }
    });
  });
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // グリッド表示
  context.strokeStyle = '#333';
  for (let y = 0; y < arenaHeight; y++) {
    for (let x = 0; x < arenaWidth; x++) {
      context.strokeRect(x, y, 1, 1);
    }
  }

  drawMatrix(arena, { x: 0, y: 0 });

  const ghost = getGhostPosition();
  drawMatrix(ghost.matrix, ghost.pos, colors[getMatrixType(ghost.matrix)], 0.3);

  drawMatrix(player.matrix, player.pos);
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
      if (
        m[y][x] !== 0 &&
        (
          !arena[y + o.y] ||          // 範囲外の下部
          !arena[y + o.y][x + o.x] && arena[y + o.y][x + o.x] !== 0 ||  // 範囲外（右端など）
          arena[y + o.y][x + o.x] !== 0 // 実際の衝突
        )
      ) {
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
    merge(arena, player);
    playerReset();
    arenaSweep();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
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
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function generateBag() {
  const types = ['T', 'O', 'L', 'J', 'I', 'S', 'Z'];
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
}

function playerReset() {
  if (bag.length === 0) {
    bag = generateBag();
  }
  const type = bag.pop();
  player.matrix = createPiece(type);
  player.pos.y = 0;
  player.pos.x = ((arenaWidth / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    alert("Game Over!");
  }
}

function getMatrixType(matrix) {
  for (let row of matrix) {
    for (let val of row) {
      if (val !== 0) return val;
    }
  }
  return 0;
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

function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
  }
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') {
    playerMove(-1);
  } else if (event.key === 'ArrowRight') {
    playerMove(1);
  } else if (event.key === 'ArrowDown') {
    playerDrop();
  } else if (event.key === 'z') {
    playerRotate(-1);
  } else if (event.key === 'x') {
    playerRotate(1);
  } else if (event.key === ' ') {
    // ハードドロップ
    const ghost = getGhostPosition();
    player.pos.y = ghost.pos.y;
    playerDrop();
  }
});

playerReset();
update();