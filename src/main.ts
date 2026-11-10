import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { sfx } from './game/audio';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#2b8fc4',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 3 },
  // Sound is synthesized by our own Web Audio code (src/game/audio.ts).
  audio: { noAudio: true },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, GameScene, UIScene],
});

// Exposed for debugging / automated checks.
(window as unknown as { __game: Phaser.Game; __sfx: typeof sfx }).__game = game;
(window as unknown as { __sfx: typeof sfx }).__sfx = sfx;

// Browsers only allow audio after a user gesture; unlock on the first touch/key.
for (const ev of ['pointerdown', 'touchend', 'keydown'] as const) {
  window.addEventListener(ev, () => sfx.unlock(), { passive: true });
}
