import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-release-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './release-history.html',
  styleUrls: ['./release-history.css']
})
export class ReleaseHistoryComponent {
  releases = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.fetchReleases();
    });
  }

  async fetchReleases() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch('http://localhost:3000/releases');
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      this.releases.set(Array.isArray(data) ? data : []);
    } catch (e: any) {
      this.error.set(e.message || 'Erreur inconnue');
    } finally {
      this.loading.set(false);
    }
  }
}
