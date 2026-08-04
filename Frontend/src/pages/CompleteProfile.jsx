import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import './CompleteProfile.css';

const API_BASE = 'http://127.0.0.1:8000/api';

function CompleteProfile() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    username: '',
    phonenumber: '',
    address: '',
    dob: '',
  });

  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [idFrontPreview, setIdFrontPreview] = useState(null);
  const [idBackPreview, setIdBackPreview] = useState(null);
  const [nationalId, setNationalId] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [waitingForReview, setWaitingForReview] = useState(false);

  // Once the review outcome comes back (via AuthContext's socket
  // listener updating `user`), react to it automatically.
  useEffect(() => {
    if (!waitingForReview) return;

    if (user?.verify_status === 'Verified') {
      navigate('/Dashboard', { replace: true });
    }
  }, [waitingForReview, user?.verify_status, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handleNationalIdChange = (e) => {
    setNationalId(e.target.value.trim());
    if (errors.nationalidentity_id) setErrors((prev) => ({ ...prev, nationalidentity_id: '' }));
  };

  const handleFileChange = (e, setFile, setPreview, fieldName) => {
    const file = e.target.files[0];

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, [fieldName]: 'File size must be under 5MB.' }));
        setFile(null);
        setPreview(null);
        return;
      }

      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
      setFile(file);
      setPreview(URL.createObjectURL(file));
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstname.trim()) newErrors.firstname = 'First name is required.';
    if (!formData.lastname.trim()) newErrors.lastname = 'Last name is required.';

    if (formData.username.trim() && !/^[a-zA-Z0-9_]{3,30}$/.test(formData.username.trim())) {
      newErrors.username = 'Username must be 3–30 characters (letters, numbers, underscores).';
    }

    const cleanPhone = formData.phonenumber.trim();
    if (!cleanPhone) {
      newErrors.phonenumber = 'Phone number is required.';
    } else if (!/^\d{8,9}$/.test(cleanPhone)) {
      newErrors.phonenumber = 'Enter exactly 8 or 9 digits (excluding +855).';
    }

    if (!nationalId.trim()) {
      newErrors.nationalidentity_id = 'National ID number is required.';
    } else if (!/^\d{9}$/.test(nationalId.trim())) {
      newErrors.nationalidentity_id = 'National ID must be exactly 9 digits.';
    }

    if (!formData.address.trim() || formData.address.trim().length < 5) {
      newErrors.address = 'Address must be at least 5 characters long.';
    }

    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required.';
    } else if (new Date(formData.dob) > new Date()) {
      newErrors.dob = 'Date of birth cannot be in the future.';
    }

    if (!idFront) newErrors.national_id_front = 'Front image of National ID is required.';
    if (!idBack) newErrors.national_id_back = 'Back image of National ID is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForSubmitAgain = () => {
    setWaitingForReview(false);
    setErrors({});
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm() || loading) return;

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/Login');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = new FormData();
      dataToSend.append('firstname', formData.firstname.trim());
      dataToSend.append('lastname', formData.lastname.trim());
      dataToSend.append('username', formData.username.trim().toLowerCase());
      dataToSend.append('phonenumber', formData.phonenumber.trim());
      dataToSend.append('address', formData.address.trim());
      dataToSend.append('dob', formData.dob);
      dataToSend.append('nationalidentity_id', nationalId.trim());
      dataToSend.append('national_id_front', idFront);
      dataToSend.append('national_id_back', idBack);

      const res = await fetch(`${API_BASE}/profile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: dataToSend,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          navigate('/Login');
          return;
        }
        if (data.field) {
          setErrors((prev) => ({ ...prev, [data.field]: data.message }));
        } else {
          setServerError(data.message || 'Failed to submit profile.');
        }
        return;
      }

      await refreshUser();
      setWaitingForReview(true);
    } catch (err) {
      setServerError('Connection error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (waitingForReview) {
    const status = user?.verify_status || 'Pending';

    return (
      <div className="AuthPage">
        <div className="AuthCard">
          {status === 'Rejected' ? (
            <>
              <h1>Verification rejected</h1>
              <p className="AuthSubtitle">
                An administrator reviewed your submission and could not verify it.
                Please check your details and submit again.
              </p>
              <button type="button" className="PrimaryButton" onClick={resetForSubmitAgain}>
                Submit again
              </button>
            </>
          ) : (
            <>
              <h1>Profile submitted</h1>
              <p className="AuthSubtitle">
                Your information is pending review. This page will update
                automatically once an administrator makes a decision.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="AuthPage">
      <div className="AuthCard">
        <h1>Complete Your Profile</h1>
        <p className="AuthSubtitle">Please provide your personal details to verify your identity</p>

        {serverError && <div className="error">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="FormGrid">
            <div className="InputGroup">
              <label htmlFor="firstname">First Name</label>
              <input
                id="firstname"
                type="text"
                name="firstname"
                placeholder="John"
                value={formData.firstname}
                onChange={handleChange}
                className={errors.firstname ? 'isInvalid' : ''}
                disabled={loading}
              />
              {errors.firstname && <span className="fieldError">{errors.firstname}</span>}
            </div>

            <div className="InputGroup">
              <label htmlFor="lastname">Last Name</label>
              <input
                id="lastname"
                type="text"
                name="lastname"
                placeholder="Doe"
                value={formData.lastname}
                onChange={handleChange}
                className={errors.lastname ? 'isInvalid' : ''}
                disabled={loading}
              />
              {errors.lastname && <span className="fieldError">{errors.lastname}</span>}
            </div>
          </div>

          <div className="InputGroup">
            <label htmlFor="username">Username (Optional)</label>
            <input
              id="username"
              type="text"
              name="username"
              placeholder="e.g. john_doe"
              value={formData.username}
              onChange={handleChange}
              className={errors.username ? 'isInvalid' : ''}
              disabled={loading}
            />
            {errors.username && <span className="fieldError">{errors.username}</span>}
          </div>

          <div className="InputGroup">
            <label htmlFor="phonenumber">Phone Number</label>
            <div className="PhoneInputGroup">
              <span className="PhonePrefix">+855</span>
              <input
                id="phonenumber"
                type="text"
                name="phonenumber"
                placeholder="12345678"
                value={formData.phonenumber}
                onChange={handleChange}
                className={`form-control-phone ${errors.phonenumber ? 'isInvalid' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.phonenumber && <span className="fieldError">{errors.phonenumber}</span>}
          </div>

          <div className="InputGroup">
            <label htmlFor="nationalidentity_id">National ID Number (9 Digits)</label>
            <input
              id="nationalidentity_id"
              type="text"
              placeholder="123456789"
              value={nationalId}
              onChange={handleNationalIdChange}
              className={errors.nationalidentity_id ? 'isInvalid' : ''}
              disabled={loading}
            />
            {errors.nationalidentity_id && (
              <span className="fieldError">{errors.nationalidentity_id}</span>
            )}
          </div>

          <div className="InputGroup">
            <label htmlFor="address">Address</label>
            <textarea
              id="address"
              name="address"
              placeholder="Enter your current residential address..."
              value={formData.address}
              onChange={handleChange}
              className={errors.address ? 'isInvalid' : ''}
              disabled={loading}
            />
            {errors.address && <span className="fieldError">{errors.address}</span>}
          </div>

          <div className="InputGroup">
            <label htmlFor="dob">Date of Birth</label>
            <input
              id="dob"
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className={errors.dob ? 'isInvalid' : ''}
              disabled={loading}
            />
            {errors.dob && <span className="fieldError">{errors.dob}</span>}
          </div>

          <div className="FormGrid">
            <div className="InputGroup">
              <label htmlFor="national_id_front">National ID (Front Image)</label>
              <input
                id="national_id_front"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setIdFront, setIdFrontPreview, 'national_id_front')}
                className={errors.national_id_front ? 'isInvalid' : ''}
                disabled={loading}
              />
              {errors.national_id_front && <span className="fieldError">{errors.national_id_front}</span>}
              {idFrontPreview && (
                <img src={idFrontPreview} alt="ID Front Preview" className="id-preview" />
              )}
            </div>

            <div className="InputGroup">
              <label htmlFor="national_id_back">National ID (Back Image)</label>
              <input
                id="national_id_back"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setIdBack, setIdBackPreview, 'national_id_back')}
                className={errors.national_id_back ? 'isInvalid' : ''}
                disabled={loading}
              />
              {errors.national_id_back && <span className="fieldError">{errors.national_id_back}</span>}
              {idBackPreview && (
                <img src={idBackPreview} alt="ID Back Preview" className="id-preview" />
              )}
            </div>
          </div>

          <button type="submit" className="PrimaryButton" disabled={loading}>
            {loading ? 'Submitting Profile...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CompleteProfile;