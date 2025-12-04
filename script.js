// Chess Introvert - script.js
// Features: UI, timer, undo/restart, sounds, background music, difficulty levels, minimax AI with alpha-beta

/* ---------------------------
   Lightweight chess engine:
   board: 8x8 array, pieces as single letters:
   P,N,B,R,Q,K uppercase = white, lowercase = black
   --------------------------- */

const initialBoard = [
"rnbqkbnr",
"pppppppp",
"........",
"........",
"........",
"........",
"PPPPPPPP",
"RNBQKBNR"
].map(r => r.split(''));

let board = JSON.parse(JSON.stringify(initialBoard));
let moves = [];
let sideToMove = 'w'; // 'w' or 'b'
let selectedCell = null;
let moveList = [];
let timerInterval = null;
let seconds = 0;
let soundsEnabled = true;
let musicPlaying = false;
let backgroundAudio = null;

// difficulty map: value -> {label, depth}
const DIFFICULTIES = {
  1: {label: "Beginner", depth: 1},
  2: {label: "Advanced", depth: 2},
  3: {label: "Master", depth: 3},
  4: {label: "Expert", depth: 4},
  5: {label: "Grandmaster", depth: 5} // depth 5 is already strong for a JS browser engine
};

const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const difficultySelect = document.getElementById('difficulty');
const diffIndicator = document.querySelector('#difficulty-indicator .text');
const diffDot = document.querySelector('#difficulty-indicator .dot');
const undoBtn = document.getElementById('btn-undo');
const restartBtn = document.getElementById('btn-restart');
const timerEl = document.getElementById('timer');
const soundBtn = document.getElementById('btn-sound');
const soundIcon = document.getElementById('sound-icon');
const musicBtn = document.getElementById('btn-music');

function init() {
  renderBoard();
  attachControls();
  startTimer();
  loadAudio();
  updateDifficultyIndicator();
}

function renderBoard() {
  // create 8x8 grid
  boardEl.innerHTML = '';
  const table = document.createElement('div');
  table.className = 'chessboard-grid';
  table.style.display = 'grid';
  table.style.gridTemplateColumns = 'repeat(8, 1fr)';
  table.style.gap = '0';
  table.style.aspectRatio = '1/1';
  table.style.width = '100%';
  table.style.height = '100%';
  for (let r=0; r<8; r++) {
    for (let c=0; c<8; c++) {
      const square = document.createElement('div');
      square.dataset.r = r;
      square.dataset.c = c;
      square.className = 'square';
      const dark = (r + c) % 2 === 1;
      square.style.background = dark ? '#151515' : '#0b0b0b';
      square.style.display = 'flex';
      square.style.alignItems = 'center';
      square.style.justifyContent = 'center';
      square.style.fontSize = '28px';
      square.style.color = '#fff';
      square.style.cursor = 'pointer';
      square.style.transition = 'transform .08s';
      const piece = board[r][c];
      if (piece !== '.') {
        square.innerHTML = getPieceChar(piece);
      }
      square.addEventListener('click', onSquareClick);
      table.appendChild(square);
    }
  }
  boardEl.appendChild(table);
}

function getPieceChar(p) {
  // use simple unicode pieces
  const map = {
    'K':'♔','Q':'♕','R':'♖','B':'♗','N':'♘','P':'♙',
    'k':'♚','q':'♛','r':'♜','b':'♝','n':'♞','p':'♟'
  };
  return map[p] || '';
}

function onSquareClick(e) {
  const r = +this.dataset.r;
  const c = +this.dataset.c;
  const piece = board[r][c];
  if (selectedCell) {
    const [sr, sc] = selectedCell;
    if (sr === r && sc === c) {
      selectedCell = null;
      renderBoard();
      return;
    }
    // attempt move
    const move = {from:[sr,sc], to:[r,c]};
    if (makeMoveIfLegal(move)) {
      selectedCell = null;
      renderBoard();
      postMoveActions();
    } else {
      // select another piece if same side
      if (piece !== '.' && isPieceOwnedBySide(piece, sideToMove)) {
        selectedCell = [r,c];
        highlightSelection();
      }
    }
  } else {
    if (piece !== '.' && isPieceOwnedBySide(piece, sideToMove)) {
      selectedCell = [r,c];
      highlightSelection();
    }
  }
}

function highlightSelection() {
  // highlight selected cell and possible moves (simple visual)
  const squares = boardEl.querySelectorAll('.square');
  squares.forEach(s => s.style.outline = '');
  if (!selectedCell) return;
  const [sr,sc] = selectedCell;
  const idx = sr*8 + sc;
  squares[idx].style.outline = '3px solid rgba(255,44,251,0.6)';
}

function isPieceOwnedBySide(piece, side) {
  if (piece === '.') return false;
  return side === 'w' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
}

/* ---------- Minimal move legality (not full chess rules) ----------
   For demo we implement basic moves (pawn, rook, knight, bishop, queen, king),
   capture allowed, no en-passant/castling/promotion complexities for simplicity.
   This keeps code small and fast. You can extend later.
------------------------------------------------------------------ */

function makeMoveIfLegal(move) {
  const [fr,fc] = move.from;
  const [tr,tc] = move.to;
  const piece = board[fr][fc];
  if (piece === '.') return false;
  // ownership
  if (!isPieceOwnedBySide(piece, sideToMove)) return false;
  // same square
  if (fr === tr && fc === tc) return false;
  // simple rules:
  const dir = (piece === 'P') ? -1 : (piece === 'p') ? 1 : null;
  const target = board[tr][tc];
  // friendly capture disallowed
  if (target !== '.' && ((target === target.toUpperCase()) === (piece === piece.toUpperCase()))) return false;

  // piece type
  const t = piece.toLowerCase();
  if (t === 'p') {
    // pawn
    const forward = (piece === 'P') ? -1 : 1;
    if (fc === tc && target === '.') {
      if (tr === fr + forward) {
        // single step
      } else if ((fr === 6 && piece === 'P' && tr === 4) || (fr ===1 && piece === 'p' && tr === 3)) {
        // allow double step from start (no en-passant)
      } else return false;
    } else if (Math.abs(tc-fc) === 1 && tr === fr + forward && target !== '.') {
      // capture
    } else return false;
  } else if (t === 'n') {
    if (!((Math.abs(tr-fr)===1 && Math.abs(tc-fc)===2) || (Math.abs(tr-fr)===2 && Math.abs(tc-fc)===1))) return false;
  } else if (t === 'b') {
    if (Math.abs(tr-fr) !== Math.abs(tc-fc)) return false;
    if (!isPathClear(fr,fc,tr,tc)) return false;
  } else if (t === 'r') {
    if (tr !== fr && tc !== fc) return false;
    if (!isPathClear(fr,fc,tr,tc)) return false;
  } else if (t === 'q') {
    if (tr !== fr && tc !== fc && Math.abs(tr-fr) !== Math.abs(tc-fc)) return false;
    if (!isPathClear(fr,fc,tr,tc)) return false;
  } else if (t === 'k') {
    if (Math.max(Math.abs(tr-fr), Math.abs(tc-fc)) > 1) return false;
  }

  // make move
  const moveNotation = notationForMove(fr,fc,tr,tc, piece, target);
  board[tr][tc] = board[fr][fc];
  board[fr][fc] = '.';
  moves.push({from:[fr,fc], to:[tr,tc], piece, captured: target, notation: moveNotation});
  moveList.push(moveNotation);
  updateMovesUI();
  playSound('move');
  sideToMove = (sideToMove === 'w') ? 'b' : 'w';
  return true;
}

function isPathClear(fr,fc,tr,tc) {
  const dr = Math.sign(tr-fr);
  const dc = Math.sign(tc-fc);
  let r = fr + dr, c = fc + dc;
  while (r !== tr || c !== tc) {
    if (board[r][c] !== '.') return false;
    r += dr; c += dc;
  }
  return true;
}

function notationForMove(fr,fc,tr,tc, piece, target) {
  const files = 'abcdefgh';
  const ranks = '87654321';
  const from = files[fc] + ranks[fr];
  const to = files[tc] + ranks[tr];
  return `${piece}${from}-${to}${target !== '.' ? 'x' : ''}`;
}

function updateMovesUI() {
  movesEl.innerHTML = '';
  moveList.forEach((m, idx) => {
    const li = document.createElement('li');
    li.textContent = m;
    if (idx === moveList.length - 1) li.classList.add('move-highlight');
    movesEl.appendChild(li);
  });
}

/* -------------------------
   Undo / restart / UI actions
   ------------------------- */
undoBtn.addEventListener('click', () => {
  if (!moves.length) return;
  const last = moves.pop();
  const {from, to, piece, captured} = last;
  board[from[0]][from[1]] = piece;
  board[to[0]][to[1]] = captured;
  moveList.pop();
  sideToMove = (sideToMove === 'w') ? 'b' : 'w';
  renderBoard();
  updateMovesUI();
  playSound('undo');
});

restartBtn.addEventListener('click', () => {
  board = JSON.parse(JSON.stringify(initialBoard));
  moves = [];
  moveList = [];
  sideToMove = 'w';
  seconds = 0;
  renderBoard();
  updateMovesUI();
  playSound('restart');
});

/* -------------------------
   Timer
------------------------- */
function startTimer() {
  clearInterval(timerInterval);
  seconds = 0;
  timerEl.textContent = formatTime(seconds);
  timerInterval = setInterval(() => {
    seconds++;
    timerEl.textContent = formatTime(seconds);
  }, 1000);
}
function formatTime(s) {
  const mm = String(Math.floor(s/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${mm}:${ss}`;
}

/* -------------------------
   Sounds & music
------------------------- */
function loadAudio() {
  // NOTE: add your own audio files in /assets/sounds/move.wav etc.
  // we fallback to simple beep if files not present.
  backgroundAudio = new Audio('/assets/sounds/bg-loop.mp3');
  backgroundAudio.loop = true;
  backgroundAudio.volume = 0.25;

  window.moveSound = new Audio('/assets/sounds/move.wav');
  window.captureSound = new Audio('/assets/sounds/capture.wav');
  window.undoSound = new Audio('/assets/sounds/undo.wav');
  window.restartSound = new Audio('/assets/sounds/restart.wav');

  // silent fallback if files missing
  [window.moveSound, window.captureSound, window.undoSound, window.restartSound].forEach(a=>{
    a.onerror = ()=>{ /* ignore */ };
  });
}

function playSound(name) {
  if (!soundsEnabled) return;
  try {
    if (name === 'move') {
      (window.moveSound && window.moveSound.play()) || beep();
    } else if (name === 'capture') {
      (window.captureSound && window.captureSound.play()) || beep();
    } else if (name === 'undo') {
      (window.undoSound && window.undoSound.play()) || beep();
    } else if (name === 'restart') {
      (window.restartSound && window.restartSound.play()) || beep();
    }
  } catch (e) {}
}
function beep(){
  // fallback tiny beep using WebAudio
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 700;
    g.gain.value = 0.02;
    o.connect(g); g.connect(ctx.destination);
    o.start(); setTimeout(()=>{ o.stop(); ctx.close(); }, 80);
  } catch(e){}
}

soundBtn.addEventListener('click', ()=>{
  soundsEnabled = !soundsEnabled;
  soundIcon.textContent = soundsEnabled ? '🔊' : '🔈';
  soundBtn.style.opacity = soundsEnabled ? '1' : '0.6';
});

musicBtn.addEventListener('click', ()=>{
  if (!backgroundAudio) return;
  if (musicPlaying) {
    backgroundAudio.pause(); musicPlaying=false; musicBtn.style.opacity=0.6;
  } else {
    backgroundAudio.play().catch(()=>{}); musicPlaying=true; musicBtn.style.opacity=1;
  }
});

/* -------------------------
   AI: Minimax + alpha-beta
------------------------- */

function evaluateBoardSimple(boardState) {
  // simple material evaluation
  const values = {p:100, n:320, b:330, r:500, q:900, k:20000};
  let score = 0;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++){
    const p = boardState[r][c];
    if (p === '.') continue;
    const v = values[p.toLowerCase()] || 0;
    score += (p === p.toLowerCase()) ? -v : v;
  }
  return score;
}

function generateMovesForSide(boardState, side) {
  // very basic move generator enumerating all pseudo-legal moves (no castling/en-passant)
  const moves = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++){
    const p = boardState[r][c];
    if (p === '.') continue;
    const isWhite = p === p.toUpperCase();
    if ((side === 'w') !== isWhite) continue;
    const t = p.toLowerCase();
    if (t === 'p') {
      const dir = isWhite ? -1 : 1;
      const nr = r + dir;
      if (inRange(nr) && boardState[nr][c] === '.') moves.push({from:[r,c],to:[nr,c]});
      // capture
      for (const dc of [-1,1]) {
        const nc = c + dc;
        if (inRange(nr) && inRange(nc) && boardState[nr][nc] !== '.' && isOpposite(pieceColor(p), boardState[nr][nc])) {
          moves.push({from:[r,c],to:[nr,nc]});
        }
      }
      // double step
      if ((r === 6 && isWhite) || (r === 1 && !isWhite)) {
        const rr = r + dir*2;
        if (boardState[r+dir][c] === '.' && boardState[rr][c] === '.') moves.push({from:[r,c], to:[rr,c]});
      }
    } else if (t === 'n') {
      const deltas = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
      deltas.forEach(d=>{
        const rr=r+d[0], cc=c+d[1];
        if(!inRange(rr)||!inRange(cc))return;
        const t2=boardState[rr][cc];
        if (t2 === '.' || isOpposite(pieceColor(p), t2)) moves.push({from:[r,c],to:[rr,cc]});
      });
    } else if (t === 'b' || t === 'r' || t==='q') {
      const deltas = (t==='b') ? [[1,1],[1,-1],[-1,1],[-1,-1]] : (t==='r') ? [[1,0],[-1,0],[0,1],[0,-1]] : [[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
      deltas.forEach(d=>{
        let rr=r+d[0], cc=c+d[1];
        while(inRange(rr) && inRange(cc)) {
          const t2 = boardState[rr][cc];
          if (t2 === '.') { moves.push({from:[r,c],to:[rr,cc]}); }
          else { if (isOpposite(pieceColor(p),t2)) moves.push({from:[r,c],to:[rr,cc]}); break; }
          rr += d[0]; cc += d[1];
        }
      });
    } else if (t === 'k') {
      for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++){
        if (dr===0 && dc===0) continue;
        const rr = r+dr, cc = c+dc;
        if (!inRange(rr)||!inRange(cc)) continue;
        const t2 = boardState[rr][cc];
        if (t2 === '.' || isOpposite(pieceColor(p),t2)) moves.push({from:[r,c],to:[rr,cc]});
      }
    }
  }
  return moves;
}

function inRange(x){return x>=0 && x<8;}
function pieceColor(p){ return p === p.toUpperCase() ? 'w' : 'b';}
function isOpposite(a,b){ return pieceColor(a) !== pieceColor(b);}

function cloneBoard(b){ return b.map(r=>r.slice()); }

function makeMoveOnBoard(b, move) {
  const nb = cloneBoard(b);
  const [fr,fc] = move.from;
  const [tr,tc] = move.to;
  nb[tr][tc] = nb[fr][fc];
  nb[fr][fc] = '.';
  return nb;
}

function minimaxRoot(boardState, depth, side, timeLimitMs=2000) {
  const start = performance.now();
  let bestMove = null;
  let bestScore = side==='w' ? -Infinity : Infinity;
  const moves = generateMovesForSide(boardState, side);
  // simple ordering: prefer captures
  moves.sort((a,b)=>{
    const ta = boardState[a.to[0]][a.to[1]];
    const tb = boardState[b.to[0]][b.to[1]];
    return (tb !== '.') - (ta !== '.');
  });
  for (let mv of moves) {
    const nb = makeMoveOnBoard(boardState, mv);
    const score = minimax(nb, depth-1, (side==='w'?'b':'w'), -Infinity, Infinity, start, timeLimitMs);
    if (side === 'w') {
      if (score > bestScore) { bestScore = score; bestMove = mv; }
    } else {
      if (score < bestScore) { bestScore = score; bestMove = mv; }
    }
    // time guard
    if (performance.now() - start > timeLimitMs) break;
  }
  return bestMove;
}

function minimax(boardState, depth, side, alpha, beta, startTime, timeLimitMs) {
  // time cutoff
  if (performance.now() - startTime > timeLimitMs) {
    // return static eval
    return evaluateBoardSimple(boardState);
  }
  if (depth === 0) return evaluateBoardSimple(boardState);
  const moves = generateMovesForSide(boardState, side);
  if (moves.length === 0) return evaluateBoardSimple(boardState);
  if (side === 'w') {
    let maxEval = -Infinity;
    for (const mv of moves) {
      const nb = makeMoveOnBoard(boardState, mv);
      const ev = minimax(nb, depth-1, 'b', alpha, beta, startTime, timeLimitMs);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
      if (performance.now() - startTime > timeLimitMs) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const mv of moves) {
      const nb = makeMoveOnBoard(boardState, mv);
      const ev = minimax(nb, depth-1, 'w', alpha, beta, startTime, timeLimitMs);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
      if (performance.now() - startTime > timeLimitMs) break;
    }
    return minEval;
  }
}

/* After player makes a move, let AI respond if it's AI's turn */
function postMoveActions() {
  renderBoard();
  if (sideToMove === 'b') {
    // let AI play after short delay
    setTimeout(() => aiMove(), 350);
  }
}

/* AI move using difficulty mapping */
function aiMove() {
  const difficulty = +difficultySelect.value;
  const dd = DIFFICULTIES[difficulty] || DIFFICULTIES[2];
  let depth = dd.depth;
  // time budget: increase with depth but cap
  const timeBudget = Math.min(4000, 500 * depth + 400);
  // For beginner, do a random move to look "human"
  if (difficulty === 1) {
    const legal = generateMovesForSide(board, 'b');
    if (!legal.length) return;
    const mv = legal[Math.floor(Math.random()*legal.length)];
    makeMoveIfLegal(mv);
    renderBoard();
    postMoveActions();
    return;
  }
  // For stronger levels, run minimax root
  const candidate = minimaxRoot(board, depth, 'b', timeBudget);
  if (candidate) {
    makeMoveIfLegal(candidate);
    renderBoard();
    postMoveActions();
  }
}

/* -------------------------
   Helpers & UI wiring
------------------------- */

function attachControls() {
  difficultySelect.addEventListener('change', ()=> {
    updateDifficultyIndicator();
  });
}

function updateDifficultyIndicator() {
  const v = +difficultySelect.value;
  const info = DIFFICULTIES[v];
  diffIndicator.textContent = info.label;
  // color intensity by level
  const colors = ['#00ff88','#7df25f','#ffd166','#ff6b6b','#ff2cfb'];
  diffDot.style.background = colors[Math.min(v-1, colors.length-1)];
  diffDot.style.boxShadow = `0 0 12px ${colors[Math.min(v-1, colors.length-1)]}`;
}

// basic startup
renderBoard();
init();

// expose some helpers if needed
window._debug = {board, makeMoveIfLegal, generateMovesForSide};

