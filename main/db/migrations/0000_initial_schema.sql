CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`honorific` text DEFAULT '御中' NOT NULL,
	`postal_code` text,
	`address` text,
	`tel` text,
	`contact_person` text,
	`contact_department` text,
	`payment_terms` text,
	`default_tax_category` text DEFAULT 'taxable_10' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`trade_name` text,
	`postal_code` text,
	`address` text,
	`tel` text,
	`fax` text,
	`email` text,
	`website` text,
	`representative_name` text,
	`invoice_number` text,
	`bank_name` text,
	`bank_branch` text,
	`bank_account_type` text,
	`bank_account_number` text,
	`bank_account_holder_kana` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `document_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`line_number` integer NOT NULL,
	`content` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit` text DEFAULT '式' NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL,
	`tax_rate` integer DEFAULT 10 NOT NULL,
	`is_reduced_tax_rate` integer DEFAULT false NOT NULL,
	`subtotal_excl_tax` real DEFAULT 0 NOT NULL,
	`subtotal_incl_tax` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `document_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`document_type` text NOT NULL,
	`number_format` text NOT NULL,
	`default_options` text NOT NULL,
	`default_remarks` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_settings_document_type_unique` ON `document_settings` (`document_type`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`document_type` text NOT NULL,
	`document_number` text NOT NULL,
	`issue_date` text NOT NULL,
	`client_id` text NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`withholding_tax` real DEFAULT 0 NOT NULL,
	`options` text NOT NULL,
	`stamp_id` text,
	`detail_mode` text DEFAULT 'direct' NOT NULL,
	`remarks` text,
	`pdf_file_path` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`stamp_id`) REFERENCES `stamps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL,
	`unit` text DEFAULT '式' NOT NULL,
	`tax_rate` integer DEFAULT 10 NOT NULL,
	`is_reduced_tax_rate` integer DEFAULT false NOT NULL,
	`default_quantity` real DEFAULT 1 NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stamps` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`image_path` text NOT NULL,
	`default_x_mm` real DEFAULT 0 NOT NULL,
	`default_y_mm` real DEFAULT 0 NOT NULL,
	`width_mm` real DEFAULT 25 NOT NULL,
	`opacity` real DEFAULT 0.8 NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
