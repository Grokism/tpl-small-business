import { Component, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { OrgConfigService, OrgRuntimeConfig } from '../org-config.service';
import { PermsetService } from '../permset.service';
import { TEMPLATE_CONFIG } from '../template-config';

interface HealthStatus {
  status: string;
  stack?: string;
  proxy?: string;
  mongoConnected: boolean;
  dbName: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, AsyncPipe],
  template: `
    <ng-container *ngIf="orgConfig.config$ | async as cfg">
      <section class="hero-card">
        <div class="hero-top-badges">
          <span class="badge badge-ok">&#10003; Live on Bookins PaaS</span>
          <span class="badge badge-private">{{ archetypeBadge }}</span>
          <span
            class="badge"
            [class.badge-ok]="health?.mongoConnected"
            [class.badge-warn]="!health?.mongoConnected"
          >
            {{
              health?.mongoConnected
                ? 'MongoDB Online · ' + health?.dbName
                : 'Isolated Tenant MongoDB'
            }}
          </span>
        </div>

        <div class="hero-split">
          <div class="hero-copy">
            <div *ngIf="logoPath" style="margin-bottom: 14px;">
              <img
                [src]="logoPath"
                (error)="onImgError($event, logoFallbackUrl)"
                alt="Organization Logo"
                style="max-height: 54px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);"
              />
            </div>
            <h1 class="hero-title">{{ headlineText(cfg.appName) }}</h1>
            <p class="hero-subtitle">{{ subheadlineText }}</p>
            <p class="muted" style="margin: 0 0 12px;">{{ primaryGoalText }}</p>
            <p *ngIf="heroCalloutText" style="margin: 0 0 16px; padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.06); border-left: 3px solid var(--accent); color: var(--text); font-size: 14px;">
              {{ heroCalloutText }}
            </p>

            <ng-container *ngIf="auth.isAuthenticated$ | async; else loggedOutHero">
              <ng-container *ngIf="permsets.access$ | async as evalState">
                <div class="actions-row" *ngIf="evalState.isAuthorized; else needsMembershipHero">
                  <a routerLink="/home">
                    <button>
                      Open {{ evalState.activeRoleLabel || 'Member' }} Workspace (/home) &rarr;
                    </button>
                  </a>
                  <a routerLink="/join">
                    <button class="secondary">Membership &amp; Role Status</button>
                  </a>
                </div>
                <ng-template #needsMembershipHero>
                  <div
                    class="permset-entry"
                    style="margin-top: 16px; border-color: rgba(245, 158, 11, 0.4);"
                  >
                    <strong>Signed in — awaiting a {{ cfg.appName }} PermSet</strong>
                    <p class="permset-explain">
                      Your handle is signed in, but it does not yet hold one of this application's
                      origin-scoped PermSets for <code>{{ cfg.origin }}</code>.
                    </p>
                    <div class="actions-row" style="margin-top: 12px;">
                      <a routerLink="/join"><button>Enroll or Request Role &rarr;</button></a>
                      <button type="button" class="secondary" (click)="permsets.refresh()">
                        Re-check Credentials
                      </button>
                    </div>
                  </div>
                </ng-template>
              </ng-container>
            </ng-container>

            <ng-template #loggedOutHero>
              <div class="actions-row">
                <button type="button" (click)="login('/home')">
                  PermSet Member Login &rarr;
                </button>
                <a routerLink="/join">
                  <button type="button" class="secondary">Become a Member (/join)</button>
                </a>
              </div>
            </ng-template>
          </div>

          <div class="hero-visual" *ngIf="heroPath">
            <img
              [src]="heroPath"
              (error)="onImgError($event, heroFallbackUrl)"
              alt="__APP_NAME__"
              style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 14px; border: 1px solid rgba(255,255,255,0.14);"
            />
          </div>
        </div>
      </section>

      <!-- Template-Specific Questionnaire Highlights Section -->
      <section class="card" *ngIf="templateHighlightCards.length > 0 || templateInfoBanner">
        <div class="section-header">
          <div>
            <div class="eyebrow">{{ templateSectionEyebrow }}</div>
            <h2>{{ templateSectionTitle(cfg.appName) }}</h2>
          </div>
          <span class="badge badge-ok">Tailored Web Template</span>
        </div>

        <p class="muted" style="margin-top: 0;" *ngIf="templateInfoBanner">
          {{ templateInfoBanner }}
        </p>

        <div class="feature-grid" *ngIf="templateHighlightCards.length > 0">
          <div class="feature-tile" *ngFor="let item of templateHighlightCards; let i = index">
            <div class="tile-kicker">
              <span>{{ templateItemLabel }} {{ i + 1 }}</span>
              <code>Verified Access</code>
            </div>
            <h3>{{ item.title }}</h3>
            <p *ngIf="item.detail">{{ item.detail }}</p>
          </div>
        </div>
      </section>

      <!-- Configured PermSet Roles for This Application -->
      <section class="card">
        <div class="section-header">
          <div>
            <div class="eyebrow">Multi-Role PermSet Access Control</div>
            <h2>PermSet Roles Configured for {{ cfg.appName }}</h2>
          </div>
          <span class="badge badge-ok">Zero-PII Sybil Resistance</span>
        </div>
        <p class="muted" style="margin-top: 0;">
          Each role below is minted onto a member's Bookins handle as an origin-scoped private
          PermSet (<code>url = {{ cfg.origin }}</code>) and automatically unlocks its tailored
          workspace view at <code>/home</code>.
        </p>

        <div class="feature-grid">
          <div class="feature-tile" *ngFor="let role of roles">
            <div class="tile-kicker">
              <span>{{ role.enrollmentPolicy === 'self_enroll' ? 'Self-Enroll (/join)' : 'Admin Minted in Bookins.io' }}</span>
              <code>{{ role.roleKey }}</code>
            </div>
            <h3>{{ role.roleLabel }} PermSet</h3>
            <p>{{ role.purpose }}</p>
            <div *ngIf="role.scopeLabel" class="muted" style="font-size: 12px; margin-top: 6px;">
              Scope Tag: <strong>{{ role.scopeLabel }}</strong>
            </div>
          </div>
        </div>
      </section>

      <!-- Key Application Capabilities -->
      <section class="card">
        <div class="section-header">
          <div>
            <div class="eyebrow">Application Blueprint</div>
            <h2>What {{ cfg.appName }} Delivers</h2>
          </div>
          <span class="badge badge-private">MEAN + Nginx</span>
        </div>

        <div class="workflow-grid">
          <div class="workflow-step" *ngFor="let feat of keyFeatures; let i = index">
            <div class="step-badge">Capability {{ i + 1 }}</div>
            <p style="color: var(--text); font-size: 14.5px;">{{ feat }}</p>
          </div>
        </div>
      </section>

      <!-- Uploaded Visual Gallery (if provided) -->
      <section class="card" *ngIf="galleryAssets.length > 0">
        <div class="section-header">
          <div>
            <div class="eyebrow">Visual Showcase</div>
            <h2>{{ cfg.appName }} Gallery &amp; Media</h2>
          </div>
        </div>
        <div class="feature-grid">
          <div class="feature-tile" *ngFor="let img of galleryAssets">
            <img
              [src]="img.assetPath"
              (error)="onImgError($event, img.publicUrl)"
              [alt]="img.altText || img.fileName"
              style="width: 100%; height: 170px; object-fit: cover; border-radius: 10px; margin-bottom: 8px;"
            />
            <p style="color: var(--text); font-weight: 600;">{{ img.altText || img.fileName }}</p>
          </div>
        </div>
      </section>
    </ng-container>
  `,
})
export class LandingComponent implements OnInit {
  health: HealthStatus | null = null;
  archetypeId = TEMPLATE_CONFIG.archetype || "small_business";
  archetypeBadge = TEMPLATE_CONFIG.archetypeLabel || "Small Business & Client Service Portal (Staff + Client PermSets)";
  logoPath = TEMPLATE_CONFIG.uploadedAssets?.find((a) => a.slot === 'logo')?.assetPath || "";
  logoFallbackUrl = TEMPLATE_CONFIG.uploadedAssets?.find((a) => a.slot === 'logo')?.publicUrl || "";
  heroPath = TEMPLATE_CONFIG.uploadedAssets?.find((a) => a.slot === 'hero')?.assetPath || "assets/templates/tpl-small-business.jpg";
  heroFallbackUrl = TEMPLATE_CONFIG.uploadedAssets?.find((a) => a.slot === 'hero')?.publicUrl || "https://bookins.io/assets/templates/tpl-small-business.jpg";
  templateAnswers: Record<string, string> =
    TEMPLATE_CONFIG.templateAnswers && Object.keys(TEMPLATE_CONFIG.templateAnswers).length > 0
      ? TEMPLATE_CONFIG.templateAnswers
      : {
  "servicesOffered": "Initial Consultation & Space Planning — Tailored blueprint & project scope\nCustom Project Delivery & Milestones — Dedicated weekly progress updates\nOngoing Support & Priority Care — Year-round maintenance & client support",
  "businessHoursAndLocation": "Mon–Fri 8:30 AM – 5:30 PM · Serving Local & Remote Clients",
  "primaryCtaText": "Track your project milestones, deliverables, and service requests with zero personal data exposure.",
  "deliverableCategories": "Project Milestone, Deliverable Ready, Client Request, Schedule Update"
};
  roles: Array<{
    roleKey: string;
    roleLabel: string;
    purpose: string;
    enrollmentPolicy: string;
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
  keyFeatures: string[] =
    Array.isArray(TEMPLATE_CONFIG.keyFeatures) && TEMPLATE_CONFIG.keyFeatures.length > 0
      ? TEMPLATE_CONFIG.keyFeatures
      : [
  "Public service showcase with business hours, service menu, and client onboarding call-to-action",
  "Staff PermSet workspace to post deliverables, service milestones, and scheduling updates",
  "Client PermSet portal scoped by Client / Project Code to review work and submit requests",
  "Isolated MongoDB persistence for project timelines and client approvals"
];
  galleryAssets: Array<{
    fileName: string;
    assetPath: string;
    publicUrl?: string;
    slot?: string;
    altText?: string;
  }> =
    Array.isArray(TEMPLATE_CONFIG.uploadedAssets) &&
    TEMPLATE_CONFIG.uploadedAssets.some((a) => a.slot === 'gallery' || a.slot === 'feature')
      ? TEMPLATE_CONFIG.uploadedAssets.filter((a) => a.slot === 'gallery' || a.slot === 'feature')
      : [];

  headlineText(appName: string): string {
    if (TEMPLATE_CONFIG.headline && !TEMPLATE_CONFIG.headline.includes('__APP_NAME__')) {
      return TEMPLATE_CONFIG.headline;
    }
    return `__APP_NAME__ — Client & Service Portal`.replace(/__APP_NAME__/g, appName);
  }

  get subheadlineText(): string {
    if (TEMPLATE_CONFIG.subheadline && !TEMPLATE_CONFIG.subheadline.startsWith('__')) {
      return TEMPLATE_CONFIG.subheadline;
    }
    return `Bright, welcoming studio & service business template where Staff post project deliverables and Clients review and approve milestones.`;
  }

  get primaryGoalText(): string {
    return TEMPLATE_CONFIG.primaryGoal || `Give staff and clients a shared, zero-PII project and service portal where deliverables, status updates, and service requests are organized by Client / Project Code.`;
  }

  constructor(
    public auth: AuthService,
    public orgConfig: OrgConfigService,
    public permsets: PermsetService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.http.get<HealthStatus>('/api/health').subscribe({
      next: (res) => {
        this.health = res;
      },
      error: () => {
        this.health = null;
      },
    });
  }

  get heroCalloutText(): string {
    const a = this.templateAnswers || {};
    return (
      a['primaryCtaText'] ||
      a['schoolMotto'] ||
      a['memberPerksBanner'] ||
      a['privacyPromise'] ||
      a['communityMission'] ||
      a['subscriberBenefits'] ||
      ''
    );
  }

  get templateInfoBanner(): string {
    const a = this.templateAnswers || {};
    return (
      a['businessHoursAndLocation'] ||
      a['dailyScheduleHighlights'] ||
      a['fulfillmentPolicy'] ||
      a['clinicHoursNote'] ||
      a['meetingCadence'] ||
      a['creatorBio'] ||
      ''
    );
  }

  get templateSectionEyebrow(): string {
    switch (this.archetypeId) {
      case 'small_business':
        return 'Services & Client Availability';
      case 'daycare_school':
        return 'Classrooms, Programs & Daily Rhythm';
      case 'ecommerce':
        return 'Featured Storefront Catalog & Fulfillment';
      case 'wellness_clinic':
        return 'Practice Specialties & Care Programs';
      case 'dao_governance':
        return 'Community Priorities & Member Governance';
      case 'blog_editorial':
        return 'Featured Columns & Publication Highlights';
      default:
        return 'Featured Highlights';
    }
  }

  get templateItemLabel(): string {
    switch (this.archetypeId) {
      case 'small_business':
        return 'Service';
      case 'daycare_school':
        return 'Classroom / Program';
      case 'ecommerce':
        return 'Featured Item';
      case 'wellness_clinic':
        return 'Care Specialty';
      case 'dao_governance':
        return 'Priority';
      case 'blog_editorial':
        return 'Series';
      default:
        return 'Highlight';
    }
  }

  templateSectionTitle(appName: string): string {
    switch (this.archetypeId) {
      case 'small_business':
        return `${appName} Services & Client Portal`;
      case 'daycare_school':
        return `${appName} Classrooms & Daily Schedule`;
      case 'ecommerce':
        return `${appName} Featured Catalog`;
      case 'wellness_clinic':
        return `${appName} Care Programs & Specialties`;
      case 'dao_governance':
        return `${appName} Mission & Active Initiatives`;
      case 'blog_editorial':
        return `Inside ${appName}`;
      default:
        return `${appName} Overview`;
    }
  }

  get templateHighlightCards(): Array<{ title: string; detail: string }> {
    const a = this.templateAnswers || {};
    const rawList =
      a['servicesOffered'] ||
      a['classroomsServed'] ||
      a['featuredProducts'] ||
      a['practiceSpecialties'] ||
      a['initialProposals'] ||
      a['featuredColumns'] ||
      '';
    return rawList
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[·—-]/).map((p) => p.trim()).filter(Boolean);
        if (parts.length > 1) {
          return { title: parts[0], detail: parts.slice(1).join(' · ') };
        }
        return { title: line, detail: 'Protected by zero-PII PermSet access control.' };
      });
  }

  onImgError(event: Event, fallbackUrl?: string): void {
    const img = event.target as HTMLImageElement;
    if (fallbackUrl && img && img.src !== fallbackUrl) {
      img.src = fallbackUrl;
    }
  }

  login(target = '/home'): void {
    this.auth
      .loginWithRedirect({
        appState: { target },
        authorizationParams: {
          redirect_uri: window.location.origin,
        },
      })
      .subscribe();
  }
}
