import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/navbar/navbar';
import { Footer } from './shared/footer/footer';
import { Layout } from './shared/layout/layout';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, Layout],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('suivireleaseFront');
}
