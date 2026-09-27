/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable, inject } from '@angular/core';

/** rxjs Imports */
import { Observable, defer } from 'rxjs';
import { tap, timeout } from 'rxjs/operators';
import { Logger } from 'app/core/logger/logger.service';
const log = new Logger('Offices resolver');

/** Custom Services */
import { AccountingService } from '../accounting.service';

/**
 * Offices data resolver.
 */
@Injectable()
export class OfficesResolver {
  private accountingService = inject(AccountingService);

  /**
   * Returns the offices data.
   * @returns {Observable<any>}
   */
  resolve(): Observable<any> {
    return defer(() => {
      const started = Date.now();
      log.info('Loading offices before route activation');
      return this.accountingService.getOffices().pipe(
        timeout(30000),
        tap({
          next: (offices) =>
            log.info('Offices loaded', {
              count: Array.isArray(offices) ? offices.length : undefined,
              elapsedMs: Date.now() - started
            }),
          error: (error) =>
            log.error('Office loading failed; route cannot activate', {
              status: error?.status,
              type: error?.name,
              elapsedMs: Date.now() - started
            })
        })
      );
    });
  }
}
