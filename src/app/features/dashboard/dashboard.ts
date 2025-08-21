import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { GitlabService } from '../../services/gitlab.service';
import { Project, Visibility } from '../../models/gitlab-project.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  private api = inject(GitlabService);

  loading = signal(true);
  error = signal<string | null>(null);

  projects = signal<Project[]>([]);
  filtered = signal<Project[]>([]);

  // Map project id to last tag name
  lastTags = signal<Record<number | string, string | null>>({});

  // UI state
  query = signal('');
  visibility = signal<Visibility | 'all'>('all');
  sort = signal<'activity_desc' | 'name_asc' | 'stars_desc'>('activity_desc');
  view = signal<'table' | 'cards'>('table');

  recentlyCopied = new Set<string>();

  ngOnInit(): void {
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getProjects().subscribe({
      next: (rows) => {
        this.projects.set(rows);
        this.applyFilters();
        // fetch last tag per project
        rows.forEach(p => {
          this.api.getTags(p.id, 1).subscribe({
            next: (tags) => {
              const map = { ...this.lastTags() };
              map[p.id] = tags && tags.length ? tags[0].name : null;
              this.lastTags.set(map);
            },
            error: () => {
              const map = { ...this.lastTags() };
              map[p.id] = null;
              this.lastTags.set(map);
            }
          });
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load projects.');
        this.loading.set(false);
      }
    });
  }

  applyFilters(): void {
    const q = this.query().toLowerCase().trim();
    const vis = this.visibility();

    const filtered = this.projects().filter(p => {
      const matchesQ = !q || (
        p.name.toLowerCase().includes(q) ||
        p.namespace.full_path?.toLowerCase().includes(q) ||
        p.path_with_namespace.toLowerCase().includes(q)
      );
      const matchesVis = (vis === 'all') || p.visibility === vis;
      return matchesQ && matchesVis;
    });

    const sorted = this.sortProjects(filtered, this.sort());
    this.filtered.set(sorted);
  }

  sortProjects(rows: Project[], mode: 'activity_desc'|'name_asc'|'stars_desc'): Project[] {
    const copy = [...rows];
    switch (mode) {
      case 'name_asc':
        return copy.sort((a, b) => a.name.localeCompare(b.name));
      case 'stars_desc':
        return copy.sort((a, b) => b.star_count - a.star_count);
      default: // 'activity_desc'
        return copy.sort((a, b) =>
          new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
        );
    }
  }

  onCopy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      this.recentlyCopied.add(text);
      setTimeout(() => this.recentlyCopied.delete(text), 1500);
    });
  }

  trackById(_: number, p: Project) { return p.id; }

  onQueryChange(v: string) {
  this.query.set(v);
  this.applyFilters();
}
onVisibilityChange(v: 'all' | Visibility) {
  this.visibility.set(v);
  this.applyFilters();
}
onSortChange(v: 'activity_desc' | 'name_asc' | 'stars_desc') {
  this.sort.set(v);
  this.applyFilters();
}
}