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
  ChangeDetectorRef,
  Component,
  DestroyRef,
  QueryList,
  ViewChild,
  ViewChildren,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TimeoutError, catchError, finalize, forkJoin, map, of, switchMap, timeout } from 'rxjs';

/** Custom Services */
import { ClientsService } from '../clients.service';

/** Custom Components */
import { ClientGeneralStepComponent } from '../client-stepper/client-general-step/client-general-step.component';
import { ClientFamilyMembersStepComponent } from '../client-stepper/client-family-members-step/client-family-members-step.component';
import { ClientAddressStepComponent } from '../client-stepper/client-address-step/client-address-step.component';
import { ClientDatatableStepComponent } from '../client-stepper/client-datatable-step/client-datatable-step.component';

/** Custom Services */
import { SettingsService } from 'app/settings/settings.service';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { ConfirmationDialogComponent } from 'app/shared/confirmation-dialog/confirmation-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import { MatStepper, MatStepperIcon, MatStep, MatStepLabel } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ClientPreviewStepComponent } from '../client-stepper/client-preview-step/client-preview-step.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/**
 * Create Client Component.
 */
@Component({
  selector: 'mifosx-create-client',
  templateUrl: './create-client.component.html',
  styleUrls: ['./create-client.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatStepper,
    MatStepperIcon,
    MatIconButton,
    MatIcon,
    FaIconComponent,
    MatStep,
    MatStepLabel,
    ClientGeneralStepComponent,
    ClientFamilyMembersStepComponent,
    ClientAddressStepComponent,
    ClientDatatableStepComponent,
    ClientPreviewStepComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateClientComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientsService = inject(ClientsService);
  private settingsService = inject(SettingsService);
  private authenticationService = inject(AuthenticationService);
  private dialog = inject(MatDialog);
  private translateService = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private changeDetectorRef = inject(ChangeDetectorRef);

  /** Client General Step */
  @ViewChild(ClientGeneralStepComponent) clientGeneralStep: ClientGeneralStepComponent;
  /** Client Family Members Step */
  @ViewChild('clientFamily') clientFamilyMembersStep: ClientFamilyMembersStepComponent;
  /** Client Address Step */
  @ViewChild('clientAddress') clientAddressStep: ClientAddressStepComponent;
  /** Get handle on dtclient tags in the template */
  @ViewChildren('dtclient') clientDatatables: QueryList<ClientDatatableStepComponent>;

  datatables: any = [];
  legalFormType = 1;
  readonly isCashierWorkspace = this.route.snapshot.queryParamMap.get('workspace') === 'cashier';
  checkingForDuplicate = false;
  creatingClient = false;
  onboardingMessage = '';
  private readonly requestTimeoutMs = 30000;
  private readonly requiredMemberChargeNames = [
    'CBS PEWOSA Membership Fee',
    'CBS PEWOSA Annual Subscription'
  ];

  /** Client Template */
  clientTemplate: any;
  /** Client Address Field Config */
  clientAddressFieldConfig: any;

  /**
   * Fetches client and address template from `resolve`
   * @param {ActivatedRoute} route Activated Route
   * @param {Router} router Router
   * @param {ClientsService} clientsService Clients Service
   * @param {SettingsService} settingsService Setting service
   */
  constructor() {
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: { clientTemplate: any; clientAddressFieldConfig: any }) => {
        this.clientTemplate = data.clientTemplate;
        this.clientAddressFieldConfig = data.clientAddressFieldConfig;
        this.setDatatables();
        console.info('[MemberOnboarding] client template resolved', {
          addressEnabled: !!this.clientTemplate?.isAddressEnabled,
          datatables: this.clientTemplate?.datatables?.length ?? 0
        });
      });
  }

  /**
   * Retrieves general information about client.
   */
  get clientGeneralForm() {
    return this.clientGeneralStep?.createClientForm;
  }

  /**
   * Retrieves the client object
   */
  get client() {
    if (this.isCashierWorkspace) {
      return this.clientTemplate.isAddressEnabled
        ? { ...this.clientGeneralStep.clientGeneralDetails, ...this.clientAddressStep.address }
        : this.clientGeneralStep.clientGeneralDetails;
    }
    if (this.clientTemplate.isAddressEnabled) {
      return {
        ...this.clientGeneralStep.clientGeneralDetails,
        ...this.clientFamilyMembersStep.familyMembers,
        ...this.clientAddressStep.address
      };
    } else {
      return {
        ...this.clientGeneralStep.clientGeneralDetails,
        ...this.clientFamilyMembersStep.familyMembers
      };
    }
  }

  areFormvalids(): boolean {
    if (!this.clientGeneralForm || !this.clientTemplate) {
      return false;
    }

    let areValids = this.clientGeneralForm.valid;
    if (this.clientTemplate.isAddressEnabled) {
      areValids = areValids && !!this.clientAddressStep && this.clientAddressStep.address.address.length > 0;
    }
    if (this.clientTemplate.datatables && this.clientTemplate.datatables.length > 0 && this.clientDatatables) {
      this.clientDatatables.forEach((clientDatatable: ClientDatatableStepComponent) => {
        areValids = areValids && clientDatatable.datatableForm.valid;
      });
    }

    return areValids;
  }

  setDatatables(): void {
    this.datatables = [];
    let legalFormTypeVal = 'person';
    if (this.legalFormType === 2) {
      legalFormTypeVal = 'entity';
    }
    if (this.clientTemplate.datatables) {
      this.clientTemplate.datatables.forEach((datatable: any) => {
        if (datatable.entitySubType.toLowerCase() === legalFormTypeVal) {
          this.datatables.push(datatable);
        }
      });
    }
  }

  legalFormChange(eventData: { legalForm: number }) {
    this.legalFormType = eventData.legalForm;
    this.setDatatables();
  }

  /**
   * Submits the create client form.
   */
  submit() {
    if (this.isCashierWorkspace) {
      this.checkForExistingMember();
      return;
    }
    this.createClient();
  }

  private checkForExistingMember(): void {
    if (!this.areFormvalids() || this.checkingForDuplicate || this.creatingClient) return;
    this.onboardingMessage = '';
    const details = this.clientGeneralStep.clientGeneralDetails;
    const officeId = Number(details.officeId || this.authenticationService.getCredentials()?.officeId);
    const searches = [
      details.externalId,
      details.mobileNo
    ]
      .filter(Boolean)
      .map((value: string) => this.clientsService.searchClientsInOffice(String(value), officeId, true));

    if (!searches.length) {
      this.createClient();
      return;
    }

    this.checkingForDuplicate = true;
    forkJoin(searches)
      .pipe(
        timeout(this.requestTimeoutMs),
        finalize(() => {
          this.checkingForDuplicate = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: (results: any[][]) => {
          const existingMember = results.flat().find((client: any) => this.isExactIdentityMatch(client, details));
          if (!existingMember) {
            this.createClient();
            return;
          }
          const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
              heading: this.translateService.instant('Member already exists'),
              dialogContext: `${existingMember.displayName} · ${existingMember.accountNo || existingMember.accountNumber}`,
              submitLabel: this.translateService.instant('Open member profile'),
              type: 'Basic'
            }
          });
          dialogRef.afterClosed().subscribe((response: { confirm?: boolean }) => {
            if (response?.confirm)
              this.router.navigate([
                '/clients',
                existingMember.id,
                'general'
              ]);
          });
        },
        error: (error: unknown) => {
          this.onboardingMessage = this.memberOnboardingErrorMessage(error, 'Member records could not be checked.');
        }
      });
  }

  private isExactIdentityMatch(client: any, details: any): boolean {
    const normalize = (value: unknown) =>
      String(value || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();
    return (
      (!!details.externalId && normalize(client.externalId) === normalize(details.externalId)) ||
      (!!details.mobileNo && normalize(client.mobileNo) === normalize(details.mobileNo))
    );
  }

  private createClient(): void {
    const locale = this.settingsService.language.code;
    const dateFormat = this.settingsService.dateFormat;
    const clientData = {
      ...this.client,
      dateFormat,
      locale
    };

    if (this.clientTemplate.datatables && this.clientTemplate.datatables.length > 0) {
      const datatables: any[] = [];
      this.clientDatatables.forEach((clientDatatable: ClientDatatableStepComponent) => {
        datatables.push(clientDatatable.payload);
      });
      if (datatables.length > 0) {
        clientData['datatables'] = datatables;
      }
    }

    this.creatingClient = true;
    this.onboardingMessage = '';
    this.clientsService
      .createClient(clientData, this.isCashierWorkspace)
      .pipe(
        timeout(this.requestTimeoutMs),
        switchMap((response: any) => {
          if (!this.isCashierWorkspace) {
            return of({ response, chargeStatus: 'not-required' as const });
          }
          return this.assignRequiredMemberCharges(String(response.resourceId), clientData.activationDate).pipe(
            timeout(this.requestTimeoutMs),
            map(() => ({ response, chargeStatus: 'assigned' as const })),
            catchError((error) => {
              console.error('[MemberOnboarding] required fee assignment failed', error);
              return of({ response, chargeStatus: 'failed' as const });
            })
          );
        }),
        switchMap(({ response, chargeStatus }) => {
          const profileImage = this.isCashierWorkspace ? this.clientGeneralStep.profileImageFile : null;
          if (!profileImage) return of({ response, photoStatus: 'not-selected' as const, chargeStatus });
          return this.clientsService.uploadClientProfileImage(String(response.resourceId), profileImage, true).pipe(
            timeout(this.requestTimeoutMs),
            map(() => ({ response, photoStatus: 'uploaded' as const, chargeStatus })),
            catchError((error) => {
              console.error('[MemberOnboarding] profile photo upload failed', error);
              return of({ response, photoStatus: 'failed' as const, chargeStatus });
            })
          );
        }),
        finalize(() => {
          this.creatingClient = false;
          this.changeDetectorRef.markForCheck();
        })
      )
      .subscribe({
        next: ({ response, photoStatus, chargeStatus }) => {
          if (photoStatus === 'failed') {
            console.warn('[MemberOnboarding] member created without profile photo');
          }
          this.navigateAfterCreate(response.resourceId, photoStatus, chargeStatus);
        },
        error: (error: unknown) => {
          this.onboardingMessage = this.memberOnboardingErrorMessage(error, 'The member could not be created.');
        }
      });
  }

  private assignRequiredMemberCharges(clientId: string, registrationDate: string) {
    if (!registrationDate) {
      throw new Error('The member registration date is required to assign onboarding fees.');
    }
    return forkJoin({
      template: this.clientsService.getClientChargeTemplate(clientId),
      assignedCharges: this.clientsService.getAllClientCharges(clientId)
    }).pipe(
      switchMap(({ template, assignedCharges }: any) => {
        const chargeOptions = template?.chargeOptions ?? [];
        const assigned = assignedCharges?.pageItems ?? assignedCharges ?? [];
        const resolvedCharges = this.requiredMemberChargeNames.map((name) => ({
          name,
          charge: chargeOptions.find((option: any) => option.name === name)
        }));
        const missingDefinitions = resolvedCharges.filter(({ charge }) => !charge).map(({ name }) => name);
        if (missingDefinitions.length) {
          throw new Error(`Required onboarding fees are not configured: ${missingDefinitions.join(', ')}`);
        }
        const assignments = resolvedCharges
          .map(({ charge }) => charge)
          .filter((charge: any) => {
            return !assigned.some(
              (assignedCharge: any) =>
                Number(assignedCharge.chargeId) === Number(charge.id) || assignedCharge.name === charge.name
            );
          });
        const requests = assignments.map((charge: any) =>
          this.clientsService.createClientCharge(clientId, {
            chargeId: charge.id,
            amount: charge.amount,
            dueDate: registrationDate,
            dateFormat: this.settingsService.dateFormat,
            locale: this.settingsService.language.code
          })
        );
        return requests.length ? forkJoin(requests) : of([]);
      })
    );
  }

  private navigateAfterCreate(
    resourceId: number,
    photoStatus: 'not-selected' | 'uploaded' | 'failed',
    chargeStatus: 'not-required' | 'assigned' | 'failed'
  ): void {
    const onboardingReference = this.route.snapshot.queryParamMap.get('onboardingReference');
    if (onboardingReference) {
      this.router.navigate(
        [
          '/staff-workspaces/cashier/onboarding',
          onboardingReference
        ],
        {
          queryParams: { clientId: resourceId }
        }
      );
      return;
    }
    if (this.isCashierWorkspace) {
      const memberCreatedMessage = this.translateService.instant('Member {{memberId}} was created successfully.', {
        memberId: resourceId
      });
      const cashierMessage =
        chargeStatus === 'failed'
          ? `${memberCreatedMessage} ${this.translateService.instant('The member account was saved, but the required fees could not be attached. Contact an administrator; do not create the member again.')}`
          : photoStatus === 'uploaded'
            ? `${memberCreatedMessage} ${this.translateService.instant('The savings account and profile photo were saved.')}`
            : photoStatus === 'failed'
              ? `${memberCreatedMessage} ${this.translateService.instant('The savings account was saved, but the profile photo was not. Add the photo from the member profile; do not create the member again.')}`
              : `${memberCreatedMessage} ${this.translateService.instant('The savings account was saved.')}`;
      this.router.navigate(['/staff-workspaces/cashier'], {
        queryParams: { view: 'home' },
        state: {
          cashierMessage,
          cashierMessageType: photoStatus === 'failed' || chargeStatus === 'failed' ? 'warning' : 'success'
        }
      });
      return;
    }
    this.router.navigate(
      [
        '../',
        resourceId
      ],
      { relativeTo: this.route }
    );
  }

  private memberOnboardingErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof TimeoutError) {
      return 'The request is taking too long. Check your connection and try again.';
    }
    const response = error as {
      status?: number;
      error?: {
        defaultUserMessage?: string;
        developerMessage?: string;
        errors?: Array<{ defaultUserMessage?: string }>;
      };
    };
    const status = Number(response?.status ?? 0);
    const backendMessage =
      response?.error?.errors?.[0]?.defaultUserMessage ||
      response?.error?.defaultUserMessage ||
      response?.error?.developerMessage;
    if (status === 0)
      return 'The server could not be reached. No changes were made. Check your connection and try again.';
    if (status === 401) return 'Your session has expired. Sign in again to continue.';
    if (status === 403 || /no authority|not authorized|permission/i.test(backendMessage ?? '')) {
      return 'You do not have permission to create members. Contact an administrator.';
    }
    if (status === 409) return 'This member may already exist. Search for the member before trying again.';
    if (status >= 500) return 'The server could not create the member. No changes were made. Try again.';
    return backendMessage || `${fallback} Review the details and try again.`;
  }
}
