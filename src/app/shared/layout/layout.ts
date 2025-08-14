import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';
import { Sidebar } from '../sidebar/sidebar';


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Navbar, Footer, Sidebar],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css']
})
export class Layout {
  sidebarOpen = signal(true);
  toggleSidebar() {
    this.sidebarOpen.update(open => !open);
  }
}
