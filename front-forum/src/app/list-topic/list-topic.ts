import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PostService, Topic, User } from '../post-service';

@Component({
  selector: 'app-list-topic',
  imports: [CommonModule],
  templateUrl: './list-topic.html',
  styleUrl: './list-topic.css'
})
export class ListTopic implements OnInit {
  topics: Topic[] = [];
  loading = true;
  error = '';

  // Pagination state
  page = 1;
  pageSize = 6;
  get totalPages() {
    return Math.ceil(this.topics.length / this.pageSize);
  }
  get paginatedTopics() {
    const start = (this.page - 1) * this.pageSize;
    return this.topics.slice(start, start + this.pageSize);
  }
  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  constructor(private postService: PostService, private router: Router) {}

  get isAuthenticated(): boolean {
    return this.postService.isAuthenticated();
  }

  get currentUser(): User | null {
    return this.postService.getCurrentUser();
  }

  async ngOnInit() {
    await this.loadTopics();
  }

  async loadTopics() {
    try {
      this.loading = true;
      this.topics = await this.postService.getTopics();
      this.error = '';
      this.page = 1;
    } catch (error) {
      console.error('Error loading topics:', error);
      this.error = 'Failed to load topics. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  viewTopic(topicId: string) {
    this.router.navigate(['/topic', topicId]);
  }

  goToAuth() {
    this.router.navigate(['/auth']);
  }

  goToCreateTopic() {
    this.router.navigate(['/create-topic']);
  }

  logout() {
    this.postService.logout();
    this.loadTopics();
  }

  setPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.page = page;
  }
}
