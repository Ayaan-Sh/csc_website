/* ============================================================
   chatbot.js
   Entry point. Include this last, after storage.js, animation.js,
   aiLayer.js, flows.js, summary.js, ui.js and conversation.js.

   Usage in a page:
     <div id="cscChatWidgetRoot"></div>
     <script src="chatbot/storage.js"></script>
     <script src="chatbot/animation.js"></script>
     <script src="chatbot/aiLayer.js"></script>
     <script src="chatbot/flows.js"></script>
     <script src="chatbot/summary.js"></script>
     <script src="chatbot/ui.js"></script>
     <script src="chatbot/conversation.js"></script>
     <script src="chatbot/chatbot.js"></script>
   ============================================================ */

(function () {

  function boot() {
    if (!document.getElementById("cscChatWidgetRoot")) {
      // Auto-create the mount point if the page hasn't added one.
      const root = document.createElement("div");
      root.id = "cscChatWidgetRoot";
      document.body.appendChild(root);
    }
    CSCConversation.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();