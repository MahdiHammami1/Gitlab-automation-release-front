import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  showPassword = false;
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkForErrors();
    this.checkIfAlreadyAuthenticated();
  }

  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  private checkForErrors(): void {
    this.route.queryParams.subscribe(params => {
      if (params['error']) {
        this.errorMessage = params['message'] || 'Une erreur est survenue lors de la connexion';
        console.warn('⚠️ Erreur OAuth2:', params['error']);
      }
    });
  }

  private checkIfAlreadyAuthenticated(): void {
    if (this.authService.isAuthenticated()) {
      console.log('✅ Utilisateur déjà connecté, redirection vers dashboard');
      this.router.navigate(['/dashboard']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      try {
        const { email, password, rememberMe } = this.loginForm.value;
        await this.authenticateUser(email, password, rememberMe);
        
        console.log('✅ Login réussi');
        this.router.navigate(['/dashboard']);
      } catch (error) {
        console.error('❌ Login échoué:', error);
        this.handleLoginError(error);
      } finally {
        this.loading = false;
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  async signInWithGitLab(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      console.log('🔐 Démarrage de l\'authentification GitLab...');
      
      // Redirection vers l'endpoint d'authentification
      window.location.href = 'http://localhost:3000/auth/login';
    } catch (error) {
      console.error('❌ Échec OAuth GitLab:', error);
      this.handleLoginError(error);
      this.loading = false;
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    console.log('🔑 Mot de passe oublié cliqué');
    // this.router.navigate(['/forgot-password']);
  }

  onSignUp(event: Event): void {
    event.preventDefault();
    console.log('🆕 Création de compte cliquée');
    // this.router.navigate(['/signup']);
  }

  private async authenticateUser(email: string, password: string, rememberMe: boolean): Promise<void> {
    try {
      // Simulation d'authentification locale
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (email === 'demo@example.com' && password === 'password123') {
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        return;
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      throw error;
    }
  }

  private handleLoginError(error: any): void {
    const errorMessages: { [key: string]: string } = {
      'Invalid credentials': 'Email ou mot de passe invalide',
      'Network error': 'Erreur réseau. Vérifiez votre connexion',
      'oauth2_failure': 'Échec de l\'authentification OAuth2',
      'missing_code': 'Session expirée, veuillez réessayer'
    };

    this.errorMessage = errorMessages[error.message] || 'Une erreur est survenue lors de la connexion';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}