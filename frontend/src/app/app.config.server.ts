import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideTranslateLoader } from '@ngx-translate/core';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { TranslateServerLoader } from './core/translate-server.loader';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideTranslateLoader(TranslateServerLoader),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
