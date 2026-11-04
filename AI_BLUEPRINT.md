# __APP_NAME__ — Bookins.io AI Application Blueprint

- **Organization:** __APP_NAME__
- **Live Origin:** `__APP_URL__`
- **Web Template / Archetype:** `small_business` (Small Business & Client Service Portal (Staff + Client PermSets))
- **Theme Palette:** `ocean_teal`
- **Generation Engine:** Bookins Role-Aware Archetype Compiler

---

## 1. Configured PermSet Generation Roles (No-Code Bookins Registry)

These roles are automatically registered on your Bookins.io client record (`collections.clients.permsetRoles`) and appear in **Bookins.io -> Add Permset -> Creation Mode** without requiring any code changes:

- **Staff Provider** (`roleKey: "staff"`, policy: `issuer_only`, scope tag: *Client / Project Code (e.g. proj-acme)*): Post project deliverables, service updates, and client milestones.
- **Verified Client** (`roleKey: "client"`, policy: `self_enroll`, scope tag: *Client / Project Code (e.g. proj-acme)*): View project deliverables, approve milestones, and submit service requests.

---

## 2. Web Template Questionnaire Answers

- **servicesOffered:** Initial Consultation & Space Planning — Tailored blueprint & project scope · Custom Project Delivery & Milestones — Dedicated weekly progress updates · Ongoing Support & Priority Care — Year-round maintenance & client support
- **businessHoursAndLocation:** Mon–Fri 8:30 AM – 5:30 PM · Serving Local & Remote Clients
- **primaryCtaText:** Track your project milestones, deliverables, and service requests with zero personal data exposure.
- **deliverableCategories:** Project Milestone, Deliverable Ready, Client Request, Schedule Update

---

## 3. Uploaded Brand & Image Assets (`src/assets/uploads/`)

- No custom image assets uploaded at provisioning time (add images to `src/assets/uploads/`).

---

## 4. Assembled Application Specification Prompt

```text
__APP_DESCRIPTION__
```
