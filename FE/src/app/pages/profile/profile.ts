import {

  ChangeDetectorRef,

  Component,

  OnInit,

} from '@angular/core';



import {

  Router,

} from '@angular/router';

import {

  FormsModule,

} from '@angular/forms';





import {

  BookingListItem,

  LiftlogApiService,

  WorkoutDetail,

} from '../../services/liftlog-api.service';



import {

  ConfirmDialog,

} from '../../shared/confirm-dialog/confirm-dialog';





interface RecentWorkoutView {

  workoutId: number;

  title: string;

  dateLabel: string;

  durationLabel: string;

  exerciseCount: number;

  volume: number;

}





interface WeightHistoryPoint {

  date: string;

  weight: number;

}





interface MyBookingView {

  bookingId: number;

  gymId: number;

  gymName: string;

  imageUrl: string;

  dateLabel: string;

  timeLabel: string;

  statusLabel: string;

  statusClass: string;

  timestamp: number;

}





@Component({

  selector: 'app-profile',



  imports: [

    ConfirmDialog,

    FormsModule,

  ],



  templateUrl:

    './profile.html',



  styleUrl:

    './profile.css',

})

export class Profile

  implements OnInit {





  private readonly WORKOUTS_CHANGED_KEY =

    'pulseos_workouts_changed';





  /* =====================================================

     WEIGHT TRACKER



     Uses backend profile history so the chart follows the

     user's real saved profile-weight versions across devices.

     The + button below lets the user log a new weight directly

     from Profile without going through Account.

  ===================================================== */



  private loadWeightTracker(): void {

    const token =
      localStorage.getItem(
        'pulseos_access_token',
      );


    if (!token) {

      this.weightHistory =
        [];

      this.currentWeight =
        null;

      this.buildWeightChart();

      return;

    }


    this.liftlogApi
      .getProfileHistory(
        token,
      )
      .subscribe({

        next: response => {

          const history =
            Array.isArray(
              response.weight,
            )
              ? response.weight
              : [];


          const sortedHistory =
            [...history]
              .sort(
                (
                  first,
                  second,
                ) =>
                  new Date(
                    first.recorded_at,
                  ).getTime() -
                  new Date(
                    second.recorded_at,
                  ).getTime(),
              );


          const points:
            WeightHistoryPoint[] =
              [];


          sortedHistory.forEach(
            entry => {

              const weight =
                this.parseWeight(
                  entry.value,
                );


              if (
                weight ===
                null
              ) {
                return;
              }


              const recordedAt =
                new Date(
                  entry.recorded_at,
                );


              if (
                Number.isNaN(
                  recordedAt.getTime(),
                )
              ) {
                return;
              }


              /*
               * The backend creates a new profile version
               * whenever any profile field changes.
               *
               * Do not draw another weight point when the
               * weight itself did not change.
               */
              const previousPoint =
                points[
                  points.length -
                    1
                ];


              if (
                previousPoint &&
                previousPoint.weight ===
                  weight
              ) {
                return;
              }


              points.push({

                date:
                  entry.recorded_at,

                weight,

              });

            },
          );


          this.currentWeight =
            points[
              points.length -
                1
            ]?.weight ??
            null;


          const threeMonthsAgo =
            new Date();


          threeMonthsAgo.setMonth(
            threeMonthsAgo.getMonth() -
              3,
          );


          const recentPoints =
            points.filter(
              point => {

                const date =
                  new Date(
                    point.date,
                  );


                return (
                  !Number.isNaN(
                    date.getTime(),
                  ) &&
                  date >=
                    threeMonthsAgo
                );

              },
            );


          /*
           * Keep the chart useful even if the user's last
           * recorded weight is older than three months.
           */
          this.weightHistory =
            recentPoints.length >
            0
              ? recentPoints
              : points.slice(
                  -1,
                );


          this.buildWeightChart();


          this.changeDetector
            .detectChanges();

        },


        error: error => {

          console.error(
            'Unable to load weight history:',
            error,
          );


          this.weightHistory =
            [];

          this.currentWeight =
            null;


          this.buildWeightChart();


          this.changeDetector
            .detectChanges();

        },

      });

  }


  private parseWeight(

    value:

      string |

      null |

      undefined,

  ): number | null {


    if (!value) {
      return null;
    }


    const parsed =
      Number.parseFloat(
        value,
      );


    return Number.isFinite(
      parsed,
    )
      ? parsed
      : null;

  }


  private buildWeightChart(): void {



    const history =

      this.weightHistory;





    if (

      history.length ===

      0

    ) {



      this.weightChartPoints =

        '';



      this.weightChartAreaPoints =

        '';



      this.weightChartLabels =

        [];



      return;



    }





    const weights =

      history.map(

        point =>

          point.weight,

      );





    const rawMin =

      Math.min(

        ...weights,

      );



    const rawMax =

      Math.max(

        ...weights,

      );





    this.weightChartMin =

      Math.floor(

        rawMin -

        2,

      );



    this.weightChartMax =

      Math.ceil(

        rawMax +

        2,

      );





    if (

      this.weightChartMax ===

      this.weightChartMin

    ) {

      this.weightChartMax +=

        1;

    }





    const left =

      12;



    const right =

      308;



    const top =

      16;



    const bottom =

      142;



    const width =

      right - left;



    const height =

      bottom - top;



    const range =

      this.weightChartMax -

      this.weightChartMin;





    const points =

      history.map(

        (

          point,

          index,

        ) => {



          const x =

            history.length === 1

              ? left +

                width / 2

              : left +

                (

                  index /

                  (

                    history.length -

                    1

                  )

                ) *

                width;





          const y =

            bottom -

            (

              (

                point.weight -

                this.weightChartMin

              ) /

              range

            ) *

            height;





          return {

            x,

            y,

          };



        },

      );





    this.weightChartPoints =

      points

        .map(

          point =>

            `${point.x.toFixed(1)},${point.y.toFixed(1)}`,

        )

        .join(' ');





    this.weightChartAreaPoints =

      [

        `${points[0].x.toFixed(1)},${bottom}`,

        ...points.map(

          point =>

            `${point.x.toFixed(1)},${point.y.toFixed(1)}`,

        ),

        `${points[points.length - 1].x.toFixed(1)},${bottom}`,

      ].join(' ');





    const labelIndexes =

      history.length <= 3

        ? history.map(

            (_, index) =>

              index,

          )

        : [

            0,

            Math.floor(

              (

                history.length -

                1

              ) /

              2,

            ),

            history.length -

              1,

          ];





    this.weightChartLabels =

      labelIndexes.map(

        index => ({

          x:

            points[index].x,

          label:

            this.formatWeightChartDate(

              history[index].date,

            ),

        }),

      );



  }





  private formatWeightChartDate(

    value: string,

  ): string {



    const date =

      new Date(
        value,
      );





    if (

      Number.isNaN(

        date.getTime(),

      )

    ) {

      return '';

    }





    return new Intl.DateTimeFormat(

      'en',

      {

        month:

          'short',

        day:

          'numeric',

      },

    ).format(

      date,

    );



  }





  get firstTrackedWeight():

    number | null {



    return (

      this.weightHistory[0]

        ?.weight ??

      null

    );



  }





  get latestTrackedWeight():

    number | null {



    return (

      this.weightHistory[

        this.weightHistory.length -

        1

      ]?.weight ??

      this.currentWeight

    );



  }





  get latestWeightPoint(): {

    x: number;

    y: number;

  } | null {



    if (

      !this.weightChartPoints

    ) {

      return null;

    }





    const lastPoint =

      this.weightChartPoints

        .split(' ')

        .at(-1);





    if (!lastPoint) {

      return null;

    }





    const [x, y] =

      lastPoint

        .split(',')

        .map(Number);





    if (

      !Number.isFinite(x) ||

      !Number.isFinite(y)

    ) {

      return null;

    }





    return {

      x,

      y,

    };



  }





  formatWeight(

    value:

      number |

      null,

  ): string {



    if (value === null) {

      return '—';

    }





    return new Intl.NumberFormat(

      'en-IN',

      {

        maximumFractionDigits:

          1,

      },

    ).format(

      value,

    );



  }







  /* =====================================================

     WEIGHT LOGGER

  ===================================================== */


  get weightWholeOptions():

    number[] {

    return this.weightUnit ===
      'kg'
        ? this.weightKgWholeOptions
        : this.weightLbWholeOptions;

  }


  get selectedWeightValue():

    number {

    return (
      this.selectedWeightWhole +
      this.selectedWeightDecimal /
        10
    );

  }


  get todayWeightLabel():

    string {

    return new Intl.DateTimeFormat(
      'en',
      {
        month:
          'short',

        day:
          'numeric',
      },
    ).format(
      new Date(),
    );

  }


  get trackedWeightChange():

    number | null {

    const first =
      this.firstTrackedWeight;

    const latest =
      this.latestTrackedWeight;


    if (
      first === null ||
      latest === null
    ) {
      return null;
    }


    return (
      latest -
      first
    );

  }


  formatWeightChange():

    string {

    const change =
      this.trackedWeightChange;


    if (change === null) {
      return '—';
    }


    const rounded =
      Math.round(
        change * 10,
      ) /
      10;


    if (rounded > 0) {
      return `+${rounded.toFixed(1)} kg`;
    }


    return `${rounded.toFixed(1)} kg`;

  }


  openWeightLogger(): void {

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


    const weightKg =
      this.latestTrackedWeight ??
      this.currentWeight ??
      55;


    this.weightUnit =
      'kg';


    this.setWeightPickerValue(
      weightKg,
    );


    this.weightSaveError =
      '';


    this.showWeightLogger =
      true;


    document.body.style.overflow =
      'hidden';


    this.changeDetector
      .detectChanges();

  }


  closeWeightLogger(): void {

    if (
      this.isSavingWeight
    ) {
      return;
    }


    this.showWeightLogger =
      false;


    this.weightSaveError =
      '';


    document.body.style.overflow =
      '';

  }


  selectWeightUnit(

    unit:

      'kg' | 'lb',

  ): void {

    if (
      unit ===
      this.weightUnit
    ) {
      return;
    }


    const currentValue =
      this.selectedWeightValue;


    const converted =
      unit ===
      'lb'
        ? currentValue *
          2.2046226218
        : currentValue /
          2.2046226218;


    this.weightUnit =
      unit;


    this.setWeightPickerValue(
      converted,
    );

  }


  saveLoggedWeight(): void {

    if (
      this.isSavingWeight
    ) {
      return;
    }


    const token =
      localStorage.getItem(
        'pulseos_access_token',
      );


    if (!token) {

      this.closeWeightLogger();


      this.router.navigate([
        '/login',
      ]);

      return;

    }


    const selected =
      this.selectedWeightValue;


    const weightKg =
      this.weightUnit ===
        'kg'
        ? selected
        : selected /
          2.2046226218;


    const roundedWeightKg =
      Math.round(
        weightKg * 10,
      ) /
      10;


    if (
      !Number.isFinite(
        roundedWeightKg,
      ) ||
      roundedWeightKg <=
        0
    ) {

      this.weightSaveError =
        'Please choose a valid weight.';

      return;

    }


    this.isSavingWeight =
      true;


    this.weightSaveError =
      '';


    /*
     * Keep Account and Profile on the exact same source
     * of truth. Fetch the latest profile, change only the
     * weight, then POST the complete profile snapshot.
     */
    this.liftlogApi
      .getProfile(
        token,
      )
      .subscribe({

        next: profile => {

          const updatedProfile = {

            ...profile,

            weight:
              roundedWeightKg
                .toFixed(
                  1,
                ),

          };


          this.liftlogApi
            .updateProfile(
              token,
              updatedProfile,
            )
            .subscribe({

              next: () => {

                this.currentWeight =
                  roundedWeightKg;


                this.isSavingWeight =
                  false;


                this.showWeightLogger =
                  false;


                document.body.style.overflow =
                  '';


                /*
                 * Reload from /profile/history so the new
                 * backend version becomes a real chart point.
                 */
                this.loadWeightTracker();


                this.changeDetector
                  .detectChanges();

              },


              error: error => {

                console.error(
                  'Unable to save logged weight:',
                  error,
                );


                this.isSavingWeight =
                  false;


                this.weightSaveError =
                  error.error?.detail ||
                  'Could not save your weight. Please try again.';


                this.changeDetector
                  .detectChanges();

              },

            });

        },


        error: error => {

          console.error(
            'Unable to load profile before saving weight:',
            error,
          );


          this.isSavingWeight =
            false;


          this.weightSaveError =
            'Could not load your profile. Please try again.';


          this.changeDetector
            .detectChanges();

        },

      });

  }


  private setWeightPickerValue(

    value:

      number,

  ): void {

    const rounded =
      Math.round(
        value * 10,
      ) /
      10;


    let whole =
      Math.floor(
        rounded,
      );


    let decimal =
      Math.round(
        (
          rounded -
          whole
        ) *
        10,
      );


    if (
      decimal ===
      10
    ) {

      whole +=
        1;

      decimal =
        0;

    }


    const options =
      this.weightUnit ===
        'kg'
        ? this.weightKgWholeOptions
        : this.weightLbWholeOptions;


    const minimum =
      options[0];

    const maximum =
      options[
        options.length -
          1
      ];


    whole =
      Math.min(
        maximum,

        Math.max(
          minimum,
          whole,
        ),
      );


    this.selectedWeightWhole =
      whole;


    this.selectedWeightDecimal =
      decimal;

  }


  /* =====================================================

     SETTINGS

  ===================================================== */



  showSettings =

    false;





  /* =====================================================

     LOGOUT CONFIRMATION

  ===================================================== */



  showLogoutDialog =

    false;





  /* =====================================================

     USER

  ===================================================== */



  fullName =

    'LiftLog User';



  email =

    '';





  /* =====================================================

     PROGRESS

  ===================================================== */



  workoutsThisWeek =

    0;



  volumeThisWeek =

    0;



  streakDays =

    0;



  exercisesThisWeek =

    0;





  recentWorkouts:

    RecentWorkoutView[] = [];





  isLoadingProgress =

    false;



  progressError =

    '';







  /* =====================================================

     MY BOOKINGS

  ===================================================== */



  myBookings:

    MyBookingView[] = [];



  isLoadingBookings =

    false;



  bookingsError =

    '';



  showAllBookings =

    false;



  failedBookingImages =

    new Set<number>();



  /* =====================================================

     WEIGHT TRACKER

  ===================================================== */
  weightHistory:

    WeightHistoryPoint[] = [];



  currentWeight:

    number | null = null;



  weightChartPoints =

    '';



  weightChartAreaPoints =

    '';



  weightChartLabels:

    { x: number; label: string }[] = [];



  weightChartMin =

    0;



  weightChartMax =

    0;


  showWeightLogger =

    false;


  isSavingWeight =

    false;


  weightSaveError =

    '';


  weightUnit:

    'kg' | 'lb' =

      'kg';


  selectedWeightWhole =

    55;


  selectedWeightDecimal =

    0;


  readonly weightKgWholeOptions =

    Array.from(

      { length: 221 },

      (_, index) =>

        index + 30,

    );


  readonly weightLbWholeOptions =

    Array.from(

      { length: 486 },

      (_, index) =>

        index + 66,

    );


  readonly weightDecimalOptions =

    Array.from(

      { length: 10 },

      (_, index) =>

        index,

    );





  /* =====================================================

     CONSTRUCTOR

  ===================================================== */



  constructor(

    private readonly router:

      Router,



    private readonly liftlogApi:

      LiftlogApiService,



    private readonly changeDetector:

      ChangeDetectorRef,

  ) {}





  /* =====================================================

     INIT

  ===================================================== */



  ngOnInit(): void {



    this.loadUserData();



    this.loadWorkoutProgress();



    this.loadBookings();



    this.loadWeightTracker();



  }





  /* =====================================================

     USER

  ===================================================== */



  private loadUserData(): void {



    this.fullName =

      localStorage.getItem(

        'pulseos_user_full_name',

      ) ||

      'LiftLog User';





    this.email =

      localStorage.getItem(

        'pulseos_user_email',

      ) ||

      '';



  }





  get profileInitial(): string {



    return (

      this.fullName

        .trim()

        .charAt(0)

        .toUpperCase() ||

      'P'

    );



  }





  /* =====================================================

     WORKOUT DATA



     Load ALL completed workouts.



     Profile uses:

     - all history for streak

     - current week for progress

     - newest 3 for Recent Activity

  ===================================================== */



  private loadWorkoutProgress(): void {



    const token =

      localStorage.getItem(

        'pulseos_access_token',

      );





    if (!token) {



      this.resetWorkoutProgress();



      this.progressError =

        'Workout progress is unavailable.';



      this.isLoadingProgress =

        false;



      this.changeDetector

        .detectChanges();



      return;



    }





    this.isLoadingProgress =

      true;



    this.progressError =

      '';



    this.recentWorkouts =

      [];





    this.changeDetector

      .detectChanges();





    this.loadWorkoutPage(

      token,

      0,

      [],

    );



  }





  private loadWorkoutPage(

    token: string,

    offset: number,

    collectedWorkouts:

      WorkoutDetail[],

  ): void {



    const limit =

      50;





    this.liftlogApi

      .getWorkoutHistory(

        token,

        limit,

        offset,

      )

      .subscribe({



        next: response => {



          const completedOnPage =

            response.items.filter(

              workout =>

                Boolean(

                  workout.finished_at,

                ),

            );





          const allCompletedWorkouts = [

            ...collectedWorkouts,

            ...completedOnPage,

          ];





          /*

           * If backend has more history,

           * continue loading it.

           */

          if (

            response.has_more

          ) {



            this.loadWorkoutPage(

              token,

              offset +

                response.limit,

              allCompletedWorkouts,

            );



            return;



          }





          /*

           * We now have every completed workout.

           */

          allCompletedWorkouts.sort(

            (

              first,

              second,

            ) =>

              this.workoutTimestamp(

                second,

              ) -

              this.workoutTimestamp(

                first,

              ),

          );





          this.applyWorkoutData(

            allCompletedWorkouts,

          );





          localStorage.removeItem(

            this.WORKOUTS_CHANGED_KEY,

          );





          this.isLoadingProgress =

            false;





          this.changeDetector

            .detectChanges();



        },





        error: error => {



          console.error(

            'Unable to load workout progress:',

            error,

          );





          this.resetWorkoutProgress();





          this.progressError =

            'Could not load workout progress.';





          this.isLoadingProgress =

            false;





          this.changeDetector

            .detectChanges();



        },



      });



  }





  private applyWorkoutData(

    completedWorkouts:

      WorkoutDetail[],

  ): void {



    /*

     * CONDITION 1:

     *

     * User has NEVER completed a workout.

     *

     * Progress = zero

     * Recent Activity = empty state

     */

    if (

      completedWorkouts.length ===

      0

    ) {



      this.resetWorkoutProgress();



      return;



    }





    /*

     * CONDITIONS 2 + 3:

     *

     * Weekly cards are calculated ONLY from

     * workouts completed during this week.

     *

     * Recent Activity uses ALL completed

     * workout history, newest first.

     */

    this.calculateWeeklyProgress(

      completedWorkouts,

    );





    this.streakDays =

      this.calculateStreak(

        completedWorkouts,

      );





    /*

     * Profile intentionally shows only 3.

     * View All handles complete history.

     */

    this.recentWorkouts =

      completedWorkouts

        .slice(

          0,

          3,

        )

        .map(

          workout =>

            this.toRecentWorkout(

              workout,

            ),

        );



  }





  private resetWorkoutProgress(): void {



    this.workoutsThisWeek =

      0;



    this.volumeThisWeek =

      0;



    this.streakDays =

      0;



    this.exercisesThisWeek =

      0;



    this.recentWorkouts =

      [];



  }





  /* =====================================================

     WEEKLY PROGRESS

  ===================================================== */



  private calculateWeeklyProgress(

    workouts:

      WorkoutDetail[],

  ): void {



    const startOfWeek =

      this.getStartOfWeek(

        new Date(),

      );





    const startOfNextWeek =

      new Date(

        startOfWeek,

      );





    startOfNextWeek.setDate(

      startOfNextWeek.getDate() +

      7,

    );





    const weeklyWorkouts =

      workouts.filter(

        workout => {



          const completedAt =

            this.getWorkoutDate(

              workout,

            );





          if (!completedAt) {

            return false;

          }





          return (

            completedAt >=

              startOfWeek &&

            completedAt <

              startOfNextWeek

          );



        },

      );





    this.workoutsThisWeek =

      weeklyWorkouts.length;





    this.volumeThisWeek =

      Math.round(

        weeklyWorkouts.reduce(

          (

            total,

            workout,

          ) =>

            total +

            this.calculateWorkoutVolume(

              workout,

            ),

          0,

        ),

      );





    this.exercisesThisWeek =

      weeklyWorkouts.reduce(

        (

          total,

          workout,

        ) =>

          total +

          workout.exercises.length,

        0,

      );



  }





  private getStartOfWeek(

    date: Date,

  ): Date {



    const result =

      new Date(

        date,

      );





    result.setHours(

      0,

      0,

      0,

      0,

    );





    const day =

      result.getDay();





    const daysSinceMonday =

      day === 0

        ? 6

        : day - 1;





    result.setDate(

      result.getDate() -

      daysSinceMonday,

    );





    return result;



  }





  /* =====================================================

     VOLUME



     volume = weight × reps

  ===================================================== */



  calculateWorkoutVolume(

    workout:

      WorkoutDetail,

  ): number {



    return workout.exercises

      .reduce(

        (

          workoutTotal,

          exercise,

        ) => {



          const exerciseVolume =

            exercise.sets.reduce(

              (

                setTotal,

                set,

              ) => {



                const weight =

                  this.safeNumber(

                    set.weight,

                  );





                const reps =

                  this.safeNumber(

                    set.reps,

                  );





                return (

                  setTotal +

                  (

                    weight *

                    reps

                  )

                );



              },

              0,

            );





          return (

            workoutTotal +

            exerciseVolume

          );



        },

        0,

      );



  }





  private safeNumber(

    value:

      number |

      null |

      undefined,

  ): number {



    const numberValue =

      Number(

        value,

      );





    return Number.isFinite(

      numberValue,

    )

      ? numberValue

      : 0;



  }





  /* =====================================================

     STREAK

  ===================================================== */



  private calculateStreak(

    workouts:

      WorkoutDetail[],

  ): number {



    const workoutDays =

      new Set<string>();





    workouts.forEach(

      workout => {



        const workoutDate =

          this.getWorkoutDate(

            workout,

          );





        if (!workoutDate) {

          return;

        }





        workoutDays.add(

          this.toLocalDateKey(

            workoutDate,

          ),

        );



      },

    );





    if (

      workoutDays.size ===

      0

    ) {

      return 0;

    }





    const today =

      this.startOfDay(

        new Date(),

      );





    const yesterday =

      new Date(

        today,

      );





    yesterday.setDate(

      yesterday.getDate() -

      1,

    );





    let cursor:

      Date;





    if (

      workoutDays.has(

        this.toLocalDateKey(

          today,

        ),

      )

    ) {



      cursor =

        new Date(

          today,

        );



    } else if (

      workoutDays.has(

        this.toLocalDateKey(

          yesterday,

        ),

      )

    ) {



      cursor =

        new Date(

          yesterday,

        );



    } else {



      return 0;



    }





    let streak =

      0;





    while (

      workoutDays.has(

        this.toLocalDateKey(

          cursor,

        ),

      )

    ) {



      streak +=

        1;





      cursor.setDate(

        cursor.getDate() -

        1,

      );



    }





    return streak;



  }





  private startOfDay(

    date: Date,

  ): Date {



    const result =

      new Date(

        date,

      );





    result.setHours(

      0,

      0,

      0,

      0,

    );





    return result;



  }





  private toLocalDateKey(

    date: Date,

  ): string {



    const year =

      date.getFullYear();





    const month =

      String(

        date.getMonth() +

        1,

      )

        .padStart(

          2,

          '0',

        );





    const day =

      String(

        date.getDate(),

      )

        .padStart(

          2,

          '0',

        );





    return (

      `${year}-${month}-${day}`

    );



  }





  /* =====================================================

     RECENT ACTIVITY

  ===================================================== */



  private toRecentWorkout(

    workout:

      WorkoutDetail,

  ): RecentWorkoutView {



    const workoutDate =

      this.getWorkoutDate(

        workout,

      );





    /*

     * workout_name was added to the backend workout

     * response. Older saved workouts may not have one,

     * so keep "Workout" as a safe fallback.

     *

     * The cast keeps this compatible until WorkoutDetail

     * is updated in liftlog-api.service.ts.

     */

    const workoutWithName =

      workout as WorkoutDetail & {

        workout_name?:

          string |

          null;

      };





    const workoutName =

      workoutWithName

        .workout_name

        ?.trim();





    return {



      workoutId:

        workout.workout_id,



      title:

        workoutName ||

        'Workout',



      dateLabel:

        workoutDate

          ? this.formatWorkoutDate(

              workoutDate,

            )

          : 'Completed',



      durationLabel:

        this.formatDuration(

          workout.duration_seconds,

        ),



      exerciseCount:

        workout.exercises.length,



      volume:

        Math.round(

          this.calculateWorkoutVolume(

            workout,

          ),

        ),



    };



  }





  private getWorkoutDate(

    workout:

      WorkoutDetail,

  ): Date | null {



    /*

     * Only completed workouts should contribute

     * to Profile.

     */

    const value =

      workout.finished_at;





    if (!value) {

      return null;

    }





    const parsed =

      new Date(

        value,

      );





    if (

      Number.isNaN(

        parsed.getTime(),

      )

    ) {

      return null;

    }





    return parsed;



  }





  private workoutTimestamp(

    workout:

      WorkoutDetail,

  ): number {



    return (

      this.getWorkoutDate(

        workout,

      )?.getTime() ||

      0

    );



  }





  private formatWorkoutDate(

    date: Date,

  ): string {



    const today =

      this.startOfDay(

        new Date(),

      );





    const workoutDay =

      this.startOfDay(

        date,

      );





    const difference =

      Math.round(

        (

          today.getTime() -

          workoutDay.getTime()

        ) /

        86_400_000,

      );





    if (

      difference ===

      0

    ) {

      return 'Today';

    }





    if (

      difference ===

      1

    ) {

      return 'Yesterday';

    }





    return new Intl.DateTimeFormat(

      'en',

      {

        month:

          'short',



        day:

          'numeric',

      },

    ).format(

      date,

    );



  }





  private formatDuration(

    durationSeconds:

      number |

      null,

  ): string {



    const seconds =

      this.safeNumber(

        durationSeconds,

      );





    if (

      seconds <=

      0

    ) {

      return '0 min';

    }





    const totalMinutes =

      Math.max(

        1,

        Math.round(

          seconds /

          60,

        ),

      );





    const hours =

      Math.floor(

        totalMinutes /

        60,

      );





    const minutes =

      totalMinutes %

      60;





    if (

      hours ===

      0

    ) {

      return (

        `${minutes} min`

      );

    }





    if (

      minutes ===

      0

    ) {

      return (

        `${hours} hr`

      );

    }





    return (

      `${hours} hr ${minutes} min`

    );



  }





  formatVolume(

    value: number,

  ): string {



    return new Intl.NumberFormat(

      'en-IN',

      {

        maximumFractionDigits:

          0,

      },

    ).format(

      value,

    );



  }





  /* =====================================================

     SETTINGS

  ===================================================== */



  openSettings(): void {



    this.showSettings =

      true;



  }





  closeSettings(): void {



    this.showSettings =

      false;



  }





  openAppearance(): void {



  this.closeSettings();



  this.router.navigate([

    '/appearance',

  ]);



}





  openAccount(): void {



    this.closeSettings();





    this.router.navigate([

      '/account',

    ]);



  }



  openSupport(): void {



  this.closeSettings();



  this.router.navigate([

    '/help-support',

  ]);



}



  openAbout(): void {



    window.alert(

      'LiftLog',

    );



  }







  /* =====================================================

     BOOKINGS

  ===================================================== */



  private loadBookings(): void {



    const token =

      localStorage.getItem(

        'pulseos_access_token',

      );





    if (!token) {



      this.myBookings =

        [];



      this.bookingsError =

        'Bookings are unavailable.';



      this.isLoadingBookings =

        false;



      this.changeDetector

        .detectChanges();



      return;



    }





    this.isLoadingBookings =

      true;



    this.bookingsError =

      '';



    this.myBookings =

      [];





    this.changeDetector

      .detectChanges();





    this.liftlogApi

      .getBookings(

        token,

      )

      .subscribe({



        next: bookings => {



          const now =

            Date.now();





          this.myBookings =

            [...bookings]

              .map(

                booking =>

                  this.toMyBookingView(

                    booking,

                  ),

              )

              .sort(

                (

                  first,

                  second,

                ) => {



                  const firstUpcoming =

                    first.timestamp >=

                    now;



                  const secondUpcoming =

                    second.timestamp >=

                    now;





                  if (

                    firstUpcoming !==

                    secondUpcoming

                  ) {



                    return firstUpcoming

                      ? -1

                      : 1;



                  }





                  return firstUpcoming

                    ? first.timestamp -

                      second.timestamp

                    : second.timestamp -

                      first.timestamp;



                },

              );





          this.isLoadingBookings =

            false;





          this.changeDetector

            .detectChanges();



        },





        error: error => {



          console.error(

            'Unable to load bookings:',

            error,

          );





          this.myBookings =

            [];



          this.bookingsError =

            'Could not load your bookings.';



          this.isLoadingBookings =

            false;





          this.changeDetector

            .detectChanges();



        },



      });



  }





  private toMyBookingView(

    booking:

      BookingListItem,

  ): MyBookingView {



    const timestamp =

      this.bookingTimestamp(

        booking,

      );





    const normalizedStatus =

      booking.status

        ?.trim()

        .toLowerCase() ||

      'confirmed';





    let statusLabel =

      this.capitalizeWord(

        normalizedStatus,

      );



    let statusClass =

      normalizedStatus;





    if (

      normalizedStatus ===

      'confirmed' &&

      timestamp >=

      Date.now()

    ) {



      statusLabel =

        'Upcoming';



      statusClass =

        'upcoming';



    } else if (

      normalizedStatus ===

      'confirmed'

    ) {



      statusLabel =

        'Completed';



      statusClass =

        'completed';



    }





    return {



      bookingId:

        booking.booking_id,



      gymId:

        booking.gym.gym_id,



      gymName:

        booking.gym.name,



      imageUrl:

        booking.image_url ||

        '',



      dateLabel:

        this.formatBookingDate(

          booking.date,

        ),



      timeLabel:

        (

          `${this.formatBookingTime(

            booking.start_time,

          )} – ${this.formatBookingTime(

            booking.end_time,

          )}`

        ),



      statusLabel,

      statusClass,

      timestamp,



    };



  }





  get visibleBookings():

    MyBookingView[] {



    return this.showAllBookings

      ? this.myBookings

      : this.myBookings.slice(

          0,

          2,

        );



  }





  get hasMoreBookings(): boolean {



    return (

      this.myBookings.length >

      2

    );



  }





  toggleAllBookings(): void {



    this.showAllBookings =

      !this.showAllBookings;



  }





  openBooking(

    bookingId: number,

  ): void {



    this.router.navigate([

      '/bookings',

      bookingId,

    ]);



  }





  onBookingImageError(

    bookingId:

      number,

  ): void {



    this.failedBookingImages.add(

      bookingId,

    );





    this.changeDetector

      .detectChanges();



  }





  private bookingTimestamp(

    booking:

      BookingListItem,

  ): number {



    const dateParts =

      booking.date

        .split(

          '-',

        )

        .map(

          Number,

        );





    const timeParts =

      booking.start_time

        .split(

          ':',

        )

        .map(

          Number,

        );





    if (

      dateParts.length !==

        3 ||

      dateParts.some(

        part =>

          !Number.isFinite(

            part,

          ),

      )

    ) {



      return 0;



    }





    const [

      year,

      month,

      day,

    ] =

      dateParts;





    const hour =

      Number.isFinite(

        timeParts[0],

      )

        ? timeParts[0]

        : 0;



    const minute =

      Number.isFinite(

        timeParts[1],

      )

        ? timeParts[1]

        : 0;





    return new Date(

      year,

      month -

        1,

      day,

      hour,

      minute,

      0,

      0,

    ).getTime();



  }





  private formatBookingDate(

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





    const date =

      new Date(

        parts[0],

        parts[1] -

          1,

        parts[2],

      );





    return new Intl.DateTimeFormat(

      'en',

      {

        weekday:

          'short',



        day:

          'numeric',



        month:

          'short',



        year:

          'numeric',

      },

    ).format(

      date,

    );



  }





  private formatBookingTime(

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





  private capitalizeWord(

    value:

      string,

  ): string {



    if (!value) {

      return '';

    }





    return (

      value

        .charAt(

          0,

        )

        .toUpperCase() +

      value.slice(

        1,

      )

    );



  }





  /* =====================================================

     NAVIGATION

  ===================================================== */



  goHome(): void {



    this.router.navigate([

      '/home',

    ]);



  }





  goToWorkouts(): void {



    this.router.navigate([

      '/dashboard',

    ]);



  }





  goToHealthify(): void {



    this.router.navigate([

      '/healthify',

    ]);



  }





  goToProfile(): void {



    /*

     * If already on Profile, explicitly refresh

     * workout data instead of doing nothing.

     */

    this.loadWorkoutProgress();



    this.loadBookings();



  }





  editProfile(): void {



    this.router.navigate([

      '/account',

    ]);



  }





  viewAllWorkouts(): void {



    this.router.navigate([

      '/workout-history',

    ]);



  }





  openRecentWorkout(

    workoutId: number,

  ): void {



    this.router.navigate([

      '/workout-history',

      workoutId,

    ]);



  }





  /* =====================================================

     LOGOUT CONFIRMATION

  ===================================================== */



  logout(): void {



    /*

     * Keep the Settings sheet open underneath

     * the confirmation dialog.

     *

     * If the user cancels, they return exactly

     * where they were.

     */

    this.showLogoutDialog =

      true;



  }





  cancelLogout(): void {



    this.showLogoutDialog =

      false;



  }





  confirmLogout(): void {



    this.showLogoutDialog =

      false;





    localStorage.removeItem(

      'pulseos_access_token',

    );





    localStorage.removeItem(

      'pulseos_refresh_token',

    );





    localStorage.removeItem(

      'pulseos_user_email',

    );





    localStorage.removeItem(

      'pulseos_user_full_name',

    );





    this.showSettings =

      false;





    this.router.navigate([

      '/login',

    ]);



  }



}