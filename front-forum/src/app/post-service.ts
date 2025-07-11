import {Injectable} from '@angular/core';
import PocketBase from 'pocketbase';

export interface Topic {
  id: string;
  title: string;
  description?: string;
  content?: string;
  created: string;
  updated: string;
  createdBy: string;
  userName?: string;
}

export interface Post {
  id: string;
  content: string;
  created: string;
  updated: string;
  postedBy: string;
  topic: string;
  userName?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private pb: PocketBase;
  private userCache = new Map<string, string>();
  private readonly CACHE_KEY = 'forum_user_cache';
  private readonly CACHE_EXPIRY_KEY = 'forum_user_cache_expiry';
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  constructor() {
    this.pb = new PocketBase('http://localhost:8090');
    this.loadCacheFromStorage();
  }

  private loadCacheFromStorage(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      const expiry = localStorage.getItem(this.CACHE_EXPIRY_KEY);

      if (cached && expiry) {
        const expiryTime = parseInt(expiry);
        if (Date.now() < expiryTime) {
          const cacheData = JSON.parse(cached);
          this.userCache = new Map(Object.entries(cacheData));
        } else {
          localStorage.removeItem(this.CACHE_KEY);
          localStorage.removeItem(this.CACHE_EXPIRY_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading cache from storage:', error);
    }
  }

  private saveCacheToStorage(): void {
    try {
      const cacheData = Object.fromEntries(this.userCache);
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      localStorage.setItem(this.CACHE_EXPIRY_KEY, (Date.now() + this.CACHE_DURATION).toString());
    } catch (error) {
      console.error('Error saving cache to storage:', error);
    }
  }

  private async authenticate(): Promise<boolean> {
    try {
      if (this.pb.authStore.isValid) {
        return true;
      }

      await this.pb.collection('user').authWithPassword('test@example.com', '12345678');
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  private async fetchMultipleUsers(userIds: string[]): Promise<void> {
    const uncachedUserIds = [...new Set(userIds)].filter(id => id && !this.userCache.has(id));

    if (uncachedUserIds.length === 0) return;

    try {
      try {
        const result = await this.pb.collection('user').getList(1, 200, {
          filter: uncachedUserIds.map(id => `id = "${id}"`).join(' || ')
        });

        result.items.forEach(user => {
          const userName = user['name'] || user['email'] || 'Unknown User';
          this.userCache.set(user.id, userName);
        });

        uncachedUserIds.forEach(id => {
          if (!this.userCache.has(id)) {
            this.userCache.set(id, 'Unknown User');
          }
        });

        this.saveCacheToStorage();
      } catch (unauthorizedError) {
        const isAuthenticated = await this.authenticate();
        if (!isAuthenticated) {
          uncachedUserIds.forEach(id => this.userCache.set(id, 'Unknown User'));
          this.saveCacheToStorage();
          return;
        }

        const result = await this.pb.collection('user').getList(1, 200, {
          filter: uncachedUserIds.map(id => `id = "${id}"`).join(' || ')
        });

        result.items.forEach(user => {
          const userName = user['name'] || user['email'] || 'Unknown User';
          this.userCache.set(user.id, userName);
        });

        uncachedUserIds.forEach(id => {
          if (!this.userCache.has(id)) {
            this.userCache.set(id, 'Unknown User');
          }
        });

        this.saveCacheToStorage();
      }
    } catch (error) {
      console.error('Error fetching multiple users:', error);
      uncachedUserIds.forEach(id => this.userCache.set(id, 'Unknown User'));
      this.saveCacheToStorage();
    }
  }

  async getTopics(): Promise<Topic[]> {
    try {
      try {
        return await this.getTopicsWithUserDetails();
      } catch (unauthorizedError) {
        const isAuthenticated = await this.authenticate();
        if (!isAuthenticated) {
          console.error('Failed to authenticate with PocketBase');
          return [];
        }

        return await this.getTopicsWithUserDetails();
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      return [];
    }
  }

  private async getTopicsWithUserDetails() {
    const result = await this.pb.collection('topic').getList(1, 50, {
      sort: '-created'
    });

    const userIds = result.items.map(item => item['createdBy']).filter(id => id);

    await this.fetchMultipleUsers(userIds);

    return result.items.map((item) => {
      const userName = this.userCache.get(item['createdBy']) || 'Unknown User';

      return {
        id: item.id,
        title: item['title'] || '',
        description: item['description'] || '',
        content: item['content'] || '',
        created: item['created'],
        updated: item['updated'],
        createdBy: item['createdBy'] || '',
        userName: userName
      };
    });
  }

  async getTopic(id: string): Promise<Topic | null> {
    try {
      try {
        return await this.getPostById(id);
      } catch (unauthorizedError) {
        const isAuthenticated = await this.authenticate();
        if (!isAuthenticated) {
          console.error('Failed to authenticate with PocketBase');
          return null;
        }
        return await this.getPostById(id);
      }
    } catch (error) {
      console.error('Error fetching topic:', error);
      return null;
    }
  }

  private async getPostById(id: string) {
    const record = await this.pb.collection('topic').getOne(id);

    await this.fetchMultipleUsers([record['createdBy']]);
    const userName = this.userCache.get(record['createdBy']) || 'Unknown User';

    return {
      id: record.id,
      title: record['title'] || '',
      description: record['description'] || '',
      content: record['content'] || '',
      created: record['created'],
      updated: record['updated'],
      createdBy: record['createdBy'] || '',
      userName: userName
    };
  }

  private async getPostsForTopic(topicId: string, page: number, pageSize: number) {
    const result = await this.pb.collection('post').getList(page, pageSize, {
      filter: `from = "${topicId}"`,
      sort: 'created'
    });

    const userIds = result.items.map(item => item['postedBy']).filter(id => id);
    await this.fetchMultipleUsers(userIds);

    return {
      posts: result.items.map((item) => {
        const userName = this.userCache.get(item['postedBy']) || 'Unknown User';
        return {
          id: item.id,
          content: item['content'] || '',
          created: item['created'],
          updated: item['updated'],
          postedBy: item['postedBy'] || '',
          topic: item['from'] || '',
          userName: userName
        };
      }),
      total: result.totalItems || result.items.length
    };
  }

  async getAllPostsByTopic(topicId: string): Promise<Post[]> {
    try {
      let page = 1;
      const pageSize = 50;
      let allPosts: Post[] = [];
      let hasMore = true;
      while (hasMore) {
        const { posts } = await this.getPostsForTopic(topicId, page, pageSize);
        allPosts = allPosts.concat(posts);
        if (posts.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
      return allPosts;
    } catch (error) {
      console.error('Error fetching all posts for topic:', error);
      return [];
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      await this.pb.collection('user').authWithPassword(email, password);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  logout(): void {
    this.pb.authStore.clear();
  }

  isAuthenticated(): boolean {
    return this.pb.authStore.isValid;
  }

  getCurrentUser(): User | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    const user = this.pb.authStore.record;
    return user ? {
      id: user.id,
      name: user['name'] || user['email'],
      email: user['email']
    } : null;
  }

  async createTopic(title: string, description: string, content: string): Promise<Topic | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Must be authenticated to create topics');
    }

    try {
      const data = {
        title,
        description,
        content,
        createdBy: this.pb.authStore.record?.id
      };

      const record = await this.pb.collection('topic').create(data);

      const currentUser = this.getCurrentUser();
      if (currentUser) {
        this.userCache.set(currentUser.id, currentUser.name);
        this.saveCacheToStorage();
      }

      return {
        id: record.id,
        title: record['title'],
        description: record['description'] || '',
        content: record['content'] || '',
        created: record['created'],
        updated: record['updated'],
        createdBy: record['createdBy'],
        userName: currentUser?.name || 'Unknown User'
      };
    } catch (error) {
      console.error('Error creating topic:', error);
      return null;
    }
  }

  async createPost(topicId: string, content: string): Promise<Post | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Must be authenticated to create posts');
    }

    try {
      const data = {
        content,
        from: topicId,
        postedBy: this.pb.authStore.record?.id
      };

      const record = await this.pb.collection('post').create(data);

      const currentUser = this.getCurrentUser();
      if (currentUser) {
        this.userCache.set(currentUser.id, currentUser.name);
        this.saveCacheToStorage();
      }

      return {
        id: record.id,
        content: record['content'],
        created: record['created'],
        updated: record['updated'],
        postedBy: record['postedBy'],
        topic: record['from'],
        userName: currentUser?.name || 'Unknown User'
      };
    } catch (error) {
      console.error('Error creating post:', error);
      return null;
    }
  }

  async deleteTopic(topicId: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Must be authenticated to delete topics');
    }
    await this.pb.collection('topic').delete(topicId);
  }

  async deletePost(postId: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Must be authenticated to delete posts');
    }
    await this.pb.collection('post').delete(postId);
  }

  async updateTopic(id: string, title: string, content: string): Promise<Topic | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Must be authenticated to update topics');
    }
    try {
      const data = { title, content };
      const record = await this.pb.collection('topic').update(id, data);
      return {
        id: record.id,
        title: record['title'],
        description: record['description'] || '',
        content: record['content'] || '',
        created: record['created'],
        updated: record['updated'],
        createdBy: record['createdBy'],
        userName: this.getCurrentUser()?.name || 'Unknown User'
      };
    } catch (error) {
      console.error('Error updating topic:', error);
      return null;
    }
  }

  async updatePost(id: string, content: string): Promise<Post | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Must be authenticated to update posts');
    }
    try {
      const data = { content };
      const record = await this.pb.collection('post').update(id, data);
      return {
        id: record.id,
        content: record['content'],
        created: record['created'],
        updated: record['updated'],
        postedBy: record['postedBy'],
        topic: record['from'],
        userName: this.getCurrentUser()?.name || 'Unknown User'
      };
    } catch (error) {
      console.error('Error updating post:', error);
      return null;
    }
  }
}
