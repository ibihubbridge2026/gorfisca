// Types alignés avec le backend Django
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
export type AccountClass = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type TransactionStatus = 'matched' | 'pending' | 'error'

export interface Account {
  id: string
  code: string
  label: string
  account_type: AccountType
  account_class: AccountClass
  is_active: boolean
  parent?: string
  debit: number
  credit: number
  balance: number
  organization: string
  created_at: string
  updated_at: string
}

export interface JournalEntry {
  id: string
  reference: string
  date: string
  description: string
  is_posted: boolean
  created_by: string
  posted_by?: string
  posted_at?: string
  organization: string
  created_at: string
  lines: JournalLine[]
  source: 'manual' | 'api' | 'ai_suggestion'
  is_validated: boolean
  validated_by?: string
  validated_at?: string
  hash?: string
  previous_hash?: string
  total_debit?: number
  total_credit?: number
  is_balanced?: boolean
  lines_count?: number
}

export interface JournalLine {
  id: string
  entry: string
  account: string
  account_code: string
  account_label: string
  line_type: 'debit' | 'credit'
  amount: number
  description?: string
}

export interface Organization {
  id: string
  name: string
  legal_identifier: string
  address?: string
  phone?: string
  email?: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  phone?: string
  user_type: 'admin' | 'accountant' | 'manager' | 'employee'
  organization: string
  is_active: boolean
  date_joined: string
  last_login?: string
}
