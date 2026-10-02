import {
  ChangeDetectorRef,
  Component,
  OnInit,
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
  EXDB,
} from '../../core/data/exercises-data';

import {
  ExerciseApiRecord,
  LiftlogApiService,
} from '../../services/liftlog-api.service';


/* =========================================================
   LOCAL EXERCISE METADATA
========================================================= */

interface LocalExerciseRecord {

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


/* =========================================================
   EXERCISE PICKER RECORD

   This structure is intentionally kept identical to the
   one already expected by the existing HTML and workout
   screens.
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


/* =========================================================
   COMPONENT
========================================================= */

@Component({
  selector:
    'app-exercise-picker',

  imports: [
    FormsModule,
  ],

  templateUrl:
    './exercise-picker.html',

  styleUrl:
    './exercise-picker.css',
})
export class ExercisePicker
implements OnInit {


  /* =====================================================
     SEARCH
  ===================================================== */

  searchTerm =
    '';


  /* =====================================================
     FILTERS
  ===================================================== */

  selectedEquipment =
    'All Equipment';


  selectedMuscle =
    'All Muscles';


  showEquipmentMenu =
    false;


  showMuscleMenu =
    false;


  /* =====================================================
     SELECTION
  ===================================================== */

  selectedExerciseIds =
    new Set<string>();


  /* =====================================================
     EXERCISES

     The API is now the source of truth.

     Do NOT initialise this directly with EXDB.
  ===================================================== */

  exercises:
    ExerciseRecord[] =
    [];


  /* =====================================================
     API STATE
  ===================================================== */

  exercisesLoading =
    false;


  exercisesLoadError =
    '';


  /* =====================================================
     LOCAL DISPLAY METADATA

     The backend currently returns exercise_id + name.

     EXDB is used only to preserve the current UI's:

     - body part
     - target muscle
     - equipment
     - images / metadata

     It does NOT determine which exercises are loaded.
  ===================================================== */

  private readonly localExerciseMetadata:
    LocalExerciseRecord[] =
    EXDB as LocalExerciseRecord[];


  /* =====================================================
     CONSTRUCTOR
  ===================================================== */

  constructor(
    private router:
      Router,

    private liftlogApiService:
      LiftlogApiService,

    private changeDetector:
      ChangeDetectorRef,
  ) {}


  /* =====================================================
     INIT
  ===================================================== */

  ngOnInit(): void {

    this.loadExercises();

  }


  /* =====================================================
     LOAD EXERCISES

     GET /api/v1/exercises
  ===================================================== */

  private loadExercises(): void {

    this.exercisesLoading =
      true;


    this.exercisesLoadError =
      '';


    this.liftlogApiService
      .getExercises()
      .subscribe({

        next: (
          response:
            ExerciseApiRecord[],
        ) => {

          const apiExercises =
            Array.isArray(
              response,
            )
              ? response
              : [];


          this.exercises =
            apiExercises.map(
              exercise =>
                this.mapApiExercise(
                  exercise,
                ),
            );


          this.exercisesLoading =
            false;


          console.log(
            'Exercises loaded from API:',
            this.exercises.length,
          );


          /*
           * IMPORTANT:
           *
           * The API response has updated this.exercises,
           * but the current Angular setup is not immediately
           * repainting this component.
           *
           * This forces the view to update as soon as the
           * GET /exercises request completes.
           *
           * Without this, typing in the search box triggers
           * the first repaint, which is the bug we observed.
           */
          this.changeDetector
            .detectChanges();

        },


        error: (
          error:
            HttpErrorResponse,
        ) => {

          console.error(
            'Unable to load exercises from API:',
            error,
          );


          this.exercises =
            [];


          this.exercisesLoading =
            false;


          if (
            error.status === 401
          ) {

            this.exercisesLoadError =
              'Your session could not be verified.';

          }

          else if (
            error.status === 0
          ) {

            this.exercisesLoadError =
              'Unable to connect to the LiftLog backend.';

          }

          else {

            this.exercisesLoadError =
              'Unable to load exercises.';

          }


          /*
           * Also update immediately when the API fails,
           * so the UI can show the proper empty/error state.
           */
          this.changeDetector
            .detectChanges();

        },

      });

  }


  /* =====================================================
     MAP API EXERCISE TO EXISTING UI FORMAT
  ===================================================== */

  private mapApiExercise(
    apiExercise:
      ExerciseApiRecord,
  ):
    ExerciseRecord {

    const metadata =
      this.findLocalMetadata(
        apiExercise,
      );


    return {

      /*
       * IMPORTANT:
       *
       * This ID is the actual backend exercise ID.
       *
       * That means when this exercise is eventually added
       * to a workout we retain the backend identifier.
       */
      id:
        String(
          apiExercise.exercise_id,
        ),


      /*
       * Name comes directly from backend.
       */
      n:
        apiExercise.name,


      /*
       * Remaining information comes from EXDB only because
       * GET /exercises does not currently return these.
       */
      bp:
        metadata?.bp ??
        '',


      eq:
        metadata?.eq ??
        '',


      tg:
        metadata?.tg ??
        '',


      mg:
        metadata?.mg,


      sm:
        metadata?.sm,


      st:
        metadata?.st,


      img:
        metadata?.img,


      gif:
        metadata?.gif,

    };

  }


  /* =====================================================
     LOCAL METADATA MATCHING
  ===================================================== */

  private findLocalMetadata(
    apiExercise:
      ExerciseApiRecord,
  ):
    LocalExerciseRecord |
    undefined {

    /*
     * Try ID first.
     */
    const backendId =
      String(
        apiExercise.exercise_id,
      );


    const idMatch =
      this.localExerciseMetadata
        .find(
          exercise =>
            String(
              exercise.id,
            ) ===
            backendId,
        );


    if (
      idMatch
    ) {

      return idMatch;

    }


    /*
     * If the backend and EXDB use different IDs,
     * fall back to matching by normalized name.
     */
    const backendName =
      this.normalizeText(
        apiExercise.name,
      );


    return this.localExerciseMetadata
      .find(
        exercise =>
          this.normalizeText(
            exercise.n,
          ) ===
          backendName,
      );

  }


  /* =====================================================
     TEXT NORMALIZATION
  ===================================================== */

  private normalizeText(
    value:
      string |
      null |
      undefined,
  ):
    string {

    return String(
      value ?? '',
    )
      .trim()
      .toLowerCase();

  }


  /* =====================================================
     EQUIPMENT OPTIONS
  ===================================================== */

  get equipmentOptions():
    string[] {

    const equipment =
      this.exercises
        .map(
          exercise =>
            exercise.eq,
        )
        .filter(
          value =>
            Boolean(
              value,
            ),
        );


    return [

      'All Equipment',

      ...[
        ...new Set(
          equipment,
        ),
      ].sort(),

    ];

  }


  /* =====================================================
     MUSCLE OPTIONS
  ===================================================== */

  get muscleOptions():
    string[] {

    const muscles =
      this.exercises
        .map(
          exercise =>
            exercise.tg,
        )
        .filter(
          value =>
            Boolean(
              value,
            ),
        );


    return [

      'All Muscles',

      ...[
        ...new Set(
          muscles,
        ),
      ].sort(),

    ];

  }


  /* =====================================================
     FILTERED EXERCISES
  ===================================================== */

  get filteredExercises():
    ExerciseRecord[] {

    const query =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.exercises
      .filter(
        exercise => {

          const name =
            this.normalizeText(
              exercise.n,
            );


          const bodyPart =
            this.normalizeText(
              exercise.bp,
            );


          const target =
            this.normalizeText(
              exercise.tg,
            );


          const equipment =
            this.normalizeText(
              exercise.eq,
            );


          /* =============================================
             SEARCH
          ============================================= */

          const matchesSearch =
            !query ||

            name.includes(
              query,
            ) ||

            bodyPart.includes(
              query,
            ) ||

            target.includes(
              query,
            ) ||

            equipment.includes(
              query,
            );


          /* =============================================
             EQUIPMENT FILTER
          ============================================= */

          const matchesEquipment =
            this.selectedEquipment ===
              'All Equipment' ||

            exercise.eq ===
              this.selectedEquipment;


          /* =============================================
             MUSCLE FILTER
          ============================================= */

          const matchesMuscle =
            this.selectedMuscle ===
              'All Muscles' ||

            exercise.tg ===
              this.selectedMuscle;


          return (
            matchesSearch &&
            matchesEquipment &&
            matchesMuscle
          );

        },
      );

  }


  /* =====================================================
     EXERCISE ICON
  ===================================================== */

  getExerciseEmoji(
    exercise:
      ExerciseRecord,
  ):
    string {

    const value =
      [
        exercise.n,
        exercise.bp,
        exercise.tg,
        exercise.eq,
      ]
        .map(item =>
          this.normalizeText(item),
        )
        .join(' ');

    if (
      value.includes('run') ||
      value.includes('jog') ||
      value.includes('treadmill')
    ) {
      return '🏃';
    }

    if (value.includes('walk')) {
      return '🚶';
    }

    if (
      value.includes('cycle') ||
      value.includes('cycling') ||
      value.includes('bike') ||
      value.includes('bicycle')
    ) {
      return '🚴';
    }

    if (value.includes('swim')) {
      return '🏊';
    }

    if (
      value.includes('rower') ||
      value.includes('rowing machine')
    ) {
      return '🚣';
    }

    if (
      value.includes('jump rope') ||
      value.includes('skipping')
    ) {
      return '🤸';
    }

    if (
      value.includes('leg') ||
      value.includes('quad') ||
      value.includes('hamstring') ||
      value.includes('glute') ||
      value.includes('calf') ||
      value.includes('calves') ||
      value.includes('squat') ||
      value.includes('lunge')
    ) {
      return '🦵';
    }

    if (
      value.includes('chest') ||
      value.includes('pectoral') ||
      value.includes('bench press') ||
      value.includes('push up') ||
      value.includes('push-up')
    ) {
      return '🏋️';
    }

    if (
      value.includes('back') ||
      value.includes('lat') ||
      value.includes('trapezius') ||
      value.includes('rhomboid') ||
      value.includes('pull up') ||
      value.includes('pull-up') ||
      value.includes('pulldown') ||
      value.includes('deadlift')
    ) {
      return '💪';
    }

    if (
      value.includes('shoulder') ||
      value.includes('deltoid')
    ) {
      return '🏋️';
    }

    if (
      value.includes('bicep') ||
      value.includes('tricep') ||
      value.includes('forearm') ||
      value.includes('arm') ||
      value.includes('curl')
    ) {
      return '💪';
    }

    if (
      value.includes('core') ||
      value.includes('abdominal') ||
      value.includes('abs') ||
      value.includes('oblique') ||
      value.includes('crunch') ||
      value.includes('plank')
    ) {
      return '🔥';
    }

    if (
      value.includes('full body') ||
      value.includes('full-body') ||
      value.includes('burpee') ||
      value.includes('thruster')
    ) {
      return '🏋️';
    }

    return '🏋️';
  }


  /* =====================================================
     SELECTED COUNT
  ===================================================== */

  get selectedCount():
    number {

    return this
      .selectedExerciseIds
      .size;

  }


  /* =====================================================
     IS SELECTED
  ===================================================== */

  isSelected(
    id:
      string,
  ):
    boolean {

    return this
      .selectedExerciseIds
      .has(
        id,
      );

  }


  /* =====================================================
     TOGGLE EXERCISE
  ===================================================== */

  toggleExercise(
    exercise:
      ExerciseRecord,
  ):
    void {

    if (
      this.selectedExerciseIds
        .has(
          exercise.id,
        )
    ) {

      this.selectedExerciseIds
        .delete(
          exercise.id,
        );


      return;

    }


    this.selectedExerciseIds
      .add(
        exercise.id,
      );

  }


  /* =====================================================
     EQUIPMENT MENU
  ===================================================== */

  toggleEquipmentMenu():
    void {

    this.showEquipmentMenu =
      !this.showEquipmentMenu;


    this.showMuscleMenu =
      false;

  }


  selectEquipment(
    equipment:
      string,
  ):
    void {

    this.selectedEquipment =
      equipment;


    this.showEquipmentMenu =
      false;

  }


  /* =====================================================
     MUSCLE MENU
  ===================================================== */

  toggleMuscleMenu():
    void {

    this.showMuscleMenu =
      !this.showMuscleMenu;


    this.showEquipmentMenu =
      false;

  }


  selectMuscle(
    muscle:
      string,
  ):
    void {

    this.selectedMuscle =
      muscle;


    this.showMuscleMenu =
      false;

  }


  /* =====================================================
     CANCEL
  ===================================================== */

  cancel():
    void {

    this.router.navigate([
      '/active-workout',
    ]);

  }


  /* =====================================================
     ADD SELECTED EXERCISES
  ===================================================== */

  addSelectedExercises():
    void {

    if (
      this.selectedCount ===
      0
    ) {

      return;

    }


    const selected =
      this.exercises
        .filter(
          exercise =>
            this.selectedExerciseIds
              .has(
                exercise.id,
              ),
        );


    localStorage.setItem(
      'pulseos_selected_exercises',

      JSON.stringify(
        selected,
      ),
    );


    this.router.navigate([
      '/active-workout',
    ]);

  }

}