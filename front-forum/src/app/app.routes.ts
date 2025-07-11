import { Routes } from '@angular/router';
import { ListTopic } from './list-topic/list-topic';
import { TopicDetail } from './topic-detail/topic-detail';
import { Auth } from './auth/auth';
import { CreateTopic } from './create-topic/create-topic';

export const routes: Routes = [
  { path: '', component: ListTopic },
  { path: 'topic/:id', component: TopicDetail },
  { path: 'auth', component: Auth },
  { path: 'create-topic', component: CreateTopic },
  { path: '**', redirectTo: '' }
];
