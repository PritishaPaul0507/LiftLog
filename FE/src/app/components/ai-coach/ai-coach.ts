import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';

import {
  FormsModule,
} from '@angular/forms';

import {
  NavigationEnd,
  Router,
} from '@angular/router';

import {
  Subscription,
  filter,
  finalize,
} from 'rxjs';

import {
  AiCoachChatRequest,
  LiftlogApiService,
} from '../../services/liftlog-api.service';

import {
  environment,
} from '../../../environments/environment';


interface CoachMessage {

  sender:
    | 'user'
    | 'coach';

  text:
    string;

}


@Component({
  selector:
    'app-ai-coach',

  imports: [
    FormsModule,
  ],

  templateUrl:
    './ai-coach.html',

  styleUrl:
    './ai-coach.css',
})
export class AiCoach
  implements OnInit, OnDestroy {

  @ViewChild(
    'messageContainer',
  )
  private messageContainer?:
    ElementRef<HTMLDivElement>;


  readonly coachName =
    environment.aiCoachName;


  isOpen =
    false;

  isLoading =
    false;

  shouldShow =
    false;

  message =
    '';

  currentPage =
    environment.pages.general;


  messages:
    CoachMessage[] =
    [];


  /*
   * Prevents another initial greeting request
   * every time the panel is closed/reopened.
   */
  private hasInitialized =
    false;


  private routerSubscription?:
    Subscription;


  constructor(
    private readonly router:
      Router,

    private readonly liftlogApi:
      LiftlogApiService,

    private readonly changeDetectorRef:
      ChangeDetectorRef,
  ) {}


  ngOnInit(): void {

    this.handleRoute(
      this.router.url,
    );


    this.routerSubscription =
      this.router.events
        .pipe(
          filter(
            (
              event,
            ): event is NavigationEnd =>
              event instanceof
              NavigationEnd,
          ),
        )
        .subscribe(
          event => {

            this.handleRoute(
              event.urlAfterRedirects,
            );

          },
        );

  }


  ngOnDestroy(): void {

    this.routerSubscription
      ?.unsubscribe();

  }


  /* =====================================================
     OPEN / CLOSE
  ===================================================== */

  toggleCoach(): void {

    this.isOpen =
      !this.isOpen;


    if (
      this.isOpen &&
      !this.hasInitialized
    ) {

      this.initializeCoach();

    }


    this.changeDetectorRef
      .detectChanges();


    this.scrollToBottom();

  }


  closeCoach(): void {

    this.isOpen =
      false;

  }


  /* =====================================================
     INITIAL MESSAGE FROM BACKEND
  ===================================================== */

  private initializeCoach(): void {

    const token =
      localStorage.getItem(
        'pulseos_access_token',
      );


    if (!token) {

      this.messages.push({

        sender:
          'coach',

        text:
          'Your session has expired. Please sign in again.',

      });


      this.hasInitialized =
        true;


      this.changeDetectorRef
        .detectChanges();

      return;

    }


    this.isLoading =
      true;


    /*
     * IMPORTANT:
     *
     * The initial coach message comes from the backend.
     *
     * page    = current page
     * context = empty
     * text    = empty
     */
    const request:
      AiCoachChatRequest = {

        page:
          this.currentPage,

        context:
          '',

        text:
          '',

      };


    this.liftlogApi
      .chatWithCoach(
        token,
        request,
      )
      .pipe(
        finalize(
          () => {

            this.isLoading =
              false;


            this.changeDetectorRef
              .detectChanges();


            this.scrollToBottom();

          },
        ),
      )
      .subscribe({

        next:
          response => {

            const responseText =
              response.text?.trim();


            if (responseText) {

              this.messages.push({

                sender:
                  'coach',

                text:
                  responseText,

              });

            } else {

              this.messages.push({

                sender:
                  'coach',

                text:
                  'How can I help you today?',

              });

            }


            /*
             * Initial conversation has now been created.
             */
            this.hasInitialized =
              true;


            this.changeDetectorRef
              .detectChanges();


            this.scrollToBottom();

          },


        error:
          error => {

            console.error(
              'AI Coach initialization failed:',
              error,
            );


            this.messages.push({

              sender:
                'coach',

              text:
                'I’m having trouble connecting right now. Please try again.',

            });


            /*
             * Allow another attempt next time
             * the coach is opened.
             */
            this.hasInitialized =
              false;


            this.changeDetectorRef
              .detectChanges();


            this.scrollToBottom();

          },

      });

  }


  /* =====================================================
     SEND MESSAGE
  ===================================================== */

  sendMessage(): void {

    const text =
      this.message.trim();


    if (
      !text ||
      this.isLoading
    ) {
      return;
    }


    const token =
      localStorage.getItem(
        'pulseos_access_token',
      );


    if (!token) {

      this.messages.push({

        sender:
          'coach',

        text:
          'Your session has expired. Please sign in again.',

      });


      this.changeDetectorRef
        .detectChanges();


      this.scrollToBottom();

      return;

    }


    /*
     * Build context BEFORE adding the current message.
     *
     * So:
     *
     * context = previous conversation
     * text    = current typed message
     */
    const context =
      this.buildConversationContext();


    this.messages.push({

      sender:
        'user',

      text,

    });


    this.message =
      '';

    this.isLoading =
      true;


    const request:
      AiCoachChatRequest = {

        page:
          this.currentPage,

        context,

        text,

      };


    this.changeDetectorRef
      .detectChanges();


    this.scrollToBottom();


    this.liftlogApi
      .chatWithCoach(
        token,
        request,
      )
      .pipe(
        finalize(
          () => {

            this.isLoading =
              false;


            this.changeDetectorRef
              .detectChanges();


            this.scrollToBottom();

          },
        ),
      )
      .subscribe({

        next:
          response => {

            const responseText =
              response.text?.trim();


            this.messages.push({

              sender:
                'coach',

              text:
                responseText ||
                'I could not generate a response.',

            });


            this.changeDetectorRef
              .detectChanges();


            this.scrollToBottom();

          },


        error:
          error => {

            console.error(
              'AI Coach request failed:',
              error,
            );


            this.messages.push({

              sender:
                'coach',

              text:
                'I’m having trouble connecting right now. Please try again.',

            });


            this.changeDetectorRef
              .detectChanges();


            this.scrollToBottom();

          },

      });

  }


  /* =====================================================
     CONTEXT
  ===================================================== */

  private buildConversationContext(): string {

    const configuredLimit =
      environment.aiCoach
        .contextMessageLimit;


    const limit =
      Number.isFinite(
        configuredLimit,
      )
        ? Math.max(
            0,
            Math.floor(
              configuredLimit,
            ),
          )
        : 10;


    if (
      limit ===
      0
    ) {
      return '';
    }


    return this.messages
      .slice(
        -limit,
      )
      .map(
        item => {

          const role =
            item.sender ===
            'user'
              ? 'User'
              : 'Coach';


          return (
            `${role}: ${item.text}`
          );

        },
      )
      .join(
        '\n',
      );

  }


  /* =====================================================
     INPUT
  ===================================================== */

  onInputKeydown(
    event:
      KeyboardEvent,
  ): void {

    if (
      event.key ===
        'Enter' &&
      !event.shiftKey
    ) {

      event.preventDefault();

      this.sendMessage();

    }

  }


  /* =====================================================
     ROUTE / PAGE CONTEXT
  ===================================================== */

  private handleRoute(
    url:
      string,
  ): void {

    const path =
      url
        .split('?')[0]
        .split('#')[0];


    this.shouldShow =
      ![
        '/login',
        '/signup',
        '/onboarding',
      ].includes(
        path,
      );


    if (
      !this.shouldShow
    ) {

      this.isOpen =
        false;

    }


    this.currentPage =
      this.resolvePageFromUrl(
        path,
      );

  }


  private resolvePageFromUrl(
    path:
      string,
  ): string {

    if (
      path ===
      '/home'
    ) {
      return environment.pages.home;
    }


    if (
      path ===
      '/dashboard'
    ) {
      return environment.pages.dashboard;
    }


    if (
      path ===
      '/active-workout'
    ) {
      return environment.pages.activeWorkout;
    }


    if (
      path ===
      '/exercise-picker'
    ) {
      return environment.pages.exercisePicker;
    }


    if (
      path ===
      '/workout-history'
    ) {
      return environment.pages.workoutHistory;
    }


    if (
      /^\/workout-history\/[^/]+$/
        .test(
          path,
        )
    ) {
      return environment.pages.workoutDetail;
    }


    if (
      path ===
      '/healthify'
    ) {
      return environment.pages.nutrition;
    }


    if (
      path ===
      '/food-picker'
    ) {
      return environment.pages.foodPicker;
    }


    if (
      path ===
      '/profile'
    ) {
      return environment.pages.profile;
    }


    if (
      path ===
      '/account'
    ) {
      return environment.pages.account;
    }


    if (
      /^\/gyms\/[^/]+\/details$/
        .test(
          path,
        )
    ) {
      return environment.pages.gymDetails;
    }


    if (
      /^\/gyms\/[^/]+\/slots\/[^/]+$/
        .test(
          path,
        )
    ) {
      return environment.pages.gymSlot;
    }


    if (
      /^\/gyms\/[^/]+$/
        .test(
          path,
        )
    ) {
      return environment.pages.gymBooking;
    }


    if (
      /^\/bookings\/[^/]+$/
        .test(
          path,
        )
    ) {
      return environment.pages.bookingDetail;
    }


    if (
      path ===
      '/help-support'
    ) {
      return environment.pages.helpSupport;
    }


    if (
      path ===
      '/contact-us'
    ) {
      return environment.pages.contactUs;
    }


    if (
      path ===
      '/appearance'
    ) {
      return environment.pages.appearance;
    }


    return environment.pages.general;

  }


  /* =====================================================
     SCROLL
  ===================================================== */

  private scrollToBottom(): void {

    setTimeout(
      () => {

        const container =
          this.messageContainer
            ?.nativeElement;


        if (!container) {
          return;
        }


        container.scrollTop =
          container.scrollHeight;

      },
      0,
    );

  }

}