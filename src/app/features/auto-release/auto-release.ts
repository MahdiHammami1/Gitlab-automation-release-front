import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GitlabService } from '../../services/gitlab.service';
import { QuillModule } from 'ngx-quill';
import Quill from 'quill';
import Table from 'quill-table-ui';

// Register table module if not already registered
if ((Quill as any).register && !(Quill as any).imports['modules/table']) {
  Quill.register({ 'modules/table': Table }, true);


}

@Component({
  selector: 'app-auto-release',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, QuillModule],
  templateUrl: './auto-release.html',
  styleUrls: ['./auto-release.css']
})
export class AutoReleaseComponent {

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['link', 'image'],
      ['table'],
      ['clean']
    ],
    table: true
  };
  changelogContent = '';
  // Étape 1 : Nom du release
  step = signal(1);
  releaseName = '';

  // Étape 2 : Sélection tags/repos
  projets = signal<any[]>([]);
  tagsParProjet = signal<Record<number, any[]>>({});
  tagsSelectionnes = signal<{repoId: number, tag: any}[]>([]);
  chargement = signal(false);

  // Called when a tag checkbox is toggled
  onTagToggle(repoId: number, tag: any, checked: boolean) {
    let current = this.tagsSelectionnes();
    if (checked) {
      // Add if not already present
      if (!current.some(sel => sel.repoId === repoId && sel.tag.name === tag.name)) {
        current = [...current, { repoId, tag }];
      }
    } else {
      // Remove
      current = current.filter(sel => !(sel.repoId === repoId && sel.tag.name === tag.name));
    }
    this.tagsSelectionnes.set(current);
    console.log('[DEBUG] onTagToggle', { repoId, tag, checked, tagsSelectionnes: current });
  }

  isTagSelected(repoId: number, tagName: string): boolean {
    return this.tagsSelectionnes().some(sel => sel.repoId === repoId && sel.tag.name === tagName);
  }

  // Étape 3 : Commits par repo
  commitsParProjet = signal<Record<number, any[]>>({});

  // Étape 4 : Liens de téléchargement
  liensTelechargement = signal<{repoId: number, tag: any, url: string}[]>([]);

  constructor(private api: GitlabService, private fb: FormBuilder) {
    this.loadProjets();
  }

  onEnterChangelogStep() {
    // Debug: log selected tags structure
    console.log('[DEBUG] tagsSelectionnes:', this.tagsSelectionnes());
    // Pré-remplir l'éditeur avec une version en texte brut
    this.changelogContent = this.generateChangelogPlaintext();
    console.log('[DEBUG] Changelog markdown:', this.changelogContent);
  }

  generateChangelogMarkdown(): string {
    let md = '<b>Changelog automatique</b><br>\n';
    // Group tags by repo
    const tagsByRepo: Record<number, any[]> = {};
    for (const sel of this.tagsSelectionnes()) {
      if (!tagsByRepo[sel.repoId]) tagsByRepo[sel.repoId] = [];
      tagsByRepo[sel.repoId].push(sel.tag);
    }
    for (const repoIdStr of Object.keys(tagsByRepo)) {
      const repoId = Number(repoIdStr);
      const repoName = this.getProjetNameById(repoId);
      // Sous-titre : nom du repo inclus
      md += `<div style=\"margin-top:10px;\"><b>Nom du repo inclus :</b> ${repoName}</div>\n`;
      for (const tag of tagsByRepo[repoId]) {
        // Tableau des commits pour ce tag
        const commits = (this.commitsParProjet()[repoId] || []).filter((c: any) => c.tag_name === tag.name);
        md += `<div style=\"margin-top:5px;\"><b>Tag :</b> <code>${tag.name}</code></div>\n`;
        if (commits.length) {
          md += '<table border=\"1\" cellpadding=\"4\" style=\"border-collapse:collapse;margin-top:5px;\">';
          md += '<thead><tr><th>Ref</th><th>Titre du commit</th></tr></thead><tbody>';
          for (const c of commits) {
            md += `<tr><td><code>${c.short_id || c.id?.substring(0,8) || ''}</code></td><td>${c.title}</td></tr>`;
          }
          md += '</tbody></table>\n';
        } else {
          md += '<div style=\"color:gray;\">Aucun commit trouvé pour ce tag.</div>\n';
        }
      }
    }
    return md;
  }

  generateChangelogPlaintext(): string {
    // Build HTML so Quill renders bold and line breaks
    let html = '<b>Changelog automatique</b><br><br>';
    html += '<div><b>Nom du repo inclus</b></div><br>';
    // Group tags by repo
    const tagsByRepo: Record<number, any[]> = {};
    for (const sel of this.tagsSelectionnes()) {
      if (!tagsByRepo[sel.repoId]) tagsByRepo[sel.repoId] = [];
      tagsByRepo[sel.repoId].push(sel.tag);
    }
    for (const repoIdStr of Object.keys(tagsByRepo)) {
      const repoId = Number(repoIdStr);
      const repoName = this.getProjetNameById(repoId);
      html += `<div style="margin-top:8px;"><b>${repoName}</b></div>`;
      for (const tag of tagsByRepo[repoId]) {
        html += `<div>Tag: <code>${tag.name}</code></div>`;
        const commits = (this.commitsParProjet()[repoId] || []).filter((c: any) => c.tag_name === tag.name);
        if (commits.length) {
          for (const c of commits) {
            const ref = c.short_id || (c.id ? c.id.substring(0, 8) : '');
            html += `<div>&nbsp;&nbsp;<code>${ref}</code> | ${c.title}</div>`;
          }
        } else {
          html += '<div>&nbsp;&nbsp;Aucun commit trouvé pour ce tag.</div>';
        }
        // blank line after each tag
        html += '<br>';
      }
      // blank line after each repo
      html += '<br>';
    }
    return html;
  }

  getDownloadUrl(repoId: number, tagName: string): string {
    // URL GitLab pour télécharger un tag sous forme d'archive zip
    return `https://gitlab.com/api/v4/projects/${repoId}/repository/archive.zip?sha=${tagName}`;
  }


  getProjetNameById(id: number): string {
    const projet = this.projets().find((p: any) => p.id === id);
    return projet ? projet.name : '';
  }

  loadProjets() {
    this.chargement.set(true);
    this.api.getProjects().subscribe({
      next: (projets) => {
        this.projets.set(projets);
        projets.forEach((p: any) => this.loadTags(p.id));
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false)
    });
  }

   hasFilteredTags(projetId: number): boolean {
    const tags = this.tagsParProjet()[projetId];
    return Array.isArray(tags) && tags.length > 0;
  }

  async loadTags(repoId: number) {
    // Récupérer la date du dernier release global (créé via l'application)
    let lastReleaseDate: Date | null = null;
    try {
      const releases = await (this.api as any).http.get('http://localhost:3000/releases').toPromise();
      if (Array.isArray(releases) && releases.length) {
        lastReleaseDate = releases
          .map((r: any) => new Date(r.createdAt || r.created_at))
          .reduce((max: Date, d: Date) => d > max ? d : max, new Date(0));
      }
    } catch {}
    console.log('[DEBUG] lastReleaseDate utilisée pour filtrer les tags:', lastReleaseDate);
    this.api.getTags(repoId, 100).subscribe({
      next: (tags) => {
        let filteredTags = tags;
        if (lastReleaseDate) {
          filteredTags = tags.filter((tag: any) => {
            // Prendre la date la plus fiable du tag
            const tagDate = tag.created_at ? new Date(tag.created_at) : (tag.commit?.created_at ? new Date(tag.commit.created_at) : null);
            console.log('[DEBUG] Tag:', tag.name, 'tagDate:', tagDate, 'lastReleaseDate:', lastReleaseDate, 'isAfter:', tagDate && tagDate.getTime() > lastReleaseDate!.getTime());
            return tagDate && tagDate.getTime() > lastReleaseDate!.getTime();
          });
        }
        console.log('[DEBUG] Tags filtrés pour repo', repoId, ':', filteredTags.map((t: any) => t.name));
        this.tagsParProjet.set({ ...this.tagsParProjet(), [repoId]: filteredTags });

        // Sélectionner le tag le plus récent (par date de création) par défaut s'il existe
        if (filteredTags.length > 0) {
          // Trouver le tag avec la date de création la plus récente
          let latestTag = filteredTags[0];
          let latestDate = getTagDate(filteredTags[0]);
          for (const tag of filteredTags) {
            const tagDate = getTagDate(tag);
            if (tagDate && (!latestDate || tagDate > latestDate)) {
              latestTag = tag;
              latestDate = tagDate;
            }
          }
          // Vérifier si déjà sélectionné
          const current = this.tagsSelectionnes();
          if (!current.some(sel => sel.repoId === repoId && sel.tag.name === latestTag.name)) {
            this.tagsSelectionnes.set([...current, { repoId, tag: latestTag }]);
          }
        }
        // Fonction utilitaire pour extraire la date d'un tag
        function getTagDate(tag: any): Date | null {
          return tag.created_at ? new Date(tag.created_at) : (tag.commit?.created_at ? new Date(tag.commit.created_at) : null);
        }
      }
    });
  }

  // Charger les commits pour chaque tag sélectionné après le dernier release global
  async chargerCommitsPourTagsSelectionnes() {
    // 1. Récupérer la date du dernier release global (créé via l'application)
    let lastReleaseDate: Date | null = null;
    try {
      const releases = await (this.api as any).http.get('http://localhost:3000/releases').toPromise();
      if (Array.isArray(releases) && releases.length) {
        lastReleaseDate = releases
          .map((r: any) => new Date(r.createdAt || r.created_at))
          .reduce((max: Date, d: Date) => d > max ? d : max, new Date(0));
      }
    } catch {}
    const tagsSelectionnes = this.tagsSelectionnes();
    tagsSelectionnes.forEach(sel => {
      this.api.getAllCommits(sel.repoId).subscribe({
        next: (commits: any[]) => {
          let filteredCommits = commits;
          if (lastReleaseDate) {
            filteredCommits = commits.filter((c: any) => new Date(c.created_at) > lastReleaseDate!);
          }
          this.commitsParProjet.set({ ...this.commitsParProjet(), [sel.repoId]: filteredCommits });
        }
      });
    });
  }

  onCreateRelease() {
    (async () => {
      const tagsSelectionnes = this.tagsSelectionnes();
      const moduleReleases: { moduleId: string; tagId: string }[] = [];
      for (const sel of tagsSelectionnes) {
        // Créer le module à partir du repoId
        const projet = this.projets().find((p: any) => p.id === sel.repoId);
        if (!projet) continue;
        let moduleRes, tagRes;
        try {
          moduleRes = await this.api.createModuleFromGitlab(projet.web_url).toPromise();
          tagRes = await this.api.createTagFromGitlab(projet.web_url, sel.tag.name).toPromise();
        } catch (err) {
          alert('Erreur lors de la création du module ou du tag pour ' + projet.name);
          console.error('[DEBUG] Module/Tag creation error:', err);
          return;
        }
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

      // Utiliser le contenu Quill (HTML) pour le changelog
      let changelogHtml = '';
      try {
        const quillEditor = document.querySelector('.ql-editor');
        if (quillEditor) {
          changelogHtml = quillEditor.innerHTML;
        } else {
          changelogHtml = this.changelogContent; // fallback
        }
      } catch {
        changelogHtml = this.changelogContent;
      }

      const releaseData = {
        name: this.releaseName,
        description: changelogHtml,
        author: authorName,
        changelogGlobal: changelogHtml,
        moduleReleases
      };

      try {
        await this.api.createRelease(releaseData).toPromise();
        alert('Release créé avec succès !');
      } catch (err) {
        alert('Erreur lors de la création du release.');
        console.error('[DEBUG] Release creation error:', err);
      }
    })();
  }
}
