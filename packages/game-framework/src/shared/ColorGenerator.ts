export class ColorGenerator {
  private static colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#52B788', '#E63946', '#A8DADC'
  ];
  private static usedColors = new Set<string>();

  static getColor(): string {
    const available = this.colors.filter(c => !this.usedColors.has(c));

    if (available.length === 0) {
      this.usedColors.clear();
      return this.colors[0];
    }

    const color = available[Math.floor(Math.random() * available.length)];
    this.usedColors.add(color);
    return color;
  }

  static releaseColor(color: string): void {
    this.usedColors.delete(color);
  }
}
