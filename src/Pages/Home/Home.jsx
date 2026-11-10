import './Home.css'
import React, { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { serverUrl } from '../../serverUrl'
import axios from 'axios'
import Navbar from '../../Components/Navbar/Navbar'
import FolderContainer from '../../Components/FolderContainer/FolderContainer'
import FileEditor from '../../Components/FileEditor/FileEditor'

function Home() {
    const [user, setUser] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);
    const [assessorClaims, setAssessorClaims] = useState([]);

    useEffect(() => {
        async function loadAssessorAppointments() {
            try {
                const response = await axios.get(`${serverUrl}claims`);
                const claims = Array.isArray(response.data) ? response.data : response.data.claims || [];
                setAssessorClaims(claims.filter((claim) =>
                    claim.assessorName || claim.assessorPhone || claim.assessorEmail || claim.assessorAppointmentDate
                ));
            } catch (error) {
                console.error("Failed to load assessor appointments:", error);
            }
        }
        loadAssessorAppointments();
    }, []);

    // ...

    function openFile(fileData) {
        setSelectedFile(fileData);
    }

    function closeEditor() {
        setSelectedFile(null);
    }

    const getDocType = (ext) => {
        switch (ext) {
            case "docx":
            case "doc":
                return "word";

            case "xlsx":
            case "xls":
                return "cell";

            case "pptx":
            case "ppt":
                return "slide";

            default:
                return "word";
        }
    };

    return (
        <div className="Home">
            <Navbar />

                {/* <section className="assessor-home-section">
                    <h2>Assessor appointments</h2>
                    {assessorClaims.length === 0 ? (
                        <p>No assessor appointments recorded.</p>
                    ) : (
                        <div className="assessor-home-list">
                            {assessorClaims.map((claim) => (
                                <div className="assessor-home-card" key={claim.id}>
                                    <strong>{claim.claimNumber || "Claim"}</strong>
                                    <span>{claim.clientName || "Client not specified"}</span>
                                    <span>Appointment: {claim.assessorAppointmentDate || claim.assessorAppointed || "Not scheduled"}</span>
                                    <span>{claim.assessorName || "Assessor not specified"}</span>
                                    {claim.assessorPhone && <span>{claim.assessorPhone}</span>}
                                    {claim.assessorEmail && <span>{claim.assessorEmail}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </section> */}

            <div className="home-container">


                <div
                    className="folder-page"
                    id="folder-page"
                    style={{
                        width: selectedFile ? "50%" : "100%",
                        borderRight: selectedFile
                            ? "solid 2px #000000"
                            : "none"
                    }}
                >
                    <FolderContainer
                        onFileSelect={openFile}
                    />
                </div>

                {selectedFile && (
                    <div
                        className="content"
                        id="file-editor-home"
                        style={{
                            width: "50%",
                            height: "100%"
                        }}
                    >
                        <FileEditor
                            onClose={closeEditor}
                            documentId={selectedFile.id}
                            name={selectedFile.name}
                            fileType={selectedFile.ext}
                            docType={getDocType(selectedFile.ext)}
                            updatedAt={selectedFile.updatedAt}
                        />
                    </div>
                )}

            </div>
        </div>
    );
}

export default Home

