import json
import os
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import get_client_ip, rate_limit
from app.database.session import get_db
from app.forms.schemas import FormSessionResponse, FormSubmitRequest, FormSubmitResponse
from app.forms.service import FormService

router = APIRouter(prefix="/forms", tags=["Forms"])


STANDALONE_FORM_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>POAIS | Interactive Data Entry</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-page: #F1F1F2;
      --bg-surface: #FFFFFF;
      --bg-elevated: #FCFCFC;
      --bg-input: #F7F7F8;
      --border: rgba(40, 40, 40, 0.08);
      --border-subtle: rgba(40, 40, 40, 0.04);
      --border-input: rgba(40, 40, 40, 0.12);
      --text-primary: #2E3032;
      --text-secondary: #686B6E;
      --text-tertiary: #989B9D;
      --accent-dark: #2E3032;
      --accent-hover: #18191A;
      --radius-lg: 24px;
      --radius-md: 14px;
      --radius-sm: 10px;
      --radius-pill: 9999px;
      --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.02), 0 12px 32px rgba(0, 0, 0, 0.04);
      --shadow-button: 0 4px 14px rgba(0, 0, 0, 0.12);
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    body {
      background-color: var(--bg-page);
      color: var(--text-primary);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      line-height: 1.5;
      letter-spacing: -0.01em;
    }
    .topbar {
      width: 100%;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(40, 40, 40, 0.06);
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 0.85rem 1.25rem;
    }
    .topbar-inner {
      max-width: 680px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .slash-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-pill);
      background: rgba(46, 48, 50, 0.07);
      border: 1px solid rgba(46, 48, 50, 0.14);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #2E3032;
    }
    .brand-divider {
      color: var(--text-tertiary);
      font-weight: 300;
    }
    .brand-title {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .session-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.25rem 0.7rem;
      border-radius: var(--radius-pill);
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.22);
      font-size: 0.73rem;
      font-weight: 600;
      color: #065F46;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
      animation: pulseDot 2s infinite;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.9); }
    }
    .main-wrapper {
      flex: 1;
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      padding: 2rem 1.25rem 3rem;
    }
    .header-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.75rem 1.5rem;
      margin-bottom: 1.25rem;
      box-shadow: var(--shadow-card);
    }
    .badge-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.85rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-pill);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .badge-amber {
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      color: #92400E;
    }
    .badge-emerald {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #047857;
    }
    .badge-neutral {
      background: rgba(46, 48, 50, 0.05);
      border: 1px solid rgba(46, 48, 50, 0.1);
      color: var(--text-secondary);
    }
    .title {
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--text-primary);
      margin-bottom: 0.35rem;
      line-height: 1.3;
    }
    .desc {
      font-size: 0.88rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      margin-top: 1rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--border-subtle);
      font-size: 0.78rem;
      color: var(--text-secondary);
    }
    .meta-item strong {
      color: var(--text-primary);
    }
    .form-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.75rem 1.5rem;
      box-shadow: var(--shadow-card);
    }
    .fields-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.15rem;
      margin-bottom: 1.5rem;
    }
    @media (min-width: 600px) {
      .fields-grid { grid-template-columns: 1fr 1fr; }
      .col-span-2 { grid-column: span 2; }
    }
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .field-type {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.68rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }
    input, select {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border-input);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      color: var(--text-primary);
      font-size: 0.92rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s ease;
    }
    input:focus, select:focus {
      background: #FFFFFF;
      border-color: var(--accent-dark);
      box-shadow: 0 0 0 3px rgba(46, 48, 50, 0.08);
    }
    .actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-subtle);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.8rem 1.6rem;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }
    .btn-reset {
      background: transparent;
      color: var(--text-secondary);
    }
    .btn-reset:hover {
      color: var(--text-primary);
    }
    .btn-primary {
      background: var(--accent-dark);
      color: #FFFFFF;
      box-shadow: var(--shadow-button);
    }
    .btn-primary:hover {
      background: var(--accent-hover);
      transform: translateY(-1px);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .status-card {
      text-align: center;
      padding: 2.5rem 1.75rem;
      border-radius: var(--radius-lg);
      background: var(--bg-surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-card);
    }
    .status-icon {
      width: 60px;
      height: 60px;
      border-radius: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      font-size: 1.6rem;
    }
    .status-success {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #047857;
    }
    .status-error {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #DC2626;
    }
    .committed-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      margin: 1.5rem 0;
      text-align: left;
    }
    .committed-cell {
      background: var(--bg-input);
      border: 1px solid var(--border);
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-sm);
    }
    .committed-key {
      font-size: 0.72rem;
      color: var(--text-secondary);
      font-weight: 600;
      display: block;
    }
    .committed-val {
      font-size: 0.84rem;
      color: var(--text-primary);
      font-family: 'JetBrains Mono', monospace;
      word-break: break-word;
    }
    .spinner {
      border: 2.5px solid rgba(46, 48, 50, 0.15);
      border-top-color: var(--accent-dark);
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 0.8s linear infinite;
    }
    .spinner-light {
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .footer {
      border-top: 1px solid rgba(40, 40, 40, 0.05);
      padding: 1.5rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(20px);
      flex-wrap: wrap;
      gap: 0.75rem;
    }
  </style>
</head>
<body>
  <!-- Clean POAIS Topbar -->
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        <span class="slash-tag">POAIS</span>
        <span class="brand-divider">/</span>
        <span class="brand-title">Interactive Data Entry</span>
      </div>
      <div class="session-indicator" id="topSessionIndicator">
        <span class="live-dot"></span>
        <span class="session-text">Active (Expires on Close)</span>
      </div>
    </div>
  </header>

  <div class="main-wrapper" id="app">
    <!-- Loading State -->
    <div class="status-card" id="loadingState">
      <div class="status-icon" style="background: rgba(46, 48, 50, 0.05); border: 1px solid rgba(46, 48, 50, 0.1);">
        <div class="spinner"></div>
      </div>
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);">Loading Secure Data Form</h2>
      <p style="font-size: 0.85rem; color: var(--text-secondary);">Decrypting session signature and preparing dataset fields...</p>
    </div>

    <!-- Expired / Error State -->
    <div class="status-card" id="errorState" style="display: none;">
      <div class="status-icon status-error">⚠️</div>
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #991B1B;" id="errorTitle">Session Expired</h2>
      <p style="font-size: 0.86rem; color: var(--text-secondary); margin-bottom: 1.5rem; max-width: 440px; margin-left: auto; margin-right: auto;" id="errorDesc"></p>
      <div style="background: var(--bg-input); border: 1px solid var(--border); padding: 1rem 1.25rem; border-radius: 14px; font-size: 0.82rem; text-align: left; color: var(--text-primary); max-width: 480px; margin: 0 auto;">
        <p style="font-weight: 600; margin-bottom: 0.4rem; color: var(--text-primary);">How to continue:</p>
        <p style="color: var(--text-secondary); margin-bottom: 0.4rem;">Return to your chat with ChatGPT, Claude, or Gemini and ask:</p>
        <code style="display: block; padding: 0.5rem 0.75rem; background: #FFFFFF; border: 1px solid var(--border); border-radius: 8px; color: #2E3032; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem;">"Open a form to update student S002"</code>
      </div>
    </div>

    <!-- Main Form Content -->
    <div id="formContent" style="display: none;">
      <div class="header-card">
        <div class="badge-row">
          <span class="slash-tag">POAIS FORM</span>
          <span class="badge badge-amber" id="actionBadge">UPDATE RECORD</span>
          <span class="badge badge-neutral">🔒 Session Active In Window</span>
        </div>
        <h1 class="title" id="formTitle">Update Record</h1>
        <p class="desc" id="formDesc">Fill out the fields below. Submitting will update the dataset file in workspace storage directly.</p>
        <div class="meta-row">
          <div class="meta-item">File: <strong id="metaFile">...</strong></div>
          <div class="meta-item">Workspace: <strong id="metaWs">...</strong></div>
          <div class="meta-item" id="metaTargetWrap">Target: <strong id="metaTarget">...</strong></div>
        </div>
      </div>

      <form class="form-card" id="mainForm">
        <div class="fields-grid" id="fieldsGrid"></div>
        <div class="actions-row">
          <button type="button" class="btn btn-reset" id="resetBtn">Reset Values</button>
          <button type="submit" class="btn btn-primary" id="submitBtn">
            <span id="submitText">Submit Record</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Success State -->
    <div class="status-card" id="successState" style="display: none;">
      <div class="status-icon status-success">✓</div>
      <div class="badge badge-emerald" style="margin-bottom: 0.75rem;">Persisted to Dataset</div>
      <h2 style="font-size: 1.45rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-primary);" id="successMsg">Data Updated Successfully</h2>
      <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 480px; margin: 0 auto 1.25rem;">
        The dataset <strong style="color: var(--text-primary);" id="successFile">...</strong> has been updated. Your AI assistant can now immediately query these updated values.
      </p>
      <div class="committed-grid" id="committedGrid"></div>
      <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
        <button type="button" class="btn btn-reset" style="background: var(--bg-input); border: 1px solid var(--border);" id="addAnotherBtn">+ Add Another Record</button>
        <button type="button" class="btn btn-primary" onclick="window.close()">Close Window</button>
      </div>
    </div>
  </div>

  <!-- Clean POAIS Footer -->
  <footer class="footer">
    <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
      <span class="slash-tag" style="margin: 0;">POAIS</span>
      <span>Policy-Oriented AI Space • Granular Model Context Protocol (MCP) Governance.</span>
    </div>
    <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--text-tertiary);">
      Tamper-Proof JWT Security • Scoped to Workspace
    </div>
  </footer>

  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const sessionToken = urlParams.get('session');
    let sessionData = null;
    let isSubmitted = false;

    function esc(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    if (!sessionToken) {
      showError("No Session Token Provided", "Please ask your AI assistant to generate a new data entry form link.");
    } else {
      loadSession();
    }

    async function loadSession() {
      try {
        const res = await fetch('/forms/session?token=' + encodeURIComponent(sessionToken));
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const errMsg = err.detail || ('HTTP ' + res.status + ': Failed to retrieve form session');
          showError("Session Verification Failed", errMsg);
          return;
        }
        sessionData = await res.json();
      } catch (networkErr) {
        showError("Connection Error", "Unable to connect to the backend server. Please check your connection and reload.");
        return;
      }

      try {
        renderForm();
      } catch (renderErr) {
        console.error("Form render error:", renderErr);
        showError("Form Display Error", "Error rendering form fields: " + (renderErr.message || renderErr));
      }
    }

    function showError(title, desc) {
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('formContent').style.display = 'none';
      document.getElementById('successState').style.display = 'none';
      document.getElementById('errorState').style.display = 'block';
      document.getElementById('errorTitle').textContent = title || "Unable to Load Form";
      document.getElementById('errorDesc').textContent = desc || "Please request a new form from your AI assistant.";
      const topIndicator = document.getElementById('topSessionIndicator');
      if (topIndicator) {
        topIndicator.innerHTML = '<span style="color:#DC2626;">●</span> Session Inactive';
        topIndicator.style.background = '#FEF2F2';
        topIndicator.style.borderColor = '#FECACA';
        topIndicator.style.color = '#DC2626';
      }
    }

    function renderForm() {
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('formContent').style.display = 'block';

      document.getElementById('formTitle').textContent = sessionData.title;
      document.getElementById('formDesc').textContent = sessionData.description || "Enter or update record attributes below.";
      document.getElementById('metaFile').textContent = sessionData.filename;
      document.getElementById('metaWs').textContent = sessionData.workspace_name;

      if (sessionData.target_identifier) {
        document.getElementById('metaTarget').textContent = sessionData.target_identifier;
      } else {
        document.getElementById('metaTargetWrap').style.display = 'none';
      }

      const actionBadge = document.getElementById('actionBadge');
      if (sessionData.action === 'update') {
        actionBadge.textContent = 'UPDATE RECORD';
        actionBadge.className = 'badge badge-amber';
        document.getElementById('submitText').textContent = 'Update Record';
      } else {
        actionBadge.textContent = 'NEW RECORD ENTRY';
        actionBadge.className = 'badge badge-emerald';
        document.getElementById('submitText').textContent = 'Add New Record';
      }

      const grid = document.getElementById('fieldsGrid');
      grid.innerHTML = '';

      sessionData.fields.forEach(field => {
        const group = document.createElement('div');
        group.className = 'field-group';
        const lowerName = (field.name || '').toLowerCase();
        if (lowerName.includes('desc') || lowerName.includes('address') || lowerName.includes('bio')) {
          group.className += ' col-span-2';
        }

        const prefilled = (sessionData.prefilled_values && sessionData.prefilled_values[field.name] !== undefined)
          ? sessionData.prefilled_values[field.name]
          : (field.current_value !== null && field.current_value !== undefined ? field.current_value : '');

        let inputHtml = '';
        if (field.type === 'select' && field.options && field.options.length > 0) {
          inputHtml = `<select name="${esc(field.name)}">
            <option value="">-- Select ${esc(field.label)} --</option>
            ${field.options.map(opt => `<option value="${esc(opt)}" ${String(opt) === String(prefilled) ? 'selected' : ''}>${esc(opt)}</option>`).join('')}
          </select>`;
        } else if (field.type === 'number') {
          inputHtml = `<input type="number" step="any" inputmode="decimal" name="${esc(field.name)}" value="${esc(prefilled)}" placeholder="${esc(field.placeholder || '0')}">`;
        } else if (field.type === 'date') {
          inputHtml = `<input type="date" name="${esc(field.name)}" value="${esc(prefilled)}">`;
        } else if (field.type === 'boolean') {
          const isTrue = String(prefilled).toLowerCase() === 'true' || prefilled === true || prefilled === 1;
          inputHtml = `<select name="${esc(field.name)}">
            <option value="true" ${isTrue ? 'selected' : ''}>True / Yes</option>
            <option value="false" ${!isTrue ? 'selected' : ''}>False / No</option>
          </select>`;
        } else {
          inputHtml = `<input type="text" name="${esc(field.name)}" value="${esc(prefilled)}" placeholder="${esc(field.placeholder || 'Enter ' + field.label)}">`;
        }

        group.innerHTML = `
          <div class="label-row">
            <label>${esc(field.label)} ${field.required ? '<span style="color:#DC2626;">*</span>' : ''}</label>
            <span class="field-type">${esc(field.type)}</span>
          </div>
          ${inputHtml}
        `;
        grid.appendChild(group);
      });
    }

    document.getElementById('resetBtn').addEventListener('click', () => {
      if (sessionData) renderForm();
    });

    document.getElementById('mainForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submitBtn');
      const submitText = document.getElementById('submitText');
      submitBtn.disabled = true;
      submitText.innerHTML = '<span class="spinner-light"></span> Saving...';

      const formData = new FormData(e.target);
      const values = {};
      formData.forEach((value, key) => {
        values[key] = value;
      });

      try {
        const res = await fetch('/forms/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_token: sessionToken,
            values: values,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Submission failed');
        }

        isSubmitted = true;
        const result = await res.json();
        showSuccess(result);
      } catch (err) {
        alert('Error submitting form: ' + (err.message || 'Please check inputs and retry.'));
        submitBtn.disabled = false;
        submitText.textContent = sessionData.action === 'update' ? 'Update Record' : 'Add New Record';
      }
    });

    function showSuccess(result) {
      document.getElementById('formContent').style.display = 'none';
      document.getElementById('successState').style.display = 'block';
      document.getElementById('successMsg').textContent = result.message || 'Data Persisted Successfully';
      document.getElementById('successFile').textContent = result.filename || sessionData.filename;

      const topIndicator = document.getElementById('topSessionIndicator');
      if (topIndicator) {
        topIndicator.innerHTML = '<span style="color:#047857;">✓</span> Completed';
      }

      const grid = document.getElementById('committedGrid');
      grid.innerHTML = '';
      if (result.record) {
        Object.entries(result.record).forEach(([k, v]) => {
          const cell = document.createElement('div');
          cell.className = 'committed-cell';
          cell.innerHTML = `<span class="committed-key">${k}</span><span class="committed-val">${v !== null && v !== undefined ? v : ''}</span>`;
          grid.appendChild(cell);
        });
      }

      document.getElementById('addAnotherBtn').onclick = () => {
        document.getElementById('successState').style.display = 'none';
        document.getElementById('formContent').style.display = 'block';
        const inputs = document.querySelectorAll('#fieldsGrid input, #fieldsGrid select');
        inputs.forEach(input => {
          if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
          } else {
            input.value = '';
          }
        });
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
        document.getElementById('submitText').textContent = 'Submit Record';
        const topIndicator = document.getElementById('topSessionIndicator');
        if (topIndicator) {
          topIndicator.innerHTML = '<span class="live-dot"></span> Active Session';
        }
      };
    }
  </script>
</body>
</html>
"""


@router.get("/view", response_class=HTMLResponse)
@router.get("", response_class=HTMLResponse)
async def view_form_standalone(
    request: Request,
    session: Optional[str] = Query(None, description="Form session token"),
):
    """
    Serves a beautiful, self-contained, mobile-optimized interactive form web application
    directly from FastAPI. Requires ZERO user login; authenticated by the signed session token.
    """
    return HTMLResponse(content=STANDALONE_FORM_HTML, status_code=200)




@router.get(
    "/session",
    response_model=FormSessionResponse,
    dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60, scope="forms_get"))],
)
async def get_form_session(
    token: str = Query(..., description="Cryptographically signed form session token"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the dataset field definitions, inferred input controls, and pre-filled
    values for an AI-generated data entry form session. Publicly authorized via signed JWT.
    """
    return await FormService.get_session_data(db=db, token=token)


@router.post(
    "/submit",
    response_model=FormSubmitResponse,
    dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60, scope="forms_submit"))],
)
async def submit_form_data(
    req: FormSubmitRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Validates, sanitizes (CWE-1236 anti-formula injection), commits user-entered data
    to the target dataset file, and invalidates the session token. Publicly authorized via signed JWT.
    """
    client_ip = get_client_ip(request)
    return await FormService.submit_form(
        db=db,
        token=req.session_token,
        submitted_values=req.values,
        client_ip=client_ip,
    )
