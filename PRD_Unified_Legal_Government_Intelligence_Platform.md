# Product Requirements Document (PRD)
## Unified Legal & Government Intelligence Platform

| Field | Detail |
|---|---|
| Hackathon | KANAD S.H.I.E.L.D. 2026 |
| Problem Statement | P2-04 — Unified Legal and Government Intelligence Platform |
| Document Type | Product Requirements Document (PRD) |
| Version | 1.0 |
| Status | Draft — Planning/Architecture Stage |
| Owner | Anupam Pandey |

---

## 1. Executive Summary

India's legal and administrative information — Government Resolutions (GRs), notifications, circulars, Acts, rules, and court judgments — is scattered across dozens of disconnected portals run by different Central and State departments. A citizen, lawyer, researcher, or law enforcement officer trying to answer a simple question ("what's the current pension policy for retired state employees in Gujarat?") has to manually hunt across ministry sites, gazette archives, and judicial databases, cross-reference amendments by hand, and hope nothing relevant was missed.

The **Unified Legal & Government Intelligence Platform** solves this by acting as a single point of access (SPA) that aggregates, categorizes, indexes, and summarizes this information using a combination of web scraping, structured data pipelines, semantic search, and NLP-based summarization — starting with Central Government + Gujarat State sources and designed to extend to other states.

This PRD translates the hackathon problem statement into a build-ready specification: functional requirements, architecture, data model, API surface, AI/NLP pipeline design, and a phased roadmap that separates what's realistically achievable in a hackathon timeframe from the full production vision.

---

## 2. Problem Statement (Recap)

Design and build a platform that:
- Aggregates GRs, notifications, Acts, circulars, and judgments from Central + Gujarat State sources.
- Lets users search by keyword or semantic query and get categorized, cross-linked, summarized results.
- Extracts metadata (department, date, type, keywords, region) automatically.
- Supports English, Hindi, and Gujarati.
- Preserves traceability to original official sources (no black-box answers).

Existing tools (India Code, Indian Kanoon) only cover laws/judgments in isolation — none integrate GRs, circulars, and judgments into one cross-referenced system.

---

## 3. Goals and Objectives

### 3.1 Business / Impact Goals
- Reduce time-to-information for legal/administrative queries from hours of manual portal-hopping to seconds.
- Demonstrate a defensible, technically substantive AI + data engineering system for hackathon evaluation (search quality, categorization accuracy, summarization quality, scalability, UI, integration breadth, innovation, real-world usability — see Section 21).
- Create a reusable foundation that could plausibly be pitched to a state e-governance department or legal-tech incubator post-hackathon.

### 3.2 User Goals
- Find all relevant official documents on a topic in one search, not five.
- Understand a dense legal document in under a minute via AI summary, without losing the ability to verify against the original.
- Get notified when something they care about (a scheme, an Act) changes.
- Trust that every result traces back to an authentic government/judicial source.

### 3.3 Non-Goals (explicitly out of scope for v1)
- Providing legal advice or interpretation ("should I file for X") — the platform surfaces and summarizes; it does not advise.
- Real-time ingestion of every Indian state on day one (v1 = Central + Gujarat only, architected to extend).
- Replacing official portals as the system of record — the platform always links back to source, never claims to be authoritative itself.
- Mobile native apps (v1 is responsive web only).

---

## 4. Target Users & Personas

| Persona | Need | Primary Use Case |
|---|---|---|
| **Citizen** | Understand a scheme/policy affecting them | Keyword search → plain-language summary |
| **Law enforcement officer** | Quickly verify current law/notification during fieldwork | Fast keyword search + filters by department/date |
| **Legal professional (advocate/paralegal)** | Cross-reference GRs, Acts, and judgments for case prep | Cross-linking engine, saved searches, alerts |
| **Researcher / journalist / RTI activist** | Track policy evolution over time | Advanced filters, dashboard analytics, export |
| **Government official (internal use)** | Check own department's notifications against related Acts | Department-wise dashboard, cross-linking |
| **Admin (platform team)** | Manage sources, review categorization accuracy, moderate | Admin panel, audit logs, role-based access |

---

## 5. User Stories (Representative)

- As a **citizen**, I want to search "pension" and get GRs, the relevant Act, and any recent judgments in one list, so I don't have to know which department to check.
- As a **legal professional**, I want to see which judgments have interpreted a specific Act section, so I can cite precedent accurately.
- As a **researcher**, I want to filter results by date range and department, so I can study how a policy evolved.
- As any **user**, I want an AI summary of a 40-page GR that highlights eligibility and key provisions, so I don't have to read the whole document to know if it applies to me.
- As a **returning user**, I want to bookmark a document and get notified if it's amended, so I don't have to keep re-checking manually.
- As an **admin**, I want an audit log of who accessed/modified what, so the system stays compliant and auditable.

---

## 6. Scope: MVP vs. Full Vision (Straight Talk)

Being direct about feasibility matters more than listing every feature from the problem statement as if it's equally achievable in a hackathon window. Recommended scoping:

**Hackathon MVP (demo-able in the available timeframe):**
- Data aggregation from a **limited, curated set of sources** (e.g., 3–5 Gujarat department portals + India Code + one judicial source) rather than "all" government portals.
- Keyword + basic semantic search (via embeddings) over the ingested corpus.
- Rule-based + ML-assisted document categorization (GR / Notification / Act / Judgment / Scheme).
- Metadata extraction (department, date, type) via regex/NER on a known set of document templates.
- AI summarization (extractive or LLM-based abstractive) for individual documents.
- Basic cross-linking (GR ↔ parent Act, keyword-overlap-based, not exhaustive legal reasoning).
- Clean search UI + document detail view + filters.
- Bilingual UI shell (English + one of Hindi/Gujarati) even if full NLP pipeline is English-first.

**Full Production Vision (post-hackathon roadmap):**
- Full scraping coverage across all Central ministries + all Gujarat departments, extensible to other states.
- Robust semantic + hybrid search at scale (Elasticsearch + vector search).
- Trained/fine-tuned classification and NER models (not just rules) with MuRIL for Hindi/Gujarati.
- Full alerting/notification infrastructure, personalization, dashboard analytics.
- Formal RBAC, audit logging, compliance review (especially around scraping government sites — see Section 13.4).
- Multi-state expansion.

This PRD specifies the **full vision** in detail (since that's what the problem statement asks for), with MVP call-outs flagged inline so the build plan stays realistic.

---

## 7. Functional Requirements

### 7.1 Smart Search Engine

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-1.1 | Keyword search across all ingested documents | P0 | Query "pension" returns results within 2s from indexed corpus |
| FR-1.2 | Semantic/AI-based search using embeddings | P0 (MVP: basic) | Query "retirement benefits" surfaces documents about "pension" even without exact keyword match |
| FR-1.3 | Auto-suggestions / query refinement | P1 | Typeahead suggests related terms/departments as user types |
| FR-1.4 | Typo tolerance / fuzzy matching | P1 | "pentions" still returns "pension" results |
| FR-1.5 | Search result ranking by relevance + recency | P0 | Most relevant and most recent documents surfaced first, configurable |

### 7.2 Data Aggregation Module

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-2.1 | Scheduled scraping of Central + Gujarat government portals | P0 (MVP: subset) | Scraper jobs run on a schedule, log success/failure per source |
| FR-2.2 | Ingestion of gazette notifications | P1 | Gazette PDFs parsed and stored with metadata |
| FR-2.3 | Ingestion of judicial platform data | P1 | Judgments ingested with case metadata (court, date, parties) |
| FR-2.4 | Support for PDF and HTML document ingestion | P0 | Both formats parsed into normalized text + metadata |
| FR-2.5 | Deduplication of re-published/mirrored documents | P1 | Identical documents from multiple sources are merged, not duplicated |
| FR-2.6 | Change detection (new vs. updated document) | P1 | System flags whether an ingested doc is new or an amendment to an existing one |

### 7.3 Document Categorization Module

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-3.1 | Auto-classify into GR / Notification-Circular / Act-Rule / Judgment / Scheme | P0 | ≥85% categorization accuracy on a labeled validation set (MVP target; full vision higher) |
| FR-3.2 | Manual override/correction by admin | P1 | Admin can recategorize a misclassified document, and system logs the correction |
| FR-3.3 | Confidence score exposed for each categorization | P2 | UI can optionally show "categorized with X% confidence" |

### 7.4 Metadata Extraction Module

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-4.1 | Extract department name | P0 | Correctly identified for ≥90% of documents from known templates |
| FR-4.2 | Extract date of issue | P0 | Parsed into normalized date format |
| FR-4.3 | Extract document type | P0 | Consistent with categorization module output |
| FR-4.4 | Extract keywords/subject | P1 | Top 5–10 keywords per document, used for search indexing |
| FR-4.5 | Extract applicable region (state/central/district) | P1 | Correctly tagged for filtering |

### 7.5 Advanced Filtering Module

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-5.1 | Filter by department | P0 | Multi-select filter, updates results live |
| FR-5.2 | Filter by date range | P0 | Calendar range picker |
| FR-5.3 | Filter by document type | P0 | Matches categorization taxonomy |
| FR-5.4 | Filter by State vs. Central | P0 | Toggle/checkbox filter |
| FR-5.5 | Combine multiple filters (AND logic) | P1 | Filters compose correctly, reflected in URL for shareability |

### 7.6 AI-Based Summarization Module

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-6.1 | Generate a concise summary per document | P0 | Summary ≤150 words, generated within acceptable latency (target <5s) |
| FR-6.2 | Highlight key provisions/eligibility/conditions | P0 | Summary explicitly surfaces "who is eligible," "key conditions" where applicable |
| FR-6.3 | Summary includes link back to full original document | P0 | Every summary has a "View Original" action |
| FR-6.4 | Multilingual summary (EN/HI/GU) | P2 | At least English guaranteed; Hindi/Gujarati as stretch |

### 7.7 Cross-Linking Engine

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-7.1 | Link GRs to amendments | P1 | Amendment chain visible on document detail page |
| FR-7.2 | Link Acts to relevant judgments | P1 | "Related Judgments" section on Act detail page |
| FR-7.3 | Link notifications to parent Acts | P1 | "Issued under" reference shown where extractable |
| FR-7.4 | Visual relationship graph (stretch) | P2 | Simple graph/tree view of document relationships |

### 7.8 User Personalization Module

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-8.1 | Save searches | P1 | Logged-in user can save a search query + filters |
| FR-8.2 | Bookmark documents | P1 | Bookmarked docs appear in a "My Bookmarks" view |
| FR-8.3 | Maintain search history | P2 | Last N searches viewable/clearable by user |

### 7.9 Notification & Alert System

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-9.1 | Alert on new GR/notification matching saved search | P2 | Email or in-app notification triggered on match |
| FR-9.2 | Alert on updates to bookmarked/followed documents | P2 | Triggered when an amendment is detected (ties to FR-2.6) |

### 7.10 Dashboard & Analytics Module

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-10.1 | Show trending searches | P2 | Aggregated, anonymized top queries over a rolling window |
| FR-10.2 | Show frequently accessed documents | P2 | Ranked by view count |
| FR-10.3 | Department-wise data insights | P2 | Chart: document volume per department over time |

### 7.11 Download & Sharing Module

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-11.1 | Direct access/download of original documents | P0 | Original PDF/source link always available |
| FR-11.2 | Shareable links to search results and documents | P1 | URL encodes query/filter state |
| FR-11.3 | Export summaries (PDF/text) | P2 | User can export a summary for offline use |

### 7.12 Security & Compliance

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| FR-12.1 | Role-based access control (user/admin) | P0 | Admin routes/actions blocked for non-admin roles |
| FR-12.2 | Audit logs for admin actions | P1 | Every categorization override, source config change is logged with actor + timestamp |
| FR-12.3 | Secure authentication | P0 | Hashed credentials or OAuth; no plaintext storage |
| FR-12.4 | Data handling compliance review | P1 | Documented review of scraping/ToS considerations per source (see 13.4) |

---

## 8. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Search queries return in <2s for indexed corpus of up to ~1M documents (target); summarization <5s per document |
| **Scalability** | Architecture supports horizontal scaling of scraping workers, search nodes, and API instances independently |
| **Availability** | Target 99% uptime for the public-facing search/read path; ingestion pipeline failures should not take down search |
| **Security** | Encrypted data at rest and in transit (TLS), RBAC, audit logging, dependency vulnerability scanning |
| **Multilingual** | UI and search support English, Hindi, Gujarati; MuRIL-based NLP for Hindi/Gujarati text processing |
| **Usability/Accessibility** | Responsive design, WCAG-conscious contrast/typography, works on low-bandwidth connections common in tier-2/3 India |
| **Data Authenticity** | Every document/summary traceable to an official source URL; no AI-generated content presented without a "View Original" path |
| **Maintainability** | Scraper configs per source are declarative (not hardcoded), so adding a new department/state doesn't require a rewrite |

---

## 9. System Architecture

### 9.1 High-Level Architecture (Layers)

```
┌─────────────────────────────────────────────────────────┐
│  Client (React SPA)                                      │
│  Search UI · Filters · Document View · Dashboard · Admin  │
└───────────────────────┬───────────────────────────────────┘
                         │ REST API (HTTPS)
┌───────────────────────▼───────────────────────────────────┐
│  API Layer (Django REST Framework)                         │
│  Auth · Search API · Document API · Alerts API · Admin API │
└──────┬───────────────────────┬───────────────────┬─────────┘
       │                       │                   │
┌──────▼──────┐   ┌────────────▼─────────┐  ┌──────▼─────────┐
│ Elasticsearch│   │ PostgreSQL           │  │ MongoDB         │
│ (search index,│   │ (users, relational,  │  │ (raw scraped    │
│ semantic/vector│   │ audit logs, RBAC)    │  │ documents,       │
│ search)        │   │                      │  │ flexible schema) │
└─────────────┘   └──────────────────────┘  └─────────────────┘
       ▲                                              ▲
       │                                              │
┌──────┴──────────────────────────────────────────────┴─────┐
│  Processing Pipeline (async workers)                        │
│  Categorization · Metadata Extraction · Summarization (BERT/│
│  MuRIL) · Cross-Linking · Embedding Generation              │
└──────────────────────────────▲───────────────────────────────┘
                                 │
┌────────────────────────────────┴──────────────────────────┐
│  Ingestion Layer                                            │
│  Scrapy + Playwright scrapers → per-source configs →        │
│  raw document store (PDF/HTML) → parsing/normalization       │
└──────────────────────────────────────────────────────────────┘
                                 │
                    Government/Judicial Portals
                    (Central ministries, Gujarat depts,
                     Gazette, Judicial platforms)
```

### 9.2 Component Breakdown

| Component | Responsibility |
|---|---|
| **Scraper Workers** (Scrapy + Playwright) | Per-source scraping jobs; Playwright for JS-rendered portals, Scrapy for static/paginated sites |
| **Raw Document Store** (MongoDB) | Stores unstructured/semi-structured raw scraped content and parsed text before/alongside processing |
| **Processing Pipeline** | Runs categorization, NER/metadata extraction, summarization, embedding generation as async jobs (queue-based) |
| **Search Index** (Elasticsearch) | Stores structured + indexed documents for keyword and semantic (vector) search |
| **Relational Store** (PostgreSQL) | Users, roles, saved searches, bookmarks, alerts, audit logs — anything transactional/relational |
| **API Layer** (Django REST Framework) | Exposes REST endpoints to the frontend; handles auth, request validation, orchestration |
| **Frontend** (React) | Search, filter, document detail, dashboard, admin panel |
| **Notification Service** | Watches for new/changed documents matching saved searches; dispatches email/in-app alerts |

### 9.3 Data Flow

1. Scraper workers pull raw documents (PDF/HTML) from configured sources on a schedule.
2. Raw content is stored in MongoDB and queued for processing.
3. Processing pipeline runs: text extraction/OCR (if needed) → categorization model → metadata/NER extraction → summarization → embedding generation.
4. Processed, structured documents are written to Elasticsearch (for search) and referenced in PostgreSQL (for relational data like user interactions).
5. Cross-linking engine runs periodically to detect relationships (keyword overlap, citation parsing) between documents already in the index.
6. Frontend queries the API, which queries Elasticsearch for search and PostgreSQL for user-specific data.
7. Notification service polls/subscribes to new document events and matches them against saved searches/bookmarks.

---

## 10. Data Model (Key Entities)

| Entity | Key Fields | Notes |
|---|---|---|
| **Document** | id, title, raw_text, summary, category, department, date_issued, region (state/central), source_url, language, embedding_vector, status | Core entity; lives primarily in Elasticsearch, source-of-truth raw copy in MongoDB |
| **Department** | id, name, jurisdiction (state/central), parent_ministry | Used for filtering and dashboard grouping |
| **Category** | id, name (GR/Notification/Act/Judgment/Scheme) | Fixed taxonomy, admin-extendable |
| **CrossLink** | id, document_id_a, document_id_b, relationship_type (amendment/cites/parent_act) | Powers the cross-linking engine |
| **User** | id, name, email, role (user/admin), auth_provider | PostgreSQL |
| **SavedSearch** | id, user_id, query, filters_json, created_at | PostgreSQL |
| **Bookmark** | id, user_id, document_id, created_at | PostgreSQL |
| **Alert** | id, user_id, trigger_type (saved_search/bookmark_update), last_triggered_at | PostgreSQL |
| **AuditLog** | id, actor_id, action, target_entity, timestamp, details | PostgreSQL, immutable/append-only |
| **ScraperSource** | id, name, base_url, jurisdiction, scraper_config_json, last_run_status | Declarative source config, so new sources are added via config, not code |

---

## 11. API Design (High-Level)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/search?q=&filters=` | Keyword + semantic search |
| GET | `/api/documents/{id}` | Document detail (summary, metadata, cross-links, source) |
| GET | `/api/documents/{id}/related` | Cross-linked documents |
| GET | `/api/departments` | List departments for filter UI |
| GET | `/api/categories` | List document categories |
| POST | `/api/auth/login` / `/api/auth/register` | Auth |
| POST | `/api/saved-searches` | Save a search |
| GET | `/api/saved-searches` | List user's saved searches |
| POST | `/api/bookmarks` | Bookmark a document |
| GET | `/api/bookmarks` | List user's bookmarks |
| GET | `/api/dashboard/trending` | Trending searches |
| GET | `/api/dashboard/department-stats` | Department-wise analytics |
| GET (admin) | `/api/admin/sources` | Manage scraper sources |
| POST (admin) | `/api/admin/documents/{id}/recategorize` | Manual categorization override |
| GET (admin) | `/api/admin/audit-logs` | View audit trail |

---

## 12. AI/NLP Pipeline

### 12.1 Semantic Search & Embeddings
- Generate dense vector embeddings for each document (title + summary + key extracted sections) using a sentence-embedding model (e.g., a multilingual sentence-transformer or a BERT-derived encoder).
- Store vectors in Elasticsearch (dense_vector field / kNN) for hybrid keyword + semantic retrieval.
- Query-time: embed the user query, run approximate nearest-neighbor search alongside standard BM25 keyword search, blend/rerank results.

### 12.2 Summarization Approach
- **MVP:** Extractive summarization (e.g., TextRank-style sentence extraction) — cheap, fast, deterministic, easy to defend in a demo.
- **Full vision:** Abstractive summarization using a fine-tuned transformer (BERT-based encoder + generation head, or an LLM API call) specifically prompted to surface eligibility/conditions/key provisions.
- Every summary retains a pointer to source text spans it was derived from, to support the "trace back to original" requirement.

### 12.3 Multilingual NLP (MuRIL)
- MuRIL (Multilingual Representations for Indian Languages) is used for Hindi/Gujarati text understanding — categorization, NER, and embeddings for non-English documents.
- English-language documents can use standard BERT; a routing layer picks the right model per document language.

### 12.4 Categorization/Classification Model
- **MVP:** Rule-based classifier using document structure/keywords (e.g., "GR No." pattern → GR; "In the matter of" → Judgment) — fast to build, reasonably accurate on templated government documents.
- **Full vision:** Fine-tuned BERT/MuRIL classifier trained on a labeled corpus of GRs/Acts/judgments/notifications, with the rule-based system as a fallback/high-confidence shortcut.

---

## 13. Data Ingestion & Web Scraping Strategy

### 13.1 Sources (v1 target list — illustrative, confirm availability before build)
- Gujarat state department portals (Home Department and 2–4 others with clear public GR listings)
- Central government ministry sites relevant to chosen focus areas (e.g., pension, land, education)
- Gazette of India / Gujarat Government Gazette notifications
- A public judicial data source for judgments (subject to what's actually accessible/permitted)

### 13.2 Scraping Architecture
- **Scrapy** for structured, paginated, mostly-static government listing pages.
- **Playwright** for JS-heavy portals requiring rendering/interaction (form-based search portals, dynamically loaded lists).
- Each source has a declarative config (base URL, pagination pattern, document link selectors, metadata field mappings) so new sources are onboarded without new code paths.

### 13.3 Scheduling & Change Detection
- Scheduled jobs (e.g., daily/weekly per source depending on update frequency) check for new documents.
- Content hashing to detect whether a previously-seen document has been updated/amended (feeds FR-2.6 and the alert system).

### 13.4 Legal/Ethical Considerations (important, don't skip in the actual submission)
- Review each source's `robots.txt` and terms of use before scraping; prefer official APIs/open data portals where they exist over scraping.
- Rate-limit scraper requests to avoid burdening government infrastructure.
- Store only publicly published documents (GRs, notifications, judgments are public records) — do not attempt to access anything behind authentication.
- Always retain and display the original source link, framing the platform as an aggregator/index, not a republisher claiming ownership.

---

## 14. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React.js | SPA, component-based UI |
| Backend/API | Django REST Framework | Chosen over Flask/Node for built-in auth, ORM, admin tooling, and RBAC support |
| Primary relational DB | PostgreSQL | Users, roles, saved searches, bookmarks, audit logs |
| Document store | MongoDB | Raw scraped content, flexible schema for varied document structures |
| Search engine | Elasticsearch | Keyword + vector/kNN semantic search |
| NLP/AI | BERT, MuRIL | MuRIL for Hindi/Gujarati; BERT-family for English + classification/embeddings |
| Web scraping | Scrapy, Playwright | Scrapy for static/paginated sources, Playwright for JS-rendered portals |
| Deployment | AWS | e.g., EC2/ECS for services, S3 for raw document storage, managed OpenSearch or self-hosted Elasticsearch |
| Async processing | Task queue (e.g., Celery + Redis/SQS) | Decouples scraping/processing from the request/response path |

---

## 15. UX/UI Requirements & Key Screens

| Screen | Key Elements |
|---|---|
| **Home / Search** | Prominent search bar, auto-suggestions, quick filters (department, type, state/central), trending searches |
| **Search Results** | List view with category badges, department, date, snippet/summary preview, filter sidebar |
| **Document Detail** | Full metadata, AI summary (with "View Original" prominently placed), related/cross-linked documents, bookmark/share actions |
| **Dashboard** | Trending searches, frequently accessed documents, department-wise charts |
| **Saved Searches / Bookmarks** | User's personal library, alert toggle per saved search |
| **Admin Panel** | Source management, categorization override queue, audit log viewer, user/role management |

Design priorities: legibility for dense legal text, clear visual distinction between AI-generated summary and verbatim original content (to reinforce trust/authenticity), and performance on low-bandwidth connections.

---

## 16. Security & Compliance

- **Authentication:** Standard hashed-password or OAuth-based login; session/JWT tokens for API auth.
- **Authorization:** Role-based access control — `user` (search, bookmark, save, alert) vs. `admin` (source config, recategorization, audit log access, user management).
- **Audit Logging:** Append-only log of all admin actions (recategorization, source changes, user role changes) with actor, timestamp, and before/after state.
- **Data Protection:** TLS in transit, encryption at rest for PostgreSQL/MongoDB, secrets managed via a secrets manager (not hardcoded).
- **Compliance Review:** Documented per-source review of scraping legality/ToS (Section 13.4) as part of the submission, since "acts as an aggregator without authorization" is a fair question a judge or a real deployment would ask.

---

## 17. Success Metrics / KPIs

| Metric | Target (indicative) |
|---|---|
| Search result relevance (top-5 precision on test query set) | ≥80% |
| Categorization accuracy | ≥85% (MVP) → ≥93% (full vision, trained model) |
| Average search latency | <2s |
| Average summarization latency | <5s |
| Number of sources integrated | 3–5 (MVP) → 15+ (full vision) |
| Cross-link coverage (documents with ≥1 detected relationship) | ≥40% of Act/GR pairs where a relationship genuinely exists |
| User task success (find relevant doc in <2 searches, in usability testing) | ≥75% of test users |

---

## 18. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Government portals block/rate-limit scrapers | Data pipeline breaks | Respect rate limits, use official APIs/open data where available, build retry/backoff, diversify sources so one blocked source doesn't sink the demo |
| Portals change structure without notice | Scraper breaks silently | Config-driven scrapers + monitoring/alerting on scraper job failures |
| Categorization/summarization errors mislead users on legal matters | Trust and real-world harm | Always show confidence + "View Original," never present AI summary as a substitute for the source document, add a visible disclaimer that this is not legal advice |
| Multilingual NLP quality gaps (Hindi/Gujarati) | Poor experience for non-English users | Ship English-first for MVP, be transparent about language support status rather than shipping broken Hindi/Gujarati NLP |
| Scope creep (12 modules is a lot for a hackathon) | Nothing gets built well | Follow the MVP scoping in Section 6; demo depth over breadth |
| Data authenticity/liability concerns | Legal exposure if platform is seen as an unauthorized re-publisher | Link-out to originals, don't claim official status, document the compliance review (13.4) |

---

## 19. Assumptions & Dependencies

- Assumes at least a subset of target government portals are publicly accessible without authentication and permit automated access at a reasonable rate.
- Assumes availability of a labeled dataset (even small, hand-labeled) for validating categorization accuracy.
- Assumes team has access to compute sufficient for running BERT/MuRIL inference (local GPU or cloud inference endpoint) within the hackathon timeframe.
- Assumes AWS credits/access are available for deployment demo.

---

## 20. Roadmap & Milestones

| Phase | Scope |
|---|---|
| **Phase 0 — Planning & Architecture** *(current stage)* | Problem framing, architecture, tech stack finalized, PRD (this document), flow diagrams |
| **Phase 1 — Hackathon MVP** | 3–5 sources scraped, basic categorization + metadata extraction, keyword + basic semantic search, extractive summarization, core UI (search, filter, document detail), demo-ready |
| **Phase 2 — Post-Hackathon Hardening** | Trained classification/NER models, abstractive summarization, expanded source coverage, cross-linking engine v1, RBAC + audit logs, alerts |
| **Phase 3 — Scale-Out** | Multi-state expansion, full dashboard/analytics, notification infrastructure at scale, performance optimization for larger corpus |

---

## 21. Evaluation Criteria Mapping

Mapping this PRD directly to the hackathon's stated evaluation criteria, for submission clarity:

| Evaluation Criterion | Where Addressed |
|---|---|
| Accuracy and relevance of search results | Section 7.1, Section 12.1, Section 17 |
| Effectiveness of categorization and filtering | Section 7.3, Section 7.5, Section 12.4 |
| Performance and scalability | Section 8, Section 9 |
| Quality of AI-based summarization | Section 7.6, Section 12.2 |
| UI and ease of navigation | Section 15 |
| Integration across multiple data sources | Section 7.2, Section 13 |
| Innovation in cross-linking and legal intelligence | Section 7.7 |
| Real-world usability and impact | Section 3.2, Section 6, Section 13.4 |

---

## 22. Appendix: Glossary

- **GR (Government Resolution):** An official decision/order issued by a state government department.
- **SPA (Single Point of Access):** A unified entry point aggregating multiple otherwise-separate data sources.
- **NER (Named Entity Recognition):** NLP technique to extract structured entities (dates, department names, etc.) from unstructured text.
- **MuRIL:** Google's Multilingual Representations for Indian Languages model, used for Hindi/Gujarati NLP tasks.
- **RBAC:** Role-Based Access Control.
- **kNN search:** k-Nearest Neighbors, used here for vector/semantic similarity search in Elasticsearch.
