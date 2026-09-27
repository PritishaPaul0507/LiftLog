import {
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';

import {
  Router,
} from '@angular/router';

import {
  LiftlogApiService,
  NearbyGym,
} from '../../services/liftlog-api.service';

import {
  environment,
} from '../../../environments/environment';


type LocationStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'denied'
  | 'unavailable'
  | 'error';


type GymStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error';


export interface HomeNotification {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
}


@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {

  private readonly GYM_RADIUS_KM =
    environment.gym.radiusKm;

  private readonly GYM_PAGE_SIZE =
    environment.gym.pageSize;


  locationStatus:
    LocationStatus =
    'idle';

  latitude:
    number |
    null =
    null;

  longitude:
    number |
    null =
    null;

  locationErrorMessage =
    '';


  gymStatus:
    GymStatus =
    'idle';

  gymErrorMessage =
    '';

  nearbyGyms:
    NearbyGym[] =
    [];

  failedGymImages =
    new Set<number>();


  notifications:
    HomeNotification[] =
    [];

  showNotifications =
    false;


  constructor(
    private readonly router:
      Router,

    private readonly changeDetectorRef:
      ChangeDetectorRef,

    private readonly liftlogApi:
      LiftlogApiService,
  ) {}


  ngOnInit(): void {

    this.requestLocation();

  }


  get greeting(): string {

    const hour =
      new Date()
        .getHours();


    if (
      hour <
      12
    ) {
      return 'Good morning';
    }


    if (
      hour <
      17
    ) {
      return 'Good afternoon';
    }


    return 'Good evening';

  }


  get unreadNotificationCount(): number {

    return this.notifications.filter(
      notification =>
        !notification.isRead,
    ).length;

  }


  get hasUnreadNotifications(): boolean {

    return (
      this.unreadNotificationCount >
      0
    );

  }


  /* =====================================================
     LOCATION
  ===================================================== */

  requestLocation(): void {

    this.locationErrorMessage =
      '';

    this.gymErrorMessage =
      '';

    this.gymStatus =
      'idle';


    if (
      !navigator.geolocation
    ) {

      this.locationStatus =
        'unavailable';

      this.locationErrorMessage =
        'Location is not supported by this browser.';

      return;

    }


    this.locationStatus =
      'loading';


    navigator.geolocation
      .getCurrentPosition(

        position => {

          this.latitude =
            position.coords.latitude;

          this.longitude =
            position.coords.longitude;

          this.locationStatus =
            'ready';


          this.changeDetectorRef
            .detectChanges();


          /*
           * As soon as location is available,
           * load nearby gyms from the LiftLog API.
           */
          this.loadNearbyGyms();

        },

        error => {

          this.latitude =
            null;

          this.longitude =
            null;

          this.nearbyGyms =
            [];

          this.gymStatus =
            'idle';


          switch (
            error.code
          ) {

            case error.PERMISSION_DENIED:

              this.locationStatus =
                'denied';

              this.locationErrorMessage =
                'Enable location access to find gyms near you.';

              break;


            case error.POSITION_UNAVAILABLE:

              this.locationStatus =
                'unavailable';

              this.locationErrorMessage =
                'Your current location could not be determined.';

              break;


            case error.TIMEOUT:

              this.locationStatus =
                'error';

              this.locationErrorMessage =
                'Location detection took too long. Please try again.';

              break;


            default:

              this.locationStatus =
                'error';

              this.locationErrorMessage =
                'Unable to access your location. Please try again.';

          }


          this.changeDetectorRef
            .detectChanges();

        },

        {
          enableHighAccuracy:
            false,

          timeout:
            environment.gym
              .locationTimeoutMs,

          maximumAge:
            environment.gym
              .locationMaximumAgeMs,
        },
      );

  }


  /* =====================================================
     NEARBY GYMS
  ===================================================== */

  loadNearbyGyms(): void {

    if (
      this.latitude ===
        null ||
      this.longitude ===
        null
    ) {

      this.requestLocation();

      return;

    }


    this.gymStatus =
      'loading';

    this.gymErrorMessage =
      '';

    this.nearbyGyms =
      [];

    this.failedGymImages
      .clear();


    this.changeDetectorRef
      .detectChanges();


    this.liftlogApi
      .getNearbyGyms(
        this.latitude,
        this.longitude,
        this.GYM_RADIUS_KM,
        this.GYM_PAGE_SIZE,
        0,
      )
      .subscribe({

        next: gyms => {

          /*
           * Backend should already return closest-first.
           * Sorting here makes that contract safe on the FE too.
           */
          this.nearbyGyms = [
            ...gyms,
          ].sort(
            (
              first,
              second,
            ) =>
              first.distance_km -
              second.distance_km,
          );


          this.gymStatus =
            this.nearbyGyms.length >
              0
              ? 'ready'
              : 'empty';


          this.changeDetectorRef
            .detectChanges();

        },


        error: error => {

          console.error(
            'Unable to load nearby gyms:',
            error,
          );


          this.nearbyGyms =
            [];

          this.gymStatus =
            'error';

          this.gymErrorMessage =
            'We could not load nearby gyms. Please try again.';


          this.changeDetectorRef
            .detectChanges();

        },

      });

  }


  /*
   * Kept for compatibility with the previous Home page.
   * It now loads gyms inside LiftLog instead of opening Maps.
   */
  findNearbyGyms(): void {

    this.loadNearbyGyms();

  }


  openGym(
    gym:
      NearbyGym,
  ): void {

    const queryParams:
      Record<string, number> =
      {};


    if (
      this.latitude !==
        null
    ) {

      queryParams['lat'] =
        this.latitude;

    }


    if (
      this.longitude !==
        null
    ) {

      queryParams['lng'] =
        this.longitude;

    }


    this.router.navigate(
      [
        '/gyms',
        gym.gym_id,
      ],
      {
        queryParams,
      },
    );

  }


  onGymImageError(
    gymId:
      number,
  ): void {

    this.failedGymImages
      .add(
        gymId,
      );

    this.changeDetectorRef
      .detectChanges();

  }


  formatDistance(
    distanceKm:
      number,
  ): string {

    if (
      !Number.isFinite(
        distanceKm,
      )
    ) {
      return 'Distance unavailable';
    }


    if (
      distanceKm <
      1
    ) {

      return (
        `${Math.max(
          1,
          Math.round(
            distanceKm *
            1000,
          ),
        )} m away`
      );

    }


    return (
      `${distanceKm.toFixed(
        distanceKm <
          10
          ? 1
          : 0,
      )} km away`
    );

  }


  /* =====================================================
     NOTIFICATIONS
  ===================================================== */

  toggleNotifications(): void {

    this.showNotifications =
      !this.showNotifications;

  }


  closeNotifications(): void {

    this.showNotifications =
      false;

  }


  markNotificationRead(
    notification:
      HomeNotification,
  ): void {

    notification.isRead =
      true;

  }


  markAllNotificationsRead(): void {

    this.notifications =
      this.notifications.map(
        notification => ({
          ...notification,
          isRead:
            true,
        }),
      );

  }


  /* =====================================================
     NAVIGATION
  ===================================================== */

  startWorkout(): void {

    this.router.navigate(
      [
        '/dashboard',
      ],
    );

  }


  goToWorkouts(): void {

    this.router.navigate(
      [
        '/dashboard',
      ],
    );

  }


  goToNutrition(): void {

    this.router.navigate(
      [
        '/healthify',
      ],
    );

  }


  goToProfile(): void {

    this.router.navigate(
      [
        '/profile',
      ],
    );

  }


  goToHome(): void {

    // Already on Home.

  }

}