/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, Validators, FormControl, ValidationErrors } from '@angular/forms';
import { filter, switchMap } from 'rxjs/operators';
import { ClientsService } from 'app/clients/clients.service';
import { Dates } from 'app/core/utils/dates';
import { LegalFormId } from 'app/clients/models/legal-form.enum';
import { ExternalNationalIdService } from 'app/clients/services/external-national-id.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';

/** Custom Services */
import { SettingsService } from 'app/settings/settings.service';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatStepperPrevious, MatStepperNext } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Create Client Component
 */
@Component({
  selector: 'mifosx-client-general-step',
  templateUrl: './client-general-step.component.html',
  styleUrls: ['./client-general-step.component.scss'],
  providers: [ExternalNationalIdService],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDivider,
    MatIcon,
    CdkTextareaAutosize,
    MatCheckbox,
    MatStepperPrevious,
    FaIconComponent,
    MatStepperNext
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientGeneralStepComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private dateUtils = inject(Dates);
  private settingsService = inject(SettingsService);
  private clientService = inject(ClientsService);
  private authenticationService = inject(AuthenticationService);
  externalNationalIdService = inject(ExternalNationalIdService);
  private destroyRef = inject(DestroyRef);

  @Output() legalFormChangeEvent = new EventEmitter<{ legalForm: number }>();

  /** Expose enum to template */
  readonly LegalFormId = LegalFormId;

  /** Minimum date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum date allowed. */
  maxDate = new Date();

  /** Client Template */
  @Input() clientTemplate: any;
  /** Uses the compact member-registration form in the cashier workspace. */
  @Input() cashierMode = false;
  /** Create Client Form */
  createClientForm: FormGroup;
  /** Optional member photo selected during cashier onboarding. */
  profileImageFile: File | null = null;
  /** Local preview URL for the selected member photo. */
  profileImagePreviewUrl: string | null = null;

  /** Office Options */
  officeOptions: any;
  /** Staff Options */
  staffOptions: any;
  /** Legal Form Options */
  legalFormOptions: any;
  /** Client Type Options */
  clientTypeOptions: any;
  /** Client Classification Options */
  clientClassificationTypeOptions: any;
  /** Business Line Options */
  businessLineOptions: any;
  /** Constitution Options */
  constitutionOptions: any;
  /** Gender Options */
  genderOptions: any;
  /** Saving Product Options */
  savingProductOptions: any;
  /** Common East African calling codes, with Uganda selected by default. */
  readonly mobileCountryCodes = [
    '+256',
    '+254',
    '+255',
    '+250',
    '+211',
    '+243'
  ];

  /**
   * @param {FormBuilder} formBuilder Form Builder
   * @param {Dates} dateUtils Date Utils
   * @param {SettingsService} settingsService Setting service
   * @param {ClientsService} clientService Client service
   */
  constructor() {
    this.setClientForm();
    this.buildDependencies();
  }

  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.setOptions();
    console.info('[MemberOnboarding] template options loaded', {
      offices: this.officeOptions?.length ?? 0,
      genders: this.genderOptions?.length ?? 0,
      memberCategories: this.clientTypeOptions?.length ?? 0,
      savingsProducts: this.savingProductOptions?.length ?? 0
    });
    if (this.cashierMode) {
      this.configureCashierForm();
    }
    console.info('[MemberOnboarding] form ready', {
      cashierMode: this.cashierMode,
      controls: Object.keys(this.createClientForm.controls),
      valid: this.createClientForm.valid
    });
    this.externalNationalIdService.watchExternalId(this.createClientForm, this.genderOptions);
  }

  private configureCashierForm(): void {
    const credentials = this.authenticationService.getCredentials();
    this.createClientForm.controls.externalId.setValidators(Validators.required);
    this.createClientForm.controls.dateOfBirth.setValidators(Validators.required);
    this.createClientForm.controls.clientTypeId.setValidators(Validators.required);
    this.createClientForm.patchValue({
      officeId: credentials?.officeId || this.officeOptions?.[0]?.id || '',
      legalFormId: LegalFormId.PERSON,
      active: true,
      addSavings: true,
      memberAccountType: 'SAVINGS'
    });
    if (!this.createClientForm.contains('activationDate')) {
      this.createClientForm.addControl(
        'activationDate',
        new FormControl(this.settingsService.businessDate, Validators.required)
      );
    }
    if (!this.createClientForm.contains('savingsProductId')) {
      this.createClientForm.addControl('savingsProductId', new FormControl('', Validators.required));
    }
    const voluntarySavingsProduct = this.savingProductOptions?.find(
      (product: any) => /voluntary/i.test(product.name ?? '') && !/group/i.test(product.name ?? '')
    );
    this.createClientForm.get('savingsProductId')?.setValue(voluntarySavingsProduct?.id ?? '');
    this.createClientForm.get('activationDate')?.setValue(this.settingsService.businessDate);
    this.createClientForm.controls.externalId.updateValueAndValidity();
    this.createClientForm.controls.dateOfBirth.updateValueAndValidity();
    this.createClientForm.controls.clientTypeId.updateValueAndValidity();
    console.info('[MemberOnboarding] cashier form configured', {
      controls: Object.keys(this.createClientForm.controls),
      voluntarySavingsProductId: voluntarySavingsProduct?.id ?? null,
      requiredControls: Object.keys(this.createClientForm.controls).filter((controlName) =>
        this.createClientForm.controls[controlName].hasValidator(Validators.required)
      )
    });
  }

  /**
   * Creates the client form.
   */
  setClientForm() {
    this.createClientForm = this.formBuilder.group({
      officeId: [
        '',
        Validators.required
      ],
      staffId: [''],
      legalFormId: [
        '',
        Validators.required
      ],
      isStaff: [false],
      active: [false],
      addSavings: [false],
      accountNo: [''],
      externalId: [''],
      genderId: [''],
      mobileCountryCode: [
        '+256',
        Validators.required
      ],
      mobileNo: [
        '',
        [
          Validators.required,
          (control: AbstractControl) => this.validateMobileNumber(control)
        ]
      ],
      emailAddress: [
        '',
        Validators.email
      ],
      dateOfBirth: [''],
      clientTypeId: [''],
      clientClassificationId: [''],
      memberAccountType: ['SAVINGS'],
      submittedOnDate: [
        this.settingsService.businessDate,
        Validators.required
      ]
    });
  }

  /**
   * Sets select dropdown options.
   */
  setOptions() {
    this.officeOptions = this.clientTemplate.officeOptions;
    this.staffOptions = this.clientTemplate.staffOptions;
    this.legalFormOptions = this.clientTemplate.clientLegalFormOptions;
    this.clientTypeOptions = this.clientTemplate.clientTypeOptions;
    this.clientClassificationTypeOptions = this.clientTemplate.clientClassificationOptions;
    this.businessLineOptions = this.clientTemplate.clientNonPersonMainBusinessLineOptions;
    this.constitutionOptions = this.clientTemplate.clientNonPersonConstitutionOptions;
    this.genderOptions = this.clientTemplate.genderOptions;
    this.savingProductOptions = this.clientTemplate.savingProductOptions;
  }

  onProfileImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (this.profileImagePreviewUrl) {
      URL.revokeObjectURL(this.profileImagePreviewUrl);
      this.profileImagePreviewUrl = null;
    }
    this.profileImageFile = file && file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 ? file : null;
    if (!this.profileImageFile) {
      input.value = '';
      return;
    }
    this.profileImagePreviewUrl = URL.createObjectURL(this.profileImageFile);
  }

  /**
   * Adds controls conditionally.
   */
  buildDependencies() {
    this.createClientForm
      .get('legalFormId')
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((legalFormId: number) => {
        this.legalFormChangeEvent.emit({ legalForm: legalFormId });
        if (legalFormId === LegalFormId.PERSON) {
          this.createClientForm.get('genderId')?.setValidators(Validators.required);
          this.createClientForm.removeControl('fullname');
          this.createClientForm.removeControl('clientNonPersonDetails');
          this.createClientForm.addControl(
            'firstname',
            new FormControl('', [
              Validators.required,
              Validators.pattern('(^[A-z]).*')
            ])
          );
          this.createClientForm.addControl('middlename', new FormControl('', Validators.pattern('(^[A-z]).*')));
          this.createClientForm.addControl(
            'lastname',
            new FormControl('', [
              Validators.required,
              Validators.pattern('(^[A-z]).*')
            ])
          );
        } else {
          this.createClientForm.get('genderId')?.clearValidators();
          this.createClientForm.get('genderId')?.reset('');
          this.createClientForm.removeControl('firstname');
          this.createClientForm.removeControl('middlename');
          this.createClientForm.removeControl('lastname');
          this.createClientForm.addControl(
            'fullname',
            new FormControl('', [
              Validators.required,
              Validators.pattern('(^[A-z]).*')
            ])
          );
          this.createClientForm.addControl(
            'clientNonPersonDetails',
            this.formBuilder.group({
              constitutionId: [
                '',
                Validators.required
              ],
              incorpValidityTillDate: [''],
              incorpNumber: [''],
              mainBusinessLineId: [''],
              remarks: ['']
            })
          );
        }
        this.createClientForm.get('genderId')?.updateValueAndValidity();
      });
    this.createClientForm.get('legalFormId').patchValue(LegalFormId.PERSON);
    this.createClientForm
      .get('active')
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((active: boolean) => {
        if (active) {
          this.createClientForm.addControl('activationDate', new FormControl('', Validators.required));
        } else {
          this.createClientForm.removeControl('activationDate');
        }
      });
    this.createClientForm
      .get('addSavings')
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((active: boolean) => {
        if (active) {
          this.createClientForm.addControl('savingsProductId', new FormControl('', Validators.required));
        } else {
          this.createClientForm.removeControl('savingsProductId');
        }
      });
    this.createClientForm
      .get('officeId')
      .valueChanges.pipe(
        filter((officeId: number) => !!officeId),
        switchMap((officeId: number) => this.clientService.getClientWithOfficeTemplate(officeId)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((clientTemplate: any) => {
        this.staffOptions = clientTemplate.staffOptions;
      });
  }

  getDateLabel(legalFormId: number, values: string[]): string {
    return legalFormId === LegalFormId.PERSON ? values[0] : values[1];
  }

  validateMobileNumber(control: AbstractControl): ValidationErrors | null {
    const countryCode = this.createClientForm?.get('mobileCountryCode')?.value || '+256';
    const enteredDigits = String(control.value || '').replace(/\D/g, '');
    const localDigits = this.localMobileDigits(control.value, countryCode);
    if (!enteredDigits) {
      return null;
    }
    if (!localDigits) return { invalidMobileNumber: true };
    if (/^(\d)\1+$/.test(localDigits)) {
      return { invalidMobileNumber: true };
    }
    return this.countryCodeDigits(countryCode) === '256'
      ? /^[37]\d{8}$/.test(localDigits)
        ? null
        : { invalidMobileNumber: true }
      : /^\d{6,12}$/.test(localDigits)
        ? null
        : { invalidMobileNumber: true };
  }

  /**
   * Client General Details
   */
  get clientGeneralDetails() {
    const generalDetails = this.createClientForm.getRawValue();
    const countryCode = generalDetails.mobileCountryCode;
    if (generalDetails.mobileNo) {
      generalDetails.mobileNo =
        this.countryCodeDigits(countryCode) + this.localMobileDigits(generalDetails.mobileNo, countryCode);
    }
    delete generalDetails.mobileCountryCode;
    delete generalDetails.memberAccountType;
    const dateFormat = this.settingsService.dateFormat;
    const locale = this.settingsService.language.code;
    for (const key in generalDetails) {
      if (generalDetails[key] === '' || key === 'addSavings') {
        delete generalDetails[key];
      }
    }
    if (generalDetails.submittedOnDate instanceof Date) {
      generalDetails.submittedOnDate = this.dateUtils.formatDate(generalDetails.submittedOnDate, dateFormat);
    }
    if (generalDetails.activationDate instanceof Date) {
      generalDetails.activationDate = this.dateUtils.formatDate(generalDetails.activationDate, dateFormat);
    }
    if (generalDetails.dateOfBirth instanceof Date) {
      generalDetails.dateOfBirth = this.dateUtils.formatDate(generalDetails.dateOfBirth, dateFormat);
    }

    if (generalDetails.clientNonPersonDetails && generalDetails.clientNonPersonDetails.incorpValidityTillDate) {
      generalDetails.clientNonPersonDetails = {
        ...generalDetails.clientNonPersonDetails,
        incorpValidityTillDate: this.dateUtils.formatDate(
          generalDetails.clientNonPersonDetails.incorpValidityTillDate,
          dateFormat
        ),
        dateFormat,
        locale
      };
    }
    return generalDetails;
  }

  private countryCodeDigits(countryCode: unknown): string {
    return String(countryCode || '').replace(/\D/g, '');
  }

  private localMobileDigits(mobileNo: unknown, countryCode: unknown): string {
    const countryDigits = this.countryCodeDigits(countryCode);
    const enteredDigits = String(mobileNo || '').replace(/\D/g, '');
    if (countryDigits && enteredDigits.startsWith(countryDigits)) {
      return enteredDigits.slice(countryDigits.length).replace(/^0/, '');
    }
    return enteredDigits.replace(/^0/, '');
  }
}
