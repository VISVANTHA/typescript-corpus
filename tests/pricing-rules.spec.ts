import { expect } from "chai";
import { discountRate, volumeBonus, effectiveRate } from "../packages/domain/src/services/pricing-rules";
import { taxRateFor, applyTax, round2 } from "../packages/domain/src/models/tax-table";

describe("pricing rules", () => {
  it("maps every tier to its rate", () => {
    expect(discountRate("gold")).to.equal(0.15);
    expect(discountRate("silver")).to.equal(0.08);
    expect(discountRate("bronze")).to.equal(0.03);
    expect(discountRate("standard")).to.equal(0);
  });

  it("steps the volume bonus at 25, 100 and 500 units", () => {
    expect(volumeBonus(24)).to.equal(0);
    expect(volumeBonus(25)).to.equal(0.01);
    expect(volumeBonus(100)).to.equal(0.025);
    expect(volumeBonus(500)).to.equal(0.05);
  });

  it("caps the combined rate at 20 percent", () => {
    expect(effectiveRate("gold", 500)).to.equal(0.2);
  });

  it("knows the tax rate per channel", () => {
    expect(taxRateFor("retail")).to.equal(0.0825);
    expect(taxRateFor("wholesale")).to.equal(0.0625);
    expect(taxRateFor("partner")).to.equal(0);
  });

  it("rounds to two places away from float error", () => {
    expect(round2(1.005)).to.equal(1.01);
    expect(applyTax(100, "retail")).to.equal(8.25);
  });
});
