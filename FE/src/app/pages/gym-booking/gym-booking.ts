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
  GymSlot,
  GymSlotsResponse,
  GymSummary,
  LiftlogApiService,
} from '../../services/liftlog-api.service';


interface BookingDayView {
  date: string;
  weekday: string;
  dayNumber: string;
  month: string;
}


@Component({
  selector: 'app-gym-booking',
  imports: [],
  templateUrl: './gym-booking.html',
  styleUrl: './gym-booking.css',
})
export class GymBooking
  implements OnInit {

  gymId =
    0;

  latitude:
    number |
    null =
    null;

  longitude:
    number |
    null =
    null;


  gym:
    GymSummary |
    null =
    null;


  days:
    BookingDayView[] =
    [];

  selectedDate =
    '';

  slotGroups =
    new Map<
      string,
      GymSlot[]
    >();


  isLoadingGym =
    true;

  isLoadingSlots =
    true;

  gymError =
    '';

  slotsError =
    '';

  gymImageFailed =
    false;


  rescheduleBookingId:
    number |
    null =
    null;

  rescheduleError =
    '';

  isRescheduling =
    false;


  constructor(
    private readonly route:
      ActivatedRoute,

    private readonly router:
      Router,

    private readonly liftlogApi:
      LiftlogApiService,

    private readonly changeDetectorRef:
      ChangeDetectorRef,
  ) {}


  ngOnInit(): void {

    this.gymId =
      Number(
        this.route.snapshot
          .paramMap
          .get(
            'gymId',
          ),
      );


    if (
      !Number.isInteger(
        this.gymId,
      ) ||
      this.gymId <=
        0
    ) {

      this.router.navigate(
        [
          '/home',
        ],
      );

      return;

    }


    this.latitude =
      this.readOptionalNumber(
        this.route.snapshot
          .queryParamMap
          .get(
            'lat',
          ),
      );


    this.longitude =
      this.readOptionalNumber(
        this.route.snapshot
          .queryParamMap
          .get(
            'lng',
          ),
      );


    this.rescheduleBookingId =
      this.readOptionalPositiveInteger(
        this.route.snapshot
          .queryParamMap
          .get(
            'rescheduleBookingId',
          ),
      );


    this.days =
      this.buildNextSevenDays();


    this.selectedDate =
      this.days[0]?.date ||
      '';


    this.loadGym();

    this.loadSlots();

  }


  get selectedSlots():
    GymSlot[] {

    return (
      this.slotGroups.get(
        this.selectedDate,
      ) ||
      []
    );

  }


  get availableSlotCount(): number {

    return this.selectedSlots.filter(
      slot =>
        slot.available,
    ).length;

  }


  /* =====================================================
     GYM
  ===================================================== */

  private loadGym(): void {

    this.isLoadingGym =
      true;

    this.gymError =
      '';


    this.changeDetectorRef
      .detectChanges();


    this.liftlogApi
      .getGymSummary(
        this.gymId,
        this.latitude,
        this.longitude,
      )
      .subscribe({

        next: gym => {

          console.log(
            'GYM SUMMARY RESPONSE:',
            gym,
          );


          this.gym =
            gym;

          this.isLoadingGym =
            false;


          this.changeDetectorRef
            .detectChanges();

        },


        error: error => {

          console.error(
            'Unable to load gym summary:',
            error,
          );


          this.gym =
            null;

          this.gymError =
            'Could not load this gym.';


          this.isLoadingGym =
            false;


          this.changeDetectorRef
            .detectChanges();

        },

      });

  }


  /* =====================================================
     SLOTS
  ===================================================== */

  private loadSlots(): void {

    if (
      this.days.length ===
      0
    ) {

      this.isLoadingSlots =
        false;

      this.changeDetectorRef
        .detectChanges();

      return;

    }


    this.isLoadingSlots =
      true;

    this.slotsError =
      '';

    this.slotGroups
      .clear();


    this.changeDetectorRef
      .detectChanges();


    const fromDate =
      this.days[0].date;


    const toDate =
      this.days[
        this.days.length -
        1
      ].date;


    console.log(
      'LOADING GYM SLOTS:',
      {
        gymId:
          this.gymId,

        from:
          fromDate,

        to:
          toDate,
      },
    );


    this.liftlogApi
      .getGymSlots(
        this.gymId,
        fromDate,
        toDate,
      )
      .subscribe({

        next: response => {

          console.log(
            'GYM SLOTS RESPONSE:',
            response,
          );


          this.applySlotResponse(
            response,
          );


          this.isLoadingSlots =
            false;


          this.changeDetectorRef
            .detectChanges();

        },


        error: error => {

          console.error(
            'Unable to load gym slots:',
            error,
          );


          this.slotGroups
            .clear();


          this.slotsError =
            'Could not load available sessions. Please try again.';


          this.isLoadingSlots =
            false;


          this.changeDetectorRef
            .detectChanges();

        },

      });

  }


  private applySlotResponse(
    response:
      GymSlotsResponse,
  ): void {

    this.slotGroups =
      new Map<
        string,
        GymSlot[]
      >();


    if (
      !response ||
      !Array.isArray(
        response.slots,
      )
    ) {

      return;

    }


    response.slots.forEach(
      day => {

        this.slotGroups.set(
          day.date,
          Array.isArray(
            day.slots,
          )
            ? day.slots
            : [],
        );

      },
    );

  }


  /* =====================================================
     DATE / SLOT SELECTION
  ===================================================== */

  selectDate(
    date:
      string,
  ): void {

    this.selectedDate =
      date;


    this.changeDetectorRef
      .detectChanges();

  }


  selectSlot(
    slot:
      GymSlot,
  ): void {

    if (
      !slot.available ||
      this.isRescheduling
    ) {
      return;
    }

    if (
      this.rescheduleBookingId !==
      null
    ) {
      this.rescheduleBooking(
        slot,
      );
      return;
    }

    this.router.navigate(
      [
        '/gyms',
        this.gymId,
        'slots',
        slot.slot_id,
      ],
      {
        queryParams: {
          date:
            this.selectedDate,
        },
      },
    );

  }


  private rescheduleBooking(
    slot:
      GymSlot,
  ): void {

    const oldBookingId =
      this.rescheduleBookingId;

    if (
      oldBookingId ===
      null
    ) {
      return;
    }

    const token =
      localStorage.getItem(
        'pulseos_access_token',
      );

    if (!token) {
      this.rescheduleError =
        'Your session has expired. Please sign in again.';

      this.changeDetectorRef
        .detectChanges();

      return;
    }

    this.isRescheduling =
      true;

    this.rescheduleError =
      '';

    this.changeDetectorRef
      .detectChanges();

    // Safe reschedule order:
    // 1. Create the replacement booking.
    // 2. Only after creation succeeds, cancel the old booking.
    this.liftlogApi
  .createBooking(
    token,
    {
      gym_id:
        this.gymId,

      slot_id:
        slot.slot_id,

      date:
        this.selectedDate,
    },
  )
      .subscribe({

        next: newBooking => {

          this.liftlogApi
            .cancelBooking(
              token,
              oldBookingId,
            )
            .subscribe({

              next: () => {

                this.isRescheduling =
                  false;

                this.router.navigate(
                  [
                    '/bookings',
                    newBooking.booking_id,
                  ],
                );

              },

              error: error => {

                console.error(
                  'Replacement booking was created, but the old booking could not be cancelled:',
                  error,
                );

                this.isRescheduling =
                  false;

                this.rescheduleError =
                  'Your new session was booked, but the previous booking could not be cancelled. Please review My Bookings before trying again.';

                this.changeDetectorRef
                  .detectChanges();

              },

            });

        },

        error: error => {

          console.error(
            'Unable to create replacement booking:',
            error,
          );

          this.isRescheduling =
            false;

          this.rescheduleError =
            'Could not book the new session. Your existing booking is still active.';

          this.changeDetectorRef
            .detectChanges();

        },

      });

  }


  /* =====================================================
     GYM DETAILS
  ===================================================== */

  openGymDetails(): void {

    this.router.navigate(
      [
        '/gyms',
        this.gymId,
        'details',
      ],
    );

  }


  retrySlots(): void {

    this.loadSlots();

  }


  onGymImageError(): void {

    this.gymImageFailed =
      true;


    this.changeDetectorRef
      .detectChanges();

  }

/* =====================================================
   GOOGLE MAPS
===================================================== */

openGymMaps(
  event: MouseEvent,
): void {

  event.stopPropagation();

  if (
    !this.gym ||
    !this.gym.address
  ) {
    return;
  }

  const mapsUrl =
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(
      this.gym.address,
    );

  window.open(
    mapsUrl,
    '_blank',
    'noopener,noreferrer',
  );

}

  goBack(): void {

    this.router.navigate(
      [
        '/home',
      ],
    );

  }


  /* =====================================================
     FORMATTERS
  ===================================================== */

  formatDistance(
    distance:
      number |
      null,
  ): string {

    if (
      distance ===
        null ||
      !Number.isFinite(
        distance,
      )
    ) {

      return '';

    }


    if (
      distance <
      1
    ) {

      return (
        `${Math.max(
          1,
          Math.round(
            distance *
            1000,
          ),
        )} m away`
      );

    }


    return (
      `${distance.toFixed(
        distance <
          10
          ? 1
          : 0,
      )} km away`
    );

  }


  formatSlotTime(
    time:
      string,
  ): string {

    const [
      hoursText,
      minutesText,
    ] =
      time.split(
        ':',
      );


    const hours =
      Number(
        hoursText,
      );


    const minutes =
      Number(
        minutesText,
      );


    if (
      !Number.isFinite(
        hours,
      ) ||
      !Number.isFinite(
        minutes,
      )
    ) {

      return time;

    }


    const suffix =
      hours >=
        12
        ? 'PM'
        : 'AM';


    const displayHour =
      hours %
        12 ||
      12;


    return (
      `${displayHour}:${String(
        minutes,
      ).padStart(
        2,
        '0',
      )} ${suffix}`
    );

  }


  /* =====================================================
     NEXT 7 DAYS
  ===================================================== */

  private buildNextSevenDays():
    BookingDayView[] {

    const days:
      BookingDayView[] =
      [];


    const today =
      new Date();


    today.setHours(
      0,
      0,
      0,
      0,
    );


    for (
      let index =
        0;
      index <
        7;
      index +=
        1
    ) {

      const date =
        new Date(
          today,
        );


      date.setDate(
        today.getDate() +
        index,
      );


      days.push({

        date:
          this.toLocalIsoDate(
            date,
          ),

        weekday:
          new Intl.DateTimeFormat(
            'en',
            {
              weekday:
                'short',
            },
          ).format(
            date,
          ),

        dayNumber:
          new Intl.DateTimeFormat(
            'en',
            {
              day:
                '2-digit',
            },
          ).format(
            date,
          ),

        month:
          new Intl.DateTimeFormat(
            'en',
            {
              month:
                'short',
            },
          ).format(
            date,
          ),

      });

    }


    return days;

  }


  private toLocalIsoDate(
    date:
      Date,
  ): string {

    const year =
      date.getFullYear();


    const month =
      String(
        date.getMonth() +
        1,
      ).padStart(
        2,
        '0',
      );


    const day =
      String(
        date.getDate(),
      ).padStart(
        2,
        '0',
      );


    return (
      `${year}-${month}-${day}`
    );

  }
  

  private readOptionalPositiveInteger(
    value:
      string |
      null,
  ):
    number |
    null {

    if (
      value ===
      null
    ) {
      return null;
    }

    const parsed =
      Number(
        value,
      );

    return (
      Number.isInteger(
        parsed,
      ) &&
      parsed >
        0
    )
      ? parsed
      : null;

  }


  private readOptionalNumber(
    value:
      string |
      null,
  ):
    number |
    null {

    if (
      value ===
      null
    ) {

      return null;

    }


    const parsed =
      Number(
        value,
      );


    return Number.isFinite(
      parsed,
    )
      ? parsed
      : null;

  }
  

}