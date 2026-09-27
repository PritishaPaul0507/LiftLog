import {

  HttpClient,

  HttpHeaders,

} from '@angular/common/http';



import {

  Injectable,

} from '@angular/core';



import {

  catchError,

  forkJoin,

  map,

  Observable,

  of,

  switchMap,

} from 'rxjs';



import {

  environment,

} from '../../environments/environment';





/* =========================================================

   USER

========================================================= */



export interface UserPublic {

  id: number;

  email: string;

  full_name: string;

  auth_provider: string;

}





/* =========================================================

   AUTH

========================================================= */



export interface AuthResponse {

  access_token: string;

  refresh_token: string;

  token_type: string;

  user: UserPublic;

}





export interface SignupResponse {

  message: string;

  user: UserPublic;

}





/* =========================================================

   PROFILE

========================================================= */



export interface UserProfile {

  dob: string | null;

  height: string | null;

  weight: string | null;

  sex: string | null;



  wake_time: string | null;

  sleep_time: string | null;

  work_schedule: string | null;

  daily_activity: string | null;

  commute: string | null;

  available_training_time: string | null;



  experience: string | null;

  training_days: string | null;

  preferred_time: string | null;

  preferred_exercises: string | null;

  disliked_exercises: string | null;

  limitations: string | null;



  typical_foods: string | null;

  meals_per_day: string | null;

  eating_out_frequency: string | null;

  favorite_foods: string | null;

  favorite_snacks: string | null;

  dietary_preferences: string | null;

  cooking_constraints: string | null;



  primary_goal: string | null;

  target_weight: string | null;

  goal_description: string | null;

  lifestyle_change_tolerance: string | null;



  current_description: string | null;

  target_description: string | null;

  target_characteristics: string | null;

  inspiration_description: string | null;



  version: number;

  created_at: string;

}





export interface UpdateProfileResponse {

  message: string;

}



export interface ProfileHistoryEntry {
  value: string;
  recorded_at: string;
}


export interface ProfileHistoryResponse {
  weight: ProfileHistoryEntry[];
  height: ProfileHistoryEntry[];
  available_training_time: ProfileHistoryEntry[];
}









/* =========================================================

   GYMS

========================================================= */



export interface NearbyGym {

  gym_id: number;

  name: string;

  image_url: string | null;

  distance_km: number;

}





export interface GymSummary {

  gym_id: number;

  name: string;

  image_url: string | null;

  address: string;

  distance_km: number | null;

}





export interface GymSlot {

  slot_id: number;

  start_time: string;

  end_time: string;

  available: boolean;

}





export interface GymSlotDay {

  date: string;

  slots: GymSlot[];

}





export interface GymSlotsResponse {

  gym_id: number;

  slots: GymSlotDay[];

}





export interface GymSlotDetail {

  gym: {

    gym_id: number;

    name: string;

    address: string;

    image_url: string | null;

  };



  slot: {

    slot_id: number;

    date: string;

    start_time: string;

    end_time: string;

  };



  maps_url: string;

}





export interface GymOperatingHours {

  open: string;

  close: string;

}





export interface GymDetails {

  gym_id: number;

  name: string;

  about: string;

  address: string;



  location: {

    latitude: number;

    longitude: number;

  };



  maps_url: string;



  contact: {

    phone: string;

    email: string;

  };



  timings:

    Record<

      string,

      GymOperatingHours

    >;



  equipment: string[];

  photos: string[];

}





/* =========================================================

   BOOKINGS

========================================================= */



export interface CreateBookingRequest {

  gym_id: number;

  slot_id: number;

  date: string;

}





export interface BookingGymSummary {

  gym_id: number;

  name: string;

}





export interface BookingResponse {

  booking_id: number;

  status: string;

  gym: BookingGymSummary;

  date: string;

  start_time: string;

  end_time: string;

}





export interface BookingListItem {

  booking_id: number;

  gym: BookingGymSummary;

  date: string;

  start_time: string;

  end_time: string;

  status: string;



  /*

   * Client-side preview image.

   * The backend does not currently include it in /bookings.

   */

  image_url?: string;

}





export interface BookingDetail {

  booking_id: number;

  status: string;



  gym: {

    gym_id: number;

    name: string;

    address: string;

    maps_url: string;

    image_url?: string;

  };



  slot: {

    date: string;

    start_time: string;

    end_time: string;

  };

}





export interface CancelBookingResponse {

  booking_id: number;

  status: string;

}



/* =========================================================

   ROUTINES

========================================================= */



export interface Routine {

  id: number;

  user_id: number;

  name: string;

  created_at: string;

  updated_at: string;

}





export interface RoutineListResponse {

  routines: Routine[];

}





/* =========================================================

   LEGACY WORKOUT TYPE



   Keep this because existing workout/dashboard code may

   already depend on it.

========================================================= */



export interface Workout {

  id: number;

  user_id: number;

  status: string;

  started_at: string;

  completed_at: string | null;

}





/* =========================================================

   COMPLETED WORKOUT HISTORY

========================================================= */



export interface WorkoutSetDetail {

  set_number: number;

  weight: number | null;

  reps: number | null;

}





export interface WorkoutExerciseDetail {

  workout_exercise_id: number;

  exercise_id: number;

  exercise_name: string | null;

  sets: WorkoutSetDetail[];

}





export interface WorkoutDetail {

  workout_id: number;

  routine_id: number | null;

  started_at: string;

  finished_at: string | null;

  duration_seconds: number | null;

  exercises: WorkoutExerciseDetail[];

}





export interface WorkoutHistoryResponse {

  items: WorkoutDetail[];

  total: number;

  limit: number;

  offset: number;

  has_more: boolean;

}





/* =========================================================

   EXERCISES

========================================================= */



export interface ExerciseApiRecord {

  exercise_id: number;

  name: string;

}





/* =========================================================

   SERVICE

========================================================= */



@Injectable({

  providedIn: 'root',

})

export class LiftlogApiService {



  private readonly apiUrl =

    environment.apiBaseUrl;





  constructor(

    private readonly http:

      HttpClient,

  ) {}





  /* =====================================================

     AUTH HEADERS

  ===================================================== */



  private authHeaders(

    token: string,

  ): HttpHeaders {



    return new HttpHeaders({

      'Content-Type':

        'application/json',



      Authorization:

        `Bearer ${token}`,

    });



  }









  /* =====================================================

     API RESPONSE NORMALIZER



     The current Swagger schema shows some gym endpoints

     as "string". This keeps the FE compatible with both:

     - normal JSON object/array responses

     - JSON serialized inside a string response

  ===================================================== */



  private parseJsonResponse<T>(

    response:

      T |

      string,

  ): T {



    if (

      typeof response !==

      'string'

    ) {

      return response;

    }





    try {



      return JSON.parse(

        response,

      ) as T;



    } catch {



      throw new Error(

        'The server returned an invalid JSON response.',

      );



    }



  }



  /* =====================================================

     SIGNUP

  ===================================================== */



  signup(

    email: string,

    password: string,

  ):

    Observable<SignupResponse> {



    return this.http

      .post<SignupResponse>(

        `${this.apiUrl}/auth/signup`,

        {

          email,

          password,

        },

      );



  }





  /* =====================================================

     LOGIN

  ===================================================== */



  login(

    email: string,

    password: string,

  ):

    Observable<AuthResponse> {



    return this.http

      .post<AuthResponse>(

        `${this.apiUrl}/auth/login`,

        {

          email,

          password,

        },

      );



  }





  /* =====================================================

     CURRENT USER

  ===================================================== */



  getMe(

    token: string,

  ):

    Observable<UserPublic> {



    return this.http

      .get<UserPublic>(

        `${this.apiUrl}/auth/me`,

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      );



  }





  /* =====================================================

     PROFILE

  ===================================================== */



  getProfile(

    token: string,

  ):

    Observable<UserProfile> {



    return this.http

      .get<UserProfile>(

        `${this.apiUrl}/profile`,

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      );



  }



  getProfileHistory(

    token: string,

  ):

    Observable<ProfileHistoryResponse> {



    return this.http

      .get<ProfileHistoryResponse>(

        `${this.apiUrl}/profile/history`,

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      );



  }





  updateProfile(

    token: string,

    profile: UserProfile,

  ):

    Observable<UpdateProfileResponse> {



    /*

     * GET /profile returns version and created_at,

     * but POST /profile does not accept those fields.

     *

     * Remove them before sending the profile back.

     */

    const {

      version,

      created_at,

      ...body

    } = profile;





    return this.http

      .post<UpdateProfileResponse>(

        `${this.apiUrl}/profile`,

        body,

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      );



  }







  /* =====================================================

     LOCAL GYM PREVIEW IMAGES



     Used only when the backend does not provide image_url

     / photos yet. Once real CDN URLs exist in the DB,

     backend images automatically take priority.

  ===================================================== */



  private readonly localGymImages = [

    '/gyms/metro-muscle-house.png',

    '/gyms/prime-performance.png',

    '/gyms/third-gym.png',

    '/gyms/skyline-strength.png',

    '/gyms/gritty-powerlifting.png',

    '/gyms/mint-functional.png',

    '/gyms/crossfit-warehouse.png',

    '/gyms/luxury-wellness.png',

    '/gyms/vintage-bodybuilding.png',

  ];





  private readonly gymImageAssignments =

    new Map<number, string>();





  private namedGymImage(

    gymName:

      string,

  ): string | null {



    const normalizedName =

      gymName

        .trim()

        .toLowerCase();





    if (

      normalizedName.includes(

        'metro muscle',

      )

    ) {

      return '/gyms/metro-muscle-house.png';

    }





    if (

      normalizedName.includes(

        'prime performance',

      )

    ) {

      return '/gyms/prime-performance.png';

    }





    if (

      normalizedName.includes(

        'beast mode',

      )

    ) {

      return '/gyms/vintage-bodybuilding.png';

    }





    if (

      normalizedName.includes(

        'crossfit',

      )

    ) {

      return '/gyms/crossfit-warehouse.png';

    }





    return null;



  }





  private assignUniqueGymImages(

    gyms:

      Array<{

        gym_id: number;

        name: string;

      }>,

  ): void {



    const usedImages =

      new Set<string>();





    gyms.forEach(

      gym => {



        const namedImage =

          this.namedGymImage(

            gym.name,

          );





        if (namedImage) {



          this.gymImageAssignments.set(

            gym.gym_id,

            namedImage,

          );



          usedImages.add(

            namedImage,

          );



        }



      },

    );





    const availableImages =

      this.localGymImages.filter(

        image =>

          !usedImages.has(

            image,

          ),

      );





    let imageIndex =

      0;





    [...gyms]

      .sort(

        (

          first,

          second,

        ) =>

          first.gym_id -

          second.gym_id,

      )

      .forEach(

        gym => {



          if (

            this.gymImageAssignments.has(

              gym.gym_id,

            )

          ) {

            return;

          }





          const image =

            availableImages[

              imageIndex %

              availableImages.length

            ] ||

            this.localGymImages[

              Math.abs(

                Math.trunc(

                  gym.gym_id,

                ),

              ) %

              this.localGymImages.length

            ];





          this.gymImageAssignments.set(

            gym.gym_id,

            image,

          );





          imageIndex +=

            1;



        },

      );



  }





  private localGymImage(

    gymId: number,

    gymName = '',

  ): string {



    const assignedImage =

      this.gymImageAssignments.get(

        gymId,

      );





    if (assignedImage) {

      return assignedImage;

    }





    const namedImage =

      this.namedGymImage(

        gymName,

      );





    if (namedImage) {



      this.gymImageAssignments.set(

        gymId,

        namedImage,

      );





      return namedImage;



    }





    const fallbackImage =

      this.localGymImages[

        Math.abs(

          Math.trunc(

            gymId,

          ),

        ) %

        this.localGymImages.length

      ];





    this.gymImageAssignments.set(

      gymId,

      fallbackImage,

    );





    return fallbackImage;



  }





  private resolveGymImage(

    _gymId: number,

    _gymName: string,

    imageUrl:

      string |

      null |

      undefined,

  ): string | null {

    return imageUrl?.trim() || null;

  }



  getNearbyGyms(

    lat: number,

    lng: number,

    radius = 10,

    limit = 20,

    offset = 0,

  ):

    Observable<NearbyGym[]> {



    return this.http

      .get<

        NearbyGym[] |

        string

      >(

        `${this.apiUrl}/gyms/nearby`,

        {

          params: {

            lat:

              lat.toString(),



            lng:

              lng.toString(),



            radius:

              radius.toString(),



            limit:

              limit.toString(),



            offset:

              offset.toString(),

          },

        },

      )

      .pipe(

        map(

          response =>

            this.parseJsonResponse<

              NearbyGym[]

            >(

              response,

            ),

        ),



        map(

          gyms => {



            this.assignUniqueGymImages(

              gyms,

            );





            return gyms.map(

              gym => ({

                ...gym,



                image_url:

                  this.resolveGymImage(

                    gym.gym_id,

                    gym.name,

                    gym.image_url,

                  ),

              }),

            );



          },

        ),

      );



  }





  getGymSummary(

    gymId: number,

    lat?: number | null,

    lng?: number | null,

  ):

    Observable<GymSummary> {



    const params:

      Record<string, string> =

      {};





    if (

      lat !== null &&

      lat !== undefined &&

      Number.isFinite(

        lat,

      )

    ) {



      params['lat'] =

        lat.toString();



    }





    if (

      lng !== null &&

      lng !== undefined &&

      Number.isFinite(

        lng,

      )

    ) {



      params['lng'] =

        lng.toString();



    }





    return this.http

      .get<

        GymSummary |

        string

      >(

        `${this.apiUrl}/gyms/${gymId}`,

        {

          params,

        },

      )

      .pipe(

        map(

          response =>

            this.parseJsonResponse<

              GymSummary

            >(

              response,

            ),

        ),



        map(

          gym => ({

            ...gym,



            image_url:

              this.resolveGymImage(

                gym.gym_id,

                gym.name,

                gym.image_url,

              ),

          }),

        ),

      );



  }





  getGymSlots(

    gymId: number,

    fromDate: string,

    toDate: string,

  ):

    Observable<GymSlotsResponse> {



    return this.http

      .get<

        GymSlotsResponse |

        string

      >(

        `${this.apiUrl}/gyms/${gymId}/slots`,

        {

          params: {

            from:

              fromDate,



            to:

              toDate,

          },

        },

      )

      .pipe(

        map(

          response =>

            this.parseJsonResponse<

              GymSlotsResponse

            >(

              response,

            ),

        ),

      );



  }





  getGymSlotDetail(

    gymId: number,

    slotId: number,

  ):

    Observable<GymSlotDetail> {



    return this.http

      .get<

        GymSlotDetail |

        string

      >(

        `${this.apiUrl}/gyms/${gymId}/slots/${slotId}`,

      )

      .pipe(

        map(

          response =>

            this.parseJsonResponse<

              GymSlotDetail

            >(

              response,

            ),

        ),



        map(

          detail => ({

            ...detail,



            gym: {

              ...detail.gym,



              image_url:

                this.resolveGymImage(

                  detail.gym.gym_id,

                  detail.gym.name,

                  detail.gym.image_url,

                ),

            },

          }),

        ),

      );



  }





  getGymDetails(

    gymId: number,

  ):

    Observable<GymDetails> {

    return this.http

      .get<

        GymDetails |

        string

      >(

        `${this.apiUrl}/gyms/${gymId}/details`,

      )

      .pipe(

        map(

          response =>

            this.parseJsonResponse<

              GymDetails

            >(

              response,

            ),

        ),

      );

  }



  /* =====================================================

     BOOKINGS

  ===================================================== */



  getBookings(

    token: string,

  ):

    Observable<BookingListItem[]> {

    return this.http

      .get<

        BookingListItem[] |

        string

      >(

        `${this.apiUrl}/bookings`,

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      )

      .pipe(

        map(

          response =>

            this.parseJsonResponse<

              BookingListItem[]

            >(

              response,

            ),

        ),

        switchMap(

          bookings => {

            if (

              bookings.length ===

              0

            ) {

              return of(

                bookings,

              );

            }

            return forkJoin(

              bookings.map(

                booking =>

                  this.getGymSummary(

                    booking.gym.gym_id,

                  )

                    .pipe(

                      map(

                        gym => ({

                          ...booking,

                          image_url:

                            gym.image_url ||

                            undefined,

                        }),

                      ),

                      catchError(

                        () =>

                          of({

                            ...booking,

                            image_url:

                              booking.image_url,

                          }),

                      ),

                    ),

              ),

            );

          },

        ),

      );

  }



  createBooking(

    token: string,

    request:

      CreateBookingRequest,

  ):

    Observable<BookingResponse> {



    return this.http

      .post<

        BookingResponse |

        string

      >(

        `${this.apiUrl}/bookings`,

        request,

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      )

      .pipe(

        map(

          response =>

            this.parseJsonResponse<

              BookingResponse

            >(

              response,

            ),

        ),

      );



  }





  getBooking(

    token: string,

    bookingId: number,

  ):

    Observable<BookingDetail> {

    return this.http

      .get<

        BookingDetail |

        string

      >(

        `${this.apiUrl}/bookings/${bookingId}`,

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      )

      .pipe(

        map(

          response =>

            this.parseJsonResponse<

              BookingDetail

            >(

              response,

            ),

        ),

        switchMap(

          booking => {

            if (

              booking.gym.image_url

            ) {

              return of(

                booking,

              );

            }

            return this.getGymSummary(

              booking.gym.gym_id,

            )

              .pipe(

                map(

                  gym => ({

                    ...booking,

                    gym: {

                      ...booking.gym,

                      image_url:

                        gym.image_url ||

                        undefined,

                    },

                  }),

                ),

                catchError(

                  () =>

                    of(

                      booking,

                    ),

                ),

              );

          },

        ),

      );

  }



  cancelBooking(

    token: string,

    bookingId: number,

  ):

    Observable<CancelBookingResponse> {



    return this.http

      .delete<

        CancelBookingResponse |

        string

      >(

        `${this.apiUrl}/bookings/${bookingId}`,

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      )

      .pipe(

        map(

          response =>

            this.parseJsonResponse<

              CancelBookingResponse

            >(

              response,

            ),

        ),

      );



  }



  /* =====================================================

     ROUTINES

  ===================================================== */



  getRoutines(

    token: string,

  ):

    Observable<RoutineListResponse> {



    return this.http

      .get<RoutineListResponse>(

        `${this.apiUrl}/routines`,

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      );



  }





  createRoutine(

    token: string,

    name: string,

  ):

    Observable<Routine> {



    return this.http

      .post<Routine>(

        `${this.apiUrl}/routines`,

        {

          name,

        },

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      );



  }





  /* =====================================================

     LEGACY WORKOUT METHODS



     Leave these unchanged so existing screens continue

     compiling exactly as before.

  ===================================================== */



  getWorkouts(

    token: string,

  ):

    Observable<{

      workouts: Workout[];

    }> {



    return this.http

      .get<{

        workouts: Workout[];

      }>(

        `${this.apiUrl}/workouts`,

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      );



  }





  createWorkout(

    token: string,

  ):

    Observable<Workout> {



    return this.http

      .post<Workout>(

        `${this.apiUrl}/workouts`,

        {},

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      );



  }





  addExerciseToWorkout(

    token: string,

    workoutId: number,

    exerciseId: number,

    orderIndex = 0,

  ):

    Observable<any> {



    return this.http

      .post(

        `${this.apiUrl}/workouts/${workoutId}/exercises`,

        {

          exercise_id:

            exerciseId,



          order_index:

            orderIndex,

        },

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      );



  }





  completeWorkout(

    token: string,

    workoutId: number,

  ):

    Observable<Workout> {



    return this.http

      .post<Workout>(

        `${this.apiUrl}/workouts/${workoutId}/complete`,

        {},

        {

          headers:

            this.authHeaders(

              token,

            ),

        },

      );



  }





  /* =====================================================

     COMPLETED WORKOUT HISTORY



     Matches the current FastAPI response:



     {

       items,

       total,

       limit,

       offset,

       has_more

     }

  ===================================================== */



  getWorkoutHistory(

    token: string,

    limit = 50,

    offset = 0,

  ):

    Observable<WorkoutHistoryResponse> {



    return this.http

      .get<WorkoutHistoryResponse>(

        `${this.apiUrl}/workouts`,

        {

          headers:

            this.authHeaders(

              token,

            ),



          params: {

            limit:

              limit.toString(),



            offset:

              offset.toString(),

          },

        },

      );



  }





  /* =====================================================

     EXERCISES

  ===================================================== */



  getExercises():

    Observable<ExerciseApiRecord[]> {



    return this.http

      .get<ExerciseApiRecord[]>(

        `${this.apiUrl}/exercises`,

      );



  }



}