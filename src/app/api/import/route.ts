/**
 * API Route: PDF Import
 * POST /api/import
 * Handles manual PDF upload and import
 */

import { NextRequest, NextResponse } from 'next/server';
import { importFromPDF } from '@/lib/services/import-service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Rate limiting store (in-memory for simplicity)
 * In production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for IP address
 * Max 10 imports per hour per IP
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hour = 60 * 60 * 1000; // 1 hour in milliseconds

  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitStore.set(ip, { count: 1, resetTime: now + hour });
    return true;
  }

  if (record.count >= 10) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}

/**
 * POST handler for PDF import
 * Accepts multipart form data with PDF file
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const clientIp = ip.split(',')[0].trim();

    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          details: 'Maximum 10 imports per hour per IP',
        },
        { status: 429 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file uploaded',
          details: 'Please upload a PDF file',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type',
          details: 'Only PDF files are supported',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large',
          details: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum (50MB)`,
        },
        { status: 413 }
      );
    }

    // Save file to temp directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, file.name);

    fs.writeFileSync(tempFilePath, buffer);

    // Parse import options from form data
    const skipValidation = formData.get('skipValidation') === 'true';
    const forceUpdate = formData.get('forceUpdate') === 'true';
    const dryRun = formData.get('dryRun') === 'true';

    // Import PDF
    const result = await importFromPDF(tempFilePath, {
      skipValidation,
      forceUpdate,
      dryRun,
    });

    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (error) {
      console.warn('Failed to delete temp file:', error);
    }

    // Return success response
    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          recordsImported: result.recordsImported,
          periodId: result.periodId,
          warnings: result.warnings,
          errors: result.errors,
          extractionTime: result.extractionTime,
          dryRun: result.dryRun,
        },
        { status: 200 }
      );
    }

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Import failed',
        details: result.errors.join('; '),
        warnings: result.warnings,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('Import API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for import endpoint info
 * Returns information about the API endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/import',
    method: 'POST',
    description: 'Import IDX ownership data from PDF',
    parameters: {
      file: {
        type: 'file',
        required: true,
        description: 'PDF file with ownership data',
        accept: 'application/pdf',
        maxSize: '50MB',
      },
      skipValidation: {
        type: 'boolean',
        required: false,
        default: 'false',
        description: 'Skip validation checks (not recommended)',
      },
      forceUpdate: {
        type: 'boolean',
        required: false,
        default: 'false',
        description: 'Update existing records instead of skipping',
      },
      dryRun: {
        type: 'boolean',
        required: false,
        default: 'false',
        description: 'Validate and extract but do not insert into database',
      },
    },
    rateLimit: '10 requests per hour per IP',
    response: {
      success: 'boolean',
      recordsImported: 'number',
      periodId: 'string',
      warnings: 'string[]',
      errors: 'string[]',
      extractionTime: 'number (milliseconds)',
    },
  });
}
