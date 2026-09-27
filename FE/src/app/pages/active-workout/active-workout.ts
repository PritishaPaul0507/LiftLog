import {

  ChangeDetectorRef,

  Component,

  OnDestroy,

  OnInit,

} from '@angular/core';



import {

  FormsModule,

} from '@angular/forms';



import {

  HttpClient,

} from '@angular/common/http';



import {

  Router,

} from '@angular/router';



import {

  environment,

} from '../../../environments/environment';



import {

  ConfirmDialog,

} from '../../shared/confirm-dialog/confirm-dialog';





/* =========================================================

   EXERCISE MODELS

========================================================= */



interface ExerciseRecord {

  id: string;

  n: string;

  bp: string;

  eq: string;

  tg: string;

  mg?: string;

  sm?: string[];

  st?: string[];

  img?: string;

  gif?: string;

}





interface WorkoutSet {

  weight: number | null;

  reps: number | null;

  completed: boolean;



  previousWeight?: number | null;

  previousReps?: number | null;

}





interface WorkoutExercise {

  exercise: ExerciseRecord;

  sets: WorkoutSet[];

}





/* =========================================================

   ROUTINE API MODELS

========================================================= */



interface RoutineExerciseRequest {

  exercise_id: number;

  target_sets: number;

}





interface CreateRoutineRequest {

  name: string;

  exercises: RoutineExerciseRequest[];

}





interface RoutineExerciseResponse {

  exercise_id: number;

  name: string;

  target_sets: number | null;

  order_index: number;

}





interface CreateRoutineResponse {

  routine_id: number;

  name: string;

  exercises: RoutineExerciseResponse[];

}





interface RoutineDetailResponse {

  routine_id: number;

  name: string;

  exercises: RoutineExerciseResponse[];

}





/* =========================================================

   WORKOUT API MODELS

========================================================= */



interface WorkoutSetRequest {

  weight: number;

  reps: number;

}





interface WorkoutExerciseRequest {

  exercise_id: number;

  sets: WorkoutSetRequest[];

}





interface SaveWorkoutRequest {

  routine_id: number | null;

  workout_name: string;

  started_at: string;

  finished_at: string;

  exercises: WorkoutExerciseRequest[];

}





interface SavedWorkoutSetResponse {

  set_id: number;

  set_number: number;

  weight: number;

  reps: number;

}





interface SavedWorkoutExerciseResponse {

  workout_exercise_id: number;

  exercise_id: number;

  sets: SavedWorkoutSetResponse[];

}





interface SaveWorkoutResponse {

  workout_id: number;

  routine_id: number | null;

  workout_name: string;

  started_at: string;

  finished_at: string;

  duration_seconds: number;

  exercises: SavedWorkoutExerciseResponse[];

}





/* =========================================================

   EXERCISE HISTORY API MODELS

========================================================= */



interface ExerciseHistorySet {

  set_number: number;

  weight: number;

  reps: number;

}





interface ExerciseHistoryLastWorkout {

  workout_id: number;

  date: string;

  sets: ExerciseHistorySet[];

}





interface ExerciseHistoryResponse {

  exercise_id: number;

  exercise_name: string;



  last_workout:

    ExerciseHistoryLastWorkout | null;

}





/* =========================================================

   COMPONENT

========================================================= */



@Component({

  selector: 'app-active-workout',



  imports: [

    FormsModule,

    ConfirmDialog,

  ],



  templateUrl:

    './active-workout.html',



  styleUrl:

    './active-workout.css',

})

export class ActiveWorkout

  implements OnInit, OnDestroy {





  /* =====================================================

     WORKOUT STATE

  ===================================================== */



  elapsedSeconds = 0;



  workoutExercises:

    WorkoutExercise[] = [];





  /* =====================================================

     REMOVE EXERCISE CONFIRMATION

  ===================================================== */



  showRemoveExerciseDialog =

    false;



  pendingRemoveExerciseIndex:

    number | null =

    null;





  /* =====================================================

     DISCARD WORKOUT CONFIRMATION

  ===================================================== */



  showDiscardWorkoutDialog =

    false;





  /* =====================================================

     FINISH WORKOUT CONFIRMATION

  ===================================================== */



  showFinishWorkoutDialog =

    false;

    workoutName = '';



    workoutNameError = '';





  /* =====================================================

     ROUTINE MODAL

  ===================================================== */



  showRoutineModal = false;



  routineName = '';



  routineError = '';



  isCreatingRoutine = false;





  /* =====================================================

     FINISH

  ===================================================== */



  isFinishingWorkout = false;





  /* =====================================================

     DRAG

  ===================================================== */



  draggingExerciseIndex:

    number | null = null;



  private pendingDragIndex:

    number | null = null;



  private dragPointerId:

    number | null = null;



  private dragElement:

    HTMLElement | null = null;



  private dragTimer:

    ReturnType<typeof setTimeout> |

    undefined;



  private readonly DRAG_DELAY_MS =

    400;





  /* =====================================================

     STORAGE

  ===================================================== */



  private readonly WORKOUT_START_KEY =

    'pulseos_workout_start_time';



  private readonly SELECTED_EXERCISES_KEY =

    'pulseos_selected_exercises';



  private readonly WORKOUT_EXERCISES_KEY =

    'pulseos_workout_exercises';



  private readonly ACTIVE_ROUTINE_ID_KEY =

    'pulseos_active_routine_id';



  private readonly ROUTINES_CHANGED_KEY =

    'pulseos_routines_changed';



  private readonly LAST_CREATED_ROUTINE_KEY =

    'pulseos_last_created_routine';





  /* =====================================================

     API

  ===================================================== */



  private readonly apiBaseUrl =

    environment.apiBaseUrl;





  /* =====================================================

     TIMER

  ===================================================== */



  private timer:

    ReturnType<typeof setInterval> |

    undefined;





  /* =====================================================

     CONSTRUCTOR

  ===================================================== */



  constructor(

    private router:

      Router,



    private changeDetector:

      ChangeDetectorRef,



    private http:

      HttpClient,

  ) {}





  /* =====================================================

     INIT

  ===================================================== */



  ngOnInit(): void {



    this.initializeWorkoutTimer();



    this.loadWorkoutExercises();



    this.importSelectedExercises();



    this.loadHistoryForAllExercises();



  }





  /* =====================================================

     TIMER

  ===================================================== */



  private initializeWorkoutTimer(): void {



    let startTime =

      localStorage.getItem(

        this.WORKOUT_START_KEY,

      );





    if (!startTime) {



      startTime =

        Date.now().toString();





      localStorage.setItem(

        this.WORKOUT_START_KEY,

        startTime,

      );



    }





    this.updateElapsedTime();



    this.startTimer();



  }





  private startTimer(): void {



    this.stopTimer();





    this.timer =

      setInterval(

        () => {



          this.updateElapsedTime();



        },

        1000,

      );



  }





  private updateElapsedTime(): void {



    const storedStartTime =

      localStorage.getItem(

        this.WORKOUT_START_KEY,

      );





    if (!storedStartTime) {



      this.elapsedSeconds = 0;



      return;



    }





    const startTime =

      Number(

        storedStartTime,

      );





    if (

      Number.isNaN(

        startTime,

      )

    ) {



      this.elapsedSeconds = 0;



      return;



    }





    this.elapsedSeconds =

      Math.max(

        0,



        Math.floor(

          (

            Date.now() -

            startTime

          ) / 1000,

        ),

      );





    this.changeDetector

      .detectChanges();



  }





  get formattedDuration(): string {



    const hours =

      Math.floor(

        this.elapsedSeconds /

        3600,

      );





    const minutes =

      Math.floor(

        (

          this.elapsedSeconds %

          3600

        ) /

        60,

      );





    const seconds =

      this.elapsedSeconds %

      60;





    if (hours > 0) {



      return (

        `${hours}hr ` +

        `${minutes}min ` +

        `${seconds}s`

      );



    }





    if (minutes > 0) {



      return (

        `${minutes}min ` +

        `${seconds}s`

      );



    }





    return `${seconds}s`;



  }





  private stopTimer(): void {



    if (!this.timer) {

      return;

    }





    clearInterval(

      this.timer,

    );





    this.timer =

      undefined;



  }





  private clearWorkoutTimer(): void {



    this.stopTimer();





    localStorage.removeItem(

      this.WORKOUT_START_KEY,

    );





    this.elapsedSeconds = 0;



  }





  /* =====================================================

     LOAD WORKOUT

  ===================================================== */



  private loadWorkoutExercises(): void {



    const stored =

      localStorage.getItem(

        this.WORKOUT_EXERCISES_KEY,

      );





    if (!stored) {



      this.workoutExercises = [];



      return;



    }





    try {



      const parsed =

        JSON.parse(

          stored,

        ) as WorkoutExercise[];





      this.workoutExercises =

        parsed.map(

          item => ({



            exercise:

              item.exercise,



            sets:

              Array.isArray(

                item.sets,

              )

                ? item.sets.map(

                    set => ({



                      weight:

                        set.weight ??

                        null,



                      reps:

                        set.reps ??

                        null,



                      completed:

                        Boolean(

                          set.completed,

                        ),



                      previousWeight:

                        set.previousWeight ??

                        null,



                      previousReps:

                        set.previousReps ??

                        null,



                    }),

                  )

                : [],



          }),

        );



    } catch (error) {



      console.error(

        'Failed to load workout:',

        error,

      );





      this.workoutExercises = [];



    }



  }





  /* =====================================================

     PICKER IMPORT

  ===================================================== */



  private importSelectedExercises(): void {



    const stored =

      localStorage.getItem(

        this.SELECTED_EXERCISES_KEY,

      );





    if (!stored) {

      return;

    }





    let selectedExercises:

      ExerciseRecord[] = [];





    try {



      selectedExercises =

        JSON.parse(

          stored,

        ) as ExerciseRecord[];



    } catch (error) {



      console.error(

        'Failed to import exercises:',

        error,

      );





      localStorage.removeItem(

        this.SELECTED_EXERCISES_KEY,

      );





      return;



    }





    selectedExercises.forEach(

      exercise => {



        const incomingId =

          Number(

            exercise.id,

          );





        const exists =

          this.workoutExercises.some(

            workoutExercise =>

              Number(

                workoutExercise

                  .exercise

                  .id,

              ) === incomingId,

          );





        if (exists) {

          return;

        }





        const workoutExercise:

          WorkoutExercise = {



            exercise,



            sets: [

              {



                weight: null,



                reps: null,



                completed: false,



                previousWeight:

                  null,



                previousReps:

                  null,



              },

            ],



          };





        this.workoutExercises.push(

          workoutExercise,

        );





        this.loadExerciseHistory(

          workoutExercise,

        );



      },

    );





    this.saveWorkoutExercises();





    localStorage.removeItem(

      this.SELECTED_EXERCISES_KEY,

    );



  }





  /* =====================================================

     EXERCISE HISTORY

  ===================================================== */



  private loadHistoryForAllExercises():

    void {



    this.workoutExercises.forEach(

      workoutExercise => {



        this.loadExerciseHistory(

          workoutExercise,

        );



      },

    );



  }





  private loadExerciseHistory(

    workoutExercise:

      WorkoutExercise,

  ): void {



    const exerciseId =

      Number(

        workoutExercise

          .exercise

          .id,

      );





    if (

      !Number.isInteger(

        exerciseId,

      ) ||

      exerciseId <= 0

    ) {



      return;



    }





    this.http

      .get<ExerciseHistoryResponse>(

        `${this.apiBaseUrl}/exercises/${exerciseId}/history`,

      )

      .subscribe({



        next: response => {



          console.log(

            `Exercise ${exerciseId} history:`,

            response,

          );





          const previousSets =

            response

              .last_workout

              ?.sets ?? [];





          if (

            previousSets.length === 0

          ) {



            workoutExercise

              .sets

              .forEach(

                set => {



                  set.previousWeight =

                    null;



                  set.previousReps =

                    null;



                },

              );





            this.saveWorkoutExercises();





            this.changeDetector

              .detectChanges();





            return;



          }





          const sortedPreviousSets =

            [...previousSets]

              .sort(

                (

                  first,

                  second,

                ) =>

                  first.set_number -

                  second.set_number,

              );





          while (

            workoutExercise

              .sets

              .length <

            sortedPreviousSets.length

          ) {



            workoutExercise

              .sets

              .push({



                weight: null,



                reps: null,



                completed: false,



                previousWeight:

                  null,



                previousReps:

                  null,



              });



          }





          sortedPreviousSets.forEach(

            (

              previousSet,

              index,

            ) => {



              const currentSet =

                workoutExercise

                  .sets[index];





              if (!currentSet) {

                return;

              }





              currentSet.previousWeight =

                previousSet.weight;



              currentSet.previousReps =

                previousSet.reps;





              if (

                currentSet.weight ===

                  null ||

                currentSet.weight ===

                  undefined

              ) {



                currentSet.weight =

                  previousSet.weight;



              }





              if (

                currentSet.reps ===

                  null ||

                currentSet.reps ===

                  undefined

              ) {



                currentSet.reps =

                  previousSet.reps;



              }



            },

          );





          workoutExercise

            .sets

            .forEach(

              (

                set,

                index,

              ) => {



                if (

                  index <

                  sortedPreviousSets.length

                ) {

                  return;

                }





                set.previousWeight =

                  null;



                set.previousReps =

                  null;



              },

            );





          this.saveWorkoutExercises();





          this.changeDetector

            .detectChanges();



        },





        error: error => {



          console.error(

            `Unable to load history for exercise ${exerciseId}:`,

            error,

          );





          workoutExercise

            .sets

            .forEach(

              set => {



                set.previousWeight =

                  null;



                set.previousReps =

                  null;



              },

            );





          this.saveWorkoutExercises();





          this.changeDetector

            .detectChanges();



        },



      });



  }





  /* =====================================================

     SAVE LOCALLY

  ===================================================== */



  private saveWorkoutExercises(): void {



    localStorage.setItem(

      this.WORKOUT_EXERCISES_KEY,



      JSON.stringify(

        this.workoutExercises,

      ),

    );



  }





  updateWorkoutState(): void {



    this.saveWorkoutExercises();



  }





  /* =====================================================

     TOTAL SETS

  ===================================================== */



  get totalSets(): number {



    let total = 0;





    this.workoutExercises.forEach(

      workoutExercise => {



        workoutExercise.sets.forEach(

          set => {



            if (set.completed) {

              total++;

            }



          },

        );



      },

    );





    return total;



  }





  /* =====================================================

     TOTAL VOLUME

  ===================================================== */



  get totalVolume(): number {



    let total = 0;





    this.workoutExercises.forEach(

      workoutExercise => {



        workoutExercise.sets.forEach(

          set => {



            if (!set.completed) {

              return;

            }





            total +=

              Number(

                set.weight ?? 0,

              ) *

              Number(

                set.reps ?? 0,

              );



          },

        );



      },

    );





    return total;



  }





  /* =====================================================

     SETS

  ===================================================== */



  addSet(

    workoutExercise:

      WorkoutExercise,

  ): void {



    workoutExercise.sets.push({



      weight: null,



      reps: null,



      completed: false,



      previousWeight: null,



      previousReps: null,



    });





    this.saveWorkoutExercises();





    this.loadExerciseHistory(

      workoutExercise,

    );



  }





  toggleSetCompleted(

    workoutExercise:

      WorkoutExercise,



    set:

      WorkoutSet,

  ): void {



    set.completed =

      !set.completed;





    this.saveWorkoutExercises();



  }





  /* =====================================================

     REMOVE EXERCISE

  ===================================================== */



  removeExercise(

    index: number,

  ): void {



    if (

      index < 0 ||

      index >=

        this.workoutExercises.length

    ) {

      return;

    }





    this.pendingRemoveExerciseIndex =

      index;





    this.showRemoveExerciseDialog =

      true;



  }





  cancelRemoveExercise(): void {



    this.showRemoveExerciseDialog =

      false;





    this.pendingRemoveExerciseIndex =

      null;



  }





  confirmRemoveExercise(): void {



    const index =

      this.pendingRemoveExerciseIndex;





    if (

      index === null ||

      index < 0 ||

      index >=

        this.workoutExercises.length

    ) {



      this.cancelRemoveExercise();



      return;



    }





    this.workoutExercises.splice(

      index,

      1,

    );





    this.saveWorkoutExercises();





    this.showRemoveExerciseDialog =

      false;





    this.pendingRemoveExerciseIndex =

      null;



  }





  get pendingRemoveExerciseName():

    string {



    const index =

      this.pendingRemoveExerciseIndex;





    if (

      index === null ||

      index < 0 ||

      index >=

        this.workoutExercises.length

    ) {



      return 'this exercise';



    }





    return (

      this.workoutExercises[index]

        ?.exercise

        ?.n ||

      'this exercise'

    );



  }





  /* =====================================================

     LONG PRESS DRAG

  ===================================================== */



  onExercisePointerDown(

    event: PointerEvent,

    index: number,

  ): void {



    const target =

      event.target;





    if (

      !(target instanceof HTMLElement)

    ) {

      return;

    }





    if (

      target.closest(

        'button, input, textarea, select, a',

      )

    ) {

      return;

    }





    this.cancelPendingDrag();





    this.pendingDragIndex =

      index;



    this.dragPointerId =

      event.pointerId;





    const currentTarget =

      event.currentTarget;





    if (

      currentTarget instanceof HTMLElement

    ) {



      this.dragElement =

        currentTarget;



    } else {



      this.dragElement =

        null;



    }





    this.dragTimer =

      setTimeout(

        () => {



          if (

            this.pendingDragIndex === null

          ) {

            return;

          }





          this.draggingExerciseIndex =

            this.pendingDragIndex;





          if (

            this.dragElement &&

            this.dragPointerId !== null

          ) {



            try {



              this.dragElement

                .setPointerCapture(

                  this.dragPointerId,

                );



            } catch {



              // Pointer capture optional.



            }



          }





          this.changeDetector

            .detectChanges();



        },

        this.DRAG_DELAY_MS,

      );



  }





  onExercisePointerMove(

    event: PointerEvent,

  ): void {



    if (

      this.draggingExerciseIndex === null

    ) {

      return;

    }





    event.preventDefault();





    const cards =

      Array.from(

        document.querySelectorAll<HTMLElement>(

          '.exercise-card',

        ),

      );





    if (

      cards.length < 2

    ) {

      return;

    }





    let targetIndex =

      this.draggingExerciseIndex;





    for (

      let index = 0;

      index < cards.length;

      index++

    ) {



      const rect =

        cards[index]

          .getBoundingClientRect();





      const middle =

        rect.top +

        rect.height / 2;





      if (

        event.clientY <

        middle

      ) {



        targetIndex =

          index;



        break;



      }





      targetIndex =

        index;



    }





    if (

      targetIndex ===

      this.draggingExerciseIndex

    ) {

      return;

    }





    const oldIndex =

      this.draggingExerciseIndex;





    const moved =

      this.workoutExercises.splice(

        oldIndex,

        1,

      )[0];





    if (!moved) {

      return;

    }





    const newIndex =

      Math.min(

        targetIndex,

        this.workoutExercises.length,

      );





    this.workoutExercises.splice(

      newIndex,

      0,

      moved,

    );





    this.draggingExerciseIndex =

      newIndex;





    this.saveWorkoutExercises();





    this.changeDetector

      .detectChanges();



  }





  onExercisePointerUp(

    event: PointerEvent,

  ): void {



    this.endExerciseDrag(

      event,

    );



  }





  onExercisePointerCancel(

    event: PointerEvent,

  ): void {



    this.endExerciseDrag(

      event,

    );



  }





  private endExerciseDrag(

    event?: PointerEvent,

  ): void {



    this.cancelPendingDrag();





    if (

      this.dragElement &&

      this.dragPointerId !== null

    ) {



      try {



        if (

          this.dragElement

            .hasPointerCapture(

              this.dragPointerId,

            )

        ) {



          this.dragElement

            .releasePointerCapture(

              this.dragPointerId,

            );



        }



      } catch {



        // Nothing required.



      }



    }





    if (event) {

      event.preventDefault();

    }





    this.draggingExerciseIndex =

      null;



    this.pendingDragIndex =

      null;



    this.dragPointerId =

      null;



    this.dragElement =

      null;





    this.saveWorkoutExercises();



  }





  private cancelPendingDrag(): void {



    if (

      this.dragTimer ===

      undefined

    ) {

      return;

    }





    clearTimeout(

      this.dragTimer,

    );





    this.dragTimer =

      undefined;



  }





  /* =====================================================

     NAVIGATION

  ===================================================== */



  goBack(): void {



    this.router.navigate([

      '/dashboard',

    ]);



  }





  addExercise(): void {



    this.router.navigate([

      '/exercise-picker',

    ]);



  }





  /* =====================================================

     ROUTINE MODAL

  ===================================================== */



  addRoutine(): void {



    this.routineName = '';



    this.routineError = '';





    if (

      this.workoutExercises.length === 0

    ) {



      this.routineError =

        'Add at least one exercise first.';



    }





    this.showRoutineModal = true;



  }





  closeRoutineModal(): void {



    if (

      this.isCreatingRoutine

    ) {

      return;

    }





    this.showRoutineModal = false;



    this.routineName = '';



    this.routineError = '';



  }





  /* =====================================================

     CREATE ROUTINE

  ===================================================== */



  createRoutine(): void {



    if (

      this.isCreatingRoutine

    ) {

      return;

    }





    const name =

      this.routineName.trim();





    if (!name) {



      this.routineError =

        'Please enter a routine name.';



      return;



    }





    if (

      this.workoutExercises.length === 0

    ) {



      this.routineError =

        'Add at least one exercise before creating a routine.';



      return;



    }





    const exercises:

      RoutineExerciseRequest[] =

        this.workoutExercises.map(

          workoutExercise => ({



            exercise_id:

              Number(

                workoutExercise

                  .exercise

                  .id,

              ),



            target_sets:

              Math.max(

                1,

                workoutExercise

                  .sets

                  .length,

              ),



          }),

        );





    const invalidExercise =

      exercises.some(

        exercise =>

          !Number.isInteger(

            exercise.exercise_id,

          ) ||

          exercise.exercise_id <= 0,

      );





    if (invalidExercise) {



      this.routineError =

        'One or more exercises have an invalid exercise ID.';



      return;



    }





    const requestBody:

      CreateRoutineRequest = {



        name,



        exercises,



      };





    this.isCreatingRoutine = true;



    this.routineError = '';





    this.http

      .post<CreateRoutineResponse>(

        `${this.apiBaseUrl}/routines`,

        requestBody,

      )

      .subscribe({



        next: createdRoutine => {



          console.log(

            'Routine created:',

            createdRoutine,

          );





          localStorage.setItem(

            this.ROUTINES_CHANGED_KEY,

            'true',

          );





          this.http

            .get<RoutineDetailResponse>(

              `${this.apiBaseUrl}/routines/${createdRoutine.routine_id}`,

            )

            .subscribe({



              next: routine => {



                console.log(

                  'Created routine fetched:',

                  routine,

                );





                localStorage.setItem(

                  this.LAST_CREATED_ROUTINE_KEY,



                  JSON.stringify(

                    routine,

                  ),

                );





                this.finishRoutineCreation();



              },





              error: error => {



                console.error(

                  'Routine was created but could not be fetched:',

                  error,

                );





                this.finishRoutineCreation();



              },



            });



        },





        error: error => {



          console.error(

            'Create routine failed:',

            error,

          );





          this.isCreatingRoutine =

            false;





          if (

            error.status === 400

          ) {



            this.routineError =

              error.error?.detail ||

              'Unable to create this routine.';



            return;



          }





          if (

            error.status === 404

          ) {



            this.routineError =

              error.error?.detail ||

              'One of the selected exercises could not be found.';



            return;



          }





          if (

            error.status === 422

          ) {



            this.routineError =

              'The routine information is invalid. Please check the exercises and try again.';



            return;



          }





          if (

            error.status === 401

          ) {



            this.routineError =

              'Your session could not be authenticated. Please try again.';



            return;



          }





          this.routineError =

            'Something went wrong while creating the routine. Please try again.';



        },



      });



  }





  /* =====================================================

     ROUTINE CREATED

  ===================================================== */



  private finishRoutineCreation(): void {



    this.isCreatingRoutine = false;



    this.showRoutineModal = false;



    this.routineName = '';



    this.routineError = '';



  }





  /* =====================================================

     GET ACTIVE ROUTINE ID

  ===================================================== */



  private getActiveRoutineId():

    number | null {



    const stored =

      localStorage.getItem(

        this.ACTIVE_ROUTINE_ID_KEY,

      );





    if (!stored) {

      return null;

    }





    const routineId =

      Number(

        stored,

      );





    if (

      !Number.isInteger(

        routineId,

      ) ||

      routineId <= 0

    ) {



      return null;



    }





    return routineId;



  }





  /* =====================================================

     CLEAR WORKOUT

  ===================================================== */



  private clearWorkoutState(): void {



    this.clearWorkoutTimer();





    localStorage.removeItem(

      this.SELECTED_EXERCISES_KEY,

    );





    localStorage.removeItem(

      this.WORKOUT_EXERCISES_KEY,

    );





    localStorage.removeItem(

      this.ACTIVE_ROUTINE_ID_KEY,

    );





    this.workoutExercises = [];



  }





  /* =====================================================

     DISCARD

  ===================================================== */



  discardWorkout(): void {



    if (

      this.isFinishingWorkout

    ) {

      return;

    }





    this.showDiscardWorkoutDialog =

      true;



  }





  cancelDiscardWorkout(): void {



    this.showDiscardWorkoutDialog =

      false;



  }





  confirmDiscardWorkout(): void {



    this.showDiscardWorkoutDialog =

      false;





    this.clearWorkoutState();





    this.router.navigate([

      '/dashboard',

    ]);



  }





  /* =====================================================

     FINISH WORKOUT CONFIRMATION

  ===================================================== */



  finishWorkout(): void {



    if (

      this.isFinishingWorkout

    ) {

      return;

    }





    if (

      this.workoutExercises.length === 0

    ) {



      window.alert(

        'Add at least one exercise before finishing the workout.',

      );



      return;



    }



    if (

      this.totalSets === 0

    ) {



      window.alert(

        'Complete at least one set before finishing the workout.',

      );



      return;



    }



    this.workoutName = '';

    this.workoutNameError = '';

    this.showFinishWorkoutDialog =

      true;



  }





  continueWorkout(): void {



    if (

      this.isFinishingWorkout

    ) {

      return;

    }





    this.showFinishWorkoutDialog =

      false;



  }





  saveFinishedWorkout(): void {

    if (
      this.isFinishingWorkout
    ) {
      return;
    }


    const enteredWorkoutName =
      this.workoutName.trim();


    const activeRoutineId =
      this.getActiveRoutineId();


    /*
     * If the user entered a custom workout name,
     * use it exactly as before.
     */
    if (enteredWorkoutName) {

      this.workoutNameError =
        '';

      this.showFinishWorkoutDialog =
        false;


      this.saveWorkoutWithName(
        enteredWorkoutName,
        activeRoutineId,
      );

      return;

    }


    /*
     * Empty workouts do not have a routine to fall back to,
     * so they still require a workout name.
     */
    if (
      activeRoutineId ===
      null
    ) {

      this.workoutNameError =
        'Please enter a workout name.';

      return;

    }


    /*
     * A saved routine was used to start this workout.
     * If the user leaves the name blank, fetch the active
     * routine and use its name automatically.
     */
    this.workoutNameError =
      '';

    this.isFinishingWorkout =
      true;


    this.http
      .get<RoutineDetailResponse>(
        `${this.apiBaseUrl}/routines/${activeRoutineId}`,
      )
      .subscribe({

        next: routine => {

          const routineName =
            routine
              .name
              ?.trim() ||
            '';


          if (!routineName) {

            this.isFinishingWorkout =
              false;

            this.workoutNameError =
              'The routine name could not be found. Please enter a workout name.';


            this.changeDetector
              .detectChanges();

            return;

          }


          this.showFinishWorkoutDialog =
            false;

          this.isFinishingWorkout =
            false;


          this.saveWorkoutWithName(
            routineName,
            activeRoutineId,
          );

        },


        error: error => {

          console.error(
            'Unable to load the active routine name:',
            error,
          );


          this.isFinishingWorkout =
            false;

          this.workoutNameError =
            'The routine name could not be loaded. Please enter a workout name.';


          this.changeDetector
            .detectChanges();

        },

      });

  }


  private saveWorkoutWithName(
    workoutName: string,
    activeRoutineId: number | null,
  ): void {

    const storedStartTime =
      localStorage.getItem(
        this.WORKOUT_START_KEY,
      );


    if (!storedStartTime) {

      window.alert(
        'Workout start time could not be found.',
      );

      return;

    }


    const startTimestamp =
      Number(
        storedStartTime,
      );


    if (
      Number.isNaN(
        startTimestamp,
      )
    ) {

      window.alert(
        'Workout start time is invalid.',
      );

      return;

    }


    const exercises:
      WorkoutExerciseRequest[] =
        this.workoutExercises
          .map(
            workoutExercise => ({

              exercise_id:
                Number(
                  workoutExercise
                    .exercise
                    .id,
                ),

              sets:
                workoutExercise
                  .sets
                  .filter(
                    set =>
                      set.completed,
                  )
                  .map(
                    set => ({

                      weight:
                        Number(
                          set.weight ?? 0,
                        ),

                      reps:
                        Number(
                          set.reps ?? 0,
                        ),

                    }),
                  ),

            }),
          )
          .filter(
            exercise =>
              exercise.sets.length > 0,
          );


    if (
      exercises.length === 0
    ) {

      window.alert(
        'Complete at least one set before finishing the workout.',
      );

      return;

    }


    const invalidExercise =
      exercises.some(
        exercise =>
          !Number.isInteger(
            exercise.exercise_id,
          ) ||
          exercise.exercise_id <= 0,
      );


    if (invalidExercise) {

      window.alert(
        'One or more exercises have an invalid exercise ID.',
      );

      return;

    }


    const requestBody:
      SaveWorkoutRequest = {

        routine_id:
          activeRoutineId,

        workout_name:
          workoutName,

        started_at:
          new Date(
            startTimestamp,
          ).toISOString(),

        finished_at:
          new Date()
            .toISOString(),

        exercises,

      };


    console.log(
      'Saving workout:',
      requestBody,
    );


    this.isFinishingWorkout =
      true;


    this.http
      .post<SaveWorkoutResponse>(
        `${this.apiBaseUrl}/workouts`,
        requestBody,
      )
      .subscribe({

        next: response => {

          console.log(
            'Workout saved:',
            response,
          );


          this.isFinishingWorkout =
            false;


          localStorage.setItem(
            'pulseos_workouts_changed',
            'true',
          );


          this.clearWorkoutState();


          this.router.navigate([
            '/dashboard',
          ]);

        },


        error: error => {

          console.error(
            'Save workout failed:',
            error,
          );


          this.isFinishingWorkout =
            false;


          if (
            error.status === 400
          ) {

            window.alert(
              error.error?.detail ||
              'Unable to save this workout.',
            );

            return;

          }


          if (
            error.status === 404
          ) {

            window.alert(
              error.error?.detail ||
              'One of the exercises or the selected routine could not be found.',
            );

            return;

          }


          if (
            error.status === 401
          ) {

            window.alert(
              'Your session could not be authenticated. Please try again.',
            );

            return;

          }


          if (
            error.status === 422
          ) {

            console.error(
              'Workout validation response:',
              error.error,
            );


            window.alert(
              'The workout information is invalid. Please check your sets and try again.',
            );

            return;

          }


          window.alert(
            'Unable to save the workout. Please try again.',
          );

        },

      });

  }


  /* =====================================================

     DESTROY

  ===================================================== */



  ngOnDestroy(): void {



    this.cancelPendingDrag();



    this.stopTimer();



  }



}