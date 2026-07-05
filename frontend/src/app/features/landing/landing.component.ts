import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../core/theme.service';

/**
 * MÓDULO 2 — Estilo visual
 * -----------------------------------------
 * Misma estructura y contenido del Módulo 1, ahora con estilo real:
 * Tailwind CSS, tarjetas "glass", tipografía de marca, y soporte
 * completo de tema claro/oscuro (ThemeService).
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  constructor(public theme: ThemeService) {}

  contactoForm = {
    nombre: '', telefono: '', email: '', tipoProyecto: '',
    servicio: '', mensaje: '', _hp: ''
  };

  enviarContacto(): void {
    console.log('Formulario listo para conectar con Laravel:', this.contactoForm);
  }
}