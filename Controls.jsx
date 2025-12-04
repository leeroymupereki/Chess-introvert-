import React from 'react';

export default function Controls({ socket, gameId, undoFunc }) {
  return (
    <div>
      <button onClick={undoFunc}>Undo</button>
      <button onClick={() => socket.emit('createGame', { gameId })}>Restart</button>
    </div>
  );
}
