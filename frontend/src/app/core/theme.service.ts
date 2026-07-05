import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'theme-preference';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // Oscuro por defecto (coincide con el diseño de referencia validado con el cliente)
  isDark = signal(true);

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      this.isDark.set(saved === 'dark');
    }
    this.applyTheme();
  }

  toggle(): void {
    this.isDark.set(!this.isDark());
    localStorage.setItem(STORAGE_KEY, this.isDark() ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    document.documentElement.classList.toggle('dark', this.isDark());
  }
}