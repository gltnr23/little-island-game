import Phaser from 'phaser';

/**
 * Floating virtual joystick: touch anywhere on the lower part of the screen,
 * drag to move. Returns a vector with magnitude 0..1.
 */
export class Joystick {
  readonly vector = new Phaser.Math.Vector2();
  private base: Phaser.GameObjects.Image;
  private knob: Phaser.GameObjects.Image;
  private pointerId: number | null = null;
  private readonly radius = 70;
  private readonly rest: Phaser.Math.Vector2;

  constructor(private scene: Phaser.Scene, restX: number, restY: number, private activeTop: number) {
    this.rest = new Phaser.Math.Vector2(restX, restY);
    this.base = scene.add.image(restX, restY, 'joy-base').setAlpha(0.45).setDepth(10);
    this.knob = scene.add.image(restX, restY, 'joy-knob').setAlpha(0.6).setDepth(11);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', this.onDown, this);
      scene.input.off('pointermove', this.onMove, this);
      scene.input.off('pointerup', this.onUp, this);
      scene.input.off('pointerupoutside', this.onUp, this);
    });
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null || pointer.y < this.activeTop) return;
    this.pointerId = pointer.id;
    this.base.setPosition(pointer.x, pointer.y).setAlpha(0.8);
    this.knob.setPosition(pointer.x, pointer.y).setAlpha(1);
    this.vector.set(0, 0);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    const dx = pointer.x - this.base.x;
    const dy = pointer.y - this.base.y;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, this.radius);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;
    this.knob.setPosition(this.base.x + nx * clamped, this.base.y + ny * clamped);
    // small dead zone
    const mag = clamped < 8 ? 0 : clamped / this.radius;
    this.vector.set(nx * mag, ny * mag);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.vector.set(0, 0);
    this.scene.tweens.add({ targets: [this.base, this.knob], x: this.rest.x, y: this.rest.y, duration: 120 });
    this.base.setAlpha(0.45);
    this.knob.setAlpha(0.6);
  }
}
