import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'theme-preference';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // true solo cuando el código corre en el navegador (false durante SSR en el servidor)
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Oscuro por defecto (coincide con el diseño validado con el cliente)
  isDark = signal(true);

  constructor() {
    if (this.isBrowser) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.isDark.set(saved === 'dark');
      }
    }
    this.applyTheme();
  }

  toggle(): void {
    this.isDark.set(!this.isDark());
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, this.isDark() ? 'dark' : 'light');
    }
    this.applyTheme();
  }

  private applyTheme(): void {
    // `document` sí existe durante SSR (Angular provee una versión de servidor),
    // así que esto es seguro de dejar sin el guard de isBrowser.
    if (!this.isBrowser) return;
    document.documentElement.classList.toggle('dark', this.isDark());
  }
}