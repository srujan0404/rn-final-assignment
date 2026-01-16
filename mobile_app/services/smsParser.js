const TRANSACTION_KEYWORDS = [
  'debited', 'credited', 'spent', 'paid', 'withdrawn', 'transaction',
  'purchase', 'payment', 'debit', 'credit', 'upi', 'transferred',
  'transfer', 'sent', 'received', 'card', 'atm', 'pos', 'imps', 'neft'
];

const EXPENSE_KEYWORDS = [
  'debited', 'spent', 'paid', 'withdrawn', 'purchase', 'payment',
  'debit', 'sent', 'transfer'
];

const CATEGORY_KEYWORDS = {
  Food: ['restaurant', 'cafe', 'food', 'zomato', 'swiggy', 'dominos', 'pizza', 'burger', 'mcd', 'kfc', 'subway', 'starbucks', 'dunkin', 'cafe coffee day', 'ccd', 'barbeque', 'biryani', 'kitchen', 'dhaba', 'hotel', 'zomato'],
  Transport: ['uber', 'ola', 'rapido', 'metro', 'petrol', 'fuel', 'gas', 'parking', 'toll', 'taxi', 'cab', 'auto', 'bus', 'train', 'irctc', 'paytm toll', 'fastag', 'bharatpe'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'shopping', 'mall', 'store', 'shop', 'market', 'online', 'retail', 'supermarket', 'walmart', 'target', 'big bazaar', 'dmart', 'reliance', 'grocery'],
  Bills: ['electricity', 'water', 'gas', 'bill', 'recharge', 'mobile', 'internet', 'broadband', 'wifi', 'postpaid', 'utility', 'rent', 'emi', 'loan', 'insurance', 'airtel', 'jio', 'vodafone', 'bsnl', 'tata sky', 'dish'],
  Entertainment: ['movie', 'netflix', 'amazon prime', 'hotstar', 'spotify', 'youtube', 'cinema', 'pvr', 'inox', 'gaming', 'game', 'entertainment', 'concert', 'event', 'ticket', 'bookmyshow', 'paytm movies'],
  Health: ['hospital', 'clinic', 'pharmacy', 'medicine', 'doctor', 'health', 'medical', 'apollo', 'fortis', 'max', 'medlife', 'pharmeasy', '1mg', 'netmeds', 'lab', 'diagnostic', 'therapy'],
};

const BANK_SENDERS = [
  'SBI', 'HDFC', 'ICICI', 'AXIS', 'KOTAK', 'PNB', 'BOB', 'CANARA',
  'UNION', 'INDIAN', 'PAYTM', 'PHONEPE', 'GPAY', 'BHIM', 'AMAZONPAY', "DAD"
];

export const isTransactionSMS = (message, sender) => {
  if (!message || !sender) return false;
  
  const msgLower = message.toLowerCase();
  const senderUpper = sender.toUpperCase();
  
  const isFromBank = BANK_SENDERS.some(bank => senderUpper.includes(bank));
  
  const hasTransactionKeyword = TRANSACTION_KEYWORDS.some(keyword => 
    msgLower.includes(keyword)
  );
  
  const hasAmountPattern = /(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/i.test(message) ||
                          /[\d,]+(?:\.\d{2})?\s*(?:inr|rs\.?|₹)/i.test(message);
  
  return (isFromBank || hasTransactionKeyword) && hasAmountPattern;
};

export const isExpenseTransaction = (message) => {
  if (!message) return false;
  
  const msgLower = message.toLowerCase();
  
  const hasExpenseKeyword = EXPENSE_KEYWORDS.some(keyword => 
    msgLower.includes(keyword)
  );
  
  const isCreditKeyword = msgLower.includes('credited') || 
                         msgLower.includes('received') || 
                         msgLower.includes('refund');
  
  return hasExpenseKeyword && !isCreditKeyword;
};

export const extractAmount = (message) => {
  if (!message) return null;
  
  const pattern1 = /(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{2})?)/i;
  const match1 = message.match(pattern1);
  if (match1) {
    return parseFloat(match1[1].replace(/,/g, ''));
  }
  
  const pattern2 = /([\d,]+(?:\.\d{2})?)\s*(?:inr|rs\.?|₹)/i;
  const match2 = message.match(pattern2);
  if (match2) {
    return parseFloat(match2[1].replace(/,/g, ''));
  }
  
  const pattern3 = /(?:debited|paid|spent|withdrawn)\s+(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{2})?)/i;
  const match3 = message.match(pattern3);
  if (match3) {
    return parseFloat(match3[1].replace(/,/g, ''));
  }
  
  return null;
};

export const extractMerchant = (message) => {
  if (!message) return 'Unknown Merchant';
  
  let pattern = /(?:at|to)\s+([A-Z][A-Z\s&.-]+?)(?:\s+on|\s+for|\.|\s+upi|$)/i;
  let match = message.match(pattern);
  if (match && match[1].length > 2 && match[1].length < 50) {
    return match[1].trim();
  }
  
  pattern = /merchant\s+([A-Z][A-Z\s&.-]+?)(?:\s+on|\s+for|\.|\s+ref|$)/i;
  match = message.match(pattern);
  if (match && match[1].length > 2 && match[1].length < 50) {
    return match[1].trim();
  }
  
  pattern = /UPI\/([A-Za-z0-9@.\s]+?)(?:\/|\.|\s+on)/i;
  match = message.match(pattern);
  if (match && match[1].length > 2 && match[1].length < 50) {
    return match[1].trim();
  }
  
  return 'Unknown Merchant';
};

export const extractDate = (message, smsTimestamp) => {
  if (!message) return new Date(smsTimestamp || Date.now());
  
  const pattern = /(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/;
  const match = message.match(pattern);
  
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const year = match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3]);
    return new Date(year, month, day);
  }
  
  return new Date(smsTimestamp || Date.now());
};

export const extractPaymentMethod = (message) => {
  if (!message) return 'Card';
  
  const msgLower = message.toLowerCase();
  
  if (msgLower.includes('upi') || msgLower.includes('gpay') || 
      msgLower.includes('phonepe') || msgLower.includes('paytm') ||
      msgLower.includes('bhim')) {
    return 'UPI';
  }
  
  if (msgLower.includes('card') || msgLower.includes('pos') ||
      msgLower.includes('swipe')) {
    return 'Card';
  }
  
  if (msgLower.includes('atm') || msgLower.includes('cash')) {
    return 'Cash';
  }
  
  if (msgLower.includes('neft') || msgLower.includes('imps') ||
      msgLower.includes('rtgs') || msgLower.includes('net banking')) {
    return 'Net Banking';
  }
  
  return 'Card';
};

export const predictCategory = (merchant, message) => {
  if (!merchant && !message) return 'Other';
  
  const searchText = `${merchant} ${message}`.toLowerCase();
  let maxScore = 0;
  let predictedCategory = 'Other';
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      predictedCategory = category;
    }
  }
  
  return predictedCategory;
};

export const getCategoryConfidence = (merchant, message) => {
  if (!merchant && !message) return 0;
  
  const searchText = `${merchant} ${message}`.toLowerCase();
  let maxMatches = 0;
  
  for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
    let matches = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        matches += 1;
      }
    }
    maxMatches = Math.max(maxMatches, matches);
  }

  if (maxMatches === 0) return 0.3;
  if (maxMatches === 1) return 0.6;
  if (maxMatches === 2) return 0.8;
  return 0.95;
};

export const parseSMSToExpense = (smsData) => {
  const { message, sender, timestamp } = smsData;
  
  if (!isTransactionSMS(message, sender)) {
    return null;
  }
  
  if (!isExpenseTransaction(message)) {
    return null;
  }
  
  const amount = extractAmount(message);
  if (!amount || amount <= 0) {
    return null;
  }
  
  const merchant = extractMerchant(message);
  const date = extractDate(message, timestamp);
  const paymentMethod = extractPaymentMethod(message);
  const category = predictCategory(merchant, message);
  const confidence = getCategoryConfidence(merchant, message);
  
  return {
    amount,
    merchant,
    category,
    paymentMethod,
    date,
    description: `Auto-detected from SMS: ${merchant}`,
    confidence,
    needsReview: confidence < 0.7,
    originalSMS: message,
    smsSender: sender,
    smsTimestamp: timestamp,
  };
};

export const parseSMSBatch = (smsArray) => {
  if (!Array.isArray(smsArray)) return [];
  
  return smsArray
    .map(sms => parseSMSToExpense(sms))
    .filter(expense => expense !== null);
};

