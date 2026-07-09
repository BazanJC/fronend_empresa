import { Component } from '@angular/core';
import { NgParticlesModule } from 'ng-particles';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, NgParticlesModule],
  template: `
    <ng-particles [id]="'tsparticles'" [options]="particlesOptions"></ng-particles>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      background: var(--bg-light);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    ng-particles ::ng-deep canvas {
      width: 100%;
      height: 100%;
    }
  `]
})
export class LoadingSpinnerComponent {
  // Configuración simple de partículas
  particlesOptions = {
    background: {
      color: { value: '#f5f5f5' }
    },
    fpsLimit: 60,
    interactivity: {
      events: { onHover: { enable: true, mode: 'repulse' } },
      modes: { repulse: { distance: 100, duration: 0.4 } }
    },
    particles: {
      color: { value: '#555555' },
      links: { enable: false },
      move: { enable: true, speed: 1 },
      number: { value: 80 },
      opacity: { value: 0.5 },
      shape: { type: 'circle' },
      size: { value: { min: 1, max: 3 } }
    }
  };
}
