import { ContactService } from './contact.service';

describe('ContactService', () => {
  it('prepares an encoded email draft for the configured recipient', () => {
    const service = new ContactService();
    const url = new URL(service.crearEnlace({
      nombre: 'Ana Pérez',
      email: 'ana@example.com',
      telefono: '+591 700 00000',
      tipoProyecto: 'nuevo',
      servicio: 'videovigilancia',
      mensaje: 'Necesitamos una propuesta para una instalación.',
    }));

    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe(service.recipient);
    expect(url.searchParams.get('subject')).toBe('Solicitud de proyecto - Novaxis International');
    expect(url.searchParams.get('body')).toContain('Nombre: Ana Pérez');
    expect(url.searchParams.get('body')).toContain('Servicio: Videovigilancia (CCTV)');
    expect(url.searchParams.get('body')).toContain('Necesitamos una propuesta para una instalación.');
  });
});