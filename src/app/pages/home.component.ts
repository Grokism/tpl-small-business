import { Component, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '@auth0/auth0-angular';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { PermsetService } from '../permset.service';
import { OrgConfigService, OrgRuntimeConfig } from '../org-config.service';
import { TEMPLATE_CONFIG } from '../template-config';

export interface MemberRecord {
  _id?: string;
  permset: string;
  origin: string;
  title: string;
  category: string;
  notes: string;
  roleKey?: string;
  roleLabel?: string;
  scopeTag?: string;
  createdAt: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, AsyncPipe, DatePipe],
  template: `
    <div *ngIf="orgConfig.config$ | async as cfg">
      <section class="hero-card" style="padding: 28px 30px;">
        <div class="hero-top-badges">
          <span class="badge badge-ok">&#10003; Protected Workspace (/home)</span>
          <span class="badge badge-private">
            Active Role: {{ activeRoleLabel || 'Member' }} ({{ activeRoleKey || 'member' }})
          </span>
          <span class="badge badge-ok" *ngIf="activeScopeTag">
            Scope Tag: {{ activeScopeTag }}
          </span>
          <span
            class="badge"
            [class.badge-ok]="dbConnected"
            [class.badge-warn]="!dbConnected"
          >
            {{ dbConnected ? 'MongoDB Connected · ' + dbName : 'Checking MongoDB…' }}
          </span>
        </div>

        <h1 class="hero-title" style="font-size: 28px; margin-bottom: 8px;">
          {{ cfg.appName }} — {{ activeRoleLabel || 'Member' }} Portal
        </h1>
        <p class="muted" style="margin: 0;" *ngIf="auth.user$ | async as user">
          Authenticated Handle: <strong>&#64;{{ user.nickname || user.name || user.sub }}</strong>
          · Disclosed PermSet: <code>{{ activePermset || 'verified' }}</code>
          <span *ngIf="activeScopeTag">
            · Filtered to Scope/Cohort Tag: <code>{{ activeScopeTag }}</code>
          </span>
        </p>

        <!-- Role Switcher / Inspector for Multi-Role Apps -->
        <div class="telemetry-grid" style="margin-top: 16px;">
          <div class="telemetry-item" *ngFor="let r of configuredRoles">
            <div class="telemetry-label">
              {{ r.roleLabel }} ({{ r.roleKey }})
              <span *ngIf="r.roleKey === activeRoleKey" class="badge badge-ok" style="margin-left: 6px;">
                Your Active Role
              </span>
            </div>
            <div class="telemetry-value" style="font-weight: 400; font-size: 13px; color: var(--muted);">
              {{ r.purpose }}
            </div>
          </div>
        </div>
      </section>

      <!-- Role & Scope-Aware Workspace (/api/records) -->
      <section class="card">
        <div class="section-header">
          <div>
            <div class="eyebrow">
              {{ activeRoleLabel || 'Member' }} Activity &amp; Shared Scope Feed
            </div>
            <h2>
              {{
                activeScopeTag
                  ? 'Workspace Items for Scope "' + activeScopeTag + '"'
                  : cfg.appName + ' Workspace Items'
              }}
            </h2>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button
              type="button"
              class="secondary btn-sm"
              (click)="seedSampleRecord(cfg)"
              [disabled]="isSaving"
            >
              + Seed Sample Entry
            </button>
            <button
              type="button"
              class="secondary btn-sm"
              (click)="loadRecords()"
              [disabled]="isLoading"
            >
              {{ isLoading ? 'Refreshing…' : 'Refresh' }}
            </button>
          </div>
        </div>

        <p class="muted" style="font-size: 14px; margin-top: 0;">
          Items posted with a <strong>Scope / Cohort Tag</strong> (for example a classroom, student
          tag, project code, or order reference) are automatically visible to other authorized roles
          in <strong>{{ cfg.appName }}</strong> who hold the matching scope tag on their PermSet,
          while keeping all real-world PII strictly inside Bookins.io.
        </p>

        <form class="join-form" (ngSubmit)="createRecord()" style="margin-bottom: 22px;">
          <div class="form-row">
            <label style="flex: 2;">
              <span>Title / Update Headline *</span>
              <input
                type="text"
                name="newTitle"
                [(ngModel)]="newTitle"
                placeholder="Enter a title, update, or item name"
                required
                [disabled]="isSaving"
              />
            </label>
            <label style="flex: 1;">
              <span>Category</span>
              <select
                name="newCategory"
                [(ngModel)]="newCategory"
                [disabled]="isSaving"
              >
                <option *ngFor="let cat of categoryOptions" [value]="cat">{{ cat }}</option>
              </select>
            </label>
            <label style="flex: 1;">
              <span>Scope / Cohort Tag</span>
              <input
                type="text"
                name="newScopeTag"
                [(ngModel)]="newScopeTag"
                placeholder="e.g. room-sunflower or general"
                [disabled]="isSaving"
              />
            </label>
          </div>
          <label>
            <span>Details / Notes</span>
            <input
              type="text"
              name="newNotes"
              [(ngModel)]="newNotes"
              placeholder="Write details, feedback, or milestone notes…"
              [disabled]="isSaving"
            />
          </label>
          <div class="actions-row" style="margin-top: 4px;">
            <button type="submit" [disabled]="!newTitle.trim() || isSaving">
              {{ isSaving ? 'Saving to MongoDB…' : 'Publish as ' + (activeRoleLabel || 'Member') }}
            </button>
          </div>
        </form>

        <p class="error-banner" *ngIf="errorMsg">{{ errorMsg }}</p>

        <div
          *ngIf="records.length === 0 && !isLoading"
          class="permset-entry"
          style="text-align: center; padding: 22px;"
        >
          <strong>No workspace items yet</strong>
          <p class="permset-explain" style="max-width: 520px; margin: 6px auto 14px;">
            Publish your first item above or click <strong>+ Seed Sample Entry</strong> to populate
            your isolated MongoDB database (<code>{{ dbName }}</code>).
          </p>
        </div>

        <div *ngFor="let rec of records" class="permset-entry" style="margin-bottom: 10px;">
          <div class="permset-name">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="font-size: 15px; color: var(--text);">{{ rec.title }}</strong>
              <span class="tag tag-private">{{ rec.roleLabel || rec.category }}</span>
              <span class="tag tag-public" *ngIf="rec.scopeTag">
                Scope: {{ rec.scopeTag }}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="muted" style="font-size: 12px;">
                {{ rec.createdAt | date: 'medium' }}
              </span>
              <button
                *ngIf="rec.permset === activePermset || activeRoleKey === 'admin'"
                type="button"
                class="secondary btn-sm"
                (click)="deleteRecord(rec._id!)"
              >
                Delete
              </button>
            </div>
          </div>
          <p class="permset-explain" *ngIf="rec.notes">{{ rec.notes }}</p>
          <p class="permset-explain" style="font-size: 11.5px; margin-top: 6px;">
            Author PermSet: <code>{{ rec.permset }}</code> · Category: <code>{{ rec.category }}</code>
          </p>
        </div>
      </section>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  dbConnected = false;
  dbName = '';
  activePermset = '';
  activeRoleKey = 'member';
  activeRoleLabel = 'Member';
  activeScopeTag = '';
  configuredRoles: Array<{
    roleKey: string;
    roleLabel: string;
    purpose: string;
    enrollmentPolicy?: string;
    scopeLabel?: string;
  }> =
    Array.isArray(TEMPLATE_CONFIG.permsetRoles) && TEMPLATE_CONFIG.permsetRoles.length > 0
      ? TEMPLATE_CONFIG.permsetRoles
      : [
  {
    "roleKey": "staff",
    "roleLabel": "Staff Provider",
    "purpose": "Post project deliverables, service updates, and client milestones.",
    "enrollmentPolicy": "issuer_only",
    "scopeLabel": "Client / Project Code (e.g. proj-acme)"
  },
  {
    "roleKey": "client",
    "roleLabel": "Verified Client",
    "purpose": "View project deliverables, approve milestones, and submit service requests.",
    "enrollmentPolicy": "self_enroll",
    "scopeLabel": "Client / Project Code (e.g. proj-acme)"
  }
];
  templateAnswers: Record<string, string> =
    TEMPLATE_CONFIG.templateAnswers && Object.keys(TEMPLATE_CONFIG.templateAnswers).length > 0
      ? TEMPLATE_CONFIG.templateAnswers
      : {
  "servicesOffered": "Initial Consultation & Space Planning — Tailored blueprint & project scope\nCustom Project Delivery & Milestones — Dedicated weekly progress updates\nOngoing Support & Priority Care — Year-round maintenance & client support",
  "businessHoursAndLocation": "Mon–Fri 8:30 AM – 5:30 PM · Serving Local & Remote Clients",
  "primaryCtaText": "Track your project milestones, deliverables, and service requests with zero personal data exposure.",
  "deliverableCategories": "Project Milestone, Deliverable Ready, Client Request, Schedule Update"
};
  records: MemberRecord[] = [];
  newTitle = '';
  newCategory = 'General';
  newScopeTag = '';
  newNotes = '';
  isLoading = false;
  isSaving = false;
  errorMsg = '';

  constructor(
    public auth: AuthService,
    public permsets: PermsetService,
    public orgConfig: OrgConfigService,
    private http: HttpClient
  ) {}

  get categoryOptions(): string[] {
    const a = this.templateAnswers || {};
    const raw =
      a['deliverableCategories'] ||
      a['updateCategories'] ||
      a['productCategories'] ||
      a['sessionCategories'] ||
      a['governanceCategories'] ||
      a['postCategories'] ||
      '';
    const parsed = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return parsed.length > 0
      ? parsed
      : ['General', 'Milestone', 'Announcement', 'Member Update'];
  }

  ngOnInit(): void {
    const opts = this.categoryOptions;
    if (opts.length > 0) {
      this.newCategory = opts[0];
    }
    this.permsets.access$.pipe(take(1)).subscribe((state) => {
      if (state.activeRoleKey) this.activeRoleKey = state.activeRoleKey;
      if (state.activeRoleLabel) this.activeRoleLabel = state.activeRoleLabel;
      if (state.activeScopeTag) {
        this.activeScopeTag = state.activeScopeTag;
        this.newScopeTag = state.activeScopeTag;
      }
    });
    this.checkHealth();
    this.loadRecords();
  }

  private async authHeaders(): Promise<HttpHeaders> {
    const claims = await firstValueFrom(
      this.auth.idTokenClaims$.pipe(
        filter((c) => !!c?.__raw),
        take(1)
      )
    );
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${claims!.__raw}`,
    });
  }

  checkHealth(): void {
    this.http
      .get<{ status: string; mongoConnected: boolean; dbName: string }>('/api/health')
      .subscribe({
        next: (res) => {
          this.dbConnected = res.mongoConnected;
          this.dbName = res.dbName;
        },
        error: () => {
          this.dbConnected = false;
        },
      });
  }

  async loadRecords(): Promise<void> {
    this.isLoading = true;
    this.errorMsg = '';
    try {
      const headers = await this.authHeaders();
      const res = await firstValueFrom(
        this.http.get<{
          dbName: string;
          permset: string;
          roleKey?: string;
          roleLabel?: string;
          scopeTag?: string;
          records: MemberRecord[];
        }>('/api/records', { headers })
      );
      this.dbConnected = true;
      this.dbName = res.dbName || this.dbName;
      this.activePermset = res.permset || '';
      if (res.roleKey) this.activeRoleKey = res.roleKey;
      if (res.roleLabel) this.activeRoleLabel = res.roleLabel;
      if (res.scopeTag) {
        this.activeScopeTag = res.scopeTag;
        if (!this.newScopeTag) this.newScopeTag = res.scopeTag;
      }
      this.records = res.records || [];
    } catch (err: any) {
      this.errorMsg = err?.error?.error || 'Could not load records from MongoDB.';
    } finally {
      this.isLoading = false;
    }
  }

  async createRecord(): Promise<void> {
    if (!this.newTitle.trim() || this.isSaving) return;
    this.isSaving = true;
    this.errorMsg = '';
    try {
      const headers = await this.authHeaders();
      await firstValueFrom(
        this.http.post(
          '/api/records',
          {
            title: this.newTitle.trim(),
            category: this.newCategory.trim() || 'General',
            scopeTag: this.newScopeTag.trim() || this.activeScopeTag || undefined,
            notes: this.newNotes.trim(),
          },
          { headers }
        )
      );
      this.newTitle = '';
      this.newNotes = '';
      await this.loadRecords();
    } catch (err: any) {
      this.errorMsg = err?.error?.error || 'Could not save record to MongoDB.';
    } finally {
      this.isSaving = false;
    }
  }

  async seedSampleRecord(cfg: OrgRuntimeConfig): Promise<void> {
    if (this.isSaving) return;
    this.isSaving = true;
    this.errorMsg = '';
    try {
      const headers = await this.authHeaders();
      await firstValueFrom(
        this.http.post(
          '/api/records',
          {
            title: `${this.activeRoleLabel} Welcome Update for ${cfg.appName}`,
            category: this.activeRoleLabel || 'Announcement',
            scopeTag: this.activeScopeTag || 'general',
            notes: `Published by ${this.activeRoleLabel} via Nginx (:80) -> Express (:3000) -> Isolated MongoDB (${this.dbName || 'paas_db'}).`,
          },
          { headers }
        )
      );
      await this.loadRecords();
    } catch (err: any) {
      this.errorMsg = err?.error?.error || 'Could not seed sample entry.';
    } finally {
      this.isSaving = false;
    }
  }

  async deleteRecord(id: string): Promise<void> {
    if (!id) return;
    try {
      const headers = await this.authHeaders();
      await firstValueFrom(this.http.delete(`/api/records/${id}`, { headers }));
      this.records = this.records.filter((r) => r._id !== id);
    } catch (err: any) {
      this.errorMsg = err?.error?.error || 'Could not delete record.';
    }
  }
}
