import "./EmailPage.css"
import React, { useState, useEffect } from "react"
import Navbar from "../../Components/Navbar/Navbar"
import axios from "axios"
import { serverUrl } from "../../serverUrl"
import { toast } from "react-toastify"
import * as XLSX from "xlsx"

function EmailPage() {

  
const [clients, setClients] = useState([])
const [selectedEmails, setSelectedEmails] = useState([])
const [excelEmails, setExcelEmails] = useState([])
const [subject, setSubject] = useState("")
const [message, setMessage] = useState("")
const [search, setSearch] = useState("")
const [sending, setSending] = useState(false)

useEffect(() => {

    axios.get(`${serverUrl}clients`)
        .then((data) => {
            setClients(data.data)
        })
        .catch(console.error)

}, [])

function toggleClient(email) {

    setSelectedEmails(prev => {

        if (prev.includes(email)) {
            return prev.filter(e => e !== email)
        }

        return [...prev, email]
    })
}

const filteredClients = clients.filter(client => {

    const term = search.toLowerCase()

    return (
        client.name?.toLowerCase().includes(term) ||
        client.surname?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term)
    )
})

const handleExcelUpload = (event) => {

    const file = event.target.files[0]

    if (!file) return

    const reader = new FileReader()

    reader.onload = (e) => {

        const workbook = XLSX.read(
            new Uint8Array(e.target.result),
            { type: "array" }
        )

        const worksheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ]

        const json =
            XLSX.utils.sheet_to_json(
                worksheet,
                { header: 1 }
            )

        const emails = [
            ...new Set(
                json.flat()
                    .filter(Boolean)
                    .map(email =>
                        String(email)
                            .trim()
                            .toLowerCase()
                    )
                    .filter(email =>
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                    )
            )
        ]

        setExcelEmails(emails)

        toast.success(
            `${emails.length} emails imported`
        )
    }

    reader.readAsArrayBuffer(file)
}

async function sendEmails() {

    const allEmails = [
        ...selectedEmails,
        ...excelEmails
    ]

    const uniqueEmails =
        [...new Set(allEmails)]

    if (uniqueEmails.length === 0) {
        toast.error("No recipients selected")
        return
    }

    if (!subject.trim()) {
        toast.error("Enter a subject")
        return
    }

    if (!message.trim()) {
        toast.error("Enter a message")
        return
    }

    try {

        setSending(true)

        await axios.post(
            `${serverUrl}send-email`,
            {
                emails: uniqueEmails,
                subject,
                message
            }
        )

        toast.success(
            `Emails sent to ${uniqueEmails.length} recipients`
        )

        setSubject("")
        setMessage("")
        setSelectedEmails([])
        setExcelEmails([])

    } catch (err) {

        console.error(err)

        toast.error(
            "Failed to send emails"
        )

    } finally {

        setSending(false)
    }
}

return (
    <div className="Email">

        <Navbar />

        <div className="email-container">

            <h2>Send Email</h2>

            <input
                className="subject-input"
                placeholder="Email Subject"
                value={subject}
                onChange={(e) =>
                    setSubject(e.target.value)
                }
            />

            <textarea
                placeholder="Email Message"
                value={message}
                onChange={(e) =>
                    setMessage(e.target.value)
                }
            />

            <input
                type="text"
                className="search-input"
                placeholder="Search Clients..."
                value={search}
                onChange={(e) =>
                    setSearch(e.target.value)
                }
            />

            <div className="excel-upload">

                <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                />

            </div>

            <p>
                CRM: {selectedEmails.length}
                {" | "}
                Excel: {excelEmails.length}
                {" | "}
                Total: {
                    [...new Set([
                        ...selectedEmails,
                        ...excelEmails
                    ])].length
                }
            </p>

            <div className="client-list">

                {filteredClients.map(client => (

                    <div
                        key={client.id}
                        className="client-item"
                    >

                        <input
                            type="checkbox"
                            checked={
                                selectedEmails.includes(
                                    client.email
                                )
                            }
                            onChange={() =>
                                toggleClient(
                                    client.email
                                )
                            }
                        />

                        <div>

                            <h4>
                                {client.name} {client.surname}
                            </h4>

                            <p>
                                {client.email}
                            </p>

                        </div>

                    </div>

                ))}

            </div>

            <button
                className="send-btn"
                onClick={sendEmails}
                disabled={sending}
            >
                {
                    sending
                        ? "Sending..."
                        : "Send Email"
                }
            </button>

        </div>

    </div>
)
  

}

export default EmailPage
