# Scorecard Data Extraction Enhancement

## Overview
Enhanced the golf course research skill to handle scorecard data extraction from multiple formats: PDFs, HTML/page content, and images. The skill now has comprehensive plans for extracting course data (tee sets, holes, par, yardage) from each format.

## Problem Addressed

**Previous Issue**: Scorecard data extraction was mentioned but not detailed. The skill didn't have specific plans for handling different scorecard formats that golf courses use.

**Solution**: Added comprehensive Step 4a with detailed extraction plans for:
1. Linked PDF scorecards
2. Scorecard data in HTML/page content
3. Scorecard images

## Enhancements Made

### 1. Added Step 4a: Extract Scorecard Data

**New comprehensive section** covering all three formats:

#### Format 1: Linked PDF Scorecard
- **Detection**: Look for PDF links (e.g., "Download Scorecard", "Scorecard PDF")
- **Extraction Process**:
  1. Fetch the PDF using exact URL from link
  2. Parse PDF text content for structured data
  3. Identify tables with columns: Hole, Par, Handicap, Distance (for each tee)
  4. Extract tee set headers (Blue, White, Red, etc.)
  5. Extract individual hole data
- **Handling**: Multi-page PDFs, tables spanning pages, complex layouts

#### Format 2: Scorecard in Page Content (HTML/Text)
- **Detection**: Look for scorecard sections, HTML tables, structured text
- **Extraction Process**:
  1. Identify scorecard section (headings, tables)
  2. Parse HTML tables (`<table>` elements)
  3. Extract from structured text patterns
  4. Map columns to tee sets and hole properties
- **Handling**: Various HTML structures, text formatting variations

#### Format 3: Scorecard in Image
- **Detection**: Look for images with scorecard-related alt text or filenames
- **Extraction Process**:
  1. Identify scorecard images
  2. Use OCR/image analysis to read text
  3. Parse structured data from image
  4. Extract tee sets, holes, par, yardage
- **Handling**: Single or multiple images, course maps combined with scorecards

### 2. Data Extraction Plan

**For All Formats**, extract:

**Tee Sets**:
- `color`: Tee color/name (Blue, White, Red, Gold, Black, etc.)
- `name`: Full name if different from color
- `par`: Total par for the course
- `rating`: Course rating (if available)
- `slope`: Slope rating (if available)
- `units`: "yards" or "meters"
- `totalYardage`: Sum of all hole distances

**Holes**:
- `holeNumber`: 1-18 (or 1-9, 1-27, etc.)
- `par`: Par for the hole (3, 4, or 5)
- `handicapIndex`: Handicap/stroke index (1-18)
- `distance`: Yardage for each tee set
- `hazards`: List of hazards (water, bunker, trees, etc.)

**Validation**:
- Verify hole count matches course description
- Check par values are reasonable (3-5 per hole)
- Verify total yardage is reasonable for course type
- Cross-reference with course description

**Missing Data Handling**:
- Use `null` for unavailable rating/slope
- Extract partial data if full scorecard unavailable
- Include what's available, omit what's not

### 3. Updated Step 3b

Added explicit instruction to look for scorecard data in multiple formats:
- Linked PDFs
- Page Content (HTML/Tables)
- Images
- Check all pages (scorecard page, course page, rates page)

### 4. Updated Step 6: Gather Additional Details

Enhanced to reference Step 4a for scorecard extraction:
- Tee Sets: Extract from scorecard data (see Step 4a)
- Holes: Extract from scorecard data (see Step 4a)
- Scorecard Data Sources: Check all formats

### 5. Updated Navigation Parsing Guide

Added Step 7: Extract Scorecard Data with reference to Step 4a for detailed extraction plans.

### 6. Updated Example Usage

Enhanced example to show scorecard extraction workflow:
- Check all formats (PDF, HTML table, image, structured text)
- Extract tee sets and holes from scorecard data
- Include in final JSON response

### 7. Updated Troubleshooting

Added new error handling:
- **Error: Cannot extract scorecard data**
- **Fix**: Check all formats (PDF, HTML table, image, structured text)
- Try multiple pages
- Extract partial data if full scorecard unavailable

## Key Benefits

1. **Comprehensive Coverage**: Handles all common scorecard formats
2. **Structured Approach**: Clear plans for each format type
3. **Robust Extraction**: Handles variations within each format
4. **Fallback Strategies**: Extract partial data if full scorecard unavailable
5. **Validation**: Ensures extracted data is reasonable and consistent

## Extraction Workflow

1. **Discover Scorecard Location**:
   - Follow navigation links to scorecard/course pages
   - Look for PDF links, HTML tables, or images

2. **Identify Format**:
   - PDF: Look for `.pdf` links or "Download Scorecard" links
   - HTML: Look for `<table>` elements or structured text
   - Image: Look for images with scorecard-related text

3. **Extract Data**:
   - Follow format-specific extraction plan
   - Parse structured data (tables, text patterns, OCR)
   - Extract tee sets and holes

4. **Validate and Structure**:
   - Verify data consistency
   - Cross-reference with course description
   - Structure according to schema

5. **Handle Missing Data**:
   - Extract partial data if available
   - Use `null` for unavailable fields
   - Include what's available

## Example Scenarios

### Scenario 1: PDF Scorecard
- Navigation link: "Scorecard" → `/scorecard`
- Page contains: Link to "Download Scorecard PDF" → `/files/scorecard.pdf`
- Action: Fetch PDF, parse PDF content, extract tee sets and holes

### Scenario 2: HTML Table Scorecard
- Navigation link: "Course" → `/course`
- Page contains: HTML table with columns: Hole, Par, Handicap, Blue, White, Red
- Action: Parse table structure, extract data for each tee set and hole

### Scenario 3: Image Scorecard
- Navigation link: "Scorecard" → `/scorecard`
- Page contains: Image `<img src="/scorecard.jpg" alt="Course Scorecard">`
- Action: Use OCR/image analysis to extract text and structured data

### Scenario 4: Multiple Formats Available
- Navigation link: "Course" → `/course`
- Page contains: HTML table AND link to PDF scorecard
- Action: Extract from HTML table (primary), verify with PDF if needed

## Files Modified

- `skills/golf-course-research/SKILL.md`:
  - Added Step 4a: Extract Scorecard Data (comprehensive section)
  - Updated Step 3b to reference scorecard extraction
  - Updated Step 6 to reference Step 4a
  - Updated Navigation Parsing Guide Step 7
  - Updated Example Usage
  - Updated Troubleshooting section

## Next Steps

1. **Test extraction** from each format type
2. **Refine parsing patterns** based on common scorecard layouts
3. **Improve OCR handling** for image scorecards
4. **Add validation rules** for extracted data quality

## Related Documents

- `NAVIGATION_ENHANCEMENT_SUMMARY.md` - Navigation-first approach
- `WHEATFIELD_VALLEY_ENHANCEMENTS.md` - Error handling improvements
- `INDIAN_HILLS_ERRORS_ANALYSIS.md` - Initial error analysis
