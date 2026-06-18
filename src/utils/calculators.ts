/**
 * Public, standard battery engineering calculations.
 * Transparent assumptions and formulas. No proprietary company data.
 */

// 1. Runtime Calculator
export interface RuntimeResult {
  runtimeHours: number;
  totalEnergyWh: number;
  usableEnergyWh: number;
  deliveredEnergyWh: number;
  dischargeCurrentA: number;
}

export function calculateRuntime(
  capacity: number,
  isWh: boolean,
  voltage: number,
  dod: number,
  efficiency: number,
  loadW: number
): RuntimeResult {
  const capacityWh = isWh ? capacity : capacity * voltage;
  const usableEnergyWh = capacityWh * (dod / 100);
  const deliveredEnergyWh = usableEnergyWh * (efficiency / 100);
  const effectiveLoadW = loadW / (efficiency / 100);

  const runtimeHours = effectiveLoadW > 0 ? usableEnergyWh / effectiveLoadW : 0;
  const capacityAh = isWh ? capacity / voltage : capacity;
  void capacityAh;
  const dischargeCurrentA = voltage > 0 ? loadW / voltage : 0;

  return {
    runtimeHours,
    totalEnergyWh: capacityWh,
    usableEnergyWh,
    deliveredEnergyWh,
    dischargeCurrentA
  };
}

// 2. C-Rate Calculator
export interface CRateResult {
  cRate: number;
  currentA: number;
  timeHours: number;
}

export function calculateCRate(
  capacityAh: number,
  inputType: "current" | "time",
  value: number
): CRateResult {
  let cRate = 0;
  let currentA = 0;
  let timeHours = 0;

  if (inputType === "current") {
    currentA = value;
    cRate = capacityAh > 0 ? currentA / capacityAh : 0;
    timeHours = cRate > 0 ? 1 / cRate : 0;
  } else {
    timeHours = value;
    cRate = timeHours > 0 ? 1 / timeHours : 0;
    currentA = capacityAh * cRate;
  }

  return { cRate, currentA, timeHours };
}

// 3. Charging Time Calculator
export interface ChargingTimeResult {
  chargeTimeHours: number;
  energyAddedWh: number;
}

export function calculateChargingTime(
  capacityAh: number,
  voltage: number,
  startSoc: number,
  targetSoc: number,
  chargeCurrentA: number,
  efficiency: number
): ChargingTimeResult {
  if (capacityAh <= 0 || chargeCurrentA <= 0) {
    return { chargeTimeHours: 0, energyAddedWh: 0 };
  }

  const socDiff = Math.max(0, targetSoc - startSoc);
  const ahNeeded = capacityAh * (socDiff / 100);
  const effectiveCurrent = chargeCurrentA * (efficiency / 100);

  // Base constant-current charge time
  let chargeTimeHours = ahNeeded / effectiveCurrent;

  // Constant-Voltage stage overhead:
  // If target SOC is above 80%, CV stage adds time because current decays exponentially.
  // Assumption: Every 1% of charge above 80% takes increasingly longer.
  if (targetSoc > 80) {
    const cvSocStart = Math.max(80, startSoc);
    const cvSocRange = targetSoc - cvSocStart;
    // We add 0.04 hours (2.4 minutes) per percentage point above 80%
    const cvOverhead = cvSocRange * 0.04;
    chargeTimeHours += cvOverhead;
  }

  const energyAddedWh = ahNeeded * voltage;

  return { chargeTimeHours, energyAddedWh };
}

// 4. Energy Conversion Calculator
export function calculateEnergyConversion(
  value: number,
  direction: "ahToWh" | "whToAh",
  voltage: number
): number {
  if (voltage <= 0) return 0;
  if (direction === "ahToWh") {
    return value * voltage;
  } else {
    return value / voltage;
  }
}

// 5. Voltage Drop Calculator
export interface VoltageDropResult {
  voltageDropV: number;
  voltageDropPercent: number;
  endVoltageV: number;
}

export function calculateVoltageDrop(
  voltage: number,
  current: number,
  lengthM: number,
  wireSizeMm2: number,
  material: "copper" | "aluminum",
  temperatureC: number
): VoltageDropResult {
  // Resistivity at 20C (ohm-meter)
  const rho20 = material === "copper" ? 1.72e-8 : 2.82e-8;
  // Temperature coefficient
  const alpha = material === "copper" ? 0.00393 : 0.0039;
  // Resistivity adjusted for temperature
  const rhoT = rho20 * (1 + alpha * (temperatureC - 20));

  // Resistance: R = rho * (2 * L) / A (for active and return lines)
  const areaM2 = wireSizeMm2 * 1e-6;
  const resistance = areaM2 > 0 ? rhoT * (2 * lengthM) / areaM2 : 0;

  const voltageDropV = current * resistance;
  const voltageDropPercent = voltage > 0 ? (voltageDropV / voltage) * 100 : 0;
  const endVoltageV = Math.max(0, voltage - voltageDropV);

  return {
    voltageDropV,
    voltageDropPercent,
    endVoltageV
  };
}

// 6. DC Cable Loss Calculator
export interface CableLossResult {
  resistanceOhm: number;
  powerLossW: number;
  energyLossWh: number;
  lossPercent: number;
}

export function calculateDcCableLoss(
  current: number,
  lengthM: number,
  wireSizeMm2: number,
  material: "copper" | "aluminum",
  temperatureC: number,
  runTimeHours: number,
  totalPowerW: number
): CableLossResult {
  const rho20 = material === "copper" ? 1.72e-8 : 2.82e-8;
  const alpha = material === "copper" ? 0.00393 : 0.0039;
  const rhoT = rho20 * (1 + alpha * (temperatureC - 20));

  const areaM2 = wireSizeMm2 * 1e-6;
  // 2-conductor run
  const resistanceOhm = areaM2 > 0 ? rhoT * (2 * lengthM) / areaM2 : 0;

  const powerLossW = Math.pow(current, 2) * resistanceOhm;
  const energyLossWh = powerLossW * runTimeHours;
  const lossPercent = totalPowerW > 0 ? (powerLossW / totalPowerW) * 100 : 0;

  return {
    resistanceOhm,
    powerLossW,
    energyLossWh,
    lossPercent
  };
}

// 7. Battery Sizing Calculator
export interface SizingResult {
  requiredEnergyWh: number;
  requiredCapacityAh: number;
  temperatureMultiplier: number;
}

export function calculateBatterySizing(
  dailyEnergyWh: number,
  autonomyDays: number,
  maxDod: number,
  voltage: number,
  systemEfficiency: number,
  temperatureC: number
): SizingResult {
  // Capacity derating due to temperature
  let temperatureMultiplier = 1.0;
  if (temperatureC >= 25) {
    temperatureMultiplier = 1.0;
  } else if (temperatureC >= 0) {
    // Linear derating from 25C (100%) down to 0C (90%) for standard lithium
    temperatureMultiplier = 0.90 + (0.10 * (temperatureC / 25));
  } else if (temperatureC >= -20) {
    // Linear derating from 0C (90%) down to -20C (70%)
    temperatureMultiplier = 0.70 + (0.20 * ((temperatureC + 20) / 20));
  } else {
    temperatureMultiplier = 0.70;
  }

  const effectiveDod = maxDod / 100;
  const effectiveEff = systemEfficiency / 100;

  const requiredEnergyWh = (effectiveDod > 0 && effectiveEff > 0 && temperatureMultiplier > 0)
    ? (dailyEnergyWh * autonomyDays) / (effectiveDod * effectiveEff * temperatureMultiplier)
    : 0;

  const requiredCapacityAh = voltage > 0 ? requiredEnergyWh / voltage : 0;

  return {
    requiredEnergyWh,
    requiredCapacityAh,
    temperatureMultiplier
  };
}

// 8. Parallel String Calculator
export interface ParallelStringResult {
  seriesCells: number;
  parallelStrings: number;
  totalCells: number;
  actualVoltageV: number;
  actualCapacityAh: number;
  actualEnergyWh: number;
}

export function calculateParallelString(
  targetVoltage: number,
  targetCapacityAh: number,
  cellVoltage: number,
  cellCapacityAh: number
): ParallelStringResult {
  const seriesCells = cellVoltage > 0 ? Math.ceil(targetVoltage / cellVoltage) : 0;
  const parallelStrings = cellCapacityAh > 0 ? Math.ceil(targetCapacityAh / cellCapacityAh) : 0;
  const totalCells = seriesCells * parallelStrings;

  const actualVoltageV = seriesCells * cellVoltage;
  const actualCapacityAh = parallelStrings * cellCapacityAh;
  const actualEnergyWh = actualVoltageV * actualCapacityAh;

  return {
    seriesCells,
    parallelStrings,
    totalCells,
    actualVoltageV,
    actualCapacityAh,
    actualEnergyWh
  };
}

// 9. BESS ROI Calculator
export interface BessRoiResult {
  annualSavingsArbitrage: number;
  annualSavingsDemand: number;
  totalAnnualSavingsYear1: number;
  paybackYears: number;
  npv: number;
  netCashFlows: number[];
}

export function calculateBessRoi(
  capex: number,
  opex: number,
  capacityKwh: number,
  dailyShiftedKwh: number,
  peakTariff: number,
  offPeakTariff: number,
  demandChargeReductionKw: number,
  demandChargePrice: number,
  rte: number,
  degradationRate: number,
  lifetimeYears: number,
  discountRate: number
): BessRoiResult {
  void capacityKwh;
  const dailyArbitrage = dailyShiftedKwh * (peakTariff - (offPeakTariff / (rte / 100)));
  const annualSavingsArbitrage = Math.max(0, dailyArbitrage * 365);
  const annualSavingsDemand = demandChargeReductionKw * demandChargePrice * 12;
  const totalAnnualSavingsYear1 = annualSavingsArbitrage + annualSavingsDemand;

  const netCashFlows: number[] = [];
  let cumulativeCash = -capex;
  let paybackYears = -1;
  let npv = -capex;

  for (let year = 1; year <= lifetimeYears; year++) {
    const degradationMultiplier = Math.pow(1 - degradationRate / 100, year - 1);
    const yearlySavings = totalAnnualSavingsYear1 * degradationMultiplier;
    const netYearlyCash = yearlySavings - opex;
    netCashFlows.push(netYearlyCash);

    cumulativeCash += netYearlyCash;
    if (cumulativeCash >= 0 && paybackYears === -1) {
      // Linear interpolation for fractional payback year
      const previousCumulative = cumulativeCash - netYearlyCash;
      const fraction = -previousCumulative / netYearlyCash;
      paybackYears = (year - 1) + fraction;
    }

    npv += netYearlyCash / Math.pow(1 + discountRate / 100, year);
  }

  // If payback was not reached within lifetime
  if (paybackYears === -1 && cumulativeCash >= 0) {
    paybackYears = lifetimeYears;
  }

  return {
    annualSavingsArbitrage,
    annualSavingsDemand,
    totalAnnualSavingsYear1,
    paybackYears,
    npv,
    netCashFlows
  };
}

// 10. Battery Degradation Estimator
export interface DegradationResult {
  cycleLossPercent: number;
  calendarLossPercent: number;
  totalLossPercent: number;
  remainingSohPercent: number;
}

export function calculateDegradation(
  chemistry: "lfp" | "nmc" | "lto" | "lead-acid",
  cycles: number,
  dod: number,
  temperature: number,
  ageYears: number
): DegradationResult {
  let ratedCycles = 4000;
  let baseCalendarRate = 1.5; // % loss per year at 25C

  switch (chemistry) {
    case "lfp":
      ratedCycles = 5000;
      baseCalendarRate = 1.5;
      break;
    case "nmc":
      ratedCycles = 2000;
      baseCalendarRate = 2.0;
      break;
    case "lto":
      ratedCycles = 15000;
      baseCalendarRate = 0.8;
      break;
    case "lead-acid":
      ratedCycles = 500;
      baseCalendarRate = 3.0;
      break;
  }

  // Arrhenius effect for temperature: degradation doubles every 10C above 25C
  const deltaT = Math.max(0, temperature - 25);
  const tempFactor = Math.pow(2, deltaT / 10);

  // Depth of Discharge factor: square relationship relative to nominal 80% DoD for lithium
  const dodFactor = chemistry === "lead-acid"
    ? Math.pow(dod / 50, 1.5) // Lead-acid is rated at 50% DoD
    : Math.pow(dod / 80, 1.7); // Lithium is rated at 80% DoD

  // Calculate losses
  const cycleLossPercent = (cycles / ratedCycles) * 20 * dodFactor * tempFactor;
  const calendarLossPercent = ageYears * baseCalendarRate * tempFactor;
  const totalLossPercent = cycleLossPercent + calendarLossPercent;
  const remainingSohPercent = Math.max(0, Math.min(100, 100 - totalLossPercent));

  return {
    cycleLossPercent,
    calendarLossPercent,
    totalLossPercent,
    remainingSohPercent
  };
}

// 11. State of Charge (SOC) Estimator
export function estimateSocFromOcv(
  chemistry: "lfp" | "nmc" | "lead-acid",
  voltageV: number,
  nominalV: number
): number {
  // Standard OCV curves normalized per-cell or per-pack.
  // Let's normalize lookup to single-cell equivalent, then interpolate.
  let cellVoltage = voltageV;
  let numCells = 1;

  if (chemistry === "lfp") {
    // If it's a 12V LFP system (nominal 12.8V), cell counts is 4.
    // Let's guess cell count by comparing input voltage to cell voltages.
    if (voltageV > 10) {
      numCells = 4;
    } else if (voltageV > 20) {
      numCells = 8;
    }
    cellVoltage = voltageV / numCells;

    const curve = [
      { v: 3.40, soc: 100 },
      { v: 3.33, soc: 99 },
      { v: 3.31, soc: 90 },
      { v: 3.29, soc: 70 },
      { v: 3.27, soc: 40 },
      { v: 3.23, soc: 20 },
      { v: 3.18, soc: 10 },
      { v: 3.00, soc: 5 },
      { v: 2.50, soc: 0 }
    ];
    return interpolateCurve(cellVoltage, curve);
  } else if (chemistry === "nmc") {
    // NMC cell range 3.0V - 4.2V. If input > 10V, let's guess pack count based on nominal.
    if (voltageV > 10 && nominalV > 0) {
      numCells = Math.round(nominalV / 3.7);
    } else if (voltageV > 10) {
      numCells = Math.round(voltageV / 3.7);
    }
    cellVoltage = voltageV / numCells;

    const curve = [
      { v: 4.20, soc: 100 },
      { v: 4.08, soc: 90 },
      { v: 3.97, soc: 75 },
      { v: 3.87, soc: 60 },
      { v: 3.78, soc: 45 },
      { v: 3.70, soc: 30 },
      { v: 3.62, soc: 15 },
      { v: 3.50, soc: 5 },
      { v: 3.00, soc: 0 }
    ];
    return interpolateCurve(cellVoltage, curve);
  } else {
    // Lead-Acid (nominal 12V pack)
    if (voltageV > 20) {
      numCells = Math.round(voltageV / 12);
    }
    const packVoltage = voltageV / numCells;

    const curve = [
      { v: 12.72, soc: 100 },
      { v: 12.50, soc: 80 },
      { v: 12.23, soc: 60 },
      { v: 12.10, soc: 40 },
      { v: 11.96, soc: 20 },
      { v: 11.63, soc: 0 }
    ];
    return interpolateCurve(packVoltage, curve);
  }
}

function interpolateCurve(v: number, curve: { v: number; soc: number }[]): number {
  if (v >= curve[0].v) return curve[0].soc;
  if (v <= curve[curve.length - 1].v) return curve[curve.length - 1].soc;

  for (let i = 0; i < curve.length - 1; i++) {
    const p1 = curve[i];
    const p2 = curve[i + 1];
    if (v <= p1.v && v >= p2.v) {
      const ratio = (v - p2.v) / (p1.v - p2.v);
      return p2.soc + ratio * (p1.soc - p2.soc);
    }
  }
  return 0;
}

export function simulateCoulombCounting(
  initialSoc: number,
  currentA: number,
  durationSec: number,
  capacityAh: number
): number {
  if (capacityAh <= 0) return initialSoc;
  const chargeAddedAh = currentA * (durationSec / 3600);
  const socChange = (chargeAddedAh / capacityAh) * 100;
  return Math.max(0, Math.min(100, initialSoc + socChange));
}

// 12. Solar Battery Sizing Calculator
export interface SolarSizingResult {
  requiredEnergyWh: number;
  requiredCapacityAh: number;
  usableCapacityWh: number;
  dailyProductionNeededWh: number;
}

export function calculateSolarBatterySizing(
  dailyConsumptionKwh: number,
  autonomyDays: number,
  voltage: number,
  chemistry: "lfp" | "nmc" | "lead-acid",
  maxDod: number
): SolarSizingResult {
  const dailyConsumptionWh = dailyConsumptionKwh * 1000;

  // Base DoD limits by chemistry
  const chemistryDodLimits: Record<string, number> = {
    lfp: 90,
    nmc: 80,
    "lead-acid": 50,
  };
  const safeDod = Math.min(maxDod, chemistryDodLimits[chemistry] || 80);
  const effectiveDod = safeDod / 100;

  // Usable capacity is the energy the user can actually draw
  const usableCapacityWh = dailyConsumptionWh * autonomyDays;

  // Required total energy before DoD derating
  const requiredEnergyWh = effectiveDod > 0 ? usableCapacityWh / effectiveDod : 0;

  // Required capacity in Ah
  const requiredCapacityAh = voltage > 0 ? requiredEnergyWh / voltage : 0;

  // Daily production needed to recharge (assuming 1 day recovery)
  const dailyProductionNeededWh = requiredEnergyWh / autonomyDays;

  return {
    requiredEnergyWh,
    requiredCapacityAh,
    usableCapacityWh,
    dailyProductionNeededWh,
  };
}

// 13. Home Backup Battery Calculator
export interface HomeBackupResult {
  totalEnergyWh: number;
  usableEnergyWh: number;
  deliveredEnergyWh: number;
  recommendedCapacityAh: number;
  runtimeHours: number;
}

export function calculateHomeBackupBattery(
  criticalLoadW: number,
  backupDurationHours: number,
  voltage: number,
  chemistry: "lfp" | "nmc" | "lead-acid",
  inverterEfficiency: number
): HomeBackupResult {
  // DoD limits by chemistry
  const chemistryDodLimits: Record<string, number> = {
    lfp: 90,
    nmc: 80,
    "lead-acid": 50,
  };
  const maxDod = chemistryDodLimits[chemistry] || 80;
  const effectiveDod = maxDod / 100;
  const effectiveEfficiency = inverterEfficiency / 100;

  // Total battery bank energy required (accounting for DoD + inverter losses)
  const totalEnergyWh = effectiveDod > 0 && effectiveEfficiency > 0
    ? (criticalLoadW * backupDurationHours) / (effectiveDod * effectiveEfficiency)
    : 0;

  // Battery usable energy (after DoD limits)
  const usableEnergyWh = totalEnergyWh * effectiveDod;

  // Delivered system energy (after DoD + efficiency losses)
  const deliveredEnergyWh = usableEnergyWh * effectiveEfficiency;

  // Capacity in Ah
  const recommendedCapacityAh = voltage > 0 ? totalEnergyWh / voltage : 0;

  // Runtime estimate
  const runtimeHours = criticalLoadW > 0
    ? deliveredEnergyWh / criticalLoadW
    : 0;

  return {
    totalEnergyWh,
    usableEnergyWh,
    deliveredEnergyWh,
    recommendedCapacityAh,
    runtimeHours,
  };
}

// 14. RV Battery Calculator
export interface RVBatteryResult {
  dailyConsumptionWh: number;
  requiredCapacityAh: number;
  recommendedBankSizeAh: number;
}

export function calculateRVBattery(
  applianceLoads: number[],
  usageHours: number[],
  voltage: number,
  campingDays: number,
  chemistry: "lfp" | "nmc" | "lead-acid"
): RVBatteryResult {
  // DoD limits by chemistry
  const chemistryDodLimits: Record<string, number> = {
    lfp: 80,
    nmc: 80,
    "lead-acid": 50,
  };
  const maxDod = chemistryDodLimits[chemistry] || 80;
  const effectiveDod = maxDod / 100;

  // Calculate daily consumption
  let dailyConsumptionWh = 0;
  for (let i = 0; i < applianceLoads.length; i++) {
    dailyConsumptionWh += applianceLoads[i] * (usageHours[i] || 0);
  }

  // Total energy needed for camping duration
  const totalEnergyWh = dailyConsumptionWh * campingDays;

  // Required capacity considering DoD
  const requiredCapacityAh = voltage > 0 && effectiveDod > 0
    ? (totalEnergyWh / effectiveDod) / voltage
    : 0;

  // Recommended bank size (round up to nearest practical increment)
  const recommendedBankSizeAh = Math.ceil(requiredCapacityAh / 10) * 10;

  return {
    dailyConsumptionWh,
    requiredCapacityAh,
    recommendedBankSizeAh,
  };
}

// 15. Battery Pack Calculator
export interface BatteryPackResult {
  packVoltageV: number;
  packCapacityAh: number;
  packEnergyWh: number;
  packEnergyKwh: number;
  maxContinuousCurrentA: number;
  configSummary: string;
}

export function calculateBatteryPack(
  cellVoltageV: number,
  cellCapacityAh: number,
  seriesCount: number,
  parallelCount: number,
  cellMaxCurrentA: number
): BatteryPackResult {
  const packVoltageV = cellVoltageV * seriesCount;
  const packCapacityAh = cellCapacityAh * parallelCount;
  const packEnergyWh = packVoltageV * packCapacityAh;
  const packEnergyKwh = packEnergyWh / 1000;
  const maxContinuousCurrentA = cellMaxCurrentA * parallelCount;
  const totalCells = seriesCount * parallelCount;
  const configSummary = `${seriesCount}S${parallelCount}P — ${totalCells} total cells (${seriesCount} series × ${parallelCount} parallel)`;

  return {
    packVoltageV,
    packCapacityAh,
    packEnergyWh,
    packEnergyKwh,
    maxContinuousCurrentA,
    configSummary,
  };
}

// 16. Marine Battery Sizing Calculator
export interface MarineSizingResult {
  totalLoadW: number;
  dailyEnergyWh: number;
  dailyEnergyKwh: number;
  totalBatteryEnergyWh: number;
  usableEnergyWh: number;
  deliveredEnergyWh: number;
  requiredCapacityAh: number;
  requiredEnergyKwh: number;
}

export function calculateMarineBatterySizing(
  navLoadW: number,
  lightingLoadW: number,
  refrigerationLoadW: number,
  pumpsLoadW: number,
  otherLoadW: number,
  usageHours: number,
  batteryVoltage: number,
  usableDodPercent: number,
  systemEfficiencyPercent: number
): MarineSizingResult {
  const totalLoadW = navLoadW + lightingLoadW + refrigerationLoadW + pumpsLoadW + otherLoadW;
  const dailyEnergyWh = totalLoadW * usageHours;
  const dailyEnergyKwh = dailyEnergyWh / 1000;
  const effectiveDod = usableDodPercent / 100;
  const effectiveEff = systemEfficiencyPercent / 100;
  const totalBatteryEnergyWh = effectiveDod > 0 && effectiveEff > 0
    ? dailyEnergyWh / (effectiveDod * effectiveEff)
    : 0;
  const usableEnergyWh = totalBatteryEnergyWh * effectiveDod;
  const deliveredEnergyWh = usableEnergyWh * effectiveEff;
  const requiredCapacityAh = batteryVoltage > 0 ? totalBatteryEnergyWh / batteryVoltage : 0;
  const requiredEnergyKwh = totalBatteryEnergyWh / 1000;

  return {
    totalLoadW,
    dailyEnergyWh,
    dailyEnergyKwh,
    totalBatteryEnergyWh,
    usableEnergyWh,
    deliveredEnergyWh,
    requiredCapacityAh,
    requiredEnergyKwh,
  };
}

// 17. Inverter Battery Calculator
export interface InverterBatteryResult {
  acEnergyWh: number;
  dcEnergyWh: number;
  adjustedBatteryEnergyWh: number;
  adjustedBatteryEnergyKwh: number;
  requiredCapacityAh: number;
}

export function calculateInverterBattery(
  acLoadW: number,
  runtimeHours: number,
  inverterEfficiencyPercent: number,
  batteryVoltage: number,
  usableDodPercent: number
): InverterBatteryResult {
  const acEnergyWh = acLoadW * runtimeHours;
  const effectiveEff = inverterEfficiencyPercent / 100;
  const dcEnergyWh = effectiveEff > 0 ? acEnergyWh / effectiveEff : 0;
  const effectiveDod = usableDodPercent / 100;
  const adjustedBatteryEnergyWh = effectiveDod > 0 ? dcEnergyWh / effectiveDod : 0;
  const adjustedBatteryEnergyKwh = adjustedBatteryEnergyWh / 1000;
  const requiredCapacityAh = batteryVoltage > 0 ? adjustedBatteryEnergyWh / batteryVoltage : 0;

  return {
    acEnergyWh,
    dcEnergyWh,
    adjustedBatteryEnergyWh,
    adjustedBatteryEnergyKwh,
    requiredCapacityAh,
  };
}

// 18. Marine CO₂ Reduction Calculator
export type MarineFuelType = 'mgo' | 'mdo' | 'hfo' | 'lng';

export interface MarineCo2Inputs {
  fuelType: MarineFuelType;
  annualFuelLiters: number;
  operatingHours: number;
  hybridPercent: number;
  shorePowerPercent: number;
}

export interface MarineCo2Result {
  annualFuelSavedLiters: number;
  annualFuelSavedPercent: number;
  co2ReductionTonnes: number;
  noxReductionKg: number;
  soxReductionKg: number;
  equivalentCarsRemoved: number;
  equivalentTreesPlanted: number;
  baselineCo2Tonnes: number;
  baselineNoxKg: number;
  baselineSoxKg: number;
  reducedCo2Tonnes: number;
  reducedNoxKg: number;
  reducedSoxKg: number;
}

// Industry-standard emission factors (Fourth IMO GHG Study 2020)
export const MARINE_FUEL_EMISSION_FACTORS: Record<MarineFuelType, {
  co2: number; // kg CO2 per liter
  nox: number; // kg NOx per liter
  sox: number; // kg SOx per liter
  label: string;
}> = {
  mgo: { co2: 3.206, nox: 0.059, sox: 0.0053, label: 'Marine Gas Oil (MGO)' },
  mdo: { co2: 3.206, nox: 0.055, sox: 0.010, label: 'Marine Diesel Oil (MDO)' },
  hfo: { co2: 3.114, nox: 0.087, sox: 0.032, label: 'Heavy Fuel Oil (HFO)' },
  lng: { co2: 2.750, nox: 0.025, sox: 0.000, label: 'LNG' },
};

export function calculateMarineCo2Reduction(inputs: MarineCo2Inputs): MarineCo2Result {
  const factors = MARINE_FUEL_EMISSION_FACTORS[inputs.fuelType];
  const hybridDec = Math.max(0, Math.min(100, inputs.hybridPercent)) / 100;
  const shoreDec = Math.max(0, Math.min(100, inputs.shorePowerPercent)) / 100;

  // Fuel saved from hybridization (reduces consumption during non-shore-power hours)
  const fuelDuringEngineHours = inputs.annualFuelLiters * (1 - shoreDec);
  const hybridFuelSaved = fuelDuringEngineHours * hybridDec;
  // Fuel saved from shore power (eliminates fuel during port/berth time)
  const shoreFuelSaved = inputs.annualFuelLiters * shoreDec;
  // Total fuel saved (avoid double-counting)
  const annualFuelSaved = Math.min(inputs.annualFuelLiters, hybridFuelSaved + shoreFuelSaved);
  const annualFuelSavedPercent = inputs.annualFuelLiters > 0
    ? (annualFuelSaved / inputs.annualFuelLiters) * 100
    : 0;

  // Baseline emissions (in kg)
  const baselineCo2Kg = inputs.annualFuelLiters * factors.co2;
  const baselineNoxKg = inputs.annualFuelLiters * factors.nox;
  const baselineSoxKg = inputs.annualFuelLiters * factors.sox;

  // Reductions
  const co2ReductionKg = annualFuelSaved * factors.co2;
  const noxReductionKg = annualFuelSaved * factors.nox;
  const soxReductionKg = annualFuelSaved * factors.sox;

  const co2ReductionTonnes = co2ReductionKg / 1000;

  // Equivalencies (EPA-based approximations)
  const equivalentCarsRemoved = co2ReductionTonnes / 4.6; // ~4.6 tonnes CO2/year per passenger car
  const equivalentTreesPlanted = co2ReductionKg / 21; // ~21 kg CO2 absorbed per tree per year

  return {
    annualFuelSavedLiters: annualFuelSaved,
    annualFuelSavedPercent,
    co2ReductionTonnes,
    noxReductionKg,
    soxReductionKg,
    equivalentCarsRemoved,
    equivalentTreesPlanted,
    baselineCo2Tonnes: baselineCo2Kg / 1000,
    baselineNoxKg,
    baselineSoxKg,
    reducedCo2Tonnes: (baselineCo2Kg - co2ReductionKg) / 1000,
    reducedNoxKg: baselineNoxKg - noxReductionKg,
    reducedSoxKg: baselineSoxKg - soxReductionKg,
  };
}

// 19. Vessel Energy Storage Calculator
export type BatteryChemistryType = 'lfp' | 'nmc';

export interface VesselEnergyStorageInputs {
  hotelLoadKw: number;
  propulsionLoadKw: number;
  peakLoadKw: number;
  operatingHours: number;
  reserveMarginPercent: number;
  batteryChemistry: BatteryChemistryType;
}

export interface VesselEnergyStorageResult {
  dailyEnergyDemandKwh: number;
  requiredUsableCapacityKwh: number;
  recommendedInstalledCapacityKwh: number;
  estimatedBatteryWeightKg: number;
  estimatedBatteryVolumeLiters: number;
  suggestedDcVoltage: number;
  maxContinuousCurrentA: number;
  chemistryNote: string;
}

const CHEMISTRY_PROPS: Record<BatteryChemistryType, {
  dodPercent: number;
  weightKgPerKwh: number;
  volumeLPerKwh: number;
  label: string;
  note: string;
}> = {
  lfp: {
    dodPercent: 90,
    weightKgPerKwh: 6.5,
    volumeLPerKwh: 6.8,
    label: 'LFP (LiFePO4)',
    note: 'LFP offers superior cycle life (5000+ cycles), thermal stability, and 90% usable DoD. Preferred for marine applications requiring high cycle count and safety.',
  },
  nmc: {
    dodPercent: 80,
    weightKgPerKwh: 5.0,
    volumeLPerKwh: 5.2,
    label: 'NMC (Nickel Manganese Cobalt)',
    note: 'NMC provides higher energy density (20–30% lighter than LFP) but lower cycle life (~2000 cycles) and tighter thermal management requirements.',
  },
};

export function calculateVesselEnergyStorage(inputs: VesselEnergyStorageInputs): VesselEnergyStorageResult {
  const hotelLoad = Math.max(0, inputs.hotelLoadKw);
  const propulsionLoad = Math.max(0, inputs.propulsionLoadKw);
  const peakLoad = Math.max(inputs.hotelLoadKw + inputs.propulsionLoadKw, Math.max(0, inputs.peakLoadKw));
  const operatingHours = Math.max(0.1, inputs.operatingHours);
  const reserveMargin = Math.max(0, Math.min(100, inputs.reserveMarginPercent)) / 100;

  const props = CHEMISTRY_PROPS[inputs.batteryChemistry];

  // Daily energy demand based on continuous operating loads
  const dailyEnergyDemandKwh = (hotelLoad + propulsionLoad) * operatingHours;

  // Required usable capacity (energy the battery must deliver)
  const requiredUsableCapacityKwh = dailyEnergyDemandKwh * (1 + reserveMargin);

  // Installed capacity accounts for DoD limits
  const recommendedInstalledCapacityKwh = requiredUsableCapacityKwh / (props.dodPercent / 100);

  // Physical estimates
  const estimatedBatteryWeightKg = recommendedInstalledCapacityKwh * props.weightKgPerKwh;
  const estimatedBatteryVolumeLiters = recommendedInstalledCapacityKwh * props.volumeLPerKwh;

  // Suggested DC system voltage based on peak power
  let suggestedDcVoltage = 48;
  if (peakLoad <= 10) suggestedDcVoltage = 48;
  else if (peakLoad <= 50) suggestedDcVoltage = 48;
  else if (peakLoad <= 200) suggestedDcVoltage = 150;
  else if (peakLoad <= 500) suggestedDcVoltage = 400;
  else suggestedDcVoltage = 600;

  const maxContinuousCurrentA = suggestedDcVoltage > 0
    ? (peakLoad * 1000) / suggestedDcVoltage
    : 0;

  return {
    dailyEnergyDemandKwh,
    requiredUsableCapacityKwh,
    recommendedInstalledCapacityKwh,
    estimatedBatteryWeightKg,
    estimatedBatteryVolumeLiters,
    suggestedDcVoltage,
    maxContinuousCurrentA,
    chemistryNote: props.note,
  };
}

// 20. Hybrid Vessel ROI Calculator
export interface HybridVesselRoiInputs {
  fuelCostPerLiter: number;
  annualFuelConsumptionLiters: number;
  batterySystemCost: number;
  electricityCostPerKwh: number;
  expectedFuelReductionPercent: number;
  projectLifetimeYears: number;
  discountRatePercent: number;
}

export interface HybridVesselRoiResult {
  annualFuelCostBaseline: number;
  annualFuelSavedLiters: number;
  annualFuelCostSavings: number;
  annualElectricityCostIncrease: number;
  annualNetOperatingSavings: number;
  simplePaybackYears: number | null;
  lifetimeSavings: number;
  npv: number;
  roiPercent: number;
  paybackNote: string;
}

export function calculateHybridVesselRoi(inputs: HybridVesselRoiInputs): HybridVesselRoiResult {
  const fuelReduction = Math.max(0, Math.min(100, inputs.expectedFuelReductionPercent)) / 100;
  const discountRate = Math.max(0, Math.min(50, inputs.discountRatePercent)) / 100;
  const lifetime = Math.max(1, Math.round(inputs.projectLifetimeYears));

  // Baseline annual fuel cost
  const annualFuelCostBaseline = inputs.annualFuelConsumptionLiters * inputs.fuelCostPerLiter;

  // Fuel saved
  const annualFuelSavedLiters = inputs.annualFuelConsumptionLiters * fuelReduction;
  const annualFuelCostSavings = annualFuelSavedLiters * inputs.fuelCostPerLiter;

  // Additional electricity cost (charging batteries from shore power/grid)
  // Assume batteries are charged ~300 cycles/year, storing ~installed_kwh
  // Simplified: electricity cost increase = (fuel saved in kWh equivalent) * electricity cost
  // Fuel energy content: MGO ~10.0 kWh/liter. Battery round-trip efficiency ~90%.
  const fuelEnergyKwh = annualFuelSavedLiters * 10.0;
  const electricityConsumedKwh = fuelEnergyKwh / 0.90; // round-trip losses
  const annualElectricityCostIncrease = electricityConsumedKwh * inputs.electricityCostPerKwh;

  // Net operating savings
  const annualNetOperatingSavings = annualFuelCostSavings - annualElectricityCostIncrease;

  // Simple payback
  let simplePaybackYears: number | null = null;
  let paybackNote = '';
  if (annualNetOperatingSavings > 0) {
    simplePaybackYears = inputs.batterySystemCost / annualNetOperatingSavings;
    paybackNote = `At $${Math.round(annualNetOperatingSavings).toLocaleString()} net annual savings, the battery system pays for itself in ${simplePaybackYears.toFixed(1)} years.`;
  } else {
    paybackNote = 'Annual net operating savings are negative — the fuel cost savings do not exceed the additional electricity costs at current rates. Consider increasing fuel reduction percentage or reducing battery system cost.';
  }

  // NPV and lifetime savings
  let npv = -inputs.batterySystemCost;
  let lifetimeSavings = -inputs.batterySystemCost;
  let cumulativeCash = -inputs.batterySystemCost;

  for (let year = 1; year <= lifetime; year++) {
    const yearSavings = annualNetOperatingSavings;
    cumulativeCash += yearSavings;
    lifetimeSavings += yearSavings;
    npv += yearSavings / Math.pow(1 + discountRate, year);
  }

  // ROI %
  const roiPercent = inputs.batterySystemCost > 0
    ? ((lifetimeSavings + inputs.batterySystemCost) / inputs.batterySystemCost) * 100
    : 0;

  return {
    annualFuelCostBaseline,
    annualFuelSavedLiters,
    annualFuelCostSavings,
    annualElectricityCostIncrease,
    annualNetOperatingSavings,
    simplePaybackYears,
    lifetimeSavings,
    npv,
    roiPercent,
    paybackNote,
  };
}

// 21. Power Outage Battery Backup Calculator
export interface ApplianceLoad {
  name: string;
  runningW: number;
  surgeW: number;
  quantity: number;
}

export interface PowerOutageBackupResult {
  totalRunningW: number;
  surgeW: number;
  energyRequiredWh: number;
  energyRequiredKwh: number;
  batteryCapacityWh: number;
  batteryCapacityAh: number;
  inverterContinuousW: number;
  inverterSurgeW: number;
  batteries12v100ah: number;
  batteries12v200ah: number;
  batteries24v100ah: number;
  batteries48v100ah: number;
  solarDailyWh: number;
  solarRechargeHours: number;
  solarSufficient: boolean;
}

export function calculatePowerOutageBackup(
  appliances: ApplianceLoad[],
  backupHours: number,
  batteryVoltage: number,
  dodPercent: number,
  inverterEfficiencyPercent: number,
  safetyMarginPercent: number,
  solarEnabled: boolean,
  solarWatts: number,
  peakSunHours: number,
  chargeControllerEfficiencyPercent: number
): PowerOutageBackupResult {
  // Input validation
  const safeBackupHours = Math.max(0.1, backupHours);
  const safeDod = Math.max(1, Math.min(100, dodPercent)) / 100;
  const safeEfficiency = Math.max(50, Math.min(99, inverterEfficiencyPercent)) / 100;
  const safeMargin = Math.max(0, Math.min(50, safetyMarginPercent)) / 100;
  const safeVoltage = Math.max(1, batteryVoltage);

  // Calculate total running load and find the highest-surge appliance
  let totalRunningW = 0;
  let maxSingleSurgeW = 0;
  let maxSurgeApplianceRunningW = 0;

  for (const appliance of appliances) {
    if (appliance.runningW <= 0 || appliance.quantity <= 0) continue;
    const applianceTotalRunning = appliance.runningW * appliance.quantity;
    totalRunningW += applianceTotalRunning;

    const applianceTotalSurge = appliance.surgeW * appliance.quantity;
    if (applianceTotalSurge > maxSingleSurgeW) {
      maxSingleSurgeW = applianceTotalSurge;
      maxSurgeApplianceRunningW = applianceTotalRunning;
    }
  }

  // Surge = highest single appliance startup + all other appliances running
  const surgeW = maxSingleSurgeW + (totalRunningW - maxSurgeApplianceRunningW);

  // Energy required (before losses)
  const energyBeforeLosses = totalRunningW * safeBackupHours;

  // After inverter losses
  const energyAfterInverter = safeEfficiency > 0 ? energyBeforeLosses / safeEfficiency : 0;

  // After safety margin
  const energyRequiredWh = energyAfterInverter * (1 + safeMargin);

  // Battery capacity in Ah
  const batteryCapacityAh = safeDod > 0 && safeVoltage > 0
    ? energyRequiredWh / (safeVoltage * safeDod)
    : 0;

  // Battery capacity in Wh
  const batteryCapacityWh = safeDod > 0
    ? energyRequiredWh / safeDod
    : 0;

  // Inverter sizing
  const inverterContinuousW = Math.ceil(totalRunningW * 1.25 / 100) * 100;
  const inverterSurgeW = Math.ceil(surgeW * 1.10 / 100) * 100;

  // Battery suggestions
  const batteries12v100ah = safeVoltage > 0 && safeDod > 0
    ? Math.ceil(energyRequiredWh / (12 * 100 * safeDod))
    : 0;
  const batteries12v200ah = safeVoltage > 0 && safeDod > 0
    ? Math.ceil(energyRequiredWh / (12 * 200 * safeDod))
    : 0;
  const batteries24v100ah = safeVoltage > 0 && safeDod > 0
    ? Math.ceil(energyRequiredWh / (24 * 100 * safeDod))
    : 0;
  const batteries48v100ah = safeVoltage > 0 && safeDod > 0
    ? Math.ceil(energyRequiredWh / (48 * 100 * safeDod))
    : 0;

  // Solar recharge
  const safeSolarEff = Math.max(50, Math.min(100, chargeControllerEfficiencyPercent)) / 100;
  const solarDailyWh = solarEnabled
    ? solarWatts * Math.max(0, peakSunHours) * safeSolarEff
    : 0;
  const solarRechargeHours = solarEnabled && solarDailyWh > 0
    ? energyRequiredWh / (solarWatts * safeSolarEff)
    : 0;
  const solarSufficient = solarEnabled && solarDailyWh > 0
    ? solarDailyWh >= (totalRunningW * safeBackupHours > 0 ? totalRunningW * safeBackupHours / safeBackupHours * 24 : 0)
    : false;

  return {
    totalRunningW,
    surgeW,
    energyRequiredWh,
    energyRequiredKwh: energyRequiredWh / 1000,
    batteryCapacityWh,
    batteryCapacityAh,
    inverterContinuousW,
    inverterSurgeW,
    batteries12v100ah,
    batteries12v200ah,
    batteries24v100ah,
    batteries48v100ah,
    solarDailyWh,
    solarRechargeHours,
    solarSufficient,
  };
}
