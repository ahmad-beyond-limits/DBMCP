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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090D16;
      --card-bg: rgba(15, 23, 42, 0.88);
      --card-border: rgba(255, 255, 255, 0.09);
      --primary: #4F46E5;
      --accent-cyan: #06B6D4;
      --accent-emerald: #10B981;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --input-bg: #030712;
      --input-border: rgba(255, 255, 255, 0.12);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      background-image: radial-gradient(at 0% 0%, rgba(79, 70, 229, 0.18) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.12) 0px, transparent 50%);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      padding: 1.5rem 1rem 3rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container { width: 100%; max-width: 660px; margin: 0 auto; }
    .header-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 1.5rem;
      margin-bottom: 1.25rem;
      backdrop-filter: blur(24px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
    }
    .badge-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.85rem; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.28rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-indigo { background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: #A5B4FC; }
    .badge-emerald { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #6EE7B7; }
    .badge-amber { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #FCD34D; }
    .title { font-size: 1.45rem; font-weight: 800; color: #FFFFFF; margin-bottom: 0.4rem; line-height: 1.3; }
    .desc { font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      margin-top: 1rem;
      padding-top: 0.85rem;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .meta-item strong { color: #E2E8F0; }
    .form-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 1.5rem;
      backdrop-filter: blur(24px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
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
    .field-group { display: flex; flex-direction: column; gap: 0.45rem; }
    .label-row { display: flex; justify-content: space-between; align-items: center; }
    label { font-size: 0.8rem; font-weight: 600; color: #CBD5E1; }
    .field-type { font-family: 'JetBrains Mono', monospace; font-size: 0.68rem; color: #64748B; text-transform: uppercase; }
    input, select {
      width: 100%;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 12px;
      padding: 0.75rem 0.95rem;
      color: #FFFFFF;
      font-size: 0.92rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }
    input:focus, select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.25);
    }
    .actions-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.8rem 1.5rem;
      border-radius: 14px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-reset { background: transparent; color: #94A3B8; }
    .btn-reset:hover { color: #FFFFFF; }
    .btn-primary {
      background: linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%);
      color: #FFFFFF;
      box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4);
    }
    .btn-primary:hover { opacity: 0.95; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .status-card {
      text-align: center;
      padding: 2.5rem 1.5rem;
      border-radius: 24px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(24px);
    }
    .status-icon {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      font-size: 1.8rem;
    }
    .status-success { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10B981; }
    .status-error { background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3); color: #F43F5E; }
    .committed-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      margin: 1.5rem 0;
      text-align: left;
    }
    .committed-cell {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 0.6rem 0.8rem;
      border-radius: 10px;
    }
    .committed-key { font-size: 0.72rem; color: #94A3B8; font-weight: 600; display: block; }
    .committed-val { font-size: 0.82rem; color: #F1F5F9; font-family: 'JetBrains Mono', monospace; word-break: break-word; }
    .spinner {
      border: 2.5px solid rgba(255, 255, 255, 0.25);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container" id="app">
    <!-- Loading State -->
    <div class="status-card" id="loadingState">
      <div class="status-icon" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: #818CF8;">
        <div class="spinner"></div>
      </div>
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Loading Secure Data Form</h2>
      <p style="font-size: 0.85rem; color: var(--text-muted);">Decrypting session signature and preparing dataset fields...</p>
    </div>

    <!-- Error State (hidden initially) -->
    <div class="status-card" id="errorState" style="display: none;">
      <div class="status-icon status-error">⚠️</div>
      <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #FDA4AF;" id="errorTitle">Session Expired</h2>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;" id="errorDesc"></p>
      <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); padding: 1rem; border-radius: 12px; font-size: 0.8rem; text-align: left; color: #CBD5E1;">
        <p style="font-weight: 600; margin-bottom: 0.4rem; color: #E2E8F0;">How to continue:</p>
        <p>Return to your chat with ChatGPT, Claude, or Gemini and ask:</p>
        <code style="display: block; margin-top: 0.4rem; padding: 0.4rem; background: rgba(0,0,0,0.5); border-radius: 6px; color: #A5B4FC; font-family: 'JetBrains Mono', monospace;">"Open a form to update student S002"</code>
      </div>
    </div>

    <!-- Main Form Content (hidden initially) -->
    <div id="formContent" style="display: none;">
      <div class="header-card">
        <div class="badge-row">
          <span class="badge badge-indigo">✨ AI Generative Form</span>
          <span class="badge badge-emerald" id="actionBadge">UPDATE RECORD</span>
          <span class="badge" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #94A3B8;">🔒 Signed Session</span>
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

    <!-- Success Confirmation State (hidden initially) -->
    <div class="status-card" id="successState" style="display: none;">
      <div class="status-icon status-success">✓</div>
      <div class="badge badge-emerald" style="margin-bottom: 0.75rem;">Persisted to Dataset</div>
      <h2 style="font-size: 1.45rem; font-weight: 800; margin-bottom: 0.5rem; color: #FFFFFF;" id="successMsg">Data Updated Successfully</h2>
      <p style="font-size: 0.85rem; color: var(--text-muted);">
        The dataset <strong style="color: #E2E8F0;" id="successFile">...</strong> has been modified. Your AI assistant can now immediately query these updated values.
      </p>
      <div class="committed-grid" id="committedGrid"></div>
      <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
        <button class="btn btn-primary" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);" onclick="window.close()">Close Window</button>
      </div>
    </div>
  </div>

  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const sessionToken = urlParams.get('session');
    let sessionData = null;

    if (!sessionToken) {
      showError("No session token was provided in the link.", "Please ask your AI assistant to generate a new data entry form link.");
    } else {
      loadSession();
    }

    async function loadSession() {
      try {
        const res = await fetch('/forms/session?token=' + encodeURIComponent(sessionToken));
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Form session expired or invalid');
        }
        sessionData = await res.json();
        renderForm();
      } catch (e) {
        showError("Form Session Invalid or Expired", e.message || "This secure link has expired. Request a new form in chat.");
      }
    }

    function showError(title, desc) {
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('formContent').style.display = 'none';
      document.getElementById('successState').style.display = 'none';
      document.getElementById('errorState').style.display = 'block';
      document.getElementById('errorTitle').textContent = title;
      document.getElementById('errorDesc').textContent = desc;
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
        if (field.name.toLowerCase().includes('desc') || field.name.toLowerCase().includes('address')) {
          group.className += ' col-span-2';
        }

        const prefilled = (sessionData.prefilled_values && sessionData.prefilled_values[field.name] !== undefined)
          ? sessionData.prefilled_values[field.name]
          : (field.current_value !== null && field.current_value !== undefined ? field.current_value : '');

        let inputHtml = '';
        if (field.type === 'select' && field.options && field.options.length > 0) {
          inputHtml = `<select name="${field.name}">
            <option value="">-- Select ${field.label} --</option>
            ${field.options.map(opt => `<option value="${opt}" ${String(opt) === String(prefilled) ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>`;
        } else if (field.type === 'number') {
          inputHtml = `<input type="number" step="any" inputmode="decimal" name="${field.name}" value="${prefilled}" placeholder="${field.placeholder || '0'}">`;
        } else if (field.type === 'date') {
          inputHtml = `<input type="date" name="${field.name}" value="${prefilled}">`;
        } else if (field.type === 'boolean') {
          const isTrue = String(prefilled).toLowerCase() === 'true' || prefilled === true || prefilled === 1;
          inputHtml = `<select name="${field.name}">
            <option value="true" ${isTrue ? 'selected' : ''}>True / Yes</option>
            <option value="false" ${!isTrue ? 'selected' : ''}>False / No</option>
          </select>`;
        } else {
          inputHtml = `<input type="text" name="${field.name}" value="${prefilled}" placeholder="${field.placeholder || 'Enter ' + field.label}">`;
        }

        group.innerHTML = `
          <div class="label-row">
            <label>${field.label} ${field.required ? '<span style="color:#F43F5E;">*</span>' : ''}</label>
            <span class="field-type">${field.type}</span>
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
      submitText.innerHTML = '<span class="spinner"></span> Committing...';

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
    Validates, sanitizes (CWE-1236 anti-formula injection), and commits user-entered data
    to the target dataset file and storage backend. Publicly authorized via signed JWT.
    """
    client_ip = get_client_ip(request)
    return await FormService.submit_form(
        db=db,
        token=req.session_token,
        submitted_values=req.values,
        client_ip=client_ip,
    )
