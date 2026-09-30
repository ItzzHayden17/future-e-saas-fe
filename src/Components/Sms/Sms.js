import "./Sms.css";
import React, { useState, useEffect } from "react";
import Navbar from "../Navbar/Navbar";
import axios from "axios";
import { serverUrl } from "../../serverUrl";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

function Sms() {

    const [clients, setClients] = useState([]);
    const [selectedNumbers, setSelectedNumbers] = useState([]);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState("");
    const [excelNumbers, setExcelNumbers] = useState([]);

    useEffect(() => {

        axios.get(`${serverUrl}clients`)
            .then((response) => {

                console.log("CLIENT RESPONSE:", response.data);

                setClients(
                    Array.isArray(response.data.clients)
                        ? response.data.clients
                        : []
                );

            })
            .catch((error) => {

                console.error(
                    "Failed to load clients:",
                    error
                );

                toast.error("Failed to load clients");

            });

    }, []);


    // ============================================================
    // EXTRACT PHONE NUMBER
    // ============================================================

    function getPhoneNumber(client) {

        if (!client.cell) {
            return "";
        }

        /*
         * Example:
         *
         * 082 871 7629 - SUZIE
         *
         * becomes:
         *
         * 0828717629
         */

        const match =
            String(client.cell).match(
                /(?:\+27|27|0)\s*\d[\d\s-]{7,}/
            );

        if (!match) {
            return "";
        }

        let number =
            match[0]
                .replace(/\s/g, "")
                .replace(/-/g, "");

        // Convert +27XXXXXXXXX -> 27XXXXXXXXX
        number = number.replace(
            /^\+27/,
            "27"
        );

        // Convert 0XXXXXXXXX -> 27XXXXXXXXX
        if (
            number.startsWith("0") &&
            number.length === 10
        ) {

            number =
                "27" +
                number.substring(1);

        }

        return number;
    }


    // ============================================================
    // TOGGLE CLIENT
    // ============================================================

    function toggleClient(phoneNumber) {

        if (!phoneNumber) {
            toast.error("This client has no valid cell number");
            return;
        }

        setSelectedNumbers(prev => {

            if (
                prev.includes(phoneNumber)
            ) {

                return prev.filter(
                    number =>
                        number !== phoneNumber
                );

            }

            return [
                ...prev,
                phoneNumber
            ];

        });

    }


    // ============================================================
    // SEARCH
    // ============================================================

    const filteredClients =
        clients.filter(client => {

            const searchTerm =
                search.toLowerCase().trim();

            if (!searchTerm) {
                return true;
            }

            const name =
                String(
                    client.client || ""
                ).toLowerCase();

            const cell =
                String(
                    client.cell || ""
                ).toLowerCase();

            const email =
                String(
                    client.email || ""
                ).toLowerCase();

            const idNo =
                String(
                    client.idNo || ""
                ).toLowerCase();

            const databaseId =
                String(
                    client.databaseId || ""
                ).toLowerCase();

            const clientRep =
                String(
                    client.clientRep || ""
                ).toLowerCase();

            return (
                name.includes(searchTerm) ||
                cell.includes(searchTerm) ||
                email.includes(searchTerm) ||
                idNo.includes(searchTerm) ||
                databaseId.includes(searchTerm) ||
                clientRep.includes(searchTerm)
            );

        });


    // ============================================================
    // SELECT FILTERED
    // ============================================================

    function selectAllFiltered() {

        const numbers =
            filteredClients
                .map(client =>
                    getPhoneNumber(client)
                )
                .filter(Boolean);

        setSelectedNumbers(
            numbers
        );

        toast.info(
            `${numbers.length} clients selected`
        );

    }


    // ============================================================
    // CLEAR SELECTION
    // ============================================================

    function clearSelection() {

        setSelectedNumbers([]);

    }


    // ============================================================
    // SEND SMS
    // ============================================================

    async function sendSms() {

        const allNumbers = [
            ...selectedNumbers,
            ...excelNumbers
        ];

        const uniqueNumbers =
            [...new Set(allNumbers)];


        if (
            uniqueNumbers.length === 0
        ) {

            toast.error(
                "Please select clients or upload an Excel file"
            );

            return;

        }


        if (!message.trim()) {

            toast.error(
                "Please enter a message"
            );

            return;

        }


        try {

            setSending(true);


            await axios.post(
                `${serverUrl}send-sms`,
                {
                    numbers:
                        uniqueNumbers,

                    message
                }
            );


            toast.success(
                `SMS queued for ${uniqueNumbers.length} recipients`
            );


            setMessage("");

            setSelectedNumbers([]);

            setExcelNumbers([]);


        } catch (error) {

            console.error(
                "SMS ERROR:",
                error
            );

            toast.error(
                "Failed to send SMS"
            );


        } finally {

            setSending(false);

        }

    }


    // ============================================================
    // EXCEL IMPORT
    // ============================================================

    const handleExcelUpload =
        (event) => {

            const file =
                event.target.files[0];

            if (!file) {
                return;
            }


            const reader =
                new FileReader();


            reader.onload =
                (e) => {

                    try {

                        const data =
                            new Uint8Array(
                                e.target.result
                            );


                        const workbook =
                            XLSX.read(
                                data,
                                {
                                    type: "array"
                                }
                            );


                        const sheetName =
                            workbook.SheetNames[0];


                        const worksheet =
                            workbook.Sheets[
                                sheetName
                            ];


                        const json =
                            XLSX.utils.sheet_to_json(
                                worksheet,
                                {
                                    header: 1
                                }
                            );


                        const numbers =
                            [
                                ...new Set(
                                    json
                                        .flat()
                                        .filter(Boolean)
                                        .map(value =>
                                            String(value)
                                                .replace(
                                                    /\s/g,
                                                    ""
                                                )
                                                .replace(
                                                    "+",
                                                    ""
                                                )
                                        )
                                        .filter(number =>
                                            /^27\d{9}$/.test(
                                                number
                                            )
                                        )
                                )
                            ];


                        setExcelNumbers(
                            numbers
                        );


                        toast.success(
                            `${numbers.length} valid numbers imported`
                        );


                    } catch (error) {

                        console.error(
                            error
                        );

                        toast.error(
                            "Failed to read Excel file"
                        );

                    }

                };


            reader.readAsArrayBuffer(
                file
            );

        };


    // ============================================================
    // TOTAL RECIPIENTS
    // ============================================================

    const totalRecipients =
        [
            ...new Set([
                ...selectedNumbers,
                ...excelNumbers
            ])
        ].length;


    return (

        <div className="Sms">

            <Navbar />


            <div className="sms-container">

                <h2>
                    Send SMS
                </h2>


                {/* MESSAGE */}

                <div className="message-section">

                    <textarea
                        placeholder="Type your SMS message..."
                        value={message}
                        onChange={
                            (e) =>
                                setMessage(
                                    e.target.value
                                )
                        }
                    />


                    <p>

                        CRM Recipients:

                        <strong>
                            {" "}
                            {selectedNumbers.length}
                        </strong>


                        {" | "}


                        Excel Recipients:

                        <strong>
                            {" "}
                            {excelNumbers.length}
                        </strong>


                        {" | "}


                        Total:

                        <strong>
                            {" "}
                            {totalRecipients}
                        </strong>

                    </p>


                    {excelNumbers.length > 0 && (

                        <button
                            className="secondary-btn"
                            onClick={() => {

                                setExcelNumbers([]);

                                toast.info(
                                    "Excel list cleared"
                                );

                            }}
                        >
                            Clear Excel List
                        </button>

                    )}

                </div>


                {/* SEARCH */}

                <input
                    type="text"
                    className="search-input"
                    placeholder="Search by client, cell, email, ID or database ID..."
                    value={search}
                    onChange={
                        (e) =>
                            setSearch(
                                e.target.value
                            )
                    }
                />


                {/* ACTION BUTTONS */}

                <div className="action-buttons">

                    <button
                        className="secondary-btn"
                        onClick={
                            selectAllFiltered
                        }
                    >
                        Select Filtered
                    </button>


                    <button
                        className="secondary-btn"
                        onClick={
                            clearSelection
                        }
                    >
                        Clear Selection
                    </button>

                </div>


                {/* EXCEL */}

                <div className="excel-upload">

                    <label>
                        Upload Excel File
                    </label>


                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={
                            handleExcelUpload
                        }
                    />


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


                {/* CLIENT LIST */}

                <div className="client-list">

                    {filteredClients.map(
                        (client) => {

                            const phoneNumber =
                                getPhoneNumber(
                                    client
                                );


                            return (

                                <div
                                    key={client.id}
                                    className="client-item"
                                >

                                    <div className="client-left">

                                        <input
                                            type="checkbox"
                                            disabled={
                                                !phoneNumber
                                            }
                                            checked={
                                                selectedNumbers.includes(
                                                    phoneNumber
                                                )
                                            }
                                            onChange={() =>
                                                toggleClient(
                                                    phoneNumber
                                                )
                                            }
                                        />


                                        <div>

                                            <h4>
                                                {
                                                    client.client ||
                                                    "Unnamed Client"
                                                }
                                            </h4>


                                            <p>
                                                Cell:{" "}
                                                {
                                                    client.cell ||
                                                    "No cell number"
                                                }
                                            </p>


                                            {phoneNumber && (

                                                <p>
                                                    SMS number:{" "}
                                                    {
                                                        phoneNumber
                                                    }
                                                </p>

                                            )}


                                            {client.email && (

                                                <p>
                                                    {
                                                        client.email
                                                    }
                                                </p>

                                            )}


                                            {client.idNo && (

                                                <p>
                                                    ID:{" "}
                                                    {
                                                        client.idNo
                                                    }
                                                </p>

                                            )}

                                        </div>

                                    </div>

                                </div>

                            );

                        }
                    )}


                    {filteredClients.length === 0 && (

                        <div className="no-clients">

                            No clients found.

                        </div>

                    )}

                </div>


                {/* SEND */}

                <button
                    className="send-btn"
                    onClick={sendSms}
                    disabled={sending}
                >

                    {
                        sending
                            ? "Sending..."
                            : `Send SMS (${totalRecipients})`
                    }

                </button>

            </div>

        </div>

    );

}


export default Sms;