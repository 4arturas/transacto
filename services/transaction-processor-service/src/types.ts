export type TransactionEvent = {
  eventId: string;
  eventType: 'TRANSACTION_POSTED';
  timestamp: string;
  payload: {
    transactionId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    currency: 'EUR' | 'DKK' | 'USD';
    description: string;
  };
};

export type AccountRow = {
  account_id: string;
  balance: string;
  currency: string;
  updated_at: Date;
};
