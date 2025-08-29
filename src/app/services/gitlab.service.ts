import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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

    /** Récupère toutes les branches d'un projet GitLab */
  getBranches(projectId: string | number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/gitlab/projects/${projectId}/repository/branches`).pipe(
      catchError((err) => {
        console.error('Failed to load branches for project', projectId, err);
        return throwError(() => new Error('Unable to load branches'));
      })
    );
  }
  
  /** Crée un tag sur la branche main pour un projet (utilise le endpoint de création de tag GitLab) */
  createTagOnMain(projectId: number, tagName: string) {
    const encodedId = encodeURIComponent(String(projectId));
    const backendUrl = `${this.baseUrl}/gitlab/projects/${encodedId}/repository/tags`;
    const backendDeleteUrl = `${this.baseUrl}/gitlab/projects/${encodedId}/repository/tags/${encodeURIComponent(tagName)}`;

    const doBackendPost = () => this.http.post(backendUrl, { tag_name: tagName, ref: 'main' });

    const token = localStorage.getItem('accessToken');
    const gitlabUrl = `https://gitlab.com/api/v4/projects/${encodedId}/repository/tags`;
    const gitlabDeleteUrl = `https://gitlab.com/api/v4/projects/${encodedId}/repository/tags/${encodeURIComponent(tagName)}`;
    const gitlabHeaders = token
      ? new HttpHeaders({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'PRIVATE-TOKEN': token })
      : new HttpHeaders({ 'Content-Type': 'application/json' });

    const doGitlabPost = () => this.http.post(gitlabUrl, { tag_name: tagName, ref: 'main' }, { headers: gitlabHeaders });
    const doGitlabDeleteThenPost = () => this.http.delete(gitlabDeleteUrl, { headers: gitlabHeaders }).pipe(
      switchMap(() => doGitlabPost()),
      catchError((delErr) => {
        const msg = `Failed to delete existing tag on GitLab for project ${projectId}: ${delErr?.status} ${delErr?.statusText}`;
        console.error(msg, delErr);
        return throwError(() => new Error(msg));
      })
    );

    // Try backend first
    return doBackendPost().pipe(
      catchError((err: any) => {
        const errBody = err?.error ? (typeof err.error === 'string' ? err.error : JSON.stringify(err.error)) : '';

        // If backend says tag already exists: try delete on backend then recreate, else fallback to GitLab
        if (err?.status === 400 && errBody && errBody.includes('already exists')) {
          return this.http.delete(backendDeleteUrl).pipe(
            switchMap(() => doBackendPost()),
            catchError((backendDelErr) => {
              // Backend delete failed or backend doesn't support delete: try direct GitLab flow
              console.warn('Backend delete failed, falling back to direct GitLab delete+create', backendDelErr);
              if (!token) {
                const message = 'Backend unable to delete existing tag and no accessToken in localStorage to fallback to GitLab API.';
                console.error(message);
                return throwError(() => new Error(message));
              }
              return doGitlabDeleteThenPost();
            })
          );
        }

        // Backend missing endpoint or not implemented -> try direct GitLab
        if (err?.status === 404 || err?.status === 501 || err?.status === 405 || (errBody && errBody.includes('Not Found'))) {
          if (!token) {
            const message = 'Fallback to GitLab API requires a personal access token in localStorage under "accessToken".';
            console.error(message);
            return throwError(() => new Error(message));
          }

          // Try direct POST; if tag exists, delete then recreate
          return doGitlabPost().pipe(
            catchError((e: any) => {
              const bodyMsg = e?.error ? (typeof e.error === 'string' ? e.error : JSON.stringify(e.error)) : '';
              if (e?.status === 400 && bodyMsg && bodyMsg.includes('already exists')) {
                return doGitlabDeleteThenPost();
              }
              const message = `Unable to create tag on main (fallback) for project ${projectId}: ${e?.status} ${e?.statusText} ${bodyMsg ? '\n' + bodyMsg : ''}`;
              console.error(message, e);
              return throwError(() => new Error(message));
            })
          );
        }

        return throwError(() => err);
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

  /** Récupère tous les commits pour un projet */
  getAllCommits(projectId: string | number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/gitlab/projects/${projectId}/commits`).pipe(
      catchError((err) => {
        console.error('Failed to load all commits for project', projectId, err);
        return throwError(() => new Error('Unable to load all commits'));
      })
    );
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
  /** Récupère les commits depuis le dernier release pour un projet */
  getCommitsSinceLastRelease(projectId: string | number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/gitlab/projects/${projectId}/commits/since-last-release`).pipe(
      catchError((err) => {
        console.error('Failed to load commits for project', projectId, err);
        return throwError(() => new Error('Unable to load commits'));
      })
    );
  }

  /** Met à jour la branche main depuis une branche donnée */
  updateMainFromBranch(projectId: string, branch: string): Observable<string> {
    const url = `${this.baseUrl}/update-main/${projectId}/${branch}`;
    return this.http.post<string>(url, {}).pipe(
      catchError((err) => {
        console.error(`Failed to update main branch for project ${projectId} from branch ${branch}`, err);
        return throwError(() => new Error('Unable to update main branch'));
      })
    );
  }

  /**
   * Creates merge requests for unmerged branches in a project.
   * @param projectId The ID of the project.
   */
  mergeUnmergedBranches(projectId: string): Observable<any> {
    const url = `${this.baseUrl}/gitlab/projects/${projectId}/merge-unmerged-branches`;
    return this.http.post<any>(url, {}).pipe(
      catchError((err) => {
        console.error(`Failed to create merge requests for unmerged branches in project ${projectId}`, err);
        return throwError(() => new Error('Unable to create merge requests for unmerged branches'));
      })
    );
  }

  /**
   * Updates the main branch for a project.
   * @param projectId The ID of the project.
   * @param branch The branch to merge into the main branch.
   */
  updateMain(projectId: string, branch: string): Observable<string> {
    const url = `${this.baseUrl}/gitlab/update-main/${projectId}/${branch}`;
    return this.http.post(url, {}, { responseType: 'text' }).pipe(
      catchError((err) => {
        console.error(`Failed to update main branch for project ${projectId} from branch ${branch}`, err);
        return throwError(() => new Error('Unable to update main branch'));
      })
    );
  }
}