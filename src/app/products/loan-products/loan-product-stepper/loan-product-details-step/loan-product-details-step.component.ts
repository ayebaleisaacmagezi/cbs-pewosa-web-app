/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, OnInit, Input, inject } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators, UntypedFormControl } from '@angular/forms';

/** Custom Services */
import { MatTooltip } from '@angular/material/tooltip';
import { MatCheckbox } from '@angular/material/checkbox';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatStepperPrevious, MatStepperNext } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { LoanProductBaseComponent } from '../../common/loan-product-base.component';

@Component({
  selector: 'mifosx-loan-product-details-step',
  templateUrl: './loan-product-details-step.component.html',
  styleUrls: ['./loan-product-details-step.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatTooltip,
    MatCheckbox,
    CdkTextareaAutosize,
    MatStepperPrevious,
    FaIconComponent,
    MatStepperNext
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanProductDetailsStepComponent extends LoanProductBaseComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);

  @Input() loanProductsTemplate: any;

  loanProductDetailsForm: UntypedFormGroup;

  fundData: any;


  constructor() {
    super();
    this.createLoanProductDetailsForm();
  }

  ngOnInit() {
    this.fundData = this.loanProductsTemplate.fundOptions;

    this.loanProductDetailsForm.patchValue({
      name: this.loanProductsTemplate.name,
      shortName: this.loanProductsTemplate.shortName || this.loanProductDetailsForm.controls.shortName.value,
      description: this.loanProductsTemplate.description,
      fundId: this.loanProductsTemplate.fundId,
      includeInBorrowerCycle: this.loanProductsTemplate.includeInBorrowerCycle
    });
  }

  createLoanProductDetailsForm() {
    this.loanProductDetailsForm = this.formBuilder.group({
      name: [
        '',
        [
          Validators.required,
          Validators.maxLength(100)
        ]
      ],
      shortName: [
        this.generateProductCode(),
        [
          Validators.required,
          Validators.maxLength(4)
        ]
      ],
      description: [
        '',
        Validators.maxLength(500)
      ],
      fundId: ['']
    });

    if (this.loanProductService.isLoanProduct) {
      this.loanProductDetailsForm.addControl('includeInBorrowerCycle', new UntypedFormControl(false));
    }
  }

  private generateProductCode(): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const values = crypto.getRandomValues(new Uint32Array(4));
    return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
  }

  get loanProductDetails() {
    return this.loanProductDetailsForm.value;
  }
}
