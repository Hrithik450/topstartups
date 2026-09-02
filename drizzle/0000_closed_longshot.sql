CREATE TABLE "claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" varchar(255) NOT NULL,
	"status" varchar(64) DEFAULT 'pending' NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"url" varchar(512) NOT NULL,
	"category" varchar(128),
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"customer_email" varchar(255),
	"manage_token" varchar(128),
	"checkout_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "claims_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "floors" (
	"id" serial PRIMARY KEY NOT NULL,
	"rank" integer NOT NULL,
	"is_claimed" boolean DEFAULT false NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"url" varchar(512) NOT NULL,
	"category" varchar(128),
	"tagline" text,
	"description" text,
	"logo_url" text,
	"price_paid" integer DEFAULT 0 NOT NULL,
	"manage_token" varchar(128),
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "floors_rank_unique" UNIQUE("rank")
);
--> statement-breakpoint
CREATE INDEX "claims_payment_id_idx" ON "claims" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "claims_status_idx" ON "claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "floors_rank_idx" ON "floors" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "floors_is_claimed_idx" ON "floors" USING btree ("is_claimed");--> statement-breakpoint
CREATE INDEX "floors_manage_token_idx" ON "floors" USING btree ("manage_token");