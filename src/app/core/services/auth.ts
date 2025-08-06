import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'access_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'user_info';

  saveAuthData(data: { access_token: string; refresh_token?: string; user: any }): void {
    localStorage.setItem(this.tokenKey, data.access_token);
    if (data.refresh_token) {
      localStorage.setItem(this.refreshTokenKey, data.refresh_token);
    }
    localStorage.setItem(this.userKey, JSON.stringify(data.user));
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): any {
    try {
      const user = localStorage.getItem(this.userKey);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  logout(): void {
    console.log('🚪 Déconnexion en cours...');
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
