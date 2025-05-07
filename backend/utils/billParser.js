import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Valid categories as per transaction schema
const validCategories = [
  'Groceries',
  'Junk Food (Non-Essential)',
  'Clothing',
  'Stationery',
  'Medicine',
  'Personal Care',
  'Household Items',
  'Electronics',
  'Entertainment',
  'Transportation',
  'Utilities',
  'Education',
  'Dining Out',
  'Fees/Taxes',
  'Salary',
  'Refund',
  'Business',
  'Other',
];

// Attempt to repair malformed JSON
const repairJson = (rawText) => {
  let cleaned = rawText
    .replace(/```json|```/g, '') // Remove markdown wrappers
    .replace(/^[^{]*?{/, '{')    // Remove anything before first {
    .replace(/}[^}]*$/, '}')     // Remove anything after last }
    .trim();

  // Fix missing items array brackets
  cleaned = cleaned.replace(
    /"categoryTotal":\s*[\d.]+,\s*({[^}]+})/g,
    '"categoryTotal": $1, "items": [$2]'
  );

  // Ensure items is always an array
  cleaned = cleaned.replace(
    /"items":\s*({[^}]+})/g,
    '"items": [$1]'
  );

  // Add commas between objects in arrays
  cleaned = cleaned.replace(
    /}\s*{/g,
    '},{'
  );

  return cleaned;
};

// Helper function to correct category assignments
const correctCategory = (itemName, currentCategory) => {
  const name = itemName.toLowerCase();
  if (name.includes('butter') || name.includes('atta') || name.includes('rice') || 
      name.includes('dal') || name.includes('sugar') || name.includes('oil')) {
    return 'Groceries';
  }
  if (name.includes('choco') || name.includes('candy')) {
    return 'Junk Food (Non-Essential)';
  }
  if (name.includes('hair clip') || name.includes('detergent') || name.includes('harpic')) {
    return 'Household Items';
  }
  if (name.includes('tooth') || name.includes('soap') || name.includes('shampoo')) {
    return 'Personal Care';
  }
  return currentCategory;
};

export const parseBillWithGemini = async (file) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const base64Data = file.buffer.toString('base64');

    const prompt = `
Analyze this bill/receipt image and extract the following information in JSON format:
{
  "totalAmount": number,
  "date": string (in YYYY-MM-DD format),
  "storeName": string,
  "categories": [
    {
      "category": string (one of: ${validCategories.join(', ')}),
      "isNonEssential": boolean,
      "categoryTotal": number,
      "items": [
        {
          "name": string,
          "price": number,
          "quantity": number (optional, default to 1 if not specified)
        }
      ]
    }
  ]
}

Rules:
1. If any top-level field (totalAmount, date, storeName) cannot be determined, use null.
2. Every item and charge on the bill must be assigned to one of the specified categories. Use "Other" only as a last resort.
3. Categorize items based on their name/description:
   - Groceries: Staple food items (e.g., rice, wheat, bread, dal, vegetables, milk, butter, cooking oil, sugar)
   - Junk Food (Non-Essential): Snacks, sodas, candies, fast food (e.g., chips, cola, chocolate, sugar candy)
   - Clothing: Apparel (e.g., t-shirt, pants, dress, shoes)
   - Stationery: Office/school supplies (e.g., pens, notebooks, paper)
   - Medicine: Prescription or over-the-counter medications (e.g., paracetamol, bandages)
   - Personal Care: Hygiene/cosmetic products (e.g., shampoo, toothpaste, soap, lotion)
   - Household Items: Cleaning supplies, kitchenware (e.g., detergent, pans, hair clips, toilet cleaners)
   - Electronics: Gadgets, accessories (e.g., phone, charger, headphones; non-essential if luxury like gaming gear)
   - Entertainment: Leisure activities (e.g., movie tickets, streaming subscriptions)
   - Transportation: Travel expenses (e.g., fuel, bus tickets)
   - Utilities: Bills for services (e.g., electricity, water, internet)
   - Education: Academic expenses (e.g., textbooks, tuition fees)
   - Dining Out: Restaurant meals, takeout (e.g., pizza, coffee)
   - Fees/Taxes: Taxes, service fees, discounts, or rounding adjustments (e.g., sales tax, delivery fee)
   - Salary: Income-related entries (unlikely in bills, use cautiously)
   - Refund: Refund-related entries (e.g., returned items)
   - Business: Business-related expenses (e.g., office supplies, professional services)
   - Other: Items that don’t fit above (e.g., gifts, miscellaneous)
4. Set "isNonEssential": true for Junk Food (Non-Essential), Entertainment, Dining Out, and luxury Electronics (e.g., gaming accessories, not appliances). Set false for all other categories, including Fees/Taxes, Salary, Refund, and Business.
5. Calculate "categoryTotal" as the exact sum of (price * quantity) for all items in the category. If quantity is missing, assume 1.
6. For Fees/Taxes, include additional charges (e.g., CGST, SGST, service fee) or discounts as individual items with quantity 1 unless explicitly listed otherwise (e.g., {"name": "CGST", "price": 20.75, "quantity": 1}).
7. Ensure all monetary values are numbers (e.g., 1500, not "1500") and precise to two decimal places where applicable (e.g., 20.75 for taxes).
8. Date must be in YYYY-MM-DD format (e.g., 2025-05-03).
9. Store name should be the name of the business/establishment (e.g., "Walmart").
10. Minimize the number of categories used; prefer specific categories over "Other" when possible.
11. If an item could fit multiple categories, choose the most specific one (e.g., "chocolate" -> Junk Food (Non-Essential), not Groceries; "cooking oil" -> Groceries, not Other).
12. Ensure quantities are positive numbers (default to 1 if invalid or missing).
13. Ensure prices are non-negative numbers.

Example:
For a bill with:
- Rice $1500
- Wheat $300
- Bread $100
- Dal $300
- T-shirt $600
- Pant $500
- Pens $50
- CGST $50
- SGST $50
Output:
{
  "totalAmount": 3850,
  "date": "2025-05-03",
  "storeName": "General Store",
  "categories": [
    {
      "category": "Groceries",
      "isNonEssential": false,
      "categoryTotal": 2200,
      "items": [
        {"name": "Rice", "price": 1500, "quantity": 1},
        {"name": "Wheat", "price": 300, "quantity": 1},
        {"name": "Bread", "price": 100, "quantity": 1},
        {"name": "Dal", "price": 300, "quantity": 1}
      ]
    },
    {
      "category": "Clothing",
      "isNonEssential": false,
      "categoryTotal": 1100,
      "items": [
        {"name": "T-shirt", "price": 600, "quantity": 1},
        {"name": "Pant", "price": 500, "quantity": 1}
      ]
    },
    {
      "category": "Stationery",
      "isNonEssential": false,
      "categoryTotal": 50,
      "items": [
        {"name": "Pens", "price": 50, "quantity": 1}
      ]
    },
    {
      "category": "Fees/Taxes",
      "isNonEssential": false,
      "categoryTotal": 100,
      "items": [
        {"name": "CGST", "price": 50, "quantity": 1},
        {"name": "SGST", "price": 50, "quantity": 1}
      ]
    }
  ]
}
`;

    // Log file metadata
    console.log('Processing bill:', {
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.mimetype,
                data: base64Data,
              }
            }
          ]
        }
      ]
    });

    const response = await result.response;
    let rawText = await response.text();

    // Log raw response for debugging
    console.log('Raw Gemini response:', rawText);

    // Attempt to repair and clean JSON
    let cleanedText = repairJson(rawText);

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (err) {
      console.error('Failed to parse JSON after repair attempt:', cleanedText, 'Error:', err.message);
      throw new Error(`Failed to parse bill: Invalid JSON format returned from Gemini: ${err.message}`);
    }

    // Log parsed data for debugging
    console.log('Parsed bill data:', JSON.stringify(parsed, null, 2));

    // Validate parsed data structure
    if (
      !parsed ||
      !parsed.date ||
      !parsed.storeName ||
      !Array.isArray(parsed.categories) ||
      parsed.categories.length === 0
    ) {
      throw new Error('Incomplete bill information extracted: Missing date, storeName, or valid categories');
    }

    // Validate and sanitize parsed data
    parsed.categories.forEach((cat) => {
      // Ensure category is valid
      if (!validCategories.includes(cat.category)) {
        console.warn(`Invalid category "${cat.category}" found, mapping to "Other"`);
        cat.category = 'Other';
      }

      // Correct category assignments
      cat.items.forEach((item) => {
        const correctedCategory = correctCategory(item.name, cat.category);
        if (correctedCategory !== cat.category) {
          console.warn(`Reassigning item "${item.name}" from "${cat.category}" to "${correctedCategory}"`);
          cat.category = correctedCategory;
        }
      });

      // Validate isNonEssential
      cat.isNonEssential = ['Junk Food (Non-Essential)', 'Entertainment', 'Dining Out'].includes(cat.category) ||
                          (cat.category === 'Electronics' && cat.items.some(item => item.name.toLowerCase().includes('gaming')));

      // Validate items
      if (!Array.isArray(cat.items) || cat.items.length === 0) {
        throw new Error(`Category "${cat.category}" has no valid items`);
      }

      cat.items.forEach((item) => {
        // Ensure name is a non-empty string
        item.name = (item.name || 'Unknown Item').trim();
        if (!item.name) {
          item.name = 'Unknown Item';
        }

        // Ensure price is a non-negative number
        item.price = parseFloat(item.price) || 0;
        if (item.price < 0) {
          console.warn(`Negative price for item "${item.name}" in category "${cat.category}", setting to 0`);
          item.price = 0;
        }

        // Ensure quantity is at least 1, adjust price to maintain total
        const originalQuantity = parseFloat(item.quantity) || 1;
        if (originalQuantity < 1) {
          const originalTotal = item.price * originalQuantity;
          item.quantity = 1;
          item.price = originalTotal; // Maintain original item total
          console.warn(`Adjusted quantity for item "${item.name}" in category "${cat.category}" from ${originalQuantity} to 1, price set to ${item.price}`);
        } else {
          item.quantity = Math.round(originalQuantity); // Round to nearest integer
        }
      });

      // Recalculate categoryTotal
      const calculatedTotal = cat.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      if (Math.abs(calculatedTotal - (cat.categoryTotal || 0)) > 0.01) {
        console.warn(`Adjusting category total for ${cat.category}: Expected ${calculatedTotal}, Got ${cat.categoryTotal || 0}`);
        cat.categoryTotal = calculatedTotal;
      }
    });

    // Consolidate categories (move items to correct categories if needed)
    const consolidatedCategories = [];
    const categoryMap = new Map();

    parsed.categories.forEach((cat) => {
      cat.items.forEach((item) => {
        const correctedCategory = correctCategory(item.name, cat.category);
        if (!categoryMap.has(correctedCategory)) {
          categoryMap.set(correctedCategory, {
            category: correctedCategory,
            isNonEssential: ['Junk Food (Non-Essential)', 'Entertainment', 'Dining Out'].includes(correctedCategory) ||
                           (correctedCategory === 'Electronics' && item.name.toLowerCase().includes('gaming')),
            items: [],
            categoryTotal: 0
          });
        }
        const targetCategory = categoryMap.get(correctedCategory);
        targetCategory.items.push(item);
        targetCategory.categoryTotal += item.price * item.quantity;
      });
    });

    categoryMap.forEach((cat) => {
      if (cat.items.length > 0) {
        consolidatedCategories.push(cat);
      }
    });

    parsed.categories = consolidatedCategories;

    // Set totalAmount to sum of categoryTotal
    const sumCategoryTotals = parsed.categories.reduce((sum, cat) => sum + (cat.categoryTotal || 0), 0);
    if (Math.abs(sumCategoryTotals - (parsed.totalAmount || 0)) > 0.01) {
      console.warn(`Adjusting totalAmount: Expected ${sumCategoryTotals}, Got ${parsed.totalAmount || 0}`);
      parsed.totalAmount = sumCategoryTotals;
    }

    // Ensure totalAmount is positive
    if (parsed.totalAmount <= 0) {
      throw new Error('Invalid totalAmount: Must be positive');
    }

    // Log final amounts for reference
    console.log('Final Total Amount:', parsed.totalAmount, 'Sum of Category Totals:', sumCategoryTotals);

    return parsed;

  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(`Failed to parse bill: ${error.message}`);
  }
};