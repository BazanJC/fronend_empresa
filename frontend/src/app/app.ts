import { Component, OnDestroy, OnInit, AfterViewInit, signal, inject, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SeoService } from './core/seo.service';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { LanguageService } from './core/language.service';
import { HERO_COVER_IMAGE, HERO_COVER_IMAGES } from './core/site-media';
import { gsap } from 'gsap';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, TranslatePipe],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  loading = signal(true);
  progressWidth = signal('0%');
  heroCoverImage = signal<string>(HERO_COVER_IMAGE);
  fase = signal(0);
  textoFase = signal('preloader.statusConnecting');

  private seo = inject(SeoService);
  private language = inject(LanguageService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private prefersReducedMotion = false;
  private destroyed = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private decorativeTweens: gsap.core.Tween[] = [];
  private animation?: gsap.core.Timeline;
  private backdropTween?: gsap.core.Tween;
  private outroTimeline?: gsap.core.Timeline;

  ngOnInit(): void {
    this.seo.inicializar();
    this.language.inicializar();
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.timers.push(setTimeout(() => {
      if (this.destroyed) return;
      const imageIndex = Math.floor(Math.random() * HERO_COVER_IMAGES.length);
      this.heroCoverImage.set(HERO_COVER_IMAGES[imageIndex]);
      this.prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (!this.prefersReducedMotion) {
        this.backdropTween = gsap.to('.preloader-backdrop img', {
          scale: 1.045, xPercent: 1, duration: 8, repeat: -1, yoyo: true, ease: 'sine.inOut',
        });
        this.animation = gsap.timeline({ defaults: { ease: 'power3.out' } })
          .fromTo('.preloader-heading', { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.42 })
          .fromTo('.preloader-core', { scale: 0.9, autoAlpha: 0.48 }, { scale: 1, autoAlpha: 1, duration: 0.66 }, '-=0.1')
          .fromTo('.preloader-trace', { strokeDashoffset: 1, autoAlpha: 0.38 }, { strokeDashoffset: 0, autoAlpha: 1, duration: 0.62, stagger: 0.07 }, '-=0.25')
          .fromTo('.preloader-node', { y: 7, scale: 0.97, autoAlpha: 0.22 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.4, stagger: 0.1 }, '-=0.22')
          .fromTo('.preloader-progress', { scaleX: 0.9, autoAlpha: 0.55 }, { scaleX: 1, autoAlpha: 1, duration: 0.3 }, '-=0.1')
          .fromTo('.preloader-statusline', { y: 4, autoAlpha: 0.55 }, { y: 0, autoAlpha: 1, duration: 0.24 }, '-=0.08');
        this.decorativeTweens = [
          gsap.to('.preloader-core-orbit--outer', { rotate: 360, duration: 16, repeat: -1, ease: 'none' }),
          gsap.to('.preloader-core-orbit--inner', { rotate: -360, duration: 22, repeat: -1, ease: 'none' }),
          gsap.to('.preloader-trace-dot', { opacity: 0.45, duration: 0.75, repeat: -1, yoyo: true, stagger: 0.14, ease: 'sine.inOut' }),
        ];
      } else {
        gsap.set('.preloader-heading, .preloader-core, .preloader-trace, .preloader-node, .preloader-progress, .preloader-statusline', { autoAlpha: 1 });
        gsap.set('.preloader-trace', { strokeDashoffset: 0 });
      }
      void this.startLoading();
    }, 0));
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.timers.forEach(clearTimeout);
    this.animation?.kill();
    this.backdropTween?.kill();
    this.outroTimeline?.kill();
    this.decorativeTweens.forEach((tween) => tween.kill());
  }

  private async startLoading(): Promise<void> {
    this.progressWidth.set('18%');
    const steps = [
      { delay: 650, progress: '38%', phase: 1, text: 'preloader.statusSyncing' },
      { delay: 1500, progress: '68%', phase: 2, text: 'preloader.statusPreparing' },
    ];
    for (const step of steps) {
      this.timers.push(setTimeout(() => {
        if (this.destroyed) return;
        this.progressWidth.set(step.progress);
        this.fase.set(step.phase);
        this.textoFase.set(step.text);
      }, step.delay));
    }
    await Promise.all([this.waitForHero(), this.wait(this.prefersReducedMotion ? 380 : 2850)]);
    if (this.destroyed) return;
    this.progressWidth.set('100%');
    this.fase.set(3);
    this.textoFase.set('preloader.statusReady');
    await this.wait(this.prefersReducedMotion ? 120 : 850);
    this.closePreloader();
  }

  private waitForHero(): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const timeout = setTimeout(finish, 2600);
      this.timers.push(timeout);
      const image = new Image();
      function finish(): void {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        resolve();
      }
      image.onload = () => { void image.decode().catch(() => undefined).finally(finish); };
      image.onerror = finish;
      image.src = this.heroCoverImage();
      if (image.complete && image.naturalWidth > 0) void image.decode().catch(() => undefined).finally(finish);
    });
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => this.timers.push(setTimeout(resolve, duration)));
  }

  private closePreloader(): void {
    const overlay = document.querySelector<HTMLElement>('.preloader-overlay');
    const content = document.querySelector<HTMLElement>('.preloader-content');
    this.backdropTween?.kill();
    if (!overlay || !content) {
      this.loading.set(false);
      return;
    }
    this.outroTimeline = gsap.timeline({ onComplete: () => this.loading.set(false) });
    this.outroTimeline
      .to(content, { y: -12, autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
      .to(overlay, { yPercent: -100, duration: 0.72, ease: 'power4.inOut' }, '-=0.04');
  }
}
