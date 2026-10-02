import {

  ChangeDetectorRef,

  Component,

  NgZone,

  OnInit,

} from '@angular/core';

import {

  FormsModule,

} from '@angular/forms';

import {

  HttpErrorResponse,

} from '@angular/common/http';

import {

  ActivatedRoute,

  Router,

} from '@angular/router';

import {

  finalize,

} from 'rxjs';

import {

  CustomFood,
  CustomFoodRequest,
  DietLogItem,

  DietLogRequest,

  DietLogRequestItem,

  DietLogResponse,

  FoodDetails,

  FoodSearchItem,

  FoodServing,

  NutritionService,

} from '../../services/nutrition.service';

@Component({

  selector: 'app-food-picker',

  imports: [

    FormsModule,

  ],

  templateUrl:

    './food-picker.html',

  styleUrl:

    './food-picker.css',

})

export class FoodPicker

implements OnInit {

  /* =====================================================

     MEAL

  ===================================================== */

  mealName =

    'Meal';

  selectedDate =
    '';

  /* =====================================================

     FOOD SEARCH

  ===================================================== */

  searchTerm =

    '';

  foods:

    FoodSearchItem[] =

    [];

  isLoading =

    false;

  loadError =

    '';

  page =

    1;

  readonly pageSize =

    20;

  totalFoods =

    0;

  /* =====================================================
     LIVE SEARCH / CUSTOM FOODS
  ===================================================== */

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  customFoods: CustomFood[] = [];
  customFoodsLoading = false;
  customFoodsError = '';

  selectedCustomFoodId: number | null = null;

  showCustomFoodModal = false;
  isCreatingCustomFood = false;
  customFoodError = '';

  customFoodForm = {
    name: '',
    description: '',
    category: '',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
  };

  /* =====================================================

     FOOD DETAILS

  ===================================================== */

  selectedFood:

    FoodDetails | null =

    null;

  selectedServing:

    FoodServing | null =

    null;

  quantityGrams =

    100;

  readonly quantityStep =

    10;

  readonly minimumQuantity =

    1;

  isLoadingDetails =

    false;

  detailsError =

    '';

  /* =====================================================

     CURRENT DIET LOG

  ===================================================== */

  currentLog:

    DietLogResponse | null =

    null;

  /* =====================================================

     SAVE

  ===================================================== */

  isSaving =

    false;

  saveError =

    '';

  /* =====================================================

     CONSTRUCTOR

  ===================================================== */

  constructor(

    private route:

      ActivatedRoute,

    private router:

      Router,

    private nutritionService:

      NutritionService,

    private changeDetector:

      ChangeDetectorRef,

    private zone:

      NgZone,

  ) {}

  /* =====================================================

     INIT

  ===================================================== */

  ngOnInit(): void {

    this.readMealFromRoute();

    this.loadCurrentLog();

    this.loadFoods();

    this.loadCustomFoods();

  }

  /* =====================================================

     ROUTE

  ===================================================== */

  private readMealFromRoute(): void {

    const meal =
      this.route.snapshot
        .queryParamMap
        .get(
          'meal',
        );

    if (
      meal &&
      meal.trim()
    ) {
      this.mealName =
        meal.trim();
    }

    const requestedDate =
      this.route.snapshot
        .queryParamMap
        .get(
          'date',
        );

    this.selectedDate =
      this.isValidSelectableDate(
        requestedDate,
      )
        ? requestedDate
        : this.todayApiDate;

  }

  /* =====================================================

     DATE

  ===================================================== */

  private get todayApiDate():

    string {

    const today =

      new Date();

    const year =

      today.getFullYear();

    const month =

      String(

        today.getMonth() + 1,

      )

        .padStart(

          2,

          '0',

        );

    const day =

      String(

        today.getDate(),

      )

        .padStart(

          2,

          '0',

        );

    return `${year}-${month}-${day}`;

  }

  private isValidSelectableDate(
    value:
      string | null,
  ): value is string {

    if (
      !value ||
      !/^\d{4}-\d{2}-\d{2}$/.test(
        value,
      )
    ) {
      return false;
    }

    return (
      value <=
      this.todayApiDate
    );

  }

  /* =====================================================

     CURRENT LOG

  ===================================================== */

  private loadCurrentLog(): void {

    this.nutritionService

      .getLogs(

        (this.selectedDate || this.todayApiDate),

      )

      .subscribe({

        next: (

          response:

            DietLogResponse,

        ) => {

          this.zone.run(

            () => {

              this.currentLog =

                response;

              this.changeDetector

                .detectChanges();

            },

          );

        },

        error: (

          error:

            HttpErrorResponse,

        ) => {

          /*

           * 404 simply means there is no diet log

           * for today yet.

           */

          if (

            error.status === 404

          ) {

            this.zone.run(

              () => {

                this.currentLog =

                  null;

                this.changeDetector

                  .detectChanges();

              },

            );

            return;

          }

          console.error(

            'Unable to load current diet log:',

            error,

          );

        },

      });

  }

  /* =====================================================

     LOAD FOODS

  ===================================================== */

  private loadFoods(): void {

    this.isLoading =

      true;

    this.loadError =

      '';

    this.foods =

      [];

    this.totalFoods =

      0;

    console.log(

      'Loading foods...',

      {

        search:

          this.searchTerm,

        page:

          this.page,

        pageSize:

          this.pageSize,

      },

    );

    this.nutritionService

      .searchFoods(

        this.searchTerm,

        this.page,

        this.pageSize,

      )

      .pipe(

        finalize(

          () => {

            this.zone.run(

              () => {

                this.isLoading =

                  false;

                this.changeDetector

                  .detectChanges();

              },

            );

          },

        ),

      )

      .subscribe({

        next: (

          response,

        ) => {

          console.log(

            'Food API response:',

            response,

          );

          this.zone.run(

            () => {

              if (

                !response ||

                !Array.isArray(

                  response.items,

                )

              ) {

                console.error(

                  'Invalid food API response:',

                  response,

                );

                this.foods =

                  [];

                this.totalFoods =

                  0;

                this.loadError =

                  'The food API returned an invalid response.';

                this.changeDetector

                  .detectChanges();

                return;

              }

              this.foods =

                response.items;

              this.totalFoods =

                Number(

                  response.pagination

                    ?.total ??

                  response.items.length,

                );

              console.log(

                'Foods loaded:',

                this.foods.length,

              );

              this.changeDetector

                .detectChanges();

            },

          );

        },

        error: (

          error:

            unknown,

        ) => {

          console.error(

            'Unable to load foods:',

            error,

          );

          this.zone.run(

            () => {

              this.foods =

                [];

              this.totalFoods =

                0;

              this.loadError =

                'Unable to load foods right now.';

              this.changeDetector

                .detectChanges();

            },

          );

        },

      });

  }

  /* =====================================================
     LIVE SEARCH
  ===================================================== */

  onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.page = 1;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(
      () => {
        this.loadFoods();
        this.loadCustomFoods();
      },
      350,
    );
  }


  foodIcon(name: string, category: string = ''): string {
    const value = `${name} ${category}`.toLowerCase();

    const icons: Array<[string[], string]> = [
      [['rice', 'pulao', 'biryani', 'grain'], '🍚'],
      [['egg'], '🥚'],
      [['banana'], '🍌'],
      [['apple'], '🍎'],
      [['orange', 'citrus'], '🍊'],
      [['mango'], '🥭'],
      [['grape'], '🍇'],
      [['watermelon'], '🍉'],
      [['strawberry', 'berry'], '🍓'],
      [['broccoli'], '🥦'],
      [['carrot'], '🥕'],
      [['potato'], '🥔'],
      [['tomato'], '🍅'],
      [['corn'], '🌽'],
      [['chicken', 'poultry'], '🍗'],
      [['fish', 'salmon', 'tuna'], '🐟'],
      [['milk', 'dairy', 'yogurt', 'curd'], '🥛'],
      [['cheese', 'paneer'], '🧀'],
      [['bread', 'toast'], '🍞'],
      [['oat', 'cereal'], '🥣'],
      [['peanut', 'almond', 'nut'], '🥜'],
      [['coffee'], '☕'],
      [['tea'], '🍵'],
    ];

    for (const [words, icon] of icons) {
      if (words.some(word => value.includes(word))) {
        return icon;
      }
    }

    return '🍽️';
  }


  /* =====================================================
     CUSTOM FOODS
  ===================================================== */

  private loadCustomFoods(): void {
    this.customFoodsLoading = true;
    this.customFoodsError = '';

    this.nutritionService
      .getCustomFoods(this.searchTerm, 1, 20)
      .pipe(
        finalize(() => {
          this.zone.run(() => {
            this.customFoodsLoading = false;
            this.changeDetector.detectChanges();
          });
        }),
      )
      .subscribe({
        next: response => {
          this.zone.run(() => {
            this.customFoods =
              Array.isArray(response?.items)
                ? response.items
                : [];
            this.changeDetector.detectChanges();
          });
        },

        error: error => {
          console.error('Unable to load custom foods:', error);

          this.zone.run(() => {
            this.customFoods = [];
            this.customFoodsError =
              'Unable to load your custom foods.';
            this.changeDetector.detectChanges();
          });
        },
      });
  }


  selectCustomFood(food: CustomFood): void {
    this.selectedCustomFoodId = food.custom_food_id;
    this.selectedServing = null;
    this.quantityGrams = 100;
    this.detailsError = '';
    this.saveError = '';

    this.selectedFood = {
      food_id: 0,
      name: food.name,
      category: food.category || 'Custom food',
      nutrition_per_100g: food.nutrition_per_100g,
      servings: [],
    };
  }


  openCustomFoodModal(): void {
    this.customFoodError = '';

    this.customFoodForm = {
      name: '',
      description: '',
      category: '',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
    };

    this.showCustomFoodModal = true;
  }


  closeCustomFoodModal(): void {
    if (this.isCreatingCustomFood) {
      return;
    }

    this.showCustomFoodModal = false;
    this.customFoodError = '';
  }


  createCustomFood(): void {
    const name = this.customFoodForm.name.trim();

    if (!name || this.isCreatingCustomFood) {
      this.customFoodError = 'Food name is required.';
      return;
    }

    const payload: CustomFoodRequest = {
      name,
      description: this.customFoodForm.description.trim(),
      category: this.customFoodForm.category.trim(),
      nutrition_per_100g: {
        calories: this.safeNumber(this.customFoodForm.calories),
        protein_g: this.safeNumber(this.customFoodForm.protein_g),
        carbs_g: this.safeNumber(this.customFoodForm.carbs_g),
        fat_g: this.safeNumber(this.customFoodForm.fat_g),
        fiber_g: this.safeNumber(this.customFoodForm.fiber_g),
      },
      is_active: true,
    };

    this.isCreatingCustomFood = true;
    this.customFoodError = '';

    this.nutritionService
      .createCustomFood(payload)
      .pipe(
        finalize(() => {
          this.zone.run(() => {
            this.isCreatingCustomFood = false;
            this.changeDetector.detectChanges();
          });
        }),
      )
      .subscribe({
        next: created => {
          this.zone.run(() => {
            this.showCustomFoodModal = false;
            this.customFoods = [
              created,
              ...this.customFoods.filter(
                item =>
                  item.custom_food_id !== created.custom_food_id,
              ),
            ];
            this.changeDetector.detectChanges();
          });
        },

        error: (error: HttpErrorResponse) => {
          console.error('Unable to create custom food:', error);

          this.zone.run(() => {
            this.customFoodError =
              error.status === 422
                ? 'Please check the food details and nutrition values.'
                : 'Unable to create custom food right now.';
            this.changeDetector.detectChanges();
          });
        },
      });
  }



  /* =====================================================

     SEARCH

  ===================================================== */

  searchFoods(): void {

    this.page =

      1;

    this.selectedFood =

      null;

    this.selectedServing =

      null;

    this.quantityGrams =

      100;

    this.loadFoods();

    this.loadCustomFoods();

  }

  clearSearch(): void {

    this.searchTerm =

      '';

    this.page =

      1;

    this.selectedFood =

      null;

    this.selectedServing =

      null;

    this.quantityGrams =

      100;

    this.loadFoods();

    this.loadCustomFoods();

  }

  /* =====================================================

     PAGINATION

  ===================================================== */

  get canGoPrevious():

    boolean {

    return (

      this.page >

      1

    );

  }

  get canGoNext():

    boolean {

    return (

      this.page *

      this.pageSize

    ) < this.totalFoods;

  }

  previousPage(): void {

    if (

      !this.canGoPrevious ||

      this.isLoading

    ) {

      return;

    }

    this.page -=

      1;

    this.loadFoods();

  }

  nextPage(): void {

    if (

      !this.canGoNext ||

      this.isLoading

    ) {

      return;

    }

    this.page +=

      1;

    this.loadFoods();

  }

  /* =====================================================

     FOOD DETAILS

  ===================================================== */

  selectFood(

    food:

      FoodSearchItem,

  ): void {

    this.selectedCustomFoodId =
      null;

    if (

      this.isLoadingDetails

    ) {

      return;

    }

    this.isLoadingDetails =

      true;

    this.detailsError =

      '';

    this.saveError =

      '';

    this.selectedFood =

      null;

    this.selectedServing =

      null;

    this.quantityGrams =

      100;

    console.log(

      'Loading food details:',

      food.food_id,

    );

    this.nutritionService

      .getFoodDetails(

        food.food_id,

      )

      .pipe(

        finalize(

          () => {

            this.zone.run(

              () => {

                this.isLoadingDetails =

                  false;

                this.changeDetector

                  .detectChanges();

              },

            );

          },

        ),

      )

      .subscribe({

        next: (

          response:

            FoodDetails,

        ) => {

          console.log(

            'Food details response:',

            response,

          );

          this.zone.run(

            () => {

              this.selectedFood =

                response;

              /*

               * If the API has exactly one real serving,

               * select it automatically and synchronize

               * the gram quantity with that serving.

               *

               * If there are no servings, quantityGrams

               * remains at the universal 100g default.

               */

              if (

                Array.isArray(

                  response.servings,

                ) &&

                response.servings.length ===

                  1

              ) {

                this.selectedServing =

                  response.servings[0];

                const servingQuantity =

                  this.safeNumber(

                    response.servings[0]

                      .quantity_g,

                  );

                this.quantityGrams =

                  servingQuantity >=

                  this.minimumQuantity

                    ? servingQuantity

                    : 100;

              }

              this.changeDetector

                .detectChanges();

            },

          );

        },

        error: (

          error:

            unknown,

        ) => {

          console.error(

            'Unable to load food details:',

            error,

          );

          this.zone.run(

            () => {

              this.detailsError =

                'Unable to load this food.';

              this.changeDetector

                .detectChanges();

            },

          );

        },

      });

  }

  backToFoods(): void {

    this.selectedCustomFoodId = null;

    this.selectedFood =

      null;

    this.selectedServing =

      null;

    this.quantityGrams =

      100;

    this.detailsError =

      '';

    this.saveError =

      '';

  }

    /* =====================================================

     QUANTITY / SERVING

  ===================================================== */

  decreaseQuantity(): void {

    const current =

      this.safeNumber(

        this.quantityGrams,

      );

    this.quantityGrams =

      Math.max(

        this.minimumQuantity,

        current -

          this.quantityStep,

      );

    /*

     * Quantity was changed manually.

     *

     * Re-evaluate whether the new gram amount exactly

     * matches one of this food's predefined servings*.*

     */

    this.syncServingWithQuantity();

    this.saveError =

      '';

  }

  increaseQuantity(): void {

    const current =

      this.safeNumber(

        this.quantityGrams,

      );

    this.quantityGrams =

      Math.max(

        this.minimumQuantity,

        current +

          this.quantityStep,

      );

    /*

     * Quantity was changed manually.

     *

     * If the new quantity no longer matches the selected

     * serving, the serving will automatically be cleared.

     */

    this.syncServingWithQuantity();

    this.saveError =

      '';

  }

  onQuantityChange(): void {

    const quantity =

      this.safeNumber(

        this.quantityGrams,

      );

    if (

      quantity <

      this.minimumQuantity

    ) {

      this.quantityGrams =

        this.minimumQuantity;

    }

    else {

      this.quantityGrams =

        quantity;

    }

    /*

     * The user typed a gram amount manually.

     *

     * Only keep/highlight a predefined serving if its

     * quantity exactly matches the entered grams.

     */

    this.syncServingWithQuantity();

    this.saveError =

      '';

  }

  selectServing(

    serving:

      FoodServing,

  ): void {

    /*

     * Clicking a predefined serving selects it and

     * synchronizes the manual gram quantity.

     */

    this.selectedServing =

      serving;

    const servingQuantity =

      this.safeNumber(

        serving.quantity_g,

      );

    this.quantityGrams =

      servingQuantity >=

      this.minimumQuantity

        ? servingQuantity

        : 100;

    this.saveError =

      '';

  }

  isServingSelected(

    serving:

      FoodServing,

  ): boolean {

    /*

     * A serving is selected only when:

     *

     * 1. selectedServing points to this serving

     * 2. the current gram quantity still exactly matches

     *    the serving quantity

     *

     * This prevents a 138g serving from remaining visually

     * selected after the user changes quantity to 148g,

     * 168g, etc.

     */

    return (

      this.selectedServing

        ?.serving_id ===

        serving.serving_id &&

      this.safeNumber(

        this.quantityGrams,

      ) ===

      this.safeNumber(

        serving.quantity_g,

      )

    );

  }

  private syncServingWithQuantity(): void {

    /*

     * Foods without predefined servings simply use the

     * universal gram quantity control.

     */

    if (

      !this.selectedFood ||

      !Array.isArray(

        this.selectedFood.servings,

      ) ||

      this.selectedFood.servings.length === 0

    ) {

      this.selectedServing =

        null;

      return;

    }

    const currentQuantity =

      this.safeNumber(

        this.quantityGrams,

      );

    /*

     * Find a predefined serving whose gram quantity

     * exactly matches the current manually selected amount.

     */

    const matchingServing =

      this.selectedFood.servings.find(

        serving =>

          this.safeNumber(

            serving.quantity_g,

          ) ===

          currentQuantity,

      );

    /*

     * Exact match:

     * automatically select/highlight that serving.

     *

     * No match:

     * clear the serving because the user is now using

     * a custom gram amount.

     */

    this.selectedServing =

      matchingServing ??

      null;

  }

  /* =====================================================

     ADD FOOD

  ===================================================== */

  addSelectedFood(): void {

    if (

      !this.selectedFood ||

      this.isSaving

    ) {

      return;

    }

    const quantity =

      Math.max(

        this.minimumQuantity,

        this.safeNumber(

          this.quantityGrams,

        ),

      );

    this.quantityGrams =

      quantity;

    this.isSaving =

      true;

    this.saveError =

      '';

    /*

     * serving_id may legitimately be null.

     *

     * This allows foods without a FoodServing row to

     * still be logged using an explicit gram quantity.

     */

    const newItem:

      DietLogRequestItem = {

      food_id:
        this.selectedCustomFoodId === null
          ? this.selectedFood.food_id
          : null,
      custom_food_id:
        this.selectedCustomFoodId,

      serving_id:

        this.selectedServing

          ?.serving_id ??

        null,

      quantity_g:

        quantity,

    };

    const payload =

      this.buildDietLogPayload(

        newItem,

      );

    console.log(

      'Saving diet log:',

      payload,

    );

    /*

     * Existing daily log:

     * PATCH it.

     */

    if (

      this.currentLog

    ) {

      this.nutritionService

        .updateLog(

          this.currentLog.log_id,

          payload,

        )

        .subscribe({

          next: (

            response:

              DietLogResponse,

          ) => {

            this.handleSaveSuccess(

              response,

            );

          },

          error: (

            error:

              HttpErrorResponse,

          ) => {

            this.handleSaveError(

              error,

            );

          },

        });

      return;

    }

    /*

     * No log for today:

     * POST/create it.

     */

    this.nutritionService

      .createLog(

        payload,

      )

      .subscribe({

        next: (

          response:

            DietLogResponse,

        ) => {

          this.handleSaveSuccess(

            response,

          );

        },

        error: (

          error:

            HttpErrorResponse,

        ) => {

          this.handleSaveError(

            error,

          );

        },

      });

  }

  /* =====================================================

     BUILD LOG PAYLOAD

  ===================================================== */

  private buildDietLogPayload(

    newItem:

      DietLogRequestItem,

  ):

    DietLogRequest {

    const existingMeals =

      this.currentLog

        ?.meals ??

      [];

    /*

     * PATCH replaces the entire meals array,

     * so preserve every existing food.

     */

    const meals =

      existingMeals.map(

        meal => ({

          meal_type:

          this.getBackendMealType(

            meal.meal_name,

          ),

          items:

            meal.items.map(

              item =>

                this.convertExistingItem(

                  item,

                ),

            ),

        }),

      );

    const selectedMealName =

    this.getBackendMealType(

      this.mealName,

    );

    const existingMeal =

      meals.find(

        meal =>

          this.getBackendMealType(

          meal.meal_type,

        ) ===

        selectedMealName,

      );

    if (

      existingMeal

    ) {

      existingMeal.items.push(

        newItem,

      );

    }

    else {

      meals.push({

        meal_type:

        selectedMealName,

        items: [

          newItem,

        ],

      });

    }

    return {

      date:

        (this.selectedDate || this.todayApiDate),

      meals,

    };

  }

  /* =====================================================

     EXISTING ITEM → REQUEST ITEM

  ===================================================== */

  private convertExistingItem(

    item:

      DietLogItem,

  ):

    DietLogRequestItem {

    return {

      food_id:

        item.food_id,

      custom_food_id:

        item.custom_food_id,

      serving_id:

        item.serving_id,

      quantity_g:

        this.safeNumber(

          item.quantity_g,

        ),

    };

  }

  /* =====================================================

     HELPERS

  ===================================================== */

  private normalizeMealName(

    value:

      string,

  ):

    string {

    return String(

      value ??

      '',

    )

      .trim()

      .toLowerCase()

      .replace(

        /[****\\\\\\\_****-]+/g,

        ' ',

      );

  }

  private getBackendMealType(

    value:

      string,

  ):

    string {

    const normalized =

      this.normalizeMealName(

        value,

      );

    switch (

      normalized

    ) {

      case 'breakfast':

        return 'breakfast';

      case 'lunch':

        return 'lunch';

      case 'dinner':

        return 'dinner';

      case 'morning snack':

      case 'evening snack':

      case 'snack':

        return 'snack';

      default:

        return 'other';

    }

  }

  private safeNumber(

    value:

      unknown,

  ):

    number {

    const parsed =

      Number(

        value,

      );

    return Number.isFinite(

      parsed,

    )

      ? parsed

      : 0;

  }

  /* =====================================================

     SAVE SUCCESS

  ===================================================== */

  private get snackSectionStorageKey(): string {
    return `pulseos_snack_sections_${this.selectedDate || this.todayApiDate}`;
  }

  private rememberSnackSection(): void {
    const normalizedMeal = this.normalizeMealName(this.mealName);

    if (
      normalizedMeal !== 'morning snack' &&
      normalizedMeal !== 'evening snack'
    ) {
      return;
    }

    const section: 'morning' | 'evening' =
      normalizedMeal === 'evening snack'
        ? 'evening'
        : 'morning';

    let assignments: Array<'morning' | 'evening'> = [];

    try {
      const raw = localStorage.getItem(this.snackSectionStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];

      assignments = Array.isArray(parsed)
        ? parsed.filter(
            value => value === 'morning' || value === 'evening',
          )
        : [];
    }
    catch {
      assignments = [];
    }

    assignments.push(section);

    localStorage.setItem(
      this.snackSectionStorageKey,
      JSON.stringify(assignments),
    );
  }

  private handleSaveSuccess(

    response:

      DietLogResponse,

  ): void {

    console.log(

      'Food added successfully:',

      response,

    );

    this.rememberSnackSection();

    this.zone.run(

      () => {

        this.currentLog =

          response;

        this.isSaving =

          false;

        this.changeDetector

          .detectChanges();

        this.router.navigate(
          [
            '/healthify',
          ],
          {
            queryParams: {
              date:
                this.selectedDate ===
                this.todayApiDate
                  ? null
                  : this.selectedDate,
            },
          },
        );

      },

    );

  }

  /* =====================================================

     SAVE ERROR

  ===================================================== */

  private handleSaveError(

    error:

      HttpErrorResponse,

  ): void {

    console.error(

      'Unable to add food:',

      error,

    );

    this.zone.run(

      () => {

        this.isSaving =

          false;

        if (

          error.status === 422

        ) {

          console.error(

            'Diet log validation details:',

            error.error?.detail,

          );

          this.saveError =

            'This food could not be added. Please check the quantity and try again.';

        }

        else if (

          error.status === 401

        ) {

          this.saveError =

            'Your session could not be verified.';

        }

        else if (

          error.status === 0

        ) {

          this.saveError =

            'Unable to connect to LiftLog.';

        }

        else {

          this.saveError =

            'Unable to add this food right now.';

        }

        this.changeDetector

          .detectChanges();

      },

    );

  }

  /* =====================================================

     CANCEL

  ===================================================== */

cancel(): void {

  if (

    this.selectedFood

  ) {

    this.backToFoods();

    return;

  }

  this.router.navigate([

    '/healthify',

  ]);

}

}
