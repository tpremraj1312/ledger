import dotenv from 'dotenv';
dotenv.config();

import { parseBillWithGemini } from '../utils/gemini.helper.js';

/**
 * @desc    Handles uploaded bill (image or PDF) and sends it to Gemini for extraction
 * @route   POST /api/billscan
 * @access  Private
 */
export const handleBillScan = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Extract buffer and mimetype
    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    // Call Gemini helper to process the bill
    const parsedData = await parseBillWithGemini(fileBuffer, mimeType);

    return res.status(200).json({
      success: true,
      message: 'Bill scanned and parsed successfully',
      data: parsedData,
    });

  } catch (error) {
    console.error('Error in handleBillScan:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while scanning the bill',
      error: error.message,
    });
  }
};
