import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { Onboarding } from './pages/onboarding/onboarding';
import { Home } from './pages/home/home';
import { Dashboard } from './pages/dashboard/dashboard';
import { ActiveWorkout } from './pages/active-workout/active-workout';
import { ExercisePicker } from './pages/exercise-picker/exercise-picker';
import { FoodPicker } from './pages/food-picker/food-picker';
import { Profile } from './pages/profile/profile';
import { Healthify } from './pages/healthify/healthify';
import { WorkoutHistory } from './pages/workout-history/workout-history';
import { WorkoutDetailPage } from './pages/workout-detail/workout-detail';
import { Account } from './pages/account/account';

import { GymBooking } from './pages/gym-booking/gym-booking';
import { GymSlot } from './pages/gym-slot/gym-slot';
import { GymDetails } from './pages/gym-details/gym-details';
import { BookingDetailPage } from './pages/booking-detail/booking-detail';

import { Appearance } from './pages/appearance/appearance';
import { HelpSupport } from './pages/help-support/help-support';
import { ContactUs } from './pages/contact-us/contact-us';

import {
  rootRedirectGuard,
} from './core/guards/root-redirect-guard';


export const routes: Routes = [

  {
    path: 'login',
    component: Login,
  },

  {
    path: 'signup',
    component: Signup,
  },

  {
    path: 'onboarding',
    component: Onboarding,
  },

  /* =====================================================
     HOME
  ===================================================== */

  {
    path: 'home',
    component: Home,
  },

  /* =====================================================
     GYMS
  ===================================================== */

  {
    path: 'gyms/:gymId/details',
    component: GymDetails,
  },

  {
    path: 'gyms/:gymId/slots/:slotId',
    component: GymSlot,
  },

  {
    path: 'gyms/:gymId',
    component: GymBooking,
  },

  /* =====================================================
     BOOKINGS
  ===================================================== */

  {
    path: 'bookings/:bookingId',
    component: BookingDetailPage,
  },

  /* =====================================================
     WORKOUTS
  ===================================================== */

  {
    path: 'dashboard',
    component: Dashboard,
  },

  {
    path: 'active-workout',
    component: ActiveWorkout,
  },

  {
    path: 'exercise-picker',
    component: ExercisePicker,
  },

  {
    path: 'workout-history',
    component: WorkoutHistory,
  },

  {
    path: 'workout-history/:workoutId',
    component: WorkoutDetailPage,
  },

  /* =====================================================
     NUTRITION
  ===================================================== */

  {
    path: 'healthify',
    component: Healthify,
  },

  {
    path: 'food-picker',
    component: FoodPicker,
  },

  /* =====================================================
     PROFILE
  ===================================================== */

  {
    path: 'profile',
    component: Profile,
  },

  {
    path: 'account',
    component: Account,
  },
  {
  path: 'appearance',
  component: Appearance,
},

{
  path: 'help-support',
  component: HelpSupport,
},

{
  path: 'contact-us',
  component: ContactUs,
},
  /* =====================================================
     DEFAULT
  ===================================================== */

  {
    path: '',
    canActivate: [
      rootRedirectGuard,
    ],
    component: Home,
  },

  /*
   * IMPORTANT:
   * Wildcard must ALWAYS remain last.
   */
  {
    path: '**',
    redirectTo: 'login',
  },

];
