import Phaser from 'phaser';
import { sfx } from '../game/audio';
import { Joystick } from '../game/Joystick';
import { Inventory, ITEM_ORDER, ITEMS, ItemId } from '../game/items';
import { SITE_ORDER, SiteId } from '../game/sites';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { Prompt } from './GameScene';

const FONT = 'system-ui, sans-serif';

export class UIScene extends Phaser.Scene {
  joystick!: Joystick;
  private counts = {} as Record<ItemId, Phaser.GameObjects.Text>;
  private restoreText!: Phaser.GameObjects.Text;
  private restoreDots: Phaser.GameObjects.Arc[] = [];
  private restoredCount = 0;
  private timeIcon!: Phaser.GameObjects.Image;
  private soundIcon!: Phaser.GameObjects.Image;
  private actionBtn!: Phaser.GameObjects.Container;
  private actionLabel!: Phaser.GameObjects.Text;
  private infoCard!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;

  constructor() {
    super('UI');
  }

  create(): void {
    this.input.addPointer(2);
    this.joystick = new Joystick(this, GAME_WIDTH / 2 - 60, GAME_HEIGHT - 190, GAME_HEIGHT * 0.45);
    this.restoreDots = [];

    this.createInventoryBar();
    this.createRestorePanel();
    this.createTopButtons();
    this.createActionButton();

    this.infoCard = this.add
      .text(GAME_WIDTH / 2, 230, '', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#0b3954cc',
        padding: { x: 22, y: 12 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.toastText = this.add
      .text(GAME_WIDTH / 2, 310, '', {
        fontFamily: FONT,
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#ff7a59',
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '아래쪽을 드래그해 이동 · 오른쪽 버튼으로 채집/고치기', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.85);
    this.time.delayedCall(6000, () => this.tweens.add({ targets: hint, alpha: 0, duration: 600 }));

    // Initial values (GameScene is created first), then live updates through the registry.
    const reg = this.registry;
    this.onInventory(null, reg.get('inventory'));
    this.restoredCount = (reg.get('restored') as { ids: SiteId[] } | undefined)?.ids.length ?? 0;
    this.onRestored(null, reg.get('restored'), true);
    this.onPrompt(null, reg.get('prompt'));
    this.onNight(null, reg.get('night'));
    this.onSound(null, reg.get('sound'));

    const handlers: [string, (parent: unknown, value: never) => void][] = [
      ['changedata-inventory', this.onInventory],
      ['changedata-shells', this.onShells],
      ['changedata-restored', this.onRestored],
      ['changedata-prompt', this.onPrompt],
      ['changedata-night', this.onNight],
      ['changedata-sound', this.onSound],
    ];
    for (const [ev, fn] of handlers) reg.events.on(ev, fn, this);
    this.game.events.on('toast', this.showToast, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const [ev, fn] of handlers) reg.events.off(ev, fn, this);
      this.game.events.off('toast', this.showToast, this);
    });
  }

  // ---------- layout ----------

  private panel(x: number, y: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x0b3954, 0.5);
    g.fillRoundedRect(x, y, w, h, 20);
  }

  private createInventoryBar(): void {
    this.panel(20, 30, 448, 72);
    ITEM_ORDER.forEach((id, i) => {
      const x = 56 + i * 108;
      this.add.image(x, 66, ITEMS[id].texture).setScale(1.3);
      this.counts[id] = this.add
        .text(x + 24, 66, '0', { fontFamily: FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
        .setOrigin(0, 0.5);
    });
  }

  private createRestorePanel(): void {
    this.panel(20, 110, 330, 52);
    this.restoreText = this.add
      .text(40, 136, '섬 복원 0 / 4', { fontFamily: FONT, fontSize: '24px', color: '#ffffff' })
      .setOrigin(0, 0.5);
    SITE_ORDER.forEach((_, i) => {
      this.restoreDots.push(this.add.circle(236 + i * 28, 136, 9, 0xffffff, 0.25));
    });
  }

  private createTopButtons(): void {
    this.add.image(GAME_WIDTH - 172, 66, 'btn-round');
    this.timeIcon = this.add.image(GAME_WIDTH - 172, 66, 'icon-sun');

    const button = (x: number, icon: string, onTap: () => void) => {
      const bg = this.add.image(x, 66, 'btn-round').setInteractive({ useHandCursor: true });
      const img = this.add.image(x, 66, icon);
      bg.on('pointerdown', () => {
        this.tweens.add({ targets: [bg, img], scale: { from: 0.85, to: 1 }, duration: 150 });
        onTap();
      });
      return img;
    };
    this.soundIcon = button(GAME_WIDTH - 104, 'icon-sound-on', () => {
      sfx.unlock();
      this.game.events.emit('ui-toggle-sound');
    });
    button(GAME_WIDTH - 36 - 0, 'icon-reset', () => {
      // window.confirm is reliable on mobile browsers and prevents accidental wipes.
      if (window.confirm('처음부터 다시 시작할까요? 저장된 진행 상황이 지워집니다.')) this.game.events.emit('ui-reset');
    });
  }

  private createActionButton(): void {
    const bg = this.add.image(0, 0, 'btn-action');
    this.actionLabel = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setStroke('#c4502f', 4);
    this.actionBtn = this.add.container(GAME_WIDTH - 110, GAME_HEIGHT - 230, [bg, this.actionLabel]);
    this.actionBtn.setSize(140, 140).setInteractive({ useHandCursor: true }).setVisible(false);
    this.actionBtn.on('pointerdown', () => {
      sfx.unlock();
      this.tweens.add({ targets: this.actionBtn, scale: { from: 0.88, to: 1 }, duration: 160, ease: 'Back.Out' });
      this.game.events.emit('ui-action');
    });
  }

  // ---------- registry handlers ----------

  private onInventory(_p: unknown, inv: Inventory | undefined): void {
    if (!inv) return;
    for (const id of ITEM_ORDER) {
      const t = this.counts[id];
      const next = String(inv[id]);
      if (t.text !== next) {
        t.setText(next);
        this.tweens.add({ targets: t, scale: { from: 1.35, to: 1 }, duration: 220 });
      }
    }
  }

  private onShells(_p: unknown, value: { found: number; total: number }): void {
    if (value.found === value.total && value.total > 0) this.showBanner('조개를 모두 모았어요! 🐚');
  }

  private onRestored(_p: unknown, value: { ids: SiteId[]; total: number } | undefined, initial = false): void {
    if (!value) return;
    const n = value.ids.length;
    this.restoreText.setText(`섬 복원 ${n} / ${value.total}`);
    const colors: Record<SiteId, number> = { campfire: 0xff9a3c, garden: 0xff8fa3, hut: 0xd9634f, dock: 0xb58456 };
    SITE_ORDER.forEach((id, i) => {
      const done = value.ids.includes(id);
      this.restoreDots[i]?.setFillStyle(done ? colors[id] : 0xffffff, done ? 1 : 0.25);
    });
    if (!initial && n === value.total && this.restoredCount < value.total) {
      this.time.delayedCall(1400, () => this.showBanner('섬이 다시 살아났어요! 🌴'));
    }
    this.restoredCount = n;
  }

  private onPrompt(_p: unknown, prompt: Prompt | null | undefined): void {
    if (!prompt) {
      this.actionBtn.setVisible(false);
      this.infoCard.setVisible(false);
      return;
    }
    this.actionBtn.setVisible(true).setAlpha(prompt.enabled ? 1 : 0.55);
    this.actionLabel.setText(prompt.label);
    this.infoCard.setVisible(!!prompt.info).setText(prompt.info ?? '');
  }

  private onNight(_p: unknown, night: boolean | undefined): void {
    this.timeIcon.setTexture(night ? 'icon-moon' : 'icon-sun');
  }

  private onSound(_p: unknown, on: boolean | undefined): void {
    this.soundIcon.setTexture(on === false ? 'icon-sound-off' : 'icon-sound-on');
  }

  // ---------- messages ----------

  private showToast(message: string): void {
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(message).setAlpha(1).setY(310);
    this.tweens.add({ targets: this.toastText, alpha: 0, y: 290, delay: 1600, duration: 400 });
  }

  private showBanner(message: string): void {
    const text = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.36, message, {
        fontFamily: FONT,
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#ff7a59',
        padding: { x: 28, y: 18 },
      })
      .setOrigin(0.5)
      .setScale(0);
    this.tweens.chain({
      targets: text,
      tweens: [
        { scale: 1, duration: 400, ease: 'Back.Out' },
        { alpha: 0, delay: 2600, duration: 500, onComplete: () => text.destroy() },
      ],
    });
  }
}
