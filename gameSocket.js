const { Chess } = require('chess.js');
const Stockfish = require('stockfish'); // npm install stockfish

const games = {}; // gameId -> Chess instance
const aiLevels = {
  1: 1, // Beginner (random)
  2: 2, // Easy (greedy)
  3: 3, // Medium (minimax depth 1)
  4: 4, // Hard (minimax depth 2)
  5: 5  // Grandmaster (Stockfish full strength)
};

module.exports = (io, socket) => {
  socket.on('createGame', ({ gameId, aiLevel }) => {
    const game = new Chess();
    games[gameId] = { game, aiLevel };
    socket.join(gameId);
    io.to(gameId).emit('updateBoard', game.fen());
  });

  socket.on('joinGame', ({ gameId }) => {
    if (!games[gameId]) return;
    socket.join(gameId);
    io.to(socket.id).emit('updateBoard', games[gameId].game.fen());
  });

  socket.on('makeMove', async ({ gameId, from, to, promotion }) => {
    const g = games[gameId];
    if (!g) return;

    const move = g.game.move({ from, to, promotion });
    if (move) {
      io.to(gameId).emit('updateBoard', g.game.fen());

      if (g.game.game_over()) {
        io.to(gameId).emit('gameOver', { result: g.game.game_over() });
      } else if (g.aiLevel) {
        // AI move
        const aiMove = await getAIMove(g.game, g.aiLevel);
        g.game.move(aiMove);
        io.to(gameId).emit('updateBoard', g.game.fen());
        if (g.game.game_over()) {
          io.to(gameId).emit('gameOver', { result: g.game.game_over() });
        }
      }
    }
  });
};

// Simple AI: random move for low levels
async function getAIMove(chess, level) {
  const moves = chess.moves({ verbose: true });
  if (level === 1) {
    // Beginner: random move
    return moves[Math.floor(Math.random() * moves.length)];
  } else if (level >= 2 && level < 5) {
    // Easy/Medium: greedy (capture highest value)
    let bestMove = moves[0];
    let bestScore = -1000;
    moves.forEach(m => {
      let score = m.captured ? getPieceValue(m.captured) : 0;
      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    });
    return bestMove;
  } else {
    // Grandmaster: use Stockfish
    return await stockfishMove(chess.fen());
  }
}

function getPieceValue(piece) {
  switch (piece.toLowerCase()) {
    case 'p': return 1;
    case 'n': case 'b': return 3;
    case 'r': return 5;
    case 'q': return 9;
    default: return 0;
  }
}

// Stockfish integration
function stockfishMove(fen) {
  return new Promise((resolve) => {
    const engine = Stockfish();
    engine.onmessage = (line) => {
      if (line.startsWith('bestmove')) {
        const move = line.split(' ')[1];
        const from = move.slice(0,2);
        const to = move.slice(2,4);
        resolve({ from, to, promotion: 'q' });
      }
    };
    engine.postMessage('uci');
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage('go depth 15');
  });
}
