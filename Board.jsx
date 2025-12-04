import React, { useEffect, useState } from 'react';
import Chessboard from 'react-chessboard';
import { Chess } from 'chess.js';

export default function Board({ socket, fen, setFen, gameId }) {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);

  useEffect(() => {
    socket.on('updateBoard', (newFen) => {
      setHistory(prev => [...prev, game.fen()]);
      setFen(newFen);
      setGame(new Chess(newFen));
      playMoveSound();
    });
    socket.on('gameOver', ({ result }) => alert('Game over!'));
  }, [socket]);

  const makeMove = (move) => {
    const { from, to, promotion } = move;
    const result = game.move({ from, to, promotion });
    if (result) {
      setGame(game);
      setHistory(prev => [...prev, game.fen()]);
      socket.emit('makeMove', { gameId, from, to, promotion: 'q' });
      playMoveSound();
    }
  };

  const undoMove = () => {
    if (history.length < 2) return;
    history.pop(); // remove last move
    const lastFen = history.pop(); // get previous
    setGame(new Chess(lastFen));
    setFen(lastFen);
    socket.emit('createGame', { gameId }); // reset server game (simpler approach)
  };

  const playMoveSound = () => {
    const audio = new Audio('/sounds/move.mp3');
    audio.play();
  };

  return <Chessboard position={fen} onPieceDrop={makeMove} />;
}
