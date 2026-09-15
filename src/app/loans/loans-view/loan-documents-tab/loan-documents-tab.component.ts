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
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';

/** Custom Services */
import { environment } from '../../../../environments/environment';
import { LoansService } from 'app/loans/loans.service';
import { SettingsService } from 'app/settings/settings.service';
import { EntityDocumentsTabComponent } from '../../../shared/tabs/entity-documents-tab/entity-documents-tab.component';
import { FileUploadComponent } from '../../../shared/file-upload/file-upload.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { LoanDocumentChecklist, LoanDocumentRequirement } from '../../pewosa-loan-application.models';
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
    FileUploadComponent,
    EntityDocumentsTabComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanDocumentsTabComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
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
  rejectionReasonByRequirement: Record<string, FormControl<string>> = {};
  workflowMessageKey = '';
  uploadingRequirementCode: string | null = null;
  isLoanOfficerFlow = false;
  activeRequirementIndex = 0;

  private readonly requirementLabelKeys: Record<string, string> = {
    NATIONAL_ID: 'National ID copy',
    LC_LETTER: 'LC letter',
    INCOME_PROOF: 'Payslip or income proof',
    FIELD_PHOTO: 'Field photos',
    COLLATERAL_DOCUMENT: 'Collateral documents',
    GUARANTOR_DOCUMENT: 'Guarantor documents'
  };

  /**
   * Retrieves the loans data from `resolve`.
   * @param {ActivatedRoute} route Activated Route.
   */
  constructor() {
    this.entityId = this.route.parent.snapshot.params['loanId'];
    this.isLoanOfficerFlow = this.route.snapshot.queryParamMap.get('workspace') === 'loan-officer';

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

  uploadRequirementDocument(requirement: LoanDocumentRequirement, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || this.uploadingRequirementCode) return;

    const formData = new FormData();
    formData.append('name', file.name);
    formData.append('file', file);
    formData.append('description', this.requirementLabelKey(requirement.requirementCode));

    this.workflowMessageKey = '';
    this.uploadingRequirementCode = requirement.requirementCode;
    this.loansService
      .loadLoanDocument(this.entityId, formData)
      .pipe(
        switchMap((response: any) =>
          this.pewosaLoanApplicationService.linkDocument(
            Number(this.entityId),
            requirement.requirementCode,
            response.resourceId
          )
        ),
        finalize(() => {
          this.uploadingRequirementCode = null;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (checklist) => {
          this.documentChecklist = checklist;
          this.loadLoanDocuments();
          this.workflowMessageKey = 'Document uploaded successfully';
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.workflowMessageKey = 'Document upload failed';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  verifyRequirement(requirementCode: string, decision: 'VERIFIED' | 'REJECTED'): void {
    const reason = this.rejectionReasonControl(requirementCode).value.trim();
    if (decision === 'REJECTED' && !reason) {
      this.workflowMessageKey = 'Enter a reason before rejecting the document';
      return;
    }
    this.pewosaLoanApplicationService
      .verifyDocument(Number(this.entityId), requirementCode, decision, reason)
      .subscribe({
        next: (checklist) => {
          this.documentChecklist = checklist;
          this.workflowMessageKey = decision === 'VERIFIED' ? 'Document verified' : 'Document rejected';
          this.changeDetectorRef.markForCheck();
        },
        error: () => {
          this.workflowMessageKey = 'Something went wrong. Please try again';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  rejectionReasonControl(requirementCode: string): FormControl<string> {
    return (this.rejectionReasonByRequirement[requirementCode] ??= new FormControl('', { nonNullable: true }));
  }

  requirementLabelKey(requirementCode: string): string {
    return this.requirementLabelKeys[requirementCode] ?? requirementCode;
  }

  get activeRequirement(): LoanDocumentRequirement | null {
    return this.documentChecklist?.requirements[this.activeRequirementIndex] ?? null;
  }

  get isLastRequirement(): boolean {
    return this.activeRequirementIndex === (this.documentChecklist?.requirements.length ?? 0) - 1;
  }

  get canContinueFromActiveRequirement(): boolean {
    const requirement = this.activeRequirement;
    return Boolean(
      requirement &&
      (!requirement.required || requirement.status === 'UPLOADED' || requirement.status === 'VERIFIED') &&
      !this.uploadingRequirementCode
    );
  }

  requirementStatusKey(status: LoanDocumentRequirement['status']): string {
    const statusKeys: Record<LoanDocumentRequirement['status'], string> = {
      MISSING: 'Not uploaded',
      UPLOADED: 'Awaiting verification',
      VERIFIED: 'Verified',
      REJECTED: 'Rejected'
    };
    return statusKeys[status];
  }

  acceptedFileTypes(requirement: LoanDocumentRequirement): string {
    try {
      const acceptedTypes = JSON.parse(requirement.acceptedContentTypes);
      if (Array.isArray(acceptedTypes)) return acceptedTypes.join(',');
    } catch {
      // The backend may already return a comma-separated accept value.
    }
    return requirement.acceptedContentTypes || '.pdf,.png,.jpeg,.jpg';
  }

  get requiredDocumentsComplete(): boolean {
    return Boolean(
      this.documentChecklist?.requirements
        .filter((requirement) => requirement.required)
        .every((requirement) => requirement.status === 'UPLOADED' || requirement.status === 'VERIFIED')
    );
  }

  continueToGuarantors(): void {
    if (!this.requiredDocumentsComplete) return;
    this.router.navigate(
      [
        '../actions',
        'Create Guarantor'
      ],
      {
        relativeTo: this.route,
        queryParamsHandling: 'merge'
      }
    );
  }

  previousRequirement(): void {
    if (this.activeRequirementIndex > 0) {
      this.activeRequirementIndex -= 1;
      this.workflowMessageKey = '';
    }
  }

  nextRequirement(): void {
    if (!this.canContinueFromActiveRequirement) return;
    if (this.isLastRequirement) {
      this.continueToGuarantors();
      return;
    }
    this.activeRequirementIndex += 1;
    this.workflowMessageKey = '';
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

  private loadLoanDocuments(): void {
    this.loansService.getLoanDocuments(this.entityId).subscribe({
      next: (documents) => {
        this.getLoanDocumentsData(documents);
        this.changeDetectorRef.markForCheck();
      },
      error: () => undefined
    });
  }
}
