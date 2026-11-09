const nodemailer = require('nodemailer');
const { db } = require('../db');

/**
 * Send reimbursement decision email to employee (USD & Gallons @ 30 KM/Gallon)
 */
async function sendReimbursementEmail({ claim, status, approvedAmount, adminNotes }) {
  const settings = db.getSettings();
  
  // Format dates & numbers
  const formattedDate = new Date(claim.travel_date || Date.now()).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const report = claim.automation_report || {};
  const isApproved = status === 'approved';
  const statusColor = isApproved ? '#16a34a' : '#dc2626';
  const statusTitle = isApproved ? 'Reimbursement Approved' : 'Reimbursement Claim Update';
  
  const stopsList = Array.isArray(claim.stops) 
    ? claim.stops.map(s => s.name || s.displayName).join(' ➔ ')
    : '';
  const fullRouteSummary = `${claim.home_location} ➔ ${stopsList ? stopsList + ' ➔ ' : ''}${claim.home_location}`;

  const fuelGallons = Number(claim.fuel_liters || (Number(claim.total_distance_km || 0) / 30)).toFixed(2);
  const gasPrice = Number(claim.petrol_rate_pkr || 3.50).toFixed(2);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 28px 32px; color: #ffffff; text-align: left; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; color: #94a3b8; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${isApproved ? '#dcfce7' : '#fee2e2'}; color: ${statusColor}; margin-top: 12px; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
    .intro { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .amount-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; text-align: center; }
    .amount-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; }
    .amount-value { font-size: 32px; font-weight: 800; color: #0f172a; margin: 6px 0; }
    .amount-sub { font-size: 13px; color: #64748b; }
    .table-container { margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th { background: #f8fafc; padding: 10px 14px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
    td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    tr:last-child td { border-bottom: none; }
    .notes-box { background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px; margin-top: 20px; font-size: 13px; color: #854d0e; }
    .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; font-weight: 700; margin-bottom: 4px;">Automated Travel & Gas Reimbursement System</div>
      <h1>Claim Decision Notification</h1>
      <p>Claim Reference: <strong>${claim.id}</strong></p>
      <div class="badge">${isApproved ? 'Approved for Reimbursement' : 'Claim Rejected / Revised'}</div>
    </div>
    
    <div class="content">
      <div class="greeting">Dear ${claim.employee_name} (Employee ID: ${claim.employee_id}),</div>
      <p class="intro">
        Your travel fuel reimbursement request submitted for travel on <strong>${formattedDate}</strong> has been reviewed and verified against our automated GPS route and fuel policy rules (<strong>30 KM / Gallon limit allowed</strong> & national gas tariff benchmark).
      </p>

      <div class="amount-box">
        <div class="amount-label">Approved Reimbursement Amount</div>
        <div class="amount-value">$${Number(approvedAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="amount-sub">
          Original Claimed: $${Number(claim.claimed_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} 
          ${Number(approvedAmount) < Number(claim.claimed_amount) ? `(Policy adjustment: -$${(Number(claim.claimed_amount) - Number(approvedAmount)).toLocaleString('en-US', { minimumFractionDigits: 2 })})` : ''}
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th colspan="2">Automation Calculation Breakdown</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="width: 45%;"><strong>Route Covered:</strong></td>
              <td>${fullRouteSummary}</td>
            </tr>
            <tr>
              <td><strong>Total Verified Round-trip Distance:</strong></td>
              <td><strong>${Number(claim.total_distance_km || 0).toFixed(2)} KM</strong></td>
            </tr>
            <tr>
              <td><strong>Efficiency Benchmark Allowed:</strong></td>
              <td><strong>30.0 KM / Gallon</strong></td>
            </tr>
            <tr>
              <td><strong>Allowable Fuel Entitlement:</strong></td>
              <td>${fuelGallons} Gallons <span style="font-size: 11px; color: #64748b;">(${Number(claim.total_distance_km || 0).toFixed(1)} km ÷ 30 km/gal)</span></td>
            </tr>
            <tr>
              <td><strong>Applied Gas Price per Gallon:</strong></td>
              <td>$${gasPrice} / Gallon <span style="font-size: 11px; color: #64748b;">(National Benchmark)</span></td>
            </tr>
            <tr style="background: #f8fafc;">
              <td><strong>Calculation Formula:</strong></td>
              <td>(${Number(claim.total_distance_km || 0).toFixed(1)} km ÷ 30 km/gal) × $${gasPrice}/gal = <strong>$${Number(claim.calculated_amount || approvedAmount).toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      ${adminNotes ? `
        <div class="notes-box">
          <strong>Admin Remarks:</strong> ${adminNotes}
        </div>
      ` : ''}
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">This is an automated notification generated by the Corporate Travel Reimbursement Portal.</p>
      <p style="margin: 0;">Disbursement will be processed via payroll direct deposit. Please retain this email for your records.</p>
    </div>
  </div>
</body>
</html>
  `;

  const subject = isApproved
    ? `Approved: Travel Reimbursement Claim ${claim.id} ($${Number(approvedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })})`
    : `Update: Travel Reimbursement Claim ${claim.id}`;

  let previewUrl = null;
  let statusResult = 'sent';

  try {
    let transporter;

    if (settings.smtp_host && settings.smtp_user && settings.smtp_pass) {
      transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port, 10) || 587,
        secure: settings.smtp_secure === 'true',
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_pass
        }
      });
    } else {
      // Ethereal test account for instant sandbox testing
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    const info = await transporter.sendMail({
      from: settings.from_email || '"Reimbursement Automation" <reimbursements@corporate.internal>',
      to: claim.employee_email,
      subject,
      html: htmlContent
    });

    previewUrl = nodemailer.getTestMessageUrl(info) || null;
    console.log('✉️ Email sent successfully to:', claim.employee_email, 'Preview URL:', previewUrl);
  } catch (err) {
    console.warn('⚠️ SMTP send error, logging to outbox:', err.message);
    statusResult = 'simulated';
  }

  // Log into DB emails table
  const log = db.addEmailLog({
    claim_id: claim.id,
    to_email: claim.employee_email,
    subject,
    body_html: htmlContent,
    preview_url: previewUrl,
    status: statusResult
  });

  return {
    success: true,
    emailId: log.id,
    previewUrl,
    status: statusResult
  };
}

module.exports = {
  sendReimbursementEmail
};
