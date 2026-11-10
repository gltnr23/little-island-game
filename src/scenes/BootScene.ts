import Phaser from 'phaser';
import { createTextures } from '../game/textures';
import { createWorldTextures } from '../game/textures-world';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    createTextures(this);
    createWorldTextures(this);
    this.scene.start('Game');
    this.scene.launch('UI');
  }
}
