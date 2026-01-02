export interface EnvironmentConfig {
  serverUrl: string;
  displayUrl: string;
  controllerUrl: string;
}

export class URLBuilder {
  private config: EnvironmentConfig;

  constructor(config: EnvironmentConfig) {
    this.config = config;
  }

  // Get server URL for WebSocket connections
  getServerUrl(): string {
    return this.config.serverUrl;
  }

  // Get controller URL for QR codes and redirects
  getControllerUrl(roomCode: string): string {
    return `${this.config.controllerUrl}/controller/${roomCode}`;
  }

  // Get display URL for redirects
  getDisplayUrl(roomCode?: string): string {
    if (roomCode) {
      return `${this.config.displayUrl}/${roomCode}`;
    }
    return this.config.displayUrl;
  }
}
