
import "./ClaimsPage.css";
import React, { useEffect, useState } from "react";
import Navbar from "../../Components/Navbar/Navbar";
import axios from "axios";
import { serverUrl } from "../../serverUrl";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const fields = [
  "Notification received",
  "Type of claim",
  "Documents received",
  "Documents/details outstanding",
  "Claim to insurer",
  "Claim registered",
  "Assessor appointed",
  "Report received from assessor",
  "Authorization received",
  "AOL received/replacement",
  "Panelbeater followed up",
  "Payment received",
  "Claim finalised",
];

const fieldKey = (field) =>
  field
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");

const emptyClaim = fields.reduce((obj, field) => {
  obj[fieldKey(field)] = "";
  return obj;
}, {});

// Actual workflow milestones.
// Descriptive fields and outstanding-document notes are not milestones.
const milestones = [
  "notificationReceived",
  "documentsReceived",
  "claimToInsurer",
  "claimRegistered",
  "assessorAppointed",
  "reportReceivedFromAssessor",
  "authorizationReceived",
  "aolReceivedReplacement",
  "panelbeaterFollowedUp",
  "paymentReceived",
  "claimFinalised",
];

// Interpret common text values used to indicate an incomplete milestone.
function isCompleted(value) {
  const text = String(value ?? "").trim();

  if (!text) return false;

  return !/^(no\b|not yet\b|pending\b|outstanding\b|incomplete\b|awaiting\b|not received\b|not appointed\b|not registered\b|not authorised\b|not authorized\b|not paid\b|not finalised\b|not finalized\b|false$|0$)/i.test(
    text
  );
}

function isFinalised(claim) {
  return isCompleted(claim.claimFinalised);
}

function hasOutstandingDocuments(claim) {
  const value = String(
    claim.documentsDetailsOutstanding ?? ""
  ).trim();

  if (!value) return false;

  return !/^(no|none|n\/a|na|nothing|nil|no outstanding documents|no documents outstanding)$/i.test(
    value
  );
}

// A claim marked as finalised counts as fully complete.
// Otherwise, count the milestones actually marked as completed.
function getCompletedMilestones(claim) {
  if (isFinalised(claim)) {
    return milestones.length;
  }

  return milestones.filter((milestone) =>
    isCompleted(claim[milestone])
  ).length;
}

function getClaimProgress(claim) {
  return Math.round(
    (getCompletedMilestones(claim) / milestones.length) * 100
  );
}

function getOverallStats(claims) {
  const total = claims.length;

  const finalised = claims.filter(isFinalised).length;

  const inProgress = claims.filter(
    (claim) =>
      !isFinalised(claim) &&
      getCompletedMilestones(claim) > 0
  ).length;

  const notStarted = total - finalised - inProgress;

  const outstanding = claims.filter(
    hasOutstandingDocuments
  ).length;

  const possibleMilestones = total * milestones.length;

  const completedMilestones = claims.reduce(
    (sum, claim) => sum + getCompletedMilestones(claim),
    0
  );

  const overallProgress =
    possibleMilestones === 0
      ? 0
      : Math.round(
          (completedMilestones / possibleMilestones) * 100
        );

  return {
    total,
    finalised,
    inProgress,
    notStarted,
    outstanding,
    overallProgress,
  };
}

function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [formData, setFormData] = useState({ ...emptyClaim });
  const [saving, setSaving] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

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

  function openAddModal() {
    setEditingClaim(null);
    setFormData({ ...emptyClaim });
    setShowModal(true);
  }

  function openEditModal(claim) {
    setEditingClaim(claim);

    const newData = { ...emptyClaim };

    fields.forEach((field) => {
      const key = fieldKey(field);
      newData[key] = claim[key] ?? "";
    });

    setFormData(newData);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingClaim(null);
    setFormData({ ...emptyClaim });
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function saveClaim() {
    try {
      setSaving(true);

      if (editingClaim) {
        await axios.patch(
          `${serverUrl}claims/${editingClaim.id}`,
          formData
        );

        toast.success("Claim updated successfully");
      } else {
        await axios.post(`${serverUrl}claims`, formData);

        toast.success("Claim added successfully");
      }

      closeModal();
      await loadClaims();
    } catch (error) {
      console.error(error);

      toast.error(
        editingClaim
          ? "Failed to update claim"
          : "Failed to add claim"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteClaim(claim) {
    const confirmed = window.confirm(
      "Delete this claim? This action cannot be undone."
    );

    if (!confirmed) return;

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

  function handleExcelUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(
          new Uint8Array(e.target.result),
          { type: "array" }
        );

        const worksheet =
          workbook.Sheets[workbook.SheetNames[0]];

        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
        });

        if (!rows.length) {
          toast.error("The Excel file contains no data");
          return;
        }

        const mappedClaims = rows.map((row) => {
          const claim = { ...emptyClaim };

          fields.forEach((field) => {
            const key = fieldKey(field);

            if (row[field] !== undefined) {
              claim[key] = String(row[field] ?? "");
            } else if (row[key] !== undefined) {
              claim[key] = String(row[key] ?? "");
            }
          });

          return claim;
        });

        setImporting(true);
        setSaving(true);
        setImportTotal(mappedClaims.length);
        setImportProgress(0);
        setImportedCount(0);
        setFailedCount(0);

        let imported = 0;
        let failed = 0;

        for (let i = 0; i < mappedClaims.length; i++) {
          try {
            await axios.post(
              `${serverUrl}claims`,
              mappedClaims[i]
            );

            imported++;
            setImportedCount(imported);
          } catch (error) {
            failed++;
            setFailedCount(failed);

            console.error(
              "Failed to import claim:",
              mappedClaims[i],
              error
            );
          }

          setImportProgress(
            Math.round(((i + 1) / mappedClaims.length) * 100)
          );
        }

        await loadClaims();

        if (failed === 0) {
          toast.success(
            `${imported} claims imported successfully`
          );
        } else {
          toast.warning(
            `${imported} imported, ${failed} failed`
          );
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to import Excel file");
      } finally {
        setSaving(false);
        setImporting(false);
        setImportProgress(0);
        setImportTotal(0);
        setImportedCount(0);
        setFailedCount(0);
        event.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  }

  const term = search.trim().toLowerCase();

  const filteredClaims = claims.filter((claim) =>
    fields.some((field) =>
      String(claim[fieldKey(field)] ?? "")
        .toLowerCase()
        .includes(term)
    )
  );

  const stats = getOverallStats(claims);

  return (
    <div className="Claims">
      <Navbar />

      <div className="claims-container">
        <div className="claims-header">
          <div>
            <h2>Claims</h2>
            <p>
              {claims.length} claim
              {claims.length === 1 ? "" : "s"} in total
            </p>
          </div>

          <div className="claims-actions">
            <label
              className={`import-btn ${importing ? "disabled" : ""}`}
            >
              {importing ? "Importing..." : "Import Excel"}

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                disabled={importing}
                hidden
              />
            </label>

            <button
              className="add-btn"
              onClick={openAddModal}
              disabled={importing}
            >
              + Add Claim
            </button>
          </div>
        </div>

        {/* OWNER OVERVIEW */}
        <section className="claims-overview">
          <div className="claims-overview-heading">
            <div>
              <span className="claims-eyebrow">
                BUSINESS OVERVIEW
              </span>

              <h3>Overall claims progress</h3>

              <p>
                Progress across all {stats.total} current{" "}
                {stats.total === 1 ? "claim" : "claims"}.
              </p>
            </div>

            <div className="claims-overall-percentage">
              {stats.overallProgress}%
            </div>
          </div>

          <div
            className="claims-overall-track"
            role="progressbar"
            aria-label="Overall claims progress"
            aria-valuenow={stats.overallProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`claims-overall-fill ${
                stats.overallProgress === 100 ? "complete" : ""
              }`}
              style={{
                width: `${stats.overallProgress}%`,
              }}
            />
          </div>

          <div className="claims-overall-footer">
            <span>
              {stats.finalised} of {stats.total} claims finalised
            </span>

            <span>
              {stats.overallProgress === 100
                ? "All workflow milestones completed"
                : "Based on completed workflow milestones"}
            </span>
          </div>

          <div className="claims-stat-grid">
            <div className="claims-stat-card">
              <span className="claims-stat-label">
                Total claims
              </span>
              <strong>{stats.total}</strong>
              <span className="claims-stat-description">
                All current claims
              </span>
            </div>

            <div className="claims-stat-card claims-stat-complete">
              <span className="claims-stat-label">
                Finalised
              </span>
              <strong>{stats.finalised}</strong>
              <span className="claims-stat-description">
                Completed claims
              </span>
            </div>

            <div className="claims-stat-card claims-stat-active">
              <span className="claims-stat-label">
                In progress
              </span>
              <strong>{stats.inProgress}</strong>
              <span className="claims-stat-description">
                Work has started
              </span>
            </div>

            <div className="claims-stat-card">
              <span className="claims-stat-label">
                Not started
              </span>
              <strong>{stats.notStarted}</strong>
              <span className="claims-stat-description">
                No completed milestones
              </span>
            </div>

            <div className="claims-stat-card claims-stat-outstanding">
              <span className="claims-stat-label">
                Outstanding details
              </span>
              <strong>{stats.outstanding}</strong>
              <span className="claims-stat-description">
                Claims with outstanding documents/details
              </span>
            </div>
          </div>
        </section>

        {/* EXCEL IMPORT PROGRESS */}
        {importing && (
          <div className="import-progress-container">
            <div className="import-progress-header">
              <span>Importing claims...</span>
              <span>{importProgress}%</span>
            </div>

            <div className="import-progress-bar">
              <div
                className="import-progress-fill"
                style={{ width: `${importProgress}%` }}
              />
            </div>

            <div className="import-progress-info">
              <span>{importedCount} imported</span>
              <span>{failedCount} failed</span>
              <span>{importTotal} total</span>
            </div>
          </div>
        )}

        <input
          className="claim-search"
          type="text"
          placeholder="Search claims..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={importing}
        />

        <div className="claim-table-wrapper">
          <table className="claim-table">
            <thead>
              <tr>
                {fields.map((field) => (
                  <th key={field}>{field}</th>
                ))}

                <th className="actions-header">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredClaims.map((claim, index) => (
                <tr
                  key={claim.id || index}
                  onDoubleClick={() => openEditModal(claim)}
                >
                  {fields.map((field) => (
                    <td key={field}>
                      {String(claim[fieldKey(field)] ?? "")}
                    </td>
                  ))}

                  <td className="actions-cell">
                    <button
                      className="edit-btn"
                      onClick={() => openEditModal(claim)}
                      disabled={importing}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => deleteClaim(claim)}
                      disabled={importing}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredClaims.length === 0 && (
            <div className="no-claims">
              {search
                ? "No matching claims found"
                : "No claims yet"}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="claim-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="claim-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingClaim ? "Edit Claim" : "Add Claim"}
                </h2>

                <p>
                  Update the claim's current progress and details.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="claim-form">
              {fields.map((field) => {
                const key = fieldKey(field);

                return (
                  <div className="form-group" key={field}>
                    <label htmlFor={`claim-${key}`}>
                      {field}
                    </label>

                    <input
                      id={`claim-${key}`}
                      type="text"
                      name={key}
                      value={formData[key] ?? ""}
                      onChange={handleChange}
                      placeholder={`Enter ${field.toLowerCase()}`}
                    />
                  </div>
                );
              })}
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
                disabled={saving || importing}
              >
                {saving
                  ? "Saving..."
                  : editingClaim
                    ? "Update Claim"
                    : "Add Claim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClaimsPage;
