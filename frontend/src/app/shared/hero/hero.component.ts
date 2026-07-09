import { Component } from '@angular/core';

import { fadeInUp, staggerFadeIn, fadeInItem, pulse } from '../animations';

@Component({
  selector: 'app-hero',
  standalone: true,

  template: `
<section class="hero-banner flex items-center bg-cover bg-center relative" style="height:60vh; background-image:url('/assets/hero_banner.png');" @fadeInUp>
  <div class="absolute inset-0 bg-black/30"></div>
  <div class="container mx-auto flex items-center px-4 relative z-10">
    <img src="/assets/logo-novaxis.png" alt="Novaxis Logo" class="h-16 md:h-24 mr-6" @fadeInItem>
    <div class="text-white" @fadeInItem>
      <h1 class="text-3xl md:text-5xl font-bold mb-4" @fadeInItem>Innovación y Tecnología</h1>
      <p class="text-lg mb-6" @fadeInItem>Impulsando tu negocio al futuro.</p>
      <button class="bg-primary text-on-primary px-6 py-3 rounded hover:brightness-110 transition" @pulse>Descubre más</button>
    </div>
  </div>
</section>
`,
  animations: [fadeInUp, staggerFadeIn, fadeInItem, pulse]
})
export class HeroComponent { }
