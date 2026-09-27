import {
  Component,
  OnInit,
} from '@angular/core';

import {
  Router,
} from '@angular/router';


type ThemeMode =
  | 'light'
  | 'dark'
  | 'system';


@Component({
  selector: 'app-appearance',

  templateUrl:
    './appearance.html',

  styleUrl:
    './appearance.css',
})
export class Appearance
  implements OnInit {

  private readonly THEME_KEY =
    'pulseos_theme';

  mode: ThemeMode =
    'system';

  resolvedTheme:
    'light' | 'dark' =
    'light';


  constructor(
    private readonly router:
      Router,
  ) {}


  ngOnInit(): void {

    const saved =
      localStorage.getItem(
        this.THEME_KEY,
      ) as ThemeMode | null;


    if (
      saved === 'light' ||
      saved === 'dark' ||
      saved === 'system'
    ) {
      this.mode =
        saved;
    }


    this.applyTheme();

  }


  goBack(): void {

    this.router.navigate([
      '/profile',
    ]);

  }


  setTheme(
    mode: ThemeMode,
  ): void {

    this.mode =
      mode;


    localStorage.setItem(
      this.THEME_KEY,
      mode,
    );


    this.applyTheme();

  }


  private applyTheme(): void {

    let resolved:
      'light' | 'dark';


    if (
      this.mode ===
      'system'
    ) {

      resolved =
        window.matchMedia(
          '(prefers-color-scheme: dark)',
        ).matches
          ? 'dark'
          : 'light';

    } else {

      resolved =
        this.mode;

    }


    this.resolvedTheme =
      resolved;


    document.documentElement
      .setAttribute(
        'data-theme',
        resolved,
      );

  }

}