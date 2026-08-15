export const translations = {
  en: {
    ai: {
      used: { summary: 'AI Diagnostics used during this consultation.' },
      badge: 'AI ASSISTANT',
      powered: 'Powered by MedEra AI',
      status: { ready: 'Ready', unavailable: 'System Offline' },
      tab: { freetext: 'Free Text & NLP', selector: 'Symptom Selector' },
      prose: { placeholder: 'Describe symptoms in plain language...' },
      detecting: 'Detecting...',
      detected: 'Detected:',
      add: { manually: 'Add manually' },
      context: { toggle: 'View Patient Context Variables', travel: 'Recent Tropical Travel', note: 'Context is automatically pulled from the patient record.' },
      generate: 'Generate Diagnostic Suggestions',
      loading: { '1': 'Analyzing symptoms...', '2': 'Cross-referencing medical database...', '3': 'Evaluating patient history...', '4': 'Generating final predictions...' },
      error: { default: 'An unexpected error occurred.', invalid: 'Invalid request payload.', auth: 'Authentication failed. Invalid API token.', loading: 'AI Service is currently overloaded.', server: 'Internal server error.', retry: 'Try Again' },
      results: { header: 'Diagnostic Predictions', found: 'Found {n} probable conditions' },
      regenerate: 'Regenerate',
      clear: 'Clear',
      severity: { '1': 'LOW', '2': 'MILD', '3': 'MODERATE', '4': 'HIGH', '5': 'CRITICAL' },
      confidence: 'Confidence Score',
      evidence: 'Clinical Evidence Drivers',
      apply: 'Apply to Diagnosis',
      feedback: { correct: 'Mark as Correct', wrong: 'Mark as Incorrect' },
      disclaimer: 'AI-generated suggestions are for clinical decision support only. All diagnoses must be reviewed and confirmed by the attending physician.'
    },

    secretary: {
      nav: {
        dashboard: 'Dashboard',
        patients: 'Patients',
        appointments: 'Appointments',
        demands: 'Demands',
        waitingRoom: 'Waiting Room',
        billing: 'Billing',
        messages: 'Messages',
        settings: 'Settings'
      },
      role: 'SECRETARY',
      portal: 'SECRETARY PORTAL',
      waitingRoom: {
        live: 'Live',
        markArrived: 'Mark Arrived',
        sendToRoom: 'Send to Room',
        manage: 'Real-time patient flow management.',
        roomStatus: 'Room Status',
        inUse: 'IN USE',
        free: 'FREE',
        totalExpected: 'Total expected',
        arrived: 'Arrived',
        waiting: 'Waiting',
        waitingFor: 'Waiting {n} min',
        roomFree: 'FREE',
        roomInUse: 'IN USE',
        todayQueue: 'TODAY\'S QUEUE',
      },
      messages: {
        searchPlaceholder: 'Search messages...',
        online: 'Online',
        today: 'Today',
        enterToSend: 'Enter to send',
        typeMessage: 'Type your message...',
        selectConversation: 'Select a conversation or start a new one'
      },
      billing: {
        newInvoice: 'New Invoice',
        markPaid: 'Mark as Paid',
        cancelInvoice: 'Cancel Invoice',
        invoiceNumber: 'Invoice Number',
        paymentMethod: 'Payment Method',
        manage: 'Manage invoices and payments.',
        totalToday: 'Total Today',
        pending: 'Pending',
        paidToday: 'Paid Today',
        searchPlaceholder: 'Search by patient, invoice number...',
        status: 'Status',
        date: 'Date',
        noInvoices: 'No invoices found',
        downloadReceipt: 'Download Receipt',
        markAsPaidModal: 'Mark Invoice as Paid',
        selectPaymentMethod: 'Select the payment method used by the patient.',
        cancel: 'Cancel',
        confirmPayment: 'Confirm Payment',
        patient: 'Patient* (Search...)',
        doctor: 'Doctor*',
        amount: 'Amount*',
        notes: 'Notes',
        createInvoice: 'Create Invoice',
        cash: 'CASH',
        card: 'CARD',
        online: 'ONLINE',
        insurance: 'INSURANCE'
      },
      appointments: {
        newAppointment: 'New Appointment',
        confirm: 'Confirm',
        reschedule: 'Reschedule',
        manage: 'Manage and confirm patient bookings.',
        list: 'List',
        calendar: 'Calendar',
        cancelApt: 'Cancel Appointment',
        cancelConfirm: 'Are you sure you want to cancel this appointment? This action cannot be undone.',
        cancelReason: 'Cancellation Reason*',
        goBack: 'Go Back',
        confirmCancel: 'Confirm Cancel',
        searchBy: 'Search by name/CIN',
        date: 'Date*',
        time: 'Time*',
        duration: 'Duration',
        room: 'Room',
        type: 'Type',
        reason: 'Reason',
        createAppt: 'Create Appointment',
        markArrived: 'Mark Arrived',
        cancelModalReason: 'Cancellation Reason'
      },
      patients: {
        newPatient: 'New Patient Registration',
        personalInfo: 'Personal Information',
        medicalInfo: 'Medical Information',
        history: 'Medical History',
        registerBtn: 'Register Patient',
        all: 'All',
        save: 'Save Changes',
        viewRecord: 'View Full Record',
        noPatients: 'No patients found',
        manage: 'Search and manage patient records.',
        active: 'Active',
        archived: 'Archived',
        bloodGroup: 'Blood Group',
        patient: 'Patient',
        cin: 'CIN',
        phone: 'Phone',
        insurance: 'Insurance',
        created: 'Created',
        actions: 'Actions',
        unknown: 'Unknown',
        allergies: 'Allergies (comma-separated)',
        noneReported: 'None reported',
        identity: 'Identity',
        editPatient: 'Edit Patient',
        searchPlaceholder: 'Search by name, CIN, phone...'
      },
      dashboard: {
        greeting: 'Good {time}, {name}.',
        overview: 'Here\'s today\'s clinic overview.',
        todaysSchedule: 'Today\'s Schedule',
        quickActions: 'Quick Actions',
        viewAll: 'View all',
        noAppointments: 'No appointments today',
        newPatient: 'New Patient',
        newAppointment: 'New Appointment',
        searchPatient: 'Search Patient',
        nextAppointment: 'Next Appointment',
        recentRegistrations: 'Recent Registrations',
        
        
        
        
        
        
        pendingInvSub: 'MAD outstation',
        all: 'All',
        patient: 'Patient',
        cin: 'CIN',
        messagesPreview: 'Messages Preview',
        inbox: 'Inbox',
        doctor_label: 'DOCTOR',
        patient_label: 'PATIENT',
        todayAptTitle: 'Today\'s Appointments',
        pendingConfTitle: 'Pending Confirmation',
        waitingRoomTitle: 'In Waiting Room',
        pendingInvTitle: 'Pending Invoices',
        
        pendingConfSub: 'Requires your attention',
        waitingRoomSub: 'Live count',
        
      },
      demands: {
        title: 'Demands',
        subtitle: 'Manage patient appointment requests awaiting your approval.',
        tabs: {
          all: 'All',
          pending: 'Pending',
          accepted: 'Accepted',
          rejected: 'Rejected'
        },
        pendingBadge: '{n} pending',
        refreshTitle: 'Refresh',
        loading: 'Loading demands...',
        errorMsg: 'Error loading demands.',
        retryBtn: 'Retry',
        nothingHere: 'Nothing here!',
        emptyPending: 'No pending demands.',
        emptyAccepted: 'No accepted demands.',
        emptyRejected: 'No rejected demands.',
        emptyAll: 'No demands found.',
        status: {
          pending: 'PENDING',
          accepted: 'ACCEPTED',
          rejected: 'REJECTED',
          processed: 'Processed'
        },
        source: {
          whatsapp: 'WhatsApp',
          portal: 'Patient Portal'
        },
        consultType: {
          video: 'Video',
          inPerson: 'In-Person'
        },
        appointmentType: {
          FIRST: 'Initial consultation',
          FOLLOW_UP: 'Follow-up',
          EMERGENCY: 'Emergency'
        },
        reasonLabel: 'Reason',
        defaultMotive: 'Appointment request',
        acceptBtn: 'Accept',
        rejectBtn: 'Reject',
        rejectModal: {
          title: 'Reject demand',
          forPatient: 'For {name}',
          reasonLabel: 'Rejection reason',
          reasonRequired: '*',
          reasonPlaceholder: 'E.g.: Slot unavailable, please choose another time...',
          whatsappNote: 'This reason will be sent to the patient via WhatsApp.',
          cancelBtn: 'Cancel',
          confirmBtn: 'Confirm Rejection'
        },
        quickReasons: [
          'Slot unavailable',
          'Incomplete file',
          'Priority emergency',
          'Outside specialty'
        ],
        pagination: {
          summary: '{count} demand{plural} · Page {page} / {total}'
        },
        toast: {
          acceptSuccess: 'Appointment confirmed and WhatsApp message sent to patient.',
          acceptError: 'Error confirming appointment.',
          rejectSuccess: 'Demand rejected. Patient notified via WhatsApp.',
          rejectError: 'Error rejecting demand.'
        }
      }
    },
    doctorPortal: {
      dashboard: {

        insight: 'Here is your practice at a glance. You have {value} appointments scheduled for today.',
        todayApt: 'Today\'s Appointments',
        activePat: 'Active Patients',
        pendingCons: 'Pending Consultations',
        unpaidInv: 'Unpaid Invoices',
        next: 'Next:',
        thisMonth: 'this month',
        actionNeeded: 'Action needed',
        allClear: 'All clear',
        reqAttention: 'Requires attention',
        allCaughtUp: 'All caught up',
        recentPat: 'Recent Patients',
        upcomingApt: 'Upcoming Appointments',
        viewAll: 'View all',
        quickActions: 'Quick Actions',
        newPrescription: 'New Prescription',
        startConsultation: 'Start Consultation',
        patientRecords: 'Patient Records',
        online: 'online',
        appointments: 'Appointments',
        consultations: 'Consultations',
        monthlyCons: 'Consultations this month',
        prescsIssued: 'Prescriptions issued',
        avgTime: 'Avg. visit duration',
        attendance: 'Attendance rate',
        performance: 'Performance',
      },
      portal: "Doctor Portal",
      nav: {
        dashboard: "Dashboard",
        patients: "Patients",
        appointments: "Appointments",
        consultations: "Consultations",
        prescriptions: "Prescriptions",
        billing: "Billing",
        messages: "Messages",
        settings: "Settings"
      },
      billing: {
        title: "Billing",
        subtitle: "Generate and manage patient invoices.",
        totalPending: "Total Pending",
        totalCollected: "Total Collected",
        invoicesIssued: "Invoices Issued",
        allInvoices: "All Invoices",
        pending: "Pending",
        paid: "Paid",
        generateInvoice: "Generate Invoice",
        noInvoicesFound: "No invoices found",
        adjustFilters: "Try adjusting your filters or create a new invoice.",
        markPaid: "Mark as Paid",
        cancel: "Cancel",
        viewDetails: "View Details",
        showing: "Showing",
        to: "to",
        of: "of",
        invoices: "invoices"
      },
      messages: {
        title: "Messages",
        subtitle: "Communicate with your patients and clinic staff.",
        newMessage: "New Message",
        empty: "No messages yet",
        emptyConversation: "No messages in this conversation yet",
        loading: "Loading messages...",
        typeMessage: "Type a message...",
        selectConversation: "Select a conversation or start a new one",
        recipient: "Recipient",
        selectRecipient: "Select recipient...",
        secretaries: "Secretaries",
        secretaryRole: "Secretary",
        patients: "Patients",
        subject: "Subject",
        subjectPlaceholder: "Medical inquiry, follow-up, etc.",
        messageBody: "Message",
        sendMessage: "Send Message"
      },
      patients: {
        table: {
          patient: "Patient",
          ageGender: "Age & Gender",
          bloodGroup: "Blood Group",
          insurance: "Insurance",
          lastVisit: "Last Visit",
          actions: "Actions"
        }
      },
      greeting: "Good morning, Dr.",
      agenda: {
        today: "Today's Agenda",
        empty: "No appointments scheduled for today"
      },
      consult: {
        draft: "Save Draft",
        start: "Mark In Progress",
        final: "Finalize Consultation",
        finalQ: "Finalize this consultation?",
        finalW: "Once finalized, this consultation cannot be edited."
      },
      ai: {
        title: "AI Diagnostic Assistant",
        generate: "Generate Suggestions",
        disclaimer: "These are AI-generated suggestions. Review before any clinical decision."
      },
      rx: {
        add: "Add Medication",
        issue: "Issue Prescription"
      },
      bill: {
        markPaid: "Mark as Paid",
        generate: "Generate Invoice",
        method: "Payment Method"
      }
    },
    appointments: {
      title: "My Appointments",
      subtitle: "Your scheduled visits and appointment history.",
      seeDetails: "See Details",
      tab: {
        upcoming: "Upcoming",
        past: "Past",
        cancelled: "Cancelled"
      }
    },
    appt: {
      choose: {
        title: "How would you like to meet your doctor?",
        sub: "Choose your preferred consultation format"
      },
      type: {
        inperson: "In Person",
        video: "Video Consultation"
      },
      inperson: {
        desc: "Visit the clinic at your scheduled appointment time"
      },
      video: {
        desc: "Consult your doctor from home via secure video call",
        secure: "Encrypted · HIPAA Compliant"
      }
    },
    status: {
      confirmed: "CONFIRMED",
      pending: "PENDING",
      cancelled: "CANCELLED",
      completed: "COMPLETED",
      done: "DONE",
      finalized: "FINALIZED",
      in_progress: "IN PROGRESS",
      planned: "PLANNED",
      requested: "REQUESTED",
      rejected: "REJECTED"
    },
    common: {
      min: "min",
      logout: "Logout",
      details: "Details",
      export: "Export",
      actions: "Actions"
    },
    appointmentType: {
      followup: "Follow-up consultation",
      initial: "Initial consultation",
      FollowUp: "Follow-up consultation",
      Consultation: "Initial consultation",
      Routine: "Routine check-up",
      "Follow-up": "Follow-up consultation"
    },
    breadcrumb: {
      patient: "Patient",
      admin: "Admin"
    },
    nav: {
      solutions: "Solutions",
      features: "Features",
      pricing: "Pricing",
      security: "Security",
      login: "Login",
      getStarted: "Get Started"
    },
    hero: {
      title1: "Run Your Practice.",
      title2: "*Not Your Paperwork.*",
      desc: "MedEra gives solo doctors and small clinics one place to manage patients, appointments, and prescriptions effortlessly.",
      startTrial: "Start Free Trial",
      howItWorks: "See How It Works",
      success: "Success",
      patientSync: "Patient record synchronized across 4 departments.",
      hipaa: "HIPAA Compliant"
    },
    problem: {
      before: "BEFORE",
      after: "AFTER",
      title1: "Fragmented Data",
      desc1: "Siloed systems make it impossible to get a full view of patient history, leading to redundant questions and clinical errors.",
      title2: "Administrative Burnout",
      desc2: "Clinicians spend over 40% of their day on data entry instead of patient care, driving exhaustion and turnover.",
      title3: "Compliance Complexity",
      desc3: "Navigating shifting regulations manually creates legal risks and operational friction for boutique practices.",
      sol1: "Unified Clinical Console",
      solDesc1: "One source of truth for every patient touchpoint, from initial intake to post-op follow-up.",
      sol2: "AI-Driven Automation",
      solDesc2: "Smart templates and voice-to-text charting reduce documentation time by up to 60%.",
      sol3: "Built-in Guardrails",
      solDesc3: "Automated compliance checks and audit-ready reporting baked directly into your workflow."
    },
    features: {
      heading: "Everything your practice needs",
      list: [
        { title: "Smart Scheduling", desc: "Automated appointment booking with SMS reminders to reduce no-shows by 40%." },
        { title: "Patient Portals", desc: "Secure access for patients to view records, results, and pay invoices instantly." },
        { title: "E-Prescribing", desc: "Send prescriptions directly to pharmacies with intelligent drug interaction alerts." },
        { title: "Practice Analytics", desc: "Visual dashboards tracking revenue, patient volume, and clinical outcomes." },
        { title: "Enterprise Security", desc: "End-to-end encryption and HIPAA-compliant storage for every single data point." },
        { title: "Billing & Claims", desc: "Automated insurance claim submission and direct-to-patient digital billing." }
      ]
    },
    stats: {
      patients: "Patients",
      appointmentsText: "Appointments",
      uptime: "Uptime",
      appointments: {
        title: "Clinical Appointments Registry",
        subtitle: "Global oversight of all medical consultations within the MedEra network.",
        searchPlaceholder: "Search registry by patient or practitioner...",
        patient: "Patient",
        doctor: "Practitioner",
        type: "Type",
        dateTime: "Temporal Context",
        status: "State",
      },
      userMgmt: "Identity & Access Registry",
      clinics: "Clinics"
    },
    generic: {
      backToHome: "Back to Home",
      welcome: "Welcome to the MedEra",
      preparing: "page. We are currently preparing detailed content for this section.",
      questionsPrefix: "If you have questions about ",
      questionsSuffix: "",
      feelFree: "please feel free to",
      contact: "contact our support team"
    },
    testimonials: [
      {
        text: "MedEra changed everything for my solo practice. I finally feel like I have an office manager, without the overhead.",
        name: "Dr. Salma Idrissi",
        title: "Family Medicine",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuABL4vkIluH2ga63FwfwEeDJSIMGgB6SP61pFrLg7JeFsRbEcP9PWjm8n1Ip50oqe8Lt7Fh8guAKPnDc69b9ltsJ02BVZtpm6v9rM_gydI3pv4r7nILtrh_UZMJU2ZDPeOsBstFKWZQWyGW2f8CId5BUDa85rIBbRmelxN9OnKDasjccDDUQE4FrxT1qx3062b9ZZPHxluLyO8zaJyYXqf9NCvCc6zG3dbI9yOpdFEofQHqDZUEPKe6O5tSRWRmqi2VdACV92EUBuU"
      },
      {
        text: "The transition was seamless. We were up and running in a weekend. The e-prescribing tool alone saves us hours.",
        name: "Dr. Youssef Bennani",
        title: "Pediatrics",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCZrj2wzEN2cMUZdjIyY2qe2095J6iB3r5PkSFCiMTMXgOc1yANIRwlPtE2ykr2l-xO5P2CimSWM92DLAKzFk4I6aA96O99V2OmU0si2EudChqQJgn6-LxXkCuu8AUDSGn1yMccnQVAyZpq2XZmp2FGBqqChCEBaD42IrilhpmwW1vV6Dk02hZHzlPHwHcQHudcuHdMiDkIRNraUJWM_2F2qv4MDWfsz4BOH_MNPRUc3kv1cLSYLI6_czla7jiY2eB-grvaMe6fA_o"
      },
      {
        text: "Security was my main concern. MedEra's infrastructure is far superior to anything else on the market today.",
        name: "Dr. Nadia Cherkaoui",
        title: "Dermatology",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDYkVu7GQ-gVJzox6bmcyKeoONFDo5JYMWaegQXaSbkdwJpF9DFfPN4LKfaDw2g-fmTSnUmSZjYTdd3cYbBtQWxXQ0zESkYUQ116uJVVKv0grIQa0bkXDDvegK1EnxQKKdduNrto-Cvy3QQZ3g55cRqGPkKNOJ-TihHMU24sMMi9sOg5aCxNDV-Tz5vBfyn8jg6oSJyAQKvU-HJah_VnjqirMSIAIH1Ei-pu6ZfjljlmnKf3GPdtroP_key2NUFzaGf56myx4T5lUU"
      }
    ],
    gettingStarted: {
      section: "GETTING STARTED",
      heading: "*Up and running in three steps.*",
      steps: [
        { title: "Rapid Onboarding", desc: "Upload your existing records and our migration team handles the data mapping in 24 hours." },
        { title: "Smart Configuration", desc: "Tailor your clinical forms, billing codes, and schedule templates to fit your specific workflow." },
        { title: "Go Live", desc: "Launch your portal. Patients start booking. You start healing more people with less effort." }
      ]
    },
    pricing: {
      starter: "Starter",
      clinic: "Clinic",
      enterprise: "Enterprise",
      mostPopular: "Most Popular",
      contactSales: "Contact Sales",
      custom: "Custom",
      features: {
        starter: ["1 Doctor Account", "Unlimited Patients", "Digital Records"],
        clinic: ["Up to 5 Staff Members", "Priority Support", "E-Prescribing Pro", "Advanced Analytics"],
        enterprise: ["Multi-location Support", "Custom Integrations", "Dedicated Success Manager"]
      }
    },
    faq: {
      heading: "*Frequently Asked Questions*",
      items: [
        { q: "Is my patient data safe and encrypted?", a: "Yes, all data is encrypted at rest and in transit using AES-256 bit encryption. We are fully HIPAA compliant and perform regular third-party security audits." },
        { q: "Can I migrate my existing data from another system?", a: "Absolutely. Our specialized migration team handles the secure transfer of your patient files, history, and records from all major clinical software platforms." },
        { q: "Do you offer training for my clinical staff?", a: "We provide comprehensive live video training for your entire team as part of the onboarding process, plus 24/7 access to our clinical knowledge base." }
      ]
    },
    cta: {
      heading: "*Your practice deserves better tools.*",
      start: "Start Free Trial",
      demo: "Book a Demo"
    },
    footer: {
      desc: "Building the future of clinical operations for the modern boutique practice.",
      product: "Product",
      company: "Company",
      legal: "Legal",
      rights: "© 2026 MedEra Clinical System. All rights reserved."
    },
    role: {
      breadcrumb: "START → CHOOSE YOUR ROLE",
      headline: "How are you joining us?",
      subtitle: "Your experience is tailored to your role.",
      patient: {
        label: "PATIENT",
        headline: "I am seeking care",
        desc: "Manage your medical records, book appointments, and message your doctor in one place.",
        perk1: "Book appointments online",
        perk2: "View your prescriptions",
        perk3: "Secure medical records",
        perk4: "Direct messaging with doctor",
        cta: "Continue as Patient"
      },
      doctor: {
        label: "HEALTHCARE PROFESSIONAL",
        headline: "I am a practitioner",
        desc: "Manage your practice, patient roster, prescriptions, and billing — designed for real workflows.",
        perk1: "Complete dashboard",
        perk2: "Patient & appointment management",
        perk3: "E-prescriptions",
        perk4: "Automated billing",
        badge: "Verification required · Usually 24–48h",
        cta: "Start Verification"
      },
      hasAccount: "Already have an account?",
      signIn: "Sign In"
    },
    patient: {
      notifications: {
        msg1: "Your appointment with Dr. Youssef Bennani has been confirmed.",
        time1: "2h ago",
        msg2: "New prescription document available.",
        time2: "5h ago",
        msg3: "Reminder: Upcoming checkup tomorrow.",
        time3: "1d ago"
      },
      findDoctor: {
        title: 'Find a Doctor',
        subtitle: 'Browse specialists and book appointments.',
        searchPlaceholder: 'Search by name, specialty, condition...',
        filterSpecialty: 'All Specialties',
        filterRating: 'Rating',
        filterAvailability: 'Availability',
        showing: 'Showing {n} doctors',
        available: 'Available',
        unavailable: 'Unavailable',
        nextSlot: 'Next: {slot}',
        reviews: '{n} reviews',
        viewBook: 'View Profile & Book',
        secretary: 'Secretary',
        languages: 'Languages',
        consultation: 'Consultation',
        chooseDateTime: 'Choose a Date & Time',
        reasonPlaceholder: 'Reason for visit (optional)',
        requestBtn: 'Request Appointment',
        confirmTitle: 'Confirm Request',
        secretaryNotice: 'The secretary will review your request and confirm or deny it. You\'ll be notified in Messages.',
        sendRequest: 'Send Request',
        toastSuccess: 'Request sent to {name}',
        toastSubtitle: 'You\'ll be notified once confirmed.',
        sort: {
          bestMatch: 'Best Match'
        }
      },
      nav: {
        dashboard: "Dashboard",
        findDoctor: "Find a Doctor",
        appointments: "Appointments",
        consultations: "Consultations",
        prescriptions: "Prescriptions",
        billing: "Billing",
        demands: "Demands",
        messages: "Messages",
        settings: "Settings"
      },
      
      dashboard: {
        stats: {
          upcoming: 'UPCOMING',
          nextDate: 'Next:',
          noAppt: 'No upcoming',
          consultations: 'CONSULTATIONS',
          thisYear: 'this year',
          activePrescriptions: 'ACTIVE PRESCRIPTIONS',
          issuedDate: 'Issued',
          noPrescriptions: 'No active prescriptions',
          pendingBills: 'PENDING BILLS',
          amountDue: 'MAD due',
          allClear: 'All clear'
        },
        nextAppt: 'NEXT APPOINTMENT',
        none: 'NONE',
        insight: 'Here\'s what\'s happening with your health today.'
      },
      greeting: {
        morning: "Good morning",
        afternoon: "Good afternoon",
        evening: "Good evening"
      },
      
      
      
      
      appt: {
        upcoming: "Upcoming",
        past: "Past",
        cancelled: "Cancelled"
      },
      cons: {
        readOnly: "Your consultation records are encrypted and read-only.",
        aiNote: "AI diagnostic support tools were used during this consultation."
      },
      pres: {
        download: "Download PDF",
        generating: "Generating PDF...",
        downloaded: "PDF downloaded successfully"
      },
      messages: {
        searchPlaceholder: 'Search messages...',
        online: 'Online',
        today: 'Today',
        enterToSend: 'Enter to send',
        typeMessage: 'Type your message...',
        selectConversation: 'Select a conversation or start a new one'
      },
      billing: {
        due: "Amount Due",
        paid: "Total Paid",
        payOnline: "Pay Online",
        payStub: "Online payment integration is currently being configured."
      },
      msg: {
        new: "New Message",
        send: "Send",
        empty: "Select a conversation",
        online: "Online",
        lastSeen: "Last seen",
        sent: "Sent",
        read: "Read",
        enterToSend: "Enter to send",
        shiftEnter: "Shift+Enter for new line",
        to: "To",
        subject: "Subject",
        today: "Today",
        yesterday: "Yesterday",
        emptySelect: "Select a conversation or start a new one",
        selectRecipient: "Select a recipient",
        noContacts: "No contacts available"
      },
      health: {
        readOnly: "This information is managed by your doctor."
      },
      label: "NEW ACCOUNT",
      headline: "Create your patient profile",
      hasAccount: "Already have an account?",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email Address",
      phone: "Phone Number",
      dob: "Date of Birth",
      gender: "Gender",
      genderOptions: {
        male: "Male",
        female: "Female",
        other: "Other"
      },
      password: "Password",
      passwordStrength: {
        weak: "Weak",
        fair: "Fair",
        good: "Good",
        strong: "Strong"
      },
      confirmPassword: "Confirm Password",
      terms: "I agree to MedEra's Terms of Service and Privacy Policy",
      cta: "Create my account",
      loading1: "Verifying your information...",
      loading2: "Account created!"
    },
    onboard: {
      step1: "Personal",
      step2: "Practice",
      step3: "Degrees",
      step4: "Review",
      stepOfStep: "Step {n} of 4",
      s1: {
        headline: "Let's start with you.",
        subtitle: "Basic information about you as a practitioner.",
        photo: "Drop your photo here",
        photosub: "or click to browse"
      },
      s2: {
        headline: "Tell us about your practice.",
        subtitle: "Help patients find you and understand your activity.",
        specialty: "Medical Specialty",
        experience: "Years of Experience",
        practiceType: "Practice Type",
        soloSoloList: "Individual practice",
        groupGroupList: "Group clinic",
        hospitalHospitalList: "Hospital based",
        clinicName: "Clinic / Hospital name",
        city: "City",
        postalCode: "Postal Code",
        address: "Practice address",
        languages: "Consultation languages",
        fees: "Consultation fees"
      },
      s3: {
        headline: "Verify your degrees.",
        subtitle: "Required for approval. All documents are encrypted.",
        securityNote: "Your documents are end-to-end encrypted and reviewed only by the MedEra verification team.",
        licenseNum: "Medical license number",
        authority: "Issuing authority",
        expiry: "Expiration date",
        doc1: "Medical license certificate",
        doc2: "ID / Passport",
        doc3: "Proof of specialization",
        optional: "OPTIONAL",
        docSub: "Max 5 MB · PDF, JPG, PNG",
        uploaded: "Ready",
        nationalId: "ID number",
        website: "LinkedIn or professional site",
        uploading: "Uploading..."
      },
      languages: {
        en: "English",
        fr: "French",
        ar: "Arabic",
        es: "Spanish",
        darija: "Darija",
        amazigh: "Amazigh"
      },
      s4: {
        headline: "Check your application.",
        subtitle: "Please confirm everything is correct before sending.",
        edit: "Edit",
        section1: "Personal information",
        section2: "Practice information",
        section3: "Documents",
        declaration: "I confirm that all information provided is accurate. I understand that false information will lead to a rejection.",
        submit: "Submit for verification",
        loading1: "Encrypting documents...",
        loading2: "Sending application...",
        loading3: "Application received!",
        years: "Years"
      }
    },
    pending: {
      status: "UNDER REVIEW",
      headline: "Your application is in good hands.",
      sub: "Our verification team is reviewing your degrees. You will receive an email at {email} within 24–48 hours with your approval status.",
      step1: "Submitted",
      step2: "Under review",
      step3: "Decision",
      card1: {
        title: "Email notification",
        desc: "You will receive an email as soon as a decision is made"
      },
      card2: {
        title: "Immediate access",
        desc: "Approved? Your dashboard opens immediately"
      },
      card3: {
        title: "Questions?",
        desc: "Contact support at support@medera.com"
      },
      back: "Back",
      support: "Contact support",
      appId: "Application ID",
      submitted: "Submitted on"
    },
    login: {
      back: "Back",
      label: "WELCOME BACK",
      headline: "Sign in to MedEra",
      noAccount: "Don't have an account?",
      startTrial: "Start free trial",
      google: "Continue with Google",
      orDivider: "or",
      email: "Email address",
      password: "Password",
      remember: "Remember me",
      forgot: "Forgot Password?",
      cta: "Sign In",
      loading: "Signing in...",
      success: "Signed in!",
      error: "Invalid email or password",
      connectionError: "Connection failed. Please try again.",
      nextGenPart1: "The next generation of Clinical",
      nextGenPart2: "Excellence.",
      unifying: "Unifying patient records, AI diagnostics, and practice operations into a single, high-fidelity experience.",
      hipaa: "HIPAA & GDPR Compliant Infrastructure",
      aiSupport: "Real-time AI Diagnostic Support",
      encrypted: "End-to-End Encrypted Data Vaults",
      testimonial: "MedEra has fundamentally transformed how we handle clinical data. The AI-driven workflows save us hours every day.",
      drSarah: "Dr. Sarah Khalil",
      cmo: "Chief Medical Officer, Alpha Clinics",
      systemOperational: "System Operational",
      security: "Security",
      privacy: "Privacy",
      contact: "Contact"
    },
    global: {
      back: "Back",
      continue: "Continue",
      submit: "Submit",
      required: "Required",
      optional: "Optional",
      uploading: "Uploading...",
      dropFile: "Drop file here",
      fileReady: "Ready",
      fileMissing: "Missing",
      remove: "Remove",
      edit: "Edit",
      error: {
        required: "This field is required",
        email: "Please enter a valid email",
        passwordMatch: "Passwords do not match",
        fileSize: "File too large (max 5MB)"
      }
    },
    admin: {
      sysOverview: "System Overview",
      realTimeIntel: "Real-time intelligence and operations.",
      totalRevenue: "Total Revenue",
      sysHealth: "System Health",
      realTime: "REAL-TIME",
      adminRole: "ADMINISTRATORS",
      doctorRole: "DOCTORS",
      staffRole: "CLINIC STAFF",
      patientRole: "PATIENTS",
      reviewProtocol: "Expedited application review protocol.",
      weeklyActivity: "Weekly Activity Trajectory",
      rollingPerformance: "7-day rolling performance of appointments & consultations.",
      exportHistoricalData: "Export historical data (CSV)",
      clusterOperational: "Cluster: Operational",
      velocityMetrics: "Velocity Metrics",
      live: "LIVE",
      systemOperation: "System",
      services: {
        djangoApi: "Django API",
        redis: "Redis",
        celery: "Celery"
      },
      nav: {
        appointments: "Appointments",
        dashboard: "Dashboard",
        users: "Users",
        applications: "Applications",
        audit: "Audit Log",
        cabinet: "Cabinet Config",
        settings: "Settings"
      },
      appointments: {
        title: "Clinical Appointments Registry",
        subtitle: "Global oversight of all medical consultations within the MedEra network.",
        searchPlaceholder: "Search registry by patient or practitioner...",
        patient: "Patient",
        doctor: "Practitioner",
        type: "Type",
        dateTime: "Temporal Context",
        status: "State",
      },
      thisWeek: "+{count} this week",
      requiresAttention: "Requires your attention",
      notifications: {
        msg1: "New doctor application from Dr. Youssef Bennani pending review.",
        msg2: "System daily backup completed successfully.",
        msg3: "3 new patient registrations in the last hour.",
        time1: "2h ago",
        time2: "5h ago",
        time3: "1d ago",
        title: "Notifications",
        new: "New",
        markAllRead: "Mark all as read"
      },
      uploading: "Uploading...",
      photoUpdated: "Photo updated!",
      pwdRules: {
        length: "At least 8 characters",
        upper: "One uppercase letter",
        num: "One number",
        spec: "One special character"
      },
      settings: {
        title: "Settings",
        subtitle: "Manage your account and preferences.",
        photo: {
          header: "Profile Photo",
          drop: "Drop your photo here",
          browse: "or click to browse",
          remove: "× Remove photo",
          cta: "Update Photo",
          error: "File must be less than 2MB"
        },
        info: {
          header: "Personal Information",
          firstName: "First Name",
          lastName: "Last Name",
          email: "Email Address",
          phone: "Phone Number",
          emailNote: "Your email is used for login. Changing it will require you to log in again.",
          cta: "Save Changes",
          success: "Profile updated successfully",
          errorEmail: "This email is already in use"
        },
        password: {
          header: "Change Password",
          securityNote: "For your security, enter your current password before setting a new one.",
          current: "Current Password",
          new: "New Password",
          confirm: "Confirm New Password",
          cta: "Update Password",
          success: "Password updated. Please log in again.",
          errorCurrent: "Current password is incorrect",
          weak: "Weak",
          fair: "Fair",
          good: "Good",
          strong: "Strong"
        },
        preview: {
          userId: "User ID",
          header: "Preview",
          created: "Account Created",
          lastLogin: "Last Login"
        }
      },

      logout: "Logout",
      rbacDistribution: "Role Distribution",
      pendingQueueSummary: "Pending Review Queue",
      awaiting: "awaiting review",
      users: "Users",
      regUsers: "Registered Users",
      awaitingReview: "Awaiting Review",
      activePatients: "Active Patients",
      secAuditLog: "Security Audit Log",
      sysEvents: "System Events",
      recentActivity: "Recent Activity",
      roleDist: "Role Distribution",
      activeRoles: "Active Roles",
      recentApps: "Recent Applications",
      regWait: "Registered",
      viewAllAudit: "View All Audit Logs",
      viewAllApps: "View All Applications",

      submitted: "Submitted:",
      noRecentActivity: "No recent system activity",
      viewFullAudit: "View Full Audit",
      operational: "Operational",
      totActiveAcc: "Total Active Accounts",
      penDocAppr: "Pending Doctor Approvals",
      patWithAcc: "Patients with Access",
      allSysNom: "All Systems Nominal",
      settingsNav: "Settings",

      manageAcc: "Manage all accounts registered on the platform",
      addUserInfo: "Add New User",
      searchUsers: "Search users by name or email...",
      allRoles: "All Roles",
      active: "Active",
      inactive: "Inactive",
      suspended: "Suspended",
      invited: "Invited",
      userCaps: "USER",
      roleCaps: "ROLE",
      statusCaps: "STATUS",
      joinedCaps: "JOINED ON",
      actionsCaps: "ACTIONS",
      viewDetails: "View Details",
      userProfile: "User Profile",
      deactivate: "Deactivate Account",
      activate: "Activate Account",
      forceReset: "Force Password Reset",
      close: "Close",
      personalInfo: "Personal Information",
      contactInfo: "Contact",
      accountStats: "Account Statistics",
      lastLogin: "Last Login",
      createdAt: "Created on",
      joined: "Joined",
      userMgmt: "User Management",
      userMgmtDesc: "Manage accounts, roles and access control.",
      createUser: "Create User",
      createNewAccount: "Create New Account",
      assignRole: "Assign Role",
      docApps: "Doctor Applications",
      reviewVerify: "Review and verify practitioner credentials",
      monitorSys: "Monitor system activity and security events",
      cabinetConfig: "Cabinet Configuration",
      manageClinic: "Manage rooms, schedules, and global settings",
      dashboard: {
        systemOverview: "System Overview",
        realTimeMetrics: "Real-time infrastructure health and activity metrics.",
        totalUsers: "Total Users",
        doctors: "Doctors",
        patients: "Patients",
        secretaries: "Secretaries",
        systemHealth: "System Status",
        operational: "Operational",
        activeUsers24h: "Active Users (24h)",
        apiLatency: "API Latency",
        roleDistribution: "Role Distribution",
        roleDistributionDesc: "User account distribution across system roles.",
        auditTrailFeed: "Recent System Activity",
        auditTrailDesc: "Latest security events and system actions.",
        viewAllLogs: "View All Logs"
      },
      applications: {
        queue: "Doctor verification queue",
        pendingReview: "pending review",
        allCaughtUp: "All caught up!",
        noPending: "No pending applications.",
        specialty: "Specialty",
        licenseNum: "License #",
        submitted: "Submitted",
        reviewedBy: "Reviewed by",
        medicalLicense: "Medical License",
        nationalId: "National ID",
        specializationProof: "Proof of Specialization",
        confirmApproval: "Confirm Approval",
        confirmRejection: "Confirm Rejection",
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
        approveTitle: "Approve {name}?",
        rejectTitle: "Reject this application?",
        actionWill: "This action will:",
        createAccount: "Create a MEDECIN account for {email}",
        genTempPass: "Generate a secure temporary password",
        sendCredentials: "Send login credentials via email (async)",
        securityNote: "Security Note",
        securityDesc: "Password is cryptographically generated and sent via Celery worker. It will not be shown to you.",
        provideReason: "Provide a reason that will be recorded in the audit log...",
        irreversible: "This action is recorded and irreversible."
      },
      cancel: "Cancel",
      audit: {
        registry: "Audit Registry",
        immutableRecord: "Immutable record of all system events — {count} entries.",
        searchEvents: "Search events...",
        allActions: "All Actions",
        allModels: "All Models",
        rangeAny: "Range: Any",
        loading: "Loading audit registry...",
        noEntries: "No entries found matching filters.",
        exportCSV: "Export CSV",
        timestamp: "TIMESTAMP",
        action: "ACTION",
        model: "MODEL",
        objectId: "OBJECT ID",
        ipAddress: "IP ADDRESS",
        details: "DETAILS"
      },
      cabinet: {
        settings: "Cabinet Settings",
        configClinic: "Configure your clinic's operational parameters",
        allSaved: "All changes saved",
        unsaved: "Unsaved changes",
        saveChanges: "Save Changes",
        rooms: "Rooms",
        specialties: "Specialties",
        insurance: "Insurance",
        schedule: "Schedule",
        general: "General",
        addRoom: "Add Room",
        addSpecialty: "Add Specialty",
        defaultDuration: "Default Consultation Duration",
        workingHours: "Working Hours",
        clinicName: "Clinic Name",
        address: "Address",
        phone: "Phone",
        email: "Email",
        logo: "Logo",
        uploadLogo: "Click to upload or drag logo here",
        logoFormat: "SVG, PNG, JPG (max. 2MB)",
        insuranceSettings: "Insurance settings view",
        capacity: "CAPACITY",
        doctors: "DOCTORS"
      },
      table: {
        name: "Name",
        specialty: "Specialty",
        date: "Date",
        status: "Status",
        actions: "Actions",
        approve: "Approve",
        reject: "Reject",
        view: "View"
      }
    },
    doctor: {
      settings: {
        subtitle: "Manage your profile, credentials, and preferences.",
        specialty: "Specialty",
        licenseId: "License Number (ID)",
        readOnlyNote: "Your email is used to log in. Changing it will require you to sign in again. Contact your administrator to update your specialty or license.",
        team: {
          title: "Team & Secretaries",
          subtitle: "Invite assistants or secretaries to manage your schedule and appointments.",
          active: "Active",
          remove: "Remove",
          invite: "Invite",
          inviteSent: "Team invitation sent successfully!"
        }
      }
    }
  }
};

// Automatically create a French copy
(translations as any).fr = JSON.parse(JSON.stringify(translations.en));
const fr = (translations as any).fr;

// Patch French translations for Admin
if (fr.admin) {
  fr.admin = {
    sysOverview: "Aperçu du système",
    nav: {
      appointments: "Rendez-vous",
      dashboard: "Tableau de bord",
      users: "Utilisateurs",
      applications: "Candidatures",
      audit: "Journal d'audit",
      cabinet: "Config Cabinet",
      settings: "Paramètres"
    },
    appointments: {
      title: "Registre des Rendez-vous Cliniques",
      subtitle: "Supervision globale de toutes les consultations médicales au sein du réseau MedEra.",
      searchPlaceholder: "Rechercher dans le registre par patient ou praticien...",
      patient: "Patient",
      doctor: "Praticien",
      type: "Type",
      dateTime: "Contexte Temporel",
      status: "État",
    },
    thisWeek: "+{count} cette semaine",
    requiresAttention: "Nécessite votre attention",
    notifications: {
      msg1: "Nouvelle candidature de médecin du Dr Youssef Bennani en attente d'examen.",
      msg2: "Sauvegarde du système terminée avec succès.",
      msg3: "3 nouveaux enregistrements de patients au cours de la dernière heure.",
      time1: "il y a 2h",
      time2: "il y a 5h",
      time3: "il y a 1j",
      title: "Notifications",
      new: "Nouveau",
      markAllRead: "Tout marquer comme lu"
    },
    uploading: "Téléchargement...",
    photoUpdated: "Photo mise à jour !",
    pwdRules: {
      length: "Au moins 8 caractères",
      upper: "Une lettre majuscule",
      num: "Un chiffre",
      spec: "Un caractère spécial"
    },
    settings: {
      title: "Paramètres",
      subtitle: "Gérez votre compte et vos préférences.",
      photo: {
        header: "Photo de profil",
        drop: "Déposez votre photo ici",
        browse: "ou cliquer pour parcourir",
        remove: "× Supprimer la photo",
        cta: "Mettre à jour la photo",
        error: "Le fichier doit faire moins de 2 Mo"
      },
      info: {
        header: "Informations personnelles",
        firstName: "Prénom",
        lastName: "Nom",
        email: "Adresse e-mail",
        phone: "Numéro de téléphone",
        emailNote: "Votre e-mail est utilisé pour la connexion. Le modifier vous demandera de vous reconnecter.",
        cta: "Enregistrer les modifications",
        success: "Profil mis à jour avec succès",
        errorEmail: "Cet e-mail est déjà utilisé"
      },
      password: {
        header: "Changer le mot de passe",
        securityNote: "Pour votre sécurité, entrez votre mot de passe actuel avant d'en définir un nouveau.",
        current: "Mot de passe actuel",
        new: "Nouveau mot de passe",
        confirm: "Confirmer le nouveau mot de passe",
        cta: "Mettre à jour le mot de passe",
        success: "Mot de passe mis à jour. Veuillez vous reconnecter.",
        errorCurrent: "Le mot de passe actuel est incorrect",
        weak: "Faible",
        fair: "Moyen",
        good: "Bon",
        strong: "Fort"
      },
      preview: {
        userId: "ID Utilisateur",
        header: "Aperçu",
        created: "Compte créé",
        lastLogin: "Dernière connexion"
      },
      dashboard: {
        roleDistribution: "Répartition des rôles",
        auditTrailFeed: "Journal d'audit",
      }
    },
    logout: "Se déconnecter",
    rbacDistribution: "Répartition des rôles",
    pendingQueueSummary: "File d'attente des examens",
    awaiting: "en attente",
    realTimeIntel: "Intelligence clinique en temps réel",
    users: "Utilisateurs",
    regUsers: "Utilisateurs inscrits",
    awaitingReview: "En attente d'examen",
    activePatients: "Patients actifs",
    sysHealth: "Statut du Système",
    secAuditLog: "Journal d'audit de sécurité",
    sysEvents: "Événements système",
    recentActivity: "Activité Récente",
    roleDist: "Répartition des rôles",
    activeRoles: "Rôles actifs",
    recentApps: "Candidatures Récentes",
    regWait: "Inscrit",
    viewAllAudit: "Voir tous les journaux d'audit",
    viewAllApps: "Voir toutes les candidatures",
    applications: {
      noPending: "Aucune candidature en attente"
    },
    submitted: "Soumis:",
    noRecentActivity: "Aucune activité système récente",
    viewFullAudit: "Voir l'audit complet",
    operational: "Opérationnel",
    totActiveAcc: "Total des comptes actifs",
    penDocAppr: "Approbations médecins en attente",
    patWithAcc: "Patients avec accès",
    allSysNom: "Tous les systèmes nominaux",
    settingsNav: "Paramètres",
    userMgmt: "Gestion des utilisateurs",
    manageAcc: "Gérer tous les comptes inscrits sur la plateforme",
    addUserInfo: "Ajouter un nouvel utilisateur",
    searchUsers: "Rechercher des utilisateurs par nom ou e-mail...",

    adminRole: "Administrateur",
    doctorRole: "Médecin",
    patientRole: "Patient",
    staffRole: "Personnel",
    active: "Actif",
    inactive: "Inactif",
    suspended: "Suspendu",
    invited: "Invité",
    userCaps: "UTILISATEUR",
    roleCaps: "RÔLE",
    statusCaps: "STATUT",
    joinedCaps: "REJOINT LE",
    actionsCaps: "ACTIONS",
    viewDetails: "Voir les détails",
    userProfile: "Profil Utilisateur",
    deactivate: "Désactiver le compte",
    activate: "Activer le compte",
    forceReset: "Forcer la réinitialisation du mot de passe",
    close: "Fermer",
    personalInfo: "Informations personnelles",
    contactInfo: "Contact",
    accountStats: "Statistiques du compte",
    lastLogin: "Dernière connexion",
    createdAt: "Créé le",
    joined: "Rejoint le",
    assignRole: "Attribuer un rôle",
    docApps: "Candidatures Médecins",
    reviewVerify: "Examiner et vérifier les diplômes des praticiens",
    monitorSys: "Surveiller l'activité du système et les événements de sécurité",
    cabinetConfig: "Configuration du Cabinet",
    manageClinic: "Gérer les salles, les horaires et les paramètres globaux",
    dashboard: {
      systemOverview: "Aperçu du système",
      realTimeMetrics: "Santé de l'infrastructure et métriques d'activité en temps réel.",
      totalUsers: "Utilisateurs totaux",
      doctors: "Médecins",
      patients: "Patients",
      secretaries: "Secrétaires",
      systemHealth: "Statut du système",
      operational: "Opérationnel",
      activeUsers24h: "Utilisateurs actifs (24h)",
      apiLatency: "Latence API",
      roleDistribution: "Répartition des rôles",
      roleDistributionDesc: "Répartition des comptes utilisateurs par rôle système.",
      auditTrailFeed: "Activité Récente du Système",
      auditTrailDesc: "Derniers événements de sécurité et actions système.",
      viewAllLogs: "Voir tous les journaux"
    },
    cancel: "Annuler",
    audit: {
      registry: "Registre d'Audit",
      immutableRecord: "Enregistrement immuable de tous les événements système — {count} entrées.",
      searchEvents: "Rechercher des événements...",
      allActions: "Toutes les actions",
      allModels: "Tous les modèles",
      rangeAny: "Période : Toute",
      loading: "Chargement du registre d'audit...",
      noEntries: "Aucune entrée trouvée correspondant aux filtres.",
      exportCSV: "Exporter CSV",
      timestamp: "HORODATAGE",
      action: "ACTION",
      model: "MODÈLE",
      objectId: "ID OBJET",
      ipAddress: "ADRESSE IP",
      details: "DÉTAILS"
    },
    cabinet: {
      settings: "Paramètres du Cabinet",
      configClinic: "Configurer les paramètres opérationnels de votre clinique",
      allSaved: "Toutes les modifications enregistrées",
      unsaved: "Modifications non enregistrées",
      saveChanges: "Enregistrer les modifications",
      rooms: "Salles",
      specialties: "Spécialités",
      insurance: "Assurance",
      schedule: "Horaires",
      general: "Général",
      addRoom: "Ajouter une salle",
      addSpecialty: "Ajouter une spécialité",
      defaultDuration: "Durée par défaut des consultations",
      workingHours: "Heures de travail",
      clinicName: "Nom de la clinique",
      address: "Adresse",
      phone: "Téléphone",
      email: "Email",
      logo: "Logo",
      uploadLogo: "Cliquez pour télécharger ou faites glisser le logo ici",
      logoFormat: "SVG, PNG, JPG (max. 2 Mo)",
      insuranceSettings: "Vue des paramètres d'assurance",
      capacity: "CAPACITÉ",
      doctors: "MÉDECINS"
    },
    table: {
      name: "Nom",
      specialty: "Spécialité",
      date: "Date",
      status: "Statut",
      actions: "Actions",
      approve: "Approuver",
      reject: "Rejeter",
      view: "Voir"
    }
  };
}

// Patch French translations for Dashboards
if (fr.doctor) {
  fr.doctor = {
    ...fr.doctor,
    settings: {
      subtitle: "Gérez votre profil, vos identifiants et vos préférences.",
      specialty: "Spécialité",
      licenseId: "Numéro de licence (ID)",
      readOnlyNote: "Votre e-mail est utilisé pour la connexion. Le modifier vous demandera de vous reconnecter. Contactez votre administrateur pour mettre à jour votre spécialité ou votre licence.",
      team: {
        title: "Équipe & Secrétaires",
        subtitle: "Invitez des assistants ou des secrétaires pour gérer votre planning et vos rendez-vous.",
        active: "Actif",
        remove: "Supprimer",
        invite: "Inviter",
        inviteSent: "Invitation d'équipe envoyée avec succès !"
      }
    }
  };
}

// Patch French translations for Doctor Portal
if (fr.doctorPortal) {
  fr.doctorPortal.dashboard = {
    ...fr.doctorPortal.dashboard,
    insight: 'Voici un aperçu de votre cabinet. Vous avez {value} rendez-vous programmés pour aujourd\'hui.',
    todayApt: 'Rendez-vous du jour',
    activePat: 'Patients Actifs',
    pendingCons: 'Consultations en attente',
    unpaidInv: 'Factures impayées',
    next: 'Suivant:',
    thisMonth: 'ce mois-ci',
    actionNeeded: 'Action requise',
    allClear: 'Tout est en ordre',
    reqAttention: 'Nécessite une attention',
    allCaughtUp: 'À jour',
    recentPat: 'Patients récents',
    upcomingApt: 'Rendez-vous à venir',
    viewAll: 'Voir tout',
    quickActions: 'Actions rapides',
    newPrescription: 'Nouvelle ordonnance',
    startConsultation: 'Démarrer consultation',
    patientRecords: 'Dossiers patients',
    online: 'en ligne',
    appointments: 'Rendez-vous',
    consultations: 'Consultations',
    monthlyCons: 'Consultations ce mois-ci',
    prescsIssued: 'Ordonnances émises',
    avgTime: 'Durée moy. visite',
    attendance: 'Taux de présence',
    performance: 'Performance'
  };
  fr.doctorPortal.portal = "Portail Praticien";
  fr.doctorPortal.nav = {
    dashboard: "Tableau de bord",
    patients: "Patients",
    appointments: "Rendez-vous",
    consultations: "Consultations",
    prescriptions: "Ordonnances",
    billing: "Facturation",
    messages: "Messages",
    settings: "Paramètres"
  };
  fr.doctorPortal.billing = {
    title: "Facturation",
    subtitle: "Générez et gérez les factures des patients.",
    totalPending: "Total en attente",
    totalCollected: "Total encaissé",
    invoicesIssued: "Factures émises",
    allInvoices: "Toutes les factures",
    pending: "En attente",
    paid: "Payée",
    generateInvoice: "Générer une facture",
    noInvoicesFound: "Aucune facture trouvée",
    adjustFilters: "Essayez d'ajuster vos filtres ou de créer une nouvelle facture.",
    markPaid: "Marquer comme payée",
    cancel: "Annuler",
    viewDetails: "Voir les détails",
    showing: "Affichage de",
    to: "à",
    of: "sur",
    invoices: "factures"
  };
  fr.doctorPortal.messages = {
    title: "Messages",
    subtitle: "Communiquez avec vos patients et le personnel.",
    newMessage: "Nouveau Message",
    empty: "Aucun message",
    emptyConversation: "Aucun message dans cette conversation pour le moment",
    loading: "Chargement des messages...",
    typeMessage: "Tapez un message...",
    selectConversation: "Sélectionnez une conversation ou commencez-en une nouvelle",
    recipient: "Destinataire",
    selectRecipient: "Sélectionnez un destinataire...",
    secretaries: "Secrétaires",
    secretaryRole: "Secrétaire",
    patients: "Patients",
    subject: "Sujet",
    subjectPlaceholder: "Demande médicale, suivi, etc.",
    messageBody: "Message",
    sendMessage: "Envoyer le Message"
  };
  fr.doctorPortal.patients = {
    table: {
      patient: "Patient",
      ageGender: "Âge & Sexe",
      bloodGroup: "Groupe Sanguin",
      insurance: "Assurance",
      lastVisit: "Dernière Visite",
      actions: "Actions"
    }
  };
  fr.doctorPortal.greeting = "Bonjour, Dr.";
  fr.doctorPortal.agenda = {
    title: "Emploi du temps",
    sub: "Votre emploi du temps de la semaine",
    add: "Ajouter"
  };
}

// Patch French translations for Dashboards
if (fr.secretary) {
  if (!fr.secretary.dashboard) fr.secretary.dashboard = {};
  fr.secretary.dashboard.greeting = 'Bonjour, {name}';
  fr.secretary.dashboard.overview = 'Voici un aperçu de la clinique aujourd\'hui.';
  fr.secretary.dashboard.todayAptTitle = 'Rendez-vous du jour';
  fr.secretary.dashboard.todayAptSub = '12 confirmés';
  fr.secretary.dashboard.pendingConfTitle = 'En attente de confirmation';
  fr.secretary.dashboard.pendingConfSub = 'Nécessite votre attention';
  fr.secretary.dashboard.waitingRoomTitle = 'En salle d\'attente';
  fr.secretary.dashboard.waitingRoomSub = 'Compte en direct';
  fr.secretary.dashboard.pendingInvTitle = 'Factures en attente';
  fr.secretary.dashboard.pendingInvSub = 'Nécessite traitement';
  fr.secretary.portal = 'PORTAIL SECRÉTAIRE';
}

if (fr.doctorPortal && fr.doctorPortal.billing) {
  fr.doctorPortal.billing.title = "Facturation";
  fr.doctorPortal.billing.subtitle = "Générez et gérez les factures des patients.";
  fr.doctorPortal.billing.totalPending = "Total en attente";
  fr.doctorPortal.billing.totalCollected = "Total encaissé";
  fr.doctorPortal.billing.invoicesIssued = "Factures émises";
  fr.doctorPortal.billing.allInvoices = "Toutes les factures";
  fr.doctorPortal.billing.pending = "En attente";
  fr.doctorPortal.billing.paid = "Payée";
  fr.doctorPortal.billing.generateInvoice = "Générer la facture";
  fr.doctorPortal.billing.noInvoicesFound = "Aucune facture trouvée";
  fr.doctorPortal.billing.adjustFilters = "Essayez de modifier vos filtres ou créez une nouvelle facture.";
  fr.doctorPortal.billing.markPaid = "Marquer comme payée";
  fr.doctorPortal.billing.cancel = "Annuler";
  fr.doctorPortal.billing.viewDetails = "Voir les détails";
  fr.doctorPortal.billing.showing = "Affichage de";
  fr.doctorPortal.billing.to = "à";
  fr.doctorPortal.billing.of = "sur";
  fr.doctorPortal.billing.invoices = "factures";
}

// Patch French translations for Doctor Portal Messages
if (fr.doctorPortal && fr.doctorPortal.messages) {
  fr.doctorPortal.messages.title = "Messages";
  fr.doctorPortal.messages.subtitle = "Communiquez avec vos patients et le personnel.";
  fr.doctorPortal.messages.newMessage = "Nouveau Message";
  fr.doctorPortal.messages.empty = "Aucun message";
  fr.doctorPortal.messages.emptyConversation = "Aucun message dans cette conversation pour le moment";
  fr.doctorPortal.messages.loading = "Chargement des messages...";
  fr.doctorPortal.messages.typeMessage = "Tapez un message...";
  fr.doctorPortal.messages.selectConversation = "Sélectionnez une conversation ou commencez-en une nouvelle";
  fr.doctorPortal.messages.recipient = "Destinataire";
  fr.doctorPortal.messages.selectRecipient = "Sélectionnez un destinataire...";
  fr.doctorPortal.messages.secretaries = "Secrétaires";
  fr.doctorPortal.messages.secretaryRole = "Secrétaire";
  fr.doctorPortal.messages.patients = "Patients";
  fr.doctorPortal.messages.subject = "Sujet";
  fr.doctorPortal.messages.subjectPlaceholder = "Demande médicale, suivi, etc.";
  fr.doctorPortal.messages.messageBody = "Message";
  fr.doctorPortal.messages.sendMessage = "Envoyer le Message";
}

if (fr.patient && fr.patient.dashboard) {
  fr.patient.dashboard.nextAppt = 'PROCHAIN RENDEZ-VOUS';
  fr.patient.dashboard.none = 'AUCUN';
  fr.patient.dashboard.insight = 'Voici un aperçu de votre santé aujourd\'hui.';
}

if (fr.doctorPortal && fr.doctorPortal.dashboard) {
  fr.doctorPortal.dashboard = {
    ...fr.doctorPortal.dashboard,
    insight: 'Voici votre cabinet en un coup d\'œil. Vous avez {value} rendez-vous prévus aujourd\'hui.',
    todayApt: 'Rendez-vous du jour',
    activePat: 'Patients actifs',
    pendingCons: 'Consultations en attente',
    unpaidInv: 'Factures impayées',
    next: 'Prochain :',
    thisMonth: 'ce mois-ci',
    actionNeeded: 'Action requise',
    allClear: 'Tout est réglé',
    reqAttention: 'Nécessite attention',
    allCaughtUp: 'À jour',
    recentPat: 'Patients récents',
    upcomingApt: 'Prochains rendez-vous',
    viewAll: 'Voir tout',
    quickActions: 'Actions rapides',
    newPrescription: 'Nouvelle ordonnance',
    startConsultation: 'Démarrer consultation',
    patientRecords: 'Dossiers patients',
    online: 'en ligne',
    appointments: 'Rendez-vous',
    consultations: 'Consultations',
    monthlyCons: 'Consultations ce mois-ci',
    prescsIssued: 'Ordonnances délivrées',
    avgTime: 'Durée moyenne de la visite',
    attendance: 'Taux de présence',
    performance: 'Performance'
  };
}

if (fr.secretary && fr.secretary.nav) {
  fr.secretary.nav = {
    dashboard: 'Tableau de bord',
    patients: 'Patients',
    appointments: 'Rendez-vous',
    demands: 'Demandes',
    waitingRoom: "Salle d'attente",
    billing: 'Facturation',
    messages: 'Messages',
    settings: 'Paramètres'
  };
}

if (fr.secretary && fr.secretary.demands) {
  fr.secretary.demands = {
    title: 'Demandes',
    subtitle: 'Gérez les demandes patient en attente de votre approbation.',
    tabs: {
      all: 'Toutes',
      pending: 'En Attente',
      accepted: 'Acceptées',
      rejected: 'Refusées'
    },
    pendingBadge: '{n} en attente',
    refreshTitle: 'Actualiser',
    loading: 'Chargement des demandes...',
    errorMsg: 'Erreur lors du chargement des demandes.',
    retryBtn: 'Réessayer',
    nothingHere: 'Rien ici !',
    emptyPending: 'Aucune demande en attente.',
    emptyAccepted: 'Aucune demande acceptée.',
    emptyRejected: 'Aucune demande refusée.',
    emptyAll: 'Aucune demande trouvée.',
    status: {
      pending: 'EN ATTENTE',
      accepted: 'ACCEPTÉE',
      rejected: 'REFUSÉE',
      processed: 'Traitée'
    },
    source: {
      whatsapp: 'WhatsApp',
      portal: 'Portail Patient'
    },
    consultType: {
      video: 'Vidéo',
      inPerson: 'Présentiel'
    },
    appointmentType: {
      FIRST: 'Première consultation',
      FOLLOW_UP: 'Suivi',
      EMERGENCY: 'Urgence'
    },
    reasonLabel: 'Raison',
    defaultMotive: 'Demande de rendez-vous',
    acceptBtn: 'Accepter',
    rejectBtn: 'Refuser',
    rejectModal: {
      title: 'Refuser la demande',
      forPatient: 'Pour {name}',
      reasonLabel: 'Raison du refus',
      reasonRequired: '*',
      reasonPlaceholder: 'Ex: Créneau non disponible, veuillez choisir un autre horaire...',
      whatsappNote: 'Cette raison sera envoyée au patient via WhatsApp.',
      cancelBtn: 'Annuler',
      confirmBtn: 'Confirmer le refus'
    },
    quickReasons: [
      'Créneau non disponible',
      'Dossier incomplet',
      'Urgence prioritaire',
      'Hors spécialité'
    ],
    pagination: {
      summary: '{count} demande{plural} · Page {page} / {total}'
    },
    toast: {
      acceptSuccess: 'Rendez-vous confirmé et message WhatsApp envoyé au patient.',
      acceptError: 'Erreur lors de la confirmation.',
      rejectSuccess: 'Demande refusée. Le patient a été notifié via WhatsApp.',
      rejectError: 'Erreur lors du refus.'
    }
  };
}

if (fr.doctorPortal && fr.doctorPortal.nav) {
  fr.doctorPortal.nav = {
    dashboard: 'Tableau de bord',
    patients: 'Patients',
    appointments: 'Rendez-vous',
    consultations: 'Consultations',
    prescriptions: 'Ordonnances',
    billing: 'Facturation',
    messages: 'Messages',
    settings: 'Paramètres'
  };
}

if (fr.doctorPortal) {
  fr.doctorPortal.patients = {
    table: {
      patient: 'Patient',
      ageGender: 'Âge & Genre',
      bloodGroup: 'Groupe Sanguin',
      insurance: 'Assurance',
      lastVisit: 'Dernière Visite',
      actions: 'Actions'
    }
  };
}

if (fr.patient && fr.patient.nav) {
  fr.patient.nav = {
    dashboard: 'Tableau de bord',
    findDoctor: 'Trouver un Médecin',
    demands: 'Demandes',
    appointments: 'Rendez-vous',
    consultations: 'Consultations',
    prescriptions: 'Ordonnances',
    billing: 'Facturation',
    messages: 'Messages',
    settings: 'Paramètres'
  };
}

if (fr.admin && fr.admin.nav) {
  fr.admin.nav = {
    dashboard: 'Tableau de bord',
    doctors: 'Médecins',
    verification: 'Vérification',
    settings: 'Paramètres',
    logout: 'Déconnexion'
  };
}

if (fr.status) {
   fr.status = {
     confirmed: 'Confirmé',
     pending: 'En attente',
     cancelled: 'Annulé',
     completed: 'Terminé',
     live: 'En direct',
     draft: 'Brouillon',
     active: 'Actif',
     expired: 'Expiré',
     paid: 'Payé',
     unpaid: 'Impayé',
     inProgress: 'En cours',
     planned: 'Planifié',
     requested: 'Demandé',
     rejected: 'Refusé'
   };
}

if (fr.role) {
  fr.role = {
    patient: 'Patient',
    doctor: 'Médecin',
    secretary: 'Secrétaire',
    admin: 'Administrateur',
    frontDesk: 'Réception'
  };
}

if (fr.common) {
  fr.common = {
    ...fr.common,
    search: 'Rechercher...',
    save: 'Enregistrer',
    cancel: 'Annuler',
    edit: 'Modifier',
    delete: 'Supprimer',
    view: 'Voir',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    previous: 'Précédent',
    loading: 'Chargement...',
    success: 'Succès',
    error: 'Erreur',
    yes: 'Oui',
    no: 'Non',
    details: 'Détails',
    export: 'Exporter',
    actions: 'Actions'
  };
}

if (fr.global) {
  fr.global = {
    back: "Retour",
    continue: "Continuer",
    submit: "Soumettre",
    required: "Requis",
    optional: "Optionnel",
    uploading: "Téléchargement...",
    dropFile: "Déposez le fichier ici",
    fileReady: "Prêt",
    fileMissing: "Manquant",
    remove: "Supprimer",
    edit: "Modifier",
    error: {
      required: "Ce champ est obligatoire",
      email: "Veuillez entrer un e-mail valide",
      passwordMatch: "Les mots de passe ne correspondent pas",
      fileSize: "Fichier trop volumineux (max 5 Mo)"
    }
  };
}

if (fr.breadcrumb) {
  fr.breadcrumb = {
    home: 'Accueil',
    patients: 'Patients',
    appointments: 'Rendez-vous',
    billing: 'Facturation',
    messages: 'Messages',
    settings: 'Paramètres',
    profile: 'Profil',
    new: 'Nouveau',
    edit: 'Modifier'
  };
}

if (fr.hero) {
  fr.hero = {
    title1: 'Gérez votre cabinet.',
    title2: '*Pas vos formalités.*',
    desc: 'MedEra offre aux médecins et petites cliniques un espace unique pour gérer les patients, les rendez-vous et les ordonnances sans effort.',
    startTrial: 'Essai Gratuit',
    howItWorks: 'Voir comment ça marche',
    success: 'Succès',
    patientSync: 'Dossier patient synchronisé dans 4 départements.',
    hipaa: 'Conforme HIPAA'
  };
}

if (fr.problem) {
  fr.problem = {
    before: 'AVANT',
    after: 'APRÈS',
    title1: 'Données Fragmentées',
    desc1: 'Les systèmes cloisonnés rendent impossible l\'obtention d\'une vue complète de l\'historique du patient.',
    title2: 'Épuisement Administratif',
    desc2: 'Les cliniciens passent plus de 40% de leur journée sur la saisie de données plutôt que sur les soins aux patients.',
    title3: 'Complexité de Conformité',
    desc3: 'Naviguer manuellement dans les réglementations changeantes crée des risques juridiques.',
    sol1: 'Console Clinique Unifiée',
    solDesc1: 'Une seule source de vérité pour chaque point de contact du patient.',
    sol2: 'Automatisation par l\'IA',
    solDesc2: 'Les modèles intelligents et la dictée vocale réduisent le temps de documentation jusqu\'à 60%.',
    sol3: 'Garde-fous Intégrés',
    solDesc3: 'Vérifications de conformité automatisées et rapports prêts pour l\'audit.'
  };
}

if (fr.features) {
  fr.features = {
    heading: 'Tout ce dont votre cabinet a besoin',
    list: [
      {
        title: 'Planification Intelligente',
        desc: 'Prise de rendez-vous automatisée avec rappels SMS pour réduire les absences de 40%.'
      },
      {
        title: 'Portails Patients',
        desc: 'Accès sécurisé pour les patients afin de consulter leurs dossiers, résultats et payer leurs factures instantanément.'
      },
      {
        title: 'E-Prescription',
        desc: 'Envoyez des ordonnances directement aux pharmacies avec des alertes d\'interaction médicamenteuse.'
      },
      {
        title: 'Analytique du Cabinet',
        desc: 'Tableaux de bord visuels pour suivre les revenus, le volume de patients et les résultats cliniques.'
      },
      {
        title: 'Sécurité d\'Entreprise',
        desc: 'Chiffrement de bout en bout et stockage conforme aux normes pour chaque point de donnée.'
      },
      {
        title: 'Facturation et Réclamations',
        desc: 'Soumission automatisée des réclamations d\'assurance et facturation numérique directe aux patients.'
      }
    ]
  };
}

if (fr.stats) {
  fr.stats = {
    patients: 'Patients',
    appointments: 'Rendez-vous',
    uptime: 'Disponibilité',
    clinics: 'Cliniques'
  };
}

if (fr.common) {
  fr.common = {
    ...fr.common,
    logout: "Déconnexion"
  };
}

if (fr.pricing) {
  fr.pricing = {
    starter: 'Démarrage',
    clinic: 'Clinique',
    enterprise: 'Entreprise',
    mostPopular: 'Plus Populaire',
    contactSales: 'Contacter les ventes',
    custom: 'Sur mesure',
    features: {
      starter: [ '1 Compte Médecin', 'Patients Illimités', 'Dossiers Numériques' ],
      clinic: [
        'Jusqu\'à 5 Membres du Personnel',
        'Support Prioritaire',
        'E-Prescription Pro',
        'Analytique Avancée'
      ],
      enterprise: [
        'Support Multi-sites',
        'Intégrations Sur Mesure',
        'Gestionnaire de Succès Dédié'
      ]
    }
  };
}

if (fr.cta) {
  fr.cta = {
    heading: '*Votre cabinet mérite de meilleurs outils.*',
    start: 'Essai Gratuit',
    demo: 'Réserver une Démo'
  };
}

if (fr.footer) {
  fr.footer = {
    desc: 'Construire l\'avenir des opérations cliniques pour les cabinets modernes.',
    product: 'Produit',
    company: 'Entreprise',
    legal: 'Légal',
    rights: '© 2026 MedEra Clinical System. Tous droits réservés.'
  };
}

if (fr.nav) {
  fr.nav = {
    solutions: 'Solutions',
    features: 'Fonctionnalités',
    pricing: 'Tarifs',
    security: 'Sécurité',
    login: 'Connexion',
    getStarted: 'Commencer'
  };
}

if (fr.faq) {
  fr.faq = {
    heading: '*Foire Aux Questions*',
    items: [
      { q: 'Mes données patients sont-elles sécurisées et chiffrées ?', a: 'Oui, toutes les données sont chiffrées au repos et en transit en utilisant un chiffrement AES-256 bits. Nous sommes entièrement conformes à la norme HIPAA et effectuons régulièrement des audits de sécurité par des tiers.' },
      { q: 'Puis-je migrer mes données existantes depuis un autre système ?', a: 'Absolument. Notre équipe de migration spécialisée gère le transfert sécurisé de vos dossiers patients, historiques et enregistrements à partir de tous les principaux logiciels cliniques.' },
      { q: 'Proposez-vous une formation pour mon personnel clinique ?', a: 'Nous proposons une formation vidéo en direct complète pour toute votre équipe dans le cadre du processus d\'intégration, ainsi qu\'un accès 24h/24 et 7j/7 à notre base de connaissances cliniques.' }
    ]
  };
}

if (fr.gettingStarted) {
  fr.gettingStarted = {
    section: 'POUR COMMENCER',
    heading: '*Opérationnel en trois étapes.*',
    steps: [
      { title: 'Intégration Rapide', desc: 'Téléchargez vos dossiers existants et notre équipe de migration s\'occupe du mappage des données en 24 heures.' },
      { title: 'Configuration Intelligente', desc: 'Adaptez vos formulaires cliniques, codes de facturation et modèles de planification pour correspondre à votre flux de travail spécifique.' },
      { title: 'Lancement', desc: 'Portail opérationnel. Les patients commencent à prendre rendez-vous. Moins d\'effort, plus de soins.' }
    ]
  };
}

if (fr.login) {
  fr.login = {
    back: "Retour",
    label: "BON RETOUR",
    headline: "Connectez-vous à MedEra",
    noAccount: "Vous n'avez pas de compte ?",
    startTrial: "Essai gratuit",
    google: "Continuer avec Google",
    orDivider: "ou",
    email: "Adresse e-mail",
    password: "Mot de passe",
    remember: "Se souvenir de moi",
    forgot: "Mot de passe oublié ?",
    cta: "Se connecter",
    loading: "Connexion en cours...",
    success: "Connecté !",
    error: "E-mail ou mot de passe invalide",
    connectionError: "Échec de la connexion. Veuillez réessayer.",
    nextGenPart1: "La prochaine génération de l'",
    nextGenPart2: "Excellence Clinique.",
    unifying: "Unifier les dossiers patients, les diagnostics IA et les opérations cliniques en une seule expérience haute fidélité.",
    hipaa: "Infrastructure conforme HIPAA et RGPD",
    aiSupport: "Support diagnostic IA en temps réel",
    encrypted: "Coffres-forts de données chiffrés de bout en bout",
    testimonial: "MedEra a fondamentalement transformé la façon dont nous gérons les données cliniques. Les flux de travail pilotés par l'IA nous font gagner des heures chaque jour.",
    drSarah: "Dr Sarah Khalil",
    cmo: "Directrice Médicale, Alpha Clinics",
    systemOperational: "Système Opérationnel",
    security: "Sécurité",
    privacy: "Confidentialité",
    contact: "Contact"
  };
}

if (fr.role) {
  fr.role = {
    ...fr.role,
    breadcrumb: "DÉPART → CHOISISSEZ VOTRE RÔLE",
    headline: "Comment nous rejoignez-vous ?",
    subtitle: "Votre expérience est adaptée à votre rôle.",
    patient: {
      ...fr.role.patient,
      label: "PATIENT",
      headline: "Je recherche des soins",
      desc: "Gérez vos dossiers médicaux, prenez des rendez-vous et envoyez des messages à votre médecin en un seul endroit.",
      perk1: "Prendre rendez-vous en ligne",
      perk2: "Voir vos ordonnances",
      perk3: "Dossiers médicaux sécurisés",
      perk4: "Messagerie directe avec le médecin",
      cta: "Continuer en tant que Patient"
    },
    doctor: {
      ...fr.role.doctor,
      label: "PROFESSIONNEL DE SANTÉ",
      headline: "Je suis un praticien",
      desc: "Gérez votre cabinet, votre liste de patients, vos ordonnances et votre facturation — conçu pour des flux de travail réels.",
      perk1: "Tableau de bord complet",
      perk2: "Gestion des patients et rendez-vous",
      perk3: "E-ordonnances",
      perk4: "Facturation automatisée",
      badge: "Vérification requise · Généralement 24–48h",
      cta: "Démarrer la vérification"
    },
    hasAccount: "Vous avez déjà un compte ?",
    signIn: "Se connecter"
  };
}

if (fr.patient) {
  fr.patient = {
    ...fr.patient,
    appt: { upcoming: "À venir", past: "Passés", cancelled: "Annulés" },
    nav: { ...fr.patient.nav, demands: "Demandes" },
    cons: { readOnly: "Vos dossiers de consultation sont chiffrés et en lecture seule.", aiNote: "Des outils d'aide au diagnostic par IA ont été utilisés lors de cette consultation." },
    pres: { download: "Télécharger PDF", generating: "Génération du PDF...", downloaded: "PDF téléchargé avec succès" },
    messages: { searchPlaceholder: 'Rechercher messages...', online: 'En ligne', today: 'Aujourd\'hui', enterToSend: 'Entrée pour envoyer', typeMessage: 'Tapez votre message...', selectConversation: 'Sélectionnez une conversation ou commencez-en une nouvelle' },
    billing: { due: "Montant dû", paid: "Total payé", payOnline: "Payer en ligne", payStub: "L'intégration du paiement en ligne est en cours de configuration." },
    msg: { new: "Nouveau message", send: "Envoyer", empty: "Sélectionnez une conversation", online: "En ligne", lastSeen: "Vu il y a", sent: "Envoyé", read: "Lu", enterToSend: "Entrée pour envoyer", shiftEnter: "Maj+Entrée pour nouvelle ligne", to: "À", subject: "Objet", today: "Aujourd\'hui", yesterday: "Hier", emptySelect: "Sélectionnez une conversation ou commencez-en une nouvelle", selectRecipient: "Sélectionner un destinataire", noContacts: "Aucun contact disponible" },
    health: { readOnly: "Ces informations sont gérées par votre médecin." },
    label: "NOUVEAU COMPTE",
    headline: "Créez votre profil patient",
    hasAccount: "Vous avez déjà un compte ?",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Adresse e-mail",
    phone: "Numéro de téléphone",
    dob: "Date de naissance",
    gender: "Genre",
    genderOptions: { male: "Homme", female: "Femme", other: "Préférer ne pas préciser" },
    password: "Mot de passe",
    passwordStrength: { weak: "Faible", fair: "Moyen", good: "Bon", strong: "Fort" },
    confirmPassword: "Confirmer le mot de passe",
    terms: "J'accepte les Conditions d'utilisation et la Politique de confidentialité de MedEra",
    cta: "Créer mon compte",
    loading1: "Vérification de vos informations...",
    loading2: "Compte créé !"
  };
}

if (fr.onboard) {
  fr.onboard = {
    ...fr.onboard,
    step1: "Personnel",
    step2: "Cabinet",
    step3: "Diplômes",
    step4: "Révision",
    stepOfStep: "Étape {n} sur 4",
    s1: { headline: "Commençons par vous.", subtitle: "Informations de base sur vous en tant que praticien.", photo: "Déposez votre photo ici", photosub: "ou cliquer pour parcourir" },
    s2: { 
      headline: "Parlez-nous de votre cabinet.", 
      subtitle: "Aidez les patients à vous trouver et comprendre votre activité.", 
      specialty: "Spécialité médicale", 
      experience: "Années d'expérience", 
      practiceType: "Type de cabinet", 
      soloSoloList: "Cabinet individuel", 
      groupGroupList: "Clinique de groupe", 
      hospitalHospitalList: "Basé en hôpital", 
      clinicName: "Nom de la clinique / l'hôpital", 
      city: "Ville",
      postalCode: "Code Postal",
      address: "Adresse du cabinet", 
      languages: "Langues de consultation", 
      fees: "Honoraires de consultation" 
    },
    s3: { 
      headline: "Vérifiez vos diplômes.", 
      subtitle: "Requis pour l'approbation. Tous les documents sont chiffrés.", 
      securityNote: "Vos documents sont chiffrés de bout en bout et examinés uniquement par l'équipe de vérification MedEra.", 
      licenseNum: "Numéro de licence médicale", 
      authority: "Autorité délivrance", 
      expiry: "Date d'expiration", 
      doc1: "Certificat de licence médicale", 
      doc2: "CIN / Passeport", 
      doc3: "Justificatif de spécialisation", 
      optional: "OPTIONNEL", 
      docSub: "Max 5 Mo · PDF, JPG, PNG", 
      uploaded: "Prêt", 
      nationalId: "Numéro CIN", 
      website: "LinkedIn ou site professionnel",
      uploading: "Téléchargement..."
    },
    languages: {
      en: "Anglais",
      fr: "Français",
      ar: "Arabe",
      es: "Espagnol",
      darija: "Darija",
      amazigh: "Amazigh"
    },
    s4: {
      headline: "Vérifiez votre candidature.",
      subtitle: "Veuillez confirmer que tout est correct avant d'envoyer.",
      edit: "Modifier",
      section1: "Informations personnelles",
      section2: "Informations du cabinet",
      section3: "Documents",
      declaration: "Je confirme que toutes les informations fournies sont exactes. Je comprends que les fausses informations entraîneront un rejet.",
      submit: "Soumettre pour vérification",
      loading1: "Chiffrement des documents...",
      loading2: "Envoi de la candidature...",
      loading3: "Candidature reçue !",
      years: "Ans"
    }
  };
}

if (fr.pending) {
  fr.pending = {
    ...fr.pending,
    status: "EN COURS D'EXAMEN",
    headline: "Votre candidature est entre de bonnes mains.",
    sub: "Notre équipe de vérification examine vos diplômes. Vous recevrez un e-mail à {email} dans 24–48 heures avec votre statut d'approbation.",
    step1: "Soumis",
    step2: "En cours d'examen",
    step3: "Décision",
    card1: { title: "Notification par e-mail", desc: "Vous recevrez un e-mail dès qu'une décision sera prise" },
    card2: { title: "Accès immédiat", desc: "Approuvé ? Votre tableau de bord s'ouvre immédiatement" },
    card3: { title: "Des questions ?", desc: "Contactez le support à support@medera.com" },
    back: "Retour",
    support: "Contacter le support",
    appId: "ID de candidature",
    submitted: "Soumis le"
  };
}

if (fr.testimonials && Array.isArray(fr.testimonials)) {
  fr.testimonials = [
    {
      ...fr.testimonials[0],
      text: "MedEra a tout changé pour mon cabinet individuel. J\'ai enfin l\'impression d\'avoir un gestionnaire de cabinet, sans les frais généraux.",
      image: fr.testimonials[0]?.image
    },
    {
      ...fr.testimonials[1],
      text: "La précision du moteur de diagnostic IA est sans précédent. C\'est devenu un outil indispensable pour ma pratique quotidienne.",
      image: fr.testimonials[1]?.image
    },
    {
      ...fr.testimonials[2],
      text: "La sécurité était ma principale préoccupation. L\'infrastructure de MedEra est bien supérieure à tout ce qui existe sur le marché aujourd\'hui.",
      image: fr.testimonials[2]?.image
    }
  ];
}

// Patch French translations for Admin
fr.admin = {
  ...fr.admin,
  sysOverview: "Aperçu du système",
  realTimeIntel: "Intelligence et opérations en temps réel.",
  regUsers: "Utilisateurs Inscrits",
  thisWeek: "+{count} cette semaine",
  awaitingReview: "En attente d'examen",
  requiresAttention: "Nécessite une attention",
  totalRevenue: "Revenu Total",
  sysHealth: "Santé du Système",
  rbacDistribution: "Distribution RBAC",
  totActiveAcc: "Total des comptes actifs par rôle.",
  realTime: "TEMPS RÉEL",
  adminRole: "ADMINISTRATEURS",
  doctorRole: "MÉDECINS",
  staffRole: "PERSONNEL",
  patientRole: "PATIENTS",
  noRecentActivity: "Aucune activité récente.",
  viewFullAudit: "Voir l'audit complet",
  pendingQueueSummary: "Résumé de la file d'attente",
  reviewProtocol: "Protocole d'examen accéléré.",
  viewAllApps: "Candidatures à examiner",
  weeklyActivity: "Trajectoire d'activité",
  rollingPerformance: "Performance sur 7 jours des rendez-vous et consultations.",
  exportHistoricalData: "Exporter les données historiques (CSV)",
  clusterOperational: "Cluster : Opérationnel",
  velocityMetrics: "Indicateurs de Vélocité",
  live: "EN DIRECT",
  systemOperation: "Système",
  services: {
    djangoApi: "API Django",
    redis: "Redis",
    celery: "Celery"
  },
  dashboard: {
    ...(fr.admin?.dashboard || {}),
    auditTrailFeed: "Activité Récente du Système"
  },
  table: {
    ...(fr.admin?.table || {}),
    approve: "APPROUVER",
    reject: "REJETER"
  },
  applications: {
    ...(fr.admin?.applications || {}),
    noPending: "Aucune candidature en attente"
  }
};
