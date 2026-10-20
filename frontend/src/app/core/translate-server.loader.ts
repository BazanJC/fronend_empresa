import { inject, Injectable, makeStateKey, TransferState } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class TranslateServerLoader implements TranslateLoader {
  private transferState = inject(TransferState);

  getTranslation(lang: string): Observable<TranslationObject> {
    const key = makeStateKey<TranslationObject>(`translate-${lang}`);

    const candidatePaths = [
      path.resolve(process.cwd(), 'public', 'i18n', `${lang}.json`),
      path.resolve(process.cwd(), 'dist', 'frontend', 'browser', 'i18n', `${lang}.json`),
      path.resolve(process.cwd(), 'dist', 'browser', 'i18n', `${lang}.json`),
      path.resolve(process.cwd(), 'src', 'assets', 'i18n', `${lang}.json`),
    ];

    for (const filePath of candidatePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(content) as TranslationObject;
          this.transferState.set(key, parsed);
          return of(parsed);
        } catch (err) {
          console.error(`[TranslateServerLoader] Error reading ${filePath}:`, err);
        }
      }
    }

    console.warn(`[TranslateServerLoader] No translation file found for language: ${lang}`);
    return of({} as TranslationObject);
  }
}
