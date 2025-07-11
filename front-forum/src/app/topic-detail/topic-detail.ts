import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {Post, PostService, Topic} from '../post-service';

@Component({
  selector: 'app-topic-detail',
  imports: [CommonModule, FormsModule],
  templateUrl: './topic-detail.html',
  styleUrl: './topic-detail.css'
})
export class TopicDetail implements OnInit {
  topic: Topic | null = null;
  posts: Post[] = [];
  loading = true;
  error = '';
  topicId = '';
  currentUserId: string | null = null;

  newPostContent = '';
  isCreatingPost = false;
  postError = '';

  isEditingTopic = false;
  editTopicTitle = '';
  editTopicContent = '';
  editTopicError = '';

  editingPostId: string | null = null;
  editPostContent = '';
  editPostError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: PostService
  ) {}

  get isAuthenticated(): boolean {
    return this.postService.isAuthenticated();
  }

  async ngOnInit() {
    this.topicId = this.route.snapshot.paramMap.get('id') || '';
    this.currentUserId = this.postService.getCurrentUser()?.id || null;
    if (this.topicId) {
      await this.loadTopicAndPosts();
    } else {
      this.error = 'Topic ID not found';
      this.loading = false;
    }
  }

  async loadTopicAndPosts() {
    try {
      this.loading = true;
      this.error = '';
      this.topic = await this.postService.getTopic(this.topicId);
      // Fetch all posts for the topic (no pagination)
      let posts = await this.postService.getAllPostsByTopic(this.topicId);
      // Sort posts so the most recent is first
      posts = posts.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      this.posts = posts;
    } catch (error) {
      console.error('Error loading topic and posts:', error);
      this.error = 'Failed to load topic details. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async onCreatePost(): Promise<void> {
    if (!this.isAuthenticated) {
      this.postError = 'You must be logged in to create a post';
      return;
    }
    if (!this.newPostContent.trim()) {
      this.postError = 'Post content is required';
      return;
    }
    this.isCreatingPost = true;
    this.postError = '';
    try {
      const post = await this.postService.createPost(this.topicId, this.newPostContent.trim());
      if (post) {
        this.posts = [post, ...this.posts];
        this.newPostContent = '';
      } else {
        this.postError = 'Failed to create post. Please try again.';
      }
    } catch (error) {
      this.postError = error instanceof Error ? error.message : 'Failed to create post';
    } finally {
      this.isCreatingPost = false;
    }
  }

  onEditTopic() {
    if (!this.topic) return;
    this.isEditingTopic = true;
    this.editTopicTitle = this.topic.title;
    this.editTopicContent = this.topic.content || '';
    this.editTopicError = '';
  }

  async onSaveEditTopic() {
    if (!this.topic) return;
    if (!this.editTopicTitle.trim() || !this.editTopicContent.trim()) {
      this.editTopicError = 'Title and content are required.';
      return;
    }
    try {
      const updated = await this.postService.updateTopic(this.topic.id, this.editTopicTitle.trim(), this.editTopicContent.trim());
      if (updated) {
        this.topic.title = updated.title;
        this.topic.content = updated.content;
        this.isEditingTopic = false;
      } else {
        this.editTopicError = 'Failed to update topic.';
      }
    } catch (err) {
      this.editTopicError = 'Failed to update topic.';
    }
  }

  onCancelEditTopic() {
    this.isEditingTopic = false;
    this.editTopicError = '';
  }

  async onDeleteTopic() {
    if (!confirm('Are you sure you want to delete this topic?')) return;
    try {
      await this.postService.deleteTopic(this.topicId);
      await this.router.navigate(['/']);
    } catch (err) {
      alert('Failed to delete topic.');
    }
  }
  onEditPost(post: Post) {
    this.editingPostId = post.id;
    this.editPostContent = post.content;
    this.editPostError = '';
  }

  async onSaveEditPost(post: Post) {
    if (!this.editPostContent.trim()) {
      this.editPostError = 'Content is required.';
      return;
    }
    try {
      const updated = await this.postService.updatePost(post.id, this.editPostContent.trim());
      if (updated) {
        post.content = updated.content;
        this.editingPostId = null;
      } else {
        this.editPostError = 'Failed to update post.';
      }
    } catch (err) {
      this.editPostError = 'Failed to update post.';
    }
  }

  onCancelEditPost() {
    this.editingPostId = null;
    this.editPostError = '';
  }

  async onDeletePost(post: Post) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await this.postService.deletePost(post.id);
      this.posts = this.posts.filter(p => p.id !== post.id);
    } catch (err) {
      alert('Failed to delete post.');
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
