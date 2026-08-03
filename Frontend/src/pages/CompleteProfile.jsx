import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from "../components/AuthContext";
import apiFetch from "../lib/api";
import './CompleteProfile.css';

function CompleteProfile() {
  const navigate = useNavigate();
  const { refreshUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    phonenumber: '',
    address: '',
    date_of_birth: '',
  });

  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);
  const [idFrontPreview, setIdFrontPreview] = useState(null);
  const [idBackPreview, setIdBackPreview] = useState(null);
  const [nationalId, setNationalId] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

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

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required.';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required.';

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

    if (!formData.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required.';
    } else if (new Date(formData.date_of_birth) > new Date()) {
      newErrors.date_of_birth = 'Date of birth cannot be in the future.';
    }

    if (!idFront) newErrors.id_front = 'Front image of National ID is required.';
    if (!idBack) newErrors.id_back = 'Back image of National ID is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      dataToSend.append('first_name', formData.first_name.trim());
      dataToSend.append('last_name', formData.last_name.trim());
      dataToSend.append('username', formData.username.trim().toLowerCase());
      dataToSend.append('phonenumber', formData.phonenumber.trim());
      dataToSend.append('address', formData.address.trim());
      dataToSend.append('date_of_birth', formData.date_of_birth);
      dataToSend.append('nationalidentity_id', nationalId.trim());
      dataToSend.append('id_front', idFront);
      dataToSend.append('id_back', idBack);

      const res = await apiFetch('/routes/profile.py/create_profile', {
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
      navigate('/Dashboard');
    } catch (err) {
      setServerError('Connection error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="AuthPage">
      <div className="AuthCard">
        <h1>Complete Your Profile</h1>
        <p className="AuthSubtitle">Please provide your personal details to verify your identity</p>

        {serverError && <div className="error">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="FormGrid">
            <div className="InputGroup">
              <label htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                type="text"
                name="first_name"
                placeholder="John"
                value={formData.first_name}
                onChange={handleChange}
                className={errors.first_name ? 'isInvalid' : ''}
                disabled={loading}
              />
              {errors.first_name && <span className="fieldError">{errors.first_name}</span>}
            </div>

            <div className="InputGroup">
              <label htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                type="text"
                name="last_name"
                placeholder="Doe"
                value={formData.last_name}
                onChange={handleChange}
                className={errors.last_name ? 'isInvalid' : ''}
                disabled={loading}
              />
              {errors.last_name && <span className="fieldError">{errors.last_name}</span>}
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
            <label htmlFor="date_of_birth">Date of Birth</label>
            <input
              id="date_of_birth"
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              className={errors.date_of_birth ? 'isInvalid' : ''}
              disabled={loading}
            />
            {errors.date_of_birth && <span className="fieldError">{errors.date_of_birth}</span>}
          </div>

          <div className="FormGrid">
            <div className="InputGroup">
              <label htmlFor="id_front">National ID (Front Image)</label>
              <input
                id="id_front"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setIdFront, setIdFrontPreview, 'id_front')}
                className={errors.id_front ? 'isInvalid' : ''}
                disabled={loading}
              />
              {errors.id_front && <span className="fieldError">{errors.id_front}</span>}
              {idFrontPreview && (
                <img src={idFrontPreview} alt="ID Front Preview" className="id-preview" />
              )}
            </div>

            <div className="InputGroup">
              <label htmlFor="id_back">National ID (Back Image)</label>
              <input
                id="id_back"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setIdBack, setIdBackPreview, 'id_back')}
                className={errors.id_back ? 'isInvalid' : ''}
                disabled={loading}
              />
              {errors.id_back && <span className="fieldError">{errors.id_back}</span>}
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