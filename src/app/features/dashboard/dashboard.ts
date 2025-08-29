import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  error = signal<string | null>(null);

  projects = signal<Project[]>([]);
  filtered = signal<Project[]>([]);

  // Map project id to last tag name
  lastTags = signal<Record<number | string, string | null>>({});

  // Help modal visibility
  helpVisible = signal(false);

  // UI state
  query = signal('');
  visibility = signal<Visibility | 'all'>('all');
  sort = signal<'activity_desc' | 'name_asc' | 'stars_desc'>('activity_desc');
  view = signal<'table' | 'cards'>('table');

  recentlyCopied = new Set<string>();

  /** Project selected by the user */
  selectedProject: Project | null = null;

  /** Branch selected by the user */
  selectedBranch: { name: string } | null = null;

  // Open the help modal
  openHelp() {
    this.helpVisible.set(true);
  }

  // Close the help modal
  closeHelp() {
    this.helpVisible.set(false);
  }

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
              const lastTag = tags && tags.length ? tags[0].name : '—';
              map[p.id] = lastTag; // Preserve existing tags
              this.lastTags.set(map);

              // Vérifier si une branche doit être fusionnée
              this.api.getBranches(p.id).subscribe({
                next: (branches) => {
                  const mainBranch = branches.find((b: any) => b.name === 'main');
                  if (mainBranch) {
                    const unmergedBranches = branches.filter(
                      (b: any) => b.name !== 'main' && b.commit.id !== mainBranch.commit.id
                    );
                    if (unmergedBranches.length > 0) {
                      p._branchTagDiff = [lastTag]; // Tag en rouge si une branche doit être fusionnée
                    } else {
                      p._branchTagDiff = []; // Aucun tag en rouge
                      p._lastTag = lastTag; // Remplacer "Aucun commit" par le dernier tag
                    }
                  } else {
                    p._branchTagDiff = []; // Aucun tag en rouge
                    p._lastTag = lastTag; // Remplacer "Aucun commit" par le dernier tag
                  }
                  this.projects.set([...this.projects()]);
                  this.cdr.detectChanges();
                },
                error: () => {
                  p._branchTagDiff = []; // Aucun tag en rouge
                  p._lastTag = lastTag; // Remplacer "Aucun commit" par le dernier tag
                  this.projects.set([...this.projects()]);
                  this.cdr.detectChanges();
                }
              });
            },
            error: () => {
              const map = { ...this.lastTags() };
              map[p.id] = '—';
              this.lastTags.set(map);
              p._branchTagDiff = []; // Aucun tag en rouge
              p._lastTag = '—'; // Remplacer "Aucun commit" par le dernier tag
              this.projects.set([...this.projects()]);
              this.cdr.detectChanges();
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

/** Vérifie les commits non fusionnés et effectue une fusion sur la branche main */
onCreateOnMain(project: any): void {
  if (!project) {
    console.error('Project is missing');
    return;
  }

  this.api.getBranches(project.id).subscribe({
    next: (branches) => {
      const mainBranch = branches.find((b: any) => b.name === 'main');

      if (!mainBranch) {
        alert(`❌ La branche principale 'main' est introuvable pour le projet ${project.name}`);
        return;
      }

      const unmergedBranches = branches.filter(
        (b: any) => b.name !== 'main' && b.commit.id !== mainBranch.commit.id
      );

      if (unmergedBranches.length > 0) {
        const branchToMerge = unmergedBranches[0];
        console.log(`Attempting to merge branch '${branchToMerge.name}' into main for project '${project.name}'`);
        this.api.updateMain(project.id, branchToMerge.name).subscribe({
          next: (response) => {
            console.log('Branch merged successfully into main:', response);

            const newTag = `v${new Date().getTime()}`;
            this.api.createTagOnMain(project.id, newTag).subscribe({
              next: () => {
                console.log(`New tag '${newTag}' created successfully on main for project '${project.name}'`);
                alert(`✅ La branche '${branchToMerge.name}' a été fusionnée et un nouveau tag '${newTag}' a été créé sur la branche main du projet '${project.name}'`);

                project._branchTagDiff = [newTag];
                this.projects.set([...this.projects()]);
                this.cdr.detectChanges();
              },
              error: (err) => {
                console.error('Failed to create new tag on main:', err);
                alert(`❌ Erreur lors de la création du nouveau tag sur la branche main pour le projet '${project.name}'`);
              }
            });
          },
          error: (err) => {
            console.error('Failed to merge branch into main:', err);
            alert(`❌ Erreur lors de la fusion de la branche '${branchToMerge.name}' sur la branche main du projet '${project.name}'`);
          }
        });
      } else {
        // No commits to merge, display the last tag of main in green
        const lastTag = this.lastTags()[project.id] || '—';
        alert(`✅ Aucun commit à fusionner. Dernier tag sur main: '${lastTag}'`);
        project._branchTagDiff = [];
        project._lastTag = lastTag; // Store the last tag separately
        this.projects.set([...this.projects()]);
        this.cdr.detectChanges();
      }

      // Always display the last tag in green, even if no changes were made
      const lastTag = this.lastTags()[project.id] || '—';
      project._lastTag = lastTag;
      this.projects.set([...this.projects()]);
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Failed to fetch branches:', err);
      alert(`❌ Erreur lors de la récupération des branches pour le projet '${project.name}'`);
    }
  });
}
}
