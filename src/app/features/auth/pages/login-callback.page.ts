import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-auth-callback',
  template: `<p>Connexion en cours...</p>`
})
export class LoginCallbackPage implements OnInit {

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        localStorage.setItem('access_token', token);
        this.router.navigate(['/dashboard']);
      } else {
        console.error('Aucun token trouvé dans l’URL.');
       
      }
    });
  }
}
