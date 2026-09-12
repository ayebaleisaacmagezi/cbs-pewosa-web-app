/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

/** Custom Services */
import { environment } from '../../../../environments/environment';
import { LoansService } from 'app/loans/loans.service';
import { SettingsService } from 'app/settings/settings.service';
import { EntityDocumentsTabComponent } from '../../../shared/tabs/entity-documents-tab/entity-documents-tab.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { LoanDocumentChecklist } from '../../pewosa-loan-application.models';
import { PewosaLoanApplicationService } from '../../pewosa-loan-application.service';

/**
 * Overdue charges tab component
 */
@Component({
  selector: 'mifosx-loan-documents-tab',
  templateUrl: './loan-documents-tab.component.html',
  styleUrls: ['./loan-documents-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    EntityDocumentsTabComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanDocumentsTabComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private loansService = inject(LoansService);
  private settingsService = inject(SettingsService);
  private pewosaLoanApplicationService = inject(PewosaLoanApplicationService);
  private changeDetectorRef = inject(ChangeDetectorRef);

  /** Stores the resolved loan documents data */
  entityDocuments: any;
  /** Loan account Id */
  entityId: string;
  entityType = 'loans';
  documentChecklist: LoanDocumentChecklist | null = null;
  selectedDocumentByRequirement: Record<string, number | null> = {};
  rejectionReasonByRequirement: Record<string, FormControl<string>> = {};
  workflowMessage = '';

  /**
   * Retrieves the loans data from `resolve`.
   * @param {ActivatedRoute} route Activated Route.
   */
  constructor() {
    this.entityId = this.route.parent.snapshot.params['loanId'];

    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data: { loanDocuments: any }) => {
      this.getLoanDocumentsData(data.loanDocuments);
    });
  }

  ngOnInit(): void {
    this.route.parent.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.entityId = params['loanId'];
      this.loadDocumentChecklist();
    });
  }

  linkRequirement(requirementCode: string): void {
    const documentId = this.selectedDocumentByRequirement[requirementCode];
    if (!documentId) return;
    this.pewosaLoanApplicationService.linkDocument(Number(this.entityId), requirementCode, documentId).subscribe({
      next: (checklist) => {
        this.documentChecklist = checklist;
        this.workflowMessage = 'Document linked and awaiting independent verification.';
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.workflowMessage = 'The document could not be linked to this requirement.';
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  verifyRequirement(requirementCode: string, decision: 'VERIFIED' | 'REJECTED'): void {
    const reason = this.rejectionReasonControl(requirementCode).value.trim();
    if (decision === 'REJECTED' && !reason) {
      this.workflowMessage = 'Enter a reason before rejecting the document.';
      return;
    }
    this.pewosaLoanApplicationService
      .verifyDocument(Number(this.entityId), requirementCode, decision, reason)
      .subscribe({
        next: (checklist) => {
          this.documentChecklist = checklist;
          this.workflowMessage = decision === 'VERIFIED' ? 'Document verified.' : 'Document rejected.';
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.workflowMessage = 'The verification decision could not be recorded.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  rejectionReasonControl(requirementCode: string): FormControl<string> {
    return (this.rejectionReasonByRequirement[requirementCode] ??= new FormControl('', { nonNullable: true }));
  }

  getLoanDocumentsData(data: any) {
    data.forEach((ele: any) => {
      ele.docUrl =
        this.settingsService.serverUrl +
        '/loans/' +
        ele.parentEntityId +
        '/documents/' +
        ele.id +
        '/attachment?tenantIdentifier=' +
        environment.fineractPlatformTenantId;
      if (ele.fileName) {
        if (
          ele.fileName.toLowerCase().indexOf('.jpg') !== -1 ||
          ele.fileName.toLowerCase().indexOf('.jpeg') !== -1 ||
          ele.fileName.toLowerCase().indexOf('.png') !== -1
        ) {
          ele.fileIsImage = true;
        }
      }
      if (ele.type) {
        if (ele.type.toLowerCase().indexOf('image') !== -1) {
          ele.fileIsImage = true;
        }
      }
    });
    this.entityDocuments = data;
  }

  uploadDocument(formData: FormData): any {
    return this.loansService.loadLoanDocument(this.entityId, formData);
  }

  deleteDocument(documentId: any) {
    this.loansService.deleteLoanDocument(this.entityId, documentId).subscribe((res: any) => {});
  }

  private loadDocumentChecklist(): void {
    if (!this.entityId) return;
    this.pewosaLoanApplicationService.getDocumentChecklist(Number(this.entityId)).subscribe({
      next: (checklist) => {
        this.documentChecklist = checklist;
        this.changeDetectorRef.markForCheck();
      },
      error: () => {
        this.documentChecklist = null;
        this.changeDetectorRef.markForCheck();
      }
    });
  }
}
