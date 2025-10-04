# Metadata Validation Guide

## Purpose
This document provides instructions for validating the SEO and social media metadata implementation in `index.html`.

## Validation Tools

### 1. HTML Validation
**Tool:** [W3C Markup Validation Service](https://validator.w3.org/)
- **URL:** https://validator.w3.org/
- **Method:** Direct input or URL validation
- **Expected Result:** Zero errors, potential warnings for HTML5 features are acceptable

### 2. Open Graph Validation (Facebook/LinkedIn)
**Tool:** [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- **URL:** https://developers.facebook.com/tools/debug/
- **Method:** Enter the production URL
- **Check:**
  - Preview image displays correctly (og:image)
  - Title and description are accurate
  - URL is correctly formatted

**Expected Output:**
```
Title: Qualia Tempo - A Charlie Hellsinger Story
Description: Dive into a rhythmic reality-bending adventure...
Image: [og-image.png preview]
```

### 3. Twitter Card Validation
**Tool:** [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- **URL:** https://cards-dev.twitter.com/validator
- **Method:** Enter the production URL
- **Check:**
  - Card type: summary_large_image
  - Image renders correctly
  - Title and description match expectations

### 4. Schema.org Structured Data Validation
**Tool:** [Google Rich Results Test](https://search.google.com/test/rich-results)
- **URL:** https://search.google.com/test/rich-results
- **Alternative:** [Schema.org Validator](https://validator.schema.org/)
- **Method:** Enter production URL or paste HTML
- **Expected Result:** VideoGame schema recognized, zero errors

### 5. PWA Manifest Validation
**Tool:** Chrome DevTools
- **Method:** 
  1. Open application in Chrome
  2. Open DevTools (F12)
  3. Go to "Application" tab
  4. Check "Manifest" section
- **Check:**
  - Manifest loads without errors
  - Icons are referenced correctly
  - Display mode: fullscreen
  - Theme color: #000000

**Tool:** [Web Manifest Validator](https://manifest-validator.appspot.com/)
- **URL:** https://manifest-validator.appspot.com/
- **Method:** Paste manifest.json content
- **Expected Result:** Valid W3C manifest

### 6. Robots.txt Validation
**Tool:** [Google Search Console - robots.txt Tester](https://search.google.com/search-console)
- **Method:** Submit robots.txt after deployment
- **Alternative:** Manual inspection
- **Expected:**
  - User-agent: * (all crawlers allowed)
  - Sitemap location specified

### 7. Sitemap Validation
**Tool:** [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
- **Method:** Enter sitemap URL after deployment
- **Expected Result:** Valid XML, correct URL structure

## Pre-Deployment Checklist

Before going live, ensure:
- [ ] All graphic assets (favicon.ico, logo192.png, logo512.png, og-image.png) are created and placed in `/public`
- [ ] Production URL is updated in:
  - [ ] index.html (og:url)
  - [ ] robots.txt (Sitemap URL)
  - [ ] sitemap.xml (all <loc> entries)
- [ ] Twitter handle is updated (if applicable)
- [ ] Test all validation tools listed above

## Post-Deployment Validation

After deployment to production:
1. Run all validation tools with production URL
2. Test social media sharing on:
   - Facebook
   - Twitter/X
   - LinkedIn
3. Verify PWA installation works on mobile devices
4. Check Google Search Console for indexing status
5. Monitor Core Web Vitals

## Common Issues & Solutions

### Issue: og:image not displaying
**Solution:** 
- Verify image is accessible at absolute URL
- Check image dimensions (recommended: 1200x630)
- Ensure image format is PNG or JPG (not SVG)

### Issue: PWA not installing
**Solution:**
- Verify manifest.json is accessible at /manifest.json
- Check all icon paths are correct
- Ensure HTTPS is enabled (PWA requirement)

### Issue: Structured data errors
**Solution:**
- Validate JSON-LD syntax with jsonlint.com
- Ensure all required Schema.org properties are present
- Check for typos in property names

## Maintenance

**Frequency:** Validate after:
- Any metadata changes
- Major content updates
- Deployment to new domain
- Addition of new routes/pages

**Last Validation:** [TO BE COMPLETED AFTER DEPLOYMENT]
**Next Validation Due:** [TO BE SCHEDULED]
