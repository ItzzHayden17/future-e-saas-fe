import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../../Components/Navbar/Navbar";
import { serverUrl } from "../../serverUrl";
import { toast } from "react-toastify";
import "./UsersPage.css";

const emptyForm = {
  username: "",
  email: "",
  password: "",
  admin: false,
  marketing: false,
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    email: "",
    password: "",
    admin: false,
    marketing: false,
  });
  const [loading, setLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadUsers() {
    try {
      const response = await axios.get(`${serverUrl}users`);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          "Unable to load users. Administrator access is required."
      );
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser(event) {
    event.preventDefault();

    try {
      setLoading(true);

      await axios.post(`${serverUrl}create-user`, {
        username: form.username,
        email: form.email,
        password: form.password,
        admin: form.admin,
        marketing: form.marketing,
      });

      toast.success("User created");
      setForm(emptyForm);
      await loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  function editUser(user) {
    setEditing(user);

    setEditForm({
      email: user.email || "",
      password: "",
      admin: Boolean(user.rights?.admin),
      marketing: Boolean(user.rights?.marketing),
    });
  }

  function closeEditModal() {
    if (savingEdit) return;

    setEditing(null);
    setEditForm({
      email: "",
      password: "",
      admin: false,
      marketing: false,
    });
  }

  useEffect(() => {
    if (!editing) return;

    function handleEscape(event) {
      if (event.key === "Escape" && !savingEdit) {
        closeEditModal();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [editing, savingEdit]);

  async function updateUser(event) {
    event.preventDefault();

    if (!editing) return;

    try {
      setSavingEdit(true);

      const changes = {
        email: editForm.email,
        password: editForm.password,
        rights: {
          ...(editing.rights || {}),
          user: true,
          admin: editForm.admin,
          marketing: editForm.marketing,
        },
      };

      await axios.patch(`${serverUrl}users/${editing.id}`, changes);

      toast.success("User updated");
      setEditing(null);
      await loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="UsersPage">
      <Navbar />

      <main className="users-container">
        <div className="users-heading">
          <div>
            <span className="users-eyebrow">ADMINISTRATION</span>
            <h2>User management</h2>
            <p>Manage user accounts and access permissions.</p>
          </div>

          <div className="users-count">
            <strong>{users.length}</strong>
            <span>Total users</span>
          </div>
        </div>

        {/* CREATE USER */}
        <section className="users-panel">
          <div className="users-panel-heading">
            <div>
              <h3>Create a user</h3>
              <p>Add a new account to your platform.</p>
            </div>
            <span className="users-panel-icon">+</span>
          </div>

          <form onSubmit={createUser} className="create-user-form">
            <div className="users-field">
              <label>Username</label>
              <input
                required
                placeholder="Enter username"
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value })
                }
              />
            </div>

            <div className="users-field">
              <label>Email address</label>
              <input
                required
                type="email"
                placeholder="Enter email address"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
            </div>

            <div className="users-field">
              <label>Temporary password</label>
              <input
                required
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
            </div>

            <div className="users-permissions">
              <label className="users-checkbox">
                <input
                  type="checkbox"
                  checked={form.admin}
                  onChange={(e) =>
                    setForm({ ...form, admin: e.target.checked })
                  }
                />
                <span className="custom-checkbox" />
                <span>
                  <strong>Administrator</strong>
                  <small>Full administrative access</small>
                </span>
              </label>

              <label className="users-checkbox">
                <input
                  type="checkbox"
                  checked={form.marketing}
                  onChange={(e) =>
                    setForm({ ...form, marketing: e.target.checked })
                  }
                />
                <span className="custom-checkbox" />
                <span>
                  <strong>Marketing</strong>
                  <small>Marketing tools and access</small>
                </span>
              </label>
            </div>

            <button className="users-primary-button" type="submit" disabled={loading}>
              {loading ? "Creating user..." : "Create user"}
            </button>
          </form>
        </section>

        {/* USERS TABLE */}
        <section className="users-panel users-list-panel">
          <div className="users-panel-heading">
            <div>
              <h3>Registered users</h3>
              <p>View and manage existing accounts.</p>
            </div>
          </div>

          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email address</th>
                  <th>Permissions</th>
                  <th className="users-actions-heading">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="users-empty">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const rights = Object.keys(user.rights || {}).filter(
                      (key) => user.rights[key]
                    );

                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="users-user-cell">
                            <div className="users-avatar">
                              {(user.username || "?").charAt(0).toUpperCase()}
                            </div>
                            <strong>{user.username}</strong>
                          </div>
                        </td>

                        <td className="users-email">{user.email}</td>

                        <td>
                          <div className="users-rights">
                            {rights.length ? (
                              rights.map((right) => (
                                <span
                                  key={right}
                                  className={`users-right-badge ${right}`}
                                >
                                  {right}
                                </span>
                              ))
                            ) : (
                              <span className="users-no-rights">No permissions</span>
                            )}
                          </div>
                        </td>

                        <td className="users-actions">
                          <button
                            type="button"
                            className="users-edit-button"
                            onClick={() => editUser(user)}
                          >
                            <span>✎</span> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* EDIT USER MODAL */}
      {editing && (
        <div
          className="users-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditModal();
            }
          }}
        >
          <div
            className="users-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
          >
            <div className="users-modal-header">
              <div className="users-modal-title">
                <div className="users-modal-avatar">
                  {(editing.username || "?").charAt(0).toUpperCase()}
                </div>

                <div>
                  <span className="users-eyebrow">USER SETTINGS</span>
                  <h3 id="edit-user-title">Edit user</h3>
                  <p>Update account details and permissions.</p>
                </div>
              </div>

              <button
                type="button"
                className="users-modal-close"
                onClick={closeEditModal}
                disabled={savingEdit}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={updateUser}>
              <div className="users-modal-body">
                <div className="users-edit-identity">
                  <span>EDITING ACCOUNT</span>
                  <strong>{editing.username}</strong>
                  <small>{editing.email}</small>
                </div>

                <div className="users-field">
                  <label>Email address</label>
                  <input
                    required
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    placeholder="Email address"
                  />
                </div>

                <div className="users-field">
                  <label>New password</label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    placeholder="Leave blank to keep current password"
                    autoComplete="new-password"
                  />
                  <small className="users-field-hint">
                    Only enter a password if you want to change it.
                  </small>
                </div>

                <div className="users-modal-divider" />

                <div className="users-permissions-heading">
                  <div>
                    <h4>Access permissions</h4>
                    <p>Choose which areas this user can access.</p>
                  </div>
                </div>

                <div className="users-modal-permissions">
                  <label className="users-permission-option">
                    <div className="users-permission-description">
                      <div className="users-permission-icon admin-icon">A</div>
                      <div>
                        <strong>Administrator access</strong>
                        <small>Can access administrative features.</small>
                      </div>
                    </div>

                    <span className="users-switch">
                      <input
                        type="checkbox"
                        checked={editForm.admin}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            admin: e.target.checked,
                          })
                        }
                      />
                      <span />
                    </span>
                  </label>

                  <label className="users-permission-option">
                    <div className="users-permission-description">
                      <div className="users-permission-icon marketing-icon">M</div>
                      <div>
                        <strong>Marketing access</strong>
                        <small>Can access marketing features.</small>
                      </div>
                    </div>

                    <span className="users-switch">
                      <input
                        type="checkbox"
                        checked={editForm.marketing}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            marketing: e.target.checked,
                          })
                        }
                      />
                      <span />
                    </span>
                  </label>
                </div>
              </div>

              <div className="users-modal-footer">
                <button
                  type="button"
                  className="users-cancel-button"
                  onClick={closeEditModal}
                  disabled={savingEdit}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="users-primary-button users-save-button"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving changes..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}