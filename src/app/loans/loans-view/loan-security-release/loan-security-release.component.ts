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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateService } from '@ngx-translate/core';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import {
  LoanClosureReadiness,
  SecurityReleaseRequest,
  SecurityReleaseResponse,
  UnreleasedSecurity
} from 'app/loans/pewosa-loan-servicing.models';
import { PewosaLoanServicingService } from 'app/loans/pewosa-loan-servicing.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

@Component({
  selector: 'mifosx-loan-security-release',
  standalone: true,
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    ReactiveFormsModule,
    FaIconComponent,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe
  ],
  templateUrl: './loan-security-release.component.html',
  styleUrls: ['./loan-security-release.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanSecurityReleaseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicingService = inject(PewosaLoanServicingService);
  private readonly authService = inject(AuthenticationService);
  private readonly route = inject(ActivatedRoute);
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
  releasedSecurities: SecurityReleaseResponse[] = [];
  selectedSecurity: UnreleasedSecurity | null = null;

  hasReleasePermission = false;
  releaseForm!: FormGroup;

  ngOnInit(): void {
    const parentParams = this.route.parent?.snapshot.params;
    const currentParams = this.route.snapshot.params;
    this.loanId = Number(parentParams?.['loanId'] || currentParams?.['loanId']);

    const credentials = this.authService.getCredentials();
    const permissions: string[] = credentials?.permissions || [];
    this.hasReleasePermission = permissions.includes('ALL_FUNCTIONS') || permissions.includes('RELEASE_PEWOSASECURITY');

    if (!this.hasReleasePermission) {
      this.denied = true;
      this.errorMessage = this.translateService.instant(
        'Access denied: You lack the RELEASE_PEWOSASECURITY permission.'
      );
      this.cdr.markForCheck();
      return;
    }

    this.initForm();
    if (this.loanId) {
      this.loadClosureReadiness();
    }
  }

  private initForm(): void {
    this.releaseForm = this.fb.group({
      securityId: [
        null,
        Validators.required
      ],
      releaseReason: [
        'LOAN_FULLY_PAID',
        Validators.required
      ],
      releaseNotes: [
        '',
        Validators.required
      ],
      acknowledgementDocumentId: [''],
      idempotencyKey: [
        `SEC-REL-${Date.now()}`,
        Validators.required
      ]
    });

    this.releaseForm
      .get('securityId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.selectedSecurity = this.readiness?.unreleasedSecurities.find((s) => s.securityId === id) || null;
      });
  }

  loadClosureReadiness(): void {
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
          // Auto-select first unreleased security if available
          if (data.unreleasedSecurities?.length > 0) {
            this.releaseForm.patchValue({ securityId: data.unreleasedSecurities[0].securityId });
          }
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
              this.translateService.instant('Failed to load closure readiness and security status.');
          }
          this.cdr.markForCheck();
        }
      });
  }

  submitRelease(): void {
    if (this.releaseForm.invalid || !this.readiness || !this.selectedSecurity) {
      this.releaseForm.markAllAsTouched();
      return;
    }

    if (!this.hasReleasePermission || !this.readiness.securityReleaseAllowed) {
      this.errorMessage = this.translateService.instant(
        'Security release is not allowed for the current authoritative loan state.'
      );
      this.cdr.markForCheck();
      return;
    }

    this.submitting = true;
    this.errorMessage = null;
    this.conflictError = null;
    this.cdr.markForCheck();

    const formVal = this.releaseForm.value;
    const payload: SecurityReleaseRequest = {
      expectedLoanVersion: this.readiness.loanVersion,
      expectedSecurityVersion: this.selectedSecurity.securityVersion,
      idempotencyKey: formVal.idempotencyKey,
      releaseReason: formVal.releaseReason,
      releaseNotes: formVal.releaseNotes,
      acknowledgementDocumentId: formVal.acknowledgementDocumentId || undefined
    };

    this.servicingService
      .releaseSecurity(this.loanId, this.selectedSecurity.securityType, this.selectedSecurity.securityId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: SecurityReleaseResponse) => {
          this.releasedSecurities.push(res);
          this.submitting = false;
          this.successMessage = this.translateService.instant('Security successfully released.', {
            securityType: res.securityType,
            securityId: res.securityId
          });
          // Reload readiness to reflect remaining securities
          this.loadClosureReadiness();
        },
        error: (error: any) => {
          this.submitting = false;
          if (error?.status === 409) {
            this.conflictError = this.translateService.instant(
              'Optimistic lock conflict: Security version or loan version is stale. Refreshing state.'
            );
          } else {
            this.errorMessage =
              error?.error?.defaultUserMessage ||
              error?.message ||
              this.translateService.instant('Failed to release security.');
          }
          this.cdr.markForCheck();
        }
      });
  }
}
