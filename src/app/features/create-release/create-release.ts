import { Component, signal } from '@angular/core';
import TurndownService from 'turndown';
import { QuillModule } from 'ngx-quill';
import Quill from 'quill';
import Table from 'quill-table-ui';
import { CommonModule } from '@angular/common';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GitlabService } from '../../services/gitlab.service';
import { AuthService } from '../../core/services/auth';

// Enregistrement du module table si ce n'est pas déjà fait
if ((Quill as any).register && !(Quill as any).imports['modules/table']) {
  Quill.register({ 'modules/table': Table }, true);
}

@Component({
  selector: 'app-create-release',
  standalone: true,
  imports: [
    CommonModule,
    MatStepperModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    QuillModule
  ],
  templateUrl: './create-release.html',
  styleUrls: ['./create-release.css']
})
export class CreateReleaseComponent {
  /** Retourne le nom du projet à partir de son id */
  getProjetNameById(id: number): string {
    const projet = this.projets().find((p: any) => p.id === id);
    return projet ? projet.name : '';
  }
  releaseName = '';
  description: string = '';   // ✅ une seule fois

  // Dépôts
  projets = signal<any[]>([]);
  projetsSelectionnes = signal<number[]>([]);
  chargementProjets = signal(false);
  depotsFormArray: FormArray<FormControl<boolean>>;

  // Tags
  tagsParProjet = signal<Record<number, any[]>>({});
  tagsSelectionnes = signal<Record<number, string>>({});
  chargementTags = signal<Record<number, boolean>>({});

  // Commits
  commitsParProjet = signal<Record<number, any[]>>({});
  chargementCommits = signal<Record<number, boolean>>({});

  // Quill
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['link', 'image'],
      ['table'], // Ajout du bouton table
      ['clean']
    ],
    table: true // Activation du module table
  };

  // Stepper
  step = signal(0);

  constructor(private fb: FormBuilder, private api: GitlabService, private auth: AuthService) {
    this.depotsFormArray = this.fb.array<FormControl<boolean>>([]);
    this.loadProjets();
  }

  /** Charger les dépôts depuis GitLab */
  private loadProjets() {
    this.chargementProjets.set(true);
    this.api.getProjects().subscribe({
      next: (projets) => {
        this.projets.set(projets);
        this.depotsFormArray.clear();

        projets.forEach((p) => {
          const ctrl = this.fb.control<boolean>(false, { nonNullable: true });

          ctrl.valueChanges.subscribe((checked) => {
            if (checked) {
              if (!this.tagsParProjet()[p.id]) {
                this.chargerTagsPourProjet(p.id);
              }
              this.chargerCommitsPourProjet(p.id);
            } else {
              // Si décoché, on peut vider les commits affichés
              this.commitsParProjet.set({ ...this.commitsParProjet(), [p.id]: [] });
            }
          });

          this.depotsFormArray.push(ctrl);
          this.chargerTagsPourProjet(p.id);
        });

        this.chargementProjets.set(false);
      },
      error: () => this.chargementProjets.set(false)
    });
  }

  /** Charger les tags d’un projet */
  chargerTagsPourProjet(id: number) {
    this.chargementTags.set({ ...this.chargementTags(), [id]: true });

    this.api.getTags(id, 100).subscribe({
      next: (tags) => {
        this.tagsParProjet.set({ ...this.tagsParProjet(), [id]: tags });
        this.chargementTags.set({ ...this.chargementTags(), [id]: false });
      },
      error: () => this.chargementTags.set({ ...this.chargementTags(), [id]: false })
    });
  }

  /** Charger tous les commits pour chaque projet sélectionné, mais n'afficher que ceux après la date du dernier release (release.created_at) */
  chargerCommitsPourProjet(id: number) {
    this.chargementCommits.set({ ...this.chargementCommits(), [id]: true });
    this.api.getAllCommits(id).subscribe({
      next: (commits) => {
        // 2. Récupérer les releases pour ce projet
    (this.api as any).http.get(`http://localhost:3000/gitlab/projects/${id}/releases`).subscribe({
          next: (releases: any[]) => {
            let lastReleaseDate: Date | null = null;
            if (releases && releases.length) {
              // On prend la date de création du dernier release
              lastReleaseDate = new Date(releases[0].created_at);
            }
            // Fallback sur le tag si aucun release n'existe
            if (!lastReleaseDate) {
              this.api.getTags(id, 1).subscribe({
                next: (tags) => {
                  if (tags && tags.length && tags[0].commit && tags[0].commit.created_at) {
                    lastReleaseDate = new Date(tags[0].commit.created_at);
                  }
                  let filteredCommits = commits;
                  if (lastReleaseDate !== null) {
                    filteredCommits = commits.filter((c: any) => new Date(c.created_at) > (lastReleaseDate as Date));
                  }
                  this.commitsParProjet.set({ ...this.commitsParProjet(), [id]: filteredCommits });
                  this.chargementCommits.set({ ...this.chargementCommits(), [id]: false });
                },
                error: () => {
                  this.commitsParProjet.set({ ...this.commitsParProjet(), [id]: commits });
                  this.chargementCommits.set({ ...this.chargementCommits(), [id]: false });
                }
              });
            } else {
              let filteredCommits = commits;
              if (lastReleaseDate !== null) {
                filteredCommits = commits.filter((c: any) => new Date(c.created_at) > (lastReleaseDate as Date));
              }
              this.commitsParProjet.set({ ...this.commitsParProjet(), [id]: filteredCommits });
              this.chargementCommits.set({ ...this.chargementCommits(), [id]: false });
            }
          },
          error: () => {
            // Si erreur releases, fallback sur tags puis tous les commits
            this.api.getTags(id, 1).subscribe({
              next: (tags) => {
                let lastReleaseDate: Date | null = null;
                if (tags && tags.length && tags[0].commit && tags[0].commit.created_at) {
                  lastReleaseDate = new Date(tags[0].commit.created_at);
                }
                let filteredCommits = commits;
                if (lastReleaseDate !== null) {
                  filteredCommits = commits.filter((c: any) => new Date(c.created_at) > (lastReleaseDate as Date));
                }
                this.commitsParProjet.set({ ...this.commitsParProjet(), [id]: filteredCommits });
                this.chargementCommits.set({ ...this.chargementCommits(), [id]: false });
              },
              error: () => {
                this.commitsParProjet.set({ ...this.commitsParProjet(), [id]: commits });
                this.chargementCommits.set({ ...this.chargementCommits(), [id]: false });
              }
            });
          }
        });
      },
      error: () => this.chargementCommits.set({ ...this.chargementCommits(), [id]: false })
    });
  }

  /** Étape suivante */
  onDepotsStepNext() {
    const selected = this.depotsFormArray.controls
      .map((ctrl, idx) => (ctrl.value ? this.projets()[idx].id : null))
      .filter((id): id is number => id !== null);

    this.projetsSelectionnes.set(selected);
    this.onSelectionDepotsChange();
  }

  /** Charger les tags et commits des dépôts sélectionnés */
  private onSelectionDepotsChange() {
    this.projetsSelectionnes().forEach((id) => {
      if (!this.tagsParProjet()[id]) this.chargerTagsPourProjet(id);
      this.chargerCommitsPourProjet(id);
    });
  }

  /** Quill */
  onQuillChange(content: string) {
    this.description = content;  // ✅ direct
  }

  /** Soumission finale */
  async onSoumettre() {
    const depots = this.projets().filter((_, i) => this.depotsFormArray.at(i).value);
    const moduleReleases: { moduleId: string; tagId: string }[] = [];

    for (const depot of depots) {
      const moduleRes = await this.api.createModuleFromGitlab(depot.web_url).toPromise();
      const tagName = this.tagsSelectionnes()[depot.id];
      const tagRes = await this.api.createTagFromGitlab(depot.web_url, tagName).toPromise();

      try {
        await this.api.createModuleRelease({ moduleId: moduleRes.id, tagId: tagRes.id }).toPromise();
      } catch (err: any) {
        if (!err?.error?.message?.includes('already exists')) throw err;
      }

      moduleReleases.push({ moduleId: moduleRes.id, tagId: tagRes.id });
    }

    // Auteur
    let authorName = 'Utilisateur';
    try {
      const meRes = await this.api.getMe().toPromise();
      authorName = meRes?.name || meRes?.username || authorName;
    } catch {}

    // Utiliser le HTML Quill directement pour garder la mise en forme
    const html = this.description;

    const releaseData = {
      name: this.releaseName,
      description: html,  // HTML riche
      author: authorName,
      changelogGlobal: html,
      moduleReleases
    };

    try {
      await this.api.createRelease(releaseData).toPromise();
      alert('✅ Release créé avec succès !');
    } catch (err) {
      console.error('Erreur lors de la création du release:', err);
      alert('❌ Erreur lors de la création du release.');
    }
  }

  /** Vérifie et effectue une fusion si nécessaire via le bouton 'Créer sur main' */
  async onCreerSurMain(): Promise<void> {
    const depots = this.projets().filter((_, i) => this.depotsFormArray.at(i).value);

    for (const depot of depots) {
      const projectId = depot.id;
      const branchName = this.tagsSelectionnes()[projectId];

      try {
        const branches = await this.api.getBranches(projectId).toPromise();

        if (!branches) {
          alert(`❌ Impossible de récupérer les branches pour le projet ${depot.name}`);
          continue;
        }

        const mainBranch = branches.find((b: any) => b.name === 'main');

        if (!mainBranch) {
          alert(`❌ La branche principale 'main' est introuvable pour le projet ${depot.name}`);
          continue;
        }

        const mergeRequestExists = branches.some((b: any) => b.name === branchName && b.merge_request); // Vérifie si une MR existe

        if (mergeRequestExists) {
          await this.api.updateMainFromBranch(projectId, branchName).toPromise();
          alert(`✅ Fusion effectuée avec succès pour le projet ${depot.name}`);
        } else {
          alert(`❌ Aucun changement à fusionner pour le projet ${depot.name}`);
        }
      } catch (err) {
        console.error(`Erreur lors de la vérification ou de la fusion pour le projet ${depot.name}:`, err);
        alert(`❌ Erreur lors de la vérification ou de la fusion pour le projet ${depot.name}`);
      }
    }
  }
}
