import { Injectable } from '@angular/core';

export const CONTACT_EMAIL = 'contacto@novaxis-international.com';

export interface ContactDraft {
  nombre: string;
  email: string;
  telefono: string;
  tipoProyecto: string;
  servicio: string;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  readonly recipient = CONTACT_EMAIL;

  crearEnlace(draft: ContactDraft): string {
    const subject = 'Solicitud de proyecto - Novaxis International';
    const projectTypes: Record<string, string> = {
      nuevo: 'Proyecto nuevo',
      mantenimiento: 'Mantenimiento',
      otro: 'Otro',
    };
    const services: Record<string, string> = {
      videovigilancia: 'Videovigilancia (CCTV)',
      'control-acceso': 'Control de acceso',
      alarmas: 'Detección de intrusión',
      integracion: 'Centros de control e integración',
      interfonia: 'Interfonía IP',
      redes: 'Redes y fibra óptica',
      nuclear: 'Tecnologías nucleares',
      hvac: 'Mantenimientos especializados',
    };
    const body = [
      `Nombre: ${draft.nombre}`,
      `Correo: ${draft.email}`,
      `Teléfono: ${draft.telefono || 'No indicado'}`,
      `Tipo de proyecto: ${projectTypes[draft.tipoProyecto] ?? draft.tipoProyecto}`,
      `Servicio: ${services[draft.servicio] ?? draft.servicio}`,
      '',
      'Mensaje:',
      draft.mensaje,
    ].join('\n');

    return `mailto:${this.recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}