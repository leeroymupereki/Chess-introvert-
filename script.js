let board = null;
let game = new Chess();
let soundOn = true;
let moveStack = [];
let difficulty = 1;
let timerInterval, startTime;

function onDragStart(source, piece) {
  if (game.game_over() || piece.search(/^b/) !== -1) return false;
}

function makeBestMove() {
  let bestMove = getBestMove(game, difficulty);
  game.move(bestMove);
  board.position(game.fen());
  if (soundOn) new Audio('https://www.soundjay.com/button/beep-07.wav').play();
}

function getBestMove(game, level) {
  let moves = game.moves();
  let move = moves[Math.floor(Math.random() * moves.length)];
  return move;
}

function onDrop(source, target) {
  let move = game.move({ from: source, to: target, promotion: 'q' });
  if (move === null) return 'snapback';
  moveStack.push(move);
  if (soundOn) new Audio('https://www.soundjay.com/button/beep-07.wav').play();
  window.setTimeout(makeBestMove, 250);
}

function undoMove() {
  game.undo();
  game.undo();
  board.position(game.fen());
}

function restartGame() {
  game.reset();
  board.start();
  clearInterval(timerInterval);
  startTimer();
}

function changeDifficulty(val) {
  difficulty = parseInt(val);
}

function toggleSound() {
  soundOn = !soundOn;
}

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    let diff = Math.floor((Date.now() - startTime) / 1000);
    let minutes = String(Math.floor(diff / 60)).padStart(2, '0');
    let seconds = String(diff % 60).padStart(2, '0');
    document.getElementById('timer').textContent = `${minutes}:${seconds}`;
  }, 1000);
}

const config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: () => board.position(game.fen()),
};
board = Chessboard('board', config);
startTimer();
