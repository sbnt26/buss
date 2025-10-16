import fs from 'fs/promises';
import path from 'path';
import { config } from './config';
import { createReadStream } from 'fs';

/**
 * Save PDF to filesystem
 * Path structure: {basePath}/{orgId}/{year}/{invoiceNumber}.pdf
 */
export async function savePDF(
  buffer: Buffer,
  organizationId: number,
  year: number,
  invoiceNumber: string
): Promise<string> {
  const basePath = config.storage.pdfPath;
  const fileName = `${invoiceNumber.replace(/\//g, '-')}.pdf`;
  const dirPath = path.join(basePath, organizationId.toString(), year.toString());
  const filePath = path.join(dirPath, fileName);

  try {
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Write PDF file
    await fs.writeFile(filePath, buffer);

    // Return relative path
    const relativePath = path.join(
      organizationId.toString(),
      year.toString(),
      fileName
    );

    return relativePath;
  } catch (error) {
    console.error('File save error:', error);
    throw new Error('Failed to save PDF file');
  }
}

/**
 * Get absolute path to PDF file
 */
export function getPDFPath(relativePath: string): string {
  return path.join(config.storage.pdfPath, relativePath);
}

/**
 * Check if PDF file exists
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const absolutePath = getPDFPath(relativePath);
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get PDF file as buffer
 */
export async function getPDFBuffer(relativePath: string): Promise<Buffer> {
  try {
    const absolutePath = getPDFPath(relativePath);
    return await fs.readFile(absolutePath);
  } catch (error) {
    console.error('File read error:', error);
    throw new Error('Failed to read PDF file');
  }
}

/**
 * Create read stream for PDF (efficient for large files)
 */
export function streamPDF(relativePath: string): NodeJS.ReadableStream {
  const absolutePath = getPDFPath(relativePath);
  return createReadStream(absolutePath);
}

/**
 * Delete PDF file
 */
export async function deletePDF(relativePath: string): Promise<void> {
  try {
    const absolutePath = getPDFPath(relativePath);
    await fs.unlink(absolutePath);
  } catch (error) {
    console.error('File delete error:', error);
    throw new Error('Failed to delete PDF file');
  }
}

/**
 * Get file size in bytes
 */
export async function getFileSize(relativePath: string): Promise<number> {
  try {
    const absolutePath = getPDFPath(relativePath);
    const stats = await fs.stat(absolutePath);
    return stats.size;
  } catch (error) {
    console.error('File stat error:', error);
    throw new Error('Failed to get file size');
  }
}



