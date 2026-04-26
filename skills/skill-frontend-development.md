---
name: skill-frontend-development
description: Consolidated skill for premium UI/UX, Gapsy-inspired glassmorphism, RTL/Hebrew optimization, and sidebar-based layout for the BARAK MX Lab Dashboard.
---

# Skill: Front End Development

> Build and maintain high-performance, premium user interfaces for the BARAK MX Integration Dashboard, leveraging glassmorphism, sidebar-based architecture, and flawless RTL/Hebrew support.

## 🎯 Purpose & Scope
* **Primary Goal**: Deliver a "Gapsy Studio" grade dashboard experience with fluid interactions and visual depth.
* **Target Context**: `frontend/index.html`, `frontend/css/theme.css`, and all `frontend/js/` modules.
* **Key Principles**: Offline-first (No CDNs), RTL-first (Logical CSS), and Glassmorphism (Visual Depth).

---

## 🎨 Design DNA — Gapsy Studio Aesthetic
- **Light-first Canvas**: Clean white/grey (`#f0f2f5`) foundation with a secondary "Deep Midnight" dark mode.
- **Glassmorphism**: Cards use `backdrop-filter: blur(14px)` with semi-transparent backgrounds and subtle borders.
- **Fluid Micro-interactions**: Animations use `cubic-bezier(0.4, 0, 0.2, 1)` easing.
- **Gradient Accents**: Primary blue→purple gradient (`#4facfe → #6c63ff`) for highlights and active states.
- **Generous Whitespace**: 24px internal card padding; 20px grid gaps.

---

## 🏗️ Layout Architecture (Sidebar + Content)
The dashboard uses a **Fixed Sidebar (Right)** + **Fluid Content Area** split.

- **Sidebar**: 72px (collapsed) / 240px (expanded). Contains Logo, Lab Navigation (Block 0, 0.5, 1), and Utility links.
- **Top Bar**: Fixed header with Page Title, Digital Clock, Theme Toggle, and TV Mode trigger.
- **Info-Tiles**: 3-column top grid with high-end glassmorphism tiles for System, Radar, and Launcher status.

---

## ⚙️ Logic & Engineering Patterns

### 1. Status & Badge System
Status is communicated via pill-shaped badges, never plain text.
- **Stuck**: `badge-stuck` (Red/Pink tint)
- **In Process**: `badge-process` (Amber/Gold tint)
- **Done**: `badge-done` (Cyan/Blue tint)
- **Pending**: `badge-pending` (Grey tint)

### 2. RTL & Hebrew Optimization
- **Font**: Use **Heebo** (Google's Hebrew-optimized variable font).
- **Logical Properties**: Use `ps-` (padding-start), `pe-` (padding-end), `ms-`, `me-` to ensure layout flips correctly for RTL/LTR.
- **Alignment**: Sidebar fixed to `right-0`.

### 3. API Mapping Pattern
| UI Element | API Endpoint | Method | JS Handler |
|:---|:---|:---|:---|
| Task Creation | `/api/tasks` | POST | `API.createTask(data)` |
| Task Update | `/api/tasks/{id}` | PUT | `API.updateTask(id, data)` |
| System Card Edit | `/api/systems/{id}/tasks` | GET | `ManageDialog.open(id)` |
| Config Save | `/api/config/{lab}` | PUT | `API.setConfig(lab, data)` |

### 4. PyQt6-to-Web Translation
| PyQt6 | Web / HTML | Notes |
|:---|:---|:---|
| `QDialog` | `<dialog>` | Use `.showModal()` |
| `QVBoxLayout` | `flex flex-col` | |
| `QHBoxLayout` | `flex flex-row` | |
| `pyqtSignal` | `CustomEvent` | `dispatchEvent()` |

---

## 🛡️ Safety & Constraints
* **ZERO CDN Calls**: All fonts (Heebo, Inter), icons (Lucide/SVG), and libraries must be vendored locally.
* **Persistent RTL**: Never override `dir="rtl"`.
* **Theme Tokens**: Use CSS variables (`var(--bg-card)`) exclusively for styling.
* **Security**: No raw SQLite queries from Javascript; always proxy through the backend REST API.

## ✅ Validation (QA)
- [ ] RTL sidebar collapses/expands smoothly without layout shift.
- [ ] Theme toggle persists via `localStorage`.
- [ ] Heebo font loads correctly from `frontend/assets/fonts/`.
- [ ] Buttons are wired to backend endpoints with proper error handling.
- [ ] No external network requests (check Network tab).

---
*Created: 2026-03-15 | Version: 1.0 (Consolidated)*
