import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import { HttpErrorResponse } from '@angular/common/http';

import { finalize } from 'rxjs';

import {
  AuthService,
} from '../../core/services/auth.service';


@Component({

  selector: 'app-signup',

  imports: [
    FormsModule,
  ],

  templateUrl: './signup.html',

  styleUrl: './signup.css',

})


export class Signup {

  fullName = '';

  email = '';

  password = '';

  confirmPassword = '';

  showPassword = false;

  showConfirmPassword = false;

  submitted = false;

  isLoading = false;

  signupError = '';


  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}


  /* =====================================================
     FULL NAME
  ===================================================== */

  get validFullName(): boolean {

    return this.fullName.trim().length >= 2;

  }


  /* =====================================================
     EMAIL
  ===================================================== */

  get validEmail(): boolean {

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    return emailRegex.test(
      this.email.trim(),
    );

  }


  /* =====================================================
     PASSWORD RULES
  ===================================================== */

  get hasMinimumLength(): boolean {

    return this.password.length >= 8;

  }


  get hasUppercase(): boolean {

    return /[A-Z]/.test(
      this.password,
    );

  }


  get hasLowercase(): boolean {

    return /[a-z]/.test(
      this.password,
    );

  }


  get hasDigit(): boolean {

    return /\d/.test(
      this.password,
    );

  }


  get hasSpecialCharacter(): boolean {

    return /[^A-Za-z0-9]/.test(
      this.password,
    );

  }


  get validPassword(): boolean {

    return (

      this.hasMinimumLength &&

      this.hasUppercase &&

      this.hasLowercase &&

      this.hasDigit &&

      this.hasSpecialCharacter

    );

  }


  /* =====================================================
     CONFIRM PASSWORD
  ===================================================== */

  get passwordsMatch(): boolean {

    return (

      this.confirmPassword.length > 0 &&

      this.password ===
        this.confirmPassword

    );

  }


  /* =====================================================
     FORM VALIDATION
  ===================================================== */

  get formValid(): boolean {

    return (

      this.validFullName &&

      this.validEmail &&

      this.validPassword &&

      this.passwordsMatch

    );

  }


  /* =====================================================
     PASSWORD VISIBILITY
  ===================================================== */

  togglePasswordVisibility(): void {

    this.showPassword =
      !this.showPassword;

  }


  toggleConfirmPasswordVisibility(): void {

    this.showConfirmPassword =
      !this.showConfirmPassword;

  }


  /* =====================================================
     CREATE ACCOUNT
  ===================================================== */

  createAccount(): void {

    this.submitted = true;

    this.signupError = '';


    if (
      !this.formValid ||
      this.isLoading
    ) {

      return;

    }


    this.isLoading = true;


    this.authService
      .signup(
        this.fullName,
        this.email,
        this.password,
      )
      .pipe(

        finalize(() => {

          this.isLoading = false;

        }),

      )
      .subscribe({

        next: () => {

          /*
           * AuthService has already stored:
           *
           * access token
           * refresh token
           * email
           * full name
           */

          this.router.navigate([
            '/onboarding',
          ]);

        },


        error: (
          error: HttpErrorResponse,
        ) => {

          console.error(
            'Signup failed:',
            error,
          );


          if (error.status === 409) {

            this.signupError =
              'An account with this email already exists.';

            return;

          }


          if (error.status === 400) {

            this.signupError =
              error.error?.detail ||
              'Please check your signup information.';

            return;

          }


          if (error.status === 422) {

            this.signupError =
              'Please check the information you entered.';

            return;

          }


          if (error.status === 0) {

            this.signupError =
              'Unable to connect to LiftLog. Please make sure the backend is running.';

            return;

          }


          this.signupError =
            'Something went wrong while creating your account. Please try again.';

        },

      });

  }


  /* =====================================================
     GO TO LOGIN
  ===================================================== */

  goToLogin(): void {

    this.router.navigate([
      '/login',
    ]);

  }

}