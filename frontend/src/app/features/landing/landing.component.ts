import { Component, inject, AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../core/theme.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  private translate = inject(TranslateService);
  private el = inject(ElementRef);
  private observer: IntersectionObserver | null = null;

  constructor(public theme: ThemeService) {}

  ngAfterViewInit(): void {
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
    console.log('Formulario listo para conectar con Laravel:', this.contactoForm);
  }
}