/* ============================================================
   conversation.js
   The rule engine. Drives the conversation state machine using
   CSCAi for intent detection and empathetic phrasing, CSCFlows
   for question content, CSCUi for rendering, and CSCStorage for
   persistence.

   This is the file you'd touch to swap the rule-based CSCAi
   layer for a live Groq-powered assistant later — UI, storage,
   and flow data stay exactly as they are.
   ============================================================ */

const CSCConversation = (() => {

  const CONFIG = {
    phoneDisplay: "+91 7709 619 249",
    phoneHref: "tel:+917709619249",
    whatsappHref: "https://wa.me/917709619249",
    email: "support@cybersolution.in",
    contactFormUrl: "index.html#contact",
    caseFormUrl: "services.html#case-inquiry",
    web3formsEndpoint: "https://api.web3forms.com/submit",
    web3formsAccessKey: "9fc78025-01ab-4d17-b46f-b85331e09973"
  };

  const MAX_CLARIFY_ATTEMPTS = 2;

  let session = null;

  /* ---------- Boot ---------- */

  function init() {
    const mounted = CSCUi.mount("cscChatWidgetRoot");
    if (!mounted) return;

    const savedTheme = CSCStorage.getTheme() ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    CSCUi.setTheme(savedTheme);

    mounted.themeToggle.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-csc-theme") === "dark" ? "light" : "dark";
      CSCUi.setTheme(next);
      CSCStorage.saveTheme(next);
    });

    mounted.bubble.addEventListener("click", () => {
      CSCUi.isOpen() ? CSCUi.close() : CSCUi.open();
    });
    mounted.closeBtn.addEventListener("click", CSCUi.close);
    mounted.resetBtn.addEventListener("click", () => {
      if (confirm("Start a new conversation? This clears the current one.")) restart();
    });

    session = CSCStorage.getSession() || CSCStorage.createEmptySession();

    if (session.messages.length) {
      replayTranscript();
    } else {
      greet();
    }
  }

  function persist() {
    CSCStorage.saveSession(session);
  }

  function restart() {
    CSCStorage.clearSession();
    session = CSCStorage.createEmptySession();
    CSCUi.clearMessages();
    CSCUi.setProgress(0, 0);
    greet();
  }

  /* ---------- Replay a saved transcript on reopen ---------- */

  function replayTranscript() {
    session.messages.forEach(m => {
      if (m.from === "bot") CSCUi.addHtmlBlock(m.text);
      else CSCUi.addUserMessage(m.text);
    });
    if (session.completed) {
      CSCUi.setProgress(0, 0);
      showEscalation(session.lastSummary || null);
    } else {
      resumeCurrentStep();
    }
  }

  function record(from, text, extra) {
    session.messages.push(Object.assign({ from, text, timestamp: Date.now() }, extra || {}));
    persist();
  }

  function say(text) {
    record("bot", text);
    return CSCUi.addBotMessageWithTyping(text);
  }

  /* ---------- Opening screen: just a greeting, then the box is ready ---------- */

  function greet() {
    session.stage = "listening";
    persist();

    say("Hi 👋 I'm the CSC Digital Case Officer.")
      .then(() => say("I'm here to help. Tell me what happened."))
      .then(() => CSCUi.showTextInput(handleFreeformMessage, "Tell me what happened…"));
  }

  function resumeCurrentStep() {
    if (session.stage === "flow") {
      renderStepControls();
    } else if (session.stage === "categoryFallback") {
      renderCategoryFallback();
    } else {
      // 'listening' or 'clarifying' — the box is simply ready for more.
      CSCUi.showTextInput(handleFreeformMessage, "Tell me what happened…");
    }
  }

  /* ---------- Turning the user's own words into a flow (no category menu) ---------- */

  function handleFreeformMessage(text) {
    CSCUi.addUserMessage(text);
    record("user", text);

    const result = CSCAi.classifyIntent(text);

    if (result.incidentType) {
      session.clarifyAttempts = 0;
      beginFlow(result.incidentType);
      return;
    }

    session.clarifyAttempts = (session.clarifyAttempts || 0) + 1;
    persist();

    if (session.clarifyAttempts >= MAX_CLARIFY_ATTEMPTS) {
      offerCategoryFallback();
      return;
    }

    session.stage = "clarifying";
    persist();
    say("I'm sorry this happened.")
      .then(() => say("Could you tell me a little more about what happened?"))
      .then(() => CSCUi.showTextInput(handleFreeformMessage, "Type here…"));
  }

  /* Last resort only — used if free text genuinely isn't giving us
     enough to route the case after a couple of tries. */
  function offerCategoryFallback() {
    session.stage = "categoryFallback";
    persist();
    say("No problem, let's narrow this down together.")
      .then(() => say("Which of these is closest to what you're dealing with?"))
      .then(renderCategoryFallback);
  }

  function renderCategoryFallback() {
    const options = CSCFlows.CATEGORIES.map(c => c.label);
    CSCUi.renderQuickReplies(options, (choice) => {
      CSCUi.addUserMessage(choice);
      record("user", choice);
      const category = CSCFlows.CATEGORIES.find(c => c.label === choice);
      beginFlow(category.defaultIncident);
    });
    CSCUi.showTextInput(handleFreeformMessage, "Or just tell me a bit more…");
  }

  /* ---------- Running a flow ---------- */

  function beginFlow(incidentType) {
    session.stage = "flow";
    session.flowKey = incidentType;
    session.stepIndex = 0;
    session.caseData = {};
    persist();

    say(CSCAi.empathyOpener())
      .then(() => say("I'll ask a few quick questions, one at a time, so this reaches the right person."))
      .then(() => askStep());
  }

  function askStep() {
    const steps = CSCFlows.getFlow(session.flowKey);
    const step = steps[session.stepIndex];

    if (!step) {
      finishFlow();
      return;
    }

    CSCUi.setProgress(session.stepIndex, steps.length);
    say(step.bot).then(() => renderStepControls());
  }

  function renderStepControls() {
    const steps = CSCFlows.getFlow(session.flowKey);
    const step = steps[session.stepIndex];
    if (!step) return;

    if (step.type === "quick-reply") {
      CSCUi.renderQuickReplies(step.options, (choice) => handleAnswer(step, choice));
    } else if (step.optional) {
      CSCUi.renderQuickReplies(["Skip this"], () => handleAnswer(step, "—"));
    } else {
      CSCUi.clearQuickReplies();
    }

    // The text box stays visible and live for every step — the person
    // can always type their own answer instead of tapping a chip.
    CSCUi.showTextInput(
      (value) => handleAnswer(step, value),
      step.type === "quick-reply" ? "Or type your own answer…" : "Type your answer…"
    );
  }

  function handleAnswer(step, value) {
    CSCUi.clearQuickReplies();
    CSCUi.addUserMessage(value);
    record("user", value);
    session.caseData[step.field] = value;
    session.stepIndex += 1;
    persist();

    const ackText = typeof step.ack === "function" ? step.ack(value) : null;
    if (ackText) {
      say(ackText).then(() => askStep());
    } else {
      askStep();
    }
  }

  /* ---------- Wrap-up ---------- */

  function finishFlow() {
    session.stage = "summary";
    session.completed = true;
    CSCUi.setProgress(0, 0);
    persist();

    const summary = CSCSummary.buildSummary(session.flowKey, session.caseData);
    session.lastSummary = summary;
    persist();

    say("Thank you, you've given me everything I need. Here's a summary of what I've recorded:")
      .then(() => {
        const html = CSCSummary.renderSummaryCard(summary);
        CSCUi.addHtmlBlock(html);
        record("bot", html, { isSummary: true });
      })
      .then(() => say("You're doing the right thing by seeking help. How would you like to proceed?"))
      .then(() => showEscalation(summary));
  }

  function showEscalation(summary) {
    const options = ["WhatsApp an expert", "Call now", "Book a consultation", "Submit this case"];

    CSCUi.renderQuickReplies(options, (choice) => {
      CSCUi.addUserMessage(choice);
      record("user", choice);
      CSCUi.clearQuickReplies();

      if (choice.includes("WhatsApp")) {
        window.open(CONFIG.whatsappHref, "_blank", "noopener");
        say("Opening WhatsApp, our team will pick up the conversation from there.");
      } else if (choice.includes("Call")) {
        window.location.href = CONFIG.phoneHref;
      } else if (choice.includes("Book")) {
        say(`You can book a consultation here: ${CONFIG.contactFormUrl}`).then(() => {
          window.location.href = CONFIG.contactFormUrl;
        });
      } else if (choice.includes("Submit")) {
        submitCase(summary);
      }
      CSCUi.showTextInput(handleFreeformMessage, "Or ask me anything else…");
    });

    // Even after the flow completes, free text still works — e.g. the
    // person wants to describe a second, separate incident.
    CSCUi.showTextInput(handleFreeformMessage, "Or ask me anything else…");
  }

  async function submitCase(summary) {
    if (!summary) {
      say("There's no case summary to submit yet, let's go through a few questions first.").then(() =>
        CSCUi.showTextInput(handleFreeformMessage, "Tell me what happened…")
      );
      return;
    }
    say("Sending your case to our team now…");

    try {
      const body = new FormData();
      body.append("access_key", CONFIG.web3formsAccessKey);
      body.append("subject", `New case intake: ${summary.incidentType}`);
      body.append("from_name", "CSC Website Intake Assistant");
      body.append("message", CSCSummary.renderSummaryText(summary));

      const response = await fetch(CONFIG.web3formsEndpoint, { method: "POST", body });
      const result = await response.json();

      if (result.success) {
        say("✅ Your case has been submitted. Our team will follow up within one business day sooner if it's urgent.");
      } else {
        say("I couldn't submit that automatically. Please use the case form or call us directly so nothing is lost.");
      }
    } catch (err) {
      say("❌ Something went wrong sending that. Please call us directly, or use the case form on the Services page.");
    }
  }

  return { init, restart };

})();