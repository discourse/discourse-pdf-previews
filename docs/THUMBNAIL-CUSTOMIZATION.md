# PDF Thumbnail Size Customization Guide

This guide explains how to modify the thumbnail size for PDFs displayed in "New Tab" mode.

## Overview

The thumbnail size is controlled in two places:
1. **JavaScript** - Controls the actual rendering size of the thumbnail canvas
2. **CSS** - Controls the maximum display width of the thumbnail

Both should be kept consistent for best results.

---

## 1. Modifying Thumbnail Generation Size (JavaScript)

**File:** `initialize-for-pdf-preview-pdfjs.js`

**Location:** Find the `generateThumbnail` function (around line 40-60)

**Code to modify:**

```javascript
const generateThumbnail = async (canvas, pdfUrl) => {
  await loadPDFJS();
  
  try {
    const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(1);
    
    // Scale to create a reasonable thumbnail (200px width)
    const viewport = page.getViewport({ scale: 1 });
    const scale = 200 / viewport.width;  // ← CHANGE 200 HERE
    const scaledViewport = page.getViewport({ scale });
```

**What to change:**
- Change `200` to your desired width in pixels
- Example: `300` for larger thumbnails, `150` for smaller thumbnails

---

## 2. Modifying CSS Display Width

**File:** `common-pdfjs.scss`

### Desktop Size

**Location:** Find the `.pdf-thumbnail` class (around line 90-95)

**Code to modify:**

```css
.pdf-thumbnail {
  display: block;
  max-width: 200px;  /* ← CHANGE THIS for desktop */
  height: auto;
}
```

**What to change:**
- Change `200px` to match the width you set in JavaScript
- Example: `300px` for larger, `150px` for smaller

### Mobile Size

**Location:** Find the mobile media query section (around line 140-155)

**Code to modify:**

```css
@media (max-width: 768px) {
  .pdf-thumbnail {
    max-width: 150px;  /* ← CHANGE THIS for mobile */
  }
  
  .pdf-thumbnail-label {
    max-width: 150px;  /* ← CHANGE THIS to match thumbnail width */
    font-size: 13px;
  }
}
```

**What to change:**
- Change both `150px` values to your desired mobile width
- Typically 25-50px smaller than desktop width
- Keep `.pdf-thumbnail` and `.pdf-thumbnail-label` widths the same

---

## Recommended Sizes

| Use Case | JavaScript | Desktop CSS | Mobile CSS |
|----------|-----------|-------------|------------|
| **Small** (compact) | 150 | 150px | 120px |
| **Medium** (default) | 200 | 200px | 150px |
| **Large** (prominent) | 300 | 300px | 200px |
| **Extra Large** | 400 | 400px | 250px |

---

## Important Notes

1. **Keep JavaScript and CSS consistent** - If JavaScript generates a 300px thumbnail, set CSS `max-width` to 300px
2. **Mobile should be smaller** - Mobile thumbnails are typically 25-50px smaller than desktop for better display
3. **Label width must match** - The `.pdf-thumbnail-label` max-width should match the thumbnail width
4. **Aspect ratio is preserved** - Height adjusts automatically to maintain PDF page proportions
5. **Re-upload required** - After making changes, re-zip and re-upload the component to Discourse

---

## Example: Changing to Large Thumbnails (300px)

### Step 1: Update JavaScript
```javascript
const scale = 300 / viewport.width;  // Changed from 200 to 300
```

### Step 2: Update Desktop CSS
```css
.pdf-thumbnail {
  display: block;
  max-width: 300px;  /* Changed from 200px to 300px */
  height: auto;
}
```

### Step 3: Update Mobile CSS
```css
@media (max-width: 768px) {
  .pdf-thumbnail {
    max-width: 200px;  /* Changed from 150px to 200px */
  }
  
  .pdf-thumbnail-label {
    max-width: 200px;  /* Changed from 150px to 200px */
    font-size: 13px;
  }
}
```

### Step 4: Re-package and Upload
1. Zip the modified component
2. Go to Admin → Appearance → Themes
3. Update the PDF Preview component
4. Refresh your browser to see the changes

---

## Testing Your Changes

After uploading the modified component:

1. **Create a test post** with a PDF that has a leading space in the filename (to trigger "New Tab" mode)
2. **Check desktop view** - Verify thumbnail appears at the correct size
3. **Check mobile view** - Verify thumbnail scales appropriately
4. **Test click functionality** - Ensure clicking still opens PDF in new tab
5. **Check hover effects** - Verify overlay icon still appears correctly

---

## Troubleshooting

**Thumbnail appears blurry:**
- Increase the JavaScript generation size
- Browser is scaling up a smaller image

**Thumbnail too large on mobile:**
- Reduce the mobile CSS `max-width` value
- Consider screen width constraints (most phones are 360-414px wide)

**Label wraps awkwardly:**
- Adjust `.pdf-thumbnail-label` max-width to match thumbnail
- Consider reducing font-size for longer filenames

**Changes don't appear:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Verify component is enabled and attached to your theme

---

## Quick Reference

**Files to modify:**
- `javascripts/discourse/initialize-for-pdf-preview.js` (or subdirectory)
- `common/common.scss`

**Values to keep synchronized:**
- JavaScript width = Desktop CSS max-width
- Mobile CSS max-width (smaller than desktop)
- Label max-width = Thumbnail max-width

**After modifications:**
1. Save changes
2. Re-zip component
3. Upload to Discourse
4. Test on desktop and mobile

---

*Last updated: February 2026*
*Component: discourse-pdf-previews with PDF.js enhancement*
