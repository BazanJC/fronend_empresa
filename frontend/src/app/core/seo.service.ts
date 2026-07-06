import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private translate = inject(TranslateService);

  /**
   * Se llama una vez desde el componente raíz. Actualiza el título y las
   * meta tags al iniciar, y vuelve a hacerlo cada vez que el usuario
   * cambia de idioma (ES/EN/FR) — así el <title> y las descripciones
   * siempre coinciden con el idioma que se está mostrando.
   */
  inicializar(): void {
    this.actualizarMetaTags();
    this.translate.onLangChange.subscribe(() => this.actualizarMetaTags());
  }

  private actualizarMetaTags(): void {
    const titulo = this.translate.instant('seo.title');
    const descripcion = this.translate.instant('seo.description');

    this.titleService.setTitle(titulo);

    this.metaService.updateTag({ name: 'description', content: descripcion });

    // Open Graph (cómo se ve el link al compartir en WhatsApp/Facebook/LinkedIn)
    this.metaService.updateTag({ property: 'og:title', content: titulo });
    this.metaService.updateTag({ property: 'og:description', content: descripcion });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    this.metaService.updateTag({ property: 'og:image', content: 'https://[dominio-empresa].com/og-image.jpg' });
    this.metaService.updateTag({ property: 'og:url', content: 'https://[dominio-empresa].com' });

    // Twitter Card (mismo propósito, para X/Twitter)
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: titulo });
    this.metaService.updateTag({ name: 'twitter:description', content: descripcion });
  }
}