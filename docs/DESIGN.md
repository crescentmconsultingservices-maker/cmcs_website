# Crescent Moon Consulting Services (CMCS) — Design System

## Overview
This document serves as the single source of truth for the brand visual identity, typography hierarchy, color tokens, and component architecture for Crescent Moon Consulting Services.

---

## 1. Typography Hierarchy

| Role | Font Family | Weights | Usage & Scales |
| :--- | :--- | :--- | :--- |
| **Monumental Display & Headings** | **Playfair Display** (Serif) | 400 (Regular), 600 (SemiBold), 700 (Bold) | `84px` – `210px` on desktop / `52px` – `72px` on mobile. High-impact editorial alliterative titles (*Who we are.*, *What we can do.*, *Work with us.*, *Want to know.*, *Write to us.*). Kerning rule: Capital 'W' uses `mr-[0.14em]` when preceding tall ascenders like 'h'. |
| **Body & UI Elements** | **Plus Jakarta Sans** (Sans-Serif) | 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold) | Body copy (`15px` – `17px`), lead paragraphs, form inputs, navigation labels, and legal disclosures. |
| **Monospace Accents** | **Font-Mono / System Monospace** | 500 (Medium), 700 (Bold) | Section counters (`01`, `02`), eyebrow badges, status labels, and metadata tags. |

---

## 2. Core Color Palette

| Token Name | Hex Code | Purpose / Application |
| :--- | :--- | :--- |
| **Prussian Deep Navy** | `#162A45` | Primary text and headings on white backgrounds (*Who we are.*, *Work with us.*, *Write to us.*). Primary action buttons. |
| **Core Royal Navy** | `#0F1C2D` | Primary dark section background (*What we can do.*, *Want to know.*, Mountain Hero scrims). |
| **Pure Dark Surface** | `#0B1521` | Global footer background and high-contrast legal pages. |
| **Signature Gold** | `#C59A3F` | Primary brand accent: terminal dots (`.`), active tab indicators, hover states, and luxury highlight pills. |
| **Pure White** | `#FFFFFF` | Primary clean section background, floating navbar pill body, card inputs. |
| **Subtle Slate Surface** | `#F8FAFC` | Contact form background and open role cards. |
| **Slate Body Text** | `#3A4358` | High-legibility editorial paragraph text on white backgrounds. |
| **Muted Slate Text** | `#C9D1E0` | Readable secondary paragraph text on dark navy backgrounds. |

---

## 3. Component Architecture & Rules

1. **Floating Pill Navigation Bar:**
   - Solid white background (`bg-white`), `h-14`, rounded full (`rounded-full`), subtle border (`border-slate-200/90`), and soft drop shadow.
   - Synchronized across all pages: Home, Who we are, Capabilities, Careers, FAQ, Contact.

2. **Section Headings ("W" Alliteration):**
   - Section 1: *Hero Video* — "Technology. Strategy. Execution."
   - Section 2: *About* — **Who we are.**
   - Section 3: *Services* — **What we can do.**
   - Section 4: *Careers* — **Work with us.**
   - Section 5: *FAQ* — **Want to know.**
   - Section 6: *Contact* — **Write to us.**

3. **No Heavy Boxed Cards with Circle Icons:**
   - Discard pale-blue circle icon cards.
   - Use clean, minimal hairline rows (`divide-y divide-slate-200/80`) with gold monospace counters (`01`, `02`) or clean 8-12px rounded containers for forms.

4. **Form Controls:**
   - Radius: `rounded-lg` (8px).
   - Inputs: 1px border (`border-slate-200`), white background, gold focus border (`focus:border-[#C59A3F]`).
   - Anti-spam: Invisible honeypot trap (`_hp_company`) + minimum fill-time validation + CRLF header injection protection.

5. **Motion & Accessibility:**
   - Standard animations: Slow-motion masked line reveals (`reveal-masked`) and staggered item cascade.
   - Accessibility: Strict `@media (prefers-reduced-motion: reduce)` overrides all transitions and reveals to instant rendering with zero motion.
