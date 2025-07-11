import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PostService, User } from '../post-service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {
  private postService = inject(PostService);
  private router = inject(Router);

  email = '';
  password = '';
  isLoading = false;
  error = '';

  get isAuthenticated(): boolean {
    return this.postService.isAuthenticated();
  }

  get currentUser(): User | null {
    return this.postService.getCurrentUser();
  }

  async onLogin(): Promise<void> {
    if (!this.email || !this.password) {
      this.error = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.error = '';

    try {
      const success = await this.postService.login(this.email, this.password);
      if (success) {
        await this.router.navigate(['/']);
      } else {
        this.error = 'Invalid email or password';
      }
    } catch (error) {
      this.error = 'Login failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  onLogout(): void {
    this.postService.logout();
    this.router.navigate(['/']);
  }
}
