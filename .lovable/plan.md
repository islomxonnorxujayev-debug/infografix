

# MarketModel AI — Implementation Plan

## Phase 1: Landing Page & App Shell
- Build a polished landing page with hero section, feature highlights, pricing cards (Free/Basic/Pro/Premium), marketplace logos, before/after showcase, and a "Get Started" CTA
- Set up app routing: `/`, `/login`, `/signup`, `/dashboard`, `/generate`
- Clean SaaS design system: light theme, rounded cards, soft shadows, Stripe/Shopify aesthetic

## Phase 2: Authentication & User System
- Enable Lovable Cloud for backend
- Email/password signup & login with Supabase Auth
- Profiles table with `credits_remaining` (default 3 for free trial)
- Protected routes — redirect unauthenticated users to login

## Phase 3: Dashboard
- "Create New Image" prominent CTA button
- Credits counter showing remaining generations
- Gallery of previously generated images (stored in Supabase Storage)
- Download history with timestamps
- Upgrade modal when credits reach 0

## Phase 4: Image Generation Flow (Multi-Step Wizard)
A guided stepper UI with 6 steps:

1. **Upload** — Drag & drop or click to upload (JPG/PNG/WEBP). Show image preview
2. **Marketplace Format** — Select target marketplace (Uzum 3:4, Wildberries 1:1, Ozon 3:4, Universal 1:1, Amazon 4:5). Auto-adjust canvas preview
3. **Style Preset** — Visual cards for 6 styles (Clean White Studio, Premium Dark Luxury, Soft Ecommerce Shadow, etc.)
4. **Enhancements** — Toggle switches for: lighting, sharpening, shadow, texture, imperfections, color correction, 4K upscale, background blur, reflection
5. **Preview** — Before/After comparison slider with zoom capability
6. **Export** — Download as high-res PNG with marketplace optimization info

## Phase 5: AI Image Processing
- Edge function calling Lovable AI (Gemini image model) for background removal, enhancement, and style application
- Store original and processed images in Supabase Storage bucket
- Deduct 1 credit per generation
- Save generation metadata (marketplace, style, settings) to database

## Phase 6: Pricing & Credits
- Pricing page with 4 tiers displayed
- Credits tracking in database
- Upgrade modal/prompt when free credits exhausted
- Stripe integration for subscription billing (Basic $19, Pro $49, Premium $79)

## Phase 7: Future Roadmap Section
- Static "Coming Soon" section on landing page showcasing: AI Infographic Generator, AI Video, Virtual Model, Competitor Analyzer, Conversion Score, A/B Testing

