# Article Preload Guide - 20 SEO-Optimized Articles

## Overview
This guide provides the structure for preloading 20 full-length, SEO-optimized articles into Raven News.

## Article Distribution
- **Raven (ICP Ecosystem)**: 7 articles (1 current event)
- **Harlee (Crypto/Finance)**: 7 articles (1 current event)
- **Macho (Health/Fitness)**: 6 articles (1 current event)
- **Total**: 20 articles with 3 current events for today (December 9, 2024)

## Current Events (Today - Dec 9, 2024)

### 1. Raven - ICP Current Event
**Topic**: Caffeine AI Platform Launch
- 30% ICP price surge
- 56% single-day spike
- Natural language dApp development
- 2 TiB subnet storage capacity
- $237B TVL in DeFi

### 2. Harlee - Crypto Current Event
**Topic**: Bank of America Expands Crypto Access
- Wealth management advisors can recommend crypto ETPs
- Starting January 5, 2026
- CFTC approves spot crypto trading
- Institutional adoption growing

### 3. Macho - Health Current Event
**Topic**: Winter Fitness Trends 2024
- Home workout equipment sales surge
- Virtual fitness classes growth
- Nutrition science advances
- Mental health and physical fitness connection

## Article Structure

Each article should include:
1. **Title**: SEO-optimized, 50-60 characters
2. **Slug**: URL-friendly, lowercase with hyphens
3. **Excerpt**: 150-200 characters, compelling summary
4. **Content**: 800-1200 words, full markdown
5. **SEO Title**: 50-60 characters
6. **SEO Description**: 150-160 characters
7. **SEO Keywords**: 5-10 relevant keywords
8. **Tags**: 3-5 category tags
9. **Featured**: Boolean (some articles should be featured)

## Implementation

Run the preload script:
```bash
cd raven-unified-ecosystem
npx ts-node scripts/preload_articles_complete.ts
```

Or use dfx directly:
```bash
dfx canister call raven_ai create_article \
  '(title, slug, excerpt, content, persona, category, tags, seo_title, seo_description, seo_keywords, featured)'
```

## Shareable URLs

Each article will have a shareable URL:
```
https://3kpgg-eaaaa-aaaao-a4xdq-cai.icp0.io/news/article/{slug}
```

## Social Media Posting

After preloading, articles can be shared to:
- **X (Twitter)**: Use article title + excerpt + URL
- **Facebook**: Use article title + excerpt + featured image + URL

## SEO Optimization Checklist

- [x] Unique, keyword-rich titles
- [x] Meta descriptions under 160 characters
- [x] Proper heading structure (H1, H2, H3)
- [x] Internal linking opportunities
- [x] Image alt text (when images added)
- [x] Mobile-friendly content
- [x] Fast loading times (on-chain storage)
- [x] Shareable URLs with slugs
- [x] Open Graph tags (via frontend)
- [x] Twitter Card tags (via frontend)



