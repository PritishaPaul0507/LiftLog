import {
  Injectable,
} from '@angular/core';

import {
  HttpClient,
} from '@angular/common/http';

import {
  Observable,
  finalize,
  shareReplay,
  tap,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';


export interface SignupRequest {
  full_name: string;
  email: string;
  password: string;
}


export interface LoginRequest {
  email: string;
  password: string;
}


export interface RefreshTokenRequest {
  refresh_token: string;
}


export interface AuthUser {
  access_token: string;
  refresh_token: string;
  email: string;
  full_name: string;
}


export interface AuthResponse {
  message: string;
  user: AuthUser;
}


@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private readonly ACCESS_TOKEN_KEY =
    'pulseos_access_token';

  private readonly REFRESH_TOKEN_KEY =
    'pulseos_refresh_token';

  private readonly USER_EMAIL_KEY =
    'pulseos_user_email';

  private readonly USER_FULL_NAME_KEY =
    'pulseos_user_full_name';


  private readonly apiUrl =
    `${environment.apiBaseUrl}/auth`;


  /*
   * Backend access token lifetime:
   * approximately 15 minutes.
   *
   * Refresh slightly before expiration.
   */
  private readonly TOKEN_REFRESH_INTERVAL =
    14 * 60 * 1000;


  private refreshTimer?:
    ReturnType<typeof setInterval>;


  /*
   * Prevent several simultaneous 401 responses
   * from creating several refresh requests.
   */
  private refreshRequest$?:
    Observable<AuthResponse>;


  constructor(
    private http: HttpClient,
  ) {

    /*
     * Browser reload:
     *
     * localStorage survives the reload, so if the
     * refresh token still exists we restart the
     * proactive refresh timer.
     */
    if (
      this.getRefreshToken()
    ) {

      this.startTokenRefreshTimer();

    }

  }


  signup(
    fullName: string,
    email: string,
    password: string,
  ): Observable<AuthResponse> {

    const body: SignupRequest = {

      full_name:
        fullName.trim(),

      email:
        email.trim(),

      password,

    };


    return this.http
      .post<AuthResponse>(
        `${this.apiUrl}/signup`,
        body,
      )
      .pipe(

        tap(
          (response) => {

            this.handleSuccessfulAuthentication(
              response,
            );

          },
        ),

      );

  }


  login(
    email: string,
    password: string,
  ): Observable<AuthResponse> {

    const body: LoginRequest = {

      email:
        email.trim(),

      password,

    };


    /*
     * Current backend Swagger:
     *
     * POST /api/v1/auth/login
     */
    return this.http
      .post<AuthResponse>(
        `${this.apiUrl}/login`,
        body,
      )
      .pipe(

        tap(
          (response) => {

            this.handleSuccessfulAuthentication(
              response,
            );

          },
        ),

      );

  }


  refreshAccessToken():
    Observable<AuthResponse> {

    /*
     * If a refresh is already in progress,
     * reuse the same request.
     */
    if (
      this.refreshRequest$
    ) {

      return this.refreshRequest$;

    }


    const refreshToken =
      this.getRefreshToken();


    if (!refreshToken) {

      throw new Error(
        'No refresh token available.',
      );

    }


    const body:
      RefreshTokenRequest = {

      refresh_token:
        refreshToken,

    };


    /*
     * Current backend contract:
     *
     * POST /api/v1/auth/refresh
     *
     * {
     *   "refresh_token": "..."
     * }
     *
     * Response contains BOTH:
     * access_token
     * refresh_token
     */
    this.refreshRequest$ =
      this.http
        .post<AuthResponse>(
          `${this.apiUrl}/refresh`,
          body,
        )
        .pipe(

          tap(
            (response) => {

              this.saveTokens(
                response.user.access_token,
                response.user.refresh_token,
              );


              this.saveUserDetails(
                response.user.email,
                response.user.full_name,
              );

            },
          ),


          finalize(
            () => {

              this.refreshRequest$ =
                undefined;

            },
          ),


          shareReplay(1),

        );


    return this.refreshRequest$;

  }


  startTokenRefreshTimer(): void {

    this.stopTokenRefreshTimer();


    if (
      !this.getRefreshToken()
    ) {

      return;

    }


    this.refreshTimer =
      setInterval(
        () => {

          if (
            !this.getRefreshToken()
          ) {

            this.stopTokenRefreshTimer();

            return;

          }


          this.refreshAccessToken()
            .subscribe({

              next: () => {

                console.log(
                  'PulseOS authentication refreshed.',
                );

              },


              error: (
                error,
              ) => {

                console.error(
                  'Background token refresh failed:',
                  error,
                );


                /*
                 * Do not destroy the session for
                 * temporary network/server failures.
                 *
                 * Only clear it when the refresh
                 * token itself is rejected.
                 */
                if (
                  error?.status === 401 ||
                  error?.status === 403
                ) {

                  this.logout();

                }

              },

            });

        },

        this.TOKEN_REFRESH_INTERVAL,
      );

  }


  private stopTokenRefreshTimer(): void {

    if (
      !this.refreshTimer
    ) {

      return;

    }


    clearInterval(
      this.refreshTimer,
    );


    this.refreshTimer =
      undefined;

  }


  private handleSuccessfulAuthentication(
    response: AuthResponse,
  ): void {

    this.saveTokens(
      response.user.access_token,
      response.user.refresh_token,
    );


    this.saveUserDetails(
      response.user.email,
      response.user.full_name,
    );


    this.startTokenRefreshTimer();

  }


  private saveTokens(
    accessToken: string,
    refreshToken: string,
  ): void {

    localStorage.setItem(
      this.ACCESS_TOKEN_KEY,
      accessToken,
    );


    localStorage.setItem(
      this.REFRESH_TOKEN_KEY,
      refreshToken,
    );

  }


  getAccessToken():
    string | null {

    return localStorage.getItem(
      this.ACCESS_TOKEN_KEY,
    );

  }


  getRefreshToken():
    string | null {

    return localStorage.getItem(
      this.REFRESH_TOKEN_KEY,
    );

  }


  isAccessTokenExpired(
    token: string | null,
  ): boolean {

    if (
      !token
    ) {

      return true;

    }

    try {

      const tokenParts =
        token.split('.');

      if (
        tokenParts.length < 2
      ) {

        return true;

      }

      const payloadSegment =
        tokenParts[1]
          .replace(/-/g, '+')
          .replace(/_/g, '/');

      const paddedSegment =
        payloadSegment.padEnd(
          Math.ceil(
            payloadSegment.length / 4,
          ) * 4,
          '=',
        );

      const base64Decoded =
        globalThis.atob(
          paddedSegment,
        );

      const normalizedPayload =
        decodeURIComponent(
          Array.from(
            base64Decoded,
            (character) =>
              `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`,
          ).join(''),
        );

      const payload =
        JSON.parse(
          normalizedPayload,
        ) as {
          exp?: number;
        };

      if (
        typeof payload.exp !== 'number'
      ) {

        return true;

      }

      return Date.now() >=
        payload.exp * 1000;

    }
    catch {

      return true;

    }

  }


  getUserEmail():
    string | null {

    return localStorage.getItem(
      this.USER_EMAIL_KEY,
    );

  }


  getUserFullName():
    string | null {

    return localStorage.getItem(
      this.USER_FULL_NAME_KEY,
    );

  }


  isLoggedIn(): boolean {

    return !!this.getRefreshToken();

  }


  logout(): void {

    this.stopTokenRefreshTimer();


    localStorage.removeItem(
      this.ACCESS_TOKEN_KEY,
    );


    localStorage.removeItem(
      this.REFRESH_TOKEN_KEY,
    );


    localStorage.removeItem(
      this.USER_EMAIL_KEY,
    );


    localStorage.removeItem(
      this.USER_FULL_NAME_KEY,
    );

  }


  private saveUserDetails(
    email: string,
    fullName: string,
  ): void {

    localStorage.setItem(
      this.USER_EMAIL_KEY,
      email,
    );


    localStorage.setItem(
      this.USER_FULL_NAME_KEY,
      fullName,
    );

  }

}