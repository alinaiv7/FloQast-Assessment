export const SELECTORS = {
  USER_FORM: {
    NAME_INPUT: '#userName',
    EMAIL_INPUT: '#userEmail',
    TYPE_SELECT: '#userType',
    CREATE_BUTTON: 'button[onclick="createUser()"]',
    RESULT_DIV: '#userResult'
  },

  TRANSACTION_FORM: {
    USER_ID_INPUT: '#txnUserId',
    AMOUNT_INPUT: '#txnAmount',
    TYPE_SELECT: '#txnType',
    RECIPIENT_INPUT: '#txnRecipient',
    CREATE_BUTTON: 'button[onclick="createTransaction()"]',
    RESULT_DIV: '#txnResult'
  },

  USER_DETAILS: {
    USER_ID_INPUT: '#getUserId',
    GET_BUTTON: 'button[onclick="getUser()"]',
    RESULT_DIV: '#getUserResult'
  },

  GET_TRANSACTIONS: {
    USER_ID_INPUT: '#getTxnUserId',
    GET_BUTTON: 'button[onclick="getTransactions()"]',
    RESULT_DIV: '#getTxnResult'
  },

  ACCOUNT_TYPES: {
    BASIC: 'basic',
    PREMIUM: 'premium',
    ENTERPRISE: 'enterprise'
  },

  TRANSACTION_TYPES: {
    DEPOSIT: 'deposit',
    WITHDRAWAL: 'withdrawal',
    TRANSFER: 'transfer'
  }
};
