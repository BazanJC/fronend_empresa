import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * MÓDULO 1 — Estructura base del landing
 * -----------------------------------------
 * Contenido de relleno (placeholder), listo para reemplazar con el
 * contenido real de la empresa. Sin estilo fino todavía (Módulo 2).
 * Sin SSR en esta etapa (se activa en el Módulo 7).
 *
 * Próximos módulos que tocan este componente:
 *  - Módulo 2: estilos (tema oscuro, tarjetas, tipografía)
 *  - Módulo 3: animación de carga (loading screen)
 *  - Módulo 4: multi-idioma (ngx-translate) — reemplazar textos por claves i18n
 *  - Módulo 5: mapa interactivo + modal en #presencia-internacional
 *  - Módulo 6: formulario de contacto conectado a Laravel + seguridad (honeypot, rate limit)
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  // Placeholder: en el Módulo 6 esto se mueve a un servicio (ContactoService)
  // que llama a POST /api/contacto en Laravel.
  contactoForm = {
    nombre: '',
    telefono: '',
    email: '',
    tipoProyecto: '',
    servicio: '',
    mensaje: '',
    // Honeypot: campo que un humano nunca llena. Si llega con valor, se descarta.
    // Se oculta con CSS (no con type="hidden", que los bots detectan).
    _hp: ''
  };

  enviarContacto(): void {
    // Placeholder — se conecta en el Módulo 6.
    console.log('Formulario listo para conectar con Laravel:', this.contactoForm);
  }
}