import { trigger, transition, style, animate, query, stagger, keyframes, state, group } from '@angular/animations';

export const fadeInUp = trigger('fadeInUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(40px)' }),
    animate('700ms cubic-bezier(0.23, 1, 0.32, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

export const staggerFadeIn = trigger('staggerFadeIn', [
  transition(':enter', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(30px)' }),
      stagger(120, [
        animate('600ms cubic-bezier(0.23, 1, 0.32, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

export const fadeInItem = trigger('fadeInItem', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(20px)' }),
    animate('500ms cubic-bezier(0.23, 1, 0.32, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

export const pulse = trigger('pulse', [
  state('void', style({ transform: 'scale(1)' })),
  state('*', style({ transform: 'scale(1)' })),
  transition('* => *', [
    animate('3s ease-in-out', keyframes([
      style({ transform: 'scale(1)', offset: 0 }),
      style({ transform: 'scale(1.03)', offset: 0.5 }),
      style({ transform: 'scale(1)', offset: 1 })
    ]))
  ])
]);

export const slideInLeft = trigger('slideInLeft', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-50px)' }),
    animate('600ms cubic-bezier(0.23, 1, 0.32, 1)', style({ opacity: 1, transform: 'translateX(0)' }))
  ])
]);

export const slideInRight = trigger('slideInRight', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(50px)' }),
    animate('600ms cubic-bezier(0.23, 1, 0.32, 1)', style({ opacity: 1, transform: 'translateX(0)' }))
  ])
]);

export const scaleIn = trigger('scaleIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.9)' }),
    animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' }))
  ])
]);

export const counterAnimation = trigger('counterAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(20px) scale(0.8)' }),
    animate('800ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
  ])
]);

export const shimmer = trigger('shimmer', [
  transition(':enter', [
    style({ backgroundPosition: '200% 0' }),
    animate('2s ease-in-out', style({ backgroundPosition: '-200% 0' }))
  ])
]);

export const float = trigger('float', [
  transition(':enter', [
    animate('6s ease-in-out', keyframes([
      style({ transform: 'translateY(0) translateX(0)', offset: 0 }),
      style({ transform: 'translateY(-15px) translateX(10px)', offset: 0.25 }),
      style({ transform: 'translateY(5px) translateX(-5px)', offset: 0.5 }),
      style({ transform: 'translateY(-10px) translateX(5px)', offset: 0.75 }),
      style({ transform: 'translateY(0) translateX(0)', offset: 1 })
    ]))
  ])
]);

export const glowPulse = trigger('glowPulse', [
  transition(':enter', [
    animate('4s ease-in-out', keyframes([
      style({ boxShadow: '0 0 20px rgba(0, 153, 255, 0.2)', offset: 0 }),
      style({ boxShadow: '0 0 40px rgba(0, 153, 255, 0.4), 0 0 60px rgba(0, 153, 255, 0.2)', offset: 0.5 }),
      style({ boxShadow: '0 0 20px rgba(0, 153, 255, 0.2)', offset: 1 })
    ]))
  ])
]);