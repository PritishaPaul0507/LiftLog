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
  ActivatedRoute,
  Router,
} from '@angular/router';

import {
  ConfirmDialog,
} from '../../shared/confirm-dialog/confirm-dialog';

import {
  FoodDetails,
  FoodSearchItem,
  FoodServing,
  NutritionService,
  NutritionGoals,
  DietLogItem,
  DietLogRequest,
  DietLogRequestItem,
  DietLogResponse,
} from '../../services/nutrition.service';


interface MealSection {
  name: string;
  icon: string;
  targetCalories: number;
  eatenCalories: number;
  items: DietLogItem[];
}


@Component({
  selector: 'app-healthify',

  imports: [
    FormsModule,
    ConfirmDialog,
  ],

  templateUrl:
    './healthify.html',

  styleUrl:
    './healthify.css',
})
export class Healthify
implements OnInit {

  calorieGoal =
    Number(
      localStorage.getItem(
        'pulseos_calorie_goal',
      ),
    ) || 2000;

  caloriesEaten = 0;
  protein = 0;
  carbs = 0;
  fats = 0;

  currentLog:
    DietLogResponse | null =
    null;

  isLoadingNutrition = false;
  nutritionLoadError = false;
  isSavingFood = false;
  foodSaveError = '';

  selectedDate = '';
  showDatePicker = false;

  showGoalModal = false;

  calorieGoalInput =
    this.calorieGoal;

  showFoodSearch = false;

  selectedMeal:
    MealSection | null =
    null;

  foodSearchQuery = '';

  foodSearchResults:
    FoodSearchItem[] =
    [];

  foodSearchLoading = false;
  foodSearchError = '';
  foodSearchPage = 1;
  foodSearchTotal = 0;

  readonly foodSearchPageSize =
    20;

  selectedFood:
    FoodDetails | null =
    null;

  selectedServing:
    FoodServing | null =
    null;

  foodDetailsLoading = false;


  /* =====================================================
     EDIT FOOD
  ===================================================== */

  showEditFoodModal = false;

  editingMeal:
    MealSection | null =
    null;

  editingItem:
    DietLogItem | null =
    null;

  editingItemIndex = -1;

  editQuantity = 0;

  isUpdatingFood = false;

  editFoodError = '';


  /* =====================================================
     DELETE FOOD
  ===================================================== */

  deletingMeal:
    MealSection | null =
    null;

  deletingItemIndex = -1;

  isDeletingFood = false;


  /* =====================================================
     DELETE FOOD CONFIRMATION
  ===================================================== */

  showDeleteFoodDialog = false;

  pendingDeleteMeal:
    MealSection | null =
    null;

  pendingDeleteItem:
    DietLogItem | null =
    null;

  pendingDeleteItemIndex = -1;


  /* =====================================================
     MEALS
  ===================================================== */

  meals: MealSection[] = [
    {
      name: 'Breakfast',
      icon: '☀️',
      targetCalories: 500,
      eatenCalories: 0,
      items: [],
    },
    {
      name: 'Morning Snack',
      icon: '🍃',
      targetCalories: 250,
      eatenCalories: 0,
      items: [],
    },
    {
      name: 'Lunch',
      icon: '🍴',
      targetCalories: 600,
      eatenCalories: 0,
      items: [],
    },
    {
      name: 'Evening Snack',
      icon: '🍎',
      targetCalories: 250,
      eatenCalories: 0,
      items: [],
    },
    {
      name: 'Dinner',
      icon: '🌙',
      targetCalories: 400,
      eatenCalories: 0,
      items: [],
    },
  ];


  constructor(
    private router:
      Router,

    private route:
      ActivatedRoute,

    private nutritionService:
      NutritionService,

    private cdr:
      ChangeDetectorRef,
  ) {}


  ngOnInit(): void {
    const requestedDate =
      this.route.snapshot
        .queryParamMap
        .get('date');

    this.selectedDate =
      this.isValidSelectableDate(requestedDate)
        ? requestedDate
        : this.todayApiDate;

    this.loadNutritionData();
  }


  /* =====================================================
     LOAD
  ===================================================== */

  private loadNutritionData(): void {
    this.isLoadingNutrition =
      true;

    this.nutritionLoadError =
      false;

    this.loadGoals();
    this.loadLogs();
  }


  private loadGoals(): void {
    this.nutritionService
      .getGoals()
      .subscribe({
        next: (
          response:
            NutritionGoals,
        ) => {
          const calories =
            this.safeNumber(
              response.calories,
            );

          if (
            calories > 0
          ) {
            this.calorieGoal =
              calories;

            this.calorieGoalInput =
              calories;

            localStorage.setItem(
              'pulseos_calorie_goal',
              String(calories),
            );

            this.cdr.detectChanges();
          }
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Unable to load nutrition goals:',
            error,
          );
        },
      });
  }


  private loadLogs(): void {
    const date =
      this.selectedDate ||
      this.todayApiDate;

    console.log(
      'Loading Healthify diet log for:',
      date,
    );

    this.nutritionService
      .getLogs(date)
      .subscribe({
        next: (
          response:
            DietLogResponse,
        ) => {
          console.log(
            'Healthify diet log response:',
            response,
          );

          this.currentLog =
            response;

          this.applyDietLog(
            response,
          );

          this.isLoadingNutrition =
            false;

          this.cdr.detectChanges();
        },

        error: (
          error:
            HttpErrorResponse,
        ) => {
          if (
            error.status === 404
          ) {
            this.currentLog =
              null;

            this.resetNutritionForEmptyDay();

            this.isLoadingNutrition =
              false;

            this.cdr.detectChanges();

            return;
          }

          console.error(
            'Unable to load diet log:',
            error,
          );

          this.nutritionLoadError =
            true;

          this.isLoadingNutrition =
            false;

          this.cdr.detectChanges();
        },
      });
  }


  /* =====================================================
     FRONTEND SNACK SECTION MEMORY
  ===================================================== */

  private get snackSectionStorageKey(): string {
    return `pulseos_snack_sections_${this.selectedDate || this.todayApiDate}`;
  }

  private getSnackAssignments(
    itemCount: number,
  ): Array<'morning' | 'evening'> {
    let assignments: Array<'morning' | 'evening'> = [];

    try {
      const raw = localStorage.getItem(
        this.snackSectionStorageKey,
      );

      const parsed = raw
        ? JSON.parse(raw)
        : [];

      if (Array.isArray(parsed)) {
        assignments = parsed.filter(
          (
            value: unknown,
          ): value is 'morning' | 'evening' =>
            value === 'morning' ||
            value === 'evening',
        );
      }
    }
    catch {
      assignments = [];
    }

    // The backend only stores "snack". Older snack records therefore
    // have no morning/evening distinction. Keep them visible by
    // assigning unmatched old records to Morning Snack.
    while (
      assignments.length <
      itemCount
    ) {
      assignments.push(
        'morning',
      );
    }

    if (
      assignments.length >
      itemCount
    ) {
      assignments =
        assignments.slice(
          0,
          itemCount,
        );
    }

    localStorage.setItem(
      this.snackSectionStorageKey,
      JSON.stringify(
        assignments,
      ),
    );

    return assignments;
  }


  /* =====================================================
     APPLY LOG
  ===================================================== */

  private applyDietLog(
    log:
      DietLogResponse,
  ): void {
    if (
      !log ||
      !Array.isArray(
        log.meals,
      )
    ) {
      this.resetNutritionForEmptyDay();
      return;
    }

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    // Calculate totals directly from backend meals exactly once.
    // This avoids counting the backend "snack" meal twice.
    for (
      const apiMeal of
      log.meals
    ) {
      totalCalories +=
        this.safeNumber(
          apiMeal.nutrition
            ?.calories,
        );

      totalProtein +=
        this.safeNumber(
          apiMeal.nutrition
            ?.protein_g,
        );

      totalCarbs +=
        this.safeNumber(
          apiMeal.nutrition
            ?.carbs_g,
        );

      totalFats +=
        this.safeNumber(
          apiMeal.nutrition
            ?.fat_g,
        );
    }

    const snackMeal =
      log.meals.find(
        apiMeal =>
          this.normalizeMealName(
            apiMeal.meal_name,
          ) === 'snack',
      );

    const snackItems:
      DietLogItem[] =
      snackMeal &&
      Array.isArray(
        snackMeal.items,
      )
        ? [
            ...snackMeal.items,
          ]
        : [];

    const snackAssignments =
      this.getSnackAssignments(
        snackItems.length,
      );

    const morningSnackItems =
      snackItems.filter(
        (
          _item,
          index,
        ) =>
          snackAssignments[
            index
          ] !== 'evening',
      );

    const eveningSnackItems =
      snackItems.filter(
        (
          _item,
          index,
        ) =>
          snackAssignments[
            index
          ] === 'evening',
      );

    this.meals =
      this.meals.map(
        mealSection => {
          const sectionName =
            this.normalizeMealName(
              mealSection.name,
            );

          if (
            sectionName ===
              'morning snack' ||
            sectionName ===
              'evening snack'
          ) {
            const items =
              sectionName ===
              'evening snack'
                ? eveningSnackItems
                : morningSnackItems;

            const eatenCalories =
              items.reduce(
                (
                  total,
                  item,
                ) =>
                  total +
                  this.safeNumber(
                    item.calories,
                  ),
                0,
              );

            return {
              ...mealSection,
              eatenCalories:
                Math.round(
                  eatenCalories,
                ),
              items,
            };
          }

          const matchingMeal =
            log.meals.find(
              apiMeal =>
                this.normalizeMealName(
                  apiMeal.meal_name,
                ) ===
                sectionName,
            );

          if (
            !matchingMeal
          ) {
            return {
              ...mealSection,
              eatenCalories: 0,
              items: [],
            };
          }

          return {
            ...mealSection,

            eatenCalories:
              this.safeNumber(
                matchingMeal
                  .nutrition
                  ?.calories,
              ),

            items:
              Array.isArray(
                matchingMeal.items,
              )
                ? [
                    ...matchingMeal.items,
                  ]
                : [],
          };
        },
      );

    this.caloriesEaten =
      Math.round(
        totalCalories,
      );

    this.protein =
      this.roundMacro(
        totalProtein,
      );

    this.carbs =
      this.roundMacro(
        totalCarbs,
      );

    this.fats =
      this.roundMacro(
        totalFats,
      );
  }


  private resetNutritionForEmptyDay(): void {
    this.caloriesEaten = 0;
    this.protein = 0;
    this.carbs = 0;
    this.fats = 0;

    this.resetMeals();
  }


  private resetMeals(): void {
    this.meals =
      this.meals.map(
        meal => ({
          ...meal,
          eatenCalories: 0,
          items: [],
        }),
      );
  }


  /* =====================================================
     EDIT FOOD
  ===================================================== */

  openEditFood(
    meal:
      MealSection,

    item:
      DietLogItem,

    itemIndex:
      number,
  ): void {
    if (
      this.isUpdatingFood ||
      this.isDeletingFood
    ) {
      return;
    }

    this.editingMeal =
      meal;

    this.editingItem =
      item;

    this.editingItemIndex =
      itemIndex;

    this.editQuantity =
      this.safeNumber(
        item.quantity_g,
      );

    this.editFoodError =
      '';

    this.showEditFoodModal =
      true;
  }


  closeEditFood(): void {
    if (
      this.isUpdatingFood
    ) {
      return;
    }

    this.showEditFoodModal =
      false;

    this.editingMeal =
      null;

    this.editingItem =
      null;

    this.editingItemIndex =
      -1;

    this.editFoodError =
      '';
  }


  decreaseEditQuantity(): void {
    const current =
      this.safeNumber(
        this.editQuantity,
      );

    this.editQuantity =
      Math.max(
        1,
        current - 10,
      );
  }


  increaseEditQuantity(): void {
    const current =
      this.safeNumber(
        this.editQuantity,
      );

    this.editQuantity =
      Math.min(
        5000,
        current + 10,
      );
  }


  normalizeEditQuantity(): void {
    let quantity =
      this.safeNumber(
        this.editQuantity,
      );

    quantity =
      Math.round(
        quantity,
      );

    quantity =
      Math.max(
        1,
        Math.min(
          5000,
          quantity,
        ),
      );

    this.editQuantity =
      quantity;
  }


  get editNutritionMultiplier():
    number {
    if (
      !this.editingItem
    ) {
      return 0;
    }

    const originalQuantity =
      this.safeNumber(
        this.editingItem
          .quantity_g,
      );

    if (
      originalQuantity <= 0
    ) {
      return 0;
    }

    return (
      this.safeNumber(
        this.editQuantity,
      ) /
      originalQuantity
    );
  }


  get editedCalories():
    number {
    if (
      !this.editingItem
    ) {
      return 0;
    }

    return Math.round(
      this.safeNumber(
        this.editingItem.calories,
      ) *
      this.editNutritionMultiplier,
    );
  }


  get editedProtein():
    number {
    return this.getEditedMacro(
      this.editingItem
        ?.protein_g,
    );
  }


  get editedCarbs():
    number {
    return this.getEditedMacro(
      this.editingItem
        ?.carbs_g,
    );
  }


  get editedFats():
    number {
    return this.getEditedMacro(
      this.editingItem
        ?.fat_g,
    );
  }


  get editedFiber():
    number {
    return this.getEditedMacro(
      this.editingItem
        ?.fiber_g,
    );
  }


  private getEditedMacro(
    value:
      unknown,
  ): number {
    return this.roundMacro(
      this.safeNumber(
        value,
      ) *
      this.editNutritionMultiplier,
    );
  }


  saveEditedFood(): void {
    if (
      !this.currentLog ||
      !this.editingMeal ||
      !this.editingItem ||
      this.editingItemIndex < 0 ||
      this.isUpdatingFood
    ) {
      return;
    }

    this.normalizeEditQuantity();

    if (
      this.editQuantity <= 0
    ) {
      this.editFoodError =
        'Enter a valid quantity.';

      return;
    }

    const payload =
      this.buildModifiedLogPayload(
        this.editingMeal.name,
        this.editingItemIndex,
        'edit',
        this.editQuantity,
      );

    if (
      !payload
    ) {
      this.editFoodError =
        'Unable to update this food.';

      return;
    }

    this.isUpdatingFood =
      true;

    this.editFoodError =
      '';

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
          this.currentLog =
            response;

          this.applyDietLog(
            response,
          );

          this.isUpdatingFood =
            false;

          this.showEditFoodModal =
            false;

          this.editingMeal =
            null;

          this.editingItem =
            null;

          this.editingItemIndex =
            -1;

          this.cdr.detectChanges();
        },

        error: (
          error:
            HttpErrorResponse,
        ) => {
          console.error(
            'Unable to edit food:',
            error,
          );

          this.isUpdatingFood =
            false;

          this.editFoodError =
            'Unable to save changes right now.';

          this.cdr.detectChanges();
        },
      });
  }


  /* =====================================================
     DELETE FOOD
  ===================================================== */

  deleteFood(
    meal:
      MealSection,

    item:
      DietLogItem,

    itemIndex:
      number,
  ): void {
    if (
      !this.currentLog ||
      this.isDeletingFood ||
      this.isUpdatingFood
    ) {
      return;
    }

    this.pendingDeleteMeal =
      meal;

    this.pendingDeleteItem =
      item;

    this.pendingDeleteItemIndex =
      itemIndex;

    this.showDeleteFoodDialog =
      true;
  }


  /* =====================================================
     CANCEL DELETE FOOD
  ===================================================== */

  cancelDeleteFood(): void {
    this.showDeleteFoodDialog =
      false;

    this.clearPendingDeleteFood();
  }


  /* =====================================================
     CONFIRM DELETE FOOD
  ===================================================== */

  confirmDeleteFood(): void {
    if (
      !this.currentLog ||
      !this.pendingDeleteMeal ||
      !this.pendingDeleteItem ||
      this.pendingDeleteItemIndex < 0 ||
      this.isDeletingFood ||
      this.isUpdatingFood
    ) {
      return;
    }

    const meal =
      this.pendingDeleteMeal;

    const itemIndex =
  this.pendingDeleteItemIndex;

const snackBackendIndex =
  this.getSnackBackendIndex(
    meal.name,
    itemIndex,
  );

const payload =
  this.buildModifiedLogPayload(
    meal.name,
    itemIndex,
    'delete',
  );
      

    if (
      !payload
    ) {
      return;
    }

    this.showDeleteFoodDialog =
      false;

    this.deletingMeal =
      meal;

    this.deletingItemIndex =
      itemIndex;

    this.isDeletingFood =
      true;

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
          const normalizedMeal =
  this.normalizeMealName(
    meal.name,
  );

if (
  normalizedMeal ===
    'morning snack' ||
  normalizedMeal ===
    'evening snack'
) {
  this.removeSnackAssignment(
    snackBackendIndex,
  );
}

this.currentLog =
  response;

this.applyDietLog(
  response,
);

          this.isDeletingFood =
            false;

          this.deletingMeal =
            null;

          this.deletingItemIndex =
            -1;

          this.clearPendingDeleteFood();

          this.cdr.detectChanges();
        },

        error: (
          error:
            HttpErrorResponse,
        ) => {
          console.error(
            'Unable to delete food:',
            error,
          );

          this.isDeletingFood =
            false;

          this.deletingMeal =
            null;

          this.deletingItemIndex =
            -1;

          this.clearPendingDeleteFood();

          window.alert(
            'Unable to delete this food right now.',
          );

          this.cdr.detectChanges();
        },
      });
  }


  private clearPendingDeleteFood(): void {
    this.pendingDeleteMeal =
      null;

    this.pendingDeleteItem =
      null;

    this.pendingDeleteItemIndex =
      -1;
  }


  isDeletingItem(
    meal:
      MealSection,

    index:
      number,
  ): boolean {
    return (
      this.isDeletingFood &&
      this.deletingMeal?.name ===
        meal.name &&
      this.deletingItemIndex ===
        index
    );
  }


 private buildModifiedLogPayload(
  mealName: string,
  itemIndex: number,
  operation: 'edit' | 'delete',
  quantity?: number,
): DietLogRequest | null {

  if (!this.currentLog) {
    return null;
  }

  const normalizedTarget =
    this.normalizeMealName(mealName);

  const isSnackSection =
    normalizedTarget === 'morning snack' ||
    normalizedTarget === 'evening snack';

  /*
   * Morning Snack + Evening Snack both exist in the
   * backend as one meal_type: "snack".
   *
   * The index displayed in either frontend section is
   * NOT necessarily the same index in backend snack.items.
   */
  let backendItemIndex = itemIndex;

  if (isSnackSection) {

    const snackMeal =
      this.currentLog.meals.find(
        meal =>
          this.normalizeMealName(
            meal.meal_name,
          ) === 'snack',
      );

    if (!snackMeal) {
      return null;
    }

    const assignments =
      this.getSnackAssignments(
        snackMeal.items.length,
      );

    const wantedSection:
      'morning' | 'evening' =
      normalizedTarget === 'evening snack'
        ? 'evening'
        : 'morning';

    const matchingBackendIndexes =
      assignments
        .map(
          (section, index) => ({
            section,
            index,
          }),
        )
        .filter(
          entry =>
            entry.section === wantedSection,
        )
        .map(
          entry => entry.index,
        );

    backendItemIndex =
      matchingBackendIndexes[itemIndex];

    if (
      backendItemIndex === undefined
    ) {
      return null;
    }
  }

  const backendTargetMeal =
    isSnackSection
      ? 'snack'
      : normalizedTarget;

  const requestMeals =
    this.currentLog.meals
      .map(
        meal => {

          let items =
            meal.items.map(
              item =>
                this.convertExistingItemToRequest(
                  item,
                ),
            );

          const currentMealName =
            this.normalizeMealName(
              meal.meal_name,
            );

          if (
            currentMealName ===
            backendTargetMeal
          ) {

            if (
              operation === 'delete'
            ) {

              items =
                items.filter(
                  (_item, index) =>
                    index !==
                    backendItemIndex,
                );

            }
            else if (
              operation === 'edit' &&
              items[backendItemIndex]
            ) {

              items[backendItemIndex] = {
                ...items[backendItemIndex],

                quantity_g:
                  this.safeNumber(
                    quantity,
                  ),
              };

            }
          }

          return {
            meal_type:
              currentMealName,

            items,
          };
        },
      )
      .filter(
        meal =>
          meal.items.length > 0,
      );

  return {
    date:
      this.selectedDate ||
      this.todayApiDate,

    meals:
      requestMeals,
  };
}
private getSnackBackendIndex(
  mealName: string,
  sectionItemIndex: number,
): number {

  if (!this.currentLog) {
    return -1;
  }

  const normalized =
    this.normalizeMealName(
      mealName,
    );

  if (
    normalized !== 'morning snack' &&
    normalized !== 'evening snack'
  ) {
    return sectionItemIndex;
  }

  const snackMeal =
    this.currentLog.meals.find(
      meal =>
        this.normalizeMealName(
          meal.meal_name,
        ) === 'snack',
    );

  if (!snackMeal) {
    return -1;
  }

  const assignments =
    this.getSnackAssignments(
      snackMeal.items.length,
    );

  const wantedSection:
    'morning' | 'evening' =
    normalized === 'evening snack'
      ? 'evening'
      : 'morning';

  const indexes =
    assignments
      .map(
        (section, index) => ({
          section,
          index,
        }),
      )
      .filter(
        entry =>
          entry.section ===
          wantedSection,
      )
      .map(
        entry => entry.index,
      );

  return (
    indexes[sectionItemIndex] ??
    -1
  );
}


private removeSnackAssignment(
  backendItemIndex: number,
): void {

  if (
    backendItemIndex < 0 ||
    !this.currentLog
  ) {
    return;
  }

  const snackMeal =
    this.currentLog.meals.find(
      meal =>
        this.normalizeMealName(
          meal.meal_name,
        ) === 'snack',
    );

  if (!snackMeal) {
    return;
  }

  const assignments =
    this.getSnackAssignments(
      snackMeal.items.length,
    );

  assignments.splice(
    backendItemIndex,
    1,
  );

  localStorage.setItem(
    this.snackSectionStorageKey,
    JSON.stringify(
      assignments,
    ),
  );
}

  /* =====================================================
     HELPERS
  ===================================================== */

  foodEmoji(
    item:
      DietLogItem,
  ): string {
    const name =
      String(
        item.food_name ?? '',
      )
        .toLowerCase();

    if (
      name.includes(
        'rice',
      )
    ) {
      return '🍚';
    }

    if (
      name.includes(
        'chicken',
      )
    ) {
      return '🍗';
    }

    if (
      name.includes(
        'egg',
      )
    ) {
      return '🥚';
    }

    if (
      name.includes(
        'banana',
      )
    ) {
      return '🍌';
    }

    if (
      name.includes(
        'oat',
      )
    ) {
      return '🥣';
    }

    if (
      name.includes(
        'paneer',
      )
    ) {
      return '🧀';
    }

    return '🍽️';
  }


  private safeNumber(
    value:
      unknown,
  ): number {
    const parsed =
      Number(
        value,
      );

    if (
      !Number.isFinite(
        parsed,
      )
    ) {
      return 0;
    }

    return parsed;
  }


  private roundMacro(
    value:
      number,
  ): number {
    return (
      Math.round(
        value * 10,
      ) / 10
    );
  }


  private normalizeMealName(
    mealName:
      string,
  ): string {
    return String(
      mealName ?? '',
    )
      .trim()
      .toLowerCase()
      .replace(
        /[_-]+/g,
        ' ',
      );
  }


  get todayApiDate():
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


  get todayLabel():
    string {
    return this.formatDisplayDate(
      this.selectedDate ||
      this.todayApiDate,
    );
  }


  get selectedDateTitle():
    string {
    const selected =
      this.selectedDate ||
      this.todayApiDate;

    if (selected === this.todayApiDate) {
      return 'Today';
    }

    const yesterday =
      new Date();

    yesterday.setDate(
      yesterday.getDate() - 1,
    );

    if (
      selected ===
      this.toApiDate(yesterday)
    ) {
      return 'Yesterday';
    }

    return new Intl.DateTimeFormat(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
      },
    ).format(
      this.parseApiDate(selected),
    );
  }


  toggleDatePicker(): void {
    this.showDatePicker =
      !this.showDatePicker;
  }


  closeDatePicker(): void {
    this.showDatePicker =
      false;
  }


  selectNutritionDate(
    value:
      string,
  ): void {
    if (
      !this.isValidSelectableDate(value)
    ) {
      return;
    }

    this.selectedDate =
      value;

    this.showDatePicker =
      false;

    this.currentLog =
      null;

    this.resetNutritionForEmptyDay();

    this.router.navigate(
      [],
      {
        relativeTo:
          this.route,

        queryParams: {
          date:
            value === this.todayApiDate
              ? null
              : value,
        },

        queryParamsHandling:
          'merge',

        replaceUrl:
          true,
      },
    );

    this.isLoadingNutrition =
      true;

    this.nutritionLoadError =
      false;

    this.loadLogs();
  }


  private isValidSelectableDate(
    value:
      string | null,
  ): value is string {
    if (
      !value ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return false;
    }

    const parsed =
      this.parseApiDate(value);

    return (
      !Number.isNaN(parsed.getTime()) &&
      value <= this.todayApiDate
    );
  }


  private parseApiDate(
    value:
      string,
  ): Date {
    const [year, month, day] =
      value.split('-').map(Number);

    return new Date(
      year,
      month - 1,
      day,
    );
  }


  private toApiDate(
    date:
      Date,
  ): string {
    const year =
      date.getFullYear();

    const month =
      String(date.getMonth() + 1)
        .padStart(2, '0');

    const day =
      String(date.getDate())
        .padStart(2, '0');

    return `${year}-${month}-${day}`;
  }


  private formatDisplayDate(
    value:
      string,
  ): string {
    return new Intl.DateTimeFormat(
      'en-US',
      {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      },
    ).format(
      this.parseApiDate(value),
    );
  }


  get caloriesLeft():
    number {
    return Math.max(
      0,

      this.safeNumber(
        this.calorieGoal,
      ) -
      this.safeNumber(
        this.caloriesEaten,
      ),
    );
  }


  get calorieProgress():
    number {
    const goal =
      this.safeNumber(
        this.calorieGoal,
      );

    const eaten =
      this.safeNumber(
        this.caloriesEaten,
      );

    if (
      goal <= 0
    ) {
      return 0;
    }

    return Math.min(
      100,

      Math.max(
        0,

        (
          eaten /
          goal
        ) * 100,
      ),
    );
  }


  /* =====================================================
     GOAL
  ===================================================== */

  openGoalModal(): void {
    this.calorieGoalInput =
      this.calorieGoal;

    this.showGoalModal =
      true;
  }


  closeGoalModal(): void {
    this.showGoalModal =
      false;
  }


  saveCalorieGoal(): void {
    const newGoal =
      Number(
        this.calorieGoalInput,
      );

    if (
      !Number.isFinite(
        newGoal,
      ) ||
      newGoal < 500 ||
      newGoal > 10000
    ) {
      window.alert(
        'Enter a calorie goal between 500 and 10,000 calories.',
      );

      return;
    }

    const roundedGoal =
      Math.round(
        newGoal,
      );

    this.nutritionService
      .getGoals()
      .subscribe({
        next: (
          currentGoals:
            NutritionGoals,
        ) => {
          const payload:
            NutritionGoals = {
            calories:
              roundedGoal,

            protein_g:
              this.safeNumber(
                currentGoals.protein_g,
              ),

            carbs_g:
              this.safeNumber(
                currentGoals.carbs_g,
              ),

            fat_g:
              this.safeNumber(
                currentGoals.fat_g,
              ),
          };

          this.updateNutritionGoals(
            payload,
          );
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Unable to read nutrition goals:',
            error,
          );

          window.alert(
            'Unable to update your calorie goal right now.',
          );
        },
      });
  }


  private updateNutritionGoals(
    payload:
      NutritionGoals,
  ): void {
    this.nutritionService
      .updateGoals(
        payload,
      )
      .subscribe({
        next: (
          response:
            NutritionGoals,
        ) => {
          const savedGoal =
            this.safeNumber(
              response.calories,
            );

          this.calorieGoal =
            savedGoal > 0
              ? savedGoal
              : payload.calories;

          this.calorieGoalInput =
            this.calorieGoal;

          localStorage.setItem(
            'pulseos_calorie_goal',
            String(
              this.calorieGoal,
            ),
          );

          this.closeGoalModal();

          this.cdr.detectChanges();
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Unable to update nutrition goals:',
            error,
          );

          window.alert(
            'Unable to update your calorie goal right now.',
          );
        },
      });
  }


  /* =====================================================
     ADD FOOD
  ===================================================== */

  addFood(
    meal:
      MealSection,
  ): void {
    this.router.navigate(
      [
        '/food-picker',
      ],
      {
        queryParams: {
          meal:
            meal.name,

          date:
            this.selectedDate ||
            this.todayApiDate,
        },
      },
    );
  }


  /* =====================================================
     LEGACY FOOD SEARCH
  ===================================================== */

  closeFoodSearch(): void {
    if (
      this.isSavingFood
    ) {
      return;
    }

    this.showFoodSearch =
      false;

    this.selectedMeal =
      null;

    this.selectedFood =
      null;

    this.selectedServing =
      null;

    this.foodSearchQuery =
      '';

    this.foodSearchResults =
      [];

    this.foodSearchError =
      '';

    this.foodSaveError =
      '';
  }


  searchFoods(): void {
    this.foodSearchPage =
      1;

    this.selectedFood =
      null;

    this.selectedServing =
      null;

    this.loadFoods();
  }


  clearFoodSearch(): void {
    this.foodSearchQuery =
      '';

    this.foodSearchPage =
      1;

    this.selectedFood =
      null;

    this.selectedServing =
      null;

    this.loadFoods();
  }


  private loadFoods(): void {
    this.foodSearchLoading =
      true;

    this.foodSearchError =
      '';

    this.nutritionService
      .searchFoods(
        this.foodSearchQuery,
        this.foodSearchPage,
        this.foodSearchPageSize,
      )
      .subscribe({
        next: response => {
          this.foodSearchResults =
            response.items ?? [];

          this.foodSearchTotal =
            response.pagination
              ?.total ?? 0;

          this.foodSearchLoading =
            false;

          this.cdr.detectChanges();
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Unable to search foods:',
            error,
          );

          this.foodSearchResults =
            [];

          this.foodSearchError =
            'Unable to load foods right now.';

          this.foodSearchLoading =
            false;

          this.cdr.detectChanges();
        },
      });
  }


  get canGoToPreviousFoodPage():
    boolean {
    return (
      this.foodSearchPage >
      1
    );
  }


  get canGoToNextFoodPage():
    boolean {
    return (
      this.foodSearchPage *
      this.foodSearchPageSize
    ) <
    this.foodSearchTotal;
  }


  previousFoodPage(): void {
    if (
      !this.canGoToPreviousFoodPage
    ) {
      return;
    }

    this.foodSearchPage -=
      1;

    this.loadFoods();
  }


  nextFoodPage(): void {
    if (
      !this.canGoToNextFoodPage
    ) {
      return;
    }

    this.foodSearchPage +=
      1;

    this.loadFoods();
  }


  selectFood(
    food:
      FoodSearchItem,
  ): void {
    this.foodDetailsLoading =
      true;

    this.selectedFood =
      null;

    this.selectedServing =
      null;

    this.foodSaveError =
      '';

    this.nutritionService
      .getFoodDetails(
        food.food_id,
      )
      .subscribe({
        next: (
          response:
            FoodDetails,
        ) => {
          this.selectedFood =
            response;

          this.foodDetailsLoading =
            false;

          this.cdr.detectChanges();
        },

        error: (
          error:
            unknown,
        ) => {
          console.error(
            'Unable to load food details:',
            error,
          );

          this.foodDetailsLoading =
            false;

          this.foodSearchError =
            'Unable to load this food.';

          this.cdr.detectChanges();
        },
      });
  }


  backToFoodResults(): void {
    this.selectedFood =
      null;

    this.selectedServing =
      null;

    this.foodSaveError =
      '';
  }


  selectServing(
    serving:
      FoodServing,
  ): void {
    this.selectedServing =
      serving;

    this.foodSaveError =
      '';
  }


  isServingSelected(
    serving:
      FoodServing,
  ): boolean {
    return (
      this.selectedServing
        ?.serving_id ===
      serving.serving_id
    );
  }


  addSelectedFoodToMeal(): void {
    if (
      !this.selectedMeal ||
      !this.selectedFood ||
      !this.selectedServing ||
      this.isSavingFood
    ) {
      return;
    }

    this.isSavingFood =
      true;

    this.foodSaveError =
      '';

    const newItem:
      DietLogRequestItem = {
      food_id:
        this.selectedFood.food_id,

      custom_food_id:
        null,

      serving_id:
        this.selectedServing
          .serving_id,

      quantity_g:
        this.safeNumber(
          this.selectedServing
            .quantity_g,
        ),
    };

    const payload =
      this.buildDietLogPayload(
        newItem,
      );

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
            this.handleFoodSaved(
              response,
            );
          },

          error: (
            error:
              HttpErrorResponse,
          ) => {
            this.handleFoodSaveError(
              error,
            );
          },
        });

      return;
    }

    this.nutritionService
      .createLog(
        payload,
      )
      .subscribe({
        next: (
          response:
            DietLogResponse,
        ) => {
          this.handleFoodSaved(
            response,
          );
        },

        error: (
          error:
            HttpErrorResponse,
        ) => {
          this.handleFoodSaveError(
            error,
          );
        },
      });
  }


  private buildDietLogPayload(
    newItem:
      DietLogRequestItem,
  ): DietLogRequest {
    const meals =
      this.currentLog
        ?.meals ?? [];

    const requestMeals =
      meals.map(
        meal => ({
          meal_type:
            meal.meal_name,

          items:
            meal.items.map(
              item =>
                this.convertExistingItemToRequest(
                  item,
                ),
            ),
        }),
      );

    const selectedMealName =
      this.selectedMeal
        ?.name ?? '';

    const selectedNormalized =
      this.normalizeMealName(
        selectedMealName,
      );

    const existingMeal =
      requestMeals.find(
        meal =>
          this.normalizeMealName(
            meal.meal_type,
          ) ===
          selectedNormalized,
      );

    if (
      existingMeal
    ) {
      existingMeal.items.push(
        newItem,
      );
    }
    else {
      requestMeals.push({
        meal_type:
          selectedMealName,

        items: [
          newItem,
        ],
      });
    }

    return {
      date:
        this.todayApiDate,

      meals:
        requestMeals,
    };
  }


  private convertExistingItemToRequest(
    item:
      DietLogItem,
  ): DietLogRequestItem {
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


  private handleFoodSaved(
    response:
      DietLogResponse,
  ): void {
    this.currentLog =
      response;

    this.applyDietLog(
      response,
    );

    this.isSavingFood =
      false;

    this.closeFoodSearch();

    this.cdr.detectChanges();
  }


  private handleFoodSaveError(
    error:
      HttpErrorResponse,
  ): void {
    console.error(
      'Unable to save food:',
      error,
    );

    this.isSavingFood =
      false;

    if (
      error.status === 422
    ) {
      console.error(
        'Diet log validation details:',
        error.error?.detail,
      );

      this.foodSaveError =
        'This food could not be added. Please try another serving.';

      this.cdr.detectChanges();

      return;
    }

    if (
      error.status === 401
    ) {
      this.foodSaveError =
        'Your session could not be verified. Please try again.';

      this.cdr.detectChanges();

      return;
    }

    if (
      error.status === 0
    ) {
      this.foodSaveError =
        'Unable to connect to PulseOS.';

      this.cdr.detectChanges();

      return;
    }

    this.foodSaveError =
      'Unable to add this food right now.';

    this.cdr.detectChanges();
  }


  /* =====================================================
     SETTINGS
  ===================================================== */

  openSettings(): void {
    window.alert(
      'Nutrition settings will be connected next.',
    );
  }


 /* =====================================================
   NAVIGATION
===================================================== */

goToHome(): void {

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

  this.router.navigate([
    '/profile',
  ]);

}

}