import React from 'react';

interface GameDetailProps {
  gameId: number;
}

export const GameDetail: React.FC<GameDetailProps> = ({ gameId }) => {
  return (
    <div className="game-detail">
      <h1>Game Details</h1>
      <p>Game detail component for ID: {gameId}</p>
    </div>
  );
};

export default GameDetail;
