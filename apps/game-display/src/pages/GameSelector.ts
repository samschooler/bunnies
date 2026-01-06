// apps/game-display/src/pages/GameSelector.ts
export function showGameSelector(games: Array<{ id: string; name: string }>): void {
  const container = document.getElementById('game-container') || document.body;

  container.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #1a1a2e;
      color: white;
      font-family: system-ui, sans-serif;
    ">
      <h1 style="margin-bottom: 2rem; font-size: 2.5rem;">Select a Game</h1>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
        ${games.map(game => `
          <button
            onclick="window.location.href='/${game.id}/'"
            style="
              padding: 1.5rem 3rem;
              font-size: 1.25rem;
              background: #4a4a6e;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              transition: background 0.2s;
            "
            onmouseover="this.style.background='#6a6a8e'"
            onmouseout="this.style.background='#4a4a6e'"
          >
            ${game.name}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}
