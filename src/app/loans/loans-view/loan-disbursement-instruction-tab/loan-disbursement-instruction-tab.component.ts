/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { environment } from 'environments/environment';
import {
  LoanDisbursementInstruction,
  LoanDisbursementInstructionRequest,
  LoanDisbursementRail
} from '../../pewosa-loan-application.models';
import { PewosaLoanApplicationService } from '../../pewosa-loan-application.service';

@Component({
  selector: 'mifosx-loan-disbursement-instruction-tab',
  standalone: true,
  imports: [...STANDALONE_SHARED_IMPORTS],
  templateUrl: './loan-disbursement-instruction-tab.component.html',
  styleUrls: ['./loan-disbursement-instruction-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanDisbursementInstructionTabComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly loanApplicationService = inject(PewosaLoanApplicationService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly authenticationService = inject(AuthenticationService, { optional: true });

  readonly loanId = Number(this.route.parent?.snapshot.params['loanId']);
  instruction: LoanDisbursementInstruction | null = null;
  loading = false;
  saving = false;
  executing = false;
  showConfirmation = false;
  error = '';

  readonly instructionForm = this.formBuilder.group({
    rail: this.formBuilder.control<LoanDisbursementRail>('ACCOUNT_CREDIT', { nonNullable: true }),
    destinationSavingsAccountId: this.formBuilder.control<number | null>(null),
    destinationPhone: ['', Validators.pattern(/^\+?[0-9]{9,15}$/)],
    paymentTypeId: this.formBuilder.control<number | null>(null),
    chequeNumber: [
      '',
      Validators.maxLength(100)
    ]
  });

  get hasExecutePermission(): boolean {
    if (!environment.productionModeEnableRBAC) {
      return true;
    }
    const permissions = this.authenticationService?.getCredentials()?.permissions ?? [];
    return permissions.includes('ALL_FUNCTIONS') || permissions.includes('EXECUTE_PEWOSALOANDISBURSEMENT');
  }

  ngOnInit(): void {
    this.load();
  }

  create(): void {
    if (this.saving) {
      return;
    }
    const request = this.buildRequest();
    if (!request) {
      this.instructionForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    this.loanApplicationService
      .createDisbursementInstruction(this.loanId, request)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (instruction) => this.updateInstruction(instruction),
        error: () => {
          this.error = 'The instruction was rejected. Confirm approval, documents, charges, amount, and rail details.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  promptConfirmation(): void {
    if (!this.hasExecutePermission || !this.instruction || this.instruction.status !== 'READY') {
      return;
    }
    this.showConfirmation = true;
  }

  cancelConfirmation(): void {
    this.showConfirmation = false;
  }

  execute(): void {
    if (!this.hasExecutePermission || this.executing || !this.instruction || this.instruction.status !== 'READY') {
      return;
    }
    this.executing = true;
    this.error = '';
    this.loanApplicationService
      .executeDisbursementInstruction(this.loanId, this.instruction.id, {})
      .pipe(
        finalize(() => {
          this.executing = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (updatedInstruction) => {
          this.showConfirmation = false;
          this.updateInstruction(updatedInstruction);
        },
        error: (err: any) => {
          this.showConfirmation = false;
          const backendMessage = err?.error?.defaultUserMessage || err?.error?.message;
          this.error =
            backendMessage || 'The disbursement execution was rejected. Confirm instruction and loan status.';
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private buildRequest(): LoanDisbursementInstructionRequest | null {
    const values = this.instructionForm.getRawValue();
    let railDetails: Record<string, number | string> = {};
    if (values.rail === 'ACCOUNT_CREDIT') {
      if (!values.destinationSavingsAccountId) {
        this.instructionForm.controls.destinationSavingsAccountId.setErrors({ required: true });
        return null;
      }
      railDetails = { destinationSavingsAccountId: values.destinationSavingsAccountId };
    }
    if (values.rail === 'CHEQUE') {
      const chequeNumber = values.chequeNumber?.trim();
      if (!chequeNumber) {
        this.instructionForm.controls.chequeNumber.setErrors({ required: true });
        return null;
      }
      railDetails = { chequeNumber };
    }
    if (values.rail === 'MOBILE_MONEY') {
      const destinationPhone = values.destinationPhone?.trim();
      if (
        !destinationPhone ||
        this.instructionForm.controls.destinationPhone.invalid ||
        !values.paymentTypeId
      ) {
        if (!destinationPhone) this.instructionForm.controls.destinationPhone.setErrors({ required: true });
        if (!values.paymentTypeId) this.instructionForm.controls.paymentTypeId.setErrors({ required: true });
        return null;
      }
      railDetails = { destinationPhone, paymentTypeId: values.paymentTypeId };
    }
    return { idempotencyKey: crypto.randomUUID(), rail: values.rail, railDetails };
  }

  private load(): void {
    this.loading = true;
    this.loanApplicationService
      .getDisbursementInstruction(this.loanId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (instruction) => this.updateInstruction(instruction),
        error: () => {
          this.instruction = null;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  private updateInstruction(instruction: LoanDisbursementInstruction): void {
    this.instruction = instruction;
    this.changeDetectorRef.markForCheck();
  }
}
