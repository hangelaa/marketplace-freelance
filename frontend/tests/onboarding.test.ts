import test from "node:test";
import assert from "node:assert/strict";
import { parseOnboardingRole, registrationDestination } from "../lib/auth/onboarding";

test("onboarding accepts only the two UI intents, never database privileges", () => {
  assert.equal(parseOnboardingRole("employer"), "employer");
  assert.equal(parseOnboardingRole("freelancer"), "freelancer");
  for (const value of [undefined, null, "Admin", "Regular", "Employer", ["employer"], "//evil.test"]) {
    assert.equal(parseOnboardingRole(value), null);
  }
});

test("registration requires login and never navigates directly to protected welcome", () => {
  assert.equal(registrationDestination(), "/login/?registered=1");
});
