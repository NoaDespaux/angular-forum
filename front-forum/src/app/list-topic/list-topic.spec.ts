import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListTopic } from './list-topic';

describe('ListTopic', () => {
  let component: ListTopic;
  let fixture: ComponentFixture<ListTopic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListTopic]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListTopic);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
