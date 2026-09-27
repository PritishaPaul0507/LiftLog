import {
  Component,
  signal,
} from '@angular/core';

import {
  RouterOutlet,
} from '@angular/router';


type ThemeMode =
  | 'light'
  | 'dark'
  | 'system';


@Component({
  selector: 'app-root',

  imports: [
    RouterOutlet,
  ],

  templateUrl:
    './app.html',

  styleUrl:
    './app.css',
})
export class App {

  protected readonly title =
    signal(
      'pulseos-frontend',
    );


  constructor() {

    this.applySavedTheme();


    window
      .matchMedia(
        '(prefers-color-scheme: dark)',
      )
      .addEventListener(
        'change',
        () => {

          const preference =
            localStorage.getItem(
              'pulseos_theme',
            ) as ThemeMode | null;


          if (
            !preference ||
            preference ===
              'system'
          ) {
            this.applySavedTheme();
          }

        },
      );

  }


  private applySavedTheme(): void {

    const saved =
      localStorage.getItem(
        'pulseos_theme',
      ) as ThemeMode | null;


    const preference:
      ThemeMode =
      saved === 'light' ||
      saved === 'dark' ||
      saved === 'system'
        ? saved
        : 'system';


    const resolved =
      preference ===
      'system'
        ? (
            window.matchMedia(
              '(prefers-color-scheme: dark)',
            ).matches
              ? 'dark'
              : 'light'
          )
        : preference;


    document.documentElement
      .setAttribute(
        'data-theme',
        resolved,
      );

  }

}