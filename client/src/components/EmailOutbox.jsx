import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, ExternalLink, RefreshCw, Send, Clock, User } from 'lucide-react';

export default function EmailOutbox() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/emails');
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails || []);
        if (data.emails && data.emails.length > 0 && !selectedEmail) {
          setSelectedEmail(data.emails[0]);
        }
      }
    } catch (err) {
      console.warn('Error fetching email logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            <Mail className="w-3.5 h-3.5" />
            Automated Email Dispatch Outbox
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">
            Dispatched Reimbursement Revert Emails
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time audit log of automated decision emails dispatched to employees upon admin approval/rejection.
          </p>
        </div>

        <button
          onClick={fetchEmails}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Outbox
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Email list */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {emails.length > 0 ? (
              emails.map((em) => {
                const isSelected = selectedEmail?.id === em.id;

                return (
                  <button
                    key={em.id}
                    onClick={() => setSelectedEmail(em)}
                    className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {em.to_email}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(em.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-xs font-medium text-slate-700 truncate mt-0.5">
                        {em.subject}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Dispatched
                        </span>
                        {em.claim_id && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Ref: {em.claim_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-400">
                <Mail className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No emails dispatched yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  When you approve or reject a claim in the Admin Dashboard, the automated revert email will appear here immediately!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Live Email Preview Frame */}
        <div className="lg:col-span-7">
          {selectedEmail ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
              {/* Email metadata header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-500">To:</span>
                    <strong className="text-slate-800">{selectedEmail.to_email}</strong>
                  </div>
                  {selectedEmail.preview_url && (
                    <a
                      href={selectedEmail.preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-[11px]"
                    >
                      Open in External Browser <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500">Subject:</span>
                  <span className="text-slate-800 font-medium">{selectedEmail.subject}</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>Sent on {new Date(selectedEmail.sent_at).toLocaleString()}</span>
                  <span>&bull;</span>
                  <span>Delivery Method: Automated Revert Mailer</span>
                </div>
              </div>

              {/* Rendered HTML Body */}
              <div className="p-4 flex-1 bg-slate-100 overflow-y-auto">
                <div 
                  className="bg-white rounded-xl shadow-xs p-2 max-w-xl mx-auto"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 h-full flex items-center justify-center">
              <div>
                <Mail className="w-12 h-12 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-semibold text-slate-600">Select an email to view preview</p>
                <p className="text-xs text-slate-400 mt-1">
                  Inspect the exact HTML notification sent to the employee.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
