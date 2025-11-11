// public/panel.js
(() => {
  const BASE = '/api';
  const locInput    = document.getElementById('loc-id');
  const btnGenerate = document.getElementById('btn-generate');
  const output      = document.getElementById('evo-output');
  let locationId;

  // Beta status check
  locInput.addEventListener('blur', async () => {
    const lid = locInput.value.trim();
    if (!lid) {
      removeBetaMessage();
      return;
    }

    try {
      const res = await fetch(`/api/check-beta?locationId=${encodeURIComponent(lid)}`);
      const data = await res.json();

      if (data.is_beta) {
        showBetaMessage();
      } else {
        removeBetaMessage();
      }
    } catch (err) {
      removeBetaMessage();
    }
  });

  function showBetaMessage() {
    removeBetaMessage(); // Remove if exists
    const betaMsg = document.createElement('p');
    betaMsg.id = 'beta-message';
    betaMsg.style.cssText = 'color: #4CAF50; font-weight: bold; margin-top: 8px;';
    betaMsg.textContent = 'Bienvenido al programa beta, rey. 😉';
    locInput.parentNode.insertBefore(betaMsg, locInput.nextSibling);
  }

  function removeBetaMessage() {
    const existing = document.getElementById('beta-message');
    if (existing) existing.remove();
  }

  // Llamada genérica al backend
  async function call(path) {
    if (!locationId) throw new Error('Location ID no definido');
    const url = `${BASE}/${path}?locationId=${encodeURIComponent(locationId)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.blob();
  }

  // Al hacer clic en “Revisar conexión”
  btnGenerate.addEventListener('click', async () => {
    locationId = locInput.value.trim();
    if (!locationId) {
      alert('Introduce tu Location ID');
      return;
    }
    output.innerHTML = 'Comprobando estado…';

    try {
      const result = await call('wa-qr');
      output.innerHTML = '';

      if (result instanceof Blob) {
        // Mostrar QR
        const imgURL = URL.createObjectURL(result);
        const img = new Image();
        img.src = imgURL;
        img.alt = 'QR WhatsApp';
        output.appendChild(img);
        setTimeout(() => URL.revokeObjectURL(imgURL), 60000);
      } else {
        // Mostrar mensaje JSON
        const msg = result.message || JSON.stringify(result);
        const p = document.createElement('p');
        p.textContent = msg;
        output.appendChild(p);
      }
    } catch (err) {
      output.innerHTML = '';
      const p = document.createElement('p');
      p.style.color = 'red';
      p.textContent = err.message;
      output.appendChild(p);
    }
  });
})();
