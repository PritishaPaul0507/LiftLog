import {
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';

import {
  ActivatedRoute,
  Router,
} from '@angular/router';

import {
  BookingDetail,
  LiftlogApiService,
} from '../../services/liftlog-api.service';


@Component({
  selector: 'app-booking-detail',
  imports: [],
  templateUrl: './booking-detail.html',
  styleUrl: './booking-detail.css',
})
export class BookingDetailPage
  implements OnInit {

  bookingId =
    0;

  booking:
    BookingDetail |
    null =
    null;

  isLoading =
    true;

  errorMessage =
    '';

  gymImageFailed =
    false;


  isCancelling =
    false;

  actionError =
    '';


  constructor(
    private readonly route:
      ActivatedRoute,

    private readonly router:
      Router,

    private readonly liftlogApi:
      LiftlogApiService,

    private readonly changeDetector:
      ChangeDetectorRef,
  ) {}


  ngOnInit(): void {

    this.bookingId =
      Number(
        this.route.snapshot
          .paramMap
          .get(
            'bookingId',
          ),
      );


    if (
      !Number.isInteger(
        this.bookingId,
      ) ||
      this.bookingId <=
        0
    ) {

      this.router.navigate([
        '/profile',
      ]);

      return;

    }


    this.loadBooking();

  }


  get isCancelled(): boolean {

    return (
      this.booking
        ?.status
        ?.trim()
        .toLowerCase() ===
      'cancelled'
    );

  }


  get statusKicker(): string {

    return this.isCancelled
      ? 'BOOKING CANCELLED'
      : 'BOOKING CONFIRMED';

  }


  get statusTitle(): string {

    return this.isCancelled
      ? 'Booking cancelled'
      : "You're booked!";

  }


  get statusDescription(): string {

    return this.isCancelled
      ? 'This gym session is no longer active.'
      : 'Your gym session is confirmed.';

  }


  private loadBooking(): void {

    const token =
      localStorage.getItem(
        'pulseos_access_token',
      );


    if (!token) {

      this.errorMessage =
        'Your session has expired. Please sign in again.';

      this.isLoading =
        false;

      this.changeDetector
        .detectChanges();

      return;

    }


    this.isLoading =
      true;

    this.errorMessage =
      '';


    this.liftlogApi
      .getBooking(
        token,
        this.bookingId,
      )
      .subscribe({

        next: booking => {

          this.booking =
            booking;

          this.isLoading =
            false;


          this.changeDetector
            .detectChanges();

        },


        error: error => {

          console.error(
            'Unable to load booking:',
            error,
          );


          this.booking =
            null;

          this.errorMessage =
            'Could not load this booking.';

          this.isLoading =
            false;


          this.changeDetector
            .detectChanges();

        },

      });

  }


  cancelBooking(): void {

    if (
      !this.booking ||
      this.isCancelled ||
      this.isCancelling
    ) {
      return;
    }

    const token =
      localStorage.getItem(
        'pulseos_access_token',
      );

    if (!token) {
      this.actionError =
        'Your session has expired. Please sign in again.';

      this.changeDetector
        .detectChanges();

      return;
    }

    this.isCancelling =
      true;

    this.actionError =
      '';

    this.changeDetector
      .detectChanges();

    this.liftlogApi
      .cancelBooking(
        token,
        this.bookingId,
      )
      .subscribe({

        next: () => {

          this.isCancelling =
            false;

          this.loadBooking();

        },

        error: error => {

          console.error(
            'Unable to cancel booking:',
            error,
          );

          this.isCancelling =
            false;

          this.actionError =
            'Could not cancel this booking. Please try again.';

          this.changeDetector
            .detectChanges();

        },

      });

  }


  rescheduleBooking(): void {

    if (
      !this.booking ||
      this.isCancelled
    ) {
      return;
    }

    this.router.navigate(
      [
        '/gyms',
        this.booking.gym.gym_id,
      ],
      {
        queryParams: {
          rescheduleBookingId:
            this.bookingId,
        },
      },
    );

  }


  goBack(): void {

    this.router.navigate([
      '/profile',
    ]);

  }


  goHome(): void {

    this.router.navigate([
      '/home',
    ]);

  }


  openGymDetails(): void {

    if (!this.booking) {
      return;
    }


    this.router.navigate([
      '/gyms',
      this.booking.gym.gym_id,
      'details',
    ]);

  }


  openDirections(): void {

    const mapsUrl =
      this.booking
        ?.gym
        ?.maps_url;


    if (!mapsUrl) {
      return;
    }


    window.open(
      mapsUrl,
      '_blank',
      'noopener,noreferrer',
    );

  }


  onGymImageError(): void {

    this.gymImageFailed =
      true;

    this.changeDetector
      .detectChanges();

  }


  formatDate(
    value:
      string,
  ): string {

    const parts =
      value
        .split(
          '-',
        )
        .map(
          Number,
        );


    if (
      parts.length !==
        3 ||
      parts.some(
        part =>
          !Number.isFinite(
            part,
          ),
      )
    ) {

      return value;

    }


    return new Intl.DateTimeFormat(
      'en',
      {
        weekday:
          'short',

        month:
          'short',

        day:
          'numeric',

        year:
          'numeric',
      },
    ).format(
      new Date(
        parts[0],
        parts[1] -
          1,
        parts[2],
      ),
    );

  }


  formatTime(
    value:
      string,
  ): string {

    const [
      hourText,
      minuteText,
    ] =
      value.split(
        ':',
      );


    const hour =
      Number(
        hourText,
      );

    const minute =
      Number(
        minuteText,
      );


    if (
      !Number.isFinite(
        hour,
      ) ||
      !Number.isFinite(
        minute,
      )
    ) {

      return value;

    }


    const suffix =
      hour >=
        12
        ? 'PM'
        : 'AM';

    const displayHour =
      hour %
        12 ||
      12;


    return (
      `${displayHour}:${String(
        minute,
      ).padStart(
        2,
        '0',
      )} ${suffix}`
    );

  }

}
