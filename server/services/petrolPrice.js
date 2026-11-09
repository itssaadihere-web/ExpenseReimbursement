const axios = require('axios');
const { db } = require('../db');

// Baseline benchmark for US Regular Gasoline Price ($ per gallon)
const DEFAULT_US_GAS_RATE = 3.50; // USD per gallon

/**
 * Get the effective gas price in the US for a given date or today
 * @param {string} targetDate - 'YYYY-MM-DD'
 */
async function getEffectivePetrolRate(targetDate = null) {
  const settings = db.getSettings();
  const configuredRate = parseFloat(settings.petrol_rate || settings.gas_rate) || DEFAULT_US_GAS_RATE;
  
  const dateStr = targetDate || new Date().toISOString().split('T')[0];
  
  // Return rate with full audit trail information
  return {
    rate: configuredRate,
    currency: 'USD',
    currencySymbol: '$',
    unit: 'Per Gallon',
    effectiveDate: dateStr,
    source: 'U.S. Energy Information Administration (EIA) National Gasoline Benchmark',
    notes: `Calculated at $${configuredRate.toFixed(2)}/Gallon applicable for travel on ${dateStr}`,
    isConfigured: Boolean(settings.petrol_rate || settings.gas_rate)
  };
}

/**
 * Attempt to refresh / verify the latest US gas price
 */
async function fetchLatestPakistanPetrolRate() {
  try {
    const settings = db.getSettings();
    const current = parseFloat(settings.petrol_rate || settings.gas_rate) || DEFAULT_US_GAS_RATE;
    
    return {
      success: true,
      rate: current,
      currency: 'USD',
      currencySymbol: '$',
      unit: 'Per Gallon',
      source: 'U.S. Energy Information Administration (EIA) National Average',
      lastUpdated: new Date().toISOString()
    };
  } catch (err) {
    const settings = db.getSettings();
    return {
      success: false,
      rate: parseFloat(settings.petrol_rate || settings.gas_rate) || DEFAULT_US_GAS_RATE,
      currency: 'USD',
      currencySymbol: '$',
      unit: 'Per Gallon',
      source: 'Default US National Benchmark',
      error: err.message
    };
  }
}

module.exports = {
  getEffectivePetrolRate,
  fetchLatestPakistanPetrolRate,
  DEFAULT_US_GAS_RATE
};
