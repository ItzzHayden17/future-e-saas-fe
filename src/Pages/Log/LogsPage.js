import "./LogsPage.css";
import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../Components/Navbar/Navbar";
import axios from "axios";
import { serverUrl } from "../../serverUrl";
import { toast } from "react-toastify";

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      setLoading(true);

      const response = await axios.get(
        `${serverUrl}history`
      );

      setLogs(response.data || []);

    } catch (error) {

      console.error(
        "Failed to load logs:",
        error
      );

      toast.error(
        "Failed to load logs"
      );

    } finally {
      setLoading(false);
    }
  }

  function formatTimestamp(timestamp) {

    if (!timestamp) {
      return "";
    }

    let date;

    /*
     * Firebase Admin SDK timestamps may arrive
     * as an object containing seconds/nanoseconds.
     */

    if (
      typeof timestamp === "object" &&
      timestamp._seconds
    ) {

      date = new Date(
        timestamp._seconds * 1000 +
        Math.floor(
          (timestamp._nanoseconds || 0) / 1000000
        )
      );

    } else {

      date = new Date(timestamp);

    }

    if (isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString();
  }

  const filteredLogs = useMemo(() => {

    const term =
      search
        .toLowerCase()
        .trim();

    if (!term) {
      return logs;
    }

    return logs.filter((log) => {

      return (
        String(log.user || "")
          .toLowerCase()
          .includes(term) ||

        String(log.route || "")
          .toLowerCase()
          .includes(term) ||

        String(log.action || "")
          .toLowerCase()
          .includes(term) ||

        formatTimestamp(log.timestamp)
          .toLowerCase()
          .includes(term)
      );

    });

  }, [logs, search]);

  return (

    <div className="Logs">

      <Navbar />

      <div className="logs-container">

        {/* HEADER */}

        <div className="logs-header">

          <div>

            <h2>
              System Logs
            </h2>

            <p>
              {logs.length} log
              {logs.length === 1 ? "" : "s"}
            </p>

          </div>

          <div className="logs-actions">

            <button
              className="refresh-btn"
              onClick={loadLogs}
              disabled={loading}
            >
              {loading
                ? "Loading..."
                : "↻ Refresh"}
            </button>

          </div>

        </div>


        {/* SEARCH */}

        <input
          className="logs-search"
          type="text"
          placeholder="Search logs..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />


        {/* TABLE */}

        <div className="logs-table-wrapper">

          <table className="logs-table">

            <thead>

              <tr>

                <th>
                  Date & Time
                </th>

                <th>
                  User
                </th>

                <th>
                  Route
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>


            <tbody>

              {loading ? (

                <tr>

                  <td
                    colSpan="4"
                    className="logs-loading"
                  >
                    Loading logs...
                  </td>

                </tr>

              ) : filteredLogs.length > 0 ? (

                filteredLogs.map(
                  (log, index) => (

                    <tr
                      key={
                        log.id ||
                        index
                      }
                    >

                      <td>
                        {formatTimestamp(
                          log.timestamp
                        )}
                      </td>

                      <td>

                        <span className="log-user">

                          {log.user ||
                            "Unknown"}

                        </span>

                      </td>

                      <td>

                        <span className="log-route">

                          {log.route ||
                            "-"}

                        </span>

                      </td>

                      <td>

                        <span className="log-action">

                          {log.action ||
                            "-"}

                        </span>

                      </td>

                    </tr>

                  )
                )

              ) : (

                <tr>

                  <td
                    colSpan="4"
                    className="no-logs"
                  >

                    {search
                      ? "No logs found"
                      : "No logs available"}

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>


        {/* FOOTER */}

        {!loading &&
          filteredLogs.length > 0 && (

            <div className="logs-footer">

              Showing{" "}
              <strong>
                {filteredLogs.length}
              </strong>{" "}
              of{" "}
              <strong>
                {logs.length}
              </strong>{" "}
              logs

            </div>

          )}

      </div>

    </div>

  );
}

export default LogsPage;