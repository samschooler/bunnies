import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      navigate(`/${roomCode.toUpperCase()}`);
    }
  };

  return (
    <div className="home-page">
      <div className="home-content">
        <h1 className="title">Party Game</h1>
        <p className="subtitle">Join a game to get started</p>

        <form onSubmit={handleJoin} className="join-form">
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="room-input"
            maxLength={6}
            autoFocus
          />
          <button type="submit" className="join-button">
            Join Game
          </button>
        </form>

        <div className="instructions">
          <p>Scan the QR code on the TV screen or enter the room code above</p>
        </div>
      </div>
    </div>
  );
}
