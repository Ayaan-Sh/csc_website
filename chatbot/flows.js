/* ============================================================
   flows.js
   Data-only definitions of every conversation flow. The rule
   engine in conversation.js reads this file to know what to ask
   next nothing in here talks to the DOM.

   Each flow is an ordered list of steps:
     {
       id:       unique key within the flow
       bot:      the message CSC "says" (kept under ~40 words)
       type:     'quick-reply' | 'text'
       options:  [ ...button labels ]   (quick-reply only)
       field:    key the answer is stored under in caseData
       optional: true if the step can be skipped
       ack(value): optional returns a short empathetic line
                   reacting to the answer just given, or null
                   for no reaction. Shown before the next question.
     }

   Swapping the rule engine for a live Groq call later only means
   replacing how `next step` is chosen in conversation.js the
   UI and storage layers do not need to change.
   ============================================================ */

const CSCFlows = (() => {

  /* ---------- Reusable question building blocks ---------- */

  const Q = {
    amount: {
      id: "amount",
      bot: "Roughly how much money was involved, if any?",
      type: "quick-reply",
      options: ["Under ₹10,000", "₹10,000 – ₹1,00,000", "Over ₹1,00,000", "No money was lost"],
      field: "amountLost"
    },
    timeline: {
      id: "timeline",
      bot: "When did this happen?",
      type: "quick-reply",
      options: ["Within the last 24 hours", "In the last week", "More than a week ago"],
      field: "timeline",
      ack: (value) => value === "Within the last 24 hours"
        ? "That's encouraging cases reported quickly often have a better chance of timely intervention."
        : null
    },
    reported1930: {
      id: "reported1930",
      bot: "Have you already reported this on the national cybercrime helpline (1930) or cybercrime.gov.in?",
      type: "quick-reply",
      options: ["Yes", "No", "Not sure how"],
      field: "reportedToAuthorities",
      ack: (value) => {
        if (value === "No") return "I'd recommend reporting it as soon as possible I can help point you there.";
        if (value === "Not sure how") return "No worries, I can share how to do that once we're done here.";
        return "Good that helps build the case.";
      }
    },
    evidence: {
      id: "evidence",
      bot: "Do you have any screenshots, messages, or transaction records saved?",
      type: "quick-reply",
      options: ["Yes, I have evidence saved", "Some, not everything", "No"],
      field: "evidenceAvailable",
      ack: (value) => value === "Yes, I have evidence saved"
        ? "That will be very useful for the investigation."
        : null
    },
    freeDetails: {
      id: "freeDetails",
      bot: "Thank you. In a few words, is there anything else important I should note for the investigator?",
      type: "text",
      field: "additionalDetails",
      optional: true
    }
  };

  const bankApp = {
    id: "bankApp",
    bot: "Which bank or payment app was involved?",
    type: "text",
    field: "institution"
  };

  const platform = {
    id: "platform",
    bot: "Which platform is this about?",
    type: "quick-reply",
    options: ["Instagram", "Facebook", "WhatsApp", "Email", "Other"],
    field: "platform"
  };

  const stillHaveAccess = {
    id: "stillHaveAccess",
    bot: "Do you still have access to the account, or are you locked out?",
    type: "quick-reply",
    options: ["Locked out completely", "Still have access, but it looks compromised", "Not sure"],
    field: "accountAccess",
    ack: (value) => value === "Locked out completely"
      ? "Understood losing access is stressful, let's get this moving."
      : null
  };

  const orgOrIndividual = {
    id: "orgOrIndividual",
    bot: "Is this affecting an individual, or a business/organization?",
    type: "quick-reply",
    options: ["An individual", "A business / organization"],
    field: "entityType"
  };

  const systemsAffected = {
    id: "systemsAffected",
    bot: "What's been affected specific files, a whole system, or your full network?",
    type: "text",
    field: "systemsAffected"
  };

  const ransomDemanded = {
    id: "ransomDemanded",
    bot: "Has a ransom or payment been demanded?",
    type: "quick-reply",
    options: ["Yes", "No", "Unclear"],
    field: "ransomDemanded",
    ack: (value) => value === "Yes"
      ? "Please avoid paying or deleting anything until an investigator has looked at this."
      : null
  };

  const stillOngoing = {
    id: "stillOngoing",
    bot: "Is this still happening right now, or has it stopped?",
    type: "quick-reply",
    options: ["Still happening / ongoing", "Seems to have stopped"],
    field: "stillOngoing",
    ack: (value) => value === "Still happening / ongoing"
      ? "You're doing the right thing by reaching out now rather than waiting."
      : null
  };

  const infoStolen = {
    id: "infoStolen",
    bot: "What kind of information do you believe was exposed or stolen? (e.g. Aadhaar, PAN, bank details)",
    type: "text",
    field: "infoExposed"
  };

  const orgNeed = {
    id: "orgNeed",
    bot: "What would be most useful right now could you describe briefly what you're looking for?",
    type: "text",
    field: "requirement"
  };

  const preferredContact = {
    id: "preferredContact",
    bot: "What's the best way and time to reach you?",
    type: "text",
    field: "preferredContact"
  };

  /* ---------- Flow definitions, keyed by incident type ---------- */

  const FLOWS = {

    "UPI Fraud": [Q.amount, Q.timeline, Q.reported1930, bankApp, Q.evidence, Q.freeDetails],
    "QR Code Scam": [Q.amount, Q.timeline, Q.reported1930, bankApp, Q.evidence, Q.freeDetails],
    "Bank Fraud": [Q.amount, Q.timeline, Q.reported1930, bankApp, Q.evidence, Q.freeDetails],
    "Credit Card Fraud": [Q.amount, Q.timeline, Q.reported1930, bankApp, Q.evidence, Q.freeDetails],
    "Cryptocurrency Scam": [Q.amount, Q.timeline, Q.reported1930, Q.evidence, Q.freeDetails],
    "Online Shopping Fraud": [Q.amount, Q.timeline, Q.reported1930, bankApp, Q.evidence, Q.freeDetails],

    "Instagram Hacked": [platform, stillHaveAccess, Q.timeline, Q.evidence, Q.freeDetails],
    "Facebook Hacked": [platform, stillHaveAccess, Q.timeline, Q.evidence, Q.freeDetails],
    "WhatsApp Hacked": [platform, stillHaveAccess, Q.timeline, Q.evidence, Q.freeDetails],
    "Email Hacked": [platform, stillHaveAccess, Q.timeline, Q.evidence, Q.freeDetails],

    "Ransomware": [orgOrIndividual, systemsAffected, ransomDemanded, Q.timeline, Q.evidence, Q.freeDetails],
    "Malware": [orgOrIndividual, systemsAffected, Q.timeline, Q.evidence, Q.freeDetails],
    "Data Breach": [orgOrIndividual, systemsAffected, Q.timeline, Q.reported1930, Q.freeDetails],
    "Business Email Compromise": [orgOrIndividual, Q.amount, Q.timeline, Q.evidence, Q.freeDetails],
    "Corporate Security Incident": [orgOrIndividual, systemsAffected, Q.timeline, Q.freeDetails],

    "Identity Theft": [infoStolen, Q.timeline, Q.reported1930, Q.evidence, Q.freeDetails],
    "Cyber Bullying": [platform, stillOngoing, Q.evidence, Q.freeDetails],
    "Sextortion": [platform, stillOngoing, Q.amount, Q.evidence, Q.freeDetails],
    "Phishing": [Q.timeline, Q.amount, Q.evidence, Q.freeDetails],

    "Training Enquiry": [orgOrIndividual, orgNeed, preferredContact],
    "Cyber Law Consultation": [orgOrIndividual, orgNeed, preferredContact],
    "VAPT": [orgOrIndividual, orgNeed, preferredContact],
    "General Consultation": [orgOrIndividual, orgNeed, preferredContact]

  };

  /* Used only as a last-resort fallback if free-text intent detection
     can't work out what happened after a couple of tries. */
  const CATEGORIES = [
    {
      id: "financial",
      label: "I lost money / financial fraud",
      incidents: ["UPI Fraud", "QR Code Scam", "Bank Fraud", "Credit Card Fraud", "Cryptocurrency Scam", "Online Shopping Fraud"],
      defaultIncident: "Bank Fraud"
    },
    {
      id: "account",
      label: "My account was hacked",
      incidents: ["Instagram Hacked", "Facebook Hacked", "WhatsApp Hacked", "Email Hacked"],
      defaultIncident: "Email Hacked"
    },
    {
      id: "business",
      label: "Business / systems attack",
      incidents: ["Ransomware", "Malware", "Data Breach", "Business Email Compromise", "Corporate Security Incident"],
      defaultIncident: "Corporate Security Incident"
    },
    {
      id: "personal",
      label: "Harassment, threats or identity misuse",
      incidents: ["Identity Theft", "Cyber Bullying", "Sextortion", "Phishing"],
      defaultIncident: "Cyber Bullying"
    },
    {
      id: "services",
      label: "Training, VAPT or consultation",
      incidents: ["Training Enquiry", "Cyber Law Consultation", "VAPT", "General Consultation"],
      defaultIncident: "General Consultation"
    }
  ];

  function getFlow(incidentType) {
    return FLOWS[incidentType] || null;
  }

  return { CATEGORIES, FLOWS, getFlow };

})();