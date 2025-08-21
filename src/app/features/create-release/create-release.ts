import { Component, signal } from '@angular/core';
import { QuillModule } from 'ngx-quill';
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

  // Quill
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['link', 'image'],
      ['clean']
    ]
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
            if (checked && !this.tagsParProjet()[p.id]) {
              this.chargerTagsPourProjet(p.id);
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

  /** Étape suivante */
  onDepotsStepNext() {
    const selected = this.depotsFormArray.controls
      .map((ctrl, idx) => (ctrl.value ? this.projets()[idx].id : null))
      .filter((id): id is number => id !== null);

    this.projetsSelectionnes.set(selected);
    this.onSelectionDepotsChange();
  }

  /** Charger les tags des dépôts sélectionnés */
  private onSelectionDepotsChange() {
    this.projetsSelectionnes().forEach((id) => {
      if (!this.tagsParProjet()[id]) this.chargerTagsPourProjet(id);
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

    const releaseData = {
      name: this.releaseName,
      description: this.description,  // ✅ string
      author: authorName,
      changelogGlobal: this.description,
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
}
