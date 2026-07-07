import "./Sms.css"
import React, { useState, useEffect } from 'react'
import Navbar from "../Navbar/Navbar"
import axios from "axios"
import { serverUrl } from "../../serverUrl"
import { toast } from "react-toastify"
import * as XLSX from "xlsx"

function Sms() {

    const [clients, setClients] = useState([])
    const [selectedNumbers, setSelectedNumbers] = useState([])
    const [message, setMessage] = useState("")
    const [sending, setSending] = useState(false)
    const [search, setSearch] = useState("")
    const [excelNumbers, setExcelNumbers] = useState([])

    useEffect(() => {
        axios.get(`${serverUrl}clients`)
            .then((data) => {
                setClients(data.data)
            })
            .catch(err => {
                console.error(err)
            })
    }, [])

    function toggleClient(phoneNumber) {

        setSelectedNumbers(prev => {

            if (prev.includes(phoneNumber)) {
                return prev.filter(number => number !== phoneNumber)
            }

            return [...prev, phoneNumber]
        })
    }

    const filteredClients = clients.filter(client => {

        const searchTerm = search.toLowerCase()

        return (
            client.name?.toLowerCase().includes(searchTerm) ||
            client.surname?.toLowerCase().includes(searchTerm) ||
            client.phoneNumber?.includes(searchTerm) ||
            client.email?.toLowerCase().includes(searchTerm) ||
            client.idNumber?.includes(searchTerm)
        )
    })

    function selectAllFiltered() {

        const numbers = filteredClients.map(
            client => client.phoneNumber
        )

        setSelectedNumbers(numbers)
    }

    function clearSelection() {
        setSelectedNumbers([])
    }

async function sendSms() {

    const allNumbers = [
        ...selectedNumbers,
        ...excelNumbers
    ]

    const uniqueNumbers = [...new Set(allNumbers)]

    if (uniqueNumbers.length === 0) {
        toast.error("Please select clients or upload an Excel file")
        return
    }

    if (!message.trim()) {
        toast.error("Please enter a message")
        return
    }

    try {

        setSending(true)

        await axios.post(`${serverUrl}send-sms`, {
            numbers: uniqueNumbers,
            message
        })

        toast.success(
            `SMS queued for ${uniqueNumbers.length} recipients`
        )

        setMessage("")
        setSelectedNumbers([])
        setExcelNumbers([])

    } catch (err) {

        console.error(err)

        toast.error("Failed to send SMS")

    } finally {

        setSending(false)
    }
}

const handleExcelUpload = (event) => {

    const file = event.target.files[0]

    if (!file) return

    const reader = new FileReader()

    reader.onload = (e) => {

        try {

            const data = new Uint8Array(
                e.target.result
            )

            const workbook = XLSX.read(data, {
                type: "array"
            })

            const sheetName =
                workbook.SheetNames[0]

            const worksheet =
                workbook.Sheets[sheetName]

            const json =
                XLSX.utils.sheet_to_json(
                    worksheet,
                    { header: 1 }
                )

            const numbers = [
                ...new Set(
                    json
                        .flat()
                        .filter(Boolean)
                        .map(value =>
                            String(value)
                                .replace(/\s/g, "")
                                .replace("+", "")
                        )
                        .filter(number =>
                            /^27\d{9}$/.test(number)
                        )
                )
            ]

            setExcelNumbers(numbers)

            toast.success(
                `${numbers.length} valid numbers imported`
            )

        } catch (err) {

            console.error(err)

            toast.error(
                "Failed to read Excel file"
            )
        }
    }

    reader.readAsArrayBuffer(file)
}

    return (
        <div className="Sms">

            <Navbar />

            <div className="sms-container">

                <h2>Send SMS</h2>

                <div className="message-section">

                    <textarea
                        placeholder="Type your SMS message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />

<p>
    CRM Recipients:
    <strong> {selectedNumbers.length}</strong>
    {" | "}
    Excel Recipients:
    <strong> {excelNumbers.length}</strong>
    {" | "}
    Total:
    <strong>
        {
            [...new Set([
                ...selectedNumbers,
                ...excelNumbers
            ])].length
        }
    </strong>
</p>

{excelNumbers.length > 0 && (

    <button
        className="secondary-btn"
        onClick={() => {
            setExcelNumbers([])
            toast.info("Excel list cleared")
        }}
    >
        Clear Excel List
    </button>

)}

                </div>

                <input
                    type="text"
                    className="search-input"
                    placeholder="Search by name, surname, phone, email or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="action-buttons">

                    <button
                        className="secondary-btn"
                        onClick={selectAllFiltered}
                    >
                        Select Filtered
                    </button>

                    <button
                        className="secondary-btn"
                        onClick={clearSelection}
                    >
                        Clear Selection
                    </button>

                </div>
                <div className="excel-upload">

    <label>
        Upload Excel File
    </label>

    <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleExcelUpload}
    />
    <br/>

    {excelNumbers.length > 0 && (
        <p>
            Imported Numbers:
            <strong>
                {" "}
                {excelNumbers.length}
            </strong>
        </p>
    )}

</div>

                <div className="client-list">

                    {filteredClients.map((client) => (

                        <div
                            key={client.id}
                            className="client-item"
                        >

                            <div className="client-left">

                                <input
                                    type="checkbox"
                                    checked={selectedNumbers.includes(client.phoneNumber)}
                                    onChange={() => toggleClient(client.phoneNumber)}
                                />

                                <div>
                                    <h4>
                                        {client.name} {client.surname}
                                    </h4>

                                    <p>{client.phoneNumber}</p>
                                </div>

                            </div>

                        </div>

                    ))}

                </div>

                <button
                    className="send-btn"
                    onClick={sendSms}
                    disabled={sending}
                >
                    {sending ? "Sending..." : "Send SMS"}
                </button>

            </div>

        </div>
    )
}

export default Sms