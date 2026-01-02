import React, { useState, useRef, useEffect } from 'react';
import { MovementController } from '../game/MovementController';
import './GameController.css';

interface GameControllerProps {
  controller: MovementController;
  playerName: string;
}

interface PlayerState {
  coins: number;
  size: number;
  speed: number;
  color: string;
}

export default function GameController({ controller, playerName }: GameControllerProps) {
  const [activeDirections, setActiveDirections] = useState<Set<string>>(new Set());
  const [playerState, setPlayerState] = useState<PlayerState>({ coins: 0, size: 1, speed: 1, color: '#ffffff' });
  const [showStore, setShowStore] = useState(false);
  const inputIntervalRef = useRef<number | null>(null);
  const currentInputRef = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    // Send input at 30fps
    inputIntervalRef.current = setInterval(() => {
      controller.sendInput(currentInputRef.current);
    }, 1000 / 30);

    // Setup state update callback
    (controller as any).callbacks.onStateUpdate = (state: PlayerState) => {
      setPlayerState(state);
    };

    return () => {
      if (inputIntervalRef.current) {
        clearInterval(inputIntervalRef.current);
      }
    };
  }, [controller]);

  useEffect(() => {
    let dx = 0, dy = 0;

    if (activeDirections.has('up')) dy -= 1;
    if (activeDirections.has('down')) dy += 1;
    if (activeDirections.has('left')) dx -= 1;
    if (activeDirections.has('right')) dx += 1;

    // Normalize diagonal movement to match cardinal speed
    if (dx !== 0 && dy !== 0) {
      const norm = Math.sqrt(2);
      dx /= norm;
      dy /= norm;
    }

    currentInputRef.current = { dx, dy };
  }, [activeDirections]);

  const handleDirectionStart = (dx: number, dy: number, direction: string) => {
    setActiveDirections(prev => new Set(prev).add(direction));
  };

  const handleDirectionEnd = (direction: string) => {
    setActiveDirections(prev => {
      const next = new Set(prev);
      next.delete(direction);
      return next;
    });
  };

  const handlePurchase = (upgradeType: string) => {
    controller.purchaseUpgrade(upgradeType);
  };

  const premiumColors = [
    { name: 'Gold', color: '#FFD700', cost: 50 },
    { name: 'Purple', color: '#9B59B6', cost: 50 },
    { name: 'Cyan', color: '#00CED1', cost: 50 },
    { name: 'Hot Pink', color: '#FF69B4', cost: 50 },
    { name: 'Lime', color: '#32CD32', cost: 50 },
  ];

  return (
    <div className="game-controller">
      <div className="controller-header">
        <h3>{playerName}</h3>
        <div className="coin-display">
          Coins: <span className="coin-count">{playerState.coins}</span>
        </div>
        <button className="store-button" onClick={() => setShowStore(!showStore)}>
          Store
        </button>
      </div>

      {showStore && (
        <div className="store-modal">
          <div className="store-content">
            <h2>Upgrade Store</h2>
            <div className="store-items">
              <div className="store-item">
                <h3>Size Upgrade</h3>
                <p>Current: {playerState.size.toFixed(1)}x</p>
                <p>Cost: {Math.floor(playerState.size * 30)} coins</p>
                <button
                  onClick={() => handlePurchase('size')}
                  disabled={playerState.coins < Math.floor(playerState.size * 30)}
                >
                  Upgrade (+0.2x)
                </button>
              </div>

              <div className="store-item">
                <h3>Speed Upgrade</h3>
                <p>Current: {playerState.speed.toFixed(1)}x</p>
                <p>Cost: {Math.floor(playerState.speed * 25)} coins</p>
                <button
                  onClick={() => handlePurchase('speed')}
                  disabled={playerState.coins < Math.floor(playerState.speed * 25)}
                >
                  Upgrade (+0.2x)
                </button>
              </div>

              <div className="store-section">
                <h3>Premium Colors</h3>
                <div className="color-grid">
                  {premiumColors.map(c => (
                    <div key={c.color} className="color-item">
                      <div
                        className="color-preview"
                        style={{ backgroundColor: c.color }}
                      />
                      <span>{c.name}</span>
                      <button
                        onClick={() => handlePurchase(`color:${c.color}`)}
                        disabled={playerState.coins < c.cost || playerState.color === c.color}
                      >
                        {playerState.color === c.color ? 'Owned' : `${c.cost} coins`}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button className="close-store" onClick={() => setShowStore(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="dpad-container">
        <div className="dpad">
          <button
            className={`dpad-button up ${activeDirections.has('up') ? 'active' : ''}`}
            onTouchStart={() => handleDirectionStart(0, -1, 'up')}
            onTouchEnd={() => handleDirectionEnd('up')}
            onMouseDown={() => handleDirectionStart(0, -1, 'up')}
            onMouseUp={() => handleDirectionEnd('up')}
            onMouseLeave={() => handleDirectionEnd('up')}
          >
            ▲
          </button>
          <button
            className={`dpad-button left ${activeDirections.has('left') ? 'active' : ''}`}
            onTouchStart={() => handleDirectionStart(-1, 0, 'left')}
            onTouchEnd={() => handleDirectionEnd('left')}
            onMouseDown={() => handleDirectionStart(-1, 0, 'left')}
            onMouseUp={() => handleDirectionEnd('left')}
            onMouseLeave={() => handleDirectionEnd('left')}
          >
            ◀
          </button>
          <div className="dpad-center" />
          <button
            className={`dpad-button right ${activeDirections.has('right') ? 'active' : ''}`}
            onTouchStart={() => handleDirectionStart(1, 0, 'right')}
            onTouchEnd={() => handleDirectionEnd('right')}
            onMouseDown={() => handleDirectionStart(1, 0, 'right')}
            onMouseUp={() => handleDirectionEnd('right')}
            onMouseLeave={() => handleDirectionEnd('right')}
          >
            ▶
          </button>
          <button
            className={`dpad-button down ${activeDirections.has('down') ? 'active' : ''}`}
            onTouchStart={() => handleDirectionStart(0, 1, 'down')}
            onTouchEnd={() => handleDirectionEnd('down')}
            onMouseDown={() => handleDirectionStart(0, 1, 'down')}
            onMouseUp={() => handleDirectionEnd('down')}
            onMouseLeave={() => handleDirectionEnd('down')}
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
}
