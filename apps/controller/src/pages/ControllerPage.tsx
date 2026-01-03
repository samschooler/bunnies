import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { URLBuilder } from '@party-game/shared-types';
import { MovementController } from '../game/MovementController';
import NameEntry from '../components/NameEntry';
import GameController from '../components/GameController';
import './ControllerPage.css';

export default function ControllerPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [controller, setController] = useState<MovementController | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string>('');

  useEffect(() => {
    if (!roomCode) return;

    const urlBuilder = new URLBuilder({
      serverUrl: import.meta.env.VITE_GAME_SERVER_URL,
      displayUrl: import.meta.env.VITE_GAME_DISPLAY_URL,
      controllerUrl: import.meta.env.VITE_GAME_CONTROLLER_URL
    });
    const serverUrl = urlBuilder.getServerUrl();
    setDisplayUrl(urlBuilder.getDisplayUrl());
    const ctrl = new MovementController(serverUrl, roomCode, {
      onJoined: (id) => {
        setPlayerId(id);
        setError(null);
      },
      onSessionRestored: (id) => {
        setPlayerId(id);
        setPlayerName('Restored');
        setError(null);
      },
      onError: (err) => {
        setError(err);
        setPlayerName(null);
        setPlayerId(null);
      }
    });

    setController(ctrl);

    return () => {
      ctrl.disconnect();
    };
  }, [roomCode]);

  const handleNameSubmit = (name: string) => {
    if (controller && roomCode) {
      setPlayerName(name);
      controller.joinRoom(roomCode, name);
    }
  };

  if (error) {
    return (
      <div className="controller-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!playerId || !playerName) {
    return (
      <div className="controller-page">
        <NameEntry roomCode={roomCode!} onSubmit={handleNameSubmit} />
      </div>
    );
  }

  return (
    <div className="controller-page">
      <GameController controller={controller!} playerName={playerName} roomCode={roomCode!} displayUrl={displayUrl} />
    </div>
  );
}
