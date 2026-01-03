import React, { useState, useRef, useEffect } from 'react';
import { MovementController } from '../game/MovementController';
import { STORE_CONFIG, calculateUpgradeCost } from '@party-game/shared-types';
import './GameController.css';

interface GameControllerProps {
  controller: MovementController;
  playerName: string;
  roomCode: string;
  displayUrl: string;
}

interface PlayerState {
  coins: number;
  size: number;
  speed: number;
  color: string;
  currentMapId?: string;
}

export default function GameController({ controller, playerName, roomCode, displayUrl }: GameControllerProps) {
  const [activeDirections, setActiveDirections] = useState<Set<string>>(new Set());
  const [playerState, setPlayerState] = useState<PlayerState>({ coins: 0, size: 1, speed: 1, color: '#ffffff' });
  const [currentMapId, setCurrentMapId] = useState<string>('main');
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
      setCurrentMapId(state.currentMapId || 'main');
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

  useEffect(() => {
    // Only enable keyboard controls when store is closed
    if (showStore) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      let direction: string | null = null;

      switch (e.key) {
        case 'ArrowUp':
          direction = 'up';
          break;
        case 'ArrowDown':
          direction = 'down';
          break;
        case 'ArrowLeft':
          direction = 'left';
          break;
        case 'ArrowRight':
          direction = 'right';
          break;
      }

      if (direction) {
        e.preventDefault(); // Prevent page scrolling
        setActiveDirections(prev => {
          if (prev.has(direction!)) return prev; // Prevent key repeat duplicates
          return new Set(prev).add(direction!);
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let direction: string | null = null;

      switch (e.key) {
        case 'ArrowUp':
          direction = 'up';
          break;
        case 'ArrowDown':
          direction = 'down';
          break;
        case 'ArrowLeft':
          direction = 'left';
          break;
        case 'ArrowRight':
          direction = 'right';
          break;
      }

      if (direction) {
        e.preventDefault();
        setActiveDirections(prev => {
          const next = new Set(prev);
          next.delete(direction!);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showStore]);

  const handleDirectionStart = (direction: string) => {
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
              {Object.entries(STORE_CONFIG.upgrades).map(([key, upgrade]) => {
                const cost = calculateUpgradeCost(key, playerState);
                const currentValue = key === 'size' ? playerState.size : playerState.speed;

                return (
                  <div key={key} className="store-item">
                    <h3>{upgrade.name}</h3>
                    <p>{upgrade.description}</p>
                    <p>Current: {currentValue.toFixed(1)}x</p>
                    <p>Cost: {cost} coins</p>
                    <button
                      onClick={() => handlePurchase(key)}
                      disabled={playerState.coins < cost}
                    >
                      Upgrade (+{upgrade.effect.increment}x)
                    </button>
                  </div>
                );
              })}

              <div className="store-section">
                <h3>Premium Colors</h3>
                <div className="color-grid">
                  {STORE_CONFIG.premiumColors.map(c => (
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

      {currentMapId !== 'main' && (
        <div className="interior-display">
          <iframe
            src={`${displayUrl}/interior.html?roomCode=${roomCode}`}
            className="mini-display-frame"
            title="House Interior"
          />
        </div>
      )}

      <div className="dpad-container">
        <div className="dpad">
          <button
            className={`dpad-button up ${activeDirections.has('up') ? 'active' : ''}`}
            onTouchStart={() => handleDirectionStart('up')}
            onTouchEnd={() => handleDirectionEnd('up')}
            onMouseDown={() => handleDirectionStart('up')}
            onMouseUp={() => handleDirectionEnd('up')}
            onMouseLeave={() => handleDirectionEnd('up')}
          >
            ▲
          </button>
          <button
            className={`dpad-button left ${activeDirections.has('left') ? 'active' : ''}`}
            onTouchStart={() => handleDirectionStart('left')}
            onTouchEnd={() => handleDirectionEnd('left')}
            onMouseDown={() => handleDirectionStart('left')}
            onMouseUp={() => handleDirectionEnd('left')}
            onMouseLeave={() => handleDirectionEnd('left')}
          >
            ◀
          </button>
          <div className="dpad-center" />
          <button
            className={`dpad-button right ${activeDirections.has('right') ? 'active' : ''}`}
            onTouchStart={() => handleDirectionStart('right')}
            onTouchEnd={() => handleDirectionEnd('right')}
            onMouseDown={() => handleDirectionStart('right')}
            onMouseUp={() => handleDirectionEnd('right')}
            onMouseLeave={() => handleDirectionEnd('right')}
          >
            ▶
          </button>
          <button
            className={`dpad-button down ${activeDirections.has('down') ? 'active' : ''}`}
            onTouchStart={() => handleDirectionStart('down')}
            onTouchEnd={() => handleDirectionEnd('down')}
            onMouseDown={() => handleDirectionStart('down')}
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
