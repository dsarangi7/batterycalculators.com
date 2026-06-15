export type BatteryApplication =
  | 'Marine ESS'
  | 'Stationary ESS'
  | 'EV'
  | 'Industrial'
  | 'UPS'
  | 'Second-life'
  | 'Other';

export type BatteryChemistry =
  | 'LFP / LiFePO4'
  | 'NMC'
  | 'NCA'
  | 'LTO'
  | 'Lead-acid'
  | 'Sodium-ion'
  | 'Other';

export type PassportStatus = 'Draft' | 'Partial' | 'Ready for Review';

export interface BatteryIdentity {
  name: string;
  manufacturer: string;
  application: BatteryApplication;
  category: string;
  chemistry: BatteryChemistry;
  nominalVoltage: number | null;
  nominalCapacity: number | null;
  energyCapacity: number | null;
  manufacturingDate: string;
  countryOfManufacture: string;
  serialNumber: string;
}

export interface PerformanceDurabilityData {
  ratedCycleLife: number | null;
  currentCycleCount: number | null;
  sohPercent: number | null;
  roundTripEfficiency: number | null;
  tempMin: number | null;
  tempMax: number | null;
  recommendedDoD: number | null;
  warrantyYears: number | null;
  expectedServiceLife: number | null;
}

export interface OperationalLifecycleData {
  commissioningDate: string;
  applicationProfile: string;
  averageCRate: number | null;
  maxDischargeCurrent: number | null;
  maxChargeCurrent: number | null;
  averageTemp: number | null;
  thermalEvents: number | null;
  safetyIncidents: number | null;
  maintenanceStatus: string;
}

export interface SustainabilityTraceabilityData {
  carbonFootprint: number | null;
  carbonFootprintUnit: 'kg CO2e/kWh' | 'kg CO2e total' | 'Unknown';
  carbonFootprintMethod: string;
  recycledContentAvailable: boolean | null;
  criticalMaterialsDeclared: boolean | null;
  supplierTraceability: boolean | null;
  recyclingInstructionsAvailable: boolean | null;
  secondLifeSuitability: 'High' | 'Medium' | 'Low' | 'Unknown';
}

export interface DocumentationChecklist {
  technicalDatasheet: boolean;
  declarationOfConformity: boolean;
  safetyManual: boolean;
  transportCertification: boolean;
  bmsDataExport: boolean;
  carbonFootprintDeclaration: boolean;
  materialCompositionDeclaration: boolean;
  endOfLifeInstructions: boolean;
}

export interface BatteryPassportInput {
  identity: Partial<BatteryIdentity>;
  performance: Partial<PerformanceDurabilityData>;
  lifecycle: Partial<OperationalLifecycleData>;
  sustainability: Partial<SustainabilityTraceabilityData>;
  documentation: Partial<DocumentationChecklist>;
}

export interface BatteryPassportOutput {
  passportId: string;
  status: PassportStatus;
  completenessScore: number;
  complianceReadiness: 'Low' | 'Medium' | 'High';
  healthClassification: 'Excellent' | 'Good' | 'Degraded' | 'Critical' | 'Unknown';
  lifecycleStage: 'New' | 'Early life' | 'Mid-life' | 'Late life' | 'End-of-life risk' | 'Unknown';
  missingCriticalFields: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Generates a unique Passport ID matching BP-2026-XXXX format
 */
export function generatePassportId(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BP-2026-${randomPart}`;
}

/**
 * Calculates energy capacity in kWh from Nominal Voltage (V) and Nominal Capacity (Ah)
 */
export function calculateEnergyCapacity(voltageV: number | null | undefined, capacityAh: number | null | undefined): number | null {
  if (voltageV === null || voltageV === undefined || isNaN(voltageV) || voltageV <= 0) return null;
  if (capacityAh === null || capacityAh === undefined || isNaN(capacityAh) || capacityAh <= 0) return null;
  return Number(((voltageV * capacityAh) / 1000).toFixed(2));
}

/**
 * Helper to check if a value is considered filled/present
 */
function isFilled(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  if (typeof val === 'string' && val === 'Unknown') return false;
  if (typeof val === 'number' && isNaN(val)) return false;
  return true;
}

/**
 * Helper to validate number bounds for specific fields
 */
function isNumberValid(val: any, mustBePositive = false): boolean {
  if (!isFilled(val)) return false;
  if (typeof val !== 'number') return false;
  if (mustBePositive && val <= 0) return false;
  if (!mustBePositive && val < 0) return false;
  return true;
}

/**
 * Calculates the data completeness score based on weighted categories
 */
export function calculateDataCompleteness(input: BatteryPassportInput): number {
  // A. Identity (20% weight, 11 fields)
  // nominalVoltage, nominalCapacity, energyCapacity must be strictly positive
  let identityFilled = 0;
  if (isFilled(input.identity.name)) identityFilled++;
  if (isFilled(input.identity.manufacturer)) identityFilled++;
  if (isFilled(input.identity.application)) identityFilled++;
  if (isFilled(input.identity.category)) identityFilled++;
  if (isFilled(input.identity.chemistry)) identityFilled++;
  if (isNumberValid(input.identity.nominalVoltage, true)) identityFilled++;
  if (isNumberValid(input.identity.nominalCapacity, true)) identityFilled++;
  if (isNumberValid(input.identity.energyCapacity, true)) identityFilled++;
  if (isFilled(input.identity.manufacturingDate)) identityFilled++;
  if (isFilled(input.identity.countryOfManufacture)) identityFilled++;
  if (isFilled(input.identity.serialNumber)) identityFilled++;
  const identityScore = (identityFilled / 11) * 20;

  // B. Performance and Durability (25% weight, 9 fields)
  // All numbers must be non-negative. SOH can go up to 120 (for slightly over-capacity cell formats)
  let performanceFilled = 0;
  if (isNumberValid(input.performance.ratedCycleLife, true)) performanceFilled++;
  if (isNumberValid(input.performance.currentCycleCount, false)) performanceFilled++;
  if (isNumberValid(input.performance.sohPercent, false)) performanceFilled++;
  if (isNumberValid(input.performance.roundTripEfficiency, false)) performanceFilled++;
  if (isFilled(input.performance.tempMin)) performanceFilled++; // can be negative
  if (isFilled(input.performance.tempMax)) performanceFilled++; // can be negative
  if (isNumberValid(input.performance.recommendedDoD, false)) performanceFilled++;
  if (isNumberValid(input.performance.warrantyYears, false)) performanceFilled++;
  if (isNumberValid(input.performance.expectedServiceLife, false)) performanceFilled++;
  const performanceScore = (performanceFilled / 9) * 25;

  // C. Operational Lifecycle Data (20% weight, 9 fields)
  let lifecycleFilled = 0;
  if (isFilled(input.lifecycle.commissioningDate)) lifecycleFilled++;
  if (isFilled(input.lifecycle.applicationProfile)) lifecycleFilled++;
  if (isNumberValid(input.lifecycle.averageCRate, false)) lifecycleFilled++;
  if (isNumberValid(input.lifecycle.maxDischargeCurrent, false)) lifecycleFilled++;
  if (isNumberValid(input.lifecycle.maxChargeCurrent, false)) lifecycleFilled++;
  if (isFilled(input.lifecycle.averageTemp)) lifecycleFilled++; // can be negative
  if (isNumberValid(input.lifecycle.thermalEvents, false)) lifecycleFilled++;
  if (isNumberValid(input.lifecycle.safetyIncidents, false)) lifecycleFilled++;
  if (isFilled(input.lifecycle.maintenanceStatus)) lifecycleFilled++;
  const lifecycleScore = (lifecycleFilled / 9) * 20;

  // D. Sustainability and Traceability (25% weight, 8 fields)
  let sustainabilityFilled = 0;
  if (isNumberValid(input.sustainability.carbonFootprint, false)) sustainabilityFilled++;
  if (isFilled(input.sustainability.carbonFootprintUnit)) sustainabilityFilled++;
  if (isFilled(input.sustainability.carbonFootprintMethod)) sustainabilityFilled++;
  if (input.sustainability.recycledContentAvailable !== null && input.sustainability.recycledContentAvailable !== undefined) sustainabilityFilled++;
  if (input.sustainability.criticalMaterialsDeclared !== null && input.sustainability.criticalMaterialsDeclared !== undefined) sustainabilityFilled++;
  if (input.sustainability.supplierTraceability !== null && input.sustainability.supplierTraceability !== undefined) sustainabilityFilled++;
  if (input.sustainability.recyclingInstructionsAvailable !== null && input.sustainability.recyclingInstructionsAvailable !== undefined) sustainabilityFilled++;
  if (isFilled(input.sustainability.secondLifeSuitability)) sustainabilityFilled++;
  const sustainabilityScore = (sustainabilityFilled / 8) * 25;

  // E. Documentation Checklist (10% weight, 8 fields)
  const docFields: (keyof DocumentationChecklist)[] = [
    'technicalDatasheet', 'declarationOfConformity', 'safetyManual', 'transportCertification',
    'bmsDataExport', 'carbonFootprintDeclaration', 'materialCompositionDeclaration', 'endOfLifeInstructions'
  ];
  let docChecked = 0;
  docFields.forEach(f => {
    if (input.documentation[f] === true) docChecked++;
  });
  const docScore = (docChecked / docFields.length) * 10;

  return Math.round(identityScore + performanceScore + lifecycleScore + sustainabilityScore + docScore);
}

/**
 * Classifies battery health based on SOH percentage
 */
export function classifyBatteryHealth(sohPercent: number | null | undefined): BatteryPassportOutput['healthClassification'] {
  if (sohPercent === null || sohPercent === undefined || isNaN(sohPercent) || sohPercent < 0) return 'Unknown';
  if (sohPercent >= 90) return 'Excellent';
  if (sohPercent >= 80) return 'Good';
  if (sohPercent >= 70) return 'Degraded';
  return 'Critical';
}

/**
 * Estimates battery lifecycle stage based on cycle count, rated cycle life, and SOH
 */
export function estimateLifecycleStage(
  currentCycleCount: number | null | undefined,
  ratedCycleLife: number | null | undefined,
  sohPercent: number | null | undefined
): BatteryPassportOutput['lifecycleStage'] {
  const hasCycles = isNumberValid(currentCycleCount, false) && isNumberValid(ratedCycleLife, true);
  const hasSoh = isNumberValid(sohPercent, false);

  if (!hasCycles && !hasSoh) return 'Unknown';

  // SOH below 70% is automatic End-of-life risk
  if (hasSoh && sohPercent! < 70) return 'End-of-life risk';

  if (hasCycles) {
    const cycleRatio = currentCycleCount! / ratedCycleLife!;
    if (cycleRatio > 1.0) return 'End-of-life risk';
    if (cycleRatio >= 0.75) return 'Late life';
    if (cycleRatio >= 0.40) return 'Mid-life';
    if (cycleRatio >= 0.10) return 'Early life';
    return 'New';
  }

  // Fallback to SOH-only estimation if cycles are missing
  if (hasSoh) {
    if (sohPercent! >= 95) return 'New';
    if (sohPercent! >= 88) return 'Early life';
    if (sohPercent! >= 80) return 'Mid-life';
    if (sohPercent! >= 70) return 'Late life';
  }

  return 'Unknown';
}

/**
 * Determines missing critical fields
 */
export function generateMissingFieldsList(input: BatteryPassportInput): string[] {
  const missing: string[] = [];

  if (!isFilled(input.identity.serialNumber)) {
    missing.push('Serial Number / Pack ID');
  }
  if (!isFilled(input.identity.chemistry)) {
    missing.push('Battery Chemistry');
  }
  if (!isNumberValid(input.identity.energyCapacity, true)) {
    missing.push('Energy Capacity (kWh)');
  }
  if (!isNumberValid(input.performance.sohPercent, false)) {
    missing.push('State of Health (SOH)');
  }
  if (!isNumberValid(input.performance.currentCycleCount, false)) {
    missing.push('Current Cycle Count');
  }
  
  // carbon footprint value or method
  const hasCarbonFootprint = isNumberValid(input.sustainability.carbonFootprint, false);
  const hasCarbonMethod = isFilled(input.sustainability.carbonFootprintMethod);
  if (!hasCarbonFootprint && !hasCarbonMethod) {
    missing.push('Carbon Footprint (Value or Methodology)');
  }

  if (input.sustainability.supplierTraceability !== true) {
    missing.push('Supplier Traceability Declaration');
  }
  if (input.documentation.materialCompositionDeclaration !== true) {
    missing.push('Material Composition Declaration');
  }
  
  // recycling / end-of-life instructions
  const hasRecyclingInstructions = input.sustainability.recyclingInstructionsAvailable === true || input.documentation.endOfLifeInstructions === true;
  if (!hasRecyclingInstructions) {
    missing.push('Recycling & End-of-Life Instructions');
  }

  return missing;
}

/**
 * Calculates compliance readiness level based on completeness score and missing fields
 */
export function calculateComplianceReadiness(
  input: BatteryPassportInput,
  completenessScore: number
): BatteryPassportOutput['complianceReadiness'] {
  const missingCritical = generateMissingFieldsList(input);

  // Identify if any missing critical field belongs to sustainability or documentation
  const hasSustainabilityOrDocCriticalMissing = missingCritical.some(field =>
    field.includes('Carbon Footprint') ||
    field.includes('Supplier Traceability') ||
    field.includes('Material Composition') ||
    field.includes('Recycling & End-of-Life')
  );

  if (completenessScore < 60 || hasSustainabilityOrDocCriticalMissing) {
    return 'Low';
  }

  if (completenessScore >= 85 && missingCritical.length === 0) {
    return 'High';
  }

  return 'Medium';
}

/**
 * Generates warning alerts based on passport status and health
 */
export function generateMissingFieldWarnings(input: BatteryPassportInput): string[] {
  const warnings: string[] = [];
  
  if (input.performance.sohPercent !== null && input.performance.sohPercent !== undefined && input.performance.sohPercent < 80) {
    warnings.push(`Battery State of Health is Degraded (${input.performance.sohPercent}%). Prepare for capacity matching reviews.`);
  }

  if (input.lifecycle.thermalEvents !== null && input.lifecycle.thermalEvents !== undefined && input.lifecycle.thermalEvents > 0) {
    warnings.push(`Thermal events registered: ${input.lifecycle.thermalEvents}. Immediate engineering inspection recommended.`);
  }

  if (input.lifecycle.safetyIncidents !== null && input.lifecycle.safetyIncidents !== undefined && input.lifecycle.safetyIncidents > 0) {
    warnings.push(`Safety incidents registered: ${input.lifecycle.safetyIncidents}. Compliance review required.`);
  }

  // Warning if negative values are input
  const negativeFields: string[] = [];
  if (typeof input.identity.nominalVoltage === 'number' && input.identity.nominalVoltage < 0) negativeFields.push('Nominal Voltage');
  if (typeof input.identity.nominalCapacity === 'number' && input.identity.nominalCapacity < 0) negativeFields.push('Nominal Capacity');
  if (typeof input.identity.energyCapacity === 'number' && input.identity.energyCapacity < 0) negativeFields.push('Energy Capacity');
  if (typeof input.performance.ratedCycleLife === 'number' && input.performance.ratedCycleLife < 0) negativeFields.push('Rated Cycle Life');
  if (typeof input.performance.currentCycleCount === 'number' && input.performance.currentCycleCount < 0) negativeFields.push('Current Cycle Count');
  if (typeof input.performance.sohPercent === 'number' && input.performance.sohPercent < 0) negativeFields.push('State of Health');
  if (typeof input.performance.roundTripEfficiency === 'number' && input.performance.roundTripEfficiency < 0) negativeFields.push('Round-Trip Efficiency');
  if (typeof input.lifecycle.averageCRate === 'number' && input.lifecycle.averageCRate < 0) negativeFields.push('Average C-Rate');
  if (typeof input.lifecycle.maxDischargeCurrent === 'number' && input.lifecycle.maxDischargeCurrent < 0) negativeFields.push('Max Discharge Current');
  if (typeof input.lifecycle.maxChargeCurrent === 'number' && input.lifecycle.maxChargeCurrent < 0) negativeFields.push('Max Charge Current');
  if (typeof input.lifecycle.thermalEvents === 'number' && input.lifecycle.thermalEvents < 0) negativeFields.push('Thermal Events');
  if (typeof input.lifecycle.safetyIncidents === 'number' && input.lifecycle.safetyIncidents < 0) negativeFields.push('Safety Incidents');
  if (typeof input.sustainability.carbonFootprint === 'number' && input.sustainability.carbonFootprint < 0) negativeFields.push('Carbon Footprint Value');

  if (negativeFields.length > 0) {
    warnings.push(`Negative values detected in: ${negativeFields.join(', ')}. These fields are marked invalid and excluded from readiness scoring.`);
  }

  return warnings;
}

/**
 * Generates recommendations for building the battery passport readiness
 */
export function generateRecommendations(
  input: BatteryPassportInput,
  output: Omit<BatteryPassportOutput, 'recommendations'>
): string[] {
  const recommendations: string[] = [];

  // Compliance readiness specific recommendations
  if (output.complianceReadiness === 'Low') {
    recommendations.push('Establish a supply chain carbon footprint methodology compliant with EU standards or ISO 14067.');
    recommendations.push('Work with upstream cell/material suppliers to acquire audited supplier traceability declarations.');
  }

  if (output.complianceReadiness === 'Medium') {
    recommendations.push('Complete the documentation checklist by compile technical datasheets and conformity certificates.');
  }

  // Health and degradation recommendations
  if (output.healthClassification === 'Degraded') {
    recommendations.push('Initiate testing for second-life application compatibility (e.g. static energy storage transitions).');
  } else if (output.healthClassification === 'Critical') {
    recommendations.push('Decommission battery from prime applications. Initiate recycling or complete second-life safety screening.');
  }

  // Checklist specific recommendations
  if (input.documentation.declarationOfConformity !== true) {
    recommendations.push('Draft a formal CE/UL Declaration of Conformity and associate it with the pack identity records.');
  }

  if (input.documentation.safetyManual !== true) {
    recommendations.push('Compile a comprehensive emergency safety and troubleshooting manual for local operators.');
  }

  if (input.documentation.transportCertification !== true) {
    recommendations.push('Ensure UN 38.3 transport testing certification is completed and filed.');
  }

  if (recommendations.length === 0) {
    recommendations.push('All primary planning checks completed. Maintain regular BMS parameter logging for compliance audits.');
  }

  return recommendations;
}

/**
 * Orchestrates inputs and generates the structured Battery Passport Output
 */
export function generateBatteryPassport(input: BatteryPassportInput): BatteryPassportOutput {
  const completenessScore = calculateDataCompleteness(input);
  const complianceReadiness = calculateComplianceReadiness(input, completenessScore);
  const healthClassification = classifyBatteryHealth(input.performance.sohPercent);
  const lifecycleStage = estimateLifecycleStage(
    input.performance.currentCycleCount,
    input.performance.ratedCycleLife,
    input.performance.sohPercent
  );

  const missingCriticalFields = generateMissingFieldsList(input);
  const warnings = generateMissingFieldWarnings(input);

  // Generate passport ID once or use placeholder
  const passportId = generatePassportId();

  // Basic status classification
  let status: PassportStatus = 'Draft';
  if (completenessScore >= 85 && missingCriticalFields.length === 0) {
    status = 'Ready for Review';
  } else if (completenessScore >= 40) {
    status = 'Partial';
  }

  const outputBase = {
    passportId,
    status,
    completenessScore,
    complianceReadiness,
    healthClassification,
    lifecycleStage,
    missingCriticalFields,
    warnings
  };

  const recommendations = generateRecommendations(input, outputBase);

  return {
    ...outputBase,
    recommendations
  };
}
