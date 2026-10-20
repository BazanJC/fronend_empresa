import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { TranslateClientLoader } from './core/translate-client.loader';

import { routes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
  withNoIncrementalHydration,
} from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideTranslateService({
      lang: 'es',
      fallbackLang: 'es',
      loader: provideTranslateLoader(TranslateClientLoader),
    }),
    provideClientHydration(withEventReplay(), withNoIncrementalHydration()),
  ],
};
