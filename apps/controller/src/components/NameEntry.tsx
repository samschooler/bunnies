import React, { useState } from 'react';
import './NameEntry.css';

interface NameEntryProps {
  roomCode: string;
  onSubmit: (name: string) => void;
}

export default function NameEntry({ roomCode, onSubmit }: NameEntryProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <div className="name-entry">
      <div className="name-entry-content">
        <div className="room-badge">Room: {roomCode}</div>
        <h2>Enter Your Name</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
            className="name-input"
          />
          <button type="submit" className="submit-button">
            Join Game
          </button>
        </form>
      </div>
    </div>
  );
}
