/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterModule } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TranslateModule } from '@ngx-translate/core';
import { finalize } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { LoanApprovalQueueItem, LoanApprovalQueueResponse } from '../../pewosa-loan-application.models';
import { PewosaLoanApplicationService } from '../../pewosa-loan-application.service';

@Component({
  selector: 'mifosx-loan-approval-queue',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TranslateModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    FaIconComponent,
    ...STANDALONE_SHARED_IMPORTS
  ],
  templateUrl: './loan-approval-queue.component.html',
  styleUrls: ['./loan-approval-queue.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanApprovalQueueComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly loanApplicationService = inject(PewosaLoanApplicationService);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  loading = false;
  denied = false;
  errorMessage: string | null = null;
  items: LoanApprovalQueueItem[] = [];
  totalFilteredRecords = 0;
  page = 0;
  pageSize = 20;
  readonly pageSizeOptions = [
    10,
    20,
    50
  ];

  selectedAuthority = '';
  readonly authorities = [
    { value: '', label: 'All Authorities' },
    { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
    { value: 'CREDIT_COMMITTEE', label: 'Credit Committee' },
    { value: 'BOARD', label: 'Board' }
  ];

  readonly displayedColumns = [
    'loanAccountNo',
    'clientName',
    'officeName',
    'productName',
    'proposedPrincipal',
    'requiredAuthority',
    'status',
    'evidenceStatus',
    'actions'
  ];

  get hasReadPermission(): boolean {
    const permissions = this.authenticationService.getCredentials()?.permissions || [];
    return (
      permissions.includes('ALL_FUNCTIONS') ||
      permissions.includes('ALL_FUNCTIONS_READ') ||
      permissions.includes('READ_PEWOSALOANAPPROVAL') ||
      permissions.includes('APPROVE_PEWOSALOANAPPROVAL') ||
      permissions.includes('APPROVE_PEWOSALOANBRANCHMANAGER') ||
      permissions.includes('APPROVE_PEWOSALOANCREDITCOMMITTEE') ||
      permissions.includes('APPROVE_PEWOSALOANBOARD')
    );
  }

  ngOnInit(): void {
    if (!this.hasReadPermission) {
      this.denied = true;
      return;
    }
    this.fetchQueue();
  }

  fetchQueue(): void {
    if (!this.hasReadPermission) {
      this.denied = true;
      this.changeDetectorRef.markForCheck();
      return;
    }
    this.loading = true;
    this.errorMessage = null;
    this.denied = false;
    this.loanApplicationService
      .getApprovalQueue({
        authority: this.selectedAuthority || undefined,
        page: this.page,
        size: this.pageSize
      })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (response: LoanApprovalQueueResponse) => {
          this.items = response.pageItems || [];
          this.totalFilteredRecords = response.totalFilteredRecords || 0;
          this.changeDetectorRef.markForCheck();
        },
        error: (err: any) => {
          if (err?.status === 403) {
            this.denied = true;
          } else {
            this.errorMessage = 'Approval queue could not be loaded.';
          }
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.pageSize = event.pageSize;
    this.fetchQueue();
  }

  onAuthorityChange(authority: string): void {
    this.selectedAuthority = authority;
    this.page = 0;
    this.fetchQueue();
  }

  retry(): void {
    this.fetchQueue();
  }

  canReview(item: LoanApprovalQueueItem): boolean {
    const permissions = this.authenticationService.getCredentials()?.permissions || [];
    if (permissions.includes('ALL_FUNCTIONS')) {
      return true;
    }
    switch (item.requiredAuthority) {
      case 'BRANCH_MANAGER':
        return permissions.includes('APPROVE_PEWOSALOANBRANCHMANAGER');
      case 'CREDIT_COMMITTEE':
        return permissions.includes('APPROVE_PEWOSALOANCREDITCOMMITTEE');
      case 'BOARD':
        return permissions.includes('APPROVE_PEWOSALOANBOARD');
      default:
        return false;
    }
  }

  navigateToApproval(item: LoanApprovalQueueItem): void {
    this.router.navigate([
      '/clients',
      item.clientId,
      'loans-accounts',
      item.loanId,
      'approval'
    ]);
  }
}
