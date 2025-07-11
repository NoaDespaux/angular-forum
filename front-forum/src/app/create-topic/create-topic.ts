import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PostService } from '../post-service';

@Component({
  selector: 'app-create-topic',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './create-topic.html',
  styleUrl: './create-topic.css'
})
export class CreateTopic {
  private postService = inject(PostService);
  private router = inject(Router);

  title = '';
  description = '';
  content = '';
  isLoading = false;
  error = '';

  get isAuthenticated(): boolean {
    return this.postService.isAuthenticated();
  }

  async onSubmit(): Promise<void> {
    if (!this.isAuthenticated) {
      this.error = 'You must be logged in to create a topic';
      return;
    }

    if (!this.title.trim()) {
      this.error = 'Title is required';
      return;
    }

    if (!this.content.trim()) {
      this.error = 'Content is required';
      return;
    }

    this.isLoading = true;
    this.error = '';

    try {
      const topic = await this.postService.createTopic(
        this.title.trim(),
        this.description.trim(),
        this.content.trim()
      );

      if (topic) {
        await this.router.navigate(['/topic', topic.id]);
      } else {
        this.error = 'Failed to create topic. Please try again.';
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to create topic';
    } finally {
      this.isLoading = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/']);
  }
}
