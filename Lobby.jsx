import React, { useState } from 'react';

export default function Lobby({ socket, setGameId, setInGame }) {
  const [id, setId] = useState('');
  const [level, setLevel] = useState(1);

  const createGame = () => {
    const newId = Math.random().toString(36).substring(2, 8);
    setGameId(newId);
    socket.emit('createGame', { gameId: newId, aiLevel: parseInt(level) });
    setInGame(true);
  };

  const joinGame = () => {
    if (!id) return;
    setGameId(id);
    socket.emit('joinGame', { gameId: id });
    setInGame(true);
  };

  return (
    <div>
      <h2>Chess Introvert Lobby</h2>
      <label>AI Difficulty: </label>
      <select value={level} onChange={e => setLevel(e.target.value)}>
        <option value={1}>Beginner</option>
        <option value={2}>Easy</option>
        <option value={3}>Medium</option>
        <option value={4}>Hard</option>
        <option value={5}>Grandmaster</option>
      </select>
      <br/>
      <button onClick={createGame}>Create Game vs AI</button>
      <hr/>
      <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="Game ID" />
      <button onClick={joinGame}>Join Game</button>
    </div>
  );
}
