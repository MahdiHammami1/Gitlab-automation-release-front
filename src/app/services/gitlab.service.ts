import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Project } from '../models/gitlab-project.model';

export interface GitLabIdentity {
  provider: string;
  extern_uid: string;
  saml_provider_id: string | null;
}

export interface GitLabMe {
  id: number;
  username: string;
  public_email: string | null;
  name: string;
  state: 'active' | 'blocked' | 'deactivated' | string;
  locked: boolean;
  avatar_url: string | null;
  web_url: string;
  created_at: string;
  bio: string;
  location: string;
  linkedin: string;
  twitter: string;
  discord: string;
  website_url: string;
  github: string;
  job_title: string;
  pronouns: string | null;
  organization: string;
  bot: boolean;
  work_information: unknown | null;
  local_time: string | null;
  last_sign_in_at: string | null;
  confirmed_at: string | null;
  last_activity_on: string | null;   // ISO date (YYYY-MM-DD)
  email: string | null;
  theme_id: number;
  color_scheme_id: number;
  projects_limit: number;
  current_sign_in_at: string | null;
  identities: GitLabIdentity[];
  can_create_group: boolean;
  can_create_project: boolean;
  two_factor_enabled: boolean;
  external: boolean;
  private_profile: boolean;
  commit_email: string | null;
  preferred_language: string | null;
  shared_runners_minutes_limit: number | null;
  extra_shared_runners_minutes_limit: number | null;
  scim_identities: unknown[];
}


@Injectable({ providedIn: 'root' })
export class GitlabService {
  private http = inject(HttpClient);
  // Change if you already use environments
  private baseUrl = 'http://localhost:3000';

  

  getProjects(): Observable<Project[]> {
    return this.http
      .get<Project[]>(`${this.baseUrl}/gitlab/projects`)
      .pipe(
        catchError((err) => {
          console.error('Failed to load projects', err);
          return throwError(() => new Error('Unable to load projects'));
        })
      );
  }

   getMe(): Observable<GitLabMe> {
    let headers = new HttpHeaders();
    const token = localStorage.getItem('accessToken');
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.get<GitLabMe>(`${this.baseUrl}/gitlab/me`, {
      headers,
      withCredentials: true,
    });
   }

   // Fetch repository tags for a given project. By default returns only the most recent tag (per_page=1).
    getTags(projectId: string | number, per_page: number = 1): Observable<any[]> {
    return this.http
        .get<any[]>(`${this.baseUrl}/gitlab/projects/${projectId}/repository/tags?per_page=${per_page}`)
        .pipe(
        catchError((err) => {
            console.error('Failed to load tags for project', projectId, err);
            return throwError(() => new Error('Unable to load tags'));
        })
        );
    }

      /** Vérifie ou crée un module depuis GitLab */
  createModuleFromGitlab(repoUrl: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/modules/from-gitlab`, { repoUrl });
  }

  /** Vérifie ou crée un tag depuis GitLab */
  createTagFromGitlab(repoUrl: string, tagName: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/tags/from-gitlab`, { repoUrl, tagName });
  }

  /** Crée un moduleRelease */
  createModuleRelease(data: { moduleId: string, tagId: string, releaseId?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/module-releases`, data);
  }

  /** Crée le release global */
  createRelease(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/releases`, data);
  }
}