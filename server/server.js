const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { db, uploadsDir } = require('./db');
const { searchLocations, calculateCompleteRoute } = require('./services/routing');
const { getEffectivePetrolRate, fetchLatestPakistanPetrolRate } = require('./services/petrolPrice');
const { sendReimbursementEmail } = require('./services/email');
const {
  generateExpenseReportWorkbook,
  buildClaimExpenseReportWorkbook,
  formatDateToUS,
  formatDotDate
} = require('./services/excelReport');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// URL normalization for Vercel Serverless Functions:
// In serverless environments, requests routed to /api or [...path].js might have the '/api' prefix stripped.
// This ensures routes like /api/claims and /claims both match successfully.
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Serve uploaded receipts
app.use('/uploads', express.static(uploadsDir));

// Multer storage for receipt upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'receipt-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF receipts are allowed'));
    }
  }
});

// Helper: Run calculation automation on a claim
async function executeAutomation(claim) {
  const settings = db.getSettings();
  // Standard policy: 30 km per gallon allowed limit
  const mileageKmPerGallon = parseFloat(settings.mileage_km_per_gallon || settings.mileage_km_per_liter) || 30.0;
  
  // 1. Get effective gas rate for US on the travel date ($/Gallon)
  const gasInfo = await getEffectivePetrolRate(claim.travel_date);
  
  // 2. Prepare home location and stops
  const home = {
    name: claim.home_location,
    lat: parseFloat(claim.home_lat),
    lng: parseFloat(claim.home_lng)
  };

  const rawStops = Array.isArray(claim.stops) ? claim.stops : [];
  const stops = rawStops.map((s, idx) => ({
    name: s.name || s.displayName || `Stop ${idx + 1}`,
    lat: parseFloat(s.lat),
    lng: parseFloat(s.lng)
  }));

  // 3. Calculate full round-trip route: Home -> Stop 1 -> ... -> Stop N -> Home
  const routeResult = await calculateCompleteRoute(home, stops, {
    googleMapsKey: settings.google_maps_key
  });

  const totalDistanceKm = routeResult.totalDistanceKm || 0;
  // Calculate fuel gallons allowed: total km / 30 km per gallon
  const fuelGallons = Number((totalDistanceKm / mileageKmPerGallon).toFixed(2));
  const calculatedAmount = Number((fuelGallons * gasInfo.rate).toFixed(2));

  // Determine difference with claimed amount
  const claimed = Number(claim.claimed_amount) || 0;
  const variance = Number((claimed - calculatedAmount).toFixed(2));
  const isOverClaimed = variance > 0;

  // Build Comprehensive Automation Audit Report
  const automationReport = {
    generatedAt: new Date().toISOString(),
    calculationEngine: routeResult.method,
    employee: {
      name: claim.employee_name,
      id: claim.employee_id,
      email: claim.employee_email
    },
    travelDate: claim.travel_date,
    route: {
      startPoint: home.name,
      endPoint: home.name,
      intermediateStopsCount: stops.length,
      legs: routeResult.legs,
      polyline: routeResult.polyline
    },
    metrics: {
      totalDistanceKm,
      totalDurationMin: routeResult.totalDurationMin,
      mileagePolicyKmPerGallon: mileageKmPerGallon,
      fuelRequiredGallons: fuelGallons,
      fuelUnit: 'Gallon',
      gasRateUsd: gasInfo.rate,
      gasRateSource: gasInfo.source,
      gasRateEffectiveDate: gasInfo.effectiveDate
    },
    financials: {
      claimedAmountUsd: claimed,
      systemCalculatedAmountUsd: calculatedAmount,
      varianceUsd: variance,
      isOverClaimed,
      currency: 'USD',
      currencySymbol: '$',
      policyStatus: isOverClaimed ? 'Exceeds standard 30 km/gallon limit' : 'Within allowable rate ceiling'
    }
  };

  // Update claim in database
  const updatedClaim = db.updateClaim(claim.id, {
    total_distance_km: totalDistanceKm,
    fuel_rate_km_per_liter: mileageKmPerGallon, // Stores 30.0
    fuel_liters: fuelGallons, // Stores Gallons
    petrol_rate_pkr: gasInfo.rate, // Stores $/Gallon
    petrol_rate_date: gasInfo.effectiveDate,
    calculated_amount: calculatedAmount,
    approved_amount: Math.min(claimed, calculatedAmount),
    route_legs_json: JSON.stringify(routeResult.legs),
    automation_report_json: JSON.stringify(automationReport),
    automation_run_at: new Date().toISOString(),
    status: claim.status === 'approved' ? 'approved' : 'processed'
  });

  return updatedClaim;
}

// ================= API ROUTES ================= //

// Route compatibility for proxies & serverless rewrites (e.g. Vercel)
// If request arrives as /claims instead of /api/claims, auto-prepend /api
const apiEndpoints = ['health', 'auth', 'locations', 'settings', 'petrol-rate', 'claims', 'emails', 'reports'];
app.use((req, res, next) => {
  const seg = req.url.split('/')[1]?.split('?')[0];
  if (apiEndpoints.includes(seg)) {
    req.url = '/api' + req.url;
  }
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin Authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  // Default admin credentials
  if (username === 'admin' && password === 'admin123') {
    return res.json({
      success: true,
      token: 'admin-token-' + Date.now(),
      user: {
        username: 'admin',
        name: 'System Administrator',
        role: 'admin'
      }
    });
  }
  return res.status(401).json({
    success: false,
    error: 'Invalid administrator credentials. Use admin / admin123'
  });
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer admin-token-')) {
    return res.json({ success: true, authenticated: true });
  }
  return res.status(401).json({ success: false, authenticated: false });
});

// Search locations (OSM Nominatim proxy)
app.get('/api/locations/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const results = await searchLocations(q);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get/Update Settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const updates = req.body || {};
    for (const [key, val] of Object.entries(updates)) {
      db.setSetting(key, val);
    }
    res.json({ success: true, settings: db.getSettings() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get / Check Petrol Rate
app.get('/api/petrol-rate', async (req, res) => {
  try {
    const date = req.query.date || null;
    const rateInfo = await getEffectivePetrolRate(date);
    res.json({ success: true, data: rateInfo });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/petrol-rate/fetch-latest', async (req, res) => {
  try {
    const latest = await fetchLatestPakistanPetrolRate();
    res.json({ success: true, data: latest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit a new reimbursement claim (User Form)
app.post('/api/claims', upload.single('receipt'), async (req, res) => {
  try {
    const body = req.body;
    let stops = [];
    try {
      stops = typeof body.stops === 'string' ? JSON.parse(body.stops) : (body.stops || []);
    } catch {
      stops = [];
    }

    if (!body.employee_name || !body.employee_id || !body.home_location || !body.claimed_amount) {
      return res.status(400).json({
        success: false,
        error: 'Please fill all required fields (Name, Employee ID, Home location, Claimed amount)'
      });
    }

    let receiptUrl = null;
    let receiptName = null;
    if (req.file) {
      receiptUrl = `/uploads/${req.file.filename}`;
      receiptName = req.file.originalname;
    }

    // Default home coordinates if user picked text only (e.g. geocode or Bahawalnagar default)
    let homeLat = parseFloat(body.home_lat);
    let homeLng = parseFloat(body.home_lng);
    if (!homeLat || !homeLng) {
      const geoResults = await searchLocations(body.home_location);
      if (geoResults && geoResults.length > 0) {
        homeLat = geoResults[0].lat;
        homeLng = geoResults[0].lng;
      } else {
        // Fallback default coordinates for United States (Chicago, IL central) if offline
        homeLat = 41.8781;
        homeLng = -87.6298;
      }
    }

    // Ensure stops have coordinates
    for (let i = 0; i < stops.length; i++) {
      if (!stops[i].lat || !stops[i].lng) {
        const geoStops = await searchLocations(stops[i].name || stops[i].displayName);
        if (geoStops && geoStops.length > 0) {
          stops[i].lat = geoStops[0].lat;
          stops[i].lng = geoStops[0].lng;
        } else {
          // slight offset from home for demonstration if geocoder returns empty
          stops[i].lat = homeLat + (0.08 * (i + 1));
          stops[i].lng = homeLng + (0.08 * (i + 1));
        }
      }
    }

    const created = db.createClaim({
      employee_name: body.employee_name,
      employee_id: body.employee_id,
      employee_email: body.employee_email || `${body.employee_id.toLowerCase()}@company.com`,
      home_location: body.home_location,
      home_lat: homeLat,
      home_lng: homeLng,
      claimed_amount: parseFloat(body.claimed_amount),
      travel_date: body.travel_date || new Date().toISOString().split('T')[0],
      receipt_url: receiptUrl,
      receipt_name: receiptName,
      stops: stops
    });

    // Automatically run the calculation automation immediately so the admin and user can see it!
    const processedClaim = await executeAutomation(created);

    res.json({
      success: true,
      message: 'Claim submitted and automation calculation executed successfully',
      claim: processedClaim
    });
  } catch (err) {
    console.error('Error submitting claim:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all claims with stats (Admin View)
app.get('/api/claims', (req, res) => {
  try {
    const claims = db.getAllClaims();

    let totalClaimed = 0;
    let totalCalculated = 0;
    let totalApproved = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    claims.forEach(c => {
      totalClaimed += Number(c.claimed_amount) || 0;
      totalCalculated += Number(c.calculated_amount) || 0;
      if (c.status === 'approved') {
        totalApproved += Number(c.approved_amount) || 0;
        approvedCount++;
      } else if (c.status === 'rejected') {
        rejectedCount++;
      } else {
        pendingCount++;
      }
    });

    const totalSavings = totalClaimed - (totalApproved || totalCalculated);

    res.json({
      success: true,
      claims,
      stats: {
        totalCount: claims.length,
        pendingCount,
        approvedCount,
        rejectedCount,
        totalClaimed: Number(totalClaimed.toFixed(2)),
        totalCalculated: Number(totalCalculated.toFixed(2)),
        totalApproved: Number(totalApproved.toFixed(2)),
        totalSavings: Number(totalSavings > 0 ? totalSavings.toFixed(2) : 0)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single claim
app.get('/api/claims/:id', (req, res) => {
  try {
    const claim = db.getClaimById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }
    res.json({ success: true, claim });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Run or Re-run automation on a claim
app.post('/api/claims/:id/run-automation', async (req, res) => {
  try {
    const claim = db.getClaimById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const updated = await executeAutomation(claim);
    res.json({
      success: true,
      message: 'Automation executed successfully',
      claim: updated
    });
  } catch (err) {
    console.error('Error running automation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Approve claim and send automated email
app.post('/api/claims/:id/approve', async (req, res) => {
  try {
    const claim = db.getClaimById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const approvedAmount = req.body.approved_amount !== undefined 
      ? Number(req.body.approved_amount) 
      : (claim.calculated_amount || claim.claimed_amount);
    const adminNotes = req.body.admin_notes || 'Approved as per 10km/L company fuel policy.';

    // Update claim
    const updated = db.updateClaim(claim.id, {
      status: 'approved',
      approved_amount: approvedAmount,
      admin_notes: adminNotes,
      reviewed_at: new Date().toISOString()
    });

    // Send automated email
    let emailResult = null;
    try {
      emailResult = await sendReimbursementEmail({
        claim: updated,
        status: 'approved',
        approvedAmount,
        adminNotes
      });

      db.updateClaim(claim.id, {
        email_sent: 1,
        email_sent_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Failed to send email:', e.message);
    }

    res.json({
      success: true,
      message: 'Claim approved successfully and automated email notification dispatched',
      claim: db.getClaimById(claim.id),
      email: emailResult
    });
  } catch (err) {
    console.error('Error approving claim:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reject claim and send automated email
app.post('/api/claims/:id/reject', async (req, res) => {
  try {
    const claim = db.getClaimById(req.params.id);
    if (!claim) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    const adminNotes = req.body.admin_notes || 'Claim rejected due to policy non-compliance or invalid receipts.';

    const updated = db.updateClaim(claim.id, {
      status: 'rejected',
      admin_notes: adminNotes,
      reviewed_at: new Date().toISOString()
    });

    let emailResult = null;
    try {
      emailResult = await sendReimbursementEmail({
        claim: updated,
        status: 'rejected',
        approvedAmount: 0,
        adminNotes
      });

      db.updateClaim(claim.id, {
        email_sent: 1,
        email_sent_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Failed to send rejection email:', e.message);
    }

    res.json({
      success: true,
      message: 'Claim rejected and notification email sent',
      claim: db.getClaimById(claim.id),
      email: emailResult
    });
  } catch (err) {
    console.error('Error rejecting claim:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Outbox Emails log
app.get('/api/emails', (req, res) => {
  try {
    const emails = db.getEmailLogs();
    res.json({ success: true, emails });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ================= EXPENSE REPORT & EXCEL EXPORT ROUTES ================= //

// Get structured Expense Report data for Web View
app.get('/api/reports/expense-report/data', async (req, res) => {
  try {
    const claimId = req.query.claimId;
    const settings = db.getSettings();
    const allClaims = db.getAllClaims();

    let claim = null;
    if (claimId) {
      claim = db.getClaimById(claimId);
    }
    if (!claim && allClaims.length > 0) {
      claim = allClaims[0];
    }

    const gasRate = Number(claim?.petrol_rate_pkr || settings.gas_rate || settings.petrol_rate || 3.50);
    const mpg = Number(settings.mpg || 22);

    let reportData;
    if (claim) {
      const legs = Array.isArray(claim.route_legs) ? claim.route_legs : [];
      const stops = Array.isArray(claim.stops) ? claim.stops : [];

      let items = [];
      if (legs.length > 0) {
        items = legs.map((leg, i) => {
          const distanceMiles = Number((Number(leg.distanceKm || 0) * 0.621371).toFixed(1));
          const gallons = Number((distanceMiles / mpg).toFixed(2));
          const fuelCost = Number((gallons * gasRate).toFixed(2));
          const destinationName = leg.toName || (stops[i]?.name) || `Stop ${i + 1}`;
          const marketName = destinationName.includes(',') ? destinationName.split(',')[1].trim() : 'Metro Area';

          return {
            id: `row-${i + 1}`,
            date: claim.travel_date ? formatDateToUS(claim.travel_date) : '10/11/2026',
            vendor: i === 0 ? 'Shell Oil / Fleet' : (i === 1 ? 'Mobil Fuel' : 'Mileage Allowance'),
            description: leg.description || `Transit to ${destinationName}`,
            market: marketName,
            fuel: fuelCost,
            meals: 0,
            supplies: 0,
            parking: 0,
            misc: 0,
            tip: 0,
            total: fuelCost,
            adjustedAmount: fuelCost,
            receiptVerification: claim.status === 'approved' ? 'Verified' : 'Pending',
            miles: distanceMiles,
            gallonsPer22Miles: gallons,
            ratePerGallon: gasRate
          };
        });
      } else {
        const totalKm = Number(claim.total_distance_km || 0);
        const distanceMiles = Number((totalKm * 0.621371).toFixed(1)) || 116.0;
        const gallons = Number((distanceMiles / mpg).toFixed(2));
        const fuelCost = Number((gallons * gasRate).toFixed(2));

        items = [
          {
            id: 'row-1',
            date: claim.travel_date ? formatDateToUS(claim.travel_date) : '10/11/2026',
            vendor: 'Shell Oil / Fleet',
            description: `Round-trip Business Travel: ${claim.home_location} Route`,
            market: 'Commercial District',
            fuel: fuelCost,
            meals: 0,
            supplies: 0,
            parking: 0,
            misc: 0,
            tip: 0,
            total: fuelCost,
            adjustedAmount: claim.approved_amount || fuelCost,
            receiptVerification: claim.status === 'approved' ? 'Verified' : 'Pending',
            miles: distanceMiles,
            gallonsPer22Miles: gallons,
            ratePerGallon: gasRate
          }
        ];
      }

      // Pad up to 6 rows to match the reference template
      const defaultRows = [
        { vendor: 'Mobil Gas', description: 'Client Meeting - Madison Route', market: 'Madison West', meals: 15.00, parking: 12.00, miles: 45.0 },
        { vendor: 'Office Depot', description: 'Field POS Forms & Printer Paper', market: 'Milwaukee North', supplies: 24.50, miles: 0 },
        { vendor: 'BP Fuel', description: 'Weekly Regional Route Leg', market: 'Racine South', parking: 5.00, miles: 35.0 },
        { vendor: 'Chevron', description: 'Territory Audit Inspection', market: 'Kenosha Branch', meals: 12.50, miles: 28.0 },
        { vendor: 'Speedway', description: 'Inventory Delivery Support', market: 'Rockford Center', miles: 50.0 }
      ];

      let rowIdx = items.length;
      while (items.length < 6) {
        const tpl = defaultRows[rowIdx % defaultRows.length] || {};
        const rowMiles = tpl.miles || 0;
        const rowGals = Number((rowMiles / mpg).toFixed(2));
        const rowFuel = Number((rowGals * gasRate).toFixed(2));
        const rowTotal = rowFuel + (tpl.meals || 0) + (tpl.supplies || 0) + (tpl.parking || 0);

        items.push({
          id: `row-${items.length + 1}`,
          date: claim.travel_date ? formatDateToUS(claim.travel_date) : '10/11/2026',
          vendor: tpl.vendor || '',
          description: tpl.description || '',
          market: tpl.market || '',
          fuel: rowFuel,
          meals: tpl.meals || 0,
          supplies: tpl.supplies || 0,
          parking: tpl.parking || 0,
          misc: 0,
          tip: 0,
          total: rowTotal,
          adjustedAmount: rowTotal,
          receiptVerification: rowTotal > 0 ? 'Verified' : '-',
          miles: rowMiles,
          gallonsPer22Miles: rowGals,
          ratePerGallon: gasRate
        });
        rowIdx++;
      }

      const coveredLoc = stops.length > 0 ? (stops[0].name || stops[0].displayName) : 'Milwaukee Downtown Branch, WI';
      const coveredMkt = coveredLoc.includes(',') ? coveredLoc.split(',')[1].trim() : 'Wisconsin Metro';

      reportData = {
        claimId: claim.id,
        timeFrame: {
          from: claim.travel_date ? formatDotDate(claim.travel_date) : '10.07.2026',
          to: claim.travel_date ? formatDotDate(claim.travel_date) : '10.07.2026'
        },
        employee: {
          name: claim.employee_name || 'Sarah Jenkins',
          id: claim.employee_id || 'EMP-1049',
          designation: claim.designation || 'Senior Territory Sales Representative',
          bankAccount: claim.bank_account || '•••• •••• 4829',
          bankRouting: claim.bank_routing || '071000288',
          homeLocation: claim.home_location || 'Naperville, Chicago, IL',
          homeStore: claim.home_store || 'STR-CHI-102',
          homeMarket: claim.home_market || 'Illinois / Chicago North',
          coveredLocation: claim.covered_location || coveredLoc,
          coveredStore: claim.covered_store || 'STR-MKE-405',
          coveredMarket: claim.covered_market || coveredMkt
        },
        items,
        approval: {
          approvedBy: claim.status === 'approved' ? (claim.admin_notes ? 'System Administrator (Approved)' : 'Johnathan Davis (Director)') : '',
          date: claim.reviewed_at ? formatDateToUS(claim.reviewed_at.split('T')[0]) : ''
        },
        config: {
          mpg,
          gasRate
        }
      };
    } else {
      // Clean fallback demo template matching image
      reportData = {
        claimId: 'DEMO-TEMPLATE',
        timeFrame: { from: '10.07.2026', to: '10.07.2026' },
        employee: {
          name: 'Sarah Jenkins',
          id: 'EMP-1049',
          designation: 'Senior Territory Sales Representative',
          bankAccount: '•••• •••• 4829',
          bankRouting: '071000288',
          homeLocation: 'Naperville, Chicago, IL',
          homeStore: 'STR-CHI-102',
          homeMarket: 'Illinois / Chicago North',
          coveredLocation: 'Milwaukee Downtown Branch, WI',
          coveredStore: 'STR-MKE-405',
          coveredMarket: 'Wisconsin Metro'
        },
        items: [
          { id: '1', date: '10/11/2026', vendor: 'Shell Oil', description: 'Store Visit - Chicago to Milwaukee', market: 'Milwaukee Central', fuel: 18.45, meals: 15.00, supplies: 0, parking: 12.00, misc: 0, tip: 0, total: 45.45, adjustedAmount: 45.45, receiptVerification: 'Verified', miles: 116.0, gallonsPer22Miles: 5.27, ratePerGallon: gasRate },
          { id: '2', date: '10/11/2026', vendor: 'Mobil Gas', description: 'Client Meeting - Madison Route', market: 'Madison West', fuel: 22.10, meals: 0, supplies: 0, parking: 0, misc: 0, tip: 0, total: 22.10, adjustedAmount: 22.10, receiptVerification: 'Verified', miles: 139.0, gallonsPer22Miles: 6.32, ratePerGallon: gasRate },
          { id: '3', date: '10/11/2026', vendor: 'Office Depot', description: 'Field POS Forms & Printer Paper', market: 'Milwaukee North', fuel: 0, meals: 0, supplies: 24.50, parking: 0, misc: 0, tip: 0, total: 24.50, adjustedAmount: 24.50, receiptVerification: 'Verified', miles: 0, gallonsPer22Miles: 0, ratePerGallon: gasRate },
          { id: '4', date: '10/09/2026', vendor: 'BP Fuel', description: 'Weekly Regional Route Leg 1', market: 'Racine South', fuel: 16.50, meals: 0, supplies: 0, parking: 5.00, misc: 0, tip: 0, total: 21.50, adjustedAmount: 21.50, receiptVerification: 'Verified', miles: 103.5, gallonsPer22Miles: 4.70, ratePerGallon: gasRate },
          { id: '5', date: '10/07/2026', vendor: 'Chevron', description: 'Territory Audit Inspection', market: 'Kenosha Branch', fuel: 14.80, meals: 12.50, supplies: 0, parking: 0, misc: 0, tip: 0, total: 27.30, adjustedAmount: 27.30, receiptVerification: 'Verified', miles: 93.0, gallonsPer22Miles: 4.23, ratePerGallon: gasRate },
          { id: '6', date: '10/06/2026', vendor: 'Speedway', description: 'Inventory Delivery Support', market: 'Rockford Center', fuel: 19.20, meals: 0, supplies: 0, parking: 0, misc: 0, tip: 0, total: 19.20, adjustedAmount: 19.20, receiptVerification: 'Verified', miles: 120.5, gallonsPer22Miles: 5.48, ratePerGallon: gasRate }
        ],
        approval: { approvedBy: 'Johnathan Davis (Director of Operations)', date: '11/10/2026' },
        config: { mpg, gasRate }
      };
    }

    res.json({
      success: true,
      report: reportData,
      availableClaims: allClaims.map(c => ({
        id: c.id,
        employee_name: c.employee_name,
        travel_date: c.travel_date,
        total_distance_km: c.total_distance_km,
        claimed_amount: c.claimed_amount,
        calculated_amount: c.calculated_amount,
        status: c.status
      }))
    });
  } catch (err) {
    console.error('Error generating report data:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Excel Export (.xlsx)
app.get('/api/reports/expense-report/excel', async (req, res) => {
  try {
    const claimId = req.query.claimId;
    const settings = db.getSettings();
    let workbook;

    if (claimId) {
      const claim = db.getClaimById(claimId);
      if (!claim) {
        return res.status(404).json({ success: false, error: 'Claim not found' });
      }
      workbook = await buildClaimExpenseReportWorkbook(claim, settings);
    } else {
      const allClaims = db.getAllClaims();
      if (allClaims.length > 0) {
        workbook = await buildClaimExpenseReportWorkbook(allClaims[0], settings);
      } else {
        workbook = await generateExpenseReportWorkbook();
      }
    }

    const filename = `Expense_Report_${(claimId || 'Export')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting Excel report:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Excel Export (.xlsx) from Web View state
app.post('/api/reports/expense-report/excel', async (req, res) => {
  try {
    const payload = req.body || {};
    const workbook = await generateExpenseReportWorkbook(payload);

    const safeName = (payload.employee?.name || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Expense_Report_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating Excel from payload:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// JSON 404 for unmatched API routes - ALWAYS return JSON, never HTML
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Serve frontend in production
const clientDist = fs.existsSync(path.join(__dirname, '..', 'dist'))
  ? path.join(__dirname, '..', 'dist')
  : path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Seed demo data if database has no claims or needs US sample
async function seedInitialDemoData() {
  const existing = db.getAllClaims();
  const hasUsDemo = existing.some(c => c.id === 'CLM-US-01');
  if (existing.length === 0 || !hasUsDemo) {
    try {
      console.log('🌱 Seeding US business travel demo claim (Chicago -> Milwaukee -> Madison)...');
      const seedClaim = db.createClaim({
        id: 'CLM-US-01',
        employee_name: 'Sarah Jenkins',
        employee_id: 'EMP-1049',
        employee_email: 'sarah.jenkins@company.us',
        home_location: 'Naperville, Chicago, IL',
        home_lat: 41.7508,
        home_lng: -88.1535,
        claimed_amount: 145.00,
        travel_date: new Date().toISOString().split('T')[0],
        receipt_url: null,
        receipt_name: 'Shell_Gas_Receipt_US.pdf',
        stops: [
          {
            name: 'Milwaukee Downtown Branch, WI',
            displayName: 'Milwaukee, Wisconsin, United States',
            lat: 43.0389,
            lng: -87.9065
          },
          {
            name: 'Madison State Capitol & Branch, WI',
            displayName: 'Madison, Wisconsin, United States',
            lat: 43.0748,
            lng: -89.3842
          }
        ]
      });

      await executeAutomation(seedClaim);
      console.log('✅ US Demo claim seeded & automation processed successfully with 30 km/gallon rule.');
    } catch (e) {
      console.warn('Seed demo notice:', e.message);
    }
  }
}

if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`🚀 Expense Reimbursement Automation Server running on http://localhost:${PORT}`);
    await seedInitialDemoData();
  });
} else {
  seedInitialDemoData().catch(e => console.warn('Vercel seed error:', e));
}

module.exports = app;
