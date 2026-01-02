import { URLBuilder } from '@party-game/shared-types';

// Create URLBuilder instance
const urlBuilder = new URLBuilder({
  serverUrl: import.meta.env.VITE_GAME_SERVER_URL,
  displayUrl: import.meta.env.VITE_GAME_DISPLAY_URL,
  controllerUrl: import.meta.env.VITE_GAME_CONTROLLER_URL
});

const serverUrl = urlBuilder.getServerUrl();

const createBtn = document.getElementById('createBtn') as HTMLButtonElement;
const joinBtn = document.getElementById('joinBtn') as HTMLButtonElement;
const roomCodeInput = document.getElementById('roomCodeInput') as HTMLInputElement;
const errorMsg = document.getElementById('errorMsg') as HTMLDivElement;
const loading = document.getElementById('loading') as HTMLDivElement;

// Create game
createBtn.addEventListener('click', async () => {
  createBtn.disabled = true;
  loading.style.display = 'block';
  errorMsg.textContent = '';

  try {
    const response = await fetch(`${serverUrl}/api/room/create`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const data = await response.json();
    window.location.href = `/${data.roomCode}`;
  } catch (error) {
    errorMsg.textContent = 'Failed to create room. Please try again.';
    createBtn.disabled = false;
    loading.style.display = 'none';
  }
});

// Join game
function joinGame() {
  const roomCode = roomCodeInput.value.trim().toUpperCase();

  if (roomCode.length !== 4) {
    errorMsg.textContent = 'Room code must be 4 characters';
    return;
  }

  if (!/^[A-Z0-9]{4}$/.test(roomCode)) {
    errorMsg.textContent = 'Room code must contain only letters and numbers';
    return;
  }

  // Redirect to controller (phone interface)
  const controllerUrl = urlBuilder.getControllerUrl(roomCode);
  window.location.href = controllerUrl;
}

joinBtn.addEventListener('click', joinGame);

roomCodeInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinGame();
  }
});

roomCodeInput.addEventListener('input', (e) => {
  errorMsg.textContent = '';
  (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase();
});
