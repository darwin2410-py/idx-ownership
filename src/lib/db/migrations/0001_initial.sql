CREATE TABLE IF NOT EXISTS "emiten" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sector" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "holders" (
	"id" serial PRIMARY KEY NOT NULL,
	"canonical_name" text NOT NULL,
	"original_name" text NOT NULL,
	"type" text NOT NULL,
	CONSTRAINT "holders_canonical_name_unique" UNIQUE("canonical_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ownership_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_id" text NOT NULL,
	"emiten_id" text NOT NULL,
	"holder_id" integer NOT NULL,
	"rank" integer NOT NULL,
	"shares_owned" integer NOT NULL,
	"ownership_percentage" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_period_emiten_holder" UNIQUE("period_id","emiten_id","holder_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "periods" (
	"id" text PRIMARY KEY NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"pdf_file_name" text NOT NULL,
	"extraction_version" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ownership_records" ADD CONSTRAINT "ownership_records_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."periods"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ownership_records" ADD CONSTRAINT "ownership_records_emiten_id_emiten_id_fk" FOREIGN KEY ("emiten_id") REFERENCES "public"."emiten"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ownership_records" ADD CONSTRAINT "ownership_records_holder_id_holders_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holders"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emiten_name_idx" ON "emiten" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holders_canonical_name_idx" ON "holders" USING btree ("canonical_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holders_original_name_idx" ON "holders" USING btree ("original_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ownership_records_period_id_idx" ON "ownership_records" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ownership_records_emiten_id_idx" ON "ownership_records" USING btree ("emiten_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ownership_records_holder_id_idx" ON "ownership_records" USING btree ("holder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ownership_records_period_emiten_idx" ON "ownership_records" USING btree ("period_id","emiten_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "periods_year_month_idx" ON "periods" USING btree ("year","month");