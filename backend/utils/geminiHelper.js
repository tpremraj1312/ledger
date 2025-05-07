import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Converts file buffer into base64 for Gemini processing
 */
function fileToBase64(buffer) {
  return buffer.toString('base64');
}

/**
 * Sends image/pdf to Gemini Vision API and parses structured data
 * @param {Buffer} fileBuffer - File buffer from Multer
 * @param {String} mimeType - MIME type like image/png, application/pdf
 * @returns {Object} Parsed bill data
 */
export const parseBillWithGemini = async (fileBuffer, mimeType) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

    const base64Data = fileToBase64(fileBuffer);

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType,
      },
    };

    const prompt = `Extract and return the following structured fields from this bill:
    - Store name
    - Date of purchase
    - List of purchased items with quantity and price
    - Total amount
    - Categorize each item (e.g., groceries, electronics, clothing, essential/non-essential)
    Return the response as JSON.`

    const result = await model.generateContent([
      { text: prompt },
      imagePart,
    ]);

    const response = await result.response;
    const text = response.text();

    // Try to parse it as JSON (Gemini sometimes responds in Markdown)
    const jsonText = text
      .replace(/```json|```/g, '') // Remove markdown formatting if present
      .trim();

    return JSON.parse(jsonText);

  } catch (error) {
    console.error('Error in parseBillWithGemini:', error);
    throw new Error('Failed to process the bill with Gemini');
  }
};
