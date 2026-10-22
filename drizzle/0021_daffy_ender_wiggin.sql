CREATE TABLE "booking_bikes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"bike" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_bikes_position_check" CHECK (position between 2 and 3)
);
--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "booking_position" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "bike_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_bikes" ADD CONSTRAINT "booking_bikes_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_booking_bikes_booking_position" ON "booking_bikes" USING btree ("booking_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_work_orders_booking_position" ON "work_orders" USING btree ("booking_id","booking_position");--> statement-breakpoint
CREATE INDEX "idx_work_orders_booking" ON "work_orders" USING btree ("booking_id");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_bike_count_check" CHECK (bike_count between 1 and 3);