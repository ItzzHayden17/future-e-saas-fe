import React, { useEffect, useState } from "react";
import "./Login.css";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../../serverUrl";

const Login = () => {

  
const navigate = useNavigate();

const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [otp, setOtp] = useState("");

const [loading, setLoading] = useState(false);
const [mfaRequired, setMfaRequired] = useState(false);
const [userId, setUserId] = useState(null);

useEffect(() => {

    async function verifyExistingSession() {

        try {

            const userData = Cookies.get("userData");

            if (!userData) return;

            const parsedUser =
                JSON.parse(userData);

            const response =
                await axios.post(
                    `${serverUrl}verify-token`,
                    {
                        token: parsedUser.token
                    }
                );

            if (
                response.data.status ===
                "success"
            ) {

                navigate("/home");
            }

        } catch (error) {

            console.error(error);
        }
    }

    verifyExistingSession();

}, [navigate]);

async function handleLogin(event) {

    event.preventDefault();

    try {

        setLoading(true);

        const response =
            await axios.post(
                `${serverUrl}login`,
                {
                    username,
                    password
                }
            );

        if (
            response.data.status ===
            "mfa_required"
        ) {

            setUserId(
                response.data.userId
            );

            setMfaRequired(true);

            toast.success(
                "Verification code sent to your email"
            );

            return;
        }

        toast.error(
            response.data.message ||
            "Login failed"
        );

    } catch (error) {

        console.error(error);

        toast.error(
            error.response?.data?.message ||
            "Login failed"
        );

    } finally {

        setLoading(false);
    }
}

async function verifyOtp() {

    try {

        setLoading(true);

        const response =
            await axios.post(
                `${serverUrl}verify-email-otp`,
                {
                    userId,
                    code: otp
                }
            );

        if (
            response.data.status ===
            "success"
        ) {

            Cookies.set(
                "userData",
                JSON.stringify({
                    token:
                        response.data.token
                }),
                {
                    expires: 1
                }
            );

            toast.success(
                "Logged in successfully"
            );

            navigate("/home");

            return;
        }

        toast.error(
            response.data.message ||
            "Invalid verification code"
        );

    } catch (error) {

        console.error(error);

        toast.error(
            error.response?.data?.message ||
            "Invalid verification code"
        );

    } finally {

        setLoading(false);
    }
}

function handleOtpKeyDown(event) {

    if (event.key === "Enter") {
        verifyOtp();
    }
}

function handleLoginKeyDown(event) {

    if (event.key === "Enter") {
        handleLogin(event);
    }
}

return (
    <div className="Login">

        <img
            src="assets/black_logo_with_text.png"
            alt="Futur-e logo"
        />

        {!mfaRequired ? (

            <>
                <p>
                    Please enter your details
                </p>

                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) =>
                        setUsername(
                            e.target.value
                        )
                    }
                    onKeyDown={
                        handleLoginKeyDown
                    }
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) =>
                        setPassword(
                            e.target.value
                        )
                    }
                    onKeyDown={
                        handleLoginKeyDown
                    }
                />

                <button
                    onClick={handleLogin}
                    disabled={loading}
                >
                    {loading
                        ? "Signing In..."
                        : "Login"}
                </button>
            </>

        ) : (

            <>
                <p>
                    Enter the verification code
                    sent to your email
                </p>

                <input
                    type="text"
                    placeholder="6 Digit Code"
                    value={otp}
                    maxLength={6}
                    onChange={(e) =>
                        setOtp(
                            e.target.value
                        )
                    }
                    onKeyDown={
                        handleOtpKeyDown
                    }
                />

                <button
                    onClick={verifyOtp}
                    disabled={loading}
                >
                    {loading
                        ? "Verifying..."
                        : "Verify Code"}
                </button>
            </>

        )}

    </div>
);
  

};

export default Login;
