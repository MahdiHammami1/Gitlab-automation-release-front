import { Component, signal, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project-details.html',
  styleUrls: ['./project-details.css']
})
export class ProjectDetails {
  projectId = signal<string | null>(null);
  project = signal<any>(null);
  branches = signal<any[]>([]);
  tags = signal<any[]>([]);
  releases = signal<any[]>([]);
  pipelines = signal<any[]>([]);

  constructor(private route: ActivatedRoute) {
    effect(() => {
      this.projectId.set(this.route.snapshot.paramMap.get('id'));
      if (this.projectId()) {
        this.fetchProject();
        this.fetchBranches();
        this.fetchTags();
        this.fetchReleases();
        this.fetchPipelines();
      }
    });
  }

  fetchProject() {
    fetch(`http://localhost:3000/gitlab/projects/${this.projectId()}`)
      .then(res => res.json())
      .then(data => this.project.set(data));
  }
  fetchBranches() {
    fetch(`http://localhost:3000/gitlab/projects/${this.projectId()}/repository/branches?per_page=2`)
      .then(res => res.json())
      .then(data => this.branches.set(data));
  }
  fetchTags() {
    fetch(`http://localhost:3000/gitlab/projects/${this.projectId()}/repository/tags?per_page=2`)
      .then(res => res.json())
      .then(data => this.tags.set(data));
  }
  fetchReleases() {
    fetch(`http://localhost:3000/gitlab/projects/${this.projectId()}/releases?per_page=2`)
      .then(res => res.json())
      .then(data => this.releases.set(data));
  }
  fetchPipelines() {
    fetch(`http://localhost:3000/gitlab/projects/${this.projectId()}/pipelines?per_page=2`)
      .then(res => res.json())
      .then(data => this.pipelines.set(data));
  }
}
