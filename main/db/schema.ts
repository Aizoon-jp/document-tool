import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
}

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tradeName: text('trade_name'),
  postalCode: text('postal_code'),
  address: text('address'),
  tel: text('tel'),
  fax: text('fax'),
  email: text('email'),
  website: text('website'),
  representativeName: text('representative_name'),
  invoiceNumber: text('invoice_number'),
  bankName: text('bank_name'),
  bankBranch: text('bank_branch'),
  bankAccountType: text('bank_account_type'),
  bankAccountNumber: text('bank_account_number'),
  bankAccountHolderKana: text('bank_account_holder_kana'),
  ...timestamps,
})

export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  honorific: text('honorific').notNull().default('御中'),
  postalCode: text('postal_code'),
  address: text('address'),
  tel: text('tel'),
  contactPerson: text('contact_person'),
  contactDepartment: text('contact_department'),
  paymentTerms: text('payment_terms'),
  defaultTaxCategory: text('default_tax_category').notNull().default('taxable_10'),
  notes: text('notes'),
  ...timestamps,
})

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  unitPrice: real('unit_price').notNull().default(0),
  unit: text('unit').notNull().default('式'),
  taxRate: integer('tax_rate').notNull().default(10),
  isReducedTaxRate: integer('is_reduced_tax_rate', { mode: 'boolean' })
    .notNull()
    .default(false),
  defaultQuantity: real('default_quantity').notNull().default(1),
  notes: text('notes'),
  ...timestamps,
})

export const stamps = sqliteTable('stamps', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  imagePath: text('image_path').notNull(),
  defaultXMm: real('default_x_mm').notNull().default(0),
  defaultYMm: real('default_y_mm').notNull().default(0),
  widthMm: real('width_mm').notNull().default(25),
  opacity: real('opacity').notNull().default(0.8),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
})

export const documentSettings = sqliteTable('document_settings', {
  id: text('id').primaryKey(),
  documentType: text('document_type').notNull().unique(),
  numberFormat: text('number_format').notNull(),
  defaultOptions: text('default_options', { mode: 'json' }).notNull(),
  defaultRemarks: text('default_remarks'),
  ...timestamps,
})

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  documentType: text('document_type').notNull(),
  documentNumber: text('document_number').notNull(),
  issueDate: text('issue_date').notNull(),
  clientId: text('client_id')
    .notNull()
    .references(() => clients.id),
  subtotal: real('subtotal').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  totalAmount: real('total_amount').notNull().default(0),
  withholdingTax: real('withholding_tax').notNull().default(0),
  options: text('options', { mode: 'json' }).notNull(),
  stampId: text('stamp_id').references(() => stamps.id),
  detailMode: text('detail_mode').notNull().default('direct'),
  remarks: text('remarks'),
  pdfFilePath: text('pdf_file_path'),
  ...timestamps,
})

export const documentLines = sqliteTable('document_lines', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  lineNumber: integer('line_number').notNull(),
  content: text('content').notNull(),
  quantity: real('quantity').notNull().default(1),
  unit: text('unit').notNull().default('式'),
  unitPrice: real('unit_price').notNull().default(0),
  taxRate: integer('tax_rate').notNull().default(10),
  isReducedTaxRate: integer('is_reduced_tax_rate', { mode: 'boolean' })
    .notNull()
    .default(false),
  subtotalExclTax: real('subtotal_excl_tax').notNull().default(0),
  subtotalInclTax: real('subtotal_incl_tax').notNull().default(0),
})
