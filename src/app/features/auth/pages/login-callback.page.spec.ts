import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginCallbackPage } from './login-callback.page';

describe('LoginCallbackPage', () => {
  let component: LoginCallbackPage;
  let fixture: ComponentFixture<LoginCallbackPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginCallbackPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginCallbackPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
