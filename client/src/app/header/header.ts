import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit {
  isDarkTheme = false;

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    // Check if we're in browser environment
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      // Check if dark theme is already set in localStorage or by system preference
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

      this.isDarkTheme = savedTheme === 'dark' || (!savedTheme && prefersDark);
      this.applyTheme();
    }
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
  }

  navigateTo(path: string): void {
    console.log(`Navigating to ${path}`);
    this.router.navigate([path]);
  }

  private applyTheme(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const theme = this.isDarkTheme ? 'dark' : 'mycupcake';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }
}
