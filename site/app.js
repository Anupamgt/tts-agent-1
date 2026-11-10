(function () {
  var cfg = window.DESKIE || {};
  var signIn = document.getElementById("sign-in");
  if (signIn && cfg.consoleUrl) signIn.href = cfg.consoleUrl;
  var tel = document.getElementById("call-btn");
  var number = document.getElementById("call-number");
  if (cfg.callTel) {
    if (tel) tel.href = "tel:" + cfg.callTel;
    if (number) number.href = "tel:" + cfg.callTel;
  }
  if (cfg.callDisplay && number) number.textContent = cfg.callDisplay;

  var form = document.getElementById("enquiry");
  var note = document.getElementById("form-note");
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var send = form.querySelector('button[type="submit"]');
    if (send.disabled) return;
    var data = Object.fromEntries(new FormData(form).entries());
    send.disabled = true;
    form.setAttribute("aria-busy", "true");
    note.textContent = "Sending…";
    fetch(cfg.enquiryUrl || "/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.detail || "Could not send");
        form.reset();
        note.textContent = "Received. We’ll reach out on that mobile.";
      });
    }).catch(function (err) {
      note.textContent = err.message || "Could not send. Call the desk number instead.";
    }).then(function () {
      send.disabled = false;
      form.removeAttribute("aria-busy");
    });
  });
})();
