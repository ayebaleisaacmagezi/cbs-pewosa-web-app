/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpBackend, HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';

/** Environment Configuration */

/** Main Component */
import { WebAppComponent } from './web-app.component';

/** Not Found Component */
import { NotFoundComponent } from './not-found/not-found.component';

/** Custom Modules */
import { CoreModule } from './core/core.module';
import { HomeModule } from './home/home.module';
import { ConfigurationWizardModule } from './configuration-wizard/configuration-wizard.module';
import { PortalModule } from '@angular/cdk/portal';

/** Main Routing Module */
import { AppRoutingModule } from './app-routing.module';
import { DatePipe, LocationStrategy } from '@angular/common';
import {
  TranslateLoader,
  TranslateModule,
  MissingTranslationHandler,
  MissingTranslationHandlerParams
} from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AuthenticationInterceptor as TokenInterceptor } from './core/authentication/authentication.interceptor';
import { TokenInterceptor as ZitadelTokenInterceptor } from './zitadel/token.interceptor';
import { AuthService } from './zitadel/auth.service';
import { environment } from '../environments/environment';
import { CallbackComponent } from './zitadel/callback/callback.component';
import { OAuthModule } from 'angular-oauth2-oidc';
import { provideLottieOptions } from 'ngx-lottie';

export class CustomMissingTranslationHandler implements MissingTranslationHandler {
  private readonly reportedKeys = new Set<string>();
  private readonly reportLimit = 20;

  handle(params: MissingTranslationHandlerParams): string {
    if (!this.reportedKeys.has(params.key) && this.reportedKeys.size < this.reportLimit) {
      this.reportedKeys.add(params.key);
      console.warn('[TranslationDiagnostics] Missing translation key', {
        language: params.translateService.currentLang || 'not selected',
        key: params.key
      });
      if (this.reportedKeys.size === this.reportLimit) {
        console.warn('[TranslationDiagnostics] Further missing-key messages are suppressed.');
      }
    }
    // Remove the 'labels.catalogs.' prefix and return the fallback value
    return params.key.replace('labels.catalogs.', '');
  }
}

@NgModule({
  declarations: [WebAppComponent],
  bootstrap: [WebAppComponent],
  imports: [
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (httpBackend: HttpBackend, locationStrategy: LocationStrategy) => {
          const http = new HttpClient(httpBackend);
          return new TranslateHttpLoader(http, `/assets/translations/`, '.json');
        },
        deps: [
          HttpBackend,
          LocationStrategy
        ]
      },
      missingTranslationHandler: { provide: MissingTranslationHandler, useClass: CustomMissingTranslationHandler }
    }),
    BrowserModule,
    BrowserAnimationsModule,
    PortalModule,
    CoreModule,
    HomeModule,
    ConfigurationWizardModule,
    AppRoutingModule,
    NotFoundComponent,
    CallbackComponent,
    OAuthModule.forRoot()
  ],
  providers: [
    DatePipe,
    AuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: !environment.OIDC.oidcServerEnabled ? TokenInterceptor : ZitadelTokenInterceptor,
      multi: true
    },
    provideLottieOptions({
      player: () => import('lottie-web')
    })
  ]
})
export class AppModule {}
