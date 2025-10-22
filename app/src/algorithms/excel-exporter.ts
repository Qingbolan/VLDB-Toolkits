/**
 * Excel Export Algorithm Module
 * Handle exporting Papers data to styled Excel files
 */

import * as XLSX from 'xlsx-js-style'
import type { Paper, AuthorMerge } from '@/store/paper-types'

/**
 * Export Papers to Excel with marking and styling
 * @param papers - Paper list
 * @param authorMerges - Author merge records
 * @param datasetLabel - Dataset label
 * @param filterInfo - Filter information
 * @returns ArrayBuffer of Excel file
 */
export const exportPapersToExcel = (
  papers: Paper[],
  authorMerges: AuthorMerge[],
  datasetLabel: string = 'All Datasets',
  filterInfo: string = 'No filters applied'
): ArrayBuffer => {
  // Create email to merge group mapping
  const emailToMergeGroup = new Map<string, AuthorMerge>()
  authorMerges.forEach(merge => {
    emailToMergeGroup.set(merge.primaryEmail, merge)
    merge.mergedEmails.forEach((email: string) => {
      emailToMergeGroup.set(email, merge)
    })
  })

  // Prepare data rows
  const rows = papers.map(paper => {
    // Check if has warning
    const isMarked = paper.hasWarning

    // Generate note: list all warning authors and reasons
    let note = ''
    if (paper.warningAuthors && paper.warningAuthors.length > 0) {
      note = paper.warningAuthors
        .map(wa => `${wa.name} (${wa.email}): Over quota - ${wa.paperCount} papers, this is paper #${wa.paperRank}`)
        .join('; ')
    }

    // Check if has linked authors
    const linkedAuthorEmails = paper.authorEmails.filter(email => emailToMergeGroup.has(email))
    let addition = ''
    if (linkedAuthorEmails.length > 0) {
      const linkedAuthorsInfo = linkedAuthorEmails.map(email => {
        const merge = emailToMergeGroup.get(email)!
        const allEmails = [merge.primaryEmail, ...merge.mergedEmails]
        return `${paper.authorNames[paper.authorEmails.indexOf(email)]} linked with ${allEmails.length - 1} other(s)`
      })
      addition = linkedAuthorsInfo.join('; ')
    }

    // Mark warning authors

    // Build author list with organizations, mark corresponding authors with *
    const authorsList = paper.authorNames.map((name, idx) => {
      const isCorresponding = paper.correspondingAuthorIndices.includes(idx)
      const organization = paper.authorOrganizations[idx] || ''
      const authorWithOrg = organization ? `${name} (${organization})` : name
      return isCorresponding ? authorWithOrg + '*' : authorWithOrg
    }).join('; ')

    // Corresponding authors
    const correspondingAuthors = paper.authorNames
      .filter((_, idx) => paper.correspondingAuthorIndices.includes(idx))
      .join('; ')

    return {
      'Paper ID': paper.paperId,
      'Original Paper ID': paper.originalPaperId,
      'Created': paper.created,
      'Last Modified': paper.lastModified,
      'Paper Title': paper.title,
      'Abstract': paper.abstract,
      'Primary Contact Author Name': paper.primaryContactAuthorName,
      'Primary Contact Author Email': paper.primaryContactAuthorEmail,
      'Authors': authorsList,
      'Author Names': paper.authorNames.join('; '),
      'Author Emails': paper.authorEmails.join('; '),
      'Track Name': paper.trackName,
      'Primary Subject Area': paper.primarySubjectArea,
      'Secondary Subject Areas': paper.secondarySubjectAreas.join('; '),
      'Conflicts': paper.conflicts,
      'Assigned': paper.assigned,
      'Completed': paper.completed,
      '% Completed': paper.percentCompleted,
      'Bids': paper.bids,
      'Discussion': paper.discussion,
      'Status': paper.status,
      'Requested For Author Feedback': paper.requestedForAuthorFeedback,
      'Author Feedback Submitted?': paper.authorFeedbackSubmitted,
      'Requested For Camera Ready': paper.requestedForCameraReady,
      'Camera Ready Submitted?': paper.cameraReadySubmitted,
      'Requested For Presentation': paper.requestedForPresentation,
      'Files': paper.files,
      'Number of Files': paper.numberOfFiles,
      'Supplementary Files': paper.supplementaryFiles,
      'Number of Supplementary Files': paper.numberOfSupplementaryFiles,
      'Reviewers': paper.reviewers,
      'Reviewer Emails': paper.reviewerEmails,
      'MetaReviewers': paper.metaReviewers,
      'MetaReviewer Emails': paper.metaReviewerEmails,
      'SeniorMetaReviewers': paper.seniorMetaReviewers,
      'SeniorMetaReviewerEmails': paper.seniorMetaReviewerEmails,
      'Chair Note (Reject reason)': paper.chairNote,
      '[Review] Min (Overall Rating)': paper.reviewMinOverallRating,
      '[Review] Max (Overall Rating)': paper.reviewMaxOverallRating,
      '[Review] Avg (Overall Rating)': paper.reviewAvgOverallRating,
      '[Review] Spread (Overall Rating)': paper.reviewSpreadOverallRating,

      // New columns for organization and corresponding author info
      'Organizations': paper.authorOrganizations.join('; '),
      'Corresponding Authors': correspondingAuthors,

      // Marking columns
      'Is Marked': isMarked ? 'Yes' : 'No',
      'Note': note,
      'Addition': addition,
    }
  })

  // Create empty worksheet
  const worksheet: any = {}

  // First row: Dataset label and filter conditions
  const infoText = `Dataset: ${datasetLabel} | Filters: ${filterInfo}`
  worksheet['A1'] = { v: infoText, t: 's' }

  // Second row: Empty

  // Third row: Column headers (matching original format)
  const headers = [
    'Paper ID', 'Original Paper ID', 'Created', 'Last Modified',
    'Paper Title', 'Abstract',
    'Primary Contact Author Name', 'Primary Contact Author Email',
    'Authors', 'Author Names', 'Author Emails',
    'Track Name', 'Primary Subject Area', 'Secondary Subject Areas',
    'Conflicts', 'Assigned', 'Completed', '% Completed', 'Bids', 'Discussion',
    'Status',
    'Requested For Author Feedback', 'Author Feedback Submitted?',
    'Requested For Camera Ready', 'Camera Ready Submitted?', 'Requested For Presentation',
    'Files', 'Number of Files', 'Supplementary Files', 'Number of Supplementary Files',
    'Reviewers', 'Reviewer Emails', 'MetaReviewers', 'MetaReviewer Emails',
    'SeniorMetaReviewers', 'SeniorMetaReviewerEmails',
    'Chair Note (Reject reason)',
    '[Review] Min (Overall Rating)', '[Review] Max (Overall Rating)',
    '[Review] Avg (Overall Rating)', '[Review] Spread (Overall Rating)',
    // New columns for additional info
    'Organizations', 'Corresponding Authors',
    // Marking columns
    'Is Marked', 'Note', 'Addition'
  ]

  headers.forEach((header, colIdx) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 2, c: colIdx })
    worksheet[cellAddress] = { v: header, t: 's' }
  })

  // Add data starting from row 4
  rows.forEach((row, rowIdx) => {
    const dataRow = rowIdx + 3 // Start from row 4 (index 3)
    // Write data in headers order
    headers.forEach((header, colIdx) => {
      const cellAddress = XLSX.utils.encode_cell({ r: dataRow, c: colIdx })
          const value = (row as Record<string, unknown>)[header]
      worksheet[cellAddress] = { v: value, t: typeof value === 'number' ? 'n' : 's' }
    })
  })

  // Set worksheet range
  const range = {
    s: { r: 0, c: 0 },
    e: { r: rows.length + 2, c: headers.length - 1 }
  }
  worksheet['!ref'] = XLSX.utils.encode_range(range)

  // Apply styles
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })

      // Ensure cell exists, even if empty
      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = { v: '', t: 's' }
      }

      // Initialize cell style
      if (!worksheet[cellAddress].s) {
        worksheet[cellAddress].s = {}
      }

      // First row: Info row style (blue background, white bold)
      if (R === 0) {
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
          fill: { patternType: 'solid', fgColor: { rgb: '3B82F6' } },
          alignment: { horizontal: 'left', vertical: 'center' },
        }
      }
      // Second row: Empty, no style
      else if (R === 1) {
        // Empty row
      }
      // Third row: Header row style (dark gray background, white text)
      else if (R === 2) {
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { patternType: 'solid', fgColor: { rgb: '4A5568' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        }
      }
      // Data rows (starting from row 4, index 3)
      else {
        const paper = papers[R - 3] // Subtract 3 rows (info, empty, header)

        // Warning records use rose pink background (MistyRose/Light Rose)
        if (paper.hasWarning) {
          worksheet[cellAddress].s = {
            fill: { patternType: 'solid', fgColor: { rgb: 'FFE4E8' } }, // Rose Pink
            alignment: { vertical: 'top', wrapText: true },
          }
        } else {
          worksheet[cellAddress].s = {
            alignment: { vertical: 'top', wrapText: true },
          }
        }

        // Special column handling - column name in row 3 (index 2)
        const headerCell = worksheet[XLSX.utils.encode_cell({ r: 2, c: C })]
        const colName = headerCell?.v

        // Authors column: only mark warning authors in red
        if (colName === 'Authors') {
          const hasWarningAuthors = paper.warningAuthors && paper.warningAuthors.length > 0

          if (hasWarningAuthors) {
            // Has warning authors - red bold text
            worksheet[cellAddress].s.font = { color: { rgb: 'DC2626' }, bold: true }
          }
        }

        // Note column - if has content, use orange text for emphasis
        if (colName === 'Note' && worksheet[cellAddress].v) {
          if (!worksheet[cellAddress].s.font) {
            worksheet[cellAddress].s.font = {}
          }
          worksheet[cellAddress].s.font.color = { rgb: 'EA580C' }
        }

        // Addition column - if has content, use purple text
        if (colName === 'Addition' && worksheet[cellAddress].v) {
          if (!worksheet[cellAddress].s.font) {
            worksheet[cellAddress].s.font = {}
          }
          worksheet[cellAddress].s.font.color = { rgb: '9333EA' }
        }

        // Is Marked column - Yes in red, No in green
        if (colName === 'Is Marked') {
          if (!worksheet[cellAddress].s.font) {
            worksheet[cellAddress].s.font = {}
          }
          if (worksheet[cellAddress].v === 'Yes') {
            worksheet[cellAddress].s.font.color = { rgb: 'DC2626' }
            worksheet[cellAddress].s.font.bold = true
          } else {
            worksheet[cellAddress].s.font.color = { rgb: '16A34A' }
          }
        }
      }
    }
  }

  // Set column widths (matching new column order)
  worksheet['!cols'] = [
    { wch: 10 },  // Paper ID
    { wch: 20 },  // Original Paper ID
    { wch: 20 },  // Created
    { wch: 20 },  // Last Modified
    { wch: 50 },  // Paper Title
    { wch: 80 },  // Abstract
    { wch: 25 },  // Primary Contact Author Name
    { wch: 35 },  // Primary Contact Author Email
    { wch: 60 },  // Authors (with organizations and markers)
    { wch: 40 },  // Author Names
    { wch: 50 },  // Author Emails
    { wch: 20 },  // Track Name
    { wch: 25 },  // Primary Subject Area
    { wch: 30 },  // Secondary Subject Areas
    { wch: 20 },  // Conflicts
    { wch: 15 },  // Assigned
    { wch: 15 },  // Completed
    { wch: 20 },  // % Completed
    { wch: 15 },  // Bids
    { wch: 30 },  // Discussion
    { wch: 15 },  // Status
    { wch: 30 },  // Requested For Author Feedback
    { wch: 30 },  // Author Feedback Submitted?
    { wch: 30 },  // Requested For Camera Ready
    { wch: 30 },  // Camera Ready Submitted?
    { wch: 30 },  // Requested For Presentation
    { wch: 50 },  // Files
    { wch: 20 },  // Number of Files
    { wch: 50 },  // Supplementary Files
    { wch: 30 },  // Number of Supplementary Files
    { wch: 40 },  // Reviewers
    { wch: 50 },  // Reviewer Emails
    { wch: 40 },  // MetaReviewers
    { wch: 50 },  // MetaReviewer Emails
    { wch: 40 },  // SeniorMetaReviewers
    { wch: 50 },  // SeniorMetaReviewerEmails
    { wch: 60 },  // Chair Note (Reject reason)
    { wch: 25 },  // [Review] Min (Overall Rating)
    { wch: 25 },  // [Review] Max (Overall Rating)
    { wch: 25 },  // [Review] Avg (Overall Rating)
    { wch: 30 },  // [Review] Spread (Overall Rating)
    { wch: 40 },  // Organizations
    { wch: 30 },  // Corresponding Authors
    { wch: 12 },  // Is Marked
    { wch: 80 },  // Note
    { wch: 40 },  // Addition
  ]

  // Calculate row heights dynamically based on content
  const calculateRowHeight = (rowIndex: number): number => {
    if (rowIndex === 0) return 30 // First row info
    if (rowIndex === 1) return 10 // Second row empty
    if (rowIndex === 2) return 25 // Third row headers

    // For data rows, calculate based on content
    let maxLines = 1
    for (let C = 0; C < headers.length; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: C })
      const cell = worksheet[cellAddress]
      if (!cell || !cell.v) continue

      const content = String(cell.v)
      const colWidth = worksheet['!cols'][C]?.wch || 10

      // Account for explicit line breaks first
      const explicitLines = (content.match(/\n/g) || []).length + 1

      // Estimate lines needed based on content length and column width
      // Excel column width unit is roughly 1 character width
      // Use conservative estimate: 0.9 to account for character width variations
      const charsPerLine = Math.max(1, Math.floor(colWidth * 0.9))
      const estimatedLines = Math.ceil(content.length / charsPerLine)

      // Take the maximum of explicit lines and estimated lines
      const totalLines = Math.max(explicitLines, estimatedLines)

      maxLines = Math.max(maxLines, totalLines)
    }

    // Calculate pixel height: ~15px per line + 6px padding
    // Minimum height: 20px, Maximum height: 300px
    const calculatedHeight = maxLines * 15 + 6
    return Math.max(20, Math.min(calculatedHeight, 300))
  }

  worksheet['!rows'] = []
  for (let R = 0; R <= range.e.r; ++R) {
    worksheet['!rows'][R] = { hpx: calculateRowHeight(R) }
  }

  // Merge first row cells (span info across all columns)
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }
  ]

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Papers')

  // Export as ArrayBuffer
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  })

  return excelBuffer as ArrayBuffer
}
