import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const getInvestmentRecommendations = async ({ amount, riskLevel, investmentType, durationYears }) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
Given the following user preferences:

- Investment Amount: ₹${amount}
- Risk Level: ${riskLevel} (Low, Moderate, High)
- Investment Type: ${investmentType} (SIP or Lump Sum)
- Duration: ${durationYears} years

Suggest the top 5 investment plans tailored to these inputs.

Return only a JSON array in the format:
[
  {
    "planName": "string",
    "expectedReturns": "string (e.g., 10-12% annually)",
    "investmentType": "SIP or Lump Sum",
    "risk": "Low / Moderate / High",
    "description": "Detailed explanation of the plan",
    "recommendedFor": "string (e.g., beginners, high-risk takers, retirees)",
    "link": "https://example.com/invest-now"  // A real or dummy link where user can invest
  }
]

Respond only with JSON and do not include markdown or any commentary.
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const rawText = await result.response.text();
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini investment parsing error:', err);
    throw new Error('Invalid Gemini response for investment plans');
  }
};
