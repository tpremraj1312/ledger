// src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Import Link
import axios from "axios"; // Import axios

const Signup = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "" // Add confirm password field
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear messages on change
    setError("");
    setSuccessMessage("");
  };

  // Basic client-side validation
  const validateForm = () => {
    const { username, email, password, confirmPassword } = formData;
    if (!username || !email || !password || !confirmPassword) {
        setError("All fields are required.");
        return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        setError("Please enter a valid email address.");
        return false;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return false;
    }
    if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return false;
    }
    return true;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!validateForm()) {
        return; // Stop submission if validation fails
    }

    setIsSubmitting(true);

    try {
        // Call the backend signup endpoint
        const response = await axios.post(
            "http://localhost:5000/api/auth/signup",
             { // Send only necessary fields
                 username: formData.username,
                 email: formData.email,
                 password: formData.password
             }
         );

        // Handle success (status 201)
        setSuccessMessage(response.data.message || "Signup successful! Redirecting to login...");

        // Redirect to login after a short delay
        setTimeout(() => {
            navigate("/login");
        }, 2000); // 2-second delay

    } catch (err) {
        console.error("Signup error:", err);
        // Extract error message from backend response or provide a generic one
        setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
         setIsSubmitting(false); // Re-enable button
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-purple-200 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-5" // Adjusted spacing
      >
        <h2 className="text-3xl font-bold text-center text-purple-700 mb-6">Create Your Account</h2>

         {/* Error Message Display */}
         {error && (
           <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
             {error}
           </div>
         )}

         {/* Success Message Display */}
         {successMessage && (
           <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
             {successMessage}
           </div>
         )}

        {/* Username Input */}
        <input
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
        />

        {/* Email Input */}
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
        />

        {/* Password Input */}
        <input
          name="password"
          type="password"
          placeholder="Password (min. 6 characters)"
          value={formData.password}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
        />

        {/* Confirm Password Input */}
         <input
          name="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full bg-purple-600 text-white font-semibold py-2 rounded-lg transition ${
            isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-700"
          }`}
        >
          {isSubmitting ? "Signing Up..." : "Sign Up"}
        </button>

        {/* Link to Login */}
         <p className="text-sm text-center text-gray-600 pt-2">
            Already have an account?{" "}
           <Link to="/login" className="text-purple-600 hover:underline font-medium">
             Log In
           </Link>
         </p>

      </form>
    </div>
  );
};

export default Signup;