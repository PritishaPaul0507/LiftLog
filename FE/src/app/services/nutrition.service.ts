import {
  Injectable,
} from '@angular/core';

import {
  HttpClient,
  HttpParams,
} from '@angular/common/http';

import {
  Observable,
} from 'rxjs';

import {
  environment,
} from '../../environments/environment';


/* =========================================================
   NUTRITION
========================================================= */

export interface NutritionValues {

  calories:
    number;


  protein_g:
    number;


  carbs_g:
    number;


  fat_g:
    number;


  fiber_g:
    number;

}


/* =========================================================
   GOALS
========================================================= */

export interface NutritionGoals {

  calories:
    number;


  protein_g:
    number;


  carbs_g:
    number;


  fat_g:
    number;

}


/* =========================================================
   FOOD SEARCH
========================================================= */

export interface FoodSearchItem {

  food_id:
    number;


  name:
    string;


  nutrition_per_100g:
    NutritionValues;

}


export interface FoodSearchResponse {

  items:
    FoodSearchItem[];


  pagination: {

    page:
      number;


    page_size:
      number;


    total:
      number;

  };

}



/* =========================================================
   CUSTOM FOODS
========================================================= */

export interface CustomFood {
  custom_food_id: number;
  name: string;
  description: string;
  category: string;
  nutrition_per_100g: NutritionValues;
  is_active: boolean;
}

export interface CustomFoodRequest {
  name: string;
  description: string;
  category: string;
  nutrition_per_100g: NutritionValues;
  is_active?: boolean;
}

export interface CustomFoodResponse {
  items: CustomFood[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}


/* =========================================================
   FOOD DETAILS
========================================================= */

export interface FoodServing
extends NutritionValues {

  serving_id:
    number;


  name:
    string;


  quantity_g:
    number;

}


export interface FoodDetails {

  food_id:
    number;


  name:
    string;


  nutrition_per_100g:
    NutritionValues;


  category:
    string;


  servings:
    FoodServing[];

}


/* =========================================================
   DIET LOG REQUEST
========================================================= */

export interface DietLogRequestItem {

  food_id?:
    number |
    null;


  custom_food_id?:
    number |
    null;


  serving_id?:
    number |
    null;


  quantity_g:
    number;

}


export interface DietLogRequestMeal {

  meal_type:
    string;


  items:
    DietLogRequestItem[];

}


export interface DietLogRequest {

  date:
    string;


  meals:
    DietLogRequestMeal[];

}


/* =========================================================
   DIET LOG RESPONSE
========================================================= */

export interface DietLogItem {

  food_id:
    number |
    null;


  custom_food_id:
    number |
    null;


  serving_id:
    number |
    null;


  food_name:
    string;


  quantity_g:
    number;


  calories:
    number;


  protein_g:
    number;


  carbs_g:
    number;


  fat_g:
    number;


  fiber_g:
    number;

}


export interface DietLogMeal {

  meal_name:
    string;


  items:
    DietLogItem[];


  nutrition:
    NutritionValues;

}


export interface DietLogResponse {

  log_id:
    number;


  date:
    string;


  last_updated:
    string;


  meals:
    DietLogMeal[];

}


/* =========================================================
   SERVICE
========================================================= */

@Injectable({
  providedIn:
    'root',
})
export class NutritionService {


  /*
   * =======================================================
   * REAL FASTAPI DIET API
   *
   * :8001
   *
   * Currently used only for nutrition goals.
   * =======================================================
   */

  private readonly apiUrl =
    `${environment.apiBaseUrl}/diet`;


  


  constructor(
    private http:
      HttpClient,
  ) {}


  /* =====================================================
     GOALS

     REAL BACKEND :8001
  ===================================================== */

  getGoals():
    Observable<NutritionGoals> {

    return this.http
      .get<NutritionGoals>(

        `${this.apiUrl}/goals`,

      );

  }


  updateGoals(
    payload:
      NutritionGoals,
  ):
    Observable<NutritionGoals> {

    return this.http
      .put<NutritionGoals>(

        `${this.apiUrl}/goals`,

        payload,

      );

  }


  /* =====================================================
     GET LOG

     MOCK SERVER :8002
  ===================================================== */

  getLogs(
    date?:
      string,
  ):
    Observable<DietLogResponse> {

    let params =
      new HttpParams();


    if (
      date
    ) {

      params =
        params.set(

          'date',

          date,

        );

    }


    return this.http
      .get<DietLogResponse>(

        `${this.apiUrl}/logs`,

        {
          params,
        },

      );

  }


  /* =====================================================
     CREATE LOG

     MOCK SERVER :8002
  ===================================================== */

  createLog(
    payload:
      DietLogRequest,
  ):
    Observable<DietLogResponse> {

    return this.http
      .post<DietLogResponse>(

        `${this.apiUrl}/logs`,

        payload,

      );

  }


  /* =====================================================
     UPDATE LOG

     MOCK SERVER :8002
  ===================================================== */

  updateLog(
    logId:
      number,

    payload:
      DietLogRequest,
  ):
    Observable<DietLogResponse> {

    return this.http
      .patch<DietLogResponse>(

        `${this.apiUrl}/logs/${logId}`,

        payload,

      );

  }


  /* =====================================================
     DELETE LOG

     MOCK SERVER :8002
  ===================================================== */

  deleteLog(
    logId:
      number,
  ):
    Observable<void> {

    return this.http
      .delete<void>(

        `${this.apiUrl}/logs/${logId}`,

      );

  }


  /* =====================================================
     FOOD SEARCH

     MOCK SERVER :8002
  ===================================================== */

  searchFoods(
    search:
      string = '',

    page:
      number = 1,

    pageSize:
      number = 20,
  ):
    Observable<FoodSearchResponse> {

    let params =
      new HttpParams()
        .set(

          'page',

          String(
            page,
          ),

        )
        .set(

          'page_size',

          String(
            pageSize,
          ),

        );


    const trimmedSearch =
      search.trim();


    if (
      trimmedSearch
    ) {

      params =
        params.set(

          'search',

          trimmedSearch,

        );

    }


    return this.http
      .get<FoodSearchResponse>(

        `${this.apiUrl}/foods`,

        {
          params,
        },

      );

  }



  /* =====================================================
     CUSTOM FOODS
  ===================================================== */

  getCustomFoods(
    search: string = '',
    page: number = 1,
    pageSize: number = 20,
  ): Observable<CustomFoodResponse> {

    let params =
      new HttpParams()
        .set('page', String(page))
        .set('page_size', String(pageSize));

    const trimmedSearch =
      search.trim();

    if (trimmedSearch) {
      params =
        params.set('search', trimmedSearch);
    }

    return this.http
      .get<CustomFoodResponse>(
        `${this.apiUrl}/custom-foods`,
        { params },
      );
  }


  createCustomFood(
    payload: CustomFoodRequest,
  ): Observable<CustomFood> {

    return this.http
      .post<CustomFood>(
        `${this.apiUrl}/custom-foods`,
        payload,
      );
  }


  updateCustomFood(
    customFoodId: number,
    payload: Omit<CustomFoodRequest, 'is_active'>,
  ): Observable<CustomFood> {

    return this.http
      .patch<CustomFood>(
        `${this.apiUrl}/custom-foods/${customFoodId}`,
        payload,
      );
  }


  deleteCustomFood(
    customFoodId: number,
  ): Observable<void> {

    return this.http
      .delete<void>(
        `${this.apiUrl}/custom-foods/${customFoodId}`,
      );
  }


  /* =====================================================
     FOOD DETAILS

     MOCK SERVER :8002
  ===================================================== */

  getFoodDetails(
    foodId:
      number,
  ):
    Observable<FoodDetails> {

    return this.http
      .get<FoodDetails>(

        `${this.apiUrl}/foods/${foodId}`,

      );

  }

}