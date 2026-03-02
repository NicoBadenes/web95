/**
 * @file src/os/auth/login.js
 * @description Gestor de inicio de sesion de Web95
 */

import { mk } from '../../utils/dom.js';

class LoginManager {
    constructor() {
        this.container = document.getElementById('login-box-container');
        this.screen = document.getElementById('login-screen');
        this.dbKey = 'web95_user_account';
        this.onSuccess = null;
    }

    prompt() {
        return new Promise((resolve) => {
            this.onSuccess = resolve;
            this.screen.classList.remove('hidden');

            const savedAccount = this.getSavedAccount();

            if (savedAccount) {
                this.renderLoginScreen(savedAccount.username);
            } else {
                this.renderCreateAccountScreen();
            }
        });
    }

    getSavedAccount() {
        const data = localStorage.getItem(this.dbKey);
        return data ? JSON.parse(data) : null;
    }

    saveAccount(username, password) {
        localStorage.setItem(this.dbKey, JSON.stringify({ username, password }));
    }

    renderLoginScreen(savedUsername) {
        this.container.innerHTML = '';

        // Titlebar
        const btnHelp = mk('div', { className: 'w95log-tb-btn' }); btnHelp.classList.add('help');
        const btnClose = mk('div', { className: 'w95log-tb-btn' }); btnClose.classList.add('close');
        
        const tbText = mk('span', { className: 'w95log-titlebar-text', text: 'Welcome to Web95' });
        const tbBtns = mk('div', { className: 'w95log-titlebar-buttons', children: [btnHelp, btnClose] });
        const titlebar = mk('div', { className: 'w95log-titlebar', children: [tbText, tbBtns] });

        // Icon
        const icon = mk('div', { className: 'w95log-icon', text: '🔑' });
        const iconArea = mk('div', { className: 'w95log-icon-area', children: [icon] });

        // Center
        const msg = mk('div', { className: 'w95log-message', text: 'Type a username and password to log on to Web95.' });
        
        const tipMsg = mk('div', { 
            className: 'w95log-message', 
            style: 'margin-top: 8px; margin-bottom: 12px;', 
            text: 'Tip: If you forgot your password, click Shut Down to erase all user data and simulate a hard system reset.' 
        });
        
        const labelUser = mk('label'); 
        labelUser.innerHTML = '<u>U</u>ser name:';
        const inputUser = mk('input', { className: 'w95log-input', attributes: { type: 'text', value: savedUsername || '' } });
        const rowUser = mk('div', { className: 'w95log-form-row', children: [labelUser, inputUser] });

        const labelPass = mk('label'); 
        labelPass.innerHTML = '<u>P</u>assword:';
        const inputPass = mk('input', { className: 'w95log-input', attributes: { type: 'password' } });
        const rowPass = mk('div', { className: 'w95log-form-row', children: [labelPass, inputPass] });

        const formArea = mk('div', { className: 'w95log-form-area', children: [rowUser, rowPass] });

        const centerCol = mk('div', { className: 'w95log-center-col', children: [msg, tipMsg, formArea] });

        // Buttons
        const innerOk = mk('div', { className: 'inner', text: 'OK' });
        const btnOk = mk('button', { className: 'w95log-btn', children: [innerOk] }); 
        btnOk.classList.add('default');
        btnOk.style.width = '95px'; 

        const btnCancel = mk('button', { className: 'w95log-btn', text: '🛑 Shut Down' });
        btnCancel.style.width = '95px'; 
        btnCancel.style.whiteSpace = 'nowrap'; 
        btnCancel.style.gap = '4px'; 

        const btnCol = mk('div', { className: 'w95log-btn-column', children: [btnOk, btnCancel] });
      
        // Layout & Window
        const mainLayout = mk('div', { className: 'w95log-main-layout', children: [iconArea, centerCol, btnCol] });
        const win = mk('div', { className: 'w95log-window', children: [titlebar, mainLayout] });
        win.classList.add('create-mode');

        // Events
        btnOk.addEventListener('click', () => {
            const account = this.getSavedAccount();
            if (inputUser.value === account.username && inputPass.value === account.password) {
                this.success();
            } else {
                alert('Invalid password. Please try again.');
                inputPass.value = '';
                inputPass.focus();
            }
        });

        btnCancel.addEventListener('click', () => {
            const confirmReset = confirm("CRITICAL WARNING: This will simulate a Hard Power Off.\nAll user data, passwords, and saved files will be permanently deleted.\n\nAre you sure you want to continue?");
            if (confirmReset) {
                localStorage.clear(); 
                window.location.reload(); 
            }
        });

        inputPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnOk.click(); });

        this.container.appendChild(win);
        setTimeout(() => inputPass.focus(), 10);
    }

    renderCreateAccountScreen() {
        this.container.innerHTML = '';

        // Titlebar
        const btnHelp = mk('div', { className: 'w95log-tb-btn' }); btnHelp.classList.add('help');
        const btnClose = mk('div', { className: 'w95log-tb-btn' }); btnClose.classList.add('close');
        
        const tbText = mk('span', { className: 'w95log-titlebar-text', text: 'Create New User' });
        const tbBtns = mk('div', { className: 'w95log-titlebar-buttons', children: [btnHelp, btnClose] });
        const titlebar = mk('div', { className: 'w95log-titlebar', children: [tbText, tbBtns] });

        // Icon
        const icon = mk('div', { className: 'w95log-icon', text: '🔑' });
        const iconArea = mk('div', { className: 'w95log-icon-area', children: [icon] });

        // Center (Sin el tip)
        const msg = mk('div', { className: 'w95log-message', text: 'Welcome to Web95! Please create a user account to continue.' });
        
        const labelUser = mk('label'); labelUser.innerHTML = '<u>U</u>ser name:';
        const inputUser = mk('input', { className: 'w95log-input', attributes: { type: 'text' } });
        const rowUser = mk('div', { className: 'w95log-form-row', children: [labelUser, inputUser] }); 
        rowUser.classList.add('create');

        const labelPass = mk('label'); labelPass.innerHTML = '<u>P</u>assword:';
        const inputPass = mk('input', { className: 'w95log-input', attributes: { type: 'password' } });
        const rowPass = mk('div', { className: 'w95log-form-row', children: [labelPass, inputPass] }); 
        rowPass.classList.add('create');

        const labelConfirm = mk('label'); labelConfirm.innerHTML = '<u>C</u>onfirm Password:';
        const inputConfirm = mk('input', { className: 'w95log-input', attributes: { type: 'password' } });
        const rowConfirm = mk('div', { className: 'w95log-form-row', children: [labelConfirm, inputConfirm] }); 
        rowConfirm.classList.add('create');

        const formArea = mk('div', { className: 'w95log-form-area', children: [rowUser, rowPass, rowConfirm] });

        const centerCol = mk('div', { className: 'w95log-center-col', children: [msg, formArea] });

        // Buttons (Solo OK)
        const innerOk = mk('div', { className: 'inner', text: 'OK' });
        const btnOk = mk('button', { className: 'w95log-btn', children: [innerOk] }); 
        btnOk.classList.add('default');
        btnOk.style.width = '95px'; 

        const btnCol = mk('div', { className: 'w95log-btn-column', children: [btnOk] });

        // Layout & Window
        const mainLayout = mk('div', { className: 'w95log-main-layout', children: [iconArea, centerCol, btnCol] });
        const win = mk('div', { className: 'w95log-window', children: [titlebar, mainLayout] });
        win.classList.add('create-mode');

        // Events
        btnOk.addEventListener('click', () => {
            const user = inputUser.value.trim();
            const pass = inputPass.value;
            const pass2 = inputConfirm.value;

            if (!user) return alert('Username cannot be empty.');
            if (pass !== pass2) return alert('Passwords do not match!');

            this.saveAccount(user, pass);
            this.success();
        });

        inputConfirm.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnOk.click(); });

        this.container.appendChild(win);
        setTimeout(() => inputUser.focus(), 10);
    }

    success() {
        this.screen.classList.add('hidden');
        if (this.onSuccess) this.onSuccess();
    }
}

export const loginManager = new LoginManager();