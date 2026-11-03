import Phaser from 'phaser';
import { Joystick } from '../game/Joystick';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export class UIScene extends Phaser.Scene {
  joystick!: Joystick;
  private counter!: Phaser.GameObjects.Text;

  constructor() {
    super('UI');
  }

  create(): void {
    this.input.addPointer(2);
    this.joystick = new Joystick(this, GAME_WIDTH / 2, GAME_HEIGHT - 190, GAME_HEIGHT * 0.45);

    const panel = this.add.graphics();
    panel.fillStyle(0x0b3954, 0.45);
    panel.fillRoundedRect(24, 40, 230, 64, 20);
    this.add.image(62, 72, 'shell').setScale(1.4);
    this.counter = this.add
      .text(92, 72, '0 / 0', { fontFamily: 'system-ui, sans-serif', fontSize: '34px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0, 0.5);

    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '화면 아래쪽을 드래그해서 이동하세요', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.85);
    this.time.delayedCall(4500, () => this.tweens.add({ targets: hint, alpha: 0, duration: 600 }));

    // GameScene publishes progress through the shared registry.
    const initial = this.registry.get('shells') as { found: number; total: number } | undefined;
    if (initial) this.counter.setText(`${initial.found} / ${initial.total}`);
    this.registry.events.on('changedata-shells', this.onShells, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.registry.events.off('changedata-shells', this.onShells, this),
    );
  }

  private onShells(_parent: unknown, value: { found: number; total: number }): void {
    const { found, total } = value;
    this.counter.setText(`${found} / ${total}`);
    this.tweens.add({ targets: this.counter, scale: { from: 1.3, to: 1 }, duration: 200 });
    if (found === total && total > 0) this.showBanner('조개를 모두 모았어요! 🐚');
  }

  private showBanner(message: string): void {
    const text = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, message, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#ff7a59',
        padding: { x: 28, y: 18 },
      })
      .setOrigin(0.5)
      .setScale(0);
    this.tweens.add({ targets: text, scale: 1, duration: 400, ease: 'Back.Out' });
  }
}
