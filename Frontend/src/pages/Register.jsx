import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiFetch from "../lib/api";
import './Auth.css';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Real-time password complexity rules
  const passwordRules = {
    length: formData.password.length >= 8 && formData.password.length <= 64,
    hasUpper: /[A-Z]/.test(formData.password),
    hasLower: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecial: /[^A-Za-z0-9]/.test(formData.password),
    noSpace: !/\s/.test(formData.password) && formData.password.length > 0,
    matches: formData.password === formData.confirmPassword && formData.confirmPassword.length > 0,
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  };

  const validateForm = () => {
    const newErrors = {};
    const trimmedEmail = formData.email.trim().toLowerCase();

    if (!trimmedEmail) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (!isPasswordValid) {
      newErrors.password = 'Password does not meet all security requirements.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm() || loading) return;

    setLoading(true);
    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      const res = await apiFetch('/routes/auth.py/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.field) {
          setErrors((prev) => ({ ...prev, [data.field]: data.message }));
        } else {
          setServerError(data.message || 'Registration failed. Please try again.');
        }
        return;
      }

      navigate('/Login', { state: { message: 'Registration successful! Please log in.' } });
    } catch (err) {
      setServerError('Unable to connect to the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="AuthPage">
      <div className="AuthCard">
        <h1>Create Account</h1>
        <p className="AuthSubtitle">Sign up to get started with P2P platform</p>

        {serverError && <div className="error mb-3">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="InputGroup">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'isInvalid' : ''}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              disabled={loading}
              required
            />
            {errors.email && (
              <span id="email-error" className="fieldError">
                {errors.email}
              </span>
            )}
          </div>

          <div className="InputGroup">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'isInvalid' : ''}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              disabled={loading}
              required
            />
            {errors.password && (
              <span id="password-error" className="fieldError">
                {errors.password}
              </span>
            )}

            {/* Password Checklist */}
            <div className="PasswordChecklist">
              <div className={`checkItem ${passwordRules.length ? 'valid' : ''}`}>
                ✓ 8–64 characters
              </div>
              <div className={`checkItem ${passwordRules.hasUpper ? 'valid' : ''}`}>
                ✓ At least one uppercase letter
              </div>
              <div className={`checkItem ${passwordRules.hasLower ? 'valid' : ''}`}>
                ✓ At least one lowercase letter
              </div>
              <div className={`checkItem ${passwordRules.hasNumber ? 'valid' : ''}`}>
                ✓ At least one number
              </div>
              <div className={`checkItem ${passwordRules.hasSpecial ? 'valid' : ''}`}>
                ✓ At least one special character
              </div>
              <div className={`checkItem ${passwordRules.noSpace ? 'valid' : ''}`}>
                ✓ No spaces allowed
              </div>
            </div>
          </div>

          <div className="InputGroup">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'isInvalid' : ''}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              disabled={loading}
              required
            />
            {errors.confirmPassword && (
              <span id="confirmPassword-error" className="fieldError">
                {errors.confirmPassword}
              </span>
            )}
            {formData.confirmPassword && (
              <div className={`checkItem ${passwordRules.matches ? 'valid' : 'invalid'}`}>
                {passwordRules.matches ? '✓ Passwords match' : '✕ Passwords do not match'}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="switchLink">
          Already have an account? <Link to="/Login">Log In</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;