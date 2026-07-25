import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './core/seo.service';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  loading = signal(true);
  cerrando = signal(false); // activa la transición de salida antes de quitarlo del DOM
  progressWidth = signal('0%');
  private seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.inicializar();

    setTimeout(() => this.progressWidth.set('100%'), 100);
    setTimeout(() => this.cerrando.set(true), 1900);  // empieza el fundido
    setTimeout(() => this.loading.set(false), 2500);  // recién aquí sale del DOM
  }
}