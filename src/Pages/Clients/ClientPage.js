
import "./ClientPage.css";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Navbar from "../../Components/Navbar/Navbar";
import axios from "axios";
import { serverUrl } from "../../serverUrl";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

const fields = [
  "Database ID",
  "Client Rep",
  "Secondary Advisor",
  "Rep ID Number",
  "Product Provider",
  "FSP Type",
  "Carrier",
  "Product",
  "Type",
  "Created",
  "Client Status",
  "Client",
  "Client Type",
  "ID No",
  "Reg No",
  "Work Tel",
  "Home Tel",
  "Cell",
  "Fax",
  "Email",
  "Language",
  "Client Physical address",
  "Client Postal address",
  "Database Policy ID",
  "Client Source",
  "Policy No",
  "Insurer Product Name",
  "Policy Status",
  "Payment Type",
  "Payment Method",
  "Amendment",
  "Renewal",
  "Cancelled",
];

const fieldKey = (field) =>
  field
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");

const emptyClient = fields.reduce((obj, field) => {
  obj[fieldKey(field)] = "";
  return obj;
}, {});

function ClientPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState(emptyClient);
  const [saving, setSaving] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // Fixed horizontal scrollbar references
  const tableWrapperRef = useRef(null);
  const fixedScrollbarRef = useRef(null);
  const fixedScrollbarInnerRef = useRef(null);

  const [hasHorizontalOverflow, setHasHorizontalOverflow] =
    useState(false);

  // Load clients
  useEffect(() => {
    loadClients();
  }, []);

  // Keep the viewport-fixed scrollbar synchronised with the table.
  // It is rendered from the first mount (even while hidden), so its ref
  // is available when this effect measures the table.
  useEffect(() => {
    const wrapper = tableWrapperRef.current;
    const fixedScrollbar = fixedScrollbarRef.current;
    const inner = fixedScrollbarInnerRef.current;

    if (!wrapper || !fixedScrollbar || !inner) return;

    let syncing = false;

    const updateScrollbar = () => {
      const hasOverflow =
        wrapper.scrollWidth > wrapper.clientWidth + 1;

      setHasHorizontalOverflow(hasOverflow);

      const wrapperRect = wrapper.getBoundingClientRect();

      // Match the fixed scrollbar's visible track to the table wrapper.
      fixedScrollbar.style.left = `${wrapperRect.left}px`;
      fixedScrollbar.style.width = `${wrapper.clientWidth}px`;

      // Match its scrollable content width to the table's full width.
      inner.style.width = `${wrapper.scrollWidth}px`;

      if (!hasOverflow) {
        fixedScrollbar.scrollLeft = 0;
      } else {
        fixedScrollbar.scrollLeft = wrapper.scrollLeft;
      }
    };

    const syncFromFixed = () => {
      if (syncing) return;

      syncing = true;
      wrapper.scrollLeft = fixedScrollbar.scrollLeft;
      syncing = false;
    };

    const syncFromTable = () => {
      if (syncing) return;

      syncing = true;
      fixedScrollbar.scrollLeft = wrapper.scrollLeft;
      syncing = false;
    };

    fixedScrollbar.addEventListener("scroll", syncFromFixed);
    wrapper.addEventListener("scroll", syncFromTable);
    window.addEventListener("resize", updateScrollbar);
    window.addEventListener("scroll", updateScrollbar, { passive: true });

    let resizeObserver;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateScrollbar);
      resizeObserver.observe(wrapper);

      const table = wrapper.querySelector("table");
      if (table) resizeObserver.observe(table);
    }

    updateScrollbar();

    return () => {
      fixedScrollbar.removeEventListener("scroll", syncFromFixed);
      wrapper.removeEventListener("scroll", syncFromTable);
      window.removeEventListener("resize", updateScrollbar);
      window.removeEventListener("scroll", updateScrollbar);

      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [clients, search]);
  async function loadClients() {
    try {
      const response = await axios.get(`${serverUrl}clients`);

      setClients(
        Array.isArray(response.data)
          ? response.data
          : response.data.clients || []
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to load clients");
    }
  }

  function openAddModal() {
    setEditingClient(null);

    setFormData({
      ...emptyClient,
      created: new Date().toISOString().split("T")[0],
    });

    setShowModal(true);
  }

  function openEditModal(client) {
    setEditingClient(client);

    const newData = { ...emptyClient };

    fields.forEach((field) => {
      const key = fieldKey(field);
      newData[key] = client[key] ?? "";
    });

    setFormData(newData);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingClient(null);
    setFormData(emptyClient);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function saveClient() {
    try {
      setSaving(true);

      if (editingClient) {
        await axios.patch(
          `${serverUrl}client/${editingClient.id}`,
          formData
        );

        toast.success("Client updated successfully");
      } else {
        await axios.post(
          `${serverUrl}clients`,
          formData
        );

        toast.success("Client added successfully");
      }

      closeModal();
      await loadClients();

    } catch (error) {
      console.error(error);

      toast.error(
        editingClient
          ? "Failed to update client"
          : "Failed to add client"
      );

    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(client) {
    const confirmed = window.confirm(
      `Delete ${client.client || "this client"}?`
    );

    if (!confirmed) return;

    try {
      await axios.delete(
        `${serverUrl}client/${client.id}`
      );

      toast.success("Client deleted");

      setClients((prev) =>
        prev.filter((item) => item.id !== client.id)
      );

    } catch (error) {
      console.error(error);
      toast.error("Failed to delete client");
    }
  }

  function handleExcelUpload(event) {
    const file = event.target.files[0];

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

        const rows = XLSX.utils.sheet_to_json(
          worksheet,
          { defval: "" }
        );

        if (!rows.length) {
          toast.error("The Excel file contains no data");
          event.target.value = "";
          return;
        }

        const mappedClients = rows.map((row) => {
          const client = { ...emptyClient };

          fields.forEach((field) => {
            const key = fieldKey(field);

            if (row[field] !== undefined) {
              client[key] = row[field];
            }
          });

          return client;
        });

        setImporting(true);
        setSaving(true);

        setImportTotal(mappedClients.length);
        setImportProgress(0);
        setImportedCount(0);
        setFailedCount(0);

        let imported = 0;
        let failed = 0;

        for (let i = 0; i < mappedClients.length; i++) {
          const client = mappedClients[i];

          try {
            await axios.post(
              `${serverUrl}clients`,
              client
            );

            imported++;
            setImportedCount(imported);

          } catch (error) {
            failed++;
            setFailedCount(failed);

            console.error(
              "Failed to import client:",
              client,
              error
            );
          }

          const completed = i + 1;

          const percentage = Math.round(
            (completed / mappedClients.length) * 100
          );

          setImportProgress(percentage);
        }

        await loadClients();

        if (failed === 0) {
          toast.success(
            `${imported} clients imported successfully`
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

  const filteredClients = clients.filter((client) => {
    const term = search.toLowerCase();

    return fields.some((field) => {
      const key = fieldKey(field);

      return String(client[key] ?? "")
        .toLowerCase()
        .includes(term);
    });
  });

  return (
    <>
    <div className="Clients">

      <Navbar />

      <div className="clients-container">

        <div className="clients-header">

          <div>
            <h2>Clients</h2>

            <p>
              {clients.length} client
              {clients.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="clients-actions">

            <label
              className={
                importing
                  ? "import-btn disabled"
                  : "import-btn"
              }
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
              + Add Client
            </button>

          </div>

        </div>

        {importing && (
          <div className="import-progress-container">

            <div className="import-progress-header">
              <span>Importing clients...</span>
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
          className="client-search"
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={importing}
        />

        <div
          className="client-table-wrapper"
          ref={tableWrapperRef}
        >

          <table className="client-table">

            <thead>
              <tr>
                {fields.map((field) => (
                  <th key={field}>{field}</th>
                ))}

                <th className="actions-header">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredClients.map((client, index) => (
                <tr
                  key={
                    client.id ||
                    client.databaseId ||
                    index
                  }
                  onDoubleClick={() => openEditModal(client)}
                >

                  {fields.map((field) => {
                    const key = fieldKey(field);

                    return (
                      <td key={field}>
                        {String(client[key] ?? "")}
                      </td>
                    );
                  })}

                  <td className="actions-cell">

                    <button
                      className="edit-btn"
                      onClick={() => openEditModal(client)}
                      disabled={importing}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => deleteClient(client)}
                      disabled={importing}
                    >
                      Delete
                    </button>

                  </td>

                </tr>
              ))}
            </tbody>

          </table>

          {filteredClients.length === 0 && (
            <div className="no-clients">
              No clients found
            </div>
          )}

        </div>

      </div>

      {showModal && (
        <div className="client-modal-overlay">

          <div className="client-modal">

            <div className="modal-header">
              <h2>
                {editingClient ? "Edit Client" : "Add Client"}
              </h2>

              <button
                className="modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <div className="client-form">

              {fields.map((field) => {
                const key = fieldKey(field);

                return (
                  <div className="form-group" key={field}>

                    <label>{field}</label>

                    <input
                      type="text"
                      name={key}
                      value={formData[key] ?? ""}
                      onChange={handleChange}
                    />

                  </div>
                );
              })}

            </div>

            <div className="modal-actions">

              <button
                className="cancel-btn"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                className="save-btn"
                onClick={saveClient}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingClient
                  ? "Update Client"
                  : "Add Client"}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>

    {typeof document !== "undefined" &&
      createPortal(
        <div
          className="fixed-horizontal-scroll"
          ref={fixedScrollbarRef}
          style={{
            display:
              hasHorizontalOverflow && !showModal ? "block" : "none",
          }}
        >
          <div
            className="fixed-horizontal-scroll-inner"
            ref={fixedScrollbarInnerRef}
          />
        </div>,
        document.body
      )}
    </>
  );
}

export default ClientPage;
