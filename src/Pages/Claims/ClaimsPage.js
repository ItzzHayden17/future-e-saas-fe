import "./ClaimsPage.css";
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../Components/Navbar/Navbar";
import axios from "axios";
import Cookies from "js-cookie";
import { serverUrl } from "../../serverUrl";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const stages = [
  ["notificationReceived", "Notification received"],
  ["documentsReceived", "Documents received"],
  ["claimToInsurer", "Claim sent to insurer"],
  ["claimRegistered", "Claim registered"],
  ["assessorAppointed", "Assessor appointed"],
  ["reportReceivedFromAssessor", "Assessor report received"],
  ["authorizationReceived", "Authorisation received"],
  ["aolReceivedReplacement", "AOL / replacement received"],
  ["panelbeaterFollowedUp", "Panelbeater follow-up"],
  ["iolFollowedUp", "IOL follow-up"],
  ["paymentReceived", "Payment received"],
  ["claimFinalised", "Claim finalised"],
];

const documentTypes = [
  "Claim form",
  "ID / registration documents",
  "Driver's licence",
  "Police report / case number",
  "Photographs",
  "Quotation",
  "Supporting documents",
];

const blank = {
  claimNumber: "",
  clientName: "",
  claimDate: "",
  claimType: "",
  claimStatus: "open",
  claimCategory: "open",
  thirdParty: false,
  recoveryProvider: "",
  assessorName: "",
  assessorPhone: "",
  assessorEmail: "",
  assessorAppointmentDate: "",
  documentsDetailsOutstanding: "",
  documentFolderPath: "",
  finalisationDate: "",
  finalisationReason: "",
  notes: [],
  followUps: [],
  documentChecklist: [],
  milestoneDates: [],
};

const isFinalised = (claim) => {
  const value = String(claim.claimFinalised || "").trim();
  const marked =
    value &&
    !/^(no|not yet|pending|false|0|not finalised|not finalized)$/i.test(
      value
    );

  return (
    String(claim.claimStatus || "").toLowerCase() === "finalised" ||
    Boolean(marked) ||
    Boolean(claim.finalisationDate)
  );
};

const isThirdParty = (claim) =>
  claim.claimCategory === "third-party" ||
  claim.thirdParty === true ||
  Boolean(claim.recoveryProvider) ||
  /third.?party|recovery|webuycars/i.test(
    String(claim.typeOfClaim || "")
  );

const completed = (claim, key) => {
  const value = claim[key];

  return (
    Boolean(value) &&
    !/^(no|not yet|pending|outstanding|awaiting|false|0)$/i.test(
      String(value).trim()
    )
  );
};

const progress = (claim) =>
  isFinalised(claim)
    ? 100
    : Math.round(
        (stages.filter(([key]) => completed(claim, key)).length /
          stages.length) *
          100
      );

const dateLabel = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-ZA");
};

function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [tab, setTab] = useState("open");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank });
  const [saving, setSaving] = useState(false);
  const [historyClaim, setHistoryClaim] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [stageKey, setStageKey] = useState(stages[0][0]);
  const [stageDate, setStageDate] = useState("");
  const [stageNote, setStageNote] = useState("");
  const [followUpType, setFollowUpType] = useState("Panelbeater");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [docDate, setDocDate] = useState("");
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [existingMilestones, setExistingMilestones] = useState([]);
  const [existingFollowUps, setExistingFollowUps] = useState([]);
  const [existingNotes, setExistingNotes] = useState([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadClaims();
  }, []);

  async function loadClaims() {
    try {
      const response = await axios.get(`${serverUrl}claims`);

      setClaims(
        Array.isArray(response.data)
          ? response.data
          : response.data.claims || []
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to load claims");
    }
  }

  const visibleClaims = useMemo(() => {
    const term = search.trim().toLowerCase();

    return claims.filter((claim) => {
      const matchesTab =
        tab === "open"
          ? !isFinalised(claim) && !isThirdParty(claim)
          : tab === "third-party"
          ? !isFinalised(claim) && isThirdParty(claim)
          : isFinalised(claim);

      const matchesSearch =
        !term ||
        [
          claim.claimNumber,
          claim.clientName,
          claim.claimDate,
          claim.id,
        ].some((value) =>
          String(value || "").toLowerCase().includes(term)
        );

      return matchesTab && matchesSearch;
    });
  }, [claims, tab, search]);

  function openAdd() {
    setEditing(null);

    setForm({
      ...blank,
      claimDate: new Date().toISOString().slice(0, 10),
    });

    setExistingDocuments([]);
    setExistingMilestones([]);
    setExistingFollowUps([]);
    setExistingNotes([]);

    setShowModal(true);
  }

  function openEdit(claim) {
    setEditing(claim);

    setForm({
      ...blank,
      ...claim,
      documentChecklist: [],
      followUps: [],
      milestoneDates: [],
      notes: [],
      claimCategory: isThirdParty(claim)
        ? "third-party"
        : claim.claimCategory || "open",
    });

    setExistingDocuments(claim.documentChecklist || []);
    setExistingMilestones(claim.milestoneDates || []);
    setExistingFollowUps(claim.followUps || []);
    setExistingNotes(claim.notes || []);

    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
  }

  function change(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function addStageUpdate() {
    if (!stageDate) return toast.error("Select a milestone date");

    const stage = stages.find(([key]) => key === stageKey);

    setForm((prev) => ({
      ...prev,
      [stageKey]: stageDate,
      milestoneDates: [
        ...(prev.milestoneDates || []),
        {
          stage: stageKey,
          label: stage?.[1] || stageKey,
          date: stageDate,
          note: stageNote.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    setStageDate("");
    setStageNote("");
  }

  function addFollowUp() {
    if (!followUpDate) return toast.error("Select a follow-up date");

    setForm((prev) => ({
      ...prev,
      followUps: [
        ...(prev.followUps || []),
        {
          type: followUpType,
          date: followUpDate,
          note: followUpNote.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    setFollowUpDate("");
    setFollowUpNote("");
  }

  function addDocument(name, checked) {
    if (!checked) return;

    if (!docDate)
      return toast.error("Select the document received date first");

    setForm((prev) => ({
      ...prev,
      documentChecklist: [
        ...(prev.documentChecklist || []),
        {
          name,
          received: true,
          date: docDate,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function addNote() {
    if (!newNote.trim()) return;

    const entry = {
      text: newNote.trim(),
      createdAt: new Date().toISOString(),
    };

    if (historyClaim) {
      saveAppend(historyClaim, { notes: [entry] });
    } else {
      setForm((prev) => ({
        ...prev,
        notes: [...(prev.notes || []), entry],
      }));
    }

    setNewNote("");
  }

  async function saveAppend(claim, appendData) {
    try {
      await axios.patch(`${serverUrl}claims/${claim.id}`, appendData);

      toast.success("Added to claim history");
      setHistoryClaim(null);

      await loadClaims();
    } catch (error) {
      console.error(error);
      toast.error("Could not update claim history");
    }
  }

  async function saveClaim() {
    if (!form.claimNumber.trim() || !form.clientName.trim()) {
      return toast.error(
        "Claim number and client name are required"
      );
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        claimStatus: form.claimStatus || "open",
        claimCategory: form.claimCategory,
        thirdParty: form.claimCategory === "third-party",
        typeOfClaim:
          form.claimType || form.typeOfClaim || "",
      };

      if (editing) {
        await axios.patch(
          `${serverUrl}claims/${editing.id}`,
          payload
        );

        toast.success("Claim updated successfully");
      } else {
        await axios.post(`${serverUrl}claims`, payload);

        toast.success("Claim added successfully");
      }

      closeModal();

      await loadClaims();
    } catch (error) {
      console.error(error);

      toast.error(
        editing
          ? "Failed to update claim"
          : "Failed to add claim"
      );
    } finally {
      setSaving(false);
    }
  }

  async function finaliseClaim(claim) {
    const reason = window.prompt(
      "Enter the reason for finalising this claim (e.g. cash payment or correction):"
    );

    if (reason === null) return;

    const date = window.prompt(
      "Finalisation date (YYYY-MM-DD):",
      new Date().toISOString().slice(0, 10)
    );

    if (date === null) return;

    try {
      await axios.patch(`${serverUrl}claims/${claim.id}`, {
        claimStatus: "finalised",
        claimFinalised: date,
        finalisationDate: date,
        finalisationReason: reason,
      });

      toast.success("Claim finalised");

      await loadClaims();
    } catch (error) {
      console.error(error);
      toast.error("Failed to finalise claim");
    }
  }

  async function deleteClaim(claim) {
    if (
      !window.confirm(
        `Delete claim ${claim.claimNumber || ""}? This cannot be undone.`
      )
    )
      return;

    try {
      await axios.delete(`${serverUrl}claims/${claim.id}`);

      setClaims((prev) =>
        prev.filter((item) => item.id !== claim.id)
      );

      toast.success("Claim deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete claim");
    }
  }

  function openFolder(claim) {
    if (!claim.documentFolderPath)
      return toast.info(
        "No document folder is linked to this claim yet"
      );

    Cookies.set("currentDirectory", claim.documentFolderPath, {
      expires: 30,
    });

    window.location.href = "/home";
  }

  function importExcel(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(
          new Uint8Array(e.target.result),
          { type: "array" }
        );

        const rows = XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]],
          { defval: "" }
        );

        if (!rows.length)
          return toast.error("The Excel file contains no data");

        setImporting(true);

        for (const row of rows) {
          const payload = { ...blank };

          Object.keys(row).forEach((key) => {
            const normalized = key
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");

            const map = {
              claimnumber: "claimNumber",
              clientname: "clientName",
              claimdate: "claimDate",
              typeofclaim: "claimType",
              notificationreceived: "notificationReceived",
              claimregistered: "claimRegistered",
              assessorappointed: "assessorAppointed",
              authorizationreceived: "authorizationReceived",
              paymentreceived: "paymentReceived",
            };

            if (map[normalized])
              payload[map[normalized]] = String(row[key] ?? "");
          });

          await axios.post(`${serverUrl}claims`, payload);
        }

        toast.success(`${rows.length} claims imported`);

        await loadClaims();
      } catch (error) {
        console.error(error);
        toast.error("Failed to import Excel file");
      } finally {
        setImporting(false);
        event.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  }

  const allHistory = (claim) =>
    [
      ...(claim.history || []).map((item) => ({
        ...item,
        kind: "history",
      })),

      ...(claim.notes || []).map((item) => ({
        ...item,
        action: "Note",
        details: item.text,
        kind: "note",
      })),

      ...(claim.milestoneDates || []).map((item) => ({
        ...item,
        action: item.label || "Milestone",
        details: `${item.date}${
          item.note ? ` — ${item.note}` : ""
        }`,
        kind: "milestone",
      })),

      ...(claim.followUps || []).map((item) => ({
        ...item,
        action: `${item.type} follow-up`,
        details: `${item.date}${
          item.note ? ` — ${item.note}` : ""
        }`,
        kind: "follow-up",
      })),

      ...(claim.documentChecklist || []).map((item) => ({
        ...item,
        action: "Document received",
        details: `${item.name} — ${item.date}`,
        kind: "document",
      })),
    ].sort(
      (a, b) =>
        new Date(
          b.timestamp || b.createdAt || b.date || 0
        ) -
        new Date(
          a.timestamp || a.createdAt || a.date || 0
        )
    );

  const stats = {
    total: claims.length,
    open: claims.filter(
      (c) => !isFinalised(c) && !isThirdParty(c)
    ).length,
    thirdParty: claims.filter(
      (c) => !isFinalised(c) && isThirdParty(c)
    ).length,
    finalised: claims.filter(isFinalised).length,
  };

  return (
    <div className="Claims">
      <Navbar />

      <div className="claims-container">
        <div className="claims-header">
          <div>
            <h2>Claims</h2>
            <p>{stats.total} claims in total</p>
          </div>

          <div className="claims-actions">
            <label
              className={`import-btn ${
                importing ? "disabled" : ""
              }`}
            >
              {importing ? "Importing..." : "Import Excel"}

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={importExcel}
                disabled={importing}
                hidden
              />
            </label>

            <button
              className="add-btn"
              onClick={openAdd}
              disabled={importing}
            >
              + Add Claim
            </button>
          </div>
        </div>

        <div className="claims-stat-grid">
          <div className="claims-stat-card">
            <span className="claims-stat-label">
              Open claims
            </span>
            <strong>{stats.open}</strong>
          </div>

          <div className="claims-stat-card">
            <span className="claims-stat-label">
              Third-party recoveries
            </span>
            <strong>{stats.thirdParty}</strong>
          </div>

          <div className="claims-stat-card claims-stat-complete">
            <span className="claims-stat-label">
              Finalised claims
            </span>
            <strong>{stats.finalised}</strong>
          </div>
        </div>

        <div className="claims-tabs">
          <button
            className={tab === "open" ? "active" : ""}
            onClick={() => setTab("open")}
          >
            Open Claims ({stats.open})
          </button>

          <button
            className={tab === "third-party" ? "active" : ""}
            onClick={() => setTab("third-party")}
          >
            Third-Party Recoveries ({stats.thirdParty})
          </button>

          <button
            className={tab === "finalised" ? "active" : ""}
            onClick={() => setTab("finalised")}
          >
            Finalised Claims ({stats.finalised})
          </button>
        </div>

        <input
          className="claim-search"
          placeholder="Search by claim number or client name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="claim-table-wrapper">
          <table className="claim-table">
            <thead>
              <tr>
                <th>Claim date</th>
                <th>Claim number</th>
                <th>Folder directory</th>
                <th>Client name</th>
                <th>Type / recovery</th>
                <th>Progress</th>
                <th>Assessor appointment</th>
                <th>History</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>

            <tbody>
              {visibleClaims.map((claim) => (
                <tr key={claim.id}>
                  <td>
                    {dateLabel(
                      claim.claimDate || claim.createdAt
                    )}
                  </td>

                  {/* Claim number is now plain text */}
                  <td>{claim.claimNumber || "—"}</td>

                  {/* Separate folder link */}
                  <td>
                    {claim.documentFolderPath ? (
                      <button
                        className="claim-folder-link"
                        onClick={() => openFolder(claim)}
                      >
                        Open folder
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>{claim.clientName || "—"}</td>

                  <td>
                    {claim.recoveryProvider ||
                      claim.claimType ||
                      claim.typeOfClaim ||
                      "—"}
                  </td>

                  <td>
                    <div className="claim-progress-cell">
                      <strong>{progress(claim)}%</strong>

                      <div className="claim-progress-track">
                        <span
                          style={{
                            width: `${progress(claim)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td>
                    {dateLabel(
                      claim.assessorAppointmentDate ||
                        claim.assessorAppointed
                    )}
                  </td>

                  <td>
                    <button
                      className="history-btn"
                      onClick={() => setHistoryClaim(claim)}
                    >
                      View ({allHistory(claim).length})
                    </button>
                  </td>

                  <td className="actions-cell">
                    <button
                      className="edit-btn"
                      onClick={() => openEdit(claim)}
                    >
                      Edit
                    </button>

                    {tab !== "finalised" && (
                      <button
                        className="edit-btn"
                        onClick={() => finaliseClaim(claim)}
                      >
                        Finalise
                      </button>
                    )}

                    <button
                      className="delete-btn"
                      onClick={() => deleteClaim(claim)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!visibleClaims.length && (
            <div className="no-claims">
              No matching claims found
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="claim-modal-overlay"
          onMouseDown={(e) =>
            e.target === e.currentTarget && closeModal()
          }
        >
          <div className="claim-modal claim-modal-wide">
            <div className="modal-header">
              <div>
                <h2>{editing ? "Edit Claim" : "Add Claim"}</h2>
                <p>
                  Claim details, milestones, documents and
                  follow-ups.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="claim-form">
              <h3>Claim details</h3>

              <div className="claim-form-grid">
                <label>
                  Claim number
                  <input
                    name="claimNumber"
                    value={form.claimNumber}
                    onChange={change}
                  />
                </label>

                <label>
                  Client name
                  <input
                    name="clientName"
                    value={form.clientName}
                    onChange={change}
                  />
                </label>

                <label>
                  Claim date
                  <input
                    type="date"
                    name="claimDate"
                    value={form.claimDate || ""}
                    onChange={change}
                  />
                </label>

                <label>
                  Claim type
                  <input
                    name="claimType"
                    value={form.claimType || ""}
                    onChange={change}
                  />
                </label>

                <label>
                  Claim category
                  <select
                    name="claimCategory"
                    value={form.claimCategory || "open"}
                    onChange={change}
                  >
                    <option value="open">Open claim</option>
                    <option value="third-party">
                      Third-party recovery
                    </option>
                  </select>
                </label>

                <label>
                  Recovery provider
                  <input
                    name="recoveryProvider"
                    placeholder="e.g. WeBuyCars"
                    value={form.recoveryProvider || ""}
                    onChange={change}
                  />
                </label>

                <label>
                  Outstanding documents / details
                  <input
                    name="documentsDetailsOutstanding"
                    value={
                      form.documentsDetailsOutstanding || ""
                    }
                    onChange={change}
                  />
                </label>

                {/* New manual folder directory field */}
                <label>
                  Folder directory
                  <input
                    name="documentFolderPath"
                    value={form.documentFolderPath || ""}
                    onChange={change}
                    placeholder="Enter the existing folder directory path"
                  />
                </label>
              </div>

              <h3>Assessor details</h3>

              <div className="claim-form-grid">
                <label>
                  Assessor name
                  <input
                    name="assessorName"
                    value={form.assessorName || ""}
                    onChange={change}
                  />
                </label>

                <label>
                  Phone number
                  <input
                    name="assessorPhone"
                    value={form.assessorPhone || ""}
                    onChange={change}
                  />
                </label>

                <label>
                  Email address
                  <input
                    type="email"
                    name="assessorEmail"
                    value={form.assessorEmail || ""}
                    onChange={change}
                  />
                </label>

                <label>
                  Appointment date
                  <input
                    type="date"
                    name="assessorAppointmentDate"
                    value={
                      form.assessorAppointmentDate || ""
                    }
                    onChange={change}
                  />
                </label>
              </div>

              <h3>Milestone dates and notes</h3>

              <div className="claim-inline-entry">
                <select
                  value={stageKey}
                  onChange={(e) => setStageKey(e.target.value)}
                >
                  {stages.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={stageDate}
                  onChange={(e) => setStageDate(e.target.value)}
                />

                <input
                  placeholder="Stage note (optional)"
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                />

                <button
                  type="button"
                  onClick={addStageUpdate}
                >
                  Add date
                </button>
              </div>

              {[
                ...existingMilestones,
                ...(form.milestoneDates || []),
              ].length > 0 && (
                <ul className="claim-entry-list">
                  {[
                    ...existingMilestones,
                    ...(form.milestoneDates || []),
                  ].map((item, i) => (
                    <li key={i}>
                      {item.label}: {dateLabel(item.date)}{" "}
                      {item.note && `— ${item.note}`}
                    </li>
                  ))}
                </ul>
              )}

              <h3>Panelbeater / IOL follow-ups</h3>

              <div className="claim-inline-entry">
                <select
                  value={followUpType}
                  onChange={(e) =>
                    setFollowUpType(e.target.value)
                  }
                >
                  <option>Panelbeater</option>
                  <option>IOL</option>
                  <option>Other</option>
                </select>

                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) =>
                    setFollowUpDate(e.target.value)
                  }
                />

                <input
                  placeholder="Follow-up note (optional)"
                  value={followUpNote}
                  onChange={(e) =>
                    setFollowUpNote(e.target.value)
                  }
                />

                <button
                  type="button"
                  onClick={addFollowUp}
                >
                  Add follow-up
                </button>
              </div>

              {[
                ...existingFollowUps,
                ...(form.followUps || []),
              ].length > 0 && (
                <ul className="claim-entry-list">
                  {[
                    ...existingFollowUps,
                    ...(form.followUps || []),
                  ].map((item, i) => (
                    <li key={i}>
                      {item.type}: {dateLabel(item.date)}{" "}
                      {item.note && `— ${item.note}`}
                    </li>
                  ))}
                </ul>
              )}

              <h3>Document checklist</h3>

              <label className="document-date-label">
                Date received for the next document
                <input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                />
              </label>

              <div className="claim-document-grid">
                {documentTypes.map((name) => (
                  <label key={name}>
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        addDocument(name, e.target.checked)
                      }
                    />
                    {name}
                  </label>
                ))}
              </div>

              {[
                ...existingDocuments,
                ...(form.documentChecklist || []),
              ].length > 0 && (
                <ul className="claim-entry-list">
                  {[
                    ...existingDocuments,
                    ...(form.documentChecklist || []),
                  ].map((item, i) => (
                    <li key={i}>
                      {item.name} received{" "}
                      {dateLabel(item.date)}
                    </li>
                  ))}
                </ul>
              )}

              <h3>Finalisation</h3>

              <div className="claim-form-grid">
                <label>
                  Finalisation date
                  <input
                    type="date"
                    name="finalisationDate"
                    value={form.finalisationDate || ""}
                    onChange={change}
                  />
                </label>

                <label>
                  Reason / explanatory note
                  <input
                    name="finalisationReason"
                    value={form.finalisationReason || ""}
                    onChange={change}
                    placeholder="Cash payment, correction, etc."
                  />
                </label>
              </div>

              <h3>Add note</h3>

              <div className="claim-inline-entry">
                <input
                  id="claim-new-note"
                  placeholder="Enter a claim note"
                  value={newNote}
                  onChange={(e) =>
                    setNewNote(e.target.value)
                  }
                />

                <button
                  type="button"
                  onClick={() => {
                    if (newNote.trim()) {
                      setForm((prev) => ({
                        ...prev,
                        notes: [
                          ...(prev.notes || []),
                          {
                            text: newNote.trim(),
                            createdAt: new Date().toISOString(),
                          },
                        ],
                      }));

                      setNewNote("");
                    }
                  }}
                >
                  Add note
                </button>
              </div>

              {[
                ...existingNotes,
                ...(form.notes || []),
              ].length > 0 && (
                <ul className="claim-entry-list">
                  {[
                    ...existingNotes,
                    ...(form.notes || []),
                  ].map((item, i) => (
                    <li key={i}>{item.text}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="save-btn"
                onClick={saveClaim}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editing
                  ? "Update Claim"
                  : "Add Claim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyClaim && (
        <div
          className="claim-modal-overlay"
          onMouseDown={(e) =>
            e.target === e.currentTarget &&
            setHistoryClaim(null)
          }
        >
          <div className="claim-modal claim-history-modal">
            <div className="modal-header">
              <div>
                <h2>Claim history</h2>
                <p>
                  {historyClaim.claimNumber} —{" "}
                  {historyClaim.clientName}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setHistoryClaim(null)}
              >
                ×
              </button>
            </div>

            <div className="claim-history-list">
              {allHistory(historyClaim).map((item, i) => (
                <div
                  className="claim-history-item"
                  key={i}
                >
                  <strong>{item.action || "Update"}</strong>

                  <span>
                    {item.details || item.text || ""}
                  </span>

                  <small>
                    {dateLabel(
                      item.timestamp ||
                        item.createdAt ||
                        item.date
                    )}{" "}
                    {item.user ? `· ${item.user}` : ""}
                  </small>
                </div>
              ))}

              {!allHistory(historyClaim).length && (
                <p>No history recorded yet.</p>
              )}
            </div>

            <div className="claim-inline-entry">
              <input
                placeholder="Add a note to the history"
                value={newNote}
                onChange={(e) =>
                  setNewNote(e.target.value)
                }
              />

              <button onClick={addNote}>
                Add note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClaimsPage;