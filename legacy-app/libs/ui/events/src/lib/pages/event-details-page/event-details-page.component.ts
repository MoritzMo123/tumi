import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { firstValueFrom, Observable, Subject, switchMap } from 'rxjs';
import {
  GetCurrentUserGQL,
  LoadEventGQL,
  LoadEventQuery,
  RegisterForEventGQL,
  RegistrationMode,
  RegistrationType,
} from '@tumi/data-access';
import { ActivatedRoute } from '@angular/router';
import { first, map, shareReplay, filter } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { QrDisplayDialogComponent } from '../../components/qr-display-dialog/qr-display-dialog.component';
import { PermissionsService } from '../../../../../auth/src/lib/services/permissions.service';
import { Price } from '@tumi/shared/data-types';

@Component({
  selector: 'tumi-event-details-page',
  templateUrl: './event-details-page.component.html',
  styleUrls: ['./event-details-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetailsPageComponent implements OnDestroy {
  public event$: Observable<LoadEventQuery['event']>;
  public user$: Observable<LoadEventQuery['currentUser']>;
  public bestPrice$: Observable<Price>;
  public eventOver$: Observable<boolean>;
  public eventStarted$: Observable<boolean>;
  public hasAccount$: Observable<boolean>;
  public RegistrationMode = RegistrationMode;
  private loadEventQueryRef;
  private destroyed$ = new Subject();

  constructor(
    private title: Title,
    private route: ActivatedRoute,
    private loadEvent: LoadEventGQL,
    private loadCurrentUser: GetCurrentUserGQL,
    private registerForEvent: RegisterForEventGQL,
    private dialog: MatDialog,
    private permissions: PermissionsService,
    private snackbar: MatSnackBar
  ) {
    this.title.setTitle('TUMi - event');
    this.loadEventQueryRef = this.loadEvent.watch();
    this.route.paramMap.subscribe((params) =>
      this.loadEventQueryRef.refetch({ id: params.get('eventId') ?? '' })
    );
    this.event$ = this.loadEventQueryRef.valueChanges.pipe(
      map(({ data }) => data.event),
      shareReplay(1)
    );
    this.bestPrice$ = this.event$.pipe(
      switchMap((event) =>
        this.permissions.getPricesForUser(event.prices?.options)
      ),
      filter((prices) => prices.length > 0),
      map((prices) => prices.reduce((a, b) => (a.amount < b.amount ? a : b)))
    );
    this.user$ = this.loadEventQueryRef.valueChanges.pipe(
      map(({ data }) => data.currentUser),
      shareReplay(1)
    );
    this.eventOver$ = this.event$.pipe(
      map((event) => (event?.end ? new Date(event.end) < new Date() : false))
    );
    this.eventStarted$ = this.event$.pipe(
      map((event) =>
        event?.start ? new Date(event.start) < new Date() : false
      )
    );
    this.loadEventQueryRef.startPolling(5000);
    this.hasAccount$ = this.loadCurrentUser.watch().valueChanges.pipe(
      map(({ data }) => !!data.currentUser),
      shareReplay(1)
    );
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
    this.loadEventQueryRef.stopPolling();
  }

  async registerAsOrganizer() {
    const event = await this.event$.pipe(first()).toPromise();
    if (event) {
      this.snackbar.open('Signing you up ⏳', undefined, { duration: 0 });
      try {
        await firstValueFrom(
          this.registerForEvent.mutate({
            eventId: event.id,
            type: RegistrationType.Organizer,
          })
        );
        this.snackbar.open('Registration successful ✔️');
      } catch (e) {
        this.snackbar.open('⚠️ ' + e);
      }
    }
  }

  async showCode() {
    const event = await firstValueFrom(this.event$);
    if (event?.activeRegistration) {
      this.dialog.open(QrDisplayDialogComponent, {
        data: {
          id: event.activeRegistration.id,
          event: event.title,
          user: event.activeRegistration.user.fullName,
        },
      });
    }
  }
}
