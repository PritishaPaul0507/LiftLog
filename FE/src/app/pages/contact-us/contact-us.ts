import {
  Component,
} from '@angular/core';

import {
  FormsModule,
} from '@angular/forms';

import {
  Router,
} from '@angular/router';


@Component({
  selector:
    'app-contact-us',

  imports: [
    FormsModule,
  ],

  templateUrl:
    './contact-us.html',

  styleUrl:
    './contact-us.css',
})
export class ContactUs {

  name =
    '';

  email =
    '';

  topic =
    'General support';

  message =
    '';

  formError =
    '';


  constructor(
    private readonly router:
      Router,
  ) {}


  goBack(): void {

    this.router.navigate([
      '/help-support',
    ]);

  }


  sendMessage(): void {

    this.formError =
      '';


    if (
      !this.name.trim() ||
      !this.email.trim() ||
      !this.message.trim()
    ) {

      this.formError =
        'Please complete your name, email and message.';

      return;

    }


    const subject =
      encodeURIComponent(
        `PulseOS Support - ${this.topic}`,
      );


    const body =
      encodeURIComponent(
        [
          `Name: ${this.name.trim()}`,
          `Email: ${this.email.trim()}`,
          `Topic: ${this.topic}`,
          '',
          this.message.trim(),
        ].join('\n'),
      );


    window.location.href =
      `mailto:?subject=${subject}&body=${body}`;

  }

}