"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  Hash,
  HelpCircle,
  Layers,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { FormFieldDefinition, FormSessionResponse, FormSubmitResponse } from "@/lib/types";

function FormContent() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get("session");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<FormSessionResponse | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<FormSubmitResponse | null>(null);
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionToken) {
      setError("No session token provided. Please ask your AI Assistant to generate a valid form link.");
      setLoading(false);
      return;
    }

    async function loadForm() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getFormSession(sessionToken!);
        setSessionData(data);

        // Initialize form values with prefilled or default empty values
        const initialVals: Record<string, any> = {};
        data.fields.forEach((f) => {
          if (data.prefilled_values && data.prefilled_values[f.name] !== undefined) {
            initialVals[f.name] = data.prefilled_values[f.name];
          } else if (f.current_value !== null && f.current_value !== undefined) {
            initialVals[f.name] = f.current_value;
          } else if (f.type === "boolean") {
            initialVals[f.name] = false;
          } else {
            initialVals[f.name] = "";
          }
        });
        setFormValues(initialVals);
      } catch (err: any) {
        console.error("Failed to load form session:", err);
        setError(err.message || "Failed to load form session. The session token may have expired or is invalid.");
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [sessionToken]);

  useEffect(() => {
    if (!sessionToken) return;

    const handleUnload = () => {
      if (!submitResult) {
        const url = `/forms/expire?session=${encodeURIComponent(sessionToken)}`;
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url);
        }
      }
    };

    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [sessionToken, submitResult]);

  const handleInputChange = (fieldName: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
    setDirtyFields((prev) => new Set(prev).add(fieldName));
  };

  const handleReset = () => {
    if (!sessionData) return;
    const resetVals: Record<string, any> = {};
    sessionData.fields.forEach((f) => {
      if (sessionData.prefilled_values && sessionData.prefilled_values[f.name] !== undefined) {
        resetVals[f.name] = sessionData.prefilled_values[f.name];
      } else if (f.current_value !== null && f.current_value !== undefined) {
        resetVals[f.name] = f.current_value;
      } else {
        resetVals[f.name] = "";
      }
    });
    setFormValues(resetVals);
    setDirtyFields(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.submitFormData(sessionToken, formValues);
      setSubmitResult(res);
    } catch (err: any) {
      console.error("Form submission failed:", err);
      setError(err.message || "Submission failed. Please check your inputs and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center animate-pulse mb-6">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connecting to Secure Dataset Session</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Decrypting session authorization token and preparing schema fields...
        </p>
      </div>
    );
  }

  if (error && !sessionData) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-center">
        <div className="w-14 h-14 rounded-xl bg-rose-900/40 border border-rose-700/50 flex items-center justify-center mx-auto mb-4 text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-rose-200 mb-2">Form Session Expired or Invalid</h3>
        <p className="text-sm text-rose-300/80 mb-6 leading-relaxed">{error}</p>
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-400 text-left">
          <p className="font-semibold text-slate-300 mb-1">How to resolve:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Return to your conversation with ChatGPT, Claude, or Gemini.</li>
            <li>Request a new form by asking: <span className="text-indigo-300">"Generate a form to enter/update data"</span>.</li>
            <li>Click the newly generated interactive link.</li>
          </ul>
        </div>
      </div>
    );
  }

  if (submitResult) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-slate-900/90 border border-emerald-500/40 shadow-2xl backdrop-blur-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 text-emerald-400">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 mb-3">
          <ShieldCheck className="w-3.5 h-3.5" /> Persisted to Dataset
        </span>
        <h2 className="text-2xl font-bold text-white mb-2">{submitResult.message}</h2>
        <p className="text-sm text-slate-400 mb-6">
          The dataset <strong className="text-slate-200">{submitResult.filename}</strong> has been updated.
          Your AI Assistant can now immediately read and query these updated records.
        </p>

        {submitResult.record && Object.keys(submitResult.record).length > 0 && (
          <div className="text-left mb-6 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Committed Record</span>
              <span className="text-[11px] text-emerald-400 font-mono">1 record affected</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(submitResult.record).map(([k, v]) => (
                <div key={k} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                  <span className="block text-slate-400 font-medium">{k}</span>
                  <span className="font-mono text-slate-200 truncate block">{String(v ?? "")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {sessionData?.action === "insert" && (
            <button
              onClick={() => {
                setSubmitResult(null);
                handleReset();
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
            >
              Add Another Entry
            </button>
          )}
          <button
            onClick={() => window.close()}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all border border-slate-700"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (!sessionData) return null;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Banner & Context Info */}
      <div className="mb-6 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-indigo-950/30 border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                AI Generative Form
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  sessionData.action === "update"
                    ? "bg-amber-500/10 border border-amber-500/30 text-amber-300"
                    : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                }`}
              >
                {sessionData.action === "update" ? "MODIFICATION MODE" : "NEW RECORD ENTRY"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-black/40 px-3 py-1 rounded-full border border-white/5">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Signed Token Session</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            {sessionData.title}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {sessionData.description || "Fill in the required attributes below. Changes sync directly to the dataset in workspace storage."}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/10 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              <span>File: <strong className="text-slate-200">{sessionData.filename}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-violet-400" />
              <span>Workspace: <strong className="text-slate-200">{sessionData.workspace_name}</strong></span>
            </div>
            {sessionData.target_identifier && (
              <div className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-400" />
                <span>Target: <strong className="text-slate-200">{sessionData.target_identifier}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-3 text-sm text-rose-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-3xl p-6 sm:p-8 bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Dataset Attributes ({sessionData.fields.length})
            </span>
            {dirtyFields.size > 0 && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {dirtyFields.size} field(s) edited
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {sessionData.fields.map((field) => {
              const val = formValues[field.name] ?? "";
              const isDirty = dirtyFields.has(field.name);

              return (
                <div
                  key={field.name}
                  className={`flex flex-col space-y-1.5 ${
                    field.type === "text" && field.name.toLowerCase().includes("description")
                      ? "sm:col-span-2"
                      : ""
                  }`}
                >
                  <label
                    htmlFor={field.name}
                    className="text-xs font-semibold text-slate-300 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-rose-400">*</span>}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                      {field.type}
                    </span>
                  </label>

                  {/* Input Rendering based on field.type */}
                  {field.type === "select" && field.options && field.options.length > 0 ? (
                    <select
                      id={field.name}
                      value={val}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl bg-slate-950 border text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                        isDirty ? "border-indigo-500/50" : "border-slate-800"
                      }`}
                    >
                      <option value="">-- Select {field.label} --</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "boolean" ? (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleInputChange(field.name, !val)}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                          val ? "bg-indigo-600" : "bg-slate-800"
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                            val ? "translate-x-6" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="text-xs font-medium text-slate-300">
                        {val ? "True / Yes" : "False / No"}
                      </span>
                    </div>
                  ) : field.type === "number" ? (
                    <div className="relative">
                      <input
                        type="number"
                        id={field.name}
                        step="any"
                        value={val}
                        placeholder={field.placeholder || "0"}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                          isDirty ? "border-indigo-500/50" : "border-slate-800"
                        }`}
                      />
                      <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  ) : field.type === "date" ? (
                    <div className="relative">
                      <input
                        type="date"
                        id={field.name}
                        value={val}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                          isDirty ? "border-indigo-500/50" : "border-slate-800"
                        }`}
                      />
                      <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      id={field.name}
                      value={val}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl bg-slate-950 border text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                        isDirty ? "border-indigo-500/50" : "border-slate-800"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <button
            type="button"
            onClick={handleReset}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Reset Changes
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Committing Changes...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{sessionData.action === "update" ? "Update Record" : "Submit New Record"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function FormsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        }
      >
        <FormContent />
      </Suspense>
    </div>
  );
}
