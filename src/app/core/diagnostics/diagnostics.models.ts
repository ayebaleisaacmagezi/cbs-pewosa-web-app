/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export type DiagnosticSource = 'ANGULAR' | 'FINERACT';
export type DiagnosticSeverity = 'INFO' | 'WARN' | 'ERROR';

export interface DiagnosticEvent {
  eventId: string;
  source: DiagnosticSource;
  timestamp: string;
  severity: DiagnosticSeverity;
  message: string;
  endpoint?: string;
  httpMethod?: string;
  httpStatus?: number;
  cashierId?: number;
  transactionReference?: string;
  correlationId?: string;
  applicationVersion?: string;
  details?: { errorCode?: string };
}

export interface DiagnosticEventPage {
  page: number;
  size: number;
  total: number;
  items: DiagnosticEvent[];
}

export interface DiagnosticFilters {
  source?: string;
  severity?: string;
  httpStatus?: number | null;
  endpoint?: string;
  correlationId?: string;
  transactionReference?: string;
  from?: string;
  to?: string;
}

export interface DiagnosticLoginResponse {
  token: string;
  expiresAt: string;
  expiresInMinutes: number;
}
