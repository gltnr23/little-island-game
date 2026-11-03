import Phaser from 'phaser';
import { createTextures } from '../game/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    createTextures(this);
    this.scene.start('Game');
    this.scene.launch('UI');
  }
}
