import { useState, useEffect } from 'react';
import { initializeGames, registry } from '@party-game/shared-types';
import ControllerPage from './pages/ControllerPage';
import HomePage from './pages/HomePage';

function App() {
  const [initialized, setInitialized] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      await initializeGames();

      // Check URL for room code
      const path = window.location.pathname;
      const match = path.match(/\/controller\/([A-Z0-9]+)/i);

      if (match) {
        const code = match[1].toUpperCase();
        const parsed = registry.parseRoomCode(code);

        if (parsed) {
          setRoomCode(parsed.roomCode);
          setGameId(parsed.gameId);
        }
      }

      setInitialized(true);
    }

    init();
  }, []);

  if (!initialized) {
    return <div>Loading...</div>;
  }

  if (roomCode && gameId) {
    return <ControllerPage roomCode={roomCode} gameId={gameId} />;
  }

  return <HomePage onJoin={(code) => {
    const parsed = registry.parseRoomCode(code);
    if (parsed) {
      window.location.href = `/controller/${parsed.roomCode}`;
    } else {
      alert('Invalid room code');
    }
  }} />;
}

export default App;
