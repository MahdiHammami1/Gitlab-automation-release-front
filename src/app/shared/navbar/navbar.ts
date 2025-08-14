import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { GitLabMe, GitlabService } from '../../services/gitlab.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar implements OnInit {
  private api = inject(GitlabService);

  me = signal<GitLabMe | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.getMe().subscribe({
      next: (u) => { this.me.set(u); this.loading.set(false); },
      error: (e) => { this.error.set('Failed to load profile'); this.loading.set(false); },
    });
  }

  initials(): string {
    const u = this.me();
    const base = (u?.name || u?.username || '').trim();
    if (!base) return '?';
    const parts = base.split(/\s+/);
    const i = (parts[0]?.[0] || '').toUpperCase();
    const j = (parts[1]?.[0] || '').toUpperCase();
    return (i + j) || i || '?';
  }
}
