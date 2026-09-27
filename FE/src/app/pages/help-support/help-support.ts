import {
  Component,
} from '@angular/core';

import {
  Router,
} from '@angular/router';


interface HelpQuestion {
  question: string;
  answer: string;
}


@Component({
  selector:
    'app-help-support',

  templateUrl:
    './help-support.html',

  styleUrl:
    './help-support.css',
})
export class HelpSupport {

  openQuestion:
    number | null =
    null;


  readonly questions:
    HelpQuestion[] = [

    {
      question:
        'How do I start a workout?',
      answer:
        'Open Workouts from the bottom navigation, select one of your routines or start an empty workout.',
    },

    {
      question:
        'Where can I see my workout history?',
      answer:
        'Open your Profile and select View All under Recent Activity to see your completed workouts.',
    },

    {
      question:
        'How do gym bookings work?',
      answer:
        'Open a nearby gym from Home, choose an available date and time slot, and confirm your booking.',
    },

    {
      question:
        'Where can I see my gym bookings?',
      answer:
        'Your gym bookings appear in the My Bookings section of your Profile.',
    },

    {
      question:
        'How do I update my personal details?',
      answer:
        'Open Profile, Settings, then Account. You can edit your personal and fitness information there.',
    },

  ];


  constructor(
    private readonly router:
      Router,
  ) {}


  goBack(): void {

    this.router.navigate([
      '/profile',
    ]);

  }


  toggleQuestion(
    index: number,
  ): void {

    this.openQuestion =
      this.openQuestion === index
        ? null
        : index;

  }


  openContact(): void {

    this.router.navigate([
      '/contact-us',
    ]);

  }

}