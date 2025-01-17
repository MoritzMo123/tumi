import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EventFormDialogComponent } from '@tumi/legacy-app/modules/event-templates/components/event-form-dialog/event-form-dialog.component';
import { Title } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, Observable } from 'rxjs';
import {
  CreateEventTemplateGQL,
  GetEventTemplatesGQL,
  GetEventTemplatesQuery,
  Role,
} from '@tumi/legacy-app/generated/generated';

@Component({
  selector: 'app-template-list-page',
  templateUrl: './template-list-page.component.html',
  styleUrls: ['./template-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateListPageComponent implements OnInit {
  public Role = Role;
  public eventTemplates$: Observable<GetEventTemplatesQuery['eventTemplates']>;
  private eventTemplateQuery;

  constructor(
    private title: Title,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private createTemplateMutation: CreateEventTemplateGQL,
    private loadTemplates: GetEventTemplatesGQL
  ) {
    this.title.setTitle('TUMi - Event templates');
    this.eventTemplateQuery = this.loadTemplates.watch(
      {},
      { fetchPolicy: 'cache-and-network' }
    );
    this.eventTemplates$ = this.eventTemplateQuery.valueChanges.pipe(
      map(({ data }) => data.eventTemplates)
    );
  }

  ngOnInit(): void {}

  async createTemplate() {
    const template = await this.dialog
      .open(EventFormDialogComponent)
      .afterClosed()
      .toPromise();
    if (template) {
      this.snackBar.open('Saving template', undefined, { duration: 0 });
      await this.createTemplateMutation.mutate({ input: template }).toPromise();
      await this.eventTemplateQuery.refetch();
      this.snackBar.open('Template saved successfully');
    }
  }
}
