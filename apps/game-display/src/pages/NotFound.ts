// apps/game-display/src/pages/NotFound.ts
export function showNotFound(message: string = 'Page not found'): void {
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
      <h1 style="font-size: 4rem; margin-bottom: 1rem;">404</h1>
      <p style="font-size: 1.25rem; color: #888;">${message}</p>
      <a
        href="/"
        style="
          margin-top: 2rem;
          padding: 1rem 2rem;
          background: #4a4a6e;
          color: white;
          text-decoration: none;
          border-radius: 8px;
        "
      >
        Back to Home
      </a>
    </div>
  `;
}
