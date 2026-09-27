import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
} from '@angular/common/http';

import {
  inject,
} from '@angular/core';

import {
  Router,
} from '@angular/router';

import {
  catchError,
  Observable,
  switchMap,
  throwError,
} from 'rxjs';

import {
  AuthService,
} from '../services/auth.service';


export function authInterceptor(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {

  const authService =
    inject(AuthService);

  const router =
    inject(Router);


  /* =====================================================
     AUTH ENDPOINTS
  ===================================================== */

  const isSignupRequest =
    request.url.includes(
      '/auth/signup',
    );

  const isLoginRequest =
    request.url.includes(
      '/auth/login',
    );

  const isRefreshRequest =
    request.url.includes(
      '/auth/refresh',
    );


  /*
   * Authentication endpoints must not receive
   * an existing access token.
   */
  if (
    isSignupRequest ||
    isLoginRequest ||
    isRefreshRequest
  ) {

    return next(request);

  }


  /* =====================================================
     ADD ACCESS TOKEN
  ===================================================== */

  const accessToken =
    authService.getAccessToken();


  if (
    accessToken &&
    authService.isAccessTokenExpired(
      accessToken,
    )
  ) {

    const refreshToken =
      authService.getRefreshToken();

    if (
      !refreshToken
    ) {

      authService.logout();

      router.navigate([
        '/login',
      ]);

      return throwError(
        () => new Error(
          'No refresh token available',
        ),
      );

    }

    return authService
      .refreshAccessToken()
      .pipe(

        catchError(
          (
            refreshError:
              HttpErrorResponse,
          ) => {

            console.error(
              'Authentication refresh failed before request:',
              refreshError,
            );

            if (
              refreshError.status === 401 ||
              refreshError.status === 403
            ) {

              authService.logout();

              router.navigate([
                '/login',
              ]);

            }

            return throwError(
              () => refreshError,
            );

          },
        ),

        switchMap(
          (
            response,
          ) => {

            const refreshedToken =
              response.user.access_token;

            const retriedRequest =
              request.clone({

                setHeaders: {

                  Authorization:
                    `Bearer ${refreshedToken}`,

                },

              });

            return next(
              retriedRequest,
            );

          },
        ),

      );

  }


  const authenticatedRequest =
    accessToken
      ? request.clone({

          setHeaders: {

            Authorization:
              `Bearer ${accessToken}`,

          },

        })
      : request;


  /* =====================================================
     SEND ORIGINAL REQUEST
  ===================================================== */

  return next(
    authenticatedRequest,
  )
    .pipe(

      catchError(
        (
          error: HttpErrorResponse,
        ) => {

          /*
           * Only authentication failures should
           * trigger token refresh.
           */
          if (
            error.status !== 401
          ) {

            return throwError(
              () => error,
            );

          }


          /* =================================================
             REFRESH TOKEN AVAILABLE?
          ================================================= */

          const refreshToken =
            authService.getRefreshToken();


          if (
            !refreshToken
          ) {

            authService.logout();

            router.navigate([
              '/login',
            ]);


            return throwError(
              () => error,
            );

          }


          /* =================================================
             REFRESH ACCESS TOKEN
          ================================================= */

          return authService
            .refreshAccessToken()
            .pipe(

              /*
               * IMPORTANT:
               *
               * This catchError handles ONLY errors
               * produced by the refresh request.
               *
               * It is deliberately placed BEFORE
               * switchMap.
               */
              catchError(
                (
                  refreshError:
                    HttpErrorResponse,
                ) => {

                  console.error(
                    'Authentication refresh failed:',
                    refreshError,
                  );


                  /*
                   * Logout only when the refresh token
                   * itself has expired or is invalid.
                   */
                  if (
                    refreshError.status === 401 ||
                    refreshError.status === 403
                  ) {

                    authService.logout();

                    router.navigate([
                      '/login',
                    ]);

                  }


                  /*
                   * Network errors / 500 errors do not
                   * automatically destroy the session.
                   */
                  return throwError(
                    () => refreshError,
                  );

                },
              ),


              switchMap(
                (
                  response,
                ) => {

                  const newAccessToken =
                    response.user.access_token;


                  /* =========================================
                     RETRY ORIGINAL REQUEST
                  ========================================= */

                  const retryRequest =
                    request.clone({

                      setHeaders: {

                        Authorization:
                          `Bearer ${newAccessToken}`,

                      },

                    });


                  /*
                   * IMPORTANT:
                   *
                   * Errors from the retried API request
                   * are returned normally.
                   *
                   * For example:
                   *
                   * 422 -> stays 422
                   * 500 -> stays 500
                   *
                   * They do NOT cause logout.
                   */
                  return next(
                    retryRequest,
                  );

                },
              ),

            );

        },
      ),

    );

}