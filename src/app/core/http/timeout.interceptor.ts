/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';

/** rxjs Imports */
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/**
 * Applies a global timeout to every HTTP request so a slow or stalled
 * backend can never block navigation indefinitely.
 *
 * Requests that are known to be long-running (reports, exports, document
 * and image downloads) receive a larger budget.
 */
@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  /** Default budget for regular API calls. */
  private readonly defaultTimeoutMs = 30000;

  /** Budget for known slow endpoints (reports, exports, binaries). */
  private readonly longTimeoutMs = 120000;

  /** URL fragments that identify long-running requests. */
  private readonly longRunningPatterns = [
    'reports',
    'runreports',
    'export',
    'documents',
    'images',
    'templates'
  ];

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const timeoutMs = this.longRunningPatterns.some((pattern) => request.url.includes(pattern))
      ? this.longTimeoutMs
      : this.defaultTimeoutMs;

    return next.handle(request).pipe(
      timeout(timeoutMs),
      catchError((error) => {
        if (error instanceof TimeoutError) {
          return throwError(
            () =>
              new HttpErrorResponse({
                error: {
                  defaultUserMessage: 'The server did not respond in time. Please check your connection and retry.'
                },
                status: 408,
                statusText: 'Request Timeout',
                url: request.url
              })
          );
        }
        return throwError(() => error);
      })
    );
  }
}
