import {
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';

import {
  FormsModule,
} from '@angular/forms';

import {
  Router,
} from '@angular/router';

import {
  LiftlogApiService,
  UserProfile,
} from '../../services/liftlog-api.service';


type EditableProfileField =
  Exclude<
    keyof UserProfile,
    'version' | 'created_at'
  >;


@Component({
  selector: 'app-account',
  standalone: true,

  imports: [
    FormsModule,
  ],

  templateUrl:
    './account.html',

  styleUrl:
    './account.css',
})
export class Account implements OnInit {


  profile: UserProfile | null = null;


  isLoading = true;

  errorMessage = '';


  /*
   * Only one field can be edited at a time.
   */
  editingField:
    EditableProfileField | null =
      null;


  editValue = '';

  isSaving = false;

  saveError = '';


  constructor(
    private readonly api:
      LiftlogApiService,

    private readonly router:
      Router,

    private readonly changeDetector:
      ChangeDetectorRef,
  ) {}


  ngOnInit(): void {

    this.loadAccount();

  }


  /* =====================================================
     LOAD ACCOUNT
  ===================================================== */

  private loadAccount(): void {

    const token =
      localStorage.getItem(
        'pulseos_access_token',
      );


    if (!token) {

      this.router.navigate([
        '/login',
      ]);

      return;

    }


    this.isLoading = true;

    this.errorMessage = '';


    this.api
      .getProfile(token)
      .subscribe({

        next: profile => {

          this.profile =
            profile;

          this.isLoading =
            false;


          this.changeDetector
            .detectChanges();

        },


        error: error => {

          console.error(
            'Unable to load profile:',
            error,
          );


          this.isLoading =
            false;


          this.errorMessage =
            'Could not load your profile.';


          this.changeDetector
            .detectChanges();

        },

      });

  }


  /* =====================================================
     START EDITING
  ===================================================== */

  startEdit(
    field: EditableProfileField,
  ): void {

    if (
      !this.profile ||
      this.isSaving
    ) {
      return;
    }


    this.editingField =
      field;


    const currentValue =
      this.profile[field];


    this.editValue =
      typeof currentValue === 'string'
        ? currentValue
        : '';


    this.saveError = '';

  }


  /* =====================================================
     CANCEL EDITING
  ===================================================== */

  cancelEdit(): void {

    if (this.isSaving) {
      return;
    }


    this.editingField =
      null;

    this.editValue = '';

    this.saveError = '';

  }


  /* =====================================================
     SAVE FIELD
  ===================================================== */

  saveField(
    field: EditableProfileField,
  ): void {

    if (
      !this.profile ||
      this.isSaving
    ) {
      return;
    }


    const token =
      localStorage.getItem(
        'pulseos_access_token',
      );


    if (!token) {

      this.router.navigate([
        '/login',
      ]);

      return;

    }


    /*
     * Make a complete copy of the profile.
     *
     * Only the selected field is changed.
     */
    const updatedProfile:
      UserProfile = {

        ...this.profile,

        [field]:
          this.editValue.trim(),

      };


    this.isSaving = true;

    this.saveError = '';


    this.api
      .updateProfile(
        token,
        updatedProfile,
      )
      .subscribe({

        next: () => {

          /*
           * POST only returns:
           *
           * {
           *   message: "..."
           * }
           *
           * Therefore fetch the backend-confirmed
           * latest profile after saving.
           */
          this.api
            .getProfile(token)
            .subscribe({

              next: profile => {

                this.profile =
                  profile;


                this.editingField =
                  null;


                this.editValue =
                  '';


                this.isSaving =
                  false;


                this.changeDetector
                  .detectChanges();

              },


              error: error => {

                console.error(
                  'Profile saved but reload failed:',
                  error,
                );


                /*
                 * The POST succeeded, so update the
                 * visible profile locally even if the
                 * follow-up GET happens to fail.
                 */
                this.profile =
                  updatedProfile;


                this.editingField =
                  null;


                this.editValue =
                  '';


                this.isSaving =
                  false;


                this.changeDetector
                  .detectChanges();

              },

            });

        },


        error: error => {

          console.error(
            'Unable to update profile:',
            error,
          );


          this.isSaving =
            false;


          this.saveError =
            'Could not save this change. Please try again.';


          this.changeDetector
            .detectChanges();

        },

      });

  }


  /* =====================================================
     HELPERS
  ===================================================== */

  isEditing(
    field: EditableProfileField,
  ): boolean {

    return (
      this.editingField ===
      field
    );

  }


  goBack(): void {

    this.router.navigate([
      '/profile',
    ]);

  }


  display(
    value:
      string |
      null |
      undefined,
  ): string {

    const cleaned =
      value?.trim();


    return (
      cleaned ||
      'Not set'
    );

  }





  /* =====================================================
     IMPORTANT

     Do NOT append units here.

     These values are strings controlled by the backend.
  ===================================================== */

  get height(): string {

    return this.display(
      this.profile?.height,
    );

  }


  get weight(): string {

    return this.display(
      this.profile?.weight,
    );

  }


  get targetWeight(): string {

    return this.display(
      this.profile
        ?.target_weight,
    );

  }

}