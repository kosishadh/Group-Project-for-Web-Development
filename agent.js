(function (){
    const history = [];

    const widget = document.createElement('div');
    widget.id="agent-widget";
    widget.innerHTML=`
    <button id="agent-toggle" aria-label="Open weather & AQI assistant">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
      </svg>
      <span id="agent-badge" style="display:none">1</span>
    </button>
 
    <div id="agent-panel" class="agent-closed">
      <div id="agent-header">
        <div id="agent-header-left">
          <div id="agent-dot"></div>
          <span id="agent-title">Weather &amp; AQI Assistant</span>
        </div>
        <button id="agent-close" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
 
      <div id="agent-messages">
        <div class="agent-msg agent-msg--bot">
          <div class="agent-bubble">
            Hi! Ask me about <strong>weather</strong> or <strong>air quality</strong> anywhere. Try:<br><br>
            <span class="agent-chip" onclick="agentSend('What is the weather in Kathmandu?')"> Kathmandu weather</span>
            <span class="agent-chip" onclick="agentSend('What is the AQI in Kathmandu?')"> Kathmandu AQI</span>
            <span class="agent-chip" onclick="agentSend('Full weather and AQI report for Delhi')">🇮🇳 Delhi full report</span>
          </div>
        </div>
      </div>
 
      <div id="agent-input-row">
        <input id="agent-input" type="text" placeholder="Ask about weather or AQI…" autocomplete="off" maxlength="200"/>
        <button id="agent-send" aria-label="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
   `;
    
   document.body.appendChild(widget);

   const panel = document.getElementById('agent-panel');
   const toggle= document.getElementById('agent-toggle');
   const closeBtn = document.getElementById('agent-close');
   const sendBtn = document.getElementById('agent-send');
   const input = document.getElementById('agent-input');
   const msgs = document.getElementById('agent-messages');
    const badge = document.getElementById('agent-badge');

    let isOpen = false;
    
    function openPanel(){
        isOpen = true;
        panel.classList.remove('agent-closed');
        panel.classList.add('agent-open');
        badge.style.display = 'none';
        setTimeout(() => 
            input.focus(),300);
        }
    

    function closePanel(){
        isOpen = false;
        panel.classList.remove('agent-open');
        panel.classList.add('agent-closed');
    }

    toggle.addEventListener('click', () => (isOpen ? closePanel() : openPanel()));
    closeBtn.addEventListener('click', closePanel);


    function addMessage(text,role){
        const div= document.createElement('div');
        div.className = `agent-msg agent-msg--${role==="user"?"user":"bot"}`;

        const bubble = document.createElement('div');
        bubble.className = 'agent-bubble';
        bubble.innerHTML = text
          .replace(/&/g, "&amp;").replace(/</g, "&lt;")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\n/g, "<br>");

        div.appendChild(bubble);
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;

        if (role !== "user" && !isOpen) {
            badge.style.display = 'flex';
        }
    }

    function showTyping(){
        const div=document.createElement('div');
        div.className='agent-msg agent-msg--bot';
        div.id='agent-typing';
        div.innerHTML=`<div class="agent-bubble agent-typing"><span></span><span></span><span></span></div>`;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function hideTyping(){
        const t = document.getElementById("agent-typing");
        if (t) t.remove();
    }

    async function agentSend(text){
        const msg = (text || input.value).trim();
        if (!msg) return;

        input.value = '';
        sendBtn.disabled = true;
        input.disabled = true;

        addMessage(msg,"user");
        history.push({role:"user",content:msg});
        showTyping();

        try{
            const response = await fetch ("/api/chat",{
                method:"POST",
                headers: {"Content-Type":"application/json"},
                body:JSON.stringify({messages:history}),
            });

            hideTyping();

            let reply;
 
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        reply = "Sorry, something went wrong: " + (err.error || "unknown error");
      } else {
        const data = await response.json();
        reply = data.reply || "No response received. Please try again.";
      }
      
            addMessage(reply,"bot");
            history.push({role:"assistant",content:reply});
        }

        catch (err) {
            hideTyping();
            addMessage("Network error - please check your connections and try again.", "bot")
            console.error("Agent error:", err);
        }

        finally{
            sendBtn.disabled = false;
            input.disabled = false;
            input.focus();
        }
    }

    window.agentSend=agentSend;

    sendBtn.addEventListener("click",()=>agentSend());
    input.addEventListener("keydown",(e) => {
        if (e.key=== "Enter" && !e.shiftKey){e.preventDefault();
            agentSend();
        }
    });
})();