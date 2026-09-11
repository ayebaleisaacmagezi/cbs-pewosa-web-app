/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { finalize } from 'rxjs';

import { DiagnosticEvent, DiagnosticFilters } from 'app/core/diagnostics/diagnostics.models';
import { DiagnosticsService } from 'app/core/diagnostics/diagnostics.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-diagnostics',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule
  ],
  templateUrl: './diagnostics.component.html',
  styleUrl: './diagnostics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiagnosticsComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly diagnosticsService = inject(DiagnosticsService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  readonly displayedColumns = [
    'timestamp',
    'source',
    'severity',
    'status',
    'endpoint',
    'correlationId'
  ];
  readonly pageSize = 25;
  readonly loginForm = this.formBuilder.nonNullable.group({
    password: [
      '',
      Validators.required
    ]
  });
  readonly filtersForm = this.formBuilder.group({
    source: [''],
    severity: [''],
    httpStatus: [null as number | null],
    endpoint: [''],
    correlationId: [''],
    transactionReference: [''],
    from: [''],
    to: ['']
  });

  authenticated = this.diagnosticsService.authenticated;
  loading = false;
  message = '';
  events: DiagnosticEvent[] = [];
  selectedEvent: DiagnosticEvent | null = null;
  expiresAt = '';
  page = 0;
  total = 0;

  login(): void {
    if (this.loginForm.invalid || this.loading) return;
    this.loading = true;
    this.message = '';
    this.diagnosticsService
      .login(this.loginForm.getRawValue().password)
      .pipe(finalize(() => this.finishLoading()))
      .subscribe({
        next: (response) => {
          this.diagnosticsService.setSession(response);
          this.authenticated = true;
          this.expiresAt = response.expiresAt;
          this.loginForm.reset();
          this.loading = false;
          this.loadEvents(true);
        },
        error: (error: unknown) => (this.message = this.diagnosticsService.message(error))
      });
  }

  search(): void {
    this.loadEvents(true);
  }

  clearFilters(): void {
    this.filtersForm.reset({
      source: '',
      severity: '',
      httpStatus: null,
      endpoint: '',
      correlationId: '',
      transactionReference: '',
      from: '',
      to: ''
    });
    this.loadEvents(true);
  }

  loadEvents(resetPage = false): void {
    if (!this.authenticated || this.loading) return;
    if (resetPage) this.page = 0;
    this.loading = true;
    this.message = '';
    this.diagnosticsService
      .findEvents(this.filtersForm.getRawValue() as DiagnosticFilters, this.page, this.pageSize)
      .pipe(finalize(() => this.finishLoading()))
      .subscribe({
        next: (response) => {
          this.events = response.items;
          this.total = response.total;
          if (this.selectedEvent && !response.items.some((item) => item.eventId === this.selectedEvent?.eventId)) {
            this.selectedEvent = null;
          }
        },
        error: (error: unknown) => this.handleSessionError(error)
      });
  }

  previousPage(): void {
    if (this.page === 0) return;
    this.page -= 1;
    this.loadEvents();
  }

  nextPage(): void {
    if ((this.page + 1) * this.pageSize >= this.total) return;
    this.page += 1;
    this.loadEvents();
  }

  selectEvent(event: DiagnosticEvent): void {
    this.loading = true;
    this.diagnosticsService
      .findEvent(event.eventId)
      .pipe(finalize(() => this.finishLoading()))
      .subscribe({
        next: (result) => (this.selectedEvent = result),
        error: (error: unknown) => this.handleSessionError(error)
      });
  }

  logout(): void {
    this.loading = true;
    this.diagnosticsService
      .logout()
      .pipe(finalize(() => this.finishLoading()))
      .subscribe({
        next: () => this.resetSession(),
        error: () => this.resetSession()
      });
  }

  private handleSessionError(error: unknown): void {
    this.message = this.diagnosticsService.message(error);
    if ((error as { status?: number })?.status === 403) this.resetSession();
  }

  private resetSession(): void {
    this.authenticated = false;
    this.events = [];
    this.selectedEvent = null;
    this.total = 0;
    this.page = 0;
    this.expiresAt = '';
  }

  private finishLoading(): void {
    this.loading = false;
    this.changeDetectorRef.markForCheck();
  }
}
