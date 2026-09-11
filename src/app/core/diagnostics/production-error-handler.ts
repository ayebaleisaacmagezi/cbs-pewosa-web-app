/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ErrorHandler, Injectable, inject } from '@angular/core';

import { environment } from 'environments/environment';
import { DiagnosticsService } from './diagnostics.service';

@Injectable()
export class ProductionErrorHandler implements ErrorHandler {
  private readonly diagnosticsService = inject(DiagnosticsService);

  handleError(error: unknown): void {
    const reference = this.diagnosticsService.reportBrowserFailure(error);
    if (environment.production) {
      console.error(`[ApplicationError] Reference ${reference}`);
    } else {
      console.error(`[ApplicationError] Reference ${reference}`, error);
    }
  }
}
