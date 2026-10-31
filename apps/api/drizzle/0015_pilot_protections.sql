CREATE TABLE "pilot_admissions" (
	"operation_id" uuid PRIMARY KEY NOT NULL,
	"invitation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pilot_attempts" (
	"receipt_id" uuid PRIMARY KEY NOT NULL,
	"operation_id" uuid NOT NULL,
	"model" text NOT NULL,
	"usage_model" text,
	"input_nano_usd_per_token" integer NOT NULL,
	"output_nano_usd_per_token" integer NOT NULL,
	"input_tokens_upper_bound" integer NOT NULL,
	"output_tokens_upper_bound" integer NOT NULL,
	"reserved_nano_usd" bigint NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"actual_nano_usd" bigint,
	"input_tokens" integer,
	"output_tokens" integer,
	"provider_request_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	CONSTRAINT "pilot_attempts_amounts" CHECK ("pilot_attempts"."reserved_nano_usd" >= 0 and ("pilot_attempts"."actual_nano_usd" is null or "pilot_attempts"."actual_nano_usd" >= 0) and "pilot_attempts"."input_nano_usd_per_token" >= 825 and "pilot_attempts"."output_nano_usd_per_token" >= 4950)
);
--> statement-breakpoint
CREATE TABLE "pilot_control" (
	"id" text PRIMARY KEY NOT NULL,
	"enabled" boolean NOT NULL,
	"activated_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"cap_nano_usd" bigint NOT NULL,
	"legacy_nano_usd" bigint NOT NULL,
	"review_reference" text NOT NULL,
	"reviewer" text NOT NULL,
	CONSTRAINT "pilot_control_constants" CHECK ("pilot_control"."id" = 'global' and "pilot_control"."cap_nano_usd" = 20000000000 and "pilot_control"."ends_at" = "pilot_control"."activated_at" + interval '720 hours' and "pilot_control"."legacy_nano_usd" >= 0 and "pilot_control"."legacy_nano_usd" <= "pilot_control"."cap_nano_usd")
);
--> statement-breakpoint
CREATE TABLE "pilot_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pilot_admissions" ADD CONSTRAINT "pilot_admissions_invitation_id_pilot_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."pilot_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_attempts" ADD CONSTRAINT "pilot_attempts_operation_id_pilot_admissions_operation_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."pilot_admissions"("operation_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilot_invitations" ADD CONSTRAINT "pilot_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_attempts_provider_receipt_uidx" ON "pilot_attempts" USING btree ("provider_request_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "pilot_invitations_user_uidx" ON "pilot_invitations" USING btree ("user_id");
--> statement-breakpoint
-- No singleton or invitation is inserted. Deploying this migration leaves AI closed.
CREATE FUNCTION pilot_preserve_control() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'pilot control is permanent'; END IF;
  IF (to_jsonb(NEW) - 'enabled') IS DISTINCT FROM (to_jsonb(OLD) - 'enabled') THEN
    RAISE EXCEPTION 'pilot window, cap and review are immutable';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER pilot_control_immutable BEFORE UPDATE OR DELETE ON pilot_control FOR EACH ROW EXECUTE FUNCTION pilot_preserve_control();
--> statement-breakpoint
CREATE FUNCTION pilot_preserve_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c pilot_control; n bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('alcide:generation:admission:v1'));
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'pilot accounting is permanent'; END IF;
  IF TG_TABLE_NAME = 'pilot_invitations' THEN
    IF TG_OP = 'UPDATE' THEN
      IF (to_jsonb(NEW) - 'user_id') IS DISTINCT FROM (to_jsonb(OLD) - 'user_id') OR NEW.user_id IS NOT NULL THEN
        RAISE EXCEPTION 'pilot invitation cannot be reassigned';
      END IF;
    ELSE
      SELECT count(*) INTO n FROM pilot_invitations;
      IF n >= 10 OR NEW.user_id IS NULL THEN RAISE EXCEPTION 'pilot invitations exhausted'; END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'pilot_admissions' THEN
    IF TG_OP = 'UPDATE' THEN RAISE EXCEPTION 'pilot admission is immutable'; END IF;
    SELECT count(*) INTO n FROM pilot_admissions;
    IF n >= 30 THEN RAISE EXCEPTION 'pilot admissions exhausted'; END IF;
    SELECT count(*) INTO n FROM pilot_admissions WHERE invitation_id = NEW.invitation_id;
    IF n >= 3 THEN RAISE EXCEPTION 'pilot personal admissions exhausted'; END IF;
  ELSIF TG_TABLE_NAME = 'pilot_attempts' THEN
    IF TG_OP = 'UPDATE' THEN
      IF OLD.state = 'settled' OR (to_jsonb(NEW) - ARRAY['state','usage_model','actual_nano_usd','input_tokens','output_tokens','provider_request_hash','settled_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['state','usage_model','actual_nano_usd','input_tokens','output_tokens','provider_request_hash','settled_at']) THEN
        RAISE EXCEPTION 'pilot receipt and provision are immutable';
      END IF;
      IF NOT ((NEW.state = 'unknown' AND NEW.usage_model IS NULL AND NEW.actual_nano_usd IS NULL AND NEW.input_tokens IS NULL AND NEW.output_tokens IS NULL AND NEW.provider_request_hash IS NULL AND NEW.settled_at IS NULL) OR
        (NEW.state = 'settled' AND NEW.usage_model IS NOT NULL AND NEW.usage_model IN ('gpt-5.4-mini', 'gpt-5.4-mini-2026-03-17') AND NEW.actual_nano_usd IS NOT NULL AND NEW.input_tokens IS NOT NULL AND NEW.output_tokens IS NOT NULL AND NEW.input_tokens >= 0 AND NEW.output_tokens >= 0 AND NEW.settled_at IS NOT NULL AND NEW.actual_nano_usd = NEW.input_tokens::bigint * NEW.input_nano_usd_per_token + NEW.output_tokens::bigint * NEW.output_nano_usd_per_token)) THEN
        RAISE EXCEPTION 'invalid pilot receipt transition';
      END IF;
    ELSE
      SELECT * INTO c FROM pilot_control WHERE id = 'global' FOR UPDATE;
      IF c.id IS NULL OR NOT c.enabled OR clock_timestamp() < c.activated_at OR clock_timestamp() >= c.ends_at THEN RAISE EXCEPTION 'pilot is closed'; END IF;
      IF NEW.state <> 'pending' OR NEW.usage_model IS NOT NULL OR NEW.actual_nano_usd IS NOT NULL OR NEW.input_tokens IS NOT NULL OR NEW.output_tokens IS NOT NULL OR NEW.settled_at IS NOT NULL OR NEW.provider_request_hash IS NOT NULL OR NEW.model NOT IN ('gpt-5.4-mini', 'gpt-5.4-mini-2026-03-17') OR NEW.input_tokens_upper_bound < 0 OR NEW.output_tokens_upper_bound < 1 OR NEW.reserved_nano_usd <> NEW.input_tokens_upper_bound::bigint * NEW.input_nano_usd_per_token + NEW.output_tokens_upper_bound::bigint * NEW.output_nano_usd_per_token THEN
        RAISE EXCEPTION 'invalid pilot provision';
      END IF;
      SELECT coalesce(sum(coalesce(actual_nano_usd, reserved_nano_usd)), 0) INTO n FROM pilot_attempts;
      IF n + c.legacy_nano_usd + NEW.reserved_nano_usd > c.cap_nano_usd THEN RAISE EXCEPTION 'pilot money exhausted'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER pilot_invitations_preserved BEFORE INSERT OR UPDATE OR DELETE ON pilot_invitations FOR EACH ROW EXECUTE FUNCTION pilot_preserve_ledger();
--> statement-breakpoint
CREATE TRIGGER pilot_admissions_preserved BEFORE INSERT OR UPDATE OR DELETE ON pilot_admissions FOR EACH ROW EXECUTE FUNCTION pilot_preserve_ledger();
--> statement-breakpoint
CREATE TRIGGER pilot_attempts_preserved BEFORE INSERT OR UPDATE OR DELETE ON pilot_attempts FOR EACH ROW EXECUTE FUNCTION pilot_preserve_ledger();
