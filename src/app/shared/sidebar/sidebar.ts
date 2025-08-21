import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar {
  readonly user = signal<{ name: string; email: string; avatar_url?: string }>({
    name: '...',
    email: '...'
  });

  constructor() {
    effect(() => {
      fetch('http://localhost:3000/gitlab/me')
        .then(res => res.json())
        .then(data => {
          this.user.set({
            name: data.name || data.username || 'User',
            email: data.email || data.public_email || '',
            avatar_url: data.avatar_url
          });
        });
    });
  }
}
