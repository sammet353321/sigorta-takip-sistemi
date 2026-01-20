const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveUrl: (url) => ipcRenderer.invoke('save-url', url),
  clearUrl: () => ipcRenderer.invoke('clear-url')
});

window.addEventListener('DOMContentLoaded', () => {
    // Check if we are in the setup page or the main app
    // We can check if the specific UI elements of setup.html exist
    const isSetupPage = document.getElementById('saveBtn') !== null;

    if (!isSetupPage) {
        injectFloatingControls();
    }
});

function injectFloatingControls() {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '20px';
    container.style.zIndex = '999999';
    container.style.display = 'flex';
    container.style.gap = '10px';
    container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    container.style.padding = '8px';
    container.style.borderRadius = '30px';
    container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    container.style.backdropFilter = 'blur(5px)';

    // Refresh Button
    const refreshBtn = document.createElement('button');
    refreshBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/>
            <path d="M3 3v9h9"/>
        </svg>
    `;
    styleButton(refreshBtn, '#2563eb');
    refreshBtn.title = "Sayfayı Yenile";
    refreshBtn.onclick = () => window.location.reload();

    // Settings (Gear) Button
    const settingsBtn = document.createElement('button');
    settingsBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    `;
    styleButton(settingsBtn, '#4b5563');
    settingsBtn.title = "Bağlantı Ayarları";
    settingsBtn.onclick = () => {
        if(confirm('Bağlantı adresini değiştirmek istediğinize emin misiniz?')) {
            ipcRenderer.invoke('clear-url');
        }
    };

    container.appendChild(refreshBtn);
    container.appendChild(settingsBtn);
    document.body.appendChild(container);
}

function styleButton(btn, color) {
    btn.style.background = 'none';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.padding = '5px';
    btn.style.borderRadius = '50%';
    btn.style.color = color;
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.transition = 'background-color 0.2s';
    
    btn.onmouseover = () => {
        btn.style.backgroundColor = 'rgba(0,0,0,0.05)';
    };
    btn.onmouseout = () => {
        btn.style.backgroundColor = 'transparent';
    };
}
