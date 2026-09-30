import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { DocumentEditor } from "@onlyoffice/document-editor-react";
import { toast } from "react-toastify";
import { serverUrl } from "../../serverUrl";
import "./FileEditor.css";
import { dockerServerUrl } from "../../dockerServerUrl";

const FileEditor = (props) => {

    const [documentUrl, setDocumentUrl] = useState(null);

    // Keeps track of whether the user actually modified
    // the document before showing the "saved" toast.
    const wasModified = useRef(false);


    // =========================================================
    // LOAD DOCUMENT URL
    // =========================================================

    useEffect(() => {

        async function loadDocument() {

            try {

                const response = await axios.get(
                    `${serverUrl}api/document/${props.documentId}`
                );

                setDocumentUrl(response.data.url);

            } catch (err) {

                console.error(
                    "Failed to load document:",
                    err
                );

                toast.error("Failed to load document.");
            }

        }

        loadDocument();

    }, [props.documentId]);


    // =========================================================
    // DEBUG
    // =========================================================

    useEffect(() => {

        console.log("FileEditor mounted");
        console.log("Document ID:", props.documentId);
        console.log("Document URL:", documentUrl);

    }, [documentUrl, props.documentId]);


    // =========================================================
    // LOADING
    // =========================================================

    if (!documentUrl) {

        return (
            <div>
                Loading document...
            </div>
        );

    }


    // =========================================================
    // DOCUMENT VERSION
    // =========================================================

    const safeVersion =
        props.updatedAt
            ? new Date(props.updatedAt).getTime()
            : Date.now();


    // =========================================================
    // ONLYOFFICE CONFIG
    // =========================================================

    const config = {

        document: {

            fileType: props.fileType,

            key: `${props.documentId}-${safeVersion}`,

            title: props.name,

            url: documentUrl,

            permissions: {

                edit: true,
                review: true,
                comment: true,
                download: true,
                print: true,
                fillForms: true,
                modifyFilter: true,
                modifyContentControl: true

            }

        },

        documentType: props.docType,

        editorConfig: {

            mode: "edit",

            callbackUrl:
                "https://future-e-be.onrender.com/save-file"

        },


        // =====================================================
        // ONLYOFFICE EVENTS
        // =====================================================

        events: {

            // -------------------------------------------------
            // DOCUMENT STATE CHANGED
            // -------------------------------------------------
            //
            // event.data === true
            //     Document has unsaved changes
            //
            // event.data === false
            //     Document has no unsaved changes
            //
            // -------------------------------------------------

            onDocumentStateChange: (event) => {

                console.log(
                    "Document state:",
                    event.data
                );

                // Document was modified
                if (event.data === true) {

                    wasModified.current = true;

                    console.log(
                        "Document has unsaved changes"
                    );

                }

                // Document was saved
                if (
                    event.data === false &&
                    wasModified.current
                ) {

                    wasModified.current = false;

                    console.log(
                        "Document saved"
                    );

                    toast.success(
                        `${props.name} saved successfully!`,
                        {
                            position: "top-right",
                            autoClose: 3000,
                            hideProgressBar: false,
                            closeOnClick: true,
                            pauseOnHover: true,
                            draggable: true
                        }
                    );

                }

            },


            // -------------------------------------------------
            // FILE VERSION CHANGED
            // -------------------------------------------------

            onRequestRefreshFile: () => {

                console.log(
                    "ONLYOFFICE: File version changed."
                );

                toast.info(
                    "File version changed. Reloading editor...",
                    {
                        position: "top-right",
                        autoClose: 1000,
                        closeOnClick: true,
                        pauseOnHover: false,
                        draggable: true
                    }
                );


                // Give Toastify a moment to display
                // before reloading the page.
                setTimeout(() => {

                    window.location.reload();

                }, 1000);

            },


            // -------------------------------------------------
            // ONLYOFFICE ERROR
            // -------------------------------------------------

            onError: (event) => {

                console.error(
                    "ONLYOFFICE error:",
                    event
                );

                toast.error(
                    "OnlyOffice encountered an error.",
                    {
                        position: "bottom-right",
                        autoClose: 4000
                    }
                );

            }

        }

    };


    // =========================================================
    // DEBUG ONLYOFFICE KEY
    // =========================================================

    console.log(
        "OnlyOffice Key:",
        `${props.documentId}-${safeVersion}`
    );


    // =========================================================
    // CLOSE EDITOR
    // =========================================================

    function closeEditor() {

        if (props.onClose) {

            props.onClose();

        }

    }


    // =========================================================
    // RENDER
    // =========================================================

    return (

        <div
            className="FileEditor"
            id="FileEditor"
        >

            <DocumentEditor
                id="docxEditor"
                documentServerUrl={dockerServerUrl}
                config={config}
                width="100%"
                height="100%"
            />

            <button
                className="close-file-editor"
                onClick={closeEditor}
            >
                Close
            </button>

        </div>

    );

};

export default FileEditor;