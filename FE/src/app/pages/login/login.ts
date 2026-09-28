import {
  Component,
} from '@angular/core';

import {
  FormsModule,
} from '@angular/forms';

import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  Router,
} from '@angular/router';

import {
  finalize,
} from 'rxjs';

import {
  AuthService,
} from '../../core/services/auth.service';


@Component({

  selector: 'app-login',

  imports: [
    FormsModule,
  ],

  templateUrl:
    './login.html',

  styleUrl:
    './login.css',

})


export class Login {

  email = '';

  password = '';


  showPassword = false;


  submitted = false;

  isLoading = false;

  loginError = '';


  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}


  /* =====================================================
     EMAIL VALIDATION
  ===================================================== */

  get validEmail(): boolean {

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


    return emailRegex.test(
      this.email.trim(),
    );

  }


  /* =====================================================
     PASSWORD VALIDATION
  ===================================================== */

  get validPassword(): boolean {

    return (
      this.password.trim().length > 0
    );

  }


  /* =====================================================
     FORM VALID
  ===================================================== */

  get formValid(): boolean {

    return (
      this.validEmail &&
      this.validPassword
    );

  }


  /* =====================================================
     PASSWORD EYE
  ===================================================== */

  togglePasswordVisibility(): void {

    this.showPassword =
      !this.showPassword;

  }


  /* =====================================================
     SIGN IN
  ===================================================== */

  signIn(): void {

    this.submitted = true;

    this.loginError = '';


    if (
      !this.formValid ||
      this.isLoading
    ) {

      return;

    }


    this.isLoading = true;


    this.authService
      .login(
        this.email,
        this.password,
      )
      .pipe(

        finalize(() => {

          this.isLoading =
            false;

        }),

      )
      .subscribe({

        /* ===============================================
           LOGIN SUCCESS
        =============================================== */

        next: () => {

          /*
           * AuthService has already saved:
           *
           * access token
           * refresh token
           * email
           * full name
           */

         this.router.navigate([
  '/home',
]);

        },


        /* ===============================================
           LOGIN FAILED
        =============================================== */

        error: (
          error: HttpErrorResponse,
        ) => {

          console.error(
            'Login failed:',
            error,
          );


          /*
           * Invalid email/password will commonly
           * be 401 or 400 depending on backend.
           */

          if (
            error.status === 401 ||
            error.status === 400
          ) {

            this.loginError =
              'Invalid email or password.';

            return;

          }


          if (error.status === 422) {

            this.loginError =
              'Please enter a valid email and password.';

            return;

          }


          if (error.status === 0) {

            this.loginError =
              'Unable to connect to LiftLog. Please make sure the server is running.';

            return;

          }


          this.loginError =
            'Something went wrong while signing in. Please try again.';

        },

      });

  }


  /* =====================================================
     SIGNUP
  ===================================================== */

  goToSignup(): void {

    this.router.navigate([
      '/signup',
    ]);

  }

}