-- Activity level, for the Mifflin–St Jeor calorie target.
--
-- Nullable and without a default on purpose: a default would assert a fact
-- about every existing profile that nobody ever told us, and the calorie
-- target computed from it would look authoritative while being invented.
-- NULL means "not asked yet", which the nutrition screen prompts for.
ALTER TABLE "Profile" ADD COLUMN "activityLevel" TEXT;
