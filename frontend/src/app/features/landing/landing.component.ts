import { Component, inject, AfterViewInit, ElementRef, OnDestroy, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MapaMundialComponent } from '../../shared/mapa-mundial/mapa-mundial.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, MapaMundialComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  private translate = inject(TranslateService);
  private el = inject(ElementRef);
  private observer: IntersectionObserver | null = null;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  estadoEnvio = signal<'idle' | 'enviando' | 'exito' | 'error'>('idle');

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.15 });

    const reveals = this.el.nativeElement.querySelectorAll('.reveal');
    reveals.forEach((reveal: Element) => this.observer?.observe(reveal));
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  cambiarIdioma(lang: string): void {      
    this.translate.use(lang);
  }

  contactoForm = {
    nombre: '', telefono: '', email: '', tipoProyecto: '',
    servicio: '', mensaje: '', _hp: ''
  };

   enviarContacto(): void {
    if (this.estadoEnvio() === 'enviando') return; // evita doble clic
 
    // Honeypot: si el campo trampa viene lleno, es un bot — no hacemos
    // nada real, pero fingimos éxito para no delatar la protección.
    if (this.contactoForm._hp) {
      this.estadoEnvio.set('exito');
      return;
    }
 
    this.estadoEnvio.set('enviando');
 
    setTimeout(() => {
      this.estadoEnvio.set('exito');
      this.contactoForm = {
        nombre: '', telefono: '', email: '', tipoProyecto: '',
        servicio: '', mensaje: '', _hp: ''
      };
    }, 1200);
  }
  
}