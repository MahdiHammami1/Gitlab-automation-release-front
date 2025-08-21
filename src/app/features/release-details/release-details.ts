import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-release-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './release-details.html',
  styleUrls: ['./release-details.css']
})
export class ReleaseDetailsComponent {
  release = signal<any | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private route: ActivatedRoute) {
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) this.fetchRelease(id);
    });
  }

  getRepoName(modRel: any): string {
    const repoUrl = modRel.module?.repoUrl;
    if (repoUrl) {
      const repoMatch = repoUrl.match(/\/([^\/]+)$/);
      return repoMatch ? repoMatch[1] : 'repo';
    }
    return 'repo';
  }

  getDownloadUrl(modRel: any): string {
    const repoUrl = modRel.module?.repoUrl;
    const tagName = modRel.tag?.name;
    if (repoUrl && tagName) {
      const repoName = this.getRepoName(modRel);
      return `${repoUrl}/-/archive/${tagName}/${repoName}-${tagName}.zip`;
    }
    return modRel.tag?.link || '#';
  }
  async fetchRelease(id: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`http://localhost:3000/releases/${id}`);
      if (!res.ok) throw new Error('Erreur de chargement');
      // Si le backend renvoie un buffer/byte array, décoder en string
      const buffer = await res.arrayBuffer();
      // Supposons que le backend encode en UTF-8
      const decoder = new TextDecoder('utf-8');
      const jsonStr = decoder.decode(buffer);
      const data = JSON.parse(jsonStr);
      // Si changelogGlobal est un objet de bytes, le convertir en string
      if (data && data.changelogGlobal && typeof data.changelogGlobal === 'object') {
        // Récupérer les valeurs dans l'ordre des clés
        const byteArr = Object.values(data.changelogGlobal).map(v => Number(v));
        // Convertir en string
        data.changelogGlobal = String.fromCharCode(...byteArr);
      }
      this.release.set(data);
    } catch (e: any) {
      this.error.set(e.message || 'Erreur inconnue');
    } finally {
      this.loading.set(false);
    }
  }
  }
