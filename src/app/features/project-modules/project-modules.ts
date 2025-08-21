import { Component, signal, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-project-modules',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-modules.html',
  styleUrls: ['./project-modules.css']
})
export class ProjectModules {
  projectId = signal<string | null>(null);
  modules = signal<any[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private route: ActivatedRoute) {
    effect(() => {
      this.projectId.set(this.route.snapshot.paramMap.get('id'));
      if (this.projectId()) {
        this.fetchModules();
      }
    });
  }

  async fetchModules() {
    this.loading.set(true);
    this.error.set(null);
    try {
      // Fetch release.config.json (raw)
      const configRes = await fetch(`http://localhost:3000/gitlab/projects/${this.projectId()}/release-config`);
      const configText = await configRes.text();
      const config = JSON.parse(configText);
      const modules = Array.isArray(config.modules) ? config.modules : [];
      // For each module, fetch last tag, last commit, and if there are untagged changes
      const moduleInfos = await Promise.all(modules.map(async (mod: any) => {
        // Example: fetch last tag (simulate, adapt as needed)
        const tagsRes = await fetch(`http://localhost:3000/gitlab/projects/${this.projectId()}/repository/tags?search=${mod.name}&per_page=1`);
        const tags = await tagsRes.json();
        const lastTag = tags[0]?.name || null;
        // Example: fetch last commit (simulate, adapt as needed)
        const commitsRes = await fetch(`http://localhost:3000/gitlab/projects/${this.projectId()}/repository/commits?path=${mod.path}&per_page=1`);
        const commits = await commitsRes.json();
        const lastCommit = commits[0] || null;
        // Check if last commit is tagged
        const untagged = lastTag && lastCommit ? lastTag !== lastCommit.title : true;
        return {
          ...mod,
          lastTag,
          lastCommit,
          untagged
        };
      }));
      this.modules.set(moduleInfos);
    } catch (e: any) {
      this.error.set('Erreur lors du chargement des modules.');
    } finally {
      this.loading.set(false);
    }
  }
}
