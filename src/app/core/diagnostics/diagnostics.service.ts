/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';

import { environment } from 'environments/environment';
import { SettingsService } from 'app/settings/settings.service';
import { DiagnosticEvent, DiagnosticEventPage, DiagnosticFilters, DiagnosticLoginResponse } from './diagnostics.models';

@Injectable({ providedIn: 'root' })
export class DiagnosticsService {
  private readonly settingsService = inject(SettingsService);
  private readonly http = new HttpClient(inject(HttpBackend));
  private sessionToken = '';

  get authenticated(): boolean {
    return Boolean(this.sessionToken);
  }

  login(password: string): Observable<DiagnosticLoginResponse> {
    return this.http.post<DiagnosticLoginResponse>(`${this.baseUrl}/login`, { password }, { headers: this.headers() });
  }

  setSession(response: DiagnosticLoginResponse): void {
    this.sessionToken = response.token;
  }

  logout(): Observable<{ loggedOut: boolean }> {
    return this.http
      .post<{ loggedOut: boolean }>(`${this.baseUrl}/logout`, {}, { headers: this.headers(true) })
      .pipe(finalize(() => (this.sessionToken = '')));
  }

  findEvents(filters: DiagnosticFilters, page: number, size: number): Observable<DiagnosticEventPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    Object.entries(filters).forEach(
      ([
        key,
        value
      ]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, this.isoDateValue(key, value));
        }
      }
    );
    return this.http.get<DiagnosticEventPage>(`${this.baseUrl}/logs`, { headers: this.headers(true), params });
  }

  findEvent(eventId: string): Observable<DiagnosticEvent> {
    return this.http.get<DiagnosticEvent>(`${this.baseUrl}/logs/${encodeURIComponent(eventId)}`, {
      headers: this.headers(true)
    });
  }

  reportHttpFailure(request: HttpRequest<unknown>, response: HttpErrorResponse, correlationId: string): void {
    const errorCode = this.errorCode(response);
    this.report({
      source: 'ANGULAR',
      severity: 'ERROR',
      message: `HTTP ${response.status || 0} ${request.method} request failed`,
      endpoint: this.endpoint(request.url),
      httpMethod: request.method,
      httpStatus: response.status || 0,
      correlationId,
      applicationVersion: environment.version,
      details: errorCode ? { errorCode } : undefined
    });
  }

  reportBrowserFailure(error: unknown): string {
    const correlationId = this.newCorrelationId();
    const message = this.sanitizeMessage(
      error instanceof Error ? `${error.name}: ${error.message}` : 'Unexpected browser error'
    );
    this.report({
      source: 'ANGULAR',
      severity: 'ERROR',
      message,
      correlationId,
      applicationVersion: environment.version,
      details: { errorCode: 'UNEXPECTED_BROWSER_ERROR' }
    });
    return correlationId;
  }

  newCorrelationId(): string {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  message(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.defaultUserMessage || error.error?.message || error.message || 'Diagnostics request failed.';
    }
    return error instanceof Error ? error.message : 'Diagnostics request failed.';
  }

  private report(event: Partial<DiagnosticEvent>): void {
    if (!environment.productionDiagnosticsEnabled) return;
    this.http
      .post(`${this.baseUrl}/client-errors`, event, { headers: this.headers() })
      .subscribe({ error: () => undefined });
  }

  private get baseUrl(): string {
    return `${this.settingsService.serverUrl}/pewosa/diagnostics`;
  }

  private headers(includeToken = false): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Fineract-Platform-TenantId': this.settingsService.tenantIdentifier || environment.fineractPlatformTenantId
    });
    if (includeToken && this.sessionToken) headers = headers.set('X-Diagnostics-Token', this.sessionToken);
    return headers;
  }

  private endpoint(url: string): string {
    try {
      return new URL(url, globalThis.location?.origin).pathname;
    } catch {
      return url.split(/[?#]/, 1)[0];
    }
  }

  private errorCode(response: HttpErrorResponse): string | undefined {
    const error = response.error;
    return error?.userMessageGlobalisationCode || error?.errors?.[0]?.userMessageGlobalisationCode || undefined;
  }

  private isoDateValue(key: string, value: unknown): string {
    if ((key === 'from' || key === 'to') && typeof value === 'string') return new Date(value).toISOString();
    return String(value);
  }

  private sanitizeMessage(message: string): string {
    return message
      .replace(/(authorization|password|passwd|token|cookie|session|pin|otp)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
      .replace(/(^|\D)\d{7,}(?=\D|$)/g, '$1[REDACTED_NUMBER]')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
      .slice(0, 500);
  }
}
