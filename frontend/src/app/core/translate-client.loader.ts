import { inject, Injectable, makeStateKey, TransferState } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { catchError, Observable, of } from 'rxjs';

@Injectable()
export class TranslateClientLoader implements TranslateLoader {
  private transferState = inject(TransferState);
  private http = inject(HttpClient);

  getTranslation(lang: string): Observable<TranslationObject> {
    const key = makeStateKey<TranslationObject>(`translate-${lang}`);
    const cached = this.transferState.get(key, null);
    if (cached) {
      this.transferState.remove(key);
      return of(cached);
    }

    return this.http.get<TranslationObject>(`/i18n/${lang}.json`).pipe(
      catchError((err) => {
        console.warn(`[TranslateClientLoader] Could not load /i18n/${lang}.json:`, err);
        return of({} as TranslationObject);
      }),
    );
  }
}
