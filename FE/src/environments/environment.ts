export const environment = {

  production: false,

  apiBaseUrl:
    'http://localhost:8001/api/v1',


  /* =====================================================
     APP
  ===================================================== */

  appName:
    'LiftLog',

  aiCoachName:
    'LiftLog Coach',


  /* =====================================================
     AI COACH
  ===================================================== */

  aiCoach: {

  /*
   * Page identifier used ONLY for the initial
   * conversation-start request.
   */
  initialPage:
    'NlPdiNtKRhoEfKCEPf',

  /*
   * Number of previous USER + COACH messages
   * sent as context on normal messages.
   */
  contextMessageLimit:
    10,

},


  /* =====================================================
     PAGE NAMES

     These values are sent to the AI Coach backend.
  ===================================================== */

  pages: {

    home:
      'home',

    dashboard:
      'workouts',

    activeWorkout:
      'active_workout',

    exercisePicker:
      'exercise_picker',

    workoutHistory:
      'workout_history',

    workoutDetail:
      'workout_detail',

    nutrition:
      'nutrition',

    foodPicker:
      'food_picker',

    profile:
      'profile',

    account:
      'account',

    gymBooking:
      'gym_booking',

    gymDetails:
      'gym_details',

    gymSlot:
      'gym_slot',

    bookingDetail:
      'booking_detail',

    helpSupport:
      'help_support',

    contactUs:
      'contact_us',

    appearance:
      'appearance',

    general:
      'general',

  },


  /* =====================================================
     GYM CONFIGURATION
  ===================================================== */

  gym: {

    radiusKm:
      100,

    pageSize:
      20,

    locationTimeoutMs:
      15000,

    locationMaximumAgeMs:
      600000,

  },

};