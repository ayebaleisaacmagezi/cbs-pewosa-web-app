/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateService } from '@ngx-translate/core';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { Dates } from 'app/core/utils/dates';
import {
  LoanCloseRequest,
  LoanCloseResponse,
  LoanClosureReadiness
} from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-loan-closure',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    ReactiveFormsModule,
    FaIconComponent,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './loan-closure.component.html',
  styleUrls: ['./loan-closure.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanClosureComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicingService = inject(PewosaLoanServicingService);
  private readonly authService = inject(AuthenticationService);
  private readonly route = inject(ActivatedRoute);
  private readonly dates = inject(Dates);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateService = inject(TranslateService);

  loanId!: number;
  loading = false;
  submitting = false;
  denied = false;
  errorMessage: string | null = null;
  conflictError: string | null = null;
  successMessage: string | null = null;

  readiness: LoanClosureReadiness | null = null;
  closureResult: LoanCloseResponse | null = null;

  hasClosePermission = false;
  closureForm!: FormGroup;

  ngOnInit(): void {
    const parentParams = this.route.parent?.snapshot.params;
    const currentParams = this.route.snapshot.params;
    this.loanId = Number(parentParams?.['loanId'] || currentParams?.['loanId']);

    const credentials = this.authService.getCredentials();
    const permissions: string[] = credentials?.permissions || [];
    this.hasClosePermission =
      permissions.includes('ALL_FUNCTIONS') || permissions.includes('CLOSE_PEWOSALOAN');

    if (!this.hasClosePermission) {
      this.denied = true;
      this.errorMessage = this.translateService.instant(
        'Access denied: You lack the CLOSE_PEWOSALOAN permission.'
      );
      this.cdr.markForCheck();
      return;
    }

    this.initForm();
    if (this.loanId) {
      this.loadReadiness();
    }
  }

  private initForm(): void {
    this.closureForm = this.fb.group({
      closureDate: [new Date(), Validators.required],
      closureNotes: ['', Validators.required],
      idempotencyKey: [`CLOSE-${Date.now()}`, Validators.required]
    });
  }

  loadReadiness(): void {
    this.loading = true;
    this.errorMessage = null;
    this.cdr.markForCheck();

    this.servicingService
      .getClosureReadiness(this.loanId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.readiness = data;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.loading = false;
          if (error?.status === 403) {
            this.denied = true;
            this.errorMessage = this.translateService.instant(
              'Access denied: You lack permission to inspect closure readiness.'
            );
          } else {
            this.errorMessage =
              error?.error?.defaultUserMessage ||
              error?.message ||
              this.translateService.instant('Failed to load closure readiness.');
          }
          this.cdr.markForCheck();
        }
      });
  }

  submitClosure(): void {
    if (this.closureForm.invalid || !this.readiness) {
      this.closureForm.markAllAsTouched();
      return;
    }

    if (!this.readiness.readyForClosure) {
      this.errorMessage = this.translateService.instant(
        'Loan is not ready for closure. Please address all blocking reasons before proceeding.'
      );
      this.cdr.markForCheck();
      return;
    }

    this.submitting = true;
    this.errorMessage = null;
    this.conflictError = null;
    this.cdr.markForCheck();

    const formVal = this.closureForm.value;
    const clDate = formVal.closureDate instanceof Date
      ? this.dates.formatDate(formVal.closureDate, 'yyyy-MM-dd')
      : String(formVal.closureDate);

    const payload: LoanCloseRequest = {
      expectedLoanVersion: this.readiness.loanVersion,
      idempotencyKey: formVal.idempotencyKey,
      closureDate: clDate,
      closureNotes: formVal.closureNotes
    };

    this.servicingService
      .closeLoan(this.loanId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: LoanCloseResponse) => {
          this.closureResult = res;
          if (this.readiness) {
            this.readiness.loanStatus = res.loanStatus;
          }
          this.submitting = false;
          this.successMessage = this.translateService.instant(
            'Loan closed with obligations met natively in Fineract.'
          );
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          this.submitting = false;
          if (error?.status === 409) {
            this.conflictError = this.translateService.instant(
              'Concurrency conflict: Loan version is stale. Refresh to obtain authoritative status.'
            );
          } else {
            this.errorMessage =
              error?.error?.defaultUserMessage ||
              error?.message ||
              this.translateService.instant('Failed to close loan account.');
          }
          this.cdr.markForCheck();
        }
      });
  }
}
