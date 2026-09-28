import {
  Component,
  OnDestroy,
} from '@angular/core';

import {
  FormsModule,
} from '@angular/forms';

import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';

import {
  Router,
} from '@angular/router';

import {
  finalize,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';


interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}


interface Question {
  key: string;
  text: string;
  placeholder?: string;
  type: 'text' | 'number' | 'choice' | 'dob';
  options?: string[];
}


interface ProfileRequest {
  dob: string;

  height: string;
  weight: string;
  sex: string;

  wake_time: string;
  sleep_time: string;
  work_schedule: string;
  daily_activity: string;
  commute: string;
  available_training_time: string;

  experience: string;

  training_days: string;
  preferred_time: string;
  preferred_exercises: string;
  disliked_exercises: string;
  limitations: string;

  typical_foods: string;
  meals_per_day: string;
  eating_out_frequency: string;
  favorite_foods: string;
  favorite_snacks: string;
  dietary_preferences: string;
  cooking_constraints: string;

  primary_goal: string;
}


interface ProfileResponse {
  message: string;
}


@Component({
  selector: 'app-onboarding',

  imports: [
    FormsModule,
  ],

  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
})
export class Onboarding implements OnDestroy {

  messages: ChatMessage[] = [
    {
      sender: 'bot',
      text:
        "Hey! Let's start with the basics.",
    },
    {
      sender: 'bot',
      text:
        'How tall are you?',
    },
  ];


  questions: Question[] = [
    {
      key: 'height',
      text: 'How tall are you?',
      placeholder:
        'e.g. 172 cm or 5 feet 6 inches',
      type: 'text',
    },
    {
      key: 'weight',
      text:
        'And roughly how much do you weigh?',
      placeholder:
        'e.g. 70 kg',
      type: 'text',
    },
    {
      key: 'dob',
      text:
        'Please tell me your date of birth?',
      placeholder:
        'DD/MM/YYYY',
      type: 'dob',
    },
  ];


  currentQuestionIndex = 0;

  currentInput = '';

  answers: {
    [key: string]: string;
  } = {};

  completed = false;

  isSavingProfile = false;

  profileError = '';

  dobError = '';


  private readonly profileUrl =
    `${environment.apiBaseUrl}/profile`;


  private completionTimer?:
    ReturnType<typeof setTimeout>;


  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}


  get currentQuestion(): Question {
    return this.questions[
      this.currentQuestionIndex
    ];
  }


  get progress(): number {
    return (
      this.currentQuestionIndex /
      this.questions.length
    ) * 100;
  }


  /*
   * Height and weight are now free-text inputs.
   *
   * Examples:
   * 172 cm
   * 5 feet 6 inches
   * 70 kg
   *
   * We only restrict DOB input.
   */
  blockNonNumeric(
    event: KeyboardEvent,
  ): void {

    if (
      this.currentQuestion.type !== 'dob'
    ) {
      return;
    }


    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Tab',
      'Enter',
      'Home',
      'End',
    ];


    if (
      allowedKeys.includes(event.key)
    ) {
      return;
    }


    if (
      !/^[0-9]$/.test(event.key)
    ) {
      event.preventDefault();
    }

  }


  /*
   * Height and weight are deliberately NOT sanitized.
   *
   * The user's text is preserved exactly.
   */
  sanitizeInput(): void {

    if (
      this.currentQuestion.type === 'dob'
    ) {

      this.formatDobInput();

    }

  }


  private formatDobInput(): void {

    this.dobError = '';


    let digits =
      this.currentInput.replace(
        /[^0-9]/g,
        '',
      );


    digits =
      digits.substring(
        0,
        8,
      );


    if (
      digits.length <= 2
    ) {

      this.currentInput =
        digits;

      return;

    }


    if (
      digits.length <= 4
    ) {

      this.currentInput =
        `${digits.substring(0, 2)}/${digits.substring(2)}`;

      return;

    }


    this.currentInput =
      `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4)}`;

  }


  submitAnswer(
    answer?: string,
  ): void {

    if (
      this.completed ||
      this.isSavingProfile
    ) {
      return;
    }


    const value =
      (
        answer ??
        this.currentInput
      ).trim();


    if (
      this.currentQuestion.type === 'dob'
    ) {

      if (
        !this.isValidDob(value)
      ) {

        this.dobError =
          'Please enter a valid date of birth in DD/MM/YYYY format.';

        return;

      }

      this.dobError = '';

    }


    if (!value) {
      return;
    }


    const question =
      this.currentQuestion;


    this.messages.push({
      sender: 'user',
      text: value,
    });


    this.answers[
      question.key
    ] = value;


    this.currentInput = '';


    this.currentQuestionIndex++;


    if (
      this.currentQuestionIndex >=
      this.questions.length
    ) {

      this.saveOnboardingProfile();

      return;

    }


    this.messages.push({
      sender: 'bot',
      text:
        this.currentQuestion.text,
    });

  }


  private isValidDob(
    value: string,
  ): boolean {

    const match =
      value.match(
        /^(\d{2})\/(\d{2})\/(\d{4})$/,
      );


    if (!match) {
      return false;
    }


    const day =
      Number(match[1]);

    const month =
      Number(match[2]);

    const year =
      Number(match[3]);


    const date =
      new Date(
        year,
        month - 1,
        day,
      );


    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return false;
    }


    const today =
      new Date();


    if (
      date > today
    ) {
      return false;
    }


    const earliestYear =
      today.getFullYear() - 120;


    if (
      year < earliestYear
    ) {
      return false;
    }


    return true;

  }


  private convertDobForBackend(
    dob: string,
  ): string {

    const [
      day,
      month,
      year,
    ] =
      dob.split('/');


    return `${year}-${month}-${day}`;

  }


  private saveOnboardingProfile(): void {

    this.isSavingProfile = true;

    this.profileError = '';


    /*
     * Only height, weight and DOB are collected.
     *
     * All remaining profile fields are intentionally
     * sent as empty strings.
     */
    const profile:
      ProfileRequest = {

      dob:
        this.convertDobForBackend(
          this.answers['dob'] ?? '',
        ),

      height:
        this.answers['height'] ?? '',

      weight:
        this.answers['weight'] ?? '',

      sex: '',

      wake_time: '',

      sleep_time: '',

      work_schedule: '',

      daily_activity: '',

      commute: '',

      available_training_time: '',

      experience: '',

      training_days: '',

      preferred_time: '',

      preferred_exercises: '',

      disliked_exercises: '',

      limitations: '',

      typical_foods: '',

      meals_per_day: '',

      eating_out_frequency: '',

      favorite_foods: '',

      favorite_snacks: '',

      dietary_preferences: '',

      cooking_constraints: '',

      primary_goal: '',

    };


    console.log(
      'Profile request:',
      profile,
    );


    const token =
      localStorage.getItem(
        'pulseos_access_token',
      );


    const headers:
      Record<string, string> = {};


    if (token) {

      headers['Authorization'] =
        `Bearer ${token}`;

    }


    this.http
      .post<ProfileResponse>(
        this.profileUrl,
        profile,
        {
          headers,
        },
      )
      .pipe(

        finalize(() => {

          this.isSavingProfile =
            false;

        }),

      )
      .subscribe({

        next: (
          response,
        ) => {

          console.log(
            'Profile saved:',
            response,
          );


          this.completeOnboarding();

        },


        error: (
          error:
            HttpErrorResponse,
        ) => {

          console.error(
            'Profile save failed:',
            error,
          );


          if (
            error.status === 422
          ) {

            console.error(
              'Profile validation details:',
              error.error?.detail,
            );


            this.profileError =
              'Some profile information was not accepted. Please check the console for validation details.';

            return;

          }


          if (
            error.status === 401
          ) {

            this.profileError =
              'Your session has expired. Please sign in again.';

            return;

          }


          if (
            error.status === 0
          ) {

            this.profileError =
              'Unable to connect to LiftLog. Please make sure the server is running.';

            return;

          }


          this.profileError =
            'Unable to save your profile. Please try again.';

        },

      });

  }


  private completeOnboarding(): void {

    this.completed = true;


    this.messages.push({
      sender: 'bot',
      text:
        'Everything is set! 💚',
    });


    this.messages.push({
      sender: 'bot',
      text:
        'Welcome aboard. Your LiftLog journey starts now.',
    });


    this.completionTimer =
      setTimeout(
        () => {

          this.finishOnboarding();

        },
        3000,
      );

  }


  finishOnboarding(): void {

    this.router.navigateByUrl(
      '/home',
    );

  }


  goBack(): void {

    if (
      this.currentQuestionIndex > 0 &&
      !this.isSavingProfile &&
      !this.completed
    ) {

      this.currentQuestionIndex--;

    }

  }


  ngOnDestroy(): void {

    if (
      this.completionTimer
    ) {

      clearTimeout(
        this.completionTimer,
      );

    }

  }

}