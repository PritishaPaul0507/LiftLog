import {
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


interface CoachMessage {
  sender:
    | 'user'
    | 'coach';

  text: string;
}


@Component({
  selector: 'app-ai-coach',

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


  isOpen =
    false;

  isLoading =
    false;

  shouldShow =
    false;

  message =
    '';

  currentPage =
    'general';

  messages:
    CoachMessage[] =
    [];


  private routerSubscription?:
    Subscription;


  constructor(
    private readonly router:
      Router,

    private readonly liftlogApi:
      LiftlogApiService,
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


  toggleCoach(): void {

    this.isOpen =
      !this.isOpen;


    if (
      this.isOpen &&
      this.messages.length ===
        0
    ) {

      this.messages.push({
        sender:
          'coach',

        text:
          'Hi! I’m your LiftLog AI Coach. How can I help you today?',
      });

    }


    this.scrollToBottom();

  }


  closeCoach(): void {

    this.isOpen =
      false;

  }


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

      this.scrollToBottom();

      return;

    }


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

        context:
          '',

        text,

      };


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

            this.scrollToBottom();

          },
        ),
      )
      .subscribe({

        next:
          response => {

            this.messages.push({
              sender:
                'coach',

              text:
                response.text ||
                'I could not generate a response.',
            });

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

            this.scrollToBottom();

          },

      });

  }


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


  private handleRoute(
    url: string,
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
    path: string,
  ): string {

    if (
      path ===
      '/home'
    ) {
      return 'home';
    }


    if (
      path ===
      '/dashboard'
    ) {
      return 'workouts';
    }


    if (
      path ===
      '/active-workout'
    ) {
      return 'active_workout';
    }


    if (
      path ===
      '/exercise-picker'
    ) {
      return 'exercise_picker';
    }


    if (
      path ===
      '/workout-history'
    ) {
      return 'workout_history';
    }


    if (
      /^\/workout-history\/[^/]+$/
        .test(
          path,
        )
    ) {
      return 'workout_detail';
    }


    if (
      path ===
      '/healthify'
    ) {
      return 'nutrition';
    }


    if (
      path ===
      '/food-picker'
    ) {
      return 'food_picker';
    }


    if (
      path ===
      '/profile'
    ) {
      return 'profile';
    }


    if (
      path ===
      '/account'
    ) {
      return 'account';
    }


    if (
      /^\/gyms\/[^/]+\/details$/
        .test(
          path,
        )
    ) {
      return 'gym_details';
    }


    if (
      /^\/gyms\/[^/]+\/slots\/[^/]+$/
        .test(
          path,
        )
    ) {
      return 'gym_slot';
    }


    if (
      /^\/gyms\/[^/]+$/
        .test(
          path,
        )
    ) {
      return 'gym_booking';
    }


    if (
      /^\/bookings\/[^/]+$/
        .test(
          path,
        )
    ) {
      return 'booking_detail';
    }


    if (
      path ===
      '/help-support'
    ) {
      return 'help_support';
    }


    if (
      path ===
      '/contact-us'
    ) {
      return 'contact_us';
    }


    return 'general';

  }


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